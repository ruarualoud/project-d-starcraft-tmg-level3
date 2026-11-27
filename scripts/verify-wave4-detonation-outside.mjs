import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4DetonationSeekerScene,SEEKER_ID} from './support/wave4-detonation-seeker-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9);
const directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-outside-')),results=[];
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-outside-')));
function casualtyParameters(s){const p=s.pendingOfficialAutomaticHits,contract=p.casualtyDomain.selectionContract,casualtyModelIds=[];
 while(casualtyModelIds.length<contract.casualtyCount){const r=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,selectionContract:contract,casualtyModelIds,complete:false});
  assert.ok(r.valid&&r.legalNextModelIds.length);casualtyModelIds.push(r.legalNextModelIds[0]);}return{casualtyModelIds};}
for(const use of [true,false]){
 const id=use?'use':'decline',caseDirectory=path.join(directory,id),roomId='wave4-detonation-outside-'+id;
 if(resume){const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(saved){results.push(saved);continue;}}
 const scene=createWave4DetonationSeekerScene(inputs,{use}),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected,cast=false,sawOutside=false;const trace=[],frames=new Map(),windows=[];
 try{const credentials=await native.create(roomId,bound.authority);
  if(resume){
   const head=await native.store.loadRoom(roomId),bundle=await native.store.loadReplayBundle(roomId);
   const journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
   const definition=a=>a?(a.definitionId||definition(a.sourceAction)):null;
   for(const r of journal){trace.push({revision:r.postStateRevision,round:r.preGameClock.round,phase:r.preGameClock.phase,actionType:r.action.actionType,definitionId:definition(r.action)||null});
    if(r.events.some(e=>e.type==='before_casualty_batch_interrupted')){
     const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:journal.slice(0,r.postStateRevision)});assert.equal(replay.ok,true);
     const s=replay.envelope.state,w=s.pendingOfficialReactionWindow;assert.equal(w.activationId,null);assert.equal(w.timing,'outside_activation');assert.equal(w.prioritySideKeys[0],s.firstPlayerSideKey);
     windows.push({revision:r.postStateRevision,kind:w.triggerKind,timing:w.timing,activationId:w.activationId,prioritySideKeys:w.prioritySideKeys});sawOutside=true;
     for(const f of s.officialBeforeCasualtyContinuations||[])frames.set(f.continuationId,f);
    }
   }
   cast=head.envelope.state.characteristicStatusAbilityHistory?.some(r=>r.definitionId===SEEKER_ID)===true;
  }
  for(let step=0;step<80;step++){
   const h=await native.store.loadRoom(roomId),s=h.envelope.state;if(s.round===2)break;
   for(const f of s.officialBeforeCasualtyContinuations||[]){frames.set(f.continuationId,f);assert.equal(f.activationContext.activationId,null);
    assert.ok(f.suspendedHostSlots.pendingOfficialRavenSeekerPhaseEnd);}
   const window=s.pendingOfficialReactionWindow;if(window){windows.push({revision:h.stateRevision,kind:window.triggerKind,timing:window.timing,activationId:window.activationId,prioritySideKeys:window.prioritySideKeys});
    if(window.triggerKind==='before_casualty_batch'){assert.equal(window.activationId,null);assert.equal(window.timing,'outside_activation');
     assert.equal(window.prioritySideKeys[0],s.firstPlayerSideKey);assert.equal(s.firstPlayerSideKey,'player2');sawOutside=true;}}
   const menu=bound.runtime.enumerate(s,{matchBinding:h.envelope.matchBinding});let d,c,p;
   if(!cast&&s.phase==='movement'){d=menu.parameterDomains.find(d=>d.definitionId===SEEKER_ID);if(d){p={...timingParameters(d),activeUnitId:'attacker',targetUnitId:'defender'};cast=true;}}
   if(!d&&window){d=(use?menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation'):null)
     ||menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');if(d)p=timingParameters(d);}
   if(!d&&s.pendingOfficialAutomaticHits){d=menu.parameterDomains[0];if(d){const schema=d.parameterSchema||d.sourceDomain.parameterSchema;p=schema.required.includes('casualtyModelIds')?casualtyParameters(s):timingParameters(d);}}
   if(!d)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey===(s.phase==='assault'?'player2':'player1'));
   if(!d&&!c){d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');if(d)p={};}
   if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
   assert.ok(d||c,'OUTSIDE_DETONATION_SUCCESSOR_REQUIRED:'+JSON.stringify({phase:s.phase,menu}));
   const choice=d||c,result=await native.commit({roomId,credential:credentials[choice.sideKey||s.activeSideKey||s.firstPlayerSideKey],operationKey:'step-'+h.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p}:{kind:'finite',select:r=>r.action.actionType===c.actionType
      &&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey===c.sourceAction.chosenFirstActorSideKey)})});
   assert.equal(result.idempotentReplayVerified,true);trace.push({revision:h.stateRevision+1,round:s.round,phase:s.phase,actionType:choice.actionType,definitionId:choice.definitionId||null});console.log(JSON.stringify(trace.at(-1)));
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]);
  assert.equal(cast,true);assert.equal(sawOutside,true);assert.equal(s.round,2);assert.equal(s.officialRavenSeekerPhaseEndHistory.length,1);
  assert.equal(s.officialRavenSeekerPhaseEndHistory[0].outcome,'resolved');assert.equal(events.filter(e=>e.type==='raven_seeker_missile_complete').length,1);
  assert.equal(trace.some(t=>t.definitionId?.includes('/detonation-')),use);assert.ok(!s.officialBeforeCasualtyContinuations&&!s.pendingOfficialAutomaticHits&&!s.pendingOfficialRavenSeekerPhaseEnd);
  assert.ok(!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);
  for(const f of frames.values())for(const row of f.rows){const e=events.filter(e=>e.type==='automatic_hits_damage'&&e.targetId===row.targetPieceId&&e.stages.resolutionHash===row.attackResolutionHash);
   assert.equal(e.length,1);assert.deepEqual(e[0].casualtyModelIds,row.casualty.casualtyModelIds);}
  for(const p of s.pieces)assert.equal(s.supplyLossLedger.entries.filter(e=>e.unitId===p.id).reduce((n,e)=>n+e.currentSupplyBefore-e.currentSupplyAfter,0),scene.state.pieces.find(i=>i.id===p.id).currentSupply-p.currentSupply);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const result={id,use,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,trace,windows,
  frames:[...frames.values()].map(f=>({hostKind:f.hostKind,activationContext:f.activationContext,rows:f.rows})),fullNativeRound:true,
  markerHolderPriorityVerified:true,nullActivationPreserved:true,originalDiceAndCasualtyOrderPreserved:true,supplyExactlyOnce:true,coldReplay:true,idempotencyVerified:true};
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));results.push(result);
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-outside.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_outside_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,otherRemovalHostsPending:true,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false},null,2));
