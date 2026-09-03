import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_PROVIDER_EGRESS_ALLOWLIST_V1 as predecessor } from
  "./ticket-16-provider-egress-allowlist-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_16_provider_attempt_store_sqlite_v1",
  ticket: 16,
  slice: 157,
  preparedAt: "2026-09-04T02:00:00.000Z",
  predecessorContractHash: predecessor.contractHash,
  objective:
    "common_non_secret_provider_attempt_store_contract_with_atomic_sqlite_wal_budget_and_restart_replay",
  mtlSchedulingLineage: {
    repository: "https://github.com/ruarualoud/project-d-maze-tower-league",
    branch: "codex/mtl-character-agent-repair",
    commit: "50ef5c29c655c015335d76e78fb4a0ecb442252f",
    inspectedModules: [
      "packages/maze-tower-league-selfplay/provider-step-wal-v1.mjs",
      "packages/maze-tower-league-selfplay/persistent-scheduler-v1.mjs",
      "docs/project-d-level3-wargame-platform-standard-template-v1.md",
    ],
    adopted: [
      "durable_intent_before_a_provider_side_effect_can_begin",
      "idempotency_request_hash_and_revision_compare_and_swap",
      "atomic_budget_state_attempt_state_and_audit_event_commit",
      "unknown_post_dispatch_outcome_is_ambiguous_and_may_have_been_billed",
      "append_only_hash_chained_events_and_restart_replay",
      "explicit_retry_lineage_and_new_attachment_receipt_after_ambiguity",
    ],
    starcraftDifferences: [
      "online_ambiguous_retry_requires_same_user_approval_not_administrator_selfplay_approval",
      "provider_units_match_the_ticket_15_session_budget_instead_of_selfplay_run_cost_dimensions",
      "no_online_schema_repair_or_automatic_retry",
      "no_provider_prompt_output_reasoning_or_credential_is_persisted",
      "dsh_remains_offline_skill_generation_only",
    ],
    copiedCode: false,
  },
  externalStandards: [
    {
      owner: "Node.js",
      title: "Node.js v24 SQLite API",
      url: "https://nodejs.org/docs/latest-v24.x/api/sqlite.html",
      use: "file_backed_DatabaseSync_prepared_statements_and_close_reopen",
    },
    {
      owner: "SQLite",
      title: "Write-Ahead Logging",
      url: "https://sqlite.org/wal.html",
      use: "persistent_wal_mode_commit_and_checkpoint_semantics",
    },
    {
      owner: "SQLite",
      title: "Transaction",
      url: "https://sqlite.org/lang_transaction.html",
      use: "begin_immediate_single_writer_and_explicit_commit_or_rollback",
    },
    {
      owner: "SQLite",
      title: "PRAGMA synchronous",
      url: "https://sqlite.org/pragma.html#pragma_synchronous",
      use: "full_synchronous_wal_durability_policy",
    },
  ],
  storeContract: {
    version: "starcraft_tmg_provider_attempt_store_v1",
    methods: [
      "initialize",
      "openBudget",
      "reserveAttempt",
      "markAttemptDispatched",
      "settleAttempt",
      "recoverOpenAttempts",
      "getBudget",
      "getAttempt",
      "readAudit",
      "replayBudget",
      "health",
      "close",
    ],
    productionAdapterOwner: "slice_158_postgresql_parity",
    resultIdempotency:
      "same_operation_hash_returns_the_original_byte_equivalent_result_even_after_later_state_changes",
    compareAndSwap: ["budget_revision", "attempt_revision"],
    automaticRetryAllowed: false,
  },
  stateMachine: {
    preEgress: ["budget_opened", "attempt_reserved", "attempt_dispatched"],
    egressMayStartOnlyAfter: "attempt_dispatched_transaction_commits",
    explicitTerminal: ["completed", "failed", "cancelled", "timed_out"],
    restartTerminal: ["abandoned_before_egress", "ambiguous"],
    reservedRestart: "zero_charge_and_release_reservation",
    dispatchedRestart:
      "full_reservation_conservative_charge_provider_may_have_been_called",
    ambiguousRetry:
      "fresh_idempotency_trusted_verified_same_user_approval_receipt_hash_and_credential_reattachment_receipt_hash",
    receiptValidationOwner:
      "trusted_service_composition_at_slices_158_and_159_store_only_binds_validated_hashes",
  },
  budget: {
    currency: "provider_units",
    dimensions: [
      "session_total",
      "session_turn_count",
      "turn_input",
      "turn_max_output",
    ],
    reservationBeforeEgress: true,
    knownUsageSettlement: "verified_actual_input_plus_output",
    unknownUsageSettlement: "consume_full_reservation",
    terminalSettlementAtomicWith: [
      "attempt_outcome",
      "usage_or_conservative_charge",
      "remaining_budget",
      "safe_provider_receipt_hash",
      "hash_chained_audit_event",
    ],
  },
  sqlite: {
    adapterVersion: "starcraft_tmg_sqlite_provider_attempt_store_v1",
    durableFileRequired: true,
    journalMode: "wal",
    synchronous: "full",
    transactionMode: "begin_immediate",
    foreignKeys: true,
    strictTables: true,
    exactSchemaFingerprintRequired: true,
    startupIntegrityCheck: "quick_check",
    restartReplay: true,
  },
  persistenceBoundary: {
    persistedHashes: [
      "principal_scope",
      "session_binding",
      "consent_receipt",
      "provider_profile",
      "egress_policy",
      "prompt_assembly",
      "response_contract",
      "bounded_request",
      "safe_provider_receipt",
      "idempotency",
    ],
    persistedRawFields: [
      "intent",
      "provider_unit_counts",
      "timestamps",
      "state_and_revision",
    ],
    forbiddenPersistence: [
      "credential",
      "credential_hash",
      "api_key",
      "raw_prompt",
      "raw_provider_output",
      "raw_provider_headers",
      "reasoning",
      "cookie_or_access_token",
    ],
  },
  acceptance: {
    verifier: "scripts/verify-ticket-16-provider-attempt-store-sqlite-v1.mjs",
    fixedAssertions: 45,
    realFileBackedSqliteRequired: true,
    closeAndReopenRequired: true,
    walModeRequired: true,
    auditTamperRequired: true,
    syntheticHashesOnly: true,
    externalProviderCallRequired: false,
    realApiKeyRequired: false,
  },
  harnessEvidence: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: [],
    uiTraceEvidence: "not_run_backend_attempt_store_slice",
    agentDecisionEvidence: null,
    memoryTraceEvidence: { refs: [], writes: 0, crossModeIsolationChecked: false },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "do_not_dispatch_until_the_attempt_dispatched_transaction_commits",
      "reject_stale_budget_or_attempt_revisions_without_partial_writes",
      "charge_the_full_reservation_when_a_dispatched_attempt_has_unknown_usage",
      "never_retry_an_ambiguous_attempt_without_same_user_approval_and_key_reattach",
      "retain_ticket_15_injected_gateway_until_slice_162_live_acceptance",
    ],
    userVisibleChecks: "not_run_until_slice_160",
  },
  runTruth: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    userCredentialAccepted: false,
    syntheticHashesOnly: true,
    sqliteFileCreatedOnlyInTemporaryVerifierDirectories: true,
    postgresqlRun: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_16_PROVIDER_ATTEMPT_STORE_SQLITE_V1 = freeze({
  ...body,
  contractHash: hashStarcraftTmgContract(body),
});
