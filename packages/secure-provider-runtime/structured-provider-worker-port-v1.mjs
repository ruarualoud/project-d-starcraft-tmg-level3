import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { assertStarcraftTmgCharacterContract } from
  "../character-agent/contracts-v1.mjs";
import { assertStarcraftTmgProviderEgressBindingV2 } from
  "./provider-egress-contract-v2.mjs";
import { StarcraftTmgStructuredTransportError } from
  "./structured-provider-egress-transport-v1.mjs";

export const STARCRAFT_TMG_STRUCTURED_PROVIDER_WORKER_PORT_VERSION =
  "starcraft_tmg_structured_provider_worker_port_v1";

const CHILD_PATH = fileURLToPath(new URL(
  "./structured-provider-worker-child-v1.mjs", import.meta.url));
const WIRE_VERSION = "starcraft_tmg_structured_provider_worker_child_v1";
const ID = /^[A-Za-z0-9._:-]{8,200}$/u;

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

function id(value, field) {
  const result = String(value || "");
  if (!ID.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function spawnChild() {
  return spawn(process.execPath, [CHILD_PATH], {
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
    promise.then((value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); });
  });
}

export function createStarcraftTmgStructuredProviderWorkerPortV1(options = {}) {
  const registry = options.providerProfileRegistry;
  if (typeof registry?.resolveEgressBinding !== "function") {
    throw new TypeError("Structured Provider registry is required");
  }
  const createId = options.createId || (() => randomUUID());
  const handshakeTimeoutMs = options.handshakeTimeoutMs || 5_000;
  const workers = new Map();
  let closed = false;
  const identifier = (prefix) => id(`${prefix}-${createId(prefix)}`, prefix);

  async function attachCredential(input = {}) {
    const owned = input.credentialBytes;
    try {
      if (closed || !Buffer.isBuffer(owned) || owned.length < 8
        || owned.length > 8_192
        || !owned.every((byte) => byte >= 0x21 && byte <= 0x7e)) {
        throw new TypeError("Structured Provider credential is invalid");
      }
      const profile = assertStarcraftTmgCharacterContract(
        input.providerProfile, "provider-profile");
      const resolved = await registry.resolveEgressBinding({
        profileRef: { id: profile.providerProfileId, version: profile.version,
          hash: profile.integrity.hash },
      });
      if (resolved?.ok !== true) throw new TypeError("Provider profile not found");
      const binding = assertStarcraftTmgProviderEgressBindingV2(
        resolved.egressBinding);
      const workerRef = identifier("sc-structured-worker");
      const requestId = identifier("sc-structured-init");
      const attachmentId = id(input.attachmentId, "attachmentId");
      const child = spawnChild();
      const record = { child, workerRef, binding, pending: null,
        state: "starting", exitPromise: null, resolveExit: null };
      record.exitPromise = new Promise((resolve) => { record.resolveExit = resolve; });
      workers.set(workerRef, record);
      const initialized = new Promise((resolve, reject) => {
        record.initialize = { requestId, attachmentId, resolve, reject };
      });
      child.on("message", (message) => {
        if (record.state === "starting" && message?.type === "initialized") {
          const isolation = message.isolation;
          if (message.requestId !== requestId || message.attachmentId !== attachmentId
            || message.workerVersion !== WIRE_VERSION || message.ok !== true
            || message.providerProfileHash !== binding.providerProfileRef.hash
            || message.egressPolicyHash !== binding.policyHash
            || isolation?.processIsolated !== true
            || isolation?.environmentInheritedFromParent !== false
            || isolation?.environmentAllowlistPassed !== true
            || isolation?.credentialPersistence
              !== "child_process_session_memory_only"
            || isolation?.credentialReturnedOverIpc !== false
            || isolation?.providerTransportMounted !== true
            || isolation?.networkRequestMadeAtInitialization !== false
            || isolation?.rulesRoomAgentSkillMemoryOrDshImported !== false
            || message.trainingTruth !== false) {
            record.initialize.reject(new Error("Structured Worker acknowledgement invalid"));
            child.kill("SIGKILL"); return;
          }
          record.state = "attached";
          record.initialize.resolve({ ok: true, workerRef });
          return;
        }
        if (record.pending && message?.type === "provider_result") {
          const pending = record.pending;
          if (message.requestId !== pending.requestId
            || message.workerVersion !== WIRE_VERSION
            || message.trainingTruth !== false) {
            pending.reject(new StarcraftTmgStructuredTransportError(
              "PROVIDER_WORKER_RESULT_VALIDATION_REJECTED", {
                requestMayHaveBeenSent: true, physicalAttempts: 1,
                outputContractRef: pending.sendRequest.outputContractRef,
              }));
            record.pending = null; child.kill("SIGKILL"); return;
          }
          record.pending = null;
          pending.signal?.removeEventListener?.("abort", pending.abort);
          if (message.ok === false) {
            const error = new Error(message.code);
            error.code = message.code;
            error.safeReceipt = freeze(clone(message.safeReceipt));
            pending.reject(error); return;
          }
          const value = message.value;
          const receipt = value?.transportReceipt;
          if (message.ok !== true || value?.delivery !== "response_received"
            || value.physicalAttempts !== 1 || !object(value.payload)
            || receipt?.requestId !== pending.sendRequest.requestId
            || receipt?.egressPolicyHash !== binding.policyHash
            || receipt?.requestBodyHash
              !== hashStarcraftTmgContract(pending.sendRequest.body)
            || receipt?.payloadHash !== hashStarcraftTmgContract(value.payload)
            || receipt?.outputContractRef?.hash
              !== pending.sendRequest.outputContractRef.hash) {
            pending.reject(new StarcraftTmgStructuredTransportError(
              "PROVIDER_WORKER_RESULT_VALIDATION_REJECTED", {
                requestMayHaveBeenSent: true, physicalAttempts: 1,
                outputContractRef: pending.sendRequest.outputContractRef,
              }));
            child.kill("SIGKILL"); return;
          }
          pending.resolve(freeze(clone(value)));
          return;
        }
        if (record.state === "stopping"
          && message?.type === "shutdown_complete") return;
        if (message?.type === "cancel_complete") return;
        child.kill("SIGKILL");
      });
      child.on("error", (error) => {
        record.initialize?.reject(error);
        record.pending?.reject(error);
      });
      child.on("exit", () => {
        workers.delete(workerRef);
        record.pending?.reject(new StarcraftTmgStructuredTransportError(
          "PROVIDER_WORKER_EXITED", {
            requestMayHaveBeenSent: true, physicalAttempts: 1,
            outputContractRef: record.pending.sendRequest.outputContractRef,
          }));
        record.resolveExit();
      });
      child.send({ type: "initialize", requestId, attachmentId,
        egressBinding: binding, credentialBytes: owned });
      await timeout(initialized, handshakeTimeoutMs,
        "Structured Worker acknowledgement timed out");
      return freeze({ ok: true, workerRef });
    } finally {
      if (Buffer.isBuffer(owned)) owned.fill(0);
    }
  }

  async function send(input = {}) {
    const record = workers.get(id(input.workerRef, "workerRef"));
    if (!record || record.state !== "attached") {
      throw new StarcraftTmgStructuredTransportError(
        "PROVIDER_WORKER_NOT_ATTACHED", { requestDefinitelyNotSent: true,
          outputContractRef: input.outputContractRef });
    }
    if (record.pending) {
      throw new StarcraftTmgStructuredTransportError("PROVIDER_WORKER_BUSY", {
        requestDefinitelyNotSent: true,
        outputContractRef: input.outputContractRef,
      });
    }
    const requestId = identifier("sc-structured-call");
    const sendRequest = { requestId: input.requestId,
      endpoint: clone(input.endpoint), body: clone(input.body),
      outputContractRef: clone(input.outputContractRef) };
    return await new Promise((resolve, reject) => {
      const abort = () => {
        if (record.pending?.requestId !== requestId) return;
        record.child.send({ type: "cancel",
          requestId: identifier("sc-structured-cancel"),
          targetRequestId: requestId });
      };
      record.pending = { requestId, sendRequest, resolve, reject,
        signal: input.signal, abort };
      input.signal?.addEventListener?.("abort", abort, { once: true });
      record.child.send({ type: "send", requestId, sendRequest }, (error) => {
        if (error && record.pending?.requestId === requestId) {
          record.pending = null;
          reject(new StarcraftTmgStructuredTransportError(
            "PROVIDER_WORKER_IPC_FAILED", {
              requestDefinitelyNotSent: true,
              outputContractRef: sendRequest.outputContractRef,
            }));
        }
      });
    });
  }

  async function detachCredential(input = {}) {
    const workerRef = id(input.workerRef, "workerRef");
    const record = workers.get(workerRef);
    if (!record) return freeze({ ok: true, idempotent: true });
    record.state = "stopping";
    record.child.send({ type: "shutdown",
      requestId: identifier("sc-structured-stop"),
      reason: id(input.reason, "reason") });
    const kill = setTimeout(() => record.child.kill("SIGKILL"), 1_000);
    await record.exitPromise;
    clearTimeout(kill);
    return freeze({ ok: true, idempotent: false });
  }

  async function close() {
    if (closed) return freeze({ ok: true, idempotent: true });
    closed = true;
    await Promise.all([...workers.keys()].map((workerRef) =>
      detachCredential({ workerRef, reason: "structured_port_closed" })));
    return freeze({ ok: true, idempotent: false });
  }

  function metadata() {
    return freeze({
      schemaVersion:
        `${STARCRAFT_TMG_STRUCTURED_PROVIDER_WORKER_PORT_VERSION}.metadata`,
      childProgram: "bundled_structured_provider_worker_child_v1",
      providerTransportOwner: "credential_child_only",
      endpointDialect: "deepseek_responses_v1",
      physicalAttemptsPerSend: 1,
      automaticRetryAllowed: false,
      rawProviderPayloadPersisted: false,
      trainingTruth: false,
    });
  }

  return Object.freeze({ attachCredential, send, detachCredential, close,
    metadata });
}
