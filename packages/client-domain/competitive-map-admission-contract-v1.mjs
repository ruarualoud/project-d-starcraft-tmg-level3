// Browser-safe policy projection, shared by factories, existing Room views and
// planning admission. It never regenerates geometry or changes a Room freeze.
export const COMPETITIVE_MAP_ADMISSION_SCHEMA_V1 =
  "starcraft_tmg_competitive_map_admission_v1";
const SEMANTIC_POLICY = "semantic_selected_recipe_not_universal_chassis_connectivity";
const GENERIC_POLICY = "generic_balanced_layout";

export function projectCompetitiveMapRoomFreezeSummaryV1(freeze) {
  if (!freeze) return null;
  const semantic = freeze.schema ===
    "starcraft_tmg_competitive_map_semantic_room_freeze_v1";
  const admission = {
    schema: COMPETITIVE_MAP_ADMISSION_SCHEMA_V1,
    policy: semantic ? SEMANTIC_POLICY : GENERIC_POLICY,
    everySideEnterableByAtLeastOneCurrentBase: semantic
      ? freeze.everySideEnterableByAtLeastOneCurrentBase === true
      : freeze.everyEntrySegmentUsable === true,
    everyMarkerAndQuarterReachableByAtLeastOneCurrentBase: semantic
      ? freeze.everyMarkerAndQuarterReachableByAtLeastOneCurrentBase === true
      : freeze.everyMissionMarkerAndQuarterReachableByAtLeastOneCurrentBase === true,
    opposingSidesConnectedByAtLeastOneCurrentBase: semantic
      ? freeze.opposingSidesConnectedByAtLeastOneCurrentBase === true
      : freeze.opposingSidesConnectedForEveryCurrentBase === true,
  };
  const summary = {
    schemaVersion: "starcraft_tmg_competitive_map_room_freeze_summary_v1",
    seedId: freeze.seedId,
    roomFreezeHash: freeze.roomFreezeHash,
    compilationHash: freeze.compilationHash,
    missionSpatialReachabilityAuditHash: freeze.missionSpatialReachabilityAuditHash,
    // Retained diagnostics are not a second admission policy.
    everyEntrySegmentUsable: freeze.everyEntrySegmentUsable,
    opposingSidesConnectedForEveryCurrentBase: freeze.opposingSidesConnectedForEveryCurrentBase,
    everyMissionMarkerAndQuarterReachableByAtLeastOneCurrentBase:
      freeze.everyMissionMarkerAndQuarterReachableByAtLeastOneCurrentBase,
    mapAdmission: admission,
    mutationAfterRoomCreationAllowed: freeze.mutationAfterRoomCreationAllowed,
    backgroundRulesAuthority: freeze.backgroundRulesAuthority,
    trainingTruth: false,
  };
  // Factories and the JSON transport must expose exactly the same keys, even
  // when semantic freezes do not carry legacy universal diagnostic aliases.
  return Object.fromEntries(Object.entries(summary).filter(([, value]) => value !== undefined));
}

export function competitiveMapRoomSummaryAdmittedV1(summary) {
  const admission = summary?.mapAdmission;
  if (admission !== undefined) {
    return Boolean(admission?.schema === COMPETITIVE_MAP_ADMISSION_SCHEMA_V1
      && [SEMANTIC_POLICY, GENERIC_POLICY].includes(admission.policy)
      && admission.everySideEnterableByAtLeastOneCurrentBase === true
      && admission.everyMarkerAndQuarterReachableByAtLeastOneCurrentBase === true
      && admission.opposingSidesConnectedByAtLeastOneCurrentBase === true);
  }
  // Legacy passing summaries remain readable. A legacy false/unknown cannot
  // imply semantic approval without the retained, bound freeze's actual facts.
  return summary?.everyEntrySegmentUsable === true;
}
