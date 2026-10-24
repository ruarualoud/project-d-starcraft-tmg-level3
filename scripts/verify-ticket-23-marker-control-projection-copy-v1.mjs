#!/usr/bin/env node
// Concrete redundant full-state copies inside the read-only terrain control view.
// This local captured hypothetical owns no Room/Provider mutation authority.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { enumerateOfficialSelectedRosterRangedActionsV1 } from
  '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { createStarcraftTmgAttackProbabilityBatchV1 } from
  '../packages/online-agent-session/combat-estimation-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { resolveOfficialMissionMarkerControlV2 } from
  '../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs';
import { createOfficialTerrainPieceV1 } from
  '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
const [capturePath, referencePath, baselinePath] = process.argv.slice(2);
assert(capturePath && referencePath && baselinePath);
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const state = structuredClone(capture.aggregate.envelope.state);
const attacker = state.pieces.find(p => p.id === "player1-marine-3");
const targets = ["player2-hydralisk", "player2-kerrigan-raptor"]
  .map(id => state.pieces.find(p => p.id === id));
assert(attacker && targets.every(Boolean), "actual captured units required");
assert.equal(state.board.terrain.length, 1804);
const leader = attacker.models[2];
assert(leader && !leader.isDestroyed && leader.isOnField !== false);
for (const model of attacker.models) {
  model.isDestroyed = model !== leader;
  model.isOnField = model === leader;
}
attacker.destroyedModelIds = attacker.models.filter(m => m.isDestroyed).map(m => m.id);
attacker.currentModels = 1;
const profile = state.officialCombatProfileBundle.profiles
  .find(p => p.recordKey === attacker.officialUnitRecordKey);
attacker.currentSupply = profile.squadProfile.find(t =>
  t.minimumModels !== null && attacker.currentModels >= t.minimumModels
  && attacker.currentModels <= t.maximumModels).supply;
attacker.activatedPhases.assault = false;
attacker.xInches = leader.xInches;
attacker.yInches = leader.yInches;
for (const [index, target] of targets.entries()) {
  const live = target.models.find(m => !m.isDestroyed && m.isOnField !== false);
  assert(live, "actual live target required");
  const dx = leader.xInches + 5 - live.xInches;
  const dy = leader.yInches + index - live.yInches;
  for (const model of target.models) { model.xInches += dx; model.yInches += dy; }
  target.xInches += dx;
  target.yInches += dy;
  target.activatedPhases.assault = false;
}
state.pieces = [attacker, ...targets];
state.phase = "assault";
state.stage = "unit_activation";
state.activeSideKey = attacker.sideKey;
state.players[attacker.sideKey].passedPhases = {
  ...(state.players[attacker.sideKey].passedPhases || {}), assault: false,
};
state.phaseFirstActorByRound = {
  ...(state.phaseFirstActorByRound || {}),
  [`${Number(state.round)}:assault`]: {
    round: Number(state.round), phase: "assault",
    markerHolderSideKey: state.firstPlayerSideKey,
    chosenFirstActorSideKey: attacker.sideKey,
  },
};
state.selectedRosterActivationWindow = null;
state.pendingAction = null;
state.pendingReactionWindow = null;
delete state.pendingCurrentProductRangedSequence;
delete state.pendingCurrentProductRangedCasualtyChoice;
const targetIds = targets.map(p => p.id);
const enumeration = enumerateOfficialSelectedRosterRangedActionsV1(state, {
  sideKey: attacker.sideKey, includeDisabled: true,
});
const domain = enumeration.parameterDomains.find(d =>
  d.pieceId === attacker.id && d.weaponName.toLowerCase() === "c-14 rifle"
  && targetIds.every(id => d.parameterSchema.targetUnitId.enum.includes(id)));
assert(domain, "one actual Rules domain with both targets required");
const input = {
  state, seatKey: attacker.sideKey, currentLegalSpaceDomains: [domain],
  request: { subjectUnitIds: [attacker.id], targetIds, sampleBudgetPerAttack: 36 },
};

const query = { domain, parameters: { targetUnitId: targets[1].id }, sampleBudget: 36 };
const reference = JSON.parse(await readFile(referencePath, 'utf8')).response.result
  .attackEstimates.find(estimate => estimate.targetUnitId === targets[1].id);
assert(reference, 'stored entire original probability output required');
const sourceHash = hash(capture);
const originalHash = hash(state);

const nativeClone = globalThis.structuredClone;
const cloneCounts = { probability: 0, directMutable: 0, directFrozenSpecial: 0 };
let stage = 'probability';
function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function controlInput(value) {
  return { state: value, matchBinding: capture.aggregate.envelope.matchBinding,
    terrainLosDataBundle: value.officialTerrainLosDataBundle };
}
const mutable = nativeClone(state);
mutable.phase = 'cleanup';
const special = nativeClone(mutable);
const ordinaryIndices = special.board.terrain.map((row, index) => ({ row, index }))
  .filter(({row}) => row.terrainKind === 'ordinary').slice(0, 2);
assert.equal(ordinaryIndices.length, 2);
for (const [index, {row, index: terrainIndex}] of ordinaryIndices.entries()) {
  special.board.terrain[terrainIndex] = { ...row, ...createOfficialTerrainPieceV1({
    id: row.id, terrainKind: index === 0 ? 'impassable' : 'ramp',
    size: row.size, footprint: row.footprint,
    standableHorizontalSurface: row.standableHorizontalSurface,
    openings: row.setupAgreement.openings,
  }) };
}
const removed = special.board.terrain.find(row => row.terrainKind === 'grass');
assert(removed);
removed.isRemoved = true;
const mutableHash = hash(mutable);
const specialHash = hash(special);
assert.equal(Object.isFrozen(mutable.pieces[0]), false);
assert.equal(Object.isFrozen(mutable.officialCombatProfileBundle), false);
freezeDeep(special);
assert(Object.isFrozen(special.pieces[0].models[0]));
assert(Object.isFrozen(special.board.terrain));

globalThis.structuredClone = function(value, ...options) {
  if (value?.board?.terrain?.length === 1804 && Array.isArray(value.pieces)
      && value.officialCombatProfileBundle
      && new Error().stack.includes('at terrainAsOrdinaryForControl ')) {
    cloneCounts[stage] += 1;
  }
  // Instrumentation never substitutes the actual native copy operation.
  return Reflect.apply(nativeClone, globalThis, [value, ...options]);
};
let result, mutableControl, frozenSpecialControl;
const started = performance.now();
try {
  const batch = createStarcraftTmgAttackProbabilityBatchV1({ state, sideKey: attacker.sideKey });
  result = batch.estimate(query);
  stage = 'directMutable';
  mutableControl = resolveOfficialMissionMarkerControlV2(controlInput(mutable));
  stage = 'directFrozenSpecial';
  frozenSpecialControl = resolveOfficialMissionMarkerControlV2(controlInput(special));
} finally { globalThis.structuredClone = nativeClone; }
const elapsedMs = performance.now() - started;
assert.deepEqual(result, reference, 'ENTIRE stored probability/loss/marker/engagement output unchanged');
assert.equal(hash(capture), sourceHash);
assert.equal(hash(state), originalHash);
assert.equal(hash(mutable), mutableHash);
assert.equal(hash(special), specialHash);
assert.equal(Object.isFrozen(mutable.pieces[0]), false, 'do not freeze borrowed caller units');
assert.equal(Object.isFrozen(mutable.officialCombatProfileBundle), false, 'do not freeze borrowed catalogue');
assert.equal(frozenSpecialControl.grassTerrainIds.length, 415);
const lossExamples = result.outcomes.lossStateDistribution.flatMap(row => row.casualtySelectionExamples);
assert(lossExamples.length > 1, 'actual distinct casualty contexts required');
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
catch(error) {
  if(error.code !== 'ENOENT') throw error;
  baseline = { sourceHash, originalHash, mutableHash, specialHash, result,
    mutableControl, frozenSpecialControl, cloneCounts, elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
for (const key of ['sourceHash', 'originalHash', 'mutableHash', 'specialHash']) {
  assert.equal(baseline[key], {sourceHash, originalHash, mutableHash, specialHash}[key]);
}
assert.deepEqual(result, baseline.result);
assert.deepEqual(mutableControl, baseline.mutableControl, 'ENTIRE direct native control unchanged');
assert.deepEqual(frozenSpecialControl, baseline.frozenSpecialControl, 'ENTIRE special/removed/frozen control unchanged');
console.log(JSON.stringify({ operation: 'marker_control_readonly_terrain_projection_copies',
  revision: 82, terrainRows: 1804, targetModels: targets[1].currentModels,
  sampleCount: result.outcomes.sampleCount, lossExamples: lossExamples.length,
  originalCloneCounts: baseline.cloneCounts, cloneCounts,
  originalElapsedMs: baseline.elapsedMs, elapsedMs,
  entireStoredProbabilityEqual: true, entireNativeControlEqual: true,
  terrainKindsCovered: ['ordinary', 'grass', 'impassable', 'ramp', 'removed'],
  frozenInputAccepted: true, borrowedInputNotFrozenOrMutated: true,
  providerCalls: 0, originalRoomWrites: 0,
  fullActionPerformanceCertification: false, trainingTruth: false }));
for (const count of Object.values(cloneCounts)) {
  assert.equal(count, 0, 'READONLY_TERRAIN_CONTROL_COPIES_WHOLE_RULES_STATE');
}
