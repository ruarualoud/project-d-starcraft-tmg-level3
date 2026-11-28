import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {createOfficialReleaseResolverV2,bindOfficialReleaseRulesRuntimeV2} from '../packages/source-data/official-release-context-v2.mjs';
import {createSqliteOfficialReleaseStoreV1} from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import {createOfficialCharacteristicStatusComponentRuntimeV2} from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import {openWave3EngineeringRoomV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),historicalRoot=path.resolve(root,'../../..','starcraft-tmg-level3/.worktrees/ticket-27-slice-271-codex-integration'),
 ref='build/ticket-28-wave2-capabilities-20261113-v1/corrosive-bile-resolution',caseRef=ref+'/destroyed-source/end',roomId='wave2-bile-resolution-destroyed-source-end',
 read=async r=>JSON.parse(await fs.readFile(path.join(historicalRoot,r),'utf8')),authority=await read(caseRef+'/authority.json'),expected=await read(caseRef+'/runtime.json'),
 sourceFile=path.join(historicalRoot,caseRef,'room.sqlite.gz'),archive=await fs.readFile(sourceFile),bytes=gunzipSync(archive),
 directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/bile-legacy-cold-'));
let manifest=authority.dependencies.dataSnapshot.content.releaseManifest;
if(!manifest){const db=new DatabaseSync(path.join(historicalRoot,ref,'releases.sqlite'),{readOnly:true});try{manifest=JSON.parse(db.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?').get(authority.releaseId).manifest_json);}finally{db.close();}}
await fs.writeFile(path.join(directory,'room.sqlite'),bytes,{flag:'wx'});
const store=createSqliteOfficialReleaseStoreV1({filename:':memory:'});
try{const resolver=createOfficialReleaseResolverV2({store,loadArtifact:read});resolver.register(manifest);const context=await resolver.resolve({releaseId:manifest.releaseId,purpose:'area_ability_component'}),
 runtime=createOfficialCharacteristicStatusComponentRuntimeV2({context,spatialState:authority.state,definitionIds:['unit:ravager/squadron-any-phase@1'],includeHits:true});
 assert.deepEqual(runtime.descriptor,expected);
 const native=openWave3EngineeringRoomV1({directory,filename:'room.sqlite',readOnly:true,rulesRuntime:bindOfficialReleaseRulesRuntimeV2({context,runtime})});
 try{await native.restoreDependencies(roomId,authority);const b=await native.store.loadReplayBundle(roomId),h=await native.store.loadRoom(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,h.envelope);
  assert.deepEqual(await fs.readFile(sourceFile),archive);
  const result={schema:'starcraft_tmg_wave4_bile_legacy_cold_v1',status:'passed_read_only',roomId,inputRef:caseRef,runRef:path.relative(root,directory),
   originalSignedActions:h.stateRevision,runtimeVersion:runtime.descriptor.runtimeVersion,descriptorUnchanged:true,coldReplay:true,
   archiveSha256:createHash('sha256').update(archive).digest('hex'),decompressedDatabaseSha256:createHash('sha256').update(bytes).digest('hex'),
   originalArchiveUnchanged:true,sourceOpenedReadOnly:true,newActions:0,modelCalls:0,trainingTruth:false};
  await atomicWrite(path.join(root,'docs/development/wave4/evidence/bile-legacy-cold.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{native.close();}
}finally{store.close();}
