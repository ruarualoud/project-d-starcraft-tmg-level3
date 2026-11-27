import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadWave4TurretInputs, bindWave4TurretRoom } from './support/wave4-turret-room-v1.mjs';
import { createStarcraftTmgLevel3HttpAdapter } from '../packages/http-adapter/handler-v1.mjs';
import { createRosterWorkspaceServerV1 } from './serve-ticket-27-slice-271-roster-workspace-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { loadWave4VirusEffectsInputs } from './compile-wave4-virus-effects.mjs';
import { loadWave4StukovUnitInputs } from './compile-wave4-stukov-units.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const sourceResult=await read(path.resolve(process.argv[2]));
assert.ok(sourceResult.status==='passed_scoped'||sourceResult.schema==='starcraft_tmg_wave4_detonation_ranged_host_v1'&&sourceResult.status==='passed_scoped_ranged_host_only'
 ||sourceResult.schema==='starcraft_tmg_wave4_detonation_nested_host_v1'&&sourceResult.status==='passed_scoped_melee_hits_nested');
const directory=path.resolve(process.argv[3]);
assert.ok(directory.startsWith(path.join(root,'build/wave4-web')+path.sep));
const webRoot=process.argv[4]?path.resolve(process.argv[4]):path.join(root,'apps/starcraft-tmg-expo/dist-product');
if(process.argv[4])assert.ok(webRoot.startsWith(path.join(root,'build/wave4-web')+path.sep));
const inputs=['starcraft_tmg_wave4_stukov_infestation_native_v1','starcraft_tmg_wave4_plagued_munitions_v1',
   'starcraft_tmg_wave4_infested_infantry_base_wiring_v1','starcraft_tmg_wave4_detonation_ranged_host_v1','starcraft_tmg_wave4_detonation_nested_host_v1'].includes(sourceResult.schema)?await loadWave4StukovUnitInputs(root)
  :sourceResult.schema==='starcraft_tmg_wave4_virus_creep_native_v1'?await loadWave4VirusEffectsInputs(root):await loadWave4TurretInputs(root);
const rooms=new Map();
const service={liveEnabled:false,scope:'Wave4 source-bound Native successors; scoped local Web acceptance',rooms:[]};
const specs=process.argv[5]?await read(path.resolve(process.argv[5])):[
  {id:'infected-ordinary-move',initial:true},
  {id:'clean-blink',initial:true},
  {id:'clean-recall',initial:true},
  {id:'growing-restoration-exception',definitionId:'unit:infested_missile_turret/infestation-any-phase@1'},
];
assert.ok(Array.isArray(specs)&&specs.length&&specs.every(spec=>typeof spec.id==='string'&&(spec.initial||typeof spec.definitionId==='string')));
for(const spec of specs) {  const proof=sourceResult.results.find(row=>row.id===spec.id||row.definitionId==='card:'+spec.id+'/stukov-s-creep-any@1');
  assert.ok(proof?.coldReplay);
  const sourceDirectory=path.join(root,proof.directoryRef||proof.runRef);
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
    const hintedPrefix=spec.minimumContinuationDepth?proof.trace?.find(row=>row.stackDepth>=spec.minimumContinuationDepth)?.revision-1:0;
    for(let count=Number.isSafeInteger(hintedPrefix)?hintedPrefix:0;count<=journal.length;count++) {
      const replay=nativeSource.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:journal.slice(0,count)});
      assert.equal(replay.ok,true);
      if((!spec.minimumContinuationDepth||(replay.envelope.state.officialBeforeCasualtyContinuations?.length||0)>=spec.minimumContinuationDepth)
       &&(spec.initial || (spec.requiredPendingKey?Boolean(replay.envelope.state[spec.requiredPendingKey]):
        source.runtime.enumerate(replay.envelope.state).parameterDomains.some(row=>row.definitionId===spec.definitionId)))) {
        prefix=replay.envelope;prefixReceipts=count;break;
      }
    }
  } finally {nativeSource.close();}
  assert.ok(prefix,'SIGNED_VIRUS_PREFIX_REQUIRED:'+spec.id);
  const roomDirectory=path.join(directory,'rooms',spec.id);
  const bound=await bindWave4TurretRoom({inputs,state:prefix.state,...scope,directory:roomDirectory,humanConfirmed:true,
    scenario:{...scope.scenario,kind:'web_from_signed_native_virus_prefix',sourceRoomId:proof.roomId,
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
    ...(proof.originalResolutionHash?{expectedOriginalResolutionHash:proof.originalResolutionHash}:{}),
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
      ?reply({ok:false,reason:'OFFLINE_VIRUS_SCOPE_ONLY'},404):null;
    if(request.pathname.endsWith('/revision')) {
      const current=await item.native.store.loadRoom(roomId);
      return reply({ok:true,roomId,stateRevision:current.stateRevision,stateHash:current.envelope.stateHash});
    }
    if(request.pathname.endsWith('/provider-key'))return request.method==='GET'
      ?reply({ok:true,provider:{configured:false,usedFor:[],liveEnabled:false}}):reply({ok:false,reason:'LIVE_PROVIDER_DISABLED'},409);
    if(request.pathname.startsWith('/starcraft-tmg-level3/api/v1/'))return item.adapter.handle(request);
    return reply({ok:false,reason:'OFFLINE_VIRUS_SCOPE_ONLY'},404);
  }});
service.origin=server.origin;
await atomicWrite(path.join(directory,'service.private.json'),JSON.stringify(service,null,2)+'\n');
console.log(JSON.stringify({status:'ready',origin:server.origin,rooms:service.rooms.length,liveEnabled:false}));
const shutdown=()=>{for(const item of rooms.values())item.native.close();server.close?.();process.exit(0);};
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
