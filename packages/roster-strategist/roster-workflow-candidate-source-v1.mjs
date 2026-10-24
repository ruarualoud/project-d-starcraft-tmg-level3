// Exact saved proposal, not permission to reuse its historical audit as current.
// Discovery and selection share this projection; Native rechecks on every edit.
export function rosterAuditedCandidateSourceV1(value){
  if(value?.operation==='builder_audit'
    &&value.receipt?.schema==='starcraft_tmg_army_builder_roster_verdict_v1'
    &&value.receipt.status==='legal'&&value.request?.candidateInput)
    return {candidateInput:value.request.candidateInput,candidatePointer:'/request/candidateInput',
      historicalAudit:value.receipt};
  if(value?.operation==='candidate_context'&&value.receipt?.resultStatus==='ok'
    &&value.receipt.audit?.schema==='starcraft_tmg_army_builder_roster_verdict_v1'
    &&value.receipt.audit.status==='legal'&&value.receipt.candidateInput)
    return {candidateInput:value.receipt.candidateInput,candidatePointer:'/receipt/candidateInput',
      historicalAudit:value.receipt.audit};
  return null;
}
