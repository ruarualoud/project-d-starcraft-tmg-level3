import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8'));
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-compat-'));
const cases=[['infested-infantry-base','marine-infection'],['plagued-munitions','medic-reduces-non-lethal'],['stukov-infestation','warden-round']];
const results=[];
for(const [name,id]of process.argv.includes('--ranged-only')?[]:cases){
 const proof=await read('docs/development/wave4/evidence/'+name+'.public.json'),entry=proof.results.find(r=>r.id===id),ref=entry.directoryRef||entry.runRef;
 const authority=await read(ref+'/authority.json'),scope=await read(ref+'/scope.json'),oldRuntime=await read(ref+'/runtime.json');
 const bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory:path.join(directory,id)});
 assert.equal(bound.runtime.descriptor.runtimeHash,oldRuntime.runtimeHash,'LEGACY_DESCRIPTOR_CHANGED');
 const native=bound.open({directory:path.join(root,ref),readOnly:true});
 try{await native.restoreDependencies(entry.roomId,authority);const b=await native.store.loadReplayBundle(entry.roomId),head=await native.store.loadRoom(entry.roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,head.envelope);
  results.push({id,roomId:entry.roomId,originalSignedActions:head.stateRevision,runtimeHash:oldRuntime.runtimeHash,stateHash:head.envelope.stateHash,
   descriptorUnchanged:true,coldReplay:true,newActions:0});console.log(JSON.stringify({id,status:'passed',originalActions:head.stateRevision}));
 }finally{native.close();}
}
const ranged=await read('docs/development/wave4/evidence/detonation-ranged-host.public.json');
const audits=[];
for(const entry of ranged.results){
 const authority=await read(entry.directoryRef+'/authority.json'),scope=await read(entry.directoryRef+'/scope.json'),oldRuntime=await read(entry.directoryRef+'/runtime.json');
 const bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory:path.join(directory,entry.id)});
 assert.equal(bound.runtime.descriptor.runtimeHash,oldRuntime.runtimeHash,'V1_DETONATION_DESCRIPTOR_CHANGED');
 const native=bound.open({directory:path.join(root,entry.directoryRef),readOnly:true});
 try{await native.restoreDependencies(entry.roomId,authority);const bundle=await native.store.loadReplayBundle(entry.roomId);
  const journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const head=await native.store.loadRoom(entry.roomId),replayed=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});
  assert.equal(replayed.ok,true);assert.deepEqual(replayed.envelope,head.envelope,'V1_DETONATION_REPLAY_CHANGED');
  const s=head.envelope.state,events=s.log.flatMap(l=>l.events||[]),rangedEvents=events.filter(e=>e.type==='ranged_attack');
  assert.equal(rangedEvents.length,1);assert.equal(rangedEvents[0].attackResolutionHash,entry.originalResolutionHash);
  const interrupt=events.find(e=>e.type==='before_casualty_batch_interrupted');assert.ok(interrupt);
  assert.deepEqual(rangedEvents[0].casualtyModelIds,interrupt.modelIdsToBeDestroyed);
  const losses=(s.supplyLossLedger.entries||[]).filter(e=>e.unitId==='attacker');
  assert.equal(losses.length,entry.attackerDestroyed?1:0);
  const attacker=s.pieces.find(p=>p.id==='attacker'),initial=authority.state.pieces.find(p=>p.id==='attacker');
  if(entry.attackerDestroyed)assert.equal(initial.currentSupply-attacker.currentSupply,losses[0].currentSupplyBefore-losses[0].currentSupplyAfter);
  audits.push({id:entry.id,oneOriginalAttack:true,originalChoicePreserved:true,originalResolutionHash:entry.originalResolutionHash,
   attackerSupplyLossEntries:losses.length,attackerDestroyed:entry.attackerDestroyed,newActions:0,descriptorUnchanged:true,coldReplay:true});
 }finally{native.close();}
}
const result={schema:'starcraft_tmg_wave4_before_casualty_compat_v1',status:'passed_scoped',legacyResults:results,rangedHostAudits:audits,
 nativeActionsAdded:0,otherDetonationHostsPending:true,newGameAtomsImplemented:0,implementedCumulativeAtoms:6,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/'+(process.argv.includes('--ranged-only')?'detonation-v1-cold-compat':'before-casualty-compat')+'.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,legacyCases:results.length,rangedAudits:audits.length}));
