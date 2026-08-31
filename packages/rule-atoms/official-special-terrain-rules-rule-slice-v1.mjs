import {
  OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_TYPE,
  OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID,
  OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_VERSION,
  OFFICIAL_SPECIAL_TERRAIN_RULES_NEW_ATOM_IDS,
  OFFICIAL_SPECIAL_TERRAIN_RULES_PARAMETER_KIND,
  OFFICIAL_SPECIAL_TERRAIN_RULES_TRANSITION_SCHEMA,
} from "./official-special-terrain-rules-executor-v1.mjs";
import { createOfficialElevationEffectiveSizeRulesRelationshipExtensionV1 } from
  "./official-elevation-effective-size-rules-relationship-contract-v1.mjs";
import { createOfficialSpecialTerrainRulesRelationshipExtensionV1 } from
  "./official-special-terrain-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "SPECIAL_TERRAIN_RULES",
  schema: "starcraft_tmg_official_special_terrain_rules_rule_slice_v1",
  catalogueVersion: "0.86.0-official-special-terrain-rules",
  ordinal: 86,
  previous: {
    schema: "starcraft_tmg_official_elevation_effective_size_rules_rule_slice_v1",
    sliceHash: "dc981da46cbae384449dbc9bf3213775a5fbd18a2b016ec4f9fa6a05994eae81",
    catalogueHash: "216398a685146230140a56481dd031dff9f7c9f3f3a650b94165701a9e966e1f",
    runtimeHash: "52229d04183d64ce4fe34e79cf51e4275cc6c905ab4603b057c5c29b08c348e3",
    graphHash: "af362cb2997a1bbc5b4790794a2434aa3e86a2df646671d7a9b4f3961d485ea0",
    relationship: createOfficialElevationEffectiveSizeRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "99454bd06cb660304dd4ae69f9f4753dd4936d402c3d072dcb8744de12d18059",
    catalogueHash: "da040b3e25a9d05e74dfe5af3b7a7baf94627574ede9aa59b171942f023a3622",
    runtimeHash: "f429e97622753e125229d60ce8c45fc7b77a3f542b31166b0a5383b9cd14e016",
    graphHash: "92362a43427003eb612baf167f6b2d59c7faacd624ffe1b1f3bb235b18283497",
  },
  counts: { previousExecutable: 578, previousReview: 334,
    executable: 591, review: 321, displayOnly: 114, executors: 55 },
  remainingSlices: 25,
  newAtomIds: OFFICIAL_SPECIAL_TERRAIN_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID,
    version: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_SPECIAL_TERRAIN_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_SPECIAL_TERRAIN_RULES_PARAMETER_KIND,
  relationship: createOfficialSpecialTerrainRulesRelationshipExtensionV1,
  timing: { phase: "movement_or_line_of_sight_window",
    window: "special_terrain_procedure", priority: 186 },
  preconditions: [{ predicateId: "special_terrain.complete_rules_owned_plan_denominator",
    inputSchema: "starcraft_tmg_official_special_terrain_rules_pending_v1",
    failureCode: "SPECIAL_TERRAIN_PROCEDURE_CERTIFICATE_REQUIRED" },
  { predicateId: "special_terrain.uses_pinned_official_rule_and_unit_sources",
    inputSchema: "starcraft_tmg_official_terrain_los_data_bundle_v1",
    failureCode: "SPECIAL_TERRAIN_SOURCE_LOCK_BINDING_INVALID" },
  { predicateId: "special_terrain.uses_complete_setup_access_point_graph",
    inputSchema: "starcraft_tmg_official_special_terrain_agreement_v1",
    failureCode: "SPECIAL_TERRAIN_AGREEMENT_INVALID" }],
  chance: { kind: "none" },
  rejectionCodes: ["SPECIAL_TERRAIN_ACTION_INVALID", "SPECIAL_TERRAIN_ACTION_STALE",
    "SPECIAL_TERRAIN_PENDING_INVALID", "SPECIAL_TERRAIN_CHOICE_INVALID",
    "SPECIAL_TERRAIN_PARAMETER_DOMAIN_STALE",
    "SPECIAL_TERRAIN_SOURCE_LOCK_BINDING_INVALID",
    "SPECIAL_TERRAIN_GEOMETRY_ARTIFACT_BINDING_INVALID",
    "SPECIAL_TERRAIN_ACCESS_POINT_REQUIRED",
    "SPECIAL_TERRAIN_IMPASSABLE_MOVEMENT_FORBIDDEN",
    "SPECIAL_TERRAIN_RAMP_ACCESS_REQUIRED"],
  evidenceSlug: "special-terrain-rules-v1",
  evidenceFixtures: { positive: "access-grass-ramp-and-size-one-movement",
    negative: "impassable-invalid-access-and-source-reject",
    interaction: "slice82-gap-slice83-flying-and-slice84-terrain-adapters",
    lifecycle: "permanent-grass-removal-authority-apply" },
  executableScope:
    "official_special_terrain_access_point_grass_impassable_ramp_gap_and_coherency_current_source_lock",
  progressKey: "specialTerrainRulesProgress",
  progress: { promotedAtomCount: 13,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 13,
    completeSetupAccessPointGraphExecutable: true,
    elevationChangeThroughAccessPointExecutable: true,
    accessPointCoherencyGraphExecutable: true,
    grassSizeMovementLosAndPermanentRemovalExecutable: true,
    impassableDerivationAndMovementProhibitionExecutable: true,
    sizeZeroAndOneTransitExecutable: true,
    rampBaseTopAccessAndMidGroundExecutable: true,
    leadingModelGapAdapterExecutable: true,
    flyingGrassAdapterExecutable: true,
    boundedTerrainShapeAuthority: "axis_aligned_rectangles",
    arbitraryModelBaseShapesDeferredToSlice87: true,
    productionGeometryQuarantinedUntilSlice87: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "special_terrain_rules_v1",
  frozenExecutorIds: ["authority.elevation-effective-size-rules-v1",
    "authority.terrain-los-rules-v1", "authority.flying-rules-v1",
    "authority.gap-place-geometry-v1"],
  judgeTests: 30,
  agentDecisionEvidence:
    "rules_owned_access_point_grass_impassable_ramp_and_gap_plan_choice",
  userVisibleChecks: [
    "special_terrain_receipt_explains_access_points_ramps_and_impassable_results",
    "grass_removal_is_visible_and_persists_for_the_remainder_of_the_battle",
    "frozen_gap_flying_and_terrain_adapter_hashes_are_visible",
  ],
  blocks: ["three_hundred_twenty_one_actionable_atoms_remain_non_executable",
    "arbitrary_model_base_shapes_and_general_coherency_wait_for_slice_87",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});

export function createOfficialSpecialTerrainRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialSpecialTerrainRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
