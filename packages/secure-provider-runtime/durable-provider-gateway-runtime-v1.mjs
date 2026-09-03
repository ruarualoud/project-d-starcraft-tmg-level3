import {
  createStarcraftTmgProviderGatewayUsageReceiptV1,
} from "../online-agent-session/provider-gateway-supervisor-v1.mjs";
import {
  assertStarcraftTmgProviderAttemptStoreV1,
  hashStarcraftTmgProviderAttemptValueV1,
} from "./provider-attempt-store-contract-v1.mjs";

export const STARCRAFT_TMG_DURABLE_PROVIDER_GATEWAY_RUNTIME_VERSION =
  "starcraft_tmg_durable_provider_gateway_runtime_v1";

const HASH = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
const INITIALIZE_FIELDS = new Set([
  "recoveryIdempotencyKeyHash", "recoveredAt",
]);
const GATEWAY_FIELDS = new Set([
  "schemaVersion", "providerProfileRef", "promptAssemblyRef",
  "boundedRequest", "responseContract", "budgetReservation", "signal",
]);
const AUTHORITY_FIELDS = new Set([
  "schemaVersion", "roomId", "sessionId", "sessionBindingHash",
  "principalScopeHash", "connectionEpoch", "budgetOpenedAt", "budgetPolicy",
  "trainingTruth",
]);
const REF_FIELDS = new Set(["id", "version", "hash"]);
const TERMINAL_FAILURES = new Set(["failed", "cancelled", "timed_out"]);
const SENSITIVE_KEY =
  /(?:api.?key|authorization|bearer|cookie|credential|secret|access.?token|refresh.?token)/iu;
const SENSITIVE_VALUE =
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\bsk-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|authorization|credential|secret)\s*[:=]\s*[^\s,;}]{6,}/iu;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const extras = Object.keys(value).filter((field) => !allowed.has(field)).sort();
  if (extras.length) throw new TypeError(`${label} contains forbidden fields: ${extras.join(",")}`);
}

function requiredString(value, field, maximum = 240) {
  const result = String(value || "").trim();
  if (!result || result.length > maximum) throw new TypeError(`${field} is invalid`);
  return result;
}

function safeId(value, field) {
  const result = requiredString(value, field);
  if (!SAFE_ID.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function hash(value, field) {
  const result = requiredString(value, field, 64).toLowerCase();
  if (!HASH.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function positiveInteger(value, field, maximum = Number.MAX_SAFE_INTEGER) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1 || result > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  return result;
}

function isoInstant(value, field) {
  const result = new Date(value).toISOString();
  if (result !== value) throw new TypeError(`${field} is invalid`);
  return result;
}

function normalizeRef(value, field) {
  exactFields(value, REF_FIELDS, field);
  return freeze({
    id: safeId(value.id, `${field}.id`),
    version: requiredString(value.version, `${field}.version`, 120),
    hash: hash(value.hash, `${field}.hash`),
  });
}

function containsSensitiveMaterial(value, seen = new Set()) {
  if (typeof value === "string") return SENSITIVE_VALUE.test(value);
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some((entry) => containsSensitiveMaterial(entry, seen));
  }
  return Object.entries(value).some(([key, child]) =>
    SENSITIVE_KEY.test(key) || containsSensitiveMaterial(child, seen));
}

function seal(body, hashField) {
  const value = clone(body);
  return freeze({
    ...value,
    [hashField]: hashStarcraftTmgProviderAttemptValueV1(value),
  });
}

function safeFailureCode(value, fallback = "provider_gateway_failed") {
  const result = String(value || "").trim().toLowerCase();
  return /^[a-z][a-z0-9_]{1,63}$/u.test(result) ? result : fallback;
}

function failureStatus(signal) {
  const reason = String(signal?.reason || "").toLowerCase();
  if (reason === "cancelled") return "cancelled";
  if (reason === "timed_out") return "timed_out";
  return "failed";
}

export class StarcraftTmgDurableProviderGatewayError extends Error {
  constructor(code, { safeUsageReceipt = null, durableReceipt = null } = {}) {
    super(code);
    this.name = "StarcraftTmgDurableProviderGatewayError";
    this.code = safeFailureCode(code);
    this.safeUsageReceipt = safeUsageReceipt;
    this.durableReceipt = durableReceipt;
  }
}

function assertDependencies(options) {
  const attemptStore = assertStarcraftTmgProviderAttemptStoreV1(
    options.attemptStore);
  if (typeof options.promptArtifactStore?.resolve !== "function") {
    throw new TypeError("promptArtifactStore.resolve is required");
  }
  if (typeof options.attachmentControl?.resolveExecutionAttachment !== "function") {
    throw new TypeError("attachmentControl.resolveExecutionAttachment is required");
  }
  if (typeof options.workerPort?.complete !== "function") {
    throw new TypeError("workerPort.complete is required");
  }
  if (typeof options.executionAuthorityPort?.resolve !== "function") {
    throw new TypeError("executionAuthorityPort.resolve is required");
  }
  return {
    attemptStore,
    promptArtifactStore: options.promptArtifactStore,
    attachmentControl: options.attachmentControl,
    workerPort: options.workerPort,
    executionAuthorityPort: options.executionAuthorityPort,
  };
}

function normalizeAuthority(value) {
  exactFields(value, AUTHORITY_FIELDS, "Provider execution authority");
  if (value.schemaVersion
      !== "starcraft_tmg_provider_gateway_execution_scope_v1.authority"
    || value.trainingTruth !== false) {
    throw new TypeError("Provider execution authority schema is invalid");
  }
  return freeze({
    schemaVersion: value.schemaVersion,
    roomId: safeId(value.roomId, "authority.roomId"),
    sessionId: safeId(value.sessionId, "authority.sessionId"),
    sessionBindingHash: hash(value.sessionBindingHash,
      "authority.sessionBindingHash"),
    principalScopeHash: hash(value.principalScopeHash,
      "authority.principalScopeHash"),
    connectionEpoch: positiveInteger(value.connectionEpoch,
      "authority.connectionEpoch", 10_000_000),
    budgetOpenedAt: isoInstant(value.budgetOpenedAt,
      "authority.budgetOpenedAt"),
    budgetPolicy: clone(value.budgetPolicy),
    trainingTruth: false,
  });
}

function normalizeGatewayInput(value) {
  exactFields(value, GATEWAY_FIELDS, "Provider Gateway input");
  if (value.schemaVersion !== "starcraft_tmg_provider_gateway_request_v1") {
    throw new TypeError("Provider Gateway input schema is invalid");
  }
  if (!object(value.boundedRequest) || !object(value.budgetReservation)
    || !object(value.responseContract)) {
    throw new TypeError("Provider Gateway input contracts are required");
  }
  if (value.signal !== undefined && value.signal !== null
    && (typeof value.signal !== "object"
      || typeof value.signal.addEventListener !== "function")) {
    throw new TypeError("Provider Gateway signal is invalid");
  }
  return {
    providerProfileRef: normalizeRef(value.providerProfileRef,
      "providerProfileRef"),
    promptAssemblyRef: normalizeRef(value.promptAssemblyRef,
      "promptAssemblyRef"),
    responseContract: normalizeRef(value.responseContract,
      "responseContract"),
    boundedRequest: value.boundedRequest,
    budgetReservation: value.budgetReservation,
    signal: value.signal || null,
  };
}

function resolvePrompt(store, input, authority) {
  const resolved = store.resolve(input.promptAssemblyRef);
  const artifact = resolved?.artifact;
  if (resolved?.ok !== true || !object(artifact)
    || artifact.promptArtifactHash !== input.promptAssemblyRef.hash
    || input.boundedRequest.requestPayloadHash !== artifact.promptArtifactHash
    || artifact.sessionId !== authority.sessionId
    || artifact.sessionBindingHash !== authority.sessionBindingHash
    || artifact.responseContract?.contractHash !== input.responseContract.hash
    || artifact.trainingTruth !== false) {
    throw new StarcraftTmgDurableProviderGatewayError(
      "provider_prompt_artifact_rejected");
  }
  const userNodes = artifact.nodes.filter((entry) => entry?.nodeType === "user-message");
  if (userNodes.length !== 1 || typeof userNodes[0]?.content?.text !== "string") {
    throw new StarcraftTmgDurableProviderGatewayError(
      "provider_prompt_artifact_rejected");
  }
  if (containsSensitiveMaterial(artifact)) {
    throw new StarcraftTmgDurableProviderGatewayError(
      "provider_prompt_artifact_rejected");
  }
  return { artifact, userMessage: userNodes[0].content.text };
}

function providerRequest({ attemptId, artifact, userMessage, gateway }) {
  const contract = artifact.responseContract;
  return freeze({
    schemaVersion: "starcraft_tmg_direct_provider_request_v1",
    requestId: attemptId,
    intent: requiredString(gateway.boundedRequest.intent, "intent", 32),
    promptPack: requiredString(artifact.promptPack, "promptPack", 200),
    promptNodes: artifact.nodes.filter((entry) =>
      entry.nodeType !== "user-message"),
    userMessage,
    responseContract: {
      allowedChannels: clone(contract.allowedChannels),
      decisionCandidateSource: requiredString(
        contract.decisionCandidateSource,
        "responseContract.decisionCandidateSource", 200),
    },
    maxOutputUnits: positiveInteger(gateway.boundedRequest.maxOutputUnits,
      "boundedRequest.maxOutputUnits", 1_000_000),
  });
}

function localSafeReceipt(code, details = {}) {
  return seal({
    schemaVersion:
      `${STARCRAFT_TMG_DURABLE_PROVIDER_GATEWAY_RUNTIME_VERSION}.safe-receipt`,
    code: safeFailureCode(code),
    requestDefinitelyNotSent: details.requestDefinitelyNotSent === true,
    requestMayHaveBeenSent: details.requestMayHaveBeenSent === true,
    physicalAttempts: Number.isSafeInteger(details.physicalAttempts)
      ? details.physicalAttempts : 0,
    rawProviderMaterialRetained: false,
    trainingTruth: false,
  }, "receiptHash");
}

export function createStarcraftTmgDurableProviderGatewayRuntimeV1(options = {}) {
  const {
    attemptStore, promptArtifactStore, attachmentControl, workerPort,
    executionAuthorityPort,
  } = assertDependencies(options);
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  let initialized = false;
  let recoveryReceipt = null;

  async function observeCommitted(operation, input) {
    try {
      return await attemptStore[operation](input);
    } catch (firstError) {
      try {
        return await attemptStore[operation](input);
      } catch {
        throw firstError;
      }
    }
  }

  function metadata() {
    return freeze({
      schemaVersion:
        `${STARCRAFT_TMG_DURABLE_PROVIDER_GATEWAY_RUNTIME_VERSION}.metadata`,
      initialized,
      sequence: [
        "resolve_current_prompt_profile_and_attachment",
        "persist_intent_and_budget_reservation",
        "commit_dispatch_authority",
        "execute_worker_once",
        "persist_safe_receipt_and_budget_settlement",
        "recover_or_replay_without_automatic_provider_retry",
        "explicit_replan_for_ambiguous_outcome",
      ],
      mtlSchedulingLineage:
        "codex/mtl-character-agent-repair@50ef5c29c655c015335d76e78fb4a0ecb442252f",
      physicalAttemptsPerExecution: 1,
      automaticProviderRetries: 0,
      automaticSchemaRepairs: 0,
      exactStoreCommitObservationReplays: 1,
      dshAllowed: false,
      rawPromptOrOutputPersisted: false,
      credentialPersistence: "isolated_worker_session_memory_only",
      recoveryReceiptHash: recoveryReceipt?.resultHash || null,
      productionReady: false,
      trainingTruth: false,
    });
  }

  async function initialize(input = {}) {
    exactFields(input, INITIALIZE_FIELDS, "Provider Gateway initialize input");
    await attemptStore.initialize();
    recoveryReceipt = await attemptStore.recoverOpenAttempts({
      recoveryIdempotencyKeyHash: hash(input.recoveryIdempotencyKeyHash,
        "recoveryIdempotencyKeyHash"),
      recoveredAt: isoInstant(input.recoveredAt, "recoveredAt"),
    });
    initialized = true;
    return freeze({
      ok: true,
      recovery: recoveryReceipt,
      metadata: metadata(),
      trainingTruth: false,
    });
  }

  async function complete(rawGateway) {
    if (!initialized) {
      throw new StarcraftTmgDurableProviderGatewayError(
        "provider_gateway_not_initialized");
    }
    const gateway = normalizeGatewayInput(rawGateway);
    const resolvedAuthority = await executionAuthorityPort.resolve(gateway);
    if (resolvedAuthority?.ok !== true
      || !object(resolvedAuthority.authority)) {
      throw new StarcraftTmgDurableProviderGatewayError(
        "provider_execution_authority_rejected");
    }
    const authority = normalizeAuthority(resolvedAuthority.authority);
    const context = resolvedAuthority.attachmentContext;
    const reservation = gateway.budgetReservation;
    if (reservation.sessionId !== authority.sessionId
      || reservation.requestHash !== gateway.boundedRequest.requestHash
      || reservation.policyHash !== authority.budgetPolicy?.policyHash
      || reservation.trainingTruth !== false) {
      throw new StarcraftTmgDurableProviderGatewayError(
        "provider_budget_reservation_rejected");
    }
    const { artifact, userMessage } = resolvePrompt(
      promptArtifactStore, gateway, authority);
    const attached = await attachmentControl.resolveExecutionAttachment({
      roomId: authority.roomId,
      sessionId: authority.sessionId,
      expectedConnectionEpoch: authority.connectionEpoch,
      providerProfileRef: gateway.providerProfileRef,
    }, context);
    const execution = attached?.binding;
    if (attached?.ok !== true || !object(execution)
      || execution.sessionBindingHash !== authority.sessionBindingHash
      || execution.principalScopeHash !== authority.principalScopeHash
      || execution.connectionEpoch !== authority.connectionEpoch
      || execution.providerProfileRef?.hash !== gateway.providerProfileRef.hash
      || execution.automaticRetryAllowed !== false
      || execution.sensitiveMaterialPersisted !== false
      || containsSensitiveMaterial(execution)) {
      throw new StarcraftTmgDurableProviderGatewayError(
        safeFailureCode(attached?.reason,
          "provider_attachment_not_available"));
    }

    await observeCommitted("openBudget", {
      principalScopeHash: authority.principalScopeHash,
      sessionBindingHash: authority.sessionBindingHash,
      policy: authority.budgetPolicy,
      idempotencyKeyHash: hashStarcraftTmgProviderAttemptValueV1({
        kind: "open-provider-budget",
        sessionBindingHash: authority.sessionBindingHash,
        policyHash: authority.budgetPolicy.policyHash,
      }),
      openedAt: authority.budgetOpenedAt,
    });
    const budgetId = `sc-provider-budget-${hashStarcraftTmgProviderAttemptValueV1({
      principalScopeHash: authority.principalScopeHash,
      sessionBindingHash: authority.sessionBindingHash,
    })}`;
    const currentBudget = await attemptStore.getBudget(budgetId);
    if (!currentBudget || currentBudget.policy.policyHash
      !== authority.budgetPolicy.policyHash) {
      throw new StarcraftTmgDurableProviderGatewayError(
        "provider_budget_policy_mismatch");
    }
    const reserved = await observeCommitted("reserveAttempt", {
      budgetId,
      principalScopeHash: authority.principalScopeHash,
      expectedBudgetRevision: currentBudget.revision,
      idempotencyKeyHash: hashStarcraftTmgProviderAttemptValueV1({
        kind: "provider-attempt",
        sessionBindingHash: authority.sessionBindingHash,
        turnId: reservation.turnId,
        reservationHash: reservation.reservationHash,
      }),
      consentReceiptHash: execution.consentReceiptHash,
      providerProfileHash: gateway.providerProfileRef.hash,
      egressPolicyHash: execution.egressPolicyHash,
      promptAssemblyHash: artifact.promptArtifactHash,
      responseContractHash: gateway.responseContract.hash,
      requestHash: gateway.boundedRequest.requestHash,
      intent: gateway.boundedRequest.intent,
      inputUnits: gateway.boundedRequest.inputUnits,
      maxOutputUnits: gateway.boundedRequest.maxOutputUnits,
      reservedAt: isoInstant(reservation.reservedAt, "reservation.reservedAt"),
      retryOfAttemptId: null,
      retryApprovalReceiptHash: null,
      reattachmentReceiptHash: null,
    });
    const attempt = await attemptStore.getAttempt(reserved.attempt.attemptId);
    if (!attempt || attempt.status !== "reserved") {
      throw new StarcraftTmgDurableProviderGatewayError(
        "provider_attempt_requires_recovery");
    }
    const directRequest = providerRequest({
      attemptId: attempt.attemptId,
      artifact,
      userMessage,
      gateway,
    });

    if (gateway.signal?.aborted) {
      const receipt = localSafeReceipt("provider_request_aborted", {
        requestDefinitelyNotSent: true,
      });
      const settledAt = isoInstant(now(), "settledAt");
      await observeCommitted("settleAttempt", {
        attemptId: attempt.attemptId,
        expectedAttemptRevision: attempt.revision,
        terminalStatus: failureStatus(gateway.signal),
        usageKnown: true,
        inputUnits: 0,
        outputUnits: 0,
        safeProviderReceiptHash: receipt.receiptHash,
        settledAt,
      });
      throw new StarcraftTmgDurableProviderGatewayError(
        "provider_request_aborted", {
          safeUsageReceipt: createStarcraftTmgProviderGatewayUsageReceiptV1({
            reservation,
            status: failureStatus(gateway.signal),
            inputUnits: 0,
            outputUnits: 0,
            providerRequestIdHash: hashStarcraftTmgProviderAttemptValueV1({
              attemptId: attempt.attemptId, status: "not_dispatched",
            }),
            finishedAt: settledAt,
          }),
          durableReceipt: receipt,
        });
    }

    const dispatchInput = {
      attemptId: attempt.attemptId,
      expectedAttemptRevision: attempt.revision,
      dispatchBindingHash: hashStarcraftTmgProviderAttemptValueV1({
        attemptId: attempt.attemptId,
        workerRefHash: hashStarcraftTmgProviderAttemptValueV1(execution.workerRef),
        attachmentProjectionHash: execution.attachmentProjectionHash,
        providerProfileHash: gateway.providerProfileRef.hash,
        egressPolicyHash: execution.egressPolicyHash,
        directRequestHash: hashStarcraftTmgProviderAttemptValueV1(directRequest),
      }),
      dispatchedAt: isoInstant(now(), "dispatchedAt"),
    };
    const dispatch = await observeCommitted("markAttemptDispatched",
      dispatchInput);
    if (dispatch.egressAuthorized !== true
      || dispatch.attempt.status !== "dispatched") {
      throw new StarcraftTmgDurableProviderGatewayError(
        "provider_dispatch_authority_rejected");
    }

    let workerResult;
    try {
      workerResult = await workerPort.complete({
        workerRef: execution.workerRef,
        providerRequest: directRequest,
        signal: gateway.signal,
      });
    } catch (error) {
      const receipt = object(error?.safeReceipt)
        && HASH.test(String(error.safeReceipt.receiptHash || ""))
        ? freeze(clone(error.safeReceipt))
        : localSafeReceipt(error?.code || "provider_worker_failed", {
          requestDefinitelyNotSent: error?.requestDefinitelyNotSent === true,
          requestMayHaveBeenSent: error?.requestMayHaveBeenSent !== false,
          physicalAttempts: error?.physicalAttempts ?? 1,
        });
      const definitelyNotSent = receipt.requestDefinitelyNotSent === true;
      const status = failureStatus(gateway.signal);
      const settlementInput = {
        attemptId: attempt.attemptId,
        expectedAttemptRevision: dispatch.attempt.revision,
        terminalStatus: status,
        usageKnown: definitelyNotSent,
        inputUnits: 0,
        outputUnits: 0,
        safeProviderReceiptHash: receipt.receiptHash,
        settledAt: isoInstant(now(), "settledAt"),
      };
      const settled = await observeCommitted("settleAttempt", settlementInput);
      const safeUsageReceipt = createStarcraftTmgProviderGatewayUsageReceiptV1({
        reservation,
        status,
        inputUnits: definitelyNotSent ? 0 : reservation.inputUnits,
        outputUnits: definitelyNotSent ? 0 : reservation.maxOutputUnits,
        providerRequestIdHash: hashStarcraftTmgProviderAttemptValueV1({
          attemptId: attempt.attemptId,
          safeProviderReceiptHash: receipt.receiptHash,
        }),
        finishedAt: settled.attempt.settledAt,
      });
      throw new StarcraftTmgDurableProviderGatewayError(
        error?.code || "provider_worker_failed", {
          safeUsageReceipt,
          durableReceipt: receipt,
        });
    }

    const providerReceipt = workerResult?.usageReceipt;
    const usage = providerReceipt?.usage;
    if (!object(workerResult?.output) || !object(providerReceipt)
      || !object(usage) || !HASH.test(String(providerReceipt.receiptHash || ""))
      || providerReceipt.providerProfileRef?.hash !== gateway.providerProfileRef.hash
      || providerReceipt.egressPolicyHash !== execution.egressPolicyHash
      || providerReceipt.requestId !== attempt.attemptId) {
      const receipt = localSafeReceipt("provider_worker_result_rejected", {
        requestMayHaveBeenSent: true,
        physicalAttempts: 1,
      });
      const settledAt = isoInstant(now(), "settledAt");
      await observeCommitted("settleAttempt", {
        attemptId: attempt.attemptId,
        expectedAttemptRevision: dispatch.attempt.revision,
        terminalStatus: "failed",
        usageKnown: false,
        inputUnits: 0,
        outputUnits: 0,
        safeProviderReceiptHash: receipt.receiptHash,
        settledAt,
      });
      throw new StarcraftTmgDurableProviderGatewayError(
        "provider_worker_result_rejected", {
          safeUsageReceipt: createStarcraftTmgProviderGatewayUsageReceiptV1({
            reservation,
            status: "failed",
            inputUnits: reservation.inputUnits,
            outputUnits: reservation.maxOutputUnits,
            providerRequestIdHash: hashStarcraftTmgProviderAttemptValueV1({
              attemptId: attempt.attemptId, status: "unsafe_result",
            }),
            finishedAt: settledAt,
          }),
          durableReceipt: receipt,
        });
    }
    const inputUnits = Number(usage.inputUnits);
    const outputUnits = Number(usage.outputUnits);
    if (!Number.isSafeInteger(inputUnits) || inputUnits < 0
      || !Number.isSafeInteger(outputUnits) || outputUnits < 0
      || inputUnits + outputUnits > attempt.reservedUnits) {
      const receipt = localSafeReceipt("provider_usage_exceeds_reservation", {
        requestMayHaveBeenSent: true,
        physicalAttempts: 1,
      });
      const settledAt = isoInstant(now(), "settledAt");
      await observeCommitted("settleAttempt", {
        attemptId: attempt.attemptId,
        expectedAttemptRevision: dispatch.attempt.revision,
        terminalStatus: "failed",
        usageKnown: false,
        inputUnits: 0,
        outputUnits: 0,
        safeProviderReceiptHash: receipt.receiptHash,
        settledAt,
      });
      throw new StarcraftTmgDurableProviderGatewayError(
        "provider_usage_exceeds_reservation", {
          safeUsageReceipt: createStarcraftTmgProviderGatewayUsageReceiptV1({
            reservation,
            status: "failed",
            inputUnits: reservation.inputUnits,
            outputUnits: reservation.maxOutputUnits,
            providerRequestIdHash: hashStarcraftTmgProviderAttemptValueV1({
              attemptId: attempt.attemptId, status: "usage_rejected",
            }),
            finishedAt: settledAt,
          }),
          durableReceipt: receipt,
        });
    }
    const settled = await observeCommitted("settleAttempt", {
      attemptId: attempt.attemptId,
      expectedAttemptRevision: dispatch.attempt.revision,
      terminalStatus: "completed",
      usageKnown: true,
      inputUnits,
      outputUnits,
      safeProviderReceiptHash: providerReceipt.receiptHash,
      settledAt: isoInstant(providerReceipt.finishedAt,
        "providerReceipt.finishedAt"),
    });
    const providerRequestIdHash = HASH.test(
      String(providerReceipt.providerRequestIdHash || ""))
      ? providerReceipt.providerRequestIdHash
      : hashStarcraftTmgProviderAttemptValueV1({
        attemptId: attempt.attemptId,
        responseFingerprint: providerReceipt.responseFingerprint,
      });
    return freeze({
      output: clone(workerResult.output),
      usageReceipt: createStarcraftTmgProviderGatewayUsageReceiptV1({
        reservation,
        status: "completed",
        inputUnits,
        outputUnits,
        providerRequestIdHash,
        finishedAt: settled.attempt.settledAt,
      }),
    });
  }

  return Object.freeze({ metadata, initialize, complete });
}
