import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_GAP_PLACE_GEOMETRY_KERNEL_SCHEMA =
  "starcraft_tmg_official_gap_place_geometry_kernel_v1";
export const OFFICIAL_GAP_PLACE_GEOMETRY_KERNEL_VERSION = "1.0.0";

const TOLERANCE = 1;
const SMALL_GAP_MILLI_INCHES = 1000;
const LARGE_GAP_MILLI_INCHES = 3000;
const ENGAGEMENT_RANGE_MILLI_INCHES = 1000;
const COHERENCY_RANGE_MILLI_INCHES = 3000;
const MOVEMENT_TYPES = Object.freeze([
  "move", "run", "charge", "disengage", "close_ranks",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function milli(value, code = "GAP_PLACE_GEOMETRY_INVALID", detail = "") {
  const parsed = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(parsed)) fail(code, detail);
  return parsed;
}
function point(value, code = "GAP_PLACE_POINT_INVALID", detail = "") {
  if (!object(value)
    || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) fail(code, detail);
  return { xMilliInches: Number(value.xMilliInches),
    yMilliInches: Number(value.yMilliInches) };
}
function distance(left, right) {
  return Math.hypot(right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches);
}
function modelRadius(model) {
  const width = milli(model?.baseWidthInches,
    "GAP_PLACE_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  const depth = milli(model?.baseDepthInches ?? model?.baseWidthInches,
    "GAP_PLACE_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  if (String(model?.baseShape || "round").toLowerCase() !== "round"
    || width <= 0 || Math.abs(width - depth) > TOLERANCE) {
    fail("GAP_PLACE_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
  return Math.round(width / 2);
}
function modelPoint(model) {
  return { xMilliInches: milli(model?.xInches), yMilliInches: milli(model?.yInches) };
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}
function roundFootprint(id, center, radius, kind, input = {}) {
  return { objectId: id, kind, shape: "round", center, radius,
    blocksPlacement: input.blocksPlacement !== false, openings: [] };
}
function terrainOpenings(terrain, objectId) {
  return (terrain.openings || []).map((entry) => {
    const openingId = String(entry?.openingId || "").trim();
    if (!openingId) fail("GAP_PLACE_OPENING_ID_REQUIRED", objectId);
    return { openingId,
      leftPoint: point(entry.leftPoint, "GAP_PLACE_OPENING_GEOMETRY_INVALID", openingId),
      rightPoint: point(entry.rightPoint, "GAP_PLACE_OPENING_GEOMETRY_INVALID", openingId),
      passableAgreed: entry.passableAgreed === true };
  });
}
function terrainFootprint(terrain) {
  const objectId = String(terrain?.id || "").trim();
  const shape = String(terrain?.footprint?.shape || terrain?.shape || "").toLowerCase();
  if (!objectId) fail("GAP_PLACE_TERRAIN_ID_REQUIRED");
  if (shape === "round") {
    const center = terrain.footprint?.center
      ? point(terrain.footprint.center, "GAP_PLACE_TERRAIN_FOOTPRINT_INVALID", objectId)
      : { xMilliInches: milli(terrain.xInches), yMilliInches: milli(terrain.yInches) };
    const radius = terrain.footprint?.radiusMilliInches === undefined
      ? Math.round(milli(terrain.diameterInches) / 2)
      : Number(terrain.footprint.radiusMilliInches);
    if (!Number.isSafeInteger(radius) || radius <= 0) {
      fail("GAP_PLACE_TERRAIN_FOOTPRINT_INVALID", objectId);
    }
    return { ...roundFootprint(objectId, center, radius, "terrain", terrain),
      openings: terrainOpenings(terrain, objectId) };
  }
  if (shape === "axis_aligned_rectangle") {
    const source = terrain.footprint || terrain;
    const minX = Number(source.minXMilliInches);
    const maxX = Number(source.maxXMilliInches);
    const minY = Number(source.minYMilliInches);
    const maxY = Number(source.maxYMilliInches);
    if (![minX, maxX, minY, maxY].every(Number.isSafeInteger)
      || minX >= maxX || minY >= maxY) {
      fail("GAP_PLACE_TERRAIN_FOOTPRINT_INVALID", objectId);
    }
    return { objectId, kind: "terrain", shape, minX, maxX, minY, maxY,
      blocksPlacement: terrain.blocksPlacement !== false,
      openings: terrainOpenings(terrain, objectId) };
  }
  fail("GAP_PLACE_TERRAIN_FOOTPRINT_UNSUPPORTED", objectId);
}
function footprints(state) {
  const rows = [];
  for (const piece of (state.pieces || []).filter(activePiece)) {
    for (const model of activeModels(piece)) {
      rows.push({ ...roundFootprint(model.id, modelPoint(model), modelRadius(model), "model"),
        unitId: piece.id, sideKey: piece.sideKey });
    }
  }
  for (const token of state.board?.tokens || []) {
    if (token?.isRemoved === true || token?.isDestroyed === true) continue;
    rows.push(roundFootprint(String(token.id || ""), modelPoint(token),
      modelRadius(token), "token", token));
  }
  for (const terrain of state.board?.terrain || []) rows.push(terrainFootprint(terrain));
  return rows;
}
function pointOnBoundary(value, footprint) {
  if (footprint.shape === "round") {
    return Math.abs(distance(value, footprint.center) - footprint.radius) <= TOLERANCE;
  }
  const insideX = value.xMilliInches >= footprint.minX - TOLERANCE
    && value.xMilliInches <= footprint.maxX + TOLERANCE;
  const insideY = value.yMilliInches >= footprint.minY - TOLERANCE
    && value.yMilliInches <= footprint.maxY + TOLERANCE;
  const onVertical = insideY && (Math.abs(value.xMilliInches - footprint.minX) <= TOLERANCE
    || Math.abs(value.xMilliInches - footprint.maxX) <= TOLERANCE);
  const onHorizontal = insideX && (Math.abs(value.yMilliInches - footprint.minY) <= TOLERANCE
    || Math.abs(value.yMilliInches - footprint.maxY) <= TOLERANCE);
  return onVertical || onHorizontal;
}
function orientation(a, b, c) {
  return (BigInt(b.xMilliInches - a.xMilliInches)
      * BigInt(c.yMilliInches - a.yMilliInches))
    - (BigInt(b.yMilliInches - a.yMilliInches)
      * BigInt(c.xMilliInches - a.xMilliInches));
}
function between(value, left, right) {
  return value >= Math.min(left, right) - TOLERANCE
    && value <= Math.max(left, right) + TOLERANCE;
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
function pathCrossesMouth(path, left, right) {
  for (let index = 1; index < path.length; index += 1) {
    if (segmentsIntersect(path[index - 1], path[index], left, right)) return true;
  }
  return false;
}
function pointSegmentDistance(p, a, b) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  if (dx === 0 && dy === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.xMilliInches - a.xMilliInches) * dx
    + (p.yMilliInches - a.yMilliInches) * dy) / ((dx * dx) + (dy * dy))));
  return Math.hypot(p.xMilliInches - (a.xMilliInches + (t * dx)),
    p.yMilliInches - (a.yMilliInches + (t * dy)));
}
function segmentBlocked(a, b, footprint) {
  if (footprint.shape === "round") {
    return pointSegmentDistance(footprint.center, a, b) < footprint.radius - TOLERANCE;
  }
  if (a.xMilliInches > footprint.minX && a.xMilliInches < footprint.maxX
    && a.yMilliInches > footprint.minY && a.yMilliInches < footprint.maxY) return true;
  if (b.xMilliInches > footprint.minX && b.xMilliInches < footprint.maxX
    && b.yMilliInches > footprint.minY && b.yMilliInches < footprint.maxY) return true;
  const corners = [
    { xMilliInches: footprint.minX, yMilliInches: footprint.minY },
    { xMilliInches: footprint.maxX, yMilliInches: footprint.minY },
    { xMilliInches: footprint.maxX, yMilliInches: footprint.maxY },
    { xMilliInches: footprint.minX, yMilliInches: footprint.maxY },
  ];
  return corners.some((corner, index) => segmentsIntersect(
    a, b, corner, corners[(index + 1) % corners.length],
  ));
}
function circleOverlaps(pointValue, radius, footprint) {
  if (footprint.shape === "round") {
    return distance(pointValue, footprint.center) < radius + footprint.radius - TOLERANCE;
  }
  const closestX = Math.max(footprint.minX, Math.min(pointValue.xMilliInches, footprint.maxX));
  const closestY = Math.max(footprint.minY, Math.min(pointValue.yMilliInches, footprint.maxY));
  return Math.hypot(pointValue.xMilliInches - closestX,
    pointValue.yMilliInches - closestY) < radius - TOLERANCE;
}
function withinBoard(state, value, radius) {
  const width = milli(state.board?.widthInches);
  const height = milli(state.board?.heightInches);
  return value.xMilliInches >= radius && value.xMilliInches <= width - radius
    && value.yMilliInches >= radius && value.yMilliInches <= height - radius;
}
function pointPairEqual(leftA, rightA, leftB, rightB) {
  return (distance(leftA, leftB) <= TOLERANCE && distance(rightA, rightB) <= TOLERANCE)
    || (distance(leftA, rightB) <= TOLERANCE && distance(rightA, leftB) <= TOLERANCE);
}
function rectangleSeparation(left, right) {
  const dx = Math.max(0, left.minX - right.maxX, right.minX - left.maxX);
  const dy = Math.max(0, left.minY - right.maxY, right.minY - left.maxY);
  return Math.hypot(dx, dy);
}
function roundRectangleSeparation(round, rectangle) {
  const closestX = Math.max(rectangle.minX,
    Math.min(round.center.xMilliInches, rectangle.maxX));
  const closestY = Math.max(rectangle.minY,
    Math.min(round.center.yMilliInches, rectangle.maxY));
  return Math.max(0, Math.hypot(round.center.xMilliInches - closestX,
    round.center.yMilliInches - closestY) - round.radius);
}
function minimumFootprintSeparation(left, right) {
  if (left.shape === "round" && right.shape === "round") {
    return Math.max(0, distance(left.center, right.center) - left.radius - right.radius);
  }
  if (left.shape === "axis_aligned_rectangle"
    && right.shape === "axis_aligned_rectangle") return rectangleSeparation(left, right);
  return left.shape === "round"
    ? roundRectangleSeparation(left, right)
    : roundRectangleSeparation(right, left);
}
function canonicalGap(raw, byId, path, size, flying) {
  const gapId = String(raw?.gapId || "").trim();
  const left = { objectId: String(raw?.leftBoundary?.objectId || "").trim(),
    point: point(raw?.leftBoundary?.point, "GAP_PLACE_GAP_BOUNDARY_INVALID", gapId) };
  const right = { objectId: String(raw?.rightBoundary?.objectId || "").trim(),
    point: point(raw?.rightBoundary?.point, "GAP_PLACE_GAP_BOUNDARY_INVALID", gapId) };
  const leftObject = byId.get(left.objectId); const rightObject = byId.get(right.objectId);
  if (!gapId || !leftObject || !rightObject
    || !pointOnBoundary(left.point, leftObject) || !pointOnBoundary(right.point, rightObject)) {
    fail("GAP_PLACE_GAP_BOUNDARY_INVALID", gapId);
  }
  const opening = raw?.kind === "terrain_opening";
  if (opening !== (left.objectId === right.objectId)) {
    fail("GAP_PLACE_OPENING_CLASSIFICATION_INVALID", gapId);
  }
  if (!pathCrossesMouth(path, left.point, right.point)) {
    fail("GAP_PLACE_PATH_DOES_NOT_CROSS_DECLARED_GAP", gapId);
  }
  const widthMilliInches = Math.round(distance(left.point, right.point));
  let openingAgreedPassable = null;
  let openingId = null;
  if (opening) {
    openingId = String(raw?.openingId || "").trim();
    const record = leftObject.openings.find((entry) => entry.openingId === openingId);
    if (!record || !pointPairEqual(left.point, right.point,
      record.leftPoint, record.rightPoint)) {
      fail("GAP_PLACE_OPENING_GEOMETRY_INVALID", gapId);
    }
    openingAgreedPassable = record.passableAgreed;
  } else {
    const minimum = minimumFootprintSeparation(leftObject, rightObject);
    if (Math.abs(widthMilliInches - minimum) > TOLERANCE) {
      fail("GAP_PLACE_GAP_NOT_MINIMUM_PHYSICAL_SPACE", gapId);
    }
  }
  const requiredWidthMilliInches = size <= 2
    ? SMALL_GAP_MILLI_INCHES : LARGE_GAP_MILLI_INCHES;
  if (!flying && opening && openingAgreedPassable !== true) {
    fail("GAP_PLACE_OPENING_AGREEMENT_REQUIRED", gapId);
  }
  if (!flying && widthMilliInches < requiredWidthMilliInches) {
    fail("GAP_PLACE_CLEARANCE_INSUFFICIENT", gapId);
  }
  return { gapId, kind: opening ? "terrain_opening" : "physical_gap",
    openingId,
    leftBoundary: left, rightBoundary: right, widthMilliInches,
    requiredWidthMilliInches, clearanceIgnoredForFlying: flying,
    openingAgreedPassable };
}
function placementRecords(state, actor, rawPlacements) {
  const models = activeModels(actor);
  const required = new Set(models.map((entry) => entry.id));
  if (!Array.isArray(rawPlacements) || rawPlacements.length !== required.size) {
    fail("GAP_PLACE_PLACEMENT_DENOMINATOR_INVALID");
  }
  const rows = rawPlacements.map((raw) => {
    const modelId = String(raw?.modelId || "").trim();
    const model = models.find((entry) => entry.id === modelId);
    if (!model || !required.delete(modelId)) fail("GAP_PLACE_PLACEMENT_MODEL_INVALID", modelId);
    return { modelId, point: point(raw, "GAP_PLACE_PLACEMENT_POINT_INVALID", modelId),
      radius: modelRadius(model), startPoint: modelPoint(model), model };
  });
  if (required.size !== 0) fail("GAP_PLACE_PLACEMENT_DENOMINATOR_INVALID");
  return rows.sort((a, b) => a.modelId.localeCompare(b.modelId));
}
function legalEndpoints(state, actor, rows, { assaultException }) {
  const ignored = new Set(activeModels(actor).map((entry) => entry.id));
  const blockers = footprints(state).filter((entry) => !ignored.has(entry.objectId));
  for (const row of rows) {
    if (!withinBoard(state, row.point, row.radius)) {
      fail("GAP_PLACE_ENDPOINT_OUTSIDE_BATTLEFIELD", row.modelId);
    }
    for (const blocker of blockers) {
      if (blocker.blocksPlacement && circleOverlaps(row.point, row.radius, blocker)) {
        fail("GAP_PLACE_ENDPOINT_OVERLAP", `${row.modelId}/${blocker.objectId}`);
      }
      if (!assaultException && blocker.kind === "model"
        && blocker.sideKey !== actor.sideKey
        && distance(row.point, blocker.center) - row.radius - blocker.radius
          < ENGAGEMENT_RANGE_MILLI_INCHES - TOLERANCE) {
        fail("GAP_PLACE_ENEMY_SEPARATION_REQUIRED", `${row.modelId}/${blocker.objectId}`);
      }
    }
  }
  for (let left = 0; left < rows.length; left += 1) {
    for (let right = left + 1; right < rows.length; right += 1) {
      if (distance(rows[left].point, rows[right].point)
        < rows[left].radius + rows[right].radius - TOLERANCE) {
        fail("GAP_PLACE_ENDPOINT_OVERLAP", `${rows[left].modelId}/${rows[right].modelId}`);
      }
    }
  }
  return blockers;
}
function coherencyValid(rows, leading, blockers, flying, gapInputs, byId, size) {
  for (const row of rows) {
    if (row.modelId === leading.modelId) continue;
    if (distance(leading.point, row.point) + row.radius
      > leading.radius + COHERENCY_RANGE_MILLI_INCHES + TOLERANCE) {
      fail("GAP_PLACE_COHERENCY_RANGE_INVALID", row.modelId);
    }
  }
  const adjacency = new Map(rows.map((entry) => [entry.modelId, []]));
  for (let left = 0; left < rows.length; left += 1) {
    for (let right = left + 1; right < rows.length; right += 1) {
      const a = rows[left]; const b = rows[right];
      const externalBlocked = !flying && blockers.some((entry) => (
        (entry.kind === "terrain" || entry.kind === "model" || entry.kind === "token")
          && segmentBlocked(a.point, b.point, entry)
      ));
      let gapBlocked = false;
      if (!flying) {
        for (const raw of gapInputs) {
          const rawLeft = point(raw?.leftBoundary?.point,
            "GAP_PLACE_GAP_BOUNDARY_INVALID", String(raw?.gapId || ""));
          const rawRight = point(raw?.rightBoundary?.point,
            "GAP_PLACE_GAP_BOUNDARY_INVALID", String(raw?.gapId || ""));
          if (!pathCrossesMouth([a.point, b.point], rawLeft, rawRight)) continue;
          const gap = canonicalGap(raw, byId, [a.point, b.point], size, false);
          if (gap.widthMilliInches < gap.requiredWidthMilliInches) gapBlocked = true;
        }
      }
      if (!externalBlocked && !gapBlocked) {
        adjacency.get(a.modelId).push(b.modelId);
        adjacency.get(b.modelId).push(a.modelId);
      }
    }
  }
  const seen = new Set([leading.modelId]); const queue = [leading.modelId];
  while (queue.length > 0) {
    for (const next of adjacency.get(queue.shift()) || []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  if (seen.size !== rows.length) fail("GAP_PLACE_COHERENCY_LINK_INVALID");
}

export function certifyOfficialGapPlaceGeometryPlanV1(input = {}) {
  const state = input.state; const actor = input.actor; const raw = input.plan;
  const procedureKind = String(input.procedureKind || "");
  if (!object(state) || !activePiece(actor) || !object(raw)
    || !["gap_traversal", "place"].includes(procedureKind)) {
    fail("GAP_PLACE_GEOMETRY_INPUT_INVALID");
  }
  const planId = String(raw.planId || "").trim();
  const leadingModelId = String(raw.leadingModelId || "").trim();
  const rows = placementRecords(state, actor, raw.placements);
  const leading = rows.find((entry) => entry.modelId === leadingModelId);
  const size = Number(actor.sizeCharacteristic);
  const flying = (actor.combatTags || []).map((entry) => String(entry).toLowerCase())
    .includes("flying");
  if (!planId || !leading || !Number.isSafeInteger(size) || size < 0) {
    fail("GAP_PLACE_GEOMETRY_PROFILE_INVALID", actor.id);
  }
  const allFootprints = footprints(state);
  const byId = new Map(allFootprints.map((entry) => [entry.objectId, entry]));
  const assaultException = procedureKind === "place" && state.phase === "assault";
  const blockers = legalEndpoints(state, actor, rows, { assaultException });
  let path = [];
  let gaps = [];
  let movementType = null;
  let maxDistanceMilliInches = null;
  if (procedureKind === "gap_traversal") {
    movementType = String(input.movementType || "");
    if (!MOVEMENT_TYPES.includes(movementType)) fail("GAP_PLACE_MOVEMENT_TYPE_INVALID");
    path = (raw.path || []).map((entry, index) => point(
      entry, "GAP_PLACE_PATH_INVALID", `${planId}/${index}`,
    ));
    if (path.length < 2
      || distance(path[0], leading.startPoint) > TOLERANCE
      || distance(path.at(-1), leading.point) > TOLERANCE) {
      fail("GAP_PLACE_PATH_INVALID", planId);
    }
    gaps = (raw.gapMouths || []).map((gap) => canonicalGap(gap, byId, path, size, flying));
  } else {
    maxDistanceMilliInches = Number(input.maxDistanceMilliInches);
    if (!Number.isSafeInteger(maxDistanceMilliInches) || maxDistanceMilliInches <= 0
      || distance(leading.startPoint, leading.point) > maxDistanceMilliInches + TOLERANCE) {
      fail("GAP_PLACE_LEADING_RANGE_INVALID", planId);
    }
  }
  coherencyValid(rows, leading, blockers, flying,
    raw.coherencyGapMouths || [], byId, size);
  const body = {
    schema: OFFICIAL_GAP_PLACE_GEOMETRY_KERNEL_SCHEMA,
    kernelVersion: OFFICIAL_GAP_PLACE_GEOMETRY_KERNEL_VERSION,
    planId, procedureKind, actorUnitId: actor.id, leadingModelId,
    movementType, maxDistanceMilliInches, sizeCharacteristic: size, flying,
    placements: rows.map((entry) => ({ modelId: entry.modelId,
      xMilliInches: entry.point.xMilliInches, yMilliInches: entry.point.yMilliInches })),
    path, gaps,
    placeSemantics: procedureKind === "place" ? {
      leadingModelNominated: true, remainingModelsResetInCoherency: true,
      pathIgnored: true, gapClearanceIgnored: true, elevationRequirementsIgnored: true,
      legalEndpointsRequired: true, assaultEngagementException: assaultException,
    } : null,
    geometryDenominatorComplete: true, productionQuarantined: true,
    rulesTruth: "official_gap_clearance_and_place_geometry_conformance",
    trainingTruth: false,
  };
  return Object.freeze({ ...body, planHash: hashStarcraftTmgContract(body) });
}
