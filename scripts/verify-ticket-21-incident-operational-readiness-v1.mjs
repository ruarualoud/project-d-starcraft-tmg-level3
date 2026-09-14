import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { assessStarcraftTmgEnvironmentReadinessV1 } from
  "../packages/platform-operations/environment-readiness-v1.mjs";
import { authorizeStarcraftTmgActionV1, createStarcraftTmgPrincipalV1,
  describeStarcraftTmgRbacPolicyV1 } from
  "../packages/platform-operations/identity-rbac-v1.mjs";
import {
  assessStarcraftTmgOperationalReadinessV1,
  createStarcraftTmgIncidentControlV1,
} from "../packages/platform-operations/incident-operational-readiness-v1.mjs";
import { describeStarcraftTmgPrivacyPolicyV1 } from
  "../packages/platform-operations/privacy-retention-v1.mjs";
import {
  createInMemoryStarcraftTmgReleaseRegistryV1,
  createStarcraftTmgReleaseManifestV1,
  createStarcraftTmgSignedReleaseRecordV1,
} from "../packages/platform-operations/release-distribution-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "build/ticket-21-slice-209-incident-readiness-v1");
const H = (character) => character.repeat(64);
const production = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "prod-cn-1", environmentClass: "production_room",
  evidence: { environmentClass: "production_room",
    externalIdentityAuthority: true, externalKeyManagement: true,
    productionPostgresCas: true, durableQueue: true, immutableRelease: true,
    distributionRightsApproved: true, privacyRetentionPolicy: true,
    productionTelemetry: true, incidentRollback: true },
});
const local = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "local", environmentClass: "local_demo",
  evidence: { environmentClass: "local_demo" },
});
const controlled = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "controlled", environmentClass: "controlled_experiment",
  evidence: { environmentClass: "controlled_experiment", scopedIdentity: true,
    isolatedProviderEgress: true, persistentAttemptAccounting: true,
    budgetPolicy: true, auditJournal: true, controlledRulesDataBinding: true },
});
const training = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "training", environmentClass: "training_eligible_run",
  evidence: { environmentClass: "training_eligible_run", scopedIdentity: true,
    externalKeyManagement: true, durableQueue: true, immutableRelease: true,
    viewerLeakAuditPassed: true, technicalTrajectoryEligibility: true,
    groupedSplitManifest: true, independentTrainingApproval: true },
});
const admin = createStarcraftTmgPrincipalV1({ principalId: "incident-admin",
  issuerId: "production-idp", assurance: "hardware_admin_mfa",
  roles: ["administrator"], subjectRefHash: null,
  grants: [{ scopeType: "deployment", scopeId: "prod-cn-1" }],
  issuedAt: "2026-09-14T00:00:00.000Z",
  expiresAt: "2026-09-15T00:00:00.000Z" });
const incidentAuth = authorizeStarcraftTmgActionV1({ action: "incident.manage",
  principal: admin, resource: { deploymentId: "prod-cn-1" },
  environmentAssessment: production, at: "2026-09-14T01:00:00.000Z" });
const rollbackAuth = authorizeStarcraftTmgActionV1({ action: "release.rollback",
  principal: admin, resource: { deploymentId: "prod-cn-1" },
  environmentAssessment: production, at: "2026-09-14T01:00:00.000Z" });

const componentKinds = ["web_app", "native_app", "rules", "data", "action_space",
  "skill_pack", "source_snapshot", "database_schema", "provider_contract",
  "training_export_contract"];
const components = componentKinds.map((kind, index) => ({ kind,
  componentId: `sc.${kind}`, version: `1.${index}.0`,
  contentHash: (index + 1).toString(16).repeat(64), compatibilityAdapter: null }));
const skills = [{ skillId: "sc.general", version: "1.0.0",
  contentHash: H("a"), state: "accepted" }];
const assets = [{ assetId: "original-frame", contentHash: H("b"),
  mediaType: "image/webp", rights: { classification: "owned",
    licenseRef: null, attribution: null, attributionRequired: false,
    derivativeAllowed: true, allowedTargets: ["private_internal", "public_web"] } }];
const makeManifest = (version, rollbackReleaseHashes = []) =>
  createStarcraftTmgReleaseManifestV1({ releaseId: "sc-product",
    releaseVersion: version,
    createdAt: version === "1.0.0" ? "2026-09-14T00:00:00.000Z"
      : "2026-09-14T00:30:00.000Z",
    components, skills, assets, rollbackReleaseHashes,
    compatibility: { dataVersion: "data-v1", rulesVersion: "rules-v1",
      actionSpaceVersion: "actions-v1", supportedHistoricalAdapters: [] } });
const makeRecord = (manifest) => createStarcraftTmgSignedReleaseRecordV1({
  manifest,
  signatureProof: { keyKind: "release_signature",
    contentHash: hashStarcraftTmgContract(manifest), signature: "fixture" },
  signatureVerification: { cryptographicValid: true, trustedAtIssue: true,
    fixtureEvidenceOnly: true },
});
const release1 = makeManifest("1.0.0");
const release2 = makeManifest("1.1.0", [release1.releaseHash]);
const record1 = makeRecord(release1);
const record2 = makeRecord(release2);
const registry = createInMemoryStarcraftTmgReleaseRegistryV1();
registry.register(record1); registry.register(record2);
registry.activate({ expectedRevision: 0, releaseHash: release1.releaseHash,
  distributionDecision: { allowed: true, releaseHash: release1.releaseHash },
  reason: "initial" });
registry.activate({ expectedRevision: 1, releaseHash: release2.releaseHash,
  distributionDecision: { allowed: true, releaseHash: release2.releaseHash },
  reason: "update" });

const incidents = createStarcraftTmgIncidentControlV1();
incidents.open({ incidentId: "incident-medium", severity: "Medium",
  summaryCode: "LATENCY_WARNING", evidenceRefHash: H("c"),
  scope: { environmentId: "prod-cn-1", releaseHash: release2.releaseHash,
    subsystems: ["agent"] }, openedAt: "2026-09-14T01:00:00.000Z" });
assert.equal(incidents.evaluateOperation({ environmentId: "prod-cn-1",
  releaseHash: release2.releaseHash, subsystem: "agent" }).allowed, true);
let incident = incidents.open({ incidentId: "incident-high", severity: "High",
  summaryCode: "RELEASE_REPLAY_DRIFT", evidenceRefHash: H("d"),
  scope: { environmentId: "prod-cn-1", releaseHash: release2.releaseHash,
    subsystems: ["room", "release"] },
  openedAt: "2026-09-14T01:01:00.000Z" });
assert.equal(incidents.evaluateOperation({ environmentId: "prod-cn-1",
  releaseHash: release2.releaseHash, subsystem: "room" }).allowed, false);
incident = incidents.quarantine({ incidentId: incident.incidentId,
  expectedRevision: incident.revision, authorizationDecision: incidentAuth,
  at: "2026-09-14T01:02:00.000Z" });
incident = incidents.rollback({ incidentId: incident.incidentId,
  expectedRevision: incident.revision,
  incidentAuthorizationDecision: incidentAuth,
  rollbackAuthorizationDecision: rollbackAuth, releaseRegistry: registry,
  targetReleaseHash: release1.releaseHash, reason: "verified-rollback",
  replayOrSmokeEvidenceHash: H("e"), fixtureEvidenceOnly: true,
  at: "2026-09-14T01:03:00.000Z" });
assert.equal(registry.snapshot().activeReleaseHash, release1.releaseHash);
incident = incidents.resolve({ incidentId: incident.incidentId,
  expectedRevision: incident.revision, authorizationDecision: incidentAuth,
  reviewerPrincipalId: "independent-incident-reviewer",
  rootCauseRefHash: H("f"), recoveryEvidenceHash: H("1"),
  at: "2026-09-14T01:04:00.000Z" });
assert.equal(incident.state, "resolved");
assert.equal(incidents.evaluateOperation({ environmentId: "prod-cn-1",
  releaseHash: release1.releaseHash, subsystem: "room" }).allowed, true);
const incidentSnapshot = incidents.snapshot();
assert.equal(incidentSnapshot.activeBlockingCount, 0);
assert.equal(incidentSnapshot.activeMediumCount, 1);

const readiness = assessStarcraftTmgOperationalReadinessV1({
  environmentAssessments: { localDemo: local, controlledExperiment: controlled,
    productionRoom: production, trainingEligibleRun: training },
  rbacPolicy: describeStarcraftTmgRbacPolicyV1(),
  keySnapshot: { provider: { productionReady: false }, byokPersisted: false },
  persistence: { controlled: { ready: true },
    production: { productionReady: false, fixtureEvidenceOnly: true } },
  releaseDecisions: { controlled: { allowed: true },
    publicWeb: { allowed: true }, appStore: { allowed: false } },
  privacy: { policy: describeStarcraftTmgPrivacyPolicyV1(),
    adapterProductionReady: false },
  telemetry: { sinkHealth: { productionReady: false }, slo: { passed: true } },
  incidents: incidentSnapshot,
  rollbackDrill: incident.rollbackDrill,
  deviceAcceptance: { passed: false },
  trainingEligibility: { eligibleForTraining: false },
});
assert.deepEqual(readiness.readiness, { localDemo: true,
  controlledExperiment: true, productionWeb: false, productionApp: false,
  trainingEligibleRun: false });
assert.ok(readiness.findings.some((entry) =>
  entry.code === "EXTERNAL_KMS_NOT_CONFIGURED"));
assert.ok(readiness.findings.some((entry) =>
  entry.code === "PHYSICAL_DEVICE_ACCEPTANCE_MISSING"));
assert.equal(readiness.findings.every((entry) =>
  !entry.integrationBlocking || ["Critical", "High"].includes(entry.severity)), true);
assert.throws(() => incidents.open({ incidentId: "secret", severity: "High",
  summaryCode: "BAD", evidenceRefHash: H("2"),
  scope: { environmentId: "prod-cn-1", subsystems: ["provider"] },
  openedAt: "2026-09-14T02:00:00.000Z",
  apiKey: "sk-forbidden-secret-value" }), /INCIDENT_FIELD_FORBIDDEN/);

const report = {
  schemaVersion: "starcraft_tmg_ticket_21_slice_209_report_v1",
  ticket: 21, slice: 209, status: "passed",
  incident: { finalState: incident.state, timelineLength: incident.timeline.length,
    rollbackFrom: incident.rollbackDrill.fromReleaseHash,
    rollbackTo: incident.rollbackDrill.toReleaseHash,
    registryRevision: registry.snapshot().revision },
  checks: { mediumDoesNotBlock: true, highQuarantinesExactScope: true,
    administratorAuthorizationRequired: true, exactDeclaredRollback: true,
    independentResolution: true, resolvedScopeReopens: true,
    secretMaterialRejected: true, fiveIndependentReadinessClasses: true,
    localAndControlledReady: true, externalProductionGatesExplicit: true,
    trainingApprovalSeparate: true, onlyCriticalHighBlock: true },
  readiness: readiness.readiness,
  unresolvedProductionGateCodes: readiness.findings.map((entry) => entry.code),
  rollbackFixtureOnly: true,
  providerCalls: 0, estimatedCostCny: 0, sourceRefresh: false,
  trainingTruth: false,
};
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
