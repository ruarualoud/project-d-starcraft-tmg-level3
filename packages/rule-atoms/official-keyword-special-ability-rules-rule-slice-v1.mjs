import {
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_TYPE,
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID,
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_VERSION,
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_NEW_ATOM_IDS,
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PARAMETER_KIND,
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PENDING_SCHEMA,
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_TRANSITION_SCHEMA,
} from "./official-keyword-special-ability-rules-executor-v1.mjs";
import { createOfficialDiceTestModifierRulesRelationshipExtensionV1 } from
  "./official-dice-test-modifier-rules-relationship-contract-v1.mjs";
import { createOfficialKeywordSpecialAbilityRulesRelationshipExtensionV1 } from
  "./official-keyword-special-ability-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "KEYWORD_SPECIAL_ABILITY_RULES",
  schema: "starcraft_tmg_official_keyword_special_ability_rules_rule_slice_v1",
  catalogueVersion: "0.90.0-official-keyword-special-ability-rules",
  ordinal: 90,
  actionSchemaVersion: "hybrid_legal_space_v28",
  previousActionSchemaVersion: "hybrid_legal_space_v27",
  previous: {
    schema: "starcraft_tmg_official_dice_test_modifier_rules_rule_slice_v1",
    sliceHash: "ea7f1b10b07f8eee0f312e805bfb20bcf34da73e647f57424a3be3a8ff78b632",
    catalogueHash: "af887ff1952ec3076ef74a087b983ef94c743b119d76d714b255184de3cb1a8f",
    runtimeHash: "81fce5be2083d1c54375f1c358b7c2653b7c62af6226c9dc5808616c8b828df4",
    graphHash: "9e9b4898c1aaa2fe0cbcefd1c8522b828871ee5d8543962b4217f3e31cbd0dc6",
    relationship: createOfficialDiceTestModifierRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "5fcfee2fde6d7105d740e5e74ab30349c33e6289cd67d20b5bdcc51a5bcbe28c",
    catalogueHash: "943326ae944165e7c210271e65ddb560f456eb491b45c7533b71047c8752f3ab",
    runtimeHash: "a4fa8535bdc155f645cc1fe1fecf645794c493f7a566500a9543726473067916",
    graphHash: "5af8ec1d93af676de95ca0182db62c313fc1acc4f4aacc325288aae22f3b8c59",
  },
  counts: { previousExecutable: 645, previousReview: 267,
    executable: 658, review: 254, displayOnly: 114, executors: 59 },
  remainingSlices: 21,
  newAtomIds: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_NEW_ATOM_IDS,
  executor: {
    id: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID,
    version: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_TRANSITION_SCHEMA,
  },
  actionType: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PARAMETER_KIND,
  relationship: createOfficialKeywordSpecialAbilityRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "any_keyword_or_special_ability_resolution_window",
    window: "keyword_special_ability_rules_procedure", priority: 190 },
  preconditions: [{
    predicateId: "keyword_special_ability.complete_rules_owned_plan_denominator",
    inputSchema: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PENDING_SCHEMA,
    failureCode: "KEYWORD_SPECIAL_ABILITY_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "keyword_special_ability.uses_pinned_official_indexes",
    inputSchema: "starcraft_tmg_official_keyword_special_ability_data_bundle_v1",
    failureCode: "KEYWORD_SPECIAL_ABILITY_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "keyword_special_ability.client_cannot_supply_semantic_truth",
    inputSchema: "starcraft_tmg_official_keyword_special_ability_plan_certificate_v1",
    failureCode: "KEYWORD_SPECIAL_ABILITY_PLAN_INVALID",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "KEYWORD_SPECIAL_ABILITY_ACTION_INVALID",
    "KEYWORD_SPECIAL_ABILITY_ACTION_STALE",
    "KEYWORD_SPECIAL_ABILITY_PENDING_INVALID",
    "KEYWORD_SPECIAL_ABILITY_CHOICE_INVALID",
    "KEYWORD_SPECIAL_ABILITY_PARAMETER_DOMAIN_STALE",
    "KEYWORD_SPECIAL_ABILITY_SOURCE_LOCK_BINDING_INVALID",
    "KEYWORD_SPECIAL_ABILITY_DATA_ARTIFACT_BINDING_INVALID",
    "KEYWORD_BOLD_CAPS_FORMAT_INVALID",
    "KEYWORD_CLIENT_MEANING_FORBIDDEN",
    "SPECIAL_ABILITY_CATEGORY_FORGERY",
    "SPECIAL_ABILITY_TARGET_REQUIREMENTS_UNSATISFIED",
    "SPECIAL_ABILITY_SAME_NAME_EFFECT_CONFLICT_UNRESOLVED",
    "REPEATABLE_KEYWORD_FORGERY",
  ],
  evidenceSlug: "keyword-special-ability-rules-v1",
  evidenceFixtures: {
    positive: "keyword-category-target-nonstack-and-repeatable",
    negative: "format-meaning-category-target-frequency-and-conflict-reject",
    interaction: "precision-stimpack-target-los-and-named-frequency-dependencies",
    lifecycle: "official-index-certified-plan-authority-apply-and-replay",
  },
  executableScope:
    "official_keyword_format_meaning_nonstack_numeric_highest_special_ability_category_targeting_same_name_nonstack_and_repeatable_current_source_lock",
  progressKey: "keywordSpecialAbilityRulesProgress",
  progress: {
    promotedAtomCount: 13,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 13,
    officialKeywordDefinitionCount: 76,
    officialSpecialAbilityInstanceCount: 201,
    officialSpecialAbilityUniqueNameCount: 139,
    keywordBoldCapsAndStableMeaningExecutable: true,
    sameKeywordNonstackExecutable: true,
    numericKeywordHighestOnlyExecutable: true,
    activePassiveReactionCategoryExecutable: true,
    targetedRangeAndLosDependencyExecutable: true,
    untargetedLosExemptionExecutable: true,
    tokenMarkerPlacementNotTargetExecutable: true,
    sameNamedSpecialAbilityNonstackExecutable: true,
    differentDefinitionSameNameConflictFailsClosed: true,
    repeatableUsePermissionWithCostAndTriggerExecutable: true,
    detailedCategoryTimingAndPriorityDeferredToSlice91: true,
    clientSuppliedMeaningCategoryOrResultAccepted: false,
    sourceRefreshPerformed: false,
    repositoryFallbackUsed: false,
  },
  contractGroup: "keyword_special_ability_rules_v1",
  frozenExecutorIds: ["authority.dice-test-modifier-rules-v1",
    "authority.active-ability-v1", "authority.marine-stimpack-active-v3",
    "authority.terrain-los-rules-v1"],
  judgeTests: 45,
  agentDecisionEvidence:
    "rules_owned_official_keyword_and_ability_index_then_confirmed_primitive_resolution",
  userVisibleChecks: [
    "keyword_receipt_shows_registry_meaning_same_name_suppression_and_highest_numeric_value",
    "ability_receipt_shows_exact_official_card_source_and_active_passive_reaction_category",
    "targeting_receipt_distinguishes_targeted_untargeted_and_token_marker_placement",
    "same_name_receipt_shows_one_effect_or_explicit_unresolved_definition_conflict",
    "repeatable_receipt_shows_frequency_bypass_while_requiring_each_cost_and_trigger",
  ],
  blocks: [
    "two_hundred_fifty_four_actionable_atoms_remain_non_executable",
    "passive_reaction_timing_priority_and_end_round_order_wait_for_slice_91",
    "individual_special_ability_effect_executors_remain_separate_atomic_slices",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialKeywordSpecialAbilityRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialKeywordSpecialAbilityRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
