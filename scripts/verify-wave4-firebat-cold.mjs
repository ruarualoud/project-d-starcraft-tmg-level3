import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4FirebatInputs} from './compile-wave4-firebat.mjs';
import {createWave4FirebatScene} from './support/wave4-firebat-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {OFFICIAL_FIREBAT_STIMPACK_ID} from '../packages/source-data/official-firebat-source-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4FirebatInputs(root),
  proof=JSON.parse(await fs.readFile(path.join(root,'docs/development/wave4/evidence/firebat-foundation.public.json'),'utf8')),results=[];
assert.equal(proof.status,'passed_scoped');assert.equal(proof.results.length,5);
for(const row of proof.results){
  const scene=createWave4FirebatScene(inputs,{kind:row.kind,stimpack:row.stimpack}),
    bound=await bindWave4TurretRoom({inputs,...scene,directory:path.join(root,row.directoryRef)}),native=bound.open();
  try{
    const runtime=JSON.parse(await fs.readFile(path.join(root,row.directoryRef,'runtime.json'),'utf8'));
    assert.deepEqual(bound.runtime.descriptor,runtime);
    await native.restoreDependencies(row.roomId,bound.authority);const head=await native.store.loadRoom(row.roomId),
      bundle=await native.store.loadReplayBundle(row.roomId),journal=bundle.privateJournal
        .filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
      replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});
    assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,head.envelope);assert.equal(head.envelope.stateHash,row.stateHash);
    assert.equal(head.stateRevision,row.signedActions);assert.equal(head.envelope.state.round,2);assert.equal(head.envelope.state.phase,'movement');
    assert.ok(head.envelope.state.pieces.every(p=>!p.officialAbilityEffects?.some(e=>e.sourceDefinitionId===OFFICIAL_FIREBAT_STIMPACK_ID)));
    results.push({id:row.id,roomId:row.roomId,originalSignedActions:journal.length,descriptorUnchanged:true,coldReplay:true,
      stimpackRoundCleanupVerified:true,newActions:0});
    console.log(JSON.stringify({id:row.id,status:'passed_read_only'}));
  }finally{native.close();}
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/firebat-current-cold.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_firebat_current_cold_v1',status:'passed_read_only',results,newActions:0,
  sourceHeldDefinitions:39,fullFirebatAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
