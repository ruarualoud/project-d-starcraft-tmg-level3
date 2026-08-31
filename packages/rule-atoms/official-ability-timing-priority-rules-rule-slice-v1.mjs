import {
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_TYPE,
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID,
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_VERSION,
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_NEW_ATOM_IDS,
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PARAMETER_KIND,
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PENDING_SCHEMA,
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_TRANSITION_SCHEMA,
} from "./official-ability-timing-priority-rules-executor-v1.mjs";
import { createOfficialKeywordSpecialAbilityRulesRelationshipExtensionV1 } from
  "./official-keyword-special-ability-rules-relationship-contract-v1.mjs";
import { createOfficialAbilityTimingPriorityRulesRelationshipExtensionV1 } from
  "./official-ability-timing-priority-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "ABILITY_TIMING_PRIORITY_RULES",
  schema: "starcraft_tmg_official_ability_timing_priority_rules_rule_slice_v1",
  catalogueVersion: "0.91.0-official-ability-timing-priority-rules",
  ordinal: 91,
  actionSchemaVersion: "hybrid_legal_space_v29",
  previousActionSchemaVersion: "hybrid_legal_space_v28",
  previous: {
    schema: "starcraft_tmg_official_keyword_special_ability_rules_rule_slice_v1",
    sliceHash: "5fcfee2fde6d7105d740e5e74ab30349c33e6289cd67d20b5bdcc51a5bcbe28c",
    catalogueHash: "943326ae944165e7c210271e65ddb560f456eb491b45c7533b71047c8752f3ab",
    runtimeHash: "a4fa8535bdc155f645cc1fe1fecf645794c493f7a566500a9543726473067916",
    graphHash: "5af8ec1d93af676de95ca0182db62c313fc1acc4f4aacc325288aae22f3b8c59",
    relationship: createOfficialKeywordSpecialAbilityRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "57476aacab986ace2b95d8feb2f02444a6578f79222202bac93b9ba2c0aed82c",
    catalogueHash: "68c339dac82aed07f09c2e376c0efeb14cd8ae91de064b5c66ab99a7f5f86cf7",
    runtimeHash: "1e3b6ff84b0fbe51f6826b3aceb09028459e969a7d03b3c2bd676e8bba8ee21b",
    graphHash: "6ff76daed0899d49402d5faf20266467bd3f7d68ddb953a61087fb85586937b4",
  },
  counts: { previousExecutable: 658, previousReview: 254,
    executable: 664, review: 248, displayOnly: 114, executors: 60 },
  remainingSlices: 20,
  newAtomIds: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID,
    version: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PARAMETER_KIND,
  relationship: createOfficialAbilityTimingPriorityRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "ability_trigger_or_end_of_round_resolution_window",
    window: "ability_timing_priority_rules_procedure", priority: 191 },
  preconditions: [{
    predicateId: "ability_timing_priority.complete_rules_owned_plan_denominator",
    inputSchema: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PENDING_SCHEMA,
    failureCode: "ABILITY_TIMING_PRIORITY_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "ability_timing_priority.uses_pinned_official_indexes",
    inputSchema: "starcraft_tmg_official_ability_timing_priority_data_bundle_v1",
    failureCode: "ABILITY_TIMING_PRIORITY_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "ability_timing_priority.does_not_execute_arbitrary_effects",
    inputSchema: "starcraft_tmg_official_ability_timing_priority_plan_certificate_v1",
    failureCode: "ABILITY_TIMING_PRIORITY_PLAN_INVALID",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "ABILITY_TIMING_PRIORITY_ACTION_INVALID",
    "ABILITY_TIMING_PRIORITY_ACTION_STALE",
    "ABILITY_TIMING_PRIORITY_PENDING_INVALID",
    "ABILITY_TIMING_PRIORITY_CHOICE_INVALID",
    "ABILITY_TIMING_PRIORITY_PARAMETER_DOMAIN_STALE",
    "ABILITY_TIMING_PRIORITY_SOURCE_LOCK_BINDING_INVALID",
    "ABILITY_TIMING_PRIORITY_DATA_ARTIFACT_BINDING_INVALID",
    "PASSIVE_PRIORITY_COMPLETE_SET_REQUIRED",
    "PASSIVE_PRIORITY_CONTROLLER_ORDER_INVALID",
    "REACTION_PRIORITY_COMPLETE_SET_REQUIRED",
    "REACTION_SPECIFIC_DURATION_EXECUTOR_REQUIRED",
    "END_OF_ROUND_CONTROLLER_ORDER_INVALID",
  ],
  evidenceSlug: "ability-timing-priority-rules-v1",
  evidenceFixtures: {
    positive: "comparison-passive-reaction-duration-and-end-round-order",
    negative: "incomplete-set-forged-category-order-and-expiry-reject",
    interaction: "active-player-first-controller-order-and-cleanup-dependencies",
    lifecycle: "official-timing-certified-plan-authority-apply-and-replay",
  },
  executableScope:
    "official_ability_type_comparison_passive_and_reaction_simultaneous_priority_reaction_default_duration_and_end_round_effect_order_current_source_lock",
  progressKey: "abilityTimingPriorityRulesProgress",
  progress: {
    promotedAtomCount: 6, routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 6,
    abilityTypeComparisonExecutable: true,
    ownSimultaneousPassiveControllerOrderExecutable: true,
    crossPlayerPassiveActivePlayerPriorityExecutable: true,
    simultaneousReactionActivePlayerPriorityExecutable: true,
    reactionDefaultEndRoundExpiryExecutable: true,
    endOfRoundFirstPlayerThenControllerOrderExecutable: true,
    eachEffectMustFullyResolveBeforeNext: true,
    arbitraryCardEffectExecutionPerformed: false,
    existingEndOfRoundExecutorsFrozen: true,
    clientSuppliedPriorityDurationOrComparisonAccepted: false,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "ability_timing_priority_rules_v1",
  frozenExecutorIds: ["authority.keyword-special-ability-rules-v1",
    "authority.end-of-round-effects-v1", "authority.end-of-round-effects-v2",
    "authority.end-of-round-effects-v3", "authority.end-of-round-effects-v4",
    "authority.end-of-round-effects-v5", "authority.cleanup-refresh-v3"],
  judgeTests: 40,
  agentDecisionEvidence:
    "rules_owned_complete_trigger_or_end_round_set_then_confirmed_order_certificate",
  userVisibleChecks: [
    "comparison_receipt_shows_active_passive_reaction_differences",
    "passive_receipt_shows_controller_order_inside_active_player_first_groups",
    "reaction_receipt_shows_active_player_then_opponent_for_one_trigger",
    "duration_receipt_shows_default_through_end_round_then_cleanup_removal",
    "end_round_receipt_shows_first_player_group_and_requires_full_sequential_resolution",
  ],
  blocks: [
    "two_hundred_forty_eight_actionable_atoms_remain_non_executable",
    "ordering_certificates_do_not_execute_arbitrary_card_effects",
    "individual_special_ability_effect_executors_remain_separate_atomic_slices",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialAbilityTimingPriorityRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialAbilityTimingPriorityRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
