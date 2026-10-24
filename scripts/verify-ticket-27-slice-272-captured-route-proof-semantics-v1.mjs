import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildRosterFinalPlanVerifiedFactsV1 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { createPregameMapEvidencePortV1 } from
  "../packages/roster-strategist/pregame-map-evidence-port-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const captured = JSON.parse(await readFile(process.argv[2], "utf8"));
const before = hashStarcraftTmgContract(captured);
const { sourceFacts } = buildRosterFinalPlanVerifiedFactsV1(captured);
const failures = [];
function check(label, run) {
  try { run(); } catch (error) { failures.push(`${label}: ${error.message}`); }
}
const goliath = sourceFacts.selectedMapRouteEvidence.units.find(
  unit => unit.baseId === "round_80mm");
assert.ok(goliath, "retain the real captured Goliath, not a synthetic fixture");
const noWitness = goliath.objectiveAccess.find(
  target => target.targetId === "mission-marker-1");
const witnessed = goliath.objectiveAccess.find(
  target => target.targetId === "mission-marker-3");
check("review absence is unknown, not impossible", () => {
  assert.equal(noWitness.failureCode,
    "no_reachable_same_elevation_control_witness");
  assert.equal(noWitness.reachable, null);
  assert.equal(noWitness.reachabilityStatus, "unknown");
  assert.equal(noWitness.unreachabilityProven, false);
});
check("positive captured witness remains available", () => {
  assert.equal(witnessed.reachable, true);
  assert.equal(witnessed.reachabilityStatus, "certified_witness");
  assert.equal(witnessed.approximateRouteLengthInches, 5.25);
});
const port = createPregameMapEvidencePortV1({ sourceState: captured.sourceState });
check("single route and roster tools use the same proof boundary", () => {
  const route = port.routeToObjective({ queryId: "captured-no-witness",
    sideId: "player1", baseId: "round_80mm",
    targetId: "mission-marker-1" });
  const roster = port.evaluateRosterRoute({ queryId: "captured-roster",
    sideId: "player1", candidateInput: captured.candidateInput });
  const rosterTarget = roster.accessByBase.find(base =>
    base.baseId === "round_80mm").targets.find(target =>
    target.targetId === "mission-marker-1");
  for (const target of [route, rosterTarget]) {
    assert.equal(target.reachable, null);
    assert.equal(target.reachabilityStatus, "unknown");
    assert.equal(target.unreachabilityProven, false);
  }
});
check("ten-point lead is not ten own points", () => {
  const arithmetic = sourceFacts.missionMarkerScoringArithmetic;
  assert.equal(arithmetic.specialLeadWinThreshold, 10);
  assert.equal(arithmetic.specialLeadWinCondition.scoreBasis,
    "own_cumulative_vp_minus_opponent_cumulative_vp");
  assert.equal(arithmetic.specialLeadWinCondition.threshold, 10);
  assert.equal(arithmetic.specialLeadWinCondition.opponentCumulativeVp, null);
  assert.equal(arithmetic.specialLeadWinCondition.terminalFromOwnScoreAlone,
    "unknown");
});
assert.equal(hashStarcraftTmgContract(captured), before,
  "do not mutate paid plans, historical receipts, or frozen map state");
assert.deepEqual(failures, []);
console.log(JSON.stringify({ status: "CAPTURED_ROUTE_PROOF_SEMANTICS_OK",
  units: sourceFacts.selectedMapRouteEvidence.units.length,
  unchangedCaptureHash: before, providerCalls: 0, roomMutations: 0 }));
