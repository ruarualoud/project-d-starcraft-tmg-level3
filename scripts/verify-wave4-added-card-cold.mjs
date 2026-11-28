import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4AddedCardInputs} from './compile-wave4-added-cards.mjs';
import {loadWave4TalDarimThresholdInputs} from './compile-wave4-tal-darim-threshold.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4AddedCardInputs(root),
  read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8')),proof=await read('docs/development/wave4/evidence/added-card-active.public.json'),
  webOnly=process.argv.includes('--web'),nerazimOnly=process.argv.includes('--nerazim'),
  specs=webOnly?[]:nerazimOnly?[await read('build/wave4-web/added-cards/active-New9t1/scanner-nerazim/result.public.json')]:[...proof.results,
    {id:'scanner-old-policy-control',roomId:'wave4-added-card-scanner',directoryRef:'build/wave4-web/added-cards/active-New9t1/scanner',signedActions:20,control:true}],results=[];
if(webOnly){const web=await read('docs/development/wave4/evidence/added-card-web.public.json');assert.equal(web.status,'passed_scoped');
  specs.push(...web.results.map(r=>({...r,id:r.kind,roomId:'product-wave4-web-'+r.kind,directoryRef:web.runRef+'/rooms/'+r.kind,humanConfirmed:true})));}
else if(!nerazimOnly){
  const old=await read('docs/development/wave4/evidence/tal-darim-threshold.public.json');
  for(const id of ['ranged-6','dynamic-ranged-3'])specs.push({...old.results.find(r=>r.id===id),id:'legacy-'+id,legacy:true});
}
let legacyInputs;
for(const row of specs){const source=row.legacy?(legacyInputs ||= await loadWave4TalDarimThresholdInputs(root)):inputs,
  authority=await read(row.directoryRef+'/authority.json'),scope=await read(row.directoryRef+'/scope.json'),descriptor=await read(row.directoryRef+'/runtime.json'),
  bound=await bindWave4TurretRoom({inputs:source,state:authority.state,...scope,humanConfirmed:!!row.humanConfirmed,directory:path.join(root,row.directoryRef)});
  assert.deepEqual(bound.runtime.descriptor,descriptor);const native=bound.open({readOnly:true});
  try{await native.restoreDependencies(row.roomId,authority);const head=await native.store.loadRoom(row.roomId),b=await native.store.loadReplayBundle(row.roomId),
    journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
    assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,head.envelope);assert.equal(head.stateRevision,row.signedActions);
    if(row.stateHash)assert.equal(head.envelope.stateHash,row.stateHash);
    if(!row.humanConfirmed){assert.equal(head.envelope.state.round,2);assert.equal(head.envelope.state.phase,'movement');}
    if(row.nerazimUsed){assert.ok(!head.envelope.state.pieces.find(p=>p.id==='enemy').officialAbilityEffects
      .some(e=>e.sourceDefinitionId==='card:nerazim/might-of-the-nerazim-any@1'));}
    if(row.control){assert.equal(head.envelope.state.officialDetectionHiddenLossPolicy,undefined);
      assert.ok(!head.envelope.state.rangedActionHistory?.length);}
    results.push({id:row.id,roomId:row.roomId,stateHash:head.envelope.stateHash,originalSignedActions:journal.length,newActions:0,
      descriptorUnchanged:true,coldReplay:true,sourceOpenedReadOnly:true,oldPolicyControl:!!row.control,legacy:!!row.legacy,humanConfirmed:!!row.humanConfirmed});
    console.log(JSON.stringify({id:row.id,status:'passed_read_only'}));
  }finally{native.close();}
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/added-card-'+(webOnly?'web':nerazimOnly?'nerazim':'native')+'-cold.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_added_card_cold_v1',status:'passed_read_only',results,newActions:0,sourceHeldDefinitions:39,
  newCompleteAtoms:0,implementedCumulativeAtoms:7,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
