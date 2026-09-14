import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgPlayerViewTrajectoryCompilerV1 } from
  "../packages/training-data/player-view-trajectory-v1.mjs";
import { createStarcraftTmgTrainingGovernanceV1 } from
  "../packages/training-data/training-governance-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root,
  "build/ticket-19-slice-199-training-governance-v1");

const fixture = await createTicket20AgentAgentDemoFixtureV1({
  root,
  roomId: "ticket19-s199-governance-room",
  autoDriveIntervalMs: 1,
});
await fixture.orchestrator.start();
const played = await fixture.orchestrator.run();
assert.equal(played.status, "completed");
assert.equal(played.state.terminal, true);
assert.equal(played.appliedActionCount, played.state.stateRevision);

const compiler = createStarcraftTmgPlayerViewTrajectoryCompilerV1({
  authorityEngine: fixture.authorityEngine,
  roomStore: fixture.roomRuntime.roomStore,
});
const trajectory = await compiler.compile({
  roomId: fixture.roomId,
  episodeId: "ticket19-s199-terminal-episode",
  splitIdentity: {
    runFamilyId: "ticket19-s199-hold-position-family",
    seedFamilyId: "ticket20-fixed-seed-family",
    mirrorFamilyId: "ticket20-unmirrored-family",
    rosterVariantFamilyId: "marine-zergling-family",
    opponentSnapshotFamilyId: "ticket18-foundational-skill-family",
  },
  decisionBindings: played.trajectory,
});
const governance = createStarcraftTmgTrainingGovernanceV1({
  trajectoryVerifier: compiler.verify,
});
const audit = governance.auditTrajectory(trajectory);
assert.equal(audit.passed, true, JSON.stringify(audit.findings));
assert.equal(audit.counts.blocking, 0);
const eligibility = governance.assessEligibility({ trajectory, audit });
assert.equal(eligibility.technicalEligibilityChecksPassed, true);
assert.equal(eligibility.independentTrainingApprovalPresent, false);
assert.equal(eligibility.eligibleForTraining, false);
assert.deepEqual(eligibility.reasons,
  ["independent_training_approval_missing"]);

const leaked = structuredClone(trajectory);
leaked.steps[0].actorInput.opponentPrivateState = { hiddenPlan: "rush" };
leaked.steps[0].actorInput.futureOutcome = { winner: "player1" };
leaked.steps[0].actorInput.note = "sk-testOnlyCredential123456789";
const leakAudit = governance.auditTrajectory(leaked);
assert.equal(leakAudit.passed, false);
assert.ok(leakAudit.findings.some((entry) =>
  entry.code === "OPPONENT_PRIVATE_FIELD_LEAK"));
assert.ok(leakAudit.findings.some((entry) =>
  entry.code === "FUTURE_TARGET_FIELD_LEAK"));
assert.ok(leakAudit.findings.some((entry) =>
  entry.code === "API_KEY_VALUE_LEAK"));
assert.ok(leakAudit.findings.filter((entry) =>
  ["Critical", "High"].includes(entry.severity))
  .every((entry) => entry.integrationBlocking));

const otherSplit = {
  runFamilyId: "ticket19-other-family",
  seedFamilyId: "ticket19-other-seed",
  mirrorFamilyId: "ticket19-other-mirror",
  rosterVariantFamilyId: "ticket19-other-roster",
  opponentSnapshotFamilyId: "ticket19-other-opponent",
};
const splitManifest = governance.createDatasetSplitManifest({
  manifestId: "ticket19-s199-split-manifest",
  assignments: [{
    trajectoryHash: trajectory.contentIdentity.hash,
    partition: "train",
    splitIdentity: trajectory.splitIdentity,
  }, {
    trajectoryHash: "f".repeat(64),
    partition: "validation",
    splitIdentity: otherSplit,
  }],
});
assert.equal(splitManifest.crossPartitionLeakCount, 0);
assert.throws(() => governance.createDatasetSplitManifest({
  manifestId: "ticket19-s199-leaking-manifest",
  assignments: [{
    trajectoryHash: trajectory.contentIdentity.hash,
    partition: "train",
    splitIdentity: trajectory.splitIdentity,
  }, {
    trajectoryHash: "e".repeat(64),
    partition: "test",
    splitIdentity: { ...otherSplit,
      seedFamilyId: trajectory.splitIdentity.seedFamilyId },
  }],
}), /seedFamilyId .* leaks across dataset partitions/);

const reanalysis = governance.createReanalysisRequest({
  requestId: "ticket19-s199-reanalysis-001",
  trajectory,
  learnerVersion: "future-learner-v1",
  targetFields: ["value", "policy"],
});
assert.deepEqual(reanalysis.targetFields, ["policy", "value"]);
assert.equal(reanalysis.sourceObservationActionRulesChanceImmutable, true);
assert.throws(() => governance.createReanalysisRequest({
  requestId: "ticket19-s199-illegal-reanalysis",
  trajectory,
  learnerVersion: "future-learner-v1",
  targetFields: ["action"],
}), /only policy and value/);

const report = {
  schemaVersion: "starcraft_tmg_ticket_19_slice_199_report_v1",
  ticket: 19,
  slice: 199,
  status: "passed",
  source: {
    trajectoryHash: trajectory.contentIdentity.hash,
    terminal: trajectory.terminal.terminal,
    stepCount: trajectory.steps.length,
    seats: [...new Set(trajectory.steps.map((step) => step.toPlay))],
  },
  leakAudit: {
    validBlockingFindings: audit.counts.blocking,
    deliberateLeakCodes: [...new Set(leakAudit.findings.map((entry) =>
      entry.code))].sort(),
    onlyCriticalHighBlockIntegration: true,
  },
  eligibility,
  groupedSplit: {
    manifestHash: splitManifest.contentIdentity.hash,
    axes: splitManifest.leakageAxes,
    assignmentCount: splitManifest.assignments.length,
    crossPartitionLeakRejected: true,
  },
  reanalysis: {
    requestHash: reanalysis.contentIdentity.hash,
    targetFields: reanalysis.targetFields,
    historicalObservationActionRulesChanceImmutable: true,
  },
  providerCalls: 0,
  estimatedCostCny: 0,
  sourceRefresh: false,
  eligibleForTraining: false,
  trainingTruth: false,
};
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
