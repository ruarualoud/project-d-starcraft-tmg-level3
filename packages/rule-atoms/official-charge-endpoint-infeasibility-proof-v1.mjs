// A conservative continuous cover for a declared, post-roll Charge's leading
// rectangle. This is a pure Rules candidate: callers must still version and
// bind a failure-proof kind before treating the result as an executable action.

export const OFFICIAL_CHARGE_ENDPOINT_COVER_VERSION =
  "starcraft_tmg_charge_endpoint_conservative_cover_v1";

const MAX_CELLS = 1_000_000;
const MAX_DEPTH = 72;

function milli(value) {
  const converted = Math.round(Number(value) * 1000);
  return Number.isSafeInteger(converted) ? converted : null;
}

function point(model) {
  const x = milli(model?.xInches);
  const y = milli(model?.yInches);
  return x === null || y === null ? null : { x, y };
}

function rectanglePointDistance(center, target, sine, cosine,
  halfWidth, halfDepth) {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const localX = Math.abs((dx * cosine) + (dy * sine));
  const localY = Math.abs((-dx * sine) + (dy * cosine));
  return Math.hypot(Math.max(0, localX - halfWidth),
    Math.max(0, localY - halfDepth));
}

function minimumPointCellDistance(center, cell) {
  return Math.hypot(
    Math.max(cell.minX - center.x, center.x - cell.maxX, 0),
    Math.max(cell.minY - center.y, center.y - cell.maxY, 0));
}

function maximumCellDistanceToRectangle(cell, rectangle) {
  const xs = [cell.minX, cell.maxX];
  const ys = [cell.minY, cell.maxY];
  return Math.max(...xs.flatMap((x) => ys.map((y) => Math.hypot(
    Math.max(rectangle.minXMilliInches - x,
      x - rectangle.maxXMilliInches, 0),
    Math.max(rectangle.minYMilliInches - y,
      y - rectangle.maxYMilliInches, 0),
  ))));
}

function inconclusive(reason) {
  return {
    schemaVersion: OFFICIAL_CHARGE_ENDPOINT_COVER_VERSION,
    allPosesExcluded: false,
    reason,
    certificateKind: null,
    trainingTruth: false,
  };
}

export function evaluateOfficialChargeLeadingEndpointCoverV1(state, pending) {
  if (pending?.stage !== "resolve_charge_after_roll"
    || !Array.isArray(pending.chargePlan?.targets)
    || pending.chargePlan.targets.length !== 1) {
    return inconclusive("unsupported_pending_or_target_count");
  }
  const actor = (state?.pieces || []).find((piece) =>
    piece.id === pending.pieceId);
  const leader = actor?.models?.find((model) =>
    model.id === pending.chargePlan.leadingModelId);
  const targetRef = pending.chargePlan.targets[0];
  const target = (state?.pieces || []).find((piece) =>
    piece.id === targetRef.unitId)?.models?.find((model) =>
    model.id === targetRef.modelId);
  if (!leader || !target || leader.baseShape !== "rectangle"
    || target.baseShape !== "round") {
    return inconclusive("unsupported_actor_or_target_geometry");
  }
  const start = point(leader);
  const goal = point(target);
  const halfWidth = milli(leader.baseWidthInches) / 2;
  const halfDepth = milli(leader.baseDepthInches) / 2;
  const targetRadius = milli(target.baseWidthInches) / 2;
  const maxDistance = Number(pending.maxDistanceMilliInches);
  if (!start || !goal || ![halfWidth, halfDepth, targetRadius,
    maxDistance].every((value) => Number.isFinite(value) && value > 0)) {
    return inconclusive("invalid_geometry_or_distance");
  }
  const circumscribedRadius = Math.hypot(halfWidth, halfDepth);
  const inscribedRadius = Math.min(halfWidth, halfDepth);
  // Widen allowed movement/engagement by 1 milli-inch and shrink collision
  // interiors by 2: the cover must overapproximate legal endpoints.
  const moveLimit = maxDistance + 1;
  const engagementCenterLimit = circumscribedRadius
    + targetRadius + 1001;
  const blockers = (state.pieces || []).filter((piece) =>
    piece.id !== actor.id && piece.isOnField === true
      && piece.isDestroyed !== true).flatMap((piece) =>
    (piece.models || []).filter((model) =>
      model.isOnField !== false && model.isDestroyed !== true
        && model.baseShape === "round")
      .map((model) => ({ center: point(model),
        radius: milli(model.baseWidthInches) / 2 })))
    .filter((model) => model.center
      && Number.isFinite(model.radius) && model.radius > 0);
  const surfaces = (state.board?.terrain || []).filter((terrain) =>
    terrain.isRemoved !== true && terrain.isDestroyed !== true
      && terrain.standableHorizontalSurface === true
      && terrain.footprint?.shape === "axis_aligned_rectangle")
    .map((terrain) => terrain.footprint);

  function excludedCell(cell) {
    if (minimumPointCellDistance(start, cell) > moveLimit) {
      return "outside_rolled_move";
    }
    const middle = { x: (cell.minX + cell.maxX) / 2,
      y: (cell.minY + cell.maxY) / 2 };
    const angle = (cell.minAngle + cell.maxAngle) / 2;
    const angleError = (cell.maxAngle - cell.minAngle) / 2;
    const positionError = Math.hypot(
      (cell.maxX - cell.minX) / 2,
      (cell.maxY - cell.minY) / 2);
    // A rectangle's Hausdorff displacement under rotation is bounded by
    // circumscribedRadius * angleError. Point-to-shape distance is 1-Lipschitz.
    const distanceError = positionError + circumscribedRadius * angleError;
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);
    const targetDistance = rectanglePointDistance(middle, goal,
      sine, cosine, halfWidth, halfDepth);
    if (targetDistance - distanceError > targetRadius + 1001) {
      return "outside_target_engagement";
    }
    // Horizontal/vertical projection extents are each Lipschitz in angle.
    const minHorizontalHalfExtent = Math.max(0,
      Math.abs(halfWidth * cosine) + Math.abs(halfDepth * sine)
        - circumscribedRadius * angleError);
    const minVerticalHalfExtent = Math.max(0,
      Math.abs(halfWidth * sine) + Math.abs(halfDepth * cosine)
        - circumscribedRadius * angleError);
    for (const surface of surfaces) {
      // The authoritative endpoint check uses actual polygon intersection,
      // not bounding-box intersection. The rectangle's orientation-invariant
      // inscribed disc guarantees actual overlap for every pose in this cell.
      const alwaysOverlaps = maximumCellDistanceToRectangle(cell, surface)
        < inscribedRadius - 2;
      if (!alwaysOverlaps) continue;
      const alwaysExtendsBeyond =
        cell.maxX - minHorizontalHalfExtent
          < surface.minXMilliInches - 1
        || cell.minX + minHorizontalHalfExtent
          > surface.maxXMilliInches + 1
        || cell.maxY - minVerticalHalfExtent
          < surface.minYMilliInches - 1
        || cell.minY + minVerticalHalfExtent
          > surface.maxYMilliInches + 1;
      if (alwaysExtendsBeyond) return "partial_standable_surface";
    }
    for (const blocker of blockers) {
      const modelDistance = rectanglePointDistance(middle,
        blocker.center, sine, cosine, halfWidth, halfDepth);
      if (modelDistance + distanceError < blocker.radius - 2) {
        return "overlaps_occupied_round_base";
      }
    }
    return null;
  }

  const pendingCells = [{
    minX: goal.x - engagementCenterLimit,
    maxX: goal.x + engagementCenterLimit,
    minY: goal.y - engagementCenterLimit,
    maxY: goal.y + engagementCenterLimit,
    minAngle: 0,
    maxAngle: Math.PI,
    depth: 0,
  }];
  const excludedByReason = new Map();
  let examinedCells = 0;
  let unresolvedCells = 0;
  while (pendingCells.length > 0 && examinedCells < MAX_CELLS) {
    const cell = pendingCells.pop();
    examinedCells += 1;
    const reason = excludedCell(cell);
    if (reason) {
      excludedByReason.set(reason,
        (excludedByReason.get(reason) || 0) + 1);
      continue;
    }
    const spans = [cell.maxX - cell.minX,
      cell.maxY - cell.minY,
      circumscribedRadius * (cell.maxAngle - cell.minAngle)];
    const widest = Math.max(...spans);
    if (cell.depth >= MAX_DEPTH || widest < 0.001) {
      unresolvedCells += 1;
      break;
    }
    const axis = spans.indexOf(widest);
    const key = ["X", "Y", "Angle"][axis];
    const middle = (cell[`min${key}`] + cell[`max${key}`]) / 2;
    pendingCells.push({ ...cell, [`min${key}`]: middle,
      depth: cell.depth + 1 }, { ...cell, [`max${key}`]: middle,
      depth: cell.depth + 1 });
  }
  const allPosesExcluded = pendingCells.length === 0
    && unresolvedCells === 0;
  return {
    schemaVersion: OFFICIAL_CHARGE_ENDPOINT_COVER_VERSION,
    allPosesExcluded,
    reason: allPosesExcluded ? "continuous_domain_excluded"
      : "continuous_domain_unresolved",
    certificateKind: allPosesExcluded
      ? "leader_endpoint_terrain_or_occupancy_blocked" : null,
    examinedCells,
    maximumCells: MAX_CELLS,
    unresolvedCells,
    pendingCells: pendingCells.length,
    excludedByReason: Object.fromEntries([...excludedByReason].sort()),
    // Path, remaining-model coherency, ordinary obstacles, other support
    // requirements and non-round blockers are ignored, enlarging the domain.
    omittedConstraintsCanOnlyEnlargeDomain: true,
    trainingTruth: false,
  };
}
