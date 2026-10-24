import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_SINGLETON_SUMMON_IDENTITY_POLICY_V1,
  projectOfficialSingletonSummonRegistryV1,
} from "./official-singleton-summon-identity-v1.mjs";

export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V6_ID =
  "starcraft-tmg-official-current-product-match-runtime-v6";

export function projectOfficialSingletonIdentityStateV6(state) {
  const projected = projectOfficialSingletonSummonRegistryV1(state);
  return { state: projected.state.officialSingletonSummonIdentityPolicy
    === OFFICIAL_SINGLETON_SUMMON_IDENTITY_POLICY_V1 ? projected.state : {
      ...projected.state,
      officialSingletonSummonIdentityPolicy: OFFICIAL_SINGLETON_SUMMON_IDENTITY_POLICY_V1,
    }, repairs: projected.repairs };
}

// Admit only through an explicit versioned Room boundary. Never register this
// runtime under a frozen v1 binding or rewrite its old accepted receipts.
export function createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime } = {}) {
  const prior = legacyRuntime?.descriptor;
  if (!prior?.runtimeHash || typeof legacyRuntime.enumerate !== "function"
    || typeof legacyRuntime.instantiate !== "function"
    || typeof legacyRuntime.apply !== "function") {
    throw new Error("SINGLETON_IDENTITY_LEGACY_RUNTIME_REQUIRED");
  }
  const { runtimeHash: ignoredHash, ...body } = prior;
  if (hashStarcraftTmgContract(body) !== prior.runtimeHash) {
    throw new Error("SINGLETON_IDENTITY_LEGACY_RUNTIME_INVALID");
  }
  const descriptorBody = {
    ...body,
    runtimeId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V6_ID,
    runtimeVersion: "1.0.0",
    rulesVersion: "official-current-product-standard-2000-singleton-identity-v6",
    legacyRuntimeHash: prior.runtimeHash,
    singletonSummonIdentityPolicy: OFFICIAL_SINGLETON_SUMMON_IDENTITY_POLICY_V1,
    catalogueHash: hashStarcraftTmgContract({
      legacyCatalogueHash: prior.catalogueHash,
      identityPolicy: OFFICIAL_SINGLETON_SUMMON_IDENTITY_POLICY_V1,
    }),
    // A focused query regression is not formal Room admission.
    productionRoomEligible: false,
  };
  const descriptor = Object.freeze({ ...descriptorBody,
    runtimeHash: hashStarcraftTmgContract(descriptorBody) });
  function enumerate(state, options = {}) {
    const projected = projectOfficialSingletonIdentityStateV6(state);
    return { ...legacyRuntime.enumerate(projected.state, options),
      rulesRuntimeHash: descriptor.runtimeHash,
      singletonIdentityRepairs: projected.repairs,
      trainingTruth: false };
  }
  function instantiate(state, domain, parameters, options = {}) {
    return legacyRuntime.instantiate(projectOfficialSingletonIdentityStateV6(state).state,
      domain, parameters, options);
  }
  function apply(state, action, options = {}) {
    const projected = projectOfficialSingletonIdentityStateV6(state);
    const result = legacyRuntime.apply(projected.state, action, options);
    const next = structuredClone(result.state);
    const repairs = structuredClone(projected.repairs);
    if (repairs.length && next.log?.length) {
      const last = next.log.at(-1);
      last.events = [...repairs, ...(last.events || [])];
    }
    return { ...result, state: next,
      runtimeId: descriptor.runtimeId, runtimeVersion: descriptor.runtimeVersion,
      events: [...repairs, ...(result.events || [])], trainingTruth: false };
  }
  return Object.freeze({ descriptor, legacyRuntimeDescriptor: prior,
    compositionEvidence: legacyRuntime.compositionEvidence,
    missionRuntimeDescriptor: legacyRuntime.missionRuntimeDescriptor,
    enumerate, instantiate, apply });
}
