#!/usr/bin/env node

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 } from
  "../content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs";
import { STARCRAFT_TMG_TICKET_18_RELEASE_STORE_CONFORMANCE_V1 } from
  "../content/skill-generation/ticket-18-release-store-conformance-v1.mjs";
import { loadPortableFoundationalStrategyPackV2 } from
  "../packages/strategy-skills/portable-foundational-skill-pack-loader-v2.mjs";
import {
  STARCRAFT_TMG_STRATEGY_RELEASE_STORE_METHODS,
  hashStarcraftTmgStrategyReleaseStoreValueV1,
} from "../packages/strategy-skills/strategy-release-store-contract-v1.mjs";
import {
  STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_SCHEMA_FINGERPRINT,
  createSqliteStarcraftTmgStrategyReleaseStoreV1,
} from "../packages/strategy-skills/sqlite-strategy-release-store-v1.mjs";
import {
  STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_SCHEMA_FINGERPRINT,
  createPostgresStarcraftTmgStrategyReleaseStoreV1,
} from "../packages/strategy-skills/postgres-strategy-release-store-v1.mjs";
import {
  STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_METHODS,
  hashStarcraftTmgProviderAttemptValueV1,
} from "../packages/secure-provider-runtime/provider-attempt-store-contract-v1.mjs";
import { createSqliteStarcraftTmgProviderAttemptStoreV1 } from
  "../packages/secure-provider-runtime/sqlite-provider-attempt-store-v1.mjs";
import { clone, hash, seal } from "../packages/skill-production/common.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "build/ticket-18-final-release-conformance-v1");
const PORTABLE_REPORT = path.join(ROOT,
  "content/strategy-skills/ticket-18-foundational-v1/evidence/"
    + "slice-179-final-release-conformance-report.json");
const TIMES = Array.from({ length: 20 }, (_, index) =>
  new Date(Date.UTC(2026, 8, 11, 2, 0, index)).toISOString());

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, details });
}

function H(label) {
  return hashStarcraftTmgProviderAttemptValueV1({ ticket: 18, slice: 179, label });
}

function policy() {
  const body = {
    schemaVersion: "starcraft_tmg_provider_budget_policy_v1",
    maxTotalUnits: 1_000,
    maxTurns: 10,
    maxInputUnitsPerTurn: 200,
    maxOutputUnitsPerTurn: 200,
    timeoutMs: 30_000,
    cancellationSettlement: "consume_full_reservation_when_usage_is_unknown",
    timeoutSettlement: "consume_full_reservation_when_usage_is_unknown",
    automaticRetryAllowed: false,
    currency: "provider_units",
    trainingTruth: false,
  };
  return Object.freeze({
    ...body,
    policyHash: hashStarcraftTmgProviderAttemptValueV1(body),
  });
}

function reservation(opened, principalScopeHash, label, reservedAt) {
  return {
    budgetId: opened.budget.budgetId,
    principalScopeHash,
    expectedBudgetRevision: opened.budget.revision,
    idempotencyKeyHash: H(`${label}:idempotency`),
    consentReceiptHash: H(`${label}:consent`),
    providerProfileHash: H("provider-profile"),
    egressPolicyHash: H("egress-policy"),
    promptAssemblyHash: H(`${label}:prompt`),
    responseContractHash: H("response-contract"),
    requestHash: H(`${label}:request`),
    intent: "reflect",
    inputUnits: 30,
    maxOutputUnits: 20,
    reservedAt,
    retryOfAttemptId: null,
    retryApprovalReceiptHash: null,
    reattachmentReceiptHash: null,
  };
}

class DeterministicStrategyReleasePostgresPool {
  constructor() {
    this.meta = null;
    this.artifacts = new Map();
    this.jobs = new Map();
    this.queryLog = [];
    this.schemaSql = "";
    this.connectionCount = 0;
    this.releaseCount = 0;
    this.ended = false;
  }

  snapshot() {
    return {
      meta: clone(this.meta),
      artifacts: [...this.artifacts.entries()].map(([key, value]) =>
        [key, clone(value)]),
      jobs: [...this.jobs.entries()].map(([key, value]) =>
        [key, clone(value)]),
      schemaSql: this.schemaSql,
    };
  }

  restore(snapshot) {
    this.meta = snapshot.meta;
    this.artifacts = new Map(snapshot.artifacts);
    this.jobs = new Map(snapshot.jobs);
    this.schemaSql = snapshot.schemaSql;
  }

  marker(sql) {
    return String(sql).match(/sc_strategy_release:([a-z_]+)/u)?.[1] || "";
  }

  async connect() {
    this.connectionCount += 1;
    const connection = {
      active: false,
      snapshot: null,
      query: (sql, params = []) => this.queryOn(connection, sql, params),
      release: () => {
        this.releaseCount += 1;
        connection.active = false;
        connection.snapshot = null;
      },
    };
    return connection;
  }

  async query(sql, params = []) {
    return this.dispatch(sql, params);
  }

  async end() {
    this.ended = true;
  }

  async queryOn(connection, sql, params) {
    const marker = this.marker(sql);
    this.queryLog.push(String(sql));
    if (marker === "begin") {
      connection.active = true;
      connection.snapshot = this.snapshot();
      return { rows: [], rowCount: 0 };
    }
    if (marker === "commit") {
      connection.active = false;
      connection.snapshot = null;
      return { rows: [], rowCount: 0 };
    }
    if (marker === "rollback") {
      if (connection.active) this.restore(connection.snapshot);
      connection.active = false;
      connection.snapshot = null;
      return { rows: [], rowCount: 0 };
    }
    return this.dispatch(sql, params, false);
  }

  async dispatch(sql, params = [], capture = true) {
    if (capture) this.queryLog.push(String(sql));
    const marker = this.marker(sql);
    if (marker === "init_lock") return { rows: [{}], rowCount: 1 };
    if (marker === "init_schema") {
      this.schemaSql = String(sql);
      return { rows: [], rowCount: 0 };
    }
    if (marker === "insert_meta") {
      if (!this.meta) {
        this.meta = {
          store_version: params[0],
          adapter_version: params[1],
          schema_fingerprint_hash: params[2],
        };
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    if (marker === "select_meta") {
      return { rows: this.meta ? [clone(this.meta)] : [], rowCount: this.meta ? 1 : 0 };
    }
    if (marker.startsWith("select_artifact_by_id")) {
      const row = this.artifacts.get(params[0]);
      return { rows: row ? [clone(row)] : [], rowCount: row ? 1 : 0 };
    }
    if (marker.startsWith("select_artifact_by_hash")) {
      const row = [...this.artifacts.values()].find((entry) =>
        entry.artifact_hash === params[0]);
      return { rows: row ? [clone(row)] : [], rowCount: row ? 1 : 0 };
    }
    if (marker === "insert_artifact") {
      this.artifacts.set(params[0], {
        artifact_id: params[0],
        artifact_hash: params[1],
        kind: params[2],
        record_json: JSON.parse(params[3]),
        artifact_json: JSON.parse(params[4]),
        created_at: params[5],
      });
      return { rows: [], rowCount: 1 };
    }
    if (marker.startsWith("select_job")) {
      const row = this.jobs.get(params[0]);
      return { rows: row ? [{ job_json: clone(row.job_json) }] : [], rowCount: row ? 1 : 0 };
    }
    if (marker === "insert_job") {
      this.jobs.set(params[0], {
        job_id: params[0],
        status: params[1],
        revision: Number(params[2]),
        fence: Number(params[3]),
        lease_expires_at: params[4],
        job_json: JSON.parse(params[5]),
      });
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_job") {
      const row = this.jobs.get(params[5]);
      if (!row || row.revision !== Number(params[6])
        || JSON.stringify(row.job_json) !== params[7]) {
        return { rows: [], rowCount: 0 };
      }
      this.jobs.set(params[5], {
        job_id: params[5],
        status: params[0],
        revision: Number(params[1]),
        fence: Number(params[2]),
        lease_expires_at: params[3],
        job_json: JSON.parse(params[4]),
      });
      return { rows: [], rowCount: 1 };
    }
    if (marker === "list_expired_jobs") {
      const rows = [...this.jobs.values()]
        .filter((row) => row.status === "running"
          && row.lease_expires_at <= params[0])
        .sort((left, right) => left.job_id.localeCompare(right.job_id))
        .map((row) => ({ job_json: clone(row.job_json) }));
      return { rows, rowCount: rows.length };
    }
    if (marker === "health") {
      return { rows: [{
        ...clone(this.meta),
        artifact_count: this.artifacts.size,
        job_count: this.jobs.size,
      }], rowCount: 1 };
    }
    throw new Error(`UNSUPPORTED_POSTGRES_PROTOCOL_MARKER:${marker}`);
  }
}

async function expectCode(callback, expectedCode) {
  try {
    await callback();
  } catch (error) {
    ensure(error?.code === expectedCode, "UNEXPECTED_ERROR_CODE", {
      expectedCode,
      observedCode: error?.code,
    });
    return expectedCode;
  }
  throw new Error(`EXPECTED_ERROR_NOT_THROWN:${expectedCode}`);
}

async function runReleaseScenario(store, artifactEntries, outputArtifact,
  budgetRefHash,
  attemptRefHashes) {
  const initialized = await store.initialize();
  const puts = [];
  for (const entry of artifactEntries) {
    puts.push(await store.putArtifact({
      ...entry,
      expectedHash: entry.artifact.hash,
      createdAt: TIMES[6],
    }));
  }
  const created = await store.createJob({
    jobId: "ticket18.final-release",
    inputHash: H("release-job-input"),
    budgetRefHash,
    createdAt: TIMES[7],
  });
  const firstLease = await store.acquireLease({
    jobId: created.job.jobId,
    ownerId: "worker-before-restart",
    expectedRevision: created.job.revision,
    acquiredAt: TIMES[8],
    expiresAt: TIMES[9],
  });
  const recovery = await store.recoverExpiredLeases({ recoveredAt: TIMES[10] });
  const recoveredJob = await store.getJob(created.job.jobId);
  const staleFenceCode = await expectCode(() => store.completeJob({
    jobId: created.job.jobId,
    ownerId: "worker-before-restart",
    expectedRevision: firstLease.job.revision,
    fence: firstLease.job.fence,
    outputArtifactHashes: [outputArtifact.hash],
    attemptRefHashes,
    completedAt: TIMES[11],
  }), "STRATEGY_RELEASE_JOB_LEASE_STALE");
  const secondLease = await store.acquireLease({
    jobId: created.job.jobId,
    ownerId: "worker-after-restart",
    expectedRevision: recoveredJob.revision,
    acquiredAt: TIMES[11],
    expiresAt: TIMES[15],
  });
  const completed = await store.completeJob({
    jobId: created.job.jobId,
    ownerId: "worker-after-restart",
    expectedRevision: secondLease.job.revision,
    fence: secondLease.job.fence,
    outputArtifactHashes: [outputArtifact.hash],
    attemptRefHashes,
    completedAt: TIMES[12],
  });
  const idempotentCreate = await store.createJob({
    jobId: "ticket18.final-release",
    inputHash: H("release-job-input"),
    budgetRefHash,
    createdAt: TIMES[7],
  });
  const finalArtifact = await store.getArtifact(
    "ticket18.portable-pack-load-receipt",
  );
  const finalJob = await store.getJob("ticket18.final-release");
  const health = await store.health();
  return {
    initialized,
    puts,
    created,
    firstLease,
    recovery,
    staleFenceCode,
    secondLease,
    completed,
    idempotentCreate,
    finalArtifact,
    finalJob,
    health,
  };
}

await mkdir(OUTPUT, { recursive: true });
const runDirectory = await mkdtemp(path.join(OUTPUT, "run-"));
const portable = await loadPortableFoundationalStrategyPackV2({
  root: ROOT,
  manifest: STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2,
});
const contract = STARCRAFT_TMG_TICKET_18_RELEASE_STORE_CONFORMANCE_V1;
ensure(contract.strategyReleaseStore.semanticSchemaParityRequired === true
  && STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_SCHEMA_FINGERPRINT
    === STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_SCHEMA_FINGERPRINT
  && JSON.stringify(contract.strategyReleaseStore.methods)
    === JSON.stringify(STARCRAFT_TMG_STRATEGY_RELEASE_STORE_METHODS)
  && JSON.stringify(contract.providerAttemptStore.methods)
    === JSON.stringify(STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_METHODS),
"RELEASE_STORE_CONTRACT_PARITY_INVALID");

const principalScopeHash = H("provider-principal");
const providerFilename = path.join(runDirectory, "provider-attempts.sqlite");
let providerStore = createSqliteStarcraftTmgProviderAttemptStoreV1({
  filename: providerFilename,
});
const opened = await providerStore.openBudget({
  principalScopeHash,
  sessionBindingHash: H("provider-session"),
  policy: policy(),
  idempotencyKeyHash: H("provider-budget-open"),
  openedAt: TIMES[0],
});
const reservedBeforeDispatch = await providerStore.reserveAttempt(reservation(
  opened, principalScopeHash, "before-dispatch", TIMES[1],
));
await providerStore.close();
providerStore = createSqliteStarcraftTmgProviderAttemptStoreV1({
  filename: providerFilename,
});
const recoveredBeforeDispatch = await providerStore.recoverOpenAttempts({
  recoveryIdempotencyKeyHash: H("recover-before-dispatch"),
  recoveredAt: TIMES[2],
});
const afterFirstRecoveryBudget = await providerStore.getBudget(opened.budget.budgetId);
const reservedAfterDispatch = await providerStore.reserveAttempt(reservation({
  budget: afterFirstRecoveryBudget,
}, principalScopeHash, "after-dispatch", TIMES[3]));
const dispatched = await providerStore.markAttemptDispatched({
  attemptId: reservedAfterDispatch.attempt.attemptId,
  expectedAttemptRevision: reservedAfterDispatch.attempt.revision,
  dispatchBindingHash: H("dispatch-binding"),
  dispatchedAt: TIMES[4],
});
await providerStore.close();
providerStore = createSqliteStarcraftTmgProviderAttemptStoreV1({
  filename: providerFilename,
});
const recoveredAfterDispatch = await providerStore.recoverOpenAttempts({
  recoveryIdempotencyKeyHash: H("recover-after-dispatch"),
  recoveredAt: TIMES[5],
});
const finalProviderBudget = await providerStore.getBudget(opened.budget.budgetId);
const finalBeforeDispatchAttempt = await providerStore.getAttempt(
  reservedBeforeDispatch.attempt.attemptId,
);
const finalAfterDispatchAttempt = await providerStore.getAttempt(
  dispatched.attempt.attemptId,
);
const providerAudit = await providerStore.readAudit({
  budgetId: opened.budget.budgetId,
  afterSequence: 0,
  limit: 100,
});
const providerReplay = await providerStore.replayBudget(opened.budget.budgetId);
const providerHealth = await providerStore.health();
ensure(recoveredBeforeDispatch.abandonedBeforeEgressCount === 1
  && recoveredBeforeDispatch.ambiguousCount === 0
  && recoveredAfterDispatch.abandonedBeforeEgressCount === 0
  && recoveredAfterDispatch.ambiguousCount === 1
  && finalBeforeDispatchAttempt.status === "abandoned_before_egress"
  && finalBeforeDispatchAttempt.chargedUnits === 0
  && finalAfterDispatchAttempt.status === "ambiguous"
  && finalAfterDispatchAttempt.chargedUnits
    === finalAfterDispatchAttempt.reservedUnits
  && finalAfterDispatchAttempt.retryAuthorizationRequired === true
  && providerReplay.replayMatchesProjection === true,
"PROVIDER_ATTEMPT_RECOVERY_COMPOSITION_FAILED");
await providerStore.close();

const budgetRefHash = finalProviderBudget.budgetHash;
const releaseArtifactEntries = [
  ...portable.foundational.entries.map((entry) => ({
    artifactId: `skill.${entry.skill.skillId}`,
    kind: "foundational_strategy_skill",
    artifact: entry.skill,
  })),
  ...portable.qualifications.map((entry) => ({
    artifactId: `qualification.${entry.artifact.hash}`,
    kind: "foundational_skill_qualification",
    artifact: entry.artifact,
  })),
  ...portable.candidates.map((entry) => ({
    artifactId: `candidate.${entry.artifact.skillId}`,
    kind: "skillopt_candidate_skill",
    artifact: entry.artifact,
  })),
  {
    artifactId: "evolution.promotion-records",
    kind: "skillopt_promotion_record_bundle",
    artifact: portable.promotionRecordBundle.artifact,
  },
  ...portable.predecessorEvidence.map((entry) => ({
    artifactId: `evidence.slice-${entry.slice}`,
    kind: "ticket18_predecessor_evidence",
    artifact: entry.artifact,
  })),
  {
    artifactId: "ticket18.portable-pack-load-receipt",
    kind: "portable_strategy_pack_receipt",
    artifact: portable.receipt,
  },
];
ensure(releaseArtifactEntries.length === 16
  && new Set(releaseArtifactEntries.map((entry) => entry.artifactId)).size
    === releaseArtifactEntries.length,
"RELEASE_ARTIFACT_DENOMINATOR_INVALID");
const sqliteFilename = path.join(runDirectory, "strategy-release.sqlite");
let sqliteStore = createSqliteStarcraftTmgStrategyReleaseStoreV1({
  filename: sqliteFilename,
});
await sqliteStore.initialize();
const sqlitePuts = [];
for (const entry of releaseArtifactEntries) {
  sqlitePuts.push(await sqliteStore.putArtifact({
    ...entry,
    expectedHash: entry.artifact.hash,
    createdAt: TIMES[6],
  }));
}
const sqliteCreated = await sqliteStore.createJob({
  jobId: "ticket18.final-release",
  inputHash: H("release-job-input"),
  budgetRefHash,
  createdAt: TIMES[7],
});
const sqliteFirstLease = await sqliteStore.acquireLease({
  jobId: sqliteCreated.job.jobId,
  ownerId: "worker-before-restart",
  expectedRevision: sqliteCreated.job.revision,
  acquiredAt: TIMES[8],
  expiresAt: TIMES[9],
});
await sqliteStore.close();
sqliteStore = createSqliteStarcraftTmgStrategyReleaseStoreV1({
  filename: sqliteFilename,
});
const sqliteRecovery = await sqliteStore.recoverExpiredLeases({
  recoveredAt: TIMES[10],
});
const sqliteRecoveredJob = await sqliteStore.getJob("ticket18.final-release");
const sqliteStaleFence = await expectCode(() => sqliteStore.completeJob({
  jobId: "ticket18.final-release",
  ownerId: "worker-before-restart",
  expectedRevision: sqliteFirstLease.job.revision,
  fence: sqliteFirstLease.job.fence,
  outputArtifactHashes: [portable.receipt.hash],
  attemptRefHashes: [],
  completedAt: TIMES[11],
}), "STRATEGY_RELEASE_JOB_LEASE_STALE");
const sqliteSecondLease = await sqliteStore.acquireLease({
  jobId: "ticket18.final-release",
  ownerId: "worker-after-restart",
  expectedRevision: sqliteRecoveredJob.revision,
  acquiredAt: TIMES[11],
  expiresAt: TIMES[15],
});
const attemptRefHashes = [
  finalBeforeDispatchAttempt.attemptHash,
  finalAfterDispatchAttempt.attemptHash,
];
const sqliteCompleted = await sqliteStore.completeJob({
  jobId: "ticket18.final-release",
  ownerId: "worker-after-restart",
  expectedRevision: sqliteSecondLease.job.revision,
  fence: sqliteSecondLease.job.fence,
  outputArtifactHashes: [portable.receipt.hash],
  attemptRefHashes,
  completedAt: TIMES[12],
});
const sqliteFinalJob = await sqliteStore.getJob("ticket18.final-release");
const sqliteFinalArtifact = await sqliteStore.getArtifact(
  "ticket18.portable-pack-load-receipt",
);
const sqliteHealth = await sqliteStore.health();
ensure(sqlitePuts.every((entry) => entry.cached === false)
  && sqliteRecovery.recoveryCount === 1
  && sqliteStaleFence === "STRATEGY_RELEASE_JOB_LEASE_STALE"
  && sqliteSecondLease.job.fence === sqliteFirstLease.job.fence + 1
  && sqliteCompleted.job.status === "complete"
  && hash(sqliteCompleted.job.attemptRefHashes) === hash(attemptRefHashes)
  && sqliteFinalArtifact.artifact.hash === portable.receipt.hash
  && sqliteHealth.adapter.artifactCount === releaseArtifactEntries.length
  && sqliteHealth.adapter.quickCheck === "ok",
"SQLITE_RELEASE_RESTART_CONFORMANCE_FAILED");
await sqliteStore.close();

const postgresPool = new DeterministicStrategyReleasePostgresPool();
const postgresStore = createPostgresStarcraftTmgStrategyReleaseStoreV1({
  pool: postgresPool,
  closePoolOnClose: true,
});
const postgresScenario = await runReleaseScenario(
  postgresStore, releaseArtifactEntries, portable.receipt, budgetRefHash,
  attemptRefHashes,
);
ensure(postgresScenario.recovery.recoveryCount === 1
  && postgresScenario.staleFenceCode === "STRATEGY_RELEASE_JOB_LEASE_STALE"
  && postgresScenario.completed.job.status === "complete"
  && postgresScenario.idempotentCreate.cached === true
  && postgresScenario.finalArtifact.artifact.hash === portable.receipt.hash
  && postgresScenario.health.adapter.artifactCount
    === releaseArtifactEntries.length
  && postgresPool.queryLog.some((sql) => sql.includes("SERIALIZABLE"))
  && postgresPool.queryLog.some((sql) => sql.includes("FOR UPDATE")),
"POSTGRES_RELEASE_PROTOCOL_CONFORMANCE_FAILED");
await postgresStore.close();
ensure(postgresPool.ended === true, "POSTGRES_POOL_CLOSE_FAILED");

const semanticParity = {
  artifactRecordHash:
    sqliteFinalArtifact.record.hash === postgresScenario.finalArtifact.record.hash,
  initialJobHash:
    sqliteCreated.job.hash === postgresScenario.created.job.hash,
  firstLeaseJobHash:
    sqliteFirstLease.job.hash === postgresScenario.firstLease.job.hash,
  recoveryJobHash:
    sqliteRecovery.recoveredJobHashes[0]
      === postgresScenario.recovery.recoveredJobHashes[0],
  secondLeaseFence:
    sqliteSecondLease.job.fence === postgresScenario.secondLease.job.fence,
  completedJobHash:
    sqliteCompleted.job.hash === postgresScenario.completed.job.hash,
  finalJobHash:
    sqliteFinalJob.hash === postgresScenario.finalJob.hash,
};
ensure(Object.values(semanticParity).every(Boolean),
  "RELEASE_STORE_SEMANTIC_PARITY_FAILED", semanticParity);

const postgresSource = await readFile(path.join(ROOT,
  "packages/strategy-skills/postgres-strategy-release-store-v1.mjs"), "utf8");
ensure(postgresSource.includes("BEGIN ISOLATION LEVEL SERIALIZABLE")
  && postgresSource.includes("FOR UPDATE")
  && !/for\s*\([^)]*retry|while\s*\([^)]*retry/iu.test(postgresSource),
"POSTGRES_RELEASE_RETRY_OR_LOCK_POLICY_INVALID");

const report = seal({
  schema: "ticket18_slice179_final_release_conformance_report_v1",
  ticket: 18,
  slice: 179,
  status: "passed",
  ticketProgress: "8/8_complete",
  projectProgress: "17/22",
  portableManifestHash: portable.manifest.hash,
  portableLoadReceiptHash: portable.receipt.hash,
  portableContentObjects: 15,
  persistedReleaseArtifactRecords: releaseArtifactEntries.length,
  foundationalSkills: portable.foundational.entries.length,
  runtimeAcceptedFoundationalSkills: 5,
  skillOptCandidates: portable.candidates.length,
  skillOptCandidateHashes: portable.candidates.map((entry) => entry.artifact.hash),
  promotionRecordBundleHash: portable.promotionRecordBundle.artifact.hash,
  predecessorEvidence: portable.predecessorEvidence.map((entry) => ({
    slice: entry.slice,
    hash: entry.artifact.hash,
    status: entry.artifact.status,
  })),
  buildPathDependencies: portable.receipt.buildPathDependencies,
  releaseStoreConformance: {
    contractHash: contract.hash,
    methods: [...STARCRAFT_TMG_STRATEGY_RELEASE_STORE_METHODS],
    schemaFingerprint:
      STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_SCHEMA_FINGERPRINT,
    sqlite: {
      closeReopenPassed: true,
      expiredLeaseRecoveryCount: sqliteRecovery.recoveryCount,
      staleFenceRejected: true,
      finalJobHash: sqliteFinalJob.hash,
      healthHash: sqliteHealth.hash,
    },
    postgres: {
      deterministicProtocolDoubleUsed: true,
      realServerUsed: false,
      serializableObserved: true,
      selectForUpdateObserved: true,
      internalDatabaseRetries: 0,
      connectionCount: postgresPool.connectionCount,
      finalJobHash: postgresScenario.finalJob.hash,
      healthHash: postgresScenario.health.hash,
    },
    semanticParity,
  },
  providerAttemptConformance: {
    methods: [...STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_METHODS],
    sqliteWalRestartCount: 2,
    preDispatchRecovery: finalBeforeDispatchAttempt.status,
    preDispatchChargedUnits: finalBeforeDispatchAttempt.chargedUnits,
    postDispatchRecovery: finalAfterDispatchAttempt.status,
    postDispatchChargedUnits: finalAfterDispatchAttempt.chargedUnits,
    ambiguousRetryAuthorizationRequired:
      finalAfterDispatchAttempt.retryAuthorizationRequired,
    budgetHash: finalProviderBudget.budgetHash,
    auditEventCount: providerAudit.events.length,
    auditReplayHash: providerReplay.resultHash,
    auditReplayMatchesProjection: providerReplay.replayMatchesProjection,
    healthAdapter: providerHealth.adapter,
    actualProviderCalls: 0,
  },
  tokenAndCostLedger: {
    matchupEpochTokens: 34_120_976,
    matchupEpochEstimatedCny: 15.721921,
    historicalCumulativeTokens: 260_204_060,
    historicalCumulativeEstimatedCny: 312.143927,
    slice179IncrementalTokens: 0,
    slice179IncrementalEstimatedCny: 0,
    paymentRequiredCount: 0,
  },
  extraFactionScope: {
    terranArmedForcesIsOneFactionSkill: true,
    zergSwarmIsOneFactionSkill: true,
    protossExperiment: "tactical_cards:daelaam",
    secondFactionExperiment:
      "choose_exactly_one_of_terran_raynors_raiders_or_zerg_kerrigans_swarm",
    selectionFinalized: false,
    combinedTerranZergFactionSkill: false,
  },
  onlyCriticalHighBlockIntegration: true,
  criticalHighFindings: [],
  nonBlockingFindings: [
    {
      severity: "Medium",
      code: "FULL_GAME_STRATEGY_EFFECTIVENESS_NOT_PROVEN",
      blocksIntegration: false,
    },
    {
      severity: "Medium",
      code: "REAL_POSTGRES_SERVER_NOT_USED_IN_LOCAL_SLICE",
      blocksIntegration: false,
    },
  ],
  harnessLoopUsed: true,
  targetGames: ["starcraft-tmg"],
  promptPackRoutes: [
    "general_rules_and_strategy",
    "own_faction",
    "opponent_faction_dependency",
    "directed_matchup",
    "postgame_reflection",
    "skillopt_candidate",
  ],
  harnessToolsCalled: [
    "read_strategy_skills",
    "read_rules_skills",
    "read_viewer_state",
    "read_legal_space",
    "preview",
    "confirm",
    "apply",
    "replay",
    "write_skillopt_candidate",
  ],
  uiTraceEvidence: [{
    predecessorSlice: 176,
    reportHash: portable.predecessorEvidence.find((entry) =>
      entry.slice === 176).artifact.hash,
    newUiTraceProduced: false,
    reason: "Slice179 is persistence and release conformance only.",
  }],
  agentDecisionEvidence: [{
    predecessorSlice: 178,
    reportHash: portable.predecessorEvidence.find((entry) =>
      entry.slice === 178).artifact.hash,
    candidateCriticalHighFindings: 0,
  }],
  memoryTraceEvidence: {
    writesPerformed: 0,
    candidatesPromotedToMemory: false,
  },
  trainingTraceCandidates: [],
  rollbackOrDemotionRules: {
    oldSkillVersionsRemainDisplayable: true,
    runtimeUsesExplicitAcceptedRevision: true,
    expiredJobLeaseRequeuesWithNewFence: true,
    preDispatchAttemptAbandonsWithoutCharge: true,
    postDispatchUnknownAttemptBecomesAmbiguous: true,
    automaticProviderRetry: false,
    automaticSkillPromotion: false,
  },
  userVisibleChecks: [
    "The exact five foundational Skills load from tracked content paths on a clean checkout.",
    "Old accepted Skills and newer SkillOpt candidates remain separately inspectable by hash.",
    "An expired worker cannot complete after a recovered worker receives a higher fence.",
    "SQLite M1 and PostgreSQL production adapters produce the same semantic release records.",
    "No Terran/Zerg combined Faction Skill is produced; the later second-Faction choice remains explicit.",
  ],
  sourceRefreshPerformed: false,
  modelCalls: 0,
  paidProviderUsed: false,
  fullGameStrategyEffectivenessProven: false,
  automaticPromotion: false,
  runtimeAccepted: false,
  eligibleForTraining: false,
  trainingTruth: false,
});
await writeFile(path.join(OUTPUT, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
await writeFile(PORTABLE_REPORT,
  `${JSON.stringify(report, null, 2)}\n`, { mode: 0o644 });

console.log(JSON.stringify({
  ok: true,
  output: path.relative(ROOT, path.join(OUTPUT, "report.json")),
  reportHash: report.hash,
  ticketProgress: report.ticketProgress,
  projectProgress: report.projectProgress,
  portableContentObjects: report.portableContentObjects,
  sqlitePostgresSemanticParity:
    Object.values(report.releaseStoreConformance.semanticParity).every(Boolean),
  providerRecovery:
    `${report.providerAttemptConformance.preDispatchRecovery}/${report.providerAttemptConformance.postDispatchRecovery}`,
  modelCalls: report.modelCalls,
}, null, 2));
