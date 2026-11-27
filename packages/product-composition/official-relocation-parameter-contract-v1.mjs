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

export function isOfficialNonEntryEdgeGroundDeployDomainV1(domain) {
  domain=domain?.sourceDomain||domain?.sourceAction||domain;
  return domain?.actionType==='resolve_protoss_unique_ability'
    &&domain.parameterKind==='official_protoss_unique_family_plan_v1'
    &&domain.effectKind==='non_entry_edge_ground_deploy';
}

export function describeOfficialRelocationParameterFieldsV1(domain) {
  domain=domain?.sourceDomain||domain?.sourceAction||domain;
  const nativeRelocation=domain?.parameterKind==='official_relocation_family_plan_v1';
  const warpIn=isOfficialNonEntryEdgeGroundDeployDomainV1(domain);
  if(!nativeRelocation&&!warpIn)return null;
  const schema=domain.parameterSchema||{},ids=nativeRelocation
    ?schema.placements?.exactModelIds:schema.placements?.modelIds;
  if(!Array.isArray(ids))return null;
  const point={type:'object',required:['xMilliInches','yMilliInches'],additionalProperties:true,
    properties:{xMilliInches:{type:'integer'},yMilliInches:{type:'integer'}}};
  return {leadingModelId:{type:'string',enum:ids},
    placements:{type:'array',minItems:ids.length,maxItems:ids.length,
      exactModelIds:ids,includesLeadingModel:true,coordinateUnit:schema.placements.coordinateUnit||'milli_inches',
      description:'Exactly every live model once, INCLUDING leadingModelId. Native still validates all positions and geometry.',
      items:{...point,required:['modelId',...point.required],properties:{...point.properties,modelId:{type:'string',enum:ids}}}},
    ...(schema.path?{path:{type:'array',minItems:schema.path.minPoints,maxItems:schema.path.maxPoints,
      items:point,coordinateUnit:schema.path.coordinateUnit}}:{})};
}

// Explicit unit names are transport values, never a placement choice. Convert
// only values representable at the Native milli-inch precision. Keep conflicts
// and incomplete coordinates visible to the shared parameter inspector.
export function canonicalOfficialRelocationParameterCoordinatesV1(domain,parameters) {
  if(!describeOfficialRelocationParameterFieldsV1(domain)||!parameters
    ||typeof parameters!=='object'||Array.isArray(parameters))return parameters;
  const point=value=>{
    if(!value||typeof value!=='object'||Array.isArray(value))return value;
    const result={...value};
    for(const axis of ['x','y']) {
      const inch=axis+'Inches',milli=axis+'MilliInches';
      if(!Object.hasOwn(value,inch))continue;
      const scaled=typeof value[inch]==='number'?value[inch]*1000:NaN;
      const exact=Math.round(scaled);
      if(!Number.isSafeInteger(exact)||Math.abs(scaled-exact)>1e-6)continue;
      if(Object.hasOwn(value,milli)&&value[milli]!==exact)continue;
      result[milli]=exact;delete result[inch];
    }
    return result;
  };
  return {...parameters,
    ...(Array.isArray(parameters.placements)?{placements:parameters.placements.map(point)}:{}),
    ...(Array.isArray(parameters.path)?{path:parameters.path.map(point)}:{})};
}
