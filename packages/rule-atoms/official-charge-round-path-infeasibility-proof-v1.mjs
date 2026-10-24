// Conservative post-roll Charge proof for an integer-coordinate round leader.
// This is a pure Rules candidate. A match runtime must explicitly version and
// recompute the certificate before it can authorize a failure action.

export const OFFICIAL_CHARGE_ROUND_PATH_COVER_VERSION =
  "starcraft_tmg_charge_round_integer_path_cover_v1";

const MAX_CELLS = 1_000_000;
const FLOAT_SAFETY_MILLI_INCHES = 0.1;
const TAU = Math.PI * 2;

function milli(value) {
  const converted = Math.round(Number(value) * 1000);
  return Number.isSafeInteger(converted) ? converted : null;
}

function point(model) {
  const x = milli(model?.xInches);
  const y = milli(model?.yInches);
  return x === null || y === null ? null : { x, y };
}

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function nearestCellDistance(value, cell) {
  return Math.hypot(
    Math.max(cell.minX - value.x, value.x - cell.maxX, 0),
    Math.max(cell.minY - value.y, value.y - cell.maxY, 0),
  );
}

function farthestCellDistance(value, cell) {
  return Math.max(...[cell.minX, cell.maxX].flatMap((x) =>
    [cell.minY, cell.maxY].map((y) => Math.hypot(x - value.x, y - value.y))));
}

function pointSegmentDistance(value, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const denominator = dx * dx + dy * dy;
  if (denominator === 0) return distance(value, start);
  const parameter = Math.max(0, Math.min(1,
    ((value.x - start.x) * dx + (value.y - start.y) * dy) / denominator));
  return Math.hypot(start.x + parameter * dx - value.x,
    start.y + parameter * dy - value.y);
}

function positiveAngle(value) {
  return ((value % TAU) + TAU) % TAU;
}

// Shortest path in the plane outside one open circular blocker. Every Rules
// polyline that avoids this blocker is at least this long. Tangency is allowed.
function shortestPathAroundRoundBlocker(start, end, blocker) {
  const radius = blocker.forbiddenRadius;
  const startRadius = distance(start, blocker.center);
  const endRadius = distance(end, blocker.center);
  if (startRadius < radius || endRadius < radius) return null;
  if (pointSegmentDistance(blocker.center, start, end) >= radius) {
    return distance(start, end);
  }
  const startAngle = Math.atan2(start.y - blocker.center.y,
    start.x - blocker.center.x);
  const endAngle = Math.atan2(end.y - blocker.center.y,
    end.x - blocker.center.x);
  const startTangentAngle = Math.acos(Math.min(1, radius / startRadius));
  const endTangentAngle = Math.acos(Math.min(1, radius / endRadius));
  const tangentLength = Math.sqrt(Math.max(0,
    startRadius * startRadius - radius * radius))
    + Math.sqrt(Math.max(0,
      endRadius * endRadius - radius * radius));
  const counterclockwiseArc = positiveAngle(
    (endAngle - endTangentAngle) - (startAngle + startTangentAngle));
  const clockwiseArc = positiveAngle(
    (startAngle - startTangentAngle) - (endAngle + endTangentAngle));
  return tangentLength + radius * Math.min(counterclockwiseArc, clockwiseArc);
}

function inconclusive(reason) {
  return { schemaVersion: OFFICIAL_CHARGE_ROUND_PATH_COVER_VERSION,
    allIntegerEndpointsExcluded: false, reason, certificateKind: null,
    trainingTruth: false };
}

export function evaluateOfficialChargeRoundLeadingPathCoverV1(state, pending) {
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
  const start = point(leader);
  const goal = point(target);
  const leaderDiameter = milli(leader.baseWidthInches);
  const targetDiameter = milli(target.baseWidthInches);
  const maxDistance = Number(pending.maxDistanceMilliInches);
  if (!start || !goal || ![leaderDiameter, targetDiameter,
    maxDistance].every((value) => Number.isSafeInteger(value) && value > 0)
    || milli(leader.baseDepthInches ?? leader.baseWidthInches)
      !== leaderDiameter
    || milli(target.baseDepthInches ?? target.baseWidthInches)
      !== targetDiameter) {
    return inconclusive("invalid_geometry_or_distance");
  }
  const leaderRadius = leaderDiameter / 2;
  const targetRadius = targetDiameter / 2;
  // Rules rounds total path length to an integer and accepts maxDistance + 1.
  // Its unrounded path can therefore be strictly below maxDistance + 1.5.
  const moveLimit = maxDistance + 1.5 + FLOAT_SAFETY_MILLI_INCHES;
  // The engagement graph rounds its gap; this deliberately generous bound
  // contains every legal target-engaging endpoint.
  const engagementCenterLimit = leaderRadius + targetRadius + 1002;
  const blockers = (state.pieces || []).filter((piece) =>
    piece.id !== actor.id && piece.isOnField === true
      && piece.isDestroyed !== true).flatMap((piece) =>
    (piece.models || []).filter((model) =>
      model.isOnField !== false && model.isDestroyed !== true
        && model.baseShape === "round")
      .map((model) => ({ center: point(model),
        radius: milli(model.baseWidthInches) / 2 })))
    .filter((blocker) => blocker.center
      && Number.isFinite(blocker.radius) && blocker.radius > 0)
    .map((blocker) => ({ ...blocker,
      // The exact swept round/round collision test is strict below this
      // radius. Other models and terrain are ignored if unsupported.
      forbiddenRadius: leaderRadius + blocker.radius - 1 }));
  const cells = [{ minX: Math.floor(goal.x - engagementCenterLimit),
    maxX: Math.ceil(goal.x + engagementCenterLimit),
    minY: Math.floor(goal.y - engagementCenterLimit),
    maxY: Math.ceil(goal.y + engagementCenterLimit) }];
  const excludedByReason = new Map();
  let examinedCells = 0;
  let unresolvedCells = 0;
  while (cells.length > 0 && examinedCells < MAX_CELLS) {
    const cell = cells.pop();
    examinedCells += 1;
    let reason = null;
    if (nearestCellDistance(start, cell) > moveLimit) {
      reason = "outside_rolled_move";
    } else if (nearestCellDistance(goal, cell)
      > engagementCenterLimit + FLOAT_SAFETY_MILLI_INCHES) {
      reason = "outside_target_engagement";
    } else {
      for (const blocker of blockers) {
        if (cell.minX === cell.maxX && cell.minY === cell.maxY) {
          // Action coordinates are integer milli-inches and round radii are
          // integer or half-integer milli-inches. Compare the exact squared
          // singleton distance so an artificial floating safety margin cannot
          // leave a near-tangent *overlapping* lattice point unresolved.
          const dx = cell.minX - blocker.center.x;
          const dy = cell.minY - blocker.center.y;
          const doubledRadius = blocker.forbiddenRadius * 2;
          if (Number.isSafeInteger(doubledRadius)
            && Number.isSafeInteger(4 * (dx * dx + dy * dy))
            && 4 * (dx * dx + dy * dy)
              < doubledRadius * doubledRadius) {
            reason = "endpoint_overlaps_occupied_round_base";
            break;
          }
        }
        if (farthestCellDistance(blocker.center, cell)
          < blocker.forbiddenRadius - FLOAT_SAFETY_MILLI_INCHES) {
          reason = "endpoint_overlaps_occupied_round_base";
          break;
        }
        if (distance(start, blocker.center) < blocker.forbiddenRadius) {
          continue;
        }
        // A wholly obstacle-free rectangle is convex; its centre connects
        // straight to every point in the cell without crossing this blocker.
        // Triangle inequality makes centre geodesic minus the cell radius a
        // lower bound for every integer endpoint inside it.
        if (nearestCellDistance(blocker.center, cell)
          < blocker.forbiddenRadius) continue;
        const centre = { x: (cell.minX + cell.maxX) / 2,
          y: (cell.minY + cell.maxY) / 2 };
        const pathLowerBound = shortestPathAroundRoundBlocker(
          start, centre, blocker);
        const cellRadius = Math.hypot(cell.maxX - cell.minX,
          cell.maxY - cell.minY) / 2;
        if (pathLowerBound !== null && pathLowerBound - cellRadius
          > moveLimit + FLOAT_SAFETY_MILLI_INCHES) {
          reason = "round_blocker_path_too_long";
          break;
        }
      }
    }
    if (reason) {
      excludedByReason.set(reason, (excludedByReason.get(reason) || 0) + 1);
      continue;
    }
    if (cell.minX === cell.maxX && cell.minY === cell.maxY) {
      unresolvedCells += 1;
      break;
    }
    const axis = cell.maxX - cell.minX >= cell.maxY - cell.minY
      ? "X" : "Y";
    const middle = Math.floor((cell[`min${axis}`] + cell[`max${axis}`]) / 2);
    cells.push({ ...cell, [`min${axis}`]: middle + 1 },
      { ...cell, [`max${axis}`]: middle });
  }
  const allIntegerEndpointsExcluded = cells.length === 0
    && unresolvedCells === 0;
  return { schemaVersion: OFFICIAL_CHARGE_ROUND_PATH_COVER_VERSION,
    allIntegerEndpointsExcluded,
    reason: allIntegerEndpointsExcluded
      ? "integer_round_endpoint_path_domain_excluded"
      : "integer_round_endpoint_path_domain_unresolved",
    certificateKind: allIntegerEndpointsExcluded
      ? "leader_path_blocked_by_occupied_round_base" : null,
    examinedCells, maximumCells: MAX_CELLS, unresolvedCells,
    pendingCells: cells.length,
    excludedByReason: Object.fromEntries([...excludedByReason].sort()),
    // Ignoring other blockers, terrain, coherency and support enlarges the
    // possible domain, never manufactures an impossible legal Charge.
    omittedConstraintsCanOnlyEnlargeDomain: true,
    integerEndpointContract: true,
    trainingTruth: false };
}
