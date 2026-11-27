// The repair role inherits the exact data dependencies of the failed operation,
// not a prose summary of its hashes. This selects no experimental geometry.
// References in a failed work order use the same numeric selectors as the
// tool API, often inside argumentsJson. Keep their existing catalogue addresses
// visible without reading/endorsing a source or repairing the submitted order.
import {isDeepStrictEqual} from 'node:util';
import {isRosterWorkflowDiscoveryGraphV1} from './roster-workflow-catalogue-v1.mjs';
import {projectRosterWorkflowStateReferenceV1} from './roster-workflow-state-reference-v1.mjs';
export function projectRosterWorkflowAssignedSourceReferencesV1({inputs,directory,hasOnDemandCatalogue=false}){
  const ids=new Set(),numbers=new Set(),seen=new WeakSet();
  const numberKeys=new Set(['sourceEvidenceNumber','fromEvidenceNumber','evidenceNumber']);
  const numberLists=new Set(['evidenceNumbers','priorEvidenceNumbers']);
  const addNumber=value=>{if(Number.isSafeInteger(value)&&value>0)numbers.add(value);};
  const visit=value=>{
    if(!value||typeof value!=='object'||seen.has(value))return;
    seen.add(value);
    // Discovery edges describe earlier decisions. They are still exact-read
    // navigable, but do not assign every archived citation to this role.
    const discoveryGraph=hasOnDemandCatalogue&&isRosterWorkflowDiscoveryGraphV1(value);
    for(const [key,child]of Object.entries(value)){
      if(discoveryGraph&&(key==='entries'||key==='edges'))continue;
      if(['sourceEvidenceId','selectedSourceEvidenceId','evidenceId'].includes(key)&&typeof child==='string')ids.add(child);
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

export async function projectRosterWorkflowRepairDependenciesV1({state,workId,directory,delegatedScenes=[],readArtifact}){
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
  // Native selection already chose one exact menu entry. Its parameter repair
  // needs that original input, not another broad search or a fresh scene query.
  // Both transports use registered evidence and the ordinary read ledger.
  const reject=detail=>{throw Object.assign(Error('ROSTER_WORKFLOW_DELEGATED_SOURCE_READ_MISMATCH'),
    {code:'ROSTER_WORKFLOW_DELEGATED_SOURCE_READ_MISMATCH',detail});};
  for(const scene of delegatedScenes.filter(s=>s.selectedDomainId)){
    const source=scene.selectedSourceWorkId?byId.get(scene.selectedSourceWorkId):null;
    const entry=scene.selectedSourceEvidenceId
      ?directory.find(e=>e.id===scene.selectedSourceEvidenceId)
      :source&&directory.find(e=>e.id===`tool:${source.id}`);
    if(!entry||entry.validity!=='current'||entry.kind!=='tool_receipt'
      ||scene.selectedSourceArtifactRef&&entry.artifactRef!==scene.selectedSourceArtifactRef
      ||scene.selectedSourceResultRef&&source?.resultRef!==scene.selectedSourceResultRef)
      reject({sourceWorkId:scene.sourceWorkId,sourceEvidenceId:scene.selectedSourceEvidenceId??null,
        reason:'selected_original_not_current_or_available'});
    const original=await readArtifact(entry.artifactRef);
    let value=original?.kind==='tool_receipt'?original.value:original;
    const prefix=scene.selectedSourcePointer??'';
    for(const key of prefix.split('/').slice(1).map(k=>k.replaceAll('~1','/').replaceAll('~0','~')))
      value=value&&typeof value==='object'?value[key]:undefined;
    const domains=value?.receipt?.actionSpace?.parameterDomains??[];
    const matches=domains.flatMap((d,index)=>d.domainId===scene.selectedDomainId?[index]:[]);
    if(!isDeepStrictEqual(projectRosterWorkflowStateReferenceV1(value),scene.stateRef)||matches.length!==1)
      reject({sourceEvidenceId:entry.id,domainId:scene.selectedDomainId,reason:'selected_parent_or_domain_mismatch'});
    const pointers=[`${prefix}/receipt/actionSpace/parameterDomains/${matches[0]}`];
    if(Object.hasOwn(value.receipt.actionParameterContracts??{},scene.selectedDomainId))
      pointers.push(`${prefix}/receipt/actionParameterContracts/${scene.selectedDomainId.replaceAll('~','~0').replaceAll('/','~1')}`);
    for(const resultPointer of pointers){
      if(bindings.some(b=>b.evidenceId===entry.id&&b.resultPointer===resultPointer))continue;
      bindings.push({argumentPointer:'/selection',evidenceId:entry.id,evidenceNumber:entry.number,
        resultPointer,ownerWorkId:scene.sourceWorkId,sourceWorkId:scene.selectedSourceWorkId??null,
        fromStepId:'',fromEvidenceNumber:entry.number,dependencyKind:'selected_native_menu_input'});
    }
  }
  return bindings;
}
