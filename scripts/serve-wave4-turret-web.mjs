import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadWave4TurretInputs, bindWave4TurretRoom } from './support/wave4-turret-room-v1.mjs';
import { createStarcraftTmgLevel3HttpAdapter } from '../packages/http-adapter/handler-v1.mjs';
import { createRosterWorkspaceServerV1 } from './serve-ticket-27-slice-271-roster-workspace-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const sourceResult=await read(path.resolve(process.argv[2]));
assert.equal(sourceResult.status,'passed_conditional_geometry');
const directory=path.resolve(process.argv[3]);
assert.ok(directory.startsWith(path.join(root,'build/wave4-web')+path.sep));
const webRoot=process.argv[4]?path.resolve(process.argv[4]):path.join(root,'apps/starcraft-tmg-expo/dist-product');
if(process.argv[4])assert.ok(webRoot.startsWith(path.join(root,'build/wave4-web')+path.sep));
const inputs=await loadWave4TurretInputs(root);
const rooms=new Map();
const service={liveEnabled:false,scope:'turret reactions and complete native successors; conditional geometry',rooms:[]};
for(const spec of [
  {id:'ocular-use',definitionId:'unit:infested_missile_turret/ocular-overwatch-assault-phase@1'},
  {id:'infestation-use',definitionId:'unit:infested_missile_turret/infestation-any-phase@1'},
  {id:'infestation-restoration',definitionId:'unit:infested_missile_turret/infestation-any-phase@1'},
]) {
  const proof=sourceResult.results.find(row=>row.id===spec.id);
  assert.ok(proof?.coldReplay);
  const sourceDirectory=path.join(root,proof.directoryRef);
  assert.ok(sourceDirectory.startsWith(path.join(root,'build/wave4-web')+path.sep));
  const sourceAuthority=await read(path.join(sourceDirectory,'authority.json'));
  const scope=await read(path.join(sourceDirectory,'scope.json'));
  const source=await bindWave4TurretRoom({inputs,state:sourceAuthority.state,...scope,
    directory:path.join(directory,'source-bindings',spec.id)});
  const nativeSource=source.open({readOnly:true,directory:sourceDirectory});
  let prefix,prefixReceipts;
  try {
    await nativeSource.restoreDependencies(proof.roomId,sourceAuthority);
    const bundle=await nativeSource.store.loadReplayBundle(proof.roomId);
    const journal=bundle.privateJournal.filter(row=>row.payload.type==='accepted_transition').map(row=>row.payload.payload.receipt);
    for(let count=1;count<=journal.length;count++) {
      const replay=nativeSource.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:journal.slice(0,count)});
      assert.equal(replay.ok,true);
      if(source.runtime.enumerate(replay.envelope.state).parameterDomains.some(row=>row.definitionId===spec.definitionId)) {
        prefix=replay.envelope;prefixReceipts=count;break;
      }
    }
  } finally {nativeSource.close();}
  assert.ok(prefix,'SIGNED_TURRET_PREFIX_REQUIRED:'+spec.id);
  const roomDirectory=path.join(directory,'rooms',spec.id);
  const bound=await bindWave4TurretRoom({inputs,state:prefix.state,...scope,directory:roomDirectory,humanConfirmed:true,
    scenario:{...scope.scenario,kind:'web_from_signed_native_turret_prefix',sourceRoomId:proof.roomId,
      sourceStateHash:prefix.stateHash,sourceBindingHash:prefix.matchBindingHash,sourcePrefixReceipts:prefixReceipts}});
  const native=bound.open();
  const roomId='product-wave4-web-'+spec.id;
  const credentials=await native.create(roomId,bound.authority);
  const adapter=createStarcraftTmgLevel3HttpAdapter({roomRuntime:native.room,assetRoot:root});
  rooms.set(roomId,{native,adapter});
  const links={};
  for(const side of ['player1','player2']) {
    const issued=await native.room.issueSeatRecovery({roomId,seatToken:credentials[side].seatToken});
    assert.equal(issued.ok,true);links[side]='/room/'+roomId+'#recovery='+encodeURIComponent(issued.recovery.recoveryToken);
  }
  service.rooms.push({...spec,kind:spec.id,roomId,links,sourcePrefixReceipts:prefixReceipts,
    sourceRoomId:proof.roomId,sourceStateHash:prefix.stateHash,sourceBindingHash:prefix.matchBindingHash});
}
const reply=(response,status=200)=>({status,headers:{'content-type':'application/json'},response});
const server=await createRosterWorkspaceServerV1({root,webRoot,
  dataDirectory:directory,lazyWorkspace:true,liveEnabled:false,port:5484,
  productHandler:async request=>{
    const roomId=request.pathname.match(/\/rooms\/([^/]+)/)?.[1];
    const item=rooms.get(roomId);
    if(request.pathname.endsWith('/product/v1/catalogue'))return reply({ok:true,presets:[],setups:[],modes:['human_vs_human'],map:{}});
    if(request.pathname.endsWith('/product/v1/rooms'))return reply({ok:true,rooms:[]});
    if(!item)return request.pathname.startsWith('/starcraft-tmg-level3/')||request.pathname.startsWith('/__')
      ?reply({ok:false,reason:'OFFLINE_TURRET_SCOPE_ONLY'},404):null;
    if(request.pathname.endsWith('/revision')) {
      const current=await item.native.store.loadRoom(roomId);
      return reply({ok:true,roomId,stateRevision:current.stateRevision,stateHash:current.envelope.stateHash});
    }
    if(request.pathname.endsWith('/provider-key'))return request.method==='GET'
      ?reply({ok:true,provider:{configured:false,usedFor:[],liveEnabled:false}}):reply({ok:false,reason:'LIVE_PROVIDER_DISABLED'},409);
    if(request.pathname.startsWith('/starcraft-tmg-level3/api/v1/'))return item.adapter.handle(request);
    return reply({ok:false,reason:'OFFLINE_TURRET_SCOPE_ONLY'},404);
  }});
service.origin=server.origin;
await atomicWrite(path.join(directory,'service.private.json'),JSON.stringify(service,null,2)+'\n');
console.log(JSON.stringify({status:'ready',origin:server.origin,rooms:service.rooms.length,liveEnabled:false}));
const shutdown=()=>{for(const item of rooms.values())item.native.close();server.close?.();process.exit(0);};
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
