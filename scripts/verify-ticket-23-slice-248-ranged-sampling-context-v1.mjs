#!/usr/bin/env node

// Concrete C formation bottleneck: fixed ranged geometry was rebuilt per
// probability sample (and again for Precision). Isolate the real r36 cards,
// terrain and runtime into one model per side; no original Room is opened.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as ranged from
  "../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import { estimateStarcraftTmgAttackProbabilityV1 } from
  "../packages/online-agent-session/combat-estimation-runtime-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath] = process.argv.slice(2);
assert(capturePath && baselinePath, "retained capture and baseline required");
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const state = structuredClone(capture.current.state);
const attacker = state.pieces.find(p => p.id === "player1-marine-3");
const target = state.pieces.find(p => p.id === "player2-hydralisk");
assert(attacker && target);
const attackerModel = attacker.models[2]; // C-14, actual Stimpack Precision.
const targetModel = target.models[0];
for (const piece of [attacker, target]) {
  const retainedModel = piece === attacker ? attackerModel : targetModel;
  for (const model of piece.models) {
    model.isDestroyed = model !== retainedModel;
    model.isOnField = model === retainedModel;
  }
  piece.destroyedModelIds = piece.models.filter(m => m.isDestroyed).map(m => m.id);
  piece.currentModels = 1;
  piece.activatedPhases.assault = false;
  piece.xInches = retainedModel.xInches;
  piece.yInches = retainedModel.yInches;
}
targetModel.xInches = attackerModel.xInches + 5;
targetModel.yInches = attackerModel.yInches;
target.xInches = targetModel.xInches;
target.yInches = targetModel.yInches;
state.pieces = [attacker, target];
state.activeSideKey = "player1";
state.phase = "assault";
state.stage = "unit_activation";
state.pendingAction = null;
state.pendingReactionWindow = null;
state.selectedRosterActivationWindow = null;
delete state.pendingCurrentProductRangedSequence;
delete state.pendingCurrentProductRangedCasualtyChoice;
const domain = ranged.enumerateOfficialSelectedRosterRangedActionsV1(state, {
  sideKey: "player1", includeDisabled: true,
}).parameterDomains.find(d => d.weaponName.toLowerCase() === "c-14 rifle");
assert(domain, "real card/domain must remain executable in the minimized geometry");
const parameters = { targetUnitId: target.id };
const preview = ranged.previewOfficialSelectedRosterRangedActionV1(
  state, domain, parameters);
const inputHash = hash({ state, domain, parameters });
const nativeClone = globalThis.structuredClone;
let terrainArrayCopies = 0;
globalThis.structuredClone = (value, ...args) => {
  if (Array.isArray(value) && value.length === state.board.terrain.length
    && value[0]?.schema === "starcraft_tmg_official_terrain_piece_v1") {
    terrainArrayCopies += 1;
  }
  return nativeClone(value, ...args);
};
const started = performance.now();
let estimate;
try {
  estimate = estimateStarcraftTmgAttackProbabilityV1({
    state, domain, parameters, sampleBudget: 36,
  });
} finally { globalThis.structuredClone = nativeClone; }
const elapsedMs = performance.now() - started;
const rows = [1, 3, 6].map(value => ({
  chanceReveals: Array(preview.chance.count).fill(value),
  precisionConvertedFailedHitDieIndices: [],
}));
const prepare = ranged.createOfficialSelectedRosterRangedChanceResolverV1;
const privateState = nativeClone(state);
const privateAction = nativeClone(preview.action);
const resolve = prepare ? prepare(privateState, privateAction)
  : options => ranged.resolveOfficialSelectedRosterRangedChanceV1(
    privateState, privateAction, options);
const results = rows.map(options => resolve(options));
const first = results[0].resolution.precisionChoiceDomain;
const precisionOptions = { ...rows[0], precisionConvertedFailedHitDieIndices:
  first.failedHitDieIndices.slice(0, first.maximumConvertedDice) };
assert(precisionOptions.precisionConvertedFailedHitDieIndices.length > 0,
  "exercise the actual second Precision resolution");
results.push(resolve(precisionOptions));
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { inputHash, terrainArrayCopies, elapsedMs, estimate, results };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(inputHash, baseline.inputHash);
assert.deepEqual(estimate, baseline.estimate,
  "entire probability, loss distribution, strategic consequences and hash must match");
assert.deepEqual(results, baseline.results,
  "entire scalar context/resolution/casualty domains must match, including Precision");
assert.equal(hash({ state, domain, parameters }), inputHash);
console.log(JSON.stringify({ operation: "actual_probability_estimator",
  minimizedFromRevision: capture.current.stateRevision,
  terrainRows: state.board.terrain.length, terrainArrayCopies, elapsedMs,
  originalTerrainArrayCopies: baseline.terrainArrayCopies,
  originalElapsedMs: baseline.elapsedMs, estimateHash: estimate.estimateHash,
  fullOriginalEstimateEqual: true, fullOriginalResolutionsEqual: true,
  providerCalls: 0, originalRoomWrites: 0 }));
assert(terrainArrayCopies <= 10,
  `RANGED_SAMPLING_REPEATED_GEOMETRY:${terrainArrayCopies}`);
assert.equal(typeof prepare, "function");
// A prepared resolver owns a private state/action snapshot; later caller
// mutations cannot silently change one fixed probability experiment.
privateState.pieces[0].models[2].xInches += 1;
privateAction.targetId = "missing-target";
assert.deepEqual(resolve(rows[0]), results[0]);
assert.throws(() => resolve({ ...rows[0],
  precisionConvertedFailedHitDieIndices: [999] }),
  /SELECTED_RANGED_PRECISION_SELECTION_INVALID/);
console.log(JSON.stringify({ status: "passed", privateSnapshotPreserved: true,
  invalidPrecisionRejected: true, providerCalls: 0, originalRoomWrites: 0,
  trainingTruth: false }));
