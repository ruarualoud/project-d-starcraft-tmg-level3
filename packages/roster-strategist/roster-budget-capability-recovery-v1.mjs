// A new Native-checked search result can reopen one stopped construction choice.
// Never reinterpret the old retain, select a branch or clear prior attempts.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {ROSTER_BUDGET_CURRENT_GENERATION_POLICY as policy} from './roster-budget-branch-query-v1.mjs';
export async function projectRosterBudgetCapabilityRecoveryV1({state,work,request,readArtifact}){
 if(work?.role!=='roster_workflow_strategy_decision'||work.status!=='needs_repair'
   ||work.operationState?.pending||work.failure?.dispatchOutcome!=='completed_invalid')return null;
 const assignment=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
 if(assignment?.workId!==work.id||!Object.entries(state.scope).every(([k,v])=>work.bindings?.[k]===v&&assignment.scope?.[k]===v))return null;
 const errors=work.operationState.correction?.errors??[];
 if(!errors.length||!errors.every(e=>e.code==='strategy_required_work_has_no_next_step'))return null;
 const call=work.operationState.calls?.at(-1);
 if(!call?.replyRef||call.replyRef!==work.operationState.correction.originalReplyRef)return null;
 const draft=state.draftRef?await readArtifact(state.draftRef):null;
 if(draft?.mode!=='editable')return null;
 const candidateHash=hash(draft.candidateInput);
 for(const [index,entry] of state.evidence.entries()){
  if(entry.kind!=='tool_receipt'||!entry.id.startsWith('tool:budget-options:'+policy+':')
    ||!['army','rules','source'].every(k=>entry.bindings?.[k]===state.scope[k]))continue;
  const value=await readArtifact(entry.artifactRef),receipt=value?.receipt;
  if(value?.operation!=='builder_branches'||value.status!=='completed'||receipt?.generationPolicy!==policy
    ||receipt.sourceCandidateHash!==candidateHash||!receipt.branches?.some(b=>b.exactBudget)
    ||!(receipt.sourceMineralShortfall>0))continue;
  // If this exact new result was already delivered, another unchanged restart
  // must not mint another author correction.
  if(assignment.inputs?.currentBudgetOptions?.value?.generationPolicy===policy
    ||JSON.stringify(assignment.inputs?.currentBudgetOptions??{}).includes(receipt.receiptHash))return null;
  return {repairKind:'budget_search_capability',workId:work.id,sourceReplyRef:call.replyRef,
   recoveryKey:hash({kind:'budget_search_capability',policy,workId:work.id,bindings:work.bindings}),
   evidenceNumber:index+1,artifactRef:entry.artifactRef,receiptHash:receipt.receiptHash,
   acceptanceGranted:false,providerReplayed:false,nativeReplayAuthorized:false,
   instruction:'The earlier finite search could not combine size changes with newly added upgraded units. The current version '+policy+' has now returned Native-legal exact-budget options for YOUR unchanged current draft in evidence '+(index+1)+'. This is new constructive evidence, not a strategic recommendation or proof of superiority. Read the currentBudgetOptions and exact candidate sources; make your own justified next army/Plan choice, or a precise decision-changing inquiry. The target of '+draft.candidateInput.mineralBudget+' points and your existing edit authority are unchanged. Keep all earlier failures, choices and fees. One additional author decision from this concrete capability fix; no Host-selected army, automatic Plan approval or repeated allowance for the same version.'};
 }
 return null;
}
