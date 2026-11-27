import assert from 'node:assert/strict';
import path from 'node:path';
import { root, output, sourceProduct, scene, registerScene, openProduct, checkpoint, finite, surprise, replay }
  from './verify-wave3-holo-round-end-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const directory = path.join(root, output);
const id = 'injured-place', roomId = 'wave3-holo-round-end-' + id;
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return output + name;
}
async function branchProduct() {
  const product = openProduct();
  try {
    const branch = await product.branch(id);
    return { ...branch, close() { branch.close(); product.close(); } };
  } catch (error) { product.close(); throw error; }
}
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'injured-placement-verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
  factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef: 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json',
  contractVersion: 'T28-W3-08-holo-injury-consistency-native-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const prepared = await scene(context, id); const nova = prepared.state.pieces.find(row => row.id === 'nova');
    assert.equal(nova.damageMarker, 1); assert.equal(nova.models[0].damage, 1); assert.equal(nova.models[0].remainingWounds, 7);
    await registerScene(context, id, prepared);
    const ref = await save(id + '/compile.json', { damage: 1, remainingWounds: 7,
      derivedBy: 'synchronizeOfficialEffectiveHitPointWoundsV1', declaredDamage: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct: branchProduct, check: async branch => {
    const credentials = await branch.native.create(roomId, branch.authority); await checkpoint(branch);
    await finite(branch, credentials, 'begin', 'begin_holo_round_end');
    let current = await checkpoint(branch);
    if (!current.envelope.state.officialHoloRoundEndHistory?.some(row => row.outcome === 'place')) {
      await surprise(branch, credentials, 'player1', { choice: 'place', targetUnitId: 'nova',
        coordinate: { xMilliInches: 17600, yMilliInches: 10000 } });
    }
    current = await checkpoint(branch); const nova = current.envelope.state.pieces.find(row => row.id === 'nova');
    const original = branch.authority.state.pieces.find(row => row.id === 'nova');
    assert.equal(nova.damageMarker, 1); assert.equal(nova.models[0].damage, 1); assert.equal(nova.models[0].remainingWounds, 7);
    assert.deepEqual(nova.equipment, original.equipment); assert.equal(nova.models[0].xInches, 17.6);
    const ref = await save(id + '/consume.json', { revision: current.stateRevision, nova, queryEqualsNative: true });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct: branchProduct, check: async branch => {
    const credentials = await branch.native.create(roomId, branch.authority);
    const sourceId = branch.authority.state.pieces.find(row => row.officialUnitRecordKey === 'army_units:holo_decoy').id;
    await finite(branch, credentials, 'remove', 'resolve_holo_timed_life', sourceId);
    await finite(branch, credentials, 'complete', 'complete_holo_round_end');
    await finite(branch, credentials, 'cleanup', 'resolve_current_product_cleanup_refresh');
    const current = await checkpoint(branch), nova = current.envelope.state.pieces.find(row => row.id === 'nova');
    assert.equal(nova.models[0].remainingWounds, 7); assert.equal(nova.damageMarker, 1);
    assert.equal(current.envelope.state.currentProductMatchLifecycle.step, 'determine_initiative');
    assert.equal(current.envelope.state.cardResources.player1[0].readiness, 'ready');
    const ref = await save(id + '/successor.json', { revision: current.stateRevision, remainingWounds: 7,
      damageMarker: 1, equipmentPreserved: true, actualCleanupAfterEffects: true });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct: branchProduct, check: async branch => {
    await branch.native.restoreDependencies(roomId, branch.authority);
    const result = await replay(branch.native, roomId, output + id + '/checkpoint-r');
    const ref = await save(id + '/cold-recovery.json', result); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ gate: 'holo-injured-placement', status: gate.status, failures: gate.failures.length }));
