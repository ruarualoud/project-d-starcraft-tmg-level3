import { projectStarcraftTmgBattlefieldPresentationV1 } from
  "./battlefield-presentation-v1.mjs";
import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";
import {
  assertStarcraftTmgRoleAgentTraceProjectionV2,
  STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION,
} from "./role-agent-trace-projection-v2.mjs";

export const STARCRAFT_TMG_BATTLE_LAB_OBSERVABILITY_VERSION =
  "starcraft_tmg_battle_lab_observability_v1";

const TRACE_PROJECTION_VERSION = "starcraft_tmg_agent_trace_projection_v1";
const TRACE_KEYS = Object.freeze([
  "traceId", "gameId", "roomId", "roleMode", "mode", "promptPack",
  "harnessVersion", "agentVersion", "providerStatus", "harnessToolsCalled",
  "ruleSkillRefHashes", "memoryRefHashes", "decision", "confirmationRequired",
  "occurredAt", "eligibleForTraining", "reviewStatus", "trainingTruth",
]);
const DECISION_KEYS = Object.freeze([
  "candidateId", "actionType", "legalSpaceHash", "previewId",
  "selectedReasonCodes", "alternativeCount",
]);
const SECRET_KEY_PATTERN =
  /api[_-]?key|authorization|bearer|credential|secret|cookie|seat[_-]?token|provider[_-]?receipt|session[_-]?id|user[_-]?message|raw[_-]?output/iu;
const SECRET_VALUE_PATTERN = /(?:\bBearer\s+|\bsk-[A-Za-z0-9_-]{8,}|api[_-]?key\s*[:=])/iu;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const AGENT_MODE_INTENTS = Object.freeze({
  tutor: Object.freeze(["chat", "explain"]),
  opponent: Object.freeze(["chat", "take_turn"]),
  commentator: Object.freeze(["commentate"]),
  companion: Object.freeze(["chat", "reflect"]),
});

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
  if (unknown.length) throw new Error(`${code}:${unknown.sort().join(",")}`);
}

function assertNoSecrets(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecrets(entry, `${path}[${index}]`));
    return;
  }
  if (!object(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      throw new Error(`BATTLE_LAB_TRACE_SECRET_FIELD_REJECTED:${path}.${key}`);
    }
    assertNoSecrets(entry, `${path}.${key}`);
  }
}

function safeText(value, maxLength = 256) {
  const text = String(value || "").trim();
  return text.length <= maxLength ? text : text.slice(0, maxLength);
}

function boundedText(value, maxLength, code) {
  const text = String(value || "").trim();
  if (text.length > maxLength || SECRET_VALUE_PATTERN.test(text)) throw new Error(code);
  return text;
}

function safeHash(value) {
  const hash = String(value || "").trim();
  return HASH_PATTERN.test(hash) ? hash : null;
}

function hashList(value, limit = 64) {
  if (!Array.isArray(value) || value.length > limit) {
    throw new Error("BATTLE_LAB_TRACE_HASH_LIST_INVALID");
  }
  return value.map((entry) => {
    const hash = safeHash(entry);
    if (!hash) throw new Error("BATTLE_LAB_TRACE_HASH_INVALID");
    return hash;
  });
}

function textList(value, limit = 64, maxLength = 128) {
  if (!Array.isArray(value) || value.length > limit) {
    throw new Error("BATTLE_LAB_TRACE_TEXT_LIST_INVALID");
  }
  return value.map((entry) => boundedText(
    entry,
    maxLength,
    "BATTLE_LAB_TRACE_TEXT_INVALID",
  )).filter(Boolean);
}

function normalizedDecision(value) {
  if (value === null || value === undefined) return null;
  exactKeys(value, DECISION_KEYS, "BATTLE_LAB_TRACE_DECISION_INVALID");
  const legalSpaceHash = safeHash(value.legalSpaceHash);
  if (!legalSpaceHash) throw new Error("BATTLE_LAB_TRACE_LEGAL_SPACE_HASH_INVALID");
  const alternativeCount = Number(value.alternativeCount || 0);
  if (!Number.isSafeInteger(alternativeCount) || alternativeCount < 0) {
    throw new Error("BATTLE_LAB_TRACE_ALTERNATIVE_COUNT_INVALID");
  }
  return {
    candidateId: boundedText(value.candidateId, 256, "BATTLE_LAB_TRACE_CANDIDATE_INVALID"),
    actionType: boundedText(value.actionType, 128, "BATTLE_LAB_TRACE_ACTION_TYPE_INVALID"),
    legalSpaceHash,
    previewId: boundedText(value.previewId, 256, "BATTLE_LAB_TRACE_PREVIEW_ID_INVALID") || null,
    selectedReasonCodes: textList(value.selectedReasonCodes || [], 32, 128),
    alternativeCount,
  };
}

function normalizedTrace(value, roomId) {
  exactKeys(value, TRACE_KEYS, "BATTLE_LAB_TRACE_INVALID");
  assertNoSecrets(value);
  if (boundedText(value.roomId, 128, "BATTLE_LAB_TRACE_ROOM_INVALID") !== roomId) {
    throw new Error("BATTLE_LAB_TRACE_ROOM_MISMATCH");
  }
  if (value.trainingTruth !== false || value.eligibleForTraining !== false) {
    throw new Error("BATTLE_LAB_TRACE_TRAINING_AUTHORITY_REJECTED");
  }
  const trace = {
    traceId: boundedText(value.traceId, 256, "BATTLE_LAB_TRACE_ID_INVALID"),
    gameId: boundedText(value.gameId, 128, "BATTLE_LAB_TRACE_GAME_INVALID"),
    roomId,
    roleMode: boundedText(value.roleMode, 128, "BATTLE_LAB_TRACE_ROLE_INVALID"),
    mode: boundedText(value.mode, 128, "BATTLE_LAB_TRACE_MODE_INVALID"),
    promptPack: boundedText(value.promptPack, 128, "BATTLE_LAB_TRACE_PROMPT_PACK_INVALID"),
    harnessVersion: boundedText(value.harnessVersion, 256, "BATTLE_LAB_TRACE_HARNESS_VERSION_INVALID"),
    agentVersion: boundedText(value.agentVersion, 256, "BATTLE_LAB_TRACE_AGENT_VERSION_INVALID"),
    providerStatus: boundedText(value.providerStatus, 128, "BATTLE_LAB_TRACE_PROVIDER_STATUS_INVALID"),
    harnessToolsCalled: textList(value.harnessToolsCalled || []),
    ruleSkillRefHashes: hashList(value.ruleSkillRefHashes || []),
    memoryRefHashes: hashList(value.memoryRefHashes || []),
    decision: normalizedDecision(value.decision),
    confirmationRequired: value.confirmationRequired === true,
    occurredAt: boundedText(value.occurredAt, 64, "BATTLE_LAB_TRACE_TIME_INVALID"),
    eligibleForTraining: false,
    reviewStatus: boundedText(value.reviewStatus, 64, "BATTLE_LAB_TRACE_REVIEW_STATUS_INVALID") || "raw",
    trainingTruth: false,
  };
  if (!trace.traceId || !trace.gameId || !trace.promptPack || !trace.harnessVersion) {
    throw new Error("BATTLE_LAB_TRACE_REQUIRED_FIELD_MISSING");
  }
  return trace;
}

function normalizedAgentProjection(value, roomId) {
  if (value === null || value === undefined) {
    const core = {
      schemaVersion: TRACE_PROJECTION_VERSION,
      roomId,
      status: "not_mounted_ticket_15",
      generatedAt: null,
      traces: [],
      trainingTruth: false,
    };
    return deepFreeze({ ...core, projectionHash: hashStarcraftTmgClientContract(core) });
  }
  if (value?.schemaVersion === STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION) {
    return assertStarcraftTmgRoleAgentTraceProjectionV2(value, roomId);
  }
  exactKeys(
    value,
    ["schemaVersion", "roomId", "status", "generatedAt", "traces", "trainingTruth"],
    "BATTLE_LAB_TRACE_PROJECTION_INVALID",
  );
  assertNoSecrets(value);
  if (value.schemaVersion !== TRACE_PROJECTION_VERSION
    || boundedText(value.roomId, 128, "BATTLE_LAB_TRACE_ROOM_INVALID") !== roomId
    || value.trainingTruth !== false
    || !Array.isArray(value.traces)
    || value.traces.length > 128) {
    throw new Error("BATTLE_LAB_TRACE_PROJECTION_INVALID");
  }
  const traces = value.traces.map((trace) => normalizedTrace(trace, roomId));
  if (new Set(traces.map((trace) => trace.traceId)).size !== traces.length) {
    throw new Error("BATTLE_LAB_TRACE_ID_DUPLICATE");
  }
  const core = {
    schemaVersion: TRACE_PROJECTION_VERSION,
    roomId,
    status: boundedText(
      value.status,
      256,
      "BATTLE_LAB_TRACE_STATUS_INVALID",
    ) || "available",
    generatedAt: boundedText(value.generatedAt, 64, "BATTLE_LAB_TRACE_GENERATED_TIME_INVALID") || null,
    traces,
    trainingTruth: false,
  };
  assertNoSecrets(core);
  return deepFreeze({ ...core, projectionHash: hashStarcraftTmgClientContract(core) });
}

function agentControlProjection(clientView) {
  const role = object(clientView.roleAgentSession)
    ? clientView.roleAgentSession : null;
  if (!role) return null;
  const preview = object(role.pendingConfirmation)
    ? role.pendingConfirmation : null;
  const turn = object(role.currentTurn) ? role.currentTurn : null;
  const rejection = object(role.rejection) ? role.rejection : null;
  const core = {
    schemaVersion: "starcraft_tmg_battle_lab_agent_controls_v1",
    status: safeText(role.status, 128) || "unavailable",
    mode: safeText(role.mode, 128) || "companion",
    lifecycleState: safeText(role.lifecycleState, 128) || null,
    connectionEpoch: Number.isSafeInteger(Number(role.connectionEpoch))
      ? Number(role.connectionEpoch) : null,
    providerState: safeText(role.provider?.state, 128) || "unknown",
    budget: object(role.budget) ? {
      remainingUnits: Number.isSafeInteger(Number(role.budget.remainingUnits))
        ? Number(role.budget.remainingUnits) : null,
      maxTotalUnits: Number.isSafeInteger(Number(role.budget.policy?.maxTotalUnits))
        ? Number(role.budget.policy.maxTotalUnits) : null,
      turnCount: Number.isSafeInteger(Number(role.budget.turnCount))
        ? Number(role.budget.turnCount) : null,
    } : null,
    currentTurn: turn ? {
      state: safeText(turn.state, 128) || "unknown",
      intent: safeText(turn.intent, 128) || null,
      failureCode: safeText(turn.failureCode, 256) || null,
    } : null,
    pendingConfirmation: preview ? {
      previewId: safeText(preview.previewId, 256),
      candidateId: safeText(preview.candidateId, 256),
      actionType: safeText(preview.actionType, 128),
      confirmationRequired: preview.confirmationRequired === true,
      modelMayConfirm: false,
      modelMayApply: false,
    } : null,
    rejectionCode: safeText(rejection?.code, 256) || null,
    readOnly: role.readOnly !== false,
    requiresExplicitReconnect: role.requiresExplicitReconnect === true,
    modes: Object.keys(AGENT_MODE_INTENTS),
    intentsByMode: clone(AGENT_MODE_INTENTS),
    sourceAgentProjectionHash: safeHash(role.projectionHash),
    rawConversationProjected: false,
    trainingTruth: false,
  };
  assertNoSecrets(core);
  return deepFreeze({ ...core, projectionHash: hashStarcraftTmgClientContract(core) });
}

export function projectStarcraftTmgSharedOperationalViewV1(clientView = {}) {
  const roomProjection = object(clientView.roomProjection)
    ? clone(clientView.roomProjection)
    : null;
  const roomId = safeText(roomProjection?.room?.roomId, 128) || null;
  const sharedServerCore = {
    schemaVersion: "starcraft_tmg_shared_operational_view_v1",
    roomId,
    roomProjection,
    legalSpace: object(clientView.legalSpace) ? clone(clientView.legalSpace) : null,
    trainingTruth: false,
  };
  const localInteraction = {
    pendingPreview: object(clientView.pendingPreview) ? clone(clientView.pendingPreview) : null,
    lastReceipt: object(clientView.lastReceipt) ? clone(clientView.lastReceipt) : null,
    replay: object(clientView.replay) ? clone(clientView.replay) : null,
    control: object(clientView.control) ? clone(clientView.control) : null,
    integrity: object(clientView.integrity) ? clone(clientView.integrity) : null,
    trainingTruth: false,
  };
  return deepFreeze({
    ...sharedServerCore,
    ...localInteraction,
    sharedViewHash: hashStarcraftTmgClientContract(sharedServerCore),
  });
}

function refereeProjection(shared) {
  const projection = shared.roomProjection || {};
  const room = projection.room || {};
  const binding = projection.matchBinding || {};
  const receipt = shared.lastReceipt || {};
  const core = {
    schemaVersion: "starcraft_tmg_battle_lab_referee_projection_v1",
    roomId: shared.roomId,
    roomRevision: Number.isSafeInteger(room.roomRevision) ? room.roomRevision : null,
    stateRevision: Number.isSafeInteger(room.stateRevision) ? room.stateRevision : null,
    stateHash: safeHash(room.stateHash),
    journalHeadHash: safeHash(room.journalHeadHash),
    matchBindingHash: safeHash(binding.bindingHash),
    refereeKeyId: safeText(binding.refereeKeyId) || null,
    refereePublicKeyFingerprint: safeHash(binding.refereePublicKeyFingerprint),
    rulesRuntimeBinding: object(binding.rulesRuntimeBinding)
      ? clone(binding.rulesRuntimeBinding)
      : null,
    lastReceipt: shared.lastReceipt ? {
      referenceHash: safeHash(receipt.journalHash),
      journalHash: safeHash(receipt.journalHash),
      stateRevision: Number.isSafeInteger(receipt.stateRevision)
        ? receipt.stateRevision
        : Number.isSafeInteger(receipt.postStateRevision) ? receipt.postStateRevision : null,
      signatureAlgorithm: safeText(receipt.refereeSignature?.signatureAlgorithm) || null,
    } : null,
    replayAvailable: shared.replay !== null,
    replayBlocked: shared.integrity?.replayBlocked === true,
    replayBlockReason: safeText(shared.integrity?.reason) || null,
    authoritativeMutation: false,
    rulesEvaluation: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...core, projectionHash: hashStarcraftTmgClientContract(core) });
}

export function projectStarcraftTmgBattleLabObservabilityV1(input = {}) {
  const clientView = object(input.clientView) ? input.clientView : {};
  const shared = projectStarcraftTmgSharedOperationalViewV1(clientView);
  const battlefield = projectStarcraftTmgBattlefieldPresentationV1({
    roomProjection: shared.roomProjection,
    legalSpace: shared.legalSpace,
    pendingPreview: shared.pendingPreview,
    selectedModelId: safeText(input.selectedModelId) || null,
  });
  const agent = normalizedAgentProjection(input.agentTraceProjection, shared.roomId);
  const agentControls = agentControlProjection(clientView);
  const referee = refereeProjection(shared);
  const observer = deepFreeze({
    schemaVersion: "starcraft_tmg_battle_lab_observer_projection_v1",
    roomId: shared.roomId,
    viewerRoleMode: safeText(shared.roomProjection?.viewer?.roleMode) || null,
    visibilityScope: safeText(shared.roomProjection?.viewer?.visibilityScope) || null,
    sharedViewHash: shared.sharedViewHash,
    battlefieldStateHash: battlefield.stateHash,
    trainingTruth: false,
  });
  const connection = deepFreeze({
    schemaVersion: "starcraft_tmg_battle_lab_connection_v1",
    phase: safeText(clientView.phase) || "unbound",
    online: clientView.lifecycle?.online !== false,
    visible: clientView.lifecycle?.visibility !== "background",
    rejectionCode: safeText(clientView.rejection?.code) || null,
    authoritativeOutcomeUncertain:
      clientView.recovery?.authoritativeOutcomeUncertain === true,
    canDispatchAuthoritativeIntent:
      clientView.phase === "ready"
      && clientView.lifecycle?.online !== false
      && clientView.lifecycle?.visibility === "active"
      && clientView.integrity?.replayBlocked !== true,
    trainingTruth: false,
  });
  const core = {
    schemaVersion: STARCRAFT_TMG_BATTLE_LAB_OBSERVABILITY_VERSION,
    surface: "battle_lab",
    connection,
    shared,
    workbench: object(clientView.battleWorkbench)
      ? clone(clientView.battleWorkbench) : null,
    observer,
    battlefield,
    referee,
    agent,
    agentControls,
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: [...new Set(agent.traces.map((trace) => trace.promptPack))],
      harnessToolsCalled: [...new Set(agent.traces.flatMap((trace) => trace.harnessToolsCalled))],
      uiTraceEvidence: "battle_lab_server_projected_trace_view",
      agentDecisionEvidence: agent.traces.filter((trace) => trace.decision).map((trace) => trace.traceId),
      agentFailureEvidence: agent.traces.filter((trace) => trace.failureCode).map((trace) => trace.traceId),
      agentIdentityEvidence: agent.identity || null,
      memoryTraceEvidence: "hash_references_only",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "room_or_shared_view_hash_mismatch_blocks_display",
        "trace_schema_room_or_secret_failure_quarantines_projection",
        "replay_integrity_failure_blocks_authoritative_intents",
      ],
      userVisibleChecks: [
        "room_board_referee_and_agent_panels_are_distinct",
        "preview_requires_a_separate_human_confirmation",
        agent.schemaVersion === STARCRAFT_TMG_ROLE_AGENT_TRACE_PROJECTION_VERSION
          ? "live_agent_trace_identity_and_privacy_are_visible"
          : "agent_trace_unavailable_state_is_explicit_until_ticket_15",
      ],
    },
    trainingTruth: false,
  };
  return deepFreeze({ ...core, viewHash: hashStarcraftTmgClientContract(core) });
}
