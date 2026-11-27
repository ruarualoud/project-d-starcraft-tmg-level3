// The product publishes the exact reviewed draft. This receipt is a versioned
// handoff to the existing battle bridge, NOT a new Rules/strategy verifier.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createRosterPlanV1,verifyRosterPlanV1} from '../roster-strategist/roster-plan-contracts-v1.mjs';
import {ROSTER_WORKFLOW_REVIEW_DOMAINS_V1} from '../roster-strategist/roster-workflow-readiness-v1.mjs';
import {ROSTER_REVIEW_DEPENDENCY_VERSION_V1} from '../roster-strategist/roster-review-reuse-v1.mjs';
export const ROSTER_DECISION_SESSION_RECEIPT_SCHEMA_V1='roster_decision_product_session_receipt_v1';
const fail=code=>{throw Object.assign(Error(code),{code,httpStatus:409});};
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value);
// finalAssessment owns dependency equivalence. Publication consumes its exact
// origin -> current-draft mapping; it must not demand a fabricated new review
// after the product deliberately reused an immutable unchanged-domain result.
function reviewAppliesToDraft(ref,domain,state,draft){
  const work=state.work.find(w=>w.id===ref.workId&&w.reviewDomain===domain.id&&w.resultRef===ref.resultRef);
  if(!work||work.operationState?.pending)return false;
  if(!ref.reuseProof)return work.status==='evidence_ready'&&work.draftRevision===draft.revision
    &&isDeepStrictEqual(work.bindings,state.scope);
  const proof=ref.reuseProof,original=work.inputs?.reviewScope?.value;
  const targetId=`final-review:r${draft.revision}:${domain.id}`;
  return ['evidence_ready','superseded'].includes(work.status)&&work.draftRevision<draft.revision
    &&!work.supersededByWorkId&&!work.supersededByGoalId&&!work.reviewRepairSupersession
    &&!state.work.some(w=>w.id===targetId)
    &&ref.appliesToWorkId===targetId
    &&proof.kind==='unchanged_review_dependencies'&&proof.version===ROSTER_REVIEW_DEPENDENCY_VERSION_V1
    &&proof.originWorkId===work.id&&proof.originResultRef===work.resultRef
    &&proof.originRevision===work.draftRevision&&proof.originDraftRef===original?.sourceDraftRef
    &&proof.appliesToRevision===draft.revision&&proof.appliesToDraftRef===state.draftRef
    &&proof.originalResultRewritten===false&&proof.newModelReview===false
    &&proof.acceptanceGranted===false&&proof.trainingTruth===false;
}
export function verifyRosterDecisionSessionReceiptV1(receipt){
  const {receiptHash,...body}=receipt??{};
  if(receipt?.schema!==ROSTER_DECISION_SESSION_RECEIPT_SCHEMA_V1
    ||!['fixed','editable'].includes(receipt.mode)||!receipt.workflowId
    ||!Number.isSafeInteger(receipt.draftRevision)||receipt.draftRevision<1
    ||receipt.planStatus!=='active'||receipt.canAffectRules!==false||receipt.trainingTruth!==false
    ||receipt.strategyImprovementProven!==false||receipt.finalReviewsPassed!==true
    ||receipt.strategyOwnerReturned!==true
    ||!['planHash','draftPlanHash','candidateInputHash','rosterCandidateHash','finalAuditResultHash','provenanceHash']
      .every(key=>digest(receipt[key]))
    ||!Array.isArray(receipt.reviewRefs)||receipt.reviewRefs.length!==ROSTER_WORKFLOW_REVIEW_DOMAINS_V1.length
    ||!ROSTER_WORKFLOW_REVIEW_DOMAINS_V1.every(domain=>receipt.reviewRefs.filter(r=>r.domain===domain.id).length===1)
    ||receiptHash!==hash(body))fail('ROSTER_DECISION_SESSION_RECEIPT_INVALID');
  return true;
}
export function createRosterWorkflowAcceptanceV1({workflowId,state,draft,assessment,strategyCycle,builderVerdict,acceptedAt}){
  if(!assessment?.readyForRelease||assessment.draftRevision!==draft?.revision
    ||state.draftRevision!==draft.revision||!strategyCycle?.ownerReturned||!strategyCycle.comparisonResolved
    ||assessment.mechanicalBlockers?.length||assessment.semanticIssues?.length||assessment.activeWork?.length
    ||assessment.stoppedReviewDomains?.length)fail('ROSTER_DECISION_NOT_READY_FOR_ACCEPTANCE');
  const reviewRefs=ROSTER_WORKFLOW_REVIEW_DOMAINS_V1.map(domain=>{
    const refs=(assessment.reviewRefs??[]).filter(ref=>reviewAppliesToDraft(ref,domain,state,draft));
    if(refs.length!==1)fail('ROSTER_DECISION_CURRENT_FINAL_REVIEW_REQUIRED');
    return {domain:domain.id,...refs[0]};
  });
  if(builderVerdict?.status!=='legal'||builderVerdict.candidateHash!==hash(draft.candidateInput)
    ||builderVerdict.summary?.mineralSpent!==draft.candidateInput.mineralBudget
    ||builderVerdict.auditResultHash!==draft.plan?.rosterCandidate?.legalityReceipt?.auditResultHash)
    fail('ROSTER_DECISION_CURRENT_BUILDER_AUDIT_REQUIRED');
  verifyRosterPlanV1(draft.plan);
  const plan=createRosterPlanV1({...draft.plan,planStatus:'active'});
  const body={schema:ROSTER_DECISION_SESSION_RECEIPT_SCHEMA_V1,workflowId,mode:draft.mode,
    draftRevision:draft.revision,planId:plan.planId,planVersion:plan.planVersion,planStatus:plan.planStatus,
    planHash:plan.planHash,draftPlanHash:draft.plan.planHash,candidateInputHash:builderVerdict.candidateHash,
    rosterCandidateHash:plan.rosterCandidate.candidateHash,finalAuditResultHash:builderVerdict.auditResultHash,
    provenanceHash:plan.provenance.provenanceHash,workflowScope:structuredClone(state.scope),
    reviewRefs,strategyOwnerWorkId:strategyCycle.ownerWorkId,strategyOutcomeRef:strategyCycle.outcomeRef,
    strategyOwnerReturned:true,strategyComparisonResolved:true,comparisonReviewWorkId:strategyCycle.comparisonReviewWorkId,
    comparisonReviewResultRef:strategyCycle.comparisonReviewResultRef,finalReviewsPassed:true,strategyImprovementProven:false,
    comparisonResolutionKind:strategyCycle.comparisonResolutionKind??'measured_comparison',
    mineralBudget:draft.candidateInput.mineralBudget,mineralSpent:builderVerdict.summary.mineralSpent,
    acceptedAt,canAffectRules:false,trainingTruth:false};
  const sessionReceipt={...body,receiptHash:hash(body)};
  verifyRosterDecisionSessionReceiptV1(sessionReceipt);
  return {schema:'roster_decision_product_acceptance_v1',workflowId,draftRef:state.draftRef,
    draftRevision:draft.revision,candidateInput:structuredClone(draft.candidateInput),plan,sessionReceipt,
    trainingTruth:false};
}
export function rosterWorkflowAcceptanceMatchesDraftV1(bundle,state,draft,{workflowId}={}){
  if(!bundle)return false;
  verifyRosterDecisionSessionReceiptV1(bundle.sessionReceipt);verifyRosterPlanV1(bundle.plan);
  return bundle.workflowId===bundle.sessionReceipt.workflowId
    &&(workflowId===undefined||bundle.workflowId===workflowId)
    &&isDeepStrictEqual(bundle.sessionReceipt.workflowScope,state.scope)
    &&bundle.draftRef===state.draftRef&&bundle.draftRevision===state.draftRevision
    &&bundle.draftRevision===draft?.revision&&bundle.sessionReceipt.draftPlanHash===draft.plan?.planHash
    &&bundle.sessionReceipt.planHash===bundle.plan.planHash
    &&bundle.sessionReceipt.candidateInputHash===hash(draft.candidateInput)
    &&hash(bundle.candidateInput)===hash(draft.candidateInput);
}
