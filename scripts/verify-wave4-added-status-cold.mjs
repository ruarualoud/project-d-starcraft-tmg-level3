import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4AddedCardInputs} from './compile-wave4-added-cards.mjs';
import {loadWave4TurretInputs,bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4AddedCardInputs(root),
  read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8')),webOnly=process.argv.includes('--web'),results=[];
let specs,legacyInputs;
if(webOnly){const proof=await read('docs/development/wave4/evidence/added-status-reactions-web.public.json');assert.equal(proof.status,'passed_scoped');
  specs=proof.results.map(r=>({...r,id:r.kind,roomId:'product-wave4-web-'+r.kind,directoryRef:proof.runRef+'/rooms/'+r.kind,humanConfirmed:true}));
}else{
  const proof=await read('docs/development/wave4/evidence/added-status-reactions-native.public.json'),
    active=await read('docs/development/wave4/evidence/added-card-active.public.json'),
    turret=await read('docs/development/wave4/evidence/turret-combat.public.json');assert.equal(proof.status,'passed_scoped');
  specs=[...proof.results,{id:'old-burrow-origin-control',roomId:'wave4-added-status-brutal-gain',signedActions:7,
    directoryRef:'build/wave4-web/added-status-reactions/native-SNZw2c/brutal-gain',control:true},
    {...active.results.find(r=>r.kind==='scanner'),id:'legacy-indicator-scanner',legacy:true},
    {...turret.results.find(r=>r.id==='infestation-restoration'),id:'legacy-infestation-transfer-restoration',legacy:true,turret:true}];
}
for(const row of specs){const source=row.turret?(legacyInputs ||= await loadWave4TurretInputs(root)):inputs,
  authority=await read(row.directoryRef+'/authority.json'),scope=await read(row.directoryRef+'/scope.json'),descriptor=await read(row.directoryRef+'/runtime.json'),
  bound=await bindWave4TurretRoom({inputs:source,state:authority.state,...scope,humanConfirmed:!!row.humanConfirmed,directory:path.join(root,row.directoryRef)});
  assert.deepEqual(bound.runtime.descriptor,descriptor);const native=bound.open({readOnly:true});
  try{await native.restoreDependencies(row.roomId,authority);const head=await native.store.loadRoom(row.roomId),b=await native.store.loadReplayBundle(row.roomId),
    journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
    assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,head.envelope);assert.equal(head.stateRevision,row.signedActions);
    if(row.stateHash)assert.equal(head.envelope.stateHash,row.stateHash);
    if(!row.control&&!row.legacy&&!row.humanConfirmed){assert.equal(head.envelope.state.round,2);assert.equal(head.envelope.state.phase,'movement');}
    if(row.control){assert.equal(head.envelope.state.officialSourceGrantedBurrowPolicy,undefined);
      assert.ok(head.envelope.state.pieces.find(p=>p.id==='actor').statuses.some(s=>s.statusName==='burrowed'));}
    results.push({id:row.id,roomId:row.roomId,stateHash:head.envelope.stateHash,originalSignedActions:journal.length,newActions:0,
      descriptorUnchanged:true,coldReplay:true,sourceOpenedReadOnly:true,oldPolicyControl:!!row.control,legacy:!!row.legacy,humanConfirmed:!!row.humanConfirmed});
    console.log(JSON.stringify({id:row.id,status:'passed_read_only'}));
  }finally{native.close();}
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/added-status-reactions-'+(webOnly?'web':'native')+'-cold.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_added_status_reactions_cold_v1',status:'passed_read_only',results,newActions:0,sourceHeldDefinitions:39,
  newCompleteAtoms:0,implementedCumulativeAtoms:7,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
