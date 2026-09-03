import {
  containsStarcraftTmgKnownCredentialEchoV1,
  containsStarcraftTmgOnlineCredentialMaterialV1,
} from
  "../online-agent-session/portable-credential-material-v1.mjs";
import {
  STARCRAFT_TMG_PROVIDER_CREDENTIAL_MEDIA_TYPE,
  STARCRAFT_TMG_SECURE_PROVIDER_ATTACHMENT_CONTROL_VERSION,
} from "./credential-attachment-control-v1.mjs";

export const STARCRAFT_TMG_SECURE_PROVIDER_HTTP_VERSION =
  "starcraft_tmg_secure_provider_http_v1";
export const STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX =
  "/starcraft-tmg-level3/provider/api/v1";

const ATTACHMENT_ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/u;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const PREPARE_FIELDS = new Set([
  "roomId",
  "sessionId",
  "expectedConnectionEpoch",
  "providerProfileRef",
  "disclosureNoticeVersion",
  "consentAccepted",
]);
const QUERY_FIELDS = new Set([
  "roomId",
  "sessionId",
  "expectedConnectionEpoch",
]);
const PUBLIC_PROFILE_FIELDS = new Set([
  "profileRef", "providerId", "model", "maxContextUnits",
  "maxOutputUnits", "timeoutMs", "trainingTruth",
]);
const PROFILE_REF_FIELDS = new Set(["id", "version", "hash"]);
const ENDPOINTS = Object.freeze([
  `GET ${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/health`,
  `GET ${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/metadata`,
  `POST ${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/attachments/intents`,
  `PUT ${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/attachments/:attachmentId/secret`,
  `GET ${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/attachments/:attachmentId`,
  `DELETE ${STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX}/attachments/:attachmentId`,
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
  if (normalized.length > maximum) throw new TypeError(`${field} is too long`);
  return normalized;
}

function integer(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
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
      code: "forbidden_provider_http_field",
      forbiddenFields,
    });
  }
}

function headerValue(headers, key) {
  if (headers && typeof headers.get === "function") {
    return String(headers.get(key) || headers.get(key.toLowerCase()) || "");
  }
  const entry = Object.entries(headers || {})
    .find(([name]) => name.toLowerCase() === key.toLowerCase());
  return String(entry?.[1] || "");
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

function loopback(value) {
  const normalized = String(value || "").replace(/^\[|\]$/gu, "");
  return ["127.0.0.1", "::1", "localhost"].includes(normalized);
}

function attachmentId(value) {
  let decoded = "";
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "";
  }
  return ATTACHMENT_ID_PATTERN.test(decoded) ? decoded : "";
}

function statusFor(result) {
  if (result?.ok) return 200;
  if (["authentication_required", "authentication_failed",
    "session_authentication_failed", "principal_not_authenticated",
    "principal_authority_failed", "principal_authority_rejected"]
    .includes(result?.reason)) return 401;
  if (["principal_scope_mismatch", "provider_attachment_binding_mismatch",
    "provider_attachment_scope_mismatch", "seat_scope_mismatch",
    "session_scope_mismatch"].includes(result?.reason)) return 403;
  if (result?.reason === "provider_attachment_not_found") return 404;
  if (result?.reason === "provider_ingress_expired") return 410;
  if (["provider_attachment_already_active", "provider_ingress_already_consumed",
    "provider_attachment_detached_during_ingress", "stale_connection",
    "session_ended", "stale_principal_binding", "stale_room_binding",
    "stale_character_binding", "provider_session_binding_mismatch"]
    .includes(result?.reason)) return 409;
  if (result?.reason === "provider_attachment_capacity_exceeded") return 429;
  if (["credential_worker_attach_failed", "credential_worker_detach_failed",
    "provider_profile_registry_failed"].includes(result?.reason)) return 502;
  return 400;
}

function publicProfiles(registry) {
  if (registry === undefined) return [];
  if (typeof registry?.listPublic !== "function") {
    throw new TypeError("providerProfileRegistry.listPublic is required");
  }
  const result = registry.listPublic();
  if (result?.ok !== true || !Array.isArray(result.profiles)) {
    throw new TypeError("providerProfileRegistry.listPublic failed");
  }
  return result.profiles.map((profile, index) => {
    exactFields(profile, PUBLIC_PROFILE_FIELDS, `public profile ${index}`);
    exactFields(profile.profileRef, PROFILE_REF_FIELDS,
      `public profile ${index}.profileRef`);
    const normalized = {
      profileRef: {
        id: requiredString(profile.profileRef.id, "profileRef.id"),
        version: requiredString(profile.profileRef.version, "profileRef.version", 120),
        hash: String(profile.profileRef.hash || "").toLowerCase(),
      },
      providerId: requiredString(profile.providerId, "providerId", 120),
      model: requiredString(profile.model, "model", 200),
      maxContextUnits: integer(profile.maxContextUnits, "maxContextUnits"),
      maxOutputUnits: integer(profile.maxOutputUnits, "maxOutputUnits"),
      timeoutMs: integer(profile.timeoutMs, "timeoutMs"),
      trainingTruth: false,
    };
    if (!HASH_PATTERN.test(normalized.profileRef.hash)
      || profile.trainingTruth !== false
      || containsStarcraftTmgOnlineCredentialMaterialV1(normalized)) {
      throw new TypeError("public Provider profile is unsafe");
    }
    return deepFreeze(normalized);
  });
}

function publicResult(operation, result) {
  if (!result?.ok) {
    return {
      ok: false,
      reason: /^[a-z][a-z0-9_]{1,80}$/u.test(String(result?.reason || ""))
        ? result.reason : "provider_request_rejected",
      ...(result?.attachment ? { attachment: clone(result.attachment) } : {}),
      ...(Array.isArray(result?.forbiddenFields)
        ? { forbiddenFields: result.forbiddenFields.slice(0, 32) } : {}),
      retryable: false,
      trainingTruth: false,
    };
  }
  if (operation === "prepare") {
    return {
      ok: true,
      attachment: clone(result.attachment),
      consentReceiptHash: result.consentReceipt.receiptHash,
      ingress: clone(result.ingress),
      trainingTruth: false,
    };
  }
  if (operation === "attach") {
    return {
      ok: true,
      attachment: clone(result.attachment),
      operationReceiptHash: result.receipt.receiptHash,
      trainingTruth: false,
    };
  }
  if (operation === "detach") {
    return {
      ok: true,
      attachment: clone(result.attachment),
      operationReceiptHash: result.receipt?.receiptHash || null,
      idempotentReplay: result.idempotentReplay === true,
      detachPending: result.detachPending === true,
      trainingTruth: false,
    };
  }
  return {
    ok: true,
    attachment: clone(result.attachment),
    trainingTruth: false,
  };
}

function response(status, endpoint, result, sensitiveBytes = null) {
  const body = {
    ok: result.ok !== false,
    schemaVersion: STARCRAFT_TMG_SECURE_PROVIDER_HTTP_VERSION,
    endpoint,
    ...(result.ok === false ? { error: result.reason } : {}),
    result: clone(result),
  };
  if (containsStarcraftTmgOnlineCredentialMaterialV1(body)
    || containsStarcraftTmgKnownCredentialEchoV1(body, sensitiveBytes)) {
    return deepFreeze({
      status: 500,
      headers: securityHeaders(),
      response: {
        ok: false,
        schemaVersion: STARCRAFT_TMG_SECURE_PROVIDER_HTTP_VERSION,
        endpoint,
        error: "unsafe_provider_response_projection",
        result: {
          ok: false,
          reason: "unsafe_provider_response_projection",
          retryable: false,
          trainingTruth: false,
        },
      },
    });
  }
  return deepFreeze({
    status,
    headers: securityHeaders(),
    response: body,
  });
}

function securityHeaders() {
  return {
    "cache-control": "private, no-store, max-age=0",
    pragma: "no-cache",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
}

function failure(status, endpoint, reason, details = {}) {
  return response(status, endpoint, {
    ok: false,
    reason,
    ...clone(details),
    trainingTruth: false,
  });
}

export function createStarcraftTmgSecureProviderHttpControlV1(options = {}) {
  const control = options.controlPlane;
  const authenticator = options.principalAuthenticator;
  for (const method of [
    "prepareAttachment",
    "attachCredentialBytes",
    "readAttachment",
    "detachAttachment",
  ]) {
    if (typeof control?.[method] !== "function") {
      throw new TypeError(`controlPlane.${method} is required`);
    }
  }
  if (typeof authenticator?.authenticate !== "function") {
    throw new TypeError("principalAuthenticator.authenticate is required");
  }
  const allowInsecureLoopbackDevelopment =
    options.allowInsecureLoopbackDevelopment === true;
  const maxJsonBodyBytes = integer(options.maxJsonBodyBytes || 16 * 1024,
    "maxJsonBodyBytes");
  const controlMaxCredentialBytes = integer(control.metadata().maxCredentialBytes,
    "controlPlane.metadata.maxCredentialBytes");
  const maxSecretBodyBytes = integer(options.maxSecretBodyBytes
    || controlMaxCredentialBytes, "maxSecretBodyBytes");
  if (maxSecretBodyBytes > controlMaxCredentialBytes) {
    throw new TypeError("maxSecretBodyBytes exceeds control-plane maximum");
  }
  const profiles = deepFreeze(publicProfiles(options.providerProfileRegistry));

  function metadata() {
    return deepFreeze({
      schemaVersion: `${STARCRAFT_TMG_SECURE_PROVIDER_HTTP_VERSION}.metadata`,
      prefix: STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX,
      endpoints: ENDPOINTS,
      authentication: "external_principal_authenticator",
      transportSecurity: "tls_required_loopback_development_is_explicit",
      sensitiveIngress: {
        method: "PUT",
        mediaType: STARCRAFT_TMG_PROVIDER_CREDENTIAL_MEDIA_TYPE,
        bodyRepresentation: "bounded_buffer_never_json_or_text",
        nonceHeader: "x-project-d-provider-ingress-nonce",
        contentEncodingAllowed: false,
        maxBytes: maxSecretBodyBytes,
      },
      maxJsonBodyBytes,
      profiles,
      responseCache: "no_store",
      controlVersion: STARCRAFT_TMG_SECURE_PROVIDER_ATTACHMENT_CONTROL_VERSION,
      liveProviderCallAllowed: false,
      productionReady: false,
      trainingTruth: false,
    });
  }

  function secure(input) {
    if (input.secureTransport === true) return true;
    if (!allowInsecureLoopbackDevelopment) return false;
    const rawHost = headerValue(input.headers, "host");
    const host = rawHost.startsWith("[")
      ? rawHost.slice(1, rawHost.indexOf("]"))
      : rawHost.split(":")[0];
    return input.secureTransport === false
      && loopback(input.remoteAddress) && loopback(host);
  }

  async function authenticate(input) {
    let result;
    try {
      result = await authenticator.authenticate({
        method: String(input.method || "GET").toUpperCase(),
        pathname: String(input.pathname || ""),
        headers: input.headers || {},
      });
    } catch {
      return { rejection: "authentication_failed" };
    }
    if (!object(result) || result.ok !== true) {
      return { rejection: "authentication_required" };
    }
    const scopeHash = String(result.authenticationScopeHash || "").toLowerCase();
    if (!HASH_PATTERN.test(scopeHash)) return { rejection: "authentication_failed" };
    try {
      return {
        context: {
          principalSessionRef: requiredString(result.principalSessionRef,
            "principalSessionRef", 512),
        },
        scopeHash,
      };
    } catch {
      return { rejection: "authentication_failed" };
    }
  }

  function scopedQuery(query) {
    exactFields(query, QUERY_FIELDS, "attachment query");
    return {
      roomId: requiredString(query.roomId, "query.roomId"),
      sessionId: requiredString(query.sessionId, "query.sessionId", 200),
      expectedConnectionEpoch: integer(query.expectedConnectionEpoch,
        "query.expectedConnectionEpoch"),
    };
  }

  async function handle(input = {}) {
    const ownedRawBody = Buffer.isBuffer(input.rawBody) ? input.rawBody : null;
    let endpoint = "unknown";
    try {
      const method = String(input.method || "GET").toUpperCase();
      const pathname = String(input.pathname || "");
      endpoint = pathname.startsWith(STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX)
        ? pathname.slice(STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX.length)
          .replace(/^\/+/, "") || "health"
        : "unknown";
      if (!pathname.startsWith(STARCRAFT_TMG_SECURE_PROVIDER_API_PREFIX)) {
        return failure(404, endpoint, "not_found");
      }
      if (!secure(input)) return failure(426, endpoint, "secure_transport_required");
      if (endpoint === "health" && method === "GET") {
        return response(200, endpoint, { ok: true, healthy: true, ...metadata() });
      }
      if (endpoint === "metadata" && method === "GET") {
        return response(200, endpoint, { ok: true, ...metadata() });
      }
      const auth = await authenticate(input);
      if (auth.rejection) return failure(401, endpoint, auth.rejection);

      if (endpoint === "attachments/intents" && method === "POST") {
        const contentType = headerValue(input.headers, "content-type")
          .split(";", 1)[0].trim().toLowerCase();
        if (contentType !== "application/json"
          || headerValue(input.headers, "content-encoding")) {
          return failure(415, endpoint, "provider_consent_media_type_required");
        }
        if (input.rawBody !== undefined) {
          return failure(400, endpoint, "provider_consent_parsed_body_required");
        }
        const body = input.body;
        if (!object(body)) return failure(400, endpoint, "invalid_request_body");
        const actualBytes = Buffer.byteLength(JSON.stringify(body), "utf8");
        if (input.bodyBytes !== undefined
          && (!Number.isSafeInteger(input.bodyBytes)
            || input.bodyBytes !== actualBytes)) {
          return failure(400, endpoint, "provider_consent_length_mismatch");
        }
        if (actualBytes > maxJsonBodyBytes) {
          return failure(413, endpoint, "payload_too_large",
            { maxBodyBytes: maxJsonBodyBytes });
        }
        if (containsStarcraftTmgOnlineCredentialMaterialV1(body)) {
          return failure(400, endpoint, "sensitive_material_forbidden_in_consent");
        }
        try {
          exactFields(body, PREPARE_FIELDS, "provider consent body");
        } catch (error) {
          return failure(400, endpoint,
            error.code || "invalid_provider_consent_request", {
              forbiddenFields: error.forbiddenFields || [],
            });
        }
        const result = await control.prepareAttachment(body, auth.context);
        return response(statusFor(result), endpoint, publicResult("prepare", result));
      }

      const match = endpoint.match(/^attachments\/([^/]+)(?:\/(secret))?$/u);
      if (!match) return failure(404, endpoint, "not_found");
      const id = attachmentId(match[1]);
      if (!id) return failure(400, endpoint, "invalid_attachment_id");
      let query;
      try {
        query = scopedQuery(queryObject(input.query));
      } catch (error) {
        return failure(400, endpoint,
          error.code || "invalid_provider_attachment_query", {
            forbiddenFields: error.forbiddenFields || [],
          });
      }
      const scoped = { ...query, attachmentId: id };

      if (match[2] === "secret" && method === "PUT") {
        const raw = input.rawBody;
        if (!Buffer.isBuffer(raw)) {
          return failure(400, endpoint, "provider_secret_buffer_required");
        }
        const declaredBytes = Number.isSafeInteger(input.bodyBytes)
          ? input.bodyBytes : raw.length;
        if (declaredBytes !== raw.length || raw.length > maxSecretBodyBytes) {
          return failure(raw.length > maxSecretBodyBytes ? 413 : 400, endpoint,
            raw.length > maxSecretBodyBytes
              ? "payload_too_large" : "provider_secret_length_mismatch",
            { maxBodyBytes: maxSecretBodyBytes });
        }
        if (headerValue(input.headers, "content-type").toLowerCase()
            !== STARCRAFT_TMG_PROVIDER_CREDENTIAL_MEDIA_TYPE
          || headerValue(input.headers, "content-encoding")) {
          return failure(415, endpoint, "provider_secret_media_type_required");
        }
        const ingressNonce = headerValue(input.headers,
          "x-project-d-provider-ingress-nonce");
        const result = await control.attachCredentialBytes({
          ...scoped,
          ingressNonce,
          credentialBytes: raw,
        }, auth.context);
        return response(statusFor(result), endpoint,
          publicResult("attach", result), raw);
      }

      if (match[2] === "secret") return failure(405, endpoint, "method_not_allowed");
      if (input.body !== undefined || input.rawBody !== undefined) {
        return failure(400, endpoint, "request_body_forbidden");
      }
      if (method === "GET") {
        const result = await control.readAttachment(scoped, auth.context);
        return response(statusFor(result), endpoint, publicResult("read", result));
      }
      if (method === "DELETE") {
        const result = await control.detachAttachment(scoped, auth.context);
        return response(statusFor(result), endpoint, publicResult("detach", result));
      }
      return failure(405, endpoint, "method_not_allowed");
    } catch {
      return failure(500, endpoint, "provider_control_failed");
    } finally {
      ownedRawBody?.fill(0);
    }
  }

  return Object.freeze({ handle, metadata });
}
