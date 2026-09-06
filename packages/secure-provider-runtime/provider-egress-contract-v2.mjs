import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  normalizeStarcraftTmgProviderHostnameV1,
  normalizeStarcraftTmgProviderIdV1,
  normalizeStarcraftTmgProviderModelV1,
  normalizeStarcraftTmgProviderPathV1,
  normalizeStarcraftTmgProviderProfileRefV1,
} from "./provider-egress-contract-v1.mjs";
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION } from
  "../structured-generation/output-contract-registry-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_V2_VERSION =
  "starcraft_tmg_provider_egress_policy_v2";

const INPUT_FIELDS = new Set([
  "providerProfileRef", "providerId", "endpoint", "model", "temperature",
  "topP", "maxContextUnits", "maxOutputUnits", "timeoutMs",
  "endpointDialect", "structuredOutputCapabilities", "schemaSubsetVersion",
]);
const POLICY_FIELDS = new Set([
  "schemaVersion", ...INPUT_FIELDS, "maxOutputField", "dnsPolicy",
  "tlsCertificateVerificationDisabled", "redirectsAllowed", "proxyAllowed",
  "customAuthorizationHeadersAllowed", "physicalAttempts",
  "automaticRetryAllowed", "onlineDshAllowed", "trainingTruth", "policyHash",
]);
const ENDPOINT_FIELDS = new Set(["protocol", "hostname", "port", "path"]);
const CAPABILITIES = new Set(["responses_json_schema", "strict_function_schema"]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
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

function integer(value, field, minimum, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < minimum
    || normalized > maximum) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function number(value, field, minimum, maximum) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < minimum
    || normalized > maximum) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function normalizeInput(input) {
  exactFields(input, INPUT_FIELDS, "Provider egress v2 input");
  exactFields(input.endpoint, ENDPOINT_FIELDS, "Provider egress v2 endpoint");
  const capabilities = Array.isArray(input.structuredOutputCapabilities)
    ? [...input.structuredOutputCapabilities] : [];
  if (!capabilities.length || capabilities.length > CAPABILITIES.size
    || new Set(capabilities).size !== capabilities.length
    || capabilities.some((capability) => !CAPABILITIES.has(capability))) {
    throw new TypeError("structuredOutputCapabilities are invalid");
  }
  const endpointDialect = String(input.endpointDialect || "");
  if (endpointDialect !== "deepseek_responses_v1"
    || !capabilities.includes("responses_json_schema")) {
    throw new TypeError("Provider endpoint dialect lacks JSON Schema capability");
  }
  const providerId = normalizeStarcraftTmgProviderIdV1(input.providerId);
  if (/(?:^|[-_])dsh(?:$|[-_])|deepseek.*harness|harness.*deepseek/iu
    .test(providerId)) throw new TypeError("Online DSH egress is forbidden");
  const model = normalizeStarcraftTmgProviderModelV1(input.model);
  if (model === "administrator_must_select") {
    throw new TypeError("Provider egress model is not configured");
  }
  const endpoint = {
    protocol: input.endpoint.protocol,
    hostname: normalizeStarcraftTmgProviderHostnameV1(input.endpoint.hostname),
    port: integer(input.endpoint.port, "endpoint.port", 1, 65_535),
    path: normalizeStarcraftTmgProviderPathV1(input.endpoint.path),
  };
  if (endpoint.protocol !== "https:") {
    throw new TypeError("Provider endpoint must use HTTPS");
  }
  const schemaSubsetVersion = String(input.schemaSubsetVersion || "");
  if (schemaSubsetVersion !== STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION) {
    throw new TypeError("Provider schema subset is unsupported");
  }
  return {
    providerProfileRef: normalizeStarcraftTmgProviderProfileRefV1(
      input.providerProfileRef),
    providerId,
    endpoint,
    model,
    temperature: number(input.temperature, "temperature", 0, 2),
    topP: number(input.topP, "topP", 0, 1),
    maxContextUnits: integer(
      input.maxContextUnits, "maxContextUnits", 1, 2_000_000),
    maxOutputUnits: integer(
      input.maxOutputUnits, "maxOutputUnits", 1, 1_000_000),
    timeoutMs: integer(input.timeoutMs, "timeoutMs", 1, 300_000),
    endpointDialect,
    structuredOutputCapabilities: capabilities.sort(),
    schemaSubsetVersion,
  };
}

export function createStarcraftTmgProviderEgressBindingV2(input = {}) {
  const normalized = normalizeInput(input);
  const body = {
    schemaVersion: STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_V2_VERSION,
    ...normalized,
    maxOutputField: "max_output_tokens",
    dnsPolicy: "all_answers_must_be_globally_routable_then_pin_one_answer",
    tlsCertificateVerificationDisabled: false,
    redirectsAllowed: false,
    proxyAllowed: false,
    customAuthorizationHeadersAllowed: false,
    physicalAttempts: 1,
    automaticRetryAllowed: false,
    onlineDshAllowed: false,
    trainingTruth: false,
  };
  return freeze({ ...body, policyHash: hashStarcraftTmgContract(body) });
}

export function assertStarcraftTmgProviderEgressBindingV2(value) {
  exactFields(value, POLICY_FIELDS, "Provider egress v2 binding");
  const { policyHash, schemaVersion, maxOutputField, dnsPolicy,
    tlsCertificateVerificationDisabled, redirectsAllowed, proxyAllowed,
    customAuthorizationHeadersAllowed, physicalAttempts,
    automaticRetryAllowed, onlineDshAllowed, trainingTruth, ...input } = clone(value);
  if (schemaVersion !== STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_V2_VERSION
    || maxOutputField !== "max_output_tokens"
    || dnsPolicy !== "all_answers_must_be_globally_routable_then_pin_one_answer"
    || tlsCertificateVerificationDisabled !== false
    || redirectsAllowed !== false || proxyAllowed !== false
    || customAuthorizationHeadersAllowed !== false || physicalAttempts !== 1
    || automaticRetryAllowed !== false || onlineDshAllowed !== false
    || trainingTruth !== false) {
    throw new TypeError("Provider egress v2 security policy is invalid");
  }
  const rebuilt = createStarcraftTmgProviderEgressBindingV2(input);
  if (rebuilt.policyHash !== String(policyHash || "")) {
    throw new TypeError("Provider egress v2 policy integrity is invalid");
  }
  return rebuilt;
}
