#!/usr/bin/env node

// Reproduce the r71 casualty/control CPU hotspot with actual frozen model facts.
// Mission control consumes model sizes, not one complete terrain proof per model.
import assert from "node:assert/strict";
import { Hash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolveOfficialMissionMarkerControlV2 as control } from
  "../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs";
import * as elevation from
  "../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath] = process.argv.slice(2);
assert(capturePath && baselinePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const state = structuredClone(capture.current.state);
state.phase = "cleanup";
state.pieces = state.pieces.filter(p => ["player1-goliath-2", "player2-hydralisk"]
  .includes(p.id));
assert.equal(state.pieces.length, 2);
assert.equal(state.board.terrain.length, 1804);
const afterCasualty = structuredClone(state);
const hydra = afterCasualty.pieces.find(p => p.id === "player2-hydralisk");
hydra.models[0].isDestroyed = true;
hydra.models[0].isOnField = false;
hydra.currentModels = 1;
hydra.destroyedModelIds = [...new Set([
  ...(hydra.destroyedModelIds || []), hydra.models[0].id,
])];
const profile = afterCasualty.officialCombatProfileBundle.profiles
  .find(p => p.recordKey === hydra.officialUnitRecordKey);
hydra.currentSupply = profile.squadProfile.find(tier => tier.minimumModels !== null
  && hydra.currentModels >= tier.minimumModels
  && hydra.currentModels <= tier.maximumModels).supply;
assert.equal(hydra.currentSupply, 1);
const emptyState = structuredClone(state);
emptyState.pieces = [];

const nativeUpdate = Hash.prototype.update;
const results = [];
try {
  for (const [name, inputState] of [["before_casualty", state],
    ["after_casualty", afterCasualty], ["no_active_models", emptyState]]) {
    const inputHash = hash(inputState);
    let discardedFullSizeResultHashes = 0;
    let terrainPieceHashes = 0;
    Hash.prototype.update = function (data, ...args) {
      if (typeof data === "string") {
        if (data.includes('"schema":"starcraft_tmg_official_effective_size_result_v1"')
          && JSON.parse(data).schema === "starcraft_tmg_official_effective_size_result_v1") {
          discardedFullSizeResultHashes += 1;
        }
        if (data.includes('"schema":"starcraft_tmg_official_terrain_piece_v1"')
          && JSON.parse(data).schema === "starcraft_tmg_official_terrain_piece_v1") {
          terrainPieceHashes += 1;
        }
      }
      return Reflect.apply(nativeUpdate, this, [data, ...args]);
    };
    const started = performance.now();
    const result = control({ state: inputState, matchBinding: capture.current.matchBinding });
    const elapsedMs = performance.now() - started;
    Hash.prototype.update = nativeUpdate;
    assert.equal(hash(inputState), inputHash);
    const activeModels = inputState.pieces.flatMap(p => p.models.filter(m =>
      m.isOnField === true && m.isDestroyed !== true));
    results.push({ name, inputHash, activeModelCount: activeModels.length,
      result, discardedFullSizeResultHashes, terrainPieceHashes, elapsedMs });
  }
} finally { Hash.prototype.update = nativeUpdate; }

const invalidResults = [];
for (const corruption of ["second_model_support", "unit_source", "terrain_hash"]) {
  const invalid = structuredClone(state);
  if (corruption === "second_model_support") {
    invalid.pieces[1].models[1].supportTerrainIds = ["missing-terrain"];
  } else if (corruption === "unit_source") {
    invalid.pieces[1].sourceRecordHash = "altered";
  } else invalid.board.terrain[0].terrainHash = "altered";
  let failure = null;
  try { control({ state: invalid, matchBinding: capture.current.matchBinding }); }
  catch (error) { failure = String(error.message); }
  assert(failure, `${corruption}: invalid Rules input must still be rejected`);
  invalidResults.push({ corruption, failure });
}

let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { sourceRevision: capture.current.stateRevision, results, invalidResults };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(capture.current.stateRevision, baseline.sourceRevision);
for (const [index, result] of results.entries()) {
  assert.equal(result.inputHash, baseline.results[index].inputHash);
  assert.deepEqual(result.result, baseline.results[index].result,
    "ENTIRE original mission control result and resolution hash must remain equal");
}
assert.deepEqual(invalidResults, baseline.invalidResults);
console.log(JSON.stringify({ operation: "mission_control_model_size_context_reuse",
  sourceRevision: capture.current.stateRevision, terrainRows: state.board.terrain.length,
  results: results.map((result, index) => ({ name: result.name,
    activeModelCount: result.activeModelCount,
    discardedFullSizeResultHashes: result.discardedFullSizeResultHashes,
    originalDiscardedFullSizeResultHashes: baseline.results[index].discardedFullSizeResultHashes,
    terrainPieceHashes: result.terrainPieceHashes,
    originalTerrainPieceHashes: baseline.results[index].terrainPieceHashes,
    elapsedMs: result.elapsedMs, originalElapsedMs: baseline.results[index].elapsedMs,
    controlResolutionHash: result.result.controlResolutionHash })),
  completeOriginalMissionResultsEqual: true, originalInputRejectionsEqual: true,
  providerCalls: 0, originalRoomWrites: 0 }));
assert(results.every(r => r.discardedFullSizeResultHashes === 0),
  "MISSION_CONTROL_REBUILDS_UNUSED_FULL_TERRAIN_SIZE_PROOF_PER_MODEL");
for (const result of results.filter(r => r.activeModelCount > 0)) {
  assert(result.terrainPieceHashes < baseline.results.find(r => r.name === result.name)
    .terrainPieceHashes, "MISSION_CONTROL_REVALIDATES_TERRAIN_PER_MODEL");
}

// The new batch owns its data and uses the existing scalar's exact model projection.
const subjects = state.pieces.flatMap(p => p.models.filter(m => m.isOnField === true
  && m.isDestroyed !== true).map(m => ({ unitId: p.id, modelId: m.id })));
const ordinaryState = structuredClone(state);
// The real fixture contains special grass, adapted privately by mission control.
// Direct subject equivalence uses the existing ordinary-only elevation seam.
ordinaryState.board.terrain = ordinaryState.board.terrain.filter(t =>
  t.terrainKind === "ordinary");
const originalSubjectResults = subjects.map(subject => elevation.evaluateOfficialEffectiveSizeV1({
  state: ordinaryState, dataBundle: state.officialTerrainLosDataBundle,
  subjectKind: "model", ...subject,
}).subject);
const snapshotHash = hash(ordinaryState);
const batch = elevation.evaluateOfficialEffectiveSizeSubjectsBatchV1({
  state: ordinaryState, dataBundle: state.officialTerrainLosDataBundle, subjects,
});
assert.deepEqual(batch, originalSubjectResults);
assert.equal(hash(ordinaryState), snapshotHash);
assert(Object.isFrozen(batch) && batch.every(Object.isFrozen));
ordinaryState.pieces[0].models[0].xInches += 1;
assert.deepEqual(batch, originalSubjectResults, "batch results must own their snapshot");
console.log(JSON.stringify({ status: "passed", exactScalarSubjectsEqual: true,
  callerMutationIsolated: true, trainingTruth: false }));
