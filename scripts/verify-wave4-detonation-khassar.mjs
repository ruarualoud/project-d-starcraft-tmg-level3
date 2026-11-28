import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4DetonationKhassarScene} from './support/wave4-detonation-khassar-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9);
const directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-khassar-'));
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-khassar-')));
const results=[],controls=[],parentKeys={shot:'pendingOfficialKhassarShot',fight:'pendingOfficialKhassarFight',charge:'pendingOfficialKhassarCharge'};
const oldScene=createWave4DetonationKhassarScene(inputs,{beforeCasualtyPolicyVersion:'1.3.0'});
await assert.rejects(()=>bindWave4TurretRoom({inputs,...oldScene,directory:path.join(directory,'old-policy-rejected')}),/KHASSAR_CHARGE_REACTION_COMPOSITION_REQUIRED/);
function parameters(s,d){const schema=d.parameterSchema||d.sourceDomain.parameterSchema;
 if(schema.required.includes('casualtyModelIds')){
  const p=s.pendingCurrentProductRangedCasualtyChoice||s.pendingAction?.casualtyDomain&&s.pendingAction||s.pendingOfficialAutomaticHits,contract=p.casualtyDomain.selectionContract,casualtyModelIds=[];
  while(casualtyModelIds.length<contract.casualtyCount){const r=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,selectionContract:contract,casualtyModelIds,complete:false});
   assert.ok(r.valid&&r.legalNextModelIds.length);casualtyModelIds.push(r.legalNextModelIds[0]);}return{casualtyModelIds};
 }
 if(d.actionType==='delegate_khassar_shot')return{targetUnitId:'defender'};
 if(d.actionType==='delegate_khassar_fight')return{closeRanksMode:'decline',allocations:[{targetUnitId:'defender',dice:d.constraints.declineCloseRanksAttackDice}],surgeTargetUnitId:null,criticalTargetUnitId:null};
 if(d.actionType==='delegate_khassar_charge')return{leadingModelId:s.pieces.find(p=>p.id==='recipient').models[1].id,
  targets:[{unitId:'defender',modelId:s.pieces.find(p=>p.id==='defender').models[0].id}]};
 if(d.actionType==='resolve_charge'){
  const source=s.pieces.find(p=>p.id==='recipient'),target=s.pieces.find(p=>p.id==='defender'),leader=source.models.find(m=>m.id===s.pendingAction.chargePlan.leadingModelId),
   contact=target.models[0].xInches-(target.models[0].baseWidthInches+leader.baseWidthInches)/2,dx=contact-leader.xInches,
   point=m=>({xMilliInches:Math.round((m.xInches+dx)*1000),yMilliInches:Math.round(m.yInches*1000),elevation:'ground',supportTerrainIds:[]});
  return{outcome:'success',path:[point(leader)],placements:source.models.filter(m=>m.id!==leader.id).map(m=>({modelId:m.id,...point(m),rotationDegrees:0}))};
 }
 if(d.actionType==='resolve_impact')return{allocations:schema.eligibleModels.map(m=>({modelId:m.modelId,targetUnitId:'defender',dice:m.impactDice}))};
 return timingParameters(d);
}
for(const spec of [
 {id:'shot-recipient-dies',kind:'shot',use:true},
 {id:'shot-recipient-survives',kind:'shot',use:true,woundedRecipient:false},
 {id:'shot-declined',kind:'shot',use:false},
 {id:'fight-recipient-dies',kind:'fight',use:true,unitKey:'infested_trooper'},
 {id:'charge-recipient-dies',kind:'charge',use:true},
 {id:'shot-actor-dies',kind:'shot',use:true,woundedRecipient:false,woundedActor:true},
])for(let attempt=0;attempt<8;attempt++){
 const caseDirectory=path.join(directory,spec.id+'-'+attempt),roomId='wave4-detonation-khassar-'+spec.id+'-'+attempt;
 const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(saved){if(saved.coverageSatisfied){results.push(saved);break;}controls.push(saved);continue;}
 const scene=createWave4DetonationKhassarScene(inputs,spec),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});assert.equal(bound.runtime.descriptor.runtimeVersion,'3.235.0');
 let native=bound.open(),expected;const trace=[],frames=new Map(),completion='khassar_non_lethal_damage_after_'+spec.kind;
 try{const credentials=await native.create(roomId,bound.authority);
  if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),definition=a=>a&&(a.definitionId||definition(a.sourceAction));
   for(const r of journal){trace.push({revision:r.postStateRevision,actionType:r.action.actionType,definitionId:definition(r.action)||null,restoredFromSignedJournal:true});
    if(r.events.some(e=>e.type==='before_casualty_batch_interrupted')){const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,r.postStateRevision)});
     assert.equal(replay.ok,true);for(const f of replay.envelope.state.officialBeforeCasualtyContinuations||[])frames.set(f.continuationId,f);}}
  }
  for(let step=0;step<65;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state,stack=s.officialBeforeCasualtyContinuations||[];
   for(const f of stack){frames.set(f.continuationId,f);assert.ok(f.suspendedHostSlots[parentKeys[spec.kind]]);assert.ok(f.activationContext.activationId);}
   if(s.log.some(l=>l.events?.some(e=>e.type===completion))&&!stack.length&&!s.pendingOfficialAutomaticHits)break;
   const menu=bound.runtime.enumerate(s);let d,c;
   if(head.stateRevision===0)d=menu.parameterDomains.find(d=>d.actionType==='delegate_khassar_'+spec.kind&&d.pieceId==='actor'&&d.constraints.recipientUnitId==='recipient');
   else if(spec.use&&stack.at(-1)?.stage==='reaction')d=menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation');
   d||=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
   d||=menu.parameterDomains.find(d=>d.actionType==='finish_ranged_attack_sequence');
   c=menu.candidates.find(c=>c.actionType==='finish_ranged_attack_sequence')||menu.candidates.find(c=>c.isEnabled!==false);
   if(!d&&!c)d=menu.parameterDomains[0];assert.ok(d||c,'KHASSAR_DETONATION_SUCCESSOR_REQUIRED');
   const result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+head.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>parameters(s,d)}:{kind:'finite',select:r=>r.action.actionType===c.actionType})});
   assert.equal(result.idempotentReplayVerified,true);trace.push({revision:head.stateRevision+1,actionType:(d||c).actionType,definitionId:d?.definitionId||null,stackDepth:stack.length});console.log(JSON.stringify(trace.at(-1)));
  }
  let head=await native.store.loadRoom(roomId),s=head.envelope.state,events=s.log.flatMap(l=>l.events||[]),finished=events.filter(e=>e.type===completion);assert.equal(finished.length,1);
  assert.ok(!s[parentKeys[spec.kind]]&&!s.officialBeforeCasualtyContinuations?.length&&!s.pendingOfficialAutomaticHits);
  const recipient=s.pieces.find(p=>p.id==='recipient'),actor=s.pieces.find(p=>p.id==='actor');
  if(recipient.isDestroyed)assert.equal(finished[0].damage.reason,'recipient_destroyed');else {assert.notEqual(finished[0].damage.reason,'recipient_destroyed');assert.equal(finished[0].damage.nonLethalDamage,3);assert.equal(finished[0].damage.postDamageMarker-finished[0].damage.priorDamageMarker,3);}
  assert.equal(s.cardResources.player1.find(c=>c.cardKind==='faction').readiness,'exhausted');assert.equal(actor.activatedPhases[s.phase],true);
  assert.equal(s.activeAbilityUseHistory.filter(h=>h.pieceId==='actor'&&h.routeId==='card:templar_caste/khassar-de-templari-any@1').length,1);
  if(!actor.isDestroyed){assert.equal(s.selectedRosterActivationWindow.pieceId,'actor');assert.equal(s.selectedRosterActivationWindow.stage,'after_action');
   await native.commit({roomId,credential:credentials.player1,operationKey:'finish-original-actor',select:d=>d.actionType==='finish_activation'&&d.pieceId==='actor',parameters:()=>({})});}
  expected=await native.store.loadRoom(roomId);s=expected.envelope.state;assert.ok(!s.selectedRosterActivationWindow&&!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
  for(const f of frames.values())for(const row of f.rows){const e=s.log.flatMap(l=>l.events||[]).filter(e=>['ranged_attack','close_combat_attack','impact_damage'].includes(e.type)&&(e.attackResolutionHash||e.resolutionHash)===row.attackResolutionHash);
   assert.equal(e.length,1);assert.deepEqual(e[0].casualtyModelIds,row.casualty.casualtyModelIds);}
  for(const p of s.pieces)assert.equal(s.supplyLossLedger.entries.filter(e=>e.unitId===p.id).reduce((n,e)=>n+e.currentSupplyBefore-e.currentSupplyAfter,0),scene.state.pieces.find(i=>i.id===p.id).currentSupply-p.currentSupply);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
   replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const s=expected.envelope.state,recipient=s.pieces.find(p=>p.id==='recipient'),actor=s.pieces.find(p=>p.id==='actor'),
  coverageSatisfied=frames.size>0&&recipient.isDestroyed===Boolean(spec.use&&spec.woundedRecipient!==false)&&actor.isDestroyed===Boolean(spec.use&&spec.woundedActor);
 const result={...spec,attempt,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,coverageSatisfied,
  recipientDestroyed:recipient.isDestroyed,actorDestroyed:actor.isDestroyed,trace,frames:[...frames.values()].map(f=>({hostKind:f.hostKind,activationContext:f.activationContext,rows:f.rows})),
  originalAttackAndCasualtyOrderPreserved:true,sourceCardExhaustedExactlyOnce:true,originalActorActivationCompleted:true,postActionNonLethalDamageSettled:true,supplyExactlyOnce:true,coldReplay:true,idempotencyVerified:true};
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 if(!coverageSatisfied){controls.push(result);assert.ok(attempt<7,'KHASSAR_DETONATION_COVERAGE_NOT_REACHED');continue;}results.push(result);break;
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-khassar.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_khassar_v1',status:'passed_scoped',runRef:path.relative(root,directory),
 policyVersion:'1.4.0',rootRuntimeVersion:'3.235.0',oldPolicyCombinationRejected:true,results,controls,newGameAtomsImplemented:0,implementedCumulativeAtoms:6,
 otherRemovalHostsPending:true,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false},null,2));
