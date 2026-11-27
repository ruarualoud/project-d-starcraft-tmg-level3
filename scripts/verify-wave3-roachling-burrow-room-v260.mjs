import assert from 'node:assert/strict';
import path from 'node:path';
import {read, save, root} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {declareWave3EngineeringCoherencyV1,openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {initializeOfficialMatchRoundSupplyV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {projectOfficialUnitRestrictionsV1} from '../packages/rule-atoms/official-unit-restrictions-v1.mjs';

const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const sourceRoom='roachling-standard-v260',roomId='roachling-burrow-v260',dir=base+'/'+roomId;
const raptorId='player2-kerrigan-raptor';
const burrow='card:hatchery/lie-in-wait-any@1';
const unit=(s,id)=>s.pieces.find(p=>p.id===id);
const cert=await read(base+'/'+sourceRoom+'/summon.json');
assert(cert.coldExact);
let room,stage='signed_parent';
try {
  const sourceStore=openWave3EngineeringStoreV1({directory:path.join(root,base,sourceRoom),filename:'room.sqlite'});
  let initial, state;
  try {
    const h=await sourceStore.loadRoom(sourceRoom);
    assert.equal(h.envelope.stateHash,cert.stateHash);
    initial=(await sourceStore.loadReplayBundle(sourceRoom)).initialEnvelope.state;
    state=structuredClone(h.envelope.state);
  } finally {sourceStore.close();}
  const scene={twoHumanSeats:true,conditionalRound:2,phase:'movement',sourceRoom,sourceStateHash:cert.stateHash,
    sourceParentInReserves:true,controlUnit:raptorId};
  const recipe=await read(base+'/inherited-zerg-standard-2.51.0/kerrigan.json');
  const bound=await bindWave3StandardActionRoom({manifestRef:recipe.manifestRef,initial,dir,candidateVersion:cert.version,
    frozenRuntimeRef:base+'/'+sourceRoom+'/runtime.json',scenario:scene});
  stage='second_round_scene';
  Object.assign(state,{round:2,activeSideKey:'player2',firstPlayerSideKey:'player2',stage:'activation_phases',phase:'movement'});
  delete state.selectedRosterActivationWindow;
  state.phaseFirstActorByRound['2:movement']={round:2,phase:'movement',markerHolderSideKey:'player2',chosenFirstActorSideKey:'player2'};
  const parent=unit(state,cert.sourcePiece);
  Object.assign(parent,{isOnField:false,isInReserves:true,deploymentStatus:'in_reserves'});
  for (const m of parent.models) {m.isOnField=false;delete m.xInches;delete m.yInches;}
  state.reserveManifestBySide.player2.find(r=>r.pieceId===parent.id).deploymentStatus='in_reserves';
  const prior=await read(base+'/wave3-roachling-linked-burrow-positive-control.json');
  const placement=unit(prior.envelope.state,raptorId).models;
  const raptor=unit(state,raptorId);
  assert.equal(raptor.models.length,placement.length);
  for(const m of raptor.models){const point=placement.find(p=>p.id===m.id);assert(point);Object.assign(m,{xInches:point.xInches,yInches:point.yInches,isOnField:true});}
  Object.assign(raptor,{leadingModelId:raptor.models[0].id,isOnField:true,isInReserves:false,deploymentStatus:'deployed',
    xInches:raptor.models[0].xInches,yInches:raptor.models[0].yInches});
  state.reserveManifestBySide.player2.find(r=>r.pieceId===raptor.id).deploymentStatus='deployed';
  // The generated unit keeps its creation/parent evidence into the new round.
  for(const p of [raptor,unit(state,cert.child)])p.activatedPhases.movement=false;
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:roomId});
  initializeOfficialMatchRoundSupplyV1(state,true);
  const authority=bound.authorityFor(state,scene);
  room=bound.open();
  const seats=await room.create(roomId,authority);
  let head=await room.store.loadRoom(roomId);
  stage='same_card_control';
  if(head.stateRevision===0) {
    const q=await room.room.legalSpace({roomId,seatToken:seats.player2.seatToken});
    assert(q.ok,q.reason);
    const rows=q.legalSpace.parameterDomains;
    const can=(id,action)=>rows.some(d=>d.pieceId===id && d.actionType===action);
    const cardFor=id=>rows.find(d=>d.definitionId===burrow && d.pieceId===id);
    const eligibility=projectOfficialUnitRestrictionsV1(head.envelope.state,cert.child);
    const reference=cardFor(raptorId);
    const observations={childCanMove:can(cert.child,'move'),childCanUseCard:!!cardFor(cert.child),
      raptorCanUseCard:!!reference,restrictionSources:eligibility.sourceDefinitionIds};
    await save(dir+'/eligibility.json',observations);
    assert(observations.childCanMove && !observations.childCanUseCard && observations.raptorCanUseCard);
    assert.equal(eligibility.cannotGainBurrowed,true);
    assert.equal(projectOfficialUnitRestrictionsV1(head.envelope.state,raptorId).cannotGainBurrowed,false);
    await room.commit({roomId,credential:seats.player2,operationKey:'hatchery-raptor',select:d=>d.domainId===reference.domainId,
      parameters:d=>({activeUnitId:d.pieceId,paymentCardInstanceIds:[]})});
    head=await room.store.loadRoom(roomId);
  }
  stage='product_successor_and_cold';
  const after=head.envelope.state;
  const events=after.log.at(-1).events;
  assert(events.some(e=>e.type==='burrowed_status_gained' && e.targetPieceId===raptorId && e.sourceDefinitionId===burrow));
  assert(!events.some(e=>e.targetPieceId===cert.child));
  const next=await room.room.legalSpace({roomId,seatToken:seats[after.activeSideKey].seatToken});
  assert(next.ok,next.reason);
  const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head.envelope);
  await save(dir+'/result.json',{version:cert.version,scene,child:cert.child,positive:raptorId,burrow,
    eligibility:await read(dir+'/eligibility.json'),gainedStatus:events.find(e=>e.type==='burrowed_status_gained'),
    nextCount:next.legalSpace.parameterDomains.length+next.legalSpace.finiteActions.length,actions,coldExact:true,stateHash:head.envelope.stateHash,modelCalls:0});
} catch(error) {
  await save(dir+'/stop-'+Date.now()+'.json',{stage,error:error.message,code:error.code,frames:error.stack?.split('\n').slice(0,5)});
  throw error;
} finally {room?.close();}
