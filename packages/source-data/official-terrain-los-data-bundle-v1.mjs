import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "./official-command-center-adapter-v1.mjs";

export const OFFICIAL_TERRAIN_LOS_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_terrain_los_data_bundle_v1";
export const OFFICIAL_TERRAIN_LOS_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function parseSize(value, tags, recordKey) {
  if (value === "-" && tags.includes("flying")) return null;
  if (!/^\d+$/u.test(String(value || ""))) fail("TERRAIN_LOS_PRINTED_SIZE_INVALID", recordKey);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 9) {
    fail("TERRAIN_LOS_PRINTED_SIZE_INVALID", recordKey);
  }
  return parsed;
}

export function verifyOfficialTerrainLosDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_TERRAIN_LOS_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_TERRAIN_LOS_CORE_RULEBOOK_HASH
    || bundle.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false
    || bundle.rulesTruth !== "official_current_unit_size_and_core_terrain_los_source"
    || bundle.trainingTruth !== false
    || !Array.isArray(bundle.profiles) || bundle.profiles.length !== 26
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("TERRAIN_LOS_DATA_BUNDLE_INVALID");
  }
  const ids = new Set();
  for (const profile of bundle.profiles) {
    if (!object(profile) || !String(profile.recordKey || "").startsWith("army_units:")
      || ids.has(profile.recordKey)
      || !/^[a-f0-9]{64}$/u.test(String(profile.sourceRecordHash || ""))
      || !/^[a-f0-9]{64}$/u.test(String(profile.payloadHash || ""))
      || !Array.isArray(profile.combatTags) || profile.combatTags.length === 0
      || !(profile.printedSize === null
        || (Number.isSafeInteger(profile.printedSize) && profile.printedSize >= 0))) {
      fail("TERRAIN_LOS_DATA_PROFILE_INVALID", String(profile?.recordKey || ""));
    }
    ids.add(profile.recordKey);
    if (profile.printedSize === null && !profile.combatTags.includes("flying")) {
      fail("TERRAIN_LOS_NULL_SIZE_NON_FLYING_INVALID", profile.recordKey);
    }
  }
  return true;
}

export function createOfficialTerrainLosDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || !Array.isArray(dataset.recordIndex)) {
    fail("TERRAIN_LOS_DATASET_INVALID");
  }
  const recordKeys = dataset.recordIndex.filter((entry) => (
    entry.collectionId === "army_units"
      && entry.authorityDisposition === "official_current_product_candidate"
  )).map((entry) => entry.recordKey).sort();
  const profiles = recordKeys.map((recordKey) => {
    const record = getOfficialCurrentProductRecord(dataset, recordKey);
    const combatTags = String(record.payload.tags || "").split(",")
      .map((entry) => entry.trim().toLowerCase()).filter(Boolean).sort();
    return {
      recordKey, sourceRecordHash: record.sourceRecordHash,
      payloadHash: record.payloadHash, unitName: record.payload.name,
      printedSize: parseSize(record.payload.stats?.size, combatTags, recordKey),
      combatTags,
    };
  });
  const body = {
    schema: OFFICIAL_TERRAIN_LOS_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_TERRAIN_LOS_CORE_RULEBOOK_HASH,
    sourceLocators: [
      { section: "7.1", printedPages: [45, 46], scope: "line_of_sight_and_cover" },
      { section: "7.1.2", printedPages: [48], scope: "top_down_terrain_surface" },
      { section: "8.5.3", printedPages: [56, 57], scope: "terrain_movement" },
      { section: "11", printedPages: [82, 91], scope: "glossary_cross_check" },
    ],
    profiles,
    repositoryFallbackAllowed: false,
    productionRoomEligible: false,
    rulesTruth: "official_current_unit_size_and_core_terrain_los_source",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialTerrainLosDataBundleV1(bundle);
  return bundle;
}
