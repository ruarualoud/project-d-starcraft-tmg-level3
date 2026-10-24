// A fact-role control return is a new OWNER assignment, not another fact task
// or a request to reproduce the previous strategic reply. No verdict is made here.
import {isDeepStrictEqual} from 'node:util';
import {rosterOriginalSelectedQuestionsV1} from './roster-author-question-contract-v1.mjs';
const returnOrigins=Object.freeze({
  author_decision_return:'deterministic_task_router',
  source_interpretation_challenge:'deterministic_material_router',
  work_order_capability_return:'deterministic_compiler_router',
  work_order_delegation_return:'deterministic_compiler_router',
});
function validReturn(c){
  if(!c||c.version!==1||!Object.hasOwn(returnOrigins,c.kind)||returnOrigins[c.kind]!==c.origin)return false;
  if(c.kind==='author_decision_return')return c.questions?.length
    &&c.questions.every(q=>q.classification==='author_decision');
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
export function projectRosterIncomingAuthorContextV1(assignment){
  const inputs=assignment?.inputs,frontier=inputs?.investigationFrontier?.value;
  if(assignment?.role!=='roster_workflow_strategy_decision')return null;
  const capability=capabilityDeliveryReturn(assignment);if(capability)return capability;
  if(frontier?.version!==1)return null;
  const stopped=noProgressReturnSource(assignment);
  const source=stopped?.source??Object.entries(inputs).find(([key,input])=>{
    if(!/^batchFacts\d+$/u.test(key)||input.source!=='evidence')return false;
    const value=input.value?.kind?input.value.value:input.value,c=value?.coordination;
    if((input.evidenceId??input.id)!==`role:${frontier.ownerWorkId}`)return false;
    return validReturn(c)&&c.ownerRole===assignment.role&&c.originalAssignmentWorkId===frontier.ownerWorkId
      &&c.factApprovalGranted===false&&c.planApprovalGranted===false
      ||!!normalReturn(value,frontier,input,inputs);
  });
  if(!source)return null;
  const [inputKey,input]=source,value=input.value?.kind?input.value.value:input.value;
  const history={},current={...inputs};
  for(const key of ['originalTask','originalQuestion','originalStrategicDecision','originalReviewIssues']){
    if(current[key]){history[key]=current[key];delete current[key];}
  }
  const {originalQuestion,...currentFrontier}=frontier;
  if(originalQuestion!==undefined)history.factOwnerOriginalQuestion={source:'literal',value:originalQuestion};
  current.investigationFrontier={...inputs.investigationFrontier,value:currentFrontier};
  const coordination=stopped?.coordination??value.coordination??normalReturn(value,frontier,input,inputs);
  const selectedQuestions=rosterOriginalSelectedQuestionsV1(assignment);
  const repairedControl=inputs.ownerDeliveryRepair?.source==='literal'
    &&inputs.ownerDeliveryRepair.value?.sourceContract==='strategy_owner_assignment'
    &&inputs.ownerDeliveryRepair.value.workId===assignment.workId
    ?inputs.ownerDeliveryRepair.value.noProgressControl:null;
  return {inputs:current,history,node:{kind:'strategy_owner_assignment',version:stopped?4:2,
    returnKind:coordination.kind,
    currentWorkId:assignment.workId,source:{inputKey,evidenceId:input.evidenceId??input.id,
      evidenceNumber:input.evidenceNumber??null,originalAssignmentWorkId:frontier.ownerWorkId},
    questions:structuredClone(selectedQuestions?.questions??coordination.questions??frontier.unresolvedQuestions??[]),
    ...(selectedQuestions?{questionSource:selectedQuestions.source,
      returnedQuestionProposals:structuredClone(coordination.questions??frontier.unresolvedQuestions??[])}:{}),
    ...(repairedControl?{noProgressControl:structuredClone(repairedControl)}:{}),
    ...(stopped?{noProgressControl:{retainedObservation:stopped.proof,factSummaryProduced:false,
      instruction:'The exact same observation ended this METHOD, not the original obligation. The old method-only restriction belongs to history; you own the current strategic decision. A proposed future score target is an author choice, not an observed result. Preserve actual missing rules/path/payment facts; distinguish a conditional feasible witness from an earliest/global guarantee. An inherited question or reviewer premise is fallible and must be reconciled against the current adopted claim and source, not treated as new Rules authority. Do not reauthorize this unchanged method or call its unanswered predicate answered. Choose a source-supported current Plan decision or a materially different bounded inquiry; otherwise state the unresolved conflict and stop.'}}:{}),
    factApprovalGranted:false,planApprovalGranted:false,hostAuthoredPlanValues:false,
    instruction:'This typed return assigns the next OWNER decision to YOU now. returnKind distinguishes a normal factual/decision-window return, an author choice, a disputed source interpretation, an unavailable capability, and an unauthorized child method; none is a successful experiment or approved fact. The prior fact role\'s read-only/do-not-choose-roster restrictions belong to historical_assignment_context, NOT to your present authority. Its original question, conditions and comparison scope remain binding. Reconcile the returned exact sources, diagnostics and proposed conclusions with currentArmyAuthority and wholeDraft. A disputed interpretation is not a factual instruction: both the previous draft and pending proposal may need correction; do not copy them as an answer template. Source reconciliation, a bounded necessary experiment, or a supported revision are distinct owner choices. An unauthorized child method does not mean the capability is unavailable, and a failed candidate does not prove every alternative impossible. Missing adoption/edit is not itself missing evidence: an audited candidate is available for consideration, not already adopted. Choose a source-backed joint mutation, a justified retain/rejection, or a genuinely necessary NEW factual prerequisite; explain its consequence. Do not ask a fact role to choose the roster or repeat an identical failed method. Routing does not approve facts, waive unknowns, grant Native retry authority, force adoption, or prove strategic improvement. Preserve every pending question; changes still require structured mutation and subsequent Builder/source checks.'}};
}
