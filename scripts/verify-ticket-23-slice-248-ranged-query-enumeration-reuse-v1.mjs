#!/usr/bin/env node

// Concrete formation caller bug: one unchanged counterfactual enumeration was
// discarded, then every probability preview enumerated the entire side again.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as combat from
  "../packages/online-agent-session/combat-estimation-runtime-v1.mjs";
import * as ranged from
  "../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath] = process.argv.slice(2);
assert(capturePath && baselinePath);
const captured = JSON.parse(await readFile(capturePath, "utf8"));
const state = structuredClone(captured.current.state);
const attacker = state.pieces.find(p => p.id === "player1-marine-3");
const targets = ["player2-hydralisk"].map(id =>
  state.pieces.find(p => p.id === id));
assert(attacker && targets.every(Boolean));
const attackerModel = attacker.models[2];
for (const piece of [attacker, ...targets]) {
  const live = piece === attacker ? attackerModel : piece.models[0];
  for (const model of piece.models) {
    model.isDestroyed = model !== live;
    model.isOnField = model === live;
  }
  piece.destroyedModelIds = piece.models.filter(m => m.isDestroyed).map(m => m.id);
  piece.currentModels = 1;
  piece.activatedPhases.assault = false;
  piece.xInches = live.xInches;
  piece.yInches = live.yInches;
}
for (let i = 0; i < targets.length; i += 1) {
  const live = targets[i].models[0];
  live.xInches = attackerModel.xInches + 5;
  live.yInches = attackerModel.yInches + i * 5;
  targets[i].xInches = live.xInches;
  targets[i].yInches = live.yInches;
}
state.pieces = [attacker, ...targets];
state.phase = "assault";
state.stage = "unit_activation";
state.activeSideKey = attacker.sideKey;
state.selectedRosterActivationWindow = null;
state.pendingAction = null;
state.pendingReactionWindow = null;
delete state.pendingCurrentProductRangedSequence;
delete state.pendingCurrentProductRangedCasualtyChoice;
const inputHash = hash(state);
const nativeClone = globalThis.structuredClone;
let terrainArrayCopies = 0;
globalThis.structuredClone = (value, ...args) => {
  if (Array.isArray(value) && value.length === state.board.terrain.length
    && value[0]?.schema === "starcraft_tmg_official_terrain_piece_v1") {
    terrainArrayCopies += 1;
  }
  return nativeClone(value, ...args);
};
let enumeration;
let inputs;
let estimates;
let queryCopies;
let preparationCopies;
let preparationMs;
let queryMs;
const prepare = combat.createStarcraftTmgAttackProbabilityBatchV1;
try {
  const start = performance.now();
  const batch = prepare ? prepare({ state, sideKey: attacker.sideKey }) : null;
  enumeration = batch?.enumeration
    || ranged.enumerateOfficialSelectedRosterRangedActionsV1(state, {
      sideKey: attacker.sideKey, includeDisabled: true,
    });
  preparationCopies = terrainArrayCopies;
  preparationMs = performance.now() - start;
  const domain = enumeration.parameterDomains.find(d =>
    d.weaponName.toLowerCase() === "c-14 rifle");
  assert(domain);
  assert(domain.parameterSchema.targetUnitId.enum.includes(targets[0].id),
    "real card target must stay in the complete current domain");
  inputs = [36, 42].map(sampleBudget => ({ domain,
    parameters: { targetUnitId: targets[0].id }, sampleBudget }));
  const queryStart = performance.now();
  estimates = inputs.map(input => batch ? batch.estimate(input)
    : combat.estimateStarcraftTmgAttackProbabilityV1({ state, ...input }));
  queryMs = performance.now() - queryStart;
  queryCopies = terrainArrayCopies - preparationCopies;
} finally { globalThis.structuredClone = nativeClone; }
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { inputHash, enumeration, estimates, queryCopies,
    preparationCopies, preparationMs, queryMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(inputHash, baseline.inputHash);
assert.deepEqual(enumeration, baseline.enumeration,
  "complete original candidates/domains/disabled diagnostics and hashes stay equal");
assert.deepEqual(estimates, baseline.estimates,
  "all samples, probability, strategic losses and hashes stay equal for both queries");
assert.equal(hash(state), inputHash);
console.log(JSON.stringify({ operation: "shared_fixed_state_attack_queries",
  originalCapturedRevision: captured.current.stateRevision,
  terrainRows: state.board.terrain.length, queryCount: inputs.length,
  preparationCopies, queryCopies, preparationMs, queryMs,
  originalQueryCopies: baseline.queryCopies,
  originalQueryMs: baseline.queryMs,
  fullOriginalEnumerationEqual: true, fullOriginalEstimatesEqual: true,
  providerCalls: 0, originalRoomWrites: 0 }));
assert(queryCopies <= inputs.length * 2,
  `RANGED_QUERY_REENUMERATES_FIXED_SIDE:${queryCopies}`);
assert.equal(typeof prepare, "function");
// A new state needs a new batch; later caller mutation cannot drift this one.
const mutable = nativeClone(state);
const prepared = prepare({ state: mutable, sideKey: attacker.sideKey });
mutable.pieces[0].models[2].xInches += 2;
assert.deepEqual(prepared.estimate(inputs[0]), estimates[0]);
const staleDomain = nativeClone(inputs[0].domain);
staleDomain.constraints.targetPlans[0].attackPlanHash = "altered";
assert.throws(() => prepared.estimate({ ...inputs[0], domain: staleDomain }),
  /SELECTED_RANGED_PARAMETER_DOMAIN_STALE/);
assert.throws(() => prepared.estimate({ ...inputs[0],
  parameters: { targetUnitId: "missing-target" } }),
  /ATTACK_PROBABILITY_TARGET_REQUIRED|SELECTED_RANGED_TARGET_PARAMETER_INVALID/);
console.log(JSON.stringify({ status: "passed", privateSnapshotPreserved: true,
  staleDomainRejected: true, invalidTargetRejected: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
