// P2/P4 orchestration through the SAME public Run methods used by product
// callers. The challenger proposes; the strategic owner decides. No sidecar
// model calls, direct army edits, invented receipts or tactical ranking.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {rosterComparisonPurposeFromProposalV1,ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1,
  ROSTER_COMPARISON_PREFLIGHT_OBLIGATIONS_V1,rosterComparisonDesignContractRepairV1,
  rosterComparisonPreflightContractRepairV1,rosterComparisonArmyBaselineCheckedV1,
  assessRosterComparisonDecisionPreflightV1,rosterComparisonDecisionContractV1,
  currentRosterComparisonPreflightV1,rosterComparisonPlanContextRecheckV1} from '../roster-strategist/roster-comparison-purpose-v1.mjs';
import {assessRosterExperimentConclusionV1} from '../roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {rosterReviewCheckPassedV1,rosterPendingQuestionWorkV1} from '../roster-strategist/roster-review-data-questions-v1.mjs';
import {createRosterWorkflowGraphV1,currentRosterComparisonPurposeV1} from '../roster-strategist/roster-workflow-graph-v1.mjs';
import {resolveRosterComparisonDesignRequestV1,rosterComparisonOwnerChoiceRepairV1,rosterComparisonReviewDeliveryRepairV1} from '../roster-strategist/roster-comparison-redesign-v1.mjs';
import {assessRosterComparisonClosureV1,isRosterDeferredComparisonV1,rosterComparisonResolutionKindV1,
  ROSTER_DEFERRED_COMPARISON_POLICY_V1,rosterComparisonClosureTargetV1} from '../roster-strategist/roster-comparison-closure-v1.mjs';
import {isRosterWorkflowUnchangedRevisionOutcomeV1} from '../roster-strategist/roster-workflow-decision-records-v1.mjs';
import {rosterWorkflowDeclaredPlanChangeErrorsV1} from '../roster-strategist/roster-workflow-draft-v1.mjs';
import {assessRosterComparisonPrerequisitesV1,progressRosterComparisonPrerequisitesV1} from '../roster-strategist/roster-comparison-prerequisites-v1.mjs';
import {assessRosterComparisonParticipantPreflightV1,rosterFrozenComparisonAdmissionContextV1} from '../roster-strategist/roster-comparison-participant-preflight-v1.mjs';
import {rosterComparisonDesignReturnFromResultV1} from '../roster-strategist/roster-comparison-design-return-v1.mjs';
import {rosterComparisonOwnerReturnV1} from '../roster-strategist/roster-comparison-grounding-v1.mjs';
import {assessRosterComparisonValueReviewV1,createRosterComparisonValueOwnerInputV1,createRosterComparisonValueSourceRepairInputV1,createRosterComparisonCriterionRepairInputV1,rosterComparisonValueReviewWindowV1} from '../roster-strategist/roster-comparison-value-review-v1.mjs';
import {assessRosterInitialRetentionV1,createRosterInitialRetentionFeedbackV1} from '../roster-strategist/roster-initial-retention-v1.mjs';
import {projectRosterComparisonProgressInputsV1} from '../roster-strategist/roster-comparison-plan-continuity-v1.mjs';
export {ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1};

// This key identifies a factual experimental context, not each prose revision.
// New armies/maps/rules/sources need a new challenge; Plan-only wording changes
// retain the actual prior challenge and its trace, rather than buying it again.
export function rosterProductHypothesisCycleIdV1(state,draft){
  const context={mode:draft.mode,...Object.fromEntries(['army','rules','map','source'].map(key=>[key,state.scope[key]]))};
  return 'product:strategy-hypothesis:v1:'+createHash('sha256').update(JSON.stringify(context)).digest('hex').slice(0,20);
}

const stageWorks=(state,id,stage)=>state.work.filter(w=>w.id===id+':'+stage||w.id.startsWith(id+':'+stage+':plan-r'));
// A successful write is not necessarily a completed strategic choice. The
// SAME explicit decision may retain a necessary inquiry or transfer ownership.
// Preserve that exit rather than falling back to an older completed decision.
function pendingComparisonDecisionExit(work,outcome){
  const decision=outcome.decision;
  if(!decision)return null;
  const pending=rosterPendingQuestionWorkV1(decision);
  const kind=decision.workflowBlocker?'engineering_blocker'
    :decision.comparisonDesignRequest?'comparison_redesign'
    :decision.nextInvestigation||pending.facts.length?'necessary_investigation'
    :pending.authorDecisions.length?'author_decision':null;
  if(!kind)return null;
  return {kind,terminal:false,sourceWorkId:work.id,sourceOutcomeRef:work.draftOutcomeRef,
    questions:structuredClone(pending.facts),authorDecisions:structuredClone(pending.authorDecisions),
    declaration:structuredClone(decision.workflowBlocker??decision.comparisonDesignRequest??decision.nextInvestigation??null),
    acceptanceGranted:false,automaticRetry:false};
}
async function completedTeacher(state,id,readArtifact){
  for(const work of stageWorks(state,id,'teach').reverse()){
    if(!work.resultRef||!['evidence_ready','superseded'].includes(work.status))continue;
    const result=await readArtifact(work.resultRef);
    if(result?.kind==='proposal'&&Array.isArray(result.value?.proposals))return {work,result};
  }
  return null;
}

export async function assessRosterProductHypothesisCycleV1({state,draft,readArtifact}){
  if(!draft?.plan)return {id:null,status:'not_started',ownerReturned:false,comparisonResolved:false,strategyImprovementProven:false};
  const id=rosterProductHypothesisCycleIdV1(state,draft),completed=await completedTeacher(state,id,readArtifact),
    teach=completed?.work??stageWorks(state,id,'teach').at(-1),owner=stageWorks(state,id,'decision').at(-1);
  const purposeWork=currentRosterComparisonPurposeV1(state,id);
  const purpose=purposeWork?.status==='evidence_ready'&&purposeWork.resultRef
    ?rosterComparisonPurposeFromProposalV1(await readArtifact(purposeWork.resultRef)):null;
  const designReturn=purposeWork?.status==='evidence_ready'&&purposeWork.resultRef
    &&Object.entries(purposeWork.bindings??{}).every(([key,value])=>state.scope[key]===value)
    ?rosterComparisonDesignReturnFromResultV1(await readArtifact(purposeWork.resultRef)):null;
  const designContractRepair=!purpose&&purposeWork
    ?await rosterComparisonDesignContractRepairV1({work:purposeWork,readArtifact}):null;
  const studyId=(purposeWork?.id??id+':purpose:v1')+':study';
  // Execution and completion must use the SAME recorded admission for an
  // unchanged frozen experiment. Current Plan adoption remains a later author
  // decision; it cannot retroactively require a new study authorization.
  const admission=purpose?await rosterFrozenComparisonAdmissionContextV1({state,
    goal:state.work.find(w=>w.id===studyId),purpose:purposeWork,readArtifact}):null;
  const admissionState=admission?.state??state,admissionPurpose=admission?.purpose??purposeWork;
  const preflight=purposeWork?await currentRosterComparisonPreflightV1({state:admissionState,work:admissionPurpose,readArtifact}):null;
  const preflightChecks=preflight?.status==='evidence_ready'&&preflight.resultRef
    ?(await readArtifact(preflight.resultRef)).value?.checks??[]:[];
  const participantCheck=purpose?await assessRosterComparisonParticipantPreflightV1({state:admissionState,work:admissionPurpose,readArtifact}):null;
  const modelPreflightAccepted=Boolean(purpose&&ROSTER_COMPARISON_PREFLIGHT_OBLIGATIONS_V1.every(obligation=>
    preflightChecks.some(check=>check.checkId===obligation.checkId&&rosterReviewCheckPassedV1(check)&&check.evidenceRefs?.length))
    &&await rosterComparisonArmyBaselineCheckedV1({work:preflight,checks:preflightChecks,readArtifact,armyHash:state.scope.army}));
  const decisionPreflight=purpose?await assessRosterComparisonDecisionPreflightV1({state:admissionState,work:admissionPurpose,preflight,readArtifact}):null;
  const planContextRecheck=purpose?rosterComparisonPlanContextRecheckV1({work:purposeWork,preflight,assessment:decisionPreflight}):null;
  let declaredPlanRepair=null;
  if(purpose)for(const author of [...state.work].reverse()){
    if(author.role!=='roster_workflow_strategy_decision'||!author.draftOutcomeRef||!author.resultRef
      ||author.inputs?.comparisonPurpose?.id!=='role:'+purposeWork.id
      ||!author.inputs?.wholeDraft?.value?.plan||author.operationState?.pending)continue;
    const outcome=await readArtifact(author.draftOutcomeRef);
    if(outcome?.applied!==true||outcome.status!=='draft_committed'||outcome.afterRevision!==draft.revision
      ||outcome.planAfterHash!==state.scope.plan||outcome.armyAfterHash!==state.scope.army)continue;
    const decision=(await readArtifact(author.resultRef))?.value?.decisions?.[0];
    const unchangedClaims=rosterWorkflowDeclaredPlanChangeErrorsV1({beforePlan:author.inputs.wholeDraft.value.plan,
      afterPlan:draft.plan,strategicChanges:decision?.strategicChanges});
    if(unchangedClaims.length)declaredPlanRepair={version:1,id:author.id+':actual-plan-delta:decision',
      sourceWorkId:author.id,sourceResultRef:author.resultRef,sourceOutcomeRef:author.draftOutcomeRef,
      currentDraftRef:state.draftRef,unchangedClaims,historyReset:false,reapplyMutation:false,
      sourceReviewId:preflight?.id??null,sourceReviewResultRef:preflight?.resultRef??null,
      instruction:'The previous accepted write predates the actual-delta check. Its claimed correction already existed in the supplied CURRENT Plan, and the submitted value was unchanged. The original receipt remains history, not proof the comparison problem was fixed. Reconsider the actual experiment-to-choice mapping, not the same obsolete before/after story. If experiment targets are too broad, explicitly request a design/use change; if a Plan edit is genuinely necessary, identify an actual differing intent. An unmeasured result is not a tie. Do not reapply this write, reset history, call Native, or buy another identical review. Resolve the assigned strategic choice through the normal explicit operations.'};
    break;
  }
  const preflightAccepted=modelPreflightAccepted&&participantCheck?.status==='matched'&&decisionPreflight?.status==='accepted';
  // v1/v2 could publish an invalid design before the participant check ran.
  // Return that saved, source-proven bad submission once to the author under
  // v3's submit-time validator. A new v3 failure never renews this allowance.
  const participantContractRepair=participantCheck?.status==='mismatch'
    &&(purposeWork.participantContractVersion??0)<3;
  const designRevision=purposeWork?.designRevision??1;
  const prerequisites=!preflightAccepted?await assessRosterComparisonPrerequisitesV1({state,preflight,
    checks:preflightChecks,readArtifact}):null;
  const preflightStopped=Boolean(prerequisites?prerequisites.stopped
    :preflight?.status==='evidence_ready'&&!preflightAccepted&&designRevision>=3);
  const preflightContractRepair=!preflightAccepted&&preflight
    ?await rosterComparisonPreflightContractRepairV1({work:preflight,readArtifact}):null;
  const graph=createRosterWorkflowGraphV1(state);
  const latestStudyOwner=graph.latestExperimentOwners().find(w=>w.experimentGoalId===studyId);
  const studyOwner=latestStudyOwner?.status!=='superseded'&&!latestStudyOwner?.supersededByGoalId
    &&latestStudyOwner&&graph.isFresh(latestStudyOwner.id)?latestStudyOwner:null;
  const study=studyOwner?await assessRosterExperimentConclusionV1({state,owner:studyOwner,store:{get:readArtifact}})
    :{status:latestStudyOwner?'awaiting_control_return':'not_started',acceptedForStrategy:false};
  const comparison=state.work.filter(w=>w.strategyComparisonCycleId===id&&w.draftRevision===draft.revision)
    .reverse().sort((a,b)=>(b.reviewRound??1)-(a.reviewRound??1))[0];
  const comparisonChecks=comparison?.status==='evidence_ready'&&comparison.resultRef
    ?(await readArtifact(comparison.resultRef)).value?.checks??[]:[];
  const comparisonMissingCheckIds=ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1.filter(o=>!comparisonChecks.some(c=>c.checkId===o.checkId)).map(o=>o.checkId);
  const comparisonResolved=Boolean(purpose&&preflightAccepted&&study.acceptedForStrategy&&comparison?.comparisonContractVersion===5
    &&isDeepStrictEqual(comparison.inputs?.comparisonDecisionContract?.value,decisionPreflight.contract)
    &&comparison?.comparisonPurposeResultRef===purposeWork.resultRef
    &&comparison.comparisonExperimentResultRef===studyOwner.resultRef
    &&ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1.every(o=>comparisonChecks.some(c=>
    c.checkId===o.checkId&&rosterReviewCheckPassedV1(c)&&c.evidenceRefs?.length)));
  const result={id,status:!teach?'not_started':!completed?'awaiting_challenger':'awaiting_owner',teacherWorkId:teach?.id??null,challengeReady:Boolean(completed),
    ownerReturned:false,comparisonResolved,comparisonReviewWorkId:comparison?.id??null,
    comparisonPurposeReady:Boolean(purpose),comparisonPurposeAdopted:false,comparisonPurposeWorkId:purposeWork?.id??null,
    comparisonPurposeResultRef:purposeWork?.resultRef??null,
    comparisonAdmissionContext:admission?{kind:'recorded_frozen_experiment',goalId:studyId,
      planHash:admissionState.scope.plan,currentPlanApproved:false}:null,
    comparisonDesignContractRepair:designContractRepair,
    comparisonDesignRevision:designRevision,comparisonPreflightWorkId:preflight?.id??null,
    comparisonPreflightAccepted:preflightAccepted,comparisonPreflightStopped:preflightStopped,
    comparisonDecisionPreflight:decisionPreflight,
    comparisonPlanContextRecheck:planContextRecheck,
    comparisonDeclaredPlanRepair:declaredPlanRepair,
    comparisonPreflightContractRepair:preflightContractRepair,
    comparisonParticipantCheck:participantCheck,comparisonParticipantContractRepair:participantContractRepair,
    comparisonPrerequisites:prerequisites,
    comparisonExperimentId:studyId,comparisonExperimentStatus:study.status,
    comparisonExperimentAccepted:study.acceptedForStrategy===true,comparisonExperimentOwnerWorkId:studyOwner?.id??null,
    comparisonExperimentResultRef:studyOwner?.resultRef??null,comparisonExperimentReviewId:study.reviewId??null,
    comparisonMissingCheckIds,
    comparisonReviewResultRef:comparison?.resultRef??null,comparisonRound:comparison?.reviewRound??0,
    comparisonStatus:!comparison?'not_started':comparisonResolved?'compared':comparison.status==='evidence_ready'?'needs_resolution':'reviewing',
    comparisonStopped:preflightStopped||Boolean(comparison?.status==='evidence_ready'&&comparison.comparisonContractVersion===5&&!comparisonResolved&&comparison.reviewRound>=3),
    comparisonEvidenceStatus:comparisonResolved?'measured_comparison_reviewed':'not_proven',strategyImprovementProven:false};
  // The initial question explicitly permits evidence-based retention BEFORE a
  // design exists. It needs its own review, not a nonexistent study result.
  {
    const retained=await assessRosterInitialRetentionV1({state,cycleId:id,readArtifact});
    if(retained&&(!purposeWork||retained.heldComparison?.purposeWorkId===purposeWork.id))return {...result,initialRetentionReturn:retained,
      status:retained.accepted?'owner_returned':'awaiting_initial_retention_review',
      ownerReturned:retained.accepted,comparisonResolved:retained.accepted,
      comparisonStatus:retained.accepted?'preexperiment_retention_reviewed':retained.status,
      comparisonStopped:retained.stopped,ownerWorkId:retained.authorWorkId,outcomeRef:retained.authorOutcomeRef,
      comparisonReviewWorkId:retained.reviewId,comparisonReviewResultRef:retained.reviewResultRef,
      ...(retained.accepted?{comparisonResolutionKind:'reviewed_optional_retention',comparisonKnowledgeStatus:'unresolved'}:{})};
  }
  // Value admission is an earlier review stage than method/result review.
  // Expose the SAME source-qualified stop used by progress(), otherwise a
  // completed owner proposal is reported as awaiting_owner/NO_READY forever.
  // This is status projection only: no grant, source rewrite or fourth review.
  const valueSource=await resolveRosterComparisonDesignRequestV1({state,
    cycle:{...result,comparisonDesignReturn:designReturn},readArtifact});
  if(valueSource){
    const value=await assessRosterComparisonValueReviewV1({state,draft,source:valueSource,readArtifact});
    const window=value.reviewWindow??rosterComparisonValueReviewWindowV1({state,source:valueSource});
    const stopped=value.status==='stopped'
      ||value.status==='history_delivery_required'&&window.nextAttempt>window.maximumAttempts
      ||value.status==='rejected'&&value.reviewAttempt>=window.maximumAttempts;
    if(stopped)return {...result,status:'comparison_stopped',comparisonStopped:true,
      comparisonResolved:false,comparisonStatus:'decision_value_review_stopped',
      comparisonRound:window.attemptWorkIds.length,
      comparisonStop:{domain:'strategy_comparison',stage:'decision_value',reason:'comparison_value_review_limit',
        round:window.attemptWorkIds.length,maximumAttempts:window.maximumAttempts,
        nextAttempt:window.nextAttempt,authorWorkId:valueSource.authorWorkId,authorResultRef:valueSource.authorResultRef,
        reviewWorkIds:[...window.attemptWorkIds],continuationAuthorizationId:window.continuationAuthorizationId,
        automaticRetry:false,strategyApproved:false}};
  }
  // This is a completed DESIGN role, not a completed comparison. In particular
  // an older study/review cannot silently authorize this returned new question.
  if(designReturn)return {...result,status:'awaiting_design_owner',comparisonDesignReturn:designReturn,
    comparisonResolved:false,comparisonStatus:'design_returned_without_experiment',comparisonEvidenceStatus:'not_proven'};
  const closure=await assessRosterComparisonClosureV1({state,cycle:result,readArtifact});
  const closedGoal=rosterComparisonClosureTargetV1({state,cycle:result})?.goal;
  if(closure.accepted&&closedGoal?.comparisonClosure?.reviewResultRef===closure.review.resultRef)
    return {...result,status:'owner_returned',ownerReturned:true,comparisonResolved:true,comparisonPurposeAdopted:true,
      comparisonResolutionKind:rosterComparisonResolutionKindV1(closure.request.request),comparisonStatus:'optional_comparison_closed',
      comparisonKnowledgeStatus:isRosterDeferredComparisonV1(closure.request.request)?'unresolved':'not_measured',
      deferredHypothesisRef:closedGoal.comparisonClosure.deferredHypothesisRef??null,
      comparisonExperimentAccepted:false,comparisonExperimentStatus:isRosterDeferredComparisonV1(closure.request.request)
        ?'unresolved_deferred_for_future_observation':'unmeasured_not_required_for_chosen_decision',
      comparisonEvidenceStatus:'not_proven',
      ownerWorkId:closure.request.authorWorkId,outcomeRef:closure.request.authorOutcomeRef,
      comparisonReviewWorkId:closure.review.id,comparisonReviewResultRef:closure.review.resultRef,
      comparisonStopped:false,strategyImprovementProven:false};
  // A later Plan-only edit needs its existing closure-reconsideration lane.
  // The old study's rejected preflight predates its accepted explicit closure;
  // it is not a new failed review of the changed Plan. Do not approve/replay it.
  const priorClosure=closedGoal?.comparisonClosure;
  const priorClosureReview=priorClosure?state.work.find(w=>w.id===priorClosure.reviewId
    &&w.resultRef===priorClosure.reviewResultRef&&w.comparisonClosureCycleId===id):null;
  if(!closure.request&&priorClosureReview&&priorClosureReview.draftRevision<draft.revision
    &&['evidence_ready','superseded'].includes(priorClosureReview.status)
    &&['army','rules','map','source'].every(k=>priorClosureReview.bindings?.[k]===state.scope[k]))
    return {...result,status:'awaiting_closure_reconsideration',ownerReturned:false,comparisonResolved:false,
      comparisonStopped:false,comparisonStatus:'previous_closure_needs_current_plan_confirmation',
      previousClosureReviewRef:priorClosure.reviewResultRef,currentPlanApprovalGranted:false,
      comparisonClosureReconsideration:{workId:result.comparisonPurposeWorkId+':closure-reconsider:r'+draft.revision,
        previousReviewRef:priorClosure.reviewResultRef,fromRevision:priorClosureReview.draftRevision,
        toRevision:draft.revision,experimentReplayRequired:false,automaticAcceptance:false}};
  if(closure.request){
    result.comparisonClosurePending=true;
    // Explicit closure is reviewed in its own stage. A rejected earlier
    // experiment preflight cannot preempt this owner-requested disposition.
    // The actual completed closure-review count below still enforces its limit.
    result.comparisonStopped=false;
    // A Plan-only revision retires the old reviewer but does not refund its
    // completed review round. Count actual final checks, not read-only turns.
    const completedReviews=[];
    for(const review of state.work.filter(w=>w.comparisonClosureCycleId===id&&w.resultRef
      &&['evidence_ready','superseded'].includes(w.status)))
      if((await readArtifact(review.resultRef)).value?.checks?.length)completedReviews.push(review);
    const completedClosureReviews=completedReviews.length;
    result.comparisonClosureReviewCount=completedClosureReviews;
    // A previously closed comparison lacked clause-level premise validation.
    // The concrete v936 contract fix permits ONE additional review, recorded
    // by a new author task. Old results/counts remain untouched, never renewed.
    const recovery=state.work.find(w=>w.inputs?.comparisonPremiseRepair?.value?.cycleId===id);
    const repairRequired=!closure.accepted&&closure.premises?.errors.some(e=>e.code==='comparison_premise_audit_missing')
      &&closedGoal?.comparisonClosure?.reviewResultRef===closure.review?.resultRef;
    result.comparisonPremiseRepairRequired=Boolean(repairRequired&&!recovery);
    result.comparisonPremiseRecoveryWorkId=recovery?.id??null;
    const additional=Boolean(recovery||result.comparisonPremiseRepairRequired);
    let limit=3+(additional?1:0);
    // Explicit product authorization is attached atomically to its ONE author
    // task. It must reference an actual completed review in this same cycle.
    // Reopening a job, reusing an ID or revising prose never refunds reviews.
    for(const work of state.work){
      const grant=work.inputs?.comparisonReviewAuthorization?.value;
      if(grant?.version!==1||grant.cycleId!==id||grant.additionalReviewLimit!==1
        ||typeof grant.authorizationId!=='string'||!grant.authorizationId.trim())continue;
      const index=completedReviews.findIndex(r=>r.id===grant.sourceReviewId&&r.resultRef===grant.sourceReviewResultRef);
      if(index<0||grant.previousReviewCount!==index+1||work.id!==grant.sourceReviewId+':decision')continue;
      limit=Math.max(limit,grant.previousReviewCount+1);
    }
    result.comparisonClosureReviewLimit=limit;
    if(!closure.accepted&&closure.review?.status==='evidence_ready'&&completedClosureReviews>=limit)result.comparisonStopped=true;
  }
  if(!teach)return result;
  // An investigate dispatch, an interpretation, or record_facts is not the
  // strategic return. Follow the same Run's actual owner/continuation outcomes.
  for(const work of state.work.filter(w=>w.role==='roster_workflow_strategy_decision'
    &&(w.id.startsWith(id+':decision')||w.inputs?.strategicHypothesisCycle?.value?.id===id)
    &&['evidence_ready','superseded'].includes(w.status)&&w.draftOutcomeRef).reverse()){
    const outcome=await readArtifact(work.draftOutcomeRef),decision=outcome.decision;
    const retained=['retain','retained'].includes(outcome.status)&&decision?.disposition==='retain'
      &&decision.publicReason?.trim()&&decision.evidenceRefs?.length&&!decision.requiredData?.length
      &&!rosterPendingQuestionWorkV1(decision).authorDecisions.length&&!outcome.evidenceRecorded;
    const unchanged=isRosterWorkflowUnchangedRevisionOutcomeV1(outcome,decision)
      &&outcome.afterRevision===draft.revision&&outcome.planAfterHash===state.scope.plan&&outcome.armyAfterHash===state.scope.army
      &&decision.publicReason?.trim()&&decision.evidenceRefs?.length&&!decision.requiredData?.length
      &&!rosterPendingQuestionWorkV1(decision).authorDecisions.length;
    if(purpose&&work.inputs.comparisonPurpose?.id!=='role:'+purposeWork.id
      &&work.inputs.comparisonPurpose?.value?.sourceWorkId!==purposeWork.id)continue;
    if(!study.acceptedForStrategy||work.inputs.comparisonResult?.id!=='role:'+studyOwner.id)continue;
    const decisionExit=pendingComparisonDecisionExit(work,outcome);
    if(decisionExit)return {...result,status:'awaiting_decision_exit',ownerReturned:false,comparisonResolved:false,
      comparisonStatus:'awaiting_decision_exit',decisionExit,ownerWorkId:work.id,outcomeRef:work.draftOutcomeRef};
    if(outcome.applied===true||retained||unchanged){
      // A later retain can leave the Plan revision unchanged. Its choice still
      // needs its own review: an earlier writer's same-revision pass is not it.
      const reviewedOwner=comparison?.inputs?.ownerDecision?.value;
      const exactOwnerReview=reviewedOwner?.workId===work.id&&reviewedOwner.outcomeRef===work.draftOutcomeRef;
      return {...result,status:'owner_returned',ownerReturned:true,comparisonPurposeAdopted:Boolean(purpose),
        comparisonResolved:result.comparisonResolved&&exactOwnerReview,
        comparisonEvidenceStatus:result.comparisonResolved&&exactOwnerReview?'measured_comparison_reviewed':'not_proven',
        comparisonStatus:result.comparisonResolved&&!exactOwnerReview?'awaiting_owner_review':result.comparisonStatus,
        comparisonOwnerReviewMatches:exactOwnerReview,
        comparisonStopped:result.comparisonStopped||Boolean(comparison?.status==='evidence_ready'
          &&comparison.comparisonContractVersion===5&&!exactOwnerReview&&comparison.reviewRound>=3),
        disposition:outcome.applied===true?'revised':unchanged?'unchanged_requested_revision':'retained',ownerWorkId:work.id,outcomeRef:work.draftOutcomeRef};
    }
  }
  if(!completed)return result;
  return {...result,status:owner?.status==='evidence_ready'?'awaiting_strategic_disposition':'awaiting_owner'};
}

// Called only by explicit product recovery, never by autonomous nextStage.
export async function authorizeRosterComparisonContinuationV1({run,state,draft,policy={}}){
  const fail=code=>{throw Object.assign(Error(code),{code,httpStatus:409});};
  if(typeof policy.authorizationId!=='string'||!policy.authorizationId.trim()||policy.authorizationId.length>256
    ||typeof policy.sourceReviewResultRef!=='string'||!policy.sourceReviewResultRef)fail('ROSTER_COMPARISON_AUTHORIZATION_REQUIRED');
  if(state.work.some(w=>w.status==='running'||w.operationState?.pending))fail('ROSTER_COMPARISON_WRITER_BUSY');
  const existing=state.work.find(w=>w.inputs?.comparisonReviewAuthorization?.value?.authorizationId===policy.authorizationId);
  if(existing){
    if(existing.inputs.comparisonReviewAuthorization.value.sourceReviewResultRef!==policy.sourceReviewResultRef)
      fail('ROSTER_COMPARISON_AUTHORIZATION_SOURCE_MISMATCH');
    return {scheduled:[],authorWorkId:existing.id,alreadyAuthorized:true};
  }
  const cycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:run.readArtifact});
  const valueReview=state.work.find(w=>w.comparisonValueReviewCycleId===cycle.id
    &&w.resultRef===policy.sourceReviewResultRef);
  if(valueReview){
    const priorGrants=state.work.filter(w=>w.inputs?.comparisonReviewAuthorization?.value?.stage==='decision_value'
      &&w.inputs.comparisonReviewAuthorization.value.cycleId===cycle.id);
    // A completed, source-bound review consumes its one-off grant. It does not
    // renew it: only this explicit recovery may issue another grant, and the
    // current rejected review is checked below. Unconsumed grants still prevent
    // stacking. Keep every old author, grant, attempt and result unchanged.
    const consumed=w=>{
      const grant=w.inputs.comparisonReviewAuthorization.value;
      return grant.version===2&&grant.additionalReviewLimit===1
        &&w.id===grant.authorWorkId&&w.status==='evidence_ready'
        &&state.work.some(review=>review.comparisonValueReviewCycleId===cycle.id
          &&review.comparisonValueContractVersion===2
          &&review.comparisonReviewAuthorizationId===grant.authorizationId
          &&review.comparisonValueAuthorWorkId===grant.authorWorkId
          &&review.reviewAttempt===grant.previousAttemptCount+1
          &&review.reviewWindowAfter===grant.sourceWindowAfter
          &&review.draftRevision===grant.expectedDraftRevision
          &&review.bindings?.plan===grant.expectedPlanHash
          &&review.status==='evidence_ready'&&Boolean(review.resultRef));
    };
    if(priorGrants.some(w=>!(w.status==='superseded'
      &&w.inputs.comparisonReviewAuthorization.value.expectedPlanHash!==state.scope.plan)&&!consumed(w)))
      fail('ROSTER_COMPARISON_VALUE_ALREADY_AUTHORIZED');
    const source=await resolveRosterComparisonDesignRequestV1({state,cycle,readArtifact:run.readArtifact});
    if(!source)fail('ROSTER_COMPARISON_AUTHORIZATION_SOURCE_MISMATCH');
    const assessment=await assessRosterComparisonValueReviewV1({state,draft,source,readArtifact:run.readArtifact});
    if(assessment.status==='stopped'){
      const window=rosterComparisonValueReviewWindowV1({state,source});
      if(valueReview.status!=='superseded'||window.attemptWorkIds.at(-1)!==valueReview.id
        ||window.nextAttempt<=window.maximumAttempts
        ||['army','rules','map','source'].some(key=>valueReview.bindings?.[key]!==state.scope[key]))
        fail('ROSTER_COMPARISON_AUTHORIZATION_SOURCE_MISMATCH');
      const checks=(await run.readArtifact(valueReview.resultRef))?.value?.checks??[];
      if(!checks.length||checks.every(rosterReviewCheckPassedV1))fail('ROSTER_COMPARISON_NOT_AT_STOPPED_REVIEW');
      const input=createRosterComparisonValueOwnerInputV1({state,source,cycle,assessment:{
        reviewId:valueReview.id,reviewResultRef:valueReview.resultRef,findings:checks}});
      input.id=source.authorWorkId+':authorized-value-revision';
      if(state.work.some(w=>w.id===input.id))fail('ROSTER_COMPARISON_AUTHOR_ALREADY_SCHEDULED');
      input.inputs={...input.inputs,...await projectRosterComparisonProgressInputsV1({state,cycleId:cycle.id,
        readArtifact:run.readArtifact})};
      input.inputs.decisionValueReview.scopeUsage='historical_reference';
      input.inputs.comparisonOwnerReturn.value.id=input.id;
      const grant={version:2,stage:'decision_value',historyRecoveryVersion:1,currentProposalContinuationVersion:1,
        authorizationId:policy.authorizationId,cycleId:cycle.id,authorWorkId:input.id,
        sourceReviewId:valueReview.id,sourceReviewResultRef:valueReview.resultRef,
        sourceWindowAfter:window.admittedReviewId,previousReviewCount:valueReview.reviewRound,
        previousAttemptCount:window.nextAttempt-1,additionalReviewLimit:1,
        expectedDraftRevision:draft.revision,expectedPlanHash:state.scope.plan,
        previousAuthorizationIds:[...new Set(priorGrants.map(w=>w.inputs.comparisonReviewAuthorization.value.authorizationId))],
        instruction:'One NEW explicit user authorization for the current source-bound proposal and preserved last review. Address its unfulfilled author choices with the current Plan; one author revision and at most one independent value review. Historical grants stay superseded, prior attempts/costs remain, no automatic renewal, Native replay or Plan approval.'};
      input.inputs.comparisonReviewAuthorization={source:'literal',value:grant};
      await run.requestDecision(input);
      return {scheduled:[input.id],authorWorkId:input.id,stage:'decision_value',alreadyAuthorized:false,
        previousReviewCount:grant.previousReviewCount,additionalReviewLimit:1,historyRestored:true};
    }
    // A Plan-only successor lost the completed feedback and now has no review
    // of its own. Explicit recovery can bind the last historical review once;
    // it must not reset attempts, revive the old work or approve the new Plan.
    if(assessment.status==='history_delivery_required'){
      const progress=assessment.repair.inputs.comparisonProgress.value,window=rosterComparisonValueReviewWindowV1({state,source});
      if(progress.latestReview.workId!==valueReview.id||progress.latestReview.resultRef!==policy.sourceReviewResultRef
        ||window.nextAttempt<=window.maximumAttempts||valueReview.status!=='superseded')
        fail('ROSTER_COMPARISON_AUTHORIZATION_SOURCE_MISMATCH');
      const result=await run.readArtifact(valueReview.resultRef),checks=result?.value?.checks??[];
      if(checks.length===0||checks.every(rosterReviewCheckPassedV1))fail('ROSTER_COMPARISON_NOT_AT_STOPPED_REVIEW');
      const input=assessment.repair,grant={version:2,stage:'decision_value',historyRecoveryVersion:1,
        authorizationId:policy.authorizationId,cycleId:cycle.id,authorWorkId:input.id,
        sourceReviewId:valueReview.id,sourceReviewResultRef:valueReview.resultRef,
        sourceWindowAfter:window.admittedReviewId,previousReviewCount:valueReview.reviewRound,
        previousAttemptCount:window.nextAttempt-1,additionalReviewLimit:1,
        expectedDraftRevision:draft.revision,expectedPlanHash:state.scope.plan,
        instruction:'One explicitly authorized post-fix author revision and one value review. Preserve all prior failures and costs; no counter reset, automatic renewal, Native replay or Plan acceptance.'};
      const feedback=createRosterComparisonValueOwnerInputV1({state,source,cycle,assessment:{
        reviewId:valueReview.id,reviewResultRef:valueReview.resultRef,findings:checks}});
      await run.requestDecision({...input,inputs:{...input.inputs,
        decisionValueReview:{source:'evidence',id:'role:'+valueReview.id,pointer:'',scopeUsage:'historical_reference'},
        comparisonOwnerReturn:feedback.inputs.comparisonOwnerReturn,
        comparisonReviewAuthorization:{source:'literal',value:grant}}});
      return {scheduled:[input.id],authorWorkId:input.id,stage:'decision_value',alreadyAuthorized:false,
        previousReviewCount:grant.previousReviewCount,additionalReviewLimit:1,historyRestored:true};
    }
    if(assessment.reviewId!==valueReview.id||assessment.reviewResultRef!==policy.sourceReviewResultRef)
      fail('ROSTER_COMPARISON_AUTHORIZATION_SOURCE_MISMATCH');
    if(assessment.status!=='rejected'||assessment.reviewAttempt<3||valueReview.status!=='evidence_ready')
      fail('ROSTER_COMPARISON_NOT_AT_STOPPED_REVIEW');
    const input=createRosterComparisonValueOwnerInputV1({state,source,assessment,cycle});
    if(state.work.some(w=>w.id===input.id))fail('ROSTER_COMPARISON_AUTHOR_ALREADY_SCHEDULED');
    const grant={version:2,stage:'decision_value',authorizationId:policy.authorizationId,cycleId:cycle.id,
      authorWorkId:input.id,sourceReviewId:valueReview.id,sourceReviewResultRef:valueReview.resultRef,
      sourceWindowAfter:assessment.reviewWindowAfter,previousReviewCount:valueReview.reviewRound,
      previousAttemptCount:assessment.reviewAttempt,additionalReviewLimit:1,
      expectedDraftRevision:draft.revision,expectedPlanHash:state.scope.plan,
      instruction:'Explicitly authorized once after the engineering repair: ONE current-feedback author decision and, only if it changes the actual proposal, ONE independent value review. Keep all historical attempts, replies, findings, references and costs. Closure/deferral remains available. This grants neither strategy acceptance nor new Native execution; no renewal or counter reset.'};
    await run.requestDecision({...input,inputs:{...input.inputs,
      comparisonReviewAuthorization:{source:'literal',value:grant}}});
    return {scheduled:[input.id],authorWorkId:input.id,stage:'decision_value',alreadyAuthorized:false,
      previousReviewCount:grant.previousReviewCount,additionalReviewLimit:1};
  }
  const closure=await assessRosterComparisonClosureV1({state,cycle,readArtifact:run.readArtifact});
  if(closure.review?.resultRef!==policy.sourceReviewResultRef)fail('ROSTER_COMPARISON_AUTHORIZATION_SOURCE_MISMATCH');
  if(!cycle.comparisonStopped||closure.accepted||closure.review.status!=='evidence_ready')fail('ROSTER_COMPARISON_NOT_AT_STOPPED_REVIEW');
  const id=closure.review.id+':decision';
  if(state.work.some(w=>w.id===id))fail('ROSTER_COMPARISON_AUTHOR_ALREADY_SCHEDULED');
  const grant={version:1,authorizationId:policy.authorizationId,cycleId:cycle.id,
    sourceReviewId:closure.review.id,sourceReviewResultRef:closure.review.resultRef,
    previousReviewCount:cycle.comparisonClosureReviewCount,additionalReviewLimit:1,
    instruction:'Explicit permission for one author revision and one independent final review using existing evidence. Preserve all prior reviews, questions and costs. Correct the rejected relied-on premises and explain the strategic tradeoff. No new Native experiment, whole-match rehearsal or automatic Plan approval is authorized. '+ROSTER_DEFERRED_COMPARISON_POLICY_V1};
  await requestClosureFeedbackDecision(run,closure,cycle,{comparisonReviewAuthorization:{source:'literal',value:grant}});
  return {scheduled:[id],authorWorkId:id,alreadyAuthorized:false,previousReviewCount:grant.previousReviewCount,additionalReviewLimit:1};
}

async function requestClosureFeedbackDecision(run,closure,cycle,extraInputs={}){
  const id=closure.review.id+':decision';
  const instruction=extraInputs.comparisonReviewAuthorization
    ?'本次只授权复用现有证据作出作者选择，再独立终审。纠正事实性错误；策略证据不足时可明确选择defer_unresolved，保留未知、暂定选择、未来观察和重开条件，不要求证明未知绝不影响选择。当前Plan有矛盾才实际修订，不为复制已存不确定性强迫改写。不得重算实验、申请新调查或捏造结论；真正必要规则事实缺失仍停止。'
    :'理由或当前Plan事实有错则纠正；可选策略比较若仍未知，可选择defer_unresolved并保留观察条件；值得现在测的事实才授权有区分力的限定查询。审核反馈不是新规则；不要把未测变成劣势，不重演已成功实验。';
  await run.requestDecision({id,question:{goal:'处理结束比较申请的具体审核反馈，作出可执行取舍，不再只改用途说明。',instruction},
    inputs:{comparisonClosureReview:{source:'evidence',id:'role:'+closure.review.id,pointer:''},
    originalClosureDecision:{source:'evidence',id:'role:'+closure.request.authorWorkId,pointer:'',scopeUsage:'historical_reference'},
    ...extraInputs,
    strategicHypothesisCycle:{source:'literal',value:{id:cycle.id,version:4}}}});
}

// "The owner answered" and "the alternatives were actually compared" are
// separate facts. Read-only comparison review may overlap other fact work;
// another strategic writer waits for the ordinary decision boundary.
async function retireReplacedComparisonStudies({run,state,cycle}){
  if(!cycle.comparisonPreflightAccepted||!cycle.comparisonPurposeReady)return;
  const byId=new Map(state.work.map(work=>[work.id,work]));
  const purpose=byId.get(cycle.comparisonPurposeWorkId),replacement=byId.get(cycle.comparisonExperimentId);
  if(!purpose||!replacement||purpose.strategyComparisonDesignCycleId!==cycle.id
    ||purpose.resultRef!==cycle.comparisonPurposeResultRef
    ||replacement?.experimentGoalId!==replacement?.id
    ||replacement?.inputs?.comparisonPurpose?.id!=='role:'+purpose.id
    ||replacement.status==='superseded')return;
  // Follow the explicit model design-revision chain, not ID spelling, globally
  // latest records or speculative equivalence between experimental questions.
  const previous=new Set(),seen=new Set([purpose.id]);let cursor=purpose;
  while(cursor.inputs?.previousDesign?.source==='evidence'){
    const reference=cursor.inputs.previousDesign.id;
    if(!reference?.startsWith('role:'))break;
    const prior=byId.get(reference.slice(5));
    if(!prior||seen.has(prior.id)||prior.strategyComparisonDesignCycleId!==cycle.id)break;
    seen.add(prior.id);previous.add(prior.id);cursor=prior;
  }
  const graph=createRosterWorkflowGraphV1(state);
  for(const goal of state.work){
    const reference=goal.inputs?.comparisonPurpose;
    if(goal.experimentGoalId!==goal.id||goal.id===replacement.id||goal.supersededByGoalId
      ||reference?.source!=='evidence'||!reference.id?.startsWith('role:')
      ||!previous.has(reference.id.slice(5))
      ||!Object.entries(goal.bindings??{}).every(([key,value])=>replacement.bindings?.[key]===value))continue;
    const members=state.work.filter(work=>graph.owner(work.id)?.goalId===goal.id);
    if(members.some(work=>work.status==='running'||work.operationState?.pending))continue;
    await run.supersedeExperiment({goalId:goal.id,replacementGoalId:replacement.id,
      reason:'The model explicitly revised this comparison design; its replacement passed the current preflight and has an execution goal. Retire only the previous design execution tree at a safe boundary. Preserve all results, evidence, replies, costs and counters as historical sources; no Plan approval, query replay or strategy selection.'});
  }
}
export async function progressRosterProductComparisonV1({run,state,draft,cycle,allowDecision=false}){
  const operationBusy=createRosterWorkflowGraphV1(state).hasBlockingOperation();
  // Resolve the CURRENT source-bound owner result once. A successful product
  // correction lives on its child work, not on the rejected parent's reply.
  // The shared resolver checks the actual outcome, current draft, review and
  // saved request/reply; merely being a later or completed job is insufficient.
  // The cycle has already verified the latest initial-question author's exact
  // nonrevision outcome. Its retention decision supersedes its older design
  // proposal; searching history first can strand this new review behind an
  // exhausted review window belonging to that old proposal.
  const currentRedesign=allowDecision&&!operationBusy&&!cycle.initialRetentionReturn
    ?await resolveRosterComparisonDesignRequestV1({state,cycle,readArtifact:run.readArtifact}):null;
  if(cycle.initialRetentionReturn&&!currentRedesign){
    const retained=cycle.initialRetentionReturn;
    if(!allowDecision||operationBusy||retained.stopped)return {scheduled:[]};
    if(retained.accepted){
      if(retained.heldComparison)await run.closeOptionalComparison({cycleId:cycle.id,authorWorkId:retained.authorWorkId,reviewId:retained.reviewId});
      return {scheduled:[]};
    }
    if(!retained.reviewStatus)return run.requestInitialRetentionReview({cycleId:cycle.id,authorWorkId:retained.authorWorkId});
    if(retained.status==='rejected'){
      const input=createRosterInitialRetentionFeedbackV1(retained);
      if(!state.work.some(w=>w.id===input.id)){await run.requestDecision(input);return {scheduled:[input.id]};}
    }
    return {scheduled:[]};
  }
  if(!currentRedesign&&allowDecision&&!operationBusy){
    const delivery=await rosterComparisonReviewDeliveryRepairV1({state,cycle,readArtifact:run.readArtifact});
    if(delivery){await run.requestDecision(delivery);return {scheduled:[delivery.id],reason:'comparison_review_delivery_required'};}
  }
  // A well-shaped request is not an approved strategic question. The same
  // gate also lives at the public design entry, so CLI/Web cannot bypass it.
  const valuePurpose=!currentRedesign&&cycle.comparisonDecisionPreflight?.status==='decision_value_review_required'
    ?state.work.find(w=>w.id===cycle.comparisonPurposeWorkId):null;
  const valueSource=currentRedesign??valuePurpose?.inputs?.redesignContract?.value?.source;
  if(valueSource){
    const value=await assessRosterComparisonValueReviewV1({state,draft,source:valueSource,readArtifact:run.readArtifact});
    if(value.status!=='accepted'){
      if(!allowDecision||operationBusy)return {scheduled:[],decisionValueStatus:value.status};
      if(value.status==='history_delivery_required'){
        const window=rosterComparisonValueReviewWindowV1({state,source:valueSource});
        if(window.nextAttempt>window.maximumAttempts)return {scheduled:[],decisionValueStatus:'stopped',
          reason:'comparison_progress_repair_requires_explicit_continuation'};
        if(!state.work.some(w=>w.id===value.repair.id)){
          await run.requestDecision(value.repair);return {scheduled:[value.repair.id],reason:'comparison_progress_delivery'};
        }
        return {scheduled:[],decisionValueStatus:value.status};
      }
      if(value.status==='decision_contract_required'){
        const input=createRosterComparisonCriterionRepairInputV1({source:valueSource,assessment:value,cycle});
        if(!state.work.some(w=>w.id===input.id)){await run.requestDecision(input);return {scheduled:[input.id],reason:'comparison_criterion_author_return'};}
        return {scheduled:[],decisionValueStatus:value.status};
      }
      if(value.status==='author_interface_required'){
        const input=createRosterComparisonValueSourceRepairInputV1({state,source:valueSource,cycle});
        if(!state.work.some(w=>w.id===input.id)){await run.requestDecision(input);return {scheduled:[input.id]};}
        return {scheduled:[],decisionValueStatus:value.status};
      }
      if(value.status==='required')return run.requestComparisonDecisionValueReview({cycleId:cycle.id,authorWorkId:valueSource.authorWorkId,
        ...(valuePurpose?{purposeWorkId:valuePurpose.id}:{})});
      if(value.status==='rejected'&&(value.reviewAttempt??value.reviewRound)<3){
        const input=createRosterComparisonValueOwnerInputV1({state,source:valueSource,assessment:value,cycle});
        if(!state.work.some(w=>w.id===input.id)){await run.requestDecision(input);return {scheduled:[input.id]};}
      }
      return {scheduled:[],decisionValueStatus:value.status};
    }
  }
  if(cycle.comparisonDeclaredPlanRepair&&!currentRedesign){
    const repair=cycle.comparisonDeclaredPlanRepair;
    const existing=state.work.find(w=>w.id===repair.id);
    if(existing){
      if(!['evidence_ready','superseded'].includes(existing.status)||!existing.resultRef||!existing.draftOutcomeRef)return {scheduled:[]};
      const decision=(await run.readArtifact(existing.resultRef)).value?.decisions?.[0];
      if(!decision?.comparisonDesignRequest&&!decision?.comparisonClosureRequest&&!decision?.workflowBlocker)return {scheduled:[]};
    }else{
      if(!allowDecision||operationBusy)return {scheduled:[]};
      const ownerReturn=await rosterComparisonOwnerReturnV1({state,cycle,readArtifact:run.readArtifact});
      if(!ownerReturn)return {scheduled:[]};
      const input=createRosterComparisonOwnerDecisionInputV1({cycle,ownerReturn});
      input.id=repair.id;
      input.inputs.actualPlanChangeRepair={source:'literal',value:repair};
      input.inputs.previousAuthorDecision={source:'evidence',id:'role:'+repair.sourceWorkId,pointer:'',scopeUsage:'historical_reference'};
      input.question.instruction=repair.instruction+' '+input.question.instruction;
      await run.requestDecision(input);return {scheduled:[repair.id]};
    }
  }
  if(cycle.comparisonDesignReturn){
    if(!allowDecision||operationBusy)return {scheduled:[]};
    const redesign=currentRedesign;
    if(redesign){
      const id=cycle.id+':purpose:v'+redesign.designRevision;
      if(state.work.some(w=>w.id===id))return {scheduled:[]};
      await run.requestStrategicComparisonDesign({id,cycleId:cycle.id,teacherWorkId:cycle.teacherWorkId,
        designRevision:redesign.designRevision,previousPurposeWorkId:redesign.purposeWorkId,authorWorkId:redesign.authorWorkId});
      return {scheduled:[id]};
    }
    const id=cycle.comparisonPurposeWorkId+':design-return:decision';
    if(state.work.some(w=>w.id===id))return {scheduled:[]};
    await run.requestDecision({id,inputs:{
      comparisonDesignReturn:{source:'evidence',id:'role:'+cycle.comparisonPurposeWorkId,pointer:''},
      strategicHypothesisCycle:{source:'literal',value:{id:cycle.id,version:4}},
      designReturnPolicy:{source:'literal',value:{version:1,experimentExecuted:false,comparisonResolved:false,
        strategyImprovementProven:false,automaticRetry:false}}},
      question:{goal:'设计角色未能提出可执行且能区分策略的实验；由战略作者处理原取舍，不得将返回当成实验结论。',
        instruction:'读原Teach、当前军表/Plan和comparisonDesignReturn。判断缺口理由是否成立；选择一个仍回答真实取舍的有效假设，用comparisonDesignRequest明确所改变的机制、场景或指标；不可替代的工具缺口用workflowBlocker明确测量需求。不要只改字段名、把必要测量藏成未来条件、重新授权相同无效实验或改Plan措辞冒充比较。缺口报告本身不是已验证事实；可以提出具体反证。不自动选战术，不自动准出Plan或豁免本轮策略比较验收。'}});
    return {scheduled:[id]};
  }
  // Same deterministic preflight at initial scheduling and cold resume. Correct
  // a proven old false approval once; never run its already-queued method while
  // the new design is being authored. The author, not Host, chooses new premises.
  if(cycle.comparisonParticipantCheck?.status==='mismatch'){
    if(operationBusy)return {scheduled:[]};
    if(cycle.comparisonDesignRevision>=3&&!cycle.comparisonParticipantContractRepair)return {scheduled:[]};
    const designRevision=cycle.comparisonDesignRevision+1,id=cycle.id+':purpose:v'+designRevision;
    if(state.work.some(w=>w.id===id))return {scheduled:[]};
    await run.requestStrategicComparisonDesign({id,cycleId:cycle.id,teacherWorkId:cycle.teacherWorkId,
      designRevision,previousPurposeWorkId:cycle.comparisonPurposeWorkId,
      participantDiagnostic:cycle.comparisonParticipantCheck});
    return {scheduled:[id]};
  }
  // A single explicit decision, not another factual batch. Review it before
  // resuming the old study; the independent reviewer cannot waive current facts.
  const closure=await assessRosterComparisonClosureV1({state,cycle,readArtifact:run.readArtifact});
  if(closure.request&&!cycle.comparisonResolved){
    if(operationBusy)return {scheduled:[]};
    if(closure.accepted){
      await run.closeOptionalComparison({cycleId:cycle.id,authorWorkId:closure.request.authorWorkId,reviewId:closure.review.id});
      return {scheduled:[]};
    }
    if(!closure.review)return run.requestComparisonClosureReview({cycleId:cycle.id,authorWorkId:closure.request.authorWorkId});
    if(closure.review.status!=='evidence_ready'||!allowDecision||cycle.comparisonStopped)return {scheduled:[]};
    const id=closure.review.id+':decision';if(state.work.some(w=>w.id===id))return {scheduled:[]};
    await requestClosureFeedbackDecision(run,closure,cycle,{
      ...(cycle.comparisonPremiseRepairRequired?{comparisonPremiseRepair:{source:'literal',value:{
        version:1,cycleId:cycle.id,engineeringChangeId:'v936-clause-level-comparison-premises',
        sourceReviewId:closure.review.id,sourceReviewResultRef:closure.review.resultRef,additionalReviewLimit:1,
        diagnostics:closure.premises,
        instruction:'The old reviewer approved aggregate labels without checking each relied-on reason. Its supported verdict is not a verified premise. Reconsider the existing decisionBasis and whyNoFurtherEvidenceNeeded against the exact comparison directions. Correct false interpretations and make any retention tradeoff concrete: which existing components/contributions are preserved and what alternative benefit is forgone. A measured advantage does not mandate a swap; current budget does not prove all replacements impossible. You may retain with adequate evidence or revise via the normal structured operations. Preserve unknowns, original replies and all old costs. Only one additional independent closure review is authorized for this contract fix; no new Native experiment or whole-match rehearsal is granted by this repair.'}}}:{}),
    });
    return {scheduled:[id]};
  }
  const choiceRepair=allowDecision?await rosterComparisonOwnerChoiceRepairV1({state,cycle,readArtifact:run.readArtifact}):null;
  if(choiceRepair){
    await run.requestDecision({id:choiceRepair.id,inputs:{
      comparisonPurpose:{source:'evidence',id:'role:'+choiceRepair.purposeWorkId,pointer:'',scopeUsage:'historical_reference'},
      previousOwnerChoice:{source:'evidence',id:'role:'+choiceRepair.authorWorkId,pointer:'',scopeUsage:'historical_reference'},
      comparisonChoiceRepair:{source:'literal',value:choiceRepair},
      strategicHypothesisCycle:{source:'literal',value:{id:cycle.id,version:4}}},
      question:{goal:'先纠正并选定实际策略取舍，再决定是否值得设计实验；不能用反应开关回答购买或未改变的投资问题。',
        instruction:choiceRepair.instruction}});
    return {scheduled:[choiceRepair.id]};
  }
  const redesign=currentRedesign;
  if(redesign){
    const id=cycle.id+':purpose:v'+redesign.designRevision;
    if(state.work.some(w=>w.id===id))return {scheduled:[]};
    await run.requestStrategicComparisonDesign({id,cycleId:cycle.id,teacherWorkId:cycle.teacherWorkId,
      designRevision:redesign.designRevision,previousPurposeWorkId:redesign.purposeWorkId,authorWorkId:redesign.authorWorkId});
    return {scheduled:[id]};
  }
  // Normal Run synchronization already owns the inquiry/author handoff, while
  // declared capability blockers use the shared product blocker lane. Do not
  // launch a second strategic writer or compare an unfinished choice here.
  if(cycle.decisionExit?.terminal===false)return {scheduled:[]};
  const oldClosure=rosterComparisonClosureTargetV1({state,cycle})?.goal.comparisonClosure;
  if(!closure.request&&!cycle.comparisonResolved&&oldClosure){
    if(!allowDecision||operationBusy)return {scheduled:[]};
    const id=cycle.comparisonPurposeWorkId+':closure-reconsider:r'+draft.revision;
    if(state.work.some(w=>w.id===id))return {scheduled:[]};
    await run.requestDecision({id,
      question:{goal:'当前Plan已改变，复核先前结束可选比较的取舍是否仍适用。',
        instruction:'先消费旧作者选择和审核，不重演已经结束的实验。仍适用则以当前Plan申请保留结束；需要不同比较则显式重设计；缺少影响当前选择的事实才授权有区分力的限定查询。不能因旧审核通过而自动批准新Plan，也不能因Plan版本变了就重复旧测量。'},
      inputs:{previousComparisonClosure:{source:'literal',value:structuredClone(oldClosure)},
      ...(oldClosure.authorWorkId?{previousClosureAuthor:{source:'evidence',id:'role:'+oldClosure.authorWorkId,pointer:'',scopeUsage:'historical_reference'}}:{}),
      ...(oldClosure.reviewId?{previousClosureReview:{source:'evidence',id:'role:'+oldClosure.reviewId,pointer:'',scopeUsage:'historical_reference'}}:{}),
      comparisonPurpose:{source:'evidence',id:'role:'+cycle.comparisonPurposeWorkId,pointer:'',scopeUsage:'historical_reference'},
      strategicHypothesisCycle:{source:'literal',value:{id:cycle.id,version:4}}}});
    return {scheduled:[id]};
  }
  await retireReplacedComparisonStudies({run,state,cycle});
  if(cycle.comparisonResolved&&cycle.ownerReturned){
    if(!['reviewed_optional_retention','reviewed_deferred_hypothesis'].includes(cycle.comparisonResolutionKind))await run.archiveConditionalConclusion();
    return {scheduled:[]};
  }
  if(!cycle.comparisonResolved&&cycle.comparisonPreflightContractRepair){
    const repair=cycle.comparisonPreflightContractRepair;
    const id=repair.sourceWorkId+':'+(repair.recoverySuffix??'design-subject-recovery:v1');
    if(state.work.some(work=>work.id===id))return {scheduled:[]};
    await run.requestStrategicComparisonDesignReview({id,cycleId:cycle.id,
      purposeWorkId:cycle.comparisonPurposeWorkId,purposeResultRef:cycle.comparisonPurposeResultRef,
      designReviewRound:cycle.comparisonDesignRevision,contractRepair:repair});
    return {scheduled:[id]};
  }
  if(cycle.comparisonPlanContextRecheck){
    const recheck=cycle.comparisonPlanContextRecheck;
    if(operationBusy||state.work.some(w=>w.id===recheck.id))return {scheduled:[]};
    await run.requestStrategicComparisonDesignReview({id:recheck.id,cycleId:cycle.id,
      purposeWorkId:cycle.comparisonPurposeWorkId,purposeResultRef:cycle.comparisonPurposeResultRef,
      designReviewRound:cycle.comparisonDesignRevision,planContextRecheck:recheck});
    return {scheduled:[recheck.id]};
  }
  if(cycle.comparisonPrerequisites)
    return progressRosterComparisonPrerequisitesV1({run,state,cycle,draft});
  const ownerReturn=await rosterComparisonOwnerReturnV1({state,cycle,readArtifact:run.readArtifact});
  if(ownerReturn){
    if(!allowDecision||operationBusy||state.work.some(w=>w.id===ownerReturn.id))return {scheduled:[]};
    await run.requestDecision(createRosterComparisonOwnerDecisionInputV1({cycle,ownerReturn}));
    return {scheduled:[ownerReturn.id]};
  }
  if(cycle.comparisonResolved||cycle.comparisonStopped)return {scheduled:[]};
  if(!cycle.comparisonPurposeReady){
    if(!cycle.challengeReady)return {scheduled:[]};
    if(cycle.comparisonDesignContractRepair){
      const id=cycle.comparisonPurposeWorkId+':contract-repair:v1';
      if(state.work.some(work=>work.id===id))return {scheduled:[]};
      await run.requestStrategicComparisonDesign({id,cycleId:cycle.id,teacherWorkId:cycle.teacherWorkId,
        designRevision:cycle.comparisonDesignRevision,contractRepairWorkId:cycle.comparisonPurposeWorkId});
      return {scheduled:[id]};
    }
    if(cycle.comparisonPurposeWorkId)return {scheduled:[]};
    if(!allowDecision||operationBusy)return {scheduled:[]};
    const teacher=state.work.find(w=>w.id===cycle.teacherWorkId);
    if(!teacher?.resultRef)return {scheduled:[]};
    const initialId=cycle.id+':question:decision';
    const previous=state.work.filter(w=>w.id===initialId||w.id.startsWith(initialId+':plan-r')).at(-1);
    // A Plan-only revision keeps this factual comparison context and its Teach
    // proposal, but not an unissued author's old Plan binding. Preserve that
    // stopped work and schedule a single current-Plan successor. Otherwise the
    // presence-only guard permanently strands this cycle after supersession.
    const id=previous?.status==='superseded'?initialId+':plan-r'+draft.revision:previous?.id??initialId;
    if(state.work.some(w=>w.id===id))return {scheduled:[],decisionValueStatus:'awaiting_initial_owner'};
    const continuity=await projectRosterComparisonProgressInputsV1({state,cycleId:cycle.id,readArtifact:run.readArtifact});
    await run.requestDecision({id,inputs:{
      ...continuity,
      initialComparisonQuestion:{source:'literal',value:{cycleId:cycle.id,teacherWorkId:teacher.id,teacherResultRef:teacher.resultRef}},
      // Read the saved proposal as history when its Plan was superseded. The
      // current full draft is supplied separately; history is neither current
      // Rules truth nor permission to mutate the old Plan/army.
      originalTeach:{source:'evidence',id:'role:'+teacher.id,pointer:'',
        scopeUsage:teacher.status==='superseded'?'historical_reference':'current_dependency'},
      strategicHypothesisCycle:{source:'literal',value:{id:cycle.id,version:4}}},
      question:continuity.initialRetentionProgress?{goal:'确认当前Plan变化是否改变先前已复核的保留决定。',
        instruction:continuity.initialRetentionProgress.value.instruction}:{goal:'在设计方法前，决定哪个真实策略取舍值得实验，并固定其假设与判据。',
        instruction:'读取当前军表/Plan和Teach提案，不把老师建议当事实。选择当前真正未定的两个合法方案，明确条件、收益与代价、可测假设及何种结果改变选择，用comparisonDesignRequest注册decisionPolicy v2。指标必须足以回答这个取舍，不能只测机制却承诺控点/得分；工具缺口明确报告，不能降低问题冒充解决。已有证据足够可直接作有依据的修改/保留，不为了实验而实验。此步不设计具体摆放、不执行Native、不宣称新策略已胜出。'}});
    return {scheduled:[id]};
  }
  // A syntactically valid model purpose is a proposal, not authorization.
  // Reuse the existing read-only reviewer and design author before any Native
  // methods; wrong frozen premises must not spawn a large supporting tree.
  if(!cycle.comparisonPreflightAccepted){
    const review=state.work.find(w=>w.id===cycle.comparisonPreflightWorkId);
    if(!review){
      const id=cycle.comparisonPurposeWorkId+':preflight:v1';
      await run.requestStrategicComparisonDesignReview({id,cycleId:cycle.id,
        purposeWorkId:cycle.comparisonPurposeWorkId,purposeResultRef:cycle.comparisonPurposeResultRef,
        designReviewRound:cycle.comparisonDesignRevision});
      return {scheduled:[id]};
    }
    if(review.status!=='evidence_ready')return {scheduled:[]};
    const designRevision=cycle.comparisonDesignRevision+1,id=cycle.id+':purpose:v'+designRevision;
    if(state.work.some(w=>w.id===id))return {scheduled:[]};
    await run.requestStrategicComparisonDesign({id,cycleId:cycle.id,teacherWorkId:cycle.teacherWorkId,
      designRevision,reviewWorkId:review.id,previousPurposeWorkId:cycle.comparisonPurposeWorkId});
    return {scheduled:[id]};
  }
  if(!cycle.comparisonExperimentAccepted){
    const id=cycle.comparisonExperimentId;
    if(state.work.some(w=>w.id===id))return {scheduled:[]};
    await run.requestExperiment({id,
      inputs:{comparisonPurpose:{source:'evidence',id:'role:'+cycle.comparisonPurposeWorkId,pointer:''},
        designPreflight:{source:'evidence',id:'role:'+cycle.comparisonPreflightWorkId,pointer:''},
        draft:{source:'evidence',id:`draft:r${draft.revision}:summary`,pointer:''}},
      question:{goal:'执行已经授权的限定策略比较，验证comparisonPurpose所声明的预期收益；现在不是再次决定要不要实验。',
        instruction:'先读取目的和已有实际工具证据，能用的原件直接复用，不重演成功动作。选择一个明确技能分臂／备选、固定参与单位/有效敌方目标、相同预算与几何，执行至机制产生收益后的观测终点。需要则用正常workOrders构造私有条件场景并查询/执行。先前只有支付或即时控点的回执不足以完成这个目的。比较可以支持、推翻或发现无效前置；缺实际观测不能称实验已完成，也不能因最终Plan暂未采用该能力就把本次用户要求的测量降成未来可选事项。只比较这个局部场景，不续成整场比赛、不伪造数值或已执行回执。若确有不可用工具/规则缺口，明确返回blocked；需要策略选择只针对本方法的假设/分臂交回，不编辑真实军表/Plan来代替测量。结果仍须独立来源和问题覆盖核对。'}});
    return {scheduled:[id]};
  }
  if(!cycle.comparisonPurposeAdopted){
    if(!allowDecision)return {scheduled:[]};
    const id=cycle.comparisonPurposeWorkId+':after-study:decision';
    if(state.work.some(w=>w.id===id))return {scheduled:[]};
    await run.requestDecision({id,inputs:{comparisonPurpose:{source:'evidence',id:'role:'+cycle.comparisonPurposeWorkId,pointer:''},
      comparisonDecisionContract:{source:'literal',value:rosterComparisonDecisionContractV1({
        purpose:rosterComparisonPurposeFromProposalV1(await run.readArtifact(cycle.comparisonPurposeResultRef)),designResultRef:cycle.comparisonPurposeResultRef,
        catalogue:state.work.find(w=>w.id===cycle.comparisonPurposeWorkId)?.inputs?.comparisonCapabilities?.value})},
      comparisonResult:{source:'evidence',id:'role:'+cycle.comparisonExperimentOwnerWorkId,pointer:''},
      comparisonResultAudit:{source:'evidence',id:'role:'+cycle.comparisonExperimentReviewId,pointer:''},
      strategicHypothesisCycle:{source:'literal',value:{id:cycle.id,version:3,
        instruction:'This decision owns the actual model-declared experiment purpose and expected benefit. Keep the purpose through child methods; legality/source checks are prerequisites, not substitutes for the comparison. Use the normal bounded experiment lane, then revise or give an evidence-backed retain. Do not claim an expectation is measured.'}}},
      question:{goal:'依据已经完成来源／问题核对的限定实验结果，决定是否优化军表与Plan并实际提交。',
        instruction:'同时读comparisonPurpose、comparisonResult、comparisonResultAudit和当前方案。明确哪个选择在什么条件下更好、收益/代价/反制及其依据，再选择实际revise或有依据retain。不强迫改表；必须解释证据怎样影响原选择，不能用合法/预算满分代替比较。若审查虽通过但仍不足以支撑真正比较，保留具体缺口并调查，不伪称已优化。'}});
    return {scheduled:[id]};
  }
  if(!cycle.ownerReturned)return {scheduled:[]};
  const review=state.work.find(w=>w.id===cycle.comparisonReviewWorkId);
  const schedule=async(round,suffix='')=>{
    const id=`${cycle.id}:comparison:plan-r${draft.revision}:round${round}${suffix}`;
    await run.requestStrategicComparisonReview({id,cycleId:cycle.id,reviewRound:round,
      teacherWorkId:cycle.teacherWorkId,ownerWorkId:cycle.ownerWorkId,ownerOutcomeRef:cycle.outcomeRef,
      purposeWorkId:cycle.comparisonPurposeWorkId,purposeResultRef:cycle.comparisonPurposeResultRef,
      studyOwnerWorkId:cycle.comparisonExperimentOwnerWorkId,studyResultRef:cycle.comparisonExperimentResultRef,
      studyReviewId:cycle.comparisonExperimentReviewId});
    return {scheduled:[id]};
  };
  if(!review)return schedule(1);
  if(review.status==='evidence_ready'&&(review.comparisonContractVersion!==5||review.comparisonPurposeResultRef!==cycle.comparisonPurposeResultRef
    ||review.comparisonExperimentResultRef!==cycle.comparisonExperimentResultRef))
    return schedule(review.reviewRound??1,':validity-contract-v5');
  if(review.status==='evidence_ready'&&cycle.comparisonOwnerReviewMatches===false)
    return schedule((review.reviewRound??1)+1);
  if(review.status!=='evidence_ready'||!allowDecision)return {scheduled:[]};
  const decisionId=review.id+':decision',decision=state.work.find(w=>w.id===decisionId);
  if(!decision){
    await run.requestDecision({id:decisionId,
      inputs:{comparisonReview:{source:'work',id:review.id,pointer:'/value'},
        ...(review.inputs.comparisonDecisionContract?{comparisonDecisionContract:structuredClone(review.inputs.comparisonDecisionContract)}:{}),
        comparisonPurpose:{source:'evidence',id:'role:'+cycle.comparisonPurposeWorkId,pointer:''},
        comparisonResult:{source:'evidence',id:'role:'+cycle.comparisonExperimentOwnerWorkId,pointer:''},
        currentHypothesisTeach:{source:'evidence',id:'role:'+cycle.teacherWorkId,pointer:'',scopeUsage:'historical_reference'},
        strategicHypothesisCycle:{source:'literal',value:{id:cycle.id,version:2,
          instruction:'Resolve WHICH IS BETTER under stated conditions, not another legality-only log. Existing source/evidence must remain attributable; declaring a comparison optional does not supply its missing measurement. You may reject an irrelevant test with reasons and compare a more decision-relevant alternative instead. No forced roster edit or full-game rehearsal.'}}},
      question:{goal:'完成当前尚未成立的“哪个更好”比较，并依据结果修订军表／Plan或有证据地保留。',
        instruction:'先回答独立比较审核指出的缺口。若需新实验，明确两方案、同一前态、可变因素、需要观测的真实收益与代价、反制，以及不同结果怎样改变选择。必须测到能力产生收益的步骤之后；只完成支付/移除标记不等于取得收益。前置条件失败是实验无效，未测结果是证据不足，不能据此推翻收益假设。只做限定场景，不扩成整场比赛。已有证据足够就精确比较并说明适用边界；不要求为了演示而改表，也不以计划篇幅、合法性或快照固定代替论证。'}});
    return {scheduled:[decisionId]};
  }
  if(['evidence_ready','superseded'].includes(decision.status)&&decision.draftOutcomeRef)return schedule((review.reviewRound??1)+1);
  return {scheduled:[]};
}

// One owner handoff Interface for the product scheduler and scoped debugger.
// It carries the actual design/review, never a fabricated negative verdict.
export function createRosterComparisonOwnerDecisionInputV1({cycle,ownerReturn}){
  return {id:ownerReturn.id,inputs:{
    comparisonPurpose:{source:'evidence',id:'role:'+ownerReturn.purposeWorkId,pointer:'',scopeUsage:'historical_reference'},
    ...(ownerReturn.reviewResultRef?{rejectedDesignReview:{source:'evidence',id:'role:'+ownerReturn.reviewId,pointer:''}}:{}),
    comparisonOwnerReturn:{source:'literal',value:ownerReturn},
    strategicHypothesisCycle:{source:'literal',value:{id:cycle.id,version:4}}},
    question:{goal:'先明确实验能改变哪个实际策略选择；效果改善不是程序替你选择方案的依据。',
      instruction:'阅读当前军表/Plan、原委派和已有逐项审核。旧审核通过不替代你的资源取舍。规则事实已明确的问题先用来源回答，不为重复证明机制而造实验。若仍需比较，用comparisonDesignRequest给出真实两方案、tradeoff及decisionPolicy：目标、指标与目标的联系、支持/反驳/无差异各选谁、实际Plan怎样变化和为何值得相应代价。支持指效果假设成立，不自动意味着新方案更优；不能只换用途措辞或声明愿付费。数值效用不是强制项，但目标优先级、时机和代价依据必须具体；不要把无法在该时机使用的技能当作现成备选。若主指标只测机制、不能区分真正选择，应重新限定有用问题，或明确已有依据足够而走保留/结束审核；不是无限设计。没有实测就不声称比较完成。若应改Plan走结构化修改；原未测事项保留，次数/费用不清零，不启动Native或整场模拟。'}};
}

// One read-only handoff for decision, Teach and method consumers. An original
// challenge is not the current state of its comparison. Reuse the SAME cycle
// assessment as product scheduling; never infer completion from prose or refs.
// Independent source judges deliberately do not receive prior verdicts here.
export async function loadRosterProductHypothesisChallengeV1({state,draft,readArtifact,role='roster_workflow_strategy_decision',includeArchiveSources=false}){
  if(!['roster_workflow_strategy_decision','roster_workflow_local_teach','roster_workflow_experiment_planner'].includes(role))return null;
  if(!draft?.plan)return null;
  const id=rosterProductHypothesisCycleIdV1(state,draft),completed=await completedTeacher(state,id,readArtifact);
  if(!completed)return null;
  const {work:teacher,result}=completed;
  const cycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact});
  const byId=new Map(state.work.map(work=>[work.id,work]));
  const factKeys=['army','rules','map','source'];
  const sameFacts=work=>work&&factKeys.every(key=>work.bindings?.[key]===state.scope[key]);
  if(!sameFacts(teacher))return null;
  const dependencies=[cycle.comparisonPurposeWorkId,cycle.comparisonPreflightWorkId,
    cycle.comparisonExperimentOwnerWorkId,cycle.comparisonExperimentReviewId,cycle.ownerWorkId,cycle.comparisonReviewWorkId]
    .filter(Boolean).map(workId=>byId.get(workId));
  const staleDependencyWorkIds=dependencies.filter(work=>!sameFacts(work)).map(work=>work?.id??null);
  const currentFacts=staleDependencyWorkIds.length===0;
  const origin=work=>{
    const number=state.evidence.findIndex(e=>e.id==='role:'+work.id);
    const evidence=number<0?null:state.evidence[number];
    return {workId:work.id,resultRef:work.resultRef,bindings:structuredClone(work.bindings),
      appliesToCurrentPlan:work.bindings?.plan===state.scope.plan,
      exactSource:evidence?{evidenceNumber:number+1,evidenceId:evidence.id,artifactRef:evidence.artifactRef,pointer:''}:null};
  };
  const experimentWork=byId.get(cycle.comparisonExperimentOwnerWorkId);
  const experiment=currentFacts&&experimentWork?.status==='evidence_ready'&&experimentWork.resultRef
    ?await readArtifact(experimentWork.resultRef):null;
  const ownerWork=currentFacts&&cycle.ownerReturned?byId.get(cycle.ownerWorkId):null;
  const outcome=ownerWork?await readArtifact(cycle.outcomeRef):null;
  const reviewWork=byId.get(cycle.comparisonReviewWorkId);
  const review=currentFacts&&reviewWork?.status==='evidence_ready'&&reviewWork.resultRef
    ?await readArtifact(reviewWork.resultRef):null;
  const comparisonMemory={schema:'roster_comparison_handoff_v1',cycleId:id,
    status:currentFacts?cycle.status:'stale_dependency',staleDependencyWorkIds,
    ownerReturned:currentFacts&&cycle.ownerReturned,comparisonResolved:currentFacts&&cycle.comparisonResolved,
    comparisonStatus:cycle.comparisonStatus,
    comparisonResolutionKind:cycle.comparisonResolutionKind??null,
    designReturn:currentFacts?cycle.comparisonDesignReturn??null:null,
    design:currentFacts&&byId.get(cycle.comparisonPurposeWorkId)?{
      workId:cycle.comparisonPurposeWorkId,resultRef:cycle.comparisonPurposeResultRef,
      revision:cycle.comparisonDesignRevision}:null,
    ...(includeArchiveSources?{purpose:currentFacts&&byId.get(cycle.comparisonPurposeWorkId)
      ?{...origin(byId.get(cycle.comparisonPurposeWorkId)),value:rosterComparisonPurposeFromProposalV1(
        await readArtifact(cycle.comparisonPurposeResultRef))}:null}:{}),
    experiment:experiment?{...origin(experimentWork),status:cycle.comparisonExperimentStatus,
      acceptedForStrategy:cycle.comparisonExperimentAccepted,
      ...(includeArchiveSources?{sourceReview:byId.get(cycle.comparisonExperimentReviewId)?origin(byId.get(cycle.comparisonExperimentReviewId)):null}:{}),
      conclusion:structuredClone(experiment.value.experimentConclusion??null),
      unresolvedQuestions:structuredClone(experiment.value.unresolvedQuestions??[]),
      conditions:structuredClone(experiment.conditions??[])}:null,
    owner:outcome?{...origin(ownerWork),outcomeRef:cycle.outcomeRef,applied:outcome.applied===true,
      status:outcome.status,decision:structuredClone(outcome.decision)}:null,
    review:review?{...origin(reviewWork),publicReason:review.value.publicReason,
      checks:structuredClone(review.value.checks??[]),conditions:structuredClone(review.conditions??[])}:null,
    strategyImprovementProven:false,acceptanceGranted:false,trainingTruth:false};
  return {sourceWorkId:teacher.id,sourceResultRef:teacher.resultRef,consumerRole:role,
    mayAdoptStrategy:role==='roster_workflow_strategy_decision',comparisonMemory,
    sourcePlanBinding:teacher.bindings?.plan??null,currentPlanBinding:state.scope.plan,
    sameArmyRulesMapSource:true,proposal:structuredClone(result.value),
    claimsAreRulesTruth:false,strategicAdoptionGranted:false,
    instruction:'The original challenge is historical intent, not a fresh unresolved order. comparisonMemory carries the SAME product cycle status and exact saved scoped conclusion, author choice and review when available. Consume those actual results and limitations before proposing further work; an inconclusive finding remains inconclusive, and a supported retain does not prove improvement or approve the Plan. Same factual context may survive Plan-only edits; appliesToCurrentPlan=false is historical reasoning, not current Plan approval. Pending, missing or stale results are not completed facts. A distinct necessary comparison is allowed, but explain its new decision-relevant question rather than reopening a completed question because its answer was omitted. Only the strategic owner may adopt/change a strategy; Teach proposes and method roles stay within their assigned question. Exact sources remain readable for verification. No forced edit, global optimality or whole-game simulation.'};
}

export async function requestRosterHypothesisCycleV1({run,id,phase='both'}){
  if(!['both','challenge','owner'].includes(phase))throw Error('ROSTER_HYPOTHESIS_PHASE_INVALID');
  const current=await run.inspect();
  if(!current.draftRef)throw Error('ROSTER_HYPOTHESIS_CYCLE_DRAFT_REQUIRED');
  const completed=await completedTeacher(current,id,run.readArtifact),previousTeach=stageWorks(current,id,'teach').at(-1);
  const teachId=completed?.work.id??(previousTeach?.status==='superseded'
    ?id+':teach:plan-r'+current.draftRevision:previousTeach?.id??id+':teach');
  const previousOwner=stageWorks(current,id,'decision').at(-1),decisionId=previousOwner?.status==='superseded'
    ?id+':decision:plan-r'+current.draftRevision:previousOwner?.id??id+':decision',scheduled=[];
  if(phase!=='owner'&&!current.work.some(w=>w.id===teachId)){
    const prefix=`draft:r${current.draftRevision}`;
    const intentId=prefix+':plan:publicSummaryText';
    const hasPlanIntent=current.evidence.some(entry=>entry.id===intentId);
    await run.requestTeach({id:teachId,
      inputs:{draft:{source:'evidence',id:prefix+':summary',pointer:''},
        ...(hasPlanIntent?{currentPlanIntent:{source:'evidence',id:intentId,pointer:''}}:{})},
      question:'本步只做战略假设设计，不做总体验收，也不修改军表或Plan。先审视当前修订及已交付的作者处理理由。仅当有新的相关变化、新证据、先前理由的具体事实错误或尚未回答的必要取舍时，从当前Skill、军表及Plan中提出一项有决策价值的质疑，并说明为什么这次需要重开。不得仅因修订号变化、无关单位更换或尚未证明全局最优，重复要求已经有条件性理由的比较。没有具体新问题时可返回proposals=[]并说明保留；这不批准整份Plan，也不删除必要事实缺口。确需提案时先读必要来源，交付：当前假设、可信备选、相同条件、变化因素、什么实际观察会支持或推翻、两种结果分别会改变哪个选择。用proposals.alternatives和disconfirmation表达，必要事实放requiredData；最终取舍仍属后续总体规划。已经纠正了某个引用或军表合法，不等于证明了选择优于备选；不要把全军实际进场历史或未来逐轮实得分作为默认先决条件。已有证据足够就指出对应比较和限制，缺真实能力就具体说，不能编造结果、强迫换单位或泛泛复述所有旧待查项。局部火力、路线、资源或固定争点及明确反制可实验；禁止整场模拟。不要求最优保证，也不注入倾向进攻或保守的偏好。'});
    scheduled.push(teachId);
  }
  if(phase!=='challenge'&&!current.work.some(w=>w.id===decisionId)){
    await run.requestDecision({id:decisionId,
      question:'消费本次独立Teach的具体战略假设和备选，不把任务替换成旧引用修正或全军到达调查。选择一项对军表或获胜路线真正有影响的取舍：如已有实际证据可比较，说明为何采纳/驳回并实际修订或有依据保留；若需事实，以investigate授权有边界的对照，明确假设、备选、控制条件、变化因素、支持/反驳观察、新信息和结果如何改变选择，交实验角色用hypothesisTest执行。仅记录事实不算战略采纳。允许审慎保留，但理由应回答Teach提出的实际比较，不以“表合法/当前快照固定”替代；若质疑无价值也应就其内容说明原因。最终仍须来源和受影响审核，不声明整流程已通过。',
      inputs:{currentHypothesisTeach:completed?{source:'evidence',id:'role:'+teachId,pointer:'',
          scopeUsage:completed.work.status==='superseded'?'historical_reference':'current_dependency'}
          :{source:'work',id:teachId,pointer:'/value'},
        strategicHypothesisCycle:{source:'literal',value:{id,version:1,
          originalTeachPlanBinding:completed?.work.bindings?.plan??null,currentPlanBinding:current.scope.plan,
          instruction:'This is a strategic disposition, not fact bookkeeping. After the actual challenge/evidence, choose revise, evidence-backed retain, or a specific necessary investigate. record_facts alone does not answer the comparison. Preserve supported strategies; neither a forced army edit nor a forced experiment is required when exact existing evidence already resolves the meaningful comparison. Any newly measured result remains conditional and needs independent review.'}}}});
    scheduled.push(decisionId);
  }
  return {teachId,decisionId,scheduled,usesSameProductRun:true,forcedRosterEdit:false};
}
