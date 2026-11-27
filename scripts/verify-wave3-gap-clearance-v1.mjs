import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1 } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { prepareOfficialCurrentProductFirstRoundV1 } from '../packages/product-composition/official-first-round-setup-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createOfficialCurrentProductMatchRuntimeV7 } from '../packages/product-composition/official-current-product-match-runtime-v7.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 as faqReactionPolicy } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { OFFICIAL_HIGH_GROUND_FINAL_PLACEMENT_POLICY_V13 as highGroundFinalPlacementPolicy } from '../packages/rule-atoms/official-high-ground-final-placement-policy-v13.mjs';
import { queryOfficialSelectedRosterSpatialActionV1 } from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import { deriveOfficialRoundModelGapMouthsV1 } from '../packages/rule-atoms/official-gap-place-geometry-kernel-v1.mjs';
import { OFFICIAL_MODEL_GAP_TRANSIT_POLICY_V13 as modelGapTransitPolicy } from '../packages/rule-atoms/official-model-gap-transit-policy-v13.mjs';
import { projectStarcraftTmgViewerStateShapeV3 } from '../packages/client-domain/viewer-projection-v3.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-geometry-20261112-v1/gap-clearance');
await fs.mkdir(directory, { recursive: true });
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const [dataset, snapshot] = await Promise.all(['legacy-dataset.json', 'legacy-snapshot.json']
  .map(name => fs.readFile(path.join(sourceDirectory, name), 'utf8').then(JSON.parse)));
const source = createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot });
const state = prepareOfficialCurrentProductFirstRoundV1(source.state);
const actorId = 'player1-goliath-1';
const actor = state.pieces.find(row => row.id === actorId);
assert.equal(dataset.recordsByKey[actor.officialUnitRecordKey].payload.stats.speed, '7');
assert.equal(actor.models.length, 1);
Object.assign(actor, { isOnField: true, isInReserves: false, xInches: 45, yInches: 10 });
Object.assign(actor.models[0], { isOnField: true, xInches: 45, yInches: 10,
  elevation: 'ground', supportTerrainIds: [] });
const offsets = [[0, 0], [-1300, -1300], [-2600, -1300], [-1300, 0], [-2600, 0],
  [-1300, 1300], [-2600, 1300], [-1300, -2600], [-1300, 2600]];
for (const [id, x, direction] of [['player1-marine-1', 42.845, 1], ['player1-marine-2', 47.155, -1]]) {
  const piece = state.pieces.find(row => row.id === id);
  assert.equal(piece.models.length, offsets.length);
  Object.assign(piece, { isOnField: true, isInReserves: false, xInches: x, yInches: 12 });
  piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
    xInches: x + direction * offsets[index][0] / 1000, yInches: 12 + offsets[index][1] / 1000,
    elevation: 'ground', supportTerrainIds: [] }));
}
const { receiptHash: ignored, ...sourceBody } = source;
const body = { ...sourceBody, state, setupId: 't28-large-model-gap-conditional' };
const authority = { ...body, receiptHash: hashStarcraftTmgContract(body) };
const native = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(state) }) });
const previous = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: native,
  faqReactionPolicy, highGroundFinalPlacementPolicy });
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
async function setup(product, roomId) {
  const credentials = await product.create(roomId, authority);
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
function parameters(domain) {
  const ids = domain.constraints.modelProfiles.map(row => row.modelId);
  return { leadingModelId: ids[0],
    path: [{ xMilliInches: 45000, yMilliInches: 14000, elevation: 'ground', supportTerrainIds: [] }],
    placements: [] };
}
function query(current, domain, input) {
  return queryOfficialSelectedRosterSpatialActionV1({ state: current,
    request: { queryKind: 'legal_full_path_movement', sideKey: 'player1',
      domainId: domain.sourceDomain.domainId, parameters: input } });
}
function domainFor(runtime, current) {
  const domain = runtime.enumerate(current, { sideKey: 'player1' }).parameterDomains
    .find(row => row.pieceId === actorId && row.actionType === 'move');
  assert(domain, 'current actor Move domain required');
  return domain;
}
function shiftRightBoundary(current, inches) {
  const copy = structuredClone(current);
  const right = copy.pieces.find(row => row.id === 'player1-marine-2');
  right.xInches += inches;
  right.models.forEach(model => { model.xInches += inches; });
  return copy;
}
if (process.argv.includes('--baseline')) {
  const product = openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: previous });
  try {
    const current = await setup(product, 'gap-large-previous');
    const input = parameters(current.domain);
    let error;
    try { query(current.aggregate.envelope.state, current.domain, input); } catch (caught) { error = caught.message; }
    assert.match(error || '', /SELECTED_SPATIAL_PATH_MODEL_COLLISION/);
    await save('red.json', { reproduced: 'size_three_model_rejected_at_valid_three_point_zero_five_inch_gap', error,
      sourceCoreSection: '4.6', sourceFaq: 'faq-v1.3:6',
      independentGeometry: { marineCentreGapMilliInches: 4310, marineDiameterMilliInches: 1260,
        actualGapMilliInches: 3050, largeSizeRequiredGapMilliInches: 3000,
        goliathDiameterMilliInches: 3150, fullLeadingPathMilliInches: 4000 },
      actualSizeCharacteristic: actor.sizeCharacteristic, actualMoveAllowanceMilliInches: current.domain.constraints.maxDistanceMilliInches,
      domain: current.domain, input, oldRuntime: previous.descriptor, revision: current.aggregate.stateRevision, providerCalls: 0 });
    await save('authority.json', authority);
    console.log(JSON.stringify({ status: 'red_reproduced', directory }));
  } finally { product.close(); }
} else {
  const candidate = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: native,
    faqReactionPolicy, highGroundFinalPlacementPolicy, modelGapTransitPolicy });
  const roomId = 'gap-large-corrected';
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'candidate.sqlite', rulesRuntime: candidate });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-geometry-20261112-v1/gap-clearance/red.json', contractVersion: 'T28-W3-round-model-gap-transit-v1' },
    steps: [
      { name: 'read', openProduct: () => openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: previous }),
        check: async product => {
          await product.restoreDependencies('gap-large-previous', authority);
          const red = JSON.parse(await fs.readFile(path.join(directory, 'red.json'), 'utf8'));
          assert.equal(previous.descriptor.runtimeHash, red.oldRuntime.runtimeHash);
          assert.equal((await product.room.replayRoom({ roomId: 'gap-large-previous' })).matchesCurrent, true);
          const evidenceRef = await save('legacy.json', { originalDescriptorAndReceiptsPreserved: true, providerCalls: 0 });
          return { evidenceRef, checkpointRef: path.join(directory, 'baseline.sqlite') };
        } },
      { name: 'compile', openProduct: open, check: async () => {
        const path = [{ xMilliInches: 45000, yMilliInches: 10000 }, { xMilliInches: 45000, yMilliInches: 14000 }];
        const boundaryModelIds = ['player1-marine-1-model-1', 'player1-marine-2-model-1'];
        const gaps = deriveOfficialRoundModelGapMouthsV1({ state, actor, path, boundaryModelIds });
        assert.equal(gaps.length, 1);
        assert.equal(gaps[0].widthMilliInches, 3050);
        assert.equal(gaps[0].requiredWidthMilliInches, 3000);
        const smallScene = shiftRightBoundary(state, -2);
        const smallActor = structuredClone(state.pieces.find(row => row.id === 'player1-marine-3'));
        smallActor.isOnField = true;
        smallActor.isInReserves = false;
        assert.equal(smallActor.sizeCharacteristic, 2);
        const smallPath = [{ xMilliInches: 44000, yMilliInches: 10000 }, { xMilliInches: 44000, yMilliInches: 14000 }];
        const small = deriveOfficialRoundModelGapMouthsV1({ state: smallScene, actor: smallActor,
          path: smallPath, boundaryModelIds });
        assert.equal(small.length, 1);
        assert.equal(small[0].widthMilliInches, 1050);
        assert.equal(small[0].requiredWidthMilliInches, 1000);
        assert.equal(deriveOfficialRoundModelGapMouthsV1({ state: smallScene, actor,
          path: smallPath, boundaryModelIds }).length, 0);
        assert.equal(deriveOfficialRoundModelGapMouthsV1({ state: shiftRightBoundary(smallScene, -0.1), actor: smallActor,
          path: smallPath, boundaryModelIds }).length, 0);
        assert.equal(candidate.descriptor.runtimeVersion, '1.8.0');
        const evidenceRef = await save('compile.json', { largeGap: gaps[0],
          smallGeometryProbe: { scope: 'declared_actor_presence_geometry_only', certificate: small[0] },
          actualLargeActorSize: actor.sizeCharacteristic, largeRejectedAtSmallGap: true,
          smallRejectedBelowOneInch: true, runtime: candidate.descriptor, providerCalls: 0 });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'consume', openProduct: open, check: async product => {
        const current = await setup(product, roomId);
        const input = parameters(current.domain);
        const beforeHash = current.aggregate.envelope.stateHash;
        const queried = query(current.aggregate.envelope.state, current.domain, input);
        const gaps = queried.result.action.spatialPlan.hostDerivedModelGapCertificates;
        assert.equal(gaps.length, 1);
        assert.equal(gaps[0].widthMilliInches, 3050);
        const narrow = shiftRightBoundary(current.aggregate.envelope.state, -0.1);
        assert.throws(() => query(narrow, domainFor(candidate, narrow), input), /SELECTED_SPATIAL_PATH_MODEL_COLLISION/);
        const stopsInside = structuredClone(input);
        stopsInside.path[0].yMilliInches = 12000;
        assert.throws(() => query(current.aggregate.envelope.state, current.domain, stopsInside), /MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP/);
        const entersBody = structuredClone(input);
        entersBody.path = [
          { xMilliInches: 45000, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [] },
          { xMilliInches: 42845, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [] },
          { xMilliInches: 45000, yMilliInches: 13800, elevation: 'ground', supportTerrainIds: [] },
        ];
        assert.throws(() => query(current.aggregate.envelope.state, current.domain, entersBody), /SELECTED_SPATIAL_PATH_MODEL_COLLISION/);
        const outside = structuredClone(input);
        outside.path[0].xMilliInches = 1000;
        outside.path[0].yMilliInches = 10000;
        // A short board-edge witness isolates full-base board fit from speed.
        const edgeState = structuredClone(current.aggregate.envelope.state);
        const edgeActor = edgeState.pieces.find(row => row.id === actorId);
        edgeActor.xInches = 2;
        edgeActor.yInches = 10;
        Object.assign(edgeActor.models[0], { xInches: 2, yInches: 10 });
        assert.throws(() => query(edgeState, domainFor(candidate, edgeState), outside), /FULL_BASE_OUTSIDE_BATTLEFIELD/);
        assert.equal((await product.store.loadRoom(roomId)).envelope.stateHash, beforeHash);
        const read = await product.room.readRoom({ roomId, seatToken: current.credentials.player1.seatToken });
        assert.deepEqual(projectStarcraftTmgViewerStateShapeV3(read.projection.state).officialModelGapTransitPolicy, modelGapTransitPolicy);
        const committed = await product.commit({ roomId, credential: current.credentials.player1,
          operationKey: 'large-model-through-gap', select: row => row.pieceId === actorId && row.actionType === 'move', parameters });
        if (committed.preview) assert.equal(committed.preview.core.action.sourceAction.spatialPlan.planHash,
          queried.result.action.spatialPlan.planHash);
        const aggregate = await product.store.loadRoom(roomId);
        const moved = aggregate.envelope.state.pieces.find(row => row.id === actorId);
        assert.equal(moved.models[0].xInches, 45);
        assert.equal(moved.models[0].yInches, 14);
        const evidenceRef = await save('consume.json', { runtime: '1.8.0', hostConstructedMouth: gaps[0],
          inputRequiredNoGapWidthOrCertificate: true, actualMoveApplied: true, queryAndPreviewPlanEqual: true,
          revision: aggregate.stateRevision, exactEndpoint: [45, 14],
          belowThreeInchesRejected: true, fullBaseStoppingFitRequired: true,
          mouthDoesNotAuthorizeEnteringBoundaryBody: true, fullBaseBoardFitRequired: true,
          queryReadOnly: true, publicPolicyPreserved: true, providerCalls: 0 });
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
        assert.deepEqual(aggregate.envelope.state.officialModelGapTransitPolicy, modelGapTransitPolicy);
        assert.equal((await product.room.replayRoom({ roomId })).matchesCurrent, true);
        const evidenceRef = await save('cold-recovery.json', { bindingAndOriginalReceiptsPreserved: true,
          revision: aggregate.stateRevision, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
    ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), providerCalls: 0 }));
}
