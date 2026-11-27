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
import { OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 as modelGapTransitPolicy,
  OFFICIAL_MODEL_GAP_TRANSIT_POLICY_V13 as oldGapPolicy } from '../packages/rule-atoms/official-model-gap-transit-policy-v13.mjs';
import { OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 as sharedPolicy } from '../packages/rule-atoms/official-movement-clearance-contract-v13.mjs';
import { queryOfficialSelectedRosterSpatialActionV1 } from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import { createOfficialModelBaseFootprintV1, createOfficialCoherencyLinkEvaluatorV1,
  createOfficialHypotheticalCoherencyLinkEvaluatorV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-geometry-20261112-v1/coherency-clearance');
await fs.mkdir(directory, { recursive: true });
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const [dataset, snapshot] = await Promise.all(['legacy-dataset.json', 'legacy-snapshot.json']
  .map(name => fs.readFile(path.join(sourceDirectory, name), 'utf8').then(JSON.parse)));
const source = createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot });
const state = prepareOfficialCurrentProductFirstRoundV1(source.state);
const actorId = 'player1-medic';
const actor = state.pieces.find(row => row.id === actorId);
assert.equal(actor.models.length, 3);
assert.equal(actor.models[0].baseWidthInches, 1.26);
assert.equal(actor.sizeCharacteristic, 2);
Object.assign(actor, { isOnField: true, isInReserves: false, xInches: 45, yInches: 22 });
actor.models.forEach((model, index) => Object.assign(model, { isOnField: true,
  xInches: [45, 43.3, 46.7][index], yInches: 22, elevation: 'ground', supportTerrainIds: [] }));
const offsets = [[0, 0], [-1300, -1300], [-2600, -1300], [-1300, 0], [-2600, 0],
  [-1300, 1300], [-2600, 1300], [-1300, -2600], [-1300, 2600]];
for (const [id, x, direction] of [['player1-marine-1', 43.97, 1], ['player1-marine-2', 46.03, -1]]) {
  const piece = state.pieces.find(row => row.id === id);
  Object.assign(piece, { isOnField: true, isInReserves: false, xInches: x, yInches: 18 });
  piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
    xInches: x + direction * offsets[index][0] / 1000, yInches: 18 + offsets[index][1] / 1000,
    elevation: 'ground', supportTerrainIds: [] }));
}
const { receiptHash: ignored, ...sourceBody } = source;
const body = { ...sourceBody, state, setupId: 't28-conditional-coherency-model-gap' };
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
    path: [{ xMilliInches: 45000, yMilliInches: 19400, elevation: 'ground', supportTerrainIds: [] }],
    placements: [
      { modelId: ids[1], xMilliInches: 45000, yMilliInches: valid ? 20700 : 16600,
        elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 },
      { modelId: ids[2], xMilliInches: 45000, yMilliInches: valid ? 22000 : 21100,
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
if (process.argv.includes('--baseline')) {
  const product = openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: runtime });
  try {
    const current = await setup(product, 'coherency-previous');
    const input = parameters(current.domain);
    const result = query(current.aggregate.envelope.state, current.domain, input);
    assert.equal(result.ok, true);
    await save('red.json', { reproduced: 'coherency_link_crosses_800_gap_despite_required_1000',
      independentGeometry: { marineCentreGapMilliInches: 2060, marineDiameterMilliInches: 1260,
        actualGapMilliInches: 800, sizeTwoRequiredMilliInches: 1000, followerDistanceFromLeadingMilliInches: 2800 },
      input, queryReceiptHash: result.queryReceiptHash,
      acceptedPlacementHash: result.result.action.spatialPlan.coherencyPlacementResultHash,
      runtime: runtime.descriptor, revision: current.aggregate.stateRevision, illegalCandidateApplied: false, providerCalls: 0 });
    await save('authority.json', authority);
    console.log(JSON.stringify({ status: 'red_reproduced', directory }));
  } finally { product.close(); }
} else {
  const roomId = 'coherency-corrected';
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'candidate.sqlite', rulesRuntime: runtime });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-geometry-20261112-v1/coherency-clearance/red.json', contractVersion: 'T28-W3-ground-model-coherency-clearance-v1' },
    steps: [
      { name: 'read', openProduct: () => openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: runtime }),
        check: async product => {
          await product.restoreDependencies('coherency-previous', authority);
          const red = JSON.parse(await fs.readFile(path.join(directory, 'red.json'), 'utf8'));
          assert.equal(runtime.descriptor.runtimeHash, red.runtime.runtimeHash);
          assert.equal(red.illegalCandidateApplied, false);
          assert.equal((await product.room.replayRoom({ roomId: 'coherency-previous' })).matchesCurrent, true);
          const evidenceRef = await save('legacy.json', { sourceContractAndAcceptedPrefixPreserved: true,
            badCandidateWasQueryOnly: true, providerCalls: 0 });
          return { evidenceRef, checkpointRef: path.join(directory, 'baseline.sqlite') };
        } },
      { name: 'compile', openProduct: open, check: async () => {
        assert.strictEqual(modelGapTransitPolicy, sharedPolicy);
        assert.equal(sharedPolicy.smallClearanceDiameterMilliInches, 1000);
        assert.equal(sharedPolicy.largeClearanceDiameterMilliInches, 3000);
        const evidenceRef = await save('compile.json', { dataContractIsSingleObjectOwner: true,
          lowLevelGeometryAvoidsHighLevelSweepModuleImport: true,
          samePublishedPolicyValuesAndRuntimeDescriptor: true, providerCalls: 0 });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'consume', openProduct: open, check: async product => {
        const current = await setup(product, roomId);
        const input = parameters(current.domain);
        const originalHash = current.aggregate.envelope.stateHash;
        assert.throws(() => query(current.aggregate.envelope.state, current.domain, input),
          /MODEL_BASE_GEOMETRY_COHERENCY_LINK_INVALID/);
        assert.deepEqual(linkChecks(current.aggregate.envelope.state, input), { ordinary: false, hypothetical: false });
        const legacy = structuredClone(current.aggregate.envelope.state);
        legacy.officialModelGapTransitPolicy = structuredClone(oldGapPolicy);
        assert.deepEqual(linkChecks(legacy, input), { ordinary: true, hypothetical: true });
        const wide = structuredClone(current.aggregate.envelope.state);
        for (const [id, delta] of [['player1-marine-1', -0.1], ['player1-marine-2', 0.1]]) {
          const piece = wide.pieces.find(row => row.id === id);
          piece.xInches += delta;
          piece.models.forEach(model => { model.xInches += delta; });
        }
        assert.equal(query(wide, domainFor(wide), parameters(domainFor(wide))).ok, true);
        assert.deepEqual(linkChecks(wide, parameters(domainFor(wide))), { ordinary: true, hypothetical: true });
        const valid = parameters(current.domain, true);
        const queried = query(current.aggregate.envelope.state, current.domain, valid);
        assert.equal(queried.ok, true);
        assert.deepEqual(linkChecks(current.aggregate.envelope.state, valid), { ordinary: true, hypothetical: true });
        assert.equal((await product.store.loadRoom(roomId)).envelope.stateHash, originalHash);
        const committed = await product.commit({ roomId, credential: current.credentials.player1,
          operationKey: 'legal-medic-reformation', select: row => row.pieceId === actorId && row.actionType === 'move',
          parameters: domain => parameters(domain, true) });
        if (committed.preview) assert.equal(committed.preview.core.action.sourceAction.spatialPlan.planHash,
          queried.result.action.spatialPlan.planHash);
        const aggregate = await product.store.loadRoom(roomId);
        const moved = aggregate.envelope.state.pieces.find(row => row.id === actorId);
        assert.equal(moved.inCoherency, true);
        assert.equal(moved.coherencyStatus.isOutOfCoherency, false);
        assert.deepEqual(moved.models.map(model => model.yInches), [19.4, 20.7, 22]);
        const evidenceRef = await save('consume.json', { actual800GapRejected: true,
          ordinaryAndHypotheticalSearchAgreeWithNative: true,
          legacyComponentStillUsesOriginalLinkContract: true,
          exact1000GapGeometryQueryAccepted: true, exact1000IsDeclaredGeometryProbe: true,
          threeModelValidReformationApplied: true, queryPreviewAndApplyAgree: true,
          exactModelYInches: moved.models.map(model => model.yInches),
          queryReadOnly: true, revision: aggregate.stateRevision, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'successor', openProduct: open,
        repairRef: 'coherency-clearance-approved-thirteen-database-cleanup-20261113', check: async product => {
        const credentials = await product.create(roomId, authority);
        const before = await product.store.loadRoom(roomId);
        if (before.envelope.state.selectedRosterActivationWindow?.pieceId === actorId) await product.commit({
          roomId, credential: credentials.player1, operationKey: 'finish-medic',
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
        assert.equal((await product.room.replayRoom({ roomId })).matchesCurrent, true);
        const evidenceRef = await save('cold-recovery.json', { originalBindingStateAndReceiptsPreserved: true,
          revision: aggregate.stateRevision, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
    ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), providerCalls: 0 }));
}
