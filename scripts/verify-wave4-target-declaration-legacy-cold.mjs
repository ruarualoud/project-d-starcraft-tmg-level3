import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createOfficialReleaseResolverV2,bindOfficialReleaseRulesRuntimeV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createSqliteOfficialReleaseStoreV1} from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import {createOfficialCharacteristicStatusComponentRuntimeV2} from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import {openWave3EngineeringRoomV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),historicalRoot=path.resolve(root,'../../..','starcraft-tmg-level3/.worktrees/ticket-27-slice-271-codex-integration'),
 read=async ref=>JSON.parse(await fs.readFile(path.join(historicalRoot,ref),'utf8')),results=[];
for(const spec of [
 {id:'head-shot-use',ref:'build/ticket-28-terran-wave3-20261117-v1/nova-head-shot/use',roomId:'wave3-nova-head-shot-use',filename:'room.sqlite',options:{includeRanged:true,includeMelee:true,includePrecisionChoices:true,includeArmourChoices:true,weaponDefinitionIds:['unit:nova_stealth_mode/c-20a-canister-rifle-assault-phase@1']}},
 {id:'dark-swarm-use',ref:'build/ticket-28-zerg-wave3-20261117-v1/dark-swarm-reaction/size2-use-faq13',roomId:'wave3-dark-swarm-reaction-size2-use-faq13',filename:'room.sqlite',options:{includeRanged:true,includeTargetReactions:true,includePrecisionChoices:true,includeArmourChoices:true}},
]){
 const authority=await read(spec.ref+'/authority.json'),manifest=authority.dependencies.dataSnapshot.content.releaseManifest,expected=await read(spec.ref+'/runtime.json'),store=createSqliteOfficialReleaseStoreV1({filename:':memory:'});
 try{const resolver=createOfficialReleaseResolverV2({store,loadArtifact:read});resolver.register(manifest);const context=await resolver.resolve({releaseId:manifest.releaseId,purpose:'area_ability_component'}),
   runtime=createOfficialCharacteristicStatusComponentRuntimeV2({context,spatialState:authority.state,definitionIds:authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds,...spec.options});
  assert.deepEqual(runtime.descriptor,expected);
  const native=openWave3EngineeringRoomV1({directory:path.join(historicalRoot,spec.ref),filename:spec.filename,readOnly:true,rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context,runtime})});
  try{await native.restoreDependencies(spec.roomId,authority);const b=await native.store.loadReplayBundle(spec.roomId),head=await native.store.loadRoom(spec.roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
    replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,head.envelope);
   results.push({id:spec.id,roomId:spec.roomId,inputRef:spec.ref,originalSignedActions:head.stateRevision,runtimeVersion:runtime.descriptor.runtimeVersion,
    descriptorUnchanged:true,coldReplay:true,stateHash:head.envelope.stateHash,sourceOpenedReadOnly:true,newActions:0});console.log(JSON.stringify(results.at(-1)));
  }finally{native.close();}
 }finally{store.close();}
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/target-declaration-legacy-cold.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_target_declaration_legacy_cold_v1',status:'passed_read_only',results,modelCalls:0,trainingTruth:false},null,2));
