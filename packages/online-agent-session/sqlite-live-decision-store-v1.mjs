import { DatabaseSync } from "node:sqlite";
import { gzipSync, gunzipSync } from "node:zlib";

export const STARCRAFT_TMG_SQLITE_LIVE_DECISION_STORE_VERSION =
  "starcraft_tmg_sqlite_live_decision_store_v1";
const COMPRESSED_RECORD_SCHEMA =
  "starcraft_tmg_sqlite_live_decision_gzip_record_v1";

function serializeRecord(record) {
  const json = JSON.stringify(record);
  if (Buffer.byteLength(json) < 1_000_000) return json;
  return JSON.stringify({ schemaVersion: COMPRESSED_RECORD_SCHEMA,
    encoding: "gzip-base64", revision: record.revision,
    payload: gzipSync(Buffer.from(json), { level: 1 }).toString("base64") });
}

function createRecordSerializer() {
  const cachedEntries = new WeakMap();
  const immutableGraphs = new WeakSet();
  const comma = gzipSync(Buffer.from(","), { level: 1 });
  const plainDataObject = value => value && typeof value === "object"
    && [Object.prototype, null].includes(Object.getPrototypeOf(value))
    && !Object.hasOwn(value, "toJSON")
    && Object.keys(value).every(key =>
      Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), "value"));

  function immutableJson(value) {
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      return true;
    }
    if (!value || typeof value !== "object" || !Object.isFrozen(value)
      || Object.hasOwn(value, "toJSON")) return false;
    if (immutableGraphs.has(value)) return true;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== Array.prototype
      && prototype !== null) return false;
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!Object.hasOwn(descriptor, "value")
        || !immutableJson(descriptor.value)) return false;
    }
    immutableGraphs.add(value);
    return true;
  }

  function entry(key, value) {
    const cached = value && typeof value === "object"
      ? cachedEntries.get(value) : null;
    if (cached?.key === key) return cached;
    // The wrapper preserves ordinary JSON's toJSON(key) and omitted-value
    // semantics. Only completely immutable plain graphs may enter the cache.
    const json = JSON.stringify({ [key]: value }).slice(1, -1);
    if (!json) return null;
    const encoded = { key, bytes: Buffer.byteLength(json),
      payload: gzipSync(Buffer.from(json), { level: 1 }) };
    if (value && typeof value === "object" && immutableJson(value)) {
      cachedEntries.set(value, encoded);
    }
    return encoded;
  }

  return record => {
    if (!plainDataObject(record) || !plainDataObject(record.decisions)
      || !Object.values(record.decisions).some(value =>
        value && typeof value === "object" && Object.isFrozen(value))) {
      return serializeRecord(record);
    }
    const before = Object.create(null);
    const after = Object.create(null);
    let decisionsSeen = false;
    for (const [key, value] of Object.entries(record)) {
      if (key === "decisions") { decisionsSeen = true; continue; }
      (decisionsSeen ? after : before)[key] = value;
    }
    const beforeJson = JSON.stringify(before);
    const afterJson = JSON.stringify(after);
    const prefix = beforeJson.slice(0, -1)
      + (beforeJson.length > 2 ? "," : "") + '"decisions":{';
    const suffix = "}" + (afterJson.length > 2 ? "," + afterJson.slice(1) : "}");
    const fragments = [gzipSync(Buffer.from(prefix), { level: 1 })];
    let bytes = Buffer.byteLength(prefix) + Buffer.byteLength(suffix);
    let count = 0;
    for (const [key, value] of Object.entries(record.decisions)) {
      const encoded = entry(key, value);
      if (!encoded) continue;
      if (count++) { fragments.push(comma); bytes += 1; }
      fragments.push(encoded.payload);
      bytes += encoded.bytes;
    }
    if (bytes < 1_000_000) return JSON.stringify(record);
    fragments.push(gzipSync(Buffer.from(suffix), { level: 1 }));
    // Concatenated gzip members are standard gzip. The existing decoder reads
    // exactly the same complete JSON; no new schema, migration or history loss.
    return JSON.stringify({ schemaVersion: COMPRESSED_RECORD_SCHEMA,
      encoding: "gzip-base64", revision: record.revision,
      payload: Buffer.concat(fragments).toString("base64") });
  };
}

export function decodeStarcraftTmgLiveDecisionRecordV1(json) {
  const value = JSON.parse(String(json));
  if (value?.schemaVersion !== COMPRESSED_RECORD_SCHEMA) return value;
  if (value.encoding !== "gzip-base64"
    || typeof value.payload !== "string") {
    throw new Error("Live decision compressed record envelope is invalid");
  }
  const record = JSON.parse(gunzipSync(Buffer.from(value.payload,
    "base64")).toString("utf8"));
  if (record?.revision !== value.revision) {
    throw new Error("Live decision compressed record revision mismatch");
  }
  return record;
}

function revision(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

export function createSqliteStarcraftTmgLiveDecisionStoreV1(options = {}) {
  const filename = String(options.filename || ":memory:");
  const database = options.database || new DatabaseSync(filename);
  const ownsDatabase = !options.database;
  const encodeRecord = createRecordSerializer();
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA synchronous = FULL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS sc_live_decision_records (
      scope_key TEXT PRIMARY KEY,
      revision INTEGER NOT NULL CHECK (revision >= 0),
      record_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
  `);
  const selectRecord = database.prepare(`
    SELECT revision, record_json
      FROM sc_live_decision_records
     WHERE scope_key = ?
  `);
  const selectRevision = database.prepare(`
    SELECT revision FROM sc_live_decision_records WHERE scope_key = ?
  `);

  async function load(scopeKey) {
    const row = selectRecord.get(String(scopeKey || ""));
    if (!row) return null;
    const record = decodeStarcraftTmgLiveDecisionRecordV1(row.record_json);
    if (revision(record.revision, "record.revision") !== Number(row.revision)) {
      throw new Error("Live decision store revision payload mismatch");
    }
    // JSON parse / decompression already creates a private object graph.
    return record;
  }

  async function commit(scopeKeyInput, expectedRevision, nextRecord) {
    const scopeKey = String(scopeKeyInput || "");
    const nextRevision = revision(nextRecord?.revision, "nextRecord.revision");
    const expected = expectedRevision === null
      ? null : revision(expectedRevision, "expectedRevision");
    if (!scopeKey || nextRecord?.scope?.scopeKey !== scopeKey
      || nextRevision !== (expected === null ? 0 : expected + 1)) {
      return { ok: false, reason: "LIVE_DECISION_STORE_RECORD_INVALID" };
    }
    try {
      database.exec("BEGIN IMMEDIATE");
      const current = selectRevision.get(scopeKey);
      const observed = current ? Number(current.revision) : null;
      if (observed !== expected) {
        database.exec("ROLLBACK");
        return { ok: false, reason: "LIVE_DECISION_STORE_REVISION_CONFLICT",
          observedRevision: observed };
      }
      if (expected === null) {
        database.prepare(`
          INSERT INTO sc_live_decision_records (
            scope_key, revision, record_json, updated_at
          ) VALUES (?, ?, ?, ?)
        `).run(scopeKey, nextRevision, encodeRecord(nextRecord),
          String(nextRecord.updatedAt));
      } else {
        const result = database.prepare(`
          UPDATE sc_live_decision_records
             SET revision = ?, record_json = ?, updated_at = ?
           WHERE scope_key = ? AND revision = ?
        `).run(nextRevision, encodeRecord(nextRecord),
          String(nextRecord.updatedAt), scopeKey, expected);
        if (Number(result.changes) !== 1) {
          throw new Error("Live decision store compare-and-swap conflict");
        }
      }
      database.exec("COMMIT");
      return { ok: true, revision: nextRevision };
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch {}
      return { ok: false, reason: String(error?.message || error)
        .includes("compare-and-swap")
        ? "LIVE_DECISION_STORE_REVISION_CONFLICT"
        : "LIVE_DECISION_STORE_WRITE_FAILED" };
    }
  }

  function health() {
    const mode = String(database.prepare("PRAGMA journal_mode").get()?.journal_mode
      || "unknown").toLowerCase();
    const count = Number(database.prepare(`
      SELECT COUNT(*) AS count FROM sc_live_decision_records
    `).get()?.count || 0);
    return Object.freeze({
      schemaVersion:
        `${STARCRAFT_TMG_SQLITE_LIVE_DECISION_STORE_VERSION}.health`,
      healthy: mode === "wal" || filename === ":memory:",
      durability: filename === ":memory:"
        ? "sqlite_memory_test_only" : "sqlite_wal",
      journalMode: mode,
      recordCount: count,
      atomicCompareAndSwap: true,
      credentialMaterialExpected: false,
      productionReady: filename !== ":memory:",
      trainingTruth: false,
    });
  }

  function close() {
    if (ownsDatabase) database.close();
  }

  return Object.freeze({
    durability: filename === ":memory:"
      ? "sqlite_memory_test_only" : "sqlite_wal",
    load,
    commit,
    health,
    close,
  });
}
