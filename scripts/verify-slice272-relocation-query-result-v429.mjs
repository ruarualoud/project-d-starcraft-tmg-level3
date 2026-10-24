import assert from 'node:assert/strict';
import {createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1} from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
// Concrete adapter bug: native relocation returns relocationPlan.geometryPlan,
// while the query only looked for spatialPlan. This is a seam fixture, NOT a
// new certification of terrain/path legality or a live scene mutation.
const authority={roomId:'relocation-seam',seatKey:'player1',stateRevision:1,
  matchBindingHash:'a'.repeat(64),stateHash:'b'.repeat(64),legalSpaceHash:'c'.repeat(64)};
const domain={domainId:'relocation',sideKey:'player1',parameterKind:'official_relocation_family_plan_v1',
  actionType:'resolve_relocation_ability',parameterSchema:{required:['leadingModelId','placements','path'],
    leadingModelId:{enum:['m1']},placements:{exactModelIds:['m1'],coordinateUnit:'milli-inch'},path:{minPoints:1,maxPoints:64}}};
const parameters={leadingModelId:'m1',placements:[{modelId:'m1',xMilliInches:1000,yMilliInches:1000}],path:[{xMilliInches:1000,yMilliInches:1000}]};
let geometry={schema:'starcraft_tmg_official_relocation_geometry_plan_v1',effectKind:'extra_move',
  fullBaseBoundaryChecked:true,fullRoundBaseSweptPathChecked:true,rectangularEndpointBasesChecked:true,
  completeFormationCoherencyChecked:true,pathIgnoredForPlaceEffects:false,geometryPlanHash:'d'.repeat(64)};
const adapter=createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({seatKey:'player1',
  roomStore:{loadRoom:async()=>({stateRevision:1,envelope:{stateHash:authority.stateHash,matchBindingHash:authority.matchBindingHash,state:{},matchBinding:{}}})},
  rulesRuntime:{instantiate:()=>({canonicalParameters:parameters,action:{sourceAction:{actionType:'resolve_relocation_ability',relocationPlan:{geometryPlan:geometry}}}})}});
const query=kind=>adapter.query({authority,queryKind:kind,arguments:{domainId:domain.domainId,currentLegalSpaceDomain:domain,parameters}});
let r=await query('legal_full_path_movement');
assert.equal(r.precision,'exact','Native validated relocation movement must not become unsupported solely because it uses relocationPlan');
assert.equal(r.result.pathQualification.completeNativePathChecked,true);
assert.equal(r.result.pathQualification.nativePlanKind,'relocationPlan');
assert.equal(r.result.pathQualification.nativePlanHash,geometry.geometryPlanHash);
assert.equal(r.result.completeFormationPlacementChecked,true);
geometry={...geometry,effectKind:'direct_place',pathIgnoredForPlaceEffects:true,fullRoundBaseSweptPathChecked:null};
r=await query('legal_full_path_movement');assert.equal(r.precision,'unknown','Place does not validate a traversed path');
r=await query('coherency_after_candidate_placement');assert.equal(r.precision,'exact');
assert.equal(r.result.coherencyQualification.nativePlanKind,'relocationPlan');
geometry={...geometry,fullBaseBoundaryChecked:false};
r=await query('coherency_after_candidate_placement');assert.equal(r.precision,'unknown');
console.log(JSON.stringify({passed:true,relocationResultAdapter:true,placeNotPath:true,nativeGeometryNotReexecuted:true,providerCalls:0}));
