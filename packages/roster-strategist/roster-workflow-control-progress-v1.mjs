// A closed investigation may preserve an unanswered fact; it cannot silently
// bounce that same decision back to its author for another paid iteration.
import {isDeepStrictEqual} from 'node:util';
import {projectRosterIncomingAuthorContextV1} from './roster-workflow-strategy-owner-context-v1.mjs';

export function rosterClosedMethodReturnsControlV1({inputs,output}){
  const control=inputs?.scopedStrategyReturn?.value;
  return control?.closedNoProgressMethod===true&&control.investigationReauthorized===false
    &&output?.action==='conclude'&&output.conclusion?.status==='strategy_required'
    &&Array.isArray(output.workOrders)&&output.workOrders.length===0
    &&!(output.reads?.length||output.catalogueQueries?.length);
}

// Also protect already-saved old-version conclusions whose successor was
// queued before this guard existed. No migration, rewritten reply or new call.
export async function rosterQueuedClosedMethodReturnV1({state,work,readArtifact}){
  if(work.role!=='roster_workflow_strategy_decision'||!work.investigationOwnerId)return null;
  const owner=state.work.find(w=>w.id===work.investigationOwnerId);
  if(owner?.status!=='evidence_ready'||!owner.resultRef||owner.operationState?.pending
    ||owner.experimentGoalId!==work.investigationFrontierOf
    ||!isDeepStrictEqual(owner.bindings,work.bindings))return null;
  const control=owner.inputs?.scopedStrategyReturn?.value;
  if(!control?.closedNoProgressMethod||control.investigationReauthorized!==false)return null;
  const previous=state.work.find(w=>w.id===control.strategyResponseId);
  if(previous?.resultRef!==control.strategyResultRef
    ||!isDeepStrictEqual(previous.bindings,work.bindings))return null;
  const result=await readArtifact(owner.resultRef);
  if(!rosterClosedMethodReturnsControlV1({inputs:owner.inputs,output:{action:'conclude',
    workOrders:result.value?.workOrders,conclusion:result.value?.experimentConclusion}}))return null;
  return {version:1,reason:'closed_method_returns_to_same_owner',workId:work.id,
    returnedOwnerId:owner.id,returnedResultRef:owner.resultRef,
    previousDecisionId:previous.id,previousDecisionResultRef:previous.resultRef,
    unresolvedQuestions:structuredClone(result.value.unresolvedQuestions??[]),
    automaticRetry:false,acceptanceGranted:false,historyReset:false,
    instruction:'The author already declined reauthorization and the closed method still requires that decision. Stop this control cycle; preserve the unanswered predicates and original records. Repair the decision/obligation boundary before an explicit new authorization. Do not replay the method or ask the same author again unchanged.'};
}

// A concrete missing input contract can be repaired before the already queued
// successor is issued. This is NOT another retry grant or a replacement Plan.
// The paid source must actually lack the currently reproducible owner contract.
export async function projectRosterStoppedOwnerDeliveryRepairV1({state,work,readArtifact}){
  const stop=await rosterQueuedClosedMethodReturnV1({state,work,readArtifact});
  if(!stop||work.operationState?.pending)return null;
  const prior=state.work.find(w=>w.id===stop.previousDecisionId);
  if(prior?.draftRevision!==state.draftRevision||!isDeepStrictEqual(prior.bindings,state.scope)
    ||prior.operationState?.pending||!prior.operationState?.calls?.length)return null;
  const sources=[];let control;
  for(const call of prior.operationState.calls){
    const request=await readArtifact(call.requestRef);
    if(request.promptNodes?.some(n=>n.kind==='strategy_owner_assignment'||n.kind==='strategy_author_handoff'))return null;
    const assignment=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment'&&n.workId===prior.id);
    const projected=projectRosterIncomingAuthorContextV1(assignment);
    if(projected?.node.returnKind!=='repeated_inspection_only_batch'||!projected.node.noProgressControl)return null;
    if(control&&!isDeepStrictEqual(control,projected.node.noProgressControl))return null;
    control=projected.node.noProgressControl;sources.push({requestRef:call.requestRef,replyRef:call.replyRef});
  }
  return {version:1,sourceContract:'strategy_owner_assignment',workId:work.id,
    draftRevision:state.draftRevision,bindings:structuredClone(work.bindings),stop,
    sourceWorkId:prior.id,sourceResultRef:prior.resultRef,sourceCalls:sources,
    noProgressControl:control,historyReset:false,nativeReplayed:false,factsApproved:false,planApproved:false,
    instruction:'This unissued owner receives a concrete missing-role delivery repair, not permission to reconfirm the old method. The preserved paid decisions did not receive the unified owner/history separation. Reconcile the exact unanswered predicates with the CURRENT adopted Plan. Preserve missing facts; a conditional target or author choice is not an observed/earliest arrival result. Use structured Plan revision, a genuinely different bounded inquiry, or explain and stop an unresolved conflict. No unchanged loop, automatic approval, deleted obligation or entire-match simulation.'};
}

export async function rosterVerifiedOwnerDeliveryRepairV1({state,work,readArtifact}){
  if(!work.ownerDeliveryRepairRef||work.inputs?.ownerDeliveryRepair?.source!=='literal')return false;
  const record=await readArtifact(work.ownerDeliveryRepairRef);
  // The saved explicit command, actual old request and current full input are
  // all required. A model-produced repair-looking field grants no authority.
  const proof=await projectRosterStoppedOwnerDeliveryRepairV1({state,work,readArtifact});
  return !!proof&&record.kind==='owner_delivery_repair'&&record.workId===work.id
    &&isDeepStrictEqual(record.proof,proof)&&isDeepStrictEqual(record.inputs,work.inputs)
    &&isDeepStrictEqual(work.inputs.ownerDeliveryRepair.value,proof);
}
