import {
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_TYPE,
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID,
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_VERSION,
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_NEW_ATOM_IDS,
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PARAMETER_KIND,
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PENDING_SCHEMA,
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_TRANSITION_SCHEMA,
} from "./official-unit-destruction-lifecycle-rules-executor-v1.mjs";
import { createOfficialReserveLifecycleRulesRelationshipExtensionV1 } from
  "./official-reserve-lifecycle-rules-relationship-contract-v1.mjs";
import { createOfficialUnitDestructionLifecycleRulesRelationshipExtensionV1 } from
  "./official-unit-destruction-lifecycle-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "UNIT_DESTRUCTION_LIFECYCLE_RULES",
  schema: "starcraft_tmg_official_unit_destruction_lifecycle_rules_rule_slice_v1",
  catalogueVersion: "0.97.0-official-unit-destruction-lifecycle-rules",
  ordinal: 97,
  actionSchemaVersion: "hybrid_legal_space_v35",
  previousActionSchemaVersion: "hybrid_legal_space_v34",
  previous: {
    schema: "starcraft_tmg_official_reserve_lifecycle_rules_rule_slice_v1",
    sliceHash: "155a5869a0530d033d4ec8f769eb162062d7c78ba84663c101aa77e70bbd1f39",
    catalogueHash: "1e9e3c7ba1cdf12927057718dcd490c8ed12305fd04dea46f7c3a8aefef1db5a",
    runtimeHash: "5a03d752b61b436357bedb198de1455bb32cce1d11f6dc0563f2c37a4057d035",
    graphHash: "54c3e37f72cdd34be994e3362dc2e881962753adefb5070016068f58e4d437fa",
    relationship: createOfficialReserveLifecycleRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "59b1b89770e787417731e8afe083b3b431256300e8bb468806ee824f9abae670",
    catalogueHash: "38742bb9d0d96c9a60cb54f1d2a8886ba167fddab8e2f9a77a4fd81a8f95caf0",
    runtimeHash: "925574975598e5be4a1e089f5728ea07a5cb827b4892e7de7b40858689357420",
    graphHash: "5068f1bdd4baaeef787ffbb46629686b901707917568136ae26f58f56d63f86c",
  },
  counts: {
    previousExecutable: 712, previousReview: 200,
    executable: 717, review: 195, displayOnly: 114, executors: 66,
  },
  remainingSlices: 14,
  newAtomIds: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_NEW_ATOM_IDS,
  executor: {
    id: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID,
    version: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_TRANSITION_SCHEMA,
  },
  actionType: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PARAMETER_KIND,
  relationship: createOfficialUnitDestructionLifecycleRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: {
    phase: "immediately_after_last_model_falls_or_return_to_play_query",
    window: "unit_destruction_lifecycle_procedure", priority: 197,
  },
  preconditions: [{
    predicateId: "unit_destruction.complete_rules_owned_state_denominator",
    inputSchema: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PENDING_SCHEMA,
    failureCode: "UNIT_DESTRUCTION_LIFECYCLE_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "unit_destruction.uses_pinned_part7_source",
    inputSchema: "starcraft_tmg_official_unit_destruction_lifecycle_data_bundle_v1",
    failureCode: "UNIT_DESTRUCTION_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "unit_destruction.mutation_is_rules_derived_and_hash_bound",
    inputSchema: "starcraft_tmg_official_unit_destruction_lifecycle_plan_v1",
    failureCode: "UNIT_DESTRUCTION_LIFECYCLE_MUTATION_STALE",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "UNIT_DESTRUCTION_LIFECYCLE_ACTION_INVALID",
    "UNIT_DESTRUCTION_LIFECYCLE_ACTION_STALE",
    "UNIT_DESTRUCTION_LIFECYCLE_PENDING_INVALID",
    "UNIT_DESTRUCTION_LIFECYCLE_CHOICE_INVALID",
    "UNIT_DESTRUCTION_LIFECYCLE_PARAMETER_DOMAIN_STALE",
    "UNIT_DESTRUCTION_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID",
    "UNIT_DESTRUCTION_LIFECYCLE_DATA_ARTIFACT_BINDING_INVALID",
    "UNIT_DESTRUCTION_LIFECYCLE_STATE_INVALID",
    "UNIT_DESTRUCTION_SETTLEMENT_INVALID",
    "DESTROYED_UNIT_RETURN_QUERY_INVALID",
    "DESTROYED_UNIT_RETURN_RULE_UNREGISTERED",
    "DESTROYED_UNIT_RETURN_RULE_EXECUTOR_UNAVAILABLE",
    "UNIT_DESTRUCTION_LIFECYCLE_MUTATION_STALE",
    "UNIT_DESTRUCTION_TOKEN_PATCH_STALE",
    "UNIT_DESTRUCTION_MARKER_PATCH_STALE",
  ],
  evidenceSlug: "unit-destruction-lifecycle-rules-v1",
  evidenceFixtures: {
    positive: "last-model-local-effect-and-created-token-cleanup",
    negative: "live-unit-forged-exception-stale-state-and-client-mutation-reject",
    interaction: "outward-effect-preservation-and-explicit-end-exception",
    lifecycle: "frozen-casualty-producer-to-rules-owned-cleanup-and-return-gate",
  },
  executableScope:
    "official_last_model_unit_destruction_local_effect_cleanup_created_token_stay_in_play_outward_effect_and_destroyed_return_restriction_current_source_lock",
  progressKey: "unitDestructionLifecycleRulesProgress",
  progress: {
    promotedAtomCount: 5,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 5,
    lastModelFallenConditionExecutable: true,
    localEffectsAbilitiesAndConditionsEndExecutable: true,
    nonStayInPlayCreatedTokenCleanupExecutable: true,
    outwardEffectsRemainByDefaultExecutable: true,
    explicitOutwardEndExceptionExecutable: true,
    destroyedUnitReturnDefaultProhibitionExecutable: true,
    positiveReturnRuleRegistryDeferredToSlice101: true,
    existingCasualtyAndReserveConsumersFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  },
  contractGroup: "unit_destruction_lifecycle_rules_v1",
  frozenExecutorIds: [
    "authority.marine-multi-model-casualty-close-combat-v3",
    "authority.marine-multi-enemy-casualty-close-combat-v4",
    "authority.marine-multi-enemy-stimpack-casualty-close-combat-v5",
    "authority.disengage-v2", "authority.reserve-lifecycle-rules-v1",
  ],
  judgeTests: 40,
  agentDecisionEvidence:
    "rules_owned_unit_destruction_cleanup_outward_effect_and_return_gate_transition",
  userVisibleChecks: [
    "destruction_receipt_lists_last_model_local_effect_and_token_cleanup",
    "destruction_receipt_separates_preserved_outward_effects_from_explicit_end_exceptions",
    "stay_in_play_tokens_are_visibly_retained",
    "return_query_shows_specific_registered_rule_required_and_slice101_boundary",
  ],
  blocks: [
    "one_hundred_ninety_five_actionable_atoms_remain_non_executable",
    "positive_destroyed_unit_return_rules_wait_for_slice101_registration",
    "existing_casualty_executors_remain_frozen_and_require_explicit_lifecycle_followup",
    "production_room_ui_agent_skill_selfplay_muzero_pending",
  ],
});

export function createOfficialUnitDestructionLifecycleRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialUnitDestructionLifecycleRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
