// A missing prerequisite is not a defective experimental design. Keep the
// design immutable, investigate only the reviewer's explicit factual questions,
// source-review the answer, then return to the SAME preflight. No fact is waived.
import {rosterPendingQuestionWorkV1} from './roster-review-data-questions-v1.mjs';
import {assessRosterExperimentConclusionV1} from './roster-workflow-experiment-owner-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';

export async function assessRosterComparisonPrerequisitesV1({state,preflight,checks,readArtifact}){
  if(preflight?.status!=='evidence_ready'||!preflight.resultRef||!checks?.length
    ||!rosterWorkflowBindingsMatchV1(preflight.bindings,state.scope)
    ||checks.some(check=>!['supported','conditional'].includes(check.verdict)
      ||rosterPendingQuestionWorkV1(check).authorDecisions.length))return null;
  const questions=checks.flatMap(check=>rosterPendingQuestionWorkV1(check).facts.map(question=>({
    checkId:check.checkId,...structuredClone(question)})));
  if(!questions.length)return null;
  const goalId=preflight.id+':prerequisites:v1',round=preflight.prerequisiteReviewRound??0;
  const goal=state.work.find(w=>w.id===goalId&&w.experimentGoalId===goalId);
  const owner=state.work.findLast(w=>w.experimentGoalId===goalId&&w.role==='roster_workflow_experiment_planner'
    &&w.status!=='superseded'&&rosterWorkflowBindingsMatchV1(w.bindings,state.scope));
  const assessment=owner?await assessRosterExperimentConclusionV1({state,owner,store:{get:readArtifact}}):null;
  const review=state.work.find(w=>w.id===assessment?.reviewId);
  return {version:1,goalId,sourceReviewWorkId:preflight.id,sourceReviewResultRef:preflight.resultRef,
    purposeResultRef:preflight.comparisonPurposeResultRef,questions,round,started:Boolean(goal),
    accepted:assessment?.acceptedForStrategy===true,status:assessment?.status??'not_started',
    ownerWorkId:owner?.id??null,ownerResultRef:owner?.resultRef??null,
    answerReviewWorkId:review?.id??null,answerReviewResultRef:review?.resultRef??null,
    // A genuinely blocked fact returns an explicit stop, not an unlimited new
    // design/inspection loop. Existing source-repair limits still apply too.
    stopped:round>=3||['blocked','strategy_required'].includes(assessment?.status),
    designChanged:false,factsApprovedByHost:false};
}

export async function progressRosterComparisonPrerequisitesV1({run,state,cycle,draft}){
  const prerequisite=cycle.comparisonPrerequisites;
  if(!prerequisite||prerequisite.stopped)return {scheduled:[]};
  if(!prerequisite.started){
    await run.requestExperiment({id:prerequisite.goalId,
      inputs:{preflightPrerequisites:{source:'literal',value:structuredClone(prerequisite)},
        proposedDesign:{source:'evidence',id:'role:'+cycle.comparisonPurposeWorkId,pointer:''},
        prerequisiteReview:{source:'evidence',id:'role:'+prerequisite.sourceReviewWorkId,pointer:''},
        draft:{source:'evidence',id:`draft:r${draft.revision}:summary`,pointer:'',scopeUsage:'historical_reference'}},
      question:{goal:'只查明当前实验预检中明确列出的必要事实，不重写实验设计，不提前执行整个比较。',
        necessaryQuestions:structuredClone(prerequisite.questions),
        instruction:'逐条读取已有规则/工具原件，回答所列必要事实，或有来源地反驳错误前提。缺失资料才调用最小必要工具；不得为了事实缺口扩写另一份设计、改正式军表/Plan、删除问题或模拟整场对局。实验设计仅提供问题语境，不是本次已授权的测量任务。结论须独立来源与问题覆盖审核，随后返回同一份设计预检；查到前置事实不表示设计通过。'}});
    return {scheduled:[prerequisite.goalId]};
  }
  if(!prerequisite.accepted)return {scheduled:[]};
  const id=prerequisite.sourceReviewWorkId+':after-prerequisites:v1';
  if(state.work.some(work=>work.id===id))return {scheduled:[]};
  await run.requestStrategicComparisonDesignReview({id,cycleId:cycle.id,
    purposeWorkId:cycle.comparisonPurposeWorkId,purposeResultRef:cycle.comparisonPurposeResultRef,
    designReviewRound:cycle.comparisonDesignRevision,prerequisiteReturn:prerequisite});
  return {scheduled:[id]};
}
