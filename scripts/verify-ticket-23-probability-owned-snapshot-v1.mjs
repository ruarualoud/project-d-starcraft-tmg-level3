// Concrete duplicate owned-state copies in the real probability-batch consumer.
// Complete saved C82 map/army, native domains and default216 samples retained.
// No Room, Provider, action, source mutation or synthetic model positioning.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createStarcraftTmgAttackProbabilityBatchV1 } from
  '../packages/online-agent-session/combat-estimation-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [capturePath, baselinePath, reportPath, mode = 'probability_owner'] = process.argv.slice(2);
assert.ok(['probability_owner', 'reaction_window_snapshot'].includes(mode));
assert(capturePath && baselinePath && reportPath);
const capture = JSON.parse(await readFile(capturePath, 'utf8'));
const sourceHash = hash(capture);
const state = structuredClone(capture.aggregate.envelope.state);
assert.equal(capture.aggregate.stateRevision, 82);
assert.equal(state.board.terrain.length, 1804);
// Match the existing formation comparator's opponent Assault counterfactual.
// Keep every actual model, footprint, position, catalogue and terrain fact.
state.phase = 'assault';
state.stage = 'unit_activation';
state.activeSideKey = 'player1';
state.players.player1.passedPhases = {
  ...(state.players.player1.passedPhases || {}), assault: false,
};
state.phaseFirstActorByRound = {
  ...(state.phaseFirstActorByRound || {}),
  [`${state.round}:assault`]: { round: Number(state.round), phase: 'assault',
    markerHolderSideKey: state.firstPlayerSideKey, chosenFirstActorSideKey: 'player1' },
};
for (const piece of state.pieces) {
  if (piece.sideKey === 'player1') piece.activatedPhases = {
    ...(piece.activatedPhases || {}), assault: false,
  };
}
state.selectedRosterActivationWindow = null;
state.pendingAction = null;
state.pendingReactionWindow = null;
delete state.pendingCurrentProductRangedSequence;
delete state.pendingCurrentProductRangedCasualtyChoice;
const inputHash = hash(state);
const nativeClone = globalThis.structuredClone;
const ownerNames = new Set([
  'createStarcraftTmgAttackProbabilityBatchV1',
  'createOfficialSelectedRosterRangedPreviewBatchV1',
  'createOfficialSelectedRosterCasualtyStrategyBatchV1',
  'createOfficialSelectedRosterRangedWorkChanceResolverV1',
  'createOfficialSelectedRosterRangedQueryBatchV1',
]);
const ownerCopies = [];
const reactionCopies = [];
const chanceDiagnostics = [];
let enumeration;
let estimate;
let selected;
const started = performance.now();
try {
  globalThis.structuredClone = function(value, ...options) {
    // Only direct fixed-state owner allocations, not native terrain/participant
    // preparation, reaction counterfactuals or arbitrary nested clone calls.
    const observedState = value?.state || value;
    const completeState = observedState?.board?.terrain?.length === 1804
      && observedState?.pieces?.length === state.pieces.length
      && observedState.officialAttackProfileCatalogue;
    if (!completeState) return Reflect.apply(nativeClone, globalThis, [value, ...options]);
    const frames = new Error().stack.split('\n');
    const cloneIndex = frames.findIndex(frame => /\bat clone \(/u.test(frame));
    const direct = cloneIndex >= 0 ? frames[cloneIndex + 1] : frames[2];
    const owner = [...ownerNames].find(name => direct?.includes(`at ${name} (`));
    const reactionOwner = direct?.match(/at (openOfficialReactionFamilyWindowV1|openReactionFamilyWindow|apply|createOfficialReactionWindowOpportunityBatchV1) \(/u)?.[1];
    const reactionCopy = Boolean(reactionOwner)
      && direct.includes('official-reaction-family-adapter-v1.mjs');
    const observed = Boolean(owner);
    const copyStarted = performance.now();
    const result = Reflect.apply(nativeClone, globalThis, [value, ...options]);
    if (observed) ownerCopies.push({ owner, elapsedMs: performance.now() - copyStarted });
    if (reactionCopy) reactionCopies.push({ owner: reactionOwner,
      elapsedMs: performance.now() - copyStarted });
    return result;
  };
  const batch = createStarcraftTmgAttackProbabilityBatchV1({ state, sideKey: 'player1' });
  enumeration = batch.enumeration;
  const choices = enumeration.parameterDomains.flatMap(domain =>
    (domain.parameterSchema?.targetUnitId?.enum || []).map(targetUnitId => ({
      domain, targetUnitId,
      modelCount: state.pieces.find(piece => piece.id === targetUnitId)?.currentModels,
    }))).sort((left, right) => left.modelCount - right.modelCount
      || `${left.domain.domainId}:${left.targetUnitId}`.localeCompare(
        `${right.domain.domainId}:${right.targetUnitId}`));
  assert(choices.length > 0, 'captured full state must have a real native enabled attack');
  selected = choices[0];
  assert.equal(hash(state), inputHash);
  assert.equal(Object.isFrozen(state), false, 'factory must not freeze its caller');
  // Mutation AFTER factory creation must never enter its native preview,
  // reaction projection, loss strategy or chance resolver. Estimate once.
  state.board.terrain[0].terrainHash = 'caller-mutated-after-owned-batch-creation';
  state.scores.player1 = -999;
  estimate = batch.estimate({ domain: selected.domain,
    parameters: { targetUnitId: selected.targetUnitId }, sampleBudget: 216,
    observeChanceContext: event => chanceDiagnostics.push(event) });
} finally { globalThis.structuredClone = nativeClone; }
const elapsedMs = performance.now() - started;
const result = { enumeration, selectedDomainId: selected.domain.domainId,
  selectedTargetUnitId: selected.targetUnitId, estimate };
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  baseline = { sourceHash, inputHash, result, ownerCopies, reactionCopies, elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
const report = { operation: 'probability_batch_repeated_owned_state_copy', sourceHash, inputHash,
  mode,
  revision: 82, terrainRows: 1804, actualPieceCount: state.pieces.length,
  originalOwnerCopyCount: baseline.ownerCopies.length,
  ownerCopyCount: ownerCopies.length, ownerCopies,
  ownerCopyElapsedMs: ownerCopies.reduce((total, row) => total + row.elapsedMs, 0),
  originalReactionCompleteCopyCount: (baseline.reactionCopies || []).length,
  reactionCompleteCopyCount: reactionCopies.length,
  reactionCopies,
  elapsedMs, sampleCount: estimate.outcomes.sampleCount,
  entireOriginalResultSame: JSON.stringify(result) === JSON.stringify(baseline.result),
  callerMutationsDoNotChangeOwnedResult: JSON.stringify(result) === JSON.stringify(baseline.result),
  sourceUnchanged: hash(capture) === sourceHash,
  preparedChanceContextReuseCount: chanceDiagnostics.filter(event =>
    event.stage === 'ranged_chance_context_reused_from_preview').length,
  providerCalls: 0, originalRoomWrites: 0, newExperiments: 0,
  wholeActionAccepted: false, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
console.log(JSON.stringify(report));
assert.equal(baseline.sourceHash, sourceHash);
assert.equal(baseline.inputHash, inputHash);
assert.deepEqual(result, baseline.result,
  'ENTIRE original domains, disabled diagnostics, chance, losses, Supply, VP, markers and hashes');
assert.equal(report.sourceUnchanged, true);
assert.equal(report.preparedChanceContextReuseCount, 1);
if (mode === 'reaction_window_snapshot') {
  assert.equal(reactionCopies.length, 1,
    'READONLY_REACTION_WINDOWS_COPY_THE_SAME_COMPLETE_BATTLEFIELD_FOR_EVERY_OPEN_AND_PASS');
} else {
  assert.equal(ownerCopies.length, 1,
    'PROBABILITY_BATCH_DUPLICATES_ITS_SAME_COMPLETE_IMMUTABLE_STATE_IN_SUBFACTORIES');
}
