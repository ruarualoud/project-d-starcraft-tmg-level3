import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialPhysicalFootprintV1 } from
  "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { createOfficialRectangleUnionCoverageV1 } from
  "../rule-atoms/official-footprint-rectangle-union-geometry-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_SPATIAL_REACHABILITY_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_spatial_reachability_v1";

const GRID_STEP_INCHES = 0.5;
const EXACT_HIGH_CELL_MILLI = 250;
const CONTROL_DISTANCE_INCHES = 3;
const MILLIMETRES_PER_INCH = 25.4;
const TOLERANCE = 0.001;
export const CANONICAL_ROUND_CLEARANCE_GRID250_V1 =
  "canonical_round_or_circumcircle_grid250_v1";
const PHYSICAL_CLEARANCE_MARGIN_INCHES = 0.01;

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
function point(value, code) {
  const x = Number(value?.x ?? value?.xInches);
  const y = Number(value?.y ?? value?.yInches);
  if (!Number.isFinite(x) || !Number.isFinite(y)) fail(code);
  return { x: fixed(x), y: fixed(y) };
}
function baseProfile(raw, canonical = false) {
  const baseId = String(raw?.baseId || "").trim();
  const widthMm = Number(raw?.widthMm);
  const depthMm = Number(raw?.depthMm);
  const shape = String(raw?.shape || "");
  if (!baseId || !["round", "rectangle"].includes(shape)
    || !Number.isFinite(widthMm) || widthMm <= 0
    || !Number.isFinite(depthMm) || depthMm <= 0) {
    fail("COMPETITIVE_MAP_REACHABILITY_BASE_PROFILE_INVALID", baseId);
  }
  const turningDiameterInches = Number.isFinite(Number(raw.inPlaceTurnInches))
    ? Number(raw.inPlaceTurnInches)
    : (shape === "round" ? Math.max(widthMm, depthMm)
      : Math.hypot(widthMm, depthMm)) / MILLIMETRES_PER_INCH;
  if (canonical) {
    const width = Math.round(widthMm / MILLIMETRES_PER_INCH * 1000);
    const depth = Math.round(depthMm / MILLIMETRES_PER_INCH * 1000);
    const footprint = createOfficialPhysicalFootprintV1({ objectId: baseId,
      shape, widthMilliInches: width, depthMilliInches: depth,
      center: { xMilliInches: 0, yMilliInches: 0 } });
    // Rectangles retain a conservative rotation-independent envelope. This
    // is not a claim that every rectangular orientation fits that passage.
    const radius = shape === "round" ? footprint.radiusMilliInches
      : Math.ceil(Math.max(Math.hypot(width, depth) / 2,
        turningDiameterInches * 500));
    return { baseId, shape, widthMm, depthMm,
      turningDiameterInches: radius * 2 / 1000,
      clearanceRadiusInches: radius / 1000,
      broadRadiusInches: Math.ceil(Math.max(width, depth) / 2) / 1000 };
  }
  return { baseId, shape, widthMm, depthMm,
    turningDiameterInches: fixed(turningDiameterInches),
    clearanceRadiusInches: fixed(turningDiameterInches / 2),
    broadRadiusInches: fixed(Math.max(widthMm, depthMm)
      / MILLIMETRES_PER_INCH / 2) };
}
function blockingTerrain(rows) {
  return (rows || []).filter((entry) => (entry?.size >= 2 || entry?.groundLayerBlocked === true)
    && entry?.terrainKind !== "grass").map((entry) => ({
    terrainPieceId: String(entry.terrainPieceId || ""),
    terrainKind: String(entry.terrainKind || ""),
    footprint: { xMin: Number(entry.footprint?.xMin),
      xMax: Number(entry.footprint?.xMax), yMin: Number(entry.footprint?.yMin),
      yMax: Number(entry.footprint?.yMax) },
    standableHorizontalSurface: entry.standableHorizontalSurface === true,
    accessPoints: clone(entry.accessPoints || []),
  }));
}
function pointRectangleDistance(value, rect) {
  const x = Math.max(rect.xMin, Math.min(value.x, rect.xMax));
  const y = Math.max(rect.yMin, Math.min(value.y, rect.yMax));
  return Math.hypot(value.x - x, value.y - y);
}
function pointSegmentDistance(value, start, end) {
  const dx = end.x - start.x; const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(value.x - start.x, value.y - start.y);
  const ratio = Math.max(0, Math.min(1, ((value.x - start.x) * dx
    + (value.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(value.x - (start.x + ratio * dx),
    value.y - (start.y + ratio * dy));
}
function segmentIntersectsRectangle(start, end, rect) {
  const dx = end.x - start.x; const dy = end.y - start.y;
  let minimum = 0; let maximum = 1;
  for (const [direction, offset] of [
    [-dx, start.x - rect.xMin], [dx, rect.xMax - start.x],
    [-dy, start.y - rect.yMin], [dy, rect.yMax - start.y],
  ]) {
    if (direction === 0) { if (offset < 0) return false; continue; }
    const ratio = offset / direction;
    if (direction < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return maximum >= 0 && minimum <= 1;
}
function segmentRectangleDistance(start, end, rect) {
  if (segmentIntersectsRectangle(start, end, rect)) return 0;
  const corners = [{ x: rect.xMin, y: rect.yMin },
    { x: rect.xMax, y: rect.yMin }, { x: rect.xMax, y: rect.yMax },
    { x: rect.xMin, y: rect.yMax }];
  return Math.min(pointRectangleDistance(start, rect),
    pointRectangleDistance(end, rect),
    ...corners.map((entry) => pointSegmentDistance(entry, start, end)));
}
function expanded(rect, radius) {
  return { xMin: rect.xMin - radius, xMax: rect.xMax + radius,
    yMin: rect.yMin - radius, yMax: rect.yMax + radius };
}
function exactHighRegionIndexes(rows = []) {
  return rows.map((region) => {
    const regionId = String(region?.regionId || "");
    if (!regionId || !Array.isArray(region.footprintCells)
      || region.footprintCells.length === 0) {
      fail("COMPETITIVE_MAP_REACHABILITY_HIGH_REGION_INVALID", regionId);
    }
    const cellStep = region.cellResolutionMilliInches ?? EXACT_HIGH_CELL_MILLI;
    if (region.nativeSourcePixelGeometryPolicy === "original_art_integer_pixel_edges_v1" && cellStep === 1) {
      const coverage = createOfficialRectangleUnionCoverageV1(region.footprintCells);
      const bounds = { xMin: Math.min(...region.footprintCells.map(r => r.minXMilliInches)) / 1000,
        xMax: Math.max(...region.footprintCells.map(r => r.maxXMilliInches)) / 1000,
        yMin: Math.min(...region.footprintCells.map(r => r.minYMilliInches)) / 1000,
        yMax: Math.max(...region.footprintCells.map(r => r.maxYMilliInches)) / 1000 };
      const contains = value => region.footprintCells.some(r => value.x * 1000 >= r.minXMilliInches
        && value.x * 1000 <= r.maxXMilliInches && value.y * 1000 >= r.minYMilliInches
        && value.y * 1000 <= r.maxYMilliInches);
      const coversSweep = (start, end, radius) => coverage.coversBases([start,end].map(value =>
        createOfficialPhysicalFootprintV1({ objectId: "native-clearance-probe", shape: "round", kind: "model_base",
          center: { xMilliInches: Math.round(value.x * 1000), yMilliInches: Math.round(value.y * 1000) },
          widthMilliInches: Math.ceil(radius * 2000), depthMilliInches: Math.ceil(radius * 2000) })));
      return { regionId, boundary: [], contains, containsInclusive: contains, bounds, coversSweep,
        nativeSurface: true, elevation: region.elevation };
    }
    if (![125, EXACT_HIGH_CELL_MILLI].includes(cellStep)
      || region.footprintCells.some(rect => [rect.minXMilliInches,
        rect.maxXMilliInches, rect.minYMilliInches, rect.maxYMilliInches]
        .some(value => !Number.isSafeInteger(value) || value % cellStep !== 0))) {
      fail("COMPETITIVE_MAP_REACHABILITY_HIGH_CELL_RESOLUTION_INVALID", regionId);
    }
    const cells = new Set();
    for (const rect of region.footprintCells) {
      for (let x = rect.minXMilliInches; x < rect.maxXMilliInches;
        x += cellStep) {
        for (let y = rect.minYMilliInches; y < rect.maxYMilliInches;
          y += cellStep) {
          cells.add(`${x / cellStep}:${y / cellStep}`);
        }
      }
    }
    const boundary = [];
    for (const key of cells) {
      const [column, row] = key.split(":").map(Number);
      const x = column * cellStep / 1000;
      const y = row * cellStep / 1000;
      const step = cellStep / 1000;
      if (!cells.has(`${column - 1}:${row}`)) {
        boundary.push([{ x, y }, { x, y: y + step }]);
      }
      if (!cells.has(`${column + 1}:${row}`)) {
        boundary.push([{ x: x + step, y }, { x: x + step, y: y + step }]);
      }
      if (!cells.has(`${column}:${row - 1}`)) {
        boundary.push([{ x, y }, { x: x + step, y }]);
      }
      if (!cells.has(`${column}:${row + 1}`)) {
        boundary.push([{ x, y: y + step }, { x: x + step, y: y + step }]);
      }
    }
    const contains = (value) => cells.has(
      `${Math.floor(value.x * 1000 / cellStep)}:${Math.floor(
        value.y * 1000 / cellStep)}`);
    const containsInclusive = (value) => [
      [-0.000001, -0.000001], [-0.000001, 0.000001],
      [0.000001, -0.000001], [0.000001, 0.000001],
    ].some(([dx, dy]) => contains({ x: value.x + dx, y: value.y + dy }));
    const bounds = { xMin: Math.min(...region.footprintCells.map(r => r.minXMilliInches)) / 1000,
      xMax: Math.max(...region.footprintCells.map(r => r.maxXMilliInches)) / 1000,
      yMin: Math.min(...region.footprintCells.map(r => r.minYMilliInches)) / 1000,
      yMax: Math.max(...region.footprintCells.map(r => r.maxYMilliInches)) / 1000 };
    return { regionId, cells, boundary, contains, containsInclusive, bounds };
  });
}
// Broad phase only; exact distance remains the verdict. The finer opt-in
// grid must not turn each neighbour into a full terrain scan.
function nearbyRectangles(rows, margin) {
  const bins = new Map(), binSize = 2;
  for (const row of rows) {
    const rect = expanded(row.footprint, margin);
    for (let x = Math.floor(rect.xMin / binSize); x <= Math.floor(rect.xMax / binSize); x++) {
      for (let y = Math.floor(rect.yMin / binSize); y <= Math.floor(rect.yMax / binSize); y++) {
        const key = `${x}:${y}`;
        if (!bins.has(key)) bins.set(key, []);
        bins.get(key).push(row);
      }
    }
  }
  return (start, end = start) => {
    const found = new Set();
    for (let x = Math.floor(Math.min(start.x, end.x) / binSize);
      x <= Math.floor(Math.max(start.x, end.x) / binSize); x++) {
      for (let y = Math.floor(Math.min(start.y, end.y) / binSize);
        y <= Math.floor(Math.max(start.y, end.y) / binSize); y++) {
        for (const row of bins.get(`${x}:${y}`) || []) found.add(row);
      }
    }
    return [...found];
  };
}
function gridFor(battlefield, blockers, radius, exactHighRegions = null,
  canonical = false) {
  const step = canonical ? 0.25 : GRID_STEP_INCHES;
  const clearance = radius + PHYSICAL_CLEARANCE_MARGIN_INCHES;
  const nearby = canonical ? nearbyRectangles(blockers, clearance) : null;
  const xs = []; const ys = [];
  for (let value = radius; value <= battlefield.widthInches - radius + TOLERANCE;
    value += step) xs.push(fixed(value));
  for (let value = radius; value <= battlefield.heightInches - radius + TOLERANCE;
    value += step) ys.push(fixed(value));
  const inflated = blockers.map((entry) => ({ ...entry,
    footprint: expanded(entry.footprint, radius) }));
  const valid = new Set();
  // Ticket 24 / Slice 254-R8-11 (opt-in elevation portals): standable
  // high-ground surfaces are walkable once reached through a portal, so the
  // audit tracks them as a separate per-region high layer. Ground validity
  // is unchanged: high-layer cells are still excluded from `valid`.
  const highByKey = new Map();
  for (let y = 0; y < ys.length; y += 1) {
    for (let x = 0; x < xs.length; x += 1) {
      const value = { x: xs[x], y: ys[y] };
      const key = `${x}:${y}`;
      let blocked = false;
      for (const entry of canonical ? nearby(value) : inflated) {
        if (pointRectangleDistance(value, entry.footprint)
          > (canonical ? clearance : TOLERANCE)) continue;
        blocked = true;
        if (!exactHighRegions && entry.standableHorizontalSurface
          && pointRectangleDistance(value, entry.footprint) <= TOLERANCE) {
          highByKey.set(key, entry.terrainPieceId.split(":")[0]);
        }
        break;
      }
      if (!blocked) valid.add(key);
    }
  }
  if (exactHighRegions) {
    const impassable = inflated.filter((entry) => (
      entry.terrainKind === "impassable"));
    for (let y = 0; y < ys.length; y += 1) {
      for (let x = 0; x < xs.length; x += 1) {
        const value = { x: xs[x], y: ys[y] };
        const key = `${x}:${y}`;
        for (const region of exactHighRegions) {
          if (canonical && pointRectangleDistance(value, region.bounds) > 0) continue;
          if (!region.contains(value)) continue;
          if (region.nativeSurface ? !region.coversSweep(value, value, canonical ? clearance : radius)
            : region.boundary.some(([start, end]) => (
            pointSegmentDistance(value, start, end)
              < (canonical ? clearance : radius - TOLERANCE)))) continue;
          if ((canonical ? nearby(value).filter(entry => entry.terrainKind === "impassable"
            || region.nativeSurface && !entry.standableHorizontalSurface)
            : impassable).some((entry) => (
            pointRectangleDistance(value, entry.footprint)
              <= (canonical ? clearance : TOLERANCE)))) continue;
          if (highByKey.has(key)) {
            fail("COMPETITIVE_MAP_REACHABILITY_HIGH_REGION_OVERLAP", key);
          }
          highByKey.set(key, region.regionId);
          valid.delete(key);
        }
      }
    }
  }
  const sweptEdgeClear = canonical ? (key, next) => {
    const [x, y] = key.split(":").map(Number);
    const [nx, ny] = next.split(":").map(Number);
    const start = { x: xs[x], y: ys[y] }, end = { x: xs[nx], y: ys[ny] };
    const highId = highByKey.get(key);
    const surface = highId ? exactHighRegions.find(row => row.regionId === highId) : null;
    if (nearby(start, end).some(entry => (!highId || entry.terrainKind === "impassable"
      || surface?.nativeSurface && !entry.standableHorizontalSurface)
      && segmentRectangleDistance(start, end, entry.footprint) <= clearance)) return false;
    if (highId) {
      const region = surface;
      if (region.nativeSurface ? !region.coversSweep(start, end, clearance)
        : region.boundary.some(([a, b]) => segmentRectangleDistance(start, end, {
        xMin: Math.min(a.x, b.x), xMax: Math.max(a.x, b.x),
        yMin: Math.min(a.y, b.y), yMax: Math.max(a.y, b.y) }) < clearance)) return false;
    }
    return true;
  } : null;
  const elevationByRegion = new Map((exactHighRegions || []).map(region => [region.regionId, region.elevation || "high"]));
  return { xs, ys, valid, inflated, highByKey, step, sweptEdgeClear, clearanceRadiusInches: clearance, elevationByRegion };
}
// Elevation portals connect the ground layer to a region's high layer at the
// certified ramp gate (Rules truth: elevation changes only through access
// points). Resolved per base-profile grid; an unresolvable portal is simply
// unusable and recorded, never invented.
function resolveElevationPortals(portals, grid) {
  const nearest = (coordinate, keys) => {
    let best = null;
    for (const key of keys) {
      const [x, y] = key.split(":").map(Number);
      const d = Math.hypot(grid.xs[x] - coordinate.x, grid.ys[y] - coordinate.y);
      if (!best || d < best.distance) best = { key, distance: d };
    }
    return best;
  };
  return portals.map((portal) => {
    const radius = Math.max(0, Number(portal.widthInches || 0)) / 2
      + grid.step + TOLERANCE;
    const regionHighKeys = [...grid.highByKey.entries()]
      .filter(([, regionId]) => regionId === (portal.toRegionId || portal.regionId))
      .map(([key]) => key);
    // The ramp approach may start on ANOTHER region's high layer (stacked
    // decks, e.g. Andromeda temple ramps). It must never resolve to the same
    // high region that this ramp is supposed to make accessible: that would
    // create a high-to-high self-loop while falsely calling the ramp usable.
    const ground = nearest(portal.groundCoordinate,
      portal.nativePortFootprint ? portal.fromRegionId ? [...grid.highByKey.entries()]
        .filter(([,id]) => id === portal.fromRegionId).map(([key]) => key) : [...grid.valid]
      : [...grid.valid, ...[...grid.highByKey.entries()]
        .filter(([, regionId]) => regionId !== portal.regionId)
        .map(([key]) => key)]);
    const high = nearest(portal.highCoordinate, regionHighKeys);
    let usable = Boolean(ground && high
      && ground.distance <= radius && high.distance <= radius);
    if (usable && portal.nativePortFootprint) {
      const at = key => { const [x,y] = key.split(":").map(Number); return { x:grid.xs[x],y:grid.ys[y] }; };
      const from = at(ground.key), to = at(high.key), p = portal.nativePortFootprint;
      const rect = { xMin:p.minXMilliInches/1000,xMax:p.maxXMilliInches/1000,
        yMin:p.minYMilliInches/1000,yMax:p.maxYMilliInches/1000 };
      usable = segmentIntersectsRectangle(from,to,rect);
      if (usable && portal.nativeTransitionCells) usable = createOfficialRectangleUnionCoverageV1(portal.nativeTransitionCells)
        .coversBases([from,to].map(value => createOfficialPhysicalFootprintV1({ objectId:"native-portal-clearance-probe",
          kind:"model_base",shape:"round",center:{xMilliInches:Math.round(value.x*1000),yMilliInches:Math.round(value.y*1000)},
          widthMilliInches:Math.ceil(grid.clearanceRadiusInches*2000),depthMilliInches:Math.ceil(grid.clearanceRadiusInches*2000) })));
      if (usable) usable = !grid.inflated.some(entry => !entry.standableHorizontalSurface
        && segmentIntersectsRectangle(from,to,entry.footprint));
    }
    return { portalId: portal.portalId, regionId: portal.regionId,
      usable, groundKey: usable ? ground.key : null,
      highKey: usable ? high.key : null,
      groundSnapInches: ground ? fixed(ground.distance) : null,
      highSnapInches: high ? fixed(high.distance) : null };
  });
}
function entrySeeds(segment, grid, radius, battlefield, includeHigh = false) {
  const side = String(segment?.side || "");
  const start = Number(segment?.startInches);
  const end = Number(segment?.endInches);
  if (!["top", "bottom", "left", "right"].includes(side)
    || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    fail("COMPETITIVE_MAP_REACHABILITY_ENTRY_SEGMENT_INVALID");
  }
  // R8-11 elevation mode (only when portals are declared): deployment entry
  // may land on either layer at the table edge — a deck that reaches the
  // edge is a legal entry surface.
  const seedLayers = includeHigh
    ? [...grid.valid, ...grid.highByKey.keys()] : [...grid.valid];
  const seeds = [];
  for (const key of seedLayers) {
    const [x, y] = key.split(":").map(Number);
    const value = { x: grid.xs[x], y: grid.ys[y] };
    const boundaryMatch = side === "bottom" ? Math.abs(value.y - radius) < TOLERANCE
      : side === "top"
        ? Math.abs(value.y - (battlefield.heightInches - radius))
          < grid.step + TOLERANCE
        : side === "left" ? Math.abs(value.x - radius) < TOLERANCE
          : Math.abs(value.x - (battlefield.widthInches - radius))
            < grid.step + TOLERANCE;
    const along = ["top", "bottom"].includes(side) ? value.x : value.y;
    if (boundaryMatch && along >= start + radius - TOLERANCE
      && along <= end - radius + TOLERANCE) seeds.push(key);
  }
  return seeds;
}
function anchorSeeds(anchor, grid, radiusInches = CONTROL_DISTANCE_INCHES) {
  const value = point(anchor, "COMPETITIVE_MAP_REACHABILITY_ANCHOR_INVALID");
  return [...grid.valid].filter((key) => {
    const [x, y] = key.split(":").map(Number);
    return Math.hypot(grid.xs[x] - value.x, grid.ys[y] - value.y)
      <= radiusInches + TOLERANCE;
  });
}
function traverse(grid, seedKeys, portalEdges = []) {
  const portalFrom = new Map();
  for (const edge of portalEdges) {
    if (!portalFrom.has(edge.groundKey)) portalFrom.set(edge.groundKey, []);
    if (!portalFrom.has(edge.highKey)) portalFrom.set(edge.highKey, []);
    portalFrom.get(edge.groundKey).push(edge.highKey);
    portalFrom.get(edge.highKey).push(edge.groundKey);
  }
  const walkable = (key) => grid.valid.has(key) || grid.highByKey?.has(key);
  const distanceByKey = new Map();
  const queue = [];
  for (const key of seedKeys) if (walkable(key) && !distanceByKey.has(key)) {
    distanceByKey.set(key, 0); queue.push(key);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const key = queue[cursor];
    const [x, y] = key.split(":").map(Number);
    const neighbours = [];
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const next = `${x + dx}:${y + dy}`;
      // Same-layer step: ground↔ground, or high↔high within ONE region
      // (adjacent regions still meet at a cliff).
      if (grid.valid.has(key) && grid.valid.has(next)
        && (!grid.sweptEdgeClear || grid.sweptEdgeClear(key, next))) neighbours.push(next);
      else if (grid.highByKey?.has(key) && grid.highByKey?.has(next)
        && grid.highByKey.get(key) === grid.highByKey.get(next)
        && (!grid.sweptEdgeClear || grid.sweptEdgeClear(key, next))) {
        neighbours.push(next);
      }
    }
    for (const other of portalFrom.get(key) || []) neighbours.push(other);
    for (const next of neighbours) {
      if (walkable(next) && !distanceByKey.has(next)) {
        distanceByKey.set(next, distanceByKey.get(key) + 1); queue.push(next);
      }
    }
  }
  return distanceByKey;
}
function markerTarget(raw) {
  const coordinate = point(raw?.coordinate || raw,
    "COMPETITIVE_MAP_REACHABILITY_TARGET_INVALID");
  const diameterInches = Number(raw?.diameterInches ?? 32 / MILLIMETRES_PER_INCH);
  const targetId = String(raw?.targetId || `mission-marker-${raw?.number || ""}`);
  if (!targetId || !Number.isFinite(diameterInches) || diameterInches <= 0) {
    fail("COMPETITIVE_MAP_REACHABILITY_TARGET_INVALID", targetId);
  }
  return { targetId, targetKind: "mission_marker", coordinate,
    accessDistanceInches: CONTROL_DISTANCE_INCHES + diameterInches / 2,
    missionMarkerNumber: Number(raw?.number), diameterInches: fixed(diameterInches) };
}
function areaTarget(raw) {
  const targetId = String(raw?.targetId || "").trim();
  const targetKind = String(raw?.targetKind || "control_area");
  const coordinate = point(raw?.coordinate || raw,
    "COMPETITIVE_MAP_REACHABILITY_TARGET_INVALID");
  const accessDistanceInches = Number(raw?.accessDistanceInches
    ?? CONTROL_DISTANCE_INCHES);
  if (!targetId || !Number.isFinite(accessDistanceInches)
    || accessDistanceInches <= 0) {
    fail("COMPETITIVE_MAP_REACHABILITY_TARGET_INVALID", targetId);
  }
  const area = raw?.areaFootprint;
  if (area && (targetKind !== "mission_quarter"
    || ![area.xMin, area.xMax, area.yMin, area.yMax].every(Number.isFinite)
    || area.xMin >= area.xMax || area.yMin >= area.yMax)) {
    fail("COMPETITIVE_MAP_REACHABILITY_AREA_FOOTPRINT_INVALID", targetId);
  }
  return { targetId, targetKind, coordinate, accessDistanceInches,
    ...(area ? { areaFootprint: clone(area) } : {}) };
}
function targetAccessAudits(targets, traversal, grid, blockers, profile) {
  const rows = targets.map((target) => {
    const targetSupports = blockers.filter((entry) => (
      pointRectangleDistance(target.coordinate, entry.footprint) <= TOLERANCE
    ));
    return { target, targetSupports, best: null, accessMode: null };
  });
  const open = rows.filter((entry) => entry.targetSupports.length === 0);
  for (const [key, steps] of traversal) {
    const separator = key.indexOf(":");
    const x = Number(key.slice(0, separator));
    const y = Number(key.slice(separator + 1));
    const coordinate = { x: grid.xs[x], y: grid.ys[y] };
    for (const row of open) {
      if (row.best && steps >= row.best.steps) continue;
      const maximumDistance = row.target.accessDistanceInches
        + profile.broadRadiusInches;
      if (Math.hypot(coordinate.x - row.target.coordinate.x,
        coordinate.y - row.target.coordinate.y) > maximumDistance + TOLERANCE) continue;
      if (blockers.some((entry) => segmentRectangleDistance(coordinate,
        row.target.coordinate, entry.footprint) <= TOLERANCE)) continue;
      row.best = { steps, coordinate };
    }
  }
  for (const row of rows.filter((entry) => entry.targetSupports.length === 1
    && entry.targetSupports[0].standableHorizontalSurface)) {
    const support = row.targetSupports[0];
    const width = support.footprint.xMax - support.footprint.xMin;
    const height = support.footprint.yMax - support.footprint.yMin;
    if (Math.min(width, height) + TOLERANCE < profile.turningDiameterInches) continue;
    for (const accessPoint of support.accessPoints) {
      const approach = accessPoint?.groundApproachPath?.[0];
      if (!approach) continue;
      const approachPoint = point(approach,
        "COMPETITIVE_MAP_REACHABILITY_ACCESS_POINT_INVALID");
      for (const [key, steps] of traversal) {
        if (row.best && steps >= row.best.steps) continue;
        const separator = key.indexOf(":");
        const x = Number(key.slice(0, separator));
        const y = Number(key.slice(separator + 1));
        const coordinate = { x: grid.xs[x], y: grid.ys[y] };
        if (Math.hypot(coordinate.x - approachPoint.x,
          coordinate.y - approachPoint.y) > profile.broadRadiusInches
            + grid.step + TOLERANCE) continue;
        if (blockers.some((entry) => entry.terrainPieceId !== support.terrainPieceId
          && segmentRectangleDistance(coordinate, approachPoint,
            entry.footprint) <= TOLERANCE)) continue;
        row.best = { steps, coordinate, accessPointId: accessPoint.accessPointId };
        row.accessMode = "standable_high_ground_access";
      }
    }
  }
  return rows.map(({ target, targetSupports, best, accessMode }) => {
    const ordinaryBlockers = targetSupports.filter((entry) => (
      !entry.standableHorizontalSurface));
    const ambiguousSupport = targetSupports.length > 1;
    const reachable = Boolean(best) && ordinaryBlockers.length === 0
      && !ambiguousSupport;
    const failureCode = reachable ? null
      : ordinaryBlockers.length > 0 ? "target_overlaps_blocking_terrain"
        : ambiguousSupport ? "target_support_ambiguous"
          : targetSupports.length === 1
            ? "high_ground_access_or_platform_clearance_unavailable"
            : "no_reachable_control_witness";
    return {
    targetId: target.targetId, targetKind: target.targetKind,
    reachable, failureCode,
    supportTerrainPieceId: reachable && targetSupports.length === 1
      ? targetSupports[0].terrainPieceId : null,
    blockingTerrainPieceIds: reachable ? []
      : targetSupports.map((entry) => entry.terrainPieceId).sort(),
    witness: reachable ? {
      coordinate: best.coordinate,
      approximateRouteLengthInches: fixed(best.steps * grid.step),
      maximumFootprintDistanceInches: fixed(target.accessDistanceInches),
      accessMode: accessMode || "same_elevation_ground_approach",
      accessPointId: best.accessPointId || null,
    } : null,
  }; });
}

function targetAccessAuditsExactV2(targets, traversal, grid, blockers,
  profile, exactHighRegions) {
  return targets.map((target) => {
    // Official quarter scoring tests the whole base within the quarter,
    // not range or sight to an arbitrary centre point. The circumscribed
    // radius remains conservative for rectangular bases; it never invents
    // entry or a traversable node. Old point targets retain their path.
    if (target.areaFootprint) {
      const area = target.areaFootprint, radius = profile.clearanceRadiusInches;
      let best = null;
      for (const [key, steps] of traversal) {
        if (best && steps >= best.steps) continue;
        if (!grid.valid.has(key) && !grid.highByKey.has(key)) continue;
        const [x, y] = key.split(":").map(Number);
        const coordinate = { x: grid.xs[x], y: grid.ys[y] };
        if (coordinate.x - radius < area.xMin - TOLERANCE
          || coordinate.x + radius > area.xMax + TOLERANCE
          || coordinate.y - radius < area.yMin - TOLERANCE
          || coordinate.y + radius > area.yMax + TOLERANCE) continue;
        best = { coordinate, steps, elevation: grid.highByKey.has(key)
          ? grid.elevationByRegion.get(grid.highByKey.get(key)) || "high" : "ground", supportRegionId: grid.highByKey.get(key) || null };
      }
      return { targetId: target.targetId, targetKind: target.targetKind,
        areaFootprint: clone(area), reachable: Boolean(best),
        failureCode: best ? null : "no_reachable_whole_base_in_quarter",
        supportTerrainPieceId: null, blockingTerrainPieceIds: [],
        witness: best ? { coordinate: best.coordinate,
          approximateRouteLengthInches: fixed(best.steps * grid.step),
          accessMode: "whole_base_quarter_area", accessPointId: null,
          elevation: best.elevation, supportRegionId: best.supportRegionId } : null };
    }
    const highHits = target.targetKind === "mission_marker"
      ? exactHighRegions.filter((region) => (
        region.containsInclusive(target.coordinate))) : [];
    if (highHits.length > 1) {
      fail("COMPETITIVE_MAP_REACHABILITY_MARKER_HIGH_REGION_AMBIGUOUS",
        target.targetId);
    }
    const highRegion = highHits[0] || null;
    const obstructing = blockers.filter((entry) => (
      !highRegion || !entry.standableHorizontalSurface
        || !entry.terrainPieceId.startsWith(`${highRegion.regionId}:`)));
    let best = null;
    for (const [key, steps] of traversal) {
      if (best && steps >= best.steps) continue;
      if (highRegion
        ? grid.highByKey.get(key) !== highRegion.regionId
        : !grid.valid.has(key)) continue;
      const [x, y] = key.split(":").map(Number);
      const coordinate = { x: grid.xs[x], y: grid.ys[y] };
      if (Math.hypot(coordinate.x - target.coordinate.x,
        coordinate.y - target.coordinate.y) > target.accessDistanceInches
          + profile.broadRadiusInches + TOLERANCE) continue;
      if (highRegion) {
        const distance = Math.hypot(coordinate.x - target.coordinate.x,
          coordinate.y - target.coordinate.y);
        const samples = Math.max(1, Math.ceil(distance / 0.125));
        let inside = true;
        for (let index = 0; index < samples; index += 1) {
          const ratio = index / samples;
          if (!highRegion.contains({ x: coordinate.x
            + (target.coordinate.x - coordinate.x) * ratio,
          y: coordinate.y + (target.coordinate.y - coordinate.y) * ratio })) {
            inside = false; break;
          }
        }
        if (!inside) continue;
      }
      if (obstructing.some((entry) => (
        segmentRectangleDistance(coordinate, target.coordinate,
          entry.footprint) <= TOLERANCE))) continue;
      best = { steps, coordinate };
    }
    const reachable = Boolean(best);
    return { targetId: target.targetId, targetKind: target.targetKind,
      reachable,
      failureCode: reachable ? null
        : "no_reachable_same_elevation_control_witness",
      supportTerrainPieceId: null,
      blockingTerrainPieceIds: [],
      ...(highRegion ? { supportRegionId: highRegion.regionId } : {}),
      witness: reachable ? {
        coordinate: best.coordinate,
        approximateRouteLengthInches: fixed(best.steps * grid.step),
        maximumFootprintDistanceInches: fixed(target.accessDistanceInches),
        accessMode: highRegion ? highRegion.elevation === "mid"
          ? "same_elevation_mid_ground_control" : "same_elevation_high_ground_control"
          : "same_elevation_ground_approach",
        accessPointId: null,
      } : null };
  });
}

export function auditOfficialCompetitiveMapSpatialReachabilityV1(input = {}) {
  const seedId = String(input.seedId || "").trim();
  const battlefield = { widthInches: Number(input.battlefield?.widthInches),
    heightInches: Number(input.battlefield?.heightInches) };
  const auditAuthority = String(input.auditAuthority || "");
  if (!seedId || !Number.isFinite(battlefield.widthInches)
    || !Number.isFinite(battlefield.heightInches)
    || battlefield.widthInches <= 0 || battlefield.heightInches <= 0
    || !["official_task_geometry", "map_topology_preview"].includes(auditAuthority)) {
    fail("COMPETITIVE_MAP_REACHABILITY_INPUT_INVALID", seedId);
  }
  const canonical = input.physicalClearancePolicy !== undefined;
  if (canonical && (input.physicalClearancePolicy !== CANONICAL_ROUND_CLEARANCE_GRID250_V1
    || input.exactSemanticTargets !== true)) {
    fail("COMPETITIVE_MAP_REACHABILITY_PHYSICAL_CLEARANCE_POLICY_INVALID");
  }
  const profiles = (input.baseProfiles || []).map(raw => baseProfile(raw, canonical));
  if (profiles.length === 0
    || new Set(profiles.map((entry) => entry.baseId)).size !== profiles.length) {
    fail("COMPETITIVE_MAP_REACHABILITY_BASE_DENOMINATOR_INVALID", seedId);
  }
  const blockers = blockingTerrain(input.terrainPieces);
  const exactHighRegions = input.exactSemanticTargets === true
    ? exactHighRegionIndexes(input.exactHighGroundRegions) : null;
  const markerTargets = (input.missionMarkers || []).map(markerTarget);
  const areaTargets = (input.areaTargets || []).map(areaTarget);
  for (const target of areaTargets.filter(target => target.areaFootprint)) {
    const area = target.areaFootprint;
    if (!exactHighRegions || area.xMin < 0 || area.yMin < 0
      || area.xMax > battlefield.widthInches || area.yMax > battlefield.heightInches) {
      fail("COMPETITIVE_MAP_REACHABILITY_AREA_BOUNDS_INVALID", target.targetId);
    }
  }
  const targets = [...markerTargets, ...areaTargets];
  if (new Set(targets.map((entry) => entry.targetId)).size !== targets.length) {
    fail("COMPETITIVE_MAP_REACHABILITY_TARGET_DENOMINATOR_INVALID", seedId);
  }
  const edgeEntries = object(input.entryEdgesBySide)
    ? Object.entries(input.entryEdgesBySide).sort(([left], [right]) => (
      left.localeCompare(right))) : [];
  const anchorEntries = object(input.entryAnchorsBySide)
    ? Object.entries(input.entryAnchorsBySide).sort(([left], [right]) => (
      left.localeCompare(right))) : [];
  const sideIds = [...new Set([...edgeEntries.map(([sideId]) => sideId),
    ...anchorEntries.map(([sideId]) => sideId)])].sort();
  if (sideIds.length !== 2 || (edgeEntries.length > 0 && anchorEntries.length > 0)) {
    fail("COMPETITIVE_MAP_REACHABILITY_SIDE_DENOMINATOR_INVALID", seedId);
  }
  // Ticket 24 / Slice 254-R8-11 (opt-in; absent = byte-identical behaviour):
  // elevation portals connect the ground layer to a standable region's high
  // layer at certified ramp gates, mirroring the Rules truth that elevation
  // changes only through access points.
  const portals = (input.elevationPortals || []).map((portal) => {
    const portalId = String(portal?.portalId || "").trim();
    const regionId = String(portal?.regionId || "").trim();
    const groundCoordinate = point(portal?.groundCoordinate,
      "COMPETITIVE_MAP_REACHABILITY_PORTAL_INVALID");
    const highCoordinate = point(portal?.highCoordinate,
      "COMPETITIVE_MAP_REACHABILITY_PORTAL_INVALID");
    const widthInches = Number(portal?.widthInches);
    if (!portalId || !regionId || !Number.isFinite(widthInches)
      || widthInches <= 0) {
      fail("COMPETITIVE_MAP_REACHABILITY_PORTAL_INVALID", portalId);
    }
    return { portalId, regionId, groundCoordinate, highCoordinate,
      ...(portal.nativePortFootprint ? { fromRegionId: portal.fromRegionId, toRegionId: portal.toRegionId,
        nativePortFootprint: clone(portal.nativePortFootprint), nativeTransitionCells: clone(portal.nativeTransitionCells) } : {}),
      widthInches };
  });
  const baseProfileAudits = profiles.map((profile) => {
    const grid = gridFor(battlefield, blockers, profile.clearanceRadiusInches,
      exactHighRegions, canonical);
    const portalAudits = portals.length
      ? resolveElevationPortals(portals, grid) : [];
    const portalEdges = portalAudits.filter((entry) => entry.usable)
      .map((entry) => ({ groundKey: entry.groundKey, highKey: entry.highKey }));
    const seedsBySide = {};
    const segmentAuditsBySide = {};
    for (const sideId of sideIds) {
      const edge = edgeEntries.find(([id]) => id === sideId)?.[1];
      if (edge) {
        const rows = (edge.segments || []).map((segment) => {
          const seeds = entrySeeds(segment, grid, profile.clearanceRadiusInches,
            battlefield, portals.length > 0);
          return { segmentId: String(segment.segmentId || ""), side: segment.side,
            legalEntryWitnessCount: seeds.length, usable: seeds.length > 0, seeds };
        });
        segmentAuditsBySide[sideId] = rows.map(({ seeds, ...entry }) => entry);
        seedsBySide[sideId] = [...new Set(rows.flatMap((entry) => entry.seeds))];
      } else {
        const anchor = anchorEntries.find(([id]) => id === sideId)?.[1];
        seedsBySide[sideId] = anchorSeeds(anchor, grid);
        segmentAuditsBySide[sideId] = [];
      }
    }
    const traversalBySide = Object.fromEntries(sideIds.map((sideId) => (
      [sideId, traverse(grid, seedsBySide[sideId], portalEdges)]
    )));
    if (typeof input.diagnosticSink === "function") {
      const snappedPoint = (key) => {
        if (!key) return null;
        const [x, y] = key.split(":").map(Number);
        return { x: grid.xs[x], y: grid.ys[y] };
      };
      input.diagnosticSink({
        baseId: profile.baseId,
        sides: sideIds.map((sideId) => ({ sideId,
          // Observability only: these candidates never enter the audit body
          // or override targetAccessAudits. Show why an already reachable
          // centre near a fixed target was discarded instead of reporting
          // only a target name. No work when diagnosticSink is absent.
          targetProximity: targets.map((target) => {
            const targetHigh = target.targetKind === "mission_marker"
              ? exactHighRegions?.find(region =>
                region.containsInclusive(target.coordinate)) : null;
            const maximumDistance = target.accessDistanceInches
              + profile.broadRadiusInches;
            const candidates = [];
            for (const [key, steps] of traversalBySide[sideId]) {
              if (targetHigh ? grid.highByKey.get(key) !== targetHigh.regionId
                : !grid.valid.has(key)) continue;
              const coordinate = snappedPoint(key);
              const centreDistanceInches = Math.hypot(
                coordinate.x - target.coordinate.x,
                coordinate.y - target.coordinate.y);
              candidates.push({ coordinate, steps,
                centreDistanceInches: fixed(centreDistanceInches),
                layer: targetHigh ? `high:${targetHigh.regionId}` : "ground",
              });
            }
            candidates.sort((a, b) => a.centreDistanceInches
              - b.centreDistanceInches || a.steps - b.steps);
            const localUnreachable = [];
            const localKeys = targetHigh
              ? [...grid.highByKey].filter(([, id]) => id === targetHigh.regionId)
                .map(([key]) => key) : grid.valid;
            for (const key of localKeys) {
              if (traversalBySide[sideId].has(key)) continue;
              const coordinate = snappedPoint(key);
              const distance = Math.hypot(coordinate.x - target.coordinate.x,
                coordinate.y - target.coordinate.y);
              if (distance <= maximumDistance + TOLERANCE) {
                localUnreachable.push({ coordinate,
                  centreDistanceInches: fixed(distance) });
              }
            }
            localUnreachable.sort((a, b) => a.centreDistanceInches
              - b.centreDistanceInches);
            const withIntersections = candidate => ({ ...candidate,
              intersectedTerrainPieceIds: blockers.filter(entry =>
                segmentRectangleDistance(candidate.coordinate,
                  target.coordinate, entry.footprint) <= TOLERANCE)
                .map(entry => entry.terrainPieceId) });
            const inRange = candidates.filter(candidate =>
              candidate.centreDistanceInches <= maximumDistance + TOLERANCE);
            return { targetId: target.targetId,
              coordinate: clone(target.coordinate),
              maximumCentreDistanceInches: fixed(maximumDistance),
              reachableCentreWithinControlRangeCount: inRange.length,
              nearestCandidates: inRange.slice(0, 8).map(withIntersections),
              nearestReachableCentres: candidates.slice(0, 8)
                .map(withIntersections),
              locallyValidUnreachableCentreCount: localUnreachable.length,
              nearestLocallyValidUnreachableCentres: localUnreachable.slice(0, 8),
            };
          }),
          ...(input.includeDiagnosticGrid === true ? {
            gridEvidence: {
              reachableGroundCentres: [...traversalBySide[sideId].keys()]
                .filter(key => grid.valid.has(key)).map(snappedPoint),
              unreachableGroundCentres: [...grid.valid]
                .filter(key => !traversalBySide[sideId].has(key))
                .map(snappedPoint),
            },
          } : {}),
          portals: portalAudits.map((portal) => ({
            portalId: portal.portalId, regionId: portal.regionId,
            usable: portal.usable,
            groundSnapInches: portal.groundSnapInches,
            highSnapInches: portal.highSnapInches,
            groundSnappedCoordinate: snappedPoint(portal.groundKey),
            highSnappedCoordinate: snappedPoint(portal.highKey),
            groundSnappedLayer: portal.groundKey
              ? grid.valid.has(portal.groundKey) ? "ground"
                : `${grid.elevationByRegion.get(grid.highByKey.get(portal.groundKey)) || "high"}:${grid.highByKey.get(portal.groundKey)}`
              : null,
            groundReached: portal.groundKey
              ? traversalBySide[sideId].has(portal.groundKey) : false,
            highReached: portal.highKey
              ? traversalBySide[sideId].has(portal.highKey) : false,
          })),
        })),
      });
    }
    const sideAudits = sideIds.map((sideId) => {
      const opponentId = sideIds.find((entry) => entry !== sideId);
      const traversal = traversalBySide[sideId];
      const opponentEntryReachable = seedsBySide[opponentId].some((key) => (
        traversal.has(key)));
      const targetAudits = exactHighRegions
        ? targetAccessAuditsExactV2(targets, traversal, grid,
          blockers, profile, exactHighRegions)
        : targetAccessAudits(targets, traversal, grid, blockers, profile);
      const segmentAudits = segmentAuditsBySide[sideId];
      return { sideId, legalEntryWitnessCount: seedsBySide[sideId].length,
        entrySegments: segmentAudits,
        everyEntrySegmentUsable: segmentAudits.length === 0
          ? seedsBySide[sideId].length > 0
          : segmentAudits.every((entry) => entry.usable),
        opponentEntryReachable, targetAudits,
        ...(exactHighRegions?.some(region => region.nativeSurface) ? {
          reachableNativeSurfaceRegionIds: [...new Set([...traversal.keys()].map(key => grid.highByKey.get(key)).filter(Boolean))].sort(),
        } : {}),
        allRequiredTargetsReachable: targetAudits.every((entry) => entry.reachable),
        reachableGridPointCount: traversal.size };
    });
    return { baseId: profile.baseId,
      clearanceRadiusInches: profile.clearanceRadiusInches,
      turningDiameterInches: profile.turningDiameterInches,
      sideAudits,
      ...(portals.length ? { elevationPortalAudits: portalAudits } : {}),
      allSidesCanEnter: sideAudits.every((entry) => entry.everyEntrySegmentUsable),
      opposingSidesConnected: sideAudits.every((entry) => entry.opponentEntryReachable),
      allRequiredTargetsReachable: sideAudits.every((entry) => (
        entry.allRequiredTargetsReachable)),
      reachable: sideAudits.every((entry) => entry.everyEntrySegmentUsable
        && entry.opponentEntryReachable && entry.allRequiredTargetsReachable) };
  });
  const targetReachabilityBySide = sideIds.map((sideId) => ({ sideId,
    targets: targets.map((target) => {
      const reachableBaseProfileIds = baseProfileAudits.filter((base) => (
        base.sideAudits.find((entry) => entry.sideId === sideId)?.targetAudits
          ?.find((entry) => entry.targetId === target.targetId)?.reachable === true
      )).map((entry) => entry.baseId);
      return { targetId: target.targetId, targetKind: target.targetKind,
        reachableBaseProfileIds,
        reachableByAtLeastOneCurrentBase: reachableBaseProfileIds.length > 0 };
    }) }));
  const everyTargetReachableByAtLeastOneCurrentBase = targetReachabilityBySide
    .every((entry) => entry.targets.every((target) => (
      target.reachableByAtLeastOneCurrentBase)));
  const body = { schema: OFFICIAL_COMPETITIVE_MAP_SPATIAL_REACHABILITY_V1_SCHEMA,
    version: canonical ? "2.2.0" : exactHighRegions ? areaTargets.some(target => target.areaFootprint)
      ? "2.1.0" : "2.0.0" : "1.0.0", seedId, auditAuthority,
    ...(canonical ? { physicalClearancePolicy: CANONICAL_ROUND_CLEARANCE_GRID250_V1,
      physicalClearanceMarginInches: PHYSICAL_CLEARANCE_MARGIN_INCHES,
      sweptSameLayerEdgesChecked: true,
      rectangleClearancePolicy: "conservative_rotation_independent_circumcircle" } : {}),
    ...(exactHighRegions ? {
      targetAuditPolicy: "reachable_same_elevation_exact_high_cells_v2",
      highRegionIds: exactHighRegions.map((entry) => entry.regionId),
      ...(areaTargets.some(target => target.areaFootprint) ? {
        quarterTargetPolicy: "whole_base_area_v1" } : {}),
    } : {}),
    battlefield: clone(battlefield), gridStepInches: canonical ? 0.25 : GRID_STEP_INCHES,
    controlDistanceInches: CONTROL_DISTANCE_INCHES,
    baseProfileIds: profiles.map((entry) => entry.baseId),
    blockingTerrainPieceIds: blockers.map((entry) => entry.terrainPieceId).sort(),
    sideIds, targetIds: targets.map((entry) => entry.targetId),
    baseProfileAudits, targetReachabilityBySide,
    ...(portals.length ? { elevationPortalCount: portals.length,
      elevationPortalsUsableForEveryBase: baseProfileAudits.every((entry) => (
        (entry.elevationPortalAudits || []).every((portal) => portal.usable))) }
      : {}),
    everyEntrySegmentUsable: baseProfileAudits.every((entry) => (
      entry.allSidesCanEnter)),
    opposingSidesConnectedForEveryCurrentBase: baseProfileAudits.every((entry) => (
      entry.opposingSidesConnected)),
    everyRequiredTargetReachableForEveryCurrentBase: baseProfileAudits.every((entry) => (
      entry.allRequiredTargetsReachable)),
    everyRequiredTargetReachableByAtLeastOneCurrentBase:
      everyTargetReachableByAtLeastOneCurrentBase,
    spatialReachabilityCertified: baseProfileAudits.every((entry) => (
      entry.allSidesCanEnter && entry.opposingSidesConnected))
      && everyTargetReachableByAtLeastOneCurrentBase,
    sourcePixelsUsedAsRulesGeometry: false,
    rulesTruth: auditAuthority === "official_task_geometry"
      ? "official_task_geometry_reachability_audit"
      : "map_topology_preview_reachability_audit",
    trainingTruth: false };
  return deepFreeze({ ...body, auditHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialCompetitiveMapSpatialReachabilityV1(audit) {
  if (!object(audit)
    || audit.schema !== OFFICIAL_COMPETITIVE_MAP_SPATIAL_REACHABILITY_V1_SCHEMA
    || !["1.0.0", "2.0.0", "2.1.0", "2.2.0"].includes(audit.version)
    || (["2.0.0", "2.1.0", "2.2.0"].includes(audit.version)
      && audit.targetAuditPolicy
        !== "reachable_same_elevation_exact_high_cells_v2")
    || audit.auditHash !== hashStarcraftTmgContract(without(audit, ["auditHash"]))
    || audit.sideIds?.length !== 2 || audit.baseProfileIds?.length < 1
    || audit.baseProfileAudits?.length !== audit.baseProfileIds.length
    || audit.sourcePixelsUsedAsRulesGeometry !== false
    || audit.trainingTruth !== false) {
    fail("COMPETITIVE_MAP_REACHABILITY_AUDIT_INVALID");
  }
  if (audit.version === "2.2.0" && (
    audit.physicalClearancePolicy !== CANONICAL_ROUND_CLEARANCE_GRID250_V1
    || audit.gridStepInches !== 0.25
    || audit.physicalClearanceMarginInches !== PHYSICAL_CLEARANCE_MARGIN_INCHES
    || audit.sweptSameLayerEdgesChecked !== true
    || audit.rectangleClearancePolicy !== "conservative_rotation_independent_circumcircle")) {
    fail("COMPETITIVE_MAP_REACHABILITY_PHYSICAL_CLEARANCE_POLICY_INVALID");
  }
  if (audit.version === "2.1.0" || audit.version === "2.2.0"
    && audit.quarterTargetPolicy === "whole_base_area_v1") {
    if (audit.quarterTargetPolicy !== "whole_base_area_v1") {
      fail("COMPETITIVE_MAP_REACHABILITY_AREA_POLICY_INVALID");
    }
    for (const base of audit.baseProfileAudits) {
      for (const side of base.sideAudits) {
        const quarters = side.targetAudits.filter(target =>
          target.targetKind === "mission_quarter");
        if (!quarters.length || quarters.some(target => {
          const a = target.areaFootprint, w = target.witness;
          if (!a || ![a.xMin, a.xMax, a.yMin, a.yMax].every(Number.isFinite)
            || a.xMin < 0 || a.yMin < 0 || a.xMax > audit.battlefield.widthInches
            || a.yMax > audit.battlefield.heightInches
            || a.xMin >= a.xMax || a.yMin >= a.yMax) return true;
          if (!target.reachable) return w !== null;
          const radius = base.clearanceRadiusInches;
          return !w || w.accessMode !== "whole_base_quarter_area"
            || ![w.coordinate?.x, w.coordinate?.y].every(Number.isFinite)
            || w.coordinate.x - radius < a.xMin - TOLERANCE
            || w.coordinate.x + radius > a.xMax + TOLERANCE
            || w.coordinate.y - radius < a.yMin - TOLERANCE
            || w.coordinate.y + radius > a.yMax + TOLERANCE;
        })) fail("COMPETITIVE_MAP_REACHABILITY_AREA_WITNESS_INVALID", side.sideId);
      }
    }
  }
  const derivedTargetAccess = audit.targetReachabilityBySide?.every((entry) => (
    entry.targets?.every((target) => target.reachableByAtLeastOneCurrentBase)));
  const derived = audit.baseProfileAudits.every((entry) => (
    entry.allSidesCanEnter && entry.opposingSidesConnected)) && derivedTargetAccess;
  if (audit.spatialReachabilityCertified !== derived
    || audit.everyEntrySegmentUsable !== audit.baseProfileAudits.every((entry) => (
      entry.allSidesCanEnter))
    || audit.opposingSidesConnectedForEveryCurrentBase
      !== audit.baseProfileAudits.every((entry) => entry.opposingSidesConnected)
    || audit.everyRequiredTargetReachableForEveryCurrentBase
      !== audit.baseProfileAudits.every((entry) => entry.allRequiredTargetsReachable)
    || audit.everyRequiredTargetReachableByAtLeastOneCurrentBase
      !== derivedTargetAccess) {
    fail("COMPETITIVE_MAP_REACHABILITY_AUDIT_DERIVATION_INVALID", audit.seedId);
  }
  return true;
}
