import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_STRUCTURED_FAILURE_CLASSIFIER_VERSION =
  "starcraft_tmg_structured_failure_classifier_v1";

const PRE_EGRESS = new Set([
  "CONTRACT_CHAIN_DRIFT", "OUTPUT_CONTRACT_NOT_FOUND",
  "CONTEXT_MANIFEST_NOT_FOUND", "EXECUTION_POLICY_NOT_FOUND",
  "CAPABILITY_RECEIPT_NOT_FOUND", "STRUCTURED_PROVIDER_CAPABILITY_REQUIRED",
  "STRUCTURED_PROVIDER_REQUEST_TOO_LARGE",
]);
const NOT_SENT = new Set([
  "STRUCTURED_PROVIDER_PRE_EGRESS_FAILED", "PROVIDER_DNS_RESOLUTION_FAILED",
  "PROVIDER_DNS_PUBLIC_ADDRESS_REQUIRED", "PROVIDER_TRANSPORT_FAILED_BEFORE_SEND",
]);
const CAPACITY = new Set([
  "PROVIDER_RATE_LIMITED", "PROVIDER_UPSTREAM_FAILED",
  "STRUCTURED_PROVIDER_HTTP_REJECTED",
]);
const WIRE = new Set([
  "PROVIDER_RESPONSE_JSON_INVALID", "PROVIDER_RESPONSE_EMPTY_CONTENT",
  "STRUCTURED_PROVIDER_OUTPUT_MISSING",
]);
const SCHEMA = new Set(["STRUCTURED_PROVIDER_SCHEMA_INVALID"]);
const ADDRESS = new Set([
  "FACTION_SOURCE_REFERENCE_INVALID", "FACTION_PATCH_SCOPE_INVALID",
  "FACTION_LOCAL_EDITOR_SCOPE_INVALID",
]);
const SOURCE = new Set([
  "FACTION_PRODUCTION_REPAIR_REVALIDATION_REQUIRED",
  "FACTION_KNOWN_RULE_FAILURE", "SOURCE_SEMANTIC_INVALID",
]);
const REVIEW = new Set([
  "REVIEW_DISAGREEMENT", "FACTION_REVIEW_DISAGREEMENT",
]);
const STRATEGY = new Set([
  "STRATEGY_EFFECT_REGRESSION", "HELDOUT_STRATEGY_REGRESSION",
]);

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function boolean(value) {
  return value === true;
}

export function classifyStarcraftTmgStructuredFailureV1(input = {}) {
  const code = String(input.error?.code || input.code
    || "STRUCTURED_PROVIDER_FAILURE_UNKNOWN");
  const receipt = input.safeReceipt || input.error?.safeReceipt || null;
  const policy = input.policy || {};
  const fingerprint = hashStarcraftTmgContract({
    code,
    requestHash: input.requestHash || null,
    safeReceiptHash: receipt?.receiptHash || null,
    outputContractHash: input.outputContractRef?.hash || null,
  });
  if (input.priorFailureFingerprint === fingerprint) {
    return freeze({ status: "stopped", class: "repeated_no_progress",
      retryRoute: null, maxAdditionalProviderAttempts: 0, fingerprint,
      reason: "identical_failure_fingerprint", trainingTruth: false });
  }
  let result;
  if (code === "PROVIDER_PAYMENT_REQUIRED") {
    result = ["stopped", "payment_exhausted", null, 0];
  } else if (PRE_EGRESS.has(code)) {
    result = ["stopped", "pre_egress_contract", null, 0];
  } else if (CAPACITY.has(code)
    || receipt?.status === 429 || Number(receipt?.status) >= 500) {
    result = boolean(policy.idempotentRetrySupported)
      ? ["retryable", "provider_rate_or_capacity",
        "capped_delayed_retry_with_jitter", 1]
      : ["stopped", "provider_rate_or_capacity", null, 0];
  } else if (code === "STRUCTURED_PROVIDER_AMBIGUOUS_SEND"
    || receipt?.requestMayHaveBeenSent === true
      && receipt?.requestDefinitelyNotSent !== true
      && !receipt?.usageKnown) {
    result = ["stopped", "ambiguous_egress", "manual_provider_reconciliation", 0];
  } else if (NOT_SENT.has(code)
    || receipt?.requestDefinitelyNotSent === true) {
    result = boolean(policy.allowDefinitelyNotSentRetry)
      ? ["retryable", "definitely_not_sent_transient",
        "bounded_backoff_same_attempt_family", 1]
      : ["stopped", "definitely_not_sent_transient", null, 0];
  } else if (code === "STRUCTURED_PROVIDER_INCOMPLETE"
    || code === "PROVIDER_RESPONSE_OUTPUT_TRUNCATED") {
    result = boolean(policy.allowOneCapacityRetry)
      ? ["retryable", "output_incomplete",
        "preauthorized_capacity_once_same_semantic_task", 1]
      : ["quarantined", "output_incomplete", null, 0];
  } else if (WIRE.has(code)) {
    result = ["quarantined", "wire_syntax",
      boolean(policy.encryptedRawQuarantineAvailable)
        ? "payload_only_repair" : "quarantine_no_raw_recovery", 0];
  } else if (SCHEMA.has(code)) {
    result = ["quarantined", "schema_instance",
      boolean(policy.encryptedRawQuarantineAvailable)
        ? "payload_local_field_repair" : "local_semantic_regeneration_with_capsule", 0];
  } else if (ADDRESS.has(code)) {
    result = ["quarantined", "address_or_scope",
      "host_lookup_or_materialization_then_fresh_review", 0];
  } else if (SOURCE.has(code)) {
    result = ["quarantined", "source_semantic",
      "source_bound_local_regeneration_and_rules_recheck", 0];
  } else if (REVIEW.has(code)) {
    result = ["quarantined", "review_disagreement",
      "source_rules_adjudication_and_reviewer_calibration", 0];
  } else if (STRATEGY.has(code)) {
    result = ["quarantined", "strategy_effect",
      "matched_replay_and_heldout_comparison", 0];
  } else if (code === "STRUCTURED_PROVIDER_REFUSAL"
    || code === "STRUCTURED_PROVIDER_FAILED"
    || code === "PROVIDER_AUTHENTICATION_FAILED") {
    result = ["stopped", "provider_terminal", null, 0];
  } else {
    result = ["stopped", "unclassified", null, 0];
  }
  return freeze({ status: result[0], class: result[1], retryRoute: result[2],
    maxAdditionalProviderAttempts: result[3], fingerprint,
    genericRetryAllowed: false,
    fullContextFormatRetryAllowed: false,
    trainingTruth: false });
}
