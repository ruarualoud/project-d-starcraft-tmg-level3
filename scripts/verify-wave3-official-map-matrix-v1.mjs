import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1 } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialSkirmish500RoomInitialStateAuthorityV1 } from '../packages/product-composition/official-skirmish-500-room-factory-v1.mjs';
import { createOfficialPremadeMapConfiguratorV1 } from '../packages/product-composition/official-premade-map-configurator-v1.mjs';
import { prepareOfficialCurrentProductFirstRoundV1 } from '../packages/product-composition/official-first-round-setup-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1, createOfficialCurrentProductScaledMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createOfficialCurrentProductMatchRuntimeV7 } from '../packages/product-composition/official-current-product-match-runtime-v7.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 as faqReactionPolicy } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { OFFICIAL_HIGH_GROUND_FINAL_PLACEMENT_POLICY_V13 as highGroundFinalPlacementPolicy } from '../packages/rule-atoms/official-high-ground-final-placement-policy-v13.mjs';
import { OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 as modelGapTransitPolicy } from '../packages/rule-atoms/official-model-gap-transit-policy-v13.mjs';
import { queryOfficialSelectedRosterSpatialActionV1 } from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import { projectStarcraftTmgViewerStateShapeV3 } from '../packages/client-domain/viewer-projection-v3.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-geometry-20261112-v1/official-map-matrix');
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const [dataset, snapshot] = await Promise.all(['legacy-dataset.json', 'legacy-snapshot.json']
  .map(name => fs.readFile(path.join(sourceDirectory, name), 'utf8').then(JSON.parse)));
const configurator = createOfficialPremadeMapConfiguratorV1();
const maps = configurator.readMaps();
assert.equal(maps.length, 9);
await fs.mkdir(directory, { recursive: true });
const save = async (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');

function terrainRectangles(state) {
  return state.board.terrain.filter(row => !row.isRemoved && !row.isDestroyed && row.terrainKind !== 'grass')
    .flatMap(terrain => (terrain.footprintCells || [terrain.footprint]).map(footprint => {
      assert.equal(footprint.shape, 'axis_aligned_rectangle');
      return { terrain, minX: footprint.minXMilliInches / 1000, maxX: footprint.maxXMilliInches / 1000,
        minY: footprint.minYMilliInches / 1000, maxY: footprint.maxYMilliInches / 1000 };
    }));
}
function chooseConditionalWitness(state, actor) {
  assert.equal(actor.models.length, 1);
  const model = actor.models[0];
  assert.equal(model.baseShape, 'round');
  const radius = Math.max(model.baseWidthInches / 2, actor.sizeCharacteristic <= 2 ? 0.5 : 1.5) + 0.02;
  const speed = Number(dataset.recordsByKey[actor.officialUnitRecordKey].payload.stats.speed.split('/').at(-1));
  assert(Number.isFinite(speed) && speed > 1);
  const rectangles = terrainRectangles(state);
  const width = state.board.widthInches;
  const height = state.board.heightInches;
  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      for (const [dx, dy] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
        const end = { x: x + dx, y: y + dy };
        const corridor = { minX: Math.min(x, end.x) - radius, maxX: Math.max(x, end.x) + radius,
          minY: Math.min(y, end.y) - radius, maxY: Math.max(y, end.y) + radius };
        if (corridor.minX < 0 || corridor.minY < 0 || corridor.maxX > width || corridor.maxY > height) continue;
        if (rectangles.some(rect => corridor.minX < rect.maxX && corridor.maxX > rect.minX
          && corridor.minY < rect.maxY && corridor.maxY > rect.minY)) continue;
        const blocker = rectangles.find(rect => rect.terrain.terrainKind === 'ordinary'
          && rect.terrain.size >= 2 && !rect.terrain.standableHorizontalSurface
          && Math.hypot((rect.minX + rect.maxX) / 2 - x, (rect.minY + rect.maxY) / 2 - y) <= speed - 0.05
          && (rect.minX + rect.maxX) / 2 > model.baseWidthInches / 2
          && (rect.minY + rect.maxY) / 2 > model.baseWidthInches / 2
          && (rect.minX + rect.maxX) / 2 < width - model.baseWidthInches / 2
          && (rect.minY + rect.maxY) / 2 < height - model.baseWidthInches / 2);
        if (blocker) return { start: { x, y }, end,
          blocked: { x: (blocker.minX + blocker.maxX) / 2, y: (blocker.minY + blocker.maxY) / 2 },
          blockerId: blocker.terrain.id, actualSpeedInches: speed,
          conservativeClearanceRadiusInches: radius,
          scope: 'bounded_conditional_fixture_witness_not_deployment_or_global_reachability' };
      }
    }
  }
  throw Error('BOUNDED_CONDITIONAL_FIXTURE_SEARCH_NO_WITNESS');
}
async function prepare(map, currentProduct = false) {
  const caseDirectory = path.join(directory, map.seedId);
  const currentScale = currentProduct && map.engagementScale === 'Skirmish';
  const authorityFile = currentScale ? 'authority-current-scale.json' : 'authority.json';
  const preparedFile = path.join(caseDirectory, currentScale ? 'prepared-current-scale.json' : 'prepared.json');
  try { return JSON.parse(await fs.readFile(preparedFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const preview = configurator.preview({ seedId: map.seedId });
  const recommendation = preview.recommendedTerrainSetup;
  assert.equal(recommendation.pendingSurfaceInstanceIds.length, 0);
  const roomId = 't28-map-' + map.seedId;
  const mapConfiguration = { seedId: map.seedId,
    terrainSetup: { valuesByInstance: recommendation.valuesByInstance } };
  const factory = map.engagementScale === 'Standard' ? createOfficialStandardRoomInitialStateAuthorityV1
    : createOfficialSkirmish500RoomInitialStateAuthorityV1;
  const source = factory({ dataset, snapshot, roomId, mapConfiguration,
    ...(currentScale ? { currentProductGameplayBinding: true } : {}) });
  assert.equal(source.state.engagementScale, map.engagementScale);
  assert.equal(source.state.board.widthInches, map.battlefield.widthInches);
  assert.equal(source.state.board.heightInches, map.battlefield.heightInches);
  assert.equal(source.state.officialCompetitiveMapRoomFreeze.seedId, map.seedId);
  const state = prepareOfficialCurrentProductFirstRoundV1(source.state);
  const actor = state.pieces.find(row => row.sideKey === 'player2' && row.officialUnitRecordKey === 'army_units:kerrigan');
  assert(actor);
  const witness = chooseConditionalWitness(state, actor);
  Object.assign(actor, { isOnField: true, isInReserves: false, xInches: witness.start.x, yInches: witness.start.y });
  Object.assign(actor.models[0], { isOnField: true, xInches: witness.start.x, yInches: witness.start.y,
    elevation: 'ground', supportTerrainIds: [] });
  const { receiptHash: ignored, ...sourceBody } = source;
  const body = { ...sourceBody, state, setupId: 'conditional-native-map-geometry-' + map.seedId };
  const authority = { ...body, receiptHash: hashStarcraftTmgContract(body) };
  await fs.mkdir(caseDirectory, { recursive: true });
  await atomicWrite(path.join(caseDirectory, authorityFile), JSON.stringify(authority));
  const prepared = { seedId: map.seedId, roomId, scale: map.engagementScale, authorityFile,
    board: map.battlefield, terrainRows: state.board.terrain.length,
    sourceArtHash: map.artAsset.sha256, roomFreezeHash: state.officialCompetitiveMapRoomFreeze.roomFreezeHash,
    actorId: actor.id, witness, providerCalls: 0 };
  await atomicWrite(preparedFile, JSON.stringify(prepared, null, 2) + '\n');
  return prepared;
}

async function executeMap(prepared) {
  const caseDirectory = path.join(directory, prepared.seedId);
  const authorityFile = prepared.authorityFile || 'authority.json';
  const authority = JSON.parse(await fs.readFile(path.join(caseDirectory, authorityFile), 'utf8'));
  const baseRuntime = createOfficialCurrentProductScaledMatchRuntimeV1({ dataset, state: authority.state });
  const runtime = createOfficialCurrentProductMatchRuntimeV7({
    legacyRuntime: createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime: baseRuntime }),
    faqReactionPolicy, highGroundFinalPlacementPolicy, modelGapTransitPolicy });
  const open = () => openWave3EngineeringRoomV1({ directory: caseDirectory, filename: 'room.sqlite', rulesRuntime: runtime });
  const write = async (file, value) => {
    const location = path.join(caseDirectory, file);
    await atomicWrite(location, JSON.stringify(value, null, 2) + '\n');
    return location;
  };
  const point = (position) => ({ xMilliInches: Math.round(position.x * 1000),
    yMilliInches: Math.round(position.y * 1000), elevation: 'ground', supportTerrainIds: [] });
  const parameters = (domain, position = prepared.witness.end) => ({
    leadingModelId: domain.constraints.modelProfiles[0].modelId, path: [point(position)], placements: [] });
  const query = (state, domain, input) => queryOfficialSelectedRosterSpatialActionV1({ state,
    request: { queryKind: 'legal_full_path_movement', sideKey: 'player2',
      domainId: domain.sourceDomain.domainId, parameters: input } });
  const boundary = await runProductBoundaryCheck({ directory: path.join(caseDirectory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: path.relative(root, path.join(caseDirectory, authorityFile)),
      contractVersion: 'T28-W3-official-map-native-geometry-v1' },
    steps: [
      { name: 'read', openProduct: open, check: async product => {
        await product.create(prepared.roomId, authority);
        const current = await product.store.loadRoom(prepared.roomId);
        assert.equal(current.envelope.state.engagementScale, prepared.scale);
        assert.equal(current.envelope.state.board.widthInches, prepared.board.widthInches);
        assert.equal(current.envelope.state.board.heightInches, prepared.board.heightInches);
        assert.equal(current.envelope.state.officialCompetitiveMapRoomFreeze.roomFreezeHash, prepared.roomFreezeHash);
        const evidenceRef = await write('source.json', { seedId: prepared.seedId, scale: prepared.scale,
          board: prepared.board, sourceArtHash: prepared.sourceArtHash, roomFreezeHash: prepared.roomFreezeHash,
          terrainRows: prepared.terrainRows, scope: prepared.witness.scope, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(caseDirectory, 'room.sqlite') };
      } },
      { name: 'compile', openProduct: open,
        repairRef: 'viewer-preserves-recursively-filtered-physical-terrain-cells-20261113', check: async product => {
        await product.create(prepared.roomId, authority);
        const current = (await product.store.loadRoom(prepared.roomId)).envelope.state;
        const publicState = projectStarcraftTmgViewerStateShapeV3(current);
        assert.equal(publicState.board.terrain.length, current.board.terrain.length);
        for (const terrain of current.board.terrain) {
          const projected = publicState.board.terrain.find(row => row.id === terrain.id);
          assert(projected);
          assert.deepEqual(projected.footprint, terrain.footprint);
          assert.deepEqual(projected.footprintCells ?? null, terrain.footprintCells ?? null);
          assert.equal(projected.elevation, terrain.elevation);
          assert.equal(projected.blocksPlacement, terrain.blocksPlacement);
        }
        if (prepared.seedId === 'standard-d6-1') {
          const prior = JSON.parse(await fs.readFile(path.join(directory, 'scale-admission-red.json'), 'utf8'));
          assert.equal(baseRuntime.descriptor.runtimeHash, prior.standardRuntime.runtimeHash);
        }
        if (prepared.seedId === 'skirmish-d3-1') {
          assert.equal(baseRuntime.descriptor.engagementScaleBinding.profile.scaleId, 'Skirmish');
          const wrongBoard = structuredClone(authority.state);
          wrongBoard.board.widthInches = 54;
          assert.throws(() => createOfficialCurrentProductScaledMatchRuntimeV1({ dataset, state: wrongBoard }),
            /CURRENT_PRODUCT_MATCH_RUNTIME_INPUT_INVALID/);
          const wrongAgreement = structuredClone(authority.state);
          wrongAgreement.armyBuildingEngagementScale.scale.battlefield.lengthMilliInches = 54000;
          assert.throws(() => createOfficialCurrentProductScaledMatchRuntimeV1({ dataset, state: wrongAgreement }),
            /CURRENT_PRODUCT_MATCH_SCALE_AGREEMENT_REQUIRED/);
        }
        const evidenceRef = await write('compile.json', { everyPublicTerrainFootprintMatchesRules: true,
          publicTerrainRows: publicState.board.terrain.length, sourceScaleAndBoardPreserved: true,
          sourceRuntime: baseRuntime.descriptor, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(caseDirectory, 'room.sqlite') };
      } },
      { name: 'consume', openProduct: open,
        repairRef: 'premade-empty-standable-surface-set-explicit-ground-20261113', check: async product => {
        const credentials = await product.create(prepared.roomId, authority);
        await product.commit({ roomId: prepared.roomId, credential: credentials.player1, kind: 'finite',
          operationKey: 'round-start', select: row => row.action.actionType === 'resolve_mission_start_of_round' });
        await product.commit({ roomId: prepared.roomId, credential: credentials.player1, kind: 'finite',
          operationKey: 'first-actor', select: row => row.action.actionType === 'choose_first_actor'
            && row.action.chosenFirstActorSideKey === 'player2' });
        const aggregate = await product.store.loadRoom(prepared.roomId);
        const legal = await product.room.legalSpace({ roomId: prepared.roomId, seatToken: credentials.player2.seatToken });
        assert.equal(legal.ok, true);
        const domain = legal.legalSpace.parameterDomains.find(row => row.pieceId === prepared.actorId && row.actionType === 'move');
        assert(domain, 'actual active movement menu required');
        const queried = query(aggregate.envelope.state, domain, parameters(domain));
        assert.equal(queried.ok, true);
        let rejected;
        try { query(aggregate.envelope.state, domain, parameters(domain, prepared.witness.blocked)); }
        catch (error) { rejected = error.message; }
        assert.match(rejected || '', /TERRAIN_|SURFACE_|PLACEMENT_OVERLAP/);
        assert.equal((await product.store.loadRoom(prepared.roomId)).envelope.stateHash, aggregate.envelope.stateHash);
        const applied = await product.commit({ roomId: prepared.roomId, credential: credentials.player2,
          operationKey: 'conditional-near-terrain-move', select: row => row.pieceId === prepared.actorId && row.actionType === 'move',
          parameters });
        if (applied.preview) assert.equal(applied.preview.core.action.sourceAction.spatialPlan.planHash,
          queried.result.action.spatialPlan.planHash);
        const after = await product.store.loadRoom(prepared.roomId);
        const actor = after.envelope.state.pieces.find(row => row.id === prepared.actorId);
        assert.equal(actor.models[0].xInches, prepared.witness.end.x);
        assert.equal(actor.models[0].yInches, prepared.witness.end.y);
        assert.equal(after.stateRevision, 3);
        const evidenceRef = await write('consume.json', { queryPreviewApplyAgree: true, queryReadOnly: true,
          blockerId: prepared.witness.blockerId, illegalTerrainEndpointRejected: rejected,
          conditionalStart: prepared.witness.start, actualEnd: prepared.witness.end,
          revision: after.stateRevision, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(caseDirectory, 'room.sqlite') };
      } },
      { name: 'successor', openProduct: open, check: async product => {
        const credentials = await product.create(prepared.roomId, authority);
        const before = await product.store.loadRoom(prepared.roomId);
        if (before.envelope.state.selectedRosterActivationWindow?.pieceId === prepared.actorId) {
          await product.commit({ roomId: prepared.roomId, credential: credentials.player2, operationKey: 'finish-activation',
            select: row => row.pieceId === prepared.actorId && row.actionType === 'finish_activation', parameters: () => ({}) });
        }
        await product.commit({ roomId: prepared.roomId, credential: credentials.player1, kind: 'finite',
          operationKey: 'opponent-pass', select: row => row.action.actionType === 'pass' });
        const after = await product.store.loadRoom(prepared.roomId);
        assert.equal(after.envelope.state.activeSideKey, 'player2');
        const evidenceRef = await write('successor.json', { nextActivationReached: true, revision: after.stateRevision,
          stateHash: after.envelope.stateHash, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(caseDirectory, 'room.sqlite') };
      } },
      { name: 'coldRecovery', openProduct: open, check: async product => {
        await product.restoreDependencies(prepared.roomId, authority);
        const after = await product.store.loadRoom(prepared.roomId);
        const saved = JSON.parse(await fs.readFile(path.join(caseDirectory, 'successor.json'), 'utf8'));
        assert.equal(after.envelope.stateHash, saved.stateHash);
        assert.equal((await product.room.replayRoom({ roomId: prepared.roomId })).matchesCurrent, true);
        const evidenceRef = await write('cold-recovery.json', { originalBindingAndNativeReceiptsReplayed: true,
          revision: after.stateRevision, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(caseDirectory, 'room.sqlite') };
      } },
    ] });
  return { seedId: prepared.seedId, scale: prepared.scale, status: boundary.status,
    passed: Object.keys(boundary.passed), providerCalls: 0 };
}

if (process.argv.includes('--runtime-admission-baseline')) {
  const standard = await prepare(maps.find(row => row.engagementScale === 'Standard'));
  const skirmish = await prepare(maps.find(row => row.engagementScale === 'Skirmish'));
  const readAuthority = async row => JSON.parse(await fs.readFile(path.join(directory, row.seedId, 'authority.json'), 'utf8'));
  const oldState = (await readAuthority(standard)).state;
  const smallState = (await readAuthority(skirmish)).state;
  const original = createOfficialCurrentProductMatchRuntimeV1({ dataset, state: oldState });
  assert.throws(() => createOfficialCurrentProductMatchRuntimeV1({ dataset, state: smallState }),
    /CURRENT_PRODUCT_MATCH_RUNTIME_INPUT_INVALID/);
  await save('scale-admission-red.json', { standardRuntime: original.descriptor,
    skirmishFactoryAccepted: true, currentRuntimeRejectedSkirmish: true,
    scope: 'actual_factory_inputs_constructor_boundary', providerCalls: 0 });
  console.log(JSON.stringify({ status: 'scope_gap_reproduced', standard: standard.seedId, skirmish: skirmish.seedId }));
} else if (process.argv.includes('--prepare')) {
  const result = [];
  for (const map of maps) {
    const prepared = await prepare(map);
    result.push(prepared);
    console.log(JSON.stringify({ prepared: map.seedId, scale: prepared.scale, terrainRows: prepared.terrainRows }));
  }
  await save('prepared-matrix.json', { cases: result, sourceFactoryCases: result.length, providerCalls: 0 });
 } else {
  const result = [];
  for (const map of maps) {
    const prepared = await prepare(map, true);
    const completed = await executeMap(prepared);
    result.push(completed);
    await save('product-matrix.json', { cases: result, passedMaps: result.length, registeredMaps: maps.length, providerCalls: 0 });
    console.log(JSON.stringify(completed));
  }
}

