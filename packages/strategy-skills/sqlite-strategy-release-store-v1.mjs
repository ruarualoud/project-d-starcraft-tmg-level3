import { DatabaseSync } from "node:sqlite";

import { clone, fail, freeze, hash, verifySeal } from
  "../skill-production/common.mjs";
import { createStarcraftTmgStrategyReleaseStoreV1 } from
  "./strategy-release-store-contract-v1.mjs";

export const STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_STORE_VERSION =
  "starcraft_tmg_sqlite_strategy_release_store_v1";

const COLUMN_LAYOUT = Object.freeze({
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

export const STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_SCHEMA_FINGERPRINT =
  hash(COLUMN_LAYOUT);

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sc_strategy_release_meta (
    singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
    store_version TEXT NOT NULL,
    adapter_version TEXT NOT NULL,
    schema_fingerprint_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sc_strategy_release_artifacts (
    artifact_id TEXT PRIMARY KEY,
    artifact_hash TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL,
    record_json TEXT NOT NULL,
    artifact_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sc_strategy_release_jobs (
    job_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('queued','running','complete')),
    revision INTEGER NOT NULL CHECK (revision >= 0),
    fence INTEGER NOT NULL CHECK (fence >= 0),
    lease_expires_at TEXT,
    job_json TEXT NOT NULL
  );
`;

function parse(value) {
  return value === null || value === undefined
    ? null : JSON.parse(String(value));
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

export function createSqliteStarcraftTmgStrategyReleaseStoreV1(options = {}) {
  const filename = String(options.filename || "").trim();
  if (!filename) throw new TypeError("SQLite strategy release filename is required");
  const database = new DatabaseSync(filename);
  let closed = false;

  function assertOpen() {
    if (closed) fail("STRATEGY_RELEASE_STORE_CLOSED");
  }

  const port = {
    async initialize() {
      assertOpen();
      database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;");
      database.exec(SCHEMA);
      database.prepare(`INSERT INTO sc_strategy_release_meta VALUES (1,?,?,?)
        ON CONFLICT(singleton_id) DO NOTHING`).run(
        "starcraft_tmg_strategy_release_store_v1",
        STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_STORE_VERSION,
        STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_SCHEMA_FINGERPRINT,
      );
      const meta = database.prepare(
        "SELECT * FROM sc_strategy_release_meta WHERE singleton_id=1",
      ).get();
      if (meta?.store_version !== "starcraft_tmg_strategy_release_store_v1"
        || meta?.adapter_version
          !== STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_STORE_VERSION
        || meta?.schema_fingerprint_hash
          !== STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_SCHEMA_FINGERPRINT) {
        fail("STRATEGY_RELEASE_SQLITE_SCHEMA_VERSION_MISMATCH");
      }
    },
    async transaction(callback) {
      assertOpen();
      database.exec("BEGIN IMMEDIATE");
      try {
        const value = await callback(database);
        database.exec("COMMIT");
        return value;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    async getArtifact(tx, key, forUpdate, byHash = false) {
      void forUpdate;
      const queryable = tx || database;
      return artifactRow(queryable.prepare(`SELECT * FROM sc_strategy_release_artifacts
        WHERE ${byHash ? "artifact_hash" : "artifact_id"}=?`).get(key));
    },
    async insertArtifact(tx, row) {
      tx.prepare(`INSERT INTO sc_strategy_release_artifacts
        (artifact_id,artifact_hash,kind,record_json,artifact_json,created_at)
        VALUES (?,?,?,?,?,?)`).run(
        row.record.artifactId,
        row.artifact.hash,
        row.record.kind,
        JSON.stringify(row.record),
        JSON.stringify(row.artifact),
        row.record.createdAt,
      );
    },
    async getJob(tx, jobId) {
      const queryable = tx || database;
      return jobRow(queryable.prepare(
        "SELECT job_json FROM sc_strategy_release_jobs WHERE job_id=?",
      ).get(jobId));
    },
    async insertJob(tx, job) {
      tx.prepare(`INSERT INTO sc_strategy_release_jobs
        (job_id,status,revision,fence,lease_expires_at,job_json)
        VALUES (?,?,?,?,?,?)`).run(
        job.jobId, job.status, job.revision, job.fence,
        job.leaseExpiresAt, JSON.stringify(job),
      );
    },
    async updateJob(tx, current, next) {
      const changed = tx.prepare(`UPDATE sc_strategy_release_jobs
        SET status=?,revision=?,fence=?,lease_expires_at=?,job_json=?
        WHERE job_id=? AND revision=? AND job_json=?`).run(
        next.status, next.revision, next.fence, next.leaseExpiresAt,
        JSON.stringify(next), current.jobId, current.revision,
        JSON.stringify(current),
      );
      if (changed.changes !== 1) fail("STRATEGY_RELEASE_JOB_CAS_CONFLICT", {
        jobId: current.jobId,
      });
    },
    async listExpiredJobs(tx, recoveredAt) {
      return tx.prepare(`SELECT job_json FROM sc_strategy_release_jobs
        WHERE status='running' AND lease_expires_at<=? ORDER BY job_id`).all(recoveredAt)
        .map(jobRow);
    },
    async health() {
      assertOpen();
      const quickCheck = database.prepare("PRAGMA quick_check").get()?.quick_check;
      const artifactCount = database.prepare(
        "SELECT count(*) AS n FROM sc_strategy_release_artifacts",
      ).get().n;
      const jobCount = database.prepare(
        "SELECT count(*) AS n FROM sc_strategy_release_jobs",
      ).get().n;
      return freeze({
        adapter: "sqlite",
        adapterVersion: STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_STORE_VERSION,
        schemaFingerprintHash:
          STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_SCHEMA_FINGERPRINT,
        journalMode: "wal",
        transactionMode: "begin_immediate",
        quickCheck,
        artifactCount,
        jobCount,
        durable: true,
      });
    },
    async close() {
      if (!closed) {
        database.close();
        closed = true;
      }
    },
  };
  return createStarcraftTmgStrategyReleaseStoreV1({ port });
}
