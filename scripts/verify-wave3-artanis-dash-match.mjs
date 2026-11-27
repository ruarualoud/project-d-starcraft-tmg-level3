import {poolParameters} from './verify-wave3-lethal-hologram-v1.mjs';
import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening,bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1}
  from './support/wave3-standard-action-room-v1.mjs';
import {initializeOfficialMatchRoundSupplyV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {ARTANIS_DASH_DEFINITION_ID} from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';

const base='build/ticket-28-wave3-human-lobby-v1/remaining-six';
const ref=await read(base+'/web-openings/artanis-2.97.0.public.json');
assert(ref.admitted);
const version='2.98.0';
const recipes=structuredClone(ref.recipes);
recipes.player2.units.push({...structuredClone(recipes.player2.units[0]),unitInstanceId:'second'});
const template=await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-supply-standard-2.84.0/coverage.json');
const reference={...template,recipes,manifestRef:ref.manifestRef,manifestHash:ref.manifestHash};
reference.compareReadOnlyAdmission=true;
const roomId='artanis-dash-298',dir=base+'/'+roomId;
const scene={condition:'Assault. Artanis faces two distinct Marine squads, both within the minimum charge roll.',
  positions:{artanis:[12,8],marine:[12,10.8],second:[15.1,9.35]},
  formationOffsets:{marine:[[0,0],[-1,0],[1,0],[-1,1],[0,1],[1,1]],
    second:[[0,0],[1,0],[0,1],[1,1],[0,-1],[1,-1]]}};
const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:version,scene});
const bound=await bindWave3StandardActionRoom({manifestRef:ref.manifestRef,initial,dir,candidateVersion:version,scenario:scene});
const native=bound.open();
let revision;
try {
  let start=initial;
  if(!await native.store.loadRoom(roomId)) {
    const begin=bound.runtime.enumerate(initial).candidates.find(c=>c.actionType==='resolve_mission_start_of_round'&&c.isEnabled);
    start=structuredClone(bound.runtime.apply(initial,begin,{sideKey:initial.activeSideKey}).state);
    Object.assign(start,{phase:'assault',stage:'activation_phases',activeSideKey:'player1'});
    delete start.currentProductMatchLifecycle;
    start.phaseFirstActorByRound[start.round+':assault']={round:start.round,phase:'assault',chosenFirstActorSideKey:'player1',markerHolderSideKey:start.firstPlayerSideKey};
    initializeOfficialMatchRoundSupplyV1(start,true);
  }
  const authority=bound.authorityFor(start,scene),seats=await native.create(roomId,authority);
  for (;;) {
    const head=(await native.store.loadRoom(roomId)).envelope,state=head.state;
    revision=head.stateRevision;
    const side=state.activeSideKey,cred=seats[side];
    const menu=await native.room.legalSpace({roomId,seatToken:cred.seatToken});
    assert(menu.ok,menu.message||menu.reason);
    const ds=menu.legalSpace.parameterDomains,finite=menu.legalSpace.finiteActions;
    const events=state.log.flatMap(row=>row.events??[]);
    const charges=events.filter(e=>e.type==='charge_succeeded' && e.pieceId==='artanis');
    if(charges.length===2 && !state.officialLightningDashContinuation && !state.pendingAction && side==='player2') {
      assert.deepEqual(charges.map(c=>c.declaredTargetUnitIds),[['marine'],['second']]);
      assert.equal(events.filter(e=>e.type==='impact_triggered_after_successful_charge'&&e.pieceId==='artanis').length,1);
      const payment=state.officialReactionResolutionHistory.flatMap(r=>r.effects).filter(e=>e.definitionId===ARTANIS_DASH_DEFINITION_ID);
      assert.equal(payment.length,1);
      const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head);
      await save(dir+'/result.public.json',{roomId,version,revision,stateHash:head.stateHash,actions,
        charged:charges.map(c=>c.declaredTargetUnitIds),paidEffects:payment.length,impactTriggers:1,coldExact:true,providerCalls:0});
      break;
    }
    assert(revision<22);
    let d,f,params;
    const find=t=>ds.find(r=>r.actionType===t);
    const p=state.pieces.find(p=>p.id==='artanis');
    const foe=state.pieces.find(p=>p.id===(charges.length?'second':'marine'));
    if(state.pendingOfficialReactionWindow) {
      d=ds.find(r=>r.definitionId===ARTANIS_DASH_DEFINITION_ID) || find('pass_reaction_family_window');
      assert(d);
      params=d.definitionId===ARTANIS_DASH_DEFINITION_ID
        ? {paymentCardInstanceIds:d.parameterSchema.paymentCardInstanceIds.const,followupTargetUnitId:'second'} : {};
      if(d.definitionId)assert.deepEqual(d.parameterSchema.followupTargetUnitId.enum,['second']);
    }else if((d=find('resolve_charge'))) {
      const leader=p.models[0];
      const target=charges.length ? foe.models.reduce((lowest,m)=>m.yInches<lowest.yInches?m:lowest) : foe.models[0];
      const span=Math.round(target.baseWidthInches*500)+Math.round(leader.baseWidthInches*500);
      // Approach the exposed flank of the second squad, clear of the first.
      const diagonal=Math.ceil(span/Math.SQRT2);
      const end={xMilliInches:Math.round(target.xInches*1000)-(charges.length?diagonal:0),
        yMilliInches:Math.round(target.yInches*1000)-(charges.length?diagonal:span),elevation:'ground',supportTerrainIds:[]};
      params={outcome:'success',path:[end],placements:[]};
    }else if((d=ds.find(r=>r.actionType==='resolve_impact' && r.parameterSchema.required?.includes('allocations')))) {
      assert.equal(charges.length,1);
      params={allocations:d.parameterSchema.eligibleModels.map(m=>({modelId:m.modelId,targetUnitId:'marine',dice:m.impactDice}))};
    }else if((f=finite.find(r=>r.action.actionType==='roll_declared_charge'))) {
    }else if((d=ds.find(r=>r.actionType==='charge'&&r.pieceId==='artanis')) && charges.length<2) {
      if(charges.length)assert.deepEqual(Object.keys(d.constraints.eligibleTargetModelIdsByUnitId),['second']);
      params={leadingModelId:p.models[0].id,targets:[{unitId:foe.id,modelId:foe.models[0].id}]};
    }else if((d=ds.find(r=>r.actionType==='finish_activation'&&r.pieceId==='artanis'))) {
      params={};
    }else if(ds.length===1) {
      d=ds[0];params=poolParameters(d);
    }else {
      assert.equal(finite.length,1,JSON.stringify(ds.map(r=>r.actionType)));d=null;f=finite[0];
    }
    await native.commit({roomId,credential:cred,operationKey:'dash-'+revision,...(d?{select:r=>r.domainId===d.domainId,
      parameters:()=>params}:{kind:'finite',select:r=>r.actionKey===f.actionKey})});
    console.log(roomId,'r'+(revision+1),d?.actionType??f.action.actionType);
  }
}catch(error){await save(dir+'/stop-'+Date.now()+'.public.json',{revision,reason:error.message});throw error;}finally{native.close();}
