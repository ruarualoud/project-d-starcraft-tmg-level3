import { randomUUID } from "node:crypto";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "../online-agent-session/portable-credential-material-v1.mjs";
import {
  assertStarcraftTmgSkillGenerationContract,
} from "../skill-generation/contracts-v1.mjs";
import {
  priceStarcraftTmgDeepSeekV4FlashUsageV1,
  STARCRAFT_TMG_DEEPSEEK_V4_FLASH_PRICING_SNAPSHOT_V1,
  verifyStarcraftTmgProviderPricingReceiptV1,
} from "../secure-provider-runtime/provider-pricing-v1.mjs";
import { STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_PORT_VERSION } from
  "../secure-provider-runtime/provider-egress-worker-port-v1.mjs";
import {
  TEACH_CTX2SKILL_ROLE_GRAPH_HASH,
  TEACH_CTX2SKILL_ROLE_REQUEST_SCHEMA,
} from "./teach-ctx2skill-role-graph-v1.mjs";
import { verifyCurrentOfficialSkillStagedInputV1 } from
  "./current-official-evidence-v1.mjs";

export const STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_VERSION =
  "starcraft_tmg_offline_skill_provider_broker_v1";
export const STARCRAFT_TMG_DIRECT_SKILL_CONTROL_EXECUTOR_VERSION =
  "starcraft_tmg_direct_skill_control_executor_v1";
export const STARCRAFT_TMG_SKILL_COST_GUARD_VERSION =
  "starcraft_tmg_skill_cost_guard_v1";

const HASH = /^[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9._:-]{8,200}$/u;
const ROLE = /^[a-z][a-z0-9_]{1,63}$/u;
const MODEL_ROLES = Object.freeze([
  "planner",
  "tutor",
  "student",
  "challenger",
  "reasoner",
  "proposer",
  "generator",
]);
const MODEL_ROLE_SEQUENCE_INDEX = Object.freeze({
  planner: 0,
  tutor: 1,
  student: 2,
  challenger: 3,
  reasoner: 4,
  proposer: 6,
  generator: 7,
});
const PROVIDER_RESULT_FIELDS = new Set(["output", "usageReceipt"]);
const PROVIDER_OUTPUT_FIELDS = new Set(["schemaVersion", "channels"]);
const PROVIDER_USAGE_RECEIPT_FIELDS = new Set([
  "schemaVersion", "requestId", "providerProfileRef", "egressPolicyHash",
  "providerId", "requestedModel", "reportedModel", "providerRequestIdHash",
  "providerSystemFingerprintHash", "status", "usage", "responseFingerprint",
  "dnsAddressSetHash", "tlsServerName", "tlsCertificateVerificationDisabled",
  "redirectFollowed", "proxyUsed", "physicalAttempts", "automaticRetries",
  "startedAt", "finishedAt", "trainingTruth", "receiptHash",
]);
const USAGE_FIELDS = new Set([
  "inputUnits", "outputUnits", "totalUnits", "inputCacheHitUnits",
  "inputCacheMissUnits", "reasoningOutputUnits",
]);
const NOTICE_ACK_FIELDS = new Set([
  "schemaVersion", "delivered", "noticeHash", "thresholdCnyMicros",
  "deliveredAt",
]);
const PROVIDER_FAILURE_FIELDS = new Set([
  "schemaVersion", "code", "requestDefinitelyNotSent",
  "requestMayHaveBeenSent", "status", "physicalAttempts",
  "automaticRetries", "trainingTruth", "receiptHash",
]);
const AUTHORIZATION_FIELDS = new Set([
  "schemaVersion", "attemptId", "runId", "role", "requestHash",
  "maxInputTokens", "maxOutputTokens", "forecastCostNanoUsd",
  "forecastCostCnyMicros", "cumulativeBeforeCnyMicros",
  "cumulativeWithForecastCnyMicros", "notificationReceiptHashes",
  "costPolicyHash", "authorizedAt", "authorizationHash",
]);

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
  if (!object(value) || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError(`${label} contains forbidden fields`);
  }
}

function safeId(value, field, pattern = ID) {
  const normalized = String(value || "");
  if (!pattern.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function safeHash(value, field) {
  const normalized = String(value || "");
  if (!HASH.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function nonNegativeInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function positiveInteger(value, field) {
  const normalized = nonNegativeInteger(value, field);
  if (normalized < 1) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function instant(value, field) {
  const normalized = new Date(value).toISOString();
  if (normalized !== value) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function hashEnvelope(body, field) {
  return freeze({ ...body, [field]: hashStarcraftTmgContract(body) });
}

function verifyEnvelope(value, field, label) {
  if (!object(value) || !HASH.test(String(value[field] || ""))) {
    throw new TypeError(`${label} hash is invalid`);
  }
  const copy = clone(value);
  const observed = copy[field];
  delete copy[field];
  if (hashStarcraftTmgContract(copy) !== observed) {
    throw new TypeError(`${label} hash mismatch`);
  }
  return value;
}

function assertCredentialFree(value, label) {
  function scanProjection(current) {
    if (Array.isArray(current)) return current.map(scanProjection);
    if (!object(current)) return current;
    return Object.fromEntries(Object.entries(current).flatMap(([key, child]) => {
      if (key === "costAuthorization") {
        return [["costForecastRecord", scanProjection(child)]];
      }
      if (key === "authorizationHash" && HASH.test(String(child || ""))) {
        return [];
      }
      const negativeClaim = /(?:api.?key|authorization|cookie|credential|secret|access.?token|refresh.?token)/iu
        .test(key)
        && (child === false || child === null || child === "none"
          || child === "not_mounted");
      return negativeClaim ? [] : [[key, scanProjection(child)]];
    }));
  }
  if (containsStarcraftTmgOnlineCredentialMaterialV1(scanProjection(value))) {
    throw new TypeError(`${label} contains credential material`);
  }
}

function safeIntegerFromBigInt(value, field) {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${field} exceeds safe accounting range`);
  }
  return Number(value);
}

function ceilDivide(left, right) {
  return (left + right - 1n) / right;
}

function nanoUsdToCnyMicros(value) {
  const nanoUsd = BigInt(nonNegativeInteger(value, "nanoUsd"));
  return safeIntegerFromBigInt(ceilDivide(
    nanoUsd * BigInt(8_000_000),
    1_000_000_000n,
  ), "converted CNY micros");
}

function forecastCostNanoUsd(maxInputTokens, maxOutputTokens) {
  const snapshot = STARCRAFT_TMG_DEEPSEEK_V4_FLASH_PRICING_SNAPSHOT_V1;
  const cacheMissRate = Math.max(
    snapshot.ratesPerTokenNanoUsd.offPeak.inputCacheMiss,
    snapshot.ratesPerTokenNanoUsd.peak.inputCacheMiss,
  );
  const outputRate = Math.max(
    snapshot.ratesPerTokenNanoUsd.offPeak.output,
    snapshot.ratesPerTokenNanoUsd.peak.output,
  );
  return safeIntegerFromBigInt(
    BigInt(maxInputTokens) * BigInt(cacheMissRate)
      + BigInt(maxOutputTokens) * BigInt(outputRate),
    "forecast nano USD",
  );
}

const costPolicyBody = {
  schemaVersion: `${STARCRAFT_TMG_SKILL_COST_GUARD_VERSION}.policy`,
  providerId: "deepseek-openai-compatible-direct",
  requestedModel: "deepseek-v4-flash",
  providerPricingSnapshotHash:
    STARCRAFT_TMG_DEEPSEEK_V4_FLASH_PRICING_SNAPSHOT_V1.snapshotHash,
  forecastPricingWindow: "worst_rate_across_frozen_peak_and_off_peak",
  forecastInputCacheTreatment: "all_input_cache_miss",
  conversion: {
    kind: "conservative_budget_guard_ceiling_not_market_quote",
    cnyMicrosPerUsd: 8_000_000,
    displayRate: "8.000000 CNY/USD",
    marketOrInvoiceAuthority: false,
  },
  notification: {
    thresholdCnyMicros: 100_000_000,
    thresholdDisplay: "CNY 100.000000",
    deliveryRequiredBeforeAttempt: true,
    acknowledgementIsSpendApproval: false,
  },
  historicalBaseline: {
    throughTicket: 16,
    providerCalls: 1,
    inputTokens: 2_424,
    outputTokens: 44,
    cacheHitTokens: 0,
    cacheMissTokens: 2_424,
    totalTokens: 2_468,
    calculatedCostNanoUsd: 562_320,
    calculatedCostUsd: "0.00056232",
    convertedCostCnyMicros: 4_499,
  },
  stateDurability: "process_memory_until_ticket_18_scheduler_store",
  providerInvoiceAuthoritative: true,
  sourceRefreshPerformed: false,
  trainingTruth: false,
};

export const STARCRAFT_TMG_SKILL_COST_POLICY_V1 = hashEnvelope(
  costPolicyBody,
  "policyHash",
);

export const STARCRAFT_TMG_DIRECT_CONTROL_RUNTIME_V1 = freeze({
  packageName: "project-d-starcraft-skill-direct-control",
  version: "1.0.0",
  commit: null,
  packageIntegrityHash: hashStarcraftTmgContract({
    module: STARCRAFT_TMG_DIRECT_SKILL_CONTROL_EXECUTOR_VERSION,
    broker: STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_VERSION,
  }),
  effectiveConfigHash: STARCRAFT_TMG_SKILL_COST_POLICY_V1.policyHash,
  pluginLockHash: hashStarcraftTmgContract([
    "provider-egress-worker-port-v1",
    "provider-pricing-v1",
    "teach-ctx2skill-role-graph-v1",
  ]),
  profileName: "project-d-starcraft-skill-control-v1",
  sessionFormatVersion: "project-d-offline-provider-session-v1",
  internalRetries: 0,
});

export class StarcraftTmgOfflineSkillProviderBrokerError extends Error {
  constructor(code, safeReceipt = {}) {
    super(code);
    this.name = "StarcraftTmgOfflineSkillProviderBrokerError";
    this.code = code;
    this.safeReceipt = freeze({
      schemaVersion:
        `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_VERSION}.failure`,
      code,
      ...clone(safeReceipt),
      automaticRetries: 0,
      canAffectRules: false,
      mayPublishSkill: false,
      trainingTruth: false,
    });
  }
}

export function createStarcraftTmgSkillCostGuardV1(options = {}) {
  const notifier = options.notifier;
  if (notifier !== undefined && typeof notifier?.notify !== "function") {
    throw new TypeError("cost notifier is invalid");
  }
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const initial = STARCRAFT_TMG_SKILL_COST_POLICY_V1.historicalBaseline;
  let cumulativeCostNanoUsd = nonNegativeInteger(
    options.initialCostNanoUsd ?? initial.calculatedCostNanoUsd,
    "initialCostNanoUsd",
  );
  let cumulativeCnyMicros = nonNegativeInteger(
    options.initialCnyMicros ?? nanoUsdToCnyMicros(cumulativeCostNanoUsd),
    "initialCnyMicros",
  );
  const pending = new Map();
  const settled = new Map();
  const deliveredThresholds = new Set();
  const threshold = STARCRAFT_TMG_SKILL_COST_POLICY_V1
    .notification.thresholdCnyMicros;
  let tail = Promise.resolve();

  function serial(operation) {
    const next = tail.then(operation, operation);
    tail = next.catch(() => {});
    return next;
  }

  function pendingForecastCny() {
    return [...pending.values()].reduce(
      (sum, row) => sum + row.forecastCostCnyMicros,
      0,
    );
  }

  function readSnapshot() {
    const body = {
      schemaVersion: `${STARCRAFT_TMG_SKILL_COST_GUARD_VERSION}.snapshot`,
      costPolicyHash: STARCRAFT_TMG_SKILL_COST_POLICY_V1.policyHash,
      cumulativeCostNanoUsd,
      cumulativeCnyMicros,
      pendingForecastCnyMicros: pendingForecastCny(),
      nextNotificationThresholdCnyMicros:
        (Math.floor(cumulativeCnyMicros / threshold) + 1) * threshold,
      deliveredThresholdCnyMicros: [...deliveredThresholds]
        .sort((left, right) => left - right),
      pendingAttempts: pending.size,
      settledAttempts: settled.size,
      stateDurability: "process_memory_until_ticket_18_scheduler_store",
      providerInvoiceAuthoritative: true,
      trainingTruth: false,
    };
    return hashEnvelope(body, "snapshotHash");
  }

  async function authorizeAttempt(input = {}) {
    return serial(async () => {
      exactFields(input, new Set([
        "attemptId", "runId", "role", "requestHash", "maxInputTokens",
        "maxOutputTokens",
      ]), "cost authorization input");
      const attemptId = safeId(input.attemptId, "attemptId");
      const runId = safeId(input.runId, "runId");
      const role = safeId(input.role, "role", ROLE);
      const requestHash = safeHash(input.requestHash, "requestHash");
      const maxInputTokens = positiveInteger(
        input.maxInputTokens,
        "maxInputTokens",
      );
      const maxOutputTokens = positiveInteger(
        input.maxOutputTokens,
        "maxOutputTokens",
      );
      if (pending.has(attemptId) || settled.has(attemptId)) {
        throw new TypeError("cost attempt already exists");
      }
      const forecastNanoUsd = forecastCostNanoUsd(
        maxInputTokens,
        maxOutputTokens,
      );
      const forecastCnyMicros = nanoUsdToCnyMicros(forecastNanoUsd);
      const cumulativeBefore = cumulativeCnyMicros + pendingForecastCny();
      const cumulativeWithForecast = cumulativeBefore + forecastCnyMicros;
      const notificationReceiptHashes = [];
      let next = (Math.floor(cumulativeBefore / threshold) + 1) * threshold;
      while (next <= cumulativeWithForecast) {
        if (!deliveredThresholds.has(next)) {
          if (!notifier) {
            throw new StarcraftTmgOfflineSkillProviderBrokerError(
              "COST_NOTIFICATION_DELIVERY_REQUIRED",
              { thresholdCnyMicros: next },
            );
          }
          const notice = hashEnvelope({
            schemaVersion: `${STARCRAFT_TMG_SKILL_COST_GUARD_VERSION}.notice`,
            attemptId,
            runId,
            role,
            thresholdCnyMicros: next,
            cumulativeBeforeCnyMicros: cumulativeBefore,
            cumulativeWithForecastCnyMicros: cumulativeWithForecast,
            forecastCostCnyMicros: forecastCnyMicros,
            forecastOnlyNotInvoice: true,
            acknowledgementIsSpendApproval: false,
            costPolicyHash: STARCRAFT_TMG_SKILL_COST_POLICY_V1.policyHash,
            createdAt: instant(now(), "notice.createdAt"),
            trainingTruth: false,
          }, "noticeHash");
          const ack = await notifier.notify(notice);
          exactFields(ack, NOTICE_ACK_FIELDS, "cost notification acknowledgement");
          if (ack.schemaVersion
              !== `${STARCRAFT_TMG_SKILL_COST_GUARD_VERSION}.notice-ack`
            || ack.delivered !== true
            || ack.noticeHash !== notice.noticeHash
            || ack.thresholdCnyMicros !== next
            || !Number.isFinite(Date.parse(ack.deliveredAt))) {
            throw new StarcraftTmgOfflineSkillProviderBrokerError(
              "COST_NOTIFICATION_DELIVERY_REJECTED",
              { thresholdCnyMicros: next },
            );
          }
          const receipt = hashEnvelope({
            ...clone(ack),
            costPolicyHash: STARCRAFT_TMG_SKILL_COST_POLICY_V1.policyHash,
            trainingTruth: false,
          }, "receiptHash");
          notificationReceiptHashes.push(receipt.receiptHash);
          deliveredThresholds.add(next);
        }
        next += threshold;
      }
      const authorization = hashEnvelope({
        schemaVersion:
          `${STARCRAFT_TMG_SKILL_COST_GUARD_VERSION}.authorization`,
        attemptId,
        runId,
        role,
        requestHash,
        maxInputTokens,
        maxOutputTokens,
        forecastCostNanoUsd: forecastNanoUsd,
        forecastCostCnyMicros: forecastCnyMicros,
        cumulativeBeforeCnyMicros: cumulativeBefore,
        cumulativeWithForecastCnyMicros: cumulativeWithForecast,
        notificationReceiptHashes,
        costPolicyHash: STARCRAFT_TMG_SKILL_COST_POLICY_V1.policyHash,
        authorizedAt: instant(now(), "authorization.authorizedAt"),
      }, "authorizationHash");
      pending.set(attemptId, authorization);
      return authorization;
    });
  }

  async function settleAttempt(input = {}) {
    return serial(async () => {
      exactFields(input, new Set([
        "authorizationReceipt", "disposition", "pricingReceipt",
        "safeFailureReceiptHash",
      ]), "cost settlement input");
      exactFields(input.authorizationReceipt, AUTHORIZATION_FIELDS,
        "cost authorization receipt");
      verifyEnvelope(input.authorizationReceipt, "authorizationHash",
        "cost authorization receipt");
      const authorization = pending.get(input.authorizationReceipt.attemptId);
      if (!authorization
        || authorization.authorizationHash
          !== input.authorizationReceipt.authorizationHash) {
        throw new TypeError("cost authorization is not pending");
      }
      const disposition = String(input.disposition || "");
      let actualCostNanoUsd;
      let usage;
      let pricingReceiptHash = null;
      let safeFailureReceiptHash = null;
      let usageKnown = false;
      if (disposition === "provider_success") {
        if (!verifyStarcraftTmgProviderPricingReceiptV1(input.pricingReceipt)) {
          throw new TypeError("Provider pricing receipt is invalid");
        }
        actualCostNanoUsd = nonNegativeInteger(
          input.pricingReceipt.calculatedCostNanoUsd,
          "calculatedCostNanoUsd",
        );
        usage = {
          inputTokens: input.pricingReceipt.usage.inputUnits,
          outputTokens: input.pricingReceipt.usage.outputUnits,
          cacheHitTokens: input.pricingReceipt.usage.inputCacheHitUnits,
          cacheMissTokens: input.pricingReceipt.usage.inputCacheMissUnits,
          reasoningTokens:
            input.pricingReceipt.usage.reasoningOutputUnits || 0,
          totalTokens: input.pricingReceipt.usage.totalUnits,
        };
        pricingReceiptHash = input.pricingReceipt.receiptHash;
        usageKnown = true;
      } else if (disposition === "request_definitely_not_sent") {
        actualCostNanoUsd = 0;
        usage = {
          inputTokens: 0,
          outputTokens: 0,
          cacheHitTokens: 0,
          cacheMissTokens: 0,
          reasoningTokens: 0,
          totalTokens: 0,
        };
        safeFailureReceiptHash = safeHash(
          input.safeFailureReceiptHash,
          "safeFailureReceiptHash",
        );
      } else if (disposition === "request_may_have_been_sent") {
        actualCostNanoUsd = authorization.forecastCostNanoUsd;
        usage = {
          inputTokens: 0,
          outputTokens: 0,
          cacheHitTokens: 0,
          cacheMissTokens: 0,
          reasoningTokens: 0,
          totalTokens: 0,
        };
        safeFailureReceiptHash = safeHash(
          input.safeFailureReceiptHash,
          "safeFailureReceiptHash",
        );
      } else {
        throw new TypeError("cost settlement disposition is invalid");
      }
      const actualCnyMicros = nanoUsdToCnyMicros(actualCostNanoUsd);
      const forecastExceeded = actualCostNanoUsd
        > authorization.forecastCostNanoUsd;
      cumulativeCostNanoUsd += actualCostNanoUsd;
      cumulativeCnyMicros += actualCnyMicros;
      pending.delete(authorization.attemptId);
      const settlement = hashEnvelope({
        schemaVersion: `${STARCRAFT_TMG_SKILL_COST_GUARD_VERSION}.settlement`,
        attemptId: authorization.attemptId,
        runId: authorization.runId,
        role: authorization.role,
        authorizationHash: authorization.authorizationHash,
        disposition,
        usage,
        usageKnown,
        pricingReceiptHash,
        safeFailureReceiptHash,
        forecastCostNanoUsd: authorization.forecastCostNanoUsd,
        actualOrConservativeCostNanoUsd: actualCostNanoUsd,
        actualOrConservativeCostCnyMicros: actualCnyMicros,
        forecastExceeded,
        cumulativeCostNanoUsd,
        cumulativeCnyMicros,
        providerInvoiceAuthoritative: true,
        settledAt: instant(now(), "settlement.settledAt"),
        trainingTruth: false,
      }, "settlementHash");
      settled.set(authorization.attemptId, settlement);
      return settlement;
    });
  }

  return freeze({
    metadata() {
      return freeze({
        schemaVersion: `${STARCRAFT_TMG_SKILL_COST_GUARD_VERSION}.metadata`,
        costPolicyHash: STARCRAFT_TMG_SKILL_COST_POLICY_V1.policyHash,
        notificationThresholdCnyMicros: threshold,
        notificationRequiredBeforeCrossing: true,
        providerInvoiceAuthoritative: true,
        automaticRetryAllowed: false,
        stateDurability: "process_memory_until_ticket_18_scheduler_store",
        trainingTruth: false,
      });
    },
    authorizeAttempt,
    settleAttempt,
    readSnapshot,
  });
}

function assertSkillJobForBroker(job) {
  assertStarcraftTmgSkillGenerationContract(job, "job-manifest");
  if (!MODEL_ROLES.length
    || job.budget.maxProviderAttempts !== MODEL_ROLES.length
    || job.budget.currency !== "USD"
    || job.budget.priceTableVersion
      !== STARCRAFT_TMG_SKILL_COST_POLICY_V1.policyHash
    || job.providerProfileRef.model
      !== STARCRAFT_TMG_SKILL_COST_POLICY_V1.requestedModel
    || job.runtime.internalRetries !== 0
    || job.permissionProfile.productionCredentialsMounted !== false
    || job.permissionProfile.egressMode !== "provider_endpoint_allowlist_only") {
    throw new TypeError("Skill job is outside the offline Provider broker policy");
  }
  const perRole = perRoleBudgets(job);
  const maximumJobForecastNanoUsd = forecastCostNanoUsd(
    perRole.maxInputTokens,
    perRole.maxOutputTokens,
  ) * MODEL_ROLES.length;
  if (maximumJobForecastNanoUsd
    > Math.floor(job.budget.maxEstimatedCost * 1_000_000_000)) {
    throw new TypeError("Skill job maximum forecast exceeds its sealed budget");
  }
  return job;
}

function perRoleBudgets(job) {
  const input = Math.floor(job.budget.maxInputTokens / MODEL_ROLES.length);
  const output = Math.floor(job.budget.maxOutputTokens / MODEL_ROLES.length);
  if (input < 1 || output < 1) {
    throw new TypeError("Skill job budget cannot cover every model role");
  }
  return freeze({ maxInputTokens: input, maxOutputTokens: output });
}

function expectedCurrentBinding(stagedInput) {
  return {
    stagedInputHash: stagedInput.stagedInputHash,
    sourceLockHash: stagedInput.bindings.source.sourceLockHash,
    sourceSnapshotHash: stagedInput.bindings.source.sourceSnapshotHash,
    normalizedDatasetHash: stagedInput.bindings.source.normalizedDatasetHash,
    rulesReceiptHash: stagedInput.bindings.rules.receiptHash,
    rulesCatalogueHash: stagedInput.bindings.rules.catalogueHash,
    rulesRuntimeHash: stagedInput.bindings.rules.runtimeHash,
    rulesGraphHash: stagedInput.bindings.rules.graphHash,
  };
}

function modelFacingRoleRequest(request) {
  const projected = clone(request);
  // The host validates this denied capability before projection. Do not send
  // credential/secret-shaped field names across the generic Provider
  // transport boundary, whose scanner intentionally rejects them regardless
  // of their value.
  delete projected.capabilities.readHostSecrets;
  return freeze(projected);
}

export function compileStarcraftTmgOfflineSkillRoleProviderRequestV1(input = {}) {
  exactFields(input, new Set(["jobManifest", "rolePacket", "requestId"]),
    "role Provider compile input");
  const job = assertSkillJobForBroker(input.jobManifest);
  const packet = input.rolePacket;
  if (!object(packet) || !object(packet.request)
    || !object(packet.stagedInput) || !Array.isArray(packet.contextReceipts)) {
    throw new TypeError("role packet is invalid");
  }
  verifyCurrentOfficialSkillStagedInputV1(packet.stagedInput);
  verifyEnvelope(packet.request, "requestHash", "role request");
  const role = safeId(packet.request.role, "role", ROLE);
  const expectedTaskRef = {
    taskId: packet.stagedInput.task.taskId,
    taskHash: packet.stagedInput.task.taskHash,
    family: packet.stagedInput.task.family,
    subjectId: packet.stagedInput.task.subjectId,
  };
  if (!MODEL_ROLES.includes(role)
    || packet.request.schemaVersion !== TEACH_CTX2SKILL_ROLE_REQUEST_SCHEMA
    || packet.request.graphHash !== TEACH_CTX2SKILL_ROLE_GRAPH_HASH
    || packet.request.sequenceIndex !== MODEL_ROLE_SEQUENCE_INDEX[role]
    || packet.request.stagedInputHash !== job.stagedInputHash
    || packet.stagedInput.stagedInputHash !== job.stagedInputHash
    || hashStarcraftTmgContract(packet.request.taskRef)
      !== hashStarcraftTmgContract(expectedTaskRef)
    || hashStarcraftTmgContract(packet.request.currentBinding)
      !== hashStarcraftTmgContract(expectedCurrentBinding(packet.stagedInput))
    || packet.request.rawReasoningRequested !== false
    || packet.request.capabilities?.emitCandidateSkill !== false
    || packet.request.capabilities?.readHostSecrets !== false
    || packet.request.capabilities?.network !== false
    || packet.request.capabilities?.skillPublish !== false
    || packet.request.trainingTruth !== false) {
    throw new TypeError("role packet escaped the sealed Skill boundary");
  }
  const refs = packet.request.contextReceiptRefs;
  if (!Array.isArray(refs) || refs.length !== packet.contextReceipts.length) {
    throw new TypeError("role context receipt denominator is invalid");
  }
  for (let index = 0; index < refs.length; index += 1) {
    const receipt = packet.contextReceipts[index];
    verifyEnvelope(receipt, "receiptHash", "role context receipt");
    if (receipt.role !== refs[index].role
      || receipt.receiptHash !== refs[index].receiptHash) {
      throw new TypeError("role context receipt binding is invalid");
    }
  }
  assertCredentialFree(packet, "role packet");
  const budget = perRoleBudgets(job);
  const promptContract = freeze({
    schemaVersion:
      `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_VERSION}.role-prompt`,
    gameId: "starcraft-tmg",
    promptPackRef: clone(job.promptPackRef),
    toolContract: {
      allowlist: clone(job.toolContract.allowlist),
      schemaHash: job.toolContract.schemaHash,
      candidateEmissionAvailableToModelRole: false,
    },
    roleRequest: modelFacingRoleRequest(packet.request),
    stagedInput: clone(packet.stagedInput),
    contextReceipts: clone(packet.contextReceipts),
    outputChannel: "skill_generation_role_output",
    rawReasoningRequested: false,
    rulesAuthority: "authoritative_rules_service_only",
    candidateAuthority: "unreviewed_only",
    trainingTruth: false,
  });
  const providerRequest = freeze({
    schemaVersion: "starcraft_tmg_direct_provider_request_v1",
    requestId: safeId(input.requestId, "requestId"),
    intent: "reflect",
    promptPack: job.promptPackRef.id,
    promptNodes: [promptContract],
    userMessage:
      "Execute the sealed role request. Return exactly the requested JSON channel without markdown or hidden reasoning.",
    responseContract: {
      allowedChannels: ["skill_generation_role_output"],
      decisionCandidateSource: "offline_candidate_role_only",
    },
    maxOutputUnits: budget.maxOutputTokens,
  });
  const serializedBytes = Buffer.byteLength(JSON.stringify(providerRequest), "utf8");
  if (serializedBytes > budget.maxInputTokens) {
    throw new TypeError("role Provider request exceeds conservative input budget");
  }
  return freeze({
    role,
    promptContract,
    promptContractHash: hashStarcraftTmgContract(promptContract),
    providerRequest,
    providerRequestHash: hashStarcraftTmgContract(providerRequest),
    serializedBytes,
    budget,
  });
}

function providerResultRejection(reason) {
  const error = new TypeError("Provider broker result is invalid");
  error.rejectionClass = reason;
  throw error;
}

function hasExactFieldSubset(value, allowed) {
  return object(value) && Object.keys(value).every((key) => allowed.has(key));
}

function normalizeProviderSuccess(result, compiled, job) {
  if (!hasExactFieldSubset(result, PROVIDER_RESULT_FIELDS)) {
    providerResultRejection("result_envelope_fields");
  }
  if (!hasExactFieldSubset(result.output, PROVIDER_OUTPUT_FIELDS)) {
    providerResultRejection("output_envelope_fields");
  }
  if (!hasExactFieldSubset(result.usageReceipt,
    PROVIDER_USAGE_RECEIPT_FIELDS)) {
    providerResultRejection("usage_receipt_fields");
  }
  if (!hasExactFieldSubset(result.usageReceipt.usage, USAGE_FIELDS)) {
    providerResultRejection("usage_fields");
  }
  const output = result.output;
  const receipt = result.usageReceipt;
  const channelKeys = object(output.channels) ? Object.keys(output.channels) : [];
  const usage = receipt.usage;
  const { receiptHash, ...receiptBody } = receipt;
  if (output.schemaVersion !== "starcraft_tmg_offline_skill_role_output_v1"
    || channelKeys.length !== 1
    || channelKeys[0] !== "skill_generation_role_output"
    || !object(output.channels.skill_generation_role_output)) {
    providerResultRejection("output_channel_contract");
  }
  if (receiptHash !== hashStarcraftTmgContract(receiptBody)) {
    providerResultRejection("usage_receipt_hash");
  }
  if (receipt.schemaVersion
      !== "starcraft_tmg_provider_egress_transport_v1.success"
    || receipt.requestId !== compiled.providerRequest.requestId) {
    providerResultRejection("usage_receipt_request_binding");
  }
  if (receipt.providerProfileRef?.id !== job.providerProfileRef.id
    || receipt.providerProfileRef?.version !== job.providerProfileRef.version
    || receipt.providerProfileRef?.hash !== job.providerProfileRef.hash) {
    providerResultRejection("usage_receipt_profile_binding");
  }
  if (receipt.providerId !== STARCRAFT_TMG_SKILL_COST_POLICY_V1.providerId
    || receipt.requestedModel !== job.providerProfileRef.model
    || receipt.reportedModel !== job.providerProfileRef.model) {
    providerResultRejection("usage_receipt_provider_model_binding");
  }
  if (!HASH.test(receipt.egressPolicyHash)
    || !(receipt.providerRequestIdHash === null
      || HASH.test(receipt.providerRequestIdHash))
    || !(receipt.providerSystemFingerprintHash === undefined
      || receipt.providerSystemFingerprintHash === null
      || HASH.test(receipt.providerSystemFingerprintHash))
    || !HASH.test(receipt.responseFingerprint)
    || !HASH.test(receipt.dnsAddressSetHash)) {
    providerResultRejection("usage_receipt_identity_fields");
  }
  if (!Number.isSafeInteger(receipt.status)
    || receipt.status < 200 || receipt.status >= 300
    || receipt.tlsServerName !== "api.deepseek.com"
    || receipt.tlsCertificateVerificationDisabled !== false
    || receipt.redirectFollowed !== false
    || receipt.proxyUsed !== false
    || receipt.physicalAttempts !== 1
    || receipt.automaticRetries !== 0
    || receipt.trainingTruth !== false
    || !Number.isFinite(Date.parse(receipt.startedAt))
    || !Number.isFinite(Date.parse(receipt.finishedAt))) {
    providerResultRejection("usage_receipt_transport_fields");
  }
  if (![usage.inputUnits, usage.outputUnits, usage.totalUnits,
    usage.inputCacheHitUnits, usage.inputCacheMissUnits]
      .every((value) => Number.isSafeInteger(value) && value >= 0)
    || usage.inputCacheHitUnits + usage.inputCacheMissUnits !== usage.inputUnits
    || usage.totalUnits < usage.inputUnits + usage.outputUnits) {
    providerResultRejection("usage_required_totals");
  }
  if (usage.reasoningOutputUnits !== undefined
    && (!Number.isSafeInteger(usage.reasoningOutputUnits)
      || usage.reasoningOutputUnits < 0
      || usage.reasoningOutputUnits > usage.outputUnits)) {
    providerResultRejection("usage_optional_reasoning");
  }
  if (usage.inputUnits > compiled.budget.maxInputTokens
    || usage.outputUnits > compiled.budget.maxOutputTokens) {
    providerResultRejection("usage_budget");
  }
  if (containsStarcraftTmgOnlineCredentialMaterialV1(result)) {
    providerResultRejection("result_sensitive_material");
  }
  return freeze(clone(result));
}

function normalizeProviderFailure(error) {
  const safe = object(error?.safeReceipt) ? clone(error.safeReceipt) : null;
  if (!safe) return freeze({
    requestDefinitelyNotSent: false,
    requestMayHaveBeenSent: true,
    physicalAttempts: 1,
    receiptHash: hashStarcraftTmgContract({
      code: "UNCLASSIFIED_PROVIDER_WORKER_FAILURE",
      accounting: "conservative_forecast",
    }),
  });
  exactFields(safe, PROVIDER_FAILURE_FIELDS, "Provider failure receipt");
  const { receiptHash, ...body } = safe;
  if (safe.schemaVersion !== "starcraft_tmg_provider_egress_transport_v1.failure"
    || receiptHash !== hashStarcraftTmgContract(body)
    || typeof safe.requestDefinitelyNotSent !== "boolean"
    || typeof safe.requestMayHaveBeenSent !== "boolean"
    || safe.requestDefinitelyNotSent === safe.requestMayHaveBeenSent
    || !Number.isSafeInteger(safe.physicalAttempts)
    || safe.physicalAttempts < 0 || safe.physicalAttempts > 1
    || (safe.physicalAttempts === 0) !== safe.requestDefinitelyNotSent
    || safe.automaticRetries !== 0
    || safe.trainingTruth !== false
    || containsStarcraftTmgOnlineCredentialMaterialV1(safe)) {
    return freeze({
      requestDefinitelyNotSent: false,
      requestMayHaveBeenSent: true,
      physicalAttempts: 1,
      receiptHash: hashStarcraftTmgContract({
        code: "UNSAFE_PROVIDER_WORKER_FAILURE",
        accounting: "conservative_forecast",
      }),
    });
  }
  return freeze({
    requestDefinitelyNotSent: safe.requestDefinitelyNotSent,
    requestMayHaveBeenSent: safe.requestMayHaveBeenSent,
    physicalAttempts: safe.physicalAttempts,
    receiptHash,
  });
}

export function createStarcraftTmgOfflineSkillProviderBrokerV1(options = {}) {
  const providerWorkerPort = options.providerWorkerPort;
  const costGuard = options.costGuard;
  if (typeof providerWorkerPort?.metadata !== "function"
    || typeof providerWorkerPort?.complete !== "function"
    || typeof costGuard?.metadata !== "function"
    || typeof costGuard?.authorizeAttempt !== "function"
    || typeof costGuard?.settleAttempt !== "function"
    || typeof costGuard?.readSnapshot !== "function") {
    throw new TypeError("offline Provider broker ports are required");
  }
  const workerMetadata = providerWorkerPort.metadata();
  const costMetadata = costGuard.metadata();
  if (workerMetadata?.schemaVersion
      !== `${STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_PORT_VERSION}.metadata`
    || workerMetadata.providerTransportOwner !== "credential_child_only"
    || workerMetadata.profileRegistryOwner !== "server_parent_only"
    || workerMetadata.automaticRetryAllowed !== false
    || costMetadata?.costPolicyHash
      !== STARCRAFT_TMG_SKILL_COST_POLICY_V1.policyHash
    || costMetadata.notificationRequiredBeforeCrossing !== true
    || costMetadata.automaticRetryAllowed !== false) {
    throw new TypeError("offline Provider broker dependency metadata is unsafe");
  }
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();

  async function completeRole(input = {}) {
    exactFields(input, new Set([
      "jobManifest", "workerRef", "rolePacket", "attemptId", "signal",
    ]), "offline Provider broker input");
    const job = assertSkillJobForBroker(input.jobManifest);
    const workerRef = safeId(input.workerRef, "workerRef");
    const attemptId = safeId(input.attemptId, "attemptId");
    const compiled = compileStarcraftTmgOfflineSkillRoleProviderRequestV1({
      jobManifest: job,
      rolePacket: input.rolePacket,
      requestId: attemptId,
    });
    const authorization = await costGuard.authorizeAttempt({
      attemptId,
      runId: input.rolePacket.request.runId,
      role: compiled.role,
      requestHash: compiled.providerRequestHash,
      maxInputTokens: compiled.budget.maxInputTokens,
      maxOutputTokens: compiled.budget.maxOutputTokens,
    });
    let result;
    try {
      result = await providerWorkerPort.complete({
        workerRef,
        providerRequest: compiled.providerRequest,
        ...(input.signal ? { signal: input.signal } : {}),
      });
    } catch (error) {
      const safe = normalizeProviderFailure(error);
      const definitelyNotSent = safe.requestDefinitelyNotSent === true
        && safe.physicalAttempts === 0;
      const settlement = await costGuard.settleAttempt({
        authorizationReceipt: authorization,
        disposition: definitelyNotSent
          ? "request_definitely_not_sent" : "request_may_have_been_sent",
        safeFailureReceiptHash: safe.receiptHash,
      });
      throw new StarcraftTmgOfflineSkillProviderBrokerError(
        "OFFLINE_PROVIDER_ATTEMPT_FAILED",
        {
          role: compiled.role,
          providerRequestHash: compiled.providerRequestHash,
          costSettlementHash: settlement.settlementHash,
          requestDefinitelyNotSent: definitelyNotSent,
          requestMayHaveBeenSent: !definitelyNotSent,
          physicalAttempts: definitelyNotSent ? 0 : 1,
        },
      );
    }
    let safeResult;
    try {
      safeResult = normalizeProviderSuccess(result, compiled, job);
    } catch (error) {
      const localFailureHash = hashStarcraftTmgContract({
        code: "OFFLINE_PROVIDER_RESULT_REJECTED",
        providerRequestHash: compiled.providerRequestHash,
      });
      const settlement = await costGuard.settleAttempt({
        authorizationReceipt: authorization,
        disposition: "request_may_have_been_sent",
        safeFailureReceiptHash: localFailureHash,
      });
      throw new StarcraftTmgOfflineSkillProviderBrokerError(
        "OFFLINE_PROVIDER_RESULT_REJECTED",
        {
          role: compiled.role,
          providerRequestHash: compiled.providerRequestHash,
          costSettlementHash: settlement.settlementHash,
          resultRejectionClass:
            error?.rejectionClass || "unclassified_result_rejection",
          requestDefinitelyNotSent: false,
          requestMayHaveBeenSent: true,
          physicalAttempts: 1,
        },
      );
    }
    let pricingReceipt;
    try {
      pricingReceipt = priceStarcraftTmgDeepSeekV4FlashUsageV1({
        providerId: safeResult.usageReceipt.providerId,
        requestedModel: safeResult.usageReceipt.requestedModel,
        reportedModel: safeResult.usageReceipt.reportedModel,
        startedAt: safeResult.usageReceipt.startedAt,
        usage: safeResult.usageReceipt.usage,
      });
    } catch {
      const localFailureHash = hashStarcraftTmgContract({
        code: "OFFLINE_PROVIDER_PRICING_REJECTED",
        providerRequestHash: compiled.providerRequestHash,
        providerUsageReceiptHash: safeResult.usageReceipt.receiptHash,
      });
      const settlement = await costGuard.settleAttempt({
        authorizationReceipt: authorization,
        disposition: "request_may_have_been_sent",
        safeFailureReceiptHash: localFailureHash,
      });
      throw new StarcraftTmgOfflineSkillProviderBrokerError(
        "OFFLINE_PROVIDER_PRICING_REJECTED",
        {
          role: compiled.role,
          providerRequestHash: compiled.providerRequestHash,
          providerUsageReceiptHash: safeResult.usageReceipt.receiptHash,
          costSettlementHash: settlement.settlementHash,
          physicalAttempts: 1,
        },
      );
    }
    const settlement = await costGuard.settleAttempt({
      authorizationReceipt: authorization,
      disposition: "provider_success",
      pricingReceipt,
    });
    if (settlement.forecastExceeded) {
      throw new StarcraftTmgOfflineSkillProviderBrokerError(
        "OFFLINE_PROVIDER_FORECAST_EXCEEDED",
        { costSettlementHash: settlement.settlementHash },
      );
    }
    const receipt = hashEnvelope({
      schemaVersion:
        `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_VERSION}.role-receipt`,
      attemptId,
      role: compiled.role,
      jobHash: job.integrity.hash,
      promptContractHash: compiled.promptContractHash,
      providerRequestHash: compiled.providerRequestHash,
      providerWorkerRefHash: hashStarcraftTmgContract(workerRef),
      providerUsageReceiptHash: safeResult.usageReceipt.receiptHash,
      pricingReceiptHash: pricingReceipt.receiptHash,
      costSettlementHash: settlement.settlementHash,
      providerId: safeResult.usageReceipt.providerId,
      requestedModel: safeResult.usageReceipt.requestedModel,
      reportedModel: safeResult.usageReceipt.reportedModel,
      physicalAttempts: 1,
      automaticRetries: 0,
      usage: clone(settlement.usage),
      calculatedCostNanoUsd: pricingReceipt.calculatedCostNanoUsd,
      calculatedCostUsd: pricingReceipt.calculatedCostUsd,
      calculatedCostCnyMicros:
        settlement.actualOrConservativeCostCnyMicros,
      completedAt: instant(now(), "role receipt completedAt"),
      rawPromptPersisted: false,
      rawResponsePersisted: false,
      rawReasoningPersisted: false,
      credentialMountedInSkillWorker: false,
      canAffectRules: false,
      mayPublishSkill: false,
      trainingTruth: false,
    }, "receiptHash");
    return freeze({
      roleOutput: clone(
        safeResult.output.channels.skill_generation_role_output,
      ),
      receipt,
      costAuthorization: authorization,
      pricingReceipt,
      costSettlement: settlement,
    });
  }

  return freeze({
    metadata() {
      return freeze({
        schemaVersion:
          `${STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_BROKER_VERSION}.metadata`,
        acceptedArms: ["dsh", "direct_provider_control"],
        modelRoles: clone(MODEL_ROLES),
        providerOwner: "ticket_16_isolated_provider_worker",
        credentialInputAccepted: false,
        workerReferenceOnly: true,
        physicalAttemptsPerRole: 1,
        automaticRetryAllowed: false,
        commonPromptCompilerForBothArms: true,
        costPolicyHash: STARCRAFT_TMG_SKILL_COST_POLICY_V1.policyHash,
        stateDurability: "process_memory_until_ticket_18_scheduler_store",
        canAffectRules: false,
        mayPublishSkill: false,
        trainingTruth: false,
      });
    },
    completeRole,
    readCostSnapshot: costGuard.readSnapshot,
  });
}

export function createStarcraftTmgDirectSkillControlExecutorV1(options = {}) {
  const broker = options.broker;
  if (typeof broker?.completeRole !== "function") {
    throw new TypeError("offline Provider broker is required");
  }
  const job = assertSkillJobForBroker(options.jobManifest);
  if (job.executionArm !== "direct_provider_control"
    || /dsh|deepseek[-_ ]?harness/iu.test(
      `${job.runtime.packageName} ${job.runtime.profileName}`,
    )) {
    throw new TypeError("direct-control executor cannot load DSH");
  }
  const workerRef = safeId(options.workerRef, "workerRef");
  const createId = typeof options.createId === "function"
    ? options.createId : () => randomUUID();
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const startedAt = instant(options.startedAt || now(), "startedAt");
  const executions = [];
  let state = "open";

  async function executeRole(packet) {
    if (state !== "open") {
      throw new StarcraftTmgOfflineSkillProviderBrokerError(
        "DIRECT_CONTROL_EXECUTOR_CLOSED",
      );
    }
    const expectedRole = MODEL_ROLES[executions.length];
    if (!expectedRole || packet?.request?.role !== expectedRole) {
      state = "failed";
      throw new StarcraftTmgOfflineSkillProviderBrokerError(
        "DIRECT_CONTROL_ROLE_SEQUENCE_REJECTED",
        { expectedRole, receivedRole: packet?.request?.role || null },
      );
    }
    const attemptId = safeId(
      `skill-provider-${createId(expectedRole)}`,
      "attemptId",
    );
    try {
      const result = await broker.completeRole({
        jobManifest: job,
        workerRef,
        rolePacket: packet,
        attemptId,
      });
      if (result.receipt.role !== expectedRole
        || result.receipt.physicalAttempts !== 1
        || result.receipt.automaticRetries !== 0) {
        throw new TypeError("direct-control broker receipt is invalid");
      }
      executions.push(freeze({
        receipt: result.receipt,
        costAuthorization: result.costAuthorization,
        pricingReceipt: result.pricingReceipt,
        costSettlement: result.costSettlement,
      }));
      return clone(result.roleOutput);
    } catch (error) {
      state = "failed";
      throw error;
    }
  }

  function finalize() {
    if (state !== "open" || executions.length !== MODEL_ROLES.length) {
      throw new StarcraftTmgOfflineSkillProviderBrokerError(
        "DIRECT_CONTROL_EXECUTION_INCOMPLETE",
        { completedRoles: executions.length },
      );
    }
    const usage = executions.reduce((total, execution) => {
      const receipt = execution.receipt;
      return {
      inputTokens: total.inputTokens + receipt.usage.inputTokens,
      outputTokens: total.outputTokens + receipt.usage.outputTokens,
      cacheHitTokens: total.cacheHitTokens + receipt.usage.cacheHitTokens,
      cacheMissTokens: total.cacheMissTokens + receipt.usage.cacheMissTokens,
      reasoningTokens: total.reasoningTokens + receipt.usage.reasoningTokens,
      totalTokens: total.totalTokens + receipt.usage.totalTokens,
      };
    }, {
      inputTokens: 0,
      outputTokens: 0,
      cacheHitTokens: 0,
      cacheMissTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
    });
    const calculatedCostNanoUsd = executions.reduce(
      (sum, execution) => sum + execution.receipt.calculatedCostNanoUsd,
      0,
    );
    const calculatedCostCnyMicros = executions.reduce(
      (sum, execution) => sum + execution.receipt.calculatedCostCnyMicros,
      0,
    );
    if (usage.inputTokens > job.budget.maxInputTokens
      || usage.outputTokens > job.budget.maxOutputTokens
      || calculatedCostNanoUsd / 1_000_000_000
        > job.budget.maxEstimatedCost) {
      state = "failed";
      throw new StarcraftTmgOfflineSkillProviderBrokerError(
        "DIRECT_CONTROL_JOB_BUDGET_EXCEEDED",
      );
    }
    state = "complete";
    const sessionBody = {
      schemaVersion:
        `${STARCRAFT_TMG_DIRECT_SKILL_CONTROL_EXECUTOR_VERSION}.session`,
      sessionId: safeId(`direct-control-${createId("session")}`, "sessionId"),
      jobRef: { id: job.jobId, hash: job.integrity.hash },
      executionArm: "direct_provider_control",
      modelRoles: clone(MODEL_ROLES),
      roleReceiptHashes: executions.map((execution) => (
        execution.receipt.receiptHash
      )),
      roleExecutions: clone(executions),
      startedAt,
      endedAt: instant(now(), "endedAt"),
      providerAttempts: executions.length,
      retryEvents: 0,
      usage,
      calculatedCostNanoUsd,
      calculatedCostUsd: (calculatedCostNanoUsd / 1_000_000_000)
        .toFixed(9),
      calculatedCostCnyMicros,
      credentialMountedInExecutor: false,
      dshLoaded: false,
      candidateEmissions: 0,
      rawPromptPersisted: false,
      rawResponsePersisted: false,
      rawReasoningPersisted: false,
      humanReviewed: false,
      canAffectStrategy: false,
      canAffectRules: false,
      mayPublishSkill: false,
      promotionEligible: false,
      trainingTruth: false,
    };
    return hashEnvelope(sessionBody, "sessionHash");
  }

  return freeze({
    metadata() {
      return freeze({
        schemaVersion:
          `${STARCRAFT_TMG_DIRECT_SKILL_CONTROL_EXECUTOR_VERSION}.metadata`,
        executionArm: "direct_provider_control",
        roleSequence: clone(MODEL_ROLES),
        providerAttemptsPerRole: 1,
        maximumProviderAttempts: MODEL_ROLES.length,
        internalRetryAllowed: false,
        dshLoaded: false,
        candidateEmissionOwner: "post_cross_time_cardinality_controller",
        canAffectRules: false,
        mayPublishSkill: false,
        trainingTruth: false,
      });
    },
    executeRole,
    finalize,
    readState() {
      return freeze({
        state,
        completedRoles: executions.map((execution) => execution.receipt.role),
        receiptHashes: executions.map((execution) => (
          execution.receipt.receiptHash
        )),
        providerAttempts: executions.length,
        retryEvents: 0,
        trainingTruth: false,
      });
    },
  });
}

export function verifyStarcraftTmgDirectControlSessionV1(value, jobManifest) {
  const job = assertSkillJobForBroker(jobManifest);
  verifyEnvelope(value, "sessionHash", "direct-control session");
  assertCredentialFree(value, "direct-control session");
  if (!Array.isArray(value.roleExecutions)
    || value.roleExecutions.length !== MODEL_ROLES.length) {
    throw new TypeError("direct-control role executions are invalid");
  }
  const reconstructed = {
    inputTokens: 0,
    outputTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    calculatedCostNanoUsd: 0,
    calculatedCostCnyMicros: 0,
  };
  value.roleExecutions.forEach((execution, index) => {
    exactFields(execution, new Set([
      "receipt", "costAuthorization", "pricingReceipt", "costSettlement",
    ]), "direct-control role execution");
    verifyEnvelope(execution.receipt, "receiptHash", "broker role receipt");
    exactFields(execution.costAuthorization, AUTHORIZATION_FIELDS,
      "cost authorization receipt");
    verifyEnvelope(execution.costAuthorization, "authorizationHash",
      "cost authorization receipt");
    if (!verifyStarcraftTmgProviderPricingReceiptV1(execution.pricingReceipt)) {
      throw new TypeError("direct-control pricing receipt is invalid");
    }
    verifyEnvelope(execution.costSettlement, "settlementHash",
      "cost settlement receipt");
    const receipt = execution.receipt;
    if (receipt.role !== MODEL_ROLES[index]
      || receipt.jobHash !== job.integrity.hash
      || receipt.physicalAttempts !== 1
      || receipt.automaticRetries !== 0
      || receipt.providerRequestHash !== execution.costAuthorization.requestHash
      || receipt.pricingReceiptHash !== execution.pricingReceipt.receiptHash
      || receipt.costSettlementHash !== execution.costSettlement.settlementHash
      || execution.costSettlement.authorizationHash
        !== execution.costAuthorization.authorizationHash
      || execution.costSettlement.disposition !== "provider_success"
      || hashStarcraftTmgContract(receipt.usage)
        !== hashStarcraftTmgContract(execution.costSettlement.usage)
      || receipt.calculatedCostNanoUsd
        !== execution.pricingReceipt.calculatedCostNanoUsd
      || receipt.calculatedCostCnyMicros
        !== execution.costSettlement.actualOrConservativeCostCnyMicros) {
      throw new TypeError("direct-control role execution binding is invalid");
    }
    reconstructed.inputTokens += receipt.usage.inputTokens;
    reconstructed.outputTokens += receipt.usage.outputTokens;
    reconstructed.cacheHitTokens += receipt.usage.cacheHitTokens;
    reconstructed.cacheMissTokens += receipt.usage.cacheMissTokens;
    reconstructed.reasoningTokens += receipt.usage.reasoningTokens;
    reconstructed.totalTokens += receipt.usage.totalTokens;
    reconstructed.calculatedCostNanoUsd += receipt.calculatedCostNanoUsd;
    reconstructed.calculatedCostCnyMicros += receipt.calculatedCostCnyMicros;
  });
  if (job.executionArm !== "direct_provider_control"
    || value.schemaVersion
      !== `${STARCRAFT_TMG_DIRECT_SKILL_CONTROL_EXECUTOR_VERSION}.session`
    || value.jobRef?.id !== job.jobId
    || value.jobRef?.hash !== job.integrity.hash
    || value.executionArm !== "direct_provider_control"
    || value.modelRoles?.join(",") !== MODEL_ROLES.join(",")
    || value.roleReceiptHashes?.length !== MODEL_ROLES.length
    || value.roleReceiptHashes.some((hash, index) => (
      hash !== value.roleExecutions[index].receipt.receiptHash
    ))
    || value.providerAttempts !== MODEL_ROLES.length
    || value.retryEvents !== 0
    || hashStarcraftTmgContract(value.usage)
      !== hashStarcraftTmgContract({
        inputTokens: reconstructed.inputTokens,
        outputTokens: reconstructed.outputTokens,
        cacheHitTokens: reconstructed.cacheHitTokens,
        cacheMissTokens: reconstructed.cacheMissTokens,
        reasoningTokens: reconstructed.reasoningTokens,
        totalTokens: reconstructed.totalTokens,
      })
    || value.calculatedCostNanoUsd !== reconstructed.calculatedCostNanoUsd
    || value.calculatedCostCnyMicros
      !== reconstructed.calculatedCostCnyMicros
    || value.usage?.cacheHitTokens + value.usage?.cacheMissTokens
      !== value.usage?.inputTokens
    || value.dshLoaded !== false
    || value.candidateEmissions !== 0
    || value.credentialMountedInExecutor !== false
    || value.rawPromptPersisted !== false
    || value.rawResponsePersisted !== false
    || value.rawReasoningPersisted !== false
    || value.canAffectRules !== false
    || value.mayPublishSkill !== false
    || value.promotionEligible !== false
    || value.trainingTruth !== false) {
    throw new TypeError("direct-control session is invalid");
  }
  return true;
}

export const STARCRAFT_TMG_DIRECT_CONTROL_MODEL_ROLES_V1 = MODEL_ROLES;
