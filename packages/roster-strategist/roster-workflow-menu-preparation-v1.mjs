// Validate Host-compiled dependency edges, not an author's promise to wait.
// Scheduling an unobserved selection is safe only behind the executor's existing
// modelChoiceSources boundary. It is never permission to apply that selection.
export function rosterWorkflowMenuPreparationIssuesV1({orders,issues}){
  if(!issues.length)return [];
  const classes=new Map(),errors=[];
  const producer=job=>{const {operation,args}=job.inputs.request.value;return issues.some(issue=>
    operation===issue.producer?.operation&&(operation!=='spatial'||issue.producer.queryKinds.includes(args.queryKind))
    ||operation==='inspect'&&issue.expectedOperation==='native_action');};
  for(const {order,jobs}of orders){
    const unsupported=[];
    for(const [index,job]of jobs.entries()){
      const dependencies=Object.values(job.inputs).filter(input=>input.source==='work');
      const deferred=dependencies.some(input=>classes.get(input.id)==='after_observation');
      const choiceSources=job.inputs.request.value.modelChoiceSources??[];
      const choiceBoundary=choiceSources.length>0&&choiceSources.every(({name})=>{
        const input=job.inputs[name];return input?.source==='work'&&classes.get(input.id)==='producer';
      });
      const kind=deferred||choiceBoundary?'after_observation':producer(job)?'producer':'unguarded';
      classes.set(job.id,kind);if(kind==='unguarded')unsupported.push(order.steps[index].stepId);
    }
    const completionIndex=order.steps.findIndex(step=>step.stepId===order.completionStepId);
    const earlyCompletion=Boolean(order.completionStepId)&&classes.get(jobs[completionIndex]?.id)!=='after_observation';
    if(unsupported.length||earlyCompletion)errors.push({code:'menu_preparation_requires_observation_boundary',
      orderId:order.orderId,stepIds:unsupported,completionStepId:order.completionStepId,earlyCompletion,
      producers:issues.map(issue=>issue.producer),
      instruction:'Keep required menu producers and any planned tail whose compiled dependencies pass through a model-choice boundary. A future selector must name that producer with fromStepId; an independent action or measurement cannot run before observing and choosing the menu. A producer-only preparation leaves completionStepId empty; a full order may name only a completion after its observation boundary. No action or parent fact has been approved.'});
  }
  return errors;
}
