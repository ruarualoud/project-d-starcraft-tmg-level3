#!/usr/bin/env node

// Concrete C82 regression: the owned casualty batch re-copies/re-verifies all
// 1804 fixed map rows when only live pieces change. Not an unrelated test suite.
import assert from "node:assert/strict";
import { Hash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createOfficialMissionMarkerControlUnitBatchV2 } from
  "../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath, evidencePath] = process.argv.slice(2);
assert(capturePath && baselinePath && evidencePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
assert.equal(capture.aggregate.stateRevision, 82);
const envelope = capture.aggregate.envelope;
const state = structuredClone(envelope.state);
state.phase = "cleanup";
state.pieces = state.pieces.filter(piece =>
  ["player1-marine-3", "player2-kerrigan-raptor"].includes(piece.id));
assert.equal(state.pieces.length, 2);
assert.equal(state.board.terrain.length, 1804);
const input = { state, matchBinding: envelope.matchBinding };
const inputHash = hash(input);
const afterCasualty = structuredClone(state.pieces);
const raptor = afterCasualty.find(piece => piece.id === "player2-kerrigan-raptor");
raptor.models[0].isDestroyed = true;
raptor.models[0].isOnField = false;
raptor.currentModels -= 1;
raptor.destroyedModelIds = [...new Set([
  ...(raptor.destroyedModelIds || []), raptor.models[0].id,
])];
const profile = state.officialCombatProfileBundle.profiles.find(entry =>
  entry.recordKey === raptor.officialUnitRecordKey);
raptor.currentSupply = profile.squadProfile.find(tier =>
  tier.minimumModels !== null && raptor.currentModels >= tier.minimumModels
  && raptor.currentModels <= tier.maximumModels).supply;
const movedPieces = structuredClone(state.pieces);
movedPieces[0].models[0].xInches += 0.125;
const badSource = structuredClone(state.pieces);
badSource[0].sourceRecordHash = "altered";
const badSupport = structuredClone(state.pieces);
badSupport[0].models[1].supportTerrainIds = ["missing-terrain"];
const badTerrain = structuredClone(input);
badTerrain.state.board.terrain[0].terrainHash = "altered";

const nativeUpdate = Hash.prototype.update;
const nativeClone = globalThis.structuredClone;
let terrainPieceHashes = 0;
let fullMapClones = 0;
const results = [];
const invalidResults = [];
let batch;
try {
  Hash.prototype.update = function (data, ...args) {
    if (typeof data === "string" && data.startsWith("{") && data.endsWith("}")
      && data.includes('"schema":"starcraft_tmg_official_terrain_piece_v1"')) {
      try {
        if (JSON.parse(data).schema === "starcraft_tmg_official_terrain_piece_v1") {
          terrainPieceHashes += 1;
        }
      } catch { /* Hash fragments are not complete terrain-piece bodies. */ }
    }
    return Reflect.apply(nativeUpdate, this, [data, ...args]);
  };
  globalThis.structuredClone = function (value, ...args) {
    if (value?.state?.board?.terrain?.length === 1804
      || value?.board?.terrain?.length === 1804) fullMapClones += 1;
    return Reflect.apply(nativeClone, this, [value, ...args]);
  };
  const start = performance.now();
  batch = createOfficialMissionMarkerControlUnitBatchV2(input);
  const factoryElapsedMs = performance.now() - start;
  for (const [name, pieces] of [["before_casualty", state.pieces],
    ["after_casualty", afterCasualty], ["empty_field", []],
    ["moved_model", movedPieces], ["restored_pieces", state.pieces]]) {
    const startHashes = terrainPieceHashes;
    const startClones = fullMapClones;
    const start = performance.now();
    const result = batch.resolvePieces(pieces);
    results.push({ name, result, terrainPieceHashes: terrainPieceHashes - startHashes,
      fullMapClones: fullMapClones - startClones,
      elapsedMs: performance.now() - start });
  }
  for (const [corruption, pieces] of [["unit_source", badSource],
    ["model_support", badSupport]]) {
    let failure;
    try { batch.resolvePieces(pieces); } catch (error) { failure = error.message; }
    assert(failure, `${corruption}: changing pieces cannot bypass native validation`);
    invalidResults.push({ corruption, failure });
  }
  let terrainFailure;
  try { createOfficialMissionMarkerControlUnitBatchV2(badTerrain)
    .resolvePieces(state.pieces); } catch (error) { terrainFailure = error.message; }
  assert(terrainFailure);
  invalidResults.push({ corruption: "terrain_hash", failure: terrainFailure });
  results.factoryElapsedMs = factoryElapsedMs;
} finally {
  Hash.prototype.update = nativeUpdate;
  globalThis.structuredClone = nativeClone;
}
assert.equal(hash(input), inputHash, "owned calculation cannot mutate its caller");
assert.deepEqual(results[0].result, results[4].result,
  "restoring the actual pieces must restore the entire original control result");
// Ownership is isolated from later caller map mutation, not caller-supplied trust.
input.state.board.terrain[0].terrainHash = "altered";
assert.deepEqual(batch.resolvePieces(state.pieces), results[0].result);

let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { sourceRevision: 82, inputHash, results, invalidResults };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(baseline.inputHash, inputHash);
for (const [index, row] of results.entries()) {
  assert.equal(row.name, baseline.results[index].name);
  assert.deepEqual(row.result, baseline.results[index].result,
    "ALL control facts and their complete resolution hash must remain unchanged");
}
assert.deepEqual(invalidResults, baseline.invalidResults,
  "the exact native source/support/terrain failure must remain unchanged");
const evidence = { operation: "fixed_map_casualty_preparation", sourceRevision: 82,
  terrainRows: 1804, factoryElapsedMs: results.factoryElapsedMs,
  completeOriginalResultsEqual: true, exactOriginalFailuresEqual: true,
  callerInputsUnchanged: true, ownerIsolatedFromCallerMutation: true,
  results: results.map((row, index) => ({ name: row.name,
    terrainPieceHashes: row.terrainPieceHashes,
    originalTerrainPieceHashes: baseline.results[index].terrainPieceHashes,
    fullMapClones: row.fullMapClones,
    originalFullMapClones: baseline.results[index].fullMapClones,
    elapsedMs: row.elapsedMs, originalElapsedMs: baseline.results[index].elapsedMs,
    controlResolutionHash: row.result.controlResolutionHash })),
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
await writeFile(evidencePath, JSON.stringify(evidence), { mode: 0o600 });
console.log(JSON.stringify(evidence));
const casualtyRow = results.find(row => row.name === "after_casualty");
assert.equal(casualtyRow.terrainPieceHashes, 0,
  "OWNED_CASUALTY_REVALIDATES_THE_UNCHANGED_COMPLETE_MAP");
assert.equal(casualtyRow.fullMapClones, 0,
  "OWNED_CASUALTY_RECOPIES_THE_UNCHANGED_COMPLETE_MAP");
