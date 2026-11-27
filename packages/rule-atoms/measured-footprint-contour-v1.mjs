import { fullTurn, arithmeticSlack, transverseRoots, cosineOffsets, coversIntervals }
  from './footprint-range-intervals-v1.mjs';

export function readMeasuredFootprintContourV1(vertices, width, depth) {
  if (!Array.isArray(vertices) || vertices.length < 3
    || !Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(depth) || depth <= 0) {
    throw new Error('MODEL_BASE_GEOMETRY_CONTOUR_INVALID');
  }
  const points = Array.from(vertices, vertex => {
    const { xMilliInches, yMilliInches } = vertex ?? {};
    if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches)
      || Math.abs(xMilliInches) > Math.ceil(width / 2) || Math.abs(yMilliInches) > Math.ceil(depth / 2)) {
      throw new Error('MODEL_BASE_GEOMETRY_CONTOUR_POINT_INVALID');
    }
    return { xMilliInches, yMilliInches };
  });
  const span = key => Math.max(...points.map(p => p[key])) - Math.min(...points.map(p => p[key]));
  if (span('xMilliInches') !== width || span('yMilliInches') !== depth) {
    throw new Error('MODEL_BASE_GEOMETRY_CONTOUR_EXTENT_MISMATCH');
  }
  let angleSum = 0;
  let winding = 0;
  for (const [index, a] of points.entries()) {
    const b = points[(index + 1) % points.length];
    const cross = a.xMilliInches * b.yMilliInches - a.yMilliInches * b.xMilliInches;
    const dot = a.xMilliInches * b.xMilliInches + a.yMilliInches * b.yMilliInches;
    if (!cross || (winding && Math.sign(cross) !== winding)) {
      throw new Error('MODEL_BASE_GEOMETRY_CONTOUR_NOT_STAR_SHAPED');
    }
    winding = Math.sign(cross);
    angleSum += Math.atan2(cross, dot);
  }
  // One ordered turn with the center strictly inside every edge creates a
  // disjoint fan of triangles, including for a concave contact outline.
  if (Math.abs(Math.abs(angleSum) - fullTurn) > arithmeticSlack) {
    throw new Error('MODEL_BASE_GEOMETRY_CONTOUR_NOT_SIMPLE');
  }
  if (winding < 0) points.reverse();
  const first = points.reduce((best, current, index) => {
    const previous = points[best];
    return current.xMilliInches < previous.xMilliInches
      || (current.xMilliInches === previous.xMilliInches && current.yMilliInches < previous.yMilliInches)
      ? index : best;
  }, 0);
  return [...points.slice(first), ...points.slice(0, first)];
}

// Both the measured contour and the orthogonal cross have their centre in the
// kernel of the polygon. Adjacent vertices form a convex fan without filling notches.
export function centeredFootprintTrianglesV1(footprint) {
  return footprint.vertices.map((start, index, vertices) => ({
    shape: "triangle", center: footprint.center,
    vertices: [footprint.center, start, vertices[(index + 1) % vertices.length]],
  }));
}

function lineCoverageEvents(start, end, edges, range) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  if (!length) return [];
  const ux = dx / length;
  const uy = dy / length;
  return edges.flatMap(({ x, y, nx, ny }) => {
    const cx = x - start[0];
    const cy = y - start[1];
    const delta = nx * dx + ny * dy;
    const offset = nx * cx + ny * cy;
    const lines = delta ? [(offset - range) / delta, (offset + range) / delta] : [];
    const arc = transverseRoots(cx * ux + cy * uy, cx * uy - cy * ux, range);
    return [...lines, ...arc.map(t => t / length)];
  });
}

function circleCoverageEvents(center, radius, edges, range) {
  return edges.flatMap(({ x, y, nx, ny }) => {
    const dx = x - center[0];
    const dy = y - center[1];
    const normalAngle = Math.atan2(ny, nx);
    const offset = nx * dx + ny * dy;
    const lines = [offset - range, offset + range].flatMap(value =>
      cosineOffsets(value / radius).map(angle => normalAngle + angle));
    const distance = Math.hypot(dx, dy);
    if (!distance) return lines;
    const bearing = Math.atan2(dy, dx);
    const cosine = (radius ** 2 + (distance - range) * (distance + range)) / (2 * radius * distance);
    return [...lines, ...cosineOffsets(cosine).map(angle => bearing + angle)];
  }).map(angle => ((angle % fullTurn) + fullTurn) % fullTurn);
}

function offsetContainsPoint([x, y], edges, range) {
  let inside = false;
  for (const edge of edges) {
    const dx = x - edge.x;
    const dy = y - edge.y;
    const along = Math.max(0, Math.min(edge.length, dx * edge.ux + dy * edge.uy));
    if (Math.hypot(dx - along * edge.ux, dy - along * edge.uy) <= range + arithmeticSlack) return true;
    if ((edge.y > y) !== (edge.nextY > y) && dx < dy * edge.ux / edge.uy) inside = !inside;
  }
  return inside;
}

export function isTargetWhollyWithinMeasuredContourRangeV1(source, target, range) {
  const angle = source.rotationDegrees * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const inSourceFrame = point => {
    const dx = point.xMilliInches - source.center.xMilliInches;
    const dy = point.yMilliInches - source.center.yMilliInches;
    return [dx * cosine + dy * sine, -dx * sine + dy * cosine];
  };
  const outline = source.localVerticesMilliInches;
  const edges = outline.map(({ xMilliInches: x, yMilliInches: y }, index) => {
    const next = outline[(index + 1) % outline.length];
    const dx = next.xMilliInches - x;
    const dy = next.yMilliInches - y;
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;
    return { x, y, nextY: next.yMilliInches, length, ux, uy, nx: -uy, ny: ux };
  });
  const covered = point => offsetContainsPoint(point, edges, range);
  // The offset of a shape star-shaped around its center is also star-shaped.
  // A ray from that center through the target interior reaches its boundary.
  // On each boundary interval membership changes only on a line or vertex arc.
  if (target.shape === 'round') {
    const center = inSourceFrame(target.center);
    const radius = target.radiusMilliInches;
    if (!radius) return covered(center);
    return coversIntervals(circleCoverageEvents(center, radius, edges, range), fullTurn,
      t => [center[0] + radius * Math.cos(t), center[1] + radius * Math.sin(t)], covered);
  }
  const vertices = target.vertices.map(inSourceFrame);
  return vertices.every((start, index) => {
    const end = vertices[(index + 1) % vertices.length];
    return coversIntervals(lineCoverageEvents(start, end, edges, range), 1,
      t => [start[0] + t * (end[0] - start[0]), start[1] + t * (end[1] - start[1])], covered);
  });
}
