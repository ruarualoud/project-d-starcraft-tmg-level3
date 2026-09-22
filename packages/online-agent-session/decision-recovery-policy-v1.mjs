// One owner for the transport outcomes shared by explicit-resume admission
// and verified-Apply issue closure. This is not an automatic retry policy:
// dispatch settlement, credentials, budget and Rules remain separate gates.
export const STARCRAFT_TMG_RECOVERABLE_PROVIDER_FINDING_CODES_V1 = Object.freeze([
  "provider_worker_protocol_rejected",
  "provider_transport_failed",
  "provider_transport_timeout",
  "LIVE_DECISION_PROVIDER_OUTPUT_TRUNCATED",
]);

const explicitResumeCodes = new Set([
  "LIVE_DECISION_ACTION_DID_NOT_CONVERGE",
  "LIVE_DECISION_SEMANTIC_CORRECTION_LIMIT_REACHED",
  "LIVE_DECISION_TERMINAL_TOOL_INVALID",
  ...STARCRAFT_TMG_RECOVERABLE_PROVIDER_FINDING_CODES_V1,
]);

export function isStarcraftTmgHistoricalResumeFindingV1(finding, input = {}) {
  return input.allowExistingRetryableFinding === true
    && explicitResumeCodes.has(String(finding?.code))
    && Date.parse(String(finding?.occurredAt || "")) < Date.parse(input.startedAt)
    && !finding?.resolvedAt;
}
