// Mechanical prerequisites survive chunking. A constructed scene is not the
// same predicate as a jointly valid scene, let alone an executed combat result.
export function projectRosterWorkflowExecutionPrerequisitesV1(value){
  const assessment=value?.receipt?.hypotheticalPlacementAssessment;
  if(!Array.isArray(assessment?.units))return null;
  const unresolvedUnits=assessment.units.filter(unit=>unit.resultStatus!=='ok').map(unit=>({
    pieceId:unit.pieceId,resultStatus:unit.resultStatus,unknownReason:unit.unknownReason??null,
    queryErrorDetail:unit.queryErrorDetail??null,
  }));
  return {schema:'roster_workflow_execution_prerequisites_v1',
    staticGeometryStatus:unresolvedUnits.length?'requires_repair':'checked_static_geometry_only',
    checkedUnits:assessment.units.length,unresolvedUnits,
    sourcePointer:'/receipt/hypotheticalPlacementAssessment',
    originalArtifactUnchanged:true,arrivalOrMovementLegalityProven:false,
    instruction:'Exact projection of the Native whole-scene assessment. resultStatus=ok for scene construction does not mean these prerequisites passed. Candidates solved independently can overlap when combined. Read the assessment or solve new model-chosen positions for every unresolved unit before claiming a complete combat scene. This projection proves neither arrival nor combat value.'};
}
