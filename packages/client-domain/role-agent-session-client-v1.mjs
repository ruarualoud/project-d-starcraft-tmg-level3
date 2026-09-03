import {
  confirmStarcraftTmgTrustedRoleAgentPreviewV1,
  STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE,
} from "./client-domain-v1.mjs";
import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";
import {
  assertStarcraftTmgOnlineAgentClientTransportPort,
  StarcraftTmgOnlineAgentClientTransportError,
} from "./online-agent-transport-adapters-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "../online-agent-session/portable-credential-material-v1.mjs";

export const STARCRAFT_TMG_ROLE_AGENT_CLIENT_EXTENSION_VERSION =
  "starcraft_tmg_client_domain_v1.role_agent_session_v1";

const ROLE_AGENT_PRIVATE_SESSION_READERS = new WeakMap();

export function readStarcraftTmgTrustedRoleAgentSessionV1(clientDomain) {
  const readPrivateSession = ROLE_AGENT_PRIVATE_SESSION_READERS.get(clientDomain);
  if (!readPrivateSession) return null;
  const session = readPrivateSession();
  if (!session) return null;
  const roomId = session.roomId || session.binding?.roomId;
  const sessionBindingHash = session.sessionBindingHash
    || session.binding?.sessionBindingHash;
  const principalScopeHash = session.principalScopeHash
    || session.binding?.principalScopeHash || null;
  const connectionEpoch = session.connection?.epoch;
  if (!roomId || !session.sessionId || !sessionBindingHash
    || !Number.isSafeInteger(connectionEpoch) || connectionEpoch < 1) {
    return null;
  }
  return deepFreeze({
    roomId,
    sessionId: session.sessionId,
    sessionBindingHash,
    principalScopeHash,
    connectionEpoch,
    lifecycleState: session.lifecycleState,
    trainingTruth: false,
  });
}

const MODE_INTENTS = Object.freeze({
  tutor: Object.freeze(["chat", "explain"]),
  opponent: Object.freeze(["chat", "take_turn"]),
  commentator: Object.freeze(["commentate"]),
  companion: Object.freeze(["chat", "reflect"]),
});
const AGENT_INTENT_FIELDS = Object.freeze({
  open_agent_session: Object.freeze(["type", "mode"]),
  refresh_agent_session: Object.freeze(["type"]),
  send_agent_message: Object.freeze(["type", "intent", "message"]),
  cancel_agent_turn: Object.freeze(["type"]),
  reconnect_agent_session: Object.freeze(["type"]),
  end_agent_session: Object.freeze(["type"]),
  confirm_agent_preview: Object.freeze(["type", "previewId"]),
});
const MAX_MESSAGES = 64;
const MAX_MESSAGE_LENGTH = 8_192;

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

function exactFields(value, fields, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const expected = new Set(fields);
  const actual = Object.keys(value);
  if (actual.length !== fields.length || actual.some((field) => !expected.has(field))) {
    throw new TypeError(`${label} fields are invalid`);
  }
}

function required(value, field, maximum = 240) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > maximum) {
    throw new TypeError(`${field} is required and bounded`);
  }
  return normalized;
}

function operational(view) {
  return view?.phase === "ready"
    && view?.lifecycle?.online === true
    && view?.lifecycle?.visibility === "active";
}

function rejectionCode(error) {
  if (error instanceof StarcraftTmgOnlineAgentClientTransportError) {
    return error.code;
  }
  return String(error?.code || "AGENT_CLIENT_OPERATION_FAILED");
}

function sessionRef(sessionId) {
  return sessionId
    ? hashStarcraftTmgClientContract({ kind: "online_agent_session", sessionId })
    : null;
}

function messageText(output) {
  const speech = output?.channels?.speech?.text;
  const teaching = output?.channels?.teaching?.text;
  return [speech, teaching]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function publicDecision(decision, preview, trace) {
  if (!object(decision)) return null;
  return {
    candidateId: String(decision.candidateId || ""),
    candidateHash: decision.candidateHash || null,
    selectedReason: String(decision.selectedReason || ""),
    scoreOrPositionValue: String(decision.scoreOrPositionValue || ""),
    risk: String(decision.risk || ""),
    rejectedAlternatives: clone(decision.rejectedAlternatives || []),
    memoryInfluence: clone(decision.memoryInfluence || null),
    legalSpaceHash: preview?.legalSpaceHash || null,
    decisionReceiptHash: trace?.decisionReceiptHash || null,
    previewProjectionHash: preview?.previewProjectionHash
      || trace?.previewProjectionHash || null,
  };
}

function publicPreview(preview) {
  if (!object(preview)) return null;
  return {
    previewId: String(preview.previewId || ""),
    previewContentHash: String(preview.previewContentHash || ""),
    previewProjectionHash: String(preview.previewProjectionHash || ""),
    candidateId: String(preview.candidateId || ""),
    expectedStateRevision: Number(preview.expectedStateRevision),
    actionType: String(preview.action?.actionType || ""),
    confirmationRequired: preview.confirmationRequired === true,
    confirmationOwner: String(preview.confirmationOwner || ""),
    modelMayConfirm: false,
    modelMayApply: false,
    trainingTruth: false,
  };
}

function publicTrace(result, context) {
  const trace = result?.trace || context?.lastTrace;
  if (!object(trace)) return null;
  return {
    traceId: String(trace.traceId || ""),
    gameId: String(trace.gameId || "starcraft-tmg"),
    roleMode: String(trace.roleMode || trace.mode || ""),
    mode: String(trace.mode || trace.roleMode || ""),
    intent: String(trace.intent || ""),
    promptPack: clone(trace.promptPack || context?.promptPack || null),
    harnessVersion: String(trace.harnessVersion || "role_agent_session_v1"),
    agentVersion: String(trace.agentVersion || "server_owned_provider_profile"),
    toolCalls: clone(trace.harnessToolsCalled || []),
    ruleSkillRefs: clone(context?.ruleSkillRefs || []),
    memoryRefs: clone(context?.memoryRefs || []),
    memoryInfluence: clone(result?.decision?.memoryInfluence || null),
    decisionReceiptHash: trace.decisionReceiptHash || null,
    previewProjectionHash: trace.previewProjectionHash || null,
    confirmationRequired: trace.confirmationRequired === true,
    occurredAt: trace.occurredAt || null,
    reviewStatus: trace.reviewStatus || "raw",
    rawPromptExposed: false,
    rawProviderOutputExposed: false,
    eligibleForTraining: false,
    trainingTruth: false,
  };
}

export function createStarcraftTmgRoleAgentSessionClientV1(options = {}) {
  const host = options.clientDomain;
  if (!host || Object.keys(host).sort().join("|")
      !== [...STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE].sort().join("|")) {
    throw new TypeError("the exact four-operation Client Domain is required");
  }
  const transport = assertStarcraftTmgOnlineAgentClientTransportPort(
    options.transport,
  );
  const now = typeof options.now === "function"
    ? options.now
    : () => new Date().toISOString();
  const createId = typeof options.createId === "function"
    ? options.createId
    : (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.()
      || Math.random().toString(36).slice(2)}`;
  const listeners = new Set();
  let hostView = host.read();
  let currentView = null;
  let agentQueue = Promise.resolve();
  let contextGeneration = 0;
  let agentRevision = 0;
  let privateSession = null;
  let privatePreview = null;
  let state = {
    status: "not_started",
    mode: "companion",
    provider: null,
    budget: null,
    currentTurn: null,
    messages: [],
    decision: null,
    pendingConfirmation: null,
    trace: null,
    rejection: null,
    updatedAt: null,
  };

  function projectRoleAgent() {
    const readOnly = !operational(hostView);
    const core = {
      schemaVersion: `${STARCRAFT_TMG_ROLE_AGENT_CLIENT_EXTENSION_VERSION}.projection`,
      enabled: true,
      agentRevision,
      status: readOnly && privateSession
        ? (hostView?.lifecycle?.online === false
          ? "offline_read_only"
          : "background_read_only")
        : state.status,
      mode: state.mode,
      sessionRef: sessionRef(privateSession?.sessionId),
      sessionBindingHash: privateSession?.sessionBindingHash || null,
      lifecycleState: privateSession?.lifecycleState || null,
      connectionEpoch: privateSession?.connection?.epoch || null,
      provider: clone(state.provider),
      budget: clone(state.budget),
      currentTurn: clone(state.currentTurn),
      messages: clone(state.messages),
      decision: clone(state.decision),
      pendingConfirmation: clone(state.pendingConfirmation),
      trace: clone(state.trace),
      rejection: clone(state.rejection),
      readOnly,
      requiresExplicitReconnect: Boolean(privateSession
        && (readOnly || state.status === "reconnect_required")),
      capabilities: {
        modes: Object.keys(MODE_INTENTS),
        intentsByMode: clone(MODE_INTENTS),
        cancel: true,
        humanConfirmAgentPreview: true,
        localRulesAuthority: false,
        localRoomAuthority: false,
        modelMayConfirm: false,
        modelMayApply: false,
        providerCredentialInput: false,
        skillGeneration: false,
        trainingTruth: false,
      },
      rawPromptExposed: false,
      rawProviderOutputExposed: false,
      providerReceiptExposed: false,
      updatedAt: state.updatedAt,
      productionReady: false,
      trainingTruth: false,
    };
    return { ...core, projectionHash: hashStarcraftTmgClientContract(core) };
  }

  function buildView() {
    const { viewHash: hostViewHash, ...hostCore } = hostView;
    const core = {
      ...clone(hostCore),
      schemaVersion: `${hostView.schemaVersion}.role_agent_session_v1`,
      hostViewHash,
      roleAgentSession: projectRoleAgent(),
      trainingTruth: false,
    };
    return deepFreeze({ ...core, viewHash: hashStarcraftTmgClientContract(core) });
  }

  function notify() {
    currentView = buildView();
    for (const listener of [...listeners]) {
      try {
        listener(currentView);
      } catch {
        // Presentation subscribers cannot interrupt either domain queue.
      }
    }
    return currentView;
  }

  function publish(patch = {}) {
    state = { ...state, ...clone(patch), updatedAt: now() };
    agentRevision += 1;
    return notify();
  }

  function read() {
    if (!currentView) currentView = buildView();
    return currentView;
  }

  function result(ok, outcome, details = {}) {
    return deepFreeze({ ok, ...(outcome ? { outcome } : {}), ...clone(details), view: read() });
  }

  function reject(code, details = {}, patch = {}) {
    const rejection = {
      code: String(code || "AGENT_CLIENT_OPERATION_FAILED"),
      details: clone(details),
      occurredAt: now(),
      trainingTruth: false,
    };
    publish({ ...clone(patch), rejection });
    return result(false, null, { rejection });
  }

  function assertAgentIntent(input) {
    const fields = AGENT_INTENT_FIELDS[input?.type];
    if (!fields) throw new TypeError("unsupported role-Agent client intent");
    exactFields(input, fields, "role-Agent client intent");
    if (containsStarcraftTmgOnlineCredentialMaterialV1(input)) {
      throw Object.assign(new TypeError("credential-shaped Agent input is forbidden"), {
        code: "AGENT_CREDENTIAL_MATERIAL_FORBIDDEN",
      });
    }
    if (input.type === "open_agent_session" && !MODE_INTENTS[input.mode]) {
      throw new TypeError("unsupported role-Agent mode");
    }
    if (input.type === "send_agent_message") {
      const message = required(input.message, "message", MAX_MESSAGE_LENGTH);
      if (!MODE_INTENTS[state.mode]?.includes(input.intent)) {
        throw new TypeError("intent is not allowed for the selected role-Agent mode");
      }
      return { ...input, message };
    }
    if (input.type === "confirm_agent_preview") {
      return { ...input, previewId: required(input.previewId, "previewId", 240) };
    }
    return clone(input);
  }

  function requireOperationalSession() {
    if (!operational(hostView)) return "AGENT_CLIENT_READ_ONLY";
    if (!privateSession) return "AGENT_SESSION_REQUIRED";
    if (privateSession.lifecycleState !== "active") return "AGENT_SESSION_ENDED";
    return null;
  }

  function sessionRequest(operation, additions = {}) {
    return {
      operation,
      roomId: hostView.locator?.roomId,
      sessionId: privateSession.sessionId,
      expectedConnectionEpoch: privateSession.connection.epoch,
      ...additions,
    };
  }

  function absorbContext(response) {
    if (response?.session) privateSession = clone(response.session);
    const context = response?.context;
    if (!context) return;
    const providerState = context.providerState || {};
    if (providerState.budget) state.budget = clone(providerState.budget);
    if (providerState.provider) state.provider = clone(providerState.provider);
    state.currentTurn = providerState.currentTurn ? {
        turnId: providerState.currentTurn.turnId,
        turnSequence: providerState.currentTurn.turnSequence,
        state: providerState.currentTurn.state,
        connectionEpoch: providerState.currentTurn.connectionEpoch,
        intent: providerState.currentTurn.intent,
        outputHash: providerState.currentTurn.outputHash || null,
        failureCode: providerState.currentTurn.failure?.code || null,
        startedAt: providerState.currentTurn.startedAt,
        terminalAt: providerState.currentTurn.terminalAt,
      } : null;
    if (context.lastTrace) state.trace = publicTrace({}, context);
  }

  async function readServerSession({ publishResult = true } = {}) {
    const response = await transport.execute(sessionRequest("read_session"));
    if (!response?.ok) return response;
    absorbContext(response);
    if (publishResult) {
      publish({
        status: response.session?.lifecycleState === "ended" ? "ended" : "ready",
        provider: state.provider,
        budget: state.budget,
        currentTurn: state.currentTurn,
        trace: state.trace,
        rejection: null,
      });
    }
    return response;
  }

  async function openSession(intent) {
    if (!operational(hostView)) return reject("AGENT_CLIENT_READ_ONLY");
    if (privateSession?.lifecycleState === "active") {
      return reject("AGENT_SESSION_ALREADY_ACTIVE");
    }
    const characterId = hostView.characterPresentation?.character?.characterId;
    if (!characterId) return reject("AGENT_CHARACTER_NOT_AVAILABLE");
    publish({
      status: "connecting",
      mode: intent.mode,
      provider: null,
      budget: null,
      currentTurn: null,
      messages: [],
      decision: null,
      pendingConfirmation: null,
      trace: null,
      rejection: null,
    });
    try {
      const response = await transport.execute({
        operation: "create_session",
        roomId: hostView.locator.roomId,
        mode: intent.mode,
        characterId,
        idempotencyKey: createId("sc-agent-create"),
      });
      if (!response?.ok) {
        return reject(response?.reason || "AGENT_SESSION_CREATE_REJECTED", {}, {
          status: "not_started",
        });
      }
      privateSession = clone(response.session);
      const readResponse = await readServerSession({ publishResult: false });
      if (!readResponse?.ok) {
        return reject(readResponse?.reason || "AGENT_SESSION_READ_REJECTED", {}, {
          status: "reconnect_required",
        });
      }
      publish({
        status: "ready",
        provider: state.provider,
        budget: state.budget,
        currentTurn: state.currentTurn,
        rejection: null,
      });
      return result(true, "agent_session_opened");
    } catch (error) {
      return reject(rejectionCode(error), {}, { status: "not_started" });
    }
  }

  async function discoverInFlight(generation) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (generation !== contextGeneration || state.status !== "sending") return;
      try {
        const response = await readServerSession({ publishResult: false });
        if (generation !== contextGeneration) return;
        if (response?.ok && state.currentTurn?.state === "waiting_provider") {
          publish({ currentTurn: state.currentTurn });
          return;
        }
      } catch {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  async function sendMessage(intent) {
    const blocked = requireOperationalSession();
    if (blocked) return reject(blocked);
    if (state.status === "sending") return reject("AGENT_TURN_ALREADY_IN_FLIGHT");
    const generation = contextGeneration;
    const messages = [...state.messages, {
      id: createId("sc-agent-message"),
      author: "human",
      text: intent.message,
      occurredAt: now(),
    }].slice(-MAX_MESSAGES);
    publish({
      status: "sending",
      messages,
      currentTurn: null,
      decision: null,
      pendingConfirmation: null,
      rejection: null,
    });
    void discoverInFlight(generation);
    try {
      const response = await transport.execute(sessionRequest("send_turn", {
        intent: intent.intent,
        userMessage: intent.message,
        idempotencyKey: createId("sc-agent-turn"),
      }));
      if (generation !== contextGeneration) {
        return result(false, null, {
          rejection: { code: "AGENT_LATE_RESULT_DISCARDED", trainingTruth: false },
        });
      }
      if (!response?.ok) {
        // Recover the server-projected failed/cancelled turn when available so
        // observability can show a real state without exposing failure text.
        try { await readServerSession({ publishResult: false }); } catch {
          // The original safe rejection remains the authoritative outcome.
        }
        return reject(response?.reason || "AGENT_TURN_REJECTED", {
          turnId: response?.turnId || null,
        }, { status: "ready" });
      }
      const text = messageText(response.output)
        || "The Agent returned a structured response without a speech channel.";
      privatePreview = response.preview ? clone(response.preview) : null;
      state.messages = [...state.messages, {
        id: createId("sc-agent-message"),
        author: "agent",
        text,
        visualCue: response.output?.visualCue || null,
        occurredAt: now(),
      }].slice(-MAX_MESSAGES);
      state.currentTurn = response.turn ? {
        turnId: response.turn.turnId,
        state: response.turn.state,
        intent: intent.intent,
        terminalAt: now(),
      } : null;
      const terminalBudget = clone(response.budget || state.budget);
      state.budget = terminalBudget;
      state.trace = publicTrace(response, null);
      // The turn result intentionally omits retained Rule-Skill/Memory
      // context. Re-read the safe server projection once so the observable
      // trace carries those hash refs and the terminal Provider state.
      try { await readServerSession({ publishResult: false }); } catch {
        // A successful turn stays successful; the last safe result projection
        // remains available if the enrichment read is interrupted.
      }
      state.budget = terminalBudget;
      publish({
        status: privatePreview ? "waiting_confirmation" : "ready",
        messages: state.messages,
        currentTurn: state.currentTurn,
        decision: publicDecision(response.decision, response.preview, response.trace),
        pendingConfirmation: publicPreview(privatePreview),
        trace: state.trace,
        budget: state.budget,
        rejection: null,
      });
      return result(true, privatePreview
        ? "agent_preview_waiting_for_human"
        : "agent_turn_completed");
    } catch (error) {
      if (generation !== contextGeneration) {
        return result(false, null, {
          rejection: { code: "AGENT_LATE_RESULT_DISCARDED", trainingTruth: false },
        });
      }
      return reject(rejectionCode(error), {}, { status: "ready" });
    }
  }

  async function cancelTurn() {
    const blocked = requireOperationalSession();
    if (blocked) return reject(blocked);
    try {
      if (!state.currentTurn?.turnId) {
        const readResult = await readServerSession({ publishResult: false });
        if (!readResult?.ok) {
          return reject(readResult?.reason || "AGENT_SESSION_READ_REJECTED");
        }
      }
      if (!state.currentTurn?.turnId) return reject("AGENT_TURN_NOT_IN_FLIGHT");
      const response = await transport.execute(sessionRequest("cancel_turn", {
        turnId: state.currentTurn.turnId,
        idempotencyKey: createId("sc-agent-cancel"),
      }));
      if (!response?.ok) return reject(response?.reason || "AGENT_CANCEL_REJECTED");
      publish({
        status: "ready",
        currentTurn: response.turn ? {
          turnId: response.turn.turnId,
          state: response.turn.state,
          terminalAt: now(),
        } : state.currentTurn,
        budget: clone(response.budget || state.budget),
        rejection: null,
      });
      return result(true, "agent_turn_cancelled");
    } catch (error) {
      return reject(rejectionCode(error));
    }
  }

  async function refreshSession() {
    const blocked = requireOperationalSession();
    if (blocked) return reject(blocked);
    try {
      const response = await readServerSession();
      if (!response?.ok) return reject(response?.reason || "AGENT_SESSION_READ_REJECTED");
      return result(true, "agent_session_refreshed");
    } catch (error) {
      return reject(rejectionCode(error));
    }
  }

  async function reconnectSession() {
    if (!operational(hostView)) return reject("AGENT_CLIENT_READ_ONLY");
    if (!privateSession) return reject("AGENT_SESSION_REQUIRED");
    try {
      const response = await transport.execute(sessionRequest("reconnect_session", {
        idempotencyKey: createId("sc-agent-reconnect"),
      }));
      if (!response?.ok) return reject(response?.reason || "AGENT_RECONNECT_REJECTED");
      privateSession = clone(response.session);
      contextGeneration += 1;
      const readResponse = await readServerSession({ publishResult: false });
      if (!readResponse?.ok) {
        return reject(readResponse?.reason || "AGENT_SESSION_READ_REJECTED", {}, {
          status: "reconnect_required",
        });
      }
      publish({ status: "ready", rejection: null });
      return result(true, "agent_session_reconnected");
    } catch (error) {
      return reject(rejectionCode(error), {}, { status: "reconnect_required" });
    }
  }

  async function endSession() {
    const blocked = requireOperationalSession();
    if (blocked) return reject(blocked);
    try {
      const response = await transport.execute(sessionRequest("end_session", {
        idempotencyKey: createId("sc-agent-end"),
      }));
      if (!response?.ok) return reject(response?.reason || "AGENT_END_REJECTED");
      privateSession = clone(response.session);
      privatePreview = null;
      contextGeneration += 1;
      publish({
        status: "ended",
        currentTurn: null,
        pendingConfirmation: null,
        rejection: null,
      });
      return result(true, "agent_session_ended");
    } catch (error) {
      return reject(rejectionCode(error));
    }
  }

  async function confirmPreview(intent) {
    const blocked = requireOperationalSession();
    if (blocked) return reject(blocked);
    if (!privatePreview || privatePreview.previewId !== intent.previewId) {
      return reject("AGENT_PREVIEW_NOT_CURRENT");
    }
    const confirmed = await confirmStarcraftTmgTrustedRoleAgentPreviewV1(host, {
      preview: privatePreview,
      expectedPreviewId: intent.previewId,
    });
    hostView = host.read();
    if (!confirmed?.ok) {
      const rejected = reject(
        confirmed?.rejection?.code || "AGENT_PREVIEW_CONFIRMATION_REJECTED",
        confirmed?.rejection?.details || {},
        { status: "waiting_confirmation" },
      );
      return deepFreeze({ ...clone(confirmed), rejection: rejected.rejection, view: read() });
    }
    privatePreview = null;
    publish({
      status: "ready",
      pendingConfirmation: null,
      rejection: null,
    });
    return result(true, "agent_preview_confirmed_and_applied", {
      receipt: confirmed.receipt,
    });
  }

  async function performAgentDispatch(input) {
    let intent;
    try {
      intent = assertAgentIntent(input);
    } catch (error) {
      return reject(error.code || "AGENT_CLIENT_INPUT_INVALID");
    }
    if (intent.type === "open_agent_session") return openSession(intent);
    if (intent.type === "refresh_agent_session") return refreshSession();
    if (intent.type === "send_agent_message") return sendMessage(intent);
    if (intent.type === "reconnect_agent_session") return reconnectSession();
    if (intent.type === "end_agent_session") return endSession();
    return confirmPreview(intent);
  }

  function enqueueAgent(operation) {
    const run = agentQueue.then(operation, operation);
    agentQueue = run.catch(() => {});
    return run;
  }

  async function bootstrap(input) {
    contextGeneration += 1;
    privateSession = null;
    privatePreview = null;
    state = {
      status: "not_started",
      mode: "companion",
      provider: null,
      budget: null,
      currentTurn: null,
      messages: [],
      decision: null,
      pendingConfirmation: null,
      trace: null,
      rejection: null,
      updatedAt: now(),
    };
    const response = await host.bootstrap(input);
    hostView = host.read();
    agentRevision += 1;
    notify();
    return deepFreeze({ ...clone(response), view: read() });
  }

  function dispatch(input) {
    if (input?.type === "cancel_agent_turn") {
      try {
        assertAgentIntent(input);
      } catch (error) {
        return Promise.resolve(reject(error.code || "AGENT_CLIENT_INPUT_INVALID"));
      }
      return cancelTurn();
    }
    if (AGENT_INTENT_FIELDS[input?.type]) {
      return enqueueAgent(() => performAgentDispatch(input));
    }
    return host.dispatch(input).then((response) => {
      hostView = host.read();
      notify();
      return deepFreeze({ ...clone(response), view: read() });
    });
  }

  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("Client Domain listener must be a function");
    listeners.add(listener);
    listener(read());
    return () => listeners.delete(listener);
  }

  host.subscribe((view) => {
    const wasOperational = operational(hostView);
    hostView = view;
    const isOperational = operational(hostView);
    if (wasOperational && !isOperational && privateSession) {
      contextGeneration += 1;
    } else if (!wasOperational && isOperational && privateSession
      && privateSession.lifecycleState === "active") {
      state.status = "reconnect_required";
      state.rejection = null;
      agentRevision += 1;
    }
    notify();
  });

  const client = Object.freeze({ bootstrap, read, dispatch, subscribe });
  ROLE_AGENT_PRIVATE_SESSION_READERS.set(client, () => privateSession);
  return client;
}
