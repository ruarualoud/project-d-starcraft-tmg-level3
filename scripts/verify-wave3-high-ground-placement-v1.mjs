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
import { queryOfficialSelectedRosterSpatialActionV1 } from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import { createOfficialModelBaseFootprintV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { OFFICIAL_HIGH_GROUND_FINAL_PLACEMENT_POLICY_V13 as highGroundFinalPlacementPolicy,
  projectOfficialHighGroundFinalPlacementStateV13 } from '../packages/rule-atoms/official-high-ground-final-placement-policy-v13.mjs';
import { deriveOfficialSemanticSurfaceSupportV1, deriveOfficialFinalPlacementSurfaceSupportV13 } from '../packages/rule-atoms/official-semantic-surface-support-v1.mjs';
import { projectStarcraftTmgViewerStateShapeV3 } from '../packages/client-domain/viewer-projection-v3.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-geometry-20261112-v1/high-ground');
await fs.mkdir(directory, { recursive: true });
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const [dataset, snapshot] = await Promise.all(['legacy-dataset.json', 'legacy-snapshot.json']
  .map(name => fs.readFile(path.join(sourceDirectory, name), 'utf8').then(JSON.parse)));
const terrainPlan = createOfficialStandard2000BalancedTerrainPlanV1();
const platform = terrainPlan.terrainPieces.find(row => row.terrainPieceId === 'std-centre-large');
// Editable tabletop setup, certified by the actual terrain factory. No map-art claim.
platform.footprint = { xMin: 24.7, xMax: 29.95, yMin: 15, yMax: 21 };
platform.originalFootprint = structuredClone(platform.footprint);
const source = createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot, terrainPlan });
const state = prepareOfficialCurrentProductFirstRoundV1(source.state);
const marineId = 'player1-marine-1';
const supportTerrainIds = ['std-centre-large'];
const offsets = [[0, 0], [1650, 0], [1167, 1167], [0, 1650], [-1167, 1167],
  [-1650, 0], [-1167, -1167], [0, -1650], [1167, -1167]];
const marine = state.pieces.find(row => row.id === marineId);
assert.equal(marine.models.length, offsets.length);
// Explicit starting condition for a conditional movement proof. All nine bases fit.
Object.assign(marine, { isOnField: true, isInReserves: false, xInches: 27.3, yInches: 18 });
marine.models.forEach((model, index) => Object.assign(model, { isOnField: true,
  xInches: (27300 + offsets[index][0]) / 1000, yInches: (18000 + offsets[index][1]) / 1000,
  elevation: 'high', supportTerrainIds: [...supportTerrainIds] }));
const { receiptHash: ignored, ...sourceBody } = source;
const body = { ...sourceBody, state, setupId: 't28-high-ground-conditional-movement' };
const authority = { ...body, receiptHash: hashStarcraftTmgContract(body) };
const native = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(state) }) });
const previous = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: native, faqReactionPolicy });
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
  const domain = legal.legalSpace.parameterDomains.find(row => row.pieceId === marineId && row.actionType === 'move');
  assert(domain, 'actual Marine movement domain required');
  return { credentials, aggregate, legal: legal.legalSpace, domain };
}
function parameters(domain) {
  const ids = domain.constraints.modelProfiles.map(row => row.modelId);
  assert.equal(ids.length, offsets.length);
  return { leadingModelId: ids[0],
    path: [{ xMilliInches: 28300, yMilliInches: 18000, elevation: 'high', supportTerrainIds }],
    placements: ids.slice(1).map((modelId, index) => ({ modelId,
      xMilliInches: 28300 + offsets[index + 1][0], yMilliInches: 18000 + offsets[index + 1][1],
      elevation: 'high', supportTerrainIds, rotationDegrees: 0 })) };
}
function query(current, domain, input) {
  assert.equal(domain.sourceRuntimeKind, 'spatial');
  return queryOfficialSelectedRosterSpatialActionV1({ state: current,
    request: { queryKind: 'legal_full_path_movement', sideKey: 'player1',
      domainId: domain.sourceDomain.domainId, parameters: input } });
}
function footprintAt(current, x, y = 18000) {
  const piece = current.pieces.find(row => row.id === marineId);
  return createOfficialModelBaseFootprintV1({ piece, model: piece.models[0],
    dataBundle: current.officialModelBaseGeometryDataBundle,
    position: { xMilliInches: x, yMilliInches: y, rotationDegrees: 0 } });
}
function mapRepresentationProbes(current) {
  // Explicit geometry-contract inputs, not certified maps or Native receipts.
  const declared = structuredClone(current);
  const original = declared.board.terrain.find(row => row.id === supportTerrainIds[0]);
  const rows = [
    { ...original, id: 'probe-platform-left', footprint: { ...original.footprint, maxXMilliInches: 27300 } },
    { ...original, id: 'probe-platform-right', footprint: { ...original.footprint, minXMilliInches: 27300 } },
  ].map(row => ({ ...row, overlayRole: 'premade_profile_actual_cell',
    terrainGroupId: 'probe-platform', terrainInstanceIds: ['probe-instance'], sourceRegionIds: ['probe-region'] }));
  declared.board.terrain = rows;
  declared.officialCompetitiveMapRoomFreeze = { overlayReceipt: {
    schema: 'starcraft_tmg_official_premade_profile_room_overlay_v1',
    terrainProfilePolicy: 'accepted_premade_group_rectangle_overlay_v1', logicalTerrainGroupCount: 1,
    logicalTerrainGroups: [{ terrainGroupId: 'probe-platform', rectangularRulesPieceIds: rows.map(row => row.id),
      terrainInstanceIds: ['probe-instance'], sourceRegionIds: ['probe-region'] }],
  } };
  const edge = footprintAt(current, 29950);
  assert.equal(deriveOfficialSemanticSurfaceSupportV1(declared, edge).elevation, 'ground');
  const final = deriveOfficialFinalPlacementSurfaceSupportV13(declared, edge);
  assert.equal(final.elevation, 'high');
  assert.equal(final.highGroundOverhang, true);
  assert.deepEqual(final.supportTerrainIds, ['probe-platform-right']);
  const hole = structuredClone(declared);
  hole.board.terrain[0].footprint.maxXMilliInches = 27000;
  hole.board.terrain[1].footprint.minXMilliInches = 28600;
  assert.equal(deriveOfficialFinalPlacementSurfaceSupportV13(hole, footprintAt(current, 27800)).elevation, 'ground');

  const semantic = structuredClone(current);
  semantic.officialCompetitiveMapRoomFreeze = {
    overlayReceipt: { overlayCompilerVersion: 'local_ramp_corridor_v3_1' },
    terrainHeightTierLedgerHash: current.officialTerrainHeightTierLedger.ledgerHash,
    semanticTerrainCertificate: { heightTierLedgerRows: [original] },
    semanticTerrainCertificateHash: hashStarcraftTmgContract({ engineeringProbe: true, heightRows: [original] }),
  };
  assert.equal(deriveOfficialSemanticSurfaceSupportV1(semantic, edge).elevation, 'ground');
  assert.equal(deriveOfficialFinalPlacementSurfaceSupportV13(semantic, edge).elevation, 'high');
  assert.equal(deriveOfficialFinalPlacementSurfaceSupportV13(semantic, footprintAt(current, 29980)).elevation, 'ground');
  return { scope: 'declared_geometry_contract_only', premadeUnionEdgeSupported: true,
    internalHolePreserved: true, semanticHeightEdgeSupported: true, outsideCentreRejected: true,
    fullCertifiedMapRoomAcceptance: false };
}
if (process.argv.includes('--baseline') || process.argv.includes('--resume-baseline')) {
  if (process.argv.includes('--resume-baseline')) {
    const stop = JSON.parse(await fs.readFile(path.join(directory, 'STOP.json'), 'utf8'));
    assert.equal(stop.failure.code, 'ENOSPC');
    assert.equal(stop.failure.targetGeometryQueryReached, false);
    // Resume the existing Room through the fixture's saved idempotency keys.
    // Completed actions are read back; missing operations alone are executed.
    assert((await fs.stat(path.join(directory, 'baseline.sqlite'))).size > 0);
  }
  const product = openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: previous });
  try {
    const current = await setup(product, 'high-ground-previous');
    const input = parameters(current.domain);
    let error;
    try { query(current.aggregate.envelope.state, current.domain, input); } catch (caught) { error = caught.message; }
    assert.match(error || '', /SELECTED_SPATIAL_TERRAIN_PATH_BLOCKED:std-centre-large/);
    await save('red.json', { reproduced: 'fully_supported_same_high_ground_path_rejected', error,
      expected: 'leading base remains fully supported; trailing base centre on High Ground may overhang at final placement',
      platform: platform.footprint, leadingPath: [[27300, 18000], [28300, 18000]],
      marineDiameterMilliInches: 1260, overhangingCentre: [29950, 18000],
      domain: current.domain, input, oldRuntime: previous.descriptor, revision: current.aggregate.stateRevision, providerCalls: 0 });
    await save('authority.json', authority);
    await save('STOP.json', { status: 'baseline_complete', at: new Date().toISOString(),
      priorFailure: { code: 'ENOSPC', stage: 'setup operation record' },
      sameIsolatedRoom: true, rulesCounterexampleReached: true, providerCalls: 0 });
    console.log(JSON.stringify({ status: 'red_reproduced', directory }));
  } finally { product.close(); }
} else {
  const candidate = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: native,
    faqReactionPolicy, highGroundFinalPlacementPolicy });
  const roomId = 'high-ground-corrected';
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'candidate.sqlite', rulesRuntime: candidate });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-geometry-20261112-v1/high-ground/red.json', contractVersion: 'T28-W3-high-ground-final-placement-v1' },
    steps: [
      { name: 'read', openProduct: () => openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: previous }),
        check: async product => {
          await product.restoreDependencies('high-ground-previous', authority);
          const red = JSON.parse(await fs.readFile(path.join(directory, 'red.json'), 'utf8'));
          assert.equal(previous.descriptor.runtimeHash, red.oldRuntime.runtimeHash);
          assert.equal((await product.room.replayRoom({ roomId: 'high-ground-previous' })).matchesCurrent, true);
          const evidenceRef = await save('legacy.json', { exactDescriptorAndOldRoomReceiptsPreserved: true, providerCalls: 0 });
          return { evidenceRef, checkpointRef: path.join(directory, 'baseline.sqlite') };
        } },
      { name: 'compile', openProduct: open, check: async () => {
        const current = projectOfficialHighGroundFinalPlacementStateV13(state, highGroundFinalPlacementPolicy);
        const edge = footprintAt(current, 29950);
        assert.equal(edge.radiusMilliInches, 630);
        const support = deriveOfficialFinalPlacementSurfaceSupportV13(current, edge);
        assert.equal(support.elevation, 'high');
        assert.equal(support.highGroundOverhang, true);
        assert.deepEqual(support.supportTerrainIds, supportTerrainIds);
        assert.equal(deriveOfficialFinalPlacementSurfaceSupportV13(current, footprintAt(current, 29980)).elevation, 'ground');
        const mid = structuredClone(current);
        const high = mid.board.terrain.find(row => row.id === supportTerrainIds[0]);
        high.size = 2;
        high.heightTier = 'mid_ground';
        assert.equal(deriveOfficialFinalPlacementSurfaceSupportV13(mid, edge).elevation, 'ground');
        assert.deepEqual(projectStarcraftTmgViewerStateShapeV3(current).officialHighGroundFinalPlacementPolicy,
          highGroundFinalPlacementPolicy);
        assert.equal(candidate.descriptor.runtimeVersion, '1.7.0');
        const representations = mapRepresentationProbes(current);
        const evidenceRef = await save('compile.json', { actualMarineRadiusMilliInches: edge.radiusMilliInches,
          independentOverhangMilliInches: 630, ordinarySurface: support, representations,
          midGroundExceptionRejected: true, publicPolicyPreserved: true, runtime: candidate.descriptor, providerCalls: 0 });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'consume', openProduct: open,
        repairRef: 'fixture-ground-model-ten-milli-clearance-from-platform-20261113', check: async product => {
        const current = await setup(product, roomId);
        const input = parameters(current.domain);
        const beforeHash = current.aggregate.envelope.stateHash;
        const queried = query(current.aggregate.envelope.state, current.domain, input);
        const outside = structuredClone(input);
        outside.placements[0].xMilliInches = 29980;
        assert.throws(() => query(current.aggregate.envelope.state, current.domain, outside),
          /SELECTED_SPATIAL_TERRAIN_ENDPOINT_UNSUPPORTED/);
        const boardEdge = structuredClone(input);
        boardEdge.placements[0].xMilliInches = 500;
        assert.throws(() => query(current.aggregate.envelope.state, current.domain, boardEdge), /OUTSIDE_BATTLEFIELD/);
        const leavesPlatform = structuredClone(input);
        leavesPlatform.path[0].xMilliInches = 31000;
        leavesPlatform.placements.forEach(row => { row.xMilliInches += 2700; });
        assert.throws(() => query(current.aggregate.envelope.state, current.domain, leavesPlatform),
          /SELECTED_SPATIAL_TERRAIN_PATH_BLOCKED/);
        const overlap = structuredClone(current.aggregate.envelope.state);
        const goliath = overlap.pieces.find(row => row.id === 'player1-goliath-1');
        // Keep the ground base clear of the platform itself. It overlaps only
        // the Marine's protruding base, isolating the FAQ16 top-down condition.
        Object.assign(goliath, { isOnField: true, isInReserves: false, xInches: 31.535, yInches: 18 });
        Object.assign(goliath.models[0], { isOnField: true, xInches: 31.535, yInches: 18,
          elevation: 'ground', supportTerrainIds: [] });
        const overlapDomain = candidate.enumerate(overlap, { sideKey: 'player1' }).parameterDomains
          .find(row => row.pieceId === marineId && row.actionType === 'move');
        assert.throws(() => query(overlap, overlapDomain, input), /MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP/);
        assert.equal((await product.store.loadRoom(roomId)).envelope.stateHash, beforeHash);
        const committed = await product.commit({ roomId, credential: current.credentials.player1,
          operationKey: 'high-ground-move', select: domain => domain.actionType === 'move' && domain.pieceId === marineId,
          parameters });
        const aggregate = await product.store.loadRoom(roomId);
        const moved = aggregate.envelope.state.pieces.find(row => row.id === marineId);
        for (const expected of queried.result.action.spatialPlan.finalModelPositions) {
          const actual = moved.models.find(row => row.id === expected.modelId);
          assert.equal(Math.round(actual.xInches * 1000), expected.xMilliInches);
          assert.equal(Math.round(actual.yInches * 1000), expected.yMilliInches);
          assert.equal(actual.elevation, expected.elevation);
          assert.deepEqual(actual.supportTerrainIds, expected.supportTerrainIds);
        }
        if (committed.preview) assert.equal(committed.preview.core.action.sourceAction.spatialPlan.planHash,
          queried.result.action.spatialPlan.planHash);
        const evidenceRef = await save('consume.json', { nineModelsMoved: true,
          queryMatchesPreviewAndAppliedPositions: true, currentRevision: aggregate.stateRevision,
          actualPositions: moved.models.map(row => ({ modelId: row.id, xInches: row.xInches, yInches: row.yInches,
            elevation: row.elevation, supportTerrainIds: row.supportTerrainIds })),
          centreOutsideRejected: true, crossElevationTopDownOverlapRejected: true,
          fullBaseBoardEdgeRejected: true, finalExceptionNotAppliedToUnsupportedTransit: true,
          queryReadOnly: true, queryReceiptHash: queried.queryReceiptHash, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'successor', openProduct: open, check: async product => {
        const credentials = await product.create(roomId, authority);
        const before = await product.store.loadRoom(roomId);
        if (before.envelope.state.selectedRosterActivationWindow?.pieceId === marineId) {
          await product.commit({ roomId, credential: credentials.player1, operationKey: 'finish-marine',
            select: domain => domain.actionType === 'finish_activation' && domain.pieceId === marineId,
            parameters: () => ({}) });
        }
        await product.commit({ roomId, credential: credentials.player2, kind: 'finite', operationKey: 'zerg-pass',
          select: item => item.action.actionType === 'pass' });
        const aggregate = await product.store.loadRoom(roomId);
        assert.equal(aggregate.envelope.state.activeSideKey, 'player1');
        const evidenceRef = await save('successor.json', { activationEnded: true, opposingPassApplied: true,
          revision: aggregate.stateRevision, stateHash: aggregate.envelope.stateHash, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'coldRecovery', openProduct: open, check: async product => {
        await product.restoreDependencies(roomId, authority);
        const aggregate = await product.store.loadRoom(roomId);
        const successor = JSON.parse(await fs.readFile(path.join(directory, 'successor.json'), 'utf8'));
        assert.equal(aggregate.envelope.stateHash, successor.stateHash);
        assert.deepEqual(aggregate.envelope.state.officialHighGroundFinalPlacementPolicy, highGroundFinalPlacementPolicy);
        assert.equal((await product.room.replayRoom({ roomId })).matchesCurrent, true);
        const evidenceRef = await save('cold-recovery.json', { originalBindingAndReceiptsPreserved: true,
          revision: aggregate.stateRevision, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
    ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), providerCalls: 0 }));
}
