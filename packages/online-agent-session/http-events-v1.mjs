import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { containsStarcraftTmgOnlineContextCredentialMaterialV1 } from
  "./role-context-contracts-v1.mjs";

export const STARCRAFT_TMG_ONLINE_AGENT_HTTP_VERSION =
  "starcraft_tmg_online_agent_http_v1";
export const STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX =
  "/starcraft-tmg-level3/agent/api/v2";
export const STARCRAFT_TMG_ONLINE_AGENT_MAX_BODY_BYTES = 64 * 1024;

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SESSION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,160}$/u;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,160}$/u;
const CREATE_FIELDS = new Set(["roomId", "mode", "characterId"]);
const SEND_FIELDS = new Set([
  "roomId",
  "expectedConnectionEpoch",
  "intent",
  "userMessage",
]);
const CANCEL_FIELDS = new Set([
  "roomId",
  "expectedConnectionEpoch",
  "turnId",
]);
const RECONNECT_FIELDS = new Set(["roomId", "expectedConnectionEpoch"]);
const SESSION_QUERY_FIELDS = new Set(["roomId", "expectedConnectionEpoch"]);
const EVENT_QUERY_FIELDS = new Set([
  "roomId",
  "expectedConnectionEpoch",
  "cursor",
  "limit",
]);
const ENDPOINTS = Object.freeze([
  `GET ${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/health`,
  `GET ${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/metadata`,
  `POST ${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/sessions`,
  `GET ${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/sessions/:sessionId`,
  `POST ${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/sessions/:sessionId/turns`,
  `POST ${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/sessions/:sessionId/cancel`,
  `POST ${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/sessions/:sessionId/reconnect`,
  `DELETE ${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/sessions/:sessionId`,
  `GET ${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/sessions/:sessionId/events`,
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

function hash(value, field) {
  const normalized = requiredString(value, field, 64).toLowerCase();
  if (!HASH_PATTERN.test(normalized)) {
    throw new TypeError(`${field} must be a sha256 hash`);
  }
  return normalized;
}

function safeInteger(value, field, minimum, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized)
    || normalized < minimum || normalized > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function exactFields(value, allowed, label) {
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const forbiddenFields = Object.keys(value)
    .filter((field) => !allowed.has(field)).sort();
  if (forbiddenFields.length) {
    throw Object.assign(new TypeError(`${label} contains forbidden fields`), {
      code: "forbidden_client_field",
      forbiddenFields,
    });
  }
}

function headerValue(headers, key) {
  if (headers && typeof headers.get === "function") {
    return String(headers.get(key) || headers.get(key.toLowerCase()) || "");
  }
  const match = Object.entries(headers || {})
    .find(([name]) => name.toLowerCase() === key.toLowerCase());
  return String(match?.[1] || "");
}

function queryObject(query) {
  if (query && typeof query.entries === "function") {
    const entries = [...query.entries()];
    const duplicate = entries.find(([key], index) =>
      entries.findIndex(([candidate]) => candidate === key) !== index);
    if (duplicate) throw new TypeError(`query.${duplicate[0]} is duplicated`);
    return Object.fromEntries(entries);
  }
  const result = {};
  for (const [key, value] of Object.entries(query || {})) {
    if (Array.isArray(value)) throw new TypeError(`query.${key} is duplicated`);
    result[key] = value;
  }
  return result;
}

function requestBody(input) {
  const body = input.body === undefined ? {} : input.body;
  if (!object(body)) throw new TypeError("request body must be an object");
  return body;
}

function bodyBytes(input, body) {
  if (input.bodyBytes !== undefined) {
    const declared = Number(input.bodyBytes);
    return Number.isSafeInteger(declared) && declared >= 0
      ? declared
      : Number.POSITIVE_INFINITY;
  }
  if (typeof input.rawBody === "string") {
    return Buffer.byteLength(input.rawBody, "utf8");
  }
  return Buffer.byteLength(JSON.stringify(body), "utf8");
}

function decodeSessionId(value) {
  try {
    const decoded = decodeURIComponent(value);
    return SESSION_ID_PATTERN.test(decoded) ? decoded : "";
  } catch {
    return "";
  }
}

function safeFailure(result) {
  const projection = {
    ok: false,
    reason: /^[A-Za-z0-9._:-]{1,160}$/u.test(String(result?.reason || ""))
      ? String(result.reason)
      : "request_rejected",
    ...(Array.isArray(result?.forbiddenFields)
      ? { forbiddenFields: result.forbiddenFields.map(String).slice(0, 32) }
      : {}),
    ...(Number.isSafeInteger(result?.observedConnectionEpoch)
      ? { observedConnectionEpoch: result.observedConnectionEpoch }
      : {}),
    ...(result?.providerTurn?.turnId
      ? { turnId: String(result.providerTurn.turnId) }
      : result?.turn?.turnId
        ? { turnId: String(result.turn.turnId) }
        : {}),
    retryable: false,
    trainingTruth: false,
  };
  return deepFreeze(projection);
}

function statusFor(result) {
  if (result?.ok) return 200;
  const reason = result?.reason;
  if ([
    "authentication_required",
    "authentication_failed",
    "session_authentication_failed",
  ].includes(reason)) return 401;
  if ([
    "agent_mode_not_authorized",
    "principal_scope_mismatch",
    "seat_scope_mismatch",
    "role_scope_mismatch",
    "character_scope_mismatch",
    "session_scope_mismatch",
  ].includes(reason)) return 403;
  if ([
    "session_not_found",
    "turn_not_found",
    "character_not_available",
  ].includes(reason)) return 404;
  if ([
    "idempotency_conflict",
    "stale_connection",
    "stale_room_binding",
    "stale_character_binding",
    "stale_principal_binding",
    "turn_already_in_flight",
    "session_ended",
    "legal_space_stale",
    "session_fence_changed",
  ].includes(reason)) return 409;
  if ([
    "payload_too_large",
    "user_message_too_large",
    "prompt_context_budget_exceeded",
  ].includes(reason)) return 413;
  if ([
    "idempotency_capacity_exceeded",
    "event_capacity_exceeded",
    "provider_input_budget_exceeded",
    "provider_output_budget_exceeded",
    "provider_total_budget_exceeded",
    "provider_turn_budget_exhausted",
  ].includes(reason)) return 429;
  if (reason === "provider_not_configured") return 503;
  if (reason === "timed_out") return 504;
  if ([
    "provider_failed",
    "provider_request_aborted",
    "unsafe_provider_result",
    "provider_output_rejected",
    "opponent_preview_failed",
    "opponent_preview_binding_mismatch",
  ].includes(reason)) return 502;
  return 400;
}

function response(status, endpoint, result) {
  const body = {
    ok: result.ok !== false,
    schemaVersion: STARCRAFT_TMG_ONLINE_AGENT_HTTP_VERSION,
    endpoint,
    ...(result.ok === false ? { error: result.reason || "request_rejected" } : {}),
    result: clone(result),
  };
  if (containsStarcraftTmgOnlineContextCredentialMaterialV1(body)) {
    return deepFreeze({
      status: 500,
      response: {
        ok: false,
        schemaVersion: STARCRAFT_TMG_ONLINE_AGENT_HTTP_VERSION,
        endpoint,
        error: "unsafe_response_projection",
        result: {
          ok: false,
          reason: "unsafe_response_projection",
          retryable: false,
          trainingTruth: false,
        },
      },
    });
  }
  return deepFreeze({
    status,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      pragma: "no-cache",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
    response: body,
  });
}

function failure(status, endpoint, reason, details = {}) {
  return response(status, endpoint, {
    ok: false,
    reason,
    ...clone(details),
    trainingTruth: false,
  });
}

function projectSession(session) {
  return deepFreeze({
    schemaVersion: `${STARCRAFT_TMG_ONLINE_AGENT_HTTP_VERSION}.session`,
    sessionId: session.sessionId,
    sessionRevision: session.sessionRevision,
    lifecycleState: session.lifecycleState,
    turnState: session.turnState,
    roomId: session.binding.roomId,
    sessionBindingHash: session.binding.sessionBindingHash,
    seatKey: session.binding.seatKey,
    mode: session.binding.mode,
    character: clone(session.binding.character),
    roomBinding: clone(session.binding.roomBinding),
    capability: clone(session.capability),
    connection: clone(session.connection),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    endedAt: session.endedAt,
    productionReady: false,
    trainingTruth: false,
  });
}

function projectTrace(trace) {
  if (!object(trace)) return null;
  return deepFreeze({
    traceId: trace.traceId,
    roleMode: trace.roleMode,
    mode: trace.mode,
    intent: trace.intent,
    promptPack: trace.promptPack,
    harnessToolsCalled: clone(trace.harnessToolsCalled || []),
    outputHash: trace.outputHash || null,
    providerOutputHash: trace.providerOutputHash || null,
    roleOutputStatus: trace.roleOutputStatus || null,
    decisionReceiptHash: trace.decisionReceiptHash || null,
    previewProjectionHash: trace.previewProjectionHash || null,
    confirmationRequired: trace.confirmationRequired === true,
    confirmationOwner: trace.confirmationOwner || null,
    reviewStatus: trace.reviewStatus,
    occurredAt: trace.occurredAt,
    eligibleForTraining: false,
    trainingTruth: false,
  });
}

function projectTurnResult(result) {
  if (!result?.ok) return safeFailure(result);
  return deepFreeze({
    ok: true,
    schemaVersion: `${STARCRAFT_TMG_ONLINE_AGENT_HTTP_VERSION}.turn-result`,
    turn: result.turn ? {
      turnId: result.turn.turnId,
      turnSequence: result.turn.turnSequence,
      state: result.turn.state,
      connectionEpoch: result.turn.connectionEpoch,
      outputHash: result.turn.outputHash,
      turnHash: result.turn.turnHash,
    } : null,
    output: clone(result.output),
    decision: clone(result.decision || null),
    preview: clone(result.preview || null),
    confirmationRequired: result.confirmationRequired === true,
    confirmationOwner: result.confirmationOwner || null,
    trace: projectTrace(result.trace),
    budget: clone(result.state?.budget || null),
    eligibleForTraining: false,
    reviewStatus: "raw",
    trainingTruth: false,
  });
}

function projectContextResult(session, context) {
  const providerState = context.providerState || {};
  return deepFreeze({
    ok: true,
    session: projectSession(session),
    context: {
      schemaVersion: context.schemaVersion,
      sessionId: context.sessionId,
      sessionBindingHash: context.sessionBindingHash,
      connectionEpoch: context.connectionEpoch,
      mode: context.mode,
      promptPack: context.promptPack,
      toolAllowlist: clone(context.toolAllowlist || []),
      memoryNamespaces: clone(context.memoryNamespaces || []),
      ruleSkillRefs: clone(context.ruleSkillRefs || []),
      memoryRefs: clone(context.memoryRefs || []),
      harnessToolsCalled: clone(context.harnessToolsCalled || []),
      history: clone(context.history),
      providerState: {
        schemaVersion: providerState.schemaVersion,
        sessionId: providerState.sessionId,
        sessionRevision: providerState.sessionRevision,
        sessionBindingHash: providerState.sessionBindingHash,
        connectionEpoch: providerState.connectionEpoch,
        lifecycleState: providerState.lifecycleState,
        provider: {
          state: providerState.provider?.state,
          gatewayEvidence: providerState.provider?.gatewayEvidence,
          liveProviderClaim: providerState.provider?.liveProviderClaim === true,
        },
        budget: clone(providerState.budget || null),
        currentTurn: providerState.currentTurn ? {
          turnId: providerState.currentTurn.turnId,
          turnSequence: providerState.currentTurn.turnSequence,
          state: providerState.currentTurn.state,
          connectionEpoch: providerState.currentTurn.connectionEpoch,
          intent: providerState.currentTurn.intent,
          outputHash: providerState.currentTurn.outputHash,
          failure: clone(providerState.currentTurn.failure),
          startedAt: providerState.currentTurn.startedAt,
          terminalAt: providerState.currentTurn.terminalAt,
          timeoutAt: providerState.currentTurn.timeoutAt,
          turnHash: providerState.currentTurn.turnHash,
        } : null,
        concurrentTurnsPerSession: providerState.concurrentTurnsPerSession,
        reconnectMayResumeProviderRequest:
          providerState.reconnectMayResumeProviderRequest === true,
        productionReady: false,
        trainingTruth: false,
      },
      lastTrace: projectTrace(context.lastTrace),
      memoryWrites: 0,
      skillGenerationRuns: 0,
      reconnectRestoresHistory: true,
      productionReady: false,
      trainingTruth: false,
    },
    trainingTruth: false,
  });
}

function eventData(operation, result) {
  if (operation === "turn") return projectTurnResult(result);
  if (operation === "cancel") {
    return result?.ok ? {
      ok: true,
      turnId: result.turn?.turnId || null,
      state: result.turn?.state || null,
      turnHash: result.turn?.turnHash || null,
      idempotentReplay: result.idempotentReplay === true,
      trainingTruth: false,
    } : safeFailure(result);
  }
  if (["create", "reconnect", "end"].includes(operation)) {
    return result?.ok ? {
      ok: true,
      session: projectSession(result.session),
      lifecycleReceiptHash: result.receipt?.receiptHash || null,
      idempotentReplay: result.idempotentReplay === true,
      trainingTruth: false,
    } : safeFailure(result);
  }
  return result?.ok ? { ok: true, trainingTruth: false } : safeFailure(result);
}

export function createStarcraftTmgOnlineAgentHttpEventsV1(options = {}) {
  const sessionLifecycle = options.sessionLifecycle;
  const roleTurnRuntime = options.roleTurnRuntime;
  const providerSupervisor = options.providerSupervisor;
  const principalAuthenticator = options.principalAuthenticator;
  for (const method of [
    "createSession",
    "readSession",
    "reconnectSession",
    "endSession",
  ]) {
    if (typeof sessionLifecycle?.[method] !== "function") {
      throw new TypeError(`sessionLifecycle.${method} is required`);
    }
  }
  for (const method of ["readContext", "sendTurn"]) {
    if (typeof roleTurnRuntime?.[method] !== "function") {
      throw new TypeError(`roleTurnRuntime.${method} is required`);
    }
  }
  for (const method of ["readState", "cancelTurn"]) {
    if (typeof providerSupervisor?.[method] !== "function") {
      throw new TypeError(`providerSupervisor.${method} is required`);
    }
  }
  if (typeof principalAuthenticator?.authenticate !== "function") {
    throw new TypeError("principalAuthenticator.authenticate is required");
  }
  const now = typeof options.now === "function"
    ? options.now
    : () => new Date().toISOString();
  const maxBodyBytes = safeInteger(
    options.maxBodyBytes || STARCRAFT_TMG_ONLINE_AGENT_MAX_BODY_BYTES,
    "maxBodyBytes", 1_024, 1024 * 1024);
  const maxEventsPerSession = safeInteger(options.maxEventsPerSession || 512,
    "maxEventsPerSession", 8, 10_000);
  const maxIdempotencyRecords = safeInteger(options.maxIdempotencyRecords || 4_096,
    "maxIdempotencyRecords", 8, 100_000);
  const eventStreams = new Map();
  const eventReservations = new Map();
  const idempotency = new Map();

  function metadata() {
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_ONLINE_AGENT_HTTP_VERSION}.metadata`,
      prefix: STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX,
      endpoints: ENDPOINTS,
      maxBodyBytes,
      maxEventsPerSession,
      maxIdempotencyRecords,
      authentication: "external_principal_authenticator",
      sensitiveInputRoutes: [],
      rawPromptExposed: false,
      rawProviderOutputExposed: false,
      providerReceiptExposed: false,
      eventDurability: "process_memory_bounded_v1",
      nativeDeviceEvidence: "deferred_by_user",
      secureByokAndLiveProviderTicket: 16,
      productionReady: false,
      trainingTruth: false,
    });
  }

  async function authenticate(input) {
    let authenticated;
    try {
      authenticated = await principalAuthenticator.authenticate({
        method: String(input.method || "GET").toUpperCase(),
        pathname: String(input.pathname || ""),
        headers: input.headers || {},
      });
    } catch {
      return { rejection: { ok: false, reason: "authentication_failed" } };
    }
    if (!object(authenticated) || authenticated.ok !== true) {
      return { rejection: { ok: false, reason: "authentication_required" } };
    }
    try {
      return {
        context: {
          principalSessionRef: requiredString(authenticated.principalSessionRef,
            "principalSessionRef", 512),
        },
        scopeHash: hash(authenticated.authenticationScopeHash,
          "authenticationScopeHash"),
      };
    } catch {
      return { rejection: { ok: false, reason: "authentication_failed" } };
    }
  }

  function streamFor(sessionId) {
    let stream = eventStreams.get(sessionId);
    if (!stream) {
      stream = { events: [], headHash: "0".repeat(64) };
      eventStreams.set(sessionId, stream);
    }
    return stream;
  }

  function reserveEventCapacity(sessionId, required = 1) {
    const reserved = eventReservations.get(sessionId) || 0;
    if (streamFor(sessionId).events.length + reserved + required
      > maxEventsPerSession) return false;
    eventReservations.set(sessionId, reserved + required);
    return true;
  }

  function releaseEventCapacity(sessionId, required = 1) {
    const remaining = (eventReservations.get(sessionId) || 0) - required;
    if (remaining > 0) eventReservations.set(sessionId, remaining);
    else eventReservations.delete(sessionId);
  }

  async function withEventCapacity(sessionId, endpoint, operation, required = 1) {
    if (!reserveEventCapacity(sessionId, required)) {
      return failure(429, endpoint, "event_capacity_exceeded");
    }
    try {
      return await operation();
    } finally {
      releaseEventCapacity(sessionId, required);
    }
  }

  function appendEvent(sessionId, roomId, roleMode, eventType, data) {
    const stream = streamFor(sessionId);
    if (stream.events.length >= maxEventsPerSession) {
      throw Object.assign(new Error("event capacity exceeded"), {
        code: "event_capacity_exceeded",
      });
    }
    const projected = containsStarcraftTmgOnlineContextCredentialMaterialV1(data)
      ? {
        ok: false,
        reason: "unsafe_event_projection_redacted",
        sourceResultHash: hashStarcraftTmgContract(data),
        trainingTruth: false,
      }
      : clone(data);
    const core = {
      schemaVersion: `${STARCRAFT_TMG_ONLINE_AGENT_HTTP_VERSION}.event`,
      eventId: "pending",
      sequence: stream.events.length + 1,
      previousEventHash: stream.headHash,
      sessionId,
      roomId,
      roleMode,
      eventType,
      data: projected,
      occurredAt: new Date(now()).toISOString(),
      eligibleForTraining: false,
      reviewStatus: data?.ok === false ? "rejected" : "raw",
      trainingTruth: false,
    };
    core.eventId = `sc-agent-event-${hashStarcraftTmgContract(core)}`;
    const event = deepFreeze({
      ...core,
      eventHash: hashStarcraftTmgContract(core),
    });
    stream.events.push(event);
    stream.headHash = event.eventHash;
    return event;
  }

  function requireIdempotency(input) {
    const key = headerValue(input.headers, "idempotency-key").trim();
    if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
      throw Object.assign(new TypeError("Idempotency-Key is required"), {
        code: "idempotency_key_required",
      });
    }
    return key;
  }

  async function idempotent(input, auth, endpoint, request, operation) {
    let key;
    try {
      key = requireIdempotency(input);
    } catch (error) {
      return failure(400, endpoint, error.code || "idempotency_key_required");
    }
    const id = hashStarcraftTmgContract({
      authenticationScopeHash: auth.scopeHash,
      method: String(input.method || "").toUpperCase(),
      pathname: String(input.pathname || ""),
      idempotencyKey: key,
    });
    const requestHash = hashStarcraftTmgContract(request);
    const existing = idempotency.get(id);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return failure(409, endpoint, "idempotency_conflict");
      }
      return existing.promise;
    }
    if (idempotency.size >= maxIdempotencyRecords) {
      return failure(429, endpoint, "idempotency_capacity_exceeded");
    }
    const promise = Promise.resolve().then(operation).catch(() =>
      failure(500, endpoint, "internal_operation_failed"));
    idempotency.set(id, { requestHash, promise });
    return promise;
  }

  function scopedRequest(sessionId, value) {
    return {
      sessionId,
      roomId: requiredString(value.roomId, "roomId", 240),
      ...(value.expectedConnectionEpoch === undefined ? {} : {
        expectedConnectionEpoch: safeInteger(value.expectedConnectionEpoch,
          "expectedConnectionEpoch", 1, Number.MAX_SAFE_INTEGER),
      }),
    };
  }

  function mutationRequest(sessionId, value) {
    return {
      ...scopedRequest(sessionId, value),
      expectedConnectionEpoch: safeInteger(value.expectedConnectionEpoch,
        "expectedConnectionEpoch", 1, Number.MAX_SAFE_INTEGER),
    };
  }

  async function handle(input = {}) {
    const method = String(input.method || "GET").toUpperCase();
    const pathname = String(input.pathname || "");
    const endpoint = pathname.startsWith(STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX)
      ? pathname.slice(STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX.length)
        .replace(/^\/+/, "") || "health"
      : "unknown";
    if (!pathname.startsWith(STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX)) {
      return failure(404, endpoint, "not_found");
    }
    let body;
    try {
      body = requestBody(input);
    } catch {
      return failure(400, endpoint, "invalid_request_body");
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)
      && bodyBytes(input, body) > maxBodyBytes) {
      return failure(413, endpoint, "payload_too_large", { maxBodyBytes });
    }
    if (containsStarcraftTmgOnlineContextCredentialMaterialV1(body)) {
      return failure(400, endpoint, "sensitive_request_material_forbidden");
    }
    if (["GET", "DELETE"].includes(method) && Object.keys(body).length) {
      return failure(400, endpoint, "request_body_forbidden");
    }
    if (endpoint === "health" && method === "GET") {
      return response(200, endpoint, {
        ok: true,
        healthy: true,
        ...metadata(),
      });
    }
    if (endpoint === "metadata" && method === "GET") {
      return response(200, endpoint, { ok: true, ...metadata() });
    }
    const sessionMatch = endpoint.match(
      /^sessions\/([^/]+)(?:\/(turns|cancel|reconnect|events))?$/u);
    const isCreate = endpoint === "sessions" && method === "POST";
    if (!isCreate && !sessionMatch) return failure(404, endpoint, "not_found");
    const auth = await authenticate(input);
    if (auth.rejection) return response(statusFor(auth.rejection), endpoint,
      auth.rejection);

    if (isCreate) {
      try {
        exactFields(body, CREATE_FIELDS, "create session body");
      } catch (error) {
        return failure(400, endpoint, error.code || "invalid_session_request", {
          forbiddenFields: error.forbiddenFields || [],
        });
      }
      const request = {
        roomId: body.roomId,
        mode: body.mode,
        characterId: body.characterId,
      };
      return idempotent(input, auth, endpoint, request, async () => {
        const result = await sessionLifecycle.createSession(request, auth.context);
        const projected = result.ok ? {
          ok: true,
          session: projectSession(result.session),
          lifecycleReceiptHash: result.receipt?.receiptHash || null,
          trainingTruth: false,
        } : safeFailure(result);
        if (result.ok) appendEvent(result.session.sessionId,
          result.session.binding.roomId, result.session.binding.mode,
          "session_created", eventData("create", result));
        return response(statusFor(result), endpoint, projected);
      });
    }

    const sessionId = decodeSessionId(sessionMatch[1]);
    if (!sessionId) return failure(400, endpoint, "invalid_session_id");
    const operation = sessionMatch[2] || "read";

    if (operation === "read" && method === "GET") {
      let query;
      try {
        query = queryObject(input.query);
        exactFields(query, SESSION_QUERY_FIELDS, "session query");
        const scoped = scopedRequest(sessionId, query);
        const [session, contextResult] = await Promise.all([
          sessionLifecycle.readSession(scoped, auth.context),
          roleTurnRuntime.readContext(scoped, auth.context),
        ]);
        if (!session.ok) return response(statusFor(session), endpoint,
          safeFailure(session));
        if (!contextResult.ok) return response(statusFor(contextResult), endpoint,
          safeFailure(contextResult));
        return response(200, endpoint,
          projectContextResult(session.session, contextResult.context));
      } catch (error) {
        return failure(400, endpoint, error.code || "invalid_session_request", {
          forbiddenFields: error.forbiddenFields || [],
        });
      }
    }

    if (operation === "events" && method === "GET") {
      try {
        const query = queryObject(input.query);
        exactFields(query, EVENT_QUERY_FIELDS, "event query");
        const scoped = scopedRequest(sessionId, query);
        const session = await sessionLifecycle.readSession(scoped, auth.context);
        if (!session.ok) return response(statusFor(session), endpoint,
          safeFailure(session));
        const cursor = safeInteger(query.cursor || 0, "cursor", 0,
          Number.MAX_SAFE_INTEGER);
        const limit = safeInteger(query.limit || 50, "limit", 1, 100);
        const stream = streamFor(sessionId);
        if (cursor > stream.events.length) {
          return failure(409, endpoint, "event_cursor_ahead", {
            observedCursor: stream.events.length,
          });
        }
        const events = stream.events.slice(cursor, cursor + limit);
        const nextCursor = cursor + events.length;
        return response(200, endpoint, {
          ok: true,
          schemaVersion: `${STARCRAFT_TMG_ONLINE_AGENT_HTTP_VERSION}.event-page`,
          sessionId,
          roomId: scoped.roomId,
          cursor,
          nextCursor,
          hasMore: nextCursor < stream.events.length,
          streamHeadHash: stream.headHash,
          events: clone(events),
          rawPromptExposed: false,
          rawProviderOutputExposed: false,
          providerReceiptExposed: false,
          eligibleForTraining: false,
          trainingTruth: false,
        });
      } catch (error) {
        return failure(400, endpoint, error.code || "invalid_event_request", {
          forbiddenFields: error.forbiddenFields || [],
        });
      }
    }

    if (operation === "turns" && method === "POST") {
      try {
        exactFields(body, SEND_FIELDS, "send turn body");
        const scoped = mutationRequest(sessionId, body);
        const request = {
          ...scoped,
          intent: requiredString(body.intent, "intent", 40),
          userMessage: requiredString(body.userMessage, "userMessage", 8_192),
        };
        return idempotent(input, auth, endpoint, request, () =>
          withEventCapacity(sessionId, endpoint, async () => {
            const result = await roleTurnRuntime.sendTurn(request, auth.context);
            const projection = projectTurnResult(result);
            const session = await sessionLifecycle.readSession(scoped, auth.context);
            if (session.ok) appendEvent(sessionId, scoped.roomId,
              session.session.binding.mode,
              result.ok ? "turn_completed" : "turn_rejected",
              eventData("turn", result));
            return response(statusFor(result), endpoint, projection);
          }));
      } catch (error) {
        return failure(400, endpoint, error.code || "invalid_turn_request", {
          forbiddenFields: error.forbiddenFields || [],
        });
      }
    }

    if (operation === "cancel" && method === "POST") {
      try {
        exactFields(body, CANCEL_FIELDS, "cancel body");
        const scoped = mutationRequest(sessionId, body);
        const request = {
          ...scoped,
          turnId: requiredString(body.turnId, "turnId", 160),
        };
        return idempotent(input, auth, endpoint, request, () =>
          withEventCapacity(sessionId, endpoint, async () => {
            const result = await providerSupervisor.cancelTurn(request, auth.context);
            const cancellationAccepted = result.ok === true
              || (result.reason === "cancelled"
                && result.turn?.state === "cancelled");
            const projected = cancellationAccepted ? {
              ok: true,
              turn: result.turn,
              budget: result.state?.budget || null,
              idempotentCancellation: result.idempotentReplay === true,
              trainingTruth: false,
            } : safeFailure(result);
            const session = await sessionLifecycle.readSession(scoped, auth.context);
            if (session.ok) appendEvent(sessionId, scoped.roomId,
              session.session.binding.mode,
              cancellationAccepted ? "turn_cancelled" : "cancel_rejected",
              eventData("cancel", cancellationAccepted
                ? { ...result, ok: true } : result));
            return response(cancellationAccepted ? 200 : statusFor(result),
              endpoint, projected);
          }));
      } catch (error) {
        return failure(400, endpoint, error.code || "invalid_cancel_request", {
          forbiddenFields: error.forbiddenFields || [],
        });
      }
    }

    if (operation === "reconnect" && method === "POST") {
      try {
        exactFields(body, RECONNECT_FIELDS, "reconnect body");
        const request = mutationRequest(sessionId, body);
        return idempotent(input, auth, endpoint, request, () =>
          withEventCapacity(sessionId, endpoint, async () => {
            const result = await sessionLifecycle.reconnectSession(request,
              auth.context);
            const projected = result.ok ? {
              ok: true,
              session: projectSession(result.session),
              lifecycleReceiptHash: result.receipt?.receiptHash || null,
              trainingTruth: false,
            } : safeFailure(result);
            if (result.ok) appendEvent(sessionId, request.roomId,
              result.session.binding.mode, "session_reconnected",
              eventData("reconnect", result));
            return response(statusFor(result), endpoint, projected);
          }));
      } catch (error) {
        return failure(400, endpoint, error.code || "invalid_reconnect_request", {
          forbiddenFields: error.forbiddenFields || [],
        });
      }
    }

    if (operation === "read" && method === "DELETE") {
      try {
        const query = queryObject(input.query);
        exactFields(query, SESSION_QUERY_FIELDS, "end session query");
        const request = mutationRequest(sessionId, query);
        return idempotent(input, auth, endpoint, request, () =>
          withEventCapacity(sessionId, endpoint, async () => {
            const provider = await providerSupervisor.readState(request, auth.context);
            if (provider.ok && provider.state.currentTurn?.state === "waiting_provider") {
              await providerSupervisor.cancelTurn({
                ...request,
                turnId: provider.state.currentTurn.turnId,
              }, auth.context);
            }
            const result = await sessionLifecycle.endSession(request, auth.context);
            const projected = result.ok ? {
              ok: true,
              session: projectSession(result.session),
              lifecycleReceiptHash: result.receipt?.receiptHash || null,
              inFlightTurnCancelled:
                provider.ok && provider.state.currentTurn?.state === "waiting_provider",
              trainingTruth: false,
            } : safeFailure(result);
            if (result.ok) appendEvent(sessionId, request.roomId,
              result.session.binding.mode, "session_ended", eventData("end", result));
            return response(statusFor(result), endpoint, projected);
          }));
      } catch (error) {
        return failure(400, endpoint, error.code || "invalid_end_request", {
          forbiddenFields: error.forbiddenFields || [],
        });
      }
    }

    return failure(405, endpoint, "method_not_allowed");
  }

  return Object.freeze({ handle, metadata });
}
