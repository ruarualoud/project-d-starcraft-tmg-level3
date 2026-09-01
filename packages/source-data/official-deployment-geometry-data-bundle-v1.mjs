import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { OFFICIAL_FAQ_SUPPLEMENTAL_CLAUSE_BINDING_V3 } from
  "../../content/official-faq-supplemental-clause-binding-v3.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import {
  createOfficialMissionDeploymentDraftDataBundleV1,
  verifyOfficialMissionDeploymentDraftDataBundleV1,
} from "./official-mission-deployment-draft-data-bundle-v1.mjs";

export const OFFICIAL_DEPLOYMENT_GEOMETRY_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_deployment_geometry_data_bundle_v1";

const CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const TERRAN_P2P_HASH =
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c";
const FAQ_CONTENT_HASH =
  "e894f5f0a7da88776df7e399d2156acf69cc40284c1f231907f28dd990b0cd92";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function clause(atomId, clauseId, sourceTextHash, sourceAuthority = "official_primary") {
  const body = { atomId, clauseIds: [clauseId], sourceTextHashes: [sourceTextHash],
    sourceAuthority };
  return { ...body, candidateSequenceHash: hashStarcraftTmgContract(body) };
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:mission-marker-full-specification",
    "core:7.3.2:mission-marker",
    "154caae293b6a6df99aef0d42f17985c80b47f00fb0662981c687aea14f5e413"),
  clause("rule-atom:singleton:core-11-mission-marker-setup:13c7450b893e",
    "core:11:mission-marker-setup",
    "f3d754e70f2f777213927122d3f79de2a21117993f413bff9840ad6eec818bde"),
  clause("rule-atom:singleton:core-12-1-set-mission-markers:1a3973119a39",
    "core:12.1:set-mission-markers",
    "1da6dbf29d20a85423756bee779e1d1a45245f44217a6c3065e5e62cd19396b5"),
  clause("rule-atom:singleton:core-9-3-battlefield-setup-order:708f23b58fba",
    "core:9.3:battlefield-setup-order",
    "10f2b71431f652c49424239caebdfa9f0e9f2fe1d3b13fe48f83a93c88918997"),
  clause("rule-atom:singleton:core-9-3-deployment-entry-edges:f208ddd78c25",
    "core:9.3:deployment-entry-edges",
    "bae78805f1ab7a92f232b969013a2a3c66335c97b6f35369fa1a67f00362d7da"),
  clause("rule-atom:singleton:core-9-3-deployment-table-dimensions:9ec80305904c",
    "core:9.3:deployment-table-dimensions",
    "7e544a347e241b0e976e0d12a6da32aafbe1ff6eb4d9e1ab260b45123012238d"),
  clause("rule-atom:singleton:core-9-3-mission-marker-coordinates:4c82510823eb",
    "core:9.3:mission-marker-coordinates",
    "000e7fb6567df3dbdab486632e748f0cf644c9657619e661230e0edcaa2957aa"),
  clause("rule-atom:singleton:core-9-3-mission-marker-elevation:d629af1e14c1",
    "core:9.3:mission-marker-elevation",
    "7cfe3c0ea075ec5ec372770f56fb45143b61452c6a2898b4f675c67bbfc3901a"),
  clause("rule-atom:singleton:core-9-3-mission-marker-impassable-prohibition:336f72310fdc",
    "core:9.3:mission-marker-impassable-prohibition",
    "9f6f1472271e90ad58b4422ec63010be2cb4ea3591a22ee549bf097268333cc0"),
  clause("rule-atom:singleton:core-9-3-zone-of-influence-corner-markers:f32222510e15",
    "core:9.3:zone-of-influence-corner-markers",
    "7720dd0272bd150f41b3abc4d597fc91146fb85c3a1a9120d4f38a2df7f72026"),
  clause("rule-atom:singleton:faq-9-43-skirmish-battlefield-dimensions:f2e95675daaa",
    "faq:9.43:skirmish-battlefield-dimensions",
    "4baffdc5fea962bcb4a692ff26079c7f005f9320767b3cb42fda194766521224",
    "official_mutable_supplement"),
  clause("rule-atom:singleton:faq-9-46-terrain-height-tier-game-start:adda69721608",
    "faq:9.46:terrain-height-tier-game-start",
    "127ba2bbd5d25e38e6efe1e8651a2f7ba91eda8a9677557ca58f8bea10a1c1cc",
    "official_mutable_supplement"),
]);

const RAW_GEOMETRY = Object.freeze({
  "ABANDONED CAMP": { dimensions: [36, 36],
    red: [["bottom", 0, 36]], blue: [["top", 0, 36]],
    markers: [[1, 6, 18], [2, 30, 18], [5, 18, 18]] },
  "AGRIA VALLEY": { dimensions: [36, 36],
    red: [["top", 0, 12], ["left", 24, 36]],
    blue: [["bottom", 24, 36], ["right", 0, 12]],
    markers: [[1, 6, 6], [2, 30, 30], [5, 18, 18]] },
  "CHAR PLAINS": { dimensions: [36, 36],
    red: [["bottom", 18, 36]], blue: [["top", 18, 36]],
    markers: [[1, 6, 6], [2, 6, 30], [5, 24, 18]] },
  "DIRT SIDE": { dimensions: [36, 36],
    red: [["top", 0, 12], ["left", 24, 36]],
    blue: [["bottom", 24, 36], ["right", 0, 12]],
    markers: [[1, 6, 18], [2, 30, 18], [5, 18, 18]] },
  FRONTIER: { dimensions: [36, 36],
    red: [["bottom", 12, 24], ["top", 12, 24]],
    blue: [["left", 12, 24], ["right", 12, 24]],
    markers: [[1, 6, 6], [2, 30, 30], [5, 18, 18]] },
  GAUNTLET: { dimensions: [54, 36],
    red: [["top", 0, 54]], blue: [["bottom", 0, 54]],
    markers: [[1, 12, 24], [2, 42, 12], [3, 36, 24], [4, 18, 12], [5, 27, 18]] },
  TYPHOON: { dimensions: [54, 36],
    red: [["top", 30, 54], ["right", 18, 36]],
    blue: [["bottom", 0, 24], ["left", 0, 18]],
    markers: [[1, 18, 24], [2, 6, 30], [3, 48, 6], [4, 36, 12], [5, 27, 18]] },
  ACROPOLIS: { dimensions: [54, 36],
    red: [["top", 0, 18], ["bottom", 36, 54]],
    blue: [["bottom", 0, 18], ["top", 36, 54]],
    markers: [[1, 12, 24], [2, 42, 24], [3, 42, 12], [4, 12, 12], [5, 27, 18]] },
  "PROVING GROUNDS": { dimensions: [54, 36],
    red: [["left", 0, 36], ["right", 0, 36]], blue: [["top", 18, 36]],
    markers: [[1, 12, 24], [2, 36, 12], [3, 42, 24], [4, 18, 12], [5, 27, 24]] },
  BREACH: { dimensions: [54, 36],
    red: [["right", 0, 36]], blue: [["left", 0, 36]],
    markers: [[1, 18, 30], [2, 36, 30], [3, 36, 6], [4, 18, 6], [5, 27, 18]] },
});

function pointFor(side, position, width, height) {
  if (side === "bottom") return { x: position, y: 0 };
  if (side === "top") return { x: position, y: height };
  if (side === "left") return { x: 0, y: position };
  if (side === "right") return { x: width, y: position };
  fail("DEPLOYMENT_GEOMETRY_EDGE_SIDE_INVALID", side);
}
function zoneRectangle(side, start, end, width, height) {
  if (side === "bottom") return { xMin: start, xMax: end, yMin: 0, yMax: 6 };
  if (side === "top") return { xMin: start, xMax: end, yMin: height - 6, yMax: height };
  if (side === "left") return { xMin: 0, xMax: 6, yMin: start, yMax: end };
  return { xMin: width - 6, xMax: width, yMin: start, yMax: end };
}
function compileEntry(colour, rows, width, height) {
  const segments = rows.map(([side, startInches, endInches], index) => {
    const sideLength = ["top", "bottom"].includes(side) ? width : height;
    if (!Number.isFinite(startInches) || !Number.isFinite(endInches)
      || startInches < 0 || endInches <= startInches || endInches > sideLength) {
      fail("DEPLOYMENT_GEOMETRY_ENTRY_SEGMENT_INVALID", colour);
    }
    return { segmentId: `${colour}-entry-${index + 1}`, side, startInches,
      endInches, fullTableEdge: startInches === 0 && endInches === sideLength,
      startCoordinate: pointFor(side, startInches, width, height),
      endCoordinate: pointFor(side, endInches, width, height),
      zoneOfInfluenceDepthInches: 6,
      zoneRectangle: zoneRectangle(side, startInches, endInches, width, height) };
  });
  const partial = segments.filter((entry) => !entry.fullTableEdge);
  const cornerByKey = new Map();
  for (const segment of partial) {
    for (const coordinate of [segment.startCoordinate, segment.endCoordinate]) {
      cornerByKey.set(`${coordinate.x}:${coordinate.y}`, coordinate);
    }
  }
  return { colour, segments,
    fullTableEdgeOnly: segments.every((entry) => entry.fullTableEdge),
    zoneOfInfluenceCornerMarkers: [...cornerByKey.values()].sort((left, right) => (
      left.x - right.x || left.y - right.y)),
    zoneDepthInches: 6 };
}
function compileGeometry(profile) {
  const raw = RAW_GEOMETRY[profile.name];
  if (!raw) fail("DEPLOYMENT_GEOMETRY_PROFILE_MISSING", profile.name);
  const [widthInches, heightInches] = raw.dimensions;
  if (profile.battlefieldDimensionClass?.widthInches !== widthInches
    || profile.battlefieldDimensionClass?.heightInches !== heightInches) {
    fail("DEPLOYMENT_GEOMETRY_DIMENSION_CLASS_MISMATCH", profile.name);
  }
  const markerNumbers = raw.markers.map(([number]) => number);
  const expectedMarkerNumbers = profile.engagementScale === "Skirmish"
    ? [1, 2, 5] : [1, 2, 3, 4, 5];
  if (new Set(markerNumbers).size !== expectedMarkerNumbers.length
    || expectedMarkerNumbers.some((number) => !markerNumbers.includes(number))) {
    fail("DEPLOYMENT_GEOMETRY_MARKER_DENOMINATOR_INVALID");
  }
  const body = { schema: "starcraft_tmg_official_deployment_geometry_profile_v1",
    recordKey: profile.recordKey, deploymentProfileHash: profile.profileHash,
    name: profile.name, engagementScale: profile.engagementScale,
    coordinateSystem: { origin: "bottom_left", xAxis: "right", yAxis: "up",
      unit: "inch", boundaryInclusive: true },
    battlefield: { widthInches, heightInches,
      metricDisplayReference: profile.engagementScale === "Skirmish"
        ? { widthCentimetres: 92, heightCentimetres: 92 }
        : { widthCentimetres: 137, heightCentimetres: 92 } },
    entryEdgesByColour: { red: compileEntry("red", raw.red, widthInches, heightInches),
      blue: compileEntry("blue", raw.blue, widthInches, heightInches) },
    missionMarkers: raw.markers.map(([number, x, y]) => ({ number,
      coordinate: { x, y }, diameterMm: 32, diameterInches: 32 / 25.4,
      physicalPresence: false,
      blocksLineOfSight: false, blocksMovement: false,
      activationSides: ["activated", "deactivated"],
      affinityColour: [1, 3].includes(number) ? "red"
        : [2, 4].includes(number) ? "blue" : "neutral" })),
    setupOrder: ["confirm_table_dimensions", "assign_entry_edges",
      "set_zone_of_influence_corner_markers", "set_terrain",
      "place_mission_markers"],
    terrainHeightTierTiming: "game_start",
    terrainHeightTierRequiredForEveryPiece: true,
    allowedMissionMarkerElevations: ["ground_level", "mid_ground", "high_ground"],
    missionMarkerImpassableOverlapAllowed: false,
    p2pEvidence: structuredClone(profile.p2pEvidence),
    transcriptionEvidence: { method: "labelled_dimension_transcription",
      sourcePages: [13, 14], sourceHash: TERRAN_P2P_HASH,
      reviewedOrientation: "card_title_upright", inferredPixelsUsed: false },
    rulesTruth: "official_selected_deployment_geometry", trainingTruth: false };
  return { ...body, geometryHash: hashStarcraftTmgContract(body) };
}

function verifyFaqBinding() {
  const clauses = new Map(OFFICIAL_FAQ_SUPPLEMENTAL_CLAUSE_BINDING_V3
    .supplementalClauses.map((entry) => [entry.clauseId, entry]));
  const dimensions = clauses.get("faq:9.43:skirmish-battlefield-dimensions");
  const height = clauses.get("faq:9.46:terrain-height-tier-game-start");
  if (dimensions?.semanticValue?.widthInches !== 36
    || dimensions?.semanticValue?.heightInches !== 36
    || dimensions.disposition !== "review_required"
    || height?.semanticValue?.timing !== "game_start"
    || height?.semanticValue?.scope !== "each_terrain_piece"
    || height.disposition !== "review_required") {
    fail("DEPLOYMENT_GEOMETRY_FAQ_BINDING_INVALID");
  }
  return { faqReceiptHash: OFFICIAL_FAQ_SUPPLEMENTAL_CLAUSE_BINDING_V3.faqReceiptHash,
    exactReconciliationV2Hash:
      OFFICIAL_FAQ_SUPPLEMENTAL_CLAUSE_BINDING_V3.exactReconciliationV2Hash,
    sourceContentHash: FAQ_CONTENT_HASH,
    promotedClauseIds: [dimensions.clauseId, height.clauseId] };
}

export function createOfficialDeploymentGeometryDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false) {
    fail("DEPLOYMENT_GEOMETRY_DATASET_INVALID");
  }
  const draftBundle = input.missionDeploymentDraftDataBundle
    || createOfficialMissionDeploymentDraftDataBundleV1({ dataset });
  verifyOfficialMissionDeploymentDraftDataBundleV1(draftBundle);
  const geometryProfiles = draftBundle.deploymentProfiles.map(compileGeometry)
    .sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  const faqBinding = verifyFaqBinding();
  const body = { schema: OFFICIAL_DEPLOYMENT_GEOMETRY_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulesHash: CORE_RULES_HASH, p2pDeploymentSourceHash: TERRAN_P2P_HASH,
    missionDeploymentDraftDataBundleHash: draftBundle.bundleHash,
    ruleClauses: structuredClone(RULE_CLAUSES), faqBinding,
    geometryProfiles, geometryProfileIndexHash: hashStarcraftTmgContract(geometryProfiles),
    counts: { geometryProfiles: 10, standardProfiles: 5, skirmishProfiles: 5,
      standardMissionMarkersPerProfile: 5, skirmishMissionMarkersPerProfile: 3,
      promotedAtoms: 12 },
    sourcePrecedence: { geometry: "terran_p2p_labelled_dimensions",
      setupOrder: "core_pdf_page_78_primary",
      faq: "official_mutable_supplement_exact_semantic_binding",
      commandCenterRuleProseMayOverrideCorePdf: false,
      commandCenterSetupOrderConflictDetected: true,
      draftFieldContractCorrection:
        "skirmish_deployment_cards_define_markers_1_2_5_only" },
    viewportProjectionContract: {
      rulesWorldUnit: "inch", physicalSourceUnit: "millimetre",
      millimetresPerInch: 25.4,
      scaleMode: "uniform_fit_then_zoom",
      uniformAxesRequired: true, preserveBattlefieldAspectRatio: true,
      worldOrigin: "bottom_left", viewportOrigin: "top_left",
      yAxisFlipRequired: true, devicePixelRatioAffectsRulesGeometry: false,
      panAndZoomAffectRulesGeometry: false,
      roundingBeforeRulesEvaluationAllowed: false,
      touchTargetMayExceedPhysicalTokenVisual: true,
      touchTargetMayAffectRulesCollision: false,
    },
    sourcePolicy: { refreshDuringDevelopment: false, repositoryFallbackAllowed: false },
    terrainPlacementExecutionOwner: "ticket_11_slice_108",
    productionRoomBindingEligible: false,
    rulesTruth: "official_current_deployment_geometry_data", trainingTruth: false };
  return freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialDeploymentGeometryDataBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_DEPLOYMENT_GEOMETRY_DATA_BUNDLE_SCHEMA
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulesHash !== CORE_RULES_HASH
    || bundle.p2pDeploymentSourceHash !== TERRAN_P2P_HASH
    || bundle.ruleClauses?.length !== 12 || bundle.geometryProfiles?.length !== 10
    || bundle.geometryProfileIndexHash !== hashStarcraftTmgContract(bundle.geometryProfiles)
    || bundle.counts?.promotedAtoms !== 12
    || bundle.sourcePrecedence?.commandCenterSetupOrderConflictDetected !== true
    || bundle.sourcePrecedence?.commandCenterRuleProseMayOverrideCorePdf !== false
    || bundle.viewportProjectionContract?.millimetresPerInch !== 25.4
    || bundle.viewportProjectionContract?.uniformAxesRequired !== true
    || bundle.viewportProjectionContract?.devicePixelRatioAffectsRulesGeometry !== false
    || bundle.viewportProjectionContract?.touchTargetMayAffectRulesCollision !== false
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.terrainPlacementExecutionOwner !== "ticket_11_slice_108"
    || bundle.productionRoomBindingEligible !== false || bundle.trainingTruth !== false) {
    fail("DEPLOYMENT_GEOMETRY_DATA_BUNDLE_INVALID");
  }
  if (bundle.ruleClauses.some((entry) => !HASH_PATTERN.test(entry.candidateSequenceHash))
    || bundle.geometryProfiles.some((entry) => !HASH_PATTERN.test(entry.geometryHash)
      || entry.missionMarkers?.length !== (entry.engagementScale === "Skirmish" ? 3 : 5)
      || entry.setupOrder?.join("|") !== "confirm_table_dimensions|assign_entry_edges|set_zone_of_influence_corner_markers|set_terrain|place_mission_markers")) {
    fail("DEPLOYMENT_GEOMETRY_DATA_BUNDLE_INVALID");
  }
  return true;
}

export function getOfficialDeploymentGeometryProfileV1(bundle, recordKey) {
  verifyOfficialDeploymentGeometryDataBundleV1(bundle);
  const profile = bundle.geometryProfiles.find((entry) => entry.recordKey === recordKey);
  if (!profile) fail("DEPLOYMENT_GEOMETRY_PROFILE_UNKNOWN", String(recordKey || ""));
  return profile;
}
