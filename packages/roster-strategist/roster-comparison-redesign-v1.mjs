// One explicit control operation, shared by the role and product scheduler.
// A requested redesign is neither a Plan edit nor a completed comparison.
import {isDeepStrictEqual} from 'node:util';
const copy=structuredClone;
const text={type:'string',minLength:1,maxLength:65536};
export const ROSTER_COMPARISON_DESIGN_REQUEST_SCHEMA_V1={anyOf:[{type:'object',properties:{
  reason:text,proposedChange:text,decisionToEnable:text,
  evidenceNumbers:{type:'array',minItems:1,items:{type:'integer',minimum:1,maximum:1000000}},
},required:['reason','proposedChange','decisionToEnable','evidenceNumbers'],additionalProperties:false},{type:'null'}]};
export function rosterComparisonRedesignContractV1(assignment){
  const memory=assignment.inputs?.strategicHypothesisChallenge?.value?.comparisonMemory,design=memory?.design;
  if(assignment.role!=='roster_workflow_strategy_decision'||!design?.workId||!design.resultRef
    ||!Number.isSafeInteger(design.revision)||design.revision<1||!memory.cycleId
    ||memory.status==='stale_dependency'||memory.comparisonResolved)return null;
  return {kind:'comparison_redesign_contract',version:1,cycleId:memory.cycleId,
    purposeWorkId:design.workId,purposeResultRef:design.resultRef,designRevision:design.revision,
    requestChangesDesign:false,requestApprovesFacts:false,
    instruction:'Changing Plan text does NOT change the frozen comparison. If YOU choose to change its arms/scope because of the returned evidence, use comparisonDesignRequest with reason, proposedChange, decisionToEnable and actually read evidenceNumbers. Use disposition=retain, mutation=null, strategicChanges=[], nextInvestigation=null and workflowBlocker=null for this separate control operation. Keep original unresolved facts in dataQuestions; do not call a declined measurement answered. The existing design author receives the request and proposes a replacement with independent preflight before methods execute. No old result is rewritten or approved, and no new design is selected for you. Leave comparisonDesignRequest=null for ordinary Plan/army revision, retention or inquiry. A request is not evidence of strategy improvement.'};
}
export function rosterComparisonRedesignErrorsV1({contract,decision}){
  const request=decision?.comparisonDesignRequest;if(request==null)return [];
  const sources=new Set(decision.evidenceNumbers??[]);
  if(contract?.kind!=='comparison_redesign_contract'||contract.version!==1
    ||decision.disposition!=='retain'||decision.mutation!==null||decision.strategicChanges?.length
    ||decision.nextInvestigation!==null||decision.workflowBlocker!==null||decision.comparisonClosureRequest!=null
    ||!request.reason?.trim()||!request.proposedChange?.trim()||!request.decisionToEnable?.trim()
    ||!request.evidenceNumbers?.length||request.evidenceNumbers.some(n=>!Number.isSafeInteger(n)||!sources.has(n)))
    return [{code:'comparison_redesign_requires_scoped_control_request',
      instruction:contract?.instruction??'No active comparison design is assigned. Keep comparisonDesignRequest=null; do not invent a design identity or amend an unrelated experiment.'}];
  return [];
}
export function projectRosterComparisonDesignHandoffV1({contract,decision,replyRef}){
  if(!decision?.comparisonDesignRequest||!replyRef||rosterComparisonRedesignErrorsV1({contract,decision}).length)return null;
  return {version:1,kind:'comparison_redesign_requested',cycleId:contract.cycleId,
    purposeWorkId:contract.purposeWorkId,purposeResultRef:contract.purposeResultRef,
    designRevision:contract.designRevision,sourceReplyRef:replyRef,request:copy(decision.comparisonDesignRequest),
    designChanged:false,factApprovalGranted:false,planApprovalGranted:false};
}
export async function resolveRosterComparisonDesignRequestV1({state,cycle,readArtifact,authorWorkId=null}){
  if(!cycle?.comparisonPurposeReady||cycle.comparisonResolved
    ||state.work.some(w=>w.status==='running'||w.operationState?.pending))return null;
  const purpose=state.work.find(w=>w.id===cycle.comparisonPurposeWorkId);
  if(!purpose||purpose.resultRef!==cycle.comparisonPurposeResultRef
    ||purpose.strategyComparisonDesignCycleId!==cycle.id)return null;
  for(const author of [...state.work].reverse()){
    if(authorWorkId&&author.id!==authorWorkId)continue;
    if(author.role!=='roster_workflow_strategy_decision'||author.status!=='evidence_ready'
      ||!author.resultRef||!author.draftOutcomeRef
      ||author.draftRevision!==state.draftRevision
      ||['army','rules','map','source','plan'].some(key=>!author.bindings?.[key]||author.bindings[key]!==state.scope[key])
      ||Object.entries(author.bindings??{}).some(([key,value])=>state.scope[key]!==value)
      ||state.work.some(w=>w.comparisonRedesignOf===author.id))continue;
    const result=await readArtifact(author.resultRef),handoff=result?.value?.comparisonDesignHandoff;
    if(handoff?.kind!=='comparison_redesign_requested'||handoff.cycleId!==cycle.id
      ||handoff.purposeWorkId!==purpose.id||handoff.purposeResultRef!==purpose.resultRef
      ||handoff.designRevision!==(purpose.designRevision??1))continue;
    const call=author.operationState?.calls?.find(c=>c.replyRef===result.value.originalReplyRef);
    if(!call?.requestRef)continue;
    const request=await readArtifact(call.requestRef),contract=request.promptNodes?.find(n=>n.kind==='comparison_redesign_contract');
    const decision=result.value.decisions?.length===1?result.value.decisions[0]:null;
    const expected=projectRosterComparisonDesignHandoffV1({contract,decision,replyRef:call.replyRef});
    if(!expected||!isDeepStrictEqual(expected,handoff))continue;
    const outcome=await readArtifact(author.draftOutcomeRef);
    if(outcome.applied!==false||!['retain','retained'].includes(outcome.status)||outcome.acceptanceGranted!==false)continue;
    return {authorWorkId:author.id,authorResultRef:author.resultRef,authorRequestRef:call.requestRef,
      authorReplyRef:call.replyRef,cycleId:cycle.id,purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,
      designRevision:(purpose.designRevision??1)+1,request:copy(handoff.request)};
  }
  return null;
}
