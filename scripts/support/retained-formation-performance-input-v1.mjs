import { isDeepStrictEqual } from 'node:util';

// Only the Host-generated request from the production formation seam counts.
// An absent model query_requests list is not an empty but equivalent workload.
export function retainedFormationPerformanceInputV1(decision) {
  const planner = decision?.plannerResult;
  const search = planner?.formationSearchRequest;
  const receipt = decision?.queryReceipts?.find(entry =>
    entry.queryKind === 'space.solve_formation');
  if (!decision?.choiceKey || !decision?.authority || !search
    || !planner.recommendedCandidateId || !Array.isArray(search.formationObjectives)
    || !search.formationObjectives.length || !search.tacticalPurpose
    || receipt?.result?.domainId !== planner.recommendedCandidateId) {
    return { status: 'missing_captured_host_formation_input', request: null };
  }
  return { status: 'captured_host_formation_input',
    authority: structuredClone(decision.authority),
    request: {
      requestId: `host-required-formation-${decision.choiceKey}`,
      queryKind: 'space.solve_formation',
      arguments: {
        domainId: planner.recommendedCandidateId,
        maximumOptions: Number(search.maximumOptions || 4),
        ...(search.preferredAnchor ? {
          preferredAnchor: structuredClone(search.preferredAnchor),
        } : {}),
        tacticalPurpose: String(search.tacticalPurpose),
        formationObjectives: structuredClone(search.formationObjectives),
      },
    },
    completeReceiptHash: receipt.queryReceiptHash,
    workload: structuredClone(receipt.result.searchCoverage),
  };
}

export function compareRetainedFormationPerformanceInputsV1(before, after) {
  const left = retainedFormationPerformanceInputV1(before);
  const right = retainedFormationPerformanceInputV1(after);
  if (!left.request || !right.request) return {
    comparable: false, sameRequest: null, reason: 'CAPTURED_HOST_INPUT_MISSING',
    nonEmptyHostInputsPresent: false,
  };
  if (!isDeepStrictEqual(left.authority, right.authority)) return {
    comparable: false, sameRequest: null, reason: 'CAPTURED_AUTHORITY_DIFFER',
    nonEmptyHostInputsPresent: true,
  };
  const sameRequest = isDeepStrictEqual(left.request, right.request);
  return { comparable: sameRequest, sameRequest,
    reason: sameRequest ? 'SAME_CAPTURED_HOST_INPUT' : 'REQUEST_ARGUMENTS_DIFFER',
    nonEmptyHostInputsPresent: true, before: left, after: right };
}
