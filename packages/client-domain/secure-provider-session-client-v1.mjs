import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";
import {
  assertStarcraftTmgSecureProviderClientTransportPort,
  StarcraftTmgSecureProviderClientTransportError,
} from "./secure-provider-transport-adapters-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "../online-agent-session/portable-credential-material-v1.mjs";

export const STARCRAFT_TMG_SECURE_PROVIDER_SESSION_CLIENT_VERSION =
  "starcraft_tmg_secure_provider_session_client_v1";
export const STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION =
  "starcraft_tmg_provider_data_disclosure_v1";

const REF_FIELDS = new Set(["id", "version", "hash"]);
const PROFILE_FIELDS = Object.freeze([
  "profileRef", "providerId", "model", "maxContextUnits",
  "maxOutputUnits", "timeoutMs", "trainingTruth",
]);
const INGRESS_FIELDS = Object.freeze([
  "nonce", "expiresAt", "mediaType", "minBytes", "maxBytes", "singleUse",
]);
const ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/u;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ATTACHMENT_STATES = new Set([
  "awaiting_ingress", "attaching", "attached", "detaching",
  "detach_failed", "attach_failed", "detached", "expired",
]);
const SAFE_REJECTION_CODES = new Set([
  "PROVIDER_AGENT_SESSION_REQUIRED",
  "PROVIDER_ATTACH_REJECTED",
  "PROVIDER_ATTACHMENT_READ_REJECTED",
  "PROVIDER_CLIENT_NETWORK_UNAVAILABLE",
  "PROVIDER_CLIENT_OPERATION_FAILED",
  "PROVIDER_CLIENT_REQUEST_INVALID",
  "PROVIDER_CLIENT_RESPONSE_INVALID",
  "PROVIDER_CLIENT_RESPONSE_TOO_LARGE",
  "PROVIDER_CLIENT_RESPONSE_UNSAFE",
  "PROVIDER_CLIENT_SECRET_BYTES_REQUIRED",
  "PROVIDER_CLIENT_SECRET_OUTSIDE_BINARY_INGRESS",
  "PROVIDER_CLIENT_SECRET_TOO_LARGE",
  "PROVIDER_CLIENT_TIMEOUT",
  "PROVIDER_DETACH_REJECTED",
  "PROVIDER_EXPLICIT_CONSENT_REQUIRED",
  "PROVIDER_PREPARE_REJECTED",
  "PROVIDER_PROFILE_CATALOGUE_UNAVAILABLE",
  "PROVIDER_PROFILE_NOT_LISTED",
  "PROVIDER_SECRET_INGRESS_NOT_READY",
  "authentication_failed",
  "authentication_required",
  "credential_worker_attach_failed",
  "credential_worker_detach_failed",
  "online_dsh_forbidden",
  "provider_attachment_already_active",
  "provider_attachment_binding_mismatch",
  "provider_attachment_capacity_exceeded",
  "provider_attachment_not_attached",
  "provider_attachment_not_found",
  "provider_attachment_profile_mismatch",
  "provider_attachment_scope_mismatch",
  "provider_budget_unavailable",
  "provider_control_closed",
  "provider_control_failed",
  "provider_disclosure_consent_required",
  "provider_disclosure_notice_mismatch",
  "provider_ingress_already_consumed",
  "provider_ingress_expired",
  "provider_ingress_rejected",
  "provider_model_not_configured",
  "provider_profile_invalid",
  "provider_profile_not_available",
  "provider_profile_ref_mismatch",
  "provider_profile_registry_failed",
  "provider_request_rejected",
  "provider_revoke_reason_invalid",
  "provider_secret_buffer_required",
  "provider_secret_bytes_invalid",
  "provider_session_binding_mismatch",
  "provider_worker_not_attached",
  "provider_worker_state_unavailable",
  "session_authentication_failed",
  "session_ended",
  "stale_connection",
  "unsafe_provider_response_projection",
]);
const INTENT_FIELDS = Object.freeze({
  load_profiles: Object.freeze(["type"]),
  prepare_attachment: Object.freeze(["type", "providerProfileRef", "consentAccepted"]),
  attach_secret: Object.freeze(["type", "credentialBytes"]),
  refresh_attachment: Object.freeze(["type"]),
  detach_attachment: Object.freeze(["type"]),
});

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

function exactFields(value, fields, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const expected = new Set(fields);
  if (Object.keys(value).length !== fields.length
    || Object.keys(value).some((field) => !expected.has(field))) {
    throw new TypeError(`${label} fields are invalid`);
  }
}

function ref(value) {
  exactFields(value, [...REF_FIELDS], "Provider profile ref");
  const normalized = {
    id: String(value.id || "").trim(),
    version: String(value.version || "").trim(),
    hash: String(value.hash || "").trim().toLowerCase(),
  };
  if (!normalized.id || !normalized.version
    || !/^[a-f0-9]{64}$/u.test(normalized.hash)) {
    throw new TypeError("Provider profile ref is invalid");
  }
  return freeze(normalized);
}

function requiredText(value, label, maximum = 240) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > maximum) {
    throw new TypeError(`${label} is invalid`);
  }
  return normalized;
}

function positiveInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw new TypeError(`${label} is invalid`);
  }
  return normalized;
}

function optionalText(value, label, maximum = 240) {
  return value === null || value === undefined || value === ""
    ? null : requiredText(value, label, maximum);
}

function profile(value) {
  exactFields(value, PROFILE_FIELDS, "Provider profile");
  const normalized = {
    profileRef: ref(value.profileRef),
    providerId: requiredText(value.providerId, "providerId", 120),
    model: requiredText(value.model, "model", 200),
    maxContextUnits: positiveInteger(value.maxContextUnits, "maxContextUnits"),
    maxOutputUnits: positiveInteger(value.maxOutputUnits, "maxOutputUnits"),
    timeoutMs: positiveInteger(value.timeoutMs, "timeoutMs"),
    trainingTruth: false,
  };
  if (value.trainingTruth !== false
    || containsStarcraftTmgOnlineCredentialMaterialV1(normalized)) {
    throw new TypeError("Provider profile projection is unsafe");
  }
  return freeze(normalized);
}

function sameRef(left, right) {
  return left?.id === right?.id
    && left?.version === right?.version
    && left?.hash === right?.hash;
}

function sessionKey(session) {
  return session
    ? `${session.roomId}:${session.sessionId}:${session.expectedConnectionEpoch}` : null;
}

function safeSession(session) {
  if (!object(session) || session.lifecycleState !== "active") return null;
  const normalized = {
    roomId: String(session.roomId || "").trim(),
    sessionId: String(session.sessionId || "").trim(),
    expectedConnectionEpoch: Number(session.connectionEpoch),
  };
  if (!normalized.roomId || !normalized.sessionId
    || !Number.isSafeInteger(normalized.expectedConnectionEpoch)
    || normalized.expectedConnectionEpoch < 1) return null;
  return normalized;
}

function publicAttachment(attachment) {
  if (!object(attachment)) return null;
  if (!object(attachment.provider) || !object(attachment.budget)
    || attachment.automaticRetryAllowed !== false
    || attachment.sensitiveMaterialPersisted !== false
    || attachment.trainingTruth !== false) {
    throw new TypeError("Provider attachment projection is invalid");
  }
  const provider = attachment.provider;
  const budget = attachment.budget;
  const state = requiredText(attachment.state, "attachment.state", 80);
  const policyHash = String(budget.policyHash || "").toLowerCase();
  if (!ATTACHMENT_STATES.has(state) || !HASH_PATTERN.test(policyHash)) {
    throw new TypeError("Provider attachment state or budget hash is invalid");
  }
  return freeze({
    state,
    provider: {
      profileRef: ref(provider.profileRef),
      providerId: requiredText(provider.providerId, "attachment.providerId", 120),
      requestedModel: requiredText(provider.requestedModel,
        "attachment.requestedModel", 200),
    },
    budgetEnvelope: {
      policyHash,
      maxTotalUnits: positiveInteger(budget.maxTotalUnits, "budget.maxTotalUnits"),
      maxTurns: positiveInteger(budget.maxTurns, "budget.maxTurns"),
      maxInputUnitsPerTurn: positiveInteger(budget.maxInputUnitsPerTurn,
        "budget.maxInputUnitsPerTurn"),
      maxOutputUnitsPerTurn: positiveInteger(budget.maxOutputUnitsPerTurn,
        "budget.maxOutputUnitsPerTurn"),
      currency: requiredText(budget.currency, "budget.currency", 80),
      accountingAuthority: "durable_server_store",
      projectionMeaning: "consent_time_maximum_envelope_not_live_spend",
    },
    consentedAt: optionalText(attachment.consentedAt, "attachment.consentedAt", 80),
    ingressExpiresAt: optionalText(attachment.ingressExpiresAt,
      "attachment.ingressExpiresAt", 80),
    attachmentExpiresAt: optionalText(attachment.attachmentExpiresAt,
      "attachment.attachmentExpiresAt", 80),
    attachedAt: optionalText(attachment.attachedAt, "attachment.attachedAt", 80),
    detachedAt: optionalText(attachment.detachedAt, "attachment.detachedAt", 80),
    detachReason: optionalText(attachment.detachReason,
      "attachment.detachReason", 120),
    automaticRetryAllowed: false,
    sensitiveMaterialPersisted: false,
    trainingTruth: false,
  });
}

function internalAttachment(value) {
  if (!object(value) || containsStarcraftTmgOnlineCredentialMaterialV1(value)) {
    throw new TypeError("Provider attachment projection is unsafe");
  }
  const attachmentId = String(value.attachmentId || "");
  if (!ID_PATTERN.test(attachmentId)) {
    throw new TypeError("Provider attachment id is invalid");
  }
  publicAttachment(value);
  return clone(value);
}

function internalIngress(value) {
  exactFields(value, INGRESS_FIELDS, "Provider credential ingress");
  const normalized = {
    nonce: String(value.nonce || ""),
    expiresAt: requiredText(value.expiresAt, "ingress.expiresAt", 80),
    mediaType: requiredText(value.mediaType, "ingress.mediaType", 80),
    minBytes: positiveInteger(value.minBytes, "ingress.minBytes"),
    maxBytes: positiveInteger(value.maxBytes, "ingress.maxBytes"),
    singleUse: value.singleUse === true,
  };
  if (!NONCE_PATTERN.test(normalized.nonce)
    || normalized.mediaType !== "application/octet-stream"
    || normalized.minBytes > normalized.maxBytes
    || !normalized.singleUse) {
    throw new TypeError("Provider credential ingress is invalid");
  }
  return normalized;
}

function errorCode(error) {
  const candidate = error instanceof StarcraftTmgSecureProviderClientTransportError
    ? error.code : error?.code;
  const normalized = String(candidate || "");
  return SAFE_REJECTION_CODES.has(normalized)
    ? normalized : "PROVIDER_CLIENT_OPERATION_FAILED";
}

export function createStarcraftTmgSecureProviderSessionClientV1(options = {}) {
  const transport = assertStarcraftTmgSecureProviderClientTransportPort(
    options.transport);
  if (typeof options.sessionSource?.read !== "function"
    || typeof options.sessionSource?.subscribe !== "function") {
    throw new TypeError("secure Provider client requires a private session source");
  }
  const listeners = new Set();
  let revision = 0;
  let profiles = [];
  let profilesLoaded = false;
  let attachment = null;
  let pendingIngress = null;
  let boundSessionKey = null;
  let operationState = null;
  let rejection = null;
  let queue = Promise.resolve();
  let currentProjection = null;

  function currentSession() {
    return safeSession(options.sessionSource.read());
  }

  function derivedStatus() {
    if (operationState) return operationState;
    if (!currentSession()) return "session_required";
    if (rejection) return "error";
    if (attachment?.state === "attached") return "attached";
    if (attachment?.state === "awaiting_ingress" && pendingIngress) {
      return "awaiting_secret";
    }
    if (["detach_failed", "attach_failed", "expired"].includes(attachment?.state)) {
      return "error";
    }
    return profilesLoaded ? "ready" : "idle";
  }

  function projection() {
    const session = currentSession();
    const core = {
      schemaVersion: `${STARCRAFT_TMG_SECURE_PROVIDER_SESSION_CLIENT_VERSION}.projection`,
      enabled: true,
      revision,
      status: derivedStatus(),
      sessionBound: Boolean(session),
      profiles: clone(profiles),
      attachment: publicAttachment(attachment),
      ingress: pendingIngress ? {
        expiresAt: pendingIngress.expiresAt,
        mediaType: pendingIngress.mediaType,
        minBytes: pendingIngress.minBytes,
        maxBytes: pendingIngress.maxBytes,
        singleUse: true,
      } : null,
      disclosure: {
        noticeVersion: STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
        providerReceivesPromptAndResponseContract: true,
        noAutomaticRetry: true,
        browserPersistence: false,
        applicationInputClearedBeforeNetworkAwait: true,
        mutableRequestBytesZeroed: true,
        serverPersistence: false,
        isolatedWorkerSessionMemory: true,
      },
      rejection: rejection ? { code: rejection } : null,
      capabilities: {
        prepare: Boolean(session && profiles.length),
        attach: Boolean(session && pendingIngress),
        detach: Boolean(session && attachment
          && !["detached", "expired", "attach_failed"].includes(attachment.state)),
      },
      publicProjectionContainsSensitiveInput: false,
      cachePersisted: false,
      automaticRetryAllowed: false,
      liveProviderCalled: false,
      trainingTruth: false,
    };
    return freeze({ ...core, projectionHash: hashStarcraftTmgClientContract(core) });
  }

  function publish() {
    revision += 1;
    currentProjection = projection();
    for (const listener of [...listeners]) {
      try { listener(currentProjection); } catch {
        // Presentation listeners cannot interrupt credential lifecycle state.
      }
    }
    return currentProjection;
  }

  function synchronizeSession() {
    const session = currentSession();
    const nextKey = sessionKey(session);
    if (nextKey === boundSessionKey) return false;
    boundSessionKey = nextKey;
    attachment = null;
    pendingIngress = null;
    operationState = null;
    rejection = null;
    publish();
    return true;
  }

  async function loadProfiles() {
    operationState = "loading_profiles";
    rejection = null;
    publish();
    const result = await transport.execute({ operation: "metadata" });
    if (result?.ok !== true || !Array.isArray(result.profiles)) {
      throw Object.assign(new Error("PROVIDER_PROFILE_CATALOGUE_UNAVAILABLE"), {
        code: result?.reason || "PROVIDER_PROFILE_CATALOGUE_UNAVAILABLE",
      });
    }
    profiles = result.profiles.map(profile);
    profilesLoaded = true;
    operationState = null;
    publish();
  }

  function requireSession() {
    const session = currentSession();
    if (!session) {
      throw Object.assign(new Error("PROVIDER_AGENT_SESSION_REQUIRED"), {
        code: "PROVIDER_AGENT_SESSION_REQUIRED",
      });
    }
    return session;
  }

  async function prepare(input) {
    const session = requireSession();
    const profileRef = ref(input.providerProfileRef);
    if (input.consentAccepted !== true
      || !profiles.some((entry) => sameRef(entry.profileRef, profileRef))) {
      throw Object.assign(new Error("PROVIDER_EXPLICIT_CONSENT_REQUIRED"), {
        code: input.consentAccepted === true
          ? "PROVIDER_PROFILE_NOT_LISTED" : "PROVIDER_EXPLICIT_CONSENT_REQUIRED",
      });
    }
    operationState = "preparing";
    rejection = null;
    publish();
    const result = await transport.execute({
      operation: "prepare",
      ...session,
      providerProfileRef: profileRef,
      disclosureNoticeVersion: STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
      consentAccepted: true,
    });
    if (result?.ok !== true || !object(result.attachment)
      || !object(result.ingress) || !String(result.ingress.nonce || "")) {
      if (object(result?.attachment)) attachment = internalAttachment(result.attachment);
      throw Object.assign(new Error("PROVIDER_PREPARE_REJECTED"), {
        code: result?.reason || "PROVIDER_PREPARE_REJECTED",
      });
    }
    attachment = internalAttachment(result.attachment);
    pendingIngress = internalIngress(result.ingress);
    operationState = null;
    publish();
  }

  async function attach(input) {
    const session = requireSession();
    if (!(input.credentialBytes instanceof Uint8Array) || !pendingIngress
      || !attachment?.attachmentId
      || input.credentialBytes.byteLength < pendingIngress.minBytes
      || input.credentialBytes.byteLength > pendingIngress.maxBytes) {
      throw Object.assign(new Error("PROVIDER_SECRET_INGRESS_NOT_READY"), {
        code: "PROVIDER_SECRET_INGRESS_NOT_READY",
      });
    }
    operationState = "attaching";
    rejection = null;
    publish();
    try {
      const result = await transport.execute({
        operation: "attach",
        ...session,
        attachmentId: attachment.attachmentId,
        ingressNonce: pendingIngress.nonce,
        credentialBytes: input.credentialBytes,
      });
      pendingIngress = null;
      if (result?.ok !== true || !object(result.attachment)) {
        if (object(result?.attachment)) attachment = internalAttachment(result.attachment);
        throw Object.assign(new Error("PROVIDER_ATTACH_REJECTED"), {
          code: result?.reason || "PROVIDER_ATTACH_REJECTED",
        });
      }
      attachment = internalAttachment(result.attachment);
      operationState = null;
      publish();
    } finally {
      input.credentialBytes.fill(0);
      pendingIngress = null;
    }
  }

  async function readAttachment() {
    const session = requireSession();
    if (!attachment?.attachmentId) return;
    operationState = "refreshing";
    publish();
    const result = await transport.execute({
      operation: "read", ...session, attachmentId: attachment.attachmentId,
    });
    if (result?.ok !== true || !object(result.attachment)) {
      if (object(result?.attachment)) attachment = internalAttachment(result.attachment);
      throw Object.assign(new Error("PROVIDER_ATTACHMENT_READ_REJECTED"), {
        code: result?.reason || "PROVIDER_ATTACHMENT_READ_REJECTED",
      });
    }
    attachment = internalAttachment(result.attachment);
    operationState = null;
    publish();
  }

  async function detach() {
    const session = requireSession();
    if (!attachment?.attachmentId) return;
    operationState = "detaching";
    publish();
    const result = await transport.execute({
      operation: "detach", ...session, attachmentId: attachment.attachmentId,
    });
    if (result?.ok !== true || !object(result.attachment)) {
      if (object(result?.attachment)) attachment = internalAttachment(result.attachment);
      throw Object.assign(new Error("PROVIDER_DETACH_REJECTED"), {
        code: result?.reason || "PROVIDER_DETACH_REJECTED",
      });
    }
    attachment = internalAttachment(result.attachment);
    pendingIngress = null;
    operationState = null;
    publish();
  }

  async function perform(input) {
    const fields = INTENT_FIELDS[input?.type];
    exactFields(input, fields || [], "secure Provider client intent");
    synchronizeSession();
    if (input.type === "load_profiles") await loadProfiles();
    else if (input.type === "prepare_attachment") await prepare(input);
    else if (input.type === "attach_secret") await attach(input);
    else if (input.type === "refresh_attachment") await readAttachment();
    else await detach();
    return freeze({ ok: true, view: projection(), trainingTruth: false });
  }

  function dispatch(input) {
    const operation = async () => {
      try {
        return await perform(input);
      } catch (error) {
        operationState = null;
        rejection = errorCode(error);
        publish();
        if (input?.credentialBytes instanceof Uint8Array) {
          input.credentialBytes.fill(0);
        }
        return freeze({
          ok: false,
          rejection: { code: rejection },
          view: projection(),
          trainingTruth: false,
        });
      }
    };
    const result = queue.then(operation, operation);
    queue = result.catch(() => {});
    return result;
  }

  function read() {
    synchronizeSession();
    return currentProjection;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("listener is required");
    listeners.add(listener);
    listener(currentProjection);
    return () => listeners.delete(listener);
  }

  options.sessionSource.subscribe(() => synchronizeSession());
  currentProjection = projection();
  return Object.freeze({ read, dispatch, subscribe });
}
