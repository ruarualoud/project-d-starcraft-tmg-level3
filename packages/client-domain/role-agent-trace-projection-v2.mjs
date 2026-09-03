import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";

export const STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION =
  "starcraft_tmg_agent_trace_projection_v2";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SAFE_CODE_PATTERN = /^[A-Za-z0-9._:/-]{1,256}$/u;
const MODES = new Set(["tutor", "opponent", "commentator", "companion"]);
const TRACE_KINDS = new Set([
  "session", "turn", "tools", "decision", "confirmation", "failure",
]);
const CATALOGUED_TOOLS = new Set([
  "read_board_state",
  "list_legal_actions",
  "read_rules_skills",
  "read_memory_snapshot",
  "read_character_worldbook",
  "read_public_events",
  "preview_action",
  "provider_gateway.complete",
]);
const SECRET_KEY_PATTERN =
  /api[_-]?key|authorization|bearer|credential|secret|cookie|seat[_-]?token|provider[_-]?receipt|session[_-]?id|user[_-]?message|raw[_-]?(?:prompt|output)/iu;
const SECRET_VALUE_PATTERN = /(?:\bBearer\s+|\bsk-[A-Za-z0-9_-]{8,}|api[_-]?key\s*[:=])/iu;
const TOP_LEVEL_KEYS = Object.freeze([
  "schemaVersion", "roomId", "status", "generatedAt", "identity", "traces",
  "privacy", "trainingTruth", "projectionHash",
]);
const IDENTITY_KEYS = Object.freeze([
  "sourceAgentProjectionHash", "hostViewHash", "sessionRef",
  "sessionBindingHash", "roomStateHash", "legalSpaceHash", "agentRevision",
  "connectionEpoch", "mode", "lifecycleState",
]);
const TRACE_KEYS = Object.freeze([
  "traceId", "kind", "gameId", "roomId", "roleMode", "mode", "state",
  "intent", "promptPack", "harnessVersion", "agentVersion",
  "providerStatus", "harnessToolsCalled", "ruleSkillRefHashes",
  "memoryRefHashes", "decision", "confirmationRequired", "failureCode",
  "occurredAt", "eligibleForTraining", "reviewStatus", "trainingTruth",
]);
const DECISION_KEYS = Object.freeze([
  "candidateId", "actionType", "decisionReceiptHash",
  "previewProjectionHash", "selectedReasonHash", "alternativeCount",
]);
const PRIVACY_KEYS = Object.freeze([
  "rawPromptExposed", "rawProviderOutputExposed", "providerReceiptExposed",
  "credentialExposed", "sessionIdExposed",
]);

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

function exactKeys(value, allowed, code) {
  if (!object(value)) throw new Error(code);
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  const missing = allowed.filter((key) => !Object.hasOwn(value, key));
  if (unknown.length || missing.length) {
    throw new Error(`${code}:${[...unknown, ...missing].sort().join(",")}`);
  }
}

function assertNoSecretFields(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecretFields(entry, `${path}[${index}]`));
    return;
  }
  if (!object(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      throw new Error(`AGENT_TRACE_SECRET_FIELD_REJECTED:${path}.${key}`);
    }
    assertNoSecretFields(entry, `${path}.${key}`);
  }
}

function safeCode(value, code, { nullable = false, maximum = 256 } = {}) {
  const normalized = String(value || "").trim();
  if (!normalized && nullable) return null;
  if (!normalized || normalized.length > maximum
    || !SAFE_CODE_PATTERN.test(normalized)
    || SECRET_VALUE_PATTERN.test(normalized)) {
    throw new Error(code);
  }
  return normalized;
}

function safeHash(value, code, nullable = true) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized && nullable) return null;
  if (!HASH_PATTERN.test(normalized)) throw new Error(code);
  return normalized;
}

function safeInteger(value, code, nullable = true) {
  if ((value === null || value === undefined || value === "") && nullable) return null;
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) throw new Error(code);
  return normalized;
}

function timestamp(value, code, nullable = true) {
  const normalized = String(value || "").trim();
  if (!normalized && nullable) return null;
  if (!normalized || normalized.length > 64
    || !Number.isFinite(Date.parse(normalized))) throw new Error(code);
  return normalized;
}

function exactFalse(value, code) {
  if (value !== false) throw new Error(code);
  return false;
}

function hashRefs(refs, code) {
  if (!Array.isArray(refs) || refs.length > 64) throw new Error(code);
  return refs.map((entry) => safeHash(
    object(entry) ? entry.hash : entry,
    code,
    false,
  ));
}

function promptPackId(trace) {
  const value = trace?.promptPack;
  if (object(value)) return safeCode(value.id, "AGENT_TRACE_PROMPT_PACK_INVALID");
  if (value) return safeCode(value, "AGENT_TRACE_PROMPT_PACK_INVALID");
  return "not_invoked";
}

function traceOccurredAt(role, kind) {
  if (kind === "failure") return role.rejection?.occurredAt || role.updatedAt;
  if (kind === "turn") {
    return role.currentTurn?.terminalAt || role.currentTurn?.startedAt || role.updatedAt;
  }
  if (["tools", "decision", "confirmation"].includes(kind)) {
    return role.trace?.occurredAt || role.updatedAt;
  }
  return role.updatedAt;
}

function sourceTraceRefHashes(role, field) {
  const refs = role.trace?.[field];
  if (!refs) return [];
  return hashRefs(refs, `AGENT_TRACE_${field.toUpperCase()}_INVALID`);
}

function normalizedTools(value) {
  if (!Array.isArray(value) || value.length > 64) {
    throw new Error("AGENT_TRACE_TOOLS_INVALID");
  }
  return value.map((entry) => {
    const tool = safeCode(entry, "AGENT_TRACE_TOOL_INVALID", { maximum: 128 });
    if (!CATALOGUED_TOOLS.has(tool)) throw new Error("AGENT_TRACE_TOOL_NOT_CATALOGUED");
    return tool;
  });
}

function decisionProjection(role) {
  if (!object(role.decision) && !object(role.pendingConfirmation)) return null;
  const decision = role.decision || {};
  const preview = role.pendingConfirmation || {};
  const selectedReason = String(decision.selectedReason || "");
  const candidateId = decision.candidateId || preview.candidateId;
  return {
    candidateId: safeCode(candidateId, "AGENT_TRACE_DECISION_CANDIDATE_INVALID"),
    actionType: safeCode(preview.actionType || "not_projected",
      "AGENT_TRACE_DECISION_ACTION_INVALID", { maximum: 128 }),
    decisionReceiptHash: safeHash(
      decision.decisionReceiptHash || role.trace?.decisionReceiptHash,
      "AGENT_TRACE_DECISION_RECEIPT_HASH_INVALID",
    ),
    previewProjectionHash: safeHash(
      preview.previewProjectionHash || role.trace?.previewProjectionHash,
      "AGENT_TRACE_PREVIEW_PROJECTION_HASH_INVALID",
    ),
    selectedReasonHash: selectedReason
      ? hashStarcraftTmgClientContract({ selectedReason })
      : null,
    alternativeCount: safeInteger(
      Array.isArray(decision.rejectedAlternatives)
        ? decision.rejectedAlternatives.length : 0,
      "AGENT_TRACE_DECISION_ALTERNATIVE_COUNT_INVALID",
      false,
    ),
  };
}

function traceKinds(role) {
  const kinds = ["session"];
  if (object(role.currentTurn)) kinds.push("turn");
  if (object(role.trace)) kinds.push("tools");
  if (object(role.decision)) kinds.push("decision");
  if (object(role.pendingConfirmation)) kinds.push("confirmation");
  if (object(role.rejection)) kinds.push("failure");
  return kinds;
}

function traceState(role, kind) {
  if (kind === "session") return role.status || "not_started";
  if (kind === "turn") return role.currentTurn?.state || "unknown";
  if (kind === "tools") return role.trace?.reviewStatus || "observed";
  if (kind === "decision") return "selected";
  if (kind === "confirmation") return "waiting_human";
  return "rejected";
}

function traceFor(role, roomId, identity, kind) {
  const trace = role.trace || {};
  const occurredAt = timestamp(traceOccurredAt(role, kind),
    "AGENT_TRACE_OCCURRED_AT_INVALID");
  const mode = safeCode(role.mode, "AGENT_TRACE_MODE_INVALID", { maximum: 128 });
  const decision = ["decision", "confirmation"].includes(kind)
    ? decisionProjection(role) : null;
  const tools = kind === "tools"
    ? normalizedTools(trace.toolCalls || []) : [];
  const core = {
    kind,
    sourceAgentProjectionHash: identity.sourceAgentProjectionHash,
    agentRevision: identity.agentRevision,
    state: traceState(role, kind),
    turnRef: object(role.currentTurn) && role.currentTurn.turnId
      ? hashStarcraftTmgClientContract({
        kind: "online_agent_turn",
        turnId: String(role.currentTurn.turnId),
      })
      : null,
    occurredAt,
  };
  return {
    traceId: hashStarcraftTmgClientContract(core),
    kind,
    gameId: "starcraft-tmg",
    roomId,
    roleMode: mode,
    mode,
    state: safeCode(traceState(role, kind), "AGENT_TRACE_STATE_INVALID"),
    intent: safeCode(role.currentTurn?.intent || trace.intent || "not_invoked",
      "AGENT_TRACE_INTENT_INVALID", { maximum: 128 }),
    promptPack: promptPackId(trace),
    harnessVersion: safeCode(trace.harnessVersion || "role_agent_session_v1",
      "AGENT_TRACE_HARNESS_VERSION_INVALID"),
    agentVersion: safeCode(trace.agentVersion || "server_owned_provider_profile",
      "AGENT_TRACE_AGENT_VERSION_INVALID"),
    providerStatus: safeCode(role.provider?.state || "not_invoked",
      "AGENT_TRACE_PROVIDER_STATUS_INVALID", { maximum: 128 }),
    harnessToolsCalled: tools,
    ruleSkillRefHashes: kind === "tools"
      ? sourceTraceRefHashes(role, "ruleSkillRefs") : [],
    memoryRefHashes: kind === "tools"
      ? sourceTraceRefHashes(role, "memoryRefs") : [],
    decision,
    confirmationRequired: kind === "confirmation",
    failureCode: kind === "failure"
      ? safeCode(role.rejection?.code, "AGENT_TRACE_FAILURE_CODE_INVALID")
      : null,
    occurredAt,
    eligibleForTraining: false,
    reviewStatus: kind === "failure" ? "rejected" : "observed",
    trainingTruth: false,
  };
}

function assertSourceRoleProjection(role) {
  if (!object(role) || role.trainingTruth !== false
    || !String(role.schemaVersion || "").endsWith(".projection")) {
    throw new Error("AGENT_TRACE_SOURCE_PROJECTION_INVALID");
  }
  const { projectionHash, ...core } = role;
  if (!HASH_PATTERN.test(String(projectionHash || ""))
    || hashStarcraftTmgClientContract(core) !== projectionHash) {
    throw new Error("AGENT_TRACE_SOURCE_PROJECTION_HASH_INVALID");
  }
  if (!MODES.has(role.mode)) throw new Error("AGENT_TRACE_SOURCE_MODE_INVALID");
  if (role.rawPromptExposed !== false || role.rawProviderOutputExposed !== false
    || role.providerReceiptExposed !== false) {
    throw new Error("AGENT_TRACE_SOURCE_PRIVACY_INVALID");
  }
  return role;
}

function identityProjection(clientView, role) {
  return {
    sourceAgentProjectionHash: safeHash(role.projectionHash,
      "AGENT_TRACE_SOURCE_HASH_INVALID", false),
    hostViewHash: safeHash(clientView.hostViewHash,
      "AGENT_TRACE_HOST_VIEW_HASH_INVALID", false),
    sessionRef: safeHash(role.sessionRef, "AGENT_TRACE_SESSION_REF_INVALID"),
    sessionBindingHash: safeHash(role.sessionBindingHash,
      "AGENT_TRACE_SESSION_BINDING_HASH_INVALID"),
    roomStateHash: safeHash(clientView.roomProjection?.room?.stateHash,
      "AGENT_TRACE_ROOM_STATE_HASH_INVALID"),
    legalSpaceHash: safeHash(clientView.legalSpace?.legalSpaceHash,
      "AGENT_TRACE_LEGAL_SPACE_HASH_INVALID"),
    agentRevision: safeInteger(role.agentRevision,
      "AGENT_TRACE_AGENT_REVISION_INVALID", false),
    connectionEpoch: safeInteger(role.connectionEpoch,
      "AGENT_TRACE_CONNECTION_EPOCH_INVALID"),
    mode: safeCode(role.mode, "AGENT_TRACE_IDENTITY_MODE_INVALID", { maximum: 128 }),
    lifecycleState: safeCode(role.lifecycleState,
      "AGENT_TRACE_LIFECYCLE_INVALID", { nullable: true, maximum: 128 }),
  };
}

function projectionCore(clientView, roomId, generatedAt) {
  const role = assertSourceRoleProjection(clientView.roleAgentSession);
  const sourceRoomId = String(clientView.locator?.roomId
    || clientView.roomProjection?.room?.roomId || "").trim();
  if (!roomId || sourceRoomId !== roomId) {
    throw new Error("AGENT_TRACE_SOURCE_ROOM_MISMATCH");
  }
  const identity = identityProjection(clientView, role);
  const traces = traceKinds(role).map((kind) => traceFor(
    role,
    roomId,
    identity,
    kind,
  ));
  return {
    schemaVersion: STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION,
    roomId,
    status: safeCode(role.status, "AGENT_TRACE_STATUS_INVALID"),
    generatedAt: timestamp(generatedAt || role.updatedAt,
      "AGENT_TRACE_GENERATED_AT_INVALID"),
    identity,
    traces,
    privacy: {
      rawPromptExposed: false,
      rawProviderOutputExposed: false,
      providerReceiptExposed: false,
      credentialExposed: false,
      sessionIdExposed: false,
    },
    trainingTruth: false,
  };
}

function normalizedDecision(value) {
  if (value === null) return null;
  exactKeys(value, DECISION_KEYS, "AGENT_TRACE_DECISION_INVALID");
  return {
    candidateId: safeCode(value.candidateId, "AGENT_TRACE_DECISION_CANDIDATE_INVALID"),
    actionType: safeCode(value.actionType, "AGENT_TRACE_DECISION_ACTION_INVALID", { maximum: 128 }),
    decisionReceiptHash: safeHash(value.decisionReceiptHash,
      "AGENT_TRACE_DECISION_RECEIPT_HASH_INVALID"),
    previewProjectionHash: safeHash(value.previewProjectionHash,
      "AGENT_TRACE_PREVIEW_PROJECTION_HASH_INVALID"),
    selectedReasonHash: safeHash(value.selectedReasonHash,
      "AGENT_TRACE_SELECTED_REASON_HASH_INVALID"),
    alternativeCount: safeInteger(value.alternativeCount,
      "AGENT_TRACE_DECISION_ALTERNATIVE_COUNT_INVALID", false),
  };
}

function normalizedTrace(value, roomId) {
  exactKeys(value, TRACE_KEYS, "AGENT_TRACE_ENTRY_INVALID");
  assertNoSecretFields(value);
  const kind = safeCode(value.kind, "AGENT_TRACE_KIND_INVALID");
  if (!TRACE_KINDS.has(kind)) throw new Error("AGENT_TRACE_KIND_INVALID");
  if (String(value.roomId || "") !== roomId) throw new Error("AGENT_TRACE_ROOM_MISMATCH");
  const mode = safeCode(value.mode, "AGENT_TRACE_MODE_INVALID", { maximum: 128 });
  if (!MODES.has(mode) || value.roleMode !== mode) throw new Error("AGENT_TRACE_MODE_INVALID");
  if (value.eligibleForTraining !== false || value.trainingTruth !== false) {
    throw new Error("AGENT_TRACE_TRAINING_AUTHORITY_REJECTED");
  }
  const failureCode = safeCode(value.failureCode,
    "AGENT_TRACE_FAILURE_CODE_INVALID", { nullable: true });
  if ((kind === "failure") !== Boolean(failureCode)) {
    throw new Error("AGENT_TRACE_FAILURE_STATE_INVALID");
  }
  return {
    traceId: safeHash(value.traceId, "AGENT_TRACE_ID_INVALID", false),
    kind,
    gameId: safeCode(value.gameId, "AGENT_TRACE_GAME_INVALID", { maximum: 128 }),
    roomId,
    roleMode: mode,
    mode,
    state: safeCode(value.state, "AGENT_TRACE_STATE_INVALID"),
    intent: safeCode(value.intent, "AGENT_TRACE_INTENT_INVALID", { maximum: 128 }),
    promptPack: safeCode(value.promptPack, "AGENT_TRACE_PROMPT_PACK_INVALID"),
    harnessVersion: safeCode(value.harnessVersion, "AGENT_TRACE_HARNESS_VERSION_INVALID"),
    agentVersion: safeCode(value.agentVersion, "AGENT_TRACE_AGENT_VERSION_INVALID"),
    providerStatus: safeCode(value.providerStatus, "AGENT_TRACE_PROVIDER_STATUS_INVALID", { maximum: 128 }),
    harnessToolsCalled: normalizedTools(value.harnessToolsCalled),
    ruleSkillRefHashes: hashRefs(value.ruleSkillRefHashes,
      "AGENT_TRACE_RULE_SKILL_HASH_INVALID"),
    memoryRefHashes: hashRefs(value.memoryRefHashes,
      "AGENT_TRACE_MEMORY_HASH_INVALID"),
    decision: normalizedDecision(value.decision),
    confirmationRequired: value.confirmationRequired === true,
    failureCode,
    occurredAt: timestamp(value.occurredAt, "AGENT_TRACE_OCCURRED_AT_INVALID"),
    eligibleForTraining: false,
    reviewStatus: safeCode(value.reviewStatus,
      "AGENT_TRACE_REVIEW_STATUS_INVALID", { maximum: 64 }),
    trainingTruth: false,
  };
}

function normalizedIdentity(value) {
  exactKeys(value, IDENTITY_KEYS, "AGENT_TRACE_IDENTITY_INVALID");
  const mode = safeCode(value.mode, "AGENT_TRACE_IDENTITY_MODE_INVALID", { maximum: 128 });
  if (!MODES.has(mode)) throw new Error("AGENT_TRACE_IDENTITY_MODE_INVALID");
  return {
    sourceAgentProjectionHash: safeHash(value.sourceAgentProjectionHash,
      "AGENT_TRACE_SOURCE_HASH_INVALID", false),
    hostViewHash: safeHash(value.hostViewHash,
      "AGENT_TRACE_HOST_VIEW_HASH_INVALID", false),
    sessionRef: safeHash(value.sessionRef, "AGENT_TRACE_SESSION_REF_INVALID"),
    sessionBindingHash: safeHash(value.sessionBindingHash,
      "AGENT_TRACE_SESSION_BINDING_HASH_INVALID"),
    roomStateHash: safeHash(value.roomStateHash,
      "AGENT_TRACE_ROOM_STATE_HASH_INVALID"),
    legalSpaceHash: safeHash(value.legalSpaceHash,
      "AGENT_TRACE_LEGAL_SPACE_HASH_INVALID"),
    agentRevision: safeInteger(value.agentRevision,
      "AGENT_TRACE_AGENT_REVISION_INVALID", false),
    connectionEpoch: safeInteger(value.connectionEpoch,
      "AGENT_TRACE_CONNECTION_EPOCH_INVALID"),
    mode,
    lifecycleState: safeCode(value.lifecycleState,
      "AGENT_TRACE_LIFECYCLE_INVALID", { nullable: true, maximum: 128 }),
  };
}

export function assertStarcraftTmgRoleAgentTraceProjectionV2(
  value,
  expectedRoomId,
) {
  exactKeys(value, TOP_LEVEL_KEYS, "AGENT_TRACE_PROJECTION_INVALID");
  // Privacy attestations deliberately name the forbidden categories. Scan
  // only the payload lanes which could carry data, then require every
  // attestation to be exactly false below.
  assertNoSecretFields({ identity: value.identity, traces: value.traces });
  const roomId = safeCode(value.roomId, "AGENT_TRACE_ROOM_INVALID", { maximum: 128 });
  if (roomId !== expectedRoomId
    || value.schemaVersion !== STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION
    || value.trainingTruth !== false
    || !Array.isArray(value.traces)
    || value.traces.length < 1
    || value.traces.length > TRACE_KINDS.size) {
    throw new Error("AGENT_TRACE_PROJECTION_INVALID");
  }
  exactKeys(value.privacy, PRIVACY_KEYS, "AGENT_TRACE_PRIVACY_INVALID");
  for (const field of PRIVACY_KEYS) exactFalse(value.privacy[field],
    "AGENT_TRACE_PRIVACY_INVALID");
  const core = {
    schemaVersion: STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION,
    roomId,
    status: safeCode(value.status, "AGENT_TRACE_STATUS_INVALID"),
    generatedAt: timestamp(value.generatedAt, "AGENT_TRACE_GENERATED_AT_INVALID"),
    identity: normalizedIdentity(value.identity),
    traces: value.traces.map((entry) => normalizedTrace(entry, roomId)),
    privacy: clone(value.privacy),
    trainingTruth: false,
  };
  if (new Set(core.traces.map((entry) => entry.traceId)).size
    !== core.traces.length) throw new Error("AGENT_TRACE_ID_DUPLICATE");
  const projectionHash = safeHash(value.projectionHash,
    "AGENT_TRACE_PROJECTION_HASH_INVALID", false);
  if (hashStarcraftTmgClientContract(core) !== projectionHash) {
    throw new Error("AGENT_TRACE_PROJECTION_HASH_INVALID");
  }
  return deepFreeze({ ...core, projectionHash });
}

export function projectStarcraftTmgRoleAgentTraceProjectionV2(input = {}) {
  if (!object(input.clientView)) throw new Error("AGENT_TRACE_CLIENT_VIEW_REQUIRED");
  const roomId = safeCode(input.roomId
    || input.clientView.locator?.roomId
    || input.clientView.roomProjection?.room?.roomId,
  "AGENT_TRACE_ROOM_INVALID", { maximum: 128 });
  const core = projectionCore(input.clientView, roomId, input.generatedAt);
  const projection = {
    ...core,
    projectionHash: hashStarcraftTmgClientContract(core),
  };
  return assertStarcraftTmgRoleAgentTraceProjectionV2(projection, roomId);
}

export function createStarcraftTmgRoleAgentTraceProjectionPortV2(options = {}) {
  const clientDomain = options.clientDomain;
  if (!clientDomain || typeof clientDomain.read !== "function") {
    throw new TypeError("Client Domain read is required");
  }
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  async function read(input = {}) {
    exactKeys(input, ["roomId"], "AGENT_TRACE_PORT_INPUT_INVALID");
    return projectStarcraftTmgRoleAgentTraceProjectionV2({
      clientView: clientDomain.read(),
      roomId: input.roomId,
      generatedAt: now(),
    });
  }
  return Object.freeze({ read });
}
