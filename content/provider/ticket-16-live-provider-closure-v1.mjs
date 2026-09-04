import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createProviderProfile } from
  "../../packages/character-agent/contracts-v1.mjs";
import { STARCRAFT_TMG_DEEPSEEK_V4_FLASH_PRICING_SNAPSHOT_V1 as pricing } from
  "../../packages/secure-provider-runtime/provider-pricing-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_REDACTION_BROWSER_WORKER_AGGREGATE_V1 as predecessor } from
  "./ticket-16-redaction-browser-worker-aggregate-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

export const STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_PROFILE_V1 =
  createProviderProfile({
    providerProfileId: "starcraft-tmg.direct-provider.admin-default.v1",
    version: "2026.08.31-deepseek-v4-flash-0731.1",
    provider: "deepseek-openai-compatible-direct",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
    thinkingMode: "disabled",
    reasoningEffort: "low",
    temperature: 0,
    topP: 1,
    contextBudget: 1_000_000,
    outputBudget: 64,
    toolSupport: false,
    timeoutMs: 120_000,
    retryPolicy: {
      maxAttempts: 1,
      owner: "session_supervisor",
      internalRetry: false,
    },
    fallbackPolicy: "fail_closed",
  });

const body = {
  schemaVersion: "starcraft_tmg_ticket_16_live_provider_closure_v1",
  ticket: 16,
  slice: 162,
  preparedAt: "2026-09-03T20:00:03.000Z",
  predecessorContractHash: predecessor.contractHash,
  objective:
    "one_explicitly_authorized_live_provider_call_through_secure_byok_durable_gateway_and_ticket_closure",
  officialProviderEvidence: {
    firstCallUrl: "https://api-docs.deepseek.com/",
    firstCallContentSha256:
      "fc590e5b2cc856c798d46314828dd790320e177317121a1864ef5428991d12d7",
    chatApiUrl:
      "https://api-docs.deepseek.com/api/create-chat-completion/",
    chatApiContentSha256:
      "67b6a6c8ab70f51ad56f6018077ac58768d95f73b53639b4d00b3f6d57a4fad9",
    pricingSnapshotHash: pricing.snapshotHash,
    baseUrl: "https://api.deepseek.com",
    completionPath: "/chat/completions",
    requestedModel: "deepseek-v4-flash",
    officialModelRelease: pricing.officialModelRelease,
    jsonOutputSupported: true,
    usageCacheBreakdownRequired: true,
  },
  liveAuthority: {
    explicitFlags: [
      "--authorize-live-provider-once",
      "--attest-rotated-after-chat-exposure",
    ],
    credentialIngress: "anonymous_stdin_binary_pipe_only",
    credentialEnvironmentAllowed: false,
    credentialArgumentAllowed: false,
    previouslyChatExposedCredentialAllowed: false,
    successfulReceiptPreventsAnotherRun: true,
    ambiguousAttemptPreventsAutomaticRerun: true,
  },
  productPath: [
    "current_authenticated_online_agent_session",
    "server_owned_profile_registry",
    "explicit_disclosure_consent",
    "one_time_bounded_credential_attachment",
    "isolated_provider_egress_child",
    "durable_sqlite_intent_reservation_and_dispatch",
    "one_https_provider_attempt",
    "atomic_actual_usage_settlement",
    "safe_receipt_and_cost_projection",
    "explicit_worker_detach",
  ],
  receipt: {
    allowedEvidence: [
      "provider_id", "requested_model", "reported_model",
      "official_model_release", "provider_system_fingerprint_hash",
      "provider_request_id_hash", "usage_units", "pricing_window",
      "calculated_cost_nano_usd", "calculated_cost_usd",
      "response_fingerprint", "safe_provider_receipt_hash",
      "durable_attempt_and_budget_hashes",
    ],
    rawCredentialAllowed: false,
    credentialHashAllowed: false,
    rawPromptAllowed: false,
    rawResponseAllowed: false,
    reasoningAllowed: false,
    providerInvoiceClaimAllowed: false,
  },
  acceptance: {
    preflightAssertions: 20,
    liveClosureAssertions: 16,
    fixedAssertions: 36,
    predecessorAggregateRequired: true,
    realCredentialChildRequired: true,
    realProviderHttpsRequired: true,
    physicalProviderAttempts: 1,
    automaticRetries: 0,
    browserEvidenceBoundFromSlice: 161,
    browserSemanticEvidenceHash:
      "be6435cbb723a3a4c6007fe95220f2701b784df623ac54d52c6d9f7d26714452",
    browserRasterArtifactsValidatedPerRun: true,
  },
  harnessEvidence: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["novice_teacher_prompt"],
    harnessToolsCalled: [
      "read_character_worldbook", "assemble_role_prompt",
      "attach_provider_credential", "execute_provider_turn_once",
      "read_durable_provider_receipt",
    ],
    uiTraceEvidence:
      "slice_161_real_chromium_safe_attachment_states_bound_by_hash",
    agentDecisionEvidence:
      "minimal_tutor_explanation_only_no_decision_preview_confirm_or_apply",
    memoryTraceEvidence: { refs: [], writes: 0 },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "missing_or_unsafe_live_receipt_keeps_ticket_open",
      "any_ambiguous_attempt_requires_new_user_authorization_and_fresh_credential",
      "reported_model_or_pricing_snapshot_drift_reopens_live_acceptance",
      "never_promote_the_live_response_to_skill_memory_or_training_truth",
    ],
    userVisibleChecks:
      "slice_161_browser_attached_error_refresh_detached_states",
  },
  runTruthBeforeAuthorization: {
    sourceRefreshPerformed: false,
    liveProviderCalled: false,
    userCredentialAccepted: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    ticketComplete: false,
  },
};

export const STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_CLOSURE_V1 = freeze({
  ...body,
  contractHash: hashStarcraftTmgContract(body),
});
