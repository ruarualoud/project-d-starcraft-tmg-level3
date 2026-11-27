// A negative Native observation is a fact about one exact candidate, not an
// adoptable candidate, strategy ranking, or permission to rewrite the army.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterBuilderInquiryStepV1} from './roster-builder-inquiry-v1.mjs';
import {projectRosterCandidateEditsV1} from './roster-workflow-candidate-context-v1.mjs';
import {rosterAuditedCandidateSourceV1} from './roster-workflow-candidate-source-v1.mjs';
const clone=structuredClone;
export function rosterRejectedCandidateSourceV1(value){
  let audit;
  if(value?.operation==='builder_audit')audit=value.receipt;
  else if(value?.operation==='builder_branches'
    &&value.code==='ROSTER_BUDGET_BRANCH_BASELINE_NOT_RULES_LEGAL'
    &&value.queryRepair?.sourceContract==='native_builder_branch_legal_baseline_v1'
    &&isDeepStrictEqual(value.request?.candidateInput,value.queryRepair.candidateInput)
    &&isDeepStrictEqual(value.detail?.baselineAudit,value.queryRepair.baselineAudit))
    audit=value.queryRepair.baselineAudit;
  const candidate=value?.request?.candidateInput;
  if(audit?.schema!=='starcraft_tmg_army_builder_rejection_receipt_v1'
    ||audit.status!=='illegal'||!audit.rulesAuthority||!candidate
    ||audit.candidateHash!==hash(candidate))return null;
  return {candidateInput:candidate,candidatePointer:'/request/candidateInput',audit};
}
export function rosterRejectedCandidateContractV1({assignment,descriptor,rejections=[],candidateBases=[]}){
  if(assignment.role!=='roster_workflow_strategy_decision'||!descriptor?.laboratory?.builderBundleHash)return null;
  const entries=rejections.filter(row=>row.rulesHash===assignment.scope.rules
    &&row.audit.unitCompositionUpgradeDataBundleHash===descriptor.laboratory.builderBundleHash)
    .map(({audit,...row})=>({...clone(row),candidateHash:audit.candidateHash,
      nativeReceiptHash:audit.receiptHash,portId:audit.portId,portVersion:audit.portVersion,
      rulesErrorCode:audit.rulesErrorCode,rulesErrorDetail:clone(audit.rulesErrorDetail),
      constraintDiagnostics:clone(audit.constraintDiagnostics),
      nativeAuditExecuted:true,branchSearchExecuted:false}));
  if(!entries.length)return null;
  return {kind:'rejected_candidate_identity_contract',version:1,entries,
    candidateBases:clone(candidateBases),rulesHash:assignment.scope.rules,
    builderBundleHash:descriptor.laboratory.builderBundleHash,
    candidateSelectionGranted:false,acceptanceGranted:false,
    instruction:'These are exact already-read Native ILLEGAL candidate identities under the current Rules/data, not summaries or new experiments. Host materializes your explicit candidateQuery with the SAME conversion and edits as execution. An identical candidate reuses its negative result and cannot authorize another audit/search by changing prose, question, work ID or search bounds. Native constraintDiagnostics identifies actual consumed/provided slots; do not recalculate legality from unit names. Choose a genuinely different candidate yourself, use the saved result for a reasoned decision, or investigate another necessary fact. An unexecuted branch search is NOT an empty page or proof that no army exists. Changed candidates/sources still require normal Native evaluation. No automatic replacement, draft edit or strategy approval.'};
}
export async function rosterRejectedCandidateQueryErrorV1({request,decision,readArtifact}){
  const contract=request.promptNodes?.find(n=>n.kind==='rejected_candidate_identity_contract'&&n.version===1);
  const query=decision.nextInvestigation?.candidateQuery;
  if(!contract||!query||decision.disposition!=='investigate')return null;
  // Never retroactively constrain an old paid request. A revise-then-query
  // uses the POST-commit baseline; the current draft cannot identify that arm.
  const assigned=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  if(assigned?.role!=='roster_workflow_strategy_decision')return null;
  let baseline=assigned.inputs.wholeDraft?.value?.candidateInput;
  if(query.baseEvidenceNumber){
    const source=[...contract.candidateBases,...contract.entries]
      .find(e=>e.sourceEvidenceNumber===query.baseEvidenceNumber);
    if(!source)return null; // Existing citation/source checks retain ownership.
    const raw=await readArtifact(source.sourceArtifactRef),body=raw?.value??raw;
    baseline=rosterAuditedCandidateSourceV1(body)?.candidateInput
      ??rosterRejectedCandidateSourceV1(body)?.candidateInput;
  }
  if(!baseline)return null;
  let candidate;
  try{
    const step=projectRosterBuilderInquiryStepV1({operation:query.operation,argumentsJson:'{}',bindings:[]},
      {version:1,query});
    candidate=projectRosterCandidateEditsV1(baseline,JSON.parse(step.argumentsJson).candidateEdits);
  }catch{return null;} // Addressing failures remain their distinct Native/input lane.
  const candidateHash=hash(candidate),match=contract.entries.find(e=>e.candidateHash===candidateHash);
  if(!match)return null;
  return {code:'author_candidate_already_native_illegal',candidateHash,
    sourceEvidenceNumber:match.sourceEvidenceNumber,sourceEvidenceId:match.sourceEvidenceId,
    sourceArtifactRef:match.sourceArtifactRef,nativeReceiptHash:match.nativeReceiptHash,
    rulesErrorCode:match.rulesErrorCode,rulesErrorDetail:clone(match.rulesErrorDetail),
    constraintDiagnostics:clone(match.constraintDiagnostics),
    candidateSelectionRewritten:false,branchSearchExecuted:false,
    instruction:contract.instruction};
}
