import { createOfficialPhysicalFootprintV1, evaluateOfficialSweptPhysicalFootprintCollisionV1 } from
  './official-model-base-geometry-rules-kernel-v1.mjs';
import { getOfficialGroundSizeClearanceDiameterV13 } from './official-movement-clearance-contract-v13.mjs';
export {
  OFFICIAL_MODEL_GAP_TRANSIT_POLICY_V13,
  OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13,
  hasOfficialModelGapTransitPolicyV13,
  projectOfficialModelGapTransitStateV13,
  usesOfficialGroundSizeClearanceV13,
  getOfficialGroundSizeClearanceDiameterV13
} from './official-movement-clearance-contract-v13.mjs';

export function createOfficialGroundSizeClearanceFootprintV13(piece, actualFootprint) {
  const diameter = getOfficialGroundSizeClearanceDiameterV13(piece);
  return createOfficialPhysicalFootprintV1({ objectId: actualFootprint.objectId,
    kind: 'movement_clearance', shape: 'round', center: actualFootprint.center,
    widthMilliInches: diameter, depthMilliInches: diameter, rotationDegrees: 0 });
}

function projection(point, gap) {
  const a = gap.leftBoundary.point;
  const b = gap.rightBoundary.point;
  const x = b.xMilliInches - a.xMilliInches;
  const y = b.yMilliInches - a.yMilliInches;
  return ((point.xMilliInches - a.xMilliInches) * x
    + (point.yMilliInches - a.yMilliInches) * y) / (x * x + y * y);
}

function interpolateFootprint(start, end, ratio, clearanceDiameter) {
  return createOfficialPhysicalFootprintV1({ objectId: start.objectId, kind: start.kind,
    shape: clearanceDiameter ? 'round' : start.shape,
    center: { xMilliInches: Math.round(start.center.xMilliInches
      + ratio * (end.center.xMilliInches - start.center.xMilliInches)),
    yMilliInches: Math.round(start.center.yMilliInches
      + ratio * (end.center.yMilliInches - start.center.yMilliInches)) },
    widthMilliInches: clearanceDiameter || start.widthMilliInches,
    depthMilliInches: clearanceDiameter || start.depthMilliInches,
    rotationDegrees: clearanceDiameter ? 0
      : start.rotationDegrees + ratio * (end.rotationDegrees - start.rotationDegrees) });
}

// Closest boundary points define a separating slab for two round models.
// Split at its borders. Only collision intervals inside a certified slab use
// Size clearance; outside intervals retain the actual complete moving base.
export function allowsOfficialModelGapSweepV13({ movingStart, movingEnd, blocker, gaps } = {}) {
  const relevant = gaps.filter(gap => gap.leftBoundary.objectId === blocker.objectId
    || gap.rightBoundary.objectId === blocker.objectId);
  if (!relevant.length) return false;
  const cuts = new Set([0, 1]);
  for (const gap of relevant) {
    const start = projection(movingStart.center, gap);
    const end = projection(movingEnd.center, gap);
    if (Math.abs(end - start) < 1e-12) continue;
    for (const edge of [0, 1]) {
      const ratio = (edge - start) / (end - start);
      if (ratio > 0 && ratio < 1) cuts.add(ratio);
    }
  }
  const ratios = [...cuts].sort((a, b) => a - b);
  for (let index = 1; index < ratios.length; index += 1) {
    const from = ratios[index - 1];
    const to = ratios[index];
    const start = interpolateFootprint(movingStart, movingEnd, from);
    const end = interpolateFootprint(movingStart, movingEnd, to);
    if (!evaluateOfficialSweptPhysicalFootprintCollisionV1({ movingStart: start, movingEnd: end, blocker }).collides) continue;
    const middle = { xMilliInches: (start.center.xMilliInches + end.center.xMilliInches) / 2,
      yMilliInches: (start.center.yMilliInches + end.center.yMilliInches) / 2 };
    const certified = relevant.some(gap => {
      const location = projection(middle, gap);
      if (location < 0 || location > 1) return false;
      return !evaluateOfficialSweptPhysicalFootprintCollisionV1({
        movingStart: interpolateFootprint(movingStart, movingEnd, from, gap.requiredWidthMilliInches),
        movingEnd: interpolateFootprint(movingStart, movingEnd, to, gap.requiredWidthMilliInches),
        blocker,
      }).collides;
    });
    if (!certified) return false;
  }
  return true;
}
