import {
  OFFICIAL_RESPAWN_MORPH_RULES_ACTION_TYPE,
  OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID,
  OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_VERSION,
  OFFICIAL_RESPAWN_MORPH_RULES_NEW_ATOM_IDS,
  OFFICIAL_RESPAWN_MORPH_RULES_PARAMETER_KIND,
  OFFICIAL_RESPAWN_MORPH_RULES_PENDING_SCHEMA,
  OFFICIAL_RESPAWN_MORPH_RULES_TRANSITION_SCHEMA,
} from "./official-respawn-morph-rules-executor-v1.mjs";
import { createOfficialRespawnMorphRulesRelationshipExtensionV1 } from
  "./official-respawn-morph-rules-relationship-contract-v1.mjs";
import { createOfficialSummonRulesRelationshipExtensionV1 } from
  "./official-summon-rules-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH } from
  "./official-remaining-rule-atom-route-v2.mjs";

const CONFIG = Object.freeze({
  prefix: "RESPAWN_MORPH_RULES",
  schema: "starcraft_tmg_official_respawn_morph_rules_rule_slice_v1",
  catalogueVersion: "0.101.0-official-respawn-morph-rules", ordinal: 101,
  actionSchemaVersion: "hybrid_legal_space_v39",
  previousActionSchemaVersion: "hybrid_legal_space_v38",
  previous: {
    schema: "starcraft_tmg_official_summon_rules_rule_slice_v1",
    sliceHash: "2005882bda4e1b8872bdf1f544b08a75d73c94ec1b0f106d431a5c647e860227",
    catalogueHash: "c2c12a4878d15d12c3fc50ffbd30c3761745280eef240a7f6a242db74725c73c",
    runtimeHash: "b09612c0d0978fee0e28782f0a64af0bc527375714d957f62a80388739aacd63",
    graphHash: "65ecafb810cecd133e7be8602615649c2d83a4684dd292503979cdd1899524d9",
    relationship: createOfficialSummonRulesRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "7813422ee78075f51c21ce70f1611ab09006ac52a21deea6d9157166d71287e0",
    catalogueHash: "1981fd37077e76e6925bf4237f13f105c17755964a1a87c629d62eba3b2568af",
    runtimeHash: "d3815aa7cc6296bd306bb9c01ea59ffae91d44222f33121367b4ea7e859857c9",
    graphHash: "00089711d18266c78b0185b03d137e39dc9d9955c21bf8354348b7799e528764",
  },
  counts: { previousExecutable: 760, previousReview: 152,
    executable: 769, review: 143, displayOnly: 114, executors: 70 },
  remainingSlices: 10, newAtomIds: OFFICIAL_RESPAWN_MORPH_RULES_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID,
    version: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_RESPAWN_MORPH_RULES_ACTION_TYPE],
    transitionSchema: OFFICIAL_RESPAWN_MORPH_RULES_TRANSITION_SCHEMA },
  actionType: OFFICIAL_RESPAWN_MORPH_RULES_ACTION_TYPE,
  parameterKind: OFFICIAL_RESPAWN_MORPH_RULES_PARAMETER_KIND,
  relationship: createOfficialRespawnMorphRulesRelationshipExtensionV1,
  actor: "controlling_player",
  timing: { phase: "rules_procedure",
    window: "respawn_or_morph_source_supply_placement_and_activation_resolution",
    priority: 201 },
  preconditions: [{
    predicateId: "respawn_morph.complete_rules_owned_state_denominator",
    inputSchema: OFFICIAL_RESPAWN_MORPH_RULES_PENDING_SCHEMA,
    failureCode: "RESPAWN_MORPH_PROCEDURE_CERTIFICATE_REQUIRED",
  }, {
    predicateId: "respawn_morph.uses_pinned_core_and_current_product_sources",
    inputSchema: "starcraft_tmg_official_respawn_morph_data_bundle_v1",
    failureCode: "RESPAWN_MORPH_SOURCE_LOCK_BINDING_INVALID",
  }, {
    predicateId: "respawn_morph.mutation_supply_geometry_and_trigger_are_rules_derived",
    inputSchema: "starcraft_tmg_official_respawn_morph_plan_certificate_v1",
    failureCode: "RESPAWN_MORPH_MUTATION_STALE",
  }],
  chance: { kind: "none" },
  rejectionCodes: [
    "RESPAWN_MORPH_ACTION_INVALID", "RESPAWN_MORPH_ACTION_STALE",
    "RESPAWN_MORPH_PENDING_INVALID", "RESPAWN_MORPH_CHOICE_INVALID",
    "RESPAWN_MORPH_PARAMETER_DOMAIN_STALE",
    "RESPAWN_MORPH_SOURCE_LOCK_BINDING_INVALID",
    "RESPAWN_MORPH_DATA_ARTIFACT_BINDING_INVALID",
    "RESPAWN_CURRENT_CARRIER_REQUIRED", "RESPAWN_REQUEST_INVALID",
    "RESPAWN_MODEL_COUNT_DRIFT", "RESPAWN_EFFECT_TRIGGER_REQUIRED",
    "RESPAWN_EFFECT_TRIGGER_INVALID", "RESPAWN_PLACEMENT_PLAN_INVALID",
    "RESPAWN_CURRENT_SUPPLY_STATE_DRIFT", "RESPAWN_SUPPLY_BRACKET_INCREASE",
    "RESPAWN_MODEL_CANNOT_BE_SET_LEGALLY",
    "RESPAWN_EXISTING_MODEL_CONTACT_REQUIRED",
    "MORPH_AVAILABILITY_REQUEST_INVALID", "RESPAWN_MORPH_MUTATION_STALE",
  ],
  evidenceSlug: "respawn-morph-rules-v1",
  evidenceFixtures: { positive: "zergling-reconstitution-valid-respawn",
    negative: "supply-bracket-contact-enemy-and-forged-trigger-reject",
    interaction: "on-creep-model-geometry-supply-and-destruction-boundary",
    lifecycle: "model-return-zero-morph-carrier-and-round-lock-contract" },
  executableScope:
    "official_current_respawn_carrier_and_generic_morph_zero_carrier_fail_closed_contract",
  progressKey: "respawnMorphRulesProgress",
  progress: { promotedAtomCount: 9,
    routeV2Hash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH,
    routeV2ExactSliceAtomCount: 9,
    currentRespawnCarrierCount: 1, currentMorphCarrierCount: 0,
    boundedDestroyedModelReturnExecutable: true,
    supplyBracketNonIncreaseExecutable: true,
    existingModelBaseContactExecutable: true,
    enemyEngagementAndLegalPlacementExecutable: true,
    onCreepTwoOrThreeRespawnValueExecutable: true,
    genericMorphCoreContractExecutable: true,
    zeroCurrentMorphCarrierFailsClosed: true,
    destroyedUnitReturnRemainsForbidden: true,
    slice97AndExistingConsumersFrozen: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "respawn_morph_rules_v1",
  frozenExecutorIds: ["authority.unit-card-supply-rules-v1",
    "authority.model-base-geometry-rules-v1",
    "authority.status-stay-in-play-rules-v1",
    "authority.unit-destruction-lifecycle-rules-v1",
    "authority.round-phase-activation-rules-v1", "authority.summon-rules-v1"],
  judgeTests: 50,
  agentDecisionEvidence:
    "rules_owned_respawn_carrier_supply_geometry_model_return_and_morph_availability_transition",
  userVisibleChecks: [
    "respawn_receipt_shows_printed_limit_on_creep_state_and_returned_model_ids",
    "respawn_receipt_shows_supply_bracket_contact_and_enemy_separation",
    "morph_receipt_shows_zero_current_carriers_without_inventing_an_action",
    "lifecycle_receipt_distinguishes_model_return_from_destroyed_unit_return",
  ],
  blocks: ["one_hundred_forty_three_actionable_atoms_remain_non_executable",
    "no_current_official_morph_carrier_in_fixed_source_lock",
    "existing_consumers_remain_frozen_and_require_explicit_versioned_composition",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});

export function createOfficialRespawnMorphRulesRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialRespawnMorphRulesRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
