import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, createOfficialStandard2000BalancedTerrainPlanV1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Standard');
const reference=await read('build/ticket-28-wave3-human-lobby-v1/mission-actions/standard-artefact_hunt-withdrawal/setup.public.json');
const context=await resolveWave3StandardContext(await read(setup.releaseRef),'area_ability_inputs');
const dir='build/ticket-28-wave3-human-lobby-v1/high-ground-286', roomId='wave3-formal-high-ground-286';
const version='2.86.0', terrainPlan=createOfficialStandard2000BalancedTerrainPlanV1();
const platform=terrainPlan.terrainPieces.find(t=>t.terrainPieceId==='std-centre-large');
platform.footprint={xMin:24.7,xMax:29.95,yMin:15,yMax:21};
platform.originalFootprint=structuredClone(platform.footprint);
const conditions={editedPlatform:platform.footprint,feature:'movement along upper surface with one overhanging base',providerCalls:0};
let stage='factory';
try {
  const options={releaseContext:context,dataset:context.dataset,snapshot:context.snapshot,roomId,terrainPlan,
    recipes:reference.recipes,missionRecordKey:setup.missionRecordKey,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY};
  const make=releaseMatchVersion=>prepareOfficialStandardReleaseOpeningV2({...options,releaseMatchVersion});
  const newOpening=make(version);
  assert.deepEqual(newOpening.pendingNativeDefinitionIds,[]);
  const state=structuredClone(newOpening.state);
  assert.equal(state.officialHighGroundFinalPlacementPolicy.sourceFaqByteHash,context.manifest.source.references.faq.byteHash);
  const piece=state.pieces.find(p=>p.id==='player1-marine-1'),side=piece.sideKey;
  const offsets=[[0,0],[1650,0],[1167,1167],[0,1650],[-1167,1167],[-1650,0]];
  assert.equal(piece.models.length,offsets.length);
  const supportTerrainIds=[platform.terrainPieceId];
  Object.assign(piece,{isInReserves:false,isOnField:true,deploymentStatus:'deployed',leadingModelId:piece.models[0].id,xInches:27.3,yInches:18});
  for(const [index,m] of piece.models.entries())Object.assign(m,{isOnField:true,xInches:(27300+offsets[index][0])/1000,
    yInches:(18000+offsets[index][1])/1000,elevation:'high',supportTerrainIds});
  state.reserveManifestBySide[side].find(e=>e.pieceId===piece.id).deploymentStatus='deployed';
  const binding=await bindWave3StandardActionRoom({manifestRef:setup.releaseRef,initial:state,dir,candidateVersion:version,scenario:conditions});
  const native=binding.open();
  try {
    const seats=await native.create(roomId,binding.authority);
    const credential=seats[side], publicSeat={roomId,seatToken:credential.seatToken};
    async function finite(type, extra=()=>true) {
      await native.commit({roomId,credential,operationKey:type,kind:'finite',select:f=>f.action.actionType===type && extra(f.action)});
    }
    let head=await native.store.loadRoom(roomId);
    if(head.stateRevision===0)await finite('resolve_mission_start_of_round');
    head=await native.store.loadRoom(roomId);
    if(head.stateRevision===1)await finite('choose_first_actor',a=>a.chosenFirstActorSideKey===side);
    head=await native.store.loadRoom(roomId);
    if(head.stateRevision===2){
      stage='upper-surface move';
      const {legalSpace,ok}=await native.room.legalSpace(publicSeat);assert(ok);
      const {projection}=await native.room.readRoom(publicSeat);
      const move=legalSpace.parameterDomains.find(d=>d.actionType==='move'&&d.pieceId===piece.id);assert(move);
      const point=([dx,dy])=>({xMilliInches:28300+dx,yMilliInches:18000+dy,elevation:'high',supportTerrainIds,rotationDegrees:0});
      const parameters={leadingModelId:piece.models[0].id,path:[point(offsets[0])],
        placements:piece.models.slice(1).map((m,i)=>({modelId:m.id,...point(offsets[i+1])}))};
      const adapter=createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore:native.store,rulesRuntime:binding.rulesRuntime,seatKey:side});
      const tools=createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery:q=>adapter.query(q)});
      const query=params=>tools.query({roomProjection:projection,legalSpace,request:{queryKind:'legal_full_path_movement',arguments:{domainId:move.domainId,parameters:params}}});
      const positive=await query(parameters);assert.equal(positive.status,'exact',JSON.stringify(positive).slice(0,650));
      const outside=structuredClone(parameters);outside.placements[0].xMilliInches+=100;
      const negative=await query(outside);assert(!negative.result?.actionHash,'overhanging centre must be refused');
      const preview=await native.room.previewAction({...publicSeat,expectedStateRevision:2,expectedStateHash:head.envelope.stateHash,
        expectedMatchBindingHash:head.envelope.matchBindingHash,expectedLegalSpaceHash:legalSpace.legalSpaceHash,
        proposal:{kind:'parameterized',domainId:move.domainId,parameters:outside}});assert.equal(preview.ok,false);
      await save(dir+'/query.public.json',{model:piece.id,centres:parameters.placements,receipt:positive.queryReceiptHash,
        validActionHash:positive.result.actionHash,refused:preview.reason??preview.error?.code??preview.code,invalidOffset:100});
      await native.commit({roomId,credential,operationKey:'move-on-platform',select:d=>d.domainId===move.domainId,parameters:()=>parameters});
    }
    head=await native.store.loadRoom(roomId);
    if(head.stateRevision===3){
      stage='recovering activation';
      const {legalSpace}=await native.room.legalSpace(publicSeat);
      const done=legalSpace.parameterDomains.find(d=>d.actionType==='finish_activation'&&d.pieceId===piece.id);assert(done);
      await native.commit({roomId,credential,operationKey:'finish',select:d=>d.domainId===done.domainId,parameters:()=>({})});
    }
    head=(await native.store.loadRoom(roomId)).envelope;
    const models=head.state.pieces.find(p=>p.id===piece.id).models;
    assert.deepEqual(models.map(m=>[m.xInches,m.yInches,m.elevation]),
      offsets.map(([dx,dy])=>[(28300+dx)/1000,(18000+dy)/1000,'high']));
    const receipts=await assertWave3StandardRoomColdReplayV1(binding,binding.authority,roomId,head);
    await save(dir+'/result.public.json',{version,revision:head.stateRevision,models:models.length,stateHash:head.stateHash,receipts,cold:true,conditions});
  }finally{native.close();}
}catch(error){await save(dir+'/stop-'+Date.now()+'.public.json',{stage,reason:error.message,stack:error.stack.split('\n').slice(1,5)});throw error;}
