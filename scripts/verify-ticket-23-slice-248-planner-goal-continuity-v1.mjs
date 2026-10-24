// Concrete B71 bug: a current Deploy goal and a stale choose-first assessment
// reach TurnPlan as different sources. Never mutate the captured paid return.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as live from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createStarcraftTmgTurnPlanRuntimeV1 } from
  "../packages/online-agent-session/turn-plan-runtime-v1.mjs";

const [fixturePath, reportPath] = process.argv.slice(2);
assert(fixturePath && reportPath);
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const captured = JSON.stringify(fixture);
const { choice, raw } = fixture;
assert.equal(choice.authority.stateRevision, 71);
assert.equal(raw.assessment.verdict, "continue");
assert.notEqual(raw.plan.currentGoal, raw.assessment.currentGoal);
const a = choice.authority;
const scope = { gameId: "starcraft-tmg", roomId: a.roomId,
  matchBindingHash: a.matchBindingHash, seatKey: a.seatKey };
// The public planning-to-TurnPlan seam does not execute Rules. Its immutable
// identity and phase are from the actual captured choice, not a replayed room.
const input = {
  scope,
  roomProjection: {
    room: { roomId: a.roomId, stateRevision: a.stateRevision,
      stateHash: a.stateHash },
    matchBinding: { bindingHash: a.matchBindingHash },
    viewer: { seatKey: a.seatKey },
    state: { round: choice.currentPlan.lastValidatedAuthority.round,
      phase: choice.currentPlan.lastValidatedAuthority.phase,
      activeSideKey: a.seatKey, firstPlayerSideKey: a.seatKey },
  },
  legalSpace: { roomId: a.roomId, matchBindingHash: a.matchBindingHash,
    stateRevision: a.stateRevision, stateHash: a.stateHash,
    legalSpaceHash: a.legalSpaceHash },
  spatialObservation: { observationHash: a.spatialObservationHash },
  spatialActionSpace: { authority: a,
    actionSpaceHash: a.spatialActionSpaceHash },
  planState: { plan: choice.currentPlan },
};

// This explicitly declared new protocol is a contract fixture, NOT a claim
// that the historical model supplied it. Even an extra deprecated field must
// not become a second goal source. The exact model-authored goal is preserved.
const singleSource = { ...structuredClone(raw),
  currentGoalSource: "plan.currentGoal" };
const mapped = live.projectStarcraftTmgSubmittedPlanningV1(singleSource, input);
assert.equal(mapped.assessment.currentGoal, raw.plan.currentGoal,
  "declared single current goal must replace the stale assessment alias");
assert.equal(mapped.plannerGoalContract.candidateId, raw.recommendedCandidateId);
assert.equal(mapped.plannerGoalContract.authority.stateRevision, 71);
assert.equal(mapped.plannerGoalContract.ignoredDeprecatedGoal,
  raw.assessment.currentGoal);
assert.equal(mapped.recommendedCandidateId, raw.recommendedCandidateId);
assert.deepEqual(mapped.plan, raw.plan);

const omittedAlias = structuredClone(singleSource);
delete omittedAlias.assessment.currentGoal;
const mappedOmitted = live.projectStarcraftTmgSubmittedPlanningV1(
  omittedAlias, input);
assert.equal(mappedOmitted.assessment.currentGoal, raw.plan.currentGoal);
assert.throws(() => live.projectStarcraftTmgSubmittedPlanningV1({
  ...singleSource, currentGoalSource: "guess_a_goal",
}, input), /PLANNER_CURRENT_GOAL_SOURCE_UNSUPPORTED/);
assert.throws(() => live.projectStarcraftTmgSubmittedPlanningV1({
  ...singleSource, plan: { ...raw.plan, currentGoal: "" },
}, input), /PLANNER_CURRENT_GOAL_REQUIRED/);

// Historical replies are not silently reinterpreted through the new contract.
const legacy = live.projectStarcraftTmgSubmittedPlanningV1(raw, input);
assert.deepEqual(legacy.assessment, raw.assessment);
assert.equal(legacy.plannerGoalContract, undefined);
for (const oldChoice of fixture.otherDeployChoices) {
  const oldRaw = Object.values(oldChoice.attempts).find(attempt =>
    attempt.stage === "planning" && attempt.safeOutput?.recommendedCandidateId
  )?.safeOutput;
  assert.equal(oldRaw.plan.currentGoal, oldRaw.assessment.currentGoal);
  const oldMapped = live.projectStarcraftTmgSubmittedPlanningV1(oldRaw, input);
  assert.deepEqual(oldMapped.assessment, oldRaw.assessment);
}

// Exercise the actual persistence consumer, not just a field-presence check.
const recorded = [];
const runtime = createStarcraftTmgTurnPlanRuntimeV1({
  now: () => "2026-10-09T00:00:00.000Z",
  decisionContinuity: { record: async entry => {
    recorded.push(structuredClone(entry)); return { ok: true };
  } },
});
const planSpec = Object.fromEntries([
  "objective", "currentGoal", "strategicApproach", "successSignals",
  "activationPriorities", "resourcePolicy", "initiativePolicy", "reservePolicy",
  "futureActionPlans", "reviseIf", "assumptions", "opponentModel", "contingencies",
].map(key => [key, choice.currentPlan[key]]));
const opened = await runtime.dispatch({ ...input, command: "open_plan",
  plan: planSpec });
const reflected = await runtime.dispatch({ ...input, command: "reflect_plan",
  assessment: mapped.assessment });
assert.equal(reflected.plan.currentGoal, raw.plan.currentGoal);
assert.equal(reflected.plan.version, opened.plan.version,
  "tactical progress must not fabricate a strategic revision");
assert.deepEqual(reflected.plan.strategicApproach, opened.plan.strategicApproach);
assert.equal(recorded.at(-1).turnPlan.currentGoal, raw.plan.currentGoal);

// Separate the original arrival forecast from actual, viewer-scoped progress.
const currentRoom = fixture.currentAuthorityRoom;
const envelope = currentRoom.aggregate.envelope;
const progress = live.projectStarcraftTmgPlanProgressFactsV1({
  ...input,
  roomProjection: { ...input.roomProjection, state: envelope.state,
    room: { roomId: a.roomId,
      stateRevision: envelope.stateRevision ?? envelope.revision,
      stateHash: envelope.stateHash } },
});
const marine = progress.arrivalRows.find(row => row.unitId === "u-marine-1");
assert.equal(marine.plannedFirstArrivalRound, 3);
assert.equal(marine.observedFirstDeploymentRound, 1);
const goliath = progress.arrivalRows.find(row =>
  row.unitId === "player1-exact-repair-1");
assert.equal(goliath.plannedFirstArrivalRound, 1);
assert.equal(goliath.observedFirstDeploymentRound, 2);
const amfMedic = progress.arrivalRows.find(row =>
  row.unitId === "player1-exact-repair-3");
assert.equal(amfMedic.plannedPoolSupply, 0);
assert.equal(amfMedic.currentSupply, 1);
assert(progress.arrivalRows.every(row => row.sideKey === "player1"));
assert.equal(progress.mayOverrideRules, false);
assert.equal(progress.originalArrivalRoundsAreAdvisory, true);
assert.equal(JSON.stringify(fixture), captured);
const report = { passed: true, actualCapturedChoiceRevision: 71,
  capturedPaidReplyNotRewritten: true,
  newSingleGoalContractReachesActualTurnPlanAndJournal: true,
  fiveConsistentLegacyRepliesPreserved: true,
  oldAmbiguousReplyNotSilentlyReinterpreted: true,
  actualArrivalFactsDistinguishedFromForecast: true,
  currentSupplyNotConfusedWithPlannedPoolSupply: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
