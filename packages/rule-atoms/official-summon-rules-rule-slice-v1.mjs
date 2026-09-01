import {
  OFFICIAL_SUMMON_RULES_ACTION_TYPE,
  OFFICIAL_SUMMON_RULES_EXECUTOR_ID,
  OFFICIAL_SUMMON_RULES_EXECUTOR_VERSION,
  OFFICIAL_SUMMON_RULES_NEW_ATOM_IDS,
  OFFICIAL_SUMMON_RULES_PARAMETER_KIND,
  OFFICIAL_SUMMON_RULES_PENDING_SCHEMA,
  OFFICIAL_SUMMON_RULES_TRANSITION_SCHEMA,
} from "./official-summon-rules-executor-v1.mjs";
import { createOfficialSummonRulesRelationshipExtensionV1 } from
  "./official-summon-rules-relationship-contract-v1.mjs";
import { createOfficialHiddenBurrowedRulesRelationshipExtensionV1 } from
  "./official-hidden-burrowed-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "SUMMON_RULES",
  schema: "starcraft_tmg_official_summon_rules_rule_slice_v1",
  catalogueVersion: "0.100.0-official-summon-rules", ordinal: 100,
  actionSchemaVersion: "hybrid_legal_space_v38",
  previousActionSchemaVersion: "hybrid_legal_space_v37",
  previous: {
    schema: "starcraft_tmg_official_hidden_burrowed_rules_rule_slice_v1",
    sliceHash: "16fca9616ade33959b13cfd58805ae5e44ccc94ff082cf07f5d0a7b50d4df2ed",
    catalogueHash: "887e44baa78c679041a9f60b5c4d47b3992cfe96fb3cae009177e5f444aa6990",
    runtimeHash: "f27befcc6168ce08c8f192f5b1a6364cfff47e8d9c419e61470afd3fa7c5ded0",
    graphHash: "53c2007c387b84243a904e50b259edc20f774ac4b65a7b118b4a4964f3f6ca66",
    relationship: createOfficialHiddenBurrowedRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "2005882bda4e1b8872bdf1f544b08a75d73c94ec1b0f106d431a5c647e860227",
    catalogueHash: "c2c12a4878d15d12c3fc50ffbd30c3761745280eef240a7f6a242db74725c73c",
    runtimeHash: "b09612c0d0978fee0e28782f0a64af0bc527375714d957f62a80388739aacd63",
    graphHash: "65ecafb810cecd133e7be8602615649c2d83a4684dd292503979cdd1899524d9",
  },
  counts: { previousExecutable: 747, previousReview: 165,
    executable: 760, review: 152, displayOnly: 114, executors: 69 },
  remainingSlices: 11, newAtomIds: OFFICIAL_SUMMON_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_SUMMON_RULES_EXECUTOR_ID,
    version: OFFICIAL_SUMMON_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_SUMMON_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_SUMMON_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_SUMMON_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_SUMMON_RULES_PARAMETER_KIND,
  relationship: createOfficialSummonRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "rules_procedure",
    window: "summoned_unit_classification_supply_placement_deployment_activation_or_relationship_resolution",
    priority: 200 },
  preconditions: [{
    predicateId: "summon.complete_rules_owned_state_denominator",
    inputSchema: OFFICIAL_SUMMON_RULES_PENDING_SCHEMA,
    failureCode: "SUMMON_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "summon.uses_pinned_core_current_product_and_p2p_sources",
    inputSchema: "starcraft_tmg_official_summon_data_bundle_v1",
    failureCode: "SUMMON_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "summon.mutation_geometry_supply_and_events_are_rules_derived",
    inputSchema: "starcraft_tmg_official_summon_plan_certificate_v1",
    failureCode: "SUMMON_MUTATION_STALE",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "SUMMON_ACTION_INVALID", "SUMMON_ACTION_STALE", "SUMMON_PENDING_INVALID",
    "SUMMON_CHOICE_INVALID", "SUMMON_PARAMETER_DOMAIN_STALE",
    "SUMMON_SOURCE_LOCK_BINDING_INVALID", "SUMMON_DATA_ARTIFACT_BINDING_INVALID",
    "SUMMONED_UNIT_PROFILE_REQUIRED", "SUMMONED_UNIT_CLASSIFICATION_REQUEST_INVALID",
    "SUMMON_SUPPLY_REQUEST_INVALID", "SUMMON_CURRENT_SUPPLY_STATE_DRIFT",
    "SUMMON_SUPPLY_STATE_OVER_CAP", "SUMMON_INSUFFICIENT_AVAILABLE_SUPPLY",
    "SUMMON_PLACEMENT_REQUEST_INVALID", "SUMMON_LEADING_MODEL_PARENT_B2B_REQUIRED",
    "SUMMON_ALL_MODELS_MUST_BE_PLACED_IN_COHERENCY",
    "SUMMON_OPPONENT_ZONE_OF_INFLUENCE", "SUMMON_SPECIAL_ABILITY_TRIGGER_REQUIRED",
    "SUMMON_SPECIAL_ABILITY_TRIGGER_INVALID", "SUMMON_KEYWORD_CURRENT_CARRIER_MISMATCH",
    "SUMMON_ACTIVATION_REQUEST_INVALID", "SUMMON_PARENT_ACTIVATION_END_EVENT_REQUIRED",
    "SUMMON_PARENT_ACTIVATION_END_EVENT_INVALID", "SUMMONED_UNIT_RELATIONSHIP_REQUEST_INVALID",
    "SUMMON_MUTATION_STALE",
  ],
  evidenceSlug: "summon-rules-v1",
  evidenceFixtures: { positive: "roachling-infestation-valid-summon",
    negative: "regular-deploy-zone-engagement-and-forged-trigger-reject",
    interaction: "supply-geometry-parent-activation-and-final-score",
    lifecycle: "classification-deploy-lock-parent-linked-parent-absent" },
  executableScope:
    "official_three_summoned_unit_identity_denominator_and_current_roachling_summon_keyword_transition",
  progressKey: "summonRulesProgress",
  progress: { promotedAtomCount: 13,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 13,
    summonedArmyListAndSlotExclusionExecutable: true,
    summonedNotReserveAndAbilityOnlyDeploymentExecutable: true,
    currentModelCountSupplyAndPoolGateExecutable: true,
    leadingParentContactAndRemainingCoherencyExecutable: true,
    enemyEngagementAndOpponentInfluenceZoneExclusionExecutable: true,
    summoningPhaseActivationLockExecutable: true,
    subsequentParentLinkedActivationExecutable: true,
    parentAbsentNormalActivationExecutable: true,
    friendlyFinalScoreAndCurrentSupplyRelationshipsExecutable: true,
    currentSummonedUnitDenominatorCount: 3,
    currentSummonKeywordCarrierCount: 1,
    pylonAndPointDefenseDroneDistinctDeploymentRulesPreserved: true,
    existingSupplyGeometryActivationReserveAndScoreConsumersFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "summon_rules_v1",
  frozenExecutorIds: ["authority.unit-card-supply-rules-v1",
    "authority.model-base-geometry-rules-v1", "authority.supply-pool-rules-v1",
    "authority.round-phase-activation-rules-v1", "authority.reserve-lifecycle-rules-v1",
    "authority.reserve-deploy-v5", "authority.hold-position-end-game-check-v2"],
  judgeTests: 52,
  agentDecisionEvidence:
    "rules_owned_summon_classification_supply_geometry_deployment_activation_and_relationship_transition",
  userVisibleChecks: [
    "summoned_unit_receipt_shows_no_army_slot_no_reserve_and_special_ability_only",
    "summon_receipt_shows_parent_contact_coherency_enemy_and_influence_zone_geometry",
    "supply_receipt_shows_current_model_count_total_current_supply_and_capacity",
    "activation_receipt_shows_same_phase_lock_parent_chain_or_parent_absent_normal_route",
  ],
  blocks: ["one_hundred_fifty_two_actionable_atoms_remain_non_executable",
    "pylon_warp_in_and_rapid_ingress_keep_their_own_unpromoted_card_geometry_atoms",
    "existing_consumers_remain_frozen_and_require_explicit_versioned_composition",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});

export function createOfficialSummonRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialSummonRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
