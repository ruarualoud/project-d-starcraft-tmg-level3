import {
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_ACTION_TYPE,
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_ID,
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_VERSION,
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_NEW_ATOM_IDS,
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_PARAMETER_KIND,
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_PENDING_SCHEMA,
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_TRANSITION_SCHEMA,
} from "./official-card-build-payment-rules-executor-v1.mjs";
import { createOfficialAbilityTimingPriorityRulesRelationshipExtensionV1 } from
  "./official-ability-timing-priority-rules-relationship-contract-v1.mjs";
import { createOfficialCardBuildPaymentRulesRelationshipExtensionV1 } from
  "./official-card-build-payment-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "CARD_BUILD_PAYMENT_RULES",
  schema: "starcraft_tmg_official_card_build_payment_rules_rule_slice_v1",
  catalogueVersion: "0.92.0-official-card-build-payment-rules",
  ordinal: 92,
  actionSchemaVersion: "hybrid_legal_space_v30",
  previousActionSchemaVersion: "hybrid_legal_space_v29",
  previous: {
    schema: "starcraft_tmg_official_ability_timing_priority_rules_rule_slice_v1",
    sliceHash: "57476aacab986ace2b95d8feb2f02444a6578f79222202bac93b9ba2c0aed82c",
    catalogueHash: "68c339dac82aed07f09c2e376c0efeb14cd8ae91de064b5c66ab99a7f5f86cf7",
    runtimeHash: "1e3b6ff84b0fbe51f6826b3aceb09028459e969a7d03b3c2bd676e8bba8ee21b",
    graphHash: "6ff76daed0899d49402d5faf20266467bd3f7d68ddb953a61087fb85586937b4",
    relationship: createOfficialAbilityTimingPriorityRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "c1bfa98df9199b722b3a279637934e69146654a429fa18b83a3eceab373cc432",
    catalogueHash: "672759bd456ea330af46131709716b1418d646dd1b9d405a0acce8a7101e4e74",
    runtimeHash: "0d11e5569f1eb6b3e62ac50b1bad9930d30cd7bef8b6db1b4cf39bd2bcf3627d",
    graphHash: "61c194dce1c9b67e05b67a63722680081f6a434e8fb7ecf0d1e48f859df0007b",
  },
  counts: { previousExecutable: 664, previousReview: 248,
    executable: 671, review: 241, displayOnly: 114, executors: 61 },
  remainingSlices: 19,
  newAtomIds: OFFICIAL_CARD_BUILD_PAYMENT_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_ID,
    version: OFFICIAL_CARD_BUILD_PAYMENT_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_CARD_BUILD_PAYMENT_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_CARD_BUILD_PAYMENT_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_CARD_BUILD_PAYMENT_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_CARD_BUILD_PAYMENT_RULES_PARAMETER_KIND,
  relationship: createOfficialCardBuildPaymentRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "army_building_or_ability_cost_payment_window",
    window: "card_build_payment_rules_procedure", priority: 192 },
  preconditions: [{
    predicateId: "card_build_payment.complete_rules_owned_plan_denominator",
    inputSchema: OFFICIAL_CARD_BUILD_PAYMENT_RULES_PENDING_SCHEMA,
    failureCode: "CARD_BUILD_PAYMENT_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "card_build_payment.uses_pinned_official_card_profiles",
    inputSchema: "starcraft_tmg_official_card_build_payment_data_bundle_v1",
    failureCode: "CARD_BUILD_PAYMENT_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "card_build_payment.defers_full_army_eligibility_and_budget",
    inputSchema: "starcraft_tmg_official_card_build_payment_plan_certificate_v1",
    failureCode: "CARD_BUILD_PAYMENT_PLAN_INVALID",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "CARD_BUILD_PAYMENT_ACTION_INVALID", "CARD_BUILD_PAYMENT_ACTION_STALE",
    "CARD_BUILD_PAYMENT_PENDING_INVALID", "CARD_BUILD_PAYMENT_CHOICE_INVALID",
    "CARD_BUILD_PAYMENT_PARAMETER_DOMAIN_STALE",
    "CARD_BUILD_PAYMENT_SOURCE_LOCK_BINDING_INVALID",
    "CARD_BUILD_PAYMENT_DATA_ARTIFACT_BINDING_INVALID",
    "TACTICAL_CARD_PURCHASE_REQUEST_INVALID", "UNIQUE_CARD_SINGLE_COPY_LIMIT",
    "ABILITY_RESOURCE_TYPE_MISMATCH", "ABILITY_RESOURCE_CARD_NOT_READY",
    "ABILITY_RESOURCE_FULL_COST_REQUIRED",
  ],
  evidenceSlug: "card-build-payment-rules-v1",
  evidenceFixtures: {
    positive: "official-layout-purchase-unique-and-resource-payment",
    negative: "forged-profile-duplicate-unique-wrong-resource-and-underpayment-reject",
    interaction: "subfaction-race-resolution-and-ephemeral-excess-resource-loss",
    lifecycle: "official-card-plan-authority-apply-and-replay",
  },
  executableScope:
    "official_faction_and_tactical_card_layout_tactical_vespene_purchase_slots_unique_single_copy_and_ephemeral_ability_resource_payment_current_source_lock",
  progressKey: "cardBuildPaymentRulesProgress",
  progress: {
    promotedAtomCount: 7, routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 7, exactOfficialCardProfilesCompiled: 37,
    factionAndTacticalStandardLayoutExecutable: true,
    tacticalVespenePurchaseAndArmySlotsExecutable: true,
    uniqueCardSingleCopyLimitExecutable: true,
    abilityResourceExcessLostExecutable: true,
    generatedAbilityResourceRetainedAfterPayment: 0,
    fullFactionEligibilityDeferredToSlice: 102,
    overallVespeneBudgetAndOpenInformationDeferredToSlice: 103,
    arbitraryAbilityEffectExecuted: false,
    existingCardAndAbilityExecutorsFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "card_build_payment_rules_v1",
  frozenExecutorIds: ["authority.ability-timing-priority-rules-v1",
    "authority.keyword-special-ability-rules-v1",
    "authority.academy-medic-ability-v1", "authority.academy-medic-ability-v2",
    "authority.medic-medpack-active-v1", "authority.medic-medpack-active-v2",
    "authority.medic-restoration-reaction-v1",
    "authority.marine-stimpack-active-v1"],
  judgeTests: 42,
  agentDecisionEvidence:
    "rules_owned_exact_card_profile_then_confirmed_layout_purchase_uniqueness_or_payment_certificate",
  userVisibleChecks: [
    "card_receipt_shows_name_type_faction_tags_slots_resource_and_ability_hash",
    "purchase_receipt_shows_vespene_cost_and_explicit_budget_deferral",
    "unique_audit_rejects_second_unique_copy_and_allows_nonunique_repeat",
    "ability_payment_receipt_shows_generated_applied_excess_lost_and_zero_retained",
  ],
  blocks: [
    "two_hundred_forty_one_actionable_atoms_remain_non_executable",
    "full_faction_and_subfaction_army_eligibility_remains_slice_102",
    "complete_army_vespene_budget_and_open_information_remain_slice_103",
    "individual_ability_effect_execution_remains_owned_by_atomic_executors",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialCardBuildPaymentRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialCardBuildPaymentRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
