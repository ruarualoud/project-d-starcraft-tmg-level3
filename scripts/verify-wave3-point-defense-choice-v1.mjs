import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2,
  bindOfficialReleaseRulesRuntimeV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialAbilityEffectIrCatalogueV1 } from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialAttackProfileCatalogueV3 } from '../packages/source-data/official-attack-profile-catalogue-v1.mjs';
import { createOfficialCombatProfileBundleV1 } from '../packages/source-data/official-combat-profile-bundle-v1.mjs';
import { createOfficialRangedFamilySourceBundleV2, verifyOfficialRangedFamilySourceBundleV1 }
  from '../packages/product-composition/official-ranged-family-adapter-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialSpecialUnitPieceV1 } from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { createOfficialStandardActionRouteCatalogueV1 } from '../packages/product-composition/official-standard-action-route-catalogue-v1.mjs';
import { createOfficialSelectedRosterAbilitySourceBundleV1 } from '../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs';
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
const directory = path.join(root, parent, 'point-defense');
const cases = [
  { id: 'numeric', previous: 'ranged-precision', actor: 'goliath-1', weapon: 'Autocannon', droneCount: 2,
    definitionIds: ['unit:goliath/ares-class-targeting-system-any-phase@1'], removedDice: 2 },
  { id: 'zero', previous: 'ranged-precision', actor: 'goliath-1', weapon: 'Autocannon', droneCount: 5,
    definitionIds: ['unit:goliath/ares-class-targeting-system-any-phase@1'], removedDice: 9 },
  { id: 'blast', previous: 'tank-template-attack', actor: 'tank-1', weapon: 'Shock Cannon', droneCount: 1,
    definitionIds: null, removedDice: 2 },
];
const read = async name => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'));
const ref = name => path.relative(root, path.join(directory, name));
const caseDir = spec => path.join(directory, spec.id);
const roomId = spec => 'wave3-point-defense-' + spec.id;
const releaseId = spec => 'wave3-u83-c84-r50-point-defense-' + spec.id + '-v1';
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return ref(name);
}
async function saved(name) {
  try { return await read(ref(name)); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { store, resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(root, parent, 'ranged-precision/releases.sqlite') });
  try {
    return await createOfficialReleaseResolverV2({ store, loadArtifact: read }).resolve({
      releaseId: 'wave3-u83-c84-r50-ranged-precision-v1', purpose: 'ability_component' });
  } finally { store.close(); }
}
async function definitions(spec) {
  return spec.definitionIds || (await read(parent + 'tank-spatial/selection.json')).definitionIds;
}
function runtimeFor(context, state, definitionIds, blast) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, definitionIds, spatialState: state,
    includeRanged: true, includeTemplateAttacks: blast, includePrecisionChoices: true, includePointDefenseChoices: true });
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(spec) {
    const context = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'ability_component' });
    const authority = await read(ref(spec.id + '/authority.json'));
    const runtime = runtimeFor(context, authority.state, await definitions(spec), spec.id === 'blast');
    assert.equal(runtime.descriptor.runtimeHash, context.resources.rulesRuntime.runtimeHash);
    const native = openWave3EngineeringRoomV1({ directory: caseDir(spec), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { context, authority, runtime, native, close: () => native.close() };
  } };
}
function queryFor(spec) {
  return { queryKind: 'ranged_attack_preview', pieceId: spec.actor, weaponName: spec.weapon,
    parameters: spec.id === 'blast' ? { primaryTargetUnitId: 'opponent-marines',
      primaryTargetModelId: 'opponent-marines-model-1' } : { targetUnitId: 'opponent-marines' } };
}
function attachDroneSources(context, stateInput, count) {
  const state = structuredClone(stateInput);
  const recordKeys = [...new Set([...state.pieces.map(row => row.officialUnitRecordKey), 'army_units:point_defense_drone'])];
  state.officialCombatProfileBundle = createOfficialCombatProfileBundleV1({ dataset: context.dataset,
    snapshot: context.snapshot, recordKeys });
  state.officialAttackProfileCatalogue = createOfficialAttackProfileCatalogueV3({ context, recordKeys });
  const targetModels = state.pieces.find(row => row.id === 'opponent-marines').models;
  const x = Math.max(...targetModels.map(model => model.xInches));
  const y = Math.max(...targetModels.map(model => model.yInches));
  const offsets = [[2, 2], [3.5, 2], [2, 3.5], [0.5, 3.5], [-1, 3.5]];
  for (let index = 0; index < count; index++) {
    const drone = createOfficialSpecialUnitPieceV1(state, 'player2', 'army_units:point_defense_drone', 'drone-' + (index + 1));
    drone.isOnField = true;
    drone.deploymentStatus = 'declared_engineering_placement';
    drone.models[0].isOnField = true;
    drone.models[0].xInches = x + offsets[index][0];
    drone.models[0].yInches = y + offsets[index][1];
    state.pieces.push(drone);
  }
  const catalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset: context.dataset,
    identityCatalogue: context.resources.abilityIdentities });
  const source = catalogue.definitions.find(row => row.recordKey === 'army_units:point_defense_drone'
    && row.definitionName === 'Point Defense Laser');
  assert.ok(source);
  state.officialRangedFamilySourceBundle = createOfficialRangedFamilySourceBundleV2({ catalogue,
    definitionIds: [source.definitionId], attackProfileCatalogue: state.officialAttackProfileCatalogue });
  state.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({ dataset: context.dataset, state });
  state.officialSelectedRosterAbilitySourceBundle = createOfficialSelectedRosterAbilitySourceBundleV1({ dataset: context.dataset, state });
  return state;
}
async function finishPendingAttack(branch, spec, credentials) {
  const { native } = branch;
  // Each iteration consumes one native choice or a declared fixed batch. This
  // bound follows this fixture's unit/batch count, never a strategy search.
  for (let index = 0; index < 12; index++) {
    const current = await native.store.loadRoom(roomId(spec));
    const state = current.envelope.state;
    const legal = await native.room.legalSpace({ roomId: roomId(spec), seatToken: credentials[state.activeSideKey].seatToken });
    assert.equal(legal.ok, true, JSON.stringify(legal));
    const precision = state.pendingOfficialRangedPrecisionChoice;
    const template = state.pendingOfficialBlastTemplateAttack;
    const casualties = state.pendingCurrentProductRangedCasualtyChoice;
    if (!precision && !template && !casualties && !state.pendingOfficialPointDefenseAttack) return;
    if (precision?.stage === 'choice') {
      await native.commit({ roomId: roomId(spec), credential: credentials[state.activeSideKey], operationKey: 'attack-transition-' + current.stateRevision,
        select: row => row.actionType === 'choose_ranged_precision_hits',
        parameters: row => ({ convertedFailedHitDieIndices: row.parameterSchema.convertedFailedHitDieIndices.items.enum.slice(0, 1) }) });
    } else if (casualties || template?.stage === 'casualty') {
      await native.commit({ roomId: roomId(spec), credential: credentials[state.activeSideKey], operationKey: 'attack-transition-' + current.stateRevision,
        select: row => row.parameterKind === OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_PARAMETER_KIND
          || row.actionType === 'choose_blast_template_casualties',
        parameters: row => ({ casualtySelectionHash: row.parameterSchema.casualtySelectionHash.enum[0] }) });
    } else {
      assert.equal(legal.legalSpace.finiteActions.length, 1);
      await native.commit({ roomId: roomId(spec), credential: credentials[state.activeSideKey], operationKey: 'attack-transition-' + current.stateRevision,
        kind: 'finite', select: () => true });
    }
  }
  assert.fail('declared fixture attack exceeded its finite successor count');
}

await fs.mkdir(directory, { recursive: true });
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
  sourceRef: parent + 'ranged-precision/authority.json', contractVersion: 'T28-W3-07-native-point-defense-v1',
}, steps: [
  { name: 'read', openProduct: sourceProduct, check: async context => {
    const source = await read(parent + 'ranged-precision/authority.json');
    const previous = createOfficialCharacteristicStatusComponentRuntimeV2({ context, definitionIds: cases[0].definitionIds,
      spatialState: source.state, includeRanged: true, includePrecisionChoices: true });
    assert.deepEqual(previous.descriptor, await read(parent + 'ranged-precision/runtime.json'));
    assert.deepEqual(previous.query(source.state, { ...queryFor(cases[0]), queryKind: 'ranged_precision_preview' }),
      (await read(parent + 'ranged-precision/compile.json')).preview);
    const rule = context.dataset.recordsByKey['army_units:point_defense_drone'].payload.upgrades[0];
    assert.equal(rule.name, 'Point Defense Laser');
    assert.match(rule.activation, /Passive/);
    assert.match(rule.description, /Then remove this Unit/);
    const evidenceRef = await save('read.json', { legacy26DescriptorAndQueryUnchanged: true, source: rule });
    return { evidenceRef, checkpointRef: evidenceRef };
  } },
  { name: 'compile', repairRef: ref('structure-route-repair.json'), openProduct: sourceProduct, check: async context => {
    const product = registry();
    const results = [];
    try {
      for (const spec of cases) {
        await fs.mkdir(caseDir(spec), { recursive: true });
        const source = await read(parent + spec.previous + '/authority.json');
        const state = attachDroneSources(context, source.state, spec.droneCount);
        assert.ok(state.officialActionRouteCatalogue.units.filter(row => row.recordKey === 'army_units:point_defense_drone')
          .every(row => row.coreActionsProhibitedByStructure && row.movementProfile === null
            && row.routes.every(route => route.sourceKind !== 'core_action')));
        const runtime = runtimeFor(context, state, await definitions(spec), spec.id === 'blast');
        assert.equal(runtime.descriptor.runtimeVersion, '2.7.0');
        const preview = runtime.query(state, queryFor(spec));
        assert.equal(preview.result.action.actionType, 'declare_ranged_attack_before_point_defense');
        assert.equal(preview.result.action.chance, undefined);
        const forged = structuredClone(state.officialRangedFamilySourceBundle);
        forged.routes[0].attackPoolDiceRemoved = 20;
        assert.throws(() => verifyOfficialRangedFamilySourceBundleV1(forged), /RANGED_FAMILY_SUBSET_BUNDLE_INVALID/);
        await save(spec.id + '/runtime.json', runtime.descriptor);
        const manifest = context.manifest;
        const next = createOfficialReleaseManifestV2({ releaseId: releaseId(spec), dataset: context.dataset, snapshot: context.snapshot,
          sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef,
          snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
          referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
          components: { ...manifest.components, rulesRuntime: { ref: ref(spec.id + '/runtime.json'), version: '2.7.0',
            integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } });
        product.resolver.register(next);
        const resolved = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'ability_component' });
        await save(spec.id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state,
          scenario: { sourceRef: parent + spec.previous + '/authority.json', fullMatch: false,
            placementAndPhaseDeclared: true, specialUnitFactory: 'createOfficialSpecialUnitPieceV1',
            droneProducerActionExecuted: false, nativeAttackPending: true } }));
        results.push({ id: spec.id, runtimeHash: runtime.descriptor.runtimeHash, droneCount: spec.droneCount });
      }
    } finally { product.close(); }
    const legacy = await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json');
    const candidate = (sideKey, factionRecordKey, recordKey, unitInstanceId) => ({ sideKey,
      factionRecordKey, scaleId: 'Skirmish', mineralBudget: 500, tacticalCardRecordKeys: [],
      units: [{ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] }] });
    const instantRoster = createOfficialReleaseRosterStateV2({ context,
      candidatesBySide: { player1: candidate('player1', 'tactical_cards:daelaam', 'army_units:sentry', 'sentry-1'),
        player2: candidate('player2', 'tactical_cards:terran_armed_forces', 'army_units:marine', 'opponent-marines') },
      legacyDisclosurePolicy: legacy.state.officialRosterDisclosureDataBundle });
    const original = (await read(parent + 'ranged-precision/authority.json')).state;
    const instantScene = { ...structuredClone(original), ...instantRoster.state };
    for (const piece of instantScene.pieces) {
      piece.isOnField = true;
      piece.isInReserves = false;
      for (const [index, model] of piece.models.entries()) {
        model.isOnField = true;
        model.xInches = piece.sideKey === 'player1' ? 14 : 20 + index % 3 * 1.4;
        model.yInches = 10 + Math.floor(index / 3) * 1.4;
      }
    }
    const instantState = attachDroneSources(context, instantScene, 1);
    const instantRuntime = runtimeFor(context, instantState, cases[0].definitionIds, false);
    const instantQuery = instantRuntime.query(instantState, { queryKind: 'ranged_attack_preview',
      pieceId: 'sentry-1', weaponName: 'Disruption Beam', parameters: { targetUnitId: 'opponent-marines' } });
    assert.equal(instantQuery.result.action.actionType, 'ranged_attack');
    assert.deepEqual(instantQuery.result.action.sourceAction.rangedPlan.attackPoolRemoval.pointDefenseAvailableSourcePieceIds, []);
    assert.equal(instantState.pieces.find(row => row.id === 'drone-1').isOnField, true);
    await save('instant-query.json', { query: instantQuery, rosterAudits: instantRoster.state.armyCompositionUpgradeAuditsBySide,
      scope: 'real_source_roster_and_readonly_instant_exemption_no_native_attack' });
    const evidenceRef = await save('compile.json', { cases: results });
    return { evidenceRef, checkpointRef: ref('compile.json') };
  } },
  { name: 'consume', openProduct, check: async product => {
    const results = [];
    for (const spec of cases) {
      const prior = await saved(spec.id + '/consume.json');
      if (prior) { results.push(prior); continue; }
      const branch = await product.branch(spec);
      try {
        const { native, runtime, authority } = branch;
        const credentials = await native.create(roomId(spec), authority);
        const before = await native.store.loadRoom(roomId(spec));
        const query = runtime.query(before.envelope.state, queryFor(spec));
        assert.deepEqual((await native.store.loadRoom(roomId(spec))).envelope, before.envelope);
        const declared = await native.commit({ roomId: roomId(spec), credential: credentials.player1, operationKey: 'declare-attack',
          select: row => row.pieceId === spec.actor && row.weaponName === spec.weapon, parameters: () => queryFor(spec).parameters });
        assert.deepEqual(declared.preview.core.action, query.result.action);
        assert.equal(declared.preview.core.chanceTicket, null);
        const current = await native.store.loadRoom(roomId(spec));
        const frame = current.envelope.state.pendingOfficialPointDefenseAttack;
        assert.equal(frame.stage, 'choice');
        assert.equal(frame.triggeredSourcePieceIds.length, spec.droneCount);
        assert.equal(current.envelope.state.activeSideKey, 'player2');
        await save(spec.id + '/declared-checkpoint.json', { envelope: current.envelope });
        const value = { id: spec.id, revision: current.stateRevision, queryAndNativeEqual: true,
          triggeredSourceCount: frame.triggeredSourcePieceIds.length, noDiceGenerated: true };
        await save(spec.id + '/consume.json', value);
        results.push(value);
      } finally { branch.close(); }
    }
    const evidenceRef = await save('consume.json', { cases: results });
    return { evidenceRef, checkpointRef: ref('consume.json') };
  } },
  { name: 'successor', openProduct, check: async product => {
    const results = [];
    for (const spec of cases) {
      const prior = await saved(spec.id + '/successor.json');
      if (prior) { results.push(prior); continue; }
      const branch = await product.branch(spec);
      try {
        const { native, runtime, authority } = branch;
        const credentials = await native.create(roomId(spec), authority);
        let current = await native.store.loadRoom(roomId(spec));
        const declared = (await read(ref(spec.id + '/declared-checkpoint.json'))).envelope;
        const bundle = await native.store.loadReplayBundle(roomId(spec));
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
          .map(row => row.payload.payload.receipt);
        const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, 1) });
        assert.equal(replay.ok, true, JSON.stringify(replay));
        assert.deepEqual(replay.envelope, declared);
        for (let attempt = 0; attempt < spec.droneCount; attempt++) {
          current = await native.store.loadRoom(roomId(spec));
          const pending = current.envelope.state.pendingOfficialPointDefenseAttack;
          if (pending?.stage !== 'choice') break;
          const index = pending.completed.length;
          const legal = await native.room.legalSpace({ roomId: roomId(spec), seatToken: credentials.player2.seatToken });
          assert.equal(legal.ok, true, JSON.stringify(legal));
          assert.equal(legal.legalSpace.parameterDomains.length, 1);
          const domain = legal.legalSpace.parameterDomains[0];
          assert.equal(domain.actionType, 'choose_point_defense_dice');
          const sourcePieceId = domain.parameterSchema.sourcePieceId.enum.at(-1);
          const removedDieIds = spec.id === 'numeric' && index === 1 ? []
            : domain.parameterSchema.removedDieIds.items.enum.slice(0, 2);
          assert.throws(() => runtime.instantiate(current.envelope.state, domain,
            { sourcePieceId, removedDieIds: ['not_an_attack_die'] }), /POINT_DEFENSE_SELECTION_INVALID/);
          const opposite = await native.room.legalSpace({ roomId: roomId(spec), seatToken: credentials.player1.seatToken });
          assert.equal(opposite.legalSpace.parameterDomains.length, 0);
          const committed = await native.commit({ roomId: roomId(spec), credential: credentials.player2,
            operationKey: 'drone-choice-' + index, select: row => row.actionType === 'choose_point_defense_dice',
            parameters: () => ({ sourcePieceId, removedDieIds }) });
          assert.equal(committed.preview.core.chanceTicket, null);
          current = await native.store.loadRoom(roomId(spec));
          assert.equal(current.envelope.state.pieces.find(row => row.id === sourcePieceId).isOnField, false);
        }
        let ready = await saved(spec.id + '/ready-checkpoint.json');
        if (!ready) {
          ready = { envelope: (await native.store.loadRoom(roomId(spec))).envelope };
          await save(spec.id + '/ready-checkpoint.json', ready);
        }
        const frame = ready.envelope.state.pendingOfficialPointDefenseAttack;
        assert.equal(frame.stage, 'ready');
        assert.equal(frame.completed.flatMap(row => row.removedDieIds).length, spec.removedDice);
        assert.ok(ready.envelope.state.pieces.filter(row => row.id.startsWith('drone-')).every(row => !row.isOnField));
        const readyAction = runtime.enumerate(ready.envelope.state).candidates[0];
        if (spec.id === 'zero') assert.equal(readyAction.chance, undefined);
        await finishPendingAttack(branch, spec, credentials);
        current = await native.store.loadRoom(roomId(spec));
        assert.equal(current.envelope.state.pendingOfficialPointDefenseAttack, undefined);
        const events = current.envelope.state.log.flatMap(row => row.events || []);
        const removalEvents = events.filter(row => row.type === 'point_defense_drone_removed');
        assert.equal(removalEvents.length, spec.droneCount);
        assert.ok(removalEvents.every(row => row.passiveResolvedBeforeHitRoll));
        const main = events.find(row => row.type === 'ranged_attack' && row.targetId === 'opponent-marines');
        assert.ok(main);
        assert.equal(main.stages.hit.dice, frame.originalDieIds.length - spec.removedDice);
        if (spec.id === 'zero') assert.equal(main.stages.damage.totalDamage, 0);
        if (spec.id === 'blast') {
          assert.equal(main.stages.effects.surgeCapacity, 6);
          assert.equal(main.stages.hit.dice, 8);
        }
        if (current.envelope.state.pendingCurrentProductRangedSequence) {
          await native.commit({ roomId: roomId(spec), credential: credentials.player1, operationKey: 'finish-shooting',
            kind: 'finite', select: row => row.action.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE });
        }
        current = await native.store.loadRoom(roomId(spec));
        if (current.envelope.state.activeSideKey === 'player1') await native.commit({ roomId: roomId(spec),
          credential: credentials.player1, operationKey: 'finish-activation', select: row => row.actionType === 'finish_activation',
          parameters: () => ({}) });
        current = await native.store.loadRoom(roomId(spec));
        assert.equal(current.envelope.state.activeSideKey, 'player2');
        const next = await native.room.legalSpace({ roomId: roomId(spec), seatToken: credentials.player2.seatToken });
        assert.equal(next.ok, true, JSON.stringify(next));
        assert.ok(next.legalSpace.parameterDomains.some(row => row.actionType === 'ranged_attack'));
        await save(spec.id + '/checkpoint.json', { envelope: current.envelope });
        const value = { id: spec.id, revision: current.stateRevision, removedSources: removalEvents,
          mainAttack: main, nextActor: 'player2', zeroRemovalStillRetired: spec.id === 'numeric' };
        await save(spec.id + '/successor.json', value);
        results.push(value);
      } finally { branch.close(); }
    }
    const evidenceRef = await save('successor.json', { cases: results });
    return { evidenceRef, checkpointRef: ref('successor.json') };
  } },
  { name: 'coldRecovery', openProduct, check: async product => {
    const results = [];
    for (const spec of cases) {
      const prior = await saved(spec.id + '/cold-recovery.json');
      if (prior) { results.push(prior); continue; }
      const branch = await product.branch(spec);
      try {
        const { native, authority } = branch;
        const credentials = await native.create(roomId(spec), authority);
        const current = await native.store.loadRoom(roomId(spec));
        assert.deepEqual(current.envelope, (await read(ref(spec.id + '/checkpoint.json'))).envelope);
        const bundle = await native.store.loadReplayBundle(roomId(spec));
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
          .map(row => row.payload.payload.receipt);
        const declared = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, 1) });
        assert.equal(declared.ok, true, JSON.stringify(declared));
        assert.deepEqual(declared.envelope, (await read(ref(spec.id + '/declared-checkpoint.json'))).envelope);
        const ready = native.engine.replay({ initialEnvelope: bundle.initialEnvelope,
          journal: receipts.slice(0, spec.droneCount + 1) });
        assert.equal(ready.ok, true, JSON.stringify(ready));
        assert.deepEqual(ready.envelope, (await read(ref(spec.id + '/ready-checkpoint.json'))).envelope);
        const replay = await native.room.replayRoom({ roomId: roomId(spec), seatToken: credentials.player1.seatToken });
        assert.equal(replay.ok, true, JSON.stringify(replay));
        assert.equal(replay.matchesCurrent, true);
        assert.deepEqual((await native.store.loadRoom(roomId(spec))).envelope, current.envelope);
        const value = { id: spec.id, revision: current.stateRevision, receiptCount: receipts.length,
          declaredAndReadyReplayed: true, fullReplayMatches: true, currentUnchanged: true };
        await save(spec.id + '/cold-recovery.json', value);
        results.push(value);
      } finally { branch.close(); }
    }
    const evidenceRef = await save('cold-recovery.json', { cases: results });
    return { evidenceRef, checkpointRef: ref('cold-recovery.json') };
  } },
] });
console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
