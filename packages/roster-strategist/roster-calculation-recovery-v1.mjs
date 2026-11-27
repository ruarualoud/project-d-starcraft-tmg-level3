// Invalidate obsolete calculations, not their immutable historical artifacts.
// Recompute only the same read-only observations; strategic choice stays with
// the author. No scene/action replay, fabricated receipt, or counter reset.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {PREGAME_COMBAT_QUERY_IMPLEMENTATION_VERSION as version} from './pregame-scene-laboratory-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {normalizeRosterWorkflowStateReferenceArgumentsV1,resolveRosterWorkflowStateReferenceV1,
  projectRosterWorkflowStateReferenceV1} from './roster-workflow-state-reference-v1.mjs';
const copy=structuredClone;
const current=(x,state)=>Object.entries(x.bindings??{}).every(([k,v])=>state.scope[k]===v);
const combat=new Set(['probability','threat_exchange']);
export async function projectRosterCalculationRecoveryV1({state,readArtifact}){
  if(!state||state.work.some(w=>w.status==='running'||w.operationState?.pending))return null;
  const obsolete=[];
  for(const work of state.work){
    if(work.role!=='roster_workflow_tool'||!work.resultRef||work.calculationInvalidation
      ||!current(work,state)||!['inspect',...combat].includes(work.inputs?.request?.value?.operation))continue;
    const result=await readArtifact(work.resultRef),value=result.value;
    if(value?.operation==='inspect'){
      // Concrete source repair: a complete typed selection was ignored, and
      // the saved result proves it came from a DIFFERENT source/state. This is
      // not a stale version flag or permission to retry arbitrary queries.
      if(result.kind!=='tool_receipt'||value.status!=='completed'
        ||!Object.hasOwn(value.submittedArguments??{},'branchIdRef'))continue;
      let normalized;try{
        normalized=normalizeRosterWorkflowStateReferenceArgumentsV1(value.submittedArguments);
        resolveRosterWorkflowStateReferenceV1(normalized.args,{sourceStateHash:normalized.args.stateRef.sourceStateHash});
      }catch{continue;} // Ambiguous/malformed inputs still need model correction.
      const actual=projectRosterWorkflowStateReferenceV1(value);
      if(actual&&!isDeepStrictEqual(actual,normalized.args.stateRef))obsolete.push({work,value,
        recoveryVersion:'selected-state-identity-v1',expectedStateRef:normalized.args.stateRef,actualStateRef:actual});
      continue;
    }
    if(result.kind!=='tool_receipt'||value?.status!=='completed'||value.receipt?.resultStatus!=='ok'
      ||value.receipt.queryImplementationVersion===version)continue;
    obsolete.push({work,value,recoveryVersion:version});
  }
  if(!obsolete.length)return null;
  const obsoleteIds=new Set(obsolete.map(({work})=>work.id)),invalidEvidence=new Set();
  for(const {work}of obsolete)for(const prefix of ['tool:','tool-view:'])invalidEvidence.add(prefix+work.id);
  const invalidModels=new Set();let changed=true;
  while(changed){changed=false;
    for(const work of state.work){
      if(work.role==='roster_workflow_tool'||invalidModels.has(work.id))continue;
      const used=Object.values(work.inputs??{}).some(input=>input.scopeUsage!=='historical_reference'
        &&(input.source==='evidence'&&invalidEvidence.has(input.id)||input.source==='work'&&(obsoleteIds.has(input.id)||invalidModels.has(input.id))))
        ||state.reads.some(read=>read.consumer===work.id&&invalidEvidence.has(read.evidenceId));
      if(!used)continue;
      invalidModels.add(work.id);invalidEvidence.add('role:'+work.id);
      for(const e of state.evidence)if(e.id.startsWith('role-context:'+work.id+':'))invalidEvidence.add(e.id);
      changed=true;
    }
  }
  let prior=[...state.work].reverse().find(w=>w.role==='roster_workflow_strategy_decision'
    &&w.status!=='superseded'&&current(w,state)&&invalidModels.has(w.id));
  // If the bad tool result was caught immediately after its summary, its
  // author has not consumed it yet. Return the repair to that exact delegator,
  // not a guessed global author, and retain the old decision as history.
  if(!prior)for(const item of [...obsolete].reverse()){
    if(!item.expectedStateRef)continue;
    const method=state.work.find(w=>w.id===item.work.experimentOwnerId);
    const owner=state.work.find(w=>w.id===method?.investigationFor);
    if(owner?.role==='roster_workflow_strategy_decision'&&owner.status!=='superseded'&&current(owner,state)){prior=owner;break;}
  }
  const stateSelection=obsolete.every(item=>item.expectedStateRef);
  const recoveryVersion=stateSelection?'selected-state-identity-v1':version;
  const groups=new Map();
  for(const item of obsolete){
    const key=item.expectedStateRef?hash({receipt:item.value.receipt,expectedStateRef:item.expectedStateRef})
      :item.value.receipt.receiptHash??hash(item.value.receipt);
    // Prefer the final executable leaf to an earlier resolution alias.
    const old=groups.get(key);
    if(!old||!item.work.resolvedByWorkId)groups.set(key,item);
  }
  const queries=[...groups.values()].map(({work,value,recoveryVersion})=>{
    const request=copy(work.inputs.request.value);
    request.args=copy(value.submittedArguments??request.args);
    // Submitted arguments are already resolved by the original tool port.
    // Keep the original request/guards/assumptions, but never resolve old binds
    // against newly generated evidence or invent a replacement scene.
    request.bindings=[];
    return {id:work.id+':calculation:'+recoveryVersion,role:'roster_workflow_tool',
      bindings:Object.fromEntries(Object.entries(work.bindings).filter(([k])=>k!=='plan')),
      calculationRecoveryQuery:{version:recoveryVersion,sourceWorkId:work.id,sourceResultRef:work.resultRef},
      inputs:{request:{source:'literal',value:request}}};
  });
  const report={schema:'roster_calculation_invalidation_v1',version:1,implementationVersion:recoveryVersion,
    recoveryKind:stateSelection?'selected_state_identity':'calculation',
    reason:stateSelection?'Saved inspect ignored a complete selected state reference and returned another scene. Retire that result and dependent interpretations; read only the exact originally selected state. No action, geometry or comparison is replayed.'
      :'Saved combat probability used an obsolete effective-HP implementation; recalculate before using its numerical conclusions.',
    obsolete:obsolete.map(({work,value,expectedStateRef,actualStateRef})=>({workId:work.id,resultRef:work.resultRef,
      operation:value.operation,previousImplementationVersion:value.receipt.queryImplementationVersion??'unversioned',
      ...(expectedStateRef?{expectedStateRef:copy(expectedStateRef),actualStateRef:copy(actualStateRef)}:{})})),
    invalidEvidenceIds:[...invalidEvidence].filter(id=>state.evidence.some(e=>e.id===id)),
    affectedInterpretationIds:[...invalidModels],authorWorkId:prior?.id??null,
    originalArtifactsPreserved:true,nativeActionsReplayed:false,planApproved:false,historyReset:false};
  let author=null;
  if(prior){
    const inputs={};
    for(const key of ['draft','wholeDraft','requirements','originalInvestigationScope','originalTask','investigationFrontier'])
      if(prior.inputs[key])inputs[key]=copy(prior.inputs[key]);
    inputs.previousStrategicDecision={source:'evidence',id:'role:'+prior.id,pointer:'',scopeUsage:'historical_reference'};
    inputs.calculationCorrection={source:'literal',value:report};
    inputs.question={source:'literal',value:{
      goal:stateSelection?'工具误读了初始空桌而非已选候选场景；现读取原指定场景，依据正确菜单归还该限定调查，不沿用错误空菜单结论。'
        :'已知计算错误已修正；据同一条件的重算结果重新判断，而非沿用旧数值或旧保留结论。',
      originalAssignment:copy(prior.inputs.question?.value??null),
      instruction:stateSelection?'correctedFacts read the exact originally selected scene; the wrong initial-scene inspect and its summary are historical invalid answers to this query. An existing correct inspection of this same state remains usable. Do not inspect it again. Read the saved exact menu: either use the intended available action, report that the intended action is absent in this exact state, or return an inconclusive design to the strategic owner. Menu absence in this state is not a global Rules prohibition. Do not invent a new scene, expand to other Plan predicates, simulate a match, or turn this repair into a measured superiority claim. A conditional static scene need not support the requested charge experiment; retain that limitation and use the reviewed unresolved-hypothesis exit when appropriate.'
        :'Only correctedFacts are the new calculations. Old sources and the prior author decision remain historical, not valid numerical evidence. Compare the changed observations and their uncertainty, preserve valid unrelated facts, and reconsider army/Plan through normal author commands. A single attack observation does not establish range value or overall superiority. You may retain a provisional choice and defer an inconclusive comparison using the normal reviewed unresolved-hypothesis contract. No forced upgrade swap, full-match simulation, replay of geometry/actions, or claim of final Plan approval.'}};
    queries.forEach((work,i)=>{inputs['correctedFacts'+i]={source:'work',id:work.id,pointer:'/value'};});
    author={id:prior.id+':calculation:'+recoveryVersion,role:prior.role,bindings:copy(state.scope),draftRevision:state.draftRevision,
      calculationRecoveryOf:prior.id,investigationFrontierOf:prior.investigationFrontierOf,
      investigationOwnerId:prior.investigationOwnerId,inputs};
  }
  return {report,queries,author};
}
