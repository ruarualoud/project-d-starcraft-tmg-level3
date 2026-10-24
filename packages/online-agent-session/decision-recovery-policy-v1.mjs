// One owner for the transport outcomes shared by explicit-resume admission
// and verified-Apply issue closure. This is not an automatic retry policy:
// dispatch settlement, credentials, budget and Rules remain separate gates.
export const STARCRAFT_TMG_RECOVERABLE_PROVIDER_FINDING_CODES_V1 = Object.freeze([
  "provider_worker_protocol_rejected",
  "provider_worker_failed",
  // The credential worker's result deadline can expire after dispatch even
  // when no complete response reaches the parent. The gateway normalizes
  // PROVIDER_WORKER_RESULT_TIMEOUT to this code. A settled old occurrence may
  // admit an explicitly later run; unknown usage and fresh failures stay intact.
  "provider_worker_result_timeout",
  "provider_transport_failed",
  "provider_transport_timeout",
  // A stream can terminate after egress without a complete reply or usage.
  // Only a settled failure in an explicitly later run is admitted here;
  // unknown-use accounting and retry consent are not waived.
  "provider_response_stream_failed",
  // A settled HTTP rejection is not a successful response or an automatic
  // retry. An explicitly authorized later run may retry the same preserved
  // choice. Authentication/payment/rate-limit errors have separate codes and
  // are deliberately excluded; any new rejection in that run still blocks.
  "provider_http_rejected",
  // An unsafe gateway envelope is never consumed as a decision. After a
  // concrete normalization fix, only an explicit later run may retry the
  // saved choice; a fresh occurrence in that run still blocks immediately.
  "unsafe_provider_result",
  // A previously settled pre-dispatch policy-shape failure may be retried only
  // in an explicit later run after the configuration has been repaired. A new
  // occurrence in that run remains blocking.
  "provider_attempt_integer_invalid",
  // The supervisor emits this code when its own deadline expires after
  // dispatch; explicit later runs must be able to retry the saved choice.
  "timed_out",
  "LIVE_DECISION_PROVIDER_OUTPUT_TRUNCATED",
]);

// Keep admission and post-Apply closure on the same typed decision outcomes.
// Admission never marks a finding resolved and applies only to an explicit
// later run. New failures and Rules/auth/budget failures remain blocking.
export const STARCRAFT_TMG_RECOVERABLE_DECISION_FINDING_CODES_V1 = Object.freeze([
  // A full/locked local decision store is High for the current run. Once an
  // operator repairs storage, an explicit later run may retry the preserved
  // action; only a verified Apply may resolve the historical finding. If the
  // store still fails, that new occurrence blocks again.
  "LIVE_DECISION_STORE_WRITE_FAILED",
  // A saved pre-dispatch input-capacity finding can be retried in an explicit
  // later run after its lossless projection repair. Do not erase the old issue
  // or waive the actual input reservation check: recurrence still blocks, and
  // only a real sealed Apply plus matching Replay closes this history.
  "LIVE_DECISION_PROVIDER_INPUT_CAPACITY_EXCEEDED",
  "LIVE_DECISION_ACTION_DID_NOT_CONVERGE",
  "LIVE_DECISION_PARAMETERIZED_PROPOSAL_DID_NOT_CONVERGE",
  "LIVE_DECISION_PLANNER_DID_NOT_CONVERGE",
  "LIVE_DECISION_PROVIDER_OUTPUT_INVALID",
  "LIVE_DECISION_SEMANTIC_CORRECTION_LIMIT_REACHED",
  "LIVE_DECISION_TERMINAL_TOOL_INVALID",
  // A Host-side candidate-classification repair may restore the same frozen
  // LegalSpace. Only an explicit later run may try it; the historical High
  // finding closes only after a real Apply and matching Replay.
  "LIVE_DECISION_ALL_CURRENT_CANDIDATES_UNAVAILABLE",
  ...STARCRAFT_TMG_RECOVERABLE_PROVIDER_FINDING_CODES_V1,
]);
const explicitResumeCodes = new Set(
  STARCRAFT_TMG_RECOVERABLE_DECISION_FINDING_CODES_V1);

export function isStarcraftTmgHistoricalResumeFindingV1(finding, input = {}) {
  if (String(finding?.code) === "LIVE_DECISION_CNY_BUDGET_EXHAUSTED") {
    const projection = input.providerProjection;
    const budget = projection?.budget;
    const change = budget?.authorizedLimitChanges?.at(-1);
    // A budget failure is not a transport retry. Admit only the same seat's
    // old finding after an actual explicit raised-limit commit; the next
    // request still passes the ordinary cost reservation check. A new budget
    // failure, unchanged cap or exhausted new cap must remain blocking.
    return input.allowExistingRetryableFinding === true
      && !finding?.resolvedAt
      && projection?.scope?.seatKey === finding.seatKey
      && change?.scopeKey === projection?.scope?.scopeKey
      && change?.source === "explicit_operator_configuration"
      && change.cumulativeUsageAndPaidHistoryPreserved === true
      && change.previousLimitCnyMicros < change.limitCnyMicros
      && change.limitCnyMicros === budget.limitCnyMicros
      && projection.usage?.estimatedCostCnyMicros < budget.limitCnyMicros
      && Date.parse(finding.occurredAt) < Date.parse(change.occurredAt)
      && Date.parse(change.occurredAt) < Date.parse(input.startedAt);
  }
  return input.allowExistingRetryableFinding === true
    && explicitResumeCodes.has(String(finding?.code))
    && Date.parse(String(finding?.occurredAt || "")) < Date.parse(input.startedAt)
    && !finding?.resolvedAt;
}
