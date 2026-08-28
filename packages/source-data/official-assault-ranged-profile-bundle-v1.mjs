import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCommandCenterSnapshot } from "../rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  createOfficialCombatProfileBundleV1,
  getOfficialCombatProfileV1,
} from "./official-combat-profile-bundle-v1.mjs";
import {
  getOfficialCurrentProductRecord,
  verifyOfficialCommandCenterDataset,
} from "./official-command-center-adapter-v1.mjs";

export const OFFICIAL_ASSAULT_RANGED_PROFILE_BUNDLE_SCHEMA =
  "starcraft_tmg_official_assault_ranged_profile_bundle_v1";

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
  if (!Number.isSafeInteger(parsed) || parsed <= 0) fail(code, String(value));
  return parsed;
}

function targetTags(value) {
  const result = String(value || "").split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  if (result.length === 0 || new Set(result).size !== result.length) {
    fail("official_assault_ranged_target_tags_invalid");
  }
  return result;
}

function surgeProfile(value, weaponName) {
  const text = String(value || "").trim();
  if (text === "-") return null;
  const match = text.match(/^([A-Za-z]+)\s*\((D3|D6)\)$/u);
  if (!match) fail("official_assault_ranged_surge_invalid", weaponName);
  return {
    targetTag: match[1].toLowerCase(),
    dice: match[2],
  };
}

function assaultWeapon(upgrade) {
  if (String(upgrade?.phase || "") !== "Assault Phase"
    || String(upgrade?.activation || "").trim()) {
    return null;
  }
  const description = String(upgrade.description || "").replace(/\r\n/gu, "\n").normalize("NFC");
  const match = description.match(
    /^RANGE:\s*(\d+)\s*\|\s*TARGET:\s*([^|\n]+)\s*\|\s*RoA:\s*(\d+)\s*\|\s*HIT:\s*(\d+)\+\s*\|\s*DMG:\s*(\d+)\nSURGE:\s*([^\n]+)(?:\n\n([\s\S]+))?$/u,
  );
  if (!match) return null;
  const weaponName = String(upgrade.name || "").trim().normalize("NFC");
  if (!weaponName) fail("official_assault_ranged_weapon_name_required");
  const hitThreshold = positiveInteger(match[4], "official_assault_ranged_hit_invalid");
  if (hitThreshold < 2 || hitThreshold > 6) {
    fail("official_assault_ranged_hit_invalid", weaponName);
  }
  return {
    weaponName,
    linkedTo: String(upgrade.linkedTo || "").trim().normalize("NFC"),
    costSmall: Number(upgrade.costS || 0),
    costLarge: Number(upgrade.costL || 0),
    rangeInches: positiveInteger(match[1], "official_assault_ranged_range_invalid"),
    targetTags: targetTags(match[2]),
    rateOfAttack: positiveInteger(match[3], "official_assault_ranged_roa_invalid"),
    hitThreshold,
    damage: positiveInteger(match[5], "official_assault_ranged_damage_invalid"),
    surge: surgeProfile(match[6], weaponName),
    behaviorText: String(match[7] || "").trim().normalize("NFC"),
    sourceTextHash: hashStarcraftTmgContract(description),
  };
}

function profileFromRecord(record, combatProfileBundle) {
  const base = getOfficialCombatProfileV1(combatProfileBundle, record.recordKey);
  const assaultWeapons = (record.payload.upgrades || [])
    .map(assaultWeapon)
    .filter(Boolean)
    .sort((left, right) => left.weaponName.localeCompare(right.weaponName));
  if (assaultWeapons.length === 0) {
    fail("official_assault_ranged_weapon_profile_required", record.recordKey);
  }
  return {
    ...structuredClone(base),
    assaultWeapons,
  };
}

function bundleBody(bundle) {
  return without(bundle, ["bundleHash", "profilesByRecordKey"]);
}

export function createOfficialAssaultRangedProfileBundleV1(input = {}) {
  verifyCommandCenterSnapshot(input.snapshot);
  verifyOfficialCommandCenterDataset({ snapshot: input.snapshot, dataset: input.dataset });
  const recordKeys = [...new Set((input.recordKeys || []).map((value) => String(value || "").trim()))]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  if (recordKeys.length === 0 || recordKeys.some((key) => !key.startsWith("army_units:"))) {
    fail("official_assault_ranged_record_keys_invalid");
  }
  const combatProfileBundle = createOfficialCombatProfileBundleV1({
    snapshot: input.snapshot,
    dataset: input.dataset,
    recordKeys,
  });
  const profiles = recordKeys.map((recordKey) => profileFromRecord(
    getOfficialCurrentProductRecord(input.dataset, recordKey),
    combatProfileBundle,
  ));
  const body = {
    schema: OFFICIAL_ASSAULT_RANGED_PROFILE_BUNDLE_SCHEMA,
    sourceId: input.dataset.sourceId,
    sourceSnapshotHash: input.snapshot.snapshotHash,
    normalizedDatasetHash: input.dataset.datasetHash,
    dataVersions: { ...input.dataset.dataVersions },
    combatProfileBundleHash: combatProfileBundle.bundleHash,
    profiles,
    repositoryFallbackAllowed: false,
    productionRoomBindingEligible: false,
    rulesTruth: "official_current_command_center_assault_ranged_profiles",
    trainingTruth: false,
  };
  return deepFreeze({
    ...body,
    bundleHash: hashStarcraftTmgContract(body),
    profilesByRecordKey: Object.fromEntries(profiles.map((profile) => [profile.recordKey, profile])),
  });
}

export function verifyOfficialAssaultRangedProfileBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_ASSAULT_RANGED_PROFILE_BUNDLE_SCHEMA
    || hashStarcraftTmgContract(bundleBody(bundle)) !== bundle.bundleHash
    || bundle.repositoryFallbackAllowed !== false
    || bundle.productionRoomBindingEligible !== false
    || bundle.trainingTruth !== false
    || !Array.isArray(bundle.profiles)
    || bundle.profiles.length === 0) {
    fail("official_assault_ranged_profile_bundle_invalid");
  }
  const expectedIndex = Object.fromEntries(bundle.profiles.map((profile) => [profile.recordKey, profile]));
  if (hashStarcraftTmgContract(expectedIndex) !== hashStarcraftTmgContract(bundle.profilesByRecordKey)) {
    fail("official_assault_ranged_profile_bundle_index_mismatch");
  }
  for (const profile of bundle.profiles) {
    if (!Array.isArray(profile.assaultWeapons) || profile.assaultWeapons.length === 0) {
      fail("official_assault_ranged_profile_invalid", profile.recordKey);
    }
  }
  return true;
}

export function getOfficialAssaultRangedProfileV1(bundle, recordKey) {
  verifyOfficialAssaultRangedProfileBundleV1(bundle);
  const profile = bundle.profilesByRecordKey?.[String(recordKey || "")];
  if (!profile) fail("official_assault_ranged_profile_missing", String(recordKey || ""));
  return profile;
}
