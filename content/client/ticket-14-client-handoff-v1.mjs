import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_SHARED_WEB_APP_BOUNDARY_V1 } from
  "./shared-web-app-boundary-v1.mjs";
import { STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1 } from
  "../../packages/client-domain/official-faq-current-client-contract-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_14_client_handoff_v1",
  ticket: 14,
  preparedAt: "2026-09-03T20:30:00.000Z",
  predecessorBoundaryHash: STARCRAFT_TMG_SHARED_WEB_APP_BOUNDARY_V1.boundaryHash,
  currentRulesClientContractHash:
    STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1.clientContractHash,
  delivered: {
    canonicalClient: "expo_web_android_ios",
    diagnosticClient: "battle_lab",
    clientDomainInterface: ["bootstrap", "read", "dispatch", "subscribe"],
    sharedAuthoritySequence: [
      "legal_space",
      "proposal",
      "sealed_preview",
      "explicit_human_confirmation",
      "fenced_apply",
      "receipt",
      "replay",
    ],
    roomAccess: [
      "public_observer",
      "one_time_invite",
      "same_seat_recovery",
      "control_lease_fencing",
    ],
    battleWorkbench: [
      "unit_and_upgrade_inspection",
      "scenario_deployment_reserve_and_score",
      "multi_mode_threat",
      "rules_bound_probability",
      "current_faq_token_marker_palette",
      "score_forecast",
      "contextual_rules",
      "authoritative_write_sheet",
    ],
    characterPresentation: [
      "versioned_persona_selector",
      "eight_era_character_package",
      "dynamic_dialogue_portrait",
      "adjutant_panel",
    ],
    buildEvidence: {
      webStaticAndRealBrowser: true,
      androidDebugAndStandalonePreview: true,
      androidPhysicalDevice: false,
      iosNativeBuildAndDevice: false,
    },
  },
  deferredDeviceGate: {
    userDirectedDeferral: true,
    testingWindow: "after_full_development_batch",
    waived: false,
    formalTicket14CompletionAllowed: false,
    androidRequiredEvidence: [
      "physical_install_and_cold_launch",
      "foreground_background_and_projection_storage",
      "public_and_invite_deep_links",
      "haptics_sharing_bgm_and_voice",
      "preview_confirm_apply_receipt_replay",
      "offline_online_reconnect",
    ],
    iosRequiredEnvironment: ["full_xcode", "apple_signing", "physical_device"],
  },
  ticket15OnlineAgent: {
    owner: "ticket-15-online-role-agent-session",
    mayBeginBeforeDeferredDeviceGate: true,
    extensionName: "role_agent_session_v1",
    mountsThroughExistingClientDomainInterface: true,
    modes: ["tutor", "opponent", "commentator", "companion"],
    consumes: [
      "viewer_scoped_room_projection",
      "current_rules_legal_space_and_replay",
      "ticket_13_character_package",
      "ticket_14_adjutant_panel",
      "battle_lab_trace_projection_port",
    ],
    mustProduce: [
      "isolated_per_room_per_role_session",
      "mode_scoped_visibility_tools_prompt_and_memory",
      "budget_cancel_timeout_and_reconnect_state",
      "real_web_harness_trace",
      "opponent_proposal_and_preview_only_until_human_confirmation",
      "explicit_no_provider_configured_state",
    ],
    cannotOwn: [
      "rules_legality",
      "room_state",
      "rng",
      "hidden_opponent_state",
      "human_confirmation",
      "provider_credentials",
      "skill_generation_or_dsh",
      "training_truth",
    ],
  },
  ticket16Byok: {
    owner: "ticket-16-direct-provider-secure-byok",
    clientMaySubmitCredentialOnlyToDedicatedSecureIngress: true,
    credentialMayEnterClientProjectionCacheLogReceiptOrApk: false,
    mustProduce: [
      "explicit_attach_consent_and_detach",
      "isolated_credential_worker",
      "provider_host_and_model_allowlist",
      "wal_attempt_budget_and_crash_recovery",
      "redaction_and_credential_echo_fuzzing",
      "user_authorized_live_provider_receipt",
    ],
  },
  laterBoundaries: {
    skillGenerationStartsAtTicket: 17,
    skillEvaluationPromotionStartsAtTicket: 18,
    dshMayRunOnlyForOfflineSkillGeneration: true,
    largeScaleSkillProductionRequiresFreshUserConfirmation: true,
    muzeroStartsAtTicket: 19,
    selfPlayStartsAtTicket: 20,
  },
  authority: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    byokCredentialEmbedded: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_14_CLIENT_HANDOFF_V1 = freeze({
  ...body,
  handoffHash: hashStarcraftTmgContract(body),
});
