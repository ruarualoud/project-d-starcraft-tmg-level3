// An authorized child investigation is not a replacement for its parent's
// question. Return its settled joint response to that exact fact owner; the
// owner still answers the original scope and undergoes independent review.
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {rosterExperimentLifecycleV1,assessRosterExperimentConclusionV1} from './roster-workflow-experiment-owner-v1.mjs';
import {rosterSourceReviewRepairStageV1} from './roster-experiment-source-repair-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {rosterWorkflowFrontierResponseV1,createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {resolveRosterWorkflowFrontierSettlementV1} from './roster-workflow-frontier-settlement-v1.mjs';
import {rosterWorkflowControlOwnerAvailableV1,rosterWorkflowHistoricalControlInputsV1} from './roster-workflow-control-history-v1.mjs';
export {rosterWorkflowFrontierResponseV1 as rosterFrontierResponseRouteV1} from './roster-workflow-graph-v1.mjs';
const clone=value=>structuredClone(value);
// A new independent reconciliation can supersede the MATERIAL-IDENTITY fence,
// not approve its parent's facts. Derive it from the actual authorized child
// and source/coverage review; a direct owner's retain is never sufficient.
async function sourceReconciliation({state,owner,frontier,route,readArtifact}){
  if(route.kind!=='child_response'||!frontier.inputs.sourceInterpretationChallenges?.value?.length)return null;
  const inputs=clone(owner.inputs);
  for(const [key,input]of Object.entries(inputs))if((key==='sourceReview'||/^failedSourceClaim\d+$/u.test(key))&&input.source==='evidence'){
    const source=state.evidence.find(e=>e.id===input.id);if(!source)return null;
    input.value=await readArtifact(source.artifactRef);input.evidenceId=source.id;
  }
  const stage=rosterSourceReviewRepairStageV1(inputs);
  if(!stage?.necessaryQuestions?.length)return null;
  const authorization=(await readArtifact(frontier.resultRef)).value?.decisions?.[0];
  const authorized=new Set(authorization?.requiredData??[]);
  const questions=stage.necessaryQuestions.filter(q=>authorized.has(q.question));
  if(!questions.length)return null;
  for(const [,input]of route.facts){
    const answer=state.work.find(w=>'role:'+w.id===input.id);
    if(answer?.role!=='roster_workflow_experiment_planner'||answer.experimentGoalId!==route.child.id
      ||answer.status!=='evidence_ready'||!rosterWorkflowBindingsMatchV1(answer.bindings,state.scope))continue;
    const assessment=await assessRosterExperimentConclusionV1({state,owner:answer,store:{get:readArtifact}});
    const review=state.work.find(w=>w.id===assessment.reviewId);
    if(!assessment.acceptedForStrategy||!review||!rosterWorkflowBindingsMatchV1(review.bindings,state.scope))continue;
    return {version:1,factsApproved:false,parentReviewStillRequired:true,
      questions:questions.map(q=>({question:q.question,origins:clone(q.origins),
        conclusionWorkId:answer.id,conclusionResultRef:answer.resultRef,
        sourceReviewWorkId:review.id,sourceReviewResultRef:review.resultRef})),
      instruction:'These exact original questions were delegated to this child and its answer passed independent source and question-coverage review. Reconcile the existing originals with the old disputed interpretation; new measurements are not required merely for material identity. Old questions/replies remain history. This does not approve YOUR parent answer, any other missing predicate, strategy or release; your scoped answer still receives independent review.'};
  }
  return null;
}
export async function createRosterWorkflowFrontierReturnsV1({state,readArtifact}){
  const byId=new Map(state.work.map(w=>[w.id,w])),jobs=[],graph=createRosterWorkflowGraphV1(state);
  const current=w=>w&&w.status!=='superseded'&&rosterWorkflowBindingsMatchV1(w.bindings,state.scope);
  for(const goal of state.work){
    const frontier=byId.get(goal.investigationHandoff?.decisionId);
    if(!current(goal)||!rosterWorkflowControlOwnerAvailableV1({state,work:frontier})||frontier.investigationFrontierOf!==goal.id)continue;
    const owner=byId.get(frontier.investigationOwnerId);
    if(!rosterWorkflowControlOwnerAvailableV1({state,work:owner})||graph.owner(owner.id)?.goalId!==goal.id)continue;
    const responses=state.work.filter(response=>rosterWorkflowFrontierResponseV1({state,frontier,response}));
    const response=responses.at(-1);
    if(response?.status!=='evidence_ready'||!response.resultRef||!response.draftOutcomeRef||response.operationState?.pending)continue;
    const outcome=await readArtifact(response.draftOutcomeRef),result=await readArtifact(response.resultRef);
    const settlement=await resolveRosterWorkflowFrontierSettlementV1({state,frontier,response,outcome,result,readArtifact});
    if(!settlement)continue;
    const id=`${goal.id}:frontier-return:${hash({decisionId:response.id,resultRef:response.resultRef}).slice(0,16)}`;
    if(byId.has(id))continue;
    const route=rosterWorkflowFrontierResponseV1({state,frontier,response}),facts=route.facts;
    if(!facts.length)continue;
    const reconciliation=await sourceReconciliation({state,owner,frontier,route,readArtifact});
    // These receipts authorize one specific control edge, not all descendants.
    // Carry the evidence, but derive each return's authority afresh. Otherwise an
    // old same-source recheck tag contradicts the new ordinary return at enqueue.
    const inheritedInputs=rosterWorkflowHistoricalControlInputsV1({state,inputs:owner.inputs});
    delete inheritedInputs.sameSourceReviewRequest;
    delete inheritedInputs.scopedStrategyReturn;
    const inputs={...inheritedInputs,
      ...(reconciliation?{sourceReconciliation:{source:'literal',value:reconciliation}}:{}),
      ...(settlement.sameSourceReviewRequest?{sameSourceReviewRequest:{source:'literal',value:settlement.sameSourceReviewRequest}}:{}),
      ...(settlement.scopedStrategyReturn?{scopedStrategyReturn:{source:'literal',value:settlement.scopedStrategyReturn}}:{}),
      strategyResolution:{source:'evidence',id:`role:${response.id}`,pointer:''},
      returnedQuestionScope:{source:'literal',value:{version:1,originalGoalId:goal.id,
        frontierDecisionId:frontier.id,completedStrategicDecisionId:response.id,returnKind:route.kind,
        ...(route.sourceCorrection?{sourceCorrection:clone(route.sourceCorrection)}:{}),
        instruction:'The strategic owner returned a direct decision or a child-investigation response. Reconcile these actual saved facts with YOUR ORIGINAL question/obligations. The strategic response is an interpretation, not Rules proof. Answer the original scope if its necessary facts are now covered, or identify the exact still-missing predicate and a meaningful next bounded method. Reuse completed sources; this control return does not approve facts, the parent question, the Plan or release. A direct retain decision is not a new measurement and does not make an unreviewed answer true.'}},
      experimentLifecycle:{source:'literal',value:rosterExperimentLifecycleV1(goal.id,owner.experimentBatchIndex??0)}};
    facts.forEach(([,input],i)=>{inputs[`returnedQuestionFact${i}`]=clone(input);});
    jobs.push({id,role:'roster_workflow_experiment_planner',bindings:clone(goal.bindings),
      draftRevision:state.draftRevision,experimentGoalId:goal.id,methodContinuationOf:owner.id,
      experimentReviewRound:owner.experimentReviewRound??0,
      experimentBatchIndex:owner.experimentBatchIndex??0,resumesStrategyFrontierOf:frontier.id,
      completedStrategicDecisionId:response.id,inputs});
  }
  return jobs;
}
