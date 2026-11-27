import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import {
  COMPANION_BACKEND_CONTRACT_VERSION,
  COMPANION_BACKEND_ERROR_CODES,
  COMPANION_SUPPORTED_SEATS,
  CompanionBackendError,
  assertCompanionPersistencePort,
  assertNoCredentials,
  assertNoHiddenChainOfThought,
} from "./contracts-v1.mjs";

// CB-3: multi-speaker session, branch/checkpoint/resume and permission runtime.
//
// Hard guarantees implemented here:
// - Multiple companions share one conversation with an explicit speaker order.
//   Turn ownership is singular: the expected owner is derived deterministically
//   from session state (mention queue first, then rotation cursor), every
//   submission must name the expected turn sequence and owner, and a consumed
//   turn can never be owned or submitted twice.
// - Mentions are explicit participant references. Mentioned participants are
//   queued ahead of the rotation in mention order; mentioning an unknown,
//   self, or read-only participant fails closed.
// - Accepted history is append-only and hash-chained. Swipe / regenerate /
//   edit branches hold alternative entries outside the accepted history;
//   accepting a branch entry appends a NEW turn and never overwrites or
//   mutates any accepted turn. There is no API that rewrites accepted turns.
// - Long-session resume: sessions live entirely in the injected persistence
//   port, so a fresh runtime resumes from the latest state or from a recorded
//   session-scoped snapshot. Restoring one conversation never rolls back any
//   other conversation sharing the adapter. Resume re-verifies the hash chain
//   and the recorded history/transcript hashes and fails closed on mismatch.
// - Player-seat / observer / review permission isolation: a human-seat
//   companion may read only player-visible state and same-seat public
//   plan/memory; observer defaults off (observer_public only); review mode is
//   separate and read-only. Opponent-private state is always denied, unknown
//   visibility is denied (fail closed, never treated as allowed), and even an
//   allowed resource fails closed if its payload carries opponent-private or
//   hidden-reasoning keys. The runtime never infers opponent-private state.
// - Accepted turns are mirrored into the CB-2 layered-memory transcript layer
//   through the injected memory engine, so checkpoint/restore keeps session
//   history and memory consistent.
// - No wall clock, no randomness, no Provider calls, no network: all ids and
//   hashes are deterministic functions of session state.

export const COMPANION_BACKEND_CB3_ERROR_CODES = Object.freeze({
  SESSION_INVALID: "SESSION_INVALID",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_ALREADY_EXISTS: "SESSION_ALREADY_EXISTS",
  SESSION_CLOSED: "SESSION_CLOSED",
  SESSION_INTEGRITY_MISMATCH: "SESSION_INTEGRITY_MISMATCH",
  PARTICIPANT_INVALID: "PARTICIPANT_INVALID",
  PARTICIPANT_NOT_FOUND: "PARTICIPANT_NOT_FOUND",
  PARTICIPANT_DUPLICATE: "PARTICIPANT_DUPLICATE",
  SPEAKER_ORDER_INVALID: "SPEAKER_ORDER_INVALID",
  TURN_INVALID: "TURN_INVALID",
  TURN_SEQUENCE_CONFLICT: "TURN_SEQUENCE_CONFLICT",
  TURN_OWNERSHIP_VIOLATION: "TURN_OWNERSHIP_VIOLATION",
  MENTION_INVALID: "MENTION_INVALID",
  MENTION_TARGET_UNKNOWN: "MENTION_TARGET_UNKNOWN",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  OPPONENT_PRIVATE_STATE_FORBIDDEN: "OPPONENT_PRIVATE_STATE_FORBIDDEN",
  BRANCH_INVALID: "BRANCH_INVALID",
  BRANCH_NOT_FOUND: "BRANCH_NOT_FOUND",
  BRANCH_CLOSED: "BRANCH_CLOSED",
  BRANCH_BASE_INVALID: "BRANCH_BASE_INVALID",
  BRANCH_ENTRY_NOT_FOUND: "BRANCH_ENTRY_NOT_FOUND",
  CHECKPOINT_NOT_FOUND: "CHECKPOINT_NOT_FOUND",
});

export const COMPANION_SESSION_PARTICIPANT_KINDS = Object.freeze(["user", "companion", "agent"]);

export const COMPANION_BRANCH_KINDS = Object.freeze(["swipe", "regenerate", "edit"]);

export const COMPANION_RESOURCE_VISIBILITIES = Object.freeze([
  "player_visible",
  "observer_public",
  "review_public",
  "same_seat_public_plan",
  "same_seat_public_memory",
  "opponent_private",
]);

// Seat read isolation policy. A human-seat companion (player_seat) may read
// only player-visible state plus same-seat public plan and memory; observer
// defaults to observer_public only (agent-vs-agent defaults to observer/off);
// review mode is separate and may read review-scoped and player-visible
// artifacts only. Opponent-private state is never in any policy.
export const COMPANION_SEAT_READ_POLICY = deepFreeze({
  player_seat: ["player_visible", "same_seat_public_plan", "same_seat_public_memory"],
  observer: ["observer_public"],
  review: ["review_public", "player_visible"],
});

const CB3 = COMPANION_BACKEND_CB3_ERROR_CODES;
const KIND_SET = new Set(COMPANION_SESSION_PARTICIPANT_KINDS);
const SEAT_SET = new Set(COMPANION_SUPPORTED_SEATS);
const BRANCH_KIND_SET = new Set(COMPANION_BRANCH_KINDS);
const VISIBILITY_SET = new Set(COMPANION_RESOURCE_VISIBILITIES);
const SESSION_EXPORT_SCHEMA = `${COMPANION_BACKEND_CONTRACT_VERSION}.session-export`;
const MAX_MENTIONS_PER_TURN = 8;
const MAX_CONTENT_CHARS = 20000;
const OPPONENT_PRIVATE_KEY_PATTERN = /opponent[_-]?(private|hidden|hand|deck|strategy|plan|state)|enemy[_-]?(hand|deck|hidden)|hidden[_-]?(state|hand|deck)|private[_-]?(state|hand|deck)/i;

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(code, message, details) {
  throw new CompanionBackendError(code, message, details);
}

function requiredString(value, field, code = CB3.SESSION_INVALID) {
  const normalized = String(value ?? "").trim();
  if (!normalized) fail(code, `${field} is required`);
  return normalized;
}

function safeInteger(value, field, minimum, maximum, code) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < minimum || normalized > maximum) {
    fail(code, `${field} must be a safe integer between ${minimum} and ${maximum}`);
  }
  return normalized;
}

function normalizeContent(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    fail(CB3.TURN_INVALID, `${field} must be a non-empty string`);
  }
  if (value.length > MAX_CONTENT_CHARS) {
    fail(CB3.TURN_INVALID, `${field} exceeds the ${MAX_CONTENT_CHARS} character limit`);
  }
  return value;
}

function scanKeys(value, pattern, code, path = "") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanKeys(entry, pattern, code, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (pattern.test(key)) {
      fail(code, `forbidden key "${key}" at ${path || "<root>"}`, { key, path: path || "<root>" });
    }
    scanKeys(child, pattern, code, path ? `${path}.${key}` : key);
  }
}

function defaultSeatForKind(kind) {
  if (kind === "user") return "player_seat";
  if (kind === "companion") return "player_seat";
  return "observer";
}

function normalizeParticipant(raw, index) {
  if (!object(raw)) fail(CB3.PARTICIPANT_INVALID, `participants[${index}] must be an object`);
  const participantId = requiredString(raw.participantId, `participants[${index}].participantId`, CB3.PARTICIPANT_INVALID);
  const kind = requiredString(raw.kind, `participants[${index}].kind`, CB3.PARTICIPANT_INVALID);
  if (!KIND_SET.has(kind)) fail(CB3.PARTICIPANT_INVALID, `unsupported participant kind: ${kind}`);
  const seat = raw.seat === undefined ? defaultSeatForKind(kind) : requiredString(raw.seat, `participants[${index}].seat`, CB3.PARTICIPANT_INVALID);
  if (!SEAT_SET.has(seat)) fail(CB3.PARTICIPANT_INVALID, `unsupported participant seat: ${seat}`);
  const permissions = object(raw.permissions) ? raw.permissions : {};
  // Review mode is always read-only; observer defaults off unless explicitly
  // granted speech; player_seat participants speak by default.
  const canSpeak = seat === "review"
    ? false
    : typeof permissions.canSpeak === "boolean"
      ? permissions.canSpeak
      : seat === "player_seat";
  return {
    participantId,
    kind,
    seat,
    label: String(raw.label || participantId),
    packageRef: raw.packageRef === undefined ? null : clone(raw.packageRef),
    canSpeak,
  };
}

export function createCompanionSessionRuntime(options = {}) {
  if (!object(options)) fail(CB3.SESSION_INVALID, "session runtime options must be an object");
  if (options.persistence === undefined || options.persistence === null) {
    fail(COMPANION_BACKEND_ERROR_CODES.DEPENDENCY_MISSING,
      "companion session runtime requires an injected persistence port",
      { missing: ["persistence"] });
  }
  if (options.memoryEngine === undefined || options.memoryEngine === null) {
    fail(COMPANION_BACKEND_ERROR_CODES.DEPENDENCY_MISSING,
      "companion session runtime requires the CB-2 memory engine for transcript mirroring",
      { missing: ["memoryEngine"] });
  }
  const persistence = assertCompanionPersistencePort(options.persistence);
  const memoryEngine = options.memoryEngine;
  if (typeof memoryEngine.appendTranscript !== "function"
    || typeof memoryEngine.readTranscript !== "function"
    || typeof memoryEngine.replaceTranscript !== "function") {
    fail(COMPANION_BACKEND_ERROR_CODES.DEPENDENCY_MISSING,
      "injected memory engine does not expose the CB-2 transcript contract",
      { missing: [
        "memoryEngine.appendTranscript",
        "memoryEngine.readTranscript",
        "memoryEngine.replaceTranscript",
      ] });
  }
  const prefix = String(options.namespacePrefix || "cb3").trim() || "cb3";
  const sessionNamespace = `${prefix}.session`;
  const indexNamespace = `${prefix}.session-index`;
  const checkpointNamespace = `${prefix}.session-checkpoint`;

  const stateKey = (sessionId) => `state::${sessionId}`;

  async function loadState(sessionId) {
    const id = requiredString(sessionId, "sessionId");
    const result = await persistence.get(sessionNamespace, stateKey(id));
    if (!result.found) {
      fail(CB3.SESSION_NOT_FOUND, `companion session not found: ${id}`, { sessionId: id });
    }
    return clone(result.value);
  }

  async function saveState(state) {
    await persistence.put(sessionNamespace, stateKey(state.sessionId), state);
    await persistence.put(indexNamespace, state.sessionId, {
      sessionId: state.sessionId,
      conversationId: state.conversationId,
      status: state.status,
      turnCounter: state.turnCounter,
    });
  }

  function ensureActive(state) {
    if (state.status !== "active") {
      fail(CB3.SESSION_CLOSED, `companion session is closed: ${state.sessionId}`, { sessionId: state.sessionId });
    }
  }

  function findParticipant(state, participantId) {
    return state.participants.find((participant) => participant.participantId === participantId) || null;
  }

  // Singular deterministic turn ownership: mention queue first, then the
  // rotation cursor over the explicit speaker order.
  function nextTurnOwner(state) {
    if (state.pendingQueue.length > 0) {
      return { turnSequence: state.turnCounter + 1, ownerParticipantId: state.pendingQueue[0], source: "mention_queue" };
    }
    return {
      turnSequence: state.turnCounter + 1,
      ownerParticipantId: state.speakerOrder[state.rotationCursor % state.speakerOrder.length],
      source: "rotation",
    };
  }

  function queueMentions(state, mentions) {
    for (const id of mentions) {
      if (state.pendingQueue.includes(id)) continue;
      // If the queue is empty and the mention target already owns the next
      // rotation turn, no queue entry is needed; it will speak exactly once.
      if (state.pendingQueue.length === 0
        && id === state.speakerOrder[state.rotationCursor % state.speakerOrder.length]) {
        continue;
      }
      state.pendingQueue.push(id);
    }
  }

  function normalizeMentions(value, state, speakerId) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) fail(CB3.MENTION_INVALID, "mentions must be an array of participant ids");
    if (value.length > MAX_MENTIONS_PER_TURN) {
      fail(CB3.MENTION_INVALID, `a turn may mention at most ${MAX_MENTIONS_PER_TURN} participants`);
    }
    const mentions = [];
    for (const [index, raw] of value.entries()) {
      const id = requiredString(raw, `mentions[${index}]`, CB3.MENTION_INVALID);
      if (id === speakerId) fail(CB3.MENTION_INVALID, "a speaker cannot mention itself");
      const target = findParticipant(state, id);
      if (!target) {
        fail(CB3.MENTION_TARGET_UNKNOWN, `mention target is not a session participant: ${id}`, { mentionTarget: id });
      }
      if (!target.canSpeak) {
        fail(CB3.MENTION_INVALID, `mention target cannot take a speaking turn: ${id}`, { mentionTarget: id });
      }
      if (!mentions.includes(id)) mentions.push(id);
    }
    return mentions;
  }

  function buildTurnRecord(state, { ownerParticipantId, content, mentions, receipts, source }) {
    const turnSequence = state.turnCounter + 1;
    const prevTurnHash = state.acceptedTurns.length > 0
      ? state.acceptedTurns[state.acceptedTurns.length - 1].turnHash
      : null;
    const unsigned = {
      turnSequence,
      turnId: `turn-${turnSequence}`,
      ownerParticipantId,
      kind: "message",
      source,
      content,
      mentions: [...mentions],
      receipts: clone(receipts) || [],
      prevTurnHash,
    };
    return { ...unsigned, turnHash: hashStarcraftTmgContract(unsigned) };
  }

  function computeTurnHash(turn) {
    const { turnHash: _turnHash, ...unsigned } = turn;
    return hashStarcraftTmgContract(unsigned);
  }

  function computeHistoryHash(state) {
    if (state.acceptedTurns.length === 0) {
      return hashStarcraftTmgContract({ sessionId: state.sessionId, history: "empty" });
    }
    return state.acceptedTurns[state.acceptedTurns.length - 1].turnHash;
  }

  // Append-only hash chain verification. Any overwrite, reorder or content
  // mutation of accepted history fails closed here.
  function verifyHistoryIntegrity(state) {
    let previous = null;
    for (const [index, turn] of (state.acceptedTurns || []).entries()) {
      if (!object(turn) || turn.turnSequence !== index + 1 || turn.turnId !== `turn-${index + 1}`) {
        fail(COMPANION_BACKEND_CB3_ERROR_CODES.SESSION_INTEGRITY_MISMATCH,
          `accepted history sequence is broken at position ${index + 1}`,
          { sessionId: state.sessionId, position: index + 1 });
      }
      if (turn.prevTurnHash !== previous) {
        fail(COMPANION_BACKEND_CB3_ERROR_CODES.SESSION_INTEGRITY_MISMATCH,
          `accepted history hash chain is broken at turn ${turn.turnId}`,
          { sessionId: state.sessionId, turnId: turn.turnId });
      }
      if (computeTurnHash(turn) !== turn.turnHash) {
        fail(COMPANION_BACKEND_CB3_ERROR_CODES.SESSION_INTEGRITY_MISMATCH,
          `accepted turn content hash mismatch at ${turn.turnId}; accepted history is immutable`,
          { sessionId: state.sessionId, turnId: turn.turnId });
      }
      previous = turn.turnHash;
    }
    if (state.turnCounter !== (state.acceptedTurns || []).length) {
      fail(COMPANION_BACKEND_CB3_ERROR_CODES.SESSION_INTEGRITY_MISMATCH,
        "turn counter does not match accepted history length",
        { sessionId: state.sessionId });
    }
  }

  async function mirrorTranscript(state, record) {
    await memoryEngine.appendTranscript(state.memoryScope, {
      speakerId: record.ownerParticipantId,
      kind: "session_turn",
      content: record.content,
      receipts: [
        { receiptId: `turn-receipt-${record.turnSequence}`, sourceRef: `session://${state.sessionId}/${record.turnId}` },
        ...clone(record.receipts),
      ],
    });
  }

  function sessionSummary(state) {
    return deepFreeze({
      ok: true,
      sessionId: state.sessionId,
      conversationId: state.conversationId,
      status: state.status,
      participantCount: state.participants.length,
      speakerOrder: [...state.speakerOrder],
      pendingQueue: [...state.pendingQueue],
      turnCounter: state.turnCounter,
      acceptedHistoryHash: computeHistoryHash(state),
      nextTurn: state.status === "active" ? nextTurnOwner(state) : null,
      branchCount: Object.keys(state.branches).length,
      checkpointCount: state.checkpoints.length,
    });
  }

  async function createSession(input = {}) {
    if (!object(input)) fail(CB3.SESSION_INVALID, "session input must be an object");
    assertNoHiddenChainOfThought(input, "session");
    assertNoCredentials(input, "session");
    const sessionId = requiredString(input.sessionId, "session.sessionId");
    const existing = await persistence.get(sessionNamespace, stateKey(sessionId));
    if (existing.found) {
      fail(CB3.SESSION_ALREADY_EXISTS, `companion session already exists: ${sessionId}`, { sessionId });
    }
    const conversationId = input.conversationId === undefined
      ? sessionId
      : requiredString(input.conversationId, "session.conversationId");
    if (!Array.isArray(input.participants) || input.participants.length === 0) {
      fail(CB3.PARTICIPANT_INVALID, "session participants must be a non-empty array");
    }
    if (input.participants.length > 32) {
      fail(CB3.PARTICIPANT_INVALID, "a session supports at most 32 participants");
    }
    const participants = input.participants.map((raw, index) => normalizeParticipant(raw, index));
    const seen = new Set();
    for (const participant of participants) {
      if (seen.has(participant.participantId)) {
        fail(CB3.PARTICIPANT_DUPLICATE, `duplicate participant id: ${participant.participantId}`, { participantId: participant.participantId });
      }
      seen.add(participant.participantId);
    }
    if (!Array.isArray(input.speakerOrder) || input.speakerOrder.length === 0) {
      fail(CB3.SPEAKER_ORDER_INVALID, "session speakerOrder must be a non-empty array of participant ids");
    }
    const speakerOrder = input.speakerOrder.map((raw, index) => requiredString(raw, `speakerOrder[${index}]`, CB3.SPEAKER_ORDER_INVALID));
    if (new Set(speakerOrder).size !== speakerOrder.length) {
      fail(CB3.SPEAKER_ORDER_INVALID, "speakerOrder must not contain duplicate participant ids");
    }
    for (const id of speakerOrder) {
      const participant = participants.find((candidate) => candidate.participantId === id);
      if (!participant) {
        fail(CB3.SPEAKER_ORDER_INVALID, `speakerOrder references an unknown participant: ${id}`, { participantId: id });
      }
      if (!participant.canSpeak) {
        fail(CB3.SPEAKER_ORDER_INVALID, `speakerOrder includes a read-only participant: ${id}`, { participantId: id });
      }
    }
    const memoryScope = {
      packageId: input.memoryScope?.packageId ?? null,
      companionId: input.memoryScope?.companionId ?? "conversation",
      conversationId: input.memoryScope?.conversationId ?? conversationId,
    };
    const state = {
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.session-state`,
      sessionId,
      conversationId,
      status: "active",
      participants,
      speakerOrder,
      rotationCursor: 0,
      pendingQueue: [],
      turnCounter: 0,
      acceptedTurns: [],
      branches: {},
      branchCounter: 0,
      checkpoints: [],
      memoryScope,
    };
    // Standard Character Card opening messages are authored card content,
    // accepted once at construction. They do not consume the user's first
    // turn or pretend to be Provider completions. Existing sessions unchanged.
    const initialMessages=(input.initialMessages||[]).map(message=>{
      const participant=findParticipant(state,message.participantId);
      if(participant?.kind!=="companion"||!participant.canSpeak)fail(CB3.PARTICIPANT_INVALID,"card greeting requires a speaking companion");
      return {ownerParticipantId:participant.participantId,content:normalizeContent(message.content,"initialMessage.content"),
        mentions:[],receipts:clone(message.receipts||[]),source:{origin:"character_card",cardRef:clone(message.cardRef)}};
    });
    for(const message of initialMessages){
      const record=buildTurnRecord(state,message);
      state.acceptedTurns.push(record);state.turnCounter+=1;await mirrorTranscript(state,record);
    }
    await saveState(state);
    return sessionSummary(state);
  }

  async function getSessionState(sessionId) {
    const state = await loadState(sessionId);
    return deepFreeze(state);
  }

  async function listSessions() {
    const keys = await persistence.list(indexNamespace);
    const rows = [];
    for (const key of keys) {
      const state = await loadState(key);
      rows.push(sessionSummary(state));
    }
    rows.sort((left, right) => left.sessionId.localeCompare(right.sessionId));
    return deepFreeze(rows);
  }

  async function closeSession(sessionId) {
    const state = await loadState(sessionId);
    if (state.status === "closed") return sessionSummary(state);
    state.status = "closed";
    await saveState(state);
    return sessionSummary(state);
  }

  async function peekNextTurn(sessionId) {
    const state = await loadState(sessionId);
    ensureActive(state);
    return deepFreeze({ ok: true, sessionId: state.sessionId, ...nextTurnOwner(state) });
  }

  async function submitTurn(sessionId, input = {}) {
    if (!object(input)) fail(CB3.TURN_INVALID, "turn submission must be an object");
    assertNoHiddenChainOfThought(input, "turn");
    assertNoCredentials(input, "turn");
    const state = await loadState(sessionId);
    ensureActive(state);
    const speakerId = requiredString(input.participantId, "turn.participantId", CB3.TURN_INVALID);
    const participant = findParticipant(state, speakerId);
    if (!participant) {
      fail(CB3.PARTICIPANT_NOT_FOUND, `participant is not in this session: ${speakerId}`, { participantId: speakerId });
    }
    if (!participant.canSpeak) {
      fail(CB3.PERMISSION_DENIED,
        `participant seat "${participant.seat}" is read-only and cannot take a speaking turn`,
        { participantId: speakerId, seat: participant.seat });
    }
    const expectedSequence = safeInteger(input.expectedTurnSequence, "turn.expectedTurnSequence", 1, Number.MAX_SAFE_INTEGER, CB3.TURN_INVALID);
    if (expectedSequence !== state.turnCounter + 1) {
      fail(CB3.TURN_SEQUENCE_CONFLICT,
        `turn sequence conflict: expected the next sequence ${state.turnCounter + 1}, received ${expectedSequence}; a consumed turn can never be owned twice`,
        { expected: state.turnCounter + 1, received: expectedSequence });
    }
    const expected = nextTurnOwner(state);
    if (expected.ownerParticipantId !== speakerId) {
      fail(CB3.TURN_OWNERSHIP_VIOLATION,
        `turn ${expected.turnSequence} is owned by ${expected.ownerParticipantId}, not ${speakerId}`,
        { turnSequence: expected.turnSequence, expectedOwner: expected.ownerParticipantId, actualSpeaker: speakerId, ownerSource: expected.source });
    }
    const content = normalizeContent(input.content, "turn.content");
    const mentions = normalizeMentions(input.mentions, state, speakerId);
    const receipts = Array.isArray(input.receipts) ? clone(input.receipts) : [];
    if (expected.source === "mention_queue") {
      state.pendingQueue.shift();
    } else {
      state.rotationCursor = (state.rotationCursor + 1) % state.speakerOrder.length;
    }
    const record = buildTurnRecord(state, {
      ownerParticipantId: speakerId,
      content,
      mentions,
      receipts,
      source: { origin: "direct" },
    });
    state.acceptedTurns.push(record);
    state.turnCounter += 1;
    queueMentions(state, mentions);
    await mirrorTranscript(state, record);
    await saveState(state);
    return deepFreeze({
      ok: true,
      sessionId: state.sessionId,
      turn: clone(record),
      acceptedHistoryHash: record.turnHash,
      nextTurn: nextTurnOwner(state),
    });
  }

  async function openBranch(sessionId, input = {}) {
    if (!object(input)) fail(CB3.BRANCH_INVALID, "branch input must be an object");
    assertNoHiddenChainOfThought(input, "branch");
    assertNoCredentials(input, "branch");
    const state = await loadState(sessionId);
    ensureActive(state);
    const kind = requiredString(input.kind, "branch.kind", CB3.BRANCH_INVALID);
    if (!BRANCH_KIND_SET.has(kind)) {
      fail(CB3.BRANCH_INVALID, `unsupported branch kind: ${kind}; expected one of ${COMPANION_BRANCH_KINDS.join(", ")}`);
    }
    const ownerId = requiredString(input.participantId, "branch.participantId", CB3.BRANCH_INVALID);
    const participant = findParticipant(state, ownerId);
    if (!participant) {
      fail(CB3.PARTICIPANT_NOT_FOUND, `participant is not in this session: ${ownerId}`, { participantId: ownerId });
    }
    if (!participant.canSpeak) {
      fail(CB3.PERMISSION_DENIED, `participant seat "${participant.seat}" is read-only and cannot own a branch`, { participantId: ownerId, seat: participant.seat });
    }
    if (state.turnCounter === 0) {
      fail(CB3.BRANCH_BASE_INVALID, "cannot open a branch before any accepted turn exists");
    }
    const baseTurnSequence = input.baseTurnSequence === undefined
      ? state.turnCounter
      : safeInteger(input.baseTurnSequence, "branch.baseTurnSequence", 1, Number.MAX_SAFE_INTEGER, CB3.BRANCH_BASE_INVALID);
    if (baseTurnSequence < 1 || baseTurnSequence > state.turnCounter) {
      fail(CB3.BRANCH_BASE_INVALID,
        `branch base turn ${baseTurnSequence} is outside the accepted history (1..${state.turnCounter})`,
        { baseTurnSequence, turnCounter: state.turnCounter });
    }
    const baseTurn = state.acceptedTurns[baseTurnSequence - 1];
    if (baseTurn.ownerParticipantId !== ownerId) {
      fail(CB3.TURN_OWNERSHIP_VIOLATION,
        `only the owner of turn ${baseTurnSequence} (${baseTurn.ownerParticipantId}) may branch it; ${ownerId} may not`,
        { baseTurnSequence, baseOwner: baseTurn.ownerParticipantId, requestedBy: ownerId });
    }
    const swipeIndex = Object.values(state.branches).filter((branch) =>
      branch.kind === kind && branch.baseTurnSequence === baseTurnSequence && branch.ownerParticipantId === ownerId).length;
    state.branchCounter += 1;
    const branchId = `branch-${state.branchCounter}`;
    const branch = {
      branchId,
      kind,
      baseTurnSequence,
      baseTurnHash: baseTurn.turnHash,
      ownerParticipantId: ownerId,
      swipeIndex,
      status: "open",
      entries: [],
      acceptedEntryId: null,
      acceptedTurnSequence: null,
      note: String(input.note || ""),
    };
    state.branches[branchId] = branch;
    await saveState(state);
    return deepFreeze({ ok: true, sessionId: state.sessionId, branch: clone(branch) });
  }

  async function loadOpenBranch(state, branchId) {
    const id = requiredString(branchId, "branchId", CB3.BRANCH_INVALID);
    const branch = state.branches[id];
    if (!branch) {
      fail(CB3.BRANCH_NOT_FOUND, `branch not found in session ${state.sessionId}: ${id}`, { branchId: id });
    }
    if (branch.status !== "open") {
      fail(CB3.BRANCH_CLOSED, `branch ${id} is ${branch.status} and no longer accepts entries`, { branchId: id, status: branch.status });
    }
    return branch;
  }

  async function submitBranchEntry(sessionId, branchId, input = {}) {
    if (!object(input)) fail(CB3.TURN_INVALID, "branch entry must be an object");
    assertNoHiddenChainOfThought(input, "branchEntry");
    assertNoCredentials(input, "branchEntry");
    const state = await loadState(sessionId);
    ensureActive(state);
    const branch = await loadOpenBranch(state, branchId);
    const speakerId = requiredString(input.participantId, "branchEntry.participantId", CB3.TURN_INVALID);
    if (speakerId !== branch.ownerParticipantId) {
      fail(CB3.TURN_OWNERSHIP_VIOLATION,
        `branch ${branch.branchId} is owned by ${branch.ownerParticipantId}, not ${speakerId}`,
        { branchId: branch.branchId, expectedOwner: branch.ownerParticipantId, actualSpeaker: speakerId });
    }
    const content = normalizeContent(input.content, "branchEntry.content");
    const mentions = normalizeMentions(input.mentions, state, speakerId);
    const receipts = Array.isArray(input.receipts) ? clone(input.receipts) : [];
    const sequence = branch.entries.length + 1;
    const unsigned = {
      entryId: `${branch.branchId}-entry-${sequence}`,
      sequence,
      ownerParticipantId: speakerId,
      content,
      mentions,
      receipts,
    };
    const entry = { ...unsigned, entryHash: hashStarcraftTmgContract(unsigned) };
    branch.entries.push(entry);
    await saveState(state);
    return deepFreeze({ ok: true, sessionId: state.sessionId, branchId: branch.branchId, entry: clone(entry) });
  }

  // Accepting a branch entry appends a NEW accepted turn sourced from the
  // branch. The accepted history (including the branch's base turn) is never
  // overwritten; the original turn remains intact and hash-chained.
  async function acceptBranchEntry(sessionId, branchId, entryId, options = {}) {
    const state = await loadState(sessionId);
    ensureActive(state);
    const branch = await loadOpenBranch(state, branchId);
    const id = requiredString(entryId, "entryId", CB3.BRANCH_INVALID);
    const entry = branch.entries.find((candidate) => candidate.entryId === id);
    if (!entry) {
      fail(CB3.BRANCH_ENTRY_NOT_FOUND, `branch ${branch.branchId} has no entry ${id}`, { branchId: branch.branchId, entryId: id });
    }
    if (options.expectedTurnSequence !== undefined) {
      const expectedSequence = safeInteger(options.expectedTurnSequence, "expectedTurnSequence", 1, Number.MAX_SAFE_INTEGER, CB3.TURN_INVALID);
      if (expectedSequence !== state.turnCounter + 1) {
        fail(CB3.TURN_SEQUENCE_CONFLICT,
          `turn sequence conflict: expected the next sequence ${state.turnCounter + 1}, received ${expectedSequence}`,
          { expected: state.turnCounter + 1, received: expectedSequence });
      }
    }
    const record = buildTurnRecord(state, {
      ownerParticipantId: branch.ownerParticipantId,
      content: entry.content,
      mentions: entry.mentions,
      receipts: entry.receipts,
      source: { origin: "branch", branchId: branch.branchId, entryId: entry.entryId, branchKind: branch.kind, baseTurnSequence: branch.baseTurnSequence },
    });
    // Branch-committed turns are out-of-band: they do not consume the mention
    // queue or advance the rotation cursor, keeping rotation deterministic.
    state.acceptedTurns.push(record);
    state.turnCounter += 1;
    queueMentions(state, entry.mentions);
    branch.status = "accepted";
    branch.acceptedEntryId = entry.entryId;
    branch.acceptedTurnSequence = record.turnSequence;
    await mirrorTranscript(state, record);
    await saveState(state);
    return deepFreeze({
      ok: true,
      sessionId: state.sessionId,
      branchId: branch.branchId,
      turn: clone(record),
      acceptedHistoryHash: record.turnHash,
      nextTurn: nextTurnOwner(state),
    });
  }

  async function discardBranch(sessionId, branchId) {
    const state = await loadState(sessionId);
    ensureActive(state);
    const branch = await loadOpenBranch(state, branchId);
    branch.status = "discarded";
    await saveState(state);
    return deepFreeze({ ok: true, sessionId: state.sessionId, branchId: branch.branchId, status: "discarded" });
  }

  async function listBranches(sessionId) {
    const state = await loadState(sessionId);
    const rows = Object.values(state.branches).map((branch) => ({
      branchId: branch.branchId,
      kind: branch.kind,
      baseTurnSequence: branch.baseTurnSequence,
      ownerParticipantId: branch.ownerParticipantId,
      swipeIndex: branch.swipeIndex,
      status: branch.status,
      entryCount: branch.entries.length,
      acceptedEntryId: branch.acceptedEntryId,
      acceptedTurnSequence: branch.acceptedTurnSequence,
    }));
    rows.sort((left, right) => left.branchId.localeCompare(right.branchId));
    return deepFreeze(rows);
  }

  async function checkpointSession(sessionId, label = "") {
    const state = await loadState(sessionId);
    ensureActive(state);
    const acceptedHistoryHash = computeHistoryHash(state);
    const checkpointId = `sessckpt-${state.checkpoints.length + 1}-${acceptedHistoryHash.slice(0, 12)}`;
    const record = {
      checkpointId,
      label: String(label || ""),
      storage: "session_scoped_state_and_transcript_v2",
      turnSequence: state.turnCounter,
      acceptedHistoryHash,
    };
    state.checkpoints.push(record);
    const transcript = await memoryEngine.readTranscript(state.memoryScope);
    const unsignedSnapshot = {
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.session-checkpoint-snapshot-v2`,
      sessionId: state.sessionId,
      checkpointId,
      state: clone(state),
      transcript: clone(transcript),
      transcriptHash: hashStarcraftTmgContract(transcript),
    };
    const snapshot = {
      ...unsignedSnapshot,
      contentHash: hashStarcraftTmgContract(unsignedSnapshot),
    };
    await persistence.put(checkpointNamespace, `${state.sessionId}::${checkpointId}`, snapshot);
    await saveState(state);
    return deepFreeze({
      ok: true,
      sessionId: state.sessionId,
      checkpoint: { ...clone(record), contentHash: snapshot.contentHash },
    });
  }

  async function listCheckpoints(sessionId) {
    const state = await loadState(sessionId);
    return deepFreeze(clone(state.checkpoints));
  }

  // Long-session resume. Without a checkpoint id this rehydrates the latest
  // persisted state (crash resume on a fresh runtime). With a checkpoint id it
  // restores only this session's state/transcript snapshot — later turns and
  // branches roll back with it while every other session remains untouched —
  // then re-verifies the recorded hashes before allowing any further turn.
  async function resumeSession(sessionId, options = {}) {
    if (options.checkpointId !== undefined && options.checkpointId !== null) {
      const checkpointId = requiredString(options.checkpointId, "checkpointId", CB3.CHECKPOINT_NOT_FOUND);
      const current = await loadState(sessionId);
      const record = current.checkpoints.find((candidate) => candidate.checkpointId === checkpointId);
      if (!record) {
        fail(CB3.CHECKPOINT_NOT_FOUND, `session checkpoint not found: ${checkpointId}`, { sessionId: current.sessionId, checkpointId });
      }
      const stored = await persistence.get(
        checkpointNamespace,
        `${current.sessionId}::${checkpointId}`,
      );
      if (!stored.found) {
        fail(CB3.CHECKPOINT_NOT_FOUND,
          `session checkpoint snapshot is unavailable: ${checkpointId}`,
          { sessionId: current.sessionId, checkpointId });
      }
      const snapshot = clone(stored.value);
      const { contentHash, ...unsignedSnapshot } = snapshot || {};
      if (!object(snapshot)
        || snapshot.schemaVersion !== `${COMPANION_BACKEND_CONTRACT_VERSION}.session-checkpoint-snapshot-v2`
        || snapshot.sessionId !== current.sessionId
        || snapshot.checkpointId !== checkpointId
        || contentHash !== hashStarcraftTmgContract(unsignedSnapshot)
        || snapshot.transcriptHash !== hashStarcraftTmgContract(snapshot.transcript)) {
        fail(COMPANION_BACKEND_CB3_ERROR_CODES.SESSION_INTEGRITY_MISMATCH,
          `session checkpoint snapshot integrity mismatch: ${checkpointId}`,
          { sessionId: current.sessionId, checkpointId });
      }
      const state = clone(snapshot.state);
      verifyHistoryIntegrity(state);
      if (state.turnCounter !== record.turnSequence || computeHistoryHash(state) !== record.acceptedHistoryHash) {
        fail(COMPANION_BACKEND_CB3_ERROR_CODES.SESSION_INTEGRITY_MISMATCH,
          "restored session does not match the recorded checkpoint history",
          { sessionId: state.sessionId, checkpointId });
      }
      // Transcript first, state last. A crash between these writes can be
      // repaired by repeating this explicit restore from the immutable
      // session snapshot; no unrelated session is ever rolled back.
      await memoryEngine.replaceTranscript(state.memoryScope, snapshot.transcript);
      await saveState(state);
      return deepFreeze({
        ok: true,
        sessionId: state.sessionId,
        resumedFrom: checkpointId,
        turnCounter: state.turnCounter,
        acceptedHistoryHash: computeHistoryHash(state),
        nextTurn: state.status === "active" ? nextTurnOwner(state) : null,
      });
    }
    const state = await loadState(sessionId);
    verifyHistoryIntegrity(state);
    return deepFreeze({
      ok: true,
      sessionId: state.sessionId,
      resumedFrom: "latest",
      turnCounter: state.turnCounter,
      acceptedHistoryHash: computeHistoryHash(state),
      nextTurn: state.status === "active" ? nextTurnOwner(state) : null,
    });
  }

  async function exportSession(sessionId) {
    const state = await loadState(sessionId);
    verifyHistoryIntegrity(state);
    const unsigned = {
      schemaVersion: SESSION_EXPORT_SCHEMA,
      exportedState: clone(state),
    };
    const integrity = { algorithm: "sha256", hash: hashStarcraftTmgContract(unsigned) };
    return `${JSON.stringify({ ...unsigned, integrity }, null, 2)}\n`;
  }

  async function importSession(serialized) {
    const parsed = typeof serialized === "string" ? JSON.parse(serialized) : clone(serialized);
    if (!object(parsed) || parsed.schemaVersion !== SESSION_EXPORT_SCHEMA) {
      fail(COMPANION_BACKEND_ERROR_CODES.CONTRACT_INTEGRITY_MISMATCH, "session export schemaVersion mismatch");
    }
    if (parsed.integrity?.algorithm !== "sha256") {
      fail(COMPANION_BACKEND_ERROR_CODES.CONTRACT_INTEGRITY_MISMATCH, "session export integrity algorithm mismatch");
    }
    const { integrity: _integrity, ...unsigned } = parsed;
    if (parsed.integrity.hash !== hashStarcraftTmgContract(unsigned)) {
      fail(COMPANION_BACKEND_ERROR_CODES.CONTRACT_INTEGRITY_MISMATCH, "session export integrity mismatch");
    }
    const state = clone(parsed.exportedState);
    if (!object(state) || !state.sessionId) {
      fail(CB3.SESSION_INVALID, "session export is missing its state");
    }
    verifyHistoryIntegrity(state);
    const existing = await persistence.get(sessionNamespace, stateKey(state.sessionId));
    if (existing.found) {
      fail(CB3.SESSION_ALREADY_EXISTS, `companion session already exists: ${state.sessionId}`, { sessionId: state.sessionId });
    }
    await saveState(state);
    return sessionSummary(state);
  }

  // Permission runtime. authorizeSessionRead never throws for a denial; it
  // returns a fail-closed decision record. assertSessionReadAccess is the
  // throwing variant. filterSessionState partitions a state bundle without
  // ever copying withheld payloads.
  async function authorizeSessionRead(sessionId, participantId, resource = {}) {
    const state = await loadState(sessionId);
    const id = requiredString(participantId, "participantId", CB3.PARTICIPANT_NOT_FOUND);
    const participant = findParticipant(state, id);
    if (!participant) {
      fail(CB3.PARTICIPANT_NOT_FOUND, `participant is not in this session: ${id}`, { participantId: id });
    }
    if (!object(resource)) fail(CB3.SESSION_INVALID, "read resource must be an object");
    const visibility = String(resource.visibility || "");
    const bindingSeat = resource.seat === undefined ? null : String(resource.seat);

    function decision(ok, reason) {
      return deepFreeze({
        ok,
        schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.read-decision`,
        sessionId: state.sessionId,
        participantId: participant.participantId,
        seat: participant.seat,
        visibility: VISIBILITY_SET.has(visibility) ? visibility : "unknown",
        bindingSeat,
        reason,
        failClosed: !ok,
        opponentPrivateInference: "not_performed",
      });
    }

    // Unknown visibility is never treated as allowed (fail closed).
    if (!VISIBILITY_SET.has(visibility)) return decision(false, "unknown_visibility");
    // Opponent-private state is denied for every seat, always.
    if (visibility === "opponent_private") return decision(false, "opponent_private_forbidden");
    const policy = COMPANION_SEAT_READ_POLICY[participant.seat] || [];
    if (visibility.startsWith("same_seat_")) {
      if (!bindingSeat) return decision(false, "missing_seat_binding");
      if (bindingSeat !== participant.seat) return decision(false, "cross_seat_binding");
      if (!policy.includes(visibility)) return decision(false, "denied_by_seat_policy");
    } else if (!policy.includes(visibility)) {
      return decision(false, "denied_by_seat_policy");
    }
    // Even an allowed resource fails closed if its payload smuggles
    // opponent-private keys or hidden reasoning past the visibility label.
    if (resource.payload !== undefined) {
      scanKeys(resource.payload, OPPONENT_PRIVATE_KEY_PATTERN, CB3.OPPONENT_PRIVATE_STATE_FORBIDDEN, "resource.payload");
      assertNoHiddenChainOfThought(resource.payload, "resource.payload");
      assertNoCredentials(resource.payload, "resource.payload");
    }
    return decision(true, "allowed");
  }

  async function assertSessionReadAccess(sessionId, participantId, resource = {}) {
    const result = await authorizeSessionRead(sessionId, participantId, resource);
    if (!result.ok) {
      fail(CB3.PERMISSION_DENIED,
        `read denied for ${result.participantId} (seat ${result.seat}): ${result.reason}`,
        { ...clone(result) });
    }
    return result;
  }

  async function filterSessionState(sessionId, participantId, bundle = {}) {
    if (!object(bundle) || !Array.isArray(bundle.items)) {
      fail(CB3.SESSION_INVALID, "state bundle must be an object with an items array");
    }
    const visible = [];
    const withheld = [];
    for (const [index, item] of bundle.items.entries()) {
      if (!object(item)) fail(CB3.SESSION_INVALID, `items[${index}] must be an object`);
      const itemId = requiredString(item.itemId, `items[${index}].itemId`);
      try {
        const result = await authorizeSessionRead(sessionId, participantId, item);
        if (result.ok) {
          visible.push({
            itemId,
            visibility: result.visibility,
            seat: item.seat === undefined ? null : String(item.seat),
            payload: clone(item.payload),
          });
        } else {
          // Withheld entries disclose existence and reason only; payloads are
          // never copied, so denied content cannot leak through the filter.
          withheld.push({ itemId, visibility: result.visibility, reason: result.reason });
        }
      } catch (error) {
        if (error instanceof CompanionBackendError
          && (error.code === CB3.OPPONENT_PRIVATE_STATE_FORBIDDEN
            || error.code === COMPANION_BACKEND_ERROR_CODES.HIDDEN_COT_FORBIDDEN
            || error.code === COMPANION_BACKEND_ERROR_CODES.CREDENTIALS_FORBIDDEN)) {
          withheld.push({
            itemId,
            visibility: VISIBILITY_SET.has(String(item.visibility || "")) ? String(item.visibility) : "unknown",
            reason: "forbidden_content_fail_closed",
          });
          continue;
        }
        throw error;
      }
    }
    return deepFreeze({
      ok: true,
      schemaVersion: `${COMPANION_BACKEND_CONTRACT_VERSION}.state-filter`,
      sessionId: String(sessionId),
      participantId: String(participantId),
      visible,
      withheld,
      disclosures: {
        visibleCount: visible.length,
        withheldCount: withheld.length,
        opponentPrivateWithheld: withheld.filter((entry) => entry.reason === "opponent_private_forbidden" || entry.reason === "forbidden_content_fail_closed").length,
        unknownVisibilityWithheld: withheld.filter((entry) => entry.reason === "unknown_visibility").length,
        unknownNeverAllowed: true,
        opponentPrivateInference: "not_performed",
      },
    });
  }

  return Object.freeze({
    engineId: "companion_session_runtime_v1",
    branchKinds: COMPANION_BRANCH_KINDS,
    resourceVisibilities: COMPANION_RESOURCE_VISIBILITIES,
    seatReadPolicy: COMPANION_SEAT_READ_POLICY,
    createSession,
    getSessionState,
    listSessions,
    closeSession,
    peekNextTurn,
    submitTurn,
    openBranch,
    submitBranchEntry,
    acceptBranchEntry,
    discardBranch,
    listBranches,
    checkpointSession,
    listCheckpoints,
    resumeSession,
    exportSession,
    importSession,
    authorizeSessionRead,
    assertSessionReadAccess,
    filterSessionState,
  });
}
