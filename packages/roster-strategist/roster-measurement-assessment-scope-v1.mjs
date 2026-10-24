// An unperformed assessment is not a negative observation. Host describes the
// projection's remit; Native observations and the role's judgment stay separate.
export function rosterMeasurementAssessmentScopeV1(projection){
  return {schema:'roster_measurement_assessment_scope_v1',version:1,projection,
    causalAttribution:'not_assessed_by_this_projection',
    strategicPreference:'not_assessed_by_this_projection',
    statisticalSignificance:'not_assessed_by_this_projection',
    combinedVolley:'not_assessed_by_this_projection',
    arrivalOrMovementLegality:'not_assessed_by_this_projection',
    instruction:'These are responsibility boundaries, not observations or verdicts. Not assessed means neither established nor refuted here. Evaluate a scoped claim using the supplied Native conditions, actual configurations, measured rows, query settings and uncertainty together. Do not require a Host scope marker to turn true, or treat it as evidence of no effect, changed conditions, or inability to compare. No strategic choice or release approval is issued by this projection.'};
}

const legacyMarkers=new Set(['nonGeometryEqualityProven','causalBenefitProven',
  'arrivalOrMovementLegalityProven','strategyImprovementProven']);
const surfaces=['measurementScenes','measurementRowDifferences','measurementConfigurations'];
// Invalidate only a judgment that actually used a changed Host field. Merely
// having old fields in an input does not invalidate a numeric-only check. This
// detects an input dependency, not whether the author's conclusion is correct.
export async function rosterSavedMeasurementScopeGapV1({work,readArtifact}){
  if(work?.status!=='evidence_ready'||!work.resultRef||work.operationState?.pending)return null;
  const requestRef=work.operationState?.calls?.at(-1)?.requestRef;
  if(!requestRef)return null;
  const result=await readArtifact(work.resultRef),checks=result?.value?.checks;
  if(!Array.isArray(checks)||!checks.length)return null;
  const used=[...legacyMarkers].filter(key=>checks.some(check=>
    [check.publicReason,...(check.conditions??[])].some(text=>typeof text==='string'&&text.includes(key))));
  if(!used.length)return null;
  const request=await readArtifact(requestRef),inputs=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.inputs;
  const markers=[];
  const visit=(value,path)=>{
    if(!value||typeof value!=='object')return;
    for(const [key,child]of Object.entries(value)){
      if(used.includes(key)&&child===false)markers.push({path:path+'/'+key,key,value:child});
      if(child&&typeof child==='object')visit(child,path+'/'+key);
    }
  };
  for(const key of surfaces)visit(inputs?.[key]?.value,'/inputs/'+key+'/value');
  return markers.length?{requestRef,markers,assessmentScopeVersion:1}:null;
}
