import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4BioKillSwitchScene} from './support/wave4-bio-kill-switch-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/stukov-combat-')),results=[];
function casualtyParameters(s){const p=[s.pendingAction,s.pendingCurrentProductRangedCasualtyChoice,s.pendingOfficialAutomaticHits].find(p=>p?.casualtyDomain);
 const ids=[],contract=p.casualtyDomain.selectionContract;
 while(ids.length<contract.casualtyCount){const next=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,
  selectionContract:contract,casualtyModelIds:ids,complete:false});assert.equal(next.valid,true);ids.push(next.legalNextModelIds[0]);}return{casualtyModelIds:ids};}
for(const spec of [{id:'corrosive-light',kind:'ranged'},{id:'corrosive-armoured',kind:'ranged',targetKey:'goliath'},
 {id:'infested-arm',kind:'melee',phase:'combat',targetKey:'goliath'},{id:'devastating-charge',kind:'impact',charge:true}]){
 const scene=createWave4BioKillSwitchScene(inputs,{...spec,combatWeapons:true,woundedCaster:false}),caseDirectory=path.join(directory,spec.id);
 const bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected;const roomId='wave4-stukov-'+spec.id,trace=[];
 const eventType=spec.kind==='ranged'?'ranged_attack':spec.kind==='melee'?'close_combat_attack':'impact_damage';
 try{const credentials=await native.create(roomId,bound.authority);
  if(spec.kind==='ranged')await native.commit({roomId,credential:credentials.player1,operationKey:'declare',
   select:d=>d.pieceId==='stukov'&&d.weaponName==='Corrosive Blast',parameters:()=>({targetUnitId:'infected'})});
  else if(spec.kind==='melee'){
   const d=bound.runtime.enumerate(scene.state).parameterDomains.find(d=>d.pieceId==='stukov'&&d.weaponName==='Infested Arm');assert.ok(d);
   await native.commit({roomId,credential:credentials.player1,operationKey:'fight',select:r=>r.domainId===d.domainId,parameters:()=>({
    closeRanksMode:'decline',allocations:[{targetUnitId:'infected',dice:d.sourceDomain.constraints.declineCloseRanksAttackDice}],
    ...(d.sourceDomain.parameterSchema.required.includes('surgeTargetUnitId')?{surgeTargetUnitId:'infected'}:{})})});
  }else{
   const actor=scene.state.pieces.find(p=>p.id==='stukov'),target=scene.state.pieces.find(p=>p.id==='infected').models[0];
   await native.commit({roomId,credential:credentials.player1,operationKey:'charge',select:d=>d.actionType==='charge'&&d.pieceId==='stukov',
    parameters:()=>({leadingModelId:actor.models[0].id,targets:[{unitId:'infected',modelId:target.id}]})});
   const contactX=Math.round(target.xInches*1000)-Math.round((target.baseWidthInches+actor.models[0].baseWidthInches)*500);
   await native.commit({roomId,credential:credentials.player1,operationKey:'resolve-charge',select:d=>d.actionType==='resolve_charge',
    parameters:()=>({outcome:'success',path:[{xMilliInches:contactX,yMilliInches:10000,elevation:'ground',supportTerrainIds:[]}],placements:[]})});
   const head=await native.store.loadRoom(roomId),domain=bound.runtime.enumerate(head.envelope.state).parameterDomains.find(d=>d.actionType==='resolve_impact');
   assert.ok(domain);const models=domain.sourceDomain.parameterSchema.eligibleModels;
   assert.equal(models.length,1);assert.equal(models[0].impactDice,6);
   await native.commit({roomId,credential:credentials.player1,operationKey:'impact',select:d=>d.domainId===domain.domainId,
    parameters:()=>({allocations:[{modelId:models[0].modelId,targetUnitId:'infected',dice:6}]})});
  }
  for(let step=0;step<40;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state;
   if(s.log.flatMap(l=>l.events||[]).some(e=>e.type===eventType)&&!s.officialBeforeCasualtyContinuations?.length)break;
   const menu=bound.runtime.enumerate(s),d=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window')||menu.parameterDomains[0],
    c=menu.candidates.find(c=>c.isEnabled!==false);assert.ok(d||c,'STUKOV_COMBAT_SUCCESSOR_REQUIRED');
   const schema=d&&(d.parameterSchema||d.sourceDomain.parameterSchema),parameters=d?(schema.required.includes('casualtyModelIds')?casualtyParameters(s):timingParameters(d)):null;
   const receipt=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+head.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>parameters}:{kind:'finite',select:r=>r.action.actionType===c.actionType})});
   assert.equal(receipt.idempotentReplayVerified,true);trace.push({revision:head.stateRevision+1,actionType:(d||c).actionType});console.log(JSON.stringify(trace.at(-1)));
  }
  expected=await native.store.loadRoom(roomId);const events=expected.envelope.state.log.flatMap(l=>l.events||[]),event=events.find(e=>e.type===eventType);assert.ok(event);
  if(spec.kind==='ranged'){assert.equal(event.stages.hit.dice,3);assert.equal(event.stages.damage.damagePerDie,1);assert.equal(event.stages.effects.surgeMatched,true);}
  else{assert.equal(event.stages.hitThreshold,spec.kind==='impact'?4:3);assert.equal(event.stages.damagePerDie,spec.kind==='impact'?1:2);
   assert.equal(event.stages.hitRolls.length,spec.kind==='impact'?6:3);if(spec.kind==='melee')assert.equal(event.stages.surgeRolls.length,1);}
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const result={...spec,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
  event:expected.envelope.state.log.flatMap(l=>l.events||[]).find(e=>e.type===eventType),trace,coldReplay:true,idempotencyVerified:true};
 results.push(result);await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({id:spec.id,status:'passed_scoped',signedActions:result.signedActions}));
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/stukov-combat.public.json'),JSON.stringify({
 schema:'starcraft_tmg_wave4_stukov_combat_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false},null,2));
