import {
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID,
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_VERSION,
} from "./official-army-resource-budget-rules-executor-v1.mjs";
import { createOfficialFactionArmyEligibilityRulesRelationshipExtensionV1 } from
  "./official-faction-army-eligibility-rules-relationship-contract-v1.mjs";

export const OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-103-army-resource-budget-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialArmyResourceBudgetDataBundle",
  mode: "state_field:rulesProcedureMode", round: "state_field:round",
  phase: "state_field:phase", active: "state_field:activeSideKey",
  players: "state_field:players",
  scale: "state_field:armyBuildingEngagementScale",
  configuration: "state_field:armyBuildingConfigurationBySide",
  budgets: "state_field:armyResourceBudgetsBySide",
  teamBudget: "state_field:teamMineralBudgetAgreement",
  publicCards: "state_field:armyCardOpenInformationBySide",
  pending: "state_field:pendingAction.armyResourceBudgetRules",
  history: "state_field:armyResourceBudgetRulesHistory",
  last: "state_field:lastArmyResourceBudgetRulesResolution",
  log: "state_field:log",
  choose: "action_variant:armyResourceBudgetRulesV1.chooseCertifiedPlan",
  mineralPrices: "derived_value:armyResourceBudgetV1.unitAndUpgradeMineralPrices",
  tacticalPrices: "derived_value:armyResourceBudgetV1.tacticalVespenePrices",
  mineralTotal: "derived_value:armyResourceBudgetV1.mineralTotal",
  vespeneLimit: "derived_value:armyResourceBudgetV1.exactRationalVespeneLimit",
  lostResources: "derived_value:armyResourceBudgetV1.unspentResourcesLost",
  noConversion: "derived_value:armyResourceBudgetV1.noResourceConversion",
  slotAudit: "derived_value:armyResourceBudgetV1.reusedFactionSlotAudit",
  teamPartition: "derived_value:armyResourceBudgetV1.completeTeamPlayerPartition",
  teamAllocation: "derived_value:armyResourceBudgetV1.teamMineralAllocation",
  cardProjection: "derived_value:armyResourceBudgetV1.factionTacticalFaceUpProjection",
  disclosureBoundary: "derived_value:armyResourceBudgetV1.slice105RosterBoundary",
  event: "state_event:army_resource_budget_rules_resolved",
  cardExecutor: "executor:authority.card-build-payment-rules-v1@1.0.0",
  unitExecutor: "executor:authority.unit-card-supply-rules-v1@1.0.0",
  eligibilityExecutor: "executor:authority.faction-army-eligibility-rules-v1@1.0.0",
  sourceTest: "judge_test:army-resource-budget-v1-source",
  mineralTest: "judge_test:army-resource-budget-v1-mineral",
  vespeneTest: "judge_test:army-resource-budget-v1-vespene-rational",
  teamTest: "judge_test:army-resource-budget-v1-team",
  disclosureTest: "judge_test:army-resource-budget-v1-open-information",
  authorityTest: "judge_test:army-resource-budget-v1-authority-replay",
  graphTest: "judge_test:army-resource-budget-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-103" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialArmyResourceBudgetRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("ARMY_RESOURCE_BUDGET_RELEASE_INVALID");
  }
  const previous = createOfficialFactionArmyEligibilityRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash });
  const executor = `executor:${OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.mode, ID.round, ID.phase,
    ID.active, ID.players, ID.scale, ID.configuration, ID.budgets, ID.teamBudget,
    ID.publicCards, ID.pending, ID.history, ID.last, ID.log];
  const writes = [ID.budgets, ID.teamBudget, ID.publicCards, ID.pending, ID.history,
    ID.last, ID.log];
  const derived = [ID.mineralPrices, ID.tacticalPrices, ID.mineralTotal,
    ID.vespeneLimit, ID.lostResources, ID.noConversion, ID.slotAudit,
    ID.teamPartition, ID.teamAllocation, ID.cardProjection, ID.disclosureBoundary];
  const consumers = [ID.cardExecutor, ID.unitExecutor, ID.eligibilityExecutor];
  const tests = [ID.sourceTest, ID.mineralTest, ID.vespeneTest, ID.teamTest,
    ID.disclosureTest, ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "army_resource_budget:state_contract")),
    edge(executor, "exposes", ID.choose,
      "army_resource_budget:certified_plan_choice"),
    edge(ID.unitExecutor, "consumed_by", ID.mineralPrices,
      "army_resource_budget:frozen_unit_composition_and_upgrade_price_dependency"),
    edge(ID.cardExecutor, "consumed_by", ID.tacticalPrices,
      "army_resource_budget:frozen_tactical_price_and_slot_dependency"),
    edge(ID.eligibilityExecutor, "consumed_by", ID.slotAudit,
      "army_resource_budget:frozen_slice102_eligibility_slot_dependency"),
    edge(ID.data, "derives", ID.mineralPrices,
      "army_resource_budget:twenty_eight_compositions_and_171_upgrades"),
    edge(ID.data, "derives", ID.tacticalPrices,
      "army_resource_budget:thirty_one_tactical_cards"),
    ...[ID.mineralPrices, ID.slotAudit].map((source) => edge(source, "gates",
      ID.mineralTotal, "army_resource_budget:complete_mineral_arithmetic")),
    ...[ID.tacticalPrices, ID.scale].map((source) => edge(source, "gates",
      ID.vespeneLimit, "army_resource_budget:exact_one_tenth_rational_cap")),
    ...[ID.mineralTotal, ID.vespeneLimit].map((source) => edge(source, "derives",
      ID.lostResources, "army_resource_budget:unused_is_lost")),
    edge(ID.lostResources, "derives", ID.noConversion,
      "army_resource_budget:separate_nonconvertible_resources"),
    edge(ID.players, "derives", ID.teamPartition,
      "army_resource_budget:complete_player_denominator"),
    ...[ID.teamPartition, ID.mineralTotal].map((source) => edge(source, "gates",
      ID.teamAllocation, "army_resource_budget:agreed_team_total_partition")),
    ...[ID.cardExecutor, ID.slotAudit, ID.tacticalPrices].map((source) => edge(source,
      "derives", ID.cardProjection,
      "army_resource_budget:all_faction_and_tactical_cards_face_up")),
    edge(ID.cardProjection, "derives", ID.disclosureBoundary,
      "army_resource_budget:unit_equipment_roster_explicitly_deferred_slice105"),
    edge(ID.choose, "derives", ID.event,
      "army_resource_budget:confirmed_resolution"),
    ...derived.map((source) => edge(source, "derives", ID.event,
      "army_resource_budget:procedure_result")),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "army_resource_budget:rules_owned_commit")),
    edge(ID.data, "verified_by", ID.sourceTest, "army_resource_budget:source_judge"),
    edge(ID.mineralTotal, "verified_by", ID.mineralTest,
      "army_resource_budget:mineral_judge"),
    edge(ID.vespeneLimit, "verified_by", ID.vespeneTest,
      "army_resource_budget:vespene_judge"),
    edge(ID.teamAllocation, "verified_by", ID.teamTest,
      "army_resource_budget:team_judge"),
    edge(ID.cardProjection, "verified_by", ID.disclosureTest,
      "army_resource_budget:disclosure_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "army_resource_budget:authority"),
    edge(executor, "verified_by", ID.graphTest,
      "army_resource_budget:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "army_resource_budget:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official army resource budget data bundle"),
    node(ID.budgets, "state_field", "Army resource budgets by side"),
    node(ID.teamBudget, "state_field", "Agreed team mineral budget partition"),
    node(ID.publicCards, "state_field", "Face-up faction and tactical cards by side"),
    node(ID.pending, "state_field", "Army resource budget pending"),
    node(ID.history, "state_field", "Army resource budget history"),
    node(ID.last, "state_field", "Last army resource budget resolution"),
    node(ID.choose, "action_variant", "Choose certified army resource budget plan"),
    ...derived.map((id) => node(id, "derived_value", id.replace(/^derived_value:/u, ""))),
    node(ID.event, "state_event", "Army resource budget rules resolved"),
    ...tests.map((id) => node(id, "judge_test", id.replace(/^judge_test:/u, ""))),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes,
    ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
  edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:army_resource_budget_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.choose,
      ...derived, ...consumers, ID.event, ...tests])], requiredEdges: edges,
    requiredPaths: [
      { from: ID.unitExecutor, to: ID.budgets,
        relationships: ["consumed_by", "gates", "derives", "writes"], maxDepth: 6 },
      { from: ID.scale, to: ID.lostResources,
        relationships: ["gates", "derives"], maxDepth: 4 },
      { from: ID.players, to: ID.teamBudget,
        relationships: ["derives", "gates", "writes"], maxDepth: 6 },
      { from: ID.cardExecutor, to: ID.publicCards,
        relationships: ["derives", "writes"], maxDepth: 5 },
      { from: ID.eligibilityExecutor, to: ID.budgets,
        relationships: ["consumed_by", "gates", "derives", "writes"], maxDepth: 6 },
    ], forbiddenPaths: [{ from: ID.cardProjection, to: ID.mineralPrices,
      relationships: ["writes"], maxDepth: 3 }], evidenceTestNodeIds: tests,
  }] };
}
