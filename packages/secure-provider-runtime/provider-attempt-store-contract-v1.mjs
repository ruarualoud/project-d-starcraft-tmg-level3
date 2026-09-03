import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION =
  "starcraft_tmg_provider_attempt_store_v1";

export const STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_METHODS = Object.freeze([
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
]);

const HASH = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
const INTENTS = new Set(["chat", "explain", "take_turn", "commentate", "reflect"]);
const TERMINAL = new Set(["completed", "failed", "cancelled", "timed_out"]);
const POLICY_FIELDS = new Set([
  "schemaVersion",
  "maxTotalUnits",
  "maxTurns",
  "maxInputUnitsPerTurn",
  "maxOutputUnitsPerTurn",
  "timeoutMs",
  "cancellationSettlement",
  "timeoutSettlement",
  "automaticRetryAllowed",
  "currency",
  "trainingTruth",
  "policyHash",
]);
const OPEN_FIELDS = new Set([
  "principalScopeHash",
  "sessionBindingHash",
  "policy",
  "idempotencyKeyHash",
  "openedAt",
]);
const RESERVE_FIELDS = new Set([
  "budgetId",
  "principalScopeHash",
  "expectedBudgetRevision",
  "idempotencyKeyHash",
  "consentReceiptHash",
  "providerProfileHash",
  "egressPolicyHash",
  "promptAssemblyHash",
  "responseContractHash",
  "requestHash",
  "intent",
  "inputUnits",
  "maxOutputUnits",
  "reservedAt",
  "retryOfAttemptId",
  "retryApprovalReceiptHash",
  "reattachmentReceiptHash",
]);
const DISPATCH_FIELDS = new Set([
  "attemptId",
  "expectedAttemptRevision",
  "dispatchBindingHash",
  "dispatchedAt",
]);
const SETTLE_FIELDS = new Set([
  "attemptId",
  "expectedAttemptRevision",
  "terminalStatus",
  "usageKnown",
  "inputUnits",
  "outputUnits",
  "safeProviderReceiptHash",
  "settledAt",
]);
const RECOVERY_FIELDS = new Set([
  "recoveryIdempotencyKeyHash",
  "recoveredAt",
]);
const SENSITIVE_KEY = /^(?:api.?key|authorization|bearer|cookie|credential(?:bytes|value|material)|secret(?:value|material)|access.?token|refresh.?token)$/iu;
const SENSITIVE_VALUE = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\bsk-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|authorization|credential|secret)\s*[:=]\s*[^\s,;}]{6,}/iu;

export class StarcraftTmgProviderAttemptStoreError extends Error {
  constructor(code, detail = "") {
    super(detail ? `${code}:${detail}` : code);
    this.name = "StarcraftTmgProviderAttemptStoreError";
    this.code = code;
  }
}

function fail(code, detail = "") {
  throw new StarcraftTmgProviderAttemptStoreError(code, detail);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneProviderAttemptValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function deepFreezeProviderAttemptValue(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeProviderAttemptValue(child);
  return Object.freeze(value);
}

function exactFields(value, allowed, code) {
  if (!object(value)) fail(code);
  const extras = Object.keys(value).filter((key) => !allowed.has(key)).sort();
  if (extras.length) fail(code, extras.join(","));
}

function assertNoCredentialMaterial(value, seen = new Set()) {
  if (typeof value === "string") {
    if (SENSITIVE_VALUE.test(value)) fail("PROVIDER_ATTEMPT_CREDENTIAL_MATERIAL_FORBIDDEN");
    return;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const child of value) assertNoCredentialMaterial(child, seen);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) fail("PROVIDER_ATTEMPT_CREDENTIAL_MATERIAL_FORBIDDEN", key);
    assertNoCredentialMaterial(child, seen);
  }
}

function requiredString(value, field, maximum = 240) {
  const result = String(value || "").trim();
  if (!result || result.length > maximum) fail("PROVIDER_ATTEMPT_FIELD_INVALID", field);
  return result;
}

function safeId(value, field) {
  const result = requiredString(value, field);
  if (!SAFE_ID.test(result)) fail("PROVIDER_ATTEMPT_ID_INVALID", field);
  return result;
}

function hash(value, field) {
  const result = requiredString(value, field, 64).toLowerCase();
  if (!HASH.test(result)) fail("PROVIDER_ATTEMPT_HASH_INVALID", field);
  return result;
}

function integer(value, field, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
    fail("PROVIDER_ATTEMPT_INTEGER_INVALID", field);
  }
  return result;
}

function isoInstant(value, field) {
  let result;
  try {
    result = new Date(value).toISOString();
  } catch {
    fail("PROVIDER_ATTEMPT_TIME_INVALID", field);
  }
  if (result !== value) fail("PROVIDER_ATTEMPT_TIME_INVALID", field);
  return result;
}

function optionalHash(value, field) {
  return value === undefined || value === null ? null : hash(value, field);
}

function optionalId(value, field) {
  return value === undefined || value === null ? null : safeId(value, field);
}

function seal(body, hashField) {
  const cloned = cloneProviderAttemptValue(body);
  return deepFreezeProviderAttemptValue({
    ...cloned,
    [hashField]: hashStarcraftTmgContract(cloned),
  });
}

export function assertStarcraftTmgProviderBudgetPolicyV1(value) {
  exactFields(value, POLICY_FIELDS, "PROVIDER_BUDGET_POLICY_FIELDS_INVALID");
  const unsigned = {
    schemaVersion: requiredString(value.schemaVersion, "policy.schemaVersion"),
    maxTotalUnits: integer(value.maxTotalUnits, "policy.maxTotalUnits", {
      minimum: 1,
      maximum: 100_000_000,
    }),
    maxTurns: integer(value.maxTurns, "policy.maxTurns", {
      minimum: 1,
      maximum: 100_000,
    }),
    maxInputUnitsPerTurn: integer(value.maxInputUnitsPerTurn,
      "policy.maxInputUnitsPerTurn", { minimum: 1, maximum: 1_000_000 }),
    maxOutputUnitsPerTurn: integer(value.maxOutputUnitsPerTurn,
      "policy.maxOutputUnitsPerTurn", { minimum: 1, maximum: 1_000_000 }),
    timeoutMs: integer(value.timeoutMs, "policy.timeoutMs", {
      minimum: 1,
      maximum: 300_000,
    }),
    cancellationSettlement: requiredString(value.cancellationSettlement,
      "policy.cancellationSettlement"),
    timeoutSettlement: requiredString(value.timeoutSettlement,
      "policy.timeoutSettlement"),
    automaticRetryAllowed: value.automaticRetryAllowed,
    currency: requiredString(value.currency, "policy.currency", 64),
    trainingTruth: value.trainingTruth,
  };
  if (unsigned.schemaVersion !== "starcraft_tmg_provider_budget_policy_v1"
    || unsigned.cancellationSettlement !== "consume_full_reservation_when_usage_is_unknown"
    || unsigned.timeoutSettlement !== "consume_full_reservation_when_usage_is_unknown"
    || unsigned.automaticRetryAllowed !== false
    || unsigned.currency !== "provider_units"
    || unsigned.trainingTruth !== false
    || unsigned.maxInputUnitsPerTurn + unsigned.maxOutputUnitsPerTurn
      > unsigned.maxTotalUnits) {
    fail("PROVIDER_BUDGET_POLICY_INVALID");
  }
  const normalized = seal(unsigned, "policyHash");
  if (normalized.policyHash !== value.policyHash) fail("PROVIDER_BUDGET_POLICY_HASH_MISMATCH");
  return normalized;
}

export function prepareStarcraftTmgProviderBudgetOpenV1(input = {}) {
  assertNoCredentialMaterial(input);
  exactFields(input, OPEN_FIELDS, "PROVIDER_BUDGET_OPEN_FIELDS_INVALID");
  const principalScopeHash = hash(input.principalScopeHash, "principalScopeHash");
  const sessionBindingHash = hash(input.sessionBindingHash, "sessionBindingHash");
  const budgetScopeHash = hashStarcraftTmgContract({ principalScopeHash, sessionBindingHash });
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.budget-open`,
    budgetId: `sc-provider-budget-${budgetScopeHash}`,
    budgetScopeHash,
    principalScopeHash,
    sessionBindingHash,
    policy: assertStarcraftTmgProviderBudgetPolicyV1(input.policy),
    idempotencyKeyHash: hash(input.idempotencyKeyHash, "idempotencyKeyHash"),
    openedAt: isoInstant(input.openedAt, "openedAt"),
    trainingTruth: false,
  };
  return seal(body, "openRequestHash");
}

export function prepareStarcraftTmgProviderAttemptReservationV1(input = {}) {
  assertNoCredentialMaterial(input);
  exactFields(input, RESERVE_FIELDS, "PROVIDER_ATTEMPT_RESERVE_FIELDS_INVALID");
  const budgetId = safeId(input.budgetId, "budgetId");
  const idempotencyKeyHash = hash(input.idempotencyKeyHash, "idempotencyKeyHash");
  const retryOfAttemptId = optionalId(input.retryOfAttemptId, "retryOfAttemptId");
  const retryApprovalReceiptHash = optionalHash(input.retryApprovalReceiptHash,
    "retryApprovalReceiptHash");
  const reattachmentReceiptHash = optionalHash(input.reattachmentReceiptHash,
    "reattachmentReceiptHash");
  if (Boolean(retryOfAttemptId) !== Boolean(retryApprovalReceiptHash)
    || Boolean(retryOfAttemptId) !== Boolean(reattachmentReceiptHash)) {
    fail("PROVIDER_ATTEMPT_RETRY_LINEAGE_INCOMPLETE");
  }
  const intent = requiredString(input.intent, "intent", 32).toLowerCase();
  if (!INTENTS.has(intent)) fail("PROVIDER_ATTEMPT_INTENT_INVALID");
  const inputUnits = integer(input.inputUnits, "inputUnits", {
    minimum: 1,
    maximum: 1_000_000,
  });
  const maxOutputUnits = integer(input.maxOutputUnits, "maxOutputUnits", {
    minimum: 1,
    maximum: 1_000_000,
  });
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.reservation`,
    attemptId: `sc-provider-attempt-${hashStarcraftTmgContract({ budgetId, idempotencyKeyHash })}`,
    budgetId,
    principalScopeHash: hash(input.principalScopeHash, "principalScopeHash"),
    expectedBudgetRevision: integer(input.expectedBudgetRevision,
      "expectedBudgetRevision", { maximum: 10_000_000 }),
    idempotencyKeyHash,
    consentReceiptHash: hash(input.consentReceiptHash, "consentReceiptHash"),
    providerProfileHash: hash(input.providerProfileHash, "providerProfileHash"),
    egressPolicyHash: hash(input.egressPolicyHash, "egressPolicyHash"),
    promptAssemblyHash: hash(input.promptAssemblyHash, "promptAssemblyHash"),
    responseContractHash: hash(input.responseContractHash, "responseContractHash"),
    requestHash: hash(input.requestHash, "requestHash"),
    intent,
    inputUnits,
    maxOutputUnits,
    reservedUnits: inputUnits + maxOutputUnits,
    reservedAt: isoInstant(input.reservedAt, "reservedAt"),
    retryOfAttemptId,
    retryApprovalReceiptHash,
    reattachmentReceiptHash,
    automaticRetryAllowed: false,
    trainingTruth: false,
  };
  return seal(body, "reservationRequestHash");
}

export function prepareStarcraftTmgProviderAttemptDispatchV1(input = {}) {
  assertNoCredentialMaterial(input);
  exactFields(input, DISPATCH_FIELDS, "PROVIDER_ATTEMPT_DISPATCH_FIELDS_INVALID");
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.dispatch`,
    attemptId: safeId(input.attemptId, "attemptId"),
    expectedAttemptRevision: integer(input.expectedAttemptRevision,
      "expectedAttemptRevision", { maximum: 10_000_000 }),
    dispatchBindingHash: hash(input.dispatchBindingHash, "dispatchBindingHash"),
    dispatchedAt: isoInstant(input.dispatchedAt, "dispatchedAt"),
    egressMayStartOnlyAfterCommit: true,
    trainingTruth: false,
  };
  return seal(body, "dispatchRequestHash");
}

export function prepareStarcraftTmgProviderAttemptSettlementV1(input = {}) {
  assertNoCredentialMaterial(input);
  exactFields(input, SETTLE_FIELDS, "PROVIDER_ATTEMPT_SETTLE_FIELDS_INVALID");
  const terminalStatus = requiredString(input.terminalStatus, "terminalStatus", 32);
  if (!TERMINAL.has(terminalStatus)) fail("PROVIDER_ATTEMPT_TERMINAL_STATUS_INVALID");
  if (typeof input.usageKnown !== "boolean") fail("PROVIDER_ATTEMPT_USAGE_KNOWN_INVALID");
  const inputUnits = integer(input.inputUnits, "inputUnits", { maximum: 1_000_000 });
  const outputUnits = integer(input.outputUnits, "outputUnits", { maximum: 1_000_000 });
  if (!input.usageKnown && (inputUnits !== 0 || outputUnits !== 0)) {
    fail("PROVIDER_ATTEMPT_UNKNOWN_USAGE_MUST_BE_ZERO");
  }
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.settlement`,
    attemptId: safeId(input.attemptId, "attemptId"),
    expectedAttemptRevision: integer(input.expectedAttemptRevision,
      "expectedAttemptRevision", { maximum: 10_000_000 }),
    terminalStatus,
    usageKnown: input.usageKnown,
    inputUnits,
    outputUnits,
    totalUnits: inputUnits + outputUnits,
    safeProviderReceiptHash: hash(input.safeProviderReceiptHash,
      "safeProviderReceiptHash"),
    settledAt: isoInstant(input.settledAt, "settledAt"),
    automaticRetryAllowed: false,
    trainingTruth: false,
  };
  return seal(body, "settlementRequestHash");
}

export function prepareStarcraftTmgProviderAttemptRecoveryV1(input = {}) {
  assertNoCredentialMaterial(input);
  exactFields(input, RECOVERY_FIELDS, "PROVIDER_ATTEMPT_RECOVERY_FIELDS_INVALID");
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.recovery`,
    recoveryIdempotencyKeyHash: hash(input.recoveryIdempotencyKeyHash,
      "recoveryIdempotencyKeyHash"),
    recoveredAt: isoInstant(input.recoveredAt, "recoveredAt"),
    reservedRecovery: "abandoned_before_egress_zero_charge",
    dispatchedRecovery: "ambiguous_full_reservation_charge",
    ambiguousRetry: "explicit_same_user_approval_and_credential_reattach_required",
    automaticRetryAllowed: false,
    trainingTruth: false,
  };
  return seal(body, "recoveryRequestHash");
}

export function createStarcraftTmgProviderAttemptAuditEventV1(input = {}) {
  const sequence = integer(input.sequence, "sequence", { minimum: 1, maximum: 10_000_000 });
  const previousEventHash = input.previousEventHash === null && sequence === 1
    ? null
    : hash(input.previousEventHash, "previousEventHash");
  if ((sequence === 1) !== (previousEventHash === null)) {
    fail("PROVIDER_ATTEMPT_AUDIT_PREVIOUS_HASH_INVALID");
  }
  const body = {
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.audit-event`,
    budgetId: safeId(input.budgetId, "budgetId"),
    sequence,
    previousEventHash,
    eventType: safeId(input.eventType, "eventType"),
    attemptId: input.attemptId === null || input.attemptId === undefined
      ? null : safeId(input.attemptId, "attemptId"),
    occurredAt: isoInstant(input.occurredAt, "occurredAt"),
    details: cloneProviderAttemptValue(input.details || {}),
    rawProviderMaterialRetained: false,
    trainingTruth: false,
  };
  assertNoCredentialMaterial(body.details);
  return seal(body, "eventHash");
}

export function verifyStarcraftTmgProviderAttemptAuditChainV1(events = []) {
  let previous = null;
  for (const [index, event] of events.entries()) {
    if (!object(event)
      || event.sequence !== index + 1
      || event.previousEventHash !== previous
      || event.eventHash !== hashStarcraftTmgContract(
        Object.fromEntries(Object.entries(event).filter(([key]) => key !== "eventHash")))) {
      fail("PROVIDER_ATTEMPT_AUDIT_CHAIN_INVALID", String(index + 1));
    }
    previous = event.eventHash;
  }
  return seal({
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION}.audit-verification`,
    eventCount: events.length,
    lastEventHash: previous,
    replayHash: hashStarcraftTmgContract(events),
    trainingTruth: false,
  }, "verificationHash");
}

export function assertStarcraftTmgProviderAttemptStoreV1(store) {
  for (const method of STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_METHODS) {
    if (typeof store?.[method] !== "function") {
      fail("PROVIDER_ATTEMPT_STORE_METHOD_MISSING", method);
    }
  }
  return store;
}

export function hashStarcraftTmgProviderAttemptValueV1(value) {
  return hashStarcraftTmgContract(value);
}
