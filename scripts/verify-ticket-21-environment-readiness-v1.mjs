import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessStarcraftTmgEnvironmentReadinessV1,
  authorizeStarcraftTmgEnvironmentCapabilityV1,
  describeStarcraftTmgEnvironmentClassV1,
  STARCRAFT_TMG_ENVIRONMENT_CLASSES,
} from "../packages/platform-operations/environment-readiness-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root,
  "build/ticket-21-slice-202-environment-readiness-v1");

assert.deepEqual(STARCRAFT_TMG_ENVIRONMENT_CLASSES, [
  "local_demo", "controlled_experiment", "production_room",
  "training_eligible_run",
]);
const descriptions = STARCRAFT_TMG_ENVIRONMENT_CLASSES.map(
  describeStarcraftTmgEnvironmentClassV1);
assert.deepEqual(descriptions.map((entry) => entry.level), [0, 1, 2, 3]);

const local = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "developer-laptop",
  environmentClass: "local_demo",
  evidence: { environmentClass: "local_demo" },
});
assert.equal(local.ready, true);
assert.equal(authorizeStarcraftTmgEnvironmentCapabilityV1({
  assessment: local,
  capability: "production_multiplayer_room",
}).allowed, false);

const controlled = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "bounded-experiment-01",
  environmentClass: "controlled_experiment",
  evidence: {
    environmentClass: "controlled_experiment",
    scopedIdentity: true,
    isolatedProviderEgress: true,
    persistentAttemptAccounting: true,
    budgetPolicy: true,
    auditJournal: true,
    controlledRulesDataBinding: true,
  },
});
assert.equal(controlled.ready, true);
assert.equal(authorizeStarcraftTmgEnvironmentCapabilityV1({
  assessment: controlled,
  capability: "training_export_ineligible",
}).allowed, true);
assert.equal(authorizeStarcraftTmgEnvironmentCapabilityV1({
  assessment: controlled,
  capability: "approved_training_dataset_entry",
}).allowed, false);

const missingProduction = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "production-candidate",
  environmentClass: "production_room",
  evidence: { environmentClass: "production_room", immutableRelease: true },
});
assert.equal(missingProduction.ready, false);
assert.equal(missingProduction.productionRoomReady, false);
assert.equal(missingProduction.counts.high, 8);

const training = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "approved-training-run-01",
  environmentClass: "training_eligible_run",
  evidence: {
    environmentClass: "training_eligible_run",
    scopedIdentity: true,
    externalKeyManagement: true,
    durableQueue: true,
    immutableRelease: true,
    viewerLeakAuditPassed: true,
    technicalTrajectoryEligibility: true,
    groupedSplitManifest: true,
    independentTrainingApproval: true,
  },
});
assert.equal(training.ready, true);
assert.equal(training.trainingEligible, true);
assert.equal(training.productionRoomReady, false);
assert.throws(() => assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "secret-leak",
  environmentClass: "local_demo",
  evidence: { apiKey: "sk-this-must-never-be-stored" },
}), /SECRET_FIELD_FORBIDDEN/);

const tampered = structuredClone(training);
tampered.capabilities.push("production_multiplayer_room");
assert.throws(() => authorizeStarcraftTmgEnvironmentCapabilityV1({
  assessment: tampered,
  capability: "production_multiplayer_room",
}), /TAMPERED/);

const report = {
  schemaVersion: "starcraft_tmg_ticket_21_slice_202_report_v1",
  ticket: 21,
  slice: 202,
  status: "passed",
  environmentClasses: descriptions.map((entry) => ({
    environmentClass: entry.environmentClass,
    level: entry.level,
    capabilityCount: entry.capabilities.length,
    requirementCount: entry.requiredEvidence.length,
  })),
  checks: {
    lowerClassCannotEscalate: true,
    missingProductionEvidenceFailsClosed: true,
    trainingAndProductionRoomAreDistinct: true,
    secretsRejected: true,
    tamperRejected: true,
    onlyCriticalHighBlock: true,
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
