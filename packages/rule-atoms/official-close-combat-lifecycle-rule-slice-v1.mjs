import {
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_TYPE,
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID,
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_VERSION,
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_NEW_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_PARAMETER_KIND,
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_TRANSITION_SCHEMA,
} from "./official-close-combat-lifecycle-executor-v1.mjs";
import { createOfficialCloseCombatLifecycleRelationshipExtensionV1 } from
  "./official-close-combat-lifecycle-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { createOfficialAttackPoolEdgeRelationshipExtensionV1 } from
  "./official-attack-pool-edge-relationship-contract-v1.mjs";

const CONFIG = Object.freeze({
  prefix: "CLOSE_COMBAT_LIFECYCLE",
  schema: "starcraft_tmg_official_close_combat_lifecycle_rule_slice_v1",
  catalogueVersion: "0.80.0-official-close-combat-lifecycle",
  ordinal: 80,
  previous: {
    schema: "starcraft_tmg_official_attack_pool_edge_rule_slice_v1",
    sliceHash: "679832d4d10faf9db077d37bc826f29e60c05e5dd878e85a39ba679af4611e34",
    catalogueHash: "6fe9dc881b2fe1eacd0727f4fe2963601866129d4f28009840f37eb23b0220cd",
    runtimeHash: "d41ec7a6957bed16acf24e6132cf18e45a41bf8e8bccde98813b5c892d472013",
    graphHash: "ce215ca1e02a93254c19fd988a0ac1352cd06d9fbe703b67d0af7733a08567c6",
    relationship: createOfficialAttackPoolEdgeRelationshipExtensionV1,
  },
  expected: {
    sliceHash: "72419eee486fe03bc11e7391cb63d5e7fc7f06ba6e02de1d80ab2487119a4f85",
    catalogueHash: "00108a2738d7b20edd5b9848edb7a080d1d328fab96e072dda477c8a3e05628f",
    runtimeHash: "c860bc9305abbdc615e8d4aab6b6a23ad54624f5effbe42863756f1b911cf270",
    graphHash: "9e9a9c0f879cc196abc3de87cab59a6c47395c096cfb04f8244f1f593f85fb0a",
  },
  counts: { previousExecutable: 493, previousReview: 419,
    executable: 501, review: 411, displayOnly: 114, executors: 49 },
  remainingSlices: 31,
  newAtomIds: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID,
    version: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_TYPE],
    transitionSchema: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_TRANSITION_SCHEMA },
  actionType: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_TYPE,
  parameterKind: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_PARAMETER_KIND,
  relationship: createOfficialCloseCombatLifecycleRelationshipExtensionV1,
  timing: { phase: "combat", window: "close_combat_lifecycle", priority: 180 },
  preconditions: [{ predicateId: "close_combat.lifecycle_pending_and_geometry_are_exact",
    inputSchema: "starcraft_tmg_official_close_combat_lifecycle_pending_v1",
    failureCode: "CLOSE_COMBAT_LIFECYCLE_PENDING_INVALID" },
  { predicateId: "close_combat.lifecycle_uses_pinned_official_rule_source",
    inputSchema: "starcraft_tmg_official_development_tranche_source_lock_audit_v1",
    failureCode: "CLOSE_COMBAT_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID" }],
  chance: { kind: "chance_ticket", ticketSchema: "starcraft_tmg_chance_bundle_v1" },
  rejectionCodes: ["CLOSE_COMBAT_LIFECYCLE_ACTION_INVALID",
    "CLOSE_COMBAT_LIFECYCLE_ACTION_STALE", "CLOSE_COMBAT_LIFECYCLE_PENDING_INVALID",
    "CLOSE_COMBAT_LIFECYCLE_TARGET_SELECTION_INVALID",
    "CLOSE_COMBAT_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID"],
  evidenceSlug: "close-combat-lifecycle-v1",
  evidenceFixtures: { positive: "multi-enemy-target-ranks-and-melee-e-range",
    negative: "invalid-target-stale-geometry-and-source-rejected",
    interaction: "surge-tag-and-explicit-close-combat-evade",
    lifecycle: "marker-removal-freed-pass-and-reaction-exception" },
  executableScope:
    "official_close_combat_lifecycle_procedure_conformance_current_source_lock",
  progressKey: "closeCombatLifecycleProgress",
  progress: { promotedAtomCount: 8, meleeEUsesEngagementRange: true,
    engagementRangeMilliInches: 1000, perTargetFightingAndSupportingRanksExecutable: true,
    arbitraryEligibleEnemyUnitCountSupported: true,
    meleeSurgeTargetCombatTagExecutable: true,
    closeCombatEvadeRequiresExplicitGrant: true,
    combatActivationMarkerRemovalExecutable: true,
    freedUnitEffectivePassExecutable: true,
    freedUnitReactionExceptionExecutable: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "close_combat_lifecycle_v1",
  frozenExecutorIds: ["authority.close-combat-attack-v8", "authority.engagement-v2"],
  judgeTests: 20,
  agentDecisionEvidence:
    "rules_owned_engaged_target_choice_rank_eligibility_and_post_combat_lifecycle",
  userVisibleChecks: ["all_eligible_engaged_enemy_units_are_shown_as_target_choices",
    "freed_unit_pass_and_reaction_exception_are_explained_separately"],
  blocks: ["four_hundred_eleven_actionable_atoms_remain_non_executable",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});
export function createOfficialCloseCombatLifecycleRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialCloseCombatLifecycleRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
