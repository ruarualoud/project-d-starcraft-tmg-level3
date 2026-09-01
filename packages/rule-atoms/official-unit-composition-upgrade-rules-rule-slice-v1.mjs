import {
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_TYPE,
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID,
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_VERSION,
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_NEW_ATOM_IDS,
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PARAMETER_KIND,
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PENDING_SCHEMA,
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_TRANSITION_SCHEMA,
} from "./official-unit-composition-upgrade-rules-executor-v1.mjs";
import { createOfficialUnitCompositionUpgradeRulesRelationshipExtensionV1 } from
  "./official-unit-composition-upgrade-rules-relationship-contract-v1.mjs";
import { createOfficialArmyResourceBudgetRulesRelationshipExtensionV1 } from
  "./official-army-resource-budget-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "UNIT_COMPOSITION_UPGRADE_RULES",
  schema: "starcraft_tmg_official_unit_composition_upgrade_rules_rule_slice_v1",
  catalogueVersion: "0.104.0-official-unit-composition-upgrade-rules",
  ordinal: 104,
  actionSchemaVersion: "hybrid_legal_space_v42",
  previousActionSchemaVersion: "hybrid_legal_space_v41",
  previous: {
    schema: "starcraft_tmg_official_army_resource_budget_rules_rule_slice_v1",
    sliceHash: "09b9cc5f7afa75e4addf2d498bc42077a490325e0d0f9e187d0a9e1ff357b49e",
    catalogueHash: "ca53fb1cf5b6d3f664d8b91346b91348a7415ebaea7e7510555c7fe8e6ba89cd",
    runtimeHash: "f57517e0f11bb3198b021a35c95a1068aaf76613bfe6c535043a4717c5148e02",
    graphHash: "a9f2e6c9a7c350331b53bbab30d9ced4087e5aa0d6e34dc9e6ae618f12b4fa69",
    relationship: createOfficialArmyResourceBudgetRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "bece09d6009e4333d09da55d074a902d6947f332d70553162dfe891a79feae2b",
    catalogueHash: "3f27ca38e77fd53a9ea83e47c5f7075a65c3e980519efff878aa8b653c894f7c",
    runtimeHash: "634bcc281480f6bcb297b940b295e18a3e2324e3a12dc58162455243d548f738",
    graphHash: "e01a17de3f934efa28ae239aa3b2dbbd7c234b37bf6a6ddab418a552d499c82b",
  },
  counts: { previousExecutable: 804, previousReview: 108,
    executable: 820, review: 92, displayOnly: 114, executors: 73 },
  remainingSlices: 7,
  newAtomIds: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID,
    version: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PARAMETER_KIND,
  relationship: createOfficialUnitCompositionUpgradeRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "pre_game_army_building",
    window: "unit_composition_upgrade_and_specialist_selection", priority: 204 },
  preconditions: [{
    predicateId: "unit_composition_upgrade.complete_rules_owned_plan_denominator",
    inputSchema: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PENDING_SCHEMA,
    failureCode: "UNIT_COMPOSITION_UPGRADE_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "unit_composition_upgrade.uses_pinned_current_data_and_core_rules",
    inputSchema: "starcraft_tmg_official_unit_composition_upgrade_data_bundle_v1",
    failureCode: "UNIT_COMPOSITION_UPGRADE_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "unit_composition_upgrade.complete_fielding_legality",
    inputSchema: "starcraft_tmg_official_complete_army_composition_upgrade_audit_v1",
    failureCode: "COMPLETE_ARMY_COMPOSITION_UPGRADE_AUDIT_REQUEST_INVALID",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "UNIT_COMPOSITION_UPGRADE_ACTION_INVALID",
    "UNIT_COMPOSITION_UPGRADE_ACTION_STALE",
    "UNIT_COMPOSITION_UPGRADE_PENDING_INVALID",
    "UNIT_COMPOSITION_UPGRADE_CHOICE_INVALID",
    "UNIT_COMPOSITION_UPGRADE_PARAMETER_DOMAIN_STALE",
    "UNIT_COMPOSITION_UPGRADE_SOURCE_LOCK_BINDING_INVALID",
    "UNIT_COMPOSITION_UPGRADE_DATA_ARTIFACT_BINDING_INVALID",
    "UNIT_COMPOSITION_STARTING_MODEL_SET_INVALID",
    "UNIT_COMPOSITION_OPTION_PROFILE_REQUIRED",
    "UNIT_PURCHASABLE_UPGRADE_PROFILE_REQUIRED",
    "UNIT_UPGRADE_ENTRY_DUPLICATE",
    "UNIT_SPECIALIST_MODEL_REQUIRED",
    "UNIT_SPECIALIST_MODEL_NOT_IN_UNIT",
    "UNIT_SPECIALIST_MODEL_REUSED",
    "COMPLETE_ARMY_COMPOSITION_UPGRADE_AUDIT_REQUEST_INVALID",
  ],
  evidenceSlug: "unit-composition-upgrade-rules-v1",
  evidenceFixtures: {
    positive: "listed-composition-unit-wide-and-specialist-selection",
    negative: "unlisted-model-duplicate-upgrade-specialist-and-source-reject",
    interaction: "slice93-supply-slice102-slots-and-slice103-budget",
    lifecycle: "composition-upgrade-authority-apply-signed-replay",
  },
  executableScope:
    "official_exact_unit_composition_model_count_starting_supply_slots_part12_upgrade_purchase_unit_wide_specialist_and_complete_fielding_legality",
  progressKey: "unitCompositionUpgradeRulesProgress",
  progress: {
    promotedAtomCount: 16, routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 16,
    fieldableUnitReferenceProfilesCompiled: 22,
    listedCompositionOptionsCompiled: 28,
    purchasableUpgradeProfilesCompiled: 52,
    specialistUpgradeProfilesCompiled: 2,
    unitWideUpgradeProfilesCompiled: 50,
    currentProductReplacementLinksCompiled: 8,
    officialCompositionCostConflictsExplicitlyPreserved: 2,
    exactlyOneListedCompositionExecutable: true,
    unlistedModelCountRejected: true,
    startingSupplyEqualsOccupiedSlotsExecutable: true,
    distinctUpgradeEntryLimitExecutable: true,
    unitWideDefaultAndSpecialistExceptionExecutable: true,
    completeCompositionUpgradeAndFieldingLegalityExecutable: true,
    slice102FactionSlotAuditReused: true,
    slice103ResourceBudgetReused: true,
    unitEquipmentAndRosterDisclosureDeferredToSlice: 105,
    existingUnitSupplyFactionSlotAndBudgetExecutorsFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "unit_composition_upgrade_rules_v1",
  frozenExecutorIds: ["authority.army-resource-budget-rules-v1",
    "authority.faction-army-eligibility-rules-v1",
    "authority.unit-card-supply-rules-v1"],
  judgeTests: 56,
  agentDecisionEvidence:
    "rules_owned_listed_composition_and_upgrade_set_with_specialist_model_then_explicit_confirmed_commit",
  userVisibleChecks: [
    "unit_receipt_shows_exact_models_starting_supply_slots_and_current_cost",
    "upgrade_picker_lists_only_fifty_two_part12_purchasable_entries",
    "unit_wide_upgrade_receipt_lists_every_model_and_specialist_lists_one_model",
    "two_official_composition_cost_conflicts_remain_visible_with_resolution_source",
    "complete_army_receipt_reuses_faction_slot_and_resource_budget_audits",
  ],
  blocks: [
    "ninety_two_actionable_atoms_remain_non_executable",
    "team_roster_unit_equipment_and_disclosure_rules_remain_slice_105",
    "mission_deployment_battlefield_terrain_marker_and_end_rules_remain_slices_106_111",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialUnitCompositionUpgradeRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialUnitCompositionUpgradeRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
