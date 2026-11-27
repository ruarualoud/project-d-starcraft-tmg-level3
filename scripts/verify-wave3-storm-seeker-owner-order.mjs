import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening,bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {poolParameters} from './verify-wave3-lethal-hologram-v1.mjs';

const dir='build/ticket-28-wave3-storm-seeker-owner-order', roomId='wave3-storm-seeker-owner-order';
const ref=await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-storm-gale-standard-2.76.0/coverage.json');
const version='2.99.3', missile='unit:raven/seeker-missile-movement-phase@1';
const scene={positions:{marine:[23,4],high_templar:[16,4],raven:[10,10],zealot:[17,10]},
  formationOffsets:{marine:[[0,0],[-1,0],[1,0],[0,1],[-1,1],[1,1]]},providerCalls:0};
function hasDefinition(action,id){
  for(let row=action;row;row=row.sourceDomain??row.sourceAction)if(row.definitionId===id)return true;
  return false;
}
let stage='opening',revision;
try {
  const state0=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference:{...ref,compareReadOnlyAdmission:true},candidateVersion:version,scene});
  const bound=await bindWave3StandardActionRoom({manifestRef:ref.manifestRef,initial:state0,dir,candidateVersion:version,scenario:scene});
  const room=bound.open();
  try {
    const seats=await room.create(roomId,bound.authority);
    for(;;){
      const head=(await room.store.loadRoom(roomId)).envelope,s=head.state,side=s.activeSideKey;
      revision=head.stateRevision;
      if(s.phase==='combat'){
        const journal=await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head);
        const storm=journal.indexOf('resolve_psionic_storm_assault_end'),seeker=journal.indexOf('resolve_raven_seeker_phase_end');
        const priority=await read(dir+'/priority.public.json');
        assert(storm>=0&&seeker>=0&&storm!==seeker);
        assert.equal(storm<seeker,priority.side==='player2');
        assert.equal(s.officialRavenSeekerPhaseEndHistory.length,1);
        assert.equal(s.officialRavenSeekerPhaseEndHistory[0].outcome,'resolved');
        await save(dir+'/result.public.json',{version,roomId,priority,revision,journal,source:s.officialRavenSeekerPhaseEndHistory[0],
          nextPhase:s.phase,stateHash:head.stateHash,cold:true,providerCalls:0});break;
      }
      assert(revision<40,'mixed end did not settle');
      const menu=await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
      assert(menu.ok,menu.message);
      const ds=menu.legalSpace.parameterDomains,fs=menu.legalSpace.finiteActions;
      const finite=name=>fs.find(r=>r.action.actionType===name);
      const paid=s.characteristicStatusAbilityHistory?.find(r=>r.definitionId===missile);
      const stormCast=s.officialPsionicStormCenters?.length;
      let row=finite('resolve_mission_start_of_round')??fs.find(r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey==='player2');
      let params={};
      if(!row&&side==='player2'&&s.phase==='movement'&&!stormCast){
        row=ds.find(d=>d.actionType==='cast_psionic_storm'&&d.pieceId==='high_templar');
        if(row){const payment=row.constraints.payments.find(p=>p.length);
          params=bound.runtime.queryPsionicStormCast(s,'high_templar',{coordinate:{xMilliInches:20000,yMilliInches:4000},paymentCardInstanceIds:payment}).result.canonicalParameters;}
      }
      if(!row&&side==='player1'&&s.phase==='movement'&&!paid){
        row=ds.find(d=>hasDefinition(d,missile)&&d.parameterSchema.targetUnitId?.enum?.includes('zealot'));
        if(row){const cost=row.constraints.resourceCostsByChoice.default.effectiveResourceCost;
          params={activeUnitId:'raven',targetUnitId:'zealot',paymentCardInstanceIds:cost?['faction:player1']:[]};}
      }
      const effect=finite('resolve_psionic_storm_assault_end')??finite('resolve_raven_seeker_phase_end');
      if(!row&&effect){
        assert(paid&&stormCast,'both declarations must precede the shared window');
        const resolved=s.officialRavenSeekerPhaseEndHistory?.some(h=>h.round===s.round)
          ||s.officialPsionicStormPhaseEndHistory?.some(h=>h.round===s.round&&h.phase==='assault');
        if(!resolved){
          const holder=s.phaseFirstActorByRound[s.round+':assault']?.markerHolderSideKey??s.firstPlayerSideKey;
          assert.equal(side,holder);
          assert.equal(effect.action.actionType,side==='player2'?'resolve_psionic_storm_assault_end':'resolve_raven_seeker_phase_end');
          const other=side==='player2'?'resolve_raven_seeker_phase_end':'resolve_psionic_storm_assault_end';
          assert(!finite(other));
          await save(dir+'/priority.public.json',{revision,side,markerHolder:holder,action:effect.action.actionType,lockedOut:other,missilePaid:paid.planHash});
        }
        row=effect;
      }
      if(!row){
        row=ds.find(d=>d.actionType==='pass_reaction_family_window')??finite('pass_reaction_family_window');
        const pool=ds.find(d=>d.parameterSchema.required.some(k=>['casualtySelectionHash','casualtyModelIds','convertedFailedArmourDieIndices'].includes(k)));
        if(!row&&pool){row=pool;params=poolParameters(pool);}
      }
      row??=ds.find(d=>d.actionType==='finish_activation'&&((d.pieceId==='raven'&&paid)||(d.pieceId==='high_templar'&&stormCast)));
      row??=finite('resolve_psionic_storm_movement_end')??finite('complete_psionic_storm_assault_phase')??finite('pass')??(fs.length===1?fs[0]:null);
      assert(row,'Unexpected menu '+JSON.stringify([side,s.phase,ds.map(r=>r.actionType),fs.map(r=>r.action.actionType)]));
      stage=(row.action??row).actionType;
      await room.commit({roomId,credential:seats[side],operationKey:'r'+revision+'-'+stage,...(row.domainId?
        {select:r=>r.domainId===row.domainId,parameters:()=>params}:{kind:'finite',select:r=>r.actionKey===row.actionKey})});
    }
  }finally{room.close();}
}catch(e){await save(dir+'/stop-'+Date.now()+'.public.json',{stage,revision,message:e.message});throw e;}
