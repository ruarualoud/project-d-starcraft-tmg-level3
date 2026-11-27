import assert from 'node:assert/strict';
import { read, save, registry, sourceContext, ravenRooms } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { projectOfficialCharacteristicStatusFamilyModifiersV1, resolveOfficialEffectiveCombatProfileV1, OFFICIAL_RAVEN_DESTROYED_SOURCE_FAQ_V13 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialCurrentProductCasualtyDomainV1, resolveOfficialCurrentProductCasualtyDomainV1, applyOfficialSelectedRosterResolvedDamageV1 } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { deriveOfficialEngagementGraphV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { OFFICIAL_AUTO_TURRET_GAUSS_CANNON_DEFINITION_ID } from '../packages/rule-atoms/official-overwatch-attack-policy-v1.mjs';
import { commitWave3RangedBatchV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const original = 'build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/raven-turret-from-entry-v1/overwatch-assault/source-linked-shrapnel-gauss-before.json';
const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const out = 'build/ticket-28-wave3-dead-raven/shrapnel';
const branch = 'dead-raven-gauss';
const previous = await read(base + '/raven-standard-v228/factory-state.json');
const manifest = await read(base + '/tabletop-raven-m01-v1/manifest.json');
const context = await resolveWave3StandardContext(manifest, 'area_ability_inputs');
const unit = (key, upgradeNames = []) => ({unitInstanceId:key, recordKey:'army_units:' + key, compositionKind:'small', upgradeNames});
function opening(version) {
  return prepareOfficialStandardReleaseOpeningV2({
    releaseContext:context, releaseMatchVersion:version, dataset:context.dataset, snapshot:context.snapshot,
    recipes:{player1:{factionRecordKey:'tactical_cards:raynor_s_raiders',units:[unit('marine'),unit('raven',['Internal Tech Module','Explosive Shrapnel Shells'])],tacticalCardRecordKeys:[]},
      player2:{factionRecordKey:'tactical_cards:zerg_swarm',units:[unit('zergling')],tacticalCardRecordKeys:['tactical_cards:accelerating_creep']}},
    armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY, missionRecordKey:previous.officialMissionSetupBinding.missionRecordKey,
    deploymentRecordKey:previous.officialDeploymentGeometryBinding.deploymentRecordKey,
  });
}
const current = opening('2.99.3'), old = opening('2.99.2');
assert.deepEqual(current.pendingNativeDefinitionIds, []);
assert.equal(current.state.officialRavenDestroyedSourceFaq, OFFICIAL_RAVEN_DESTROYED_SOURCE_FAQ_V13.entry);
assert.equal(old.state.officialRavenDestroyedSourceFaq, undefined);
const {envelope} = await read(original);
const state = structuredClone(envelope.state);
const turret = state.pieces.find(p => p.officialUnitRecordKey === 'army_units:auto_turret');
const raven = state.pieces.find(p => p.id === turret.specialDeploymentSourcePieceId);
function surge(board, weaponName = 'Gauss Cannon') {
  return projectOfficialCharacteristicStatusFamilyModifiersV1(board.officialCharacteristicStatusFamilySourceBundle, board,
    {pieceId:turret.id, context:{weaponName, attackKind:'ranged', targetPieceId:'zealot'}}).surgeDice;
}
assert.equal(surge(state), 'D3+1');
const profile = resolveOfficialEffectiveCombatProfileV1(state,raven);
const loss = createOfficialCurrentProductCasualtyDomainV1({targetPiece:raven,targetProfile:profile,
  incomingDamage:profile.hitPoints + profile.shield, visibleModelIds:raven.models.map(m=>m.id),
  engagementGraph:deriveOfficialEngagementGraphV2(state), attackResolutionHash:envelope.stateHash,
  rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash});
const selection = loss.legalSelections.find(s => s.casualtyModelIds.length === 1);
assert(selection);
applyOfficialSelectedRosterResolvedDamageV1(state,raven,profile,resolveOfficialCurrentProductCasualtyDomainV1(loss,selection.selectionHash));
// This archived component room bound its round occupancy to the component, and the kill ledger to its mission.
state.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({state,expectedRulesRuntimeHash:envelope.state.officialRoundSupplyState.rulesRuntimeHash});
assert(raven.isDestroyed && !raven.isOnField && raven.currentModels === 0);
assert.equal(surge(state), null);
state.officialRavenDestroyedSourceFaq = current.state.officialRavenDestroyedSourceFaq;
assert.equal(surge(state), 'D3+1');
assert.equal(surge(state,'Unrelated weapon'),null);
const unfunded = structuredClone(state);
const buyer = unfunded.pieces.find(p => p.id === raven.id);
buyer.selectedUpgradeNames = [];
buyer.equipment = [];
assert.equal(surge(unfunded), null);
const unrelated = structuredClone(state);
unrelated.pieces.find(p => p.id === turret.id).specialDeploymentSourcePieceId = 'marine';
assert.equal(surge(unrelated), null);
await save(out + '/factory.public.json',{previous:'2.99.2',candidate:'2.99.3',faq:OFFICIAL_RAVEN_DESTROYED_SOURCE_FAQ_V13,
  sourceRevision:envelope.stateRevision, sourceStateHash:envelope.stateHash, living:'D3+1', historicalDead:null,
  candidateDead:'D3+1', wrongCreator:null, wrongGun:null, noUpgrade:null, providerCalls:0});

const rooms = ravenRooms(out, (roomContext, spatialState) => createOfficialCharacteristicStatusComponentRuntimeV2({
  context:roomContext,spatialState,definitionIds:['unit:raven/internal-tech-module-movement-phase@1','unit:raven/explosive-shrapnel-shells-assault-phase@1'],
  includeMelee:true,includeRanged:true,includeArmourChoices:true,includePrecisionChoices:true,weaponDefinitionIds:[OFFICIAL_AUTO_TURRET_GAUSS_CANNON_DEFINITION_ID],
}));
const product = registry();
try {
  const scenario = {condition:'Source destroyed before the signed turret response',source:original,sourceStateHash:envelope.stateHash,releasePolicy:state.officialRavenDestroyedSourceFaq};
  await rooms.registerScene(product,await sourceContext(product),branch,state,scenario);
  const {native, authority, runtime, roomId, directory, prefix} = await rooms.openBranch(product,branch);
  try {
    const seats = await native.create(roomId,authority);
    const shot = await commitWave3RangedBatchV1({directory,native,runtime,roomId,credentials:seats,attackerSideKey:'player1',
      attackerPieceId:turret.id,targetPieceId:'zealot',weaponName:'Gauss Cannon',operationKey:'shrapnel',selectPoolParameters:poolParameters});
    assert.equal(shot.event.stages.effects.surgeMatched,true);
    assert.equal(shot.event.stages.hit.dice,6);
    assert(!shot.after.envelope.state.pendingOfficialAutoTurretOverwatch);
    await save(prefix+'/result.json',{scenario,roomId,shooter:turret.id,target:'zealot',surgeMatched:true,surgeDice:surge(state),
      rolls:shot.event.stages.effects.surgeRolls, successorSide:shot.after.envelope.state.activeSideKey,
      stateHash:shot.after.envelope.stateHash, revision:shot.after.stateRevision, providerCalls:0});
  } finally {native.close();}
  await rooms.coldReplay(product,[branch]);
} finally {product.close();}
