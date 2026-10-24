#!/usr/bin/env node

// Concrete calculator bug: the same physical casualty projection is rebuilt
// for every reveal and intermediate Precision choice with identical damage.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as ranged from
  "../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import { estimateStarcraftTmgAttackProbabilityV1 } from
  "../packages/online-agent-session/combat-estimation-runtime-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath] = process.argv.slice(2);
assert(capturePath && baselinePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const state = structuredClone(capture.current.state);
const attacker = state.pieces.find(p => p.id === "player1-marine-3");
const target = state.pieces.find(p => p.id === "player2-hydralisk");
assert(attacker && target);
const attackerModel = attacker.models[2];
const targetModel = target.models[0];
for (const piece of [attacker, target]) {
  const retained = piece === attacker ? attackerModel : targetModel;
  for (const model of piece.models) {
    model.isOnField = model === retained;
    model.isDestroyed = model !== retained;
  }
  piece.destroyedModelIds = piece.models.filter(m => m.isDestroyed).map(m => m.id);
  piece.currentModels = 1;
  piece.activatedPhases.assault = false;
  piece.xInches = retained.xInches;
  piece.yInches = retained.yInches;
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
assert(domain);
const parameters = { targetUnitId: target.id };
const preview = ranged.previewOfficialSelectedRosterRangedActionV1(state, domain, parameters);
const inputHash = hash({ state, domain, parameters });
const nativeClone = globalThis.structuredClone;
let casualtyTargetCopies = 0;
globalThis.structuredClone = (value, ...args) => {
  if (value?.id === target.id && Array.isArray(value.models)
    && Object.hasOwn(value, "damageMarker")) casualtyTargetCopies += 1;
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
const resolve = ranged.createOfficialSelectedRosterRangedChanceResolverV1(state, preview.action);
const options = [1, 6].map(value => ({
  chanceReveals: Array(preview.chance.count).fill(value),
  precisionConvertedFailedHitDieIndices: [],
}));
const fullResults = options.map(input => resolve(input));
const precision = fullResults[0].resolution.precisionChoiceDomain;
const converted = precision.failedHitDieIndices.slice(0, precision.maximumConvertedDice);
assert(converted.length > 0);
options.push({ ...options[0], precisionConvertedFailedHitDieIndices: converted });
fullResults.push(resolve(options[2]));
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { inputHash, estimate, fullResults, casualtyTargetCopies, elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(inputHash, baseline.inputHash);
assert.deepEqual(estimate, baseline.estimate,
  "entire exact probability, supply/model/strategic-loss distributions and hash unchanged");
assert.deepEqual(fullResults, baseline.fullResults,
  "ordinary full Rules resolution/casualty domains and Precision stay byte-equivalent");
assert.equal(hash({ state, domain, parameters }), inputHash);
console.log(JSON.stringify({ operation: "fixed_attack_casualty_projection",
  capturedRevision: capture.current.stateRevision, casualtyTargetCopies,
  originalCasualtyTargetCopies: baseline.casualtyTargetCopies,
  elapsedMs, originalElapsedMs: baseline.elapsedMs,
  fullOriginalEstimateEqual: true, fullOriginalRulesResultsEqual: true,
  estimateHash: estimate.estimateHash, providerCalls: 0, originalRoomWrites: 0 }));
assert(casualtyTargetCopies <= 12,
  `PROBABILITY_REBUILDS_SAME_CASUALTY_GEOMETRY:${casualtyTargetCopies}`);
assert.equal(typeof resolve.resolvePool, "function");
assert.equal(typeof resolve.casualtyDomainForResolution, "function");
for (let i = 0; i < options.length; i += 1) {
  const pool = resolve.resolvePool(options[i]);
  assert.deepEqual(pool, { context: fullResults[i].context,
    resolution: fullResults[i].resolution });
  assert.deepEqual(resolve.casualtyDomainForResolution(pool.resolution),
    fullResults[i].casualtyDomain);
}
console.log(JSON.stringify({ status: "passed", allDiceAndPrecisionStillResolved: true,
  fullRulesResultsPreserved: true, providerCalls: 0, originalRoomWrites: 0,
  trainingTruth: false }));
