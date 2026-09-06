import { hashStarcraftTmgContract } from
  "../../authoritative-engine/referee-crypto-v1.mjs";
import { assertStarcraftTmgProviderEgressBindingV2 } from
  "../../secure-provider-runtime/provider-egress-contract-v2.mjs";
import { normalizeProviderJsonDocumentV1 } from
  "../../secure-provider-runtime/provider-response-outcome-v1.mjs";
import {
  assertStarcraftTmgOutputContractV1,
  normalizeStarcraftTmgOutputContractRefV1,
  outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1,
} from "../output-contract-registry-v1.mjs";
import {
  createStarcraftTmgProviderCapabilityReceiptV1,
  verifyStarcraftTmgProviderCapabilityCurrentV1,
} from "../provider-capability-receipt-v1.mjs";

export const STARCRAFT_TMG_DEEPSEEK_RESPONSES_JSON_SCHEMA_ADAPTER_VERSION =
  "starcraft_tmg_deepseek_responses_json_schema_adapter_v1";
export const STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION =
  "starcraft_tmg_structured_provider_request_v1";

const HASH = /^[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9._:-]{1,200}$/u;
const REQUEST_ID = /^[A-Za-z0-9._:-]{8,200}$/u;
const REQUEST_FIELDS = new Set([
  "schemaVersion", "requestId", "roleRef", "instructions", "input",
  "outputContractRef", "maxOutputUnits",
]);
const ROLE_REF_FIELDS = new Set(["id", "version", "hash"]);
const COMPLETE_FIELDS = new Set([
  "egressBinding", "capabilityReceipt", "outputContract", "providerRequest",
  "signal",
]);
const PROBE_FIELDS = new Set([
  "egressBinding", "outputContract", "providerRequest", "expiresAt", "signal",
]);
const SEND_RESULT_FIELDS = new Set([
  "delivery", "status", "payload", "physicalAttempts", "transportReceipt",
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function exactFields(value, allowed, label) {
  if (!object(value) || Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError(`${label} contains invalid fields`);
  }
}

function safeId(value, field, pattern = ID) {
  const normalized = String(value || "");
  if (!pattern.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function safeHash(value, field) {
  const normalized = String(value || "").toLowerCase();
  if (!HASH.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function requiredText(value, field, maximum) {
  const normalized = String(value || "");
  if (!normalized.trim() || normalized.length > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

function roleRef(value) {
  exactFields(value, ROLE_REF_FIELDS, "roleRef");
  return freeze({ id: safeId(value.id, "roleRef.id"),
    version: safeId(value.version, "roleRef.version"),
    hash: safeHash(value.hash, "roleRef.hash") });
}

function positiveInteger(value, field, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1
    || normalized > maximum) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function usage(value) {
  const integer = (candidate) => Number.isSafeInteger(candidate) && candidate >= 0;
  const inputUnits = value?.input_tokens;
  const outputUnits = value?.output_tokens;
  const totalUnits = value?.total_tokens;
  if (![inputUnits, outputUnits, totalUnits].every(integer)
    || totalUnits !== inputUnits + outputUnits) return null;
  const cached = value?.input_tokens_details?.cached_tokens;
  const reasoning = value?.output_tokens_details?.reasoning_tokens;
  const result = { inputUnits, outputUnits, totalUnits };
  if (integer(cached) && cached <= inputUnits) {
    result.inputCacheHitUnits = cached;
    result.inputCacheMissUnits = inputUnits - cached;
  }
  if (integer(reasoning) && reasoning <= outputUnits) {
    result.reasoningOutputUnits = reasoning;
  }
  return freeze(result);
}

function normalizeRequest(value, binding, contractRef, maximumInputBytes) {
  exactFields(value, REQUEST_FIELDS, "Structured Provider request");
  if (value.schemaVersion !== STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION) {
    throw new TypeError("Structured Provider request version is invalid");
  }
  const requestContractRef = normalizeStarcraftTmgOutputContractRefV1(
    value.outputContractRef);
  if (hashStarcraftTmgContract(requestContractRef)
    !== hashStarcraftTmgContract(contractRef)) {
    const error = new Error("CONTRACT_CHAIN_DRIFT");
    error.code = "CONTRACT_CHAIN_DRIFT";
    throw error;
  }
  const result = {
    schemaVersion: value.schemaVersion,
    requestId: safeId(value.requestId, "requestId", REQUEST_ID),
    roleRef: roleRef(value.roleRef),
    instructions: requiredText(value.instructions, "instructions", 64 * 1024),
    input: requiredText(value.input, "input", maximumInputBytes),
    outputContractRef: requestContractRef,
    maxOutputUnits: positiveInteger(value.maxOutputUnits,
      "maxOutputUnits", binding.maxOutputUnits),
  };
  if (Buffer.byteLength(JSON.stringify(result), "utf8") > maximumInputBytes) {
    const error = new Error("STRUCTURED_PROVIDER_REQUEST_TOO_LARGE");
    error.code = "STRUCTURED_PROVIDER_REQUEST_TOO_LARGE";
    throw error;
  }
  return freeze(result);
}

function requestBody(binding, contract, request) {
  return freeze({
    model: binding.model,
    instructions: request.instructions,
    input: request.input,
    reasoning: { effort: "none" },
    temperature: binding.temperature,
    top_p: binding.topP,
    max_output_tokens: request.maxOutputUnits,
    stream: false,
    text: {
      format: {
        type: "json_schema",
        name: contract.schemaName,
        schema: clone(contract.providerSchema),
      },
    },
  });
}

function outputText(payload) {
  if (!Array.isArray(payload?.output)) return { text: null, refusal: false };
  const messages = payload.output.filter((item) => item?.type === "message");
  if (messages.length !== 1 || messages[0].status !== "completed"
    || messages[0].role !== "assistant"
    || !Array.isArray(messages[0].content)) return { text: null, refusal: false };
  const refusals = messages[0].content.filter((part) => part?.type === "refusal");
  const texts = messages[0].content.filter((part) =>
    part?.type === "output_text" && typeof part.text === "string");
  return { text: texts.length === 1 && messages[0].content.length === 1
    ? texts[0].text : null, refusal: refusals.length > 0 };
}

function errorDetails(error, outputContractRef) {
  const safe = object(error?.safeReceipt) ? error.safeReceipt : {};
  const definitelyNotSent = safe.requestDefinitelyNotSent === true;
  return {
    requestDefinitelyNotSent: definitelyNotSent,
    requestMayHaveBeenSent: safe.requestMayHaveBeenSent === true
      || !definitelyNotSent && safe.requestMayHaveBeenSent !== false,
    status: Number.isInteger(safe.status) ? safe.status : null,
    physicalAttempts: Number.isInteger(safe.physicalAttempts)
      ? safe.physicalAttempts : safe.requestDefinitelyNotSent === true ? 0 : 1,
    outputContractRef,
    usage: safe.responseOutcome?.usageKnown ? safe.responseOutcome.usage : null,
    usageKnown: safe.responseOutcome?.usageKnown === true,
    causeCode: String(error?.code || "PROVIDER_TRANSPORT_UNKNOWN").slice(0, 120),
  };
}

export class StarcraftTmgStructuredProviderAdapterError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "StarcraftTmgStructuredProviderAdapterError";
    this.code = code;
    const body = {
      schemaVersion:
        `${STARCRAFT_TMG_DEEPSEEK_RESPONSES_JSON_SCHEMA_ADAPTER_VERSION}.failure`,
      code,
      requestDefinitelyNotSent: details.requestDefinitelyNotSent === true,
      requestMayHaveBeenSent: details.requestMayHaveBeenSent === true,
      status: Number.isInteger(details.status) ? details.status : null,
      physicalAttempts: Number.isInteger(details.physicalAttempts)
        ? details.physicalAttempts : 0,
      outputContractRef: details.outputContractRef
        ? normalizeStarcraftTmgOutputContractRefV1(details.outputContractRef) : null,
      capabilityReceiptHash: details.capabilityReceiptHash
        ? safeHash(details.capabilityReceiptHash, "capabilityReceiptHash") : null,
      usageKnown: details.usageKnown === true,
      usage: details.usageKnown === true ? clone(details.usage) : null,
      causeCode: details.causeCode ? String(details.causeCode).slice(0, 120) : null,
      incompleteReason: details.incompleteReason
        ? String(details.incompleteReason).slice(0, 120) : null,
      payloadHash: details.payloadHash
        ? safeHash(details.payloadHash, "payloadHash") : null,
      outputTextHash: details.outputTextHash
        ? safeHash(details.outputTextHash, "outputTextHash") : null,
      schemaIssues: Array.isArray(details.schemaIssues)
        ? clone(details.schemaIssues).slice(0, 32) : [],
      responseNormalization: details.responseNormalization
        ? String(details.responseNormalization).slice(0, 120) : null,
      responseNormalizationReceiptHash:
        details.responseNormalizationReceiptHash
          ? safeHash(details.responseNormalizationReceiptHash,
            "responseNormalizationReceiptHash") : null,
      automaticRetries: 0,
      trainingTruth: false,
    };
    this.safeReceipt = freeze({ ...body,
      receiptHash: hashStarcraftTmgContract(body) });
  }
}

function normalizeSendResult(value) {
  exactFields(value, SEND_RESULT_FIELDS, "Structured transport result");
  if (value.delivery !== "response_received" || value.physicalAttempts !== 1
    || !Number.isInteger(value.status) || value.status < 100 || value.status > 599
    || !object(value.payload) || !object(value.transportReceipt)) {
    throw new TypeError("Structured transport result is invalid");
  }
  return value;
}

function parseResponse(result, contract, request, capabilityReceiptHash = null) {
  const contractRef = outputContractRefStarcraftTmgV1(contract);
  const payload = result.payload;
  const payloadHash = hashStarcraftTmgContract(payload);
  const providerUsage = usage(payload.usage);
  const base = {
    requestMayHaveBeenSent: true,
    status: result.status,
    physicalAttempts: result.physicalAttempts,
    outputContractRef: contractRef,
    capabilityReceiptHash,
    usageKnown: providerUsage !== null,
    usage: providerUsage,
    payloadHash,
  };
  if (result.transportReceipt?.outputContractRef?.hash !== contractRef.hash
    || result.transportReceipt?.schemaHash
      !== hashStarcraftTmgContract(contract.providerSchema)) {
    throw new StarcraftTmgStructuredProviderAdapterError(
      "CONTRACT_CHAIN_DRIFT", base);
  }
  if (result.status < 200 || result.status >= 300) {
    throw new StarcraftTmgStructuredProviderAdapterError(
      result.status === 402 ? "PROVIDER_PAYMENT_REQUIRED"
        : result.status === 401 || result.status === 403
          ? "PROVIDER_AUTHENTICATION_FAILED"
          : "STRUCTURED_PROVIDER_HTTP_REJECTED", base);
  }
  if (!providerUsage) {
    throw new StarcraftTmgStructuredProviderAdapterError(
      "STRUCTURED_PROVIDER_USAGE_UNKNOWN", base);
  }
  if (payload.status === "incomplete") {
    throw new StarcraftTmgStructuredProviderAdapterError(
      "STRUCTURED_PROVIDER_INCOMPLETE", {
        ...base,
        incompleteReason: payload.incomplete_details?.reason || "unknown",
      });
  }
  if (payload.status === "failed") {
    throw new StarcraftTmgStructuredProviderAdapterError(
      "STRUCTURED_PROVIDER_FAILED", {
        ...base, causeCode: payload.error?.code || "provider_response_failed",
      });
  }
  if (payload.status !== "completed") {
    throw new StarcraftTmgStructuredProviderAdapterError(
      "STRUCTURED_PROVIDER_STATUS_INVALID", base);
  }
  const extracted = outputText(payload);
  if (extracted.refusal) {
    throw new StarcraftTmgStructuredProviderAdapterError(
      "STRUCTURED_PROVIDER_REFUSAL", base);
  }
  if (!extracted.text) {
    throw new StarcraftTmgStructuredProviderAdapterError(
      "STRUCTURED_PROVIDER_OUTPUT_MISSING", base);
  }
  const normalized = normalizeProviderJsonDocumentV1(extracted.text);
  const normalizationBody = {
    version: "structured_provider_lossless_json_normalization_v1",
    kind: normalized.kind,
    changed: normalized.text !== extracted.text,
    originalTextHash: hashStarcraftTmgContract(extracted.text),
    normalizedTextHash: hashStarcraftTmgContract(normalized.text),
    evidenceHash: normalized.evidence
      ? hashStarcraftTmgContract(normalized.evidence) : null,
    visibleScalarContentAcceptedByNormalization: false,
    semanticAcceptanceInherited: false,
    trainingTruth: false,
  };
  const normalizationReceipt = freeze({ ...normalizationBody,
    hash: hashStarcraftTmgContract(normalizationBody) });
  let output;
  try {
    output = JSON.parse(normalized.text);
  } catch {
    throw new StarcraftTmgStructuredProviderAdapterError(
      "STRUCTURED_PROVIDER_SCHEMA_INVALID", {
        ...base, outputTextHash: hashStarcraftTmgContract(extracted.text),
        schemaIssues: [{ path: "$", code: "provider_json_not_parseable" }],
        responseNormalization: normalized.kind,
        responseNormalizationReceiptHash: normalizationReceipt.hash,
      });
  }
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
    contract.providerSchema, output);
  if (!validation.ok) {
    const failure = new StarcraftTmgStructuredProviderAdapterError(
      "STRUCTURED_PROVIDER_SCHEMA_INVALID", {
        ...base, outputTextHash: hashStarcraftTmgContract(extracted.text),
        schemaIssues: validation.issues,
        responseNormalization: normalized.kind,
        responseNormalizationReceiptHash: normalizationReceipt.hash,
      });
    // The parsed schema-invalid value is safe domain data, not a credential or
    // raw transport payload. Keep it transient and non-enumerable so the
    // durable runtime can seal it explicitly while safe receipts remain
    // metadata-only. Callers must never guess it from the response skeleton.
    Object.defineProperties(failure, {
      transientCandidate: { value: clone(output), enumerable: false },
      transientValidation: { value: clone(validation), enumerable: false },
    });
    throw failure;
  }
  const receiptBody = {
    schemaVersion:
      `${STARCRAFT_TMG_DEEPSEEK_RESPONSES_JSON_SCHEMA_ADAPTER_VERSION}.success`,
    requestId: request.requestId,
    roleRef: clone(request.roleRef),
    outputContractRef: contractRef,
    capabilityReceiptHash,
    providerResponseIdHash: typeof payload.id === "string"
      ? hashStarcraftTmgContract(payload.id) : null,
    requestedModel: result.transportReceipt.requestedModel || null,
    reportedModel: typeof payload.model === "string" ? payload.model : null,
    endpointDialect: "deepseek_responses_v1",
    startedAt: result.transportReceipt.startedAt,
    requestBodyHash: result.transportReceipt.requestBodyHash,
    transportReceiptHash: result.transportReceipt.receiptHash,
    responseFingerprint: hashStarcraftTmgContract(output),
    localSchemaValidationHash: hashStarcraftTmgContract(validation),
    responseNormalization: normalizationReceipt,
    usage: providerUsage,
    physicalAttempts: 1,
    automaticRetries: 0,
    trainingTruth: false,
  };
  return freeze({
    output: clone(output),
    usageReceipt: { ...receiptBody,
      receiptHash: hashStarcraftTmgContract(receiptBody) },
    localValidationReceipt: {
      schemaVersion: `${STARCRAFT_TMG_DEEPSEEK_RESPONSES_JSON_SCHEMA_ADAPTER_VERSION}.local-validation`,
      outputContractRef: contractRef,
      valueHash: validation.valueHash,
      schemaHash: validation.schemaHash,
      responseNormalizationHash: normalizationReceipt.hash,
      valid: true,
      trainingTruth: false,
    },
  });
}

export function createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1(
  options = {}) {
  const send = options.send;
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const maxInputBytes = positiveInteger(options.maxInputBytes || 2 * 1024 * 1024,
    "maxInputBytes", 8 * 1024 * 1024);
  const maxProbeBytes = positiveInteger(options.maxProbeBytes || 16 * 1024,
    "maxProbeBytes", 64 * 1024);
  const maxProbeOutputUnits = positiveInteger(options.maxProbeOutputUnits || 256,
    "maxProbeOutputUnits", 512);
  if (typeof send !== "function") throw new TypeError("Structured send is required");

  async function invoke({ binding, contract, request, signal,
    capabilityReceiptHash = null, probe = false }) {
    const body = requestBody(binding, contract, request);
    const bodyBytes = Buffer.byteLength(JSON.stringify(body), "utf8");
    if (bodyBytes > (probe ? maxProbeBytes : maxInputBytes)
      || probe && request.maxOutputUnits > maxProbeOutputUnits) {
      throw new StarcraftTmgStructuredProviderAdapterError(
        "STRUCTURED_PROVIDER_REQUEST_TOO_LARGE", {
          requestDefinitelyNotSent: true, physicalAttempts: 0,
          outputContractRef: outputContractRefStarcraftTmgV1(contract),
          capabilityReceiptHash,
        });
    }
    let result;
    try {
      result = normalizeSendResult(await send({
        requestId: request.requestId,
        endpoint: clone(binding.endpoint),
        body: clone(body),
        signal,
        outputContractRef: clone(request.outputContractRef),
      }));
    } catch (error) {
      if (error instanceof StarcraftTmgStructuredProviderAdapterError) throw error;
      const details = errorDetails(error, request.outputContractRef);
      const transportCode = String(error?.code || "");
      const terminalCode = transportCode === "PROVIDER_PAYMENT_REQUIRED"
        || transportCode === "PROVIDER_AUTHENTICATION_FAILED"
        ? transportCode : null;
      throw new StarcraftTmgStructuredProviderAdapterError(
        terminalCode || (details.requestDefinitelyNotSent
          ? "STRUCTURED_PROVIDER_PRE_EGRESS_FAILED"
          : "STRUCTURED_PROVIDER_AMBIGUOUS_SEND"),
        { ...details, capabilityReceiptHash });
    }
    return parseResponse(result, contract, request, capabilityReceiptHash);
  }

  async function complete(input = {}) {
    exactFields(input, COMPLETE_FIELDS, "Structured adapter complete input");
    const binding = assertStarcraftTmgProviderEgressBindingV2(input.egressBinding);
    const contract = assertStarcraftTmgOutputContractV1(input.outputContract);
    const contractRef = outputContractRefStarcraftTmgV1(contract);
    const request = normalizeRequest(
      input.providerRequest, binding, contractRef, maxInputBytes);
    const capability = verifyStarcraftTmgProviderCapabilityCurrentV1({
      receipt: input.capabilityReceipt,
      providerProfileRef: binding.providerProfileRef,
      endpointPath: binding.endpoint.path,
      endpointDialect: binding.endpointDialect,
      model: binding.model,
      capability: "responses_json_schema",
      outputContractRef: contractRef,
      now: now(),
    });
    if (!capability.ok) {
      throw new StarcraftTmgStructuredProviderAdapterError(
        "STRUCTURED_PROVIDER_CAPABILITY_REQUIRED", {
          requestDefinitelyNotSent: true,
          physicalAttempts: 0,
          outputContractRef: contractRef,
          capabilityReceiptHash: capability.capabilityReceiptHash,
          causeCode: capability.reasons.join(","),
        });
    }
    return invoke({ binding, contract, request, signal: input.signal,
      capabilityReceiptHash: capability.capabilityReceiptHash });
  }

  async function probeCapability(input = {}) {
    exactFields(input, PROBE_FIELDS, "Structured adapter probe input");
    const binding = assertStarcraftTmgProviderEgressBindingV2(input.egressBinding);
    const contract = assertStarcraftTmgOutputContractV1(input.outputContract);
    const contractRef = outputContractRefStarcraftTmgV1(contract);
    const request = normalizeRequest(
      input.providerRequest, binding, contractRef, maxProbeBytes);
    let response;
    try {
      response = await invoke({ binding, contract, request,
        signal: input.signal, probe: true });
    } catch (error) {
      if (error.code === "PROVIDER_PAYMENT_REQUIRED") throw error;
      return freeze({ ok: false, errorCode: error.code,
        safeReceipt: clone(error.safeReceipt), trainingTruth: false });
    }
    const probeOutputHash = hashStarcraftTmgContract(response.output);
    const capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({
      providerProfileRef: binding.providerProfileRef,
      endpointPath: binding.endpoint.path,
      endpointDialect: binding.endpointDialect,
      model: binding.model,
      capability: "responses_json_schema",
      schemaSubsetVersion: contract.schemaSubsetVersion,
      outputContractRef: contractRef,
      probeInputHash: response.usageReceipt.requestBodyHash,
      probeOutputHash,
      probeResult: "accepted_schema_valid",
      usage: response.usageReceipt.usage,
      usageKnown: true,
      physicalAttempts: 1,
      probedAt: now(),
      expiresAt: input.expiresAt,
    });
    return freeze({ ok: true, capabilityReceipt,
      probeOutputHash, usage: clone(response.usageReceipt.usage),
      trainingTruth: false });
  }

  function metadata() {
    return freeze({
      schemaVersion:
        `${STARCRAFT_TMG_DEEPSEEK_RESPONSES_JSON_SCHEMA_ADAPTER_VERSION}.metadata`,
      endpointDialect: "deepseek_responses_v1",
      capability: "responses_json_schema",
      localSchemaValidationRequired: true,
      capabilityReceiptRequiredBeforeProduction: true,
      silentFallbackAllowed: false,
      automaticRetryAllowed: false,
      maxInputBytes,
      maxProbeBytes,
      maxProbeOutputUnits,
      trainingTruth: false,
    });
  }

  return Object.freeze({ complete, probeCapability, metadata });
}
