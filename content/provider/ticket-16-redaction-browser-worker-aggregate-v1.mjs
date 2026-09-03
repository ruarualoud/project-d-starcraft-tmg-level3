import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_PROVIDER_PRODUCT_FLOW_V1 as predecessor } from
  "./ticket-16-provider-product-flow-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion:
    "starcraft_tmg_ticket_16_redaction_browser_worker_aggregate_v1",
  ticket: 16,
  slice: 161,
  preparedAt: "2026-09-04T10:00:00.000Z",
  predecessorContractHash: predecessor.contractHash,
  objective:
    "prove_encoded_credential_echo_redaction_real_chromium_byok_and_single_attempt_worker_failure_recovery",
  redaction: {
    knownSecretEchoEncodings: [
      "raw_utf8",
      "url_encoded",
      "double_url_encoded",
      "base64_padded",
      "base64_unpadded",
      "base64url_unpadded",
      "hex_lower",
      "hex_upper",
      "json_escaped",
      "unicode_escaped_ascii",
    ],
    scanScopes: [
      "secure_provider_http_responses",
      "secure_provider_client_results",
      "client_public_projection",
      "battle_lab_dom",
      "browser_evidence_artifacts",
      "generated_verifier_reports",
    ],
    unexpectedErrorProjection: "fixed_allowlisted_code_only",
    unexpectedControlFailure: "fixed_provider_control_failed_without_message",
    mutableSecretBuffersZeroedOnEveryTerminalPath: true,
  },
  browser: {
    engine: "pinned_real_chromium",
    surface: "battle_lab",
    implicitProviderRequestAtStartupAllowed: false,
    lifecycle: [
      "bind_authenticated_room",
      "open_current_agent_session",
      "explicitly_load_server_profile",
      "consent_and_prepare_one_time_ingress",
      "observe_code_only_deterministic_worker_attach_failure",
      "prepare_fresh_ingress_and_attach_to_real_child_worker",
      "run_companion_turn_while_attachment_is_active",
      "refresh_safe_state",
      "explicitly_detach_and_observe_worker_shutdown",
      "run_tutor_opponent_commentator_and_cancel_paths",
    ],
    providerCalls: "deterministic_injected_role_gateway_only",
    externalProviderCalls: 0,
  },
  workerFailureAggregate: {
    requiredPaths: [
      "definitely_not_sent_zero_charge",
      "may_have_been_sent_full_reservation",
      "cancel_after_dispatch_unknown_usage_once",
      "timeout_after_dispatch_unknown_usage_once",
      "unexpected_worker_exit_no_restart",
      "reserved_recovery_zero_charge",
      "dispatched_recovery_ambiguous_full_reservation",
    ],
    physicalAttemptsPerLogicalExecutionMaximum: 1,
    automaticProviderRetries: 0,
    automaticSchemaRepairs: 0,
    ambiguousRecoveryNeedsFreshApprovalAndCredential: true,
  },
  acceptance: {
    nodeVerifier:
      "scripts/verify-ticket-16-redaction-worker-aggregate-v1.mjs",
    browserVerifier:
      "scripts/verify-ticket-16-browser-aggregate-v1.py",
    nodeAssertions: 20,
    browserAssertions: 16,
    fixedAssertions: 36,
    predecessorAggregateRequired: true,
    realChromiumRequired: true,
    realCredentialChildRequired: true,
    deterministicProviderOnly: true,
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
    harnessToolsCalled: [
      "read_board_state", "list_legal_actions", "read_public_events",
      "read_character_worldbook",
    ],
    uiTraceEvidence:
      "real_chromium_byok_lifecycle_four_role_modes_and_cancel_path",
    agentDecisionEvidence:
      "deterministic_provider_contract_only_quality_not_claimed",
    memoryTraceEvidence: {
      refs: [], writes: 0, crossModeIsolationChecked: true,
    },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "reject_any_known_secret_echo_encoding_before_public_projection",
      "project_only_allowlisted_failure_codes",
      "never_retry_cancel_timeout_crash_or_ambiguous_recovery",
      "require_fresh_ingress_after_worker_attach_failure",
    ],
    userVisibleChecks:
      "worker_failure_code_attached_refresh_detached_and_four_role_traces",
  },
  runTruth: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    userCredentialAccepted: false,
    deterministicSyntheticCredentialOnly: true,
    realCredentialChildUsed: true,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_16_REDACTION_BROWSER_WORKER_AGGREGATE_V1 =
  freeze({
    ...body,
    contractHash: hashStarcraftTmgContract(body),
  });
