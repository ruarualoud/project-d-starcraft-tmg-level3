import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createPrivateKey } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1 } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialSkirmish500RoomInitialStateAuthorityV1 } from '../packages/product-composition/official-skirmish-500-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createStarcraftTmgAuthoritativeEngine, hashStarcraftTmgContract } from '../packages/authoritative-engine/transition-v1.mjs';
import { createStarcraftTmgRoomRuntime } from '../packages/room-runtime/in-memory-room-v1.mjs';
import { createSqliteStarcraftTmgRoomStore } from '../packages/room-store/sqlite-room-store-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { createStarcraftTmgSnapshotSceneQueryServiceV1 } from '../packages/online-agent-session/scene-query-service-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const read = async name => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'));
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
const makeRuntime = (dataset, state) => createOfficialCurrentProductMatchRuntimeV6({
  legacyRuntime: createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(state) }),
});
async function openRoomProduct() {
  const [dataset, snapshot, manifest, authority] = await Promise.all([
    read('legacy-dataset.json'), read('legacy-snapshot.json'), read('native-release.json'), read('native-authority.json'),
  ]);
  const context = { dataset, snapshot, manifest };
  const native = makeRuntime(dataset, authority.state);
  const runtime = bindOfficialReleaseRulesRuntimeV2({ context, runtime: native });
  // Public deterministic engineering keys, scoped to this isolated fixture database.
  const privateKey = createPrivateKey({ key: Buffer.from('302e020100300506032b657004220420' + '5a'.repeat(32), 'hex'), format: 'der', type: 'pkcs8' });
  const cryptoOptions = { privateKey, hmacSecret: Buffer.alloc(32, 0x44), keyId: 't28-engineering-only', trustLevel: 'development_fixture' };
  const engine = createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime, cryptoOptions });
  const store = createSqliteStarcraftTmgRoomStore({ filename: path.join(directory, 'native-room.sqlite'),
    encryption: { key: Buffer.alloc(32, 0x33), keyId: 't28-engineering-storage', trustLevel: 'development_fixture' } });
  return { dataset, context, authority, native, runtime, engine, store, cryptoOptions,
    room: createStarcraftTmgRoomRuntime({ authorityEngine: engine, roomStore: store }), close: () => store.close() };
}
const record = await runProductBoundaryCheck({
  directory: path.join(directory, 'native-consumer-verification'),
  identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
    sourceRef: 'build/ticket-28-wave3-release-context-20261112-v1/legacy-dataset.json', contractVersion: 'T28-W3-02-native-binding-v1' },
  steps: [
    { name: 'read', repairRef: 'T28-W3-02-fixture-standard-runtime-scale', openProduct: async () => ({ dataset: await read('legacy-dataset.json'), snapshot: await read('legacy-snapshot.json') }),
      check: async ({ dataset, snapshot }) => {
        const before = createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot });
        const runtime = makeRuntime(dataset, before.state);
        const reference = path.relative(root, directory);
        await save('native-runtime-descriptor.json', runtime.descriptor);
        await save('native-model-geometry.json', before.state.officialModelBaseGeometryDataBundle);
        await save('native-missions.json', before.state.officialMissionEffectCatalogue);
        const manifest = createOfficialReleaseManifestV2({ releaseId: 'legacy-native-room-engineering-v1', dataset, snapshot,
          snapshotRef: reference + '/legacy-snapshot.json', datasetRef: reference + '/legacy-dataset.json',
          sourceRevisionRef: reference + '/legacy-revision.json', sourcePolicy: { source: 'official_command_center_army_builder_firestore', pdfUse: 'reference' },
          components: {
            rulesRuntime: { ref: reference + '/native-runtime-descriptor.json', version: runtime.descriptor.runtimeVersion },
            geometry: { ref: reference + '/native-model-geometry.json', version: '1' },
            missions: { ref: reference + '/native-missions.json', version: '2' },
          } });
        const context = { manifest, dataset, snapshot };
        const authority = createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot, releaseContext: context });
        assert.deepEqual(authority.state, before.state);
        const skirmish = createOfficialSkirmish500RoomInitialStateAuthorityV1({ dataset, snapshot, releaseContext: context });
        assert.equal(skirmish.releaseManifestHash, manifest.manifestHash);
        assert.equal(authority.releaseId, manifest.releaseId);
        const wrongContext = { ...context, manifest: await read('wave3-release.json') };
        assert.throws(() => createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot, releaseContext: wrongContext }), /OFFICIAL_RELEASE_SOURCE_MISMATCH/);
        await save('native-release.json', manifest);
        await save('native-authority.json', authority);
        const evidenceRef = await save('native-read.json', { skirmishSource: skirmish.releaseId,
          standardSource: authority.releaseId, standardStateUnchanged: true, mixedSourceRejected: true });
        return { evidenceRef, checkpointRef: path.join(directory, 'native-authority.json') };
      } },
    { name: 'consume', repairRef: 'T28-W3-02-fixture-query-precision', openProduct: openRoomProduct, check: async product => {
      const roomId = 't28-release-binding-native';
      if (!await product.store.loadRoom(roomId)) {
        const created = await product.room.createRoom({ roomId, initialStateAuthority: product.authority,
          serverSeatPlan: product.authority.serverSeatPlan });
        assert.equal(created.ok, true, JSON.stringify(created));
      }
      const aggregate = await product.store.loadRoom(roomId);
      assert.equal(aggregate.envelope.matchBinding.releaseBinding.manifestHash, product.context.manifest.manifestHash);
      const projected = await product.room.readRoom({ roomId });
      assert.equal(projected.ok, true);
      assert.equal(projected.projection.matchBinding.releaseBinding.releaseId, product.context.manifest.releaseId);
      const grant = Object.values(aggregate.grants).find(item => item.seatKey === 'player1');
      const legal = product.engine.legalSpace(aggregate.envelope, { seatAuthority: grant.authority });
      const authority = { roomId, seatKey: 'player1', stateRevision: aggregate.stateRevision,
        stateHash: aggregate.envelope.stateHash, matchBindingHash: aggregate.envelope.matchBindingHash,
        legalSpaceHash: legal.legalSpaceHash };
      const diagnostics = [];
      const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({ roomStore: product.store,
        rulesRuntime: product.runtime, seatKey: 'player1', observeQueryBatchDiagnostic: event => diagnostics.push(event) });
      const control = await adapter.query({ authority, queryKind: 'mission_marker_control', arguments: {} });
      assert.equal(control.precision, 'exact', JSON.stringify(control));
      const relations = await adapter.queryBatch([1, 2].map(() => ({ authority, queryKind: 'space.inspect_relationships', arguments: {} })));
      assert.ok(relations.every(result => result.ok === true && result.precision !== 'unknown'), JSON.stringify(relations));
      assert.ok(diagnostics.some(event => event.stage === 'query_worker_completed' && event.threadId > 0));
      const mismatch = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({ roomStore: product.store,
        rulesRuntime: product.native, seatKey: 'player1' });
      const rejected = await mismatch.query({ authority, queryKind: 'mission_marker_control', arguments: {} });
      assert.equal(rejected.precision, 'unknown');
      assert.equal(rejected.reason, 'OFFICIAL_RELEASE_QUERY_BINDING_MISMATCH');
      const state = aggregate.envelope.state;
      const stateHash = hashStarcraftTmgContract(state);
      const scene = createStarcraftTmgSnapshotSceneQueryServiceV1({ state, rulesRuntime: product.runtime,
        seatKey: 'player1', matchBinding: aggregate.envelope.matchBinding,
        sceneScope: { kind: 'pregame_reference', sourceStateHash: stateHash, baseStateHash: stateHash } });
      const sceneControl = await scene.query({ queryKind: 'mission_marker_control', arguments: {} });
      assert.equal(sceneControl.status, 'exact', JSON.stringify(sceneControl));
      const evidenceRef = await save('native-consume.json', { roomId,
        releaseBinding: aggregate.envelope.matchBinding.releaseBinding, queryControl: control.ok,
        workerCompletions: diagnostics.filter(event => event.stage === 'query_worker_completed').map(event => event.threadId),
        sceneControl: sceneControl.ok, mismatchedQueryRuntimeRejected: true });
      return { evidenceRef, checkpointRef: path.join(directory, 'native-room.sqlite') };
    } },
    { name: 'coldRecovery', openProduct: openRoomProduct, check: async product => {
      const roomId = 't28-release-binding-native';
      const projected = await product.room.readRoom({ roomId });
      assert.equal(projected.ok, true);
      const aggregate = await product.store.loadRoom(roomId);
      const grant = Object.values(aggregate.grants).find(item => item.seatKey === 'player1');
      const legal = product.engine.legalSpace(aggregate.envelope, { seatAuthority: grant.authority });
      assert.equal(legal.stateHash, aggregate.envelope.stateHash);
      assert.equal(aggregate.envelope.matchBinding.releaseBinding.manifestHash, product.context.manifest.manifestHash);
      assert.throws(() => createStarcraftTmgAuthoritativeEngine({ rulesRuntime: product.native, cryptoOptions: product.cryptoOptions }).legalSpace(
        aggregate.envelope, { seatAuthority: grant.authority }), error => error.code === 'DEPENDENCY_QUARANTINED');
      const evidenceRef = await save('native-cold.json', { roomId,
        stateRevision: aggregate.stateRevision, releaseId: projected.projection.matchBinding.releaseBinding.releaseId,
        signerScope: 'deterministic engineering fixture', sqlStoreReopened: true, engineRebuilt: true });
      return { evidenceRef, checkpointRef: path.join(directory, 'native-room.sqlite') };
    } },
  ],
});
console.log(JSON.stringify({ status: record.status, passed: Object.keys(record.passed), modelCalls: 0,
  scope: 'actual legacy source native factories, room store, query worker and scene consumers' }, null, 2));
