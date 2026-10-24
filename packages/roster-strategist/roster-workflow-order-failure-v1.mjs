// Compiler diagnostics are control data, not model-authored facts. Preserve the
// classification at the Provider -> compiler -> scheduler -> owner boundary.
import {isDeepStrictEqual} from 'node:util';

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
export function isRosterWorkOrderCapabilityReturnV1(failure,options){
  if(isDelegationBoundary(failure,options))return true;
  const repair=failure?.error?.queryRepair;
  return failure?.error?.dispatchOutcome==='not_dispatched'
    &&repair?.correctable===false&&repair.controlReturn===true
    &&repair.failureClass==='capability_unavailable'
    &&repair.resolutionRequired==='method_or_scope_decision';
}
export function createRosterWorkOrderCapabilityReturnV1({assignment,directory}){
  const returned=assignment.inputs.orderFailureReturn?.value;
  if(assignment.role!=='roster_workflow_experiment_planner'||!returned)return null;
  const exhaustedLocalRepair=Number.isSafeInteger(returned.localRepair?.generation)
    &&Number.isSafeInteger(returned.localRepair?.limit)&&returned.localRepair.limit>=0
    &&returned.localRepair.generation>returned.localRepair.limit;
  if(returned.version!==1||!isRosterWorkOrderCapabilityReturnV1(returned.failure,{exhaustedLocalRepair}))
    throw Error('ROSTER_WORK_ORDER_CAPABILITY_RETURN_INVALID');
  const source=directory.find(e=>e.id===`role:${returned.sourceWorkId}`);
  const delegation=isDelegationBoundary(returned.failure,{exhaustedLocalRepair});
  const question=delegation?`Method authorization required: ${returned.failure.error.detail.operation}`
    :`Unavailable experimental capability: ${returned.failure.error.code}`;
  const postCompletion=delegation&&returned.failure.error.detail.issue==='work_after_delegated_completion';
  const publicReason=postCompletion
    ?'The local method repair window is exhausted. The compiler rejected an operation AFTER this child\'s delegated completion; the operation itself exists, but its downstream placement belongs to the parent method. Return the complete unchanged proposal and precise boundary to the original owner for an explicit method decision. Do not execute a valid prefix, silently delete the tail, approve the proposed geometry, reset local attempts, or treat this as missing tool capability. Existing parent-owned successor work remains pending.'
    :delegation
    ?'The compiler rejected an operation outside this child role\'s delegated method before dispatch. The tool is not thereby unavailable or authorized. Return the unchanged proposed order, current permission and original objective to the owner: authorize an appropriate bounded method, choose another method, or leave the question unresolved. Do not remove a required scene transition or treat a solver candidate as an applied scene.'
    :'The compiler explicitly rejected this measurement as unsupported before dispatch. Return the original objective and diagnostic to its strategic owner; parameter correction cannot supply the missing capability.';
  return {kind:'proposal',value:{publicReason,workOrders:[],failedWorkOrders:[],
    unresolvedQuestions:[question],experimentConclusion:{status:'blocked',answer:publicReason,
      evidenceNumbers:source?[source.number]:[],
      evidenceRefs:source?[{id:source.id,artifactRef:source.artifactRef}]:[],
      conditions:['No experiment executed; no fact, hypothesis, Plan or strategy approved.'],
      hypothesisAssessments:[],acceptanceGranted:false},
    coordination:{kind:delegation?'work_order_delegation_return':'work_order_capability_return',version:1,origin:'deterministic_compiler_router',
      sourceWorkId:returned.sourceWorkId,sourceResultRef:returned.sourceResultRef,
      failure:structuredClone(returned.failure),ownerRole:'roster_workflow_strategy_decision',
      ...(postCompletion?{localRepair:structuredClone(returned.localRepair),localRetryAuthorized:false}:{}),
      originalAssignmentWorkId:assignment.workId,factApprovalGranted:false,planApprovalGranted:false,
      hostAuthoredPlanValues:false,nativeRetryAuthorized:false},
    modelInterpretationNotRulesTruth:false,acceptanceGranted:false},
    conditions:['Explicit compiler control return, not a model reply or successful tool receipt.']};
}
