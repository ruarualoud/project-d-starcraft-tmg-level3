import {
  OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_TYPE,
  OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_ID,
  OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_VERSION,
  OFFICIAL_RESERVE_LIFECYCLE_RULES_NEW_ATOM_IDS,
  OFFICIAL_RESERVE_LIFECYCLE_RULES_PARAMETER_KIND,
  OFFICIAL_RESERVE_LIFECYCLE_RULES_PENDING_SCHEMA,
  OFFICIAL_RESERVE_LIFECYCLE_RULES_TRANSITION_SCHEMA,
} from "./official-reserve-lifecycle-rules-executor-v1.mjs";
import { createOfficialSupplyPoolRulesRelationshipExtensionV1 } from
  "./official-supply-pool-rules-relationship-contract-v1.mjs";
import { createOfficialReserveLifecycleRulesRelationshipExtensionV1 } from
  "./official-reserve-lifecycle-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "RESERVE_LIFECYCLE_RULES",
  schema: "starcraft_tmg_official_reserve_lifecycle_rules_rule_slice_v1",
  catalogueVersion: "0.96.0-official-reserve-lifecycle-rules",
  ordinal: 96,
  actionSchemaVersion: "hybrid_legal_space_v34",
  previousActionSchemaVersion: "hybrid_legal_space_v33",
  previous: {
    schema: "starcraft_tmg_official_supply_pool_rules_rule_slice_v1",
    sliceHash: "0ffaf84c0ace83427c45949c029fb20c3432f220adbefdf94bd9be056edd89ed",
    catalogueHash: "d17e6d39f9c3c7f10afef4185abdccb586e1a7af2657833c492c8f060562e67f",
    runtimeHash: "d6e9fafe69135694c925ac726ff2d7a1dd8523964a7d96a04cb34aa146745ed4",
    graphHash: "cf8d9aaf3778ca1033f164053b846be372c82bf68d8e81e283a86e1da749f0c6",
    relationship: createOfficialSupplyPoolRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "155a5869a0530d033d4ec8f769eb162062d7c78ba84663c101aa77e70bbd1f39",
    catalogueHash: "1e9e3c7ba1cdf12927057718dcd490c8ed12305fd04dea46f7c3a8aefef1db5a",
    runtimeHash: "5a03d752b61b436357bedb198de1455bb32cce1d11f6dc0563f2c37a4057d035",
    graphHash: "54c3e37f72cdd34be994e3362dc2e881962753adefb5070016068f58e4d437fa",
  },
  counts: {
    previousExecutable: 695, previousReview: 217,
    executable: 712, review: 200, displayOnly: 114, executors: 65,
  },
  remainingSlices: 15,
  newAtomIds: OFFICIAL_RESERVE_LIFECYCLE_RULES_NEW_ATOM_IDS,
  executor: {
    id: OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_ID,
    version: OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_RESERVE_LIFECYCLE_RULES_TRANSITION_SCHEMA,
  },
  actionType: OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_RESERVE_LIFECYCLE_RULES_PARAMETER_KIND,
  relationship: createOfficialReserveLifecycleRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: {
    phase: "setup_or_rule_effect_or_targeting_or_post_arrival_or_final_scoring_start",
    window: "reserve_lifecycle_procedure", priority: 196,
  },
  preconditions: [{
    predicateId: "reserve_lifecycle.complete_rules_owned_state_denominator",
    inputSchema: OFFICIAL_RESERVE_LIFECYCLE_RULES_PENDING_SCHEMA,
    failureCode: "RESERVE_LIFECYCLE_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "reserve_lifecycle.uses_pinned_part8_part11_and_mission_sources",
    inputSchema: "starcraft_tmg_official_reserve_lifecycle_data_bundle_v1",
    failureCode: "RESERVE_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "reserve_lifecycle.mutation_is_rules_derived_and_hash_bound",
    inputSchema: "starcraft_tmg_official_reserve_lifecycle_plan_v1",
    failureCode: "RESERVE_LIFECYCLE_MUTATION_STALE",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "RESERVE_LIFECYCLE_ACTION_INVALID", "RESERVE_LIFECYCLE_ACTION_STALE",
    "RESERVE_LIFECYCLE_PENDING_INVALID", "RESERVE_LIFECYCLE_CHOICE_INVALID",
    "RESERVE_LIFECYCLE_PARAMETER_DOMAIN_STALE",
    "RESERVE_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID",
    "RESERVE_LIFECYCLE_DATA_ARTIFACT_BINDING_INVALID",
    "RESERVE_LIFECYCLE_STATE_INVALID", "RESERVE_LIFECYCLE_PIECE_INVALID",
    "RESERVE_LIFECYCLE_CURRENT_SUPPLY_STALE",
    "INITIAL_RESERVES_WINDOW_INVALID", "RETURN_TO_RESERVES_TRIGGER_INVALID",
    "RESERVE_TARGETING_QUERY_INVALID", "POST_ARRIVAL_UNIT_STATE_INVALID",
    "POST_ARRIVAL_RESERVE_DEPLOY_WITNESS_REQUIRED",
    "FINAL_RESERVE_DESTRUCTION_WINDOW_INVALID",
    "RESERVE_LIFECYCLE_MUTATION_STALE",
    "RESERVE_LIFECYCLE_TOKEN_PATCH_STALE",
    "RESERVE_LIFECYCLE_MARKER_PATCH_STALE",
  ],
  evidenceSlug: "reserve-lifecycle-rules-v1",
  evidenceFixtures: {
    positive: "initial-reserves-return-retention-and-inactivity",
    negative: "wrong-window-forged-mutation-stale-state-and-target-exception-reject",
    interaction: "reserve-deploy-post-arrival-and-final-destruction-ledger",
    lifecycle: "official-reserve-state-mutation-authority-apply-and-replay",
  },
  executableScope:
    "official_initial_reserves_return_to_reserves_retained_loadout_damage_timed_effect_activation_ability_inactivity_targeting_post_arrival_and_final_reserve_destruction_current_source_lock",
  progressKey: "reserveLifecycleRulesProgress",
  progress: {
    promotedAtomCount: 17,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 17,
    initialArmyReservesStateExecutable: true,
    returnToReservesStateMutationExecutable: true,
    currentSupplyReleaseAndRoundSupplyRecalculationExecutable: true,
    loadoutDamageTimedEffectsAndActivationRetained: true,
    activePassiveAndReactionAbilitiesInactiveInReserves: true,
    reserveTargetingRestrictionWithoutExplicitExceptionExecutable: true,
    frozenReserveDeployV5OwnsArrivalGeometry: true,
    postArrivalAbilitiesAndInfluenceZoneStateExecutable: true,
    finalReserveDestructionAndVpLedgerExecutable: true,
    finalScoringCommitDeferredToSlice110: true,
    existingReserveAndScoringExecutorsFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "reserve_lifecycle_rules_v1",
  frozenExecutorIds: [
    "authority.reserve-deploy-v5", "authority.start-of-round-v5",
    "authority.medic-medpack-active-v2", "authority.academy-medic-ability-v2",
    "authority.victory-point-scoring-v1",
    "authority.hold-position-end-game-check-v2",
  ],
  judgeTests: 50,
  agentDecisionEvidence:
    "rules_owned_reserve_state_transition_with_retention_targeting_arrival_and_final_destruction_ledger",
  userVisibleChecks: [
    "return_receipt_shows_supply_release_retained_damage_loadout_effect_and_activation_hashes",
    "reserve_receipt_shows_active_passive_reaction_inactive_and_targeting_prohibited",
    "arrival_receipt_shows_abilities_resume_and_influence_zone_no_longer_applies",
    "final_receipt_lists_every_reserve_unit_destroyed_supply_and_enemy_vp_candidate",
  ],
  blocks: [
    "two_hundred_actionable_atoms_remain_non_executable",
    "explicit_reserve_affecting_exception_registry_remains_fail_closed",
    "final_round_scoring_commit_and_tiebreak_remain_slice110",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialReserveLifecycleRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialReserveLifecycleRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
