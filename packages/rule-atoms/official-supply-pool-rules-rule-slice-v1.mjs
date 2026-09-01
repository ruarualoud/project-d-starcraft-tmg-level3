import {
  OFFICIAL_SUPPLY_POOL_RULES_ACTION_TYPE,
  OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID,
  OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_VERSION,
  OFFICIAL_SUPPLY_POOL_RULES_NEW_ATOM_IDS,
  OFFICIAL_SUPPLY_POOL_RULES_PARAMETER_KIND,
  OFFICIAL_SUPPLY_POOL_RULES_PENDING_SCHEMA,
  OFFICIAL_SUPPLY_POOL_RULES_TRANSITION_SCHEMA,
} from "./official-supply-pool-rules-executor-v1.mjs";
import { createOfficialRoundPhaseActivationRulesRelationshipExtensionV1 } from
  "./official-round-phase-activation-rules-relationship-contract-v1.mjs";
import { createOfficialSupplyPoolRulesRelationshipExtensionV1 } from
  "./official-supply-pool-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "SUPPLY_POOL_RULES",
  schema: "starcraft_tmg_official_supply_pool_rules_rule_slice_v1",
  catalogueVersion: "0.95.0-official-supply-pool-rules",
  ordinal: 95,
  actionSchemaVersion: "hybrid_legal_space_v33",
  previousActionSchemaVersion: "hybrid_legal_space_v32",
  previous: {
    schema: "starcraft_tmg_official_round_phase_activation_rules_rule_slice_v1",
    sliceHash: "03ccbd8f17669859a0dc3692699c79965a9c692e3d91f6481e2fad4d68186128",
    catalogueHash: "131c638a31bd8b04e878e1dc0a128e8bda60fcf88071eb615fcd7a331be1b4a1",
    runtimeHash: "f1f9d2e237917d97415cd7222697d736ef55c1abcacdcc540384f5f03706ebe0",
    graphHash: "9db8a8981c39068ec581fc8e996f731d6b5812a5e7896bd3745071b62793523d",
    relationship: createOfficialRoundPhaseActivationRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "0ffaf84c0ace83427c45949c029fb20c3432f220adbefdf94bd9be056edd89ed",
    catalogueHash: "d17e6d39f9c3c7f10afef4185abdccb586e1a7af2657833c492c8f060562e67f",
    runtimeHash: "d6e9fafe69135694c925ac726ff2d7a1dd8523964a7d96a04cb34aa146745ed4",
    graphHash: "cf8d9aaf3778ca1033f164053b846be372c82bf68d8e81e283a86e1da749f0c6",
  },
  counts: {
    previousExecutable: 690, previousReview: 222,
    executable: 695, review: 217, displayOnly: 114, executors: 64,
  },
  remainingSlices: 16,
  newAtomIds: OFFICIAL_SUPPLY_POOL_RULES_NEW_ATOM_IDS,
  executor: {
    id: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID,
    version: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_SUPPLY_POOL_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_SUPPLY_POOL_RULES_TRANSITION_SCHEMA,
  },
  actionType: OFFICIAL_SUPPLY_POOL_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_SUPPLY_POOL_RULES_PARAMETER_KIND,
  relationship: createOfficialSupplyPoolRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: {
    phase: "round_one_or_movement_start_or_casualty_or_deployment_reference_window",
    window: "supply_pool_rules_procedure", priority: 195,
  },
  preconditions: [{
    predicateId: "supply_pool.complete_rules_owned_plan_denominator",
    inputSchema: OFFICIAL_SUPPLY_POOL_RULES_PENDING_SCHEMA,
    failureCode: "SUPPLY_POOL_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "supply_pool.uses_pinned_part8_mission_and_deployment_sources",
    inputSchema: "starcraft_tmg_official_supply_pool_data_bundle_v1",
    failureCode: "SUPPLY_POOL_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "supply_pool.recalculates_unit_supply_from_current_models",
    inputSchema: "starcraft_tmg_official_available_supply_verification_v1",
    failureCode: "SUPPLY_POOL_UNIT_DENOMINATOR_INCOMPLETE",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "SUPPLY_POOL_ACTION_INVALID", "SUPPLY_POOL_ACTION_STALE",
    "SUPPLY_POOL_PENDING_INVALID", "SUPPLY_POOL_CHOICE_INVALID",
    "SUPPLY_POOL_PARAMETER_DOMAIN_STALE",
    "SUPPLY_POOL_SOURCE_LOCK_BINDING_INVALID",
    "SUPPLY_POOL_DATA_ARTIFACT_BINDING_INVALID",
    "ROUND_ONE_SUPPLY_POOL_REQUEST_INVALID",
    "AVAILABLE_SUPPLY_VERIFICATION_REQUEST_INVALID",
    "SUPPLY_POOL_UNIT_DENOMINATOR_INCOMPLETE",
    "SUPPLY_POOL_UNIT_ROW_INVALID", "SUPPLY_POOL_CAP_EXCEEDED",
    "CASUALTY_SUPPLY_TRANSITION_INVALID",
    "CASUALTY_SUPPLY_UNRELATED_UNIT_DRIFT",
    "CASUALTY_SUPPLY_RELEASE_MISMATCH",
    "DEPLOYMENT_CARD_REFERENCE_REQUEST_INVALID",
  ],
  evidenceSlug: "supply-pool-rules-v1",
  evidenceFixtures: {
    positive: "round-one-capacity-on-table-use-available-and-reserve-eligibility",
    negative: "later-round-incomplete-units-forged-values-and-over-cap-reject",
    interaction: "casualty-tier-release-and-gauntlet-deployment-reference",
    lifecycle: "official-supply-plan-authority-apply-and-replay",
  },
  executableScope:
    "official_round_one_mission_supply_pool_capacity_on_table_current_supply_available_supply_casualty_release_and_deployment_card_reference_current_source_lock",
  progressKey: "supplyPoolRulesProgress",
  progress: {
    promotedAtomCount: 5,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 5,
    roundOneMissionSupplyCapacityExecutable: true,
    currentSupplyAlwaysRecalculatedFromOfficialProfiles: true,
    reserveSupplyExcludedFromOnTableUsage: true,
    casualtySupplyReleaseExecutable: true,
    deploymentCardInfluenceZoneReferenceExecutable: true,
    existingAvailableSupplyAndReserveEligibilityDependenciesReused: true,
    completeLaterRoundSupplyLifecycleClaimed: false,
    existingSupplyLifecycleExecutorsFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "supply_pool_rules_v1",
  frozenExecutorIds: [
    "authority.unit-card-supply-rules-v1", "authority.start-of-round-v5",
    "authority.reserve-deploy-v5", "authority.disengage-v5",
  ],
  judgeTests: 42,
  agentDecisionEvidence:
    "rules_owned_mission_capacity_then_current_unit_supply_on_table_available_casualty_release_or_deployment_reference_certificate",
  userVisibleChecks: [
    "round_one_receipt_shows_each_player_supply_pool_equals_mission_starting_supply",
    "available_receipt_shows_capacity_minus_friendly_on_table_current_supply",
    "casualty_receipt_shows_current_supply_delta_and_exact_available_supply_release",
    "deployment_receipt_shows_official_card_zone_depth_edges_and_geometry_hash",
  ],
  blocks: [
    "two_hundred_seventeen_actionable_atoms_remain_non_executable",
    "later_round_supply_escalation_lifecycle_remains_owned_by_existing_atomic_executors",
    "existing_supply_consumers_are_frozen_not_silently_rewritten",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialSupplyPoolRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialSupplyPoolRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
