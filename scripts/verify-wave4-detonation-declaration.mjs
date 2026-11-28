import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4DetonationHeadShotScene} from './support/wave4-detonation-headshot-room-v1.mjs';
import {createWave4DetonationTemplateScene} from './support/wave4-detonation-template-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root),resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9);
const directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-declaration-'));
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-declaration-')));
const results=[],controls=[];
function parameters(s,d,scene){const schema=d.parameterSchema||d.sourceDomain.parameterSchema;
 if(d.actionType==='declare_ranged_attack'){const row=d.constraints.choices.find(r=>r.reactionAbilityName===scene.scenario.declarationAbility);assert.ok(row);
  return{reactionAbilityName:row.reactionAbilityName,...(schema.required.includes('paymentCardInstanceIds')?{paymentCardInstanceIds:row.paymentCardInstanceIds}:{})};}
 if(d.actionType==='blast_template_attack'){const {batchOrderUnitIds,...p}=scene.templateParameters;return p;}
 if(d.actionType==='ranged_attack'&&schema.required.includes('targetUnitId'))return{targetUnitId:'defender'};
 if(!schema.required.includes('casualtyModelIds'))return timingParameters(d);
 const p=s.pendingAction?.casualtyDomain?s.pendingAction:s.pendingOfficialAutomaticHits
  ||{targetPieceId:s.pendingOfficialBlastTemplateAttack.currentAction.targetId,casualtyDomain:s.pendingOfficialBlastTemplateAttack.currentChance.casualtyDomain},contract=p.casualtyDomain.selectionContract,casualtyModelIds=[];
 while(casualtyModelIds.length<contract.casualtyCount){const r=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,selectionContract:contract,casualtyModelIds,complete:false});assert.ok(r.valid&&r.legalNextModelIds.length);casualtyModelIds.push(r.legalNextModelIds[0]);}return{casualtyModelIds};
}
for(const spec of [{id:'head-shot',declarationAbility:'Head Shot',numeric:true},{id:'shaped-blast',declarationAbility:'Shaped Blast'},{id:'smart-shells',declarationAbility:'Smart Shells'}])for(let attempt=0;attempt<8;attempt++){
 const caseDirectory=path.join(directory,spec.id+'-'+attempt),roomId='wave4-detonation-declaration-'+spec.id+'-'+attempt;
 const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(saved){if(saved.coverageSatisfied){results.push(saved);break;}controls.push(saved);continue;}
 const scene=spec.numeric?createWave4DetonationHeadShotScene(inputs):await createWave4DetonationTemplateScene(inputs,{root,declarationAbility:spec.declarationAbility,beforeCasualtyPolicyVersion:'1.5.0'});
 scene.scenario.declarationAbility=spec.declarationAbility;
 const bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});assert.equal(bound.runtime.descriptor.runtimeVersion,'3.236.0');
 let native=bound.open(),expected;const trace=[],frames=new Map();
 try{const credentials=await native.create(roomId,bound.authority);
  if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),definition=a=>a&&(a.definitionId||definition(a.sourceAction));
   for(const r of journal){trace.push({revision:r.postStateRevision,actionType:r.action.actionType,definitionId:definition(r.action)||null,restoredFromSignedJournal:true});
    if(r.events.some(e=>e.type==='before_casualty_batch_interrupted')){const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,r.postStateRevision)});assert.equal(replay.ok,true);for(const f of replay.envelope.state.officialBeforeCasualtyContinuations||[])frames.set(f.continuationId,f);}}
  }
  for(let step=0;step<75;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state,stack=s.officialBeforeCasualtyContinuations||[];
   for(const f of stack){frames.set(f.continuationId,f);assert.ok(f.suspendedHostSlots.pendingOfficialRangedAttackDeclaration);}
   if(s.log.some(l=>l.events?.some(e=>e.type==='ranged_attack'&&e.pieceId==='attacker'))&&!s.pendingOfficialRangedAttackDeclaration&&!s.pendingOfficialBlastTemplateAttack&&!s.pendingOfficialAutomaticHits&&!stack.length)break;
   const menu=bound.runtime.enumerate(s);let d,c;
   if(head.stateRevision===0){d=menu.parameterDomains.find(d=>d.actionType==='declare_ranged_attack');assert.ok(d,'ACTUAL_DECLARATION_REQUIRED');}
   else if(stack.at(-1)?.stage==='reaction')d=menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation');
   d||=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
   d||=menu.parameterDomains[0];
   const cs=menu.candidates.filter(c=>c.isEnabled!==false);c=cs.find(c=>c.selectedBatchUnitId==='defender')||cs[0];assert.ok(d||c,'DECLARATION_DETONATION_SUCCESSOR_REQUIRED');
   const result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+head.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>parameters(s,d,scene)}:{kind:'finite',select:r=>r.action.actionType===c.actionType&&r.action.targetId===c.targetId})});
   assert.equal(result.idempotentReplayVerified,true);trace.push({revision:head.stateRevision+1,actionType:(d||c).actionType,definitionId:d?.definitionId||null,stackDepth:stack.length});console.log(JSON.stringify(trace.at(-1)));
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]),definitionId=spec.numeric?'unit:nova_stealth_mode/head-shot-assault-phase@1':'unit:siege_tank/'+spec.id+'-assault-phase@1';
  assert.equal(s.officialReactionHistory.filter(h=>h.definitionId===definitionId).length,1);const signedBundle=await native.store.loadReplayBundle(roomId);assert.equal(signedBundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').flatMap(r=>r.payload.payload.receipt.events).filter(e=>e.type==='ranged_declaration_completed').length,1);
  assert.equal(events.filter(e=>e.type==='reaction_resource_paid'&&e.resourceType==='CP').reduce((n,e)=>n+e.resourceCost,0),spec.numeric?1:0);
  assert.ok(!s.pendingOfficialRangedAttackDeclaration&&!s.pendingOfficialBlastTemplateAttack&&!s.pendingOfficialAutomaticHits&&!s.officialBeforeCasualtyContinuations?.length&&!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
  const shots=events.filter(e=>e.type==='ranged_attack'&&e.pieceId==='attacker');assert.ok(shots.length);
  if(s.pieces.find(p=>p.id==='attacker').isDestroyed){assert.ok(!s.selectedRosterActivationWindow);assert.ok(!bound.runtime.enumerate(s).parameterDomains.some(d=>d.actionType==='finish_activation'&&d.pieceId==='attacker'));}
  if(spec.numeric){assert.equal(shots.length,1);assert.equal(shots[0].stages.damage.damagePerDie,3);assert.equal(shots[0].concentratedFire.maximumCasualties,1);assert.ok(shots[0].casualtyModelIds.length<=1);}
  else assert.equal(events.filter(e=>e.type==='ranged_weapon_completed').length,1);
  for(const f of frames.values())for(const row of f.rows){const e=shots.filter(e=>e.targetId===row.targetPieceId&&e.attackResolutionHash===row.attackResolutionHash);assert.equal(e.length,1);assert.deepEqual(e[0].casualtyModelIds,row.casualty.casualtyModelIds);}
  for(const p of s.pieces)assert.equal(s.supplyLossLedger.entries.filter(e=>e.unitId===p.id).reduce((n,e)=>n+e.currentSupplyBefore-e.currentSupplyAfter,0),scene.state.pieces.find(i=>i.id===p.id).currentSupply-p.currentSupply);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);}finally{native.close();}
 const coverageSatisfied=frames.size>0&&expected.envelope.state.pieces.find(p=>p.id==='attacker').isDestroyed;
 const result={...spec,attempt,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,coverageSatisfied,trace,
  frames:[...frames.values()].map(f=>({hostKind:f.hostKind,activationContext:f.activationContext,rows:f.rows})),attackerDestroyed:expected.envelope.state.pieces.find(p=>p.id==='attacker').isDestroyed,
  originalDiceAndCasualtyOrderPreserved:true,declarationPaymentAndCompletionExactlyOnce:true,deadAttackerHasNoActivationWindow:true,supplyExactlyOnce:true,coldReplay:true,idempotencyVerified:true};
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));if(!coverageSatisfied){controls.push(result);assert.ok(attempt<7,'DECLARATION_COVERAGE_NOT_REACHED');continue;}results.push(result);break;
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-declaration.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_declaration_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,controls,
 policyVersion:'1.5.0',rootRuntimeVersion:'3.236.0',newGameAtomsImplemented:0,implementedCumulativeAtoms:6,sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2));
