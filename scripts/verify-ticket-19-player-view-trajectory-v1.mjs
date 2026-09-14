import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgPlayerViewTrajectoryCompilerV1 } from
  "../packages/training-data/player-view-trajectory-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root,
  "build/ticket-19-slice-196-player-view-trajectory-v1");

const fixture = await createTicket20AgentAgentDemoFixtureV1({
  root,
  roomId: "ticket19-s196-player-view-trajectory",
  autoDriveIntervalMs: 1,
});
await fixture.orchestrator.start();
const played = await fixture.orchestrator.run({ maxAdditionalActions: 4 });
assert.equal(played.status, "paused");
assert.equal(played.appliedActionCount, 4);

const compiler = createStarcraftTmgPlayerViewTrajectoryCompilerV1({
  authorityEngine: fixture.authorityEngine,
  roomStore: fixture.roomRuntime.roomStore,
});
const trajectory = await compiler.compile({
  roomId: fixture.roomId,
  episodeId: "ticket19-s196-episode-001",
  splitIdentity: {
    runFamilyId: "ticket19-s196-hold-position",
    seedFamilyId: "ticket20-fixed-seed-family",
    mirrorFamilyId: "ticket20-unmirrored-family",
    rosterVariantFamilyId: "marine-zergling-family",
    opponentSnapshotFamilyId: "ticket18-foundational-skill-family",
  },
  decisionBindings: played.trajectory,
});
const verification = compiler.verify(trajectory);

assert.equal(verification.stepCount, 4);
assert.equal(verification.deterministicReplayMatchesCurrent, true);
assert.equal(verification.contentHashUsedAsCompatibilityGate, false);
assert.deepEqual([...new Set(trajectory.steps.map((step) => step.toPlay))],
  ["player1", "player2"]);
for (const step of trajectory.steps) {
  assert.equal(step.actorInput.seatKey, step.toPlay);
  assert.equal(step.actorInput.legalSpace.sideKey, step.toPlay);
  assert.equal(step.action.appliedAction.sideKey, step.toPlay);
  assert.equal(step.decisionBinding.strategySkillRefs.length, 3);
  assert.deepEqual(Object.keys(step.actorInput.viewerState.cardResources),
    [step.toPlay]);
  assert.equal(step.actorInput.containsFutureOutcome, false);
  assert.equal(step.actorInput.containsOpponentPrivateState, false);
  assert.equal(step.outcome.futureOfActorInput, true);
}

const tampered = structuredClone(trajectory);
tampered.steps[0].actorInput.stateRevision = 99;
assert.throws(() => compiler.verify(tampered), /identity is invalid/);

const report = {
  schemaVersion: "starcraft_tmg_ticket_19_slice_196_report_v1",
  ticket: 19,
  slice: 196,
  status: "passed",
  source: {
    roomId: fixture.roomId,
    acceptedTransitionCount: 4,
    deterministicReplayMatchesCurrent: true,
  },
  trajectory: {
    episodeId: trajectory.episodeId,
    trajectoryHash: trajectory.contentIdentity.hash,
    stepCount: trajectory.steps.length,
    actingSeats: [...new Set(trajectory.steps.map((step) => step.toPlay))],
    playerViewProjection: trajectory.informationPolicy,
    decisionBindingCount: trajectory.steps.filter((step) =>
      step.decisionBinding).length,
  },
  compatibility: compiler.readCompatibility(trajectory),
  checks: {
    preActionObservationRevisionBound: true,
    receiptActionAndOutcomeBound: true,
    ownSeatPrivateProjectionOnly: true,
    contentHashIsIdentityNotCompatibilityGate: true,
    silentUpgradeAllowed: false,
    tamperRejected: true,
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
