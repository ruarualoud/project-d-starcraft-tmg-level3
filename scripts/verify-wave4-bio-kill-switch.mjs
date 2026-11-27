import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4BioKillSwitchScene,BIO_KILL_SWITCH_ID} from './support/wave4-bio-kill-switch-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/bio-kill-switch-')),results=[];
const infected=p=>p.statuses.some(s=>String(typeof s==='string'?s:s.statusName).toLowerCase()==='infestation');
const reductionOnly=process.argv.includes('--reduction-only');
const farHiddenOnly=process.argv.includes('--far-hidden-only');
for(const spec of farHiddenOnly?[{id:'far-hidden-target',farHidden:true}]:reductionOnly?[{id:'transfusion-prevents-damage',transfusion:true}]:[{id:'empty',empty:true},{id:'decline',use:false},{id:'counter-detonation',use:true}]){
 const scene=createWave4BioKillSwitchScene(inputs,spec),caseDirectory=path.join(directory,spec.id);
 const bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected;const roomId='wave4-bio-kill-switch-'+spec.id,trace=[];
 try{const credentials=await native.create(roomId,bound.authority);
  const cast=await native.commit({roomId,credential:credentials.player1,operationKey:'cast',select:d=>d.definitionId===BIO_KILL_SWITCH_ID,parameters:timingParameters});
  assert.equal(cast.idempotentReplayVerified,true);
  for(let step=0;step<40;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state;
   if(s.officialInfestationDamageCleanupHistory?.length)break;
   const menu=bound.runtime.enumerate(s);let d;
   if(spec.transfusion)d=menu.parameterDomains.find(d=>d.definitionId==='unit:queen/transfusion-any-phase@1');
   if(spec.use)d=menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation');
   d||=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window')||menu.parameterDomains[0];
   const c=menu.candidates.find(c=>c.isEnabled!==false);assert.ok(d||c,'BIO_KILL_SWITCH_SUCCESSOR_REQUIRED');
   const schema=d&&(d.parameterSchema||d.sourceDomain.parameterSchema),parameters=d?(schema.required.includes('casualtyModelIds')
    ?{casualtyModelIds:schema.casualtyModelIds.items.enum.slice(0,schema.casualtyModelIds.minItems)}:timingParameters(d)):null;
   const receipt=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+head.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>parameters}:{kind:'finite',select:r=>r.action.actionType===c.actionType})});
   assert.equal(receipt.idempotentReplayVerified,true);trace.push({revision:head.stateRevision+1,actionType:(d||c).actionType,definitionId:d?.definitionId||null});
   console.log(JSON.stringify(trace.at(-1)));
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,cleanup=s.officialInfestationDamageCleanupHistory;
  assert.equal(cleanup?.length,1);assert.deepEqual(cleanup[0].damageTargetUnitIds,spec.empty?[]:['infected']);
  assert.deepEqual(cleanup[0].unitsThatSufferedDamage,spec.empty||spec.transfusion?[]:['infected']);
  assert.equal(infected(s.pieces.find(p=>p.id==='infected')),Boolean(spec.transfusion));
  if(spec.transfusion){assert.equal(s.pieces.find(p=>p.id==='infected').damageMarker,0);
   assert.ok(trace.some(t=>t.definitionId==='unit:queen/transfusion-any-phase@1'));}
  for(const id of ['friendly','reserve'])assert.equal(infected(s.pieces.find(p=>p.id===id)),true);
  assert.equal(s.pieces.find(p=>p.id==='clean').damageMarker,0);assert.equal(s.pieces.find(p=>p.id==='reserve').isOnField,false);
  const events=s.log.flatMap(l=>l.events||[]);assert.equal(events.filter(e=>e.type==='infestation_damage_declared').length,1);
  assert.equal(events.filter(e=>e.type==='ability_direct_damage').length,spec.empty?0:1);
  assert.ok(events.some(e=>e.type==='ability_resource_paid'&&e.resourceType==='BM'&&e.resourceCost===0));
  assert.equal(Boolean(s.pendingOfficialAutomaticHits||s.pendingOfficialInfestationDamageCleanup||s.officialBeforeCasualtyContinuations?.length),false);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const result={...spec,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
  casterDestroyed:expected.envelope.state.pieces.find(p=>p.id==='stukov').isDestroyed,trace,coldReplay:true,idempotencyVerified:true};
 results.push(result);await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({id:spec.id,status:'passed_scoped',signedActions:result.signedActions,casterDestroyed:result.casterDestroyed}));
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/'+(farHiddenOnly?'bio-kill-switch-far-hidden':reductionOnly?'bio-kill-switch-reduction':'bio-kill-switch')+'.public.json'),JSON.stringify({
 schema:'starcraft_tmg_wave4_bio_kill_switch_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false},null,2));
