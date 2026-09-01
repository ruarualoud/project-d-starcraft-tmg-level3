import {
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_TYPE,
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID,
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_VERSION,
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_NEW_ATOM_IDS,
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PARAMETER_KIND,
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PENDING_SCHEMA,
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_TRANSITION_SCHEMA,
} from "./official-status-stay-in-play-rules-executor-v1.mjs";
import { createOfficialStatusStayInPlayRulesRelationshipExtensionV1 } from
  "./official-status-stay-in-play-rules-relationship-contract-v1.mjs";
import { createOfficialUnitDestructionLifecycleRulesRelationshipExtensionV1 } from
  "./official-unit-destruction-lifecycle-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "STATUS_STAY_IN_PLAY_RULES",
  schema: "starcraft_tmg_official_status_stay_in_play_rules_rule_slice_v1",
  catalogueVersion: "0.98.0-official-status-stay-in-play-rules",
  ordinal: 98,
  actionSchemaVersion: "hybrid_legal_space_v36",
  previousActionSchemaVersion: "hybrid_legal_space_v35",
  previous: {
    schema: "starcraft_tmg_official_unit_destruction_lifecycle_rules_rule_slice_v1",
    sliceHash: "59b1b89770e787417731e8afe083b3b431256300e8bb468806ee824f9abae670",
    catalogueHash: "38742bb9d0d96c9a60cb54f1d2a8886ba167fddab8e2f9a77a4fd81a8f95caf0",
    runtimeHash: "925574975598e5be4a1e089f5728ea07a5cb827b4892e7de7b40858689357420",
    graphHash: "5068f1bdd4baaeef787ffbb46629686b901707917568136ae26f58f56d63f86c",
    relationship: createOfficialUnitDestructionLifecycleRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "e6c13284ab2062d6f850d68f765e3b4722b0f7ece89c234f376adbe89ebb5279",
    catalogueHash: "b611b4d670c9fce7322d7d65025b949e0d6a752febe400a1d9d17a65bae6646b",
    runtimeHash: "1f646eb170278090bfc7ac77e35d579fb7a13cb148ac90c53ed72fa9d90d69b9",
    graphHash: "ee6a354cf18f93784b508648019817d84c84f0f8627a95e18cb321bab5549a32",
  },
  counts: {
    previousExecutable: 717, previousReview: 195,
    executable: 729, review: 183, displayOnly: 114, executors: 67,
  },
  remainingSlices: 13,
  newAtomIds: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_NEW_ATOM_IDS,
  executor: {
    id: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID,
    version: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_TRANSITION_SCHEMA,
  },
  actionType: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PARAMETER_KIND,
  relationship: createOfficialStatusStayInPlayRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: {
    phase: "rules_procedure",
    window: "status_stay_in_play_shielded_siege_or_on_creep_resolution",
    priority: 198,
  },
  preconditions: [{
    predicateId: "status.complete_rules_owned_state_denominator",
    inputSchema: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PENDING_SCHEMA,
    failureCode: "STATUS_STAY_IN_PLAY_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "status.uses_pinned_part11_and_current_product_sources",
    inputSchema: "starcraft_tmg_official_status_stay_in_play_data_bundle_v1",
    failureCode: "STATUS_STAY_IN_PLAY_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "status.mutation_is_rules_derived_and_hash_bound",
    inputSchema: "starcraft_tmg_official_status_stay_in_play_plan_v1",
    failureCode: "STATUS_STAY_IN_PLAY_MUTATION_STALE",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "STATUS_STAY_IN_PLAY_ACTION_INVALID",
    "STATUS_STAY_IN_PLAY_ACTION_STALE",
    "STATUS_STAY_IN_PLAY_PENDING_INVALID",
    "STATUS_STAY_IN_PLAY_CHOICE_INVALID",
    "STATUS_STAY_IN_PLAY_PARAMETER_DOMAIN_STALE",
    "STATUS_STAY_IN_PLAY_SOURCE_LOCK_BINDING_INVALID",
    "STATUS_STAY_IN_PLAY_DATA_ARTIFACT_BINDING_INVALID",
    "STATUS_STAY_IN_PLAY_STATE_INVALID",
    "STATUS_CLEANUP_WINDOW_INVALID",
    "ON_CREEP_QUERY_INVALID",
    "ON_CREEP_GROUND_ZERG_UNIT_REQUIRED",
    "ON_CREEP_TUMOR_GEOMETRY_UNAVAILABLE",
    "SIEGE_MODE_QUERY_INVALID",
    "SIEGE_MODE_PROFILE_SET_INVALID",
    "SIEGE_MODE_RESERVE_REMOVAL_INVALID",
    "SHIELDED_DEPENDENCY_TRIGGER_INVALID",
    "STATUS_STAY_IN_PLAY_MUTATION_STALE",
    "STATUS_STAY_IN_PLAY_TOKEN_PATCH_STALE",
    "STATUS_STAY_IN_PLAY_MARKER_PATCH_STALE",
  ],
  evidenceSlug: "status-stay-in-play-rules-v1",
  evidenceFixtures: {
    positive: "status-persistence-omega-on-creep-and-siege-constraint",
    negative: "tumor-geometry-missing-forged-shield-event-and-stale-state-reject",
    interaction: "shielded-loss-dependent-effect-cleanup-and-nondependent-preservation",
    lifecycle: "cleanup-expiry-reserve-siege-removal-and-dynamic-on-creep-loss",
  },
  executableScope:
    "official_status_and_stay_in_play_cleanup_shielded_dependency_generic_siege_harness_and_current_omega_worm_on_creep_geometry_current_source_lock",
  progressKey: "statusStayInPlayRulesProgress",
  progress: {
    promotedAtomCount: 12,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 12,
    statusCleanupPersistenceExecutable: true,
    statusModeAndEffectMarkerStayInPlayExecutable: true,
    specificCleanupRemovalConditionExecutable: true,
    shieldedDependentEffectCleanupExecutable: true,
    nonDependentEffectPreservationExecutable: true,
    siegeActionAndWeaponConstraintsExecutableInRulesHarness: true,
    siegeReserveRemovalExecutable: true,
    currentOfficialSiegeCarrierAvailable: false,
    currentOmegaWormSourceOfCreepExecutable: true,
    onCreepDynamicKeywordAddAndRemoveExecutable: true,
    currentCreepTumorPhysicalGeometryAvailable: false,
    onCreepDependentRuleDefinitionsIndexed: true,
    existingCleanupShieldedReserveMovementConsumersFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "status_stay_in_play_rules_v1",
  frozenExecutorIds: [
    "authority.cleanup-refresh-v5",
    "authority.combat-tag-shielded-ranged-v2",
    "authority.reserve-lifecycle-rules-v1",
    "authority.standard-move-v5", "authority.disengage-v5",
    "authority.assault-run-v1", "authority.marine-charge-v2",
    "authority.close-combat-attack-v8",
  ],
  judgeTests: 45,
  agentDecisionEvidence:
    "rules_owned_status_persistence_shield_dependency_siege_and_on_creep_transition",
  userVisibleChecks: [
    "cleanup_receipt_separates_persistent_and_explicitly_expiring_status_material",
    "shield_loss_receipt_lists_only_requires_shielded_effects_removed",
    "siege_receipt_lists_blocked_actions_and_exclusive_weapon_profiles",
    "on_creep_receipt_lists_exact_source_model_distances_and_dynamic_keyword_change",
  ],
  blocks: [
    "one_hundred_eighty_three_actionable_atoms_remain_non_executable",
    "no_current_official_siege_mode_carrier_so_production_path_is_quarantined",
    "creep_tumor_physical_geometry_is_not_officially_bound_and_fails_closed",
    "existing_consumers_remain_frozen_and_require_explicit_versioned_composition",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialStatusStayInPlayRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialStatusStayInPlayRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
