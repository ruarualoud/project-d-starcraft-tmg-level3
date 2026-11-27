import assert from 'node:assert/strict';
import { savedRoom, signedBranch } from './support/wave3-faq-room-v1.mjs';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createOfficialModelBaseFootprintV1, createOfficialTerrainCellFootprintsV1,
  doOfficialPhysicalFootprintsOverlapV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { deriveOfficialFinalPlacementSurfaceSupportV13 } from '../packages/rule-atoms/official-semantic-surface-support-v1.mjs';
import { deriveOfficialEngagementGraphV2, deriveOfficialModelSurfacePlacementV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';

const parent = 'build/ticket-28-wave3-premade-flight-and-platform/daybreak';
const dir = parent + '/mixed-coherency';
const id = 'wave3-daybreak-mixed-coherency';
const source = await read(parent + '/result.public.json');
const { head: original } = await savedRoom(parent, source.roomId);
assert(source.cold && source.stateHash === original.stateHash);
const state = structuredClone(original.state);
const unit = state.pieces.find(p => p.officialUnitRecordKey === 'army_units:raynor_s_raider__marine_');
assert(unit.isInReserves && unit.models.length === 6);
const start = [[33625,30125],[32125,30125],[35125,30125],[32125,31625],[33625,31625],[35125,31625]];
function position(x, y, model) {
  const place = {xMilliInches:x, yMilliInches:y, rotationDegrees:0};
  const footprint = createOfficialModelBaseFootprintV1({ dataBundle:state.officialModelBaseGeometryDataBundle,
    piece:unit, model, position:place });
  const {elevation, supportTerrainIds, highGroundOverhang} = deriveOfficialFinalPlacementSurfaceSupportV13(state, footprint);
  assert(!highGroundOverhang && state.board.terrain.every(t =>
    !createOfficialTerrainCellFootprintsV1(t).some(cell => doOfficialPhysicalFootprintsOverlapV1(footprint, cell))));
  return {...place, elevation, supportTerrainIds};
}
Object.assign(unit, {isOnField:true, isInReserves:false, deploymentStatus:'deployed',
  leadingModelId:unit.models[0].id, xInches:start[0][0]/1000, yInches:start[0][1]/1000});
state.reserveManifestBySide[unit.sideKey].find(r => r.pieceId === unit.id).deploymentStatus = 'deployed';
unit.models.forEach((m, i) => {
  const p = position(...start[i], m);
  assert.equal(p.elevation, 'ground');
  Object.assign(m, {isOnField:true, xInches:p.xMilliInches/1000, yInches:p.yMilliInches/1000,
    baseRotationDegrees:p.rotationDegrees, elevation:p.elevation, supportTerrainIds:p.supportTerrainIds});
});
declareWave3EngineeringCoherencyV1(state, {planIdPrefix:id});
function candidate(y) {
  const coordinates = [[32125,y],[29125,y],[33625,y],[35025,y],[32125,y+1500],[33625,y+1500]];
  const positions = coordinates.map(([x,y], i) => position(x,y,unit.models[i]));
  assert.deepEqual(positions.map(p => p.elevation), ['ground','high','ground','ground','ground','ground']);
  const intersections = state.board.terrain.filter(({footprint:r}) => r.minYMilliInches<y && r.maxYMilliInches>y
    && r.maxXMilliInches>29125 && r.minXMilliInches<32125);
  return {geometry:{positions, between:intersections.map(t => t.id)}, parameters:{
    leadingModelId:unit.models[0].id, path:[positions[0]],
    placements:positions.slice(1).map((p,i) => ({modelId:unit.models[i+1].id,...p}))}};
}
const gate = candidate(29125), wall = candidate(30375);
assert.deepEqual(gate.geometry.between, ['native_pad_north_middle:gate-1']);
assert.deepEqual(wall.geometry.between, ['native_pad_north_middle:rim-48']);
const scene = {parent:source.roomId, parentHash:source.stateHash, conditionalGroundStart:start,
  seedId:source.scene.seedId, overlayHash:source.scene.overlayHash, unitId:unit.id,
  accessPointId:'semantic:native_access_nc_northwest', translationMilliInches:1250};
const moveDomain = space => space.parameterDomains.find(d => d.actionType==='move' && d.pieceId===unit.id);
await signedBranch({dir,id,version:source.version,initial:state,state,scene,
  perform:async ({app,bound,seats,head,menu,commit}) => {
    if ((await head()).stateRevision===0) {
      const s=await menu();
      await commit(s.finiteActions.find(r => r.action.actionType==='choose_first_actor' && r.action.chosenFirstActorSideKey==='player1'));
    }
    if ((await head()).stateRevision===1) {
      const h=await head(), s=await menu(), domain=moveDomain(s);
      assert(domain);
      const seat={roomId:id,seatToken:seats.player1.seatToken};
      const {projection}=await app.room.readRoom(seat);
      const adapter=createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore:app.store,rulesRuntime:bound.rulesRuntime,seatKey:'player1'});
      const queries=createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery:q=>adapter.query(q)});
      const measure=async choice=>{
        const query=await queries.query({roomProjection:projection, legalSpace:s,
          request:{queryKind:'coherency_after_candidate_placement',arguments:{domainId:domain.domainId,parameters:choice.parameters}}});
        const preview=await app.room.previewAction({...seat,expectedStateRevision:h.stateRevision,expectedStateHash:h.stateHash,
          expectedMatchBindingHash:h.matchBindingHash,expectedLegalSpaceHash:s.legalSpaceHash,
          proposal:{kind:'parameterized',domainId:domain.domainId,parameters:choice.parameters}});
        return {geometry:choice.geometry, status:query.status, reason:query.reason??query.result?.reason??null,
          queryReceiptHash:query.queryReceiptHash,accepted:preview.ok,detail:preview.message??null,
          actionHash:query.result?.actionHash??null,postHash:preview.preview?.core.result.postStateHash??null};
      };
      const denied=await measure(wall), open=await measure(gate);
      const same=await head();
      await save(dir+'/comparison.public.json',{sourceRevision:h.stateRevision, stateHash:h.stateHash,
        legalSpaceHash:s.legalSpaceHash, denied, open, afterPreviews:same.stateHash, providerCalls:0});
      assert.equal(denied.accepted,false,JSON.stringify(denied));
      assert.equal(denied.detail,'MODEL_BASE_GEOMETRY_COHERENCY_LINK_INVALID');
      assert.equal(denied.reason,denied.detail);
      assert.equal(same.stateHash,h.stateHash);
      assert(open.accepted && open.status==='exact' && open.actionHash,JSON.stringify(open));
      await commit(domain,gate.parameters);
      assert.equal((await head()).stateHash,open.postHash);
    }
    if ((await head()).stateRevision===2) {
      const s=await menu();
      await commit(s.parameterDomains.find(d=>d.actionType==='finish_activation' && d.pieceId===unit.id));
    }
  },
  verify:async h=>{
    assert.equal(h.stateRevision,3);
    const actual = h.state.pieces.find(p=>p.id===unit.id);
    assert.equal(actual.inCoherency,true);
    for(const [i,m] of actual.models.entries()){
      const p=gate.geometry.positions[i];
      assert.deepEqual([m.xInches,m.yInches,m.elevation],[p.xMilliInches/1000,p.yMilliInches/1000,p.elevation]);
    }
    assert.equal(h.state.activeSideKey,'player2');
    const highModel = actual.models[1].id;
    const surface = deriveOfficialModelSurfacePlacementV2(h.state,{pieceId:unit.id,modelId:highModel});
    assert.equal(surface.elevation,'high');
    const incorrect = structuredClone(h.state);
    incorrect.pieces.find(p=>p.id===unit.id).models[1].elevation='ground';
    assert.throws(()=>deriveOfficialEngagementGraphV2(incorrect), /ENGAGEMENT_V2_ELEVATION_DECLARATION_MISMATCH/);
    return {inCoherency:actual.inCoherency, recordedPositions:gate.geometry.positions,
      rejectedTerrain:wall.geometry.between, acceptedTerrain:gate.geometry.between,nextSide:h.state.activeSideKey};
  }
});
