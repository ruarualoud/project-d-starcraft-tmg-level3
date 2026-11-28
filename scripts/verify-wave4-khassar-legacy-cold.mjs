import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createOfficialReleaseResolverV2,bindOfficialReleaseRulesRuntimeV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createSqliteOfficialReleaseStoreV1} from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import {createOfficialCharacteristicStatusComponentRuntimeV2} from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import {openWave3EngineeringStoreV1,openWave3EngineeringRoomV1,createWave3ComponentEngineeringAuthorityV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Historical inputs are read-only; all new evidence stays in this worktree.
const historicalRoot=path.resolve(root,'../../..','starcraft-tmg-level3/.worktrees/ticket-27-slice-271-codex-integration');
const read=async ref=>JSON.parse(await fs.readFile(path.join(historicalRoot,ref),'utf8')),results=[];
for(const kind of ['shot','fight','charge']){
 const ref='build/ticket-28-protoss-wave3-20261120-v1/khassar-'+kind,directory=path.join(historicalRoot,ref),roomId='khassar-'+kind;
 const source=openWave3EngineeringStoreV1({directory,filename:'scenarios.sqlite',readOnly:true});let bundle,head;
 try{bundle=await source.loadReplayBundle(roomId);head=await source.loadRoom(roomId);}finally{source.close();}
 const release=await read(ref+'/candidate-release.json'),expectedDescriptor=await read(ref+'/runtime.json'),store=createSqliteOfficialReleaseStoreV1({filename:':memory:'});
 try{const resolver=createOfficialReleaseResolverV2({store,loadArtifact:read});resolver.register(release);const context=await resolver.resolve({releaseId:release.releaseId,purpose:'area_ability_component'});
  const state=bundle.initialEnvelope.state,runtime=createOfficialCharacteristicStatusComponentRuntimeV2({context,spatialState:state,
   definitionIds:['unit:high_templar/farsight-movement-phase@1'],includeMelee:true,includeRanged:true,
   ...(kind==='shot'?{includeKhassarShot:true}:kind==='fight'?{includeKhassarFight:true}:{includeKhassarCharge:true})});
  assert.deepEqual(runtime.descriptor,expectedDescriptor);
  const authority=createWave3ComponentEngineeringAuthorityV1({context,state,scenario:{readOnlyCompatibility:true}}),native=openWave3EngineeringRoomV1({directory,filename:'scenarios.sqlite',
   readOnly:true,rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context,runtime})});
  try{await native.restoreDependencies(roomId,authority);const journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
    replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,head.envelope);
   results.push({kind,roomId,inputRef:ref,originalSignedActions:head.stateRevision,runtimeVersion:runtime.descriptor.runtimeVersion,
    descriptorUnchanged:true,coldReplay:true,stateHash:head.envelope.stateHash,newActions:0,sourceOpenedReadOnly:true});console.log(JSON.stringify(results.at(-1)));
  }finally{native.close();}
 }finally{store.close();}
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/khassar-legacy-cold.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_khassar_legacy_cold_v1',
 status:'passed_read_only',results,modelCalls:0,trainingTruth:false},null,2));
