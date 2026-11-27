import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4BioKillSwitchScene} from './support/wave4-bio-kill-switch-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {OFFICIAL_CORRODE_ARMOUR_ID} from '../packages/source-data/official-corrode-armour-source-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {OFFICIAL_FAQ_REACTION_POLICY_V13} from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const resume=process.argv.find(arg=>arg.startsWith('--resume='))?.slice('--resume='.length);
const directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/corrode-armour-')),results=[];
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/corrode-armour-')));
const restorationOnly=process.argv.includes('--restoration-only');
const successorOnly=process.argv.includes('--armour-successor-only');
const lungeOnly=process.argv.includes('--lunge-only');
const controlsOnly=process.argv.includes('--controls-only');
for(const spec of controlsOnly?[{id:'no-biomass',use:false,noBiomass:true},{id:'legacy-lunge-without-corrode',use:false,lunge:true,legacyLunge:true}]
 :lungeOnly?[{id:'shared-lunge',use:true,lunge:true}]:successorOnly?[{id:'next-rifle-armour',use:true,successor:true}]:restorationOnly?[{id:'medic-restores',use:true,restoration:true}]:[{id:'use',use:true},{id:'decline',use:false}]){
 if(resume){const prior=await fs.readFile(path.join(directory,spec.id,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(prior){results.push(prior);console.log(JSON.stringify({id:spec.id,status:'retained_signed_checkpoint',signedActions:prior.signedActions}));continue;}}
 const scene=createWave4BioKillSwitchScene(inputs,{combatWeapons:true,woundedCaster:false,targetKey:spec.lunge?'roach':'goliath',corrode:!spec.legacyLunge,restoration:spec.restoration,empty:true,friendlyRifle:spec.successor,lunge:spec.lunge});
 if(spec.noBiomass)scene.state.cardResources.player1.forEach(c=>c.readiness='exhausted');
 if(spec.legacyLunge){scene.state.officialFaqReactionPolicy=structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13);
  Object.assign(scene.runtimeOptions,{includeLungeDirectContinuation:true,includeLungeDeferredReaction:true,includeIndependentRangedLungeOwner:true});}
 const initialArmour=resolveOfficialEffectiveCombatProfileV1(scene.state,scene.state.pieces.find(p=>p.id==='infected')).armourThreshold;
 const caseDirectory=path.join(directory,spec.id),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected,used=false;const roomId='wave4-corrode-'+spec.id,trace=[];
 try{const credentials=await native.create(roomId,bound.authority);
  await native.commit({roomId,credential:credentials.player1,operationKey:'attack',select:d=>d.pieceId==='stukov'&&d.weaponName==='Corrosive Blast',
   parameters:()=>({targetUnitId:'infected'})});
  for(let step=0;step<30;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state;
   if(s.log.flatMap(l=>l.events||[]).some(e=>e.type==='ranged_attack')&&!s.pendingOfficialRangedLungeReaction&&!s.deferredOfficialRangedLungeTrigger)break;
   const menu=bound.runtime.enumerate(s);let d=spec.restoration?menu.parameterDomains.find(d=>d.definitionId==='unit:medic/restoration-any-phase@1'):null;
   d||=spec.use?menu.parameterDomains.find(d=>d.definitionId===OFFICIAL_CORRODE_ARMOUR_ID):null;
   d||=spec.lunge?menu.parameterDomains.find(d=>d.definitionId==='unit:hydralisk/lunge-assault-phase@1'):null;
   d||=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window')||menu.parameterDomains[0];
   const c=menu.candidates.find(c=>c.isEnabled!==false);assert.ok(d||c,'CORRODE_SUCCESSOR_REQUIRED');
   const receipt=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+head.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:domain=>{
      if(domain.definitionId!=='unit:hydralisk/lunge-assault-phase@1')return timingParameters(domain);
      const schema=domain.sourceDomain.parameterSchema;
      return{...timingParameters({parameterSchema:{...schema,required:schema.required.filter(k=>k!=='move')}}),
       move:{leadingModelId:'lunge-model-1',path:[{xMilliInches:18000,yMilliInches:14500,elevation:'ground',supportTerrainIds:[]}],placements:[]}};
    }}:{kind:'finite',select:r=>r.action.actionType===c.actionType})});
   assert.equal(receipt.idempotentReplayVerified,true);if(d?.definitionId===OFFICIAL_CORRODE_ARMOUR_ID)used=true;
   trace.push({revision:head.stateRevision+1,actionType:(d||c).actionType,definitionId:d?.definitionId||null});console.log(JSON.stringify(trace.at(-1)));
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,target=s.pieces.find(p=>p.id==='infected');
  assert.equal(used,spec.use);assert.equal(target.statuses.some(s=>s.sourceDefinitionId===OFFICIAL_CORRODE_ARMOUR_ID),spec.use&&!spec.restoration);
  assert.equal(resolveOfficialEffectiveCombatProfileV1(s,target).armourThreshold,initialArmour+(spec.use&&!spec.restoration?1:0));
  if(spec.lunge){assert.ok(trace.some(t=>t.definitionId==='unit:hydralisk/lunge-assault-phase@1'));
   const model=s.pieces.find(p=>p.id==='lunge').models[0];assert.equal(Math.round(model.xInches*1000),18000);assert.equal(Math.round(model.yInches*1000),14500);}
  if(spec.restoration){assert.ok(trace.some(t=>t.definitionId==='unit:medic/restoration-any-phase@1'));assert.ok(!s.pendingOfficialCorrodeRestoration);}
  assert.ok(!s.pendingOfficialRangedLungeReaction&&!s.pendingOfficialReactionWindow&&!s.deferredOfficialRangedLungeTrigger);
  if(spec.successor){
   for(const [type,pieceId]of [['finish_activation','stukov'],['ranged_attack','infected'],['finish_ranged_attack_sequence','infected'],['finish_activation','infected']]){
    const head=await native.store.loadRoom(roomId),state=head.envelope.state,menu=bound.runtime.enumerate(state);
    if(type==='finish_ranged_attack_sequence'&&!state.pendingCurrentProductRangedSequence)continue;
    if(type==='finish_activation'&&state.activeSideKey!==state.pieces.find(p=>p.id===pieceId).sideKey)continue;
    const d=menu.parameterDomains.find(d=>d.actionType===type&&(!pieceId||d.pieceId===pieceId)&&
      (type!=='ranged_attack'||d.weaponName==='Autocannon')),c=menu.candidates.find(c=>c.actionType===type&&(!pieceId||c.pieceId===pieceId));
    assert.ok(d||c,'CORRODE_PHASE_SUCCESSOR_REQUIRED:'+JSON.stringify({type,active:state.activeSideKey,menu:menu.parameterDomains.map(d=>d.actionType)}));
    await native.commit({roomId,credential:credentials[(d||c).sideKey||state.activeSideKey],operationKey:'advance-'+type+'-'+pieceId,
     ...(d?{select:r=>r.domainId===d.domainId,parameters:type==='ranged_attack'?()=>({targetUnitId:'stukov'}):timingParameters}:{kind:'finite',select:r=>r.action.actionType===type})});
   }
   await native.commit({roomId,credential:credentials.player1,operationKey:'next-rifle',select:d=>d.pieceId==='friendly'&&d.weaponName==='Infested C-14 Rifle',
    parameters:()=>({targetUnitId:'infected'})});
   expected=await native.store.loadRoom(roomId);
   const attack=expected.envelope.state.log.flatMap(l=>l.events||[]).find(e=>e.type==='ranged_attack'&&e.pieceId==='friendly');
   assert.ok(attack,'CORRODE_NEXT_RIFLE_MUST_SETTLE');assert.equal(attack.stages.armour.threshold,5);assert.ok(attack.stages.armour.rolls.length>0);
  }
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const result={...spec,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
  ...(spec.successor?{actualArmourRollEvent:expected.envelope.state.log.flatMap(l=>l.events||[]).find(e=>e.type==='ranged_attack'&&e.pieceId==='friendly')}:{}),
  used,trace,coldReplay:true,idempotencyVerified:true};results.push(result);await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({id:spec.id,status:'passed_scoped',signedActions:result.signedActions}));
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/'+(controlsOnly?'corrode-armour-controls':lungeOnly?'corrode-armour-lunge':successorOnly?'corrode-armour-successor':restorationOnly?'corrode-armour-restoration':'corrode-armour-basic')+'.public.json'),JSON.stringify({
 schema:'starcraft_tmg_wave4_corrode_armour_basic_v1',status:'passed_scoped_basic_only',runRef:path.relative(root,directory),results,
 nativeArmourSuccessorPending:!successorOnly,restorationAndRoundCleanupPending:true,newGameAtomsImplemented:0,implementedCumulativeAtoms:6,
 fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false},null,2));
