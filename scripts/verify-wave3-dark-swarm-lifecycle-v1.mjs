import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct, sceneFor, runtimeFor } from './verify-wave3-gestate-dark-swarm-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 }
  from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { resolveOfficialEffectiveCombatProfileV1 }
  from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { recordOfficialSupplyLossesV1 } from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { createOfficialDarkSwarmTokenLifecycleV1 }
  from '../packages/product-composition/official-dark-swarm-token-lifecycle-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const parentPrefix = 'build/ticket-28-zerg-wave3-20261117-v1/gestate-dark-swarm/';
const prefix = parentPrefix + 'lifecycle/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const specs = ['cleanup', 'source-destroyed'];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const roomId = id => 'wave3-dark-swarm-' + id;
const releaseId = id => roomId(id) + '-source-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return prefix + name;
}
async function existing(name) {
  try { return await read(prefix + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
function declareSourceLoss(state, actualBefore) {
  const target = state.pieces.find(piece => piece.id === 'defiler');
  applyOfficialSelectedRosterResolvedDamageV1(state, target, resolveOfficialEffectiveCombatProfileV1(state, target), {
    casualtyModelIds: target.models.map(model => model.id), remainingModelIds: [], postDamageMarker: 0,
    targetDestroyed: true, shieldedBefore: false, shieldedAfter: false });
  state.supplyLossLedger = recordOfficialSupplyLossesV1({ stateBefore: actualBefore, stateAfter: state,
    action: { actionType: 'declared_engineering_source_loss' }, events: [],
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash }).ledger;
}
async function registerScene(context, id, state, scenario) {
  const runtime = runtimeFor(context, state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.111.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = JSON.parse(JSON.stringify(createWave3ComponentEngineeringAuthorityV1({ context: resolved, state, scenario })));
    const prior = await existing(id + '/authority.json');
    if (prior) assert.deepEqual(prior, authority); else await save(id + '/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(prefix + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + id + '/runtime.json'));
    const folder = path.join(directory, id);
    const native = openWave3EngineeringRoomV1({ directory: folder, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { authority, context, runtime, native, id, roomId: roomId(id), folder, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(branch.roomId);
  const name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const prior = await existing(name);
  if (prior) assert.deepEqual(prior.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function replay(native, id, checkpointPrefix) {
  const before = await native.store.loadRoom(id), bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let i = 0; i <= receipts.length; i++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(checkpointPrefix + i + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), before);
  return { receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function legacy(product) {
  const authority = await read(parentPrefix + 'authority.json');
  product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
  const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
  const runtime = runtimeFor(context, authority.state);
  assert.deepEqual(runtime.descriptor, await read(parentPrefix + 'runtime.json'));
  const originalFile = path.join(root, parentPrefix + 'room.sqlite'), bytes = await fs.readFile(originalFile);
  const copy = path.join(directory, 'legacy-placement.sqlite');
  try { await fs.access(copy); }
  catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(copy, bytes, { flag: 'wx' }); }
  const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-placement.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    const id = 'wave3-gestate-dark-swarm-placement';
    await native.restoreDependencies(id, authority);
    const result = await replay(native, id, parentPrefix + 'checkpoint-r');
    assert.equal(sha(await fs.readFile(originalFile)), sha(bytes));
    return { ...result, runtimeVersion: runtime.descriptor.runtimeVersion, originalUnchanged: true };
  } finally { native.close(); }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef, contractVersion: 'T28-W3-09-Dark-Swarm-Lifecycle-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const fresh = await sceneFor(context, { includeDarkSwarmLifecycle: true });
      const actual = (await read(parentPrefix + 'checkpoint-r1.json')).envelope.state;
      assert.deepEqual(actual.officialDarkSwarmPlacementSourceBundle, fresh.state.officialDarkSwarmPlacementSourceBundle);
      const fields = ['officialDarkSwarmTokenLifecyclePolicy', 'officialCleanupContinuationPolicy'];
      for (const id of specs) {
        const state = structuredClone(actual);
        for (const key of fields) state[key] = structuredClone(fresh.state[key]);
        delete state.selectedRosterActivationWindow;
        const scenario = { derivedFrom: parentPrefix + 'checkpoint-r1.json', retainedActualPlacement: true,
          lifecyclePoliciesFromProductFactory: true, fullRound: false, fullMatch: false, modelCalls: 0 };
        if (id === 'cleanup') {
          Object.assign(state, { phase: 'cleanup', activeSideKey: state.firstPlayerSideKey,
            scores: { player1: 1, player2: 0 }, currentProductMatchLifecycle: {
              schema: 'starcraft_tmg_current_product_match_lifecycle_v1', round: 1, step: 'cleanup_and_refresh', trainingTruth: false } });
          scenario.declaredCleanupEntryAndUnequalScoresForInitiative = true;
        } else {
          declareSourceLoss(state, actual);
          state.activeSideKey = 'player2';
          scenario.declaredSourceLossWithSharedCasualtyAndSupplyWriters = true;
          scenario.nativeLethalCombatClaim = false;
        }
        await registerScene(context, id, state, scenario);
      }
      const live = structuredClone(actual);
      for (const key of fields) live[key] = structuredClone(fresh.state[key]);
      const consumer = createOfficialDarkSwarmTokenLifecycleV1({ context, state: live,
        source: live.officialDarkSwarmPlacementSourceBundle });
      const missingLive = structuredClone(live); missingLive.board.tokens = [];
      assert.throws(() => consumer.afterTransition({ state: missingLive, events: [] }, live), /TOKEN_BINDING_INVALID/);
      const dead = structuredClone(live); declareSourceLoss(dead, live); dead.board.tokens = [];
      const reconciled = consumer.afterTransition({ state: dead, events: [] }, live);
      assert(reconciled.state.officialBattlefieldAssetBindings.every(row => row.consumed));
      assert.equal(reconciled.state.officialDarkSwarmRemovalHistory.length, 1);
      assert.deepEqual(consumer.afterTransition(reconciled, reconciled.state), reconciled);
      const ref = await save('compile.json', { policies: fields, sharedRemovalUsesVerifiedOriginal: true,
        livingSourceMissingTokenRejected: true, repeatedConsumptionNoOp: true, source: fresh.state.officialDarkSwarmTokenLifecyclePolicy,
        modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of specs) {
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority);
          await checkpoint(branch);
          const before = (await read(prefix + id + '/checkpoint-r0.json')).envelope.state;
          if (id === 'cleanup') {
            await branch.native.commit({ roomId: branch.roomId, credential: credentials[before.firstPlayerSideKey],
              operationKey: 'cleanup', kind: 'finite', select: row => row.action.actionType === 'resolve_current_product_cleanup_refresh' });
            const after = await checkpoint(branch), state = after.envelope.state;
            assert.equal(state.board.tokens.length, 0);
            assert.equal(state.officialBattlefieldAssetBindings.length, 0);
            assert.deepEqual(state.board.centerMarkers, before.board.centerMarkers);
            assert.equal(state.officialDarkSwarmCleanupHistory.length, 1);
            assert.equal(state.currentProductMatchLifecycle.step, 'determine_initiative');
            assert.equal(state.pendingOfficialCharacteristicCleanup, undefined);
            assert(Object.values(state.cardResources).flat().every(row => row.readiness === 'ready'));
          } else {
            const model = before.pieces.find(row => row.id === 'target').models[0];
            await branch.native.commit({ roomId: branch.roomId, credential: credentials.player2, operationKey: 'enemy-move',
              select: row => row.actionType === 'move' && row.pieceId === 'target', parameters: () => ({ leadingModelId: model.id,
                path: [{ xMilliInches: 42000, yMilliInches: 4000 }, { xMilliInches: 42000, yMilliInches: 4200 }], placements: [] }) });
            const after = await checkpoint(branch), state = after.envelope.state;
            assert.equal(state.board.tokens.length, 0);
            assert(state.officialBattlefieldAssetBindings.every(row => row.consumed));
            assert.equal(state.officialDarkSwarmRemovalHistory.length, 1);
            assert.equal(state.pieces.find(row => row.id === 'defiler').currentSupply, 0);
            assert.deepEqual(state.cardResources, before.cardResources);
          }
          const ref = await save(id + '/consume.json', { id, revision: 1, tokenRemoved: true,
            nativeAccepted: true, sourceLossDeclared: id === 'source-destroyed', modelCalls: 0 });
          cases.push({ id, evidenceRef: ref });
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of specs) {
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority);
          const before = await branch.native.store.loadRoom(branch.roomId);
          if (id === 'cleanup') {
            await branch.native.commit({ roomId: branch.roomId, credential: credentials[before.envelope.state.firstPlayerSideKey],
              operationKey: 'initiative', kind: 'finite', select: row => row.action.actionType === 'resolve_current_product_next_round_initiative' });
            const after = await checkpoint(branch);
            assert.equal(after.envelope.state.round, 2);
            assert.equal(after.envelope.state.phase, 'start_of_round');
            assert.equal(after.envelope.state.firstPlayerSideKey, 'player2');
          } else {
            await branch.native.commit({ roomId: branch.roomId, credential: credentials.player2, operationKey: 'enemy-finish',
              select: row => row.actionType === 'finish_activation' && row.pieceId === 'target', parameters: () => ({}) });
            const after = await checkpoint(branch);
            assert.equal(after.envelope.state.officialDarkSwarmRemovalHistory.length, 1);
          }
          assert.equal(branch.runtime.query((await branch.native.store.loadRoom(branch.roomId)).envelope.state,
            { queryKind: 'dark_swarm_status' }).bindings.length, 0);
          cases.push({ id, actualSuccessor: true });
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of specs) {
        const branch = await product.branch(id);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          cases.push({ id, ...await replay(branch.native, branch.roomId, prefix + id + '/checkpoint-r') });
        } finally { branch.close(); }
      }
      const previous = await legacy(product);
      const ref = await save('cold-recovery.json', { cases, legacyPlacement: previous, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'dark-swarm-lifecycle', status: gate.status, failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
