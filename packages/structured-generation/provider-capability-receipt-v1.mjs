import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { normalizeStarcraftTmgProviderProfileRefV1,
  normalizeStarcraftTmgProviderPathV1,
  normalizeStarcraftTmgProviderModelV1 } from
  "../secure-provider-runtime/provider-egress-contract-v1.mjs";
import { normalizeStarcraftTmgOutputContractRefV1,
  STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION } from
  "./output-contract-registry-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_CAPABILITY_RECEIPT_VERSION =
  "starcraft_tmg_provider_capability_receipt_v1";

const HASH = /^[a-f0-9]{64}$/u;
const INPUT_FIELDS = new Set([
  "providerProfileRef", "endpointPath", "endpointDialect", "model",
  "capability", "schemaSubsetVersion", "outputContractRef",
  "probeInputHash", "probeOutputHash", "probeResult", "usage",
  "usageKnown", "physicalAttempts", "probedAt", "expiresAt",
]);
const RECEIPT_FIELDS = new Set([
  "schemaVersion", ...INPUT_FIELDS, "trainingTruth", "receiptHash",
]);
const CAPABILITIES = new Set([
  "responses_json_schema", "strict_function_schema", "chat_json_object",
  "prompt_only",
]);
const DIALECTS = new Set([
  "deepseek_responses_v1", "openai_chat_completions_v1",
]);
const RESULTS = new Set([
  "accepted_schema_valid", "unsupported", "refused", "incomplete",
  "invalid_schema_output", "transport_failed", "usage_unknown",
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

function oneOf(value, allowed, field) {
  const normalized = String(value || "");
  if (!allowed.has(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function hash(value, field) {
  const normalized = String(value || "").toLowerCase();
  if (!HASH.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function instant(value, field) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new TypeError(`${field} is invalid`);
  }
  return parsed.toISOString();
}

function usage(value, known) {
  if (!known) {
    if (value !== null) throw new TypeError("Unknown capability usage must be null");
    return null;
  }
  exactFields(value, new Set([
    "inputUnits", "outputUnits", "totalUnits", "inputCacheHitUnits",
    "inputCacheMissUnits", "reasoningOutputUnits",
  ]), "Capability usage");
  const integer = (candidate) => Number.isSafeInteger(candidate) && candidate >= 0;
  if (![value.inputUnits, value.outputUnits, value.totalUnits].every(integer)
    || value.totalUnits !== value.inputUnits + value.outputUnits) {
    throw new TypeError("Capability usage is invalid");
  }
  const hasCache = value.inputCacheHitUnits !== undefined
    || value.inputCacheMissUnits !== undefined;
  if (hasCache && (![value.inputCacheHitUnits,
    value.inputCacheMissUnits].every(integer)
    || value.inputCacheHitUnits + value.inputCacheMissUnits
      !== value.inputUnits)) throw new TypeError("Capability cache usage is invalid");
  if (value.reasoningOutputUnits !== undefined
    && (!integer(value.reasoningOutputUnits)
      || value.reasoningOutputUnits > value.outputUnits)) {
    throw new TypeError("Capability reasoning usage is invalid");
  }
  return clone(value);
}

export function createStarcraftTmgProviderCapabilityReceiptV1(input = {}) {
  exactFields(input, INPUT_FIELDS, "Provider capability receipt input");
  const probedAt = instant(input.probedAt, "probedAt");
  const expiresAt = instant(input.expiresAt, "expiresAt");
  const duration = Date.parse(expiresAt) - Date.parse(probedAt);
  if (duration <= 0 || duration > 7 * 24 * 60 * 60 * 1_000) {
    throw new TypeError("Capability receipt expiry is invalid");
  }
  const usageKnown = input.usageKnown === true;
  if (typeof input.usageKnown !== "boolean") {
    throw new TypeError("Capability usageKnown is invalid");
  }
  const physicalAttempts = Number(input.physicalAttempts);
  if (!Number.isSafeInteger(physicalAttempts) || physicalAttempts < 0
    || physicalAttempts > 1) throw new TypeError("physicalAttempts is invalid");
  const probeResult = oneOf(input.probeResult, RESULTS, "probeResult");
  if (probeResult === "accepted_schema_valid" && (!usageKnown
    || physicalAttempts !== 1)) {
    throw new TypeError("Supported capability must have known one-attempt usage");
  }
  const capability = oneOf(input.capability, CAPABILITIES, "capability");
  const endpointDialect = oneOf(
    input.endpointDialect, DIALECTS, "endpointDialect");
  if (capability === "responses_json_schema"
    && endpointDialect !== "deepseek_responses_v1") {
    throw new TypeError("Capability and endpoint dialect do not match");
  }
  const body = {
    schemaVersion: STARCRAFT_TMG_PROVIDER_CAPABILITY_RECEIPT_VERSION,
    providerProfileRef: normalizeStarcraftTmgProviderProfileRefV1(
      input.providerProfileRef),
    endpointPath: normalizeStarcraftTmgProviderPathV1(input.endpointPath),
    endpointDialect,
    model: normalizeStarcraftTmgProviderModelV1(input.model),
    capability,
    schemaSubsetVersion: String(input.schemaSubsetVersion || ""),
    outputContractRef: normalizeStarcraftTmgOutputContractRefV1(
      input.outputContractRef),
    probeInputHash: hash(input.probeInputHash, "probeInputHash"),
    probeOutputHash: hash(input.probeOutputHash, "probeOutputHash"),
    probeResult,
    usage: usage(input.usage, usageKnown),
    usageKnown,
    physicalAttempts,
    probedAt,
    expiresAt,
    trainingTruth: false,
  };
  if (body.schemaSubsetVersion !== STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION) {
    throw new TypeError("Capability schema subset is unsupported");
  }
  return freeze({ ...body, receiptHash: hashStarcraftTmgContract(body) });
}

export function assertStarcraftTmgProviderCapabilityReceiptV1(value) {
  exactFields(value, RECEIPT_FIELDS, "Provider capability receipt");
  const { receiptHash, schemaVersion, trainingTruth, ...input } = clone(value);
  if (schemaVersion !== STARCRAFT_TMG_PROVIDER_CAPABILITY_RECEIPT_VERSION
    || trainingTruth !== false) {
    throw new TypeError("Provider capability receipt version is invalid");
  }
  const rebuilt = createStarcraftTmgProviderCapabilityReceiptV1(input);
  if (rebuilt.receiptHash !== hash(receiptHash, "receiptHash")) {
    throw new TypeError("Provider capability receipt integrity is invalid");
  }
  return rebuilt;
}

export function verifyStarcraftTmgProviderCapabilityCurrentV1(input = {}) {
  exactFields(input, new Set([
    "receipt", "providerProfileRef", "endpointPath", "endpointDialect",
    "model", "capability", "outputContractRef", "now",
  ]), "Provider capability current input");
  const receipt = assertStarcraftTmgProviderCapabilityReceiptV1(input.receipt);
  const expected = {
    providerProfileRef: normalizeStarcraftTmgProviderProfileRefV1(
      input.providerProfileRef),
    endpointPath: normalizeStarcraftTmgProviderPathV1(input.endpointPath),
    endpointDialect: oneOf(input.endpointDialect, DIALECTS, "endpointDialect"),
    model: normalizeStarcraftTmgProviderModelV1(input.model),
    capability: oneOf(input.capability, CAPABILITIES, "capability"),
    outputContractRef: normalizeStarcraftTmgOutputContractRefV1(
      input.outputContractRef),
  };
  const now = instant(input.now, "now");
  const equal = (left, right) => hashStarcraftTmgContract(left)
    === hashStarcraftTmgContract(right);
  const reasons = [];
  if (receipt.probeResult !== "accepted_schema_valid") {
    reasons.push("capability_not_supported");
  }
  if (Date.parse(now) >= Date.parse(receipt.expiresAt)) {
    reasons.push("capability_receipt_expired");
  }
  for (const field of Object.keys(expected)) {
    if (!equal(receipt[field], expected[field])) reasons.push(`${field}_drift`);
  }
  return freeze({ ok: reasons.length === 0, reasons,
    capabilityReceiptHash: receipt.receiptHash,
    outputContractRef: clone(receipt.outputContractRef), trainingTruth: false });
}
