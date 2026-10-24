import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluateOfficialSpecialTerrainLineOfSightBatchV1 } from
  "../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs";
import { evaluateOfficialTerrainLineOfSightV1 } from
  "../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const { state } = JSON.parse(await readFile(process.argv[2], "utf8"));
const originalHash = hashStarcraftTmgContract(state);
const actor = state.pieces.find(piece => piece.id === "player2-swarmling");
const target = state.pieces.find(piece => piece.id === "player1-marine-2");
assert.equal(actor.currentModels, 18);
assert.equal(state.board.terrain.filter(t => !t.isRemoved && !t.isDestroyed
  && t.terrainKind === "grass").length, 0);
assert.ok(state.board.terrain.some(t => !t.isRemoved && !t.isDestroyed
  && t.terrainKind === "impassable"));
async function privateProbe(relative, appended) {
  const sourceUrl = new URL(relative, import.meta.url);
  const source = (await readFile(sourceUrl, "utf8"))
    .replace(/(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
      (_, before, path, after) =>
        `${before}${new URL(path, sourceUrl).href}${after}`);
  return import(`data:text/javascript;base64,${Buffer.from(source + appended)
    .toString("base64")}`);
}
const { adaptedProbe } = await privateProbe(
  "../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs",
  "\nexport function adaptedProbe(state) { return adaptedLineOfSightState(state, verifyContext(state)); }\n");
const { lookupProbe } = await privateProbe(
  "../packages/online-agent-session/tactical-relationship-graph-v1.mjs",
  "\nexport function lookupProbe(state, rows) { return specialTerrainLineOfSightLookup(state, rows); }\n");
const pairKey = `${actor.id}:${actor.models[0].id}->${target.id}:${target.models[0].id}`;
const query = { queryId: pairKey, planId: `relationship-los:${pairKey}`,
  actorUnitId: actor.id, attackerModelId: actor.models[0].id,
  targetUnitId: target.id, targetModelId: target.models[0].id };
const reference = evaluateOfficialTerrainLineOfSightV1({
  state: adaptedProbe(state), attacker: actor,
  attackerModelId: query.attackerModelId, target,
  targetModelId: query.targetModelId, dataBundle: state.officialTerrainLosDataBundle,
});
const failures = [];
let batch;
try {
  batch = evaluateOfficialSpecialTerrainLineOfSightBatchV1({ state,
    dataBundle: state.officialTerrainLosDataBundle, queries: [query] });
  const result = batch.results[0].result;
  assert.equal(result.terrainLineOfSightResultHash, reference.resultHash);
  assert.equal(result.visible, reference.visible);
  assert.deepEqual(result.assessments, reference.assessments);
  assert.deepEqual(result.grassAssessments, []);
} catch (error) { failures.push(`no-grass batch: ${error.message}`); }
const lookup = lookupProbe(state, [{ left: actor, right: target,
  stationaryRangedLineOfSightRequired: true,
  pairSearch: { pairs: [{ left: { model: actor.models[0] },
    right: { model: target.models[0] } }] } }]);
if (!lookup.results?.get(pairKey)) failures.push("non-grass deferred terrain skipped the batch");
else {
  assert.equal(lookup.failure, null);
  assert.deepEqual(lookup.results.get(pairKey), batch.results[0].result);
}
assert.throws(() => evaluateOfficialSpecialTerrainLineOfSightBatchV1({ state,
  dataBundle: state.officialTerrainLosDataBundle,
  queries: [{ ...query, actorUnitId: "missing-actor" }] }),
  /SPECIAL_TERRAIN_LOS_BATCH_QUERY_INVALID/u);
assert.equal(hashStarcraftTmgContract(state), originalHash);
assert.deepEqual(failures, []);
console.log(JSON.stringify({ status: "CAPTURED_NO_GRASS_LOS_OK",
  fullTerrainAssessmentCount: reference.assessments.length,
  batchHash: batch.batchHash, unchangedSourceHash: originalHash,
  providerCalls: 0, roomMutations: 0 }));
