import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1, OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { prepareOfficialCurrentProductFirstRoundV1 } from '../packages/product-composition/official-first-round-setup-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createOfficialCurrentProductMatchRuntimeV7 } from '../packages/product-composition/official-current-product-match-runtime-v7.mjs';
import { createOfficialRelocationFamilyAdapterV1 } from '../packages/product-composition/official-relocation-family-adapter-v1.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 as faqReactionPolicy } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { OFFICIAL_ABILITY_REFERENCE_POLICY_V13 as abilityReferencePolicy,
  projectOfficialAbilityReferenceStateV13 } from '../packages/rule-atoms/official-ability-reference-policy-v13.mjs';
import { OFFICIAL_RELOCATION_GEOMETRY_POLICY_V13 as relocationGeometryPolicy,
  projectOfficialRelocationGeometryStateV13 } from '../packages/rule-atoms/official-relocation-geometry-policy-v13.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-geometry-20261112-v1/relocation');
await fs.mkdir(directory, { recursive: true });
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const [dataset, snapshot] = await Promise.all(['legacy-dataset.json', 'legacy-snapshot.json']
  .map(name => fs.readFile(path.join(sourceDirectory, name), 'utf8').then(JSON.parse)));
const recipes = structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1);
recipes.player1 = { factionRecordKey: 'tactical_cards:raynor_s_raiders',
  tacticalCardRecordKeys: ['tactical_cards:barracks__proxy_', 'tactical_cards:factory'], units: [
    { unitInstanceId: 'test-raider', recordKey: 'army_units:raynor_s_raider__marine_', compositionKind: 'small', upgradeNames: [] },
    { unitInstanceId: 'test-raynor', recordKey: 'army_units:jim_raynor', compositionKind: 'small', upgradeNames: [] },
  ] };
const source = createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot, recipes,
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY });
const state = prepareOfficialCurrentProductFirstRoundV1(source.state);
for (const [id, x, y] of [['test-raynor', 40, 12], ['player2-queen', 45, 30]]) {
  const piece = state.pieces.find(item => item.id === id);
  assert.equal(piece.models.length, 1);
  Object.assign(piece, { isOnField: true, isInReserves: false, xInches: x, yInches: y });
  Object.assign(piece.models[0], { isOnField: true, xInches: x, yInches: y,
    elevation: 'ground', supportTerrainIds: [] });
}
const { receiptHash: ignored, ...sourceBody } = source;
const body = { ...sourceBody, state, setupId: 't28-relocation-geometry-conditional' };
const authority = { ...body, receiptHash: hashStarcraftTmgContract(body) };
const native = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(state) }) });
const previous = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: native,
  faqReactionPolicy, abilityReferencePolicy });
const candidate = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: native,
  faqReactionPolicy, abilityReferencePolicy, relocationGeometryPolicy });
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
    select: item => item.action.actionType === 'choose_first_actor' && item.action.chosenFirstActorSideKey === 'player2' });
  await product.commit({ roomId, credential: credentials.player2, operationKey: 'summon-worm',
    select: domain => domain.abilityName === 'Omega Network' && domain.pieceId === 'player2-queen',
    parameters: domain => ({ activeUnitId: domain.parameterSchema.activeUnitId.const,
      paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0], xMilliInches: 26000, yMilliInches: 12000 }) });
  await product.commit({ roomId, credential: credentials.player2, operationKey: 'finish-queen',
    select: domain => domain.actionType === 'finish_activation' && domain.pieceId === 'player2-queen', parameters: () => ({}) });
  const aggregate = await product.store.loadRoom(roomId);
  assert.equal(aggregate.envelope.state.activeSideKey, 'player1');
  return { credentials, aggregate };
}
function placements(domain, x = 46000, y = 12000) {
  const offsets = [[0, 0], [1400, 0], [700, 1212], [-700, 1212], [-1400, 0], [-700, -1212]];
  const ids = domain.parameterSchema.placements.exactModelIds;
  assert.equal(ids.length, offsets.length);
  return { leadingModelId: ids[0], anchorPieceId: 'test-raynor', anchorModelId: 'test-raynor-model-1',
    placements: ids.map((modelId, index) => ({ modelId, xMilliInches: x + offsets[index][0],
      yMilliInches: y + offsets[index][1], elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 })) };
}
function queryScenarios(input) {
  const projected = projectOfficialAbilityReferenceStateV13(input, abilityReferencePolicy);
  const origin = structuredClone(projected);
  const worm = origin.pieces.find(piece => piece.officialUnitRecordKey === 'army_units:omega_worm');
  assert(worm?.isStructure && worm.isOnField);
  // Adversarial query input, not a legal mixed-faction army or committed history.
  // Reuse the real generated presence, changing only affiliation to exercise FAQ59.
  worm.sideKey = 'player1';
  const crossing = structuredClone(projected);
  // Friendly affiliation isolates physical collision from enemy separation.
  crossing.pieces.find(piece => piece.id === worm.id).sideKey = 'player1';
  const raynor = crossing.pieces.find(piece => piece.id === 'test-raynor');
  Object.assign(raynor, { xInches: 23.7, yInches: 11.1 });
  Object.assign(raynor.models[0], { xInches: 23.7, yInches: 11.1 });
  return { origin, crossing, wormId: worm.id };
}
function adapterFor(current) {
  return createOfficialRelocationFamilyAdapterV1(current.officialRelocationFamilySourceBundle);
}
function domainFor(adapter, current, ability, pieceId) {
  const domain = adapter.legalSpace(current, { sideKey: 'player1' }).parameterDomains
    .find(item => item.abilityName === ability && item.pieceId === pieceId);
  assert(domain, ability + ' missing');
  return domain;
}
function crossingParameters(domain) {
  const modelId = domain.parameterSchema.leadingModelId.enum[0];
  return { leadingModelId: modelId,
    placements: [{ modelId, xMilliInches: 23700, yMilliInches: 12900,
      elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 }],
    path: [{ xMilliInches: 23700, yMilliInches: 12900, elevation: 'ground', supportTerrainIds: [] }] };
}
function query(adapter, current, domain, parameters) {
  return adapter.query(current, { queryKind: 'instantiate_parameterized_action', sideKey: 'player1',
    domainId: domain.domainId, parameters });
}
if (process.argv.includes('--baseline')) {
  const product = openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: previous });
  try {
    const { aggregate } = await setup(product, 'relocation-previous');
    const scenarios = queryScenarios(aggregate.envelope.state);
    const adapter = adapterFor(scenarios.origin);
    const originDomain = domainFor(adapter, scenarios.origin, 'Rapid Reinforcements', 'test-raider');
    assert(originDomain.parameterSchema.anchorPieceId.enum.includes(scenarios.wormId));
    const parameters = placements(originDomain, 32000);
    parameters.anchorPieceId = scenarios.wormId;
    parameters.anchorModelId = scenarios.origin.pieces.find(piece => piece.id === scenarios.wormId).models[0].id;
    query(adapter, scenarios.origin, originDomain, parameters);
    const crossingDomain = domainFor(adapter, scenarios.crossing, 'Go! Go! Go!', 'test-raynor');
    query(adapter, scenarios.crossing, crossingDomain, crossingParameters(crossingDomain));
    const evidenceRef = await save('red.json', { reproduced: ['rapid_structure_origin_allowed', 'extra_move_crosses_structure'],
      queryOnlyInjectedConditions: true, nativeWormSourceStateHash: aggregate.envelope.stateHash,
      legacyRevision: aggregate.stateRevision, legacyRuntime: previous.descriptor,
      crossing: { start: [23700, 11100], end: [23700, 12900], wormCenter: [26000, 12000],
        raynorDiameterInches: 1.575, wormDiameterInches: 3.15,
        independentMinimumCenterGapMilliInches: 2300, combinedRadiusMilliInches: 2362.5 }, providerCalls: 0 });
    await save('source-state.json', aggregate.envelope.state);
    await save('authority.json', authority);
    console.log(JSON.stringify({ status: 'red_reproduced', evidenceRef }));
  } finally { product.close(); }
} else {
  const roomId = 'relocation-corrected';
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'candidate.sqlite', rulesRuntime: candidate });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-geometry-20261112-v1/relocation/red.json', contractVersion: 'T28-W3-relocation-geometry-v1' },
    steps: [
      { name: 'read', openProduct: () => openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: previous }),
        check: async product => {
          await product.restoreDependencies('relocation-previous', authority);
          assert.equal((await product.room.replayRoom({ roomId: 'relocation-previous' })).matchesCurrent, true);
          const red = JSON.parse(await fs.readFile(path.join(directory, 'red.json'), 'utf8'));
          assert.equal(previous.descriptor.runtimeHash, red.legacyRuntime.runtimeHash);
          const evidenceRef = await save('legacy.json', { previousDescriptorAndReceiptsPreserved: true, providerCalls: 0 });
          return { evidenceRef, checkpointRef: path.join(directory, 'baseline.sqlite') };
        } },
      { name: 'compile', openProduct: open, check: async () => {
        const sourceState = JSON.parse(await fs.readFile(path.join(directory, 'source-state.json'), 'utf8'));
        const scenarios = queryScenarios(sourceState);
        const origin = projectOfficialRelocationGeometryStateV13(scenarios.origin, relocationGeometryPolicy);
        const crossing = projectOfficialRelocationGeometryStateV13(scenarios.crossing, relocationGeometryPolicy);
        const adapter = adapterFor(origin);
        const originDomain = domainFor(adapter, origin, 'Rapid Reinforcements', 'test-raider');
        assert(!originDomain.parameterSchema.anchorPieceId.enum.includes(scenarios.wormId));
        assert(originDomain.parameterSchema.anchorPieceId.enum.includes('test-raynor'));
        const parameters = placements(originDomain, 32000);
        parameters.anchorPieceId = scenarios.wormId;
        parameters.anchorModelId = origin.pieces.find(piece => piece.id === scenarios.wormId).models[0].id;
        assert.throws(() => query(adapter, origin, originDomain, parameters), /RELOCATION_FRIENDLY_ANCHOR_INVALID/);
        const crossingDomain = domainFor(adapter, crossing, 'Go! Go! Go!', 'test-raynor');
        assert.throws(() => query(adapter, crossing, crossingDomain, crossingParameters(crossingDomain)), /RELOCATION_PATH_MODEL_COLLISION/);
        assert.equal(candidate.descriptor.runtimeVersion, '1.6.0');
        const evidenceRef = await save('compile.json', { injectedOriginsAndPathsRejected: true,
          ordinaryOriginRetained: true, runtime: candidate.descriptor, providerCalls: 0 });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'consume', openProduct: open, check: async product => {
        const { credentials } = await setup(product, roomId);
        await product.commit({ roomId, credential: credentials.player1, operationKey: 'safe-extra-move',
          select: domain => domain.abilityName === 'Go! Go! Go!' && domain.pieceId === 'test-raynor',
          parameters: domain => {
            const modelId = domain.parameterSchema.leadingModelId.enum[0];
            return { leadingModelId: modelId, placements: [{ modelId, xMilliInches: 41000, yMilliInches: 12000,
              elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 }],
              path: [{ xMilliInches: 41000, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [] }] };
          } });
        const aggregate = await product.store.loadRoom(roomId);
        assert.equal(aggregate.envelope.state.pieces.find(piece => piece.id === 'test-raynor').models[0].xInches, 41);
        const evidenceRef = await save('consume.json', { safeExtraMoveApplied: true,
          revision: aggregate.stateRevision, stateHash: aggregate.envelope.stateHash, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'successor', repairRef: 'fixture-successor-skips-side-already-passed-movement', openProduct: open, check: async product => {
        const credentials = await product.create(roomId, authority);
        const before = await product.store.loadRoom(roomId);
        const window = before.envelope.state.selectedRosterActivationWindow;
        if (window?.pieceId === 'test-raynor') await product.commit({ roomId, credential: credentials.player1,
          operationKey: 'finish-raynor', select: domain => domain.actionType === 'finish_activation' && domain.pieceId === 'test-raynor',
          parameters: () => ({}) });
        await product.commit({ roomId, credential: credentials.player2, kind: 'finite', operationKey: 'zerg-pass',
          select: item => item.action.actionType === 'pass' });
        await product.commit({ roomId, credential: credentials.player1, operationKey: 'rapid-reinforcements',
          select: domain => domain.abilityName === 'Rapid Reinforcements' && domain.pieceId === 'test-raider',
          parameters: domain => placements(domain) });
        const aggregate = await product.store.loadRoom(roomId);
        const raider = aggregate.envelope.state.pieces.find(piece => piece.id === 'test-raider');
        assert.equal(raider.isOnField, true);
        assert.equal(raider.currentModels, 6);
        assert.equal(raider.activatedPhases.movement, true);
        assert.equal(aggregate.envelope.state.players.player2.passedPhases.movement, true);
        assert.equal(aggregate.envelope.state.activeSideKey, 'player1');
        const evidenceRef = await save('successor.json', { legalUnitOriginApplied: true, sixModelsPlaced: true,
          activationEnded: true, passedOpponentSkipped: true,
          revision: aggregate.stateRevision, stateHash: aggregate.envelope.stateHash, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'coldRecovery', openProduct: open, check: async product => {
        await product.restoreDependencies(roomId, authority);
        const aggregate = await product.store.loadRoom(roomId);
        const successor = JSON.parse(await fs.readFile(path.join(directory, 'successor.json'), 'utf8'));
        assert.equal(aggregate.envelope.stateHash, successor.stateHash);
        assert.equal(aggregate.envelope.state.officialRelocationGeometryPolicy.version, '1.0.0');
        assert.equal((await product.room.replayRoom({ roomId })).matchesCurrent, true);
        const evidenceRef = await save('cold-recovery.json', { stateAndReceiptsPreserved: true,
          revision: aggregate.stateRevision, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
    ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), providerCalls: 0 }));
}
