import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { sceneFor } from './verify-wave3-plague-cast-v1.mjs';
import { sourceProduct } from './verify-wave3-gestate-dark-swarm-v1.mjs';
import { createOfficialSpecialUnitPieceV1 } from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialTerrainPieceV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { createOfficialTerrainElevationAgreementV1 } from '../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/plague-flying/';
const directory = path.join(root, prefix), roomId = 'wave3-plague-flying', releaseId = roomId + '-v1';
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds: [], includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true });
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return prefix + name;
}
async function cached(name) {
  try { return await read(prefix + name); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
function query(runtime, state) {
  return runtime.query(state, { queryKind: 'plague_template_coverage', sourcePieceId: 'defiler',
    coordinate: { xMilliInches: 20000, yMilliInches: 26000 }, biomassToSpend: 3 });
}
async function makeScene(context) {
  const scene = await sceneFor(context, false, { additionalGeneratedUnitRecordKeys: ['army_units:point_defense_drone'],
    includeNonLethalStandardDamage: true });
  let state = scene.state;
  const drone = createOfficialSpecialUnitPieceV1(state, 'player2', 'army_units:point_defense_drone', 'flying-drone');
  arrange(drone, 20, 29); drone.deploymentStatus = 'declared_engineering_placement';
  state.pieces.push(drone); declareCoherency(state);
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state, scenario: { ...scene.scenario, generatedUnitFactory: 'createOfficialSpecialUnitPieceV1',
    declaredDronePhysicalPosition: { xInches: 20, yInches: 29, elevation: 'ground' },
    summonAbilityNotExercised: true, sourceFactionAvailabilityNotClaimed: true } };
}
async function registerScene(context, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.122.0');
  const runtimeRef = await save('runtime.json', runtime.descriptor), product = registry(), m = context.manifest;
  try {
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const bound = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    await save('authority.json', createWave3ComponentEngineeringAuthorityV1({ context: bound, ...scene }));
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  try {
    const authority = await read(prefix + 'authority.json');
    const context = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state); assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { authority, context, runtime, native, close: () => { native.close(); product.close(); } };
  } catch (error) { product.close(); throw error; }
}
async function checkpoint(product) {
  const current = await product.native.store.loadRoom(roomId), name = 'checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(name);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(product, credentials, operationKey, select, parameters) {
  const result = await product.native.commit({ roomId, credential: credentials.player1, operationKey, select, parameters });
  await checkpoint(product); return result;
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Plague-Flying-Physical-Base-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await makeScene(context), state = scene.state, runtime = runtimeFor(context, state);
      const profile = state.officialModelBaseGeometryDataBundle.profiles.find(row => row.recordKey === 'army_units:point_defense_drone');
      assert(profile); assert.equal(profile.baseWidthMillimetres, 32); assert.equal(profile.baseShape, 'round');
      assert.equal(profile.p2pSource.sourceId, 'terran_p2p'); assert.equal(profile.p2pSource.pdfPage, 5);
      assert.equal(piece(state, 'flying-drone').combatTag, 'flying');
      const before = structuredClone(state), ground = query(runtime, state); assert.deepEqual(state, before);
      const assessment = ground.assessments.find(row => row.pieceId === 'flying-drone');
      assert.equal(assessment.physicalBaseElevation, 'ground'); assert.equal(assessment.affected, true);
      assert.equal(ground.batches.find(row => row.targetPieceId === 'flying-drone').dice, 3);
      // The template radius is 2.5 inches. The centre is 3 inches away, so
      // inclusion must come from the actual 32mm footprint, not a centre test.
      assert.equal(ground.templateFootprint.widthMilliInches, 5000);
      const outside = structuredClone(state); arrange(piece(outside, 'flying-drone'), 20, 30);
      assert(query(runtime, outside).assessments.find(row => row.pieceId === 'flying-drone').reasons.includes('outside_template'));
      const high = structuredClone(state), id = 'declared-drone-high';
      const terrain = createOfficialTerrainPieceV1({ id, terrainKind: 'ordinary', size: 3,
        footprint: { shape: 'axis_aligned_rectangle', minXMilliInches: 19000, maxXMilliInches: 21000,
          minYMilliInches: 28000, maxYMilliInches: 30000 }, standableHorizontalSurface: true });
      high.board.terrain = [{ ...terrain, terrainId: id, elevationSurface: true, isRemoved: false,
        accessPoints: [], openings: [], blocksPlacement: false }];
      high.board.terrainElevationAgreement = createOfficialTerrainElevationAgreementV1({ supportRelations: [] }); high.board.accessPoints = [];
      Object.assign(piece(high, 'flying-drone').models[0], { elevation: 'high', supportTerrainIds: [id] });
      const elevated = query(runtime, high).assessments.find(row => row.pieceId === 'flying-drone');
      assert.equal(elevated.physicalBaseElevation, 'high'); assert(elevated.reasons.includes('different_elevation'));
      await registerScene(context, scene);
      const ref = await save('compile.json', { sourceGeometry: profile, actualFlyingTag: true, groundPhysicalBaseCovered: assessment,
        outsideExcluded: true, highPhysicalBaseExcluded: elevated, declaredConditionalPlacement: true,
        ravenFlightStandStillMissing: true, sourceSpawnAbilityNotTested: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const credentials = await product.native.create(roomId, product.authority); await checkpoint(product);
      // Room creation normalizes a generated unit. Compare the query against
      // the actual original Native envelope, also when reusing a saved cast.
      const before = (await read(prefix + 'checkpoint-r0.json')).envelope.state;
      const aggregate = await product.native.store.loadRoom(roomId);
      const coverage = query(product.runtime, before);
      const parameters = { coordinate: { xMilliInches: 20000, yMilliInches: 26000 }, biomassToSpend: 3,
        paymentCardInstanceIds: coverage.payment.cardOnlyPayments[0].cardInstanceIds };
      const preview = product.runtime.query(before, { queryKind: 'plague_cast_preview', pieceId: 'defiler', parameters });
      assert.deepEqual(await product.native.store.loadRoom(roomId), aggregate);
      const applied = await invoke(product, credentials, 'flying-plague', row => row.actionType === 'cast_plague' && row.pieceId === 'defiler', () => parameters);
      assert.deepEqual(applied.preview.core.action, preview.result.action);
      const after = (await read(prefix + 'checkpoint-r1.json')).envelope.state;
      const resolved = after.officialPlagueUseHistory.at(-1).resolutions.find(row => row.targetPieceId === 'flying-drone');
      assert(resolved); assert.equal(resolved.dice, 3); assert.equal(resolved.coveredModelIds.length, 1);
      assert.equal(resolved.nonLethal.postDamageMarker, resolved.nonLethal.priorDamageMarker + resolved.hits - resolved.evaded);
      assert.deepEqual(resolved.nonLethal.casualtyModelIds, []);
      assert.equal(piece(after, 'flying-drone').currentModels, 1); assert.equal(piece(after, 'flying-drone').currentSupply, 0);
      const ref = await save('consume.json', { nativeFlyingPlague: true, resolved, queryEqualsPreview: true,
        exactPhysicalBaseSource: true, actualSummonAbilityNotClaimed: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'checkpoint-r1.json' };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const credentials = await product.native.create(roomId, product.authority);
      await invoke(product, credentials, 'finish-plague', row => row.actionType === 'finish_activation' && row.pieceId === 'defiler', () => ({}));
      const current = await checkpoint(product); assert.equal(current.envelope.state.activeSideKey, 'player2');
      assert.equal(current.envelope.state.selectedRosterActivationWindow, undefined);
      const ref = await save('successor.json', { activationFinished: true, nextSide: 'player2', revision: current.stateRevision, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'checkpoint-r' + current.stateRevision + '.json' };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      await product.native.restoreDependencies(roomId, product.authority);
      const bundle = await product.native.store.loadReplayBundle(roomId);
      const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
      for (let index = 0; index <= receipts.length; index++) {
        const result = product.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, index) });
        assert.equal(result.ok, true, JSON.stringify(result));
        assert.deepEqual(result.envelope, (await read(prefix + 'checkpoint-r' + index + '.json')).envelope);
      }
      const ref = await save('cold-recovery.json', { receipts: receipts.length, checkpoints: receipts.length + 1,
        exact: true, newRuntimeVersion: '3.122.0', originalMeleeR3NotOpened: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: gate.status, passed: Object.keys(gate.passed), failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
