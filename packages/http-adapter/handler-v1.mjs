import { createHash, randomUUID } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStarcraftTmgRoomRuntime } from "../room-runtime/in-memory-room-v1.mjs";
import {
  STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX,
  createStarcraftTmgSourceProjectionHttpHandlerV1,
} from "../client-domain/source-projection-adapters-v1.mjs";

export const STARCRAFT_TMG_LEVEL3_HTTP_VERSION = "starcraft_tmg_level3_http_v2";
export const STARCRAFT_TMG_LEVEL3_API_PREFIX = "/starcraft-tmg-level3/api/v1";
export const STARCRAFT_TMG_LEVEL3_CHARACTER_ASSET_PREFIX =
  "/starcraft-tmg-level3/assets/v1/character";
export const STARCRAFT_TMG_LEVEL3_MAX_BODY_BYTES = 256 * 1024;
const BEARER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

const BASE_ENDPOINTS = Object.freeze([
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
const CHARACTER_ENDPOINTS = Object.freeze([
  "GET /starcraft-tmg-level3/api/v1/rooms/:roomId/character-presentation",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/character-persona",
  "POST /starcraft-tmg-level3/api/v1/rooms/:roomId/character-spoiler-access",
  "GET /starcraft-tmg-level3/assets/v1/character/:contentHash",
]);
const SOURCE_PROJECTION_ENDPOINTS = Object.freeze([
  `GET ${STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX}/projection`,
]);

function valueFromQuery(query, key, fallback = undefined) {
  if (query && typeof query.get === "function") return query.get(key) ?? fallback;
  return query?.[key] ?? fallback;
}

function booleanFromQuery(query, key) {
  return valueFromQuery(query, key, "false") === "true";
}

function queryEntries(query) {
  if (query && typeof query.entries === "function") return [...query.entries()];
  return Object.entries(query || {}).flatMap(([key, value]) =>
    Array.isArray(value) ? value.map((entry) => [key, entry]) : [[key, value]]);
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
    "stale_selector_revision",
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
  const characterPresentationEnabled = typeof runtime.readCharacterPresentation === "function"
    && typeof runtime.selectCharacterPersona === "function"
    && typeof runtime.setCharacterSpoilerAccess === "function"
    && typeof runtime.readCharacterAsset === "function";
  const sourceProjectionHttp = options.sourceProjectionPort
    ? createStarcraftTmgSourceProjectionHttpHandlerV1({
      sourcePort: options.sourceProjectionPort,
    })
    : null;
  const endpoints = Object.freeze([
    ...BASE_ENDPOINTS,
    ...(characterPresentationEnabled ? CHARACTER_ENDPOINTS : []),
    ...(sourceProjectionHttp ? SOURCE_PROJECTION_ENDPOINTS : []),
  ]);
  const assetRoot = path.resolve(options.assetRoot || path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  ));
  const initialStateFactory = typeof options.initialStateFactory === "function" ? options.initialStateFactory : null;
  const createRoomId = typeof options.createRoomId === "function"
    ? options.createRoomId
    : () => `sc-level3-room-${randomUUID()}`;

  async function handle(input = {}) {
    const method = String(input.method || "GET").toUpperCase();
    const pathname = String(input.pathname || "");
    const body = input.body && typeof input.body === "object" ? input.body : {};
    const query = input.query || {};
    if (pathname.startsWith(STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX)) {
      if (!sourceProjectionHttp) return failure(404, "source-projection", "NOT_FOUND");
      return sourceProjectionHttp.handle(input);
    }
    const assetMatch = pathname.match(/^\/starcraft-tmg-level3\/assets\/v1\/character\/([a-f0-9]{64})$/u);
    if (assetMatch) {
      if (!characterPresentationEnabled) {
        return failure(404, "unknown", "NOT_FOUND");
      }
      if (method !== "GET") return failure(405, "character-asset", "METHOD_NOT_ALLOWED");
      const entries = queryEntries(query);
      if (entries.length !== 1 || entries[0][0] !== "grant"
        || typeof entries[0][1] !== "string" || !entries[0][1]) {
        return failure(401, "character-asset", "CHARACTER_ASSET_GRANT_REQUIRED");
      }
      const descriptor = await runtime.readCharacterAsset({
        contentHash: assetMatch[1],
        grantToken: entries[0][1],
      });
      if (!descriptor.ok) {
        return failure(
          403,
          "character-asset",
          "CHARACTER_ASSET_ACCESS_DENIED",
        );
      }
      const characterRoot = path.join(assetRoot, "assets", "characters");
      const filename = path.resolve(assetRoot, descriptor.outputPath);
      if (!filename.startsWith(`${characterRoot}${path.sep}`)) {
        return failure(403, "character-asset", "CHARACTER_ASSET_PATH_REJECTED");
      }
      try {
        const [realCharacterRoot, realFilename] = await Promise.all([
          realpath(characterRoot),
          realpath(filename),
        ]);
        if (!realFilename.startsWith(`${realCharacterRoot}${path.sep}`)) {
          return failure(403, "character-asset", "CHARACTER_ASSET_PATH_REJECTED");
        }
        const body = await readFile(realFilename);
        const observedHash = createHash("sha256").update(body).digest("hex");
        if (observedHash !== descriptor.contentHash
          || descriptor.mimeType !== "image/png"
          || body.byteLength !== descriptor.byteLength) {
          return failure(409, "character-asset", "CHARACTER_ASSET_INTEGRITY_FAILED");
        }
        return {
          status: 200,
          headers: {
            "content-type": "image/png",
            "content-length": String(body.byteLength),
            "cache-control": "private, no-store, max-age=0",
            pragma: "no-cache",
            "referrer-policy": "no-referrer",
            "x-content-type-options": "nosniff",
            "x-content-sha256": observedHash,
          },
          body,
          binary: true,
        };
      } catch {
        return failure(404, "character-asset", "CHARACTER_ASSET_NOT_FOUND");
      }
    }
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
        endpoints,
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

    const roomMatch = endpoint.match(/^rooms\/([^/]+)(?:\/(join|invites|invite-exchange|recovery-tickets|recovery-exchange|legal-space|preview|confirm|control-lease|apply|replay|historical-rules|character-presentation|character-persona|character-spoiler-access))?$/);
    if (!roomMatch) return failure(404, endpoint, "NOT_FOUND");
    const roomId = decodeRoomId(roomMatch[1]);
    if (!roomId) return failure(400, endpoint, "INVALID_ROOM_ID");
    const operation = roomMatch[2] || "projection";
    const authorizationHeader = headerValue(input.headers, "authorization");
    const seatToken = bearerToken(input.headers);
    if (["projection", "replay", "character-presentation"].includes(operation)
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
    } else if (operation === "character-presentation" && method === "GET") {
      if (!characterPresentationEnabled) {
        return failure(404, endpoint, "CHARACTER_PRESENTATION_EXTENSION_NOT_ENABLED");
      }
      result = await runtime.readCharacterPresentation({ roomId, seatToken });
    } else if (operation === "character-persona" && method === "POST") {
      if (!characterPresentationEnabled) {
        return failure(404, endpoint, "CHARACTER_PRESENTATION_EXTENSION_NOT_ENABLED");
      }
      const rejectedFields = unexpectedBodyFields(body, [
        "personaWorldbookId",
        "expectedRevision",
      ]);
      if (rejectedFields.length) return failure(400, endpoint, "CLIENT_AUTHORITY_FIELD_REJECTED", { rejectedFields });
      result = await runtime.selectCharacterPersona({
        roomId,
        seatToken,
        personaWorldbookId: body.personaWorldbookId,
        expectedRevision: body.expectedRevision,
      });
    } else if (operation === "character-spoiler-access" && method === "POST") {
      if (!characterPresentationEnabled) {
        return failure(404, endpoint, "CHARACTER_PRESENTATION_EXTENSION_NOT_ENABLED");
      }
      const rejectedFields = unexpectedBodyFields(body, ["enabled", "expectedRevision"]);
      if (rejectedFields.length) return failure(400, endpoint, "CLIENT_AUTHORITY_FIELD_REJECTED", { rejectedFields });
      result = await runtime.setCharacterSpoilerAccess({
        roomId,
        seatToken,
        enabled: body.enabled,
        expectedRevision: body.expectedRevision,
      });
    } else {
      return failure(405, endpoint, "METHOD_NOT_ALLOWED");
    }

    return response(statusFor(result), endpoint, result);
  }

  return Object.freeze({ handle, runtime });
}
