// Real Teach confused opponent-affinity from our perspective with VP earned
// by that opponent on its OWN markers. Test the actual source-facts compiler.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildRosterFinalPlanVerifiedFactsV1 } from "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { projectMissionMarkerScoringArithmeticV1 } from "../packages/roster-strategist/mission-marker-scoring-arithmetic-v1.mjs";

const option = key => process.argv.find(x => x.startsWith(`--${key}=`))?.slice(key.length + 3);
const capture = JSON.parse(await readFile(option("capture"), "utf8"));
const teach = JSON.parse(await readFile(option("teach"), "utf8"));
const plan = structuredClone(capture.plan);
if (option("scope") === "policy") {
  // A prose repair may replace the literal heading. The session's typed
  // policy must still supply its capabilities and scoring facts.
  const policyFacts = buildRosterFinalPlanVerifiedFactsV1({ plan,
    toolReceipts: teach.toolReceipts, selectionUnitRules: capture.unitRules,
    selectionJustificationPolicyVersion: "unit_role_comparison_v1" }).sourceFacts;
  assert.ok(policyFacts.selectionUnitRules,
    "typed selection policy must survive replacement of the prose heading");
  assert.ok(policyFacts.missionMarkerScoringByActor);
  assert.deepEqual(policyFacts.selectionRosterUnits, plan.rosterCandidate.units);
  console.log(JSON.stringify({ status: "passed", scope: "typed_policy_after_prose_repair",
    legacyHeadingsNotRequired: true, realProviderCalls: 0, roomWrites: 0 }));
  process.exit(0);
}
// This is a compiler fixture, not an edited production Plan or admission proof.
plan.publicSummaryText += "\nFinal choice argument (public model output): test fixture";
const facts = buildRosterFinalPlanVerifiedFactsV1({ plan, toolReceipts: teach.toolReceipts,
  selectionUnitRules: capture.unitRules }).sourceFacts;
assert.ok(facts.missionMarkerScoringByActor,
  "new selection review must distinguish actual scoring actors, not only our affinity perspective");
const table = facts.missionMarkerScoringByActor;
assert.equal(table.status, "source_bound_arithmetic_only");
const points = (side, marker) => table.markers.find(x => x.number === marker).vpByScoringActor[side];
assert.equal(points("player2", 2) + points("player2", 4), 2,
  "opponent holding its own two markers earns 2, not the hallucinated 4");
assert.equal(points("player1", 1) + points("player1", 3) + points("player1", 5), 3);
assert.equal(points("player1", 2), 2);
assert.equal(table.markers.find(x => x.number === 2).relativeVpSwingOnControlTransfer, 3);
assert.equal(table.markers.find(x => x.number === 5).relativeVpSwingOnControlTransfer, 2);
assert.equal(table.provesFeasibleControlOrActualScore, false);
assert.equal(facts.callerSuppliedMathDoesNotVerifyScoringPremises, true);
const original = buildRosterFinalPlanVerifiedFactsV1({ plan: capture.plan, toolReceipts: teach.toolReceipts }).sourceFacts;
assert.equal(Object.hasOwn(original, "missionMarkerScoringByActor"), false,
  "historical paid review facts are not silently changed");
const missing = buildRosterFinalPlanVerifiedFactsV1({ plan, toolReceipts: [], selectionUnitRules: capture.unitRules }).sourceFacts;
assert.equal(missing.missionMarkerScoringByActor.status, "unknown");
assert.equal(Object.hasOwn(missing.missionMarkerScoringByActor, "markers"), false);
const receipt = teach.toolReceipts.find(x => x.queryId === "mission-scoring-authority");
assert.equal(table.receiptHash, receipt.receiptHash);
assert.equal(projectMissionMarkerScoringArithmeticV1({ receipt, sideKey: "player2" }).markers
  .filter(x => [2, 4].includes(x.number)).reduce((sum, x) => sum + x.vpIfControlledBySide, 0), 2);
console.log(JSON.stringify({ status: "passed", opponentOwnTwoMarkersVp: 2,
  player1BaselineThreeMarkersVp: 3, enemyMarkerControlTransferRelativeVpSwing: 3,
  historicalContextUnchanged: true, missingAuthorityNotZero: true,
  realProviderCalls: 0, roomWrites: 0, strategicOutcomeProven: false }));
