import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { root, sourceProduct, runtimeFor as originalRuntimeFor } from './verify-wave3-nova-holo-decoy-v1.mjs';

const output = 'build/ticket-28-terran-wave3-20261116-v1/holo-decoy-rules/';
const directory = path.join(root, output);
const original = 'build/ticket-28-terran-wave3-20261116-v1/nova-holo-decoy/assault-use-before/';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return output + name;
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: ['unit:medic/optical-flare-movement-phase@1'], includeRanged: true,
    includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
}

const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'controls'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
  sourceRef: output + 'holo-run/authority.json', contractVersion: 'T28-W3-08-Decoy-source-geometry-and-legacy-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const state = (await read(output + 'holo-run/authority.json')).state;
    const runtime = runtimeFor(context, state);
    const decoy = state.pieces.find(piece => piece.officialUnitRecordKey === 'army_units:holo_decoy');
    const forged = structuredClone(state);
    forged.officialDecoySourceBundle.prohibitions.charge = false;
    forged.officialDecoySourceBundle.bundleHash = hash(Object.fromEntries(Object.entries(forged.officialDecoySourceBundle)
      .filter(([key]) => key !== 'bundleHash')));
    assert.throws(() => runtimeFor(context, forged), /CHARACTERISTIC_DECOY_SOURCE_MISMATCH/);
    const wrongUnit = structuredClone(state);
    wrongUnit.pieces.find(piece => piece.id === decoy.id).sourceRecordHash = '0'.repeat(64);
    assert.throws(() => runtime.query(wrongUnit, { queryKind: 'decoy_constraints', pieceId: decoy.id }), /DECOY_UNIT_SOURCE_MISMATCH/);
    assert.throws(() => runtime.query(state, { queryKind: 'decoy_constraints', pieceId: decoy.id,
      ignoreProhibition: true }), /DECOY_QUERY_SEMANTIC_ONLY/);
    const normal = runtime.query(state, { queryKind: 'decoy_constraints', pieceId: 'medic' });
    assert(Object.values(normal.constraints).every(value => value === false));
    const domain = runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'run' && row.pieceId === decoy.id);
    assert(domain);
    const model = decoy.models[0];
    assert.throws(() => runtime.instantiate(state, domain, { leadingModelId: model.id,
      path: [{ xMilliInches: 12000, yMilliInches: 24000 }, { xMilliInches: 12100, yMilliInches: 24000 }],
      placements: [] }), /MODEL_BASE_GEOMETRY_ENEMY_SEPARATION_REQUIRED/);
    const ref = await save('source-geometry-controls.json', { forgedSourceRejected: true, wrongUnitSourceRejected: true,
      semanticQueryOnly: true, ordinaryUnitHasNoDecoyRestrictions: true,
      ordinaryRunEndpointOneInchRestrictionPreserved: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct: async () => {
    const authority = await read(original + 'authority.json');
    const registryPath = path.join(root, path.dirname(original), 'releases.sqlite');
    const source = new DatabaseSync(registryPath, { readOnly: true });
    const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'controls-releases.sqlite') });
    try {
      const manifest = JSON.parse(source.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?')
        .get(authority.releaseId).manifest_json);
      const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
      resolver.register(manifest);
      return { context: await resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' }),
        close: () => store.close() };
    } catch (error) { store.close(); throw error; }
    finally { source.close(); }
  }, check: async ({ context }) => {
    const authority = await read(original + 'authority.json');
    const runtime = originalRuntimeFor(context, authority.state);
    assert.equal(runtime.descriptor.runtimeVersion, '3.75.0');
    assert.deepEqual(runtime.descriptor, await read(original + 'runtime.json'));
    const sourcePath = path.join(root, original, 'room.sqlite');
    const originalBytes = await fs.readFile(sourcePath);
    const target = path.join(directory, 'legacy-room.sqlite');
    try { await fs.access(target); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, originalBytes, { flag: 'wx' }); }
    const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    try {
      const roomId = 'wave3-nova-holo-assault-use-before';
      const before = await native.store.loadRoom(roomId);
      await native.restoreDependencies(roomId, authority);
      const journal = await native.store.loadReplayBundle(roomId);
      const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      for (let revision = 0; revision <= before.stateRevision; revision++) {
        const replay = native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
        assert.equal(replay.ok, true, JSON.stringify(replay));
        assert.deepEqual(replay.envelope, (await read(original + 'checkpoint-r' + revision + '.json')).envelope);
      }
      assert.deepEqual(await native.store.loadRoom(roomId), before);
      assert.equal(sha256(await fs.readFile(sourcePath)), sha256(originalBytes));
      const ref = await save('legacy-replay.json', { originalRef: original, runtimeVersion: '3.75.0', descriptorExact: true,
        receipts: receipts.length, checkpoints: before.stateRevision + 1, allEnvelopesExact: true,
        originalDatabaseSha256: sha256(originalBytes), originalDatabaseUnchanged: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { native.close(); }
  } },
] });
console.log(JSON.stringify({ gate: 'holo-decoy-controls', status: gate.status, failures: gate.failures.length }));
