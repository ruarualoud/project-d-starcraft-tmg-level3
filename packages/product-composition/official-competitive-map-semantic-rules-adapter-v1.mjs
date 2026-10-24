// Ticket 24 / Slice 254-R7 — semantic-map geometry → Rules integration seam.
//
// This is the narrow versioned adapter that makes an authored
// SemanticGeometryBindingV1 the geometry the Rules engine sees. It compiles
// every semantic region into bounded axis-aligned milli-inch cell geometry
// (the official bounded geometry authority is axis-aligned rectangles; the
// cells are a deterministic rasterization of the authored contours at a
// declared resolution, never a bounding-box substitute), compiles ramp_access
// connectors into ground↔high access points, and certifies the result with
// deterministic geometry/topology/rules audits: class separation, cell
// coverage receipts, access topology, and the official spatial reachability
// audit (mission markers, reinforcement entry and control-area targets).
//
// Runtime pixel inference remains forbidden: the only geometry source is the
// reviewed build binding. This module never touches art pixels.

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  auditSemanticGeometryClassSeparationV1,
  createOfficialCompetitiveMapSemanticGeometryCatalogueV1,
  getOfficialCompetitiveMapSemanticGeometryV1,
  semanticRegionAreaSquareInchesV1,
  SEMANTIC_GEOMETRY_EXCLUSIVE_CELL_OWNERSHIP_POLICY,
  SEMANTIC_GEOMETRY_COVERING_CELL_INTERSECTION_POLICY,
  SEMANTIC_GEOMETRY_NATIVE_SOURCE_PIXEL_BOUNDARY_POLICY,
  verifyOfficialCompetitiveMapSemanticGeometryBindingV1,
} from "./official-competitive-map-semantic-geometry-v1.mjs";
import { createOfficialTerrainPieceV1 } from
  "../rule-atoms/official-terrain-los-rules-kernel-v1.mjs";
import { verifyOfficialPremadeTerrainAuthoringAgreementV1,
  validateOfficialPremadeTerrainAttributesV1,
  createOfficialPremadeSizeGuardedTerrainPieceV1 } from
  "./official-premade-terrain-authoring-agreement-v1.mjs";
import { createOfficialSpecialTerrainAgreementV1 } from
  "../rule-atoms/official-special-terrain-rules-kernel-v1.mjs";
import {
  createOfficialTerrainHeightTierLedgerV1,
  finalizeOfficialMissionMarkerPlacementV1,
} from "../rule-atoms/official-deployment-geometry-rules-kernel-v1.mjs";
import { auditOfficialCompetitiveMapSpatialReachabilityV1 } from
  "./official-competitive-map-spatial-reachability-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_SEMANTIC_RULES_GEOMETRY_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_semantic_rules_geometry_v1";
export const OFFICIAL_COMPETITIVE_MAP_SEMANTIC_TERRAIN_CERTIFICATE_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_semantic_terrain_certificate_v1";
export const OFFICIAL_COMPETITIVE_MAP_SEMANTIC_RULES_ADAPTER_VERSION = "1.0.0";
export const SEMANTIC_RULES_FINE_IMPASSABLE_VERSION = "1.1.0";
export const SEMANTIC_RULES_FINE_HIGH_SURFACE_VERSION = "1.2.0";
export const SEMANTIC_RULES_AUTHORED_APPROACH_VERSION = "1.3.0";
export const SEMANTIC_RULES_AUTHORED_APPROACH_POLICY = "authored_ground_high_endpoints_v1";
export const SEMANTIC_RULES_EXCLUSIVE_CELL_OWNERSHIP_VERSION = "1.4.0";
export const SEMANTIC_RULES_COVERING_CELL_INTERSECTION_VERSION = "1.5.0";
export const SEMANTIC_RULES_FINE_PASSABLE_COVERING_VERSION = "1.6.0";
export const SEMANTIC_RULES_NATIVE_SOURCE_CELLS_VERSION = "1.7.0";

// Declared rasterization resolution of the authored contours into the
// axis-aligned cell geometry the Rules engine consumes. 0.25in is inside the
// binding's declared ±0.86in contour tolerance.
export const SEMANTIC_RULES_CELL_RESOLUTION_MILLI_INCHES = 250;

// Versioned explicit semantic-class → Rules classification. Nothing is
// classified implicitly; cliff edges compile into the elevation-crossing
// contract of their linked standable region, ramps into access points.
export const SEMANTIC_RULES_CLASSIFICATION_V1 = Object.freeze({
  impassable_water: Object.freeze({ terrainKind: "impassable", size: 2,
    heightTier: "ground_level", standableHorizontalSurface: false,
    blocksPlacement: true, cellSampling: "covering",
    rulesSemantics: "blocks_movement_and_placement" }),
  impassable_void: Object.freeze({ terrainKind: "impassable", size: 2,
    heightTier: "ground_level", standableHorizontalSurface: false,
    blocksPlacement: true, cellSampling: "covering",
    rulesSemantics: "blocks_movement_and_placement" }),
  impassable_structure: Object.freeze({ terrainKind: "impassable", size: 2,
    heightTier: "ground_level", standableHorizontalSurface: false,
    blocksPlacement: true, cellSampling: "covering",
    rulesSemantics: "blocks_movement_and_placement" }),
  standable_high_ground: Object.freeze({ terrainKind: "ordinary", size: 3,
    heightTier: "high_ground", standableHorizontalSurface: true,
    blocksPlacement: false, cellSampling: "inscribed",
    rulesSemantics: "standable_high_ground_surface" }),
  grass_sight: Object.freeze({ terrainKind: "grass", size: 2,
    heightTier: "ground_level", standableHorizontalSurface: false,
    blocksPlacement: false, cellSampling: "covering",
    rulesSemantics: "breaks_sight_does_not_block_movement" }),
  ordinary_cover: Object.freeze({ terrainKind: "ordinary", size: 1,
    heightTier: "ground_level", standableHorizontalSurface: false,
    blocksPlacement: false, cellSampling: "covering",
    rulesSemantics: "passable_light_cover" }),
});

const TOLERANCE = 1; // milli-inch
const MAX_CELLS_PER_REGION = 4000;
const COVERAGE_RATIO_BOUNDS = Object.freeze({ covering: [0.6, 1.75],
  inscribed: [0.55, 1.0] });
const PREMADE_PROFILE_POLICY = "accepted_premade_per_group_v1";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function fixed(value) { return Number(Number(value).toFixed(3)); }
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) {
  return { ...body, [field]: hashStarcraftTmgContract(body) };
}
function milliRect(xMin, xMax, yMin, yMax) {
  return { shape: "axis_aligned_rectangle",
    minXMilliInches: Math.round(xMin), maxXMilliInches: Math.round(xMax),
    minYMilliInches: Math.round(yMin), maxYMilliInches: Math.round(yMax) };
}
function inchesRect(rect) {
  return { xMin: fixed(rect.minXMilliInches / 1000),
    xMax: fixed(rect.maxXMilliInches / 1000),
    yMin: fixed(rect.minYMilliInches / 1000),
    yMax: fixed(rect.maxYMilliInches / 1000) };
}

// ── Normalized polygon point tests (outer ring minus holes) ───────────────

function pointInRing(point, ring) {
  let inside = false;
  for (let a = 0, b = ring.length - 1; a < ring.length; b = a, a += 1) {
    const pa = ring[a];
    const pb = ring[b];
    if ((pa.y > point.y) !== (pb.y > point.y)
      && point.x < ((pb.x - pa.x) * (point.y - pa.y)) / (pb.y - pa.y) + pa.x) {
      inside = !inside;
    }
  }
  return inside;
}
function pointInPolygon(point, rings) {
  return pointInRing(point, rings[0])
    && !rings.slice(1).some((hole) => pointInRing(point, hole));
}

// Sutherland–Hodgman clipping against the convex cell. Signed boundary
// integration also handles concave rings; subtract hole intersections from
// the outer intersection, not five point samples. Translate to the local
// cell before integrating to avoid cancellation at large world coordinates.
function clippedRingArea(ring, x0, y0, x1, y1) {
  let polygon = ring.map(p => ({ x: p.x - x0, y: p.y - y0 }));
  for (const [axis, limit, lower] of [
    ["x", 0, true], ["x", x1 - x0, false],
    ["y", 0, true], ["y", y1 - y0, false],
  ]) {
    const clipped = [];
    const inside = p => lower ? p[axis] >= limit : p[axis] <= limit;
    for (let index = 0; index < polygon.length; index++) {
      const a = polygon[index], b = polygon[(index + 1) % polygon.length];
      const aInside = inside(a), bInside = inside(b);
      if (aInside) clipped.push(a);
      if (aInside !== bInside) {
        const t = (limit - a[axis]) / (b[axis] - a[axis]);
        clipped.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
      }
    }
    polygon = clipped;
    if (polygon.length < 3) return 0;
  }
  let area = 0;
  for (let index = 0; index < polygon.length; index++) {
    const a = polygon[index], b = polygon[(index + 1) % polygon.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area / 2);
}
function polygonCellHasPositiveArea(rings, x0, y0, x1, y1) {
  const outerArea = clippedRingArea(rings[0], x0, y0, x1, y1);
  if (outerArea <= 1e-8) return false;
  const holesArea = rings.slice(1).reduce((sum, hole) =>
    sum + clippedRingArea(hole, x0, y0, x1, y1), 0);
  // Milli-inch squared numerical tolerance, not a claim about infinitesimal
  // source areas. Tangent/edge-only contact does not occupy a whole cell.
  return outerArea - holesArea > 1e-8;
}

// ── Cell rasterization + maximal-run rectangle merge ──────────────────────

// The binding already validates integer cell-edge rings against the original
// ART dimensions. Scan their row runs, preserving holes, then transform every
// boundary on the same global axes. No image reads, local resampling, dilation
// or bbox substitution. Merge uses the existing rectangle-union helper.
function nativeSourcePixelCells(region, binding) {
  if (region.rasterResolutionMilliInches !== undefined) {
    fail("SEMANTIC_RULES_NATIVE_PIXEL_RASTER_POLICY_CONFLICT", region.regionId);
  }
  const rings = region.geometry.sourcePixelRings;
  if (!rings?.length) fail("SEMANTIC_RULES_NATIVE_PIXEL_RINGS_MISSING", region.regionId);
  const width = binding.art.pixelSize.width; const height = binding.art.pixelSize.height;
  const widthMilli = Math.round(binding.battlefield.widthInches * 1000);
  const heightMilli = Math.round(binding.battlefield.heightInches * 1000);
  const ys = rings[0].map(point => point[1]);
  const cells = [];
  for (let y = Math.min(...ys); y < Math.max(...ys); y += 1) {
    const intersections = [];
    for (const ring of rings) for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]; const b = ring[(i + 1) % ring.length];
      if ((a[1] > y + 0.5) !== (b[1] > y + 0.5)) intersections.push(a[0]);
    }
    intersections.sort((a, b) => a - b);
    if (intersections.length % 2) fail("SEMANTIC_RULES_NATIVE_PIXEL_SCANLINE_INVALID", region.regionId);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const left = intersections[i]; const right = intersections[i + 1];
      if (left === right) continue;
      const cell = milliRect(left / width * widthMilli, right / width * widthMilli,
        (1 - (y + 1) / height) * heightMilli, (1 - y / height) * heightMilli);
      if (cell.minXMilliInches >= cell.maxXMilliInches || cell.minYMilliInches >= cell.maxYMilliInches) {
        fail("SEMANTIC_RULES_NATIVE_PIXEL_BELOW_MILLI_PRECISION", region.regionId);
      }
      cells.push(cell);
    }
  }
  const merged = mergeAdjacentRectangles(cells);
  if (!merged.length || merged.length > MAX_CELLS_PER_REGION) {
    fail("SEMANTIC_RULES_CELL_DENOMINATOR_INVALID", region.regionId);
  }
  return merged;
}

function rasterizeRegion(region, binding, sampling) {
  if (binding.review.sourcePixelBoundaryPolicy === SEMANTIC_GEOMETRY_NATIVE_SOURCE_PIXEL_BOUNDARY_POLICY) {
    return nativeSourcePixelCells(region, binding);
  }
  const resolution = region.rasterResolutionMilliInches
    ?? SEMANTIC_RULES_CELL_RESOLUTION_MILLI_INCHES;
  const widthMilli = Math.round(binding.battlefield.widthInches * 1000);
  const heightMilli = Math.round(binding.battlefield.heightInches * 1000);
  const scaleX = widthMilli / binding.normalizedSpace.width;
  const scaleY = heightMilli / binding.normalizedSpace.height;
  const rings = region.geometry.rings;
  const xs = rings[0].map((point) => point.x);
  const ys = rings[0].map((point) => point.y);
  const minX = Math.max(0, Math.floor((Math.min(...xs) * scaleX) / resolution));
  const maxX = Math.min(Math.ceil(widthMilli / resolution) - 1,
    Math.ceil((Math.max(...xs) * scaleX) / resolution));
  const minY = Math.max(0, Math.floor((Math.min(...ys) * scaleY) / resolution));
  const maxY = Math.min(Math.ceil(heightMilli / resolution) - 1,
    Math.ceil((Math.max(...ys) * scaleY) / resolution));
  const columns = maxX - minX + 1;
  const rows = maxY - minY + 1;
  // Sample-budget units must track two-axis raster density. Explicit125
  // samples four times as many points as250 over the same physical bounds;
  // keep the existing physical-area budget and emitted-rectangle cap, rather
  // than accidentally rejecting a supported fine surface solely for density.
  const sampleBudget = 4 * MAX_CELLS_PER_REGION
    * (SEMANTIC_RULES_CELL_RESOLUTION_MILLI_INCHES / resolution) ** 2;
  if (columns <= 0 || rows <= 0 || columns * rows > sampleBudget) {
    fail("SEMANTIC_RULES_RASTER_BOUNDS_INVALID", region.regionId);
  }
  const inside = (mx, my) => pointInPolygon(
    { x: mx / scaleX, y: my / scaleY }, rings);
  const positiveAreaCovering = sampling === "covering"
    && binding.review.coveringCellIntersectionPolicy
      === SEMANTIC_GEOMETRY_COVERING_CELL_INTERSECTION_POLICY;
  const milliRings = positiveAreaCovering ? rings.map(ring => ring.map(point =>
    ({ x: point.x * scaleX, y: point.y * scaleY }))) : null;
  const filled = [];
  for (let row = 0; row < rows; row += 1) {
    const line = new Array(columns).fill(false);
    for (let column = 0; column < columns; column += 1) {
      const x0 = (minX + column) * resolution;
      const y0 = (minY + row) * resolution;
      const x1 = x0 + resolution;
      const y1 = y0 + resolution;
      if (positiveAreaCovering) {
        line[column] = polygonCellHasPositiveArea(milliRings, x0, y0, x1, y1);
        continue;
      }
      const samples = [
        [(x0 + x1) / 2, (y0 + y1) / 2], [x0, y0], [x1, y0], [x0, y1], [x1, y1],
      ];
      const hits = samples.filter(([sx, sy]) => inside(sx, sy)).length;
      line[column] = sampling === "inscribed" ? hits === samples.length : hits > 0;
    }
    filled.push(line);
  }
  // Greedy maximal-rectangle cover of the filled grid: repeatedly emit the
  // largest all-filled axis-aligned rectangle. Non-overlapping by
  // construction; keeps standable surfaces in pieces big enough for current
  // bases instead of row-sliver runs.
  const remaining = filled.map((line) => [...line]);
  const merged = [];
  for (;;) {
    // Maximal rectangle in a binary matrix via histogram stacks.
    const heights = new Array(columns).fill(0);
    let best = null;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        heights[column] = remaining[row][column] ? heights[column] + 1 : 0;
      }
      const stack = [];
      for (let column = 0; column <= columns; column += 1) {
        const height = column < columns ? heights[column] : 0;
        let start = column;
        while (stack.length > 0 && stack[stack.length - 1].height > height) {
          const top = stack.pop();
          const area = top.height * (column - top.index);
          if (!best || area > best.area) {
            best = { area, rowStart: row - top.height + 1, rowEnd: row,
              columnStart: top.index, columnEnd: column - 1 };
          }
          start = top.index;
        }
        stack.push({ height, index: start });
      }
    }
    if (!best) break;
    for (let row = best.rowStart; row <= best.rowEnd; row += 1) {
      for (let column = best.columnStart; column <= best.columnEnd; column += 1) {
        remaining[row][column] = false;
      }
    }
    merged.push(milliRect(
      (minX + best.columnStart) * resolution,
      (minX + best.columnEnd + 1) * resolution,
      (minY + best.rowStart) * resolution,
      (minY + best.rowEnd + 1) * resolution));
    if (merged.length > MAX_CELLS_PER_REGION) {
      fail("SEMANTIC_RULES_CELL_DENOMINATOR_INVALID", region.regionId);
    }
  }
  merged.sort((left, right) => left.minYMilliInches - right.minYMilliInches
    || left.minXMilliInches - right.minXMilliInches);
  if (merged.length === 0) {
    fail("SEMANTIC_RULES_CELL_DENOMINATOR_INVALID", region.regionId);
  }
  return merged;
}

function rectsBounds(rects) {
  return milliRect(
    Math.min(...rects.map((entry) => entry.minXMilliInches)),
    Math.max(...rects.map((entry) => entry.maxXMilliInches)),
    Math.min(...rects.map((entry) => entry.minYMilliInches)),
    Math.max(...rects.map((entry) => entry.maxYMilliInches)));
}
function rectsAreaSquareInches(rects) {
  return fixed(rects.reduce((sum, entry) => sum
    + ((entry.maxXMilliInches - entry.minXMilliInches)
      * (entry.maxYMilliInches - entry.minYMilliInches)) / 1e6, 0));
}
function pointRectDistanceMilli(point, rect) {
  const x = Math.max(rect.minXMilliInches,
    Math.min(point.xMilliInches, rect.maxXMilliInches));
  const y = Math.max(rect.minYMilliInches,
    Math.min(point.yMilliInches, rect.maxYMilliInches));
  return Math.hypot(point.xMilliInches - x, point.yMilliInches - y);
}
function segmentIntersectsRectMilli(a, b, rect) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  let minimum = 0; let maximum = 1;
  for (const [direction, offset] of [
    [-dx, a.xMilliInches - rect.minXMilliInches],
    [dx, rect.maxXMilliInches - a.xMilliInches],
    [-dy, a.yMilliInches - rect.minYMilliInches],
    [dy, rect.maxYMilliInches - a.yMilliInches],
  ]) {
    if (direction === 0) { if (offset < 0) return false; continue; }
    const ratio = offset / direction;
    if (direction < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return maximum >= 0 && minimum <= 1;
}

// ── Ramp connector → Rules access point ───────────────────────────────────

function compileAccessPoint(ramp, linkedCells, binding, blockingCells = null,
  impassableCells = null) {
  const scaleX = (binding.battlefield.widthInches * 1000)
    / binding.normalizedSpace.width;
  const scaleY = (binding.battlefield.heightInches * 1000)
    / binding.normalizedSpace.height;
  const widthMilli = (ramp.geometry.widthNormalized / 1000)
    * binding.battlefield.widthInches * 1000;
  const ends = ramp.geometry.path.map((point) => ({
    xMilliInches: Math.round(point.x * scaleX),
    yMilliInches: Math.round(point.y * scaleY),
  }));
  const distanceToCells = (end) => Math.min(...linkedCells.map((cell) => (
    pointRectDistanceMilli(end, cell))));
  const authoredApproach = ramp.geometry.approachPolicy === SEMANTIC_RULES_AUTHORED_APPROACH_POLICY;
  const highEnd = authoredApproach ? ends[1]
    : distanceToCells(ends[0]) <= distanceToCells(ends[1]) ? ends[0] : ends[1];
  const groundEnd = highEnd === ends[0] ? ends[1] : ends[0];
  if (authoredApproach && (distanceToCells(highEnd) > TOLERANCE
    || blockingCells?.some(cell => pointInsideCell(groundEnd.xMilliInches,
      groundEnd.yMilliInches, cell))
    || impassableCells?.some(cell => segmentIntersectsRectMilli(groundEnd, highEnd, cell)))) {
    fail("SEMANTIC_RULES_AUTHORED_APPROACH_INVALID", ramp.regionId);
  }
  const half = widthMilli / 2;
  const widthMilliBoard = Math.round(binding.battlefield.widthInches * 1000);
  const heightMilliBoard = Math.round(binding.battlefield.heightInches * 1000);
  const footprint = milliRect(
    Math.max(0, Math.min(...ends.map((end) => end.xMilliInches)) - half),
    Math.min(widthMilliBoard,
      Math.max(...ends.map((end) => end.xMilliInches)) + half),
    Math.max(0, Math.min(...ends.map((end) => end.yMilliInches)) - half),
    Math.min(heightMilliBoard,
      Math.max(...ends.map((end) => end.yMilliInches)) + half));
  // Linkage is measured from the ramp FOOTPRINT (the connector path expanded
  // by its authored width) to the linked region's cells: the capsule must
  // reach the standable geometry within the declared contour tolerance.
  const reachMilli = Math.min(...linkedCells.map((cell) => {
    const dx = Math.max(0, cell.minXMilliInches - footprint.maxXMilliInches,
      footprint.minXMilliInches - cell.maxXMilliInches);
    const dy = Math.max(0, cell.minYMilliInches - footprint.maxYMilliInches,
      footprint.minYMilliInches - cell.maxYMilliInches);
    return Math.hypot(dx, dy);
  }));
  const linkageBoundMilli = Math.round(
    (binding.review.contourToleranceNormalized / 1000)
      * binding.battlefield.widthInches * 1000) + TOLERANCE;
  if (reachMilli > linkageBoundMilli) {
    fail("SEMANTIC_RULES_RAMP_DISCONNECTED", ramp.regionId);
  }
  let approachOutside = authoredApproach ? { ...groundEnd } : {
    xMilliInches: Math.max(0, Math.min(widthMilliBoard,
      groundEnd.xMilliInches + Math.round((groundEnd.xMilliInches
        - highEnd.xMilliInches) * 2))),
    yMilliInches: Math.max(0, Math.min(heightMilliBoard,
      groundEnd.yMilliInches + Math.round((groundEnd.yMilliInches
        - highEnd.yMilliInches) * 2))),
  };
  // Open-ground snap (2026-09-25, Python review): the blind ×2 extrapolation
  // can land inside an impassable body or make the approach segment cross
  // one when the ramp's ground side faces a narrow dry strip (Python SE ramp:
  // the extrapolated ray goes west into the south-centre water while dry
  // ground continues along the strip, verified on the art). In that case
  // search the eight compass directions around the ramp mouth for a point
  // that is open-standing AND whose segment to the ramp's high end crosses no
  // impassable cell; keep the extrapolated point only when nothing works, so
  // a genuinely waterlocked ramp still fails the audit closed. Previously
  // passing ramps have dry straight approaches and are unaffected.
  if (!authoredApproach && blockingCells && impassableCells) {
    const openStanding = (p) => !blockingCells.some((cell) => (
      pointInsideCell(p.xMilliInches, p.yMilliInches, cell)));
    const crosses = (a, b) => impassableCells.some((cell) => (
      segmentIntersectsRectMilli(a, b, cell)));
    if (!openStanding(approachOutside) || crosses(approachOutside, highEnd)) {
      const lengthMilli = Math.max(1000, Math.round(Math.hypot(
        groundEnd.xMilliInches - highEnd.xMilliInches,
        groundEnd.yMilliInches - highEnd.yMilliInches) * 2));
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const candidate = {
          xMilliInches: Math.max(0, Math.min(widthMilliBoard,
            groundEnd.xMilliInches + dx * lengthMilli)),
          yMilliInches: Math.max(0, Math.min(heightMilliBoard,
            groundEnd.yMilliInches + dy * lengthMilli)),
        };
        if (openStanding(candidate) && !crosses(candidate, highEnd)) {
          approachOutside = candidate;
          break;
        }
      }
    }
  }
  return {
    accessPointId: `semantic:${ramp.regionId}`,
    role: "ramp",
    sourceRampRegionId: ramp.regionId,
    footprint,
    gateWidthMilliInches: widthMilli,
    connects: ["ground", "high"],
    linkDistanceMilliInches: Math.round(reachMilli),
    groundApproachPath: [
      { x: fixed(approachOutside.xMilliInches / 1000),
        y: fixed(approachOutside.yMilliInches / 1000) },
      { x: fixed(highEnd.xMilliInches / 1000),
        y: fixed(highEnd.yMilliInches / 1000) },
    ],
    groundApproachPathMilli: [approachOutside, highEnd],
    ...(authoredApproach ? { approachPolicy: SEMANTIC_RULES_AUTHORED_APPROACH_POLICY } : {}),
  };
}

// ── Explicit cell ownership for shared source edges ──────────────────────

function subtractRectangle(rect, cut) {
  const x0 = Math.max(rect.minXMilliInches, cut.minXMilliInches);
  const x1 = Math.min(rect.maxXMilliInches, cut.maxXMilliInches);
  const y0 = Math.max(rect.minYMilliInches, cut.minYMilliInches);
  const y1 = Math.min(rect.maxYMilliInches, cut.maxYMilliInches);
  if (x0 >= x1 || y0 >= y1) return [rect];
  // Four disjoint pieces exactly preserve rect minus its intersection.
  const pieces = [];
  if (rect.minXMilliInches < x0) pieces.push(milliRect(
    rect.minXMilliInches, x0, rect.minYMilliInches, rect.maxYMilliInches));
  if (x1 < rect.maxXMilliInches) pieces.push(milliRect(
    x1, rect.maxXMilliInches, rect.minYMilliInches, rect.maxYMilliInches));
  if (rect.minYMilliInches < y0) pieces.push(milliRect(
    x0, x1, rect.minYMilliInches, y0));
  if (y1 < rect.maxYMilliInches) pieces.push(milliRect(
    x0, x1, y1, rect.maxYMilliInches));
  return pieces;
}

function subtractRectangles(rects, cuts) {
  return rects.flatMap(rect => {
    // Filter against the original rectangle; every resulting piece stays
    // inside it. Avoid expensive clipping against unrelated map regions.
    const relevant = cuts.filter(cut => cut.minXMilliInches < rect.maxXMilliInches
      && cut.maxXMilliInches > rect.minXMilliInches
      && cut.minYMilliInches < rect.maxYMilliInches
      && cut.maxYMilliInches > rect.minYMilliInches);
    return relevant.reduce((pieces, cut) => (
      pieces.flatMap(piece => subtractRectangle(piece, cut))), [rect]);
  });
}

function mergeAdjacentRectangles(rects) {
  const mergeAxis = (entries, axis) => {
    const other = axis === "X" ? "Y" : "X";
    const min = `min${axis}MilliInches`, max = `max${axis}MilliInches`;
    const otherMin = `min${other}MilliInches`, otherMax = `max${other}MilliInches`;
    const sorted = entries.slice().sort((a, b) => a[otherMin] - b[otherMin]
      || a[otherMax] - b[otherMax] || a[min] - b[min] || a[max] - b[max]);
    const merged = [];
    for (const rect of sorted) {
      const previous = merged.at(-1);
      if (previous && previous[otherMin] === rect[otherMin]
        && previous[otherMax] === rect[otherMax] && previous[max] === rect[min]) {
        previous[max] = rect[max];
      } else merged.push({ ...rect });
    }
    return merged;
  };
  let merged = rects;
  for (;;) {
    const next = mergeAxis(mergeAxis(merged, "Y"), "X");
    if (next.length === merged.length) return next.sort((a, b) => (
      a.minYMilliInches - b.minYMilliInches || a.minXMilliInches - b.minXMilliInches
        || a.maxYMilliInches - b.maxYMilliInches || a.maxXMilliInches - b.maxXMilliInches));
    merged = next;
  }
}

function replaceOwnedCells(region, cells) {
  if (!cells.length || cells.length > MAX_CELLS_PER_REGION) {
    fail("SEMANTIC_RULES_CELL_OWNERSHIP_DENOMINATOR_INVALID", region.regionId);
  }
  region.footprintCells = cells;
  region.footprint = rectsBounds(cells);
  region.cellRectCount = cells.length;
  region.cellAreaSquareInches = rectsAreaSquareInches(cells);
}

function assignExclusiveCellOwnership(regions, binding) {
  // Arbitration is for raster halos on shared source edges, never for
  // hiding overlapping authored terrain. The existing source audit stays.
  const separation = auditSemanticGeometryClassSeparationV1(binding);
  if (!separation.overlapFree) {
    fail("SEMANTIC_RULES_CELL_OWNERSHIP_SOURCE_CONFLICT", separation.violations[0]);
  }
  // Keep inscribed high cells WHOLE: Room cliff and gate consumers rebuild
  // their declared125/250 grid. Partial high cells would break that contract.
  const protectedHigh = regions.filter(region => (
    region.rulesClassification.standableHorizontalSurface))
    .flatMap(region => region.footprintCells);
  const priority = { impassable_structure: 0, impassable_water: 1, impassable_void: 2 };
  const blockers = regions.filter(region => region.rulesClassification.terrainKind === "impassable")
    .sort((a, b) => priority[a.semanticClass] - priority[b.semanticClass]
      || (a.regionId < b.regionId ? -1 : a.regionId > b.regionId ? 1 : 0));
  const ownedBlockers = [];
  for (const region of blockers) {
    const cells = mergeAdjacentRectangles(subtractRectangles(region.footprintCells,
      [...protectedHigh, ...ownedBlockers]));
    replaceOwnedCells(region, cells);
    ownedBlockers.push(...cells);
  }
  for (const region of regions) {
    if (region.rulesClassification.terrainKind === "impassable"
      || region.rulesClassification.standableHorizontalSurface) continue;
    replaceOwnedCells(region, mergeAdjacentRectangles(
      subtractRectangles(region.footprintCells, ownedBlockers)));
  }
}

function premadeProfileClassification(definition, semanticClass) {
  const attributes = validateOfficialPremadeTerrainAttributesV1(definition.attributes, definition.instanceId);
  const compatible = attributes.terrainKind === "ordinary"
    ? attributes.heightTier === "ground_level" && !attributes.standableHorizontalSurface
      ? semanticClass === "ordinary_cover"
      : attributes.heightTier === "mid_ground" && attributes.standableHorizontalSurface
        && [1, 2].includes(attributes.size)
        ? semanticClass === "ordinary_cover"
      : attributes.heightTier === "high_ground" && attributes.standableHorizontalSurface
        && attributes.size >= 3 && semanticClass === "standable_high_ground"
    : attributes.terrainKind === "ramp"
      ? attributes.size === 1 && attributes.heightTier === "mid_ground"
        && attributes.standableHorizontalSurface && semanticClass === "ordinary_cover"
    : attributes.heightTier === "ground_level" && !attributes.standableHorizontalSurface
      && (attributes.terrainKind === "grass" ? semanticClass === "grass_sight"
        : attributes.terrainKind === "impassable"
          && ["impassable_structure", "impassable_water", "impassable_void"].includes(semanticClass));
  if (!compatible) fail("SEMANTIC_RULES_PREMADE_PROFILE_CLASS_SHAPE_UNSUPPORTED", definition.instanceId);
  // An image hole is not an agreed opening. Explicit openings need their
  // separate geometry contract before this adapter may execute them.
  if (attributes.openingsPolicy !== "no_openings_agreed") {
    fail("SEMANTIC_RULES_PREMADE_OPENING_GEOMETRY_REQUIRED", definition.instanceId);
  }
  return { ...attributes, cellSampling: SEMANTIC_RULES_CLASSIFICATION_V1[semanticClass].cellSampling,
    rulesSemantics: "explicit_premade_setup_terrain_agreement" };
}

// Authoring derives only the display class from an explicit definition. The
// same classifier below remains responsible for supported Rules shapes;
// images, component names and class defaults never supply missing attributes.
export function semanticClassForOfficialPremadeTerrainDefinitionV1(definition) {
  const attributes = validateOfficialPremadeTerrainAttributesV1(definition?.attributes, definition?.instanceId);
  const semanticClass = attributes.terrainKind === "ordinary"
    ? attributes.heightTier === "high_ground" ? "standable_high_ground" : "ordinary_cover"
    : attributes.terrainKind === "grass" ? "grass_sight"
      : attributes.terrainKind === "impassable" ? "impassable_structure"
        : attributes.terrainKind === "ramp" ? "ordinary_cover" : null;
  premadeProfileClassification(definition, semanticClass);
  return semanticClass;
}

function acceptedPremadeProfiles(binding, input) {
  if (input.terrainAgreement === undefined && input.terrainRegionInstances === undefined) return null;
  const instances = input.terrainRegionInstances;
  if (!object(instances)) fail("SEMANTIC_RULES_PREMADE_REGION_INSTANCE_MAP_REQUIRED");
  if (binding.review.sourcePixelBoundaryPolicy !== SEMANTIC_GEOMETRY_NATIVE_SOURCE_PIXEL_BOUNDARY_POLICY) {
    fail("SEMANTIC_RULES_PREMADE_NATIVE_SOURCE_REQUIRED");
  }
  const polygons = binding.regions.filter(r => r.geometry.kind === "polygon");
  if (Object.keys(instances).length !== polygons.length || polygons.some(r => !Object.hasOwn(instances, r.regionId))) {
    fail("SEMANTIC_RULES_PREMADE_REGION_INSTANCE_DENOMINATOR_MISMATCH");
  }
  verifyOfficialPremadeTerrainAuthoringAgreementV1(input.terrainAgreement, {
    mapId: binding.seedId, sourceArtSha256: binding.art.sha256,
    instanceIds: [...new Set(Object.values(instances))],
  });
  const definitions = new Map(input.terrainAgreement.definitions.map(d => [d.instanceId, d]));
  return new Map(polygons.map(r => {
    const definition = definitions.get(instances[r.regionId]);
    return [r.regionId, { definition, classification: premadeProfileClassification(definition, r.semanticClass) }];
  }));
}

function uniquePremadeAccessPoints(ports, detail) {
  const byId = new Map();
  for (const port of ports) {
    if (byId.has(port.accessPointId) && JSON.stringify(byId.get(port.accessPointId)) !== JSON.stringify(port)) {
      fail("SEMANTIC_RULES_PREMADE_GROUP_ACCESS_CONFLICT", detail);
    }
    byId.set(port.accessPointId, port);
  }
  return [...byId.values()].sort((a, b) => a.accessPointId.localeCompare(b.accessPointId));
}

function groupPremadeTerrainRegions(regions) {
  const groups = new Map();
  for (const region of regions) {
    const previous = groups.get(region.terrainGroupId);
    if (!previous) { groups.set(region.terrainGroupId, clone(region)); continue; }
    if (previous.semanticClass !== region.semanticClass
      || JSON.stringify(previous.rulesClassification) !== JSON.stringify(region.rulesClassification)) {
      fail("SEMANTIC_RULES_PREMADE_GROUP_CLASS_CONFLICT", region.terrainGroupId);
    }
    previous.sourceRegionIds.push(...region.sourceRegionIds);
    previous.terrainInstanceIds = [...new Set([...previous.terrainInstanceIds, ...region.terrainInstanceIds])];
    previous.footprintCells.push(...region.footprintCells);
    previous.polygonAreaSquareInches = fixed(previous.polygonAreaSquareInches + region.polygonAreaSquareInches);
    if (region.accessPoints) previous.accessPoints = [...(previous.accessPoints || []), ...region.accessPoints];
  }
  return [...groups.values()].map(region => {
    // Grouping changes piece identity, not already-compiled geometry. Retain
    // each source component's actual rectangles without another resampling
    // or merge; the Room tests their union, never the bounding envelope.
    const cells = region.footprintCells;
    const cellArea = rectsAreaSquareInches(cells);
    const accessPoints = uniquePremadeAccessPoints(region.accessPoints || [], region.terrainGroupId);
    // A bounding envelope may span a hole. Metadata ports must intersect
    // actual source cells; full-base traversal is still a separate Room gate.
    for (const port of accessPoints) if (!cells.some(cell => (
      port.footprint.minXMilliInches < cell.maxXMilliInches
      && port.footprint.maxXMilliInches > cell.minXMilliInches
      && port.footprint.minYMilliInches < cell.maxYMilliInches
      && port.footprint.maxYMilliInches > cell.minYMilliInches))) {
      fail("SEMANTIC_RULES_PREMADE_ACCESS_OUTSIDE_SOURCE_UNION", port.accessPointId);
    }
    return { ...region, regionId: region.terrainGroupId,
      ...(region.accessPoints !== undefined ? { accessPoints } : {}),
      footprint: rectsBounds(cells), footprintCells: cells, cellRectCount: cells.length,
      cellAreaSquareInches: cellArea,
      coverageRatio: region.polygonAreaSquareInches > 0 ? fixed(cellArea / region.polygonAreaSquareInches) : 1 };
  });
}

function verifyCompiledPremadeProfiles(geometry) {
  const agreement = geometry.terrainAuthoringAgreement;
  const instances = geometry.terrainRegionInstances;
  if (agreement === undefined && instances === undefined && geometry.classificationPolicy === undefined) return;
  if (geometry.classificationPolicy !== PREMADE_PROFILE_POLICY || !geometry.sourcePixelCellGeometry || !object(instances)) {
    fail("SEMANTIC_RULES_PREMADE_PROFILE_POLICY_INVALID");
  }
  verifyOfficialPremadeTerrainAuthoringAgreementV1(agreement, { mapId: geometry.seedId,
    sourceArtSha256: geometry.sourcePixelCellGeometry.artSha256, instanceIds: [...new Set(Object.values(instances))] });
  const definitions = new Map(agreement.definitions.map(d => [d.instanceId, d]));
  const seen = new Set();
  const groupIds = new Set();
  for (const region of geometry.regions) {
    if (region.regionId !== region.terrainGroupId || groupIds.has(region.terrainGroupId)
      || !Array.isArray(region.sourceRegionIds) || !region.sourceRegionIds.length
      || !Array.isArray(region.terrainInstanceIds) || !region.terrainInstanceIds.length) {
      fail("SEMANTIC_RULES_PREMADE_COMPILED_GROUP_INVALID", region.regionId);
    }
    groupIds.add(region.terrainGroupId);
    const represented = new Set();
    for (const id of region.sourceRegionIds) {
      const definition = definitions.get(instances[id]);
      if (seen.has(id) || !definition || definition.terrainGroupId !== region.terrainGroupId
        || JSON.stringify(region.rulesClassification) !== JSON.stringify(premadeProfileClassification(definition, region.semanticClass))) {
        fail("SEMANTIC_RULES_PREMADE_COMPILED_PROFILE_MISMATCH", id);
      }
      seen.add(id); represented.add(definition.instanceId);
    }
    if (region.terrainInstanceIds.length !== represented.size || region.terrainInstanceIds.some(id => !represented.has(id))) {
      fail("SEMANTIC_RULES_PREMADE_COMPILED_INSTANCE_MISMATCH", region.regionId);
    }
    const expectedPorts = uniquePremadeAccessPoints([...represented].flatMap(id => definitions.get(id).accessPoints || []),
      region.terrainGroupId);
    if (JSON.stringify(region.accessPoints || []) !== JSON.stringify(expectedPorts)) {
      fail("SEMANTIC_RULES_PREMADE_COMPILED_ACCESS_MISMATCH", region.regionId);
    }
  }
  if (seen.size !== Object.keys(instances).length || groupIds.size !== agreement.counts.groups) {
    fail("SEMANTIC_RULES_PREMADE_COMPILED_DENOMINATOR_MISMATCH");
  }
}

// These legacy class-only point/path/LOS hints lack model Size, Flying,
// agreed opening and full-base context. Use actual Room Rules queries for a
// per-piece profile instead of returning a wrong class-default conclusion.
function requireLegacyClassQueryContext(geometry) {
  if (geometry.terrainAuthoringAgreement) fail("SEMANTIC_RULES_PROFILE_QUERY_REQUIRES_ROOM_RULES_CONTEXT");
}

// ── Compile: binding → versioned Rules geometry ───────────────────────────

export function compileOfficialCompetitiveMapSemanticRulesGeometryV1(input = {}) {
  const binding = input.binding;
  verifyOfficialCompetitiveMapSemanticGeometryBindingV1(binding);
  const cellOwnershipPolicy = binding.review.impassableCellOwnershipPolicy;
  const coveringPolicy = binding.review.coveringCellIntersectionPolicy;
  const nativeSource = binding.review.sourcePixelBoundaryPolicy
    === SEMANTIC_GEOMETRY_NATIVE_SOURCE_PIXEL_BOUNDARY_POLICY;
  const profiles = acceptedPremadeProfiles(binding, input);
  let regions = [];
  for (const region of binding.regions) {
    if (region.geometry.kind !== "polygon") continue;
    const profile = profiles?.get(region.regionId);
    const classification = profile?.classification || SEMANTIC_RULES_CLASSIFICATION_V1[region.semanticClass];
    if (!classification) {
      fail("SEMANTIC_RULES_CLASSIFICATION_MISSING", region.semanticClass);
    }
    const cells = rasterizeRegion(region, binding, classification.cellSampling);
    regions.push({
      regionId: region.regionId,
      label: region.label,
      semanticClass: region.semanticClass,
      rulesClassification: clone(classification),
      ...(profile ? { terrainGroupId: profile.definition.terrainGroupId,
        terrainInstanceIds: [profile.definition.instanceId], sourceRegionIds: [region.regionId],
        ...(profile.definition.accessPoints !== undefined
          ? { accessPoints: clone(profile.definition.accessPoints) } : {}) } : {}),
      ...(region.rasterResolutionMilliInches === 125
        ? { cellResolutionMilliInches: 125 } : {}),
      polygonAreaSquareInches: semanticRegionAreaSquareInchesV1(region, binding),
      cellAreaSquareInches: rectsAreaSquareInches(cells),
      cellRectCount: cells.length,
      footprint: rectsBounds(cells),
      footprintCells: cells,
    });
  }
  if (cellOwnershipPolicy === SEMANTIC_GEOMETRY_EXCLUSIVE_CELL_OWNERSHIP_POLICY) {
    assignExclusiveCellOwnership(regions, binding);
  }
  const ramps = binding.regions.filter((entry) => (
    entry.semanticClass === "ramp_access"));
  const blockingCells = regions.filter((region) => (
    region.rulesClassification.terrainKind === "impassable"
      || region.rulesClassification.standableHorizontalSurface
  )).flatMap((region) => region.footprintCells);
  const impassableCells = regions.filter((region) => (
    region.rulesClassification.terrainKind === "impassable"
  )).flatMap((region) => region.footprintCells);
  for (const region of regions) {
    if (!region.rulesClassification.standableHorizontalSurface) continue;
    // A setup-agreed ordinary physical surface does not promise ground
    // access. Keep its exact top without inventing a ramp; the movement
    // runtime still checks Size, whole-base support and elevation transitions.
    // Classic landscape bindings retain their existing required ramp policy.
    if (profiles?.has(region.regionId)) { region.accessPoints ||= []; continue; }
    if (region.semanticClass !== "standable_high_ground") continue;
    region.accessPoints = ramps.filter((ramp) => (
      ramp.linkedRegionId === region.regionId)).map((ramp) => (
      compileAccessPoint(ramp, region.footprintCells, binding,
        blockingCells, impassableCells)));
    if (region.accessPoints.length === 0) {
      fail("SEMANTIC_RULES_HIGH_GROUND_ACCESS_MISSING", region.regionId);
    }
  }
  for (const region of regions) {
    region.coverageRatio = region.polygonAreaSquareInches > 0
      ? fixed(region.cellAreaSquareInches / region.polygonAreaSquareInches)
      : 1;
    const [minimum, maximum] = COVERAGE_RATIO_BOUNDS[
      region.rulesClassification.cellSampling];
    if (region.coverageRatio < minimum || region.coverageRatio > maximum) {
      fail("SEMANTIC_RULES_CELL_COVERAGE_OUT_OF_BOUNDS",
        `${region.regionId}:${region.coverageRatio}`);
    }
  }
  if (profiles) regions = groupPremadeTerrainRegions(regions);
  const rasterAdapterVersion = regions.some(region => region.cellResolutionMilliInches === 125
      && ["grass_sight", "ordinary_cover"].includes(region.semanticClass))
      ? SEMANTIC_RULES_FINE_PASSABLE_COVERING_VERSION
      : coveringPolicy ? SEMANTIC_RULES_COVERING_CELL_INTERSECTION_VERSION
      : cellOwnershipPolicy ? SEMANTIC_RULES_EXCLUSIVE_CELL_OWNERSHIP_VERSION
      : ramps.some(ramp => ramp.geometry.approachPolicy === SEMANTIC_RULES_AUTHORED_APPROACH_POLICY)
      ? SEMANTIC_RULES_AUTHORED_APPROACH_VERSION
      : regions.some(region => region.cellResolutionMilliInches === 125
      && region.semanticClass === "standable_high_ground")
      ? SEMANTIC_RULES_FINE_HIGH_SURFACE_VERSION
      : regions.some(region => region.cellResolutionMilliInches === 125)
        ? SEMANTIC_RULES_FINE_IMPASSABLE_VERSION
        : OFFICIAL_COMPETITIVE_MAP_SEMANTIC_RULES_ADAPTER_VERSION;
  const body = {
    schema: OFFICIAL_COMPETITIVE_MAP_SEMANTIC_RULES_GEOMETRY_V1_SCHEMA,
    version: nativeSource ? SEMANTIC_RULES_NATIVE_SOURCE_CELLS_VERSION : rasterAdapterVersion,
    ...(nativeSource ? { rasterAdapterVersion, sourcePixelCellGeometry: {
      policy: SEMANTIC_GEOMETRY_NATIVE_SOURCE_PIXEL_BOUNDARY_POLICY,
      artSha256: binding.art.sha256, pixelSize: clone(binding.art.pixelSize),
      coordinateQuantumMilliInches: 1, maximumEdgeRoundingErrorMilliInches: 0.5,
      boundaryTransform: "original_art_pixel_edges_to_shared_global_milli_inch_axes_nearest_rounding",
      imagePixelsReadAtRuntime: false,
    } } : {}),
    seedId: binding.seedId,
    bindingHash: binding.bindingHash,
    bindingGeometryHash: binding.geometryHash,
    battlefield: clone(binding.battlefield),
    cellResolutionMilliInches: nativeSource ? 1 : SEMANTIC_RULES_CELL_RESOLUTION_MILLI_INCHES,
    ...(cellOwnershipPolicy ? { impassableCellOwnershipPolicy: cellOwnershipPolicy } : {}),
    ...(coveringPolicy ? { coveringCellIntersectionPolicy: coveringPolicy } : {}),
    classificationByClass: clone(SEMANTIC_RULES_CLASSIFICATION_V1),
    ...(profiles ? { classificationPolicy: PREMADE_PROFILE_POLICY,
      terrainAuthoringAgreement: clone(input.terrainAgreement),
      terrainRegionInstances: clone(input.terrainRegionInstances) } : {}),
    cliffEdgeSemantics: "cliff_edge polylines compile into the linked standable region's elevation-crossing contract: ground<->high movement is legal only through a declared access point",
    regions,
    totals: {
      regions: regions.length,
      impassableRegions: regions.filter((entry) => (
        entry.rulesClassification.terrainKind === "impassable")).length,
      standableHighGroundRegions: regions.filter((entry) => (
        entry.semanticClass === "standable_high_ground")).length,
      grassRegions: regions.filter((entry) => (
        entry.semanticClass === "grass_sight")).length,
      coverRegions: regions.filter((entry) => (
        entry.semanticClass === "ordinary_cover")).length,
      accessPoints: regions.reduce((sum, entry) => (
        sum + (entry.accessPoints || []).length), 0),
      cellRects: regions.reduce((sum, entry) => sum + entry.cellRectCount, 0),
    },
    runtimePixelInferenceUsed: false,
    rulesTruth: "semantic_map_geometry_compiled_rules_cells",
    trainingTruth: false,
  };
  return deepFreeze(seal(body, "semanticRulesGeometryHash"));
}

export function verifyOfficialCompetitiveMapSemanticRulesGeometryV1(geometry) {
  const nativeSource = Boolean(geometry?.sourcePixelCellGeometry);
  if (!object(geometry)
    || geometry.schema !== OFFICIAL_COMPETITIVE_MAP_SEMANTIC_RULES_GEOMETRY_V1_SCHEMA
    || geometry.semanticRulesGeometryHash !== hashStarcraftTmgContract(
      without(geometry, ["semanticRulesGeometryHash"]))
    || geometry.cellResolutionMilliInches
      !== (nativeSource ? 1 : SEMANTIC_RULES_CELL_RESOLUTION_MILLI_INCHES)
    || geometry.runtimePixelInferenceUsed !== false
    || geometry.trainingTruth !== false
    || !Array.isArray(geometry.regions) || geometry.regions.length === 0) {
    fail("SEMANTIC_RULES_GEOMETRY_INVALID");
  }
  const native = geometry.sourcePixelCellGeometry;
  if (nativeSource && (geometry.version !== SEMANTIC_RULES_NATIVE_SOURCE_CELLS_VERSION
    || native.policy !== SEMANTIC_GEOMETRY_NATIVE_SOURCE_PIXEL_BOUNDARY_POLICY
    || !/^[a-f0-9]{64}$/u.test(String(native.artSha256 || ""))
    || !Number.isSafeInteger(native.pixelSize?.width) || native.pixelSize.width <= 0
    || !Number.isSafeInteger(native.pixelSize?.height) || native.pixelSize.height <= 0
    || native.coordinateQuantumMilliInches !== 1 || native.maximumEdgeRoundingErrorMilliInches !== 0.5
    || native.imagePixelsReadAtRuntime !== false
    || ![OFFICIAL_COMPETITIVE_MAP_SEMANTIC_RULES_ADAPTER_VERSION,
      SEMANTIC_RULES_FINE_IMPASSABLE_VERSION, SEMANTIC_RULES_FINE_HIGH_SURFACE_VERSION,
      SEMANTIC_RULES_AUTHORED_APPROACH_VERSION, SEMANTIC_RULES_EXCLUSIVE_CELL_OWNERSHIP_VERSION,
      SEMANTIC_RULES_COVERING_CELL_INTERSECTION_VERSION, SEMANTIC_RULES_FINE_PASSABLE_COVERING_VERSION]
      .includes(geometry.rasterAdapterVersion))
    || !nativeSource && (geometry.version === SEMANTIC_RULES_NATIVE_SOURCE_CELLS_VERSION
      || geometry.rasterAdapterVersion !== undefined)) {
    fail("SEMANTIC_RULES_NATIVE_PIXEL_GEOMETRY_POLICY_INVALID");
  }
  const policyVersion = nativeSource ? geometry.rasterAdapterVersion : geometry.version;
  const fineRegions = geometry.regions.filter(region =>
    region.cellResolutionMilliInches !== undefined);
  const hasFineHighSurface = fineRegions.some(region =>
    region.semanticClass === "standable_high_ground");
  const hasFinePassableCovering = fineRegions.some(region =>
    ["grass_sight", "ordinary_cover"].includes(region.semanticClass));
  const expectedCoveringVersion = hasFinePassableCovering
    ? SEMANTIC_RULES_FINE_PASSABLE_COVERING_VERSION
    : SEMANTIC_RULES_COVERING_CELL_INTERSECTION_VERSION;
  const authoredAccesses = geometry.regions.flatMap(region => region.accessPoints || [])
    .filter(access => access.approachPolicy !== undefined);
  const hasAuthoredApproach = authoredAccesses.length > 0;
  const coveringPolicy = geometry.coveringCellIntersectionPolicy;
  const hasPositiveAreaCovering = coveringPolicy
    === SEMANTIC_GEOMETRY_COVERING_CELL_INTERSECTION_POLICY;
  if (coveringPolicy !== undefined && !hasPositiveAreaCovering
    || hasPositiveAreaCovering !== (policyVersion === expectedCoveringVersion)
    || hasFinePassableCovering && !hasPositiveAreaCovering) {
    fail("SEMANTIC_RULES_COVERING_INTERSECTION_POLICY_INVALID");
  }
  const cellOwnershipPolicy = geometry.impassableCellOwnershipPolicy;
  const hasExclusiveOwnership = cellOwnershipPolicy === SEMANTIC_GEOMETRY_EXCLUSIVE_CELL_OWNERSHIP_POLICY;
  if (cellOwnershipPolicy !== undefined && !hasExclusiveOwnership
    || hasExclusiveOwnership && policyVersion !== (hasPositiveAreaCovering
      ? expectedCoveringVersion : SEMANTIC_RULES_EXCLUSIVE_CELL_OWNERSHIP_VERSION)
    || !hasExclusiveOwnership && policyVersion === SEMANTIC_RULES_EXCLUSIVE_CELL_OWNERSHIP_VERSION) {
    fail("SEMANTIC_RULES_CELL_OWNERSHIP_POLICY_INVALID");
  }
  const expectedAuthoredVersion = hasPositiveAreaCovering
    ? expectedCoveringVersion : hasExclusiveOwnership
    ? SEMANTIC_RULES_EXCLUSIVE_CELL_OWNERSHIP_VERSION : SEMANTIC_RULES_AUTHORED_APPROACH_VERSION;
  if (hasAuthoredApproach && (policyVersion !== expectedAuthoredVersion
      || authoredAccesses.some(access => access.approachPolicy !== SEMANTIC_RULES_AUTHORED_APPROACH_POLICY
        || access.groundApproachPathMilli?.length !== 2))
    || !hasAuthoredApproach && policyVersion === SEMANTIC_RULES_AUTHORED_APPROACH_VERSION) {
    fail("SEMANTIC_RULES_AUTHORED_APPROACH_POLICY_INVALID");
  }
  const expectedFineVersion = hasPositiveAreaCovering ? expectedCoveringVersion
    : hasExclusiveOwnership ? SEMANTIC_RULES_EXCLUSIVE_CELL_OWNERSHIP_VERSION
    : hasAuthoredApproach ? SEMANTIC_RULES_AUTHORED_APPROACH_VERSION : hasFineHighSurface
    ? SEMANTIC_RULES_FINE_HIGH_SURFACE_VERSION : SEMANTIC_RULES_FINE_IMPASSABLE_VERSION;
  if (fineRegions.length && (nativeSource || policyVersion !== expectedFineVersion
    || fineRegions.some(region => region.cellResolutionMilliInches !== 125
      || !(region.rulesClassification?.terrainKind === "impassable"
          && region.rulesClassification?.standableHorizontalSurface === false
        || hasFineHighSurface && region.semanticClass === "standable_high_ground"
          && region.rulesClassification?.terrainKind === "ordinary"
          && region.rulesClassification?.standableHorizontalSurface === true
        || hasPositiveAreaCovering && ["grass_sight", "ordinary_cover"].includes(region.semanticClass)
          && region.rulesClassification?.standableHorizontalSurface === false
          && region.rulesClassification?.cellSampling === "covering"
          && region.rulesClassification?.terrainKind === (region.semanticClass === "grass_sight"
            ? "grass" : "ordinary"))))) {
    fail("SEMANTIC_RULES_FINE_REGION_RESOLUTION_INVALID");
  }
  verifyCompiledPremadeProfiles(geometry);
  return true;
}

// ── Room-facing artifacts ─────────────────────────────────────────────────

// Per-region Rules terrain rows (milli-inch) with the cell geometry attached.
// The row's `footprint` stays the cell-union bounding envelope (viewport and
// quadrant bookkeeping); `footprintCells` is the geometry movement, placement
// and terrain-effect legality actually test.
export function createOfficialSemanticTerrainBoardRowsV1(geometry) {
  verifyOfficialCompetitiveMapSemanticRulesGeometryV1(geometry);
  return geometry.regions.map((region) => {
    const classification = region.rulesClassification;
    const terrainInput = {
      id: region.regionId,
      terrainKind: classification.terrainKind,
      size: classification.size,
      footprint: region.footprint,
      standableHorizontalSurface: classification.standableHorizontalSurface,
      openings: [],
    };
    const losPiece = geometry.terrainAuthoringAgreement
      ? createOfficialPremadeSizeGuardedTerrainPieceV1({ ...terrainInput, attributes: classification })
      : createOfficialTerrainPieceV1(terrainInput);
    return {
      ...clone(losPiece),
      id: region.regionId,
      terrainId: region.regionId,
      terrainKind: classification.terrainKind,
      size: classification.size,
      footprint: clone(region.footprint),
      originalFootprint: clone(region.footprint),
      elevation: classification.heightTier,
      heightTier: classification.heightTier,
      standableHorizontalSurface: classification.standableHorizontalSurface,
      elevationSurface: classification.standableHorizontalSurface,
      impassable: classification.terrainKind === "impassable",
      blocksPlacement: classification.blocksPlacement,
      openings: [],
      accessPoints: (region.accessPoints || []).map((accessPoint) => ({
        accessPointId: accessPoint.accessPointId,
        role: accessPoint.role,
        footprint: clone(accessPoint.footprint),
        connects: [...accessPoint.connects],
        groundApproachPath: clone(accessPoint.groundApproachPathMilli),
      })),
      adjacentElevationPairs: classification.standableHorizontalSurface
        ? [["ground", "high"]] : [],
      semanticRegionId: region.regionId,
      semanticClass: region.semanticClass,
      ...(region.terrainGroupId ? { terrainGroupId: region.terrainGroupId,
        terrainInstanceIds: [...region.terrainInstanceIds], sourceRegionIds: [...region.sourceRegionIds] } : {}),
      footprintCells: clone(region.footprintCells),
      terrainHash: losPiece.terrainHash,
      isRemoved: false,
      rulesTruth: "official_semantic_map_rules_terrain_piece",
      trainingTruth: false,
    };
  });
}

export function createOfficialSemanticSpecialTerrainAgreementV1(geometry) {
  verifyOfficialCompetitiveMapSemanticRulesGeometryV1(geometry);
  return createOfficialSpecialTerrainAgreementV1({
    terrainEntries: geometry.regions.map((region) => ({
      terrainId: region.regionId,
      terrainKind: region.rulesClassification.terrainKind,
      adjacentElevationPairs: region.rulesClassification
        .standableHorizontalSurface ? [["ground", "high"]] : [],
      accessPoints: (region.accessPoints || []).map((accessPoint) => ({
        accessPointId: accessPoint.accessPointId,
        role: accessPoint.role,
        footprint: accessPoint.footprint,
        connects: accessPoint.connects,
      })),
    })),
  });
}

// Rect-level rows (inches) for the official game-start height-tier ledger and
// the marker placement: the marker coordinate is tested against exact cell
// geometry, never against the bounding envelope.
export function createOfficialSemanticHeightTierLedgerRowsV1(geometry) {
  verifyOfficialCompetitiveMapSemanticRulesGeometryV1(geometry);
  return geometry.regions.flatMap((region) => (
    region.footprintCells.map((cell, index) => ({
      terrainPieceId: `${region.regionId}:cell-${index + 1}`,
      heightTier: region.rulesClassification.heightTier,
      footprint: inchesRect(cell),
      impassable: region.rulesClassification.terrainKind === "impassable",
    }))));
}

// Blocker rows (inches) for the official spatial reachability audit. Grass
// and Size-1 cover are not movement blockers and are excluded by the audit's
// own contract; high-ground rows carry their region's access points.
function reachabilityBlockerRows(geometry) {
  return geometry.regions.flatMap((region) => {
    const classification = region.rulesClassification;
    return region.footprintCells.map((cell, index) => ({
      terrainPieceId: `${region.regionId}:cell-${index + 1}`,
      size: classification.size,
      terrainKind: classification.terrainKind,
      footprint: inchesRect(cell),
      standableHorizontalSurface: classification.standableHorizontalSurface,
      accessPoints: (region.accessPoints || []).map((accessPoint) => ({
        accessPointId: accessPoint.accessPointId,
        role: accessPoint.role,
        footprint: inchesRect(accessPoint.footprint),
        connects: [...accessPoint.connects],
        groundApproachPath: clone(accessPoint.groundApproachPath),
      })),
    }));
  });
}

export function semanticMissionQuarterTargetsV1(battlefield) {
  return [["south_west", 0.25, 0.25], ["south_east", 0.75, 0.25],
    ["north_west", 0.25, 0.75], ["north_east", 0.75, 0.75]]
    .map(([quarter, x, y]) => ({ targetId: `mission-quarter-${quarter}`,
      targetKind: "mission_quarter", coordinate: {
        x: battlefield.widthInches * x, y: battlefield.heightInches * y },
      accessDistanceInches: 3 }));
}

// Deterministic preview-authority derivations. The generic quarter probes and
// edge anchors are certification-harness targets, not official task geometry:
// any probe that falls inside authored impassable or standable cell geometry
// is snapped to the NEAREST open-ground grid point (BFS over the audit's own
// 0.5in grid) and every adjustment is recorded in the certificate. Official
// mission markers and entry edges are never snapped — at
// official_task_geometry authority a conflict fails closed.
function blockingCellsForStanding(geometry) {
  return geometry.regions.filter((region) => (
    region.rulesClassification.terrainKind === "impassable"
      || region.rulesClassification.standableHorizontalSurface
  )).flatMap((region) => region.footprintCells);
}
function pointInsideCell(xMilli, yMilli, cell) {
  return xMilli >= cell.minXMilliInches && xMilli <= cell.maxXMilliInches
    && yMilli >= cell.minYMilliInches && yMilli <= cell.maxYMilliInches;
}
function nearestOpenGroundPoint(coordinate, cells, battlefield,
  openRadiusMilli = 0) {
  const step = 500;
  const widthMilli = Math.round(battlefield.widthInches * 1000);
  const heightMilli = Math.round(battlefield.heightInches * 1000);
  const start = { x: Math.round(coordinate.x * 1000),
    y: Math.round(coordinate.y * 1000) };
  const freePoint = (x, y) => x >= step && x <= widthMilli - step
    && y >= step && y <= heightMilli - step
    && !cells.some((cell) => pointInsideCell(x, y, cell));
  // openRadiusMilli > 0 additionally requires the 1-in neighbourhood to be
  // free, so enclosed pockets (e.g. a reviewed hole inside a plateau) are
  // not mistaken for usable entry ground.
  const free = openRadiusMilli > 0
    ? (x, y) => freePoint(x, y) && [[openRadiusMilli, 0], [-openRadiusMilli, 0],
      [0, openRadiusMilli], [0, -openRadiusMilli]].every(([dx, dy]) => (
      x + dx >= 0 && x + dx <= widthMilli && y + dy >= 0
        && y + dy <= heightMilli && freePoint(x + dx, y + dy)))
    : freePoint;
  if (free(start.x, start.y)) {
    return { coordinate, adjusted: false, adjustmentInches: 0 };
  }
  const visited = new Set();
  const queue = [[Math.round(start.x / step), Math.round(start.y / step), 0]];
  while (queue.length > 0) {
    const [gx, gy, depth] = queue.shift();
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = gx + dx;
      const ny = gy + dy;
      const key = `${nx}:${ny}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const x = nx * step;
      const y = ny * step;
      if (x < 0 || x > widthMilli || y < 0 || y > heightMilli) continue;
      if (free(x, y)) {
        return { coordinate: { x: fixed(x / 1000), y: fixed(y / 1000) },
          adjusted: true,
          adjustmentInches: fixed(Math.hypot(x - start.x, y - start.y) / 1000) };
      }
      if (depth < 200) queue.push([nx, ny, depth + 1]);
    }
  }
  fail("SEMANTIC_RULES_PREVIEW_TARGET_UNAVAILABLE",
    `${coordinate.x}:${coordinate.y}`);
}
function edgeAnchor(side, cells, battlefield) {
  const step = 500;
  const widthMilli = Math.round(battlefield.widthInches * 1000);
  const heightMilli = Math.round(battlefield.heightInches * 1000);
  const inward = side === "bottom" ? step : heightMilli - step;
  const stretches = [];
  let current = null;
  for (let x = step; x <= widthMilli - step; x += step) {
    const freePoint = side === "bottom" || side === "top"
      ? !cells.some((cell) => pointInsideCell(x, inward, cell))
      : !cells.some((cell) => pointInsideCell(inward, x, cell));
    if (freePoint) {
      current = current ? { start: current.start, end: x } : { start: x, end: x };
    } else if (current) {
      stretches.push(current);
      current = null;
    }
  }
  if (current) stretches.push(current);
  if (stretches.length === 0) {
    fail("SEMANTIC_RULES_PREVIEW_ANCHOR_UNAVAILABLE", side);
  }
  stretches.sort((left, right) => (right.end - right.start)
    - (left.end - left.start) || left.start - right.start);
  const widest = stretches[0];
  const along = fixed(((widest.start + widest.end) / 2) / 1000);
  return side === "bottom" ? { x: along, y: 0 }
    : { x: along, y: battlefield.heightInches };
}

export function deriveOfficialSemanticPreviewTaskGeometryV1(geometry) {
  verifyOfficialCompetitiveMapSemanticRulesGeometryV1(geometry);
  const cells = blockingCellsForStanding(geometry);
  const battlefield = geometry.battlefield;
  const quarterTargets = semanticMissionQuarterTargetsV1(battlefield);
  const targetDerivations = quarterTargets.map((target) => {
    const derived = nearestOpenGroundPoint(target.coordinate, cells, battlefield);
    return { targetId: target.targetId, targetKind: target.targetKind,
      requestedCoordinate: target.coordinate,
      coordinate: derived.coordinate, adjusted: derived.adjusted,
      adjustmentInches: derived.adjustmentInches,
      accessDistanceInches: target.accessDistanceInches };
  });
  return {
    areaTargets: targetDerivations.map((entry) => ({
      targetId: entry.targetId, targetKind: entry.targetKind,
      coordinate: entry.coordinate,
      accessDistanceInches: entry.accessDistanceInches })),
    entryAnchorsBySide: {
      south: edgeAnchor("bottom", cells, battlefield),
      north: edgeAnchor("top", cells, battlefield),
    },
    derivations: {
      targets: targetDerivations,
      anchorsDerivedFromWidestOpenEdgeStretch: true,
      officialTaskGeometryNeverAdjusted: true,
    },
  };
}

// ── Certify: deterministic geometry/topology/rules audits ─────────────────

export function certifyOfficialCompetitiveMapSemanticTerrainV1(input = {}) {
  const binding = input.binding;
  verifyOfficialCompetitiveMapSemanticGeometryBindingV1(binding);
  const geometry = input.semanticRulesGeometry
    || compileOfficialCompetitiveMapSemanticRulesGeometryV1({ binding });
  verifyOfficialCompetitiveMapSemanticRulesGeometryV1(geometry);
  if (geometry.bindingHash !== binding.bindingHash) {
    fail("SEMANTIC_RULES_CERTIFICATE_BINDING_MISMATCH", binding.seedId);
  }
  const auditAuthority = String(input.auditAuthority || "map_topology_preview");
  if (!["official_task_geometry", "map_topology_preview"].includes(auditAuthority)) {
    fail("SEMANTIC_RULES_CERTIFICATE_AUTHORITY_INVALID", auditAuthority);
  }
  const classSeparation = auditSemanticGeometryClassSeparationV1(binding);
  if (!classSeparation.overlapFree) {
    fail("SEMANTIC_RULES_CLASS_SEPARATION_FAILED",
      classSeparation.violations.join(","));
  }
  // Access topology: every standable region keeps at least one ramp whose
  // approach path from open ground never crosses an impassable cell.
  const impassableCells = geometry.regions.filter((region) => (
    region.rulesClassification.terrainKind === "impassable"
  )).flatMap((region) => region.footprintCells.map((cell) => ({
    regionId: region.regionId, cell })));
  let accessTopology = geometry.regions.filter((region) => (
    region.semanticClass === "standable_high_ground"
  )).map((region) => {
    const ramps = binding.regions.filter((entry) => (
      entry.semanticClass === "ramp_access"
        && entry.linkedRegionId === region.regionId));
    const audits = (region.accessPoints || []).map((accessPoint) => {
      const ramp = ramps.find((entry) => (
        `semantic:${entry.regionId}` === accessPoint.accessPointId));
      if (!ramp) fail("SEMANTIC_RULES_ACCESS_TOPOLOGY_INVALID", region.regionId);
      const [outside, inside] = accessPoint.groundApproachPathMilli;
      const crossed = impassableCells.filter((entry) => (
        segmentIntersectsRectMilli(outside, inside, entry.cell)));
      if (crossed.length > 0) {
        fail("SEMANTIC_RULES_RAMP_APPROACH_BLOCKED",
          `${accessPoint.accessPointId}:${crossed[0].regionId}`);
      }
      return { accessPointId: accessPoint.accessPointId,
        sourceRampRegionId: accessPoint.sourceRampRegionId,
        linkedRegionId: region.regionId,
        approachClearOfImpassableCells: true };
    });
    return { regionId: region.regionId, accessPointCount: audits.length,
      audits };
  });
  const preview = input.entryEdgesBySide || input.entryAnchorsBySide
    || input.areaTargets || input.missionMarkers
    ? null
    : deriveOfficialSemanticPreviewTaskGeometryV1(geometry);
  const reachabilityAudit = auditOfficialCompetitiveMapSpatialReachabilityV1({
    seedId: binding.seedId,
    auditAuthority,
    battlefield: clone(binding.battlefield),
    // Ticket 24 / Slice 254-R8-11 (opt-in, default byte-identical): the room
    // freeze passes a marker-support-unique terrain view (rectangular
    // plateaus merged to one standable piece so a marker on a cell corner of
    // the 0.25in raster keeps exactly ONE support — the plateau is one
    // physical surface). Default remains the per-cell rows.
    terrainPieces: input.reachabilityTerrainPieces
      || reachabilityBlockerRows(geometry),
    ...(input.exactSemanticReachability === true ? {
      exactSemanticTargets: true,
      exactHighGroundRegions: geometry.regions.filter((region) => (
        region.semanticClass === "standable_high_ground"
        || geometry.sourcePixelCellGeometry?.policy === "original_art_integer_pixel_edges_v1"
          && region.rulesClassification.standableHorizontalSurface === true)).map((region) => ({
        regionId: region.regionId,
        ...(geometry.sourcePixelCellGeometry?.policy === "original_art_integer_pixel_edges_v1" ? {
          nativeSourcePixelGeometryPolicy: "original_art_integer_pixel_edges_v1", cellResolutionMilliInches: 1,
          elevation: region.rulesClassification.heightTier === "mid_ground" ? "mid" : "high",
        } : {}),
        ...(region.cellResolutionMilliInches ? {
          cellResolutionMilliInches: region.cellResolutionMilliInches } : {}),
        footprintCells: clone(region.footprintCells) })),
    } : {}),
    // Opt-in ramp portals (elevation changes only through access points) so
    // platform-dominant maps (e.g. Andromeda decks) audit their true
    // connectivity. Absent = ground-layer-only audit, unchanged.
    elevationPortals: input.elevationPortals,
    physicalClearancePolicy: input.physicalClearancePolicy,
    diagnosticSink: input.reachabilityDiagnosticSink,
    baseProfiles: input.baseProfiles,
    entryEdgesBySide: input.entryEdgesBySide,
    entryAnchorsBySide: input.entryAnchorsBySide || preview?.entryAnchorsBySide,
    missionMarkers: input.missionMarkers || [],
    areaTargets: input.areaTargets || preview?.areaTargets
      || semanticMissionQuarterTargetsV1(binding.battlefield),
  });
  // Semantic-map preview certification policy v2 (user ruling 2026-09-26,
  // contract correction): the five-chassis circumscribed-circle entry matrix
  // (`everyBaseEntersBothSides`) is a per-chassis DIAGNOSTIC, honestly
  // reported and never forced — universal chassis connectivity is explicitly
  // not required. The certificate fails closed unless every SIDE is
  // enterable by at least one current base, every required target is
  // reachable by at least one current base, and at least one current base
  // connects opposing sides. Roster-level acceptance (the selected army's
  // real bases entering both sides and reaching the mission markers) is
  // verified by the room acceptance gate against this audit's per-chassis
  // matrix. Art-accurate contours never get widened to force universal
  // large-base transit: when a measured passage is physically narrower than
  // a chassis, that base's connectivity is reported false in the chassis
  // matrix instead of invented away (Lost Temple's mask-traced southwest
  // pinch and Xel'naga Caverns' SE lake channel are the concrete exemplars).
  const chassisMatrix = reachabilityAudit.baseProfileAudits.map((entry) => ({
    baseId: entry.baseId,
    clearanceRadiusInches: entry.clearanceRadiusInches,
    turningDiameterInches: entry.turningDiameterInches,
    allSidesCanEnter: entry.allSidesCanEnter,
    opposingSidesConnected: entry.opposingSidesConnected,
    allRequiredTargetsReachable: entry.allRequiredTargetsReachable,
  }));
  const connectedBaseIds = chassisMatrix.filter((entry) => (
    entry.opposingSidesConnected)).map((entry) => entry.baseId);
  const everySideEnterableByAtLeastOneCurrentBase = reachabilityAudit.sideIds
    .every((sideId) => reachabilityAudit.baseProfileAudits.some((base) => (
      base.sideAudits.find((side) => side.sideId === sideId)
        ?.legalEntryWitnessCount > 0)));
  const previewPolicy = {
    policyId: "semantic_map_preview_certification_v2",
    // Diagnostic (Medium): legacy v1 hard leg, now reported only.
    everyBaseEntersBothSides: reachabilityAudit.everyEntrySegmentUsable,
    everySideEnterableByAtLeastOneCurrentBase,
    everyRequiredTargetReachableByAtLeastOneCurrentBase:
      reachabilityAudit.everyRequiredTargetReachableByAtLeastOneCurrentBase,
    opposingSidesConnectedBaseIds: connectedBaseIds,
    opposingSidesConnectedByAtLeastOneCurrentBase: connectedBaseIds.length > 0,
    strictUniversalConnectivityForEveryCurrentBase:
      reachabilityAudit.opposingSidesConnectedForEveryCurrentBase,
    strictAuditSpatialReachabilityCertified:
      reachabilityAudit.spatialReachabilityCertified,
  };
  if (!previewPolicy.everySideEnterableByAtLeastOneCurrentBase
    || !previewPolicy.everyRequiredTargetReachableByAtLeastOneCurrentBase
    || !previewPolicy.opposingSidesConnectedByAtLeastOneCurrentBase) {
    const failedLegs = [
      ...(!previewPolicy.everySideEnterableByAtLeastOneCurrentBase
        ? ["entry_side"] : []),
      ...(!previewPolicy.opposingSidesConnectedByAtLeastOneCurrentBase
        ? ["opposing_sides"] : []),
      ...reachabilityAudit.targetReachabilityBySide.flatMap((side) => (
        side.targets.filter((target) => (
          !target.reachableByAtLeastOneCurrentBase)).map((target) => (
          `target_${side.sideId}_${target.targetId}`)))),
    ];
    const error = new Error(`SEMANTIC_RULES_REACHABILITY_FAILED:${
      binding.seedId}:${failedLegs.join(",")}`);
    // The certificate still rejects exactly the same geometry. Preserve the
    // already-computed per-chassis audit for an offline failure report so an
    // author can repair the contour/portal instead of guessing at a marker.
    Object.defineProperty(error, "reachabilityAudit", {
      value: reachabilityAudit, enumerable: false });
    throw error;
  }
  const boardRows = createOfficialSemanticTerrainBoardRowsV1(geometry);
  const nativeSurfaces = geometry.sourcePixelCellGeometry?.policy === "original_art_integer_pixel_edges_v1";
  if (nativeSurfaces) {
    const portals = input.elevationPortals || [];
    accessTopology = geometry.regions.filter(region => region.rulesClassification.heightTier === "high_ground"
      && region.rulesClassification.standableHorizontalSurface === true).map(region => {
      const audits = portals.filter(portal => portal.toRegionId === region.regionId).map(top => {
        const basePorts = portals.filter(portal => portal.fromRegionId === null && portal.toRegionId === top.fromRegionId);
        const entryReachableBaseIds = reachabilityAudit.baseProfileAudits.filter(base =>
          base.elevationPortalAudits?.some(port => port.portalId === top.portalId && port.usable)
          && basePorts.some(source => base.elevationPortalAudits?.some(port => port.portalId === source.portalId && port.usable))
          && base.sideAudits.every(side => side.reachableNativeSurfaceRegionIds?.includes(region.regionId)))
          .map(base => base.baseId);
        return { accessPointId: top.portalId, linkedRegionId: region.regionId,
          sourceRampRegionId: top.fromRegionId, baseAccessPointIds: basePorts.map(port => port.portalId),
          entryReachableBaseIds, groundMidHighRouteCertified: entryReachableBaseIds.length > 0 };
      });
      return { regionId: region.regionId, accessPointCount: audits.length, audits };
    });
  }
  const ledgerRows = createOfficialSemanticHeightTierLedgerRowsV1(geometry);
  let terrainHeightTierLedger = null;
  let missionMarkerPlacement = null;
  if (input.deploymentGeometryBinding) {
    terrainHeightTierLedger = createOfficialTerrainHeightTierLedgerV1({
      deploymentGeometryBinding: input.deploymentGeometryBinding,
      terrainPieces: ledgerRows,
    });
    missionMarkerPlacement = finalizeOfficialMissionMarkerPlacementV1({
      deploymentGeometryBinding: input.deploymentGeometryBinding,
      terrainHeightTierLedger,
    });
  }
  const body = {
    schema: OFFICIAL_COMPETITIVE_MAP_SEMANTIC_TERRAIN_CERTIFICATE_V1_SCHEMA,
    version: OFFICIAL_COMPETITIVE_MAP_SEMANTIC_RULES_ADAPTER_VERSION,
    seedId: binding.seedId,
    auditAuthority,
    bindingHash: binding.bindingHash,
    bindingGeometryHash: binding.geometryHash,
    semanticRulesGeometryHash: geometry.semanticRulesGeometryHash,
    battlefield: clone(binding.battlefield),
    cellResolutionMilliInches: geometry.cellResolutionMilliInches,
    ...(geometry.sourcePixelCellGeometry ? { sourcePixelCellGeometry: clone(geometry.sourcePixelCellGeometry) } : {}),
    classificationByClass: clone(SEMANTIC_RULES_CLASSIFICATION_V1),
    decompositionByRegion: geometry.regions.map((region) => ({
      regionId: region.regionId,
      semanticClass: region.semanticClass,
      rulesClassification: clone(region.rulesClassification),
      polygonAreaSquareInches: region.polygonAreaSquareInches,
      cellAreaSquareInches: region.cellAreaSquareInches,
      coverageRatio: region.coverageRatio,
      cellRectCount: region.cellRectCount,
    })),
    terrainPieces: boardRows,
    heightTierLedgerRows: ledgerRows,
    accessTopology,
    everyStandableHighGroundReachableThroughDeclaredRamp: nativeSurfaces
      ? accessTopology.every(region => region.audits.some(audit => audit.groundMidHighRouteCertified)) : true,
    classSeparation: { overlapFree: true,
      auditedPairs: "impassable x standable/cover/grass + impassable x impassable" },
    spatialReachabilityAudit: reachabilityAudit,
    spatialReachabilityAuditHash: reachabilityAudit.auditHash,
    previewCertificationPolicy: previewPolicy,
    chassisMatrix,
    previewTaskGeometryDerivations: preview?.derivations || null,
    missionMarkerAndQuarterTargetsReachableByAtLeastOneCurrentBase:
      reachabilityAudit.everyRequiredTargetReachableByAtLeastOneCurrentBase,
    terrainHeightTierLedgerHash: terrainHeightTierLedger?.ledgerHash || null,
    missionMarkerPlacementHash: missionMarkerPlacement?.placementHash || null,
    balancedTerrainSetupCertification: "not_applicable_semantic_map_geometry_v1",
    lineOfSightGeometry: "compiled_cell_geometry_adapter_los_v1",
    runtimePixelInferenceUsed: false,
    rulesTruth: "semantic_map_geometry_rules_terrain_certified",
    trainingTruth: false,
  };
  const certificate = deepFreeze(seal(body, "certificateHash"));
  return {
    certificate,
    terrainPieces: boardRows,
    specialTerrainAgreement: createOfficialSemanticSpecialTerrainAgreementV1(geometry),
    terrainHeightTierLedger,
    missionMarkerPlacement,
  };
}

export function verifyOfficialCompetitiveMapSemanticTerrainCertificateV1(
  certificate) {
  const policy = certificate?.previewCertificationPolicy;
  // v1 (legacy, pre-2026-09-26): every base entering both sides was a hard
  // leg. v2 (user ruling 2026-09-26): that five-chassis matrix is diagnostic;
  // the hard legs are per-side entry by at least one current base, target
  // reachability by at least one current base, and opposing-side connection
  // by at least one current base. Both shapes verify; v1 certificates keep
  // their stricter recorded truth.
  const policyValid = policy?.policyId === "semantic_map_preview_certification_v1"
    ? policy.everyBaseEntersBothSides === true
      && policy.everyRequiredTargetReachableByAtLeastOneCurrentBase === true
      && policy.opposingSidesConnectedByAtLeastOneCurrentBase === true
    : policy?.policyId === "semantic_map_preview_certification_v2"
      ? typeof policy.everyBaseEntersBothSides === "boolean"
        && policy.everySideEnterableByAtLeastOneCurrentBase === true
        && policy.everyRequiredTargetReachableByAtLeastOneCurrentBase === true
        && policy.opposingSidesConnectedByAtLeastOneCurrentBase === true
      : false;
  if (!object(certificate)
    || certificate.schema
      !== OFFICIAL_COMPETITIVE_MAP_SEMANTIC_TERRAIN_CERTIFICATE_V1_SCHEMA
    || certificate.certificateHash !== hashStarcraftTmgContract(
      without(certificate, ["certificateHash"]))
    || certificate.spatialReachabilityAuditHash
      !== certificate.spatialReachabilityAudit?.auditHash
    || !policyValid
    || certificate.previewCertificationPolicy
      .strictAuditSpatialReachabilityCertified
      !== certificate.spatialReachabilityAudit.spatialReachabilityCertified
    || !Array.isArray(certificate.chassisMatrix)
    || certificate.chassisMatrix.length === 0
    || certificate.everyStandableHighGroundReachableThroughDeclaredRamp !== true
    || certificate.classSeparation?.overlapFree !== true
    || certificate.missionMarkerAndQuarterTargetsReachableByAtLeastOneCurrentBase
      !== true
    || !Array.isArray(certificate.terrainPieces)
    || certificate.terrainPieces.length === 0
    || certificate.runtimePixelInferenceUsed !== false
    || certificate.trainingTruth !== false) {
    fail("SEMANTIC_RULES_CERTIFICATE_INVALID");
  }
  return true;
}

// Resolve the authored binding for a seed through the standard catalogue.
export function getOfficialCompetitiveMapSemanticBindingForSeedV1(seedId,
  input = {}) {
  const catalogue = createOfficialCompetitiveMapSemanticGeometryCatalogueV1(input);
  return getOfficialCompetitiveMapSemanticGeometryV1(catalogue, seedId);
}

// Snap a certification-harness probe (deployment anchor or zone target) that
// landed inside authored impassable/standable cell geometry to the nearest
// open-ground point, recording the adjustment. This is the same documented
// preview-authority rule deriveOfficialSemanticPreviewTaskGeometryV1 applies
// to its own probes: harness coordinates may be derived, official task
// geometry never is.
export function snapSemanticMapPreviewCoordinateV1(geometry, coordinate,
  input = {}) {
  verifyOfficialCompetitiveMapSemanticRulesGeometryV1(geometry);
  const openRadiusMilli = Math.round(Number(input.openRadiusInches || 0)
    * 1000);
  const derived = nearestOpenGroundPoint(
    { x: Number(coordinate?.x ?? coordinate?.xInches),
      y: Number(coordinate?.y ?? coordinate?.yInches) },
    blockingCellsForStanding(geometry), geometry.battlefield, openRadiusMilli);
  return { coordinate: derived.coordinate, adjusted: derived.adjusted,
    adjustmentInches: derived.adjustmentInches };
}

// ── Adapter-level spatial queries over compiled cell geometry ─────────────
//
// The official terrain/LOS kernel defers the "grass", "impassable" and "ramp"
// terrain kinds (TERRAIN_LOS_DEFERRED_TERRAIN_KIND, production-quarantined).
// Until the kernels take those kinds over, the integration seam owns a narrow
// deterministic query contract over the compiled milli-inch cell geometry:
//
//   movement: impassable cells block path sweep and endpoint placement;
//     standable high-ground cells may be entered or crossed only through the
//     region's declared access-point footprints (cliff edges block elevation
//     crossing); grass and Size-1 cover never block movement.
//   line of sight: impassable_structure cells are solid and block; water and
//     void are open and never block sight (they block movement only); grass
//     cells break sight across them unless the attacker or the target stands
//     inside the same grass region; a standable high-ground body blocks
//     ground-to-ground sight across itself unless the attacker or the target
//     is supported by that region (its own top surface is excluded).
//
// Every result is machine-readable, names its witnesses, and never claims
// Rules-kernel authority: rulesTruth is adapter_spatial_query_semantic_geometry
// and trainingTruth stays false.

export const SEMANTIC_MAP_SPATIAL_QUERY_V1_SCHEMA =
  "starcraft_tmg_semantic_map_spatial_query_result_v1";

function cellsByClass(geometry, predicate) {
  return geometry.regions.filter((region) => predicate(region))
    .flatMap((region) => region.footprintCells.map((cell) => ({
      regionId: region.regionId, semanticClass: region.semanticClass, cell })));
}
function inchesToMilliPoint(coordinate) {
  const x = Number(coordinate?.x);
  const y = Number(coordinate?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    fail("SEMANTIC_RULES_QUERY_COORDINATE_INVALID", JSON.stringify(coordinate));
  }
  return { xMilliInches: Math.round(x * 1000), yMilliInches: Math.round(y * 1000) };
}
function segmentsCrossCell(a, b, entry, inflateMilli = 0) {
  return segmentIntersectsRectMilli(a, b, {
    minXMilliInches: entry.cell.minXMilliInches - inflateMilli,
    maxXMilliInches: entry.cell.maxXMilliInches + inflateMilli,
    minYMilliInches: entry.cell.minYMilliInches - inflateMilli,
    maxYMilliInches: entry.cell.maxYMilliInches + inflateMilli,
  });
}
function pointInCellEntry(point, entry) {
  return pointInsideCell(point.xMilliInches, point.yMilliInches, entry.cell);
}

export function querySemanticMapTerrainEffectV1(geometry, coordinate) {
  verifyOfficialCompetitiveMapSemanticRulesGeometryV1(geometry);
  requireLegacyClassQueryContext(geometry);
  const point = inchesToMilliPoint(coordinate);
  const hits = geometry.regions.map((region) => ({
    regionId: region.regionId, semanticClass: region.semanticClass,
    rulesSemantics: region.rulesClassification.rulesSemantics,
    cells: region.footprintCells.filter((cell) => pointInsideCell(
      point.xMilliInches, point.yMilliInches, cell)).length,
  })).filter((entry) => entry.cells > 0);
  const has = (klass) => hits.some((entry) => entry.semanticClass === klass);
  const impassable = hits.some((entry) => (
    entry.semanticClass === "impassable_water"
      || entry.semanticClass === "impassable_void"
      || entry.semanticClass === "impassable_structure"));
  const standable = has("standable_high_ground");
  const body = {
    schema: SEMANTIC_MAP_SPATIAL_QUERY_V1_SCHEMA,
    queryKind: "terrain_effect_at_point",
    coordinate: { x: fixed(point.xMilliInches / 1000),
      y: fixed(point.yMilliInches / 1000) },
    regions: hits.map(({ cells, ...entry }) => entry),
    elevation: standable ? "high" : "ground",
    movementBlocked: impassable,
    placementBlocked: impassable,
    sightBroken: has("grass_sight"),
    coverGranted: has("ordinary_cover"),
    standableSurface: standable,
    rulesTruth: "adapter_spatial_query_semantic_geometry",
    trainingTruth: false,
  };
  return deepFreeze(seal(body, "queryHash"));
}

export function evaluateSemanticMapMovementLegalityV1(geometry, input = {}) {
  verifyOfficialCompetitiveMapSemanticRulesGeometryV1(geometry);
  requireLegacyClassQueryContext(geometry);
  const path = (input.path || []).map(inchesToMilliPoint);
  if (path.length < 2 || path.length > 64) {
    fail("SEMANTIC_RULES_QUERY_PATH_INVALID", String(path.length));
  }
  const inflate = Math.round(Number(input.clearanceRadiusInches || 0) * 1000);
  if (!Number.isFinite(inflate) || inflate < 0) {
    fail("SEMANTIC_RULES_QUERY_CLEARANCE_INVALID");
  }
  const impassable = cellsByClass(geometry, (region) => (
    region.rulesClassification.terrainKind === "impassable"));
  const standableRegions = geometry.regions.filter((region) => (
    region.semanticClass === "standable_high_ground"));
  const violations = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index];
    const b = path[index + 1];
    for (const entry of impassable) {
      if (segmentsCrossCell(a, b, entry, inflate)) {
        violations.push({ code: "path_crosses_impassable_terrain",
          segment: index, regionId: entry.regionId,
          semanticClass: entry.semanticClass });
      }
    }
    for (const region of standableRegions) {
      const cells = region.footprintCells.map((cell) => ({
        regionId: region.regionId, cell }));
      const aInside = cells.some((entry) => pointInCellEntry(a, entry));
      const bInside = cells.some((entry) => pointInCellEntry(b, entry));
      const crosses = cells.some((entry) => segmentsCrossCell(a, b, entry, 0));
      if (!crosses) continue;
      // A segment touching the standable body is legal only when it travels
      // through a declared access point or both endpoints already stand on
      // the surface (on-plateau movement).
      if (aInside && bInside) continue;
      const throughAccess = (region.accessPoints || []).some((accessPoint) => (
        segmentIntersectsRectMilli(a, b, accessPoint.footprint)));
      if (!throughAccess) {
        violations.push({ code: "elevation_crossing_outside_declared_access_point",
          segment: index, regionId: region.regionId,
          semanticClass: "standable_high_ground" });
      }
    }
  }
  const endpoint = path.at(-1);
  const endpointHit = impassable.find((entry) => pointInCellEntry(endpoint, entry));
  if (endpointHit) {
    violations.push({ code: "endpoint_overlaps_impassable_terrain",
      segment: path.length - 1, regionId: endpointHit.regionId,
      semanticClass: endpointHit.semanticClass });
  }
  const endpointEffect = querySemanticMapTerrainEffectV1(geometry, {
    x: endpoint.xMilliInches / 1000, y: endpoint.yMilliInches / 1000 });
  const body = {
    schema: SEMANTIC_MAP_SPATIAL_QUERY_V1_SCHEMA,
    queryKind: "movement_legality",
    path: path.map((point) => ({ x: fixed(point.xMilliInches / 1000),
      y: fixed(point.yMilliInches / 1000) })),
    clearanceRadiusInches: fixed(inflate / 1000),
    legal: violations.length === 0,
    violations,
    endpointElevation: endpointEffect.elevation,
    endpointRegions: endpointEffect.regions,
    grassAndCoverNeverBlockMovement: true,
    highGroundCrossingRequiresDeclaredAccessPoint: true,
    rulesTruth: "adapter_spatial_query_semantic_geometry",
    trainingTruth: false,
  };
  return deepFreeze(seal(body, "queryHash"));
}

export function evaluateSemanticMapLineOfSightV1(geometry, input = {}) {
  verifyOfficialCompetitiveMapSemanticRulesGeometryV1(geometry);
  requireLegacyClassQueryContext(geometry);
  const attacker = {
    point: inchesToMilliPoint(input.attacker),
    supportedRegionId: input.attacker?.supportedRegionId
      ? String(input.attacker.supportedRegionId) : null,
  };
  const target = {
    point: inchesToMilliPoint(input.target),
    supportedRegionId: input.target?.supportedRegionId
      ? String(input.target.supportedRegionId) : null,
  };
  const assessments = [];
  for (const region of geometry.regions) {
    const klass = region.semanticClass;
    if (!["impassable_water", "impassable_void", "impassable_structure",
      "standable_high_ground", "grass_sight"].includes(klass)) continue;
    const cells = region.footprintCells.map((cell) => ({
      regionId: region.regionId, cell }));
    const crosses = cells.some((entry) => segmentsCrossCell(
      attacker.point, target.point, entry, 0));
    if (!crosses) continue;
    const attackerInside = cells.some((entry) => pointInCellEntry(
      attacker.point, entry));
    const targetInside = cells.some((entry) => pointInCellEntry(
      target.point, entry));
    let blocks = false;
    let reason = null;
    if (klass === "impassable_structure") {
      blocks = true;
      reason = "solid_structure_blocks_sight";
    } else if (klass === "grass_sight") {
      blocks = !(attackerInside || targetInside);
      reason = blocks ? "grass_breaks_sight_across_region" : null;
    } else if (klass === "standable_high_ground") {
      const supported = attacker.supportedRegionId === region.regionId
        || target.supportedRegionId === region.regionId;
      blocks = !supported;
      reason = blocks ? "high_ground_body_blocks_ground_to_ground_sight" : null;
    }
    // impassable_water and impassable_void are open: they never block sight.
    assessments.push({ regionId: region.regionId, semanticClass: klass,
      blocksLineOfSight: blocks, reason });
  }
  const blockers = assessments.filter((entry) => entry.blocksLineOfSight);
  const body = {
    schema: SEMANTIC_MAP_SPATIAL_QUERY_V1_SCHEMA,
    queryKind: "line_of_sight",
    attacker: { x: fixed(attacker.point.xMilliInches / 1000),
      y: fixed(attacker.point.yMilliInches / 1000),
      supportedRegionId: attacker.supportedRegionId },
    target: { x: fixed(target.point.xMilliInches / 1000),
      y: fixed(target.point.yMilliInches / 1000),
      supportedRegionId: target.supportedRegionId },
    visible: blockers.length === 0,
    blockingRegionIds: blockers.map((entry) => entry.regionId),
    assessments,
    waterAndVoidNeverBlockSight: true,
    grassBreaksSightAcrossRegion: true,
    supportedHighGroundSurfaceExcluded: true,
    officialKernelDeferredKindsOwnedByAdapter: ["grass", "impassable", "ramp"],
    rulesTruth: "adapter_spatial_query_semantic_geometry",
    trainingTruth: false,
  };
  return deepFreeze(seal(body, "queryHash"));
}

export function verifySemanticMapSpatialQueryResultV1(result) {
  if (!object(result) || result.schema !== SEMANTIC_MAP_SPATIAL_QUERY_V1_SCHEMA
    || result.queryHash !== hashStarcraftTmgContract(without(result, ["queryHash"]))
    || !["terrain_effect_at_point", "movement_legality", "line_of_sight"]
      .includes(result.queryKind)
    || result.rulesTruth !== "adapter_spatial_query_semantic_geometry"
    || result.trainingTruth !== false) {
    fail("SEMANTIC_RULES_QUERY_RESULT_INVALID");
  }
  return true;
}
