// Evidence meaning belongs to the Native result, not the selected adapter name.
// Shared by execution and recovery of retained results; never modifies receipts.
export function assessRosterTeachEvidenceReadinessV1(evidence) {
  const reasons = [];
  function inspect(receipt) {
    if (!receipt || typeof receipt !== 'object') return;
    if (receipt.resultStatus === 'unknown' || receipt.status === 'unknown') {
      reasons.push(receipt.unknownReasonCode || receipt.unknownReason
        || receipt.reason || 'QUERY_UNANSWERED');
    }
    if (receipt.schema === 'starcraft_tmg_pregame_lab_scenario_branch_receipt_v1'
      && receipt.branchKind === 'hypothetical_geometry'
      && !receipt.hypotheticalPlacements?.length
      && receipt.hypotheticalActivation?.positionsPreserved !== true) reasons.push('HYPOTHETICAL_SCENE_EMPTY');
    for (const unit of receipt.hypotheticalPlacementAssessment?.units || []) {
      if (unit.resultStatus !== 'ok') reasons.push(unit.unknownReason || 'HYPOTHETICAL_PLACEMENT_INVALID');
    }
    if (receipt.schema === 'starcraft_tmg_pregame_lab_threat_exchange_receipt_v1'
      && !receipt.exchange?.attackEstimates?.length) reasons.push('NO_ATTACK_ESTIMATES_IN_SELECTED_SCENE');
    if (receipt.schemaVersion === 'starcraft_tmg_spatial_action_query_runtime_v1.result'
      && receipt.queryKind === 'fire_zone_exchange' && receipt.status !== 'unknown'
      && !receipt.result?.attackEstimates?.length) reasons.push('NO_ATTACK_ESTIMATES_IN_SELECTED_SCENE');
    inspect(receipt.queryReceipt);
  }
  inspect(evidence);
  inspect(evidence?.sourceReceipt);
  for (const follow of evidence?.followUpReceipts || []) { inspect(follow); inspect(follow.receipt); }
  return {usableForClaim:reasons.length === 0, reasons:[...new Set(reasons)],
    semanticRelevanceStillRequiresModelAssessment:true, unknownIsNotZero:true};
}
