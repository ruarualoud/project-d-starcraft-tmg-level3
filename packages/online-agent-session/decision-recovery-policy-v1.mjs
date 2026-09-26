// One owner for the transport outcomes shared by explicit-resume admission
// and verified-Apply issue closure. This is not an automatic retry policy:
// dispatch settlement, credentials, budget and Rules remain separate gates.
export const STARCRAFT_TMG_RECOVERABLE_PROVIDER_FINDING_CODES_V1 = Object.freeze([
  "provider_worker_protocol_rejected",
  "provider_worker_failed",
  "provider_transport_failed",
  "provider_transport_timeout",
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
  "LIVE_DECISION_ACTION_DID_NOT_CONVERGE",
  "LIVE_DECISION_PARAMETERIZED_PROPOSAL_DID_NOT_CONVERGE",
  "LIVE_DECISION_PLANNER_DID_NOT_CONVERGE",
  "LIVE_DECISION_PROVIDER_OUTPUT_INVALID",
  "LIVE_DECISION_SEMANTIC_CORRECTION_LIMIT_REACHED",
  "LIVE_DECISION_TERMINAL_TOOL_INVALID",
  ...STARCRAFT_TMG_RECOVERABLE_PROVIDER_FINDING_CODES_V1,
]);
const explicitResumeCodes = new Set(
  STARCRAFT_TMG_RECOVERABLE_DECISION_FINDING_CODES_V1);

export function isStarcraftTmgHistoricalResumeFindingV1(finding, input = {}) {
  return input.allowExistingRetryableFinding === true
    && explicitResumeCodes.has(String(finding?.code))
    && Date.parse(String(finding?.occurredAt || "")) < Date.parse(input.startedAt)
    && !finding?.resolvedAt;
}
