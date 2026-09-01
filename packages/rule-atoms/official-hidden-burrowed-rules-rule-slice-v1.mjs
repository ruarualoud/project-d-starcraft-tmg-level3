import {
  OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_TYPE,
  OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID,
  OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_VERSION,
  OFFICIAL_HIDDEN_BURROWED_RULES_NEW_ATOM_IDS,
  OFFICIAL_HIDDEN_BURROWED_RULES_PARAMETER_KIND,
  OFFICIAL_HIDDEN_BURROWED_RULES_PENDING_SCHEMA,
  OFFICIAL_HIDDEN_BURROWED_RULES_TRANSITION_SCHEMA,
} from "./official-hidden-burrowed-rules-executor-v1.mjs";
import { createOfficialHiddenBurrowedRulesRelationshipExtensionV1 } from
  "./official-hidden-burrowed-rules-relationship-contract-v1.mjs";
import { createOfficialStatusStayInPlayRulesRelationshipExtensionV1 } from
  "./official-status-stay-in-play-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "HIDDEN_BURROWED_RULES",
  schema: "starcraft_tmg_official_hidden_burrowed_rules_rule_slice_v1",
  catalogueVersion: "0.99.0-official-hidden-burrowed-rules",
  ordinal: 99,
  actionSchemaVersion: "hybrid_legal_space_v37",
  previousActionSchemaVersion: "hybrid_legal_space_v36",
  previous: {
    schema: "starcraft_tmg_official_status_stay_in_play_rules_rule_slice_v1",
    sliceHash: "e6c13284ab2062d6f850d68f765e3b4722b0f7ece89c234f376adbe89ebb5279",
    catalogueHash: "b611b4d670c9fce7322d7d65025b949e0d6a752febe400a1d9d17a65bae6646b",
    runtimeHash: "1f646eb170278090bfc7ac77e35d579fb7a13cb148ac90c53ed72fa9d90d69b9",
    graphHash: "ee6a354cf18f93784b508648019817d84c84f0f8627a95e18cb321bab5549a32",
    relationship: createOfficialStatusStayInPlayRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "16fca9616ade33959b13cfd58805ae5e44ccc94ff082cf07f5d0a7b50d4df2ed",
    catalogueHash: "887e44baa78c679041a9f60b5c4d47b3992cfe96fb3cae009177e5f444aa6990",
    runtimeHash: "f27befcc6168ce08c8f192f5b1a6364cfff47e8d9c419e61470afd3fa7c5ded0",
    graphHash: "53c2007c387b84243a904e50b259edc20f774ac4b65a7b118b4a4964f3f6ca66",
  },
  counts: {
    previousExecutable: 729, previousReview: 183,
    executable: 747, review: 165, displayOnly: 114, executors: 68,
  },
  remainingSlices: 12,
  newAtomIds: OFFICIAL_HIDDEN_BURROWED_RULES_NEW_ATOM_IDS,
  executor: {
    id: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID,
    version: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_HIDDEN_BURROWED_RULES_TRANSITION_SCHEMA,
  },
  actionType: OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_HIDDEN_BURROWED_RULES_PARAMETER_KIND,
  relationship: createOfficialHiddenBurrowedRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: {
    phase: "rules_procedure",
    window: "hidden_burrowed_lifecycle_targeting_defense_movement_or_combat_resolution",
    priority: 199,
  },
  preconditions: [{
    predicateId: "hidden_burrowed.complete_rules_owned_state_denominator",
    inputSchema: OFFICIAL_HIDDEN_BURROWED_RULES_PENDING_SCHEMA,
    failureCode: "HIDDEN_BURROWED_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "hidden_burrowed.uses_pinned_core_and_current_product_sources",
    inputSchema: "starcraft_tmg_official_hidden_burrowed_data_bundle_v1",
    failureCode: "HIDDEN_BURROWED_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "hidden_burrowed.mutation_geometry_and_event_are_rules_derived",
    inputSchema: "starcraft_tmg_official_hidden_burrowed_plan_v1",
    failureCode: "HIDDEN_BURROWED_MUTATION_STALE",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "HIDDEN_BURROWED_ACTION_INVALID",
    "HIDDEN_BURROWED_ACTION_STALE",
    "HIDDEN_BURROWED_PENDING_INVALID",
    "HIDDEN_BURROWED_CHOICE_INVALID",
    "HIDDEN_BURROWED_PARAMETER_DOMAIN_STALE",
    "HIDDEN_BURROWED_SOURCE_LOCK_BINDING_INVALID",
    "HIDDEN_BURROWED_DATA_ARTIFACT_BINDING_INVALID",
    "HIDDEN_BURROWED_STATE_INVALID",
    "HIDDEN_BURROWED_LIFECYCLE_TRIGGER_INVALID",
    "BURROWED_START_ROUND_TRIGGER_INVALID",
    "BURROWED_REMOVAL_TRIGGER_INVALID",
    "BURROWED_ACTION_NOT_PERMITTED",
    "HIDDEN_TARGETING_QUERY_INVALID",
    "HIDDEN_BURROWED_ATTACK_EVENT_INVALID",
    "HIDDEN_BURROWED_ATTACK_EVENT_ALREADY_RESOLVED",
    "BURROWED_MOVEMENT_QUERY_INVALID",
    "BURROWED_COMBAT_START_EVENT_INVALID",
    "BURROWED_CLOSE_RANKS_WITNESS_INVALID",
    "BURROWED_PERMISSION_QUERY_INVALID",
    "HIDDEN_BURROWED_MUTATION_STALE",
  ],
  evidenceSlug: "hidden-burrowed-rules-v1",
  evidenceFixtures: {
    positive: "hidden-four-inch-target-and-burrowed-lifecycle",
    negative: "hidden-beyond-four-forged-event-and-burrowed-endpoint-reject",
    interaction: "per-attack-evade-impact-immunity-and-close-ranks-sequence",
    lifecycle: "gain-round-start-action-removal-and-replay",
  },
  executableScope:
    "official_hidden_current_status_consumer_and_generic_burrowed_rules_harness_under_current_source_lock",
  progressKey: "hiddenBurrowedRulesProgress",
  progress: {
    promotedAtomCount: 18,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 18,
    burrowedAndHiddenStatusClassificationExecutable: true,
    gainStartRoundAndRemovalLifecycleExecutable: true,
    hiddenFourInchTargetingAndVisibilityExecutable: true,
    hiddenImpactImmunityExecutable: true,
    perTargetingAttackSingleEvadeOpportunityExecutable: true,
    burrowedPathPassThroughAndEndpointRestrictionExecutable: true,
    burrowedCombatCloseRanksSequenceExecutable: true,
    burrowedSizeSupplyActionAndAbilityPermissionsExecutable: true,
    existingMissionControlProhibitionRetained: true,
    currentOfficialHiddenCarrierAndDetectionIndexBound: true,
    currentOfficialBurrowedCarrierAvailable: false,
    existingAttackMovementLosImpactConsumersFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "hidden_burrowed_rules_v1",
  frozenExecutorIds: [
    "authority.start-of-round-v5", "authority.standard-move-v5",
    "authority.disengage-v5", "authority.assault-run-v1",
    "authority.ranged-attack-v6", "authority.close-combat-attack-v8",
    "authority.impact-v1", "authority.terrain-los-rules-v1",
    "authority.mission-marker-control-v3",
  ],
  judgeTests: 52,
  agentDecisionEvidence:
    "rules_owned_hidden_burrowed_lifecycle_geometry_targeting_defense_and_combat_transition",
  userVisibleChecks: [
    "hidden_targeting_receipt_shows_exact_base_edge_distance_and_four_inch_boundary",
    "attack_defense_receipt_shows_one_evade_opportunity_and_impact_suppression",
    "burrowed_movement_receipt_shows_each_crossed_base_and_endpoint_gap",
    "combat_receipt_shows_start_snapshot_close_ranks_witness_and_attack_permission",
  ],
  blocks: [
    "one_hundred_sixty_five_actionable_atoms_remain_non_executable",
    "no_current_official_burrowed_carrier_so_production_path_is_quarantined",
    "path_of_shadows_activation_and_detection_ability_costs_remain_separate_atoms",
    "existing_consumers_remain_frozen_and_require_explicit_versioned_composition",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialHiddenBurrowedRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialHiddenBurrowedRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
