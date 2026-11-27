// A local return is not global release. Share this policy between the scheduler
// and enqueue validator; no model assertion is promoted to a Rules fact here.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {rosterPendingQuestionWorkV1} from './roster-review-data-questions-v1.mjs';
import {rosterSourceReviewRepairStageV1} from './roster-experiment-source-repair-v1.mjs';
import {rosterWorkflowNoProgressReturnV1} from './roster-workflow-graph-v1.mjs';
import {rosterComparisonClosureErrorsV1} from './roster-comparison-closure-v1.mjs';
export async function resolveRosterWorkflowFrontierSettlementV1({state,frontier,response,outcome,result,readArtifact}){
  // This choice belongs to the existing design author/preflight, not a request
  // to reinterpret the unchanged old question as answered.
  if(result?.value?.comparisonDesignHandoff?.kind==='comparison_redesign_requested')return null;
  // The independent closure reviewer owns this request. Returning the same
  // missing measurements to the fact owner would restart the declined study.
  if(result?.value?.comparisonClosureHandoff?.kind==='comparison_closure_requested')return null;
  const decision=result?.value?.decisions?.[0];
  if(outcome?.applied!==false||!['retain','retained'].includes(outcome.status)
    ||!['retain','record_facts'].includes(decision?.disposition))return null;
  // Also protect cold queues made by the previous validator. Read only the
  // original delivered contract; never infer approval, rewrite the paid reply,
  // or impose a comparison on a decision that was not assigned one.
  const call=response.operationState?.calls?.find(c=>c.replyRef===result.value.originalReplyRef);
  if(call?.requestRef){
    const request=await readArtifact(call.requestRef);
    const contract=request.promptNodes?.find(n=>n.kind==='comparison_closure_contract');
    if(rosterComparisonClosureErrorsV1({contract,decision}).some(e=>e.code==='comparison_retention_requires_resolution'))return null;
  }
  const allSettled=decision.requiredData?.length===0&&!rosterPendingQuestionWorkV1(decision).authorDecisions.length;
  const owner=state.work.find(w=>w.id===frontier.investigationOwnerId);
  const ownerValue=owner?.resultRef?(await readArtifact(owner.resultRef)).value:null;
  const control=ownerValue?.coordination;
  const noProgressReturn=response.id===frontier.id?rosterWorkflowNoProgressReturnV1({state,frontier}):null;
  if(response.id!==frontier.id||control?.kind!=='source_interpretation_challenge'){
    if(allSettled&&!noProgressReturn)return {kind:'complete_frontier',sameSourceReviewRequest:null};
    // Returning control is not settling a fact. The experiment explicitly asked
    // for an author choice; deliver the completed choice even when the full Plan
    // still has pending questions. Only the original owner/review can determine
    // whether that choice answers its question. Never silently authorize a new
    // inquiry or use this path to bypass a source-interpretation progress fence.
    const questions=frontier.inputs.investigationFrontier?.value?.unresolvedQuestions;
    const assignedAnswered=questions?.length&&questions.every(question=>{
      const answers=(decision.dataQuestions??[]).filter(item=>item.question===question);
      return answers.length===1&&answers[0].classification==='answered_fact'
        &&answers[0].publicReason?.trim()&&answers[0].evidenceNumbers?.length;
    });
    if(response.id!==frontier.id||decision.nextInvestigation!==null
      ||ownerValue?.experimentConclusion?.status!=='strategy_required'&&!noProgressReturn&&!assignedAnswered
      ||!questions?.length||!allSettled&&!decision.decidedHere?.length&&!assignedAnswered)return null;
    return {kind:'scoped_strategy_response',sameSourceReviewRequest:null,
      scopedStrategyReturn:{version:1,originalGoalId:frontier.investigationFrontierOf,
        originalOwnerId:owner.id,originalResultRef:owner.resultRef,
        strategyResponseId:response.id,strategyResultRef:response.resultRef,
        ...(noProgressReturn?{closedNoProgressMethod:true,stoppedWorkId:noProgressReturn.stoppedWorkId,
          stopReportRef:noProgressReturn.reportRef,investigationReauthorized:false}:{}),
        originalQuestions:structuredClone(questions),factsApproved:false,
        assignedQuestionsReportedAnswered:Boolean(assignedAnswered),globalQuestionsSettled:allSettled,
        questionResolutionGranted:false,parentReviewStillRequired:true,
        instruction:'The author has made an explicit local choice and requested no new investigation. This is a CONTROL RETURN, not approval of the choice or factual closure. Reconcile that choice with your original question and actual sources. A declined measurement is not a completed experiment; an asserted profile equivalence is not a Native proof. Preserve necessary unanswered predicates and the author\'s full pending ledger. If the choice cannot satisfy the original obligation, identify the remaining conflict rather than certifying it. Independent source/question-coverage review and final release remain mandatory; no successful tool is replayed and no review counter is reset.'}};
  }
  // A direct author may request a fresh independent interpretation of the same
  // sources, not waive evidence. Unrelated global unknowns remain in its record.
  if(decision.nextInvestigation!==null||!control.diagnostic?.questions?.length
    ||(owner.experimentReviewRound??0)>=3)return null;
  const scoped=frontier.inputs.investigationFrontier?.value?.unresolvedQuestions??[];
  if(!scoped.length||scoped.some(q=>!control.diagnostic.questions.includes(q)))return null;
  const responses=new Map();
  for(const q of scoped){
    const matches=(decision.dataQuestions??[]).filter(item=>item.question===q);
    if(matches.length!==1||matches[0].classification!=='answered_fact'
      ||!matches[0].publicReason?.trim()||!matches[0].evidenceNumbers?.length)return null;
    if(matches[0].evidenceNumbers.some(n=>!Number.isSafeInteger(n)||!state.evidence[n-1]))return null;
    responses.set(q,matches[0]);
  }
  const inputs=structuredClone(owner.inputs);
  for(const [key,input]of Object.entries(inputs))if((key==='sourceReview'||/^failedSourceClaim\d+$/u.test(key))&&input.source==='evidence'){
    const entry=state.evidence.find(e=>e.id===input.id);if(!entry)return null;
    input.value=await readArtifact(entry.artifactRef);input.evidenceId=entry.id;
  }
  const stage=rosterSourceReviewRepairStageV1(inputs);
  const questions=scoped.map(question=>stage?.necessaryQuestions.find(q=>q.question===question));
  if(questions.some(q=>!q?.origins?.length))return null;
  const requestKey=hash(questions.map(q=>({question:q.question,origins:q.origins})));
  if(state.work.some(w=>w.inputs?.sameSourceReviewRequest?.value?.requestKey===requestKey))return null;
  return {kind:'scoped_source_recheck',sameSourceReviewRequest:{version:1,requestKey,
    origin:'scoped_frontier_response',originalOwnerId:owner.id,originalResultRef:owner.resultRef,
    strategyResponseId:response.id,strategyResultRef:response.resultRef,
    sourceReviewRound:owner.experimentReviewRound??0,factsApproved:false,parentReviewStillRequired:true,
    questions:questions.map(q=>({question:q.question,origins:structuredClone(q.origins),
      requestedInterpretation:structuredClone(responses.get(q.question))})),
    instruction:'The author returned a scoped interpretation dispute using these exact sources. Reconcile the original claim and source citations once, then submit to independent source AND question-coverage review. This only permits reconsidering existing material; it proves no fact, waives no necessary question, authorizes no Native replay, and resets no review counter. Keep unrelated pending questions in their original owner record. If a necessary fact is genuinely absent, preserve it explicitly rather than calling the author\'s interpretation a measurement.'}};
}
