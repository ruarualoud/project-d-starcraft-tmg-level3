import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";

const unsigned = {
  schemaVersion: "starcraft_tmg_shared_web_app_boundary_v1",
  decisionId: "starcraft-tmg.ticket-14.shared-web-app-boundary.v1",
  createdAt: "2026-09-03T05:00:00.000Z",
  sourceBaseline: {
    repository: "git@github.com:ruarualoud/sc-tmg-app.git",
    branch: "codex/starcraft-classic-army-builder",
    commit: "f07b3cb78ce6bf119bdc529cde41dbe91e00a61d",
    gitTree: "4b8d248626ddb1b4dfb2faf4776731bdb3ee896e",
    trackedFileCount: 116,
    trackedBlobBytes: 2650442,
    extractedFileManifestHash: "b5761d2fa1f1cb155696f1a145888ffbf1718c38113b38c439e9d9a8974a55ca",
    readOnlyPath: "vendor/sc-tmg-expo-baseline-f07b3cb",
    productRole: "web_app_ux_and_native_capability_baseline_only",
    authority: false,
  },
  productSurfaces: {
    expo: {
      role: "canonical_player_product_shell_for_web_android_and_ios",
      preserve: [
        "database_browser",
        "army_builder_workflow",
        "tools",
        "mobile_navigation_and_safe_areas",
        "bilingual_product_experience",
        "native_clipboard_haptics_deep_links_sharing_and_offline_storage",
      ],
      cannotOwn: ["rules_legality", "room_state", "journal", "rng", "source_truth", "training_truth"],
    },
    battleLab: {
      role: "developer_referee_agent_observability_surface",
      preserve: [
        "battlefield_diagnostics",
        "legal_action_inspection",
        "preview_and_receipt_inspection",
        "coach_and_agent_trace_panels",
        "replay_and_source_diagnostics",
      ],
      cannotOwn: ["rules_legality", "room_state", "whole_state_replace", "client_drag_mutation", "training_truth"],
    },
    capacitor: {
      role: "none",
      decision: "rejected_no_third_client_lifecycle_because_expo_already_targets_web_android_and_ios",
    },
  },
  sharedModule: {
    name: "Client Domain Module",
    seam: "packages/client-domain",
    depthIntent: "hide_transport_cache_revision_reconnect_projection_and_receipt_complexity_behind_one_intent_interface",
    interface: {
      methods: [
        "bootstrap(route_and_principal_context)",
        "read()",
        "dispatch(typed_client_intent)",
        "subscribe(listener)",
      ],
      emits: [
        "viewer_scoped_client_projection",
        "typed_pending_or_rejection",
        "authoritative_receipt_reference",
        "connectivity_and_recovery_status",
      ],
      neverAccepts: [
        "whole_game_state",
        "caller_declared_side_or_role",
        "unchecked_action",
        "confirmed_boolean",
        "client_rng",
        "rules_or_source_override",
        "provider_credential",
      ],
    },
    internalPorts: [
      {
        name: "AuthoritativeTransportPort",
        implementations: ["http_authoritative_adapter", "in_memory_verifier_adapter"],
      },
      {
        name: "ProjectionStorePort",
        implementations: ["async_storage_adapter", "in_memory_verifier_adapter"],
      },
      {
        name: "LifecyclePort",
        implementations: ["expo_app_state_adapter", "browser_visibility_verifier_adapter"],
      },
    ],
    sharedContracts: [
      "room_and_seat_locator",
      "viewer_scoped_room_projection",
      "legal_space_and_parameter_domain",
      "proposal_preview_confirmation_and_apply",
      "journal_and_replay_projection",
      "official_source_and_localization_view",
      "character_persona_and_dynamic_portrait_view",
      "agent_harness_trace_view",
    ],
  },
  ownership: {
    authoritativeRulesAndState: "server_referee_only",
    authoritativeJournal: "server_room_store_only",
    officialSourceAndCanonicalText: "source_localization_runtime_only",
    agentSessionModeToolsAndVisibility: "server_character_agent_runtime_only",
    uiSelectionFocusAndPanelLayout: "surface_local_ephemeral",
    languageThemeAccessibilityAndLastViewedPersona: "platform_local_preference",
    armyAndSetupDrafts: "client_draft_until_server_validation_and_room_binding",
    cachedRoomData: "viewer_scoped_client_projection_only",
  },
  platformAdapters: {
    web: [
      "indexed_or_async_storage_projection_cache",
      "history_and_url_adapter",
      "browser_visibility",
      "web_share_and_clipboard",
    ],
    app: [
      "async_storage_projection_cache",
      "expo_router_deep_links",
      "secure_session_credential_ingress",
      "app_state_lifecycle",
      "native_share_clipboard_and_haptics",
    ],
    battleLab: [
      "diagnostic_projection_renderer",
      "referee_and_agent_trace_renderer",
      "legacy_sandbox_locator_adapter",
    ],
    restrictions: [
      "adapters_do_not_evaluate_legality",
      "adapters_do_not_advance_state_revision",
      "adapters_do_not_create_seat_grants_or_control_leases",
      "adapters_do_not_persist_provider_credentials_in_projection_cache",
    ],
  },
  compatibility: {
    asyncStorage: {
      preferenceRecords: "versioned_import_allowed",
      armyRecords: "import_as_untrusted_draft_then_validate_against_current_official_dataset",
      matchRecords: "read_only_legacy_timeline_import_never_room_state_restore",
      bundledOrFirestoreData: "display_only_import_never_source_authority",
      unknownRecords: "quarantine_with_hash_and_reason",
      silentUpgrade: false,
    },
    roomUrls: {
      behavior: "parse_to_room_locator_then_exchange_for_current_server_issued_capability",
      ignoredClaims: ["side", "role", "base_url_authority", "revision", "confirmation"],
      rawSecretsPersisted: false,
    },
    generatedArtifacts: {
      behavior: "content_hash_build_receipt_and_dependency_manifest_required",
      runtimeAuthority: false,
      historicalApk: "behavioral_evidence_only_never_edit_source_or_authority",
    },
  },
  delivery: {
    productMountReady: false,
    webBuildVerified: false,
    browserEvidenceVerified: false,
    nativeBuildVerified: false,
    nativeDeviceEvidenceVerified: false,
    battleLabSharedModuleMounted: false,
    firstAuthoritativeClientActionVerified: false,
  },
  ticket14Slices: [
    { slice: 128, scope: "baseline_and_shared_boundary", status: "complete_when_verifier_passes" },
    { slice: 129, scope: "client_domain_module_and_transport_store_adapters", status: "planned" },
    { slice: 130, scope: "tracked_expo_product_shell_and_shared_module_mount", status: "planned" },
    { slice: 131, scope: "room_route_seat_recovery_invite_and_control_lease", status: "planned" },
    { slice: 132, scope: "authoritative_battlefield_legal_preview_confirm_apply_replay", status: "planned" },
    { slice: 133, scope: "character_persona_dynamic_portrait_and_adjutant_panel_mount", status: "planned" },
    { slice: 134, scope: "official_source_localization_army_draft_and_offline_compatibility_import", status: "planned" },
    { slice: 135, scope: "battle_lab_shared_module_observer_and_referee_mount", status: "planned" },
    { slice: 136, scope: "web_static_build_browser_accessibility_offline_and_deep_link_evidence", status: "planned" },
    { slice: 137, scope: "native_android_ios_build_and_real_device_evidence", status: "planned" },
    { slice: 138, scope: "cross_surface_migration_security_aggregate_and_ticket15_handoff", status: "planned" },
  ],
  authority: {
    canOverrideRules: false,
    canMutateRoomWithoutRefereeReceipt: false,
    canCreateSourceTruth: false,
    canCreateTrainingTruth: false,
    canRunProvider: false,
    canGenerateSkill: false,
    canRunDsh: false,
  },
};

export const STARCRAFT_TMG_SHARED_WEB_APP_BOUNDARY_V1 = Object.freeze({
  ...unsigned,
  boundaryHash: hashStarcraftTmgContract(unsigned),
});
