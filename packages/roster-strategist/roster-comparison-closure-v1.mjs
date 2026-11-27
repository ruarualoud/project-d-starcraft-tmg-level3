// A strategic choice may end an OPTIONAL experiment, not manufacture its facts.
// One contract is consumed by the model role, product scheduler and core closure.
import {assessRosterInitialRetentionV1} from './roster-initial-retention-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {createRosterWorkflowGraphV1,currentRosterComparisonPurposeV1} from './roster-workflow-graph-v1.mjs';
import {rosterReviewCheckPassedV1} from './roster-review-data-questions-v1.mjs';
import {projectRosterMeasuredComparisonMeaningV1} from './roster-measured-comparison-v1.mjs';
import {compileRosterComparisonPremisesV1,assessRosterComparisonPremisesV1} from './roster-comparison-premises-v1.mjs';
import {isRosterWorkflowNonRevisionOutcomeV1,isRosterWorkflowUnchangedRevisionOutcomeV1} from './roster-workflow-decision-records-v1.mjs';
const copy=structuredClone;
const text={type:'string',minLength:1,maxLength:65536};
const numbers={type:'array',minItems:1,items:{type:'integer',minimum:1,maximum:1000000}};
const nonemptyTexts={type:'array',minItems:1,items:text};
const deferredProperties={kind:{...text,enum:['defer_unresolved']},
  questionNumbers:numbers,evidenceNumbers:numbers,selectedOption:text,declinedAlternative:text,decisionBasis:text,
  whyDeferred:text,unverifiedClaims:nonemptyTexts,conditions:nonemptyTexts,reopenWhen:text,
  followupObservation:{type:'object',additionalProperties:false,
    properties:{scenario:text,metric:text,contrastingResults:text,decisionRelevance:text},
    required:['scenario','metric','contrastingResults','decisionRelevance']}};
export const ROSTER_DEFERRED_COMPARISON_POLICY_V1='A strategy experiment may be inconclusive or poorly discriminating without blocking the product forever. The author may explicitly choose kind=defer_unresolved: keep a provisional choice, name its actual basis and risk, why further offline measurement is not worthwhile now, the unanswered hypothesis, conditions, a useful future observation and reopen trigger. The unknown MAY change that choice later. No proof of superiority, no proof that missing evidence cannot matter, and no mandatory new measurement are needed to defer. This closes only scheduling, NOT the hypothesis or factual questions. Required Rules/legality/payment/reachability predicates used as facts and known calculation/source errors cannot be deferred as strategy. Unsupported claims currently asserted as facts in Plan must be corrected or qualified. Review the honesty and consistency of the provisional choice; do not demand another whole-Plan rewrite merely to duplicate uncertainty already carried by the closure asset. Future comparison must use genuinely new evidence, conditions, dependency versions or an explicit new decision, not restart the same unanswered query.';
export const isRosterDeferredComparisonV1=request=>request?.kind==='defer_unresolved';
export const rosterComparisonResolutionKindV1=request=>isRosterDeferredComparisonV1(request)?'reviewed_deferred_hypothesis':'reviewed_optional_retention';
export const ROSTER_COMPARISON_CLOSURE_REQUEST_SCHEMA_V1={anyOf:[{anyOf:[{type:'object',additionalProperties:false,
  properties:{kind:{...text,enum:['retain_scoped']},questionNumbers:numbers,evidenceNumbers:numbers,selectedOption:text,declinedAlternative:text,
    decisionBasis:text,whyNoFurtherEvidenceNeeded:text,unverifiedClaims:{type:'array',minItems:0,items:text},
    conditions:{type:'array',minItems:0,items:text},reopenWhen:text},
  required:['kind','questionNumbers','evidenceNumbers','selectedOption','declinedAlternative','decisionBasis',
    'whyNoFurtherEvidenceNeeded','unverifiedClaims','conditions','reopenWhen']},
  {type:'object',additionalProperties:false,properties:deferredProperties,required:Object.keys(deferredProperties)}]},{type:'null'}]};
export const ROSTER_COMPARISON_CLOSURE_OBLIGATIONS_V1=[
  {checkId:'retention_tradeoff',criterion:'Does the author make a concrete choice over the stated alternative using actual evidence about relevant benefits, costs and counterplay? Full budget does not prove replacement impossible: account for displaced units/upgrades and opportunity cost. Do not accept snapshot fixed, already full, longer prose or unsupported preference as the reason. Do not demand global optimality or force a roster replacement.'},
  {checkId:'adopted_claims_supported',criterion:'Read the CURRENT Plan and actual sources for the claims USED TO JUSTIFY THIS RETENTION DECISION. Verify exact measured configurations, subject-minus-reference direction, threshold and actually committed corrections. A failure for one candidate proves only that candidate was rejected, not all replacements impossible. Unmeasured alternatives stay unmeasured. Contradictory arithmetic or an unsupported premise relied on by this local decision blocks closure. Do not copy unrelated global Plan questions into every local check; they stay pending for their owners. State the specific local dependency for any new necessary_fact.'},
  {checkId:'optional_scope_closed',criterion:'Account for the original purpose and every selected closure question: which observations exist, which remain unmeasured, and why the author can choose to end THIS optional comparison nonetheless. This is NOT measurement-completion or whole-Plan acceptance; do not require declined measurements just because the original experiment promised them. A necessary predicate actually relied on by the retained local choice still blocks. Preserve untested claims, applicability and a concrete reopen condition; other global obligations remain pending. No requirement of a replacement, global optimality, combined volley or played match unless that is a premise of the claimed local choice.'},
];

// Cold-queued reviews and their author returns must use the SAME scope. Their
// immutable old task/results remain untouched. In particular comparisonPurpose
// alone must not route a decision-to-stop review into experiment completion.
export async function projectRosterComparisonAdjudicationAssignmentV1({assignment,state,readArtifact}){
  const input=assignment.inputs?.comparisonClosureReview;
  const reference=input?.evidenceId??input?.id;
  const review=assignment.role==='roster_workflow_final_review'
    &&assignment.inputs?.review?.value?.domainId==='comparison_closure'
    ?state.work.find(w=>w.id===assignment.workId)
    :assignment.role==='roster_workflow_strategy_decision'&&reference?.startsWith('role:')
      ?state.work.find(w=>w.id===reference.slice(5)):null;
  const scope=review?.inputs?.closureScope?.value;
  if(!scope||review.comparisonClosureOf!==scope.authorWorkId
    ||review.comparisonClosureResultRef!==scope.authorResultRef
    ||review.draftRevision!==state.draftRevision
    ||!Object.entries(review.bindings??{}).every(([k,v])=>state.scope[k]===v))return assignment;
  const authored=await readArtifact(scope.authorResultRef),decision=authored.value?.decisions?.[0];
  if(authored.value?.comparisonClosureHandoff?.sourceReplyRef!==authored.value?.originalReplyRef)return assignment;
  const selected=new Set(scope.questions.map(q=>q.question)),comparisons=[];
  for(const evidenceNumber of new Set(scope.request.evidenceNumbers)){
    const entry=state.evidence[evidenceNumber-1];if(!entry)continue;
    const raw=await readArtifact(entry.artifactRef),body=raw.kind==='tool_receipt'?raw.value:raw;
    const meaning=projectRosterMeasuredComparisonMeaningV1(body.receipt);
    if(meaning)comparisons.push({evidenceNumber,evidenceId:entry.id,artifactRef:entry.artifactRef,
      sourceCurrent:Object.entries(entry.bindings??{}).every(([k,v])=>state.scope[k]===v),
      meaning,bodyReadGranted:false,interpretationApproved:false});
  }
  const boundary={kind:'comparison_adjudication_contract',version:2,reviewWorkId:review.id,
    purposeWorkId:scope.purposeWorkId,selectedQuestions:copy(scope.questions),
    globalPendingQuestions:copy((decision?.dataQuestions??[]).filter(q=>!selected.has(q.question)
      &&['necessary_fact','author_decision'].includes(q.classification))),
    globalQuestionsAreAutomaticallyLocalBlockers:false,globalQuestionsResolved:false,comparisons,
    instruction:'Review or revise ONE request to stop an optional comparison. selectedQuestions define its owned scope; globalPendingQuestions are preserved for later global owners, NOT automatically copied into each local check. If a global question truly conditions THIS choice, identify the exact retained premise and why it changes the choice. Missing original observations stay UNMEASURED: closure is an explicit reasoned choice, not an answered experiment or a narrower experiment silently substituted for it. Read actual sources. The exact arithmetic table is generated by the same saved-comparison contract; identify subject and reference before interpreting satisfied. A higher single-attack estimate neither mandates a swap nor can be called a failed threshold in that same direction. Do not restate old review prose as truth. Consider the actual alternative and what would be displaced/preserved; budget-full alone is insufficient. Do not demand universal optimality or invented new experiments. The strategic owner may correct a factual Plan claim, request one decision-changing observation, explicitly redesign, or retain and request closure with reasons/conditions. Never mark the same selected choice both decided and still awaiting its author. The whole Plan and other necessary questions remain unapproved. '+ROSTER_DEFERRED_COMPARISON_POLICY_V1};
  const premiseContract=await compileRosterComparisonPremisesV1({state,request:scope,readArtifact,
    factPolicyVersion:review.comparisonClosureFactPolicyVersion??0});
  const inputs={...assignment.inputs,comparisonAdjudication:{source:'literal',value:boundary},
    comparisonPremises:{source:'literal',value:premiseContract}};
  if(assignment.role==='roster_workflow_final_review')inputs.review={...inputs.review,value:{...inputs.review.value,
    comparisonAdjudicationVersion:2,obligations:copy(ROSTER_COMPARISON_CLOSURE_OBLIGATIONS_V1),
    instruction:premiseContract.factPolicy?premiseContract.instruction:boundary.instruction}};
  return {...assignment,inputs};
}
export function rosterComparisonClosureContractV1(assignment){
  const memory=assignment.inputs?.strategicHypothesisChallenge?.value?.comparisonMemory,design=memory?.design;
  if(assignment.role!=='roster_workflow_strategy_decision'||!design?.workId||!design.resultRef
    ||!Number.isSafeInteger(design.revision)||!memory.cycleId||memory.comparisonResolved||memory.status==='stale_dependency')return null;
  return {kind:'comparison_closure_contract',version:2,cycleId:memory.cycleId,purposeWorkId:design.workId,
    purposeResultRef:design.resultRef,designRevision:design.revision,
    assignedQuestions:copy(assignment.inputs?.investigationFrontier?.value?.unresolvedQuestions??[]),
    retentionControlInstruction:'For this assigned comparison, retain alone preserves intent but cannot end declined measurements. If you classify an original question as decided_here/authored_choice/future_condition/optional_probe and want no further investigation, submit comparisonClosureRequest for independent review. Otherwise select the necessary inquiry, explicit redesign or actual strategic revision. Never relabel an unknown measurement answered_fact to bypass this control choice.',
    instruction:'Choose an explicit comparisonClosureRequest to stop an optional comparison. Either select kind=retain_scoped and explain why no further evidence is needed for a scoped retained choice, or select kind=defer_unresolved with whyDeferred and followupObservation; no invented winner is required. Preserve exact questions in dataQuestions; questionNumbers select choice/future_condition/optional_probe, NOT necessary_fact or author_decision. Use retain with mutation=null, or revise ONLY the current Plan without changing the army. nextInvestigation/comparisonDesignRequest/workflowBlocker must be null. A request needs independent scoped review before scheduling closes. Unknown is not zero or disproven; full budget alone does not make replacement impossible. If a useful bounded measurement is worth doing now, choose nextInvestigation instead; if conditions change choose comparisonDesignRequest. No forced army change. '+ROSTER_DEFERRED_COMPARISON_POLICY_V1};
}
export function rosterComparisonClosureErrorsV1({contract,decision}){
  const request=decision?.comparisonClosureRequest;
  if(request==null){
    // Retaining strategic intent does not settle an experiment's measurement
    // obligations. In the actual A cycle all missing measurements were marked
    // decided_here, so the ordinary pending-fact gate let the same question
    // bounce between its author and investigator indefinitely. Require the
    // EXISTING explicit control operation, not a Host inference of closure.
    const declined=(contract?.assignedQuestions??[]).filter(question=>
      decision?.dataQuestions?.some(q=>q.question===question
        &&['decided_here','authored_choice','future_condition','optional_probe'].includes(q.classification)));
    if(contract?.kind==='comparison_closure_contract'&&[1,2].includes(contract.version)&&declined.length
      &&decision?.disposition==='retain'&&decision.mutation===null
      &&decision.nextInvestigation==null&&decision.comparisonDesignRequest==null&&decision.workflowBlocker==null)
      return [{code:'comparison_retention_requires_resolution',questions:declined,
        factsApproved:false,comparisonClosed:false,
        instruction:'Keeping the Plan is not ending its assigned comparison. Submit comparisonClosureRequest with a scoped retained choice OR explicit defer_unresolved, or select a genuinely useful inquiry/redesign/revision. Do not repeat retain alone or label unmeasured quantities answered_fact. '+ROSTER_DEFERRED_COMPARISON_POLICY_V1}];
    return [];
  }
  const questions=decision.dataQuestions??[],selected=request.questionNumbers??[],sources=new Set(decision.evidenceNumbers??[]);
  const planOnly=decision.disposition==='revise'&&decision.mutation
    &&!decision.mutation.unitsToUpsert?.length&&!decision.mutation.unitIdsToRemove?.length
    &&decision.mutation.tacticalCardRecordKeys==null&&!decision.mutation.rosterBranchSelection&&!decision.mutation.rosterCandidateSelection;
  const deferred=isRosterDeferredComparisonV1(request);
  const deferredInvalid=deferred&&(contract?.version!==2||!request.whyDeferred?.trim()
    ||!request.unverifiedClaims?.length||!request.conditions?.length
    ||['scenario','metric','contrastingResults','decisionRelevance'].some(k=>!request.followupObservation?.[k]?.trim()));
  if(contract?.kind!=='comparison_closure_contract'||![1,2].includes(contract.version)
    ||!(decision.disposition==='retain'&&decision.mutation===null&&!decision.strategicChanges?.length||planOnly)
    ||decision.nextInvestigation!=null||decision.comparisonDesignRequest!=null||decision.workflowBlocker!=null
    ||!selected.length||new Set(selected).size!==selected.length
    ||selected.some(n=>!Number.isSafeInteger(n)||!questions[n-1]
      ||['necessary_fact','author_decision'].includes(questions[n-1].classification))
    ||(contract.assignedQuestions??[]).some(q=>!selected.some(n=>questions[n-1]?.question===q))
    ||!request.evidenceNumbers?.length||request.evidenceNumbers.some(n=>!Number.isSafeInteger(n)||!sources.has(n))
    ||deferredInvalid||(!deferred&&(!request.whyNoFurtherEvidenceNeeded?.trim()||request.kind!=null&&request.kind!=='retain_scoped'))
    ||['selectedOption','declinedAlternative','decisionBasis','reopenWhen'].some(k=>!request[k]?.trim())
    ||!Array.isArray(request.unverifiedClaims)||!Array.isArray(request.conditions))
    return [{code:'comparison_closure_requires_explicit_scoped_choice',instruction:contract?.instruction??'No active comparison is assigned; comparisonClosureRequest=null.'}];
  return [];
}
export function projectRosterComparisonClosureHandoffV1({contract,decision,replyRef}){
  if(!decision?.comparisonClosureRequest||!replyRef||rosterComparisonClosureErrorsV1({contract,decision}).length)return null;
  return {version:1,kind:'comparison_closure_requested',cycleId:contract.cycleId,purposeWorkId:contract.purposeWorkId,
    purposeResultRef:contract.purposeResultRef,designRevision:contract.designRevision,sourceReplyRef:replyRef,
    request:copy(decision.comparisonClosureRequest),questions:decision.comparisonClosureRequest.questionNumbers.map(n=>copy(decision.dataQuestions[n-1])),
    comparisonClosed:false,factApprovalGranted:false,planApprovalGranted:false};
}
// Re-derive from immutable request/reply and actual applied outcome. No prose
// inference, caller-supplied approval, old-reply migration or new factual verdict.
export async function resolveRosterComparisonClosureRequestV1({state,cycle,readArtifact,authorWorkId=null}){
  const purpose=state.work.find(w=>w.id===cycle.comparisonPurposeWorkId);
  if(!purpose||purpose.resultRef!==cycle.comparisonPurposeResultRef||purpose.strategyComparisonDesignCycleId!==cycle.id)return null;
  for(const author of [...state.work].reverse()){
    if(authorWorkId&&author.id!==authorWorkId)continue;
    if(author.role!=='roster_workflow_strategy_decision'||!['evidence_ready','superseded'].includes(author.status)
      ||!author.resultRef||!author.draftOutcomeRef||author.operationState?.pending)continue;
    if(!['army','rules','map','source'].every(k=>author.bindings?.[k]===state.scope[k]))continue;
    const result=await readArtifact(author.resultRef),handoff=result.value?.comparisonClosureHandoff;
    if(handoff?.cycleId!==cycle.id||handoff.purposeResultRef!==purpose.resultRef)continue;
    const call=author.operationState?.calls?.find(c=>c.replyRef===result.value.originalReplyRef);if(!call?.requestRef)continue;
    const request=await readArtifact(call.requestRef),contract=request.promptNodes?.find(n=>n.kind==='comparison_closure_contract');
    const decision=result.value.decisions?.length===1?result.value.decisions[0]:null;
    const expected=projectRosterComparisonClosureHandoffV1({contract,decision,replyRef:call.replyRef});
    if(!expected||!isDeepStrictEqual(expected,handoff)||handoff.purposeWorkId!==purpose.id
      ||handoff.designRevision!==(purpose.designRevision??1))continue;
    // Frozen-comparison authors bind army/rules/map/source, deliberately not
    // mutable Plan. Their ACTUAL delivered current draft is the before-Plan
    // identity; do not mistake an absent optional binding for a missing commit.
    const assignment=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
    const deliveredDraft=assignment?.workId===author.id?assignment.inputs?.wholeDraft?.value:null;
    const beforePlan=author.bindings?.plan??(deliveredDraft?.revision===author.draftRevision
      ?deliveredDraft.plan?.planHash:null);
    if(!beforePlan)continue;
    const outcome=await readArtifact(author.draftOutcomeRef);
    const retained=decision.disposition==='retain'&&isRosterWorkflowNonRevisionOutcomeV1(outcome,decision)
      &&author.draftRevision===state.draftRevision&&beforePlan===state.scope.plan
      &&Object.entries(author.bindings??{}).every(([k,v])=>state.scope[k]===v);
    // An explicit closure accompanying an idempotent Plan correction remains
    // a request for independent review; don't lose it or manufacture a commit.
    const unchanged=isRosterWorkflowUnchangedRevisionOutcomeV1(outcome,decision)
      &&author.draftRevision===state.draftRevision&&outcome.beforeRevision===state.draftRevision
      &&beforePlan===state.scope.plan&&outcome.planAfterHash===state.scope.plan&&outcome.armyAfterHash===state.scope.army
      &&Object.entries(author.bindings??{}).every(([k,v])=>state.scope[k]===v);
    const corrected=outcome.applied===true&&outcome.acceptanceGranted===false&&outcome.status==='draft_committed'&&outcome.armyChanged===false
      &&outcome.beforeRevision===author.draftRevision&&outcome.afterRevision===state.draftRevision&&outcome.planBeforeHash===beforePlan
      &&outcome.planAfterHash===state.scope.plan&&outcome.armyAfterHash===state.scope.army
      &&Object.entries(author.bindings??{}).filter(([k])=>k!=='plan').every(([k,v])=>state.scope[k]===v)
      &&state.events.some(e=>e.type==='draft_committed'&&e.workId===author.id&&e.receiptRef===author.draftOutcomeRef
        &&e.revision===state.draftRevision&&e.draftRef===state.draftRef);
    if(!retained&&!corrected&&!unchanged)continue;
    return {authorWorkId:author.id,authorResultRef:author.resultRef,authorOutcomeRef:author.draftOutcomeRef,
      cycleId:cycle.id,purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,request:copy(handoff.request),
      questions:copy(handoff.questions),reviewId:author.id+':closure-review:v1',draftRevision:state.draftRevision};
  }
  return null;
}
export async function assessRosterComparisonClosureV1({state,cycle,readArtifact}){
  const request=await resolveRosterComparisonClosureRequestV1({state,cycle,readArtifact});
  if(!request)return {accepted:false,request:null};
  const review=state.work.find(w=>w.id===request.reviewId);
  if(!review||review.comparisonClosureOf!==request.authorWorkId||review.comparisonClosureResultRef!==request.authorResultRef
    ||review.comparisonPurposeResultRef!==request.purposeResultRef||review.comparisonClosureContractVersion!==1
    ||review.status!=='evidence_ready'||!review.resultRef||review.draftRevision!==state.draftRevision
    ||!isDeepStrictEqual(review.bindings,state.scope))return {accepted:false,request,review};
  const reviewed=(await readArtifact(review.resultRef)).value,checks=reviewed?.checks??[];
  const policyVersion=review.comparisonClosureFactPolicyVersion??0;
  const premiseContract=await compileRosterComparisonPremisesV1({state,request,readArtifact,factPolicyVersion:policyVersion});
  const premises=assessRosterComparisonPremisesV1({contract:premiseContract,audit:reviewed?.premiseAudit,checks});
  const accepted=(!policyVersion||reviewed.comparisonFactPolicyVersion===policyVersion)
    &&premises.accepted&&checks.length===ROSTER_COMPARISON_CLOSURE_OBLIGATIONS_V1.length
    &&ROSTER_COMPARISON_CLOSURE_OBLIGATIONS_V1.every(o=>checks.filter(c=>c.checkId===o.checkId).length===1
      &&checks.some(c=>c.checkId===o.checkId&&(policyVersion===1
        ?!(c.requiredData??[]).length&&!(c.dataQuestions??[]).some(q=>q.classification==='necessary_fact')
        :rosterReviewCheckPassedV1(c)&&c.evidenceRefs?.length)));
  return {accepted,request,review,checks,premises};
}
// A reviewed decision can stop before creating a study. Use the real design as
// that scheduling anchor; do not manufacture an experiment or erase its unknowns.
// Core writes and product reads must use this same identity/stage selection.
export function rosterComparisonClosureTargetV1({state,cycle}){
  const purpose=currentRosterComparisonPurposeV1(state,cycle.id);
  if(!purpose||purpose.id!==cycle.comparisonPurposeWorkId
    ||purpose.resultRef!==cycle.comparisonPurposeResultRef)return null;
  const graph=createRosterWorkflowGraphV1(state);
  const goal=state.work.find(w=>w.id===cycle.comparisonExperimentId);
  if(goal){
    if(goal.role!=='roster_workflow_experiment_planner'||goal.experimentGoalId!==goal.id
      ||goal.inputs?.comparisonPurpose?.source!=='evidence'
      ||goal.inputs.comparisonPurpose.id!=='role:'+purpose.id)return null;
    return {goal,members:graph.experimentSubtree(goal.id),closureStage:'comparison_study'};
  }
  // A wrong expected identity must not hide a real study under a design stop.
  if(state.work.some(w=>w.experimentGoalId===w.id&&w.inputs?.comparisonPurpose?.id==='role:'+purpose.id))return null;
  const preflights=state.work.filter(w=>w.strategyComparisonDesignReviewCycleId===cycle.id
    &&w.comparisonPurposeResultRef===purpose.resultRef);
  const ownedKinds=['goal','execution','repair','choice','review','continuation'];
  const members=[purpose,...preflights.flatMap(w=>graph.descendants(w.id,{kinds:ownedKinds}))];
  return {goal:purpose,members:[...new Map(members.map(w=>[w.id,w])).values()],closureStage:'before_comparison_study'};
}
export async function projectRosterComparisonClosureV1({state,cycle,readArtifact}){
  const retained=await assessRosterInitialRetentionV1({state,cycleId:cycle.id,readArtifact});
  if(retained?.accepted&&retained.heldComparison?.purposeWorkId===cycle.comparisonPurposeWorkId
    &&retained.heldComparison.purposeResultRef===cycle.comparisonPurposeResultRef){
    const target=rosterComparisonClosureTargetV1({state,cycle});
    if(!target||target.goal.id!==retained.heldComparison.goalId
      ||target.members.some(w=>w.status==='running'||w.operationState?.pending))return null;
    return {goalId:target.goal.id,closureStage:target.closureStage,memberIds:target.members.map(w=>w.id),
      authorWorkId:retained.authorWorkId,authorResultRef:retained.authorResultRef,
      reviewId:retained.reviewId,reviewResultRef:retained.reviewResultRef,reviewKind:'initial_retention',
      unresolvedHypotheses:retained.unresolvedHypotheses,comparisonResolutionKind:'reviewed_optional_retention',
      nativeQueryAutomaticallyResolved:false,planApproved:false,strategyImprovementProven:false,historyReset:false};
  }
  const assessment=await assessRosterComparisonClosureV1({state,cycle,readArtifact});if(!assessment.accepted)return null;
  const target=rosterComparisonClosureTargetV1({state,cycle});if(!target)return null;
  const {goal,members,closureStage}=target;
  if(members.some(w=>w.status==='running'||w.operationState?.pending))return null;
  return {goalId:goal.id,closureStage,memberIds:members.map(w=>w.id),authorWorkId:assessment.request.authorWorkId,
    authorResultRef:assessment.request.authorResultRef,reviewId:assessment.review.id,reviewResultRef:assessment.review.resultRef,
    request:assessment.request,comparisonResolutionKind:rosterComparisonResolutionKindV1(assessment.request.request),nativeQueryAutomaticallyResolved:false,
    planApproved:false,strategyImprovementProven:false,historyReset:false};
}
