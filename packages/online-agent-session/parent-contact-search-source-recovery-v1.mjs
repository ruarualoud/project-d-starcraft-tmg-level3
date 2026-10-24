// A search-source repair does not change the frozen Rules runtime. Requery the
// same parent-contact domain once, then reuse only a currently valid paid draft.
export const STARCRAFT_TMG_PARENT_CONTACT_SEARCH_RECOVERY_VERSION =
  "parent_base_contact_gap_prefilter_recovery_v1";

const QUERY_KIND = "legal_asset_placement_options";
const FAILURE = "RULES_QUERY_NO_LEGAL_ASSET_PLACEMENT_OPTION";
const AUTHORITY_FIELDS = ["roomId", "matchBindingHash", "seatKey",
  "stateRevision", "stateHash", "legalSpaceHash"];
const OPTIONAL_AUTHORITY_FIELDS = ["spatialObservationHash", "spatialActionSpaceHash"];
const object = value => Boolean(value) && typeof value === "object"
  && !Array.isArray(value);
const clone = value => structuredClone(value);

function sameAuthority(left, right) {
  return object(left) && object(right)
    && AUTHORITY_FIELDS.every(field => left[field] !== undefined
      && left[field] !== null && left[field] === right[field])
    && OPTIONAL_AUTHORITY_FIELDS.every(field => !left[field] || !right[field]
      || left[field] === right[field]);
}

function parentContactCandidate(entry) {
  const domain = entry?.action?.sourceAction || entry?.action;
  // This is the exact lifecycle family whose contact prefilter was repaired.
  // An arbitrary empty search (including Omega/indicator placement) is not
  // evidence that a candidate is now available.
  return entry?.kind === "parameterized"
    && domain?.actionType === "resolve_unit_lifecycle_ability"
    && domain.effectKind === "spawn_creep_tumor"
    && domain.parameterSchema?.coordinate?.type === "world_point_milli_inches";
}

function submittedPlanning(choice, key, supplied) {
  // Production passes the existing responseParts projection. The flat path is
  // the durable json_channels submission, not a second output normalizer.
  return supplied?.[key] ?? choice.attempts?.[key]?.safeOutput;
}

function searchArguments(planning, candidateId) {
  if (!object(planning) || planning.recommendedCandidateId !== candidateId) return null;
  const nested = planning.assetPlacementSearchRequest;
  if (!object(nested) && planning.assetPlacementSearchRequested !== true) return null;
  const anchor = nested?.preferredAnchor || {
    xMilliInches: planning.assetPreferredX, yMilliInches: planning.assetPreferredY,
  };
  const maximumOptions = nested?.maximumOptions ?? planning.assetMaximumOptions;
  if (!Number.isSafeInteger(anchor.xMilliInches)
    || !Number.isSafeInteger(anchor.yMilliInches)
    || !Number.isSafeInteger(maximumOptions) || maximumOptions < 1) return null;
  return { domainId: candidateId, maximumOptions,
    preferredAnchor: clone(anchor),
    tacticalPurpose: String(nested?.tacticalPurpose ?? planning.assetTacticalPurpose ?? "") };
}

export function planStarcraftTmgParentContactSearchRecoveryV1(choice, {
  retryApproved = false, authority, submittedPlanningByAttemptKey,
} = {}) {
  if (!retryApproved || !sameAuthority(choice?.authority, authority)
    || choice.stage !== "planning" || choice.plannerResult
    || !["provider_output_invalid", "generating"].includes(choice.status)) return null;
  const candidates = (choice.actionIndex || []).filter(entry =>
    parentContactCandidate(entry) && choice.unavailableCandidateIds?.includes(entry.id)
      && choice.warnings?.includes(`HOST_CANDIDATE_UNAVAILABLE:${entry.id}:${FAILURE}`));
  // Legacy unknown receipts have no domainId. Multiple excluded contact domains
  // would make their attribution ambiguous; do not guess which one failed.
  if (candidates.length !== 1) return null;
  const candidateId = candidates[0].id;
  const version = STARCRAFT_TMG_PARENT_CONTACT_SEARCH_RECOVERY_VERSION;
  if (choice.parentContactSearchRecoveries?.some(entry => entry.version === version
    && entry.candidateId === candidateId && sameAuthority(entry.authority, authority))) return null;
  const failed = [...(choice.queryReceipts || [])].reverse().find(receipt =>
    receipt.queryKind === QUERY_KIND && receipt.status === "unknown"
      && receipt.reason === FAILURE && sameAuthority(receipt.authority, authority));
  if (!failed) return null;
  const eligible = [...(choice.attemptKeys || [])].reverse().flatMap(key => {
    const attempt = choice.attempts?.[key];
    const planning = submittedPlanning(choice, key, submittedPlanningByAttemptKey);
    const args = searchArguments(planning, candidateId);
    return attempt?.stage === "planning" && attempt.status === "completed"
      && choice.processedAttemptKeys?.includes(key) && args
      ? [{ key, args }] : [];
  });
  if (!eligible.length) return null;
  const args = eligible[0].args;
  // A fresh result for one anchor/purpose must not certify another old search.
  const candidateAttemptKeys = eligible.filter(entry =>
    JSON.stringify(entry.args) === JSON.stringify(args)).map(entry => entry.key);
  return { version, candidateId, candidateAttemptKeys, authority: clone(authority),
    oldReceiptHash: failed.queryReceiptHash,
    request: { requestId: `host-parent-contact-source-recovery-${choice.choiceKey}`,
      queryKind: QUERY_KIND, arguments: args } };
}

export function applyStarcraftTmgParentContactSearchRecoveryV1(choice, plan, {
  receipt, replayAttemptKey = null, recordedAt,
} = {}) {
  if (plan?.version !== STARCRAFT_TMG_PARENT_CONTACT_SEARCH_RECOVERY_VERSION
    || !sameAuthority(choice?.authority, plan.authority)
    || !choice.unavailableCandidateIds?.includes(plan.candidateId)
    || choice.parentContactSearchRecoveries?.some(entry => entry.version === plan.version
      && entry.candidateId === plan.candidateId && sameAuthority(entry.authority, plan.authority))) {
    return { recovered: false, reason: "recovery_not_current_or_already_consumed" };
  }
  const attempt = choice.attempts?.[replayAttemptKey];
  const receiptValid = receipt?.queryKind === QUERY_KIND && receipt.status === "exact"
    && sameAuthority(receipt.authority, plan.authority)
    && receipt.result?.domainId === plan.candidateId
    && Array.isArray(receipt.result.placementOptions) && receipt.result.placementOptions.length > 0;
  const draftValid = plan.candidateAttemptKeys.includes(replayAttemptKey)
    && attempt?.stage === "planning" && attempt.status === "completed";
  const recovered = receiptValid && draftValid;
  const reason = recovered ? "fresh_exact_search_and_currently_valid_paid_draft"
    : !receiptValid ? "fresh_search_not_exact_current_nonempty"
      : "no_currently_valid_paid_draft";
  choice.parentContactSearchRecoveries ||= [];
  choice.parentContactSearchRecoveries.push({ version: plan.version,
    candidateId: plan.candidateId, authority: clone(plan.authority),
    oldReceiptHash: plan.oldReceiptHash, freshReceiptHash: receipt?.queryReceiptHash || null,
    replayAttemptKey: recovered ? replayAttemptKey : null, recordedAt,
    recovered, reason, providerCalls: 0, roomMutations: 0 });
  if (receipt?.queryReceiptHash && !choice.queryReceipts.some(entry =>
    entry.queryReceiptHash === receipt.queryReceiptHash)) choice.queryReceipts.push(clone(receipt));
  choice.queryRounds = Number(choice.queryRounds || 0) + 1;
  choice.warnings.push(`LOCAL_PARENT_CONTACT_SEARCH_RECOVERY:${plan.version}:${
    plan.candidateId}:${recovered ? "ready" : "blocked"}`);
  if (recovered) {
    choice.unavailableCandidateIds = choice.unavailableCandidateIds
      .filter(id => id !== plan.candidateId);
    choice.pendingSearchRecoveryPlannerAttemptKey = replayAttemptKey;
  }
  // No paid return, old receipt, public claim or correction counter is rewritten.
  // Replay revalidation consumes the pending key through the existing pipeline.
  return { recovered, reason };
}
