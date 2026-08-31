import {
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID,
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_VERSION,
} from "./official-keyword-special-ability-rules-executor-v1.mjs";
import { createOfficialDiceTestModifierRulesRelationshipExtensionV1 } from
  "./official-dice-test-modifier-rules-relationship-contract-v1.mjs";

export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-90-keyword-special-ability-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  sourceData: "state_field:officialKeywordSpecialAbilityDataBundle",
  mode: "state_field:rulesProcedureMode",
  activeSide: "state_field:activeSideKey",
  players: "state_field:players",
  pending: "state_field:pendingAction.keywordSpecialAbilityRules",
  history: "state_field:keywordSpecialAbilityRulesHistory",
  result: "state_field:lastKeywordSpecialAbilityRulesResolution",
  log: "state_field:log",
  choose: "action_variant:keywordSpecialAbilityRulesV1.chooseCertifiedPlan",
  keywordRegistry: "derived_value:keywordSpecialAbilityV1.keywordRegistry",
  formattedKeyword: "derived_value:keywordSpecialAbilityV1.formattedKeyword",
  keywordGroup: "derived_value:keywordSpecialAbilityV1.sameKeywordGroup",
  highestKeyword: "derived_value:keywordSpecialAbilityV1.highestNumericKeyword",
  abilityIndex: "derived_value:keywordSpecialAbilityV1.officialAbilityIndex",
  abilityCategory: "derived_value:keywordSpecialAbilityV1.abilityCategory",
  targetMode: "derived_value:keywordSpecialAbilityV1.targetMode",
  rangeLos: "derived_value:keywordSpecialAbilityV1.targetRangeLos",
  sameNameGroup: "derived_value:keywordSpecialAbilityV1.sameNameEffectGroup",
  selectedEffect: "derived_value:keywordSpecialAbilityV1.selectedSameNameEffect",
  repeatable: "derived_value:keywordSpecialAbilityV1.repeatablePermission",
  event: "state_event:keyword_special_ability_rules_resolved",
  sourceTest: "judge_test:keyword-special-ability-v1-source-index",
  keywordTest: "judge_test:keyword-special-ability-v1-keyword-semantics",
  categoryTest: "judge_test:keyword-special-ability-v1-category",
  targetTest: "judge_test:keyword-special-ability-v1-targeting",
  nonstackTest: "judge_test:keyword-special-ability-v1-nonstack",
  repeatableTest: "judge_test:keyword-special-ability-v1-repeatable",
  authorityTest: "judge_test:keyword-special-ability-v1-authority-replay",
  graphTest: "judge_test:keyword-special-ability-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-90" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialKeywordSpecialAbilityRulesRelationshipExtensionV1(
  input = {},
) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("KEYWORD_SPECIAL_ABILITY_RELEASE_INVALID");
  }
  const previous = createOfficialDiceTestModifierRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.sourceData, ID.mode, ID.activeSide,
    ID.players, ID.pending, ID.history, ID.result];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "keyword_special_ability:state_contract")),
    edge(executor, "exposes", ID.choose,
      "keyword_special_ability:certified_choices"),
    edge(ID.sourceData, "derives", ID.keywordRegistry,
      "keyword_special_ability:76_official_glossary_entries"),
    edge(ID.keywordRegistry, "derives", ID.formattedKeyword,
      "keyword_special_ability:bold_caps_and_stable_meaning"),
    edge(ID.formattedKeyword, "derives", ID.keywordGroup,
      "keyword_special_ability:same_keyword_identity"),
    edge(ID.keywordGroup, "derives", ID.highestKeyword,
      "keyword_special_ability:nonstack_and_numeric_highest"),
    edge(ID.sourceData, "derives", ID.abilityIndex,
      "keyword_special_ability:201_current_official_abilities"),
    edge(ID.abilityIndex, "derives", ID.abilityCategory,
      "keyword_special_ability:active_passive_reaction"),
    edge(ID.abilityIndex, "derives", ID.targetMode,
      "keyword_special_ability:rules_owned_target_declaration"),
    edge(ID.targetMode, "derives", ID.rangeLos,
      "keyword_special_ability:targeted_or_untargeted_or_placement"),
    edge(ID.abilityIndex, "derives", ID.sameNameGroup,
      "keyword_special_ability:canonical_name"),
    edge(ID.sameNameGroup, "derives", ID.selectedEffect,
      "keyword_special_ability:one_identical_effect_or_fail_closed"),
    edge(ID.keywordRegistry, "derives", ID.repeatable,
      "keyword_special_ability:repeatable_definition"),
    edge(ID.abilityIndex, "derives", ID.repeatable,
      "keyword_special_ability:ability_use_frequency"),
    edge(ID.choose, "derives", ID.event,
      "keyword_special_ability:confirmed_resolution"),
    edge(ID.highestKeyword, "derives", ID.event,
      "keyword_special_ability:keyword_resolution"),
    edge(ID.abilityCategory, "derives", ID.event,
      "keyword_special_ability:category_resolution"),
    edge(ID.rangeLos, "derives", ID.event,
      "keyword_special_ability:target_resolution"),
    edge(ID.selectedEffect, "derives", ID.event,
      "keyword_special_ability:nonstack_resolution"),
    edge(ID.repeatable, "derives", ID.event,
      "keyword_special_ability:frequency_resolution"),
    edge(ID.event, "writes", ID.pending,
      "keyword_special_ability:clear_pending"),
    edge(ID.event, "writes", ID.history,
      "keyword_special_ability:history"),
    edge(ID.event, "writes", ID.result,
      "keyword_special_ability:last_resolution"),
    edge(ID.event, "writes", ID.log,
      "keyword_special_ability:log"),
    edge(ID.sourceData, "verified_by", ID.sourceTest,
      "keyword_special_ability:source_judge"),
    edge(ID.highestKeyword, "verified_by", ID.keywordTest,
      "keyword_special_ability:keyword_judge"),
    edge(ID.abilityCategory, "verified_by", ID.categoryTest,
      "keyword_special_ability:category_judge"),
    edge(ID.rangeLos, "verified_by", ID.targetTest,
      "keyword_special_ability:target_judge"),
    edge(ID.selectedEffect, "verified_by", ID.nonstackTest,
      "keyword_special_ability:nonstack_judge"),
    edge(ID.repeatable, "verified_by", ID.repeatableTest,
      "keyword_special_ability:repeatable_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "keyword_special_ability:authority"),
    edge(executor, "verified_by", ID.graphTest,
      "keyword_special_ability:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "keyword_special_ability:stale")),
  ];
  const additions = [
    node(ID.sourceData, "state_field", "Official keyword and ability source bundle"),
    node(ID.pending, "state_field", "Keyword and ability pending"),
    node(ID.history, "state_field", "Keyword and ability history"),
    node(ID.result, "state_field", "Last keyword and ability resolution"),
    node(ID.choose, "action_variant", "Choose certified keyword or ability plan"),
    node(ID.keywordRegistry, "derived_value", "Official keyword registry"),
    node(ID.formattedKeyword, "derived_value", "Bold caps keyword use"),
    node(ID.keywordGroup, "derived_value", "Same keyword group"),
    node(ID.highestKeyword, "derived_value", "Effective highest numeric keyword"),
    node(ID.abilityIndex, "derived_value", "Official special ability index"),
    node(ID.abilityCategory, "derived_value", "Active passive reaction category"),
    node(ID.targetMode, "derived_value", "Ability target mode"),
    node(ID.rangeLos, "derived_value", "Target range and line of sight requirement"),
    node(ID.sameNameGroup, "derived_value", "Same named simultaneous effects"),
    node(ID.selectedEffect, "derived_value", "Single effective same named effect"),
    node(ID.repeatable, "derived_value", "Repeatable use permission"),
    node(ID.event, "state_event", "Keyword or special ability rules resolved"),
    node(ID.sourceTest, "judge_test", "Pinned keyword and ability source Judge"),
    node(ID.keywordTest, "judge_test", "Keyword formatting and stacking Judge"),
    node(ID.categoryTest, "judge_test", "Ability category Judge"),
    node(ID.targetTest, "judge_test", "Ability targeting Judge"),
    node(ID.nonstackTest, "judge_test", "Same name nonstack Judge"),
    node(ID.repeatableTest, "judge_test", "Repeatable permission Judge"),
    node(ID.authorityTest, "judge_test", "Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes,
      ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:keyword_special_ability_rules_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.log, ID.choose,
        ID.keywordRegistry, ID.formattedKeyword, ID.keywordGroup,
        ID.highestKeyword, ID.abilityIndex, ID.abilityCategory, ID.targetMode,
        ID.rangeLos, ID.sameNameGroup, ID.selectedEffect, ID.repeatable,
        ID.event, ID.sourceTest, ID.keywordTest, ID.categoryTest, ID.targetTest,
        ID.nonstackTest, ID.repeatableTest, ID.authorityTest, ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [
        { from: ID.sourceData, to: ID.event,
          relationships: ["derives"], maxDepth: 10 },
        { from: ID.keywordRegistry, to: ID.event,
          relationships: ["derives"], maxDepth: 8 },
        { from: ID.abilityIndex, to: ID.event,
          relationships: ["derives"], maxDepth: 8 },
      ],
      forbiddenPaths: [],
      evidenceTestNodeIds: [ID.sourceTest, ID.keywordTest, ID.categoryTest,
        ID.targetTest, ID.nonstackTest, ID.repeatableTest, ID.authorityTest,
        ID.graphTest],
    }],
  };
}
