// A delegated Native method is authorized by its parent operation or fact goal.
// The accompanying Plan is historical rationale, not a dependency that may
// silently discard a paid choice when only a Plan sentence changes.
import {createRosterWorkflowGraphV1,rosterWorkflowChoiceContractV1} from './roster-workflow-graph-v1.mjs';
const clone=structuredClone;
const matches=(bindings,scope)=>Object.entries(bindings??{}).every(([k,v])=>scope[k]===v);
const factual=bindings=>Object.fromEntries(Object.entries(bindings??{}).filter(([k])=>k!=='plan'));
const retired=work=>work?.branchReturnRef||work?.supersededByGoalId||work?.supersededByWorkId
  ||work?.experimentSupersessionRef||work?.reviewRepairSupersession;

export async function projectRosterLocalMethodScopeRepairsV1({state,readArtifact}){
  const graph=createRosterWorkflowGraphV1(state),evidence=new Map(state.evidence.map(e=>[e.id,e]));
  const candidates=[];
  for(const work of state.work){
    const input=work.inputs?.draft,source=evidence.get(input?.id);
    if(work.role!=='roster_workflow_experiment_planner'||retired(work)||work.status==='running'
      ||work.operationState?.pending||Object.hasOwn(work.bindings??{},'plan')
      ||!matches(work.bindings,state.scope)||input?.source!=='evidence'
      ||input.scopeUsage==='historical_reference'||!source||!Object.hasOwn(source.bindings??{},'plan')
      ||!matches(factual(source.bindings),state.scope))continue;
    const contract=rosterWorkflowChoiceContractV1({state,workId:work.id});
    const pending=graph.get(contract?.targetWorkId),parent=graph.get(work.orderRepairOf);
    const goal=graph.get(graph.owner(work.id)?.goalId);
    const pendingChoice=pending?.role==='roster_workflow_tool'&&pending.status==='needs_model_choice'
      &&!retired(pending)&&graph.isFresh(pending.id);
    // Unissued order syntax repairs inherit the existing factual experiment,
    // including completed repair ancestors needed to collect its results.
    // A Plan-bound experiment or explicitly retired goal is not eligible.
    const factMethod=!contract&&parent?.role==='roster_workflow_experiment_planner'
      &&parent.resultRef&&!Object.hasOwn(parent.bindings??{},'plan')&&matches(parent.bindings,state.scope)
      &&goal?.role==='roster_workflow_experiment_planner'&&!Object.hasOwn(goal.bindings??{},'plan')
      &&!retired(goal)&&graph.isFresh(goal.id);
    if((!pendingChoice&&!factMethod)||graph.ancestors(work.id).some(retired))continue;
    const target=pendingChoice?pending:parent;
    let status=work.status;
    if(status==='superseded'){
      // Own Native bindings are current; the only permitted stale input below
      // is the historical draft. No active/unknown dispatch is ever replayed.
      if(matches(source.bindings,state.scope))continue;
      const result=work.resultRef?await readArtifact(work.resultRef):null;
      status=work.failure?'needs_repair':result?(result.continuation===true?'needs_model_choice':'evidence_ready'):'waiting_dependency';
    }
    candidates.push({workId:work.id,targetWorkId:target.id,priorStatus:work.status,status,
      priorInput:clone(input),input:{...clone(input),scopeUsage:'historical_reference'},
      originalResultRef:work.resultRef??null,providerReplayed:false,countersReset:false});
  }
  // Check every other real dependency under the proposed metadata change. A
  // changed army/map/rules/source or explicit owner retirement stays invalid.
  const byId=new Map(candidates.map(c=>[c.workId,c]));
  const projected={...state,work:state.work.map(work=>{
    const c=byId.get(work.id);return c?{...work,status:c.status,inputs:{...work.inputs,draft:c.input}}:work;
  })};
  const projectedGraph=createRosterWorkflowGraphV1(projected);
  return candidates.filter(c=>projectedGraph.isFresh(c.workId));
}
