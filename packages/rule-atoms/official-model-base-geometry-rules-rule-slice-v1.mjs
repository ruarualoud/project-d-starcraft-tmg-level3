import {
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_TYPE,
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID,
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_VERSION,
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_NEW_ATOM_IDS,
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_PARAMETER_KIND,
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_TRANSITION_SCHEMA,
} from "./official-model-base-geometry-rules-executor-v1.mjs";
import { createOfficialSpecialTerrainRulesRelationshipExtensionV1 } from
  "./official-special-terrain-rules-relationship-contract-v1.mjs";
import { createOfficialModelBaseGeometryRulesRelationshipExtensionV1 } from
  "./official-model-base-geometry-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "MODEL_BASE_GEOMETRY_RULES",
  schema: "starcraft_tmg_official_model_base_geometry_rules_rule_slice_v1",
  catalogueVersion: "0.87.0-official-model-base-geometry-rules",
  ordinal: 87,
  previous: {
    schema: "starcraft_tmg_official_special_terrain_rules_rule_slice_v1",
    sliceHash: "99454bd06cb660304dd4ae69f9f4753dd4936d402c3d072dcb8744de12d18059",
    catalogueHash: "da040b3e25a9d05e74dfe5af3b7a7baf94627574ede9aa59b171942f023a3622",
    runtimeHash: "f429e97622753e125229d60ce8c45fc7b77a3f542b31166b0a5383b9cd14e016",
    graphHash: "92362a43427003eb612baf167f6b2d59c7faacd624ffe1b1f3bb235b18283497",
    relationship: createOfficialSpecialTerrainRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "df60e9e77f9aa480c136b6145d454cc23811898488f1f9683bedfffbd40ba328",
    catalogueHash: "e19ea565c2225b90f62bc28a73157140f91dbd505e8a2eda2a5af3b2084c59a0",
    runtimeHash: "d1dcbe60fe654b53d14f2a5f32e0ea6d0b7e8105671e5845ca011956a9f92ddc",
    graphHash: "0a5679f798082b27f772424a6c9b8cca632463f9ae2243eecfa51975eab92fa8",
  },
  counts: { previousExecutable: 591, previousReview: 321,
    executable: 612, review: 300, displayOnly: 114, executors: 56 },
  remainingSlices: 24,
  newAtomIds: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID,
    version: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_PARAMETER_KIND,
  relationship: createOfficialModelBaseGeometryRulesRelationshipExtensionV1,
  timing: { phase: "any_measurement_or_repositioning_window",
    window: "model_base_geometry_procedure", priority: 187 },
  preconditions: [{ predicateId: "model_base_geometry.complete_rules_owned_plan_denominator",
    inputSchema: "starcraft_tmg_official_model_base_geometry_rules_pending_v1",
    failureCode: "MODEL_BASE_GEOMETRY_PROCEDURE_CERTIFICATE_REQUIRED" },
  { predicateId: "model_base_geometry.uses_pinned_official_rule_unit_and_p2p_sources",
    inputSchema: "starcraft_tmg_official_model_base_geometry_data_bundle_v1",
    failureCode: "MODEL_BASE_GEOMETRY_SOURCE_LOCK_BINDING_INVALID" },
  { predicateId: "model_base_geometry.uses_complete_current_official_base_profile_denominator",
    inputSchema: "starcraft_tmg_official_model_base_geometry_data_bundle_v1",
    failureCode: "MODEL_BASE_GEOMETRY_CORRECT_BASE_REQUIRED" }],
  chance: { kind: "none" },
  rejectionCodes: ["MODEL_BASE_GEOMETRY_ACTION_INVALID",
    "MODEL_BASE_GEOMETRY_ACTION_STALE", "MODEL_BASE_GEOMETRY_PENDING_INVALID",
    "MODEL_BASE_GEOMETRY_CHOICE_INVALID",
    "MODEL_BASE_GEOMETRY_PARAMETER_DOMAIN_STALE",
    "MODEL_BASE_GEOMETRY_SOURCE_LOCK_BINDING_INVALID",
    "MODEL_BASE_GEOMETRY_ARTIFACT_BINDING_INVALID",
    "MODEL_BASE_GEOMETRY_CORRECT_BASE_REQUIRED",
    "MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP",
    "MODEL_BASE_GEOMETRY_COHERENCY_LINK_INVALID",
    "MODEL_BASE_GEOMETRY_CASUALTY_PROOF_INVALID"],
  evidenceSlug: "model-base-geometry-rules-v1",
  evidenceFixtures: { positive: "round-rectangle-measurement-within-and-coherency",
    negative: "wrong-base-overlap-link-source-and-geometry-reject",
    interaction: "slice82-gap-slice86-access-and-existing-coherency-adapters",
    lifecycle: "leading-nomination-wobbly-agreement-and-casualty-apply" },
  executableScope:
    "official_model_base_profile_geometry_measurement_within_wholly_within_coherency_and_wobbly_position_current_source_lock",
  progressKey: "modelBaseGeometryRulesProgress",
  progress: { promotedAtomCount: 21,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 21,
    currentOfficialBaseProfileDenominator: 26,
    currentOfficialRoundBaseProfileCount: 25,
    currentOfficialRectangularBaseProfileCount: 1,
    hydraliskFortyByOneHundredMillimetreBaseExecutable: true,
    rulesSeeBaseNotMiniatureOrScenicOverhang: true,
    unrestrictedPremeasurementAndNearestEdgeDistanceExecutable: true,
    tokenAndMarkerNearestPhysicalEdgeExecutable: true,
    withinAndWhollyWithinModelAndUnitRelationsExecutable: true,
    placementCoherencyLinkAndCasualtyCertificateExecutable: true,
    inCoherencyMissionCapabilityExecutable: true,
    wobblyAgreedPositionExecutable: true,
    leadingModelNominationLifetimeExecutable: true,
    currentOfficialBaseGeometryProductionQuarantineLifted: true,
    oldRoundOnlyGeometryKernelsFrozenAsHistoricalAdapters: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "model_base_geometry_rules_v1",
  frozenExecutorIds: ["authority.special-terrain-rules-v1",
    "authority.elevation-effective-size-rules-v1", "authority.terrain-los-rules-v1",
    "authority.flying-rules-v1", "authority.gap-place-geometry-v1"],
  judgeTests: 34,
  agentDecisionEvidence:
    "rules_owned_official_base_measurement_range_and_coherency_plan_choice",
  userVisibleChecks: [
    "measurement_receipt_shows_nearest_base_or_physical_edges_and_inch_distance",
    "within_receipt_distinguishes_partial_overlap_from_complete_base_containment",
    "coherency_receipt_shows_three_inch_status_link_graph_casualties_and_mission_capability",
    "official_round_and_hydralisk_rectangular_base_sources_are_visible",
  ],
  blocks: ["three_hundred_actionable_atoms_remain_non_executable",
    "player_controller_ownership_and_precedence_wait_for_slice_88",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});

export function createOfficialModelBaseGeometryRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialModelBaseGeometryRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
