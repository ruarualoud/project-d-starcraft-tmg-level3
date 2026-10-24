// Concrete A20 paid reply: an unexecuted deployment zone was treated as
// the current positions of different own units.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { inspectStarcraftTmgFormationThreatClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
const currentAttackerOnly = process.argv[2] === "--current-attacker-only";
const selectedReserveFormationOnly = process.argv[2]
  === "--selected-reserve-formation-only";
const [capturePath, outputPath] = process.argv.slice(
  currentAttackerOnly || selectedReserveFormationOnly ? 3 : 2);
const actual = JSON.parse(await readFile(capturePath, "utf8"));
const original = JSON.stringify(actual);
if (selectedReserveFormationOnly) {
  const live = await import(
    "../packages/online-agent-session/live-flash-decision-port-v1.mjs");
  assert.equal(actual.authority.stateRevision, 11);
  assert.equal(actual.attempts.length, 3);
  const input = { spatialActionSpace: {
    finiteActions: [], parameterDomains: [actual.selectedAction],
  } };
  const choice = { plannerResult: {
    recommendedCandidateId: actual.selectedAction.domainId,
  } };
  const bind = output => {
    const mapped = live.projectStarcraftTmgSubmittedActionV1(output, input, choice);
    assert.equal(mapped.candidateId, actual.selectedAction.domainId);
    // Production's bindPlannerSelectedProposal binds this same selected
    // parameterized domain before the public formation-binding seam.
    return live.bindStarcraftTmgFormationSelectionV1({ ...mapped, proposal: {
      kind: "parameterized", domainId: actual.selectedAction.domainId,
      parameters: {},
    } }, actual.queryReceipts, actual.spatialObservation);
  };
  const normalized = actual.attempts.map(a => bind(a.output));
  const formation = actual.queryReceipts.findLast(q =>
    q.result?.formationOptions?.length);
  const selected = formation.result.formationOptions.find(o =>
    o.formationOptionId === normalized.at(-1).formationSelection.formationOptionId);
  assert.equal(selected.pieceId, actual.selectedAction.pieceId);
  assert(actual.spatialObservation.offTableUnits.some(u =>
    u.unitId === selected.pieceId && u.isInReserves));
  assert(selected.relationshipComparison.relationships
    .filter(r => r.relation === "opposed").every(r =>
      r.enemyCurrentRoundStationaryThreatProfileKeys.length === 0));
  const inspect = (raw, extra = {}) => inspectStarcraftTmgFormationThreatClaimsV1({
    raw, queryReceipts: actual.queryReceipts,
    spatialObservation: actual.spatialObservation,
    plannerSelectedAction: actual.selectedAction, ...extra,
  });
  for (const raw of normalized) assert.equal(inspect(raw).contradicted, false,
    "a safe selected reserve formation cannot be disproved by current Worm exposure");
  const originalText = normalized.at(-1).publicDecisionSummary.calculations
    .find(t => t.includes("requested-left formation option places Swarmling"));
  assert(originalText);
  // A changed current position isolates the other half of the same boundary:
  // selected future geometry is not the moving Unit's pre-action geometry.
  const movedGraph = structuredClone(actual.queryReceipts);
  for (const q of movedGraph.filter(q => q.queryKind === "space.inspect_relationships")) {
    for (const row of q.result.relationships) if (row.fromUnitId === "player2-omega-worm"
      && row.toUnitId === "marauder-1") row.fromUnitId = selected.pieceId;
  }
  const onBoard = structuredClone(actual.spatialObservation);
  onBoard.units.push({ ...onBoard.offTableUnits.find(u => u.unitId === selected.pieceId),
    positionAvailable: true, isInReserves: false });
  onBoard.offTableUnits = onBoard.offTableUnits.filter(u => u.unitId !== selected.pieceId);
  const oneClaim = { ...normalized.at(-1), publicDecisionSummary: {
    calculations: [originalText],
  } };
  assert.equal(inspect(oneClaim, { queryReceipts: movedGraph,
    spatialObservation: onBoard }).contradicted, false,
  "source-bound chosen geometry is checked against the chosen formation, not the old position");
  const currentDenial = { ...oneClaim, publicDecisionSummary: {
    calculations: ["Swarmling is currently outside all enemy stationary fire bands."],
  } };
  assert.equal(inspect(currentDenial, { queryReceipts: movedGraph,
    spatialObservation: onBoard }).contradicted, true);
  for (const claim of ["Omega Worm is outside every enemy stationary fire band.",
    "All own units are outside all current enemy fire bands."]) {
    assert.equal(inspect({ ...oneClaim, publicDecisionSummary: {
      calculations: [claim],
    } }).contradicted, true, "other-Unit/global real denials remain strict");
  }
  const exposed = structuredClone(actual.queryReceipts);
  const exposedOption = exposed.findLast(q => q.result?.formationOptions?.length)
    .result.formationOptions.find(o => o.formationOptionId === selected.formationOptionId);
  const enemy = exposedOption.relationshipComparison.relationships
    .find(r => r.targetId === "marauder-1");
  enemy.enemyCurrentRoundStationaryThreatProfileKeys = ["Quad K12"];
  enemy.enemyCurrentRoundStationaryThreatProfileCount = 1;
  assert.equal(inspect(oneClaim, { queryReceipts: exposed }).contradicted, true,
    "a real threat in the chosen formation cannot disappear at the current/future seam");
  const staleBinding = structuredClone(oneClaim);
  staleBinding.formationSelection.formationReceiptHash = "0".repeat(64);
  assert.equal(inspect(staleBinding, { queryReceipts: movedGraph,
    spatialObservation: onBoard }).contradicted, true,
  "an unbound option is not a source of certified post-placement safety");
  assert.equal(JSON.stringify(actual), original);
  const report = { passed: true, actualPaidActions: 3,
    chosenReserveUnitAndFormationScopeRespected: true,
    movedUnitCurrentVersusChosenGeometrySeparated: true,
    realCurrentAndSelectedFormationDenialsStillBlock: true,
    staleFormationEvidenceRejected: true, originalInputsUnchanged: true,
    providerCalls: 0, roomWrites: 0,
    scope: "B11_selected_formation_threat_scope_not_entry_plan_or_full_game_acceptance",
    trainingTruth: false };
  await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify(report));
  process.exit(0);
}
if (currentAttackerOnly) {
  assert.equal(actual.authority.stateRevision, 11);
  assert.equal(actual.attempts.length, 3, "use all three real paid Planner replies");
  const graph = actual.queryReceipts.find(q => q.queryKind === "space.inspect_relationships");
  const marine = graph.result.nodes.units.find(u => u.unitName === "Marine");
  const marauder = graph.result.nodes.units.find(u => u.unitName === "Marauder");
  assert(marine && marauder);
  assert(graph.result.relationships.filter(r => r.toUnitId === marine.nodeId
    && ["player2-kerrigan", "player2-omega-worm"].includes(r.fromUnitId))
    .every(r => r.threats.toFrom.currentRoundStationaryProfileKeys.length === 0));
  assert(graph.result.relationships.some(r => r.toUnitId === marauder.nodeId
    && r.fromUnitId === "player2-omega-worm"
    && r.threats.toFrom.currentRoundStationaryProfileKeys.length > 0));
  const inspect = raw => inspectStarcraftTmgFormationThreatClaimsV1({
    raw, queryReceipts: actual.queryReceipts,
    spatialObservation: actual.spatialObservation,
    plannerSelectedAction: { actionType: "deploy", pieceId: "player2-swarmling" },
  });
  const text = actual.attempts.at(-1).output.assessment.opponentModelUpdates
    .find(t => t.includes("Marine remains out of current fire bands"));
  assert(text, "must use the exact rejected statement, not a rewritten strategy");
  assert.equal(inspect({ assessment: { opponentModelUpdates: [text] } })
    .contradicted, false, "Marauder fire must not contradict a Marine-only statement");
  for (const attempt of actual.attempts) {
    assert.equal(inspect(attempt.output).contradicted, false,
      "all real paid replies must pass this scope seam without rewriting");
  }
  const falseMarauder = inspect({ assessment: { opponentModelUpdates: [
    text.replace("Marine", "Marauder"),
  ] } });
  assert.equal(falseMarauder.contradicted, true);
  assert(falseMarauder.contradictions.every(c => c.threatFacts
    .every(f => f.attackerId === marauder.nodeId)));
  for (const universal of [
    "All own units remain outside all current enemy fire bands, including Marine fire.",
    "No enemy fire band reaches Kerrigan or the Omega Worm, including Marine fire.",
  ]) assert.equal(inspect({ assessment: { opponentModelUpdates: [universal] } })
    .contradicted, true, "a universal denial still includes Marauder exposure");
  assert.equal(inspect({ assessment: { opponentModelUpdates: [
    "Omega Worm is outside marine-1 stationary fire bands.",
  ] } }).contradicted, false, "full observed instance identity stays scoped");
  assert.equal(JSON.stringify(actual), original, "no paid answer or receipt rewritten");
  const report = { passed: true, actualPaidReplies: 3,
    actualMarineAndMarauderFactsUsed: true, namedAttackerScopeRespected: true,
    realMarauderDenialAndUniversalDenialStillBlock: true,
    fullPaidRepliesPassedThreatScopeOnly: true, providerCalls: 0, roomWrites: 0,
    scope: "B11_current_named_attacker_not_full_Planner_or_game_acceptance",
    trainingTruth: false };
  await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify(report));
  process.exit(0);
}
const receipt = actual.queryReceipts[0];
const spatialObservation = { units: receipt.result.nodes.units.map(unit => ({
  ...unit, unitId: unit.nodeId,
})) };
const reply = actual.attempts.flatMap(attempt =>
  attempt.output?.providerTurn?.toolCalls || []).filter(call =>
  call.name === "submit_planning").at(-1).arguments;
const inspect = (raw, extra = {}) => inspectStarcraftTmgFormationThreatClaimsV1({
  raw, queryReceipts: actual.queryReceipts, spatialObservation, ...extra,
});
const calculations = reply.publicPlanSummary.calculations;
const marineClaim = calculations.find(text => text.startsWith("player1-marine-1"));
assert(marineClaim, "use the real paid named-attacker statement");
assert.equal(inspect({ publicPlanSummary: { calculations: [marineClaim] } })
  .contradicted, false, "Marine 2/Goliath cannot contradict a Marine 1 claim");
const zoneClaim = calculations.find(text => /intended Raptor deployment zone/u.test(text));
assert(zoneClaim);
const prospective = inspect({ publicPlanSummary: { calculations: [zoneClaim] } }, {
  plannerSelectedAction: { actionType: "deploy", pieceId: "player2-kerrigan-raptor" },
});
assert.equal(prospective.contradicted, false,
  "current Kerrigan/Worm positions do not prove the intended zone claim false");
assert(prospective.advisoryFindings.some(finding =>
  finding.reasonCode === "unverified_prospective_position_claim"),
"uncertified future safety must remain visible, not be certified by omission");
const realContradiction = inspect({ publicPlanSummary: { calculations: [
  "player2-kerrigan is outside player1-goliath-1's stationary fire range.",
] } });
assert.equal(realContradiction.contradicted, true);
assert(realContradiction.contradictions.every(finding => finding.threatFacts.every(fact =>
  fact.attackerId === "player1-goliath-1" && fact.targetId === "player2-kerrigan")));
assert.equal(inspect({ publicPlanSummary: { calculations: [
  "No enemy fire band reaches any own unit.",
] } }).contradicted, true, "whole-side actual safety remains blocking");
assert.equal(inspect({ publicPlanSummary: { calculations: [
  "player2-kerrigan is outside every enemy stationary fire band.",
] } }, { plannerSelectedAction: { actionType: "deploy", pieceId: "player2-kerrigan-raptor" } })
  .contradicted, true, "a future action never waives a separate current safety claim");
assert.equal(JSON.stringify(actual), original);
const report = { passed: true, actualPaidClaimAndRelationshipGraphUsed: true,
  namedAttackerScopeRespected: true, futurePositionNotCurrentPosition: true,
  unverifiedPredictionRetained: true, realCurrentContradictionsStillBlock: true,
  providerCalls: 0, roomWrites: 0, trainingTruth: false,
  scope: "A20_claim_scope_not_full_planner_or_strategy_acceptance" };
await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
