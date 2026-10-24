import {
  createOfficialPhysicalFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1,
  evaluateOfficialSweptPhysicalFootprintCollisionV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";

const TOLERANCE = 1;
const PERIMETER_SAMPLES = 24;
const WAYPOINT_CLEARANCE = 4;

function distance(left, right) {
  return Math.hypot(left.xMilliInches - right.xMilliInches,
    left.yMilliInches - right.yMilliInches);
}

function bounds(footprint) {
  if (footprint.shape === "round") {
    return {
      minX: footprint.center.xMilliInches - footprint.radiusMilliInches,
      maxX: footprint.center.xMilliInches + footprint.radiusMilliInches,
      minY: footprint.center.yMilliInches - footprint.radiusMilliInches,
      maxY: footprint.center.yMilliInches + footprint.radiusMilliInches,
    };
  }
  return {
    minX: Math.min(...footprint.vertices.map(point => point.xMilliInches)),
    maxX: Math.max(...footprint.vertices.map(point => point.xMilliInches)),
    minY: Math.min(...footprint.vertices.map(point => point.yMilliInches)),
    maxY: Math.max(...footprint.vertices.map(point => point.yMilliInches)),
  };
}

function circumscribedRadius(footprint) {
  return footprint.shape === "round" ? footprint.radiusMilliInches
    : Math.max(...footprint.vertices.map(point =>
      distance(point, footprint.center)));
}

// Candidate generation, NOT a new Rules implementation or impossibility proof.
// The same swept-footprint kernel used by the executor validates every segment.
// Elevation/access, engagement and followers still require the original
// complete Rules instantiation. A finite graph with no route remains unknown.
export function createStarcraftTmgModelObstacleRoutePlannerV1(input) {
  const start = structuredClone(input.start);
  const moving = input.movingFootprint;
  const blockers = input.modelBlockers
    .filter(entry => entry.kind === "model" || entry.kind === "terrain")
    .map(entry => ({ kind: entry.kind, terrainGroupId: entry.terrainGroupId,
      footprint: entry.footprint,
      bounds: bounds(entry.footprint) }));
  const movingRadius = circumscribedRadius(moving);
  const width = Number(input.battlefieldWidthMilliInches);
  const height = Number(input.battlefieldHeightMilliInches);
  const footprintAt = point => createOfficialPhysicalFootprintV1({
    objectId: moving.objectId, kind: moving.kind, shape: moving.shape,
    center: { xMilliInches: point.xMilliInches,
      yMilliInches: point.yMilliInches },
    widthMilliInches: moving.widthMilliInches,
    depthMilliInches: moving.depthMilliInches,
    rotationDegrees: moving.rotationDegrees,
  });
  const startFootprint = footprintAt(start);
  const perimeterPoints = blockers.filter(entry => entry.kind === "model")
    .flatMap(({ footprint }) => {
    const radius = (circumscribedRadius(footprint) + movingRadius
      + WAYPOINT_CLEARANCE) / Math.cos(Math.PI / PERIMETER_SAMPLES);
    return Array.from({ length: PERIMETER_SAMPLES }, (_, index) => {
      const angle = (2 * Math.PI * index) / PERIMETER_SAMPLES;
      return {
        xMilliInches: Math.round(footprint.center.xMilliInches
          + Math.cos(angle) * radius),
        yMilliInches: Math.round(footprint.center.yMilliInches
          + Math.sin(angle) * radius),
      };
    });
  });
  // Compiled map contours contain many small cells. Generate exterior waypoints
  // once per logical terrain region, while collision checks retain EVERY actual
  // cell. The envelope is a candidate generator, never substituted for terrain
  // geometry or used to prove a route impossible; concave openings remain for
  // the complete Rules check and other search candidates.
  const terrainEnvelopes = new Map();
  for (const entry of blockers.filter(row => row.kind === "terrain")) {
    const key = entry.terrainGroupId || entry.footprint.objectId;
    const previous = terrainEnvelopes.get(key);
    const box = entry.bounds;
    terrainEnvelopes.set(key, previous ? {
      minX: Math.min(previous.minX, box.minX),
      maxX: Math.max(previous.maxX, box.maxX),
      minY: Math.min(previous.minY, box.minY),
      maxY: Math.max(previous.maxY, box.maxY),
    } : { ...box });
  }
  const clearance = movingRadius + WAYPOINT_CLEARANCE;
  for (const box of terrainEnvelopes.values()) {
    for (const x of [box.minX - clearance, box.maxX + clearance]) {
      for (const y of [box.minY - clearance, box.maxY + clearance]) {
        perimeterPoints.push({ xMilliInches: Math.round(x),
          yMilliInches: Math.round(y) });
      }
    }
  }

  function insideBoard(footprint) {
    const box = bounds(footprint);
    return box.minX >= -TOLERANCE && box.minY >= -TOLERANCE
      && box.maxX <= width + TOLERANCE && box.maxY <= height + TOLERANCE;
  }

  function collides(left, right) {
    const sweep = {
      minX: Math.min(left.center.xMilliInches, right.center.xMilliInches)
        - movingRadius,
      maxX: Math.max(left.center.xMilliInches, right.center.xMilliInches)
        + movingRadius,
      minY: Math.min(left.center.yMilliInches, right.center.yMilliInches)
        - movingRadius,
      maxY: Math.max(left.center.yMilliInches, right.center.yMilliInches)
        + movingRadius,
    };
    return blockers.some(entry => {
      const box = entry.bounds;
      if (sweep.maxX < box.minX - TOLERANCE
        || sweep.minX > box.maxX + TOLERANCE
        || sweep.maxY < box.minY - TOLERANCE
        || sweep.minY > box.maxY + TOLERANCE) return false;
      return evaluateOfficialSweptPhysicalFootprintCollisionV1({
        movingStart: left, movingEnd: right, blocker: entry.footprint,
      }).collides;
    });
  }

  function routeTo({ endpoint, maxDistanceMilliInches }) {
    const maximum = Number(maxDistanceMilliInches);
    const unknown = reason => ({ status: "unknown", reason, path: null,
      finiteSearchDoesNotProveImpossibility: true, rulesAuthority: false,
      trainingTruth: false });
    if (!Number.isSafeInteger(maximum) || maximum <= 0
      || ![endpoint.xMilliInches, endpoint.yMilliInches]
        .every(Number.isSafeInteger)
      || (Number(endpoint.rotationDegrees || 0)
        !== Number(moving.rotationDegrees || 0) && moving.shape !== "round")) {
      return unknown("unsupported_endpoint_or_pose");
    }
    if (distance(start, endpoint) > maximum + TOLERANCE) {
      return unknown("straight_lower_bound_exceeds_budget");
    }
    const endFootprint = footprintAt(endpoint);
    if (!insideBoard(startFootprint) || !insideBoard(endFootprint)) {
      return unknown("endpoint_outside_full_base_bounds");
    }
    const result = (points, length) => ({ status: "candidate_found",
      path: points.slice(1).map((point, index) => ({
        ...structuredClone(index === points.length - 2 ? endpoint : {
          xMilliInches: point.xMilliInches, yMilliInches: point.yMilliInches,
          elevation: endpoint.elevation || "ground", supportTerrainIds: [],
          rotationDegrees: moving.rotationDegrees || 0,
        }),
      })),
      distanceMilliInches: Math.round(length),
      modelSegmentsCheckedByExecutorKernel: true,
      terrainSegmentsCheckedByExecutorKernel: true,
      completeTerrainAndFormationChecked: false,
      rulesAuthority: false, trainingTruth: false });
    if (!collides(startFootprint, endFootprint)) {
      return result([start, endpoint], distance(start, endpoint));
    }

    const points = [start, structuredClone(endpoint)];
    const footprints = [startFootprint, endFootprint];
    const pointKeys = new Set(points.map(point =>
      `${point.xMilliInches}:${point.yMilliInches}`));
    for (const point of perimeterPoints) {
      if (distance(start, point) + distance(point, endpoint)
        > maximum + TOLERANCE) continue;
      const key = `${point.xMilliInches}:${point.yMilliInches}`;
      if (pointKeys.has(key)) continue;
      pointKeys.add(key);
      const footprint = footprintAt(point);
      if (!insideBoard(footprint) || blockers.some(entry =>
        evaluateOfficialPhysicalFootprintRelationV1({
          left: footprint, right: entry.footprint,
        }).overlappingInteriors)) continue;
      points.push(point);
      footprints.push(footprint);
    }

    const costs = Array(points.length).fill(Infinity);
    const previous = Array(points.length).fill(-1);
    const closed = new Set();
    costs[0] = 0;
    while (closed.size < points.length) {
      let current = -1;
      let estimate = Infinity;
      for (let index = 0; index < points.length; index++) {
        if (closed.has(index)) continue;
        const value = costs[index] + distance(points[index], endpoint);
        if (value < estimate) { current = index; estimate = value; }
      }
      if (current < 0 || estimate > maximum + TOLERANCE) break;
      if (current === 1) {
        const indices = [];
        for (let index = current; index >= 0; index = previous[index]) {
          indices.unshift(index);
        }
        if (indices.length > 32) return unknown("candidate_path_too_complex");
        return result(indices.map(index => points[index]), costs[current]);
      }
      closed.add(current);
      for (let next = 0; next < points.length; next++) {
        if (closed.has(next)) continue;
        const cost = costs[current] + distance(points[current], points[next]);
        if (cost >= costs[next]
          || cost + distance(points[next], endpoint) > maximum + TOLERANCE
          || collides(footprints[current], footprints[next])) continue;
        costs[next] = cost;
        previous[next] = current;
      }
    }
    return unknown("finite_model_and_terrain_obstacle_graph_exhausted");
  }
  return Object.freeze({ routeTo });
}
