import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "./official-command-center-adapter-v1.mjs";

export const OFFICIAL_MODEL_BASE_GEOMETRY_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_model_base_geometry_data_bundle_v1";
export const OFFICIAL_MODEL_BASE_GEOMETRY_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
export const OFFICIAL_MODEL_BASE_GEOMETRY_P2P_HASHES = Object.freeze({
  protoss_p2p: "4e8547b2df8d545df3d0ebb7d7821521a888dc0437d6f4dde21d82145337a212",
  terran_p2p: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
  zerg_p2p: "6810f46ee422ac5d8f3cc169c3eda3ccb9551f01ab71a1f7e4ac8c266817b364",
});

const PROFILE_ROWS = Object.freeze([
  ["adept", "Adept", "protoss_p2p", 1, "round", 40, 40, "Ø 40MM"],
  ["artanis", "Artanis", "protoss_p2p", 2, "round", 40, 40, "Ø 40MM"],
  ["corpser__roach_", "Corpser (Roach)", "zerg_p2p", 7, "round", 50, 50, "Ø 50MM"],
  ["goliath", "Goliath", "terran_p2p", 7, "round", 80, 80, "Ø 80MM"],
  ["hydralisk", "Hydralisk", "zerg_p2p", 1, "rectangle", 40, 100, "40×100MM"],
  ["jim_raynor", "Jim Raynor", "terran_p2p", 4, "round", 40, 40, "Ø 40MM"],
  ["kerrigan", "Kerrigan", "zerg_p2p", 2, "round", 40, 40, "Ø 40MM"],
  ["kerrigan_swarm_raptor__zergling_", "Kerrigan Swarm Raptor (Zergling)",
    "zerg_p2p", 4, "round", 32, 32, "Ø 32MM"],
  ["marauder", "Marauder", "terran_p2p", 2, "round", 50, 50, "Ø 50MM"],
  ["marine", "Marine", "terran_p2p", 1, "round", 32, 32, "Ø 32MM"],
  ["medic", "Medic", "terran_p2p", 3, "round", 32, 32, "Ø 32MM"],
  ["omega_worm", "Omega Worm", "zerg_p2p", 3, "round", 80, 80, "Ø 80MM"],
  ["point_defense_drone", "Point Defense Drone", "terran_p2p", 5,
    "round", 32, 32, "Ø 32MM"],
  ["praetor_guard__zealot_", "Praetor Guard (Zealot)", "protoss_p2p", 3,
    "round", 40, 40, "Ø 40MM"],
  ["pylon", "Pylon", "protoss_p2p", 4, "round", 80, 80, "Ø 80MM"],
  ["queen", "Queen", "zerg_p2p", 5, "round", 80, 80, "Ø 80MM"],
  ["raptor__zergling_", "Raptor (Zergling)", "zerg_p2p", 11,
    "round", 32, 32, "Ø 32MM"],
  ["raynor_s_raider__marine_", "Raynor's Raider (Marine)", "terran_p2p", 6,
    "round", 32, 32, "Ø 32MM"],
  ["roach", "Roach", "zerg_p2p", 6, "round", 50, 50, "Ø 50MM"],
  ["roachling", "Roachling", "zerg_p2p", 8, "round", 32, 32, "Ø 32MM"],
  ["sentry", "Sentry", "protoss_p2p", 5, "round", 50, 50, "Ø 50MM"],
  ["stalker", "Stalker", "protoss_p2p", 6, "round", 80, 80, "Ø 80MM"],
  ["swarmling__zergling_", "Swarmling (Zergling)", "zerg_p2p", 12,
    "round", 32, 32, "Ø 32MM"],
  ["vile__roach_", "Vile (Roach)", "zerg_p2p", 9, "round", 50, 50, "Ø 50MM"],
  ["zealot", "Zealot", "protoss_p2p", 7, "round", 40, 40, "Ø 40MM"],
  ["zergling", "Zergling", "zerg_p2p", 10, "round", 32, 32, "Ø 32MM"],
]);

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
function milliInches(millimetres) {
  return Math.round((Number(millimetres) / 25.4) * 1000);
}

export function createOfficialModelBaseGeometryDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH) {
    fail("MODEL_BASE_GEOMETRY_DATASET_INVALID");
  }
  const currentKeys = dataset.recordIndex.filter((entry) => (
    entry.collectionId === "army_units"
      && entry.authorityDisposition === "official_current_product_candidate"
  )).map((entry) => entry.recordKey).sort();
  const expectedKeys = PROFILE_ROWS.map((entry) => `army_units:${entry[0]}`).sort();
  if (hashStarcraftTmgContract(currentKeys) !== hashStarcraftTmgContract(expectedKeys)) {
    fail("MODEL_BASE_GEOMETRY_PROFILE_DENOMINATOR_MISMATCH");
  }
  const profiles = PROFILE_ROWS.map(([recordId, expectedName, sourceId, pdfPage,
    baseShape, widthMm, depthMm, printedBase]) => {
    const recordKey = `army_units:${recordId}`;
    const record = getOfficialCurrentProductRecord(dataset, recordKey);
    if (record.payload.name !== expectedName) {
      fail("MODEL_BASE_GEOMETRY_UNIT_NAME_DRIFT", recordKey);
    }
    return {
      recordKey,
      unitName: expectedName,
      sourceRecordHash: record.sourceRecordHash,
      payloadHash: record.payloadHash,
      baseShape,
      baseWidthMillimetres: widthMm,
      baseDepthMillimetres: depthMm,
      baseWidthMilliInches: milliInches(widthMm),
      baseDepthMilliInches: milliInches(depthMm),
      printedBase,
      p2pSource: {
        sourceId,
        sourceContentHash: OFFICIAL_MODEL_BASE_GEOMETRY_P2P_HASHES[sourceId],
        sourceFileVersion: "May 2026 v1.0",
        pdfPage,
        field: "printed_base_footprint",
        commandCenterEquivalentFieldPresent: false,
      },
    };
  }).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  const body = {
    schema: OFFICIAL_MODEL_BASE_GEOMETRY_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_MODEL_BASE_GEOMETRY_CORE_RULEBOOK_HASH,
    p2pSourceHashes: OFFICIAL_MODEL_BASE_GEOMETRY_P2P_HASHES,
    profileDenominatorComplete: true,
    profiles,
    supportedOfficialBaseShapes: ["rectangle", "round"],
    coordinateUnit: "milli-inch",
    sourcePolicy: {
      captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false,
      commandCenterRole: "current_unit_identity_and_rules_authority",
      p2pRole: "current_official_base_shape_and_size_authority",
    },
    productionRoomEligible: false,
    rulesTruth: "official_current_unit_identity_plus_p2p_base_geometry",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialModelBaseGeometryDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialModelBaseGeometryDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_MODEL_BASE_GEOMETRY_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_MODEL_BASE_GEOMETRY_CORE_RULEBOOK_HASH
    || bundle.profileDenominatorComplete !== true
    || !Array.isArray(bundle.profiles) || bundle.profiles.length !== 26
    || bundle.profiles.filter((entry) => entry.baseShape === "round").length !== 25
    || bundle.profiles.filter((entry) => entry.baseShape === "rectangle").length !== 1
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("MODEL_BASE_GEOMETRY_DATA_BUNDLE_INVALID");
  }
  const ids = new Set();
  for (const profile of bundle.profiles) {
    if (!String(profile.recordKey || "").startsWith("army_units:")
      || ids.has(profile.recordKey)
      || !["round", "rectangle"].includes(profile.baseShape)
      || !Number.isSafeInteger(profile.baseWidthMilliInches)
      || !Number.isSafeInteger(profile.baseDepthMilliInches)
      || profile.baseWidthMilliInches <= 0 || profile.baseDepthMilliInches <= 0
      || profile.p2pSource?.sourceContentHash
        !== OFFICIAL_MODEL_BASE_GEOMETRY_P2P_HASHES[profile.p2pSource?.sourceId]
      || profile.p2pSource?.commandCenterEquivalentFieldPresent !== false) {
      fail("MODEL_BASE_GEOMETRY_DATA_PROFILE_INVALID", String(profile?.recordKey || ""));
    }
    if (profile.baseShape === "round"
      && profile.baseWidthMilliInches !== profile.baseDepthMilliInches) {
      fail("MODEL_BASE_GEOMETRY_ROUND_PROFILE_INVALID", profile.recordKey);
    }
    ids.add(profile.recordKey);
  }
  return true;
}

export function getOfficialModelBaseGeometryProfileV1(bundle, recordKey) {
  verifyOfficialModelBaseGeometryDataBundleV1(bundle);
  const profile = bundle.profiles.find((entry) => entry.recordKey === recordKey);
  if (!profile) fail("MODEL_BASE_GEOMETRY_PROFILE_MISSING", String(recordKey || ""));
  return profile;
}
