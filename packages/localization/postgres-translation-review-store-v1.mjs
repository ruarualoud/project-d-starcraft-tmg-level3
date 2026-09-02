import {
  STARCRAFT_TMG_TRANSLATION_REVIEW_STORE_VERSION,
  assertStarcraftTmgPersistentTranslationCandidate,
  assertStarcraftTmgTranslationReviewStore,
  cloneTranslationReviewValue,
  createStarcraftTmgTranslationReviewAuditEvent,
  prepareStarcraftTmgCandidateReview,
  prepareStarcraftTmgCandidateStoreWrite,
} from "./translation-review-store-contract-v1.mjs";

export const STARCRAFT_TMG_POSTGRES_TRANSLATION_REVIEW_STORE_CONTRACT = Object.freeze({
  schema: "starcraft_tmg_postgres_translation_review_store_contract_v1",
  sharedContract: STARCRAFT_TMG_TRANSLATION_REVIEW_STORE_VERSION,
  transactionIsolation: "serializable",
  candidateLock: "row_for_update",
  auditHeadLock: "singleton_row_for_update",
  compareAndSwap: ["candidate_hash", "status", "revision"],
  idempotency: "unique_hashed_key",
  audit: "content_hash_chain",
  silentCompatibility: false,
});

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function parse(value) {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? JSON.parse(value) : cloneTranslationReviewValue(value);
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

function listLimit(value) {
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

function requirePool(pool) {
  if (!pool || typeof pool.connect !== "function" || typeof pool.query !== "function") {
    throw new Error("PostgreSQL translation review store requires pool.connect() and pool.query()");
  }
  return pool;
}

export function createPostgresStarcraftTmgTranslationReviewStoreV1(options = {}) {
  const pool = requirePool(options.pool);

  async function initialize() {
    await pool.query(`/* sc_translation:init */
      CREATE TABLE IF NOT EXISTS sc_translation_candidates (
        candidate_hash TEXT PRIMARY KEY,
        idempotency_key_hash TEXT NOT NULL UNIQUE,
        dataset_hash TEXT NOT NULL,
        target_locale TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending','approved','corrected','rejected')),
        revision BIGINT NOT NULL,
        candidate_json JSONB NOT NULL,
        review_entry_json JSONB,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sc_translation_queue_idx
        ON sc_translation_candidates (status, dataset_hash, target_locale, created_at, candidate_hash);
      CREATE TABLE IF NOT EXISTS sc_translation_audit_meta (
        singleton_id SMALLINT PRIMARY KEY CHECK (singleton_id = 1),
        audit_sequence BIGINT NOT NULL,
        last_event_hash TEXT
      );
      INSERT INTO sc_translation_audit_meta (singleton_id, audit_sequence, last_event_hash)
        VALUES (1, 0, NULL) ON CONFLICT (singleton_id) DO NOTHING;
      CREATE TABLE IF NOT EXISTS sc_translation_audit (
        sequence BIGINT PRIMARY KEY,
        event_hash TEXT NOT NULL UNIQUE,
        previous_event_hash TEXT,
        event_json JSONB NOT NULL
      );
    `);
    return health();
  }

  async function transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query("/* sc_translation:begin */ BEGIN ISOLATION LEVEL SERIALIZABLE");
      const value = await fn(client);
      await client.query("/* sc_translation:commit */ COMMIT");
      return value;
    } catch (error) {
      try { await client.query("/* sc_translation:rollback */ ROLLBACK"); } catch {}
      if (error?.code === "40001") error.code = "TRANSLATION_REVIEW_REVISION_CONFLICT";
      throw error;
    } finally {
      client.release();
    }
  }

  async function appendAudit(client, { eventType, candidateHash, actorId, occurredAt, payloadHash }) {
    const selected = await client.query(`/* sc_translation:audit_meta_for_update */
      SELECT audit_sequence, last_event_hash
        FROM sc_translation_audit_meta WHERE singleton_id = 1 FOR UPDATE
    `);
    const meta = selected.rows[0];
    const event = createStarcraftTmgTranslationReviewAuditEvent({
      sequence: Number(meta.audit_sequence) + 1,
      previousEventHash: meta.last_event_hash,
      eventType,
      candidateHash,
      actorId,
      occurredAt,
      payloadHash,
    });
    await client.query(`/* sc_translation:insert_audit */
      INSERT INTO sc_translation_audit (sequence, event_hash, previous_event_hash, event_json)
      VALUES ($1,$2,$3,$4::jsonb)
    `, [event.sequence, event.eventHash, event.previousEventHash, JSON.stringify(event)]);
    await client.query(`/* sc_translation:update_audit_meta */
      UPDATE sc_translation_audit_meta
         SET audit_sequence = $1, last_event_hash = $2 WHERE singleton_id = 1
    `, [event.sequence, event.eventHash]);
    return event;
  }

  async function selectCandidate(queryable, candidateHash, forUpdate = false) {
    const result = await queryable.query(`/* sc_translation:${forUpdate ? "select_candidate_for_update" : "select_candidate"} */
      SELECT candidate_hash, idempotency_key_hash, dataset_hash, target_locale, status,
             revision, candidate_json, review_entry_json, created_at, updated_at
        FROM sc_translation_candidates WHERE candidate_hash = $1${forUpdate ? " FOR UPDATE" : ""}
    `, [candidateHash]);
    return result.rows[0] || null;
  }

  async function putCandidate(input = {}) {
    const write = prepareStarcraftTmgCandidateStoreWrite(input);
    return transaction(async (client) => {
      const existing = await selectCandidate(client, write.candidateHash, true);
      if (existing) {
        const persisted = parse(existing.candidate_json);
        try {
          assertStarcraftTmgPersistentTranslationCandidate(persisted);
        } catch {
          fail("TRANSLATION_REVIEW_CANDIDATE_HASH_CONFLICT");
        }
        if (persisted.candidateHash !== write.candidateHash) fail("TRANSLATION_REVIEW_CANDIDATE_HASH_CONFLICT");
        return rowRecord(existing);
      }
      const idempotent = await client.query(`/* sc_translation:select_idempotency */
        SELECT candidate_hash FROM sc_translation_candidates WHERE idempotency_key_hash = $1 FOR UPDATE
      `, [write.idempotencyKeyHash]);
      if (idempotent.rows[0]) fail("TRANSLATION_REVIEW_IDEMPOTENCY_CONFLICT");
      await client.query(`/* sc_translation:insert_candidate */
        INSERT INTO sc_translation_candidates (
          candidate_hash, idempotency_key_hash, dataset_hash, target_locale, status,
          revision, candidate_json, review_entry_json, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,'pending',0,$5::jsonb,NULL,$6,$6)
      `, [
        write.candidateHash,
        write.idempotencyKeyHash,
        write.datasetHash,
        write.targetLocale,
        JSON.stringify(write.candidate),
        write.createdAt,
      ]);
      await appendAudit(client, {
        eventType: "candidate_stored",
        candidateHash: write.candidateHash,
        actorId: write.actorId,
        occurredAt: write.createdAt,
        payloadHash: write.candidateHash,
      });
      return rowRecord(await selectCandidate(client, write.candidateHash));
    });
  }

  async function getCandidate(candidateHash) {
    return rowRecord(await selectCandidate(pool, String(candidateHash || "")));
  }

  async function listQueue(input = {}) {
    const take = listLimit(input.limit);
    const offset = cursor(input.cursor);
    const result = await pool.query(`/* sc_translation:list_queue */
      SELECT candidate_hash, idempotency_key_hash, dataset_hash, target_locale, status,
             revision, candidate_json, review_entry_json, created_at, updated_at
        FROM sc_translation_candidates
       WHERE ($1::text IS NULL OR dataset_hash = $1)
         AND ($2::text IS NULL OR target_locale = $2)
         AND ($3::text IS NULL OR status = $3)
       ORDER BY created_at, candidate_hash
       LIMIT $4 OFFSET $5
    `, [
      input.datasetHash || null,
      input.targetLocale || null,
      input.status || "pending",
      take + 1,
      offset,
    ]);
    return {
      items: result.rows.slice(0, take).map(rowRecord),
      nextCursor: result.rows.length > take ? offset + take : null,
    };
  }

  async function reviewCandidate(input = {}) {
    const candidateHash = String(input.candidateHash || "");
    return transaction(async (client) => {
      const row = await selectCandidate(client, candidateHash, true);
      if (!row) fail("TRANSLATION_REVIEW_CANDIDATE_NOT_FOUND");
      if (row.status !== "pending" || Number(row.revision) !== Number(input.expectedRevision)) {
        fail("TRANSLATION_REVIEW_REVISION_CONFLICT");
      }
      const review = prepareStarcraftTmgCandidateReview({
        ...input,
        candidate: parse(row.candidate_json),
      });
      const updated = await client.query(`/* sc_translation:update_review */
        UPDATE sc_translation_candidates
           SET status = $1, revision = revision + 1, review_entry_json = $2::jsonb, updated_at = $3
         WHERE candidate_hash = $4 AND status = 'pending' AND revision = $5
      `, [
        review.status,
        JSON.stringify(review.entry),
        review.reviewedAt,
        candidateHash,
        review.expectedRevision,
      ]);
      if (updated.rowCount !== 1) fail("TRANSLATION_REVIEW_REVISION_CONFLICT");
      await appendAudit(client, {
        eventType: "candidate_reviewed",
        candidateHash,
        actorId: review.reviewerId,
        occurredAt: review.reviewedAt,
        payloadHash: review.entry.entryHash,
      });
      return rowRecord(await selectCandidate(client, candidateHash));
    });
  }

  async function readAudit(input = {}) {
    const result = await pool.query(`/* sc_translation:read_audit */
      SELECT event_json FROM sc_translation_audit
       WHERE sequence > $1 ORDER BY sequence LIMIT $2
    `, [cursor(input.afterSequence), listLimit(input.limit)]);
    return result.rows.map((row) => parse(row.event_json));
  }

  async function health() {
    const result = await pool.query(`/* sc_translation:health */
      SELECT
        to_regclass('public.sc_translation_candidates') AS candidates,
        to_regclass('public.sc_translation_audit') AS audit,
        to_regclass('public.sc_translation_audit_meta') AS audit_meta,
        (SELECT COUNT(*)::bigint FROM sc_translation_candidates) AS candidate_count,
        (SELECT COUNT(*)::bigint FROM sc_translation_audit) AS audit_count
    `);
    const row = result.rows[0] || {};
    const schemaReady = Boolean(row.candidates && row.audit && row.audit_meta);
    return {
      schema: `${STARCRAFT_TMG_TRANSLATION_REVIEW_STORE_VERSION}.health`,
      healthy: schemaReady,
      adapter: "postgresql",
      schemaReady,
      candidateCount: Number(row.candidate_count || 0),
      auditCount: Number(row.audit_count || 0),
      transactionIsolation: "serializable",
      atomicCas: true,
      auditHashChain: true,
      durability: "postgresql",
      productionReady: schemaReady,
      trainingTruth: false,
    };
  }

  return assertStarcraftTmgTranslationReviewStore(Object.freeze({
    initialize,
    putCandidate,
    getCandidate,
    listQueue,
    reviewCandidate,
    readAudit,
    health,
  }));
}
