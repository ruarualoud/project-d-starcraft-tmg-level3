import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_MARINE_MOVE_GEOMETRY_KERNEL_V2_SCHEMA =
  "starcraft_tmg_official_marine_move_geometry_kernel_v2";
export const OFFICIAL_MARINE_MOVE_PATH_V2_SCHEMA =
  "starcraft_tmg_official_marine_move_path_v2";

const MAX_RAW_PATH_POINTS = 64;
const MAX_CANONICAL_PATH_POINTS = 32;

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

function milli(value, code = "MARINE_MOVE_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}

function modelPoint(model, code = "MARINE_MOVE_GEOMETRY_INVALID") {
  return {
    xMilliInches: milli(model?.xInches, code, String(model?.id || "")),
    yMilliInches: milli(model?.yInches, code, String(model?.id || "")),
  };
}

function safePoint(value, code, detail = "") {
  if (!object(value)
    || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) {
    fail(code, detail);
  }
  return {
    xMilliInches: Number(value.xMilliInches),
    yMilliInches: Number(value.yMilliInches),
  };
}

function distance(left, right) {
  return Math.hypot(
    right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches,
  );
}

function pointEquals(left, right) {
  return left.xMilliInches === right.xMilliInches
    && left.yMilliInches === right.yMilliInches;
}

function collinear(a, b, c) {
  return (BigInt(b.xMilliInches - a.xMilliInches)
    * BigInt(c.yMilliInches - b.yMilliInches))
    === (BigInt(b.yMilliInches - a.yMilliInches)
      * BigInt(c.xMilliInches - b.xMilliInches));
}

function pointToSegmentDistance(target, start, end) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  const lengthSquared = (dx * dx) + (dy * dy);
  if (lengthSquared === 0) return distance(target, start);
  const ratio = Math.max(0, Math.min(1, (
    ((target.xMilliInches - start.xMilliInches) * dx)
      + ((target.yMilliInches - start.yMilliInches) * dy)
  ) / lengthSquared));
  return Math.hypot(
    target.xMilliInches - (start.xMilliInches + (ratio * dx)),
    target.yMilliInches - (start.yMilliInches + (ratio * dy)),
  );
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}

function activeRows(state, baseRadiusMilliInches) {
  return (state?.pieces || []).flatMap((piece) => (
    piece?.isOnField === true
      && piece?.isDestroyed !== true
      && Number(piece?.currentModels || 0) > 0
      ? activeModels(piece).map((model) => ({
          sideKey: piece.sideKey,
          pieceId: piece.id,
          modelId: model.id,
          point: modelPoint(model),
          radius: baseRadiusMilliInches,
        }))
      : []
  ));
}

function canonicalPath(start, raw) {
  if (!Array.isArray(raw) || raw.length === 0) fail("MARINE_MOVE_PATH_REQUIRED");
  if (raw.length > MAX_RAW_PATH_POINTS) fail("MARINE_MOVE_PATH_TOO_COMPLEX");
  const normalized = [start];
  for (const [index, value] of raw.entries()) {
    const next = safePoint(value, "MARINE_MOVE_PATH_POINT_INVALID", String(index));
    if (!pointEquals(normalized.at(-1), next)) normalized.push(next);
  }
  if (normalized.length < 2) fail("MARINE_MOVE_PATH_MUST_CHANGE_POSITION");
  const points = [];
  for (const value of normalized) {
    while (points.length >= 2 && collinear(points.at(-2), points.at(-1), value)) {
      points.pop();
    }
    points.push(value);
  }
  if (points.length > MAX_CANONICAL_PATH_POINTS) {
    fail("MARINE_MOVE_PATH_TOO_COMPLEX");
  }
  let distanceMilliInches = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceMilliInches += Math.round(distance(points[index - 1], points[index]));
  }
  return {
    schemaVersion: OFFICIAL_MARINE_MOVE_PATH_V2_SCHEMA,
    unit: "milli-inch",
    points,
    distanceMilliInches,
  };
}

function battlefieldPoint(point, constraints, code) {
  const radius = Math.round(constraints.baseDiameterMilliInches / 2);
  if (point.xMilliInches < radius
    || point.xMilliInches > constraints.battlefieldWidthMilliInches - radius
    || point.yMilliInches < radius
    || point.yMilliInches > constraints.battlefieldHeightMilliInches - radius) {
    fail(code);
  }
}

function validateLeadingPath(state, domain, path) {
  const constraints = domain.constraints;
  if (path.distanceMilliInches > constraints.maxDistanceMilliInches) {
    fail("MARINE_MOVE_PATH_EXCEEDS_SPEED");
  }
  for (const point of path.points.slice(1)) {
    battlefieldPoint(point, constraints, "MARINE_MOVE_PATH_OUTSIDE_BATTLEFIELD");
  }
  const radius = Math.round(constraints.baseDiameterMilliInches / 2);
  const blockers = activeRows(state, radius).filter((row) => (
    row.pieceId !== domain.pieceId
  ));
  for (let index = 1; index < path.points.length; index += 1) {
    for (const blocker of blockers) {
      if (pointToSegmentDistance(blocker.point, path.points[index - 1], path.points[index])
        < radius + blocker.radius - 1) {
        fail("MARINE_MOVE_PATH_COLLISION", blocker.modelId);
      }
    }
  }
}

function canonicalPlacements(domain, leadingModelId, input) {
  const expected = domain.constraints.modelIds.length - 1;
  if (!Array.isArray(input) || input.length !== expected) {
    fail("MARINE_MOVE_PLACEMENT_DENOMINATOR_INVALID");
  }
  const remaining = new Set(domain.constraints.modelIds.filter((id) => (
    id !== leadingModelId
  )));
  const rows = input.map((value, index) => {
    const modelId = String(value?.modelId || "").trim();
    if (!remaining.delete(modelId)) {
      fail("MARINE_MOVE_PLACEMENT_MODEL_INVALID", modelId || String(index));
    }
    const point = safePoint(value, "MARINE_MOVE_PLACEMENT_POINT_INVALID", modelId);
    battlefieldPoint(point, domain.constraints, "MARINE_MOVE_PLACEMENT_OUTSIDE_BATTLEFIELD");
    return { modelId, ...point };
  });
  if (remaining.size !== 0) fail("MARINE_MOVE_PLACEMENT_DENOMINATOR_INVALID");
  return rows;
}

function linkClear(start, end, blockers) {
  return blockers.every((blocker) => (
    pointToSegmentDistance(blocker.point, start, end) >= blocker.radius - 1
  ));
}

function validateCoherency(deployed, leadingModelId, blockers) {
  const leading = deployed.find((row) => row.modelId === leadingModelId);
  for (const model of deployed.filter((row) => row.modelId !== leadingModelId)) {
    if (distance(leading.point, model.point) > 3000) {
      fail("MARINE_MOVE_OUT_OF_COHERENCY", model.modelId);
    }
  }
  const linked = new Set([leadingModelId]);
  while (linked.size < deployed.length) {
    const next = deployed.find((candidate) => !linked.has(candidate.modelId)
      && deployed.some((linkedModel) => linked.has(linkedModel.modelId)
        && linkClear(candidate.point, linkedModel.point, blockers)));
    if (!next) fail("MARINE_MOVE_COHERENCY_LINK_BLOCKED");
    linked.add(next.modelId);
  }
}

function validateFinalPlacement(state, domain, leadingModelId, path, placements) {
  const constraints = domain.constraints;
  const endpoint = path.points.at(-1);
  const deployed = [
    { modelId: leadingModelId, point: endpoint },
    ...placements.map((row) => ({
      modelId: row.modelId,
      point: {
        xMilliInches: row.xMilliInches,
        yMilliInches: row.yMilliInches,
      },
    })),
  ];
  for (let left = 0; left < deployed.length; left += 1) {
    for (let right = left + 1; right < deployed.length; right += 1) {
      if (distance(deployed[left].point, deployed[right].point)
        < constraints.baseDiameterMilliInches - 1) {
        fail(
          "MARINE_MOVE_BASE_OVERLAP",
          `${deployed[left].modelId}/${deployed[right].modelId}`,
        );
      }
    }
  }
  const radius = Math.round(constraints.baseDiameterMilliInches / 2);
  const blockers = activeRows(state, radius).filter((row) => (
    row.pieceId !== domain.pieceId
  ));
  for (const model of deployed) {
    for (const blocker of blockers) {
      const edgeDistance = distance(model.point, blocker.point)
        - radius - blocker.radius;
      if (edgeDistance < -1) {
        fail("MARINE_MOVE_BASE_OVERLAP", `${model.modelId}/${blocker.modelId}`);
      }
      if (blocker.sideKey !== domain.sideKey && edgeDistance <= 1000) {
        fail("MARINE_MOVE_ENEMY_ENGAGEMENT_RANGE", `${model.modelId}/${blocker.modelId}`);
      }
    }
  }
  validateCoherency(deployed, leadingModelId, blockers);
  return deployed;
}

export function createOfficialMarineMoveGeometryKernelV2() {
  const body = {
    schema: OFFICIAL_MARINE_MOVE_GEOMETRY_KERNEL_V2_SCHEMA,
    version: "2.0.0",
    coordinateUnit: "milli-inch",
    pathMeasurement: "canonical_polyline_actual_distance",
    sameUnitStartingBasesPassable: true,
    otherUnitSweptCollisionChecked: true,
    wholeBaseBattlefieldContainmentChecked: true,
    finalBaseOverlapChecked: true,
    enemyOneInchEndpointExclusionChecked: true,
    remainingModelsPlacedNotMoved: true,
    whollyWithinThreeAndLinkCoherencyChecked: true,
    maxRawPathPoints: MAX_RAW_PATH_POINTS,
    maxCanonicalPathPoints: MAX_CANONICAL_PATH_POINTS,
    rulesTruth: "official_standard_move_geometry_exact_ground_round_base_subset",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, kernelHash: hashStarcraftTmgContract(body) });
}

export function instantiateOfficialMarineMoveGeometryV2(input = {}) {
  const { state, domain, parameters } = input;
  if (!object(state)
    || !object(domain)
    || !object(domain.constraints)
    || !object(parameters)
    || Object.keys(parameters).some((key) => ![
      "leadingModelId", "path", "placements",
    ].includes(key))) {
    fail("MARINE_MOVE_PARAMETERS_INVALID");
  }
  const leadingModelId = String(parameters.leadingModelId || "").trim();
  if (!domain.constraints.modelIds.includes(leadingModelId)) {
    fail("MARINE_MOVE_LEADING_MODEL_INVALID");
  }
  const path = canonicalPath(
    domain.constraints.modelStartPoints[leadingModelId],
    parameters.path,
  );
  validateLeadingPath(state, domain, path);
  const placements = canonicalPlacements(
    domain,
    leadingModelId,
    parameters.placements,
  );
  const deployed = validateFinalPlacement(
    state,
    domain,
    leadingModelId,
    path,
    placements,
  );
  return freezeDeep({
    leadingModelId,
    canonicalPath: path,
    placementSequence: placements,
    finalModelPositions: deployed.map((row) => ({
      modelId: row.modelId,
      xMilliInches: row.point.xMilliInches,
      yMilliInches: row.point.yMilliInches,
    })),
    distanceTravelledInches: path.distanceMilliInches / 1000,
    canonicalParameters: {
      leadingModelId,
      path: structuredClone(path.points.slice(1)),
      placements: structuredClone(placements),
    },
  });
}
