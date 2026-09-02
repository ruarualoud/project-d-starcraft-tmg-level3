import {
  assertStarcraftTmgAuthoritativeTransportPort,
  StarcraftTmgClientTransportError,
} from "./authoritative-transport-adapters-v1.mjs";
import { assertStarcraftTmgLifecyclePort } from "./lifecycle-adapters-v1.mjs";
import { assertStarcraftTmgProjectionStorePort } from "./projection-store-adapters-v1.mjs";
import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";

export const STARCRAFT_TMG_CLIENT_DOMAIN_VERSION = "starcraft_tmg_client_domain_v1";
export const STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE = Object.freeze([
  "bootstrap",
  "read",
  "dispatch",
  "subscribe",
]);

const SURFACES = new Set(["expo_web", "expo_native", "battle_lab", "verifier"]);
const INTENT_KEYS = Object.freeze({
  refresh: ["type"],
  load_legal_space: ["type"],
  preview_finite: ["type", "actionKey"],
  preview_parameterized: ["type", "domainId", "parameters"],
  confirm_and_apply_preview: ["type", "previewId"],
  read_replay: ["type"],
});
const FORBIDDEN_INPUT_KEYS = new Set([
  "state",
  "gamestate",
  "wholestate",
  "side",
  "sidekey",
  "role",
  "rolemode",
  "confirmed",
  "confirmationboolean",
  "clientrng",
  "rngseed",
  "randomseed",
  "rulesoverride",
  "sourceoverride",
  "providercredential",
  "providerapikey",
  "apikey",
  "modelcredential",
]);
const RECOVERABLE_TRANSPORT_CODES = new Set(["NETWORK_UNAVAILABLE", "TRANSPORT_TIMEOUT"]);
const AUTHENTICATION_CODES = new Set(["AUTHENTICATION_REQUIRED", "SEAT_GRANT_INVALID", "CAPABILITY_DENIED"]);
const MAX_INPUT_BYTES = 256 * 1024;
let fallbackOperationalIdCounter = 0;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizedKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assertNoAuthorityFields(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoAuthorityFields(entry, `${path}[${index}]`));
    return;
  }
  if (!object(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_INPUT_KEYS.has(normalizedKey(key))) {
      const error = new Error(`client authority field is forbidden at ${path}.${key}`);
      error.code = "CLIENT_AUTHORITY_FIELD_REJECTED";
      error.details = { path: `${path}.${key}` };
      throw error;
    }
    assertNoAuthorityFields(entry, `${path}.${key}`);
  }
}

function assertExactKeys(value, allowed, path) {
  if (!object(value)) throw Object.assign(new Error(`${path} must be an object`), { code: "CLIENT_INPUT_INVALID" });
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw Object.assign(new Error(`${path} contains unsupported fields`), {
      code: "CLIENT_INPUT_INVALID",
      details: { path, unsupportedFields: unknown.sort() },
    });
  }
}

function utf8Length(value) {
  let bytes = 0;
  for (const character of String(value)) {
    const point = character.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function nonEmpty(value, field, maxLength = 4096) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > maxLength) {
    throw Object.assign(new Error(`${field} is required and bounded`), { code: "CLIENT_INPUT_INVALID", details: { field } });
  }
  return normalized;
}

function assertBoundedJson(value) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw Object.assign(new Error("client input is not JSON representable"), { code: "CLIENT_INPUT_INVALID" });
  }
  if (utf8Length(serialized) > MAX_INPUT_BYTES) {
    throw Object.assign(new Error("client input exceeded the configured limit"), { code: "CLIENT_INPUT_TOO_LARGE" });
  }
}

function validateBootstrap(input) {
  assertNoAuthorityFields(input);
  assertExactKeys(input, ["route", "principal", "surface", "locale"], "bootstrap");
  assertExactKeys(input.route, ["roomId"], "bootstrap.route");
  assertExactKeys(input.principal || {}, ["seatToken"], "bootstrap.principal");
  const surface = String(input.surface || "expo_web");
  if (!SURFACES.has(surface)) throw Object.assign(new Error("unsupported client surface"), { code: "CLIENT_INPUT_INVALID" });
  const normalized = {
    roomId: nonEmpty(input.route.roomId, "bootstrap.route.roomId", 256),
    seatToken: input.principal?.seatToken ? nonEmpty(input.principal.seatToken, "bootstrap.principal.seatToken") : "",
    surface,
    locale: String(input.locale || "en").slice(0, 32),
  };
  assertBoundedJson(input);
  return normalized;
}

function validateIntent(input) {
  assertNoAuthorityFields(input);
  if (!object(input) || !INTENT_KEYS[input.type]) {
    throw Object.assign(new Error(`unsupported client intent: ${input?.type || ""}`), { code: "CLIENT_INTENT_UNSUPPORTED" });
  }
  assertExactKeys(input, INTENT_KEYS[input.type], "intent");
  const intent = { type: input.type };
  if (input.type === "preview_finite") intent.actionKey = nonEmpty(input.actionKey, "intent.actionKey");
  if (input.type === "preview_parameterized") {
    intent.domainId = nonEmpty(input.domainId, "intent.domainId");
    if (!object(input.parameters)) throw Object.assign(new Error("intent.parameters must be an object"), { code: "CLIENT_INPUT_INVALID" });
    intent.parameters = clone(input.parameters);
  }
  if (input.type === "confirm_and_apply_preview") intent.previewId = nonEmpty(input.previewId, "intent.previewId");
  assertBoundedJson(intent);
  return intent;
}

function operationalLifecycle(snapshot) {
  return snapshot.online === true && snapshot.visibility === "active";
}

function safeErrorDetails(error) {
  return error?.details && object(error.details) ? clone(error.details) : {};
}

function receiptReference(receipt) {
  if (!object(receipt)) return null;
  return {
    schemaVersion: "starcraft_tmg_client_receipt_reference_v1",
    journalHash: String(receipt.journalHash || ""),
    preStateRevision: Number(receipt.preStateRevision),
    postStateRevision: Number(receipt.postStateRevision),
    postStateHash: String(receipt.postStateHash || ""),
    matchBindingHash: String(receipt.matchBindingHash || ""),
    refereeSignature: clone(receipt.refereeSignature || null),
    trainingTruth: false,
  };
}

function replayReference(replayResult) {
  return {
    schemaVersion: "starcraft_tmg_client_replay_reference_v1",
    matchesCurrent: replayResult.matchesCurrent === true,
    receiptCount: Number(replayResult.receiptCount || 0),
    checkpointUsedForVerification: replayResult.checkpointUsedForVerification === true,
    replayedTailReceiptCount: Number(replayResult.replayedTailReceiptCount || 0),
    stateRevision: Number(replayResult.replay?.envelope?.stateRevision || 0),
    stateHash: String(replayResult.replay?.envelope?.stateHash || ""),
    journalHeadHash: String(replayResult.replay?.envelope?.journalHeadHash || ""),
    trainingTruth: false,
  };
}

function randomOperationalId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else {
    fallbackOperationalIdCounter += 1;
    const seed = `${Date.now()}-${fallbackOperationalIdCounter}-${prefix}`;
    const hash = hashStarcraftTmgClientContract(seed);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hash.slice(index * 2, index * 2 + 2), 16);
  }
  return `${prefix}-${[...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function createStarcraftTmgClientDomain(options = {}) {
  const transport = assertStarcraftTmgAuthoritativeTransportPort(options.transport);
  const projectionStore = assertStarcraftTmgProjectionStorePort(options.projectionStore);
  const lifecycle = assertStarcraftTmgLifecyclePort(options.lifecycle);
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const createId = typeof options.createId === "function" ? options.createId : randomOperationalId;
  const listeners = new Set();
  let binding = null;
  let lifecycleUnsubscribe = null;
  let operationQueue = Promise.resolve();
  let internal = {
    clientRevision: 0,
    phase: "unbound",
    locator: null,
    principalScopeHash: null,
    surface: null,
    locale: null,
    lifecycle: clone(lifecycle.read()),
    roomProjection: null,
    legalSpace: null,
    pendingPreview: null,
    lastReceipt: null,
    replay: null,
    rejection: null,
    recovery: {
      cacheStatus: "not_checked",
      source: "none",
      authoritativeOutcomeUncertain: false,
      lastSynchronizedAt: null,
    },
    trainingTruth: false,
  };
  let currentView = null;

  function buildView() {
    const core = {
      schemaVersion: `${STARCRAFT_TMG_CLIENT_DOMAIN_VERSION}.view`,
      clientRevision: internal.clientRevision,
      phase: internal.phase,
      locator: clone(internal.locator),
      surface: internal.surface,
      locale: internal.locale,
      lifecycle: clone(internal.lifecycle),
      roomProjection: clone(internal.roomProjection),
      legalSpace: clone(internal.legalSpace),
      pendingPreview: clone(internal.pendingPreview),
      lastReceipt: clone(internal.lastReceipt),
      replay: clone(internal.replay),
      rejection: clone(internal.rejection),
      recovery: clone(internal.recovery),
      capabilities: {
        authoritativeMutation: false,
        rulesEvaluation: false,
        sourceAuthority: false,
        providerExecution: false,
        skillGeneration: false,
        trainingTruth: false,
      },
      trainingTruth: false,
    };
    return deepFreeze({ ...core, viewHash: hashStarcraftTmgClientContract(core) });
  }

  function publish(patch = {}) {
    internal = { ...internal, ...clone(patch), clientRevision: internal.clientRevision + 1 };
    currentView = buildView();
    for (const listener of [...listeners]) {
      try {
        listener(currentView);
      } catch {
        // A view listener is presentation-only and cannot interrupt domain progress.
      }
    }
    return currentView;
  }

  function read() {
    if (!currentView) currentView = buildView();
    return currentView;
  }

  function rejection(code, details = {}, phase = internal.phase) {
    const record = {
      schemaVersion: `${STARCRAFT_TMG_CLIENT_DOMAIN_VERSION}.rejection`,
      code: String(code || "CLIENT_OPERATION_REJECTED"),
      details: clone(details),
      occurredAt: now(),
      trainingTruth: false,
    };
    const view = publish({ phase, rejection: record });
    return deepFreeze({ ok: false, rejection: record, view });
  }

  function success(outcome, details = {}) {
    return deepFreeze({ ok: true, outcome, ...clone(details), view: read() });
  }

  function cacheCore(projection) {
    return {
      schemaVersion: "starcraft_tmg_client_projection_cache_record_v1",
      cacheKey: binding.cacheKey,
      roomId: binding.roomId,
      principalScopeHash: binding.principalScopeHash,
      projection: clone(projection),
      savedAt: now(),
      authority: false,
      trainingTruth: false,
    };
  }

  async function saveProjection(projection) {
    const core = cacheCore(projection);
    const record = { ...core, integrityHash: hashStarcraftTmgClientContract(core) };
    try {
      await projectionStore.save(binding.cacheKey, record);
      return "verified_write";
    } catch {
      return "write_failed";
    }
  }

  function validateProjection(projection) {
    if (!object(projection) || !object(projection.room) || projection.room.roomId !== binding.roomId) {
      throw Object.assign(new Error("viewer projection is invalid or cross-room"), { code: "PROJECTION_INVALID" });
    }
    if (!Number.isInteger(Number(projection.room.stateRevision)) || !projection.room.stateHash) {
      throw Object.assign(new Error("viewer projection revision identity is missing"), { code: "PROJECTION_INVALID" });
    }
    return clone(projection);
  }

  async function loadCachedProjection() {
    let record;
    try {
      record = await projectionStore.load(binding.cacheKey);
    } catch (error) {
      return { ok: false, code: String(error?.message || "PROJECTION_CACHE_READ_FAILED") };
    }
    if (!record) return { ok: false, code: "PROJECTION_CACHE_MISS" };
    const { integrityHash, ...core } = record;
    if (record.schemaVersion !== "starcraft_tmg_client_projection_cache_record_v1"
      || record.cacheKey !== binding.cacheKey
      || record.roomId !== binding.roomId
      || record.principalScopeHash !== binding.principalScopeHash
      || integrityHash !== hashStarcraftTmgClientContract(core)) {
      return { ok: false, code: "PROJECTION_CACHE_INTEGRITY_FAILED" };
    }
    try {
      return { ok: true, projection: validateProjection(record.projection) };
    } catch (error) {
      return { ok: false, code: error.code || "PROJECTION_INVALID" };
    }
  }

  async function recoverFromCache(transportCode) {
    const cached = await loadCachedProjection();
    if (!cached.ok) {
      return rejection(cached.code, { transportCode, cacheAccepted: false }, "unavailable");
    }
    const view = publish({
      phase: "offline_read_only",
      roomProjection: cached.projection,
      legalSpace: null,
      pendingPreview: null,
      rejection: {
        schemaVersion: `${STARCRAFT_TMG_CLIENT_DOMAIN_VERSION}.rejection`,
        code: transportCode,
        details: { cacheAccepted: true, mutationAllowed: false },
        occurredAt: now(),
        trainingTruth: false,
      },
      recovery: {
        ...internal.recovery,
        cacheStatus: "integrity_verified",
        source: "viewer_scoped_projection_cache",
      },
    });
    return deepFreeze({ ok: true, outcome: "cached_projection_recovered", offline: true, view });
  }

  function request(operation, payload = {}) {
    return transport.execute({
      operation,
      roomId: binding.roomId,
      seatToken: binding.seatToken,
      payload,
    });
  }

  async function refreshProjection(reason = "explicit_refresh") {
    if (!binding) return rejection("CLIENT_NOT_BOOTSTRAPPED", {}, "unbound");
    const snapshot = lifecycle.read();
    if (!operationalLifecycle(snapshot)) {
      publish({ lifecycle: snapshot });
      return recoverFromCache(snapshot.online === false ? "NETWORK_UNAVAILABLE" : "CLIENT_BACKGROUND_READ_ONLY");
    }
    publish({ phase: internal.roomProjection ? "recovering" : "loading", lifecycle: snapshot, rejection: null });
    try {
      const result = await request("read_room", { includeJournal: false });
      if (!result?.ok) {
        if (AUTHENTICATION_CODES.has(result?.reason)) {
          await projectionStore.remove(binding.cacheKey).catch(() => {});
          return rejection(result.reason, { authorityRejected: true }, "blocked");
        }
        return rejection(result?.reason || "PROJECTION_REQUEST_REJECTED", {}, internal.roomProjection ? "ready" : "blocked");
      }
      const projection = validateProjection(result.projection);
      const cacheStatus = await saveProjection(projection);
      const view = publish({
        phase: "ready",
        roomProjection: projection,
        legalSpace: null,
        pendingPreview: null,
        rejection: null,
        recovery: {
          cacheStatus,
          source: "authoritative_transport",
          authoritativeOutcomeUncertain: false,
          lastSynchronizedAt: now(),
          reason,
        },
      });
      return deepFreeze({ ok: true, outcome: "projection_refreshed", view });
    } catch (error) {
      const code = error instanceof StarcraftTmgClientTransportError ? error.code : String(error?.code || "TRANSPORT_FAILED");
      if (RECOVERABLE_TRANSPORT_CODES.has(code)) return recoverFromCache(code);
      return rejection(code, safeErrorDetails(error), internal.roomProjection ? "ready" : "unavailable");
    }
  }

  function ensureOperational() {
    if (!binding) return "CLIENT_NOT_BOOTSTRAPPED";
    const snapshot = lifecycle.read();
    if (!operationalLifecycle(snapshot) || internal.phase === "offline_read_only") return "OFFLINE_READ_ONLY";
    if (!internal.roomProjection || internal.phase !== "ready") return "CLIENT_NOT_READY";
    return null;
  }

  function currentStateRevision() {
    return Number(internal.roomProjection?.room?.stateRevision);
  }

  async function loadLegalSpace() {
    const blocked = ensureOperational();
    if (blocked) return rejection(blocked, { mutationAllowed: false });
    try {
      const result = await request("read_legal_space");
      if (!result?.ok) return rejection(result?.reason || "LEGAL_SPACE_REQUEST_REJECTED");
      const legalSpace = result.legalSpace;
      if (!object(legalSpace)
        || !Array.isArray(legalSpace.finiteActions)
        || !Array.isArray(legalSpace.parameterDomains)
        || Number(legalSpace.stateRevision) !== currentStateRevision()
        || !/^[a-f0-9]{64}$/.test(String(legalSpace.legalSpaceHash || ""))) {
        await refreshProjection("legal_space_revision_mismatch");
        return rejection("LEGAL_SPACE_STALE", { refreshed: true });
      }
      const view = publish({ legalSpace: clone(legalSpace), pendingPreview: null, rejection: null });
      return deepFreeze({ ok: true, outcome: "legal_space_loaded", view });
    } catch (error) {
      return handleTransportFailure(error, "read_legal_space");
    }
  }

  function proposalFromIntent(intent) {
    if (!internal.legalSpace) throw Object.assign(new Error("current LegalSpace must be loaded"), { code: "LEGAL_SPACE_REQUIRED" });
    if (Number(internal.legalSpace.stateRevision) !== currentStateRevision()) {
      throw Object.assign(new Error("current LegalSpace revision is stale"), { code: "LEGAL_SPACE_STALE" });
    }
    if (intent.type === "preview_finite") {
      const enabled = internal.legalSpace.finiteActions.some((entry) => entry.actionKey === intent.actionKey);
      if (!enabled) throw Object.assign(new Error("finite action is not in current LegalSpace"), { code: "UNCHECKED_ACTION_REJECTED" });
      return { kind: "finite", actionKey: intent.actionKey };
    }
    const enabled = internal.legalSpace.parameterDomains.some((entry) => entry.domainId === intent.domainId);
    if (!enabled) throw Object.assign(new Error("parameter domain is not in current LegalSpace"), { code: "UNCHECKED_ACTION_REJECTED" });
    return { kind: "parameterized", domainId: intent.domainId, parameters: clone(intent.parameters) };
  }

  async function previewIntent(intent) {
    const blocked = ensureOperational();
    if (blocked) return rejection(blocked, { mutationAllowed: false });
    let proposal;
    try {
      proposal = proposalFromIntent(intent);
    } catch (error) {
      return rejection(error.code || "CLIENT_INPUT_INVALID");
    }
    try {
      const result = await request("preview_action", { proposal });
      if (!result?.ok) {
        if (["LEGAL_SPACE_STALE", "REVISION_CONFLICT"].includes(result?.reason)) await refreshProjection("preview_revision_rejected");
        return rejection(result?.reason || "PREVIEW_REJECTED");
      }
      const preview = result.preview;
      if (!object(preview)
        || !preview.previewId
        || !preview.previewToken
        || Number(preview.core?.expectedStateRevision) !== currentStateRevision()
        || preview.core?.legalSpaceHash !== internal.legalSpace.legalSpaceHash) {
        return rejection("PREVIEW_RESPONSE_INVALID");
      }
      const view = publish({ pendingPreview: clone(preview), rejection: null });
      return deepFreeze({ ok: true, outcome: "preview_ready_for_human_confirmation", confirmationRequired: true, view });
    } catch (error) {
      return handleTransportFailure(error, "preview_action");
    }
  }

  async function confirmAndApply(intent) {
    const blocked = ensureOperational();
    if (blocked) return rejection(blocked, { mutationAllowed: false });
    if (!internal.pendingPreview || internal.pendingPreview.previewId !== intent.previewId) {
      return rejection("PREVIEW_NOT_CURRENT", { previewId: intent.previewId });
    }
    const expectedStateRevision = currentStateRevision();
    const attempt = {
      previewId: intent.previewId,
      expectedStateRevision,
      sessionId: createId("sc-client-session"),
      idempotencyKey: createId("sc-client-apply"),
    };
    publish({ phase: "applying", rejection: null });
    try {
      const confirmed = await request("confirm_preview", { previewId: attempt.previewId });
      if (!confirmed?.ok) {
        publish({ phase: "ready" });
        return rejection(confirmed?.reason || "CONFIRMATION_REJECTED");
      }
      const control = await request("claim_control", { sessionId: attempt.sessionId });
      if (!control?.ok) {
        publish({ phase: "ready" });
        return rejection(control?.reason || "CONTROL_LEASE_REJECTED");
      }
      const applied = await request("apply_action", {
        previewId: attempt.previewId,
        confirmationId: confirmed.confirmation?.confirmationId,
        leaseId: control.controlLease?.leaseId,
        leaseFence: control.controlLease?.leaseFence,
        expectedStateRevision,
        idempotencyKey: attempt.idempotencyKey,
      });
      if (!applied?.ok) {
        if (["REVISION_CONFLICT", "LEGAL_SPACE_STALE", "CONTROL_LEASE_FENCED"].includes(applied?.reason)) {
          await refreshProjection("apply_revision_rejected");
        } else publish({ phase: "ready" });
        return rejection(applied?.reason || "APPLY_REJECTED");
      }
      const reference = receiptReference(applied.receipt);
      if (!reference?.journalHash
        || reference.preStateRevision !== expectedStateRevision
        || reference.postStateRevision !== expectedStateRevision + 1
        || reference.refereeSignature?.signatureAlgorithm !== "ed25519") {
        return rejection("RECEIPT_RESPONSE_INVALID", { authoritativeOutcomeUncertain: true }, "recovering");
      }
      internal.lastReceipt = reference;
      const refreshed = await refreshProjection("accepted_receipt");
      if (!refreshed.ok) return refreshed;
      const view = publish({ lastReceipt: reference, pendingPreview: null, rejection: null });
      return deepFreeze({ ok: true, outcome: "authoritative_receipt_applied", receipt: reference, view });
    } catch (error) {
      publish({
        phase: "recovering",
        recovery: { ...internal.recovery, authoritativeOutcomeUncertain: true, source: "operation_interrupted" },
      });
      return handleTransportFailure(error, "confirm_and_apply_preview", true);
    }
  }

  async function readReplay() {
    const blocked = ensureOperational();
    if (blocked) return rejection(blocked, { mutationAllowed: false });
    try {
      const result = await request("read_replay");
      if (!result?.ok || result.matchesCurrent !== true) return rejection(result?.reason || "REPLAY_MISMATCH");
      const replay = replayReference(result);
      const view = publish({ replay, rejection: null });
      return deepFreeze({ ok: true, outcome: "replay_verified", replay, view });
    } catch (error) {
      return handleTransportFailure(error, "read_replay");
    }
  }

  async function handleTransportFailure(error, operation, outcomeUncertain = false) {
    const code = error instanceof StarcraftTmgClientTransportError ? error.code : String(error?.code || "TRANSPORT_FAILED");
    if (RECOVERABLE_TRANSPORT_CODES.has(code)) {
      const cached = await recoverFromCache(code);
      if (outcomeUncertain) {
        publish({ recovery: { ...internal.recovery, authoritativeOutcomeUncertain: true, interruptedOperation: operation } });
      }
      return cached.ok ? deepFreeze({ ...cached, operation }) : cached;
    }
    return rejection(code, { operation, ...safeErrorDetails(error) });
  }

  async function performDispatch(intentInput) {
    let intent;
    try {
      intent = validateIntent(intentInput);
    } catch (error) {
      return rejection(error.code || "CLIENT_INPUT_INVALID", safeErrorDetails(error));
    }
    if (intent.type === "refresh") return refreshProjection("explicit_dispatch");
    if (intent.type === "load_legal_space") return loadLegalSpace();
    if (intent.type === "preview_finite" || intent.type === "preview_parameterized") return previewIntent(intent);
    if (intent.type === "confirm_and_apply_preview") return confirmAndApply(intent);
    return readReplay();
  }

  function enqueue(operation) {
    const run = operationQueue.then(operation, operation);
    operationQueue = run.catch(() => {});
    return run;
  }

  function dispatch(intent) {
    return enqueue(() => performDispatch(intent));
  }

  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("Client Domain listener must be a function");
    listeners.add(listener);
    listener(read());
    return () => listeners.delete(listener);
  }

  function bindLifecycle() {
    if (lifecycleUnsubscribe) lifecycleUnsubscribe();
    lifecycleUnsubscribe = lifecycle.subscribe((snapshot) => {
      const wasOperational = operationalLifecycle(internal.lifecycle);
      const isOperational = operationalLifecycle(snapshot);
      publish({
        lifecycle: snapshot,
        ...(isOperational ? {} : {
          phase: internal.roomProjection ? "offline_read_only" : "unavailable",
          legalSpace: null,
          pendingPreview: null,
        }),
      });
      if (!wasOperational && isOperational && binding) {
        void enqueue(() => refreshProjection("lifecycle_resumed"));
      }
    });
  }

  async function performBootstrap(input) {
    let normalized;
    try {
      normalized = validateBootstrap(input);
    } catch (error) {
      return rejection(error.code || "CLIENT_INPUT_INVALID", safeErrorDetails(error), internal.phase);
    }
    const principalScopeHash = hashStarcraftTmgClientContract({
      schemaVersion: "starcraft_tmg_client_principal_scope_v1",
      roomId: normalized.roomId,
      seatToken: normalized.seatToken || "public",
    });
    const cacheKey = hashStarcraftTmgClientContract({
      schemaVersion: "starcraft_tmg_client_projection_cache_key_v1",
      roomId: normalized.roomId,
      principalScopeHash,
    });
    binding = { ...normalized, principalScopeHash, cacheKey };
    internal = {
      clientRevision: internal.clientRevision,
      phase: "binding",
      locator: { roomId: normalized.roomId },
      principalScopeHash,
      surface: normalized.surface,
      locale: normalized.locale,
      lifecycle: clone(lifecycle.read()),
      roomProjection: null,
      legalSpace: null,
      pendingPreview: null,
      lastReceipt: null,
      replay: null,
      rejection: null,
      recovery: {
        cacheStatus: "not_checked",
        source: "none",
        authoritativeOutcomeUncertain: false,
        lastSynchronizedAt: null,
      },
      trainingTruth: false,
    };
    publish();
    bindLifecycle();
    return refreshProjection("bootstrap");
  }

  function bootstrap(input) {
    return enqueue(() => performBootstrap(input));
  }

  currentView = buildView();
  return Object.freeze({ bootstrap, read, dispatch, subscribe });
}
