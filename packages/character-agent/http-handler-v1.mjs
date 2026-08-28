import { randomUUID } from "node:crypto";

export const STARCRAFT_TMG_CHARACTER_HTTP_VERSION = "starcraft_tmg_character_http_v1";
export const STARCRAFT_TMG_CHARACTER_API_PREFIX = "/starcraft-tmg-level3/agent/api/v1";

const ENDPOINTS = Object.freeze([
  "GET /starcraft-tmg-level3/agent/api/v1/health",
  "GET /starcraft-tmg-level3/agent/api/v1/metadata",
  "POST /starcraft-tmg-level3/agent/api/v1/sessions",
  "GET /starcraft-tmg-level3/agent/api/v1/sessions/:sessionId",
  "POST /starcraft-tmg-level3/agent/api/v1/sessions/:sessionId/byok",
  "DELETE /starcraft-tmg-level3/agent/api/v1/sessions/:sessionId/byok",
  "POST /starcraft-tmg-level3/agent/api/v1/sessions/:sessionId/invoke",
  "GET /starcraft-tmg-level3/agent/api/v1/sessions/:sessionId/traces",
  "DELETE /starcraft-tmg-level3/agent/api/v1/sessions/:sessionId",
]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function response(status, endpoint, result) {
  return {
    status,
    response: {
      ok: result.ok !== false,
      schemaVersion: STARCRAFT_TMG_CHARACTER_HTTP_VERSION,
      endpoint,
      ...(result.ok === false ? { error: result.reason || "request_rejected" } : {}),
      result: clone(result),
    },
  };
}

function failure(status, endpoint, reason, details = {}) {
  return response(status, endpoint, { ok: false, reason, ...details });
}

function statusFor(result) {
  if (result.ok) return 200;
  if (result.reason === "session_not_found") return 404;
  if (result.reason === "session_already_exists") return 409;
  if (result.reason === "credential_required") return 401;
  if (result.reason === "provider_transport_failed") return 502;
  return 400;
}

function decodeSessionId(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export function createStarcraftTmgCharacterHttpAdapter(options = {}) {
  const sessionRuntime = options.sessionRuntime;
  if (!sessionRuntime || typeof sessionRuntime.createSession !== "function") throw new Error("sessionRuntime is required");
  const sessionInputFactory = options.sessionInputFactory;
  if (typeof sessionInputFactory !== "function") throw new Error("sessionInputFactory is required");
  const createSessionId = typeof options.createSessionId === "function"
    ? options.createSessionId
    : () => `sc-character-session-${randomUUID()}`;
  const allowInsecureLoopbackDevelopment = options.allowInsecureLoopbackDevelopment === true;
  const liveProviderConfigured = options.liveProviderConfigured === true;
  const sessionFactoryMetadata = typeof options.sessionFactoryMetadata === "function"
    ? options.sessionFactoryMetadata
    : () => null;

  async function handle(input = {}) {
    const method = String(input.method || "GET").toUpperCase();
    const pathname = String(input.pathname || "");
    const body = input.body && typeof input.body === "object" ? input.body : {};
    const endpoint = pathname.startsWith(STARCRAFT_TMG_CHARACTER_API_PREFIX)
      ? pathname.slice(STARCRAFT_TMG_CHARACTER_API_PREFIX.length).replace(/^\/+/, "") || "health"
      : "unknown";
    if (!pathname.startsWith(STARCRAFT_TMG_CHARACTER_API_PREFIX)) return failure(404, endpoint, "not_found");

    if (endpoint === "health" && method === "GET") {
      return response(200, endpoint, {
        ok: true,
        healthy: true,
        liveProviderConfigured,
        credentialPolicy: "session_memory_only_byok",
        requireSecureByokTransport: !allowInsecureLoopbackDevelopment,
        durability: "process_memory_v0",
        productionReady: false,
        trainingTruth: false,
      });
    }
    if (endpoint === "metadata" && method === "GET") {
      return response(200, endpoint, {
        ok: true,
        endpoints: ENDPOINTS,
        allowedModes: ["tutor", "opponent", "commentator", "companion"],
        sessionContractSource: "server_configured_factory_only",
        characterSelection: "server_configured_allowlist_only",
        arbitrarySystemPromptUpload: false,
        arbitraryProviderProfileUpload: false,
        worldbookSelection: "server_validated_allowlist_spoiler_and_knowledge_ceiling",
        configuredCharacterCatalogue: clone(sessionFactoryMetadata()),
        byokEcho: false,
        liveProviderConfigured,
        productionReady: false,
        trainingTruth: false,
      });
    }

    if (endpoint === "sessions" && method === "POST") {
      if (body.apiKey !== undefined || body.authorization !== undefined || body.credential !== undefined) {
        return failure(400, endpoint, "credential_wrong_endpoint");
      }
      const sessionId = String(body.sessionId || createSessionId());
      let sessionInput;
      try {
        sessionInput = await sessionInputFactory({
          sessionId,
          characterId: body.characterId,
          mode: body.mode,
          roomId: body.roomId,
          seatId: body.seatId,
          conversationProfileId: body.conversationProfileId,
          providerProfileId: body.providerProfileId,
          worldbookIds: clone(body.worldbookIds || []),
          spoilerLevel: body.spoilerLevel,
          spoilerCeilingRank: body.spoilerCeilingRank,
          knowledgeCeilingRank: body.knowledgeCeilingRank,
          allowFanon: body.allowFanon === true,
          locale: body.locale,
        });
      } catch (error) {
        return failure(400, endpoint, "session_input_rejected", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
      const created = await sessionRuntime.createSession({ ...sessionInput, sessionId });
      return response(statusFor(created), endpoint, created);
    }

    const match = endpoint.match(/^sessions\/([^/]+)(?:\/(byok|invoke|traces))?$/);
    if (!match) return failure(404, endpoint, "not_found");
    const sessionId = decodeSessionId(match[1]);
    if (!sessionId) return failure(400, endpoint, "invalid_session_id");
    const operation = match[2] || "inspect";
    let result;

    if (operation === "inspect" && method === "GET") {
      result = sessionRuntime.inspectSession({ sessionId });
    } else if (operation === "inspect" && method === "DELETE") {
      result = sessionRuntime.destroySession({ sessionId });
    } else if (operation === "byok" && method === "POST") {
      const secureTransport = input.secureTransport === true;
      const approvedLoopbackDevelopment = allowInsecureLoopbackDevelopment
        && input.loopbackRequest === true
        && body.riskAcknowledged === true;
      if (!secureTransport && !approvedLoopbackDevelopment) {
        return failure(426, endpoint, "secure_transport_required", {
          credentialPolicy: "session_memory_only_byok",
        });
      }
      result = sessionRuntime.bindByok({ sessionId, apiKey: body.apiKey, boundAt: body.boundAt });
    } else if (operation === "byok" && method === "DELETE") {
      result = sessionRuntime.unbindByok({ sessionId, unboundAt: body.unboundAt });
    } else if (operation === "invoke" && method === "POST") {
      result = await sessionRuntime.invoke({
        sessionId,
        userMessage: body.userMessage,
        intent: body.intent,
        occurredAt: body.occurredAt,
      });
    } else if (operation === "traces" && method === "GET") {
      result = sessionRuntime.listTraces({ sessionId });
    } else {
      return failure(405, endpoint, "method_not_allowed");
    }
    return response(statusFor(result), endpoint, result);
  }

  return Object.freeze({ handle });
}
