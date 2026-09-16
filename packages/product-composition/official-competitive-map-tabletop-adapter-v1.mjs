import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialCompetitiveMapTopologyCatalogueV1,
  verifyOfficialCompetitiveMapTopologyCatalogueV1,
} from "./official-competitive-map-topology-catalogue-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_TABLETOP_ADAPTER_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_tabletop_adapter_catalogue_v1";

const ENGAGEMENT_SCALE_PROFILES = Object.freeze({
  Skirmish: Object.freeze({ engagementScale: "Skirmish", mineralBand: "up_to_1000",
    battlefield: Object.freeze({ widthInches: 36, heightInches: 36 }),
    currentMissionDeploymentGeometryCoverage: "official_exact" }),
  Standard: Object.freeze({ engagementScale: "Standard", mineralBand: "up_to_2000",
    battlefield: Object.freeze({ widthInches: 54, heightInches: 36 }),
    currentMissionDeploymentGeometryCoverage: "official_exact" }),
  "Grand Offensive": Object.freeze({ engagementScale: "Grand Offensive",
    mineralBand: "2001_plus",
    battlefield: Object.freeze({ widthInches: 72, heightInches: 36 }),
    currentMissionDeploymentGeometryCoverage: "scale_exact_task_geometry_not_in_current_cards" }),
});
const BASE_PROFILES = Object.freeze([
  Object.freeze({ baseId: "round_32mm", shape: "round", widthMm: 32, depthMm: 32 }),
  Object.freeze({ baseId: "round_40mm", shape: "round", widthMm: 40, depthMm: 40 }),
  Object.freeze({ baseId: "round_50mm", shape: "round", widthMm: 50, depthMm: 50 }),
  Object.freeze({ baseId: "round_80mm", shape: "round", widthMm: 80, depthMm: 80 }),
  Object.freeze({ baseId: "rectangle_40x100mm", shape: "rectangle",
    widthMm: 40, depthMm: 100 }),
]);
const CLEARANCE_BY_CLASS = Object.freeze({
  small: 1.5,
  standard: 2.25,
  single_heavy: 4,
  heavy_turn: 5,
  formation_fire_lane: 6,
});
const HARD_RULES_MODES = new Set(["blocking", "standable_high_ground"]);
const TOLERANCE = 0.001;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function fixed(value) { return Number(Number(value).toFixed(3)); }

function pointFromNormalized(value, battlefield) {
  return { xInches: fixed(value.x * battlefield.widthInches / 1000),
    yInches: fixed(value.y * battlefield.heightInches / 1000) };
}

function pointSegmentDistance(point, start, end) {
  const dx = end.xInches - start.xInches;
  const dy = end.yInches - start.yInches;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.xInches - start.xInches, point.yInches - start.yInches);
  }
  const ratio = Math.max(0, Math.min(1,
    (((point.xInches - start.xInches) * dx)
      + ((point.yInches - start.yInches) * dy)) / ((dx * dx) + (dy * dy))));
  return Math.hypot(point.xInches - (start.xInches + ratio * dx),
    point.yInches - (start.yInches + ratio * dy));
}

function pointRectangleDistance(point, rect) {
  const x = Math.max(rect.xMin, Math.min(point.xInches, rect.xMax));
  const y = Math.max(rect.yMin, Math.min(point.yInches, rect.yMax));
  return Math.hypot(point.xInches - x, point.yInches - y);
}

function segmentIntersectsRectangle(start, end, rect) {
  const dx = end.xInches - start.xInches;
  const dy = end.yInches - start.yInches;
  let minimum = 0;
  let maximum = 1;
  for (const [direction, offset] of [
    [-dx, start.xInches - rect.xMin],
    [dx, rect.xMax - start.xInches],
    [-dy, start.yInches - rect.yMin],
    [dy, rect.yMax - start.yInches],
  ]) {
    if (direction === 0) {
      if (offset < 0) return false;
      continue;
    }
    const ratio = offset / direction;
    if (direction < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return maximum >= 0 && minimum <= 1;
}

function segmentRectangleDistance(start, end, rect) {
  if (segmentIntersectsRectangle(start, end, rect)) return 0;
  const corners = [
    { xInches: rect.xMin, yInches: rect.yMin },
    { xInches: rect.xMax, yInches: rect.yMin },
    { xInches: rect.xMax, yInches: rect.yMax },
    { xInches: rect.xMin, yInches: rect.yMax },
  ];
  return Math.min(pointRectangleDistance(start, rect),
    pointRectangleDistance(end, rect),
    ...corners.map((corner) => pointSegmentDistance(corner, start, end)));
}

function polylineRectangleDistance(points, rect) {
  return Math.min(...points.slice(1).map((point, index) => (
    segmentRectangleDistance(points[index], point, rect)
  )));
}

function rotatedEnvelope(width, height, rotationDegrees) {
  const radians = Math.abs(rotationDegrees % 180) * Math.PI / 180;
  return { width: Math.abs(width * Math.cos(radians))
      + Math.abs(height * Math.sin(radians)),
    height: Math.abs(width * Math.sin(radians))
      + Math.abs(height * Math.cos(radians)) };
}

function tabletopElement(element, battlefield) {
  const source = element.normalizedFootprint;
  const centre = pointFromNormalized({ x: source.centreX, y: source.centreY },
    battlefield);
  const width = source.width * battlefield.widthInches / 1000;
  const height = source.height * battlefield.heightInches / 1000;
  const envelope = rotatedEnvelope(width, height, source.rotationDegrees);
  const clipped = {
    xMin: fixed(Math.max(0, centre.xInches - envelope.width / 2)),
    xMax: fixed(Math.min(battlefield.widthInches,
      centre.xInches + envelope.width / 2)),
    yMin: fixed(Math.max(0, centre.yInches - envelope.height / 2)),
    yMax: fixed(Math.min(battlefield.heightInches,
      centre.yInches + envelope.height / 2)),
  };
  const artFootprint = { centre, widthInches: fixed(width),
    heightInches: fixed(height), rotationDegrees: source.rotationDegrees };
  return { elementId: element.elementId, sourceGroupId: element.sourceGroupId,
    sourceKind: element.sourceKind, sourceFeature: element.sourceFeature,
    artFootprint, candidateRulesFootprint: clipped,
    geometryAdaptations: {
      rotatedArtFlattenedToConservativeAxisAlignedRulesEnvelope:
        source.rotationDegrees % 180 !== 0,
      rulesEnvelopeClippedToBattlefield:
        clipped.xMin !== fixed(centre.xInches - envelope.width / 2)
          || clipped.xMax !== fixed(centre.xInches + envelope.width / 2)
          || clipped.yMin !== fixed(centre.yInches - envelope.height / 2)
          || clipped.yMax !== fixed(centre.yInches + envelope.height / 2),
    },
    artRetainByDefault: element.artRetainByDefault,
    userMayToggleArt: element.userMayToggleArt,
    defaultRulesMode: element.defaultRulesMode,
    recommendedRulesMode: element.defaultRulesMode,
    allowedRulesModes: [...element.allowedRulesModes],
    rulesEnabledByDefault: element.rulesEnabledByDefault,
    userMayDisableRules: element.userMayDisableRules,
    clearanceResolution: "source_default_clear",
    rulesAuthority: false, trainingTruth: false };
}

function laneRows(topology, battlefield) {
  const rows = topology.lanes.map((lane) => ({ laneId: lane.laneId,
    routeClass: lane.routeClass, clearanceClass: lane.clearanceClass,
    requiredClearanceInches: CLEARANCE_BY_CLASS[lane.clearanceClass],
    centreline: lane.centreline.map((point) => pointFromNormalized(point, battlefield)),
    sourceFromZoneId: lane.fromZoneId, sourceToZoneId: lane.toZoneId,
    promotedToFireLaneCandidate: false }));
  const ranked = [...rows].sort((left, right) => (
    right.requiredClearanceInches - left.requiredClearanceInches
      || Number(right.routeClass === "direct") - Number(left.routeClass === "direct")
      || left.laneId.localeCompare(right.laneId)
  ));
  const fireLaneIds = new Set(ranked.slice(0, 2).map((entry) => entry.laneId));
  return rows.map((entry) => fireLaneIds.has(entry.laneId)
    ? { ...entry, requiredClearanceInches: 6,
      promotedToFireLaneCandidate: entry.clearanceClass !== "formation_fire_lane" }
    : entry);
}

function adaptClearance(topology, lanes, elements) {
  const portalLaneByGroup = new Map();
  for (const portal of topology.portals) {
    if (!portal.linkedElementGroupId) continue;
    const lanesForGroup = portalLaneByGroup.get(portal.linkedElementGroupId) || new Set();
    lanesForGroup.add(portal.laneId);
    portalLaneByGroup.set(portal.linkedElementGroupId, lanesForGroup);
  }
  const passageRecommendations = [];
  const adapted = elements.map((element) => {
    if (!HARD_RULES_MODES.has(element.defaultRulesMode)) return element;
    const intrusions = lanes.filter((lane) => (
      polylineRectangleDistance(lane.centreline, element.candidateRulesFootprint)
        < lane.requiredClearanceInches / 2 - TOLERANCE
    ));
    if (intrusions.length === 0) return element;
    const portalLanes = portalLaneByGroup.get(element.sourceGroupId) || new Set();
    const covered = intrusions.filter((lane) => portalLanes.has(lane.laneId));
    for (const lane of covered) {
      passageRecommendations.push({
        passageId: `${element.elementId}:${lane.laneId}:passage`,
        passageKind: element.defaultRulesMode === "standable_high_ground"
          ? "access_point" : "opening",
        terrainElementId: element.elementId, laneId: lane.laneId,
        minimumClearWidthInches: lane.requiredClearanceInches,
        ...(element.defaultRulesMode === "standable_high_ground"
          ? { connectsElevations: ["ground", "high"] } : {}),
        compilerMustMaterializeExactGeometry: true,
      });
    }
    const uncovered = intrusions.filter((lane) => !portalLanes.has(lane.laneId));
    if (uncovered.length === 0) return { ...element,
      clearanceResolution: "source_portal_requires_widened_access" };
    const recommendedRulesMode = element.allowedRulesModes.includes("passable_difficult")
      ? "passable_difficult" : element.allowedRulesModes.includes("cover")
        ? "cover" : "visual_only";
    return { ...element, recommendedRulesMode,
      clearanceResolution: "source_hard_geometry_downgraded_for_complete_base_lane",
      conflictingLaneIds: uncovered.map((lane) => lane.laneId).sort(),
      userMayRestoreHardModeOnlyAfterCompilerClearanceRepair: true };
  });
  return { elements: adapted, passageRecommendations };
}

function laneAudits(lanes, elements, passages) {
  const passagePairs = new Set(passages.map((entry) => (
    `${entry.terrainElementId}:${entry.laneId}`)));
  return lanes.map((lane) => {
    const hardBlockerIntrusions = elements.filter((element) => (
      HARD_RULES_MODES.has(element.recommendedRulesMode)
      && polylineRectangleDistance(lane.centreline,
        element.candidateRulesFootprint) < lane.requiredClearanceInches / 2 - TOLERANCE
      && !passagePairs.has(`${element.elementId}:${lane.laneId}`)
    )).map((entry) => entry.elementId);
    return { laneId: lane.laneId,
      requiredClearanceInches: lane.requiredClearanceInches,
      completeBaseProfilesCovered: BASE_PROFILES.map((entry) => entry.baseId),
      hardBlockerIntrusions, clearanceCertified: hardBlockerIntrusions.length === 0 };
  });
}

function mapAdapter(topology) {
  const scaleProfile = ENGAGEMENT_SCALE_PROFILES[topology.recommendedEngagementScale];
  if (!scaleProfile) fail("COMPETITIVE_MAP_ENGAGEMENT_SCALE_UNKNOWN",
    topology.recommendedEngagementScale);
  const battlefield = scaleProfile.battlefield;
  const lanes = laneRows(topology, battlefield);
  const baseElements = topology.elements.map((element) => (
    tabletopElement(element, battlefield)));
  const clearance = adaptClearance(topology, lanes, baseElements);
  const audits = laneAudits(lanes, clearance.elements,
    clearance.passageRecommendations);
  const zones = topology.zones.map((zone) => ({ zoneId: zone.zoneId,
    role: zone.role, centre: pointFromNormalized(zone.centre, battlefield) }));
  const body = {
    schema: "starcraft_tmg_official_competitive_map_tabletop_adapter_v1",
    version: "1.1.0", seedId: topology.seedId,
    topologyHash: topology.topologyHash,
    sourceMapDimensions: structuredClone(topology.sourceMapDimensions),
    sourceMapAreaTiles: topology.sourceMapAreaTiles,
    engagementScale: topology.recommendedEngagementScale,
    scaleAssignmentBasis: topology.scaleAssignmentBasis,
    battlefield: { ...battlefield },
    currentMissionDeploymentGeometryCoverage:
      scaleProfile.currentMissionDeploymentGeometryCoverage,
    baseProfiles: BASE_PROFILES.map((entry) => ({ ...entry })),
    clearanceByClassInches: { ...CLEARANCE_BY_CLASS },
    zones, lanes, elements: clearance.elements,
    passageRecommendations: clearance.passageRecommendations,
    laneClearanceAudits: audits,
    fireLaneCandidateIds: lanes.filter((entry) => (
      entry.requiredClearanceInches === 6)).map((entry) => entry.laneId),
    completeBaseClearanceCertified: audits.every((entry) => entry.clearanceCertified),
    artAndRulesLayersRemainIndependent: true,
    hardModeOverrideRequiresRecompilation: true,
    normalizedCoordinatesAreRulesAuthority: false,
    compiledGeometryIsRulesAuthority: false,
    rulesTruth: "tabletop_adaptation_candidate_requires_recipe_compilation",
    trainingTruth: false,
  };
  return { ...body, adapterHash: hashStarcraftTmgContract(body) };
}

function inBounds(point, battlefield) {
  return point.xInches >= 0 && point.xInches <= battlefield.widthInches
    && point.yInches >= 0 && point.yInches <= battlefield.heightInches;
}

export function createOfficialCompetitiveMapTabletopAdapterCatalogueV1(input = {}) {
  const topologyCatalogue = input.topologyCatalogue
    || createOfficialCompetitiveMapTopologyCatalogueV1();
  verifyOfficialCompetitiveMapTopologyCatalogueV1(topologyCatalogue);
  const adapters = topologyCatalogue.topologies.map(mapAdapter);
  const body = {
    schema: OFFICIAL_COMPETITIVE_MAP_TABLETOP_ADAPTER_V1_SCHEMA,
    version: "1.1.0", topologyCatalogueHash: topologyCatalogue.catalogueHash,
    engagementScaleProfiles: Object.values(ENGAGEMENT_SCALE_PROFILES)
      .map((entry) => structuredClone(entry)),
    baseProfiles: BASE_PROFILES.map((entry) => ({ ...entry })),
    clearanceByClassInches: { ...CLEARANCE_BY_CLASS },
    adapters,
    counts: { total: adapters.length,
      elements: adapters.reduce((sum, entry) => sum + entry.elements.length, 0),
      lanes: adapters.reduce((sum, entry) => sum + entry.lanes.length, 0),
      passageRecommendations: adapters.reduce((sum, entry) => (
        sum + entry.passageRecommendations.length), 0),
      downgradedSourceDefaults: adapters.reduce((sum, entry) => sum
        + entry.elements.filter((element) => (
          element.defaultRulesMode !== element.recommendedRulesMode)).length, 0),
      byEngagementScale: Object.fromEntries(Object.keys(ENGAGEMENT_SCALE_PROFILES)
        .map((scale) => [scale, adapters.filter((entry) => (
          entry.engagementScale === scale)).length])) },
    allMapsCompleteBaseClearanceCertified: adapters.every((entry) => (
      entry.completeBaseClearanceCertified)),
    artAndRulesLayersRemainIndependent: true,
    sourceRefreshPerformed: false, rulesTruth: "tabletop_adapter_candidate_catalogue",
    trainingTruth: false,
  };
  const result = deepFreeze({ ...body,
    catalogueHash: hashStarcraftTmgContract(body) });
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1(result,
    topologyCatalogue);
  return result;
}

export function verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1(catalogue,
  topologyCatalogue = createOfficialCompetitiveMapTopologyCatalogueV1()) {
  verifyOfficialCompetitiveMapTopologyCatalogueV1(topologyCatalogue);
  if (!catalogue
    || catalogue.schema !== OFFICIAL_COMPETITIVE_MAP_TABLETOP_ADAPTER_V1_SCHEMA
    || catalogue.topologyCatalogueHash !== topologyCatalogue.catalogueHash
    || catalogue.adapters?.length !== 20
    || catalogue.counts?.byEngagementScale?.Skirmish < 5
    || catalogue.counts?.byEngagementScale?.Standard < 5
    || catalogue.counts?.byEngagementScale?.["Grand Offensive"] < 5
    || catalogue.allMapsCompleteBaseClearanceCertified !== true
    || catalogue.artAndRulesLayersRemainIndependent !== true
    || catalogue.trainingTruth !== false) {
    fail("COMPETITIVE_MAP_TABLETOP_ADAPTER_CATALOGUE_INVALID");
  }
  const topologyBySeed = new Map(topologyCatalogue.topologies.map((entry) => (
    [entry.seedId, entry])));
  const hashes = new Set();
  for (const adapter of catalogue.adapters) {
    const topology = topologyBySeed.get(adapter.seedId);
    const scaleProfile = ENGAGEMENT_SCALE_PROFILES[adapter.engagementScale];
    const battlefield = scaleProfile?.battlefield;
    const { adapterHash, ...body } = adapter;
    if (!topology || adapter.topologyHash !== topology.topologyHash
      || adapter.engagementScale !== topology.recommendedEngagementScale
      || !battlefield
      || adapter.battlefield.widthInches !== battlefield.widthInches
      || adapter.battlefield.heightInches !== battlefield.heightInches
      || adapterHash !== hashStarcraftTmgContract(body) || hashes.has(adapterHash)
      || adapter.elements.length !== topology.elements.length
      || adapter.lanes.length !== topology.lanes.length
      || adapter.fireLaneCandidateIds.length < 2
      || adapter.laneClearanceAudits.some((entry) => !entry.clearanceCertified)
      || adapter.zones.some((entry) => !inBounds(entry.centre, battlefield))) {
      fail("COMPETITIVE_MAP_TABLETOP_ADAPTER_INVALID", adapter?.seedId);
    }
    for (const element of adapter.elements) {
      const rect = element.candidateRulesFootprint;
      if (!(rect.xMin >= 0 && rect.xMin < rect.xMax
        && rect.xMax <= battlefield.widthInches && rect.yMin >= 0
        && rect.yMin < rect.yMax && rect.yMax <= battlefield.heightInches)
        || element.artRetainByDefault !== true || element.userMayToggleArt !== true
        || element.userMayDisableRules !== true
        || !element.allowedRulesModes.includes(element.recommendedRulesMode)) {
        fail("COMPETITIVE_MAP_TABLETOP_ELEMENT_INVALID", element?.elementId);
      }
    }
    hashes.add(adapterHash);
  }
  const total = (key) => catalogue.adapters.reduce((sum, entry) => (
    sum + (key === "elements" ? entry.elements.length
      : key === "lanes" ? entry.lanes.length
        : key === "passageRecommendations"
          ? entry.passageRecommendations.length
          : entry.elements.filter((element) => (
            element.defaultRulesMode !== element.recommendedRulesMode)).length)), 0);
  if (catalogue.counts.total !== 20
    || catalogue.counts.elements !== total("elements")
    || catalogue.counts.lanes !== total("lanes")
    || catalogue.counts.passageRecommendations !== total("passageRecommendations")
    || catalogue.counts.downgradedSourceDefaults !== total("downgradedSourceDefaults")
    || Object.entries(catalogue.counts.byEngagementScale).some(([scale, count]) => (
      count !== catalogue.adapters.filter((entry) => (
        entry.engagementScale === scale)).length))) {
    fail("COMPETITIVE_MAP_TABLETOP_ADAPTER_COUNTS_INVALID");
  }
  const { catalogueHash, ...body } = catalogue;
  if (catalogueHash !== hashStarcraftTmgContract(body)) {
    fail("COMPETITIVE_MAP_TABLETOP_ADAPTER_HASH_INVALID");
  }
  return true;
}

export function getOfficialCompetitiveMapTabletopAdapterV1(catalogue, seedId) {
  const result = catalogue?.adapters?.find((entry) => entry.seedId === seedId);
  if (!result) fail("COMPETITIVE_MAP_TABLETOP_ADAPTER_UNKNOWN", String(seedId || ""));
  return result;
}
