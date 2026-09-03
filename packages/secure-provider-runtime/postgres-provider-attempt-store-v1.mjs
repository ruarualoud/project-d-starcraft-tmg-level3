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

export const STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_STORE_VERSION =
  "starcraft_tmg_postgres_provider_attempt_store_v1";

const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
export const STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_COLUMN_LAYOUT = Object.freeze({
  sc_provider_attempt_store_meta: [
    "singleton_id", "schema_version", "adapter_version", "schema_fingerprint_hash",
  ],
  sc_provider_budgets: [
    "budget_id", "budget_scope_hash", "principal_scope_hash", "session_binding_hash",
    "policy_hash", "policy_json", "max_total_units", "max_turns",
    "max_input_units_per_turn", "max_output_units_per_turn", "consumed_units",
    "active_reserved_units", "attempt_count", "completed_count", "failed_count",
    "cancelled_count", "timed_out_count", "ambiguous_count", "abandoned_count",
    "revision", "audit_sequence", "last_event_hash", "open_idempotency_key_hash",
    "open_request_hash", "open_result_json", "opened_at", "updated_at",
  ],
  sc_provider_attempts: [
    "attempt_id", "budget_id", "principal_scope_hash", "idempotency_key_hash",
    "consent_receipt_hash", "provider_profile_hash", "egress_policy_hash",
    "prompt_assembly_hash", "response_contract_hash", "request_hash", "intent",
    "input_units", "max_output_units", "reserved_units", "charged_units",
    "reported_input_units", "reported_output_units", "reported_total_units",
    "usage_known", "status", "revision", "retry_of_attempt_id",
    "retry_approval_receipt_hash", "reattachment_receipt_hash", "retry_attempt_id",
    "dispatch_binding_hash", "safe_provider_receipt_hash", "reserve_request_hash",
    "reserve_result_json", "dispatch_request_hash", "dispatch_result_json",
    "settle_request_hash", "settle_result_json", "reserved_at", "dispatched_at",
    "settled_at", "provider_may_have_been_called", "retry_authorization_required",
    "reattachment_required",
  ],
  sc_provider_attempt_audit: [
    "budget_id", "sequence", "event_hash", "previous_event_hash", "event_type",
    "attempt_id", "event_json",
  ],
  sc_provider_attempt_recoveries: [
    "recovery_idempotency_key_hash", "recovery_request_hash", "recovery_result_json",
    "recovered_at",
  ],
});

export const STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_SCHEMA_FINGERPRINT_HASH =
  hashStarcraftTmgProviderAttemptValueV1(
    STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_COLUMN_LAYOUT,
  );

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS sc_provider_attempt_store_meta (
    singleton_id SMALLINT PRIMARY KEY CHECK (singleton_id = 1),
    schema_version TEXT NOT NULL,
    adapter_version TEXT NOT NULL,
    schema_fingerprint_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sc_provider_budgets (
    budget_id TEXT PRIMARY KEY,
    budget_scope_hash TEXT NOT NULL UNIQUE,
    principal_scope_hash TEXT NOT NULL,
    session_binding_hash TEXT NOT NULL,
    policy_hash TEXT NOT NULL,
    policy_json JSONB NOT NULL,
    max_total_units BIGINT NOT NULL CHECK (max_total_units > 0),
    max_turns BIGINT NOT NULL CHECK (max_turns > 0),
    max_input_units_per_turn BIGINT NOT NULL CHECK (max_input_units_per_turn > 0),
    max_output_units_per_turn BIGINT NOT NULL CHECK (max_output_units_per_turn > 0),
    consumed_units BIGINT NOT NULL DEFAULT 0 CHECK (consumed_units >= 0),
    active_reserved_units BIGINT NOT NULL DEFAULT 0 CHECK (active_reserved_units >= 0),
    attempt_count BIGINT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    completed_count BIGINT NOT NULL DEFAULT 0 CHECK (completed_count >= 0),
    failed_count BIGINT NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
    cancelled_count BIGINT NOT NULL DEFAULT 0 CHECK (cancelled_count >= 0),
    timed_out_count BIGINT NOT NULL DEFAULT 0 CHECK (timed_out_count >= 0),
    ambiguous_count BIGINT NOT NULL DEFAULT 0 CHECK (ambiguous_count >= 0),
    abandoned_count BIGINT NOT NULL DEFAULT 0 CHECK (abandoned_count >= 0),
    revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
    audit_sequence BIGINT NOT NULL DEFAULT 0 CHECK (audit_sequence >= 0),
    last_event_hash TEXT,
    open_idempotency_key_hash TEXT NOT NULL,
    open_request_hash TEXT NOT NULL,
    open_result_json JSONB,
    opened_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  );

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
    input_units BIGINT NOT NULL CHECK (input_units > 0),
    max_output_units BIGINT NOT NULL CHECK (max_output_units > 0),
    reserved_units BIGINT NOT NULL CHECK (reserved_units > 0),
    charged_units BIGINT NOT NULL DEFAULT 0 CHECK (charged_units >= 0),
    reported_input_units BIGINT NOT NULL DEFAULT 0 CHECK (reported_input_units >= 0),
    reported_output_units BIGINT NOT NULL DEFAULT 0 CHECK (reported_output_units >= 0),
    reported_total_units BIGINT NOT NULL DEFAULT 0 CHECK (reported_total_units >= 0),
    usage_known BOOLEAN,
    status TEXT NOT NULL CHECK (status IN (
      'reserved','dispatched','completed','failed','cancelled','timed_out',
      'abandoned_before_egress','ambiguous'
    )),
    revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
    retry_of_attempt_id TEXT REFERENCES sc_provider_attempts(attempt_id),
    retry_approval_receipt_hash TEXT,
    reattachment_receipt_hash TEXT,
    retry_attempt_id TEXT REFERENCES sc_provider_attempts(attempt_id),
    dispatch_binding_hash TEXT,
    safe_provider_receipt_hash TEXT,
    reserve_request_hash TEXT NOT NULL,
    reserve_result_json JSONB,
    dispatch_request_hash TEXT,
    dispatch_result_json JSONB,
    settle_request_hash TEXT,
    settle_result_json JSONB,
    reserved_at TIMESTAMPTZ NOT NULL,
    dispatched_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    provider_may_have_been_called BOOLEAN NOT NULL DEFAULT FALSE,
    retry_authorization_required BOOLEAN NOT NULL DEFAULT FALSE,
    reattachment_required BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (budget_id, idempotency_key_hash)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS sc_provider_attempt_retry_once_idx
    ON sc_provider_attempts (retry_of_attempt_id)
    WHERE retry_of_attempt_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS sc_provider_attempt_open_idx
    ON sc_provider_attempts (status, budget_id, reserved_at, attempt_id);

  CREATE TABLE IF NOT EXISTS sc_provider_attempt_audit (
    budget_id TEXT NOT NULL REFERENCES sc_provider_budgets(budget_id),
    sequence BIGINT NOT NULL CHECK (sequence > 0),
    event_hash TEXT NOT NULL UNIQUE,
    previous_event_hash TEXT,
    event_type TEXT NOT NULL,
    attempt_id TEXT,
    event_json JSONB NOT NULL,
    PRIMARY KEY (budget_id, sequence)
  );

  CREATE TABLE IF NOT EXISTS sc_provider_attempt_recoveries (
    recovery_idempotency_key_hash TEXT PRIMARY KEY,
    recovery_request_hash TEXT NOT NULL,
    recovery_result_json JSONB NOT NULL,
    recovered_at TIMESTAMPTZ NOT NULL
  );
`;

function fail(code, detail = "") {
  throw new StarcraftTmgProviderAttemptStoreError(code, detail);
}

function parse(value) {
  if (value === null || value === undefined) return null;
  return typeof value === "string"
    ? JSON.parse(value) : cloneProviderAttemptValue(value);
}

function instant(value) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function bool(value) {
  return value === true || Number(value) === 1;
}

function freeze(value) {
  return deepFreezeProviderAttemptValue(cloneProviderAttemptValue(value));
}

function safeId(value, field) {
  const result = String(value || "").trim();
  if (!SAFE_ID.test(result)) fail("PROVIDER_ATTEMPT_ID_INVALID", field);
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
    openedAt: instant(row.opened_at),
    updatedAt: instant(row.updated_at),
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
    usageKnown: row.usage_known === null ? null : bool(row.usage_known),
    status: row.status,
    revision: Number(row.revision),
    retryOfAttemptId: row.retry_of_attempt_id,
    retryApprovalReceiptHash: row.retry_approval_receipt_hash,
    reattachmentReceiptHash: row.reattachment_receipt_hash,
    retryAttemptId: row.retry_attempt_id,
    dispatchBindingHash: row.dispatch_binding_hash,
    safeProviderReceiptHash: row.safe_provider_receipt_hash,
    reservedAt: instant(row.reserved_at),
    dispatchedAt: row.dispatched_at ? instant(row.dispatched_at) : null,
    settledAt: row.settled_at ? instant(row.settled_at) : null,
    providerMayHaveBeenCalled: bool(row.provider_may_have_been_called),
    retryAuthorizationRequired: bool(row.retry_authorization_required),
    credentialReattachRequired: bool(row.reattachment_required),
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

function assertPool(pool) {
  if (!pool || typeof pool.connect !== "function" || typeof pool.query !== "function") {
    throw new TypeError("PostgreSQL ProviderAttemptStore requires pool.connect() and pool.query()");
  }
  return pool;
}

export function createPostgresStarcraftTmgProviderAttemptStoreV1(options = {}) {
  const pool = assertPool(options.pool);
  const closePoolOnClose = options.closePoolOnClose === true;
  let closed = false;
  let initialized = false;
  let initializePromise = null;

  function assertOpen() {
    if (closed) fail("PROVIDER_ATTEMPT_STORE_CLOSED");
  }

  async function transaction(callback) {
    assertOpen();
    const client = await pool.connect();
    try {
      await client.query("/* sc_provider_attempt:begin */ BEGIN ISOLATION LEVEL SERIALIZABLE");
      const value = await callback(client);
      await client.query("/* sc_provider_attempt:commit */ COMMIT");
      return value;
    } catch (error) {
      try { await client.query("/* sc_provider_attempt:rollback */ ROLLBACK"); } catch {}
      if (error?.code === "40001" || error?.code === "40P01") {
        fail("PROVIDER_ATTEMPT_POSTGRES_SERIALIZATION_CONFLICT", error.code);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function selectBudget(queryable, budgetId, forUpdate = false) {
    const selected = await queryable.query(`/* sc_provider_attempt:select_budget${forUpdate ? "_for_update" : ""} */
      SELECT * FROM sc_provider_budgets WHERE budget_id = $1${forUpdate ? " FOR UPDATE" : ""}
    `, [budgetId]);
    return selected.rows[0] || null;
  }

  async function selectAttempt(queryable, attemptId, forUpdate = false) {
    const selected = await queryable.query(`/* sc_provider_attempt:select_attempt${forUpdate ? "_for_update" : ""} */
      SELECT * FROM sc_provider_attempts WHERE attempt_id = $1${forUpdate ? " FOR UPDATE" : ""}
    `, [attemptId]);
    return selected.rows[0] || null;
  }

  async function appendAudit(client, { budgetId, eventType, attemptId = null,
    occurredAt, details }) {
    const row = await selectBudget(client, budgetId, true);
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
    await client.query(`/* sc_provider_attempt:insert_audit */
      INSERT INTO sc_provider_attempt_audit
        (budget_id, sequence, event_hash, previous_event_hash, event_type, attempt_id, event_json)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
    `, [budgetId, event.sequence, event.eventHash, event.previousEventHash,
      event.eventType, event.attemptId, JSON.stringify(event)]);
    const changed = await client.query(`/* sc_provider_attempt:update_audit_head */
      UPDATE sc_provider_budgets
         SET audit_sequence = $1, last_event_hash = $2, updated_at = $3
       WHERE budget_id = $4 AND audit_sequence = $5
    `, [event.sequence, event.eventHash, occurredAt, budgetId, Number(row.audit_sequence)]);
    if (changed.rowCount !== 1) fail("PROVIDER_ATTEMPT_AUDIT_HEAD_CONFLICT");
    return event;
  }

  async function inspectSchema(queryable) {
    const observed = await queryable.query(`/* sc_provider_attempt:schema_layout */
      SELECT table_name, array_agg(column_name ORDER BY ordinal_position) AS columns
        FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = ANY($1::text[])
       GROUP BY table_name ORDER BY table_name
    `, [Object.keys(STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_COLUMN_LAYOUT).sort()]);
    const layout = Object.fromEntries(observed.rows.map((row) => [row.table_name,
      Array.isArray(row.columns) ? row.columns : String(row.columns || "")
        .replace(/^\{|\}$/gu, "").split(",").filter(Boolean)]));
    if (hashStarcraftTmgProviderAttemptValueV1(layout)
      !== STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_SCHEMA_FINGERPRINT_HASH) {
      fail("PROVIDER_ATTEMPT_POSTGRES_SCHEMA_VERSION_MISMATCH");
    }
  }

  async function initializeInternal() {
    await transaction(async (client) => {
      await client.query("/* sc_provider_attempt:init_lock */ SELECT pg_advisory_xact_lock(hashtext($1))",
        [STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_STORE_VERSION]);
      await client.query(`/* sc_provider_attempt:init_schema */ ${SCHEMA_SQL}`);
      await inspectSchema(client);
      await client.query(`/* sc_provider_attempt:insert_meta */
        INSERT INTO sc_provider_attempt_store_meta
          (singleton_id, schema_version, adapter_version, schema_fingerprint_hash)
        VALUES (1,$1,$2,$3) ON CONFLICT (singleton_id) DO NOTHING
      `, [STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION,
        STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_STORE_VERSION,
        STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_SCHEMA_FINGERPRINT_HASH]);
      const selected = await client.query(`/* sc_provider_attempt:select_meta_for_update */
        SELECT schema_version, adapter_version, schema_fingerprint_hash
          FROM sc_provider_attempt_store_meta WHERE singleton_id = 1 FOR UPDATE
      `);
      const meta = selected.rows[0];
      if (meta?.schema_version !== STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION
        || meta?.adapter_version !== STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_STORE_VERSION
        || meta?.schema_fingerprint_hash
          !== STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_SCHEMA_FINGERPRINT_HASH) {
        fail("PROVIDER_ATTEMPT_POSTGRES_SCHEMA_VERSION_MISMATCH");
      }
    });
    initialized = true;
  }

  async function ensureInitialized() {
    assertOpen();
    if (initialized) return;
    if (!initializePromise) {
      initializePromise = initializeInternal().catch((error) => {
        initializePromise = null;
        throw error;
      });
    }
    await initializePromise;
  }

  async function initialize() {
    await ensureInitialized();
    return health();
  }

  async function openBudget(input = {}) {
    const prepared = prepareStarcraftTmgProviderBudgetOpenV1(input);
    await ensureInitialized();
    return transaction(async (client) => {
      const existing = await selectBudget(client, prepared.budgetId, true);
      if (existing) {
        if (existing.open_request_hash !== prepared.openRequestHash) {
          fail("PROVIDER_BUDGET_IDEMPOTENCY_CONFLICT");
        }
        return freeze(parse(existing.open_result_json));
      }
      await client.query(`/* sc_provider_attempt:insert_budget */
        INSERT INTO sc_provider_budgets (
          budget_id, budget_scope_hash, principal_scope_hash, session_binding_hash,
          policy_hash, policy_json, max_total_units, max_turns,
          max_input_units_per_turn, max_output_units_per_turn,
          open_idempotency_key_hash, open_request_hash, opened_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$13)
      `, [prepared.budgetId, prepared.budgetScopeHash, prepared.principalScopeHash,
        prepared.sessionBindingHash, prepared.policy.policyHash,
        JSON.stringify(prepared.policy), prepared.policy.maxTotalUnits,
        prepared.policy.maxTurns, prepared.policy.maxInputUnitsPerTurn,
        prepared.policy.maxOutputUnitsPerTurn, prepared.idempotencyKeyHash,
        prepared.openRequestHash, prepared.openedAt]);
      const event = await appendAudit(client, {
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
        budget: rowBudget(await selectBudget(client, prepared.budgetId)),
        auditEventHash: event.eventHash,
      });
      await client.query(`/* sc_provider_attempt:update_open_result */
        UPDATE sc_provider_budgets SET open_result_json = $1::jsonb WHERE budget_id = $2
      `, [JSON.stringify(value), prepared.budgetId]);
      return value;
    });
  }

  async function reserveAttempt(input = {}) {
    const prepared = prepareStarcraftTmgProviderAttemptReservationV1(input);
    await ensureInitialized();
    return transaction(async (client) => {
      const existing = await selectAttempt(client, prepared.attemptId, true);
      if (existing) {
        if (existing.reserve_request_hash !== prepared.reservationRequestHash) {
          fail("PROVIDER_ATTEMPT_IDEMPOTENCY_CONFLICT");
        }
        return freeze(parse(existing.reserve_result_json));
      }
      const budget = await selectBudget(client, prepared.budgetId, true);
      if (!budget) fail("PROVIDER_BUDGET_NOT_FOUND");
      if (budget.principal_scope_hash !== prepared.principalScopeHash) {
        fail("PROVIDER_BUDGET_PRINCIPAL_SCOPE_MISMATCH");
      }
      if (Number(budget.revision) !== prepared.expectedBudgetRevision) {
        fail("PROVIDER_BUDGET_REVISION_CONFLICT");
      }
      if (prepared.reservedAt < instant(budget.opened_at)) {
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
      const unresolvedResult = await client.query(`/* sc_provider_attempt:select_unresolved */
        SELECT prior.attempt_id
          FROM sc_provider_attempts prior
          LEFT JOIN sc_provider_attempts retry ON retry.retry_of_attempt_id = prior.attempt_id
         WHERE prior.budget_id = $1 AND prior.status = 'ambiguous'
           AND retry.attempt_id IS NULL
         ORDER BY prior.attempt_id LIMIT 1 FOR UPDATE OF prior
      `, [prepared.budgetId]);
      const unresolved = unresolvedResult.rows[0] || null;
      if (prepared.retryOfAttemptId) {
        const prior = await selectAttempt(client, prepared.retryOfAttemptId, true);
        if (!prior || prior.budget_id !== prepared.budgetId || prior.status !== "ambiguous") {
          fail("PROVIDER_ATTEMPT_RETRY_SOURCE_INVALID");
        }
        if (prior.retry_attempt_id) fail("PROVIDER_ATTEMPT_RETRY_ALREADY_RESERVED");
        if (prepared.reservedAt < instant(prior.settled_at)) {
          fail("PROVIDER_ATTEMPT_TIME_ORDER_INVALID");
        }
      } else if (unresolved) {
        fail("PROVIDER_ATTEMPT_AMBIGUOUS_RETRY_APPROVAL_REQUIRED");
      }
      const before = Number(budget.revision);
      await client.query(`/* sc_provider_attempt:insert_attempt */
        INSERT INTO sc_provider_attempts (
          attempt_id, budget_id, principal_scope_hash, idempotency_key_hash,
          consent_receipt_hash, provider_profile_hash, egress_policy_hash,
          prompt_assembly_hash, response_contract_hash, request_hash, intent,
          input_units, max_output_units, reserved_units, status, retry_of_attempt_id,
          retry_approval_receipt_hash, reattachment_receipt_hash,
          reserve_request_hash, reserved_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'reserved',$15,$16,$17,$18,$19)
      `, [prepared.attemptId, prepared.budgetId, prepared.principalScopeHash,
        prepared.idempotencyKeyHash, prepared.consentReceiptHash,
        prepared.providerProfileHash, prepared.egressPolicyHash,
        prepared.promptAssemblyHash, prepared.responseContractHash,
        prepared.requestHash, prepared.intent, prepared.inputUnits,
        prepared.maxOutputUnits, prepared.reservedUnits, prepared.retryOfAttemptId,
        prepared.retryApprovalReceiptHash, prepared.reattachmentReceiptHash,
        prepared.reservationRequestHash, prepared.reservedAt]);
      if (prepared.retryOfAttemptId) {
        const linked = await client.query(`/* sc_provider_attempt:link_retry */
          UPDATE sc_provider_attempts SET retry_attempt_id = $1
           WHERE attempt_id = $2 AND status = 'ambiguous' AND retry_attempt_id IS NULL
        `, [prepared.attemptId, prepared.retryOfAttemptId]);
        if (linked.rowCount !== 1) fail("PROVIDER_ATTEMPT_RETRY_ALREADY_RESERVED");
      }
      const budgetChanged = await client.query(`/* sc_provider_attempt:update_budget_reserve */
        UPDATE sc_provider_budgets
           SET active_reserved_units = active_reserved_units + $1,
               attempt_count = attempt_count + 1, revision = revision + 1,
               updated_at = $2
         WHERE budget_id = $3 AND revision = $4
      `, [prepared.reservedUnits, prepared.reservedAt, prepared.budgetId, before]);
      if (budgetChanged.rowCount !== 1) fail("PROVIDER_BUDGET_REVISION_CONFLICT");
      const event = await appendAudit(client, {
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
        budget: rowBudget(await selectBudget(client, prepared.budgetId)),
        attempt: rowAttempt(await selectAttempt(client, prepared.attemptId)),
        auditEventHash: event.eventHash,
        egressAuthorized: false,
      });
      await client.query(`/* sc_provider_attempt:update_reserve_result */
        UPDATE sc_provider_attempts SET reserve_result_json = $1::jsonb WHERE attempt_id = $2
      `, [JSON.stringify(value), prepared.attemptId]);
      return value;
    });
  }

  async function markAttemptDispatched(input = {}) {
    const prepared = prepareStarcraftTmgProviderAttemptDispatchV1(input);
    await ensureInitialized();
    return transaction(async (client) => {
      const attempt = await selectAttempt(client, prepared.attemptId, true);
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
      if (prepared.dispatchedAt < instant(attempt.reserved_at)) {
        fail("PROVIDER_ATTEMPT_TIME_ORDER_INVALID");
      }
      const changed = await client.query(`/* sc_provider_attempt:update_dispatch */
        UPDATE sc_provider_attempts
           SET status = 'dispatched', revision = revision + 1,
               dispatch_binding_hash = $1, dispatch_request_hash = $2,
               dispatched_at = $3, provider_may_have_been_called = TRUE
         WHERE attempt_id = $4 AND status = 'reserved' AND revision = $5
      `, [prepared.dispatchBindingHash, prepared.dispatchRequestHash,
        prepared.dispatchedAt, prepared.attemptId, prepared.expectedAttemptRevision]);
      if (changed.rowCount !== 1) fail("PROVIDER_ATTEMPT_DISPATCH_REVISION_CONFLICT");
      const event = await appendAudit(client, {
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
        budget: rowBudget(await selectBudget(client, attempt.budget_id)),
        attempt: rowAttempt(await selectAttempt(client, prepared.attemptId)),
        auditEventHash: event.eventHash,
        egressAuthorized: true,
      });
      await client.query(`/* sc_provider_attempt:update_dispatch_result */
        UPDATE sc_provider_attempts SET dispatch_result_json = $1::jsonb WHERE attempt_id = $2
      `, [JSON.stringify(value), prepared.attemptId]);
      return value;
    });
  }

  async function settleAttempt(input = {}) {
    const prepared = prepareStarcraftTmgProviderAttemptSettlementV1(input);
    await ensureInitialized();
    return transaction(async (client) => {
      const attempt = await selectAttempt(client, prepared.attemptId, true);
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
      if (prepared.settledAt < instant(attempt.reserved_at)
        || (attempt.dispatched_at && prepared.settledAt < instant(attempt.dispatched_at))) {
        fail("PROVIDER_ATTEMPT_TIME_ORDER_INVALID");
      }
      if (prepared.usageKnown && prepared.totalUnits > Number(attempt.reserved_units)) {
        fail("PROVIDER_ATTEMPT_USAGE_EXCEEDS_RESERVATION");
      }
      const budget = await selectBudget(client, attempt.budget_id, true);
      const budgetBefore = Number(budget.revision);
      const attemptAfter = Number(attempt.revision) + 1;
      const chargedUnits = prepared.usageKnown
        ? prepared.totalUnits : Number(attempt.reserved_units);
      const changed = await client.query(`/* sc_provider_attempt:update_settle */
        UPDATE sc_provider_attempts
           SET status = $1, revision = $2, charged_units = $3,
               reported_input_units = $4, reported_output_units = $5,
               reported_total_units = $6, usage_known = $7,
               safe_provider_receipt_hash = $8, settle_request_hash = $9,
               settled_at = $10, retry_authorization_required = FALSE,
               reattachment_required = FALSE
         WHERE attempt_id = $11 AND status = $12 AND revision = $13
      `, [prepared.terminalStatus, attemptAfter, chargedUnits,
        prepared.inputUnits, prepared.outputUnits, prepared.totalUnits,
        prepared.usageKnown, prepared.safeProviderReceiptHash,
        prepared.settlementRequestHash, prepared.settledAt, prepared.attemptId,
        attempt.status, prepared.expectedAttemptRevision]);
      if (changed.rowCount !== 1) fail("PROVIDER_ATTEMPT_SETTLEMENT_REVISION_CONFLICT");
      const column = counterColumn(prepared.terminalStatus);
      const budgetChanged = await client.query(`/* sc_provider_attempt:update_budget_settle */
        UPDATE sc_provider_budgets
           SET active_reserved_units = active_reserved_units - $1,
               consumed_units = consumed_units + $2,
               ${column} = ${column} + 1,
               revision = revision + 1, updated_at = $3
         WHERE budget_id = $4 AND revision = $5 AND active_reserved_units >= $1
      `, [Number(attempt.reserved_units), chargedUnits, prepared.settledAt,
        attempt.budget_id, budgetBefore]);
      if (budgetChanged.rowCount !== 1) fail("PROVIDER_BUDGET_SETTLEMENT_CONFLICT");
      const event = await appendAudit(client, {
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
        budget: rowBudget(await selectBudget(client, attempt.budget_id)),
        attempt: rowAttempt(await selectAttempt(client, prepared.attemptId)),
        auditEventHash: event.eventHash,
      });
      await client.query(`/* sc_provider_attempt:update_settle_result */
        UPDATE sc_provider_attempts SET settle_result_json = $1::jsonb WHERE attempt_id = $2
      `, [JSON.stringify(value), prepared.attemptId]);
      return value;
    });
  }

  async function recoverOpenAttempts(input = {}) {
    const prepared = prepareStarcraftTmgProviderAttemptRecoveryV1(input);
    await ensureInitialized();
    return transaction(async (client) => {
      const duplicate = await client.query(`/* sc_provider_attempt:select_recovery_for_update */
        SELECT recovery_request_hash, recovery_result_json
          FROM sc_provider_attempt_recoveries
         WHERE recovery_idempotency_key_hash = $1 FOR UPDATE
      `, [prepared.recoveryIdempotencyKeyHash]);
      if (duplicate.rows[0]) {
        if (duplicate.rows[0].recovery_request_hash !== prepared.recoveryRequestHash) {
          fail("PROVIDER_ATTEMPT_RECOVERY_IDEMPOTENCY_CONFLICT");
        }
        return freeze(parse(duplicate.rows[0].recovery_result_json));
      }
      await client.query(`/* sc_provider_attempt:lock_recovery_budgets */
        SELECT budget_id FROM sc_provider_budgets
         WHERE EXISTS (
           SELECT 1 FROM sc_provider_attempts
            WHERE sc_provider_attempts.budget_id = sc_provider_budgets.budget_id
              AND status IN ('reserved','dispatched')
         ) ORDER BY budget_id FOR UPDATE
      `);
      const openResult = await client.query(`/* sc_provider_attempt:select_open_for_update */
        SELECT * FROM sc_provider_attempts
         WHERE status IN ('reserved','dispatched')
         ORDER BY budget_id, reserved_at, attempt_id FOR UPDATE
      `);
      const open = openResult.rows;
      if (open.some((attempt) => prepared.recoveredAt < instant(attempt.reserved_at)
        || (attempt.dispatched_at
          && prepared.recoveredAt < instant(attempt.dispatched_at)))) {
        fail("PROVIDER_ATTEMPT_TIME_ORDER_INVALID");
      }
      const recovered = [];
      for (const attempt of open) {
        const ambiguous = attempt.status === "dispatched";
        const terminalStatus = ambiguous ? "ambiguous" : "abandoned_before_egress";
        const chargedUnits = ambiguous ? Number(attempt.reserved_units) : 0;
        const budget = await selectBudget(client, attempt.budget_id);
        const budgetBefore = Number(budget.revision);
        const attemptAfter = Number(attempt.revision) + 1;
        const attemptChanged = await client.query(`/* sc_provider_attempt:update_recovered_attempt */
          UPDATE sc_provider_attempts
             SET status = $1, revision = $2, charged_units = $3, usage_known = $4,
                 settled_at = $5, retry_authorization_required = $6,
                 reattachment_required = $6
           WHERE attempt_id = $7 AND status = $8 AND revision = $9
        `, [terminalStatus, attemptAfter, chargedUnits, !ambiguous,
          prepared.recoveredAt, ambiguous, attempt.attempt_id, attempt.status,
          Number(attempt.revision)]);
        if (attemptChanged.rowCount !== 1) fail("PROVIDER_ATTEMPT_RECOVERY_CONFLICT");
        const column = counterColumn(terminalStatus);
        const budgetChanged = await client.query(`/* sc_provider_attempt:update_budget_recovery */
          UPDATE sc_provider_budgets
             SET active_reserved_units = active_reserved_units - $1,
                 consumed_units = consumed_units + $2,
                 ${column} = ${column} + 1,
                 revision = revision + 1, updated_at = $3
           WHERE budget_id = $4 AND revision = $5 AND active_reserved_units >= $1
        `, [Number(attempt.reserved_units), chargedUnits, prepared.recoveredAt,
          attempt.budget_id, budgetBefore]);
        if (budgetChanged.rowCount !== 1) fail("PROVIDER_BUDGET_RECOVERY_CONFLICT");
        const event = await appendAudit(client, {
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
          attempt: rowAttempt(await selectAttempt(client, attempt.attempt_id)),
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
      await client.query(`/* sc_provider_attempt:insert_recovery */
        INSERT INTO sc_provider_attempt_recoveries (
          recovery_idempotency_key_hash, recovery_request_hash,
          recovery_result_json, recovered_at
        ) VALUES ($1,$2,$3::jsonb,$4)
      `, [prepared.recoveryIdempotencyKeyHash, prepared.recoveryRequestHash,
        JSON.stringify(value), prepared.recoveredAt]);
      return value;
    });
  }

  async function getBudget(budgetIdInput) {
    await ensureInitialized();
    return rowBudget(await selectBudget(pool, safeId(budgetIdInput, "budgetId")));
  }

  async function getAttempt(attemptIdInput) {
    await ensureInitialized();
    return rowAttempt(await selectAttempt(pool, safeId(attemptIdInput, "attemptId")));
  }

  async function readAudit(input = {}) {
    await ensureInitialized();
    exactFields(input, ["budgetId", "afterSequence", "limit"],
      "PROVIDER_ATTEMPT_AUDIT_READ_FIELDS_INVALID");
    const budgetId = safeId(input.budgetId, "budgetId");
    if (!await selectBudget(pool, budgetId)) fail("PROVIDER_BUDGET_NOT_FOUND");
    const afterSequence = boundedInteger(input.afterSequence ?? 0, "afterSequence");
    const limit = boundedInteger(input.limit ?? 100, "limit", 1, 1_000);
    const selected = await pool.query(`/* sc_provider_attempt:read_audit */
      SELECT event_json FROM sc_provider_attempt_audit
       WHERE budget_id = $1 AND sequence > $2 ORDER BY sequence LIMIT $3
    `, [budgetId, afterSequence, limit + 1]);
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.audit-page`,
      budgetId,
      events: selected.rows.slice(0, limit).map((row) => parse(row.event_json)),
      nextSequence: selected.rows.length > limit
        ? Number(parse(selected.rows[limit - 1].event_json).sequence) : null,
      trainingTruth: false,
    });
  }

  async function replayBudget(budgetIdInput) {
    await ensureInitialized();
    const budgetId = safeId(budgetIdInput, "budgetId");
    const budget = rowBudget(await selectBudget(pool, budgetId));
    if (!budget) fail("PROVIDER_BUDGET_NOT_FOUND");
    const selected = await pool.query(`/* sc_provider_attempt:read_audit_all */
      SELECT event_json FROM sc_provider_attempt_audit
       WHERE budget_id = $1 ORDER BY sequence
    `, [budgetId]);
    const events = selected.rows.map((row) => parse(row.event_json));
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
      if (budget[field] !== value) {
        fail("PROVIDER_ATTEMPT_REPLAY_PROJECTION_MISMATCH", field);
      }
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
    await ensureInitialized();
    const selected = await pool.query(`/* sc_provider_attempt:health */
      SELECT schema_version, adapter_version, schema_fingerprint_hash,
        (SELECT COUNT(*) FROM sc_provider_budgets) AS budget_count,
        (SELECT COUNT(*) FROM sc_provider_attempts) AS attempt_count,
        (SELECT COUNT(*) FROM sc_provider_attempt_audit) AS audit_count
      FROM sc_provider_attempt_store_meta WHERE singleton_id = 1
    `);
    const meta = selected.rows[0];
    if (!meta
      || meta.schema_version !== STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION
      || meta.adapter_version !== STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_STORE_VERSION
      || meta.schema_fingerprint_hash
        !== STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_SCHEMA_FINGERPRINT_HASH) {
      fail("PROVIDER_ATTEMPT_POSTGRES_SCHEMA_VERSION_MISMATCH");
    }
    return freeze({
      schemaVersion: STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION,
      adapterVersion: STARCRAFT_TMG_POSTGRES_PROVIDER_ATTEMPT_STORE_VERSION,
      storedSchemaVersion: meta.schema_version,
      storedAdapterVersion: meta.adapter_version,
      schemaFingerprintHash: meta.schema_fingerprint_hash,
      adapter: "postgresql",
      transactionMode: "serializable",
      budgetLock: "select_for_update",
      attemptLock: "select_for_update",
      databaseRetries: 0,
      budgetCount: Number(meta.budget_count),
      attemptCount: Number(meta.attempt_count),
      auditCount: Number(meta.audit_count),
      durable: true,
      rawProviderMaterialRetained: false,
      automaticRetryAllowed: false,
      trainingTruth: false,
    });
  }

  async function close() {
    if (!closed) {
      closed = true;
      if (closePoolOnClose && typeof pool.end === "function") await pool.end();
    }
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.closed`,
      closed: true,
      poolClosed: closePoolOnClose,
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
