import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2,
  bindOfficialReleaseRulesRuntimeV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_PARAMETER_KIND,
  OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE }
  from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const previous = parent + 'tank-template-attack/';
const directory = path.join(root, parent, 'ranged-precision');
const releaseId = 'wave3-u83-c84-r50-ranged-precision-v1';
const roomId = 'wave3-goliath-precision';
const definitionIds = ['unit:goliath/ares-class-targeting-system-any-phase@1'];
const query = { queryKind: 'ranged_precision_preview', pieceId: 'goliath-1', weaponName: 'Autocannon',
  parameters: { targetUnitId: 'opponent-marines' } };
const read = async name => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'));
const ref = name => path.relative(root, path.join(directory, name));
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return ref(name);
}
function registry(directory) {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { store, resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry(path.join(root, previous));
  try {
    return await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-tank-template-attack-v1', purpose: 'ability_component' });
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry(directory);
  try {
    const context = await product.resolver.resolve({ releaseId, purpose: 'ability_component' });
    const authority = await read(ref('authority.json'));
    const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, definitionIds,
      spatialState: authority.state, includeRanged: true, includePrecisionChoices: true });
    assert.equal(runtime.descriptor.runtimeHash, context.resources.rulesRuntime.runtimeHash);
    const native = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { ...product, context, authority, runtime, native, close: () => { native.close(); product.close(); } };
  } catch (error) { product.close(); throw error; }
}
function declaredScene(setup, original) {
  const state = { ...structuredClone(original), ...setup.state };
  state.round = 2;
  state.phase = 'assault';
  state.activeSideKey = 'player1';
  state.log = [];
  state.phaseFirstActorByRound = { '2:assault': { round: 2, phase: 'assault', chosenFirstActorSideKey: 'player1' } };
  state.board = structuredClone(original.board);
  state.board.tokens = [];
  state.board.effectMarkers = [];
  state.board.terrain = [];
  for (const piece of state.pieces) {
    piece.isOnField = true;
    piece.isInReserves = false;
    for (const [index, model] of piece.models.entries()) {
      model.isOnField = true;
      model.xInches = piece.sideKey === 'player1' ? 10 : 20 + index % 3 * 1.4;
      model.yInches = piece.sideKey === 'player1' ? 10 : 10 + Math.floor(index / 3) * 1.4;
    }
  }
  return state;
}

await fs.mkdir(directory, { recursive: true });
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
  sourceRef: previous + 'authority.json', contractVersion: 'T28-W3-07-ranged-native-precision-v1',
}, steps: [
  { name: 'read', openProduct: sourceProduct, check: async context => {
    const source = await read(previous + 'authority.json');
    const selection = await read(parent + 'tank-spatial/selection.json');
    const legacy = createOfficialCharacteristicStatusComponentRuntimeV2({ context,
      definitionIds: selection.definitionIds, spatialState: source.state, includeRanged: true, includeTemplateAttacks: true });
    assert.deepEqual(legacy.descriptor, await read(previous + 'runtime.json'));
    const feature = context.dataset.recordsByKey['army_units:goliath'].payload.upgrades
      .find(row => row.name === 'Ares-Class Targeting System');
    assert.equal(feature.costS, 20);
    assert.match(feature.description, /PRECISION \(1\)/);
    const glossary = Object.entries(context.dataset.recordsByKey).find(([key, row]) =>
      key.startsWith('rules_sections:') && JSON.stringify(row.payload).includes('Treat them as successful'));
    assert.ok(glossary);
    const evidenceRef = await save('read.json', { legacy25DescriptorUnchanged: true,
      feature, glossaryRecordKey: glossary[0], glossaryPayloadHash: glossary[1].payloadHash });
    return { evidenceRef, checkpointRef: evidenceRef };
  } },
  { name: 'compile', repairRef: ref('fixture-source-repair.json'), openProduct: sourceProduct, check: async context => {
    const old = await read(previous + 'authority.json');
    const candidate = sideKey => ({ sideKey, scaleId: 'Skirmish', mineralBudget: 500,
      factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: [], units: [] });
    const candidatesBySide = { player1: candidate('player1'), player2: candidate('player2') };
    candidatesBySide.player1.tacticalCardRecordKeys = ['tactical_cards:factory__tech_lab_'];
    candidatesBySide.player1.units = [{ unitInstanceId: 'goliath-1', recordKey: 'army_units:goliath',
      compositionKind: 'small', upgrades: [{ upgradeName: 'Ares-Class Targeting System' }] }];
    candidatesBySide.player2.units = [{ unitInstanceId: 'opponent-marines', recordKey: 'army_units:marine',
      compositionKind: 'small', upgrades: [] }];
    const legacy = await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json');
    const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
      legacyDisclosurePolicy: legacy.state.officialRosterDisclosureDataBundle });
    const state = declaredScene(setup, old.state);
    const provisional = createOfficialCharacteristicStatusComponentRuntimeV2({ context, definitionIds,
      spatialState: state, includeRanged: true, includePrecisionChoices: true });
    state.officialCharacteristicStatusFamilySourceBundle = provisional.bundle;
    const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, definitionIds,
      spatialState: state, includeRanged: true, includePrecisionChoices: true });
    assert.equal(runtime.descriptor.runtimeVersion, '2.6.0');
    assert.ok(runtime.descriptor.executorManifest[0].actionTypes.includes('choose_ranged_precision_hits'));
    const preview = runtime.query(state, query);
    assert.equal(preview.result.action.sourceAction.precisionValue, 1);
    assert.equal(preview.result.action.actionType, 'roll_ranged_attack_hit_pool');
    assert.equal(preview.result.action.chance.layout.armour, undefined);
    await save('runtime.json', runtime.descriptor);
    const manifest = context.manifest;
    const next = createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef,
      snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
      referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
      components: { ...manifest.components, rulesRuntime: { ref: ref('runtime.json'), version: '2.6.0',
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } });
    const product = registry(directory);
    try {
      product.resolver.register(next);
      const resolved = await product.resolver.resolve({ releaseId, purpose: 'ability_component' });
      await save('authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state,
        scenario: { battlefieldPlacementAndRoundAreDeclared: true, deploymentActionsExecuted: false,
          completeMatch: false, map: 'empty_declared_geometry', pointDefenseSourcePresent: false,
          precisionSource: definitionIds[0], templatePrecisionPositiveCase: false } }));
    } finally { product.close(); }
    const evidenceRef = await save('compile.json', { candidatesBySide, audits: setup.state.armyCompositionUpgradeAuditsBySide,
      runtimeHash: runtime.descriptor.runtimeHash, definitionIds, sourceBoundPrecision: 1, preview });
    return { evidenceRef, checkpointRef: ref('authority.json') };
  } },
  { name: 'consume', openProduct, check: async ({ native, authority, runtime }) => {
    const credentials = await native.create(roomId, authority);
    const before = await native.store.loadRoom(roomId);
    const preview = runtime.query(before.envelope.state, query);
    assert.deepEqual((await native.store.loadRoom(roomId)).envelope, before.envelope);
    const committed = await native.commit({ roomId, credential: credentials.player1, operationKey: 'hit-pool',
      select: row => row.actionType === 'ranged_attack' && row.weaponName === 'Autocannon',
      parameters: () => query.parameters });
    assert.deepEqual(committed.preview.core.action, preview.result.action);
    assert.ok(committed.preview.core.chanceTicket);
    const after = await native.store.loadRoom(roomId);
    const pending = after.envelope.state.pendingOfficialRangedPrecisionChoice;
    assert.ok(pending);
    assert.equal(pending.stage, 'choice');
    assert.ok(pending.maximumConvertedDice > 0);
    assert.equal(after.envelope.state.pieces.find(row => row.id === 'opponent-marines').currentModels, 6);
    assert.deepEqual(pending.prefixRolls.slice(0, pending.hitRolls.length), pending.hitRolls);
    assert.equal(pending.defenceChance.layout.armour, pending.hitRolls.length);
    await save('hit-checkpoint.json', { envelope: after.envelope, sourceRoomId: roomId });
    const evidenceRef = await save('consume.json', { revision: after.stateRevision, queryAndNativeActionEqual: true,
      hitRolls: pending.hitRolls, failedHitDieIndices: pending.failedHitDieIndices,
      maximumConvertedDice: pending.maximumConvertedDice, defenceDiceGenerated: false,
      operationIdempotent: committed.idempotentReplayVerified });
    return { evidenceRef, checkpointRef: ref('hit-checkpoint.json') };
  } },
  { name: 'successor', repairRef: ref('casualty-routing-repair.json'), openProduct, check: async ({ native, authority, runtime }) => {
    const credentials = await native.create(roomId, authority);
    let current = await native.store.loadRoom(roomId);
    const hitEnvelope = (await read(ref('hit-checkpoint.json'))).envelope;
    const hitState = hitEnvelope.state;
    // A failed later consumer keeps the committed prefix. Read its signed
    // historical Envelope instead of rewinding or repurchasing the dice.
    const source = await native.store.loadReplayBundle(roomId);
    const prefixReceipts = source.privateJournal.filter(row => row.payload.type === 'accepted_transition')
      .map(row => row.payload.payload.receipt);
    const hitReplay = native.engine.replay({ initialEnvelope: source.initialEnvelope, journal: prefixReceipts.slice(0, 1) });
    assert.equal(hitReplay.ok, true, JSON.stringify(hitReplay));
    assert.deepEqual(hitReplay.envelope, hitEnvelope);
    const pending = hitState.pendingOfficialRangedPrecisionChoice;
    const legal = { ok: true, legalSpace: native.engine.legalSpace(hitEnvelope,
      { internalServerAuthority: true, sideKey: 'player1' }) };
    assert.equal(legal.ok, true, JSON.stringify(legal));
    assert.equal(legal.legalSpace.parameterDomains.length, 1);
    const domain = legal.legalSpace.parameterDomains[0];
    assert.equal(domain.actionType, 'choose_ranged_precision_hits');
    const failed = pending.failedHitDieIndices[0];
    assert.equal(domain.constraints.defenceDiceRolled, false);
    const opponent = { legalSpace: native.engine.legalSpace(hitEnvelope,
      { internalServerAuthority: true, sideKey: 'player2' }) };
    assert.equal(opponent.legalSpace.parameterDomains.length, 0);
    for (const parameters of [
      { convertedFailedHitDieIndices: [failed, failed] },
      { convertedFailedHitDieIndices: [pending.hitRolls.length] },
      { convertedFailedHitDieIndices: [], stateRef: 'caller_owned' },
    ]) assert.throws(() => runtime.instantiate(hitState, domain, parameters), /PRECISION_SELECTION_INVALID/);
    const altered = structuredClone(hitState);
    altered.pieces[0].models[0].xInches += 1;
    assert.throws(() => runtime.enumerate(altered), /PRECISION_PARENT_INVALID/);
    const declined = runtime.instantiate(hitState, domain, { convertedFailedHitDieIndices: [] });
    const counterfactualDecline = runtime.apply(hitState, declined.action);
    assert.equal(counterfactualDecline.state.pendingOfficialRangedPrecisionChoice.stage, 'defence');
    assert.deepEqual(counterfactualDecline.state.pendingOfficialRangedPrecisionChoice.convertedFailedHitDieIndices, []);
    assert.deepEqual((await native.store.loadRoom(roomId)).envelope, current.envelope);
    const choice = await native.commit({ roomId, credential: credentials.player1, operationKey: 'precision-choice',
      select: row => row.actionType === 'choose_ranged_precision_hits',
      parameters: () => ({ convertedFailedHitDieIndices: [failed] }) });
    assert.equal(choice.preview.core.chanceTicket, null);
    if (!choice.resumedSavedCommit) {
      const choiceCheckpoint = await native.store.loadRoom(roomId);
      await save('choice-checkpoint.json', { envelope: choiceCheckpoint.envelope, sourceRoomId: roomId });
    }
    const choiceEnvelope = (await read(ref('choice-checkpoint.json'))).envelope;
    const defenceLegal = { legalSpace: native.engine.legalSpace(choiceEnvelope,
      { internalServerAuthority: true, sideKey: 'player1' }) };
    assert.equal(defenceLegal.legalSpace.parameterDomains.length, 0);
    assert.equal(defenceLegal.legalSpace.finiteActions.length, 1);
    await native.commit({ roomId, credential: credentials.player1, operationKey: 'defence-pool', kind: 'finite',
      select: row => row.action.actionType === 'resolve_ranged_attack_defence_pool' });
    current = await native.store.loadRoom(roomId);
    assert.equal(current.envelope.state.pendingOfficialRangedPrecisionChoice, undefined);
    if (current.envelope.state.pendingCurrentProductRangedCasualtyChoice) {
      await native.commit({ roomId, credential: credentials.player2, operationKey: 'defender-casualties',
        select: row => row.parameterKind === OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_PARAMETER_KIND,
        parameters: row => ({ casualtySelectionHash: row.parameterSchema.casualtySelectionHash.enum[0] }) });
    }
    current = await native.store.loadRoom(roomId);
    const event = current.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'ranged_attack');
    assert.ok(event);
    assert.deepEqual(event.stages.hit.rolls, pending.hitRolls);
    assert.deepEqual(event.stages.hit.convertedFailedHitDieIndices, [failed]);
    assert.equal(event.stages.hit.precisionConvertedHits, 1);
    await native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-shooting', kind: 'finite',
      select: row => row.action.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE });
    current = await native.store.loadRoom(roomId);
    if (current.envelope.state.activeSideKey === 'player1') {
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-activation',
        select: row => row.actionType === 'finish_activation', parameters: () => ({}) });
    }
    current = await native.store.loadRoom(roomId);
    assert.equal(current.envelope.state.activeSideKey, 'player2');
    const next = await native.room.legalSpace({ roomId, seatToken: credentials.player2.seatToken });
    assert.equal(next.ok, true, JSON.stringify(next));
    assert.ok(next.legalSpace.parameterDomains.some(row => row.actionType === 'ranged_attack'));
    await save('checkpoint.json', { envelope: current.envelope, sourceRoomId: roomId });
    const evidenceRef = await save('successor.json', { revision: current.stateRevision,
      selectedFailedIndex: failed, attackerOwnedChoice: true, defenceGeneratedAfterChoice: true,
      invalidSelectionsRejected: true, declineAcceptedCounterfactualOnly: true,
      savedHitRollsUnchanged: true, nextActor: 'player2', event });
    return { evidenceRef, checkpointRef: ref('checkpoint.json') };
  } },
  { name: 'coldRecovery', openProduct, check: async ({ native, authority }) => {
    const credentials = await native.create(roomId, authority);
    const current = await native.store.loadRoom(roomId);
    assert.deepEqual(current.envelope, (await read(ref('checkpoint.json'))).envelope);
    const bundle = await native.store.loadReplayBundle(roomId);
    const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
      .map(row => row.payload.payload.receipt);
    const hit = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, 1) });
    assert.equal(hit.ok, true, JSON.stringify(hit));
    assert.deepEqual(hit.envelope, (await read(ref('hit-checkpoint.json'))).envelope);
    const choice = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, 2) });
    assert.equal(choice.ok, true, JSON.stringify(choice));
    assert.deepEqual(choice.envelope, (await read(ref('choice-checkpoint.json'))).envelope);
    const replay = await native.room.replayRoom({ roomId, seatToken: credentials.player1.seatToken });
    assert.equal(replay.ok, true, JSON.stringify(replay));
    assert.equal(replay.matchesCurrent, true);
    assert.deepEqual((await native.store.loadRoom(roomId)).envelope, current.envelope);
    const evidenceRef = await save('cold-recovery.json', { revision: current.stateRevision,
      sameEnvelope: true, hitBoundaryReplayed: true, committedChoiceBoundaryReplayed: true,
      fullReplayMatches: true, receiptCount: receipts.length, originalRoomUnchanged: true });
    return { evidenceRef, checkpointRef: ref('checkpoint.json') };
  } },
] });
console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
