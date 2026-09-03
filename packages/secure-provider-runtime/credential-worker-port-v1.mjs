import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { assertStarcraftTmgCharacterContract } from
  "../character-agent/contracts-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "../online-agent-session/portable-credential-material-v1.mjs";

export const STARCRAFT_TMG_CREDENTIAL_WORKER_PORT_VERSION =
  "starcraft_tmg_credential_worker_port_v1";
export const STARCRAFT_TMG_CREDENTIAL_WORKER_CHILD_VERSION =
  "starcraft_tmg_credential_worker_child_v1";

const DEFAULT_CHILD_PATH = fileURLToPath(
  new URL("./credential-worker-child-v1.mjs", import.meta.url));
const ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/u;
const ATTACH_FIELDS = new Set([
  "attachmentId", "providerProfile", "credentialBytes",
]);
const DETACH_FIELDS = new Set(["workerRef", "reason"]);
const READ_FIELDS = new Set(["workerRef"]);
const INITIALIZED_FIELDS = new Set([
  "type", "requestId", "attachmentId", "ok", "workerVersion",
  "profileHash", "isolation", "trainingTruth",
]);
const ISOLATION_FIELDS = new Set([
  "processIsolated", "environmentInheritedFromParent", "environmentKeys",
  "environmentAllowlistPassed", "standardInputClosed",
  "standardOutputApplicationDataAllowed", "standardErrorApplicationDataAllowed",
  "credentialPersistence", "credentialReturnedOverIpc",
  "providerTransportMounted", "networkRequestMade",
  "rulesRoomAgentSkillMemoryOrDshImported", "trainingTruth",
]);
const SHUTDOWN_FIELDS = new Set([
  "type", "requestId", "ok", "reason", "workerVersion",
  "sensitiveBytesZeroed", "trainingTruth",
]);

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

function integer(value, field, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1
    || normalized > maximum) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function safeReason(value) {
  const normalized = safeId(value, "reason");
  if (!/^[a-z][a-z0-9_]{2,79}$/u.test(normalized)) {
    throw new TypeError("reason is invalid");
  }
  return normalized;
}

function profileBinding(value) {
  const profile = assertStarcraftTmgCharacterContract(value, "provider-profile");
  if (profile.model === "administrator_must_select") {
    throw new TypeError("credential worker refuses an unconfigured model");
  }
  if (/(?:^|[-_])dsh(?:$|[-_])|deepseek.*harness|harness.*deepseek/iu
    .test(profile.provider)) {
    throw new TypeError("credential worker refuses online DSH");
  }
  return deepFreeze({
    profileId: safeId(profile.providerProfileId, "providerProfileId"),
    version: String(profile.version),
    profileHash: String(profile.integrity.hash),
    providerId: safeId(profile.provider, "provider"),
    baseUrl: String(profile.baseUrl),
    model: String(profile.model),
    timeoutMs: integer(profile.timeoutMs, "timeoutMs", 300_000),
    maxOutputUnits: integer(profile.outputBudget, "outputBudget", 1_000_000),
  });
}

function printableBuffer(value, maximum) {
  if (!Buffer.isBuffer(value) || value.length < 8 || value.length > maximum) {
    return false;
  }
  return value.every((byte) => byte >= 0x21 && byte <= 0x7e);
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

function safeExitReason(code, signal, expected) {
  if (expected) return "expected_shutdown";
  if (signal === "SIGKILL") return "unexpected_sigkill";
  if (signal === "SIGTERM") return "unexpected_sigterm";
  return Number.isInteger(code) ? `unexpected_exit_${code}` : "unexpected_exit";
}

export function createStarcraftTmgCredentialWorkerPortV1(options = {}) {
  const childPath = options.childPath || DEFAULT_CHILD_PATH;
  const spawnProcess = options.spawnProcess || spawnChild;
  if (typeof childPath !== "string" || !childPath) {
    throw new TypeError("childPath is required");
  }
  if (typeof spawnProcess !== "function") {
    throw new TypeError("spawnProcess must be a function");
  }
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
  const maxTombstones = integer(options.maxTombstones || 2_048,
    "maxTombstones", 100_000);
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
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_CREDENTIAL_WORKER_PORT_VERSION}.metadata`,
      childVersion: STARCRAFT_TMG_CREDENTIAL_WORKER_CHILD_VERSION,
      childProgram: childPath === DEFAULT_CHILD_PATH
        ? "bundled_fixed_child" : "injected_test_child",
      processGranularity: "one_child_per_attachment",
      environment: ["NODE_NO_WARNINGS"],
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      serialization: "advanced",
      shell: false,
      maxCredentialBytes,
      maxWorkers,
      handshakeTimeoutMs,
      shutdownGraceMs,
      providerTransportMounted: false,
      externalNetworkAllowed: false,
      credentialPersistence: "child_process_session_memory_only",
      automaticRestartAllowed: false,
      automaticRetryAllowed: false,
      productionReady: false,
      trainingTruth: false,
    });
  }

  function addTombstone(record, exitReason) {
    const value = deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_CREDENTIAL_WORKER_PORT_VERSION}.worker-state`,
      workerRef: record.workerRef,
      attachmentId: record.attachmentId,
      profileHash: record.profileBinding.profileHash,
      state: record.attachResolved ? "exited" : "attach_failed",
      processId: record.child.pid || null,
      startedAt: record.startedAt,
      attachedAt: record.attachedAt,
      exitedAt: instant(),
      exitReason,
      expectedExit: record.expectedExit,
      processIsolated: true,
      credentialPersistence: "none_after_process_exit",
      providerTransportMounted: false,
      networkRequestMade: false,
      automaticRestarted: false,
      trainingTruth: false,
    });
    tombstones.set(record.workerRef, value);
    while (tombstones.size > maxTombstones) {
      tombstones.delete(tombstones.keys().next().value);
    }
    return value;
  }

  function activeProjection(record) {
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_CREDENTIAL_WORKER_PORT_VERSION}.worker-state`,
      workerRef: record.workerRef,
      attachmentId: record.attachmentId,
      profileHash: record.profileBinding.profileHash,
      state: record.state,
      processId: record.child.pid || null,
      startedAt: record.startedAt,
      attachedAt: record.attachedAt,
      exitedAt: null,
      exitReason: null,
      expectedExit: record.expectedExit,
      processIsolated: true,
      credentialPersistence: "child_process_session_memory_only",
      providerTransportMounted: false,
      networkRequestMade: false,
      automaticRestarted: false,
      trainingTruth: false,
    });
  }

  function recordExit(record, code, signal) {
    if (record.exitResolved) return;
    record.exitResolved = true;
    clearTimeout(record.handshakeTimer);
    clearTimeout(record.killTimer);
    active.delete(record.workerRef);
    attachmentIndex.delete(record.attachmentId);
    const reason = safeExitReason(code, signal, record.expectedExit);
    const tombstone = addTombstone(record, reason);
    record.resolveExit(tombstone);
    if (!record.attachResolved) {
      record.attachRejected = true;
      record.rejectAttach(new Error("credential worker exited before acknowledgement"));
    } else if (!record.expectedExit) {
      Promise.resolve(onWorkerExit(deepFreeze({
        workerRef: record.workerRef,
        attachmentId: record.attachmentId,
        reason,
        occurredAt: tombstone.exitedAt,
        trainingTruth: false,
      }))).catch(() => {});
    }
  }

  function rejectAndKill(record, reason, expectedExit = true) {
    if (!record.attachResolved && !record.attachRejected) {
      record.attachRejected = true;
      record.rejectAttach(new Error(reason));
    }
    record.expectedExit = expectedExit;
    if (record.child.exitCode === null && record.child.signalCode === null) {
      record.child.kill("SIGKILL");
    }
  }

  function validateInitialized(record, message) {
    exactFields(message, INITIALIZED_FIELDS, "credential worker acknowledgement");
    exactFields(message.isolation, ISOLATION_FIELDS,
      "credential worker isolation acknowledgement");
    const {
      credentialPersistence: _persistenceClaim,
      credentialReturnedOverIpc: _returnClaim,
      ...safeIsolationFields
    } = message.isolation;
    if (message.type !== "initialized" || message.ok !== true
      || message.requestId !== record.initializeRequestId
      || message.attachmentId !== record.attachmentId
      || message.workerVersion !== STARCRAFT_TMG_CREDENTIAL_WORKER_CHILD_VERSION
      || message.profileHash !== record.profileBinding.profileHash
      || message.trainingTruth !== false
      || message.isolation.processIsolated !== true
      || message.isolation.environmentInheritedFromParent !== false
      || !Array.isArray(message.isolation.environmentKeys)
      || message.isolation.environmentKeys.join(",") !== "NODE_NO_WARNINGS"
      || message.isolation.environmentAllowlistPassed !== true
      || message.isolation.standardInputClosed !== true
      || message.isolation.standardOutputApplicationDataAllowed !== false
      || message.isolation.standardErrorApplicationDataAllowed !== false
      || message.isolation.credentialPersistence
        !== "child_process_session_memory_only"
      || message.isolation.credentialReturnedOverIpc !== false
      || message.isolation.providerTransportMounted !== false
      || message.isolation.networkRequestMade !== false
      || message.isolation.rulesRoomAgentSkillMemoryOrDshImported !== false
      || message.isolation.trainingTruth !== false
      || containsStarcraftTmgOnlineCredentialMaterialV1({
        ...message,
        isolation: safeIsolationFields,
      })) {
      throw new TypeError("credential worker isolation acknowledgement is invalid");
    }
  }

  async function attachCredentialOwned(input = {}) {
    exactFields(input, ATTACH_FIELDS, "attachCredential input");
    if (closed) throw new Error("credential worker port is closed");
    const attachmentId = safeId(input.attachmentId, "attachmentId");
    if (!printableBuffer(input.credentialBytes, maxCredentialBytes)) {
      throw new TypeError("credential worker requires bounded printable bytes");
    }
    if (attachmentIndex.has(attachmentId)) {
      throw new Error("credential worker attachment already exists");
    }
    if (active.size >= maxWorkers) {
      throw new Error("credential worker capacity exceeded");
    }
    const binding = profileBinding(input.providerProfile);
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
      workerRef,
      initializeRequestId,
      attachmentId,
      profileBinding: binding,
      child,
      state: "starting",
      startedAt: instant(),
      attachedAt: null,
      expectedExit: false,
      attachResolved: false,
      attachRejected: false,
      exitResolved: false,
      resolveAttach,
      rejectAttach,
      exitPromise,
      resolveExit,
      handshakeTimer: null,
      killTimer: null,
    };
    active.set(workerRef, record);
    attachmentIndex.set(attachmentId, workerRef);
    record.handshakeTimer = setTimeout(() => {
      rejectAndKill(record, "credential worker acknowledgement timed out");
    }, handshakeTimeoutMs);
    child.on("message", (message) => {
      if (record.state === "starting" && message?.type === "initialized") {
        try {
          validateInitialized(record, message);
          clearTimeout(record.handshakeTimer);
          record.state = "attached";
          record.attachedAt = instant();
          record.attachResolved = true;
          record.resolveAttach(deepFreeze({ ok: true, workerRef }));
        } catch {
          rejectAndKill(record, "credential worker acknowledgement rejected");
        }
        return;
      }
      if (record.state === "stopping" && message?.type === "shutdown_complete") {
        try {
          exactFields(message, SHUTDOWN_FIELDS,
            "credential worker shutdown acknowledgement");
          if (message.ok !== true || message.requestId !== record.shutdownRequestId
            || message.workerVersion
              !== STARCRAFT_TMG_CREDENTIAL_WORKER_CHILD_VERSION
            || message.sensitiveBytesZeroed !== true
            || message.trainingTruth !== false) {
            throw new TypeError("shutdown acknowledgement mismatch");
          }
          record.shutdownAcknowledged = true;
        } catch {
          record.shutdownAcknowledged = false;
          if (record.child.exitCode === null && record.child.signalCode === null) {
            record.child.kill("SIGKILL");
          }
        }
        return;
      }
      rejectAndKill(record, "credential worker emitted an unexpected message",
        !record.attachResolved);
    });
    child.on("error", () => {
      rejectAndKill(record, "credential worker process error",
        !record.attachResolved);
    });
    child.on("exit", (code, signal) => recordExit(record, code, signal));
    child.send({
      type: "initialize",
      requestId: initializeRequestId,
      attachmentId,
      profileBinding: binding,
      credentialBytes: input.credentialBytes,
    }, (error) => {
      if (error) rejectAndKill(record, "credential worker initialization send failed");
    });
    return attachPromise;
  }

  async function attachCredential(input = {}) {
    const ownedBuffer = input?.credentialBytes;
    try {
      return await attachCredentialOwned(input);
    } finally {
      if (Buffer.isBuffer(ownedBuffer)) ownedBuffer.fill(0);
    }
  }

  async function detachCredential(input = {}) {
    exactFields(input, DETACH_FIELDS, "detachCredential input");
    const workerRef = safeId(input.workerRef, "workerRef");
    const reason = safeReason(input.reason);
    const record = active.get(workerRef);
    if (!record) return deepFreeze({ ok: true });
    if (record.state === "stopping") {
      await record.exitPromise;
      return deepFreeze({ ok: true });
    }
    record.expectedExit = true;
    record.state = "stopping";
    record.shutdownRequestId = identifier("sc-provider-worker-stop");
    record.shutdownAcknowledged = false;
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
    return deepFreeze({ ok: true });
  }

  function readWorkerState(input = {}) {
    exactFields(input, READ_FIELDS, "readWorkerState input");
    const workerRef = safeId(input.workerRef, "workerRef");
    const record = active.get(workerRef);
    if (record) return deepFreeze({ ok: true, worker: activeProjection(record) });
    const tombstone = tombstones.get(workerRef);
    return tombstone
      ? deepFreeze({ ok: true, worker: tombstone })
      : deepFreeze({ ok: false, reason: "credential_worker_not_found",
        trainingTruth: false });
  }

  async function close() {
    if (closed) return deepFreeze({ ok: true, idempotentReplay: true,
      trainingTruth: false });
    closed = true;
    const refs = [...active.keys()];
    await Promise.all(refs.map((workerRef) => detachCredential({
      workerRef,
      reason: "worker_port_closed",
    })));
    return deepFreeze({
      ok: true,
      idempotentReplay: false,
      detachedWorkers: refs.length,
      trainingTruth: false,
    });
  }

  return Object.freeze({
    metadata,
    attachCredential,
    detachCredential,
    readWorkerState,
    close,
  });
}
