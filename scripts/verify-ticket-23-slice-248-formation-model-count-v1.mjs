import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  createOfficialPhysicalFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1,
} from "../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

// Concrete B116 defect: three own models were labelled as five/16 models.
// Execute the actual private metric/Pareto call-site bodies with real Rules
// footprint distance, rather than a duplicate implementation or a Rules replay.
const [outputPrefix, capturedActionsPath] = process.argv.slice(2);
assert.ok(outputPrefix && capturedActionsPath, "OUTPUT_AND_CAPTURE_REQUIRED");
const source = await readFile(new URL(
  "../packages/online-agent-session/legal-formation-search-v1.mjs",
  import.meta.url,
), "utf8");
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `PRODUCTION_FUNCTION_MISSING:${name}`);
  const next = source.slice(start + 1).search(/\n(?:function |export )/);
  assert.ok(next >= 0, `PRODUCTION_FUNCTION_END_MISSING:${name}`);
  return source.slice(start, start + 1 + next);
}
const helperNames = ["object", "clone", "footprintCenter", "footprintBounds",
  "targetsForObjective", "targetEdgeDistance", "formationSolverMetrics",
  "finiteOrFloor", "negativeFiniteOrFloor", "paretoVector"];
const actual = new Function("evaluateOfficialPhysicalFootprintRelationV1",
  "hashStarcraftTmgContract", `${helperNames.map(functionSource).join("\n")}\n`
    + "return { formationSolverMetrics, paretoVector };",
)(evaluateOfficialPhysicalFootprintRelationV1, hashStarcraftTmgContract);

const capturedRows = (await readFile(capturedActionsPath, "utf8")).trim()
  .split("\n").map((line) => JSON.parse(line));
const captured = capturedRows.find((row) => row.index === 116
  && row.actionType === "resolve_charge"
  && row.pieceId === "player1-exact-repair-4");
assert.ok(captured, "ACTUAL_B116_CHARGE_CAPTURE_REQUIRED");
const oldMetrics = captured.formationSelection.tacticalMetrics;
assert.equal(oldMetrics.modelCount, 3);
assert.ok(oldMetrics.objectiveMetrics.some((row) =>
  row.modelsWithinThreeInchesOfTarget > oldMetrics.modelCount),
"CAPTURE_MUST_REPRODUCE_OWN_MODEL_OVERCOUNT");

function model(id, x, y, width, sideKey) {
  const point = { xMilliInches: x, yMilliInches: y };
  const footprint = createOfficialPhysicalFootprintV1({
    objectId: id, kind: "model", shape: "round", center: point,
    widthMilliInches: width, depthMilliInches: width, rotationDegrees: 0,
  });
  return { point, footprint, ids: [sideKey === "player2" ? "enemy-unit"
    : "own-unit", id], kind: "model", sideKey };
}
const selected = [0, 1_400, 2_800].map((y, i) =>
  model(`own-${i + 1}`, 0, y, 1_260, "player1"));
const targets = [1_590, 3_400].flatMap((x, col) =>
  [0, 1_400, 2_800].map((y, row) =>
    model(`enemy-${col * 3 + row + 1}`, x, y, 990, "player2")));
const objective = { kind: "maximize_engagement", weight: 5,
  targetIds: ["enemy-unit", "enemy-1"] };
function metrics(own, targetIndex, targetIds) {
  return actual.formationSolverMetrics(own, {
    sideKey: "player1", anchor: own[0].point, targetIndex,
    policy: { objectives: [{ ...objective, targetIds }],
      packingProfileId: "balanced_spacing",
      preferredInterBaseGapMilliInches: 160 },
  }, 34.514667);
}
const report = {
  schemaVersion: "starcraft_tmg_formation_model_count_regression_v1",
  productionSourceHash: createHash("sha256").update(source).digest("hex"),
  captured: { revision: captured.postStateRevision,
    modelCount: oldMetrics.modelCount,
    objectiveMetrics: oldMetrics.objectiveMetrics,
    receiptHash: captured.receiptHash },
  originalRoomWrites: 0, providerCalls: 0,
  fullRulesSettlementVerified: false,
};
try {
  const dense = metrics(selected, targets, objective.targetIds);
  report.actualDenseMetrics = dense;
  assert.equal(dense.objectiveMetrics[0].resolvedTargetCount, 6,
    "UNIT_AND_MODEL_ALIASES_MUST_NOT_DUPLICATE_TARGETS");
  assert.equal(dense.objectiveMetrics[0].modelsWithinOneInchOfTarget, 3,
    "ONE_INCH_COUNTS_OWN_MODELS_NOT_ACTOR_TARGET_PAIRS");
  assert.equal(dense.objectiveMetrics[0].modelsWithinThreeInchesOfTarget, 3,
    "THREE_INCH_COUNTS_OWN_MODELS_NOT_ACTOR_TARGET_PAIRS");
  const uniqueAlias = metrics(selected, targets, ["enemy-unit"]);
  assert.deepEqual(dense.objectiveMetrics.map(({ targetIds, ...row }) => row),
    uniqueAlias.objectiveMetrics.map(({ targetIds, ...row }) => row));
  const vector = actual.paretoVector({ tacticalMetrics: dense,
    formationObjectives: [objective] });
  assert.equal(vector.find((axis) =>
    axis.name.endsWith(":models_within_three_inches")).value, 3);
  assert.equal(dense.solverScore, 34.514667,
    "WEIGHTED_PLACEMENT_SCORE_IS_NOT_CHANGED_BY_METRIC_PROJECTION");
  const empty = metrics(selected, targets, ["missing-target"]);
  assert.equal(empty.objectiveMetrics[0].modelsWithinOneInchOfTarget, 0);
  assert.equal(empty.objectiveMetrics[0].modelsWithinThreeInchesOfTarget, 0);
  assert.equal(empty.objectiveMetrics[0].minimumTargetBaseEdgeDistanceMilliInches,
    null);
  const one = [model("boundary-own", 0, 0, 1_000, "player1")];
  const boundary = metrics(one, [
    model("boundary-1", 2_000, 0, 1_000, "player2"),
    model("boundary-2", 4_000, 0, 1_000, "player2"),
  ], ["enemy-unit"]);
  assert.equal(boundary.objectiveMetrics[0].modelsWithinOneInchOfTarget, 1);
  assert.equal(boundary.objectiveMetrics[0].modelsWithinThreeInchesOfTarget, 1);
  const outside = metrics(one, [
    model("outside", 4_001, 0, 1_000, "player2"),
  ], ["enemy-unit"]);
  assert.equal(outside.objectiveMetrics[0].modelsWithinThreeInchesOfTarget, 0);
  report.status = "passed";
  report.paretoCount = 3;
  report.noStrategyWeightOrRulesChange = true;
  await writeFile(`${outputPrefix}.report.private.json`,
    `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ status: report.status, ownModels: 3,
    oneInch: 3, threeInches: 3, providerCalls: 0, originalRoomWrites: 0 }));
} catch (error) {
  report.status = "failed";
  report.failure = { code: error.code, message: error.message };
  await writeFile(`${outputPrefix}.report.private.json`,
    `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  throw error;
}
