import {
  hashStarcraftTmgClientContract,
} from "../../../../packages/client-domain/portable-contract-hash-v1.mjs";

export const STARCRAFT_TMG_ROOM_ACCESS_VERSION =
  "starcraft_tmg_room_access_url_v1";
export const STARCRAFT_TMG_ROOM_ACCESS_SCHEME =
  "projectd-starcraft-tmg";

const MAX_URL_LENGTH = 8_192;
const MAX_ROOM_ID_LENGTH = 128;
const CAPABILITY_LENGTH = 43;
const CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const ACCESS_KEYS = new Set(["invite", "recovery"]);
const AUTHORITY_CLAIM_KEYS = new Set([
  "state",
  "gamestate",
  "wholestate",
  "side",
  "sidekey",
  "role",
  "rolemode",
  "baseurl",
  "apiorigin",
  "revision",
  "staterevision",
  "roomrevision",
  "expectedrevision",
  "expectedroomrevision",
  "confirmed",
  "confirmationboolean",
  "clientrng",
  "rngseed",
  "randomseed",
  "rulesoverride",
  "sourceoverride",
  "providercredential",
  "providerapikey",
  "apikey",
  "modelcredential",
  "sessionid",
  "seat",
  "seatkey",
  "ttl",
  "ttlms",
  "token",
  "seattoken",
  "invitetoken",
  "recoverytoken",
  "bearertoken",
  "credential",
  "credentials",
  "seatgrant",
]);
const SENSITIVE_QUERY_KEYS = new Set([
  ...ACCESS_KEYS,
  ...AUTHORITY_CLAIM_KEYS,
]);

export class StarcraftTmgRoomAccessError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "StarcraftTmgRoomAccessError";
    this.code = code;
    this.details = details;
  }
}

function normalizedKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fail(code, message, details = {}) {
  throw new StarcraftTmgRoomAccessError(code, message, details);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function parsedUrl(rawUrl) {
  const input = String(rawUrl || "").trim();
  if (!input || input.length > MAX_URL_LENGTH) {
    fail("ROOM_URL_INVALID", "room URL is required and bounded");
  }
  try {
    return { input, url: new URL(input) };
  } catch {
    fail("ROOM_URL_INVALID", "room URL is malformed");
  }
}

function loopbackHostname(hostname) {
  const normalized = String(hostname || "").toLowerCase();
  return normalized === "localhost"
    || normalized === "127.0.0.1"
    || normalized === "[::1]"
    || normalized === "::1";
}

function productionEnvironment(value) {
  return String(value || "development") === "production";
}

export function normalizeStarcraftTmgTrustedHttpsOrigin(value) {
  let candidate;
  try {
    candidate = new URL(String(value || "").trim());
  } catch {
    fail("ROOM_APP_LINK_ORIGIN_INVALID", "trusted App Link origin is malformed");
  }
  if (candidate.protocol !== "https:"
    || candidate.username
    || candidate.password
    || candidate.port
    || loopbackHostname(candidate.hostname)
    || candidate.pathname !== "/"
    || candidate.search
    || candidate.hash) {
    fail(
      "ROOM_APP_LINK_ORIGIN_INVALID",
      "trusted App Link origin must be a public HTTPS origin without credentials, port, path, query, or fragment",
    );
  }
  return candidate.origin;
}

function trustedOriginSet(values = []) {
  const result = new Set();
  for (const value of values || []) {
    try {
      const candidate = new URL(String(value || ""));
      if (candidate.username || candidate.password) continue;
      if (candidate.protocol === "https:"
        || ((candidate.protocol === "http:" || candidate.protocol === "https:")
          && loopbackHostname(candidate.hostname))) {
        result.add(candidate.origin);
      }
    } catch {
      // An invalid configured origin cannot broaden trust.
    }
  }
  return result;
}

function classifyOrigin(url, options) {
  if (url.username || url.password) {
    fail("ROOM_URL_CREDENTIALS_FORBIDDEN", "room URL cannot contain URL credentials");
  }
  if (url.protocol === `${STARCRAFT_TMG_ROOM_ACCESS_SCHEME}:`) {
    if (productionEnvironment(options.environment)) {
      fail(
        "ROOM_CUSTOM_SCHEME_DEVELOPMENT_ONLY",
        "custom room URL scheme is disabled in production",
      );
    }
    if (url.port) fail("ROOM_URL_ORIGIN_INVALID", "custom room URL cannot contain a port");
    return "custom_scheme";
  }
  const loopback = loopbackHostname(url.hostname);
  if (loopback && (url.protocol === "http:" || url.protocol === "https:")) {
    return "loopback";
  }
  if (url.protocol !== "https:") {
    fail("ROOM_URL_ORIGIN_INVALID", "room URL requires HTTPS except on loopback");
  }
  if (!trustedOriginSet(options.trustedOrigins).has(url.origin)) {
    fail("ROOM_URL_ORIGIN_UNTRUSTED", "room URL origin is not trusted");
  }
  return "trusted_https";
}

function roomPath(url, originKind) {
  let segments;
  if (originKind === "custom_scheme") {
    const host = String(url.hostname || "").toLowerCase();
    if (host === "room") {
      if (!/^\/[^/]+$/u.test(url.pathname)) {
        fail("ROOM_PATH_INVALID", "custom room URL path must be exactly /:id");
      }
      segments = ["room", ...url.pathname.split("/").filter(Boolean)];
    } else if (!host) {
      if (!/^\/room\/[^/]+$/u.test(url.pathname)) {
        fail("ROOM_PATH_INVALID", "custom room URL path must be exactly /room/:id");
      }
      segments = url.pathname.split("/").filter(Boolean);
    } else {
      fail("ROOM_PATH_INVALID", "custom room URL host must be room or empty");
    }
  } else {
    if (!/^\/room\/[^/]+$/u.test(url.pathname)) {
      fail("ROOM_PATH_INVALID", "room URL path must be exactly /room/:id");
    }
    segments = url.pathname.split("/").filter(Boolean);
  }
  if (segments.length !== 2 || segments[0] !== "room") {
    fail("ROOM_PATH_INVALID", "room URL path must be exactly /room/:id");
  }
  let roomId;
  try {
    roomId = decodeURIComponent(segments[1]);
  } catch {
    fail("ROOM_ID_INVALID", "room ID encoding is malformed");
  }
  if (!roomId
    || roomId.length > MAX_ROOM_ID_LENGTH
    || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(roomId)) {
    fail("ROOM_ID_INVALID", "room ID must be a bounded URL-safe identifier");
  }
  return roomId;
}

function parameterEntries(input) {
  const params = new URLSearchParams(input);
  const entries = [...params.entries()];
  if (entries.length > 64) {
    fail("ROOM_URL_PARAMETER_LIMIT", "room URL has too many parameters");
  }
  return entries.map(([key, value]) => ({ key, normalized: normalizedKey(key), value }));
}

function ignoredClaims(queryEntries, fragmentEntries) {
  const result = [];
  const seen = new Set();
  for (const [location, entries] of [["query", queryEntries], ["fragment", fragmentEntries]]) {
    for (const entry of entries) {
      if (!AUTHORITY_CLAIM_KEYS.has(entry.normalized)) continue;
      const identity = `${location}:${entry.normalized}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      result.push({
        location,
        key: entry.normalized,
        reason: "url_claim_is_not_authority",
      });
    }
  }
  return result;
}

function parseAccess(queryEntries, fragmentEntries) {
  const queryAccess = queryEntries.filter((entry) => ACCESS_KEYS.has(entry.normalized));
  if (queryAccess.length) {
    fail(
      "ROOM_CAPABILITY_LOCATION_INVALID",
      "invite and recovery capabilities are accepted only from the URL fragment",
      { keys: [...new Set(queryAccess.map((entry) => entry.normalized))].sort() },
    );
  }
  const fragmentAccess = fragmentEntries.filter((entry) => ACCESS_KEYS.has(entry.normalized));
  const kinds = [...new Set(fragmentAccess.map((entry) => entry.normalized))];
  if (kinds.length > 1 || fragmentAccess.length > 1) {
    fail("ROOM_CAPABILITY_AMBIGUOUS", "room URL must carry at most one capability");
  }
  if (!fragmentAccess.length) return null;
  const [{ normalized: kind, value: token }] = fragmentAccess;
  if (!token
    || token.length !== CAPABILITY_LENGTH
    || !CAPABILITY_PATTERN.test(token)) {
    fail("ROOM_CAPABILITY_INVALID", "room capability is malformed or unbounded");
  }
  return {
    kind,
    token,
    ephemeral: true,
  };
}

function scrubbedWebPath(url) {
  if (!new Set(["http:", "https:"]).has(url.protocol)) return null;
  const query = new URLSearchParams(url.search);
  for (const key of [...query.keys()]) {
    if (SENSITIVE_QUERY_KEYS.has(normalizedKey(key))) query.delete(key);
  }
  const serialized = query.toString();
  return `${url.pathname}${serialized ? `?${serialized}` : ""}`;
}

/**
 * Parse an untrusted room URL into a locator plus an optional one-shot access
 * capability. URL claims are audit metadata only and never become authority.
 */
export function parseStarcraftTmgRoomAccessUrl(rawUrl, options = {}) {
  const { input, url } = parsedUrl(rawUrl);
  const originKind = classifyOrigin(url, options);
  const roomId = roomPath(url, originKind);
  const queryEntries = parameterEntries(url.search.slice(1));
  const fragmentEntries = parameterEntries(url.hash.slice(1));
  const access = parseAccess(queryEntries, fragmentEntries);
  if (access
    && productionEnvironment(options.environment)
    && originKind !== "trusted_https") {
    fail(
      "ROOM_CAPABILITY_REQUIRES_HTTPS_APP_LINK",
      "production invite and recovery capabilities require a trusted HTTPS App Link",
    );
  }
  const ignored = ignoredClaims(queryEntries, fragmentEntries);
  const fingerprint = hashStarcraftTmgClientContract({
    schemaVersion: `${STARCRAFT_TMG_ROOM_ACCESS_VERSION}.fingerprint`,
    input,
  });
  return freeze({
    schemaVersion: STARCRAFT_TMG_ROOM_ACCESS_VERSION,
    locator: { roomId },
    access,
    accessFingerprint: fingerprint,
    accessStatus: {
      kind: access?.kind || null,
      present: Boolean(access),
      ephemeral: Boolean(access),
    },
    originKind,
    ignoredClaims: ignored,
    scrubbedWebPath: scrubbedWebPath(url),
    authority: {
      sideFromUrl: false,
      roleFromUrl: false,
      transportOriginFromUrl: false,
      revisionFromUrl: false,
      confirmationFromUrl: false,
      seatGrantFromUrl: false,
      trainingTruth: false,
    },
    trainingTruth: false,
  });
}

export function isStarcraftTmgRoomAccessCandidate(rawUrl) {
  try {
    const { url } = parsedUrl(rawUrl);
    if (url.protocol === `${STARCRAFT_TMG_ROOM_ACCESS_SCHEME}:`) return true;
    return (url.protocol === "https:" || url.protocol === "http:")
      && (url.pathname === "/room" || url.pathname.startsWith("/room/"));
  } catch {
    return false;
  }
}

/**
 * Best-effort browser history replacement target. This function deliberately
 * does not validate or retain a capability; it only removes sensitive input.
 */
export function scrubStarcraftTmgSensitiveWebUrl(rawUrl) {
  try {
    const { url } = parsedUrl(rawUrl);
    return scrubbedWebPath(url);
  } catch {
    return null;
  }
}

function normalizedLinkBase(value, environment) {
  const requested = String(value || `${STARCRAFT_TMG_ROOM_ACCESS_SCHEME}:`).trim();
  if (requested === `${STARCRAFT_TMG_ROOM_ACCESS_SCHEME}:`
    || requested === `${STARCRAFT_TMG_ROOM_ACCESS_SCHEME}://`
    || requested === `${STARCRAFT_TMG_ROOM_ACCESS_SCHEME}:///`) {
    if (productionEnvironment(environment)) {
      fail(
        "ROOM_CUSTOM_SCHEME_DEVELOPMENT_ONLY",
        "custom room URL scheme is disabled in production",
      );
    }
    return { kind: "custom_scheme", value: `${STARCRAFT_TMG_ROOM_ACCESS_SCHEME}://room` };
  }
  let parsed;
  try {
    parsed = new URL(requested);
  } catch {
    fail("ROOM_LINK_ORIGIN_INVALID", "room link origin is malformed");
  }
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    fail("ROOM_LINK_ORIGIN_INVALID", "room link origin must not contain credentials, path, query, or fragment");
  }
  const loopback = loopbackHostname(parsed.hostname);
  if (parsed.protocol !== "https:" && !(loopback && parsed.protocol === "http:")) {
    fail("ROOM_LINK_ORIGIN_INVALID", "room link origin requires HTTPS except on loopback");
  }
  return { kind: loopback ? "loopback" : "trusted_https", value: parsed.origin };
}

export function buildStarcraftTmgRoomAccessUrl(input = {}) {
  const roomId = String(input.roomId || "").trim();
  if (!roomId
    || roomId.length > MAX_ROOM_ID_LENGTH
    || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(roomId)) {
    fail("ROOM_ID_INVALID", "room ID must be a bounded URL-safe identifier");
  }
  const kind = normalizedKey(input.access?.kind);
  const token = String(input.access?.token || "");
  if (!ACCESS_KEYS.has(kind)
    || !token
    || token.length !== CAPABILITY_LENGTH
    || !CAPABILITY_PATTERN.test(token)) {
    fail("ROOM_CAPABILITY_INVALID", "a bounded invite or recovery capability is required");
  }
  const base = normalizedLinkBase(input.origin, input.environment);
  if (productionEnvironment(input.environment)) {
    if (base.kind !== "trusted_https") {
      fail(
        "ROOM_CAPABILITY_REQUIRES_HTTPS_APP_LINK",
        "production invite and recovery capabilities require a trusted HTTPS App Link",
      );
    }
    const trusted = new Set(
      [...(input.trustedOrigins || [])]
        .map((origin) => {
          try {
            return normalizeStarcraftTmgTrustedHttpsOrigin(origin);
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    );
    if (!trusted.has(base.value)) {
      fail(
        "ROOM_LINK_ORIGIN_UNTRUSTED",
        "production room link origin is not the configured App Link origin",
      );
    }
  }
  const fragment = `${kind}=${encodeURIComponent(token)}`;
  const result = base.kind === "custom_scheme"
    ? `${base.value}/${encodeURIComponent(roomId)}#${fragment}`
    : `${base.value}/room/${encodeURIComponent(roomId)}#${fragment}`;
  const trustedOrigins = productionEnvironment(input.environment)
    ? input.trustedOrigins
    : (base.kind === "trusted_https" ? [base.value] : []);
  parseStarcraftTmgRoomAccessUrl(result, {
    trustedOrigins,
    environment: input.environment,
  });
  return result;
}
