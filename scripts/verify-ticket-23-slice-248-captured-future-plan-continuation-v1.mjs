// Actual A/r6 paid submissions contain the required Omega future plan, but
// continue used only the old plan and repeatedly called that new item missing.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { projectStarcraftTmgSubmittedPlanningV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createStarcraftTmgTurnPlanRuntimeV1 } from
  "../packages/online-agent-session/turn-plan-runtime-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const original = JSON.stringify(capture);
const { choice, submissions } = capture;
assert.equal(choice.authority.stateRevision, 6);
assert.equal(submissions.length, 3);
const a = choice.authority;
const scope = { gameId: "starcraft-tmg", roomId: a.roomId,
  matchBindingHash: a.matchBindingHash, seatKey: a.seatKey };
// Exercise the real submission -> persisted TurnPlan seam. No Rules or
// geometric result is invented, and this is not a full match/legality gate.
const input = {
  scope,
  roomProjection: {
    room: { roomId: a.roomId, stateRevision: a.stateRevision,
      stateHash: a.stateHash },
    matchBinding: { bindingHash: a.matchBindingHash },
    viewer: { seatKey: a.seatKey },
    state: { round: 1, phase: "movement", activeSideKey: a.seatKey,
      firstPlayerSideKey: "player1" },
  },
  legalSpace: { roomId: a.roomId, matchBindingHash: a.matchBindingHash,
    stateRevision: a.stateRevision, stateHash: a.stateHash,
    legalSpaceHash: a.legalSpaceHash },
  spatialObservation: { observationHash: a.spatialObservationHash },
  spatialActionSpace: { authority: a,
    actionSpaceHash: a.spatialActionSpaceHash,
    finiteActions: choice.actionIndex.filter(e => e.kind === "finite")
      .map(e => ({ candidateId: e.id, action: e.action })),
    parameterDomains: choice.actionIndex.filter(e => e.kind === "parameterized")
      .map(e => e.action),
  },
};
const recorded = [];
const runtime = createStarcraftTmgTurnPlanRuntimeV1({
  now: () => "2026-10-09T05:41:00.000Z",
  decisionContinuity: { record: async entry => {
    recorded.push(structuredClone(entry)); return { ok: true };
  } },
});
const spec = Object.fromEntries([
  "objective", "currentGoal", "strategicApproach", "successSignals",
  "activationPriorities", "resourcePolicy", "initiativePolicy", "reservePolicy",
  "futureActionPlans", "reviseIf", "assumptions", "opponentModel", "contingencies",
].map(k => [k, choice.currentPlan[k]]));
const opened = await runtime.dispatch({ ...input, command: "open_plan", plan: spec });
const planningInput = { ...input, planState: { plan: opened.plan } };
const mapped = submissions.map(s => projectStarcraftTmgSubmittedPlanningV1(
  s.raw, planningInput, { terminal: true }));
for (const [i, entry] of mapped.entries()) {
  assert.equal(entry.assessment.verdict, "continue");
  assert(entry.futureActionPlanAmendment,
    "model-authored current-candidate future plans must not be discarded on continue");
  assert.deepEqual(entry.futureActionPlanAmendment.futureActionPlans,
    submissions[i].raw.plan.futureActionPlans);
  assert.deepEqual(entry.plan, submissions[i].raw.plan);
}
const amendment = mapped[0].futureActionPlanAmendment;
const reflected = await runtime.dispatch({ ...input, command: "reflect_plan",
  assessment: mapped[0].assessment, futureActionPlanAmendment: amendment });
assert.equal(reflected.lastAssessment.verdict, "continue");
assert.equal(reflected.plan.currentGoal, submissions[0].raw.plan.currentGoal);
assert.deepEqual(reflected.plan.strategicApproach, opened.plan.strategicApproach);
assert.equal(reflected.plan.objective, opened.plan.objective);
assert.deepEqual(reflected.plan.futureActionPlans, [
  ...opened.plan.futureActionPlans, ...submissions[0].raw.plan.futureActionPlans,
]);
assert.equal(reflected.plan.version, opened.plan.version + 1,
  "persist a real bounded amendment without changing the model's verdict");
assert.deepEqual(recorded.at(-1).turnPlan.futureActionPlans,
  reflected.plan.futureActionPlans);
assert(recorded.at(-1).events.some(e => e.kind === "plan_revision"
  && e.payload.revisionKind === "future_action_plan_amendment"));
const missing = structuredClone(submissions[0].raw);
missing.plan.futureActionPlans = [];
assert.equal(projectStarcraftTmgSubmittedPlanningV1(missing, planningInput,
  { terminal: true }).futureActionPlanAmendment, undefined);
const stale = structuredClone(submissions[0].raw);
stale.plan.futureActionPlans[0].enablingCandidateId = "old-candidate";
assert.equal(projectStarcraftTmgSubmittedPlanningV1(stale, planningInput,
  { terminal: true }).futureActionPlanAmendment, undefined);
const legacy = structuredClone(submissions[0].raw);
delete legacy.currentGoalSource;
assert.equal(projectStarcraftTmgSubmittedPlanningV1(legacy, planningInput,
  { terminal: true }).futureActionPlanAmendment, undefined,
  "do not reinterpret ambiguous historical protocols");
const staleAuthority = { ...structuredClone(amendment),
  authority: { ...amendment.authority, stateRevision: 5 } };
await assert.rejects(runtime.dispatch({ ...input, command: "reflect_plan",
  assessment: mapped[0].assessment, futureActionPlanAmendment: staleAuthority }),
  /future action plan amendment/);
assert.equal(JSON.stringify(capture), original);
const report = { passed: true, capturedRevision: 6, paidSubmissions: 3,
  allModelFuturePlansRetained: true, boundedAmendmentPersisted: true,
  strategicObjectiveAndApproachPreserved: true, modelVerdictPreserved: true,
  absentStaleAndLegacyPlansNotInvented: true, staleAuthorityRejected: true,
  originalPaidCaptureUnchanged: true, providerCalls: 0, originalRoomWrites: 0,
  scope: "submission_to_persisted_turn_plan_not_full_legality_or_strategy",
  trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
