// A delegated method can return through a strategy frontier instead of through
// its old tool. Retire that exact blocked method, not its facts or parent goal.
import {createRosterWorkflowGraphV1,rosterWorkflowNoProgressReturnV1,
  rosterWorkflowFrontierResponseV1} from './roster-workflow-graph-v1.mjs';
import {resolveRosterWorkflowFrontierSettlementV1} from './roster-workflow-frontier-settlement-v1.mjs';
const terminal=new Set(['evidence_ready','superseded','returned_to_owner']);
const dependencyIds=work=>Object.values(work.inputs??{}).flatMap(input=>input.source==='work'?[input.id]
  :input.source==='evidence'&&/^(?:tool(?:-view)?|role):/u.test(input.id)?[input.id.replace(/^(?:tool(?:-view)?|role):/u,'')]:[]);

export async function projectRosterReturnedMethodSettlementsV1({state,readArtifact}){
  const graph=createRosterWorkflowGraphV1(state),plans=[];
  for(const goal of state.work)for(const history of goal.investigationHandoffHistory??[]){
    const next=graph.get(history.returnedByWorkId),frontier=graph.get(history.decisionId);
    const response=graph.get(history.completedStrategicDecisionId),owner=graph.get(frontier?.investigationOwnerId);
    if(next?.role!=='roster_workflow_experiment_planner'||next.experimentGoalId!==goal.id
      ||next.resumesStrategyFrontierOf!==frontier?.id||next.methodContinuationOf!==owner?.id
      ||next.completedStrategicDecisionId!==response?.id||frontier.investigationFrontierOf!==goal.id
      ||!graph.isFresh(next.id)||!graph.isFresh(owner.id)||next.branchReturnRef
      ||response?.status!=='evidence_ready'||!response.resultRef||!response.draftOutcomeRef
      ||response.operationState?.pending||!graph.isFresh(response.id))continue;
    // Validate the saved control edge as it existed before its hold was consumed.
    // This detached view never rewrites a live hold or resets an attempt.
    const held={...state,work:state.work.map(w=>w===goal?{...w,investigationHandoff:history}:w)};
    const returned=rosterWorkflowNoProgressReturnV1({state:held,frontier});
    if(!returned||graph.get(returned.stoppedWorkId)?.methodControlReturn
      ||!rosterWorkflowFrontierResponseV1({state:held,frontier,response}))continue;
    const settlement=await resolveRosterWorkflowFrontierSettlementV1({state:held,frontier,response,
      outcome:await readArtifact(response.draftOutcomeRef),result:await readArtifact(response.resultRef),readArtifact});
    if(!settlement)continue;
    const targets=graph.pendingChain(owner.id);
    if(!targets.length||targets.some(w=>w.role!=='roster_workflow_tool'||w.status!=='needs_model_choice'
      ||w.branchReturnRef||w.operationState?.pending||!graph.isFresh(w.id)))continue;
    const methods=new Map(targets.flatMap(w=>graph.descendants(w.id,{kinds:['execution','repair','choice']}).map(m=>[m.id,m])));
    // The original batch summary is a sibling, not a repair child. Follow its
    // exact source dependency and owner; never use an ID prefix as ownership.
    const ids=new Set(methods.keys());
    for(const w of state.work)if(w.role==='roster_workflow_fact_summary'&&!terminal.has(w.status)
      &&targets.some(t=>t.experimentOwnerId===w.experimentOwnerId)
      &&dependencyIds(w).some(id=>ids.has(id)))methods.set(w.id,w);
    const members=[...methods.values()].filter(w=>!terminal.has(w.status)||w.id===returned.stoppedWorkId);
    if(!members.length||members.some(w=>w.status==='running'||w.operationState?.pending
      ||w.branchReturnRef||!graph.isFresh(w.id)))continue;
    let safe=true;
    for(const w of members.filter(w=>w.role==='roster_workflow_tool')){
      // No successful/uncertain execution is discarded or turned into an answer.
      const result=w.resultRef?await readArtifact(w.resultRef):null;
      if(!result||result.kind!=='interpretation'||result.value?.nativeSuccess!==false
        ||result.value?.status!=='returned_to_model')safe=false;
    }
    const retired=new Set(members.map(w=>w.id));
    if(!safe||state.work.some(w=>!retired.has(w.id)&&graph.isActive(w.id)
      &&dependencyIds(w).some(id=>retired.has(id))))continue;
    plans.push({version:1,goalId:goal.id,stoppedWorkId:returned.stoppedWorkId,stopReportRef:returned.reportRef,
      frontierId:frontier.id,originalOwnerId:owner.id,replacementOwnerId:next.id,
      responseWorkId:response.id,responseResultRef:response.resultRef,outcomeRef:response.draftOutcomeRef,
      memberIds:[...retired],nativeQueryAutomaticallyResolved:false,factsApproved:false,
      parentReviewStillRequired:true,planApproved:false,historyReset:false,providerReplayed:false});
  }
  return plans;
}
