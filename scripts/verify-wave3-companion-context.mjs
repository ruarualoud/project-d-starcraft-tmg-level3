import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createStarcraftProductRoomHostV1} from './support/starcraft-product-room-host-v1.mjs';
import {projectCompanionRoomContextV1, projectCompanionRequestedContextV1, selectCompanionRoomContextSectionsV1,
  decodeCompanionTerrainV1, encodeCompanionTerrainV1, decodeCompanionModelsV1} from '../packages/product-composition/companion-room-context-v1.mjs';
import {liveProviderRequestFromCompanion} from '../packages/secure-provider-runtime/companion-worker-adapter-v1.mjs';
import {createStarcraftTmgCompanionRoomSessionServiceV1} from '../packages/product-composition/companion-room-session-service-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'build/playtest-web/context-regression',randomUUID());
await mkdir(directory,{recursive:true});
const requests=[];
// Sanitized army/map input, never the live room's credentials or persistence.
const input=JSON.parse(await readFile(path.join(root,'content/fixtures/wave3-companion-context-v1.json'),'utf8'));
const host=await createStarcraftProductRoomHostV1({root,fixtureRoot:root,dataDirectory:directory,
  liveEnabled:false,offlineWave3MatchVersion:'2.99.12',mapConfiguration:input.mapConfiguration,
  companionProvider:{portId:'companion_provider_port_v1',adapterId:'offline-context-verifier',implementsRealProvider:false,
    network:'none',async complete(request){
      requests.push({request,wire:liveProviderRequestFromCompanion(request,96*1024)});
      return {ok:true,response:{content:'OFFLINE_CONTEXT_FIXTURE',rationale:'',uncertainty:'unknown',
        usage:{promptTokens:0,completionTokens:0,reportedCostUnits:0}},
        receipt:{networkAttempts:0,paidInference:'not_performed',reportedCostUnits:0}};
    }}});
const bytes=value=>Buffer.byteLength(JSON.stringify(value));
try {
  let item,args,room,workbench;
  if(process.argv.includes('--captured')) {
    const captured=JSON.parse(await readFile(path.join(root,'build/playtest-web/companion-context-source.public.json'),'utf8'));
    room={ok:true,projection:captured.projection};workbench={ok:true,snapshot:captured.workbench};
  } else {
    const created=await host.create({...input,matchMode:'human_vs_human',lineupId:'offline-context-repro'});
    item=await host.get(created.roomId);
    args={roomId:created.roomId,seatToken:item.record.credentials.human.seatToken};
    room=await item.fixture.roomRuntime.readRoom(args);
    workbench=await item.fixture.roomRuntime.readBattleWorkbench(args);
  }
  assert.equal(room.ok,true); assert.equal(workbench.ok,true);
  const context=projectCompanionRoomContextV1(room.projection,workbench.snapshot);
  const sizes=Object.fromEntries(Object.entries(context).map(([key,value])=>[key,bytes(value)]));
  const stateSizes=Object.fromEntries(Object.entries(context.state).map(([key,value])=>[key,bytes(value)]));
  const workbenchSizes=Object.fromEntries(Object.entries(context.workbench).map(([key,value])=>[key,bytes(value)]));
  const report={contextBytes:bytes(context),sizes,stateSizes,workbenchSizes,
    terrainCount:room.projection.state.board.terrain.length,providers:0};
  await writeFile(path.join(directory,'context.public.json'),JSON.stringify(context));
  await writeFile(path.join(directory,'report.public.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,evidence:path.relative(root,directory)}));
  const originalTerrain=room.projection.state.board.terrain.map(({terrainHash,...piece})=>piece);
  const lossless=projectCompanionRoomContextV1(room.projection,workbench.snapshot,{includeTerrainCells:true});
  assert.deepEqual(decodeCompanionTerrainV1(lossless.state.board.terrainTable),originalTerrain);
  assert.equal(context.state.board.terrainSummary.exactFootprintsIncluded,false);
  assert.equal(context.state.board.terrainSummary.envelopesAreNotFootprints,true);
  for(const piece of context.state.pieces) {
    const restored={...context.state.pieceCommon,...piece};
    const original=room.projection.state.pieces.find(row=>row.id===restored.id);
    assert.deepEqual(decodeCompanionModelsV1(piece.modelTable),original.models);
    for(const key of ['statuses','isOnField','isDestroyed','activatedPhases','selectedUpgradeNames'])
      assert.deepEqual(restored[key],original[key]);
  }
  assert.deepEqual(context.workbench.units.map(unit=>unit.stats),workbench.snapshot.units.map(unit=>unit.stats));
  assert.deepEqual(context.state.cardResources,room.projection.state.cardResources);
  assert.deepEqual(context.state.scores,room.projection.state.scores);
  assert.deepEqual(context.workbench.scenario,workbench.snapshot.scenario);
  assert.throws(()=>projectCompanionRoomContextV1(room.projection,{...workbench.snapshot,stateRevision:-1}),/CONTEXT_STALE/);
  const withCanary=structuredClone(room.projection);withCanary.state.opponentPrivatePlan={text:'PRIVATE_PLAN_CANARY'};
  assert(!JSON.stringify(projectCompanionRoomContextV1(withCanary,workbench.snapshot)).includes('PRIVATE_PLAN_CANARY'));
  // Non-rectangular / changed original geometry must use the exact fallback.
  const polygon={id:'polygon',terrainId:'other',name:'test',footprint:{shape:'polygon',points:[[0,0],[1,0],[0,1]]},
    originalFootprint:{shape:'polygon',points:[[0,0],[2,0],[0,1]]}};
  assert.deepEqual(decodeCompanionTerrainV1(encodeCompanionTerrainV1([polygon])),[polygon]);
  assert(bytes(context)<=65536,'Companion room context must fit a 64 KiB chat input budget');
  const routeCases=[['你好，凯瑞甘。今天心情怎么样？',[]],['请记住口令「蓝色矿晶」',[]],
    ['看下我的军表',['roster']],['我的坦克射程是多少？',['units']],['我还剩多少人口？',['resources']],
    ['这场任务怎么计分？',['mission']],['地图上的地形与视线怎么看？',['terrain']],['这条规则是否合法？',['rules']]];
  const routedBytes={};
  for(const [question,expected] of routeCases) {
    const sections=selectCompanionRoomContextSectionsV1(question);assert.deepEqual(sections,expected,question);
    const selected=projectCompanionRequestedContextV1(room.projection,sections.length?workbench.snapshot:null,{sections,question});
    routedBytes[question]=bytes(selected);
    if(!sections.length){assert.equal(selected.state,undefined);assert.equal(selected.workbench,undefined);assert(bytes(selected)<1024);}
    if(sections.includes('roster')){assert.equal(selected.state.board,undefined);assert.equal(selected.workbench.roster.length,18);}
    if(sections.includes('units')){assert.equal(selected.workbench.units.length,1);assert.equal(selected.workbench.units[0].unitId,'siege_tank');}
    if(sections.includes('resources')){assert.equal(selected.workbench.units,undefined);assert.equal(selected.state.board,undefined);}
  }
  console.log(JSON.stringify({routedBytes}));
  if(item) {
    await item.setUserKey('player1','synthetic-offline-context-credential-1234567890');
    let workbenchReads=0;
    const service=createStarcraftTmgCompanionRoomSessionServiceV1({companionBackend:item.companion.backend,
      roomRuntime:{...item.fixture.roomRuntime,async readBattleWorkbench(){
        workbenchReads++;return workbench;
      }}});
    const opened=await service.openConversation({...args,packageIds:['starcraft-tmg.companion.sarah_kerrigan']});
    assert.equal(opened.ok,true,opened.reason);
    // Seed real accepted turns to exercise long-history assembly without making
    // 20 provider calls or changing the gameplay state.
    const runtime=item.companion.backend.sessionRuntime;
    for(let i=0;i<20;i++) {
      const next=await runtime.peekNextTurn(opened.conversationId);
      await runtime.submitTurn(opened.conversationId,{participantId:next.ownerParticipantId,
        expectedTurnSequence:next.turnSequence,content:i===0?'OLDER_DIALOGUE_SENTINEL':`offline saved turn ${i}`,mentions:[]});
    }
    const reply=await service.sendMessage({...args,conversationId:opened.conversationId,content:'LATEST_MESSAGE_SENTINEL 请确认这是离线接线验证。'});
    assert.equal(reply.ok,true,JSON.stringify({reason:reply.reason,provider:reply.provider}));
    assert.equal(requests.length,1);assert.equal(reply.messages.length,22,'complete saved history must remain intact');
    const wire=JSON.stringify(requests[0].wire);
    assert(wire.includes('LATEST_MESSAGE_SENTINEL'));assert(!wire.includes('OLDER_DIALOGUE_SENTINEL'));
    assert(wire.includes('earlier dialogue turns are omitted'));
    const packet=JSON.parse(requests[0].request.messages.find(message=>message.role==='system'&&message.content.includes('"roomContext"')).content);
    assert.equal(packet.roomContext.projectionContract.battlefieldIncluded,false);
    assert.equal(packet.roomContext.state,undefined);assert.equal(packet.roomContext.workbench,undefined);
    assert.equal(workbenchReads,0,'ordinary conversation must skip the workbench entirely');
    const unitReply=await service.sendMessage({...args,conversationId:opened.conversationId,content:'我的坦克射程是多少？'});
    assert.equal(unitReply.ok,true,unitReply.reason);assert.equal(workbenchReads,1);
    const parsePacket=index=>JSON.parse(requests[index].request.messages.find(message=>message.role==='system'&&message.content.includes('"roomContext"')).content).roomContext;
    assert.equal(parsePacket(1).workbench.units.length,1);
    assert.equal(parsePacket(1).workbench.units[0].unitId,'siege_tank');
    const casualAgain=await service.sendMessage({...args,conversationId:opened.conversationId,content:'你今天心情怎么样？'});
    assert.equal(casualAgain.ok,true,casualAgain.reason);assert.equal(workbenchReads,1,'old battle questions must not make context sticky');
    assert.equal(parsePacket(2).state,undefined);assert.equal(requests.length,3);
    assert(bytes(requests[0].wire)<=96*1024);
    const after=await item.fixture.roomRuntime.readRoom(args);
    assert.equal(after.projection.room.stateRevision,room.projection.room.stateRevision);
    assert.equal(after.projection.room.stateHash,room.projection.room.stateHash);
    const cardManifest=JSON.parse(await readFile(path.join(root,'content/characters/standard-cards/manifest.json'),'utf8'));
    const kerriganCards=await Promise.all(cardManifest.cards.filter(row=>row.companionPackageId==='starcraft-tmg.companion.sarah_kerrigan').map(async row=>({
      companionPackageId:row.companionPackageId,eraId:row.eraId,
      card:JSON.parse(await readFile(path.join(root,'content/characters/standard-cards',row.file),'utf8')),
    })));
    let standardWorkbenchReads=0;
    const standardService=createStarcraftTmgCompanionRoomSessionServiceV1({companionBackend:item.companion.backend,
      standardRoleplayCards:kerriganCards,roomRuntime:{...item.fixture.roomRuntime,async readBattleWorkbench(){standardWorkbenchReads++;return workbench;}}});
    const standardOpened=await standardService.openConversation({...args,packageIds:['starcraft-tmg.companion.sarah_kerrigan']});
    assert.equal(standardOpened.ok,true,JSON.stringify(standardOpened));
    const standardStart=requests.length;
    for(const question of ['你好，凯瑞甘','我的坦克射程是多少？','你今天心情怎么样？']){
      const reply=await standardService.sendMessage({...args,conversationId:standardOpened.conversationId,content:question});
      assert.equal(reply.ok,true,JSON.stringify(reply));
    }
    const standardRequests=requests.slice(standardStart);
    const roomPacket=request=>request.messages.find(message=>message.role==='system'&&message.content.startsWith('{"roomContext"'));
    assert.equal(roomPacket(standardRequests[0].request),undefined);
    const standardUnits=JSON.parse(roomPacket(standardRequests[1].request).content).roomContext;
    assert.equal(standardUnits.workbench.units.length,1);assert.equal(standardUnits.workbench.units[0].unitId,'siege_tank');
    assert.equal(roomPacket(standardRequests[2].request),undefined);assert.equal(standardWorkbenchReads,1);
    assert(standardRequests.every(row=>row.request.metadata.responseMode==='standard_roleplay'));
    const finalRoom=await item.fixture.roomRuntime.readRoom(args);
    assert.equal(finalRoom.projection.room.stateRevision,room.projection.room.stateRevision);
    assert.equal(finalRoom.projection.room.stateHash,room.projection.room.stateHash);
    console.log(JSON.stringify({passed:true,wireBytesByRoute:requests.map(row=>bytes(row.wire)),savedMessages:casualAgain.messages.length,
      workbenchReads,casualChatWorkbenchReads:0,standardWorkbenchReads,standardRoleplayRequests:standardRequests.length,
      realProviderCalls:0,gameplayUnchanged:true}));
  } else console.log(JSON.stringify({passed:true,realProviderCalls:0,capturedProjectionChecks:true}));
} finally {await host.close();}
