import { randomUUID } from "node:crypto";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_GATEWAY_SUPERVISOR_VERSION =
  "starcraft_tmg_provider_gateway_supervisor_v1";
export const STARCRAFT_TMG_PROVIDER_GATEWAY_USAGE_VERSION =
  "starcraft_tmg_provider_gateway_usage_receipt_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/u;
const SAFE_FAILURE_PATTERN = /^[a-z][a-z0-9_]{1,63}$/u;
const INTENT_SET = new Set(["chat", "explain", "take_turn", "commentate", "reflect"]);
const TERMINAL_TURN_STATES = new Set([
  "completed",
  "cancelled",
  "timed_out",
  "failed",
]);
const SEND_FIELDS = new Set([
  "sessionId",
  "roomId",
  "expectedConnectionEpoch",
  "providerProfileRef",
  "promptAssemblyRef",
  "boundedRequest",
  "responseContract",
]);
const READ_FIELDS = new Set([
  "sessionId",
  "roomId",
  "expectedConnectionEpoch",
]);
const CANCEL_FIELDS = new Set([
  "sessionId",
  "roomId",
  "expectedConnectionEpoch",
  "turnId",
]);
const REF_FIELDS = new Set(["id", "version", "hash"]);
const REQUEST_FIELDS = new Set([
  "schemaVersion",
  "intent",
  "requestPayloadHash",
  "inputUnits",
  "maxOutputUnits",
  "requestHash",
]);
const USAGE_FIELDS = new Set([
  "schemaVersion",
  "reservationId",
  "status",
  "inputUnits",
  "outputUnits",
  "totalUnits",
  "providerRequestIdHash",
  "finishedAt",
  "receiptHash",
]);
const GATEWAY_RESULT_FIELDS = new Set(["output", "usageReceipt"]);
const SENSITIVE_KEY_PATTERN = /(?:api.?key|authorization|bearer|cookie|credential|secret|access.?token|refresh.?token)/iu;
const MAX_SAFE_OUTPUT_BYTES = 64 * 1024;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field, maximum = 240) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  if (normalized.length > maximum) throw new TypeError(`${field} exceeds ${maximum} characters`);
  return normalized;
}

function safeId(value, field) {
  const normalized = requiredString(value, field, 200);
  if (!SAFE_ID_PATTERN.test(normalized)) throw new TypeError(`${field} has an invalid format`);
  return normalized;
}

function hash(value, field) {
  const normalized = requiredString(value, field, 64).toLowerCase();
  if (!HASH_PATTERN.test(normalized)) throw new TypeError(`${field} must be a sha256 hash`);
  return normalized;
}

function positiveInteger(value, field, maximum = Number.MAX_SAFE_INTEGER) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1 || normalized > maximum) {
    throw new TypeError(`${field} must be a positive safe integer at most ${maximum}`);
  }
  return normalized;
}

function nonNegativeInteger(value, field, maximum = Number.MAX_SAFE_INTEGER) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0 || normalized > maximum) {
    throw new TypeError(`${field} must be a non-negative safe integer at most ${maximum}`);
  }
  return normalized;
}

function isoInstant(value, field) {
  const normalized = new Date(value).toISOString();
  if (!Number.isFinite(Date.parse(normalized))) throw new TypeError(`${field} must be an ISO-8601 instant`);
  return normalized;
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const forbiddenFields = Object.keys(value).filter((field) => !allowed.has(field)).sort();
  if (forbiddenFields.length) {
    throw Object.assign(new TypeError(`${label} contains forbidden fields`), {
      code: "forbidden_supervisor_field",
      forbiddenFields,
    });
  }
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function rejection(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_GATEWAY_SUPERVISOR_VERSION}.rejection`,
    reason,
    ...clone(details),
    trainingTruth: false,
  });
}

function containsSensitiveKey(value, seen = new Set()) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((entry) => containsSensitiveKey(entry, seen));
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) return true;
    if (containsSensitiveKey(child, seen)) return true;
  }
  return false;
}

function normalizeRef(value, field) {
  exactFields(value, REF_FIELDS, field);
  return deepFreeze({
    id: safeId(value.id, `${field}.id`),
    version: requiredString(value.version, `${field}.version`, 120),
    hash: hash(value.hash, `${field}.hash`),
  });
}

function normalizeBoundedRequest(value) {
  exactFields(value, REQUEST_FIELDS, "boundedRequest");
  const unsigned = {
    schemaVersion: requiredString(value.schemaVersion, "boundedRequest.schemaVersion"),
    intent: requiredString(value.intent, "boundedRequest.intent", 32).toLowerCase(),
    requestPayloadHash: hash(value.requestPayloadHash,
      "boundedRequest.requestPayloadHash"),
    inputUnits: positiveInteger(value.inputUnits, "boundedRequest.inputUnits", 1_000_000),
    maxOutputUnits: positiveInteger(value.maxOutputUnits,
      "boundedRequest.maxOutputUnits", 1_000_000),
  };
  if (!INTENT_SET.has(unsigned.intent)) {
    throw new TypeError(`unsupported boundedRequest.intent: ${unsigned.intent}`);
  }
  const normalized = seal(unsigned, "requestHash");
  if (normalized.requestHash !== value.requestHash) {
    throw new TypeError("boundedRequest integrity mismatch");
  }
  return normalized;
}

function normalizeBudgetPolicy(value = {}) {
  const unsigned = {
    schemaVersion: "starcraft_tmg_provider_budget_policy_v1",
    maxTotalUnits: positiveInteger(value.maxTotalUnits, "budgetPolicy.maxTotalUnits", 100_000_000),
    maxTurns: positiveInteger(value.maxTurns, "budgetPolicy.maxTurns", 100_000),
    maxInputUnitsPerTurn: positiveInteger(value.maxInputUnitsPerTurn,
      "budgetPolicy.maxInputUnitsPerTurn", 1_000_000),
    maxOutputUnitsPerTurn: positiveInteger(value.maxOutputUnitsPerTurn,
      "budgetPolicy.maxOutputUnitsPerTurn", 1_000_000),
    timeoutMs: positiveInteger(value.timeoutMs, "budgetPolicy.timeoutMs", 300_000),
    cancellationSettlement: "consume_full_reservation_when_usage_is_unknown",
    timeoutSettlement: "consume_full_reservation_when_usage_is_unknown",
    automaticRetryAllowed: false,
    currency: "provider_units",
    trainingTruth: false,
  };
  if (unsigned.maxInputUnitsPerTurn + unsigned.maxOutputUnitsPerTurn
    > unsigned.maxTotalUnits) {
    throw new TypeError("per-turn Provider budget exceeds total session budget");
  }
  return seal(unsigned, "policyHash");
}

function normalizeSafeOutput(value) {
  if (!object(value)) throw new TypeError("Provider Gateway output must be an object");
  if (containsSensitiveKey(value)) {
    throw new TypeError("Provider Gateway output contains credential-shaped fields");
  }
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > MAX_SAFE_OUTPUT_BYTES) {
    throw new TypeError(`Provider Gateway output exceeds ${MAX_SAFE_OUTPUT_BYTES} bytes`);
  }
  const output = clone(value);
  return deepFreeze({
    value: output,
    outputHash: hashStarcraftTmgContract(output),
  });
}

export function createStarcraftTmgProviderGatewayUsageReceiptV1(input = {}) {
  const reservation = input.reservation;
  if (!object(reservation)) throw new TypeError("reservation is required");
  const inputUnits = nonNegativeInteger(input.inputUnits, "inputUnits", 1_000_000);
  const outputUnits = nonNegativeInteger(input.outputUnits, "outputUnits", 1_000_000);
  const totalUnits = inputUnits + outputUnits;
  if (totalUnits > reservation.reservedUnits) {
    throw new TypeError("Provider usage exceeds the server reservation");
  }
  const status = requiredString(input.status || "completed", "status", 32).toLowerCase();
  if (!["completed", "failed", "cancelled", "timed_out"].includes(status)) {
    throw new TypeError(`unsupported Provider usage status: ${status}`);
  }
  return seal({
    schemaVersion: STARCRAFT_TMG_PROVIDER_GATEWAY_USAGE_VERSION,
    reservationId: safeId(reservation.reservationId, "reservation.reservationId"),
    status,
    inputUnits,
    outputUnits,
    totalUnits,
    providerRequestIdHash: hash(input.providerRequestIdHash,
      "providerRequestIdHash"),
    finishedAt: isoInstant(input.finishedAt, "finishedAt"),
  }, "receiptHash");
}

function normalizeUsageReceipt(value, reservation) {
  exactFields(value, USAGE_FIELDS, "usageReceipt");
  if (value.schemaVersion !== STARCRAFT_TMG_PROVIDER_GATEWAY_USAGE_VERSION) {
    throw new TypeError("Provider usage receipt schema mismatch");
  }
  if (value.reservationId !== reservation.reservationId) {
    throw new TypeError("Provider usage receipt reservation mismatch");
  }
  const normalized = createStarcraftTmgProviderGatewayUsageReceiptV1({
    reservation,
    status: value.status,
    inputUnits: value.inputUnits,
    outputUnits: value.outputUnits,
    providerRequestIdHash: value.providerRequestIdHash,
    finishedAt: value.finishedAt,
  });
  if (normalized.totalUnits !== value.totalUnits
    || normalized.receiptHash !== value.receiptHash) {
    throw new TypeError("Provider usage receipt integrity mismatch");
  }
  return normalized;
}

function safeFailure(error, fallback = "provider_gateway_failed") {
  const raw = String(error?.code || "").trim().toLowerCase();
  return deepFreeze({
    code: SAFE_FAILURE_PATTERN.test(raw) ? raw : fallback,
    retryable: false,
    messageExposed: false,
  });
}

function createLedger(policy) {
  return {
    policy,
    consumedUnits: 0,
    activeReservationUnits: 0,
    turnCount: 0,
    completedTurns: 0,
    failedTurns: 0,
    cancelledTurns: 0,
    timedOutTurns: 0,
  };
}

function projectBudget(ledger) {
  return seal({
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_GATEWAY_SUPERVISOR_VERSION}.budget`,
    policy: ledger.policy,
    consumedUnits: ledger.consumedUnits,
    activeReservationUnits: ledger.activeReservationUnits,
    remainingUnits: Math.max(0,
      ledger.policy.maxTotalUnits - ledger.consumedUnits - ledger.activeReservationUnits),
    turnCount: ledger.turnCount,
    completedTurns: ledger.completedTurns,
    failedTurns: ledger.failedTurns,
    cancelledTurns: ledger.cancelledTurns,
    timedOutTurns: ledger.timedOutTurns,
    trainingTruth: false,
  }, "budgetHash");
}

function projectTurn(record) {
  if (!record) return null;
  return seal({
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_GATEWAY_SUPERVISOR_VERSION}.turn`,
    turnId: record.turnId,
    turnSequence: record.turnSequence,
    turnRevision: record.turnRevision,
    state: record.state,
    sessionId: record.sessionId,
    sessionBindingHash: record.sessionBindingHash,
    connectionEpoch: record.connectionEpoch,
    providerProfileRef: record.providerProfileRef,
    promptAssemblyRef: record.promptAssemblyRef,
    responseContract: record.responseContract,
    requestHash: record.boundedRequest.requestHash,
    intent: record.boundedRequest.intent,
    reservation: record.reservation,
    chargedUnits: record.chargedUnits,
    outputHash: record.outputHash,
    usageReceiptHash: record.usageReceipt?.receiptHash || null,
    failure: record.failure,
    startedAt: record.startedAt,
    terminalAt: record.terminalAt,
    timeoutAt: record.timeoutAt,
    attemptCount: 1,
    automaticallyRetried: false,
    lateResultStatus: record.lateResultStatus,
    lateResultCount: record.lateResultCount,
    lateOutputHash: record.lateOutputHash,
    eligibleForTraining: false,
    reviewStatus: record.state === "completed" ? "raw" : "rejected",
    trainingTruth: false,
  }, "turnHash");
}

function projectState(session, ledger, record, gatewayConfigured, gatewayEvidence) {
  return seal({
    schemaVersion: `${STARCRAFT_TMG_PROVIDER_GATEWAY_SUPERVISOR_VERSION}.viewer-state`,
    sessionId: session.sessionId,
    sessionRevision: session.sessionRevision,
    sessionBindingHash: session.binding.sessionBindingHash,
    connectionEpoch: session.connection.epoch,
    lifecycleState: session.lifecycleState,
    provider: {
      state: gatewayConfigured ? "configured" : "provider_not_configured",
      gatewayEvidence,
      credentialInputs: [],
      credentialsVisible: false,
      liveProviderClaim: false,
    },
    budget: projectBudget(ledger),
    currentTurn: projectTurn(record),
    concurrentTurnsPerSession: 1,
    reconnectMayResumeProviderRequest: false,
    productionReady: false,
    trainingTruth: false,
  }, "stateHash");
}

function lifecycleInput(input) {
  return {
    sessionId: input.sessionId,
    roomId: input.roomId,
    ...(input.expectedConnectionEpoch === undefined ? {}
      : { expectedConnectionEpoch: input.expectedConnectionEpoch }),
  };
}

export function createStarcraftTmgProviderGatewaySupervisorV1(options = {}) {
  const sessionLifecycle = options.sessionLifecycle;
  if (!sessionLifecycle || typeof sessionLifecycle.readSession !== "function") {
    throw new TypeError("sessionLifecycle.readSession is required");
  }
  const providerGateway = options.providerGateway;
  if (providerGateway !== undefined && typeof providerGateway?.complete !== "function") {
    throw new TypeError("providerGateway.complete must be a function when configured");
  }
  const configuredPolicy = options.budgetPolicy;
  const resolveBudgetPolicy = typeof options.resolveBudgetPolicy === "function"
    ? options.resolveBudgetPolicy
    : () => configuredPolicy;
  if (!configuredPolicy && typeof options.resolveBudgetPolicy !== "function") {
    throw new TypeError("budgetPolicy or resolveBudgetPolicy is required");
  }
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const createId = typeof options.createId === "function"
    ? options.createId
    : () => `sc-agent-turn-${randomUUID()}`;
  const scheduler = options.scheduler || {
    schedule(handler, timeoutMs) { return setTimeout(handler, timeoutMs); },
    cancel(handle) { clearTimeout(handle); },
  };
  if (typeof scheduler.schedule !== "function" || typeof scheduler.cancel !== "function") {
    throw new TypeError("scheduler requires schedule and cancel functions");
  }
  const gatewayEvidence = providerGateway
    ? requiredString(options.gatewayEvidence || "configured_unverified_gateway",
      "gatewayEvidence", 120)
    : "not_configured";
  const ledgers = new Map();
  const turns = new Map();
  const turnIds = new Set();

  function metadata() {
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_GATEWAY_SUPERVISOR_VERSION}.metadata`,
      gatewayState: providerGateway ? "configured" : "provider_not_configured",
      gatewayEvidence,
      gatewayCredentialInputs: [],
      directProviderTransportAccepted: false,
      concurrentTurnsPerSession: 1,
      automaticRetryAllowed: false,
      cancellationUsesAbortSignal: true,
      lateCompletionPolicy: "hash_and_quarantine_without_state_reentry",
      unknownUsageSettlement: "consume_full_reservation",
      liveProviderClaim: false,
      productionReady: false,
      trainingTruth: false,
    });
  }

  function turnId() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = safeId(createId("turn"), "server turn id");
      if (!turnIds.has(candidate)) {
        turnIds.add(candidate);
        return candidate;
      }
    }
    throw new Error("server turn id allocation exhausted");
  }

  function ledgerFor(session) {
    let ledger = ledgers.get(session.sessionId);
    if (!ledger) {
      const policy = normalizeBudgetPolicy(resolveBudgetPolicy({
        sessionId: session.sessionId,
        mode: session.binding.mode,
        characterId: session.binding.character.id,
        sessionBindingHash: session.binding.sessionBindingHash,
      }));
      ledger = createLedger(policy);
      ledgers.set(session.sessionId, ledger);
    }
    return ledger;
  }

  async function authenticatedSession(input, context) {
    const result = await sessionLifecycle.readSession(lifecycleInput(input), context);
    if (!result?.ok) return { rejection: result || rejection("session_authentication_failed") };
    return { session: result.session };
  }

  function stateResult(session, ledger, record) {
    return projectState(session, ledger, record,
      Boolean(providerGateway), gatewayEvidence);
  }

  function reservationFor(session, recordId, request, ledger, startedAt) {
    const reservedUnits = request.inputUnits + request.maxOutputUnits;
    const unsigned = {
      schemaVersion: "starcraft_tmg_provider_budget_reservation_v1",
      reservationId: `sc-provider-reservation-${hashStarcraftTmgContract({
        sessionId: session.sessionId,
        turnId: recordId,
        requestHash: request.requestHash,
        policyHash: ledger.policy.policyHash,
      })}`,
      sessionId: session.sessionId,
      turnId: recordId,
      requestHash: request.requestHash,
      policyHash: ledger.policy.policyHash,
      inputUnits: request.inputUnits,
      maxOutputUnits: request.maxOutputUnits,
      reservedUnits,
      currency: ledger.policy.currency,
      reservedAt: startedAt,
      trainingTruth: false,
    };
    return seal(unsigned, "reservationHash");
  }

  function canReserve(ledger, request) {
    if (ledger.turnCount >= ledger.policy.maxTurns) {
      return rejection("provider_turn_budget_exhausted");
    }
    if (request.inputUnits > ledger.policy.maxInputUnitsPerTurn) {
      return rejection("provider_input_budget_exceeded");
    }
    if (request.maxOutputUnits > ledger.policy.maxOutputUnitsPerTurn) {
      return rejection("provider_output_budget_exceeded");
    }
    const requested = request.inputUnits + request.maxOutputUnits;
    if (ledger.consumedUnits + ledger.activeReservationUnits + requested
      > ledger.policy.maxTotalUnits) {
      return rejection("provider_total_budget_exceeded");
    }
    return null;
  }

  function settleBudget(record, chargedUnits) {
    if (record.budgetSettled) return;
    const ledger = record.ledger;
    ledger.activeReservationUnits -= record.reservation.reservedUnits;
    const charge = nonNegativeInteger(chargedUnits, "chargedUnits",
      record.reservation.reservedUnits);
    ledger.consumedUnits += charge;
    record.chargedUnits = charge;
    record.budgetSettled = true;
  }

  function completionReceipt(record) {
    return seal({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_GATEWAY_SUPERVISOR_VERSION}.turn-receipt`,
      turnId: record.turnId,
      turnSequence: record.turnSequence,
      turnRevision: record.turnRevision,
      sessionId: record.sessionId,
      sessionBindingHash: record.sessionBindingHash,
      connectionEpoch: record.connectionEpoch,
      state: record.state,
      requestHash: record.boundedRequest.requestHash,
      reservationHash: record.reservation.reservationHash,
      chargedUnits: record.chargedUnits,
      outputHash: record.outputHash,
      usageReceiptHash: record.usageReceipt?.receiptHash || null,
      failure: record.failure,
      terminalAt: record.terminalAt,
      automaticallyRetried: false,
      eligibleForTraining: false,
      reviewStatus: record.state === "completed" ? "raw" : "rejected",
      trainingTruth: false,
    }, "receiptHash");
  }

  function finalResponse(record, output = undefined) {
    const state = stateResult(record.session, record.ledger, record);
    if (record.state === "completed") {
      return deepFreeze({
        ok: true,
        output: clone(output),
        usageReceipt: record.usageReceipt,
        turn: projectTurn(record),
        receipt: record.completionReceipt,
        state,
      });
    }
    return rejection(record.failure?.code || record.state, {
      turn: projectTurn(record),
      receipt: record.completionReceipt,
      state,
    });
  }

  function finalize(record, state, fields = {}) {
    if (TERMINAL_TURN_STATES.has(record.state)) return finalResponse(record);
    scheduler.cancel(record.timeoutHandle);
    record.turnRevision += 1;
    record.state = state;
    record.terminalAt = isoInstant(fields.terminalAt || now(), "terminalAt");
    record.outputHash = fields.outputHash || null;
    record.usageReceipt = fields.usageReceipt || null;
    record.failure = fields.failure || null;
    settleBudget(record, fields.chargedUnits === undefined
      ? record.reservation.reservedUnits
      : fields.chargedUnits);
    if (state === "completed") record.ledger.completedTurns += 1;
    if (state === "failed") record.ledger.failedTurns += 1;
    if (state === "cancelled") record.ledger.cancelledTurns += 1;
    if (state === "timed_out") record.ledger.timedOutTurns += 1;
    record.completionReceipt = completionReceipt(record);
    return finalResponse(record, fields.output);
  }

  function interrupt(record, state) {
    if (record.state !== "waiting_provider") return finalResponse(record);
    record.abortController.abort(state);
    const response = finalize(record, state, {
      failure: deepFreeze({ code: state, retryable: false, messageExposed: false }),
    });
    record.resolveControl(response);
    return response;
  }

  function quarantineLate(record, outcome) {
    record.turnRevision += 1;
    record.lateResultCount += 1;
    record.lateResultStatus = "quarantined_after_terminal_state";
    if (outcome.kind === "resolved") {
      try {
        exactFields(outcome.value, GATEWAY_RESULT_FIELDS, "Provider Gateway result");
        const output = normalizeSafeOutput(outcome.value.output);
        record.lateOutputHash = output.outputHash;
      } catch {
        record.lateResultStatus = "unsafe_result_quarantined_after_terminal_state";
      }
    } else {
      record.lateResultStatus = "late_failure_quarantined_after_terminal_state";
    }
  }

  async function settleGatewayOutcome(record, outcome, context) {
    if (record.state !== "waiting_provider") {
      quarantineLate(record, outcome);
      return finalResponse(record);
    }
    if (outcome.kind === "rejected") {
      return finalize(record, "failed", {
        failure: safeFailure(outcome.error),
      });
    }
    let safeOutput;
    let usageReceipt;
    try {
      exactFields(outcome.value, GATEWAY_RESULT_FIELDS, "Provider Gateway result");
      safeOutput = normalizeSafeOutput(outcome.value.output);
      usageReceipt = normalizeUsageReceipt(outcome.value.usageReceipt,
        record.reservation);
      if (usageReceipt.status !== "completed") {
        throw new TypeError("successful Provider result requires completed usage");
      }
    } catch {
      return finalize(record, "failed", {
        failure: deepFreeze({
          code: "unsafe_provider_result",
          retryable: false,
          messageExposed: false,
        }),
      });
    }
    let current;
    try {
      current = await sessionLifecycle.readSession({
        sessionId: record.sessionId,
        roomId: record.roomId,
        expectedConnectionEpoch: record.connectionEpoch,
      }, context);
    } catch {
      current = null;
    }
    if (record.state !== "waiting_provider") {
      quarantineLate(record, outcome);
      return finalResponse(record);
    }
    if (!current?.ok || current.session.lifecycleState !== "active"
      || current.session.binding.sessionBindingHash !== record.sessionBindingHash) {
      record.outputHash = safeOutput.outputHash;
      return finalize(record, "failed", {
        outputHash: safeOutput.outputHash,
        usageReceipt,
        chargedUnits: usageReceipt.totalUnits,
        failure: deepFreeze({
          code: "session_fence_changed",
          retryable: false,
          messageExposed: false,
        }),
      });
    }
    return finalize(record, "completed", {
      output: safeOutput.value,
      outputHash: safeOutput.outputHash,
      usageReceipt,
      chargedUnits: usageReceipt.totalUnits,
    });
  }

  async function readState(input = {}, context = {}) {
    try {
      exactFields(input, READ_FIELDS, "readState input");
      const authenticated = await authenticatedSession(input, context);
      if (authenticated.rejection) return authenticated.rejection;
      const session = authenticated.session;
      const ledger = ledgerFor(session);
      return deepFreeze({
        ok: true,
        state: stateResult(session, ledger, turns.get(session.sessionId) || null),
      });
    } catch (error) {
      return rejection(error?.code || "invalid_provider_supervisor_request", {
        ...(Array.isArray(error?.forbiddenFields)
          ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  async function sendTurn(input = {}, context = {}) {
    try {
      exactFields(input, SEND_FIELDS, "sendTurn input");
      const authenticated = await authenticatedSession(input, context);
      if (authenticated.rejection) return authenticated.rejection;
      const session = authenticated.session;
      const ledger = ledgerFor(session);
      const current = turns.get(session.sessionId);
      if (session.lifecycleState !== "active") {
        return rejection("session_ended", {
          state: stateResult(session, ledger, current || null),
        });
      }
      if (current?.state === "waiting_provider") {
        return rejection("turn_already_in_flight", {
          turn: projectTurn(current),
          state: stateResult(session, ledger, current),
        });
      }
      const providerProfileRef = normalizeRef(input.providerProfileRef,
        "providerProfileRef");
      const promptAssemblyRef = normalizeRef(input.promptAssemblyRef,
        "promptAssemblyRef");
      const responseContract = normalizeRef(input.responseContract,
        "responseContract");
      const boundedRequest = normalizeBoundedRequest(input.boundedRequest);
      if (!providerGateway) {
        return rejection("provider_not_configured", {
          state: stateResult(session, ledger, current || null),
        });
      }
      const denied = canReserve(ledger, boundedRequest);
      if (denied) {
        return rejection(denied.reason, {
          state: stateResult(session, ledger, current || null),
        });
      }
      const startedAt = isoInstant(now(), "startedAt");
      const recordId = turnId();
      const reservation = reservationFor(session, recordId,
        boundedRequest, ledger, startedAt);
      let resolveControl;
      const controlPromise = new Promise((resolve) => { resolveControl = resolve; });
      const abortController = new AbortController();
      const record = {
        turnId: recordId,
        turnSequence: ledger.turnCount + 1,
        turnRevision: 0,
        state: "waiting_provider",
        sessionId: session.sessionId,
        roomId: session.binding.roomId,
        sessionBindingHash: session.binding.sessionBindingHash,
        connectionEpoch: session.connection.epoch,
        providerProfileRef,
        promptAssemblyRef,
        responseContract,
        boundedRequest,
        reservation,
        ledger,
        session,
        abortController,
        resolveControl,
        timeoutHandle: null,
        startedAt,
        timeoutAt: new Date(Date.parse(startedAt) + ledger.policy.timeoutMs).toISOString(),
        terminalAt: null,
        chargedUnits: null,
        outputHash: null,
        usageReceipt: null,
        failure: null,
        completionReceipt: null,
        budgetSettled: false,
        lateResultStatus: "none",
        lateResultCount: 0,
        lateOutputHash: null,
      };
      ledger.activeReservationUnits += reservation.reservedUnits;
      ledger.turnCount += 1;
      turns.set(session.sessionId, record);
      record.timeoutHandle = scheduler.schedule(() => {
        interrupt(record, "timed_out");
      }, ledger.policy.timeoutMs);

      const gatewayInput = Object.freeze({
        schemaVersion: "starcraft_tmg_provider_gateway_request_v1",
        providerProfileRef,
        promptAssemblyRef,
        boundedRequest,
        responseContract,
        budgetReservation: reservation,
        signal: abortController.signal,
      });
      const gatewayOutcome = Promise.resolve().then(async () => {
        if (abortController.signal.aborted) {
          throw Object.assign(new Error("Provider request aborted before dispatch"), {
            code: "provider_request_aborted",
          });
        }
        try {
          return { kind: "resolved", value: await providerGateway.complete(gatewayInput) };
        } catch (error) {
          return { kind: "rejected", error };
        }
      });
      const processedOutcome = gatewayOutcome.then((outcome) =>
        settleGatewayOutcome(record, outcome, context));
      return await Promise.race([processedOutcome, controlPromise]);
    } catch (error) {
      return rejection(error?.code || "invalid_provider_supervisor_request", {
        ...(Array.isArray(error?.forbiddenFields)
          ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  async function cancelTurn(input = {}, context = {}) {
    try {
      exactFields(input, CANCEL_FIELDS, "cancelTurn input");
      const authenticated = await authenticatedSession(input, context);
      if (authenticated.rejection) return authenticated.rejection;
      const session = authenticated.session;
      const ledger = ledgerFor(session);
      const record = turns.get(session.sessionId);
      if (!record || record.turnId !== input.turnId) {
        return rejection("turn_not_found", {
          state: stateResult(session, ledger, record || null),
        });
      }
      if (record.state !== "waiting_provider") {
        return deepFreeze({
          ok: true,
          idempotentReplay: true,
          turn: projectTurn(record),
          receipt: record.completionReceipt,
          state: stateResult(session, ledger, record),
        });
      }
      const response = interrupt(record, "cancelled");
      return deepFreeze({ ...response, idempotentReplay: false });
    } catch (error) {
      return rejection(error?.code || "invalid_provider_supervisor_request", {
        ...(Array.isArray(error?.forbiddenFields)
          ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  return Object.freeze({
    metadata,
    readState,
    sendTurn,
    cancelTurn,
  });
}
