// Plan edits invalidate planning dependencies, not a frozen comparison's facts.
// Derive its next owner from the actual commit, never revive the stale author or
// interpret the author's revision as source approval. Shared live/cold recovery.
import {isDeepStrictEqual} from 'node:util';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {resolveRosterComparisonClosureRequestV1} from './roster-comparison-closure-v1.mjs';
const clone=value=>structuredClone(value);
const facts=scope=>Object.fromEntries(Object.entries(scope??{}).filter(([key])=>key!=='plan'));
// A previous return carried the then-current Plan as an input. A later nested
// author may edit that Plan, retiring this reader even though the frozen facts
// and original question remain valid. Use it only as an immutable template for
// a NEW reader, and only when the actual previous commit proves that exact
// currentDraft dependency. Do not make superseded work globally fresh again.
function canReturnFromOwner({state,graph,owner,frontier,writer,prior}){
  if(graph.isFresh(owner.id))return true;
  const input=owner.inputs?.currentDraft;
  if(owner.status!=='superseded'||owner.supersededByGoalId||owner.branchReturnRef
    ||owner.completedMethodHandoff||frontier.id!==writer.id&&!graph.isAncestor(frontier.id,writer.id)
    ||input?.source!=='evidence'||input.id!==`draft:r${prior.revision}:summary`
    ||input.scopeUsage==='historical_reference')return false;
  const evidence=state.evidence.find(e=>e.id===input.id);
  if(!evidence||!isDeepStrictEqual(evidence.bindings,prior.scope))return false;
  const previousReader={...owner,status:'evidence_ready'};
  const previousGraph=createRosterWorkflowGraphV1({...state,scope:prior.scope,
    work:state.work.map(w=>w.id===owner.id?previousReader:w)});
  return previousGraph.isFresh(owner.id);
}
export async function projectRosterPlanRevisionReturnsV1({state,readArtifact}){
  if(!state||state.work.some(w=>w.status==='running'||w.operationState?.pending))return [];
  const commit=state.events.findLast(e=>e.type==='draft_committed');
  if(!commit?.workId||!commit.receiptRef||commit.revision!==state.draftRevision
    ||commit.draftRef!==state.draftRef||!isDeepStrictEqual(commit.scope,state.scope))return [];
  const prior=state.events.findLast(e=>e.type==='draft_committed'&&e.sequence<commit.sequence);
  const graph=createRosterWorkflowGraphV1(state),writer=graph.get(commit.workId);
  if(!prior||!writer?.resultRef||writer.role!=='roster_workflow_strategy_decision'
    ||writer.draftOutcomeRef!==commit.receiptRef||!isDeepStrictEqual(facts(prior.scope),facts(state.scope)))return [];
  const outcome=await readArtifact(commit.receiptRef);
  if(outcome.applied!==true||outcome.status!=='draft_committed'||outcome.armyChanged!==false
    ||outcome.beforeRevision!==prior.revision||outcome.afterRevision!==commit.revision
    ||outcome.armyBeforeHash!==state.scope.army||outcome.armyAfterHash!==state.scope.army
    ||outcome.planBeforeHash!==prior.scope.plan||outcome.planAfterHash!==state.scope.plan
    ||outcome.planBeforeHash===outcome.planAfterHash||outcome.acceptanceGranted!==false)return [];
  const jobs=[];
  for(const goal of state.work){
    if(goal.experimentScopePolicy!=='frozen_comparison_v1'||goal.supersededByGoalId||goal.comparisonClosureRef
      ||!goal.investigationHandoff||!graph.isFresh(goal.id)
      ||!isDeepStrictEqual(goal.bindings,facts(state.scope))||!graph.isAncestor(goal.id,writer.id))continue;
    const purposeId=goal.inputs?.comparisonPurpose?.id?.replace(/^role:/u,'');
    const purpose=graph.get(purposeId);
    if(purpose&&await resolveRosterComparisonClosureRequestV1({state,readArtifact,authorWorkId:writer.id,
      cycle:{id:purpose.strategyComparisonDesignCycleId,comparisonPurposeWorkId:purpose.id,comparisonPurposeResultRef:purpose.resultRef}}))continue;
    const frontier=graph.get(goal.investigationHandoff.decisionId),owner=graph.get(frontier?.investigationOwnerId);
    if(frontier?.investigationFrontierOf!==goal.id||!owner?.resultRef
      ||owner.role!=='roster_workflow_experiment_planner'||owner.experimentGoalId!==goal.id
      ||!isDeepStrictEqual(owner.bindings,goal.bindings)
      ||!canReturnFromOwner({state,graph,owner,frontier,writer,prior}))continue;
    // Do not supersede uncompleted work merely to make the queue look ready.
    if(graph.descendants(goal.id).some(w=>!['evidence_ready','superseded','returned_to_owner'].includes(w.status)))continue;
    const id=`${goal.id}:plan-revision-return:r${commit.revision}`;
    if(graph.get(id))continue;
    const inputs=clone(owner.inputs);
    delete inputs.sameSourceReviewRequest;
    delete inputs.scopedStrategyReturn;
    if(inputs.strategyResolution)inputs.previousStrategyResolution=inputs.strategyResolution;
    inputs.strategyResolution={source:'evidence',id:`role:${writer.id}`,pointer:'',scopeUsage:'historical_reference'};
    inputs.currentDraft={source:'evidence',id:`draft:r${commit.revision}:summary`,pointer:''};
    inputs.returnedQuestionScope={source:'literal',value:{version:1,originalGoalId:goal.id,
      originalOwnerId:owner.id,completedStrategicDecisionId:writer.id,returnKind:'committed_plan_only_revision',
      instruction:'Return to the SAME frozen comparison and original necessary questions. The saved author revised the Plan, not the experiment conditions. Reconcile the saved author decision with the original sources and pending source-review objections. A committed draft is not a verified fact. Reuse completed evidence; do not restart the experiment, expand the question, erase a dispute, or treat this control transition as source/strategy/release approval.'}};
    inputs.planRevisionReturn={source:'literal',value:{version:1,commitReceiptRef:commit.receiptRef,
      beforeRevision:outcome.beforeRevision,afterRevision:outcome.afterRevision,
      armyChanged:false,revisedSectionKeys:clone(outcome.revisedSectionKeys??[]),
      factApprovalGranted:false,planApprovalGranted:false,historyReset:false,nativeReplay:false,
      instruction:'The current draft is provided separately from the original comparison draft. Author reasoning is available in strategyResolution and remains an interpretation to verify. Existing facts, rejected interpretations, source review and scope restrictions remain in force.'}};
    const job={id,role:'roster_workflow_experiment_planner',bindings:clone(goal.bindings),
      draftRevision:state.draftRevision,experimentGoalId:goal.id,methodContinuationOf:owner.id,
      experimentReviewRound:owner.experimentReviewRound??0,experimentBatchIndex:owner.experimentBatchIndex??0,
      planRevisionReturnOf:writer.id,inputs,status:'waiting_dependency',resultRef:null};
    if(!createRosterWorkflowGraphV1({...state,work:[...state.work,job]}).isFresh(id))continue;
    jobs.push({goalId:goal.id,frontierId:frontier.id,writerId:writer.id,receiptRef:commit.receiptRef,job});
  }
  return jobs;
}
