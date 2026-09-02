export const STARCRAFT_TMG_SOURCE_PROVENANCE_HTTP_V3_VERSION =
  "starcraft_tmg_source_provenance_http_v3";
export const STARCRAFT_TMG_SOURCE_PROVENANCE_API_V3_PREFIX =
  "/starcraft-tmg-level3/source/api/v3";

const ENDPOINTS = Object.freeze([
  "GET /starcraft-tmg-level3/source/api/v3/metadata",
  "GET /starcraft-tmg-level3/source/api/v3/fields/:recordType/:canonicalId",
  "GET /starcraft-tmg-level3/source/api/v3/faq/:version/:entryId",
  "POST /starcraft-tmg-level3/source/api/v3/precedence",
  "POST /starcraft-tmg-level3/source/api/v3/rights",
]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function queryValue(query, key, fallback = undefined) {
  if (query && typeof query.get === "function") return query.get(key) ?? fallback;
  return query?.[key] ?? fallback;
}

function response(status, endpoint, result) {
  return {
    status,
    response: {
      ok: result !== null && result?.ok !== false,
      schemaVersion: STARCRAFT_TMG_SOURCE_PROVENANCE_HTTP_V3_VERSION,
      endpoint,
      result: clone(result),
    },
  };
}

function failure(status, endpoint, reason) {
  return response(status, endpoint, { ok: false, reason });
}

function containsCredentialMaterial(body) {
  if (!body || typeof body !== "object") return false;
  return Object.entries(body).some(([key, value]) => (
    /api[_-]?key|authorization|credential|secret|cookie/i.test(key)
    || containsCredentialMaterial(value)
  ));
}

export function createStarcraftTmgSourceProvenanceHttpAdapterV3(options = {}) {
  const runtime = options.runtime;
  if (!runtime
    || typeof runtime.inspect !== "function"
    || typeof runtime.getFieldEvidence !== "function"
    || typeof runtime.getFaqEntryEvidence !== "function"
    || typeof runtime.resolvePrecedence !== "function"
    || typeof runtime.checkRedistribution !== "function") {
    throw new Error("official source provenance runtime v3 is required");
  }

  async function handle(input = {}) {
    const method = String(input.method || "GET").toUpperCase();
    const pathname = String(input.pathname || "");
    const endpoint = pathname.startsWith(STARCRAFT_TMG_SOURCE_PROVENANCE_API_V3_PREFIX)
      ? pathname.slice(STARCRAFT_TMG_SOURCE_PROVENANCE_API_V3_PREFIX.length)
        .replace(/^\/+/, "") || "metadata"
      : "unknown";
    if (!pathname.startsWith(STARCRAFT_TMG_SOURCE_PROVENANCE_API_V3_PREFIX)) {
      return failure(404, endpoint, "not_found");
    }
    if (containsCredentialMaterial(input.body)) {
      return failure(400, endpoint, "credential_wrong_endpoint");
    }
    if (endpoint === "metadata" && method === "GET") {
      return response(200, endpoint, { ...runtime.inspect(), endpoints: ENDPOINTS });
    }
    const fieldMatch = endpoint.match(/^fields\/([^/]+)\/([^/]+)$/u);
    if (fieldMatch && method === "GET") {
      const fieldPath = queryValue(input.query, "fieldPath");
      if (!fieldPath) return failure(400, endpoint, "invalid_field_reference");
      const result = runtime.getFieldEvidence({
        recordType: decode(fieldMatch[1]),
        canonicalId: decode(fieldMatch[2]),
        fieldPath,
      });
      return result ? response(200, endpoint, result) : failure(404, endpoint, "field_not_found");
    }
    const faqMatch = endpoint.match(/^faq\/(current|historical)\/([^/]+)$/u);
    if (faqMatch && method === "GET") {
      const result = runtime.getFaqEntryEvidence({
        version: faqMatch[1],
        entryId: decode(faqMatch[2]),
      });
      return result ? response(200, endpoint, result) : failure(404, endpoint, "faq_entry_not_found");
    }
    if (endpoint === "precedence" && method === "POST") {
      try {
        return response(200, endpoint, runtime.resolvePrecedence(input.body || {}));
      } catch {
        return failure(400, endpoint, "precedence_request_rejected");
      }
    }
    if (endpoint === "rights" && method === "POST") {
      try {
        return response(200, endpoint, runtime.checkRedistribution(input.body || {}));
      } catch {
        return failure(400, endpoint, "rights_request_rejected");
      }
    }
    return failure(404, endpoint, "not_found");
  }

  return Object.freeze({ handle });
}
