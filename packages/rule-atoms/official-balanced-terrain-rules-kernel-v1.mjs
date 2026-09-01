import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialPremadeTerrainMapProfileV1,
  verifyOfficialBalancedTerrainRulesDataBundleV1,
} from "../source-data/official-balanced-terrain-rules-data-bundle-v1.mjs";
import { createOfficialTerrainPieceV1 } from
  "./official-terrain-los-rules-kernel-v1.mjs";
import { createOfficialSpecialTerrainAgreementV1 } from
  "./official-special-terrain-rules-kernel-v1.mjs";
import {
  createOfficialTerrainHeightTierLedgerV1,
  finalizeOfficialMissionMarkerPlacementV1,
  verifyOfficialBattlefieldViewportProjectionV1,
  verifyOfficialDeploymentGeometryBindingV1,
  verifyOfficialMissionMarkerPlacementV1,
  verifyOfficialTerrainHeightTierLedgerV1,
} from "./official-deployment-geometry-rules-kernel-v1.mjs";

export const OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA =
  "starcraft_tmg_official_balanced_terrain_setup_plan_v1";
export const OFFICIAL_BALANCED_TERRAIN_SETUP_CERTIFICATE_SCHEMA =
  "starcraft_tmg_official_balanced_terrain_setup_certificate_v1";
export const OFFICIAL_BALANCED_TERRAIN_VIEWPORT_PROJECTION_SCHEMA =
  "starcraft_tmg_official_balanced_terrain_viewport_projection_v1";

const TOLERANCE = 1;
const TERRAIN_KINDS = new Set(["ordinary", "grass", "impassable", "ramp"]);
const HEIGHT_TIERS = new Set(["ground_level", "mid_ground", "high_ground"]);
const QUADRANTS = Object.freeze([
  "south_west", "south_east", "north_west", "north_east",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) {
  return { ...body, [field]: hashStarcraftTmgContract(body) };
}
function milli(value, code, detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}
function inches(value) { return Number((value / 1000).toFixed(3)); }
function point(value, code = "BALANCED_TERRAIN_POINT_INVALID", detail = "") {
  const xMilliInches = milli(value?.x, code, detail);
  const yMilliInches = milli(value?.y, code, detail);
  return { xMilliInches, yMilliInches };
}
function rectangle(value, battlefield, detail = "") {
  const result = { shape: "axis_aligned_rectangle",
    minXMilliInches: milli(value?.xMin, "BALANCED_TERRAIN_FOOTPRINT_INVALID", detail),
    maxXMilliInches: milli(value?.xMax, "BALANCED_TERRAIN_FOOTPRINT_INVALID", detail),
    minYMilliInches: milli(value?.yMin, "BALANCED_TERRAIN_FOOTPRINT_INVALID", detail),
    maxYMilliInches: milli(value?.yMax, "BALANCED_TERRAIN_FOOTPRINT_INVALID", detail) };
  if (result.minXMilliInches < 0 || result.minYMilliInches < 0
    || result.minXMilliInches >= result.maxXMilliInches
    || result.minYMilliInches >= result.maxYMilliInches
    || result.maxXMilliInches > milli(battlefield.widthInches,
      "BALANCED_TERRAIN_BATTLEFIELD_INVALID")
    || result.maxYMilliInches > milli(battlefield.heightInches,
      "BALANCED_TERRAIN_BATTLEFIELD_INVALID")) {
    fail("BALANCED_TERRAIN_FOOTPRINT_INVALID", detail);
  }
  return result;
}
function rectangleInches(value) {
  return { xMin: inches(value.minXMilliInches), xMax: inches(value.maxXMilliInches),
    yMin: inches(value.minYMilliInches), yMax: inches(value.maxYMilliInches) };
}
function sameRectangle(left, right) {
  return left.minXMilliInches === right.minXMilliInches
    && left.maxXMilliInches === right.maxXMilliInches
    && left.minYMilliInches === right.minYMilliInches
    && left.maxYMilliInches === right.maxYMilliInches;
}
function translateRectangle(value, dx, dy) {
  return { ...value, minXMilliInches: value.minXMilliInches + dx,
    maxXMilliInches: value.maxXMilliInches + dx,
    minYMilliInches: value.minYMilliInches + dy,
    maxYMilliInches: value.maxYMilliInches + dy };
}
function rectanglesOverlap(left, right) {
  return left.minXMilliInches < right.maxXMilliInches - TOLERANCE
    && left.maxXMilliInches > right.minXMilliInches + TOLERANCE
    && left.minYMilliInches < right.maxYMilliInches - TOLERANCE
    && left.maxYMilliInches > right.minYMilliInches + TOLERANCE;
}
function rectangleDistance(left, right) {
  const dx = Math.max(0, left.minXMilliInches - right.maxXMilliInches,
    right.minXMilliInches - left.maxXMilliInches);
  const dy = Math.max(0, left.minYMilliInches - right.maxYMilliInches,
    right.minYMilliInches - left.maxYMilliInches);
  return Math.hypot(dx, dy);
}
function pointRectangleDistance(value, rect) {
  const x = Math.max(rect.minXMilliInches,
    Math.min(value.xMilliInches, rect.maxXMilliInches));
  const y = Math.max(rect.minYMilliInches,
    Math.min(value.yMilliInches, rect.maxYMilliInches));
  return Math.hypot(value.xMilliInches - x, value.yMilliInches - y);
}
function pointInsideRectangle(value, rect) {
  return value.xMilliInches >= rect.minXMilliInches
    && value.xMilliInches <= rect.maxXMilliInches
    && value.yMilliInches >= rect.minYMilliInches
    && value.yMilliInches <= rect.maxYMilliInches;
}
function segmentIntersectsRectangle(a, b, rect) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  let minimum = 0; let maximum = 1;
  for (const [direction, offset] of [
    [-dx, a.xMilliInches - rect.minXMilliInches],
    [dx, rect.maxXMilliInches - a.xMilliInches],
    [-dy, a.yMilliInches - rect.minYMilliInches],
    [dy, rect.maxYMilliInches - a.yMilliInches],
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
function pointSegmentDistance(value, a, b) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  if (dx === 0 && dy === 0) {
    return Math.hypot(value.xMilliInches - a.xMilliInches,
      value.yMilliInches - a.yMilliInches);
  }
  const ratio = Math.max(0, Math.min(1,
    (((value.xMilliInches - a.xMilliInches) * dx)
      + ((value.yMilliInches - a.yMilliInches) * dy)) / ((dx * dx) + (dy * dy))));
  return Math.hypot(value.xMilliInches - (a.xMilliInches + ratio * dx),
    value.yMilliInches - (a.yMilliInches + ratio * dy));
}
function segmentRectangleDistance(a, b, rect) {
  if (segmentIntersectsRectangle(a, b, rect)) return 0;
  const corners = [
    { xMilliInches: rect.minXMilliInches, yMilliInches: rect.minYMilliInches },
    { xMilliInches: rect.maxXMilliInches, yMilliInches: rect.minYMilliInches },
    { xMilliInches: rect.maxXMilliInches, yMilliInches: rect.maxYMilliInches },
    { xMilliInches: rect.minXMilliInches, yMilliInches: rect.maxYMilliInches },
  ];
  return Math.min(pointRectangleDistance(a, rect), pointRectangleDistance(b, rect),
    ...corners.map((corner) => pointSegmentDistance(corner, a, b)));
}
function midpoint(a, b) {
  return { xMilliInches: Math.round((a.xMilliInches + b.xMilliInches) / 2),
    yMilliInches: Math.round((a.yMilliInches + b.yMilliInches) / 2) };
}
function distance(a, b) {
  return Math.hypot(a.xMilliInches - b.xMilliInches,
    a.yMilliInches - b.yMilliInches);
}
function canonicalHeight(value) {
  const text = String(value || "ground_level").toLowerCase();
  const result = text === "ground" ? "ground_level"
    : text === "mid" || text === "middle" ? "mid_ground"
      : text === "high" ? "high_ground" : text;
  if (!HEIGHT_TIERS.has(result)) fail("BALANCED_TERRAIN_HEIGHT_TIER_INVALID", text);
  return result;
}
function specialHeight(value) {
  return value === "ground_level" ? "ground"
    : value === "mid_ground" ? "mid" : "high";
}
function canonicalConnects(value, detail) {
  if (!Array.isArray(value) || value.length !== 2) {
    fail("BALANCED_TERRAIN_ACCESS_CONNECTION_INVALID", detail);
  }
  const rows = value.map((entry) => specialHeight(canonicalHeight(entry)));
  if (rows[0] === rows[1]) fail("BALANCED_TERRAIN_ACCESS_CONNECTION_INVALID", detail);
  return rows.sort((left, right) => ["ground", "mid", "high"].indexOf(left)
    - ["ground", "mid", "high"].indexOf(right));
}

function scaleRange(range, areaSquareInches, referenceAreaSquareInches) {
  const minimumNumerator = range.minimum * areaSquareInches;
  const maximumNumerator = range.maximum * areaSquareInches;
  const integerMinimum = Math.ceil(minimumNumerator / referenceAreaSquareInches);
  const integerMaximum = Math.floor(maximumNumerator / referenceAreaSquareInches);
  if (integerMaximum < integerMinimum) fail("BALANCED_TERRAIN_SCALED_RANGE_EMPTY");
  return { sourceMinimum: range.minimum, sourceMaximum: range.maximum,
    scaleNumerator: areaSquareInches, scaleDenominator: referenceAreaSquareInches,
    realMinimum: { numerator: minimumNumerator, denominator: referenceAreaSquareInches },
    realMaximum: { numerator: maximumNumerator, denominator: referenceAreaSquareInches },
    integerMinimum, integerMaximum,
    integerInterpretation: "all_integer_counts_inside_the_proportional_real_interval" };
}

export function deriveOfficialTerrainGuidelineEnvelopeV1(input = {}) {
  const binding = input.deploymentGeometryBinding;
  const bundle = input.balancedTerrainRulesDataBundle;
  verifyOfficialDeploymentGeometryBindingV1(binding);
  verifyOfficialBalancedTerrainRulesDataBundleV1(bundle);
  if (bundle.deploymentGeometryDataBundleHash
    !== input.deploymentGeometryDataBundle?.bundleHash) {
    fail("BALANCED_TERRAIN_DEPLOYMENT_GEOMETRY_BUNDLE_MISMATCH");
  }
  const areaSquareInches = binding.battlefield.widthInches
    * binding.battlefield.heightInches;
  const ranges = Object.fromEntries(Object.entries(bundle.standardGuidelines)
    .map(([key, range]) => [key, scaleRange(range, areaSquareInches,
      bundle.standardReference.areaSquareInches)]));
  const body = { schema: "starcraft_tmg_official_terrain_guideline_envelope_v1",
    deploymentGeometryBindingHash: binding.bindingHash,
    balancedTerrainRulesDataBundleHash: bundle.bundleHash,
    battlefield: clone(binding.battlefield), areaSquareInches,
    standardReferenceAreaSquareInches: bundle.standardReference.areaSquareInches,
    ranges, grassCountsTowardSize2: true, everyPieceCountsTowardTotal: true,
    categoryRangesAreIndependentConstraintsNotAdditiveBuckets: true,
    size3PlusAvailabilityIsSetupInput: true,
    sourceRefreshPerformed: false, trainingTruth: false };
  return seal(body, "envelopeHash");
}

function relocationCandidates(rect, marker, battlefield) {
  const centre = { xMilliInches: milli(marker.coordinate.x,
    "BALANCED_TERRAIN_MARKER_INVALID"), yMilliInches: milli(marker.coordinate.y,
    "BALANCED_TERRAIN_MARKER_INVALID") };
  const radius = milli(marker.diameterInches / 2,
    "BALANCED_TERRAIN_MARKER_INVALID");
  if (pointRectangleDistance(centre, rect) >= radius - TOLERANCE) return [rect];
  const candidates = [];
  if (pointInsideRectangle(centre, rect)) {
    const translations = [
      [centre.xMilliInches - radius - rect.maxXMilliInches, 0],
      [centre.xMilliInches + radius - rect.minXMilliInches, 0],
      [0, centre.yMilliInches - radius - rect.maxYMilliInches],
      [0, centre.yMilliInches + radius - rect.minYMilliInches],
    ];
    const minimum = Math.min(...translations.map(([dx, dy]) => Math.hypot(dx, dy)));
    for (const [dx, dy] of translations) {
      if (Math.abs(Math.hypot(dx, dy) - minimum) <= TOLERANCE) {
        candidates.push(translateRectangle(rect, dx, dy));
      }
    }
  } else {
    const nearest = { xMilliInches: Math.max(rect.minXMilliInches,
      Math.min(centre.xMilliInches, rect.maxXMilliInches)),
    yMilliInches: Math.max(rect.minYMilliInches,
      Math.min(centre.yMilliInches, rect.maxYMilliInches)) };
    const dx = nearest.xMilliInches - centre.xMilliInches;
    const dy = nearest.yMilliInches - centre.yMilliInches;
    const current = Math.hypot(dx, dy);
    if (current === 0) fail("BALANCED_TERRAIN_RELOCATION_VECTOR_AMBIGUOUS");
    const required = radius - current;
    candidates.push(translateRectangle(rect,
      Math.round((dx / current) * required), Math.round((dy / current) * required)));
  }
  const width = milli(battlefield.widthInches, "BALANCED_TERRAIN_BATTLEFIELD_INVALID");
  const height = milli(battlefield.heightInches,
    "BALANCED_TERRAIN_BATTLEFIELD_INVALID");
  return candidates.filter((candidate) => candidate.minXMilliInches >= 0
    && candidate.minYMilliInches >= 0 && candidate.maxXMilliInches <= width
    && candidate.maxYMilliInches <= height
    && pointRectangleDistance(centre, candidate) >= radius - TOLERANCE)
    .filter((candidate, index, rows) => rows.findIndex((other) => (
      sameRectangle(candidate, other))) === index);
}

function normalizeAccessPoint(raw, terrain, battlefield) {
  const accessPointId = String(raw?.accessPointId || "").trim();
  if (!accessPointId) fail("BALANCED_TERRAIN_ACCESS_POINT_INVALID", terrain.terrainPieceId);
  const footprint = rectangle(raw.footprint, battlefield, accessPointId);
  if (!rectanglesOverlap(footprint, terrain.footprint)) {
    fail("BALANCED_TERRAIN_ACCESS_POINT_OUTSIDE_TERRAIN", accessPointId);
  }
  const connects = canonicalConnects(raw.connects, accessPointId);
  const groundApproachPath = (raw.groundApproachPath || []).map((entry) => (
    point(entry, "BALANCED_TERRAIN_ACCESS_PATH_INVALID", accessPointId)
  ));
  if (groundApproachPath.length < 2) {
    fail("BALANCED_TERRAIN_ACCESS_PATH_INVALID", accessPointId);
  }
  return { accessPointId, role: String(raw.role || "generic").toLowerCase(),
    footprint, connects, groundApproachPath };
}

function normalizeTerrain(raw, binding) {
  const terrainPieceId = String(raw?.terrainPieceId || "").trim();
  const size = Number(raw?.size);
  const terrainKind = String(raw?.terrainKind || "ordinary").toLowerCase();
  if (!terrainPieceId || !Number.isSafeInteger(size) || size < 0 || size > 9
    || !TERRAIN_KINDS.has(terrainKind)) {
    fail("BALANCED_TERRAIN_PIECE_INVALID", terrainPieceId);
  }
  const originalFootprint = rectangle(raw.originalFootprint || raw.footprint,
    binding.battlefield, terrainPieceId);
  const footprint = rectangle(raw.footprint, binding.battlefield, terrainPieceId);
  const heightTier = canonicalHeight(raw.heightTier);
  const standableHorizontalSurface = raw.standableHorizontalSurface === true;
  if (terrainKind === "grass" && (size !== 2 || heightTier !== "ground_level"
    || standableHorizontalSurface)) {
    fail("BALANCED_TERRAIN_GRASS_PROFILE_INVALID", terrainPieceId);
  }
  if (terrainKind === "impassable" && size < 2) {
    fail("BALANCED_TERRAIN_IMPASSABLE_PROFILE_INVALID", terrainPieceId);
  }
  const openings = (raw.openings || []).map((entry) => ({
    openingId: String(entry?.openingId || "").trim(),
    footprint: rectangle(entry?.footprint, binding.battlefield, terrainPieceId),
    movementPassableAgreed: entry?.movementPassableAgreed === true,
    lineOfSightOpenAgreed: entry?.lineOfSightOpenAgreed === true,
  }));
  const adjacentElevationPairs = (raw.adjacentElevationPairs || [])
    .map((entry) => canonicalConnects(entry, terrainPieceId));
  const provisional = { terrainPieceId, size, terrainKind, originalFootprint, footprint,
    heightTier, standableHorizontalSurface, openings };
  const accessPoints = (raw.accessPoints || []).map((entry) => (
    normalizeAccessPoint(entry, provisional, binding.battlefield)
  )).sort((left, right) => left.accessPointId.localeCompare(right.accessPointId));
  if (new Set(accessPoints.map((entry) => entry.accessPointId)).size
    !== accessPoints.length) fail("BALANCED_TERRAIN_ACCESS_POINT_DUPLICATE");
  return { ...provisional, adjacentElevationPairs, accessPoints };
}

function verifyRelocation(terrain, markerTargets, battlefield) {
  const overlaps = markerTargets.filter((marker) => {
    const centre = { xMilliInches: milli(marker.coordinate.x,
      "BALANCED_TERRAIN_MARKER_INVALID"), yMilliInches: milli(marker.coordinate.y,
      "BALANCED_TERRAIN_MARKER_INVALID") };
    return pointRectangleDistance(centre, terrain.originalFootprint)
      < milli(marker.diameterInches / 2, "BALANCED_TERRAIN_MARKER_INVALID")
        - TOLERANCE;
  });
  if (terrain.terrainKind !== "impassable") {
    if (!sameRectangle(terrain.originalFootprint, terrain.footprint)) {
      fail("BALANCED_TERRAIN_NON_IMPASSABLE_RELOCATION_FORBIDDEN",
        terrain.terrainPieceId);
    }
    return { terrainPieceId: terrain.terrainPieceId, relocated: false,
      markerNumber: null, translationMilliInches: { x: 0, y: 0 } };
  }
  if (overlaps.length > 1) {
    fail("BALANCED_TERRAIN_MULTI_MARKER_RELOCATION_UNSUPPORTED",
      terrain.terrainPieceId);
  }
  if (overlaps.length === 0) {
    if (!sameRectangle(terrain.originalFootprint, terrain.footprint)) {
      fail("BALANCED_TERRAIN_RELOCATION_NOT_REQUIRED", terrain.terrainPieceId);
    }
    return { terrainPieceId: terrain.terrainPieceId, relocated: false,
      markerNumber: null, translationMilliInches: { x: 0, y: 0 } };
  }
  const candidates = relocationCandidates(terrain.originalFootprint, overlaps[0],
    battlefield);
  if (candidates.length === 0
    || !candidates.some((entry) => sameRectangle(entry, terrain.footprint))) {
    fail("BALANCED_TERRAIN_RELOCATION_NOT_NEAREST", terrain.terrainPieceId);
  }
  return { terrainPieceId: terrain.terrainPieceId, relocated: true,
    markerNumber: overlaps[0].number,
    translationMilliInches: {
      x: terrain.footprint.minXMilliInches - terrain.originalFootprint.minXMilliInches,
      y: terrain.footprint.minYMilliInches - terrain.originalFootprint.minYMilliInches,
    }, candidateCount: candidates.length };
}

function countAudit(terrain, envelope, size3PlusAvailable) {
  const actual = { total: terrain.length,
    size0: terrain.filter((entry) => entry.size === 0).length,
    size1: terrain.filter((entry) => entry.size === 1).length,
    size2: terrain.filter((entry) => entry.size === 2).length,
    size3PlusWhenAvailable: terrain.filter((entry) => entry.size >= 3).length,
    grass: terrain.filter((entry) => entry.terrainKind === "grass").length };
  const checks = Object.fromEntries(Object.entries(actual).map(([key, count]) => {
    const range = envelope.ranges[key];
    const applies = key !== "size3PlusWhenAvailable" || size3PlusAvailable;
    const compliant = applies
      ? count >= range.integerMinimum && count <= range.integerMaximum
      : count === 0;
    return [key, { count, applies, integerMinimum: applies ? range.integerMinimum : 0,
      integerMaximum: applies ? range.integerMaximum : 0, compliant }];
  }));
  if (Object.values(checks).some((entry) => !entry.compliant)) {
    fail("BALANCED_TERRAIN_COUNT_GUIDELINE_FAILED");
  }
  return { actual, checks, allIndependentRangesSatisfied: true,
    grassCountedInsideSize2AndTotal: true };
}

function quadrantsFor(terrain, binding) {
  const centreX = milli(binding.battlefield.widthInches / 2,
    "BALANCED_TERRAIN_BATTLEFIELD_INVALID");
  const centreY = milli(binding.battlefield.heightInches / 2,
    "BALANCED_TERRAIN_BATTLEFIELD_INVALID");
  const footprint = terrain.footprint;
  const quadrants = [];
  if (footprint.minXMilliInches < centreX && footprint.minYMilliInches < centreY) {
    quadrants.push("south_west");
  }
  if (footprint.maxXMilliInches > centreX && footprint.minYMilliInches < centreY) {
    quadrants.push("south_east");
  }
  if (footprint.minXMilliInches < centreX && footprint.maxYMilliInches > centreY) {
    quadrants.push("north_west");
  }
  if (footprint.maxXMilliInches > centreX && footprint.maxYMilliInches > centreY) {
    quadrants.push("north_east");
  }
  if (quadrants.length === 0) {
    fail("BALANCED_TERRAIN_QUADRANT_FOOTPRINT_INVALID", terrain.terrainPieceId);
  }
  return quadrants;
}
function pointInQuadrant(value, quadrant, binding) {
  const x = milli(binding.battlefield.widthInches / 2,
    "BALANCED_TERRAIN_BATTLEFIELD_INVALID");
  const y = milli(binding.battlefield.heightInches / 2,
    "BALANCED_TERRAIN_BATTLEFIELD_INVALID");
  return (quadrant.endsWith("west") ? value.xMilliInches < x : value.xMilliInches > x)
    && (quadrant.startsWith("south") ? value.yMilliInches < y
      : value.yMilliInches > y);
}
function lane(raw, code, detail) {
  const laneId = String(raw?.laneId || "").trim();
  const start = point(raw?.start, code, detail);
  const end = point(raw?.end, code, detail);
  const widthMilliInches = milli(raw?.widthInches, code, detail);
  if (!laneId || widthMilliInches <= 0 || distance(start, end) <= TOLERANCE) {
    fail(code, detail);
  }
  return { laneId, start, end, widthMilliInches };
}
function verifyQuadrants(terrain, rawLanes, binding, bundle) {
  const byQuadrant = Object.fromEntries(QUADRANTS.map((entry) => [entry, []]));
  for (const entry of terrain) {
    for (const quadrant of quadrantsFor(entry, binding)) byQuadrant[quadrant].push(entry);
  }
  for (const quadrant of QUADRANTS) {
    if (byQuadrant[quadrant].length === 0
      || byQuadrant[quadrant].filter((entry) => entry.size >= 2).length < 2) {
      fail("BALANCED_TERRAIN_QUADRANT_DISTRIBUTION_FAILED", quadrant);
    }
  }
  const lanes = (rawLanes || []).map((entry) => lane(entry,
    "BALANCED_TERRAIN_QUADRANT_MANOEUVRE_LANE_INVALID", String(entry?.quadrant || "")));
  if (lanes.length !== 4 || new Set(lanes.map((entry) => entry.laneId)).size !== 4) {
    fail("BALANCED_TERRAIN_QUADRANT_MANOEUVRE_DENOMINATOR_INVALID");
  }
  const minimum = milli(bundle.distributionContract.manoeuvreWitnessMinimumWidthInches,
    "BALANCED_TERRAIN_QUADRANT_MANOEUVRE_LANE_INVALID");
  const audits = QUADRANTS.map((quadrant) => {
    const raw = rawLanes.find((entry) => entry.quadrant === quadrant);
    const selected = lanes.find((entry) => entry.laneId === raw?.laneId);
    if (!selected || selected.widthMilliInches < minimum
      || !pointInQuadrant(selected.start, quadrant, binding)
      || !pointInQuadrant(selected.end, quadrant, binding)
      || terrain.some((entry) => segmentRectangleDistance(selected.start,
        selected.end, entry.footprint) < selected.widthMilliInches / 2 - TOLERANCE)) {
      fail("BALANCED_TERRAIN_QUADRANT_MANOEUVRE_LANE_BLOCKED", quadrant);
    }
    return { quadrant, terrainPieceIds: byQuadrant[quadrant]
      .map((entry) => entry.terrainPieceId).sort(),
    significantTerrainPieceIds: byQuadrant[quadrant]
      .filter((entry) => entry.size >= 2).map((entry) => entry.terrainPieceId).sort(),
    manoeuvreLane: selected, currentMaximumBaseDepthMm:
      bundle.distributionContract.manoeuvreWitnessCurrentBaseDepthMillimetres };
  });
  return { audits, allQuadrantsNonEmpty: true,
    everyQuadrantHasTwoSignificantPieces: true,
    currentBaseClearanceWitnessComplete: true,
    globalArbitraryFormationPathClosureClaimed: false };
}

function pointOnSegmentCoordinate(value, segment, binding) {
  const width = milli(binding.battlefield.widthInches,
    "BALANCED_TERRAIN_BATTLEFIELD_INVALID");
  const height = milli(binding.battlefield.heightInches,
    "BALANCED_TERRAIN_BATTLEFIELD_INVALID");
  const start = milli(segment.startInches, "BALANCED_TERRAIN_ENTRY_EDGE_INVALID");
  const end = milli(segment.endInches, "BALANCED_TERRAIN_ENTRY_EDGE_INVALID");
  if (segment.side === "bottom") return value.yMilliInches === 0
    && value.xMilliInches >= start && value.xMilliInches <= end;
  if (segment.side === "top") return value.yMilliInches === height
    && value.xMilliInches >= start && value.xMilliInches <= end;
  if (segment.side === "left") return value.xMilliInches === 0
    && value.yMilliInches >= start && value.yMilliInches <= end;
  return value.xMilliInches === width && value.yMilliInches >= start
    && value.yMilliInches <= end;
}
function entryPlayerForPoint(value, binding) {
  return Object.entries(binding.entryEdgesByPlayer).filter(([, entry]) => (
    entry.segments.some((segment) => pointOnSegmentCoordinate(value, segment, binding))
  )).map(([playerId]) => playerId);
}
function verifyFireLanes(terrain, rawLanes, binding, bundle) {
  const lanes = (rawLanes || []).map((entry) => lane(entry,
    "BALANCED_TERRAIN_FIRE_LANE_INVALID", String(entry?.laneId || "")));
  const minimumCount = bundle.distributionContract.fireLaneMinimumCount;
  const minimumWidth = milli(bundle.distributionContract.fireLaneMinimumWidthInches,
    "BALANCED_TERRAIN_FIRE_LANE_INVALID");
  if (lanes.length < minimumCount
    || new Set(lanes.map((entry) => entry.laneId)).size !== lanes.length) {
    fail("BALANCED_TERRAIN_FIRE_LANE_DENOMINATOR_INVALID");
  }
  const blocking = terrain.filter((entry) => entry.size >= 2);
  const audits = lanes.map((entry) => {
    const startPlayers = entryPlayerForPoint(entry.start, binding);
    const endPlayers = entryPlayerForPoint(entry.end, binding);
    if (entry.widthMilliInches < minimumWidth || startPlayers.length !== 1
      || endPlayers.length !== 1 || startPlayers[0] === endPlayers[0]
      || blocking.some((piece) => segmentRectangleDistance(entry.start, entry.end,
        piece.footprint) < entry.widthMilliInches / 2 - TOLERANCE)) {
      fail("BALANCED_TERRAIN_FIRE_LANE_BLOCKED", entry.laneId);
    }
    return { ...entry, fromPlayerId: startPlayers[0], toPlayerId: endPlayers[0],
      blockingTerrainPieceIds: [] };
  });
  for (let left = 0; left < audits.length; left += 1) {
    for (let right = left + 1; right < audits.length; right += 1) {
      if (distance(midpoint(audits[left].start, audits[left].end),
        midpoint(audits[right].start, audits[right].end)) < minimumWidth - TOLERANCE) {
        fail("BALANCED_TERRAIN_FIRE_LANES_NOT_DISTINCT");
      }
    }
  }
  return { audits, minimumCount, minimumWidthInches: inches(minimumWidth),
    clearOpposingEntryLaneCount: audits.length };
}

function verifyAccessPoints(terrain, binding) {
  const allIds = terrain.flatMap((entry) => entry.accessPoints.map((pointValue) => (
    pointValue.accessPointId
  )));
  if (new Set(allIds).size !== allIds.length) {
    fail("BALANCED_TERRAIN_ACCESS_POINT_DUPLICATE");
  }
  const largeStandable = terrain.filter((entry) => (
    entry.size >= 3 && entry.standableHorizontalSurface
  ));
  const audits = largeStandable.map((entry) => {
    if (entry.accessPoints.length === 0) {
      fail("BALANCED_TERRAIN_LARGE_ACCESS_POINT_REQUIRED", entry.terrainPieceId);
    }
    const accessAudits = entry.accessPoints.map((accessPoint) => {
      const first = accessPoint.groundApproachPath[0];
      const last = accessPoint.groundApproachPath.at(-1);
      if (!pointInsideRectangle(last, entry.footprint)
        || terrain.some((other) => other.terrainPieceId !== entry.terrainPieceId
          && pointInsideRectangle(first, other.footprint))
        || accessPoint.groundApproachPath.slice(1).some((pathPoint, index) => (
          terrain.some((other) => other.terrainPieceId !== entry.terrainPieceId
            && other.size >= 2 && segmentIntersectsRectangle(
              accessPoint.groundApproachPath[index], pathPoint, other.footprint))))) {
        fail("BALANCED_TERRAIN_LARGE_ACCESS_POINT_UNREACHABLE",
          accessPoint.accessPointId);
      }
      return { accessPointId: accessPoint.accessPointId,
        groundApproachPath: clone(accessPoint.groundApproachPath),
        otherSizeTwoPlusTerrainCrossed: [] };
    });
    return { terrainPieceId: entry.terrainPieceId, accessPoints: accessAudits };
  });
  return { largeStandableTerrainPieceCount: largeStandable.length,
    audits, everyLargeStandablePieceHasReachableGroundAccess: true };
}

function normalizePlacementMethod(plan, binding, bundle) {
  const placementMethod = String(plan?.placementMethod || "");
  const participants = [...binding.participantIds].sort();
  const confirmations = [...new Set((plan?.physicalLayoutConfirmedByPlayerIds || [])
    .map(String))].sort();
  if (JSON.stringify(confirmations) !== JSON.stringify(participants)) {
    fail("BALANCED_TERRAIN_PLAYER_CONFIRMATIONS_INCOMPLETE");
  }
  if (placementMethod === "official_premade") {
    const profile = getOfficialPremadeTerrainMapProfileV1(bundle, plan.premadeMapId);
    if (profile.engagementScale !== binding.engagementScale
      || (plan.placementHistory || []).length !== 0) {
      fail("BALANCED_TERRAIN_PREMADE_METHOD_INVALID");
    }
    return { placementMethod, premadeMapId: profile.mapId,
      premadeMapHash: profile.mapHash, physicalLayoutConfirmedByPlayerIds: confirmations,
      premadeSourceImageCoordinatesMachineTranscribed: false };
  }
  if (placementMethod !== "alternating") {
    fail("BALANCED_TERRAIN_PLACEMENT_METHOD_INVALID");
  }
  const history = (plan.placementHistory || []).map((entry, index) => ({
    ordinal: Number(entry?.ordinal), terrainPieceId: String(entry?.terrainPieceId || ""),
    placedByPlayerId: String(entry?.placedByPlayerId || "") })).sort((left, right) => (
      left.ordinal - right.ordinal));
  const red = Object.entries(binding.colourByPlayer).find(([, colour]) => colour === "red")?.[0];
  const blue = Object.entries(binding.colourByPlayer).find(([, colour]) => colour === "blue")?.[0];
  if (!red || !blue || history.some((entry, index) => entry.ordinal !== index + 1
    || entry.placedByPlayerId !== (index % 2 === 0 ? red : blue))) {
    fail("BALANCED_TERRAIN_ALTERNATING_HISTORY_INVALID");
  }
  return { placementMethod, premadeMapId: null, premadeMapHash: null,
    physicalLayoutConfirmedByPlayerIds: confirmations,
    firstPlacementPlayerId: red, alternatingPlayerIds: [red, blue], history };
}

function terrainRuntimeArtifacts(terrain) {
  const pieces = terrain.map((entry) => createOfficialTerrainPieceV1({
    id: entry.terrainPieceId, terrainKind: entry.terrainKind, size: entry.size,
    footprint: entry.footprint,
    standableHorizontalSurface: entry.standableHorizontalSurface,
    openings: entry.openings,
  }));
  const terrainEntries = terrain.map((entry) => ({
    terrainId: entry.terrainPieceId, terrainKind: entry.terrainKind,
    adjacentElevationPairs: entry.adjacentElevationPairs,
    accessPoints: entry.accessPoints.map((accessPoint) => ({
      accessPointId: accessPoint.accessPointId, role: accessPoint.role,
      footprint: accessPoint.footprint, connects: accessPoint.connects,
    })),
  }));
  return { pieces, agreement: createOfficialSpecialTerrainAgreementV1({ terrainEntries }) };
}

export function certifyOfficialBalancedTerrainSetupV1(input = {}) {
  const binding = input.deploymentGeometryBinding;
  const bundle = input.balancedTerrainRulesDataBundle;
  verifyOfficialDeploymentGeometryBindingV1(binding);
  verifyOfficialBalancedTerrainRulesDataBundleV1(bundle);
  const plan = input.setupPlan;
  if (!object(plan) || plan.schema !== OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA
    || plan.trainingTruth !== false) fail("BALANCED_TERRAIN_SETUP_PLAN_INVALID");
  const envelope = deriveOfficialTerrainGuidelineEnvelopeV1(input);
  const terrain = (plan.terrainPieces || []).map((entry) => normalizeTerrain(entry,
    binding)).sort((left, right) => left.terrainPieceId.localeCompare(right.terrainPieceId));
  if (terrain.length === 0
    || new Set(terrain.map((entry) => entry.terrainPieceId)).size !== terrain.length) {
    fail("BALANCED_TERRAIN_DENOMINATOR_INVALID");
  }
  const method = normalizePlacementMethod(plan, binding, bundle);
  if (method.placementMethod === "alternating") {
    const historyIds = method.history.map((entry) => entry.terrainPieceId).sort();
    if (JSON.stringify(historyIds) !== JSON.stringify(terrain.map((entry) => (
      entry.terrainPieceId)).sort())) fail("BALANCED_TERRAIN_ALTERNATING_HISTORY_INVALID");
  }
  const relocations = terrain.map((entry) => verifyRelocation(entry,
    binding.markerTargets, binding.battlefield));
  for (let left = 0; left < terrain.length; left += 1) {
    for (let right = left + 1; right < terrain.length; right += 1) {
      if (rectanglesOverlap(terrain[left].footprint, terrain[right].footprint)) {
        fail("BALANCED_TERRAIN_PIECES_OVERLAP",
          `${terrain[left].terrainPieceId}:${terrain[right].terrainPieceId}`);
      }
    }
  }
  const major = terrain.filter((entry) => entry.size >= 2
    && entry.terrainKind !== "grass");
  const minimumSeparation = milli(
    bundle.distributionContract.majorStructureMinimumSeparationInches,
    "BALANCED_TERRAIN_MAJOR_SEPARATION_INVALID");
  for (let left = 0; left < major.length; left += 1) {
    for (let right = left + 1; right < major.length; right += 1) {
      if (rectangleDistance(major[left].footprint, major[right].footprint)
        < minimumSeparation - TOLERANCE) {
        fail("BALANCED_TERRAIN_MAJOR_SEPARATION_FAILED");
      }
    }
  }
  const counts = countAudit(terrain, envelope, plan.size3PlusAvailable === true);
  const quadrants = verifyQuadrants(terrain, plan.quadrantManoeuvreLanes,
    binding, bundle);
  const centre = { xMilliInches: milli(binding.battlefield.widthInches / 2,
    "BALANCED_TERRAIN_BATTLEFIELD_INVALID"), yMilliInches:
      milli(binding.battlefield.heightInches / 2,
        "BALANCED_TERRAIN_BATTLEFIELD_INVALID") };
  const centreTerrain = terrain.filter((entry) => entry.size >= 2
    && pointRectangleDistance(centre, entry.footprint)
      <= milli(bundle.distributionContract.centreRadiusInches,
        "BALANCED_TERRAIN_CENTRE_INVALID") + TOLERANCE);
  if (centreTerrain.length < bundle.distributionContract.centreSignificantMinimum) {
    fail("BALANCED_TERRAIN_CENTRE_SIGNIFICANT_MISSING");
  }
  const fireLanes = verifyFireLanes(terrain, plan.fireLanes, binding, bundle);
  const accessPoints = verifyAccessPoints(terrain, binding);
  const runtime = terrainRuntimeArtifacts(terrain);
  const terrainHeightTierLedger = createOfficialTerrainHeightTierLedgerV1({
    deploymentGeometryBinding: binding,
    terrainPieces: terrain.map((entry) => ({ terrainPieceId: entry.terrainPieceId,
      heightTier: entry.heightTier, footprint: rectangleInches(entry.footprint),
      impassable: entry.terrainKind === "impassable" })),
  });
  const missionMarkerPlacement = finalizeOfficialMissionMarkerPlacementV1({
    deploymentGeometryBinding: binding, terrainHeightTierLedger });
  const body = { schema: OFFICIAL_BALANCED_TERRAIN_SETUP_CERTIFICATE_SCHEMA,
    deploymentGeometryBindingHash: binding.bindingHash,
    balancedTerrainRulesDataBundleHash: bundle.bundleHash,
    guidelineEnvelopeHash: envelope.envelopeHash,
    placementMethod: method, terrainPieces: terrain.map((entry) => ({
      terrainPieceId: entry.terrainPieceId, size: entry.size,
      terrainKind: entry.terrainKind, originalFootprint: entry.originalFootprint,
      footprint: entry.footprint, heightTier: entry.heightTier,
      standableHorizontalSurface: entry.standableHorizontalSurface,
      accessPointIds: entry.accessPoints.map((value) => value.accessPointId),
    })),
    terrainPieceHashes: runtime.pieces.map((entry) => entry.terrainHash),
    specialTerrainAgreementHash: runtime.agreement.agreementHash,
    counts, relocations,
    majorStructureMinimumSeparationInches: inches(minimumSeparation),
    majorStructureSeparationSatisfied: true,
    quadrants, centre: { centre, radiusInches:
      bundle.distributionContract.centreRadiusInches,
    significantTerrainPieceIds: centreTerrain.map((entry) => (
      entry.terrainPieceId)).sort() },
    fireLanes, accessPoints,
    terrainEffects: clone(bundle.terrainEffects),
    terrainHeightTierLedgerHash: terrainHeightTierLedger.ledgerHash,
    missionMarkerPlacementHash: missionMarkerPlacement.placementHash,
    completeTerrainDenominator: true, balancedTerrainCertified: true,
    boundedGeometryAuthority: bundle.boundedGeometryAuthority,
    clientSuppliedBalanceVerdictAccepted: false,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    rulesTruth: "official_balanced_terrain_setup_certified",
    trainingTruth: false };
  const certificate = seal(body, "certificateHash");
  return { certificate, terrainPieces: runtime.pieces,
    specialTerrainAgreement: runtime.agreement,
    terrainHeightTierLedger, missionMarkerPlacement };
}

export function verifyOfficialBalancedTerrainSetupCertificateV1(certificate,
  binding, bundle) {
  verifyOfficialDeploymentGeometryBindingV1(binding);
  verifyOfficialBalancedTerrainRulesDataBundleV1(bundle);
  if (!object(certificate)
    || certificate.schema !== OFFICIAL_BALANCED_TERRAIN_SETUP_CERTIFICATE_SCHEMA
    || certificate.certificateHash !== hashStarcraftTmgContract(without(certificate,
      ["certificateHash"]))
    || certificate.deploymentGeometryBindingHash !== binding.bindingHash
    || certificate.balancedTerrainRulesDataBundleHash !== bundle.bundleHash
    || certificate.completeTerrainDenominator !== true
    || certificate.balancedTerrainCertified !== true
    || certificate.majorStructureSeparationSatisfied !== true
    || certificate.quadrants?.everyQuadrantHasTwoSignificantPieces !== true
    || certificate.quadrants?.currentBaseClearanceWitnessComplete !== true
    || certificate.quadrants?.globalArbitraryFormationPathClosureClaimed !== false
    || certificate.fireLanes?.clearOpposingEntryLaneCount < 2
    || certificate.accessPoints?.everyLargeStandablePieceHasReachableGroundAccess
      !== true
    || certificate.clientSuppliedBalanceVerdictAccepted !== false
    || certificate.sourceRefreshPerformed !== false
    || certificate.repositoryFallbackUsed !== false
    || certificate.trainingTruth !== false) {
    fail("BALANCED_TERRAIN_SETUP_CERTIFICATE_INVALID");
  }
  return true;
}

export function verifyOfficialBalancedTerrainArtifactsV1(input = {}) {
  verifyOfficialBalancedTerrainSetupCertificateV1(input.certificate,
    input.deploymentGeometryBinding, input.balancedTerrainRulesDataBundle);
  verifyOfficialTerrainHeightTierLedgerV1(input.terrainHeightTierLedger,
    input.deploymentGeometryBinding);
  verifyOfficialMissionMarkerPlacementV1(input.missionMarkerPlacement,
    input.deploymentGeometryBinding, input.terrainHeightTierLedger);
  if (input.certificate.terrainHeightTierLedgerHash
      !== input.terrainHeightTierLedger.ledgerHash
    || input.certificate.missionMarkerPlacementHash
      !== input.missionMarkerPlacement.placementHash
    || input.certificate.specialTerrainAgreementHash
      !== input.specialTerrainAgreement?.agreementHash
    || JSON.stringify(input.certificate.terrainPieceHashes)
      !== JSON.stringify((input.terrainPieces || []).map((entry) => entry.terrainHash))) {
    fail("BALANCED_TERRAIN_ARTIFACT_BINDING_INVALID");
  }
  return true;
}

export function projectOfficialBalancedTerrainToViewportV1(input = {}) {
  const binding = input.deploymentGeometryBinding;
  const projection = input.viewportProjection;
  const certificate = input.certificate;
  verifyOfficialBattlefieldViewportProjectionV1(projection, binding);
  verifyOfficialBalancedTerrainSetupCertificateV1(certificate, binding,
    input.balancedTerrainRulesDataBundle);
  const terrainPieces = certificate.terrainPieces.map((entry) => ({
    terrainPieceId: entry.terrainPieceId,
    xCss: projection.offsetCssX
      + inches(entry.footprint.minXMilliInches) * projection.cssPixelsPerInch,
    yCss: projection.offsetCssY
      + (binding.battlefield.heightInches
        - inches(entry.footprint.maxYMilliInches)) * projection.cssPixelsPerInch,
    widthCss: inches(entry.footprint.maxXMilliInches
      - entry.footprint.minXMilliInches) * projection.cssPixelsPerInch,
    heightCss: inches(entry.footprint.maxYMilliInches
      - entry.footprint.minYMilliInches) * projection.cssPixelsPerInch,
    rulesFootprintMilliInches: clone(entry.footprint), roundingApplied: false,
  }));
  const body = { schema: OFFICIAL_BALANCED_TERRAIN_VIEWPORT_PROJECTION_SCHEMA,
    deploymentGeometryBindingHash: binding.bindingHash,
    balancedTerrainCertificateHash: certificate.certificateHash,
    viewportProjectionHash: projection.projectionHash,
    cssPixelsPerInch: projection.cssPixelsPerInch,
    xCssPixelsPerInch: projection.xCssPixelsPerInch,
    yCssPixelsPerInch: projection.yCssPixelsPerInch,
    terrainPieces, physicalRulesGeometryInvariant: true,
    devicePixelRatioAffectsRulesGeometry: false,
    panAndZoomAffectRulesGeometry: false, roundingApplied: false,
    trainingTruth: false };
  return seal(body, "terrainProjectionHash");
}
