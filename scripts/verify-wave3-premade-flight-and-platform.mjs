import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { base, manifestRef, signedBranch } from './support/wave3-faq-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createOfficialPremadeMapConfiguratorV1 } from '../packages/product-composition/official-premade-map-configurator-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialModelBaseFootprintV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { deriveOfficialFinalPlacementSurfaceSupportV13 } from '../packages/rule-atoms/official-semantic-surface-support-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';

const dir = 'build/ticket-28-wave3-premade-flight-and-platform';
const id = 'wave3-flight-and-platform', version = '2.99.5', seedId = 'standard-d6-5';
const recipe = await read(base + '/inherited-zerg-standard-2.53.0/malignant.json');
const unit = (name, upgrades = []) => ({ unitInstanceId: name, recordKey: 'army_units:' + name,
  compositionKind: 'small', upgradeNames: upgrades });
const recipes = { player1: { factionRecordKey:'tactical_cards:raynor_s_raiders', units:[
  unit('raven',['Internal Tech Module']), unit('raynor_s_raider__marine_')], tacticalCardRecordKeys:[] },
  player2: { ...recipe.recipes.player2, units:recipe.recipes.player2.units.map(u => u.unitInstanceId==='queen' ? unit('hydralisk') : u) } };
const { recommendedTerrainSetup } = createOfficialPremadeMapConfiguratorV1().preview({ seedId });
assert.equal(recommendedTerrainSetup.pendingSurfaceInstanceIds.length, 0);
const releaseContext = await resolveWave3StandardContext(await read(manifestRef),'area_ability_inputs');
const {state, pendingNativeDefinitionIds} = prepareOfficialStandardReleaseOpeningV2({
  releaseContext,dataset:releaseContext.dataset,snapshot:releaseContext.snapshot,recipes,roomId:id,releaseMatchVersion:version,
  missionRecordKey:recipe.mission,deploymentRecordKey:recipe.deployment,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  mapConfiguration:{seedId,terrainSetup:{valuesByInstance:recommendedTerrainSetup.valuesByInstance}} });
assert.deepEqual(pendingNativeDefinitionIds, []);
assert.equal(state.officialCompetitiveMapRoomFreeze.seedId, seedId);
const get = (s,name) => s.pieces.find(p => p.id===name);
const raven=get(state,'raven'), hydra=get(state,'hydralisk');
const point=(x,y,rotation=0)=>({xMilliInches:x,yMilliInches:y,rotationDegrees:rotation,elevation:'ground',supportTerrainIds:[]});
function upper(model,x,y) {
  const p=point(x,y,90);
  const footprint=createOfficialModelBaseFootprintV1({piece:hydra,model,position:p,dataBundle:state.officialModelBaseGeometryDataBundle});
  const support=deriveOfficialFinalPlacementSurfaceSupportV13(state,footprint);
  assert.equal(support.elevation,'high');
  assert(!support.highGroundOverhang);
  assert(support.supportTerrainIds.length && support.supportTerrainIds.every(id=>id.startsWith('ramp-west')));
  return {...p,elevation:support.elevation,supportTerrainIds:support.supportTerrainIds};
}
const start=new Map([[raven,[point(10300,12000)]],[hydra,hydra.models.map((m,i)=>upper(m,24400,16800+2050*i))]]);
const landing=point(16400,10200);
const cells=state.board.terrain.filter(t=>t.terrainGroupId==='geyser-southwest').flatMap(t=>(t.footprintCells??[t.footprint]));
const blockingCell=cells.find(c=>c.minYMilliInches<=12000 && 12000<c.maxYMilliInches);
assert(blockingCell);
const blocked=point(Math.round((blockingCell.minXMilliInches+blockingCell.maxXMilliInches)/2),12000);
assert(blocked.xMilliInches>10300 && blocked.xMilliInches<landing.xMilliInches);
const scene={seedId,conditionalOpening:true,sourceMapHash:state.officialCompetitiveMapRoomFreeze.roomFreezeHash,
  ravenStart:start.get(raven)[0],blocked,landing:point(17700,12000),hydraliskStart:start.get(hydra),providerCalls:0};
assert.equal(raven.models[0].baseShape,'measured_contour');
assert.equal(hydra.models.length,2);
for(const [piece,positions] of start){
  Object.assign(piece,{isInReserves:false,isOnField:true,deploymentStatus:'deployed',leadingModelId:piece.models[0].id,
    xInches:positions[0].xMilliInches/1000,yInches:positions[0].yMilliInches/1000});
  state.reserveManifestBySide[piece.sideKey].find(row=>row.pieceId===piece.id).deploymentStatus='deployed';
  piece.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:positions[i].xMilliInches/1000,yInches:positions[i].yMilliInches/1000,
    baseRotationDegrees:positions[i].rotationDegrees,elevation:positions[i].elevation,supportTerrainIds:positions[i].supportTerrainIds}));
}
declareWave3EngineeringCoherencyV1(state,{planIdPrefix:id});
const redact=result=>({status:result.status,receipt:result.queryReceiptHash,actionHash:result.result?.actionHash,reason:result.reason,
  detail:result.result?.reason??result.details?.reason});
// The signed room was opened with an over-budget proposed endpoint in its scenario note.
// Keep that descriptor for recovery. Measure the corrected destination against an actual geyser cell.
const t=(14000-10300)/(landing.xMilliInches-10300);
const crossing={xMilliInches:14000,yMilliInches:Math.round(12000+t*(landing.yMilliInches-12000))};
assert(cells.some(c=>crossing.xMilliInches>c.minXMilliInches && crossing.xMilliInches<c.maxXMilliInches &&
  crossing.yMilliInches>c.minYMilliInches && crossing.yMilliInches<c.maxYMilliInches));
const hydraEnd=hydra.models.map((m,i)=>upper(m,24600,16800+2050*i));
await signedBranch({dir,id,version,manifest:manifestRef,initial:state,state,scene,perform:async({app,bound,seats,head,menu,commit})=>{
  for(;;){
    const h=await head(),revision=h.stateRevision;
    if(revision===6)break;
    const side=h.state.activeSideKey,seat={roomId:id,seatToken:seats[side].seatToken},space=await menu();
    if(revision<2){
      await commit(space.finiteActions.find(r=>r.action.actionType===(revision?'choose_first_actor':'resolve_mission_start_of_round')
        && (!revision || r.action.chosenFirstActorSideKey==='player1')));continue;
    }
    const piece=revision<4?raven:hydra;
    if(revision===3 || revision===5){
      await commit(space.parameterDomains.find(d=>d.actionType==='finish_activation'&&d.pieceId===piece.id));continue;
    }
    assert([2,4].includes(revision));
    const domain=space.parameterDomains.find(d=>d.actionType==='move'&&d.pieceId===piece.id);
    assert(domain,piece.id + ' movement');
    const positions=piece===raven?[landing]:hydraEnd;
    const params={leadingModelId:piece.models[0].id,path:[positions[0]],placements:positions.slice(1).map((p,i)=>({...p,modelId:piece.models[i+1].id}))};
    const adapter=createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore:app.store,rulesRuntime:bound.rulesRuntime,seatKey:side});
    const queries=createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery:q=>adapter.query(q)});
    const {projection}=await app.room.readRoom(seat);
    const query=parameters=>queries.query({roomProjection:projection,legalSpace:space,request:{queryKind:'legal_full_path_movement',arguments:{domainId:domain.domainId,parameters}}});
    const preview=parameters=>app.room.previewAction({...seat,expectedStateRevision:revision,expectedStateHash:h.stateHash,expectedMatchBindingHash:h.matchBindingHash,
      expectedLegalSpaceHash:space.legalSpaceHash,proposal:{kind:'parameterized',domainId:domain.domainId,parameters}});
    const positive=await query(params);
    const admit=await preview(params);
    if(revision===2 && !admit.ok && (positive.reason==='LOGICAL_SURFACE_BASE_UNSUPPORTED' || JSON.stringify(admit).includes('LOGICAL_SURFACE_BASE_UNSUPPORTED'))){
      assert.equal(revision,2);
      assert.equal(admit.ok,false);
      const detail=JSON.stringify(admit);
      assert.match(detail+' '+positive.reason,/LOGICAL_SURFACE_BASE_UNSUPPORTED/);
      await save(dir+'/red.public.json',{revision,stateHash:h.stateHash,seedId,case:'clear flight across geyser',query:redact(positive),admission:admit.reason??admit.code,
        detail:admit.message??admit.error?.message,landing,crossing,maxDistanceMilliInches:domain.constraints.maxDistanceMilliInches,expected:'clear end after crossing physical geyser cell',providerCalls:0});
    }
    assert.equal(positive.status,'exact',JSON.stringify(redact(positive)));
    assert(admit.ok,JSON.stringify(admit).slice(0,500));
    const invalid=structuredClone(params);
    if(piece===raven)invalid.path=[blocked];
    else invalid.path=[{...positions[0],xMilliInches:23000},positions[0]];
    const denied=await preview(invalid),readOnly=await query(invalid);
    assert.equal(denied.ok,false);assert(!readOnly.result?.actionHash);
    const denial=denied.message??denied.reason;
    assert.match(denial,piece===raven?/MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP:raven-model-1\/geyser-southwest|TERRAIN_ENDPOINT_UNSUPPORTED:geyser-southwest/:/TERRAIN_PATH_BLOCKED:ramp-west/);
    assert.equal(readOnly.reason,denial.split(':')[0]);
    let paths;
    if(piece===hydra){
      const control={...params,path:[{...positions[0],xMilliInches:24300},positions[0]]};
      const actual=await preview(control);
      assert(actual.ok,actual.message);
      const lengths=[admit,actual].map(r=>{
        const moved=r.preview.core.result.events.find(e=>e.type==='unit_move_resolved' && e.pieceId===piece.id);
        assert(moved,'Move preview must publish its measured distance');
        return Math.round(moved.distanceTravelledInches*1000);
      });
      assert.deepEqual(lengths,[200,400]);
      paths={direct:lengths[0],legalReversal:lengths[1],blockedReversal:3000};
    }
    await save(dir+'/'+piece.id+'.public.json',{revision,side,legal:redact(positive),invalid:redact(readOnly),rejection:denied.message??denied.reason??denied.code,
      admittedStateHash:admit.preview.core.result.postStateHash,invalidPath:invalid.path,positions,paths});
    await commit(domain,params);
    assert.equal((await head()).stateHash,admit.preview.core.result.postStateHash);
  }
},verify:async h=>{
  assert.equal(h.stateRevision,6);
  const outcomes=[['raven',[landing]],['hydralisk',hydraEnd]].map(([name,expected])=>{
    const piece=get(h.state,name);
    const actual=piece.models.map(m=>({xMilliInches:Math.round(m.xInches*1000),yMilliInches:Math.round(m.yInches*1000),
      rotationDegrees:m.baseRotationDegrees,elevation:m.elevation,supportTerrainIds:m.supportTerrainIds}));
    assert.deepEqual(actual,expected); assert(piece.activatedPhases.movement); return {name,actual};
  });
  return {seedId,outcomes,flightCrossed:{terrainGroup:'geyser-southwest',point:crossing},handoff:h.state.activeSideKey};
}});
