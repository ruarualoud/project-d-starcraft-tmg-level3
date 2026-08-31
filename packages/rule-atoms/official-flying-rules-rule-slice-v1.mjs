import {
  OFFICIAL_FLYING_RULES_ACTION_TYPE,
  OFFICIAL_FLYING_RULES_EXECUTOR_ID,
  OFFICIAL_FLYING_RULES_EXECUTOR_VERSION,
  OFFICIAL_FLYING_RULES_NEW_ATOM_IDS,
  OFFICIAL_FLYING_RULES_PARAMETER_KIND,
  OFFICIAL_FLYING_RULES_TRANSITION_SCHEMA,
} from "./official-flying-rules-executor-v1.mjs";
import { createOfficialFlyingRulesRelationshipExtensionV1 } from
  "./official-flying-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { createOfficialGapPlaceGeometryRelationshipExtensionV1 } from
  "./official-gap-place-geometry-relationship-contract-v1.mjs";

const CONFIG = Object.freeze({
  prefix: "FLYING_RULES",
  schema: "starcraft_tmg_official_flying_rules_rule_slice_v1",
  catalogueVersion: "0.83.0-official-flying-rules",
  ordinal: 83,
  previous: {
    schema: "starcraft_tmg_official_gap_place_geometry_rule_slice_v1",
    sliceHash: "aa91a22fb6ce0113e35374d86463e7cf212f46b03b9300b4e3428dd320663165",
    catalogueHash: "05452ecc9cafd3b0bebf9e392dba5f7fda6d07fd1a5e6864666df62a7f25a4d8",
    runtimeHash: "1eedc98e0a0b21ef1a078dadc5ef10b150415bdb410561eb46528d15d9cae979",
    graphHash: "cc5dec0076e18658126a7f01424c8bfdb8277774d1d953cb8404d8ea2e255f63",
    relationship: createOfficialGapPlaceGeometryRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "8c465373e5fa35add7f9ad6956d237f4ec0c6ce40d603080b544ca7f0c08dd8d",
    catalogueHash: "ecc5be6b5335ed5ddce9a73146934e6ae721505f35827b8b204caf448803e850",
    runtimeHash: "63ca12125a43107126093177a93eb678dc42a0d710264dc64f351227c7af5f72",
    graphHash: "362c3a13fcce077ead7c4f16b3a38a20faebe35f46ac6a9353dfbb02e17a1dcc",
  },
  counts: { previousExecutable: 525, previousReview: 387,
    executable: 549, review: 363, displayOnly: 114, executors: 52 },
  remainingSlices: 28,
  newAtomIds: OFFICIAL_FLYING_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_FLYING_RULES_EXECUTOR_ID,
    version: OFFICIAL_FLYING_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_FLYING_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_FLYING_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_FLYING_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_FLYING_RULES_PARAMETER_KIND,
  relationship: createOfficialFlyingRulesRelationshipExtensionV1,
  timing: { phase: "any_effect_window", window: "flying_rules_procedure", priority: 183 },
  preconditions: [{ predicateId: "flying.complete_rules_owned_plan_denominator",
    inputSchema: "starcraft_tmg_official_flying_rules_pending_v1",
    failureCode: "FLYING_PROCEDURE_CERTIFICATE_REQUIRED" },
  { predicateId: "flying.uses_pinned_official_rule_source",
    inputSchema: "starcraft_tmg_official_development_tranche_source_lock_audit_v1",
    failureCode: "FLYING_SOURCE_LOCK_BINDING_INVALID" }],
  chance: { kind: "none" },
  rejectionCodes: ["FLYING_ACTION_INVALID", "FLYING_ACTION_STALE",
    "FLYING_PENDING_INVALID", "FLYING_CHOICE_INVALID",
    "FLYING_PARAMETER_DOMAIN_STALE", "FLYING_SOURCE_LOCK_BINDING_INVALID"],
  evidenceSlug: "flying-rules-v1",
  evidenceFixtures: { positive: "point-to-point-flight-stand-and-cover",
    negative: "charge-enemy-flying-endpoint-and-coherency-reject",
    interaction: "ground-contact-grass-cover-and-elevation",
    lifecycle: "rules-owned-flying-authority-apply" },
  executableScope:
    "official_flying_movement_coherency_grass_cover_and_role_restrictions_current_source_lock",
  progressKey: "flyingRulesProgress",
  progress: { promotedAtomCount: 24, flightStandBottomMeasurementExecutable: true,
    horizontalPointToPointMovementExecutable: true,
    terrainAndModelTransitBypassExecutable: true,
    enemyFlyingEndpointSeparationExecutable: true,
    groundBaseContactWithoutEngagementExecutable: true,
    flyingCoherencyLinkBypassExecutable: true,
    grassOverflightPreservationAndEndpointRemovalExecutable: true,
    chargeCombatAndMissionRestrictionsExecutable: true,
    fullCoverIgnoreAndNonFlyingDirectCoverRetentionExecutable: true,
    flyingEffectiveSizeAndTerrainContributionExecutable: true,
    highGroundCoverAndLowerElevationOriginExceptionsExecutable: true,
    officialCurrentFlyingCarrier: "Point Defense Drone",
    officialCurrentFlyingCarrierSpeed: "-",
    currentOfficialMovableFlyingCarrierAvailable: false,
    productionGeometryQuarantinedUntilMovableCarrierAndTerrainSlices: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "flying_rules_v1",
  frozenExecutorIds: ["authority.gap-place-geometry-v1",
    "authority.marine-move-geometry-v2"],
  judgeTests: 28,
  agentDecisionEvidence:
    "rules_owned_flying_move_cover_grass_and_participation_plan_choice",
  userVisibleChecks: [
    "flying_receipt_explains_point_to_point_endpoint_and_coherency_rules",
    "cover_receipt_explains_ignored_full_cover_and_retained_other_model_rules",
    "official_point_defense_drone_null_speed_and_generic_geometry_quarantine_are_visible",
  ],
  blocks: ["three_hundred_sixty_three_actionable_atoms_remain_non_executable",
    "general_terrain_elevation_and_base_geometry_waits_for_slices_84_85_87",
    "no_current_official_movable_flying_carrier_or_flight_stand_geometry_record",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});
export function createOfficialFlyingRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialFlyingRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
