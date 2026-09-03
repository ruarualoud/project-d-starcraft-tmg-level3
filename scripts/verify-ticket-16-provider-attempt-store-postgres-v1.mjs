import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { STARCRAFT_TMG_TICKET_16_PROVIDER_ATTEMPT_STORE_POSTGRES_V1 as contract } from
  "../content/provider/ticket-16-provider-attempt-store-postgres-v1.mjs";
import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_METHODS,
  hashStarcraftTmgProviderAttemptValueV1,
} from "../packages/secure-provider-runtime/provider-attempt-store-contract-v1.mjs";
import {
  createStarcraftTmgProviderAttemptRecoveryControlV1,
} from "../packages/secure-provider-runtime/provider-attempt-recovery-control-v1.mjs";
import {
  STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_COLUMN_LAYOUT,
  STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_SCHEMA_FINGERPRINT_HASH,
  createPostgresStarcraftTmgProviderAttemptStoreV1,
} from "../packages/secure-provider-runtime/postgres-provider-attempt-store-v1.mjs";
import {
  createStarcraftTmgProviderRetryApprovalAuthorityV1,
} from "../packages/secure-provider-runtime/provider-retry-approval-v1.mjs";
import {
  createSqliteStarcraftTmgProviderAttemptStoreV1,
} from "../packages/secure-provider-runtime/sqlite-provider-attempt-store-v1.mjs";

const root = mkdtempSync(path.join(tmpdir(), "sc-provider-attempt-postgres-"));
const checks = [];
const failures = [];
let sqliteFilesCreated = 0;

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function H(label) {
  return hashStarcraftTmgProviderAttemptValueV1({ fixture: label });
}

function at(index) {
  return new Date(Date.UTC(2026, 8, 4, 4, 0, index)).toISOString();
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

function reservationInput({ budget, principalScopeHash, label, time = 1, overrides = {} }) {
  return {
    budgetId: budget.budgetId,
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
    reservedAt: at(time),
    ...overrides,
  };
}

function dispatchInput(attempt, label, time = 2) {
  return {
    attemptId: attempt.attemptId,
    expectedAttemptRevision: attempt.revision,
    dispatchBindingHash: H(`${label}:dispatch-binding`),
    dispatchedAt: at(time),
  };
}

function settlementInput(attempt, label, time = 3) {
  return {
    attemptId: attempt.attemptId,
    expectedAttemptRevision: attempt.revision,
    terminalStatus: "completed",
    usageKnown: true,
    inputUnits: 80,
    outputUnits: 20,
    safeProviderReceiptHash: H(`${label}:safe-receipt`),
    settledAt: at(time),
  };
}

function rowClone(row) {
  return row ? clone(row) : null;
}

class DeterministicPostgresPool {
  constructor() {
    this.budgets = new Map();
    this.attempts = new Map();
    this.audit = new Map();
    this.recoveries = new Map();
    this.meta = null;
    this.schemaSql = "";
    this.columnLayout = clone(STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_COLUMN_LAYOUT);
    this.queryLog = [];
    this.connectionCount = 0;
    this.releaseCount = 0;
    this.maxConcurrentTransactions = 0;
    this.activeTransactions = 0;
    this.lockTail = Promise.resolve();
    this.failures = new Map();
    this.commitAcknowledgementLosses = 0;
    this.ended = false;
  }

  snapshot() {
    return {
      budgets: [...this.budgets.entries()].map(([key, value]) => [key, clone(value)]),
      attempts: [...this.attempts.entries()].map(([key, value]) => [key, clone(value)]),
      audit: [...this.audit.entries()].map(([key, value]) => [key, clone(value)]),
      recoveries: [...this.recoveries.entries()].map(([key, value]) => [key, clone(value)]),
      meta: clone(this.meta),
      schemaSql: this.schemaSql,
    };
  }

  restore(snapshot) {
    this.budgets = new Map(snapshot.budgets);
    this.attempts = new Map(snapshot.attempts);
    this.audit = new Map(snapshot.audit);
    this.recoveries = new Map(snapshot.recoveries);
    this.meta = snapshot.meta;
    this.schemaSql = snapshot.schemaSql;
  }

  armFailure(marker, code = "FAKE_DATABASE_FAILURE") {
    this.failures.set(marker, code);
  }

  armCommitAcknowledgementLoss() {
    this.commitAcknowledgementLosses += 1;
  }

  async connect() {
    this.connectionCount += 1;
    const connection = {
      active: false,
      snapshot: null,
      unlock: null,
      query: (sql, params) => this.queryOn(connection, sql, params),
      release: () => {
        this.releaseCount += 1;
        if (connection.active) this.finishTransaction(connection, false);
      },
    };
    return connection;
  }

  async end() {
    this.ended = true;
  }

  async query(sql, params = []) {
    return this.dispatch(null, sql, params);
  }

  marker(sql) {
    return String(sql).match(/sc_provider_attempt:([a-z_]+)/u)?.[1] || null;
  }

  async queryOn(connection, sql, params = []) {
    const marker = this.marker(sql);
    if (marker === "begin") {
      const preceding = this.lockTail;
      let unlock;
      this.lockTail = new Promise((resolve) => { unlock = resolve; });
      await preceding;
      connection.active = true;
      connection.snapshot = this.snapshot();
      connection.unlock = unlock;
      this.activeTransactions += 1;
      this.maxConcurrentTransactions = Math.max(
        this.maxConcurrentTransactions, this.activeTransactions,
      );
      this.queryLog.push(String(sql));
      return { rows: [], rowCount: 0 };
    }
    if (marker === "commit") {
      this.queryLog.push(String(sql));
      this.finishTransaction(connection, true);
      if (this.commitAcknowledgementLosses > 0) {
        this.commitAcknowledgementLosses -= 1;
        const error = new Error("commit applied but acknowledgement was lost");
        error.code = "08006";
        throw error;
      }
      return { rows: [], rowCount: 0 };
    }
    if (marker === "rollback") {
      this.queryLog.push(String(sql));
      if (connection.active) {
        this.restore(connection.snapshot);
        this.finishTransaction(connection, false);
      }
      return { rows: [], rowCount: 0 };
    }
    return this.dispatch(connection, sql, params);
  }

  finishTransaction(connection) {
    if (!connection.active) return;
    connection.active = false;
    connection.snapshot = null;
    this.activeTransactions -= 1;
    const unlock = connection.unlock;
    connection.unlock = null;
    unlock?.();
  }

  maybeFail(marker) {
    if (!this.failures.has(marker)) return;
    const code = this.failures.get(marker);
    this.failures.delete(marker);
    const error = new Error(`injected ${marker} failure`);
    error.code = code;
    throw error;
  }

  auditRows(budgetId) {
    if (!this.audit.has(budgetId)) this.audit.set(budgetId, []);
    return this.audit.get(budgetId);
  }

  async dispatch(_connection, sql, params = []) {
    const marker = this.marker(sql);
    this.queryLog.push(String(sql));
    this.maybeFail(marker);
    if (marker === "init_lock") return { rows: [{ pg_advisory_xact_lock: null }], rowCount: 1 };
    if (marker === "init_schema") {
      this.schemaSql = String(sql);
      return { rows: [], rowCount: 0 };
    }
    if (marker === "schema_layout") {
      const rows = Object.entries(this.columnLayout)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([table_name, columns]) => ({ table_name, columns: clone(columns) }));
      return { rows, rowCount: rows.length };
    }
    if (marker === "insert_meta") {
      if (!this.meta) {
        this.meta = {
          schema_version: params[0],
          adapter_version: params[1],
          schema_fingerprint_hash: params[2],
        };
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    if (marker === "select_meta_for_update") {
      return { rows: this.meta ? [clone(this.meta)] : [], rowCount: this.meta ? 1 : 0 };
    }
    if (marker === "select_budget" || marker === "select_budget_for_update") {
      const row = this.budgets.get(params[0]);
      return { rows: row ? [rowClone(row)] : [], rowCount: row ? 1 : 0 };
    }
    if (marker === "select_attempt" || marker === "select_attempt_for_update") {
      const row = this.attempts.get(params[0]);
      return { rows: row ? [rowClone(row)] : [], rowCount: row ? 1 : 0 };
    }
    if (marker === "insert_budget") {
      const [budgetId, budgetScopeHash, principalScopeHash, sessionBindingHash,
        policyHash, policyJson, maxTotalUnits, maxTurns, maxInput, maxOutput,
        openIdempotencyKeyHash, openRequestHash, openedAt] = params;
      if (this.budgets.has(budgetId)) {
        const error = new Error("duplicate budget"); error.code = "23505"; throw error;
      }
      this.budgets.set(budgetId, {
        budget_id: budgetId,
        budget_scope_hash: budgetScopeHash,
        principal_scope_hash: principalScopeHash,
        session_binding_hash: sessionBindingHash,
        policy_hash: policyHash,
        policy_json: JSON.parse(policyJson),
        max_total_units: maxTotalUnits,
        max_turns: maxTurns,
        max_input_units_per_turn: maxInput,
        max_output_units_per_turn: maxOutput,
        consumed_units: 0,
        active_reserved_units: 0,
        attempt_count: 0,
        completed_count: 0,
        failed_count: 0,
        cancelled_count: 0,
        timed_out_count: 0,
        ambiguous_count: 0,
        abandoned_count: 0,
        revision: 0,
        audit_sequence: 0,
        last_event_hash: null,
        open_idempotency_key_hash: openIdempotencyKeyHash,
        open_request_hash: openRequestHash,
        open_result_json: null,
        opened_at: openedAt,
        updated_at: openedAt,
      });
      return { rows: [], rowCount: 1 };
    }
    if (marker === "insert_audit") {
      const [budgetId, sequence, eventHash, previousEventHash, eventType,
        attemptId, eventJson] = params;
      this.auditRows(budgetId).push({
        budget_id: budgetId,
        sequence: Number(sequence),
        event_hash: eventHash,
        previous_event_hash: previousEventHash,
        event_type: eventType,
        attempt_id: attemptId,
        event_json: JSON.parse(eventJson),
      });
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_audit_head") {
      const [sequence, eventHash, occurredAt, budgetId, expectedSequence] = params;
      const budget = this.budgets.get(budgetId);
      if (!budget || Number(budget.audit_sequence) !== Number(expectedSequence)) {
        return { rows: [], rowCount: 0 };
      }
      budget.audit_sequence = Number(sequence);
      budget.last_event_hash = eventHash;
      budget.updated_at = occurredAt;
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_open_result") {
      const budget = this.budgets.get(params[1]);
      if (!budget) return { rows: [], rowCount: 0 };
      budget.open_result_json = JSON.parse(params[0]);
      return { rows: [], rowCount: 1 };
    }
    if (marker === "select_unresolved") {
      const row = [...this.attempts.values()]
        .filter((attempt) => attempt.budget_id === params[0]
          && attempt.status === "ambiguous" && !attempt.retry_attempt_id)
        .sort((left, right) => left.attempt_id.localeCompare(right.attempt_id))[0];
      return { rows: row ? [{ attempt_id: row.attempt_id }] : [], rowCount: row ? 1 : 0 };
    }
    if (marker === "insert_attempt") {
      const [attemptId, budgetId, principalScopeHash, idempotencyKeyHash,
        consentReceiptHash, providerProfileHash, egressPolicyHash,
        promptAssemblyHash, responseContractHash, requestHash, intent,
        inputUnits, maxOutputUnits, reservedUnits, retryOfAttemptId,
        retryApprovalReceiptHash, reattachmentReceiptHash, reserveRequestHash,
        reservedAt] = params;
      const duplicate = [...this.attempts.values()].some((row) =>
        row.attempt_id === attemptId
        || (row.budget_id === budgetId && row.idempotency_key_hash === idempotencyKeyHash)
        || (retryOfAttemptId && row.retry_of_attempt_id === retryOfAttemptId));
      if (duplicate) {
        const error = new Error("duplicate attempt"); error.code = "23505"; throw error;
      }
      this.attempts.set(attemptId, {
        attempt_id: attemptId,
        budget_id: budgetId,
        principal_scope_hash: principalScopeHash,
        idempotency_key_hash: idempotencyKeyHash,
        consent_receipt_hash: consentReceiptHash,
        provider_profile_hash: providerProfileHash,
        egress_policy_hash: egressPolicyHash,
        prompt_assembly_hash: promptAssemblyHash,
        response_contract_hash: responseContractHash,
        request_hash: requestHash,
        intent,
        input_units: inputUnits,
        max_output_units: maxOutputUnits,
        reserved_units: reservedUnits,
        charged_units: 0,
        reported_input_units: 0,
        reported_output_units: 0,
        reported_total_units: 0,
        usage_known: null,
        status: "reserved",
        revision: 0,
        retry_of_attempt_id: retryOfAttemptId,
        retry_approval_receipt_hash: retryApprovalReceiptHash,
        reattachment_receipt_hash: reattachmentReceiptHash,
        retry_attempt_id: null,
        dispatch_binding_hash: null,
        safe_provider_receipt_hash: null,
        reserve_request_hash: reserveRequestHash,
        reserve_result_json: null,
        dispatch_request_hash: null,
        dispatch_result_json: null,
        settle_request_hash: null,
        settle_result_json: null,
        reserved_at: reservedAt,
        dispatched_at: null,
        settled_at: null,
        provider_may_have_been_called: false,
        retry_authorization_required: false,
        reattachment_required: false,
      });
      return { rows: [], rowCount: 1 };
    }
    if (marker === "link_retry") {
      const [retryAttemptId, priorAttemptId] = params;
      const prior = this.attempts.get(priorAttemptId);
      if (!prior || prior.status !== "ambiguous" || prior.retry_attempt_id) {
        return { rows: [], rowCount: 0 };
      }
      prior.retry_attempt_id = retryAttemptId;
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_budget_reserve") {
      const [reservedUnits, updatedAt, budgetId, revision] = params;
      const budget = this.budgets.get(budgetId);
      if (!budget || Number(budget.revision) !== Number(revision)) {
        return { rows: [], rowCount: 0 };
      }
      budget.active_reserved_units += Number(reservedUnits);
      budget.attempt_count += 1;
      budget.revision += 1;
      budget.updated_at = updatedAt;
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_reserve_result") {
      const attempt = this.attempts.get(params[1]);
      if (!attempt) return { rows: [], rowCount: 0 };
      attempt.reserve_result_json = JSON.parse(params[0]);
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_dispatch") {
      const [bindingHash, requestHash, dispatchedAt, attemptId, revision] = params;
      const attempt = this.attempts.get(attemptId);
      if (!attempt || attempt.status !== "reserved"
        || Number(attempt.revision) !== Number(revision)) {
        return { rows: [], rowCount: 0 };
      }
      attempt.status = "dispatched";
      attempt.revision += 1;
      attempt.dispatch_binding_hash = bindingHash;
      attempt.dispatch_request_hash = requestHash;
      attempt.dispatched_at = dispatchedAt;
      attempt.provider_may_have_been_called = true;
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_dispatch_result") {
      const attempt = this.attempts.get(params[1]);
      if (!attempt) return { rows: [], rowCount: 0 };
      attempt.dispatch_result_json = JSON.parse(params[0]);
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_settle") {
      const [status, attemptAfter, chargedUnits, inputUnits, outputUnits, totalUnits,
        usageKnown, receiptHash, requestHash, settledAt, attemptId, priorStatus,
        priorRevision] = params;
      const attempt = this.attempts.get(attemptId);
      if (!attempt || attempt.status !== priorStatus
        || Number(attempt.revision) !== Number(priorRevision)) {
        return { rows: [], rowCount: 0 };
      }
      Object.assign(attempt, {
        status,
        revision: Number(attemptAfter),
        charged_units: Number(chargedUnits),
        reported_input_units: Number(inputUnits),
        reported_output_units: Number(outputUnits),
        reported_total_units: Number(totalUnits),
        usage_known: Boolean(usageKnown),
        safe_provider_receipt_hash: receiptHash,
        settle_request_hash: requestHash,
        settled_at: settledAt,
        retry_authorization_required: false,
        reattachment_required: false,
      });
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_budget_settle" || marker === "update_budget_recovery") {
      const [reservedUnits, chargedUnits, updatedAt, budgetId, revision] = params;
      const budget = this.budgets.get(budgetId);
      if (!budget || Number(budget.revision) !== Number(revision)
        || budget.active_reserved_units < Number(reservedUnits)) {
        return { rows: [], rowCount: 0 };
      }
      const counter = String(sql).match(/(completed_count|failed_count|cancelled_count|timed_out_count|ambiguous_count|abandoned_count)\s*=\s*\1\s*\+\s*1/u)?.[1];
      if (!counter) throw new Error(`counter column not found for ${marker}`);
      budget.active_reserved_units -= Number(reservedUnits);
      budget.consumed_units += Number(chargedUnits);
      budget[counter] += 1;
      budget.revision += 1;
      budget.updated_at = updatedAt;
      return { rows: [], rowCount: 1 };
    }
    if (marker === "update_settle_result") {
      const attempt = this.attempts.get(params[1]);
      if (!attempt) return { rows: [], rowCount: 0 };
      attempt.settle_result_json = JSON.parse(params[0]);
      return { rows: [], rowCount: 1 };
    }
    if (marker === "select_recovery_for_update") {
      const row = this.recoveries.get(params[0]);
      return { rows: row ? [rowClone(row)] : [], rowCount: row ? 1 : 0 };
    }
    if (marker === "lock_recovery_budgets") {
      const rows = [...new Set([...this.attempts.values()]
        .filter((row) => ["reserved", "dispatched"].includes(row.status))
        .map((row) => row.budget_id))].sort().map((budget_id) => ({ budget_id }));
      return { rows, rowCount: rows.length };
    }
    if (marker === "select_open_for_update") {
      const rows = [...this.attempts.values()]
        .filter((row) => ["reserved", "dispatched"].includes(row.status))
        .sort((left, right) => `${left.budget_id}\u001f${left.reserved_at}\u001f${left.attempt_id}`
          .localeCompare(`${right.budget_id}\u001f${right.reserved_at}\u001f${right.attempt_id}`))
        .map(rowClone);
      return { rows, rowCount: rows.length };
    }
    if (marker === "update_recovered_attempt") {
      const [status, revisionAfter, chargedUnits, usageKnown, settledAt, ambiguous,
        attemptId, priorStatus, priorRevision] = params;
      const attempt = this.attempts.get(attemptId);
      if (!attempt || attempt.status !== priorStatus
        || Number(attempt.revision) !== Number(priorRevision)) {
        return { rows: [], rowCount: 0 };
      }
      attempt.status = status;
      attempt.revision = Number(revisionAfter);
      attempt.charged_units = Number(chargedUnits);
      attempt.usage_known = Boolean(usageKnown);
      attempt.settled_at = settledAt;
      attempt.retry_authorization_required = Boolean(ambiguous);
      attempt.reattachment_required = Boolean(ambiguous);
      return { rows: [], rowCount: 1 };
    }
    if (marker === "insert_recovery") {
      const [keyHash, requestHash, resultJson, recoveredAt] = params;
      if (this.recoveries.has(keyHash)) {
        const error = new Error("duplicate recovery"); error.code = "23505"; throw error;
      }
      this.recoveries.set(keyHash, {
        recovery_idempotency_key_hash: keyHash,
        recovery_request_hash: requestHash,
        recovery_result_json: JSON.parse(resultJson),
        recovered_at: recoveredAt,
      });
      return { rows: [], rowCount: 1 };
    }
    if (marker === "read_audit" || marker === "read_audit_all") {
      const rows = this.auditRows(params[0])
        .filter((row) => marker === "read_audit_all"
          || row.sequence > Number(params[1]))
        .slice(0, marker === "read_audit_all" ? undefined : Number(params[2]))
        .map((row) => ({ event_json: clone(row.event_json) }));
      return { rows, rowCount: rows.length };
    }
    if (marker === "health") {
      const row = this.meta ? {
        ...clone(this.meta),
        budget_count: String(this.budgets.size),
        attempt_count: String(this.attempts.size),
        audit_count: String([...this.audit.values()].reduce(
          (total, events) => total + events.length, 0)),
      } : null;
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    throw new Error(`unhandled deterministic PostgreSQL query marker: ${marker}`);
  }
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
    failures.push({ id, code: error?.code || error?.name || "error",
      message: String(error?.message || error).slice(0, 240) });
  }
}

async function runSharedLifecycle(store) {
  const input = openInput("adapter-parity");
  const initialized = await store.initialize();
  const opened = await store.openBudget(input);
  const openedReplay = await store.openBudget(input);
  const firstReserved = await store.reserveAttempt(reservationInput({
    budget: opened.budget,
    principalScopeHash: input.principalScopeHash,
    label: "parity-first",
  }));
  const firstDispatched = await store.markAttemptDispatched(
    dispatchInput(firstReserved.attempt, "parity-first"),
  );
  const firstSettled = await store.settleAttempt(
    settlementInput(firstDispatched.attempt, "parity-first"),
  );
  const secondReserved = await store.reserveAttempt(reservationInput({
    budget: firstSettled.budget,
    principalScopeHash: input.principalScopeHash,
    label: "parity-second",
    time: 4,
  }));
  const secondDispatched = await store.markAttemptDispatched(
    dispatchInput(secondReserved.attempt, "parity-second", 5),
  );
  const recoveryRequest = {
    recoveryIdempotencyKeyHash: H("parity-recovery"),
    recoveredAt: at(6),
  };
  const recovered = await store.recoverOpenAttempts(recoveryRequest);
  const recoveredReplay = await store.recoverOpenAttempts(recoveryRequest);
  const budgetAfterRecovery = await store.getBudget(opened.budget.budgetId);
  const retry = await store.reserveAttempt(reservationInput({
    budget: budgetAfterRecovery,
    principalScopeHash: input.principalScopeHash,
    label: "parity-retry",
    time: 7,
    overrides: {
      retryOfAttemptId: secondDispatched.attempt.attemptId,
      retryApprovalReceiptHash: H("parity-approval"),
      reattachmentReceiptHash: H("parity-reattachment"),
    },
  }));
  const audit = await store.readAudit({
    budgetId: opened.budget.budgetId,
    afterSequence: 0,
    limit: 100,
  });
  const replay = await store.replayBudget(opened.budget.budgetId);
  return {
    adapterMethodCount: Object.keys(store).length,
    opened,
    openedReplay,
    firstReserved,
    firstDispatched,
    firstSettled,
    secondReserved,
    secondDispatched,
    recovered,
    recoveredReplay,
    retry,
    budget: await store.getBudget(opened.budget.budgetId),
    firstAttempt: await store.getAttempt(firstReserved.attempt.attemptId),
    secondAttempt: await store.getAttempt(secondReserved.attempt.attemptId),
    retryAttempt: await store.getAttempt(retry.attempt.attemptId),
    audit,
    replay,
    initializedCommonVersion: initialized.schemaVersion,
  };
}

let postgresPool;
let postgresStore;
let postgresSemantic;
let sqliteSemantic;

await check("slice_contract_is_hash_sealed_and_binds_the_sqlite_predecessor", async () => {
  const { contractHash, ...unsigned } = contract;
  assert.equal(contractHash, hashStarcraftTmgProviderAttemptValueV1(unsigned));
  assert.match(contract.predecessorContractHash, /^[a-f0-9]{64}$/u);
  assert.equal(contract.slice, 158);
  assert.equal(contract.acceptance.fixedAssertions, 42);
  assert(Object.isFrozen(contract));
});

await check("postgres_adapter_exposes_the_exact_common_twelve_method_contract", async () => {
  postgresPool = new DeterministicPostgresPool();
  postgresStore = createPostgresStarcraftTmgProviderAttemptStoreV1({ pool: postgresPool });
  assert.deepEqual(Object.keys(postgresStore).sort(),
    [...STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_METHODS].sort());
});

await check("postgres_initialization_uses_serializable_advisory_lock_and_exact_schema", async () => {
  const health = await postgresStore.initialize();
  assert.equal(health.adapter, "postgresql");
  assert.equal(health.transactionMode, "serializable");
  assert.equal(health.databaseRetries, 0);
  assert.equal(health.schemaFingerprintHash,
    STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_SCHEMA_FINGERPRINT_HASH);
  assert(postgresPool.queryLog.some((sql) => sql.includes("pg_advisory_xact_lock")));
  assert(postgresPool.schemaSql.includes("JSONB"));
  assert(postgresPool.schemaSql.includes("TIMESTAMPTZ"));
});

await check("postgres_adapter_runs_the_complete_common_lifecycle", async () => {
  postgresSemantic = await runSharedLifecycle(postgresStore);
  assert.equal(postgresSemantic.recovered.ambiguousCount, 1);
  assert.equal(postgresSemantic.replay.replayMatchesProjection, true);
  assert.equal(postgresSemantic.retry.egressAuthorized, false);
});

await check("sqlite_adapter_runs_the_identical_common_lifecycle", async () => {
  const filename = path.join(root, `parity-${++sqliteFilesCreated}.sqlite`);
  const store = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename });
  sqliteSemantic = await runSharedLifecycle(store);
  await store.close();
});

await check("sqlite_and_postgres_lifecycle_semantics_are_hash_identical", async () => {
  assert.deepEqual(postgresSemantic, sqliteSemantic);
  assert.equal(hashStarcraftTmgProviderAttemptValueV1(postgresSemantic),
    hashStarcraftTmgProviderAttemptValueV1(sqliteSemantic));
});

await check("common_idempotency_results_remain_original_after_later_state_changes", async () => {
  assert.deepEqual(postgresSemantic.openedReplay, postgresSemantic.opened);
  assert.deepEqual(postgresSemantic.recoveredReplay, postgresSemantic.recovered);
  assert.equal(postgresSemantic.firstReserved.attempt.status, "reserved");
  assert.equal(postgresSemantic.firstAttempt.status, "completed");
});

await check("postgres_audit_replay_matches_materialized_budget_with_an_open_retry", async () => {
  assert.equal(postgresSemantic.replay.replay.consumedUnits, 250);
  assert.equal(postgresSemantic.replay.replay.activeReservedUnits, 150);
  assert.equal(postgresSemantic.replay.replay.ambiguousCount, 1);
  assert.equal(postgresSemantic.replay.replay.attemptCount, 3);
});

await check("postgres_writes_use_row_locks_and_revision_predicates", async () => {
  assert(postgresPool.queryLog.some((sql) => sql.includes("FOR UPDATE")));
  assert(postgresPool.queryLog.some((sql) =>
    sql.includes("WHERE budget_id = $3 AND revision = $4")));
  assert(postgresPool.queryLog.some((sql) =>
    sql.includes("WHERE attempt_id = $4 AND status = 'reserved' AND revision = $5")));
});

await check("two_connection_reservation_race_has_one_winner_and_no_overspend", async () => {
  const pool = new DeterministicPostgresPool();
  const store = createPostgresStarcraftTmgProviderAttemptStoreV1({ pool });
  const input = openInput("race", policy({
    maxTotalUnits: 150,
    maxInputUnitsPerTurn: 100,
    maxOutputUnitsPerTurn: 50,
  }));
  const opened = await store.openBudget(input);
  const first = reservationInput({ budget: opened.budget,
    principalScopeHash: input.principalScopeHash, label: "race-a" });
  const second = reservationInput({ budget: opened.budget,
    principalScopeHash: input.principalScopeHash, label: "race-b" });
  const outcomes = await Promise.allSettled([
    store.reserveAttempt(first), store.reserveAttempt(second),
  ]);
  assert.equal(outcomes.filter((entry) => entry.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((entry) => entry.status === "rejected"
    && entry.reason?.code === "PROVIDER_BUDGET_REVISION_CONFLICT").length, 1);
  const budget = await store.getBudget(opened.budget.budgetId);
  assert.equal(budget.activeReservedUnits, 150);
  assert.equal(budget.attemptCount, 1);
  assert(pool.connectionCount >= 3);
  await store.close();
});

await check("serialization_failure_is_typed_and_never_retried_internally", async () => {
  const pool = new DeterministicPostgresPool();
  const store = createPostgresStarcraftTmgProviderAttemptStoreV1({ pool });
  const input = openInput("serialization");
  const opened = await store.openBudget(input);
  pool.armFailure("insert_attempt", "40001");
  const beginBefore = pool.queryLog.filter((sql) => sql.includes(":begin")).length;
  await expectCode(() => store.reserveAttempt(reservationInput({
    budget: opened.budget, principalScopeHash: input.principalScopeHash,
    label: "serialization",
  })), "PROVIDER_ATTEMPT_POSTGRES_SERIALIZATION_CONFLICT");
  const beginAfter = pool.queryLog.filter((sql) => sql.includes(":begin")).length;
  assert.equal(beginAfter - beginBefore, 1);
  assert.equal((await store.getBudget(opened.budget.budgetId)).activeReservedUnits, 0);
  await store.close();
});

await check("audit_insert_failure_rolls_back_attempt_budget_and_partial_audit", async () => {
  const pool = new DeterministicPostgresPool();
  const store = createPostgresStarcraftTmgProviderAttemptStoreV1({ pool });
  const input = openInput("rollback");
  const opened = await store.openBudget(input);
  const request = reservationInput({ budget: opened.budget,
    principalScopeHash: input.principalScopeHash, label: "rollback" });
  pool.armFailure("insert_audit");
  await assert.rejects(() => store.reserveAttempt(request));
  assert.equal(await store.getAttempt(
    `sc-provider-attempt-${hashStarcraftTmgProviderAttemptValueV1({
      budgetId: opened.budget.budgetId,
      idempotencyKeyHash: request.idempotencyKeyHash,
    })}`), null);
  const budget = await store.getBudget(opened.budget.budgetId);
  assert.equal(budget.activeReservedUnits, 0);
  assert.equal(budget.attemptCount, 0);
  assert.equal((await store.readAudit({ budgetId: budget.budgetId,
    afterSequence: 0, limit: 20 })).events.length, 1);
  await store.close();
});

await check("commit_ack_loss_keeps_reservation_recoverable_by_exact_idempotent_replay", async () => {
  const pool = new DeterministicPostgresPool();
  const store = createPostgresStarcraftTmgProviderAttemptStoreV1({ pool });
  const input = openInput("commit-loss");
  const opened = await store.openBudget(input);
  const request = reservationInput({ budget: opened.budget,
    principalScopeHash: input.principalScopeHash, label: "commit-loss" });
  pool.armCommitAcknowledgementLoss();
  await assert.rejects(() => store.reserveAttempt(request), (error) => error?.code === "08006");
  const replay = await store.reserveAttempt(request);
  assert.equal(replay.attempt.status, "reserved");
  assert.equal((await store.getBudget(opened.budget.budgetId)).attemptCount, 1);
  await store.close();
});

await check("dispatch_commit_ack_loss_does_not_authorize_egress_until_replayed_result_is_observed", async () => {
  const pool = new DeterministicPostgresPool();
  const store = createPostgresStarcraftTmgProviderAttemptStoreV1({ pool });
  const input = openInput("dispatch-loss");
  const opened = await store.openBudget(input);
  const reserved = await store.reserveAttempt(reservationInput({ budget: opened.budget,
    principalScopeHash: input.principalScopeHash, label: "dispatch-loss" }));
  const request = dispatchInput(reserved.attempt, "dispatch-loss");
  pool.armCommitAcknowledgementLoss();
  await assert.rejects(() => store.markAttemptDispatched(request),
    (error) => error?.code === "08006");
  const replay = await store.markAttemptDispatched(request);
  assert.equal(replay.egressAuthorized, true);
  assert.equal(replay.attempt.status, "dispatched");
  await store.close();
});

await check("recovery_commit_ack_loss_replays_without_double_charge", async () => {
  const pool = new DeterministicPostgresPool();
  const store = createPostgresStarcraftTmgProviderAttemptStoreV1({ pool });
  const input = openInput("recovery-loss");
  const opened = await store.openBudget(input);
  const reserved = await store.reserveAttempt(reservationInput({ budget: opened.budget,
    principalScopeHash: input.principalScopeHash, label: "recovery-loss" }));
  await store.markAttemptDispatched(dispatchInput(reserved.attempt, "recovery-loss"));
  const request = { recoveryIdempotencyKeyHash: H("recovery-loss:key"), recoveredAt: at(4) };
  pool.armCommitAcknowledgementLoss();
  await assert.rejects(() => store.recoverOpenAttempts(request),
    (error) => error?.code === "08006");
  const replay = await store.recoverOpenAttempts(request);
  assert.equal(replay.ambiguousCount, 1);
  assert.equal((await store.getBudget(opened.budget.budgetId)).consumedUnits, 150);
  await store.close();
});

await check("unexpected_postgres_column_drift_fails_without_silent_compatibility", async () => {
  const pool = new DeterministicPostgresPool();
  pool.columnLayout.sc_provider_attempts.push("unexpected_column");
  const store = createPostgresStarcraftTmgProviderAttemptStoreV1({ pool });
  await expectCode(() => store.initialize(),
    "PROVIDER_ATTEMPT_POSTGRES_SCHEMA_VERSION_MISMATCH");
});

await check("postgres_meta_version_drift_fails_without_silent_compatibility", async () => {
  const pool = new DeterministicPostgresPool();
  pool.meta = {
    schema_version: "old-provider-store",
    adapter_version: "old-adapter",
    schema_fingerprint_hash: H("old-schema"),
  };
  const store = createPostgresStarcraftTmgProviderAttemptStoreV1({ pool });
  await expectCode(() => store.initialize(),
    "PROVIDER_ATTEMPT_POSTGRES_SCHEMA_VERSION_MISMATCH");
});

await check("pool_lifecycle_is_explicit_and_close_fences_store_calls", async () => {
  const pool = new DeterministicPostgresPool();
  const store = createPostgresStarcraftTmgProviderAttemptStoreV1({
    pool, closePoolOnClose: true,
  });
  await store.initialize();
  const closed = await store.close();
  assert.equal(closed.poolClosed, true);
  assert.equal(pool.ended, true);
  await expectCode(() => store.health(), "PROVIDER_ATTEMPT_STORE_CLOSED");
});

await check("invalid_postgres_pool_is_rejected_before_any_operation", async () => {
  assert.throws(() => createPostgresStarcraftTmgProviderAttemptStoreV1({ pool: {} }),
    /pool\.connect/u);
});

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
let approvalNow = at(7);
const originalCrypto = createStarcraftTmgRefereeCrypto({
  privateKey, publicKey, hmacSecret: Buffer.alloc(32, 7), keyId: "provider-retry-test-key",
});
const rotatedCrypto = createStarcraftTmgRefereeCrypto({
  privateKey, publicKey, hmacSecret: Buffer.alloc(32, 8), keyId: "provider-retry-test-key",
});
const approvalAuthority = createStarcraftTmgProviderRetryApprovalAuthorityV1({
  refereeCrypto: originalCrypto,
  now: () => approvalNow,
  ttlMs: 2_000,
});
const approvalExpected = {
  budgetId: "sc-provider-budget-test",
  attemptId: "sc-provider-attempt-test",
  principalScopeHash: H("approval-principal"),
  sessionBindingHash: H("approval-session"),
  reservationIdempotencyKeyHash: H("approval-idempotency"),
};
let approvalReceipt;

await check("explicit_same_user_approval_issues_content_hash_ed25519_and_hmac_proofs", async () => {
  approvalReceipt = approvalAuthority.issueApproval({
    ...approvalExpected,
    explicitSameUserApproval: true,
  });
  assert.match(approvalReceipt.receiptHash, /^[a-f0-9]{64}$/u);
  assert.equal(approvalReceipt.refereeSignature.signatureAlgorithm, "ed25519");
  assert.equal(approvalReceipt.shortSeal.sealAlgorithm, "hmac-sha256");
  assert.equal(approvalReceipt.content.oneRetryOnly, true);
  assert.equal(approvalReceipt.content.automaticRetryAllowed, false);
});

await check("current_approval_verifies_exact_same_user_attempt_and_reservation_binding", async () => {
  const verified = approvalAuthority.verifyApproval(approvalReceipt, approvalExpected);
  assert.equal(verified.ok, true);
  assert.equal(verified.historical, false);
  assert.equal(verified.receiptHash, approvalReceipt.receiptHash);
});

await check("approval_binding_drift_fails_before_retry_reservation", async () => {
  assert.throws(() => approvalAuthority.verifyApproval(approvalReceipt, {
    ...approvalExpected,
    sessionBindingHash: H("other-session"),
  }), (error) => error?.code === "PROVIDER_RETRY_APPROVAL_BINDING_MISMATCH");
});

await check("approval_content_tamper_fails_its_content_hash", async () => {
  const tampered = clone(approvalReceipt);
  tampered.content.oneRetryOnly = false;
  assert.throws(() => approvalAuthority.verifyApproval(tampered, approvalExpected),
    (error) => ["PROVIDER_RETRY_APPROVAL_CONTENT_INVALID",
      "PROVIDER_RETRY_APPROVAL_CONTENT_HASH_MISMATCH"].includes(error?.code));
});

await check("approval_proof_objects_reject_unknown_fields_instead_of_silent_compatibility", async () => {
  const tampered = clone(approvalReceipt);
  tampered.refereeSignature.legacyAlgorithm = "accepted";
  assert.throws(() => approvalAuthority.verifyApproval(tampered, approvalExpected),
    (error) => error?.code === "PROVIDER_RETRY_APPROVAL_SIGNATURE_FIELDS_INVALID");
});

await check("hmac_rotation_invalidates_current_use_but_ed25519_historical_replay_survives", async () => {
  const rotated = createStarcraftTmgProviderRetryApprovalAuthorityV1({
    refereeCrypto: rotatedCrypto,
    now: () => approvalNow,
    ttlMs: 2_000,
  });
  assert.equal(rotated.verifyHistoricalApproval(approvalReceipt, approvalExpected).ok, true);
  assert.throws(() => rotated.verifyApproval(approvalReceipt, approvalExpected),
    (error) => error?.code === "PROVIDER_RETRY_APPROVAL_SHORT_SEAL_INVALID");
});

await check("expired_retry_approval_is_rejected_even_with_valid_signatures", async () => {
  approvalNow = at(10);
  assert.throws(() => approvalAuthority.verifyApproval(approvalReceipt, approvalExpected),
    (error) => error?.code === "PROVIDER_RETRY_APPROVAL_EXPIRED");
  approvalNow = at(7);
});

await check("approval_cannot_be_issued_without_explicit_same_user_confirmation", async () => {
  assert.throws(() => approvalAuthority.issueApproval({
    ...approvalExpected,
    explicitSameUserApproval: false,
  }), (error) => error?.code === "PROVIDER_RETRY_EXPLICIT_SAME_USER_APPROVAL_REQUIRED");
});

let coordinatorStore;
let coordinatorControl;
let coordinatorInput;
let coordinatorResult;
let priorAmbiguous;
let attachmentProjection;
let coordinatorApprovalAuthority;

await check("recovery_control_uses_the_mtl_receipt_and_reattach_scheduling_lineage", async () => {
  const filename = path.join(root, `coordinator-${++sqliteFilesCreated}.sqlite`);
  coordinatorStore = createSqliteStarcraftTmgProviderAttemptStoreV1({ filename });
  const input = openInput("coordinator");
  const opened = await coordinatorStore.openBudget(input);
  const reserved = await coordinatorStore.reserveAttempt(reservationInput({
    budget: opened.budget, principalScopeHash: input.principalScopeHash,
    label: "coordinator-original",
  }));
  const dispatched = await coordinatorStore.markAttemptDispatched(
    dispatchInput(reserved.attempt, "coordinator-original"),
  );
  await coordinatorStore.recoverOpenAttempts({
    recoveryIdempotencyKeyHash: H("coordinator-recovery"),
    recoveredAt: at(6),
  });
  priorAmbiguous = await coordinatorStore.getAttempt(dispatched.attempt.attemptId);
  const budget = await coordinatorStore.getBudget(opened.budget.budgetId);
  const retryIdempotency = H("coordinator-retry:idempotency");
  coordinatorApprovalAuthority = createStarcraftTmgProviderRetryApprovalAuthorityV1({
    refereeCrypto: originalCrypto,
    now: () => approvalNow,
    ttlMs: 2_000,
  });
  const retryApproval = coordinatorApprovalAuthority.issueApproval({
    budgetId: budget.budgetId,
    attemptId: priorAmbiguous.attemptId,
    principalScopeHash: budget.principalScopeHash,
    sessionBindingHash: budget.sessionBindingHash,
    reservationIdempotencyKeyHash: retryIdempotency,
    explicitSameUserApproval: true,
  });
  approvalNow = at(8);
  attachmentProjection = {
    state: "attached",
    sessionBindingHash: budget.sessionBindingHash,
    provider: { profileRef: { hash: priorAmbiguous.providerProfileHash } },
    consentReceiptHash: H("coordinator-new-consent"),
    projectionHash: H("coordinator-attached-projection"),
    attachedAt: at(7),
  };
  coordinatorControl = createStarcraftTmgProviderAttemptRecoveryControlV1({
    attemptStore: coordinatorStore,
    approvalAuthority: coordinatorApprovalAuthority,
    attachmentControl: {
      async readAttachment() {
        return { ok: true, attachment: clone(attachmentProjection), trainingTruth: false };
      },
    },
  });
  coordinatorInput = {
    budgetId: budget.budgetId,
    ambiguousAttemptId: priorAmbiguous.attemptId,
    expectedBudgetRevision: budget.revision,
    idempotencyKeyHash: retryIdempotency,
    approvalReceipt: retryApproval,
    attachmentRequest: {
      roomId: "room-coordinator",
      sessionId: "session-coordinator",
      expectedConnectionEpoch: 1,
      attachmentId: "attachment-coordinator-new",
    },
    egressPolicyHash: priorAmbiguous.egressPolicyHash,
    promptAssemblyHash: priorAmbiguous.promptAssemblyHash,
    responseContractHash: priorAmbiguous.responseContractHash,
    requestHash: priorAmbiguous.requestHash,
    intent: priorAmbiguous.intent,
    inputUnits: priorAmbiguous.inputUnits,
    maxOutputUnits: priorAmbiguous.maxOutputUnits,
    reservedAt: at(8),
  };
  assert.equal(coordinatorControl.metadata().schedulingLineage,
    "mtl_persist_intent_then_approval_reattach_reserve_dispatch_receipt_replay");
});

await check("unrelated_work_is_blocked_while_ambiguity_has_no_approved_child", async () => {
  const budget = await coordinatorStore.getBudget(coordinatorInput.budgetId);
  await expectCode(() => coordinatorStore.reserveAttempt(reservationInput({
    budget,
    principalScopeHash: budget.principalScopeHash,
    label: "coordinator-unrelated",
    time: 8,
  })), "PROVIDER_ATTEMPT_AMBIGUOUS_RETRY_APPROVAL_REQUIRED");
});

await check("approved_retry_composes_verified_receipt_and_fresh_attached_projection", async () => {
  coordinatorResult = await coordinatorControl.reserveApprovedRetry(coordinatorInput, {
    authenticatedPrincipal: "server-context-not-persisted",
  });
  assert.equal(coordinatorResult.retryApprovalReceiptHash,
    coordinatorInput.approvalReceipt.receiptHash);
  assert.equal(coordinatorResult.reattachmentReceiptHash,
    attachmentProjection.projectionHash);
  assert.equal(coordinatorResult.reservation.attempt.consentReceiptHash,
    attachmentProjection.consentReceiptHash);
});

await check("approved_retry_only_reserves_and_never_authorizes_egress_before_dispatch_commit", async () => {
  assert.equal(coordinatorResult.egressAuthorized, false);
  assert.equal(coordinatorResult.reservation.egressAuthorized, false);
  assert.equal(coordinatorResult.reservation.attempt.status, "reserved");
  assert.equal(coordinatorResult.automaticallyRetried, false);
});

await check("approved_retry_is_exactly_idempotent_with_the_same_receipts_and_request", async () => {
  assert.deepEqual(await coordinatorControl.reserveApprovedRetry(coordinatorInput),
    coordinatorResult);
  const original = await coordinatorStore.getAttempt(priorAmbiguous.attemptId);
  assert.equal(original.retryAttemptId, coordinatorResult.retryAttemptId);
});

await check("approved_retry_must_preserve_the_exact_ambiguous_request", async () => {
  const budget = await coordinatorStore.getBudget(coordinatorInput.budgetId);
  await expectCode(() => coordinatorControl.reserveApprovedRetry({
    ...coordinatorInput,
    expectedBudgetRevision: budget.revision,
    requestHash: H("changed-ambiguous-request"),
  }), "PROVIDER_ATTEMPT_RETRY_REQUEST_DRIFT");
});

await check("retry_reservation_time_must_fall_after_approval_and_reattachment", async () => {
  const budget = await coordinatorStore.getBudget(coordinatorInput.budgetId);
  await expectCode(() => coordinatorControl.reserveApprovedRetry({
    ...coordinatorInput,
    expectedBudgetRevision: budget.revision,
    reservedAt: at(6),
  }), "PROVIDER_RETRY_APPROVAL_NOT_VALID_AT_RESERVATION");
});

await check("one_ambiguous_attempt_cannot_link_a_second_retry_child", async () => {
  const budget = await coordinatorStore.getBudget(coordinatorInput.budgetId);
  const changedIdempotency = H("coordinator-second-child");
  const approval = coordinatorApprovalAuthority.issueApproval({
    budgetId: budget.budgetId,
    attemptId: priorAmbiguous.attemptId,
    principalScopeHash: budget.principalScopeHash,
    sessionBindingHash: budget.sessionBindingHash,
    reservationIdempotencyKeyHash: changedIdempotency,
    explicitSameUserApproval: true,
  });
  await expectCode(() => coordinatorControl.reserveApprovedRetry({
    ...coordinatorInput,
    expectedBudgetRevision: budget.revision,
    idempotencyKeyHash: changedIdempotency,
    approvalReceipt: approval,
  }), "PROVIDER_ATTEMPT_RETRY_ALREADY_RESERVED");
});

await check("old_attachment_consent_cannot_satisfy_reattachment", async () => {
  const prior = clone(attachmentProjection);
  attachmentProjection.consentReceiptHash = priorAmbiguous.consentReceiptHash;
  const budget = await coordinatorStore.getBudget(coordinatorInput.budgetId);
  await expectCode(() => coordinatorControl.reserveApprovedRetry({
    ...coordinatorInput,
    expectedBudgetRevision: budget.revision,
  }), "PROVIDER_ATTEMPT_REATTACHMENT_NOT_FRESH");
  attachmentProjection = prior;
});

await check("attachment_before_ambiguity_recovery_cannot_satisfy_reattachment", async () => {
  const prior = clone(attachmentProjection);
  attachmentProjection.attachedAt = at(5);
  const budget = await coordinatorStore.getBudget(coordinatorInput.budgetId);
  await expectCode(() => coordinatorControl.reserveApprovedRetry({
    ...coordinatorInput,
    expectedBudgetRevision: budget.revision,
  }), "PROVIDER_ATTEMPT_REATTACHMENT_NOT_FRESH");
  attachmentProjection = prior;
});

await check("cross_session_attachment_projection_is_rejected", async () => {
  const prior = clone(attachmentProjection);
  attachmentProjection.sessionBindingHash = H("cross-session-attachment");
  const budget = await coordinatorStore.getBudget(coordinatorInput.budgetId);
  await expectCode(() => coordinatorControl.reserveApprovedRetry({
    ...coordinatorInput,
    expectedBudgetRevision: budget.revision,
  }), "PROVIDER_ATTEMPT_REATTACHMENT_SESSION_MISMATCH");
  attachmentProjection = prior;
});

await check("provider_profile_drift_on_reattachment_is_rejected", async () => {
  const prior = clone(attachmentProjection);
  attachmentProjection.provider.profileRef.hash = H("other-provider-profile");
  const budget = await coordinatorStore.getBudget(coordinatorInput.budgetId);
  await expectCode(() => coordinatorControl.reserveApprovedRetry({
    ...coordinatorInput,
    expectedBudgetRevision: budget.revision,
  }), "PROVIDER_ATTEMPT_REATTACHMENT_PROFILE_MISMATCH");
  attachmentProjection = prior;
});

await check("coordinator_persists_only_receipt_hashes_not_signed_receipt_or_attachment_context", async () => {
  const retry = await coordinatorStore.getAttempt(coordinatorResult.retryAttemptId);
  const serialized = JSON.stringify(retry);
  assert.equal(retry.retryApprovalReceiptHash, coordinatorInput.approvalReceipt.receiptHash);
  assert.equal(retry.reattachmentReceiptHash, attachmentProjection.projectionHash);
  assert.equal(serialized.includes(coordinatorInput.approvalReceipt.refereeSignature.signature), false);
  assert.equal(serialized.includes("server-context-not-persisted"), false);
  assert.equal(serialized.includes("room-coordinator"), false);
});

await check("postgres_source_has_zero_automatic_database_or_provider_retry_loops", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(
    new URL("../packages/secure-provider-runtime/postgres-provider-attempt-store-v1.mjs",
      import.meta.url), "utf8"));
  assert.equal(source.includes("BEGIN ISOLATION LEVEL SERIALIZABLE"), true);
  assert.equal(source.includes("FOR UPDATE"), true);
  assert.equal(source.includes("databaseRetries: 0"), true);
  assert.equal(/for\s*\([^)]*retry|while\s*\([^)]*retry/iu.test(source), false);
});

await check("no_real_postgres_provider_key_skill_dsh_or_training_work_was_performed", async () => {
  assert.equal(postgresPool instanceof DeterministicPostgresPool, true);
  assert.equal(postgresPool.queryLog.some((sql) =>
    /api_key_value|credential_bytes|authorization\s*:|bearer\s/iu.test(sql)), false);
  assert.equal(sqliteFilesCreated, 2);
});

await coordinatorStore.close();
await postgresStore.close();

assert.equal(checks.length, contract.acceptance.fixedAssertions,
  "Slice 158 fixed assertion denominator changed");

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_16_provider_attempt_store_postgres_report_v1",
  generatedAt: "2026-09-04T04:30:00.000Z",
  ticket: 16,
  slice: 158,
  ticketProgress: "6/10",
  projectProgress: "14/22",
  status: failures.length ? "failed" : "passed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  contractHash: contract.contractHash,
  storeContractVersion: "starcraft_tmg_provider_attempt_store_v1",
  adapterVersion: "starcraft_tmg_postgres_provider_attempt_store_v1",
  schemaFingerprintHash: STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_SCHEMA_FINGERPRINT_HASH,
  sqliteParityFiles: sqliteFilesCreated,
  deterministicPostgresConnections: postgresPool.connectionCount,
  transactionMode: "serializable",
  automaticDatabaseRetries: 0,
  providerCalled: false,
  realPostgresServerUsed: false,
  deterministicTransactionProtocolUsed: true,
  userCredentialAccepted: false,
  sourceRefreshPerformed: false,
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
    `Ticket 16 Slice 158 passed ${report.assertionsPassed}/${report.assertionsTotal}; `
    + `6/10; pgConnections=${report.deterministicPostgresConnections}; `
    + `sqliteParity=${report.sqliteParityFiles}; ${report.reportHash}\n`,
  );
}
