import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";

export const OFFICIAL_TERRAIN_LOS_RULES_KERNEL_SCHEMA =
  "starcraft_tmg_official_terrain_los_rules_kernel_v1";
export const OFFICIAL_TERRAIN_LOS_RULES_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_TERRAIN_PIECE_SCHEMA =
  "starcraft_tmg_official_terrain_piece_v1";

const TOLERANCE = 1;
const INCH = 1000;
const CLOSE_QUARTERS_RANGE = 3000;

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
function point(value, code = "TERRAIN_LOS_POINT_INVALID", detail = "") {
  const xMilliInches = Number(value?.xMilliInches);
  const yMilliInches = Number(value?.yMilliInches);
  if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches)) {
    fail(code, detail);
  }
  return { xMilliInches, yMilliInches };
}
function milli(value, code = "TERRAIN_LOS_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}
function distance(left, right) {
  return Math.hypot(right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches);
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function activeModel(model) {
  return model?.isOnField !== false && model?.isDestroyed !== true;
}
function rectangle(value, code, detail) {
  const minX = Number(value?.minXMilliInches);
  const maxX = Number(value?.maxXMilliInches);
  const minY = Number(value?.minYMilliInches);
  const maxY = Number(value?.maxYMilliInches);
  if (![minX, maxX, minY, maxY].every(Number.isSafeInteger)
    || minX >= maxX || minY >= maxY) fail(code, detail);
  return { shape: "axis_aligned_rectangle", minXMilliInches: minX,
    maxXMilliInches: maxX, minYMilliInches: minY, maxYMilliInches: maxY };
}
function terrainBody(terrain) {
  return { schema: terrain.schema, id: terrain.id,
    terrainKind: terrain.terrainKind, size: terrain.size,
    footprint: terrain.footprint,
    standableHorizontalSurface: terrain.standableHorizontalSurface,
    setupAgreement: terrain.setupAgreement,
    rulesTruth: terrain.rulesTruth, trainingTruth: terrain.trainingTruth };
}
function agreementBody(agreement) {
  return { schema: agreement.schema,
    footprintAgreed: agreement.footprintAgreed,
    footprintHash: agreement.footprintHash,
    openingDenominatorComplete: agreement.openingDenominatorComplete,
    openings: agreement.openings,
    agreedDuringBattlefieldSetup: agreement.agreedDuringBattlefieldSetup,
    trainingTruth: agreement.trainingTruth };
}
function verifyOpening(raw, terrainId, footprint) {
  const openingId = String(raw?.openingId || "").trim();
  if (!openingId) fail("TERRAIN_LOS_OPENING_ID_REQUIRED", terrainId);
  const opening = rectangle(raw?.footprint,
    "TERRAIN_LOS_OPENING_FOOTPRINT_INVALID", openingId);
  if (opening.minXMilliInches < footprint.minXMilliInches
    || opening.maxXMilliInches > footprint.maxXMilliInches
    || opening.minYMilliInches < footprint.minYMilliInches
    || opening.maxYMilliInches > footprint.maxYMilliInches) {
    fail("TERRAIN_LOS_OPENING_OUTSIDE_FOOTPRINT", openingId);
  }
  return { openingId, footprint: opening,
    movementPassableAgreed: raw.movementPassableAgreed === true,
    lineOfSightOpenAgreed: raw.lineOfSightOpenAgreed === true };
}
function verifyTerrain(raw) {
  const terrainId = String(raw?.id || "").trim();
  const terrainKind = String(raw?.terrainKind || "ordinary").toLowerCase();
  const size = Number(raw?.size);
  if (!terrainId || raw?.schema !== OFFICIAL_TERRAIN_PIECE_SCHEMA
    || !Number.isSafeInteger(size) || size < 0 || size > 9
    || !object(raw.setupAgreement)
    || raw.setupAgreement.schema !== "starcraft_tmg_terrain_setup_agreement_v1"
    || raw.setupAgreement.footprintAgreed !== true
    || raw.setupAgreement.openingDenominatorComplete !== true
    || raw.setupAgreement.trainingTruth !== false
    || raw.setupAgreement.agreementHash
      !== hashStarcraftTmgContract(agreementBody(raw.setupAgreement))
    || raw.rulesTruth !== "official_core_terrain_setup_agreement"
    || raw.trainingTruth !== false
    || raw.terrainHash !== hashStarcraftTmgContract(terrainBody(raw))) {
    fail("TERRAIN_LOS_TERRAIN_INVALID", terrainId);
  }
  const footprint = rectangle(raw.footprint,
    "TERRAIN_LOS_TERRAIN_FOOTPRINT_INVALID", terrainId);
  if (raw.setupAgreement.footprintHash !== hashStarcraftTmgContract(footprint)
    || !Array.isArray(raw.setupAgreement.openings)) {
    fail("TERRAIN_LOS_SETUP_AGREEMENT_INVALID", terrainId);
  }
  const openings = raw.setupAgreement.openings.map((entry) => (
    verifyOpening(entry, terrainId, footprint)
  )).sort((left, right) => left.openingId.localeCompare(right.openingId));
  if (new Set(openings.map((entry) => entry.openingId)).size !== openings.length) {
    fail("TERRAIN_LOS_OPENING_ID_DUPLICATE", terrainId);
  }
  return { terrainId, terrainKind, size, footprint, openings,
    standableHorizontalSurface: raw.standableHorizontalSurface === true,
    terrainHash: raw.terrainHash };
}

export function createOfficialTerrainPieceV1(input = {}) {
  const footprint = rectangle(input.footprint,
    "TERRAIN_LOS_TERRAIN_FOOTPRINT_INVALID", String(input.id || ""));
  const openings = (input.openings || []).map((entry) => ({
    openingId: String(entry.openingId || "").trim(),
    footprint: rectangle(entry.footprint,
      "TERRAIN_LOS_OPENING_FOOTPRINT_INVALID", String(entry.openingId || "")),
    movementPassableAgreed: entry.movementPassableAgreed === true,
    lineOfSightOpenAgreed: entry.lineOfSightOpenAgreed === true,
  })).sort((left, right) => left.openingId.localeCompare(right.openingId));
  const agreementBodyValue = {
    schema: "starcraft_tmg_terrain_setup_agreement_v1",
    footprintAgreed: true, footprintHash: hashStarcraftTmgContract(footprint),
    openingDenominatorComplete: true, openings,
    agreedDuringBattlefieldSetup: true, trainingTruth: false,
  };
  const setupAgreement = { ...agreementBodyValue,
    agreementHash: hashStarcraftTmgContract(agreementBodyValue) };
  const body = {
    schema: OFFICIAL_TERRAIN_PIECE_SCHEMA,
    id: String(input.id || "").trim(),
    terrainKind: String(input.terrainKind || "ordinary").toLowerCase(),
    size: Number(input.size), footprint,
    standableHorizontalSurface: input.standableHorizontalSurface === true,
    setupAgreement, rulesTruth: "official_core_terrain_setup_agreement",
    trainingTruth: false,
  };
  const result = freezeDeep({ ...body, terrainHash: hashStarcraftTmgContract(body) });
  verifyTerrain(result);
  return result;
}

function officialProfile(piece, dataBundle) {
  verifyOfficialTerrainLosDataBundleV1(dataBundle);
  const profile = dataBundle.profiles.find((entry) => (
    entry.recordKey === piece?.officialUnitRecordKey
  ));
  if (!profile || piece.sourceRecordHash !== profile.sourceRecordHash
    || piece.officialPayloadHash !== profile.payloadHash
    || profile.printedSize === null) {
    fail("TERRAIN_LOS_OFFICIAL_UNIT_PROFILE_INVALID", String(piece?.id || ""));
  }
  return profile;
}
function roundModel(piece, modelId, dataBundle) {
  if (!activePiece(piece)) fail("TERRAIN_LOS_UNIT_INVALID", String(piece?.id || ""));
  const model = (piece.models || []).find((entry) => entry.id === modelId && activeModel(entry));
  const profile = officialProfile(piece, dataBundle);
  const width = milli(model?.baseWidthInches, "TERRAIN_LOS_MODEL_BASE_INVALID", modelId);
  const depth = milli(model?.baseDepthInches ?? model?.baseWidthInches,
    "TERRAIN_LOS_MODEL_BASE_INVALID", modelId);
  if (!model || String(model.baseShape || "round").toLowerCase() !== "round"
    || width <= 0 || Math.abs(width - depth) > TOLERANCE) {
    fail("TERRAIN_LOS_MODEL_BASE_INVALID", modelId);
  }
  const supportTerrainIds = [...new Set((model.supportTerrainIds || []).map(String))].sort();
  return { unitId: piece.id, modelId: model.id, sideKey: piece.sideKey,
    center: { xMilliInches: milli(model.xInches), yMilliInches: milli(model.yInches) },
    radiusMilliInches: Math.round(width / 2), printedSize: profile.printedSize,
    elevation: String(model.elevation || "ground").toLowerCase(), supportTerrainIds,
    officialRecordKey: profile.recordKey };
}
function pointRectangleDistance(value, footprint) {
  const x = Math.max(footprint.minXMilliInches,
    Math.min(value.xMilliInches, footprint.maxXMilliInches));
  const y = Math.max(footprint.minYMilliInches,
    Math.min(value.yMilliInches, footprint.maxYMilliInches));
  return Math.hypot(value.xMilliInches - x, value.yMilliInches - y);
}
function baseEdgeToTerrain(model, terrain) {
  return Math.max(0, pointRectangleDistance(model.center, terrain.footprint)
    - model.radiusMilliInches);
}
function modelEdgeDistance(left, right) {
  return Math.max(0, distance(left.center, right.center)
    - left.radiusMilliInches - right.radiusMilliInches);
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
function orientation(a, b, c) {
  return (BigInt(b.xMilliInches - a.xMilliInches)
      * BigInt(c.yMilliInches - a.yMilliInches))
    - (BigInt(b.yMilliInches - a.yMilliInches)
      * BigInt(c.xMilliInches - a.xMilliInches));
}
function between(value, left, right) {
  return value >= Math.min(left, right) && value <= Math.max(left, right);
}
function onSegment(a, b, p) {
  return orientation(a, b, p) === 0n
    && between(p.xMilliInches, a.xMilliInches, b.xMilliInches)
    && between(p.yMilliInches, a.yMilliInches, b.yMilliInches);
}
function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c); const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a); const o4 = orientation(c, d, b);
  if (((o1 > 0n && o2 < 0n) || (o1 < 0n && o2 > 0n))
    && ((o3 > 0n && o4 < 0n) || (o3 < 0n && o4 > 0n))) return true;
  return (o1 === 0n && onSegment(a, b, c)) || (o2 === 0n && onSegment(a, b, d))
    || (o3 === 0n && onSegment(c, d, a)) || (o4 === 0n && onSegment(c, d, b));
}
function pointSegmentDistance(value, a, b) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  if (dx === 0 && dy === 0) return distance(value, a);
  const t = Math.max(0, Math.min(1, ((value.xMilliInches - a.xMilliInches) * dx
    + (value.yMilliInches - a.yMilliInches) * dy) / ((dx * dx) + (dy * dy))));
  return Math.hypot(value.xMilliInches - (a.xMilliInches + (t * dx)),
    value.yMilliInches - (a.yMilliInches + (t * dy)));
}
function segmentRectangleDistance(a, b, rect) {
  if (segmentIntersectsRectangle(a, b, rect)) return 0;
  const corners = [
    { xMilliInches: rect.minXMilliInches, yMilliInches: rect.minYMilliInches },
    { xMilliInches: rect.maxXMilliInches, yMilliInches: rect.minYMilliInches },
    { xMilliInches: rect.maxXMilliInches, yMilliInches: rect.maxYMilliInches },
    { xMilliInches: rect.minXMilliInches, yMilliInches: rect.maxYMilliInches },
  ];
  let minimum = Math.min(pointRectangleDistance(a, rect), pointRectangleDistance(b, rect));
  for (let index = 0; index < corners.length; index += 1) {
    const left = corners[index]; const right = corners[(index + 1) % corners.length];
    if (segmentsIntersect(a, b, left, right)) return 0;
    minimum = Math.min(minimum, pointSegmentDistance(left, a, b),
      pointSegmentDistance(a, left, right), pointSegmentDistance(b, left, right));
  }
  return minimum;
}
function baseOverlapsTerrain(model, terrain) {
  return pointRectangleDistance(model.center, terrain.footprint)
    < model.radiusMilliInches - TOLERANCE;
}
function pathSweepsTerrain(points, radius, terrain) {
  for (let index = 1; index < points.length; index += 1) {
    if (segmentRectangleDistance(points[index - 1], points[index], terrain.footprint)
      < radius - TOLERANCE) return true;
  }
  return false;
}
function valueAt(start, end, ratio) { return start + ((end - start) * ratio); }
function segmentAxisWindow(a, b, minimum, maximum, axis) {
  const start = a[axis]; const end = b[axis]; const delta = end - start;
  if (Math.abs(delta) <= TOLERANCE) {
    return start >= minimum - TOLERANCE && start <= maximum + TOLERANCE
      ? [0, 1] : null;
  }
  const left = (minimum - start) / delta;
  const right = (maximum - start) / delta;
  const low = Math.max(0, Math.min(left, right));
  const high = Math.min(1, Math.max(left, right));
  return low <= high + Number.EPSILON ? [low, high] : null;
}
function segmentClearsMovementOpening(a, b, radius, opening, terrain) {
  if (!opening.movementPassableAgreed) return false;
  const hole = opening.footprint; const rect = terrain.footprint;
  const fullWidth = hole.minXMilliInches <= rect.minXMilliInches + TOLERANCE
    && hole.maxXMilliInches >= rect.maxXMilliInches - TOLERANCE;
  if (fullWidth) {
    const window = segmentAxisWindow(a, b, rect.minXMilliInches - radius,
      rect.maxXMilliInches + radius, "xMilliInches");
    const minimum = hole.minYMilliInches + radius;
    const maximum = hole.maxYMilliInches - radius;
    if (window && minimum <= maximum + TOLERANCE) {
      const start = valueAt(a.yMilliInches, b.yMilliInches, window[0]);
      const end = valueAt(a.yMilliInches, b.yMilliInches, window[1]);
      if (Math.min(start, end) >= minimum - TOLERANCE
        && Math.max(start, end) <= maximum + TOLERANCE) return true;
    }
  }
  const fullHeight = hole.minYMilliInches <= rect.minYMilliInches + TOLERANCE
    && hole.maxYMilliInches >= rect.maxYMilliInches - TOLERANCE;
  if (fullHeight) {
    const window = segmentAxisWindow(a, b, rect.minYMilliInches - radius,
      rect.maxYMilliInches + radius, "yMilliInches");
    const minimum = hole.minXMilliInches + radius;
    const maximum = hole.maxXMilliInches - radius;
    if (window && minimum <= maximum + TOLERANCE) {
      const start = valueAt(a.xMilliInches, b.xMilliInches, window[0]);
      const end = valueAt(a.xMilliInches, b.xMilliInches, window[1]);
      if (Math.min(start, end) >= minimum - TOLERANCE
        && Math.max(start, end) <= maximum + TOLERANCE) return true;
    }
  }
  return false;
}
function movementOpeningsClearingPath(points, radius, terrain) {
  const used = new Set();
  for (let index = 1; index < points.length; index += 1) {
    if (segmentRectangleDistance(points[index - 1], points[index], terrain.footprint)
      >= radius - TOLERANCE) continue;
    const opening = terrain.openings.find((entry) => (
      segmentClearsMovementOpening(points[index - 1], points[index], radius, entry, terrain)
    ));
    if (!opening) return [];
    used.add(opening.openingId);
  }
  return [...used].sort();
}
function completeBarrier(left, right, terrain) {
  const rect = terrain.footprint;
  const vertical = (
    left.center.xMilliInches + left.radiusMilliInches <= rect.minXMilliInches
      && right.center.xMilliInches - right.radiusMilliInches >= rect.maxXMilliInches
  ) || (
    right.center.xMilliInches + right.radiusMilliInches <= rect.minXMilliInches
      && left.center.xMilliInches - left.radiusMilliInches >= rect.maxXMilliInches
  );
  if (vertical
    && rect.minYMilliInches <= left.center.yMilliInches - left.radiusMilliInches
    && rect.maxYMilliInches >= left.center.yMilliInches + left.radiusMilliInches
    && rect.minYMilliInches <= right.center.yMilliInches - right.radiusMilliInches
    && rect.maxYMilliInches >= right.center.yMilliInches + right.radiusMilliInches) {
    return "vertical_rectangle_separates_complete_round_base_footprints";
  }
  const horizontal = (
    left.center.yMilliInches + left.radiusMilliInches <= rect.minYMilliInches
      && right.center.yMilliInches - right.radiusMilliInches >= rect.maxYMilliInches
  ) || (
    right.center.yMilliInches + right.radiusMilliInches <= rect.minYMilliInches
      && left.center.yMilliInches - left.radiusMilliInches >= rect.maxYMilliInches
  );
  if (horizontal
    && rect.minXMilliInches <= left.center.xMilliInches - left.radiusMilliInches
    && rect.maxXMilliInches >= left.center.xMilliInches + left.radiusMilliInches
    && rect.minXMilliInches <= right.center.xMilliInches - right.radiusMilliInches
    && rect.maxXMilliInches >= right.center.xMilliInches + right.radiusMilliInches) {
    return "horizontal_rectangle_separates_complete_round_base_footprints";
  }
  return null;
}
function directVisibilityWitness(left, right, terrain) {
  const candidates = [
    [left.center, right.center, "center_to_center_clear"],
    [{ xMilliInches: left.center.xMilliInches,
      yMilliInches: left.center.yMilliInches + left.radiusMilliInches },
    { xMilliInches: right.center.xMilliInches,
      yMilliInches: right.center.yMilliInches + right.radiusMilliInches },
    "corresponding_top_base_points_clear"],
    [{ xMilliInches: left.center.xMilliInches,
      yMilliInches: left.center.yMilliInches - left.radiusMilliInches },
    { xMilliInches: right.center.xMilliInches,
      yMilliInches: right.center.yMilliInches - right.radiusMilliInches },
    "corresponding_bottom_base_points_clear"],
    [{ xMilliInches: left.center.xMilliInches - left.radiusMilliInches,
      yMilliInches: left.center.yMilliInches },
    { xMilliInches: right.center.xMilliInches - right.radiusMilliInches,
      yMilliInches: right.center.yMilliInches },
    "corresponding_left_base_points_clear"],
    [{ xMilliInches: left.center.xMilliInches + left.radiusMilliInches,
      yMilliInches: left.center.yMilliInches },
    { xMilliInches: right.center.xMilliInches + right.radiusMilliInches,
      yMilliInches: right.center.yMilliInches },
    "corresponding_right_base_points_clear"],
  ];
  return candidates.find(([start, end]) => (
    !segmentIntersectsRectangle(start, end, terrain.footprint)
  ))?.[2] || null;
}
function intervalsOverlap(...intervals) {
  return Math.max(...intervals.map((entry) => entry[0]))
    <= Math.min(...intervals.map((entry) => entry[1])) + TOLERANCE;
}
function agreedOpeningClearsBarrier(opening, proof, left, right, terrain) {
  if (!opening.lineOfSightOpenAgreed) return false;
  const hole = opening.footprint; const rect = terrain.footprint;
  if (proof.startsWith("vertical")) {
    return hole.minXMilliInches <= rect.minXMilliInches + TOLERANCE
      && hole.maxXMilliInches >= rect.maxXMilliInches - TOLERANCE
      && intervalsOverlap(
        [left.center.yMilliInches - left.radiusMilliInches,
          left.center.yMilliInches + left.radiusMilliInches],
        [right.center.yMilliInches - right.radiusMilliInches,
          right.center.yMilliInches + right.radiusMilliInches],
        [hole.minYMilliInches, hole.maxYMilliInches],
      );
  }
  return hole.minYMilliInches <= rect.minYMilliInches + TOLERANCE
    && hole.maxYMilliInches >= rect.maxYMilliInches - TOLERANCE
    && intervalsOverlap(
      [left.center.xMilliInches - left.radiusMilliInches,
        left.center.xMilliInches + left.radiusMilliInches],
      [right.center.xMilliInches - right.radiusMilliInches,
        right.center.xMilliInches + right.radiusMilliInches],
      [hole.minXMilliInches, hole.maxXMilliInches],
    );
}

export function evaluateOfficialLeadingModelTerrainV1(input = {}) {
  const state = input.state; const piece = input.actor;
  const model = roundModel(piece, input.leadingModelId, input.dataBundle);
  const points = (input.path || []).map((entry) => point(entry));
  if (points.length < 2 || points.length > 64
    || distance(points[0], model.center) > TOLERANCE) {
    fail("TERRAIN_LOS_MOVEMENT_PATH_INVALID", model.modelId);
  }
  const terrain = (state.board?.terrain || []).filter((entry) => entry?.isRemoved !== true)
    .map(verifyTerrain);
  if (terrain.some((entry) => ["grass", "impassable", "ramp"].includes(entry.terrainKind))) {
    fail("TERRAIN_LOS_DEFERRED_TERRAIN_KIND", terrain.find((entry) => (
      ["grass", "impassable", "ramp"].includes(entry.terrainKind)
    )).terrainId);
  }
  const endpoint = points.at(-1);
  const interactions = terrain.map((entry) => {
    const pathIntersects = pathSweepsTerrain(points, model.radiusMilliInches, entry);
    const movementOpeningIdsUsed = pathIntersects
      ? movementOpeningsClearingPath(points, model.radiusMilliInches, entry) : [];
    const pathBlocked = pathIntersects && entry.size >= 2
      && movementOpeningIdsUsed.length === 0;
    const endpointOverlaps = pointRectangleDistance(endpoint, entry.footprint)
      < model.radiusMilliInches - TOLERANCE;
    if (endpointOverlaps) fail("TERRAIN_LOS_MOVEMENT_ENDPOINT_OVERLAP", entry.terrainId);
    if (pathBlocked) {
      fail("TERRAIN_LOS_LARGE_TERRAIN_MOVEMENT_BLOCKED", entry.terrainId);
    }
    return { terrainId: entry.terrainId, terrainSize: entry.size,
      blockingForLineOfSight: entry.size >= 1,
      movementPassableBySize: entry.size <= 1,
      blockingClassificationControlsMovement: false,
      pathIntersects, pathBlocked, movementOpeningIdsUsed, endpointOverlaps: false,
      movementOpenings: entry.openings.filter((opening) => opening.movementPassableAgreed)
        .map((opening) => opening.openingId),
      lineOfSightOpenings: entry.openings.filter((opening) => opening.lineOfSightOpenAgreed)
        .map((opening) => opening.openingId) };
  });
  const body = { schema: "starcraft_tmg_official_leading_model_terrain_result_v1",
    actorUnitId: piece.id, leadingModelId: model.modelId,
    path: points, endpoint, interactions,
    sizeZeroAndOnePassable: true, sizeTwoAndLargerImpassable: true,
    endpointTerrainOverlapForbidden: true,
    openingMovementAndSightPermissionsIndependent: true,
    gapClearanceDelegatedToSlice82: true, deferredTerrainKinds: ["grass", "impassable", "ramp"],
    productionQuarantined: true, trainingTruth: false };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function evaluateOfficialTerrainLineOfSightV1(input = {}) {
  const state = input.state;
  const attacker = roundModel(input.attacker, input.attackerModelId, input.dataBundle);
  const target = roundModel(input.target, input.targetModelId, input.dataBundle);
  const terrain = (state.board?.terrain || []).filter((entry) => entry?.isRemoved !== true)
    .map(verifyTerrain);
  if (terrain.some((entry) => ["grass", "impassable", "ramp"].includes(entry.terrainKind))) {
    fail("TERRAIN_LOS_DEFERRED_TERRAIN_KIND", terrain.find((entry) => (
      ["grass", "impassable", "ramp"].includes(entry.terrainKind)
    )).terrainId);
  }
  const modelDistance = modelEdgeDistance(attacker, target);
  const assessments = terrain.map((entry) => {
    const attackerNear = baseEdgeToTerrain(attacker, entry) <= INCH + TOLERANCE;
    const targetNear = baseEdgeToTerrain(target, entry) <= INCH + TOLERANCE;
    const closeQuarters = attackerNear && targetNear
      && modelDistance <= CLOSE_QUARTERS_RANGE + TOLERANCE;
    const attackerSupported = attacker.supportTerrainIds.includes(entry.terrainId);
    const targetSupported = target.supportTerrainIds.includes(entry.terrainId);
    const highToGround = (attackerSupported && entry.size >= 3
      && target.elevation === "ground" && target.supportTerrainIds.length === 0 && targetNear)
      || (targetSupported && entry.size >= 3
        && attacker.elevation === "ground" && attacker.supportTerrainIds.length === 0
        && attackerNear);
    const elevationDeadZoneBlocks = highToGround && !closeQuarters;
    const topDownSurfaceExcluded = entry.standableHorizontalSurface
      && (attackerSupported || targetSupported);
    const rawBarrierProof = topDownSurfaceExcluded ? null
      : completeBarrier(attacker, target, entry);
    const visibilityWitness = topDownSurfaceExcluded
      ? "supported_horizontal_surface_excluded"
      : rawBarrierProof ? null : directVisibilityWitness(attacker, target, entry);
    if (entry.size >= 1 && !rawBarrierProof && !visibilityWitness) {
      fail("TERRAIN_LOS_UNSUPPORTED_RECTANGULAR_TRACE", entry.terrainId);
    }
    const openSightOpeningIds = rawBarrierProof ? entry.openings.filter((opening) => (
      agreedOpeningClearsBarrier(opening, rawBarrierProof, attacker, target, entry)
    )).map((opening) => opening.openingId).sort() : [];
    const barrierProof = openSightOpeningIds.length > 0 ? null : rawBarrierProof;
    const blockingTerrainTrace = entry.size >= 1 && Boolean(barrierProof);
    if (blockingTerrainTrace
      && (attacker.supportTerrainIds.length > 0 || target.supportTerrainIds.length > 0)) {
      fail("TERRAIN_LOS_ELEVATION_EFFECTIVE_SIZE_DELEGATION_REQUIRED", entry.terrainId);
    }
    const fullCoverBlocks = blockingTerrainTrace
      && entry.size >= attacker.printedSize && entry.size >= target.printedSize;
    const attackerDirectCover = blockingTerrainTrace && attackerNear
      && entry.size >= attacker.printedSize;
    const targetDirectCover = blockingTerrainTrace && targetNear
      && entry.size >= target.printedSize;
    const directCoverBlocks = !closeQuarters
      && (attackerDirectCover || targetDirectCover);
    return { terrainId: entry.terrainId, terrainSize: entry.size,
      blockingTerrain: entry.size >= 1, rawBarrierProof, visibilityWitness,
      topDownSurfaceExcluded, openSightOpeningIds,
      defaultAperturesBlockLineOfSight: entry.openings.some((opening) => (
        !opening.lineOfSightOpenAgreed
      )),
      movementAndSightOpeningPermissionsIndependent: true,
      blockingTerrainTrace, attackerWithinOneInch: attackerNear,
      targetWithinOneInch: targetNear, closeQuarters,
      fullCoverBlocks, attackerDirectCover, targetDirectCover,
      directCoverBlocks, elevationDeadZoneBlocks,
      blocksLineOfSight: fullCoverBlocks || directCoverBlocks || elevationDeadZoneBlocks };
  });
  const blockers = assessments.filter((entry) => entry.blocksLineOfSight)
    .map((entry) => entry.terrainId);
  const body = { schema: "starcraft_tmg_official_terrain_line_of_sight_result_v1",
    attackerUnitId: attacker.unitId, attackerModelId: attacker.modelId,
    targetUnitId: target.unitId, targetModelId: target.modelId,
    modelEdgeDistanceMilliInches: Math.round(modelDistance),
    assessments, terrainPiecesAssessedIndependently: true,
    terrainEffectiveSizesNeverCombine: true,
    lineOfSightMutual: true, visible: blockers.length === 0,
    blockingTerrainIds: blockers,
    lineOfSightStatus: blockers.length === 0 ? "visible" : "blocked_by_one_qualifying_terrain",
    deferredTerrainKinds: ["grass", "impassable", "ramp"],
    productionQuarantined: true, trainingTruth: false };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function certifyOfficialTerrainLosPlanV1(input = {}) {
  const plan = input.plan; const procedureKind = String(input.procedureKind || "");
  const actor = input.actor; const planId = String(plan?.planId || "").trim();
  if (!activePiece(actor) || !object(plan) || !planId) {
    fail("TERRAIN_LOS_PLAN_INVALID");
  }
  let result;
  if (procedureKind === "leading_model_terrain_check") {
    result = evaluateOfficialLeadingModelTerrainV1({ state: input.state, actor,
      leadingModelId: plan.leadingModelId, path: plan.path, dataBundle: input.dataBundle });
  } else if (procedureKind === "line_of_sight_check") {
    const target = input.state.pieces?.find((piece) => piece.id === plan.targetUnitId);
    if (!activePiece(target)) fail("TERRAIN_LOS_TARGET_INVALID", String(plan.targetUnitId || ""));
    result = evaluateOfficialTerrainLineOfSightV1({ state: input.state,
      attacker: actor, attackerModelId: plan.attackerModelId,
      target, targetModelId: plan.targetModelId, dataBundle: input.dataBundle });
  } else fail("TERRAIN_LOS_PROCEDURE_KIND_INVALID", procedureKind);
  const body = { planId, procedureKind, actorUnitId: actor.id, result,
    productionQuarantined: true, trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}
