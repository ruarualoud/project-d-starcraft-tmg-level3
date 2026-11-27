import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { createOfficialReleaseResolverV2, bindOfficialReleaseRulesRuntimeV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1, verifyOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { root, output, read, save, sourceProduct, runtimeFor } from './verify-wave3-nova-holo-decoy-v1.mjs';

const previous = 'build/ticket-28-terran-wave3-20261116-v1/generated-unit-source/';
const directory = path.join(root, output, 'legacy');
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
await fs.mkdir(directory, { recursive: true });
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: previous + 'cold-recovery.json',
  contractVersion: 'T28-W3-08-Holo-preserves-existing-generated-unit-and-supply-contracts-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const oldAuthority = await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json');
    const state = structuredClone(oldAuthority.state);
    for (const piece of state.pieces) {
      piece.isOnField = false;
      piece.models.forEach(model => { model.isOnField = false; });
    }
    const options = { state, gameplayDataBundle: state.officialGameplayDataBundle, rulesRuntimeHash: '0'.repeat(64) };
    const supply = createOfficialRoundSupplyStateV1(options);
    assert.equal(verifyOfficialRoundSupplyStateV1({ ...options, roundSupplyState: supply }), true);
    assert.equal(supply.gameplayDataBundleHash, state.officialGameplayDataBundle.gameplayDataBundleHash);
    assert.equal(supply.missionScoringProfileHash, state.officialGameplayDataBundle.missionScoringProfile.missionScoringProfileHash);
    assert(!Object.hasOwn(supply, 'missionSupplyProfileHash'));
    assert.deepEqual(supply.supplyPoolBySide, { player1: 6, player2: 6 });
    const holo = (await read(output + 'assault-use-before/authority.json')).state;
    const forged = structuredClone(holo);
    const profile = forged.officialMissionSupplyProfile;
    profile.startingSupply = 7; profile.sourceFields.startingSupply = '7';
    profile.profileHash = hash(Object.fromEntries(Object.entries(profile).filter(([key]) => key !== 'profileHash')));
    assert.throws(() => runtimeFor(context, forged), /CHARACTERISTIC_SUMMON_MISSION_SOURCE_MISMATCH/);
    const ref = await save('legacy/compile.json', { legacySupplyDefaultFieldsPreserved: true, legacySupply: supply,
      legacyStateIsDeclaredAllUnitsNotFielded: true, forgedMissionPacingRejectedByRoot: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct: async () => {
    const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
    return { store, resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
  }, check: async product => {
    const oldRegistry = new DatabaseSync(path.join(root, previous, 'releases.sqlite'), { readOnly: true });
    try {
      const manifest = JSON.parse(oldRegistry.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?')
        .get('wave3-generated-unit-source-v1').manifest_json);
      product.resolver.register(manifest);
      const context = await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
      const authority = await read(previous + 'native/authority.json');
      const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
        definitionIds: ['unit:immortal/for-the-ancients-assault-phase@1'],
        weaponDefinitionIds: ['unit:immortal/left-photon-disruptor-assault-phase@1', 'unit:immortal/right-photon-disruptor-assault-phase@1'],
        includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true, includePointDefenseChoices: true });
      assert.deepEqual(runtime.descriptor, await read(previous + 'native/runtime.json'));
      const original = await fs.readFile(path.join(root, previous, 'native/room.sqlite'));
      const target = path.join(directory, 'room.sqlite');
      try { await fs.access(target); }
      catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, original, { flag: 'wx' }); }
      const native = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      try {
        const id = 'wave3-generated-unit-source'; const before = await native.store.loadRoom(id);
        await native.restoreDependencies(id, authority);
        const bundle = await native.store.loadReplayBundle(id);
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= before.stateRevision; revision++) {
          const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(replay.ok, true, JSON.stringify(replay));
          assert.deepEqual(replay.envelope, (await read(previous + 'native/checkpoint-r' + revision + '.json')).envelope);
        }
        assert.deepEqual(await native.store.loadRoom(id), before);
        assert.equal(createHash('sha256').update(await fs.readFile(path.join(root, previous, 'native/room.sqlite'))).digest('hex'),
          createHash('sha256').update(original).digest('hex'));
        const ref = await save('legacy/replay.json', { runtimeVersion: '3.74.0', descriptorExact: true,
          receipts: receipts.length, checkpoints: before.stateRevision + 1, allEnvelopesExact: true,
          originalDatabaseSha256: createHash('sha256').update(original).digest('hex'), modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { native.close(); }
    } finally { oldRegistry.close(); }
  } },
] });
console.log(JSON.stringify({ gate: 'holo-legacy-compatibility', status: result.status, failures: result.failures.length }));
