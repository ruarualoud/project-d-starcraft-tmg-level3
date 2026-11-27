// A fact-role control return is a new OWNER assignment, not another fact task
// or a request to reproduce the previous strategic reply. No verdict is made here.
import {isDeepStrictEqual} from 'node:util';
import {rosterOriginalSelectedQuestionsV1} from './roster-author-question-contract-v1.mjs';
import {isRosterBuilderAuthorFailureReturnV1} from './roster-builder-inquiry-v1.mjs';
const returnOrigins=Object.freeze({
  author_decision_return:'deterministic_task_router',
  source_interpretation_challenge:'deterministic_material_router',
  work_order_capability_return:'deterministic_compiler_router',
  work_order_delegation_return:'deterministic_compiler_router',
  work_order_design_return:'deterministic_compiler_router',
  work_order_scope_return:'deterministic_compiler_router',
  bounded_observation_return:'deterministic_tool_result_router',
  author_candidate_input_return:'deterministic_compiler_router',
});
// Design inherits the CURRENT owner's actual choice, not every historical
// instruction/failed method as another simultaneous requirement. Preserve the
// exact current request; only redundant historical bodies become read handles.
function comparisonDesignContext(assignment){
  const inputs=assignment?.inputs,source=inputs?.redesignContract?.value?.source;
  const binding=source?.choiceBinding;
  if(assignment?.role!=='roster_workflow_local_teach'
    ||inputs?.comparisonStageOwnership?.value?.design?.owner!=='comparison_design_author'
    ||binding?.status!=='bound'||!isDeepStrictEqual(binding.choice,source.request?.choice)
    ||binding.sourceStateHash!==assignment.scope?.source||binding.rulesRuntimeHash!==assignment.scope?.rules)return null;
  const current={...inputs},history={};
  for(const key of ['previousDesign','originalTeach','authorRedesignRequest']){
    const input=inputs[key],id=input?.evidenceId??input?.id;
    const entry=assignment.evidenceDirectory?.find(e=>e.id===id);
    // Never drop a body without an actual retrievable source in this request.
    if(input?.source!=='evidence'||!entry||!Number.isSafeInteger(entry.number))continue;
    const {value,...metadata}=input;
    history[key]={...metadata,evidenceId:id,evidenceNumber:entry.number,
      artifactRef:entry.artifactRef,pointer:input.pointer??'',status:'available_on_demand',
      bodyDeliveredInThisProjection:false,currentMethodInstruction:false};
    delete current[key];
  }
  return {inputs:current,history,node:{kind:'comparison_design_assignment',version:1,
    currentWorkId:assignment.workId,
    ownerSource:{workId:source.authorWorkId,resultRef:source.authorResultRef,requestRef:source.authorRequestRef,replyRef:source.authorReplyRef},
    choiceBinding:structuredClone(binding),currentRequest:structuredClone(source.request),
    choicesChangedByHost:false,designApproved:false,factsApproved:false,
    instruction:'Design for this CURRENT source-bound choice and exact currentRequest. The historical_reference handles explain earlier proposals/failed methods; they are not additional current instructions or established facts. A current correction rejecting an old claim is not a request to repeat that claim. Compare wording with its actual version before alleging a contradiction. proposedChange is the owner\'s proposed operationalization, not Rules authority: correct invalid mechanism/timing while preserving the SAME selected choice and intended decision use. You own legal hypothetical conditions, controls, bounded method, endpoint and result-to-choice mapping; do not return those ordinary design choices to the strategic owner. Keeping supporting participants/actions equal in both arms is a control, not an investment comparison; it cannot rank their investment but may allow a marginal-action question if the actual observable distinguishes that decision. Do not force approval: if the CURRENT choice really cannot be tested, name the exact current clause, concrete source/capability conflict and required owner change. Never use an old defect, an unknown unmeasured winner or a missing exact coordinate delegated to Native as that conflict. Source-bound choices alone do not prove legality, causal relevance or utility. Retain frozen facts, original question scope and independent preflight; no experiment is authorized by this projection.'}};
}
function validReturn(c){
  if(!c||c.version!==1||!Object.hasOwn(returnOrigins,c.kind)||returnOrigins[c.kind]!==c.origin)return false;
  if(c.kind==='author_decision_return')return c.questions?.length
    &&c.questions.every(q=>q.classification==='author_decision'
      ||q.classification==='authored_choice'&&q.resolutionRequired==='author_rationale_revision');
  if(c.nativeRetryAuthorized!==false)return false;
  return c.kind==='source_interpretation_challenge'
    ?!!c.proposedConclusion&&!!c.diagnostic?.questions?.length:!!c.failure;
}
// The normal experiment-owner producer also returns at a strategic checkpoint
// without a special coordination envelope. Its persisted frontier is Host
// routing authority; the conclusion remains an unapproved model interpretation.
// Keep normal and exceptional returns on the SAME projection, never promote
// a model's request for strategy into authority without the matching frontier.
function normalReturn(value,frontier,input,inputs){
  if(value?.coordination||input.validity!=='current'
    ||frontier.acceptanceGranted!==false||frontier.nativeActionSucceededByHandoff!==false
    ||value?.acceptanceGranted!==false||!Array.isArray(frontier.unresolvedQuestions))return null;
  const reason=frontier.returnReason,status=value.experimentConclusion?.status;
  const factReturn=['blocked','strategy_required'].some(kind=>reason===`fact_owner_${kind}`&&status===kind);
  const checkpoint=['investigation_decision_window_complete','completed_batch_contains_only_exact_reused_observations'].includes(reason)
    &&status!=='answered';
  const dispute=inputs?.sourceControlDispute?.source==='literal'?inputs.sourceControlDispute.value:null;
  const reviewed=inputs?.disputedSourceReview;
  const controlDispute=reason==='source_control_dispute'&&status==='blocked'
    &&dispute?.kind==='source_control_dispute'&&dispute.version===1
    &&dispute.ownerWorkId===frontier.ownerWorkId&&dispute.originalResultRef&&dispute.reviewResultRef
    &&dispute.factsApproved===false&&dispute.capabilityBlockerVerified===false
    &&dispute.planApproved===false&&dispute.nativeRetryAuthorized===false
    &&reviewed?.source==='evidence'&&reviewed.validity==='current'
    &&(reviewed.evidenceId??reviewed.id)===`role:${dispute.reviewWorkId}`;
  if(!factReturn&&!checkpoint&&!controlDispute)return null;
  return {kind:reason,questions:frontier.unresolvedQuestions};
}
function capabilityDeliveryReturn(assignment){
  const inputs=assignment.inputs,repair=inputs?.capabilityDeliveryRepair?.value;
  const prior=inputs?.heldInvestigation?.value,version=repair?.requiredDeliveryVersion??1;
  if(inputs?.capabilityDeliveryRepair?.source!=='literal'||inputs?.heldInvestigation?.source!=='literal'
    ||repair?.version!==1||![1,2].includes(version)||!repair.heldGoalId||!repair.sourceWorkId
    ||assignment.workId!==`${repair.heldGoalId}:capability-delivery-reconsideration:v${version}`
    ||!/^[a-f0-9]{64}$/u.test(repair.sourceResultRef??'')||!/^[a-f0-9]{64}$/u.test(repair.sourceReplyRef??'')
    ||prior?.originalReplyRef!==repair.sourceReplyRef||prior.acceptanceGranted!==false
    ||!Array.isArray(prior.decisions)||repair.factApproved!==false||repair.planApproved!==false
    ||repair.historyReset!==false)return null;
  const {heldInvestigation,...current}=inputs;
  return {inputs:current,history:{heldInvestigation},node:{kind:'strategy_owner_assignment',version:3,
    returnKind:'capability_delivery_reconsideration',currentWorkId:assignment.workId,
    source:{inputKey:'heldInvestigation',sourceWorkId:repair.sourceWorkId,
      originalResultRef:repair.sourceResultRef,originalReplyRef:repair.sourceReplyRef},
    questions:prior.decisions.flatMap((decision,di)=>(decision.dataQuestions??[]).map((q,qi)=>({
      question:q.question,priorClassification:q.classification,
      historicalPointer:`/decisions/${di}/dataQuestions/${qi}`}))),
    factApprovalGranted:false,planApprovalGranted:false,hostAuthoredPlanValues:false,
    deliveryRepairDoesNotProveToolWasUnavailable:true,
    instruction:'This is a fresh strategic OWNER reconsideration after an interface-delivery repair, not a request to copy or cosmetically fix the held proposal. The old proposal is historical_assignment_context: its claims and classifications are fallible, not facts or current instructions. ALL listed questions remain owned by you; their old wording can contain the disputed premise. Reconcile current executable tools and exact saved observations before selecting the next operation. A missing interface description in a prior prompt does NOT prove the tool was unavailable or that an earlier experiment never executed. Delivery repair alone supplies no game measurement, negative result, arrival round or strategy approval. Use currentToolCapabilities/tools/toolContractSource for PRESENT interfaces and historical contracts only to interpret their old calls. Choose a supported revision/retention or a genuinely useful bounded inquiry, preserve unresolved facts and do not replay successful work or extend into a whole match. Current fixed/editable roster permissions and every existing source/Builder/acceptance check still apply.'}};
}
// This return intentionally has NO paid batch summary. The Host already saved
// the stopped method and two exact observations. Recognize that typed control
// by its source identities, not by a batchFacts/input-name convention.
function noProgressReturnSource(assignment){
  const inputs=assignment.inputs,frontier=inputs?.investigationFrontier?.value;
  const boundary=inputs?.noProgressBoundary?.value,proof=boundary?.retainedObservation;
  if(inputs?.noProgressBoundary?.source!=='literal'||boundary?.version!==1
    ||boundary.summaryNotRequested!==true||boundary.factsApproved!==false||boundary.planApproved!==false
    ||boundary.historyReset!==false||frontier?.returnReason!=='repeated_inspection_only_batch'
    ||frontier.acceptanceGranted!==false||frontier.nativeActionSucceededByHandoff!==false
    ||proof?.reason!==frontier.returnReason||proof.newObservation!==false
    ||proof.ownerWorkId!==frontier.ownerWorkId||!Array.isArray(frontier.unresolvedQuestions))return null;
  const find=id=>Object.entries(inputs).find(([,i])=>i.source==='evidence'&&i.status==='read'
    &&i.validity==='current'&&(i.evidenceId??i.id)===id&&i.pointer==='');
  const original=find(`tool:${proof.originalWorkId}`),repeated=find(`tool:${proof.repeatedWorkId}`);
  const a=original?.[1].value,b=repeated?.[1].value,reuse=b?.queryReuse;
  if(!a?.receipt||!a.request||!b?.receipt||!b.request||reuse?.newObservation!==false
    ||reuse.originalWorkId!==proof.originalWorkId||reuse.originalResultRef!==proof.originalResultRef
    ||!isDeepStrictEqual(a.request,b.request)||!isDeepStrictEqual(a.receipt,b.receipt))return null;
  return {source:repeated,coordination:{kind:frontier.returnReason,questions:frontier.unresolvedQuestions},
    proof:structuredClone(proof)};
}
// A failed author-selected candidate is a decision handoff, including when
// several review domains join without an investigationFrontier. Keep exact
// diagnostics, but do not make a method's old "do not choose another army"
// instruction the current author's restriction. Roster mode still owns writes.
function candidateOwnerReturnContext(assignment){
  const inputs=assignment.inputs,control=inputs?.authorCandidateRequests;
  const rows=control?.value,draft=inputs?.wholeDraft?.value;
  if(control?.source!=='literal'||!Array.isArray(rows)||!rows.length
    ||!['fixed','editable'].includes(draft?.mode)
    ||draft.rosterEditAuthority!==(draft.mode==='fixed'?'preset_immutable':'agent_may_reselect_after_evidence')
    ||!rows.every(row=>validReturn(row)&&row.kind==='author_candidate_input_return'
      &&row.ownerRole===assignment.role&&row.factApprovalGranted===false&&row.planApprovalGranted===false
      &&row.hostAuthoredPlanValues===false&&isRosterBuilderAuthorFailureReturnV1(row.failure)))return null;
  const current={...inputs},history={};
  for(const key of ['originalTask','originalQuestion','originalStrategicDecision','originalReviewIssues']){
    if(current[key]){history[key]=current[key];delete current[key];}
  }
  if(inputs.investigationFrontier?.value){
    const {originalQuestion,...frontier}=inputs.investigationFrontier.value;
    if(originalQuestion!==undefined)history.factOwnerOriginalQuestion={source:'literal',value:originalQuestion};
    current.investigationFrontier={...inputs.investigationFrontier,value:frontier};
  }
  current.authorCandidateRequests={...control,value:rows.map((row,index)=>{
    const {failure,...identity}=row;
    history[`authorCandidateMethod${index}`]={source:'literal',value:structuredClone(failure)};
    return {...identity,previousAuthorCandidate:structuredClone(failure.originalRequest?.builderCandidateAuthority?.query??null),
      failure:{error:structuredClone(failure.error)}};
  })};
  return {inputs:current,history,node:{kind:'strategy_owner_assignment',version:5,
    returnKind:'author_candidate_requires_revision',currentWorkId:assignment.workId,
    rosterEditAuthority:draft.rosterEditAuthority,
    sources:rows.map(row=>({workId:row.workId,resultRef:row.resultRef,
      sourceWorkId:row.sourceWorkId,sourceResultRef:row.sourceResultRef})),
    factApprovalGranted:false,planApprovalGranted:false,hostAuthoredPlanValues:false,
    instruction:'The method could not execute the author-selected candidate. YOU now own the next strategy choice, within wholeDraft.rosterEditAuthority. The exact negative Native diagnosis and previousAuthorCandidate are current evidence; authorCandidateMethod and original tasks are immutable historical context, not current method-only restrictions. In editable mode choose another explicit candidate, a justified retention, or a specific necessary factual query; in fixed mode adapt the Plan without reselecting the imposed army. Do not send the unchanged illegal baseline back to technical repair, infer every alternative is impossible, or silently waive the remaining target. No candidate is adopted, no retry authorized, no fact or Plan approved by this handoff.'}};
}
// A normal batch returns through its owned summary, not through the method's
// earlier proposal. Resolve this from persisted work/evidence links, never a
// guessed ID suffix or a model claim that a batch succeeded.
function completedBatchSource(assignment,state){
  const inputs=assignment.inputs,frontier=inputs?.investigationFrontier?.value;
  if(!state||!['investigation_decision_window_complete','completed_batch_contains_only_exact_reused_observations'].includes(frontier?.returnReason))return null;
  const author=state.work?.find(w=>w.id===assignment.workId);
  const owner=state.work?.find(w=>w.id===frontier.ownerWorkId);
  if(author?.investigationOwnerId!==owner?.id||author?.investigationFrontierOf!==frontier.goalId
    ||owner?.role!=='roster_workflow_experiment_planner'||owner.status!=='evidence_ready')return null;
  return Object.entries(inputs).find(([key,input])=>{
    if(!/^batchFacts\d+$/u.test(key)||input.source!=='evidence'||input.status!=='read'||input.validity!=='current'||input.pointer!=='')return false;
    const id=input.evidenceId??input.id,summary=state.work?.find(w=>'role:'+w.id===id);
    const evidence=state.evidence?.find(e=>e.id===id);
    if(summary?.role!=='roster_workflow_fact_summary'||summary.experimentOwnerId!==owner.id
      ||summary.status!=='evidence_ready'||!summary.resultRef||!evidence?.artifactRef)return false;
    // resultRef stores the typed result envelope; role evidence publishes its
    // value body. They intentionally have different artifact identities. The
    // persisted summary-owner link and current registered source identify this
    // handoff; the ordinary evidence reader still validates the body.
    const value=input.value?.kind?input.value.value:input.value;
    return !!normalReturn(value,frontier,input,inputs);
  })??null;
}
function methodContractReturnContext(assignment,state){
  const inputs=assignment.inputs,proof=inputs?.methodContractRepair?.value;
  if(inputs?.methodContractRepair?.source!=='literal'||proof?.version!==1||proof.methodExecuted!==false
    ||proof.factsApproved!==false||proof.planApproved!==false||proof.historyReset!==false
    ||proof.decisionId!==assignment.workId||isDeepStrictEqual(proof.oldOperation,proof.currentOperation))return null;
  const job=state?.work?.find(w=>w.id===assignment.workId),owner=state?.work?.find(w=>w.id===proof.sourceWorkId);
  if(job?.investigationOwnerId!==owner?.id||owner?.resultRef!==proof.sourceResultRef
    ||!isDeepStrictEqual(job.inputs.methodContractRepair?.value,proof))return null;
  const selected=rosterOriginalSelectedQuestionsV1(assignment),current={...inputs},history={};
  for(const key of ['originalTask','originalQuestion','originalStrategicDecision','originalReviewIssues','previousBatch']){
    if(current[key]){history[key]=current[key];delete current[key];}
  }
  if(current.investigationFrontier?.value){
    const {originalQuestion,...frontier}=current.investigationFrontier.value;
    if(originalQuestion!==undefined)history.factOwnerOriginalQuestion={source:'literal',value:originalQuestion};
    current.investigationFrontier={...current.investigationFrontier,value:frontier};
  }
  return {inputs:current,history,node:{kind:'strategy_owner_assignment',version:7,returnKind:'tool_input_contract_revised',
    currentWorkId:assignment.workId,sourceWorkId:proof.sourceWorkId,sourceResultRef:proof.sourceResultRef,
    questions:selected?.questions??inputs.investigationFrontier.value.unresolvedQuestions,
    factApprovalGranted:false,planApprovalGranted:false,hostAuthoredPlanValues:false,
    instruction:'Reconsider the UNEXECUTED method against methodContractRepair.currentOperation. The previous operation contract and method rationale are historical, not current instructions. No measurement was executed or approved by this return. Resolve the exact original question using the actual current tool parameter ownership; do not re-authorize a prerequisite just because the old method claimed it was required. Strategic choices and hypothetical intent remain yours; Native owns its declared computation. Keep all necessary unknowns and original evidence; no whole-match simulation or automatic Plan approval.'}};
}

export function projectRosterIncomingAuthorContextV1(assignment,{state}={}){
  const design=comparisonDesignContext(assignment);if(design)return design;
  const inputs=assignment?.inputs,frontier=inputs?.investigationFrontier?.value;
  if(assignment?.role!=='roster_workflow_strategy_decision')return null;
  const revised=methodContractReturnContext(assignment,state);if(revised)return revised;
  const capability=capabilityDeliveryReturn(assignment);if(capability)return capability;
  const candidate=candidateOwnerReturnContext(assignment);if(candidate)return candidate;
  if(frontier?.version!==1)return null;
  const stopped=noProgressReturnSource(assignment);
  const completed=completedBatchSource(assignment,state);
  const source=stopped?.source??Object.entries(inputs).find(([key,input])=>{
    if(!/^batchFacts\d+$/u.test(key)||input.source!=='evidence')return false;
    const value=input.value?.kind?input.value.value:input.value,c=value?.coordination;
    if((input.evidenceId??input.id)!==`role:${frontier.ownerWorkId}`)return false;
    return validReturn(c)&&c.ownerRole===assignment.role&&c.originalAssignmentWorkId===frontier.ownerWorkId
      &&c.factApprovalGranted===false&&c.planApprovalGranted===false
      ||!!normalReturn(value,frontier,input,inputs);
  });
  const selectedSource=source??completed;
  if(!selectedSource)return null;
  const [inputKey,input]=selectedSource,value=input.value?.kind?input.value.value:input.value;
  const history={},current={...inputs};
  for(const key of ['originalTask','originalQuestion','originalStrategicDecision','originalReviewIssues']){
    if(current[key]){history[key]=current[key];delete current[key];}
  }
  if(completed&&current.previousBatch){history.previousBatch=current.previousBatch;delete current.previousBatch;}
  const {originalQuestion,...currentFrontier}=frontier;
  if(originalQuestion!==undefined)history.factOwnerOriginalQuestion={source:'literal',value:originalQuestion};
  current.investigationFrontier={...inputs.investigationFrontier,value:currentFrontier};
  const coordination=stopped?.coordination??value.coordination??normalReturn(value,frontier,input,inputs);
  const selectedQuestions=rosterOriginalSelectedQuestionsV1(assignment);
  const repairedControl=inputs.ownerDeliveryRepair?.source==='literal'
    &&inputs.ownerDeliveryRepair.value?.sourceContract==='strategy_owner_assignment'
    &&inputs.ownerDeliveryRepair.value.workId===assignment.workId
    ?inputs.ownerDeliveryRepair.value.noProgressControl:null;
  return {inputs:current,history,node:{kind:'strategy_owner_assignment',version:completed?6:stopped?4:2,
    returnKind:coordination.kind,
    currentWorkId:assignment.workId,source:{inputKey,evidenceId:input.evidenceId??input.id,
      evidenceNumber:input.evidenceNumber??null,originalAssignmentWorkId:frontier.ownerWorkId},
    questions:structuredClone(selectedQuestions?.questions??coordination.questions??frontier.unresolvedQuestions??[]),
    ...(completed?{completedBatch:{ownerWorkId:frontier.ownerWorkId,summaryEvidenceId:input.evidenceId??input.id,
      executionSources:Object.entries(current).filter(([key])=>/^batchToolSource\d+$/u.test(key)).map(([key,row])=>({inputKey:key,evidenceId:row.evidenceId??row.id,evidenceNumber:row.evidenceNumber??null})),
      priorMethodIsHistorical:true,originalQuestionAnsweredByBatch:false,
      instruction:'This batch has executed. Its original proposed next steps belong to history, not a new to-do list. Reconcile the delivered exact results and saved successor before choosing any NEW operation. The remaining original predicate is still unproved unless these results actually answer it; do not replay a completed prerequisite or infer arrival/control from a menu.'}}:{}),
    ...(selectedQuestions?{questionSource:selectedQuestions.source,
      returnedQuestionProposals:structuredClone(coordination.questions??frontier.unresolvedQuestions??[])}:{}),
    ...(repairedControl?{noProgressControl:structuredClone(repairedControl)}:{}),
    ...(stopped?{noProgressControl:{retainedObservation:stopped.proof,factSummaryProduced:false,
      instruction:'The exact same observation ended this METHOD, not the original obligation. The old method-only restriction belongs to history; you own the current strategic decision. A proposed future score target is an author choice, not an observed result. Preserve actual missing rules/path/payment facts; distinguish a conditional feasible witness from an earliest/global guarantee. An inherited question or reviewer premise is fallible and must be reconciled against the current adopted claim and source, not treated as new Rules authority. Do not reauthorize this unchanged method or call its unanswered predicate answered. Choose a source-supported current Plan decision or a materially different bounded inquiry; otherwise state the unresolved conflict and stop.'}}:{}),
    factApprovalGranted:false,planApprovalGranted:false,hostAuthoredPlanValues:false,
    instruction:'This typed return assigns the next OWNER decision to YOU now. returnKind distinguishes a normal factual/decision-window return, an author choice, a disputed source interpretation, an unavailable capability, and an unauthorized child method; none is a successful experiment or approved fact. The prior fact role\'s read-only/do-not-choose-roster restrictions belong to historical_assignment_context, NOT to your present authority. Its original question, conditions and comparison scope remain binding. Reconcile the returned exact sources, diagnostics and proposed conclusions with currentArmyAuthority and wholeDraft. A disputed interpretation is not a factual instruction: both the previous draft and pending proposal may need correction; do not copy them as an answer template. Source reconciliation, a bounded necessary experiment, or a supported revision are distinct owner choices. An unauthorized child method does not mean the capability is unavailable, and a failed candidate does not prove every alternative impossible. Missing adoption/edit is not itself missing evidence: an audited candidate is available for consideration, not already adopted. Choose a source-backed joint mutation, a justified retain/rejection, or a genuinely necessary NEW factual prerequisite; explain its consequence. Do not ask a fact role to choose the roster or repeat an identical failed method. Routing does not approve facts, waive unknowns, grant Native retry authority, force adoption, or prove strategic improvement. Preserve every pending question; changes still require structured mutation and subsequent Builder/source checks.'}};
}
