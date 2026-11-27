// Sufficient continuous-path lower bound. Sampled lines select constraints,
// not routes/endpoints. Each line retains every continuous allowed crossing.
const SAFETY = 2;
const MAX_CUTS = 256;
const MAX_VERTICES = 2048;

function disksFor(blockers) {
  return blockers.flatMap(b => {
    if (!b.rectangle) return [{ ...b.center, radius: b.clearance }];
    const r = b.rectangle;
    // Every disk is INSIDE the leader-center forbidden region of this exact
    // rectangle. A bounding box of a logical region would be unsound here.
    return [
      { x: (r.minX + r.maxX) / 2, y: (r.minY + r.maxY) / 2,
        radius: b.clearance + Math.floor(Math.min(r.maxX - r.minX, r.maxY - r.minY) / 2) },
      ...[r.minX, r.maxX].flatMap(x => [r.minY, r.maxY]
        .map(y => ({ x, y, radius: b.clearance }))),
    ];
  }).filter(b => b.radius > 0);
}

function evaluateEndpointDiskBound({
  leader, target, blockers, maximum, radius,
}) {
  const d = Math.hypot(target.x - leader.x, target.y - leader.y);
  if (!(d > radius) || !Number.isSafeInteger(maximum)) return null;
  const ex = (target.x - leader.x) / d, ey = (target.y - leader.y) / d;
  const disks = disksFor(blockers).map(b => ({
    u: (b.x - leader.x) * ex + (b.y - leader.y) * ey,
    v: -(b.x - leader.x) * ey + (b.y - leader.y) * ex,
    radius: b.radius,
  }));
  const cuts = [];
  const step = Math.max(250, Math.ceil((d - radius) / MAX_CUTS));
  for (let u = step; u < d - radius - SAFETY; u += step) {
    const intervals = disks.flatMap(b => {
      const du = Math.abs(b.u - u);
      if (du >= b.radius) return [];
      const half = Math.sqrt(b.radius ** 2 - du ** 2);
      // Inward rounding/shrinking makes the relaxed paths more permissive.
      const left = Math.ceil(b.v - half + 1e-7);
      const right = Math.floor(b.v + half - 1e-7);
      return left < right ? [{ left, right }] : [];
    }).sort((a, b) => a.left - b.left || a.right - b.right);
    const union = [];
    for (const interval of intervals) {
      const last = union.at(-1);
      if (!last || interval.left >= last.right) union.push({ ...interval });
      else last.right = Math.max(last.right, interval.right);
    }
    cuts.push({ u, intervals: union });
  }
  const points = [{ u: 0, v: 0, cut: -1 }];
  cuts.forEach((c, cut) => c.intervals.forEach(i => {
    points.push({ u: c.u, v: i.left, cut }, { u: c.u, v: i.right, cut });
  }));
  points.push({ u: d, v: 0, cut: cuts.length });
  if (points.length > MAX_VERTICES) return null;
  points.sort((a, b) => a.u - b.u || a.v - b.v);
  const costs = Array(points.length).fill(Infinity);
  costs[0] = 0;
  // Connecting an actual path's ordered crossings cannot lengthen it. In the
  // relaxed line-only problem, an unconstrained bend straightens; necessary
  // bends occur at interval endpoints. This complete DAG is not a route sample.
  for (let j = 1; j < points.length; j++) {
    const b = points[j];
    for (let i = 0; i < j; i++) {
      const a = points[i];
      if (!Number.isFinite(costs[i]) || b.u <= a.u) continue;
      const cost = costs[i] + Math.hypot(b.u - a.u, b.v - a.v);
      if (cost >= costs[j]) continue;
      let allowed = true;
      for (let k = a.cut + 1; k < b.cut; k++) {
        const c = cuts[k];
        const v = a.v + (b.v - a.v) * (c.u - a.u) / (b.u - a.u);
        // Relax by epsilon rather than accidentally closing a touching gap.
        if (c.intervals.some(q => v > q.left + 1e-7 && v < q.right - 1e-7)) {
          allowed = false;
          break;
        }
      }
      if (allowed) costs[j] = cost;
    }
  }
  const shortest = costs.at(-1);
  if (!Number.isFinite(shortest)) return null;
  // All selected cuts precede the ENTIRE enlarged engagement disk. Append a
  // segment from any engaging endpoint to the target center (at most radius):
  // it crosses no selected cut. Triangle inequality yields this lower bound.
  const lower = Math.floor(shortest - radius - SAFETY);
  if (lower <= maximum + SAFETY) return null;
  return { proof: 'multi_oblique_occupied_cross_sections',
    lowerBoundMilliInches: lower,
    cutOriginMilliInches: { x: leader.x, y: leader.y },
    cutUnitDirection: { x: ex, y: ey },
    enlargedEngagementRadiusMilliInches: radius,
    visibilityVertexCount: points.length,
    allContinuousCrossingsCovered: true,
    maximumGraphSizeReturnsUnknown: true,
    cutPlanes: cuts.map(c => ({ advanceMilliInches: c.u,
      conservativeForbiddenNormalIntervals: c.intervals.map(i => [i.left, i.right]) })),
  };
}

// Same continuous-crossing relaxation, with an explicit enclosing endpoint
// disk. Used only for complete cell covers; this is never a sampled-path proof.
export function evaluateOfficialChargeEndpointDiskDistanceProofV1({leader, target, blockers, maximum, radius}) {
  if (!Number.isFinite(radius) || radius < 0) return null;
  return evaluateEndpointDiskBound({leader,target,blockers,maximum,radius});
}
export function evaluateOfficialChargeMultiCutDistanceProofV1({leader,target,blockers,maximum}) {
  return evaluateEndpointDiskBound({leader,target,blockers,maximum,
    radius:leader.radiusCeil + target.radiusCeil + 1002});
}
