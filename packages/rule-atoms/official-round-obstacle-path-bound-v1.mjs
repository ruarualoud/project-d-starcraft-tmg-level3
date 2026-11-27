const EPSILON = 1e-7;
const TAU = 2 * Math.PI;

const point = row => ({ x: row.xMilliInches, y: row.yMilliInches });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angle = (center, value) => Math.atan2(value.y - center.y, value.x - center.x);
const outside = (value, discs) => discs.every(disc => distance(value, disc) >= disc.radius - EPSILON);

function segmentClear(left, right, discs) {
  const dx = right.x - left.x, dy = right.y - left.y;
  const squaredLength = dx * dx + dy * dy;
  if (squaredLength <= EPSILON ** 2) return true;
  return discs.every(disc => {
    const position = Math.max(0, Math.min(1,
      ((disc.x - left.x) * dx + (disc.y - left.y) * dy) / squaredLength));
    return distance(disc, { x: left.x + position * dx, y: left.y + position * dy }) >= disc.radius - EPSILON;
  });
}

// The two unit normals whose projection onto the center line is `ratio`.
function normals(left, right, ratio) {
  if (Math.abs(ratio) > 1 + EPSILON) return [];
  const separation = distance(left, right);
  if (separation <= EPSILON) return [];
  const dx = (right.x - left.x) / separation;
  const dy = (right.y - left.y) / separation;
  const along = Math.max(-1, Math.min(1, ratio));
  const across = Math.sqrt(1 - along * along);
  return [-across, across].map(sign => ({ x: dx * along - dy * sign, y: dy * along + dx * sign }));
}

function offset(disc, normal, radius = disc.radius) {
  return { x: disc.x + radius * normal.x, y: disc.y + radius * normal.y };
}

function circleIntersections(left, right) {
  const d = distance(left, right);
  if (d <= EPSILON) return [];
  const crossing = (left.radius ** 2 - right.radius ** 2 + d ** 2) / (2 * left.radius * d);
  return normals(left, right, crossing).map(normal => offset(left, normal));
}

function arcNeighbours(vertices, discs) {
  const edges = vertices.map(() => []);
  for (const disc of discs) {
    const contacts = vertices.flatMap((value, index) =>
      Math.abs(distance(value, disc) - disc.radius) <= EPSILON ? [{ index, angle: angle(disc, value) }] : []);
    contacts.sort((a, b) => a.angle - b.angle || a.index - b.index);
    if (contacts.length < 2) continue;
    for (const [index, from] of contacts.entries()) {
      const to = contacts[(index + 1) % contacts.length];
      const sweep = to.angle - from.angle + (index === contacts.length - 1 ? TAU : 0);
      if (sweep <= EPSILON) continue;
      const middle = from.angle + sweep / 2;
      // All boundary intersections are vertices, so this arc cannot change
      // from inside to outside another disc between consecutive contacts.
      if (!outside(offset(disc, { x: Math.cos(middle), y: Math.sin(middle) }), discs)) continue;
      const length = sweep * disc.radius;
      edges[from.index].push({ to: to.index, length, blockerId: disc.id, sweep });
      edges[to.index].push({ to: from.index, length, blockerId: disc.id, sweep: -sweep });
    }
  }
  return edges;
}

/** Exact geodesic of the selected *disc relaxation*. Endpoints and tangencies
 * are continuous. A product move still needs the full Native geometry check.
 */
export function measureOfficialRoundObstacleUnionPathBoundV1(from, to, blockers) {
  const start = point(from), end = point(to);
  const discs = blockers.map(blocker => ({ ...point(blocker.center), id: blocker.id,
    radius: blocker.forbiddenRadiusMilliInches }));
  if ([start, end, ...discs].some(value => !Number.isFinite(value.x) || !Number.isFinite(value.y))
    || discs.some(disc => !Number.isFinite(disc.radius) || disc.radius <= 0)
    || !outside(start, discs) || !outside(end, discs)) return null;
  if (segmentClear(start, end, discs)) return { minimumLengthMilliInches: distance(start, end),
    vertexCount: 2, segments: [{ kind: 'line', end: to }] };

  // A contained disc cannot contribute an exterior boundary. Equal discs
  // retain the first identity so duplicate blocker records cannot erase one.
  const active = discs.filter((disc, index) => !discs.some((other, peer) => peer !== index
    && distance(disc, other) + disc.radius <= other.radius
    && (other.radius > disc.radius || peer < index)));
  const vertices = [start, end];
  const add = value => {
    if (!vertices.some(existing => distance(value, existing) <= EPSILON)) vertices.push(value);
  };
  const corners = [start, end];
  for (const [index, left] of active.entries()) {
    for (const right of active.slice(index + 1)) {
      const separation = distance(left, right);
      for (const crossing of circleIntersections(left, right)) corners.push(crossing);
      for (const side of [1, -1]) {
        for (const normal of normals(left, right, (left.radius - side * right.radius) / separation)) {
          add(offset(left, normal));
          add(offset(right, normal, side * right.radius));
        }
      }
    }
  }
  for (const corner of corners) {
    add(corner);
    for (const disc of active) {
      for (const normal of normals(disc, corner, disc.radius / distance(disc, corner))) {
        add(offset(disc, normal));
      }
    }
  }

  // Retain intersection and tangent vertices even if occluded so their circle
  // contacts split arcs. Occluded vertices never receive legal straight edges.
  const visible = vertices.map(value => outside(value, active));
  const arcs = arcNeighbours(vertices, active);
  const lengths = vertices.map(() => Infinity);
  const preceding = vertices.map(() => []);
  const visited = new Set();
  lengths[0] = 0;
  function relax(fromIndex, edge) {
    const total = lengths[fromIndex] + edge.length;
    if (total > lengths[edge.to] + EPSILON || visited.has(edge.to) || edge.length <= EPSILON) return;
    if (total < lengths[edge.to] - EPSILON) preceding[edge.to] = [];
    lengths[edge.to] = Math.min(lengths[edge.to], total);
    preceding[edge.to].push({ ...edge, from: fromIndex });
  }
  while (visited.size < vertices.length) {
    let nearest = -1;
    for (const index of vertices.keys()) {
      if (!visited.has(index) && (nearest === -1 || lengths[index] < lengths[nearest])) nearest = index;
    }
    if (!Number.isFinite(lengths[nearest])) return null;
    if (nearest === 1) break;
    visited.add(nearest);
    for (const arc of arcs[nearest]) {
      if (visible[arc.to]) relax(nearest, arc);
    }
    for (const [index, endpoint] of vertices.entries()) {
      if (!visible[index] || visited.has(index) || !segmentClear(vertices[nearest], endpoint, active)) continue;
      relax(nearest, { to: index, length: distance(vertices[nearest], endpoint) });
    }
  }
  const coordinates = index => ({ xMilliInches: vertices[index].x, yMilliInches: vertices[index].y });
  const segment = edge => edge.blockerId === undefined ? { kind: 'line', end: coordinates(edge.to) } : {
    kind: 'arc', end: coordinates(edge.to), blockerId: edge.blockerId, sweepRadians: edge.sweep,
  };
  const segments = [];
  for (let index = 1; index !== 0;) {
    const edge = preceding[index][0];
    if (!edge) return null;
    segments.push(segment(edge));
    index = edge.from;
  }
  const shortestPathGraph = [];
  const onShortestPath = new Set([1]);
  // Positive edge lengths make this predecessor graph acyclic. Keep ties as
  // graph edges rather than enumerating a potentially exponential path list.
  for (const toIndex of onShortestPath) {
    for (const edge of preceding[toIndex]) {
      onShortestPath.add(edge.from);
      shortestPathGraph.push({ fromIndex: edge.from, toIndex, start: coordinates(edge.from), ...segment(edge) });
    }
  }
  return { minimumLengthMilliInches: lengths[1], vertexCount: vertices.length,
    segments: segments.reverse(), shortestPathGraph };
}

/** Relax the endpoint to the whole forward plane after the obstruction.
 * With one disc, either side consists of an initial tangent, an exposed
 * arc to the parallel tangent, and a straight segment to that plane. */
export function measureOfficialRoundObstacleForwardPathBoundV1(from, direction, progress, blocker) {
  const start = point(from), disc = point(blocker.center), radius = blocker.forbiddenRadiusMilliInches;
  const directionLength = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(directionLength) || directionLength <= EPSILON
    || !Number.isFinite(radius) || radius <= 0 || !Number.isFinite(progress)) return null;
  const axis = { x: direction.x / directionLength, y: direction.y / directionLength };
  const lateral = { x: -axis.y, y: axis.x };
  const centerX = disc.x - start.x, centerY = disc.y - start.y;
  const along = centerX * axis.x + centerY * axis.y;
  const across = centerX * lateral.x + centerY * lateral.y;
  if (along <= radius || progress < along + radius || Math.abs(across) >= radius - EPSILON) return null;
  const tangentLength = Math.sqrt(along ** 2 + across ** 2 - radius ** 2);
  const branches = normals(disc, start, radius / distance(disc, start)).map(normal => {
    const tangentSide = normal.x * lateral.x + normal.y * lateral.y;
    const side = Math.sign(tangentSide);
    const arc = Math.acos(Math.min(1, Math.abs(tangentSide)));
    const clearance = across + side * radius;
    const tangent = offset(disc, normal, radius);
    return { side, lengthMilliInches: tangentLength + radius * arc + progress - along,
      initialTangent: { xMilliInches: tangent.x, yMilliInches: tangent.y },
      endpoint: { xMilliInches: start.x + axis.x * progress + lateral.x * clearance,
        yMilliInches: start.y + axis.y * progress + lateral.y * clearance } };
  });
  return { blockerId: blocker.id, progress, branches,
    minimumLengthMilliInches: Math.min(...branches.map(branch => branch.lengthMilliInches)) };
}

// On a clear plane beyond every retained disc a shortest route arrives
// perpendicular to the plane. Its terminal segment comes from the start,
// an exposed intersection, or an axis-parallel tangent to a disc.
export function measureOfficialRoundObstacleUnionForwardPathBoundV1(from, direction, progress, blockers) {
  const start = point(from);
  const length = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(progress) || progress <= 0 || !Number.isFinite(length) || length <= EPSILON) return null;
  const axis = { x: direction.x / length, y: direction.y / length };
  const lateral = { x: -axis.y, y: axis.x };
  const along = value => (value.x - start.x) * axis.x + (value.y - start.y) * axis.y;
  const usable = blockers.filter(blocker => {
    const radius = blocker.forbiddenRadiusMilliInches;
    return Number.isFinite(radius) && radius > 0 && along(point(blocker.center)) + radius < progress - EPSILON;
  }).slice(0, 4);
  if (usable.length < 2) return null;
  const discs = usable.map(blocker => ({ ...point(blocker.center), radius: blocker.forbiddenRadiusMilliInches }));
  if (!outside(start, discs)) return null;

  const origins = [start];
  for (const [index, disc] of discs.entries()) {
    origins.push(offset(disc, lateral), offset(disc, lateral, -disc.radius));
    for (const other of discs.slice(index + 1)) origins.push(...circleIntersections(disc, other));
  }
  const branches = [];
  const offsets = [];
  for (const origin of origins) {
    const across = (origin.x - start.x) * lateral.x + (origin.y - start.y) * lateral.y;
    if (offsets.some(prior => Math.abs(prior - across) <= EPSILON)) continue;
    offsets.push(across);
    const endpoint = { xMilliInches: start.x + axis.x * progress + lateral.x * across,
      yMilliInches: start.y + axis.y * progress + lateral.y * across };
    const route = measureOfficialRoundObstacleUnionPathBoundV1(from, endpoint, usable);
    if (!route?.segments.length || !Number.isFinite(route.minimumLengthMilliInches)) return null;
    branches.push({ endpoint, initialTangent: route.segments[0].end, lengthMilliInches: route.minimumLengthMilliInches });
  }
  branches.sort((a, b) => a.lengthMilliInches - b.lengthMilliInches
    || a.endpoint.xMilliInches - b.endpoint.xMilliInches
    || a.endpoint.yMilliInches - b.endpoint.yMilliInches);
  const minimumLengthMilliInches = branches[0].lengthMilliInches;
  return { blockerIds: usable.map(blocker => blocker.id), progress, minimumLengthMilliInches,
    terminalProjectionCount: offsets.length,
    branches: branches.filter(branch => branch.lengthMilliInches <= minimumLengthMilliInches + EPSILON) };
}

function refinePolylineOnBoardGrid(start, trail, discs) {
  let previous = [{ value: point(start), length: 0, previous: null }];
  for (const [index, entry] of trail.entries()) {
    const center = point(entry);
    const choices = [];
    const radius = index === trail.length - 1 ? 0 : 3;
    for (let x = -radius; x <= radius; x += 1) {
      for (let y = -radius; y <= radius; y += 1) {
        const value = { x: center.x + x, y: center.y + y };
        if (outside(value, discs)) choices.push(value);
      }
    }
    const next = [];
    for (const value of choices) {
      let best = null;
      for (const candidate of previous) {
        const step = distance(candidate.value, value);
        const length = candidate.length + step;
        if (step <= 1 || (best && length >= best.length) || !segmentClear(candidate.value, value, discs)) continue;
        best = { value, length, previous: candidate };
      }
      if (best) next.push(best);
    }
    if (!next.length) return null;
    previous = next;
  }
  const path = [];
  for (let entry = previous[0]; entry.previous; entry = entry.previous) {
    path.push({ xMilliInches: entry.value.x, yMilliInches: entry.value.y });
  }
  return path.reverse();
}

/** Candidate polylines for the rounded board coordinates. The continuous
 * geodesic remains the lower bound. The caller owns full movement validation. */
export function realizeOfficialRoundObstacleGeodesicsV1(geodesic, blockers, {
  maxPaths = 8, maxBendRadians = 0.075, radialPadding = 0, refineOnGrid = false, maxWaypoints = 32,
} = {}) {
  const edgesBySource = new Map();
  for (const edge of geodesic?.shortestPathGraph || []) {
    const routes = edgesBySource.get(edge.fromIndex) || [];
    routes.push(edge);
    edgesBySource.set(edge.fromIndex, routes);
  }
  const discs = new Map(blockers.map(blocker => [blocker.id, blocker]));
  const gridDiscs = refineOnGrid ? blockers.map(blocker => ({ ...point(blocker.center),
    radius: blocker.forbiddenRadiusMilliInches })) : [];
  const snapped = ({ xMilliInches, yMilliInches }) => ({
    xMilliInches: Math.round(xMilliInches), yMilliInches: Math.round(yMilliInches),
  });
  const paths = [];
  let inspectedPaths = 0;
  function materialize(edges) {
    const sections = [];
    for (const edge of edges) {
      const previous = sections.at(-1);
      if (previous?.kind === 'arc' && edge.kind === 'arc'
        && previous.blockerId === edge.blockerId
        && Math.sign(previous.sweepRadians) === Math.sign(edge.sweepRadians)) {
        previous.sweepRadians += edge.sweepRadians;
        previous.end = edge.end;
      } else {
        sections.push({ ...edge });
      }
    }
    const trail = [];
    for (const [index, edge] of sections.entries()) {
      const next = sections[index + 1];
      if (edge.kind === 'line') {
        // A tangent line can meet the first arc tangent directly. Snapping its
        // analytic touch point first can force the polyline into the obstacle.
        if (next?.kind !== 'arc') trail.push(snapped(edge.end));
        continue;
      }
      const { center, forbiddenRadiusMilliInches } = discs.get(edge.blockerId);
      const startAngle = Math.atan2(edge.start.yMilliInches - center.yMilliInches,
        edge.start.xMilliInches - center.xMilliInches);
      const steps = Math.max(1, Math.ceil(Math.abs(edge.sweepRadians) / maxBendRadians));
      const delta = edge.sweepRadians / steps;
      const outer = (forbiddenRadiusMilliInches + radialPadding) / Math.cos(delta / 2);
      for (let index = 0; index < steps; index += 1) {
        const theta = startAngle + delta * (index + 0.5);
        trail.push(snapped({ xMilliInches: center.xMilliInches + outer * Math.cos(theta),
          yMilliInches: center.yMilliInches + outer * Math.sin(theta) }));
      }
      if (next?.kind !== 'line') trail.push(snapped(edge.end));
    }
    return trail;
  }
  function visit(index, edges) {
    if (inspectedPaths >= maxPaths) return;
    if (index === 1) {
      inspectedPaths += 1;
      const trail = materialize(edges);
      if (trail.length > maxWaypoints) return;
      const path = refineOnGrid ? refinePolylineOnBoardGrid(edges[0].start, trail, gridDiscs) : trail;
      if (path) paths.push(path);
      return;
    }
    for (const edge of edgesBySource.get(index) || []) visit(edge.toIndex, [...edges, edge]);
  }
  visit(0, []);
  return paths;
}
