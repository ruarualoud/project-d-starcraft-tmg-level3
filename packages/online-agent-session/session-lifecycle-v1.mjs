import { randomUUID } from "node:crypto";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { assertStarcraftTmgCharacterContract } from
  "../character-agent/contracts-v1.mjs";
import { getStarcraftTmgModeCapability } from
  "../character-agent/mode-capability-v1.mjs";

export const STARCRAFT_TMG_ONLINE_AGENT_SESSION_VERSION =
  "starcraft_tmg_online_agent_session_v1";
export const STARCRAFT_TMG_ONLINE_PRINCIPAL_BINDING_VERSION =
  "starcraft_tmg_online_principal_binding_v1";

const MODE_SET = new Set(["tutor", "opponent", "commentator", "companion"]);
const PRINCIPAL_TYPE_SET = new Set(["human", "model", "service"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SESSION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,160}$/u;
const CREATE_FIELDS = new Set(["roomId", "mode", "characterId"]);
const SCOPED_FIELDS = new Set([
  "sessionId",
  "roomId",
  "mode",
  "characterId",
  "expectedConnectionEpoch",
]);
const CONTEXT_FIELDS = new Set(["principalSessionRef"]);
const ROOM_BINDING_HASH_FIELDS = Object.freeze([
  "matchBindingHash",
  "sourceSnapshotHash",
  "dataSnapshotHash",
  "rulesArtifactHash",
  "executorArtifactHash",
  "geometryArtifactHash",
  "actionSchemaHash",
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
  if (normalized.length > maximum) throw new TypeError(`${field} exceeds ${maximum} characters`);
  return normalized;
}

function hash(value, field) {
  const normalized = requiredString(value, field, 64).toLowerCase();
  if (!HASH_PATTERN.test(normalized)) throw new TypeError(`${field} must be a sha256 hash`);
  return normalized;
}

function nonNegativeInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
  return normalized;
}

function positiveInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
  return normalized;
}

function isoInstant(value, field) {
  const normalized = new Date(value).toISOString();
  if (!Number.isFinite(Date.parse(normalized))) throw new TypeError(`${field} must be an ISO-8601 instant`);
  return normalized;
}

function rejection(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_ONLINE_AGENT_SESSION_VERSION}.rejection`,
    reason,
    ...clone(details),
    trainingTruth: false,
  });
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const forbiddenFields = Object.keys(value).filter((field) => !allowed.has(field)).sort();
  if (forbiddenFields.length) {
    throw Object.assign(new TypeError(`${label} contains forbidden fields`), {
      code: "forbidden_client_field",
      forbiddenFields,
    });
  }
}

function normalizeMode(value) {
  const normalized = requiredString(value, "mode", 32).toLowerCase();
  if (!MODE_SET.has(normalized)) throw new TypeError(`unsupported online Agent mode: ${normalized}`);
  return normalized;
}

function normalizeRoomBinding(value) {
  if (!object(value)) throw new TypeError("roomBinding must be an object");
  const roomBinding = {
    schemaVersion: requiredString(value.schemaVersion, "roomBinding.schemaVersion"),
    rulesVersion: requiredString(value.rulesVersion, "roomBinding.rulesVersion"),
    dataVersion: requiredString(value.dataVersion, "roomBinding.dataVersion"),
  };
  for (const field of ROOM_BINDING_HASH_FIELDS) {
    roomBinding[field] = hash(value[field], `roomBinding.${field}`);
  }
  return seal(roomBinding, "roomBindingHash");
}

function normalizeCharacterRef(characterPackage, selection) {
  const contract = assertStarcraftTmgCharacterContract(characterPackage, "character-package");
  if (contract.characterId !== selection.characterId) {
    throw new TypeError("CharacterPackage does not match the room character selection");
  }
  if (contract.integrity.hash !== selection.characterPackageHash) {
    throw new TypeError("CharacterPackage hash does not match the room character selection");
  }
  if (!contract.supportedModes.includes(selection.mode)) {
    throw new TypeError(`CharacterPackage does not support ${selection.mode}`);
  }
  return deepFreeze({
    id: contract.characterId,
    displayName: contract.displayName,
    version: contract.version,
    hash: contract.integrity.hash,
    selectionHash: selection.characterSelectionHash,
    rightsStatus: contract.rights?.status || "unknown",
    productRoleIsCanon: contract.productRoleIsCanon === true,
  });
}

export function createStarcraftTmgOnlinePrincipalBindingV1(input = {}) {
  const principalType = requiredString(input.principalType, "principalType", 32).toLowerCase();
  if (!PRINCIPAL_TYPE_SET.has(principalType)) {
    throw new TypeError(`unsupported principalType: ${principalType}`);
  }
  if (!Array.isArray(input.allowedAgentModes) || input.allowedAgentModes.length === 0) {
    throw new TypeError("allowedAgentModes must be a non-empty array");
  }
  const allowedAgentModes = [...new Set(input.allowedAgentModes.map(normalizeMode))].sort();
  const unsigned = {
    schemaVersion: STARCRAFT_TMG_ONLINE_PRINCIPAL_BINDING_VERSION,
    roomId: requiredString(input.roomId, "roomId"),
    principalScopeHash: hash(input.principalScopeHash, "principalScopeHash"),
    seatKey: requiredString(input.seatKey, "seatKey", 120),
    principalType,
    principalRoleMode: requiredString(input.principalRoleMode, "principalRoleMode", 32).toLowerCase(),
    bindingRevision: nonNegativeInteger(input.bindingRevision, "bindingRevision"),
    allowedAgentModes,
    characterId: requiredString(input.characterId, "characterId"),
    characterPackageHash: hash(input.characterPackageHash, "characterPackageHash"),
    characterSelectionHash: hash(input.characterSelectionHash, "characterSelectionHash"),
    roomBinding: normalizeRoomBinding(input.roomBinding),
    credentialFreeProjection: true,
    trainingTruth: false,
  };
  return seal(unsigned, "bindingHash");
}

function assertPrincipalBinding(value, requestedRoomId) {
  if (!object(value) || value.schemaVersion !== STARCRAFT_TMG_ONLINE_PRINCIPAL_BINDING_VERSION) {
    throw new TypeError("principal authority returned an unsupported binding");
  }
  const normalized = createStarcraftTmgOnlinePrincipalBindingV1(value);
  if (normalized.bindingHash !== value.bindingHash) {
    throw new TypeError("principal binding integrity mismatch");
  }
  if (normalized.roomId !== requestedRoomId) {
    throw new TypeError("principal authority room binding mismatch");
  }
  return normalized;
}

function capabilityProjection(mode) {
  const capability = getStarcraftTmgModeCapability(mode);
  return deepFreeze({
    capabilityProfileId: capability.capabilityProfileId,
    capabilityHash: capability.integrityHash,
    visibilityPolicy: capability.visibilityPolicy,
    confirmationPolicy: capability.confirmationPolicy,
    maySelectDecision: capability.maySelectDecision === true,
    mayPreview: capability.mayPreview === true,
    mayConfirm: false,
    mayApply: false,
  });
}

function bindingProjection(principal, mode, character) {
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_ONLINE_AGENT_SESSION_VERSION}.binding`,
    roomId: principal.roomId,
    principalScopeHash: principal.principalScopeHash,
    seatKey: principal.seatKey,
    principalType: principal.principalType,
    principalRoleMode: principal.principalRoleMode,
    principalBindingRevision: principal.bindingRevision,
    principalBindingHash: principal.bindingHash,
    mode,
    character,
    roomBinding: principal.roomBinding,
    trainingTruth: false,
  };
  return seal(unsigned, "sessionBindingHash");
}

function lifecycleReceipt(session, operation, preRevision, occurredAt) {
  return seal({
    schemaVersion: `${STARCRAFT_TMG_ONLINE_AGENT_SESSION_VERSION}.lifecycle-receipt`,
    sessionId: session.sessionId,
    operation,
    sessionBindingHash: session.binding.sessionBindingHash,
    preRevision,
    postRevision: session.sessionRevision,
    connectionEpoch: session.connectionEpoch,
    lifecycleState: session.lifecycleState,
    turnState: session.turnState,
    occurredAt,
    trainingTruth: false,
  }, "receiptHash");
}

function projectSession(session) {
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_ONLINE_AGENT_SESSION_VERSION}.viewer-session`,
    sessionId: session.sessionId,
    sessionRevision: session.sessionRevision,
    lifecycleState: session.lifecycleState,
    turnState: session.turnState,
    binding: session.binding,
    capability: session.capability,
    connection: {
      state: session.lifecycleState === "active" ? "connected" : "ended",
      epoch: session.connectionEpoch,
      connectedAt: session.connectedAt,
      lastReconnectedAt: session.lastReconnectedAt,
    },
    turnCount: 0,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    endedAt: session.endedAt,
    durability: "process_memory_hash_sealed_v1",
    providerState: "not_mounted_slice_145",
    credentialPolicy: "provider_gateway_only_no_credentials_accepted",
    reconnectMayResumeProviderRequest: false,
    eligibleForTraining: false,
    productionReady: false,
    trainingTruth: false,
  };
  return seal(unsigned, "projectionHash");
}

export function createStarcraftTmgOnlineAgentSessionLifecycleV1(options = {}) {
  const resolvePrincipal = options.principalAuthority?.resolve;
  if (typeof resolvePrincipal !== "function") {
    throw new TypeError("principalAuthority.resolve is required");
  }
  const resolveCharacter = options.characterCatalog?.resolve;
  if (typeof resolveCharacter !== "function") {
    throw new TypeError("characterCatalog.resolve is required");
  }
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const createId = typeof options.createId === "function"
    ? options.createId
    : () => `sc-agent-session-${randomUUID()}`;
  const sessions = new Map();

  function metadata() {
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_ONLINE_AGENT_SESSION_VERSION}.metadata`,
      operations: ["create_session", "read_session", "reconnect_session", "end_session"],
      modes: [...MODE_SET],
      sessionIdentity: "server_generated",
      principalAuthentication: "external_server_authority_port",
      storedPrincipalMaterial: "scope_hash_only",
      credentialInputs: [],
      providerMounted: false,
      providerState: "not_mounted_slice_145",
      concurrentSessions: "unbounded_by_contract_resource_policy_is_external",
      durability: "process_memory_hash_sealed_v1",
      reconnectMayResumeProviderRequest: false,
      productionReady: false,
      trainingTruth: false,
    });
  }

  function contextRef(context) {
    exactFields(context, CONTEXT_FIELDS, "serverContext");
    return requiredString(context.principalSessionRef, "serverContext.principalSessionRef", 512);
  }

  async function authority(roomId, context) {
    const principalSessionRef = contextRef(context);
    let result;
    try {
      result = await resolvePrincipal({ roomId, principalSessionRef });
    } catch (error) {
      const code = /^[A-Z][A-Z0-9_]{1,63}$/u.test(String(error?.code || ""))
        ? String(error.code).toLowerCase()
        : "principal_authority_failed";
      throw Object.assign(new Error("principal authority resolution failed"), { code });
    }
    if (!object(result) || result.ok !== true) {
      const reason = /^[a-z][a-z0-9_]{1,63}$/u.test(String(result?.reason || ""))
        ? String(result.reason)
        : "principal_authority_rejected";
      throw Object.assign(new Error("principal authority rejected the request"), { code: reason });
    }
    return assertPrincipalBinding(result.binding, roomId);
  }

  function serverSessionId() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const value = requiredString(createId("session"), "server session id", 160);
      if (!SESSION_ID_PATTERN.test(value)) throw new TypeError("server session id format is invalid");
      if (!sessions.has(value)) return value;
    }
    throw new Error("server session id allocation exhausted");
  }

  async function createSession(input = {}, context = {}) {
    try {
      exactFields(input, CREATE_FIELDS, "createSession input");
      const roomId = requiredString(input.roomId, "roomId");
      const mode = normalizeMode(input.mode);
      const characterId = requiredString(input.characterId, "characterId");
      const principal = await authority(roomId, context);
      if (!principal.allowedAgentModes.includes(mode)) {
        return rejection("agent_mode_not_authorized", { mode });
      }
      if (principal.characterId !== characterId) {
        return rejection("character_scope_mismatch", { characterId });
      }
      const resolved = await resolveCharacter({
        characterId,
        mode,
        characterPackageHash: principal.characterPackageHash,
        characterSelectionHash: principal.characterSelectionHash,
      });
      if (!object(resolved) || resolved.ok !== true) {
        return rejection("character_not_available", { characterId });
      }
      const character = normalizeCharacterRef(resolved.characterPackage, {
        characterId,
        characterPackageHash: principal.characterPackageHash,
        characterSelectionHash: principal.characterSelectionHash,
        mode,
      });
      const occurredAt = isoInstant(now(), "createdAt");
      const sessionId = serverSessionId();
      const session = {
        sessionId,
        sessionRevision: 0,
        lifecycleState: "active",
        turnState: "idle",
        binding: bindingProjection(principal, mode, character),
        capability: capabilityProjection(mode),
        connectionEpoch: 1,
        connectedAt: occurredAt,
        lastReconnectedAt: null,
        createdAt: occurredAt,
        updatedAt: occurredAt,
        endedAt: null,
        events: [],
      };
      const receipt = lifecycleReceipt(session, "create_session", null, occurredAt);
      session.events.push(receipt);
      sessions.set(sessionId, session);
      return deepFreeze({ ok: true, session: projectSession(session), receipt });
    } catch (error) {
      return rejection(error?.code || "invalid_session_request", {
        ...(Array.isArray(error?.forbiddenFields) ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  function scopedInput(input) {
    exactFields(input, SCOPED_FIELDS, "session operation input");
    const sessionId = requiredString(input.sessionId, "sessionId", 160);
    const roomId = requiredString(input.roomId, "roomId");
    if (input.expectedConnectionEpoch !== undefined) {
      positiveInteger(input.expectedConnectionEpoch, "expectedConnectionEpoch");
    }
    return { sessionId, roomId };
  }

  async function scopedSession(input, context, options = {}) {
    const { sessionId, roomId } = scopedInput(input);
    const session = sessions.get(sessionId);
    if (!session) return { rejection: rejection("session_not_found") };
    if (session.binding.roomId !== roomId) {
      return { rejection: rejection("session_scope_mismatch") };
    }
    let principal;
    try {
      principal = await authority(roomId, context);
    } catch (error) {
      return { rejection: rejection(error?.code || "principal_authority_failed") };
    }
    if (principal.principalScopeHash !== session.binding.principalScopeHash) {
      return { rejection: rejection("principal_scope_mismatch") };
    }
    if (principal.seatKey !== session.binding.seatKey) {
      return { rejection: rejection("seat_scope_mismatch") };
    }
    if (principal.bindingRevision !== session.binding.principalBindingRevision
      || principal.bindingHash !== session.binding.principalBindingHash) {
      const sameRules = principal.roomBinding.roomBindingHash
        === session.binding.roomBinding.roomBindingHash;
      const sameCharacter = principal.characterSelectionHash
          === session.binding.character.selectionHash
        && principal.characterPackageHash === session.binding.character.hash
        && principal.characterId === session.binding.character.id;
      return {
        rejection: rejection(!sameRules
          ? "stale_room_binding"
          : !sameCharacter
            ? "stale_character_binding"
            : "stale_principal_binding"),
      };
    }
    if (input.mode !== undefined && normalizeMode(input.mode) !== session.binding.mode) {
      return { rejection: rejection("role_scope_mismatch") };
    }
    if (input.characterId !== undefined
      && requiredString(input.characterId, "characterId") !== session.binding.character.id) {
      return { rejection: rejection("character_scope_mismatch") };
    }
    if (input.expectedConnectionEpoch !== undefined
      && Number(input.expectedConnectionEpoch) !== session.connectionEpoch) {
      return { rejection: rejection("stale_connection", {
        observedConnectionEpoch: session.connectionEpoch,
      }) };
    }
    if (options.requireActive && session.lifecycleState !== "active") {
      return { rejection: rejection("session_ended") };
    }
    return { session };
  }

  async function readSession(input = {}, context = {}) {
    try {
      const result = await scopedSession(input, context);
      if (result.rejection) return result.rejection;
      return deepFreeze({ ok: true, session: projectSession(result.session) });
    } catch (error) {
      return rejection(error?.code || "invalid_session_request", {
        ...(Array.isArray(error?.forbiddenFields) ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  async function reconnectSession(input = {}, context = {}) {
    try {
      const result = await scopedSession(input, context, { requireActive: true });
      if (result.rejection) return result.rejection;
      const session = result.session;
      const preRevision = session.sessionRevision;
      const occurredAt = isoInstant(now(), "reconnectedAt");
      session.sessionRevision += 1;
      session.connectionEpoch += 1;
      session.lastReconnectedAt = occurredAt;
      session.updatedAt = occurredAt;
      const receipt = lifecycleReceipt(session, "reconnect_session", preRevision, occurredAt);
      session.events.push(receipt);
      return deepFreeze({ ok: true, session: projectSession(session), receipt });
    } catch (error) {
      return rejection(error?.code || "invalid_session_request", {
        ...(Array.isArray(error?.forbiddenFields) ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  async function endSession(input = {}, context = {}) {
    try {
      const result = await scopedSession(input, context);
      if (result.rejection) return result.rejection;
      const session = result.session;
      if (session.lifecycleState === "ended") {
        return deepFreeze({
          ok: true,
          idempotentReplay: true,
          session: projectSession(session),
          receipt: session.events.at(-1),
        });
      }
      const preRevision = session.sessionRevision;
      const occurredAt = isoInstant(now(), "endedAt");
      session.sessionRevision += 1;
      session.connectionEpoch += 1;
      session.lifecycleState = "ended";
      session.endedAt = occurredAt;
      session.updatedAt = occurredAt;
      const receipt = lifecycleReceipt(session, "end_session", preRevision, occurredAt);
      session.events.push(receipt);
      return deepFreeze({
        ok: true,
        idempotentReplay: false,
        session: projectSession(session),
        receipt,
      });
    } catch (error) {
      return rejection(error?.code || "invalid_session_request", {
        ...(Array.isArray(error?.forbiddenFields) ? { forbiddenFields: error.forbiddenFields } : {}),
      });
    }
  }

  return Object.freeze({
    metadata,
    createSession,
    readSession,
    reconnectSession,
    endSession,
  });
}
