// A model selects an immutable Builder branch; Host copies it, never retypes it.
// The same resolver is used before author confirmation and at the Run commit.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {rosterAuditedCandidateSourceV1} from './roster-workflow-candidate-source-v1.mjs';
const fail=(code,detail)=>{throw Object.assign(Error(code),{code,detail,dispatchOutcome:'not_dispatched'});};
const body=value=>value?.kind&&value.value?value.value:value;
function containsCandidate(value,candidate){
  if(!value||typeof value!=='object')return false;
  if(isDeepStrictEqual(value,candidate))return true;
  return Object.values(value).some(child=>containsCandidate(child,candidate));
}
export async function resolveRosterWorkflowBudgetSelectionV1({decision,draft,state,work,store,assignmentInputs={}}){
  const mutation=decision.mutation,exactSelection=mutation?.rosterCandidateSelection,
    selection=exactSelection??mutation?.rosterBranchSelection;
  if(!selection)return null;
  if(draft.mode==='fixed')fail('ROSTER_WORKFLOW_FIXED_ARMY_MUTATION_FORBIDDEN');
  if(exactSelection&&mutation.rosterBranchSelection||mutation.unitsToUpsert.length||mutation.unitIdsToRemove.length||mutation.tacticalCardRecordKeys!==null)
    fail('ROSTER_WORKFLOW_BRANCH_SELECTION_EDIT_CONFLICT',{
      instruction:'Choose ONE rosterCandidateSelection, rosterBranchSelection, or explicit unit/card edits. Plan edits remain independent.'});
  const entry=state.evidence[selection.sourceEvidenceNumber-1];
  if(!entry)fail('ROSTER_WORKFLOW_BRANCH_SOURCE_NOT_FOUND');
  let original=entry,value=body(await store.get(entry.artifactRef));
  if(value?.schema==='roster_workflow_receipt_view_v1'){
    original=state.evidence.find(e=>e.id===value.evidenceId);
    if(!original)fail('ROSTER_WORKFLOW_BRANCH_SOURCE_NOT_FOUND');
    value=body(await store.get(original.artifactRef));
  }
  let candidateInput,candidatePointer;
  if(exactSelection){
    const saved=rosterAuditedCandidateSourceV1(value);
    if(!saved)fail('ROSTER_WORKFLOW_CANDIDATE_SOURCE_KIND_INVALID');
    ({candidateInput,candidatePointer}=saved);
    const changed=['sideKey','factionRecordKey','scaleId','mineralBudget']
      .filter(k=>candidateInput[k]!==draft.candidateInput[k]);
    if(changed.length)fail('ROSTER_WORKFLOW_CANDIDATE_SOURCE_SCOPE_MISMATCH',{fields:changed});
    // This is a historical PROPOSAL from this Run, never a current Rules
    // verdict. Copying it is safe only because the commit re-audits it.
  }else{
    const factualBindings=Object.fromEntries(Object.entries(original.bindings??{}).filter(([key])=>key!=='plan'));
    if(!rosterWorkflowBindingsMatchV1(factualBindings,state.scope)
      ||value?.receipt?.sourceCandidateHash!==hash(draft.candidateInput))
      fail('ROSTER_WORKFLOW_BRANCH_SOURCE_STALE',{
        instruction:'This branch belongs to another factual candidate/rules/source. Select a current Builder branch or propose explicit edits; Plan-only wording does not invalidate the same factual candidate.'});
    if(value.operation!=='builder_branches')fail('ROSTER_WORKFLOW_BRANCH_SOURCE_KIND_INVALID');
    const index=value.receipt.branches.findIndex(b=>b.branchId===selection.branchId),branch=value.receipt.branches[index];
    if(!branch)fail('ROSTER_WORKFLOW_BRANCH_NOT_FOUND');
    candidateInput=branch.candidateInput;candidatePointer=`/receipt/branches/${index}/candidateInput`;
  }
  const sameSource=id=>id===original.id||id===entry.id||id?.replace(/^tool-view:/,'tool:')===original.id;
  let delivered=false;
  for(const row of work.operationState?.deliveredReads??work.operationState?.reads??[]){
    if(!sameSource(row.evidenceId))continue;
    const read=await store.get(row.resultRef);
    if(read.status==='read'&&containsCandidate(read.value,candidateInput)){delivered=true;break;}
  }
  if(!delivered)delivered=Object.values(assignmentInputs).some(input=>input.source==='evidence'
    &&sameSource(input.evidenceId)&&input.status==='read'&&containsCandidate(input.value,candidateInput));
  if(!delivered)fail('ROSTER_WORKFLOW_BRANCH_CANDIDATE_NOT_DELIVERED',{
    // candidatePointer belongs to the ORIGINAL source. A view may not expose
    // /request (and must never be mistaken for a different candidate body).
    read:{evidenceNumber:state.evidence.findIndex(e=>e.id===original.id)+1,pointer:candidatePointer},
    instruction:'Read this exact candidate, then confirm or revise the selection. A branch directory or claimed 1860/2000 total is not the candidate body; do not copy unit/upgrades from memory.'});
  return {candidateInput:structuredClone(candidateInput),receipt:{...selection,sourceEvidenceId:original.id,
    sourceArtifactRef:original.artifactRef,candidatePointer,candidateHash:hash(candidateInput),
    ...(exactSelection?{selectionKind:'audited_candidate',historicalProposalOnly:true,
      originalBindings:structuredClone(original.bindings??{})}:{}),
    builderRecheckRequired:true,strategyApprovalGranted:false}};
}
