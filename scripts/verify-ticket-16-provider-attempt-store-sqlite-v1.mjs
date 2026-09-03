import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { STARCRAFT_TMG_TICKET_16_PROVIDER_ATTEMPT_STORE_SQLITE_V1 as contract } from
  "../content/provider/ticket-16-provider-attempt-store-sqlite-v1.mjs";
import {
  STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_METHODS,
  hashStarcraftTmgProviderAttemptValueV1,
} from "../packages/secure-provider-runtime/provider-attempt-store-contract-v1.mjs";
import {
  createSqliteStarcraftTmgProviderAttemptStoreV1,
} from "../packages/secure-provider-runtime/sqlite-provider-attempt-store-v1.mjs";

const root = mkdtempSync(path.join(tmpdir(), "sc-provider-attempt-store-"));
const checks = [];
const failures = [];
let sqliteFilesCreated = 0;
let reopenCount = 0;

function H(label) {
  return hashStarcraftTmgProviderAttemptValueV1({ fixture: label });
}

function at(index) {
  return new Date(Date.UTC(2026, 8, 4, 2, 0, index)).toISOString();
}

function policy(overrides = {}) {
  const body = {
    schemaVersion: "starcraft_tmg_provider_budget_policy_v1",
    maxTotalUnits: 4_000,
    maxTurns: 20,
    maxInputUnitsPerTurn: 500,
    maxOutputUnitsPerTurn: 500,
    timeoutMs: 30_000,
    cancellationSettlement: "consume_full_reservation_when_usage_is_unknown",
    timeoutSettlement: "consume_full_reservation_when_usage_is_unknown",
    automaticRetryAllowed: false,
    currency: "provider_units",
    trainingTruth: false,
    ...overrides,
  };
  return Object.freeze({ ...body, policyHash: hashStarcraftTmgProviderAttemptValueV1(body) });
}

function openInput(label, configuredPolicy = policy()) {
  return {
    principalScopeHash: H(`${label}:principal`),
    sessionBindingHash: H(`${label}:session`),
    policy: configuredPolicy,
    idempotencyKeyHash: H(`${label}:open-idempotency`),
    openedAt: at(0),
  };
}

function filename(label) {
  sqliteFilesCreated += 1;
  return path.join(root, `${label}-${sqliteFilesCreated}.sqlite`);
}

async function fixture(label, callback, configuredPolicy = policy()) {
  const file = filename(label);
  const store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  const input = openInput(label, configuredPolicy);
  const opened = await store.openBudget(input);
  try {
    return await callback({ file, store, input, opened, budgetId: opened.budget.budgetId });
  } finally {
    await store.close();
  }
}

async function reserve(store, budgetId, principalScopeHash, label, overrides = {}) {
  const budget = await store.getBudget(budgetId);
  return store.reserveAttempt({
    budgetId,
    principalScopeHash,
    expectedBudgetRevision: budget.revision,
    idempotencyKeyHash: H(`${label}:idempotency`),
    consentReceiptHash: H(`${label}:consent`),
    providerProfileHash: H("provider-profile"),
    egressPolicyHash: H("egress-policy"),
    promptAssemblyHash: H(`${label}:prompt-assembly`),
    responseContractHash: H("response-contract"),
    requestHash: H(`${label}:request`),
    intent: "chat",
    inputUnits: 100,
    maxOutputUnits: 50,
    reservedAt: at(1),
    ...overrides,
  });
}

async function dispatch(store, attempt, label, overrides = {}) {
  return store.markAttemptDispatched({
    attemptId: attempt.attemptId,
    expectedAttemptRevision: attempt.revision,
    dispatchBindingHash: H(`${label}:dispatch-binding`),
    dispatchedAt: at(2),
    ...overrides,
  });
}

async function settle(store, attempt, label, overrides = {}) {
  return store.settleAttempt({
    attemptId: attempt.attemptId,
    expectedAttemptRevision: attempt.revision,
    terminalStatus: "completed",
    usageKnown: true,
    inputUnits: 80,
    outputUnits: 20,
    safeProviderReceiptHash: H(`${label}:safe-receipt`),
    settledAt: at(3),
    ...overrides,
  });
}

async function expectCode(action, code) {
  await assert.rejects(action, (error) => error?.code === code);
}

async function check(id, callback) {
  try {
    await callback();
    checks.push({ id, passed: true });
  } catch (error) {
    checks.push({ id, passed: false });
    failures.push({ id, code: error?.code || error?.name || "error" });
  }
}

await check("contract_hash_and_predecessor_are_frozen", async () => {
  assert.equal(contract.slice, 157);
  assert.match(contract.contractHash, /^[a-f0-9]{64}$/u);
  assert.match(contract.predecessorContractHash, /^[a-f0-9]{64}$/u);
  assert(Object.isFrozen(contract));
});

await check("store_exposes_the_exact_common_adapter_methods", async () => {
  await fixture("methods", async ({ store }) => {
    assert.deepEqual(Object.keys(store).sort(), [...STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_METHODS].sort());
  });
});

await check("file_backed_sqlite_uses_wal_full_sync_foreign_keys_and_quick_check", async () => {
  await fixture("health", async ({ store }) => {
    const health = await store.initialize();
    assert.equal(health.adapter, "sqlite");
    assert.equal(health.journalMode, "wal");
    assert.equal(health.synchronous, "full");
    assert.equal(health.foreignKeysEnabled, true);
    assert.equal(health.quickCheck, "ok");
    assert.equal(health.transactionMode, "begin_immediate");
  });
});

await check("ephemeral_in_memory_sqlite_is_rejected", async () => {
  assert.throws(
    () => createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: ":memory:" }),
    (error) => error?.code === "PROVIDER_ATTEMPT_DURABLE_SQLITE_FILE_REQUIRED",
  );
});

await check("budget_policy_hash_or_retry_semantics_drift_fails_closed", async () => {
  const file = filename("policy-drift");
  const store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  const tampered = { ...policy(), automaticRetryAllowed: true };
  await expectCode(() => store.openBudget(openInput("policy-drift", tampered)),
    "PROVIDER_BUDGET_POLICY_INVALID");
  await store.close();
});

await check("credential_shaped_fields_are_rejected_before_a_write", async () => {
  const file = filename("credential-field");
  const store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  await expectCode(() => store.openBudget({
    ...openInput("credential-field"),
    apiKey: "synthetic-secret-never-write",
  }), "PROVIDER_ATTEMPT_CREDENTIAL_MATERIAL_FORBIDDEN");
  await store.close();
});

await check("budget_open_is_hash_sealed_and_contains_no_raw_authority", async () => {
  await fixture("open", async ({ opened }) => {
    assert.equal(opened.operation, "open-budget");
    assert.equal(opened.budget.revision, 0);
    assert.equal(opened.budget.attemptCount, 0);
    assert.equal(opened.budget.rawProviderMaterialRetained, false);
    assert.equal(opened.trainingTruth, false);
    assert.match(opened.resultHash, /^[a-f0-9]{64}$/u);
  });
});

await check("budget_open_idempotency_returns_the_original_exact_result", async () => {
  await fixture("open-idempotent", async ({ store, input, opened }) => {
    assert.deepEqual(await store.openBudget(input), opened);
  });
});

await check("budget_scope_reuse_with_changed_open_content_conflicts", async () => {
  await fixture("open-conflict", async ({ store, input }) => {
    await expectCode(() => store.openBudget({ ...input, idempotencyKeyHash: H("changed-open") }),
      "PROVIDER_BUDGET_IDEMPOTENCY_CONFLICT");
  });
});

await check("missing_budget_and_attempt_reads_are_null", async () => {
  await fixture("missing", async ({ store }) => {
    assert.equal(await store.getBudget("missing-budget"), null);
    assert.equal(await store.getAttempt("missing-attempt"), null);
  });
});

await check("reservation_persists_only_hashes_bounds_and_intent", async () => {
  await fixture("reserve-fields", async ({ store, input, budgetId }) => {
    const value = await reserve(store, budgetId, input.principalScopeHash, "reserve-fields");
    assert.equal(value.attempt.status, "reserved");
    assert.equal(value.attempt.consentReceiptHash, H("reserve-fields:consent"));
    assert.equal(value.attempt.requestHash, H("reserve-fields:request"));
    assert.equal(value.attempt.reservedUnits, 150);
    assert.equal(value.egressAuthorized, false);
  });
});

await check("reservation_and_budget_hold_commit_atomically", async () => {
  await fixture("reserve-atomic", async ({ store, input, budgetId }) => {
    const value = await reserve(store, budgetId, input.principalScopeHash, "reserve-atomic");
    assert.equal(value.budget.revision, 1);
    assert.equal(value.budget.attemptCount, 1);
    assert.equal(value.budget.activeReservedUnits, 150);
    assert.equal(value.budget.remainingUnits, 3_850);
  });
});

await check("reservation_idempotency_survives_later_attempt_state_changes", async () => {
  await fixture("reserve-replay", async ({ store, input, budgetId }) => {
    const first = await reserve(store, budgetId, input.principalScopeHash, "reserve-replay");
    await dispatch(store, first.attempt, "reserve-replay");
    const duplicate = await reserve(store, budgetId, input.principalScopeHash, "reserve-replay", {
      expectedBudgetRevision: 0,
    });
    assert.deepEqual(duplicate, first);
  });
});

await check("reservation_idempotency_key_cannot_change_request_content", async () => {
  await fixture("reserve-conflict", async ({ store, input, budgetId }) => {
    await reserve(store, budgetId, input.principalScopeHash, "reserve-conflict");
    await expectCode(() => reserve(store, budgetId, input.principalScopeHash, "reserve-conflict", {
      requestHash: H("changed-request"),
    }), "PROVIDER_ATTEMPT_IDEMPOTENCY_CONFLICT");
  });
});

await check("stale_budget_revision_rejects_without_a_partial_hold", async () => {
  await fixture("stale-budget", async ({ store, input, budgetId }) => {
    await expectCode(() => reserve(store, budgetId, input.principalScopeHash, "stale-budget", {
      expectedBudgetRevision: 9,
    }), "PROVIDER_BUDGET_REVISION_CONFLICT");
    assert.equal((await store.getBudget(budgetId)).activeReservedUnits, 0);
  });
});

await check("reservation_must_match_the_authenticated_principal_scope_hash", async () => {
  await fixture("principal-mismatch", async ({ store, budgetId }) => {
    await expectCode(() => reserve(store, budgetId, H("foreign-principal"), "principal-mismatch"),
      "PROVIDER_BUDGET_PRINCIPAL_SCOPE_MISMATCH");
  });
});

await check("per_turn_input_limit_is_enforced_before_reservation", async () => {
  await fixture("input-limit", async ({ store, input, budgetId }) => {
    await expectCode(() => reserve(store, budgetId, input.principalScopeHash, "input-limit", {
      inputUnits: 501,
    }), "PROVIDER_BUDGET_INPUT_LIMIT_EXCEEDED");
  });
});

await check("per_turn_output_limit_is_enforced_before_reservation", async () => {
  await fixture("output-limit", async ({ store, input, budgetId }) => {
    await expectCode(() => reserve(store, budgetId, input.principalScopeHash, "output-limit", {
      maxOutputUnits: 501,
    }), "PROVIDER_BUDGET_OUTPUT_LIMIT_EXCEEDED");
  });
});

await check("session_total_limit_includes_active_reservations", async () => {
  await fixture("total-limit", async ({ store, input, budgetId }) => {
    await reserve(store, budgetId, input.principalScopeHash, "total-limit-a", {
      inputUnits: 100,
      maxOutputUnits: 100,
    });
    await expectCode(() => reserve(store, budgetId, input.principalScopeHash, "total-limit-b", {
      inputUnits: 1,
      maxOutputUnits: 1,
    }), "PROVIDER_BUDGET_TOTAL_LIMIT_EXCEEDED");
  }, policy({ maxTotalUnits: 200, maxInputUnitsPerTurn: 100, maxOutputUnitsPerTurn: 100 }));
});

await check("session_turn_limit_counts_reserved_attempts", async () => {
  await fixture("turn-limit", async ({ store, input, budgetId }) => {
    await reserve(store, budgetId, input.principalScopeHash, "turn-limit-a");
    await expectCode(() => reserve(store, budgetId, input.principalScopeHash, "turn-limit-b"),
      "PROVIDER_BUDGET_TURN_LIMIT_EXCEEDED");
  }, policy({ maxTurns: 1 }));
});

await check("retry_lineage_requires_approval_and_reattachment_hashes_together", async () => {
  await fixture("retry-lineage", async ({ store, input, budgetId }) => {
    await expectCode(() => reserve(store, budgetId, input.principalScopeHash, "retry-lineage", {
      retryOfAttemptId: "sc-provider-attempt-prior",
    }), "PROVIDER_ATTEMPT_RETRY_LINEAGE_INCOMPLETE");
  });
});

await check("dispatch_commit_is_the_only_egress_authorization_boundary", async () => {
  await fixture("dispatch", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "dispatch");
    const value = await dispatch(store, reserved.attempt, "dispatch");
    assert.equal(value.egressAuthorized, true);
    assert.equal(value.attempt.status, "dispatched");
    assert.equal(value.attempt.revision, 1);
    assert.equal(value.attempt.providerMayHaveBeenCalled, true);
  });
});

await check("dispatch_idempotency_returns_original_result_after_settlement", async () => {
  await fixture("dispatch-replay", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "dispatch-replay");
    const first = await dispatch(store, reserved.attempt, "dispatch-replay");
    await settle(store, first.attempt, "dispatch-replay");
    assert.deepEqual(await dispatch(store, reserved.attempt, "dispatch-replay"), first);
  });
});

await check("dispatch_binding_drift_conflicts_on_the_same_attempt", async () => {
  await fixture("dispatch-conflict", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "dispatch-conflict");
    await dispatch(store, reserved.attempt, "dispatch-conflict");
    await expectCode(() => dispatch(store, reserved.attempt, "dispatch-conflict", {
      dispatchBindingHash: H("other-dispatch-binding"),
    }), "PROVIDER_ATTEMPT_DISPATCH_IDEMPOTENCY_CONFLICT");
  });
});

await check("stale_attempt_revision_cannot_mark_dispatch", async () => {
  await fixture("dispatch-stale", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "dispatch-stale");
    await expectCode(() => dispatch(store, reserved.attempt, "dispatch-stale", {
      expectedAttemptRevision: 7,
    }), "PROVIDER_ATTEMPT_DISPATCH_REVISION_CONFLICT");
    assert.equal((await store.getAttempt(reserved.attempt.attemptId)).status, "reserved");
  });
});

await check("completed_settlement_requires_a_committed_dispatch", async () => {
  await fixture("complete-before-dispatch", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash,
      "complete-before-dispatch");
    await expectCode(() => settle(store, reserved.attempt, "complete-before-dispatch"),
      "PROVIDER_ATTEMPT_COMPLETION_REQUIRES_DISPATCH");
  });
});

await check("known_usage_settlement_atomically_releases_and_charges_budget", async () => {
  await fixture("settle-known", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "settle-known");
    const dispatched = await dispatch(store, reserved.attempt, "settle-known");
    const value = await settle(store, dispatched.attempt, "settle-known");
    assert.equal(value.attempt.status, "completed");
    assert.equal(value.attempt.chargedUnits, 100);
    assert.equal(value.budget.activeReservedUnits, 0);
    assert.equal(value.budget.consumedUnits, 100);
    assert.equal(value.budget.completedCount, 1);
    assert.equal(value.budget.revision, 2);
  });
});

await check("settlement_idempotency_returns_the_original_exact_result", async () => {
  await fixture("settle-replay", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "settle-replay");
    const dispatched = await dispatch(store, reserved.attempt, "settle-replay");
    const first = await settle(store, dispatched.attempt, "settle-replay");
    assert.deepEqual(await settle(store, dispatched.attempt, "settle-replay"), first);
  });
});

await check("settlement_idempotency_cannot_change_usage_or_outcome", async () => {
  await fixture("settle-conflict", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "settle-conflict");
    const dispatched = await dispatch(store, reserved.attempt, "settle-conflict");
    await settle(store, dispatched.attempt, "settle-conflict");
    await expectCode(() => settle(store, dispatched.attempt, "settle-conflict", {
      outputUnits: 21,
    }), "PROVIDER_ATTEMPT_SETTLEMENT_IDEMPOTENCY_CONFLICT");
  });
});

await check("reported_usage_above_reservation_rolls_back_all_changes", async () => {
  await fixture("usage-overflow", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "usage-overflow");
    const dispatched = await dispatch(store, reserved.attempt, "usage-overflow");
    const before = await store.getBudget(budgetId);
    await expectCode(() => settle(store, dispatched.attempt, "usage-overflow", {
      inputUnits: 150,
      outputUnits: 1,
    }), "PROVIDER_ATTEMPT_USAGE_EXCEEDS_RESERVATION");
    assert.deepEqual(await store.getBudget(budgetId), before);
    assert.equal((await store.getAttempt(dispatched.attempt.attemptId)).status, "dispatched");
  });
});

await check("unknown_usage_cannot_smuggle_reported_unit_counts", async () => {
  await fixture("unknown-units", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "unknown-units");
    const dispatched = await dispatch(store, reserved.attempt, "unknown-units");
    await expectCode(() => settle(store, dispatched.attempt, "unknown-units", {
      terminalStatus: "failed",
      usageKnown: false,
      inputUnits: 1,
      outputUnits: 0,
    }), "PROVIDER_ATTEMPT_UNKNOWN_USAGE_MUST_BE_ZERO");
  });
});

await check("pre_egress_failure_releases_reservation_with_known_zero_usage", async () => {
  await fixture("pre-egress-failure", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "pre-egress-failure");
    const value = await settle(store, reserved.attempt, "pre-egress-failure", {
      terminalStatus: "failed",
      usageKnown: true,
      inputUnits: 0,
      outputUnits: 0,
    });
    assert.equal(value.attempt.chargedUnits, 0);
    assert.equal(value.attempt.providerMayHaveBeenCalled, false);
    assert.equal(value.budget.activeReservedUnits, 0);
    assert.equal(value.budget.failedCount, 1);
  });
});

await check("post_dispatch_timeout_with_unknown_usage_charges_full_reservation", async () => {
  await fixture("timeout-full-charge", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash,
      "timeout-full-charge");
    const dispatched = await dispatch(store, reserved.attempt, "timeout-full-charge");
    const value = await settle(store, dispatched.attempt, "timeout-full-charge", {
      terminalStatus: "timed_out",
      usageKnown: false,
      inputUnits: 0,
      outputUnits: 0,
    });
    assert.equal(value.attempt.chargedUnits, 150);
    assert.equal(value.budget.timedOutCount, 1);
    assert.equal(value.budget.consumedUnits, 150);
  });
});

await check("audit_pages_are_ordered_bounded_and_cursor_addressable", async () => {
  await fixture("audit-page", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "audit-page");
    await dispatch(store, reserved.attempt, "audit-page");
    const first = await store.readAudit({ budgetId, afterSequence: 0, limit: 2 });
    assert.deepEqual(first.events.map((event) => event.sequence), [1, 2]);
    assert.equal(first.nextSequence, 2);
    const second = await store.readAudit({ budgetId, afterSequence: first.nextSequence, limit: 2 });
    assert.deepEqual(second.events.map((event) => event.sequence), [3]);
    assert.equal(second.nextSequence, null);
  });
});

await check("hash_chained_audit_replay_matches_the_materialized_budget", async () => {
  await fixture("replay", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "replay");
    const dispatched = await dispatch(store, reserved.attempt, "replay");
    await settle(store, dispatched.attempt, "replay");
    const replayed = await store.replayBudget(budgetId);
    assert.equal(replayed.replayMatchesProjection, true);
    assert.equal(replayed.replay.consumedUnits, 100);
    assert.equal(replayed.replay.completedCount, 1);
  });
});

await check("close_and_reopen_preserves_budget_attempt_and_audit_state", async () => {
  const file = filename("restart-persist");
  let store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  const input = openInput("restart-persist");
  const opened = await store.openBudget(input);
  const reserved = await reserve(store, opened.budget.budgetId, input.principalScopeHash,
    "restart-persist");
  await store.close();
  store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  reopenCount += 1;
  assert.equal((await store.getBudget(opened.budget.budgetId)).attemptCount, 1);
  assert.equal((await store.getAttempt(reserved.attempt.attemptId)).status, "reserved");
  assert.equal((await store.replayBudget(opened.budget.budgetId)).replayMatchesProjection, true);
  await store.close();
});

await check("startup_recovery_distinguishes_reserved_from_dispatched_attempts", async () => {
  const file = filename("startup-recovery");
  let store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  const input = openInput("startup-recovery");
  const opened = await store.openBudget(input);
  const reservedOnly = await reserve(store, opened.budget.budgetId, input.principalScopeHash,
    "startup-reserved");
  const mayHaveRun = await reserve(store, opened.budget.budgetId, input.principalScopeHash,
    "startup-dispatched", { reservedAt: at(2) });
  await dispatch(store, mayHaveRun.attempt, "startup-dispatched", { dispatchedAt: at(3) });
  await store.close();
  store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  reopenCount += 1;
  const recovered = await store.recoverOpenAttempts({
    recoveryIdempotencyKeyHash: H("startup-recovery-key"),
    recoveredAt: at(4),
  });
  assert.equal(recovered.abandonedBeforeEgressCount, 1);
  assert.equal(recovered.ambiguousCount, 1);
  assert.equal((await store.getAttempt(reservedOnly.attempt.attemptId)).chargedUnits, 0);
  const ambiguous = await store.getAttempt(mayHaveRun.attempt.attemptId);
  assert.equal(ambiguous.chargedUnits, 150);
  assert.equal(ambiguous.retryAuthorizationRequired, true);
  assert.equal(ambiguous.credentialReattachRequired, true);
  assert.equal(recovered.automaticallyRetried, false);
  await store.close();
});

await check("startup_recovery_is_exactly_idempotent", async () => {
  await fixture("recovery-replay", async ({ store, input, budgetId }) => {
    await reserve(store, budgetId, input.principalScopeHash, "recovery-replay");
    const request = {
      recoveryIdempotencyKeyHash: H("recovery-replay-key"),
      recoveredAt: at(4),
    };
    const first = await store.recoverOpenAttempts(request);
    assert.deepEqual(await store.recoverOpenAttempts(request), first);
  });
});

await check("startup_recovery_idempotency_key_cannot_change_content", async () => {
  await fixture("recovery-conflict", async ({ store }) => {
    const request = {
      recoveryIdempotencyKeyHash: H("recovery-conflict-key"),
      recoveredAt: at(4),
    };
    await store.recoverOpenAttempts(request);
    await expectCode(() => store.recoverOpenAttempts({ ...request, recoveredAt: at(5) }),
      "PROVIDER_ATTEMPT_RECOVERY_IDEMPOTENCY_CONFLICT");
  });
});

await check("ambiguous_attempt_blocks_unapproved_work_and_accepts_explicit_retry_lineage", async () => {
  await fixture("ambiguous-retry", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "ambiguous-original");
    await dispatch(store, reserved.attempt, "ambiguous-original");
    await store.recoverOpenAttempts({
      recoveryIdempotencyKeyHash: H("ambiguous-recovery"),
      recoveredAt: at(4),
    });
    await expectCode(() => reserve(store, budgetId, input.principalScopeHash,
      "ambiguous-unapproved"), "PROVIDER_ATTEMPT_AMBIGUOUS_RETRY_APPROVAL_REQUIRED");
    const retry = await reserve(store, budgetId, input.principalScopeHash, "ambiguous-approved", {
      retryOfAttemptId: reserved.attempt.attemptId,
      retryApprovalReceiptHash: H("same-user-approval"),
      reattachmentReceiptHash: H("fresh-attachment"),
      reservedAt: at(5),
    });
    assert.equal(retry.attempt.retryOfAttemptId, reserved.attempt.attemptId);
    assert.equal(retry.attempt.automaticallyRetried, false);
    assert.equal((await store.getAttempt(reserved.attempt.attemptId)).retryAttemptId,
      retry.attempt.attemptId);
  });
});

await check("audit_event_tampering_is_detected_after_restart", async () => {
  const file = filename("audit-tamper");
  let store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  const input = openInput("audit-tamper");
  const opened = await store.openBudget(input);
  await store.close();
  const raw = new DatabaseSync(file);
  const row = raw.prepare(`
    SELECT event_json FROM sc_provider_attempt_audit WHERE budget_id = ? AND sequence = 1
  `).get(opened.budget.budgetId);
  const event = JSON.parse(row.event_json);
  raw.prepare(`
    UPDATE sc_provider_attempt_audit SET event_json = ? WHERE budget_id = ? AND sequence = 1
  `).run(JSON.stringify({ ...event, eventType: "tampered" }), opened.budget.budgetId);
  raw.close();
  store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  reopenCount += 1;
  await expectCode(() => store.replayBudget(opened.budget.budgetId),
    "PROVIDER_ATTEMPT_AUDIT_CHAIN_INVALID");
  await store.close();
});

await check("rejected_prompt_output_and_key_sentinels_never_reach_sqlite_bytes", async () => {
  const file = filename("no-secret-bytes");
  const store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  const input = openInput("no-secret-bytes");
  const opened = await store.openBudget(input);
  const sentinel = "synthetic-secret-never-persist-9482";
  const budget = await store.getBudget(opened.budget.budgetId);
  await expectCode(() => store.reserveAttempt({
    budgetId: opened.budget.budgetId,
    principalScopeHash: input.principalScopeHash,
    expectedBudgetRevision: budget.revision,
    idempotencyKeyHash: H("no-secret-idempotency"),
    consentReceiptHash: H("no-secret-consent"),
    providerProfileHash: H("provider-profile"),
    egressPolicyHash: H("egress-policy"),
    promptAssemblyHash: H("prompt-assembly"),
    responseContractHash: H("response-contract"),
    requestHash: H("no-secret-request"),
    intent: "chat",
    inputUnits: 10,
    maxOutputUnits: 10,
    reservedAt: at(1),
    rawPrompt: sentinel,
    credentialBytes: sentinel,
    rawProviderOutput: sentinel,
  }), "PROVIDER_ATTEMPT_CREDENTIAL_MATERIAL_FORBIDDEN");
  await store.close();
  assert.equal(readFileSync(file).includes(Buffer.from(sentinel)), false);
});

await check("non_monotonic_dispatch_time_fails_without_state_change", async () => {
  await fixture("time-order", async ({ store, input, budgetId }) => {
    const reserved = await reserve(store, budgetId, input.principalScopeHash, "time-order", {
      reservedAt: at(2),
    });
    await expectCode(() => dispatch(store, reserved.attempt, "time-order", {
      dispatchedAt: at(1),
    }), "PROVIDER_ATTEMPT_TIME_ORDER_INVALID");
    assert.equal((await store.getAttempt(reserved.attempt.attemptId)).status, "reserved");
  });
});

await check("unexpected_sqlite_schema_drift_fails_instead_of_silent_compatibility", async () => {
  const file = filename("schema-drift");
  let store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  await store.close();
  const raw = new DatabaseSync(file);
  raw.exec("CREATE INDEX sc_provider_unexpected_idx ON sc_provider_attempts(intent)");
  raw.close();
  assert.throws(
    () => createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file }),
    (error) => error?.code === "PROVIDER_ATTEMPT_SQLITE_SCHEMA_VERSION_MISMATCH",
  );
});

await check("close_is_idempotent_and_fences_further_store_use", async () => {
  const file = filename("close");
  const store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename: file });
  assert.equal((await store.close()).closed, true);
  assert.equal((await store.close()).closed, true);
  await expectCode(() => store.health(), "PROVIDER_ATTEMPT_STORE_CLOSED");
});

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_16_provider_attempt_store_sqlite_report_v1",
  generatedAt: "2026-09-04T02:30:00.000Z",
  ticket: 16,
  slice: 157,
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  contractHash: contract.contractHash,
  storeContractVersion: "starcraft_tmg_provider_attempt_store_v1",
  adapterVersion: "starcraft_tmg_sqlite_provider_attempt_store_v1",
  sqliteFilesCreated,
  reopenCount,
  journalMode: "wal",
  transactionMode: "begin_immediate",
  sourceRefreshPerformed: false,
  providerCalled: false,
  userCredentialAccepted: false,
  syntheticHashesOnly: true,
  postgresqlRun: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingTruth: false,
};
const report = Object.freeze({
  ...reportBody,
  reportHash: hashStarcraftTmgProviderAttemptValueV1(reportBody),
});

rmSync(root, { recursive: true, force: true });

if (failures.length) {
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Ticket 16 Slice 157 passed ${report.assertionsPassed}/${report.assertionsTotal}; `
    + `5/10; sqliteFiles=${report.sqliteFilesCreated}; reopens=${report.reopenCount}; `
    + `${report.reportHash}\n`,
  );
}
