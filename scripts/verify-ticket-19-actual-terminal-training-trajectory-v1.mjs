import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgPlayerViewTrajectoryCompilerV1 } from
  "../packages/training-data/player-view-trajectory-v1.mjs";
import { createStarcraftTmgTrainingExportRuntimeV1 } from
  "../packages/training-data/training-export-v1.mjs";
import { createStarcraftTmgTrainingGovernanceV1 } from
  "../packages/training-data/training-governance-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root,
  "build/ticket-19-slice-201-actual-terminal-trajectory-v1");
let clockTick = 0;
const clockOrigin = Date.parse("2026-09-14T12:00:00.000Z");
const now = () => new Date(clockOrigin + (clockTick++ * 1000)).toISOString();

const fixture = await createTicket20AgentAgentDemoFixtureV1({
  root,
  roomId: "ticket19-s201-actual-terminal-room",
  occurredAt: "2026-09-14T12:00:00.000Z",
  maxAppliedActions: 160,
  autoDriveIntervalMs: 1,
  now,
});
const started = await fixture.orchestrator.start();
assert.equal(started.status, "running");
const checkpoint = await fixture.orchestrator.run({
  pauseAfterAppliedActions: 8,
});
assert.equal(checkpoint.status, "paused");
assert.equal(checkpoint.appliedActionCount, 8);
const recovery = await fixture.orchestrator.recoverSeat({
  seatKey: "player2",
});
assert.equal(recovery.sameRoom, true);
assert.equal(recovery.sameMatchBinding, true);
const completed = await fixture.orchestrator.resume({
  maxAdditionalActions: 152,
});
assert.equal(completed.status, "completed");
assert.equal(completed.state.terminal, true);
assert.equal(completed.replayMatchesCurrent, true);
assert.equal(completed.failureAccounting.blocking, 0);

const compiler = createStarcraftTmgPlayerViewTrajectoryCompilerV1({
  authorityEngine: fixture.authorityEngine,
  roomStore: fixture.roomRuntime.roomStore,
});
const versionedStrategySkillRefsBySeat = Object.fromEntries(
  Object.entries(completed.experimentCell.seats).map(([seatKey, seat]) => [
    seatKey,
    seat.skillRefs,
  ]),
);
const trajectory = await compiler.compile({
  roomId: fixture.roomId,
  episodeId: "ticket19-s201-actual-terminal-episode",
  splitIdentity: {
    runFamilyId: "ticket19-ticket20-bounded-terminal-family",
    seedFamilyId: "ticket19-ticket20-fixed-clock-rng-family",
    mirrorFamilyId: "ticket20-hold-position-unmirrored-family",
    rosterVariantFamilyId: "bounded-marine-vs-zergling-family",
    opponentSnapshotFamilyId: "ticket18-foundational-five-skill-family",
  },
  decisionBindings: completed.trajectory,
  versionedStrategySkillRefsBySeat,
  experimentCell: completed.experimentCell,
});
assert.equal(trajectory.steps.length, completed.appliedActionCount);
assert.equal(trajectory.sourceLineage.finalStateRevision,
  completed.state.stateRevision);
assert.equal(trajectory.sourceLineage.finalStateHash,
  completed.state.stateHash);
assert.equal(trajectory.terminal.terminal, true);
assert.equal(trajectory.steps.every((step) =>
  step.decisionBinding?.strategySkillRefs.length === 3), true);
assert.equal(trajectory.steps.every((step) =>
  step.decisionBinding.strategySkillRefs.every((ref) =>
    typeof ref.version === "string" && ref.version.length > 0)), true);

const governance = createStarcraftTmgTrainingGovernanceV1({
  trajectoryVerifier: compiler.verify,
});
const leakAudit = governance.auditTrajectory(trajectory);
assert.equal(leakAudit.passed, true, JSON.stringify(leakAudit.findings));
const eligibility = governance.assessEligibility({
  trajectory,
  audit: leakAudit,
});
assert.equal(eligibility.technicalEligibilityChecksPassed, true);
assert.equal(eligibility.eligibleForTraining, false);
assert.deepEqual(eligibility.reasons,
  ["independent_training_approval_missing"]);
const splitManifest = governance.createDatasetSplitManifest({
  manifestId: "ticket19-s201-development-candidate-split-v1",
  assignments: [{
    trajectoryHash: trajectory.contentIdentity.hash,
    partition: "train",
    splitIdentity: trajectory.splitIdentity,
  }],
});

const exportRuntime = createStarcraftTmgTrainingExportRuntimeV1({
  trajectoryVerifier: compiler.verify,
});
const ndjson = exportRuntime.exportNdjson(trajectory);
const muzero = exportRuntime.exportMuzero(trajectory);
const rlds = exportRuntime.exportRlds(trajectory);
const roundTrips = {
  ndjson: exportRuntime.verifyRoundTrip(trajectory,
    exportRuntime.importNdjson(ndjson)),
  muzero: exportRuntime.verifyRoundTrip(trajectory,
    exportRuntime.importMuzero(muzero)),
  rlds: exportRuntime.verifyRoundTrip(trajectory,
    exportRuntime.importRlds(rlds)),
};
const parquet = exportRuntime.parquetCapability();

const sensitiveProjection = [
  JSON.stringify(trajectory),
  ndjson,
  JSON.stringify(muzero),
  JSON.stringify(rlds),
].join("\n");
assert.equal(sensitiveProjection.includes(
  fixture.createdRoom.credentials.human.seatToken), false);
assert.equal(sensitiveProjection.includes(
  fixture.createdRoom.credentials.bot.seatToken), false);
assert.doesNotMatch(sensitiveProjection,
  /"(?:seatToken|apiKey|api_key|authorization|credential)"\s*:/i);

const actionsBySeat = Object.fromEntries(["player1", "player2"].map(
  (seatKey) => [seatKey, trajectory.steps.filter((step) =>
    step.toPlay === seatKey).length],
));
const actionKinds = Object.fromEntries(["finite", "parameterized"].map(
  (kind) => [kind, trajectory.steps.filter((step) =>
    step.actionEncoding.kind === kind).length],
));
const chanceStepCount = trajectory.steps.filter((step) =>
  step.targets.chance.used).length;
const nonZeroRewardStepCount = trajectory.steps.filter((step) =>
  step.targets.scalarReward !== 0).length;
const repeatedSeatDecisionCount = trajectory.steps.filter((step) =>
  step.recurrentState.previousOwnDecisionStepHash).length;

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "trajectory.json"),
  `${JSON.stringify(trajectory)}\n`, "utf8");
await writeFile(path.join(outputDir, "trajectory.ndjson"), ndjson, "utf8");
await writeFile(path.join(outputDir, "trajectory.muzero.json"),
  `${JSON.stringify(muzero)}\n`, "utf8");
await writeFile(path.join(outputDir, "trajectory.rlds.json"),
  `${JSON.stringify(rlds)}\n`, "utf8");
await writeFile(path.join(outputDir, "leak-audit.json"),
  `${JSON.stringify(leakAudit, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "eligibility.json"),
  `${JSON.stringify(eligibility, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "split-manifest.json"),
  `${JSON.stringify(splitManifest, null, 2)}\n`, "utf8");

const report = {
  schemaVersion: "starcraft_tmg_ticket_19_slice_201_report_v1",
  ticket: 19,
  slice: 201,
  status: "passed",
  sourceMatch: {
    experimentId: completed.experimentCell.experimentId,
    cellId: completed.experimentCell.cellId,
    terminal: completed.state.terminal,
    winnerSeat: trajectory.terminal.winnerSeat,
    finalScores: trajectory.terminal.scores,
    appliedActionCount: completed.appliedActionCount,
    actionsBySeat,
    pauseAtAction: checkpoint.appliedActionCount,
    recoveredSeat: recovery.seatKey,
    replayMatchesCurrent: completed.replayMatchesCurrent,
    blockingFindings: completed.failureAccounting.blocking,
  },
  trajectory: {
    episodeId: trajectory.episodeId,
    trajectoryHash: trajectory.contentIdentity.hash,
    stepCount: trajectory.steps.length,
    actionKinds,
    chanceStepCount,
    nonZeroRewardStepCount,
    repeatedSeatDecisionCount,
    exactVersionedSkillRefsPerStep: 3,
    versions: trajectory.versions,
  },
  governance: {
    leakAudit,
    eligibility,
    splitManifestHash: splitManifest.contentIdentity.hash,
    automaticPromotion: false,
  },
  exports: {
    roundTrips,
    bytes: {
      trajectoryJson: Buffer.byteLength(JSON.stringify(trajectory)),
      ndjson: Buffer.byteLength(ndjson),
      muzero: Buffer.byteLength(JSON.stringify(muzero)),
      rlds: Buffer.byteLength(JSON.stringify(rlds)),
    },
    parquet,
    fakeParquetFallbackExists: false,
  },
  limits: {
    boundedDevelopmentRoster: true,
    strategyStrengthProven: false,
    learnerTrained: false,
    independentTrainingApprovalPresent: false,
  },
  modelUsage: completed.modelUsage,
  sourceRefresh: false,
  eligibleForTraining: false,
  trainingTruth: false,
};
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
