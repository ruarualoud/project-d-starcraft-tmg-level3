import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from '../lib/development-context.mjs';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 } from './wave3-room-boundary-fixture-v1.mjs';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const tabletop = 'build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1';
export const sourceRef = tabletop + '/manifest.json';
export const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
export async function save(ref, value) {
  await atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
  return ref;
}
export function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
export async function sourceContext(product) {
  const manifest = await read(sourceRef);
  product.resolver.register(manifest);
  return product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_inputs' });
}

// Recompile the descriptor against this branch's roster. A historical room's
// geometry, runtime, binding and native receipts always stay together.
export function ravenRooms(evidence, runtimeFor) {
  async function registerScene(product, context, branch, state, scenario) {
    const prefix = evidence + '/' + branch;
    const runtime = runtimeFor(context, state);
    const descriptorRef = await save(prefix + '/runtime.json', runtime.descriptor);
    const m = context.manifest;
    const manifest = createOfficialReleaseManifestV2({
      releaseId: 'wave3-tabletop-raven-' + branch + '-v1',
      dataset: context.dataset, snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef),
      sourceRevisionRef: m.source.sourceRevisionRef, snapshotRef: m.source.snapshotRef, datasetRef: m.source.datasetRef,
      sourcePolicy: m.source.policy, referenceSources: m.source.references,
      components: { ...m.components, rulesRuntime: {
        ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash },
      } },
    });
    product.resolver.register(manifest);
    const bound = await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    await save(prefix + '/manifest.json', manifest);
    return save(prefix + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: bound, state, scenario }));
  }
  async function openBranch(product, branch) {
    const prefix = evidence + '/' + branch;
    const directory = path.join(root, prefix);
    const authority = await read(prefix + '/authority.json');
    const manifest = await read(prefix + '/manifest.json');
    product.resolver.register(manifest);
    const roomId = manifest.releaseId;
    const context = await product.resolver.resolve({ releaseId: roomId, purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { native, runtime, context, authority, roomId, directory, prefix };
  }
  async function coldReplay(product, branches) {
    const rooms = [];
    for (const name of branches) {
      const { native, roomId, authority, prefix } = await openBranch(product, name);
      try {
        await native.restoreDependencies(roomId, authority);
        const end = await native.store.loadRoom(roomId);
        const journal = await native.store.loadReplayBundle(roomId);
        const signed = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition')
          .map(row => row.payload.payload.receipt);
        const restored = native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: signed });
        assert(restored.ok);
        assert.equal(signed.length, end.stateRevision);
        assert.deepEqual(restored.envelope, end.envelope);
        assert.equal(end.envelope.stateHash, (await read(prefix + '/result.json')).stateHash);
        rooms.push({ name, roomId, receipts: signed.length, stateHash: end.envelope.stateHash });
      } finally { native.close(); }
    }
    const ref = await save(evidence + '/cold-replay.json', { rooms, exact: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  }
  return { registerScene, openBranch, coldReplay };
}
