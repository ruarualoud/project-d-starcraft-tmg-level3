import assert from 'node:assert/strict';
import path from 'node:path';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1, openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { initializeOfficialMatchRoundSupplyV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const version = process.argv[2] ?? '2.60.0';
assert(['2.60.0', '2.61.0'].includes(version));
const roomId = version === '2.60.0' ? 'omega-network-deployment-v260' : 'omega-network-deployment-v261';
const dir = base + '/' + roomId;
const wormId = 'player2-omega-worm';
const hydraId = 'player2-hydralisk';
const queenId = 'player2-queen';
const raptorId = 'player2-kerrigan-raptor';
const signedParent = 'omega-structure-v260';
const preflightRef = base + '/wave3-omega-lifecycle-deploy-horizontal-formation-preflight.public.json';
const oldSummonRef = base + '/wave3-omega-network-summoned-checkpoint.json';
const recipeRef = base + '/inherited-zerg-standard-2.51.0/kerrigan.json';
const inheritedRuntime = version === '2.60.0' ? base + '/roachling-standard-v260/runtime.json' : undefined;
const frozenRuntimeRef = inheritedRuntime ?? dir + '/runtime.json';
const piece = (state, id) => state.pieces.find(p => p.id === id);

function fieldRosterUnit(state, id, poses) {
  const unit = piece(state, id);
  assert.equal(unit.models.length, poses.length);
  for (const model of unit.models) {
    const pose = poses.find(p => p.id === model.id);
    assert(pose && Number.isFinite(pose.xInches) && Number.isFinite(pose.yInches), model.id);
    Object.assign(model, { xInches: pose.xInches, yInches: pose.yInches, isOnField: true });
  }
  const lead = unit.models[0];
  Object.assign(unit, { leadingModelId: lead.id, xInches: lead.xInches, yInches: lead.yInches,
    isOnField: true, isInReserves: false, deploymentStatus: 'deployed' });
  state.reserveManifestBySide[unit.sideKey].find(row => row.pieceId === id).deploymentStatus = 'deployed';
}

let room;
try {
  const [recipe, proof, historical, certificate] = await Promise.all([
    read(recipeRef), read(preflightRef), read(oldSummonRef), read(base + '/' + signedParent + '/summon.json'),
  ]);
  assert(proof.geometryOnly && !proof.deploySubmitted && certificate.coldExact);
  const context = await resolveWave3StandardContext(await read(recipe.manifestRef), 'area_ability_inputs');
  const { state: opening } = prepareOfficialStandardReleaseOpeningV2({
    releaseMatchVersion: version, releaseContext: context, dataset: context.dataset, snapshot: context.snapshot,
    recipes: recipe.recipes, missionRecordKey: recipe.mission, deploymentRecordKey: recipe.deployment,
    armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  });
  const state = structuredClone(opening);
  if (version === '2.61.0') assert.equal(state.officialSpatialAuraScope, 'battlefield_only_v1');
  const parentStore = openWave3EngineeringStoreV1({ directory: path.join(root, base, signedParent), filename: 'room.sqlite' });
  let worm;
  try {
    const parent = await parentStore.loadRoom(signedParent);
    assert.equal(parent.envelope.stateHash, certificate.stateHash);
    worm = structuredClone(piece(parent.envelope.state, wormId));
    const parentCard = parent.envelope.state.cardResources.player2.find(c => c.officialCardRecordKey === 'tactical_cards:kerrigan_s_swarm');
    const card = state.cardResources.player2.find(c => c.officialCardRecordKey === parentCard.officialCardRecordKey);
    assert.equal(card.sourceRecordHash, parentCard.sourceRecordHash);
  } finally { parentStore.close(); }
  const historicalWorm = piece(historical.state, wormId);
  const spawn = historical.events.find(e => e.type === 'omega_worm_set_on_battlefield' && e.pieceId === worm.id);
  assert.equal(historicalWorm.sourceRecordHash, worm.sourceRecordHash);
  assert.equal(worm.models.length, 1);
  assert.equal(worm.models[0].id, historicalWorm.models[0].id);
  assert.equal(worm.sourceRecordHash, state.officialGeneratedUnitDataBundle.profiles.find(p => p.recordKey === worm.officialUnitRecordKey).sourceRecordHash);
  assert.equal(worm.structureRules.specialAbilitiesDisabledThroughRound, 1);
  const origin = { xInches: spawn.xMilliInches / 1000, yInches: spawn.yMilliInches / 1000 };
  assert.equal(historicalWorm.xInches, origin.xInches);
  assert.equal(historicalWorm.yInches, origin.yInches);
  // This is a declared round-two position. The new room imports the generated unit, never a transition or quota.
  const signedPosition = { xInches: worm.xInches, yInches: worm.yInches };
  Object.assign(worm, origin);
  Object.assign(worm.models[0], origin);
  assert(!piece(state, wormId));
  state.pieces.push(worm);
  fieldRosterUnit(state, raptorId, piece(historical.state, raptorId).models);
  const nova = piece(state, 'nova_stealth_mode');
  fieldRosterUnit(state, nova.id, [{ id: nova.models[0].id, xInches: 34, yInches: 4 }]);
  Object.assign(state, { round: 2, stage: 'activation_phases', phase: 'movement',
    activeSideKey: 'player2', firstPlayerSideKey: 'player2' });
  state.phaseFirstActorByRound['2:movement'] = { round: 2, phase: 'movement', markerHolderSideKey: 'player2', chosenFirstActorSideKey: 'player2' };
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: roomId });
  initializeOfficialMatchRoundSupplyV1(state, true);
  const scenario = { twoHumanSeats: true, conditionalRound: 2, phase: 'movement', signedParent,
    signedSummonStateHash: certificate.stateHash, signedPosition, declaredWormPosition: origin,
    recordedPositionRef: oldSummonRef, formationRef: preflightRef, rosterRecipeRef: recipeRef, frozenRuntimeRef,
    objective: 'omega_network_deployment_supply_cap' };
  const bound = await bindWave3StandardActionRoom({ manifestRef: recipe.manifestRef, initial: opening, dir,
    candidateVersion: version, frozenRuntimeRef: inheritedRuntime, scenario });
  const authority = bound.authorityFor(state, scenario);
  room = bound.open();
  const seats = await room.create(roomId, authority);
  const head = await room.store.loadRoom(roomId);
  assert.equal(head.stateRevision, 0, 'refuse to prepare over a progressed room');
  const q = await room.room.legalSpace({ roomId, seatToken: seats.player2.seatToken });
  assert(q.ok, q.reason);
  const menu = q.legalSpace;
  function deployment(id) {
    const matches = menu.parameterDomains.filter(d => d.actionType === 'deploy' && d.pieceId === id
      && d.constraints.entrySegments.some(s => s.segmentId === proof.wormSegmentId));
    assert.equal(matches.length, 1, id);
    const domain = matches[0];
    const source = domain.constraints.entrySegments.find(s => s.segmentId === proof.wormSegmentId);
    assert.equal(source.definitionId, proof.definitionId);
    assert.equal(source.sourcePieceId, wormId);
    assert.equal(source.sourceModelId, worm.models[0].id);
    assert(source.sourceRouteHash && source.sourceFootprintHash);
    assert.equal(source.round, 2);
    assert.equal(source.supplyLimit, 2);
    assert.equal(source.usedSupply, 0);
    assert.equal(source.remainingSupply, proof.remainingEntrySupply);
    return { pieceId: id, domainId: domain.domainId, requestedSupply: domain.constraints.supply.requestedSupply,
      modelProfiles: domain.constraints.modelProfiles.map(({modelId, baseShape, baseWidthMilliInches, baseDepthMilliInches}) =>
        ({modelId, baseShape, baseWidthMilliInches, baseDepthMilliInches})), entry: source };
  }
  const priorFailureRef = base + '/omega-network-deployment-v260/before.json';
  const restoredDeployChoices = [];
  if (version === '2.61.0') {
    const failure = await read(priorFailureRef);
    assert.equal(failure.candidate, '2.60.0');
    for (const {pieceId, reason} of failure.affected) {
      assert.equal(reason, 'MODEL_BASE_GEOMETRY_TARGET_UNIT_INVALID');
      const option = menu.parameterDomains.find(d => d.pieceId === pieceId && d.actionType === 'deploy');
      assert(option, 'deployment still missing for ' + pieceId);
      assert(option.constraints.entrySegments.some(s => ['top', 'bottom', 'left', 'right'].includes(s.side)));
      restoredDeployChoices.push(pieceId);
    }
  }
  const hydralisk = deployment(hydraId);
  const queen = deployment(queenId);
  assert.equal(hydralisk.requestedSupply, 2);
  assert.equal(queen.requestedSupply, 1);
  const ids = [proof.parameters.leadingModelId, ...proof.parameters.placements.map(p => p.modelId)];
  assert.deepEqual(hydralisk.modelProfiles.map(p => p.modelId).sort(), ids.sort());
  for (const profile of hydralisk.modelProfiles) {
    assert.equal(profile.baseShape, proof.profile.shape);
    assert.equal(profile.baseWidthMilliInches, proof.profile.width);
    assert.equal(profile.baseDepthMilliInches, proof.profile.depth);
  }
  const supply = head.envelope.state.officialRoundSupplyState;
  assert(supply.availableSupplyBySide.player2 >= hydralisk.requestedSupply + queen.requestedSupply);
  const afterRead = await room.store.loadRoom(roomId);
  assert.equal(afterRead.envelope.stateHash, head.envelope.stateHash);
  assert.equal(afterRead.stateRevision, head.stateRevision);
  await save(dir + '/prepared.json', { version, roomId, scenario, stateRevision: head.stateRevision,
    stateHash: head.envelope.stateHash, matchBindingHash: head.envelope.matchBindingHash, legalSpaceHash: menu.legalSpaceHash,
    pool: supply.supplyPoolBySide.player2, onTable: supply.onTableSupplyBySide.player2, available: supply.availableSupplyBySide.player2,
    restoredDeployChoices, hydralisk, queen, formationProofHash: proof.formationProofHash, deploymentSubmitted: false, modelCalls: 0 });
} finally { room?.close(); }
