import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialAttackProfileCatalogueV1 } from
  "./official-attack-profile-catalogue-v1.mjs";

export const OFFICIAL_ATTACK_PROFILE_CATALOGUE_V2_SCHEMA =
  "starcraft_tmg_official_attack_profile_catalogue_v2";

const PROFILE_SCHEMA = "starcraft_tmg_official_attack_profile_v2";
const CRITICAL_HIT_EFFECT_ATOM_ID = "attack-effect:critical-hit-v1";
const CORE_RULE_CONTENT_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function profileBody(profile) {
  return without(profile, ["profileHash"]);
}

function catalogueBody(catalogue) {
  return without(catalogue, ["catalogueHash", "profilesByProfileKey"]);
}

function migrateCriticalHitEffect(effect, profileKey) {
  if (effect.effectAtomId !== CRITICAL_HIT_EFFECT_ATOM_ID) {
    return structuredClone(effect);
  }
  const keys = Object.keys(effect.parameters || {});
  const bypassArmourDice = Number(effect.parameters?.additionalHits);
  if (effect.sourceKind !== "weapon_keyword"
    || keys.length !== 1
    || keys[0] !== "additionalHits"
    || !Number.isSafeInteger(bypassArmourDice)
    || bypassArmourDice <= 0) {
    fail("OFFICIAL_ATTACK_PROFILE_V2_CRITICAL_HIT_MIGRATION_INVALID", profileKey);
  }
  return {
    effectAtomId: CRITICAL_HIT_EFFECT_ATOM_ID,
    parameters: { bypassArmourDice },
    sourceKind: "weapon_keyword",
  };
}

function migrateProfile(profile) {
  const legacyBody = without(profile, ["profileHash"]);
  const body = {
    ...structuredClone(legacyBody),
    schema: PROFILE_SCHEMA,
    previousProfileHash: profile.profileHash,
    effects: profile.effects.map((effect) => (
      migrateCriticalHitEffect(effect, profile.profileKey)
    )),
  };
  return {
    ...body,
    profileHash: hashStarcraftTmgContract(body),
  };
}

function migrateRegistry(registry) {
  return registry.map((entry) => entry.effectAtomId === CRITICAL_HIT_EFFECT_ATOM_ID
    ? {
        ...structuredClone(entry),
        implementationStatus: "executable_subset",
        parameterContract:
          "attack-effect:critical-hit-v1.parameters.bypassArmourDice",
      }
    : structuredClone(entry));
}

export function createOfficialAttackProfileCatalogueV2(input = {}) {
  const previousCatalogue = input.previousCatalogue;
  verifyOfficialAttackProfileCatalogueV1(previousCatalogue);
  const profiles = previousCatalogue.profiles.map(migrateProfile);
  const effectRegistry = migrateRegistry(previousCatalogue.effectRegistry);
  const body = {
    schema: OFFICIAL_ATTACK_PROFILE_CATALOGUE_V2_SCHEMA,
    sourceId: previousCatalogue.sourceId,
    sourceSnapshotHash: previousCatalogue.sourceSnapshotHash,
    normalizedDatasetHash: previousCatalogue.normalizedDatasetHash,
    dataVersions: structuredClone(previousCatalogue.dataVersions),
    unitRecordKeys: [...previousCatalogue.unitRecordKeys],
    previousCatalogueHash: previousCatalogue.catalogueHash,
    effectRegistry,
    effectRegistryHash: hashStarcraftTmgContract(effectRegistry),
    profiles,
    unknownEffects: [],
    semanticCorrection: {
      correctionId: "critical-hit-armour-bypass-parameter-v2",
      effectAtomId: CRITICAL_HIT_EFFECT_ATOM_ID,
      legacyParameterName: "additionalHits",
      currentParameterName: "bypassArmourDice",
      semanticMeaning:
        "move_up_to_x_dice_from_armour_pool_directly_to_damage_pool_without_generating_hits",
      timing: "resolve_surge",
      coreRuleSourceId: "core-rules-en@27639c562e6d",
      coreRuleContentHash: CORE_RULE_CONTENT_HASH,
      silentCompatibilityAllowed: false,
    },
    repositoryFallbackAllowed: false,
    productionRoomBindingEligible: false,
    rulesTruth:
      "official_profile_data_v2_with_critical_hit_parameter_corrected_but_rule_authority_external",
    canAffectRules: false,
    trainingTruth: false,
  };
  return deepFreeze({
    ...body,
    catalogueHash: hashStarcraftTmgContract(body),
    profilesByProfileKey: Object.fromEntries(profiles.map((profile) => [
      profile.profileKey,
      profile,
    ])),
  });
}

export function verifyOfficialAttackProfileCatalogueV2(catalogue) {
  if (!object(catalogue)
    || catalogue.schema !== OFFICIAL_ATTACK_PROFILE_CATALOGUE_V2_SCHEMA
    || catalogue.catalogueHash !== hashStarcraftTmgContract(catalogueBody(catalogue))
    || !/^[a-f0-9]{64}$/u.test(String(catalogue.previousCatalogueHash || ""))
    || catalogue.effectRegistryHash !== hashStarcraftTmgContract(catalogue.effectRegistry)
    || catalogue.semanticCorrection?.effectAtomId !== CRITICAL_HIT_EFFECT_ATOM_ID
    || catalogue.semanticCorrection?.legacyParameterName !== "additionalHits"
    || catalogue.semanticCorrection?.currentParameterName !== "bypassArmourDice"
    || catalogue.semanticCorrection?.coreRuleContentHash !== CORE_RULE_CONTENT_HASH
    || catalogue.semanticCorrection?.silentCompatibilityAllowed !== false
    || catalogue.repositoryFallbackAllowed !== false
    || catalogue.productionRoomBindingEligible !== false
    || catalogue.canAffectRules !== false
    || catalogue.trainingTruth !== false
    || !Array.isArray(catalogue.profiles)
    || !Array.isArray(catalogue.effectRegistry)
    || !Array.isArray(catalogue.unknownEffects)
    || catalogue.unknownEffects.length !== 0) {
    fail("OFFICIAL_ATTACK_PROFILE_CATALOGUE_V2_INVALID");
  }
  const criticalRegistry = catalogue.effectRegistry.filter((entry) => (
    entry.effectAtomId === CRITICAL_HIT_EFFECT_ATOM_ID
  ));
  if (criticalRegistry.length !== 1
    || criticalRegistry[0].implementationStatus !== "executable_subset"
    || criticalRegistry[0].parameterContract
      !== "attack-effect:critical-hit-v1.parameters.bypassArmourDice") {
    fail("OFFICIAL_ATTACK_PROFILE_CATALOGUE_V2_EFFECT_REGISTRY_INVALID");
  }
  const seen = new Set();
  let criticalHitProfiles = 0;
  const byPhase = { assault: 0, combat: 0 };
  for (const profile of catalogue.profiles) {
    if (!object(profile)
      || profile.schema !== PROFILE_SCHEMA
      || seen.has(profile.profileKey)
      || profile.profileHash !== hashStarcraftTmgContract(profileBody(profile))
      || !/^[a-f0-9]{64}$/u.test(String(profile.previousProfileHash || ""))
      || profile.canAffectRules !== false
      || profile.trainingTruth !== false
      || !Object.hasOwn(byPhase, profile.phase)
      || !Array.isArray(profile.effects)) {
      fail("OFFICIAL_ATTACK_PROFILE_V2_INTEGRITY_MISMATCH", profile?.profileKey || "");
    }
    for (const effect of profile.effects) {
      if (effect.effectAtomId !== CRITICAL_HIT_EFFECT_ATOM_ID) continue;
      criticalHitProfiles += 1;
      const keys = Object.keys(effect.parameters || {});
      if (effect.sourceKind !== "weapon_keyword"
        || keys.length !== 1
        || keys[0] !== "bypassArmourDice"
        || !Number.isSafeInteger(effect.parameters.bypassArmourDice)
        || effect.parameters.bypassArmourDice <= 0
        || Object.hasOwn(effect.parameters, "additionalHits")) {
        fail("OFFICIAL_ATTACK_PROFILE_V2_CRITICAL_HIT_INVALID", profile.profileKey);
      }
    }
    seen.add(profile.profileKey);
    byPhase[profile.phase] += 1;
  }
  const expectedIndex = Object.fromEntries(catalogue.profiles.map((profile) => [
    profile.profileKey,
    profile,
  ]));
  if (hashStarcraftTmgContract(expectedIndex)
    !== hashStarcraftTmgContract(catalogue.profilesByProfileKey)) {
    fail("OFFICIAL_ATTACK_PROFILE_CATALOGUE_V2_INDEX_MISMATCH");
  }
  return deepFreeze({
    schema: "starcraft_tmg_official_attack_profile_catalogue_audit_v2",
    catalogueHash: catalogue.catalogueHash,
    previousCatalogueHash: catalogue.previousCatalogueHash,
    counts: {
      unitRecords: catalogue.unitRecordKeys.length,
      attackProfiles: catalogue.profiles.length,
      byPhase,
      effectDefinitions: catalogue.effectRegistry.length,
      criticalHitProfiles,
      unknownEffects: catalogue.unknownEffects.length,
    },
    canAffectRules: false,
    trainingTruth: false,
  });
}

export function getOfficialAttackProfileV2(catalogue, query = {}) {
  verifyOfficialAttackProfileCatalogueV2(catalogue);
  const profileKey = typeof query === "string"
    ? query
    : `${String(query.recordKey || "")}::${String(query.phase || "")}::${String(query.weaponName || "")}`;
  const profile = catalogue.profilesByProfileKey?.[profileKey];
  if (!profile) fail("OFFICIAL_ATTACK_PROFILE_V2_MISSING", profileKey);
  return profile;
}
