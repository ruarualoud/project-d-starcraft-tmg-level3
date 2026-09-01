import {
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID,
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_VERSION,
} from "./official-unit-composition-upgrade-rules-executor-v1.mjs";
import { createOfficialArmyResourceBudgetRulesRelationshipExtensionV1 } from
  "./official-army-resource-budget-rules-relationship-contract-v1.mjs";

export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-104-unit-composition-upgrade-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialUnitCompositionUpgradeDataBundle",
  mode: "state_field:rulesProcedureMode", round: "state_field:round",
  phase: "state_field:phase", active: "state_field:activeSideKey",
  players: "state_field:players",
  configuration: "state_field:armyBuildingConfigurationBySide",
  budgets: "state_field:armyResourceBudgetsBySide",
  compositions: "state_field:unitCompositionSelectionsBySide",
  upgrades: "state_field:unitUpgradeSelectionsBySide",
  audits: "state_field:armyCompositionUpgradeAuditsBySide",
  pending: "state_field:pendingAction.unitCompositionUpgradeRules",
  history: "state_field:unitCompositionUpgradeRulesHistory",
  last: "state_field:lastUnitCompositionUpgradeRulesResolution",
  log: "state_field:log",
  choose: "action_variant:unitCompositionUpgradeRulesV1.chooseCertifiedPlan",
  compositionDenominator:
    "derived_value:unitCompositionUpgradeV1.twentyEightListedCompositions",
  exactComposition:
    "derived_value:unitCompositionUpgradeV1.exactlyOneComposition",
  exactModels: "derived_value:unitCompositionUpgradeV1.exactStartingModelSet",
  supplySlots: "derived_value:unitCompositionUpgradeV1.startingSupplySlotOccupancy",
  upgradeDenominator:
    "derived_value:unitCompositionUpgradeV1.fiftyTwoPurchasableUpgrades",
  distinctEntries: "derived_value:unitCompositionUpgradeV1.distinctUpgradeEntries",
  unitWide: "derived_value:unitCompositionUpgradeV1.unitWideDefaultApplication",
  specialist: "derived_value:unitCompositionUpgradeV1.specialistModelAssignment",
  resourceAudit: "derived_value:unitCompositionUpgradeV1.slice103ResourceBudget",
  completeAudit: "derived_value:unitCompositionUpgradeV1.completeFieldingAudit",
  sourceConflict:
    "derived_value:unitCompositionUpgradeV1.explicitPart12CurrentDataConflicts",
  disclosureBoundary: "derived_value:unitCompositionUpgradeV1.slice105DisclosureBoundary",
  event: "state_event:unit_composition_upgrade_rules_resolved",
  unitExecutor: "executor:authority.unit-card-supply-rules-v1@1.0.0",
  eligibilityExecutor: "executor:authority.faction-army-eligibility-rules-v1@1.0.0",
  budgetExecutor: "executor:authority.army-resource-budget-rules-v1@1.0.0",
  sourceTest: "judge_test:unit-composition-upgrade-v1-source",
  compositionTest: "judge_test:unit-composition-upgrade-v1-composition",
  upgradeTest: "judge_test:unit-composition-upgrade-v1-upgrade",
  specialistTest: "judge_test:unit-composition-upgrade-v1-specialist",
  auditTest: "judge_test:unit-composition-upgrade-v1-full-army-audit",
  authorityTest: "judge_test:unit-composition-upgrade-v1-authority-replay",
  graphTest: "judge_test:unit-composition-upgrade-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-104" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialUnitCompositionUpgradeRulesRelationshipExtensionV1(
  input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("UNIT_COMPOSITION_UPGRADE_RELEASE_INVALID");
  }
  const previous = createOfficialArmyResourceBudgetRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash });
  const executor = `executor:${OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.mode, ID.round, ID.phase,
    ID.active, ID.players, ID.configuration, ID.budgets, ID.compositions,
    ID.upgrades, ID.audits, ID.pending, ID.history, ID.last, ID.log];
  const writes = [ID.budgets, ID.compositions, ID.upgrades, ID.audits, ID.pending,
    ID.history, ID.last, ID.log];
  const derived = [ID.compositionDenominator, ID.exactComposition, ID.exactModels,
    ID.supplySlots, ID.upgradeDenominator, ID.distinctEntries, ID.unitWide,
    ID.specialist, ID.resourceAudit, ID.completeAudit, ID.sourceConflict,
    ID.disclosureBoundary];
  const consumers = [ID.unitExecutor, ID.eligibilityExecutor, ID.budgetExecutor];
  const tests = [ID.sourceTest, ID.compositionTest, ID.upgradeTest,
    ID.specialistTest, ID.auditTest, ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "unit_composition_upgrade:state_contract")),
    edge(executor, "exposes", ID.choose,
      "unit_composition_upgrade:certified_plan_choice"),
    edge(ID.data, "derives", ID.compositionDenominator,
      "unit_composition_upgrade:twenty_two_units_twenty_eight_options"),
    edge(ID.data, "derives", ID.upgradeDenominator,
      "unit_composition_upgrade:fifty_two_part12_listed_upgrades"),
    edge(ID.data, "derives", ID.sourceConflict,
      "unit_composition_upgrade:two_cost_and_one_link_discrepancies_preserved"),
    edge(ID.unitExecutor, "consumed_by", ID.exactModels,
      "unit_composition_upgrade:frozen_unit_card_model_count_dependency"),
    edge(ID.unitExecutor, "consumed_by", ID.supplySlots,
      "unit_composition_upgrade:frozen_unit_card_supply_dependency"),
    ...[ID.compositionDenominator, ID.exactModels].map((source) => edge(source,
      "gates", ID.exactComposition,
      "unit_composition_upgrade:one_listed_composition_only")),
    edge(ID.exactComposition, "derives", ID.supplySlots,
      "unit_composition_upgrade:starting_supply_equals_slots"),
    edge(ID.upgradeDenominator, "derives", ID.distinctEntries,
      "unit_composition_upgrade:no_repeated_upgrade_entry"),
    edge(ID.distinctEntries, "derives", ID.unitWide,
      "unit_composition_upgrade:unit_wide_default"),
    edge(ID.distinctEntries, "derives", ID.specialist,
      "unit_composition_upgrade:specialist_exception"),
    edge(ID.budgetExecutor, "consumed_by", ID.resourceAudit,
      "unit_composition_upgrade:frozen_slice103_arithmetic_dependency"),
    edge(ID.eligibilityExecutor, "consumed_by", ID.completeAudit,
      "unit_composition_upgrade:frozen_slice102_slot_eligibility_dependency"),
    ...[ID.exactComposition, ID.supplySlots, ID.unitWide, ID.specialist,
      ID.resourceAudit].map((source) => edge(source, "gates", ID.completeAudit,
      "unit_composition_upgrade:complete_fielding_legality")),
    edge(ID.completeAudit, "derives", ID.disclosureBoundary,
      "unit_composition_upgrade:roster_disclosure_deferred_slice105"),
    edge(ID.choose, "derives", ID.event,
      "unit_composition_upgrade:confirmed_resolution"),
    ...derived.map((source) => edge(source, "derives", ID.event,
      "unit_composition_upgrade:procedure_result")),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "unit_composition_upgrade:rules_owned_commit")),
    edge(ID.data, "verified_by", ID.sourceTest,
      "unit_composition_upgrade:source_judge"),
    edge(ID.exactComposition, "verified_by", ID.compositionTest,
      "unit_composition_upgrade:composition_judge"),
    edge(ID.unitWide, "verified_by", ID.upgradeTest,
      "unit_composition_upgrade:upgrade_judge"),
    edge(ID.specialist, "verified_by", ID.specialistTest,
      "unit_composition_upgrade:specialist_judge"),
    edge(ID.completeAudit, "verified_by", ID.auditTest,
      "unit_composition_upgrade:army_audit_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "unit_composition_upgrade:authority"),
    edge(executor, "verified_by", ID.graphTest,
      "unit_composition_upgrade:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "unit_composition_upgrade:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official unit composition and upgrade data bundle"),
    node(ID.compositions, "state_field", "Unit composition selections by side"),
    node(ID.upgrades, "state_field", "Unit upgrade selections by side"),
    node(ID.audits, "state_field", "Complete army composition upgrade audits by side"),
    node(ID.pending, "state_field", "Unit composition upgrade pending"),
    node(ID.history, "state_field", "Unit composition upgrade rules history"),
    node(ID.last, "state_field", "Last unit composition upgrade resolution"),
    node(ID.choose, "action_variant", "Choose certified composition upgrade plan"),
    ...derived.map((id) => node(id, "derived_value", id.replace(/^derived_value:/u, ""))),
    node(ID.event, "state_event", "Unit composition upgrade rules resolved"),
    ...tests.map((id) => node(id, "judge_test", id.replace(/^judge_test:/u, ""))),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes,
    ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
  edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:unit_composition_upgrade_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.choose,
      ...derived, ...consumers, ID.event, ...tests])], requiredEdges: edges,
    requiredPaths: [
      { from: ID.unitExecutor, to: ID.compositions,
        relationships: ["consumed_by", "gates", "derives", "writes"], maxDepth: 7 },
      { from: ID.budgetExecutor, to: ID.audits,
        relationships: ["consumed_by", "gates", "derives", "writes"], maxDepth: 6 },
      { from: ID.eligibilityExecutor, to: ID.budgets,
        relationships: ["consumed_by", "derives", "writes"], maxDepth: 6 },
      { from: ID.upgradeDenominator, to: ID.upgrades,
        relationships: ["derives", "gates", "writes"], maxDepth: 6 },
      { from: ID.specialist, to: ID.audits,
        relationships: ["gates", "derives", "writes"], maxDepth: 5 },
    ], forbiddenPaths: [{ from: ID.disclosureBoundary, to: ID.upgradeDenominator,
      relationships: ["writes"], maxDepth: 3 }], evidenceTestNodeIds: tests,
  }] };
}
