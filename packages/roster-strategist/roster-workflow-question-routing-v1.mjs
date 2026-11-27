// Task routing consumes explicit classified obligations, never question-text
// heuristics. A control return is not an LLM reply, a Native receipt or approval.
import {rosterPendingQuestionWorkV1,rosterHasScopedInquiryV1,rosterScopedInquiryPredicatesV1} from './roster-review-data-questions-v1.mjs';
import {rosterSourceReviewRepairStageV1} from './roster-experiment-source-repair-v1.mjs';

// Source and domain reviewers share the SAME question authority. A review
// classifies a concern; it cannot grant an experiment by saying necessary_fact.
function unassignedReviewQuestionReturn(inputs,{facts,authorDecisions,source,stage}){
  const candidates=[inputs.question?.value,
    inputs.localObligation?.value?.assignedTask?.inputs?.question?.value,
    inputs.localObligation?.value?.originalGoal?.inputs?.question?.value];
  const inquiry=candidates.find(rosterHasScopedInquiryV1);
  const authorized=inquiry?rosterScopedInquiryPredicatesV1(inquiry):[];
  const unassigned=facts.filter(q=>!authorized.includes(q.question));
  return unassigned.length?{kind:'review_scope_return',facts:structuredClone(facts),
    authorDecisions:structuredClone(authorDecisions),source,...(stage?{stage}:{}),
    authorizedPredicates:structuredClone(authorized),unassignedQuestions:structuredClone(unassigned)}:null;
}

export function projectRosterWorkflowQuestionRouteV1(inputs={}){
  const stage=rosterSourceReviewRepairStageV1(inputs);
  if(stage?.phase==='missing_fact_investigation'){
    // A review is evidence of a concern, not an author-issued query permit.
    // Exact assigned predicate identities are the only transferable scope;
    // semantic relevance is for the strategic owner, never a Host keyword test.
    const scopeReturn=unassignedReviewQuestionReturn(inputs,{facts:stage.necessaryQuestions,
      authorDecisions:stage.authorDecisions,source:'source_review',stage});
    if(scopeReturn)return scopeReturn;
  }
  if(stage)return {kind:stage.phase==='review_classification_conflict'?'review_conflict':stage.necessaryQuestions?.length?'fact_query'
    :stage.authorDecisions?.length?'author_decision':'source_correction',
    facts:structuredClone(stage.necessaryQuestions??[]),authorDecisions:structuredClone(stage.authorDecisions??[]),
    source:'source_review',stage};
  const issues=inputs.reviewIssues?.value;
  if(Array.isArray(issues)){
    const pending=issues.map(rosterPendingQuestionWorkV1);
    const facts=pending.flatMap(item=>item.facts),authorDecisions=pending.flatMap(item=>item.authorDecisions);
    // Authorship and adequacy are independent. A reviewer can acknowledge the
    // existing choice while requiring its rationale to change. Preserve that
    // explicit classification; do not make it an undeclared choice or a new
    // factual experiment. No prose inference or automatic negative verdict.
    for(const issue of issues){
      if((issue.code??issue.verdict)!=='requires_revision')continue;
      for(const question of issue.dataQuestions??[]){
        if(question.classification!=='authored_choice')continue;
        authorDecisions.push({...structuredClone(question),resolutionRequired:'author_rationale_revision',
          reviewReason:issue.publicReason??null,
          origins:[...structuredClone(question.origins??[]),{workId:issue.workId??null,
            reviewEvidenceId:issue.workId?'role:'+issue.workId:null,checkId:issue.checkId??null,
            verdict:'requires_revision'}]});
      }
    }
    const scopeReturn=unassignedReviewQuestionReturn(inputs,{facts,authorDecisions,source:'domain_review'});
    if(scopeReturn)return scopeReturn;
    return {kind:facts.length?'fact_query':authorDecisions.length?'author_decision':'source_correction',
      facts,authorDecisions,source:'domain_review'};
  }
  const inquiry=inputs.question?.value;
  if(inquiry?.schema==='roster_factual_inquiry_question_v1')return {
    kind:inquiry.necessaryQuestions.length?'fact_query':inquiry.authorDecisions?.length?'author_decision':'no_pending_question',
    facts:inquiry.necessaryQuestions.map(question=>({question})),
    authorDecisions:structuredClone(inquiry.authorDecisions??[]),source:'explicit_decision'};
  return null;
}

export function createRosterWorkflowAuthorDecisionReturnV1({assignment,directory,route}){
  if(assignment.role==='roster_workflow_experiment_planner'&&route?.kind==='review_scope_return'){
    const questions=[...new Set([...route.facts,...route.authorDecisions].map(q=>q.question))];
    const ids=new Set([...route.facts,...route.authorDecisions].flatMap(q=>(q.origins??[]).map(o=>o.reviewEvidenceId)));
    const sources=directory.filter(e=>ids.has(e.id));
    const publicReason='The reviewer introduced a factual question outside the currently delegated predicate identities. Preserve the exact concern and its sources, but return it to the strategic author before any new experiment. This neither rejects its possible relevance nor makes it a new release requirement; the existing question and false/missing claims remain unresolved.';
    return {kind:'proposal',value:{publicReason,workOrders:[],failedWorkOrders:[],unresolvedQuestions:questions,
      experimentConclusion:{status:'strategy_required',answer:publicReason,
        evidenceNumbers:sources.map(e=>e.number),evidenceRefs:sources.map(e=>({id:e.id,artifactRef:e.artifactRef})),
        conditions:['Scope authorization return only; no fact, source claim, strategy or Plan is approved.'],hypothesisAssessments:[],acceptanceGranted:false},
      coordination:{kind:'review_scope_authorization_return',version:1,origin:'deterministic_task_router',
        originalAssignmentWorkId:assignment.workId,ownerRole:'roster_workflow_strategy_decision',
        diagnostic:{code:'review_question_requires_author_scope',questions:structuredClone(route.unassignedQuestions),
          authorizedPredicates:structuredClone(route.authorizedPredicates)},
        newMeasurementRequiredByHost:false,nativeRetryAuthorized:false,factApprovalGranted:false,planApprovalGranted:false},
      modelInterpretationNotRulesTruth:false,acceptanceGranted:false},
      conditions:['Deterministic authority handoff; not a model reply, Native observation or strategic judgment.']};
  }
  if(assignment.role==='roster_workflow_experiment_planner'&&route?.kind==='review_conflict'){
    const conflicts=route.stage.classificationConflicts;
    const questions=[...new Set([...route.facts,...route.authorDecisions,...conflicts].map(item=>item.question))];
    const ids=new Set(conflicts.flatMap(conflict=>conflict.opinions.map(opinion=>opinion.reviewEvidenceId)));
    const sources=directory.filter(entry=>ids.has(entry.id));
    const publicReason='Saved reviewers disagree on the exact question classification. The Host cannot make their strictest opinion a mandatory experiment or waive a real fact. Return both views and the existing author choice/deferral to the strategic owner for explicit scope reconciliation before any new measurement.';
    return {kind:'proposal',value:{publicReason,workOrders:[],failedWorkOrders:[],unresolvedQuestions:questions,
      experimentConclusion:{status:'strategy_required',answer:publicReason,
        evidenceNumbers:sources.map(entry=>entry.number),evidenceRefs:sources.map(entry=>({id:entry.id,artifactRef:entry.artifactRef})),
        conditions:['Review conflict only; no hypothesis, fact, author choice or Plan is approved.'],hypothesisAssessments:[],acceptanceGranted:false},
      coordination:{kind:'source_interpretation_challenge',version:1,origin:'deterministic_task_router',
        originalAssignmentWorkId:assignment.workId,ownerRole:'roster_workflow_strategy_decision',
        diagnostic:{code:'conflicting_review_classifications',questions,conflicts:structuredClone(conflicts)},
        newMeasurementRequiredByHost:false,nativeRetryAuthorized:false,factApprovalGranted:false,planApprovalGranted:false},
      modelInterpretationNotRulesTruth:false,acceptanceGranted:false},
      conditions:['Deterministic routing of conflicting review opinions; not a fabricated model or Native result.']};
  }
  if(assignment.role!=='roster_workflow_experiment_planner'||route?.kind!=='author_decision')return null;
  const questions=route.authorDecisions.map(item=>item.question);
  if(!questions.length||route.facts.length)return null;
  const sourceIds=new Set(route.authorDecisions.flatMap(item=>(item.origins??[]).map(origin=>origin.reviewEvidenceId)));
  const sourceDecision=assignment.inputs.decision?.value?.sourceDecision;
  if(sourceDecision?.evidenceId)sourceIds.add(sourceDecision.evidenceId);
  const sources=directory.filter(entry=>sourceIds.has(entry.id)
    ||sourceDecision?.originalResultRef&&sourceDecision.originalResultRef===entry.artifactRef);
  const publicReason='The explicit classified obligations require the strategic author to decide or revise an existing choice rationale. No factual query can author that reasoning; return the original classifications and reviewer defects unchanged to their owner. This routing does not endorse the reviewer or approve the current Plan.';
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
