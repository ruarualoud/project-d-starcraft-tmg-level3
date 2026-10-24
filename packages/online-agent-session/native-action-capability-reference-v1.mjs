// Capability discovery and current action legality are different questions.
// Read the selected Native descriptors; never infer a rule from an empty menu.
const fields=[
  'officialSelectedRosterSpatialRuntimeDescriptor',
  'officialSelectedRosterRangedRuntimeDescriptor',
  'officialSelectedRosterMeleeRuntimeDescriptor',
];
const routeFields=['routeId','pieceId','officialUnitRecordKey','actionType','phase',
  'profileKey','weaponName','routeStatus'];

export function projectNativeActionCapabilityReferenceV1(state){
  if(!state||!Array.isArray(state.pieces))return null;
  const visiblePieces=new Set(state.pieces.map(piece=>piece.id));
  const sourceDescriptors=[],routes=[];
  for(const stateField of fields){
    const descriptor=state[stateField];
    if(!Array.isArray(descriptor?.routes))continue;
    sourceDescriptors.push({stateField,runtimeId:descriptor.runtimeId??null,
      runtimeVersion:descriptor.runtimeVersion??null,runtimeHash:descriptor.runtimeHash??null});
    descriptor.routes.forEach((route,index)=>{
      if(!visiblePieces.has(route.pieceId))return;
      routes.push({...Object.fromEntries(routeFields.filter(key=>route[key]!==undefined)
        .map(key=>[key,structuredClone(route[key])])),
        sourceDescriptor:stateField,sourcePointer:`/${stateField}/routes/${index}`});
    });
  }
  if(!sourceDescriptors.length)return null; // Old/redacted snapshots are not "no capability".
  return {schema:'starcraft_tmg_native_action_capability_reference_v1',
    currentPhase:state.phase??null,sourceDescriptors,routes,
    completeRulebook:false,executionEligibilityProven:false,
    instruction:'These are the selected Native movement/ranged/melee routes, not current legal domains. Read each route phase before constructing a conditional scene. Absence from the current menu does not mean unsupported capability or zero damage. A matching phase alone does not prove engagement, range, actor readiness, payment or a legal action: inspect that exact scene and use its current Native domain/parameters. Other ability definitions remain in the ability reference. No automatic phase change, placement, action or whole-match simulation is authorized.'};
}
