import { DatabaseSync } from "node:sqlite";

export const STARCRAFT_TMG_SQLITE_POSTGAME_REVIEW_STORE_VERSION =
  "starcraft_tmg_sqlite_postgame_review_store_v2";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function createSqliteStarcraftTmgPostgameReviewStoreV2(options = {}) {
  const filename = String(options.filename || ":memory:");
  const database = options.database || new DatabaseSync(filename);
  const ownsDatabase = !options.database;
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA synchronous = FULL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS sc_postgame_review_v2 (
      review_id TEXT PRIMARY KEY,
      revision INTEGER NOT NULL CHECK (revision >= 0),
      record_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
  `);
  const select = database.prepare(`
    SELECT revision, record_json FROM sc_postgame_review_v2 WHERE review_id = ?
  `);

  async function load(reviewId) {
    const row = select.get(String(reviewId || ""));
    if (!row) return null;
    const record = JSON.parse(String(row.record_json));
    if (Number(row.revision) !== record.revision) {
      throw new Error("Postgame review store revision payload mismatch");
    }
    return clone(record);
  }

  async function commit(reviewIdInput, expectedRevision, next) {
    const reviewId = String(reviewIdInput || "");
    const expected = expectedRevision === null ? null : Number(expectedRevision);
    if (!reviewId || next?.reviewId !== reviewId
      || !Number.isSafeInteger(next?.revision)
      || next.revision !== (expected === null ? 0 : expected + 1)) {
      return { ok: false, reason: "POSTGAME_REVIEW_STORE_RECORD_INVALID" };
    }
    try {
      database.exec("BEGIN IMMEDIATE");
      const current = select.get(reviewId);
      const observed = current ? Number(current.revision) : null;
      if (observed !== expected) {
        database.exec("ROLLBACK");
        return { ok: false, reason: "POSTGAME_REVIEW_STORE_REVISION_CONFLICT",
          observedRevision: observed };
      }
      if (expected === null) {
        database.prepare(`
          INSERT INTO sc_postgame_review_v2
            (review_id, revision, record_json, updated_at)
          VALUES (?, ?, ?, ?)
        `).run(reviewId, next.revision, JSON.stringify(next), next.updatedAt);
      } else {
        const updated = database.prepare(`
          UPDATE sc_postgame_review_v2
             SET revision = ?, record_json = ?, updated_at = ?
           WHERE review_id = ? AND revision = ?
        `).run(next.revision, JSON.stringify(next), next.updatedAt,
          reviewId, expected);
        if (Number(updated.changes) !== 1) {
          throw new Error("postgame review compare-and-swap conflict");
        }
      }
      database.exec("COMMIT");
      return { ok: true, revision: next.revision };
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch {}
      return { ok: false, reason: String(error?.message || error)
        .includes("compare-and-swap")
        ? "POSTGAME_REVIEW_STORE_REVISION_CONFLICT"
        : "POSTGAME_REVIEW_STORE_WRITE_FAILED" };
    }
  }

  function health() {
    const journalMode = String(database.prepare("PRAGMA journal_mode").get()
      ?.journal_mode || "unknown").toLowerCase();
    return Object.freeze({
      schemaVersion:
        `${STARCRAFT_TMG_SQLITE_POSTGAME_REVIEW_STORE_VERSION}.health`,
      healthy: journalMode === "wal" || filename === ":memory:",
      durability: filename === ":memory:"
        ? "sqlite_memory_test_only" : "sqlite_wal",
      journalMode,
      atomicCompareAndSwap: true,
      productionReady: filename !== ":memory:",
      credentialMaterialExpected: false,
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
