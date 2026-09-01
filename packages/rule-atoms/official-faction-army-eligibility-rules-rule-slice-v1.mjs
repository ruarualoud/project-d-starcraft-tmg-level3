import {
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_TYPE,
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID,
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_VERSION,
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_NEW_ATOM_IDS,
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PARAMETER_KIND,
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PENDING_SCHEMA,
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_TRANSITION_SCHEMA,
} from "./official-faction-army-eligibility-rules-executor-v1.mjs";
import { createOfficialFactionArmyEligibilityRulesRelationshipExtensionV1 } from
  "./official-faction-army-eligibility-rules-relationship-contract-v1.mjs";
import { createOfficialRespawnMorphRulesRelationshipExtensionV1 } from
  "./official-respawn-morph-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "FACTION_ARMY_ELIGIBILITY_RULES",
  schema: "starcraft_tmg_official_faction_army_eligibility_rules_rule_slice_v1",
  catalogueVersion: "0.102.0-official-faction-army-eligibility-rules",
  ordinal: 102,
  actionSchemaVersion: "hybrid_legal_space_v40",
  previousActionSchemaVersion: "hybrid_legal_space_v39",
  previous: {
    schema: "starcraft_tmg_official_respawn_morph_rules_rule_slice_v1",
    sliceHash: "7813422ee78075f51c21ce70f1611ab09006ac52a21deea6d9157166d71287e0",
    catalogueHash: "1981fd37077e76e6925bf4237f13f105c17755964a1a87c629d62eba3b2568af",
    runtimeHash: "d3815aa7cc6296bd306bb9c01ea59ffae91d44222f33121367b4ea7e859857c9",
    graphHash: "00089711d18266c78b0185b03d137e39dc9d9955c21bf8354348b7799e528764",
    relationship: createOfficialRespawnMorphRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "2bd3c289c86f90e013a0ddf4713eb283e3322654a40f2fda6d6c72165be9ab60",
    catalogueHash: "bd9757f3407cb97b93b7cd0f044bb2a4e11defd449ccb4f1062d647b3b968415",
    runtimeHash: "cdf4d39c1bc6eac0a2d1d5703ff856b059a172a834563656b1a4784d0547e97e",
    graphHash: "d7621dfdc7ca18fe492d2bb6525fcd5149c090cb0732ad82e4f294dde6e43083",
  },
  counts: { previousExecutable: 769, previousReview: 143,
    executable: 793, review: 119, displayOnly: 114, executors: 71 },
  remainingSlices: 9,
  newAtomIds: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID,
    version: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PARAMETER_KIND,
  relationship: createOfficialFactionArmyEligibilityRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "pre_game_army_building",
    window: "faction_scale_eligibility_and_army_slot_audit", priority: 202 },
  preconditions: [{
    predicateId: "faction_army_eligibility.complete_rules_owned_plan_denominator",
    inputSchema: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PENDING_SCHEMA,
    failureCode: "FACTION_ARMY_ELIGIBILITY_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "faction_army_eligibility.uses_pinned_current_profiles_and_core_rules",
    inputSchema: "starcraft_tmg_official_faction_army_eligibility_data_bundle_v1",
    failureCode: "FACTION_ARMY_ELIGIBILITY_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "faction_army_eligibility.every_candidate_tag_is_subset_and_slots_fit",
    inputSchema: "starcraft_tmg_official_faction_army_eligibility_plan_certificate_v1",
    failureCode: "FACTION_TAG_MISMATCH",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "FACTION_ARMY_ELIGIBILITY_ACTION_INVALID",
    "FACTION_ARMY_ELIGIBILITY_ACTION_STALE",
    "FACTION_ARMY_ELIGIBILITY_PENDING_INVALID",
    "FACTION_ARMY_ELIGIBILITY_CHOICE_INVALID",
    "FACTION_ARMY_ELIGIBILITY_PARAMETER_DOMAIN_STALE",
    "FACTION_ARMY_ELIGIBILITY_SOURCE_LOCK_BINDING_INVALID",
    "FACTION_ARMY_ELIGIBILITY_DATA_ARTIFACT_BINDING_INVALID",
    "ENGAGEMENT_SCALE_ALL_PLAYERS_MUST_AGREE",
    "EXACTLY_ONE_FACTION_CARD_REQUIRED", "FACTION_TAG_MISMATCH",
    "ARMY_SLOT_CAPACITY_EXCEEDED", "ARMY_SLOT_AUDIT_REQUEST_INVALID",
  ],
  evidenceSlug: "faction-army-eligibility-rules-v1",
  evidenceFixtures: {
    positive: "current-faction-scale-tags-and-army-slot-audit",
    negative: "mixed-scale-missing-tag-over-capacity-and-retained-slot-reject",
    interaction: "slice92-card-slice93-unit-and-slice100-summoned-exclusion",
    lifecycle: "army-building-plan-authority-apply-and-replay",
  },
  executableScope:
    "official_engagement_scale_faction_card_schema_race_subfaction_tag_subset_and_army_slot_capacity_current_source_lock",
  progressKey: "factionArmyEligibilityRulesProgress",
  progress: {
    promotedAtomCount: 24, routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 24, currentFactionCardProfilesCompiled: 6,
    currentArmyBuildingCandidatesCompiled: 53,
    currentEligibilityMatrixRowsCompiled: 318,
    exactRaceTagCount: 3, exactSubFactionTagCount: 3,
    unitSubFactionSourceField: "keywords",
    exactlyOneFactionCardExecutable: true,
    allCandidateTagsSubsetEligibilityExecutable: true,
    engagementScaleAgreementAndTableExecutable: true,
    armySlotCapacityAndUnusedLossExecutable: true,
    completeResourceBudgetDeferredToSlice: 103,
    completeCompositionCostAndUpgradeValidationDeferredToSlice: 104,
    existingCardUnitAndSummonExecutorsFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "faction_army_eligibility_rules_v1",
  frozenExecutorIds: ["authority.respawn-morph-rules-v1",
    "authority.card-build-payment-rules-v1", "authority.unit-card-supply-rules-v1",
    "authority.summon-rules-v1"],
  judgeTests: 52,
  agentDecisionEvidence:
    "rules_owned_scale_faction_tag_subset_and_slot_capacity_then_explicit_confirmed_army_building_commit",
  userVisibleChecks: [
    "scale_receipt_shows_all_player_agreement_exact_limits_ratio_and_battlefield",
    "faction_receipt_shows_exactly_one_card_race_subfaction_slots_and_ability_hash",
    "eligibility_receipt_shows_each_candidate_tag_subset_and_missing_tag_rejection",
    "slot_receipt_shows_initial_plus_tactical_used_and_unused_lost_by_type",
  ],
  blocks: [
    "one_hundred_nineteen_actionable_atoms_remain_non_executable",
    "complete_mineral_vespene_budget_purchase_and_open_information_remain_slice_103",
    "complete_unit_composition_cost_upgrade_and_specialist_rules_remain_slice_104",
    "team_roster_and_disclosure_rules_remain_slice_105",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialFactionArmyEligibilityRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialFactionArmyEligibilityRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
