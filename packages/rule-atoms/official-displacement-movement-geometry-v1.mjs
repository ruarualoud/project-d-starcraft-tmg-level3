// Shared by Native displacement adjudication and the read-only battlefield preview.
export function getOfficialDisplacementMovementGeometryV1(action) {
  return action.spatialPlan || action.chargeResolutionPlan?.geometry
    || action.relocationPlan?.geometryPlan || action.meleePlan?.closeRanksGeometry;
}
