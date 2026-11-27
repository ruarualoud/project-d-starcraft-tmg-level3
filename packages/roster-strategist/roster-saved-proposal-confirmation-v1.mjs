import {isDeepStrictEqual as equal} from 'node:util';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone;
// The proposal was decoded by its ORIGINAL request mapper before source reads.
// This only preserves that exact proposal; ordinary source/compiler/Native checks
// still decide whether it can execute. No target, parameter or result is inferred.
export function rosterSavedProposalConfirmationV1(request){
  const saved=request.strategyRepairState?.savedProposalConfirmation;
  const handoff=saved??request.promptNodes?.find(n=>n.kind==='evidence_delivery_handoff'
    &&n.proposalProjection==='original_request_mapper'&&n.conclusionAccepted===false);
  const proposal=handoff?.pendingProposal;
  const schema=request.strategyRepairState?.originalResponseFormat?.schema??request.responseFormat?.schema;
  if(!handoff?.originalReplyRef||!proposal||proposal.action!=='finish'||!proposal.workOrders?.length
    ||proposal.reads?.length||proposal.catalogueQueries?.length||proposal.conclusion!==null
    ||!schema?.properties?.workOrders||!validate(schema,proposal).ok)return null;
  return {originalReplyRef:handoff.originalReplyRef,sourceRequestRef:handoff.sourceRequestRef,
    pendingProposal:clone(proposal)};
}
export function rosterSavedProposalDisplayV1(saved){
  return {sourceReplyRef:saved.originalReplyRef,readOnly:true,executed:false,approved:false,
    orders:saved.pendingProposal.workOrders.map(order=>({orderId:order.orderId,purpose:order.purpose,
      scenarioAssumptions:clone(order.scenarioAssumptions),completionStepId:order.completionStepId,
      stopAndReturnToModelWhen:order.stopAndReturnToModelWhen,steps:order.steps.map(step=>{
        let args;try{args=JSON.parse(step.argumentsJson);}catch{args=null;}
        if(args&&typeof args==='object'&&!Array.isArray(args)){
          args=Object.fromEntries(Object.entries(args).filter(([key])=>!['stateRef','contextRef','base'].includes(key)));
        }
        return {stepId:step.stepId,operation:step.operation,publicReason:step.publicReason,
          readOnlyArguments:args,sourceStepIds:[...new Set((step.bindings??[]).map(b=>b.fromStepId).filter(Boolean))]};
      })}))};
}
export function projectRosterSavedProposalEchoV1({request,output}){
  const saved=rosterSavedProposalConfirmationV1(request);
  if(!saved||output?.command?.kind!=='submit_work_orders'
    ||Object.keys(output).some(k=>!['publicReason','unresolvedQuestions','command'].includes(k))
    ||Object.keys(output.command).some(k=>!['kind','workOrders'].includes(k)))return null;
  const expected=clone(saved.pendingProposal.workOrders);
  const control=request.promptNodes?.find(n=>n.kind==='experiment_operation_command'&&n.delegatedControlVersion===1)?.delegatedControl;
  if(control){
    if(expected.some(order=>!equal(order.experimentScope,control.experimentScope)))return null;
    for(const order of expected)delete order.experimentScope;
  }
  if(!equal(expected,output.command.workOrders)||!Array.isArray(output.unresolvedQuestions))return null;
  const result={...clone(saved.pendingProposal),publicReason:output.publicReason,
    unresolvedQuestions:[...new Set([...saved.pendingProposal.unresolvedQuestions,...output.unresolvedQuestions])]};
  const schema=request.strategyRepairState?.originalResponseFormat?.schema??request.responseFormat.schema;
  if(!validate(schema,result).ok)return null;
  return {output:result,errors:[],projection:[{rule:'host_saved_proposal_confirmation_v1',
    sourceReplyRef:saved.originalReplyRef,semanticFieldsChanged:false,nativeExecuted:false,
    sourceApproved:false,originalReplyUnchanged:true}]};
}
