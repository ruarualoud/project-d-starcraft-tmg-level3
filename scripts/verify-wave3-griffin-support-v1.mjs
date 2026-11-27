import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { verifyOfficialUnitLifecycleFamilySourceBundleV1 }
  from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/griffin-support/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const definitionId = 'card:nova_covert_ops/griffin-support-any@1';
const roomId = id => 'wave3-griffin-support' + (id === 'native' ? '' : '-' + id);
const releaseId = id => roomId(id) + '-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const drones = state => state.pieces.filter(piece => piece.officialUnitRecordKey === 'army_units:sabotage_drone');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
  const ref = output + name;
  await atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
  return ref;
}
async function cached(name) {
  try { return await read(output + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry();
  try {
    const manifest = await read(sourceRef);
    product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: [] });
}
function arrangeMarine(piece, x, y) {
  arrange(piece, x, y);
  piece.models.forEach((model, index) => {
    model.xInches = x + index % 3 * (model.baseWidthInches + 0.02);
    model.yInches = y + Math.floor(index / 3) * (model.baseDepthInches + 0.02);
  });
}
async function sceneFor(context) {
  const base = (await read('build/ticket-28-terran-wave3-20261117-v1/spec-ops-foundation/quad-armoured/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, includeAbilitySourcePhases: true,
    unitLifecycleDefinitionIds: [definitionId],
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nova_covert_ops', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'nova', recordKey: 'army_units:nova_assault_mode', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'specops', recordKey: 'army_units:spec_ops_marauder__marauder_', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'enemy-a', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'enemy-b', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] }] },
    } });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  const state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined)
    .map(key => [key, structuredClone(base[key])])), ...setup.state,
    round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
  state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  arrange(pieceOf(state, 'nova'), 10, 10);
  arrange(pieceOf(state, 'specops'), 40, 10);
  arrangeMarine(pieceOf(state, 'enemy-a'), 48, 28);
  arrangeMarine(pieceOf(state, 'enemy-b'), 48, 5);
  const coherency = declareCoherency(state);
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    scale: 'Standard2000-budget partial legal rosters', phaseAndPositionsDeclared: true, coherency,
    fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, scene, id = 'native') {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.89.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const manifest = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(manifest.source.sourceRevisionRef),
      datasetRef: manifest.source.datasetRef, snapshotRef: manifest.source.snapshotRef,
      sourceRevisionRef: manifest.source.sourceRevisionRef, referenceSources: manifest.source.references,
      sourcePolicy: manifest.source.policy, components: { ...manifest.components,
        rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
          integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    const old = await cached(id + '/authority.json');
    if (old) assert.deepEqual(old, authority);
    else await save(id + '/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id = 'native') {
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
  const ref = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(ref);
  if (old) assert.deepEqual(old.envelope, current.envelope);
  else await save(ref, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, select, parameters, kind = 'parameterized', sideKey = 'player1') {
  await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[sideKey],
    operationKey, select, parameters, kind });
  await checkpoint(branch);
  return result;
}
function parametersFor(actorId, x, y) {
  return { activeUnitId: actorId, paymentCardInstanceIds: [], coordinate: { xMilliInches: x, yMilliInches: y } };
}
function preview(runtime, state, actorId, x, y) {
  return runtime.query(state, { queryKind: 'unit_lifecycle_placement_preview', pieceId: actorId,
    parameters: parametersFor(actorId, x, y) });
}
function moveParameters(piece, dx) {
  const point = model => ({ xMilliInches: Math.round(model.xInches * 1000), yMilliInches: Math.round(model.yInches * 1000) });
  const first = point(piece.models[0]);
  return { leadingModelId: piece.models[0].id, path: [first, { ...first, xMilliInches: first.xMilliInches + dx }],
    placements: piece.models.slice(1).map(model => ({ modelId: model.id,
      ...point(model), xMilliInches: point(model).xMilliInches + dx,
      elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 })) };
}
function privateControls(context, runtime, state) {
  const before = JSON.stringify(state);
  const valid = preview(runtime, state, 'nova', 20000, 10000);
  const plan = valid.result.action.sourceAction.unitLifecyclePlan.canonicalParameters;
  assert.equal(plan.friendlyRangeProof.rangeMilliInches, 12000);
  assert(plan.friendlyRangeProof.qualifyingFriendlyUnits.some(row => row.pieceId === 'nova'));
  assert(!plan.friendlyRangeProof.qualifyingFriendlyUnits.some(row => row.pieceId === plan.createdPieceId));
  assert.throws(() => preview(runtime, state, 'nova', 10000, 32000), /FRIENDLY_ANCHOR_RANGE_REQUIRED/);
  assert.throws(() => preview(runtime, state, 'nova', 300, 10000), /OUTSIDE|BOUNDARY|BATTLEFIELD/);
  const nearEnemy = structuredClone(state);
  arrangeMarine(pieceOf(nearEnemy, 'enemy-a'), 22.4, 10);
  assert.throws(() => preview(runtime, nearEnemy, 'nova', 20000, 10000), /ENEMY_SEPARATION/);
  const separated = structuredClone(state);
  arrangeMarine(pieceOf(separated, 'enemy-a'), 22.44, 10);
  assert(preview(runtime, separated, 'nova', 20000, 10000));
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.definitionId === definitionId && row.pieceId === 'nova');
  assert.throws(() => runtime.instantiate(state, domain, { ...parametersFor('nova', 20000, 10000),
    friendlyRangeProof: plan.friendlyRangeProof }), /SEMANTIC_PARAMETERS_REQUIRED/);
  const wrongPhase = structuredClone(state); wrongPhase.phase = 'assault';
  assert(!runtime.enumerate(wrongPhase).parameterDomains.some(row => row.definitionId === definitionId));
  const forged = structuredClone(state.officialUnitLifecycleFamilySourceBundle);
  forged.routes[0].friendlyAnchorRangeMilliInches = 24000;
  assert.throws(() => verifyOfficialUnitLifecycleFamilySourceBundleV1(forged), /SOURCE_BUNDLE_INVALID|ROUTE/);
  const missing = structuredClone(state); delete missing.officialGeneratedUnitDataBundle;
  assert.throws(() => runtimeFor(context, missing), /GENERATED_UNIT_SOURCE_REQUIRED/);
  assert.equal(JSON.stringify(state), before);
  return { semanticParametersOnly: true, selfWitnessExcluded: true, outsideAllFriendlyRangesRejected: true,
    fullBaseBoundaryRejected: true, enemyGapBelowOneRejectedAndAboveOneAccepted: true,
    wrongPhaseExcluded: true, sourceTamperRejected: true, missingGeneratedSourceRejected: true, sourceStateUnchanged: true };
}
async function commitDrone(branch, credentials, key, actorId, x, y) {
  const current = await checkpoint(branch);
  const beforeRef = branch.id + '/' + key + '-before.json';
  let before = await cached(beforeRef);
  if (!before) {
    before = branch.id === 'native' && key === 'nova-griffin'
      ? await read(output + 'native/checkpoint-r0.json') : { envelope: current.envelope };
    await save(beforeRef, before);
  }
  const query = preview(branch.runtime, before.envelope.state, actorId, x, y);
  assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), current);
  const committed = await invoke(branch, credentials, key,
    row => row.definitionId === definitionId && row.pieceId === actorId, () => parametersFor(actorId, x, y));
  assert.deepEqual(committed.preview.core.action, query.result.action);
  assert.equal(committed.preview.core.chanceTicket, null);
  return query;
}
async function replay(native, id, prefix) {
  const current = await native.store.loadRoom(id);
  const bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= current.stateRevision; revision++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(prefix + revision + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), current);
  return { receipts: receipts.length, checkpoints: current.stateRevision + 1, allEnvelopesExact: true };
}
async function verifyLegacy(product) {
  const old = await cached('legacy/replay.json'); if (old) return old;
  const prefix = 'build/ticket-28-terran-wave3-20261116-v1/generated-unit-source/';
  const oldRegistry = new DatabaseSync(path.join(root, prefix, 'releases.sqlite'), { readOnly: true });
  try {
    const manifest = JSON.parse(oldRegistry.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?')
      .get('wave3-generated-unit-source-v1').manifest_json);
    product.resolver.register(manifest);
    const context = await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    const authority = await read(prefix + 'native/authority.json');
    const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
      definitionIds: ['unit:immortal/for-the-ancients-assault-phase@1'],
      weaponDefinitionIds: ['unit:immortal/left-photon-disruptor-assault-phase@1', 'unit:immortal/right-photon-disruptor-assault-phase@1'],
      includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true, includePointDefenseChoices: true });
    assert.deepEqual(runtime.descriptor, await read(prefix + 'native/runtime.json'));
    const source = path.join(root, prefix, 'native/room.sqlite');
    const originalHash = sha256(await fs.readFile(source));
    await fs.mkdir(path.join(directory, 'legacy'), { recursive: true });
    const target = path.join(directory, 'legacy/room.sqlite');
    try { await fs.access(target); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await fs.copyFile(source, target); }
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, 'legacy'), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    try {
      await native.restoreDependencies('wave3-generated-unit-source', authority);
      const results = await replay(native, 'wave3-generated-unit-source', prefix + 'native/checkpoint-r');
      assert.equal(sha256(await fs.readFile(source)), originalHash);
      const value = { ...results, runtimeVersion: '3.74.0', descriptorExact: true,
        originalDatabaseUnchanged: true, originalDatabaseSha256: originalHash, modelCalls: 0 };
      await save('legacy/replay.json', value); return value;
    } finally { native.close(); }
  } finally { oldRegistry.close(); }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef,
    contractVersion: 'T28-W3-08-Griffin-Support-set-friendly-range-and-expiry-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context);
      const runtime = runtimeFor(context, scene.state);
      const definition = runtime.catalogue.definitions.find(row => row.definitionId === definitionId);
      assert.equal(definition.execution.status, 'executable_exact');
      const controls = privateControls(context, runtime, scene.state);
      await registerScene(context, scene);
      const ref = await save('compile.json', { definition, sourceRoute: runtime.unitLifecycleBundle.routes[0],
        generatedProfile: scene.state.officialGeneratedUnitDataBundle.profiles.find(row => row.recordKey === 'army_units:sabotage_drone'),
        controls, privateOnly: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const branch = await product.branch();
      try {
        const credentials = await branch.native.create(roomId(branch.id), branch.authority);
        const query = await commitDrone(branch, credentials, 'nova-griffin', 'nova', 20000, 10000);
        const current = await checkpoint(branch); const state = current.envelope.state;
        const created = drones(state);
        assert.equal(created.length, 1); assert.equal(created[0].isStructure, true);
        assert.equal(created[0].currentSupply, 0); assert.equal(created[0].currentModels, 1);
        assert.equal(created[0].models[0].baseWidthInches, 1.575);
        assert.equal(created[0].models[0].remainingWounds, 3); assert.equal(created[0].removeAtRoundEnd, true);
        const expectedCards = structuredClone((await read(output + 'native/checkpoint-r0.json')).envelope.state.cardResources);
        expectedCards.player1.find(card => card.cardInstanceId === 'faction:player1').readiness = 'exhausted';
        assert.deepEqual(state.cardResources, expectedCards);
        assert(!state.log.flatMap(row => row.events || []).some(event => event.type === 'ability_resource_paid'));
        assert(!branch.runtime.enumerate(state).parameterDomains.some(row => row.definitionId === definitionId && row.pieceId === 'nova'));
        const ref = await save('consume.json', { query, createdPieceId: created[0].id, revision: current.stateRevision,
          queryEqualsNative: true, printedResourceCostZero: true, sameActorRepeatAbsent: true, sourceCardExhaustedUnderCore1052: true,
          modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      if (!await cached('after/authority.json')) {
        const context = await sourceProduct();
        await registerScene(context, await sceneFor(context), 'after');
      }
      const results = [];
      for (const id of ['native', 'after']) {
        const previous = await cached(id + '/completed.json');
        if (previous) { results.push(previous); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority);
          const actorId = id === 'native' ? 'nova' : 'specops';
          await invoke(branch, credentials, actorId + '-move', row => row.actionType === 'move' && row.pieceId === actorId,
            () => moveParameters(pieceOf(branch.authority.state, actorId), id === 'native' ? 1000 : -500));
          let witnesses;
          if (id === 'after') {
            const query = await commitDrone(branch, credentials, 'specops-griffin', 'specops', 14000, 20000);
            witnesses = query.result.action.sourceAction.unitLifecyclePlan.canonicalParameters.friendlyRangeProof.qualifyingFriendlyUnits;
            assert(witnesses.some(row => row.pieceId === 'nova'));
            assert(!witnesses.some(row => row.pieceId === 'specops'));
          }
          const finished = await invoke(branch, credentials, actorId + '-finish',
            row => row.actionType === 'finish_activation' && row.pieceId === actorId, () => ({}));
          const otherTurn = await read(output + id + '/checkpoint-r' + (finished.preview.core.expectedStateRevision + 1) + '.json');
          assert.equal(otherTurn.envelope.state.activeSideKey, 'player2');
          assert.equal(drones(otherTurn.envelope.state).length, 1);
          assert(branch.runtime.enumerate(otherTurn.envelope.state).parameterDomains.some(row => row.pieceId === 'enemy-a' && row.actionType === 'move'));
          await invoke(branch, credentials, 'enemy-move', row => row.actionType === 'move' && row.pieceId === 'enemy-a',
            () => moveParameters(pieceOf(branch.authority.state, 'enemy-a'), -500), 'parameterized', 'player2');
          await invoke(branch, credentials, 'enemy-finish', row => row.actionType === 'finish_activation' && row.pieceId === 'enemy-a', () => ({}), 'parameterized', 'player2');
          const current = await checkpoint(branch); const state = current.envelope.state;
          assert.equal(state.activeSideKey, 'player1');
          assert(!branch.runtime.enumerate(state).parameterDomains.some(row => row.definitionId === definitionId));
          const expired = branch.runtime.lifecycle(state, { eventKind: 'round_end' });
          assert.equal(expired.ok, true);
          for (const drone of drones(expired.state)) {
            assert.equal(drone.isDestroyed, true); assert.equal(drone.currentModels, 0);
            assert.equal(drone.currentSupply, 0); assert.deepEqual(drone.destroyedModelIds, drone.models.map(model => model.id).sort());
          }
          assert.deepEqual(expired.state.supplyLossLedger, state.supplyLossLedger);
          assert.deepEqual(pieceOf(expired.state, actorId), pieceOf(state, actorId));
          const repeated = branch.runtime.lifecycle(expired.state, { eventKind: 'round_end' });
          const gameplay = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'log'));
          assert.deepEqual(gameplay(repeated.state), gameplay(expired.state));
          assert(!repeated.events.some(event => event.type === 'special_unit_removed_at_round_end'));
          assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), current);
          await save(id + '/private-round-end.json', { sourceRevision: current.stateRevision, expired, repeated,
            scope: 'formal Root lifecycle callback from actual Native state; full Native round-end scheduling pending', modelCalls: 0 });
          const value = { id, revision: current.stateRevision, actualDroneIds: drones(state).map(piece => piece.id),
            ...(witnesses ? { actorOutsideRangeButOtherFriendlyWitnessAccepted: true, witnesses } : {}),
            parentContinuedNormally: true, nextSideHasLegalMove: true, exhaustedSourceUnavailableToOtherActor: true,
            privateLifecycleRemovedOnceWithoutSupplyKillCredit: true, modelCalls: 0 };
          await save(id + '/completed.json', value); results.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', results);
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const id of ['native', 'after']) {
        const branch = await product.branch(id);
        try {
          await branch.native.restoreDependencies(roomId(id), branch.authority);
          current.push({ id, ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r') });
        } finally { branch.close(); }
      }
      const legacy = await verifyLegacy(product);
      const ref = await save('cold-recovery.json', { current, legacy, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'griffin-support', status: result.status, failures: result.failures.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
export { sourceProduct, runtimeFor, sceneFor, registry, verifyLegacy };
