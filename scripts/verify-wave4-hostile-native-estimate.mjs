import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { compileWave4HostileIncubation } from './compile-wave4-hostile-incubation.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { getOfficialReleaseModelBaseGeometryBundleV2 } from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import { getOfficialReleaseUnitCardSupplyDataBundleV2 } from '../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1 } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialSkirmish500RoomInitialStateAuthorityV1 } from '../packages/product-composition/official-skirmish-500-room-factory-v1.mjs';
import { allowsOfficialSpawnRoundSpecialAbilityV1 } from '../packages/rule-atoms/official-spawn-round-ability-lock-v1.mjs';
import { createOfficialStructureFamilyAdapterV1 } from '../packages/product-composition/official-structure-family-adapter-v1.mjs';
import { projectOfficialCharacteristicStatusFamilyModifiersV1, consumeOfficialDetectionHiddenStatusesV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { projectOfficialBattlefieldAssetFamilyModifiersV1 } from '../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs';
import { OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 } from '../packages/rule-atoms/official-movement-clearance-contract-v13.mjs';
import { declareWave3EngineeringCoherencyV1, createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputs = await compileWave4HostileIncubation(root, { geometryEstimate: true });
const { context, dataset, scope, estimate } = inputs;
const parent = path.join(root, 'build/wave4-web/hostile-incubation');
await fs.mkdir(parent, { recursive: true });
const directory = await fs.mkdtemp(path.join(parent, 'native-estimate-'));
const runRef = path.relative(root, directory);
const save = (ref, value) => atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
for (const [name, value] of Object.entries({ ...inputs.artifacts, 'release-manifest': context.manifest })) {
  await save(inputs.directory + '/' + name + '.json', value);
}
const hostile = inputs.lifecycle.definitionIds[0];
const turret = 'army_units:infested_missile_turret';
const detection = 'unit:infested_missile_turret/detection-any-phase@1';
const structure = 'unit:infested_missile_turret/structure-any-phase@1';
const creep = 'unit:infested_missile_turret/source-of-creep-any-phase@1';
const sourceDefinitionIds = [hostile, detection, structure, creep];
assert.equal(scope.sourceRecordKeys.length, 102);
assert.throws(() => getOfficialReleaseModelBaseGeometryBundleV2({ ...context, allowEngineeringEstimatedGeometry: false }), /ENGINEERING_IMAGE_GEOMETRY_NOT_ADMITTED/);
assert.throws(() => getOfficialReleaseUnitCardSupplyDataBundleV2({ ...context, allowEngineeringEstimatedGeometry: false }), /UNIT_CARD_SUPPLY_ENGINEERING_GEOMETRY_NOT_ADMITTED/);
assert.throws(() => createOfficialStandardRoomInitialStateAuthorityV1({ releaseContext: context }), /STANDARD_ROOM_ESTIMATED_GEOMETRY_FORBIDDEN/);
assert.throws(() => createOfficialSkirmish500RoomInitialStateAuthorityV1({ releaseContext: context }), /SKIRMISH_ROOM_ESTIMATED_GEOMETRY_FORBIDDEN/);
const candidate = (sideKey, key, faction, cards) => ({ sideKey, scaleId: 'Standard', mineralBudget: 2000,
  factionRecordKey: 'tactical_cards:' + faction, tacticalCardRecordKeys: cards.map(id => 'tactical_cards:' + id),
  units: [{ unitInstanceId: sideKey === 'player1' ? 'actor' : 'target', recordKey: 'army_units:' + key,
    compositionKind: 'small', upgrades: [] }] });
const built = createOfficialReleaseRosterStateV2({ context, candidatesBySide: {
  player1: candidate('player1', 'hydralisk', 'stukov_s_forces', ['healing_pathogen']),
  player2: candidate('player2', 'goliath', 'terran_armed_forces', ['armory']) },
  canonicalResourceTypes: true, sourceDefinitionIds, characteristicDefinitionIds: [detection],
  unitLifecycleDefinitionIds: [hostile], structureDefinitionIds: [structure], battlefieldModifierDefinitionIds: [creep],
  includeAbilitySourcePhases: true, includeDetectionHiddenLoss: true,
  includeCharacteristicConsumers: true, includeHiddenRangedAndEvade: true,
  attackProfileRecordKeys: ['army_units:hydralisk', 'army_units:goliath'] });
const state = { ...built.state, round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1',
  engagementScale: 'Standard', armyBuildingEngagementScale: 'Standard',
  phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } },
  board: structuredClone(inputs.seed.state.board), log: [] };
state.officialModelGapTransitPolicy = structuredClone(OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13);
state.board.terrain = state.board.terrain.slice(0, 1);
state.board.accessPoints = [];
for (const piece of state.pieces) {
  Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'deployed', leadingModelId: piece.models[0].id });
  piece.models.forEach((model, i) => Object.assign(model, { isOnField: true,
    xInches: (piece.sideKey === 'player1' ? 10 : 29) + i * (model.baseWidthInches + 0.05),
    yInches: 10, elevation: 'ground_level' }));
}
declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'hostile-image-estimate' });
assert.deepEqual(state.officialUnadmittedGeneratedWeaponRecords, [turret]);
const runtimeFor = () => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds: [detection], sourceDefinitionIds });
const runtime = runtimeFor();
assert.ok(runtime.descriptor.executableRuleAtomIds.includes(inputs.lifecycle.routes[0].spawnRoundAbilityLockPolicy.ruleAtomId));
const manifest = createOfficialReleaseManifestV2({ releaseId: context.manifest.releaseId, dataset, snapshot: inputs.snapshot,
  sourceRevision: await inputs.read(context.manifest.source.sourceRevisionRef),
  datasetRef: context.manifest.source.datasetRef, snapshotRef: context.manifest.source.snapshotRef,
  sourceRevisionRef: context.manifest.source.sourceRevisionRef, sourcePolicy: context.manifest.source.policy,
  referenceSources: context.manifest.source.references, components: { ...context.manifest.components,
    rulesRuntime: { ref: 'component-runtime/' + runtime.descriptor.runtimeHash, version: runtime.descriptor.runtimeVersion,
      integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } });
const boundContext = { ...context, manifest };
const authority = createWave3ComponentEngineeringAuthorityV1({ context: boundContext, state,
  scenario: { kind: 'hostile_incubation_image_estimate_component', positions: 'declared conditional positions',
    baseEstimateHash: estimate.estimateHash, estimatedRoundBaseMillimetres: 80, uncertaintyMillimetres: estimate.uncertaintyMillimetres,
    officialPhysicalAuthority: false, unadmittedGeneratedWeaponRecords: [turret], fullMatchAdmission: false } });
await save(runRef + '/authority.json', authority);
const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
  rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context: boundContext, runtime: runtimeFor() }) });
const roomId = 'wave4-hostile-image-estimate';
let native = open();
let expected;
let proof;
try {
  const credentials = await native.create(roomId, authority);
  const before = await native.store.loadRoom(roomId);
  const menu = runtime.enumerate(before.envelope.state);
  const domain = menu.parameterDomains.find(row => row.definitionId === hostile && row.pieceId === 'actor');
  assert.ok(domain, 'HOSTILE_DOMAIN_MISSING:' + JSON.stringify(menu.parameterDomains));
  const parameters = Object.fromEntries(domain.parameterSchema.required.filter(key => key !== 'coordinate').map(key => {
    const p = domain.parameterSchema[key];
    return [key, Object.hasOwn(p, 'const') ? p.const : p.enum[0]];
  }));
  const signedMenu = await native.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
  assert.equal(signedMenu.ok, true);
  // Both Goliath and this conditional turret footprint are 3.150 inches wide.
  const exactTen = await native.room.previewAction({ roomId, seatToken: credentials.player1.seatToken,
    proposal: { kind: 'parameterized', domainId: domain.domainId,
      parameters: { ...parameters, coordinate: { xMilliInches: 15850, yMilliInches: 10000 } } },
    expectedStateRevision: before.stateRevision, expectedStateHash: before.envelope.stateHash,
    expectedMatchBindingHash: before.envelope.matchBindingHash, expectedLegalSpaceHash: signedMenu.legalSpace.legalSpaceHash });
  assert.equal(exactTen.ok, false, 'EXACT_TEN_MUST_FAIL');
  assert.match(JSON.stringify(exactTen), /UNIT_LIFECYCLE_ENEMY_SEPARATION_REQUIRED/u);
  assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash, before.envelope.stateHash);
  const committed = await native.commit({ roomId, credential: credentials.player1, operationKey: 'hostile-incubation-set',
    select: row => row.domainId === domain.domainId,
    parameters: () => ({ ...parameters, coordinate: { xMilliInches: 14500, yMilliInches: 10000 } }) });
  assert.equal(committed.idempotentReplayVerified, true);
  expected = await native.store.loadRoom(roomId);
  const placed = expected.envelope.state.pieces.find(piece => piece.officialUnitRecordKey === turret);
  assert.ok(placed?.isOnField);
  assert.equal(placed.models.length, 1);
  assert.equal(placed.currentSupply, 0);
  assert.equal(placed.sizeCharacteristic, 3);
  assert.equal(placed.isStructure, true);
  assert.equal(Boolean(placed.isSummoned), false);
  assert.equal(placed.specialDeployment, true);
  assert.equal(placed.officialSpawnRoundAbilityLock.spawnRound, 1);
  for (const name of ['Detection', 'Source of Creep', 'Infestation', 'Firefly Missiles', 'Ocular Overwatch']) {
    assert.equal(allowsOfficialSpawnRoundSpecialAbilityV1(expected.envelope.state, placed, name), false);
  }
  assert.equal(allowsOfficialSpawnRoundSpecialAbilityV1(expected.envelope.state, placed, 'Structure'), true);
  const structureQuery = createOfficialStructureFamilyAdapterV1(expected.envelope.state.officialStructureSourceBundle)
    .query(expected.envelope.state, { pieceId: placed.id });
  assert.equal(structureQuery.constraints.activationProhibited, true);
  assert.equal(structureQuery.constraints.missionControlProhibited, true);
  assert.ok(!runtime.enumerate(expected.envelope.state).parameterDomains.some(row => row.definitionId === hostile));
  const freshActorWithTurret = structuredClone(before.envelope.state);
  freshActorWithTurret.pieces.push(structuredClone(placed));
  assert.ok(!runtime.enumerate(freshActorWithTurret).parameterDomains.some(row => row.definitionId === hostile),
    'FRIENDLY_TURRET_MUST_BLOCK_UNUSED_HOSTILE_INCUBATION');
  // Query-only counterfactuals exercise consumers at each round value. They do
  // not claim a native R1-to-R2 transition and never replace the signed state.
  const auraQueries = [];
  for (const round of [1, 2]) {
    const queryState = structuredClone(expected.envelope.state);
    queryState.round = round;
    const target = queryState.pieces.find(piece => piece.id === 'target');
    target.models[0].xInches = 24; // 6.35-inch edge gap: proves the new 8-inch radius.
    target.statuses = ['Hidden'];
    const detectionProjection = projectOfficialCharacteristicStatusFamilyModifiersV1(
      queryState.officialCharacteristicStatusFamilySourceBundle, queryState, { pieceId: 'target' });
    assert.equal(detectionProjection.hiddenSuppressedByDetection, round === 2);
    const creepProjection = projectOfficialBattlefieldAssetFamilyModifiersV1(
      queryState.officialBattlefieldAssetFamilySourceBundle, queryState, { pieceId: 'actor' });
    assert.equal(creepProjection.onCreep, round === 2);
    const hiddenLoss = consumeOfficialDetectionHiddenStatusesV1(queryState.officialCharacteristicStatusFamilySourceBundle, queryState);
    assert.equal(hiddenLoss.events.some(event => event.type === 'detection_hidden_lost'), round === 2);
    auraQueries.push({ round, detectionAtEdgeGap6350: detectionProjection.hiddenSuppressedByDetection,
      onCreep: creepProjection.onCreep, hiddenRemoved: hiddenLoss.events.length > 0 });
  }
  proof = { sourceDefinitionIds, signedActions: expected.stateRevision, stateHash: expected.envelope.stateHash,
    createdPieceId: placed.id, lockHash: placed.officialSpawnRoundAbilityLock.lockHash,
    runtimeHash: runtime.descriptor.runtimeHash, structureQueryReceiptHash: structureQuery.queryReceiptHash,
    exactTenRejected: true, rejection: { reason: exactTen.reason,
      ruleError: JSON.stringify(exactTen).match(/UNIT_LIFECYCLE_ENEMY_SEPARATION_REQUIRED/u)[0] },
    duplicateFriendlyTurretRejected: true, auraQueryCounterfactuals: auraQueries, idempotencyVerified: true, coldReplay: false };
} finally { native.close(); }
native = open();
try {
  await native.restoreDependencies(roomId, authority);
  const bundle = await native.store.loadReplayBundle(roomId);
  const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.envelope, expected.envelope);
  assert.deepEqual((await native.store.loadRoom(roomId)).envelope, expected.envelope);
  proof.coldReplay = true;
} finally { native.close(); }
const result = { schema: 'starcraft_tmg_wave4_hostile_native_image_estimate_verification_v1',
  status: 'passed_conditional_geometry', runRef, candidateManifestHash: manifest.manifestHash,
  baseEstimateHash: estimate.estimateHash, estimatedRoundBaseMillimetres: 80,
  uncertaintyMillimetres: estimate.uncertaintyMillimetres, officialPhysicalAuthority: false,
  nativePlacementVerified: true, nativeRoundTransitionVerified: false, proof,
  formalStandardAndSkirmishAdmissionRejected: true, implicitEstimatedGeometryAdmissionRejected: true,
  implementedNewGameAtoms: 3, nativeVerifiedWithConfirmedGeometry: 2, nativeVerifiedWithEstimatedGeometry: 1,
  sourceHeldDefinitions: 39, unadmittedGeneratedWeaponRecords: [turret],
  turretFullGameplayVerified: false, fullMatchAdmission: false, webAcceptance: false,
  wave3PlayerRoomsTouched: false, modelCalls: 0, trainingTruth: false };
await save(runRef + '/result.json', result);
await save('docs/development/wave4/evidence/hostile-native-estimate.public.json', result);
console.log(JSON.stringify({ status: result.status, runRef, signedActions: proof.signedActions,
  idempotencyVerified: true, coldReplay: proof.coldReplay, fullMatchAdmission: false }));
