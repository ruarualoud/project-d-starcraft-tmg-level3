import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4TalDarimThresholdInputs} from './compile-wave4-tal-darim-threshold.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {projectOfficialFriendlyLostSupplyV1} from '../packages/rule-atoms/official-friendly-lost-supply-threshold-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4TalDarimThresholdInputs(root),
  read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8')),proof=await read('docs/development/wave4/evidence/tal-darim-threshold.public.json'),
  nativeOnly=process.argv.includes('--native'),webProofs=nativeOnly?[]:await Promise.all(['tal-darim-threshold-web','tal-darim-threshold-choice-web']
    .map(n=>read('docs/development/wave4/evidence/'+n+'.public.json'))),results=[];
assert.equal(proof.status,'passed_scoped');assert.equal(proof.results.length,7);assert.ok(webProofs.every(p=>p.status==='passed_scoped'));
for(const row of nativeOnly?proof.results:webProofs.flatMap(p=>p.results.map(r=>({...r,humanConfirmed:true,directoryRef:p.runRef+'/rooms/'+r.kind})))){
  const authority=await read(row.directoryRef+'/authority.json'),scope=await read(row.directoryRef+'/scope.json'),descriptor=await read(row.directoryRef+'/runtime.json'),
    bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,humanConfirmed:!!row.humanConfirmed,directory:path.join(root,row.directoryRef)});
  assert.deepEqual(bound.runtime.descriptor,descriptor);const native=bound.open({readOnly:true});
  try{await native.restoreDependencies(row.roomId,authority);const head=await native.store.loadRoom(row.roomId),b=await native.store.loadReplayBundle(row.roomId),
    journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
    replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
    assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,head.envelope);assert.equal(head.envelope.stateHash,row.stateHash);
    assert.equal(head.stateRevision,row.signedActions);
    if(row.fullNativeRound){assert.equal(head.envelope.state.round,2);assert.equal(head.envelope.state.phase,'movement');}
    const supply=projectOfficialFriendlyLostSupplyV1({state:head.envelope.state,sideKey:'player1'});
    results.push({id:row.id,roomId:row.roomId,sourceOpenedReadOnly:true,humanConfirmed:!!row.humanConfirmed,
      originalSignedActions:journal.length,newActions:0,descriptorUnchanged:true,coldReplay:true,baselineHash:supply.baselineHash,totalLostSupply:supply.totalLostSupply});
    console.log(JSON.stringify({id:row.id,humanConfirmed:!!row.humanConfirmed,status:'passed_read_only'}));
  }finally{native.close();}
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/tal-darim-threshold'+(nativeOnly?'-native':'')+'-cold.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_tal_darim_threshold_cold_v1',status:'passed_read_only',results,newActions:0,
  sourceHeldDefinitions:39,fullFactionAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
