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
import { OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 as modelGapTransitPolicy,
  OFFICIAL_MODEL_GAP_TRANSIT_POLICY_V13 as oldGapPolicy } from '../packages/rule-atoms/official-model-gap-transit-policy-v13.mjs';
import { OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 as sharedPolicy, isOfficialGroundTerrainTraversalBlockedV13 } from '../packages/rule-atoms/official-movement-clearance-contract-v13.mjs';
import { queryOfficialSelectedRosterSpatialActionV1 } from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import { createOfficialModelBaseFootprintV1, createOfficialCoherencyLinkEvaluatorV1,
  createOfficialHypotheticalCoherencyLinkEvaluatorV1, evaluateOfficialCoherencyPlacementV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-geometry-20261112-v1/terrain-coherency');
await fs.mkdir(directory, { recursive: true });
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const [dataset, snapshot] = await Promise.all(['legacy-dataset.json', 'legacy-snapshot.json']
  .map(name => fs.readFile(path.join(sourceDirectory, name), 'utf8').then(JSON.parse)));
const terrainPlan = createOfficialStandard2000BalancedTerrainPlanV1();
const wall = terrainPlan.terrainPieces.find(row => row.terrainPieceId === 'std-ordinary-east');
wall.footprint = { xMin: 43, xMax: 47, yMin: 18.4, yMax: 19.1 };
wall.originalFootprint = structuredClone(wall.footprint);
const source = createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot, terrainPlan });
const state = prepareOfficialCurrentProductFirstRoundV1(source.state);
const actorId = 'player1-medic';
const actor = state.pieces.find(row => row.id === actorId);
assert.equal(actor.models.length, 3);
assert.equal(actor.models[0].baseWidthInches, 1.26);
assert.equal(actor.sizeCharacteristic, 2);
Object.assign(actor, { isOnField: true, isInReserves: false, xInches: 45, yInches: 22 });
actor.models.forEach((model, index) => Object.assign(model, { isOnField: true,
  xInches: [45, 43.3, 46.7][index], yInches: 22, elevation: 'ground', supportTerrainIds: [] }));
const { receiptHash: ignored, ...sourceBody } = source;
const body = { ...sourceBody, state, setupId: 't28-conditional-terrain-coherency' };
const authority = { ...body, receiptHash: hashStarcraftTmgContract(body) };
const native = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(state) }) });
const runtime = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: native,
  faqReactionPolicy, highGroundFinalPlacementPolicy, modelGapTransitPolicy });
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
function parameters(domain, valid = false) {
  const ids = domain.constraints.modelProfiles.map(row => row.modelId);
  return { leadingModelId: ids[0],
    path: [{ xMilliInches: 45000, yMilliInches: 19800, elevation: 'ground', supportTerrainIds: [] }],
    placements: [
      { modelId: ids[1], xMilliInches: 45000, yMilliInches: valid ? 21100 : 17000,
        elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 },
      { modelId: ids[2], xMilliInches: 45000, yMilliInches: valid ? 22400 : 21100,
        elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 },
    ] };
}
function query(current, domain, input) {
  return queryOfficialSelectedRosterSpatialActionV1({ state: current,
    request: { queryKind: 'coherency_after_candidate_placement', sideKey: 'player1',
      domainId: domain.sourceDomain.domainId, parameters: input } });
}
function domainFor(current) {
  const domain = runtime.enumerate(current, { sideKey: 'player1' }).parameterDomains
    .find(row => row.pieceId === actorId && row.actionType === 'move');
  assert(domain);
  return domain;
}
function linkChecks(current, input) {
  const piece = current.pieces.find(row => row.id === actorId);
  const ids = piece.models.map(model => model.id);
  const footprints = [input.path.at(-1), ...input.placements].map((position, index) => (
    createOfficialModelBaseFootprintV1({ piece, model: piece.models.find(model => model.id === ids[index]),
      dataBundle: current.officialModelBaseGeometryDataBundle, position })));
  const ordinary = createOfficialCoherencyLinkEvaluatorV1({ state: current, actor: piece,
    dataBundle: current.officialModelBaseGeometryDataBundle });
  const hypothetical = createOfficialHypotheticalCoherencyLinkEvaluatorV1({ state: current, actor: piece,
    dataBundle: current.officialModelBaseGeometryDataBundle });
  return { ordinary: ordinary(footprints[0], footprints[1]),
    hypothetical: hypothetical(footprints[0], footprints[1]) };
}

function compoundProbe(current, input) {
  const declared = structuredClone(current);
  const wall = declared.board.terrain.find(row => row.id === 'std-ordinary-east');
  wall.terrainKind = 'impassable';
  wall.blocksPlacement = true;
  wall.standableHorizontalSurface = false;
  wall.size = 4;
  wall.footprint = { shape: 'axis_aligned_rectangle', minXMilliInches: 43000,
    maxXMilliInches: 47000, minYMilliInches: 17000, maxYMilliInches: 24000 };
  wall.footprintCells = [{ ...wall.footprint, maxXMilliInches: 43500 },
    { ...wall.footprint, maxYMilliInches: 17500 }];
  declared.board.terrain = [wall];
  return declared;
}
function placementCheck(current, input) {
  const piece = current.pieces.find(row => row.id === actorId);
  const ids = piece.models.map(model => model.id);
  return evaluateOfficialCoherencyPlacementV1({ state: current, actor: piece,
    dataBundle: current.officialModelBaseGeometryDataBundle,
    plan: { planId: 'declared-compound-terrain-probe', leadingModelId: ids[0],
      placements: [input.path.at(-1), ...input.placements].map((row, i) => ({
        ...row, modelId: ids[i], outcome: 'placed' })) } });
}

function highCellCompatibility() {
  const declared = structuredClone(state);
  declared.officialModelGapTransitPolicy = structuredClone(modelGapTransitPolicy);
  const piece = declared.pieces.find(row => row.id === actorId);
  piece.models.forEach(model => { model.elevation = 'high'; });
  const platform = declared.board.terrain.find(row => row.id === 'std-ordinary-east');
  platform.terrainKind = 'ordinary';
  platform.size = 3;
  platform.standableHorizontalSurface = true;
  platform.blocksPlacement = false;
  platform.footprint = { shape: 'axis_aligned_rectangle', minXMilliInches: 43000,
    maxXMilliInches: 47000, minYMilliInches: 17000, maxYMilliInches: 24000 };
  platform.footprintCells = [{ ...platform.footprint, maxYMilliInches: 21200 },
    { ...platform.footprint, minYMilliInches: 21200 }];
  declared.board.terrain = [platform];
  const footprints = [20000, 22000].map((y, i) => createOfficialModelBaseFootprintV1({
    piece, model: piece.models[i], dataBundle: declared.officialModelBaseGeometryDataBundle,
    position: { xMilliInches: 45000, yMilliInches: y, rotationDegrees: 0 } }));
  const check = () => createOfficialCoherencyLinkEvaluatorV1({ state: declared, actor: piece,
    dataBundle: declared.officialModelBaseGeometryDataBundle })(...footprints);
  const candidate = check();
  declared.officialModelGapTransitPolicy = structuredClone(oldGapPolicy);
  return { candidate, oldComponent: check(), scope: 'declared_high_surface_compatibility_only' };
}
if (process.argv.includes('--high-compatibility-baseline') || process.argv.includes('--high-compatibility')) {
  const result = highCellCompatibility();
  assert.equal(result.oldComponent, true);
  assert.equal(result.candidate, !process.argv.includes('--high-compatibility-baseline'));
  await save(process.argv.includes('--high-compatibility-baseline') ? 'high-cell-red.json' : 'high-cell-green.json', result);
  console.log(JSON.stringify(result));
} else if (process.argv.includes('--baseline')) {
  const product = openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: runtime });
  try {
    const current = await setup(product, 'terrain-coherency-previous');
    const input = parameters(current.domain);
    const queried = query(current.aggregate.envelope.state, current.domain, input);
    assert.equal(queried.ok, true);
    const valid = parameters(current.domain, true);
    const declared = compoundProbe(current.aggregate.envelope.state, valid);
    assert.throws(() => placementCheck(declared, valid), /MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP/);
    await save('red.json', { actualRoomWallCrossingAccepted: true,
      actualWallBounds: { xMin: 43, xMax: 47, yMin: 18.4, yMax: 19.1 },
      input, queryReceiptHash: queried.queryReceiptHash, illegalCandidateApplied: false,
      compoundProbeScope: 'explicit_geometry_input_only', compoundEmptySpaceIncorrectlyRejected: true,
      runtime: runtime.descriptor, revision: current.aggregate.stateRevision, providerCalls: 0 });
    await save('authority.json', authority);
    console.log(JSON.stringify({ status: 'red_reproduced', directory }));
  } finally { product.close(); }
} else {
  const roomId = 'terrain-coherency-corrected';
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'candidate.sqlite', rulesRuntime: runtime });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs',
      factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-geometry-20261112-v1/terrain-coherency/red.json',
      contractVersion: 'T28-W3-terrain-coherency-and-cells-v1' },
    steps: [
      { name: 'read', openProduct: () => openWave3EngineeringRoomV1({ directory,
        filename: 'baseline.sqlite', rulesRuntime: runtime }), check: async product => {
        await product.restoreDependencies('terrain-coherency-previous', authority);
        const red = JSON.parse(await fs.readFile(path.join(directory, 'red.json'), 'utf8'));
        assert.equal(runtime.descriptor.runtimeHash, red.runtime.runtimeHash);
        assert.equal(red.illegalCandidateApplied, false);
        assert.equal((await product.room.replayRoom({ roomId: 'terrain-coherency-previous' })).matchesCurrent, true);
        const evidenceRef = await save('legacy.json', { originalAcceptedPrefixAndBindingPreserved: true,
          failedCandidateWasQueryOnly: true, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'baseline.sqlite') };
      } },
      { name: 'compile', openProduct: open, check: async () => {
        assert.strictEqual(modelGapTransitPolicy, sharedPolicy);
        const raptor = state.pieces.find(row => row.officialUnitRecordKey
          === 'army_units:kerrigan_swarm_raptor__zergling_');
        assert(raptor, 'use the actual frozen Raptor record');
        assert.equal(isOfficialGroundTerrainTraversalBlockedV13(actor, { terrainKind: 'ordinary', size: 2 }), true);
        assert.equal(isOfficialGroundTerrainTraversalBlockedV13(actor, { terrainKind: 'ordinary', size: 1 }), false);
        assert.equal(isOfficialGroundTerrainTraversalBlockedV13(actor, { terrainKind: 'grass', size: 4 }), false);
        assert.equal(isOfficialGroundTerrainTraversalBlockedV13(actor, { terrainKind: 'impassable', size: 4 }), true);
        assert.equal(isOfficialGroundTerrainTraversalBlockedV13(raptor, { terrainKind: 'impassable', size: 4 }), false);
        assert.equal(isOfficialGroundTerrainTraversalBlockedV13(raptor, { terrainKind: 'impassable', size: 5 }), true);
        const evidenceRef = await save('compile.json', { actualFrozenMedicAndRaptorClassification: true,
          placementPermissionDoesNotGrantTraversal: true, sourceContractSharedByLeadingAndCoherency: true,
          raptorWholeActionAndDeploymentScope: 'not_proven_by_classification', providerCalls: 0 });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'consume', openProduct: open, check: async product => {
        const current = await setup(product, roomId);
        const input = parameters(current.domain);
        const beforeHash = current.aggregate.envelope.stateHash;
        assert.throws(() => query(current.aggregate.envelope.state, current.domain, input),
          /MODEL_BASE_GEOMETRY_COHERENCY_LINK_INVALID/);
        assert.deepEqual(linkChecks(current.aggregate.envelope.state, input), { ordinary: false, hypothetical: false });
        const legal = await product.room.legalSpace({ roomId, seatToken: current.credentials.player1.seatToken });
        const invalidPreview = await product.room.previewAction({ roomId,
          seatToken: current.credentials.player1.seatToken,
          proposal: { kind: 'parameterized', domainId: current.domain.domainId, parameters: input },
          expectedStateRevision: current.aggregate.stateRevision,
          expectedStateHash: current.aggregate.envelope.stateHash,
          expectedMatchBindingHash: current.aggregate.envelope.matchBindingHash,
          expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash });
        assert.equal(invalidPreview.ok, false);
        assert.match(JSON.stringify(invalidPreview), /MODEL_BASE_GEOMETRY_COHERENCY_LINK_INVALID/);
        const valid = parameters(current.domain, true);
        const declared = compoundProbe(current.aggregate.envelope.state, valid);
        assert.equal(placementCheck(declared, valid).inCoherency, true);
        assert.deepEqual(linkChecks(declared, valid), { ordinary: true, hypothetical: true });
        const blocked = structuredClone(valid);
        blocked.placements[0].xMilliInches = 43900;
        assert.throws(() => placementCheck(declared, blocked), /MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP/);
        const malformed = structuredClone(declared);
        malformed.board.terrain[0].footprintCells = [];
        assert.throws(() => placementCheck(malformed, valid), /MODEL_BASE_GEOMETRY_TERRAIN_CELLS_INVALID/);
        const legacy = structuredClone(declared);
        legacy.officialModelGapTransitPolicy = structuredClone(oldGapPolicy);
        assert.throws(() => placementCheck(legacy, valid), /MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP/);
        const queried = query(current.aggregate.envelope.state, current.domain, valid);
        assert.equal(queried.ok, true);
        assert.equal((await product.store.loadRoom(roomId)).envelope.stateHash, beforeHash);
        const committed = await product.commit({ roomId, credential: current.credentials.player1,
          operationKey: 'legal-medic-above-wall', select: row => row.pieceId === actorId && row.actionType === 'move',
          parameters: domain => parameters(domain, true) });
        assert.equal(committed.preview.core.action.sourceAction.spatialPlan.planHash,
          queried.result.action.spatialPlan.planHash);
        const aggregate = await product.store.loadRoom(roomId);
        assert.equal(aggregate.stateRevision, 3);
        const moved = aggregate.envelope.state.pieces.find(row => row.id === actorId);
        assert.equal(moved.inCoherency, true);
        assert.deepEqual(moved.models.map(row => row.yInches), [19.8, 21.1, 22.4]);
        const evidenceRef = await save('consume.json', { actualRoomWallCrossingQueryAndPreviewRejected: true,
          ordinaryAndHypotheticalAgree: true, physicalCellsHoleAcceptedAndSolidOverlapRejected: true,
          emptyCellsRejected: true, oldComponentKeepsItsOriginalGeometry: true,
          compoundScope: 'explicit_geometry_input_only', queryReadOnly: true,
          legalThreeMedicMovementApplied: true, queryPreviewAndApplyAgree: true,
          exactModelYInches: moved.models.map(row => row.yInches), revision: aggregate.stateRevision, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'successor', openProduct: open, check: async product => {
        const credentials = await product.create(roomId, authority);
        const before = await product.store.loadRoom(roomId);
        if (before.envelope.state.selectedRosterActivationWindow?.pieceId === actorId) {
          await product.commit({ roomId, credential: credentials.player1, operationKey: 'finish-medic',
            select: row => row.actionType === 'finish_activation' && row.pieceId === actorId,
            parameters: () => ({}) });
        }
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
        assert.equal((await product.room.replayRoom({ roomId })).matchesCurrent, true);
        const evidenceRef = await save('cold-recovery.json', { originalBindingStateAndReceiptsPreserved: true,
          revision: aggregate.stateRevision, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
    ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), providerCalls: 0 }));
}
