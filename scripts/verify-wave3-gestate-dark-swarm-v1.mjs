import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, arrange } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createOfficialTerrainPieceV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { deriveOfficialModelSurfacePlacementV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/gestate-dark-swarm/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const releaseId = 'wave3-gestate-dark-swarm-placement-source-v1';
const roomId = 'wave3-gestate-dark-swarm-placement';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const piece = (state, id = 'defiler') => state.pieces.find(row => row.id === id);
const coordinates = (x, y = 26000) => ({ coordinate: { xMilliInches: x, yMilliInches: y } });
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({
  context, spatialState: state, definitionIds: [] });
const query = (runtime, state, parameters) => runtime.query(state, {
  queryKind: 'dark_swarm_placement_preview', pieceId: 'defiler', parameters });
async function save(name, value) {
  const ref = prefix + name;
  await atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
  return ref;
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
async function sceneFor(context, { includeDarkSwarmLifecycle = false } = {}) {
  const legacy = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const environment = (await read('build/ticket-28-zerg-wave3-20261117-v1/defiler-burrow/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, canonicalResourceTypes: true,
    includeGestateDarkSwarm: true, includeBattlefieldDisplacement: true, includeDarkSwarmLifecycle,
    legacyDisclosurePolicy: legacy.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'],
        units: [{ unitInstanceId: 'defiler', recordKey: 'army_units:defiler', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
        units: [{ unitInstanceId: 'target', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] }] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
    'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger',
    'engagementScale', 'armyBuildingEngagementScale'];
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(environment[key])])), ...setup.state,
    ...Object.fromEntries(['officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle',
      'officialBattlefieldTokenMarkerRegistry'].map(key => [key, structuredClone(legacy[key])])),
    round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
  arrange(piece(state), 12, 26);
  arrange(piece(state, 'target'), 42, 4);
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    partialLegalRosters: true, declaredPhaseAndPositions: true, terrainFromOriginalFactory: true,
    scale: 'Standard', mineralBudget: 2000, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.110.0');
  const runtimeRef = await save('runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const authority = JSON.parse(JSON.stringify(createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene })));
    try { assert.deepEqual(await read(prefix + 'authority.json'), authority); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await save('authority.json', authority); }
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  try {
    const authority = await read(prefix + 'authority.json');
    const context = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { ...product, authority, context, runtime, native, close() { native.close(); product.close(); } };
  } catch (error) { product.close(); throw error; }
}
async function checkpoint(product) {
  const current = await product.native.store.loadRoom(roomId);
  const ref = 'checkpoint-r' + current.stateRevision + '.json';
  try { assert.deepEqual((await read(prefix + ref)).envelope, current.envelope); }
  catch (error) { if (error.code !== 'ENOENT') throw error; await save(ref, { envelope: current.envelope }); }
  return current;
}
function terrain(state, id, x1, x2, standable) {
  const row = createOfficialTerrainPieceV1({ id, terrainKind: standable ? 'ordinary' : 'impassable',
    size: 3, standableHorizontalSurface: standable,
    footprint: { shape: 'axis_aligned_rectangle', minXMilliInches: x1, maxXMilliInches: x2,
      minYMilliInches: 21000, maxYMilliInches: 31000 } });
  state.board.terrain.push({ ...row, elevationSurface: standable });
  return row;
}
async function preflight(context, state) {
  const runtime = runtimeFor(context, state);
  const original = structuredClone(state);
  const good = query(runtime, state, coordinates(16000));
  const edge = query(runtime, state, coordinates(18205));
  assert.equal(edge.result.action.sourceAction.measurements[0].distanceMilliInches, 4000);
  const refused = [];
  for (const [name, parameters, expected] of [
    ['outside_range', coordinates(18207), /DARK_SWARM_PLACEMENT_RANGE_EXCEEDED/],
    ['full_base_outside', coordinates(500), /BATTLEFIELD_TOKEN_COORDINATE_INVALID/],
    ['source_overlap', coordinates(12000), /DARK_SWARM_TOKEN_OVERLAPS_MODEL/],
    ['host_identity_in_semantics', { ...coordinates(16000), tokenId: 'forged' }, /SEMANTIC_COORDINATE_REQUIRED/],
  ]) { assert.throws(() => query(runtime, state, parameters), expected, name); refused.push(name); }
  const blocked = structuredClone(state);
  terrain(blocked, 'gestate-test-wall', 14500, 15000, false);
  assert.throws(() => query(runtimeFor(context, blocked), blocked, coordinates(18000)), /LINE_OF_SIGHT_REQUIRED/);
  refused.push('wall_blocks_los');
  const overlap = structuredClone(state);
  overlap.board.tokens.push(structuredClone(good.result.action.sourceAction.token));
  assert.throws(() => query(runtimeFor(context, overlap), overlap, coordinates(16000)), /TOKEN_OVERLAPS_TOKEN/);
  refused.push('token_overlap');
  const targetHigh = structuredClone(state);
  terrain(targetHigh, 'gestate-target-platform', 16000, 21000, true);
  const highToken = query(runtimeFor(context, targetHigh), targetHigh, coordinates(18000));
  assert.equal(highToken.result.action.sourceAction.measurements[0].sight.target.effectiveSize, 3);
  const sourceHigh = structuredClone(state);
  terrain(sourceHigh, 'gestate-source-platform', 9000, 14000, true);
  Object.assign(piece(sourceHigh).models[0], deriveOfficialModelSurfacePlacementV2(sourceHigh, {
    pieceId: 'defiler', modelId: piece(sourceHigh).models[0].id }));
  const highSource = query(runtimeFor(context, sourceHigh), sourceHigh, coordinates(18000));
  assert.equal(highSource.result.action.sourceAction.measurements[0].sight.attacker.effectiveSize, 5);
  assert.deepEqual(state, original, 'queries changed their input state');
  return { good, edge, refused, highToken, highSource, queryNoMutation: true, modelCalls: 0 };
}
function movementRequest(runtime, state, id, x, y, displaceToken = false) {
  const actor = piece(state, id), model = actor.models[0];
  const parameters = { leadingModelId: model.id,
    path: [{ xMilliInches: Math.round(model.xInches * 1000), yMilliInches: Math.round(model.yInches * 1000) },
      { xMilliInches: x, yMilliInches: y }], placements: [] };
  const request = { pieceId: id, actionType: 'move', parameters };
  if (!displaceToken) return { request };
  const token = state.board.tokens.find(row => row.tokenKind === 'dark_swarm');
  const proof = runtime.query(state, { queryKind: 'battlefield_token_displacement', ...request,
    tokenId: token.tokenId, precedingDisplacements: [] });
  assert(proof.solution.bestWitness);
  parameters.tokenDisplacements = [{ tokenId: token.tokenId, coordinate: proof.solution.bestWitness.coordinate }];
  return { request, proof };
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
async function legacy(product, kind) {
  const bombard = kind === 'bombard';
  const sourcePrefix = bombard ? 'build/ticket-28-zerg-wave3-20261117-v1/bombard/targeting/far-wall-hidden/'
    : 'build/ticket-28-zerg-wave3-20261117-v1/defiler-burrow/';
  const branchPrefix = sourcePrefix + (bombard ? 'assault/' : '');
  const authority = await read(branchPrefix + 'authority.json');
  product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
  const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
    definitionIds: bombard ? ['unit:bile_launcher/indomitable-assault-phase@1'] : [],
    ...(bombard ? { weaponDefinitionIds: ['unit:bile_launcher/bile-bomb-assault-phase@1'], includeRanged: true,
      includePrecisionChoices: true, includeArmourChoices: true } : {}) });
  assert.deepEqual(runtime.descriptor, await read(sourcePrefix + 'runtime.json'));
  const originalFile = path.join(root, branchPrefix + 'room.sqlite'), original = await fs.readFile(originalFile);
  const filename = 'legacy-' + kind + '.sqlite', copy = path.join(directory, filename);
  try { await fs.access(copy); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.writeFile(copy, original, { flag: 'wx' });
  }
  const native = openWave3EngineeringRoomV1({ directory, filename,
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    const id = bombard ? 'wave3-bombard-far-wall-hidden-assault' : 'wave3-defiler-burrow';
    await native.restoreDependencies(id, authority);
    const result = await replay(native, id, branchPrefix + 'checkpoint-r');
    assert.equal(sha256(await fs.readFile(originalFile)), sha256(original));
    return { ...result, runtimeVersion: runtime.descriptor.runtimeVersion, originalUnchanged: true };
  } finally { native.close(); }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef, contractVersion: 'T28-W3-09-Gestate-Placement-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context);
      await registerScene(context, scene);
      const result = await preflight(context, scene.state);
      const ref = await save('compile.json', result);
      return { evidenceRef: ref, checkpointRef: prefix + 'authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const credentials = await product.native.create(roomId, product.authority);
      await checkpoint(product);
      const initial = (await read(prefix + 'checkpoint-r0.json')).envelope.state;
      const expected = query(product.runtime, initial, coordinates(16000));
      const committed = await product.native.commit({ roomId, credential: credentials.player1, operationKey: 'set-dark-swarm',
        select: row => row.actionType === 'set_dark_swarm', parameters: () => coordinates(16000) });
      assert.deepEqual(committed.preview.core.action, expected.result.action);
      const current = await checkpoint(product), state = current.envelope.state;
      assert.equal(state.board.tokens.length, 1);
      assert.equal(state.board.tokens[0].baseDiameterMm, 32);
      assert.equal(state.activeSideKey, 'player1');
      assert.deepEqual(state.cardResources, initial.cardResources);
      assert.equal(state.gestateDarkSwarmUseHistory.length, 1);
      assert.equal(product.runtime.enumerate(state).parameterDomains.some(row => row.actionType === 'set_dark_swarm'), false);
      assert(product.runtime.enumerate(state).parameterDomains.some(row => row.actionType === 'move' && row.pieceId === 'defiler'));
      const ref = await save('consume.json', { revision: current.stateRevision, queryEqualsNative: true,
        zeroPaymentCardsUnchanged: true, duplicateIdempotence: committed.idempotentReplayVerified,
        ordinaryActionAvailable: true, sameRoundReuseExcluded: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'checkpoint-r1.json' };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const credentials = await product.native.create(roomId, product.authority);
      const before = (await read(prefix + 'checkpoint-r1.json')).envelope.state;
      const move = movementRequest(product.runtime, before, 'defiler', 16000, 26000, true);
      const preview = product.runtime.query(before, { queryKind: 'battlefield_displacement_preview', ...move.request });
      const committed = await product.native.commit({ roomId, credential: credentials.player1, operationKey: 'defiler-displace',
        select: row => row.actionType === 'move' && row.pieceId === 'defiler', parameters: () => move.request.parameters });
      assert.deepEqual(committed.preview.core.action, preview.result.action);
      let current = await checkpoint(product);
      assert.notDeepEqual(current.envelope.state.board.tokens[0].coordinate, before.board.tokens[0].coordinate);
      const status = product.runtime.query(current.envelope.state, { queryKind: 'dark_swarm_status' });
      await product.native.commit({ roomId, credential: credentials.player1, operationKey: 'defiler-finish',
        select: row => row.actionType === 'finish_activation' && row.pieceId === 'defiler', parameters: () => ({}) });
      await checkpoint(product);
      current = await product.native.store.loadRoom(roomId);
      assert.equal(current.envelope.state.activeSideKey, 'player2');
      const enemyMove = movementRequest(product.runtime, current.envelope.state, 'target', 42000, 4200);
      await product.native.commit({ roomId, credential: credentials.player2, operationKey: 'opponent-move',
        select: row => row.actionType === 'move' && row.pieceId === 'target', parameters: () => enemyMove.request.parameters });
      await checkpoint(product);
      await product.native.commit({ roomId, credential: credentials.player2, operationKey: 'opponent-finish',
        select: row => row.actionType === 'finish_activation' && row.pieceId === 'target', parameters: () => ({}) });
      current = await checkpoint(product);
      assert.equal(current.envelope.state.gestateDarkSwarmUseHistory.length, 1);
      assert.equal(current.envelope.state.board.tokens.length, 1);
      const ref = await save('successor.json', { revision: current.stateRevision, movement: move, status,
        displacementBindingValid: true, queryEqualsNative: true, bothActivationsCompleted: true,
        defaultCleanupAndSourceRemovalNotYetCovered: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'checkpoint-r' + current.stateRevision + '.json' };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      await product.native.restoreDependencies(roomId, product.authority);
      const current = await replay(product.native, roomId, prefix + 'checkpoint-r');
      const oldBombard = await legacy(product, 'bombard');
      const oldDefiler = await legacy(product, 'defiler');
      const ref = await save('cold-recovery.json', { current, oldBombard, oldDefiler, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'gestate-dark-swarm-placement', status: gate.status, failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
export { sourceProduct, sceneFor, runtimeFor };
