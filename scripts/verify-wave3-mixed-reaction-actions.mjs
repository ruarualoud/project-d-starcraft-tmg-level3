import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, restoreOrPreparePositionedStandardOpening, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { initializeOfficialMatchRoundSupplyV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';

import { wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';

const kind = process.argv[2];
assert(['khassar','medic'].includes(kind));
const version='2.85.0', medic=kind==='medic';
const base='build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/'+kind;
const qualified=!medic && process.argv.includes('--qualified');
const layout=qualified?await read(base+'/action/qualified-layout.public.json'):null;
const dir=base+(qualified?'/qualified-action':'/action');
const admission=await read(base+'/opening.public.json');
const source=await read(admission.sourceRef);
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Standard');
const roomId='reaction-'+kind+'-285'+(qualified?'-qualified':'');
const caster='twilight_templar__high_templar_', marine='player1-marine-1', healer='player1-medic';
const healId='unit:medic/life-support-any-phase@1', lungeId='unit:hydralisk/lunge-assault-phase@1';
function castNearTarget(runtime, state, domain) {
  const target=state.pieces.find(piece=>piece.id===marine).models[0];
  const paymentCardInstanceIds=domain.constraints.payments[0];
  for(const [dx,dy] of [[0,-1.7],[0,-2],[0,2.8],[-2.6,0],[2.6,0]]){
    const coordinate={xMilliInches:Math.round((target.xInches+dx)*1000),yMilliInches:Math.round((target.yInches+dy)*1000)};
    const parameters={coordinate,paymentCardInstanceIds};
    try {
      return runtime.queryPsionicStormCast(state,caster,parameters).result.canonicalParameters;
    } catch(error) {
      if(!/^PSIONIC_STORM_(TOKEN_OVERLAPS|.*LINE_OF_SIGHT|.*RANGE|.*TERRAIN)/.test(error.message))throw error;
    }
  }
  throw Error('No verified storm centre in the named target samples');
}
const reference={manifestRef:setup.releaseRef,manifestHash:admission.manifestHash,recipes:source.recipes,total:admission.definitionCount,
  mission:source.mission??setup.missionRecordKey,deployment:setup.deploymentRecordKey};
const scene={providerCalls:0,positionedAtStart:true,
  positions:medic?{[caster]:[13,4],[marine]:[22,4],[healer]:[25.8,4]}:
    (layout?.positions??{high_templar:[8,3],adept:[12,3],roach:[17,3],hydralisk:[13.5,8]}),
  ...(!medic && !qualified ? {translationCandidates:[[0,0],[6,0],[12,0],[18,0],[24,0],[0,8],[6,8],[12,8],[18,8],[24,8],[0,16],[6,16],[12,16]]} : {}),
  formationOffsets:medic?{[marine]:[[0,0],[-1,0],[1,0],[0,1],[-1,1],[1,1]]}:{}};
const loadOptional=ref=>read(ref).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
function fields(d, skip=[]) {
  const schema=d.parameterSchema;
  return Object.fromEntries((schema.required??[]).filter(key=>!skip.includes(key)).map(key=>{
    const f=schema[key]??schema.properties?.[key];
    if (f?.const!==undefined) return [key,f.const];
    if (f?.enum) return [key,f.enum[0]];
    if (f?.items?.enum) return [key,f.items.enum.slice(0,f.minItems??0)];
    throw Error('Missing parameter selection '+d.actionType+' '+key);
  }));
}
function lungeParameters(runtime, state, domain) {
  const source=state.pieces.find(p=>p.id===domain.pieceId);
  const target=state.pieces.find(p=>p.id===state.pendingOfficialReactionWindow.context.rangedTargetDesignation.attackerPieceId);
  const payment=fields(domain,['move']);
  for(const leader of source.models.filter(m=>!m.isDestroyed)) {
    for(const dest of target.models.filter(m=>!m.isDestroyed)) {
      const dx=dest.xInches-leader.xInches,dy=dest.yInches-leader.yInches;
      const length=Math.hypot(dx,dy);
      // Sample the closest legal endpoint outside enemy engagement. Rules certify all bases and the path.
      for(const clearance of [1.001,1,1.002,0.001]) {
        const separation=(leader.baseDepthInches+dest.baseDepthInches)/2+clearance;
        if(!(length>separation)) continue;
        const endpoint={xMilliInches:Math.round((dest.xInches-dx/length*separation)*1000),
          yMilliInches:Math.round((dest.yInches-dy/length*separation)*1000)};
        try {
          const result=runtime.completeLungeMove(state,domain,{...payment,move:{leadingModelId:leader.id,path:[endpoint]}});
          if(result) return result.canonicalParameters;
        } catch(error) {
          if(!/^(?:SELECTED_SPATIAL_|MODEL_BASE_GEOMETRY_PLACEMENT_|LUNGE_MOVE_(?:GLOBAL_PROOF_REQUIRED|ENDS_FURTHER|LEADER_OR_FORMATION_PROOF_REQUIRED))/.test(error.message)) throw error;
        }
      }
    }
  }
  throw Error('No certified Lunge endpoint among sampled routes');
}
const at = (f, type) => f.find(a=>a.action.actionType===type);
let stage='setup', rev=0;
try{
 const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:version,scene,mapConfiguration:wave3HumanMapConfiguration(setup)});
 let bound=await bindWave3StandardActionRoom({manifestRef:setup.releaseRef,initial,dir,candidateVersion:version,scenario:scene});
 const native=bound.open();
 const board=structuredClone(initial);
 const actor=medic?'player2':'player1';
 const opened=await native.store.loadRoom(roomId);
 if(!opened){
   const sideKey=initial.firstPlayerSideKey;
   const first=bound.runtime.enumerate(initial,{sideKey}).candidates.find(a=>a.actionType==='resolve_mission_start_of_round'&&a.isEnabled);
   const started=structuredClone(bound.runtime.apply(initial,first,{sideKey}).state);
   Object.assign(board,started,{phase:medic?'movement':'assault',activeSideKey:actor,firstPlayerSideKey:actor,stage:'activation_phases'});
   delete board.currentProductMatchLifecycle;
   board.phaseFirstActorByRound??={};board.phaseFirstActorByRound[board.round+':'+board.phase]={round:board.round,phase:board.phase,chosenFirstActorSideKey:actor,markerHolderSideKey:actor};
   if(!medic) board.pieces.find(p=>p.id==='adept').activatedPhases.assault=true;
   initializeOfficialMatchRoundSupplyV1(board,true);
   await save(dir+'/origin.public.json',{scene,phase:board.phase,actor,conditionedRecipientActivated:!medic});
 }
 const previous=opened ? await native.store.loadReplayBundle(roomId) : null;
 const start=previous?.initialEnvelope?.state??board;
 const auth=bound.authorityFor(start,scene);
 async function drive(id,authority,branch) {
  const seats=await native.create(id,authority);
  const baseRev=(await native.store.loadRoom(id)).stateRevision;
  for(let count=0;count<35;count++){
   const head=(await native.store.loadRoom(id)).envelope;rev=head.stateRevision;stage=branch+' r'+rev;
   const s=head.state,side=s.activeSideKey,window=s.pendingOfficialReactionWindow, events=s.log.flatMap(r=>r.events??[]);
   const resumed=medic?events.find(e=>e.type==='automatic_hits_damage_reaction_resumed'&&e.targetId===marine):
     events.find(e=>e.type==='khassar_non_lethal_damage_after_shot'&&e.originalActorUnitId==='high_templar');
   if(resumed && !window && (medic?!s.pendingOfficialAutomaticHits:!s.pendingOfficialKhassarShot)){
     assert(medic?resumed.chanceReusedWithoutReroll:resumed.pieceId==='adept');
     const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,id,head);
     const outcome={revision:rev,side,actions,cold:true,stateHash:head.stateHash,settlement:resumed,
       reactionHistory:s.officialReactionHistory?.map(r=>({id:r.definitionId,side:r.sideKey})),resources:s.cardResources[medic?'player1':'player2'].map(c=>[c.officialCardRecordKey,c.readiness])};
     await save(dir+'/'+branch+'.public.json',outcome);return;
   }
   const m=await native.room.legalSpace({roomId:id,seatToken:seats[side].seatToken});
   assert(m.ok,m.reason);const {parameterDomains:ds,finiteActions:fs}=m.legalSpace;
   let d,f,args;
   if(window){
     const trigger=window.triggerKind;
     const offer=ds.find(x=>x.definitionId===(medic?healId:lungeId));
     if(offer){
       if(!await loadOptional(dir+'/decision.public.json')){
         await save(dir+'/fork-state.json',s);
         await save(dir+'/decision.public.json',{revision:rev,trigger,offered:offer.definitionId,hash:head.stateHash});
       }
       if(branch==='main'){d=offer;args=medic?fields(d):lungeParameters(bound.runtime,s,d);}
       else d=ds.find(x=>x.actionType==='pass_reaction_family_window');
     }else d=ds.find(x=>x.actionType==='pass_reaction_family_window');
   }else if(medic && !s.officialPsionicStormCenters?.length && !events.some(e=>e.type==='psionic_storm_token_set')){
     d=ds.find(x=>x.actionType==='cast_psionic_storm'&&x.pieceId===caster);
     if(d)args=castNearTarget(bound.runtime,s,d);
   }else if(!medic&&!events.some(e=>e.type==='khassar_faction_card_exhausted')){
     d=ds.find(x=>x.actionType==='delegate_khassar_shot' && x.constraints.recipientUnitId==='adept'&&x.parameterSchema.targetUnitId.enum.includes('roach'));
     if(!d) throw Error('SCENE_DELEGATED_TARGET_UNAVAILABLE: '+JSON.stringify(ds.filter(x=>x.actionType==='delegate_khassar_shot').map(x=>[x.pieceId,x.weaponName,x.parameterSchema.targetUnitId?.enum])));
     args={targetUnitId:'roach'};
   }
   if(!d&&!f){
     const special=fs.find(x=>/psionic_storm/.test(x.action.actionType));
     f=special??at(fs,'finish_ranged_attack_sequence');
     d=f?null:ds.find(x=>x.actionType==='finish_activation')??ds.find(x=>/pool|casualt|armour|precision/.test(x.actionType));
     if(!f&&!d) f=fs.find(x=>x.action.actionType==='choose_first_actor' && x.action.chosenFirstActorSideKey===actor)??at(fs,'pass')??(fs.length===1?fs[0]:null);
     if(!f&&!d && ds.length===1) d=ds[0];
   }
   if(!d&&!f) throw Error('No expected step: '+JSON.stringify({phase:s.phase,side,window:window?.triggerKind,
     finite:fs.map(x=>x.action.actionType),domains:ds.map(x=>[x.actionType,x.pieceId,x.weaponName])}).slice(0,1600));
   const type=d?.actionType??f.action.actionType;
   stage=branch+' r'+rev+' '+type;
   const action=d?{select:x=>x.domainId===d.domainId,parameters:()=>args??fields(d)}:{kind:'finite',select:x=>x.actionKey===f.actionKey};
   const receipt=await native.commit({roomId:id,credential:seats[side],operationKey:'r'+rev+'-'+type,...action});
   await save(dir+'/'+branch+'-r'+(rev+1)+'.public.json',{type,side,sourceRevision:rev,trigger:window?.triggerKind,
     definition:d?.definitionId,postStateHash:receipt.result.receipt?.postStateHash??(await native.store.loadRoom(id)).envelope.stateHash});
  }
  throw Error('Expected reaction successor not reached, original revision '+baseRev);
 }
 try{
   const first=medic?'main':'pass',second=medic?'pass':'main';
   if(!await loadOptional(dir+'/'+first+'.public.json')) await drive(roomId,auth,first);
   const decision=await read(dir+'/decision.public.json');
   const fork=await read(dir+'/fork-state.json');
   if(!await loadOptional(dir+'/'+second+'.public.json')) await drive(roomId+'-'+second,bound.authorityFor(fork,{...scene,sourceHash:decision.hash}),second);
   const a=await read(dir+'/main.public.json'),b=await read(dir+'/pass.public.json');
   if(medic){
     assert(a.settlement.damagePool.totalDamageAfterReduction<b.settlement.damagePool.totalDamageAfterReduction);
     assert.equal(a.settlement.originalResolutionHash,b.settlement.originalResolutionHash);
   }else assert(a.reactionHistory?.some(r=>r.id===lungeId)&&!b.reactionHistory?.some(r=>r.id===lungeId));
   await save(dir+'/paired.public.json',{decision,used:a.stateHash,passed:b.stateHash,cold:true,providerCalls:0});
 } finally {native.close();}
} catch(error){await save(dir+'/failure-'+Date.now()+'.public.json',{stage,rev,reason:error.message,cause:error.cause?.message,stack:error.stack.split('\n').slice(1,5)});throw error;}
