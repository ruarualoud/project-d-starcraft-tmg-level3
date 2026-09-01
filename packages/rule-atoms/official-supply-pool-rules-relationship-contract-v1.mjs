import {
  OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID,
  OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_VERSION,
} from "./official-supply-pool-rules-executor-v1.mjs";
import { createOfficialRoundPhaseActivationRulesRelationshipExtensionV1 } from
  "./official-round-phase-activation-rules-relationship-contract-v1.mjs";

export const OFFICIAL_SUPPLY_POOL_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-95-supply-pool-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialSupplyPoolDataBundle",
  unitData: "state_field:officialUnitCardSupplyDataBundle",
  mode: "state_field:rulesProcedureMode", round: "state_field:round",
  phase: "state_field:phase", active: "state_field:activeSideKey",
  players: "state_field:players", pieces: "state_field:pieces",
  currentModels: "state_field:pieces.currentModels",
  pending: "state_field:pendingAction.supplyPoolRules",
  history: "state_field:supplyPoolRulesHistory",
  result: "state_field:lastSupplyPoolRulesResolution",
  log: "state_field:log",
  choose: "action_variant:supplyPoolRulesV1.chooseCertifiedPlan",
  capacity: "derived_value:supplyPoolRulesV1.roundOneMissionCapacity",
  current: "derived_value:supplyPoolRulesV1.currentUnitSupply",
  onTable: "derived_value:supplyPoolRulesV1.onTableSupply",
  available: "derived_value:supplyPoolRulesV1.availableSupply",
  casualty: "derived_value:supplyPoolRulesV1.casualtySupplyRelease",
  deployment: "derived_value:supplyPoolRulesV1.deploymentCardInfluenceZone",
  fielding: "derived_value:supplyPoolRulesV1.reserveFieldingSupplyEligibility",
  event: "state_event:supply_pool_rules_resolved",
  start: "executor:authority.start-of-round-v5@5.0.0",
  reserve: "executor:authority.reserve-deploy-v5@5.0.0",
  disengage: "executor:authority.disengage-v5@5.0.0",
  unitSupply: "executor:authority.unit-card-supply-rules-v1@1.0.0",
  sourceTest: "judge_test:supply-pool-v1-source",
  capacityTest: "judge_test:supply-pool-v1-capacity-available",
  casualtyTest: "judge_test:supply-pool-v1-casualty-release",
  deploymentTest: "judge_test:supply-pool-v1-deployment-reference",
  authorityTest: "judge_test:supply-pool-v1-authority-replay",
  graphTest: "judge_test:supply-pool-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-95" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_SUPPLY_POOL_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialSupplyPoolRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("SUPPLY_POOL_RELEASE_INVALID");
  }
  const previous = createOfficialRoundPhaseActivationRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.unitData, ID.mode,
    ID.round, ID.phase, ID.active, ID.players, ID.pieces, ID.currentModels,
    ID.pending, ID.history, ID.result];
  const consumers = [ID.start, ID.reserve, ID.disengage, ID.unitSupply];
  const tests = [ID.sourceTest, ID.capacityTest, ID.casualtyTest,
    ID.deploymentTest, ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "supply_pool:state_contract")),
    edge(executor, "exposes", ID.choose, "supply_pool:certified_choices"),
    edge(ID.data, "derives", ID.capacity,
      "supply_pool:mission_starting_supply"),
    edge(ID.unitData, "derives", ID.current,
      "supply_pool:official_unit_supply_profile"),
    edge(ID.currentModels, "derives", ID.current,
      "supply_pool:current_model_count_bracket"),
    edge(ID.current, "derives", ID.onTable,
      "supply_pool:friendly_battlefield_units_only"),
    edge(ID.pieces, "derives", ID.onTable,
      "supply_pool:complete_unit_denominator"),
    edge(ID.capacity, "derives", ID.available,
      "supply_pool:capacity_operand"),
    edge(ID.onTable, "derives", ID.available,
      "supply_pool:subtract_on_table_supply"),
    edge(ID.currentModels, "derives", ID.casualty,
      "supply_pool:casualty_model_loss"),
    edge(ID.current, "derives", ID.casualty,
      "supply_pool:supply_tier_delta"),
    edge(ID.casualty, "derives", ID.available,
      "supply_pool:immediate_capacity_release"),
    edge(ID.data, "derives", ID.deployment,
      "supply_pool:official_deployment_card_geometry"),
    edge(ID.available, "derives", ID.fielding,
      "supply_pool:reserve_current_supply_check"),
    edge(ID.current, "derives", ID.fielding,
      "supply_pool:reserve_unit_cost"),
    edge(ID.capacity, "consumed_by", ID.start,
      "supply_pool:frozen_start_of_round_consumer"),
    edge(ID.available, "consumed_by", ID.reserve,
      "supply_pool:frozen_reserve_deploy_consumer"),
    edge(ID.deployment, "consumed_by", ID.reserve,
      "supply_pool:frozen_reserve_zone_consumer"),
    edge(ID.casualty, "consumed_by", ID.disengage,
      "supply_pool:frozen_casualty_consumer"),
    edge(ID.current, "consumed_by", ID.unitSupply,
      "supply_pool:versioned_current_supply_dependency"),
    edge(ID.choose, "derives", ID.event, "supply_pool:confirmed_choice"),
    edge(ID.capacity, "derives", ID.event, "supply_pool:capacity_certificate"),
    edge(ID.available, "derives", ID.event, "supply_pool:available_certificate"),
    edge(ID.casualty, "derives", ID.event, "supply_pool:release_certificate"),
    edge(ID.deployment, "derives", ID.event, "supply_pool:deployment_certificate"),
    edge(ID.event, "writes", ID.pending, "supply_pool:clear_pending"),
    edge(ID.event, "writes", ID.history, "supply_pool:history"),
    edge(ID.event, "writes", ID.result, "supply_pool:last_resolution"),
    edge(ID.event, "writes", ID.log, "supply_pool:log"),
    edge(ID.data, "verified_by", ID.sourceTest, "supply_pool:source_judge"),
    edge(ID.available, "verified_by", ID.capacityTest,
      "supply_pool:capacity_available_judge"),
    edge(ID.casualty, "verified_by", ID.casualtyTest,
      "supply_pool:casualty_judge"),
    edge(ID.deployment, "verified_by", ID.deploymentTest,
      "supply_pool:deployment_judge"),
    edge(executor, "verified_by", ID.authorityTest, "supply_pool:authority"),
    edge(executor, "verified_by", ID.graphTest, "supply_pool:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "supply_pool:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official Supply Pool source bundle"),
    node(ID.pending, "state_field", "Supply Pool rules pending"),
    node(ID.history, "state_field", "Supply Pool rules history"),
    node(ID.result, "state_field", "Last Supply Pool rules resolution"),
    node(ID.choose, "action_variant", "Choose certified Supply Pool plan"),
    node(ID.capacity, "derived_value", "Round-one mission Supply capacity"),
    node(ID.current, "derived_value", "Current Unit Supply"),
    node(ID.onTable, "derived_value", "Friendly on-table Supply usage"),
    node(ID.available, "derived_value", "Available Supply"),
    node(ID.casualty, "derived_value", "Supply freed by casualties"),
    node(ID.deployment, "derived_value", "Deployment-card influence zone"),
    node(ID.fielding, "derived_value", "Reserve fielding Supply eligibility"),
    node(ID.event, "state_event", "Supply Pool rules resolved"),
    node(ID.sourceTest, "judge_test", "Pinned Supply source Judge"),
    node(ID.capacityTest, "judge_test", "Capacity and Available Supply Judge"),
    node(ID.casualtyTest, "judge_test", "Casualty Supply release Judge"),
    node(ID.deploymentTest, "judge_test", "Deployment reference Judge"),
    node(ID.authorityTest, "judge_test", "Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes,
      ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:supply_pool_rules_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_SUPPLY_POOL_RULES_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.log, ID.choose,
        ID.capacity, ID.current, ID.onTable, ID.available, ID.casualty,
        ID.deployment, ID.fielding, ...consumers, ID.event, ...tests])],
      requiredEdges: edges,
      requiredPaths: [
        { from: ID.data, to: ID.event, relationships: ["derives"], maxDepth: 5 },
        { from: ID.currentModels, to: ID.available,
          relationships: ["derives"], maxDepth: 5 },
        { from: ID.currentModels, to: ID.fielding,
          relationships: ["derives"], maxDepth: 5 },
        { from: ID.casualty, to: ID.reserve,
          relationships: ["derives", "consumed_by"], maxDepth: 4 },
        { from: ID.data, to: ID.start,
          relationships: ["derives", "consumed_by"], maxDepth: 4 },
        { from: ID.data, to: ID.reserve,
          relationships: ["derives", "consumed_by"], maxDepth: 6 },
        { from: ID.unitData, to: ID.disengage,
          relationships: ["derives", "consumed_by"], maxDepth: 5 },
        { from: ID.unitData, to: ID.unitSupply,
          relationships: ["derives", "consumed_by"], maxDepth: 4 },
      ],
      forbiddenPaths: [{
        from: ID.available, to: ID.pieces,
        relationships: ["writes"], maxDepth: 4,
      }],
      evidenceTestNodeIds: tests,
    }],
  };
}
