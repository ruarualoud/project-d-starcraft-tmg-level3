import assert from 'node:assert/strict';
import path from 'node:path';
import { root, tabletop, sourceRef, read, save, registry, sourceContext, ravenRooms }
  from './support/wave3-raven-tabletop-room-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { arrange } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { resolveOfficialEffectiveCombatProfileV1 }
  from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { evaluateOfficialBaseMeasurementV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';

const evidence = tabletop + '/anti-armour-corvid';
const missile = 'unit:raven/anti-armour-missile-movement-phase@1';
const reactor = 'unit:raven/corvid-reactor-any-phase@1';
const sourceScene = 'build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-missile-signed-v1/equipped/authority.json';
const declarations = [{ branch: 'corvid-discount', target: 'stalker', cost: 0 },
  { branch: 'corvid-regular', target: 'zeratul', cost: 1 }];
const getPiece = (state, id) => state.pieces.find(piece => piece.id === id);
const armour = (state, id) => resolveOfficialEffectiveCombatProfileV1(state, getPiece(state, id)).armourThreshold;
const rooms = ravenRooms(evidence, (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({
  context, spatialState: state, definitionIds: [missile, reactor], weaponDefinitionIds: ['unit:raven/railguns-assault-phase@1'],
  includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true,
}));
async function makeState(context) {
  const { state: seed } = await read(sourceScene);
  const units = (ids) => ids.map(id => ({ unitInstanceId: id, recordKey: 'army_units:' + id,
    compositionKind: 'small', upgrades: id === 'raven' ? [{ upgradeName: 'Corvid Reactor' }] : [] }));
  const { state } = createOfficialReleaseRosterStateV2({
    context, candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:raynor_s_raiders', tacticalCardRecordKeys: [], units: units(['marine', 'raven']) },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nerazim', tacticalCardRecordKeys: ['tactical_cards:robotics_facility'],
        units: units(['stalker', 'zeratul']) },
    },
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    includeAbilitySourcePhases: true, characteristicDefinitionIds: [missile, reactor], canonicalResourceTypes: true,
    includeCharacteristicConsumers: true, includeStructureTargeting: true, includeActionPerformedStatusLifecycle: true, includeMelee: true,
  });
  for (const key of ['board','officialDeploymentGeometryBinding','engagementScale','armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor','supplyLossLedger','officialModelGapTransitPolicy','officialMissionSupplyProfile',
    'phase','round','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','log']) state[key] = structuredClone(seed[key]);
  arrange(getPiece(state, 'raven'), 20, 15);
  arrange(getPiece(state, 'stalker'), 28.6, 15);
  arrange(getPiece(state, 'zeratul'), 26, 21);
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'tabletop-corvid-' });
  return refreshOfficialReleaseRosterDerivedStateV2({ context, state });
}
function distance(state, target) {
  return evaluateOfficialBaseMeasurementV1({ state, dataBundle: state.officialModelBaseGeometryDataBundle,
    source: { kind: 'model', unitId: 'raven', modelId: 'raven-model-1' },
    target: { kind: 'model', unitId: target, modelId: target + '-model-1' } }).distanceMilliInches;
}
async function compile(product) {
  const context = await sourceContext(product);
  const state = await makeState(context);
  const geometry = state.officialModelBaseGeometryDataBundle.profiles.find(row => row.recordKey === 'army_units:raven');
  assert.equal(geometry.ravenOutlineSource.kind, 'annotated_assembly_estimate');
  const distances = { stalker: distance(state, 'stalker'), zeratul: distance(state, 'zeratul') };
  assert(distances.stalker < distances.zeratul && distances.zeratul < 12000);
  for (const { branch } of declarations) {
    await rooms.registerScene(product, context, branch, state, { declaredPositions: true, fullMatch: false });
  }
  const ref = await save(evidence + '/compile.json', { distances, geometryHash: state.officialModelBaseGeometryDataBundle.bundleHash });
  return { evidenceRef: ref, checkpointRef: ref };
}
async function cast(product, { branch, target, cost }) {
  const { native, authority, runtime, roomId, prefix } = await rooms.openBranch(product, branch);
  try {
    const seats = await native.create(roomId, authority);
    const journal = await native.store.loadReplayBundle(roomId);
    const start = journal.initialEnvelope.state;
    const menu = runtime.enumerate(start).parameterDomains.filter(row => row.definitionId === missile);
    assert.equal(menu.length, 2);
    const byCost = row => row.constraints.resourceCostsByChoice.default.effectiveResourceCost;
    const selected = menu.find(row => byCost(row) === cost);
    const other = target === 'stalker' ? 'zeratul' : 'stalker';
    assert.deepEqual(menu.find(row => byCost(row) === 0).parameterSchema.targetUnitId.enum, ['stalker']);
    assert.deepEqual(menu.find(row => byCost(row) === 1).parameterSchema.targetUnitId.enum.toSorted(), ['stalker', 'zeratul']);
    const cards = cost ? ['faction:player1'] : [];
    assert(selected.parameterSchema.paymentCardInstanceIds.enum.some(option => JSON.stringify(option) === JSON.stringify(cards)));
    const committed = await native.commit({ roomId, credential: seats.player1, operationKey: 'missile',
      select: row => row.definitionId === missile && byCost(row) === cost,
      parameters: () => ({ activeUnitId: 'raven', paymentCardInstanceIds: cards, targetUnitId: target }) });
    const events = committed.preview.core.result.events;
    const payment = events.find(e => e.type === 'ability_resource_paid');
    const effect = events.find(e => e.type === 'raven_anti_armour_debuff_applied');
    assert.equal(payment.resourceCost, cost);
    assert.equal(payment.printedResourceCost, 1);
    assert.equal(payment.discountSourcePieceId, cost ? null : 'raven');
    assert.deepEqual(payment.exhaustedCardInstanceIds, cards);
    assert.equal(effect.targetPieceId, target);
    assert.equal(effect.expiresAt, 'cleanup_and_refresh');
    const applied = (await native.store.loadRoom(roomId)).envelope.state;
    assert.equal(armour(applied, target), armour(start, target) + 1);
    assert.equal(armour(applied, other), armour(start, other));
    assert(!runtime.enumerate(applied).parameterDomains.some(row => row.definitionId === missile));
    assert(applied.activeAbilityUseHistory.some(row => row.pieceId === 'raven' && row.routeId === missile));
    await native.commit({ roomId, credential: seats.player1, operationKey: 'finish',
      choice: { actionType: 'finish_activation', pieceId: 'raven' }, parameters: () => ({}) });
    const final = await native.store.loadRoom(roomId);
    assert.equal(final.envelope.state.activeSideKey, 'player2');
    const ref = await save(prefix + '/result.json', { definitions: [missile, reactor], target, cost, cards,
      before: armour(start, target), after: armour(applied, target), otherUnchanged: true,
      expiresAt: effect.expiresAt, repeatAbsent: true, successor: final.envelope.state.activeSideKey,
      stateHash: final.envelope.stateHash, revision: final.stateRevision });
    return { evidenceRef: ref, checkpointRef: ref };
  } finally { native.close(); }
}
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
await runProductBoundaryCheck({ directory: path.join(root, evidence, 'verification'),
  identity: { factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef, contractVersion: 'tabletop-corvid-cost-v1' },
  steps: [
    { name: 'compile', repairRef, openProduct: registry, check: compile },
    { name: 'consume', repairRef, openProduct: registry, check: product => cast(product, declarations[0]) },
    { name: 'successor', repairRef, openProduct: registry, check: product => cast(product, declarations[1]) },
    { name: 'coldRecovery', repairRef, openProduct: registry,
      check: product => rooms.coldReplay(product, declarations.map(row => row.branch)) },
  ],
});
