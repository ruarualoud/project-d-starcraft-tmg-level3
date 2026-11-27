import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialModelBaseFootprintV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const output = 'build/ticket-28-terran-wave3-20261116-v1/nova-vision-hidden/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const roomId = id => 'wave3-nova-vision-' + id;
const releaseId = id => roomId(id) + '-v1';
const pieceOf = (state, id) => state.pieces.find(row => row.id === id);
const hidden = piece => (piece.statuses || []).some(row => String(typeof row === 'string' ? row : row.statusName || row.name).toLowerCase() === 'hidden');
const ghostId = mode => 'unit:nova_' + mode + '_mode/ghost-visor-any-phase@1';
const suitId = 'unit:nova_stealth_mode/tactical-stealth-suit-any-phase@1';
const zeratulId = 'unit:zeratul/one-with-the-shadows-any-phase@1';
const mightId = 'card:nerazim/might-of-the-nerazim-any@1';
const specs = [
  { id: 'assault-pass', mode: 'assault', useMight: false, gainInside: false },
  { id: 'stealth-use', mode: 'stealth', useMight: true, gainInside: false },
  { id: 'gain-suppressed', mode: 'assault', useMight: false, gainInside: true },
];
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return output + name;
}
async function cached(name) {
  try { return await read(output + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry(folder = directory) {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(folder, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry();
  try {
    const manifest = await read(sourceRef); product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
    includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
}
function projection(runtime, state, pieceId) {
  return runtime.query(state, { queryKind: 'characteristic_status_projection', pieceId }).result;
}
function radius(state, id) {
  const piece = pieceOf(state, id);
  return createOfficialModelBaseFootprintV1({ piece, model: piece.models[0],
    dataBundle: state.officialModelBaseGeometryDataBundle }).radiusMilliInches;
}
function moveParameters(state, id, x) {
  return { leadingModelId: pieceOf(state, id).models[0].id,
    path: [{ xMilliInches: x, yMilliInches: 10000 }], placements: [] };
}
async function sceneFor(context, spec) {
  const base = (await read(parent + 'tank-coordinated-strike/source-projection/authority.json')).state;
  const definitions = [ghostId(spec.mode), zeratulId];
  if (spec.mode === 'stealth') definitions.push(suitId, 'unit:nova_stealth_mode/super-stimpack-movement-phase@1');
  const setup = createOfficialReleaseRosterStateV2({ context,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nova_covert_ops', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'nova', recordKey: 'army_units:nova_' + spec.mode + '_mode', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nerazim', tacticalCardRecordKeys: ['tactical_cards:robotics_facility'], units: [
          { unitInstanceId: 'zeratul', recordKey: 'army_units:zeratul', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'stalker', recordKey: 'army_units:stalker', compositionKind: 'small', upgrades: [] }] },
    },
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    characteristicDefinitionIds: definitions, canonicalResourceTypes: true,
    includeMelee: true, meleeWeaponDefinitionIds: [spec.mode === 'stealth'
      ? 'unit:nova_stealth_mode/combat-knife-combat-phase@1' : 'unit:nova_assault_mode/monomolecular-blade-combat-phase@1'],
    reactionDefinitionIds: [mightId], includeCharacteristicConsumers: true,
    includeHiddenRangedAndEvade: true, includeDetectionHiddenLoss: true,
    includeActionPerformedStatusLifecycle: true });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'officialDeploymentGeometryDataBundle',
    'engagementScale', 'armyBuildingEngagementScale', 'officialMissionRuntimeDescriptor', 'supplyLossLedger',
    'officialModelGapTransitPolicy', 'officialBattlefieldTokenMarkerRulesDataBundle',
    'officialBattlefieldTokenMarkerRegistry', 'officialStatusStayInPlayDataBundle'];
  let state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined).map(key => [key, structuredClone(base[key])])),
    ...setup.state, phase: 'movement', round: 1, activeSideKey: 'player2', firstPlayerSideKey: 'player2', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player2' } } };
  state.board.tokens = []; state.board.effectMarkers = []; state.board.markers = [];
  const positions = { nova: [10, 10], zeratul: [spec.gainInside ? 20 : 24, 10], stalker: [44, 26] };
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false;
    piece.models.forEach(model => Object.assign(model, { isOnField: true,
      xInches: positions[piece.id][0], yInches: positions[piece.id][1] }));
  }
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { spec, budget: 2000, fullRosterSpend: false, fullMatch: false,
    declaredPhaseAndPositions: true, preexistingHidden: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.72.0');
  const descriptorRef = await save(id + '/runtime.json', runtime.descriptor); const product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
      referenceSources: m.source.references, sourcePolicy: m.source.policy, components: { ...m.components,
        rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
          integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved,
      state: scene.state, scenario: scene.scenario }));
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, context, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  await save(branch.id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope }); return current;
}
async function invoke(branch, credentials, key, select, parameters, kind = 'parameterized') {
  const current = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id),
    credential: credentials[current.envelope.state.activeSideKey], operationKey: key, select, parameters, kind });
  await checkpoint(branch); return result;
}
async function settleReactions(branch, credentials, useMight) {
  for (let count = 0; count < 12; count++) {
    const current = await checkpoint(branch); if (!current.envelope.state.pendingOfficialReactionWindow) return current;
    const use = useMight && current.envelope.state.activeSideKey === 'player2';
    await invoke(branch, credentials, 'reaction-r' + current.stateRevision,
      row => use ? row.definitionId === mightId : row.actionType === 'pass_reaction_family_window',
      domain => use ? { paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.const } : {});
  }
  assert.fail('bounded hidden-loss reaction did not settle');
}
async function replay(branch) {
  const before = await branch.native.store.loadRoom(roomId(branch.id));
  await branch.native.restoreDependencies(roomId(branch.id), branch.authority);
  const bundle = await branch.native.store.loadReplayBundle(roomId(branch.id));
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= before.stateRevision; revision++) {
    const actual = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(actual.ok, true, JSON.stringify(actual));
    assert.deepEqual(actual.envelope, (await read(output + branch.id + '/checkpoint-r' + revision + '.json')).envelope);
  }
  assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), before);
  return { id: branch.id, receipts: receipts.length, checkpoints: before.stateRevision + 1, exact: true };
}

await fs.mkdir(directory, { recursive: true });
const main = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-Nova-Ghost-Visor-and-Tactical-Stealth-Suit-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const cases = [];
    for (const spec of specs) {
      const scene = await sceneFor(context, spec); const runtime = runtimeFor(context, scene.state);
      const nova = pieceOf(scene.state, 'nova');
      const route = runtime.bundle.routes.find(row => row.definitionId === ghostId(spec.mode));
      assert.equal(route.effectKind, 'detection_aura'); assert.equal(route.rangeMilliInches, 6000);
      const missing = structuredClone(scene.state); delete missing.officialDetectionHiddenLossPolicy;
      assert.throws(() => runtimeFor(context, missing), /NOVA_VISION_CONSUMERS_REQUIRED/);
      const targetX = Math.round(pieceOf(scene.state, 'zeratul').models[0].xInches * 1000);
      const boundaryX = targetX - radius(scene.state, 'nova') - radius(scene.state, 'zeratul') - 6000;
      for (const delta of [-3, 0]) {
        const condition = structuredClone(scene.state); pieceOf(condition, 'nova').models[0].xInches = (boundaryX + delta) / 1000;
        assert.equal(projection(runtime, condition, 'zeratul').hiddenSuppressedByDetection, delta === 0);
        assert.equal(projection(runtime, condition, 'nova').hiddenSuppressedByDetection, false);
      }
      assert.equal(hidden(nova), false);
      await registerScene(context, spec.id, scene);
      cases.push({ spec, route, boundaryX, baseRadiiMilliInches: [radius(scene.state, 'nova'), radius(scene.state, 'zeratul')],
        suit: runtime.bundle.routes.find(row => row.definitionId === suitId) || null, boundaryQueriesReadOnly: true });
    }
    const ref = await save('compile.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const saved = await cached(spec.id + '/consumed.json'); if (saved) { cases.push(saved); continue; }
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        await invoke(branch, credentials, 'zeratul-move', row => row.actionType === 'move' && row.pieceId === 'zeratul',
          () => moveParameters(branch.authority.state, 'zeratul', spec.gainInside ? 17000 : 23000));
        if (!spec.gainInside) {
          const initialHidden = await checkpoint(branch); assert(hidden(pieceOf(initialHidden.envelope.state, 'zeratul')));
          await invoke(branch, credentials, 'zeratul-finish', row => row.actionType === 'finish_activation' && row.pieceId === 'zeratul', () => ({}));
          if (spec.mode === 'stealth') {
            await invoke(branch, credentials, 'nova-super', row => row.abilityName === 'Super Stimpack' && row.pieceId === 'nova',
              domain => ({ activeUnitId: 'nova', paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0] }));
            assert.equal(hidden(pieceOf((await checkpoint(branch)).envelope.state, 'nova')), false);
          }
          const before = await checkpoint(branch);
          const boundaryX = 23000 - radius(before.envelope.state, 'nova') - radius(before.envelope.state, 'zeratul') - 6000;
          await invoke(branch, credentials, 'nova-detect', row => row.actionType === 'move' && row.pieceId === 'nova',
            () => moveParameters(before.envelope.state, 'nova', boundaryX));
        }
        const after = await settleReactions(branch, credentials, spec.useMight);
        const state = after.envelope.state;
        assert.equal(hidden(pieceOf(state, 'zeratul')), false);
        assert.equal(state.officialDetectionHiddenLossHistory.length, 1);
        assert(!state.board.effectMarkers.some(row => row.targetPieceId === 'zeratul' && row.label === 'hidden'));
        const uses = (state.officialReactionHistory || []).filter(row => row.definitionId === mightId);
        assert.equal(uses.length, spec.useMight ? 1 : 0);
        assert.equal(new Set(state.officialHiddenLossReactionHistory.map(row => row.lossHash)).size, 1);
        if (spec.mode === 'stealth') assert(hidden(pieceOf(state, 'nova')));
        const value = { id: spec.id, revision: after.stateRevision, actualHiddenRemoved: true, actualMightUses: uses.length,
          gainedAndLostInSameTransition: spec.gainInside, lossEvent: state.officialDetectionHiddenLossHistory[0],
          hiddenLossHistory: state.officialHiddenLossReactionHistory, novaHidden: hidden(pieceOf(state, 'nova')), modelCalls: 0 };
        await save(spec.id + '/consumed.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const saved = await cached(spec.id + '/successor.json'); if (saved) { cases.push(saved); continue; }
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        const actorId = spec.gainInside ? 'zeratul' : 'nova';
        await invoke(branch, credentials, 'finish-parent', row => row.actionType === 'finish_activation' && row.pieceId === actorId, () => ({}));
        const after = await checkpoint(branch);
        assert.equal(after.envelope.state.activeSideKey, spec.gainInside ? 'player1' : 'player2');
        const value = { id: spec.id, revision: after.stateRevision, nextPlayer: after.envelope.state.activeSideKey,
          originalActivationResumed: true, hiddenRemainsLost: !hidden(pieceOf(after.envelope.state, 'zeratul')) };
        await save(spec.id + '/successor.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) { const branch = await product.branch(spec.id); try { cases.push(await replay(branch)); } finally { branch.close(); } }
    const ref = await save('cold-recovery.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ gate: 'nova-vision-hidden', status: main.status, failures: main.failures.length }));

if (process.argv.includes('--controls')) {
  const precisionSource = await runProductBoundaryCheck({ directory: path.join(directory, 'precision-source'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef: output + 'stealth-use/consumed.json', contractVersion: 'T28-W3-08-real-Super-Stimpack-prefix-staged-Hidden-check-v1',
  }, steps: [{ name: 'compile', repairRef, openProduct, check: async product => {
    const source = await product.branch('stealth-use');
    try {
      const current = await source.native.store.loadRoom(roomId(source.id));
      let prefix;
      for (let revision = 0; revision <= current.stateRevision; revision++) {
        const checkpoint = await read(output + source.id + '/checkpoint-r' + revision + '.json');
        const nova = pieceOf(checkpoint.envelope.state, 'nova');
        if (!hidden(nova) && nova.officialAbilityEffects?.some(row => row.sourceDefinitionId
          === 'unit:nova_stealth_mode/super-stimpack-movement-phase@1')) {
          prefix = { revision, state: checkpoint.envelope.state }; break;
        }
      }
      assert(prefix, 'actual Super Stimpack-before-Move checkpoint missing');
      const state = structuredClone(prefix.state);
      state.phase = 'assault'; state.activeSideKey = 'player1'; delete state.selectedRosterActivationWindow;
      state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
      pieceOf(state, 'stalker').models[0].xInches = 17; pieceOf(state, 'stalker').models[0].yInches = 10;
      pieceOf(state, 'zeratul').models[0].xInches = 34; pieceOf(state, 'zeratul').models[0].yInches = 26;
      await registerScene(source.context, 'shot-precision', {
        state: refreshOfficialReleaseRosterDerivedStateV2({ context: source.context, state }),
        scenario: { sourceCheckpoint: output + source.id + '/checkpoint-r' + prefix.revision + '.json',
          actualPriorSuperStimpack: true, declaredAssaultPhaseAndPositions: true,
          fullMatch: false, budget: 2000, fullRosterSpend: false, modelCalls: 0 } });
      assert.deepEqual(await source.native.store.loadRoom(roomId(source.id)), current);
      const ref = await save('precision-source.json', { sourceRevision: prefix.revision, originalRoomUnchanged: true });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { source.close(); }
  } }] });
  console.log(JSON.stringify({ gate: 'nova-precision-source', status: precisionSource.status }));
  const controls = await runProductBoundaryCheck({ directory: path.join(directory, 'controls'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'consume.json',
    contractVersion: 'T28-W3-08-Nova-Hidden-targeting-and-full-action-boundaries-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct, check: async product => {
      const source = await product.branch('stealth-use');
      try {
        const original = await source.native.store.loadRoom(roomId(source.id));
        assert(hidden(pieceOf(original.envelope.state, 'nova')));
        const rangedQuery = state => source.runtime.query(state, { queryKind: 'ranged_attack_preview',
          pieceId: 'stalker', weaponName: 'Particle Disruptors', parameters: { targetUnitId: 'nova' } });
        const measurements = [];
        for (const delta of [0, 3]) {
          const state = structuredClone(original.envelope.state);
          state.phase = 'assault'; state.activeSideKey = 'player2';
          state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' };
          const nova = pieceOf(state, 'nova'); const stalker = pieceOf(state, 'stalker');
          stalker.models[0].xInches = nova.models[0].xInches + (radius(state, 'nova') + radius(state, 'stalker') + 4000 + delta) / 1000;
          stalker.models[0].yInches = 10;
          const current = refreshOfficialReleaseRosterDerivedStateV2({ context: source.context, state });
          if (delta === 0) measurements.push({ delta, acceptedQuery: rangedQuery(current) });
          else {
            assert.throws(() => rangedQuery(current), /RANGED|PRECISION/);
            const exposed = structuredClone(current);
            pieceOf(exposed, 'nova').statuses = pieceOf(exposed, 'nova').statuses.filter(row => String(row.statusName || row).toLowerCase() !== 'hidden');
            exposed.board.effectMarkers = exposed.board.effectMarkers.filter(row => !(row.targetPieceId === 'nova' && row.label === 'hidden'));
            measurements.push({ delta, hiddenTargetRejected: true, samePositionWithoutHiddenAccepted: rangedQuery(exposed) });
          }
          assert.equal(projection(source.runtime, current, 'nova').eligibleEvadeAgainstAllAttacks, true);
        }
        assert.deepEqual(await source.native.store.loadRoom(roomId(source.id)), original);
        const shot = await sceneFor(source.context, { ...specs[1], id: 'shot' });
        shot.state.phase = 'assault'; shot.state.activeSideKey = 'player1';
        shot.state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
        pieceOf(shot.state, 'stalker').models[0].xInches = 17; pieceOf(shot.state, 'stalker').models[0].yInches = 10;
        pieceOf(shot.state, 'zeratul').models[0].xInches = 34; pieceOf(shot.state, 'zeratul').models[0].yInches = 26;
        shot.state = refreshOfficialReleaseRosterDerivedStateV2({ context: source.context, state: shot.state });
        shot.scenario = { ...shot.scenario, declaredPhaseAndPositions: 'assault', fullMatch: false };
        await registerScene(source.context, 'shot', shot);
        const leaveSource = await product.branch('assault-pass');
        try {
          const current = await leaveSource.native.store.loadRoom(roomId(leaveSource.id));
          const state = structuredClone(current.envelope.state);
          state.phase = 'assault'; state.activeSideKey = 'player1';
          state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
          await registerScene(leaveSource.context, 'leave', { state: refreshOfficialReleaseRosterDerivedStateV2({ context: leaveSource.context, state }),
            scenario: { originalCheckpoint: output + leaveSource.id + '/checkpoint-r' + current.stateRevision + '.json',
              actualPriorDetectionLoss: true, declaredAssaultPhase: true, fullMatch: false, budget: 2000, modelCalls: 0 } });
        } finally { leaveSource.close(); }
        const ref = await save('controls-compile.json', { measurements, queryMutatesRoom: false,
          rangeExceptionScope: 'readonly declared positions, actual Native-gained Hidden', phaseFixturesDeclared: true });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { source.close(); }
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of ['leave', 'shot', 'shot-precision']) {
        const saved = await cached(id + '/consumed.json'); if (saved) { cases.push(saved); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority);
          let observedUnfinishedParent = false;
          if (id === 'leave') {
            await invoke(branch, credentials, 'run-out', row => row.actionType === 'run' && row.pieceId === 'nova',
              () => moveParameters(branch.authority.state, 'nova', 10000));
            const after = await checkpoint(branch);
            assert.equal(hidden(pieceOf(after.envelope.state, 'zeratul')), false);
            assert.equal(projection(branch.runtime, after.envelope.state, 'zeratul').hiddenSuppressedByDetection, false);
            assert.equal(after.envelope.state.officialDetectionHiddenLossHistory.length, 1);
          } else {
            await invoke(branch, credentials, 'shoot', row => row.actionType === 'ranged_attack' && row.pieceId === 'nova',
              () => ({ targetUnitId: 'stalker' }));
            for (let index = 0; index < 30; index++) {
              const current = await checkpoint(branch); const state = current.envelope.state;
              const pending = state.pendingOfficialRangedPrecisionChoice || state.pendingCurrentProductRangedCasualtyChoice || state.pendingAction;
              if (!pending) break;
              observedUnfinishedParent = true; assert.equal(hidden(pieceOf(state, 'nova')), false);
              const menu = branch.runtime.enumerate(state);
              if (menu.parameterDomains.length) {
                const domain = menu.parameterDomains[0]; const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
                const field = schema.required[0]; const parameter = schema[field] || schema.properties?.[field];
                const value = parameter.items ? (parameter.items.enum || []).slice(0, parameter.maxItems ?? parameter.minItems ?? 0) : parameter.enum[0];
                await invoke(branch, credentials, 'pool-r' + current.stateRevision, row => row.domainId === domain.domainId, () => ({ [field]: value }));
              } else {
                assert.equal(menu.candidates.length, 1);
                await invoke(branch, credentials, 'pool-r' + current.stateRevision, () => true, null, 'finite');
              }
            }
            const current = await checkpoint(branch);
            if (current.envelope.state.pendingCurrentProductRangedSequence) {
              assert.equal(hidden(pieceOf(current.envelope.state, 'nova')), false);
              await invoke(branch, credentials, 'finish-sequence', row => row.action.actionType === 'finish_ranged_attack_sequence', null, 'finite');
            }
            const completed = await checkpoint(branch);
            assert(hidden(pieceOf(completed.envelope.state, 'nova')));
            if (id === 'shot-precision') assert(observedUnfinishedParent);
            assert.equal(completed.envelope.state.characteristicAfterActionPassiveHistory.filter(row => row.sourceDefinitionId === suitId && row.granted).length, 1);
          }
          const current = await checkpoint(branch);
          const value = { id, revision: current.stateRevision, actualParentBoundaryChecked: true,
            observedUnfinishedParent, hidden: hidden(pieceOf(current.envelope.state, id === 'leave' ? 'zeratul' : 'nova')), modelCalls: 0 };
          await save(id + '/consumed.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('controls-consume.json', cases); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of ['leave', 'shot', 'shot-precision']) {
        const saved = await cached(id + '/successor.json'); if (saved) { cases.push(saved); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority);
          await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'nova', () => ({}));
          const after = await checkpoint(branch); assert.equal(after.envelope.state.activeSideKey, 'player2');
          const value = { id, revision: after.stateRevision, nextPlayer: 'player2' };
          await save(id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('controls-successor.json', cases); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of ['leave', 'shot', 'shot-precision']) { const branch = await product.branch(id); try { cases.push(await replay(branch)); } finally { branch.close(); } }
      const ref = await save('controls-cold-recovery.json', cases); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'nova-vision-controls', status: controls.status, failures: controls.failures.length }));
}

if (process.argv.includes('--legacy')) {
  const legacyRef = parent + 'zeratul-after-action-hidden/';
  const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-verification'), identity: {
    factoryModule: 'scripts/support/wave3-room-boundary-fixture-v1.mjs', factoryExport: 'openWave3EngineeringRoomV1',
    sourceRef: legacyRef + 'qualified-facts.json', contractVersion: 'T28-W3-08-Nova-vision-preserves-Zeratul-hidden-and-Might-v1',
  }, steps: [{ name: 'coldRecovery', repairRef, openProduct: async () => registry(path.join(root, legacyRef)), check: async product => {
    const archive = await read(parent + 'large-melee-and-groups/space-recovery-manifest.json');
    const cases = [];
    for (const id of ['move', 'farsight-use']) {
      const saved = await cached('legacy/' + id + '/replay.json'); if (saved) { cases.push(saved); continue; }
      const entry = archive.entries.find(row => row.path === legacyRef + id + '/room.sqlite');
      assert(entry?.restoredByteHashVerified && entry.originalRemoved);
      const bytes = gunzipSync(await fs.readFile(path.join(root, entry.archivePath)));
      assert.equal(bytes.length, entry.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
      const folder = path.join(directory, 'legacy', id); await fs.mkdir(folder, { recursive: true });
      const file = path.join(folder, 'room.sqlite');
      try { assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'), entry.sha256); }
      catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(file, bytes, { flag: 'wx' }); }
      const authority = await read(legacyRef + id + '/authority.json');
      const context = await product.resolver.resolve({ releaseId: 'wave3-zeratul-after-action-' + id + '-v1', purpose: 'area_ability_component' });
      const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
        definitionIds: authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds, includeMelee: true, includeHits: true });
      assert.deepEqual(runtime.descriptor, await read(legacyRef + id + '/runtime.json'));
      const native = openWave3EngineeringRoomV1({ directory: folder, filename: 'room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      try {
        const originalId = 'wave2-zeratul-after-action-' + id;
        const before = await native.store.loadRoom(originalId); await native.restoreDependencies(originalId, authority);
        const bundle = await native.store.loadReplayBundle(originalId);
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= before.stateRevision; revision++) {
          const replayed = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(replayed.ok, true, JSON.stringify(replayed));
          assert.deepEqual(replayed.envelope, (await read(legacyRef + id + '/checkpoint-r' + revision + '.json')).envelope);
        }
        assert.deepEqual(await native.store.loadRoom(originalId), before);
        const value = { id, sourceArchiveRef: entry.archivePath, restoredSha256: entry.sha256,
          receipts: receipts.length, checkpoints: before.stateRevision + 1, allEnvelopesExact: true,
          descriptorExact: true, originalArchiveUntouched: true };
        await save('legacy/' + id + '/replay.json', value); cases.push(value);
      } finally { native.close(); }
    }
    const ref = await save('legacy-replay.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ gate: 'nova-vision-legacy', status: legacy.status, failures: legacy.failures.length }));
}
