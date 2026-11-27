import assert from 'node:assert/strict';
import path from 'node:path';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';

const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const original=base+'/nova-holo-standard-v233/prefix', parentId='wave3-nova-formal-round-end-prefix';
const manifestRef=base+'/tabletop-raven-m01-v1/manifest.json', dir='build/ticket-28-wave3-griffin-holo-anchor/tactical-payment';
const roomId='wave3-griffin-holo-tactical-payment', version='2.33.0', caster='nova_assault_mode';
const definition='card:nova_covert_ops/griffin-support-any@1';
const source=openWave3EngineeringStoreV1({directory:path.resolve(original),filename:'room.sqlite',readOnly:true});
let bundle;
try{bundle=await source.loadReplayBundle(parentId);}finally{source.close();}
const originalRoom=await bindWave3StandardActionRoom({manifestRef,initial:bundle.initialEnvelope.state,dir:original,candidateVersion:version,
  frozenRuntimeRef:original+'/runtime.json',scenario:{source:parentId}});
const reader=originalRoom.open({readOnly:true});
let start;
try {
  await reader.restoreDependencies(parentId,originalRoom.authority);
  const journal=bundle.privateJournal.filter(j=>j.payload.type==='accepted_transition').map(j=>j.payload.payload.receipt).slice(0,2);
  const replay=reader.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});
  assert(replay.ok,replay.reason);start=replay.envelope;
  assert.equal(start.stateHash,journal.at(-1).postStateHash);
}finally{reader.close();}
const scenario={parent:parentId,revision:2,stateHash:start.stateHash,condition:'original signed initiative; pay for the decoy using the tactical card and reserve the faction card for Griffin'};
const bound=await bindWave3StandardActionRoom({manifestRef,initial:bundle.initialEnvelope.state,dir,candidateVersion:version,scenario});
const authority=bound.authorityFor(start.state,scenario);
function plan(action){
  for(let a=action;a;a=a.sourceAction)if(a.unitLifecyclePlan)return a.unitLifecyclePlan;
  throw Error('Missing native lifecycle plan');
}
const room=bound.open();
let stage='public menu';
try {
  const seats=await room.create(roomId,authority);
  const side=start.state.activeSideKey, seat=seats[side];
  const head=async()=>(await room.store.loadRoom(roomId)).envelope;
  let h=await head();
  if(h.stateRevision===0){
    stage='pay for Holo without using Griffin';
    const legal=await room.room.legalSpace({roomId,seatToken:seat.seatToken});
    const domain=legal.legalSpace.parameterDomains.find(d=>d.definitionId==='unit:nova_assault_mode/holo-decoy-movement-phase@1');
    assert(domain);
    const payment=domain.parameterSchema.paymentCardInstanceIds.enum.find(cards=>cards.length&&!cards.includes('faction:player1'));
    assert(payment,'need a genuine alternate CP source');
    const actor=h.state.pieces.find(p=>p.id===caster).models[0];
    const base=h.state.officialModelBaseGeometryDataBundle.profiles.find(p=>p.recordKey==='army_units:holo_decoy');
    const coordinate={xMilliInches:Math.round(actor.xInches*1000+(actor.baseWidthInches*1000+base.baseWidthMilliInches)/2),yMilliInches:Math.round(actor.yInches*1000)};
    await room.commit({roomId,credential:seat,operationKey:'decoy',select:r=>r.domainId===domain.domainId,
      parameters:()=>({activeUnitId:caster,paymentCardInstanceIds:payment,coordinate})});
    h=await head();
  }
  if(h.stateRevision===1){
    stage='decline the optional decoy move';
    await room.commit({roomId,credential:seat,operationKey:'decline-move',kind:'finite',select:r=>r.action.actionType==='decline_summoned_move'});
    h=await head();
  }
  const board=h.state,child=board.pieces.find(p=>p.officialUnitRecordKey==='army_units:holo_decoy'&&p.isOnField);
  assert(child);
  if(h.stateRevision===2){
    stage='read paid faction ability';
    const legal=await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(legal.ok,legal.message);
    const domain=legal.legalSpace.parameterDomains.find(d=>d.definitionId===definition&&d.pieceId===caster);
    assert(domain,'Griffin must be available in the parent activation');
    const payment=domain.parameterSchema.paymentCardInstanceIds.enum[0];
    const point=child.models[0], origin=board.pieces.find(p=>p.id===caster).models[0];
    const angle=Math.atan2(point.yInches-origin.yInches,point.xInches-origin.xInches);
    stage='find a legal footprint with the decoy as sole reference';
    let selected; const refusals=new Set();
    for(const delta of [0,0.2,-0.2,0.4,-0.4]){
      for(const distance of [12.5,12.75,12.25,13,12,11.75,11.5,11]){
        const coordinate={xMilliInches:Math.round(1000*(point.xInches+distance*Math.cos(angle+delta))),
          yMilliInches:Math.round(1000*(point.yInches+distance*Math.sin(angle+delta)))};
        const parameters={activeUnitId:caster,paymentCardInstanceIds:payment,coordinate};
        try{
          const result=bound.runtime.queryGriffinPlacement(board,caster,parameters);
          const proof=plan(result.result.action).canonicalParameters.friendlyRangeProof;
          if(proof.qualifyingFriendlyUnits.length===1&&proof.qualifyingFriendlyUnits[0].pieceId===child.id){
            selected={parameters,proof,queryHash:result.queryReceiptHash};break;
          }
        }catch(e){if(!/ANCHOR_RANGE|TERRAIN|FOOTPRINT|BOUNDARY|OVERLAP|PLACEMENT|OUT_OF_BOUNDS|OFF_BOARD|ENEMY_GAP/.test(e.message))throw e;refusals.add(e.message);}
      }
      if(selected)break;
    }
    assert(selected,'No decoy-only witness in sampled directions: '+[...refusals].join(', '));
    const control=structuredClone(board),removed=control.pieces.find(p=>p.id===child.id);
    removed.isOnField=false;for(const model of removed.models)model.isOnField=false;
    assert.throws(()=>bound.runtime.queryGriffinPlacement(control,caster,selected.parameters),/FRIENDLY_ANCHOR_RANGE_REQUIRED/);
    await save(dir+'/query.public.json',{...selected,decoy:child.id,owner:side,withoutDecoy:'UNIT_LIFECYCLE_FRIENDLY_ANCHOR_RANGE_REQUIRED',originalStateHash:start.stateHash,castStateHash:h.stateHash});
    stage='sign actual drone placement';
    const applied=await room.commit({roomId,credential:seats[side],operationKey:'griffin-decoy-anchor',select:r=>r.domainId===domain.domainId,parameters:()=>selected.parameters});
    assert.deepEqual(plan(applied.preview.core.action).canonicalParameters.friendlyRangeProof,selected.proof);
    assert(applied.idempotentReplayVerified);
  }
  const done=(await room.store.loadRoom(roomId)).envelope;
  assert.equal(done.stateRevision,3);
  const spawned=done.state.pieces.filter(p=>p.officialUnitRecordKey==='army_units:sabotage_drone'&&p.isOnField);
  assert.equal(spawned.length,1);
  const journal=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,done);
  await save(dir+'/result.public.json',{revision:3,stateHash:done.stateHash,version,decoy:child.id,caster,drone:spawned[0].id,journal,cold:true,providerCalls:0});
}catch(e){await save(dir+'/stop-'+Date.now()+'.public.json',{stage,message:e.message});throw e;}
finally{room.close();}
