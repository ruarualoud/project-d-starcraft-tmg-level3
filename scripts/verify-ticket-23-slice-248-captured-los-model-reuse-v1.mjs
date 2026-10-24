import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

// Real fourth-formation pairs: the same Swarmling model against three Marine
// models. Reproduce repeated physical-model/proximity work, not synthetic play.
const [capturePath, reportPath] = process.argv.slice(2);
assert.ok(capturePath && reportPath);
const fixture = JSON.parse(await readFile(capturePath, "utf8"));
const originalHash = hashStarcraftTmgContract(fixture);
const ordinaryUrl = new URL(
  "../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs", import.meta.url);
const specialUrl = new URL(
  "../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs", import.meta.url);
function dataModule(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}
function imports(source, url, overrides = new Map()) {
  return source.replace(/(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
    (_, before, relative, after) => {
      const resolved = new URL(relative, url).href;
      return `${before}${overrides.get(resolved) || resolved}${after}`;
    });
}
const ordinarySource = imports(await readFile(ordinaryUrl, "utf8"), ordinaryUrl)
  .replace("function physicalModel(piece, modelId, dataBundle) {",
    "function physicalModel(piece, modelId, dataBundle) { modelBuilds += 1;")
  .replace("function withinOneInchOfTerrain(model, bounds, terrain) {",
    "function withinOneInchOfTerrain(model, bounds, terrain) { proximityComputations += 1;")
  + "\nlet modelBuilds = 0, proximityComputations = 0;"
  + " export function workCounts() { return { modelBuilds, proximityComputations }; }\n";
assert.ok(ordinarySource.includes("modelBuilds += 1;"));
assert.ok(ordinarySource.includes("proximityComputations += 1;"));
const ordinaryDataUrl = dataModule(ordinarySource);
const ordinary = await import(ordinaryDataUrl);
const special = await import(dataModule(imports(
  await readFile(specialUrl, "utf8"), specialUrl,
  new Map([[ordinaryUrl.href, ordinaryDataUrl]]),
)));
const queries = fixture.rows.map(row => row.query);
const uniqueModels = new Set(queries.flatMap(q => [
  `${q.actorUnitId}:${q.attackerModelId}`,
  `${q.targetUnitId}:${q.targetModelId}`,
]));
const started = performance.now();
const batch = special.evaluateOfficialSpecialTerrainLineOfSightBatchV1({
  state: fixture.state,
  dataBundle: fixture.state.officialTerrainLosDataBundle,
  queries,
  isolatePairFailures: true,
});
const elapsedMs = performance.now() - started;
const counts = ordinary.workCounts();
const outcomes = batch.results.map((row, index) => ({
  queryId: row.queryId,
  resultHash: row.result?.resultHash || null,
  assessmentCount: row.result?.assessments?.length || 0,
  failure: row.failure || null,
  expectedHash: fixture.rows[index].resultHash || null,
}));
for (let i = 0; i < fixture.rows.length; i += 1) {
  const expected = fixture.rows[i];
  assert.equal(batch.results[i].result?.resultHash || null,
    expected.resultHash || null);
  assert.equal(batch.results[i].failure || null, expected.failure || null);
  if (expected.resultHash) {
    assert.equal(batch.results[i].result.assessments.length,
      expected.assessmentCount);
  }
}
assert.equal(hashStarcraftTmgContract(fixture), originalHash);
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "captured_los_model_reuse_regression_v1",
  stage: "measured_before_assertions",
  elapsedMs,
  counts,
  uniqueModelCount: uniqueModels.size,
  queryCount: queries.length,
  outcomes,
  originalCaptureUnchanged: true,
  providerCalls: 0,
  roomMutations: 0,
}, null, 2) + "\n");
assert.equal(counts.modelBuilds, uniqueModels.size,
  "the same physical model is rebuilt for every pair in a single batch");
assert.ok(counts.proximityComputations <= uniqueModels.size
  * fixture.state.board.terrain.length,
"model-to-terrain proximity is repeated for shared models in one batch");

// Independent later calls must validate again. No cross-state cache or caller
// supplied prevalidated model may bypass source/model/terrain guards.
const corruptModelState = structuredClone(fixture.state);
corruptModelState.pieces.find(p => p.id === queries[0].actorUnitId)
  .models.find(m => m.id === queries[0].attackerModelId).baseWidthInches = 0;
assert.throws(() => special.evaluateOfficialSpecialTerrainLineOfSightBatchV1({
  state: corruptModelState,
  dataBundle: corruptModelState.officialTerrainLosDataBundle,
  queries: queries.slice(0, 1),
}), /TERRAIN_LOS_MODEL_BASE_INVALID/);
const corruptSourceState = structuredClone(fixture.state);
corruptSourceState.pieces.find(p => p.id === queries[0].targetUnitId)
  .sourceRecordHash = "invalid-source";
assert.throws(() => special.evaluateOfficialSpecialTerrainLineOfSightBatchV1({
  state: corruptSourceState,
  dataBundle: corruptSourceState.officialTerrainLosDataBundle,
  queries: queries.slice(0, 1),
}), /TERRAIN_LOS_OFFICIAL_UNIT_PROFILE_INVALID/);
const strict = special.evaluateOfficialSpecialTerrainLineOfSightBatchV1({
  state: fixture.state,
  dataBundle: fixture.state.officialTerrainLosDataBundle,
  queries: queries.filter((_, i) => !fixture.rows[i].failure),
});
assert.deepEqual(strict.results.map(row => row.result.resultHash),
  fixture.rows.filter(row => !row.failure).map(row => row.resultHash));
assert.throws(() => special.evaluateOfficialSpecialTerrainLineOfSightBatchV1({
  state: fixture.state,
  dataBundle: fixture.state.officialTerrainLosDataBundle,
  queries,
}), /TERRAIN_LOS_ELEVATION_EFFECTIVE_SIZE_DELEGATION_REQUIRED/);
await writeFile(reportPath, JSON.stringify({
  schemaVersion: "captured_los_model_reuse_regression_v1",
  status: "passed",
  elapsedMs,
  counts,
  uniqueModelCount: uniqueModels.size,
  queryCount: queries.length,
  outcomes,
  originalCaptureUnchanged: true,
  strictDefaultPreserved: true,
  independentModelAndSourceChangesRejected: true,
  providerCalls: 0,
  roomMutations: 0,
}, null, 2) + "\n");
console.log(JSON.stringify({ passed: true, elapsedMs, ...counts,
  uniqueModelCount: uniqueModels.size }));
