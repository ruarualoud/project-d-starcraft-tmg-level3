// Compiler diagnostics are control data, not model-authored facts. Preserve the
// classification at the Provider -> compiler -> scheduler -> owner boundary.
import {isDeepStrictEqual} from 'node:util';
import {validateRosterParticipantConfigurationsV1} from './roster-participant-configuration-v1.mjs';
import {projectPregameSceneProjectionFailureV1} from './pregame-scene-projection-v1.mjs';
import {isRosterComparisonSceneDesignFailureV1} from './roster-comparison-scene-contract-v1.mjs';
import {isRosterBuilderAuthorFailureReturnV1,projectRosterBuilderAuthorFailureV1} from './roster-builder-inquiry-v1.mjs';

// The incremental repair role owns steps, NOT the retained experiment scope.
// Re-run only the pure source validator to identify that precise ownership
// boundary. A similarly named error inside step arguments does not qualify.
export function isRosterImmutableScopeReturnV1(failure){
  const error=failure?.error,units=failure?.order?.experimentScope?.participantConfigurations;
  if(error?.dispatchOutcome!=='not_dispatched'||error.code!=='ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_SHAPE'
    ||error.queryRepair?.sourceContract!=='roster_participant_configuration_v1'||units===undefined)return false;
  try{validateRosterParticipantConfigurationsV1(units);}catch(actual){
    return actual.code===error.code&&isDeepStrictEqual(actual.detail,error.detail);
  }
  return false;
}

// A compile-repair child has the previous rejected method as an explicit input.
// Prose edits or changes to an unrelated step cannot fix an unchanged forbidden
// downstream operation. Compare compiler-owned diagnostics, not model rationale.
export function rosterRepeatedWorkOrderFailureV1({task,failures}){
  const previous={order:task?.failedOrder,error:task?.error};
  if(previous.error?.dispatchOutcome!=='not_dispatched'||!previous.order?.steps?.length)return null;
  const semanticStep=step=>{
    if(!step)return null;
    let args;try{args=JSON.parse(step.argumentsJson);}catch{args=step.argumentsJson;}
    return {stepId:step.stepId,operation:step.operation,args,bindings:step.bindings??[],guards:step.guards??[]};
  };
  for(const failure of failures??[]){
    if(isRosterImmutableScopeReturnV1(failure))continue; // owner handoff, never another parameter retry
    if(!isDeepStrictEqual(previous.error,failure.error))continue;
    const detail=failure.error.detail;
    const unchangedOrder=isDeepStrictEqual(previous.order.steps.map(semanticStep),failure.order.steps.map(semanticStep))
      &&previous.order.completionStepId===failure.order.completionStepId;
    const unchangedBoundary=failure.error.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED'
      &&detail?.issue==='work_after_delegated_completion'
      &&isDeepStrictEqual(semanticStep(previous.order.steps.find(s=>s.stepId===detail.stepId)),
        semanticStep(failure.order.steps.find(s=>s.stepId===detail.stepId)));
    if(unchangedOrder||unchangedBoundary)return {code:'unchanged_compiler_rejection',
      failureCode:failure.error.code,stepId:detail?.stepId??null,issue:detail?.issue??null,
      previousFailure:structuredClone(previous),repeatedFailure:structuredClone(failure),
      nativeExecuted:false,automaticRetry:false};
  }
  return null;
}
export function serializeRosterWorkOrderFailureV1(error){
  return {code:error.code||error.message,detail:structuredClone(error.detail??null),
    ...(error.queryRepair?{queryRepair:structuredClone(error.queryRepair)}:{}),
    ...(error.dispatchOutcome?{dispatchOutcome:error.dispatchOutcome}:{})};
}
// A tool can exist but be outside this child's delegated method. This is not a
// malformed argument or a globally missing capability. Recognize the saved
// compiler refusal too, without rewriting the immutable model reply.
function isDelegationBoundary(failure,{exhaustedLocalRepair=false}={}){
  const error=failure?.error,detail=error?.detail,contract=detail?.choiceContract;
  const index=failure?.order?.steps?.findIndex(step=>step.stepId===detail?.stepId&&step.operation===detail?.operation)??-1;
  const afterCompletion=exhaustedLocalRepair&&detail?.issue==='work_after_delegated_completion'
    &&detail.operationAllowed===true&&index>0&&contract?.allowedOperations?.includes(detail.operation)
    &&failure.order.steps.slice(0,index).some(step=>step.operation===contract.operation);
  return error?.dispatchOutcome==='not_dispatched'
    &&error.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED'
    &&(detail?.issue==='operation_not_delegated'&&detail.operationAllowed===false||afterCompletion)
    &&contract?.schema==='roster_workflow_choice_contract_v1'
    &&typeof contract.targetWorkId==='string'&&contract.targetWorkId.length>0
    &&Array.isArray(contract.allowedOperations)
    &&failure.order?.steps?.some(step=>step.stepId===detail.stepId&&step.operation===detail.operation)===true;
}
// Retained public name for existing consumers: both cases return control, but
// their distinct coordination kinds keep permission and capability separate.
function isDesignBoundary(failure){
  if(isRosterComparisonSceneDesignFailureV1(failure))return true;
  const error=failure?.error,repair=error?.queryRepair;
  return error?.dispatchOutcome==='not_dispatched'
    &&repair?.sourceContract==='roster_comparison_participants_v2'
    &&repair.correctable===false&&repair.controlReturn===true&&repair.nativeExecuted===false
    &&repair.failureClass==='comparison_design_required'&&repair.resolutionRequired==='comparison_design_decision'
    &&(error.code==='ROSTER_COMPARISON_BINDING_INVALID'&&error.detail?.reason==='purpose_participants_required'
      ||error.code==='ROSTER_EXPERIMENT_PURPOSE_PARTICIPANTS_REQUIRED');
}
function isSceneEnvironmentBoundary(failure){
  const error=failure?.error,repair=error?.queryRepair;
  return error?.code==='PREGAME_LAB_SCENE_PROJECTION_ENVIRONMENT_MISMATCH'
    &&error.dispatchOutcome==='not_dispatched'&&repair?.sourceContract==='pregame_scene_environment_v1'
    &&repair.correctable===false&&repair.controlReturn===true&&repair.projectionExecuted===false
    &&repair.failureClass==='scene_environment_mismatch'&&repair.resolutionRequired==='method_or_scope_decision'
    &&error.detail?.fields?.length>0&&isDeepStrictEqual(error.detail.fields,repair.environmentFields);
}
export function isRosterBoundedObservationReturnV1(failure){
  const error=failure?.error,repair=error?.queryRepair;
  return error?.dispatchOutcome==='completed_unresolved'
    &&repair?.sourceContract==='pregame_temporal_completed_observation_v1'
    &&repair.correctable===false&&repair.controlReturn===true
    &&repair.failureClass==='bounded_observation'&&repair.completedSearchObservation===true
    &&repair.reasonCode==='bounded_search_no_witness'
    &&repair.outcomeDiagnostics?.outcome==='bounded_search_no_witness'
    &&repair.outcomeDiagnostics.originalQuestionAnswered===false
    &&repair.nativeRetryAuthorized===false;
}
export function isRosterWorkOrderCapabilityReturnV1(failure,options){
  if(isRosterBoundedObservationReturnV1(failure))return true;
  if(isRosterBuilderAuthorFailureReturnV1(failure))return true;
  if(isRosterImmutableScopeReturnV1(failure))return true;
  if(isDelegationBoundary(failure,options)||isDesignBoundary(failure)||isSceneEnvironmentBoundary(failure))return true;
  const repair=failure?.error?.queryRepair;
  return failure?.error?.dispatchOutcome==='not_dispatched'
    &&repair?.correctable===false&&repair.controlReturn===true
    &&repair.failureClass==='capability_unavailable'
    &&repair.resolutionRequired==='method_or_scope_decision';
}
// A child queued before a source-contract update may still contain generic
// parameter advice. Reclassify from the immutable failed tool, before its FIRST
// paid call, not from model prose and not by mutating the queued checkpoint.
export async function projectRosterQueuedEnvironmentReturnV1({assignment,state,directory,readArtifact}){
  if(assignment.role!=='roster_workflow_experiment_planner'||assignment.inputs.orderFailureReturn)return null;
  const child=state.work.find(w=>w.id===assignment.workId);
  if(child?.operationState?.pending||child?.operationState?.calls?.length)return null;
  // Existing unissued correction-of-correction retains explicit ancestry.
  // Follow those links, never a name-prefix guess or arbitrary old failure.
  let cursor=child,source=null;const visited=new Set();
  while(cursor&&!visited.has(cursor.id)){
    visited.add(cursor.id);const parent=cursor.repairOf??cursor.orderRepairOf;
    cursor=state.work.find(w=>w.id===parent);
    if(cursor?.role==='roster_workflow_tool'){source=cursor;break;}
  }
  if(!source?.resultRef||source.role!=='roster_workflow_tool'||source.branchReturnRef
    ||!Object.entries(source.bindings??{}).every(([k,v])=>state.scope[k]===v))return null;
  const failed=await readArtifact(source.resultRef),value=failed?.value;
  const candidate=value&&projectRosterBuilderAuthorFailureV1({request:source.inputs.request.value,failure:value});
  const queryRepair=candidate??(value&&projectPregameSceneProjectionFailureV1(value));
  if(!queryRepair)return null;
  const sourceId=`tool-attempt:${source.id}:${source.resultRef}`;
  if(!directory.some(e=>e.id===sourceId&&e.validity==='current'))return null;
  const failure={order:null,originalRequest:structuredClone(source.inputs.request.value),error:{code:value.code,
    detail:structuredClone(value.detail),queryRepair,
    dispatchOutcome:candidate?.failureClass==='author_candidate_baseline_illegal'?'completed_illegal_baseline':'not_dispatched'},
    ...(candidate?.failureClass==='author_candidate_baseline_illegal'?{observedToolFailure:structuredClone(value)}:{})};
  return createRosterWorkOrderCapabilityReturnV1({assignment:{...assignment,inputs:{...assignment.inputs,
    orderFailureReturn:{source:'literal',value:{version:1,sourceKind:'tool',sourceWorkId:source.id,
      sourceResultRef:source.resultRef,failure}}}},directory});
}
export function createRosterWorkOrderCapabilityReturnV1({assignment,directory}){
  const returned=assignment.inputs.orderFailureReturn?.value;
  if(assignment.role!=='roster_workflow_experiment_planner'||!returned)return null;
  const exhaustedLocalRepair=Number.isSafeInteger(returned.localRepair?.generation)
    &&Number.isSafeInteger(returned.localRepair?.limit)&&returned.localRepair.limit>=0
    &&returned.localRepair.generation>returned.localRepair.limit;
  if(returned.version!==1||!isRosterWorkOrderCapabilityReturnV1(returned.failure,{exhaustedLocalRepair}))
    throw Error('ROSTER_WORK_ORDER_CAPABILITY_RETURN_INVALID');
  const sourceId=returned.sourceKind==='tool'
    ?`tool-attempt:${returned.sourceWorkId}:${returned.sourceResultRef}`:`role:${returned.sourceWorkId}`;
  const source=directory.find(e=>e.id===sourceId);
  const bounded=isRosterBoundedObservationReturnV1(returned.failure);
  const design=isDesignBoundary(returned.failure);
  const scope=isRosterImmutableScopeReturnV1(returned.failure);
  const environment=isSceneEnvironmentBoundary(returned.failure);
  const candidate=isRosterBuilderAuthorFailureReturnV1(returned.failure);
  const delegation=isDelegationBoundary(returned.failure,{exhaustedLocalRepair});
  const question=bounded?'The completed bounded search did not establish the declared joint arrival/control; its owner must decide how this limited evidence affects the conditional Plan'
    :candidate?`The author-selected candidate delta is invalid: ${returned.failure.error.code}; its strategic author must explicitly correct the baseline or edits`
    :environment?`Reference and target environments differ: ${returned.failure.error.detail.fields.join(', ')}; the method owner must explicitly align the experimental premises`
    :scope?'The retained experiment scope has an invalid participant selection; only its owner may revise it'
    :design?'Original comparison design must explicitly declare both arms’ participating own/enemy configurations'
    :delegation?`Method authorization required: ${returned.failure.error.detail.operation}`
    :`Unavailable experimental capability: ${returned.failure.error.code}`;
  const postCompletion=delegation&&returned.failure.error.detail.issue==='work_after_delegated_completion';
  const publicReason=bounded||environment||candidate?returned.failure.error.queryRepair.instruction:scope
    ?'The source validator rejected participantConfigurations in the retained experimentScope before any Native action. The local correction interface can edit steps but cannot amend that scope; changing scenario arguments cannot repair this error. Return the exact original question, invalid scope and diagnostic to its owner for an explicit source-backed scope revision or another justified decision. Do not copy actual selections automatically, change the frozen opponent, treat missing configuration as unavailable Rules, or approve the unexecuted measurement. Keep successful evidence and all pending predicates.'
    :design
    ?'The original comparison has no explicit two-arm participant contract. This cannot be repaired by a method choosing the current enemy or relabelling old measurements. Return the unchanged purpose, request and actual source diagnostic to the strategic/design owner for an explicit comparisonDesignRequest. Keep every old result in its original scope; no measurement, roster/Plan approval or automatic retry is granted.'
    :postCompletion
    ?'The local method repair window is exhausted. The compiler rejected an operation AFTER this child\'s delegated completion; the operation itself exists, but its downstream placement belongs to the parent method. Return the complete unchanged proposal and precise boundary to the original owner for an explicit method decision. Do not execute a valid prefix, silently delete the tail, approve the proposed geometry, reset local attempts, or treat this as missing tool capability. Existing parent-owned successor work remains pending.'
    :delegation
    ?'The compiler rejected an operation outside this child role\'s delegated method before dispatch. The tool is not thereby unavailable or authorized. Return the unchanged proposed order, current permission and original objective to the owner: authorize an appropriate bounded method, choose another method, or leave the question unresolved. Do not remove a required scene transition or treat a solver candidate as an applied scene.'
    :'The compiler explicitly rejected this measurement as unsupported before dispatch. Return the original objective and diagnostic to its strategic owner; parameter correction cannot supply the missing capability.';
  return {kind:'proposal',value:{publicReason,workOrders:[],failedWorkOrders:[],
    unresolvedQuestions:[question],experimentConclusion:{status:bounded||design||scope||environment||candidate?'strategy_required':'blocked',answer:publicReason,
      evidenceNumbers:source?[source.number]:[],
      evidenceRefs:source?[{id:source.id,artifactRef:source.artifactRef}]:[],
      conditions:[bounded?'The bounded search executed; its Native unknown, diagnostics and limits remain unchanged. No negative reachability, future control or Plan approval.':environment?'The projection did not execute. Any saved legal candidate audit remains reusable; no combat result, hypothesis, Plan or strategy approved.':'No experiment executed; no fact, hypothesis, Plan or strategy approved.'],
      hypothesisAssessments:[],acceptanceGranted:false},
    coordination:{kind:bounded?'bounded_observation_return':candidate?'author_candidate_input_return':scope||environment?'work_order_scope_return':design?'work_order_design_return':delegation?'work_order_delegation_return':'work_order_capability_return',version:1,origin:bounded?'deterministic_tool_result_router':'deterministic_compiler_router',
      sourceWorkId:returned.sourceWorkId,sourceResultRef:returned.sourceResultRef,
      failure:structuredClone(returned.failure),ownerRole:'roster_workflow_strategy_decision',
      ...(postCompletion?{localRepair:structuredClone(returned.localRepair),localRetryAuthorized:false}:{}),
      originalAssignmentWorkId:assignment.workId,factApprovalGranted:false,planApprovalGranted:false,
      hostAuthoredPlanValues:false,nativeRetryAuthorized:false},
    modelInterpretationNotRulesTruth:false,acceptanceGranted:false},
    conditions:[bounded?'Source-owned completed bounded observation returned to its owner; not a model answer or reachability proof.':'Explicit compiler control return, not a model reply or successful tool receipt.']};
}
