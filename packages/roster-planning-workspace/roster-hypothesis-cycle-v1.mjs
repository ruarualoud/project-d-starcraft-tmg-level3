// P2/P4 orchestration through the SAME public Run methods used by product
// callers. The challenger proposes; the strategic owner decides. No sidecar
// model calls, direct army edits, invented receipts or tactical ranking.
import {createHash} from 'node:crypto';
import {rosterComparisonPurposeFromProposalV1,ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1,
  ROSTER_COMPARISON_PREFLIGHT_OBLIGATIONS_V1,rosterComparisonDesignContractRepairV1,
  rosterComparisonPreflightContractRepairV1,rosterComparisonArmyBaselineCheckedV1} from '../roster-strategist/roster-comparison-purpose-v1.mjs';
import {assessRosterExperimentConclusionV1} from '../roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {rosterReviewCheckPassedV1,rosterPendingQuestionWorkV1} from '../roster-strategist/roster-review-data-questions-v1.mjs';
import {createRosterWorkflowGraphV1} from '../roster-strategist/roster-workflow-graph-v1.mjs';
import {resolveRosterComparisonDesignRequestV1} from '../roster-strategist/roster-comparison-redesign-v1.mjs';
import {assessRosterComparisonClosureV1} from '../roster-strategist/roster-comparison-closure-v1.mjs';
import {assessRosterComparisonPrerequisitesV1,progressRosterComparisonPrerequisitesV1} from '../roster-strategist/roster-comparison-prerequisites-v1.mjs';
export {ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1};

// This key identifies a factual experimental context, not each prose revision.
// New armies/maps/rules/sources need a new challenge; Plan-only wording changes
// retain the actual prior challenge and its trace, rather than buying it again.
export function rosterProductHypothesisCycleIdV1(state,draft){
  const context={mode:draft.mode,...Object.fromEntries(['army','rules','map','source'].map(key=>[key,state.scope[key]]))};
  return 'product:strategy-hypothesis:v1:'+createHash('sha256').update(JSON.stringify(context)).digest('hex').slice(0,20);
}

const stageWorks=(state,id,stage)=>state.work.filter(w=>w.id===id+':'+stage||w.id.startsWith(id+':'+stage+':plan-r'));
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
  const purposeWork=state.work.findLast(w=>w.strategyComparisonDesignCycleId===id);
  const purpose=purposeWork?.status==='evidence_ready'&&purposeWork.resultRef
    ?rosterComparisonPurposeFromProposalV1(await readArtifact(purposeWork.resultRef)):null;
  const designContractRepair=!purpose&&purposeWork
    ?await rosterComparisonDesignContractRepairV1({work:purposeWork,readArtifact}):null;
  const preflight=purposeWork?state.work.findLast(w=>w.strategyComparisonDesignReviewCycleId===id
    &&w.comparisonPurposeResultRef===purposeWork.resultRef):null;
  const preflightChecks=preflight?.status==='evidence_ready'&&preflight.resultRef
    ?(await readArtifact(preflight.resultRef)).value?.checks??[]:[];
  const preflightAccepted=Boolean(purpose&&ROSTER_COMPARISON_PREFLIGHT_OBLIGATIONS_V1.every(obligation=>
    preflightChecks.some(check=>check.checkId===obligation.checkId&&rosterReviewCheckPassedV1(check)&&check.evidenceRefs?.length))
    &&await rosterComparisonArmyBaselineCheckedV1({work:preflight,checks:preflightChecks,readArtifact,armyHash:state.scope.army}));
  const designRevision=purposeWork?.designRevision??1;
  const prerequisites=!preflightAccepted?await assessRosterComparisonPrerequisitesV1({state,preflight,
    checks:preflightChecks,readArtifact}):null;
  const preflightStopped=Boolean(prerequisites?prerequisites.stopped
    :preflight?.status==='evidence_ready'&&!preflightAccepted&&designRevision>=3);
  const preflightContractRepair=!preflightAccepted&&preflight
    ?await rosterComparisonPreflightContractRepairV1({work:preflight,readArtifact}):null;
  const studyId=(purposeWork?.id??id+':purpose:v1')+':study';
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
    &&comparison?.comparisonPurposeResultRef===purposeWork.resultRef
    &&comparison.comparisonExperimentResultRef===studyOwner.resultRef
    &&ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1.every(o=>comparisonChecks.some(c=>
    c.checkId===o.checkId&&rosterReviewCheckPassedV1(c)&&c.evidenceRefs?.length)));
  const result={id,status:!teach?'not_started':!completed?'awaiting_challenger':'awaiting_owner',teacherWorkId:teach?.id??null,challengeReady:Boolean(completed),
    ownerReturned:false,comparisonResolved,comparisonReviewWorkId:comparison?.id??null,
    comparisonPurposeReady:Boolean(purpose),comparisonPurposeAdopted:false,comparisonPurposeWorkId:purposeWork?.id??null,
    comparisonPurposeResultRef:purposeWork?.resultRef??null,
    comparisonDesignContractRepair:designContractRepair,
    comparisonDesignRevision:designRevision,comparisonPreflightWorkId:preflight?.id??null,
    comparisonPreflightAccepted:preflightAccepted,comparisonPreflightStopped:preflightStopped,
    comparisonPreflightContractRepair:preflightContractRepair,
    comparisonPrerequisites:prerequisites,
    comparisonExperimentId:studyId,comparisonExperimentStatus:study.status,
    comparisonExperimentAccepted:study.acceptedForStrategy===true,comparisonExperimentOwnerWorkId:studyOwner?.id??null,
    comparisonExperimentResultRef:studyOwner?.resultRef??null,comparisonExperimentReviewId:study.reviewId??null,
    comparisonMissingCheckIds,
    comparisonReviewResultRef:comparison?.resultRef??null,comparisonRound:comparison?.reviewRound??0,
    comparisonStatus:!comparison?'not_started':comparisonResolved?'compared':comparison.status==='evidence_ready'?'needs_resolution':'reviewing',
    comparisonStopped:preflightStopped||Boolean(comparison?.status==='evidence_ready'&&comparison.comparisonContractVersion===5&&!comparisonResolved&&comparison.reviewRound>=3),
    strategyImprovementProven:false};
  const closure=await assessRosterComparisonClosureV1({state,cycle:result,readArtifact});
  const closedGoal=state.work.find(w=>w.id===studyId);
  if(closure.accepted&&closedGoal?.comparisonClosure?.reviewResultRef===closure.review.resultRef)
    return {...result,status:'owner_returned',ownerReturned:true,comparisonResolved:true,comparisonPurposeAdopted:true,
      comparisonResolutionKind:'reviewed_optional_retention',comparisonStatus:'optional_comparison_closed',
      comparisonExperimentAccepted:false,comparisonExperimentStatus:'unmeasured_not_required_for_chosen_decision',
      ownerWorkId:closure.request.authorWorkId,outcomeRef:closure.request.authorOutcomeRef,
      comparisonReviewWorkId:closure.review.id,comparisonReviewResultRef:closure.review.resultRef,
      comparisonStopped:false,strategyImprovementProven:false};
  if(closure.request){
    result.comparisonClosurePending=true;
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
    if(purpose&&work.inputs.comparisonPurpose?.id!=='role:'+purposeWork.id
      &&work.inputs.comparisonPurpose?.value?.sourceWorkId!==purposeWork.id)continue;
    if(!study.acceptedForStrategy||work.inputs.comparisonResult?.id!=='role:'+studyOwner.id)continue;
    if(outcome.applied===true||retained)return {...result,status:'owner_returned',ownerReturned:true,comparisonPurposeAdopted:Boolean(purpose),
      disposition:outcome.applied===true?'revised':'retained',ownerWorkId:work.id,outcomeRef:work.draftOutcomeRef};
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
  const closure=await assessRosterComparisonClosureV1({state,cycle,readArtifact:run.readArtifact});
  if(closure.review?.resultRef!==policy.sourceReviewResultRef)fail('ROSTER_COMPARISON_AUTHORIZATION_SOURCE_MISMATCH');
  if(!cycle.comparisonStopped||closure.accepted||closure.review.status!=='evidence_ready')fail('ROSTER_COMPARISON_NOT_AT_STOPPED_REVIEW');
  const id=closure.review.id+':decision';
  if(state.work.some(w=>w.id===id))fail('ROSTER_COMPARISON_AUTHOR_ALREADY_SCHEDULED');
  const grant={version:1,authorizationId:policy.authorizationId,cycleId:cycle.id,
    sourceReviewId:closure.review.id,sourceReviewResultRef:closure.review.resultRef,
    previousReviewCount:cycle.comparisonClosureReviewCount,additionalReviewLimit:1,
    instruction:'Explicit permission for one author revision and one independent final review using existing evidence. Preserve all prior reviews, questions and costs. Correct the rejected relied-on premises and explain the strategic tradeoff. No new Native experiment, whole-match rehearsal or automatic Plan approval is authorized.'};
  await requestClosureFeedbackDecision(run,closure,cycle,{comparisonReviewAuthorization:{source:'literal',value:grant}});
  return {scheduled:[id],authorWorkId:id,alreadyAuthorized:false,previousReviewCount:grant.previousReviewCount,additionalReviewLimit:1};
}

async function requestClosureFeedbackDecision(run,closure,cycle,extraInputs={}){
  const id=closure.review.id+':decision';
  const instruction=extraInputs.comparisonReviewAuthorization
    ?'本次只授权复用现有证据修订作者理由和Plan，再独立终审。请纠正被否决的原句并解释取舍，不重算实验、不申请新调查或重设计比较。保留未测条件和无关未决事项；证据若确实不足，明确说明并停止，而非捏造结论。'
    :'缺影响当前选择的事实则授权有区分力的限定查询；理由或当前Plan有错误则纠正；若能基于现有证据保留则明确申请结束比较并保留未测条件。审核反馈不是新的规则；不要把未测变成劣势，不重演已成功实验。';
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
  // A single explicit decision, not another factual batch. Review it before
  // resuming the old study; the independent reviewer cannot waive current facts.
  const closure=await assessRosterComparisonClosureV1({state,cycle,readArtifact:run.readArtifact});
  if(closure.request&&!cycle.comparisonResolved){
    if(state.work.some(w=>w.status==='running'||w.operationState?.pending))return {scheduled:[]};
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
  const redesign=allowDecision?await resolveRosterComparisonDesignRequestV1({state,cycle,readArtifact:run.readArtifact}):null;
  if(redesign){
    const id=cycle.id+':purpose:v'+redesign.designRevision;
    if(state.work.some(w=>w.id===id))return {scheduled:[]};
    await run.requestStrategicComparisonDesign({id,cycleId:cycle.id,teacherWorkId:cycle.teacherWorkId,
      designRevision:redesign.designRevision,previousPurposeWorkId:redesign.purposeWorkId,authorWorkId:redesign.authorWorkId});
    return {scheduled:[id]};
  }
  const oldClosure=state.work.find(w=>w.id===cycle.comparisonExperimentId)?.comparisonClosure;
  if(!closure.request&&!cycle.comparisonResolved&&oldClosure){
    if(!allowDecision||state.work.some(w=>w.status==='running'||w.operationState?.pending))return {scheduled:[]};
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
    if(cycle.comparisonResolutionKind!=='reviewed_optional_retention')await run.archiveConditionalConclusion();
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
  if(cycle.comparisonPrerequisites)
    return progressRosterComparisonPrerequisitesV1({run,state,cycle,draft});
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
    const id=cycle.id+':purpose:v1';
    await run.requestStrategicComparisonDesign({id,cycleId:cycle.id,teacherWorkId:cycle.teacherWorkId});
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
  if(review.status!=='evidence_ready'||!allowDecision)return {scheduled:[]};
  const decisionId=review.id+':decision',decision=state.work.find(w=>w.id===decisionId);
  if(!decision){
    await run.requestDecision({id:decisionId,
      inputs:{comparisonReview:{source:'work',id:review.id,pointer:'/value'},
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
    await run.requestTeach({id:teachId,
      inputs:{draft:{source:'evidence',id:`draft:r${current.draftRevision}:summary`,pointer:''}},
      question:'本步只做战略假设设计，不做总体验收，也不修改军表或Plan。从当前Skill、军表及Plan的选表理由、获胜路线、单位协同、反制和风险中，选一项最有决策价值而尚未充分比较的取舍。先读必要来源，交付一项具体Teach提案：当前假设、可信备选、相同条件、变化因素、什么实际观察会支持或推翻、两种结果分别会改变哪个选择。用proposals.alternatives和disconfirmation表达，必要事实放requiredData；最终取舍仍属后续总体规划。已经纠正了某个引用或军表合法，不等于证明了选择优于备选；不要把全军实际进场历史或未来逐轮实得分作为默认先决条件。已有证据足够就指出对应比较和限制，缺真实能力就具体说，不能编造结果、强迫换单位或泛泛复述所有旧待查项。局部火力、路线、资源或固定争点及明确反制可实验；禁止整场模拟。不要求最优保证，也不注入倾向进攻或保守的偏好。'});
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
