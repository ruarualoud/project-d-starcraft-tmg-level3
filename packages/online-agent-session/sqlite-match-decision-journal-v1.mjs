import { DatabaseSync } from "node:sqlite";

export const STARCRAFT_TMG_SQLITE_MATCH_DECISION_JOURNAL_VERSION =
  "starcraft_tmg_sqlite_match_decision_journal_v1";

export function createSqliteStarcraftTmgMatchDecisionJournalV1(options = {}) {
  const filename = String(options.filename || ":memory:");
  const database = options.database || new DatabaseSync(filename);
  const ownsDatabase = !options.database;
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA synchronous = FULL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS sc_match_decision_journal (
      scope_key TEXT NOT NULL,
      sequence INTEGER NOT NULL CHECK (sequence > 0),
      record_hash TEXT NOT NULL,
      record_json TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      PRIMARY KEY (scope_key, sequence),
      UNIQUE (scope_key, record_hash)
    ) STRICT;
  `);
  const readRows = database.prepare(`
    SELECT record_json
      FROM sc_match_decision_journal
     WHERE scope_key = ?
     ORDER BY sequence ASC
  `);

  async function read(scope) {
    const scopeKey = String(scope?.scopeKey || "");
    if (!scopeKey) return { ok: false, reason: "MATCH_JOURNAL_SCOPE_REQUIRED" };
    return {
      ok: true,
      records: readRows.all(scopeKey).map((row) =>
        JSON.parse(String(row.record_json))),
    };
  }

  async function append(scope, record) {
    const scopeKey = String(scope?.scopeKey || "");
    if (!scopeKey || record?.scopeKey !== scopeKey
      || !Number.isSafeInteger(record?.sequence) || record.sequence < 1
      || !String(record?.recordHash || "")) {
      return { ok: false, reason: "MATCH_JOURNAL_RECORD_INVALID" };
    }
    try {
      database.prepare(`
        INSERT INTO sc_match_decision_journal (
          scope_key, sequence, record_hash, record_json, occurred_at
        ) VALUES (?, ?, ?, ?, ?)
      `).run(scopeKey, record.sequence, record.recordHash,
        JSON.stringify(record), String(record.occurredAt));
      return { ok: true, recordHash: record.recordHash };
    } catch (error) {
      const existing = database.prepare(`
        SELECT record_hash, record_json
          FROM sc_match_decision_journal
         WHERE scope_key = ? AND sequence = ?
      `).get(scopeKey, record.sequence);
      if (existing?.record_hash === record.recordHash
        && String(existing.record_json) === JSON.stringify(record)) {
        return { ok: true, recordHash: record.recordHash,
          idempotentReplay: true };
      }
      return { ok: false, reason: "MATCH_JOURNAL_APPEND_CONFLICT",
        message: String(error?.message || error) };
    }
  }

  function close() {
    if (ownsDatabase) database.close();
  }

  return Object.freeze({
    durability: filename === ":memory:" ? "sqlite_memory_test_only" : "sqlite_wal",
    read,
    append,
    close,
  });
}
