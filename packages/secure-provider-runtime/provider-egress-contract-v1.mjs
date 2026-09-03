import net from "node:net";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_VERSION =
  "starcraft_tmg_provider_egress_policy_v1";
export const STARCRAFT_TMG_PROVIDER_EGRESS_TRANSPORT_VERSION =
  "starcraft_tmg_provider_egress_transport_v1";

const REF_FIELDS = new Set(["id", "version", "hash"]);
const POLICY_FIELDS = new Set([
  "schemaVersion", "providerProfileRef", "providerId", "endpoint", "model",
  "temperature", "topP", "maxContextUnits", "maxOutputUnits", "timeoutMs",
  "responseFormatMode", "maxOutputField", "dnsPolicy",
  "tlsCertificateVerificationDisabled", "redirectsAllowed", "proxyAllowed",
  "customAuthorizationHeadersAllowed", "physicalAttempts",
  "automaticRetryAllowed", "onlineDshAllowed", "trainingTruth",
]);
const ENDPOINT_FIELDS = new Set(["protocol", "hostname", "port", "path"]);
const HOST_LABEL = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/u;
const SAFE_PATH = /^\/(?:[A-Za-z0-9._~!$&'()*+,;=:@%-]+\/?)*$/u;
const HASH = /^[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9._:-]{1,200}$/u;
const MODEL = /^[A-Za-z0-9._:/-]{1,240}$/u;

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
  if (!object(value)) throw new TypeError(`${label} must be an object`);
  const forbidden = Object.keys(value).filter((key) => !allowed.has(key));
  if (forbidden.length) throw new TypeError(`${label} contains forbidden fields`);
}

function safeId(value, field, pattern = ID) {
  const normalized = String(value || "").trim();
  if (!pattern.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function safeHash(value, field) {
  const normalized = String(value || "").toLowerCase();
  if (!HASH.test(normalized)) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function integer(value, field, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1
    || normalized > maximum) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function boundedNumber(value, field, minimum, maximum) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < minimum || normalized > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

export function normalizeStarcraftTmgProviderProfileRefV1(value) {
  exactFields(value, REF_FIELDS, "providerProfileRef");
  return freeze({
    id: safeId(value.id, "providerProfileRef.id"),
    version: safeId(value.version, "providerProfileRef.version"),
    hash: safeHash(value.hash, "providerProfileRef.hash"),
  });
}

export function normalizeStarcraftTmgProviderHostnameV1(value) {
  const hostname = String(value || "").toLowerCase();
  if (hostname.length < 4 || hostname.length > 253 || hostname.endsWith(".")
    || net.isIP(hostname) !== 0 || hostname === "localhost"
    || hostname.endsWith(".localhost") || !hostname.includes(".")) {
    throw new TypeError("Provider hostname must be an exact DNS name");
  }
  if (hostname.split(".").some((label) => !HOST_LABEL.test(label))) {
    throw new TypeError("Provider hostname is invalid");
  }
  return hostname;
}

export function normalizeStarcraftTmgProviderPathV1(value) {
  const normalized = String(value || "");
  const lower = normalized.toLowerCase();
  if (!SAFE_PATH.test(normalized) || normalized.length > 512
    || normalized.includes("//") || normalized.includes("\\")
    || lower.includes("%2e") || lower.includes("%2f") || lower.includes("%5c")
    || normalized.split("/").some((part) => part === "." || part === "..")) {
    throw new TypeError("Provider path is invalid");
  }
  return normalized;
}

export function normalizeStarcraftTmgProviderIdV1(value, field = "providerId") {
  return safeId(value, field);
}

export function normalizeStarcraftTmgProviderModelV1(value) {
  return safeId(value, "model", MODEL);
}

export function assertStarcraftTmgProviderEgressBindingV1(value) {
  if (!object(value)) throw new TypeError("Provider egress binding is required");
  const { policyHash, ...body } = clone(value);
  exactFields(body, POLICY_FIELDS, "Provider egress policy");
  exactFields(body.endpoint, ENDPOINT_FIELDS, "Provider egress endpoint");
  if (body.schemaVersion !== STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_VERSION
    || safeHash(policyHash, "egress policyHash")
      !== hashStarcraftTmgContract(body)
    || body.endpoint.protocol !== "https:"
    || normalizeStarcraftTmgProviderHostnameV1(body.endpoint.hostname)
      !== body.endpoint.hostname
    || integer(body.endpoint.port, "egress port", 65_535) !== body.endpoint.port
    || normalizeStarcraftTmgProviderPathV1(body.endpoint.path) !== body.endpoint.path
    || body.responseFormatMode !== "json_object"
      && body.responseFormatMode !== "prompt_only"
    || body.maxOutputField !== "max_tokens"
      && body.maxOutputField !== "max_completion_tokens"
    || body.dnsPolicy
      !== "all_answers_must_be_globally_routable_then_pin_one_answer"
    || body.physicalAttempts !== 1 || body.automaticRetryAllowed !== false
    || body.redirectsAllowed !== false || body.proxyAllowed !== false
    || body.customAuthorizationHeadersAllowed !== false
    || body.tlsCertificateVerificationDisabled !== false
    || body.onlineDshAllowed !== false || body.trainingTruth !== false) {
    throw new TypeError("Provider egress binding policy is invalid");
  }
  normalizeStarcraftTmgProviderProfileRefV1(body.providerProfileRef);
  const providerId = normalizeStarcraftTmgProviderIdV1(body.providerId);
  if (/(?:^|[-_])dsh(?:$|[-_])|deepseek.*harness|harness.*deepseek/iu
    .test(providerId)) throw new TypeError("Online DSH egress is forbidden");
  const model = normalizeStarcraftTmgProviderModelV1(body.model);
  if (model === "administrator_must_select") {
    throw new TypeError("Provider egress model is not configured");
  }
  boundedNumber(body.temperature, "temperature", 0, 2);
  boundedNumber(body.topP, "topP", 0, 1);
  integer(body.maxContextUnits, "egress maxContextUnits", 2_000_000);
  integer(body.maxOutputUnits, "egress maxOutputUnits", 1_000_000);
  integer(body.timeoutMs, "egress timeoutMs", 300_000);
  return freeze(clone(value));
}

export class StarcraftTmgProviderEgressError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "StarcraftTmgProviderEgressError";
    this.code = code;
    const receiptBody = {
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_EGRESS_TRANSPORT_VERSION}.failure`,
      code,
      requestDefinitelyNotSent: details.requestDefinitelyNotSent === true,
      requestMayHaveBeenSent: details.requestMayHaveBeenSent === true,
      status: Number.isInteger(details.status) ? details.status : null,
      physicalAttempts: Number.isInteger(details.physicalAttempts)
        ? details.physicalAttempts : 0,
      automaticRetries: 0,
      trainingTruth: false,
    };
    this.safeReceipt = freeze({
      ...receiptBody,
      receiptHash: hashStarcraftTmgContract(receiptBody),
    });
  }
}
