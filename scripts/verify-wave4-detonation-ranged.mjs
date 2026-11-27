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
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-ranged-')),results=[];
for(const spec of [{id:'marine-use',use:true},{id:'marine-decline',use:false},{id:'trooper-use',unitKey:'infested_trooper',use:true}]){
 const scene=createWave4DetonationScene(inputs,spec),caseDirectory=path.join(directory,spec.id);
 const bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected,used=false,interrupted=false,originalResolutionHash;const roomId='wave4-detonation-'+spec.id,trace=[];
 try{const credentials=await native.create(roomId,bound.authority);
  await native.commit({roomId,credential:credentials.player1,operationKey:'attack',select:d=>d.pieceId==='attacker'&&d.weaponName==='Autocannon',parameters:()=>({targetUnitId:'defender'})});
  for(let step=0;step<32;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state;
   const completed=s.log.flatMap(l=>l.events||[]).find(e=>e.type==='ranged_attack');
   if(completed&&!s.officialBeforeCasualtyContinuations?.length){assert.equal(completed.attackResolutionHash,originalResolutionHash);break;}
   const frame=s.officialBeforeCasualtyContinuations?.at(-1);
   if(frame){interrupted=true;originalResolutionHash=frame.rows[0].attackResolutionHash;
    assert.ok(frame.rows[0].casualty.casualtyModelIds.every(id=>s.pieces.find(p=>p.id==='defender').models.some(m=>m.id===id&&!m.isDestroyed&&m.isOnField)));}
   const menu=bound.runtime.enumerate(s);let d;
   if(frame?.stage==='reaction')d=spec.use?menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation'):null;
   d||=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window')||menu.parameterDomains[0];
   const c=menu.candidates.find(c=>c.isEnabled!==false);assert.ok(d||c,'DETONATION_NATIVE_SUCCESSOR_REQUIRED');
   let parameters=d?d.parameterSchema.required.includes('casualtyModelIds')?
    {casualtyModelIds:d.parameterSchema.casualtyModelIds.items.enum.slice(0,d.parameterSchema.casualtyModelIds.minItems)}:timingParameters(d):null;
   const selected=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+head.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>parameters}:{kind:'finite',select:r=>r.action.actionType===c.actionType})});
   assert.equal(selected.idempotentReplayVerified,true);
   if(d?.effectKind==='before_casualty_detonation')used=true;
   trace.push({revision:head.stateRevision+1,actionType:(d||c).actionType,definitionId:d?.definitionId||null});console.log(JSON.stringify(trace.at(-1)));
  }
  expected=await native.store.loadRoom(roomId);assert.equal(interrupted,true);assert.equal(used,spec.use);
  const s=expected.envelope.state;assert.equal(Boolean(s.officialBeforeCasualtyContinuations?.length),false);
  assert.ok(s.log.flatMap(l=>l.events||[]).some(e=>e.type==='ranged_attack'));
  assert.ok(!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const result={...spec,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
  interrupted,used,originalResolutionHash,attackerDestroyed:expected.envelope.state.pieces.find(p=>p.id==='attacker').isDestroyed,
  trace,coldReplay:true,idempotencyVerified:true};results.push(result);await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({id:spec.id,status:'passed_scoped',signedActions:result.signedActions,attackerDestroyed:result.attackerDestroyed}));
}
const result={schema:'starcraft_tmg_wave4_detonation_ranged_host_v1',status:'passed_scoped_ranged_host_only',runRef:path.relative(root,directory),results,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,otherDamageAndRemovalHostsPending:true,multiTargetAndNestedPending:true,
 fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-ranged-host.public.json'),JSON.stringify(result,null,2));
