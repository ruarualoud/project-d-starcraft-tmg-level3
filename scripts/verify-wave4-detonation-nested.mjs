import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4NestedDetonationScene} from './support/wave4-detonation-nested-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
function casualtyParameters(state){
 const pending=state.pendingAction?.casualtyDomain?state.pendingAction:state.pendingOfficialAutomaticHits;
 const contract=pending.casualtyDomain.selectionContract,casualtyModelIds=[];
 while(casualtyModelIds.length<contract.casualtyCount){
  const result=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:pending.targetPieceId,selectionContract:contract,casualtyModelIds,complete:false});
  assert.equal(result.valid,true);assert.ok(result.legalNextModelIds.length);casualtyModelIds.push(result.legalNextModelIds[0]);
 }
 return{casualtyModelIds};
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const multiTarget=process.argv.includes('--multi-target');
const resume=process.argv.find(arg=>arg.startsWith('--resume='))?.slice('--resume='.length);
const directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-nested-')),results=[],noDamageControls=[];
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-nested-')));
const specs=multiTarget?[{id:'marine-two-casualty-targets',allyKind:'casualty',use:true},
 {id:'marine-allocation-only-target',allyKind:'allocation-only',use:true}]
 :[{id:'marine-both-use',use:true},{id:'marine-decline',use:false},{id:'trooper-both-use',unitKey:'infested_trooper',use:true}];
for(const spec of specs){
 for(let attempt=0;attempt<8;attempt++){
 if(resume){const completed=await fs.readFile(path.join(directory,spec.id+'-'+attempt,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{
  if(e.code==='ENOENT')return null;throw e;});if(completed){if(completed.coverageSatisfied){results.push(completed);break;}noDamageControls.push(completed);continue;}}
 const scene=createWave4NestedDetonationScene(inputs,spec),caseDirectory=path.join(directory,spec.id+'-'+attempt);
 const bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected,maximumDepth=0;const trace=[],frames=new Map(),roomId='wave4-detonation-'+spec.id+'-'+attempt;
 try{const credentials=await native.create(roomId,bound.authority);
  const domain=bound.runtime.enumerate(scene.state).parameterDomains.find(d=>d.actionType==='fight'&&d.pieceId==='attacker');
  assert.ok(domain,'DETONATION_MELEE_DOMAIN_REQUIRED');
  const schema=domain.sourceDomain.parameterSchema,parameters={closeRanksMode:'decline',
   allocations:[{targetUnitId:'defender',dice:domain.sourceDomain.constraints.declineCloseRanksAttackDice}],
   ...(schema.required.includes('surgeTargetUnitId')?{surgeTargetUnitId:'defender'}:{})};
  await native.commit({roomId,credential:credentials.player1,operationKey:'fight',select:d=>d.domainId===domain.domainId,parameters:()=>parameters});
  for(let step=0;step<80;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state,stack=s.officialBeforeCasualtyContinuations||[];
   maximumDepth=Math.max(maximumDepth,stack.length);
   for(const frame of stack){frames.set(frame.continuationId,frame);for(const row of frame.rows)
    assert.ok(row.casualty.casualtyModelIds.every(id=>s.pieces.find(p=>p.id===row.targetPieceId).models.some(m=>m.id===id&&!m.isDestroyed&&m.isOnField)));}
   const completed=s.log.flatMap(l=>l.events||[]).find(e=>e.type==='close_combat_attack');
   if(completed&&!stack.length)break;
   const menu=bound.runtime.enumerate(s),frame=stack.at(-1);let d;
   if(frame?.stage==='reaction'&&spec.use){
    const reactions=menu.parameterDomains.filter(d=>d.effectKind==='before_casualty_detonation');
    d=(frame.rows.length>1?reactions.find(d=>(d.sourceDomain?.sourceInstanceId??d.sourceInstanceId)!==frame.rows[0].targetPieceId):null)||reactions[0];
   }
   d||=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window')||menu.parameterDomains[0];
   const c=menu.candidates.find(c=>c.isEnabled!==false);assert.ok(d||c,'DETONATION_NESTED_SUCCESSOR_REQUIRED');
   const ds=d&&(d.parameterSchema||d.sourceDomain.parameterSchema);
   const parameters=d?(ds.required.includes('casualtyModelIds')?casualtyParameters(s):timingParameters(d)):null;
   const receipt=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+head.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>parameters}:{kind:'finite',select:r=>r.action.actionType===c.actionType})});assert.equal(receipt.idempotentReplayVerified,true);
   trace.push({revision:head.stateRevision+1,actionType:(d||c).actionType,definitionId:d?.definitionId||null,
    sourceInstanceId:d?.sourceDomain?.sourceInstanceId||null,stackDepth:stack.length});
   console.log(JSON.stringify(trace.at(-1)));
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state;
  assert.ok(s.log.flatMap(l=>l.events||[]).some(e=>e.type==='close_combat_attack'));
  assert.ok(!s.officialBeforeCasualtyContinuations?.length);assert.ok(!s.pendingOfficialAutomaticHits);
  assert.ok(!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
  if(frames.size)assert.equal(trace.some(r=>r.definitionId?.includes('/detonation-')),spec.use);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const coverageSatisfied=frames.size>0&&(!spec.use||maximumDepth>=2);
 const settledEvents=expected.envelope.state.log.flatMap(l=>l.events||[]),losses=expected.envelope.state.supplyLossLedger.entries||[];
 for(const frame of frames.values()){
  assert.deepEqual(frame.activationContext,[...frames.values()][0].activationContext,'ORIGINAL_ACTIVATION_CONTEXT_MUST_SURVIVE');
  for(const row of frame.rows){
   const matches=settledEvents.filter(e=>e.targetId===row.targetPieceId&&
    (e.resolutionHash===row.attackResolutionHash||e.stages?.resolutionHash===row.attackResolutionHash));
   assert.equal(matches.length,1,'SEALED_DAMAGE_BATCH_MUST_SETTLE_ONCE');
   assert.deepEqual(matches[0].casualtyModelIds,row.casualty.casualtyModelIds,'ORIGINAL_CASUALTY_ORDER_MUST_SURVIVE');
  }
 }
 for(const piece of expected.envelope.state.pieces){
  const entries=losses.filter(e=>e.unitId===piece.id),initial=scene.state.pieces.find(p=>p.id===piece.id);
  assert.equal(entries.reduce((sum,e)=>sum+e.currentSupplyBefore-e.currentSupplyAfter,0),initial.currentSupply-piece.currentSupply);
  if(coverageSatisfied&&spec.use&&!(piece.id==='ally'&&spec.allyKind==='allocation-only')){assert.equal(piece.isDestroyed,true);assert.equal(entries.length,1);}
 }
 if(coverageSatisfied&&multiTarget){
  const frame=[...frames.values()].find(f=>f.rows.length===2);assert.ok(frame,'MULTI_TARGET_FRAME_REQUIRED');
  if(spec.allyKind==='allocation-only')assert.equal(frame.rows.find(r=>r.targetPieceId==='ally').casualty.casualtyModelIds.length,0);
 }
 const result={...spec,attempt,coverageSatisfied,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
  maximumDepth,originalDiceAndCasualtyOrdersPreserved:true,supplyLossesExactlyOnce:true,frames:[...frames.values()].map(f=>({continuationId:f.continuationId,hostKind:f.hostKind,rows:f.rows,
   activationContext:f.activationContext})),trace,finalPieces:expected.envelope.state.pieces.map(p=>({id:p.id,isDestroyed:p.isDestroyed,currentModels:p.currentModels,currentSupply:p.currentSupply})),
  coldReplay:true,idempotencyVerified:true};await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 if(!coverageSatisfied){noDamageControls.push(result);assert.ok(attempt<7,'NATIVE_RANDOM_COVERAGE_NOT_REACHED');continue;}
 results.push(result);
 console.log(JSON.stringify({id:spec.id,status:'passed_scoped',signedActions:result.signedActions,maximumDepth}));
 break;
 }
}
const result={schema:'starcraft_tmg_wave4_detonation_nested_host_v1',status:'passed_scoped_melee_hits_nested',runRef:path.relative(root,directory),results,noDamageControls,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,otherRemovalHostsPending:true,
 fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/'+(multiTarget?'detonation-multi-target':'detonation-nested-host')+'.public.json'),JSON.stringify(result,null,2));
