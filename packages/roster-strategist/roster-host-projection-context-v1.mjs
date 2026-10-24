// Host interface statements are inspectable sources, not Rules observations.
// Reuse the normal immutable context publisher and numeric citation directory.
import {isDeepStrictEqual} from 'node:util';
const contracts={measurementScenes:'roster_measurement_scenes_v1',
  measurementRowDifferences:'roster_measurement_row_differences_v1',
  measurementConfigurations:'roster_measurement_configurations_v1'};
const copy=structuredClone;
function projections(inputs){
  return Object.fromEntries(Object.entries(contracts).flatMap(([key,schema])=>{
    const value=inputs?.[key]?.value;
    return value?.schema===schema&&value.assessmentScope?.schema==='roster_measurement_assessment_scope_v1'
      ?[[key,copy({schema:value.schema,version:value.version,assessmentScope:value.assessmentScope,instruction:value.instruction})]]:[];
  }));
}
export async function publishRosterHostProjectionContextV1({assignment,control}){
  const selected=projections(assignment.inputs);if(!Object.keys(selected).length)return assignment;
  // Configuration inputs and computed observations have different authority.
  // These are navigation handles into the saved selections, not copied facts.
  const configurationReadHandles=Object.entries(assignment.inputs).flatMap(([key,input])=>
    /^measurementConfiguration\d+$/u.test(key)&&input.source==='evidence'&&input.status==='read'
      ?[{inputName:key,evidenceId:input.evidenceId,evidenceNumber:input.evidenceNumber,
        artifactRef:input.artifactRef,pointer:input.pointer,
        proofKind:'saved_candidate_configuration',
        instruction:'Read this saved candidate selection to support its actual chosen configuration. Cite its source in conclusion.evidenceNumbers and explain the configuration with its scope. It is not a computed combat/Supply fact; do not put a draft/proposal or this handle into nativeFacts. Computed facts still require the original Native receipt or Builder verdict.'}]:[]);
  const previous=assignment.inputs.hostProjectionSource;
  if(previous?.status==='read'&&previous.value?.schema==='roster_host_projection_context_v1'
    &&previous.value.version>=2&&isDeepStrictEqual(previous.value.projections,selected)
    &&isDeepStrictEqual(previous.value.configurationReadHandles,configurationReadHandles))return assignment;
  if(typeof control.publishContext!=='function')throw Error('ROSTER_HOST_CONTEXT_PUBLICATION_UNAVAILABLE');
  const value={schema:'roster_host_projection_context_v1',version:2,projections:selected,configurationReadHandles,
    rulesAuthority:false,trainingTruth:false,
    proofScope:'Exact Host interface wording delivered to this role. It proves what these projections assess and how they describe their limits, NOT a Native outcome, rule, causal verdict, other author/reviewer statement, or strategy approval. Use original Native/rule sources for empirical premises. Historical instructions need their own historical source.'};
  const entry=await control.publishContext(value,{title:'Exact Host projection scope and instructions; not Native facts',
    kind:'capability_result',conditions:[value.proofScope],includeDirectory:true});
  if(!Number.isSafeInteger(entry.evidenceNumber)||!Array.isArray(entry.evidenceDirectory)
    ||entry.evidenceDirectory[entry.evidenceNumber-1]?.id!==entry.id)throw Error('ROSTER_HOST_CONTEXT_DIRECTORY_MISMATCH');
  const inputs={...assignment.inputs};
  for(const key of Object.keys(selected))inputs[key]={...inputs[key],sourceContext:{
    evidenceId:entry.id,evidenceNumber:entry.evidenceNumber,pointer:'/projections/'+key,
    scope:'interface_wording_only',citationContractVersion:2,nativeFactEligible:false,
    availablePointers:Object.keys(selected[key]).map(field=>'/projections/'+key+'/'+field),
    instruction:'This source contains ONLY the listed interface wording fields. It does NOT contain the projection measurements/units/comparisons. Do not construct paths to those omitted arrays here. Use the separately delivered original source handles for data; configuration selections and Native computed facts are different evidence classes.'}};
  inputs.hostProjectionSource={source:'evidence',evidenceId:entry.id,evidenceNumber:entry.evidenceNumber,
    artifactRef:entry.artifactRef,pointer:'',status:'read',value};
  return {...assignment,evidenceDirectory:entry.evidenceDirectory,inputs};
}
export function rosterHostProjectionCitationGapV1({inputs,errors,output}){
  if(inputs?.hostProjectionSource?.value?.schema==='roster_host_projection_context_v1')return false;
  if(!errors?.length||!errors.every(e=>['review_subject_is_not_evidence','supported_review_requires_evidence'].includes(e.code)))return false;
  const reasons=[output?.publicReason,...(output?.checks??[]).map(c=>c.publicReason),
    ...(output?.checkPatches??[]).map(p=>p.replacement?.publicReason)].filter(x=>typeof x==='string');
  return Object.keys(projections(inputs)).some(key=>reasons.some(reason=>reason.includes(key)));
}
