import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {openWave3EngineeringStoreV1,declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {applyOfficialSelectedRosterResolvedDamageV1} from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {inspectOfficialMissionMarkerControlV2} from '../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';

const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const source=base+'/nova-assault-reactor-impact-v235',oldId='standard-nova-assault-reactor-impact';
const manifestRef=base+'/tabletop-raven-m01-v1/manifest.json',version='2.35.0';
const dir='build/ticket-28-wave3-human-lobby-v1/incremental-pass/impact-threshold',roomId='nova-impact-seven-models';
async function prepareBranch(){
  const oldStore=openWave3EngineeringStoreV1({directory:source,filename:'room.sqlite',readOnly:true});
  let bundle;
  try{bundle=await oldStore.loadReplayBundle(oldId);}finally{oldStore.close();}
  const old=await bindWave3StandardActionRoom({dir:source,manifestRef,initial:bundle.initialEnvelope.state,candidateVersion:version,frozenRuntimeRef:source+'/runtime.json',scenario:'read verified impact prefix'});
  const signed=bundle.privateJournal.filter(x=>x.payload.type==='accepted_transition').map(x=>x.payload.payload.receipt);
  const native=old.open();
  let origin;
  try{
    await native.restoreDependencies(oldId,old.authority);
    const prefix=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:signed.slice(0,4)});
    assert(prefix.ok,prefix.reason);origin=prefix.envelope;
    assert.equal(origin.stateHash,(await read(source+'/menu-r4.json')).stateHash);
  }finally{native.close();}
  const initial=structuredClone(origin.state),target=initial.pieces.find(p=>p.id==='zergling');
  const profile=resolveOfficialEffectiveCombatProfileV1(initial,target),ids=target.models.map(m=>m.id);
  assert.equal(ids.length,12);
  applyOfficialSelectedRosterResolvedDamageV1(initial,target,profile,{casualtyModelIds:ids.slice(7),remainingModelIds:ids.slice(0,7),postDamageMarker:0,
    targetDestroyed:false,shieldedBefore:false,shieldedAfter:false});
  declareWave3EngineeringCoherencyV1(initial,{planIdPrefix:roomId});
  initial.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state:initial});
  return {initial,scene:{source,sourceStateHash:origin.stateHash,sourceRevision:4,conditions:'Seven Zerglings on the same objective before Impact; no impact dice taken from the source.'}};
}
const restored=process.argv.includes('--finish');
let initial,scene;
if(restored){
  const saved=openWave3EngineeringStoreV1({directory:dir,filename:'room.sqlite',readOnly:true});
  try{initial=(await saved.loadReplayBundle(roomId)).initialEnvelope.state;}finally{saved.close();}
  const sourceStateHash=(await read(source+'/menu-r4.json')).stateHash;
  scene={source,sourceStateHash,sourceRevision:4,conditions:'Seven Zerglings on the same objective before Impact; no impact dice taken from the source.'};
}else({initial,scene}=await prepareBranch());
const bound=await bindWave3StandardActionRoom({dir,manifestRef,initial,candidateVersion:version,scenario:scene,...(restored?{frozenRuntimeRef:dir+'/runtime.json'}:{})});
const room=bound.open();
const observation=head=>{
  const p=head.state.pieces.find(p=>p.id==='zergling');
  const marker=inspectOfficialMissionMarkerControlV2({state:head.state,matchBinding:head.matchBinding}).markerResults.find(m=>m.markerId==='mission-marker-4');
  return {models:p.currentModels,supply:p.currentSupply,controller:marker.nextControlSideKey,totals:marker.supplyTotals,result:marker.result,contestingSides:Object.keys(marker.contestingUnitsBySide).filter(k=>marker.contestingUnitsBySide[k].length),stateHash:head.stateHash};
};
try{
  const seats=await room.create(roomId,bound.authority);
  for(;;){
    const head=(await room.store.loadRoom(roomId)).envelope,rev=head.stateRevision,side=head.state.activeSideKey;
    const {legalSpace}=await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    const ds=legalSpace.parameterDomains,fs=legalSpace.finiteActions;
    if(!rev){
      const before=observation(head);
      assert.deepEqual([before.models,before.supply,before.controller],[7,1,'player2']);
      await save(dir+'/before.public.json',before);
    }
    const impact=head.state.log.flatMap(l=>l.events??[]).find(e=>e.type==='impact_damage');
    if(impact){
      const actions=await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head);
      const before=await read(dir+'/before.public.json'),after=observation(head);
      const loss=before.models-after.models;
      assert(loss>0);
      assert.equal(after.supply,0);
      assert.equal(after.totals.player2,0);
      assert.deepEqual(after.contestingSides,['player2']);
      assert.equal(after.controller,'player2');
      assert.match(after.result,/^sole_contestant_(takes|retains)_control$/);
      assert(ds.length+fs.length>0);
      await save(dir+'/result.public.json',{roomId,scene,actions,before,after,loss,damage:impact.stages.totalDamage,thresholdCrossed:loss>0,nextSeat:side,revision:rev,coldExact:true,providerCalls:0});
      console.log('impact',before,after);break;
    }
    assert(rev<9);
    assert.equal(ds.length+fs.length,1,'expected a single pending Impact choice');
    const d=ds[0];let params;
    if(d){
      params={};
      for(const key of d.parameterSchema.required??[]){
        const field=d.parameterSchema[key]??d.parameterSchema.properties?.[key];
        if(key==='allocations')params.allocations=d.parameterSchema.eligibleModels.map(m=>({modelId:m.modelId,targetUnitId:'zergling',dice:m.impactDice}));
        else if(field?.const!==undefined)params[key]=field.const;
        else if(field?.enum)params[key]=field.enum[0];
        else if(field?.type==='array')params[key]=field.items.enum.slice(0,field.minItems??0);
        else throw Error('Missing native choice '+key);
      }
    }
    await room.commit({roomId,credential:seats[side],operationKey:'impact-r'+rev,...(d?{select:r=>r.domainId===d.domainId,parameters:()=>params}:{kind:'finite',select:r=>r.actionKey===fs[0].actionKey})});
  }
}finally{room.close();}
