// P1/P4 fact bookkeeping is NOT a strategic Plan commit. The explicit model
// operation chooses this lane; Host never infers that a revision is trivial.
const clone=value=>structuredClone(value);
// Committing a revision invalidates the author's old Plan binding. Therefore
// superseded does not mean the completed operation failed; verify its receipt.
export async function rosterWorkflowCompletedCommitV1({state,work,readArtifact}){
  if(work?.role!=='roster_workflow_strategy_decision'||!['evidence_ready','superseded'].includes(work.status)
    ||work.operationState?.pending||!work.resultRef||!work.draftOutcomeRef)return null;
  const outcome=await readArtifact(work.draftOutcomeRef),result=await readArtifact(work.resultRef);
  if(result?.value?.decisions?.[0]?.disposition!=='revise'||!result.value.decisions[0].mutation
    ||outcome?.applied!==true||outcome.status!=='draft_committed'
    ||outcome.beforeRevision!==work.draftRevision||outcome.afterRevision!==state.draftRevision
    ||outcome.afterRevision!==outcome.beforeRevision+1
    ||outcome.planAfterHash!==state.scope.plan||outcome.armyAfterHash!==state.scope.army)return null;
  return {workId:work.id,resultRef:work.resultRef,outcomeRef:work.draftOutcomeRef,
    afterRevision:outcome.afterRevision,operationCompleted:true,acceptanceGranted:false};
}
import {isDeepStrictEqual} from 'node:util';
import {rosterDecisionInquiryDispatchV1} from './roster-workflow-fact-inquiry-v1.mjs';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
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
// The author requested a revision but its structured operation had no effect.
// This is a saved operation result, NOT a rewritten model choice or approval.
export function isRosterWorkflowUnchangedRevisionOutcomeV1(outcome,decision){
  return decision?.disposition==='revise'&&decision.mutation!==null
    &&outcome?.status==='draft_unchanged'&&outcome.applied===false&&outcome.draftUnchanged===true
    &&outcome.acceptanceGranted===false&&outcome.strategyImprovementProven===false
    &&outcome.armyChanged===false&&Array.isArray(outcome.revisedSectionKeys)&&outcome.revisedSectionKeys.length===0
    &&Number.isSafeInteger(outcome.beforeRevision)&&outcome.beforeRevision===outcome.afterRevision
    &&typeof outcome.armyBeforeHash==='string'&&outcome.armyBeforeHash===outcome.armyAfterHash
    &&typeof outcome.planBeforeHash==='string'&&outcome.planBeforeHash===outcome.planAfterHash
    &&isDeepStrictEqual(outcome.decision,decision);
}
// Role metadata separates a recorded decision from an actual draft mutation.
// A retained current choice has a validated non-revision outcome; applied=false
// is correct on that immutable receipt and must never mean "choice discarded".
export function projectRosterWorkflowDecisionOutcomeScopeV1({state,work,outcome,decision}){
  const completed=work?.role==='roster_workflow_strategy_decision'
    &&['evidence_ready','superseded'].includes(work.status)&&!work.operationState?.pending
    &&Boolean(work.resultRef&&work.draftOutcomeRef);
  const currentUnchanged=completed&&work.draftRevision===state.draftRevision
    &&Object.entries(state.scope).every(([key,value])=>work.bindings?.[key]===value);
  const recordedUnchanged=currentUnchanged&&(isRosterWorkflowNonRevisionOutcomeV1(outcome,decision)
    ||isRosterWorkflowUnchangedRevisionOutcomeV1(outcome,decision));
  const committed=completed&&decision?.disposition==='revise'&&decision.mutation!==null
    &&outcome?.applied===true&&outcome.status==='draft_committed'
    &&outcome.beforeRevision===work.draftRevision&&outcome.afterRevision===state.draftRevision
    &&outcome.afterRevision===outcome.beforeRevision+1
    &&outcome.planAfterHash===state.scope.plan&&outcome.armyAfterHash===state.scope.army;
  return {decisionRecordedForCurrentDraft:Boolean(recordedUnchanged||committed),
    draftMutatedByDecision:Boolean(committed),decisionOutcomeStatus:outcome?.status??null};
}
// A model can report a missing capability/input, but cannot prove its absence
// or approve the draft. Surface that explicit return to its owner; do not keep
// scheduling ordinary Teach as though the decision were an unqualified retain.
export async function projectRosterWorkflowDeclaredBlockersV1({state,readArtifact}){
  const graph=createRosterWorkflowGraphV1(state),blockers=[];
  for(const work of state.work){
    if(work.role!=='roster_workflow_strategy_decision'||work.status!=='evidence_ready'
      ||work.draftRevision!==state.draftRevision||!work.draftOutcomeRef||!work.resultRef||!graph.isFresh(work.id))continue;
    // Only an explicitly validated successor transfers this responsibility.
    // An unrelated newer decision or a process restart cannot clear it.
    if(state.work.some(next=>(next.reconsidersDecisionOf===work.id||next.reconsidersFrontierOf===work.id)
      &&next.status!=='superseded'&&graph.isFresh(next.id)))continue;
    const result=await readArtifact(work.resultRef),decision=result.value?.decisions?.[0];
    if(!decision?.workflowBlocker)continue;
    const outcome=await readArtifact(work.draftOutcomeRef);
    if(!isRosterWorkflowNonRevisionOutcomeV1(outcome,decision))continue;
    const declaration=decision.workflowBlocker;
    blockers.push({kind:'declared_workflow_blocker',owner:declaration.kind==='external_input_required'?'external_input':'engineering',
      sourceWorkId:work.id,sourceResultRef:work.resultRef,sourceOutcomeRef:work.draftOutcomeRef,draftRevision:work.draftRevision,
      declaration:clone(declaration),questions:declaration.questionNumbers.map(n=>decision.dataQuestions[n-1].question),
      verifiedCapabilityAbsence:false,factsApproved:false,acceptanceGranted:false,automaticRetry:false});
  }
  return blockers;
}
export function assertRosterWorkflowNoDeclaredBlockersV1(workflowBlockers){
  if(workflowBlockers.length)throw Object.assign(Error('ROSTER_DECISION_WORKFLOW_BLOCKED'),{
    code:'ROSTER_DECISION_WORKFLOW_BLOCKED',dispatchOutcome:'not_dispatched',workflowBlockers:clone(workflowBlockers)});
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

// One applied-decision selection for readiness and role handoffs. An author's
// completed draft mutation may supersede its old binding; the saved outcome,
// not that status label alone, determines whether the decision was applied.
export async function collectRosterWorkflowAppliedDecisionsV1({state,readArtifact}){
  const acceptedDecisions=[],settledDecisionIds=[];
  for(const work of state.work.filter(w=>w.role==='roster_workflow_strategy_decision'&&w.draftOutcomeRef)){
    const outcome=await readArtifact(work.draftOutcomeRef);
    if(work.status==='evidence_ready'&&(outcome.applied===true||['retain','retained','investigate','draft_unchanged'].includes(outcome.status)))
      settledDecisionIds.push(work.id);
    if(outcome.applied!==true&&!['retain','retained','draft_unchanged'].includes(outcome.status))continue;
    const result=await readArtifact(work.resultRef);
    for(const [decisionIndex,decision]of (result.value.decisions||[]).entries())acceptedDecisions.push({
      workId:work.id,revision:work.draftRevision,resultRef:work.resultRef,decision,decisionIndex,
      outcomeRef:work.draftOutcomeRef,
      currentDraftDecisionRecorded:projectRosterWorkflowDecisionOutcomeScopeV1({state,work,outcome,decision}).decisionRecordedForCurrentDraft,
      recordedSequence:state.events?.findLast(e=>['draft_outcome','draft_committed'].includes(e.type)
        &&e.workId===work.id&&e.receiptRef===work.draftOutcomeRef)?.sequence??null,
      carriedQuestions:work.inputs.investigationFrontier?.value?.unresolvedQuestions??[]});
  }
  return {acceptedDecisions,settledDecisionIds};
}
