import {
  assertStarcraftTmgClientSourceLocalizationProjectionV1,
  projectStarcraftTmgClientSourceLocalizationV1,
} from "./source-localization-projection-v1.mjs";

export const STARCRAFT_TMG_SOURCE_PROJECTION_PORT_VERSION =
  "starcraft_tmg_source_projection_port_v1";
export const STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_VERSION =
  "starcraft_tmg_source_projection_http_v1";
export const STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX =
  "/starcraft-tmg-level3/source/client/v1";
export const STARCRAFT_TMG_SOURCE_PROJECTION_MAX_RESPONSE_BYTES = 64 * 1024;

export class StarcraftTmgSourceProjectionError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "StarcraftTmgSourceProjectionError";
    this.code = code;
  }
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function safeBaseUrl(value) {
  const normalized = String(value || "").replace(/\/+$/, "");
  if (!normalized) return "";
  const parsed = new URL(normalized);
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(loopback && parsed.protocol === "http:")) {
    throw new TypeError("source projection transport requires HTTPS except on loopback");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new TypeError("source projection base URL cannot contain credentials or fragments");
  }
  if (parsed.pathname !== "/") {
    throw new TypeError("source projection base URL cannot contain a path");
  }
  return normalized;
}

function utf8Length(value) {
  let bytes = 0;
  for (const character of String(value)) {
    const point = character.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

async function readBoundedResponseText(response) {
  const reader = response.body?.getReader?.();
  if (reader) {
    const decoder = new TextDecoder();
    const chunks = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!(value instanceof Uint8Array)) {
          throw new StarcraftTmgSourceProjectionError(
            "SOURCE_PROJECTION_RESPONSE_INVALID",
          );
        }
        bytes += value.byteLength;
        if (bytes > STARCRAFT_TMG_SOURCE_PROJECTION_MAX_RESPONSE_BYTES) {
          throw new StarcraftTmgSourceProjectionError(
            "SOURCE_PROJECTION_RESPONSE_TOO_LARGE",
          );
        }
        chunks.push(decoder.decode(value, { stream: true }));
      }
      chunks.push(decoder.decode());
      return chunks.join("");
    } catch (error) {
      try {
        await reader.cancel?.();
      } catch {
        // The original bounded-read rejection remains authoritative.
      }
      throw error;
    } finally {
      reader.releaseLock?.();
    }
  }
  const contentLengthHeader = String(
    response.headers?.get?.("content-length") || "",
  ).trim();
  if (!/^\d+$/u.test(contentLengthHeader)) {
    throw new StarcraftTmgSourceProjectionError(
      "SOURCE_PROJECTION_RESPONSE_LENGTH_REQUIRED",
    );
  }
  const serialized = await response.text();
  if (utf8Length(serialized) > STARCRAFT_TMG_SOURCE_PROJECTION_MAX_RESPONSE_BYTES) {
    throw new StarcraftTmgSourceProjectionError(
      "SOURCE_PROJECTION_RESPONSE_TOO_LARGE",
    );
  }
  return serialized;
}

function queryEntries(query) {
  if (query && typeof query.entries === "function") return [...query.entries()];
  return Object.entries(query || {});
}

function headerValue(headers, name) {
  if (headers && typeof headers.get === "function") return headers.get(name) || "";
  const found = Object.entries(headers || {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return String(found?.[1] || "");
}

function response(status, result) {
  return {
    status,
    response: {
      ok: result?.ok !== false,
      schemaVersion: STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_VERSION,
      endpoint: "projection",
      result: clone(result),
    },
  };
}

export function assertStarcraftTmgSourceProjectionPort(port) {
  if (!port || typeof port.read !== "function") {
    throw new TypeError("SourceProjectionPort.read is required");
  }
  return port;
}

export function createInMemoryStarcraftTmgSourceProjectionAdapterV1(options = {}) {
  const runtime = options.runtime;
  if (!runtime || typeof runtime.inspect !== "function") {
    throw new TypeError("official source provenance runtime v3 is required");
  }
  async function read() {
    return projectStarcraftTmgClientSourceLocalizationV1(runtime.inspect());
  }
  return Object.freeze({ read });
}

export function createStarcraftTmgSourceProjectionHttpHandlerV1(options = {}) {
  const sourcePort = options.sourcePort
    || createInMemoryStarcraftTmgSourceProjectionAdapterV1({ runtime: options.runtime });
  assertStarcraftTmgSourceProjectionPort(sourcePort);

  async function handle(input = {}) {
    const method = String(input.method || "GET").toUpperCase();
    const pathname = String(input.pathname || "");
    const exactPath = `${STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX}/projection`;
    if (pathname !== exactPath) return response(404, { ok: false, reason: "NOT_FOUND" });
    if (method !== "GET") return response(405, { ok: false, reason: "METHOD_NOT_ALLOWED" });
    if (queryEntries(input.query).length > 0
      || input.body !== undefined
      || headerValue(input.headers, "authorization")
      || headerValue(input.headers, "cookie")
      || headerValue(input.headers, "x-api-key")) {
      return response(400, {
        ok: false,
        reason: "SOURCE_PROJECTION_METADATA_ONLY_REQUEST_REQUIRED",
      });
    }
    try {
      const projection = assertStarcraftTmgClientSourceLocalizationProjectionV1(
        await sourcePort.read(),
      );
      return response(200, { ok: true, projection });
    } catch {
      return response(503, { ok: false, reason: "SOURCE_PROJECTION_UNAVAILABLE" });
    }
  }
  return Object.freeze({ handle });
}

export function createHttpStarcraftTmgSourceProjectionAdapterV1(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl is required");
  const baseUrl = safeBaseUrl(options.baseUrl);
  const timeoutMs = Math.max(250, Number(options.timeoutMs || 15_000));
  async function read() {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const result = await fetchImpl(
        `${baseUrl}${STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_PREFIX}/projection`,
        {
          method: "GET",
          headers: { accept: "application/json" },
          credentials: "omit",
          redirect: "error",
          referrerPolicy: "no-referrer",
          cache: "no-store",
          ...(controller ? { signal: controller.signal } : {}),
        },
      );
      const contentLength = Number(result.headers?.get?.("content-length") || 0);
      if (Number.isFinite(contentLength)
        && contentLength > STARCRAFT_TMG_SOURCE_PROJECTION_MAX_RESPONSE_BYTES) {
        throw new StarcraftTmgSourceProjectionError("SOURCE_PROJECTION_RESPONSE_TOO_LARGE");
      }
      const contentType = String(result.headers?.get?.("content-type") || "");
      if (contentType && !contentType.toLowerCase().includes("application/json")) {
        throw new StarcraftTmgSourceProjectionError("SOURCE_PROJECTION_RESPONSE_TYPE_INVALID");
      }
      const serialized = await readBoundedResponseText(result);
      let body;
      try {
        body = JSON.parse(serialized);
      } catch {
        throw new StarcraftTmgSourceProjectionError("SOURCE_PROJECTION_RESPONSE_INVALID");
      }
      if (!result.ok
        || body?.schemaVersion !== STARCRAFT_TMG_SOURCE_PROJECTION_HTTP_VERSION
        || body?.result?.ok !== true) {
        throw new StarcraftTmgSourceProjectionError(
          body?.result?.reason || "SOURCE_PROJECTION_UNAVAILABLE",
        );
      }
      return assertStarcraftTmgClientSourceLocalizationProjectionV1(
        body.result.projection,
      );
    } catch (error) {
      if (error instanceof StarcraftTmgSourceProjectionError) throw error;
      throw new StarcraftTmgSourceProjectionError(
        error?.name === "AbortError" ? "SOURCE_PROJECTION_TIMEOUT" : "SOURCE_PROJECTION_NETWORK_UNAVAILABLE",
      );
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  return Object.freeze({ read });
}
