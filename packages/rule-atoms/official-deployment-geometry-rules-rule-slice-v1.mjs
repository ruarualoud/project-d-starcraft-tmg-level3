import {
  OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_ACTION_TYPE,
  OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID,
  OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_VERSION,
  OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_NEW_ATOM_IDS,
  OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_TRANSITION_SCHEMA,
} from "./official-deployment-geometry-rules-executor-v1.mjs";
import { createOfficialDeploymentGeometryRulesRelationshipExtensionV1 } from
  "./official-deployment-geometry-rules-relationship-contract-v1.mjs";
import { createOfficialMissionDeploymentDraftRulesRelationshipExtensionV1 } from
  "./official-mission-deployment-draft-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "DEPLOYMENT_GEOMETRY_RULES",
  schema: "starcraft_tmg_official_deployment_geometry_rules_rule_slice_v1",
  catalogueVersion: "0.107.0-official-deployment-geometry-rules",
  ordinal: 107,
  actionSchemaVersion: "hybrid_legal_space_v45",
  previousActionSchemaVersion: "hybrid_legal_space_v44",
  previous: {
    schema: "starcraft_tmg_official_mission_deployment_draft_rules_rule_slice_v1",
    sliceHash: "760a20172d419c4eb6fa1be22cce144df01e82245ef908aaceef23992167525e",
    catalogueHash: "1fb1753f9d8e09faeaa769774906777df16a7a0c90320f383784efc4ff4c2f8b",
    runtimeHash: "d6beaea09a6426c523ae9d35ac1c83824fce26288f9ea257b32d92a1d1fcf23b",
    graphHash: "b854b730a40034775de5ae21192c40a632dcdc4c68a53b6f0b858178af6a98d1",
    relationship: createOfficialMissionDeploymentDraftRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "aafc7e6351442fca2b700e73840dde19617262c32ae10d708df39a9b2dbf1ca1",
    catalogueHash: "6b2414a21b5614ca436c55a3e9cf29374f49420ebfaba443cf94421c46b045fb",
    runtimeHash: "80a2723a52530b63c9d169dc2064b6bb009cccfce46550e0438e99cfa6bd98d8",
    graphHash: "39a98b83cbeb20e60584305def4ae93bbe8d1037c0d1a48d238118fe47b146b6",
  },
  counts: { previousExecutable: 854, previousReview: 58,
    executable: 866, review: 46, displayOnly: 114, executors: 76 },
  remainingSlices: 4,
  newAtomIds: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID,
    version: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_ACTION_TYPE,
  parameterKind: "official_deployment_geometry_plan_v1",
  relationship: createOfficialDeploymentGeometryRulesRelationshipExtensionV1,
  actor: "pregame_participant",
  timing: { phase: "pre_game", window: "battlefield_setup_geometry", priority: 207 },
  preconditions: [{
    predicateId: "deployment_geometry.completed_draft_selects_exact_profile",
    inputSchema: "starcraft_tmg_official_mission_deployment_draft_binding_v1",
    failureCode: "DEPLOYMENT_GEOMETRY_DRAFT_BINDING_INVALID",
  }, {
    predicateId: "deployment_geometry.p2p_dimensions_edges_zones_and_markers_are_pinned",
    inputSchema: "starcraft_tmg_official_deployment_geometry_data_bundle_v1",
    failureCode: "DEPLOYMENT_GEOMETRY_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "deployment_geometry.terrain_precedes_physical_marker_placement",
    inputSchema: "ticket_11_slice_108_balanced_terrain_boundary",
    failureCode: "DEPLOYMENT_GEOMETRY_TERRAIN_PENDING",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "DEPLOYMENT_GEOMETRY_ACTION_INVALID",
    "DEPLOYMENT_GEOMETRY_ACTION_STALE",
    "DEPLOYMENT_GEOMETRY_PROCEDURE_WINDOW_INVALID",
    "DEPLOYMENT_GEOMETRY_SOURCE_LOCK_BINDING_INVALID",
    "DEPLOYMENT_GEOMETRY_DRAFT_BINDING_INVALID",
    "DEPLOYMENT_GEOMETRY_SELECTED_PROFILE_MISMATCH",
    "DEPLOYMENT_GEOMETRY_TERRAIN_PIECE_INVALID",
    "DEPLOYMENT_GEOMETRY_MISSION_MARKER_IMPASSABLE_OVERLAP",
    "DEPLOYMENT_GEOMETRY_MISSION_MARKER_SUPPORT_AMBIGUOUS",
  ],
  evidenceSlug: "deployment-geometry-rules-v1",
  evidenceFixtures: {
    positive: "ten-p2p-profiles-selected-geometry-materialization",
    negative: "source-draft-scale-coordinate-and-impassable-rejections",
    interaction: "slice106-draft-binding-and-slice108-terrain-boundary",
    lifecycle: "authority-preview-apply-signed-replay",
  },
  executableScope:
    "official_selected_deployment_dimensions_entry_edges_influence_zones_marker_targets_and_setup_constraints",
  progressKey: "deploymentGeometryRulesProgress",
  progress: {
    promotedAtomCount: 12, routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 12, exactP2pDeploymentProfilesCompiled: 10,
    standardProfiles: 5, skirmishProfiles: 5,
    standardMarkerTargetsPerProfile: 5, skirmishMarkerTargetsPerProfile: 3,
    labelledDimensionsTranscribed: true, labelledCoordinatesTranscribed: true,
    entryEdgeSegmentsExecutable: true, zoneOfInfluenceDepthInches: 6,
    partialEntryCornerMarkersExecutable: true,
    missionMarkerPhysicalSpecificationExecutable: true,
    gameStartTerrainHeightTierConstraintExecutable: true,
    postTerrainMarkerElevationDerivationExecutable: true,
    impassableMarkerOverlapFailsClosed: true,
    worldCoordinatesRemainInches: true,
    physicalMillimetresConvertAt25Point4PerInch: true,
    uniformWebAppViewportProjectionExecutable: true,
    zoomPanDprAndTouchTargetsCannotChangeRulesGeometry: true,
    corePdfSetupOrderOverridesConflictingCommandCenterProse: true,
    physicalTerrainPlacementDeferredToSlice108: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "deployment_geometry_rules_v1",
  frozenExecutorIds: ["authority.mission-deployment-draft-rules-v1",
    "authority.roster-disclosure-rules-v1", "authority.reserve-deploy-v5"],
  judgeTests: 42,
  agentDecisionEvidence:
    "single_source_derived_geometry_action_then_rules_owned_post_terrain_marker_validation",
  userVisibleChecks: [
    "selected_deployment_shows_exact_dimensions_entry_segments_and_six_inch_influence_zones",
    "skirmish_cards_show_markers_1_2_5_without_inventing_markers_3_4",
    "core_pdf_setup_order_keeps_terrain_before_physical_mission_marker_placement",
    "mission_marker_elevation_is_derived_from_game_start_terrain_and_impassable_overlap_is_rejected",
    "web_and_app_preserve_map_aspect_ratio_and_physical_piece_to_map_scale_at_every_zoom",
  ],
  blocks: [
    "forty_six_actionable_atoms_remain_non_executable",
    "balanced_terrain_physical_marker_completion_tokens_scoring_and_disputes_remain_slices_108_111",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialDeploymentGeometryRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialDeploymentGeometryRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
