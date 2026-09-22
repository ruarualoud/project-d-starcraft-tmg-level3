// Exact angular decomposition, not a ray/grid sample. A segment between two
// compact convex bases avoids a closed convex obstacle iff there is a strict
// separating line with one point from each base on its clear side. For normal
// n that is equivalent to h_left(n) > h_rect(n) and h_right(n) > h_rect(n).
// Rectangle support changes at quadrant boundaries. Each remaining sign
// change is an analytic circle/vertex-to-corner tangent, so one interior normal
// per resulting interval suffices for the continuous domain.
const TAU = Math.PI * 2;
const NUMERICAL_MARGIN = 1e-7; // milli-inches, not a game clearance allowance

function normalizeAngle(value) {
  return ((value % TAU) + TAU) % TAU;
}
function corners(rectangle) {
  return [rectangle.minXMilliInches, rectangle.maxXMilliInches].flatMap((x) =>
    [rectangle.minYMilliInches, rectangle.maxYMilliInches].map((y) => ({
      xMilliInches: x, yMilliInches: y,
    })));
}
function dot(point, normal) {
  return point.xMilliInches * normal.x + point.yMilliInches * normal.y;
}
function supportPoint(footprint, normal) {
  if (footprint.shape === "round") return {
    xMilliInches: footprint.center.xMilliInches
      + footprint.radiusMilliInches * normal.x,
    yMilliInches: footprint.center.yMilliInches
      + footprint.radiusMilliInches * normal.y,
  };
  return footprint.vertices.reduce((best, point) =>
    dot(point, normal) > dot(best, normal) ? point : best);
}
function tangentAngles(footprint, corner) {
  const points = footprint.shape === "round" ? [footprint.center] : footprint.vertices;
  const radius = footprint.shape === "round" ? footprint.radiusMilliInches : 0;
  return points.flatMap((point) => {
    const dx = point.xMilliInches - corner.xMilliInches;
    const dy = point.yMilliInches - corner.yMilliInches;
    const length = Math.hypot(dx, dy);
    // A corner inside the disk has no support-sign crossing. A coincident
    // vertex contributes zero everywhere; other vertices still define h(n).
    if (length === 0 || length < radius) return [];
    const offset = Math.acos(Math.max(-1, Math.min(1, -radius / length)));
    const angle = Math.atan2(dy, dx);
    return [normalizeAngle(angle - offset), normalizeAngle(angle + offset)];
  });
}

export function resolveConvexFootprintRectangleTraceV1(left, right, rectangle) {
  const obstacle = corners(rectangle);
  const angles = [...new Set([0, Math.PI / 2, Math.PI, 3 * Math.PI / 2,
    ...obstacle.flatMap((corner) => [left, right]
      .flatMap((footprint) => tangentAngles(footprint, corner)))])]
    .sort((a, b) => a - b);
  let numericalBoundary = false;
  for (let index = 0; index < angles.length; index += 1) {
    const start = angles[index];
    const end = angles[index + 1] ?? TAU;
    if (end <= start) continue;
    const angle = (start + end) / 2;
    const normal = { x: Math.cos(angle), y: Math.sin(angle) };
    const plane = Math.max(...obstacle.map((point) => dot(point, normal)));
    const leftWitness = supportPoint(left, normal);
    const rightWitness = supportPoint(right, normal);
    const clearance = Math.min(dot(leftWitness, normal), dot(rightWitness, normal)) - plane;
    if (clearance > NUMERICAL_MARGIN) return {
      kind: "clear", method: "analytic_convex_support_partition_v1",
      normal, leftWitness, rightWitness,
      minimumSeparatingClearanceMilliInches: clearance,
      intervalCount: angles.length,
    };
    if (clearance > -NUMERICAL_MARGIN) numericalBoundary = true;
  }
  return { kind: numericalBoundary ? "unknown_numerical_boundary" : "blocked",
    method: "analytic_convex_support_partition_v1", intervalCount: angles.length };
}
