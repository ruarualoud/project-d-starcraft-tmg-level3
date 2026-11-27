// The initial author may decline an unnecessary experiment. Review that actual
// choice without inventing a design, a measured result or another author reply.
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {isRosterWorkflowNonRevisionOutcomeV1} from './roster-workflow-decision-records-v1.mjs';
import {rosterPendingQuestionWorkV1,rosterReviewCheckPassedV1} from './roster-review-data-questions-v1.mjs';
import {projectRosterWorkflowAuthorDraftInputV1} from './roster-workflow-draft-v1.mjs';

export const ROSTER_INITIAL_RETENTION_CHECKS_V1=[
  {checkId:'initial_retention_tradeoff',question:'审核作者实际保留的方案与拒绝的替代：为了哪个目标、在什么条件下、保留什么收益并承担什么代价？依据须支持这个有限选择；缺少反证不等于更优，预算已满/固定快照也不能代替战略理由。不要求全球最优，不强迫改表。'},
  {checkId:'initial_retention_premises',question:'仅核对用于这次保留选择的实际Plan主张与引用原件。必要的规则、支付、路线或量化事实是否真有依据？条件性单单位见证不能证明整军到达/未来VP；缺工具或尚未测试不等于事实为真。具体指出本地依赖，其他全局审核仍独立继续。'},
  {checkId:'initial_retention_scope',question:'原Teach提出的比较为何可暂不执行？哪些假设仍未测、影响哪个选择、何时用新证据重开？保留未测状态和风险；不能把当前方案依赖的必要事实藏成optional。允许有理由的暂定选择，不以实验未执行本身否决，也不宣称比较已成功或策略提升。'},
];

// A Plan-only reconsideration is dispatched by the common closure lane. Its
// saved typed review already owns the initial question/held comparison identity;
// the model must not copy those internal fields into its retention decision.
function inheritedInitialRetention(state,owner,cycleId){
 const prior=owner.inputs?.previousComparisonClosure?.value;
 if(prior?.reviewKind!=='initial_retention'||owner.inputs?.strategicHypothesisCycle?.value?.id!==cycleId)return null;
 const review=state.work.find(w=>w.id===prior.reviewId),source=review?.inputs?.initialRetentionScope?.value;
 if(review?.initialRetentionCycleId!==cycleId||review.initialRetentionOf!==prior.authorWorkId
   ||review.resultRef!==prior.reviewResultRef||!['evidence_ready','superseded'].includes(review.status)
   ||review.draftRevision>=owner.draftRevision||source?.cycleId!==cycleId
   ||source.authorWorkId!==prior.authorWorkId||source.initialQuestion?.cycleId!==cycleId
   ||!['army','rules','map','source'].every(k=>review.bindings?.[k]===owner.bindings?.[k]))return null;
 const author=state.work.find(w=>w.id===prior.authorWorkId);
 if(author?.resultRef!==review.initialRetentionResultRef||author.draftOutcomeRef!==review.initialRetentionOutcomeRef)return null;
 const held=source.heldComparison,goal=state.work.find(w=>w.id===held?.goalId),purpose=state.work.find(w=>w.id===held?.purposeWorkId);
 if(held&&(!goal||goal.inputs?.comparisonPurpose?.id!=='role:'+purpose?.id
   ||purpose?.strategyComparisonDesignCycleId!==cycleId||purpose.resultRef!==held.purposeResultRef))return null;
 return {question:source.initialQuestion,heldComparison:held??null};
}
function initialRetentionQuestion(state,owner,cycleId){
 const question=owner.inputs?.initialComparisonQuestion?.value;
 return question?.cycleId===cycleId?question:inheritedInitialRetention(state,owner,cycleId)?.question??null;
}

// A design may remain as immutable history after its owner explicitly holds it
// to reconsider a previously reviewed retention. Follow only that typed lineage.
export function rosterHeldInitialRetentionComparisonV1({state,cycleId,authorWorkId}){
  let owner=state.work.find(w=>w.id===authorWorkId);const seen=new Set();
  while(owner&&!seen.has(owner.id)){
    seen.add(owner.id);
    const inherited=inheritedInitialRetention(state,owner,cycleId);
    if(inherited)return inherited.heldComparison;
    const repair=owner.inputs?.retentionDeliveryRepair?.value;
    if(repair?.version===1){
      const previous=state.work.find(w=>w.id===repair.sourceWorkId);
      const goal=state.work.find(w=>w.id===owner.investigationFrontierOf);
      const purpose=state.work.find(w=>goal?.inputs?.comparisonPurpose?.id==='role:'+w.id);
      if(previous?.resultRef!==repair.sourceResultRef||repair.toRevision!==state.draftRevision
        ||purpose?.strategyComparisonDesignCycleId!==cycleId||purpose.comparisonRedesignOf!==previous.id
        ||purpose.comparisonRedesignResultRef!==previous.resultRef||goal?.experimentGoalId!==goal.id
        ||goal.investigationHandoff?.decisionId!==owner.id||!goal.investigationHandoff.reportRef
        ||!rosterWorkflowBindingsMatchV1(owner.bindings,state.scope))return null;
      return {goalId:goal.id,purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,
        heldByWorkId:owner.id,handoffReportRef:goal.investigationHandoff.reportRef};
    }
    const link=owner.inputs?.initialRetentionReview;
    const review=link?.source==='evidence'&&state.work.find(w=>'role:'+w.id===link.id);
    if(review?.initialRetentionCycleId!==cycleId||!review.resultRef)return null;
    owner=state.work.find(w=>w.id===review.initialRetentionOf);
  }
  return null;
}

export async function assessRosterInitialRetentionV1({state,cycleId,readArtifact}){
  // Select the explicit CURRENT initial-question lineage, including its review
  // feedback successor. A pending/latest reply cannot fall back to an old pass.
  const owner=state.work.filter(w=>w.role==='roster_workflow_strategy_decision'
    &&initialRetentionQuestion(state,w,cycleId)
    &&w.draftRevision===state.draftRevision&&rosterWorkflowBindingsMatchV1(w.bindings,state.scope)).at(-1);
  if(owner?.status!=='evidence_ready'||owner.operationState?.pending||!owner.resultRef||!owner.draftOutcomeRef)return null;
  const [result,outcome]=await Promise.all([readArtifact(owner.resultRef),readArtifact(owner.draftOutcomeRef)]);
  const decision=result.value?.decisions?.[0];
  if(result.kind!=='proposal'||result.value?.decisions?.length!==1||decision?.disposition!=='retain'
    ||!isRosterWorkflowNonRevisionOutcomeV1(outcome,decision)||outcome.evidenceRecorded
    ||decision.mutation!==null||decision.nextInvestigation||decision.workflowBlocker
    ||decision.comparisonDesignRequest||decision.comparisonClosureRequest
    ||!decision.publicReason?.trim()||!decision.evidenceRefs?.length)return null;
  const pending=rosterPendingQuestionWorkV1(decision);
  if(pending.facts.length||pending.authorDecisions.length)return null;
  const question=initialRetentionQuestion(state,owner,cycleId),teacher=state.work.find(w=>w.id===question.teacherWorkId);
  if(!teacher?.resultRef||teacher.resultRef!==question.teacherResultRef)return null;
  const review=state.work.find(w=>w.initialRetentionCycleId===cycleId&&w.initialRetentionOf===owner.id
    &&w.initialRetentionResultRef===owner.resultRef&&w.initialRetentionOutcomeRef===owner.draftOutcomeRef
    &&w.draftRevision===state.draftRevision&&rosterWorkflowBindingsMatchV1(w.bindings,state.scope));
  const checks=review?.status==='evidence_ready'&&!review.operationState?.pending&&review.resultRef
    ?(await readArtifact(review.resultRef))?.value?.checks??[]:[];
  const accepted=ROSTER_INITIAL_RETENTION_CHECKS_V1.every(o=>{
    const rows=checks.filter(c=>c.checkId===o.checkId);
    return rows.length===1&&rows[0].verdict==='supported'&&rosterReviewCheckPassedV1(rows[0])&&rows[0].evidenceRefs?.length;
  });
  let completedReviewCount=0,consecutiveFailedReviewCount=0;
  for(const item of state.work.filter(w=>w.initialRetentionCycleId===cycleId&&w.resultRef
    &&['evidence_ready','superseded'].includes(w.status))){
    const priorChecks=(await readArtifact(item.resultRef))?.value?.checks??[];
    if(!priorChecks.length)continue;
    completedReviewCount++;
    const passed=ROSTER_INITIAL_RETENTION_CHECKS_V1.every(o=>{
      const rows=priorChecks.filter(c=>c.checkId===o.checkId);
      return rows.length===1&&rows[0].verdict==='supported'&&rosterReviewCheckPassedV1(rows[0])&&rows[0].evidenceRefs?.length;
    });
    // Preserve every review. The stop limits failed convergence, not successful
    // confirmations followed by unrelated Plan fact corrections.
    consecutiveFailedReviewCount=passed?0:consecutiveFailedReviewCount+1;
  }
  return {version:1,cycleId,authorWorkId:owner.id,authorResultRef:owner.resultRef,authorOutcomeRef:owner.draftOutcomeRef,
    heldComparison:rosterHeldInitialRetentionComparisonV1({state,cycleId,authorWorkId:owner.id}),
    initialQuestion:structuredClone(question),teacherWorkId:teacher.id,reviewId:review?.id??owner.id+':retention-review',
    reviewResultRef:review?.resultRef??null,reviewStatus:review?.status??null,checks:structuredClone(checks),
    completedReviewCount,consecutiveFailedReviewCount,accepted,stopped:!accepted&&consecutiveFailedReviewCount>=3,
    status:accepted?'accepted':review?.status==='evidence_ready'?'rejected':review?'reviewing':'required',
    unresolvedHypotheses:structuredClone(decision.optionalData??decision.dataQuestions?.filter(q=>q.classification==='optional_probe')??[]),
    comparisonEvidenceStatus:'not_proven',strategyImprovementProven:false,acceptanceGranted:false};
}

export async function createRosterInitialRetentionReviewV1({state,draft,cycleId,authorWorkId,readArtifact}){
  const source=await assessRosterInitialRetentionV1({state,cycleId,readArtifact});
  if(!source||source.authorWorkId!==authorWorkId||source.stopped)throw Error('ROSTER_EXACT_INITIAL_RETENTION_REQUIRED');
  if(source.reviewStatus)return null;
  return {id:source.reviewId,role:'roster_workflow_final_review',bindings:state.scope,draftRevision:state.draftRevision,
    initialRetentionCycleId:cycleId,initialRetentionOf:authorWorkId,initialRetentionResultRef:source.authorResultRef,
    initialRetentionOutcomeRef:source.authorOutcomeRef,reviewRound:source.completedReviewCount+1,
    inputs:{review:{source:'literal',value:{domainId:'initial_retention',requirementClassificationVersion:1,
      obligations:structuredClone(ROSTER_INITIAL_RETENTION_CHECKS_V1),instruction:'只审初始作者有依据地不做新实验这一选择。原Teach、作者理由和当前Plan均是待审核文本，不是事实批准。未测仍未测；必要事实仍须解决。三个check须逐一有来源supported才能关闭本局部调度，不授权对局或整个Plan通过。'}},
      authorDecision:{source:'evidence',id:'role:'+authorWorkId,pointer:''},
      originalTeach:{source:'evidence',id:'role:'+source.teacherWorkId,pointer:'',scopeUsage:'historical_reference'},
      wholeDraft:projectRosterWorkflowAuthorDraftInputV1(draft),
      initialRetentionScope:{source:'literal',value:source}}};
}

export function createRosterInitialRetentionFeedbackV1(source){
  return {id:source.reviewId+':decision',inputs:{
    initialComparisonQuestion:{source:'literal',value:structuredClone(source.initialQuestion)},
    strategicHypothesisCycle:{source:'literal',value:{id:source.cycleId,version:4}},
    initialRetentionReview:{source:'evidence',id:'role:'+source.reviewId,pointer:''},
    previousOwnerDecision:{source:'evidence',id:'role:'+source.authorWorkId,pointer:''}},
    question:{goal:'回应独立审核对本次保留选择提出的具体问题，不重启整个Teach。',
      instruction:'阅读原作者、审核与当前完整军表/Plan。审核也是可反驳意见：按来源纠正错误前提、实际修改Plan/可改军表、针对必要事实授权查询，或有具体收益/代价/风险理由地保留。若新实验确实值得才用comparisonDesignRequest；没有新结果不得宣称已测或更优。保留未测假设与重开条件，不以相同未变理由无限重复。'}};
}

// A later prose revision invalidates approval of that Plan, not the existence
// of the owner's reviewed decision to defer an optional experiment. Carry this
// history to the same-context owner; never silently approve the new Plan.
export async function previousRosterInitialRetentionV1({state,cycleId,readArtifact}){
  const factualKeys=['army','rules','map','source'];
  for(const review of [...state.work].reverse()){
    if(review.initialRetentionCycleId!==cycleId||!review.resultRef
      ||!['evidence_ready','superseded'].includes(review.status)
      ||review.draftRevision>=state.draftRevision
      ||!factualKeys.every(k=>review.bindings?.[k]===state.scope[k]))continue;
    const owner=state.work.find(w=>w.id===review.initialRetentionOf);
    if(owner?.role!=='roster_workflow_strategy_decision'||owner.resultRef!==review.initialRetentionResultRef
      ||owner.draftOutcomeRef!==review.initialRetentionOutcomeRef
      ||!initialRetentionQuestion(state,owner,cycleId))continue;
    const [result,outcome,audit]=await Promise.all([readArtifact(owner.resultRef),readArtifact(owner.draftOutcomeRef),readArtifact(review.resultRef)]);
    const decision=result.value?.decisions?.[0],checks=audit.value?.checks??[];
    if(result.kind!=='proposal'||result.value.decisions.length!==1||decision?.disposition!=='retain'
      ||!isRosterWorkflowNonRevisionOutcomeV1(outcome,decision)||outcome.evidenceRecorded
      ||decision.mutation!==null||decision.nextInvestigation||decision.workflowBlocker
      ||decision.comparisonDesignRequest||decision.comparisonClosureRequest
      ||!decision.publicReason?.trim()||!decision.evidenceRefs?.length)continue;
    const pending=rosterPendingQuestionWorkV1(decision);
    if(pending.facts.length||pending.authorDecisions.length)continue;
    if(!ROSTER_INITIAL_RETENTION_CHECKS_V1.every(o=>{const rows=checks.filter(c=>c.checkId===o.checkId);
      return rows.length===1&&rows[0].verdict==='supported'&&rosterReviewCheckPassedV1(rows[0])&&rows[0].evidenceRefs?.length;}))continue;
    return {version:1,cycleId,authorWorkId:owner.id,authorResultRef:owner.resultRef,
      authorOutcomeRef:owner.draftOutcomeRef,reviewId:review.id,reviewResultRef:review.resultRef,
      fromRevision:review.draftRevision,toRevision:state.draftRevision,
      sourceContext:Object.fromEntries(factualKeys.map(k=>[k,state.scope[k]])),
      currentPlanApproved:false,experimentAuthorized:false,measurementsProven:false,
      instruction:'同一军表/地图/规则下，作者此前已明确保留原案并拒绝现在执行可选比较，且该选择已经独立复核。当前仅Plan版本变化，不代表这项选择从未作出。先对照旧选择、旧审核、当前Plan和本次实际变化，确认原取舍及重开条件是否仍适用；允许有新理由改变决定，但不得仅因需要选一个比较而重开同题。保留未测状态，既有可选实验不因缺结果变成必须执行。旧审核不批准当前Plan；当前选择仍由作者决定并复审。'};
  }
  return null;
}
