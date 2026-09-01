import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialDeploymentGeometryDataBundleV1 } from
  "./official-deployment-geometry-data-bundle-v1.mjs";
import {
  createOfficialModelBaseGeometryDataBundleV1,
  verifyOfficialModelBaseGeometryDataBundleV1,
} from "./official-model-base-geometry-data-bundle-v1.mjs";

export const OFFICIAL_BALANCED_TERRAIN_RULES_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_balanced_terrain_rules_data_bundle_v1";

const CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const PART_9_REVIEW_PACKET_HASH =
  "5efca96c848666c2df30a0ca0eecb86daa0e78d7633f1e4119ca9e15e6ce7623";
const PART_12_REVIEW_PACKET_HASH =
  "adbb3f56aae3c75572a8de3d4d278be9ba83867b64dd0338991f4c10c056c1a3";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

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
function clause(atomId, clauseId, sourceTextHashes) {
  const body = { atomId, clauseIds: [clauseId], sourceTextHashes,
    sourceAuthority: "official_primary" };
  return { ...body, candidateSequenceHash: hashStarcraftTmgContract(body) };
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:singleton:core-12-1-set-balanced-terrain:00bb00c10ff7",
    "core:12.1:set-balanced-terrain",
    ["559fc35a3ec802ae217cb9917bed9bedfeaa5fabe148a221bfadfcc8ee21f2aa"]),
  clause("rule-atom:singleton:core-9-3-centre-significant-terrain:066aeb9df796",
    "core:9.3:centre-significant-terrain",
    ["85c53ed1ca6634a1acc50047c775115c769b58420d9be4fe74975003dad602e9"]),
  clause("rule-atom:singleton:core-9-3-fire-lane-requirement:0e26a394f7e6",
    "core:9.3:fire-lane-requirement",
    ["1550668f703867584c88f6c16f61c2330b665091784cb1b206baa2e03b18dd7b"]),
  clause("rule-atom:singleton:core-9-3-grass-terrain-count:47f3dec12027",
    "core:9.3:grass-terrain-count",
    ["0dc212fd384747aca08c8cdc64ff8029f7b2321892475da1290558e47d92333a"]),
  clause("rule-atom:singleton:core-9-3-grass-terrain-effects:432dd26ff77f",
    "core:9.3:grass-terrain-effects",
    ["f167b140bcaacce310a3a1dd9b8fffbe290d7f9810d18792817a4ab8f5e29665"]),
  clause("rule-atom:singleton:core-9-3-impassable-terrain-relocation:29b2089ecf0c",
    "core:9.3:impassable-terrain-relocation",
    ["f5edbf44ed777b32c2aac14c44601313a02bd9fa61e981b606edd0da7d0214bd"]),
  clause("rule-atom:singleton:core-9-3-large-terrain-access-point:cdc152e8b025",
    "core:9.3:large-terrain-access-point",
    ["1bd683efdcffc729b2c42d935585899b4e660e23e209fa611cfb30b49123f8ce"]),
  clause("rule-atom:singleton:core-9-3-size-one-terrain-count:82f6d0b9b519",
    "core:9.3:size-one-terrain-count",
    ["b9f32a737cc36f77cb37759bde6917023886fb23f37fbfdd84ab54c13d5fc25a"]),
  clause("rule-atom:singleton:core-9-3-size-one-terrain-effects:801815c33830",
    "core:9.3:size-one-terrain-effects",
    ["f3265c64118eccb982b4fee29f7b3041e2f78b846edf3858e97780409ba2df65"]),
  clause("rule-atom:singleton:core-9-3-size-three-terrain-count:26e30b15f8e1",
    "core:9.3:size-three-terrain-count",
    ["1a400a6ec7e6c06cfac149ab0cc9706726a53ad9f171ee86eeedf84f786a0f3d"]),
  clause("rule-atom:singleton:core-9-3-size-three-terrain-effects:14b5a1ba4a6f",
    "core:9.3:size-three-terrain-effects",
    ["221688208c6ae88452cb0fb8dfad6af0ea6016f794d058ffe0835856b452e8d9"]),
  clause("rule-atom:singleton:core-9-3-size-two-terrain-count:d375e7bbff60",
    "core:9.3:size-two-terrain-count",
    ["3d8d62878ab887d9d1df5f54b30e524324da7f15ad00d179739db75dd73d4121"]),
  clause("rule-atom:singleton:core-9-3-size-two-terrain-effects:b5a5dc0038ef",
    "core:9.3:size-two-terrain-effects",
    ["af3ac9ddfbeb97bc71d62878897ceea296f5c05259e70626f49e66fb44aee99c"]),
  clause("rule-atom:singleton:core-9-3-terrain-guideline-scaling:4f33fb35708c",
    "core:9.3:terrain-guideline-scaling",
    ["fce21fc38fd2d8b64af135e95046b88762f1d712dc2ee1530fb33d482c0075ab"]),
  clause("rule-atom:singleton:core-9-3-terrain-quadrant-distribution:225ecb5c33c8",
    "core:9.3:terrain-quadrant-distribution", [
      "f7776749052da19b29c5f0cd2230cf4cd4d775aaf38ebfa9c679eacc2689dcae",
      "469145f3082625181af1a7962dd6bb387cef615f4c91571f48b039acd53ef07b",
      "10b9c19c9166703aa190cb9fd7eb775cfe157ad0bca6e20909bdb1f0da29a995",
    ]),
  clause("rule-atom:singleton:core-9-3-terrain-selection-or-alternating-placement:e7941b183c8a",
    "core:9.3:terrain-selection-or-alternating-placement",
    ["336a7450dcd2f5b249cc5e04f5475adba4aaaec6a70ca6f3070ecfdd4022a357"]),
  clause("rule-atom:singleton:core-9-3-total-and-size-zero-terrain-count:a27d7a8ab649",
    "core:9.3:total-and-size-zero-terrain-count",
    ["38afd23841aa11b3fd4ba84ab429e375eebfad85234153c18911d92076a254c5"]),
]);

const STANDARD_GUIDELINES = Object.freeze({
  total: { minimum: 8, maximum: 12 },
  size0: { minimum: 0, maximum: 2 },
  size1: { minimum: 2, maximum: 4 },
  size2: { minimum: 6, maximum: 8 },
  size3PlusWhenAvailable: { minimum: 1, maximum: 2 },
  grass: { minimum: 4, maximum: 6 },
});

const TERRAIN_EFFECTS = Object.freeze({
  size0: { movement: "slice84_size_zero_one_passable",
    lineOfSight: "slice84_independent_terrain_assessment" },
  size1: { cover: "slice84_standard_cover", lineOfSight:
      "does_not_block_models_larger_than_size_one" },
  size2: { movement: "slice84_size_two_plus_blocks_without_opening",
    lineOfSight: "slice84_blocking_terrain_and_cover",
    strategicRole: ["fire_lane_boundary", "chokepoint"] },
  size3Plus: { elevation: "slice85_high_ground_effective_size",
    lineOfSight: "slice84_blocks_almost_everything_subject_to_exact_size_rules" },
  grass: { size: 2, movement: "slice86_does_not_block_movement",
    lineOfSight: "slice86_standard_cover_line_of_sight",
    lifecycle: "slice86_removed_when_ground_model_ends_on_it" },
});

function mapProfile(engagementScale, dieFaces, outcome, printedPage) {
  const body = { schema: "starcraft_tmg_official_premade_terrain_map_profile_v1",
    mapId: `${engagementScale.toLowerCase()}-${dieFaces === 6 ? "d6" : "d3"}-${outcome}`,
    engagementScale, selectionDie: `D${dieFaces}`, outcome, printedPage,
    sourceContentHash: CORE_RULES_HASH,
    sourceImageKind: "official_rulebook_map_layout",
    physicalPlacementRequiresTabletopConformanceConfirmation: true,
    machineTranscribedTerrainCoordinatesAvailable: false,
    sourceRefreshPerformed: false, trainingTruth: false };
  return { ...body, mapHash: hashStarcraftTmgContract(body) };
}

const PREMADE_MAPS = Object.freeze([
  ...Array.from({ length: 6 }, (_, index) => mapProfile("Standard", 6,
    index + 1, 116 + index)),
  ...Array.from({ length: 3 }, (_, index) => mapProfile("Skirmish", 3,
    index + 1, 122 + index)),
]);

export function createOfficialBalancedTerrainRulesDataBundleV1(input = {}) {
  const dataset = input.dataset;
  const geometryBundle = input.deploymentGeometryDataBundle;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false) {
    fail("BALANCED_TERRAIN_DATASET_INVALID");
  }
  verifyOfficialDeploymentGeometryDataBundleV1(geometryBundle);
  if (geometryBundle.normalizedDatasetHash !== dataset.datasetHash) {
    fail("BALANCED_TERRAIN_GEOMETRY_DATA_MISMATCH");
  }
  const modelBaseBundle = createOfficialModelBaseGeometryDataBundleV1({ dataset });
  verifyOfficialModelBaseGeometryDataBundleV1(modelBaseBundle);
  const maximumCurrentBaseDepthMm = Math.max(...modelBaseBundle.profiles.map((entry) => (
    entry.baseDepthMillimetres
  )));
  const body = { schema: OFFICIAL_BALANCED_TERRAIN_RULES_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulesHash: CORE_RULES_HASH,
    part9ReviewPacketHash: PART_9_REVIEW_PACKET_HASH,
    part12ReviewPacketHash: PART_12_REVIEW_PACKET_HASH,
    deploymentGeometryDataBundleHash: geometryBundle.bundleHash,
    modelBaseGeometryDataBundleHash: modelBaseBundle.bundleHash,
    ruleClauses: structuredClone(RULE_CLAUSES),
    standardReference: { widthInches: 54, heightInches: 36,
      areaSquareInches: 1944 },
    standardGuidelines: structuredClone(STANDARD_GUIDELINES),
    categorySemantics: {
      grassIsSize2Special: true,
      grassCountsTowardSize2: true,
      everyPieceCountsTowardTotal: true,
      categoryRangesAreIndependentConstraintsNotAdditiveBuckets: true,
      size3PlusAvailabilityIsSetupInput: true,
    },
    terrainEffects: structuredClone(TERRAIN_EFFECTS),
    distributionContract: { quadrantCount: 4,
      significantMinimumPerQuadrant: 2, significantMinimumSize: 2,
      centreRadiusInches: 6, centreSignificantMinimum: 1,
      fireLaneMinimumCount: 2, fireLaneMinimumWidthInches: 6,
      majorStructureMinimumSeparationInches: 3,
      manoeuvreWitnessMinimumWidthInches: maximumCurrentBaseDepthMm / 25.4,
      manoeuvreWitnessCurrentBaseDepthMillimetres: maximumCurrentBaseDepthMm,
      largeStandableMinimumSize: 3,
      largeStandableGroundReachabilityRequired: true },
    placementMethods: { officialPremade: { standardDie: "D6", skirmishDie: "D3",
      physicalLayoutConfirmationRequired: true },
    alternating: { firstColour: "red", alternatingOnePieceAtATime: true } },
    premadeMaps: structuredClone(PREMADE_MAPS),
    premadeMapIndexHash: hashStarcraftTmgContract(PREMADE_MAPS),
    counts: { promotedAtoms: 17, premadeMaps: 9, standardPremadeMaps: 6,
      skirmishPremadeMaps: 3 },
    boundedGeometryAuthority: "axis_aligned_terrain_rectangles_and_straight_clearance_lanes",
    sourcePolicy: { refreshDuringDevelopment: false, repositoryFallbackAllowed: false },
    rulesTruth: "official_balanced_terrain_setup_contract",
    trainingTruth: false };
  return freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialBalancedTerrainRulesDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_BALANCED_TERRAIN_RULES_DATA_BUNDLE_SCHEMA
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulesHash !== CORE_RULES_HASH
    || bundle.part9ReviewPacketHash !== PART_9_REVIEW_PACKET_HASH
    || bundle.part12ReviewPacketHash !== PART_12_REVIEW_PACKET_HASH
    || bundle.ruleClauses?.length !== 17 || bundle.premadeMaps?.length !== 9
    || bundle.premadeMapIndexHash !== hashStarcraftTmgContract(bundle.premadeMaps)
    || bundle.categorySemantics?.grassCountsTowardSize2 !== true
    || bundle.categorySemantics?.categoryRangesAreIndependentConstraintsNotAdditiveBuckets
      !== true
    || bundle.distributionContract?.fireLaneMinimumWidthInches !== 6
    || bundle.distributionContract?.majorStructureMinimumSeparationInches !== 3
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.trainingTruth !== false) {
    fail("BALANCED_TERRAIN_DATA_BUNDLE_INVALID");
  }
  if (bundle.ruleClauses.some((entry) => !HASH_PATTERN.test(entry.candidateSequenceHash))
    || bundle.premadeMaps.some((entry) => !HASH_PATTERN.test(entry.mapHash))) {
    fail("BALANCED_TERRAIN_DATA_BUNDLE_INVALID");
  }
  return true;
}

export function getOfficialPremadeTerrainMapProfileV1(bundle, mapId) {
  verifyOfficialBalancedTerrainRulesDataBundleV1(bundle);
  const profile = bundle.premadeMaps.find((entry) => entry.mapId === mapId);
  if (!profile) fail("BALANCED_TERRAIN_PREMADE_MAP_UNKNOWN", String(mapId || ""));
  return profile;
}
