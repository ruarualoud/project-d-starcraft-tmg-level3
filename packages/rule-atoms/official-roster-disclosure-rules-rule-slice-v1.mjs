import {
  OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_TYPE,
  OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_ID,
  OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_VERSION,
  OFFICIAL_ROSTER_DISCLOSURE_RULES_NEW_ATOM_IDS,
  OFFICIAL_ROSTER_DISCLOSURE_RULES_PARAMETER_KIND,
  OFFICIAL_ROSTER_DISCLOSURE_RULES_PENDING_SCHEMA,
  OFFICIAL_ROSTER_DISCLOSURE_RULES_TRANSITION_SCHEMA,
} from "./official-roster-disclosure-rules-executor-v1.mjs";
import { createOfficialRosterDisclosureRulesRelationshipExtensionV1 } from
  "./official-roster-disclosure-rules-relationship-contract-v1.mjs";
import { createOfficialUnitCompositionUpgradeRulesRelationshipExtensionV1 } from
  "./official-unit-composition-upgrade-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "ROSTER_DISCLOSURE_RULES",
  schema: "starcraft_tmg_official_roster_disclosure_rules_rule_slice_v1",
  catalogueVersion: "0.105.0-official-roster-disclosure-rules",
  ordinal: 105,
  actionSchemaVersion: "hybrid_legal_space_v43",
  previousActionSchemaVersion: "hybrid_legal_space_v42",
  previous: {
    schema: "starcraft_tmg_official_unit_composition_upgrade_rules_rule_slice_v1",
    sliceHash: "bece09d6009e4333d09da55d074a902d6947f332d70553162dfe891a79feae2b",
    catalogueHash: "3f27ca38e77fd53a9ea83e47c5f7075a65c3e980519efff878aa8b653c894f7c",
    runtimeHash: "634bcc281480f6bcb297b940b295e18a3e2324e3a12dc58162455243d548f738",
    graphHash: "e01a17de3f934efa28ae239aa3b2dbbd7c234b37bf6a6ddab418a552d499c82b",
    relationship: createOfficialUnitCompositionUpgradeRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "601e7bfb22b32d0416b7ab2993c422faf6ed535239e1d7f50a77b2745fae9383",
    catalogueHash: "ef74fdd21eb7f5a59a257f3562ca801cd330d331f9634f592a945ffaa97b7494",
    runtimeHash: "82e6a48ff5531fd0b67821195d02a522210db3b4d5d343e94236b620773bd3ba",
    graphHash: "c3c4d7e794e6bca65e93cd3cdc7ea44eb93d900526556186052c345486d96d71",
  },
  counts: { previousExecutable: 820, previousReview: 92,
    executable: 833, review: 79, displayOnly: 114, executors: 74 },
  remainingSlices: 6,
  newAtomIds: OFFICIAL_ROSTER_DISCLOSURE_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_ID,
    version: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_ROSTER_DISCLOSURE_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_ROSTER_DISCLOSURE_RULES_PARAMETER_KIND,
  relationship: createOfficialRosterDisclosureRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "pre_game_and_unit_action_windows",
    window: "roster_visibility_deployment_disclosure_inspection_and_reminder",
    priority: 205 },
  preconditions: [{
    predicateId: "roster_disclosure.complete_rules_owned_plan_denominator",
    inputSchema: OFFICIAL_ROSTER_DISCLOSURE_RULES_PENDING_SCHEMA,
    failureCode: "ROSTER_DISCLOSURE_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "roster_disclosure.uses_pinned_part9_and_current_unit_cards",
    inputSchema: "starcraft_tmg_official_roster_disclosure_data_bundle_v1",
    failureCode: "ROSTER_DISCLOSURE_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "roster_disclosure.viewer_projection_does_not_leak_closed_list",
    inputSchema: "starcraft_tmg_room_runtime_v2.room-projection",
    failureCode: "ROSTER_DISCLOSURE_VIEWER_PROJECTION_LEAK",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "ROSTER_DISCLOSURE_ACTION_INVALID",
    "ROSTER_DISCLOSURE_ACTION_STALE",
    "ROSTER_DISCLOSURE_PENDING_INVALID",
    "ROSTER_DISCLOSURE_CHOICE_INVALID",
    "ROSTER_DISCLOSURE_PARAMETER_DOMAIN_STALE",
    "ROSTER_DISCLOSURE_SOURCE_LOCK_BINDING_INVALID",
    "ROSTER_REGISTRY_TEAM_PLAYER_PARTITION_INVALID",
    "CLOSED_LIST_AGREEMENT_SUBMISSION_INVALID",
    "ROSTER_VISIBILITY_PLAYER_AGREEMENTS_INCOMPLETE",
    "ROSTER_VISIBILITY_TOURNAMENT_OVERRIDE_INVALID",
    "EQUIPMENT_DISCLOSURE_UNKNOWN_EQUIPMENT_KEY",
    "EQUIPMENT_RELEVANT_ACTION_REMINDER_REQUIRED",
    "EQUIPMENT_RELEVANT_ACTION_REMINDER_INVALID",
    "ON_TABLE_UNIT_INSPECTION_REQUEST_INVALID",
  ],
  evidenceSlug: "roster-disclosure-rules-v1",
  evidenceFixtures: {
    positive: "open-closed-team-deployment-inspection-and-reminder",
    negative: "forged-agreement-hidden-roster-missing-disclosure-and-reminder",
    interaction: "slice103-team-budget-slice104-complete-roster-and-room-projection",
    lifecycle: "viewer-redacted-authority-apply-signed-replay",
  },
  executableScope:
    "official_team_independent_rosters_open_closed_tournament_visibility_deployment_equipment_disclosure_inspection_nondisclosure_and_action_reminder",
  progressKey: "rosterDisclosureRulesProgress",
  progress: {
    promotedAtomCount: 13, routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 13,
    exactPart9SectionsBound: 3, unitCardInspectionProfilesCompiled: 22,
    defaultEquipmentProfilesCompiled: 41,
    purchasableUpgradeProfilesReused: 52,
    independentPerPlayerRosterExecutable: true,
    eachPlayerSubmitsOwnClosedListAgreement: true,
    tournamentRulesPackOverrideExecutable: true,
    openDefaultAndClosedUndeployedSecrecyExecutable: true,
    factionAndTacticalCardsAlwaysPublic: true,
    deploymentUpgradeAndWeaponSwapDisclosureExecutable: true,
    fullUnitCardAndAssociatedTacticalInspectionExecutable: true,
    rulesOwnedPerModelExpectedEquipmentExecutable: true,
    missingDeploymentDisclosureClassifiedUnsportsmanlike: true,
    exactActionHashReminderPermitExecutable: true,
    roomViewerProjectionNoLeakExecutable: true,
    slice103TeamBudgetAndSlice104CompleteRosterReused: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "roster_disclosure_rules_v1",
  frozenExecutorIds: ["authority.unit-composition-upgrade-rules-v1",
    "authority.army-resource-budget-rules-v1",
    "authority.faction-army-eligibility-rules-v1"],
  judgeTests: 64,
  agentDecisionEvidence:
    "each_player_personally_agrees_then_viewer_safe_roster_projection_and_exact_equipment_reminder_permit",
  userVisibleChecks: [
    "closed_list_opponent_cannot_see_undeployed_unit_names_counts_upgrades_or_pending_results",
    "faction_and_tactical_cards_remain_face_up_in_closed_lists",
    "deployed_unit_immediately_shows_upgrades_weapon_swaps_and_inspection_material",
    "unrepresented_equipment_is_declared_on_deployment_and_repeated_before_unit_actions",
    "tournament_override_source_and_signature_verification_receipt_remain_visible",
  ],
  blocks: [
    "seventy_nine_actionable_atoms_remain_non_executable",
    "mission_deployment_battlefield_terrain_marker_and_end_rules_remain_slices_106_111",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialRosterDisclosureRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialRosterDisclosureRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
