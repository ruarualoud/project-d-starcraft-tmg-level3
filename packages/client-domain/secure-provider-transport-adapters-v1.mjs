import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "../online-agent-session/portable-credential-material-v1.mjs";

export const STARCRAFT_TMG_SECURE_PROVIDER_CLIENT_TRANSPORT_VERSION =
  "starcraft_tmg_secure_provider_client_transport_v1";
export const STARCRAFT_TMG_SECURE_PROVIDER_CLIENT_API_PREFIX =
  "/starcraft-tmg-level3/provider/api/v1";

const OPERATIONS = new Set(["metadata", "prepare", "attach", "read", "detach"]);

export class StarcraftTmgSecureProviderClientTransportError extends Error {
  constructor(code) {
    super(code);
    this.name = "StarcraftTmgSecureProviderClientTransportError";
    this.code = code;
  }
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function required(value, field, maximum = 240) {
  const result = String(value || "").trim();
  if (!result || result.length > maximum) {
    throw new StarcraftTmgSecureProviderClientTransportError(
      "PROVIDER_CLIENT_REQUEST_INVALID");
  }
  return result;
}

function safeBaseUrl(value) {
  const baseUrl = String(value || "").replace(/\/+$/u, "");
  if (!baseUrl) return "";
  const parsed = new URL(baseUrl);
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(loopback && parsed.protocol === "http:")) {
    throw new TypeError("secure Provider HTTP requires HTTPS except on loopback");
  }
  return baseUrl;
}

function query(request) {
  return new URLSearchParams({
    roomId: required(request.roomId, "roomId"),
    sessionId: required(request.sessionId, "sessionId", 200),
    expectedConnectionEpoch: String(Number(request.expectedConnectionEpoch)),
  });
}

function endpoint(request) {
  if (request.operation === "metadata") {
    return { method: "GET", path: "metadata" };
  }
  if (request.operation === "prepare") {
    return {
      method: "POST",
      path: "attachments/intents",
      json: {
        roomId: required(request.roomId, "roomId"),
        sessionId: required(request.sessionId, "sessionId", 200),
        expectedConnectionEpoch: Number(request.expectedConnectionEpoch),
        providerProfileRef: request.providerProfileRef,
        disclosureNoticeVersion: required(request.disclosureNoticeVersion,
          "disclosureNoticeVersion", 160),
        consentAccepted: request.consentAccepted === true,
      },
    };
  }
  const attachmentId = encodeURIComponent(required(request.attachmentId,
    "attachmentId", 200));
  const suffix = request.operation === "attach" ? "/secret" : "";
  const search = query(request);
  return {
    method: request.operation === "attach" ? "PUT"
      : request.operation === "detach" ? "DELETE" : "GET",
    path: `attachments/${attachmentId}${suffix}?${search}`,
  };
}

function assertRequest(value) {
  if (!object(value) || !OPERATIONS.has(value.operation)) {
    throw new StarcraftTmgSecureProviderClientTransportError(
      "PROVIDER_CLIENT_REQUEST_INVALID");
  }
  if (value.operation === "attach") {
    if (!(value.credentialBytes instanceof Uint8Array)
      || value.credentialBytes.byteLength < 1) {
      throw new StarcraftTmgSecureProviderClientTransportError(
        "PROVIDER_CLIENT_SECRET_BYTES_REQUIRED");
    }
  } else if (containsStarcraftTmgOnlineCredentialMaterialV1(value)) {
    throw new StarcraftTmgSecureProviderClientTransportError(
      "PROVIDER_CLIENT_SECRET_OUTSIDE_BINARY_INGRESS");
  }
  return value;
}

function utf8Length(value) {
  return new TextEncoder().encode(String(value)).byteLength;
}

export function createHttpStarcraftTmgSecureProviderClientTransportV1(
  options = {},
) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl is required");
  const baseUrl = safeBaseUrl(options.baseUrl);
  const apiPrefix = String(options.apiPrefix
    || STARCRAFT_TMG_SECURE_PROVIDER_CLIENT_API_PREFIX).replace(/\/+$/u, "");
  const timeoutMs = Math.max(250, Number(options.timeoutMs || 15_000));
  const maxResponseBytes = Math.max(1024,
    Number(options.maxResponseBytes || 256 * 1024));
  const maxSecretRequestBytes = Math.max(1,
    Number(options.maxSecretRequestBytes || 65_536));

  async function execute(rawInput = {}) {
    const request = assertRequest(rawInput);
    if (request.operation === "attach"
      && request.credentialBytes.byteLength > maxSecretRequestBytes) {
      request.credentialBytes.fill(0);
      throw new StarcraftTmgSecureProviderClientTransportError(
        "PROVIDER_CLIENT_SECRET_TOO_LARGE");
    }
    const target = endpoint(request);
    const headers = { accept: "application/json" };
    const init = {
      method: target.method,
      headers,
      credentials: "include",
      cache: "no-store",
    };
    let ownedSecret = null;
    if (target.json) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(target.json);
    }
    if (request.operation === "attach") {
      ownedSecret = request.credentialBytes.slice();
      headers["content-type"] = "application/octet-stream";
      headers["x-project-d-provider-ingress-nonce"] = required(
        request.ingressNonce, "ingressNonce", 160);
      init.body = ownedSecret;
    }
    const controller = typeof AbortController === "function"
      ? new AbortController() : null;
    const timeout = controller
      ? setTimeout(() => controller.abort(), timeoutMs) : null;
    if (controller) init.signal = controller.signal;
    try {
      const response = await fetchImpl(`${baseUrl}${apiPrefix}/${target.path}`, init);
      const raw = await response.text();
      if (utf8Length(raw) > maxResponseBytes) {
        throw new StarcraftTmgSecureProviderClientTransportError(
          "PROVIDER_CLIENT_RESPONSE_TOO_LARGE");
      }
      let body;
      try { body = JSON.parse(raw); } catch {
        throw new StarcraftTmgSecureProviderClientTransportError(
          "PROVIDER_CLIENT_RESPONSE_INVALID");
      }
      if (body?.schemaVersion !== "starcraft_tmg_secure_provider_http_v1"
        || !object(body.result)
        || containsStarcraftTmgOnlineCredentialMaterialV1(body)) {
        throw new StarcraftTmgSecureProviderClientTransportError(
          "PROVIDER_CLIENT_RESPONSE_UNSAFE");
      }
      return body.result;
    } catch (error) {
      if (error instanceof StarcraftTmgSecureProviderClientTransportError) throw error;
      throw new StarcraftTmgSecureProviderClientTransportError(
        error?.name === "AbortError"
          ? "PROVIDER_CLIENT_TIMEOUT" : "PROVIDER_CLIENT_NETWORK_UNAVAILABLE");
    } finally {
      if (timeout) clearTimeout(timeout);
      ownedSecret?.fill(0);
      if (request.operation === "attach") request.credentialBytes.fill(0);
    }
  }

  return Object.freeze({ execute });
}

export function assertStarcraftTmgSecureProviderClientTransportPort(port) {
  if (typeof port?.execute !== "function") {
    throw new TypeError("SecureProviderClientTransportPort.execute is required");
  }
  return port;
}
