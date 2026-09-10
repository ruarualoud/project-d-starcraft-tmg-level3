import { clone, fail, freeze, hash, verifySeal } from
  "../skill-production/common.mjs";
import { createStarcraftTmgStrategyReleaseStoreV1 } from
  "./strategy-release-store-contract-v1.mjs";

export const STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_STORE_VERSION =
  "starcraft_tmg_postgres_strategy_release_store_v1";

export const STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_COLUMN_LAYOUT =
  Object.freeze({
    sc_strategy_release_meta: [
      "singleton_id",
      "store_version",
      "adapter_version",
      "schema_fingerprint_hash",
    ],
    sc_strategy_release_artifacts: [
      "artifact_id",
      "artifact_hash",
      "kind",
      "record_json",
      "artifact_json",
      "created_at",
    ],
    sc_strategy_release_jobs: [
      "job_id",
      "status",
      "revision",
      "fence",
      "lease_expires_at",
      "job_json",
    ],
  });

export const STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_SCHEMA_FINGERPRINT =
  hash(STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_COLUMN_LAYOUT);

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sc_strategy_release_meta (
    singleton_id SMALLINT PRIMARY KEY CHECK (singleton_id = 1),
    store_version TEXT NOT NULL,
    adapter_version TEXT NOT NULL,
    schema_fingerprint_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sc_strategy_release_artifacts (
    artifact_id TEXT PRIMARY KEY,
    artifact_hash TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL,
    record_json JSONB NOT NULL,
    artifact_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sc_strategy_release_jobs (
    job_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('queued','running','complete')),
    revision BIGINT NOT NULL CHECK (revision >= 0),
    fence BIGINT NOT NULL CHECK (fence >= 0),
    lease_expires_at TIMESTAMPTZ,
    job_json JSONB NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sc_strategy_release_expired_lease_idx
    ON sc_strategy_release_jobs (status,lease_expires_at,job_id);
`;

function parse(value) {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? JSON.parse(value) : clone(value);
}

function artifactRow(row) {
  if (!row) return null;
  return freeze({
    record: verifySeal(parse(row.record_json)),
    artifact: verifySeal(parse(row.artifact_json)),
  });
}

function jobRow(row) {
  return row ? verifySeal(parse(row.job_json)) : null;
}

function assertPool(pool) {
  if (!pool || typeof pool.connect !== "function"
    || typeof pool.query !== "function") {
    throw new TypeError(
      "PostgreSQL strategy release store requires pool.connect() and pool.query()",
    );
  }
  return pool;
}

export function createPostgresStarcraftTmgStrategyReleaseStoreV1(options = {}) {
  const pool = assertPool(options.pool);
  const closePoolOnClose = options.closePoolOnClose === true;
  let closed = false;

  function assertOpen() {
    if (closed) fail("STRATEGY_RELEASE_STORE_CLOSED");
  }

  async function transaction(callback) {
    assertOpen();
    const client = await pool.connect();
    try {
      await client.query(
        "/* sc_strategy_release:begin */ BEGIN ISOLATION LEVEL SERIALIZABLE",
      );
      const value = await callback(client);
      await client.query("/* sc_strategy_release:commit */ COMMIT");
      return value;
    } catch (error) {
      try {
        await client.query("/* sc_strategy_release:rollback */ ROLLBACK");
      } catch {}
      if (error?.code === "40001" || error?.code === "40P01") {
        fail("STRATEGY_RELEASE_POSTGRES_SERIALIZATION_CONFLICT", {
          code: error.code,
        });
      }
      throw error;
    } finally {
      client.release();
    }
  }

  const port = {
    async initialize() {
      await transaction(async (client) => {
        await client.query(
          "/* sc_strategy_release:init_lock */ SELECT pg_advisory_xact_lock(hashtext($1))",
          [STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_STORE_VERSION],
        );
        await client.query(`/* sc_strategy_release:init_schema */ ${SCHEMA}`);
        await client.query(`/* sc_strategy_release:insert_meta */
          INSERT INTO sc_strategy_release_meta
            (singleton_id,store_version,adapter_version,schema_fingerprint_hash)
          VALUES (1,$1,$2,$3) ON CONFLICT(singleton_id) DO NOTHING`, [
          "starcraft_tmg_strategy_release_store_v1",
          STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_STORE_VERSION,
          STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_SCHEMA_FINGERPRINT,
        ]);
        const selected = await client.query(
          "/* sc_strategy_release:select_meta */ SELECT * FROM sc_strategy_release_meta WHERE singleton_id=1 FOR UPDATE",
        );
        const meta = selected.rows[0];
        if (meta?.store_version !== "starcraft_tmg_strategy_release_store_v1"
          || meta?.adapter_version
            !== STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_STORE_VERSION
          || meta?.schema_fingerprint_hash
            !== STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_SCHEMA_FINGERPRINT) {
          fail("STRATEGY_RELEASE_POSTGRES_SCHEMA_VERSION_MISMATCH");
        }
      });
    },
    transaction,
    async getArtifact(tx, key, forUpdate, byHash = false) {
      const queryable = tx || pool;
      const marker = byHash ? "select_artifact_by_hash" : "select_artifact_by_id";
      const selected = await queryable.query(
        `/* sc_strategy_release:${marker}${forUpdate ? "_for_update" : ""} */
         SELECT * FROM sc_strategy_release_artifacts
          WHERE ${byHash ? "artifact_hash" : "artifact_id"}=$1${forUpdate ? " FOR UPDATE" : ""}`,
        [key],
      );
      return artifactRow(selected.rows[0]);
    },
    async insertArtifact(tx, row) {
      await tx.query(`/* sc_strategy_release:insert_artifact */
        INSERT INTO sc_strategy_release_artifacts
          (artifact_id,artifact_hash,kind,record_json,artifact_json,created_at)
        VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6)`, [
        row.record.artifactId,
        row.artifact.hash,
        row.record.kind,
        JSON.stringify(row.record),
        JSON.stringify(row.artifact),
        row.record.createdAt,
      ]);
    },
    async getJob(tx, jobId, forUpdate = false) {
      const queryable = tx || pool;
      const selected = await queryable.query(
        `/* sc_strategy_release:select_job${forUpdate ? "_for_update" : ""} */
         SELECT job_json FROM sc_strategy_release_jobs WHERE job_id=$1${forUpdate ? " FOR UPDATE" : ""}`,
        [jobId],
      );
      return jobRow(selected.rows[0]);
    },
    async insertJob(tx, job) {
      await tx.query(`/* sc_strategy_release:insert_job */
        INSERT INTO sc_strategy_release_jobs
          (job_id,status,revision,fence,lease_expires_at,job_json)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, [
        job.jobId,
        job.status,
        job.revision,
        job.fence,
        job.leaseExpiresAt,
        JSON.stringify(job),
      ]);
    },
    async updateJob(tx, current, next) {
      const changed = await tx.query(`/* sc_strategy_release:update_job */
        UPDATE sc_strategy_release_jobs
           SET status=$1,revision=$2,fence=$3,lease_expires_at=$4,job_json=$5::jsonb
         WHERE job_id=$6 AND revision=$7 AND job_json=$8::jsonb`, [
        next.status,
        next.revision,
        next.fence,
        next.leaseExpiresAt,
        JSON.stringify(next),
        current.jobId,
        current.revision,
        JSON.stringify(current),
      ]);
      if (changed.rowCount !== 1) {
        fail("STRATEGY_RELEASE_JOB_CAS_CONFLICT", { jobId: current.jobId });
      }
    },
    async listExpiredJobs(tx, recoveredAt) {
      const selected = await tx.query(`/* sc_strategy_release:list_expired_jobs */
        SELECT job_json FROM sc_strategy_release_jobs
         WHERE status='running' AND lease_expires_at<=$1
         ORDER BY job_id FOR UPDATE`, [recoveredAt]);
      return selected.rows.map(jobRow);
    },
    async health() {
      assertOpen();
      const selected = await pool.query(`/* sc_strategy_release:health */
        SELECT store_version,adapter_version,schema_fingerprint_hash,
          (SELECT count(*) FROM sc_strategy_release_artifacts) AS artifact_count,
          (SELECT count(*) FROM sc_strategy_release_jobs) AS job_count
        FROM sc_strategy_release_meta WHERE singleton_id=1`);
      const row = selected.rows[0];
      if (row?.store_version !== "starcraft_tmg_strategy_release_store_v1"
        || row?.adapter_version
          !== STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_STORE_VERSION
        || row?.schema_fingerprint_hash
          !== STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_SCHEMA_FINGERPRINT) {
        fail("STRATEGY_RELEASE_POSTGRES_SCHEMA_VERSION_MISMATCH");
      }
      return freeze({
        adapter: "postgresql",
        adapterVersion: STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_STORE_VERSION,
        schemaFingerprintHash:
          STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_SCHEMA_FINGERPRINT,
        transactionMode: "serializable",
        leaseLock: "select_for_update",
        databaseRetries: 0,
        artifactCount: Number(row.artifact_count),
        jobCount: Number(row.job_count),
        durable: true,
      });
    },
    async close() {
      if (!closed) {
        closed = true;
        if (closePoolOnClose && typeof pool.end === "function") {
          await pool.end();
        }
      }
    },
  };
  return createStarcraftTmgStrategyReleaseStoreV1({ port });
}
