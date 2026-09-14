import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assessStarcraftTmgEnvironmentReadinessV1 } from
  "../packages/platform-operations/environment-readiness-v1.mjs";
import { authorizeStarcraftTmgActionV1, createStarcraftTmgPrincipalV1 } from
  "../packages/platform-operations/identity-rbac-v1.mjs";
import {
  createInMemoryStarcraftTmgPrivacyAdaptersV1,
  createStarcraftTmgGovernedArtifactV1,
  createStarcraftTmgSubjectDeletionPlanV1,
  createStarcraftTmgSubjectDeletionRuntimeV1,
} from "../packages/platform-operations/privacy-retention-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "build/ticket-21-slice-207-privacy-retention-v1");
const subject = "a".repeat(64);
const other = "b".repeat(64);
const H = (character) => character.repeat(64);
const at = "2026-09-14T06:00:00.000Z";
const make = (artifactRef, artifactClass, subjectRefHash, character, extra = {}) =>
  createStarcraftTmgGovernedArtifactV1({ artifactRef, artifactClass,
    subjectRefHash, artifactHash: H(character), locatorHash: H(character),
    createdAt: extra.createdAt || "2026-08-01T00:00:00.000Z",
    legalHold: extra.legalHold || { active: false },
    dependentArtifactHashes: extra.dependentArtifactHashes || [] });
const records = [
  make("private-room-1", "room_private_journal", subject, "1"),
  make("public-room-1", "room_public_journal", subject, "2"),
  make("training-member-1", "training_dataset_member", subject, "3",
    { dependentArtifactHashes: [H("c")] }),
  make("provider-audit-1", "provider_attempt_audit", subject, "4",
    { createdAt: "2026-09-01T00:00:00.000Z" }),
  make("incident-1", "security_incident", subject, "5",
    { legalHold: { active: true, holdRefHash: H("d") } }),
  make("other-private", "room_private_journal", other, "6"),
];
const plan = createStarcraftTmgSubjectDeletionPlanV1({ subjectRefHash: subject,
  requestedAt: at, records });
assert.equal(plan.discoveredCount, 5);
assert.equal(plan.operations.length, 3);
assert.deepEqual(plan.operations.map((entry) => entry.action).sort(),
  ["delete", "delete", "pseudonymize"]);
assert.deepEqual(plan.preserved.map((entry) => entry.reason).sort(),
  ["LEGAL_HOLD_ACTIVE", "MINIMUM_RETENTION_ACTIVE"]);

const environment = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "controlled-delete", environmentClass: "controlled_experiment",
  evidence: { environmentClass: "controlled_experiment", scopedIdentity: true,
    isolatedProviderEgress: true, persistentAttemptAccounting: true,
    budgetPolicy: true, auditJournal: true,
    controlledRulesDataBinding: true },
});
const owner = createStarcraftTmgPrincipalV1({ principalId: "owner-delete",
  issuerId: "controlled-issuer", assurance: "owner_capability", roles: ["owner"],
  subjectRefHash: subject,
  grants: [{ scopeType: "subject", scopeId: subject }], issuedAt: at,
  expiresAt: "2026-09-15T06:00:00.000Z" });
const authorization = authorizeStarcraftTmgActionV1({
  action: "privacy.subject.delete", principal: owner,
  resource: { subjectRefHash: subject }, environmentAssessment: environment,
  at });
assert.equal(authorization.allowed, true);
const adapters = createInMemoryStarcraftTmgPrivacyAdaptersV1(records);
let runtime = createStarcraftTmgSubjectDeletionRuntimeV1(adapters);
let job = await runtime.start({ jobId: "delete-subject-a", plan,
  authorizationDecision: authorization, startedAt: at });
job = await runtime.step(job.jobId, "2026-09-14T06:01:00.000Z");
assert.equal(job.cursor, 1);

runtime = createStarcraftTmgSubjectDeletionRuntimeV1(adapters);
while (job.state === "running") {
  job = await runtime.step(job.jobId, "2026-09-14T06:02:00.000Z");
}
assert.equal(job.state, "complete");
assert.equal(job.finalProof.deletedOrPseudonymized.length, 3);
assert.equal(job.finalProof.preservedByPolicy.length, 2);
assert.deepEqual(job.finalProof.invalidatedDependentArtifactHashes, [H("c")]);
assert.deepEqual(job.finalProof.unrelatedBefore, job.finalProof.unrelatedAfter);
assert.equal(adapters.inspectRecords().some((entry) =>
  entry.artifactRef === "other-private"), true);
assert.equal(adapters.inspectRecords().find((entry) =>
  entry.artifactRef === "public-room-1").subjectRefHash, null);

const tampered = structuredClone(plan);
tampered.operations[0].action = "pseudonymize";
await assert.rejects(runtime.start({ jobId: "tampered-delete", plan: tampered,
  authorizationDecision: authorization, startedAt: at }), /PLAN_TAMPERED/);
assert.throws(() => createStarcraftTmgGovernedArtifactV1({
  artifactRef: "bad", artifactClass: "provider_prompt_artifact",
  subjectRefHash: subject, artifactHash: H("e"), locatorHash: H("f"),
  createdAt: at, apiKey: "sk-forbidden-secret-value",
}), /PRIVACY_SECRET_FIELD_FORBIDDEN/);

const report = {
  schemaVersion: "starcraft_tmg_ticket_21_slice_207_report_v1",
  ticket: 21, slice: 207, status: "passed",
  discoveredCount: plan.discoveredCount,
  operationCount: plan.operations.length,
  preservedCount: plan.preserved.length,
  checks: { hashedSubjectOnly: true, deletionAndPseudonymization: true,
    minimumRetentionHonoured: true, legalHoldHonoured: true,
    dependentTrainingArtifactInvalidated: true, restartResume: true,
    checkpointCas: true, unrelatedRecordsInvariant: true,
    tamperedPlanRejected: true, secretsNeverPersisted: true },
  fixtureAdaptersOnly: true,
  realProductionDeletionAdaptersConfigured: false,
  providerCalls: 0, estimatedCostCny: 0, sourceRefresh: false,
  trainingTruth: false,
};
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
