import { assertOfficialReleaseSourceV2 } from "./official-release-context-v2.mjs";
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAbilityEffectIrCatalogueV1 } from './official-ability-effect-ir-v1.mjs';
import { verifyCommandCenterSnapshot } from
  "../rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  getOfficialCurrentProductRecord,
  verifyOfficialCommandCenterDataset,
} from "./official-command-center-adapter-v1.mjs";

export const OFFICIAL_ATTACK_PROFILE_CATALOGUE_SCHEMA =
  "starcraft_tmg_official_attack_profile_catalogue_v1";

const EFFECT_REGISTRY = Object.freeze([
  ["attack-effect:anti-evade-v1", "anti_evade", "known_unimplemented"],
  ["attack-effect:bulky-v1", "bulky", "known_unimplemented"],
  ["attack-effect:burst-fire-v1", "burst_fire", "known_unimplemented"],
  ["attack-effect:critical-hit-v1", "critical_hit", "known_unimplemented"],
  ["attack-effect:indirect-fire-v1", "indirect_fire", "known_unimplemented"],
  ["attack-effect:instant-v1", "instant", "known_unimplemented"],
  ["attack-effect:locked-in-v1", "locked_in", "known_unimplemented"],
  ["attack-effect:long-range-v1", "long_range", "executable_subset"],
  ["attack-effect:pierce-v1", "pierce", "known_unimplemented"],
  ["attack-effect:pinpoint-v1", "pinpoint", "known_unimplemented"],
  ["attack-effect:sidearm-v1", "sidearm", "known_unimplemented"],
  ["attack-effect:specialist-v1", "specialist", "known_unimplemented"],
  ["attack-effect:surge-armour-bypass-v1", "surge_armour_bypass", "executable_subset"],
].map(([effectAtomId, keywordKind, implementationStatus]) => Object.freeze({
  effectAtomId,
  keywordKind,
  implementationStatus,
  parameterContract: `${effectAtomId}.parameters`,
  sourceAuthority: "official_current_command_center_profile_text",
  trainingTruth: false,
})));

const EFFECT_BY_KIND = new Map(EFFECT_REGISTRY.map((entry) => [entry.keywordKind, entry]));
const CONCENTRATED_FIRE_EFFECT = Object.freeze({
  effectAtomId: 'attack-effect:concentrated-fire-v1', keywordKind: 'concentrated_fire',
  implementationStatus: 'executable_subset', parameterContract: 'attack-effect:concentrated-fire-v1.parameters',
  sourceAuthority: 'official_current_command_center_profile_text', trainingTruth: false,
});
const EXTENDED_EFFECT_REGISTRY = Object.freeze([...EFFECT_REGISTRY, CONCENTRATED_FIRE_EFFECT]);

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

function positiveInteger(value, code, detail = "") {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0) fail(code, detail || String(value));
  return result;
}

function normalizedTags(value, code) {
  const result = String(value || "").split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  if (result.length === 0 || new Set(result).size !== result.length) fail(code);
  return result;
}

function effect(keywordKind, parameters, sourceKind) {
  const definition = EFFECT_BY_KIND.get(keywordKind);
  if (!definition) fail("OFFICIAL_ATTACK_EFFECT_UNKNOWN", keywordKind);
  return {
    effectAtomId: definition.effectAtomId,
    parameters,
    sourceKind,
  };
}

function parseSurge(value, context, allowTemplates = false) {
  const text = String(value || "").trim();
  // The frozen current-release API also spells out a null type and null die.
  if (text === "-" || allowTemplates && /^-\s*\(\s*-\s*\)$/u.test(text)) return { surge: null, effects: [] };
  const pattern = allowTemplates
    ? /^([A-Za-z]+(?:\s*,\s*[A-Za-z]+)*)\s*\((D3(?:\+1)?|D6|BT|FT)\)$/u
    : /^([A-Za-z]+(?:\s*,\s*[A-Za-z]+)*)\s*\((D3(?:\+1)?|D6)\)$/u;
  const match = text.match(pattern);
  if (!match) fail("OFFICIAL_ATTACK_SURGE_UNKNOWN", `${context}:${text}`);
  const surge = {
    targetTags: normalizedTags(match[1], "OFFICIAL_ATTACK_SURGE_TARGET_INVALID"),
    diceExpression: match[2],
  };
  return {
    surge,
    effects: [effect("surge_armour_bypass", { ...surge }, "surge")],
  };
}

function parseKeywordToken(token, context, allowExtendedEffects = false) {
  const text = String(token || "").trim();
  let match;
  if (allowExtendedEffects && (match = text.match(/^CONCENTRATED FIRE\s*\((\d+)\)$/u))) {
    return { effectAtomId: CONCENTRATED_FIRE_EFFECT.effectAtomId,
      parameters: { maximumCasualties: positiveInteger(match[1], 'OFFICIAL_ATTACK_EFFECT_PARAMETER_INVALID', context) },
      sourceKind: 'weapon_keyword' };
  }
  if ((match = text.match(/^ANTI-EVADE\s*\((\d+)\)$/u))) {
    return effect("anti_evade", {
      evadeThresholdModifier: -positiveInteger(match[1], "OFFICIAL_ATTACK_EFFECT_PARAMETER_INVALID", context),
    }, "weapon_keyword");
  }
  if (text === "BULKY") return effect("bulky", {}, "weapon_keyword");
  if ((match = text.match(/^BURST FIRE\s+(\d+)"\s*\((\d+)\)$/u))) {
    return effect("burst_fire", {
      maximumDistanceInches: positiveInteger(match[1], "OFFICIAL_ATTACK_EFFECT_PARAMETER_INVALID", context),
      additionalRateOfAttack: positiveInteger(match[2], "OFFICIAL_ATTACK_EFFECT_PARAMETER_INVALID", context),
    }, "weapon_keyword");
  }
  if ((match = text.match(/^CRITICAL HIT\s*\((\d+)\)$/u))) {
    return effect("critical_hit", {
      additionalHits: positiveInteger(match[1], "OFFICIAL_ATTACK_EFFECT_PARAMETER_INVALID", context),
    }, "weapon_keyword");
  }
  if (text === "INDIRECT FIRE") return effect("indirect_fire", {}, "weapon_keyword");
  if (text === "INSTANT") return effect("instant", {}, "weapon_keyword");
  if ((match = text.match(/^LOCKED IN\s*\((\d+)\)$/u))) {
    return effect("locked_in", {
      additionalRateOfAttack: positiveInteger(match[1], "OFFICIAL_ATTACK_EFFECT_PARAMETER_INVALID", context),
    }, "weapon_keyword");
  }
  if ((match = text.match(/^LONG RANGE\s*\((\d+)"\)$/u))) {
    return effect("long_range", {
      maximumRangeInches: positiveInteger(match[1], "OFFICIAL_ATTACK_EFFECT_PARAMETER_INVALID", context),
    }, "weapon_keyword");
  }
  if ((match = text.match(/^PIERCE\s+([A-Za-z]+)\s*\((\d+)\)$/u))) {
    return effect("pierce", {
      targetTag: match[1].toLowerCase(),
      damage: positiveInteger(match[2], "OFFICIAL_ATTACK_EFFECT_PARAMETER_INVALID", context),
    }, "weapon_keyword");
  }
  if (text === "PINPOINT") return effect("pinpoint", {}, "weapon_keyword");
  if (text === "SIDEARM") return effect("sidearm", {}, "weapon_keyword");
  if (text === "SPECIALIST") return effect("specialist", {}, "weapon_keyword");
  fail("OFFICIAL_ATTACK_EFFECT_UNKNOWN", `${context}:${text}`);
}

function parseKeywordEffects(value, context, allowExtendedEffects = false) {
  const text = String(value || "").trim();
  if (!text || text === '-') return [];
  return text.split(",").map((token) => parseKeywordToken(token, context, allowExtendedEffects));
}

function parseRange(value, context) {
  const text = String(value || "").trim();
  if (text === "E") return { kind: "engagement" };
  // Some official profiles print inches with a quote or two apostrophes.
  // Keep source text intact and normalize only this numeric field.
  const explicitInches = text.match(/^(\d+)(?:"|'')$/u);
  return {
    kind: "inches",
    normalRangeInches: positiveInteger(explicitInches ? explicitInches[1] : text, "OFFICIAL_ATTACK_RANGE_INVALID", context),
  };
}

function parseAttackProfile(record, upgrade, allowTemplates = false, reviewedKind) {
  if (reviewedKind !== undefined && reviewedKind !== 'weapon') return null;
  const phaseText = String(upgrade?.phase || "");
  if (!["Assault Phase", "Combat Phase"].includes(phaseText)
    || String(upgrade?.activation || "").trim()) {
    return null;
  }
  const description = String(upgrade.description || "").replace(/\r\n/gu, "\n").normalize("NFC");
  const match = description.match(
    /^RANGE:\s*([^|\n]+)\s*\|\s*TARGET:\s*([^|\n]+)\s*\|\s*RoA:\s*([^|\n]+)\s*\|\s*HIT:\s*(\d+)\+\s*\|\s*DMG:\s*(\d+)\nSURGE:\s*([^\n]+)(?:\n\n([\s\S]+))?$/u,
  );
  if (!match) fail("OFFICIAL_ATTACK_PROFILE_SYNTAX_UNKNOWN", record.recordKey);
  const phase = phaseText === "Assault Phase" ? "assault" : "combat";
  const weaponName = String(upgrade.name || "").trim().normalize("NFC");
  if (!weaponName) fail("OFFICIAL_ATTACK_WEAPON_NAME_REQUIRED", record.recordKey);
  const context = `${record.recordKey}:${phase}:${weaponName}`;
  const hitThreshold = positiveInteger(match[4], "OFFICIAL_ATTACK_HIT_INVALID", context);
  if (hitThreshold < 2 || hitThreshold > 6) fail("OFFICIAL_ATTACK_HIT_INVALID", context);
  const templateMatch = allowTemplates ? match[3].trim().match(/^(BT|FT)(?:\+(\d+))?$/u) : null;
  const rateOfAttack = templateMatch ? null : positiveInteger(match[3], "OFFICIAL_ATTACK_ROA_INVALID", context);
  const parsedSurge = parseSurge(match[6], context, allowTemplates);
  if (['BT', 'FT'].includes(parsedSurge.surge?.diceExpression)
    && parsedSurge.surge.diceExpression !== templateMatch?.[1]) fail('OFFICIAL_ATTACK_TEMPLATE_SURGE_MISMATCH', context);
  const requiresSiegeMode = allowTemplates && String(match[7] || '').trim() === 'SIEGE MODE Status';
  const effects = [ ...parsedSurge.effects,
    ...parseKeywordEffects(requiresSiegeMode ? '' : match[7], context, allowTemplates) ];
  const profileKey = `${record.recordKey}::${phase}::${weaponName}`;
  const body = {
    schema: "starcraft_tmg_official_attack_profile_v1",
    profileKey,
    recordKey: record.recordKey,
    unitId: String(record.payload.id || "").trim(),
    unitName: String(record.payload.name || "").trim().normalize("NFC"),
    sourceRecordHash: record.sourceRecordHash,
    payloadHash: record.payloadHash,
    phase,
    weaponName,
    linkedTo: String(upgrade.linkedTo || "").trim().normalize("NFC"),
    costSmall: Number(upgrade.costS || 0),
    costLarge: Number(upgrade.costL || 0),
    range: parseRange(match[1], context),
    targetTags: normalizedTags(match[2], "OFFICIAL_ATTACK_TARGET_TAGS_INVALID"),
    rateOfAttack,
    ...(templateMatch ? { templateWeapon: { templateType: templateMatch[1] === 'BT' ? 'blast' : 'flamer',
      rateOfAttackExpression: match[3].trim(), mainTargetRateModifier: Number(templateMatch[2] || 0),
      geometryRequired: true }, executionRequirement: 'source_bound_template_geometry_and_runtime' } : {}),
    ...(requiresSiegeMode ? { requiredStatus: 'siege_mode' } : {}),
    hitThreshold,
    damage: positiveInteger(match[5], "OFFICIAL_ATTACK_DAMAGE_INVALID", context),
    surge: parsedSurge.surge,
    effects,
    sourceTextHash: hashStarcraftTmgContract(description),
    canAffectRules: false,
    trainingTruth: false,
  };
  return { ...body, profileHash: hashStarcraftTmgContract(body) };
}

function catalogueBody(catalogue) {
  return without(catalogue, ["catalogueHash", "profilesByProfileKey"]);
}

function profileBody(profile) {
  return without(profile, ["profileHash"]);
}

function compileAttackProfiles(input, allowTemplates = false) {
  verifyCommandCenterSnapshot(input.snapshot);
  verifyOfficialCommandCenterDataset({ snapshot: input.snapshot, dataset: input.dataset });
  const recordKeys = [...new Set((input.recordKeys || input.dataset.recordIndex
    .filter((entry) => entry.recordType === "unit")
    .map((entry) => entry.recordKey))
    .map((value) => String(value || "").trim()))]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  if (recordKeys.length === 0 || recordKeys.some((key) => !key.startsWith("army_units:"))) {
    fail("OFFICIAL_ATTACK_UNIT_DENOMINATOR_INVALID");
  }
  const profiles = recordKeys.flatMap((recordKey) => {
    const record = getOfficialCurrentProductRecord(input.dataset, recordKey);
    return (record.payload.upgrades || [])
      .map((upgrade, index) => parseAttackProfile(record, upgrade, allowTemplates,
        input.featureKinds?.get(recordKey + ':' + index)))
      .filter(Boolean);
  }).sort((left, right) => left.profileKey.localeCompare(right.profileKey));
  if (profiles.length === 0 || new Set(profiles.map((profile) => profile.profileKey)).size !== profiles.length) {
    fail("OFFICIAL_ATTACK_PROFILE_DENOMINATOR_INVALID");
  }
  return { recordKeys, profiles };
}

export function createOfficialAttackProfileCatalogueV1(input = {}) {
  const { recordKeys, profiles } = compileAttackProfiles(input);
  const body = {
    schema: OFFICIAL_ATTACK_PROFILE_CATALOGUE_SCHEMA,
    sourceId: input.dataset.sourceId,
    sourceSnapshotHash: input.snapshot.snapshotHash,
    normalizedDatasetHash: input.dataset.datasetHash,
    dataVersions: { ...input.dataset.dataVersions },
    unitRecordKeys: recordKeys,
    effectRegistry: EFFECT_REGISTRY.map((entry) => ({ ...entry })),
    effectRegistryHash: hashStarcraftTmgContract(EFFECT_REGISTRY),
    profiles,
    unknownEffects: [],
    repositoryFallbackAllowed: false,
    productionRoomBindingEligible: false,
    rulesTruth: "official_profile_data_compiled_effects_pending_individual_rule_authority",
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

export function verifyOfficialAttackProfileCatalogueV1(catalogue) {
  const releaseBound = catalogue?.schema === "starcraft_tmg_official_attack_profile_catalogue_v3";
  if (!object(catalogue) || (!releaseBound && catalogue.schema !== OFFICIAL_ATTACK_PROFILE_CATALOGUE_SCHEMA)) {
    fail("OFFICIAL_ATTACK_PROFILE_CATALOGUE_INVALID");
  }
  if (hashStarcraftTmgContract(catalogueBody(catalogue)) !== catalogue.catalogueHash) {
    fail("OFFICIAL_ATTACK_PROFILE_CATALOGUE_HASH_MISMATCH");
  }
  const extended = releaseBound && catalogue.extendedWeaponEffectRegistryVersion === '1.0.0';
  if (catalogue.extendedWeaponEffectRegistryVersion !== undefined && !extended) {
    fail('OFFICIAL_ATTACK_EXTENDED_EFFECT_REGISTRY_INVALID');
  }
  const effectRegistry = extended ? EXTENDED_EFFECT_REGISTRY : EFFECT_REGISTRY;
  if (catalogue.effectRegistryHash !== hashStarcraftTmgContract(catalogue.effectRegistry)
    || hashStarcraftTmgContract(catalogue.effectRegistry) !== hashStarcraftTmgContract(effectRegistry)
    || !Array.isArray(catalogue.profiles)
    || !Array.isArray(catalogue.unitRecordKeys)
    || !Array.isArray(catalogue.unknownEffects)
    || catalogue.unknownEffects.length !== 0
    || catalogue.repositoryFallbackAllowed !== false
    || catalogue.productionRoomBindingEligible !== false
    || catalogue.canAffectRules !== false
    || catalogue.trainingTruth !== false) {
    fail("OFFICIAL_ATTACK_PROFILE_CATALOGUE_POLICY_MISMATCH");
  }
  const seen = new Set();
  const byPhase = { assault: 0, combat: 0 };
  for (const profile of catalogue.profiles) {
    if (seen.has(profile.profileKey)
      || profile.profileHash !== hashStarcraftTmgContract(profileBody(profile))
      || profile.canAffectRules !== false
      || profile.trainingTruth !== false
      || !Object.hasOwn(byPhase, profile.phase)
      || !Array.isArray(profile.effects)
      || profile.effects.some((entry) => !effectRegistry.some((definition) => (
        definition.effectAtomId === entry.effectAtomId
      )))) {
      fail("OFFICIAL_ATTACK_PROFILE_INTEGRITY_MISMATCH", profile.profileKey);
    }
    seen.add(profile.profileKey);
    byPhase[profile.phase] += 1;
  }
  if (releaseBound) {
    if (!catalogue.sourceBinding?.releaseId
      || catalogue.sourceBinding.sourceSnapshotHash !== catalogue.sourceSnapshotHash
      || catalogue.sourceBinding.normalizedDatasetHash !== catalogue.normalizedDatasetHash
      || !Array.isArray(catalogue.templateProfiles)
      || catalogue.numericAndTemplateProfilesSeparated !== true
      || catalogue.profiles.some(profile => !Number.isSafeInteger(profile.rateOfAttack) || profile.rateOfAttack <= 0)) {
      fail('OFFICIAL_ATTACK_PROFILE_V3_BINDING_INVALID');
    }
    for (const profile of catalogue.templateProfiles) {
      if (seen.has(profile.profileKey) || profile.profileHash !== hashStarcraftTmgContract(profileBody(profile))
        || profile.rateOfAttack !== null || !['blast', 'flamer'].includes(profile.templateWeapon?.templateType)
        || !Number.isSafeInteger(profile.templateWeapon.mainTargetRateModifier)
        || profile.templateWeapon.mainTargetRateModifier < 0 || profile.templateWeapon.geometryRequired !== true
        || profile.executionRequirement !== 'source_bound_template_geometry_and_runtime'
        || profile.canAffectRules !== false || profile.trainingTruth !== false) {
        fail('OFFICIAL_ATTACK_TEMPLATE_PROFILE_INTEGRITY_MISMATCH', profile.profileKey);
      }
      seen.add(profile.profileKey);
    }
  }
  const expectedIndex = Object.fromEntries(catalogue.profiles.map((profile) => [
    profile.profileKey,
    profile,
  ]));
  if (hashStarcraftTmgContract(expectedIndex)
    !== hashStarcraftTmgContract(catalogue.profilesByProfileKey)) {
    fail("OFFICIAL_ATTACK_PROFILE_INDEX_MISMATCH");
  }
  return deepFreeze({
    schema: "starcraft_tmg_official_attack_profile_catalogue_audit_v1",
    catalogueHash: catalogue.catalogueHash,
    counts: {
      unitRecords: catalogue.unitRecordKeys.length,
      attackProfiles: catalogue.profiles.length,
      byPhase,
      effectDefinitions: catalogue.effectRegistry.length,
      unknownEffects: catalogue.unknownEffects.length,
    },
    canAffectRules: false,
    trainingTruth: false,
  });
}

export function getOfficialAttackProfileV1(catalogue, query = {}) {
  verifyOfficialAttackProfileCatalogueV1(catalogue);
  const profileKey = typeof query === "string"
    ? query
    : `${String(query.recordKey || "")}::${String(query.phase || "")}::${String(query.weaponName || "")}`;
  const profile = catalogue.profilesByProfileKey?.[profileKey];
  if (!profile && catalogue.templateProfiles?.some(row => row.profileKey === profileKey)) {
    fail('OFFICIAL_ATTACK_PROFILE_REQUIRES_TEMPLATE_RUNTIME', profileKey);
  }
  if (!profile) fail("OFFICIAL_ATTACK_PROFILE_MISSING", profileKey);
  return profile;
}

// Selected-release profiles retain dynamic template expressions outside the
// numeric interface, preventing legacy Number() consumers from treating BT as 0.
export function createOfficialAttackProfileCatalogueV3({ context, recordKeys } = {}) {
  const manifest = assertOfficialReleaseSourceV2(context, context || {});
  const abilityCatalogue = context.resources?.abilityIdentities ? createOfficialAbilityEffectIrCatalogueV1({
    dataset: context.dataset, identityCatalogue: context.resources.abilityIdentities }) : null;
  const featureKinds = abilityCatalogue ? new Map(abilityCatalogue.definitions
    .filter(definition => definition.sourceKind === 'unit_feature')
    .map(definition => [definition.recordKey + ':' + definition.sourceIndex, definition.activationKind])) : null;
  const compiled = compileAttackProfiles({ dataset: context.dataset, snapshot: context.snapshot, recordKeys, featureKinds }, true);
  const profiles = compiled.profiles.filter(profile => !profile.templateWeapon);
  const templateProfiles = compiled.profiles.filter(profile => profile.templateWeapon);
  const extended = compiled.profiles.some(profile => profile.effects.some(effect =>
    effect.effectAtomId === CONCENTRATED_FIRE_EFFECT.effectAtomId));
  const effectRegistry = extended ? EXTENDED_EFFECT_REGISTRY : EFFECT_REGISTRY;
  const body = { schema: 'starcraft_tmg_official_attack_profile_catalogue_v3',
    sourceId: context.dataset.sourceId, sourceSnapshotHash: context.snapshot.snapshotHash,
    normalizedDatasetHash: context.dataset.datasetHash, dataVersions: { ...context.dataset.dataVersions },
    sourceBinding: { releaseId: manifest.releaseId, sourceSnapshotHash: context.snapshot.snapshotHash,
      normalizedDatasetHash: context.dataset.datasetHash },
    unitRecordKeys: compiled.recordKeys, effectRegistry: effectRegistry.map(row => ({ ...row })),
    effectRegistryHash: hashStarcraftTmgContract(effectRegistry), profiles, templateProfiles,
    ...(extended ? { extendedWeaponEffectRegistryVersion: '1.0.0' } : {}),
    numericAndTemplateProfilesSeparated: true, unknownEffects: [], repositoryFallbackAllowed: false,
    productionRoomBindingEligible: false,
    rulesTruth: 'official_profile_data_compiled_effects_pending_individual_rule_authority',
    canAffectRules: false, trainingTruth: false };
  const catalogue = deepFreeze({ ...body, catalogueHash: hashStarcraftTmgContract(body),
    profilesByProfileKey: Object.fromEntries(profiles.map(profile => [profile.profileKey, profile])) });
  verifyOfficialAttackProfileCatalogueV1(catalogue);
  return catalogue;
}

export function getOfficialAttackProfileV3(catalogue, query = {}) {
  verifyOfficialAttackProfileCatalogueV1(catalogue);
  if (catalogue.schema !== 'starcraft_tmg_official_attack_profile_catalogue_v3') fail('OFFICIAL_ATTACK_PROFILE_V3_REQUIRED');
  const profileKey = typeof query === 'string' ? query
    : [query.recordKey, query.phase, query.weaponName].map(value => String(value || '')).join('::');
  const profile = catalogue.profilesByProfileKey[profileKey]
    || catalogue.templateProfiles.find(row => row.profileKey === profileKey);
  if (!profile) fail('OFFICIAL_ATTACK_PROFILE_MISSING', profileKey);
  return profile;
}
