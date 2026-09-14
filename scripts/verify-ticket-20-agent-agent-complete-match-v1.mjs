import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(root,
  "build/ticket-20-agent-agent-complete-match-v1");

let clockTick = 0;
const clockOrigin = Date.parse("2026-09-14T10:00:00.000Z");
const now = () => new Date(clockOrigin + (clockTick++ * 1000)).toISOString();

const fixture = await createTicket20AgentAgentDemoFixtureV1({
  root,
  roomId: "ticket20-agent-agent-complete-match",
  occurredAt: "2026-09-14T10:00:00.000Z",
  maxAppliedActions: 160,
  now,
});

const started = await fixture.orchestrator.start();
assert.equal(started.status, "running");
assert.equal(started.experimentCell.mode, "agent_vs_agent");
assert.equal(started.experimentCell.denominator.total, 1);
assert.equal(started.experimentCell.automaticPromotion, false);
assert.equal(started.credentialMaterialProjected, false);

const checkpoint = await fixture.orchestrator.run({
  pauseAfterAppliedActions: 8,
});
assert.equal(checkpoint.status, "paused");
assert.equal(checkpoint.appliedActionCount, 8);
assert.equal(checkpoint.state.terminal, false);
assert.equal(checkpoint.pauseReceipts.length, 1);
assert.equal(checkpoint.pauseReceipts[0].atomicBoundary, true);
assert.equal(checkpoint.pauseReceipts[0].reason,
  "requested_atomic_action_checkpoint");
assert.ok(checkpoint.trajectory.some((entry) => entry.seatKey === "player1"));
assert.ok(checkpoint.trajectory.some((entry) => entry.seatKey === "player2"));

const recovery = await fixture.orchestrator.recoverSeat({ seatKey: "player2" });
assert.equal(recovery.sameRoom, true);
assert.equal(recovery.sameMatchBinding, true);
assert.equal(recovery.credentialMaterialProjected, false);
assert.equal(recovery.recoveredConnectionEpoch,
  recovery.previousConnectionEpoch + 1);

const completed = await fixture.orchestrator.resume({
  maxAdditionalActions: 152,
});
assert.equal(completed.status, "completed");
assert.equal(completed.state.terminal, true);
assert.equal(completed.replayMatchesCurrent, true);
assert.equal(completed.denominator.planned, 1);
assert.equal(completed.denominator.completed, 1);
assert.equal(completed.denominator.failed, 0);
assert.equal(completed.denominator.remaining, 0);
assert.equal(completed.failureAccounting.blocking, 0);
assert.equal(completed.automaticPromotion, false);
assert.equal(completed.eligibleForTraining, false);
assert.equal(completed.trainingTruth, false);
assert.equal(completed.modelUsage.providerCalls, 0);
assert.equal(completed.modelUsage.estimatedCostCny, 0);
assert.equal(completed.recoveryReceipts.length, 1);
assert.equal(completed.resumeCount, 1);

assert.ok(completed.appliedActionCount > 8);
assert.equal(completed.seats.player1.actionCount
  + completed.seats.player2.actionCount, completed.appliedActionCount);
assert.equal(completed.seats.player1.actionCount,
  completed.seats.player1.replayVerifiedCount);
assert.equal(completed.seats.player2.actionCount,
  completed.seats.player2.replayVerifiedCount);
assert.equal(completed.experimentCell.seats.player1.skillRefs.length, 3);
assert.equal(completed.experimentCell.seats.player2.skillRefs.length, 3);
assert.ok(completed.experimentCell.seats.player1.skillRefs.some((entry) =>
  entry.id === "starcraft-tmg.matchup.terran_armed_forces-to-zerg_swarm"));
assert.ok(completed.experimentCell.seats.player2.skillRefs.some((entry) =>
  entry.id === "starcraft-tmg.matchup.zerg_swarm-to-terran_armed_forces"));

for (const trace of completed.trajectory) {
  assert.equal(trace.mode, "agent_vs_agent");
  assert.equal(trace.promptPack, "selfplay_agent_prompt");
  assert.equal(trace.replayMatchesCurrent, true);
  assert.equal(trace.modelConfirmCalls, 0);
  assert.equal(trace.modelApplyCalls, 0);
  assert.equal(trace.hostApplyCalls, 1);
  assert.ok(trace.spatialObservationHash);
  assert.ok(trace.spatialActionSpaceHash);
  assert.ok(trace.continuityContextHash);
  assert.ok(trace.turnPlanHash);
  assert.ok(trace.actionIntentHash);
  assert.equal(trace.strategySkillRefs.length, 3);
}

const serialized = JSON.stringify(completed);
assert.equal(serialized.includes(
  fixture.createdRoom.credentials.human.seatToken), false);
assert.equal(serialized.includes(
  fixture.createdRoom.credentials.bot.seatToken), false);
assert.doesNotMatch(serialized, /"(?:seatToken|apiKey|authorization|secret)"/i);

const report = {
  schemaVersion: "ticket20_agent_agent_complete_match_verification_v1",
  ok: true,
  ticket: 20,
  slice: 193,
  acceptance: {
    finiteDenominator: `${completed.denominator.completed}/${completed.denominator.planned}`,
    terminalWithoutConcession: completed.state.terminal,
    appliedActions: completed.appliedActionCount,
    actionsBySeat: {
      player1: completed.seats.player1.actionCount,
      player2: completed.seats.player2.actionCount,
    },
    pauseResumeRecovery: true,
    exactReplayPerAction: true,
    finalReplayMatchesCurrent: completed.replayMatchesCurrent,
    currentOfficialBindings: cloneForReport(completed.experimentCell.versions),
    scenarioRosterRngBudgetBound: true,
    directionalSkillRouting: {
      player1: completed.experimentCell.seats.player1.skillRefs.map((entry) =>
        entry.id),
      player2: completed.experimentCell.seats.player2.skillRefs.map((entry) =>
        entry.id),
    },
    spatialMemoryPlanEvidencePerAction: true,
    viewerSafeTrajectory: completed.viewerSafe,
    blockingFindings: completed.failureAccounting.blocking,
    automaticPromotion: completed.automaticPromotion,
    trainingTruth: completed.trainingTruth,
  },
  limits: {
    providerEvidence: "deterministic_skill_guided_development",
    strategyStrengthProven: false,
    arbitraryArmyBuilderMatchProven: false,
    productionEligibility: false,
  },
  modelUsage: completed.modelUsage,
  result: completed,
};

function cloneForReport(value) {
  return JSON.parse(JSON.stringify(value));
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  ok: report.ok,
  status: completed.status,
  denominator: report.acceptance.finiteDenominator,
  appliedActions: report.acceptance.appliedActions,
  actionsBySeat: report.acceptance.actionsBySeat,
  pauseResumeRecovery: report.acceptance.pauseResumeRecovery,
  finalReplayMatchesCurrent: report.acceptance.finalReplayMatchesCurrent,
  directionalSkillRouting: report.acceptance.directionalSkillRouting,
  viewerSafeTrajectory: report.acceptance.viewerSafeTrajectory,
  blockingFindings: report.acceptance.blockingFindings,
  automaticPromotion: report.acceptance.automaticPromotion,
  modelUsage: report.modelUsage,
  reportPath: path.relative(root, path.join(outputDirectory, "report.json")),
}, null, 2));
