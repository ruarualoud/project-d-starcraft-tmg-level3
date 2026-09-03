import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_PROVIDER_ATTEMPT_STORE_SQLITE_V1 as predecessor } from
  "./ticket-16-provider-attempt-store-sqlite-v1.mjs";
import { STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_SCHEMA_FINGERPRINT_HASH } from
  "../../packages/secure-provider-runtime/postgres-provider-attempt-store-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_16_provider_attempt_store_postgres_v1",
  ticket: 16,
  slice: 158,
  preparedAt: "2026-09-04T04:00:00.000Z",
  predecessorContractHash: predecessor.contractHash,
  objective:
    "production_postgresql_parity_concurrency_crash_recovery_and_signed_same_user_retry_composition",
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
    appliesToLaterStarcraftAgentModes: [
      "online_tutor",
      "online_opponent",
      "online_commentator",
      "online_companion",
      "offline_skill_generation",
      "skill_scheduler",
      "self_play",
      "muzero_export",
    ],
    starcraftDifferences: [
      "online_retry_approval_is_same_authenticated_user_not_selfplay_administrator",
      "online_provider_execution_has_zero_schema_repair_and_zero_automatic_retry",
      "dsh_is_restricted_to_offline_skill_generation",
      "opponent_actions_still_require_legal_preview_human_confirm_apply_and_receipt",
    ],
    copiedCode: false,
  },
  externalStandards: [
    {
      owner: "PostgreSQL Global Development Group",
      title: "PostgreSQL 18 transaction isolation",
      url: "https://www.postgresql.org/docs/current/transaction-iso.html",
      use: "serializable_transactions_and_explicit_serialization_failure",
    },
    {
      owner: "PostgreSQL Global Development Group",
      title: "PostgreSQL 18 explicit locking",
      url: "https://www.postgresql.org/docs/current/explicit-locking.html",
      use: "budget_attempt_and_audit_head_select_for_update_locks",
    },
    {
      owner: "PostgreSQL Global Development Group",
      title: "PostgreSQL 18 INSERT",
      url: "https://www.postgresql.org/docs/current/sql-insert.html",
      use: "unique_idempotency_and_on_conflict_schema_meta_creation",
    },
  ],
  adapter: {
    commonStoreContract: "starcraft_tmg_provider_attempt_store_v1",
    version: "starcraft_tmg_postgres_provider_attempt_store_v1",
    schemaFingerprintHash:
      STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_SCHEMA_FINGERPRINT_HASH,
    poolOwnership: "injected_pool_with_explicit_closePoolOnClose_option",
    transactionIsolation: "serializable",
    rowLocks: ["budget_for_update", "attempt_for_update", "audit_head_for_update"],
    advisoryMigrationLock: true,
    compareAndSwap: ["budget_revision", "attempt_revision"],
    databaseRetries: 0,
    providerRetries: 0,
    schemaTypes: ["jsonb", "timestamptz", "bigint", "boolean"],
    exactColumnLayoutRequired: true,
    silentCompatibility: false,
  },
  concurrencyAndCrashWindows: {
    concurrentReservation:
      "serializable_budget_row_lock_and_revision_cas_allow_one_winner_for_one_revision",
    preCommitFailure: "rollback_attempt_budget_and_audit_as_one_unit",
    commitAcknowledgementLoss:
      "caller_receives_no_egress_authority_until_exact_idempotent_result_is_observed",
    dispatchCommitAcknowledgementLoss:
      "replay_same_dispatch_hash_to_observe_committed_egress_authority",
    recoveryCommitAcknowledgementLoss:
      "replay_same_recovery_hash_without_double_charge",
    serializationFailure:
      "typed_conflict_returned_to_supervisor_with_zero_internal_transaction_retry",
  },
  ambiguousRetry: {
    approvalProof: [
      "canonical_content_hash",
      "ed25519_long_term_signature",
      "hmac_sha256_short_term_seal",
    ],
    approvalBinding: [
      "budget",
      "ambiguous_attempt",
      "principal_scope",
      "session_binding",
      "new_reservation_idempotency",
    ],
    executionRequirements: [
      "current_short_seal_and_expiry",
      "approval_issued_after_ambiguity",
      "fresh_authenticated_attached_credential_projection",
      "same_provider_profile",
      "exact_original_request_prompt_response_intent_and_unit_bounds",
      "one_child_retry_lineage",
      "new_reservation_commits_without_egress_authority",
    ],
    longTermReplay:
      "ed25519_historical_verification_survives_hmac_rotation_but_cannot_authorize_execution",
    storePersistence:
      "approval_and_reattachment_hashes_only_no_signed_receipt_context_or_secret",
  },
  acceptance: {
    verifier: "scripts/verify-ticket-16-provider-attempt-store-postgres-v1.mjs",
    fixedAssertions: 42,
    sqliteAndPostgresSemanticHashParityRequired: true,
    twoConnectionReservationRaceRequired: true,
    rollbackAndCommitAcknowledgementLossRequired: true,
    signedApprovalRotationAndTamperRequired: true,
    deterministicPostgresProtocolDoubleRequired: true,
    realPostgresServerRequiredThisSlice: false,
    productionPoolAdapterRequired: true,
    externalProviderCallRequired: false,
    realApiKeyRequired: false,
  },
  harnessEvidence: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: [],
    uiTraceEvidence: "not_run_backend_persistence_and_recovery_slice",
    agentDecisionEvidence: null,
    memoryTraceEvidence: { refs: [], writes: 0, crossModeIsolationChecked: false },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "never_retry_a_serialization_failure_inside_the_adapter",
      "never_return_egress_authority_before_dispatch_commit_is_observed",
      "rollback_every_partial_attempt_budget_or_audit_write",
      "treat_post_dispatch_unknown_outcome_as_ambiguous_and_fully_reserved_charge",
      "require_current_same_user_approval_and_fresh_credential_reattach_for_one_retry",
      "retain_ticket_15_injected_gateway_until_slice_162_live_acceptance",
    ],
    userVisibleChecks: "not_run_until_slice_160",
  },
  runTruth: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    userCredentialAccepted: false,
    syntheticHashesOnly: true,
    realPostgresServerUsed: false,
    deterministicPostgresTransactionProtocolUsed: true,
    sqliteParityFilesCreatedOnlyInTemporaryVerifierDirectories: true,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_16_PROVIDER_ATTEMPT_STORE_POSTGRES_V1 = freeze({
  ...body,
  contractHash: hashStarcraftTmgContract(body),
});
