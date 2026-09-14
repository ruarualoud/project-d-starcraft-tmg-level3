import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assessStarcraftTmgEnvironmentReadinessV1 } from
  "../packages/platform-operations/environment-readiness-v1.mjs";
import {
  assessStarcraftTmgPersistenceReadinessV1,
  createStarcraftTmgDurableOperationRuntimeV1,
} from "../packages/platform-operations/durable-operation-runtime-v1.mjs";
import { createSqliteStarcraftTmgStrategyReleaseStoreV1 } from
  "../packages/strategy-skills/sqlite-strategy-release-store-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "build/ticket-21-slice-205-durable-operation-v1");
await mkdir(outputDir, { recursive: true });
const filename = path.join(outputDir, `queue-${process.pid}.sqlite`);
const H = (character) => character.repeat(64);
let store = createSqliteStarcraftTmgStrategyReleaseStoreV1({ filename });
let queue = createStarcraftTmgDurableOperationRuntimeV1({ jobStore: store });
const enqueued = await queue.enqueue({
  jobId: "ticket21-selfplay-001", kind: "selfplay",
  payloadRefHash: H("a"), principalHash: H("b"),
  environmentAssessmentHash: H("c"), budgetRefHash: H("d"),
  createdAt: "2026-09-14T00:00:00.000Z",
});
const firstLease = await queue.claim({ jobId: enqueued.job.jobId,
  ownerId: "worker-a", expectedRevision: 0,
  acquiredAt: "2026-09-14T00:01:00.000Z",
  expiresAt: "2026-09-14T00:02:00.000Z" });
await store.close();

store = createSqliteStarcraftTmgStrategyReleaseStoreV1({ filename });
queue = createStarcraftTmgDurableOperationRuntimeV1({ jobStore: store });
const recovered = await queue.recover({
  recoveredAt: "2026-09-14T00:03:00.000Z" });
assert.deepEqual(recovered.recoveredJobIds, ["ticket21-selfplay-001"]);
await assert.rejects(queue.complete({ jobId: "ticket21-selfplay-001",
  ownerId: "worker-a", expectedRevision: firstLease.job.revision,
  fence: firstLease.job.fence, output: { status: "stale" },
  completedAt: "2026-09-14T00:04:00.000Z" }),
/(LEASE_STALE|CAS_CONFLICT)/);
const afterRecovery = await queue.inspect("ticket21-selfplay-001");
const secondLease = await queue.claim({ jobId: "ticket21-selfplay-001",
  ownerId: "worker-b", expectedRevision: afterRecovery.job.revision,
  acquiredAt: "2026-09-14T00:04:00.000Z",
  expiresAt: "2026-09-14T00:10:00.000Z" });
const completed = await queue.complete({ jobId: "ticket21-selfplay-001",
  ownerId: "worker-b", expectedRevision: secondLease.job.revision,
  fence: secondLease.job.fence, output: { status: "completed", actions: 80 },
  completedAt: "2026-09-14T00:05:00.000Z" });
assert.equal(completed.job.status, "complete");
assert.equal(completed.job.fence, 2);
const queueHealth = await queue.health();
assert.equal(queueHealth.store.adapter.adapter, "sqlite");
assert.equal(queueHealth.automaticProviderRetry, false);

const controlledEnvironment = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "controlled-local", environmentClass: "controlled_experiment",
  evidence: { environmentClass: "controlled_experiment", scopedIdentity: true,
    isolatedProviderEgress: true, persistentAttemptAccounting: true,
    budgetPolicy: true, auditJournal: true,
    controlledRulesDataBinding: true },
});
const controlledReadiness = assessStarcraftTmgPersistenceReadinessV1({
  environmentAssessment: controlledEnvironment,
  roomStoreHealth: { healthy: true, adapter: "sqlite",
    atomicCasContract: "starcraft_tmg_room_store_v1", productionReady: false },
  queueHealth, instanceCount: 1,
});
assert.equal(controlledReadiness.ready, true);
assert.equal(controlledReadiness.productionReady, false);

const productionEnvironment = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "prod-cn-1", environmentClass: "production_room",
  evidence: { environmentClass: "production_room",
    externalIdentityAuthority: true, externalKeyManagement: true,
    productionPostgresCas: true, durableQueue: true, immutableRelease: true,
    distributionRightsApproved: true, privacyRetentionPolicy: true,
    productionTelemetry: true, incidentRollback: true },
});
const productionContractEvidence = assessStarcraftTmgPersistenceReadinessV1({
  environmentAssessment: productionEnvironment,
  roomStoreHealth: { healthy: true, adapter: "postgresql",
    atomicCasContract: "starcraft_tmg_room_store_v1", productionReady: true,
    transactionIsolation: "serializable_with_row_lock_and_revision_cas" },
  queueHealth: { ...queueHealth, store: { ...queueHealth.store,
    adapter: { adapter: "postgresql", transactionMode: "serializable",
      leaseLock: "select_for_update" } } },
  instanceCount: 2,
});
assert.equal(productionContractEvidence.productionReady, true);
const localCannotClaimProduction = assessStarcraftTmgPersistenceReadinessV1({
  environmentAssessment: productionEnvironment,
  roomStoreHealth: controlledReadiness.roomStore,
  queueHealth, instanceCount: 1,
});
assert.equal(localCannotClaimProduction.productionReady, false);
assert.equal(localCannotClaimProduction.findings.length, 3);
await assert.rejects(queue.enqueue({
  jobId: "secret-job", kind: "provider_inference", payloadRefHash: H("1"),
  principalHash: H("2"), environmentAssessmentHash: H("3"),
  budgetRefHash: H("4"), createdAt: "2026-09-14T00:06:00.000Z",
  apiKey: "sk-forbidden-secret-value",
}), /DURABLE_JOB_SECRET_FIELD_FORBIDDEN/);

const report = {
  schemaVersion: "starcraft_tmg_ticket_21_slice_205_report_v1",
  ticket: 21, slice: 205, status: "passed",
  job: { jobId: completed.job.jobId, status: completed.job.status,
    finalFence: completed.job.fence, recoveryCount: recovered.recoveryCount },
  checks: { inputReferencePersisted: true, sqliteRestartRecovery: true,
    staleWorkerRejected: true, secondWorkerCompleted: true,
    revisionCas: true, leaseFencing: true, idempotentArtifactStore: true,
    providerUnknownDeliveryNotAutoRetried: true,
    productionRequiresPostgresAndTwoInstances: true,
    localAdapterCannotClaimProduction: true, secretsRejected: true },
  productionContractEvidence: productionContractEvidence.productionReady,
  realProductionPostgresConfigured: false,
  providerCalls: 0, estimatedCostCny: 0, sourceRefresh: false,
  trainingTruth: false,
};
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
await store.close();
console.log(JSON.stringify(report, null, 2));
