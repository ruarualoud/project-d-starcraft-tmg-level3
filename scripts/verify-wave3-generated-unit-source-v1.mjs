import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialCombatProfileBundleV1 } from '../packages/source-data/official-combat-profile-bundle-v1.mjs';
import { createOfficialAttackProfileCatalogueV3 } from '../packages/source-data/official-attack-profile-catalogue-v1.mjs';
import { getOfficialReleaseModelBaseGeometryBundleV2 } from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import { createOfficialSpecialUnitPieceV1 } from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialGeneratedUnitDataBundleV2 } from '../packages/source-data/official-generated-unit-data-bundle-v2.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = 'build/ticket-28-terran-wave3-20261116-v1/generated-unit-source/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/rapid-ingress-producer/';
const definitionId = 'card:raynor_s_raiders/rapid-ingress-any@1';
const characteristicIds = ['unit:immortal/for-the-ancients-assault-phase@1'];
const weaponIds = ['unit:immortal/left-photon-disruptor-assault-phase@1', 'unit:immortal/right-photon-disruptor-assault-phase@1'];
const generatedKeys = ['army_units:holo_decoy', 'army_units:auto_turret', 'army_units:sabotage_drone'];
const releaseId = 'wave3-generated-unit-source-v1';
const roomId = 'wave3-generated-unit-source';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return output + name;
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
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: characteristicIds, weaponDefinitionIds: weaponIds, includeRanged: true,
    includePrecisionChoices: true, includeArmourChoices: true, includePointDefenseChoices: true });
}
async function sceneFor(context) {
  const base = (await read(parent + 'before/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context,
    candidatesBySide: (await read(parent + 'compile.json')).candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    unitLifecycleDefinitionIds: [definitionId], additionalGeneratedUnitRecordKeys: generatedKeys,
    characteristicDefinitionIds: characteristicIds });
  const fields = ['round', 'phase', 'activeSideKey', 'firstPlayerSideKey', 'engagementScale', 'armyBuildingEngagementScale',
    'board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor',
    'supplyLossLedger', 'phaseFirstActorByRound', 'officialFaqReactionPolicy'];
  let state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined).map(key => [key, structuredClone(base[key])])),
    ...setup.state, log: [] };
  for (const piece of state.pieces) {
    const original = base.pieces.find(row => row.id === piece.id);
    piece.isOnField = true;
    piece.isInReserves = false;
    for (const model of piece.models) {
      const previous = original.models.find(row => row.id === model.id);
      Object.assign(model, { isOnField: true, xInches: previous.xInches, yInches: previous.yInches });
    }
  }
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { existingRosterAndDeclaredPositionsFrom: parent + 'before/authority.json',
    generatedRecordsAreDataOnly: true, fullMatch: false, modelCalls: 0 } };
}
async function openProduct() {
  const product = registry();
  const context = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
  const authority = await read(output + 'native/authority.json');
  const runtime = runtimeFor(context, authority.state);
  assert.deepEqual(runtime.descriptor, await read(output + 'native/runtime.json'));
  const native = openWave3EngineeringRoomV1({ directory: path.join(directory, 'native'), filename: 'room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  return { context, authority, runtime, native, close() { native.close(); product.close(); } };
}
async function checkpoint(native) {
  const current = await native.store.loadRoom(roomId);
  await save('native/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
  return current;
}
function assertGeneratedPiece(state, recordKey, id) {
  const piece = createOfficialSpecialUnitPieceV1(state, 'player1', recordKey, id);
  const profile = state.officialGeneratedUnitDataBundle.profiles.find(row => row.recordKey === recordKey);
  const combat = state.officialCombatProfileBundle.profiles.find(row => row.recordKey === recordKey);
  assert.equal(piece.sizeCharacteristic, profile.sizeCharacteristic);
  assert.equal(piece.isStructure, profile.isStructure);
  assert.equal(piece.currentSupply, 0);
  assert.equal(piece.isOnField, false);
  assert.equal(piece.isInReserves, false);
  assert.equal(piece.includedInArmyListDuringArmyBuilding, false);
  assert.equal(piece.models[0].remainingWounds, combat.hitPoints);
  assert.deepEqual(piece.officialGeneratedUnitProfileBinding, {
    bundleHash: state.officialGeneratedUnitDataBundle.bundleHash, profileHash: profile.profileHash });
  assert.deepEqual(JSON.parse(JSON.stringify(piece)), piece);
  return piece;
}
function movementParameters(state) {
  const models = state.pieces.find(row => row.id === 'marauders').models;
  return { leadingModelId: models[0].id,
    path: [{ xMilliInches: Math.round(models[0].xInches * 1000), yMilliInches: Math.round(models[0].yInches * 1000) },
      { xMilliInches: Math.round(models[0].xInches * 1000) + 1000, yMilliInches: Math.round(models[0].yInches * 1000) }],
    placements: models.slice(1).map(model => ({ modelId: model.id, xMilliInches: Math.round(model.xInches * 1000) + 1000,
      yMilliInches: Math.round(model.yInches * 1000), rotationDegrees: 0, elevationId: 'ground', supportSurfaceIds: [] })) };
}

await fs.mkdir(directory, { recursive: true });
if (process.argv.includes('--baseline')) {
  const context = await sourceProduct();
  const state = structuredClone((await read(parent + 'before/authority.json')).state);
  state.officialModelBaseGeometryDataBundle = getOfficialReleaseModelBaseGeometryBundleV2(context);
  state.officialCombatProfileBundle = createOfficialCombatProfileBundleV1({ dataset: context.dataset,
    snapshot: context.snapshot, recordKeys: ['army_units:holo_decoy'] });
  const errors = {};
  try { createOfficialSpecialUnitPieceV1(state, 'player1', 'army_units:holo_decoy', 'decoy'); }
  catch (error) { errors.holoDecoy = error.message; }
  try { createOfficialAttackProfileCatalogueV3({ context, recordKeys: ['army_units:auto_turret'] }); }
  catch (error) { errors.autoTurret = error.message; }
  assert.match(errors.holoDecoy || '', /UNIT_LIFECYCLE_SPECIAL_UNIT_SIZE_MISSING/);
  // Record the parser outcome independently from the missing generated-unit profile.
  await save('baseline-reproduction.json', { sourceRef, errors, modelCalls: 0 });
  console.log(JSON.stringify({ status: 'reproduced', errors }));
} else {
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-08-generated-unit-source-factory-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context);
      const state = scene.state;
      const runtime = runtimeFor(context, state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.74.0');
      const pieces = generatedKeys.map((key, index) => assertGeneratedPiece(state, key, 'generated-' + index));
      assert.deepEqual(pieces.map(row => [row.sizeCharacteristic, row.isStructure]), [[2, false], [2, true], [1, true]]);
      assert(!state.pieces.some(row => generatedKeys.includes(row.officialUnitRecordKey)));
      const attacks = createOfficialAttackProfileCatalogueV3({ context, recordKeys: ['army_units:auto_turret'] });
      await save('auto-turret-attack-catalogue.json', attacks);
      const forged = structuredClone(state);
      const profile = forged.officialGeneratedUnitDataBundle.profiles.find(row => row.recordKey === 'army_units:holo_decoy');
      profile.printedSize = '3'; profile.sizeCharacteristic = 3;
      profile.profileHash = hash(Object.fromEntries(Object.entries(profile).filter(([key]) => key !== 'profileHash')));
      const bundle = forged.officialGeneratedUnitDataBundle;
      bundle.bundleHash = hash(Object.fromEntries(Object.entries(bundle).filter(([key]) => key !== 'bundleHash')));
      assert.throws(() => runtimeFor(context, forged), /CHARACTERISTIC_GENERATED_UNIT_SOURCE_MISMATCH/);
      const mismatch = structuredClone(state);
      mismatch.officialCombatProfileBundle.profilesByRecordKey['army_units:holo_decoy'].payloadHash = '0'.repeat(64);
      assert.throws(() => createOfficialSpecialUnitPieceV1(mismatch, 'player1', 'army_units:holo_decoy', 'bad'), /GENERATED_PROFILE_BINDING_MISMATCH/);
      assert.throws(() => createOfficialGeneratedUnitDataBundleV2({ context, recordKeys: ['army_units:marine'] }), /SOURCE_CLASSIFICATION_INVALID/);
      assert.throws(() => createOfficialGeneratedUnitDataBundleV2({ context, recordKeys: ['army_units:holo_decoy', 'army_units:holo_decoy'] }), /EXPLICIT_RECORDS_REQUIRED/);
      const runtimeRef = await save('native/runtime.json', runtime.descriptor);
      const product = registry();
      try {
        const m = context.manifest;
        product.resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
          sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
          sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
          components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
            integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
        const resolved = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
        await save('native/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state, scenario: scene.scenario }));
      } finally { product.close(); }
      const ref = await save('compile.json', { generatedPieces: pieces, sourceBundle: state.officialGeneratedUnitDataBundle,
        originalArmyCountUnchanged: state.pieces.length, deploymentAuthorityGranted: false,
        abilitiesImplemented: false, forgedSourceRejected: true, mismatchedCombatSourceRejected: true });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const { native, runtime } = product;
      const credentials = await native.create(roomId, product.authority);
      const before = await checkpoint(native);
      const parameters = { activeUnitId: 'marauders', paymentCardInstanceIds: [], coordinate: { xMilliInches: 10000, yMilliInches: 17000 } };
      const query = runtime.query(before.envelope.state, { queryKind: 'unit_lifecycle_placement_preview', pieceId: 'marauders', parameters });
      assert.deepEqual(await native.store.loadRoom(roomId), before);
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'summon-defense-drone',
        select: row => row.definitionId === definitionId, parameters: () => parameters });
      const after = await checkpoint(native);
      const drone = after.envelope.state.pieces.find(row => row.officialUnitRecordKey === 'army_units:point_defense_drone');
      assert(drone?.officialGeneratedUnitProfileBinding);
      assert.equal(drone.isStructure, true);
      assert.equal(drone.sizeCharacteristic, 0);
      assert.equal(after.envelope.state.selectedRosterActivationWindow.pieceId, 'marauders');
      const replay = await native.store.loadReplayBundle(roomId);
      const receipt = replay.privateJournal.find(row => row.payload.type === 'accepted_transition').payload.payload.receipt;
      assert.deepEqual(receipt.action, query.result.action);
      const ref = await save('consume.json', { revision: after.stateRevision, drone, queryEqualsActualAction: true,
        parentActivationContinues: true, queryReadOnly: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: output + 'native/checkpoint-r' + after.stateRevision + '.json' };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const { native } = product;
      const credentials = await native.create(roomId, product.authority);
      let current = await checkpoint(native);
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'parent-move',
        select: row => row.actionType === 'move' && row.pieceId === 'marauders', parameters: () => movementParameters(current.envelope.state) });
      current = await checkpoint(native);
      assert.equal(current.envelope.state.selectedRosterActivationWindow.pieceId, 'marauders');
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'parent-finish',
        select: row => row.actionType === 'finish_activation' && row.pieceId === 'marauders', parameters: () => ({}) });
      current = await checkpoint(native);
      assert.equal(current.envelope.state.activeSideKey, 'player2');
      assert.equal(current.envelope.state.pieces.filter(row => row.officialUnitRecordKey === 'army_units:point_defense_drone').length, 1);
      const ref = await save('successor.json', { revision: current.stateRevision, parentMove: true, nextPlayer: 'player2', generatedOnce: true });
      return { evidenceRef: ref, checkpointRef: output + 'native/checkpoint-r' + current.stateRevision + '.json' };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const { native } = product;
      const before = await native.store.loadRoom(roomId);
      await native.restoreDependencies(roomId, product.authority);
      const replay = await native.store.loadReplayBundle(roomId);
      const receipts = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
      for (let revision = 0; revision <= before.stateRevision; revision++) {
        const result = native.engine.replay({ initialEnvelope: replay.initialEnvelope, journal: receipts.slice(0, revision) });
        assert.equal(result.ok, true, JSON.stringify(result));
        assert.deepEqual(result.envelope, (await read(output + 'native/checkpoint-r' + revision + '.json')).envelope);
      }
      assert.deepEqual(await native.store.loadRoom(roomId), before);
      const ref = await save('cold-recovery.json', { receipts: receipts.length, checkpoints: before.stateRevision + 1,
        allEnvelopesExact: true, sourceProfileBindingsRetained: true });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'generated-unit-source', status: result.status, failures: result.failures.length }));

  if (process.argv.includes('--source-controls')) {
    const controls = await runProductBoundaryCheck({ directory: path.join(directory, 'source-controls'), identity: {
      factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
      sourceRef, contractVersion: 'T28-W3-08-generated-source-record-and-shape-controls-v1',
    }, steps: [
      { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
        const scene = await sceneFor(context);
        assert.deepEqual(scene.state, (await read(output + 'native/authority.json')).state);
        const key = 'army_units:holo_decoy';
        const mismatched = { ...context, dataset: { ...context.dataset, recordsByKey: { ...context.dataset.recordsByKey,
          [key]: { ...context.dataset.recordsByKey[key], sourceRecordHash: '0'.repeat(64) } } } };
        assert.throws(() => createOfficialGeneratedUnitDataBundleV2({ context: mismatched, recordKeys: [key] }), /SOURCE_BINDING_MISMATCH/);
        const malformed = structuredClone(scene.state);
        malformed.officialGeneratedUnitDataBundle.profiles = [null];
        assert.throws(() => runtimeFor(context, malformed), /GENERATED_UNIT_DATA_BUNDLE_INVALID/);
        const attack = (await read(output + 'auto-turret-attack-catalogue.json')).profiles;
        assert.equal(attack.length, 1);
        assert.deepEqual(attack[0].range, { kind: 'inches', normalRangeInches: 8 });
        const ref = await save('source-controls/compile.json', { validFactoryOutputExact: true,
          sourceRecordMismatchRejected: true, malformedBundleTypedRejection: true, autoTurretRangeInches: 8 });
        return { evidenceRef: ref, checkpointRef: ref };
      } },
      { name: 'coldRecovery', repairRef, openProduct, check: async product => {
        const { native } = product;
        await native.restoreDependencies(roomId, product.authority);
        const replay = await native.store.loadReplayBundle(roomId);
        const receipts = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= receipts.length; revision++) {
          const result = native.engine.replay({ initialEnvelope: replay.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(result.ok, true, JSON.stringify(result));
          assert.deepEqual(result.envelope, (await read(output + 'native/checkpoint-r' + revision + '.json')).envelope);
        }
        const ref = await save('source-controls/cold-recovery.json', { receipts: receipts.length,
          checkpoints: receipts.length + 1, sourceValidationOutputUnchanged: true });
        return { evidenceRef: ref, checkpointRef: ref };
      } },
    ] });
    console.log(JSON.stringify({ gate: 'generated-unit-source-controls', status: controls.status, failures: controls.failures.length }));
  }

  if (process.argv.includes('--legacy')) {
    const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-verification'), identity: {
      factoryModule: 'scripts/support/wave3-room-boundary-fixture-v1.mjs', factoryExport: 'openWave3EngineeringRoomV1',
      sourceRef: parent + 'verification/boundary.json', contractVersion: 'T28-W3-08-generated-source-preserves-legacy-v1',
    }, steps: [{ name: 'coldRecovery', repairRef, openProduct: async () => registry(), check: async product => {
      const archive = await read('build/ticket-28-wave2-capabilities-20261113-v1/large-melee-and-groups/space-recovery-manifest.json');
      const db = new DatabaseSync(path.join(root, parent, 'releases.sqlite'), { readOnly: true });
      const cases = [];
      try {
        for (const id of ['before', 'after']) {
          const entry = archive.entries.find(row => row.path === parent + id + '/room.sqlite');
          assert(entry?.originalRemoved && entry.restoredByteHashVerified);
          const bytes = gunzipSync(await fs.readFile(path.join(root, entry.archivePath)));
          assert.equal(bytes.length, entry.bytes);
          assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
          const folder = path.join(directory, 'legacy', id);
          await fs.mkdir(folder, { recursive: true });
          const file = path.join(folder, 'room.sqlite');
          try { await fs.access(file); }
          catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(file, bytes, { flag: 'wx' }); }
          const oldId = 'wave3-u83-c84-r50-rapid-ingress-producer-' + id + '-v1';
          const manifest = JSON.parse(db.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?').get(oldId).manifest_json);
          product.resolver.register(manifest);
          const context = await product.resolver.resolve({ releaseId: oldId, purpose: 'ability_component' });
          const authority = await read(parent + id + '/authority.json');
          const runtime = runtimeFor(context, authority.state);
          assert.deepEqual(runtime.descriptor, await read(parent + id + '/runtime.json'));
          const native = openWave3EngineeringRoomV1({ directory: folder, filename: 'room.sqlite',
            rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
          try {
            const oldRoom = 'wave3-rapid-ingress-producer-' + id;
            const before = await native.store.loadRoom(oldRoom);
            await native.restoreDependencies(oldRoom, authority);
            const replay = await native.store.loadReplayBundle(oldRoom);
            const receipts = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
            for (let revision = 0; revision <= before.stateRevision; revision++) {
              const result = native.engine.replay({ initialEnvelope: replay.initialEnvelope, journal: receipts.slice(0, revision) });
              assert.equal(result.ok, true, JSON.stringify(result));
              assert.deepEqual(result.envelope, (await read(parent + id + '/checkpoint-r' + revision + '.json')).envelope);
            }
            assert.deepEqual(await native.store.loadRoom(oldRoom), before);
            cases.push({ id, receipts: receipts.length, checkpoints: before.stateRevision + 1, descriptorExact: true,
              allEnvelopesExact: true, archiveSha256: entry.sha256 });
          } finally { native.close(); }
        }
      } finally { db.close(); }
      const ref = await save('legacy-replay.json', { cases, sourceRegistryReadOnly: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } }] });
    console.log(JSON.stringify({ gate: 'generated-unit-source-legacy', status: legacy.status, failures: legacy.failures.length }));
  }
}
