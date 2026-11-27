import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4DetonationTemplateScene} from './support/wave4-detonation-template-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9);
const directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-template-')),results=[],noDamageControls=[];
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-template-')));
const specs=[{id:'main-first-use',use:true},{id:'main-first-decline',use:false},{id:'spillover-first-use',use:true,spilloverFirst:true}];
function parameters(state,d){const schema=d.parameterSchema||d.sourceDomain.parameterSchema;
 if(!schema.required.includes('casualtyModelIds'))return timingParameters(d);
 const p=state.pendingAction?.casualtyDomain?state.pendingAction:state.pendingOfficialAutomaticHits
  ||{targetPieceId:state.pendingOfficialBlastTemplateAttack.currentAction.targetId,casualtyDomain:state.pendingOfficialBlastTemplateAttack.currentChance.casualtyDomain};
 const contract=p.casualtyDomain.selectionContract,casualtyModelIds=[];
 while(casualtyModelIds.length<contract.casualtyCount){const r=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,selectionContract:contract,casualtyModelIds,complete:false});
  assert.ok(r.valid&&r.legalNextModelIds.length);casualtyModelIds.push(r.legalNextModelIds[0]);}return{casualtyModelIds};
}
for(const spec of specs)for(let attempt=0;attempt<8;attempt++){
 const caseDirectory=path.join(directory,spec.id+'-'+attempt),roomId='wave4-detonation-template-'+spec.id+'-'+attempt;
 if(resume){const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){if(saved.coverageSatisfied){results.push(saved);break;}noDamageControls.push(saved);continue;}}
 const scene=await createWave4DetonationTemplateScene(inputs,{root,...spec}),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected;const trace=[],frames=new Map();
 try{const credentials=await native.create(roomId,bound.authority);
  await native.commit({roomId,credential:credentials.player1,operationKey:'template',select:d=>d.actionType==='blast_template_attack',parameters:()=>scene.templateParameters});
  for(let step=0;step<70;step++){
   const h=await native.store.loadRoom(roomId),s=h.envelope.state,stack=s.officialBeforeCasualtyContinuations||[];
   for(const f of stack){frames.set(f.continuationId,f);for(const row of f.rows)assert.ok(row.casualty.casualtyModelIds.every(id=>s.pieces.find(p=>p.id===row.targetPieceId).models.some(m=>m.id===id&&!m.isDestroyed&&m.isOnField)));}
   if(!s.pendingOfficialBlastTemplateAttack&&!s.pendingOfficialRangedPrecisionChoice&&!s.pendingOfficialAutomaticHits&&!stack.length
    &&s.log.flatMap(l=>l.events||[]).some(e=>e.type==='ranged_weapon_completed'))break;
   const menu=bound.runtime.enumerate(s),frame=stack.at(-1);
   const d=(spec.use&&frame?.stage==='reaction'?menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation'):null)
    ||menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window')||menu.parameterDomains[0];
   const candidates=menu.candidates.filter(c=>c.isEnabled!==false),c=candidates.find(c=>c.selectedBatchUnitId===scene.templateParameters.batchOrderUnitIds.find(id=>!s.pendingOfficialBlastTemplateAttack?.completed.some(b=>b.targetId===id)))||candidates[0];
   assert.ok(d||c,'TEMPLATE_DETONATION_SUCCESSOR_REQUIRED');
   const result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+h.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>parameters(s,d)}:{kind:'finite',select:r=>r.action.actionType===c.actionType&&r.action.targetId===c.targetId})});
   assert.equal(result.idempotentReplayVerified,true);trace.push({revision:h.stateRevision+1,actionType:(d||c).actionType,definitionId:d?.definitionId||null,stackDepth:stack.length});console.log(JSON.stringify(trace.at(-1)));
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]),batches=events.filter(e=>e.type==='ranged_attack'&&e.pieceId==='attacker');
  assert.equal(events.filter(e=>e.type==='ranged_weapon_completed').length,1);
  assert.ok(!s.pendingOfficialBlastTemplateAttack&&!s.officialBeforeCasualtyContinuations?.length&&!s.pendingOfficialAutomaticHits);
  assert.ok(!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
  for(const f of frames.values())for(const row of f.rows){const matched=events.filter(e=>e.targetId===row.targetPieceId&&e.attackResolutionHash===row.attackResolutionHash);
   assert.equal(matched.length,1);assert.deepEqual(matched[0].casualtyModelIds,row.casualty.casualtyModelIds);}
  assert.ok(batches.some(e=>e.targetId==='defender'));assert.ok(batches.some(e=>e.targetId==='spillover'));
  const initialSupply=Object.fromEntries(scene.state.pieces.map(p=>[p.id,p.currentSupply]));
  for(const p of s.pieces)assert.equal(s.supplyLossLedger.entries.filter(e=>e.unitId===p.id).reduce((n,e)=>n+e.currentSupplyBefore-e.currentSupplyAfter,0),initialSupply[p.id]-p.currentSupply);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const s=expected.envelope.state,coverageSatisfied=frames.size>0&&(!spec.use||s.pieces.find(p=>p.id==='attacker').isDestroyed);
 const result={...spec,attempt,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
  coverageSatisfied,attackerDestroyed:s.pieces.find(p=>p.id==='attacker').isDestroyed,frames:[...frames.values()].map(f=>({hostKind:f.hostKind,rows:f.rows,activationContext:f.activationContext})),trace,
  originalDiceAndCasualtyOrderPreserved:true,supplyExactlyOnce:true,templateCompletedOnce:true,coldReplay:true,idempotencyVerified:true};
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 if(!coverageSatisfied){noDamageControls.push(result);assert.ok(attempt<7,'NATIVE_TEMPLATE_COVERAGE_NOT_REACHED');continue;}results.push(result);break;
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-template.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_template_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,noDamageControls,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,otherRemovalHostsPending:true,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false},null,2));
