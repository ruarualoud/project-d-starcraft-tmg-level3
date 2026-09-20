import { DatabaseSync } from "node:sqlite";

export const STARCRAFT_TMG_SQLITE_HOSTED_BOT_SEAT_STORE_VERSION =
  "starcraft_tmg_sqlite_hosted_bot_seat_store_v1";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function revision(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

export function createSqliteStarcraftTmgHostedBotSeatStoreV1(options = {}) {
  const filename = String(options.filename || ":memory:");
  const database = options.database || new DatabaseSync(filename);
  const ownsDatabase = !options.database;
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA synchronous = FULL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS sc_hosted_bot_seat_records (
      scope_key TEXT PRIMARY KEY,
      revision INTEGER NOT NULL CHECK (revision >= 0),
      record_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
  `);
  const select = database.prepare(`
    SELECT revision, record_json
      FROM sc_hosted_bot_seat_records
     WHERE scope_key = ?
  `);

  async function load(scopeKey) {
    const row = select.get(String(scopeKey || ""));
    if (!row) return null;
    const record = JSON.parse(String(row.record_json));
    if (revision(record.revision, "record.revision") !== Number(row.revision)) {
      throw new Error("Hosted Bot Seat store revision payload mismatch");
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
      return { ok: false, reason: "BOT_SEAT_STORE_RECORD_INVALID" };
    }
    try {
      database.exec("BEGIN IMMEDIATE");
      const observed = select.get(scopeKey);
      const observedRevision = observed ? Number(observed.revision) : null;
      if (observedRevision !== expected) {
        database.exec("ROLLBACK");
        return { ok: false, reason: "BOT_SEAT_STORE_REVISION_CONFLICT",
          observedRevision };
      }
      if (expected === null) {
        database.prepare(`
          INSERT INTO sc_hosted_bot_seat_records (
            scope_key, revision, record_json, updated_at
          ) VALUES (?, ?, ?, ?)
        `).run(scopeKey, nextRevision, JSON.stringify(nextRecord),
          String(nextRecord.updatedAt));
      } else {
        const result = database.prepare(`
          UPDATE sc_hosted_bot_seat_records
             SET revision = ?, record_json = ?, updated_at = ?
           WHERE scope_key = ? AND revision = ?
        `).run(nextRevision, JSON.stringify(nextRecord),
          String(nextRecord.updatedAt), scopeKey, expected);
        if (Number(result.changes) !== 1) {
          throw new Error("Hosted Bot Seat compare-and-swap conflict");
        }
      }
      database.exec("COMMIT");
      return { ok: true, revision: nextRevision };
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch {}
      return { ok: false, reason: String(error?.message || error)
        .includes("compare-and-swap")
        ? "BOT_SEAT_STORE_REVISION_CONFLICT"
        : "BOT_SEAT_STORE_WRITE_FAILED" };
    }
  }

  function close() {
    if (ownsDatabase) database.close();
  }

  return Object.freeze({
    durability: filename === ":memory:" ? "sqlite_memory_test_only" : "sqlite_wal",
    load,
    commit,
    close,
  });
}
