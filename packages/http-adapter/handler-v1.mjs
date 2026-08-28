import { randomUUID } from "node:crypto";
import { createStarcraftTmgRoomRuntime } from "../room-runtime/in-memory-room-v1.mjs";

export const STARCRAFT_TMG_LEVEL3_HTTP_VERSION = "starcraft_tmg_level3_http_v2";
export const STARCRAFT_TMG_LEVEL3_API_PREFIX = "/starcraft-tmg-level3/api/v1";
export const STARCRAFT_TMG_LEVEL3_MAX_BODY_BYTES = 256 * 1024;

const ENDPOINTS = Object.freeze([
  "GET /starcraft-tmg-level3/api/v1/health",
  "GET /starcraft-tmg-level3/api/v1/metadata",
  "POST /starcraft-tmg-level3/api/v1/rooms",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/join",
  "GET /starcraft-tmg-level3/api/v1/rooms/:roomId",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/legal-space",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/preview",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/confirm",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/control-lease",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/apply",
  "GET /starcraft-tmg-level3/api/v1/rooms/:roomId/replay",
  "GET /starcraft-tmg-level3/api/v1/rooms/:roomId/historical-rules",
]);

function valueFromQuery(query, key, fallback = undefined) {
  if (query && typeof query.get === "function") return query.get(key) ?? fallback;
  return query?.[key] ?? fallback;
}

function booleanFromQuery(query, key) {
  return valueFromQuery(query, key, "false") === "true";
}

function headerValue(headers, key) {
  if (headers && typeof headers.get === "function") return headers.get(key) || headers.get(key.toLowerCase()) || "";
  const matched = Object.entries(headers || {}).find(([name]) => name.toLowerCase() === key.toLowerCase());
  return String(matched?.[1] || "");
}

function bearerToken(headers) {
  const authorization = headerValue(headers, "authorization");
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] || "";
}

function response(status, endpoint, result) {
  return {
    status,
    response: {
      ok: result.ok !== false,
      schemaVersion: STARCRAFT_TMG_LEVEL3_HTTP_VERSION,
      endpoint,
      ...(result.ok === false ? { error: result.reason || "REQUEST_REJECTED" } : {}),
      result,
    },
  };
}

function failure(status, endpoint, reason, details = {}) {
  return response(status, endpoint, { ok: false, reason, ...details });
}

function statusFor(result) {
  if (result.ok) return 200;
  if (result.reason === "ROOM_NOT_FOUND") return 404;
  if (result.reason === "AUTHENTICATION_REQUIRED") return 401;
  if (["SEAT_GRANT_INVALID", "CAPABILITY_DENIED"].includes(result.reason)) return 403;
  if ([
    "ROOM_ALREADY_EXISTS",
    "REVISION_CONFLICT",
    "LEGAL_SPACE_STALE",
    "PREVIEW_NOT_FOUND",
    "CONTROL_LEASE_FENCED",
    "IDEMPOTENCY_CONFLICT",
  ].includes(result.reason)) return 409;
  if (result.reason === "PAYLOAD_TOO_LARGE") return 413;
  if (result.reason === "DEPENDENCY_QUARANTINED") return 422;
  return 400;
}

function decodeRoomId(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function bodySize(input, body) {
  if (Number.isFinite(Number(input.bodyBytes))) return Number(input.bodyBytes);
  if (typeof input.rawBody === "string") return Buffer.byteLength(input.rawBody, "utf8");
  return Buffer.byteLength(JSON.stringify(body || {}), "utf8");
}

export function createStarcraftTmgLevel3HttpAdapter(options = {}) {
  const runtime = options.roomRuntime || createStarcraftTmgRoomRuntime(options.roomRuntimeOptions);
  const initialStateFactory = typeof options.initialStateFactory === "function" ? options.initialStateFactory : null;
  const createRoomId = typeof options.createRoomId === "function"
    ? options.createRoomId
    : () => `sc-level3-room-${randomUUID()}`;

  async function handle(input = {}) {
    const method = String(input.method || "GET").toUpperCase();
    const pathname = String(input.pathname || "");
    const body = input.body && typeof input.body === "object" ? input.body : {};
    const query = input.query || {};
    const endpoint = pathname.startsWith(STARCRAFT_TMG_LEVEL3_API_PREFIX)
      ? pathname.slice(STARCRAFT_TMG_LEVEL3_API_PREFIX.length).replace(/^\/+/, "") || "health"
      : "unknown";

    if (!pathname.startsWith(STARCRAFT_TMG_LEVEL3_API_PREFIX)) return failure(404, endpoint, "NOT_FOUND");
    if (["POST", "PUT", "PATCH"].includes(method) && bodySize(input, body) > STARCRAFT_TMG_LEVEL3_MAX_BODY_BYTES) {
      return failure(413, endpoint, "PAYLOAD_TOO_LARGE", { maxBodyBytes: STARCRAFT_TMG_LEVEL3_MAX_BODY_BYTES });
    }

    if (endpoint === "health" && method === "GET") return response(200, endpoint, { ok: true, ...(await runtime.health()) });
    if (endpoint === "metadata" && method === "GET") {
      const health = await runtime.health();
      return response(200, endpoint, {
        ok: true,
        authoritySequence: ["createEnvelope", "legalSpace", "preview", "confirm", "apply", "replay"],
        endpoints: ENDPOINTS,
        maxBodyBytes: STARCRAFT_TMG_LEVEL3_MAX_BODY_BYTES,
        roomStoreContract: health.store?.atomicCasContract,
        serverOwnedFields: ["roomId", "initialState", "sideKey", "roleMode", "MatchBinding", "SeatGrant"],
        clientInitialStateAccepted: false,
        clientRoleOrSideAccepted: false,
        durability: health.durability,
        productionReady: health.productionReady,
        trainingTruth: false,
      });
    }

    if (endpoint === "rooms" && method === "POST") {
      if (!initialStateFactory) return failure(503, endpoint, "INITIAL_STATE_FACTORY_UNAVAILABLE");
      if (body.state !== undefined || body.sideKey !== undefined || body.hostSideKey !== undefined
        || body.guestSideKey !== undefined || body.roleMode !== undefined || body.roomId !== undefined) {
        return failure(400, endpoint, "CLIENT_AUTHORITY_FIELD_REJECTED", {
          rejectedFields: ["state", "sideKey", "hostSideKey", "guestSideKey", "roleMode", "roomId"]
            .filter((field) => body[field] !== undefined),
        });
      }
      let initialStateAuthority;
      try {
        initialStateAuthority = await initialStateFactory({
          setupId: body.setupId,
          rosterRefs: body.rosterRefs,
          scenarioRef: body.scenarioRef,
          surfaceMode: body.surfaceMode,
        });
      } catch (error) {
        return failure(400, endpoint, "INITIAL_STATE_FACTORY_FAILED", { message: error instanceof Error ? error.message : String(error) });
      }
      if (!initialStateAuthority || initialStateAuthority.source !== "server_factory") {
        return failure(503, endpoint, "INITIAL_STATE_FACTORY_CONTRACT_INVALID");
      }
      const roomId = String(createRoomId());
      const created = await runtime.createRoom({
        roomId,
        gameId: "starcraft-tmg",
        surfaceMode: body.surfaceMode || "classic",
        title: body.title,
        initialStateAuthority,
        serverSeatPlan: initialStateAuthority.serverSeatPlan,
      });
      return response(statusFor(created), endpoint, created.ok ? { ...created, roomId } : created);
    }

    const roomMatch = endpoint.match(/^rooms\/([^/]+)(?:\/(join|legal-space|preview|confirm|control-lease|apply|replay|historical-rules))?$/);
    if (!roomMatch) return failure(404, endpoint, "NOT_FOUND");
    const roomId = decodeRoomId(roomMatch[1]);
    if (!roomId) return failure(400, endpoint, "INVALID_ROOM_ID");
    const operation = roomMatch[2] || "projection";
    const seatToken = bearerToken(input.headers);
    let result;

    if (operation === "join" && method === "POST") {
      if (body.sideKey !== undefined || body.roleMode !== undefined) return failure(400, endpoint, "CLIENT_AUTHORITY_FIELD_REJECTED");
      result = await runtime.joinRoom({ roomId });
    } else if (operation === "projection" && method === "GET") {
      result = await runtime.readRoom({
        roomId,
        seatToken,
        includeJournal: booleanFromQuery(query, "includeJournal"),
        cursor: valueFromQuery(query, "cursor", 0),
        privateCursor: valueFromQuery(query, "privateCursor", 0),
      });
    } else if (operation === "legal-space" && method === "POST") {
      result = await runtime.legalSpace({ roomId, seatToken });
    } else if (operation === "preview" && method === "POST") {
      result = await runtime.previewAction({ roomId, seatToken, proposal: body.proposal, candidateId: body.candidateId });
    } else if (operation === "confirm" && method === "POST") {
      result = await runtime.confirmPreview({ roomId, seatToken, previewId: body.previewId });
    } else if (operation === "control-lease" && method === "POST") {
      result = await runtime.claimControl({ roomId, seatToken, sessionId: body.sessionId });
    } else if (operation === "apply" && method === "POST") {
      result = await runtime.applyAction({
        roomId,
        seatToken,
        previewId: body.previewId,
        confirmationId: body.confirmationId,
        leaseId: body.leaseId,
        leaseFence: body.leaseFence,
        expectedStateRevision: body.expectedStateRevision,
        idempotencyKey: headerValue(input.headers, "idempotency-key") || body.idempotencyKey,
      });
    } else if (operation === "replay" && method === "GET") {
      result = await runtime.replayRoom({ roomId });
    } else if (operation === "historical-rules" && method === "GET") {
      result = await runtime.readHistoricalRules({ roomId });
    } else {
      return failure(405, endpoint, "METHOD_NOT_ALLOWED");
    }

    return response(statusFor(result), endpoint, result);
  }

  return Object.freeze({ handle, runtime });
}

