const cross = (a, b, c) => (b.xMilliInches - a.xMilliInches) * (c.yMilliInches - a.yMilliInches)
  - (b.yMilliInches - a.yMilliInches) * (c.xMilliInches - a.xMilliInches);
const distance = (a, b) => Math.hypot(a.xMilliInches - b.xMilliInches, a.yMilliInches - b.yMilliInches);
const key = p => `${p.xMilliInches}:${p.yMilliInches}`;

function segmentEntersPolygon(from, to, polygon) {
  // Each edge defines an open convex half-plane. Clip the line parameter to
  // their intersection; an edge or corner touched at one instant is allowed.
  let enter = 0, exit = 1;
  for (const [index, a] of polygon.entries()) {
    const b = polygon[(index + 1) % polygon.length];
    const start = cross(a, b, from), end = cross(a, b, to);
    if (start <= 0 && end <= 0) return false;
    if (start <= 0) enter = Math.max(enter, start / (start - end));
    if (end <= 0) exit = Math.min(exit, start / (start - end));
    if (enter >= exit) return false;
  }
  return enter < exit;
}

function inside(point, polygon) {
  return polygon.every((start, index) => cross(start, polygon[(index + 1) % polygon.length], point) > 0);
}

export function convexHullOfficialPathPointsV1(points) {
  const unique = [...new Map(points.map(point => [key(point), point])).values()];
  unique.sort((a, b) => a.xMilliInches - b.xMilliInches || a.yMilliInches - b.yMilliInches);
  const half = rows => {
    const result = [];
    for (const point of rows) {
      while (result.length >= 2 && cross(result.at(-2), result.at(-1), point) <= 0) result.pop();
      result.push(point);
    }
    return result.slice(0, -1);
  };
  return [...half(unique), ...half(unique.toReversed())];
}

// A route generator for convex search envelopes, not a collision adjudicator.
// The caller chooses which envelopes participate, then submits every candidate
// to the authoritative spatial validator.
export function createOfficialConvexObstaclePathSearchV1(polygons) {
  const edgeClear = (a, b) => polygons.every(polygon => !segmentEntersPolygon(a, b, polygon));
  const allowed = point => polygons.every(polygon => !inside(point, polygon));
  const vertices = [...new Map(polygons.flat().filter(allowed).map(vertex => [key(vertex), vertex])).values()];
  const graph = vertices.map(() => []);
  for (const [from, start] of vertices.entries()) {
    for (let to = from + 1; to < vertices.length; to += 1) {
      if (!edgeClear(start, vertices[to])) continue;
      const length = distance(start, vertices[to]);
      graph[from].push({ to, length });
      graph[to].push({ to: from, length });
    }
  }

  function shortestPath(start, end) {
    if (!allowed(start) || !allowed(end)) return null;
    if (edgeClear(start, end)) return [start, end];
    const lengths = vertices.map(vertex => edgeClear(start, vertex) ? distance(start, vertex) : Infinity);
    const previous = vertices.map(() => -1);
    const used = new Set();
    let best = Infinity;
    let last = -1;
    while (used.size < vertices.length) {
      let nearest = -1;
      for (const index of vertices.keys()) {
        if (!used.has(index) && lengths[index] < (nearest === -1 ? best : lengths[nearest])) nearest = index;
      }
      if (nearest === -1) break;
      used.add(nearest);
      const endpoint = vertices[nearest];
      const total = lengths[nearest] + distance(endpoint, end);
      if (total < best && edgeClear(endpoint, end)) {
        best = total;
        last = nearest;
      }
      for (const { to, length } of graph[nearest]) {
        const next = lengths[nearest] + length;
        if (next >= lengths[to]) continue;
        lengths[to] = next;
        previous[to] = nearest;
      }
    }
    if (last === -1) return null;
    const path = [end];
    for (let index = last; index !== -1; index = previous[index]) path.push(vertices[index]);
    return [...path, start].reverse();
  }
  return { shortestPath, edgeClear };
}
