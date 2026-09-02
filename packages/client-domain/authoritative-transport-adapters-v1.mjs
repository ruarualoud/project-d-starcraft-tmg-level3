export const STARCRAFT_TMG_CLIENT_TRANSPORT_VERSION = "starcraft_tmg_client_transport_v1";
export const STARCRAFT_TMG_CLIENT_CHARACTER_TRANSPORT_EXTENSION_VERSION =
  "starcraft_tmg_client_transport_v1.character_presentation_v2";
export const STARCRAFT_TMG_CLIENT_HTTP_API_PREFIX = "/starcraft-tmg-level3/api/v1";

const BASE_OPERATIONS = new Set([
  "read_room",
  "read_legal_space",
  "preview_action",
  "confirm_preview",
  "claim_control",
  "issue_invite",
  "exchange_invite",
  "issue_recovery",
  "exchange_recovery",
  "apply_action",
  "read_replay",
]);
const CHARACTER_OPERATIONS = new Set([
  "read_character_presentation",
  "select_character_persona",
  "set_character_spoiler_access",
]);

export class StarcraftTmgClientTransportError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "StarcraftTmgClientTransportError";
    this.code = code;
    this.details = details;
  }
}

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new StarcraftTmgClientTransportError("TRANSPORT_REQUEST_INVALID", `${field} is required`);
  return normalized;
}

function assertRequest(request, characterPresentationEnabled = false) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new StarcraftTmgClientTransportError("TRANSPORT_REQUEST_INVALID", "transport request must be an object");
  }
  if (!BASE_OPERATIONS.has(request.operation)
    && !(characterPresentationEnabled && CHARACTER_OPERATIONS.has(request.operation))) {
    throw new StarcraftTmgClientTransportError("TRANSPORT_OPERATION_UNSUPPORTED", `unsupported operation: ${request.operation || ""}`);
  }
  required(request.roomId, "roomId");
  return request;
}

export function assertStarcraftTmgAuthoritativeTransportPort(port) {
  if (!port || typeof port.execute !== "function") throw new TypeError("AuthoritativeTransportPort.execute is required");
  return port;
}

export function createInMemoryStarcraftTmgAuthoritativeTransportAdapter(options = {}) {
  const runtime = options.roomRuntime;
  if (!runtime) throw new TypeError("roomRuntime is required");
  const characterPresentationEnabled = options.enableCharacterPresentation === true;
  async function execute(input = {}) {
    const request = assertRequest(input, characterPresentationEnabled);
    const shared = { roomId: request.roomId, seatToken: request.seatToken || "" };
    const payload = request.payload || {};
    if (request.operation === "read_room") return runtime.readRoom({ ...shared, ...payload });
    if (request.operation === "read_legal_space") return runtime.legalSpace(shared);
    if (request.operation === "preview_action") return runtime.previewAction({ ...shared, proposal: payload.proposal, candidateId: payload.candidateId });
    if (request.operation === "confirm_preview") return runtime.confirmPreview({
      ...shared,
      previewId: payload.previewId,
      previewToken: payload.previewToken,
      previewContentHash: payload.previewContentHash,
    });
    if (request.operation === "claim_control") return runtime.claimControl({ ...shared, sessionId: payload.sessionId });
    if (request.operation === "issue_invite") return runtime.issueInvite({ ...shared, expectedRoomRevision: payload.expectedRoomRevision });
    if (request.operation === "exchange_invite") return runtime.exchangeInvite({ roomId: request.roomId, inviteToken: payload.inviteToken });
    if (request.operation === "issue_recovery") return runtime.issueSeatRecovery({ ...shared, expectedRoomRevision: payload.expectedRoomRevision });
    if (request.operation === "exchange_recovery") return runtime.recoverSeat({ roomId: request.roomId, recoveryToken: payload.recoveryToken });
    if (request.operation === "apply_action") return runtime.applyAction({ ...shared, ...payload });
    if (request.operation === "read_character_presentation") {
      return runtime.readCharacterPresentation(shared);
    }
    if (request.operation === "select_character_persona") {
      return runtime.selectCharacterPersona({
        ...shared,
        personaWorldbookId: payload.personaWorldbookId,
        expectedRevision: payload.expectedRevision,
      });
    }
    if (request.operation === "set_character_spoiler_access") {
      return runtime.setCharacterSpoilerAccess({
        ...shared,
        enabled: payload.enabled,
        expectedRevision: payload.expectedRevision,
      });
    }
    return runtime.replayRoom(shared);
  }
  return Object.freeze({ execute });
}

function endpointFor(request) {
  const room = `rooms/${encodeURIComponent(request.roomId)}`;
  return {
    read_room: { method: "GET", path: `${room}?includeJournal=false` },
    read_legal_space: { method: "POST", path: `${room}/legal-space` },
    preview_action: { method: "POST", path: `${room}/preview` },
    confirm_preview: { method: "POST", path: `${room}/confirm` },
    claim_control: { method: "POST", path: `${room}/control-lease` },
    issue_invite: { method: "POST", path: `${room}/invites` },
    exchange_invite: { method: "POST", path: `${room}/invite-exchange` },
    issue_recovery: { method: "POST", path: `${room}/recovery-tickets` },
    exchange_recovery: { method: "POST", path: `${room}/recovery-exchange` },
    apply_action: { method: "POST", path: `${room}/apply` },
    read_replay: { method: "GET", path: `${room}/replay` },
    read_character_presentation: { method: "GET", path: `${room}/character-presentation` },
    select_character_persona: { method: "POST", path: `${room}/character-persona` },
    set_character_spoiler_access: { method: "POST", path: `${room}/character-spoiler-access` },
  }[request.operation];
}

function safeBaseUrl(value) {
  const baseUrl = String(value || "").replace(/\/+$/, "");
  if (!baseUrl) return "";
  const parsed = new URL(baseUrl);
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
    throw new TypeError("HTTP authoritative transport requires HTTPS except on loopback");
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

export function createHttpStarcraftTmgAuthoritativeTransportAdapter(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl is required");
  const baseUrl = safeBaseUrl(options.baseUrl);
  const apiPrefix = String(options.apiPrefix || STARCRAFT_TMG_CLIENT_HTTP_API_PREFIX).replace(/\/+$/, "");
  const maxResponseBytes = Math.max(1024, Number(options.maxResponseBytes || 4 * 1024 * 1024));
  const timeoutMs = Math.max(250, Number(options.timeoutMs || 15_000));
  const characterPresentationEnabled = options.enableCharacterPresentation === true;

  async function execute(input = {}) {
    const request = assertRequest(input, characterPresentationEnabled);
    const endpoint = endpointFor(request);
    const headers = { accept: "application/json" };
    if (request.seatToken) headers.authorization = `Bearer ${request.seatToken}`;
    if (request.operation === "apply_action" && request.payload?.idempotencyKey) {
      headers["idempotency-key"] = request.payload.idempotencyKey;
    }
    const init = { method: endpoint.method, headers };
    if (endpoint.method === "POST") {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(request.payload || {});
    }
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    if (controller) init.signal = controller.signal;
    try {
      const response = await fetchImpl(`${baseUrl}${apiPrefix}/${endpoint.path}`, init);
      const text = await response.text();
      if (utf8Length(text) > maxResponseBytes) {
        throw new StarcraftTmgClientTransportError("TRANSPORT_RESPONSE_TOO_LARGE", "authoritative response exceeded the configured limit");
      }
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw new StarcraftTmgClientTransportError("TRANSPORT_RESPONSE_INVALID", "authoritative response was not JSON");
      }
      if (body?.schemaVersion !== "starcraft_tmg_level3_http_v2" || !body.result || typeof body.result !== "object") {
        throw new StarcraftTmgClientTransportError("TRANSPORT_RESPONSE_INVALID", "authoritative response envelope is invalid");
      }
      return body.result;
    } catch (error) {
      if (error instanceof StarcraftTmgClientTransportError) throw error;
      const timedOut = error?.name === "AbortError";
      throw new StarcraftTmgClientTransportError(
        timedOut ? "TRANSPORT_TIMEOUT" : "NETWORK_UNAVAILABLE",
        timedOut ? "authoritative request timed out" : "authoritative transport is unavailable",
      );
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  return Object.freeze({ execute });
}
