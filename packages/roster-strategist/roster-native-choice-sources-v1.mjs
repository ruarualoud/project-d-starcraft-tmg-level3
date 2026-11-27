// Restore menu ownership through persisted edges, including old cold-resumed
// correction jobs. Never find a menu by title, model prose, or newest timestamp.
import {isDeepStrictEqual} from 'node:util';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {projectRosterDelegatedNativeChoiceScopeV1} from './roster-comparison-observation-v1.mjs';
import {projectRosterWorkflowStateReferenceV1} from './roster-workflow-state-reference-v1.mjs';

// Parameter repairs often have no sourceReadContract: the original request
// already named its parent, but authored an invalid action. Resolve that exact
// state/seat against completed inspect receipts, not a similarly titled menu.
export async function findRosterNativeParentInspectionV1({state,pending,readArtifact}){
  const request=pending?.inputs?.request?.value;
  if(request?.operation!=='native_action')return null;
  const args=request.args??{},reference=args.stateRef,base=args.base;
  const parent=reference?.stateHash??(base?.kind==='branch'?base.branchStateHash
    :base?.kind==='source'?state.scope.source:null);
  if(!parent)return null;
  const contextRef=args.contextRef??reference?.contextRef??null;
  const fresh=row=>row&&Object.entries(row.bindings??{}).every(([k,v])=>state.scope[k]===v);
  let found=null;
  for(const work of state.work){
    if(work.role!=='roster_workflow_tool'||work.status!=='evidence_ready'||work.operationState?.pending
      ||!fresh(work)||!work.resultRef||work.inputs?.request?.value?.operation!=='inspect')continue;
    const entry=state.evidence.find(e=>e.id===`tool:${work.id}`&&e.availability==='available'&&fresh(e));
    if(!entry)continue;
    const body=await readArtifact(work.resultRef),value=body?.value,receipt=value?.receipt;
    if(body?.kind!=='tool_receipt'||value?.status!=='completed'||value.operation!=='inspect'
      ||receipt?.baseStateHash!==parent||(value.contextRef??null)!==contextRef
      ||receipt.actionSpace?.authority?.stateHash!==parent
      ||receipt.sourceStateHash!==(reference?.sourceStateHash??state.scope.source)
      ||args.seatKey&&receipt.actionSpace.authority.seatKey!==args.seatKey)continue;
    const registered=await readArtifact(entry.artifactRef);
    if(!isDeepStrictEqual(registered,value))continue;
    const stateRef=projectRosterWorkflowStateReferenceV1(value);if(!stateRef)continue;
    // Conflicting interfaces on one frozen parent require diagnosis, not a
    // timestamp preference. Identical repeated inspections are one source.
    if(found&&!isDeepStrictEqual(found.value.receipt.actionSpace,receipt.actionSpace))return null;
    found??={work,entry,value,stateRef};
  }
  return found;
}
export async function projectRosterNativeChoiceSourcesV1({assignment,state,readArtifact}){
  if(assignment.role!=='roster_workflow_experiment_planner')return {};
  const jobs=new Map(state.work.map(w=>[w.id,w]));
  let owner=jobs.get(assignment.workId??assignment.id);const visited=new Set();
  while(owner&&!owner.choiceOf&&!owner.repairOf&&owner.orderRepairOf&&!visited.has(owner.id)){
    visited.add(owner.id);owner=jobs.get(owner.orderRepairOf);
  }
  const pending=jobs.get(owner?.choiceOf??owner?.repairOf);
  if(!pending||pending.inputs?.request?.value?.operation!=='native_action')return {};
  const sources=[...(owner.inputs?.task?.value?.sourceReadContract??[])];
  const current=await findRosterNativeParentInspectionV1({state,pending,readArtifact});
  if(current&&!sources.some(source=>source.sourceWorkId===current.work.id))sources.push({
    sourceWorkId:current.work.id,sourceResultRef:current.work.resultRef,
    sourceOperation:'inspect',stateRef:current.stateRef,requiresInspect:false});
  const entries=[],inputs={};
  for(const source of sources){
    if(source.sourceOperation!=='inspect'||source.requiresInspect)continue;
    const original=jobs.get(source.sourceWorkId);
    if(!original?.resultRef||source.sourceResultRef&&source.sourceResultRef!==original.resultRef)continue;
    const matches=state.evidence.map((e,i)=>({...e,number:i+1})).filter(e=>
      [`tool:${source.sourceWorkId}`,`tool-view:${source.sourceWorkId}`].includes(e.id)&&e.kind==='tool_receipt'
      &&Object.entries(e.bindings??{}).every(([key,value])=>assignment.scope[key]===value));
    const evidence=matches.find(e=>e.id===`tool:${source.sourceWorkId}`);
    if(!evidence)continue;
    const body=await readArtifact(original.resultRef),value=body.value??body,menu=value.receipt?.actionSpace;
    if(value.operation!=='inspect'||!menu||!value.stateRef)continue;
    if(source.stateRef&&JSON.stringify(source.stateRef)!==JSON.stringify(value.stateRef))continue;
    const index=entries.length;
    entries.push({sourceWorkId:source.sourceWorkId,sourceResultRef:original.resultRef,
      sourceEvidenceNumber:evidence.number,allowedEvidenceNumbers:matches.map(e=>e.number),
      stateRef:structuredClone(value.stateRef),pointer:'/receipt/actionSpace',bodyDelivered:true});
    inputs[`nativeChoiceSource${index}`]={source:'evidence',status:'read',evidenceId:evidence.id,
      artifactRef:evidence.artifactRef,kind:'tool_receipt',validity:'current',pointer:'/receipt/actionSpace',
      value:structuredClone(menu),conditions:structuredClone(body.conditions??evidence.conditions??[])};
    // Native publishes its submission contract BESIDE the sealed menu. The
    // shallow domain parameterSchema alone does not describe nested coordinate,
    // placement, identity or payment fields. Deliver the original sibling;
    // never recompute old contracts, amend sealed domains or repair parameters.
    const contracts=value.receipt.actionParameterContracts;
    if(contracts&&typeof contracts==='object'&&!Array.isArray(contracts)){
      entries[index].parameterContractsPointer='/receipt/actionParameterContracts';
      inputs[`nativeChoiceParameterContracts${index}`]={source:'evidence',status:'read',evidenceId:evidence.id,
        artifactRef:evidence.artifactRef,kind:'tool_receipt',validity:'current',pointer:'/receipt/actionParameterContracts',
        value:structuredClone(contracts),conditions:structuredClone(body.conditions??evidence.conditions??[])};
    }
  }
  // A completed prerequisite already owns the exact solver evidence. Carry
  // that dependency forward instead of asking the chooser to rediscover it or
  // author a whole method (which can accidentally recreate parent-owned work).
  const summaryOwner=[owner,...createRosterWorkflowGraphV1(state).ancestors(owner.id)]
    .find(work=>work.inputs?.newFacts?.source==='work');
  const summaryInput=summaryOwner?.inputs.newFacts;
  const summary=summaryInput?.source==='work'?jobs.get(summaryInput.id):null;
  const request=pending.inputs.request.value,domainId=request.args?.action?.domainId;
  if(summary?.role==='roster_workflow_fact_summary'&&summary.status==='evidence_ready'
    &&request.args?.stateRef&&domainId){
    for(const input of Object.values(summary.inputs??{})){
      if(input.source!=='evidence'||!input.id?.startsWith('tool-view:'))continue;
      const sourceWorkId=input.id.slice('tool-view:'.length),original=jobs.get(sourceWorkId);
      if(original?.role!=='roster_workflow_tool'||original.status!=='evidence_ready'||!original.resultRef)continue;
      const matches=state.evidence.map((e,i)=>({...e,number:i+1})).filter(e=>
        [`tool:${sourceWorkId}`,`tool-view:${sourceWorkId}`].includes(e.id)&&e.kind==='tool_receipt'
        &&Object.entries(e.bindings??{}).every(([key,value])=>assignment.scope[key]===value));
      const evidence=matches.find(e=>e.id===`tool:${sourceWorkId}`);if(!evidence)continue;
      const body=await readArtifact(original.resultRef),value=body.value??body;
      const result=value.receipt?.queryReceipt?.result,options=result?.formationOptions;
      if(value.status!=='completed'||value.operation!=='spatial'
        ||!['space.solve_formation','legal_formation_options'].includes(value.receipt?.queryKind)
        ||!isDeepStrictEqual(value.stateRef,request.args.stateRef)
        ||value.receipt.seatKey!==request.args.seatKey||result?.domainId!==domainId
        ||!options?.length||options.some(o=>o.domainId!==domainId||o.rulesAuthority!==true
          ||o.completeFormationPlacementChecked!==true||!o.canonicalParameters))continue;
      const index=entries.length;
      entries.push({kind:'formation',sourceWorkId,sourceResultRef:original.resultRef,
        sourceEvidenceNumber:evidence.number,allowedEvidenceNumbers:matches.map(e=>e.number),
        stateRef:structuredClone(value.stateRef),pointer:'/receipt/queryReceipt/result',bodyDelivered:true,
        choices:options.map((option,index)=>({kind:'formation',index,
          formationOptionId:option.formationOptionId,domainId:option.domainId,
          solverPolicyId:option.solverPolicyId,anchor:structuredClone(option.anchor)}))});
      inputs[`nativeChoiceFormationSource${index}`]={source:'evidence',status:'read',evidenceId:evidence.id,
        artifactRef:evidence.artifactRef,kind:'tool_receipt',validity:'current',pointer:'/receipt/queryReceipt/result',
        value:structuredClone(result),conditions:structuredClone(body.conditions??evidence.conditions??[])};
    }
    if(entries.some(e=>e.kind==='formation'))inputs.nativeChoiceTemplate={source:'literal',value:{
      orderId:'pending-native-formation-choice',purpose:request.purpose,
      scenarioAssumptions:structuredClone(request.scenarioAssumptions??[]),
      experimentScope:projectRosterDelegatedNativeChoiceScopeV1(request.experimentScope,
        {targetWorkId:pending.id,operation:request.operation,binding:request.comparisonBinding}),
      steps:[{stepId:'selected-native-action',operation:'native_action',
        argumentsJson:JSON.stringify({selection:{kind:'formation'}}),bindings:[],
        guards:structuredClone(request.resultGuards??[]),publicReason:request.publicReason??''}],
      completionStepId:'selected-native-action',
      stopAndReturnToModelWhen:'Return after this pending Native action; the parent still owns successor inspection and other downstream steps.'}};
  }
  if(!entries.length)return {};
  return {...inputs,nativeChoiceSources:{source:'literal',value:{version:1,targetWorkId:pending.id,entries,
    instruction:'These exact immutable menus belong to this pending operation through its saved choice/repair edges. Complete menu bodies are delivered inline in nativeChoiceSourceN; same-receipt submission contracts are in nativeChoiceParameterContractsN. Complete solver results are in nativeChoiceFormationSourceN: entries.choices gives ORIGINAL formationOptions indices, not positions in a Pareto/frontier list. No candidate has been selected by Host; all complete options remain visible. Use the nested contracts and actual geometry; valid shape is not legal geometry, a preferred anchor is not an achieved target, and a candidate is not an executed action. Do not search for a similarly titled older scene or repeat inspect. Select only one of these source numbers and an actual entry. If another state, anchor, objective or prerequisite is needed, return to the method owner rather than re-authoring the parent method or silently substituting a scene.'}}};
}
