import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';

export function formationReceiptMatchesRequestV1(receipt,request,{recordedKey,currentKey}={}) {
  if(recordedKey)return recordedKey===currentKey;
  const result=receipt?.result;
  if(!result)return false;
  if(request.preferredAnchor&&hash(request.preferredAnchor)!==hash(result.preferredAnchor))return false;
  const normalize=rows=>(rows||[]).map(x=>({kind:x.kind,weight:x.weight??3,targetIds:[...new Set(x.targetIds||[])]}));
  if(request.formationObjectives?.length&&hash(normalize(request.formationObjectives))
    !==hash(normalize(result.formationIntent?.objectives)))return false;
  return !request.maximumOptions||Number(result.searchCoverage?.maximumOptions)===Math.min(8,Math.max(1,request.maximumOptions));
}

// Qualification comes from the same Native marker kernel used by scoring.
// This is factual feedback about sampled layouts, never a strategic score.
export function projectFormationGoalReviewV1({planner,receipt,history=[]}={}) {
  const targetIds=[...new Set((planner?.formationSearchRequest?.formationObjectives||[])
    .filter(x=>x.kind==='control_objective').flatMap(x=>x.targetIds||[]))];
  const options=receipt?.result?.formationOptions;
  if(receipt?.status!=='exact'||!options?.length||!targetIds.length)return null;
  const targets=targetIds.map(targetId=>{
    const rows=options.map(option=>{
      const relation=option.relationshipComparison?.relationships?.find(r=>
        r.edgeKind==='objective_relationship'&&r.targetId===targetId);
      const q=relation?.markerQualification;
      return {formationOptionId:option.formationOptionId,
        status:q?.status||'unknown',eligibleToContest:q?.eligibleToContest??null,
        distanceMilliInches:relation?.minimumBaseEdgeDistanceMilliInches??null,
        exclusionReason:q?.exclusionReason||null,
        effectiveSupplyContribution:q?.effectiveSupplyContribution??null,
        projectedCleanupControlSideKey:q?.projectedCleanupControlSideKey??null};
    });
    return {targetId,options:rows,allOptionsIneligible:rows.every(r=>
      r.status==='exact'&&r.eligibleToContest===false)};
  });
  if(!targets.every(t=>t.allOptionsIneligible))return null;
  const signature=hash({candidateId:planner.recommendedCandidateId,
    queryReceiptHash:receipt.queryReceiptHash,targetIds});
  if(history.some(r=>r.signature===signature))return null;
  return {version:'formation_goal_review_v1',signature,
    candidateId:planner.recommendedCandidateId,queryReceiptHash:receipt.queryReceiptHash,
    pieceId:receipt.result.pieceId,targets,
    searchCoverage:receipt.result.searchCoverage,
    actionExecuted:false,provesNoLegalAction:false,requiresDifferentAction:false,
    instruction:'These sampled legal formations do not let this unit contest the named targets under current Native conditions. Distance and requested objective labels do not establish control or VP. Reconsider the intended action with these facts: choose another intent/action, query a materially different placement, or retain a legal formation with a different stated purpose or conditional future benefit. Retaining is allowed; this same receipt is returned for review only once. No exhaustive search, forced attack, or strategic score is required.'};
}
