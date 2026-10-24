// One immutable failed result has one recovery owner. Revalidating a saved
// reply is an owner, not an extra sibling alongside a new paid correction.
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
export function rosterSavedMethodRecoveryOwnerV1({state,work}){
  const graph=createRosterWorkflowGraphV1(state);
  const owners=state.work.filter(w=>w.savedReplyRevalidationOf===work.id
    &&w.sourceResultRef===work.resultRef&&w.role==='roster_workflow_experiment_planner'
    &&graph.isFresh(w.id));
  return owners.length===1?owners[0]:null;
}
export async function projectRosterCompetingMethodRecoveriesV1({state,readArtifact}){
  const graph=createRosterWorkflowGraphV1(state),plans=[];
  for(const duplicate of state.work){
    if(duplicate.role!=='roster_workflow_experiment_planner'||duplicate.savedReplyRevalidationOf
      ||duplicate.branchReturnRef||duplicate.methodRecoveryYield||!graph.isFresh(duplicate.id)
      ||duplicate.contractRecovery?.kind!=='unissued_order_contract_revalidated_v1')continue;
    const original=graph.get(duplicate.orderRepairOf);
    if(!original||duplicate.contractRecovery.originalResultRef!==original.resultRef)continue;
    const owner=rosterSavedMethodRecoveryOwnerV1({state,work:original});
    if(!owner)continue;
    const members=graph.descendants(duplicate.id,{kinds:['execution','repair','choice','continuation']});
    if(members.some(w=>w.status==='running'||w.operationState?.pending||w.branchReturnRef))continue;
    let safe=true;
    for(const member of members.filter(w=>w.role==='roster_workflow_tool')){
      if(!member.resultRef){if(!['ready','waiting_dependency'].includes(member.status))safe=false;continue;}
      const result=await readArtifact(member.resultRef);
      // Never silently discard a successful or unknown Native execution.
      if(result.kind!=='interpretation'||result.value?.nativeSuccess!==false)safe=false;
    }
    if(!safe)continue;
    const ids=new Set(members.map(w=>w.id));
    if(state.work.some(w=>!ids.has(w.id)&&graph.isActive(w.id)&&Object.values(w.inputs??{}).some(input=>
      input.source==='work'&&ids.has(input.id)||input.source==='evidence'&&ids.has(input.id?.replace(/^(?:tool(?:-view)?|role):/u,'')))))continue;
    plans.push({workId:duplicate.id,originalWorkId:original.id,originalResultRef:original.resultRef,
      replacementOwnerId:owner.id,memberIds:[...ids],originalRepliesRetained:true,
      historyReset:false,providerReplayed:false,nativeSuccessGranted:false,planApproved:false});
  }
  return plans;
}
