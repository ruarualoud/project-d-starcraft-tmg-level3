// V3.1 semantic-map surface support. The board contains physical ramp gates
// and blocking rims; the frozen semantic certificate contains the standable
// high-ground interior. Neither layer alone can derive a model's elevation.
// Old room versions deliberately keep their existing placement semantics.

import { createOfficialPhysicalFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 } from
  "./official-model-base-geometry-rules-kernel-v1.mjs";
import { resolveOfficialLogicalTerrainSurfaceCoverageV1 } from
  "../product-composition/official-logical-terrain-surface-geometry-v1.mjs";

const V3_OVERLAY = "local_ramp_corridor_v3_1";
const TOLERANCE = 1;

function rectangle(raw) {
  const value = raw?.footprint || raw;
  if (value?.shape === "axis_aligned_rectangle"
    && [value.minXMilliInches, value.maxXMilliInches,
      value.minYMilliInches, value.maxYMilliInches]
      .every(Number.isSafeInteger)) {
    return { minX: value.minXMilliInches, maxX: value.maxXMilliInches,
      minY: value.minYMilliInches, maxY: value.maxYMilliInches };
  }
  if (Number.isFinite(value?.xMin) && Number.isFinite(value?.xMax)
    && Number.isFinite(value?.yMin) && Number.isFinite(value?.yMax)) {
    return { minX: Math.round(value.xMin * 1000),
      maxX: Math.round(value.xMax * 1000),
      minY: Math.round(value.yMin * 1000),
      maxY: Math.round(value.yMax * 1000) };
  }
  throw new Error("SEMANTIC_SURFACE_RECTANGLE_INVALID");
}

function bounds(footprint) {
  const { xMilliInches: x, yMilliInches: y } = footprint.center || {};
  if (footprint.shape === "round"
    && Number.isFinite(x) && Number.isFinite(y)
    && Number.isFinite(footprint.radiusMilliInches)) {
    const r = footprint.radiusMilliInches;
    return { minX: x - r, maxX: x + r, minY: y - r, maxY: y + r };
  }
  if (footprint.shape === "rectangle"
    && Array.isArray(footprint.vertices) && footprint.vertices.length === 4) {
    const xs = footprint.vertices.map((point) => point.xMilliInches);
    const ys = footprint.vertices.map((point) => point.yMilliInches);
    if ([...xs, ...ys].every(Number.isFinite)) {
      return { minX: Math.min(...xs), maxX: Math.max(...xs),
        minY: Math.min(...ys), maxY: Math.max(...ys) };
    }
  }
  throw new Error("SEMANTIC_SURFACE_MODEL_BASE_INVALID");
}

function verticalRange(footprint, x) {
  if (footprint.shape === "round") {
    const delta = x - footprint.center.xMilliInches;
    const half = Math.sqrt(Math.max(0,
      footprint.radiusMilliInches ** 2 - delta ** 2));
    return [footprint.center.yMilliInches - half,
      footprint.center.yMilliInches + half];
  }
  const intersections = [];
  const vertices = footprint.vertices;
  for (let index = 0; index < vertices.length; index += 1) {
    const a = vertices[index]; const b = vertices[(index + 1) % vertices.length];
    const minX = Math.min(a.xMilliInches, b.xMilliInches);
    const maxX = Math.max(a.xMilliInches, b.xMilliInches);
    if (x < minX - TOLERANCE || x > maxX + TOLERANCE) continue;
    if (Math.abs(a.xMilliInches - b.xMilliInches) <= 1e-9) {
      if (Math.abs(x - a.xMilliInches) <= TOLERANCE) {
        intersections.push(a.yMilliInches, b.yMilliInches);
      }
    } else {
      const ratio = (x - a.xMilliInches)
        / (b.xMilliInches - a.xMilliInches);
      if (ratio >= -1e-9 && ratio <= 1 + 1e-9) {
        intersections.push(a.yMilliInches
          + ratio * (b.yMilliInches - a.yMilliInches));
      }
    }
  }
  if (!intersections.length) throw new Error("SEMANTIC_SURFACE_SLICE_INVALID");
  return [Math.min(...intersections), Math.max(...intersections)];
}

function whollyInsideRectangle(footprint, rect) {
  if (footprint.shape === "round") {
    const box = bounds(footprint);
    return box.minX >= rect.minX - TOLERANCE
      && box.maxX <= rect.maxX + TOLERANCE
      && box.minY >= rect.minY - TOLERANCE
      && box.maxY <= rect.maxY + TOLERANCE;
  }
  return footprint.vertices.every((point) => (
    point.xMilliInches >= rect.minX - TOLERANCE
      && point.xMilliInches <= rect.maxX + TOLERANCE
      && point.yMilliInches >= rect.minY - TOLERANCE
      && point.yMilliInches <= rect.maxY + TOLERANCE));
}

// Exact for a circle or convex rectangular base against a union of
// axis-aligned rectangles: partition at every rectangle/vertex x-edge,
// then cover the entire vertical cross-section within each slab.
function whollyInsideUnion(footprint, rows) {
  const box = bounds(footprint);
  const nearby = rows.map(rectangle).filter((rect) => (
    rect.maxX >= box.minX && rect.minX <= box.maxX
      && rect.maxY >= box.minY && rect.minY <= box.maxY));
  if (!nearby.length) return false;
  const breaks = new Set([box.minX, box.maxX]);
  for (const rect of nearby) {
    if (rect.minX > box.minX && rect.minX < box.maxX) breaks.add(rect.minX);
    if (rect.maxX > box.minX && rect.maxX < box.maxX) breaks.add(rect.maxX);
  }
  if (footprint.shape === "rectangle") {
    for (const vertex of footprint.vertices) breaks.add(vertex.xMilliInches);
  }
  const xs = [...breaks].sort((left, right) => left - right);
  for (let index = 1; index < xs.length; index += 1) {
    const left = xs[index - 1]; const right = xs[index];
    if (right - left <= 1e-9) continue;
    const middle = (left + right) / 2;
    const intervals = nearby.filter((rect) => (
      rect.minX <= middle && rect.maxX >= middle))
      .map((rect) => [rect.minY, rect.maxY])
      .sort((a, b) => a[0] - b[0]);
    if (!intervals.length) return false;
    const merged = [];
    for (const interval of intervals) {
      const last = merged.at(-1);
      if (last && interval[0] <= last[1] + TOLERANCE) {
        last[1] = Math.max(last[1], interval[1]);
      } else merged.push([...interval]);
    }
    const samples = footprint.shape === "round"
      ? [left, right, Math.max(left, Math.min(right,
        footprint.center.xMilliInches))]
      : [left, middle, right];
    const ranges = samples.map((x) => verticalRange(footprint, x));
    const neededMinY = Math.min(...ranges.map((range) => range[0]));
    const neededMaxY = Math.max(...ranges.map((range) => range[1]));
    if (!merged.some(([minY, maxY]) => (
      minY <= neededMinY + TOLERANCE
        && maxY >= neededMaxY - TOLERANCE))) return false;
  }
  return true;
}

export function deriveOfficialSemanticSurfaceSupportV1(state, footprint) {
  const freeze = state?.officialCompetitiveMapRoomFreeze;
  if (freeze?.overlayReceipt?.terrainProfilePolicy === "accepted_premade_group_rectangle_overlay_v1") {
    const coverage = resolveOfficialLogicalTerrainSurfaceCoverageV1(state, [footprint]);
    if (!coverage) return null;
    const covered = new Map(coverage.groups.filter(group => group.covered)
      .map(group => [group.terrainGroupId, group]));
    const supports = (state.board?.terrain || []).filter(terrain => {
      if (!covered.has(terrain.terrainGroupId) || terrain.isRemoved === true || terrain.isDestroyed === true) return false;
      return (terrain.footprintCells || [terrain.footprint]).some(cell => {
        const rect = rectangle(cell);
        return evaluateOfficialPhysicalFootprintRelationV1({ left: footprint,
          right: createOfficialPhysicalFootprintV1({ objectId: terrain.id, kind: "terrain", shape: "rectangle",
            center: { xMilliInches: Math.round((rect.minX + rect.maxX) / 2),
              yMilliInches: Math.round((rect.minY + rect.maxY) / 2) },
            widthMilliInches: rect.maxX - rect.minX, depthMilliInches: rect.maxY - rect.minY, rotationDegrees: 0 })
        }).minimumSeparationMilliInches <= TOLERANCE;
      });
    }).sort((a,b) => String(a.id).localeCompare(String(b.id)));
    const elevation = [...covered.values()].some(group => group.elevation === "high") ? "high"
      : [...covered.values()].some(group => group.elevation === "mid") ? "mid" : "ground";
    return Object.freeze({ elevation, supportTerrainIds: Object.freeze(supports.map(terrain => terrain.id)),
      semanticHeightTier: elevation === "high" ? "high_ground" : elevation === "mid" ? "mid_ground" : null,
      fullModelBaseChecked: true, exactNativeSurfaceUnionChecked: true });
  }
  if (freeze?.overlayReceipt?.overlayCompilerVersion !== V3_OVERLAY) return null;
  const rows = freeze.semanticTerrainCertificate?.heightTierLedgerRows;
  const ledger = state.officialTerrainHeightTierLedger;
  if (!Array.isArray(rows) || !ledger
    || ledger.ledgerHash !== freeze.terrainHeightTierLedgerHash
    || ledger.deploymentGeometryBindingHash
      !== state.officialDeploymentGeometryBinding?.bindingHash) {
    throw new Error("SEMANTIC_SURFACE_FROZEN_LEDGER_MISMATCH");
  }
  const boardSupports = (state.board?.terrain || []).filter((terrain) => (
    terrain.isRemoved !== true && terrain.isDestroyed !== true
      && terrain.standableHorizontalSurface === true
      && whollyInsideRectangle(footprint, rectangle(terrain))))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const tier = ["high_ground", "mid_ground"].find((heightTier) => (
    whollyInsideUnion(footprint, rows.filter((row) => (
      row.heightTier === heightTier && row.impassable !== true))))) || null;
  const highestBoardSize = boardSupports.reduce((value, terrain) => (
    Math.max(value, Number(terrain.size || 0))), 0);
  const elevation = tier === "high_ground" || highestBoardSize >= 3
    ? "high" : tier === "mid_ground" || highestBoardSize >= 1
      ? "mid" : "ground";
  return Object.freeze({ elevation,
    supportTerrainIds: Object.freeze(boardSupports.map((terrain) => String(terrain.id))),
    semanticHeightTier: tier,
    semanticCertificateHash: freeze.semanticTerrainCertificateHash,
    fullModelBaseChecked: true });
}
