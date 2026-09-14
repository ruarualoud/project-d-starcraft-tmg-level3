import {
  readStarcraftTmgDeepSeekCredentialFromKeychainV1,
} from "./keychain-credential-ingress-v1.mjs";

export const STARCRAFT_TMG_DEEPSEEK_MODEL_AVAILABILITY_PORT_VERSION =
  "starcraft_tmg_deepseek_model_availability_port_v1";

const OFFICIAL_BASE_URL = "https://api.deepseek.com";
const PROVIDER_ID = "deepseek-openai-compatible-direct";
const MODEL = /^[A-Za-z0-9._:/-]{1,240}$/u;

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function reason(error) {
  const value = String(error?.code || error?.message || "MODEL_AVAILABILITY_FAILED");
  return /^[A-Z0-9_:-]{1,240}$/u.test(value)
    ? value : "MODEL_AVAILABILITY_FAILED";
}

function validateRequest(input) {
  const model = String(input?.model || "").trim();
  if (input?.providerId !== PROVIDER_ID || !MODEL.test(model)
    || input?.paidGenerationAllowed !== false) {
    throw Object.assign(new TypeError("model availability request is invalid"), {
      code: "MODEL_AVAILABILITY_REQUEST_INVALID",
    });
  }
  return model;
}

function ids(payload) {
  if (!Array.isArray(payload?.data)) {
    throw Object.assign(new TypeError("model list payload is invalid"), {
      code: "MODEL_LIST_PAYLOAD_INVALID",
    });
  }
  const result = payload.data.map((entry) => String(entry?.id || "").trim())
    .filter((entry) => MODEL.test(entry));
  if (!result.length || new Set(result).size !== result.length) {
    throw Object.assign(new TypeError("model list payload is invalid"), {
      code: "MODEL_LIST_PAYLOAD_INVALID",
    });
  }
  return result.sort((left, right) => left.localeCompare(right));
}

export function createStarcraftTmgDeepSeekModelAvailabilityPortV1(options = {}) {
  const request = options.fetch || globalThis.fetch;
  const credentialIngress = options.credentialIngress
    || (() => readStarcraftTmgDeepSeekCredentialFromKeychainV1());
  const timeoutMs = Number(options.timeoutMs || 30_000);
  if (typeof request !== "function" || typeof credentialIngress !== "function"
    || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new TypeError("model availability port options are invalid");
  }

  async function check(input = {}) {
    let credentialBytes = null;
    let requestStarted = false;
    const model = validateRequest(input);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const ingress = await credentialIngress();
      credentialBytes = ingress?.credentialBytes;
      if (!Buffer.isBuffer(credentialBytes) || credentialBytes.length < 8) {
        throw Object.assign(new TypeError("credential ingress is invalid"), {
          code: "MODEL_AVAILABILITY_CREDENTIAL_INVALID",
        });
      }
      requestStarted = true;
      const response = await request(`${OFFICIAL_BASE_URL}/models`, {
        method: "GET",
        redirect: "error",
        signal: controller.signal,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${credentialBytes.toString("utf8")}`,
        },
      });
      if (!response || !Number.isSafeInteger(response.status)) {
        throw Object.assign(new TypeError("model list response is invalid"), {
          code: "MODEL_LIST_RESPONSE_INVALID",
        });
      }
      if (!response.ok) {
        return freeze({
          ok: false,
          available: false,
          reason: `DEEPSEEK_MODELS_HTTP_${response.status}`,
          providerId: PROVIDER_ID,
          requestedModel: model,
          httpStatus: response.status,
          endpoint: `${OFFICIAL_BASE_URL}/models`,
          requestMethod: "GET",
          paidGenerationAllowed: false,
          providerRequests: 1,
          paidProviderCalls: 0,
          inputUnits: 0,
          outputUnits: 0,
          estimatedCostCnyMicros: 0,
          trainingTruth: false,
        });
      }
      const body = Buffer.from(await response.arrayBuffer());
      try {
        if (body.length > 262_144) {
          throw Object.assign(new TypeError("model list response is too large"), {
            code: "MODEL_LIST_RESPONSE_TOO_LARGE",
          });
        }
        const modelIds = ids(JSON.parse(body.toString("utf8")));
        return freeze({
          ok: true,
          available: modelIds.includes(model),
          reason: modelIds.includes(model) ? null : "REQUESTED_MODEL_NOT_LISTED",
          providerId: PROVIDER_ID,
          requestedModel: model,
          observedModelIds: modelIds,
          httpStatus: response.status,
          endpoint: `${OFFICIAL_BASE_URL}/models`,
          requestMethod: "GET",
          paidGenerationAllowed: false,
          providerRequests: 1,
          paidProviderCalls: 0,
          inputUnits: 0,
          outputUnits: 0,
          estimatedCostCnyMicros: 0,
          credentialPersisted: false,
          rawResponsePersisted: false,
          trainingTruth: false,
        });
      } finally {
        body.fill(0);
      }
    } catch (error) {
      return freeze({
        ok: false,
        available: false,
        reason: error?.name === "AbortError"
          ? "MODEL_AVAILABILITY_TIMEOUT" : reason(error),
        providerId: PROVIDER_ID,
        requestedModel: model,
        endpoint: `${OFFICIAL_BASE_URL}/models`,
        requestMethod: "GET",
        paidGenerationAllowed: false,
        providerRequests: requestStarted ? 1 : 0,
        paidProviderCalls: 0,
        inputUnits: 0,
        outputUnits: 0,
        estimatedCostCnyMicros: 0,
        trainingTruth: false,
      });
    } finally {
      clearTimeout(timer);
      credentialBytes?.fill(0);
    }
  }

  return freeze({
    check,
    descriptor: freeze({
      version: STARCRAFT_TMG_DEEPSEEK_MODEL_AVAILABILITY_PORT_VERSION,
      providerId: PROVIDER_ID,
      endpoint: `${OFFICIAL_BASE_URL}/models`,
      requestMethod: "GET",
      paidGenerationAllowed: false,
      credentialPersistence: "none",
      trainingTruth: false,
    }),
  });
}
