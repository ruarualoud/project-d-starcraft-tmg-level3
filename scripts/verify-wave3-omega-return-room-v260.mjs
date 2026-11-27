import assert from 'node:assert/strict';
import path from 'node:path';
import {root, read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {assertWave3StandardRoomColdReplayV1, bindWave3StandardActionRoom, resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {declareWave3EngineeringCoherencyV1, openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {initializeOfficialMatchRoundSupplyV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {evaluateOfficialBaseMeasurementV1} from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import {deriveOfficialModelSurfacePlacementV2} from '../packages/rule-atoms/official-engagement-graph-v2.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const parent = 'omega-structure-v260';
const dir = base + '/omega-return-v260';
const roomId = 'omega-return-v260';
const version = '2.60.0';
const wormId = 'player2-omega-worm';
const definitionId = 'unit:omega_worm/omega-network-any-phase@1';
const piece = (state, key) => state.pieces.find(row => row.id === key);

function measure(state) {
  const ref = key => ({kind:'model', unitId:key, modelId:piece(state,key).models[0].id});
  return evaluateOfficialBaseMeasurementV1({state, dataBundle:state.officialModelBaseGeometryDataBundle,
    source:ref('queen'), target:ref(wormId)});
}

function placeQueen(state, x, y) {
  const queen = piece(state,'queen');
  assert.equal(queen.models.length,1);
  const pose = {xInches:x, yInches:y, isOnField:true};
  Object.assign(queen,pose,{leadingModelId:queen.models[0].id, isInReserves:false, deploymentStatus:'deployed'});
  Object.assign(queen.models[0],pose);
  state.reserveManifestBySide.player2.find(row=>row.pieceId===queen.id).deploymentStatus='deployed';
}

let room, stage='parent';
try {
  const certificate = await read(base+'/'+parent+'/summon.json');
  const store = openWave3EngineeringStoreV1({directory:path.join(root,base,parent),filename:'room.sqlite'});
  let state;
  try {
    const head = await store.loadRoom(parent);
    assert.equal(head.envelope.stateHash,certificate.stateHash);
    assert.equal(certificate.coldExact,true);
    state = structuredClone(head.envelope.state);
  } finally { store.close(); }
  stage = 'round_two_condition';
  const worm = piece(state,wormId);
  assert.equal(worm.structureRules.specialAbilitiesDisabledThroughRound,1);
  Object.assign(state,{round:2, phase:'movement', stage:'activation_phases',activeSideKey:'player2',firstPlayerSideKey:'player2'});
  state.phaseFirstActorByRound['2:movement']={phase:'movement',round:2,chosenFirstActorSideKey:'player2',markerHolderSideKey:'player2'};
  delete state.selectedRosterActivationWindow;
  const y = worm.yInches;
  const referenceX = worm.xInches + 6;
  placeQueen(state,referenceX,y);
  const endX = Math.round(referenceX*1000) - measure(state).distanceMilliInches;
  const startX = endX+1000;
  for (const x of [endX,endX+500,startX]) {
    placeQueen(state,x/1000,y);
    assert.equal(deriveOfficialModelSurfacePlacementV2(state,{pieceId:'queen',modelId:piece(state,'queen').models[0].id}).elevation,'ground');
    if (x===endX) assert.equal(measure(state).baseToBaseContact,true);
  }
  assert.equal(measure(state).distanceMilliInches,1000);
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:roomId});
  initializeOfficialMatchRoundSupplyV1(state,true);
  const source = await read(base+'/inherited-zerg-standard-2.53.0/malignant.json');
  const context = await resolveWave3StandardContext(await read(source.manifestRef),'area_ability_inputs');
  const {state:opening} = prepareOfficialStandardReleaseOpeningV2({releaseMatchVersion:version,releaseContext:context,
    dataset:context.dataset,snapshot:context.snapshot,recipes:source.recipes,missionRecordKey:source.mission,
    deploymentRecordKey:source.deployment,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY});
  const scenario = {twoHumanSeats:true,conditionalRound:2,initialQueenDistanceMilliInches:1000,sourceRoom:parent,
    signedSummonStateHash:certificate.stateHash,objective:'source_bound_omega_network_return'};
  const bound = await bindWave3StandardActionRoom({manifestRef:source.manifestRef,initial:opening,dir,candidateVersion:version,
    frozenRuntimeRef:base+'/'+parent+'/runtime.json',scenario});
  const authority = bound.authorityFor(state,scenario);
  room = bound.open();
  const seats = await room.create(roomId,authority);
  let head = await room.store.loadRoom(roomId);
  const isReturn = d => d.actionType==='resolve_unit_lifecycle_consumer' && d.definitionId===definitionId
    && d.effectKind==='omega_network_return' && d.pieceId==='queen';
  async function menu(sideKey) {
    const answer=await room.room.legalSpace({roomId,seatToken:seats[sideKey].seatToken});
    assert(answer.ok,answer.reason);
    return answer.legalSpace;
  }
  stage='move_to_contact';
  if (head.stateRevision===0) {
    assert(!(await menu('player2')).parameterDomains.some(isReturn));
    await room.commit({roomId,credential:seats.player2,operationKey:'queen-to-worm',choice:{actionType:'move',pieceId:'queen'},
      parameters:()=>({leadingModelId:piece(state,'queen').models[0].id,path:[{xMilliInches:endX,yMilliInches:Math.round(y*1000),elevation:'ground'}],placements:[]})});
    head=await room.store.loadRoom(roomId);
  }
  stage='return_after_move';
  const startingSupply=state.officialRoundSupplyState.onTableSupplyBySide.player2;
  if (head.stateRevision===1) {
    const moved=head.envelope.state;
    assert(measure(moved).baseToBaseContact);
    assert.equal(moved.selectedRosterActivationWindow?.pieceId,'queen');
    const space=await menu('player2');
    const offered=space.parameterDomains.filter(isReturn);
    await save(dir+'/contact.json',{stateHash:head.envelope.stateHash,revision:head.stateRevision,
      distanceMilliInches:measure(moved).distanceMilliInches,actionTypes:space.parameterDomains.map(d=>d.actionType),
      offered:offered.length,startingSupply,sourceRoom:parent});
    assert.equal(offered.length,1);
    await room.commit({roomId,credential:seats.player2,operationKey:'return-queen',select:isReturn,
      parameters:d=>({activeUnitId:d.pieceId})});
    head=await room.store.loadRoom(roomId);
  }
  stage='successor_and_cold';
  const final=head.envelope.state;
  const queen=piece(final,'queen');
  assert.equal(head.stateRevision,2);
  assert.equal(queen.isOnField,false);
  assert(queen.isInReserves && queen.models.every(m=>m.isOnField===false && m.xInches===undefined && m.yInches===undefined));
  assert.equal(final.reserveManifestBySide.player2.find(row=>row.pieceId==='queen').deploymentStatus,'in_reserves');
  const finalSupply=final.officialRoundSupplyState.onTableSupplyBySide.player2;
  assert.equal(startingSupply-finalSupply,queen.currentSupply);
  assert.equal(final.activeSideKey,'player1');
  assert(!final.selectedRosterActivationWindow);
  const history=final.unitLifecycleUseHistory.at(-1);
  assert.equal(history.definitionId,definitionId);
  assert.equal(history.sourceInstanceId,wormId);
  const space=await menu(final.activeSideKey);
  const next=[...new Set([...space.parameterDomains,...space.finiteActions.map(c=>c.action)].map(a=>a.actionType))];
  assert(next.length>0);
  const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head.envelope);
  await save(dir+'/result.json',{version,scenario,definitionId,actions,sourceInstanceId:history.sourceInstanceId,
    startingSupply,finalSupply,released:queen.currentSupply,nextSide:final.activeSideKey,next,
    finalStateHash:head.envelope.stateHash,coldExact:true,modelCalls:0});
} catch(error) {
  await save(dir+'/stop-'+Date.now()+'.json',{stage,code:error.code,message:error.message,frames:error.stack?.split('\n').slice(0,6)});
  throw error;
} finally {room?.close();}
