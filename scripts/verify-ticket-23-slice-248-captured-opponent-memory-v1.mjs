// Concrete C76/C77: a corrected Marine-3 observation cannot supersede the
// old unactivated claim. This seam has no Rules/Room/Provider mutation.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as live from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import * as hosted from
  "../packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs";
import { createStarcraftTmgTurnPlanRuntimeV1 } from
  "../packages/online-agent-session/turn-plan-runtime-v1.mjs";

const [fixturePath, diagnosticPath, reportPath] = process.argv.slice(2);
assert(fixturePath && diagnosticPath && reportPath);
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const diagnostic = JSON.parse(await readFile(diagnosticPath, "utf8"));
const original = JSON.stringify(fixture);
const { choice, raw, actualCorrectedStatement } = fixture;
const old = "Marine-2 and Marine-3 remain unactivated in movement.";
assert(choice.currentPlan.opponentModel.includes(old));
assert.equal(raw.currentGoalSource, "plan.currentGoal");
assert.equal(raw.assessment.verdict, "continue");
assert(actualCorrectedStatement.includes("movement is already activated"));
const a = choice.authority;
const next = diagnostic.choices.find(entry =>
  entry.authority.stateRevision === 76).authority;
const scope = { gameId: "starcraft-tmg", roomId: a.roomId,
  matchBindingHash: a.matchBindingHash, seatKey: a.seatKey };
function inputFor(authority) {
  return {
    scope,
    roomProjection: { room: { roomId: authority.roomId,
      stateRevision: authority.stateRevision, stateHash: authority.stateHash },
    matchBinding: { bindingHash: authority.matchBindingHash },
    state: { round: 2, phase: "movement", activeSideKey: scope.seatKey,
      firstPlayerSideKey: scope.seatKey } },
    legalSpace: { ...authority },
    spatialObservation: { observationHash: authority.spatialObservationHash },
    spatialActionSpace: { authority,
      actionSpaceHash: authority.spatialActionSpaceHash,
      finiteActions: [], parameterDomains: [] },
    planState: { plan: choice.currentPlan },
  };
}
const input = inputFor(next);
const writes = [];
const runtime = createStarcraftTmgTurnPlanRuntimeV1({
  now: () => "2026-10-11T00:00:00.000Z",
  decisionContinuity: {
    query: async () => ({ records: [{ kind: "turn_plan", sequence: 1,
      authority: a, payload: structuredClone(choice.currentPlan) }] }),
    record: async entry => { writes.push(structuredClone(entry));
      return { ok: true }; },
  },
});
await runtime.hydrate({ scope });
const observed = await runtime.dispatch({ ...input, command: "observe_state" });

// A controlled corrected snapshot uses C77's actual public Action rationale.
// It is NOT a claim that the historical C76 Planner was corrected or re-paid.
const snapshot = {
  schemaVersion: "starcraft_tmg_opponent_model_snapshot_v1",
  source: "declared_planner_plan_opponent_model",
  authority: next,
  statements: [actualCorrectedStatement],
  strategicPlanReplacementAllowed: false,
  rulesAuthority: false,
};
const assessment = { ...structuredClone(raw.assessment),
  opponentModelUpdates: [actualCorrectedStatement] };
const reflected = await runtime.dispatch({ ...input, command: "reflect_plan",
  assessment, opponentModelSnapshot: snapshot });
assert.deepEqual(reflected.plan.opponentModel, [actualCorrectedStatement],
  "current corrected snapshot must supersede, not union with stale Marine-3 claim");
assert.equal(reflected.plan.version, choice.currentPlan.version);
assert.deepEqual(reflected.plan.strategicApproach,
  choice.currentPlan.strategicApproach,
  "opponent observation must not replace the winning strategy");
assert(observed.plan.opponentModelContext.claims.every(entry =>
  entry.freshness !== "current_authority"),
"legacy narrative must not become current-certified merely by observe_state");
assert.equal(reflected.plan.opponentModelContext.rulesAuthority, false);
assert.equal(reflected.plan.opponentModelContext.truthStatus,
  "model_authored_hypotheses_not_rules_facts");
assert(reflected.plan.opponentModelContext.claims.every(entry =>
  entry.observedAuthority.stateHash === next.stateHash
    && entry.freshness === "current_authority"));
assert.deepEqual(writes.at(-1).turnPlan.opponentModel,
  [actualCorrectedStatement]);
assert.deepEqual(writes.at(-1).turnPlan.opponentModelContext,
  reflected.plan.opponentModelContext);

// The actual declared Planner mapping and Bot reflection bridge must preserve
// the full current snapshot, even when a deprecated delta still repeats old text.
const declared = structuredClone(raw);
declared.plan.opponentModel = [actualCorrectedStatement];
const mapped = live.projectStarcraftTmgSubmittedPlanningV1(declared, input);
assert.deepEqual(mapped.plan, declared.plan);
assert.deepEqual(mapped.opponentModelSnapshot.statements,
  [actualCorrectedStatement]);
assert.equal(mapped.opponentModelSnapshot.authority.stateHash, next.stateHash);
const bridge = hosted.projectStarcraftTmgTurnPlanReflectionInputV1({
  assessment: mapped.assessment,
  plannerResult: { opponentModelSnapshot: mapped.opponentModelSnapshot },
});
const throughBridge = await runtime.dispatch({ ...input,
  command: "reflect_plan", ...bridge });
assert.deepEqual(throughBridge.plan.opponentModel, [actualCorrectedStatement]);
assert(!throughBridge.plan.opponentModel.includes(old));

// A stale advisory snapshot is ignored, not turned into a new gameplay High.
const stale = await runtime.dispatch({ ...input, command: "reflect_plan",
  assessment: { ...assessment, opponentModelUpdates: [] },
  opponentModelSnapshot: { ...snapshot, authority: a, statements: [old] } });
assert.deepEqual(stale.plan.opponentModel, [actualCorrectedStatement]);
assert.equal(stale.result.opponentModelUpdateStatus, "stale_snapshot_ignored");

// Origin survives persistence/restart; legacy absence stays unknown, not fresh.
const persisted = writes.at(-1).turnPlan;
const restarted = createStarcraftTmgTurnPlanRuntimeV1({
  now: () => "2026-10-11T00:00:01.000Z",
  decisionContinuity: { record: async () => ({ ok: true }),
    query: async () => ({ records: [{ kind: "turn_plan", sequence: 2,
      authority: next, payload: persisted }] }) },
});
await restarted.hydrate({ scope });
assert.deepEqual(restarted.read({ scope }).plan.opponentModelContext,
  persisted.opponentModelContext);
assert.equal(JSON.stringify(fixture), original,
  "actual paid reply and historical plan must remain immutable");
const report = {
  ok: true, capturedChoiceRevision: 75, capturedNextAuthorityRevision: 76,
  actualPriorActions: fixture.originalAuthorityEvidence,
  capturedCorrectionSourceReceipt: fixture.action77ReceiptHash,
  originalPaidReplyNotRewritten: true,
  correctedSnapshotSupersedesStaleClaim: true,
  plannerMappingAndHostBridgeReachPersistedPlan: true,
  authorityObservationDoesNotCertifyLegacyProse: true,
  currentHypothesisOriginSurvivesRestart: true,
  staleSnapshotIgnoredWithoutGameplayStop: true,
  strategyVersionAndApproachPreserved: true,
  providerCalls: 0, roomWrites: 0, trainingTruth: false,
};
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
