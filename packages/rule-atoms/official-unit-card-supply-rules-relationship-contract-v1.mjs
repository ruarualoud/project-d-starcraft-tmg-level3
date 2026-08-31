import {
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_ID,
  OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_VERSION,
} from "./official-unit-card-supply-rules-executor-v1.mjs";
import { createOfficialCardBuildPaymentRulesRelationshipExtensionV1 } from
  "./official-card-build-payment-rules-relationship-contract-v1.mjs";

export const OFFICIAL_UNIT_CARD_SUPPLY_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-93-unit-card-supply-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  unitData: "state_field:officialUnitCardSupplyDataBundle",
  mode: "state_field:rulesProcedureMode", activeSide: "state_field:activeSideKey",
  players: "state_field:players", pieces: "state_field:pieces",
  currentModels: "state_field:pieces.currentModels",
  currentSupply: "state_field:pieces.currentSupply",
  pending: "state_field:pendingAction.unitCardSupplyRules",
  history: "state_field:unitCardSupplyRulesHistory",
  result: "state_field:lastUnitCardSupplyRulesResolution", log: "state_field:log",
  choose: "action_variant:unitCardSupplyRulesV1.chooseCertifiedPlan",
  profile: "derived_value:unitCardSupplyV1.exactOfficialUnitProfile",
  layout: "derived_value:unitCardSupplyV1.rulesOwnedUnitCardLayout",
  mobility: "derived_value:unitCardSupplyV1.nullSpeedMobilityGate",
  tier: "derived_value:unitCardSupplyV1.currentModelCountTier",
  supply: "derived_value:unitCardSupplyV1.currentSupplyValue",
  composition: "derived_value:unitCardSupplyV1.startingComposition",
  slots: "derived_value:unitCardSupplyV1.startingArmySlotRequirement",
  deployment: "semantic_consumer:currentSupply.deployment",
  control: "semantic_consumer:currentSupply.missionMarkerControl",
  mass: "semantic_consumer:currentSupply.tacticalMass",
  scoring: "semantic_consumer:currentSupply.scoring",
  event: "state_event:unit_card_supply_rules_resolved",
  sourceTest: "judge_test:unit-card-supply-v1-source",
  layoutTest: "judge_test:unit-card-supply-v1-layout",
  speedTest: "judge_test:unit-card-supply-v1-null-speed",
  supplyTest: "judge_test:unit-card-supply-v1-current-model-count",
  slotsTest: "judge_test:unit-card-supply-v1-starting-slots",
  authorityTest: "judge_test:unit-card-supply-v1-authority-replay",
  graphTest: "judge_test:unit-card-supply-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-93" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_UNIT_CARD_SUPPLY_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialUnitCardSupplyRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("UNIT_CARD_SUPPLY_RELEASE_INVALID");
  }
  const previous = createOfficialCardBuildPaymentRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash });
  const executor = `executor:${OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.unitData, ID.mode, ID.activeSide,
    ID.players, ID.pieces, ID.currentModels, ID.currentSupply,
    ID.pending, ID.history, ID.result];
  const supplyConsumers = [ID.deployment, ID.control, ID.mass, ID.scoring];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "unit_card_supply:state_contract")),
    edge(executor, "exposes", ID.choose, "unit_card_supply:certified_choices"),
    edge(ID.unitData, "derives", ID.profile, "unit_card_supply:exact_source_profile"),
    edge(ID.profile, "derives", ID.layout, "unit_card_supply:rules_owned_fields"),
    edge(ID.profile, "derives", ID.mobility, "unit_card_supply:null_speed_gate"),
    edge(ID.currentModels, "derives", ID.tier, "unit_card_supply:current_count_bracket"),
    edge(ID.profile, "derives", ID.tier, "unit_card_supply:supply_profile"),
    edge(ID.tier, "derives", ID.supply, "unit_card_supply:exact_supply_value"),
    edge(ID.profile, "derives", ID.composition,
      "unit_card_supply:official_starting_composition"),
    edge(ID.composition, "derives", ID.slots,
      "unit_card_supply:starting_supply_equals_slot_count"),
    ...supplyConsumers.map((target) => edge(ID.supply, "consumed_by", target,
      "unit_card_supply:declared_supply_use")),
    ...[ID.layout, ID.mobility, ID.supply, ID.slots].map((source) => edge(source,
      "derives", ID.event, "unit_card_supply:certified_resolution")),
    edge(ID.choose, "derives", ID.event, "unit_card_supply:confirmed_choice"),
    edge(ID.event, "writes", ID.pending, "unit_card_supply:clear_pending"),
    edge(ID.event, "writes", ID.history, "unit_card_supply:history"),
    edge(ID.event, "writes", ID.result, "unit_card_supply:last_resolution"),
    edge(ID.event, "writes", ID.log, "unit_card_supply:log"),
    edge(ID.unitData, "verified_by", ID.sourceTest, "unit_card_supply:source_judge"),
    edge(ID.layout, "verified_by", ID.layoutTest, "unit_card_supply:layout_judge"),
    edge(ID.mobility, "verified_by", ID.speedTest, "unit_card_supply:null_speed_judge"),
    edge(ID.supply, "verified_by", ID.supplyTest, "unit_card_supply:supply_judge"),
    edge(ID.slots, "verified_by", ID.slotsTest, "unit_card_supply:slots_judge"),
    edge(executor, "verified_by", ID.authorityTest, "unit_card_supply:authority"),
    edge(executor, "verified_by", ID.graphTest, "unit_card_supply:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "unit_card_supply:stale")),
  ];
  const additions = [
    node(ID.unitData, "state_field", "Official Unit-card and Supply source bundle"),
    node(ID.currentModels, "state_field", "Current models in Unit"),
    node(ID.currentSupply, "state_field", "Stored current Supply value"),
    node(ID.pending, "state_field", "Unit-card and Supply pending"),
    node(ID.history, "state_field", "Unit-card and Supply history"),
    node(ID.result, "state_field", "Last Unit-card and Supply resolution"),
    node(ID.choose, "action_variant", "Choose certified Unit-card or Supply plan"),
    node(ID.profile, "derived_value", "Exact official Unit profile"),
    node(ID.layout, "derived_value", "Rules-owned Unit-card fields"),
    node(ID.mobility, "derived_value", "Null-Speed movement and reposition gate"),
    node(ID.tier, "derived_value", "Supply tier for current model count"),
    node(ID.supply, "derived_value", "Current Supply value"),
    node(ID.composition, "derived_value", "Official starting composition"),
    node(ID.slots, "derived_value", "Starting Army Slot requirement"),
    node(ID.deployment, "semantic_projection", "Deployment Supply consumer"),
    node(ID.control, "semantic_projection", "Mission Marker control Supply consumer"),
    node(ID.mass, "semantic_projection", "Tactical Mass Supply consumer"),
    node(ID.scoring, "semantic_projection", "Scoring Supply consumer"),
    node(ID.event, "state_event", "Unit-card or Supply rules resolved"),
    node(ID.sourceTest, "judge_test", "Pinned Unit source Judge"),
    node(ID.layoutTest, "judge_test", "Unit-card layout Judge"),
    node(ID.speedTest, "judge_test", "Null-Speed Judge"),
    node(ID.supplyTest, "judge_test", "Current-model-count Supply Judge"),
    node(ID.slotsTest, "judge_test", "Starting Supply and slots Judge"),
    node(ID.authorityTest, "judge_test", "Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes,
    ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
  edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:unit_card_supply_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_UNIT_CARD_SUPPLY_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_UNIT_CARD_SUPPLY_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ID.log, ID.choose, ID.profile,
      ID.layout, ID.mobility, ID.tier, ID.supply, ID.composition, ID.slots,
      ...supplyConsumers, ID.event, ID.sourceTest, ID.layoutTest, ID.speedTest,
      ID.supplyTest, ID.slotsTest, ID.authorityTest, ID.graphTest])],
    requiredEdges: edges,
    requiredPaths: [
      { from: ID.unitData, to: ID.event, relationships: ["derives"], maxDepth: 6 },
      { from: ID.currentModels, to: ID.event, relationships: ["derives"], maxDepth: 5 },
      { from: ID.composition, to: ID.event, relationships: ["derives"], maxDepth: 4 },
      ...supplyConsumers.map((target) => ({ from: ID.currentModels, to: target,
        relationships: ["derives", "consumed_by"], maxDepth: 5 })),
    ],
    forbiddenPaths: [{ from: ID.currentModels, to: ID.layout,
      relationships: ["writes"], maxDepth: 4 }],
    evidenceTestNodeIds: [ID.sourceTest, ID.layoutTest, ID.speedTest, ID.supplyTest,
      ID.slotsTest, ID.authorityTest, ID.graphTest],
  }] };
}
