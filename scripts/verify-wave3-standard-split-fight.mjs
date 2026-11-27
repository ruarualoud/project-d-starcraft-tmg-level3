import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { restoreOrPreparePositionedStandardOpening, bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { initializeOfficialMatchRoundSupplyV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { resolveOfficialEffectiveCombatProfileV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';

const wounded=process.argv.includes('--wounded');
const roomId = 'standard-split-fight-w3'+(wounded?'-wounded':'');
const dir = 'build/ticket-28-wave3-human-lobby-v1/incremental-pass/split-fight'+(wounded?'-wounded':'');
const version = '2.88.0';
const ref = await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-supply-standard-2.84.0/coverage.json');
const targets = ['adept','high_templar'];
const scene = {
  positions: {zealot:[12,24], adept:[10.2,24], high_templar:[13.8,24]},
  formationOffsets: {zealot:[[0,0],[0,-1],[0,1]], adept:[[0,0],[-1,0],[0,-1],[-1,-1]], high_templar:[[0,0],[0,1]]},
  translationCandidates:[[0,0],[6,-12],[24,0],[30,-12],[0,-18],[6,-20]],
  conditions:['Standard 2000 official opening','conditioned Combat activation',wounded?'defenders have spent shields, one HP before first loss':'unmodified health','natural Room rolls'],
};
function defenderParameters(domain) {
  const args = {};
  for (const key of domain.parameterSchema.required ?? []) {
    const field = domain.parameterSchema[key] ?? domain.parameterSchema.properties?.[key];
    if (field?.const !== undefined) args[key] = field.const;
    else if (field?.enum?.length) args[key] = field.enum[0];
    else if (field?.type === 'array') args[key] = (field.items.enum ?? []).slice(0,field.minItems ?? 0);
    else throw Error('Unsupported public choice '+domain.actionType+' '+key);
  }
  return args;
}
async function marker(native,bound,input,menu,head) {
  const {projection}=await native.room.readRoom(input);
  const port=createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore:native.store,rulesRuntime:bound.rulesRuntime,seatKey:head.state.activeSideKey});
  const tool=createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery:r=>port.query(r)});
  const result=await tool.query({roomProjection:projection,legalSpace:menu,request:{queryKind:'mission_marker_control',arguments:{}}});
  assert.equal(result.status,'exact',JSON.stringify([result.reason,result.details]));
  assert.equal(result.authority.stateHash,head.stateHash);
  return {revision:head.stateRevision,stateHash:head.stateHash,queryReceiptHash:result.queryReceiptHash,markers:result.result.markerResults};
}
const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference:ref,candidateVersion:version,scene});
const bound=await bindWave3StandardActionRoom({manifestRef:ref.manifestRef,initial,dir,candidateVersion:version,scenario:scene});
const native=bound.open();
let phase='create',revision;
try {
  const saved=await native.store.loadRoom(roomId);
  let start=initial;
  if (!saved) {
    const action=bound.runtime.enumerate(initial,{sideKey:initial.activeSideKey}).candidates.find(c=>c.isEnabled&&c.actionType==='resolve_mission_start_of_round');
    assert(action);
    start=structuredClone(bound.runtime.apply(initial,action,{sideKey:initial.activeSideKey}).state);
    Object.assign(start,{phase:'combat',stage:'activation_phases',activeSideKey:'player2'});
    delete start.currentProductMatchLifecycle;
    start.phaseFirstActorByRound ??= {};
    start.phaseFirstActorByRound[start.round+':combat']={round:start.round,phase:'combat',chosenFirstActorSideKey:'player2',markerHolderSideKey:start.firstPlayerSideKey};
    if(wounded)for(const id of targets){
      const piece=start.pieces.find(p=>p.id===id),profile=resolveOfficialEffectiveCombatProfileV1(start,piece);
      const models=piece.models.map(m=>m.id);
      applyOfficialSelectedRosterResolvedDamageV1(start,piece,profile,{casualtyModelIds:[],remainingModelIds:models,
        postDamageMarker:profile.hitPoints-1,targetDestroyed:false,shieldedBefore:true,shieldedAfter:false});
    }
    initializeOfficialMatchRoundSupplyV1(start,true);
  }
  const authority=bound.authorityFor(start,scene);
  const seats=await native.create(roomId,authority);
  for (;;) {
    const head=(await native.store.loadRoom(roomId)).envelope;
    revision=head.stateRevision;
    const side=head.state.activeSideKey,input={roomId,seatToken:seats[side].seatToken};
    const result=await native.room.legalSpace(input);
    assert(result.ok,result.reason);
    const menu=result.legalSpace,ds=menu.parameterDomains,fs=menu.finiteActions;
    const receipts=(await native.store.loadReplayBundle(roomId)).privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
    if(receipts.at(-1)?.action.actionType==='finish_activation'){
      const attacks=receipts.flatMap(r=>r.events).filter(e=>e.type==='close_combat_attack');
      assert.deepEqual(attacks.map(e=>e.targetId).sort(),[...targets].sort());
      assert.equal(side,'player1');
      const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head);
      const before=await read(dir+'/before.public.json'),after=await marker(native,bound,input,menu,head);
      const units=head.state.pieces.filter(p=>targets.includes(p.id)).map(p=>({id:p.id,models:p.currentModels,supply:p.currentSupply,damage:p.damageMarker}));
      await save(dir+'/result.public.json',{roomId,version,scene,revision,attacks,actions,units,before,after,nextSeat:side,coldExact:true,providerCalls:0});
      console.log('verified',revision,JSON.stringify(units));break;
    }
    assert(revision<30);
    let d,f,parameters;
    if(!revision){
      d=ds.find(row=>row.actionType==='fight'&&row.pieceId==='zealot'&&targets.every(t=>row.constraints.targetUnitIds.includes(t)));
      assert(d,'No public split fight: '+JSON.stringify(ds.filter(d=>d.actionType==='fight').map(d=>[d.pieceId,d.constraints.targetUnitIds])));
      const dice=d.constraints.declineCloseRanksAttackDice;
      assert(dice>=2);
      parameters={closeRanksMode:'decline',allocations:targets.map((targetUnitId,i)=>({targetUnitId,dice:i?Math.ceil(dice/2):Math.floor(dice/2)}))};
      for(const key of ['surgeTargetUnitId','criticalTargetUnitId'])if(d.parameterSchema.required.includes(key))parameters[key]=targets[0];
      await save(dir+'/before.public.json',{...await marker(native,bound,input,menu,head),units:head.state.pieces.filter(p=>targets.includes(p.id)).map(p=>({id:p.id,models:p.currentModels,supply:p.currentSupply})),parameters});
    }else{
      d=ds.find(d=>d.actionType==='pass_reaction_family_window')??ds.find(d=>d.parameterSchema.required?.includes('casualtySelectionHash'))
        ??ds.find(d=>d.actionType==='finish_activation'&&d.pieceId==='zealot')??(ds.length===1?ds[0]:undefined);
      if(d)parameters=defenderParameters(d);
      else f=fs.find(r=>r.action.actionType==='finish_activation'&&r.action.pieceId==='zealot')??(fs.length===1?fs[0]:undefined);
    }
    assert(d||f,'Unexpected menu '+JSON.stringify([ds.map(d=>[d.actionType,d.parameterSchema.required]),fs.map(r=>r.action.actionType)]));
    phase=d?.actionType??f.action.actionType;
    const selection=d?{select:r=>r.domainId===d.domainId,parameters:()=>parameters}:{kind:'finite',select:r=>r.actionKey===f.actionKey};
    await native.commit({roomId,credential:seats[side],operationKey:'r'+revision+'-'+phase,...selection});
    console.log(revision+1,side,phase);
  }
}catch(error){await save(dir+'/stop-'+Date.now()+'.public.json',{phase,revision,reason:error.message});throw error;}
finally{native.close();}
