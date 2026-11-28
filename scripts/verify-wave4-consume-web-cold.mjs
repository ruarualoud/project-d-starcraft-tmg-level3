import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputsV3(root),
  read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8')),
  directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/consume-web-cold-')),results=[];
for(const name of ['consume-web','detonation-disengage-web']){
  const proof=await read('docs/development/wave4/evidence/'+name+'.public.json');assert.equal(proof.status,'passed_scoped');
  for(const row of proof.results){
    const ref=proof.runRef+'/rooms/'+row.kind,authority=await read(ref+'/authority.json'),scope=await read(ref+'/scope.json'),
      descriptor=await read(ref+'/runtime.json'),bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,humanConfirmed:true,
        directory:path.join(directory,name+'-'+row.kind)});
    assert.deepEqual(bound.runtime.descriptor,descriptor);
    assert.equal(descriptor.runtimeVersion,name==='consume-web'?'1.1.0':'1.0.0');
    const roomId='product-wave4-web-'+row.kind,native=bound.open({directory:path.join(root,ref),readOnly:true});
    try{
      await native.restoreDependencies(roomId,authority);const head=await native.store.loadRoom(roomId),b=await native.store.loadReplayBundle(roomId),
        journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
        replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
      assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,head.envelope);assert.equal(head.stateRevision,row.signedActions);
      results.push({id:name+'-'+row.kind,roomId,inputRef:ref,sourceOpenedReadOnly:true,humanWrapperVersion:descriptor.runtimeVersion,
        descriptorUnchanged:true,coldReplay:true,originalSignedActions:journal.length,newActions:0,stateHash:head.envelope.stateHash});
      console.log(JSON.stringify(results.at(-1)));
    }finally{native.close();}
  }
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/consume-web-cold.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_consume_web_cold_v1',
  status:'passed_read_only',results,modelCalls:0,trainingTruth:false},null,2));
