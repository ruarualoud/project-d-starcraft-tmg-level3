// Shared by Native placement canonicalization and every agent submission view.
// This describes transport/identity only; Native still decides path and geometry.
const KIND='official_selected_roster_spatial_path_v1';
const fail=(code,detail='')=>{throw Error(detail?`${code}:${detail}`:code);};
export function remainingOfficialSelectedRosterSpatialModelIdsV1(domain,leadingModelId,placements){
  if(!Array.isArray(placements)||placements.length!==domain.constraints.modelProfiles.length-1)
    fail('SELECTED_SPATIAL_PLACEMENT_DENOMINATOR_INVALID');
  const remaining=new Set(domain.constraints.modelProfiles.map(entry=>entry.modelId));
  if(!remaining.delete(leadingModelId))fail('SELECTED_SPATIAL_LEADING_MODEL_INVALID',leadingModelId);
  const unseen=new Set(remaining);
  for(const [index,entry] of placements.entries()){
    const id=String(entry?.modelId||'');
    if(!unseen.delete(id))fail('SELECTED_SPATIAL_PLACEMENT_MODEL_INVALID',id||String(index));
  }
  if(unseen.size)fail('SELECTED_SPATIAL_PLACEMENT_DENOMINATOR_INVALID');
  return remaining;
}
export function describeOfficialSelectedRosterSpatialParameterFieldsV1(domain){
  if(domain?.parameterKind!==KIND)return null;
  const ids=domain.constraints.modelProfiles.map(row=>row.modelId),count=ids.length-1;
  const point={type:'object',required:['xMilliInches','yMilliInches'],additionalProperties:true,
    properties:{xMilliInches:{type:'integer'},yMilliInches:{type:'integer'}}};
  return {
    leadingModelId:{type:'string',enum:ids},
    path:{type:'array',minItems:1,maxItems:domain.parameterSchema.maxRawPathPoints,
      items:point,coordinateUnit:'milli-inch',description:'Only the leading model follows this path. Its final position is the path endpoint.'},
    placements:{type:'array',minItems:count,maxItems:count,excludesLeadingModel:true,
      description:'Exactly every OTHER live model once; exclude leadingModelId. Native validates bases, coherency and terrain; valid shape is not legal geometry.',
      items:{...point,required:['modelId',...point.required],properties:{...point.properties,modelId:{type:'string',enum:ids}}}},
    ...(domain.actionType==='deploy'?{entrySegmentId:{type:'string',enum:domain.constraints.entrySegments.map(segment=>segment.segmentId)},
      entryAlongEdgeMilliInches:{type:'integer'}}:{}),
  };
}
