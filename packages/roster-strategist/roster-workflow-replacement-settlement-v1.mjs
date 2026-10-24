// Complete deterministic return edges before declaring a scheduler quiescent.
// No new task, model/Native invocation or synthetic success is created here.
export async function settleRosterWorkflowCompletedReplacementsV1(workflow){
  let state=await workflow.inspect(),byId=new Map(state.work.map(w=>[w.id,w]));
  const pending=state.work.filter(w=>w.status==='evidence_ready'&&(w.repairFor||w.choiceFor)).map(w=>w.id);
  const attempted=new Set(),resolved=[];
  for(let index=0;index<pending.length;index++){
    const work=byId.get(pending[index]),parentId=work?.repairFor??work?.choiceFor;
    if(!work||work.status!=='evidence_ready'||!parentId||attempted.has(work.id)
      ||byId.get(parentId)?.status!=='needs_model_choice')continue;
    attempted.add(work.id);
    // The existing state machine verifies freshness, exact query/operation,
    // explicit choice, actual Native receipt and original failure preservation.
    const result=await workflow.dispatch({type:work.choiceFor?'resolve_choice_with_work':'resolve_with_work',
      workId:parentId,replacementWorkId:work.id});
    resolved.push(result);
    state=await workflow.inspect();byId=new Map(state.work.map(w=>[w.id,w]));
    const parent=byId.get(parentId);
    if(parent?.status==='evidence_ready'&&(parent.repairFor||parent.choiceFor))pending.push(parentId);
  }
  return {state,resolved};
}
