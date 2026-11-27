// A queryable unanswered scenario hypothesis. Projection is NOT an approval:
// the only production writer is the existing independently reviewed closure.
import {rosterExperienceApplicabilityV1} from './roster-conditional-experience-bindings-v1.mjs';
const copy=structuredClone;
const prefix='deferred-hypothesis:';
export function projectRosterDeferredHypothesisV1({proof,scope}){
  const source=proof?.request,request=source?.request;
  if(proof?.comparisonResolutionKind!=='reviewed_deferred_hypothesis'
    ||request?.kind!=='defer_unresolved'||!proof.reviewResultRef)return null;
  const sourceBindings=Object.fromEntries(Object.entries(scope).filter(([key])=>key!=='plan'));
  const value={schema:'roster_deferred_hypothesis_v1',version:1,gameId:'starcraft-tmg',
    recordKind:'unresolved_scenario_hypothesis',knowledgeStatus:'unresolved',schedulingStatus:'deferred',
    questionSource:{cycleId:source.cycleId,purposeWorkId:source.purposeWorkId,purposeResultRef:source.purposeResultRef,
      designRevision:source.designRevision},questions:copy(source.questions),
    provisionalDecision:{selectedOption:request.selectedOption,alternative:request.declinedAlternative,
      basis:request.decisionBasis,whyDeferred:request.whyDeferred},
    conditions:copy(request.conditions),unverifiedClaims:copy(request.unverifiedClaims),
    followupObservation:copy(request.followupObservation),reopenWhen:request.reopenWhen,
    sourceBindings:copy(sourceBindings),evidenceNumbers:copy(request.evidenceNumbers),
    proof:{authorWorkId:proof.authorWorkId,authorResultRef:proof.authorResultRef,
      authorOutcomeRef:source.authorOutcomeRef,reviewId:proof.reviewId,reviewResultRef:proof.reviewResultRef},
    reviewStatus:'deferral_reviewed_not_hypothesis_proven',conclusion:null,
    advisorySkillEligible:false,humanReviewed:false,strategyImprovementProven:false,
    canAffectRules:false,trainingTruth:false,realMatchHistory:false,mayWriteLiveRoomMemory:false,
    instruction:'An unresolved scenario hypothesis, not a Skill recommendation or a proven comparison. Retrieve it to identify what to observe, not to justify an action as superior. Evidence numbers are local to the source workflow. New observations must cite their own conditions and source; incomparable outcomes remain inconclusive. No automatic promotion or reopening. Changing dependencies requires applicability review. Preserve old versions and distinguish actual match events from private experiments.'};
  return {id:`${prefix}${source.cycleId}:${proof.reviewResultRef}`,kind:'hypothesis',bindings:sourceBindings,
    title:`未定场景假设: ${request.selectedOption} / ${request.declinedAlternative}`,
    conditions:[...request.conditions,'Unresolved; not established strategy or real-match history'],value};
}

export async function queryRosterDeferredHypothesesV1({state,store,query=''}){
  const terms=String(query).toLocaleLowerCase().split(/\s+/u).filter(Boolean),entries=[];
  for(const entry of state.evidence.filter(e=>e.id.startsWith(prefix)
    &&terms.every(term=>`${e.id} ${e.title}`.toLocaleLowerCase().includes(term)))){
    const record=await store.get(entry.artifactRef);
    if(record?.schema!=='roster_deferred_hypothesis_v1')continue;
    entries.push({evidenceId:entry.id,artifactRef:entry.artifactRef,
      ...rosterExperienceApplicabilityV1(entry.bindings,state.scope),
      usableAsEstablishedFact:false,usableWithoutApplicabilityReview:false,record});
  }
  return {schema:'roster_deferred_hypothesis_query_v1',entries,
    strategyApprovalGranted:false,canAffectRules:false,trainingTruth:false};
}
