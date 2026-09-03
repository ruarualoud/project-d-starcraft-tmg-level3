import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_PROVIDER_ATTEMPT_STORE_POSTGRES_V1 as predecessor } from
  "./ticket-16-provider-attempt-store-postgres-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_16_durable_provider_gateway_v1",
  ticket: 16,
  slice: 159,
  preparedAt: "2026-09-04T08:00:00.000Z",
  predecessorContractHash: predecessor.contractHash,
  objective:
    "compose_ticket_15_gateway_prompt_artifact_isolated_worker_durable_budget_and_safe_provider_receipt",
  mtlSchedulingLineage: {
    repository: "https://github.com/ruarualoud/project-d-maze-tower-league",
    branch: "codex/mtl-character-agent-repair",
    commit: "50ef5c29c655c015335d76e78fb4a0ecb442252f",
    inspectedModules: [
      "packages/maze-tower-league-selfplay/provider-step-wal-v1.mjs",
      "packages/maze-tower-league-selfplay/persistent-scheduler-v1.mjs",
      "docs/project-d-level3-wargame-platform-standard-template-v1.md",
    ],
    requiredSequence: [
      "persist_intent_and_maximum_budget_reservation",
      "commit_dispatch_authority_before_side_effect",
      "execute_once_without_internal_provider_retry",
      "persist_safe_receipt_and_terminal_budget_atomically",
      "recover_or_replay_by_idempotency_and_revision_fence",
      "replan_only_after_explicit_approval_when_outcome_is_ambiguous",
    ],
    appliesToAgentModes: [
      "tutor", "opponent", "commentator", "companion",
      "offline_skill_generation", "self_play", "muzero_export",
    ],
    starcraftAuthorityDifferences: [
      "online_roles_are_read_only_except_opponent_preview_with_human_confirmed_apply",
      "online_retry_requires_same_authenticated_user_not_selfplay_administrator",
      "online_provider_has_zero_automatic_retry_and_zero_schema_repair",
      "dsh_is_offline_skill_generation_only",
    ],
    copiedCode: false,
  },
  composition: {
    publicGatewayInputUnchanged: true,
    gatewayInvocationScope:
      "async_local_server_call_scope_wrapping_the_frozen_ticket_15_supervisor",
    internalExecutionAuthority: [
      "room", "session", "session_binding", "principal_scope",
      "connection_epoch", "budget_policy", "budget_opened_at",
    ],
    promptResolution:
      "ephemeral_hash_bound_artifact_resolved_before_reservation_and_released_by_role_context",
    attachmentResolution:
      "authenticated_internal_execution_binding_to_current_profile_and_live_worker",
    durableStoreAdapters: ["sqlite_m1", "postgresql_production"],
    dispatchAuthority:
      "worker_complete_is_illegal_until_committed_dispatch_result_is_observed",
    terminalAuthority:
      "output_is_not_returned_until_safe_receipt_and_budget_settlement_commit_is_observed",
    automaticProviderRetries: 0,
    automaticSchemaRepairs: 0,
    exactStoreCommitObservationReplays: 1,
    legacySupervisorFailureEnvelope:
      "conservative_full_reservation_non_authoritative_for_durable_accounting",
  },
  settlement: {
    success: "reported_input_plus_output_units",
    definitelyNotSent: "zero_charge_with_safe_failure_receipt_hash",
    mayHaveBeenSent: "full_reservation_charge_with_safe_failure_receipt_hash",
    cancelOrTimeoutAfterDispatch: "unknown_usage_full_reservation",
    unsafeResultOrUsage: "reject_output_and_consume_full_reservation",
    persistedProviderData: [
      "safe_provider_receipt_hash", "reported_usage", "terminal_status",
    ],
    forbiddenPersistence: [
      "credential", "raw_prompt", "raw_provider_output", "raw_provider_headers",
    ],
  },
  recovery: {
    startup: "explicit_recovery_before_execution",
    reserved: "abandoned_before_egress_zero_charge",
    dispatched: "ambiguous_full_reservation_charge",
    ambiguousRetry:
      "same_user_signed_approval_fresh_reattach_and_one_new_attempt_only",
    automaticReplan: false,
  },
  acceptance: {
    verifier: "scripts/verify-ticket-16-durable-provider-gateway-runtime-v1.mjs",
    fixedAssertions: 36,
    realSqliteFilesRequired: true,
    deterministicIsolatedWorkerRequired: true,
    allFourOnlineModesRequired: true,
    crashAndCommitAcknowledgementLossRequired: true,
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
    uiTraceEvidence: "not_run_backend_execution_slice",
    agentDecisionEvidence:
      "four_role_routes_share_execution_sequence_but_quality_is_not_claimed",
    memoryTraceEvidence: {
      refs: [], writes: 0, crossModeIsolationChecked: true,
    },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "reject_prompt_profile_attachment_session_or_budget_binding_drift",
      "never_egress_before_dispatch_commit",
      "never_return_output_before_terminal_receipt_commit",
      "recover_open_dispatch_as_ambiguous_without_retry",
    ],
    userVisibleChecks: "reserved_for_slice_160",
  },
  runTruth: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    userCredentialAccepted: false,
    deterministicSyntheticCredentialOnly: true,
    realPostgresServerUsed: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_16_DURABLE_PROVIDER_GATEWAY_V1 = freeze({
  ...body,
  contractHash: hashStarcraftTmgContract(body),
});
