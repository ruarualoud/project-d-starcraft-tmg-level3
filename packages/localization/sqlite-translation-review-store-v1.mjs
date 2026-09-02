import { DatabaseSync } from "node:sqlite";

import {
  STARCRAFT_TMG_TRANSLATION_REVIEW_STORE_VERSION,
  assertStarcraftTmgTranslationReviewStore,
  cloneTranslationReviewValue,
  createStarcraftTmgTranslationReviewAuditEvent,
  prepareStarcraftTmgCandidateReview,
  prepareStarcraftTmgCandidateStoreWrite,
} from "./translation-review-store-contract-v1.mjs";

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function parse(value) {
  return value === null || value === undefined ? null : JSON.parse(String(value));
}

function rowRecord(row) {
  if (!row) return null;
  return cloneTranslationReviewValue({
    candidate: parse(row.candidate_json),
    reviewEntry: parse(row.review_entry_json),
    status: row.status,
    revision: Number(row.revision),
    idempotencyKeyHash: row.idempotency_key_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function limit(value) {
  const number = Number(value ?? 50);
  if (!Number.isSafeInteger(number) || number < 1 || number > 100) {
    fail("TRANSLATION_REVIEW_LIST_LIMIT_INVALID");
  }
  return number;
}

function cursor(value) {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number) || number < 0) fail("TRANSLATION_REVIEW_CURSOR_INVALID");
  return number;
}

export function createSqliteStarcraftTmgTranslationReviewStoreV1(options = {}) {
  const filename = String(options.filename || ":memory:");
  const database = options.database || new DatabaseSync(filename);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA synchronous = FULL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS sc_translation_candidates (
      candidate_hash TEXT PRIMARY KEY,
      idempotency_key_hash TEXT NOT NULL UNIQUE,
      dataset_hash TEXT NOT NULL,
      target_locale TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','approved','corrected','rejected')),
      revision INTEGER NOT NULL,
      candidate_json TEXT NOT NULL,
      review_entry_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS sc_translation_queue_idx
      ON sc_translation_candidates (status, dataset_hash, target_locale, created_at, candidate_hash);
    CREATE TABLE IF NOT EXISTS sc_translation_audit_meta (
      singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
      audit_sequence INTEGER NOT NULL,
      last_event_hash TEXT
    ) STRICT;
    INSERT OR IGNORE INTO sc_translation_audit_meta (singleton_id, audit_sequence, last_event_hash)
      VALUES (1, 0, NULL);
    CREATE TABLE IF NOT EXISTS sc_translation_audit (
      sequence INTEGER PRIMARY KEY,
      event_hash TEXT NOT NULL UNIQUE,
      previous_event_hash TEXT,
      event_json TEXT NOT NULL
    ) STRICT;
  `);

  const selectCandidate = database.prepare(`
    SELECT candidate_hash, idempotency_key_hash, dataset_hash, target_locale, status,
           revision, candidate_json, review_entry_json, created_at, updated_at
      FROM sc_translation_candidates WHERE candidate_hash = ?
  `);

  function transaction(fn) {
    try {
      database.exec("BEGIN IMMEDIATE");
      const value = fn();
      database.exec("COMMIT");
      return value;
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch {}
      throw error;
    }
  }

  function appendAudit({ eventType, candidateHash, actorId, occurredAt, payloadHash }) {
    const meta = database.prepare(`
      SELECT audit_sequence, last_event_hash FROM sc_translation_audit_meta WHERE singleton_id = 1
    `).get();
    const event = createStarcraftTmgTranslationReviewAuditEvent({
      sequence: Number(meta.audit_sequence) + 1,
      previousEventHash: meta.last_event_hash,
      eventType,
      candidateHash,
      actorId,
      occurredAt,
      payloadHash,
    });
    database.prepare(`
      INSERT INTO sc_translation_audit (sequence, event_hash, previous_event_hash, event_json)
      VALUES (?, ?, ?, ?)
    `).run(event.sequence, event.eventHash, event.previousEventHash, JSON.stringify(event));
    database.prepare(`
      UPDATE sc_translation_audit_meta
         SET audit_sequence = ?, last_event_hash = ? WHERE singleton_id = 1
    `).run(event.sequence, event.eventHash);
    return event;
  }

  async function initialize() {
    return health();
  }

  async function putCandidate(input = {}) {
    const write = prepareStarcraftTmgCandidateStoreWrite(input);
    return transaction(() => {
      const existing = selectCandidate.get(write.candidateHash);
      if (existing) {
        if (existing.candidate_json !== JSON.stringify(write.candidate)) {
          fail("TRANSLATION_REVIEW_CANDIDATE_HASH_CONFLICT");
        }
        return rowRecord(existing);
      }
      const idempotent = database.prepare(`
        SELECT candidate_hash FROM sc_translation_candidates WHERE idempotency_key_hash = ?
      `).get(write.idempotencyKeyHash);
      if (idempotent) fail("TRANSLATION_REVIEW_IDEMPOTENCY_CONFLICT");
      database.prepare(`
        INSERT INTO sc_translation_candidates (
          candidate_hash, idempotency_key_hash, dataset_hash, target_locale, status,
          revision, candidate_json, review_entry_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', 0, ?, NULL, ?, ?)
      `).run(
        write.candidateHash,
        write.idempotencyKeyHash,
        write.datasetHash,
        write.targetLocale,
        JSON.stringify(write.candidate),
        write.createdAt,
        write.createdAt,
      );
      appendAudit({
        eventType: "candidate_stored",
        candidateHash: write.candidateHash,
        actorId: write.actorId,
        occurredAt: write.createdAt,
        payloadHash: write.candidateHash,
      });
      return rowRecord(selectCandidate.get(write.candidateHash));
    });
  }

  async function getCandidate(candidateHash) {
    return rowRecord(selectCandidate.get(String(candidateHash || "")));
  }

  async function listQueue(input = {}) {
    const take = limit(input.limit);
    const offset = cursor(input.cursor);
    const rows = database.prepare(`
      SELECT candidate_hash, idempotency_key_hash, dataset_hash, target_locale, status,
             revision, candidate_json, review_entry_json, created_at, updated_at
        FROM sc_translation_candidates
       WHERE (? IS NULL OR dataset_hash = ?)
         AND (? IS NULL OR target_locale = ?)
         AND (? IS NULL OR status = ?)
       ORDER BY created_at, candidate_hash
       LIMIT ? OFFSET ?
    `).all(
      input.datasetHash || null,
      input.datasetHash || null,
      input.targetLocale || null,
      input.targetLocale || null,
      input.status || "pending",
      input.status || "pending",
      take + 1,
      offset,
    );
    return {
      items: rows.slice(0, take).map(rowRecord),
      nextCursor: rows.length > take ? offset + take : null,
    };
  }

  async function reviewCandidate(input = {}) {
    const candidateHash = String(input.candidateHash || "");
    return transaction(() => {
      const row = selectCandidate.get(candidateHash);
      if (!row) fail("TRANSLATION_REVIEW_CANDIDATE_NOT_FOUND");
      if (row.status !== "pending" || Number(row.revision) !== Number(input.expectedRevision)) {
        fail("TRANSLATION_REVIEW_REVISION_CONFLICT");
      }
      const review = prepareStarcraftTmgCandidateReview({
        ...input,
        candidate: parse(row.candidate_json),
      });
      const updated = database.prepare(`
        UPDATE sc_translation_candidates
           SET status = ?, revision = revision + 1, review_entry_json = ?, updated_at = ?
         WHERE candidate_hash = ? AND status = 'pending' AND revision = ?
      `).run(
        review.status,
        JSON.stringify(review.entry),
        review.reviewedAt,
        candidateHash,
        review.expectedRevision,
      );
      if (Number(updated.changes) !== 1) fail("TRANSLATION_REVIEW_REVISION_CONFLICT");
      appendAudit({
        eventType: "candidate_reviewed",
        candidateHash,
        actorId: review.reviewerId,
        occurredAt: review.reviewedAt,
        payloadHash: review.entry.entryHash,
      });
      return rowRecord(selectCandidate.get(candidateHash));
    });
  }

  async function readAudit(input = {}) {
    const after = cursor(input.afterSequence);
    const take = limit(input.limit);
    return database.prepare(`
      SELECT event_json FROM sc_translation_audit WHERE sequence > ? ORDER BY sequence LIMIT ?
    `).all(after, take).map((row) => parse(row.event_json));
  }

  async function health() {
    const integrity = database.prepare("PRAGMA integrity_check").get()?.integrity_check;
    const candidateCount = Number(database.prepare(
      "SELECT COUNT(*) AS count FROM sc_translation_candidates",
    ).get()?.count || 0);
    const auditCount = Number(database.prepare(
      "SELECT COUNT(*) AS count FROM sc_translation_audit",
    ).get()?.count || 0);
    return {
      schema: `${STARCRAFT_TMG_TRANSLATION_REVIEW_STORE_VERSION}.health`,
      healthy: integrity === "ok",
      adapter: "sqlite",
      filenameMode: filename === ":memory:" ? "memory" : "file",
      candidateCount,
      auditCount,
      atomicCas: true,
      auditHashChain: true,
      durability: filename === ":memory:" ? "sqlite_memory_test_only" : "sqlite_wal",
      productionReady: filename !== ":memory:",
      trainingTruth: false,
    };
  }

  function close() {
    database.close();
  }

  return assertStarcraftTmgTranslationReviewStore(Object.freeze({
    initialize,
    putCandidate,
    getCandidate,
    listQueue,
    reviewCandidate,
    readAudit,
    health,
    close,
  }));
}
