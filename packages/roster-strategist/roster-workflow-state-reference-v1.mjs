// One transferable identity for a Native state, including which candidate owns
// it. Derived from tool metadata, never from a model's prose or a scene template.
import {isDeepStrictEqual} from 'node:util';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
const schema='roster_workflow_state_ref_v1';
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const valid=ref=>ref&&typeof ref==='object'&&!Array.isArray(ref)
  &&Object.keys(ref).every(k=>['schema','contextRef','sourceStateHash','stateHash'].includes(k))
  &&ref.schema===schema&&hash(ref.sourceStateHash)&&hash(ref.stateHash)
  &&(ref.contextRef===null||typeof ref.contextRef==='string'&&ref.contextRef.length>0);
export function projectRosterWorkflowStateReferenceV1(value){
  const receipt=value?.receipt;
  if(!receipt)return null;
  const created=value.operation==='candidate_context'&&receipt.resultStatus==='ok';
  const sourceStateHash=created?receipt.laboratory?.sourceStateHash:receipt.sourceStateHash;
  const stateHash=created?receipt.sceneProjectionReceipt?.branchStateHash??sourceStateHash:receipt.branchStateHash??receipt.baseStateHash;
  if(!hash(sourceStateHash)||!hash(stateHash))return null;
  return {schema,contextRef:created?receipt.contextRef:value.contextRef??null,sourceStateHash,stateHash};
}
// A configuration preflight reads the operation INPUT, not its successor.
// Both identities are source-owned. Missing input identity stays unknown; never
// relabel a pre-action count with the returned branch just because it is nearby.
export function projectRosterParticipantCheckStateScopeV1(value){
  const check=value?.participantConfigurationCheck;
  if(check?.schema!=='roster_participant_configuration_check_v1')return null;
  const candidate={schema,contextRef:check.contextRef,
    sourceStateHash:check.sourceStateHash,stateHash:check.baseStateHash};
  const stateRef=valid(candidate)?candidate:null;
  const resultStateRef=projectRosterWorkflowStateReferenceV1(value);
  return {schema:'roster_participant_scene_state_scope_v1',version:1,role:'operation_input',
    operation:value.operation??null,stateRef,resultStateRef,
    bindingStatus:stateRef?'source_bound':'input_identity_unavailable',
    sameAsResultState:stateRef&&resultStateRef?isDeepStrictEqual(stateRef,resultStateRef):null,
    sourcePointers:['/participantConfigurationCheck/sourceStateHash','/participantConfigurationCheck/baseStateHash','/participantConfigurationCheck/contextRef'],
    originalValuesChanged:false,postOperationObservation:false,
    instruction:'sceneParticipants are the Native INPUT scene before this operation. They are not the returned scene counts or a verdict that placement/attack failed. Use the returned stateRef and its inspect/query for successor facts. A matched selection check proves purchased configuration only. Missing input identity remains unknown; no post-state identity is borrowed.'};
}
export function projectRosterParticipantConfigurationReadV1(value){
  const check=value?.participantConfigurationCheck;
  if(!check)return null;
  const sceneStateScope=projectRosterParticipantCheckStateScopeV1(value);
  return {...structuredClone(check),...(sceneStateScope?{sceneStateScope}:{})};
}
function reject(reason,detail){throw Object.assign(Error(reason),{code:reason,detail,dispatchOutcome:'not_dispatched',queryRepair:{correctable:true,
  sourceContract:schema,originalQueryNotAnswered:true,
  instruction:'Bind the complete /stateRef from the chosen tool result to arguments /stateRef. It includes the candidate and exact source/branch state. Do not combine a candidate receipt with an unrelated scene or hand-write hashes. Legacy base/contextRef may only accompany stateRef if identical. The original receipts remain available.'}});}

// Fresh execution and retained pre-dispatch stops share the same projection.
// A validator result is not a game receipt and never proves an action ran.
export function projectRosterWorkflowStateBindingFailureV1({selected,error}){
  if(error?.queryRepair?.sourceContract!==schema||error.queryRepair.correctable!==true
    ||error.dispatchOutcome!=='not_dispatched'||!error.boundArguments)return null;
  return {kind:'interpretation',continuation:true,value:{operation:selected.operation,
    submittedArguments:structuredClone(selected.args),request:structuredClone(error.boundArguments),
    inputBindings:structuredClone(error.inputBindings??[]),status:'returned_to_model',
    executed:false,nativeSuccess:false,dispatchOutcome:'not_dispatched',
    code:error.code||error.message,detail:structuredClone(error.detail??null),queryRepair:structuredClone(error.queryRepair)},
    conditions:['Bound input rejected before any Native dispatch; preserve its exact source and question for parameter repair']};
}
export function resolveRosterWorkflowStateReferenceV1(args,descriptor){
  const ref=args.stateRef;
  if(!valid(ref))reject('ROSTER_WORKFLOW_STATE_REF_INVALID');
  if(ref.sourceStateHash!==descriptor.sourceStateHash)reject('ROSTER_WORKFLOW_STATE_REF_SOURCE_MISMATCH',{
    requestedSource:ref.sourceStateHash,selectedSource:descriptor.sourceStateHash});
  const base=ref.stateHash===ref.sourceStateHash?{kind:'source'}:{kind:'branch',branchStateHash:ref.stateHash};
  const existingBase=args.base?.kind==='branch'&&args.base.branchStateHash===ref.sourceStateHash?{kind:'source'}:args.base;
  if(Object.hasOwn(args,'contextRef')&&args.contextRef!==ref.contextRef
    ||existingBase!==undefined&&existingBase!==null&&!isDeepStrictEqual(existingBase,base))
    reject('ROSTER_WORKFLOW_STATE_REF_CONFLICT');
  const {stateRef,...remaining}=structuredClone(args);
  return {...remaining,contextRef:ref.contextRef,base};
}

// A bound whole typed receipt is unambiguous even when placed in a legacy field.
// Normalize representation, never select a different state or discard conflicts.
export function isRosterWorkflowTypedStateAliasBindingV1(binding){
  return binding?.argumentPointer==='/branchIdRef'
    &&['/stateRef','/value/stateRef'].includes(binding.resultPointer);
}
export function normalizeRosterWorkflowStateReferenceArgumentsV1(args){
  const aliases=[...(args.base?.schema===schema?['base']:[]),
    ...(Object.hasOwn(args,'branchIdRef')?['branchIdRef']:[])];
  if(!aliases.length)return {args,binding:null};
  const ref=args[aliases[0]];
  if(aliases.some(key=>!valid(args[key])))reject('ROSTER_WORKFLOW_STATE_REF_INVALID',{
    fields:aliases,instruction:'Legacy branchIdRef is not a callable workflow scene name. Bind the complete saved /stateRef; an empty/string/partial reference must not silently select the initial scene.'});
  if(aliases.some(key=>!isDeepStrictEqual(args[key],ref)))reject('ROSTER_WORKFLOW_STATE_REF_CONFLICT');
  if(Object.hasOwn(args,'stateRef')&&!isDeepStrictEqual(args.stateRef,ref))
    reject('ROSTER_WORKFLOW_STATE_REF_CONFLICT');
  const remaining=structuredClone(args);for(const key of aliases)delete remaining[key];
  return {args:{...remaining,stateRef:structuredClone(ref)},binding:{argumentPointer:'/stateRef',
    priorFieldPresent:Object.hasOwn(args,'stateRef'),sourceArgumentPointer:'/'+aliases[0],
    ...(aliases.length>1?{sourceArgumentPointers:aliases.map(key=>'/'+key)}:{}),
    value:structuredClone(ref),normalization:'whole_typed_state_reference_v1'}};
}

// Delegation carries an operation's exact scene identity, not a new source
// search across every candidate. A failed operation can supply identity without
// supplying a successful result. Both prompt and executor use this projection.
export async function projectRosterWorkflowDelegatedScenesV1({state,workId,readArtifact}){
  const graph=createRosterWorkflowGraphV1(state),work=graph.get(workId);
  if(!work||!graph.isCurrent(workId))return [];
  const owner=work.role==='roster_workflow_tool'?graph.get(work.experimentOwnerId):work;
  if(!owner||!graph.isCurrent(owner.id))return [];
  const scenes=[];
  // Method continuation inherits the identities of its explicitly indexed,
  // completed same-study sources. Task retirement is not data invalidation.
  // Only those Host references are followed; no prose/hash search or choice.
  const progress=owner.inputs?.batchProgress?.value,goal=graph.owner(owner.id)?.goalId;
  if(owner.methodContinuationOf&&progress?.schema==='roster_experiment_batch_progress_v1'&&goal){
    const byEvidence=new Map(state.evidence.map(e=>[e.id,e]));
    for(const row of progress.sources??[]){
      if(row.status!=='completed'||typeof row.sourceEvidenceId!=='string'||!row.sourceEvidenceId.startsWith('tool:'))continue;
      const target=graph.get(row.sourceEvidenceId.slice(5)),entry=byEvidence.get(row.sourceEvidenceId);
      if(target?.role!=='roster_workflow_tool'||target.status!=='evidence_ready'||!target.resultRef
        ||graph.owner(target.id)?.goalId!==goal||entry?.kind!=='tool_receipt'
        ||!Object.entries(entry.bindings??{}).every(([key,value])=>owner.bindings[key]===value)
        ||!Object.entries(target.bindings??{}).every(([key,value])=>owner.bindings[key]===value))continue;
      const [result,source]=await Promise.all([readArtifact(target.resultRef),readArtifact(entry.artifactRef)]);
      const value=result?.kind==='tool_receipt'?result.value:result;
      const original=source?.kind==='tool_receipt'?source.value:source;
      if(value?.status!=='completed'||value.operation!==row.operation||!isDeepStrictEqual(value,original))continue;
      const stateRef=projectRosterWorkflowStateReferenceV1(value);
      if(!valid(stateRef))continue;
      scenes.push({stateRef,sourceWorkId:target.id,sourceResultRef:entry.artifactRef,
        sourceEvidenceId:entry.id,proof:{kind:'completed_same_study_scene_identity',
          goalId:goal,readRequiredForFactClaims:true,sourceWorkRetired:!graph.isCurrent(target.id),
          sourceApproved:false,sceneSelected:false}});
    }
  }
  for(const target of graph.pendingChain(owner.id)){
    if(!graph.isCurrent(target.id))continue;
    const saved=target.resultRef?await readArtifact(target.resultRef):null;
    // Prefer the actual bound submission over unresolved original arguments.
    const submitted=saved?.value?.submittedArguments??target.inputs?.request?.value?.args;
    if(valid(submitted?.stateRef))scenes.push({stateRef:structuredClone(submitted.stateRef),sourceWorkId:target.id,
      sourceResultRef:target.resultRef??null,proof:'delegated_input_identity_only'});
    // A failed hypothetical placement can register the exact scene to repair.
    // Its OUTPUT parent is distinct from the root that was used to construct it.
    // Only the Native receipt plus its same-question repair scope carries this
    // identity; this does not certify the placement or choose new geometry.
    const value=saved?.value,repair=value?.queryRepair;
    if(target.inputs?.request?.value?.operation==='scenario'&&value?.operation==='scenario'
      &&repair?.correctable===true&&repair.sourceContract==='pregame_hypothetical_geometry_repair_v1'
      &&repair.preparationScope?.kind==='same_question_private_geometry'){
      const stateRef=projectRosterWorkflowStateReferenceV1(value);
      if(valid(stateRef)&&stateRef.stateHash===repair.baseStateHash
        &&value.receipt?.branchStateRegisteredForQueries===true)
        scenes.push({stateRef,staticGeometryRepairParent:true,sourceWorkId:target.id,
          sourceResultRef:target.resultRef,proof:'delegated_failed_scene_identity_only'});
    }
    // Native selectors own their inspected parent; the model's submitted wire
    // deliberately has no duplicated stateRef. Carry the ACTUAL resolved input
    // binding, even when Native rejected the selected action's parameters.
    const selectionBindings=[...(saved?.value?.inputBindings??[])];
    if(!selectionBindings.some(b=>b.argumentPointer==='/selection')
      &&value?.code==='ROSTER_WORKFLOW_NATIVE_DOMAIN_PARAMETERS_INVALID'
      &&value.executed===false&&value.nativeSuccess===false&&target.inputRef){
      // Older early-validation receipts omitted their resolved input binding.
      // Reproject only the exact retained assignment through the SAME selector;
      // do not rewrite the receipt, execute it, or search for a replacement.
      const input=await readArtifact(target.inputRef),request=target.inputs?.request?.value;
      if(input?.workId!==target.id||!isDeepStrictEqual(input.bindings,target.bindings)
        ||!isDeepStrictEqual(input.inputs?.request?.value,request)
        ||!isDeepStrictEqual(value.submittedArguments,request?.args))
        reject('ROSTER_WORKFLOW_DELEGATED_SELECTION_INPUT_MISMATCH',{sourceWorkId:target.id});
      // Deferred import avoids initialization work across the executor/identity
      // seam; identity projection performs no Native dispatch.
      const {projectRosterWorkflowSelectedInputBindingV1}=await import('./roster-workflow-laboratory-v1.mjs');
      selectionBindings.push(projectRosterWorkflowSelectedInputBindingV1(request.args,input.inputs[request.nativeActionSource]));
    }
    for(const binding of selectionBindings){
      const resolved=binding.value,domainId=resolved?.action?.domainId??resolved?.domainId;
      if(binding.argumentPointer!=='/selection'||!valid(resolved?.stateRef)
        ||typeof domainId!=='string'||!domainId)continue;
      let sourceIdentity;
      if(binding.sourceResultRef)sourceIdentity={selectedSourceResultRef:binding.sourceResultRef,
        ...(binding.sourceWorkId?{selectedSourceWorkId:binding.sourceWorkId}:{}),selectedSourcePointer:binding.sourcePointer??''};
      else if(binding.sourceEvidenceId){
        // Saved evidence and same-batch work are two valid source transports.
        // Evidence has no work resultRef: resolve its exact registered artifact
        // and verify the already-bound identity, never search for a newer scene.
        const evidence=state.evidence.find(row=>row.id===binding.sourceEvidenceId);
        const original=evidence?.artifactRef?await readArtifact(evidence.artifactRef):null;
        let sourceValue=original?.kind==='tool_receipt'&&original.value?original.value:original;
        for(const key of (binding.sourcePointer??'').split('/').slice(1)
          .map(k=>k.replaceAll('~1','/').replaceAll('~0','~')))
          sourceValue=sourceValue&&typeof sourceValue==='object'?sourceValue[key]:undefined;
        const sourceRef=projectRosterWorkflowStateReferenceV1(sourceValue);
        if(evidence?.kind!=='tool_receipt'||!isDeepStrictEqual(sourceRef,resolved.stateRef))
          reject('ROSTER_WORKFLOW_DELEGATED_SELECTION_SOURCE_MISMATCH',{
            sourceEvidenceId:binding.sourceEvidenceId,sourceWorkId:target.id,
            requestedStateRef:resolved.stateRef,sourceStateRef:sourceRef});
        sourceIdentity={selectedSourceEvidenceId:evidence.id,selectedSourceArtifactRef:evidence.artifactRef,
          selectedSourcePointer:binding.sourcePointer??''};
      }else continue;
      scenes.push({stateRef:structuredClone(resolved.stateRef),selectedDomainId:domainId,
        selectedSeatKey:resolved.seatKey,sourceWorkId:target.id,sourceResultRef:target.resultRef,
        ...sourceIdentity,proof:'delegated_resolved_selection_identity_only'});
    }
  }
  return scenes;
}

export function bindRosterWorkflowDelegatedSceneV1({args,scenes}){
  // An explicit context (including null) or whole reference is never overridden.
  if(Object.hasOwn(args,'stateRef')||Object.hasOwn(args,'contextRef'))return {args,binding:null};
  let matches,normalization='delegated_scene_identity_v1';
  if(args.base?.kind==='branch'&&hash(args.base.branchStateHash)){
    matches=scenes.filter(row=>row.stateRef.stateHash===args.base.branchStateHash);
  }else if(!Object.hasOwn(args,'base')&&args.queryKind==='space.solve_static_formation'){
    // Repair the already delegated failed scene, not the initial laboratory.
    // Explicit parents are never replaced; ambiguity still requires a choice.
    matches=scenes.filter(row=>row.staticGeometryRepairParent===true);
    normalization='delegated_static_geometry_parent_v1';
  }else if(!Object.hasOwn(args,'base')&&['space.solve_formation','legal_formation_options'].includes(args.queryKind)){
    // This is a prerequisite of one already selected current-domain action,
    // NOT a generic default scene for other queries or new experiments.
    let query=args.queryArguments;
    if(!query&&typeof args.argumentsJson==='string')try{query=JSON.parse(args.argumentsJson);}catch{return {args,binding:null};}
    const domains=scenes.filter(row=>typeof row.selectedDomainId==='string');
    if(!domains.length||typeof query?.domainId!=='string')return {args,binding:null};
    matches=domains.filter(row=>row.selectedDomainId===query.domainId);
    if(!matches.length)reject('ROSTER_WORKFLOW_DELEGATED_DOMAIN_MISMATCH',{
      requestedDomainId:query.domainId,selectedDomains:domains.map(row=>({domainId:row.selectedDomainId,stateRef:row.stateRef})),
      instruction:'This prerequisite belongs to the pending selected action. Keep its exact domain and saved parent, or explicitly return to the owner; do not replace a missing-state error with an unrelated initial-scene domain.'});
    normalization='delegated_current_domain_parent_v1';
  }else return {args,binding:null};
  if(!matches.length)return {args,binding:null};
  const first=matches[0];
  if(matches.some(row=>!isDeepStrictEqual(row.stateRef,first.stateRef)))
    reject('ROSTER_WORKFLOW_DELEGATED_SCENE_AMBIGUOUS',{branchStateHash:args.base?.branchStateHash??null,
      candidateReferences:matches.map(row=>row.stateRef)});
  return {args:{...args,stateRef:structuredClone(first.stateRef)},binding:{
    argumentPointer:'/stateRef',priorFieldPresent:false,value:structuredClone(first.stateRef),
    sourceWorkId:first.sourceWorkId,sourceResultRef:first.sourceResultRef,
    normalization,proof:first.proof}};
}
