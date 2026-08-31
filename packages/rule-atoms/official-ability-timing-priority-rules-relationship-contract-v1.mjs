import {
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID,
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_VERSION,
} from "./official-ability-timing-priority-rules-executor-v1.mjs";
import { createOfficialKeywordSpecialAbilityRulesRelationshipExtensionV1 } from
  "./official-keyword-special-ability-rules-relationship-contract-v1.mjs";

export const OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-91-ability-timing-priority-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  abilityData: "state_field:officialKeywordSpecialAbilityDataBundle",
  timingData: "state_field:officialAbilityTimingPriorityDataBundle",
  mode: "state_field:rulesProcedureMode", activeSide: "state_field:activeSideKey",
  players: "state_field:players",
  pending: "state_field:pendingAction.abilityTimingPriorityRules",
  history: "state_field:abilityTimingPriorityRulesHistory",
  result: "state_field:lastAbilityTimingPriorityRulesResolution",
  log: "state_field:log",
  choose: "action_variant:abilityTimingPriorityRulesV1.chooseCertifiedPlan",
  comparison: "derived_value:abilityTimingPriorityV1.abilityTypeComparison",
  passiveSet: "derived_value:abilityTimingPriorityV1.completePassiveTriggerSet",
  ownPassiveOrder: "derived_value:abilityTimingPriorityV1.ownPassiveOrder",
  passiveSequence: "derived_value:abilityTimingPriorityV1.crossPlayerPassiveSequence",
  reactionSet: "derived_value:abilityTimingPriorityV1.completeReactionTriggerSet",
  reactionSequence: "derived_value:abilityTimingPriorityV1.reactionSequence",
  reactionDuration: "derived_value:abilityTimingPriorityV1.reactionDefaultDuration",
  eorSet: "derived_value:abilityTimingPriorityV1.completeEndOfRoundEffectSet",
  eorSequence: "derived_value:abilityTimingPriorityV1.endOfRoundEffectSequence",
  event: "state_event:ability_timing_priority_rules_resolved",
  sourceTest: "judge_test:ability-timing-priority-v1-source",
  comparisonTest: "judge_test:ability-timing-priority-v1-comparison",
  passiveTest: "judge_test:ability-timing-priority-v1-passive",
  reactionTest: "judge_test:ability-timing-priority-v1-reaction",
  durationTest: "judge_test:ability-timing-priority-v1-duration",
  eorTest: "judge_test:ability-timing-priority-v1-end-round",
  authorityTest: "judge_test:ability-timing-priority-v1-authority-replay",
  graphTest: "judge_test:ability-timing-priority-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-91" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialAbilityTimingPriorityRulesRelationshipExtensionV1(
  input = {},
) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("ABILITY_TIMING_PRIORITY_RELEASE_INVALID");
  }
  const previous = createOfficialKeywordSpecialAbilityRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.abilityData, ID.timingData, ID.mode,
    ID.activeSide, ID.players, ID.pending, ID.history, ID.result];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "ability_timing_priority:state_contract")),
    edge(executor, "exposes", ID.choose, "ability_timing_priority:certified_choices"),
    edge(ID.timingData, "derives", ID.comparison,
      "ability_timing_priority:official_comparison_table"),
    edge(ID.abilityData, "derives", ID.passiveSet,
      "ability_timing_priority:official_passive_category"),
    edge(ID.passiveSet, "derives", ID.ownPassiveOrder,
      "ability_timing_priority:controller_exact_permutation"),
    edge(ID.activeSide, "derives", ID.passiveSequence,
      "ability_timing_priority:active_player_group_first"),
    edge(ID.ownPassiveOrder, "derives", ID.passiveSequence,
      "ability_timing_priority:within_controller_order"),
    edge(ID.abilityData, "derives", ID.reactionSet,
      "ability_timing_priority:official_reaction_category"),
    edge(ID.activeSide, "derives", ID.reactionSequence,
      "ability_timing_priority:active_player_reaction_first"),
    edge(ID.reactionSet, "derives", ID.reactionSequence,
      "ability_timing_priority:complete_same_trigger_set"),
    edge(ID.timingData, "derives", ID.reactionDuration,
      "ability_timing_priority:default_end_round_expiry"),
    edge(ID.abilityData, "derives", ID.reactionDuration,
      "ability_timing_priority:reaction_source_identity"),
    edge(ID.timingData, "derives", ID.eorSet,
      "ability_timing_priority:end_round_clause"),
    edge(ID.eorSet, "derives", ID.eorSequence,
      "ability_timing_priority:complete_effect_set"),
    edge(ID.players, "derives", ID.eorSequence,
      "ability_timing_priority:first_player_then_opponent"),
    ...[ID.comparison, ID.passiveSequence, ID.reactionSequence,
      ID.reactionDuration, ID.eorSequence].map((source) => edge(source, "derives", ID.event,
      "ability_timing_priority:certified_resolution")),
    edge(ID.choose, "derives", ID.event, "ability_timing_priority:confirmed_choice"),
    edge(ID.event, "writes", ID.pending, "ability_timing_priority:clear_pending"),
    edge(ID.event, "writes", ID.history, "ability_timing_priority:history"),
    edge(ID.event, "writes", ID.result, "ability_timing_priority:last_resolution"),
    edge(ID.event, "writes", ID.log, "ability_timing_priority:log"),
    edge(ID.timingData, "verified_by", ID.sourceTest,
      "ability_timing_priority:source_judge"),
    edge(ID.comparison, "verified_by", ID.comparisonTest,
      "ability_timing_priority:comparison_judge"),
    edge(ID.passiveSequence, "verified_by", ID.passiveTest,
      "ability_timing_priority:passive_judge"),
    edge(ID.reactionSequence, "verified_by", ID.reactionTest,
      "ability_timing_priority:reaction_judge"),
    edge(ID.reactionDuration, "verified_by", ID.durationTest,
      "ability_timing_priority:duration_judge"),
    edge(ID.eorSequence, "verified_by", ID.eorTest,
      "ability_timing_priority:end_round_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "ability_timing_priority:authority"),
    edge(executor, "verified_by", ID.graphTest,
      "ability_timing_priority:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "ability_timing_priority:stale")),
  ];
  const additions = [
    node(ID.timingData, "state_field", "Official ability timing and priority source bundle"),
    node(ID.pending, "state_field", "Ability timing and priority pending"),
    node(ID.history, "state_field", "Ability timing and priority history"),
    node(ID.result, "state_field", "Last ability timing and priority resolution"),
    node(ID.choose, "action_variant", "Choose certified ability timing or priority plan"),
    node(ID.comparison, "derived_value", "Official ability type comparison"),
    node(ID.passiveSet, "derived_value", "Complete simultaneous passive set"),
    node(ID.ownPassiveOrder, "derived_value", "Controller chosen passive order"),
    node(ID.passiveSequence, "derived_value", "Cross-player passive sequence"),
    node(ID.reactionSet, "derived_value", "Complete simultaneous reaction set"),
    node(ID.reactionSequence, "derived_value", "Active-player-first reaction sequence"),
    node(ID.reactionDuration, "derived_value", "Reaction default duration"),
    node(ID.eorSet, "derived_value", "Complete end-of-round effect set"),
    node(ID.eorSequence, "derived_value", "First-player-first end-of-round sequence"),
    node(ID.event, "state_event", "Ability timing or priority rules resolved"),
    node(ID.sourceTest, "judge_test", "Pinned timing source Judge"),
    node(ID.comparisonTest, "judge_test", "Ability comparison Judge"),
    node(ID.passiveTest, "judge_test", "Passive ordering Judge"),
    node(ID.reactionTest, "judge_test", "Reaction ordering Judge"),
    node(ID.durationTest, "judge_test", "Reaction duration Judge"),
    node(ID.eorTest, "judge_test", "End-of-round ordering Judge"),
    node(ID.authorityTest, "judge_test", "Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:ability_timing_priority_rules_v1" }],
    declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
      OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.log, ID.choose,
        ID.comparison, ID.passiveSet, ID.ownPassiveOrder, ID.passiveSequence,
        ID.reactionSet, ID.reactionSequence, ID.reactionDuration, ID.eorSet,
        ID.eorSequence, ID.event, ID.sourceTest, ID.comparisonTest, ID.passiveTest,
        ID.reactionTest, ID.durationTest, ID.eorTest, ID.authorityTest, ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [
        { from: ID.timingData, to: ID.event, relationships: ["derives"], maxDepth: 8 },
        { from: ID.abilityData, to: ID.event, relationships: ["derives"], maxDepth: 8 },
        { from: ID.passiveSet, to: ID.event, relationships: ["derives"], maxDepth: 6 },
      ], forbiddenPaths: [],
      evidenceTestNodeIds: [ID.sourceTest, ID.comparisonTest, ID.passiveTest,
        ID.reactionTest, ID.durationTest, ID.eorTest, ID.authorityTest, ID.graphTest],
    }],
  };
}
