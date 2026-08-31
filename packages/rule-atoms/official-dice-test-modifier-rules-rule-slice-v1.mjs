import {
  OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_TYPE,
  OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_ID,
  OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_VERSION,
  OFFICIAL_DICE_TEST_MODIFIER_RULES_NEW_ATOM_IDS,
  OFFICIAL_DICE_TEST_MODIFIER_RULES_PARAMETER_KIND,
  OFFICIAL_DICE_TEST_MODIFIER_RULES_PENDING_SCHEMA,
  OFFICIAL_DICE_TEST_MODIFIER_RULES_TRANSITION_SCHEMA,
} from "./official-dice-test-modifier-rules-executor-v1.mjs";
import { createOfficialPlayerControlRelationshipRulesRelationshipExtensionV1 } from
  "./official-player-control-relationship-rules-relationship-contract-v1.mjs";
import { createOfficialDiceTestModifierRulesRelationshipExtensionV1 } from
  "./official-dice-test-modifier-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "DICE_TEST_MODIFIER_RULES",
  schema: "starcraft_tmg_official_dice_test_modifier_rules_rule_slice_v1",
  catalogueVersion: "0.89.0-official-dice-test-modifier-rules",
  ordinal: 89,
  actionSchemaVersion: "hybrid_legal_space_v27",
  previousActionSchemaVersion: "hybrid_legal_space_v26",
  previous: {
    schema: "starcraft_tmg_official_player_control_relationship_rules_rule_slice_v1",
    sliceHash: "4798bbe5980a5fafda9ffad856f53327f77422833ce302d2a5f00667bd169987",
    catalogueHash: "50135173ca657d69fc62cb779cd1f15275d00b89c883ada59b49cd260b7f4536",
    runtimeHash: "b3e9b3984e81b98da204e8fc75b046c6bd4329c8758a0b4063365213d7cd901f",
    graphHash: "b74c7a91c59e7007e122fb353d877ec58630ccf6934f55739a48fb65a752f494",
    relationship: createOfficialPlayerControlRelationshipRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "ea7f1b10b07f8eee0f312e805bfb20bcf34da73e647f57424a3be3a8ff78b632",
    catalogueHash: "af887ff1952ec3076ef74a087b983ef94c743b119d76d714b255184de3cb1a8f",
    runtimeHash: "81fce5be2083d1c54375f1c358b7c2653b7c62af6226c9dc5808616c8b828df4",
    graphHash: "9e9b4898c1aaa2fe0cbcefd1c8522b828871ee5d8543962b4217f3e31cbd0dc6",
  },
  counts: { previousExecutable: 627, previousReview: 285,
    executable: 645, review: 267, displayOnly: 114, executors: 58 },
  remainingSlices: 22,
  newAtomIds: OFFICIAL_DICE_TEST_MODIFIER_RULES_NEW_ATOM_IDS,
  executor: {
    id: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_ID,
    version: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_DICE_TEST_MODIFIER_RULES_TRANSITION_SCHEMA,
  },
  actionType: OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_DICE_TEST_MODIFIER_RULES_PARAMETER_KIND,
  relationship: createOfficialDiceTestModifierRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "any_test_or_value_generation_window",
    window: "dice_test_modifier_procedure", priority: 189 },
  preconditions: [{
    predicateId: "dice_test_modifier.complete_rules_owned_plan_denominator",
    inputSchema: OFFICIAL_DICE_TEST_MODIFIER_RULES_PENDING_SCHEMA,
    failureCode: "DICE_RULES_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "dice_test_modifier.uses_pinned_official_core_sources",
    inputSchema: "starcraft_tmg_official_dice_test_modifier_data_bundle_v1",
    failureCode: "DICE_RULES_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "dice_test_modifier.chance_is_referee_committed",
    inputSchema: "starcraft_tmg_chance_reveal_bundle_v1",
    failureCode: "DICE_RULES_REVEALS_REQUIRED",
  }],
  chance: { kind: "chance_ticket",
    ticketSchema: "starcraft_tmg_chance_bundle_v1" },
  rejectionCodes: [
    "DICE_RULES_ACTION_INVALID",
    "DICE_RULES_ACTION_STALE",
    "DICE_RULES_PENDING_INVALID",
    "DICE_RULES_CHOICE_INVALID",
    "DICE_RULES_REROLL_CHOICE_INVALID",
    "DICE_RULES_PARAMETER_DOMAIN_STALE",
    "DICE_RULES_SOURCE_LOCK_BINDING_INVALID",
    "DICE_RULES_DATA_ARTIFACT_BINDING_INVALID",
    "DICE_MODIFIER_REGISTRY_INVALID",
    "DICE_NULL_CAPABILITY_ROLL_FORBIDDEN",
    "DICE_COCKED_AGREEMENT_INVALID",
    "DICE_RULES_REVEALS_REQUIRED",
  ],
  evidenceSlug: "dice-test-modifier-rules-v1",
  evidenceFixtures: {
    positive: "modifier-test-generated-value-and-reroll",
    negative: "null-forged-registry-stale-chance-and-cocked-agreement-reject",
    interaction: "existing-attack-natural-boundary-and-stimpack-buff-crosscheck",
    lifecycle: "initial-result-controller-reroll-choice-final-receipt",
  },
  executableScope:
    "official_target_number_modifier_test_reroll_generated_value_and_cocked_die_current_source_lock",
  progressKey: "diceTestModifierRulesProgress",
  progress: {
    promotedAtomCount: 18,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 18,
    differentNamedModifierSourcesCumulativeExecutable: true,
    positiveNegativeBuffDebuffDirectionsExecutable: true,
    targetNumberBoundsAndNullCapabilityExecutable: true,
    characteristicAndAttributeTestsExecutable: true,
    testResolutionWithNaturalBoundariesExecutable: true,
    postInitialResultRerollChoiceExecutable: true,
    rerollReplacementEvenWhenWorseExecutable: true,
    fixedAdditionGeneratedValueNotTestExecutable: true,
    cockedDiceAgreementAndInvalidRerollExecutable: true,
    digitalDiceNeverCockedExplicit: true,
    clientSuppliedDiceResultAccepted: false,
    sourceRefreshPerformed: false,
    repositoryFallbackUsed: false,
  },
  contractGroup: "dice_test_modifier_rules_v1",
  frozenExecutorIds: ["authority.player-control-relationship-rules-v1",
    "authority.model-base-geometry-rules-v1", "authority.ranged-attack-v6",
    "authority.marine-stimpack-active-v3"],
  judgeTests: 49,
  agentDecisionEvidence:
    "rules_owned_plan_then_referee_chance_reveal_and_post_result_reroll_choice",
  userVisibleChecks: [
    "modifier_receipt_lists_named_sources_signed_directions_and_final_target_number",
    "test_receipt_shows_classification_initial_roll_target_and_success",
    "reroll_window_opens_only_after_initial_result_and_replacement_is_final",
    "generated_value_receipt_separates_fixed_addition_from_target_modifiers",
    "invalid_physical_die_receipt_binds_pregame_agreement_and_replacement_roll",
  ],
  blocks: [
    "two_hundred_sixty_seven_actionable_atoms_remain_non_executable",
    "keyword_and_special_ability_primitives_wait_for_slice_90",
    "existing_consumer_combinations_need_future_closure_before_production_room",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialDiceTestModifierRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialDiceTestModifierRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
