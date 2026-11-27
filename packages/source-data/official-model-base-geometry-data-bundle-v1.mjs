import { verifyOfficialEngineeringImageBaseEstimateV1 } from './official-engineering-image-base-estimate-v1.mjs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual, types } from 'node:util';
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "./official-command-center-adapter-v1.mjs";
import { assertOfficialReleaseSourceV2 } from './official-release-context-v2.mjs';
import { getOfficialReleaseWave3CommunityGeometryV1 } from './official-wave3-community-geometry-profile-v1.mjs';
import { readMeasuredFootprintContourV1 } from '../rule-atoms/measured-footprint-contour-v1.mjs';

export const OFFICIAL_MODEL_BASE_GEOMETRY_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_model_base_geometry_data_bundle_v1";
export const OFFICIAL_MODEL_BASE_GEOMETRY_DATA_BUNDLE_SCHEMA_V2 =
  'starcraft_tmg_official_model_base_geometry_data_bundle_v2';
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
const verifiedImmutableBundles = new WeakSet();
const verifiedImmutableBundlesV2 = new WeakSet();
function immutablePlainGraph(value, visiting = new WeakSet()) {
  if (value === null) return true;
  if (typeof value !== "object") return ["string", "boolean"].includes(typeof value)
    || (typeof value === "number" && Number.isFinite(value));
  if (!Object.isFrozen(value) || visiting.has(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value) ? prototype !== Array.prototype
    : prototype !== Object.prototype && prototype !== null) return false;
  visiting.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || !descriptor || !("value" in descriptor)
      || !immutablePlainGraph(descriptor.value, visiting)) {
      visiting.delete(value); return false;
    }
  }
  visiting.delete(value);
  return true;
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
  if (bundle?.schema === OFFICIAL_MODEL_BASE_GEOMETRY_DATA_BUNDLE_SCHEMA_V2) {
    return verifyOfficialModelBaseGeometryDataBundleV2(bundle);
  }
  if (verifiedImmutableBundles.has(bundle)) return true;
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
  // Only successful, recursively frozen plain data may reuse verification.
  // A matching hash or a shallow freeze is not a cache admission proof.
  if (immutablePlainGraph(bundle)) verifiedImmutableBundles.add(bundle);
  return true;
}

export function getOfficialModelBaseGeometryProfileV1(bundle, recordKey) {
  verifyOfficialModelBaseGeometryDataBundleV1(bundle);
  const profile = bundle.profiles.find((entry) => entry.recordKey === recordKey);
  if (!profile) {
    const missing = bundle.missingProfiles?.find(entry => entry.recordKey === recordKey);
    if (missing) fail('MODEL_BASE_GEOMETRY_SOURCE_MISSING', `${recordKey}:${missing.reason}`);
    fail("MODEL_BASE_GEOMETRY_PROFILE_MISSING", String(recordKey || ""));
  }
  return profile;
}

const ravenRecordKey = 'army_units:raven';
export const OFFICIAL_RAVEN_GEOMETRY_BUNDLE_VERSION = '2.1.0';
export const OFFICIAL_RAVEN_CONTOUR_GEOMETRY_BUNDLE_VERSION = '2.2.0';
const ravenShapeByVersion = {
  [OFFICIAL_RAVEN_GEOMETRY_BUNDLE_VERSION]: 'orthogonal_cross',
  [OFFICIAL_RAVEN_CONTOUR_GEOMETRY_BUNDLE_VERSION]: 'measured_contour',
};
const ravenExtentDocument = 'projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_changelogs/uCBa37ipCfRcBLkdfyId';
const ravenExtentSourceHash = 'c5fe1cf4b776d445a392c0a9b09f81c137f018913dcf87c9609f18741044a5cb';

export function extendOfficialModelBaseGeometryReferencesWithRavenExtentV1({ references, noticeBytes, sourceRef }) {
  if (references?.schema !== 'starcraft_tmg_model_base_geometry_references_v1'
    || references.manifestHash !== hashStarcraftTmgContract(without(references, ['manifestHash']))
    || !sourceRef || !types.isUint8Array(noticeBytes)
    || createHash('sha256').update(noticeBytes).digest('hex') !== ravenExtentSourceHash) {
    fail('RAVEN_EXTENT_FROZEN_SOURCE_REQUIRED');
  }
  const notice = JSON.parse(Buffer.from(noticeBytes).toString('utf8'));
  const html = notice.fields?.content?.stringValue;
  const labels = typeof html === 'string'
    ? [...html.matchAll(/>\s*(Raven Cross (\d+)x(\d+)mm)\s*</gu)]
    : [];
  if (notice.name !== ravenExtentDocument || labels.length !== 1) {
    fail('RAVEN_EXTENT_FROZEN_LABEL_REQUIRED');
  }
  const missing = references.missingProfiles.find(entry => entry.recordKey === ravenRecordKey);
  if (!missing || missing.reason !== 'FLIGHT_STAND_PHYSICAL_FOOTPRINT_UNSPECIFIED'
    || references.profiles.some(entry => entry.recordKey === ravenRecordKey)) {
    fail('RAVEN_EXTENT_REQUIRES_UNRESOLVED_PROFILE');
  }
  const [, printedBase, width, depth] = labels[0];
  const updated = {
    ...missing,
    reason: 'FLIGHT_STAND_EXACT_OUTLINE_UNSPECIFIED',
    required: 'Exact bottom-of-flight-stand outline, including the cross arm widths under core 2.3.',
    confirmedExtent: {
      footprintKind: 'cross', widthMillimetres: Number(width), depthMillimetres: Number(depth),
      printedBase, sourceContentHash: ravenExtentSourceHash,
    },
    sourceRefs: [...missing.sourceRefs, {
      ref: sourceRef, byteHash: ravenExtentSourceHash, byteLength: noticeBytes.byteLength,
      documentName: notice.name, updateTime: notice.updateTime,
    }],
  };
  const body = structuredClone({ ...without(references, ['manifestHash']),
    missingProfiles: references.missingProfiles.map(entry => entry === missing ? updated : entry) });
  return freezeDeep({ ...body, manifestHash: hashStarcraftTmgContract(body) });
}

export function createOfficialModelBaseGeometryDataBundleV2({ context, legacyBundle, references } = {}) {
  const manifest = assertOfficialReleaseSourceV2(context, context || {});
  verifyOfficialModelBaseGeometryDataBundleV1(legacyBundle);
  if (legacyBundle.schema !== OFFICIAL_MODEL_BASE_GEOMETRY_DATA_BUNDLE_SCHEMA) {
    fail('MODEL_BASE_GEOMETRY_LEGACY_REFERENCE_REQUIRED');
  }
  if (references?.schema !== 'starcraft_tmg_model_base_geometry_references_v1'
    || references.sourceDatasetHash !== context.dataset.datasetHash
    || references.sourceSnapshotHash !== context.snapshot.snapshotHash
    || !object(references.sourceFiles) || !Array.isArray(references.profiles)
    || !Array.isArray(references.missingProfiles)
    || references.manifestHash !== hashStarcraftTmgContract(without(references, ['manifestHash']))
    || references.policy?.unprovenDimensionsAllowed !== false) {
    fail('MODEL_BASE_GEOMETRY_REFERENCES_INVALID');
  }
  const unitRecordKeys = context.dataset.recordIndex.filter(entry => entry.collectionId === 'army_units'
    && entry.authorityDisposition === 'official_current_product_candidate').map(entry => entry.recordKey).sort();
  const prior = new Map(legacyBundle.profiles.map(profile => [profile.recordKey, profile]));
  const added = new Map(references.profiles.map(profile => [profile.recordKey, profile]));
  if (added.size !== references.profiles.length
    || [...added.keys()].some(key => prior.has(key) || !unitRecordKeys.includes(key))) {
    fail('MODEL_BASE_GEOMETRY_REFERENCE_DENOMINATOR_INVALID');
  }
  const profiles = [];
  for (const recordKey of unitRecordKeys) {
    const original = prior.get(recordKey);
    const reference = added.get(recordKey);
    if (!original && !reference) continue;
    const record = getOfficialCurrentProductRecord(context.dataset, recordKey);
    if (original) {
      profiles.push({ ...structuredClone(original), unitName: record.payload.name,
        sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash });
      continue;
    }
    const source = references.sourceFiles[reference.sourceId];
    if (!source?.ref || !source.url || !source.byteHash || !Number.isSafeInteger(source.byteLength)
      || reference.visuallyReviewed !== true || reference.unitName !== record.payload.name
      || !Number.isSafeInteger(reference.pdfPage) || reference.pdfPage < 1) {
      fail('MODEL_BASE_GEOMETRY_SOURCE_REFERENCE_INVALID', recordKey);
    }
    profiles.push({ recordKey, unitName: record.payload.name,
      sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      baseShape: reference.baseShape, baseWidthMillimetres: reference.baseWidthMillimetres,
      baseDepthMillimetres: reference.baseDepthMillimetres,
      baseWidthMilliInches: milliInches(reference.baseWidthMillimetres),
      baseDepthMilliInches: milliInches(reference.baseDepthMillimetres), printedBase: reference.printedBase,
      p2pSource: { sourceId: reference.sourceId, sourceContentHash: source.byteHash,
        sourceFileVersion: source.sourceFileVersion, pdfPage: reference.pdfPage,
        field: source.field, commandCenterEquivalentFieldPresent: false },
    });
  }
  const body = {
    schema: OFFICIAL_MODEL_BASE_GEOMETRY_DATA_BUNDLE_SCHEMA_V2, version: '2.0.0',
    sourceLockHash: manifest.source.sourceRevisionHash,
    sourceSnapshotHash: context.snapshot.snapshotHash, normalizedDatasetHash: context.dataset.datasetHash,
    coreRulebookHash: legacyBundle.coreRulebookHash,
    legacyGeometryBundleHash: legacyBundle.bundleHash, geometryReferenceManifestHash: references.manifestHash,
    p2pSourceHashes: { ...legacyBundle.p2pSourceHashes,
      ...Object.fromEntries(Object.entries(references.sourceFiles).map(([id, source]) => [id, source.byteHash])) },
    unitRecordKeys, profiles,
    missingProfiles: structuredClone(references.missingProfiles),
    profileDenominatorComplete: references.missingProfiles.length === 0,
    supportedOfficialBaseShapes: ['rectangle', 'round'], coordinateUnit: 'milli-inch',
    sourcePolicy: { captureMode: 'explicit_release_with_frozen_geometry_references',
      refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
      commandCenterRole: 'current_unit_identity_and_rules_authority',
      p2pRole: 'physical_base_geometry_only' },
    productionRoomEligible: false, rulesTruth: 'official_release_identity_plus_verified_physical_geometry',
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialModelBaseGeometryDataBundleV2(bundle);
  return bundle;
}


function ravenGeometryFields(context) {
  const geometry = getOfficialReleaseWave3CommunityGeometryV1(context);
  const raven = geometry?.settings.raven;
  if (!raven?.measurement) {
    fail('RAVEN_MEASURED_CROSS_OUTLINE_REQUIRED');
  }
  if (raven.measurement.kind === 'engineering_control' && context.manifest.status !== 'candidate') {
    fail('RAVEN_ENGINEERING_OUTLINE_REQUIRES_CANDIDATE');
  }
  const shapeFields = raven.measurement.shape === 'measured_contour'
    ? { localVerticesMilliInches: raven.localVerticesMilliInches }
    : { horizontalArmDepthMillimetres: raven.horizontalArmDepthMm,
      verticalArmWidthMillimetres: raven.verticalArmWidthMm,
      horizontalArmDepthMilliInches: milliInches(raven.horizontalArmDepthMm),
      verticalArmWidthMilliInches: milliInches(raven.verticalArmWidthMm) };
  return {
    baseShape: raven.measurement.shape, baseWidthMillimetres: raven.widthMm, baseDepthMillimetres: raven.depthMm,
    baseWidthMilliInches: milliInches(raven.widthMm), baseDepthMilliInches: milliInches(raven.depthMm),
    ...shapeFields,
    ravenOutlineSource: { ...raven.measurement, sourceUrls: [...raven.sourceUrls],
      communityProfileHash: geometry.profileHash, extentSourceContentHash: ravenExtentSourceHash },
  };
}

export function createOfficialMeasuredRavenGeometryBundleV2(context) {
  const current = getOfficialReleaseModelBaseGeometryBundleV2(context);
  const missing = current.missingProfiles.find(row => row.recordKey === ravenRecordKey);
  const confirmed = missing?.confirmedExtent;
  const outline = ravenGeometryFields(context);
  if (missing?.reason !== 'FLIGHT_STAND_EXACT_OUTLINE_UNSPECIFIED'
    || confirmed?.sourceContentHash !== ravenExtentSourceHash || confirmed.footprintKind !== 'cross'
    || confirmed.widthMillimetres !== outline.baseWidthMillimetres
    || confirmed.depthMillimetres !== outline.baseDepthMillimetres) {
    fail('RAVEN_CROSS_EXTENT_MISMATCH');
  }
  const record = getOfficialCurrentProductRecord(context.dataset, ravenRecordKey);
  const profile = { recordKey: ravenRecordKey, unitName: record.payload.name,
    sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash, ...outline, printedBase: confirmed.printedBase };
  const missingProfiles = current.missingProfiles.filter(row => row.recordKey !== ravenRecordKey);
  const version = outline.baseShape === 'measured_contour'
    ? OFFICIAL_RAVEN_CONTOUR_GEOMETRY_BUNDLE_VERSION : OFFICIAL_RAVEN_GEOMETRY_BUNDLE_VERSION;
  const body = { ...without(current, ['bundleHash']), version,
    profiles: [...current.profiles, profile].sort((left, right) => left.recordKey.localeCompare(right.recordKey)),
    missingProfiles, profileDenominatorComplete: missingProfiles.length === 0,
    supportedOfficialBaseShapes: [outline.baseShape, ...current.supportedOfficialBaseShapes],
    rulesTruth: outline.ravenOutlineSource.kind === 'annotated_assembly_estimate'
      ? 'official_release_identity_plus_tabletop_outline_estimate'
      : 'official_release_identity_plus_source_bound_physical_geometry' };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialModelBaseGeometryDataBundleV2(bundle);
  return bundle;
}

function validRavenCrossProfile(profile) {
  const source = profile.ravenOutlineSource;
  return profile.recordKey === ravenRecordKey
    && Number.isSafeInteger(profile.horizontalArmDepthMilliInches) && profile.horizontalArmDepthMilliInches > 0
    && Number.isSafeInteger(profile.verticalArmWidthMilliInches) && profile.verticalArmWidthMilliInches > 0
    && Number.isFinite(profile.horizontalArmDepthMillimetres) && Number.isFinite(profile.verticalArmWidthMillimetres)
    && profile.horizontalArmDepthMilliInches === milliInches(profile.horizontalArmDepthMillimetres)
    && profile.verticalArmWidthMilliInches === milliInches(profile.verticalArmWidthMillimetres)
    && profile.horizontalArmDepthMilliInches < profile.baseDepthMilliInches
    && profile.verticalArmWidthMilliInches < profile.baseWidthMilliInches
    && source?.extentSourceContentHash === ravenExtentSourceHash;
}

function validRavenContourProfile(profile) {
  if (profile.recordKey !== ravenRecordKey
    || profile.ravenOutlineSource?.shape !== 'measured_contour'
    || profile.ravenOutlineSource?.extentSourceContentHash !== ravenExtentSourceHash) return false;
  const contour = readMeasuredFootprintContourV1(profile.localVerticesMilliInches,
    profile.baseWidthMilliInches, profile.baseDepthMilliInches);
  return isDeepStrictEqual(profile.localVerticesMilliInches, contour);
}

export function verifyOfficialModelBaseGeometryDataBundleV2(bundle) {
  if (verifiedImmutableBundlesV2.has(bundle)) return true;
  const hashPattern = /^[a-f0-9]{64}$/u;
  if (!object(bundle) || bundle.schema !== OFFICIAL_MODEL_BASE_GEOMETRY_DATA_BUNDLE_SCHEMA_V2
    || (bundle.version !== '2.0.0' && !Object.hasOwn(ravenShapeByVersion, bundle.version))
    || !['sourceLockHash', 'sourceSnapshotHash', 'normalizedDatasetHash', 'coreRulebookHash',
      'legacyGeometryBundleHash', 'geometryReferenceManifestHash'].every(field => hashPattern.test(bundle[field]))
    || !Array.isArray(bundle.unitRecordKeys) || !Array.isArray(bundle.profiles)
    || !Array.isArray(bundle.missingProfiles) || !object(bundle.p2pSourceHashes)
    || bundle.profileDenominatorComplete !== (bundle.missingProfiles.length === 0)
    || bundle.coordinateUnit !== 'milli-inch' || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false || bundle.trainingTruth !== false
    || bundle.productionRoomEligible !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) {
    fail('MODEL_BASE_GEOMETRY_DATA_BUNDLE_V2_INVALID');
  }
  const ravenShape = ravenShapeByVersion[bundle.version];
  if (ravenShape && !bundle.profiles.some(profile => profile.baseShape === ravenShape)) {
    fail('RAVEN_CROSS_PROFILE_REQUIRED');
  }
  const keys = new Set();
  for (const profile of bundle.profiles) {
    const ravenOutline = profile.baseShape === ravenShape && ravenShape !== undefined;
    const estimate = profile.engineeringImageEstimate;
    if (estimate) {
      verifyOfficialEngineeringImageBaseEstimateV1(estimate);
      if (bundle.sourcePolicy.engineeringOnly !== true || profile.recordKey !== estimate.recordKey
        || profile.sourceRecordHash !== estimate.sourceRecordHash || profile.payloadHash !== estimate.payloadHash
        || profile.baseShape !== estimate.shape || profile.baseWidthMillimetres !== estimate.diameterMillimetres
        || profile.baseDepthMillimetres !== estimate.diameterMillimetres) fail('ENGINEERING_IMAGE_GEOMETRY_PROFILE_INVALID');
    }
    const p2p = profile.p2pSource;
    if (keys.has(profile.recordKey) || !hashPattern.test(profile.sourceRecordHash)
      || !hashPattern.test(profile.payloadHash) || (!ravenOutline && !['round', 'rectangle'].includes(profile.baseShape))
      || !Number.isFinite(profile.baseWidthMillimetres) || profile.baseWidthMillimetres <= 0
      || !Number.isFinite(profile.baseDepthMillimetres) || profile.baseDepthMillimetres <= 0
      || !Number.isSafeInteger(profile.baseWidthMilliInches) || profile.baseWidthMilliInches <= 0
      || !Number.isSafeInteger(profile.baseDepthMilliInches) || profile.baseDepthMilliInches <= 0
      || profile.baseWidthMilliInches !== milliInches(profile.baseWidthMillimetres)
      || profile.baseDepthMilliInches !== milliInches(profile.baseDepthMillimetres)
      || (profile.baseShape === 'round' && profile.baseWidthMilliInches !== profile.baseDepthMilliInches)
      || (estimate ? false : ravenOutline ? !(ravenShape === 'measured_contour'
        ? validRavenContourProfile(profile) : validRavenCrossProfile(profile))
        : !Number.isSafeInteger(p2p?.pdfPage) || p2p.pdfPage < 1 || !hashPattern.test(p2p.sourceContentHash)
          || p2p.sourceContentHash !== bundle.p2pSourceHashes[p2p.sourceId]
          || p2p.commandCenterEquivalentFieldPresent !== false)) {
      fail('MODEL_BASE_GEOMETRY_DATA_PROFILE_V2_INVALID', String(profile.recordKey || ''));
    }
    keys.add(profile.recordKey);
  }
  for (const missing of bundle.missingProfiles) {
    if (keys.has(missing.recordKey) || !missing.reason || !missing.required || !missing.sourceRefs?.length) {
      fail('MODEL_BASE_GEOMETRY_MISSING_REFERENCE_INVALID', String(missing.recordKey || ''));
    }
    keys.add(missing.recordKey);
  }
  if (keys.size !== bundle.unitRecordKeys.length
    || new Set(bundle.unitRecordKeys).size !== bundle.unitRecordKeys.length
    || bundle.unitRecordKeys.some(key => typeof key !== 'string' || !key.startsWith('army_units:') || !keys.has(key))) {
    fail('MODEL_BASE_GEOMETRY_PROFILE_DENOMINATOR_MISMATCH');
  }
  if (immutablePlainGraph(bundle)) verifiedImmutableBundlesV2.add(bundle);
  return true;
}

// Reuse reviewed ordinary footprints only when the complete unit payload is
// unchanged. Newly added units and settings-dependent outlines remain missing.
export function rebindOfficialUnchangedModelGeometryV2({ context, previousBundle }) {
  const manifest = assertOfficialReleaseSourceV2(context, context || {});
  verifyOfficialModelBaseGeometryDataBundleV2(previousBundle);
  const unitRecordKeys = context.dataset.recordIndex.filter(row => row.recordType === 'unit'
    && row.authorityDisposition === 'official_current_product_candidate').map(row => row.recordKey).sort();
  const profiles = [];
  const missingProfiles = [];
  for (const recordKey of unitRecordKeys) {
    const record = context.dataset.recordsByKey[recordKey];
    const prior = previousBundle.profiles.find(row => row.recordKey === recordKey);
    if (prior && prior.payloadHash !== record.payloadHash) fail('MODEL_GEOMETRY_REBIND_UNIT_CHANGED', recordKey);
    if (prior && ['round', 'rectangle'].includes(prior.baseShape)) {
      profiles.push({ ...structuredClone(prior), sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash });
    } else {
      missingProfiles.push({ recordKey, unitName: record.payload.name,
        reason: 'NO_UNCHANGED_ORDINARY_REVIEWED_FOOTPRINT', required: 'Reviewed geometry bound to this release; no inferred dimensions.',
        sourceRefs: [{ previousGeometryBundleHash: previousBundle.bundleHash }] });
    }
  }
  const body = { ...without(previousBundle, ['bundleHash']), version: '2.0.0',
    sourceLockHash: manifest.source.sourceRevisionHash, sourceSnapshotHash: context.snapshot.snapshotHash,
    normalizedDatasetHash: context.dataset.datasetHash, priorGeometryBundleHash: previousBundle.bundleHash,
    unitRecordKeys, profiles, missingProfiles, profileDenominatorComplete: missingProfiles.length === 0 };
  const result = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialModelBaseGeometryDataBundleV2(result);
  return result;
}

export function createOfficialEngineeringImageGeometryV1({ context, baseGeometry, estimate }) {
  assertOfficialReleaseSourceV2(context, context || {});
  verifyOfficialModelBaseGeometryDataBundleV2(baseGeometry);
  verifyOfficialEngineeringImageBaseEstimateV1(estimate);
  const record = context.dataset.recordsByKey[estimate.recordKey];
  if (context.allowEngineeringEstimatedGeometry !== true || record?.sourceRecordHash !== estimate.sourceRecordHash
    || record?.payloadHash !== estimate.payloadHash || baseGeometry.normalizedDatasetHash !== context.dataset.datasetHash
    || !baseGeometry.missingProfiles.some(row => row.recordKey === estimate.recordKey)) {
    fail('ENGINEERING_IMAGE_GEOMETRY_SOURCE_INVALID');
  }
  const diameter = estimate.diameterMillimetres;
  const profile = { recordKey: record.recordKey, unitName: record.payload.name,
    sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash, baseShape: 'round',
    baseWidthMillimetres: diameter, baseDepthMillimetres: diameter,
    baseWidthMilliInches: milliInches(diameter), baseDepthMilliInches: milliInches(diameter),
    printedBase: `ESTIMATE ONLY: round ${diameter}mm`, engineeringImageEstimate: estimate };
  const missingProfiles = baseGeometry.missingProfiles.filter(row => row.recordKey !== record.recordKey);
  const body = { ...without(baseGeometry, ['bundleHash']),
    profiles: [...baseGeometry.profiles, profile].sort((a, b) => a.recordKey.localeCompare(b.recordKey)),
    missingProfiles, profileDenominatorComplete: missingProfiles.length === 0,
    sourcePolicy: { ...baseGeometry.sourcePolicy, engineeringOnly: true, captureMode: 'conditional_official_image_estimate' } };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialModelBaseGeometryDataBundleV2(bundle);
  return bundle;
}

export function getOfficialReleaseModelBaseGeometryBundleV2(context) {
  const manifest = assertOfficialReleaseSourceV2(context, context || {});
  const bundle = context.resources?.geometry;
  verifyOfficialModelBaseGeometryDataBundleV2(bundle);
  if (bundle.sourcePolicy.engineeringOnly === true && context.allowEngineeringEstimatedGeometry !== true) {
    fail('ENGINEERING_IMAGE_GEOMETRY_NOT_ADMITTED');
  }
  if (bundle.sourceSnapshotHash !== manifest.source.snapshotHash
    || bundle.normalizedDatasetHash !== manifest.source.datasetHash
    || bundle.sourceLockHash !== manifest.source.sourceRevisionHash
    || manifest.components.geometry?.integrity?.field !== 'bundleHash'
    || manifest.components.geometry.integrity.value !== bundle.bundleHash) {
    fail('MODEL_BASE_GEOMETRY_RELEASE_SOURCE_MISMATCH');
  }
  if (Object.hasOwn(ravenShapeByVersion, bundle.version)) {
    const expected = ravenGeometryFields(context);
    const raven = bundle.profiles.find(row => row.recordKey === ravenRecordKey);
    if (manifest.components.geometry.version !== bundle.version || !raven
      || Object.entries(expected).some(([field, value]) => !isDeepStrictEqual(raven[field], value))) {
      fail('RAVEN_CROSS_RELEASE_SOURCE_MISMATCH');
    }
  }
  return bundle;
}
