import {
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_TYPE,
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID,
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_VERSION,
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_NEW_ATOM_IDS,
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PARAMETER_KIND,
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PENDING_SCHEMA,
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_TRANSITION_SCHEMA,
} from "./official-army-resource-budget-rules-executor-v1.mjs";
import { createOfficialArmyResourceBudgetRulesRelationshipExtensionV1 } from
  "./official-army-resource-budget-rules-relationship-contract-v1.mjs";
import { createOfficialFactionArmyEligibilityRulesRelationshipExtensionV1 } from
  "./official-faction-army-eligibility-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "ARMY_RESOURCE_BUDGET_RULES",
  schema: "starcraft_tmg_official_army_resource_budget_rules_rule_slice_v1",
  catalogueVersion: "0.103.0-official-army-resource-budget-rules",
  ordinal: 103,
  actionSchemaVersion: "hybrid_legal_space_v41",
  previousActionSchemaVersion: "hybrid_legal_space_v40",
  previous: {
    schema: "starcraft_tmg_official_faction_army_eligibility_rules_rule_slice_v1",
    sliceHash: "2bd3c289c86f90e013a0ddf4713eb283e3322654a40f2fda6d6c72165be9ab60",
    catalogueHash: "bd9757f3407cb97b93b7cd0f044bb2a4e11defd449ccb4f1062d647b3b968415",
    runtimeHash: "cdf4d39c1bc6eac0a2d1d5703ff856b059a172a834563656b1a4784d0547e97e",
    graphHash: "d7621dfdc7ca18fe492d2bb6525fcd5149c090cb0732ad82e4f294dde6e43083",
    relationship: createOfficialFactionArmyEligibilityRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "09b9cc5f7afa75e4addf2d498bc42077a490325e0d0f9e187d0a9e1ff357b49e",
    catalogueHash: "ca53fb1cf5b6d3f664d8b91346b91348a7415ebaea7e7510555c7fe8e6ba89cd",
    runtimeHash: "f57517e0f11bb3198b021a35c95a1068aaf76613bfe6c535043a4717c5148e02",
    graphHash: "a9f2e6c9a7c350331b53bbab30d9ced4087e5aa0d6e34dc9e6ae618f12b4fa69",
  },
  counts: { previousExecutable: 793, previousReview: 119,
    executable: 804, review: 108, displayOnly: 114, executors: 72 },
  remainingSlices: 8,
  newAtomIds: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID,
    version: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PARAMETER_KIND,
  relationship: createOfficialArmyResourceBudgetRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "pre_game_army_building",
    window: "resource_budget_team_partition_and_open_card_disclosure", priority: 203 },
  preconditions: [{
    predicateId: "army_resource_budget.complete_rules_owned_plan_denominator",
    inputSchema: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PENDING_SCHEMA,
    failureCode: "ARMY_RESOURCE_BUDGET_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "army_resource_budget.uses_pinned_current_costs_and_core_rules",
    inputSchema: "starcraft_tmg_official_army_resource_budget_data_bundle_v1",
    failureCode: "ARMY_RESOURCE_BUDGET_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "army_resource_budget.separate_caps_no_conversion_and_unused_lost",
    inputSchema: "starcraft_tmg_official_army_resource_budget_plan_certificate_v1",
    failureCode: "ARMY_RESOURCE_BUDGET_EXCEEDED",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "ARMY_RESOURCE_BUDGET_ACTION_INVALID", "ARMY_RESOURCE_BUDGET_ACTION_STALE",
    "ARMY_RESOURCE_BUDGET_PENDING_INVALID", "ARMY_RESOURCE_BUDGET_CHOICE_INVALID",
    "ARMY_RESOURCE_BUDGET_PARAMETER_DOMAIN_STALE",
    "ARMY_RESOURCE_BUDGET_SOURCE_LOCK_BINDING_INVALID",
    "ARMY_RESOURCE_BUDGET_DATA_ARTIFACT_BINDING_INVALID",
    "ARMY_MINERAL_BUDGET_EXCEEDED", "ARMY_VESPENE_BUDGET_EXCEEDED",
    "TEAM_MINERAL_BUDGET_EXCEEDED", "ARMY_RESOURCE_BUDGET_REQUEST_INVALID",
    "ARMY_CARD_OPEN_INFORMATION_REQUEST_INVALID",
  ],
  evidenceSlug: "army-resource-budget-rules-v1",
  evidenceFixtures: {
    positive: "current-unit-upgrade-mineral-and-tactical-vespene-budget",
    negative: "over-budget-conversion-retention-team-partition-and-stale-reject",
    interaction: "slice92-card-slice93-unit-and-slice102-faction-slot-audit",
    lifecycle: "army-budget-plan-authority-apply-open-information-and-replay",
  },
  executableScope:
    "official_mineral_and_exact_rational_vespene_budget_team_partition_unspent_loss_no_conversion_and_faction_tactical_open_information",
  progressKey: "armyResourceBudgetRulesProgress",
  progress: {
    promotedAtomCount: 11, routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 11,
    currentTacticalBudgetProfilesCompiled: 31,
    currentUnitCompositionBudgetProfilesCompiled: 28,
    currentUpgradeBudgetProfilesCompiled: 171,
    positiveUpgradeBudgetProfilesCompiled: 51,
    exactRationalVespeneComparisonExecutable: true,
    mineralAndVespeneResourceConversionForbidden: true,
    unspentMineralsAndVespeneLostExecutable: true,
    teamMineralAgreementAndAllocationExecutable: true,
    factionAndTacticalCardsFaceUpExecutable: true,
    slice102FactionTagSlotAndUniqueAuditReused: true,
    completeCompositionUpgradeAndFieldingLegalityDeferredToSlice: 104,
    unitEquipmentAndRosterDisclosureDeferredToSlice: 105,
    existingCardUnitFactionAndSlotExecutorsFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "army_resource_budget_rules_v1",
  frozenExecutorIds: ["authority.faction-army-eligibility-rules-v1",
    "authority.card-build-payment-rules-v1", "authority.unit-card-supply-rules-v1"],
  judgeTests: 52,
  agentDecisionEvidence:
    "rules_owned_cost_rows_exact_resource_arithmetic_team_partition_and_public_card_projection_then_explicit_confirmed_commit",
  userVisibleChecks: [
    "budget_receipt_lists_each_unit_upgrade_and_tactical_source_cost",
    "vespene_receipt_preserves_exact_fraction_without_invented_rounding",
    "team_receipt_shows_agreed_total_per_player_allocations_and_unallocated_loss",
    "public_projection_shows_every_faction_and_tactical_card_face_up_before_game",
  ],
  blocks: [
    "one_hundred_eight_actionable_atoms_remain_non_executable",
    "complete_unit_composition_cost_upgrade_and_specialist_rules_remain_slice_104",
    "team_roster_unit_equipment_and_disclosure_rules_remain_slice_105",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialArmyResourceBudgetRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialArmyResourceBudgetRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
