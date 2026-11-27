// Caller-declared scene predicates, NOT tactical weights or an action solver.
// All measurements use the same physical bases and engagement kernel as play.
import {createOfficialModelBaseFootprintV1,evaluateOfficialPhysicalFootprintRelationV1} from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import {deriveOfficialEngagementGraphV2} from '../rule-atoms/official-engagement-graph-v2.mjs';

export const STATIC_FORMATION_RELATIONSHIP_CONTRACT_V1=Object.freeze({
  optional:['baseEdgeDistances','unengagedUnitIds'],
  baseEdgeDistances:[{unitId:'exact unit ID',targetUnitId:'different exact unit ID',
    minimumMilliInches:'nonnegative integer, inclusive',maximumMilliInches:'integer >= minimum, inclusive'}],
  unengagedUnitIds:'Unique exact unit IDs; Native engagement graph against ALL on-field enemies, including elevations and terrain. Not just the named distance target.',
  scope:'Hard predicates on complete static layouts, not leader centers, movement, cover, Creep, reaction eligibility or charge success. References must be on field or explicitly included in this joint search.',
  regionalRefinement:'Only for caller-supplied anchorRegions, a complete packed formation may be translated within that same leader region to a requested base-edge distance boundary. These bounded refinements may be off the region lattice; all bases/coherency/relationships are rechecked. Exact anchors are never moved. No continuous feasibility or optimality claim.',
  result:'Each admitted option contains actual relationshipAssessment; unmet constraints are misses, never successful observations. Native action/menu checks remain required.'
});
const invalid=detail=>{throw Object.assign(Error('STATIC_FORMATION_ARGUMENTS_INVALID:'+detail),{code:'STATIC_FORMATION_ARGUMENTS_INVALID'});};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const unitIdSchema={type:'string',minLength:1,maxLength:65536};
export const STATIC_FORMATION_RELATIONSHIP_SCHEMA_V1={type:'object',additionalProperties:false,
  required:['baseEdgeDistances','unengagedUnitIds'],properties:{
    baseEdgeDistances:{type:'array',minItems:0,items:{type:'object',additionalProperties:false,
      required:['unitId','targetUnitId','minimumMilliInches','maximumMilliInches'],properties:{
        unitId:unitIdSchema,targetUnitId:unitIdSchema,minimumMilliInches:{type:'integer',minimum:0,maximum:1000000000},maximumMilliInches:{type:'integer',minimum:0,maximum:1000000000}}}},
    unengagedUnitIds:{type:'array',minItems:0,items:unitIdSchema}}};
// One source owns the authoring shape and Native input validation. Availability
// is checked against the actual selected state below, never a prose identity.
export function normalizeStaticFormationRelationshipsV1(input){
  if(!object(input)||Object.keys(input).some(k=>!STATIC_FORMATION_RELATIONSHIP_CONTRACT_V1.optional.includes(k)))invalid('relationship_constraints_fields');
  const distances=input.baseEdgeDistances??[],unengaged=input.unengagedUnitIds??[];
  if(!Array.isArray(distances)||!Array.isArray(unengaged)||(!distances.length&&!unengaged.length))invalid('nonempty_relationship_constraints_required');
  const id=x=>typeof x==='string'&&x.trim().length>0;
  for(const d of distances)if(!object(d)||Object.keys(d).some(k=>!['unitId','targetUnitId','minimumMilliInches','maximumMilliInches'].includes(k))
    ||!id(d.unitId)||!id(d.targetUnitId)||d.unitId===d.targetUnitId
    ||!Number.isSafeInteger(d.minimumMilliInches)||!Number.isSafeInteger(d.maximumMilliInches)
    ||d.minimumMilliInches<0||d.maximumMilliInches<d.minimumMilliInches)invalid('relationship_distance_fields');
  if(unengaged.some(x=>!id(x)))invalid('relationship_unit_id');
  if(new Set(unengaged).size!==unengaged.length)invalid('duplicate_unengaged_unit');
  return structuredClone({baseEdgeDistances:distances,unengagedUnitIds:unengaged});
}
const active=piece=>piece?.isOnField===true&&!piece.isDestroyed&&piece.currentModels>0;
const models=piece=>piece.models.filter(m=>!m.isDestroyed&&m.isOnField!==false);
function footprints(state,piece){return models(piece).map(model=>createOfficialModelBaseFootprintV1({piece,model,dataBundle:state.officialModelBaseGeometryDataBundle}));}
function nearest(left,right){
  let result=null;
  for(const l of left)for(const r of right){
    const relation=evaluateOfficialPhysicalFootprintRelationV1({left:l,right:r});
    if(!result||relation.minimumSeparationMilliInches<result.distanceMilliInches)
      result={distanceMilliInches:relation.minimumSeparationMilliInches,fromModelId:l.objectId,toModelId:r.objectId,relationHash:relation.relationHash};
  }
  return result;
}
export function projectStaticFormationPlacementV1(state,placement){
  const piece=state.pieces.find(p=>p.id===placement.pieceId);
  const byId=new Map(placement.modelPositions.map(p=>[p.modelId,p]));
  const actor={...piece,isOnField:true,xInches:placement.xInches,yInches:placement.yInches,
    models:piece.models.map(model=>byId.has(model.id)?{...model,...byId.get(model.id),isOnField:true,baseRotationDegrees:byId.get(model.id).rotationDegrees}:model)};
  return {...state,pieces:state.pieces.map(p=>p.id===piece.id?actor:p)};
}
export function prepareStaticFormationRelationshipsV1(state,args){
  if(args.relationshipConstraints===undefined)return null;
  const constraints=normalizeStaticFormationRelationshipsV1(args.relationshipConstraints);
  const selected=new Set([args.unitId,...(args.jointUnits??[]).map(u=>u.unitId)]);
  const {baseEdgeDistances:distances,unengagedUnitIds:unengaged}=constraints;
  const requirePiece=id=>{
    const piece=state.pieces.find(p=>p.id===id);
    if(typeof id!=='string'||!piece||piece.isDestroyed||piece.currentModels<=0
      ||(!active(piece)&&!selected.has(id)))invalid('relationship_reference_unavailable:'+String(id));
  };
  for(const d of distances){
    requirePiece(d.unitId);requirePiece(d.targetUnitId);
  }
  unengaged.forEach(requirePiece);
  const stats={distanceEvaluations:0,boundaryProbes:0,engagementEvaluations:0};
  function assess(projected,{partial=false}={}){
    const baseEdgeDistances=[],unengagedUnits=[];let complete=true;
    const cache=new Map();
    const rows=id=>{if(!cache.has(id)){const piece=projected.pieces.find(p=>p.id===id);cache.set(id,active(piece)?footprints(projected,piece):[]);}return cache.get(id);};
    for(const d of constraints.baseEdgeDistances){
      const left=rows(d.unitId),right=rows(d.targetUnitId);
      if(!left.length||!right.length){complete=false;if(!partial)baseEdgeDistances.push({...d,passed:false,reason:'referenced_unit_not_placed'});continue;}
      stats.distanceEvaluations++;const measured=nearest(left,right);
      baseEdgeDistances.push({...d,...measured,passed:measured.distanceMilliInches>=d.minimumMilliInches&&measured.distanceMilliInches<=d.maximumMilliInches});
    }
    const ready=constraints.unengagedUnitIds.filter(id=>rows(id).length);
    if(ready.length){
      stats.engagementEvaluations++;const graph=deriveOfficialEngagementGraphV2(projected);
      for(const unitId of ready){const engaged=graph.engagedUnitIds.includes(unitId);
        unengagedUnits.push({unitId,engaged,passed:!engaged,graphHash:graph.graphHash,
          engagedWithUnitIds:[...new Set(graph.modelEdges.filter(e=>e.leftUnitId===unitId||e.rightUnitId===unitId).map(e=>e.leftUnitId===unitId?e.rightUnitId:e.leftUnitId))]});}
    }
    for(const unitId of constraints.unengagedUnitIds.filter(id=>!ready.includes(id))){complete=false;if(!partial)unengagedUnits.push({unitId,passed:false,reason:'referenced_unit_not_placed'});}
    return {passed:(partial||complete)&&baseEdgeDistances.every(r=>r.passed)&&unengagedUnits.every(r=>r.passed),complete,
      baseEdgeDistances,unengagedUnits,scope:'native_static_relationships_only',actionLegalityProven:false};
  }
  function* variants(projected,placement,{anchor,anchorSource,region}={}){
    yield {placement,anchor,anchorSource,translated:false};
    // Refining a region is authorized by the region and explicit predicates.
    // Exact point callers retain their coordinates even when no result matches.
    if(!region)return;
    const actor=projected.pieces.find(p=>p.id===placement.pieceId);
    const seen=new Set(['0:0']);
    for(const d of constraints.baseEdgeDistances){
      const otherId=d.unitId===actor.id?d.targetUnitId:d.targetUnitId===actor.id?d.unitId:null;
      const other=projected.pieces.find(p=>p.id===otherId);
      if(!otherId||!active(other))continue;
      const targets=footprints(projected,other);
      const shift=(axis,delta)=>({...placement,
        [axis+'Inches']:(Math.round(placement[axis+'Inches']*1000)+delta)/1000,
        modelPositions:placement.modelPositions.map(p=>({...p,[axis+'Inches']:(Math.round(p[axis+'Inches']*1000)+delta)/1000}))});
      function distance(axis,delta){
        stats.boundaryProbes++;
        const p=shift(axis,delta),s=projectStaticFormationPlacementV1(projected,p);
        return nearest(footprints(s,s.pieces.find(v=>v.id===actor.id)),targets).distanceMilliInches;
      }
      const current=distance('x',0);
      if(current>=d.minimumMilliInches&&current<=d.maximumMilliInches)continue;
      const wanted=Math.max(d.minimumMilliInches,Math.min(d.maximumMilliInches,current));
      for(const axis of ['x','y']){
        const upper=axis.toUpperCase(),at=Math.round(anchor[axis+'Inches']*1000);
        const low=Math.ceil(region['minimum'+upper+'Inches']*1000)-at,high=Math.floor(region['maximum'+upper+'Inches']*1000)-at;
        const points=[...new Set([low,high,0,...Array.from({length:15},(_,i)=>Math.round(low+(high-low)*(i+1)/16))])]
          .filter(t=>t>=low&&t<=high).sort((a,b)=>a-b);
        const samples=points.map(t=>({t,value:distance(axis,t)})),roots=[];
        for(let i=0;i<samples.length;i++){
          if(samples[i].value===wanted)roots.push(samples[i].t);
          if(!i||(samples[i-1].value-wanted)*(samples[i].value-wanted)>=0)continue;
          let a=samples[i-1],b=samples[i];
          // Native positions/measurements use integer milli-inches. A bounded
          // bracket refinement finds a witness, never proves continuous absence.
          for(let n=0;n<32&&b.t-a.t>1;n++){
            const t=Math.floor((a.t+b.t)/2),value=distance(axis,t);
            if(value===wanted){roots.push(t);break;}
            if((value-wanted)*(a.value-wanted)>0)a={t,value};else b={t,value};
          }
        }
        for(const delta of [...new Set(roots)].sort((a,b)=>Math.abs(a)-Math.abs(b)||a-b)){
          const key=axis+':'+delta;if(!delta||seen.has(key))continue;seen.add(key);
          const p=shift(axis,delta),refined={xInches:p.xInches,yInches:p.yInches};
          yield {placement:p,anchor:refined,translated:true,anchorSource:{kind:'constraint_boundary_translation',
            originalAnchor:anchor,originalAnchorSource:anchorSource,axis,deltaMilliInches:delta,
            regionIndex:anchorSource.regionIndex,constraint:structuredClone(d)}};
        }
      }
    }
  }
  return {constraints,stats,assess,variants};
}
