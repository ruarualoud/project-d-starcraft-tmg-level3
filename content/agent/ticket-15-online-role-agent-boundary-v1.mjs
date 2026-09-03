import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_TICKET_14_CLIENT_HANDOFF_V1 } from
  "../client/ticket-14-client-handoff-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_15_online_role_agent_boundary_v1",
  ticket: 15,
  slice: 144,
  preparedAt: "2026-09-03T22:00:00.000Z",
  predecessorHandoffHash: STARCRAFT_TMG_TICKET_14_CLIENT_HANDOFF_V1.handoffHash,
  objective:
    "room_bound_online_role_agent_sessions_for_web_with_native_device_acceptance_deferred",
  existingImplementationAudit: {
    reusable: [
      "packages/character-agent/contracts-v1.mjs",
      "packages/character-agent/mode-capability-v1.mjs",
      "packages/character-agent/prompt-assembly-v1.mjs",
      "packages/character-agent/worldbook-registry-v1.mjs",
      "packages/character-agent/dynamic-dialogue-portrait-v1.mjs",
      "packages/character-agent/session-runtime-v1.mjs",
      "packages/character-agent/http-handler-v1.mjs",
      "packages/character-agent/openai-compatible-provider-v1.mjs",
      "packages/product-composition/character-session-factory-v1.mjs",
    ],
    reusableStatus: "ticket_13_contract_and_injected_transport_evidence_only",
    gaps: [
      "v1_session_runtime_requires_a_raw_api_key_before_every_invoke",
      "v1_http_handler_exposes_session_byok_endpoints",
      "provider_transport_is_direct_instead_of_an_opaque_gateway_port",
      "session_and_history_durability_is_process_memory_only",
      "no_server_owned_turn_budget_timeout_cancel_or_single_flight_state",
      "no_reconnect_safe_viewer_session_projection",
      "no_client_domain_role_agent_extension",
      "expo_adjutant_has_no_live_session_controls",
      "battle_lab_reports_not_mounted_ticket_15",
      "no_real_browser_role_agent_trace",
    ],
    migrationPolicy: {
      rewriteExistingCharacterContracts: false,
      wrapBehindVersionedOnlineSupervisor: true,
      preserveHistoricalVerifiers: true,
      silentCompatibilityAllowed: false,
    },
  },
  roles: {
    modes: ["tutor", "opponent", "commentator", "companion"],
    isolatedDimensions: [
      "room_id",
      "principal_scope_hash",
      "seat_key",
      "role_mode",
      "character_selection_hash",
      "rules_and_data_binding",
      "prompt_pack",
      "tool_allowlist",
      "memory_namespace",
      "history",
      "in_flight_turn",
      "budget",
    ],
    readOnlyModes: ["tutor", "commentator", "companion"],
    decisionMode: "opponent",
    modelMayConfirmOrApply: false,
    arbitraryModeAdditionsAccepted: false,
  },
  onlineSupervisor: {
    moduleOwner: "packages/online-agent-session",
    operations: [
      "create_session",
      "read_session",
      "send_turn",
      "cancel_turn",
      "reconnect_session",
      "end_session",
      "subscribe_session",
    ],
    turnStates: [
      "idle",
      "reading_authority",
      "assembling_prompt",
      "waiting_provider",
      "validating_output",
      "waiting_human_confirmation",
      "completed",
      "cancelled",
      "timed_out",
      "failed",
    ],
    concurrentTurnsPerSession: 1,
    interruptedTurnAutomaticallyRetried: false,
    reconnectMayResumeProviderRequest: false,
    durabilityBeforeTicket21: "process_memory_with_hash_sealed_projection_only",
    productionReady: false,
  },
  providerGateway: {
    owner: "ticket_16_direct_provider_secure_byok",
    ticket15PortInputs: [
      "opaque_provider_profile_ref",
      "prompt_assembly_ref",
      "bounded_request",
      "response_contract",
      "budget_reservation",
      "abort_signal",
    ],
    ticket15PortOutputs: [
      "validated_candidate_output",
      "safe_usage_receipt",
      "safe_failure",
    ],
    ticket15CredentialInputs: [],
    noProviderConfiguredStateRequired: true,
    injectedDeterministicGatewayAllowedForVerification: true,
    liveProviderClaimAllowed: false,
  },
  clientMount: {
    existingClientDomainOperationsRemain: ["bootstrap", "read", "dispatch", "subscribe"],
    extensionName: "role_agent_session_v1",
    targetSurfaces: ["expo_web_adjutant", "battle_lab_agent_and_harness"],
    nativeBuildRequiredThisTicket: false,
    nativeDeviceEvidenceDeferred: true,
  },
  authority: {
    rulesOwner: "rules_service",
    roomOwner: "room_runtime",
    chanceOwner: "authority_chance_ticket",
    humanConfirmationOwner: "non_model_controller",
    opponentDecisionSource: "current_enabled_legal_space_candidate_only",
    opponentPreviewAllowed: true,
    opponentApplyAllowed: false,
    skillGenerationAllowed: false,
    dshAllowed: false,
    trainingTruth: false,
  },
  slices: [
    { slice: 144, scope: "baseline_boundary_and_migration_audit" },
    { slice: 145, scope: "room_principal_role_session_lifecycle" },
    { slice: 146, scope: "provider_gateway_budget_timeout_cancel_single_flight" },
    { slice: 147, scope: "prompt_tool_memory_history_and_reconnect_isolation" },
    { slice: 148, scope: "opponent_legal_candidate_preview_external_human_confirmation" },
    { slice: 149, scope: "authenticated_agent_http_and_event_projection" },
    { slice: 150, scope: "client_domain_extension_and_expo_web_adjutant" },
    { slice: 151, scope: "battle_lab_live_harness_trace_observability" },
    { slice: 152, scope: "real_browser_aggregate_and_ticket_16_handoff" },
  ],
  laterBoundaries: {
    ticket16: "secure_byok_and_live_provider_receipt",
    ticket17: "dsh_offline_skill_candidate_generation_only",
    ticket18: "durable_skill_scheduler_evaluation_and_promotion",
    largeScaleSkillProductionRequiresFreshUserConfirmation: true,
  },
  runTruth: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    byokCredentialAccepted: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
  },
};

export const STARCRAFT_TMG_TICKET_15_ONLINE_ROLE_AGENT_BOUNDARY_V1 = freeze({
  ...body,
  boundaryHash: hashStarcraftTmgContract(body),
});
