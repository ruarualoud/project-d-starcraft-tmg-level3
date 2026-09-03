import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_SECURE_BYOK_CONSENT_V1 as predecessor } from
  "./ticket-16-secure-byok-consent-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_16_credential_worker_isolation_v1",
  ticket: 16,
  slice: 155,
  preparedAt: "2026-09-04T00:00:00.000Z",
  predecessorContractHash: predecessor.contractHash,
  objective:
    "one_scrubbed_child_process_per_credential_attachment_with_bounded_ipc_zeroization_and_no_provider_or_agent_capability",
  mtlSchedulingReference: {
    repository: "https://github.com/ruarualoud/project-d-maze-tower-league",
    branch: "codex/mtl-character-agent-repair",
    commit: "50ef5c29c655c015335d76e78fb4a0ecb442252f",
    exactInputs: [
      {
        path: "docs/project-d-level3-wargame-platform-standard-template-v1.md",
        sha256: "84f68baad60ccd4f6370f1a04b20c95696ff4660331cecca7bd961750a72fbab",
      },
      {
        path: "packages/maze-tower-league-selfplay/provider-isolation-supervisor-v1.mjs",
        sha256: "8403db88cddba9e5175f9dc1a57c23cb6c3c8b046b7b5e91a631c7530990e4e6",
      },
      {
        path: "packages/maze-tower-league-selfplay/provider-workflow-agent-worker-v1.mjs",
        sha256: "bad5181e64c604a1c2757aaa7b60fc060ec8bf7744c63d06b76c03361935b46c",
      },
      {
        path: "packages/maze-tower-league-selfplay/provider-credential-broker-child-v1.mjs",
        sha256: "bb9c16e55746b3e43eb97964f2ceb9faeb96a5a72f5573ff74fb0d9fd443c43b",
      },
      {
        path: "packages/maze-tower-league-selfplay/provider-step-wal-v1.mjs",
        sha256: "edbfa3a4d2cbfe1d694ebe4abc4d72cadf87477f7e7b5ce54bd71d12c75452ce",
      },
    ],
    adoptedSchedulingFlow: [
      "freeze_a_content_addressed_harness_instead_of_scattered_runtime_flags",
      "isolate_each_agent_session_and_credential_broker_with_parent_mediated_ipc",
      "keep_credential_and_broker_capability_out_of_agent_rules_room_skill_and_memory_inputs",
      "bind_every_decision_to_seat_or_principal_state_revision_and_legalspace_hash",
      "use_bounded_workflow_start_continue_close_sessions_and_tool_budgets",
      "reuse_deterministic_plan_atoms_only_after_current_preview_and_history_revalidation",
      "stop_and_replan_at_random_opponent_reaction_or_state_drift_boundaries",
      "record_safe_provider_attempt_usage_tool_and_recovery_receipts",
      "never_promote_harness_or_skill_without_replay_isolation_and_held_out_evidence",
    ],
    starcraftAdaptations: [
      "online_tutor_opponent_commentator_and_companion_have_separate_context_and_tool_capabilities",
      "only_opponent_may_select_a_current_enabled_legalspace_candidate",
      "no_online_agent_may_confirm_apply_or_batch_replay_a_provider_authored_plan",
      "human_human_mode_never_schedules_a_model",
      "dsh_is_reserved_for_offline_skill_generation_only",
      "selfplay_workers_and_muzero_export_remain_later_tickets",
      "one_credential_child_is_bound_to_one_authenticated_attachment_not_one_mtl_seat",
    ],
    copiedCode: false,
  },
  workerPort: {
    version: "starcraft_tmg_credential_worker_port_v1",
    operations: [
      "attachCredential",
      "detachCredential",
      "readWorkerState",
      "close",
    ],
    processGranularity: "one_child_per_attachment",
    processLaunch: {
      executable: "current_node_exec_path",
      shell: false,
      environment: ["NODE_NO_WARNINGS"],
      standardIo: ["ignore", "ignore", "ignore", "ipc"],
      serialization: "advanced",
    },
    activeCapacityIsBounded: true,
    automaticRestartAllowed: false,
    automaticProviderRetryAllowed: false,
    unexpectedExitIsObservable: true,
    gracefulShutdownFallsBackToSigkill: true,
  },
  childBoundary: {
    version: "starcraft_tmg_credential_worker_child_v1",
    acceptedMessages: ["initialize_once", "shutdown_once"],
    initializeFields: [
      "requestId",
      "attachmentId",
      "server_owned_safe_profile_binding",
      "bounded_credential_buffer",
    ],
    secretLifetime:
      "child_buffer_from_initialize_until_shutdown_disconnect_signal_or_process_exit",
    sourceBufferZeroedAfterCopy: true,
    parentBufferZeroedAfterAckFailureOrEarlyRejection: true,
    credentialOrHashReturnedOverIpc: false,
    providerTransportMounted: false,
    networkRequestMade: false,
    imports: {
      rules: false,
      room: false,
      agent: false,
      skills: false,
      memory: false,
      dsh: false,
      providerTransport: false,
    },
  },
  isolationLimits: {
    processIsolationIsNotAnOsSandbox: true,
    egressDeniedByAbsenceInThisSlice: true,
    egressAllowlistOwnedBySlice: 156,
    crashStatusCompositionOwnedBySlice: 159,
    webProductControlsOwnedBySlice: 160,
    realCredentialRequired: false,
    externalProviderCallRequired: false,
  },
  authority: {
    rulesOwner: "rules_service",
    roomOwner: "room_runtime",
    confirmationOwner: "non_model_controller",
    workerMayReadRoomOrLegalSpace: false,
    workerMaySelectCandidate: false,
    workerMayConfirmOrApply: false,
    workerMayGenerateSkills: false,
    dshAllowed: false,
    trainingTruth: false,
  },
  harnessEvidence: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: [],
    uiTraceEvidence: "not_run_backend_process_isolation_slice",
    agentDecisionEvidence: null,
    memoryTraceEvidence: {
      refs: [],
      writes: 0,
      crossModeIsolationChecked: false,
    },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "kill_and_reject_a_worker_that_fails_or_pollutes_initialization_acknowledgement",
      "never_restart_a_credential_worker_or_retry_a_provider_call_automatically",
      "mark_unexpected_exit_as_credential_loss_and_require_explicit_reattachment",
      "retain_ticket_15_injected_gateway_until_live_acceptance",
    ],
    userVisibleChecks: "not_run_until_slice_160",
  },
  acceptance: {
    verifier: "scripts/verify-ticket-16-credential-worker-isolation-v1.mjs",
    fixedAssertions: 25,
    realApiKeyRequired: false,
    syntheticCredentialOnly: true,
    actualChildProcessesRequired: true,
    externalProviderCallRequired: false,
  },
  runTruth: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    userCredentialAccepted: false,
    syntheticCredentialExercised: true,
    childProcessesSpawned: true,
    providerTransportMounted: false,
    networkRequestMade: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_16_CREDENTIAL_WORKER_ISOLATION_V1 = freeze({
  ...body,
  contractHash: hashStarcraftTmgContract(body),
});
