#!/usr/bin/env node

const WORKER_VERSION = "starcraft_tmg_credential_worker_child_v1";
const MAX_CREDENTIAL_BYTES = 65_536;
const ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/u;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const INITIALIZE_FIELDS = new Set([
  "type",
  "requestId",
  "attachmentId",
  "profileBinding",
  "credentialBytes",
]);
const PROFILE_FIELDS = new Set([
  "profileId",
  "version",
  "profileHash",
  "providerId",
  "baseUrl",
  "model",
  "timeoutMs",
  "maxOutputUnits",
]);
const SHUTDOWN_FIELDS = new Set(["type", "requestId", "reason"]);
const ALLOWED_ENVIRONMENT_KEYS = new Set(["NODE_NO_WARNINGS"]);

for (const key of Object.keys(process.env)) {
  if (!ALLOWED_ENVIRONMENT_KEYS.has(key)) delete process.env[key];
}

let initialized = false;
let shuttingDown = false;
let sensitiveBytes = null;
let providerBinding = null;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const forbidden = Object.keys(value).filter((key) => !allowed.has(key));
  if (forbidden.length) throw new TypeError(`${label} contains forbidden fields`);
}

function safeId(value, field) {
  const normalized = String(value || "");
  if (!ID_PATTERN.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function positiveInteger(value, field, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  return value;
}

function normalizeProfile(value) {
  exactFields(value, PROFILE_FIELDS, "profileBinding");
  const profileHash = String(value.profileHash || "").toLowerCase();
  if (!HASH_PATTERN.test(profileHash)) {
    throw new TypeError("profileBinding.profileHash is invalid");
  }
  const baseUrl = String(value.baseUrl || "");
  if (!baseUrl.startsWith("https://") || baseUrl.length > 2048) {
    throw new TypeError("profileBinding.baseUrl is invalid");
  }
  return Object.freeze({
    profileId: safeId(value.profileId, "profileBinding.profileId"),
    version: String(value.version || "").slice(0, 120),
    profileHash,
    providerId: safeId(value.providerId, "profileBinding.providerId"),
    baseUrl,
    model: String(value.model || "").slice(0, 240),
    timeoutMs: positiveInteger(value.timeoutMs,
      "profileBinding.timeoutMs", 300_000),
    maxOutputUnits: positiveInteger(value.maxOutputUnits,
      "profileBinding.maxOutputUnits", 1_000_000),
  });
}

function scrub() {
  if (Buffer.isBuffer(sensitiveBytes)) sensitiveBytes.fill(0);
  sensitiveBytes = null;
  providerBinding = null;
  initialized = false;
}

function send(message, callback = undefined) {
  if (!process.connected || typeof process.send !== "function") {
    callback?.();
    return;
  }
  process.send(message, callback);
}

function isolationProjection() {
  const environmentKeys = Object.keys(process.env).sort();
  return Object.freeze({
    processIsolated: true,
    environmentInheritedFromParent: false,
    environmentKeys,
    environmentAllowlistPassed:
      environmentKeys.every((key) => ALLOWED_ENVIRONMENT_KEYS.has(key)),
    standardInputClosed: process.stdin.isTTY !== true,
    standardOutputApplicationDataAllowed: false,
    standardErrorApplicationDataAllowed: false,
    credentialPersistence: "child_process_session_memory_only",
    credentialReturnedOverIpc: false,
    providerTransportMounted: false,
    networkRequestMade: false,
    rulesRoomAgentSkillMemoryOrDshImported: false,
    trainingTruth: false,
  });
}

function failAndExit(requestId, reason) {
  scrub();
  shuttingDown = true;
  send({
    type: "worker_failure",
    requestId: typeof requestId === "string" ? requestId : null,
    ok: false,
    reason,
    workerVersion: WORKER_VERSION,
    trainingTruth: false,
  }, () => {
    process.disconnect?.();
  });
}

async function handle(message) {
  if (shuttingDown) return;
  if (message?.type === "initialize") {
    if (initialized) throw new TypeError("credential worker cannot initialize twice");
    exactFields(message, INITIALIZE_FIELDS, "initialize message");
    const requestId = safeId(message.requestId, "requestId");
    const attachmentId = safeId(message.attachmentId, "attachmentId");
    if (!Buffer.isBuffer(message.credentialBytes)
      || message.credentialBytes.length < 8
      || message.credentialBytes.length > MAX_CREDENTIAL_BYTES) {
      throw new TypeError("credential worker bytes are invalid");
    }
    for (const byte of message.credentialBytes.values()) {
      if (byte < 0x21 || byte > 0x7e) {
        throw new TypeError("credential worker bytes are invalid");
      }
    }
    const normalizedProfile = normalizeProfile(message.profileBinding);
    sensitiveBytes = Buffer.from(message.credentialBytes);
    message.credentialBytes.fill(0);
    providerBinding = normalizedProfile;
    initialized = true;
    send({
      type: "initialized",
      requestId,
      attachmentId,
      ok: true,
      workerVersion: WORKER_VERSION,
      profileHash: providerBinding.profileHash,
      isolation: isolationProjection(),
      trainingTruth: false,
    });
    return;
  }
  if (message?.type === "shutdown") {
    exactFields(message, SHUTDOWN_FIELDS, "shutdown message");
    const requestId = safeId(message.requestId, "requestId");
    const reason = safeId(message.reason, "reason");
    shuttingDown = true;
    scrub();
    send({
      type: "shutdown_complete",
      requestId,
      ok: true,
      reason,
      workerVersion: WORKER_VERSION,
      sensitiveBytesZeroed: true,
      trainingTruth: false,
    }, () => {
      process.disconnect?.();
    });
    return;
  }
  throw new TypeError("credential worker message type is forbidden");
}

if (typeof process.send !== "function") {
  throw new Error("credential worker requires a parent IPC channel");
}

process.on("message", (message) => {
  Promise.resolve(handle(message)).catch(() => {
    failAndExit(message?.requestId, "credential_worker_protocol_rejected");
  });
});

process.on("disconnect", () => {
  scrub();
  process.exit(0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    scrub();
    process.exit(0);
  });
}

process.on("uncaughtException", () => {
  scrub();
  process.exit(1);
});

process.on("unhandledRejection", () => {
  scrub();
  process.exit(1);
});

export { WORKER_VERSION as STARCRAFT_TMG_CREDENTIAL_WORKER_CHILD_VERSION };
