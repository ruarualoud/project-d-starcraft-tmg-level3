// P1/P4 fact bookkeeping is NOT a strategic Plan commit. The explicit model
// operation chooses this lane; Host never infers that a revision is trivial.
const clone=value=>structuredClone(value);
import {isDeepStrictEqual} from 'node:util';
import {rosterDecisionInquiryDispatchV1} from './roster-workflow-fact-inquiry-v1.mjs';
export function createRosterWorkflowNonRevisionOutcomeV1(decision){
  if(!['record_facts','retain','investigate'].includes(decision.disposition)||decision.mutation!==null)
    throw Error('ROSTER_NON_REVISION_DECISION_INVALID');
  const inquiryDispatch=rosterDecisionInquiryDispatchV1(decision);
  if(decision.disposition!=='record_facts')return {applied:false,status:decision.disposition,decision:clone(decision),draftUnchanged:true,inquiryDispatch,acceptanceGranted:false};
  if(!Array.isArray(decision.strategicChanges)||decision.strategicChanges.length||!decision.evidenceRefs?.length)
    throw Error('ROSTER_FACT_RECORD_REQUIRES_SOURCES_AND_NO_STRATEGY_EDIT');
  return {applied:false,status:'retain',decision:clone(decision),draftUnchanged:true,evidenceRecorded:true,inquiryDispatch,acceptanceGranted:false,
    strategyChanged:false,evidenceLedgerEntry:{schema:'roster_workflow_decision_evidence_record_v1',
      publicReason:decision.publicReason,evidenceRefs:clone(decision.evidenceRefs),
      necessaryQuestions:clone(decision.requiredData),authorDecisions:clone(decision.requiredDecisions??[]),
      sourceApprovalGranted:false,finalPlanApprovalGranted:false}};
}
// Old producer receipts omitted this HOST-owned non-approval flag. Recognize
// only that exact old format by reconstructing the whole receipt from the
// saved, already validated decision. Do not mutate history or treat a missing
// flag on an arbitrary object as permission/approval.
export function isRosterWorkflowNonRevisionOutcomeV1(outcome,decision){
  let expected;
  try{expected=createRosterWorkflowNonRevisionOutcomeV1(decision);}catch{return false;}
  if(!outcome||typeof outcome!=='object')return false;
  if(Object.hasOwn(outcome,'acceptanceGranted'))return isDeepStrictEqual(outcome,expected);
  const legacy={...expected};delete legacy.acceptanceGranted;
  return isDeepStrictEqual(outcome,legacy);
}
export async function publishRosterWorkflowDecisionEvidenceV1({work,outcome,evidence,dispatch}){
  if(!outcome.evidenceRecorded)return {published:false};
  if(outcome.evidenceLedgerEntry?.schema!=='roster_workflow_decision_evidence_record_v1'||!outcome.draftUnchanged)
    throw Error('ROSTER_DECISION_EVIDENCE_RECORD_INVALID');
  const evidenceId=`decision-evidence-record:${work.id}`;
  if(evidence.some(entry=>entry.id===evidenceId))return {published:false,evidenceId};
  // This is a history-navigation record, NOT a current-scope fact. Binding its
  // index to the old Plan prevented publication after an intervening commit.
  // Preserve the FULL original scope in the body; infer no current applicability.
  const view={schema:'roster_workflow_decision_evidence_record_view_v1',
    origin:{workId:work.id,draftRevision:work.draftRevision??null,bindings:clone(work.bindings)},
    record:clone(outcome.evidenceLedgerEntry),historyNavigationOnly:true,currentApplicability:'not_assessed',
    trainingTruth:false,mutationAuthority:false};
  await dispatch({type:'publish_evidence',id:evidenceId,title:'Author-labelled evidence record; strategy and Plan unchanged',
    kind:'capability_result',bindings:{},value:view,
    conditions:['History-navigation metadata only. Original scope is preserved in origin.bindings; current applicability is NOT inferred. This is not source, Rules or final Plan approval.']});
  return {published:true,evidenceId};
}
