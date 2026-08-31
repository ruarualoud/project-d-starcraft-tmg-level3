import {
  OFFICIAL_TERRAIN_LOS_RULES_ACTION_TYPE,
  OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID,
  OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_VERSION,
  OFFICIAL_TERRAIN_LOS_RULES_NEW_ATOM_IDS,
  OFFICIAL_TERRAIN_LOS_RULES_PARAMETER_KIND,
  OFFICIAL_TERRAIN_LOS_RULES_TRANSITION_SCHEMA,
} from "./official-terrain-los-rules-executor-v1.mjs";
import { createOfficialFlyingRulesRelationshipExtensionV1 } from
  "./official-flying-rules-relationship-contract-v1.mjs";
import { createOfficialTerrainLosRulesRelationshipExtensionV1 } from
  "./official-terrain-los-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";

const CONFIG = Object.freeze({
  prefix: "TERRAIN_LOS_RULES",
  schema: "starcraft_tmg_official_terrain_los_rules_rule_slice_v1",
  catalogueVersion: "0.84.0-official-terrain-los-rules",
  ordinal: 84,
  previous: {
    schema: "starcraft_tmg_official_flying_rules_rule_slice_v1",
    sliceHash: "8c465373e5fa35add7f9ad6956d237f4ec0c6ce40d603080b544ca7f0c08dd8d",
    catalogueHash: "ecc5be6b5335ed5ddce9a73146934e6ae721505f35827b8b204caf448803e850",
    runtimeHash: "63ca12125a43107126093177a93eb678dc42a0d710264dc64f351227c7af5f72",
    graphHash: "362c3a13fcce077ead7c4f16b3a38a20faebe35f46ac6a9353dfbb02e17a1dcc",
    relationship: createOfficialFlyingRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "dfe744261a93f20a260fd36b8c2cfc2989917ca3ef4d3b93d130dac800ef687f",
    catalogueHash: "f3a0170ba9711a4511d7803b1789658c769acf5fef87efbfd92e17b5ab6b438a",
    runtimeHash: "b61a6aacfc7db4ac6670cb08c57d35ead90758fe28c3e559237acfe2b253e324",
    graphHash: "0c5e513077b9840f6aec987cc49097fc231ab756bb22c4ce6aaf9df37c184d0c",
  },
  counts: { previousExecutable: 549, previousReview: 363,
    executable: 568, review: 344, displayOnly: 114, executors: 53 },
  remainingSlices: 27,
  newAtomIds: OFFICIAL_TERRAIN_LOS_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID,
    version: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_TERRAIN_LOS_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_TERRAIN_LOS_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_TERRAIN_LOS_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_TERRAIN_LOS_RULES_PARAMETER_KIND,
  relationship: createOfficialTerrainLosRulesRelationshipExtensionV1,
  timing: { phase: "any_effect_window", window: "terrain_or_los_procedure",
    priority: 184 },
  preconditions: [{ predicateId: "terrain_los.complete_rules_owned_plan_denominator",
    inputSchema: "starcraft_tmg_official_terrain_los_rules_pending_v1",
    failureCode: "TERRAIN_LOS_PROCEDURE_CERTIFICATE_REQUIRED" },
  { predicateId: "terrain_los.uses_pinned_official_rule_and_unit_sources",
    inputSchema: "starcraft_tmg_official_terrain_los_data_bundle_v1",
    failureCode: "TERRAIN_LOS_SOURCE_LOCK_BINDING_INVALID" }],
  chance: { kind: "none" },
  rejectionCodes: ["TERRAIN_LOS_ACTION_INVALID", "TERRAIN_LOS_ACTION_STALE",
    "TERRAIN_LOS_PENDING_INVALID", "TERRAIN_LOS_CHOICE_INVALID",
    "TERRAIN_LOS_PARAMETER_DOMAIN_STALE", "TERRAIN_LOS_SOURCE_LOCK_BINDING_INVALID",
    "TERRAIN_LOS_GEOMETRY_ARTIFACT_BINDING_INVALID"],
  evidenceSlug: "terrain-los-rules-v1",
  evidenceFixtures: { positive: "footprint-movement-and-visible-trace",
    negative: "blocking-cover-dead-zone-and-endpoint-reject",
    interaction: "aperture-close-quarters-and-top-surface",
    lifecycle: "rules-owned-terrain-los-authority-apply" },
  executableScope:
    "official_terrain_footprint_leading_model_blocking_cover_dead_zone_and_visibility_current_source_lock",
  progressKey: "terrainLosRulesProgress",
  progress: { promotedAtomCount: 19,
    officialCurrentUnitProfileCount: 26,
    officialCurrentPrintedSizeProfileCount: 25,
    officialCurrentNullSizeFlyingProfileCount: 1,
    terrainSetupFootprintAgreementExecutable: true,
    movementAndLineOfSightOpeningAgreementsIndependentExecutable: true,
    blockingTerrainMovementThresholdExecutable: true,
    leadingModelSweptRoundBaseTransitExecutable: true,
    endpointTerrainOverlapRejectionExecutable: true,
    fullCoverExecutable: true, directCoverExecutable: true,
    independentTerrainCoverAssessmentExecutable: true,
    elevationDeadZoneAndCloseQuartersExceptionExecutable: true,
    topDownSupportedSurfaceExclusionExecutable: true,
    modelVisibilityExecutable: true,
    exactSegmentRectangleGeometryExecutable: true,
    boundedTerrainShapeAuthority: "axis_aligned_rectangles",
    elevationEffectiveSizeStackingDeferredToSlice85: true,
    specialTerrainKindsDeferredToSlice86: true,
    arbitraryModelBaseShapesDeferredToSlice87: true,
    productionGeometryQuarantinedUntilSlices85To87: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "terrain_los_rules_v1",
  frozenExecutorIds: ["authority.flying-rules-v1",
    "authority.gap-place-geometry-v1", "authority.marine-move-geometry-v2"],
  judgeTests: 30,
  agentDecisionEvidence:
    "rules_owned_leading_model_terrain_and_line_of_sight_plan_choice",
  userVisibleChecks: [
    "terrain_receipt_explains_footprint_opening_and_leading_model_blocking",
    "line_of_sight_receipt_explains_full_direct_independent_and_dead_zone_results",
    "official_profile_source_and_deferred_geometry_quarantine_are_visible",
  ],
  blocks: ["three_hundred_forty_four_actionable_atoms_remain_non_executable",
    "elevation_effective_size_and_terrain_stacking_wait_for_slice_85",
    "grass_impassable_ramp_and_access_rules_wait_for_slice_86",
    "arbitrary_model_base_shapes_wait_for_slice_87",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});

export function createOfficialTerrainLosRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialTerrainLosRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
