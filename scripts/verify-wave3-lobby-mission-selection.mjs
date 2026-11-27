import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createStarcraftProductRoomHostV1, PRODUCT_PREFIX } from './support/starcraft-product-room-host-v1.mjs';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { projectCompanionRoomContextV1 } from '../packages/product-composition/companion-room-context-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = process.cwd();
const dir = path.join(root,'build/ticket-28-wave3-lobby-mission-selection');
await fs.mkdir(dir,{recursive:true});
const save = (file,value) => atomicWrite(path.join(dir,file),JSON.stringify(value,null,2)+'\n');
async function readIfSaved(file) {
  try { return JSON.parse(await fs.readFile(path.join(dir,file),'utf8')); }
  catch(error) { if(error.code !== 'ENOENT') throw error; return null; }
}
const open = () => createStarcraftProductRoomHostV1({root,dataDirectory:dir,liveEnabled:false,
  mapConfiguration:{seedId:'standard-d6-1'}});
const host = await open();
try {
  const cat = (await host.handle({pathname:PRODUCT_PREFIX+'/catalogue',method:'GET'})).response;
  const old = JSON.parse(await fs.readFile('content/wave3-human-match-setups-v1.json','utf8'));
  for (const row of old) assert.deepEqual(host.planningInputsForSetup(row.id).wave3MatchSetup,row);
  assert.equal(cat.setups.length,7);
  assert.equal(new Set(cat.setups.map(x=>x.id)).size,7);
  const results=[];
  for (const setup of cat.setups.filter(x=>!old.some(row=>row.id===x.id))) {
    const file=setup.id+'.public.json';
    const final=await readIfSaved(file);
    if(final?.coldVerified){results.push(final);continue;}
    const configured=host.planningInputsForSetup(setup.id);
    const selected=configured.wave3MatchSetup;
    const checkKeys=pair=>{
      assert.equal(pair.missionRecordKey,selected.missionRecordKey);
      assert.equal(pair.deploymentRecordKey,selected.deploymentRecordKey);
    };
    const saved=await readIfSaved(setup.id+'.room.json');
    const roomId=saved?.roomId ?? (await (async()=>{
      const result=await host.handle({pathname:PRODUCT_PREFIX+'/rooms',method:'POST',body:{
        setupId:setup.id,matchMode:'human_vs_human',ownPreset:setup.presets[0].id,opponentPreset:setup.presets[1].id}});
      assert.equal(result.status,201,result.response.reason);
      checkKeys(result.response.match);
      await save(setup.id+'.room.json',{roomId:result.response.match.roomId});
      return result.response.match.roomId;
    })());
    const item=await host.get(roomId);
    const envelope=(await item.roomStore.loadRoom(roomId)).envelope;
    const state=envelope.state;
    checkKeys({missionRecordKey:state.mission.recordKey,deploymentRecordKey:state.officialDeploymentGeometryBinding.deploymentRecordKey});
    const deps=state.officialDeploymentGeometryBinding;
    const board=await createRosterPlanningProductModuleV1({root,roomId,...configured,operation:'board_queries'});
    const map=board.mapEvidencePort.summarizeMap({queryId:'lobby-map'});
    const geometry=board.mapEvidencePort.deploymentGeometry({queryId:'lobby-deployment'});
    assert.equal(map.resultStatus,'certified_map_summary',map.unknownReason);
    assert.equal(geometry.resultStatus,'certified_deployment_geometry',geometry.unknownReason);
    checkKeys(map.mapBinding);
    assert.deepEqual(geometry.deploymentGeometry,deps);
    assert.equal(map.mapBinding.roomFreezeHash,state.officialCompetitiveMapRoomFreeze.roomFreezeHash);
    const seat={roomId,seatToken:item.record.credentials.human.seatToken};
    const room=item.fixture.roomRuntime;
    const [view,bench]=await Promise.all([room.readRoom(seat),room.readBattleWorkbench(seat)]);
    const context=projectCompanionRoomContextV1(view.projection,bench.snapshot);
    assert.equal(context.state.mission.id,state.mission.id);
    checkKeys({missionRecordKey:context.state.officialMissionRuntimeState.missionRecordKey,
      deploymentRecordKey:context.state.board.deploymentId});
    const cold=await open();
    try {
      const reloaded=await cold.get(roomId);
      const after=(await reloaded.roomStore.loadRoom(roomId)).envelope;
      assert.equal(after.stateHash,envelope.stateHash);
      assert.deepEqual(after.matchBinding,envelope.matchBinding);
      const row={setupId:setup.id,roomId,scale:setup.scale,missionRecordKey:state.mission.recordKey,
        deploymentRecordKey:deps.deploymentRecordKey,roomFreezeHash:map.mapBinding.roomFreezeHash,
        markerCount:map.missionMarkers.length,terrainCount:state.board.terrain.length,release:board.releaseBinding.manifestHash,
        stateHash:after.stateHash,mapReceipt:map.receiptHash,deploymentReceipt:geometry.receiptHash,coldVerified:true};
      await save(file,row);results.push(row);console.log(setup.id);
    } finally {await cold.close();}
  }
  await save('result.public.json',{oldSetupsPreserved:old.map(x=>x.id),results,externalModelCalls:0});
} finally {await host.close();}
