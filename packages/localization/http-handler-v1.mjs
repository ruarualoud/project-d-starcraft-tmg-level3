export const STARCRAFT_TMG_LOCALIZATION_HTTP_VERSION = "starcraft_tmg_localization_http_v1";
export const STARCRAFT_TMG_LOCALIZATION_API_PREFIX = "/starcraft-tmg-level3/source/api/v1";

const ENDPOINTS = Object.freeze([
  "GET /starcraft-tmg-level3/source/api/v1/health",
  "GET /starcraft-tmg-level3/source/api/v1/metadata",
  "GET /starcraft-tmg-level3/source/api/v1/fields/:recordType/:canonicalId",
  "POST /starcraft-tmg-level3/source/api/v1/translations",
  "POST /starcraft-tmg-level3/source/api/v1/translations/:candidateHash/review",
]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function queryValue(query, key, fallback = undefined) {
  if (query && typeof query.get === "function") return query.get(key) ?? fallback;
  return query?.[key] ?? fallback;
}

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function response(status, endpoint, result) {
  return {
    status,
    response: {
      ok: result.ok !== false,
      schemaVersion: STARCRAFT_TMG_LOCALIZATION_HTTP_VERSION,
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
  if (["display_field_not_found", "translation_candidate_not_found"].includes(result.reason)) return 404;
  if (result.reason === "translation_review_forbidden") return 403;
  if (result.reason === "translation_provider_failed") return 502;
  return 400;
}

function containsCredentialMaterial(body) {
  if (!body || typeof body !== "object") return false;
  for (const [key, value] of Object.entries(body)) {
    if (/api[_-]?key|authorization|credential|secret|cookie/i.test(key)) return true;
    if (containsCredentialMaterial(value)) return true;
  }
  return false;
}

export function createStarcraftTmgLocalizationHttpAdapter(options = {}) {
  const runtime = options.runtime;
  if (!runtime || typeof runtime.render !== "function" || typeof runtime.requestMachineTranslation !== "function") {
    throw new Error("source localization runtime is required");
  }

  async function handle(input = {}) {
    const method = String(input.method || "GET").toUpperCase();
    const pathname = String(input.pathname || "");
    const query = input.query || {};
    const body = input.body && typeof input.body === "object" ? input.body : {};
    const endpoint = pathname.startsWith(STARCRAFT_TMG_LOCALIZATION_API_PREFIX)
      ? pathname.slice(STARCRAFT_TMG_LOCALIZATION_API_PREFIX.length).replace(/^\/+/, "") || "health"
      : "unknown";
    if (!pathname.startsWith(STARCRAFT_TMG_LOCALIZATION_API_PREFIX)) return failure(404, endpoint, "not_found");

    if (endpoint === "health" && method === "GET") {
      const inspection = runtime.inspect();
      return response(200, endpoint, {
        ok: true,
        healthy: true,
        providerConfigured: inspection.translation.providerConfigured,
        durability: inspection.durability,
        productionReady: false,
        trainingTruth: false,
      });
    }
    if (endpoint === "metadata" && method === "GET") {
      return response(200, endpoint, {
        ...runtime.inspect(),
        endpoints: ENDPOINTS,
        translationRequestPolicy: "administrator_only_v0",
        humanReviewPolicy: "authenticated_translation_admin_only_v0",
        machineDraftVisibility: "canonical_default_admin_opt_in_only_v0",
      });
    }

    const fieldMatch = endpoint.match(/^fields\/([^/]+)\/([^/]+)$/);
    if (fieldMatch && method === "GET") {
      const recordType = decode(fieldMatch[1]);
      const canonicalId = decode(fieldMatch[2]);
      const fieldPath = queryValue(query, "fieldPath");
      const targetLocale = queryValue(query, "targetLocale", "en");
      if (!recordType || !canonicalId || !fieldPath) return failure(400, endpoint, "invalid_field_reference");
      const allowMachineDraft = input.adminAuthorized === true && queryValue(query, "allowMachineDraft", "false") === "true";
      const result = runtime.render({ recordType, canonicalId, fieldPath, targetLocale, allowMachineDraft });
      return response(statusFor(result), endpoint, result);
    }

    if (endpoint === "translations" && method === "POST") {
      if (containsCredentialMaterial(body)) return failure(400, endpoint, "credential_wrong_endpoint");
      if (input.adminAuthorized !== true) return failure(403, endpoint, "translation_request_forbidden");
      const result = await runtime.requestMachineTranslation({
        recordType: body.recordType,
        canonicalId: body.canonicalId,
        fieldPath: body.fieldPath,
        targetLocale: body.targetLocale,
        providerProfileId: body.providerProfileId,
        createdAt: body.createdAt,
      });
      return response(statusFor(result), endpoint, result);
    }

    const reviewMatch = endpoint.match(/^translations\/([^/]+)\/review$/);
    if (reviewMatch && method === "POST") {
      if (containsCredentialMaterial(body)) return failure(400, endpoint, "credential_wrong_endpoint");
      if (input.adminAuthorized !== true || !input.principal?.id) return failure(403, endpoint, "translation_review_forbidden");
      const result = runtime.review({
        candidateHash: decode(reviewMatch[1]),
        decision: body.decision,
        correctedText: body.correctedText,
        reviewerPrincipal: { id: input.principal.id, role: input.principal.role },
        reviewedAt: body.reviewedAt,
        notes: body.notes,
      });
      return response(statusFor(result), endpoint, result);
    }

    return failure(404, endpoint, "not_found");
  }

  return Object.freeze({ handle });
}
