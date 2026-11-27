import assert from 'node:assert/strict';
import path from 'node:path';
import {createStarcraftProductRoomHostV1} from './support/starcraft-product-room-host-v1.mjs';
import {root,read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {wave3HumanMapConfiguration} from '../packages/product-composition/wave3-human-match-v1.mjs';

const dir='build/ticket-28-wave3-human-lobby-v1/remaining-six/plan-host-boundary';
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Skirmish');
const map=wave3HumanMapConfiguration(setup);
const host=await createStarcraftProductRoomHostV1({root,dataDirectory:path.join(root,dir),mapConfiguration:map,liveEnabled:false});
try {
  if(process.argv.includes('--second-seat')){
    const proof=await read(dir+'/result.public.json');
    const item=await host.get(proof.roomId), fixture=item.fixture;
    const room=fixture.roomRuntime, roomId=proof.roomId;
    let guest;
    try {guest=await read(dir+'/guest.private.json');}
    catch(error){
      if(error.code!=='ENOENT') throw error;
      const invite=await room.issueInvite({roomId,seatToken:fixture.createdRoom.credentials.human.seatToken});
      assert(invite.ok,invite.reason);
      const joined=await room.joinRoom({roomId,inviteToken:invite.invite.inviteToken});
      assert(joined.ok,joined.reason);
      guest=joined.credential;
      await save(dir+'/guest.private.json',guest);
    }
    const auth={roomId,seatToken:guest.seatToken};
    const {projection}=await room.readRoom(auth), {legalSpace}=await room.legalSpace(auth);
    assert.equal(projection.viewer.seatKey,'player2');
    const result=await fixture.spatialRuntime.query({roomProjection:projection,legalSpace,request:{queryKind:'map.inspect',arguments:{}}});
    assert.equal(result.status,'exact',result.reason);
    assert.equal(result.result.terrain.length,proof.terrain);
    assert.equal(result.result.missionMarkers.length,proof.markers);
    const state=(await item.roomStore.loadRoom(roomId)).envelope;
    assert.equal(result.authority.stateHash,state.stateHash);
    assert.equal(state.matchBinding.rulesRuntimeBinding.runtimeHash,proof.runtime);
    await save(dir+'/second-seat.public.json',{roomId,revision:state.stateRevision,seat:'player2',
      stateHash:state.stateHash,query:result.queryReceiptHash,runtime:proof.runtime,terrain:proof.terrain,markers:proof.markers,modelCalls:0});
  } else {
  const recipes=Object.fromEntries(setup.presets.map(p=>[p.id.endsWith('player1')?'player1':'player2',structuredClone(p.recipe)]));
  recipes.player1.units[0].unitInstanceId='wave3-handoff-unit';
  const req={setupId:setup.id,setupVersion:setup.version,setupSourceHash:setup.sourceHash,
    launchKey:'wave3-m24-product-query-v1',matchMode:'human_vs_human',recipe:recipes.player1,
    referenceArmyRecipes:recipes,mapConfiguration:map};
  await assert.rejects(host.launch({...req,launchKey:req.launchKey+'-other',setupSourceHash:'incorrect'}),/PRODUCT_SETUP_PLAN_BINDING_MISMATCH/);
  const launched=await host.launch(req);
  const item=await host.get(launched.roomId);
  assert.deepEqual(item.record.recipes,recipes);
  assert.deepEqual(item.record.mapConfiguration,map);
  assert.equal(item.record.releaseSetup.sourceHash,setup.sourceHash);
  const id=launched.roomId, fixture=item.fixture;
  const human=await fixture.roomRuntime.readRoom({roomId:id,seatToken:fixture.createdRoom.credentials.human.seatToken});
  assert.equal(human.projection.viewer.seatKey,'player1');
  const legal=await fixture.roomRuntime.legalSpace({roomId:id,seatToken:fixture.createdRoom.credentials.human.seatToken});
  const query=await fixture.player1SceneQuery.query({roomProjection:human.projection,legalSpace:legal.legalSpace,
    request:{queryKind:'map.inspect',arguments:{}}});
  assert.equal(query.status,'exact',query.reason);
  const head=(await item.roomStore.loadRoom(id)).envelope;
  assert.equal(query.authority.stateHash,head.stateHash);
  assert(head.state.pieces.some(p=>p.id==='wave3-handoff-unit'));
  assert(query.result.missionMarkers.length && query.result.terrain.length);
  const again=await host.launch(req);
  assert.equal(again.roomId,id);
  await assert.rejects(host.launch({...req,setupVersion:'invalid'}),/PRODUCT_SETUP_PLAN_BINDING_MISMATCH/);
  await save(dir+'/result.public.json',{roomId:id,revision:head.stateRevision,source:setup.sourceHash,
    release:head.matchBinding.releaseBinding,runtime:head.matchBinding.rulesRuntimeBinding.runtimeHash,
    exactRecipes:true,mapAndDeploymentPreserved:true,terrain:query.result.terrain.length,
    markers:query.result.missionMarkers.length,decisionQueryReceipt:query.queryReceiptHash,
    idempotent:true,incompatibleReleaseRejected:true,modelCalls:0,scope:'Host consumes pinned inputs; no authored Plan or AI game generated'});
  }
} finally {await host.close();}
