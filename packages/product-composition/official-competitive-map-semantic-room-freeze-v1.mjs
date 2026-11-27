#!/usr/bin/env node

/**
 * Ticket 24 / Slice 254-R8-11 — semantic competitive-map room freeze.
 *
 * The Room-factory wiring for registered semantic maps (user-authorized
 * 2026-09-26). The existing two-layer room freeze certifies a GENERIC
 * premade balanced-terrain layout (alternating placement, quadrant
 * distribution, centre-significant piece, fire lanes) — those invariants
 * are category-specific to rectangular premade arrangements and fail for
 * real map art terrain (R8-10 matrix: 5 Standard maps). This module
 * certifies the SAME-version semantic map terrain instead, with its own
 * named invariants, all produced by official factories/kernels:
 *
 *   - board terrain contract: impassable/grass/cover cells, cliff-rim bands
 *     and ramp gates from the committed semantic binding (the overlay
 *     builder moved here from scripts/support; the support module re-exports
 *     it for the R8-9 gate);
 *   - official special-terrain agreement (setup-time, denominator-complete);
 *   - official height-tier ledger with marker-seam packing: ledger rows are
 *     deterministically re-segmented so every mission marker coordinate has
 *     exactly ONE support row (repairs the recorded Python centre-marker
 *     seam ambiguity without editing the kernel);
 *   - official mission marker placement (fail-closed on impassable);
 *   - the SAME official spatial reachability audit as the two-layer freeze
 *     (official_task_geometry authority, full base profiles, entry edges,
 *     mission markers + quarter areas) over a per-region terrain view:
 *     impassable regions are blockers, each standable high-ground region is
 *     ONE standable piece carrying all its ramp access points — the model
 *     the audit was designed for;
 *   - the semantic terrain certificate (class separation + access topology).
 *
 * The freeze records the superseded two-layer failure code when known by the
 * caller (never hidden). Balanced-layout-only invariants are explicitly
 * recorded notApplicableWithReason, not silently skipped.
 *
 * No Rules-atom/source-data edits; pixels never become gameplay truth.
 */

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialTerrainPieceV1 } from
  "../rule-atoms/official-terrain-los-rules-kernel-v1.mjs";
import { createOfficialSpecialTerrainAgreementV1 } from
  "../rule-atoms/official-special-terrain-rules-kernel-v1.mjs";
import { createOfficialTerrainHeightTierLedgerV1,
  finalizeOfficialMissionMarkerPlacementV1,
  verifyOfficialDeploymentGeometryBindingV1 } from
  "../rule-atoms/official-deployment-geometry-rules-kernel-v1.mjs";
import { createOfficialCompetitiveMapSemanticGeometryBindingV1,
  verifyOfficialCompetitiveMapSemanticGeometryBindingV1 } from
  "./official-competitive-map-semantic-geometry-v1.mjs";
import { compileOfficialCompetitiveMapSemanticRulesGeometryV1,
  certifyOfficialCompetitiveMapSemanticTerrainV1,
  createOfficialSemanticHeightTierLedgerRowsV1,
  snapSemanticMapPreviewCoordinateV1,
  verifyOfficialCompetitiveMapSemanticRulesGeometryV1,
  verifyOfficialCompetitiveMapSemanticTerrainCertificateV1 } from
  "./official-competitive-map-semantic-rules-adapter-v1.mjs";
import { getOfficialCompetitiveMapTabletopAdapterV1 } from
  "./official-competitive-map-tabletop-adapter-v1.mjs";
import { certifyOfficialSemanticRampAdmissionV1,
  verifyOfficialSemanticRampAdmissionV1 } from
  "./official-semantic-ramp-admission-v1.mjs";
import { SEMANTIC_RULES_CELL_RESOLUTION_MILLI_INCHES } from
  "./official-competitive-map-semantic-rules-adapter-v1.mjs";
import { CANONICAL_ROUND_CLEARANCE_GRID250_V1 } from
  "./official-competitive-map-spatial-reachability-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ROOM_FREEZE_V1_SCHEMA =
  "starcraft_tmg_competitive_map_semantic_room_freeze_v1";
export const OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ROOM_FREEZE_V1_VERSION = "1.0.0";
export const SEMANTIC_ROOM_OVERLAY_V1_SCHEMA =
  "starcraft_tmg_ticket_24_r8_9_semantic_room_overlay_receipt_v1";
export const SEMANTIC_ROOM_OVERLAY_V1_VERSION = "1.0.0";
export const SEMANTIC_ROOM_OVERLAY_EXACT_GATE_CELLS_V2 =
  "exact_gate_cells_v2";
export const SEMANTIC_ROOM_OVERLAY_LOCAL_RAMP_CORRIDOR_V3 =
  "local_ramp_corridor_v3_1";
export const SEMANTIC_ROOM_OVERLAY_V2_SCHEMA =
  "starcraft_tmg_ticket_24_semantic_room_overlay_receipt_v2";
export const SEMANTIC_ROOM_OVERLAY_V2_VERSION = "2.0.0";
export const SEMANTIC_ROOM_OVERLAY_V3_SCHEMA =
  "starcraft_tmg_ticket_24_semantic_room_overlay_receipt_v3";
export const SEMANTIC_ROOM_OVERLAY_V3_VERSION = "3.1.0";
export const SEMANTIC_ROOM_PREMADE_PROFILE_OVERLAY_V1_SCHEMA =
  "starcraft_tmg_official_premade_profile_room_overlay_v1";

const CELL = SEMANTIC_RULES_CELL_RESOLUTION_MILLI_INCHES; // 250 milli-inch
const GATE_MARGIN_MILLI = 1000; // 1in safety margin around the ramp capsule

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
function fixed(value) { return Number(Number(value).toFixed(3)); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
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
function inflate(rect, byMilli) {
  return milliRect(rect.minXMilliInches - byMilli, rect.maxXMilliInches + byMilli,
    rect.minYMilliInches - byMilli, rect.maxYMilliInches + byMilli);
}
function rectsIntersect(a, b) {
  return a.minXMilliInches < b.maxXMilliInches && a.maxXMilliInches > b.minXMilliInches
    && a.minYMilliInches < b.maxYMilliInches && a.maxYMilliInches > b.minYMilliInches;
}
function rectBounds(rects) {
  return milliRect(Math.min(...rects.map((entry) => entry.minXMilliInches)),
    Math.max(...rects.map((entry) => entry.maxXMilliInches)),
    Math.min(...rects.map((entry) => entry.minYMilliInches)),
    Math.max(...rects.map((entry) => entry.maxYMilliInches)));
}
function pointRectDistance(point, rect) {
  return Math.hypot(
    Math.max(rect.minXMilliInches - point.xMilliInches, 0,
      point.xMilliInches - rect.maxXMilliInches),
    Math.max(rect.minYMilliInches - point.yMilliInches, 0,
      point.yMilliInches - rect.maxYMilliInches));
}
function pointSegmentDistance(point, start, end) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.xMilliInches
    - start.xMilliInches, point.yMilliInches - start.yMilliInches);
  const ratio = Math.max(0, Math.min(1,
    ((point.xMilliInches - start.xMilliInches) * dx
      + (point.yMilliInches - start.yMilliInches) * dy) / lengthSquared));
  return Math.hypot(point.xMilliInches - start.xMilliInches - ratio * dx,
    point.yMilliInches - start.yMilliInches - ratio * dy);
}
function segmentIntersectsRect(start, end, rect) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  let minimum = 0;
  let maximum = 1;
  for (const [direction, offset] of [
    [-dx, start.xMilliInches - rect.minXMilliInches],
    [dx, rect.maxXMilliInches - start.xMilliInches],
    [-dy, start.yMilliInches - rect.minYMilliInches],
    [dy, rect.maxYMilliInches - start.yMilliInches],
  ]) {
    if (direction === 0) { if (offset < 0) return false; continue; }
    const ratio = offset / direction;
    if (direction < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return maximum >= 0 && minimum <= 1;
}
function segmentRectDistance(start, end, rect) {
  if (segmentIntersectsRect(start, end, rect)) return 0;
  const corners = [
    { xMilliInches: rect.minXMilliInches, yMilliInches: rect.minYMilliInches },
    { xMilliInches: rect.maxXMilliInches, yMilliInches: rect.minYMilliInches },
    { xMilliInches: rect.maxXMilliInches, yMilliInches: rect.maxYMilliInches },
    { xMilliInches: rect.minXMilliInches, yMilliInches: rect.maxYMilliInches },
  ];
  return Math.min(pointRectDistance(start, rect), pointRectDistance(end, rect),
    ...corners.map((corner) => pointSegmentDistance(corner, start, end)));
}

// Expand exact merged rectangles at the region's explicit compiled precision.
function regionGridCells(region) {
  const step = region.cellResolutionMilliInches ?? CELL;
  const cells = [];
  for (const rect of region.footprintCells) {
    for (let column = rect.minXMilliInches / step;
      column < rect.maxXMilliInches / step; column += 1) {
      for (let row = rect.minYMilliInches / step;
        row < rect.maxYMilliInches / step; row += 1) {
        cells.push({ column, row, rect: milliRect(column * step, (column + 1) * step,
          row * step, (row + 1) * step) });
      }
    }
  }
  return cells;
}

// Rim = grid cells with at least one 4-neighbour outside the region.
function rimCellsOf(cells) {
  const keys = new Set(cells.map((entry) => `${entry.column}:${entry.row}`));
  return cells.filter((entry) => (
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (
      !keys.has(`${entry.column + dx}:${entry.row + dy}`)))));
}

// Merge remaining rim cells into row-run rectangles (fewer pieces).
function rowRunMerge(cells, step = CELL) {
  const byRow = new Map();
  for (const cell of cells) {
    const row = byRow.get(cell.row) || [];
    row.push(cell.column);
    byRow.set(cell.row, row);
  }
  const rects = [];
  for (const [row, columns] of [...byRow.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...columns].sort((a, b) => a - b);
    let start = sorted[0];
    let previous = sorted[0];
    for (const column of sorted.slice(1)) {
      if (column !== previous + 1) {
        rects.push(milliRect(start * step, (previous + 1) * step, row * step,
          (row + 1) * step));
        start = column;
      }
      previous = column;
    }
    rects.push(milliRect(start * step, (previous + 1) * step, row * step,
      (row + 1) * step));
  }
  return rects;
}

// Exact union for a gate's assigned 0.25in cells. Merge horizontal runs
// vertically by span even when each row has several disjoint runs; the
// older reachability-view helper only merges consecutive array entries and
// would emit many unnecessary one-row terrain pieces for a curved rim.
function mergeGateCellsExactRectsV2(cells, step = CELL) {
  const merged = [];
  const tailBySpan = new Map();
  for (const run of rowRunMerge(cells, step)) {
    const span = `${run.minXMilliInches}:${run.maxXMilliInches}`;
    const previous = tailBySpan.get(span);
    if (previous && previous.maxYMilliInches === run.minYMilliInches) {
      previous.maxYMilliInches = run.maxYMilliInches;
    } else {
      const rect = { ...run };
      merged.push(rect);
      tailBySpan.set(span, rect);
    }
  }
  return merged;
}

function boardRow(piece, extra) {
  return {
    ...clone(piece),
    id: piece.id, terrainId: piece.id,
    terrainKind: piece.terrainKind, size: piece.size,
    footprint: clone(piece.footprint), originalFootprint: clone(piece.footprint),
    elevation: extra.heightTier, heightTier: extra.heightTier,
    standableHorizontalSurface: piece.standableHorizontalSurface,
    elevationSurface: piece.standableHorizontalSurface,
    impassable: piece.terrainKind === "impassable",
    blocksPlacement: extra.blocksPlacement,
    openings: [],
    accessPoints: clone(extra.accessPoints || []),
    adjacentElevationPairs: clone(extra.adjacentElevationPairs || []),
    semanticRegionId: extra.semanticRegionId,
    semanticClass: extra.semanticClass,
    overlayRole: extra.overlayRole,
    ...(extra.terrainGroupId ? { terrainGroupId: extra.terrainGroupId,
      terrainInstanceIds: clone(extra.terrainInstanceIds),
      sourceRegionIds: clone(extra.sourceRegionIds) } : {}),
    isRemoved: false,
    rulesTruth: piece.rulesTruth,
    trainingTruth: false,
  };
}

export function buildOfficialSemanticRoomTerrainOverlayV1(input = {}) {
  const binding = input.binding;
  const geometry = input.geometry;
  const overlayCompilerVersion = input.overlayCompilerVersion || "legacy_v1";
  if (!["legacy_v1", SEMANTIC_ROOM_OVERLAY_EXACT_GATE_CELLS_V2,
    SEMANTIC_ROOM_OVERLAY_LOCAL_RAMP_CORRIDOR_V3]
    .includes(overlayCompilerVersion)) {
    fail("SEMANTIC_ROOM_OVERLAY_COMPILER_VERSION_UNSUPPORTED",
      overlayCompilerVersion);
  }
  const localRampCorridor = overlayCompilerVersion
    === SEMANTIC_ROOM_OVERLAY_LOCAL_RAMP_CORRIDOR_V3;
  const exactGateCells = overlayCompilerVersion !== "legacy_v1";
  if (!binding || !geometry
    || geometry.schema
      !== "starcraft_tmg_official_competitive_map_semantic_rules_geometry_v1"
    || geometry.bindingHash !== binding.bindingHash) {
    fail("SEMANTIC_ROOM_OVERLAY_INPUT_INVALID");
  }
  const premadeProfile = Boolean(geometry.terrainAuthoringAgreement);
  if (premadeProfile) verifyOfficialCompetitiveMapSemanticRulesGeometryV1(geometry);
  // Native coordinate quantum is not a navigation grid. The legacy rim
  // expansion can overshoot native high cells at250milli; do not admit that
  // unimplemented representation under a precise native-cell receipt.
  if (!premadeProfile && geometry.sourcePixelCellGeometry && geometry.regions.some(region =>
    region.rulesClassification.standableHorizontalSurface)) {
    fail("SEMANTIC_ROOM_NATIVE_HIGH_PRECISION_NOT_IMPLEMENTED");
  }
  const rows = [];
  const agreementEntries = [];
  const ledgerRows = [];
  const gateIndex = [];
  const pushPiece = (id, { terrainKind, size, heightTier, standable, footprint, footprintCells,
    blocksPlacement, accessPoints = [], adjacentElevationPairs = [],
    semanticRegionId, semanticClass, overlayRole, terrainGroupId,
    terrainInstanceIds, sourceRegionIds }) => {
    const piece = createOfficialTerrainPieceV1({ id, terrainKind, size,
      footprint, ...(footprintCells ? { footprintCells } : {}), standableHorizontalSurface: standable, openings: [] });
    rows.push(boardRow(piece, { heightTier, blocksPlacement, accessPoints,
      adjacentElevationPairs, semanticRegionId, semanticClass, overlayRole,
      terrainGroupId, terrainInstanceIds, sourceRegionIds }));
    agreementEntries.push({ terrainId: id, terrainKind,
      adjacentElevationPairs,
      accessPoints: accessPoints.map((entry) => ({
        accessPointId: entry.accessPointId, role: entry.role,
        footprint: entry.footprint, connects: [...entry.connects] })) });
  };

  for (const region of geometry.regions) {
    const classification = region.rulesClassification;
    const kind = classification.terrainKind;
    if (premadeProfile) {
      const agreedOrdinaryTop = kind === "ordinary" && classification.standableHorizontalSurface === true
        && (classification.heightTier === "high_ground" && classification.size >= 3
          || classification.heightTier === "mid_ground" && [1, 2].includes(classification.size));
      const agreedRamp = kind === "ramp" && classification.size === 1
        && classification.heightTier === "mid_ground" && classification.standableHorizontalSurface === true;
      if (!agreedOrdinaryTop && !agreedRamp && (classification.heightTier !== "ground_level" || classification.standableHorizontalSurface)
        || (region.accessPoints || []).length && !agreedRamp) {
        fail("SEMANTIC_ROOM_PREMADE_PROFILE_HEIGHT_ACCESS_UNSUPPORTED", region.regionId);
      }
      // Explicit per-group agreement owns the Size, including low impassable
      // pieces which Large can remove. Geometry verification already checks
      // the agreed integer Size and complete source-instance denominator.
      if (classification.openingsPolicy !== "no_openings_agreed"
        || kind === "grass" && classification.size !== 2) {
        fail("SEMANTIC_ROOM_PREMADE_PROFILE_RULES_CONFLICT", region.regionId);
      }
      if (agreedRamp) {
        const id = `${region.regionId}:physical-ramp`;
        pushPiece(id, { terrainKind: "ramp", size: 1, heightTier: "mid_ground", standable: true,
          footprint: region.footprint, footprintCells: region.footprintCells, blocksPlacement: classification.blocksPlacement,
          accessPoints: region.accessPoints, adjacentElevationPairs: region.accessPoints.map(port => port.connects),
          semanticRegionId: region.regionId, semanticClass: region.semanticClass,
          overlayRole: "premade_profile_actual_cell", terrainGroupId: region.terrainGroupId,
          terrainInstanceIds: region.terrainInstanceIds, sourceRegionIds: region.sourceRegionIds });
        for (const accessPoint of region.accessPoints) gateIndex.push({ gatePieceId: id,
          regionId: region.regionId, accessPointId: accessPoint.accessPointId, role: accessPoint.role,
          connects: clone(accessPoint.connects), accessPointFootprint: inchesRect(accessPoint.footprint),
          exactUnionRectangleCount: region.footprintCells.length, nativeRamp: true });
        region.footprintCells.forEach((cell, index) => ledgerRows.push({ terrainPieceId: `${region.regionId}:cell-${index + 1}`,
          heightTier: "mid_ground", footprint: inchesRect(cell), impassable: false }));
        continue;
      }
      // The frozen kernels consume rectangles, not a polygon's bounding
      // envelope. Each existing actual cell becomes a kernel row carrying
      // the exact agreed values and its logical group membership. Never
      // reinterpret an ordinary Size2 wall as class-default Size1 cover.
      region.footprintCells.forEach((cell, index) => {
        pushPiece(`${region.regionId}:profile-cell-${index + 1}`, {
          terrainKind: kind, size: classification.size,
          heightTier: classification.heightTier,
          standable: classification.standableHorizontalSurface,
          footprint: cell, blocksPlacement: classification.blocksPlacement,
          adjacentElevationPairs: kind === "impassable" ? [["ground", "high"]] : [],
          semanticRegionId: region.regionId, semanticClass: region.semanticClass,
          overlayRole: "premade_profile_actual_cell", terrainGroupId: region.terrainGroupId,
          terrainInstanceIds: region.terrainInstanceIds, sourceRegionIds: region.sourceRegionIds });
        ledgerRows.push({ terrainPieceId: `${region.regionId}:cell-${index + 1}`,
          heightTier: classification.heightTier, footprint: inchesRect(cell),
          impassable: kind === "impassable" });
      });
      continue;
    }
    if (kind === "impassable") {
      region.footprintCells.forEach((cell, index) => {
        pushPiece(`${region.regionId}:blk-${index + 1}`, {
          terrainKind: "impassable", size: Math.max(2, classification.size),
          heightTier: "ground_level", standable: false, footprint: cell,
          blocksPlacement: true,
          // Kernel contract: impassable is DERIVED from an adjacent-elevation
          // pair without access points (core-11 encoding).
          adjacentElevationPairs: [["ground", "high"]],
          semanticRegionId: region.regionId, semanticClass: region.semanticClass,
          overlayRole: "impassable_cell" });
        ledgerRows.push({ terrainPieceId: `${region.regionId}:cell-${index + 1}`,
          heightTier: "ground_level", footprint: inchesRect(cell),
          impassable: true });
      });
      continue;
    }
    if (kind === "grass") {
      region.footprintCells.forEach((cell, index) => {
        pushPiece(`${region.regionId}:grass-${index + 1}`, {
          terrainKind: "grass", size: 2, heightTier: "ground_level",
          standable: false, footprint: cell, blocksPlacement: false,
          semanticRegionId: region.regionId, semanticClass: region.semanticClass,
          overlayRole: "grass_cell" });
      });
      continue;
    }
    if (region.semanticClass === "ordinary_cover") {
      region.footprintCells.forEach((cell, index) => {
        pushPiece(`${region.regionId}:cover-${index + 1}`, {
          terrainKind: "ordinary", size: 1, heightTier: "ground_level",
          standable: false, footprint: cell, blocksPlacement: false,
          semanticRegionId: region.regionId, semanticClass: region.semanticClass,
          overlayRole: "cover_cell" });
      });
      continue;
    }
    if (region.semanticClass === "standable_high_ground") {
      const regionStep = region.cellResolutionMilliInches ?? CELL;
      const cells = regionGridCells(region);
      const rim = rimCellsOf(cells);
      const accessPoints = region.accessPoints || [];
      if (accessPoints.length === 0) {
        fail("SEMANTIC_ROOM_OVERLAY_HIGH_GROUND_ACCESS_MISSING", region.regionId);
      }
      // Deterministic rim-cell → gate assignment. Compiled access-point
      // footprints can be large enough that their inflated capsules overlap
      // (Lost Temple central mound: all four ramp capsules cover the whole
      // rim), so a greedy first-come assignment starves later gates. Instead:
      //   pass 1 — rim cells reachable by exactly ONE capsule go to that gate;
      //   pass 2 — every gate reserves its nearest unassigned candidate cell
      //     that intersects its OWN access-point footprint (the kernel
      //     requires piece/access-point overlap), stealing the nearest cell
      //     from a donor gate only when the donor keeps an intersecting cell;
      //   pass 3 — remaining candidate cells join their nearest gate;
      //   pass 4 — rim cells outside every capsule become plain rim pieces.
      const capsules = accessPoints.map((accessPoint) => inflate(
        accessPoint.footprint, GATE_MARGIN_MILLI));
      const candidatesOf = rim.map((cell) => accessPoints
        .map((accessPoint, ordinal) => (rectsIntersect(cell.rect, capsules[ordinal])
          ? ordinal : -1))
        .filter((ordinal) => ordinal >= 0));
      const assignedGate = new Array(rim.length).fill(-1);
      rim.forEach((cell, index) => {
        if (candidatesOf[index].length === 1) {
          assignedGate[index] = candidatesOf[index][0];
        }
      });
      const gateMembers = (ordinal) => rim.map((cell, index) => index)
        .filter((index) => assignedGate[index] === ordinal);
      const centerDistanceTo = (cell, footprint) => {
        const x = cell.column * regionStep + regionStep / 2;
        const y = cell.row * regionStep + regionStep / 2;
        return Math.hypot(
          Math.max(footprint.minXMilliInches - x, 0, x - footprint.maxXMilliInches),
          Math.max(footprint.minYMilliInches - y, 0, y - footprint.maxYMilliInches));
      };
      accessPoints.forEach((accessPoint, ordinal) => {
        const candidateIndexes = rim.map((cell, index) => index)
          .filter((index) => candidatesOf[index].includes(ordinal));
        if (candidateIndexes.length === 0) {
          fail("SEMANTIC_ROOM_OVERLAY_GATE_UNREACHABLE",
            `${region.regionId}:${accessPoint.accessPointId}`);
        }
        const intersectsOwn = (index) => rectsIntersect(
          rim[index].rect, accessPoint.footprint);
        if (gateMembers(ordinal).some(intersectsOwn)) return;
        const ranked = candidateIndexes.slice().sort((left, right) => (
          centerDistanceTo(rim[left], accessPoint.footprint)
            - centerDistanceTo(rim[right], accessPoint.footprint)
          || rim[left].column - rim[right].column
          || rim[left].row - rim[right].row));
        let chosen = ranked.find((index) => assignedGate[index] === -1
          && intersectsOwn(index));
        if (chosen === undefined) {
          // Steal the nearest intersecting cell from a donor gate that keeps
          // at least one cell intersecting its own access-point footprint.
          chosen = ranked.find((index) => {
            if (!intersectsOwn(index)) return false;
            const donor = assignedGate[index];
            if (donor === -1 || donor === ordinal) return false;
            return gateMembers(donor).some((other) => other !== index
              && rectsIntersect(rim[other].rect, accessPoints[donor].footprint));
          });
        }
        if (chosen === undefined) {
          fail("SEMANTIC_ROOM_OVERLAY_GATE_UNREACHABLE",
            `${region.regionId}:${accessPoint.accessPointId}`);
        }
        assignedGate[chosen] = ordinal;
      });
      rim.forEach((cell, index) => {
        if (assignedGate[index] !== -1 || candidatesOf[index].length === 0) return;
        const nearest = candidatesOf[index].slice().sort((left, right) => (
          centerDistanceTo(cell, accessPoints[left].footprint)
            - centerDistanceTo(cell, accessPoints[right].footprint)
          || left - right))[0];
        assignedGate[index] = nearest;
      });
      accessPoints.forEach((accessPoint, gateOrdinal) => {
        const cellsForGate = gateMembers(gateOrdinal)
          .map((index) => rim[index])
          .sort((left, right) => left.row - right.row || left.column - right.column);
        if (cellsForGate.length === 0) {
          fail("SEMANTIC_ROOM_OVERLAY_GATE_UNREACHABLE",
            `${region.regionId}:${accessPoint.accessPointId}`);
        }
        // The legacy single bounding rectangle over-covers a concave rim.
        // V2 partitions the exact assigned cell union; one rectangle owns
        // the access point, while the remaining standable surface rectangles
        // carry no duplicate access identity.
        // V3 treats the authored high-side ramp mouth as the ONLY passage.
        // V2 assigned the entire inflated access capsule to the gate, then
        // made every non-anchor rectangle a large ordinary blocker. That
        // blocked the real ramp while opening an unrelated thin rectangle.
        const rampMouth = accessPoint.groundApproachPathMilli?.at(-1);
        const authoredConnector = binding.regions.find((entry) => (
          entry.regionId === accessPoint.sourceRampRegionId
            && entry.semanticClass === "ramp_access"));
        const authoredPathMilli = authoredConnector?.geometry?.path?.map(
          (point) => ({
            xMilliInches: Math.round(point.x * binding.battlefield.widthInches
              * 1000 / binding.normalizedSpace.width),
            yMilliInches: Math.round(point.y * binding.battlefield.heightInches
              * 1000 / binding.normalizedSpace.height),
          })) || [];
        // The compiler's selected high endpoint may lie well inside the
        // platform. The physical gate is at the connector's rim crossing,
        // not necessarily near that endpoint. Only already-assigned rim
        // cells within the authored connector's width may become the gate.
        const localCells = localRampCorridor ? cellsForGate.filter((cell) => (
          authoredPathMilli.slice(1).some((end, index) => (
            segmentRectDistance(authoredPathMilli[index], end, cell.rect)
              <= Math.max(regionStep, accessPoint.gateWidthMilliInches / 2)
            // A concave ground pocket has another rim behind the mouth.
            // Its opposite face is not part of this ground-to-high passage.
            && (binding.review.localRampRimSelectionPolicy
              !== "forward_ground_high_connector_v1"
              || ((cell.rect.minXMilliInches + cell.rect.maxXMilliInches) / 2
                  - authoredPathMilli[index].xMilliInches)
                * (end.xMilliInches - authoredPathMilli[index].xMilliInches)
                + ((cell.rect.minYMilliInches + cell.rect.maxYMilliInches) / 2
                  - authoredPathMilli[index].yMilliInches)
                * (end.yMilliInches - authoredPathMilli[index].yMilliInches) >= 0)))
        )) : cellsForGate;
        if (localRampCorridor && (!rampMouth || authoredPathMilli.length < 2
          || localCells.length === 0)) {
          fail("SEMANTIC_ROOM_OVERLAY_LOCAL_RAMP_MOUTH_MISSING",
            `${region.regionId}:${accessPoint.accessPointId}`);
        }
        const gateRects = localRampCorridor
          ? [rectBounds(localCells.map((cell) => cell.rect))]
          : exactGateCells ? mergeGateCellsExactRectsV2(cellsForGate, regionStep)
          : [rectBounds(cellsForGate.map((cell) => cell.rect))];
        const anchor = localRampCorridor ? { rect: gateRects[0], index: 0 }
          : exactGateCells
          ? gateRects.map((rect, index) => ({ rect, index }))
            .filter(({ rect }) => rectsIntersect(rect, accessPoint.footprint))
            .sort((left, right) => {
              const shortSide = (entry) => Math.min(
                entry.rect.maxXMilliInches - entry.rect.minXMilliInches,
                entry.rect.maxYMilliInches - entry.rect.minYMilliInches);
              const area = (entry) => (
                (entry.rect.maxXMilliInches - entry.rect.minXMilliInches)
                * (entry.rect.maxYMilliInches - entry.rect.minYMilliInches));
              return shortSide(right) - shortSide(left)
                || area(right) - area(left)
                || left.index - right.index;
            })[0]
          : { rect: gateRects[0], index: 0 };
        if (!anchor) {
          fail("SEMANTIC_ROOM_OVERLAY_GATE_ANCHOR_MISSING",
            `${region.regionId}:${accessPoint.accessPointId}`);
        }
        const gateFootprint = anchor.rect;
        const gateId = `${region.regionId}:gate-${gateOrdinal + 1}`;
        pushPiece(gateId, {
          terrainKind: "ordinary", size: Math.max(3, classification.size),
          heightTier: "high_ground", standable: true, footprint: gateFootprint,
          blocksPlacement: false,
          accessPoints: [{ accessPointId: accessPoint.accessPointId,
            role: "ramp", footprint: clone(accessPoint.footprint),
            connects: [...accessPoint.connects],
            groundApproachPath: clone(accessPoint.groundApproachPath),
            groundApproachPathMilli: clone(accessPoint.groundApproachPathMilli),
            sourceRampRegionId: accessPoint.sourceRampRegionId,
            gateWidthMilliInches: accessPoint.gateWidthMilliInches }],
          adjacentElevationPairs: [["ground", "high"]],
          semanticRegionId: region.regionId, semanticClass: region.semanticClass,
          overlayRole: "ramp_gate" });
        if (exactGateCells && !localRampCorridor) {
          gateRects.forEach((rect, index) => {
            if (index === anchor.index) return;
            pushPiece(`${gateId}:surface-${index + 1}`, {
              terrainKind: "ordinary", size: Math.max(3, classification.size),
              heightTier: "high_ground", standable: true, footprint: rect,
              blocksPlacement: false,
              semanticRegionId: region.regionId,
              semanticClass: region.semanticClass,
              overlayRole: "ramp_gate_surface" });
          });
        }
        gateIndex.push({ gatePieceId: gateId, regionId: region.regionId,
          accessPointId: accessPoint.accessPointId,
          sourceRampRegionId: accessPoint.sourceRampRegionId,
          gateFootprint: inchesRect(gateFootprint),
          ...(exactGateCells ? { assignedCellCount: cellsForGate.length,
            surfacePieceCount: gateRects.length,
            gateWidthMilliInches: accessPoint.gateWidthMilliInches } : {}),
          ...(localRampCorridor ? { authoredMouthMilli: clone(rampMouth),
            localSelectionPolicy: binding.review.localRampRimSelectionPolicy
              || "assigned_rim_near_authored_connector_v3_1",
            localCellCount: localCells.length,
            localGateBoundingCellCount: rim.filter((cell) => (
              rectsIntersect(cell.rect, gateFootprint))).length } : {}),
          accessPointFootprint: inchesRect(accessPoint.footprint),
          groundApproachPath: clone(accessPoint.groundApproachPath) });
      });
      const remaining = rim.filter((cell, index) => localRampCorridor
        ? !gateIndex.some((gate) => gate.regionId === region.regionId
          && rectsIntersect(cell.rect, milliRect(
            gate.gateFootprint.xMin * 1000, gate.gateFootprint.xMax * 1000,
            gate.gateFootprint.yMin * 1000, gate.gateFootprint.yMax * 1000)))
        : assignedGate[index] === -1);
      rowRunMerge(remaining, regionStep).forEach((rect, index) => {
        pushPiece(`${region.regionId}:rim-${index + 1}`, {
          terrainKind: "impassable", size: 2, heightTier: "high_ground",
          standable: false, footprint: rect, blocksPlacement: true,
          adjacentElevationPairs: [["ground", "high"]],
          semanticRegionId: region.regionId, semanticClass: region.semanticClass,
          overlayRole: "cliff_rim" });
      });
      // The standable interior is not a board piece (kernels forbid endpoints
      // overlapping non-grass/ramp pieces); the ledger carries the surface.
      region.footprintCells.forEach((cell, index) => {
        ledgerRows.push({ terrainPieceId: `${region.regionId}:cell-${index + 1}`,
          heightTier: "high_ground", footprint: inchesRect(cell),
          impassable: false });
      });
      continue;
    }
    fail("SEMANTIC_ROOM_OVERLAY_CLASS_UNSUPPORTED", region.semanticClass);
  }

  const agreement = createOfficialSpecialTerrainAgreementV1({
    terrainEntries: agreementEntries });
  const pieceCounts = rows.reduce((acc, row) => {
    acc[row.overlayRole] = (acc[row.overlayRole] || 0) + 1;
    return acc;
  }, {});
  const receiptBody = {
    schema: premadeProfile ? SEMANTIC_ROOM_PREMADE_PROFILE_OVERLAY_V1_SCHEMA
      : localRampCorridor ? SEMANTIC_ROOM_OVERLAY_V3_SCHEMA
      : exactGateCells ? SEMANTIC_ROOM_OVERLAY_V2_SCHEMA : SEMANTIC_ROOM_OVERLAY_V1_SCHEMA,
    version: premadeProfile ? "1.0.0" : localRampCorridor ? SEMANTIC_ROOM_OVERLAY_V3_VERSION
      : exactGateCells ? SEMANTIC_ROOM_OVERLAY_V2_VERSION : SEMANTIC_ROOM_OVERLAY_V1_VERSION,
    ...(exactGateCells ? { overlayCompilerVersion } : {}),
    seedId: binding.seedId,
    bindingHash: binding.bindingHash,
    bindingGeometryHash: binding.geometryHash,
    semanticRulesGeometryHash: geometry.semanticRulesGeometryHash,
    artAssetPath: binding.art?.assetPath || null,
    cellResolutionMilliInches: premadeProfile ? geometry.cellResolutionMilliInches : CELL,
    ...(premadeProfile ? {
      terrainProfilePolicy: "accepted_premade_group_rectangle_overlay_v1",
      authoringApprovalReference: geometry.terrainAuthoringAgreement.approvalReference,
      sourcePixelCellGeometry: clone(geometry.sourcePixelCellGeometry),
      logicalTerrainGroupCount: geometry.regions.length,
      logicalTerrainGroups: geometry.regions.map(region => ({
        terrainGroupId: region.terrainGroupId, terrainInstanceIds: clone(region.terrainInstanceIds),
        sourceRegionIds: clone(region.sourceRegionIds),
        rectangularRulesPieceIds: rows.filter(row => row.terrainGroupId === region.terrainGroupId).map(row => row.id),
      })),
      groupLifecycleAndWholeGroupSightNotCertified: true,
      ...(geometry.regions.some(region => region.rulesClassification.standableHorizontalSurface) ? {
        standableSurfacePolicy: "complete_base_and_rigid_sweep_inside_logical_surface_union_v1",
        nativeCellsNotExpandedIntoLegacyRimGrid: true,
        groundAccessOrHeightTransitionNotGrantedBySurface: true,
        wholeGroupElevatedSightNotCertified: true,
      } : {}),
    } : {}),
    ...(geometry.regions.some(region => region.semanticClass === "standable_high_ground"
      && region.cellResolutionMilliInches) ? {
      highSurfaceCellResolutions: geometry.regions.filter(region =>
        region.semanticClass === "standable_high_ground").map(region => ({
        regionId: region.regionId,
        cellResolutionMilliInches: region.cellResolutionMilliInches ?? CELL })),
    } : {}),
    gateMarginMilliInches: GATE_MARGIN_MILLI,
    pieceCounts, boardTerrainPieceCount: rows.length,
    accessPointCount: gateIndex.length,
    gateIndex,
    specialTerrainAgreementHash: agreement.agreementHash,
    roomStateFieldsReplaced: ["board.terrain", "board.specialTerrainAgreement",
      "board.accessPoints"],
    roomStateFieldsStaleAfterOverlay: [
      "officialBalancedTerrainSetupCertificate (old two-layer rectangular terrain)",
      "officialTerrainHeightTierLedger (unless marker layer recomputed)",
      "officialMissionMarkerPlacement (unless marker layer recomputed)",
      "board.battlefieldMapManifest.mapCompilationHash/mapRoomFreezeHash (old two-layer freeze)"],
    highGroundInteriorRepresentation:
      "height_tier_ledger_plus_model_elevation_not_board_pieces",
    impassableDerivationEncoding:
      "kernel_contract_adjacent_elevation_pair_without_access_point",
    integrationCandidateNotProductAcceptance: true,
    runtimePixelInferenceUsed: false,
    rulesTruth: "semantic_map_room_overlay_integration_candidate",
    trainingTruth: false,
  };
  const receipt = Object.freeze({ ...receiptBody,
    overlayHash: hashStarcraftTmgContract(receiptBody) });
  return { rows, agreement, ledgerRows, gateIndex, receipt };
}

// Deterministic marker-seam packing: re-segment ledger rows so every mission
// marker coordinate has exactly ONE containing support row. Only the row(s)
// beyond the lexicographically-first containing row are split around the
// marker point (x-direction; 0.001in strip excluded). Coverage elsewhere is
// unchanged; the excluded strip is recorded.
export function packSemanticMarkerSupportsV1(ledgerRows, markerTargets) {
  const rows = ledgerRows.map((row) => ({ ...row, footprint: { ...row.footprint } }));
  const packs = [];
  for (const marker of markerTargets || []) {
    const px = Number(marker.coordinate.x);
    const py = Number(marker.coordinate.y);
    const contains = (row) => px >= row.footprint.xMin && px <= row.footprint.xMax
      && py >= row.footprint.yMin && py <= row.footprint.yMax;
    const hits = rows.filter(contains)
      .sort((left, right) => left.terrainPieceId.localeCompare(right.terrainPieceId));
    if (hits.length <= 1) continue;
    const keepId = hits[0].terrainPieceId;
    for (const hit of hits.slice(1)) {
      const index = rows.indexOf(hit);
      const f = hit.footprint;
      const parts = [];
      if (px - 0.001 > f.xMin) {
        parts.push({ ...hit, terrainPieceId: `${hit.terrainPieceId}:pk-l`,
          footprint: { ...f, xMax: fixed(px - 0.001) } });
      }
      if (px + 0.001 < f.xMax) {
        parts.push({ ...hit, terrainPieceId: `${hit.terrainPieceId}:pk-r`,
          footprint: { ...f, xMin: fixed(px + 0.001) } });
      }
      rows.splice(index, 1, ...parts);
      packs.push({ markerNumber: marker.number, keptSupportTerrainPieceId: keepId,
        splitTerrainPieceId: hit.terrainPieceId,
        excludedStripWidthInches: parts.length === 2 ? 0.002
          : fixed(Math.min(0.001, px - f.xMin) + Math.min(0.001, f.xMax - px)) });
    }
  }
  return { rows, packs };
}

// Terrain view for the official spatial reachability audit embedded in the
// semantic terrain certificate (via the adapter's opt-in override):
//   - impassable regions: per-cell blockers (cell-accurate, never bounds);
//   - standable high ground: cells merged into maximal exact rectangles
//     (row runs merged vertically on identical x-spans — union equals the
//     cell set exactly, so blocking never over/under-covers), each carrying
//     the region's access points. A plateau marker's support is therefore a
//     real surface piece, not a 0.25in sliver;
//   - marker-seam merge: mission marker coordinates are integers in inches,
//     so they sit on 0.25in raster corners; when several standable pieces of
//     the SAME region contain the marker point, they are merged into one
//     (the plateau is one physical surface; the seam is a raster artifact).
//     A marker claimed by pieces of DIFFERENT regions fails loud;
//   - grass / size-1 cover are not movement blockers (audit contract).
function mergeCellsMaximalRects(cells) {
  // cells: milli rects on the 0.25in grid. Greedy exact 2D merge:
  // row-runs, then vertically merge runs with identical x-span.
  const rows = new Map();
  for (const cell of cells) {
    const key = `${cell.minYMilliInches}:${cell.maxYMilliInches}`;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(cell);
  }
  const runs = [];
  for (const [rowKey, rowCells] of [...rows.entries()].sort((a, b) => (
    Number(a[0].split(":")[0]) - Number(b[0].split(":")[0])))) {
    const sorted = rowCells.sort((a, b) => a.minXMilliInches - b.minXMilliInches);
    let start = sorted[0]; let previous = sorted[0];
    for (const cell of sorted.slice(1)) {
      if (cell.minXMilliInches !== previous.maxXMilliInches) {
        runs.push(milliRect(start.minXMilliInches, previous.maxXMilliInches,
          start.minYMilliInches, start.maxYMilliInches));
        start = cell;
      }
      previous = cell;
    }
    runs.push(milliRect(start.minXMilliInches, previous.maxXMilliInches,
      start.minYMilliInches, start.maxYMilliInches));
  }
  const merged = [];
  let current = runs[0] ? { ...runs[0] } : null;
  for (const run of runs.slice(1)) {
    if (current && run.minXMilliInches === current.minXMilliInches
      && run.maxXMilliInches === current.maxXMilliInches
      && run.minYMilliInches === current.maxYMilliInches) {
      current = { ...current, maxYMilliInches: run.maxYMilliInches };
    } else {
      merged.push(current); current = { ...run };
    }
  }
  if (current) merged.push(current);
  return merged;
}

export function semanticReachabilityTerrainViewV1(geometry, markers = [],
  maxTurningDiameterInches = 4.25, options = {}) {
  if (options.exactMarkerSupport === true) {
    // V2 target reachability searches real same-elevation legal centres near
    // the marker. It needs no synthetic rectangle containing marker centre:
    // use the exact high-ground pieces and leave the legacy merge unchanged.
    return semanticReachabilityTerrainViewV1(geometry, [],
      maxTurningDiameterInches);
  }
  const pieces = [];
  const agreedNativeProfile = geometry.classificationPolicy === "accepted_premade_per_group_v1"
    && geometry.sourcePixelCellGeometry?.policy === "original_art_integer_pixel_edges_v1";
  for (const region of geometry.regions) {
    const classification = region.rulesClassification;
    // Native ordinary_cover is a display class, not the legacy Size1
    // scatter preset. Forward explicit upright Size2+ profiles to the same
    // task blocker contract used by actual deployment, preserving every
    // source cell and its ordinary kind/Size rather than promoting it to
    // impassable or replacing its concave outline with a bounding box.
    const uprightNativeBlocker = agreedNativeProfile
      && classification.terrainKind === "ordinary" && classification.size >= 2
      && classification.standableHorizontalSurface !== true;
    if (classification.terrainKind === "impassable" || uprightNativeBlocker) {
      region.footprintCells.forEach((cell, index) => {
        pieces.push({ terrainPieceId: `${region.regionId}:blk-${index + 1}`,
          size: uprightNativeBlocker ? classification.size : Math.max(2, classification.size),
          terrainKind: classification.terrainKind,
          footprint: inchesRect(cell), standableHorizontalSurface: false,
          accessPoints: [] });
      });
      continue;
    }
    if (agreedNativeProfile && classification.standableHorizontalSurface === true) {
      region.footprintCells.forEach((cell, index) => pieces.push({
        terrainPieceId: `${region.regionId}:surface-${index + 1}`,
        size: classification.size, terrainKind: classification.terrainKind,
        footprint: inchesRect(cell), standableHorizontalSurface: true,
        groundLayerBlocked: true, accessPoints: [],
      }));
      continue;
    }
    if (region.semanticClass === "standable_high_ground") {
      const accessPoints = (region.accessPoints || []).map((accessPoint) => ({
        accessPointId: accessPoint.accessPointId,
        footprint: inchesRect(accessPoint.footprint),
        connects: [...accessPoint.connects],
        groundApproachPath: clone(accessPoint.groundApproachPath) }));
      mergeCellsMaximalRects(region.footprintCells).forEach((rect, index) => {
        pieces.push({ terrainPieceId: `${region.regionId}:hg-${index + 1}`,
          size: Math.max(3, classification.size), terrainKind: "ordinary",
          footprint: inchesRect(rect), standableHorizontalSurface: true,
          accessPoints: clone(accessPoints) });
      });
    }
    // grass / ordinary cover never block traversal (size < 2 or grass).
  }
  const TOL = 0.001;
  const containsPoint = (piece, x, y) => {
    const f = piece.footprint;
    const cx = Math.max(f.xMin, Math.min(x, f.xMax));
    const cy = Math.max(f.yMin, Math.min(y, f.yMax));
    return Math.hypot(x - cx, y - cy) <= TOL;
  };
  const minDim = (piece) => Math.min(piece.footprint.xMax - piece.footprint.xMin,
    piece.footprint.yMax - piece.footprint.yMin);
  const boundsOf = (group) => ({
    xMin: Math.min(...group.map((piece) => piece.footprint.xMin)),
    xMax: Math.max(...group.map((piece) => piece.footprint.xMax)),
    yMin: Math.min(...group.map((piece) => piece.footprint.yMin)),
    yMax: Math.max(...group.map((piece) => piece.footprint.yMax)),
  });
  const adjacent = (a, b) => a.footprint.xMin <= b.footprint.xMax + TOL
    && a.footprint.xMax >= b.footprint.xMin - TOL
    && a.footprint.yMin <= b.footprint.yMax + TOL
    && a.footprint.yMax >= b.footprint.yMin - TOL;
  const merges = [];
  for (const marker of markers) {
    const x = Number(marker.coordinate.x);
    const y = Number(marker.coordinate.y);
    const hits = pieces.filter((piece) => piece.standableHorizontalSurface
      && containsPoint(piece, x, y));
    if (hits.length === 0) continue;
    const regionIds = [...new Set(hits.map((piece) => (
      piece.terrainPieceId.split(":")[0])))];
    if (regionIds.length !== 1) {
      fail("SEMANTIC_ROOM_FREEZE_MARKER_SUPPORT_REGION_AMBIGUOUS",
        `${geometry.seedId}:marker-${marker.number}:${regionIds.join(",")}`);
    }
    // A single support already fat enough for the largest current base needs
    // no merge at all.
    if (hits.length === 1
      && minDim(hits[0]) >= maxTurningDiameterInches - TOL) continue;
    // The plateau is one physical surface: merge the marker's containing
    // piece(s) and BFS-fatten over adjacent same-region pieces until the
    // merged support fits the largest current base's turning diameter (the
    // audit skips standable supports thinner than that), or the region is
    // exhausted. The merged footprint is the exact group bounds; the merge is
    // recorded in the receipt.
    const regionPieces = pieces.filter((piece) => (
      piece.standableHorizontalSurface
      && piece.terrainPieceId.split(":")[0] === regionIds[0]));
    const group = [...hits];
    while (true) {
      const bounds = boundsOf(group);
      if (group.length > 1
        && Math.min(bounds.xMax - bounds.xMin, bounds.yMax - bounds.yMin)
          >= maxTurningDiameterInches - TOL) break;
      const next = regionPieces.find((piece) => !group.includes(piece)
        && group.some((member) => adjacent(member, piece)));
      if (!next) break;
      group.push(next);
    }
    const mergedId = `${regionIds[0]}:marker-support-${marker.number}`;
    const bounds = boundsOf(group);
    group.forEach((piece) => pieces.splice(pieces.indexOf(piece), 1));
    pieces.push({ terrainPieceId: mergedId, size: group[0].size,
      terrainKind: group[0].terrainKind, footprint: bounds,
      standableHorizontalSurface: true,
      accessPoints: clone(group[0].accessPoints) });
    merges.push({ markerNumber: marker.number, regionId: regionIds[0],
      mergedPieceIds: group.map((piece) => piece.terrainPieceId).sort(),
      mergedFootprint: bounds,
      mergedMinDimensionInches: fixed(Math.min(bounds.xMax - bounds.xMin,
        bounds.yMax - bounds.yMin)) });
  }
  return { pieces, markerSupportMerges: merges };
}

function missionQuarterTargets(battlefield) {
  return [["south_west", 0.25, 0.25], ["south_east", 0.75, 0.25],
    ["north_west", 0.25, 0.75], ["north_east", 0.75, 0.75]]
    .map(([quarter, x, y]) => ({ targetId: `mission-quarter-${quarter}`,
      targetKind: "mission_quarter", coordinate: {
        x: battlefield.widthInches * x, y: battlefield.heightInches * y },
      accessDistanceInches: 3 }));
}

export function certifyAndFreezeOfficialCompetitiveMapSemanticRoomV1(input = {}) {
  const compilation = input.compilation;
  const adapterCatalogue = input.adapterCatalogue;
  if (!object(compilation) || !adapterCatalogue) {
    fail("SEMANTIC_ROOM_FREEZE_INPUT_INVALID");
  }
  const roomId = String(input.roomId || "").trim();
  if (!roomId) fail("SEMANTIC_ROOM_FREEZE_ROOM_ID_REQUIRED");
  const { binding, geometry, overlay } = compileOfficialSemanticRoomTerrainInputV1(input.semanticTerrain);
  if (binding.seedId !== compilation.seedId) {
    fail("SEMANTIC_ROOM_FREEZE_BINDING_SEED_MISMATCH", binding.seedId);
  }
  const geometryBinding = input.deploymentGeometryBinding;
  verifyOfficialDeploymentGeometryBindingV1(geometryBinding,
    input.deploymentGeometryDataBundle);
  if (geometryBinding.battlefield.widthInches !== binding.battlefield.widthInches
    || geometryBinding.battlefield.heightInches !== binding.battlefield.heightInches) {
    fail("COMPETITIVE_MAP_ROOM_SCALE_MISMATCH");
  }
  const adapter = getOfficialCompetitiveMapTabletopAdapterV1(adapterCatalogue,
    compilation.seedId);

  // Marker layer: adapter cell-level ledger rows + deterministic seam
  // packing (every marker exactly one support) + official fail-closed
  // placement.
  const markers = geometryBinding.markerTargets || [];
  const packed = packSemanticMarkerSupportsV1(
    createOfficialSemanticHeightTierLedgerRowsV1(geometry), markers);
  const terrainHeightTierLedger = createOfficialTerrainHeightTierLedgerV1({
    deploymentGeometryBinding: geometryBinding, terrainPieces: packed.rows });
  const missionMarkerPlacement = finalizeOfficialMissionMarkerPlacementV1({
    deploymentGeometryBinding: geometryBinding,
    terrainHeightTierLedger });

  // Official spatial reachability + class separation + access topology via
  // the semantic terrain certificate (adapter, official_task_geometry
  // authority). Mission markers and entry edges are official and strict;
  // Legacy quarter probes are certification-harness point targets snapped
  // to nearby ground; a failed point probe does NOT prove the whole quarter
  // unreachable. The explicit whole_base_area_v1 policy below uses the real
  // scoring area and records reachable full-base witnesses instead.
  // Ticket 24 / Slice 254-R8-12 (additive opt-in, default byte-identical):
  // small-board maps whose nominal quarter point legitimately lands inside a
  // large authored impassable feature (e.g. Blue Storm's space void) may pin
  // a bounded `quarterProbeSnapLimitInches` (hard ceiling 6). The snap is
  // still recorded in `quarterProbeAdjustments`; official marker/entry audits
  // are unaffected.
  const quarterProbeSnapLimit = input.quarterProbeSnapLimitInches === undefined
    ? null
    : Number(input.quarterProbeSnapLimitInches);
  if (quarterProbeSnapLimit !== null
    && (!Number.isFinite(quarterProbeSnapLimit) || quarterProbeSnapLimit > 6)) {
    fail("SEMANTIC_ROOM_FREEZE_QUARTER_PROBE_SNAP_LIMIT_INVALID",
      String(input.quarterProbeSnapLimitInches));
  }
  // Native surfaces use the same exact union as physical Rules, not a
  // legacy raster-high approximation. Whole-quarter scoring is unchanged.
  const nativePremade = geometry.classificationPolicy === "accepted_premade_per_group_v1"
    && geometry.sourcePixelCellGeometry?.policy === "original_art_integer_pixel_edges_v1";
  const quarterTargetPolicy = input.semanticTerrain?.quarterTargetPolicy
    || (nativePremade ? "whole_base_area_v1" : "legacy_control_probe_v1");
  if (!["legacy_control_probe_v1", "whole_base_area_v1"].includes(quarterTargetPolicy)
    || quarterTargetPolicy === "whole_base_area_v1"
      && !nativePremade && ![SEMANTIC_ROOM_OVERLAY_EXACT_GATE_CELLS_V2,
        SEMANTIC_ROOM_OVERLAY_LOCAL_RAMP_CORRIDOR_V3]
        .includes(input.semanticTerrain?.overlayCompilerVersion)) {
    fail("SEMANTIC_ROOM_QUARTER_TARGET_POLICY_INVALID", quarterTargetPolicy);
  }
  const quarterProbes = missionQuarterTargets(geometryBinding.battlefield)
    .map((target) => {
      if (quarterTargetPolicy === "whole_base_area_v1") {
        const { widthInches: w, heightInches: h } = geometryBinding.battlefield;
        const xMin = target.coordinate.x < w / 2 ? 0 : w / 2;
        const yMin = target.coordinate.y < h / 2 ? 0 : h / 2;
        return { ...target, areaFootprint: { xMin, xMax: xMin + w / 2,
          yMin, yMax: yMin + h / 2 },
          originalCoordinate: clone(target.coordinate),
          snappedToNearestOpenGroundByInches: 0 };
      }
      const snapped = snapSemanticMapPreviewCoordinateV1(geometry,
        target.coordinate, { openRadiusInches: 0 }).coordinate;
      const snapDistanceInches = fixed(Math.hypot(
        snapped.x - target.coordinate.x, snapped.y - target.coordinate.y));
      const snapLimit = quarterProbeSnapLimit ?? target.accessDistanceInches;
      if (snapDistanceInches > snapLimit) {
        fail("SEMANTIC_ROOM_FREEZE_QUARTER_PROBE_UNREACHABLE",
          `${compilation.seedId}:${target.targetId}:${snapDistanceInches}`);
      }
      return { targetId: target.targetId, targetKind: target.targetKind,
        coordinate: snapped, accessDistanceInches: target.accessDistanceInches,
        originalCoordinate: clone(target.coordinate),
        snappedToNearestOpenGroundByInches: snapDistanceInches };
    });
  const exactHighReachability = nativePremade || [SEMANTIC_ROOM_OVERLAY_EXACT_GATE_CELLS_V2,
    SEMANTIC_ROOM_OVERLAY_LOCAL_RAMP_CORRIDOR_V3].includes(
    input.semanticTerrain?.overlayCompilerVersion);
  const terrainView = semanticReachabilityTerrainViewV1(geometry, markers,
    Math.max(...adapter.baseProfiles.map((profile) => {
      const widthMm = Number(profile.widthMm);
      const depthMm = Number(profile.depthMm ?? profile.widthMm);
      return (profile.shape === "round" ? Math.max(widthMm, depthMm)
        : Math.hypot(widthMm, depthMm)) / 25.4;
    })), { exactMarkerSupport: exactHighReachability });
  // Elevation portals from the compiled ramp gates: ground end = the
  // authored ground approach start; high end = the selected gate-piece centre.
  // The spatial audit still has to prove a legal centre on each side. Under
  // exact-cell partitioning, use the authored access width, not the thin
  // rectangle chosen to carry the access-point identity.
  const elevationPortals = overlay.gateIndex.flatMap((gate) => {
    if (gate.nativeRamp) {
      const incline = geometry.regions.find(region => region.regionId === gate.regionId);
      const port = incline.accessPoints.find(port => port.accessPointId === gate.accessPointId);
      const intersects = cell => cell.minXMilliInches <= port.footprint.maxXMilliInches
        && cell.maxXMilliInches >= port.footprint.minXMilliInches
        && cell.minYMilliInches <= port.footprint.maxYMilliInches
        && cell.maxYMilliInches >= port.footprint.minYMilliInches;
      const highRegions = gate.role === "top" ? geometry.regions.filter(region =>
        region.rulesClassification.heightTier === "high_ground"
        && region.rulesClassification.standableHorizontalSurface === true
        && region.footprintCells.some(intersects)) : [];
      if (gate.role === "top" && highRegions.length !== 1) {
        fail("SEMANTIC_ROOM_NATIVE_RAMP_TOP_ADJACENCY_INVALID", gate.accessPointId);
      }
      const coordinate = { x: fixed((port.footprint.minXMilliInches + port.footprint.maxXMilliInches) / 2000),
        y: fixed((port.footprint.minYMilliInches + port.footprint.maxYMilliInches) / 2000) };
      return [{ portalId: gate.accessPointId, regionId: gate.role === "base" ? incline.regionId : highRegions[0].regionId,
        fromRegionId: gate.role === "base" ? null : incline.regionId,
        toRegionId: gate.role === "base" ? incline.regionId : highRegions[0].regionId,
        groundCoordinate: coordinate, highCoordinate: coordinate,
        nativePortFootprint: clone(port.footprint),
        nativeTransitionCells: gate.role === "top" ? [...incline.footprintCells, ...highRegions[0].footprintCells] : null,
        widthInches: fixed(Math.max(port.footprint.maxXMilliInches - port.footprint.minXMilliInches,
          port.footprint.maxYMilliInches - port.footprint.minYMilliInches) / 1000) }];
    }
    return [{
    portalId: gate.accessPointId,
    regionId: gate.regionId,
    groundCoordinate: clone(gate.groundApproachPath[0]),
    highCoordinate: {
      x: fixed((gate.gateFootprint.xMin + gate.gateFootprint.xMax) / 2),
      y: fixed((gate.gateFootprint.yMin + gate.gateFootprint.yMax) / 2) },
    widthInches: gate.gateWidthMilliInches
      ? fixed(gate.gateWidthMilliInches / 1000)
      : fixed(Math.min(
        gate.gateFootprint.xMax - gate.gateFootprint.xMin,
        gate.gateFootprint.yMax - gate.gateFootprint.yMin)) }];
  });
  const semanticTerrainCertificate = certifyOfficialCompetitiveMapSemanticTerrainV1({
    binding, semanticRulesGeometry: geometry,
    auditAuthority: "official_task_geometry",
    exactSemanticReachability: exactHighReachability,
    physicalClearancePolicy: input.semanticTerrain?.physicalClearancePolicy
      || (nativePremade ? CANONICAL_ROUND_CLEARANCE_GRID250_V1 : undefined),
    baseProfiles: adapter.baseProfiles,
    entryEdgesBySide: geometryBinding.entryEdgesByPlayer,
    missionMarkers: markers,
    areaTargets: quarterProbes.map(({ targetId, targetKind, coordinate,
      accessDistanceInches, areaFootprint }) => ({ targetId, targetKind, coordinate,
      accessDistanceInches, ...(areaFootprint ? { areaFootprint } : {}) })),
    reachabilityTerrainPieces: terrainView.pieces,
    elevationPortals,
    reachabilityDiagnosticSink: input.reachabilityDiagnosticSink,
  }).certificate;
  verifyOfficialCompetitiveMapSemanticTerrainCertificateV1(
    semanticTerrainCertificate);
  const spatialReachabilityAudit =
    semanticTerrainCertificate.spatialReachabilityAudit;
  const previewPolicy = semanticTerrainCertificate.previewCertificationPolicy;
  // The V3 local gate is an opt-in authoring candidate. The coarse task graph
  // does not prove that a real base can clear each gate. A caller's path list
  // is only a proposal: re-run every gate in both directions against frozen
  // unit/base data and the official Special Terrain Rules before Room freeze.
  let semanticRampAdmission = null;
  if (input.semanticTerrain?.overlayCompilerVersion
    === SEMANTIC_ROOM_OVERLAY_LOCAL_RAMP_CORRIDOR_V3) {
    if (!input.semanticTerrain?.rampAdmissionRoutes || !input.dataset) {
      const error = new Error("SEMANTIC_ROOM_V3_RAMP_CLEARANCE_NOT_CERTIFIED");
      Object.defineProperty(error, "reachabilityAudit", {
        value: spatialReachabilityAudit, enumerable: false });
      throw error;
    }
    semanticRampAdmission = certifyOfficialSemanticRampAdmissionV1({
      binding, overlay, semanticTerrainCertificate,
      terrainHeightTierLedger, deploymentGeometryBinding: geometryBinding,
      dataset: input.dataset, modelGeometryBundle: input.modelGeometryBundle,
      terrainLosDataBundle: input.terrainLosDataBundle,
      candidateRoutes: input.semanticTerrain.rampAdmissionRoutes,
    });
  }

  // Room setup plan + terrainArtifacts in the exact shapes the factory
  // consumes (terrainBoardRows + board layers + evidence).
  const setupPlan = {
    schema: "starcraft_tmg_competitive_map_semantic_room_setup_plan_v1",
    planId: `semantic-room-terrain-${compilation.seedId}`,
    placementMethod: "premade_map_semantic_authoring",
    premadeMapId: compilation.seedId,
    physicalLayoutConfirmedByPlayerIds: clone(input.participantIds || []),
    placementHistory: [],
    terrainPieces: overlay.rows.map((row) => ({
      terrainPieceId: row.id, size: row.size, terrainKind: row.terrainKind,
      originalFootprint: clone(row.footprint), footprint: clone(row.footprint),
      heightTier: row.heightTier,
      standableHorizontalSurface: row.standableHorizontalSurface,
      openings: [],
      accessPoints: clone(row.accessPoints.map((entry) => ({
        accessPointId: entry.accessPointId, role: entry.role,
        footprint: clone(entry.footprint), connects: [...entry.connects],
        groundApproachPath: clone(entry.groundApproachPath) }))) })),
    size3PlusAvailable: overlay.rows.some((row) => row.size >= 3),
    quadrantManoeuvreLanes: [],
    fireLanes: [],
    balancedLayoutInvariants:
      "not_applicable_authored_map_terrain_see_semantic_certificate",
    rulesTruth: "official_semantic_map_room_setup_plan",
    trainingTruth: false,
  };
  const certificate = Object.freeze((() => {
    const body = {
      schema: "starcraft_tmg_competitive_map_semantic_room_terrain_certificate_v1",
      version: "1.0.0",
      deploymentGeometryBindingHash: geometryBinding.bindingHash,
      semanticBindingHash: binding.bindingHash,
      semanticRulesGeometryHash: geometry.semanticRulesGeometryHash,
      overlayHash: overlay.receipt.overlayHash,
      placementMethod: "premade_map_semantic_authoring",
      terrainPieces: overlay.rows.map((row) => ({
        terrainPieceId: row.id, size: row.size, terrainKind: row.terrainKind,
        originalFootprint: clone(row.footprint), footprint: clone(row.footprint),
        heightTier: row.heightTier,
        standableHorizontalSurface: row.standableHorizontalSurface,
        accessPointIds: row.accessPoints.map((entry) => entry.accessPointId) })),
      terrainPieceHashes: overlay.rows.map((row) => row.terrainHash),
      specialTerrainAgreementHash: overlay.agreement.agreementHash,
      semanticTerrainCertificateHash: semanticTerrainCertificate.certificateHash,
      terrainHeightTierLedgerHash: terrainHeightTierLedger.ledgerHash,
      missionMarkerPlacementHash: missionMarkerPlacement.placementHash,
      markerSupportPacks: packed.packs,
      markerSupportMerges: clone(terrainView.markerSupportMerges),
      balancedLayoutInvariantsNotApplicable:
        "alternating_placement_quadrant_distribution_centre_significant_fire_lanes"
        + "_apply_to_generic_premade_layouts_not_authored_map_terrain",
      completeTerrainDenominator: true,
      semanticTerrainCertified: true,
      clientSuppliedBalanceVerdictAccepted: false,
      sourceRefreshPerformed: false, repositoryFallbackUsed: false,
      rulesTruth: "official_semantic_map_room_terrain_certified",
      trainingTruth: false,
    };
    return { ...body, certificateHash: hashStarcraftTmgContract(body) };
  })());

  const terrainArtifacts = {
    certificate,
    terrainPieces: overlay.rows.map((row) => ({ ...createOfficialTerrainPieceV1({
      id: row.id, terrainKind: row.terrainKind, size: row.size,
      footprint: row.footprint,
      ...(row.footprintCells ? { footprintCells: clone(row.footprintCells) } : {}),
      standableHorizontalSurface: row.standableHorizontalSurface,
      openings: [] }),
    // Both room factories spread these runtime records into BoardRows. The
    // kernel factory intentionally drops composition metadata, so preserve
    // the setup-authored physical group here rather than losing it again.
    ...(row.terrainGroupId ? { terrainGroupId: row.terrainGroupId,
      terrainInstanceIds: clone(row.terrainInstanceIds), sourceRegionIds: clone(row.sourceRegionIds),
      semanticRegionId: row.semanticRegionId, semanticClass: row.semanticClass,
      overlayRole: row.overlayRole, blocksPlacement: row.blocksPlacement } : {}) })),
    specialTerrainAgreement: overlay.agreement,
    terrainHeightTierLedger,
    missionMarkerPlacement,
  };

  const freezeBody = {
    schema: OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ROOM_FREEZE_V1_SCHEMA,
    version: OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ROOM_FREEZE_V1_VERSION,
    roomId, seedId: compilation.seedId,
    engagementScale: compilation.engagementScale,
    compilationHash: compilation.compilationHash,
    adapterHash: compilation.adapterHash,
    deploymentGeometryBindingHash: geometryBinding.bindingHash,
    semanticBindingHash: binding.bindingHash,
    semanticRulesGeometryHash: geometry.semanticRulesGeometryHash,
    overlayReceipt: overlay.receipt,
    setupPlan, setupPlanHash: hashStarcraftTmgContract(setupPlan),
    semanticTerrainCertificate,
    semanticTerrainCertificateHash: semanticTerrainCertificate.certificateHash,
    ...(semanticRampAdmission ? { semanticRampAdmission,
      semanticRampAdmissionHash: semanticRampAdmission.admissionHash } : {}),
    missionSpatialReachabilityAudit: spatialReachabilityAudit,
    missionSpatialReachabilityAuditHash: spatialReachabilityAudit.auditHash,
    terrainHeightTierLedgerHash: terrainHeightTierLedger.ledgerHash,
    missionMarkerPlacementHash: missionMarkerPlacement.placementHash,
    // Certification policy (documented semantic-map contract, same as the
    // adapter certificate; v2 user ruling 2026-09-26): the five-chassis
    // entry matrix (`everyEntrySegmentUsable`) is a per-chassis DIAGNOSTIC,
    // honestly reported and never forced — physically narrower passages
    // stay false in the chassis matrix instead of being widened. The hard
    // legs are: every side enterable by at least one current base, every
    // marker and quarter reachable by at least one current base, and at
    // least one current base connecting opposing sides.
    everyEntrySegmentUsable: previewPolicy.everyBaseEntersBothSides,
    everySideEnterableByAtLeastOneCurrentBase:
      previewPolicy.everySideEnterableByAtLeastOneCurrentBase,
    everyMarkerAndQuarterReachableByAtLeastOneCurrentBase:
      previewPolicy.everyRequiredTargetReachableByAtLeastOneCurrentBase,
    opposingSidesConnectedByAtLeastOneCurrentBase:
      previewPolicy.opposingSidesConnectedByAtLeastOneCurrentBase,
    strictUniversalConnectivityForEveryCurrentBase:
      previewPolicy.strictUniversalConnectivityForEveryCurrentBase,
    strictAuditSpatialReachabilityCertified:
      spatialReachabilityAudit.spatialReachabilityCertified,
    chassisMatrix: clone(semanticTerrainCertificate.chassisMatrix),
    elevationPortalCount: elevationPortals.length,
    ...(spatialReachabilityAudit.physicalClearancePolicy ? {
      physicalClearancePolicy: spatialReachabilityAudit.physicalClearancePolicy } : {}),
    markerSupportMergesInAuditView: clone(terrainView.markerSupportMerges),
    ...(quarterTargetPolicy === "whole_base_area_v1" ? {
      quarterTargetPolicy, quarterAreaTargets: quarterProbes.map(probe => ({
        targetId: probe.targetId, areaFootprint: clone(probe.areaFootprint) })) } : {}),
    quarterProbeAdjustments: quarterProbes
      .filter((probe) => probe.snappedToNearestOpenGroundByInches > 0)
      .map((probe) => ({ targetId: probe.targetId,
        originalCoordinate: probe.originalCoordinate,
        snappedCoordinate: probe.coordinate,
        snappedToNearestOpenGroundByInches:
          probe.snappedToNearestOpenGroundByInches })),
    supersededTwoLayerFreezeCode:
      String(input.supersededTwoLayerFreezeCode || "") || null,
    artLayerVisibilityFrozen: true, rulesLayerFrozen: true,
    backgroundRulesAuthority: false, authoritativeTerrainLayer: true,
    mutationAfterRoomCreationAllowed: false,
    sourceRefreshPerformed: false,
    rulesTruth: "room_bound_semantic_map_terrain_certified",
    trainingTruth: false,
  };
  const freeze = freezeDeep({ ...freezeBody,
    roomFreezeHash: hashStarcraftTmgContract(freezeBody) });
  return { freeze, terrainArtifacts, setupPlan, overlay };
}

// One input seam shared by offline authoring and the actual Room freeze.
// A geometry binding does not contain per-piece agreement: forwarding that
// record and its complete source-instance mapping is mandatory when present.
// This function prepares geometry only; deployment/mission/adapter admission,
// lifecycle, Replay and Web remain responsibilities of the full freeze path.
export function compileOfficialSemanticRoomTerrainInputV1(semanticTerrain = {}) {
  const raw = semanticTerrain.binding;
  const binding = raw?.schema === "starcraft_tmg_official_competitive_map_semantic_geometry_v1"
    ? raw : createOfficialCompetitiveMapSemanticGeometryBindingV1(raw);
  verifyOfficialCompetitiveMapSemanticGeometryBindingV1(binding);
  const pinnedHash = String(semanticTerrain.bindingHash || "");
  if (pinnedHash && pinnedHash !== binding.bindingHash) {
    fail("SEMANTIC_ROOM_FREEZE_BINDING_HASH_MISMATCH", binding.seedId);
  }
  const geometry = compileOfficialCompetitiveMapSemanticRulesGeometryV1({ binding,
    ...(semanticTerrain.terrainAgreement !== undefined || semanticTerrain.terrainRegionInstances !== undefined
      ? { terrainAgreement: semanticTerrain.terrainAgreement,
        terrainRegionInstances: semanticTerrain.terrainRegionInstances } : {}) });
  const overlay = buildOfficialSemanticRoomTerrainOverlayV1({ binding, geometry,
    overlayCompilerVersion: semanticTerrain.overlayCompilerVersion });
  return { binding, geometry, overlay };
}

export function verifyOfficialCompetitiveMapSemanticRoomFreezeV1(freeze,
  input = {}) {
  if (!object(freeze)
    || freeze.schema !== OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ROOM_FREEZE_V1_SCHEMA
    || freeze.version !== OFFICIAL_COMPETITIVE_MAP_SEMANTIC_ROOM_FREEZE_V1_VERSION
    || freeze.roomFreezeHash !== hashStarcraftTmgContract(without(freeze,
      ["roomFreezeHash"]))
    || freeze.setupPlanHash !== hashStarcraftTmgContract(freeze.setupPlan)
    || freeze.backgroundRulesAuthority !== false
    || freeze.authoritativeTerrainLayer !== true
    || freeze.mutationAfterRoomCreationAllowed !== false
    || freeze.sourceRefreshPerformed !== false
    || freeze.trainingTruth !== false
    || freeze.missionSpatialReachabilityAuditHash
      !== freeze.missionSpatialReachabilityAudit?.auditHash
    // Semantic-map certification policy (v2, user ruling 2026-09-26):
    // legacy freezes carry everyEntrySegmentUsable === true (the old hard
    // leg); new freezes record it as the five-chassis diagnostic and prove
    // the corrected hard leg everySideEnterableByAtLeastOneCurrentBase.
    // Strict universal connectivity stays a reported field, never a
    // requirement.
    || !(freeze.everyEntrySegmentUsable === true
      || (typeof freeze.everyEntrySegmentUsable === "boolean"
        && freeze.everySideEnterableByAtLeastOneCurrentBase === true))
    || freeze.everyMarkerAndQuarterReachableByAtLeastOneCurrentBase !== true
    || freeze.opposingSidesConnectedByAtLeastOneCurrentBase !== true
    || freeze.strictAuditSpatialReachabilityCertified
      !== freeze.missionSpatialReachabilityAudit?.spatialReachabilityCertified
    || !Array.isArray(freeze.chassisMatrix)
    || freeze.chassisMatrix.length === 0
    || !Array.isArray(freeze.quarterProbeAdjustments)
    || freeze.semanticTerrainCertificateHash
      !== freeze.semanticTerrainCertificate?.certificateHash
    || (freeze.overlayReceipt?.overlayCompilerVersion
      === SEMANTIC_ROOM_OVERLAY_LOCAL_RAMP_CORRIDOR_V3
      && freeze.semanticRampAdmissionHash
        !== freeze.semanticRampAdmission?.admissionHash)
    || freeze.overlayReceipt?.overlayHash !== hashStarcraftTmgContract(
      without(freeze.overlayReceipt || {}, ["overlayHash"]))) {
    fail("SEMANTIC_ROOM_FREEZE_INVALID", String(freeze?.seedId || ""));
  }
  verifyOfficialCompetitiveMapSemanticTerrainCertificateV1(
    freeze.semanticTerrainCertificate);
  if (freeze.overlayReceipt?.overlayCompilerVersion
    === SEMANTIC_ROOM_OVERLAY_LOCAL_RAMP_CORRIDOR_V3) {
    verifyOfficialSemanticRampAdmissionV1(freeze.semanticRampAdmission,
      { bindingHash: freeze.semanticBindingHash });
    if (freeze.semanticRampAdmission.overlayHash
      !== freeze.overlayReceipt.overlayHash
      || freeze.semanticRampAdmission.semanticTerrainCertificateHash
        !== freeze.semanticTerrainCertificateHash
      || freeze.semanticRampAdmission.terrainHeightTierLedgerHash
        !== freeze.terrainHeightTierLedgerHash
      || freeze.semanticRampAdmission.deploymentGeometryBindingHash
        !== freeze.deploymentGeometryBindingHash) {
      fail("SEMANTIC_ROOM_RAMP_ADMISSION_BINDING_MISMATCH", freeze.seedId);
    }
  }
  if (input.deploymentGeometryBinding) {
    verifyOfficialDeploymentGeometryBindingV1(input.deploymentGeometryBinding,
      input.deploymentGeometryDataBundle);
    if (freeze.deploymentGeometryBindingHash
      !== input.deploymentGeometryBinding.bindingHash) {
      fail("SEMANTIC_ROOM_FREEZE_BINDING_MISMATCH", freeze.seedId);
    }
  }
  return true;
}
