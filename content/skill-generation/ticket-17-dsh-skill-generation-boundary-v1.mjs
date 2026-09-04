import { STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_CLOSURE_V1 } from
  "../provider/ticket-16-live-provider-closure-v1.mjs";
import { STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1 } from
  "../../packages/client-domain/official-faq-current-client-contract-v1.mjs";
import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../../packages/source-data/official-development-tranche-source-lock-v1.mjs";
import { STARCRAFT_TMG_DSH_BASELINE_V1 } from
  "../../packages/skill-generation/contracts-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_17_dsh_skill_generation_boundary_v1",
  ticket: 17,
  slice: 163,
  preparedAt: "2026-09-04T12:00:00.000Z",
  predecessor: {
    ticket: 16,
    contractHash: STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_CLOSURE_V1.contractHash,
    directProviderLiveAccepted: true,
    credentialReuseAllowed: false,
  },
  objective:
    "run_a_pinned_dsh_arm_only_for_offline_starcraft_skill_candidates_and_compare_it_fairly_with_a_dsh_off_direct_provider_control",
  denominator: {
    totalSlices: 9,
    firstSlice: 163,
    lastSlice: 171,
    completedBeforeThisSlice: 0,
    largeScaleSkillProductionRequiresSeparateUserConfirmation: true,
  },
  officialSourceBoundary: {
    sourceRefreshPerformed: false,
    refreshPolicy: "explicit_user_command_only",
    commandCenterVersions: { units: "71", cards: "69", rules: "48" },
    commandCenter: {
      sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
      sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
      datasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    },
    currentFaq: {
      rulesVersion: STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1.rulesVersion,
      sourceLockHash: STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1.sourceLockHash,
      reconciliationHash: STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1.reconciliationHash,
      aggregateHash: STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1.aggregateHash,
      catalogueHash: STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1.catalogueHash,
      runtimeHash: STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1.runtimeHash,
      graphHash: STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1.graphHash,
      counts: { ...STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1.counts },
    },
    historicalRules: {
      retainedForDisplayAndPinnedReplay: true,
      silentlyUpgraded: false,
      maySeedCurrentSkillCandidate: false,
    },
    stagedEvidencePolicy: [
      "use_only_hash_verified_current_official_snapshots_and_current_rules_projections",
      "stage_minimal_source_excerpts_locators_rule_atoms_and_rules_service_receipts",
      "never_mount_the_source_registry_or_rules_runtime_as_mutable_worker_state",
      "generated_or_community_material_is_advisory_and_never_rule_truth",
      "candidate_claims_must_bind_a_staged_source_or_an_executable_rules_receipt",
    ],
  },
  dshBaseline: {
    packageName: STARCRAFT_TMG_DSH_BASELINE_V1.packageName,
    version: STARCRAFT_TMG_DSH_BASELINE_V1.version,
    commit: STARCRAFT_TMG_DSH_BASELINE_V1.commit,
    maturity: STARCRAFT_TMG_DSH_BASELINE_V1.maturity,
    npmDistTagAtAudit: "latest",
    npmIntegrity:
      "sha512-UP1UIh6q3Gme/yXRn/QL2P8IsVlv8Shpg22TRJIZPsCRWLm4CBiA1MUvXmJAfsOEETBMLAl+xWPtFw6ICsN3wg==",
    officialRepository: "https://github.com/deepseek-ai/deepseek-harness",
    auditedAt: "2026-09-04",
    registryObservation: {
      latest: "0.1.1-rc.2",
      next: "0.1.2-rc.1",
      nextCommit: "a66e4702047846cdaa10c66c9d3df3951f5ea70d",
      masterCommit: "76fda729799fe9b3848dbe2c211d4b231032b81e",
    },
    selectionPolicy:
      "pin_the_audited_npm_latest_release_and_never_follow_next_alpha_master_or_latest_at_execution_time",
    updatePolicy:
      "a_new_dsh_version_requires_a_new_integrity_lock_config_audit_session_replay_and_explicit_migration",
  },
  hostIsolationObservation: {
    observedAt: "2026-09-04",
    host: "darwin_x86_64",
    node: "24.14.0",
    dockerCliPresent: true,
    dockerDaemonAvailable: false,
    macosSandboxExecPresent: true,
    observationIsNotRunAuthority: true,
    acceptedM1Path:
      "an_os_enforced_disposable_runner_only_after_behavioral_file_process_and_network_denial_tests",
    acceptedProductionPath: "disposable_container_or_microvm",
    absencePolicy: "fail_closed_without_falling_back_to_an_unsandboxed_child_process",
  },
  currentStarcraftAudit: {
    frozenInputs: [
      { path: "packages/skill-generation/contracts-v1.mjs", sha256: "48ee324584d1943e4018704a979ab103903b2a76048120cdd90bc5a6505c219c" },
      { path: "packages/skill-generation/experiment-contracts-v1.mjs", sha256: "def80488fd00b3bb08b418f39fe1d6f6e10e718401f5ac905c53d7ce3387cdff" },
      { path: "packages/skill-generation/in-memory-scheduler-v1.mjs", sha256: "a9061513e63dd45a78cac22e9abe24d54cfe372ce1b006e342f0ad65960c89ef" },
      { path: "packages/skill-generation/offline-arm-adapter-v1.mjs", sha256: "cf8302da258b988e5d51623192355938522892c97dbee5ca5bf26a79a4d51185" },
      { path: "packages/skill-generation/promotion-v1.mjs", sha256: "e56cce1ecbb5044f11aabd202ec8ab03ac42376104b8f7367a22528b106a2353" },
      { path: "scripts/verify-offline-skill-arms-v1.mjs", sha256: "cfae7b1f5078f9634d17cbb805c206232a7af70808f5afa2c18aca57b33bf2f4" },
    ],
    reusable: [
      "sealed_job_candidate_and_run_receipt_shapes",
      "paired_dsh_and_direct_provider_arm_identity",
      "exactly_one_emit_candidate_skill_contract",
      "candidate_judge_tests_unresolved_claims_and_promotion_blockers",
      "default_false_rules_promotion_and_training_authority",
    ],
    provenOnlyAsScaffold: [
      "both_execution_ports_are_injected_fake_executors",
      "source_input_is_the_legacy_unreviewed_pack_instead_of_the_current_official_faq_rules_chain",
      "no_dsh_package_profile_effective_config_or_session_event_log_exists",
      "no_real_provider_attempt_or_same_model_paired_result_exists",
      "credential_scan_is_not_the_ticket_16_multi_encoding_redaction_gate",
      "the_process_memory_scheduler_and_promotion_module_are_ticket_18_scaffolds_not_production_authority",
    ],
    migrationPolicy: {
      modifyFrozenScaffoldInSlice163: false,
      silentlyRelabelScaffoldAsComplete: false,
      preserveScaffoldAsRegressionEvidence: true,
      newRuntimeOwner: "packages/skill-generation-runtime",
    },
  },
  mtlLineage: {
    repository: "https://github.com/ruarualoud/project-d-maze-tower-league",
    branch: "codex/mtl-character-agent-repair",
    commit: "50ef5c29c655c015335d76e78fb4a0ecb442252f",
    inspectedInputs: [
      { path: "packages/maze-tower-league-skill-lab/dsh-role-provider-v1.mjs", sha256: "e44ba965aed329415fda532815d5b194eac592d75078f91e08825fb7c569a520" },
      { path: "packages/maze-tower-league-skill-lab/dsh-skill-role-profile-v1.yml", sha256: "bc37db90e792107fa7982d2b7a682132cb55b38cd8463036fa311196a1e72d49" },
      { path: "packages/maze-tower-league-skill-lab/provider-ctx2skill-v1.mjs", sha256: "6b8289b46f1eed976cbe813e25c441bfc6f8ea968ac764da1583d3f46e5edcc8" },
      { path: "packages/maze-tower-league-skill-lab/deepseek-harness-execution-profile-v1.json", sha256: "bc1ffb2cf40ca391c7509a6045ee31b02d233dc5e4f7f63b328a04f19e6ca1dc" },
      { path: "docs/maze-tower-league-skill-background-service-v1.md", sha256: "36cf81af0f3f9b30d5618fd0d2cbaa99df8eabaeea769f3cbcc05c8e0c030c5f" },
      { path: "docs/project-d-level3-wargame-platform-standard-template-v1.md", sha256: "84f68baad60ccd4f6370f1a04b20c95696ff4660331cecca7bd961750a72fbab" },
    ],
    adopted: [
      "teach_then_ctx2skill_role_separation",
      "registered_exact_source_quote_or_rule_receipt_binding",
      "challenger_reasoner_judge_proposer_generator_and_cross_time_roles",
      "candidate_parent_chain_and_explicit_correction_targets",
      "content_addressed_human_readable_and_machine_readable_candidate_artifacts",
      "no_automatic_rules_or_training_truth_promotion",
    ],
    rejectedOrReplaced: [
      "inherit_the_complete_parent_process_environment",
      "pass_the_raw_provider_key_directly_in_the_dsh_environment",
      "treat_headless_stdout_as_the_only_candidate_submission_channel",
      "disable_session_persistence_while_claiming_a_replayable_dsh_run",
      "report_usage_and_attempts_as_unavailable_zeroes",
      "run_from_a_repository_mounted_non_disposable_home",
      "treat_dsh_file_permissions_as_network_or_process_isolation",
      "copy_the_inconsistent_0_1_0_rc_7_declaration_manifest",
      "perform_internal_multi_round_retry_outside_scheduler_authority",
    ],
    codeCopied: false,
  },
  skillFamilies: [
    {
      family: "how_to_play",
      purpose: "turn_flow_resources_legality_and_general_win_conditions",
      cardinality: "one_or_more_versioned_curricula_per_format",
    },
    {
      family: "mission",
      purpose: "mission_deployment_scoring_and_end_game_plans",
      cardinality: "registry_driven_from_the_current_official_mission_catalogue",
    },
    {
      family: "faction",
      purpose: "own_faction_roster_unit_roles_upgrades_and_synergies",
      cardinality: "registry_driven_from_current_official_factions_and_public_roster_archetypes",
    },
    {
      family: "matchup",
      purpose: "directed_own_faction_or_archetype_against_public_opponent_archetype",
      cardinality: "registry_driven_directed_pairs_not_a_fixed_handwritten_limit",
    },
  ],
  roleWorkflow: {
    generationRoles: [
      "planner", "tutor", "student", "challenger", "reasoner",
      "fact_judge", "proposer", "generator", "cross_time_gate",
    ],
    dshMayExecuteRolesOnlyInsideOfflineSkillJobs: true,
    liveAgentMayGenerateOrMutateSkills: false,
    rulesAndExecutableReceiptsBeatModelClaims: true,
    correctionPolicy:
      "failed_claims_become_explicit_versioned_revision_targets_for_ticket_18_scheduler_rounds",
  },
  armParity: {
    arms: ["dsh", "direct_provider_control"],
    identical: [
      "model_and_provider_profile",
      "staged_input_and_existing_skill_snapshot",
      "role_prompt_and_output_schema",
      "read_only_tool_capabilities",
      "provider_attempt_token_cost_and_wall_budgets",
      "candidate_contract_and_external_judges",
    ],
    allowedDifferences: [
      "dsh_runtime_and_effective_profile",
      "dsh_session_event_log",
      "harness_internal_tool_loop_trace",
    ],
    qualityClaimBeforePairedEvaluation: "unknown",
  },
  authority: {
    dshScope: "offline_skill_candidate_generation_only",
    dshMayAccessOnlineAgentSessions: false,
    dshMayAccessRooms: false,
    dshMayAccessRulesMutation: false,
    dshMayPublishSkills: false,
    dshMayWriteMemory: false,
    dshMayWriteTrainingTruth: false,
    directControlMayPublishSkills: false,
    candidateDefaults: {
      humanReviewed: false,
      canAffectStrategy: false,
      canAffectRules: false,
      promotionEligible: false,
      trainingTruth: false,
    },
  },
  ticket18Boundary: {
    ownsLater: [
      "persistent_sqlite_and_postgresql_skill_scheduler",
      "leases_fencing_wal_crash_recovery_and_global_budget",
      "independent_fact_semantic_heldout_cross_time_and_paired_gates",
      "multi_round_correction_and_stopping_policy",
      "administrator_promotion_registry_pointer_cas_and_rollback",
    ],
    ticket17MustNotClaim: [
      "durable_background_service",
      "automatic_candidate_promotion",
      "published_runtime_skill_snapshot",
      "large_scale_skill_catalogue",
      "skill_effectiveness_in_complete_self_play_games",
    ],
  },
  slices: [
    { slice: 163, name: "boundary_source_and_denominator_freeze", status: "complete_in_this_change", dependencies: [162] },
    { slice: 164, name: "current_official_staged_evidence_and_four_family_curriculum", status: "planned", dependencies: [163] },
    { slice: 165, name: "teach_ctx2skill_role_graph_and_candidate_emission_contract", status: "planned", dependencies: [164] },
    { slice: 166, name: "disposable_os_isolation_and_capability_firewall", status: "planned", dependencies: [165] },
    { slice: 167, name: "pinned_dsh_install_profile_config_and_session_parser", status: "planned", dependencies: [166] },
    { slice: 168, name: "shared_provider_broker_and_direct_control_executor_parity", status: "planned", dependencies: [167] },
    { slice: 169, name: "real_dsh_executor_candidate_tool_and_safe_run_receipt", status: "planned", dependencies: [168] },
    { slice: 170, name: "one_bounded_real_paired_generation_and_blind_quality_report", status: "planned", dependencies: [169] },
    { slice: 171, name: "adversarial_aggregate_closure_and_ticket18_handoff", status: "planned", dependencies: [170] },
  ],
  liveAcceptance: {
    firstExternalProviderSlice: 170,
    runCount: "one_dsh_and_one_direct_control_generation_for_one_frozen_how_to_play_task",
    countsAsLargeScaleProduction: false,
    credentialPolicy:
      "fresh_local_secure_ingress_only_never_chat_never_reuse_the_detached_ticket_16_credential",
    authorizationPolicy:
      "the_predeclared_bounded_pair_is_allowed_but_any_family_batch_or_catalogue_production_requires_new_user_confirmation",
    outputStatus: "unreviewed_candidate_only",
  },
  harnessEvidence: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["rule_skill_builder_prompt"],
    harnessToolsCalled: [],
    uiTraceEvidence: null,
    agentDecisionEvidence: null,
    memoryTraceEvidence: { refs: [], writes: 0 },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "missing_os_isolation_blocks_dsh_execution",
      "package_profile_or_effective_config_drift_blocks_dsh_execution",
      "missing_or_unredacted_session_evidence_blocks_candidate_acceptance",
      "dsh_quality_is_unknown_until_the_predeclared_paired_gate_finishes",
      "no_candidate_can_be_published_by_ticket_17",
    ],
    userVisibleChecks: [],
  },
  runTruth: {
    sourceRefreshPerformed: false,
    dshInstalled: false,
    dshRun: false,
    externalProviderCalled: false,
    skillCandidateGenerated: false,
    skillPromoted: false,
    memoryWritten: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_17_DSH_SKILL_GENERATION_BOUNDARY_V1 = freeze({
  ...body,
  boundaryHash: hashStarcraftTmgContract(body),
});
