import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialSpecialUnitPieceV1 } from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { hasOfficialPhaseActivationAvailableV1 } from '../packages/rule-atoms/official-phase-activation-availability-v1.mjs';
import { inspectOfficialMissionMarkerControlV2, resolveOfficialMissionMarkerControlV2 }
  from '../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs';
import { projectOfficialContextualSupplyValueV1 } from '../packages/rule-atoms/official-contextual-supply-projection-v1.mjs';
import { canOfficialUnitBeAbilityTargetV1 } from '../packages/rule-atoms/official-decoy-rules-v1.mjs';
import { resolveOfficialCurrentSupplyValueV1 } from '../packages/rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, commitWave3RangedBatchV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/generated-structure/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const definitions = ['unit:auto_turret/structure-any-phase@1', 'unit:sabotage_drone/structure-any-phase@1'];
const sourceCheckpoint = 'build/ticket-28-terran-wave3-20261117-v1/griffin-support/native/checkpoint-r5.json';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const roomId = id => 'wave3-generated-structure-' + id;
const releaseId = id => roomId(id) + '-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
  const ref = output + name;
  await atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n'); return ref;
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
    const manifest = await read(sourceRef); product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
function runtimeFor(context, state, id) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: [],
    ...(id === 'ranged' ? { includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true } : {}) });
}
function arrangeMarine(piece, x, y) {
  arrange(piece, x, y);
  piece.models.forEach((model, index) => Object.assign(model, {
    xInches: x + index % 3 * (model.baseWidthInches + 0.02),
    yInches: y + Math.floor(index / 3) * (model.baseDepthInches + 0.02) }));
}
async function sceneFor(context, id) {
  const original = (await read(sourceCheckpoint)).envelope.state;
  const setup = createOfficialReleaseRosterStateV2({ context, structureDefinitionIds: definitions,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'marine-a', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'marine-b', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'absent-marine', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] }] },
    } });
  const phase = id === 'ranged' ? 'assault' : 'movement';
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(original[key])])), ...setup.state,
    round: 1, phase, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } } };
  state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  arrangeMarine(pieceOf(state, 'marine-a'), 10, 10);
  arrangeMarine(pieceOf(state, 'marine-b'), 10, 20);
  const absent = pieceOf(state, 'absent-marine');
  absent.isOnField = false; absent.isInReserves = false;
  absent.models.forEach(model => model.isOnField = false);
  const drone = structuredClone(original.pieces.find(piece => piece.officialUnitRecordKey === 'army_units:sabotage_drone'));
  state.pieces.push(drone);
  const turret = createOfficialSpecialUnitPieceV1(state, 'player2', 'army_units:auto_turret', 'declared-turret');
  arrange(turret, id === 'ranged' ? 16 : 35, 10); state.pieces.push(turret);
  const coherency = declareCoherency(state);
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    sourceCheckpoint, retainedActualGeneratedDrone: true, turretDeclaredFromFormalGeneratedPieceFactory: true,
    absentMarineDeclaredNotFieldedAndNotInReserves: true, scale: 'Standard2000-budget partial legal rosters',
    phaseAndPositionsDeclared: true, coherency, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state, id); assert.equal(runtime.descriptor.runtimeVersion, '3.90.0');
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
    if (old) assert.deepEqual(old, authority); else await save(id + '/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state, id);
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
async function invoke(branch, credentials, key, select, parameters) {
  const before = await checkpoint(branch);
  const committed = await branch.native.commit({ roomId: roomId(branch.id),
    credential: credentials[before.envelope.state.activeSideKey], operationKey: key, select, parameters });
  await checkpoint(branch);
  const after = await read(output + branch.id + '/checkpoint-r' + (committed.preview.core.expectedStateRevision + 1) + '.json');
  return { committed, after };
}
async function missionState(state) {
  const result = structuredClone(state);
  const board = (await read('build/ticket-28-terran-wave3-20261116-v1/holo-decoy-rules/solo-control/authority.json')).state.board;
  result.board.missionMarkerControlGeometry = structuredClone(board.missionMarkerControlGeometry);
  const turret = pieceOf(result, 'declared-turret').models[0];
  const drone = result.pieces.find(piece => piece.officialUnitRecordKey === 'army_units:sabotage_drone').models[0];
  result.board.missionMarkers = [turret, drone].map((model, index) => ({ ...structuredClone(board.missionMarkers[0]),
    id: 'structure-marker-' + index, number: index + 1, xInches: model.xInches, yInches: model.yInches }));
  return result;
}
async function controls(context, runtime, state) {
  const before = JSON.stringify(state);
  const structures = state.pieces.filter(piece => piece.isStructure);
  const queries = structures.map(piece => {
    const query = runtime.query(state, { queryKind: 'structure_constraints', pieceId: piece.id });
    assert.equal(query.constraints.activationProhibited, true); assert.equal(query.constraints.missionControlProhibited, true);
    assert.equal(canOfficialUnitBeAbilityTargetV1(state, piece), false);
    for (const supplyContext of ['supply_pool_calculation', 'mission_marker_control', 'objective_completion', 'disengage_check']) {
      const supply = projectOfficialContextualSupplyValueV1({ state, pieceId: piece.id, context: supplyContext });
      assert.equal(supply.effectiveSupply, 0); assert.equal(supply.applicableDefinitionIds[0], query.sourceDefinitionId);
    }
    return query;
  });
  const onlyStructures = structuredClone(state);
  onlyStructures.pieces.filter(piece => !piece.isStructure).forEach(piece => {
    piece.isOnField = false; piece.isInReserves = false; piece.models.forEach(model => model.isOnField = false);
  });
  for (const side of ['player1', 'player2']) for (const phase of ['movement', 'assault', 'combat']) {
    assert.equal(hasOfficialPhaseActivationAvailableV1(onlyStructures, side, phase), false);
  }
  const marked = await missionState(state);
  const inspected = inspectOfficialMissionMarkerControlV2({ state: marked });
  assert(inspected.markerResults.every(marker => marker.nextControlSideKey === null));
  assert(inspected.markerResults.every(marker => marker.ineligibleUnits.some(row => row.reason === 'structure')));
  const cleanup = structuredClone(marked); cleanup.phase = 'cleanup';
  const resolved = resolveOfficialMissionMarkerControlV2({ state: cleanup,
    matchBinding: { rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash } } });
  assert.deepEqual(resolved.markerResults, inspected.markerResults);
  const zero = structuredClone(marked); const marine = pieceOf(zero, 'marine-a');
  zero.board.missionMarkers[0].xInches = 27; zero.board.missionMarkers[0].yInches = 30;
  marine.currentModels = 3;
  marine.destroyedModelIds = marine.models.slice(3).map(model => model.id).sort();
  marine.models.forEach((model, index) => Object.assign(model, index < 3
    ? { xInches: 27 + index * (model.baseWidthInches + 0.02), yInches: 28 }
    : { isDestroyed: true, isOnField: false, remainingWounds: 0 }));
  marine.currentSupply = resolveOfficialCurrentSupplyValueV1({ unitCardSupplyDataBundle: zero.officialUnitCardSupplyDataBundle,
    recordKey: marine.officialUnitRecordKey, currentModels: 3, isDestroyed: false, rulesOwnedCurrentModelCountRequested: true }).currentSupplyValue;
  assert.equal(marine.currentSupply, 0);
  const zeroFacts = inspectOfficialMissionMarkerControlV2({ state: zero });
  assert.equal(zeroFacts.markerResults[0].nextControlSideKey, 'player1');
  assert.equal(zeroFacts.markerResults[0].contestingUnitsBySide.player2.length, 0);
  const forged = structuredClone(state); forged.officialStructureSourceBundle.definitions[0].payloadHash = '0'.repeat(64);
  assert.throws(() => runtimeFor(context, forged, 'movement'), /STRUCTURE_SOURCE_MISMATCH/);
  const wrongPiece = structuredClone(state); pieceOf(wrongPiece, structures[0].id).isStructure = false;
  assert.throws(() => runtime.query(wrongPiece, { queryKind: 'structure_constraints', pieceId: structures[0].id }), /UNIT_SOURCE_MISMATCH/);
  assert.equal(canOfficialUnitBeAbilityTargetV1(state, pieceOf(state, 'marine-a')), true);
  assert.equal(JSON.stringify(state), before);
  return { queries, allActivationPhasesExcluded: true, inspected, resolvedMarkerResults: resolved.markerResults,
    normalZeroSupplyException: zeroFacts.markerResults[0], sourceTamperRejected: true,
    nonStructureAbilityRecipientAllowed: true, sourceStateUnchanged: true, privateDeclaredMarkerScenes: true };
}
async function replay(native, id, prefix) {
  const before = await native.store.loadRoom(id); const bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= before.stateRevision; revision++) {
    const replayed = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(replayed.ok, true, JSON.stringify(replayed));
    assert.deepEqual(replayed.envelope, (await read(prefix + revision + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), before);
  return { receipts: receipts.length, checkpoints: before.stateRevision + 1, exact: true };
}
async function verifyLegacy(product) {
  const results = [];
  for (const spec of [
    { id: 'griffin', prefix: 'build/ticket-28-terran-wave3-20261117-v1/griffin-support/', branch: 'native', roomId: 'wave3-griffin-support', version: '3.89.0' },
    { id: 'rapid', prefix: 'build/ticket-28-terran-wave3-20261116-v1/generated-unit-source/', branch: 'native', roomId: 'wave3-generated-unit-source', version: '3.74.0' },
  ]) {
    const previous = await cached('legacy/' + spec.id + '.json'); if (previous) { results.push(previous); continue; }
    const prefix = spec.prefix + spec.branch + '/'; const authority = await read(prefix + 'authority.json');
    let manifest = authority.dependencies.dataSnapshot.content.releaseManifest;
    if (!manifest) {
      const oldStore = new DatabaseSync(path.join(root, spec.prefix, 'releases.sqlite'), { readOnly: true });
      try { manifest = JSON.parse(oldStore.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?')
        .get(authority.releaseId).manifest_json); } finally { oldStore.close(); }
    }
    product.resolver.register(manifest);
    const context = await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
      definitionIds: spec.id === 'griffin' ? [] : ['unit:immortal/for-the-ancients-assault-phase@1'],
      ...(spec.id === 'rapid' ? { weaponDefinitionIds: ['unit:immortal/left-photon-disruptor-assault-phase@1',
        'unit:immortal/right-photon-disruptor-assault-phase@1'], includeRanged: true, includePrecisionChoices: true,
        includeArmourChoices: true, includePointDefenseChoices: true } : {}) });
    assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
    const originalFile = path.join(root, prefix, 'room.sqlite'); const originalHash = sha256(await fs.readFile(originalFile));
    const legacyDir = path.join(directory, 'legacy', spec.id); await fs.mkdir(legacyDir, { recursive: true });
    const copy = path.join(legacyDir, 'room.sqlite');
    try { await fs.access(copy); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.copyFile(originalFile, copy); }
    const native = openWave3EngineeringRoomV1({ directory: legacyDir, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    try {
      await native.restoreDependencies(spec.roomId, authority);
      const result = await replay(native, spec.roomId, prefix + 'checkpoint-r');
      assert.equal(sha256(await fs.readFile(originalFile)), originalHash);
      const value = { id: spec.id, ...result, runtimeVersion: spec.version, descriptorExact: true,
        originalDatabaseSha256: originalHash, originalDatabaseUnchanged: true, modelCalls: 0 };
      await save('legacy/' + spec.id + '.json', value); results.push(value);
    } finally { native.close(); }
  }
  return results;
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-08-generated-Structure-activation-supply-control-targeting-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      for (const id of ['movement', 'ranged']) await registerScene(context, id, await sceneFor(context, id));
      const state = (await read(output + 'movement/authority.json')).state; const runtime = runtimeFor(context, state, 'movement');
      const entries = definitions.map(id => runtime.catalogue.definitions.find(row => row.definitionId === id));
      assert(entries.every(definition => definition.execution.status === 'executable_exact'));
      const tested = await controls(context, runtime, state);
      const ref = await save('compile.json', { definitions: entries, controls: tested, source: state.officialStructureSourceBundle, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const branch = await product.branch('movement');
      try {
        const credentials = await branch.native.create(roomId(branch.id), branch.authority);
        const current = await checkpoint(branch);
        const queries = current.envelope.state.pieces.filter(piece => piece.isStructure)
          .map(piece => branch.runtime.query(current.envelope.state, { queryKind: 'structure_constraints', pieceId: piece.id }));
        assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), current);
        const actor = pieceOf(branch.authority.state, 'marine-a'); const first = actor.models[0];
        await invoke(branch, credentials, 'move', row => row.actionType === 'move' && row.pieceId === actor.id,
          () => ({ leadingModelId: first.id, path: [{ xMilliInches: 10000, yMilliInches: 10000 }, { xMilliInches: 11000, yMilliInches: 10000 }],
            placements: actor.models.slice(1).map(model => ({ modelId: model.id,
              xMilliInches: Math.round(model.xInches * 1000) + 1000, yMilliInches: Math.round(model.yInches * 1000), rotationDegrees: 0 })) }));
        const finished = await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === actor.id, () => ({}));
        assert.equal(finished.after.envelope.state.activeSideKey, 'player1');
        const menu = branch.runtime.enumerate(finished.after.envelope.state);
        assert(menu.parameterDomains.some(row => row.pieceId === 'marine-b' && row.actionType === 'move'));
        assert(!menu.parameterDomains.some(row => row.pieceId === 'declared-turret'));
        const ref = await save('consume.json', { queries, revision: finished.committed.preview.core.expectedStateRevision + 1,
          actualNextSide: 'player1', nextMarineMoveAvailable: true, onlyStructureOpponentSkipped: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const branch = await product.branch('ranged');
      try {
        const credentials = await branch.native.create(roomId(branch.id), branch.authority); await checkpoint(branch);
        const shot = await commitWave3RangedBatchV1({ directory: path.join(directory, branch.id), native: branch.native,
          runtime: branch.runtime, roomId: roomId(branch.id), credentials, attackerSideKey: 'player1', attackerPieceId: 'marine-a',
          targetPieceId: 'declared-turret', weaponName: 'C-14 rifle', operationKey: 'shot', selectPoolParameters: poolParameters });
        // The shared batch helper saves phase-specific continuations. Preserve
        // all signed intermediate envelopes for the same prefix replay check.
        const bundle = await branch.native.store.loadReplayBundle(roomId(branch.id));
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= shot.after.stateRevision; revision++) {
          if (await cached(branch.id + '/checkpoint-r' + revision + '.json')) continue;
          const replayed = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(replayed.ok, true, JSON.stringify(replayed));
          await save(branch.id + '/checkpoint-r' + revision + '.json', { envelope: replayed.envelope });
        }
        const finished = await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'marine-a', () => ({}));
        assert.equal(finished.after.envelope.state.activeSideKey, 'player1');
        const ref = await save('successor.json', { rangedQueryEqualsNative: true, ordinaryAttackCanTargetStructure: true,
          event: shot.event, sourceDefenderIsStructure: true, actualNextSide: 'player1', modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const id of ['movement', 'ranged']) {
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
  console.log(JSON.stringify({ gate: 'generated-structure', status: result.status, failures: result.failures.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
export { sourceProduct, runtimeFor, sceneFor, registry, verifyLegacy };
