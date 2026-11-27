import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterParticipantOptionalFieldsV1} from './roster-participant-wire-v1.mjs';

// The author chooses the disposition. A redundant copy of that disposition in
// the outer transport action is not another strategic decision. Derive only an
// unambiguous submission, never a read, an investigation scope or a verdict.
export function projectRosterDecisionEnvelopeV1({request,output}){
  const unchanged={output,projection:[]},schema=request?.responseFormat?.schema;
  const choices=schema?.properties?.decisions?.items?.properties?.disposition?.enum;
  const actions=schema?.properties?.action?.enum;
  if(request?.roundKind!=='roster_workflow_strategy_decision'||!actions?.includes('finish')
    ||!choices?.length||!Array.isArray(output?.decisions)||!output.decisions.length)return unchanged;
  const value=output.action;
  if(actions.includes(value)||!choices.includes(value)
    ||output.decisions.some(d=>d?.disposition!==value))return unchanged;
  for(const key of ['reads','catalogueQueries']){
    if(schema.properties[key]?.type!=='array')return unchanged;
    if(Object.hasOwn(output,key)&&(!Array.isArray(output[key])||output[key].length))return unchanged;
  }
  const canonical={...output,action:'finish'},projection=[{
    rule:'explicit_decision_envelope_v1',from:'/action',original:value,value:'finish',
    decisionValuesPreserved:true,semanticApprovalGranted:false,
  }];
  for(const key of ['reads','catalogueQueries'])if(!Object.hasOwn(canonical,key)){
    canonical[key]=[];projection.push({rule:'inactive_decision_query_list_v1',to:'/'+key,value:[]});
  }
  return {output:canonical,projection};
}

// Same predicate for the outer product and the state transition. A paused ready
// task is not required to spend its remaining paid corrections before reuse.
// Immutable raw replies, fees, counters and unresolved semantic checks survive.
export async function projectRosterCommandEnvelopeRecoveryV1({state,work,readArtifact}){
  const op=work?.operationState,ref=op?.correction?.originalReplyRef;
  if(!['roster_workflow_strategy_decision','roster_workflow_experiment_planner'].includes(work?.role)
    ||!['ready','needs_model_choice','needs_repair'].includes(work.status)
    ||op?.pending||op?.retryProviderDispatch||op?.revalidateReplyRef||op?.noProgressStop
    ||!ref||op.calls?.at(-1)?.replyRef!==ref
    ||(work.failure&&work.failure.dispatchOutcome!=='completed_invalid'))return null;
  const errors=op.correction.errors??[];
  const semanticEnvelope=work.role==='roster_workflow_experiment_planner'&&errors.length>0
    &&errors.every(e=>e.code==='operation_step_parameters_invalid'||e.code==='native_selection_step_invalid'
      &&e.cause==='ROSTER_WORKFLOW_NATIVE_SELECTION_INVALID'
      &&e.detail?.receivedSelection?.kind==='finite'&&typeof e.detail.receivedSelection.match==='string'
      &&e.detail?.issues?.length>0&&e.detail.issues.every(i=>i.code==='selection_match_object_required'));
  const constructionEnvelope=work.role==='roster_workflow_strategy_decision'&&errors.length>0
    &&errors.every(e=>e.code==='construction_command_schema');
  if(!semanticEnvelope&&!constructionEnvelope&&(!errors.length||errors.some(e=>!['owner_criterion_wire_invalid','schema','semantic_patch_schema','experiment_operation_command_schema','work_order_edit_schema'].includes(e.code)
    ||!e.issues?.length||e.issues.some(i=>!['enum_mismatch','required_field_missing'].includes(i.code)))))return null;
  if(Object.entries(work.bindings??{}).some(([key,value])=>state.scope?.[key]!==value))return null;
  const call=op.calls.at(-1),[request,reply]=await Promise.all([readArtifact(call.requestRef),readArtifact(ref)]);
  const assignment=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  if(assignment?.workId!==work.id||assignment.role!==work.role
    ||Object.entries(work.bindings??{}).some(([key,value])=>assignment.scope?.[key]!==value))return null;
  if(constructionEnvelope){
    const {projectRosterConstructionCommandV1}=await import('./roster-workflow-construction-command-v1.mjs');
    const mapped=projectRosterConstructionCommandV1({request,output:reply.output});
    if(mapped.errors.length||!mapped.projection.some(p=>p.rule==='construction_decision_envelope_v1'||p.rule==='construction_inactive_read_list_v1'||p.rule==='construction_operation_slot_v1'))return null;
    const repairKind='construction_semantic_envelope_v1',revalidationKey=hash({requestRef:call.requestRef,replyRef:ref,repairKind});
    if(work.decisionEnvelopeRecoveryHistory?.some(h=>h.revalidationKey===revalidationKey))return null;
    return {workId:work.id,requestRef:call.requestRef,originalReplyRef:ref,replyRef:ref,repairKind,revalidationKey,
      projection:mapped.projection,providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
  }
  if(semanticEnvelope){
    // Use the SAME full command decoder as first/edit intake, not a second
    // recovery-only mapper. It must accept the entire saved command unchanged
    // semantically before the original role can reconsume it.
    const mapper=request.promptNodes.some(n=>n.kind==='work_order_edit_command')
      ?(await import('./roster-work-order-edit-command-v1.mjs')).projectRosterWorkOrderEditCommandV1
      :request.promptNodes.some(n=>n.kind==='experiment_operation_command')
        ?(await import('./roster-experiment-operation-command-v1.mjs')).projectRosterExperimentOperationCommandV1:null;
    if(!mapper)return null;
    const mapped=mapper({request,output:reply.output});
    if(mapped.errors.length||!mapped.output||!mapped.projection.some(p=>['source_semantic_parameters_unwrapped_v1','inactive_operation_parameters_v1','source_optional_parameter_placeholders_v1','native_finite_action_type_v1'].includes(p.rule)))return null;
    const repairKind='source_semantic_parameter_envelope_v1',revalidationKey=hash({requestRef:call.requestRef,replyRef:ref,repairKind});
    if(work.decisionEnvelopeRecoveryHistory?.some(h=>h.revalidationKey===revalidationKey))return null;
    return {workId:work.id,requestRef:call.requestRef,originalReplyRef:ref,replyRef:ref,repairKind,revalidationKey,
      projection:mapped.projection,providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
  }
  const participants=projectRosterParticipantOptionalFieldsV1({request,output:reply?.output});
  const mapped=projectRosterDecisionEnvelopeV1({request,output:participants.output});
  const projection=[...participants.projection,...mapped.projection];
  if(!projection.length||!validate(request.responseFormat.schema,mapped.output).ok)return null;
  const jsonPath=pointer=>'$'+pointer.split('/').slice(1).map(part=>/^\d+$/.test(part)?'['+part+']':'.'+part.replaceAll('~1','/').replaceAll('~0','~')).join('');
  if(errors.some(e=>e.issues.some(issue=>!projection.some(p=>jsonPath(p.to??p.from)===issue.path))))return null;
  const repairKind=participants.projection.length?'native_optional_participant_fields_v1':'explicit_decision_envelope_v1';
  const revalidationKey=hash({requestRef:call.requestRef,replyRef:ref,repairKind});
  if(work.decisionEnvelopeRecoveryHistory?.some(h=>h.revalidationKey===revalidationKey))return null;
  return {workId:work.id,requestRef:call.requestRef,originalReplyRef:ref,replyRef:ref,
    repairKind,revalidationKey,projection,
    providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
}

// Existing recovery readers keep their exported entry; both now use the same
// exact saved-command eligibility instead of separate per-error schedulers.
export const projectRosterDecisionEnvelopeRecoveryV1=projectRosterCommandEnvelopeRecoveryV1;
