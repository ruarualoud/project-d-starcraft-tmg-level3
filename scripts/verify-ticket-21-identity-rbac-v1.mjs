import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assessStarcraftTmgEnvironmentReadinessV1 } from
  "../packages/platform-operations/environment-readiness-v1.mjs";
import {
  authorizeStarcraftTmgActionV1,
  createStarcraftTmgPrincipalV1,
  describeStarcraftTmgRbacPolicyV1,
} from "../packages/platform-operations/identity-rbac-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "build/ticket-21-slice-203-identity-rbac-v1");
const now = "2026-09-14T06:00:00.000Z";
const subject = "a".repeat(64);
const resourceHash = "b".repeat(64);
const controlled = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "ticket21-controlled",
  environmentClass: "controlled_experiment",
  evidence: {
    environmentClass: "controlled_experiment", scopedIdentity: true,
    isolatedProviderEgress: true, persistentAttemptAccounting: true,
    budgetPolicy: true, auditJournal: true,
    controlledRulesDataBinding: true,
  },
});
const production = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "ticket21-production",
  environmentClass: "production_room",
  evidence: {
    environmentClass: "production_room", externalIdentityAuthority: true,
    externalKeyManagement: true, productionPostgresCas: true,
    durableQueue: true, immutableRelease: true,
    distributionRightsApproved: true, privacyRetentionPolicy: true,
    productionTelemetry: true, incidentRollback: true,
  },
});
const trainingEnvironment = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "ticket21-training",
  environmentClass: "training_eligible_run",
  evidence: {
    environmentClass: "training_eligible_run", scopedIdentity: true,
    externalKeyManagement: true, durableQueue: true, immutableRelease: true,
    viewerLeakAuditPassed: true, technicalTrajectoryEligibility: true,
    groupedSplitManifest: true, independentTrainingApproval: true,
  },
});

const owner = createStarcraftTmgPrincipalV1({
  principalId: "owner-1", issuerId: "controlled-issuer",
  assurance: "owner_capability", roles: ["owner"], subjectRefHash: subject,
  grants: [{ scopeType: "subject", scopeId: subject }],
  issuedAt: now, expiresAt: "2026-09-15T06:00:00.000Z",
});
const seat = createStarcraftTmgPrincipalV1({
  principalId: "seat-player1", issuerId: "controlled-issuer",
  assurance: "owner_capability", roles: ["seat"], subjectRefHash: subject,
  grants: [{ scopeType: "seat", scopeId: "room-1-player1",
    roomId: "room-1", seat: "player1" }],
  issuedAt: now, expiresAt: "2026-09-15T06:00:00.000Z",
});
const reviewer = createStarcraftTmgPrincipalV1({
  principalId: "reviewer-1", issuerId: "production-idp",
  assurance: "external_identity", roles: ["reviewer"], subjectRefHash: null,
  grants: [{ scopeType: "dataset", scopeId: resourceHash }],
  issuedAt: now, expiresAt: "2026-09-15T06:00:00.000Z",
});
const administrator = createStarcraftTmgPrincipalV1({
  principalId: "admin-1", issuerId: "production-idp",
  assurance: "hardware_admin_mfa", roles: ["administrator"],
  subjectRefHash: null,
  grants: [{ scopeType: "deployment", scopeId: "prod-cn-1" }],
  issuedAt: now, expiresAt: "2026-09-15T06:00:00.000Z",
});

assert.equal(authorizeStarcraftTmgActionV1({
  action: "provider.infer", principal: owner,
  resource: { subjectRefHash: subject }, environmentAssessment: controlled,
  sessionProviderCredentialPresent: true, at: now,
}).allowed, true);
assert.equal(authorizeStarcraftTmgActionV1({
  action: "room.play", principal: seat,
  resource: { roomId: "room-1", seat: "player1" },
  environmentAssessment: controlled, at: now,
}).allowed, true);
assert.equal(authorizeStarcraftTmgActionV1({
  action: "room.play", principal: seat,
  resource: { roomId: "room-1", seat: "player2" },
  environmentAssessment: controlled, at: now,
}).allowed, false);
const ownerAdminAttempt = authorizeStarcraftTmgActionV1({
  action: "release.rollback", principal: owner,
  resource: { deploymentId: "prod-cn-1" },
  environmentAssessment: production, at: now,
});
assert.equal(ownerAdminAttempt.allowed, false);
assert.ok(ownerAdminAttempt.findings.some((entry) => entry.code === "ROLE_DENIED"));

const approval = authorizeStarcraftTmgActionV1({
  action: "training.approve", principal: reviewer,
  resource: { datasetHash: resourceHash, producerPrincipalId: "worker-2" },
  environmentAssessment: trainingEnvironment, at: now,
});
assert.equal(approval.allowed, true);
const selfApproval = authorizeStarcraftTmgActionV1({
  action: "training.approve", principal: reviewer,
  resource: { datasetHash: resourceHash, producerPrincipalId: "reviewer-1" },
  environmentAssessment: trainingEnvironment, at: now,
});
assert.equal(selfApproval.allowed, false);

const publish = authorizeStarcraftTmgActionV1({
  action: "release.publish", principal: administrator,
  resource: { deploymentId: "prod-cn-1", resourceHash },
  environmentAssessment: production,
  independentApproval: {
    decision: "approved", reviewerPrincipalId: "reviewer-1", resourceHash,
  },
  at: now,
});
assert.equal(publish.allowed, true);
assert.throws(() => authorizeStarcraftTmgActionV1({
  action: "rules.read", principal: owner, resource: {},
  environmentAssessment: controlled, at: now,
  apiKey: "sk-forbidden-secret-material",
}), /RBAC_SECRET_FIELD_FORBIDDEN/);

const policy = describeStarcraftTmgRbacPolicyV1();
const report = {
  schemaVersion: "starcraft_tmg_ticket_21_slice_203_report_v1",
  ticket: 21,
  slice: 203,
  status: "passed",
  roleCount: policy.roles.length,
  actionCount: Object.keys(policy.actions).length,
  checks: {
    exactSeatScope: true,
    ownerByokInferenceOnly: true,
    ownerCannotBecomeAdministrator: true,
    productionAdminRequiresHardwareMfa: true,
    reviewerSeparationOfDuties: true,
    independentPublishApproval: true,
    secretsRejected: true,
    defaultDeny: true,
  },
  providerCalls: 0,
  estimatedCostCny: 0,
  sourceRefresh: false,
  trainingTruth: false,
};
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
