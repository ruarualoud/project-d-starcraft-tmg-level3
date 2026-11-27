import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8'));
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/corrode-compat-')),results=[];
for(const [name,id]of [['detonation-ranged-host','marine-use'],['detonation-nested-host','marine-both-use'],['bio-kill-switch','counter-detonation']]){
 const proof=await read('docs/development/wave4/evidence/'+name+'.public.json'),entry=proof.results.find(r=>r.id===id);
 const authority=await read(entry.directoryRef+'/authority.json'),scope=await read(entry.directoryRef+'/scope.json'),descriptor=await read(entry.directoryRef+'/runtime.json');
 const bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory:path.join(directory,name)});
 assert.equal(bound.runtime.descriptor.runtimeHash,descriptor.runtimeHash);
 const native=bound.open({directory:path.join(root,entry.directoryRef),readOnly:true});
 try{await native.restoreDependencies(entry.roomId,authority);const b=await native.store.loadReplayBundle(entry.roomId),head=await native.store.loadRoom(entry.roomId);
  const journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,head.envelope);
  results.push({id:name,roomId:entry.roomId,originalSignedActions:head.stateRevision,runtimeVersion:descriptor.runtimeVersion,
   descriptorUnchanged:true,coldReplay:true,stateHash:head.envelope.stateHash,newActions:0});console.log(JSON.stringify(results.at(-1)));
 }finally{native.close();}
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/corrode-armour-compat.public.json'),JSON.stringify({
 schema:'starcraft_tmg_wave4_corrode_compat_v1',status:'passed_scoped',results,modelCalls:0,trainingTruth:false},null,2));
