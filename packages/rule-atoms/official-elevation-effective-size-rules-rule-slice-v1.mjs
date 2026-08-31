import {
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_TYPE,
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID,
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_VERSION,
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_NEW_ATOM_IDS,
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_PARAMETER_KIND,
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_REUSED_FLYING_ATOM_IDS,
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_TRANSITION_SCHEMA,
} from "./official-elevation-effective-size-rules-executor-v1.mjs";
import { createOfficialTerrainLosRulesRelationshipExtensionV1 } from
  "./official-terrain-los-rules-relationship-contract-v1.mjs";
import { createOfficialElevationEffectiveSizeRulesRelationshipExtensionV1 } from
  "./official-elevation-effective-size-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";

const CONFIG = Object.freeze({
  prefix: "ELEVATION_EFFECTIVE_SIZE_RULES",
  schema: "starcraft_tmg_official_elevation_effective_size_rules_rule_slice_v1",
  catalogueVersion: "0.85.0-official-elevation-effective-size-rules",
  ordinal: 85,
  previous: {
    schema: "starcraft_tmg_official_terrain_los_rules_rule_slice_v1",
    sliceHash: "dfe744261a93f20a260fd36b8c2cfc2989917ca3ef4d3b93d130dac800ef687f",
    catalogueHash: "f3a0170ba9711a4511d7803b1789658c769acf5fef87efbfd92e17b5ab6b438a",
    runtimeHash: "b61a6aacfc7db4ac6670cb08c57d35ead90758fe28c3e559237acfe2b253e324",
    graphHash: "0c5e513077b9840f6aec987cc49097fc231ab756bb22c4ce6aaf9df37c184d0c",
    relationship: createOfficialTerrainLosRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "dc981da46cbae384449dbc9bf3213775a5fbd18a2b016ec4f9fa6a05994eae81",
    catalogueHash: "216398a685146230140a56481dd031dff9f7c9f3f3a650b94165701a9e966e1f",
    runtimeHash: "52229d04183d64ce4fe34e79cf51e4275cc6c905ab4603b057c5c29b08c348e3",
    graphHash: "af362cb2997a1bbc5b4790794a2434aa3e86a2df646671d7a9b4f3961d485ea0",
  },
  counts: { previousExecutable: 568, previousReview: 344,
    executable: 578, review: 334, displayOnly: 114, executors: 54 },
  remainingSlices: 26,
  newAtomIds: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID,
    version: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_PARAMETER_KIND,
  relationship: createOfficialElevationEffectiveSizeRulesRelationshipExtensionV1,
  timing: { phase: "any_effect_window", window: "elevation_or_cover_procedure",
    priority: 185 },
  preconditions: [{ predicateId: "elevation.complete_rules_owned_plan_denominator",
    inputSchema: "starcraft_tmg_official_elevation_effective_size_rules_pending_v1",
    failureCode: "ELEVATION_PROCEDURE_CERTIFICATE_REQUIRED" },
  { predicateId: "elevation.uses_pinned_official_rule_and_unit_sources",
    inputSchema: "starcraft_tmg_official_terrain_los_data_bundle_v1",
    failureCode: "ELEVATION_SOURCE_LOCK_BINDING_INVALID" },
  { predicateId: "elevation.uses_complete_setup_support_graph",
    inputSchema: "starcraft_tmg_official_terrain_elevation_agreement_v1",
    failureCode: "ELEVATION_SETUP_AGREEMENT_INVALID" }],
  chance: { kind: "none" },
  rejectionCodes: ["ELEVATION_ACTION_INVALID", "ELEVATION_ACTION_STALE",
    "ELEVATION_PENDING_INVALID", "ELEVATION_CHOICE_INVALID",
    "ELEVATION_PARAMETER_DOMAIN_STALE", "ELEVATION_SOURCE_LOCK_BINDING_INVALID",
    "ELEVATION_GEOMETRY_ARTIFACT_BINDING_INVALID"],
  evidenceSlug: "elevation-effective-size-rules-v1",
  evidenceFixtures: { positive: "model-terrain-effective-size-and-stacking",
    negative: "cycle-band-source-and-geometry-reject",
    interaction: "high-ground-cover-flying-and-slice84-geometry",
    lifecycle: "rules-owned-elevation-authority-apply" },
  executableScope:
    "official_elevation_stacking_effective_size_horizontal_distance_high_ground_evade_and_flying_cover_current_source_lock",
  progressKey: "elevationEffectiveSizeRulesProgress",
  progress: { promotedAtomCount: 10,
    plannedAtomCountBeforeDenominatorCorrection: 15,
    reusedAlreadyExecutableFlyingCoverAtomCount: 5,
    reusedAlreadyExecutableFlyingCoverAtomIds:
      OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_REUSED_FLYING_ATOM_IDS,
    roadmapOverlapCorrectionRequired: true,
    roadmapUnassignedAtomDebtAfterCorrection: 5,
    terrainSupportGraphExecutable: true,
    recursivelyStackedTerrainEffectiveSizeExecutable: true,
    groundMidHighModelEffectiveSizeExecutable: true,
    horizontalCrossElevationDistanceExecutable: true,
    highGroundEvadeAndLowerOriginExecutable: true,
    effectiveSizeFullAndDirectCoverExecutable: true,
    flyingCoverV1IntegratedWithoutRepromotion: true,
    terrainLosV1GeometryIntegratedWithoutSourceMutation: true,
    boundedTerrainShapeAuthority: "axis_aligned_rectangles",
    specialTerrainKindsDeferredToSlice86: true,
    arbitraryModelBaseShapesDeferredToSlice87: true,
    productionGeometryQuarantinedUntilSlices86To87: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "elevation_effective_size_rules_v1",
  frozenExecutorIds: ["authority.terrain-los-rules-v1",
    "authority.flying-rules-v1", "authority.gap-place-geometry-v1"],
  judgeTests: 30,
  agentDecisionEvidence:
    "rules_owned_effective_size_horizontal_distance_elevated_cover_and_evade_plan_choice",
  userVisibleChecks: [
    "effective_size_receipt_explains_each_declared_support_edge_and_sum",
    "elevated_cover_receipt_explains_full_direct_dead_zone_and_evade_results",
    "flying_cover_reuse_and_roadmap_denominator_correction_are_visible",
  ],
  blocks: ["three_hundred_thirty_four_actionable_atoms_remain_non_executable",
    "five_atom_roadmap_assignment_debt_must_be_reallocated_before_slice_86",
    "grass_impassable_ramp_and_access_rules_wait_for_slice_86",
    "arbitrary_model_base_shapes_wait_for_slice_87",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});

export function createOfficialElevationEffectiveSizeRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialElevationEffectiveSizeRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
