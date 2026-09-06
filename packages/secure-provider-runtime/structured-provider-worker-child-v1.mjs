#!/usr/bin/env node

import { assertStarcraftTmgProviderEgressBindingV2 } from
  "./provider-egress-contract-v2.mjs";
import {
  createStarcraftTmgStructuredProviderEgressTransportV1,
  StarcraftTmgStructuredTransportError,
} from "./structured-provider-egress-transport-v1.mjs";

const WIRE_VERSION = "starcraft_tmg_structured_provider_worker_child_v1";
const ID = /^[A-Za-z0-9._:-]{8,200}$/u;
const ALLOWED_ENVIRONMENT_KEYS = new Set(["NODE_NO_WARNINGS"]);
const INIT_FIELDS = new Set([
  "type", "requestId", "attachmentId", "egressBinding", "credentialBytes",
]);
const SEND_FIELDS = new Set(["type", "requestId", "sendRequest"]);
const CANCEL_FIELDS = new Set(["type", "requestId", "targetRequestId"]);
const STOP_FIELDS = new Set(["type", "requestId", "reason"]);

for (const key of Object.keys(process.env)) {
  if (!ALLOWED_ENVIRONMENT_KEYS.has(key)) delete process.env[key];
}

let credentialBytes = null;
let binding = null;
let closing = false;
let inFlight = null;
const transport = createStarcraftTmgStructuredProviderEgressTransportV1();

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, allowed, label) {
  if (!object(value) || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError(`${label} contains invalid fields`);
  }
}

function id(value, field) {
  const result = String(value || "");
  if (!ID.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function send(message, callback) {
  if (process.connected && typeof process.send === "function") {
    process.send(message, callback);
  } else callback?.();
}

function scrub() {
  credentialBytes?.fill(0);
  credentialBytes = null;
  binding = null;
}

async function initialize(message) {
  exactFields(message, INIT_FIELDS, "initialize");
  if (credentialBytes || closing || !Buffer.isBuffer(message.credentialBytes)
    || message.credentialBytes.length < 8
    || message.credentialBytes.length > 8_192
    || !message.credentialBytes.every((byte) => byte >= 0x21 && byte <= 0x7e)) {
    throw new TypeError("Structured Worker initialization is invalid");
  }
  const requestId = id(message.requestId, "requestId");
  const attachmentId = id(message.attachmentId, "attachmentId");
  binding = assertStarcraftTmgProviderEgressBindingV2(message.egressBinding);
  credentialBytes = Buffer.from(message.credentialBytes);
  message.credentialBytes.fill(0);
  const environmentKeys = Object.keys(process.env).sort();
  send({
    type: "initialized", requestId, attachmentId, ok: true,
    workerVersion: WIRE_VERSION,
    providerProfileHash: binding.providerProfileRef.hash,
    egressPolicyHash: binding.policyHash,
    isolation: {
      processIsolated: true,
      environmentInheritedFromParent: false,
      environmentKeys,
      environmentAllowlistPassed: environmentKeys.every((key) =>
        ALLOWED_ENVIRONMENT_KEYS.has(key)),
      credentialPersistence: "child_process_session_memory_only",
      credentialReturnedOverIpc: false,
      providerTransportMounted: true,
      networkRequestMadeAtInitialization: false,
      rulesRoomAgentSkillMemoryOrDshImported: false,
      trainingTruth: false,
    },
    trainingTruth: false,
  });
}

async function complete(message) {
  exactFields(message, SEND_FIELDS, "send");
  const requestId = id(message.requestId, "requestId");
  if (!credentialBytes || !binding || closing || inFlight) {
    throw new TypeError("Structured Worker is unavailable");
  }
  const controller = new AbortController();
  const operation = transport.send({ egressBinding: binding,
    credentialBytes, sendRequest: message.sendRequest,
    signal: controller.signal });
  inFlight = { requestId, controller, operation };
  try {
    const value = await operation;
    send({ type: "provider_result", requestId, ok: true, value,
      workerVersion: WIRE_VERSION, trainingTruth: false });
  } catch (error) {
    const safe = error instanceof StarcraftTmgStructuredTransportError
      ? error : new StarcraftTmgStructuredTransportError(
        "PROVIDER_TRANSPORT_FAILED", {
          requestMayHaveBeenSent: true, physicalAttempts: 1,
          outputContractRef: message.sendRequest?.outputContractRef,
        });
    send({ type: "provider_result", requestId, ok: false, code: safe.code,
      safeReceipt: safe.safeReceipt, workerVersion: WIRE_VERSION,
      trainingTruth: false });
  } finally {
    if (inFlight?.requestId === requestId) inFlight = null;
  }
}

async function cancel(message) {
  exactFields(message, CANCEL_FIELDS, "cancel");
  const requestId = id(message.requestId, "requestId");
  const targetRequestId = id(message.targetRequestId, "targetRequestId");
  const matched = inFlight?.requestId === targetRequestId;
  if (matched) inFlight.controller.abort();
  send({ type: "cancel_complete", requestId, targetRequestId, ok: true,
    matched, workerVersion: WIRE_VERSION, trainingTruth: false });
}

async function shutdown(message) {
  exactFields(message, STOP_FIELDS, "shutdown");
  const requestId = id(message.requestId, "requestId");
  const reason = id(message.reason, "reason");
  closing = true;
  if (inFlight) {
    inFlight.controller.abort();
    try { await inFlight.operation; } catch {}
  }
  scrub();
  send({ type: "shutdown_complete", requestId, reason, ok: true,
    sensitiveBytesZeroed: true, workerVersion: WIRE_VERSION,
    trainingTruth: false }, () => process.disconnect?.());
}

async function handle(message) {
  if (message?.type === "initialize") return initialize(message);
  if (message?.type === "send") return complete(message);
  if (message?.type === "cancel") return cancel(message);
  if (message?.type === "shutdown") return shutdown(message);
  throw new TypeError("Structured Worker message type is forbidden");
}

function fatal(message) {
  const requestId = typeof message?.requestId === "string"
    && ID.test(message.requestId) ? message.requestId : null;
  inFlight?.controller.abort();
  scrub(); closing = true;
  send({ type: "worker_failure", requestId, ok: false,
    code: "PROVIDER_WORKER_PROTOCOL_REJECTED", workerVersion: WIRE_VERSION,
    trainingTruth: false }, () => process.disconnect?.());
}

if (typeof process.send !== "function") {
  throw new Error("Structured Worker requires IPC");
}
process.on("message", (message) => {
  Promise.resolve(handle(message)).catch(() => fatal(message));
});
process.on("disconnect", () => { inFlight?.controller.abort(); scrub(); process.exit(0); });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => { inFlight?.controller.abort(); scrub(); process.exit(0); });
}
process.on("uncaughtException", () => { inFlight?.controller.abort(); scrub(); process.exit(1); });
process.on("unhandledRejection", () => { inFlight?.controller.abort(); scrub(); process.exit(1); });

export { WIRE_VERSION as STARCRAFT_TMG_STRUCTURED_PROVIDER_WORKER_CHILD_VERSION };
