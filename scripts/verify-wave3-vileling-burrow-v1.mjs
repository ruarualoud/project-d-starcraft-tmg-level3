import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { root, arrange } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialSupplyPoolDataBundleV1 } from '../packages/source-data/official-supply-pool-data-bundle-v1.mjs';
import { resolveOfficialRoundOneSupplyPoolV1 } from '../packages/rule-atoms/official-supply-pool-rules-kernel-v1.mjs';
import { projectOfficialDeploymentSupplyV1 } from '../packages/rule-atoms/official-deployment-supply-projection-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const bileLauncher = process.argv.includes('--bile-launcher');
const defiler = process.argv.includes('--defiler');
assert(!(bileLauncher && defiler), 'select one Burrow Ambush subject');
const profiles = {
  'bile-launcher': { pieceId: 'bile', recordId: 'bile_launcher', models: 1, supply: 1, version: '3.100.0' },
  defiler: { pieceId: 'defiler', recordId: 'defiler', models: 1, supply: 1, version: '3.109.0' },
  vileling: { pieceId: 'vileling', recordId: 'vileling__zergling_', models: 18, supply: 2, version: '3.97.0' },
};
const subject = defiler ? 'defiler' : bileLauncher ? 'bile-launcher' : 'vileling';
const profile = profiles[subject];
const pieceId = profile.pieceId;
const expectedModels = profile.models;
const expectedSupply = profile.supply;
const expectedVersion = profile.version;
const singleModel = expectedModels === 1;
const output = 'build/ticket-28-zerg-wave3-20261117-v1/' + subject + '-burrow/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const sourceId = 'wave3-' + subject + '-burrow-source-v1';
const roomId = 'wave3-' + subject + '-burrow';
const definitionId = 'unit:' + profile.recordId + '/burrow-ambush-movement-phase@1';
const squadronId = 'unit:vileling__zergling_/squadron-any-phase@1';
const characteristicIds = defiler ? [] : bileLauncher ? ['unit:bile_launcher/detection-any-phase@1'] : [squadronId];
const foundation = 'build/ticket-28-zerg-wave3-20261117-v1/vileling-foundation/';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const actor = state => state.pieces.find(piece => piece.id === pieceId);
const enemy = state => state.pieces.find(piece => piece.id === 'target');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
  const ref = output + name;
  await atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
  return ref;
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
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
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: characteristicIds });
}
async function sceneFor(context, { purchaseBurrow = true } = {}) {
  const legacy = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const original = (await read(foundation + 'base/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context,
    ...(characteristicIds.length ? { characteristicDefinitionIds: characteristicIds } : {}),
    relocationDefinitionIds: [definitionId], includeCharacteristicConsumers: !defiler,
    ...(bileLauncher ? { battlefieldModifierDefinitionIds: ['unit:bile_launcher/source-of-creep-any-phase@1'],
      includeDetectionHiddenLoss: true, includeHiddenRangedAndEvade: true } : {}),
    legacyDisclosurePolicy: legacy.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: singleModel ? { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'],
        units: [{ unitInstanceId: pieceId, recordKey: 'army_units:' + profile.recordId, compositionKind: 'small',
          upgrades: defiler && purchaseBurrow ? [{ upgradeName: 'Burrow Ambush' }] : [] }] }
        : (await read(foundation + 'roster-preflight.json')).candidate,
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
        units: [{ unitInstanceId: 'target', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] }] },
    } });
  const keys = ['officialDeploymentGeometryBinding', 'officialDeploymentGeometryDataBundle',
    'officialMissionDeploymentDraftDataBundle', 'officialMissionDeploymentDraft', 'officialMissionDeploymentDraftBinding',
    'selectedDeployment', 'selectedMission', 'officialStatusStayInPlayDataBundle'];
  const state = { ...Object.fromEntries(keys.filter(key => legacy[key] !== undefined).map(key => [key, structuredClone(legacy[key])])),
    ...Object.fromEntries(['board', 'engagementScale', 'armyBuildingEngagementScale', 'officialMissionRuntimeDescriptor',
      'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'].map(key => [key, structuredClone(original[key])])),
    ...setup.state, round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
  arrange(enemy(state), 42, 4);
  assert.equal(actor(state).isInReserves, true);
  if (defiler) {
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  } else {
    const dataset = await read('build/ticket-28-wave3-release-context-20261112-v1/legacy-dataset.json');
    const supplyData = createOfficialSupplyPoolDataBundleV1({ dataset, gameplayDataBundle: legacy.officialGameplayDataBundle });
    const supply = resolveOfficialRoundOneSupplyPoolV1({ supplyPoolDataBundle: supplyData,
      unitCardSupplyDataBundle: state.officialUnitCardSupplyDataBundle, round: 1,
      playerSideKeys: ['player1', 'player2'], rulesOwnedSupplyPoolRequested: true });
    for (const side of ['player1', 'player2']) state.players[side].supply = supply.supplyPoolBySide[side];
  }
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    scale: 'Standard', budget: 2000, partialLegalRosters: true, declaredPhaseAndEnemyPosition: true,
    reserveUnitFactoryGenerated: true, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function parameters(state) {
  if (singleModel) return { leadingModelId: actor(state).models[0].id,
    entrySegmentId: state.officialDeploymentGeometryBinding.entryEdgesByPlayer.player1.segments[0].segmentId,
    placements: [{ modelId: actor(state).models[0].id, xMilliInches: 12000, yMilliInches: 26000,
      elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 }] };
  const original = (await read(foundation + 'base/authority.json')).state;
  return { leadingModelId: actor(state).models[0].id,
    entrySegmentId: state.officialDeploymentGeometryBinding.entryEdgesByPlayer.player1.segments[0].segmentId,
    placements: actor(state).models.map((model, i) => ({ modelId: model.id,
      xMilliInches: Math.round((actor(original).models[i].xInches + 2) * 1000),
      yMilliInches: Math.round((actor(original).models[i].yInches + 16) * 1000),
      elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 })) };
}
const query = (runtime, state, parameters) => runtime.query(state, {
  queryKind: 'relocation_preview', pieceId, definitionId, parameters });
async function registerScene(context, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, expectedVersion);
  const ref = await save('runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: sourceId, dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: sourceId, purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    try { assert.deepEqual(authority, await read(output + 'authority.json')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await save('authority.json', authority); }
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry(), authority = await read(output + 'authority.json');
  const context = await product.resolver.resolve({ releaseId: sourceId, purpose: 'area_ability_component' });
  const runtime = runtimeFor(context, authority.state);
  assert.deepEqual(runtime.descriptor, await read(output + 'runtime.json'));
  const native = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  return { ...product, authority, runtime, native, close() { native.close(); product.close(); } };
}
async function checkpoint(product) {
  const current = await product.native.store.loadRoom(roomId), ref = 'checkpoint-r' + current.stateRevision + '.json';
  try { assert.deepEqual(current.envelope, (await read(output + ref)).envelope); }
  catch (error) { if (error.code !== 'ENOENT') throw error; await save(ref, { envelope: current.envelope }); }
  return current;
}
async function replay(native, id, prefix) {
  const before = await native.store.loadRoom(id), bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let i = 0; i <= receipts.length; i++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(prefix + i + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), before);
  return { receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function legacyRavager(product) {
  const prefix = 'build/ticket-28-wave2-capabilities-20261113-v1/ravager-burrow-ambush/small/repaired-r2/';
  const authority = await read(prefix + 'authority.json');
  product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
  const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'ability_component' });
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
    definitionIds: authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds });
  assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
  const manifest = await read('build/ticket-28-wave2-capabilities-20261113-v1/large-melee-and-groups/space-recovery-manifest.json');
  const entry = manifest.entries.find(row => row.path === prefix + 'room.sqlite' && row.restoredByteHashVerified);
  assert(entry);
  const archive = await fs.readFile(path.join(root, entry.archivePath)), bytes = gunzipSync(archive);
  assert.equal(bytes.length, entry.bytes); assert.equal(sha256(bytes), entry.sha256);
  const filename = path.join(directory, 'legacy-room.sqlite');
  try { await fs.access(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(filename, bytes, { flag: 'wx' }); }
  const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    const id = 'wave2-ravager-burrow-ambush-small';
    await native.restoreDependencies(id, authority);
    const result = await replay(native, id, prefix + 'checkpoint-r');
    assert.equal(sha256(await fs.readFile(path.join(root, entry.archivePath))), sha256(archive));
    return { ...result, runtimeVersion: runtime.descriptor.runtimeVersion, descriptorExact: true,
      restoredOriginalBytesVerified: true, originalArchiveUnchanged: true };
  } finally { native.close(); }
}
async function previousVileling(product, previousSubject = 'vileling') {
  const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/' + previousSubject + '-burrow/';
  const authority = await read(prefix + 'authority.json');
  product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
  const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
    definitionIds: authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds });
  assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
  assert.equal(runtime.descriptor.runtimeVersion, profiles[previousSubject].version);
  const originalFile = path.join(root, prefix, 'room.sqlite'), bytes = await fs.readFile(originalFile);
  const copy = path.join(directory, 'legacy-room.sqlite');
  try { await fs.access(copy); }
  catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(copy, bytes, { flag: 'wx' }); }
  const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    const previousRoomId = 'wave3-' + previousSubject + '-burrow';
    await native.restoreDependencies(previousRoomId, authority);
    const result = await replay(native, previousRoomId, prefix + 'checkpoint-r');
    assert.equal(sha256(await fs.readFile(originalFile)), sha256(bytes));
    return { ...result, runtimeVersion: runtime.descriptor.runtimeVersion, descriptorExact: true, originalDatabaseUnchanged: true };
  } finally { native.close(); }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: defiler ? 'T28-W3-09-Defiler-Burrow-Ambush-v1'
      : bileLauncher ? 'T28-W3-09-Bile-Launcher-Burrow-Ambush-v1' : 'T28-W3-09-Vileling-Burrow-Ambush-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context); await registerScene(context, scene);
      const runtime = runtimeFor(context, scene.state), domain = runtime.enumerate(scene.state).parameterDomains.find(row => row.definitionId === definitionId);
      assert(domain);
      if (!singleModel) assert.equal(domain.sourceDomain.constraints.coherencyRangeMilliInches, 4000);
      assert.equal(domain.sourceDomain.constraints.maxDistanceMilliInches, 18000);
      assert.equal(domain.sourceDomain.constraints.minimumEnemyGapMilliInchesExclusive, 10000);
      const p = await parameters(scene.state), good = query(runtime, scene.state, p);
      assert.equal(p.placements.length, expectedModels);
      if (bileLauncher) {
        const unit = scene.state.officialActionRouteCatalogue.units.find(row => row.pieceId === pieceId);
        assert.equal(unit.movementProfile, null);
        assert.equal(actor(scene.state).models[0].baseShape, 'round');
        assert.equal(actor(scene.state).models[0].baseWidthInches, 3.937);
      }
      for (const [name, mutate, pattern] of [
        ['incomplete_formation', p => { p.placements.pop(); }, /RELOCATION_|GEOMETRY_/],
        ['beyond_entry_distance', p => { p.placements.forEach(row => { row.yMilliInches -= 15000; }); }, /EDGE_DISTANCE_EXCEEDED/],
        ['full_base_outside', p => { p.placements[0].xMilliInches = 0; }, /RELOCATION_|GEOMETRY_/],
        ...(singleModel
          ? [['unknown_model', p => { p.placements[0].modelId = 'not-a-source-model'; }, /RELOCATION_|GEOMETRY_/]]
          : [['broken_coherency', p => { p.placements.at(-1).xMilliInches += 13000; }, /MODEL_BASE_GEOMETRY_WHOLLY_WITHIN_REQUIRED/]]),
      ]) { const altered = structuredClone(p); mutate(altered); assert.throws(() => query(runtime, scene.state, altered), pattern, name); }
      const near = structuredClone(scene.state), model = enemy(near).models[0];
      const radiusSum = (actor(near).models[0].baseWidthInches + model.baseWidthInches) * 500;
      model.xInches = (p.placements[0].xMilliInches + Math.floor(radiusSum) + 10000) / 1000;
      model.yInches = p.placements[0].yMilliInches / 1000;
      assert.throws(() => query(runtime, near, p), /RELOCATION_ENEMY_GAP_REQUIRED/);
      model.xInches += 0.020; assert(query(runtime, near, p));
      if (defiler) {
        const unpurchased = await sceneFor(context, { purchaseBurrow: false });
        const unpurchasedMenu = runtimeFor(context, unpurchased.state).enumerate(unpurchased.state);
        assert.equal(unpurchasedMenu.parameterDomains.some(row => row.definitionId === definitionId), false);
        await save('roster-purchase.json', { candidate: scene.state.armyCompositionUpgradeAuditsBySide.player1,
          sourceUnit: context.dataset.recordsByKey['army_units:defiler'].payload.small,
          sourceUpgrade: context.dataset.recordsByKey['army_units:defiler'].payload.upgrades[2],
          unpurchasedAbilityExcluded: true, modelCalls: 0 });
      }
      const definition = runtime.catalogue.definitions.find(row => row.definitionId === definitionId);
      assert.equal(definition.execution.status, 'executable_exact');
      const ref = await save('compile.json', { definition, domain, good,
        ...(bileLauncher ? { singleModel100mm: true, nullSpeedPlaceSupported: true }
          : defiler ? { singleModel: true, baseWidthInches: actor(scene.state).models[0].baseWidthInches, purchasedUpgrade: true }
          : { eighteenModels: true }),
        exactEnemyBoundaryRejectedAndAboveAccepted: true, declaredFullBaseAndCoherencyControls: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const credentials = await product.native.create(roomId, product.authority); await checkpoint(product);
      const initial = (await read(output + 'checkpoint-r0.json')).envelope.state, p = await parameters(initial);
      const before = await product.native.store.loadRoom(roomId), preview = query(product.runtime, initial, p);
      assert.deepEqual(await product.native.store.loadRoom(roomId), before);
      const result = await product.native.commit({ roomId, credential: credentials.player1, operationKey: 'burrow',
        select: row => row.definitionId === definitionId, parameters: () => p });
      assert.deepEqual(result.preview.core.action, preview.result.action);
      const current = await checkpoint(product), state = current.envelope.state;
      assert.equal(actor(state).isOnField, true); assert.equal(actor(state).isInReserves, false);
      assert.equal(actor(state).currentModels, expectedModels); assert.equal(actor(state).currentSupply, expectedSupply);
      assert.equal(actor(state).activatedPhases.movement, true); assert.equal(state.activeSideKey, 'player2');
      assert.equal(state.selectedRosterActivationWindow, undefined); assert.equal(state.pendingOfficialReactionWindow, undefined);
      assert.deepEqual(state.cardResources, initial.cardResources); assert.equal(state.relocationAbilityHistory.length, 1);
      const supply = projectOfficialDeploymentSupplyV1(state, 'player1'); assert.equal(supply.committed, expectedSupply);
      const ref = await save('consume.json', { revision: current.stateRevision,
        currentModels: expectedModels, currentSupply: expectedSupply, supply,
        queryEqualsNative: true, queryNoMutation: true, duplicateIdempotence: result.idempotentReplayVerified,
        parentActivationEnded: true, nextSide: 'player2', cardsUnchanged: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const credentials = await product.native.create(roomId, product.authority), model = enemy(product.authority.state).models[0];
      await product.native.commit({ roomId, credential: credentials.player2, operationKey: 'enemy-move',
        select: row => row.actionType === 'move' && row.pieceId === 'target', parameters: () => ({ leadingModelId: model.id,
          path: [{ xMilliInches: 42000, yMilliInches: 4000 }, { xMilliInches: 42000, yMilliInches: 4200 }], placements: [] }) });
      await checkpoint(product);
      await product.native.commit({ roomId, credential: credentials.player2, operationKey: 'enemy-finish',
        select: row => row.actionType === 'finish_activation' && row.pieceId === 'target', parameters: () => ({}) });
      const after = await checkpoint(product); assert.equal(after.envelope.state.relocationAbilityHistory.length, 1);
      assert.equal(enemy(after.envelope.state).activatedPhases.movement, true);
      const ref = await save('successor.json', { revision: after.stateRevision, opponentMovedAndFinished: true,
        deploymentNotReexecuted: true, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      await product.native.restoreDependencies(roomId, product.authority);
      const current = await replay(product.native, roomId, output + 'checkpoint-r');
      const legacy = defiler ? await previousVileling(product, 'bile-launcher')
        : bileLauncher ? await previousVileling(product) : await legacyRavager(product);
      const ref = await save('cold-recovery.json', { current, legacy, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: subject + '-burrow', status: gate.status, failures: gate.failures.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
