// Conservative continuous endpoint cover for a round leading base and one
// round declared target after the Charge roll. This is a pure Rules candidate,
// not an executable failure outcome in any frozen match runtime.

export const OFFICIAL_CHARGE_ROUND_ENDPOINT_COVER_VERSION =
  "starcraft_tmg_charge_round_endpoint_conservative_cover_v2";

const MAX_CELLS = 1_000_000;
const MAX_DEPTH = 72;

function milli(value) {
  const converted = Math.round(Number(value) * 1000);
  return Number.isSafeInteger(converted) ? converted : null;
}

function modelPoint(model) {
  const x = milli(model?.xInches);
  const y = milli(model?.yInches);
  return x === null || y === null ? null : { x, y };
}

function minimumPointCellDistance(point, cell) {
  return Math.hypot(
    Math.max(cell.minX - point.x, point.x - cell.maxX, 0),
    Math.max(cell.minY - point.y, point.y - cell.maxY, 0));
}

function maximumPointCellDistance(point, cell) {
  return Math.max(...[cell.minX, cell.maxX].flatMap((x) =>
    [cell.minY, cell.maxY].map((y) => Math.hypot(x - point.x, y - point.y))));
}

function maximumCellDistanceToRectangle(cell, rectangle) {
  return Math.max(...[cell.minX, cell.maxX].flatMap((x) =>
    [cell.minY, cell.maxY].map((y) => Math.hypot(
      Math.max(rectangle.minXMilliInches - x,
        x - rectangle.maxXMilliInches, 0),
      Math.max(rectangle.minYMilliInches - y,
        y - rectangle.maxYMilliInches, 0)))));
}

function inconclusive(reason) {
  return { schemaVersion: OFFICIAL_CHARGE_ROUND_ENDPOINT_COVER_VERSION,
    allPosesExcluded: false, reason, certificateKind: null,
    trainingTruth: false };
}

export function evaluateOfficialChargeRoundLeadingEndpointCoverV2(state,
  pending) {
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
  if (!leader || !target || leader.baseShape !== "round"
    || target.baseShape !== "round") {
    return inconclusive("unsupported_actor_or_target_geometry");
  }
  const start = modelPoint(leader);
  const goal = modelPoint(target);
  const leaderDiameter = milli(leader.baseWidthInches);
  const targetDiameter = milli(target.baseWidthInches);
  const maxDistance = Number(pending.maxDistanceMilliInches);
  if (!start || !goal || ![leaderDiameter, targetDiameter,
    maxDistance].every((value) => Number.isFinite(value) && value > 0)
    || milli(leader.baseDepthInches ?? leader.baseWidthInches)
      !== leaderDiameter
    || milli(target.baseDepthInches ?? target.baseWidthInches)
      !== targetDiameter) {
    return inconclusive("invalid_geometry_or_distance");
  }
  const leaderRadius = leaderDiameter / 2;
  const targetRadius = targetDiameter / 2;
  // Expand movement and engagement by one milli-inch, shrink guaranteed
  // collision interiors by two. Every legal endpoint remains inside the cover.
  const moveLimit = maxDistance + 1;
  const engagementCenterLimit = leaderRadius + targetRadius + 1001;
  const surfaces = (state.board?.terrain || []).filter((terrain) =>
    terrain.isRemoved !== true && terrain.isDestroyed !== true
      && terrain.standableHorizontalSurface === true
      && terrain.footprint?.shape === "axis_aligned_rectangle")
    .map((terrain) => terrain.footprint);
  const blockers = (state.pieces || []).filter((piece) =>
    piece.id !== actor.id && piece.isOnField === true
      && piece.isDestroyed !== true).flatMap((piece) =>
    (piece.models || []).filter((model) =>
      model.isOnField !== false && model.isDestroyed !== true
        && model.baseShape === "round")
      .map((model) => ({ center: modelPoint(model),
        radius: milli(model.baseWidthInches) / 2 })))
    .filter((model) => model.center && Number.isFinite(model.radius)
      && model.radius > 0);

  function excludedCell(cell) {
    if (minimumPointCellDistance(start, cell) > moveLimit) {
      return "outside_rolled_move";
    }
    if (minimumPointCellDistance(goal, cell) > engagementCenterLimit) {
      return "outside_target_engagement";
    }
    for (const surface of surfaces) {
      // The circle intersects the actual rectangle for every center in this
      // cell, while at least one circle edge is outside it for every center.
      if (maximumCellDistanceToRectangle(cell, surface)
        >= leaderRadius - 2) continue;
      const alwaysExtendsBeyond = cell.maxX - leaderRadius
          < surface.minXMilliInches - 1
        || cell.minX + leaderRadius > surface.maxXMilliInches + 1
        || cell.maxY - leaderRadius < surface.minYMilliInches - 1
        || cell.minY + leaderRadius > surface.maxYMilliInches + 1;
      if (alwaysExtendsBeyond) return "partial_standable_surface";
    }
    for (const blocker of blockers) {
      if (maximumPointCellDistance(blocker.center, cell)
        < leaderRadius + blocker.radius - 2) {
        return "overlaps_occupied_round_base";
      }
    }
    return null;
  }

  const pendingCells = [{ minX: goal.x - engagementCenterLimit,
    maxX: goal.x + engagementCenterLimit,
    minY: goal.y - engagementCenterLimit,
    maxY: goal.y + engagementCenterLimit, depth: 0 }];
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
    const axis = cell.maxX - cell.minX >= cell.maxY - cell.minY
      ? "X" : "Y";
    if (cell.depth >= MAX_DEPTH
      || Math.max(cell.maxX - cell.minX, cell.maxY - cell.minY) < 0.001) {
      unresolvedCells += 1;
      break;
    }
    const middle = (cell[`min${axis}`] + cell[`max${axis}`]) / 2;
    pendingCells.push({ ...cell, [`min${axis}`]: middle,
      depth: cell.depth + 1 }, { ...cell, [`max${axis}`]: middle,
      depth: cell.depth + 1 });
  }
  const allPosesExcluded = pendingCells.length === 0
    && unresolvedCells === 0;
  return { schemaVersion: OFFICIAL_CHARGE_ROUND_ENDPOINT_COVER_VERSION,
    allPosesExcluded,
    reason: allPosesExcluded ? "continuous_round_domain_excluded"
      : "continuous_round_domain_unresolved",
    certificateKind: allPosesExcluded
      ? "leader_endpoint_terrain_or_occupancy_blocked" : null,
    examinedCells, maximumCells: MAX_CELLS, unresolvedCells,
    pendingCells: pendingCells.length,
    excludedByReason: Object.fromEntries([...excludedByReason].sort()),
    // Ignoring path, ordinary blockers, other models in the charging Unit,
    // coherency and support requirements enlarges the allowed endpoint set.
    omittedConstraintsCanOnlyEnlargeDomain: true,
    trainingTruth: false };
}
