#!/usr/bin/env node

import { assertStarcraftTmgProviderEgressBindingV1 } from
  "./provider-egress-contract-v1.mjs";
import {
  createStarcraftTmgProviderEgressTransportV1,
  StarcraftTmgProviderEgressError,
} from "./provider-egress-transport-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION =
  "starcraft_tmg_provider_egress_worker_child_v1";

const MAX_CREDENTIAL_BYTES = 65_536;
const ID = /^[A-Za-z0-9._:-]{8,200}$/u;
const INITIALIZE_FIELDS = new Set([
  "type", "requestId", "attachmentId", "egressBinding", "credentialBytes",
]);
const COMPLETE_FIELDS = new Set(["type", "requestId", "providerRequest"]);
const CANCEL_FIELDS = new Set(["type", "requestId", "targetRequestId"]);
const SHUTDOWN_FIELDS = new Set(["type", "requestId", "reason"]);
const ALLOWED_ENVIRONMENT_KEYS = new Set(["NODE_NO_WARNINGS"]);

for (const key of Object.keys(process.env)) {
  if (!ALLOWED_ENVIRONMENT_KEYS.has(key)) delete process.env[key];
}

let initialized = false;
let closing = false;
let credentialBytes = null;
let egressBinding = null;
let inFlight = null;
const transport = createStarcraftTmgProviderEgressTransportV1();

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function printableBuffer(value) {
  return Buffer.isBuffer(value) && value.length >= 8
    && value.length <= MAX_CREDENTIAL_BYTES
    && value.every((byte) => byte >= 0x21 && byte <= 0x7e);
}

function scrub() {
  if (Buffer.isBuffer(credentialBytes)) credentialBytes.fill(0);
  credentialBytes = null;
  egressBinding = null;
  initialized = false;
}

function reply(message, callback = undefined) {
  if (!process.connected || typeof process.send !== "function") {
    callback?.();
    return;
  }
  process.send(message, callback);
}

function isolation() {
  const environmentKeys = Object.keys(process.env).sort();
  return Object.freeze({
    processIsolated: true,
    environmentInheritedFromParent: false,
    environmentKeys,
    environmentAllowlistPassed:
      environmentKeys.every((key) => ALLOWED_ENVIRONMENT_KEYS.has(key)),
    credentialPersistence: "child_process_session_memory_only",
    credentialReturnedOverIpc: false,
    providerTransportMounted: true,
    networkRequestMadeAtInitialization: false,
    rulesRoomAgentSkillMemoryOrDshImported: false,
    trainingTruth: false,
  });
}

async function initialize(message) {
  exactFields(message, INITIALIZE_FIELDS, "initialize message");
  if (initialized || closing) throw new TypeError("Provider Worker cannot initialize twice");
  const requestId = safeId(message.requestId, "requestId");
  const attachmentId = safeId(message.attachmentId, "attachmentId");
  if (!printableBuffer(message.credentialBytes)) {
    throw new TypeError("Provider Worker credential bytes are invalid");
  }
  const binding = assertStarcraftTmgProviderEgressBindingV1(message.egressBinding);
  credentialBytes = Buffer.from(message.credentialBytes);
  message.credentialBytes.fill(0);
  egressBinding = binding;
  initialized = true;
  reply({
    type: "initialized",
    requestId,
    attachmentId,
    ok: true,
    workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
    providerProfileHash: binding.providerProfileRef.hash,
    egressPolicyHash: binding.policyHash,
    isolation: isolation(),
    trainingTruth: false,
  });
}

async function complete(message) {
  exactFields(message, COMPLETE_FIELDS, "complete message");
  const requestId = safeId(message.requestId, "requestId");
  if (!initialized || !credentialBytes || !egressBinding || closing) {
    throw new TypeError("Provider Worker is not attached");
  }
  if (inFlight) throw new TypeError("Provider Worker is single-flight");
  const controller = new AbortController();
  const operation = transport.complete({
    egressBinding,
    credentialBytes,
    providerRequest: message.providerRequest,
    signal: controller.signal,
  });
  inFlight = { requestId, controller, operation };
  try {
    const value = await operation;
    reply({
      type: "provider_result",
      requestId,
      ok: true,
      value,
      workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
      trainingTruth: false,
    });
  } catch (error) {
    const safe = error instanceof StarcraftTmgProviderEgressError
      ? error : new StarcraftTmgProviderEgressError("PROVIDER_TRANSPORT_FAILED", {
        requestMayHaveBeenSent: true,
        physicalAttempts: 1,
      });
    reply({
      type: "provider_result",
      requestId,
      ok: false,
      code: safe.code,
      safeReceipt: safe.safeReceipt,
      workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
      trainingTruth: false,
    });
  } finally {
    if (inFlight?.requestId === requestId) inFlight = null;
  }
}

async function cancel(message) {
  exactFields(message, CANCEL_FIELDS, "cancel message");
  const requestId = safeId(message.requestId, "requestId");
  const targetRequestId = safeId(message.targetRequestId, "targetRequestId");
  const matched = inFlight?.requestId === targetRequestId;
  if (matched) inFlight.controller.abort();
  reply({
    type: "cancel_complete",
    requestId,
    targetRequestId,
    ok: true,
    matched,
    workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
    trainingTruth: false,
  });
}

async function shutdown(message) {
  exactFields(message, SHUTDOWN_FIELDS, "shutdown message");
  const requestId = safeId(message.requestId, "requestId");
  const reason = safeId(message.reason, "reason");
  closing = true;
  if (inFlight) {
    inFlight.controller.abort();
    try { await inFlight.operation; } catch {}
  }
  scrub();
  reply({
    type: "shutdown_complete",
    requestId,
    ok: true,
    reason,
    workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
    sensitiveBytesZeroed: true,
    trainingTruth: false,
  }, () => process.disconnect?.());
}

async function handle(message) {
  if (message?.type === "initialize") return initialize(message);
  if (message?.type === "complete") return complete(message);
  if (message?.type === "cancel") return cancel(message);
  if (message?.type === "shutdown") return shutdown(message);
  throw new TypeError("Provider Worker message type is forbidden");
}

function fatal(message) {
  const requestId = typeof message?.requestId === "string"
    && ID.test(message.requestId) ? message.requestId : null;
  inFlight?.controller.abort();
  scrub();
  closing = true;
  reply({
    type: "worker_failure",
    requestId,
    ok: false,
    code: "PROVIDER_WORKER_PROTOCOL_REJECTED",
    workerVersion: STARCRAFT_TMG_PROVIDER_EGRESS_WORKER_CHILD_VERSION,
    trainingTruth: false,
  }, () => process.disconnect?.());
}

if (typeof process.send !== "function") {
  throw new Error("Provider Worker requires a parent IPC channel");
}

process.on("message", (message) => {
  Promise.resolve(handle(message)).catch(() => fatal(message));
});

process.on("disconnect", () => {
  inFlight?.controller.abort();
  scrub();
  process.exit(0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    inFlight?.controller.abort();
    scrub();
    process.exit(0);
  });
}

process.on("uncaughtException", () => {
  inFlight?.controller.abort();
  scrub();
  process.exit(1);
});

process.on("unhandledRejection", () => {
  inFlight?.controller.abort();
  scrub();
  process.exit(1);
});
