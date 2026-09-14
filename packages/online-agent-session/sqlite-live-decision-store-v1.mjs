import { DatabaseSync } from "node:sqlite";

export const STARCRAFT_TMG_SQLITE_LIVE_DECISION_STORE_VERSION =
  "starcraft_tmg_sqlite_live_decision_store_v1";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
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
  const select = database.prepare(`
    SELECT revision, record_json
      FROM sc_live_decision_records
     WHERE scope_key = ?
  `);

  async function load(scopeKey) {
    const row = select.get(String(scopeKey || ""));
    if (!row) return null;
    const record = JSON.parse(String(row.record_json));
    if (revision(record.revision, "record.revision") !== Number(row.revision)) {
      throw new Error("Live decision store revision payload mismatch");
    }
    return clone(record);
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
      const current = select.get(scopeKey);
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
        `).run(scopeKey, nextRevision, JSON.stringify(nextRecord),
          String(nextRecord.updatedAt));
      } else {
        const result = database.prepare(`
          UPDATE sc_live_decision_records
             SET revision = ?, record_json = ?, updated_at = ?
           WHERE scope_key = ? AND revision = ?
        `).run(nextRevision, JSON.stringify(nextRecord),
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
