// Ticket 24 / Slice 254-R3 — semantic-map geometry contract.
//
// One small interface pairing a reviewed normalized multipolygon/ring geometry
// to a specific art asset and coordinate transform. Contours are authored and
// reviewed build assets (content/competitive-map-semantic-geometry/); runtime
// pixel inference is forbidden. This module is browser-safe: it uses the pure
// RFC 8785 + sha256 client-domain hash and imports no node builtins, no Rules
// kernels and no compiler. Nothing here is Rules authority; Codex integrates
// the adapter seam after review.

import { hashStarcraftTmgClientContract } from
  "../client-domain/portable-contract-hash-v1.mjs";
import { COMPETITIVE_MAP_SEMANTIC_GEOMETRY_BINDINGS_V1 } from
  "../../content/competitive-map-semantic-geometry/index-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_SEMANTIC_GEOMETRY_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_semantic_geometry_v1";
export const OFFICIAL_COMPETITIVE_MAP_SEMANTIC_GEOMETRY_CATALOGUE_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_semantic_geometry_catalogue_v1";
export const OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ALIGNMENT_RECEIPT_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_semantic_alignment_receipt_v1";

export const SEMANTIC_TERRAIN_CLASSES_V1 = Object.freeze([
  "impassable_water",
  "impassable_void",
  "impassable_structure",
  "standable_high_ground",
  "cliff_edge",
  "ramp_access",
  "grass_sight",
  "ordinary_cover",
]);
export const SEMANTIC_GEOMETRY_EXCLUSIVE_CELL_OWNERSHIP_POLICY =
  "exclusive_inscribed_high_structure_water_v1";
export const SEMANTIC_GEOMETRY_COVERING_CELL_INTERSECTION_POLICY =
  "positive_area_polygon_cell_v1";
export const SEMANTIC_GEOMETRY_NATIVE_SOURCE_PIXEL_BOUNDARY_POLICY =
  "original_art_integer_pixel_edges_v1";

const POLYGON_CLASSES = new Set([
  "impassable_water", "impassable_void", "impassable_structure",
  "standable_high_ground", "grass_sight", "ordinary_cover",
]);
const BINDING_SCHEMA =
  "starcraft_tmg_competitive_map_semantic_geometry_binding_v1";
const TOLERANCE = 0.001;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(
    ([key]) => !keys.includes(key)));
}
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function fixed(value) { return Number(Number(value).toFixed(3)); }

// ── Geometry primitives (normalized space) ────────────────────────────────

function normalizePoint(raw, code, detail) {
  const x = Number(raw?.[0] ?? raw?.x);
  const y = Number(raw?.[1] ?? raw?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)
    || x < 0 || x > 1000 || y < 0 || y > 1000) {
    fail(code, detail);
  }
  return { x: fixed(x), y: fixed(y) };
}

function ringAreaNormalized(ring) {
  let sum = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return sum / 2;
}

function ringBounds(ring) {
  return {
    xMin: Math.min(...ring.map((point) => point.x)),
    xMax: Math.max(...ring.map((point) => point.x)),
    yMin: Math.min(...ring.map((point) => point.y)),
    yMax: Math.max(...ring.map((point) => point.y)),
  };
}

function pointInRing(point, ring) {
  let inside = false;
  for (let a = 0, b = ring.length - 1; a < ring.length; b = a, a += 1) {
    const pa = ring[a];
    const pb = ring[b];
    if ((pa.y > point.y) !== (pb.y > point.y)
      && point.x < (pb.x - pa.x) * (point.y - pa.y) / (pb.y - pa.y) + pa.x) {
      inside = !inside;
    }
  }
  return inside;
}

function segmentsIntersect(p1, p2, p3, p4) {
  const direction = (a, b, c) => (b.x - a.x) * (c.y - a.y)
    - (b.y - a.y) * (c.x - a.x);
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
    && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function ringsIntersect(left, right) {
  for (let a = 0; a < left.length; a += 1) {
    const la = left[a];
    const lb = left[(a + 1) % left.length];
    for (let b = 0; b < right.length; b += 1) {
      if (segmentsIntersect(la, lb, right[b], right[(b + 1) % right.length])) {
        return true;
      }
    }
  }
  return pointInRing(left[0], right) || pointInRing(right[0], left);
}

// Segment crossings only — for hole-vs-outer validation, where containment
// of the hole inside the outer ring is REQUIRED, not a violation.
function ringsCross(left, right) {
  for (let a = 0; a < left.length; a += 1) {
    const la = left[a];
    const lb = left[(a + 1) % left.length];
    for (let b = 0; b < right.length; b += 1) {
      if (segmentsIntersect(la, lb, right[b], right[(b + 1) % right.length])) {
        return true;
      }
    }
  }
  return false;
}

function normalizeNativeSourcePixelRings(geometry, context, regionId) {
  if (!Array.isArray(geometry.sourcePixelRings) || geometry.sourcePixelRings.length < 1) {
    fail("SEMANTIC_GEOMETRY_NATIVE_PIXEL_RINGS_REQUIRED", regionId);
  }
  const rings = geometry.sourcePixelRings.map((ring) => {
    if (!Array.isArray(ring) || ring.length < 3) {
      fail("SEMANTIC_GEOMETRY_NATIVE_PIXEL_RING_TOO_SMALL", regionId);
    }
    const points = ring.map((point) => {
      if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isSafeInteger)
        || point[0] < 0 || point[1] < 0 || point[0] > context.width || point[1] > context.height) {
        fail("SEMANTIC_GEOMETRY_NATIVE_PIXEL_POINT_INVALID", regionId);
      }
      return [...point];
    });
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i]; const b = points[(i + 1) % points.length];
      if ((a[0] === b[0]) === (a[1] === b[1])) {
        fail("SEMANTIC_GEOMETRY_NATIVE_PIXEL_EDGE_NOT_AXIS_ALIGNED", regionId);
      }
    }
    const pixelArea = Math.abs(points.reduce((sum, p, i) => {
      const next = points[(i + 1) % points.length];
      return sum + p[0] * next[1] - next[0] * p[1];
    }, 0) / 2);
    if (pixelArea < 1) fail("SEMANTIC_GEOMETRY_NATIVE_PIXEL_RING_DEGENERATE", regionId);
    return points;
  });
  return { sourcePixelRings: rings, normalizedRings: rings.map(ring => ring.map(([x, y]) => ({
    x: fixed(x / context.width * 1000), y: fixed((1 - y / context.height) * 1000),
  }))) };
}

function normalizeRegion(raw, allowFineCovering = false, nativeSourceContext = null) {
  const regionId = String(raw?.regionId || "").trim();
  const semanticClass = String(raw?.semanticClass || "").trim();
  if (!regionId || !SEMANTIC_TERRAIN_CLASSES_V1.includes(semanticClass)) {
    fail("SEMANTIC_GEOMETRY_REGION_INVALID", regionId || semanticClass);
  }
  // Optional source-bound precision for thin polygons or narrow high
  // surfaces. Fine grass/cover requires the explicit positive-area policy.
  // Do not add a
  // default field: existing authored bindings retain their exact hashes.
  const resolution = raw.rasterResolutionMilliInches;
  if (resolution !== undefined && (resolution !== 125
    || !["impassable_water", "impassable_void", "impassable_structure",
      "standable_high_ground", ...(allowFineCovering ? ["grass_sight", "ordinary_cover"] : [])]
      .includes(semanticClass) || raw.geometry?.kind !== "polygon")) {
    fail("SEMANTIC_GEOMETRY_REGION_RASTER_RESOLUTION_INVALID", regionId);
  }
  const geometry = raw.geometry;
  const regionByIdNote = String(raw?.reviewNote || "");
  const normalized = { regionId, label: String(raw?.label || regionId),
    semanticClass, rulesSemantics: String(raw?.rulesSemantics || ""),
    artEvidence: String(raw?.artEvidence || ""), reviewNote: regionByIdNote,
    linkedRegionId: raw?.linkedRegionId ? String(raw.linkedRegionId) : null,
    ...(resolution === 125 ? { rasterResolutionMilliInches: 125 } : {}) };
  if (geometry?.kind === "polygon") {
    if (!POLYGON_CLASSES.has(semanticClass)) {
      fail("SEMANTIC_GEOMETRY_CLASS_SHAPE_MISMATCH", regionId);
    }
    const native = nativeSourceContext
      ? normalizeNativeSourcePixelRings(geometry, nativeSourceContext, regionId) : null;
    if (!native && geometry.sourcePixelRings !== undefined) {
      fail("SEMANTIC_GEOMETRY_NATIVE_PIXEL_POLICY_REQUIRED", regionId);
    }
    const suppliedRings = geometry.rings?.map((ring, index) => (ring || []).map(point => normalizePoint(point,
      "SEMANTIC_GEOMETRY_RING_POINT_INVALID", `${regionId}:${index}`)));
    if (native && suppliedRings && JSON.stringify(suppliedRings) !== JSON.stringify(native.normalizedRings)) {
      fail("SEMANTIC_GEOMETRY_NATIVE_PIXEL_TRANSFORM_MISMATCH", regionId);
    }
    const rings = (native ? native.normalizedRings : suppliedRings || []).map((points) => {
      if (points.length < 3) fail("SEMANTIC_GEOMETRY_RING_TOO_SMALL", regionId);
      if (native ? Math.abs(ringAreaNormalized(points)) <= 0 : Math.abs(ringAreaNormalized(points)) < 1) {
        fail("SEMANTIC_GEOMETRY_RING_DEGENERATE", regionId);
      }
      return points;
    });
    if (rings.length < 1) fail("SEMANTIC_GEOMETRY_POLYGON_RING_MISSING", regionId);
    for (let hole = 1; hole < rings.length; hole += 1) {
      if (!pointInRing(rings[hole][0], rings[0])
        || ringsCross(rings[hole], rings[0])) {
        fail("SEMANTIC_GEOMETRY_HOLE_OUTSIDE_OUTER", regionId);
      }
    }
    return { ...normalized, geometry: { kind: "polygon", rings,
      ...(native ? { sourcePixelRings: native.sourcePixelRings } : {}) } };
  }
  if (geometry?.kind === "polyline") {
    if (semanticClass !== "cliff_edge") {
      fail("SEMANTIC_GEOMETRY_CLASS_SHAPE_MISMATCH", regionId);
    }
    const path = (geometry.path || []).map((point) => normalizePoint(point,
      "SEMANTIC_GEOMETRY_PATH_POINT_INVALID", regionId));
    if (path.length < 2) fail("SEMANTIC_GEOMETRY_POLYLINE_TOO_SMALL", regionId);
    return { ...normalized, geometry: { kind: "polyline", path } };
  }
  if (geometry?.kind === "connector") {
    if (semanticClass !== "ramp_access") {
      fail("SEMANTIC_GEOMETRY_CLASS_SHAPE_MISMATCH", regionId);
    }
    const path = (geometry.path || []).map((point) => normalizePoint(point,
      "SEMANTIC_GEOMETRY_PATH_POINT_INVALID", regionId));
    const widthNormalized = Number(geometry.widthNormalized);
    const connects = geometry.connects;
    const approachPolicy = geometry.approachPolicy;
    if (path.length < 2 || !Number.isFinite(widthNormalized)
      || widthNormalized <= 0 || widthNormalized > 200
      || JSON.stringify(connects) !== JSON.stringify(["ground", "high"])) {
      fail("SEMANTIC_GEOMETRY_CONNECTOR_INVALID", regionId);
    }
    if (approachPolicy !== undefined && (approachPolicy !== "authored_ground_high_endpoints_v1"
      || path.length !== 2)) {
      fail("SEMANTIC_GEOMETRY_CONNECTOR_APPROACH_POLICY_INVALID", regionId);
    }
    return { ...normalized,
      geometry: { kind: "connector", path, widthNormalized: fixed(widthNormalized),
        connects: ["ground", "high"],
        ...(approachPolicy ? { approachPolicy } : {}) } };
  }
  fail("SEMANTIC_GEOMETRY_KIND_UNKNOWN", `${regionId}:${geometry?.kind}`);
}

// ── Coordinate transform ──────────────────────────────────────────────────

export function semanticGeometryTransformV1(binding) {
  return {
    normalizedSpace: clone(binding.normalizedSpace),
    artPixelSize: clone(binding.art.pixelSize),
    artOrigin: binding.art.origin,
    battlefieldInches: clone(binding.battlefield),
    mapping: "normalized[x,y] bottom-left origin -> artPixel[x * artWidth / 1000, (1000 - y) * artHeight / 1000] top-left origin -> inches[x * boardWidth / 1000, y * boardHeight / 1000] bottom-left origin",
  };
}

export function normalizedToArtPixelV1(point, binding) {
  return {
    x: fixed(point.x * binding.art.pixelSize.width
      / binding.normalizedSpace.width),
    y: fixed((binding.normalizedSpace.height - point.y)
      * binding.art.pixelSize.height / binding.normalizedSpace.height),
  };
}

export function artPixelToNormalizedV1(point, binding) {
  return {
    x: fixed(point.x * binding.normalizedSpace.width
      / binding.art.pixelSize.width),
    y: fixed(binding.normalizedSpace.height - point.y
      * binding.normalizedSpace.height / binding.art.pixelSize.height),
  };
}

export function normalizedToInchesV1(point, binding) {
  return {
    x: fixed(point.x * binding.battlefield.widthInches
      / binding.normalizedSpace.width),
    y: fixed(point.y * binding.battlefield.heightInches
      / binding.normalizedSpace.height),
  };
}

export function inchesToNormalizedV1(point, binding) {
  return {
    x: fixed(point.x * binding.normalizedSpace.width
      / binding.battlefield.widthInches),
    y: fixed(point.y * binding.normalizedSpace.height
      / binding.battlefield.heightInches),
  };
}

export function projectSemanticGeometryRegionV1(region, binding,
  target = "inches") {
  const project = target === "inches"
    ? (point) => normalizedToInchesV1(point, binding)
    : target === "artPixel"
      ? (point) => normalizedToArtPixelV1(point, binding)
      : (point) => ({ x: point.x, y: point.y });
  if (region.geometry.kind === "polygon") {
    return { regionId: region.regionId, semanticClass: region.semanticClass,
      kind: "polygon",
      rings: region.geometry.rings.map((ring) => ring.map(project)) };
  }
  if (region.geometry.kind === "connector") {
    return { regionId: region.regionId, semanticClass: region.semanticClass,
      kind: "connector", path: region.geometry.path.map(project),
      width: fixed(region.geometry.widthNormalized
        * (target === "inches"
          ? binding.battlefield.widthInches / binding.normalizedSpace.width
          : target === "artPixel"
            ? binding.art.pixelSize.width / binding.normalizedSpace.width
            : 1)),
      connects: [...region.geometry.connects] };
  }
  return { regionId: region.regionId, semanticClass: region.semanticClass,
    kind: "polyline", path: region.geometry.path.map(project) };
}

export function semanticRegionAreaSquareInchesV1(region, binding) {
  if (region.geometry.kind !== "polygon") return 0;
  const scale = (binding.battlefield.widthInches / binding.normalizedSpace.width)
    * (binding.battlefield.heightInches / binding.normalizedSpace.height);
  const outer = Math.abs(ringAreaNormalized(region.geometry.rings[0]));
  const holes = region.geometry.rings.slice(1)
    .reduce((sum, ring) => sum + Math.abs(ringAreaNormalized(ring)), 0);
  return fixed((outer - holes) * scale);
}

// ── Binding factory / verifier ────────────────────────────────────────────

export function createOfficialCompetitiveMapSemanticGeometryBindingV1(raw) {
  if (!object(raw) || raw.schema !== BINDING_SCHEMA) {
    fail("SEMANTIC_GEOMETRY_BINDING_SCHEMA_INVALID");
  }
  const seedId = String(raw.seedId || "").trim();
  if (!seedId) fail("SEMANTIC_GEOMETRY_SEED_REQUIRED");
  if (raw.runtimePixelInferenceAllowed !== false
    || raw.rulesAuthorityBeforeIntegration !== false
    || raw.trainingTruth !== false) {
    fail("SEMANTIC_GEOMETRY_BINDING_AUTHORITY_FLAGS_INVALID", seedId);
  }
  const art = raw.art;
  if (!object(art) || !String(art.assetPath || "").startsWith(
    "/assets/client/battlefield/maps/")
    || !Number.isSafeInteger(art.pixelSize?.width)
    || !Number.isSafeInteger(art.pixelSize?.height)
    || art.pixelSize.width <= 0 || art.pixelSize.height <= 0
    || art.origin !== "top_left") {
    fail("SEMANTIC_GEOMETRY_ART_BINDING_INVALID", seedId);
  }
  const artOverlays = Array.isArray(art.overlays) ? art.overlays.map((entry) => {
    const rect = entry?.rectangleNormalized;
    if (!String(entry?.overlayId || "").trim()
      || !String(entry?.assetPath || "").startsWith(
        "/assets/client/battlefield/maps/")
      || !/^[a-f0-9]{64}$/u.test(String(entry?.sha256 || ""))
      || ![rect?.xMin, rect?.xMax, rect?.yMin, rect?.yMax].every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 1000)
      || (entry.flipX !== undefined && typeof entry.flipX !== "boolean")
      || rect.xMin >= rect.xMax || rect.yMin >= rect.yMax) {
      fail("SEMANTIC_GEOMETRY_ART_OVERLAY_INVALID", seedId);
    }
    return { overlayId: String(entry.overlayId),
      assetPath: String(entry.assetPath), sha256: String(entry.sha256),
      rectangleNormalized: { xMin: fixed(rect.xMin),
        xMax: fixed(rect.xMax), yMin: fixed(rect.yMin),
        yMax: fixed(rect.yMax) },
      ...(entry.flipX === true ? { flipX: true } : {}) };
  }) : [];
  if (artOverlays.length > 0 && (!/^[a-f0-9]{64}$/u.test(
    String(art.sha256 || ""))
    || new Set(artOverlays.map((entry) => entry.overlayId)).size
      !== artOverlays.length)) {
    fail("SEMANTIC_GEOMETRY_ART_OVERLAY_PROVENANCE_INVALID", seedId);
  }
  if (raw.normalizedSpace?.width !== 1000 || raw.normalizedSpace?.height !== 1000
    || raw.normalizedSpace?.origin !== "bottom_left"
    || !(raw.battlefield?.widthInches > 0) || !(raw.battlefield?.heightInches > 0)
    || raw.battlefield?.origin !== "bottom_left") {
    fail("SEMANTIC_GEOMETRY_COORDINATE_SPACE_INVALID", seedId);
  }
  const sourcePixelPolicy = raw.review?.sourcePixelBoundaryPolicy;
  if (sourcePixelPolicy !== undefined
    && sourcePixelPolicy !== SEMANTIC_GEOMETRY_NATIVE_SOURCE_PIXEL_BOUNDARY_POLICY) {
    fail("SEMANTIC_GEOMETRY_NATIVE_PIXEL_POLICY_INVALID", seedId);
  }
  if (sourcePixelPolicy && !/^[a-f0-9]{64}$/u.test(String(art.sha256 || ""))) {
    fail("SEMANTIC_GEOMETRY_NATIVE_PIXEL_ART_HASH_REQUIRED", seedId);
  }
  const nativeSourceContext = sourcePixelPolicy
    ? { width: art.pixelSize.width, height: art.pixelSize.height } : null;
  const allowFineCovering = raw.review?.coveringCellIntersectionPolicy
    === SEMANTIC_GEOMETRY_COVERING_CELL_INTERSECTION_POLICY;
  const regions = (raw.regions || []).map(region => normalizeRegion(region, allowFineCovering, nativeSourceContext));
  if (regions.length < 1
    || new Set(regions.map((entry) => entry.regionId)).size !== regions.length) {
    fail("SEMANTIC_GEOMETRY_REGION_DENOMINATOR_INVALID", seedId);
  }
  const polygonIds = new Set(regions.filter((entry) => (
    entry.geometry.kind === "polygon")).map((entry) => entry.regionId));
  for (const region of regions) {
    if (region.linkedRegionId && !polygonIds.has(region.linkedRegionId)) {
      fail("SEMANTIC_GEOMETRY_LINK_TARGET_INVALID",
        `${seedId}:${region.regionId}`);
    }
    if (region.geometry.kind === "connector" && !region.linkedRegionId) {
      fail("SEMANTIC_GEOMETRY_CONNECTOR_UNLINKED", `${seedId}:${region.regionId}`);
    }
  }
  const review = raw.review;
  if (!object(review) || review.runtimePixelInference !== false
    || !(Number(review.contourToleranceNormalized) > 0)
    || !Array.isArray(review.ambiguities)) {
    fail("SEMANTIC_GEOMETRY_REVIEW_BLOCK_INVALID", seedId);
  }
  const cellOwnershipPolicy = review.impassableCellOwnershipPolicy;
  if (cellOwnershipPolicy !== undefined
    && cellOwnershipPolicy !== SEMANTIC_GEOMETRY_EXCLUSIVE_CELL_OWNERSHIP_POLICY) {
    fail("SEMANTIC_GEOMETRY_CELL_OWNERSHIP_POLICY_INVALID", seedId);
  }
  const coveringPolicy = review.coveringCellIntersectionPolicy;
  if (coveringPolicy !== undefined
    && coveringPolicy !== SEMANTIC_GEOMETRY_COVERING_CELL_INTERSECTION_POLICY) {
    fail("SEMANTIC_GEOMETRY_COVERING_INTERSECTION_POLICY_INVALID", seedId);
  }
  const rimSelectionPolicy = review.localRampRimSelectionPolicy;
  if (rimSelectionPolicy !== undefined
    && rimSelectionPolicy !== "forward_ground_high_connector_v1") {
    fail("SEMANTIC_GEOMETRY_LOCAL_RAMP_RIM_POLICY_INVALID", seedId);
  }
  const body = {
    schema: OFFICIAL_COMPETITIVE_MAP_SEMANTIC_GEOMETRY_V1_SCHEMA,
    version: nativeSourceContext ? "1.1.0" : "1.0.0",
    seedId,
    displayName: String(raw.displayName || seedId),
    gameEra: String(raw.gameEra || ""),
    art: { assetPath: art.assetPath,
      pixelSize: { width: art.pixelSize.width, height: art.pixelSize.height },
      origin: "top_left", generatedOriginal: art.generatedOriginal === true,
      ...(artOverlays.length > 0 ? { sha256: art.sha256,
        overlays: artOverlays } : nativeSourceContext ? { sha256: art.sha256 } : {}) },
    normalizedSpace: { width: 1000, height: 1000, origin: "bottom_left" },
    battlefield: { widthInches: Number(raw.battlefield.widthInches),
      heightInches: Number(raw.battlefield.heightInches), origin: "bottom_left" },
    transform: semanticGeometryTransformV1({ ...raw, art,
      normalizedSpace: raw.normalizedSpace, battlefield: raw.battlefield }),
    regions,
    review: { authoredAt: String(review.authoredAt || ""),
      author: String(review.author || ""),
      method: String(review.method || ""),
      runtimePixelInference: false,
      contourToleranceNormalized: Number(review.contourToleranceNormalized),
      ...(nativeSourceContext ? { sourcePixelBoundaryPolicy: sourcePixelPolicy } : {}),
      ...(cellOwnershipPolicy !== undefined
        ? { impassableCellOwnershipPolicy: cellOwnershipPolicy } : {}),
      ...(coveringPolicy !== undefined
        ? { coveringCellIntersectionPolicy: coveringPolicy } : {}),
      ...(rimSelectionPolicy !== undefined
        ? { localRampRimSelectionPolicy: rimSelectionPolicy } : {}),
      sourceTopologyAnchors: [...(review.sourceTopologyAnchors || [])],
      ambiguities: [...review.ambiguities] },
    counts: {
      regions: regions.length,
      byClass: Object.fromEntries(SEMANTIC_TERRAIN_CLASSES_V1.map((klass) => [
        klass, regions.filter((entry) => entry.semanticClass === klass).length,
      ])),
    },
    runtimePixelInferenceAllowed: false,
    rulesAuthorityBeforeIntegration: false,
    rulesTruth: "authored_semantic_geometry_pending_rules_integration",
    trainingTruth: false,
  };
  const withGeometry = { ...body,
    geometryHash: hashStarcraftTmgClientContract({
      seedId: body.seedId, art: body.art, normalizedSpace: body.normalizedSpace,
      battlefield: body.battlefield, regions: body.regions }) };
  return deepFreeze({ ...withGeometry,
    bindingHash: hashStarcraftTmgClientContract(withGeometry) });
}

export function verifyOfficialCompetitiveMapSemanticGeometryBindingV1(binding) {
  if (!object(binding)
    || binding.schema !== OFFICIAL_COMPETITIVE_MAP_SEMANTIC_GEOMETRY_V1_SCHEMA
    || binding.runtimePixelInferenceAllowed !== false
    || binding.rulesAuthorityBeforeIntegration !== false
    || binding.trainingTruth !== false) {
    fail("SEMANTIC_GEOMETRY_BINDING_INVALID");
  }
  const rebuilt = createOfficialCompetitiveMapSemanticGeometryBindingV1({
    ...binding, schema: BINDING_SCHEMA });
  if (rebuilt.bindingHash !== binding.bindingHash
    || rebuilt.geometryHash !== binding.geometryHash) {
    fail("SEMANTIC_GEOMETRY_BINDING_HASH_INVALID", binding.seedId);
  }
  return true;
}

// Class separation review: impassable polygon area may not overlap any
// standable/cover/grass polygon; separately authored high surfaces may not
// overlap each other. High/grass/cover layering remains legal. Cliff edges
// and ramp connectors are linear
// and intentionally touch their linked high-ground region. Containment inside
// a reviewed HOLE of the other polygon is legal (e.g. a temple wall standing
// in the jungle ring's measured clearing, or an island inside a lake).
function polygonsOverlap(outerA, holesA, outerB, holesB) {
  for (let a = 0; a < outerA.length; a += 1) {
    const la = outerA[a];
    const lb = outerA[(a + 1) % outerA.length];
    for (let b = 0; b < outerB.length; b += 1) {
      if (segmentsIntersect(la, lb, outerB[b],
        outerB[(b + 1) % outerB.length])) {
        return true;
      }
    }
  }
  const insideRealArea = (point, outer, holes) => pointInRing(point, outer)
    && !holes.some((hole) => pointInRing(point, hole));
  return insideRealArea(outerA[0], outerB, holesB)
    || insideRealArea(outerB[0], outerA, holesA);
}

export function auditSemanticGeometryClassSeparationV1(binding) {
  verifyOfficialCompetitiveMapSemanticGeometryBindingV1(binding);
  const impassable = binding.regions.filter((entry) => (
    entry.semanticClass === "impassable_water"
      || entry.semanticClass === "impassable_void"
      || entry.semanticClass === "impassable_structure"));
  const others = binding.regions.filter((entry) => (
    entry.geometry.kind === "polygon"
      && entry.semanticClass !== "impassable_water"
      && entry.semanticClass !== "impassable_void"
      && entry.semanticClass !== "impassable_structure"));
  const violations = [];
  for (const left of impassable) {
    for (const right of others) {
      if (polygonsOverlap(left.geometry.rings[0], left.geometry.rings.slice(1),
        right.geometry.rings[0], right.geometry.rings.slice(1))) {
        violations.push(`${left.regionId} x ${right.regionId}`);
      }
    }
  }
  for (let a = 0; a < impassable.length; a += 1) {
    for (let b = a + 1; b < impassable.length; b += 1) {
      if (polygonsOverlap(impassable[a].geometry.rings[0],
        impassable[a].geometry.rings.slice(1),
        impassable[b].geometry.rings[0],
        impassable[b].geometry.rings.slice(1))) {
        violations.push(`${impassable[a].regionId} x ${impassable[b].regionId}`);
      }
    }
  }
  const highs = others.filter(entry => entry.semanticClass === "standable_high_ground");
  for (let a = 0; a < highs.length; a += 1) {
    const left = highs[a], leftBounds = ringBounds(left.geometry.rings[0]);
    for (let b = a + 1; b < highs.length; b += 1) {
      const right = highs[b], rightBounds = ringBounds(right.geometry.rings[0]);
      // A common boundary (zero area), unlike overlapping tops, is legal.
      if (Math.min(leftBounds.xMax, rightBounds.xMax)
          <= Math.max(leftBounds.xMin, rightBounds.xMin)
        || Math.min(leftBounds.yMax, rightBounds.yMax)
          <= Math.max(leftBounds.yMin, rightBounds.yMin)) continue;
      if (polygonsOverlap(left.geometry.rings[0], left.geometry.rings.slice(1),
        right.geometry.rings[0], right.geometry.rings.slice(1))) {
        violations.push(`${left.regionId} x ${right.regionId}`);
      }
    }
  }
  return { overlapFree: violations.length === 0, violations };
}

// ── Catalogue across the twenty-map programme ─────────────────────────────

export function createOfficialCompetitiveMapSemanticGeometryCatalogueV1(
  input = {}) {
  const bindings = (input.bindings || COMPETITIVE_MAP_SEMANTIC_GEOMETRY_BINDINGS_V1)
    .map((binding) => binding.schema === BINDING_SCHEMA
      ? createOfficialCompetitiveMapSemanticGeometryBindingV1(binding)
      : binding);
  for (const binding of bindings) {
    verifyOfficialCompetitiveMapSemanticGeometryBindingV1(binding);
  }
  if (new Set(bindings.map((entry) => entry.seedId)).size !== bindings.length) {
    fail("SEMANTIC_GEOMETRY_CATALOGUE_DUPLICATE_SEED");
  }
  let seedIds;
  if (input.seedCatalogue) {
    seedIds = input.seedCatalogue.seeds.map((seed) => seed.seedId);
  } else {
    seedIds = bindings.map((entry) => entry.seedId);
  }
  for (const binding of bindings) {
    if (!seedIds.includes(binding.seedId)) {
      fail("SEMANTIC_GEOMETRY_BINDING_NOT_IN_CATALOGUE", binding.seedId);
    }
  }
  const entries = seedIds.map((seedId) => {
    const binding = bindings.find((entry) => entry.seedId === seedId) || null;
    return { seedId,
      status: binding
        ? "authored_reviewed_pending_rules_integration"
        : "pending_semantic_authoring",
      bindingHash: binding?.bindingHash || null,
      regionCount: binding?.regions.length || 0,
      binding };
  });
  const body = {
    schema: OFFICIAL_COMPETITIVE_MAP_SEMANTIC_GEOMETRY_CATALOGUE_V1_SCHEMA,
    version: "1.0.0",
    entries,
    counts: { maps: entries.length,
      authored: entries.filter((entry) => entry.binding).length,
      pending: entries.filter((entry) => !entry.binding).length,
      regions: entries.reduce((sum, entry) => sum + entry.regionCount, 0) },
    contoursAreAuthoredReviewedBuildAssets: true,
    runtimePixelInferenceAllowed: false,
    artAndRulesProjectionShareCoordinateSystem: true,
    rulesAuthorityBeforeIntegration: false,
    rulesTruth: "semantic_map_geometry_catalogue_pending_rules_integration",
    trainingTruth: false,
  };
  return deepFreeze({ ...body,
    catalogueHash: hashStarcraftTmgClientContract(body) });
}

export function verifyOfficialCompetitiveMapSemanticGeometryCatalogueV1(
  catalogue) {
  if (!object(catalogue)
    || catalogue.schema
      !== OFFICIAL_COMPETITIVE_MAP_SEMANTIC_GEOMETRY_CATALOGUE_V1_SCHEMA
    || catalogue.contoursAreAuthoredReviewedBuildAssets !== true
    || catalogue.runtimePixelInferenceAllowed !== false
    || catalogue.artAndRulesProjectionShareCoordinateSystem !== true
    || catalogue.rulesAuthorityBeforeIntegration !== false
    || catalogue.trainingTruth !== false) {
    fail("SEMANTIC_GEOMETRY_CATALOGUE_INVALID");
  }
  const { catalogueHash, ...body } = catalogue;
  if (catalogueHash !== hashStarcraftTmgClientContract(body)) {
    fail("SEMANTIC_GEOMETRY_CATALOGUE_HASH_INVALID");
  }
  for (const entry of catalogue.entries) {
    if (entry.binding) {
      verifyOfficialCompetitiveMapSemanticGeometryBindingV1(entry.binding);
      if (entry.bindingHash !== entry.binding.bindingHash
        || entry.regionCount !== entry.binding.regions.length
        || entry.status !== "authored_reviewed_pending_rules_integration") {
        fail("SEMANTIC_GEOMETRY_CATALOGUE_ENTRY_INVALID", entry.seedId);
      }
    } else if (entry.status !== "pending_semantic_authoring"
      || entry.bindingHash !== null || entry.regionCount !== 0) {
      fail("SEMANTIC_GEOMETRY_CATALOGUE_ENTRY_INVALID", entry.seedId);
    }
  }
  return true;
}

export function getOfficialCompetitiveMapSemanticGeometryV1(catalogue, seedId) {
  const entry = catalogue?.entries?.find((value) => value.seedId === seedId);
  if (!entry?.binding) {
    fail("SEMANTIC_GEOMETRY_BINDING_UNKNOWN", String(seedId || ""));
  }
  return entry.binding;
}

// ── Alignment receipt: claim-to-pixel evidence ────────────────────────────

export function createSemanticGeometryAlignmentReceiptV1(binding, input = {}) {
  verifyOfficialCompetitiveMapSemanticGeometryBindingV1(binding);
  const includeMidpoints = input.includeEdgeMidpoints !== false;
  const samples = [];
  const push = (region, sampleKind, ordinal, point) => {
    const artPixel = normalizedToArtPixelV1(point, binding);
    const inches = normalizedToInchesV1(point, binding);
    const roundtripPixel = artPixelToNormalizedV1(artPixel, binding);
    const roundtripInches = inchesToNormalizedV1(inches, binding);
    samples.push({ regionId: region.regionId, semanticClass: region.semanticClass,
      sampleKind, ordinal, normalized: { x: point.x, y: point.y },
      artPixel, inches,
      roundtripErrorNormalized: fixed(Math.max(
        Math.abs(roundtripPixel.x - point.x), Math.abs(roundtripPixel.y - point.y),
        Math.abs(roundtripInches.x - point.x),
        Math.abs(roundtripInches.y - point.y))) });
  };
  const regionSummaries = binding.regions.map((region) => {
    let ordinal = 0;
    const paths = region.geometry.kind === "polygon"
      ? region.geometry.rings : [region.geometry.path];
    for (const path of paths) {
      const edgeCount = region.geometry.kind === "polygon"
        ? path.length : path.length - 1;
      for (let index = 0; index < path.length; index += 1) {
        ordinal += 1;
        push(region, "vertex", ordinal, path[index]);
        if (includeMidpoints && index < edgeCount) {
          const next = path[(index + 1) % path.length];
          ordinal += 1;
          push(region, "edge_midpoint", ordinal,
            { x: fixed((path[index].x + next.x) / 2),
              y: fixed((path[index].y + next.y) / 2) });
        }
      }
    }
    const outer = region.geometry.kind === "polygon"
      ? region.geometry.rings[0] : region.geometry.path;
    return { regionId: region.regionId, semanticClass: region.semanticClass,
      kind: region.geometry.kind,
      vertexCount: region.geometry.kind === "polygon"
        ? region.geometry.rings.reduce((sum, ring) => sum + ring.length, 0)
        : region.geometry.path.length,
      ringCount: region.geometry.kind === "polygon"
        ? region.geometry.rings.length : 0,
      boundsNormalized: ringBounds(outer),
      areaSquareInches: semanticRegionAreaSquareInchesV1(region, binding),
      sampleCount: samples.filter((entry) => (
        entry.regionId === region.regionId)).length };
  });
  const pixelOutOfBounds = samples.filter((entry) => (
    entry.artPixel.x < -TOLERANCE
      || entry.artPixel.x > binding.art.pixelSize.width + TOLERANCE
      || entry.artPixel.y < -TOLERANCE
      || entry.artPixel.y > binding.art.pixelSize.height + TOLERANCE));
  const maxRoundtrip = Math.max(...samples.map((entry) => (
    entry.roundtripErrorNormalized)));
  const body = {
    schema: OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ALIGNMENT_RECEIPT_V1_SCHEMA,
    version: "1.0.0",
    seedId: binding.seedId,
    bindingHash: binding.bindingHash,
    geometryHash: binding.geometryHash,
    transform: clone(binding.transform),
    artAssetPath: binding.art.assetPath,
    artPixelSize: clone(binding.art.pixelSize),
    contourToleranceNormalized: binding.review.contourToleranceNormalized,
    sampleCount: samples.length,
    samples,
    regionSummaries,
    totalsByClass: Object.fromEntries(SEMANTIC_TERRAIN_CLASSES_V1.map((klass) => [
      klass, {
        regions: regionSummaries.filter((entry) => entry.semanticClass === klass).length,
        areaSquareInches: fixed(regionSummaries.filter((entry) => (
          entry.semanticClass === klass)).reduce((sum, entry) => (
          sum + entry.areaSquareInches), 0)),
      },
    ])),
    maxRoundtripErrorNormalized: maxRoundtrip,
    allSamplePixelsInsideArt: pixelOutOfBounds.length === 0,
    demonstratesNormalizedPixelInchMapping: pixelOutOfBounds.length === 0
      && maxRoundtrip <= 0.01,
    ambiguities: [...binding.review.ambiguities],
    runtimePixelInferenceUsed: false,
    rulesAuthority: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...body,
    receiptHash: hashStarcraftTmgClientContract(body) });
}
