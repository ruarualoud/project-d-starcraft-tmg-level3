#!/usr/bin/env node

// Concrete native ranged-LOS call pattern: four physical rays repeat canonical
// preparation of the same privately copied whole units. The actual 1804-row map
// is projected exactly as terrainAsOrdinaryForLos does; no room/geometry changes.
import assert from "node:assert/strict";
import { Hash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createOfficialElevatedLineOfSightBatchV1 } from
  "../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath, evidencePath] = process.argv.slice(2);
assert(capturePath && baselinePath && evidencePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
assert.equal(capture.aggregate.stateRevision, 82);
const source = structuredClone(capture.aggregate.envelope.state);
assert.equal(source.board.terrain.length, 1804);
const terrain = source.board.terrain.map(entry => {
  if (entry.isRemoved === true || entry.terrainKind === "ordinary") return entry;
  assert.equal(entry.terrainKind, "grass");
  const body = { schema: entry.schema, id: entry.id, terrainKind: "ordinary",
    size: entry.size, footprint: structuredClone(entry.footprint),
    standableHorizontalSurface: entry.standableHorizontalSurface === true,
    setupAgreement: structuredClone(entry.setupAgreement),
    rulesTruth: "official_core_terrain_setup_agreement", trainingTruth: false };
  return { ...body, terrainHash: hash(body), terrainId: entry.id,
    elevation: entry.elevation, heightTier: entry.heightTier,
    elevationSurface: entry.elevationSurface, impassable: false,
    openings: structuredClone(entry.openings || []),
    accessPoints: structuredClone(entry.accessPoints || []), isRemoved: false };
});
const state = { board: { terrain,
  terrainElevationAgreement: source.board.terrainElevationAgreement }, pieces: source.pieces };
const dataBundle = source.officialTerrainLosDataBundle;
const attacker = state.pieces.find(piece => piece.id === "player1-marine-3");
const target = state.pieces.find(piece => piece.id === "player2-kerrigan-raptor");
assert(attacker && target);
const queries = attacker.models.slice(0, 2).flatMap(attackerModel =>
  target.models.slice(0, 2).map(targetModel => ({ attacker,
    attackerModelId: attackerModel.id, target, targetModelId: targetModel.id })));
const input = { state, dataBundle };
const inputHash = hash({ input, queries });
const nativeUpdate = Hash.prototype.update;
const canonicalModelFootprintCounts = new Map();
let result;
let elapsedMs;
try {
  Hash.prototype.update = function (data, ...args) {
    if (typeof data === "string" && data.startsWith("{") && data.endsWith("}")
      && data.includes('"schema":"starcraft_tmg_physical_footprint_v1"')) {
      let body;
      try { body = JSON.parse(data); } catch { /* Not a complete footprint body. */ }
      if (body?.schema === "starcraft_tmg_physical_footprint_v1"
        && body.kind === "model_base" && new Error().stack.includes("at canonicalModel (")) {
        canonicalModelFootprintCounts.set(body.objectId,
          (canonicalModelFootprintCounts.get(body.objectId) || 0) + 1);
      }
    }
    return Reflect.apply(nativeUpdate, this, [data, ...args]);
  };
  const started = performance.now();
  result = createOfficialElevatedLineOfSightBatchV1(input).evaluate(queries);
  elapsedMs = performance.now() - started;
} finally { Hash.prototype.update = nativeUpdate; }
assert.equal(hash({ input, queries }), inputHash, "caller inputs remain unchanged");
assert(result.every(row => row.assessments.length === 1804));
assert(Object.isFrozen(result) && result.every(Object.isFrozen));
const invalidResults = [];
const invalidSource = structuredClone(attacker);
invalidSource.sourceRecordHash = "altered";
const invalidSupport = structuredClone(attacker);
// Not one of the queried models: complete-unit high-ground checks must retain
// this rejection rather than caching only the two selected physical participants.
invalidSupport.models.at(-1).supportTerrainIds = ["missing-terrain"];
for (const [corruption, piece] of [["same_id_different_source_object", invalidSource],
  ["unqueried_model_support", invalidSupport]]) {
  const bad = queries.map(query => ({ ...query, attacker: piece }));
  let failure;
  try { createOfficialElevatedLineOfSightBatchV1(input)
    .evaluate([queries[0], ...bad]); } catch (error) { failure = error.message; }
  assert(failure, `${corruption}: native validation must still reject`);
  invalidResults.push({ corruption, failure });
}
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { sourceRevision: 82, inputHash, result, invalidResults,
    canonicalModelFootprintCounts: [...canonicalModelFootprintCounts], elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(baseline.inputHash, inputHash);
assert.deepEqual(result, baseline.result, "ALL 1804 assessments per ray and full hashes unchanged");
assert.deepEqual(invalidResults, baseline.invalidResults,
  "actual same-id foreign/source and unqueried-support failures remain unchanged");
const evidence = { operation: "owned_los_model_preparation", sourceRevision: 82,
  terrainRows: 1804, queryCount: queries.length,
  completeOriginalResultsEqual: true, exactOriginalFailuresEqual: true,
  callerInputsUnchanged: true,
  canonicalModelFootprintCount: [...canonicalModelFootprintCounts.values()]
    .reduce((sum, count) => sum + count, 0),
  originalCanonicalModelFootprintCount: baseline.canonicalModelFootprintCounts
    .reduce((sum, [, count]) => sum + count, 0),
  canonicalModelFootprintCounts: [...canonicalModelFootprintCounts],
  originalCanonicalModelFootprintCounts: baseline.canonicalModelFootprintCounts,
  elapsedMs, originalElapsedMs: baseline.elapsedMs,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
await writeFile(evidencePath, JSON.stringify(evidence), { mode: 0o600 });
console.log(JSON.stringify(evidence));
assert.equal(canonicalModelFootprintCounts.size, attacker.models.length + target.models.length,
  "probe must exercise all live models, not only its selected physical rays");
assert([...canonicalModelFootprintCounts.values()].every(count => count === 1),
  "OWNED_LOS_REPREPARES_THE_SAME_COMPLETE_UNIT_MODELS_FOR_EVERY_RAY");
