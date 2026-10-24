// A repaired intermediate method can finish, including a later query, while
// an enclosing failed question still waits. Return the ACTUAL method facts to
// a model at that question; never alias a differently scoped query as success.
import {rosterWorkflowRepairRequestMatchesV1} from './roster-decision-workflow-v1.mjs';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';

function createMethodReturnContext(state) {
  const byId=new Map(state.work.map(work=>[work.id,work]));
  const graph=createRosterWorkflowGraphV1(state);
  const evidenceIds=new Set(state.evidence.map(evidence=>evidence.id));
  const current=work=>graph.isCurrent(work?.id);
  function actualCompletedSource(logical){
    let child=logical;const seen=new Set();
    while(child?.resolvedByWorkId){
      if(seen.has(child.id)||!current(child))return null;
      seen.add(child.id);child=byId.get(child.resolvedByWorkId);
    }
    return child?.role==='roster_workflow_tool'&&child.status==='evidence_ready'&&current(child)?child:null;
  }
  const pendingTarget=owner=>graph.pendingTarget(owner?.id);
  function findProgressingReturnOwner(pending){
    return state.work.find(work=>{
      if(work.role!=='roster_workflow_experiment_planner'||work.completedMethodHandoff||!current(work)
        ||!graph.pendingChain(work.id).some(target=>target.id===pending.id))return false;
      // A waiting choice may depend on a waiting summary whose unpublished
      // tool-view is still being produced. Follow that explicit dependency
      // chain, including saved model continuations; a real failed Native tool
      // or missing/stale/cyclic prerequisite still preserves the escape.
      return graph.canProgress(work.id);
    });
  }
  return {byId,evidenceIds,current,actualCompletedSource,pendingTarget,findProgressingReturnOwner,graph};
}

// Older versions may already have bought a handoff reply while its original
// return chain was progressing. Cede only this unissued continuation; retain
// every reply/read/counter and do not retire any original method or child work.
export function createRosterWorkflowCompletedMethodOwnerReturnsV1({state}){
  const {byId,current,findProgressingReturnOwner,graph}=createMethodReturnContext(state);
  return state.work.flatMap(work=>{
    if(!work.completedMethodHandoff||!current(work)||work.operationState?.pending
      ||!['ready','waiting_dependency','needs_model_choice'].includes(work.status))return [];
    const pending=byId.get(work.repairOf);
    if(pending?.status!=='needs_model_choice'||!current(pending))return [];
    const owner=findProgressingReturnOwner(pending);
    if(!owner||graph.children(work.id,{kinds:['execution','repair','choice']}).length)return [];
    return [{type:'yield_competing_method_handoff',workId:work.id,replacementOwnerId:owner.id,
      reason:'The original same-question return chain is progressing through explicit dependencies. Retain this historical handoff reply, but do not dispatch its competing unissued continuation. No Native success, strategy choice or history reset.'}];
  });
}

export async function createRosterWorkflowCompletedMethodHandoffsV1({state,readArtifact,tools}) {
  const {byId,evidenceIds,current,actualCompletedSource,pendingTarget,findProgressingReturnOwner,graph}=createMethodReturnContext(state);
  const groups=new Map();
  for(const owner of state.work){
    if(owner.role!=='roster_workflow_experiment_planner'||owner.status!=='evidence_ready'||!current(owner))continue;
    const repaired=pendingTarget(owner);
    if(!['evidence_ready','needs_model_choice'].includes(repaired?.status)||!current(repaired))continue;
    const value=(await readArtifact(owner.resultRef)).value;
    if(value.experimentConclusion||value.failedWorkOrders?.length||!value.workOrders?.length)continue;
    const completed=[];
    let incomplete=false;
    for(const [index,order] of value.workOrders.entries())for(const step of order.steps){
      const logical=byId.get(`${owner.id}:order${index}:${step.stepId}`),child=actualCompletedSource(logical);
      if(!child){incomplete=true;break;}
      const result=(await readArtifact(child.resultRef)).value;
      if(result.status!=='completed'){incomplete=true;break;}
      const id=`tool-view:${child.id}`;
      if(!evidenceIds.has(id)){incomplete=true;break;}
      completed.push({id,workId:child.id,resultRef:child.resultRef,operation:result.operation,
        ...(logical.id!==child.id?{logicalStepWorkId:logical.id}:{})});
    }
    if(incomplete||!completed.length)continue;
    let ancestor=repaired,pending;const seen=new Set();
    while(ancestor&&!seen.has(ancestor.id)){
      seen.add(ancestor.id);
      // A completed static search cannot resolve marker-control (or an action
      // solver), although all are called spatial. Return its actual facts to
      // the first waiting DIFFERENT method, including across repaired aliases.
      if(ancestor.status==='needs_model_choice'&&current(ancestor)&&completed.some(source=>
        !rosterWorkflowRepairRequestMatchesV1(ancestor.inputs.request.value,byId.get(source.workId).inputs.request.value))){
        pending=ancestor;break;
      }
      ancestor=pendingTarget(byId.get(ancestor.experimentOwnerId));
    }
    if(!pending)continue;
    if(findProgressingReturnOwner(pending))continue;
    // The outer handoff may already have been saved by an EARLIER synchronize.
    // Suppressing only its exact ID lets an inner pending level create another
    // role on the next tick. Follow the same actual parent links on cold resume.
    let existingOwner=pending;const existingPath=new Set();let alreadyHandedOff=false;
    while(existingOwner&&!existingPath.has(existingOwner.id)){
      existingPath.add(existingOwner.id);
      if(state.work.some(work=>work.id===existingOwner.id+':completed-method-handoff')){alreadyHandedOff=true;break;}
      existingOwner=pendingTarget(byId.get(existingOwner.experimentOwnerId));
    }
    if(alreadyHandedOff)continue;
    const group=groups.get(pending.id)??{pending,methods:[]};
    group.methods.push({ownerWorkId:owner.id,originalMethodResultRef:owner.resultRef,sources:completed});
    groups.set(pending.id,group);
  }
  // Related repair levels belong to ONE outer method. Two concurrent return
  // roles could retire each other's branch or discard the newer facts.
  for(const [id,group] of groups){
    let ancestor=group.pending;const seen=new Set();
    while(ancestor&&!seen.has(ancestor.id)){
      seen.add(ancestor.id);ancestor=pendingTarget(byId.get(ancestor.experimentOwnerId));
      if(ancestor&&groups.has(ancestor.id)){
        groups.get(ancestor.id).methods.push(...group.methods);groups.delete(id);break;
      }
    }
  }
  return [...groups.values()].map(({pending,methods})=>{
    // A causal descendant supersedes the earlier method as a handoff, but its
    // immutable sources remain readable. Unrelated siblings stay separate.
    const frontier=methods.filter(method=>!methods.some(other=>graph.isAncestor(method.ownerWorkId,other.ownerWorkId)));
    const sources=[...new Map(frontier.flatMap(method=>method.sources).map(source=>[source.id,source])).values()];
    return {id:pending.id+':completed-method-handoff',role:'roster_workflow_experiment_planner',bindings:pending.bindings,
      repairOf:pending.id,repairGeneration:pending.repairGeneration??0,
      completedMethodHandoff:{methods:frontier,nativeQueryAutomaticallyResolved:false,historyReset:false},
      inputs:{task:{source:'literal',value:{
        instruction:'A repaired intermediate method and its later queries have completed, but this enclosing original question is still pending. Read the actual returned sources below. Choose whether they answer the original question with their ACTUAL parameters/assumptions, whether a different query is necessary, or whether the method premise is disproved. Conclude with exact citations to return the method to its parent owner; this is NOT an automatically successful Native operation or Plan approval. Do not replay successful sources, copy a differently scoped result over the old query, or claim static fit proves arrival or attack estimates quantify unsupported abilities. Original failure, chosen assumptions, actual repaired state and source filters remain distinct. A necessary new query must explicitly preserve or explain changes to the question and use the returned stateRef.',
        originalWork:pending.inputs.request.value,completedMethods:frontier,
        completionContract:'The Host has only delivered completed facts. No failed query is marked successful. Use conclude for a scoped model conclusion, or an explicit workOrder with the actual completing step; source review still owns final truth acceptance.'}},
        ...Object.fromEntries(sources.map((source,index)=>[`completedMethodSource${index}`,{source:'evidence',id:source.id,pointer:''}])),
        tools:{source:'literal',value:tools}}};
  });
}
