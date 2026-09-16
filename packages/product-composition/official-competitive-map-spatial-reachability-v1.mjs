import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_SPATIAL_REACHABILITY_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_spatial_reachability_v1";

const GRID_STEP_INCHES = 0.5;
const CONTROL_DISTANCE_INCHES = 3;
const MILLIMETRES_PER_INCH = 25.4;
const TOLERANCE = 0.001;

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
function baseProfile(raw) {
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
  return { baseId, shape, widthMm, depthMm,
    turningDiameterInches: fixed(turningDiameterInches),
    clearanceRadiusInches: fixed(turningDiameterInches / 2),
    broadRadiusInches: fixed(Math.max(widthMm, depthMm)
      / MILLIMETRES_PER_INCH / 2) };
}
function blockingTerrain(rows) {
  return (rows || []).filter((entry) => entry?.size >= 2
    && entry?.terrainKind !== "grass").map((entry) => ({
    terrainPieceId: String(entry.terrainPieceId || ""),
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
function gridFor(battlefield, blockers, radius) {
  const xs = []; const ys = [];
  for (let value = radius; value <= battlefield.widthInches - radius + TOLERANCE;
    value += GRID_STEP_INCHES) xs.push(fixed(value));
  for (let value = radius; value <= battlefield.heightInches - radius + TOLERANCE;
    value += GRID_STEP_INCHES) ys.push(fixed(value));
  const inflated = blockers.map((entry) => ({ ...entry,
    footprint: expanded(entry.footprint, radius) }));
  const valid = new Set();
  for (let y = 0; y < ys.length; y += 1) {
    for (let x = 0; x < xs.length; x += 1) {
      const value = { x: xs[x], y: ys[y] };
      if (!inflated.some((entry) => pointRectangleDistance(value,
        entry.footprint) <= TOLERANCE)) valid.add(`${x}:${y}`);
    }
  }
  return { xs, ys, valid, inflated };
}
function entrySeeds(segment, grid, radius, battlefield) {
  const side = String(segment?.side || "");
  const start = Number(segment?.startInches);
  const end = Number(segment?.endInches);
  if (!["top", "bottom", "left", "right"].includes(side)
    || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    fail("COMPETITIVE_MAP_REACHABILITY_ENTRY_SEGMENT_INVALID");
  }
  const seeds = [];
  for (let y = 0; y < grid.ys.length; y += 1) {
    for (let x = 0; x < grid.xs.length; x += 1) {
      const key = `${x}:${y}`;
      if (!grid.valid.has(key)) continue;
      const value = { x: grid.xs[x], y: grid.ys[y] };
      const boundaryMatch = side === "bottom" ? Math.abs(value.y - radius) < TOLERANCE
        : side === "top"
          ? Math.abs(value.y - (battlefield.heightInches - radius))
            < GRID_STEP_INCHES + TOLERANCE
          : side === "left" ? Math.abs(value.x - radius) < TOLERANCE
            : Math.abs(value.x - (battlefield.widthInches - radius))
              < GRID_STEP_INCHES + TOLERANCE;
      const along = ["top", "bottom"].includes(side) ? value.x : value.y;
      if (boundaryMatch && along >= start + radius - TOLERANCE
        && along <= end - radius + TOLERANCE) seeds.push(key);
    }
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
function traverse(grid, seedKeys) {
  const distanceByKey = new Map();
  const queue = [];
  for (const key of seedKeys) if (grid.valid.has(key) && !distanceByKey.has(key)) {
    distanceByKey.set(key, 0); queue.push(key);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const key = queue[cursor];
    const [x, y] = key.split(":").map(Number);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const next = `${x + dx}:${y + dy}`;
      if (grid.valid.has(next) && !distanceByKey.has(next)) {
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
  return { targetId, targetKind, coordinate, accessDistanceInches };
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
            + GRID_STEP_INCHES + TOLERANCE) continue;
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
      approximateRouteLengthInches: fixed(best.steps * GRID_STEP_INCHES),
      maximumFootprintDistanceInches: fixed(target.accessDistanceInches),
      accessMode: accessMode || "same_elevation_ground_approach",
      accessPointId: best.accessPointId || null,
    } : null,
  }; });
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
  const profiles = (input.baseProfiles || []).map(baseProfile);
  if (profiles.length === 0
    || new Set(profiles.map((entry) => entry.baseId)).size !== profiles.length) {
    fail("COMPETITIVE_MAP_REACHABILITY_BASE_DENOMINATOR_INVALID", seedId);
  }
  const blockers = blockingTerrain(input.terrainPieces);
  const markerTargets = (input.missionMarkers || []).map(markerTarget);
  const areaTargets = (input.areaTargets || []).map(areaTarget);
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
  const baseProfileAudits = profiles.map((profile) => {
    const grid = gridFor(battlefield, blockers, profile.clearanceRadiusInches);
    const seedsBySide = {};
    const segmentAuditsBySide = {};
    for (const sideId of sideIds) {
      const edge = edgeEntries.find(([id]) => id === sideId)?.[1];
      if (edge) {
        const rows = (edge.segments || []).map((segment) => {
          const seeds = entrySeeds(segment, grid, profile.clearanceRadiusInches,
            battlefield);
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
      [sideId, traverse(grid, seedsBySide[sideId])]
    )));
    const sideAudits = sideIds.map((sideId) => {
      const opponentId = sideIds.find((entry) => entry !== sideId);
      const traversal = traversalBySide[sideId];
      const opponentEntryReachable = seedsBySide[opponentId].some((key) => (
        traversal.has(key)));
      const targetAudits = targetAccessAudits(targets, traversal, grid,
        blockers, profile);
      const segmentAudits = segmentAuditsBySide[sideId];
      return { sideId, legalEntryWitnessCount: seedsBySide[sideId].length,
        entrySegments: segmentAudits,
        everyEntrySegmentUsable: segmentAudits.length === 0
          ? seedsBySide[sideId].length > 0
          : segmentAudits.every((entry) => entry.usable),
        opponentEntryReachable, targetAudits,
        allRequiredTargetsReachable: targetAudits.every((entry) => entry.reachable),
        reachableGridPointCount: traversal.size };
    });
    return { baseId: profile.baseId,
      clearanceRadiusInches: profile.clearanceRadiusInches,
      turningDiameterInches: profile.turningDiameterInches,
      sideAudits,
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
    version: "1.0.0", seedId, auditAuthority,
    battlefield: clone(battlefield), gridStepInches: GRID_STEP_INCHES,
    controlDistanceInches: CONTROL_DISTANCE_INCHES,
    baseProfileIds: profiles.map((entry) => entry.baseId),
    blockingTerrainPieceIds: blockers.map((entry) => entry.terrainPieceId).sort(),
    sideIds, targetIds: targets.map((entry) => entry.targetId),
    baseProfileAudits, targetReachabilityBySide,
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
    || audit.version !== "1.0.0"
    || audit.auditHash !== hashStarcraftTmgContract(without(audit, ["auditHash"]))
    || audit.sideIds?.length !== 2 || audit.baseProfileIds?.length < 1
    || audit.baseProfileAudits?.length !== audit.baseProfileIds.length
    || audit.sourcePixelsUsedAsRulesGeometry !== false
    || audit.trainingTruth !== false) {
    fail("COMPETITIVE_MAP_REACHABILITY_AUDIT_INVALID");
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
