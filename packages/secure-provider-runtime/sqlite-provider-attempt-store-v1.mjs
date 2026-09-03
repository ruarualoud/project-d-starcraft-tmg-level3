import { DatabaseSync } from "node:sqlite";

import {
  STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION,
  StarcraftTmgProviderAttemptStoreError,
  assertStarcraftTmgProviderAttemptStoreV1,
  cloneProviderAttemptValue,
  createStarcraftTmgProviderAttemptAuditEventV1,
  deepFreezeProviderAttemptValue,
  hashStarcraftTmgProviderAttemptValueV1,
  prepareStarcraftTmgProviderAttemptDispatchV1,
  prepareStarcraftTmgProviderAttemptRecoveryV1,
  prepareStarcraftTmgProviderAttemptReservationV1,
  prepareStarcraftTmgProviderAttemptSettlementV1,
  prepareStarcraftTmgProviderBudgetOpenV1,
  verifyStarcraftTmgProviderAttemptAuditChainV1,
} from "./provider-attempt-store-contract-v1.mjs";

export const STARCRAFT_TMG_SQLITE_PROVIDER_ATTEMPT_STORE_VERSION =
  "starcraft_tmg_sqlite_provider_attempt_store_v1";

const TERMINAL = new Set([
  "completed",
  "failed",
  "cancelled",
  "timed_out",
  "abandoned_before_egress",
  "ambiguous",
]);
const HASH = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;

function fail(code, detail = "") {
  throw new StarcraftTmgProviderAttemptStoreError(code, detail);
}

function parse(value) {
  return value === null || value === undefined ? null : JSON.parse(String(value));
}

function freeze(value) {
  return deepFreezeProviderAttemptValue(cloneProviderAttemptValue(value));
}

function safeId(value, field) {
  const result = String(value || "").trim();
  if (!SAFE_ID.test(result)) fail("PROVIDER_ATTEMPT_ID_INVALID", field);
  return result;
}

function hash(value, field) {
  const result = String(value || "").trim().toLowerCase();
  if (!HASH.test(result)) fail("PROVIDER_ATTEMPT_HASH_INVALID", field);
  return result;
}

function boundedInteger(value, field, minimum = 0, maximum = 10_000_000) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    fail("PROVIDER_ATTEMPT_INTEGER_INVALID", field);
  }
  return result;
}

function exactFields(value, allowed, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const extras = Object.keys(value).filter((field) => !allowed.includes(field)).sort();
  if (extras.length) fail(code, extras.join(","));
}

function seal(body, hashField) {
  const cloned = cloneProviderAttemptValue(body);
  return freeze({ ...cloned, [hashField]: hashStarcraftTmgProviderAttemptValueV1(cloned) });
}

function rowBudget(row) {
  if (!row) return null;
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.budget`,
    budgetId: row.budget_id,
    budgetScopeHash: row.budget_scope_hash,
    principalScopeHash: row.principal_scope_hash,
    sessionBindingHash: row.session_binding_hash,
    policy: parse(row.policy_json),
    revision: Number(row.revision),
    consumedUnits: Number(row.consumed_units),
    activeReservedUnits: Number(row.active_reserved_units),
    remainingUnits: Math.max(0,
      Number(row.max_total_units) - Number(row.consumed_units)
        - Number(row.active_reserved_units)),
    attemptCount: Number(row.attempt_count),
    completedCount: Number(row.completed_count),
    failedCount: Number(row.failed_count),
    cancelledCount: Number(row.cancelled_count),
    timedOutCount: Number(row.timed_out_count),
    ambiguousCount: Number(row.ambiguous_count),
    abandonedBeforeEgressCount: Number(row.abandoned_count),
    auditSequence: Number(row.audit_sequence),
    lastEventHash: row.last_event_hash,
    openedAt: row.opened_at,
    updatedAt: row.updated_at,
    automaticRetryAllowed: false,
    rawProviderMaterialRetained: false,
    trainingTruth: false,
  };
  return seal(body, "budgetHash");
}

function rowAttempt(row) {
  if (!row) return null;
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.attempt`,
    attemptId: row.attempt_id,
    budgetId: row.budget_id,
    idempotencyKeyHash: row.idempotency_key_hash,
    consentReceiptHash: row.consent_receipt_hash,
    providerProfileHash: row.provider_profile_hash,
    egressPolicyHash: row.egress_policy_hash,
    promptAssemblyHash: row.prompt_assembly_hash,
    responseContractHash: row.response_contract_hash,
    requestHash: row.request_hash,
    intent: row.intent,
    inputUnits: Number(row.input_units),
    maxOutputUnits: Number(row.max_output_units),
    reservedUnits: Number(row.reserved_units),
    chargedUnits: Number(row.charged_units),
    reportedInputUnits: Number(row.reported_input_units),
    reportedOutputUnits: Number(row.reported_output_units),
    reportedTotalUnits: Number(row.reported_total_units),
    usageKnown: row.usage_known === null ? null : Number(row.usage_known) === 1,
    status: row.status,
    revision: Number(row.revision),
    retryOfAttemptId: row.retry_of_attempt_id,
    retryApprovalReceiptHash: row.retry_approval_receipt_hash,
    reattachmentReceiptHash: row.reattachment_receipt_hash,
    retryAttemptId: row.retry_attempt_id,
    dispatchBindingHash: row.dispatch_binding_hash,
    safeProviderReceiptHash: row.safe_provider_receipt_hash,
    reservedAt: row.reserved_at,
    dispatchedAt: row.dispatched_at,
    settledAt: row.settled_at,
    providerMayHaveBeenCalled: Number(row.provider_may_have_been_called) === 1,
    retryAuthorizationRequired: Number(row.retry_authorization_required) === 1,
    credentialReattachRequired: Number(row.reattachment_required) === 1,
    automaticallyRetried: false,
    rawPromptRetained: false,
    rawProviderOutputRetained: false,
    rawProviderHeadersRetained: false,
    trainingTruth: false,
  };
  return seal(body, "attemptHash");
}

function result(operation, fields) {
  return seal({
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.${operation}-result`,
    operation,
    ...cloneProviderAttemptValue(fields),
    rawProviderMaterialRetained: false,
    trainingTruth: false,
  }, "resultHash");
}

function counterColumn(status) {
  return {
    completed: "completed_count",
    failed: "failed_count",
    cancelled: "cancelled_count",
    timed_out: "timed_out_count",
    ambiguous: "ambiguous_count",
    abandoned_before_egress: "abandoned_count",
  }[status];
}

export function createSqliteStarcraftTmgProviderAttemptStoreV1(options = {}) {
  const filename = String(options.filename || "").trim();
  if (!filename || filename === ":memory:") {
    fail("PROVIDER_ATTEMPT_DURABLE_SQLITE_FILE_REQUIRED");
  }
  const database = options.database || new DatabaseSync(filename, {
    timeout: 5_000,
    enableForeignKeyConstraints: true,
    enableDoubleQuotedStringLiterals: false,
    allowExtension: false,
    defensive: true,
  });
  let closed = false;

  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA busy_timeout = 5000");
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA synchronous = FULL");
  const journalMode = String(database.prepare("PRAGMA journal_mode").get()?.journal_mode || "").toLowerCase();
  if (journalMode !== "wal") {
    database.close();
    closed = true;
    fail("PROVIDER_ATTEMPT_SQLITE_WAL_REQUIRED", journalMode);
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS sc_provider_attempt_store_meta (
      singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
      schema_version TEXT NOT NULL,
      adapter_version TEXT NOT NULL,
      schema_fingerprint_hash TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS sc_provider_budgets (
      budget_id TEXT PRIMARY KEY,
      budget_scope_hash TEXT NOT NULL UNIQUE,
      principal_scope_hash TEXT NOT NULL,
      session_binding_hash TEXT NOT NULL,
      policy_hash TEXT NOT NULL,
      policy_json TEXT NOT NULL,
      max_total_units INTEGER NOT NULL CHECK (max_total_units > 0),
      max_turns INTEGER NOT NULL CHECK (max_turns > 0),
      max_input_units_per_turn INTEGER NOT NULL CHECK (max_input_units_per_turn > 0),
      max_output_units_per_turn INTEGER NOT NULL CHECK (max_output_units_per_turn > 0),
      consumed_units INTEGER NOT NULL DEFAULT 0 CHECK (consumed_units >= 0),
      active_reserved_units INTEGER NOT NULL DEFAULT 0 CHECK (active_reserved_units >= 0),
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      completed_count INTEGER NOT NULL DEFAULT 0 CHECK (completed_count >= 0),
      failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
      cancelled_count INTEGER NOT NULL DEFAULT 0 CHECK (cancelled_count >= 0),
      timed_out_count INTEGER NOT NULL DEFAULT 0 CHECK (timed_out_count >= 0),
      ambiguous_count INTEGER NOT NULL DEFAULT 0 CHECK (ambiguous_count >= 0),
      abandoned_count INTEGER NOT NULL DEFAULT 0 CHECK (abandoned_count >= 0),
      revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
      audit_sequence INTEGER NOT NULL DEFAULT 0 CHECK (audit_sequence >= 0),
      last_event_hash TEXT,
      open_idempotency_key_hash TEXT NOT NULL,
      open_request_hash TEXT NOT NULL,
      open_result_json TEXT,
      opened_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS sc_provider_attempts (
      attempt_id TEXT PRIMARY KEY,
      budget_id TEXT NOT NULL REFERENCES sc_provider_budgets(budget_id),
      principal_scope_hash TEXT NOT NULL,
      idempotency_key_hash TEXT NOT NULL,
      consent_receipt_hash TEXT NOT NULL,
      provider_profile_hash TEXT NOT NULL,
      egress_policy_hash TEXT NOT NULL,
      prompt_assembly_hash TEXT NOT NULL,
      response_contract_hash TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      intent TEXT NOT NULL,
      input_units INTEGER NOT NULL CHECK (input_units > 0),
      max_output_units INTEGER NOT NULL CHECK (max_output_units > 0),
      reserved_units INTEGER NOT NULL CHECK (reserved_units > 0),
      charged_units INTEGER NOT NULL DEFAULT 0 CHECK (charged_units >= 0),
      reported_input_units INTEGER NOT NULL DEFAULT 0 CHECK (reported_input_units >= 0),
      reported_output_units INTEGER NOT NULL DEFAULT 0 CHECK (reported_output_units >= 0),
      reported_total_units INTEGER NOT NULL DEFAULT 0 CHECK (reported_total_units >= 0),
      usage_known INTEGER CHECK (usage_known IN (0, 1)),
      status TEXT NOT NULL CHECK (status IN (
        'reserved','dispatched','completed','failed','cancelled','timed_out',
        'abandoned_before_egress','ambiguous'
      )),
      revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
      retry_of_attempt_id TEXT REFERENCES sc_provider_attempts(attempt_id),
      retry_approval_receipt_hash TEXT,
      reattachment_receipt_hash TEXT,
      retry_attempt_id TEXT REFERENCES sc_provider_attempts(attempt_id),
      dispatch_binding_hash TEXT,
      safe_provider_receipt_hash TEXT,
      reserve_request_hash TEXT NOT NULL,
      reserve_result_json TEXT,
      dispatch_request_hash TEXT,
      dispatch_result_json TEXT,
      settle_request_hash TEXT,
      settle_result_json TEXT,
      reserved_at TEXT NOT NULL,
      dispatched_at TEXT,
      settled_at TEXT,
      provider_may_have_been_called INTEGER NOT NULL DEFAULT 0 CHECK (provider_may_have_been_called IN (0, 1)),
      retry_authorization_required INTEGER NOT NULL DEFAULT 0 CHECK (retry_authorization_required IN (0, 1)),
      reattachment_required INTEGER NOT NULL DEFAULT 0 CHECK (reattachment_required IN (0, 1)),
      UNIQUE (budget_id, idempotency_key_hash)
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS sc_provider_attempt_retry_once_idx
      ON sc_provider_attempts (retry_of_attempt_id)
      WHERE retry_of_attempt_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS sc_provider_attempt_open_idx
      ON sc_provider_attempts (status, reserved_at, attempt_id);

    CREATE TABLE IF NOT EXISTS sc_provider_attempt_audit (
      budget_id TEXT NOT NULL REFERENCES sc_provider_budgets(budget_id),
      sequence INTEGER NOT NULL CHECK (sequence > 0),
      event_hash TEXT NOT NULL UNIQUE,
      previous_event_hash TEXT,
      event_type TEXT NOT NULL,
      attempt_id TEXT,
      event_json TEXT NOT NULL,
      PRIMARY KEY (budget_id, sequence)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS sc_provider_attempt_recoveries (
      recovery_idempotency_key_hash TEXT PRIMARY KEY,
      recovery_request_hash TEXT NOT NULL,
      recovery_result_json TEXT NOT NULL,
      recovered_at TEXT NOT NULL
    ) STRICT;
  `);

  const schemaObjects = database.prepare(`
    SELECT type, name, tbl_name, sql
      FROM sqlite_master
     WHERE tbl_name LIKE 'sc_provider_%' AND sql IS NOT NULL
     ORDER BY type, name
  `).all().map((row) => ({
    type: row.type,
    name: row.name,
    tableName: row.tbl_name,
    sql: row.sql,
  }));
  const schemaFingerprintHash = hashStarcraftTmgProviderAttemptValueV1(schemaObjects);
  database.prepare(`
    INSERT OR IGNORE INTO sc_provider_attempt_store_meta
      (singleton_id, schema_version, adapter_version, schema_fingerprint_hash)
    VALUES (1, ?, ?, ?)
  `).run(STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION,
    STARCRAFT_TMG_SQLITE_PROVIDER_ATTEMPT_STORE_VERSION, schemaFingerprintHash);

  const installedMeta = database.prepare(`
    SELECT schema_version, adapter_version, schema_fingerprint_hash
      FROM sc_provider_attempt_store_meta WHERE singleton_id = 1
  `).get();
  if (installedMeta?.schema_version !== STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION
    || installedMeta?.adapter_version
      !== STARCRAFT_TMG_SQLITE_PROVIDER_ATTEMPT_STORE_VERSION
    || installedMeta?.schema_fingerprint_hash !== schemaFingerprintHash) {
    database.close();
    closed = true;
    fail("PROVIDER_ATTEMPT_SQLITE_SCHEMA_VERSION_MISMATCH");
  }
  const startupQuickCheck = String(
    database.prepare("PRAGMA quick_check").get()?.quick_check || "",
  );
  if (startupQuickCheck !== "ok") {
    database.close();
    closed = true;
    fail("PROVIDER_ATTEMPT_SQLITE_INTEGRITY_CHECK_FAILED");
  }

  const selectBudget = database.prepare("SELECT * FROM sc_provider_budgets WHERE budget_id = ?");
  const selectAttempt = database.prepare("SELECT * FROM sc_provider_attempts WHERE attempt_id = ?");

  function assertOpen() {
    if (closed) fail("PROVIDER_ATTEMPT_STORE_CLOSED");
  }

  function transaction(callback) {
    assertOpen();
    try {
      database.exec("BEGIN IMMEDIATE");
      const value = callback();
      database.exec("COMMIT");
      return value;
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch {}
      throw error;
    }
  }

  function appendAudit({ budgetId, eventType, attemptId = null, occurredAt, details }) {
    const row = selectBudget.get(budgetId);
    if (!row) fail("PROVIDER_BUDGET_NOT_FOUND");
    const event = createStarcraftTmgProviderAttemptAuditEventV1({
      budgetId,
      sequence: Number(row.audit_sequence) + 1,
      previousEventHash: row.last_event_hash,
      eventType,
      attemptId,
      occurredAt,
      details,
    });
    database.prepare(`
      INSERT INTO sc_provider_attempt_audit
        (budget_id, sequence, event_hash, previous_event_hash, event_type, attempt_id, event_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(budgetId, event.sequence, event.eventHash, event.previousEventHash,
      event.eventType, event.attemptId, JSON.stringify(event));
    database.prepare(`
      UPDATE sc_provider_budgets
         SET audit_sequence = ?, last_event_hash = ?, updated_at = ?
       WHERE budget_id = ?
    `).run(event.sequence, event.eventHash, occurredAt, budgetId);
    return event;
  }

  async function initialize() {
    return health();
  }

  async function openBudget(input = {}) {
    const prepared = prepareStarcraftTmgProviderBudgetOpenV1(input);
    return transaction(() => {
      const existing = selectBudget.get(prepared.budgetId);
      if (existing) {
        if (existing.open_request_hash !== prepared.openRequestHash) {
          fail("PROVIDER_BUDGET_IDEMPOTENCY_CONFLICT");
        }
        return freeze(parse(existing.open_result_json));
      }
      database.prepare(`
        INSERT INTO sc_provider_budgets (
          budget_id, budget_scope_hash, principal_scope_hash, session_binding_hash,
          policy_hash, policy_json, max_total_units, max_turns,
          max_input_units_per_turn, max_output_units_per_turn,
          open_idempotency_key_hash, open_request_hash, opened_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        prepared.budgetId,
        prepared.budgetScopeHash,
        prepared.principalScopeHash,
        prepared.sessionBindingHash,
        prepared.policy.policyHash,
        JSON.stringify(prepared.policy),
        prepared.policy.maxTotalUnits,
        prepared.policy.maxTurns,
        prepared.policy.maxInputUnitsPerTurn,
        prepared.policy.maxOutputUnitsPerTurn,
        prepared.idempotencyKeyHash,
        prepared.openRequestHash,
        prepared.openedAt,
        prepared.openedAt,
      );
      const event = appendAudit({
        budgetId: prepared.budgetId,
        eventType: "budget_opened",
        occurredAt: prepared.openedAt,
        details: {
          policyHash: prepared.policy.policyHash,
          maxTotalUnits: prepared.policy.maxTotalUnits,
          maxTurns: prepared.policy.maxTurns,
          budgetRevisionAfter: 0,
        },
      });
      const value = result("open-budget", {
        budget: rowBudget(selectBudget.get(prepared.budgetId)),
        auditEventHash: event.eventHash,
      });
      database.prepare("UPDATE sc_provider_budgets SET open_result_json = ? WHERE budget_id = ?")
        .run(JSON.stringify(value), prepared.budgetId);
      return value;
    });
  }

  async function reserveAttempt(input = {}) {
    const prepared = prepareStarcraftTmgProviderAttemptReservationV1(input);
    return transaction(() => {
      const existing = selectAttempt.get(prepared.attemptId);
      if (existing) {
        if (existing.reserve_request_hash !== prepared.reservationRequestHash) {
          fail("PROVIDER_ATTEMPT_IDEMPOTENCY_CONFLICT");
        }
        return freeze(parse(existing.reserve_result_json));
      }
      const budget = selectBudget.get(prepared.budgetId);
      if (!budget) fail("PROVIDER_BUDGET_NOT_FOUND");
      if (budget.principal_scope_hash !== prepared.principalScopeHash) {
        fail("PROVIDER_BUDGET_PRINCIPAL_SCOPE_MISMATCH");
      }
      if (Number(budget.revision) !== prepared.expectedBudgetRevision) {
        fail("PROVIDER_BUDGET_REVISION_CONFLICT");
      }
      if (prepared.reservedAt < budget.opened_at) {
        fail("PROVIDER_ATTEMPT_TIME_ORDER_INVALID");
      }
      if (prepared.inputUnits > Number(budget.max_input_units_per_turn)) {
        fail("PROVIDER_BUDGET_INPUT_LIMIT_EXCEEDED");
      }
      if (prepared.maxOutputUnits > Number(budget.max_output_units_per_turn)) {
        fail("PROVIDER_BUDGET_OUTPUT_LIMIT_EXCEEDED");
      }
      if (Number(budget.attempt_count) >= Number(budget.max_turns)) {
        fail("PROVIDER_BUDGET_TURN_LIMIT_EXCEEDED");
      }
      if (Number(budget.consumed_units) + Number(budget.active_reserved_units)
        + prepared.reservedUnits > Number(budget.max_total_units)) {
        fail("PROVIDER_BUDGET_TOTAL_LIMIT_EXCEEDED");
      }
      const unresolved = database.prepare(`
        SELECT prior.attempt_id
          FROM sc_provider_attempts prior
          LEFT JOIN sc_provider_attempts retry ON retry.retry_of_attempt_id = prior.attempt_id
         WHERE prior.budget_id = ? AND prior.status = 'ambiguous'
           AND retry.attempt_id IS NULL
         ORDER BY prior.attempt_id LIMIT 1
      `).get(prepared.budgetId);
      if (prepared.retryOfAttemptId) {
        const prior = selectAttempt.get(prepared.retryOfAttemptId);
        if (!prior || prior.budget_id !== prepared.budgetId || prior.status !== "ambiguous") {
          fail("PROVIDER_ATTEMPT_RETRY_SOURCE_INVALID");
        }
        if (prior.retry_attempt_id) fail("PROVIDER_ATTEMPT_RETRY_ALREADY_RESERVED");
        if (prepared.reservedAt < prior.settled_at) fail("PROVIDER_ATTEMPT_TIME_ORDER_INVALID");
      } else if (unresolved) {
        fail("PROVIDER_ATTEMPT_AMBIGUOUS_RETRY_APPROVAL_REQUIRED");
      }
      const before = Number(budget.revision);
      database.prepare(`
        INSERT INTO sc_provider_attempts (
          attempt_id, budget_id, principal_scope_hash, idempotency_key_hash,
          consent_receipt_hash, provider_profile_hash, egress_policy_hash,
          prompt_assembly_hash, response_contract_hash, request_hash, intent,
          input_units, max_output_units, reserved_units, status, retry_of_attempt_id,
          retry_approval_receipt_hash, reattachment_receipt_hash,
          reserve_request_hash, reserved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reserved', ?, ?, ?, ?, ?)
      `).run(
        prepared.attemptId,
        prepared.budgetId,
        prepared.principalScopeHash,
        prepared.idempotencyKeyHash,
        prepared.consentReceiptHash,
        prepared.providerProfileHash,
        prepared.egressPolicyHash,
        prepared.promptAssemblyHash,
        prepared.responseContractHash,
        prepared.requestHash,
        prepared.intent,
        prepared.inputUnits,
        prepared.maxOutputUnits,
        prepared.reservedUnits,
        prepared.retryOfAttemptId,
        prepared.retryApprovalReceiptHash,
        prepared.reattachmentReceiptHash,
        prepared.reservationRequestHash,
        prepared.reservedAt,
      );
      if (prepared.retryOfAttemptId) {
        const linked = database.prepare(`
          UPDATE sc_provider_attempts SET retry_attempt_id = ?
           WHERE attempt_id = ? AND status = 'ambiguous' AND retry_attempt_id IS NULL
        `).run(prepared.attemptId, prepared.retryOfAttemptId);
        if (Number(linked.changes) !== 1) fail("PROVIDER_ATTEMPT_RETRY_ALREADY_RESERVED");
      }
      const budgetChanged = database.prepare(`
        UPDATE sc_provider_budgets
           SET active_reserved_units = active_reserved_units + ?,
               attempt_count = attempt_count + 1,
               revision = revision + 1,
               updated_at = ?
         WHERE budget_id = ? AND revision = ?
      `).run(prepared.reservedUnits, prepared.reservedAt, prepared.budgetId, before);
      if (Number(budgetChanged.changes) !== 1) fail("PROVIDER_BUDGET_REVISION_CONFLICT");
      const event = appendAudit({
        budgetId: prepared.budgetId,
        eventType: "attempt_reserved",
        attemptId: prepared.attemptId,
        occurredAt: prepared.reservedAt,
        details: {
          reservedUnits: prepared.reservedUnits,
          budgetRevisionBefore: before,
          budgetRevisionAfter: before + 1,
          attemptRevisionAfter: 0,
          retryOfAttemptId: prepared.retryOfAttemptId,
        },
      });
      const value = result("reserve-attempt", {
        budget: rowBudget(selectBudget.get(prepared.budgetId)),
        attempt: rowAttempt(selectAttempt.get(prepared.attemptId)),
        auditEventHash: event.eventHash,
        egressAuthorized: false,
      });
      database.prepare("UPDATE sc_provider_attempts SET reserve_result_json = ? WHERE attempt_id = ?")
        .run(JSON.stringify(value), prepared.attemptId);
      return value;
    });
  }

  async function markAttemptDispatched(input = {}) {
    const prepared = prepareStarcraftTmgProviderAttemptDispatchV1(input);
    return transaction(() => {
      const attempt = selectAttempt.get(prepared.attemptId);
      if (!attempt) fail("PROVIDER_ATTEMPT_NOT_FOUND");
      if (attempt.dispatch_request_hash) {
        if (attempt.dispatch_request_hash !== prepared.dispatchRequestHash) {
          fail("PROVIDER_ATTEMPT_DISPATCH_IDEMPOTENCY_CONFLICT");
        }
        return freeze(parse(attempt.dispatch_result_json));
      }
      if (attempt.status !== "reserved"
        || Number(attempt.revision) !== prepared.expectedAttemptRevision) {
        fail("PROVIDER_ATTEMPT_DISPATCH_REVISION_CONFLICT");
      }
      if (prepared.dispatchedAt < attempt.reserved_at) {
        fail("PROVIDER_ATTEMPT_TIME_ORDER_INVALID");
      }
      const changed = database.prepare(`
        UPDATE sc_provider_attempts
           SET status = 'dispatched', revision = revision + 1,
               dispatch_binding_hash = ?, dispatch_request_hash = ?,
               dispatched_at = ?, provider_may_have_been_called = 1
         WHERE attempt_id = ? AND status = 'reserved' AND revision = ?
      `).run(prepared.dispatchBindingHash, prepared.dispatchRequestHash,
        prepared.dispatchedAt, prepared.attemptId, prepared.expectedAttemptRevision);
      if (Number(changed.changes) !== 1) fail("PROVIDER_ATTEMPT_DISPATCH_REVISION_CONFLICT");
      const event = appendAudit({
        budgetId: attempt.budget_id,
        eventType: "attempt_dispatched",
        attemptId: prepared.attemptId,
        occurredAt: prepared.dispatchedAt,
        details: {
          dispatchBindingHash: prepared.dispatchBindingHash,
          attemptRevisionBefore: prepared.expectedAttemptRevision,
          attemptRevisionAfter: prepared.expectedAttemptRevision + 1,
          egressMayStartOnlyAfterCommit: true,
        },
      });
      const value = result("mark-attempt-dispatched", {
        budget: rowBudget(selectBudget.get(attempt.budget_id)),
        attempt: rowAttempt(selectAttempt.get(prepared.attemptId)),
        auditEventHash: event.eventHash,
        egressAuthorized: true,
      });
      database.prepare(`
        UPDATE sc_provider_attempts SET dispatch_result_json = ? WHERE attempt_id = ?
      `).run(JSON.stringify(value), prepared.attemptId);
      return value;
    });
  }

  async function settleAttempt(input = {}) {
    const prepared = prepareStarcraftTmgProviderAttemptSettlementV1(input);
    return transaction(() => {
      const attempt = selectAttempt.get(prepared.attemptId);
      if (!attempt) fail("PROVIDER_ATTEMPT_NOT_FOUND");
      if (attempt.settle_request_hash) {
        if (attempt.settle_request_hash !== prepared.settlementRequestHash) {
          fail("PROVIDER_ATTEMPT_SETTLEMENT_IDEMPOTENCY_CONFLICT");
        }
        return freeze(parse(attempt.settle_result_json));
      }
      if (!new Set(["reserved", "dispatched"]).has(attempt.status)
        || Number(attempt.revision) !== prepared.expectedAttemptRevision) {
        fail("PROVIDER_ATTEMPT_SETTLEMENT_REVISION_CONFLICT");
      }
      if (prepared.terminalStatus === "completed" && attempt.status !== "dispatched") {
        fail("PROVIDER_ATTEMPT_COMPLETION_REQUIRES_DISPATCH");
      }
      if (!prepared.usageKnown && attempt.status !== "dispatched") {
        fail("PROVIDER_ATTEMPT_UNKNOWN_USAGE_REQUIRES_DISPATCH");
      }
      if (prepared.settledAt < attempt.reserved_at
        || (attempt.dispatched_at && prepared.settledAt < attempt.dispatched_at)) {
        fail("PROVIDER_ATTEMPT_TIME_ORDER_INVALID");
      }
      if (prepared.usageKnown && prepared.totalUnits > Number(attempt.reserved_units)) {
        fail("PROVIDER_ATTEMPT_USAGE_EXCEEDS_RESERVATION");
      }
      const chargedUnits = prepared.usageKnown
        ? prepared.totalUnits : Number(attempt.reserved_units);
      const budget = selectBudget.get(attempt.budget_id);
      const budgetBefore = Number(budget.revision);
      const attemptAfter = Number(attempt.revision) + 1;
      const changed = database.prepare(`
        UPDATE sc_provider_attempts
           SET status = ?, revision = ?, charged_units = ?,
               reported_input_units = ?, reported_output_units = ?,
               reported_total_units = ?, usage_known = ?,
               safe_provider_receipt_hash = ?, settle_request_hash = ?, settled_at = ?,
               retry_authorization_required = 0, reattachment_required = 0
         WHERE attempt_id = ? AND status = ? AND revision = ?
      `).run(
        prepared.terminalStatus,
        attemptAfter,
        chargedUnits,
        prepared.inputUnits,
        prepared.outputUnits,
        prepared.totalUnits,
        prepared.usageKnown ? 1 : 0,
        prepared.safeProviderReceiptHash,
        prepared.settlementRequestHash,
        prepared.settledAt,
        prepared.attemptId,
        attempt.status,
        prepared.expectedAttemptRevision,
      );
      if (Number(changed.changes) !== 1) fail("PROVIDER_ATTEMPT_SETTLEMENT_REVISION_CONFLICT");
      const column = counterColumn(prepared.terminalStatus);
      const budgetChanged = database.prepare(`
        UPDATE sc_provider_budgets
           SET active_reserved_units = active_reserved_units - ?,
               consumed_units = consumed_units + ?,
               ${column} = ${column} + 1,
               revision = revision + 1,
               updated_at = ?
         WHERE budget_id = ? AND revision = ? AND active_reserved_units >= ?
      `).run(Number(attempt.reserved_units), chargedUnits, prepared.settledAt,
        attempt.budget_id, budgetBefore, Number(attempt.reserved_units));
      if (Number(budgetChanged.changes) !== 1) fail("PROVIDER_BUDGET_SETTLEMENT_CONFLICT");
      const event = appendAudit({
        budgetId: attempt.budget_id,
        eventType: "attempt_settled",
        attemptId: prepared.attemptId,
        occurredAt: prepared.settledAt,
        details: {
          terminalStatus: prepared.terminalStatus,
          reservedUnits: Number(attempt.reserved_units),
          chargedUnits,
          usageKnown: prepared.usageKnown,
          safeProviderReceiptHash: prepared.safeProviderReceiptHash,
          budgetRevisionBefore: budgetBefore,
          budgetRevisionAfter: budgetBefore + 1,
          attemptRevisionBefore: prepared.expectedAttemptRevision,
          attemptRevisionAfter: attemptAfter,
        },
      });
      const value = result("settle-attempt", {
        budget: rowBudget(selectBudget.get(attempt.budget_id)),
        attempt: rowAttempt(selectAttempt.get(prepared.attemptId)),
        auditEventHash: event.eventHash,
      });
      database.prepare("UPDATE sc_provider_attempts SET settle_result_json = ? WHERE attempt_id = ?")
        .run(JSON.stringify(value), prepared.attemptId);
      return value;
    });
  }

  async function recoverOpenAttempts(input = {}) {
    const prepared = prepareStarcraftTmgProviderAttemptRecoveryV1(input);
    return transaction(() => {
      const duplicate = database.prepare(`
        SELECT recovery_request_hash, recovery_result_json
          FROM sc_provider_attempt_recoveries
         WHERE recovery_idempotency_key_hash = ?
      `).get(prepared.recoveryIdempotencyKeyHash);
      if (duplicate) {
        if (duplicate.recovery_request_hash !== prepared.recoveryRequestHash) {
          fail("PROVIDER_ATTEMPT_RECOVERY_IDEMPOTENCY_CONFLICT");
        }
        return freeze(parse(duplicate.recovery_result_json));
      }
      const open = database.prepare(`
        SELECT * FROM sc_provider_attempts
         WHERE status IN ('reserved','dispatched')
         ORDER BY budget_id, reserved_at, attempt_id
      `).all();
      if (open.some((attempt) => prepared.recoveredAt < attempt.reserved_at
        || (attempt.dispatched_at && prepared.recoveredAt < attempt.dispatched_at))) {
        fail("PROVIDER_ATTEMPT_TIME_ORDER_INVALID");
      }
      const recovered = [];
      for (const attempt of open) {
        const ambiguous = attempt.status === "dispatched";
        const terminalStatus = ambiguous ? "ambiguous" : "abandoned_before_egress";
        const chargedUnits = ambiguous ? Number(attempt.reserved_units) : 0;
        const budget = selectBudget.get(attempt.budget_id);
        const budgetBefore = Number(budget.revision);
        const attemptAfter = Number(attempt.revision) + 1;
        const attemptChanged = database.prepare(`
          UPDATE sc_provider_attempts
             SET status = ?, revision = ?, charged_units = ?, usage_known = ?,
                 settled_at = ?, retry_authorization_required = ?,
                 reattachment_required = ?
           WHERE attempt_id = ? AND status = ? AND revision = ?
        `).run(terminalStatus, attemptAfter, chargedUnits, ambiguous ? 0 : 1,
          prepared.recoveredAt, ambiguous ? 1 : 0, ambiguous ? 1 : 0,
          attempt.attempt_id, attempt.status, Number(attempt.revision));
        if (Number(attemptChanged.changes) !== 1) fail("PROVIDER_ATTEMPT_RECOVERY_CONFLICT");
        const column = counterColumn(terminalStatus);
        const budgetChanged = database.prepare(`
          UPDATE sc_provider_budgets
             SET active_reserved_units = active_reserved_units - ?,
                 consumed_units = consumed_units + ?,
                 ${column} = ${column} + 1,
                 revision = revision + 1,
                 updated_at = ?
           WHERE budget_id = ? AND revision = ? AND active_reserved_units >= ?
        `).run(Number(attempt.reserved_units), chargedUnits, prepared.recoveredAt,
          attempt.budget_id, budgetBefore, Number(attempt.reserved_units));
        if (Number(budgetChanged.changes) !== 1) fail("PROVIDER_BUDGET_RECOVERY_CONFLICT");
        const event = appendAudit({
          budgetId: attempt.budget_id,
          eventType: "attempt_recovered",
          attemptId: attempt.attempt_id,
          occurredAt: prepared.recoveredAt,
          details: {
            terminalStatus,
            reservedUnits: Number(attempt.reserved_units),
            chargedUnits,
            usageKnown: !ambiguous,
            providerMayHaveBeenCalled: ambiguous,
            retryAuthorizationRequired: ambiguous,
            credentialReattachRequired: ambiguous,
            budgetRevisionBefore: budgetBefore,
            budgetRevisionAfter: budgetBefore + 1,
            attemptRevisionBefore: Number(attempt.revision),
            attemptRevisionAfter: attemptAfter,
          },
        });
        recovered.push({
          attempt: rowAttempt(selectAttempt.get(attempt.attempt_id)),
          auditEventHash: event.eventHash,
        });
      }
      const value = result("recover-open-attempts", {
        recoveredAttempts: recovered,
        recoveredCount: recovered.length,
        abandonedBeforeEgressCount: recovered.filter(
          (entry) => entry.attempt.status === "abandoned_before_egress").length,
        ambiguousCount: recovered.filter(
          (entry) => entry.attempt.status === "ambiguous").length,
        automaticallyRetried: false,
      });
      database.prepare(`
        INSERT INTO sc_provider_attempt_recoveries (
          recovery_idempotency_key_hash, recovery_request_hash,
          recovery_result_json, recovered_at
        ) VALUES (?, ?, ?, ?)
      `).run(prepared.recoveryIdempotencyKeyHash, prepared.recoveryRequestHash,
        JSON.stringify(value), prepared.recoveredAt);
      return value;
    });
  }

  async function getBudget(budgetId) {
    assertOpen();
    return rowBudget(selectBudget.get(safeId(budgetId, "budgetId")));
  }

  async function getAttempt(attemptId) {
    assertOpen();
    return rowAttempt(selectAttempt.get(safeId(attemptId, "attemptId")));
  }

  async function readAudit(input = {}) {
    assertOpen();
    exactFields(input, ["budgetId", "afterSequence", "limit"],
      "PROVIDER_ATTEMPT_AUDIT_READ_FIELDS_INVALID");
    const budgetId = safeId(input.budgetId, "budgetId");
    if (!selectBudget.get(budgetId)) fail("PROVIDER_BUDGET_NOT_FOUND");
    const afterSequence = boundedInteger(input.afterSequence ?? 0, "afterSequence");
    const limit = boundedInteger(input.limit ?? 100, "limit", 1, 1_000);
    const rows = database.prepare(`
      SELECT event_json FROM sc_provider_attempt_audit
       WHERE budget_id = ? AND sequence > ? ORDER BY sequence LIMIT ?
    `).all(budgetId, afterSequence, limit + 1);
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.audit-page`,
      budgetId,
      events: rows.slice(0, limit).map((row) => parse(row.event_json)),
      nextSequence: rows.length > limit
        ? Number(parse(rows[limit - 1].event_json).sequence) : null,
      trainingTruth: false,
    });
  }

  async function replayBudget(budgetIdInput) {
    assertOpen();
    const budgetId = safeId(budgetIdInput, "budgetId");
    const budget = rowBudget(selectBudget.get(budgetId));
    if (!budget) fail("PROVIDER_BUDGET_NOT_FOUND");
    const events = database.prepare(`
      SELECT event_json FROM sc_provider_attempt_audit
       WHERE budget_id = ? ORDER BY sequence
    `).all(budgetId).map((row) => parse(row.event_json));
    const verification = verifyStarcraftTmgProviderAttemptAuditChainV1(events);
    const replay = {
      consumedUnits: 0,
      activeReservedUnits: 0,
      attemptCount: 0,
      completedCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      timedOutCount: 0,
      ambiguousCount: 0,
      abandonedBeforeEgressCount: 0,
      revision: 0,
    };
    for (const event of events) {
      const details = event.details || {};
      if (event.eventType === "attempt_reserved") {
        replay.activeReservedUnits += Number(details.reservedUnits);
        replay.attemptCount += 1;
        replay.revision = Number(details.budgetRevisionAfter);
      }
      if (event.eventType === "attempt_settled"
        || event.eventType === "attempt_recovered") {
        replay.activeReservedUnits -= Number(details.reservedUnits);
        replay.consumedUnits += Number(details.chargedUnits);
        replay.revision = Number(details.budgetRevisionAfter);
        const key = {
          completed: "completedCount",
          failed: "failedCount",
          cancelled: "cancelledCount",
          timed_out: "timedOutCount",
          ambiguous: "ambiguousCount",
          abandoned_before_egress: "abandonedBeforeEgressCount",
        }[details.terminalStatus];
        if (!key) fail("PROVIDER_ATTEMPT_REPLAY_EVENT_INVALID", event.eventHash);
        replay[key] += 1;
      }
    }
    for (const [field, value] of Object.entries(replay)) {
      if (budget[field] !== value) fail("PROVIDER_ATTEMPT_REPLAY_PROJECTION_MISMATCH", field);
    }
    if (budget.auditSequence !== events.length
      || budget.lastEventHash !== verification.lastEventHash) {
      fail("PROVIDER_ATTEMPT_REPLAY_AUDIT_META_MISMATCH");
    }
    return result("replay-budget", {
      budget,
      replay,
      auditVerificationHash: verification.verificationHash,
      replayMatchesProjection: true,
    });
  }

  async function health() {
    assertOpen();
    const meta = database.prepare(`
      SELECT schema_version, adapter_version, schema_fingerprint_hash
        FROM sc_provider_attempt_store_meta WHERE singleton_id = 1
    `).get();
    const quickCheck = String(database.prepare("PRAGMA quick_check").get()?.quick_check || "");
    const foreignKeys = Number(database.prepare("PRAGMA foreign_keys").get()?.foreign_keys || 0);
    const synchronous = Number(database.prepare("PRAGMA synchronous").get()?.synchronous ?? -1);
    return freeze({
      schemaVersion: STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION,
      adapterVersion: STARCRAFT_TMG_SQLITE_PROVIDER_ATTEMPT_STORE_VERSION,
      storedSchemaVersion: meta?.schema_version || null,
      storedAdapterVersion: meta?.adapter_version || null,
      schemaFingerprintHash: meta?.schema_fingerprint_hash || null,
      adapter: "sqlite",
      journalMode,
      synchronous: synchronous === 2 ? "full" : String(synchronous),
      foreignKeysEnabled: foreignKeys === 1,
      quickCheck,
      durable: true,
      transactionMode: "begin_immediate",
      rawProviderMaterialRetained: false,
      automaticRetryAllowed: false,
      trainingTruth: false,
    });
  }

  async function close() {
    if (!closed) {
      database.close();
      closed = true;
    }
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.closed`,
      closed: true,
      trainingTruth: false,
    });
  }

  return assertStarcraftTmgProviderAttemptStoreV1(Object.freeze({
    initialize,
    openBudget,
    reserveAttempt,
    markAttemptDispatched,
    settleAttempt,
    recoverOpenAttempts,
    getBudget,
    getAttempt,
    readAudit,
    replayBudget,
    health,
    close,
  }));
}

export function isStarcraftTmgProviderAttemptTerminalV1(status) {
  return TERMINAL.has(status);
}
