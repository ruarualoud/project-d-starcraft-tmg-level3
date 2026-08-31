import {
  OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_TYPE,
  OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_ID,
  OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_VERSION,
  OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_NEW_ATOM_IDS,
  OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PARAMETER_KIND,
  OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PENDING_SCHEMA,
  OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_TRANSITION_SCHEMA,
} from "./official-player-control-relationship-rules-executor-v1.mjs";
import { createOfficialModelBaseGeometryRulesRelationshipExtensionV1 } from
  "./official-model-base-geometry-rules-relationship-contract-v1.mjs";
import { createOfficialPlayerControlRelationshipRulesRelationshipExtensionV1 } from
  "./official-player-control-relationship-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "PLAYER_CONTROL_RELATIONSHIP_RULES",
  schema: "starcraft_tmg_official_player_control_relationship_rules_rule_slice_v1",
  catalogueVersion: "0.88.0-official-player-control-relationship-rules",
  ordinal: 88,
  actionSchemaVersion: "hybrid_legal_space_v26",
  previousActionSchemaVersion: "hybrid_legal_space_v25",
  previous: {
    schema: "starcraft_tmg_official_model_base_geometry_rules_rule_slice_v1",
    sliceHash: "df60e9e77f9aa480c136b6145d454cc23811898488f1f9683bedfffbd40ba328",
    catalogueHash: "e19ea565c2225b90f62bc28a73157140f91dbd505e8a2eda2a5af3b2084c59a0",
    runtimeHash: "d1dcbe60fe654b53d14f2a5f32e0ea6d0b7e8105671e5845ca011956a9f92ddc",
    graphHash: "0a5679f798082b27f772424a6c9b8cca632463f9ae2243eecfa51975eab92fa8",
    relationship: createOfficialModelBaseGeometryRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "4798bbe5980a5fafda9ffad856f53327f77422833ce302d2a5f00667bd169987",
    catalogueHash: "50135173ca657d69fc62cb779cd1f15275d00b89c883ada59b49cd260b7f4536",
    runtimeHash: "b3e9b3984e81b98da204e8fc75b046c6bd4329c8758a0b4063365213d7cd901f",
    graphHash: "b74c7a91c59e7007e122fb353d877ec58630ccf6934f55739a48fb65a752f494",
  },
  counts: { previousExecutable: 612, previousReview: 300,
    executable: 627, review: 285, displayOnly: 114, executors: 57 },
  remainingSlices: 23,
  newAtomIds: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_NEW_ATOM_IDS,
  executor: {
    id: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_ID,
    version: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_TRANSITION_SCHEMA,
  },
  actionType: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PARAMETER_KIND,
  relationship: createOfficialPlayerControlRelationshipRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "any_role_relationship_or_rule_conflict_window",
    window: "player_control_relationship_procedure", priority: 188 },
  preconditions: [{
    predicateId: "player_control_relationship.complete_rules_owned_query_denominator",
    inputSchema: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PENDING_SCHEMA,
    failureCode: "PLAYER_CONTROL_RELATIONSHIP_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "player_control_relationship.uses_pinned_official_core_sources",
    inputSchema: "starcraft_tmg_official_player_control_relationship_data_bundle_v1",
    failureCode: "PLAYER_CONTROL_RELATIONSHIP_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "player_control_relationship.precedence_claims_are_rules_owned",
    inputSchema: "starcraft_tmg_official_rule_precedence_registry_v1",
    failureCode: "PLAYER_CONTROL_PRECEDENCE_REGISTRY_INVALID",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "PLAYER_CONTROL_RELATIONSHIP_ACTION_INVALID",
    "PLAYER_CONTROL_RELATIONSHIP_ACTION_STALE",
    "PLAYER_CONTROL_RELATIONSHIP_PENDING_INVALID",
    "PLAYER_CONTROL_RELATIONSHIP_CHOICE_INVALID",
    "PLAYER_CONTROL_RELATIONSHIP_PARAMETER_DOMAIN_STALE",
    "PLAYER_CONTROL_RELATIONSHIP_SOURCE_LOCK_BINDING_INVALID",
    "PLAYER_CONTROL_RELATIONSHIP_DATA_ARTIFACT_BINDING_INVALID",
    "PLAYER_CONTROL_PERSPECTIVE_NOT_CONTROLLER",
    "PLAYER_CONTROL_PRECEDENCE_REGISTRY_INVALID",
    "PLAYER_CONTROL_EQUAL_SPECIFICITY_CONFLICT_UNRESOLVED",
  ],
  evidenceSlug: "player-control-relationship-rules-v1",
  evidenceFixtures: {
    positive: "active-controller-team-friendly-enemy-and-precedence",
    negative: "unknown-owner-forged-controller-source-and-claim-reject",
    interaction: "medpack-friendly-template-enemy-and-attack-target-consumers",
    lifecycle: "transferred-control-role-query-and-authority-apply",
  },
  executableScope:
    "official_player_active_controller_army_unit_model_team_friendly_enemy_and_specific_precedence_current_source_lock",
  progressKey: "playerControlRelationshipRulesProgress",
  progress: {
    promotedAtomCount: 15,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 15,
    activePlayerRoleExecutable: true,
    controllerDecisionAndDiceAuthorityExecutable: true,
    transferredControllerOwnerEquivalenceExecutable: true,
    armyUnitModelMembershipExecutable: true,
    friendlyEnemyTeamRelationshipExecutable: true,
    friendlyAttackGeneralProhibitionExecutable: true,
    enemyTargetEngagementAndMissionUsesExecutable: true,
    rulesOwnedSpecificOverGeneralResolutionExecutable: true,
    equalSpecificityConflictFailsClosed: true,
    clientSuppliedRelationshipTruthAccepted: false,
    sourceRefreshPerformed: false,
    repositoryFallbackUsed: false,
  },
  contractGroup: "player_control_relationship_rules_v1",
  frozenExecutorIds: ["authority.model-base-geometry-rules-v1",
    "authority.special-terrain-rules-v1", "authority.medic-medpack-active-v2",
    "authority.template-weapon-v1"],
  judgeTests: 35,
  agentDecisionEvidence:
    "rules_owned_role_controller_relationship_and_precedence_query_choice",
  userVisibleChecks: [
    "role_receipt_shows_active_and_controlling_player_authority",
    "relationship_receipt_shows_legal_owner_controller_team_and_friendly_enemy_result",
    "transferred_control_receipt_preserves_legal_owner_and_uses_controller_as_effective_owner",
    "precedence_receipt_names_general_specific_and_winning_claims",
  ],
  blocks: [
    "two_hundred_eighty_five_actionable_atoms_remain_non_executable",
    "dice_rerolls_tests_and_modifiers_wait_for_slice_89",
    "existing_consumers_need_future_combination_closure_before_production_room",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialPlayerControlRelationshipRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialPlayerControlRelationshipRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
