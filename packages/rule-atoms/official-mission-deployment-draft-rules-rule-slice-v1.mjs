import {
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_TYPE,
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID,
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_VERSION,
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_NEW_ATOM_IDS,
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_PARAMETER_KIND,
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_TRANSITION_SCHEMA,
} from "./official-mission-deployment-draft-rules-executor-v1.mjs";
import { createOfficialMissionDeploymentDraftRulesRelationshipExtensionV1 } from
  "./official-mission-deployment-draft-rules-relationship-contract-v1.mjs";
import { createOfficialRosterDisclosureRulesRelationshipExtensionV1 } from
  "./official-roster-disclosure-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "MISSION_DEPLOYMENT_DRAFT_RULES",
  schema: "starcraft_tmg_official_mission_deployment_draft_rules_rule_slice_v1",
  catalogueVersion: "0.106.0-official-mission-deployment-draft-rules",
  ordinal: 106,
  actionSchemaVersion: "hybrid_legal_space_v44",
  previousActionSchemaVersion: "hybrid_legal_space_v43",
  previous: {
    schema: "starcraft_tmg_official_roster_disclosure_rules_rule_slice_v1",
    sliceHash: "601e7bfb22b32d0416b7ab2993c422faf6ed535239e1d7f50a77b2745fae9383",
    catalogueHash: "ef74fdd21eb7f5a59a257f3562ca801cd330d331f9634f592a945ffaa97b7494",
    runtimeHash: "82e6a48ff5531fd0b67821195d02a522210db3b4d5d343e94236b620773bd3ba",
    graphHash: "c3c4d7e794e6bca65e93cd3cdc7ea44eb93d900526556186052c345486d96d71",
    relationship: createOfficialRosterDisclosureRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "760a20172d419c4eb6fa1be22cce144df01e82245ef908aaceef23992167525e",
    catalogueHash: "1fb1753f9d8e09faeaa769774906777df16a7a0c90320f383784efc4ff4c2f8b",
    runtimeHash: "d6beaea09a6426c523ae9d35ac1c83824fce26288f9ea257b32d92a1d1fcf23b",
    graphHash: "b854b730a40034775de5ae21192c40a632dcdc4c68a53b6f0b858178af6a98d1",
  },
  counts: { previousExecutable: 833, previousReview: 79,
    executable: 854, review: 58, displayOnly: 114, executors: 75 },
  remainingSlices: 5,
  newAtomIds: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID,
    version: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_PARAMETER_KIND,
  relationship: createOfficialMissionDeploymentDraftRulesRelationshipExtensionV1,
  actor: "draft_stage_controller",
  timing: { phase: "pre_game", window: "mission_and_deployment_draft",
    priority: 206 },
  preconditions: [{
    predicateId: "mission_deployment_draft.complete_rules_owned_choice_domain",
    inputSchema: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_PARAMETER_KIND,
    failureCode: "MISSION_DEPLOYMENT_DRAFT_PROCEDURE_WINDOW_INVALID",
  }, {
    predicateId: "mission_deployment_draft.uses_pinned_core_and_current_cards",
    inputSchema: "starcraft_tmg_official_mission_deployment_draft_data_bundle_v1",
    failureCode: "MISSION_DEPLOYMENT_DRAFT_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "mission_deployment_draft.selected_geometry_not_overclaimed",
    inputSchema: "ticket_11_slice_107_geometry_boundary",
    failureCode: "MISSION_DEPLOYMENT_DRAFT_GEOMETRY_EXECUTION_DEFERRED",
  }],
  chance: { kind: "chance_ticket",
    ticketSchema: "starcraft_tmg_chance_bundle_v1" },
  rejectionCodes: [
    "MISSION_DEPLOYMENT_DRAFT_ACTION_INVALID",
    "MISSION_DEPLOYMENT_DRAFT_ACTION_STALE",
    "MISSION_DEPLOYMENT_DRAFT_PARAMETER_DOMAIN_STALE",
    "MISSION_DEPLOYMENT_DRAFT_SOURCE_LOCK_BINDING_INVALID",
    "MISSION_DEPLOYMENT_DRAFT_PARTICIPANTS_INVALID",
    "MISSION_DEPLOYMENT_DRAFT_SCALE_UNSUPPORTED",
    "MISSION_DRAFT_INPUT_SET_INVALID",
    "DEPLOYMENT_DRAFT_INPUT_SET_INVALID",
    "MISSION_DRAFT_SCALE_MISMATCH",
    "DEPLOYMENT_DRAFT_SCALE_MISMATCH",
    "MISSION_DEPLOYMENT_DRAFT_ACTOR_INVALID",
    "MISSION_DEPLOYMENT_DRAFT_ROLL_OFF_REVEALS_REQUIRED",
    "MISSION_DEPLOYMENT_DRAFT_CHOICE_INVALID",
  ],
  evidenceSlug: "mission-deployment-draft-rules-v1",
  evidenceFixtures: {
    positive: "two-sets-rolloff-colour-control-eliminate-select",
    negative: "duplicate-own-set-wrong-scale-wrong-actor-stale-choice",
    interaction: "slice102-engagement-scale-and-frozen-rolloff-dependencies",
    lifecycle: "authority-chance-preview-apply-signed-replay",
  },
  executableScope:
    "official_current_two_participant_mission_deployment_card_draft_and_selected_field_contract",
  progressKey: "missionDeploymentDraftRulesProgress",
  progress: {
    promotedAtomCount: 21, routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 21, exactCoreSectionsBound: 5,
    currentMissionProfilesCompiled: 10, currentDeploymentProfilesCompiled: 10,
    standardMissionAndDeploymentProfilesEach: 5,
    skirmishMissionAndDeploymentProfilesEach: 5,
    ownSetDuplicateProhibitionExecutable: true,
    opposingSetOverlapPreservedByOccurrenceIdentity: true,
    faceUpMissionAndDeploymentRowsExecutable: true,
    authorityCommittedOpeningRollOffExecutable: true,
    rollOffTieRequiresFreshAttempt: true,
    winnerColourThenDraftControlChoiceExecutable: true,
    complementaryMissionAndDeploymentControllersExecutable: true,
    nonControllerEliminatesTwoControllerSelectsOneExecutable: true,
    selectedMissionFieldContractExecutable: true,
    selectedDeploymentFieldContractExecutable: true,
    markerAffinityAfterBothDraftsReused: true,
    selectedDeploymentGeometryExecutionDeferredToSlice107: true,
    arbitraryMissionEffectExecutionClaimed: false,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "mission_deployment_draft_rules_v1",
  frozenExecutorIds: ["authority.roster-disclosure-rules-v1",
    "authority.faction-army-eligibility-rules-v1",
    "authority.determine-initiative-v2"],
  judgeTests: 70,
  agentDecisionEvidence:
    "complete_face_up_card_occurrences_then_authority_rolloff_and_stage_owned_eliminate_select_choices",
  userVisibleChecks: [
    "each_participant_sees_exactly_the_current_same_scale_two_card_set_choices",
    "opposing_duplicate_cards_remain_distinct_face_up_occurrences",
    "rolloff_winner_chooses_colour_then_one_draft_and_opponent_controls_the_other",
    "noncontroller_removes_two_then_controller_selects_one_for_each_row",
    "selected_mission_fields_and_deployment_field_contract_are_visible_with_source_hashes",
    "battlefield_geometry_remains_visibly_pending_slice107_instead_of_being_invented",
  ],
  blocks: [
    "fifty_eight_actionable_atoms_remain_non_executable",
    "selected_deployment_geometry_battlefield_setup_tokens_scoring_and_disputes_remain_slices_107_111",
    "arbitrary_selected_mission_effect_execution_is_not_claimed_by_field_contract",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialMissionDeploymentDraftRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialMissionDeploymentDraftRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
