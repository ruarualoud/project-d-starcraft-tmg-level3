import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { root, runtimeFor } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialTerrainPieceV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261116-v1/holo-round-end/';
const directory = path.join(root, output);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
async function openProduct() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  try {
    const authority = await read(output + 'place-first/authority.json');
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
    const context = await resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + 'place-first/runtime.json'));
    return { runtime, authority, close: () => store.close() };
  } catch (error) { store.close(); throw error; }
}
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'controls'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
  factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef: output + 'place-first/checkpoint-r1.json',
  contractVersion: 'T28-W3-08-holo-round-end-source-geometry-and-stale-controls-v1',
}, steps: [{ name: 'consume', repairRef, openProduct, check: async product => {
  const original = (await read(output + 'place-first/checkpoint-r1.json')).envelope.state;
  const holoId = original.pieces.find(row => row.officialUnitRecordKey === 'army_units:holo_decoy').id;
  const baseline = structuredClone(original), checks = [];
  const parameters = { choice: 'place', targetUnitId: 'nova', coordinate: { xMilliInches: 18500, yMilliInches: 10000 } };
  const query = (state, value = parameters) => product.runtime.query(state,
    { queryKind: 'holo_round_end_placement_preview', pieceId: holoId, parameters: value });
  function rejected(name, edit, pattern) {
    const state = structuredClone(original); edit(state);
    assert.throws(() => query(state), pattern, name); checks.push(name);
  }
  query(original); checks.push('physical-source-anchor-is-not-its-own-link-blocker');
  rejected('other-friendly-model-still-blocks-coherency-link', state => {
    const blocker = state.pieces.find(row => row.id === 'marine').models[0];
    blocker.xInches = 17.25; blocker.yInches = 10.8;
  }, /MODEL_BASE_GEOMETRY_COHERENCY_LINK_INVALID/);
  rejected('opaque-terrain-hides-existing-nova', state => {
    state.board.terrain = [createOfficialTerrainPieceV1({ id: 'holo-los-control', size: 4, terrainKind: 'ordinary',
      footprint: { shape: 'axis_aligned_rectangle', minXMilliInches: 12000, maxXMilliInches: 13000,
        minYMilliInches: 5000, maxYMilliInches: 15000 } })];
  }, /HOLO_SURPRISE_DOMAIN_OR_CHOICE_INVALID/);
  rejected('reserve-nova-cannot-be-placed', state => {
    const target = state.pieces.find(row => row.id === 'nova'); target.isOnField = false; target.isInReserves = true;
    target.models.forEach(model => { model.isOnField = false; });
  }, /HOLO_SURPRISE_DOMAIN_OR_CHOICE_INVALID/);
  rejected('destroyed-nova-cannot-be-revived', state => {
    const target = state.pieces.find(row => row.id === 'nova'); target.isOnField = false; target.isDestroyed = true;
    target.currentModels = 0; target.models.forEach(model => { model.isOnField = false; model.isDestroyed = true; });
  }, /HOLO_SURPRISE_DOMAIN_OR_CHOICE_INVALID/);
  const domain = product.runtime.enumerate(original).parameterDomains[0];
  const stale = structuredClone(original); stale.scores.player1 += 1;
  assert.throws(() => product.runtime.instantiate(stale, domain, parameters), /CHARACTERISTIC_COMPONENT_DOMAIN_STALE/);
  const oldAction = query(original).result.action;
  assert.throws(() => product.runtime.apply(stale, oldAction, {}), /HOLO_SURPRISE_DOMAIN_OR_CHOICE_INVALID/);
  checks.push('stale-domain-and-action-rejected');
  assert.deepEqual(original, baseline); checks.push('all-queries-leave-original-native-state-unchanged');
  const absent = structuredClone(product.authority.state);
  const source = absent.pieces.find(row => row.id === holoId);
  source.isOnField = false; source.isDestroyed = true; source.currentModels = 0;
  source.models.forEach(model => { model.isOnField = false; model.isDestroyed = true; });
  const begin = product.runtime.enumerate(absent).candidates[0];
  const beginAction = Object.fromEntries(Object.entries(begin).filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)));
  const empty = product.runtime.apply(absent, beginAction, {}).state;
  assert.equal(empty.pendingOfficialHoloRoundEnd.stage, 'complete');
  assert.deepEqual(empty.pendingOfficialHoloRoundEnd.effects, []); checks.push('removed-source-does-not-create-effects');
  const mixed = structuredClone(product.authority.state); mixed.pendingPsionicTransferEffects = [{ round: 1 }];
  const mixedBegin = product.runtime.enumerate(mixed).candidates[0];
  const mixedAction = Object.fromEntries(Object.entries(mixedBegin).filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)));
  assert.throws(() => product.runtime.apply(mixed, mixedAction, {}), /HOLO_ROUND_END_SHARED_ORDER_CONSUMER_REQUIRED/);
  checks.push('unintegrated-mixed-round-end-providers-explicitly-rejected');
  const ref = output + 'controls.json';
  await atomicWrite(path.join(root, ref), JSON.stringify({ checks, evidenceBasis: output + 'place-first/checkpoint-r1.json',
    hypotheticalNegativeCopiesOnly: true, originalRoomUnmodified: true, modelCalls: 0 }, null, 2) + '\n');
  return { evidenceRef: ref, checkpointRef: ref };
} }] });
console.log(JSON.stringify({ gate: 'holo-round-end-controls', status: result.status, failures: result.failures.length }));
