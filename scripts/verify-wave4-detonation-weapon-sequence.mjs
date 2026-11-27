import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4DetonationScene} from './support/wave4-detonation-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9);
const directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-sequence-')),results=[],controls=[];
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-sequence-')));
for(const woundedAttacker of [true,false])for(let attempt=0;attempt<8;attempt++){
 const id=woundedAttacker?'dead-source':'surviving-source',caseDirectory=path.join(directory,id+'-'+attempt),roomId='wave4-detonation-sequence-'+id+'-'+attempt;
 if(resume){const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){if(saved.coverageSatisfied){results.push(saved);break;}controls.push(saved);continue;}}
 const scene=createWave4DetonationScene(inputs,{woundedAttacker,multipleWeapons:true,beforeCasualtyPolicyVersion:'1.3.0'}),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected;const trace=[],frames=new Map();
 try{const credentials=await native.create(roomId,bound.authority);
  if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
   const definition=a=>a?(a.definitionId||definition(a.sourceAction)):null;
   for(const r of journal){trace.push({revision:r.postStateRevision,actionType:r.action.actionType,definitionId:definition(r.action)||null,restoredFromSignedJournal:true});
    if(r.events.some(e=>e.type==='before_casualty_batch_interrupted')){const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,r.postStateRevision)});
     assert.equal(replay.ok,true);for(const f of replay.envelope.state.officialBeforeCasualtyContinuations||[])frames.set(f.continuationId,f);}}
  }
  for(let step=0;step<60;step++){
   const h=await native.store.loadRoom(roomId),s=h.envelope.state,shots=s.rangedActionHistory?.filter(r=>r.pieceId==='attacker')||[],stack=s.officialBeforeCasualtyContinuations||[];
   for(const f of stack){frames.set(f.continuationId,f);assert.ok(f.suspendedHostSlots.pendingCurrentProductRangedSequence);assert.ok(f.activationContext.activationId);}
   if(shots.length===2&&!stack.length&&!s.pendingOfficialAutomaticHits&&!s.pendingCurrentProductRangedSequence)break;
   const menu=bound.runtime.enumerate(s);let d,p,c;
   if(stack.at(-1)?.stage==='reaction')d=menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation');
   d||=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
   if(!d&&!stack.length&&shots.length<2){d=menu.parameterDomains.find(d=>d.pieceId==='attacker'&&d.weaponName===(shots.length?'Underbelly Machine Gun':'Autocannon'));
    if(d&&(d.parameterSchema||d.sourceDomain.parameterSchema).required.includes('targetUnitId'))p={targetUnitId:shots.length?'defender':'anchor'};}
   d||=menu.parameterDomains.find(d=>d.actionType==='finish_ranged_attack_sequence');
   c=menu.candidates.find(c=>c.actionType==='finish_ranged_attack_sequence')||menu.candidates.find(c=>c.isEnabled!==false);
   if(!d&&!c)d=menu.parameterDomains[0];
   assert.ok(d||c,'DETONATION_SEQUENCE_SUCCESSOR_REQUIRED');
   const schema=d&&(d.parameterSchema||d.sourceDomain.parameterSchema);
   if(d&&!p)p=schema.required.includes('casualtyModelIds')?{casualtyModelIds:schema.casualtyModelIds.items.enum.slice(0,schema.casualtyModelIds.minItems)}:timingParameters(d);
   const receipt=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+h.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p}:{kind:'finite',select:r=>r.action.actionType===c.actionType})});
   assert.equal(receipt.idempotentReplayVerified,true);trace.push({revision:h.stateRevision+1,actionType:(d||c).actionType,definitionId:d?.definitionId||null,stackDepth:stack.length});console.log(JSON.stringify(trace.at(-1)));
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]),shots=events.filter(e=>e.type==='ranged_attack'&&e.pieceId==='attacker');
  assert.equal(shots.length,2);assert.deepEqual(shots.map(e=>e.weaponName),['Autocannon','Underbelly Machine Gun']);assert.equal(s.pieces.find(p=>p.id==='anchor').isDestroyed,false);
  assert.ok(!s.pendingCurrentProductRangedSequence&&!s.officialBeforeCasualtyContinuations?.length&&!s.pendingOfficialAutomaticHits&&!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
  for(const f of frames.values())for(const row of f.rows){const matches=shots.filter(e=>e.attackResolutionHash===row.attackResolutionHash);assert.equal(matches.length,1);assert.deepEqual(matches[0].casualtyModelIds,row.casualty.casualtyModelIds);}
  for(const p of s.pieces)assert.equal(s.supplyLossLedger.entries.filter(e=>e.unitId===p.id).reduce((n,e)=>n+e.currentSupplyBefore-e.currentSupplyAfter,0),scene.state.pieces.find(i=>i.id===p.id).currentSupply-p.currentSupply);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const actor=expected.envelope.state.pieces.find(p=>p.id==='attacker'),coverageSatisfied=frames.size>0&&actor.isDestroyed===woundedAttacker;
 const result={id,attempt,woundedAttacker,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,coverageSatisfied,
  attackerDestroyed:actor.isDestroyed,sequenceSlotActuallySuspended:frames.size>0,originalDiceAndCasualtyOrderPreserved:true,supplyExactlyOnce:true,trace,coldReplay:true,idempotencyVerified:true};
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 if(!coverageSatisfied){controls.push(result);assert.ok(attempt<7,'NATIVE_SEQUENCE_COVERAGE_NOT_REACHED');continue;}results.push(result);break;
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-weapon-sequence.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_weapon_sequence_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,controls,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false},null,2));
