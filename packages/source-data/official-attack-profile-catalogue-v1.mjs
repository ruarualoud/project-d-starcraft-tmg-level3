import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
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

function parseSurge(value, context) {
  const text = String(value || "").trim();
  if (text === "-") return { surge: null, effects: [] };
  const match = text.match(/^([A-Za-z]+(?:\s*,\s*[A-Za-z]+)*)\s*\((D3(?:\+1)?|D6)\)$/u);
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

function parseKeywordToken(token, context) {
  const text = String(token || "").trim();
  let match;
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

function parseKeywordEffects(value, context) {
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(",").map((token) => parseKeywordToken(token, context));
}

function parseRange(value, context) {
  const text = String(value || "").trim();
  if (text === "E") return { kind: "engagement" };
  return {
    kind: "inches",
    normalRangeInches: positiveInteger(text, "OFFICIAL_ATTACK_RANGE_INVALID", context),
  };
}

function parseAttackProfile(record, upgrade) {
  const phaseText = String(upgrade?.phase || "");
  if (!["Assault Phase", "Combat Phase"].includes(phaseText)
    || String(upgrade?.activation || "").trim()) {
    return null;
  }
  const description = String(upgrade.description || "").replace(/\r\n/gu, "\n").normalize("NFC");
  const match = description.match(
    /^RANGE:\s*([^|\n]+)\s*\|\s*TARGET:\s*([^|\n]+)\s*\|\s*RoA:\s*(\d+)\s*\|\s*HIT:\s*(\d+)\+\s*\|\s*DMG:\s*(\d+)\nSURGE:\s*([^\n]+)(?:\n\n([\s\S]+))?$/u,
  );
  if (!match) fail("OFFICIAL_ATTACK_PROFILE_SYNTAX_UNKNOWN", record.recordKey);
  const phase = phaseText === "Assault Phase" ? "assault" : "combat";
  const weaponName = String(upgrade.name || "").trim().normalize("NFC");
  if (!weaponName) fail("OFFICIAL_ATTACK_WEAPON_NAME_REQUIRED", record.recordKey);
  const context = `${record.recordKey}:${phase}:${weaponName}`;
  const hitThreshold = positiveInteger(match[4], "OFFICIAL_ATTACK_HIT_INVALID", context);
  if (hitThreshold < 2 || hitThreshold > 6) fail("OFFICIAL_ATTACK_HIT_INVALID", context);
  const parsedSurge = parseSurge(match[6], context);
  const effects = [
    ...parsedSurge.effects,
    ...parseKeywordEffects(match[7], context),
  ];
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
    rateOfAttack: positiveInteger(match[3], "OFFICIAL_ATTACK_ROA_INVALID", context),
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

export function createOfficialAttackProfileCatalogueV1(input = {}) {
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
      .map((upgrade) => parseAttackProfile(record, upgrade))
      .filter(Boolean);
  }).sort((left, right) => left.profileKey.localeCompare(right.profileKey));
  if (profiles.length === 0 || new Set(profiles.map((profile) => profile.profileKey)).size !== profiles.length) {
    fail("OFFICIAL_ATTACK_PROFILE_DENOMINATOR_INVALID");
  }
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
  if (!object(catalogue) || catalogue.schema !== OFFICIAL_ATTACK_PROFILE_CATALOGUE_SCHEMA) {
    fail("OFFICIAL_ATTACK_PROFILE_CATALOGUE_INVALID");
  }
  if (hashStarcraftTmgContract(catalogueBody(catalogue)) !== catalogue.catalogueHash) {
    fail("OFFICIAL_ATTACK_PROFILE_CATALOGUE_HASH_MISMATCH");
  }
  if (catalogue.effectRegistryHash !== hashStarcraftTmgContract(catalogue.effectRegistry)
    || hashStarcraftTmgContract(catalogue.effectRegistry) !== hashStarcraftTmgContract(EFFECT_REGISTRY)
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
      || profile.effects.some((entry) => !EFFECT_REGISTRY.some((definition) => (
        definition.effectAtomId === entry.effectAtomId
      )))) {
      fail("OFFICIAL_ATTACK_PROFILE_INTEGRITY_MISMATCH", profile.profileKey);
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
  if (!profile) fail("OFFICIAL_ATTACK_PROFILE_MISSING", profileKey);
  return profile;
}
