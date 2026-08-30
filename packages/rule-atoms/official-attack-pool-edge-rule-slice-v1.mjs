import {
  OFFICIAL_ATTACK_POOL_EDGE_ACTION_TYPE,
  OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID,
  OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_VERSION,
  OFFICIAL_ATTACK_POOL_EDGE_NEW_ATOM_IDS,
  OFFICIAL_ATTACK_POOL_EDGE_PARAMETER_KIND,
  OFFICIAL_ATTACK_POOL_EDGE_TRANSITION_SCHEMA,
} from "./official-attack-pool-edge-executor-v1.mjs";
import { createOfficialAttackPoolEdgeRelationshipExtensionV1 } from
  "./official-attack-pool-edge-relationship-contract-v1.mjs";
import {
  createOfficialRuleSliceReleaseV1,
  verifyOfficialRuleSliceReleaseV1,
} from "./official-rule-slice-release-builder-v1.mjs";
import { createOfficialTemplateWeaponRelationshipExtensionV1 } from
  "./official-template-weapon-relationship-contract-v1.mjs";

const CONFIG = Object.freeze({
  prefix: "ATTACK_POOL_EDGE",
  schema: "starcraft_tmg_official_attack_pool_edge_rule_slice_v1",
  catalogueVersion: "0.79.0-official-attack-pool-edges",
  ordinal: 79,
  previous: {
    schema: "starcraft_tmg_official_template_weapon_rule_slice_v1",
    sliceHash: "77f415c1b6ef8363ecde758d71bd661822ddd9eeedf0156ab7b95e70eee7165b",
    catalogueHash: "5829d562f56df54b0e57a76ae130fba0c41a2ed57de3e93b7c6147839ee986ee",
    runtimeHash: "d21b5fb901e8b50a9f9e327b3968e7d8340473c158a04c8c628f1d93c16e1e17",
    graphHash: "3aef268d73670933d979486c2558db6b7a23941db92144648d672a00f099a763",
    relationship: createOfficialTemplateWeaponRelationshipExtensionV1,
  },
  expected: { sliceHash: "679832d4d10faf9db077d37bc826f29e60c05e5dd878e85a39ba679af4611e34",
    catalogueHash: "6fe9dc881b2fe1eacd0727f4fe2963601866129d4f28009840f37eb23b0220cd",
    runtimeHash: "d41ec7a6957bed16acf24e6132cf18e45a41bf8e8bccde98813b5c892d472013",
    graphHash: "ce215ca1e02a93254c19fd988a0ac1352cd06d9fbe703b67d0af7733a08567c6" },
  counts: { previousExecutable: 480, previousReview: 432,
    executable: 493, review: 419, displayOnly: 114, executors: 48 },
  remainingSlices: 32,
  newAtomIds: OFFICIAL_ATTACK_POOL_EDGE_NEW_ATOM_IDS,
  executor: { id: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID,
    version: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_ATTACK_POOL_EDGE_ACTION_TYPE],
    transitionSchema: OFFICIAL_ATTACK_POOL_EDGE_TRANSITION_SCHEMA },
  actionType: OFFICIAL_ATTACK_POOL_EDGE_ACTION_TYPE,
  parameterKind: OFFICIAL_ATTACK_POOL_EDGE_PARAMETER_KIND,
  relationship: createOfficialAttackPoolEdgeRelationshipExtensionV1,
  timing: { phase: "assault", window: "attack_pool_edge_resolution", priority: 179 },
  preconditions: [{ predicateId: "attack_pool.edge_pending_and_pool_order_are_exact",
    inputSchema: "starcraft_tmg_official_attack_pool_edge_pending_v1",
    failureCode: "ATTACK_POOL_EDGE_PENDING_INVALID" },
  { predicateId: "attack_pool.edge_procedure_uses_pinned_official_rule_source",
    inputSchema: "starcraft_tmg_official_development_tranche_source_lock_audit_v1",
    failureCode: "ATTACK_POOL_EDGE_SOURCE_LOCK_BINDING_INVALID" }],
  chance: { kind: "chance_ticket", ticketSchema: "starcraft_tmg_chance_bundle_v1" },
  rejectionCodes: ["ATTACK_POOL_EDGE_ACTION_INVALID", "ATTACK_POOL_EDGE_ACTION_STALE",
    "ATTACK_POOL_EDGE_PENDING_INVALID", "ATTACK_POOL_EDGE_REDUCED_DICE_SELECTION_INVALID",
    "ATTACK_POOL_EDGE_SOURCE_LOCK_BINDING_INVALID"],
  evidenceSlug: "attack-pool-edge-v1",
  evidenceFixtures: { positive: "mixed-bands-hits-x-tough-and-caps",
    negative: "invalid-selection-stale-state-and-source-rejected",
    interaction: "three-pools-surge-bypass-and-casualty-caps",
    lifecycle: "pending-controller-choice-three-pool-result" },
  executableScope: "official_attack_pool_edge_procedure_conformance_current_source_lock",
  progressKey: "attackPoolEdgeProgress",
  progress: { promotedAtomCount: 13, priorRouteDuplicateLongRangeAtomsCorrected: 3,
    replacementPreviouslyUnassignedAtoms: ["three_pool_overview", "armour_roll_bypass",
      "surge_mismatch"], reducedDiceControllerChoiceExecutable: true,
    mixedModifierAndMixedLongRangeGroupsExecutable: true, hitsXExecutable: true,
    surgeMismatchAndArmourBypassExecutable: true, toughExecutable: true,
    concentratedFireAndVisibleCapsExecutable: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false },
  contractGroup: "attack_pool_edges_v1",
  frozenExecutorIds: ["authority.ranged-attack-v2", "authority.ranged-attack-v6"],
  judgeTests: 18,
  agentDecisionEvidence: "rules_owned_reduced_dice_choice_three_pool_and_casualty_caps",
  userVisibleChecks: ["mixed_range_dice_are_grouped_with_distinct_hit_targets",
    "visible_and_concentrated_fire_caps_explain_discarded_damage"],
  blocks: ["four_hundred_nineteen_actionable_atoms_remain_non_executable",
    "production_room_ui_agent_skill_selfplay_muzero_pending"],
});
export function createOfficialAttackPoolEdgeRuleSliceV1(input = {}) {
  return createOfficialRuleSliceReleaseV1(CONFIG, input);
}
export function verifyOfficialAttackPoolEdgeRuleSliceV1(input = {}) {
  return verifyOfficialRuleSliceReleaseV1(CONFIG, input);
}
