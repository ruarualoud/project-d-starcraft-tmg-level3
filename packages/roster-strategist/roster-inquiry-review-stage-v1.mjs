import {isDeepStrictEqual} from 'node:util';
import {rosterWorkflowAcceptanceStageV1} from './roster-review-data-questions-v1.mjs';
import {deliveredRosterAuthorizedInquiryV1} from './roster-inquiry-premise-boundary-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
export const ROSTER_INQUIRY_REVIEW_STAGE_VERSION_V1=2;
export function rosterInquiryReviewStageRequiredV1(work){
  return work?.role==='roster_workflow_final_review'
    &&Boolean(rosterWorkflowAcceptanceStageV1(work)?.authorizedInquiry);
}
// Inspect what was actually sent. A version bump alone is not a reason to
// repurchase a passing judgment. Retain its immutable reply and billing.
export async function rosterInquiryReviewStageMismatchV1({review,readArtifact}){
  if(!rosterInquiryReviewStageRequiredV1(review)||review.status!=='evidence_ready'||!review.resultRef)return null;
  const call=review.operationState?.calls?.at(-1);if(!call?.requestRef)return null;
  const request=await readArtifact(call.requestRef);
  const delivered=request.promptNodes?.find(n=>n.kind==='acceptance_stage_contract');
  const expected=rosterWorkflowAcceptanceStageV1(review);
  if(delivered?.stage===expected.stage&&delivered.currentAuthorizedMeasurementsRequired===true
    &&isDeepStrictEqual(deliveredRosterAuthorizedInquiryV1(request,delivered),expected.authorizedInquiry)){
    const inputs=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.inputs;
    const obligations=inputs?.review?.value?.obligations;
    const obligationId=request.roleCommunication?.reviewHandles?.find(row=>row.handle===obligations?.[0]?.checkId)?.checkId
      ??obligations?.[0]?.checkId;
    // Revisit an actual comparison-bearing request that mixed opinions into
    // coverage, not every historical positive judgment merely for a version bump.
    const comparisonBearing=inputs?.measurementConfigurations?.value?.measurements?.length>1
      &&obligations?.length===1&&obligationId==='question_coverage';
    if(!comparisonBearing||request.promptNodes.some(n=>n.kind==='inquiry_independent_coverage_contract'&&n.version>=1))return null;
    return {workId:review.id,requestRef:call.requestRef,originalInputRef:review.inputRef??null,
      missingInquiryStage:true,missingIndependentCoverage:true,deliveredStage:delivered.stage,
      expectedStage:expected.stage,authorizationScope:expected.authorizedInquiry.authorizationScope};
  }
  return {workId:review.id,requestRef:call.requestRef,originalInputRef:review.inputRef??null,
    missingInquiryStage:true,deliveredStage:delivered?.stage??null,
    expectedStage:expected.stage,authorizationScope:expected.authorizedInquiry.authorizationScope};
}
export function rosterInvestigationDecisionWorkIdV1({state,investigator,summaryIds}){
  const base=`${investigator.id}:decision`,previous=state.work.find(w=>w.id===base);
  return previous?.status==='superseded'&&previous.reviewRepairSupersession
    ?`${base}:review:${hash(summaryIds)}`:base;
}
