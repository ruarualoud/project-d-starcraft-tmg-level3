import { assertStarcraftTmgCharacterContract } from
  "../character-agent/contracts-v1.mjs";
import {
  createStarcraftTmgProviderEgressBindingV2,
  assertStarcraftTmgProviderEgressBindingV2,
} from "./provider-egress-contract-v2.mjs";
import {
  normalizeStarcraftTmgProviderPathV1,
  normalizeStarcraftTmgProviderProfileRefV1,
} from "./provider-egress-contract-v1.mjs";
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION } from
  "../structured-generation/output-contract-registry-v1.mjs";

export const STARCRAFT_TMG_PROVIDER_PROFILE_REGISTRY_V2_VERSION =
  "starcraft_tmg_provider_profile_registry_v2";

const ENTRY_FIELDS = new Set(["providerProfile", "responsePath"]);

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

function compileEntry(value, allowedProviders) {
  exactFields(value, ENTRY_FIELDS, "Provider registry v2 entry");
  const profile = assertStarcraftTmgCharacterContract(
    value.providerProfile, "provider-profile");
  if (!allowedProviders.has(profile.provider)
    || profile.retryPolicy.internalRetry !== false
    || profile.retryPolicy.maxAttempts !== 1) {
    throw new TypeError("Provider profile is not eligible for v2 egress");
  }
  const base = new URL(profile.baseUrl);
  if (base.protocol !== "https:" || base.username || base.password
    || base.search || base.hash || base.port && base.port !== "443") {
    throw new TypeError("Provider baseUrl is not credential-free HTTPS");
  }
  const responsePath = normalizeStarcraftTmgProviderPathV1(value.responsePath);
  if (responsePath !== "/responses") {
    throw new TypeError("DeepSeek Responses path must be exact");
  }
  const basePath = normalizeStarcraftTmgProviderPathV1(base.pathname || "/")
    .replace(/\/+$/u, "");
  const path = `${basePath}${responsePath}`.replace(/^$/u, "/");
  const profileRef = freeze({
    id: profile.providerProfileId,
    version: profile.version,
    hash: profile.integrity.hash,
  });
  const egressBinding = createStarcraftTmgProviderEgressBindingV2({
    providerProfileRef: profileRef,
    providerId: profile.provider,
    endpoint: { protocol: "https:", hostname: base.hostname.toLowerCase(),
      port: 443, path },
    model: profile.model,
    temperature: profile.temperature,
    topP: profile.topP,
    maxContextUnits: profile.contextBudget,
    maxOutputUnits: profile.outputBudget,
    timeoutMs: profile.timeoutMs,
    endpointDialect: "deepseek_responses_v1",
    structuredOutputCapabilities: ["responses_json_schema"],
    schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
  });
  return freeze({ profile: clone(profile), profileRef, egressBinding });
}

export function createStarcraftTmgProviderProfileRegistryV2(options = {}) {
  const entries = Array.isArray(options.entries) ? options.entries : [];
  const allowedProviders = new Set(options.allowedProviders
    || ["deepseek-openai-compatible-direct"]);
  if (!entries.length || !allowedProviders.size) {
    throw new TypeError("Provider registry v2 entries and allowlist are required");
  }
  const records = new Map();
  for (const entry of entries) {
    const record = compileEntry(entry, allowedProviders);
    const key = `${record.profileRef.id}@${record.profileRef.version}`;
    if (records.has(key)) throw new TypeError("Provider registry v2 entry is duplicated");
    records.set(key, record);
  }
  function resolveEgressBinding(input = {}) {
    exactFields(input, new Set(["profileRef"]),
      "Provider registry v2 resolve input");
    const ref = normalizeStarcraftTmgProviderProfileRefV1(input.profileRef);
    const record = records.get(`${ref.id}@${ref.version}`);
    if (!record || record.profileRef.hash !== ref.hash) {
      return freeze({ ok: false, reason: "provider_profile_not_found",
        trainingTruth: false });
    }
    assertStarcraftTmgProviderEgressBindingV2(record.egressBinding);
    return freeze({ ok: true, providerProfile: clone(record.profile),
      egressBinding: clone(record.egressBinding), trainingTruth: false });
  }
  function metadata() {
    return freeze({
      schemaVersion: `${STARCRAFT_TMG_PROVIDER_PROFILE_REGISTRY_V2_VERSION}.metadata`,
      entryCount: records.size,
      endpointDialects: ["deepseek_responses_v1"],
      structuredOutputCapabilities: ["responses_json_schema"],
      silentFallbackAllowed: false,
      automaticRetryAllowed: false,
      trainingTruth: false,
    });
  }
  return Object.freeze({ resolveEgressBinding, metadata });
}
