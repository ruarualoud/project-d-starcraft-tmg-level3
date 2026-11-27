import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { root, makeScene, runtimeFor, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialSpecialUnitPieceV1 } from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/auto-turret-timed-life/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const definitionId = 'unit:auto_turret/timed-life-any-phase@1';
const definitionIds = [definitionId, 'unit:holo_decoy/timed-life-any-phase@1', 'unit:holo_decoy/surprise-any-phase@1'];
const roomId = 'wave3-auto-turret-timed-life';
const releaseId = roomId + '-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
  const ref = output + name;
  await atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
  return ref;
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
    const manifest = await read(sourceRef);
    product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
async function sceneFor(context) {
  const scene = await makeScene(context, { id: 'turret-round-end', phase: 'assault', bindCombatEligibility: true,
    bindAbilitySourcePhases: true, unitRoundEndDefinitionIds: definitionIds,
    structureDefinitionIds: ['unit:auto_turret/structure-any-phase@1'] });
  const state = scene.state;
  for (const [sideKey, x] of [['player1', 8], ['player2', 44]]) {
    const turret = createOfficialSpecialUnitPieceV1(state, sideKey, 'army_units:auto_turret', 'turret-' + sideKey);
    arrange(turret, x, 30);
    state.pieces.push(turret);
  }
  state.phase = 'cleanup'; state.firstPlayerSideKey = 'player2'; state.activeSideKey = 'player2';
  state.scores = { player1: 2, player2: 2 };
  state.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
    round: Number(state.round), step: 'round_end_choices', trainingTruth: false };
  const coherency = declareCoherency(state);
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    ...scene.scenario, declaredPostScoringRoundEnd: true, scoresAndFirstPlayerDeclared: true,
    turretPlacementDeclaredFromRealGeneratedFactory: true, coherency,
    fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.92.0');
  const runtimeRef = await save('native/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const manifest = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(manifest.source.sourceRevisionRef),
      datasetRef: manifest.source.datasetRef, snapshotRef: manifest.source.snapshotRef,
      sourceRevisionRef: manifest.source.sourceRevisionRef, referenceSources: manifest.source.references,
      sourcePolicy: manifest.source.policy, components: { ...manifest.components,
        rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
          integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    const previous = await cached('native/authority.json');
    if (previous) assert.deepEqual(previous, authority); else await save('native/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch() {
    const authority = await read(output + 'native/authority.json');
    const context = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + 'native/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, 'native'), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { authority, context, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId);
  const name = 'native/checkpoint-r' + current.stateRevision + '.json';
  const previous = await cached(name);
  if (previous) assert.deepEqual(previous.envelope, current.envelope);
  else await save(name, { envelope: current.envelope });
  return current;
}
async function finite(branch, credentials, key, actionType, pieceId) {
  await checkpoint(branch);
  const sideKey = pieceId === undefined ? branch.authority.state.firstPlayerSideKey
    : pieceOf(branch.authority.state, pieceId).sideKey;
  const value = await branch.native.commit({ roomId,
    credential: credentials[sideKey],
    operationKey: key, kind: 'finite', select: row => row.action.actionType === actionType
      && (pieceId === undefined || row.action.pieceId === pieceId) });
  await checkpoint(branch);
  return value;
}
async function replay(native, id, checkpointPrefix) {
  const current = await native.store.loadRoom(id);
  const journal = await native.store.loadReplayBundle(id);
  const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= current.stateRevision; revision++) {
    const replayed = native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(replayed.ok, true, JSON.stringify(replayed));
    assert.deepEqual(replayed.envelope, (await read(checkpointPrefix + revision + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), current);
  return { receipts: receipts.length, checkpoints: current.stateRevision + 1, exact: true };
}
async function verifyLegacy(product) {
  const results = [];
  for (const spec of [
    { id: 'holo', output: 'build/ticket-28-terran-wave3-20261116-v1/holo-round-end/',
      branch: 'place-first', roomId: 'wave3-holo-round-end-place-first', version: '3.80.0' },
    { id: 'structure', output: 'build/ticket-28-terran-wave3-20261117-v1/generated-structure/',
      branch: 'movement', roomId: 'wave3-generated-structure-movement', version: '3.90.0' },
  ]) {
    const previous = await cached('legacy/' + spec.id + '.json');
    if (previous) { results.push(previous); continue; }
    const prefix = spec.output + spec.branch + '/';
    const authority = await read(prefix + 'authority.json');
    const database = new DatabaseSync(path.join(root, spec.output, 'releases.sqlite'), { readOnly: true });
    let manifest;
    try { manifest = JSON.parse(database.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?')
      .get(authority.releaseId).manifest_json); } finally { database.close(); }
    product.resolver.register(manifest);
    const context = await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    const runtime = spec.id === 'holo' ? runtimeFor(context, authority.state)
      : createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, definitionIds: [] });
    assert.equal(runtime.descriptor.runtimeVersion, spec.version);
    assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
    const originalFile = path.join(root, prefix, 'room.sqlite');
    const originalHash = sha256(await fs.readFile(originalFile));
    const legacyDir = path.join(directory, 'legacy', spec.id);
    await fs.mkdir(legacyDir, { recursive: true });
    const target = path.join(legacyDir, 'room.sqlite');
    try { await fs.access(target); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await fs.copyFile(originalFile, target); }
    const native = openWave3EngineeringRoomV1({ directory: legacyDir, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    try {
      await native.restoreDependencies(spec.roomId, authority);
      const result = { id: spec.id, runtimeVersion: spec.version, descriptorExact: true,
        ...await replay(native, spec.roomId, prefix + 'checkpoint-r'), originalDatabaseSha256: originalHash, modelCalls: 0 };
      assert.equal(sha256(await fs.readFile(originalFile)), originalHash);
      await save('legacy/' + spec.id + '.json', result); results.push(result);
    } finally { native.close(); }
  }
  return results;
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef,
    contractVersion: 'T28-W3-08-AutoTurret-TimedLife-SharedRoundEnd-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context), runtime = runtimeFor(context, scene.state);
      const source = scene.state.officialUnitRoundEndSourceBundle;
      assert.equal(source.version, '1.1.0');
      assert(source.definitions.some(row => row.definitionId === definitionId
        && row.sourceText === 'Remove this Unit at the End of the Round.'));
      assert(runtime.catalogue.definitions.some(row => row.definitionId === definitionId
        && row.execution.status === 'executable_exact'));
      assert(!scene.state.officialHoloRoundEndSourceBundle);
      assert(runtime.unitRoundEnd.canStart(scene.state));
      const before = structuredClone(scene.state);
      const query = runtime.query(scene.state, { queryKind: 'unit_round_end_status' });
      assert(query.result.canStart); assert.deepEqual(scene.state, before);
      const early = structuredClone(scene.state); early.phase = 'assault';
      assert.equal(runtime.unitRoundEnd.canStart(early), false);
      assert.throws(() => runtime.lifecycle(scene.state, { eventKind: 'cleanup_and_refresh' }), /ROUND_END_CHOICES_REQUIRED/);
      const forged = structuredClone(scene.state); forged.officialUnitRoundEndSourceBundle.definitions[0].payloadHash = '0'.repeat(64);
      assert.throws(() => runtimeFor(context, forged), /ROUND_END_SOURCE_MISMATCH/);
      const ambiguous = structuredClone(scene.state); ambiguous.officialHoloRoundEndSourceBundle = structuredClone(source);
      assert.throws(() => runtimeFor(context, ambiguous), /ROUND_END_SOURCE_AMBIGUOUS/);
      await registerScene(context, scene);
      const ref = await save('compile.json', { query, wrongPhaseRejected: true, cleanupBypassRejected: true,
        forgedSourceRejected: true, ambiguousSourceRejected: true, formalIrRegistered: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: output + 'native/authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const branch = await product.branch();
      try {
        const credentials = await branch.native.create(roomId, branch.authority); await checkpoint(branch);
        await finite(branch, credentials, 'begin', 'begin_unit_round_end');
        const current = await checkpoint(branch);
        const parent = current.envelope.state.pendingOfficialUnitRoundEnd;
        assert.equal(parent.ownerSideKey, 'player2');
        assert.deepEqual(branch.runtime.enumerate(current.envelope.state).candidates.map(row => row.pieceId), ['turret-player2']);
        const ref = await save('consume.json', { revision: current.stateRevision, parent,
          query: branch.runtime.query(current.envelope.state, { queryKind: 'unit_round_end_status' }),
          coldHandoffAtParent: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: output + 'native/checkpoint-r' + current.stateRevision + '.json' };
      } finally { branch.close(); }
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const branch = await product.branch();
      try {
        const credentials = await branch.native.create(roomId, branch.authority);
        const initial = branch.authority.state;
        const holo = initial.pieces.find(piece => piece.officialUnitRecordKey === 'army_units:holo_decoy');
        await finite(branch, credentials, 'remove-p2', 'resolve_unit_timed_life', 'turret-player2');
        await finite(branch, credentials, 'remove-p1', 'resolve_unit_timed_life', 'turret-player1');
        let current = await checkpoint(branch);
        const skipped = await branch.native.commit({ roomId, credential: credentials.player1, operationKey: 'skip-surprise',
          select: row => row.actionType === 'choose_holo_surprise' && row.pieceId === holo.id,
          parameters: () => ({ choice: 'skip' }) });
        assert.equal(skipped.preview.core.chanceTicket, null); await checkpoint(branch);
        await finite(branch, credentials, 'remove-holo', 'resolve_unit_timed_life', holo.id);
        current = await checkpoint(branch);
        const ended = current.envelope.state;
        assert.deepEqual(ended.officialUnitRoundEndHistory.map(row => row.pieceId),
          ['turret-player2', 'turret-player1', holo.id, holo.id]);
        for (const id of ['turret-player1', 'turret-player2', holo.id]) {
          const unit = pieceOf(ended, id);
          assert.equal(unit.currentModels, 0); assert.equal(unit.isOnField, false);
          assert.equal(unit.isInReserves, false); assert.equal(unit.currentSupply, 0);
          assert.deepEqual(unit.destroyedModelIds, unit.models.map(model => model.id).sort());
        }
        assert(ended.log.flatMap(row => row.events || []).filter(row => row.type === 'unit_timed_life_removed')
          .every(row => row.opponentKillAttribution === false));
        await finite(branch, credentials, 'complete', 'complete_unit_round_end');
        await finite(branch, credentials, 'cleanup', 'resolve_current_product_cleanup_refresh');
        current = await checkpoint(branch);
        assert.equal(current.envelope.state.officialUnitRoundEndCompletedRound, 1);
        assert(!current.envelope.state.pendingOfficialUnitRoundEnd);
        assert.equal(current.envelope.state.currentProductMatchLifecycle.step, 'determine_initiative');
        assert.deepEqual(current.envelope.state.scores, initial.scores);
        assert(branch.runtime.enumerate(current.envelope.state).candidates.some(row =>
          row.actionType === 'resolve_current_product_next_round_initiative'));
        const count = current.stateRevision;
        await finite(branch, credentials, 'complete', 'complete_unit_round_end');
        const duplicate = await checkpoint(branch); assert.equal(duplicate.stateRevision, count);
        const ref = await save('successor.json', { revision: count, effectHistory: ended.officialUnitRoundEndHistory,
          firstPlayerRespected: true, controllerOrderRespected: true, allExpiredUnitsRemoved: true,
          nextInitiativeMenuAvailable: true, scorePreserved: true, duplicateOperationIdempotent: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: output + 'native/checkpoint-r' + count + '.json' };
      } finally { branch.close(); }
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const branch = await product.branch();
      let current;
      try {
        await branch.native.restoreDependencies(roomId, branch.authority);
        current = await replay(branch.native, roomId, output + 'native/checkpoint-r');
      } finally { branch.close(); }
      const legacy = await verifyLegacy(product);
      const ref = await save('cold-recovery.json', { current, legacy, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'auto-turret-timed-life', status: result.status, failures: result.failures.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
