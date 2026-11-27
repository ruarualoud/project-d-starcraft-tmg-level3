import assert from 'node:assert/strict';
import {read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom, resolveWave3StandardContext, assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import {projectOfficialContextualSupplyValueV1} from '../packages/rule-atoms/official-contextual-supply-projection-v1.mjs';
import {inspectOfficialMissionMarkerControlV2} from '../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs';
import {canOfficialUnitBeAbilityTargetV1} from '../packages/rule-atoms/official-decoy-rules-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = base + '/omega-structure-v260';
const version = '2.60.0';
const sourceId = 'unit:omega_worm/structure-any-phase@1';
const actor = 'kerrigan';
const wormId = 'player2-omega-worm';
const roomId = 'omega-structure-v260';
let branch = 'factory', native;

function fieldOne(state, key, xInches) {
  const p = state.pieces.find(p => p.id === key);
  assert.equal(p.models.length, 1);
  const position = { isOnField: true, xInches, yInches: 4 };
  Object.assign(p, position, { leadingModelId: p.models[0].id, isInReserves: false, deploymentStatus: 'deployed' });
  Object.assign(p.models[0], position);
  state.reserveManifestBySide[p.sideKey].find(r => r.pieceId === key).deploymentStatus = 'deployed';
}

async function saved(name) {
  return read(dir + '/' + name).catch(e => { if (e.code !== 'ENOENT') throw e; return null; });
}

try {
  const before = await read(dir + '/before.json');
  assert.deepEqual(before.contesters, [wormId]); assert.equal(before.nextControlSide,'player2');
  const source = await read(base + '/inherited-zerg-standard-2.53.0/malignant.json');
  const context = await resolveWave3StandardContext(await read(source.manifestRef), 'area_ability_inputs');
  const { state: opening } = prepareOfficialStandardReleaseOpeningV2({ releaseMatchVersion: version,
    releaseContext: context, dataset: context.dataset, snapshot: context.snapshot, recipes: source.recipes,
    missionRecordKey: source.mission, deploymentRecordKey: source.deployment, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY });
  const definition = opening.officialStructureSourceBundle.definitions.find(r => r.definitionId === sourceId);
  assert(definition);
  const scenario = { twoHumanSeats: true, declaredFieldedUnits: [actor,'nova_stealth_mode'], targetPoint: before.position,
    missionMarker: before.markerId, purpose: 'does_a_lone_structure_control_the_marker' };
  const bound = await bindWave3StandardActionRoom({ initial: opening, manifestRef: source.manifestRef, dir,
    candidateVersion: version, scenario });
  const state = structuredClone(opening);
  fieldOne(state, actor, 12); fieldOne(state, 'nova_stealth_mode', 24);
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: roomId });
  state.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({state});
  const authority = bound.authorityFor(state, scenario);
  native = bound.open();
  const seats = await native.create(roomId, authority);
  branch = 'summon';
  let head = await native.store.loadRoom(roomId);
  while (!head.envelope.state.pieces.some(p => p.id === wormId)) {
    const s = head.envelope.state;
    const side = s.activeSideKey || s.firstPlayerSideKey;
    const r = head.stateRevision;
    assert(r < 3, 'public mission start, priority choice and summon are the only expected steps');
    if (r === 0) await native.commit({roomId,credential:seats[side],operationKey:'open-mission',kind:'finite',choice:{actionType:'resolve_mission_start_of_round'}});
    if (r === 1) await native.commit({roomId,credential:seats[side],operationKey:'choose-first',kind:'finite',
      select:c => c.action.actionType === 'choose_first_actor' && (c.action.chosenFirstActorSideKey ?? c.action.sourceAction?.chosenFirstActorSideKey) === 'player2'});
    if (r === 2) await native.commit({roomId,credential:seats[side],operationKey:'summon-on-marker',
      select:d => d.actionType === 'use_active_ability' && d.effectKind === 'omega_network' && d.pieceId === actor,
      parameters:d => ({activeUnitId:actor,paymentCardInstanceIds:d.parameterSchema.paymentCardInstanceIds.enum[0],
        xMilliInches:Math.round(before.position.xInches*1000), yMilliInches:Math.round(before.position.yInches*1000)})});
    head = await native.store.loadRoom(roomId);
  }
  const placed = head.envelope.state;
  const checkpoint = await saved('summon.json');
  if (checkpoint) assert.equal(checkpoint.stateHash, head.envelope.stateHash);
  else {
    const worm = placed.pieces.find(p => p.id === wormId);
    const query = bound.runtime.queryStructureConstraints(placed, wormId);
    assert.equal(query.sourceDefinitionId, sourceId); assert.equal(query.sourceFeatureHash, definition.sourceFeatureHash);
    for (const flag of ['activationProhibited','ordinaryActionsProhibited','missionControlProhibited','missionContestProhibited',
      'abilityUnitTargetProhibitedUnlessExplicitException']) assert.equal(query.constraints[flag], true, flag);
    assert(!canOfficialUnitBeAbilityTargetV1(placed, worm));
    assert(canOfficialUnitBeAbilityTargetV1(placed, placed.pieces.find(p => p.id === actor)));
    const supply = projectOfficialContextualSupplyValueV1({state:placed,pieceId:wormId,context:'mission_marker_control'});
    assert.equal(supply.effectiveSupply,0); assert(supply.applicableDefinitionIds.includes(sourceId));
    const inspected = inspectOfficialMissionMarkerControlV2({state:placed}).markerResults.find(m=>m.markerId===before.markerId);
    assert.equal(inspected.ineligibleUnits.find(u=>u.unitId===wormId)?.reason,'structure');
    assert.equal(inspected.nextControlSideKey,null);
    const actions = await assertWave3StandardRoomColdReplayV1(bound, authority, roomId, head.envelope);
    await save(dir+'/summon.json',{sourceId,featureHash:definition.sourceFeatureHash,queries:query.constraints,
      supply:supply.effectiveSupply, stateHash:head.envelope.stateHash, actions, coldExact:true});
  }
  branch = 'round_end_marker_control';
  const end = structuredClone(placed);
  end.phase = 'cleanup'; end.activeSideKey = end.firstPlayerSideKey;
  delete end.selectedRosterActivationWindow;
  const childId = roomId+'-cleanup';
  const childAuthority = bound.authorityFor(end, {...scenario, conditionalPhase:'cleanup', parentStateHash:head.envelope.stateHash});
  const grants = await native.create(childId,childAuthority);
  let child = await native.store.loadRoom(childId);
  if (child.stateRevision===0) await native.commit({roomId:childId,credential:grants[end.firstPlayerSideKey],operationKey:'determine-marker-control',
    kind:'finite',choice:{actionType:'determine_current_product_mission_marker_control'}});
  child = await native.store.loadRoom(childId);
  const final = child.envelope.state;
  const event = final.log.flatMap(r=>r.events||[]).find(e=>e.type==='mission_marker_control_determined' && e.round===end.round);
  const marker = event?.markerResults.find(row=>row.markerId===before.markerId);
  assert(marker, 'the official room must actually determine control');
  assert.equal(marker.ineligibleUnits.find(row=>row.unitId===wormId)?.reason,'structure');
  assert.equal(marker.contestingUnitsBySide.player2.some(row=>row.unitId===wormId),false);
  assert.equal(marker.nextControlSideKey,null);
  const stored = final.board.missionMarkers.find(m=>m.id===before.markerId);
  assert.equal(stored.controlSideKey,null);
  assert.equal(stored.controlDeterminedAt.controlResolutionHash,event.controlResolutionHash);
  const menu = await native.room.legalSpace({roomId:childId,seatToken:grants[final.firstPlayerSideKey].seatToken});
  assert(menu.ok,menu.reason);
  const next = [...menu.legalSpace.parameterDomains,...menu.legalSpace.finiteActions.map(x=>x.action)].map(r=>r.actionType);
  assert(next.length>0);
  const actions = await assertWave3StandardRoomColdReplayV1(bound,childAuthority,childId,child.envelope);
  await save(dir+'/result.json',{version,sourceId,before,after:{owner:stored.controlSideKey,reason:'structure',controlResolutionHash:event.controlResolutionHash},
    actions,next,round:final.round,conditionalPhase:'cleanup',summonStateHash:head.envelope.stateHash,finalStateHash:child.envelope.stateHash,coldExact:true,modelCalls:0});
} catch(error) {
  await save(dir+'/stop-'+Date.now()+'.json',{branch,error:error.message,code:error.code,stage:error.failureStage,frames:error.stack?.split('\n').slice(0,6)});
  throw error;
} finally { native?.close(); }
