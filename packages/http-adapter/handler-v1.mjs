import { randomUUID } from "node:crypto";
import { createStarcraftTmgRoomRuntime } from "../room-runtime/in-memory-room-v1.mjs";

export const STARCRAFT_TMG_LEVEL3_HTTP_VERSION = "starcraft_tmg_level3_http_v2";
export const STARCRAFT_TMG_LEVEL3_API_PREFIX = "/starcraft-tmg-level3/api/v1";
export const STARCRAFT_TMG_LEVEL3_MAX_BODY_BYTES = 256 * 1024;
const BEARER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

const ENDPOINTS = Object.freeze([
  "GET /starcraft-tmg-level3/api/v1/health",
  "GET /starcraft-tmg-level3/api/v1/metadata",
  "POST /starcraft-tmg-level3/api/v1/rooms",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/join",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/invites",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/invite-exchange",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/recovery-tickets",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/recovery-exchange",
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
  return match && BEARER_TOKEN_PATTERN.test(match[1]) ? match[1] : "";
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
  if (["AUTHENTICATION_REQUIRED", "INVITE_REQUIRED", "RECOVERY_TOKEN_REQUIRED"].includes(result.reason)) return 401;
  if (["SEAT_GRANT_INVALID", "CAPABILITY_DENIED", "INVITE_INVALID", "RECOVERY_TOKEN_INVALID"].includes(result.reason)) return 403;
  if ([
    "ROOM_ALREADY_EXISTS",
    "REVISION_CONFLICT",
    "LEGAL_SPACE_STALE",
    "PREVIEW_NOT_FOUND",
    "PREVIEW_BINDING_MISMATCH",
    "CONTROL_LEASE_FENCED",
    "IDEMPOTENCY_CONFLICT",
    "ROOM_FULL",
    "INVITED_SEAT_UNAVAILABLE",
    "INVITE_ALREADY_USED",
    "RECOVERY_TOKEN_ALREADY_USED",
  ].includes(result.reason)) return 409;
  if (["INVITE_EXPIRED", "RECOVERY_TOKEN_EXPIRED"].includes(result.reason)) return 410;
  if (result.reason === "PAYLOAD_TOO_LARGE") return 413;
  if (result.reason === "DEPENDENCY_QUARANTINED") return 422;
  return 400;
}

function decodeRoomId(value) {
  try {
    const decoded = decodeURIComponent(value);
    return /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(decoded) ? decoded : "";
  } catch {
    return "";
  }
}

function bodySize(input, body) {
  if (Number.isFinite(Number(input.bodyBytes))) return Number(input.bodyBytes);
  if (typeof input.rawBody === "string") return Buffer.byteLength(input.rawBody, "utf8");
  return Buffer.byteLength(JSON.stringify(body || {}), "utf8");
}

function unexpectedBodyFields(body, allowed) {
  const allow = new Set(allowed);
  return Object.keys(body || {}).filter((field) => !allow.has(field));
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
        serverOwnedFields: ["roomId", "initialState", "sideKey", "roleMode", "MatchBinding", "SeatGrant", "inviteSeat"],
        clientInitialStateAccepted: false,
        clientRoleOrSideAccepted: false,
        accessSequence: ["issueInvite", "exchangeInvite", "issueSeatRecovery", "recoverSeat"],
        issueEndpointsRequireBearer: true,
        exchangeEndpointsRequireBearer: false,
        accessTokensPersistedAsRoomBoundDigestOnly: true,
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
      if (!created.ok) return response(statusFor(created), endpoint, created);
      const { credentials: serverCredentials, ...safeCreated } = created;
      const hostCredential = serverCredentials?.host || null;
      return response(200, endpoint, {
        ...safeCreated,
        roomId,
        ...(hostCredential ? { credential: hostCredential } : {}),
      });
    }

    const roomMatch = endpoint.match(/^rooms\/([^/]+)(?:\/(join|invites|invite-exchange|recovery-tickets|recovery-exchange|legal-space|preview|confirm|control-lease|apply|replay|historical-rules))?$/);
    if (!roomMatch) return failure(404, endpoint, "NOT_FOUND");
    const roomId = decodeRoomId(roomMatch[1]);
    if (!roomId) return failure(400, endpoint, "INVALID_ROOM_ID");
    const operation = roomMatch[2] || "projection";
    const authorizationHeader = headerValue(input.headers, "authorization");
    const seatToken = bearerToken(input.headers);
    if (["projection", "replay"].includes(operation)
      && authorizationHeader
      && !seatToken) {
      return failure(401, endpoint, "AUTHENTICATION_INVALID");
    }
    let result;

    if (operation === "join" && method === "POST") {
      const rejectedFields = unexpectedBodyFields(body, ["inviteToken"]);
      if (rejectedFields.length) return failure(400, endpoint, "CLIENT_AUTHORITY_FIELD_REJECTED", { rejectedFields });
      result = await runtime.joinRoom({ roomId, inviteToken: body.inviteToken });
    } else if (operation === "invites" && method === "POST") {
      const rejectedFields = unexpectedBodyFields(body, ["expectedRoomRevision"]);
      if (rejectedFields.length) return failure(400, endpoint, "CLIENT_AUTHORITY_FIELD_REJECTED", { rejectedFields });
      result = await runtime.issueInvite({
        roomId,
        seatToken,
        expectedRoomRevision: body.expectedRoomRevision,
      });
    } else if (operation === "invite-exchange" && method === "POST") {
      const rejectedFields = unexpectedBodyFields(body, ["inviteToken"]);
      if (rejectedFields.length) return failure(400, endpoint, "CLIENT_AUTHORITY_FIELD_REJECTED", { rejectedFields });
      result = await runtime.exchangeInvite({ roomId, inviteToken: body.inviteToken });
    } else if (operation === "recovery-tickets" && method === "POST") {
      const rejectedFields = unexpectedBodyFields(body, ["expectedRoomRevision"]);
      if (rejectedFields.length) return failure(400, endpoint, "CLIENT_AUTHORITY_FIELD_REJECTED", { rejectedFields });
      result = await runtime.issueSeatRecovery({
        roomId,
        seatToken,
        expectedRoomRevision: body.expectedRoomRevision,
      });
    } else if (operation === "recovery-exchange" && method === "POST") {
      const rejectedFields = unexpectedBodyFields(body, ["recoveryToken"]);
      if (rejectedFields.length) return failure(400, endpoint, "CLIENT_AUTHORITY_FIELD_REJECTED", { rejectedFields });
      result = await runtime.recoverSeat({ roomId, recoveryToken: body.recoveryToken });
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
      const rejectedFields = unexpectedBodyFields(body, [
        "previewId",
        "previewToken",
        "previewContentHash",
      ]);
      if (rejectedFields.length) return failure(400, endpoint, "CLIENT_AUTHORITY_FIELD_REJECTED", { rejectedFields });
      result = await runtime.confirmPreview({
        roomId,
        seatToken,
        previewId: body.previewId,
        previewToken: body.previewToken,
        previewContentHash: body.previewContentHash,
      });
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
      result = await runtime.replayRoom({ roomId, seatToken });
    } else if (operation === "historical-rules" && method === "GET") {
      result = await runtime.readHistoricalRules({ roomId });
    } else {
      return failure(405, endpoint, "METHOD_NOT_ALLOWED");
    }

    return response(statusFor(result), endpoint, result);
  }

  return Object.freeze({ handle, runtime });
}
