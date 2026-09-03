import { containsStarcraftTmgOnlineContextCredentialMaterialV1 } from
  "../online-agent-session/role-context-contracts-v1.mjs";
import {
  STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX,
  STARCRAFT_TMG_ONLINE_AGENT_HTTP_VERSION,
} from "../online-agent-session/http-events-v1.mjs";

export const STARCRAFT_TMG_ONLINE_AGENT_CLIENT_TRANSPORT_VERSION =
  "starcraft_tmg_online_agent_client_transport_v1";

const OPERATIONS = new Set([
  "create_session",
  "read_session",
  "send_turn",
  "cancel_turn",
  "reconnect_session",
  "end_session",
  "read_events",
]);

export class StarcraftTmgOnlineAgentClientTransportError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "StarcraftTmgOnlineAgentClientTransportError";
    this.code = code;
  }
}

function required(value, field, maximum = 240) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > maximum) {
    throw new StarcraftTmgOnlineAgentClientTransportError(
      "AGENT_TRANSPORT_REQUEST_INVALID",
      `${field} is required and bounded`,
    );
  }
  return normalized;
}

function assertRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)
    || !OPERATIONS.has(input.operation)) {
    throw new StarcraftTmgOnlineAgentClientTransportError(
      "AGENT_TRANSPORT_REQUEST_INVALID",
      "online Agent transport request is invalid",
    );
  }
  if (containsStarcraftTmgOnlineContextCredentialMaterialV1(input)) {
    throw new StarcraftTmgOnlineAgentClientTransportError(
      "AGENT_CREDENTIAL_MATERIAL_FORBIDDEN",
      "online Agent transport never accepts Provider credentials",
    );
  }
  required(input.roomId, "roomId");
  if (input.operation !== "create_session") {
    required(input.sessionId, "sessionId", 160);
  }
  if ([
    "create_session", "send_turn", "cancel_turn", "reconnect_session",
    "end_session",
  ].includes(input.operation)) {
    required(input.idempotencyKey, "idempotencyKey", 160);
  }
  return input;
}

export function assertStarcraftTmgOnlineAgentClientTransportPort(port) {
  if (!port || typeof port.execute !== "function") {
    throw new TypeError("OnlineAgentClientTransportPort.execute is required");
  }
  return port;
}

function endpointFor(request) {
  const session = request.sessionId
    ? `sessions/${encodeURIComponent(request.sessionId)}`
    : "sessions";
  const epoch = request.expectedConnectionEpoch;
  const query = new URLSearchParams({ roomId: request.roomId });
  if (epoch !== undefined) query.set("expectedConnectionEpoch", String(epoch));
  if (request.operation === "read_events") {
    query.set("cursor", String(request.cursor || 0));
    query.set("limit", String(request.limit || 50));
  }
  return {
    create_session: {
      method: "POST",
      path: session,
      body: {
        roomId: request.roomId,
        mode: request.mode,
        characterId: request.characterId,
      },
    },
    read_session: { method: "GET", path: `${session}?${query}` },
    send_turn: {
      method: "POST",
      path: `${session}/turns`,
      body: {
        roomId: request.roomId,
        expectedConnectionEpoch: epoch,
        intent: request.intent,
        userMessage: request.userMessage,
      },
    },
    cancel_turn: {
      method: "POST",
      path: `${session}/cancel`,
      body: {
        roomId: request.roomId,
        expectedConnectionEpoch: epoch,
        turnId: request.turnId,
      },
    },
    reconnect_session: {
      method: "POST",
      path: `${session}/reconnect`,
      body: { roomId: request.roomId, expectedConnectionEpoch: epoch },
    },
    end_session: { method: "DELETE", path: `${session}?${query}` },
    read_events: { method: "GET", path: `${session}/events?${query}` },
  }[request.operation];
}

function safeBaseUrl(value) {
  const baseUrl = String(value || "").replace(/\/+$/u, "");
  if (!baseUrl) return "";
  const parsed = new URL(baseUrl);
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(loopback && parsed.protocol === "http:")) {
    throw new TypeError("online Agent HTTP transport requires HTTPS except on loopback");
  }
  return baseUrl;
}

function utf8Length(value) {
  let bytes = 0;
  for (const character of String(value)) {
    const point = character.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function createHttpStarcraftTmgOnlineAgentClientTransportV1(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl is required");
  const baseUrl = safeBaseUrl(options.baseUrl);
  const apiPrefix = String(options.apiPrefix || STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX)
    .replace(/\/+$/u, "");
  const timeoutMs = Math.max(250, Number(options.timeoutMs || 60_000));
  const maxResponseBytes = Math.max(1024,
    Number(options.maxResponseBytes || 4 * 1024 * 1024));

  async function execute(input = {}) {
    const request = assertRequest(input);
    const endpoint = endpointFor(request);
    const headers = { accept: "application/json" };
    const init = {
      method: endpoint.method,
      headers,
      credentials: "include",
    };
    if (endpoint.body) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(endpoint.body);
    }
    if (request.idempotencyKey) {
      headers["idempotency-key"] = request.idempotencyKey;
    }
    const controller = typeof AbortController === "function"
      ? new AbortController()
      : null;
    const timeout = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
    if (controller) init.signal = controller.signal;
    try {
      const response = await fetchImpl(
        `${baseUrl}${apiPrefix}/${endpoint.path}`,
        init,
      );
      const text = await response.text();
      if (utf8Length(text) > maxResponseBytes) {
        throw new StarcraftTmgOnlineAgentClientTransportError(
          "AGENT_TRANSPORT_RESPONSE_TOO_LARGE",
          "online Agent response exceeded the configured limit",
        );
      }
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw new StarcraftTmgOnlineAgentClientTransportError(
          "AGENT_TRANSPORT_RESPONSE_INVALID",
          "online Agent response was not JSON",
        );
      }
      if (body?.schemaVersion !== STARCRAFT_TMG_ONLINE_AGENT_HTTP_VERSION
        || !body.result || typeof body.result !== "object") {
        throw new StarcraftTmgOnlineAgentClientTransportError(
          "AGENT_TRANSPORT_RESPONSE_INVALID",
          "online Agent response envelope is invalid",
        );
      }
      return body.result;
    } catch (error) {
      if (error instanceof StarcraftTmgOnlineAgentClientTransportError) throw error;
      const timedOut = error?.name === "AbortError";
      throw new StarcraftTmgOnlineAgentClientTransportError(
        timedOut ? "AGENT_TRANSPORT_TIMEOUT" : "AGENT_NETWORK_UNAVAILABLE",
        timedOut
          ? "online Agent request timed out"
          : "online Agent transport is unavailable",
      );
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  return Object.freeze({ execute });
}

export function createInMemoryStarcraftTmgOnlineAgentClientTransportV1(
  options = {},
) {
  if (typeof options.httpEvents?.handle !== "function") {
    throw new TypeError("httpEvents.handle is required");
  }
  const headers = Object.freeze({ ...(options.headers || {}) });
  async function execute(input = {}) {
    const request = assertRequest(input);
    const endpoint = endpointFor(request);
    const queryIndex = endpoint.path.indexOf("?");
    const pathname = queryIndex >= 0
      ? endpoint.path.slice(0, queryIndex)
      : endpoint.path;
    const query = queryIndex >= 0
      ? Object.fromEntries(new URLSearchParams(endpoint.path.slice(queryIndex + 1)))
      : {};
    const result = await options.httpEvents.handle({
      method: endpoint.method,
      pathname: `${STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX}/${pathname}`,
      headers: {
        ...headers,
        ...(request.idempotencyKey
          ? { "idempotency-key": request.idempotencyKey }
          : {}),
      },
      query,
      ...(endpoint.body ? { body: endpoint.body } : {}),
    });
    return result.response.result;
  }
  return Object.freeze({ execute });
}
