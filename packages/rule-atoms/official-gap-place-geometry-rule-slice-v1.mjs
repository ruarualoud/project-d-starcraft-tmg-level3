import {
  OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_TYPE,
  OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID,
  OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_VERSION,
  OFFICIAL_GAP_PLACE_GEOMETRY_NEW_ATOM_IDS,
  OFFICIAL_GAP_PLACE_GEOMETRY_PARAMETER_KIND,
  OFFICIAL_GAP_PLACE_GEOMETRY_TRANSITION_SCHEMA,
} from "./official-gap-place-geometry-executor-v1.mjs";
import { createOfficialGapPlaceGeometryRelationshipExtensionV1 } from
  "./official-gap-place-geometry-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { createOfficialDirectMovementDisplacementRelationshipExtensionV1 } from
  "./official-direct-movement-displacement-relationship-contract-v1.mjs";

const CONFIG = Object.freeze({
  prefix: "GAP_PLACE_GEOMETRY",
  schema: "starcraft_tmg_official_gap_place_geometry_rule_slice_v1",
  catalogueVersion: "0.82.0-official-gap-place-geometry",
  ordinal: 82,
  previous: {
    schema: "starcraft_tmg_official_direct_movement_displacement_rule_slice_v1",
    sliceHash: "1638c6c7521ad15fe874cf34fcbc4afa01eb2064203c437c64385c1c72935feb",
    catalogueHash: "6383216ec3ff3704ac8ce865f3b135b750dccd367be82f3cb1810c8b74206bcd",
    runtimeHash: "f312f141d77dcb6415aca3f78db455e9fb11e76495b815253f87c18a4af1af11",
    graphHash: "b7e502bea3ed2b29901fbd2113c7ee201314dd693005840ed8735440e5dabfcf",
    relationship: createOfficialDirectMovementDisplacementRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "aa91a22fb6ce0113e35374d86463e7cf212f46b03b9300b4e3428dd320663165",
    catalogueHash: "05452ecc9cafd3b0bebf9e392dba5f7fda6d07fd1a5e6864666df62a7f25a4d8",
    runtimeHash: "1eedc98e0a0b21ef1a078dadc5ef10b150415bdb410561eb46528d15d9cae979",
    graphHash: "cc5dec0076e18658126a7f01424c8bfdb8277774d1d953cb8404d8ea2e255f63",
  },
  counts: { previousExecutable: 510, previousReview: 402,
    executable: 525, review: 387, displayOnly: 114, executors: 51 },
  remainingSlices: 29,
  newAtomIds: OFFICIAL_GAP_PLACE_GEOMETRY_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID,
    version: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_TYPE],
    transitionSchema: OFFICIAL_GAP_PLACE_GEOMETRY_TRANSITION_SCHEMA },
  actionType: OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_TYPE,
  parameterKind: OFFICIAL_GAP_PLACE_GEOMETRY_PARAMETER_KIND,
  relationship: createOfficialGapPlaceGeometryRelationshipExtensionV1,
  timing: { phase: "any_effect_window", window: "gap_or_place_geometry", priority: 182 },
  preconditions: [{ predicateId: "gap_place.complete_rules_owned_geometry_denominator",
    inputSchema: "starcraft_tmg_official_gap_place_geometry_pending_v1",
    failureCode: "GAP_PLACE_PROCEDURE_CERTIFICATE_REQUIRED" },
  { predicateId: "gap_place.uses_pinned_official_rule_source",
    inputSchema: "starcraft_tmg_official_development_tranche_source_lock_audit_v1",
    failureCode: "GAP_PLACE_SOURCE_LOCK_BINDING_INVALID" }],
  chance: { kind: "none" },
  rejectionCodes: ["GAP_PLACE_ACTION_INVALID", "GAP_PLACE_ACTION_STALE",
    "GAP_PLACE_PENDING_INVALID", "GAP_PLACE_CHOICE_INVALID",
    "GAP_PLACE_PARAMETER_DOMAIN_STALE", "GAP_PLACE_SOURCE_LOCK_BINDING_INVALID"],
  evidenceSlug: "gap-place-geometry-v1",
  evidenceFixtures: { positive: "size-two-one-inch-gap-and-place-range",
    negative: "large-narrow-opening-overlap-and-engagement-reject",
    interaction: "flying-bypass-and-assault-place-exception",
    lifecycle: "rules-owned-geometry-authority-apply" },
  executableScope:
    "official_gap_clearance_and_place_geometry_conformance_current_source_lock",
  progressKey: "gapPlaceGeometryProgress",
  progress: { promotedAtomCount: 15, physicalGapDefinitionExecutable: true,
    sizeTwoOrLowerOneInchThresholdExecutable: true,
    sizeThreeOrHigherThreeInchThresholdExecutable: true,
    endpointBaseFitIndependentOfTransitClearanceExecutable: true,
    terrainOpeningAndSetupAgreementExecutable: true,
    movementTypeScopeExecutable: true, flyingGapBypassExecutable: true,
    flyingLegalEndpointExecutable: true, placeLeadingNominationExecutable: true,
    placeWhollyWithinDistanceExecutable: true, placeUnitCoherencyExecutable: true,
    placeIgnoresPathGapAndElevationExecutable: true,
    placeEnemySeparationAndAssaultExceptionExecutable: true,
    continuousGeometryProductionQuarantinedUntilTerrainAndFormationSlices: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "gap_place_geometry_v1",
  frozenExecutorIds: ["authority.direct-movement-displacement-v1",
    "authority.marine-move-geometry-v2"],
  judgeTests: 25,
  agentDecisionEvidence:
    "rules_owned_gap_threshold_endpoint_fit_and_place_plan_choice",
  userVisibleChecks: ["gap_width_size_threshold_and_opening_agreement_are_explained",
    "place_receipt_distinguishes_ignored_transit_geometry_from_legal_endpoint_geometry"],
  blocks: ["three_hundred_eighty_seven_actionable_atoms_remain_non_executable",
    "general_wholly_within_terrain_and_formation_geometry_waits_for_slices_83_84_87",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});
export function createOfficialGapPlaceGeometryRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialGapPlaceGeometryRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
