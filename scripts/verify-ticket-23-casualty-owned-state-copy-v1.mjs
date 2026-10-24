#!/usr/bin/env node
// Concrete redundant full-state clones during a single real probability kernel.
// This local captured hypothetical owns no Room/Provider mutation authority.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { enumerateOfficialSelectedRosterRangedActionsV1 } from
  '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { createStarcraftTmgAttackProbabilityBatchV1 } from
  '../packages/online-agent-session/combat-estimation-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [capturePath, referencePath, baselinePath, verificationMode] = process.argv.slice(2);
const chanceContextOnly = verificationMode === 'chance_context_reuse';
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

const chanceContextEvents = [];
const query = { domain, parameters: { targetUnitId: targets[1].id }, sampleBudget: 36,
  ...(chanceContextOnly ? { observeChanceContext: event => chanceContextEvents.push(event) } : {}) };
const reference = JSON.parse(await readFile(referencePath, 'utf8')).response.result
  .attackEstimates.find(estimate => estimate.targetUnitId === targets[1].id);
assert(reference, 'stored entire original probability output required');
const sourceHash = hash(capture);
const originalHash = hash(state);
const cloneCounts = { casualtyProjectedState: 0, projectMissionMarkerControl: 0,
  terrainAsOrdinaryForControl: 0, otherFullStateCopies: 0 };
const nativeClone = globalThis.structuredClone;
globalThis.structuredClone = function(value, ...options) {
  if(value?.board?.terrain?.length === 1804 && Array.isArray(value.pieces)
    && value.officialCombatProfileBundle) {
    const stack = new Error().stack;
    // Every observed clone still executes the actual native clone unchanged.
    if(stack.includes('at clone ') && stack.includes('at casualtyProjectedState '))
      cloneCounts.casualtyProjectedState += 1;
    else if(stack.includes('at terrainAsOrdinaryForControl '))
      cloneCounts.terrainAsOrdinaryForControl += 1;
    else if(stack.includes('at clone ') && stack.includes('at projectMissionMarkerControl '))
      cloneCounts.projectMissionMarkerControl += 1;
    else cloneCounts.otherFullStateCopies += 1;
  }
  return Reflect.apply(nativeClone, globalThis, [value, ...options]);
};
let result;
const started = performance.now();
try { const batch = createStarcraftTmgAttackProbabilityBatchV1({ state, sideKey: attacker.sideKey });
  result = batch.estimate(query);
} finally { globalThis.structuredClone = nativeClone; }
const elapsedMs = performance.now() - started;
assert.deepEqual(result, reference, 'ENTIRE actual stored probability, losses and hashes unchanged');
assert.equal(hash(capture), sourceHash);
assert.equal(hash(state), originalHash);
const lossExamples = result.outcomes.lossStateDistribution.flatMap(row => row.casualtySelectionExamples);
assert(lossExamples.length > 1, 'multiple genuine casualty contexts needed');
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath,'utf8')); }
catch(error) { if(error.code !== 'ENOENT') throw error;
  baseline = { sourceHash, originalHash, result, cloneCounts, elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 }); }
assert.equal(baseline.sourceHash, sourceHash);
assert.equal(baseline.originalHash, originalHash);
assert.deepEqual(result, baseline.result);
console.log(JSON.stringify({ operation: 'casualty_owned_snapshot_projection_copies',
  revision: 82, terrainRows: 1804, targetModels: targets[1].currentModels,
  sampleCount: result.outcomes.sampleCount, lossExamples: lossExamples.length,
  originalCloneCounts: baseline.cloneCounts, cloneCounts,
  originalElapsedMs: baseline.elapsedMs, elapsedMs,
  entireOriginalProbabilityEqual: true, sourceUnchanged: true,
  providerCalls: 0, originalRoomWrites: 0,
  fullActionPerformanceCertification: false, trainingTruth: false }));
if (chanceContextOnly) {
  const constructed = chanceContextEvents.filter(event =>
    event.stage === 'ranged_chance_context_constructed');
  const reused = chanceContextEvents.filter(event =>
    event.stage === 'ranged_chance_context_reused_from_preview');
  console.log(JSON.stringify({ operation: 'ordinary_probability_preview_chance_context',
    constructedContextCount: constructed.length, reusedContextCount: reused.length,
    constructionElapsedMs: constructed.map(event => event.completedAtMs - event.startedAtMs),
    sameEntireStoredProbability: true, oldCopyGateRepeated: false,
    sampleCount: result.outcomes.sampleCount, terrainRows: 1804,
    sourceUnchanged: true, providerCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
  assert.equal(constructed.length, 0,
    'ORDINARY_PROBABILITY_BATCH_RECONSTRUCTS_ITS_ALREADY_PREVIEWED_CONTEXT');
  assert.equal(reused.length, 1, 'one complete native context must be consumed');
} else {
  assert.equal(cloneCounts.casualtyProjectedState, 0,
    'OWNED_CASUALTY_CHOICES_REPEATEDLY_CLONE_WHOLE_RULES_STATE');
  assert.equal(cloneCounts.projectMissionMarkerControl, 0,
    'OWNED_MARKER_PROJECTION_REPEATEDLY_CLONES_WHOLE_RULES_STATE');
}
