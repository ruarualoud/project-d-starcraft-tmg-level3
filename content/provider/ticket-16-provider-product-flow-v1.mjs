import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_DURABLE_PROVIDER_GATEWAY_V1 as predecessor } from
  "./ticket-16-durable-provider-gateway-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_16_provider_product_flow_v1",
  ticket: 16,
  slice: 160,
  preparedAt: "2026-09-04T09:00:00.000Z",
  predecessorContractHash: predecessor.contractHash,
  objective:
    "mount_explicit_secure_byok_consent_and_one_time_binary_ingress_on_expo_web_and_battle_lab",
  productFlow: {
    surfaces: ["expo_web", "battle_lab"],
    nativeStatus: "deferred_with_ticket_14_physical_device_acceptance",
    stages: [
      "load_server_owned_provider_profile_catalogue",
      "open_authenticated_room_bound_agent_session",
      "select_allowlisted_provider_and_model_profile",
      "show_prompt_response_disclosure_and_maximum_budget_envelope",
      "record_explicit_consent",
      "prepare_short_lived_single_use_binary_ingress",
      "clear_password_input_before_awaiting_network",
      "attach_to_isolated_server_session_memory",
      "show_safe_attached_error_or_detached_state",
      "explicitly_detach_and_destroy_worker_credential",
    ],
    credentialInput: "password_style_one_time_binary_ingress",
    providerModelAuthority: "server_profile_registry_only",
    budgetProjection:
      "consent_time_session_maximum_envelope_not_live_spend",
    exactBudgetAuthority: "durable_server_attempt_store",
  },
  privacy: {
    browserPersistence: false,
    serverPersistence: false,
    applicationInputClearedBeforeNetworkAwait: true,
    mutableRequestBytesZeroed: true,
    isolatedWorkerSessionMemory: true,
    automaticRetryAllowed: false,
    publicProjectionExcludes: [
      "credential", "ingress_nonce", "attachment_id", "session_id",
      "raw_prompt", "raw_provider_output", "provider_headers",
    ],
    requestTransport: {
      authentication: "same_origin_http_only_cookie",
      cache: "no_store",
      sensitiveMediaType: "application/octet-stream",
      authorizationHeaderAllowed: false,
      tlsRequiredExceptExplicitLoopbackDevelopment: true,
    },
  },
  authority: {
    sharedClientDomainOperationsRemainExact: [
      "bootstrap", "read", "dispatch", "subscribe",
    ],
    credentialLifecycleIsSeparateFromGameIntentDispatch: true,
    privateAgentSessionLocatorEntersDom: false,
    arbitraryEndpointModelHeaderOrBudgetInputAllowed: false,
    humanHumanPlayCallsProvider: false,
    rulesRoomConfirmApplyAuthorityChanged: false,
  },
  acceptance: {
    verifier: "scripts/verify-ticket-16-provider-product-flow-v1.mjs",
    fixedAssertions: 37,
    realHttpControlAndClientAdapterRequired: true,
    expoTypecheckRequired: true,
    adjacentProductGatesRequired: true,
    realBrowserRequired: false,
    externalProviderCallRequired: false,
    realApiKeyRequired: false,
  },
  harnessEvidence: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [
      "novice_teacher_prompt", "opponent_prompt", "referee_prompt",
      "sparring_coach_prompt",
    ],
    harnessToolsCalled: [],
    uiTraceEvidence:
      "expo_web_and_battle_lab_secure_byok_control_sources_plus_deterministic_http_flow",
    agentDecisionEvidence: "not_run_product_control_slice",
    memoryTraceEvidence: { refs: [], writes: 0, crossModeIsolationChecked: true },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "hide_ingress_when_agent_session_is_not_current_and_active",
      "clear_local_attachment_projection_on_session_epoch_change",
      "clear_secret_input_and_bytes_on_every_terminal_path",
      "show_code_only_failure_without_credential_echo",
    ],
    userVisibleChecks:
      "profile_model_disclosure_consent_password_attached_error_detached_and_budget_envelope",
  },
  runTruth: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    userCredentialAccepted: false,
    deterministicSyntheticCredentialOnly: true,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_16_PROVIDER_PRODUCT_FLOW_V1 = freeze({
  ...body,
  contractHash: hashStarcraftTmgContract(body),
});
