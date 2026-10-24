import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export function isExplicitlyRecoverableProviderDispatchV1(record) {
  return (record?.status === 'definitely_not_sent'
    && record.transportFailure?.requestDefinitelyNotSent === true)
    || record?.status === 'ambiguous' || (record?.status === 'response_rejected'
    && [502, 503, 504].includes(record.rejection?.httpStatus)
    && record.rejection?.contextLengthExceeded !== true);
}

// Historical ambiguous fees stay unknown even after a successful retry. They
// are accounting history, not a second pending logical request. Only an exact
// completed retry lineage settles the execution obligation; no record is edited.
export function unresolvedStarcraftTmgProviderDispatchesV1(records = []) {
  const completed = (record, seen = new Set()) => {
    if (seen.has(record.requestId)) return false;
    seen.add(record.requestId);
    return records.some(retry => retry.retryOfRequestId === record.requestId
      && retry.contextHash === record.contextHash
      && retry.requestBodyHash === record.requestBodyHash
      && retry.sessionId === record.sessionId && retry.planHash === record.planHash
      && retry.roundKind === record.roundKind && retry.roundIndex === record.roundIndex
      && (retry.status === 'completed' || completed(retry, new Set(seen))));
  };
  return records.filter(record => ['ambiguous', 'reserved', 'sent', 'sending'].includes(record.status)
    && !completed(record));
}

// Pure shared reconciliation policy. A returned public reply can be replayed;
// definitely-not-sent can be retried under the caller's existing budget. No
// request is ever resent solely because a connection failed or a timer fired.
export function reconcileStarcraftTmgProviderDispatchV1({ dispatchRecord,
  retainedOutputs = [], processInterrupted = false, resumeAuthorization = null,
  retryAuthorizations = [] } = {}) {
  const record = dispatchRecord;
  const base = { schemaVersion: "starcraft_tmg_provider_dispatch_recovery_v1",
    kind: "provider_dispatch", scope: "current_request",
    requestId: record?.requestId || null, contextHash: record?.contextHash || null,
    costStatus: record?.costStatus || "unknown",
    automaticResendAllowed: false, mayApply: false, trainingTruth: false };
  if (!record?.requestId || !record?.requestBodyHash || !record.contextHash) {
    return { ...base, action: "needs_attention", reason: "legacy_request_identity_missing" };
  }
  const output = retainedOutputs.find(item => item.dispatchRequestId === record.requestId
    && item.roundKind === record.roundKind
    && Number(item.roundIndex) === Number(record.roundIndex)
    && item.contextHash === record.contextHash
    && item.outputContractRef?.hash === record.outputContractRef?.hash
    && item.outputHash === hashStarcraftTmgContract(item.sanitizedOutput));
  if (output) return { ...base, action: "replay_local", reason: "durable_public_reply_available",
    outputHash: output.outputHash, costStatus: record.costStatus || "known" };
  // Fresh, explicit consent targets one terminal physical attempt, including a
  // failed retry leaf. Never revive its ancestor's consumed authorization.
  if (processInterrupted === true && isExplicitlyRecoverableProviderDispatchV1(record)
    && resumeAuthorization?.explicitSingleRetry === true
    && resumeAuthorization.requestId === record.requestId
    && resumeAuthorization.contextHash === record.contextHash
    && resumeAuthorization.requestBodyHash === record.requestBodyHash
    && !retryAuthorizations.some(a => a.requestId === record.requestId && a.status === 'consumed')) {
    return { ...base, action: 'retry_explicit_once', reason: 'explicit_terminal_attempt_consent',
      maximumPhysicalRetries: 1, originalAttemptPreserved: true };
  }
  if (record.status === "reserved" || record.status === "definitely_not_sent") {
    return { ...base, action: "retry_not_sent", reason: "no_egress_proven",
      costStatus: "not_sent", automaticResendAllowed: true };
  }
  // An interrupted owner is distinct from a slow live request. Standing user
  // consent authorizes one new physical attempt for this exact durable request,
  // preserving the unknown original fee/result and preventing consent reuse.
  if (processInterrupted === true && ["sending", "ambiguous"].includes(record.status)
    && resumeAuthorization?.standingNetworkResumeConsent === true
    && resumeAuthorization.requestId === record.requestId
    && resumeAuthorization.contextHash === record.contextHash
    && resumeAuthorization.requestBodyHash === record.requestBodyHash
    && !retryAuthorizations.some(a => a.requestId === record.requestId && a.status === "consumed")) {
    return { ...base, action: "retry_authorized_unknown", reason: "owner_interrupted_standing_resume_consent",
      costStatus: "unknown", automaticResendAllowed: true, maximumPhysicalRetries: 1,
      originalAttemptPreserved: true };
  }
  return { ...base, action: "needs_attention", reason:
    record.status === "completed" || record.status === "response_received"
      ? "returned_reply_not_durably_available" : "egress_unknown_and_no_result_lookup",
    // A true Provider lookup adapter can later settle this state. Merely
    // clearing the failure/counter or replacing the request ID cannot.
    automaticResendAllowed: false };
}
