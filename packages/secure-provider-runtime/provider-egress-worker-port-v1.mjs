import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { assertStarcraftTmgCharacterContract } from
  "../character-agent/contracts-v1.mjs";
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "../online-agent-session/portable-credential-material-v1.mjs";
import {
  assertStarcraftTmgProviderEgressBindingV1,
  StarcraftTmgProviderEgressError,
} from "./provider-egress-contract-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_PORT_VERSION =
  "starcraft_tmg_provider_egress_worker_port_v1";
export const STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION =
  "starcraft_tmg_provider_egress_worker_child_v1";

const DEFAULT_CHILD_PATH = fileURLToPath(
  new URL("./provider-egress-worker-child-v1.mjs", import.meta.url));
const ID = /^[A-Za-z0-9._:-]{8,200}$/u;
const HASH = /^[a-f0-9]{64}$/u;
const CODE = /^[A-Z][A-Z0-9_]{2,79}$/u;
const MODEL = /^[A-Za-z0-9._:/-]{1,240}$/u;
const REF_FIELDS = new Set(["id", "version", "hash"]);
const ATTACH_FIELDS = new Set([
  "attachmentId", "providerProfile", "credentialBytes",
]);
const COMPLETE_FIELDS = new Set(["workerRef", "providerRequest", "signal"]);
const DETACH_FIELDS = new Set(["workerRef", "reason"]);
const READ_FIELDS = new Set(["workerRef"]);
const INITIALIZED_FIELDS = new Set([
  "type", "requestId", "attachmentId", "ok", "workerVersion",
  "providerProfileHash", "egressPolicyHash", "isolation", "trainingTruth",
]);
const ISOLATION_FIELDS = new Set([
  "processIsolated", "environmentInheritedFromParent", "environmentKeys",
  "environmentAllowlistPassed", "credentialPersistence",
  "credentialReturnedOverIpc", "providerTransportMounted",
  "networkRequestMadeAtInitialization",
  "rulesRoomAgentSkillMemoryOrDshImported", "trainingTruth",
]);
const SUCCESS_RESULT_FIELDS = new Set([
  "type", "requestId", "ok", "value", "workerVersion", "trainingTruth",
]);
const FAILURE_RESULT_FIELDS = new Set([
  "type", "requestId", "ok", "code", "safeReceipt", "workerVersion",
  "trainingTruth",
]);
const SUCCESS_FIELDS = new Set(["output", "usageReceipt"]);
const SUCCESS_RECEIPT_FIELDS = new Set([
  "schemaVersion", "requestId", "providerProfileRef", "egressPolicyHash",
  "providerId", "requestedModel", "reportedModel", "providerRequestIdHash",
  "status", "usage", "responseFingerprint", "dnsAddressSetHash",
  "tlsServerName", "tlsCertificateVerificationDisabled", "redirectFollowed",
  "proxyUsed", "physicalAttempts", "automaticRetries", "startedAt",
  "finishedAt", "trainingTruth", "receiptHash",
]);
const USAGE_FIELDS = new Set(["inputUnits", "outputUnits", "totalUnits"]);
const FAILURE_RECEIPT_FIELDS = new Set([
  "schemaVersion", "code", "requestDefinitelyNotSent", "requestMayHaveBeenSent",
  "status", "physicalAttempts", "automaticRetries", "trainingTruth",
  "receiptHash",
]);
const SHUTDOWN_FIELDS = new Set([
  "type", "requestId", "ok", "reason", "workerVersion",
  "sensitiveBytesZeroed", "trainingTruth",
]);
const CANCEL_RESULT_FIELDS = new Set([
  "type", "requestId", "targetRequestId", "ok", "matched", "workerVersion",
  "trainingTruth",
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError(`${label} contains forbidden fields`);
  }
}

function safeId(value, field) {
  const normalized = String(value || "");
  if (!ID.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function safeReason(value) {
  const normalized = safeId(value, "reason");
  if (!/^[a-z][a-z0-9_]{2,79}$/u.test(normalized)) {
    throw new TypeError("reason is invalid");
  }
  return normalized;
}

function integer(value, field, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1
    || normalized > maximum) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function printableBuffer(value, maximum) {
  return Buffer.isBuffer(value) && value.length >= 8 && value.length <= maximum
    && value.every((byte) => byte >= 0x21 && byte <= 0x7e);
}

function spawnChild(pathname) {
  return spawn(process.execPath, [pathname], {
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    serialization: "advanced",
    env: { NODE_NO_WARNINGS: "1" },
  });
}

function timeout(promise, milliseconds, code) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(code)), milliseconds);
    timer.unref?.();
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export function createStarcraftTmgProviderEgressWorkerPortV1(options = {}) {
  const providerProfileRegistry = options.providerProfileRegistry;
  if (typeof providerProfileRegistry?.resolveEgressBinding !== "function") {
    throw new TypeError("providerProfileRegistry.resolveEgressBinding is required");
  }
  const childPath = options.childPath || DEFAULT_CHILD_PATH;
  const spawnProcess = options.spawnProcess || spawnChild;
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const createId = typeof options.createId === "function"
    ? options.createId : () => randomUUID();
  const onWorkerExit = typeof options.onWorkerExit === "function"
    ? options.onWorkerExit : () => {};
  const handshakeTimeoutMs = integer(options.handshakeTimeoutMs || 5_000,
    "handshakeTimeoutMs", 30_000);
  const shutdownGraceMs = integer(options.shutdownGraceMs || 1_000,
    "shutdownGraceMs", 10_000);
  const maxCredentialBytes = integer(options.maxCredentialBytes || 8_192,
    "maxCredentialBytes", 65_536);
  const maxWorkers = integer(options.maxWorkers || 1_024,
    "maxWorkers", 100_000);
  const maxOutputBytes = integer(options.maxOutputBytes || 64 * 1024,
    "maxOutputBytes", 1024 * 1024);
  if (typeof childPath !== "string" || !childPath
    || typeof spawnProcess !== "function") {
    throw new TypeError("Provider Worker process options are invalid");
  }
  const active = new Map();
  const attachmentIndex = new Map();
  const tombstones = new Map();
  let closed = false;

  function instant() {
    return new Date(now()).toISOString();
  }

  function identifier(prefix) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const value = safeId(`${prefix}-${createId(prefix)}`, `${prefix} id`);
      if (!active.has(value) && !tombstones.has(value)) return value;
    }
    throw new Error(`${prefix} id allocation exhausted`);
  }

  function metadata() {
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_PORT_VERSION}.metadata`,
      childVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
      childProgram: childPath === DEFAULT_CHILD_PATH
        ? "bundled_fixed_provider_child" : "injected_test_child",
      processGranularity: "one_child_per_attachment",
      environment: ["NODE_NO_WARNINGS"],
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      shell: false,
      providerTransportOwner: "credential_child_only",
      profileRegistryOwner: "server_parent_only",
      automaticRestartAllowed: false,
      automaticRetryAllowed: false,
      maxCredentialBytes,
      maxOutputBytes,
      maxWorkers,
      trainingTruth: false,
    });
  }

  function addTombstone(record, reason) {
    const tombstone = freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_PORT_VERSION}.worker-state`,
      workerRef: record.workerRef,
      attachmentId: record.attachmentId,
      providerProfileHash: record.binding.providerProfileRef.hash,
      egressPolicyHash: record.binding.policyHash,
      state: record.attached ? "exited" : "attach_failed",
      processId: record.child.pid || null,
      startedAt: record.startedAt,
      attachedAt: record.attachedAt,
      exitedAt: instant(),
      exitReason: reason,
      expectedExit: record.expectedExit,
      credentialPersistence: "none_after_process_exit",
      providerTransportMounted: false,
      automaticRestarted: false,
      trainingTruth: false,
    });
    tombstones.set(record.workerRef, tombstone);
    while (tombstones.size > 2 * maxWorkers) {
      tombstones.delete(tombstones.keys().next().value);
    }
    return tombstone;
  }

  function state(record) {
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_PORT_VERSION}.worker-state`,
      workerRef: record.workerRef,
      attachmentId: record.attachmentId,
      providerProfileHash: record.binding.providerProfileRef.hash,
      egressPolicyHash: record.binding.policyHash,
      state: record.state,
      processId: record.child.pid || null,
      startedAt: record.startedAt,
      attachedAt: record.attachedAt,
      exitedAt: null,
      exitReason: null,
      expectedExit: record.expectedExit,
      credentialPersistence: "child_process_session_memory_only",
      providerTransportMounted: true,
      automaticRestarted: false,
      trainingTruth: false,
    });
  }

  function rejectPending(record, code = "PROVIDER_WORKER_EXITED") {
    if (record.pending) {
      const pending = record.pending;
      record.pending = null;
      clearTimeout(pending.timer);
      pending.signal?.removeEventListener?.("abort", pending.abort);
      pending.reject(new StarcraftTmgProviderEgressError(code, {
        requestMayHaveBeenSent: true,
        physicalAttempts: 1,
      }));
    }
  }

  function recordExit(record, code, signal) {
    if (record.exited) return;
    record.exited = true;
    clearTimeout(record.handshakeTimer);
    clearTimeout(record.killTimer);
    active.delete(record.workerRef);
    attachmentIndex.delete(record.attachmentId);
    rejectPending(record);
    const reason = record.expectedExit ? "expected_shutdown"
      : signal === "SIGKILL" ? "unexpected_sigkill"
        : Number.isInteger(code) ? `unexpected_exit_${code}` : "unexpected_exit";
    const tombstone = addTombstone(record, reason);
    record.resolveExit(tombstone);
    if (!record.attached && !record.attachRejected) {
      record.attachRejected = true;
      record.rejectAttach(new Error("Provider Worker exited before acknowledgement"));
    } else if (!record.expectedExit) {
      Promise.resolve(onWorkerExit(freeze({
        workerRef: record.workerRef,
        attachmentId: record.attachmentId,
        reason,
        occurredAt: tombstone.exitedAt,
        trainingTruth: false,
      }))).catch(() => {});
    }
  }

  function kill(record, reason, expectedExit = true) {
    if (!record.attached && !record.attachRejected) {
      record.attachRejected = true;
      record.rejectAttach(new Error(reason));
    }
    record.expectedExit = expectedExit;
    rejectPending(record, "PROVIDER_WORKER_PROTOCOL_REJECTED");
    if (record.child.exitCode === null && record.child.signalCode === null) {
      record.child.kill("SIGKILL");
    }
  }

  function validateInitialized(record, message) {
    exactFields(message, INITIALIZED_FIELDS, "Provider Worker acknowledgement");
    exactFields(message.isolation, ISOLATION_FIELDS,
      "Provider Worker isolation acknowledgement");
    const safeMessage = clone(message);
    delete safeMessage.isolation.credentialPersistence;
    delete safeMessage.isolation.credentialReturnedOverIpc;
    if (message.type !== "initialized" || message.ok !== true
      || message.requestId !== record.initializeRequestId
      || message.attachmentId !== record.attachmentId
      || message.workerVersion !== STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION
      || message.providerProfileHash !== record.binding.providerProfileRef.hash
      || message.egressPolicyHash !== record.binding.policyHash
      || message.trainingTruth !== false
      || message.isolation.processIsolated !== true
      || message.isolation.environmentInheritedFromParent !== false
      || message.isolation.environmentKeys?.join(",") !== "NODE_NO_WARNINGS"
      || message.isolation.environmentAllowlistPassed !== true
      || message.isolation.credentialPersistence
        !== "child_process_session_memory_only"
      || message.isolation.credentialReturnedOverIpc !== false
      || message.isolation.providerTransportMounted !== true
      || message.isolation.networkRequestMadeAtInitialization !== false
      || message.isolation.rulesRoomAgentSkillMemoryOrDshImported !== false
      || message.isolation.trainingTruth !== false
      || containsStarcraftTmgOnlineCredentialMaterialV1(safeMessage)) {
      throw new TypeError("Provider Worker isolation acknowledgement is invalid");
    }
  }

  function validateResult(record, pending, message) {
    if (message.type !== "provider_result"
      || message.requestId !== pending.requestId
      || message.workerVersion !== STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION
      || message.trainingTruth !== false) {
      throw new TypeError("Provider Worker result binding is invalid");
    }
    if (message.ok === true) {
      exactFields(message, SUCCESS_RESULT_FIELDS, "Provider Worker success result");
      exactFields(message.value, SUCCESS_FIELDS, "Provider Worker success");
      exactFields(message.value.usageReceipt, SUCCESS_RECEIPT_FIELDS,
        "Provider Worker usage receipt");
      exactFields(message.value.usageReceipt.usage, USAGE_FIELDS,
        "Provider Worker usage");
      exactFields(message.value.usageReceipt.providerProfileRef, REF_FIELDS,
        "Provider Worker profile ref");
      const { receiptHash, ...receiptBody } = message.value.usageReceipt;
      const usage = message.value.usageReceipt.usage;
      const reportedModel = message.value.usageReceipt.reportedModel;
      if (!object(message.value.output) || !object(message.value.usageReceipt)
        || Buffer.byteLength(JSON.stringify(message.value.output), "utf8")
          > maxOutputBytes
        || receiptHash !== hashStarcraftTmgContract(receiptBody)
        || message.value.usageReceipt.requestId !== pending.providerRequestId
        || message.value.usageReceipt.providerProfileRef?.hash
          !== record.binding.providerProfileRef.hash
        || message.value.usageReceipt.providerProfileRef?.id
          !== record.binding.providerProfileRef.id
        || message.value.usageReceipt.providerProfileRef?.version
          !== record.binding.providerProfileRef.version
        || message.value.usageReceipt.egressPolicyHash !== record.binding.policyHash
        || !HASH.test(message.value.usageReceipt.egressPolicyHash)
        || message.value.usageReceipt.providerId !== record.binding.providerId
        || message.value.usageReceipt.requestedModel !== record.binding.model
        || !(reportedModel === null || MODEL.test(reportedModel))
        || !(message.value.usageReceipt.providerRequestIdHash === null
          || HASH.test(message.value.usageReceipt.providerRequestIdHash))
        || !HASH.test(message.value.usageReceipt.responseFingerprint)
        || !HASH.test(message.value.usageReceipt.dnsAddressSetHash)
        || !Number.isInteger(message.value.usageReceipt.status)
        || message.value.usageReceipt.status < 200
        || message.value.usageReceipt.status >= 300
        || ![usage.inputUnits, usage.outputUnits, usage.totalUnits]
          .every((value) => Number.isSafeInteger(value) && value >= 0)
        || usage.totalUnits < usage.inputUnits + usage.outputUnits
        || message.value.usageReceipt.tlsServerName
          !== record.binding.endpoint.hostname
        || message.value.usageReceipt.tlsCertificateVerificationDisabled !== false
        || message.value.usageReceipt.redirectFollowed !== false
        || message.value.usageReceipt.proxyUsed !== false
        || message.value.usageReceipt.physicalAttempts !== 1
        || message.value.usageReceipt.automaticRetries !== 0
        || !Number.isFinite(Date.parse(message.value.usageReceipt.startedAt))
        || !Number.isFinite(Date.parse(message.value.usageReceipt.finishedAt))
        || message.value.usageReceipt.trainingTruth !== false
        || containsStarcraftTmgOnlineCredentialMaterialV1(message.value)) {
        throw new TypeError("Provider Worker success is unsafe");
      }
      return freeze(clone(message.value));
    }
    exactFields(message, FAILURE_RESULT_FIELDS, "Provider Worker failure result");
    if (message.ok !== false || !CODE.test(String(message.code || ""))) {
      throw new TypeError("Provider Worker failure is invalid");
    }
    exactFields(message.safeReceipt, FAILURE_RECEIPT_FIELDS,
      "Provider Worker failure receipt");
    const { receiptHash, ...failureBody } = message.safeReceipt;
    const attemptCount = message.safeReceipt.physicalAttempts;
    if (message.safeReceipt.schemaVersion
        !== "starcraft_tmg_provider_egress_transport_v1.failure"
      || message.safeReceipt.code !== message.code
      || typeof message.safeReceipt.requestDefinitelyNotSent !== "boolean"
      || typeof message.safeReceipt.requestMayHaveBeenSent !== "boolean"
      || message.safeReceipt.requestDefinitelyNotSent
        && message.safeReceipt.requestMayHaveBeenSent
      || !Number.isSafeInteger(attemptCount) || attemptCount < 0 || attemptCount > 1
      || attemptCount === 0 && message.safeReceipt.requestDefinitelyNotSent !== true
      || attemptCount === 1 && message.safeReceipt.requestMayHaveBeenSent !== true
      || !(message.safeReceipt.status === null
        || (Number.isSafeInteger(message.safeReceipt.status)
          && message.safeReceipt.status >= 100
          && message.safeReceipt.status <= 599))
      || message.safeReceipt.automaticRetries !== 0
      || message.safeReceipt.trainingTruth !== false
      || !HASH.test(String(receiptHash || ""))
      || receiptHash !== hashStarcraftTmgContract(failureBody)
      || containsStarcraftTmgOnlineCredentialMaterialV1(message.safeReceipt)) {
      throw new TypeError("Provider Worker failure receipt is unsafe");
    }
    throw new StarcraftTmgProviderEgressError(message.code, {
      requestDefinitelyNotSent: message.safeReceipt.requestDefinitelyNotSent,
      requestMayHaveBeenSent: message.safeReceipt.requestMayHaveBeenSent,
      status: message.safeReceipt.status,
      physicalAttempts: message.safeReceipt.physicalAttempts,
    });
  }

  async function attachOwned(input) {
    exactFields(input, ATTACH_FIELDS, "attachCredential input");
    if (closed) throw new Error("Provider Worker port is closed");
    const attachmentId = safeId(input.attachmentId, "attachmentId");
    if (!printableBuffer(input.credentialBytes, maxCredentialBytes)) {
      throw new TypeError("Provider Worker requires bounded printable bytes");
    }
    if (attachmentIndex.has(attachmentId)) {
      throw new Error("Provider Worker attachment already exists");
    }
    if (active.size >= maxWorkers) throw new Error("Provider Worker capacity exceeded");
    const profile = assertStarcraftTmgCharacterContract(
      input.providerProfile, "provider-profile");
    const profileRef = {
      id: profile.providerProfileId,
      version: profile.version,
      hash: profile.integrity.hash,
    };
    const resolved = await timeout(providerProfileRegistry.resolveEgressBinding({
      profileRef,
    }), handshakeTimeoutMs, "Provider registry resolution timed out");
    if (resolved?.ok !== true
      || resolved.providerProfile?.integrity?.hash !== profile.integrity.hash) {
      throw new TypeError("Provider registry did not resolve the attached profile");
    }
    const binding = assertStarcraftTmgProviderEgressBindingV1(
      resolved.egressBinding);
    if (binding.providerProfileRef.hash !== profile.integrity.hash) {
      throw new TypeError("Provider egress binding does not match the attached profile");
    }
    const workerRef = identifier("sc-provider-worker");
    const initializeRequestId = identifier("sc-provider-worker-init");
    const child = spawnProcess(childPath);
    if (!child || typeof child.on !== "function" || typeof child.send !== "function"
      || typeof child.kill !== "function") {
      throw new TypeError("spawnProcess returned an invalid child");
    }
    let resolveAttach;
    let rejectAttach;
    let resolveExit;
    const attachPromise = new Promise((resolve, reject) => {
      resolveAttach = resolve;
      rejectAttach = reject;
    });
    const exitPromise = new Promise((resolve) => { resolveExit = resolve; });
    const record = {
      workerRef, attachmentId, initializeRequestId, child, binding,
      state: "starting", startedAt: instant(), attachedAt: null,
      attached: false, attachRejected: false, expectedExit: false, exited: false,
      pending: null, cancelRequests: new Map(), handshakeTimer: null, killTimer: null,
      resolveAttach, rejectAttach, exitPromise, resolveExit,
    };
    active.set(workerRef, record);
    attachmentIndex.set(attachmentId, workerRef);
    record.handshakeTimer = setTimeout(() => kill(record,
      "Provider Worker acknowledgement timed out"), handshakeTimeoutMs);
    child.on("message", (message) => {
      if (record.state === "starting" && message?.type === "initialized") {
        try {
          validateInitialized(record, message);
          clearTimeout(record.handshakeTimer);
          record.state = "attached";
          record.attachedAt = instant();
          record.attached = true;
          record.resolveAttach(freeze({ ok: true, workerRef }));
        } catch {
          kill(record, "Provider Worker acknowledgement rejected");
        }
        return;
      }
      if (record.pending && message?.type === "provider_result") {
        const pending = record.pending;
        record.pending = null;
        clearTimeout(pending.timer);
        pending.signal?.removeEventListener?.("abort", pending.abort);
        try {
          pending.resolve(validateResult(record, pending, message));
        } catch (error) {
          pending.reject(error);
          if (!(error instanceof StarcraftTmgProviderEgressError)) {
            kill(record, "Provider Worker emitted an unsafe result", false);
          }
        }
        return;
      }
      if (record.state === "stopping" && message?.type === "shutdown_complete") {
        try {
          exactFields(message, SHUTDOWN_FIELDS,
            "Provider Worker shutdown acknowledgement");
          if (message.ok !== true || message.requestId !== record.shutdownRequestId
            || message.workerVersion
              !== STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION
            || message.sensitiveBytesZeroed !== true
            || message.trainingTruth !== false) throw new Error("shutdown mismatch");
        } catch {
          if (record.child.exitCode === null && record.child.signalCode === null) {
            record.child.kill("SIGKILL");
          }
        }
        return;
      }
      if (message?.type === "cancel_complete"
        && record.cancelRequests.has(message.requestId)) {
        const targetRequestId = record.cancelRequests.get(message.requestId);
        try {
          exactFields(message, CANCEL_RESULT_FIELDS,
            "Provider Worker cancel acknowledgement");
          if (message.ok !== true || typeof message.matched !== "boolean"
            || message.targetRequestId !== targetRequestId
            || message.workerVersion
              !== STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION
            || message.trainingTruth !== false
            || containsStarcraftTmgOnlineCredentialMaterialV1(message)) {
            throw new Error("cancel acknowledgement mismatch");
          }
        } catch {
          kill(record, "Provider Worker emitted an unsafe cancel acknowledgement",
            false);
        }
        record.cancelRequests.delete(message.requestId);
        return;
      }
      kill(record, "Provider Worker emitted an unexpected message",
        !record.attached);
    });
    child.on("error", () => kill(record, "Provider Worker process error",
      !record.attached));
    child.on("exit", (code, signal) => recordExit(record, code, signal));
    child.send({
      type: "initialize",
      requestId: initializeRequestId,
      attachmentId,
      egressBinding: binding,
      credentialBytes: input.credentialBytes,
    }, (error) => {
      if (error) kill(record, "Provider Worker initialization send failed");
    });
    return attachPromise;
  }

  async function attachCredential(input = {}) {
    const owned = input?.credentialBytes;
    try {
      return await attachOwned(input);
    } finally {
      if (Buffer.isBuffer(owned)) owned.fill(0);
    }
  }

  async function complete(input = {}) {
    exactFields(input, COMPLETE_FIELDS, "Provider Worker complete input");
    const workerRef = safeId(input.workerRef, "workerRef");
    const record = active.get(workerRef);
    if (!record || record.state !== "attached") {
      throw new StarcraftTmgProviderEgressError("PROVIDER_WORKER_NOT_ATTACHED", {
        requestDefinitelyNotSent: true,
      });
    }
    if (record.pending) {
      throw new StarcraftTmgProviderEgressError("PROVIDER_WORKER_BUSY", {
        requestDefinitelyNotSent: true,
      });
    }
    if (input.signal !== undefined && input.signal !== null
      && (typeof input.signal !== "object"
        || typeof input.signal.addEventListener !== "function"
        || typeof input.signal.removeEventListener !== "function")) {
      throw new TypeError("Provider Worker signal is invalid");
    }
    if (input.signal?.aborted) {
      throw new StarcraftTmgProviderEgressError("PROVIDER_ABORTED", {
        requestDefinitelyNotSent: true,
      });
    }
    let safeProviderRequest;
    try {
      safeProviderRequest = clone(input.providerRequest);
    } catch {
      throw new StarcraftTmgProviderEgressError(
        "PROVIDER_REQUEST_CONTRACT_REJECTED", {
          requestDefinitelyNotSent: true,
        });
    }
    const requestId = identifier("sc-provider-call");
    return await new Promise((resolve, reject) => {
      const abort = () => {
        if (!record.pending || record.pending.requestId !== requestId) return;
        const cancelRequestId = identifier("sc-provider-cancel");
        record.cancelRequests.set(cancelRequestId, requestId);
        record.child.send({
          type: "cancel", requestId: cancelRequestId, targetRequestId: requestId,
        }, () => {});
      };
      record.pending = {
        requestId,
        providerRequestId: String(safeProviderRequest?.requestId || ""),
        resolve,
        reject,
        signal: input.signal || null,
        abort,
        timer: setTimeout(() => {
          if (record.pending?.requestId === requestId) {
            kill(record, "Provider Worker result timed out", false);
          }
        }, record.binding.timeoutMs + handshakeTimeoutMs),
      };
      record.pending.timer.unref?.();
      input.signal?.addEventListener?.("abort", abort, { once: true });
      record.child.send({
        type: "complete",
        requestId,
        providerRequest: safeProviderRequest,
      }, (error) => {
        if (error) kill(record, "Provider Worker request send failed", false);
      });
    });
  }

  async function detachCredential(input = {}) {
    exactFields(input, DETACH_FIELDS, "detachCredential input");
    const workerRef = safeId(input.workerRef, "workerRef");
    const reason = safeReason(input.reason);
    const record = active.get(workerRef);
    if (!record) return freeze({ ok: true });
    if (record.state === "stopping") {
      await record.exitPromise;
      return freeze({ ok: true });
    }
    record.expectedExit = true;
    record.state = "stopping";
    record.shutdownRequestId = identifier("sc-provider-worker-stop");
    record.killTimer = setTimeout(() => {
      if (record.child.exitCode === null && record.child.signalCode === null) {
        record.child.kill("SIGKILL");
      }
    }, shutdownGraceMs);
    record.killTimer.unref?.();
    if (record.child.connected) {
      record.child.send({
        type: "shutdown",
        requestId: record.shutdownRequestId,
        reason,
      }, (error) => {
        if (error && record.child.exitCode === null
          && record.child.signalCode === null) record.child.kill("SIGKILL");
      });
    } else if (record.child.exitCode === null && record.child.signalCode === null) {
      record.child.kill("SIGKILL");
    }
    await record.exitPromise;
    return freeze({ ok: true });
  }

  function readWorkerState(input = {}) {
    exactFields(input, READ_FIELDS, "readWorkerState input");
    const workerRef = safeId(input.workerRef, "workerRef");
    const record = active.get(workerRef);
    if (record) return freeze({ ok: true, worker: state(record) });
    const tombstone = tombstones.get(workerRef);
    return tombstone ? freeze({ ok: true, worker: tombstone })
      : freeze({ ok: false, reason: "provider_worker_not_found",
        trainingTruth: false });
  }

  async function close() {
    if (closed) return freeze({ ok: true, idempotentReplay: true,
      trainingTruth: false });
    closed = true;
    const refs = [...active.keys()];
    await Promise.all(refs.map((workerRef) => detachCredential({
      workerRef, reason: "worker_port_closed",
    })));
    return freeze({ ok: true, idempotentReplay: false,
      detachedWorkers: refs.length, trainingTruth: false });
  }

  return Object.freeze({
    metadata, attachCredential, complete, detachCredential, readWorkerState, close,
  });
}
