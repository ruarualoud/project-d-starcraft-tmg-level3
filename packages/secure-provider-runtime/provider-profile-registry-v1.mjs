import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { assertStarcraftTmgCharacterContract } from
  "../character-agent/contracts-v1.mjs";
import {
  assertStarcraftTmgProviderEgressBindingV1,
  normalizeStarcraftTmgProviderHostnameV1,
  normalizeStarcraftTmgProviderPathV1,
  normalizeStarcraftTmgProviderProfileRefV1,
  STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_VERSION,
} from "./provider-egress-contract-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_PROFILE_REGISTRY_VERSION =
  "starcraft_tmg_provider_profile_registry_v1";
const ENTRY_FIELDS = new Set(["providerProfile", "completionPath"]);
const RESOLVE_FIELDS = new Set(["profileRef"]);
const SAFE_PATH = /^\/(?:[A-Za-z0-9._~!$&'()*+,;=:@%-]+\/?)*$/u;

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

function positiveInteger(value, field, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1
    || normalized > maximum) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function normalizeRef(value) {
  return normalizeStarcraftTmgProviderProfileRefV1(value);
}

function compileEntry(value, { allowedProviders, allowedPorts }) {
  exactFields(value, ENTRY_FIELDS, "Provider registry entry");
  const profile = assertStarcraftTmgCharacterContract(
    value.providerProfile, "provider-profile");
  if (!allowedProviders.has(profile.provider)) {
    throw new TypeError("Provider is not server allowlisted");
  }
  if (/(?:^|[-_])dsh(?:$|[-_])|deepseek.*harness|harness.*deepseek/iu
    .test(profile.provider)) {
    throw new TypeError("Online DSH is forbidden regardless of server allowlist");
  }
  if (profile.model === "administrator_must_select") {
    throw new TypeError("Provider model is not configured");
  }
  if (profile.retryPolicy.internalRetry !== false
    || profile.retryPolicy.maxAttempts !== 1) {
    throw new TypeError("Provider profile must allow exactly one physical attempt");
  }
  let base;
  try {
    base = new URL(profile.baseUrl);
  } catch {
    throw new TypeError("Provider baseUrl is invalid");
  }
  if (base.protocol !== "https:" || base.username || base.password
    || base.search || base.hash) {
    throw new TypeError("Provider baseUrl must be credential-free HTTPS");
  }
  if (/%2e|%2f|%5c/iu.test(profile.baseUrl)) {
    throw new TypeError("Provider baseUrl contains encoded path control");
  }
  const hostname = normalizeStarcraftTmgProviderHostnameV1(base.hostname);
  const port = positiveInteger(base.port || 443, "Provider port", 65_535);
  if (!allowedPorts.has(port)) throw new TypeError("Provider port is not allowlisted");
  const basePath = normalizeStarcraftTmgProviderPathV1(base.pathname || "/")
    .replace(/\/+$/u, "");
  const completionPath = normalizeStarcraftTmgProviderPathV1(value.completionPath);
  const path = `${basePath}${completionPath}`.replace(/^$/u, "/");
  if (!SAFE_PATH.test(path) || path.includes("//")) {
    throw new TypeError("Compiled Provider path is invalid");
  }
  const profileRef = freeze({
    id: profile.providerProfileId,
    version: profile.version,
    hash: profile.integrity.hash,
  });
  const policyBody = {
    schemaVersion: STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_VERSION,
    providerProfileRef: profileRef,
    providerId: profile.provider,
    endpoint: {
      protocol: "https:",
      hostname,
      port,
      path,
    },
    model: profile.model,
    temperature: profile.temperature,
    topP: profile.topP,
    maxContextUnits: profile.contextBudget,
    maxOutputUnits: profile.outputBudget,
    timeoutMs: profile.timeoutMs,
    responseFormatMode: profile.extensions?.responseFormatMode === "prompt_only"
      ? "prompt_only" : "json_object",
    maxOutputField: profile.extensions?.maxOutputField
      === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens",
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
  const egressBinding = freeze({
    ...policyBody,
    policyHash: hashStarcraftTmgContract(policyBody),
  });
  return freeze({ profile, profileRef, egressBinding });
}

export function createStarcraftTmgProviderProfileRegistryV1(options = {}) {
  const entries = Array.isArray(options.entries) ? options.entries : [];
  const allowedProviders = new Set(options.allowedProviders
    || ["openai-compatible-direct"]);
  const allowedPorts = new Set((options.allowedPorts || [443])
    .map((value) => positiveInteger(value, "allowed port", 65_535)));
  if (!entries.length) throw new TypeError("Provider registry entries are required");
  if (!allowedProviders.size || !allowedPorts.size) {
    throw new TypeError("Provider registry allowlists are required");
  }
  const records = new Map();
  for (const value of entries) {
    const record = compileEntry(value, { allowedProviders, allowedPorts });
    const key = `${record.profileRef.id}@${record.profileRef.version}`;
    if (records.has(key)) throw new TypeError("Provider registry entry is duplicated");
    records.set(key, record);
  }

  function metadata() {
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_PROFILE_REGISTRY_VERSION}.metadata`,
      entryCount: records.size,
      allowedProviders: [...allowedProviders].sort(),
      allowedPorts: [...allowedPorts].sort((a, b) => a - b),
      userSuppliedEndpointAllowed: false,
      userSuppliedModelAllowed: false,
      userSuppliedHeadersAllowed: false,
      onlineDshAllowed: false,
      automaticRetryAllowed: false,
      trainingTruth: false,
    });
  }

  async function resolve(input = {}) {
    exactFields(input, RESOLVE_FIELDS, "Provider registry resolve input");
    const ref = normalizeRef(input.profileRef);
    const record = records.get(`${ref.id}@${ref.version}`);
    if (!record || record.profileRef.hash !== ref.hash) {
      return freeze({ ok: false, reason: "provider_profile_not_found",
        trainingTruth: false });
    }
    return freeze({ ok: true, providerProfile: clone(record.profile) });
  }

  async function resolveEgressBinding(input = {}) {
    exactFields(input, RESOLVE_FIELDS,
      "Provider registry resolveEgressBinding input");
    const ref = normalizeRef(input.profileRef);
    const record = records.get(`${ref.id}@${ref.version}`);
    if (!record || record.profileRef.hash !== ref.hash) {
      return freeze({ ok: false, reason: "provider_profile_not_found",
        trainingTruth: false });
    }
    return freeze({
      ok: true,
      providerProfile: clone(record.profile),
      egressBinding: clone(record.egressBinding),
    });
  }

  function listPublic() {
    return freeze({
      ok: true,
      profiles: [...records.values()].map((record) => ({
        profileRef: clone(record.profileRef),
        providerId: record.profile.provider,
        model: record.profile.model,
        maxContextUnits: record.profile.contextBudget,
        maxOutputUnits: record.profile.outputBudget,
        timeoutMs: record.profile.timeoutMs,
        trainingTruth: false,
      })),
      trainingTruth: false,
    });
  }

  return Object.freeze({ metadata, resolve, resolveEgressBinding, listPublic });
}

export {
  assertStarcraftTmgProviderEgressBindingV1,
  STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_VERSION,
};
