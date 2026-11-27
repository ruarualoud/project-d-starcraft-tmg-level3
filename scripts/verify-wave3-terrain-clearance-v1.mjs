import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1, createOfficialStandard2000BalancedTerrainPlanV1 } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { prepareOfficialCurrentProductFirstRoundV1 } from '../packages/product-composition/official-first-round-setup-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createOfficialCurrentProductMatchRuntimeV7 } from '../packages/product-composition/official-current-product-match-runtime-v7.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 as faqReactionPolicy } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { OFFICIAL_HIGH_GROUND_FINAL_PLACEMENT_POLICY_V13 as highGroundFinalPlacementPolicy } from '../packages/rule-atoms/official-high-ground-final-placement-policy-v13.mjs';
import { OFFICIAL_MODEL_GAP_TRANSIT_POLICY_V13 as oldGapPolicy, OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 as newGapPolicy,
  projectOfficialModelGapTransitStateV13, createOfficialGroundSizeClearanceFootprintV13 } from '../packages/rule-atoms/official-model-gap-transit-policy-v13.mjs';
import { createOfficialModelBaseFootprintV1, createOfficialPhysicalFootprintV1,
  evaluateOfficialSweptPhysicalFootprintCollisionV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { queryOfficialSelectedRosterSpatialActionV1 } from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-geometry-20261112-v1/terrain-clearance');
await fs.mkdir(directory, { recursive: true });
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const [dataset, snapshot] = await Promise.all(['legacy-dataset.json', 'legacy-snapshot.json']
  .map(name => fs.readFile(path.join(sourceDirectory, name), 'utf8').then(JSON.parse)));
const actorId = 'player1-goliath-1';
function makeAuthority(gap) {
  const terrainPlan = createOfficialStandard2000BalancedTerrainPlanV1();
  for (const [id, xMin, xMax] of [['std-ordinary-west', 40, 45 - gap / 2000],
    ['std-ordinary-east', 45 + gap / 2000, 50]]) {
    const wall = terrainPlan.terrainPieces.find(row => row.terrainPieceId === id);
    wall.footprint = { xMin, xMax, yMin: 17, yMax: 19 };
    wall.originalFootprint = structuredClone(wall.footprint);
  }
  const source = createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot, terrainPlan });
  const state = prepareOfficialCurrentProductFirstRoundV1(source.state);
  const left = state.board.terrain.find(row => row.id === 'std-ordinary-west');
  const right = state.board.terrain.find(row => row.id === 'std-ordinary-east');
  assert.equal(right.footprint.minXMilliInches - left.footprint.maxXMilliInches, gap);
  const actor = state.pieces.find(row => row.id === actorId);
  assert.equal(actor.sizeCharacteristic, 3);
  assert.equal(dataset.recordsByKey[actor.officialUnitRecordKey].payload.stats.speed, '7');
  Object.assign(actor, { isOnField: true, isInReserves: false, xInches: 45, yInches: 15 });
  Object.assign(actor.models[0], { isOnField: true, xInches: 45, yInches: 15,
    elevation: 'ground', supportTerrainIds: [] });
  const { receiptHash: ignored, ...sourceBody } = source;
  const body = { ...sourceBody, state, setupId: `t28-conditional-terrain-gap-${gap}` };
  return { ...body, receiptHash: hashStarcraftTmgContract(body) };
}
const authority = makeAuthority(3050);
const native = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(authority.state) }) });
const previous = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: native,
  faqReactionPolicy, highGroundFinalPlacementPolicy, modelGapTransitPolicy: oldGapPolicy });
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
function parameters(domain) {
  return { leadingModelId: domain.constraints.modelProfiles[0].modelId,
    path: [{ xMilliInches: 45000, yMilliInches: 21000, elevation: 'ground', supportTerrainIds: [] }], placements: [] };
}
async function setup(product, roomId, initial = authority) {
  const credentials = await product.create(roomId, initial);
  await product.commit({ roomId, credential: credentials.player1, kind: 'finite', operationKey: 'round-start',
    select: item => item.action.actionType === 'resolve_mission_start_of_round' });
  await product.commit({ roomId, credential: credentials.player1, kind: 'finite', operationKey: 'first-actor',
    select: item => item.action.actionType === 'choose_first_actor' && item.action.chosenFirstActorSideKey === 'player1' });
  const aggregate = await product.store.loadRoom(roomId);
  const legal = await product.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
  assert.equal(legal.ok, true);
  const domain = legal.legalSpace.parameterDomains.find(row => row.pieceId === actorId && row.actionType === 'move');
  assert(domain);
  return { credentials, aggregate, domain };
}
function query(current, domain, input) {
  return queryOfficialSelectedRosterSpatialActionV1({ state: current,
    request: { queryKind: 'legal_full_path_movement', sideKey: 'player1',
      domainId: domain.sourceDomain.domainId, parameters: input } });
}
function domainFor(runtime, current) {
  const domain = runtime.enumerate(current, { sideKey: 'player1' }).parameterDomains
    .find(row => row.pieceId === actorId && row.actionType === 'move');
  assert(domain);
  return domain;
}
if (process.argv.includes('--baseline')) {
  const product = openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: previous });
  try {
    const current = await setup(product, 'terrain-gap-previous');
    let error;
    try { query(current.aggregate.envelope.state, current.domain, parameters(current.domain)); }
    catch (caught) { error = caught.message; }
    assert.match(error || '', /SELECTED_SPATIAL_TERRAIN_PATH_BLOCKED/);
    await save('red.json', { error, actualGapMilliInches: 3050, goliathBaseMilliInches: 3150,
      sourceSize: 3, requiredClearanceMilliInches: 3000, pathDistanceMilliInches: 6000,
      actualSpeedAllowanceMilliInches: current.domain.constraints.maxDistanceMilliInches,
      oldRuntime: previous.descriptor, revision: current.aggregate.stateRevision,
      proofScope: 'actual_factory_editable_terrain_conditional_room', providerCalls: 0 });
    await save('authority.json', authority);
    console.log(JSON.stringify({ status: 'red_reproduced', directory }));
  } finally { product.close(); }
} else {
  let narrowSetupError;
  try { makeAuthority(2950); } catch (error) { narrowSetupError = error.message; }
  // The real setup audit already requires three inches between major pieces.
  // Preserve that rejection, then test the shared threshold as geometry only.
  assert.match(narrowSetupError || '', /BALANCED_TERRAIN_MAJOR_SEPARATION_FAILED/);
  const candidate = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: native,
    faqReactionPolicy, highGroundFinalPlacementPolicy, modelGapTransitPolicy: newGapPolicy });
  const roomId = 'terrain-gap-corrected';
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'candidate.sqlite', rulesRuntime: candidate });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-geometry-20261112-v1/terrain-clearance/red.json', contractVersion: 'T28-W3-ground-size-terrain-clearance-v1' },
    steps: [
      { name: 'read', openProduct: () => openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: previous }),
        check: async product => {
          await product.restoreDependencies('terrain-gap-previous', authority);
          const red = JSON.parse(await fs.readFile(path.join(directory, 'red.json'), 'utf8'));
          assert.equal(previous.descriptor.runtimeHash, red.oldRuntime.runtimeHash);
          assert.equal((await product.room.replayRoom({ roomId: 'terrain-gap-previous' })).matchesCurrent, true);
          const evidenceRef = await save('legacy.json', { originalV18DescriptorAndReceiptsPreserved: true, providerCalls: 0 });
          return { evidenceRef, checkpointRef: path.join(directory, 'baseline.sqlite') };
        } },
      { name: 'compile', openProduct: open, check: async () => {
        const actor = authority.state.pieces.find(row => row.id === actorId);
        const actual = createOfficialModelBaseFootprintV1({ piece: actor, model: actor.models[0],
          dataBundle: authority.state.officialModelBaseGeometryDataBundle });
        const clearance = createOfficialGroundSizeClearanceFootprintV13(actor, actual);
        assert.equal(actual.widthMilliInches, 3150);
        assert.equal(clearance.widthMilliInches, 3000);
        assert.equal(clearance.kind, 'movement_clearance');
        const end = createOfficialGroundSizeClearanceFootprintV13(actor,
          createOfficialModelBaseFootprintV1({ piece: actor, model: actor.models[0],
            dataBundle: authority.state.officialModelBaseGeometryDataBundle,
            position: { xMilliInches: 45000, yMilliInches: 21000, rotationDegrees: 0 } }));
        for (const x of [41775, 48225]) {
          const wall = createOfficialPhysicalFootprintV1({ objectId: `narrow-probe-${x}`, kind: 'terrain', shape: 'rectangle',
            center: { xMilliInches: x, yMilliInches: 18000 }, widthMilliInches: 3500, depthMilliInches: 2000, rotationDegrees: 0 });
          assert.equal(evaluateOfficialSweptPhysicalFootprintCollisionV1({
            movingStart: clearance, movingEnd: end, blocker: wall }).collides, true);
        }
        const marine = authority.state.pieces.find(row => row.id === 'player1-marine-1');
        assert.equal(createOfficialGroundSizeClearanceFootprintV13(marine, actual).widthMilliInches, 1000);
        assert.throws(() => projectOfficialModelGapTransitStateV13({ officialModelGapTransitPolicy: oldGapPolicy }, newGapPolicy),
          /POLICY_VERSION_BINDING_MISMATCH/);
        assert.throws(() => projectOfficialModelGapTransitStateV13({ officialModelGapTransitPolicy: newGapPolicy }, oldGapPolicy),
          /POLICY_VERSION_BINDING_MISMATCH/);
        assert.equal(candidate.descriptor.runtimeVersion, '1.9.0');
        const evidenceRef = await save('compile.json', { actualBaseMilliInches: 3150,
          largeClearanceMilliInches: 3000, smallSourceSizeClearanceMilliInches: 1000,
          clearanceEngineeringRepresentation: 'official_width_as_equal_diameter_round_sweep',
          tooNarrowMajorTerrainRejectedByActualFactory: narrowSetupError,
          declared2950GapSharedGeometryProbeRejected: true,
          crossVersionProjectionRejectedBothWays: true, runtime: candidate.descriptor, providerCalls: 0 });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'consume', openProduct: open,
        repairRef: 'fixture-use-native-final-terrain-support-rejection-20261113', check: async product => {
        const current = await setup(product, roomId);
        const input = parameters(current.domain);
        assert.equal(current.domain.constraints.groundMovementClearance.diameterMilliInches, 3000);
        assert(!current.domain.parameterSchema.optional.includes('gapMouths'));
        assert(!current.domain.parameterSchema.optional.includes('coherencyGapMouths'));
        const beforeHash = current.aggregate.envelope.stateHash;
        const queried = query(current.aggregate.envelope.state, current.domain, input);
        assert.equal(queried.ok, true);
        const stopsInside = structuredClone(input);
        stopsInside.path[0].yMilliInches = 18000;
        assert.throws(() => query(current.aggregate.envelope.state, current.domain, stopsInside),
          /SELECTED_SPATIAL_TERRAIN_ENDPOINT_UNSUPPORTED:std-ordinary-east/);
        const entersWall = structuredClone(input);
        entersWall.path = [
          { xMilliInches: 45000, yMilliInches: 18000, elevation: 'ground', supportTerrainIds: [] },
          { xMilliInches: 43400, yMilliInches: 18000, elevation: 'ground', supportTerrainIds: [] },
          { xMilliInches: 45000, yMilliInches: 19700, elevation: 'ground', supportTerrainIds: [] },
        ];
        assert.throws(() => query(current.aggregate.envelope.state, current.domain, entersWall),
          /SELECTED_SPATIAL_TERRAIN_PATH_BLOCKED/);
        const edgeState = structuredClone(current.aggregate.envelope.state);
        const edgeActor = edgeState.pieces.find(row => row.id === actorId);
        edgeActor.xInches = 2;
        edgeActor.models[0].xInches = 2;
        const edgeInput = parameters(domainFor(candidate, edgeState));
        edgeInput.path[0].xMilliInches = 1000;
        edgeInput.path[0].yMilliInches = 15000;
        assert.throws(() => query(edgeState, domainFor(candidate, edgeState), edgeInput),
          /FULL_BASE_OUTSIDE_BATTLEFIELD/);
        // Two cells with an exactly equal union form a representation probe.
        // This is not a newly certified published map or a Native transition.
        const split = structuredClone(current.aggregate.envelope.state);
        const wall = split.board.terrain.find(row => row.id === 'std-ordinary-west');
        wall.footprintCells = [{ ...wall.footprint, maxYMilliInches: 18000 },
          { ...wall.footprint, minYMilliInches: 18000 }];
        assert.equal(query(split, domainFor(candidate, split), input).ok, true);
        assert.equal((await product.store.loadRoom(roomId)).envelope.stateHash, beforeHash);
        const committed = await product.commit({ roomId, credential: current.credentials.player1,
          operationKey: 'goliath-through-terrain', select: row => row.pieceId === actorId && row.actionType === 'move', parameters });
        if (committed.preview) assert.equal(committed.preview.core.action.sourceAction.spatialPlan.planHash,
          queried.result.action.spatialPlan.planHash);
        const aggregate = await product.store.loadRoom(roomId);
        const moved = aggregate.envelope.state.pieces.find(row => row.id === actorId);
        assert.equal(moved.models[0].xInches, 45);
        assert.equal(moved.models[0].yInches, 21);
        const evidenceRef = await save('consume.json', { actualCertifiedEditableTerrainGapMilliInches: 3050,
          queryPreviewAndApplyAgree: true, exactEndpoint: [45, 21], revision: aggregate.stateRevision,
          belowThreeInchesRejectedByIndependentFactorySetup: narrowSetupError,
          completeBaseCannotStopInsideGap: true, enteringWallBodyRejected: true,
          fullBaseBoardEdgeRequired: true, queryReadOnly: true,
          equivalentSplitCellProbePassed: true, wholeOfficialMapAcceptance: false,
          rulesMenuSuppliesWidthAndOmitsHandwrittenProofFields: true,
          providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'successor', openProduct: open, check: async product => {
        const credentials = await product.create(roomId, authority);
        const before = await product.store.loadRoom(roomId);
        if (before.envelope.state.selectedRosterActivationWindow?.pieceId === actorId) await product.commit({
          roomId, credential: credentials.player1, operationKey: 'finish-goliath',
          select: row => row.actionType === 'finish_activation' && row.pieceId === actorId, parameters: () => ({}) });
        await product.commit({ roomId, credential: credentials.player2, kind: 'finite', operationKey: 'zerg-pass',
          select: row => row.action.actionType === 'pass' });
        const aggregate = await product.store.loadRoom(roomId);
        assert.equal(aggregate.envelope.state.activeSideKey, 'player1');
        const evidenceRef = await save('successor.json', { activationEndedAndPassApplied: true,
          revision: aggregate.stateRevision, stateHash: aggregate.envelope.stateHash, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'coldRecovery', openProduct: open, check: async product => {
        await product.restoreDependencies(roomId, authority);
        const aggregate = await product.store.loadRoom(roomId);
        const successor = JSON.parse(await fs.readFile(path.join(directory, 'successor.json'), 'utf8'));
        assert.equal(aggregate.envelope.stateHash, successor.stateHash);
        assert.deepEqual(aggregate.envelope.state.officialModelGapTransitPolicy, newGapPolicy);
        assert.equal((await product.room.replayRoom({ roomId })).matchesCurrent, true);
        const evidenceRef = await save('cold-recovery.json', { originalBindingsAndReceiptsPreserved: true,
          invalidNarrowSetupWasNotAdmittedAsRoom: true, revision: aggregate.stateRevision, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
    ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), providerCalls: 0 }));
}
