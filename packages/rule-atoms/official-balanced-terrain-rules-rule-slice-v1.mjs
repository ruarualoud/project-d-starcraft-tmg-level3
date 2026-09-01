import {
  OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_TYPE,
  OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID,
  OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_VERSION,
  OFFICIAL_BALANCED_TERRAIN_RULES_NEW_ATOM_IDS,
  OFFICIAL_BALANCED_TERRAIN_RULES_PARAMETER_KIND,
  OFFICIAL_BALANCED_TERRAIN_RULES_TRANSITION_SCHEMA,
} from "./official-balanced-terrain-rules-executor-v1.mjs";
import { createOfficialBalancedTerrainRulesRelationshipExtensionV1 } from
  "./official-balanced-terrain-rules-relationship-contract-v1.mjs";
import { createOfficialDeploymentGeometryRulesRelationshipExtensionV1 } from
  "./official-deployment-geometry-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "BALANCED_TERRAIN_RULES",
  schema: "starcraft_tmg_official_balanced_terrain_rules_rule_slice_v1",
  catalogueVersion: "0.108.0-official-balanced-terrain-rules",
  ordinal: 108,
  actionSchemaVersion: "hybrid_legal_space_v46",
  previousActionSchemaVersion: "hybrid_legal_space_v45",
  previous: {
    schema: "starcraft_tmg_official_deployment_geometry_rules_rule_slice_v1",
    sliceHash: "aafc7e6351442fca2b700e73840dde19617262c32ae10d708df39a9b2dbf1ca1",
    catalogueHash: "6b2414a21b5614ca436c55a3e9cf29374f49420ebfaba443cf94421c46b045fb",
    runtimeHash: "80a2723a52530b63c9d169dc2064b6bb009cccfce46550e0438e99cfa6bd98d8",
    graphHash: "39a98b83cbeb20e60584305def4ae93bbe8d1037c0d1a48d238118fe47b146b6",
    relationship: createOfficialDeploymentGeometryRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "55fbcd3ddd3cc139a41fdbfb0888a99238250fbcb3de14c6d4b69cddcc5aa5bd",
    catalogueHash: "b59551acb4f23c65520bab35b250a9bbde0ab1ff781df87ec4af92a8da0458db",
    runtimeHash: "06b7599333f098daa7741e8607ec57ceb562d1af5194661b2d18b42d5b62d1ce",
    graphHash: "0c3bb9eeda90208924cf79657cd3a2f682c422e36c5de0fc8b4adc20912eaa16",
  },
  counts: { previousExecutable: 866, previousReview: 46,
    executable: 883, review: 29, displayOnly: 114, executors: 77 },
  remainingSlices: 3,
  newAtomIds: OFFICIAL_BALANCED_TERRAIN_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID,
    version: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_BALANCED_TERRAIN_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_BALANCED_TERRAIN_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_BALANCED_TERRAIN_RULES_PARAMETER_KIND,
  relationship: createOfficialBalancedTerrainRulesRelationshipExtensionV1,
  actor: "pregame_participant_with_all_player_confirmation",
  timing: { phase: "pre_game", window: "balanced_terrain_setup", priority: 208 },
  preconditions: [{
    predicateId: "balanced_terrain.slice107_geometry_and_marker_targets_complete",
    inputSchema: "starcraft_tmg_official_deployment_geometry_binding_v1",
    failureCode: "BALANCED_TERRAIN_PROCEDURE_WINDOW_INVALID",
  }, {
    predicateId: "balanced_terrain.complete_physical_terrain_denominator",
    inputSchema: "starcraft_tmg_official_balanced_terrain_setup_plan_v1",
    failureCode: "BALANCED_TERRAIN_DENOMINATOR_INVALID",
  }, {
    predicateId: "balanced_terrain.rules_recompute_balance_and_geometry",
    inputSchema: "starcraft_tmg_official_balanced_terrain_rules_data_bundle_v1",
    failureCode: "BALANCED_TERRAIN_SETUP_CERTIFICATE_INVALID",
  }],
  chance: { kind: "none", premadeMapSelectionMayUsePhysicalD6OrD3:
    "recorded_outside_digital_authority_or_selected_directly" },
  rejectionCodes: ["BALANCED_TERRAIN_ACTION_INVALID",
    "BALANCED_TERRAIN_ACTION_STALE", "BALANCED_TERRAIN_PARAMETER_DOMAIN_STALE",
    "BALANCED_TERRAIN_COUNT_GUIDELINE_FAILED",
    "BALANCED_TERRAIN_QUADRANT_DISTRIBUTION_FAILED",
    "BALANCED_TERRAIN_FIRE_LANE_BLOCKED",
    "BALANCED_TERRAIN_MAJOR_SEPARATION_FAILED",
    "BALANCED_TERRAIN_LARGE_ACCESS_POINT_UNREACHABLE",
    "BALANCED_TERRAIN_RELOCATION_NOT_NEAREST"],
  evidenceSlug: "balanced-terrain-rules-v1",
  evidenceFixtures: { positive:
      "standard-and-skirmish-complete-balanced-alternating-layouts",
    negative: "count-lane-quadrant-separation-access-and-relocation-rejection",
    interaction: "slice84-85-86-effects-slice107-geometry-and-viewport",
    lifecycle: "terrain-height-marker-placement-and-room-authority-replay" },
  executableScope:
    "official_balanced_terrain_counts_distribution_lanes_access_relocation_and_projection_current_source_lock",
  progressKey: "balancedTerrainRulesProgress",
  progress: { promotedAtomCount: 17,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 17,
    standardAndSkirmishProportionalCountEnvelopeExecutable: true,
    grassSubsetOfSizeTwoAndTotalExecutable: true,
    redFirstAlternatingAndNinePremadeMapIdentitiesExecutable: true,
    fourQuadrantCentreFireLaneAndSeparationCertificateExecutable: true,
    currentMaximumBaseManoeuvreWitnessExecutable: true,
    largeStandableGroundReachabilityExecutable: true,
    impassableNearestMarkerRelocationExecutable: true,
    terrainHeightAndMissionMarkerFinalizationExecutable: true,
    webAppUniformTerrainProjectionExecutable: true,
    boundedTerrainShapeAuthority: "axis_aligned_rectangles",
    arbitraryFormationPathClosureClaimed: false,
    sourceImageTerrainCoordinatesMachineTranscribed: false,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "balanced_terrain_rules_v1",
  frozenExecutorIds: ["authority.deployment-geometry-rules-v1",
    "authority.special-terrain-rules-v1", "authority.elevation-effective-size-rules-v1",
    "authority.terrain-los-rules-v1", "authority.model-base-geometry-rules-v1"],
  judgeTests: 57,
  agentDecisionEvidence:
    "rules_owned_complete_terrain_setup_certificate_not_client_balance_truth",
  userVisibleChecks: [
    "web_and_app_show_identical_map_terrain_and_model_scale",
    "terrain_count_quadrant_centre_lane_and_access_diagnostics_are_visible",
    "official_premade_physical_conformance_and_alternating_history_are_auditable",
  ],
  blocks: ["twenty_nine_actionable_atoms_remain_non_executable",
    "arbitrary_formation_manoeuvrability_remains_bounded_not_globally_closed",
    "premade_source_images_are_registered_but_not_machine_transcribed_as_coordinates",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});

export function createOfficialBalancedTerrainRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialBalancedTerrainRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
