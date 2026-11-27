// Upgrade missing feedback, not a verdict or model choice. Original successful
// query execution and its illegal receipt remain immutable/readable.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterInvestigationContinuationV1} from './roster-workflow-fact-inquiry-v1.mjs';
import {armyBuilderConstraintDiagnosticEvidenceIdV1,verifyArmyBuilderRejectionReceiptV1} from './army-builder-query-port-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
export async function refreshRosterBuilderConstraintDiagnosticsV1({state,workId,request,readArtifact,evaluateCandidate,publishEvidence}){
  const work=state.work.find(w=>w.id===workId),errors=work?.operationState?.correction?.errors??[];
  const sent=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  const delivered=request?.promptNodes?.find(n=>n.kind==='investigation_continuation_contract');
  if(work?.role!=='roster_workflow_strategy_decision'||work.status!=='needs_repair'
    ||!['ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED','ROSTER_WORKFLOW_ROLE_NO_PROGRESS'].includes(work.failure?.code)
    ||work.operationState?.pending||!work.operationState?.correction?.originalReplyRef
    ||sent?.workId!==work.id||sent.role!==work.role||!rosterWorkflowBindingsMatchV1(work.bindings,sent.scope)
    ||!errors.length||!errors.every(e=>e.code==='repeated_answered_candidate_query')
    ||delivered?.answeredCandidateQueries?.some(q=>q.audit?.constraintDiagnostics))return null;
  const continuation=await projectRosterInvestigationContinuationV1({state,workId,readArtifact}),publishedEvidenceIds=[];
  for(const row of continuation?.answeredCandidateQueries??[]){
    const old=row.audit;
    if(old.status!=='illegal'||!['ARMY_SLOT_CAPACITY_EXCEEDED','ARMY_VESPENE_BUDGET_EXCEEDED'].includes(old.rulesErrorCode))continue;
    const id=armyBuilderConstraintDiagnosticEvidenceIdV1(old.artifactRef);
    if(old.constraintDiagnostics){publishedEvidenceIds.push(id);continue;}
    if(state.evidence.some(e=>e.id===id))throw Error('ROSTER_BUILDER_DIAGNOSTIC_SOURCE_CONFLICT');
    const original=await readArtifact(old.artifactRef),candidate=original?.request?.candidateInput;
    if(original?.operation!=='builder_audit'||original.status!=='completed'||!candidate
      ||hash(candidate)!==original.receipt?.candidateHash)throw Error('ROSTER_BUILDER_DIAGNOSTIC_CANDIDATE_MISMATCH');
    const receipt=await evaluateCandidate(candidate);
    verifyArmyBuilderRejectionReceiptV1(receipt);
    for(const key of ['status','rulesErrorCode','rulesErrorDetail','candidateHash','unitCompositionUpgradeDataBundleHash'])
      if(receipt[key]!==original.receipt[key])throw Error('ROSTER_BUILDER_DIAGNOSTIC_VERDICT_CHANGED:'+key);
    if(!receipt.constraintDiagnostics)throw Error('ROSTER_BUILDER_DIAGNOSTIC_UNAVAILABLE');
    await publishEvidence({id,title:'Native constraint detail for the unchanged rejected candidate',kind:'tool_receipt',
      bindings:work.bindings,conditions:['Same frozen candidate and Rules verdict; failed constraint only, not complete legality or a strategy choice'],
      value:{operation:'builder_audit',status:'completed',request:{candidateInput:structuredClone(candidate)},receipt,
        diagnosticFor:{originalArtifactRef:old.artifactRef,originalEvidenceId:old.evidenceId,version:1,
          originalPreserved:true,providerCalls:0,readOnly:true}}});
    publishedEvidenceIds.push(id);
  }
  if(!publishedEvidenceIds.length)return null;
  return {workId,originalReplyRef:work.operationState.correction.originalReplyRef,
    repairKind:'builder_constraint_diagnostics',feedbackVersion:'c12-native-constraint-v1',publishedEvidenceIds,
    recoveryKey:hash({workId,repairKind:'builder_constraint_diagnostics',version:1}),
    additionalInvalidResultLimit:1,historyReset:false,originalPaidReplyPreserved:true,
    newCorrectiveProviderRequest:true,nativeReplayed:'read_only_constraint_audits',finalApprovalGranted:false};
}
