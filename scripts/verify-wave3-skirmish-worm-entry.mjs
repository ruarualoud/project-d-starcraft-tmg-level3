import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {openWave3EngineeringStoreV1,declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';

const parent='build/ticket-28-wave3-human-lobby-v1/incremental-pass',source=parent+'/t28-entry-skirmish';
const original='t28-entry-skirmish',roomId='t28-worm-skirmish',dir=parent+'/'+roomId;
const store=openWave3EngineeringStoreV1({directory:source,filename:'room.sqlite',readOnly:true});
let envelope;
try{envelope=(await store.loadReplayBundle(original)).initialEnvelope;}finally{store.close();}
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Skirmish');
const state=structuredClone(envelope.state),actor=state.pieces.find(p=>p.id==='player2-kerrigan');
assert.equal(state.armyCompositionUpgradeAuditsBySide.player2.armyResourceBudgetResult.mineralBudget,500);
let positioned=false;
for(const [x,y] of [[26,3],[23,3],[20,5],[15,4],[18,9],[22,12]]){
  Object.assign(actor,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:actor.models[0].id,xInches:x,yInches:y});
  assert.equal(actor.models.length,1);
  Object.assign(actor.models[0],{isOnField:true,xInches:x,yInches:y});
  try{declareWave3EngineeringCoherencyV1(state,{planIdPrefix:roomId});positioned=true;break;}
  catch(e){if(e.failureStage!=='scene_geometry')throw e;}
}
assert(positioned,'no legal origin in the sampled coordinates');
state.reserveManifestBySide.player2.find(p=>p.pieceId===actor.id).deploymentStatus='deployed';
if(state.officialRoundSupplyState)state.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state});
const scene={sourceRoom:original,sourceInitialHash:envelope.stateHash,condition:'Kerrigan already deployed',version:'2.88.0'};
const bound=await bindWave3StandardActionRoom({manifestRef:setup.releaseRef,initial:state,dir,candidateVersion:scene.version,scenario:scene});
const native=bound.open();
let revision;
try{
  const seats=await native.create(roomId,bound.authority);
  for(;;){
    const head=(await native.store.loadRoom(roomId)).envelope,s=head.state,side=s.activeSideKey;
    revision=head.stateRevision;
    const {legalSpace}=await native.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    const ds=legalSpace.parameterDomains,fs=legalSpace.finiteActions;
    const worm=s.pieces.find(p=>p.id==='player2-omega-worm');
    if(worm){
      assert(worm.isOnField&&!worm.isDestroyed);
      const rules=bound.runtime.queryStructureConstraints(s,worm.id);
      assert.equal(rules.constraints.missionControlProhibited,true);
      const actions=await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head);
      assert(ds.length+fs.length>0);
      await save(dir+'/result.public.json',{roomId,version:scene.version,scene,scale:s.engagementScale,budget:500,revision,round:s.round,
        actions,owner:actor.id,created:worm.id,where:worm.models.map(m=>[m.xInches,m.yInches]),sourceDefinition:rules.sourceDefinitionId,
        supply:worm.currentSupply,nextSeat:side,successorCount:ds.length+fs.length,coldExact:true,stateHash:head.stateHash,providerCalls:0});
      console.log('Skirmish Worm',revision,worm.id);break;
    }
    assert(revision<3);
    if(revision<2){
      const action=revision?'choose_first_actor':'resolve_mission_start_of_round';
      await native.commit({roomId,credential:seats[side],operationKey:'r'+revision,kind:'finite',
        select:f=>f.action.actionType===action&&(!revision||(f.action.chosenFirstActorSideKey??f.action.sourceAction?.chosenFirstActorSideKey)==='player2')});
      continue;
    }
    assert.equal(side,'player2');
    const d=ds.find(d=>d.actionType==='use_active_ability'&&d.effectKind==='omega_network'&&d.pieceId===actor.id);
    assert(d,'Omega Network not offered to Kerrigan');
    const raw=bound.runtime.enumerate(s,{sideKey:side}).parameterDomains.find(r=>r.domainId===d.domainId);
    let params;
    const rejected=new Set();
    for(const y of [4,8,12,16,20]){for(const x of [28,24,20,16,12]){
      const arg={activeUnitId:actor.id,paymentCardInstanceIds:d.parameterSchema.paymentCardInstanceIds.enum[0],xMilliInches:x*1000,yMilliInches:y*1000};
      try{bound.runtime.instantiate(s,raw,arg,{sideKey:side});params=arg;break;}
      catch(e){if(!/GEOMETRY|OVERLAP|OUTSIDE|GAP|RANGE|DISTANCE|PLACEMENT|TERRAIN|ENEMY_SEPARATION/.test(e.message))throw e;rejected.add(e.message);}
    }if(params)break;}
    assert(params,'none of the sampled legal-space points qualified: '+[...rejected].join(', '));
    await native.commit({roomId,credential:seats[side],operationKey:'use-omega-network',select:r=>r.domainId===d.domainId,parameters:()=>params});
  }
}catch(e){await save(dir+'/stop-'+Date.now()+'.public.json',{revision,reason:e.message});throw e;}
finally{native.close();}
