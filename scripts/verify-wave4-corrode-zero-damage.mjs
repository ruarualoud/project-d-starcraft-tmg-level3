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
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/corrode-zero-')),results=[];
for(let attempt=0;attempt<16;attempt++){
 const scene=createWave4BioKillSwitchScene(inputs,{combatWeapons:true,woundedCaster:false,targetKey:'stukov',corrode:true,empty:true});
 const caseDirectory=path.join(directory,'attempt-'+attempt),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected;const roomId='wave4-corrode-zero-'+attempt,trace=[];
 try{const credentials=await native.create(roomId,bound.authority);
  await native.commit({roomId,credential:credentials.player1,operationKey:'attack',select:d=>d.pieceId==='stukov'&&d.weaponName==='Corrosive Blast',
   parameters:()=>({targetUnitId:'infected'})});
  for(let step=0;step<20;step++){
   const head=await native.store.loadRoom(roomId),s=head.envelope.state;if(!s.pendingOfficialRangedLungeReaction&&!s.deferredOfficialRangedLungeTrigger)break;
   const menu=bound.runtime.enumerate(s),d=menu.parameterDomains.find(d=>d.definitionId===OFFICIAL_CORRODE_ARMOUR_ID)
    ||menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');assert.ok(d);
   const receipt=await native.commit({roomId,credential:credentials[d.sideKey||s.activeSideKey],operationKey:'step-'+head.stateRevision,
    select:r=>r.domainId===d.domainId,parameters:timingParameters});assert.equal(receipt.idempotentReplayVerified,true);
   trace.push({revision:head.stateRevision+1,actionType:d.actionType,definitionId:d.definitionId||null});
  }
  expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,target=s.pieces.find(p=>p.id==='infected');
  assert.ok(trace.some(t=>t.definitionId===OFFICIAL_CORRODE_ARMOUR_ID));assert.equal(resolveOfficialEffectiveCombatProfileV1(s,target).armourThreshold,5);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const attack=expected.envelope.state.log.flatMap(l=>l.events||[]).find(e=>e.type==='ranged_attack');
 assert.equal(attack.stages.effects.surgeMatched,false);
 const result={id:'mirror-stukov-attempt-'+attempt,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,
  originalDamage:attack.stages.damage.totalDamage,zeroDamage:attack.stages.damage.totalDamage===0,stateHash:expected.envelope.stateHash,
  trace,corrodeUsed:true,armourThresholdAfter:5,coldReplay:true,idempotencyVerified:true};results.push(result);
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 if(result.zeroDamage)break;assert.ok(attempt<15,'NATIVE_ZERO_DAMAGE_COVERAGE_NOT_REACHED');
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/corrode-armour-zero-damage.public.json'),JSON.stringify({
 schema:'starcraft_tmg_wave4_corrode_zero_damage_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,
 zeroDamageNativeVerified:true,noRollInjection:true,newGameAtomsImplemented:0,implementedCumulativeAtoms:6,
 fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false},null,2));
