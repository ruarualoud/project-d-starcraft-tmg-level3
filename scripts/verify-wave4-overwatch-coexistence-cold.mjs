import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {loadWave4TurretInputs,bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {readOfficialOverwatchAttackGrantV1,getOfficialOverwatchSourceSpecV1} from '../packages/rule-atoms/official-overwatch-attack-policy-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8'));
const inputs={stukov:await loadWave4StukovUnitInputs(root),turret:await loadWave4TurretInputs(root)};
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/overwatch-coexistence-cold-')),results=[];
for(const [proofName,id,kind]of [['overwatch-compat','auto-overwatch-control','turret'],['turret-combat','ocular-use','turret'],
 ['overwatch-coexistence','ocular-used-blocks-detonation','stukov'],['overwatch-coexistence','ocular-declined-allows-detonation','stukov']]){
 const proof=await read('docs/development/wave4/evidence/'+proofName+'.public.json'),entry=proof.results.find(r=>r.id===id),authority=await read(entry.directoryRef+'/authority.json'),
  scope=await read(entry.directoryRef+'/scope.json'),descriptor=await read(entry.directoryRef+'/runtime.json');
 const bound=await bindWave4TurretRoom({inputs:inputs[kind],state:authority.state,...scope,directory:path.join(directory,id)});assert.deepEqual(bound.runtime.descriptor,descriptor);
 const native=bound.open({directory:path.join(root,entry.directoryRef),readOnly:true}),grants=[];
 try{await native.restoreDependencies(entry.roomId,authority);const b=await native.store.loadReplayBundle(entry.roomId),head=await native.store.loadRoom(entry.roomId),
   journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  for(const receipt of journal.filter(r=>r.events.some(e=>e.type==='reaction_ability_resolved'&&getOfficialOverwatchSourceSpecV1(e.definitionId)))){
   const prefix=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,receipt.postStateRevision)});assert.equal(prefix.ok,true);
   const grant=readOfficialOverwatchAttackGrantV1(prefix.envelope.state);assert.ok(grant);const spec=getOfficialOverwatchSourceSpecV1(grant.sourceDefinitionId);
   assert.equal(grant.profileKey,spec.profileKey);assert.equal(prefix.envelope.state.pieces.find(p=>p.id===grant.sourcePieceId).officialUnitRecordKey,spec.recordKey);grants.push(grant);
  }
  assert.equal(grants.length,id==='ocular-used-blocks-detonation'?2:1);
  const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,head.envelope);
  results.push({id,roomId:entry.roomId,originalSignedActions:head.stateRevision,runtimeVersion:descriptor.runtimeVersion,grants,
   descriptorUnchanged:true,coldReplay:true,sourceProfilesVerified:true,stateHash:head.envelope.stateHash,newActions:0});console.log(JSON.stringify(results.at(-1)));
 }finally{native.close();}
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/overwatch-coexistence-cold.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_overwatch_coexistence_cold_v1',
 status:'passed_read_only',results,modelCalls:0,trainingTruth:false},null,2));
