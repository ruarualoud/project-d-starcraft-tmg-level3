import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { assertStarcraftTmgCharacterContract } from
  "../character-agent/contracts-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "../online-agent-session/portable-credential-material-v1.mjs";

export const STARCRAFT_TMG_SECURE_PROVIDER_ATTACHMENT_CONTROL_VERSION =
  "starcraft_tmg_secure_provider_attachment_control_v1";
export const STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION =
  "starcraft_tmg_provider_data_disclosure_v1";
export const STARCRAFT_TMG_PROVIDER_CREDENTIAL_MEDIA_TYPE =
  "application/octet-stream";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/u;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const PROFILE_REF_FIELDS = new Set(["id", "version", "hash"]);
const PREPARE_FIELDS = new Set([
  "roomId",
  "sessionId",
  "expectedConnectionEpoch",
  "providerProfileRef",
  "disclosureNoticeVersion",
  "consentAccepted",
]);
const ATTACH_FIELDS = new Set([
  "roomId",
  "sessionId",
  "expectedConnectionEpoch",
  "attachmentId",
  "ingressNonce",
  "credentialBytes",
]);
const SCOPED_FIELDS = new Set([
  "roomId",
  "sessionId",
  "expectedConnectionEpoch",
  "attachmentId",
]);
const REVOKE_FIELDS = new Set(["sessionId", "reason"]);
const ATTACH_RESULT_FIELDS = new Set(["ok", "workerRef"]);
const DETACH_RESULT_FIELDS = new Set(["ok"]);
const ACTIVE_STATES = new Set([
  "awaiting_ingress",
  "attaching",
  "attached",
  "detaching",
  "detach_failed",
]);
const INTERNAL_DETACH_REASONS = new Set([
  "explicit_user_detach",
  "session_ended",
  "principal_revoked",
  "attachment_expired",
  "control_plane_closed",
  "superseded_by_new_consent",
  "detached_during_ingress",
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

function requiredString(value, field, maximum = 240) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  if (normalized.length > maximum) {
    throw new TypeError(`${field} exceeds ${maximum} characters`);
  }
  return normalized;
}

function safeId(value, field) {
  const normalized = requiredString(value, field, 200);
  if (!ID_PATTERN.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function hash(value, field) {
  const normalized = requiredString(value, field, 64).toLowerCase();
  if (!HASH_PATTERN.test(normalized)) {
    throw new TypeError(`${field} must be a sha256 hash`);
  }
  return normalized;
}

function positiveInteger(value, field, maximum = Number.MAX_SAFE_INTEGER) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1
    || normalized > maximum) {
    throw new TypeError(`${field} must be a positive bounded integer`);
  }
  return normalized;
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const forbiddenFields = Object.keys(value)
    .filter((field) => !allowed.has(field)).sort();
  if (forbiddenFields.length) {
    throw Object.assign(new TypeError(`${label} contains forbidden fields`), {
      code: "forbidden_provider_control_field",
      forbiddenFields,
    });
  }
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function rejection(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion:
      `${STARCRAFT_TMG_SECURE_PROVIDER_ATTACHMENT_CONTROL_VERSION}.rejection`,
    reason,
    ...clone(details),
    trainingTruth: false,
  });
}

function isoInstant(value, field) {
  let normalized;
  try {
    normalized = new Date(value).toISOString();
  } catch {
    throw new TypeError(`${field} must be an ISO-8601 instant`);
  }
  return normalized;
}

function normalizeRef(value, field = "providerProfileRef") {
  exactFields(value, PROFILE_REF_FIELDS, field);
  return deepFreeze({
    id: safeId(value.id, `${field}.id`),
    version: requiredString(value.version, `${field}.version`, 120),
    hash: hash(value.hash, `${field}.hash`),
  });
}

function scopedInput(input, allowed = SCOPED_FIELDS) {
  exactFields(input, allowed, "attachment operation input");
  return {
    roomId: requiredString(input.roomId, "roomId", 240),
    sessionId: safeId(input.sessionId, "sessionId"),
    expectedConnectionEpoch: positiveInteger(input.expectedConnectionEpoch,
      "expectedConnectionEpoch"),
    ...(input.attachmentId === undefined ? {} : {
      attachmentId: safeId(input.attachmentId, "attachmentId"),
    }),
  };
}

function nonceDigest(value) {
  return createHash("sha256").update(value, "utf8").digest();
}

function nonceMatches(value, expectedDigest) {
  const normalized = String(value || "");
  const observed = NONCE_PATTERN.test(normalized)
    ? nonceDigest(normalized)
    : Buffer.alloc(32);
  return timingSafeEqual(observed, expectedDigest);
}

function printableCredentialBytes(value, minimum, maximum) {
  if (!Buffer.isBuffer(value) || value.length < minimum || value.length > maximum) {
    return false;
  }
  for (const byte of value.values()) {
    if (byte < 0x21 || byte > 0x7e) return false;
  }
  return true;
}

function safeWorkerRef(value) {
  return safeId(value, "workerRef");
}

function budgetProjection(state) {
  const budget = state?.budget;
  const policy = budget?.policy;
  if (!object(budget) || !object(policy)) {
    throw new TypeError("Provider supervisor budget is unavailable");
  }
  const { policyHash, ...policyUnsigned } = policy;
  if (hashStarcraftTmgContract(policyUnsigned) !== hash(policyHash,
    "budget.policy.policyHash")) {
    throw new TypeError("Provider budget policy integrity mismatch");
  }
  if (policy.automaticRetryAllowed !== false) {
    throw new TypeError("Provider consent refuses automatic retry");
  }
  return deepFreeze({
    policyHash: policy.policyHash,
    maxTotalUnits: positiveInteger(policy.maxTotalUnits,
      "budget.policy.maxTotalUnits"),
    maxTurns: positiveInteger(policy.maxTurns, "budget.policy.maxTurns"),
    maxInputUnitsPerTurn: positiveInteger(policy.maxInputUnitsPerTurn,
      "budget.policy.maxInputUnitsPerTurn"),
    maxOutputUnitsPerTurn: positiveInteger(policy.maxOutputUnitsPerTurn,
      "budget.policy.maxOutputUnitsPerTurn"),
    remainingUnits: Number.isSafeInteger(budget.remainingUnits)
      && budget.remainingUnits >= 0 ? budget.remainingUnits : 0,
    currency: requiredString(policy.currency, "budget.policy.currency", 80),
    automaticRetryAllowed: false,
  });
}

function attachmentProjection(record) {
  return seal({
    schemaVersion:
      `${STARCRAFT_TMG_SECURE_PROVIDER_ATTACHMENT_CONTROL_VERSION}.attachment`,
    attachmentId: record.attachmentId,
    roomId: record.roomId,
    sessionId: record.sessionId,
    sessionBindingHash: record.sessionBindingHash,
    state: record.state,
    provider: {
      profileRef: record.providerProfileRef,
      providerId: record.providerId,
      requestedModel: record.requestedModel,
    },
    budget: record.budget,
    disclosureNoticeVersion: record.disclosureNoticeVersion,
    consentReceiptHash: record.consentReceipt.receiptHash,
    consentedAt: record.consentedAt,
    ingressExpiresAt: record.ingressExpiresAt,
    attachmentExpiresAt: record.attachmentExpiresAt,
    attachedAt: record.attachedAt,
    detachedAt: record.detachedAt,
    detachReason: record.detachReason,
    retryRequiresNewConsent: true,
    automaticRetryAllowed: false,
    sensitiveMaterialPersisted: false,
    productionReady: false,
    trainingTruth: false,
  }, "projectionHash");
}

function operationReceipt(record, operation, occurredAt) {
  return seal({
    schemaVersion:
      `${STARCRAFT_TMG_SECURE_PROVIDER_ATTACHMENT_CONTROL_VERSION}.operation-receipt`,
    operation,
    attachmentId: record.attachmentId,
    roomId: record.roomId,
    sessionId: record.sessionId,
    sessionBindingHash: record.sessionBindingHash,
    providerProfileHash: record.providerProfileRef.hash,
    budgetPolicyHash: record.budget.policyHash,
    state: record.state,
    detachReason: record.detachReason,
    occurredAt,
    sensitiveMaterialPersisted: false,
    trainingTruth: false,
  }, "receiptHash");
}

export function createStarcraftTmgSecureProviderAttachmentControlV1(options = {}) {
  const sessionLifecycle = options.sessionLifecycle;
  const providerSupervisor = options.providerSupervisor;
  const providerProfileRegistry = options.providerProfileRegistry;
  const attachmentPort = options.credentialAttachmentPort;
  if (typeof sessionLifecycle?.readSession !== "function") {
    throw new TypeError("sessionLifecycle.readSession is required");
  }
  if (typeof providerSupervisor?.readState !== "function") {
    throw new TypeError("providerSupervisor.readState is required");
  }
  if (typeof providerProfileRegistry?.resolve !== "function") {
    throw new TypeError("providerProfileRegistry.resolve is required");
  }
  if (typeof attachmentPort?.attachCredential !== "function"
    || typeof attachmentPort?.detachCredential !== "function") {
    throw new TypeError("credentialAttachmentPort attach/detach are required");
  }
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const createId = typeof options.createId === "function"
    ? options.createId : () => `sc-provider-attachment-${randomUUID()}`;
  const createNonce = typeof options.createNonce === "function"
    ? options.createNonce : () => randomBytes(32).toString("base64url");
  const nonceTtlMs = positiveInteger(options.nonceTtlMs || 120_000,
    "nonceTtlMs", 300_000);
  const attachmentTtlMs = positiveInteger(options.attachmentTtlMs || 8 * 60 * 60_000,
    "attachmentTtlMs", 24 * 60 * 60_000);
  const minCredentialBytes = positiveInteger(options.minCredentialBytes || 8,
    "minCredentialBytes", 1_024);
  const maxCredentialBytes = positiveInteger(options.maxCredentialBytes || 8_192,
    "maxCredentialBytes", 65_536);
  if (minCredentialBytes > maxCredentialBytes) {
    throw new TypeError("minCredentialBytes exceeds maxCredentialBytes");
  }
  const maxAttachmentRecords = positiveInteger(options.maxAttachmentRecords || 4_096,
    "maxAttachmentRecords", 100_000);
  const records = new Map();
  const activeBySession = new Map();
  let closed = false;

  function metadata() {
    return deepFreeze({
      schemaVersion:
        `${STARCRAFT_TMG_SECURE_PROVIDER_ATTACHMENT_CONTROL_VERSION}.metadata`,
      operations: [
        "prepare_attachment",
        "attach_secret_bytes",
        "read_attachment",
        "detach_attachment",
        "revoke_session",
        "sweep_expired",
        "close",
      ],
      disclosureNoticeVersion: STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION,
      ingressMediaType: STARCRAFT_TMG_PROVIDER_CREDENTIAL_MEDIA_TYPE,
      nonceTtlMs,
      attachmentTtlMs,
      minCredentialBytes,
      maxCredentialBytes,
      maxAttachmentRecords,
      sensitiveInputRepresentation: "owned_bounded_buffer_zeroed_after_worker_ack_or_failure",
      sensitiveInputPersistence: "none",
      sensitiveInputHashesPersisted: false,
      workerKind: "injected_port_until_slice_155_child_process",
      automaticRetryAllowed: false,
      productionReady: false,
      trainingTruth: false,
    });
  }

  function instant() {
    return isoInstant(now(), "current time");
  }

  function recordId() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = safeId(createId("attachment"), "server attachment id");
      if (!records.has(candidate)) return candidate;
    }
    throw new Error("server attachment id allocation exhausted");
  }

  async function resolveProfile(profileRef) {
    let result;
    try {
      result = await providerProfileRegistry.resolve({ profileRef });
    } catch {
      return { rejection: rejection("provider_profile_registry_failed") };
    }
    if (!object(result) || result.ok !== true) {
      return { rejection: rejection("provider_profile_not_available") };
    }
    let profile;
    try {
      profile = assertStarcraftTmgCharacterContract(result.providerProfile,
        "provider-profile");
    } catch {
      return { rejection: rejection("provider_profile_invalid") };
    }
    if (profile.providerProfileId !== profileRef.id
      || profile.version !== profileRef.version
      || profile.integrity.hash !== profileRef.hash) {
      return { rejection: rejection("provider_profile_ref_mismatch") };
    }
    if (profile.model === "administrator_must_select") {
      return { rejection: rejection("provider_model_not_configured") };
    }
    if (/(?:^|[-_])dsh(?:$|[-_])|deepseek.*harness|harness.*deepseek/iu
      .test(profile.provider)) {
      return { rejection: rejection("online_dsh_forbidden") };
    }
    return { profile };
  }

  async function authenticatedSession(scoped, context, requireActive = true) {
    const session = await sessionLifecycle.readSession({
      roomId: scoped.roomId,
      sessionId: scoped.sessionId,
      expectedConnectionEpoch: scoped.expectedConnectionEpoch,
    }, context);
    if (!session?.ok) return { rejection: session || rejection("session_authentication_failed") };
    if (requireActive && session.session.lifecycleState !== "active") {
      return { rejection: rejection("session_ended") };
    }
    return { session: session.session };
  }

  async function terminateWorker(record, reason) {
    if (!record.workerRef) return { ok: true };
    let result;
    try {
      result = await attachmentPort.detachCredential({
        workerRef: record.workerRef,
        reason,
      });
      exactFields(result, DETACH_RESULT_FIELDS, "credential detach result");
      if (result.ok !== true) throw new TypeError("credential detach was rejected");
    } catch {
      record.state = "detach_failed";
      record.detachReason = reason;
      record.updatedAt = instant();
      return { ok: false };
    }
    record.workerRef = null;
    return { ok: true };
  }

  async function detachRecord(record, reason, occurredAt = instant()) {
    if (!INTERNAL_DETACH_REASONS.has(reason)) {
      throw new TypeError("unsupported attachment detach reason");
    }
    if (["detached", "expired"].includes(record.state)) {
      return {
        ok: true,
        idempotentReplay: true,
        attachment: attachmentProjection(record),
        receipt: record.lastReceipt,
      };
    }
    if (["attaching", "detaching"].includes(record.state)) {
      record.detachRequested = true;
      record.detachReason = reason;
      record.state = "detaching";
      record.updatedAt = occurredAt;
      return {
        ok: true,
        idempotentReplay: false,
        detachPending: true,
        attachment: attachmentProjection(record),
        receipt: null,
      };
    }
    const terminated = await terminateWorker(record, reason);
    if (!terminated.ok) {
      return {
        ok: false,
        reason: "credential_worker_detach_failed",
        attachment: attachmentProjection(record),
      };
    }
    record.state = reason === "attachment_expired" ? "expired" : "detached";
    record.detachReason = reason;
    record.detachedAt = occurredAt;
    record.updatedAt = occurredAt;
    record.nonceDigest = null;
    activeBySession.delete(record.sessionId);
    record.lastReceipt = operationReceipt(record, "detach_attachment", occurredAt);
    return {
      ok: true,
      idempotentReplay: false,
      detachPending: false,
      attachment: attachmentProjection(record),
      receipt: record.lastReceipt,
    };
  }

  async function expireRecord(record, occurredAt = instant()) {
    const observedMs = Date.parse(occurredAt);
    if (record.state === "awaiting_ingress"
      && observedMs >= Date.parse(record.ingressExpiresAt)) {
      return detachRecord(record, "attachment_expired", occurredAt);
    }
    if (ACTIVE_STATES.has(record.state)
      && observedMs >= Date.parse(record.attachmentExpiresAt)) {
      return detachRecord(record, "attachment_expired", occurredAt);
    }
    return null;
  }

  async function prepareAttachment(input = {}, context = {}) {
    try {
      if (closed) return rejection("provider_control_closed");
      exactFields(input, PREPARE_FIELDS, "prepareAttachment input");
      const scoped = scopedInput(input, PREPARE_FIELDS);
      if (input.consentAccepted !== true) {
        return rejection("provider_disclosure_consent_required");
      }
      if (input.disclosureNoticeVersion
        !== STARCRAFT_TMG_PROVIDER_DISCLOSURE_NOTICE_VERSION) {
        return rejection("provider_disclosure_notice_mismatch");
      }
      const providerProfileRef = normalizeRef(input.providerProfileRef);
      const sessionResult = await authenticatedSession(scoped, context, true);
      if (sessionResult.rejection) return sessionResult.rejection;
      const [providerState, profileResult] = await Promise.all([
        providerSupervisor.readState(scoped, context),
        resolveProfile(providerProfileRef),
      ]);
      if (!providerState?.ok) return providerState || rejection("provider_budget_unavailable");
      if (profileResult.rejection) return profileResult.rejection;
      const session = sessionResult.session;
      if (providerState.state.sessionBindingHash
          !== session.binding.sessionBindingHash
        || providerState.state.connectionEpoch !== session.connection.epoch) {
        return rejection("provider_session_binding_mismatch");
      }
      const existingId = activeBySession.get(scoped.sessionId);
      let pendingToSupersede = null;
      if (existingId) {
        const existing = records.get(existingId);
        await expireRecord(existing);
        if (existing && ACTIVE_STATES.has(existing.state)) {
          if (existing.state === "awaiting_ingress") {
            pendingToSupersede = existing;
          } else {
            return rejection("provider_attachment_already_active", {
              attachment: attachmentProjection(existing),
            });
          }
        }
      }
      if (records.size >= maxAttachmentRecords) {
        return rejection("provider_attachment_capacity_exceeded");
      }
      if (pendingToSupersede) {
        await detachRecord(pendingToSupersede, "superseded_by_new_consent");
      }
      const occurredAt = instant();
      const occurredMs = Date.parse(occurredAt);
      const nonce = String(createNonce("ingress"));
      if (!NONCE_PATTERN.test(nonce)) {
        throw new TypeError("server ingress nonce is invalid");
      }
      const attachmentId = recordId();
      const budget = budgetProjection(providerState.state);
      const profile = profileResult.profile;
      const record = {
        attachmentId,
        roomId: scoped.roomId,
        sessionId: scoped.sessionId,
        sessionBindingHash: session.binding.sessionBindingHash,
        principalScopeHash: session.binding.principalScopeHash,
        connectionEpochAtConsent: session.connection.epoch,
        providerProfile: profile,
        providerProfileRef,
        providerId: profile.provider,
        requestedModel: profile.model,
        budget,
        disclosureNoticeVersion: input.disclosureNoticeVersion,
        state: "awaiting_ingress",
        nonceDigest: nonceDigest(nonce),
        consentedAt: occurredAt,
        ingressExpiresAt: new Date(occurredMs + nonceTtlMs).toISOString(),
        attachmentExpiresAt: new Date(occurredMs + attachmentTtlMs).toISOString(),
        attachedAt: null,
        detachedAt: null,
        detachReason: null,
        detachRequested: false,
        workerRef: null,
        updatedAt: occurredAt,
        lastReceipt: null,
      };
      record.consentReceipt = seal({
        schemaVersion:
          `${STARCRAFT_TMG_SECURE_PROVIDER_ATTACHMENT_CONTROL_VERSION}.consent-receipt`,
        attachmentId,
        roomId: scoped.roomId,
        sessionId: scoped.sessionId,
        sessionBindingHash: session.binding.sessionBindingHash,
        principalScopeHash: session.binding.principalScopeHash,
        providerProfileRef,
        providerId: profile.provider,
        requestedModel: profile.model,
        budgetPolicyHash: budget.policyHash,
        disclosureNoticeVersion: input.disclosureNoticeVersion,
        automaticRetryAllowed: false,
        consentedAt: occurredAt,
        ingressExpiresAt: record.ingressExpiresAt,
        attachmentExpiresAt: record.attachmentExpiresAt,
        sensitiveMaterialPersisted: false,
        trainingTruth: false,
      }, "receiptHash");
      records.set(attachmentId, record);
      activeBySession.set(scoped.sessionId, attachmentId);
      return deepFreeze({
        ok: true,
        attachment: attachmentProjection(record),
        consentReceipt: record.consentReceipt,
        ingress: {
          nonce,
          expiresAt: record.ingressExpiresAt,
          mediaType: STARCRAFT_TMG_PROVIDER_CREDENTIAL_MEDIA_TYPE,
          minBytes: minCredentialBytes,
          maxBytes: maxCredentialBytes,
          singleUse: true,
        },
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "invalid_provider_consent_request", {
        ...(Array.isArray(error?.forbiddenFields)
          ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  async function recordFor(input, context, requireActiveSession = true,
    allowedFields = SCOPED_FIELDS) {
    const scoped = scopedInput(input, allowedFields);
    const record = records.get(scoped.attachmentId);
    if (!record) return { rejection: rejection("provider_attachment_not_found") };
    if (record.roomId !== scoped.roomId || record.sessionId !== scoped.sessionId) {
      return { rejection: rejection("provider_attachment_scope_mismatch") };
    }
    const sessionResult = await authenticatedSession(scoped, context,
      requireActiveSession);
    if (sessionResult.rejection) return sessionResult;
    if (sessionResult.session.binding.sessionBindingHash !== record.sessionBindingHash
      || sessionResult.session.binding.principalScopeHash !== record.principalScopeHash) {
      return { rejection: rejection("provider_attachment_binding_mismatch") };
    }
    return { scoped, record, session: sessionResult.session };
  }

  async function attachCredentialBytes(input = {}, context = {}) {
    const secretBuffer = input?.credentialBytes;
    if (!Buffer.isBuffer(secretBuffer)) {
      return rejection("provider_secret_buffer_required");
    }
    try {
      if (closed) return rejection("provider_control_closed");
      exactFields(input, ATTACH_FIELDS, "attachCredentialBytes input");
      if (!printableCredentialBytes(secretBuffer,
        minCredentialBytes, maxCredentialBytes)) {
        return rejection("provider_secret_bytes_invalid", {
          minBytes: minCredentialBytes,
          maxBytes: maxCredentialBytes,
        });
      }
      const lookup = await recordFor(input, context, true, ATTACH_FIELDS);
      if (lookup.rejection) return lookup.rejection;
      const { record } = lookup;
      await expireRecord(record);
      if (record.state === "expired") {
        return rejection("provider_ingress_expired", {
          attachment: attachmentProjection(record),
        });
      }
      if (record.state !== "awaiting_ingress" || !record.nonceDigest) {
        return rejection("provider_ingress_already_consumed", {
          attachment: attachmentProjection(record),
        });
      }
      if (!nonceMatches(input.ingressNonce, record.nonceDigest)) {
        return rejection("provider_ingress_rejected");
      }
      record.nonceDigest = null;
      record.state = "attaching";
      record.updatedAt = instant();
      let attached;
      let cleanupWorkerRef = null;
      try {
        attached = await attachmentPort.attachCredential({
          attachmentId: record.attachmentId,
          providerProfile: record.providerProfile,
          credentialBytes: secretBuffer,
        });
        if (object(attached) && typeof attached.workerRef === "string") {
          cleanupWorkerRef = safeWorkerRef(attached.workerRef);
        }
        exactFields(attached, ATTACH_RESULT_FIELDS, "credential attach result");
        if (attached.ok !== true
          || containsStarcraftTmgOnlineCredentialMaterialV1(attached)) {
          throw new TypeError("credential attach result is unsafe");
        }
        record.workerRef = cleanupWorkerRef;
      } catch {
        if (cleanupWorkerRef) {
          record.workerRef = cleanupWorkerRef;
          const terminated = await terminateWorker(record,
            "unsafe_worker_acknowledgement");
          if (!terminated.ok) {
            activeBySession.delete(record.sessionId);
            return rejection("credential_worker_detach_failed", {
              attachment: attachmentProjection(record),
            });
          }
        }
        record.state = "attach_failed";
        record.updatedAt = instant();
        activeBySession.delete(record.sessionId);
        return rejection("credential_worker_attach_failed", {
          attachment: attachmentProjection(record),
        });
      }
      if (record.detachRequested) {
        record.state = "attached";
        const detached = await detachRecord(record,
          record.detachReason || "detached_during_ingress");
        return rejection(detached.ok
          ? "provider_attachment_detached_during_ingress"
          : "credential_worker_detach_failed", {
          attachment: attachmentProjection(record),
        });
      }
      const occurredAt = instant();
      record.state = "attached";
      record.attachedAt = occurredAt;
      record.updatedAt = occurredAt;
      record.lastReceipt = operationReceipt(record, "attach_secret_bytes", occurredAt);
      return deepFreeze({
        ok: true,
        attachment: attachmentProjection(record),
        receipt: record.lastReceipt,
        trainingTruth: false,
      });
    } finally {
      secretBuffer.fill(0);
    }
  }

  async function readAttachment(input = {}, context = {}) {
    try {
      if (closed) return rejection("provider_control_closed");
      const lookup = await recordFor(input, context, false);
      if (lookup.rejection) return lookup.rejection;
      await expireRecord(lookup.record);
      return deepFreeze({
        ok: true,
        attachment: attachmentProjection(lookup.record),
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "invalid_provider_attachment_read", {
        ...(Array.isArray(error?.forbiddenFields)
          ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  async function detachAttachment(input = {}, context = {}) {
    try {
      if (closed) return rejection("provider_control_closed");
      const lookup = await recordFor(input, context, false);
      if (lookup.rejection) return lookup.rejection;
      return deepFreeze(await detachRecord(lookup.record,
        "explicit_user_detach"));
    } catch (error) {
      return rejection(error?.code || "invalid_provider_attachment_detach", {
        ...(Array.isArray(error?.forbiddenFields)
          ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  async function revokeSession(input = {}) {
    try {
      exactFields(input, REVOKE_FIELDS, "revokeSession input");
      const sessionId = safeId(input.sessionId, "sessionId");
      const reason = requiredString(input.reason, "reason", 80);
      if (!["session_ended", "principal_revoked"].includes(reason)) {
        return rejection("provider_revoke_reason_invalid");
      }
      const attachmentId = activeBySession.get(sessionId);
      if (!attachmentId) {
        return deepFreeze({
          ok: true,
          revoked: false,
          idempotentReplay: true,
          trainingTruth: false,
        });
      }
      const result = await detachRecord(records.get(attachmentId), reason);
      return deepFreeze({
        ...result,
        revoked: result.ok,
        trainingTruth: false,
      });
    } catch (error) {
      return rejection(error?.code || "invalid_provider_session_revoke");
    }
  }

  async function sweepExpired() {
    const occurredAt = instant();
    let expired = 0;
    let failed = 0;
    for (const record of records.values()) {
      const result = await expireRecord(record, occurredAt);
      if (result?.ok) expired += 1;
      if (result?.ok === false) failed += 1;
    }
    return deepFreeze({
      ok: failed === 0,
      expired,
      failed,
      inspected: records.size,
      occurredAt,
      trainingTruth: false,
    });
  }

  async function close() {
    if (closed) {
      return deepFreeze({
        ok: true,
        idempotentReplay: true,
        sensitiveMaterialPersisted: false,
        trainingTruth: false,
      });
    }
    closed = true;
    let detached = 0;
    let failed = 0;
    for (const record of records.values()) {
      if (!ACTIVE_STATES.has(record.state)) continue;
      const result = await detachRecord(record, "control_plane_closed");
      if (result.ok) detached += 1;
      else failed += 1;
    }
    return deepFreeze({
      ok: failed === 0,
      idempotentReplay: false,
      detached,
      failed,
      sensitiveMaterialPersisted: false,
      trainingTruth: false,
    });
  }

  return Object.freeze({
    metadata,
    prepareAttachment,
    attachCredentialBytes,
    readAttachment,
    detachAttachment,
    revokeSession,
    sweepExpired,
    close,
  });
}
