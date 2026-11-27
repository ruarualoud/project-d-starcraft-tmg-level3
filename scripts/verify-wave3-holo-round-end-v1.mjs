import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, makeScene, runtimeFor, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { synchronizeOfficialEffectiveHitPointWoundsV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialHoloRoundEndSourceV1 } from '../packages/source-data/official-holo-round-end-source-v1.mjs';
import { createOfficialAbilityEffectIrCatalogueV1 } from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { allocateOfficialSingletonSummonPieceIdV1 } from '../packages/product-composition/official-singleton-summon-identity-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261116-v1/holo-round-end/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const definitionIds = ['unit:holo_decoy/timed-life-any-phase@1', 'unit:holo_decoy/surprise-any-phase@1'];
const specs = ['place-first', 'skip-first', 'remove-first', 'two-sides-no-nova'];
const roomId = id => 'wave3-holo-round-end-' + id;
const releaseId = id => roomId(id) + '-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const piece = (state, id) => state.pieces.find(row => row.id === id);
const holos = state => state.pieces.filter(row => row.officialUnitRecordKey === 'army_units:holo_decoy');
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return output + name;
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
async function scene(context, id) {
  const result = await makeScene(context, { id, phase: 'assault', bindCombatEligibility: true,
    bindAbilitySourcePhases: true, unitRoundEndDefinitionIds: definitionIds });
  let state = result.state;
  arrange(piece(state, 'enemy-marine'), 44, 26);
  arrange(piece(state, 'medic'), 30, 26, true);
  piece(state, 'nova').damageMarker = 1;
  synchronizeOfficialEffectiveHitPointWoundsV1(state, piece(state, 'nova'), { includeUnmodifiedProfiles: true });
  if (id === 'two-sides-no-nova') {
    const nova = piece(state, 'nova'); nova.isOnField = false; nova.isInReserves = true;
    nova.models.forEach(model => { model.isOnField = false; });
    const second = structuredClone(holos(state)[0]);
    second.id = allocateOfficialSingletonSummonPieceIdV1(state, second.id);
    second.sideKey = 'player2'; second.summonParentPieceId = 'enemy-marine';
    second.models.forEach((model, index) => { model.id = second.id + '-model-' + (index + 1); });
    arrange(second, 30, 10); state.pieces.push(second);
    state.firstPlayerSideKey = 'player2';
  }
  const coherencyProofs = declareCoherency(state);
  state.phase = 'cleanup'; state.activeSideKey = state.firstPlayerSideKey;
  state.scores = { player1: 0, player2: 0 };
  state.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
    round: Number(state.round), step: 'round_end_choices', trainingTruth: false };
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { ...result.scenario, declaredPhase: 'cleanup', declaredPostScoringBoundary: true,
    damageAndEnemyPositionsDeclared: true, secondSideOwnershipDeclared: id === 'two-sides-no-nova',
    coherencyProofs, fullRound: false, fullMatch: false, actualScoringNotExecuted: true } };
}
async function registerScene(context, id, result) {
  const runtime = runtimeFor(context, result.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.80.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: runtimeRef,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved,
      state: result.state, scenario: result.scenario }));
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const ref = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  try { assert.deepEqual((await read(output + ref)).envelope, current.envelope); }
  catch (error) { if (error.code !== 'ENOENT') throw error; await save(ref, { envelope: current.envelope }); }
  return current;
}
async function finite(branch, credentials, key, actionType, pieceId) {
  const current = await checkpoint(branch);
  const value = await branch.native.commit({ roomId: roomId(branch.id),
    credential: credentials[current.envelope.state.activeSideKey || current.envelope.state.firstPlayerSideKey],
    operationKey: key, kind: 'finite', select: row => row.action.actionType === actionType
      && (pieceId === undefined || row.action.pieceId === pieceId) });
  await checkpoint(branch); return value;
}
async function surprise(branch, credentials, sideKey, parameters) {
  const before = await checkpoint(branch);
  const id = holos(before.envelope.state).find(row => row.sideKey === sideKey).id;
  const query = branch.runtime.query(before.envelope.state, { queryKind: 'holo_round_end_placement_preview', pieceId: id, parameters });
  assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), before);
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[sideKey],
    operationKey: 'surprise-' + sideKey, select: row => row.actionType === 'choose_holo_surprise' && row.pieceId === id,
    parameters: () => parameters });
  assert.deepEqual(result.preview.core.action, query.result.action);
  assert.equal(result.preview.core.chanceTicket, null);
  await checkpoint(branch); return { query, result };
}
async function replay(native, id, checkpointPrefix) {
  const current = await native.store.loadRoom(id), journal = await native.store.loadReplayBundle(id);
  const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= current.stateRevision; revision++) {
    const result = native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(checkpointPrefix + revision + '.json')).envelope);
  }
  return { receipts: receipts.length, checkpoints: current.stateRevision + 1, exact: true };
}

async function main() {
await fs.mkdir(directory, { recursive: true });
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
  factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef,
  contractVersion: 'T28-W3-08-holo-ordered-round-end-native-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const results = [];
    for (const id of specs) {
      const result = await scene(context, id); const runtime = runtimeFor(context, result.state);
      const sourceCatalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset: context.dataset,
        identityCatalogue: context.resources.abilityIdentities, sourcePhasePolicy: result.state.officialAbilitySourcePhasePolicy });
      assert.deepEqual(runtime.holoRoundEndSource, createOfficialHoloRoundEndSourceV1({ context,
        catalogue: sourceCatalogue, definitionIds }));
      for (const definitionId of definitionIds) {
        const definition = runtime.catalogue.definitions.find(row => row.definitionId === definitionId);
        assert.equal(definition.phase, 'any');
        assert.equal(definition.execution.adapterId, runtime.holoRoundEnd.descriptor.adapterId);
      }
      assert(runtime.holoRoundEnd.canStart(result.state));
      const bad = structuredClone(result.state); bad.officialHoloRoundEndSourceBundle.targetPolicy.onFieldOnly = false;
      bad.officialHoloRoundEndSourceBundle.bundleHash = hash(Object.fromEntries(Object.entries(bad.officialHoloRoundEndSourceBundle)
        .filter(([key]) => key !== 'bundleHash')));
      assert.throws(() => runtimeFor(context, bad), /CHARACTERISTIC_HOLO_ROUND_END_SOURCE_MISMATCH/);
      await registerScene(context, id, result);
      results.push({ id, sourceBundleHash: runtime.holoRoundEndSource.bundleHash,
        runtimeHash: runtime.descriptor.runtimeHash, definitionsBound: definitionIds });
    }
    const ref = await save('compile.json', { results, declaredPostScoringFixtures: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of specs) {
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority); await checkpoint(branch);
        await finite(branch, credentials, 'begin', 'begin_holo_round_end');
        const current = await checkpoint(branch); const state = current.envelope.state;
        const status = branch.runtime.query(state, { queryKind: 'holo_round_end_status' });
        assert.equal(status.result.pending.ownerSideKey, state.firstPlayerSideKey);
        const other = state.activeSideKey === 'player1' ? 'player2' : 'player1';
        const denied = branch.runtime.enumerate(state, { sideKey: other });
        assert.equal(denied.candidates.length + denied.parameterDomains.length, 0);
        assert.throws(() => branch.runtime.lifecycle(state, { eventKind: 'cleanup_and_refresh' }), /HOLO_ROUND_END_CHOICES_REQUIRED/);
        const semantic = parameters => branch.runtime.query(state, { queryKind: 'holo_round_end_placement_preview',
          pieceId: holos(state).find(row => row.sideKey === state.activeSideKey).id, parameters });
        if (id === 'place-first') {
          for (const [label, coordinate] of [ ['overlap', { xMilliInches: 16000, yMilliInches: 10000 }],
            ['outside-coherency', { xMilliInches: 22000, yMilliInches: 10000 }],
            ['outside-board', { xMilliInches: -1000, yMilliInches: 10000 }] ]) {
            assert.throws(() => semantic({ choice: 'place', targetUnitId: 'nova', coordinate }), undefined, label);
          }
          assert.throws(() => semantic({ choice: 'place', targetUnitId: 'enemy-marine',
            coordinate: { xMilliInches: 17600, yMilliInches: 10000 } }), /HOLO_SURPRISE_PARAMETERS_INVALID/);
          assert.throws(() => semantic({ choice: 'skip', stateHash: hash(state) }), /HOLO_SURPRISE_PARAMETERS_INVALID/);
          semantic({ choice: 'place', targetUnitId: 'nova', coordinate: { xMilliInches: 17600, yMilliInches: 10000 } });
        }
        if (id === 'two-sides-no-nova') {
          const domain = branch.runtime.enumerate(state).parameterDomains[0];
          assert.deepEqual(domain.parameterSchema.choice.enum, ['skip']);
          assert.deepEqual(domain.parameterSchema.targetUnitId.enum, []);
        }
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), current, 'read-only queries altered the Room');
        await save(id + '/consumed.json', { status, queryReadOnly: true, oppositeSeatDenied: true,
          parentBlocksCleanup: true, geometryNegatives: id === 'place-first' });
        results.push({ id, revision: current.stateRevision });
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', { results }); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of specs) {
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        const initial = (await read(output + id + '/checkpoint-r1.json')).envelope.state;
        const sides = id === 'two-sides-no-nova' ? ['player2', 'player1'] : ['player1'];
        const histories = [];
        for (const sideKey of sides) {
          const sourceId = holos(initial).find(row => row.sideKey === sideKey).id;
          if (id !== 'remove-first') {
            const parameters = id === 'place-first' ? { choice: 'place', targetUnitId: 'nova',
              coordinate: { xMilliInches: 17600, yMilliInches: 10000 } } : { choice: 'skip' };
            const current = await checkpoint(branch);
            if (!(current.envelope.state.officialHoloRoundEndHistory || []).some(row => row.sideKey === sideKey
              && row.definitionId === definitionIds[1])) {
              histories.push(await surprise(branch, credentials, sideKey, parameters));
            }
          }
          await finite(branch, credentials, 'remove-' + sideKey, 'resolve_holo_timed_life', sourceId);
        }
        let current = await checkpoint(branch); const ended = current.envelope.state;
        assert.equal(ended.pendingOfficialHoloRoundEnd.stage, 'complete');
        for (const sourceUnit of holos(ended)) {
          assert.equal(sourceUnit.isOnField, false); assert.equal(sourceUnit.currentModels, 0);
          assert.equal(sourceUnit.currentSupply, 0); assert.equal(sourceUnit.isInReserves, false);
        }
        assert.deepEqual(ended.scores, initial.scores); assert.deepEqual(ended.supplyLossLedger, initial.supplyLossLedger);
        const novaBefore = piece(initial, 'nova'), novaAfter = piece(ended, 'nova');
        for (const key of ['id', 'damageMarker', 'remainingWounds', 'currentModels', 'currentSupply', 'sourceRecordHash', 'officialPayloadHash']) {
          assert.deepEqual(novaAfter[key], novaBefore[key], 'Nova preserved ' + key);
        }
        assert.deepEqual(novaAfter.models.map(row => row.remainingWounds), novaBefore.models.map(row => row.remainingWounds));
        if (id === 'place-first') {
          assert.equal(novaAfter.models[0].xInches, 17.6); assert.equal(novaAfter.models[0].yInches, 10);
        } else assert.deepEqual(novaAfter.models, novaBefore.models);
        if (id === 'remove-first') assert(ended.officialHoloRoundEndHistory.some(row => row.outcome === 'source_not_on_battlefield'));
        if (id === 'two-sides-no-nova') assert.deepEqual(ended.officialHoloRoundEndHistory.map(row => row.sideKey),
          ['player2', 'player2', 'player1', 'player1']);
        await finite(branch, credentials, 'complete', 'complete_holo_round_end');
        await finite(branch, credentials, 'cleanup', 'resolve_current_product_cleanup_refresh');
        current = await checkpoint(branch);
        assert.equal(current.envelope.state.currentProductMatchLifecycle.step, 'determine_initiative');
        assert.equal(current.envelope.state.activeSideKey, null);
        assert.equal(current.envelope.state.officialHoloRoundEndCompletedRound, 1);
        assert(!current.envelope.state.pendingOfficialHoloRoundEnd);
        assert(branch.runtime.enumerate(current.envelope.state).candidates.some(row =>
          row.actionType === 'resolve_current_product_next_round_initiative'));
        assert.deepEqual(current.envelope.state.scores, initial.scores);
        assert.equal(initial.cardResources.player1[0].readiness, 'exhausted');
        assert.equal(current.envelope.state.cardResources.player1[0].readiness, 'ready');
        assert.deepEqual(piece(current.envelope.state, 'nova').equipment, novaBefore.equipment);
        await save(id + '/successor.json', { revision: current.stateRevision, histories,
          effectHistory: ended.officialHoloRoundEndHistory, novaBefore, novaAfter,
          resourceBefore: initial.cardResources, resourceAfter: current.envelope.state.cardResources,
          cleanupHistory: current.envelope.state.officialCleanupContinuationHistory,
          noOpponentKillOrScoreAttribution: true, nextInitiativeMenuAvailable: true, modelCalls: 0 });
        results.push({ id, revision: current.stateRevision });
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', { results }); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of specs) {
      const branch = await product.branch(id);
      try {
        await branch.native.restoreDependencies(roomId(id), branch.authority);
        const before = await branch.native.store.loadRoom(roomId(id));
        results.push({ id, ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r') });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), before);
      } finally { branch.close(); }
    }
    const previous = 'build/ticket-28-terran-wave3-20261116-v1/source-phase-policy/native/';
    const productRegistry = registry(); let native;
    try {
      const authority = await read(previous + 'authority.json');
      productRegistry.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
      const context = await productRegistry.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
      const runtime = runtimeFor(context, authority.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.79.0');
      assert.deepEqual(runtime.descriptor, await read(previous + 'runtime.json'));
      const sourcePath = path.join(root, previous, 'room.sqlite'); const bytes = await fs.readFile(sourcePath);
      const target = path.join(directory, 'legacy-room.sqlite');
      try { await fs.access(target); }
      catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, bytes, { flag: 'wx' }); }
      native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      await native.restoreDependencies('wave3-explicit-source-phases', authority);
      const legacy = await replay(native, 'wave3-explicit-source-phases', previous + 'checkpoint-r');
      assert.equal(sha256(await fs.readFile(sourcePath)), sha256(bytes));
      const ref = await save('cold-recovery.json', { current: results, legacy: { ...legacy,
        runtimeVersion: '3.79.0', descriptorExact: true, originalDatabaseSha256: sha256(bytes), originalDatabaseUnchanged: true } });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { native?.close(); productRegistry.close(); }
  } },
] });
console.log(JSON.stringify({ gate: 'holo-round-end', status: gate.status, failures: gate.failures.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
export { root, output, sourceProduct, scene, registerScene, openProduct, checkpoint, finite, surprise, replay };
