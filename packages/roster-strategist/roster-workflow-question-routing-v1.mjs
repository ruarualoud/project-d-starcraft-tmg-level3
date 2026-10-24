// Task routing consumes explicit classified obligations, never question-text
// heuristics. A control return is not an LLM reply, a Native receipt or approval.
import {rosterPendingQuestionWorkV1} from './roster-review-data-questions-v1.mjs';
import {rosterSourceReviewRepairStageV1} from './roster-experiment-source-repair-v1.mjs';

export function projectRosterWorkflowQuestionRouteV1(inputs={}){
  const stage=rosterSourceReviewRepairStageV1(inputs);
  if(stage)return {kind:stage.necessaryQuestions?.length?'fact_query'
    :stage.authorDecisions?.length?'author_decision':'source_correction',
    facts:structuredClone(stage.necessaryQuestions??[]),authorDecisions:structuredClone(stage.authorDecisions??[]),
    source:'source_review',stage};
  const inquiry=inputs.question?.value;
  if(inquiry?.schema==='roster_factual_inquiry_question_v1')return {
    kind:inquiry.necessaryQuestions.length?'fact_query':inquiry.authorDecisions?.length?'author_decision':'no_pending_question',
    facts:inquiry.necessaryQuestions.map(question=>({question})),
    authorDecisions:structuredClone(inquiry.authorDecisions??[]),source:'explicit_decision'};
  const issues=inputs.reviewIssues?.value;
  if(Array.isArray(issues)){
    const pending=issues.map(rosterPendingQuestionWorkV1);
    const facts=pending.flatMap(item=>item.facts),authorDecisions=pending.flatMap(item=>item.authorDecisions);
    return {kind:facts.length?'fact_query':authorDecisions.length?'author_decision':'source_correction',
      facts,authorDecisions,source:'domain_review'};
  }
  return null;
}

export function createRosterWorkflowAuthorDecisionReturnV1({assignment,directory,route}){
  if(assignment.role!=='roster_workflow_experiment_planner'||route?.kind!=='author_decision')return null;
  const questions=route.authorDecisions.map(item=>item.question);
  if(!questions.length||route.facts.length)return null;
  const sourceIds=new Set(route.authorDecisions.flatMap(item=>(item.origins??[]).map(origin=>origin.reviewEvidenceId)));
  const sourceDecision=assignment.inputs.decision?.value?.sourceDecision;
  if(sourceDecision?.evidenceId)sourceIds.add(sourceDecision.evidenceId);
  const sources=directory.filter(entry=>sourceIds.has(entry.id)
    ||sourceDecision?.originalResultRef&&sourceDecision.originalResultRef===entry.artifactRef);
  const publicReason='The explicit classified obligations require the strategic author’s decision. No factual query can author these choices; return them unchanged to their owner.';
  return {kind:'proposal',value:{publicReason,workOrders:[],failedWorkOrders:[],
    unresolvedQuestions:structuredClone(questions),experimentConclusion:{status:'strategy_required',
      answer:publicReason,evidenceNumbers:sources.map(entry=>entry.number),
      evidenceRefs:sources.map(entry=>({id:entry.id,artifactRef:entry.artifactRef})),
      conditions:['Routing only: no question, measured fact, comparison or Plan is approved.'],
      hypothesisAssessments:[],acceptanceGranted:false},
    coordination:{kind:'author_decision_return',version:1,origin:'deterministic_task_router',
      source:route.source,questions:structuredClone(route.authorDecisions),ownerRole:'roster_workflow_strategy_decision',
      originalAssignmentWorkId:assignment.workId,factApprovalGranted:false,planApprovalGranted:false,
      sourceClassificationIsModelOwned:true,hostAuthoredPlanValues:false},
    modelInterpretationNotRulesTruth:false,acceptanceGranted:false},
    conditions:['Explicit control transfer, not a fabricated model or tool result.']};
}
