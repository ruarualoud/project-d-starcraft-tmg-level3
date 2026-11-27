import { fullTurn, arithmeticSlack, transverseRoots, cosineOffsets, coversIntervals }
  from './footprint-range-intervals-v1.mjs';

function roundedRectangle(width, depth, range) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  return {
    halfWidth,
    halfDepth,
    sides: [[0, -halfWidth - range], [0, halfWidth + range],
      [1, -halfDepth - range], [1, halfDepth + range]],
    corners: [[-halfWidth, -halfDepth], [-halfWidth, halfDepth],
      [halfWidth, -halfDepth], [halfWidth, halfDepth]],
  };
}

function lineEvents(start, end, sides, corners, range) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  if (!length) return [];
  const ux = dx / length;
  const uy = dy / length;
  const delta = [dx, dy];
  const events = sides.filter(([axis]) => delta[axis] !== 0)
    .map(([axis, value]) => (value - start[axis]) / delta[axis]);
  for (const [x, y] of corners) {
    const cx = x - start[0];
    const cy = y - start[1];
    events.push(...transverseRoots(cx * ux + cy * uy, cx * uy - cy * ux, range).map(t => t / length));
  }
  return events;
}

function circleEvents(center, radius, sides, corners, range) {
  const events = sides.flatMap(([axis, value]) => cosineOffsets((value - center[axis]) / radius)
    .map(angle => angle + axis * Math.PI / 2));
  for (const [x, y] of corners) {
    const dx = x - center[0];
    const dy = y - center[1];
    const distance = Math.hypot(dx, dy);
    if (!distance) continue;
    const bearing = Math.atan2(dy, dx);
    const cosine = (radius ** 2 + (distance - range) * (distance + range)) / (2 * radius * distance);
    events.push(...cosineOffsets(cosine).map(offset => bearing + offset));
  }
  return events.map(angle => ((angle % fullTurn) + fullTurn) % fullTurn);
}

export function isTargetWhollyWithinOrthogonalCrossRangeV1(source, target, range) {
  const angle = source.rotationDegrees * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const inSourceFrame = point => {
    const dx = point.xMilliInches - source.center.xMilliInches;
    const dy = point.yMilliInches - source.center.yMilliInches;
    return [dx * cosine + dy * sine, -dx * sine + dy * cosine];
  };
  const rectangles = [
    roundedRectangle(source.widthMilliInches, source.horizontalArmDepthMilliInches, range),
    roundedRectangle(source.verticalArmWidthMilliInches, source.depthMilliInches, range),
  ];
  const covered = ([x, y]) => rectangles.some(({ halfWidth, halfDepth }) => (
    Math.hypot(Math.max(0, Math.abs(x) - halfWidth), Math.max(0, Math.abs(y) - halfDepth))
      <= range + arithmeticSlack
  ));
  const sides = rectangles.flatMap(rectangle => rectangle.sides);
  const corners = rectangles.flatMap(rectangle => rectangle.corners);

  // Distance to either centred rectangle cannot decrease along a ray directed
  // away from the source centre. Covering the target boundary covers its interior.
  if (target.shape === "round") {
    const center = inSourceFrame(target.center);
    const radius = target.radiusMilliInches;
    if (!radius) return covered(center);
    return coversIntervals(circleEvents(center, radius, sides, corners, range), fullTurn,
      t => [center[0] + radius * Math.cos(t), center[1] + radius * Math.sin(t)], covered);
  }

  const vertices = target.vertices.map(inSourceFrame);
  return vertices.every((start, index) => {
    const end = vertices[(index + 1) % vertices.length];
    return coversIntervals(lineEvents(start, end, sides, corners, range), 1,
      t => [start[0] + t * (end[0] - start[0]), start[1] + t * (end[1] - start[1])], covered);
  });
}
