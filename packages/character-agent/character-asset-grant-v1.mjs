import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_CHARACTER_ASSET_GRANT_VERSION =
  "starcraft_tmg_character_asset_grant_v1";
export const STARCRAFT_TMG_CHARACTER_ASSET_DELIVERY_VERSION =
  "starcraft_tmg_character_asset_delivery_v1";

const AUDIENCE = "starcraft_tmg_character_asset";
const HASH = /^[a-f0-9]{64}$/u;
const TOKEN_SEGMENT = /^[A-Za-z0-9_-]+$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/u;
const PAYLOAD_KEYS = Object.freeze([
  "schemaVersion",
  "audience",
  "keyId",
  "grantNonce",
  "roomId",
  "seatGrantId",
  "seatKey",
  "principalScopeHash",
  "releaseChannel",
  "rightsDecisionHash",
  "characterPackageHash",
  "visualBindingHash",
  "selectorStateHash",
  "selectorRevision",
  "selectedPersonaWorldbookId",
  "manifestHash",
  "allowedContentHashes",
  "contentSetHash",
  "issuedAt",
  "notBefore",
  "expiresAt",
]);
const MAX_TOKEN_LENGTH = 4096;
const MAX_TTL_MS = 120_000;
const DEFAULT_TTL_MS = 90_000;
const CLOCK_SKEW_MS = 5_000;
const DEFAULT_MAX_ACTIVE_GRANTS = 2_048;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function exactKeys(value, keys) {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}

function identifier(value, field) {
  const normalized = String(value || "");
  if (!IDENTIFIER.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function opaqueHandle(value) {
  const normalized = String(value || "");
  if (normalized.length < 16 || normalized.length > 191 || !TOKEN_SEGMENT.test(normalized)) {
    throw new TypeError("grantNonce must be a 16..191 character opaque Base64URL handle");
  }
  return normalized;
}

function digest(value, field) {
  const normalized = String(value || "").toLowerCase();
  if (!HASH.test(normalized)) throw new TypeError(`${field} must be a SHA-256 digest`);
  return normalized;
}

function instant(value, field) {
  const normalized = String(value || "");
  const milliseconds = Date.parse(normalized);
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${field} must be an ISO-8601 instant`);
  return { normalized, milliseconds };
}

function keyBytes(value) {
  if (Buffer.isBuffer(value) && value.byteLength >= 32) return Buffer.from(value);
  if (value instanceof Uint8Array && value.byteLength >= 32) return Buffer.from(value);
  if (typeof value === "string" && Buffer.byteLength(value, "utf8") >= 32) {
    return Buffer.from(value, "utf8");
  }
  if (value !== undefined) throw new TypeError("character asset HMAC secret must contain at least 32 bytes");
  return randomBytes(32);
}

function sortedContentHashes(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 32) {
    throw new TypeError("allowedContentHashes must contain 1..32 digests");
  }
  const hashes = [...new Set(value.map((entry) => digest(entry, "allowedContentHashes")))].sort();
  if (hashes.length !== value.length) throw new TypeError("allowedContentHashes must be unique");
  return hashes;
}

function rejection(reason) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_ASSET_GRANT_VERSION}.rejection`,
    reason,
    trainingTruth: false,
  });
}

export function createStarcraftTmgCharacterAssetGrantAuthorityV1(options = {}) {
  const secret = keyBytes(options.secret);
  const keyId = identifier(
    options.keyId || `character-asset-${createHash("sha256").update(secret).digest("hex").slice(0, 16)}`,
    "keyId",
  );
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const createNonce = typeof options.createNonce === "function"
    ? options.createNonce
    : () => randomBytes(16).toString("base64url");
  const grantRecords = options.grantRecords instanceof Map ? options.grantRecords : new Map();
  const maxActiveGrants = Number(options.maxActiveGrants ?? DEFAULT_MAX_ACTIVE_GRANTS);
  if (!Number.isSafeInteger(maxActiveGrants) || maxActiveGrants < 1) {
    throw new TypeError("maxActiveGrants must be a positive safe integer");
  }
  const ttlMs = Number(options.ttlMs ?? DEFAULT_TTL_MS);
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > MAX_TTL_MS) {
    throw new TypeError(`character asset grant ttlMs must be between 1 and ${MAX_TTL_MS}`);
  }

  function signSegment(handle, expiresSegment) {
    return createHmac("sha256", secret)
      .update(`${STARCRAFT_TMG_CHARACTER_ASSET_GRANT_VERSION}.${handle}.${expiresSegment}`, "utf8")
      .digest("base64url");
  }

  function prune(observedMilliseconds) {
    for (const [handle, record] of grantRecords) {
      if (!record || record.expiresMilliseconds + CLOCK_SKEW_MS < observedMilliseconds) {
        grantRecords.delete(handle);
      }
    }
    while (grantRecords.size >= maxActiveGrants) {
      const oldestHandle = grantRecords.keys().next().value;
      if (oldestHandle === undefined) break;
      grantRecords.delete(oldestHandle);
    }
  }

  function issue(input = {}) {
    const issued = instant(now(), "issuedAt");
    const allowedContentHashes = sortedContentHashes(input.allowedContentHashes);
    const grantNonce = opaqueHandle(createNonce());
    const expiresAt = new Date(issued.milliseconds + ttlMs).toISOString();
    const payload = {
      schemaVersion: STARCRAFT_TMG_CHARACTER_ASSET_GRANT_VERSION,
      audience: AUDIENCE,
      keyId,
      grantNonce,
      roomId: identifier(input.roomId, "roomId"),
      seatGrantId: identifier(input.seatGrantId, "seatGrantId"),
      seatKey: identifier(input.seatKey, "seatKey"),
      principalScopeHash: digest(input.principalScopeHash, "principalScopeHash"),
      releaseChannel: "development_internal",
      rightsDecisionHash: digest(input.rightsDecisionHash, "rightsDecisionHash"),
      characterPackageHash: digest(input.characterPackageHash, "characterPackageHash"),
      visualBindingHash: digest(input.visualBindingHash, "visualBindingHash"),
      selectorStateHash: digest(input.selectorStateHash, "selectorStateHash"),
      selectorRevision: Number(input.selectorRevision),
      selectedPersonaWorldbookId: identifier(
        input.selectedPersonaWorldbookId,
        "selectedPersonaWorldbookId",
      ),
      manifestHash: digest(input.manifestHash, "manifestHash"),
      allowedContentHashes,
      contentSetHash: hashStarcraftTmgContract(allowedContentHashes),
      issuedAt: issued.normalized,
      notBefore: issued.normalized,
      expiresAt,
    };
    if (!Number.isSafeInteger(payload.selectorRevision) || payload.selectorRevision < 0) {
      throw new TypeError("selectorRevision must be a non-negative safe integer");
    }
    prune(issued.milliseconds);
    if (grantRecords.has(grantNonce)) {
      throw new Error("character asset opaque handle collision");
    }
    const expiresSegment = (issued.milliseconds + ttlMs).toString(36);
    const grantToken = `${grantNonce}.${expiresSegment}.${signSegment(grantNonce, expiresSegment)}`;
    if (grantToken.length > MAX_TOKEN_LENGTH) throw new TypeError("character asset grant is too large");
    grantRecords.set(grantNonce, {
      payload: clone(payload),
      expiresMilliseconds: issued.milliseconds + ttlMs,
    });
    return deepFreeze({
      schemaVersion: STARCRAFT_TMG_CHARACTER_ASSET_DELIVERY_VERSION,
      scheme: "same_origin_content_hash_opaque_hmac_query",
      routeTemplate: "/starcraft-tmg-level3/assets/v1/character/{contentHash}",
      queryParameter: "grant",
      grantToken,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      contentSetHash: payload.contentSetHash,
    });
  }

  function verify(input = {}) {
    try {
      const grantToken = String(input.grantToken || "");
      if (!grantToken || grantToken.length > MAX_TOKEN_LENGTH) return rejection("CHARACTER_ASSET_GRANT_INVALID");
      const parts = grantToken.split(".");
      if (parts.length !== 3 || parts.some((part) => !TOKEN_SEGMENT.test(part))) {
        return rejection("CHARACTER_ASSET_GRANT_INVALID");
      }
      const [grantNonce, expiresSegment, suppliedSeal] = parts;
      if (!/^[0-9a-z]+$/u.test(expiresSegment)) return rejection("CHARACTER_ASSET_GRANT_INVALID");
      const expectedSeal = signSegment(grantNonce, expiresSegment);
      const suppliedBytes = Buffer.from(suppliedSeal, "base64url");
      const expectedBytes = Buffer.from(expectedSeal, "base64url");
      if (suppliedBytes.length !== expectedBytes.length
        || !timingSafeEqual(suppliedBytes, expectedBytes)) {
        return rejection("CHARACTER_ASSET_GRANT_INVALID");
      }
      const tokenExpiresMilliseconds = Number.parseInt(expiresSegment, 36);
      if (!Number.isSafeInteger(tokenExpiresMilliseconds)) {
        return rejection("CHARACTER_ASSET_GRANT_INVALID");
      }
      const record = grantRecords.get(grantNonce);
      if (!record || record.expiresMilliseconds !== tokenExpiresMilliseconds) {
        return rejection("CHARACTER_ASSET_GRANT_INVALID");
      }
      const payload = clone(record.payload);
      if (!exactKeys(payload, PAYLOAD_KEYS)
        || payload.schemaVersion !== STARCRAFT_TMG_CHARACTER_ASSET_GRANT_VERSION
        || payload.audience !== AUDIENCE
        || payload.keyId !== keyId
        || payload.grantNonce !== grantNonce
        || payload.releaseChannel !== "development_internal") {
        return rejection("CHARACTER_ASSET_GRANT_INVALID");
      }
      opaqueHandle(payload.grantNonce);
      identifier(payload.roomId, "roomId");
      identifier(payload.seatGrantId, "seatGrantId");
      identifier(payload.seatKey, "seatKey");
      identifier(payload.selectedPersonaWorldbookId, "selectedPersonaWorldbookId");
      for (const field of [
        "principalScopeHash",
        "rightsDecisionHash",
        "characterPackageHash",
        "visualBindingHash",
        "selectorStateHash",
        "manifestHash",
        "contentSetHash",
      ]) digest(payload[field], field);
      if (!Number.isSafeInteger(payload.selectorRevision) || payload.selectorRevision < 0) {
        return rejection("CHARACTER_ASSET_GRANT_INVALID");
      }
      const allowedContentHashes = sortedContentHashes(payload.allowedContentHashes);
      if (payload.contentSetHash !== hashStarcraftTmgContract(allowedContentHashes)
        || !allowedContentHashes.includes(digest(input.contentHash, "contentHash"))) {
        return rejection("CHARACTER_ASSET_GRANT_SCOPE_MISMATCH");
      }
      const issued = instant(payload.issuedAt, "issuedAt");
      const notBefore = instant(payload.notBefore, "notBefore");
      const expires = instant(payload.expiresAt, "expiresAt");
      const observed = instant(now(), "now");
      const lifetime = expires.milliseconds - issued.milliseconds;
      if (notBefore.milliseconds !== issued.milliseconds
        || expires.milliseconds !== tokenExpiresMilliseconds
        || lifetime < 1
        || lifetime > MAX_TTL_MS
        || observed.milliseconds < notBefore.milliseconds - CLOCK_SKEW_MS
        || observed.milliseconds > expires.milliseconds + CLOCK_SKEW_MS) {
        if (observed.milliseconds > expires.milliseconds + CLOCK_SKEW_MS) {
          grantRecords.delete(grantNonce);
        }
        return rejection("CHARACTER_ASSET_GRANT_EXPIRED");
      }
      return deepFreeze({ ok: true, payload: clone(payload), trainingTruth: false });
    } catch {
      return rejection("CHARACTER_ASSET_GRANT_INVALID");
    }
  }

  return Object.freeze({
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_ASSET_GRANT_VERSION}.authority`,
    keyId,
    issue,
    verify,
    trainingTruth: false,
  });
}
