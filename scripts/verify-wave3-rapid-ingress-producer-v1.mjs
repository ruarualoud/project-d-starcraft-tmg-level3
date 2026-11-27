import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const output = parent + 'rapid-ingress-producer/';
const directory = path.join(root, output);
const ids = ['before', 'after'];
const definitionId = 'card:raynor_s_raiders/rapid-ingress-any@1';
const characteristicIds = ['unit:immortal/for-the-ancients-assault-phase@1'];
const weaponDefinitionIds = ['unit:immortal/left-photon-disruptor-assault-phase@1',
  'unit:immortal/right-photon-disruptor-assault-phase@1'];
const roomId = id => 'wave3-rapid-ingress-producer-' + id;
const releaseId = id => 'wave3-u83-c84-r50-rapid-ingress-producer-' + id + '-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return output + name;
}
async function saved(name) {
  try { return await read(output + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry(folder = directory) {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(folder, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry(path.join(root, parent, 'point-defense-target-coexistence'));
  try { return await product.resolver.resolve({
    releaseId: 'wave3-u83-c84-r50-point-defense-target-coexistence-remove-two-v1', purpose: 'ability_component',
  }); } finally { product.close(); }
}
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds: characteristicIds, weaponDefinitionIds, includeRanged: true,
  includePrecisionChoices: true, includeArmourChoices: true, includePointDefenseChoices: true });
const drone = state => state.pieces.find(piece => piece.officialUnitRecordKey === 'army_units:point_defense_drone');
const events = state => state.log.flatMap(row => row.events || []);
const placement = { activeUnitId: 'marauders', paymentCardInstanceIds: [],
  coordinate: { xMilliInches: 10000, yMilliInches: 17000 } };
function moveParameters(state) {
  const models = state.pieces.find(piece => piece.id === 'marauders').models;
  const leading = models[0];
  return { leadingModelId: leading.id,
    path: [{ xMilliInches: Math.round(leading.xInches * 1000), yMilliInches: Math.round(leading.yInches * 1000) },
      { xMilliInches: Math.round(leading.xInches * 1000) + 1000, yMilliInches: Math.round(leading.yInches * 1000) }],
    placements: models.slice(1).map(model => ({ modelId: model.id,
      xMilliInches: Math.round(model.xInches * 1000) + 1000, yMilliInches: Math.round(model.yInches * 1000),
      rotationDegrees: 0, elevationId: 'ground', supportSurfaceIds: [] })) };
}
async function sceneFor(context) {
  const base = (await read(parent + 'point-defense-target-coexistence/remove-two/authority.json')).state;
  const candidatesBySide = (await read(parent + 'point-defense-target-coexistence/compile.json')).candidatesBySide;
  const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    characteristicDefinitionIds: characteristicIds, unitLifecycleDefinitionIds: [definitionId] });
  const fields = ['round', 'phase', 'activeSideKey', 'firstPlayerSideKey', 'engagementScale', 'armyBuildingEngagementScale',
    'board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'supplyLossLedger'];
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(base[key])])), ...setup.state,
    phase: 'movement', activeSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } },
    officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13) };
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false;
    piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
      xInches: piece.id === 'immortals' ? 21 : piece.id === 'marauders' ? 10 : 11 + index % 3 * (model.baseWidthInches + 0.1),
      yInches: piece.id === 'marines' ? 5.5 + Math.floor(index / 3) * (model.baseDepthInches + 0.1)
        : 12 + index * (model.baseDepthInches + 0.1) }));
  }
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  assert.equal(drone(state), undefined);
  return { state, candidatesBySide, audits: setup.state.armyCompositionUpgradeAuditsBySide };
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
    const authority = await read(output + id + '/authority.json');
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { context, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(native, id) {
  const current = await native.store.loadRoom(roomId(id));
  await save(id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
  return current;
}
function nextChoice(runtime, state, id) {
  const actor = state.pieces.find(piece => piece.id === 'marauders');
  const moved = actor.activatedPhases?.movement === true;
  const deployed = !!drone(state);
  const actionType = !deployed && (id === 'before' || moved) ? 'resolve_unit_lifecycle_ability'
    : !moved ? 'move' : 'finish_activation';
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.actionType === actionType && row.pieceId === 'marauders');
  assert.ok(domain, JSON.stringify({ actionType, domains: runtime.enumerate(state).parameterDomains.map(row => [row.actionType, row.pieceId]) }));
  return { domain, parameters: actionType === 'resolve_unit_lifecycle_ability' ? placement
    : actionType === 'move' ? moveParameters(state) : {} };
}
function assertProducer(state) {
  const piece = drone(state);
  assert.ok(piece);
  assert.equal(piece.currentSupply, 0);
  assert.equal(piece.isStructure, true);
  assert.equal(piece.removeAtRoundEnd, true);
  assert.equal(piece.specialDeploymentSourceDefinitionId, definitionId);
  assert.equal(state.unitLifecycleUseHistory.length, 1);
  assert.equal(events(state).filter(row => row.type === 'tactical_card_exhausted').length, 1);
  assert.equal(events(state).filter(row => row.type === 'special_unit_deployed').length, 1);
  assert.ok(state.officialActionRouteCatalogue.units.some(row => row.pieceId === piece.id));
  return piece;
}
async function commitNext(branch, id, credentials) {
  const { native, runtime } = branch;
  const current = await checkpoint(native, id);
  const choice = nextChoice(runtime, current.envelope.state, id);
  const query = choice.domain.actionType === 'resolve_unit_lifecycle_ability'
    ? runtime.query(current.envelope.state, { queryKind: 'unit_lifecycle_placement_preview', pieceId: 'marauders', parameters: placement }) : null;
  assert.deepEqual(await native.store.loadRoom(roomId(id)), current);
  const result = await native.commit({ roomId: roomId(id), credential: credentials.player1,
    operationKey: 'step-' + current.stateRevision, select: row => row.domainId === choice.domain.domainId,
    parameters: () => choice.parameters });
  if (query) assert.deepEqual(result.preview.core.action, query.result.action);
  const next = await checkpoint(native, id);
  if (choice.domain.actionType === 'resolve_unit_lifecycle_ability') {
    assertProducer(next.envelope.state);
    await save(id + '/produced.json', { envelope: next.envelope, queryEqualsNativePreview: true, queryRoomUnchanged: true });
  }
  return { actionType: choice.domain.actionType, revision: next.stateRevision };
}

await fs.mkdir(directory, { recursive: true });
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
  sourceRef: parent + 'point-defense-target-coexistence/read.json', contractVersion: 'T28-W3-07-rapid-ingress-native-producer-v1',
}, steps: [
  { name: 'read', openProduct: sourceProduct, check: async context => {
    const source = context.dataset.recordsByKey['tactical_cards:raynor_s_raiders'].payload.boosts.find(row => row.name === 'Rapid Ingress');
    assert.ok(source);
    const ref = await save('read.json', { source, expectedDefinitionId: definitionId,
      sourcePurpose: 'current_frozen_api', nativeWholeRoundAdmissionPending: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'compile', openProduct: sourceProduct, check: async context => {
    const scene = await sceneFor(context);
    const runtime = runtimeFor(context, scene.state);
    assert.equal(runtime.descriptor.runtimeVersion, '3.22.0');
    assert.deepEqual(runtime.unitLifecycleBundle.definitionIds, [definitionId]);
    assert.deepEqual(runtime.unitLifecycleBundle.generatedUnitRecordKeys, ['army_units:point_defense_drone']);
    assert.equal(runtime.unitLifecycleBundle.routes[0].phase, 'movement');
    assert.equal(drone(scene.state), undefined);
    const cases = [];
    for (const id of ids) {
      const product = registry();
      try {
        const descriptorRef = await save(id + '/runtime.json', runtime.descriptor);
        const m = context.manifest;
        product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
          snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
          snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
          referenceSources: m.source.references, sourcePolicy: m.source.policy,
          components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: '3.22.0',
            integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
        const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
        const ref = await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state,
          scenario: { scale: 1000, round: 1, phase: 'movement', placementAndPhaseDeclared: true, fullMatch: false,
            initialSpecialUnitCount: 0, abilityTiming: id, nativeWholeRoundAdmissionPending: true } }));
        cases.push({ id, authorityRef: ref });
      } finally { product.close(); }
    }
    const ref = await save('compile.json', { candidatesBySide: scene.candidatesBySide, audits: scene.audits,
      sourceBundle: runtime.unitLifecycleBundle, cases });
    return { evidenceRef: ref, checkpointRef: cases[0].authorityRef };
  } },
  { name: 'consume', repairRef: output + 'semantic-handoff-repair.json', openProduct, check: async product => {
    const cases = [];
    for (const id of ids) {
      const prior = await saved(id + '/consume.json'); if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        const step = await commitNext(branch, id, credentials);
        const ref = await save(id + '/consume.json', { id, step }); cases.push({ id, evidenceRef: ref });
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', openProduct, check: async product => {
    const cases = [];
    for (const id of ids) {
      const prior = await saved(id + '/successor.json'); if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        const steps = [];
        for (let step = 0; step < 3; step++) {
          const current = await checkpoint(branch.native, id);
          if (current.envelope.state.activeSideKey === 'player2') break;
          steps.push(await commitNext(branch, id, credentials));
        }
        const current = await checkpoint(branch.native, id);
        const state = current.envelope.state;
        const piece = assertProducer(state);
        assert.equal(state.activeSideKey, 'player2');
        assert.equal(state.selectedRosterActivationWindow, undefined);
        assert.equal(state.pieces.find(row => row.id === 'marauders').activatedPhases.movement, true);
        assert.equal(current.stateRevision, 3);
        const menu = await branch.native.room.legalSpace({ roomId: roomId(id), seatToken: credentials.player2.seatToken });
        assert.equal(menu.ok, true, JSON.stringify(menu));
        assert.ok(menu.legalSpace.parameterDomains.some(row => row.actionType === 'move' && row.pieceId === 'immortals'));
        const value = { id, revision: current.stateRevision, steps, generatedPieceId: piece.id,
          nextSide: 'player2', nativeNextMenuAvailable: true, creationCount: 1, paymentCount: 1 };
        await save(id + '/successor.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', openProduct, check: async product => {
    const cases = [];
    for (const id of ids) {
      const branch = await product.branch(id);
      try {
        await branch.native.restoreDependencies(roomId(id), branch.authority);
        const before = await branch.native.store.loadRoom(roomId(id));
        const bundle = await branch.native.store.loadReplayBundle(roomId(id));
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        const checkpoints = (await fs.readdir(path.join(directory, id))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
        for (const file of checkpoints) {
          const expected = (await read(output + id + '/' + file)).envelope;
          const replay = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
          assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
        }
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), before);
        cases.push({ id, receipts: receipts.length, checkpoints: checkpoints.length, replayExact: true });
      } finally { branch.close(); }
    }
    const ref = await save('cold-recovery.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
if (result.status !== 'passed') process.exitCode = 1;

if (result.status === 'passed' && process.argv.includes('--facts-control')) {
  const facts = await runProductBoundaryCheck({ directory: path.join(directory, 'facts-control'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'cold-recovery.json',
    contractVersion: 'T28-W3-07-rapid-ingress-facts-lifecycle-v1',
  }, steps: [{ name: 'consume', repairRef: output + 'facts-lifecycle-normalization-repair.json', openProduct, check: async product => {
    const branch = await product.branch('before');
    try {
      const { native, runtime, context, authority } = branch;
      const before = await native.store.loadRoom(roomId('before'));
      const initial = authority.state;
      const domain = nextChoice(runtime, initial, 'before').domain;
      const rejected = [];
      for (const [name, mutate] of [
        ['wrong_phase', state => { state.phase = 'assault'; }],
        ['unresolved_initiative', state => { state.phaseFirstActorByRound = {}; }],
        ['passed_phase', state => { state.players.player1.passedPhases = { movement: true }; }],
        ['activated_without_window', state => { state.pieces.find(row => row.id === 'marauders').activatedPhases = { movement: true }; }],
        ['other_unit_window', state => { state.selectedRosterActivationWindow = { sideKey: 'player1', phase: 'movement', pieceId: 'marines', stage: 'before_action' }; }],
        ['source_card_exhausted', state => { state.cardResources.player1.forEach(card => { card.readiness = 'exhausted'; }); }],
      ]) {
        const state = structuredClone(initial); mutate(state);
        assert.equal(runtime.enumerate(state).parameterDomains.some(row => row.actionType === 'resolve_unit_lifecycle_ability' && row.pieceId === 'marauders'), false, name);
        rejected.push(name);
      }
      for (const key of ['createdPieceId', 'placementPlan', 'stateHashBefore', 'triggerEventHash']) {
        assert.throws(() => runtime.instantiate(initial, domain, { ...placement, [key]: 'caller_value' }), /SEMANTIC_PARAMETERS_REQUIRED/);
        rejected.push('caller_' + key);
      }
      for (const coordinate of [{ xMilliInches: 0, yMilliInches: 17000 }, { xMilliInches: 21000, yMilliInches: 12000 }]) {
        assert.throws(() => runtime.instantiate(initial, domain, { ...placement, coordinate }));
        assert.throws(() => runtime.query(initial, { queryKind: 'unit_lifecycle_placement_preview', pieceId: 'marauders', parameters: { ...placement, coordinate } }));
      }
      const produced = (await read(output + 'before/produced.json')).envelope.state;
      const piece = assertProducer(produced);
      const targetModel = initial.pieces.find(row => row.id === 'immortals').models[0];
      const atOneInch = { xMilliInches: Math.ceil((targetModel.xInches
        - (targetModel.baseWidthInches + piece.models[0].baseWidthInches) / 2 - 1) * 1000),
      yMilliInches: Math.round(targetModel.yInches * 1000) };
      assert.throws(() => runtime.instantiate(initial, domain, { ...placement, coordinate: atOneInch }));
      assert.equal(runtime.enumerate(produced).parameterDomains.some(row => row.actionType === 'move' && row.pieceId === 'marines'), false);
      const independent = structuredClone(before.envelope.state);
      independent.activeSideKey = 'player1'; delete independent.selectedRosterActivationWindow;
      assert.equal(runtime.enumerate(independent).parameterDomains.some(row => row.pieceId === piece.id), false);
      const assault = structuredClone(before.envelope.state);
      assault.phase = 'assault'; assault.activeSideKey = 'player2';
      assault.phaseFirstActorByRound = { '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' } };
      const passive = runtime.query(assault, { queryKind: 'ranged_attack_preview', pieceId: 'immortals',
        weaponName: 'Left Photon Disruptor', parameters: { targetUnitId: 'marauders' } });
      assert.equal(passive.result.action.actionType, 'declare_ranged_attack_before_point_defense');
      const cleanupInput = structuredClone(before.envelope.state);
      cleanupInput.phase = 'cleanup'; cleanupInput.activeSideKey = cleanupInput.firstPlayerSideKey;
      const removed = runtime.lifecycle(cleanupInput, { eventKind: 'round_end' });
      assert.equal(drone(removed.state).currentModels, 0);
      assert.equal(events(removed.state).filter(row => row.type === 'special_unit_removed_at_round_end').length, 1);
      const expectedOthers = cleanupInput.pieces.filter(row => row.id !== piece.id).map(row => ({ ...row,
        officialAbilityEffects: (row.officialAbilityEffects || []).filter(effect => effect.expiresAt !== 'round_end') }));
      assert.deepEqual(removed.state.pieces.filter(row => row.id !== piece.id), expectedOthers);
      const repeated = runtime.lifecycle(removed.state, { eventKind: 'round_end' });
      assert.deepEqual(drone(repeated.state), drone(removed.state));
      assert.deepEqual(repeated.state.unitLifecycleHistory, removed.state.unitLifecycleHistory);
      assert.equal(events(repeated.state).filter(row => row.type === 'special_unit_removed_at_round_end').length, 1);
      assert.equal(repeated.state.log.length, removed.state.log.length + 1);
      const refreshed = runtime.lifecycle(removed.state, { eventKind: 'cleanup_and_refresh' });
      assert.equal(refreshed.state.cardResources.player1.find(card => card.cardInstanceId === 'faction:player1').readiness, 'ready');
      const inputRef = await save('lifecycle-input.json', cleanupInput);
      const lifecycleRef = await save('lifecycle-result.json', { removed, refreshed,
        scope: 'explicit_cleanup_clone_product_callback', nativeWholeRoundExecuted: false });
      const coldRuntime = runtimeFor(context, await read(inputRef));
      assert.deepEqual(coldRuntime.lifecycle(await read(inputRef), { eventKind: 'round_end' }), removed);
      assert.deepEqual(await native.store.loadRoom(roomId('before')), before);
      const ref = await save('facts-control.json', { rejected, fullBaseAndEnemyGapRejected: true,
        otherUnitLocked: true, generatedStructureHasNoCoreActions: true, generatedPassivePreview: passive,
        lifecycleRef, lifecycleColdExact: true, removalIdempotent: true, originalRoomUnchanged: true,
        nativeWholeRoundAdmissionPending: true, nativeActions: 0, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: lifecycleRef };
    } finally { branch.close(); }
  } }] });
  console.log(JSON.stringify({ factsControl: facts.status, failures: facts.failures }));
  if (facts.status !== 'passed') process.exitCode = 1;
}

if (result.status === 'passed' && process.argv.includes('--legacy-control')) {
  const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-control'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: parent + 'point-defense-target-coexistence/cold-recovery.json',
    contractVersion: 'T28-W3-07-rapid-ingress-legacy-native-v1',
  }, steps: [{ name: 'coldRecovery', openProduct: sourceProduct, check: async () => {
    const cases = [];
    const specs = [
      ...['remove-two', 'remove-zero'].map(id => ({ folder: 'point-defense-target-coexistence', id,
        releaseId: 'wave3-u83-c84-r50-point-defense-target-coexistence-' + id + '-v1', roomId: 'wave3-point-defense-target-coexistence-' + id,
        options: { definitionIds: characteristicIds, weaponDefinitionIds, includeRanged: true, includePrecisionChoices: true,
          includeArmourChoices: true, includeArmourReactions: true, includeTargetReactions: true, includePointDefenseChoices: true } })),
      { folder: 'hits-armour-reaction', id: 'last', releaseId: 'wave3-u83-c84-r50-hits-armour-reaction-last-v1',
        roomId: 'wave3-hits-armour-reaction-last', options: { definitionIds: ['unit:zeratul/shadow-strike-combat-phase@1'],
          includeMelee: true, includeHits: true, includeArmourReactions: true } },
    ];
    for (const spec of specs) {
      const cache = 'legacy/' + spec.folder + '-' + spec.id + '.json';
      const prior = await saved(cache); if (prior) { cases.push(prior); continue; }
      const prefix = parent + spec.folder + '/' + spec.id + '/';
      const product = registry(path.join(root, parent, spec.folder));
      try {
        const context = await product.resolver.resolve({ releaseId: spec.releaseId, purpose: 'ability_component' });
        const authority = await read(prefix + 'authority.json');
        const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, ...spec.options });
        assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
        const native = openWave3EngineeringRoomV1({ directory: path.join(root, prefix), filename: 'room.sqlite',
          rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
        try {
          const before = await native.store.loadRoom(spec.roomId);
          await native.restoreDependencies(spec.roomId, authority);
          const bundle = await native.store.loadReplayBundle(spec.roomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const checkpoints = (await fs.readdir(path.join(root, prefix))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
          for (const file of checkpoints) {
            const expected = (await read(prefix + file)).envelope;
            const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
          }
          assert.deepEqual(await native.store.loadRoom(spec.roomId), before);
          const value = { roomId: spec.roomId, receipts: receipts.length, checkpoints: checkpoints.length,
            runtimeVersion: runtime.descriptor.runtimeVersion, descriptorExact: true, replayExact: true, currentUnchanged: true };
          await save(cache, value); cases.push(value);
        } finally { native.close(); }
      } finally { product.close(); }
    }
    const ref = await save('legacy-control.json', { cases, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ legacyControl: legacy.status, failures: legacy.failures }));
  if (legacy.status !== 'passed') process.exitCode = 1;
}
