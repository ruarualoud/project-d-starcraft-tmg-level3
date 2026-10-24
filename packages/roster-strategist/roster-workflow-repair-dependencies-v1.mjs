// The repair role inherits the exact data dependencies of the failed operation,
// not a prose summary of its hashes. This selects no experimental geometry.
// References in a failed work order use the same numeric selectors as the
// tool API, often inside argumentsJson. Keep their existing catalogue addresses
// visible without reading/endorsing a source or repairing the submitted order.
export function projectRosterWorkflowAssignedSourceReferencesV1({inputs,directory}){
  const ids=new Set(),numbers=new Set(),seen=new WeakSet();
  const numberKeys=new Set(['sourceEvidenceNumber','fromEvidenceNumber','evidenceNumber']);
  const numberLists=new Set(['evidenceNumbers','priorEvidenceNumbers']);
  const addNumber=value=>{if(Number.isSafeInteger(value)&&value>0)numbers.add(value);};
  const visit=value=>{
    if(!value||typeof value!=='object'||seen.has(value))return;
    seen.add(value);
    for(const [key,child]of Object.entries(value)){
      if(['sourceEvidenceId','evidenceId'].includes(key)&&typeof child==='string')ids.add(child);
      else if(numberKeys.has(key))addNumber(child);
      else if(numberLists.has(key)&&Array.isArray(child))child.forEach(addNumber);
      else if(key==='argumentsJson'&&typeof child==='string'){
        // Only a declared tool argument envelope is JSON, never free prose.
        // Invalid JSON remains the compiler's error; navigation cannot fix it.
        try{visit(JSON.parse(child));}catch{}
      }else if(child&&typeof child==='object')visit(child);
    }
  };
  visit(inputs);
  return directory.filter(entry=>ids.has(entry.id)||numbers.has(entry.number));
}

export function projectRosterWorkflowRepairDependenciesV1({state,workId,directory}){
  const byId=new Map((state?.work||[]).map(work=>[work.id,work])),seen=new Set(),bindings=[];
  const destinations=new Set();let work=byId.get(workId);
  while(work&&!seen.has(work.id)){
    seen.add(work.id);
    for(const binding of work.inputs?.request?.value?.bindings||[]){
      if(destinations.has(binding.pointer))continue;
      const input=work.inputs[binding.name],source=input?.source==='work'?byId.get(input.id):null;
      if(!source?.resultRef||source.status!=='evidence_ready')continue;
      const entry=directory.find(row=>row.id===`tool-view:${source.id}`&&row.validity==='current')
        ??directory.find(row=>row.id===`tool:${source.id}`&&row.validity==='current');
      if(!entry)continue;
      destinations.add(binding.pointer);
      bindings.push({argumentPointer:binding.pointer,evidenceId:entry.id,evidenceNumber:entry.number,
        resultPointer:input.pointer.replace(/^\/value(?=\/|$)/u,''),ownerWorkId:work.id,
        sourceWorkId:source.id,fromStepId:'',fromEvidenceNumber:entry.number});
    }
    // Older stored jobs predate the explicit owner edge. Their namespace was
    // created by this scheduler, not model prose; recover that exact edge only.
    const retainedOwner=work.role==='roster_workflow_tool'&&!work.experimentOwnerId
      ?[...byId.values()].sort((a,b)=>b.id.length-a.id.length).find(parent=>parent.role==='roster_workflow_experiment_planner'
        &&work.id.startsWith(`${parent.id}:order`)
        &&/^\d+:/u.test(work.id.slice(`${parent.id}:order`.length))):null;
    work=byId.get(work.orderRepairOf??work.repairOf??work.experimentOwnerId??retainedOwner?.id);
  }
  return bindings;
}
