import assert from 'node:assert/strict';
import {base,output,savedRoom} from './support/wave3-faq-room-v1.mjs';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {
 enumerateOfficialSelectedRosterSpatialActionsV1 as enumerate,resolveOfficialSelectedRosterDeployStartV1 as start,
 instantiateOfficialSelectedRosterSpatialActionV1 as instantiate,applyOfficialSelectedRosterSpatialActionV1 as apply,
 checkOfficialSelectedRosterDeployLeaderPathV1 as query,
} from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
const platformRoom=await savedRoom('build/ticket-28-wave3-human-lobby-v1/high-ground-286','wave3-formal-high-ground-286');
const platform=platformRoom.head.state.board.terrain.find(t=>t.id==='std-centre-large');
assert(platform.standableHorizontalSurface && platform.elevationSurface);
const omega=(await savedRoom(output+'/faq64-burrow-omega','faq64-burrow-omega')).initial;
const pylon=await read(base+'/wave3-pylon-native-entry-component-start.json');
const results=[];
for(const [state,sourceId,actor] of [[structuredClone(omega.state),'player2-omega-worm','player2-queen'],
  [structuredClone(pylon),'pylon-engineering-checkpoint','player1-stalker']]){
  state.officialWave3FaqClarificationsHash=omega.state.officialWave3FaqClarificationsHash;
  const source=state.pieces.find(p=>p.id===sourceId),unit=state.pieces.find(p=>p.id===actor);
  const terrain=state.board.terrain.findIndex(t=>t.id===platform.id);
  state.board.terrain[terrain]=structuredClone(platform);
  const left=platform.footprint.minXMilliInches,cy=(platform.footprint.minYMilliInches+platform.footprint.maxYMilliInches)/2;
  const sourceModel=source.models[0],point={xInches:(left-Math.round(sourceModel.baseWidthInches*500))/1000,yInches:cy/1000};
  Object.assign(source,point);Object.assign(sourceModel,point);
  const d=enumerate(state,{sideKey:unit.sideKey}).parameterDomains.find(d=>d.pieceId===actor&&d.actionType==='deploy');
  assert(d,actor);
  const segment=d.constraints.entrySegments.find(s=>s.sourcePieceId===sourceId);
  assert(segment,actor);assert.equal(segment.center.xMilliInches+segment.radiusMilliInches,left);
  const profile=d.constraints.modelProfiles[0];assert.equal(unit.models.length,1);
  const params=(high)=>{
    const along=high?0:Math.round(Math.PI*segment.radiusMilliInches),entry=start(d,segment,along,profile);
    const x=entry.xMilliInches+(high?200:-1200);
    if(high)assert(x-profile.baseWidthMilliInches/2>=left && x+profile.baseWidthMilliInches/2<=platform.footprint.maxXMilliInches &&
      cy-profile.baseDepthMilliInches/2>=platform.footprint.minYMilliInches && cy+profile.baseDepthMilliInches/2<=platform.footprint.maxYMilliInches);
    return {leadingModelId:unit.models[0].id,entrySegmentId:segment.segmentId,entryAlongEdgeMilliInches:along,
      path:[{xMilliInches:x,yMilliInches:entry.yMilliInches,elevation:high?'high':'ground',supportTerrainIds:high?[platform.id]:[],rotationDegrees:0}],placements:[]};
  };
  const ground=params(false),high=params(true);
  assert(query(state,d,ground));
  const good=instantiate(state,d,ground),after=apply(state,good.action);
  assert(after.state.pieces.find(p=>p.id===actor).isOnField);
  for(const evaluate of [query,instantiate])assert.throws(()=>evaluate(state,d,high),/UNIT_ENTRY_SOURCE_ELEVATION_REQUIRED/);
  results.push({source:segment.sourcePieceId,actor,footprintEdge:left,groundEnd:ground.path[0],elevatedEnd:high.path[0],
    stayedOnGround:after.state.pieces.find(p=>p.id===actor).models[0].elevation,committedPlanHash:good.action.spatialPlan.spatialPlanHash,
    highQueryAndApplyAdmission:'UNIT_ENTRY_SOURCE_ELEVATION_REQUIRED'});
}
await save(output+'/entry-height/result.public.json',{faq:25,sourcePlatformHash:platform.terrainHash,platformRoom:platformRoom.head.stateHash,
  scope:'Two controlled Native deployment branches combining stored source units and a signed standable platform; full bases fit. Prior Room successors recorded separately.',results,providerCalls:0});
