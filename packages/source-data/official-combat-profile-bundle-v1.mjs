import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCommandCenterSnapshot } from "../rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  getOfficialCurrentProductRecord,
  verifyOfficialCommandCenterDataset,
} from "./official-command-center-adapter-v1.mjs";

export const OFFICIAL_COMBAT_PROFILE_BUNDLE_SCHEMA =
  "starcraft_tmg_official_combat_profile_bundle_v1";

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

function positiveInteger(value, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) fail(code);
  return parsed;
}

function threshold(value, code, { nullable = false } = {}) {
  const text = String(value || "").trim();
  if (nullable && text === "-") return null;
  const match = text.match(/^(\d+)\+$/u);
  if (!match) fail(code, text);
  const parsed = Number(match[1]);
  if (!Number.isInteger(parsed) || parsed < 2 || parsed > 6) fail(code, text);
  return parsed;
}

function nullablePositiveInteger(value, code) {
  const text = String(value || "").trim();
  if (text === "-") return 0;
  return positiveInteger(text, code);
}

function tags(value) {
  const normalized = String(value || "").split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  if (normalized.length === 0 || new Set(normalized).size !== normalized.length) {
    fail("official_combat_profile_tags_invalid");
  }
  return normalized;
}

function squadProfile(value) {
  if (!Array.isArray(value) || value.length === 0) fail("official_combat_squad_profile_required");
  return value.map((row) => {
    const modelCount = String(row?.modelCount || "").trim();
    if (modelCount === "-") {
      return { tier: positiveInteger(row.tier, "official_combat_squad_tier_invalid"), minimumModels: null, maximumModels: null, supply: Number(row.supply || 0) };
    }
    const match = modelCount.match(/^(\d+)\s*-\s*(\d+)$/u);
    if (!match) fail("official_combat_squad_model_range_invalid", modelCount);
    const minimumModels = positiveInteger(match[1], "official_combat_squad_model_range_invalid");
    const maximumModels = positiveInteger(match[2], "official_combat_squad_model_range_invalid");
    const supply = Number(row.supply);
    if (minimumModels > maximumModels || !Number.isSafeInteger(supply) || supply < 0) {
      fail("official_combat_squad_profile_invalid");
    }
    return {
      tier: positiveInteger(row.tier, "official_combat_squad_tier_invalid"),
      minimumModels,
      maximumModels,
      supply,
    };
  }).sort((left, right) => left.tier - right.tier);
}

function weaponProfile(upgrade) {
  if (String(upgrade?.phase || "") !== "Combat Phase" || String(upgrade?.activation || "").trim()) {
    return null;
  }
  const description = String(upgrade.description || "").replace(/\r\n/gu, "\n").normalize("NFC");
  const match = description.match(
    /^RANGE:\s*([^|\n]+)\s*\|\s*TARGET:\s*([^|\n]+)\s*\|\s*RoA:\s*(\d+)\s*\|\s*HIT:\s*(\d+)\+\s*\|\s*DMG:\s*(\d+)\nSURGE:\s*([^\n]+)(?:\n\n([\s\S]+))?$/u,
  );
  if (!match) return null;
  const range = match[1].trim();
  if (range !== "E") fail("official_combat_weapon_range_invalid", String(upgrade.name || ""));
  const targetTags = match[2].split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean).sort();
  if (targetTags.length === 0) fail("official_combat_weapon_target_invalid");
  const surgeText = match[6].trim();
  return {
    weaponName: String(upgrade.name || "").trim().normalize("NFC"),
    linkedTo: String(upgrade.linkedTo || "").trim().normalize("NFC"),
    costSmall: Number(upgrade.costS || 0),
    costLarge: Number(upgrade.costL || 0),
    range: "engagement",
    targetTags,
    rateOfAttack: positiveInteger(match[3], "official_combat_weapon_roa_invalid"),
    hitThreshold: threshold(`${match[4]}+`, "official_combat_weapon_hit_invalid"),
    damage: positiveInteger(match[5], "official_combat_weapon_damage_invalid"),
    surge: surgeText === "-" ? null : surgeText,
    behaviorText: String(match[7] || "").trim().normalize("NFC"),
    sourceTextHash: hashStarcraftTmgContract(description),
  };
}

function profileFromRecord(record) {
  const payload = record.payload;
  const combatWeapons = (payload.upgrades || []).map(weaponProfile).filter(Boolean)
    .sort((left, right) => left.weaponName.localeCompare(right.weaponName));
  if (combatWeapons.length === 0) fail("official_combat_weapon_profile_required", record.recordKey);
  const profile = {
    recordKey: record.recordKey,
    sourceRecordHash: record.sourceRecordHash,
    payloadHash: record.payloadHash,
    unitId: String(payload.id || "").trim(),
    unitName: String(payload.name || "").trim().normalize("NFC"),
    faction: String(payload.faction || "").trim().normalize("NFC"),
    combatTags: tags(payload.tags),
    armourThreshold: threshold(payload.stats?.armor, "official_combat_armour_invalid"),
    evadeThreshold: threshold(payload.stats?.evade, "official_combat_evade_invalid", { nullable: true }),
    hitPoints: positiveInteger(payload.stats?.hp, "official_combat_hit_points_invalid"),
    shield: nullablePositiveInteger(payload.stats?.shield, "official_combat_shield_invalid"),
    squadProfile: squadProfile(payload.squadProfile),
    combatWeapons,
  };
  if (!profile.unitId || !profile.unitName || !profile.faction) fail("official_combat_profile_identity_invalid");
  return profile;
}

function bundleBody(bundle) {
  return without(bundle, ["bundleHash", "profilesByRecordKey"]);
}

export function createOfficialCombatProfileBundleV1(input = {}) {
  const snapshot = input.snapshot;
  const dataset = input.dataset;
  verifyCommandCenterSnapshot(snapshot);
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  const recordKeys = [...new Set((input.recordKeys || []).map((value) => String(value || "").trim()))]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  if (recordKeys.length === 0 || recordKeys.some((key) => !key.startsWith("army_units:"))) {
    fail("official_combat_profile_record_keys_invalid");
  }
  const profiles = recordKeys.map((recordKey) => profileFromRecord(
    getOfficialCurrentProductRecord(dataset, recordKey),
  ));
  const body = {
    schema: OFFICIAL_COMBAT_PROFILE_BUNDLE_SCHEMA,
    sourceId: dataset.sourceId,
    sourceSnapshotHash: snapshot.snapshotHash,
    normalizedDatasetHash: dataset.datasetHash,
    dataVersions: { ...dataset.dataVersions },
    profiles,
    repositoryFallbackAllowed: false,
    productionRoomBindingEligible: false,
    rulesTruth: "official_current_command_center_combat_profiles",
    trainingTruth: false,
  };
  const bundleHash = hashStarcraftTmgContract(body);
  return deepFreeze({
    ...body,
    bundleHash,
    profilesByRecordKey: Object.fromEntries(profiles.map((profile) => [profile.recordKey, profile])),
  });
}

export function verifyOfficialCombatProfileBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_COMBAT_PROFILE_BUNDLE_SCHEMA) {
    fail("official_combat_profile_bundle_invalid");
  }
  if (hashStarcraftTmgContract(bundleBody(bundle)) !== bundle.bundleHash
    || bundle.repositoryFallbackAllowed !== false
    || bundle.productionRoomBindingEligible !== false
    || bundle.trainingTruth !== false
    || !Array.isArray(bundle.profiles)
    || bundle.profiles.length === 0) {
    fail("official_combat_profile_bundle_hash_mismatch");
  }
  const expectedIndex = Object.fromEntries(bundle.profiles.map((profile) => [profile.recordKey, profile]));
  if (hashStarcraftTmgContract(expectedIndex) !== hashStarcraftTmgContract(bundle.profilesByRecordKey)) {
    fail("official_combat_profile_bundle_index_mismatch");
  }
  return true;
}

export function getOfficialCombatProfileV1(bundle, recordKey) {
  verifyOfficialCombatProfileBundleV1(bundle);
  const profile = bundle.profilesByRecordKey?.[String(recordKey || "")];
  if (!profile) fail("official_combat_profile_missing", String(recordKey || ""));
  return profile;
}
