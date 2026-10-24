// Mechanical summaries belong to the method that submitted their exact batch.
// Shared construction also provides a strict provenance check for old saves;
// reading an experiment's facts alone never transfers control ownership.
import {isDeepStrictEqual} from 'node:util';

export function createRosterWorkflowBatchSummaryV1({owner,order,orderIndex,jobs}){
  const inputs={question:{source:'literal',value:{purpose:order.purpose,scenarioAssumptions:order.scenarioAssumptions,
    instruction:'Interpret only the actual new product tool results and distinguish conditional premises from facts. Do not claim optimality, arrival, scoring or modifications beyond what these receipts prove.'}}};
  jobs.forEach((job,i)=>{inputs[`receipt${i}`]={source:'evidence',id:`tool-view:${job.id}`,pointer:''};});
  return {id:`${owner.id}:order${orderIndex}:summary`,role:'roster_workflow_fact_summary',
    experimentOwnerId:owner.id,experimentOrderIndex:orderIndex,
    ...(owner.investigationFor?{investigationFor:owner.investigationFor}:{}),bindings:owner.bindings,inputs};
}

export async function recoverRosterWorkflowBatchSummaryOwnersV1({state,readArtifact}){
  const byId=new Map(state.work.map(work=>[work.id,work])),results=new Map(),links=[];
  for(const summary of state.work){
    if(summary.role!=='roster_workflow_fact_summary'||summary.experimentOwnerId)continue;
    const first=summary.inputs?.receipt0;
    if(first?.source!=='evidence'||!first.id?.startsWith('tool-view:'))continue;
    const producer=byId.get(first.id.slice('tool-view:'.length)),owner=byId.get(producer?.experimentOwnerId);
    if(owner?.role!=='roster_workflow_experiment_planner'||!owner.resultRef
      ||!isDeepStrictEqual(owner.bindings,summary.bindings))continue;
    if(!results.has(owner.resultRef))results.set(owner.resultRef,await readArtifact(owner.resultRef));
    for(const [orderIndex,order] of (results.get(owner.resultRef)?.value?.workOrders??[]).entries()){
      if(!order.steps?.length)continue;
      const jobs=order.steps.map(step=>byId.get(`${owner.id}:order${orderIndex}:${step.stepId}`));
      if(jobs.some(job=>job?.role!=='roster_workflow_tool'||job.experimentOwnerId!==owner.id))continue;
      const expected=createRosterWorkflowBatchSummaryV1({owner,order,orderIndex,jobs});
      if(summary.id!==expected.id||!isDeepStrictEqual(summary.inputs,expected.inputs)
        ||summary.investigationFor!==expected.investigationFor)continue;
      links.push({workId:summary.id,ownerWorkId:owner.id,orderIndex,sourceResultRef:owner.resultRef});
      break;
    }
  }
  return links;
}
