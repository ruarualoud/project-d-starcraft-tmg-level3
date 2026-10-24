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
function reject(reason,detail){throw Object.assign(Error(reason),{code:reason,detail,queryRepair:{correctable:true,
  sourceContract:schema,originalQueryNotAnswered:true,
  instruction:'Bind the complete /stateRef from the chosen tool result to arguments /stateRef. It includes the candidate and exact source/branch state. Do not combine a candidate receipt with an unrelated scene or hand-write hashes. Legacy base/contextRef may only accompany stateRef if identical. The original receipts remain available.'}});}
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

// A bound whole typed receipt is unambiguous even when placed in legacy /base.
// Normalize representation, never select a different state or discard conflicts.
export function normalizeRosterWorkflowStateReferenceArgumentsV1(args){
  if(args.base?.schema!==schema)return {args,binding:null};
  const ref=args.base;
  if(!valid(ref))reject('ROSTER_WORKFLOW_STATE_REF_INVALID');
  if(Object.hasOwn(args,'stateRef')&&!isDeepStrictEqual(args.stateRef,ref))
    reject('ROSTER_WORKFLOW_STATE_REF_CONFLICT');
  const {base,...remaining}=structuredClone(args);
  return {args:{...remaining,stateRef:base},binding:{argumentPointer:'/stateRef',
    priorFieldPresent:Object.hasOwn(args,'stateRef'),sourceArgumentPointer:'/base',
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
  for(const target of graph.pendingChain(owner.id)){
    if(!graph.isCurrent(target.id))continue;
    const saved=target.resultRef?await readArtifact(target.resultRef):null;
    // Prefer the actual bound submission over unresolved original arguments.
    const submitted=saved?.value?.submittedArguments??target.inputs?.request?.value?.args;
    if(valid(submitted?.stateRef))scenes.push({stateRef:structuredClone(submitted.stateRef),sourceWorkId:target.id,
      sourceResultRef:target.resultRef??null,proof:'delegated_input_identity_only'});
    // Native selectors own their inspected parent; the model's submitted wire
    // deliberately has no duplicated stateRef. Carry the ACTUAL resolved input
    // binding, even when Native rejected the selected action's parameters.
    for(const binding of saved?.value?.inputBindings??[]){
      const resolved=binding.value,domainId=resolved?.action?.domainId??resolved?.domainId;
      if(binding.argumentPointer!=='/selection'||!valid(resolved?.stateRef)
        ||typeof domainId!=='string'||!domainId||!binding.sourceResultRef)continue;
      scenes.push({stateRef:structuredClone(resolved.stateRef),selectedDomainId:domainId,
        selectedSeatKey:resolved.seatKey,sourceWorkId:target.id,sourceResultRef:target.resultRef,
        selectedSourceResultRef:binding.sourceResultRef,proof:'delegated_resolved_selection_identity_only'});
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
