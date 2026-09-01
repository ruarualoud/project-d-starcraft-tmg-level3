import {
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_TYPE,
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID,
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_VERSION,
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_NEW_ATOM_IDS,
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PARAMETER_KIND,
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PENDING_SCHEMA,
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_TRANSITION_SCHEMA,
} from "./official-round-phase-activation-rules-executor-v1.mjs";
import { createOfficialUnitCardSupplyRulesRelationshipExtensionV1 } from
  "./official-unit-card-supply-rules-relationship-contract-v1.mjs";
import { createOfficialRoundPhaseActivationRulesRelationshipExtensionV1 } from
  "./official-round-phase-activation-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "ROUND_PHASE_ACTIVATION_RULES",
  schema: "starcraft_tmg_official_round_phase_activation_rules_rule_slice_v1",
  catalogueVersion: "0.94.0-official-round-phase-activation-rules",
  ordinal: 94,
  actionSchemaVersion: "hybrid_legal_space_v32",
  previousActionSchemaVersion: "hybrid_legal_space_v31",
  previous: {
    schema: "starcraft_tmg_official_unit_card_supply_rules_rule_slice_v1",
    sliceHash: "26a3b14ee8d24a3c0ec6a85581194f902913ce5c9fecf012fb98b867e42f459a",
    catalogueHash: "c3a18341468a9ff2936321fb71fac7105eafb8b31d6899af937a937f24f0208f",
    runtimeHash: "80867a2d2074171b014d08f0bad820a3bfd812d268a5588fda253a474f28b51d",
    graphHash: "8d19eb21e3883f734aa2104c0c28eb763b6b2c57db1348523132b02673fab8cb",
    relationship: createOfficialUnitCardSupplyRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "03ccbd8f17669859a0dc3692699c79965a9c692e3d91f6481e2fad4d68186128",
    catalogueHash: "131c638a31bd8b04e878e1dc0a128e8bda60fcf88071eb615fcd7a331be1b4a1",
    runtimeHash: "f1f9d2e237917d97415cd7222697d736ef55c1abcacdcc540384f5f03706ebe0",
    graphHash: "9db8a8981c39068ec581fc8e996f731d6b5812a5e7896bd3745071b62793523d",
  },
  counts: { previousExecutable: 683, previousReview: 229,
    executable: 690, review: 222, displayOnly: 114, executors: 63 },
  remainingSlices: 17,
  newAtomIds: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID,
    version: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PARAMETER_KIND,
  relationship: createOfficialRoundPhaseActivationRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "any_sequence_or_activation_audit_window",
    window: "round_phase_activation_rules_procedure", priority: 194 },
  preconditions: [{
    predicateId: "round_phase_activation.complete_rules_owned_plan_denominator",
    inputSchema: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PENDING_SCHEMA,
    failureCode: "ROUND_PHASE_ACTIVATION_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "round_phase_activation.uses_pinned_part8_and_part12_sources",
    inputSchema: "starcraft_tmg_official_round_phase_activation_data_bundle_v1",
    failureCode: "ROUND_PHASE_ACTIVATION_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "round_phase_activation.one_unit_one_completed_phase_action",
    inputSchema: "starcraft_tmg_official_activation_turn_order_resolution_v1",
    failureCode: "ONE_PHASE_ACTION_COMPLETION_RECEIPT_REQUIRED",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "ROUND_PHASE_ACTIVATION_ACTION_INVALID", "ROUND_PHASE_ACTIVATION_ACTION_STALE",
    "ROUND_PHASE_ACTIVATION_PENDING_INVALID", "ROUND_PHASE_ACTIVATION_CHOICE_INVALID",
    "ROUND_PHASE_ACTIVATION_PARAMETER_DOMAIN_STALE",
    "ROUND_PHASE_ACTIVATION_SOURCE_LOCK_BINDING_INVALID",
    "ROUND_PHASE_ACTIVATION_DATA_ARTIFACT_BINDING_INVALID",
    "ROUND_PHASE_SEQUENCE_REQUEST_INVALID", "ROUND_PHASE_ACTIVATION_ROUND_OUT_OF_RANGE",
    "ONE_PHASE_ACTION_COMPLETION_RECEIPT_REQUIRED", "PHASE_ACTION_TYPE_NOT_IN_PHASE",
    "MOVEMENT_BATTLEFIELD_ACTION_TYPE_INVALID",
  ],
  evidenceSlug: "round-phase-activation-rules-v1",
  evidenceFixtures: {
    positive: "five-round-four-phase-and-alternating-one-unit-one-action",
    negative: "round-six-wrong-phase-double-action-and-client-menu-reject",
    interaction: "movement-assault-combat-pass-and-atomic-action-consumers",
    lifecycle: "official-sequence-menu-turn-plan-authority-apply-and-replay",
  },
  executableScope:
    "official_maximum_five_rounds_strict_four_phase_sequence_first_three_alternating_activation_one_unit_one_phase_action_and_movement_battlefield_action_class_current_source_lock",
  progressKey: "roundPhaseActivationRulesProgress",
  progress: {
    promotedAtomCount: 7, routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 7, maximumRounds: 5,
    strictPhaseOrder: ["movement", "assault", "combat", "cleanup"],
    alternatingActivationPhases: ["movement", "assault", "combat"],
    oneUnitAndOnePhaseActionPerActivationExecutable: true,
    movementBattlefieldActionMenuExecutable: true,
    atomicActionExecutorsRemainLegalityAuthority: true,
    completeCurrentLegalSpaceClaimed: false,
    existingActivationExecutorsFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "round_phase_activation_rules_v1",
  frozenExecutorIds: ["authority.activation-pass-v1", "authority.phase-initiative-v1",
    "authority.movement-hold-v1", "authority.assault-hold-v2",
    "authority.reserve-deploy-v5", "authority.standard-move-v5",
    "authority.disengage-v5", "authority.ranged-attack-v6",
    "authority.combat-pass-v3"],
  judgeTests: 39,
  agentDecisionEvidence:
    "rules_owned_round_phase_sequence_then_phase_action_class_and_one_unit_one_action_turn_certificate",
  userVisibleChecks: [
    "sequence_receipt_shows_maximum_five_rounds_and_all_four_phases_in_order",
    "phase_menu_receipt_shows_movement_battlefield_move_hold_or_disengage_classes",
    "activation_receipt_shows_exactly_one_unit_one_action_and_next_side",
    "receipt_states_atomic_executors_still_determine_current_action_legality",
  ],
  blocks: [
    "two_hundred_twenty_two_actionable_atoms_remain_non_executable",
    "complete_current_legalspace_and_all_action_interactions_remain_open",
    "existing_activation_executors_are_consumers_not_silently_rewritten",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialRoundPhaseActivationRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialRoundPhaseActivationRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
