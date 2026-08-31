import {
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_ACTION_TYPE,
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_ID,
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_VERSION,
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_NEW_ATOM_IDS,
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_PARAMETER_KIND,
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_PENDING_SCHEMA,
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_TRANSITION_SCHEMA,
} from "./official-unit-card-supply-rules-executor-v1.mjs";
import { createOfficialCardBuildPaymentRulesRelationshipExtensionV1 } from
  "./official-card-build-payment-rules-relationship-contract-v1.mjs";
import { createOfficialUnitCardSupplyRulesRelationshipExtensionV1 } from
  "./official-unit-card-supply-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "UNIT_CARD_SUPPLY_RULES",
  schema: "starcraft_tmg_official_unit_card_supply_rules_rule_slice_v1",
  catalogueVersion: "0.93.0-official-unit-card-supply-rules",
  ordinal: 93,
  actionSchemaVersion: "hybrid_legal_space_v31",
  previousActionSchemaVersion: "hybrid_legal_space_v30",
  previous: {
    schema: "starcraft_tmg_official_card_build_payment_rules_rule_slice_v1",
    sliceHash: "c1bfa98df9199b722b3a279637934e69146654a429fa18b83a3eceab373cc432",
    catalogueHash: "672759bd456ea330af46131709716b1418d646dd1b9d405a0acce8a7101e4e74",
    runtimeHash: "0d11e5569f1eb6b3e62ac50b1bad9930d30cd7bef8b6db1b4cf39bd2bcf3627d",
    graphHash: "61c194dce1c9b67e05b67a63722680081f6a434e8fb7ecf0d1e48f859df0007b",
    relationship: createOfficialCardBuildPaymentRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "26a3b14ee8d24a3c0ec6a85581194f902913ce5c9fecf012fb98b867e42f459a",
    catalogueHash: "c3a18341468a9ff2936321fb71fac7105eafb8b31d6899af937a937f24f0208f",
    runtimeHash: "80867a2d2074171b014d08f0bad820a3bfd812d268a5588fda253a474f28b51d",
    graphHash: "8d19eb21e3883f734aa2104c0c28eb763b6b2c57db1348523132b02673fab8cb",
  },
  counts: { previousExecutable: 671, previousReview: 241,
    executable: 683, review: 229, displayOnly: 114, executors: 62 },
  remainingSlices: 18,
  newAtomIds: OFFICIAL_UNIT_CARD_SUPPLY_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_ID,
    version: OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_UNIT_CARD_SUPPLY_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_UNIT_CARD_SUPPLY_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_UNIT_CARD_SUPPLY_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_UNIT_CARD_SUPPLY_RULES_PARAMETER_KIND,
  relationship: createOfficialUnitCardSupplyRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "army_building_or_any_supply_query_window",
    window: "unit_card_supply_rules_procedure", priority: 193 },
  preconditions: [{
    predicateId: "unit_card_supply.complete_rules_owned_plan_denominator",
    inputSchema: OFFICIAL_UNIT_CARD_SUPPLY_RULES_PENDING_SCHEMA,
    failureCode: "UNIT_CARD_SUPPLY_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "unit_card_supply.uses_pinned_official_unit_and_p2p_profiles",
    inputSchema: "starcraft_tmg_official_unit_card_supply_data_bundle_v1",
    failureCode: "UNIT_CARD_SUPPLY_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "unit_card_supply.current_model_count_selects_exact_supply_tier",
    inputSchema: "starcraft_tmg_official_current_supply_value_resolution_v1",
    failureCode: "CURRENT_SUPPLY_MODEL_COUNT_UNMAPPED",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "UNIT_CARD_SUPPLY_ACTION_INVALID", "UNIT_CARD_SUPPLY_ACTION_STALE",
    "UNIT_CARD_SUPPLY_PENDING_INVALID", "UNIT_CARD_SUPPLY_CHOICE_INVALID",
    "UNIT_CARD_SUPPLY_PARAMETER_DOMAIN_STALE",
    "UNIT_CARD_SUPPLY_SOURCE_LOCK_BINDING_INVALID",
    "UNIT_CARD_SUPPLY_DATA_ARTIFACT_BINDING_INVALID",
    "UNIT_CARD_LAYOUT_REQUEST_INVALID", "CURRENT_SUPPLY_MODEL_COUNT_UNMAPPED",
    "CURRENT_SUPPLY_ZERO_MODELS_REQUIRES_DESTROYED",
    "STARTING_SUPPLY_COMPOSITION_UNAVAILABLE",
    "UNIT_CARD_NULL_SPEED_FORBIDS_MOVE_OR_REPOSITION",
  ],
  evidenceSlug: "unit-card-supply-rules-v1",
  evidenceFixtures: {
    positive: "official-26-unit-layout-current-supply-and-starting-slots",
    negative: "null-speed-unmapped-count-forged-source-and-client-values-reject",
    interaction: "casualty-bracket-deployment-control-mass-scoring-and-slot-projection",
    lifecycle: "official-unit-card-supply-plan-authority-apply-and-replay",
  },
  executableScope:
    "official_26_unit_card_faction_slot_phase_speed_supply_base_combat_range_upgrade_fields_current_model_supply_projection_and_starting_slots_current_source_lock",
  progressKey: "unitCardSupplyRulesProgress",
  progress: {
    promotedAtomCount: 12, routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 12, exactOfficialUnitProfilesCompiled: 26,
    unitCardFieldLayoutExecutable: true,
    nullSpeedMoveAndRepositionGateExecutable: true,
    currentModelCountSupplyProjectionExecutable: true,
    startingCompositionSupplyAndSlotProjectionExecutable: true,
    declaredSupplyConsumers: ["deployment", "mission_marker_control", "tactical_mass", "scoring"],
    fullArmyEligibilityDeferredToSlice: 102,
    existingSupplyConsumersFrozenPendingVersionedMigration: true,
    existingUnitAndMovementExecutorsFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "unit_card_supply_rules_v1",
  frozenExecutorIds: ["authority.card-build-payment-rules-v1",
    "authority.start-of-round-v5", "authority.reserve-deploy-v5",
    "authority.mission-marker-control-v4", "authority.disengage-v5"],
  judgeTests: 46,
  agentDecisionEvidence:
    "rules_owned_exact_unit_profile_then_confirmed_layout_current_supply_starting_slots_or_mobility_certificate",
  userVisibleChecks: [
    "unit_card_receipt_shows_faction_slot_phase_speed_supply_base_range_and_upgrade_fields",
    "current_supply_receipt_shows_current_model_count_selected_tier_and_all_four_consumers",
    "starting_composition_receipt_shows_starting_supply_and_equal_same_type_slot_count",
    "null_speed_units_reject_move_place_and_involuntary_reposition_characteristic_queries",
  ],
  blocks: [
    "two_hundred_twenty_nine_actionable_atoms_remain_non_executable",
    "full_faction_subfaction_and_complete_army_eligibility_remain_slice_102",
    "existing_supply_consumers_require_explicit_versioned_migration_not_silent_rewrite",
    "operation_specific_movement_legality_remains_owned_by_atomic_executors",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialUnitCardSupplyRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialUnitCardSupplyRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
