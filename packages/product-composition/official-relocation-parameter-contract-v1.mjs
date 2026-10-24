// Transport identity shared by the native relocation executor and agent tools.
// This does not choose positions or decide path/terrain legality.
export function inspectOfficialRelocationPlacementIdsV1(modelIds,placements) {
  const remaining=new Set(modelIds);
  const duplicateOrUnexpectedModelIds=[];
  for(const entry of Array.isArray(placements)?placements:[]) {
    const id=String(entry?.modelId||'');
    if(!remaining.delete(id))duplicateOrUnexpectedModelIds.push(id);
  }
  return {valid:Array.isArray(placements)&&placements.length===modelIds.length
      &&remaining.size===0&&duplicateOrUnexpectedModelIds.length===0,
    requiredPlacementCount:modelIds.length,
    submittedPlacementCount:Array.isArray(placements)?placements.length:0,
    missingPlacementModelIds:[...remaining],duplicateOrUnexpectedModelIds};
}

export function describeOfficialRelocationParameterFieldsV1(domain) {
  if(domain?.parameterKind!=='official_relocation_family_plan_v1')return null;
  const schema=domain.parameterSchema||{},ids=schema.placements?.exactModelIds;
  if(!Array.isArray(ids))return null;
  const point={type:'object',required:['xMilliInches','yMilliInches'],additionalProperties:true,
    properties:{xMilliInches:{type:'integer'},yMilliInches:{type:'integer'}}};
  return {leadingModelId:{type:'string',enum:ids},
    placements:{type:'array',minItems:ids.length,maxItems:ids.length,
      exactModelIds:ids,includesLeadingModel:true,coordinateUnit:schema.placements.coordinateUnit,
      description:'Exactly every live model once, INCLUDING leadingModelId. Native still validates all positions and geometry.',
      items:{...point,required:['modelId',...point.required],properties:{...point.properties,modelId:{type:'string',enum:ids}}}},
    ...(schema.path?{path:{type:'array',minItems:schema.path.minPoints,maxItems:schema.path.maxPoints,
      items:point,coordinateUnit:schema.path.coordinateUnit}}:{})};
}
