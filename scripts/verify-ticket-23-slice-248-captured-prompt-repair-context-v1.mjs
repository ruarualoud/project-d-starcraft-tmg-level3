// Concrete recovery bug: explicit prompt repair cleared C r70's correction
// context before the first new request. No live Room or paid Provider is used.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as live from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { planStarcraftTmgPromptRepairRecoveryV1,
  applyStarcraftTmgPromptRepairRecoveryV1 } from
  "../packages/online-agent-session/live-prompt-repair-recovery-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
assert(capturePath && reportPath);
const original = await readFile(capturePath, "utf8");
const captured = JSON.parse(original)[0].decision;
const choice = structuredClone(captured);
const a = choice.authority;
assert.equal(a.stateRevision, 70);
assert.equal(choice.providerContinuationMessages.length, 6);
const input = {
  scope: { gameId: "starcraft-tmg", roomId: a.roomId,
    matchBindingHash: a.matchBindingHash, seatKey: a.seatKey },
  roomProjection: { room: { roomId: a.roomId, stateRevision: 70,
    stateHash: a.stateHash }, viewer: { seatKey: a.seatKey },
    state: { round: 2, phase: "movement" } },
  spatialObservation: { observationHash: a.spatialObservationHash,
    units: choice.queryReceipts[0].result.nodes.units.map(node => ({
      ...structuredClone(node), unitId: node.nodeId,
    })) },
  // Actual captured domains; only semantic revalidation, not movement proof.
  spatialActionSpace: { authority: a, actionSpaceHash: a.spatialActionSpaceHash,
    finiteActions: choice.actionIndex.filter(entry => entry.kind === "finite")
      .map(entry => ({ candidateId: entry.id, action: entry.action })),
    parameterDomains: choice.actionIndex.filter(entry => entry.kind === "parameterized")
      .map(entry => entry.action) },
  planState: { plan: choice.currentPlan },
};
const options = { retryApproved: true,
  promptPolicyVersion: "starcraft_tmg_planner_action_spatial_intent_solver_v44_json_typed_correction_feedback",
  maxSemanticCorrectionRounds: 3 };
const plan = planStarcraftTmgPromptRepairRecoveryV1(choice, options);
assert(plan);
if (live.applyStarcraftTmgPlanningPromptRepairRecoveryV1) {
  live.applyStarcraftTmgPlanningPromptRepairRecoveryV1(choice, plan, input,
    "2026-10-11T00:00:00.000Z", "json_channels_v1");
} else {
  applyStarcraftTmgPromptRepairRecoveryV1(choice, plan,
    "2026-10-11T00:00:00.000Z");
}
const feedbackMessage = choice.providerContinuationMessages.find(message =>
  message.role === "user" && message.content.includes(
    "starcraft_tmg_semantic_correction_feedback_v1"));
assert(feedbackMessage,
  "the first recovered request must carry rebuilt corrective context, not start blank");
const feedback = JSON.parse(feedbackMessage.content);
assert.equal(feedback.current.code, "PLANNER_SELECTION_THREAT_CLAIM_CONTRADICTS_PROJECTION");
const fact = feedback.current.issues.flatMap(issue => issue.facts || []).find(entry =>
  entry.targetId === "player2-swarmling" && entry.attackerId === "player1-marine-1");
assert(fact);
assert.equal(fact.earliestStationaryAttackHorizon, "current_round");
assert.equal(fact.minimumBaseEdgeDistanceMilliInches, 9469);
assert(feedback.regressionGuards.some(issue =>
  issue.code === "PLANNER_PASS_OPPORTUNITY_COST_NOT_COMPARED"));
assert.equal(feedback.submissionProtocol.requiredChannel, "planning");
assert.equal(feedback.strategyRecommendationProvided, false);
assert.deepEqual(choice.attempts, captured.attempts);
assert.deepEqual(choice.queryReceipts, captured.queryReceipts);
assert.equal(choice.semanticCorrectionRounds, 0);
assert.equal(choice.promptRepairHistory.length, 1);
assert.equal(choice.promptRepairHistory[0].priorSemanticCorrectionRounds, 3);
assert.equal(choice.promptRepairHistory[0].previousContinuationMessageCount, 6);
assert.equal(planStarcraftTmgPromptRepairRecoveryV1(choice, options), null);
assert.equal(await readFile(capturePath, "utf8"), original);
const report = { passed: true, originalRevision: 70,
  correctiveContextRebuiltFromOriginalRepliesAndCurrentFacts: true,
  previousPaidAttemptsAndQueriesUnchanged: true, oneAdditionalCycleOnly: true,
  previousThreeCorrectionsArchived: true, newProviderCalls: 0, roomWrites: 0,
  trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
