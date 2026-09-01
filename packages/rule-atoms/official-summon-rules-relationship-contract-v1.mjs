import {
  OFFICIAL_SUMMON_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_SUMMON_RULES_EXECUTOR_ID,
  OFFICIAL_SUMMON_RULES_EXECUTOR_VERSION,
} from "./official-summon-rules-executor-v1.mjs";
import { createOfficialHiddenBurrowedRulesRelationshipExtensionV1 } from
  "./official-hidden-burrowed-rules-relationship-contract-v1.mjs";

export const OFFICIAL_SUMMON_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-100-summon-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialSummonDataBundle",
  mission: "state_field:officialMissionSetupBinding",
  mode: "state_field:rulesProcedureMode", round: "state_field:round",
  phase: "state_field:phase", active: "state_field:activeSideKey",
  players: "state_field:players", pieces: "state_field:pieces",
  models: "state_field:pieces[].models", supply: "state_field:pieces[].currentSupply",
  location: "state_field:pieces[].isOnField", reserves: "state_field:pieces[].isInReserves",
  summoned: "state_field:pieces[].summonLifecycle",
  activation: "state_field:pieces[].activatedPhases", board: "state_field:board",
  pending: "state_field:pendingAction.summonRules", history: "state_field:summonRulesHistory",
  last: "state_field:lastSummonRulesResolution", log: "state_field:log",
  choose: "action_variant:summonRulesV1.confirmRulesOwnedTransition",
  classification: "derived_value:summonRulesV1.armyListAndDeploymentClassification",
  supplyCheck: "derived_value:summonRulesV1.availableSupplyCheck",
  geometry: "derived_value:summonRulesV1.placementGeometry",
  parentContact: "derived_value:summonRulesV1.parentBaseContact",
  coherency: "derived_value:summonRulesV1.coherency",
  separation: "derived_value:summonRulesV1.enemySeparation",
  influence: "derived_value:summonRulesV1.opponentZoneOfInfluence",
  deploy: "derived_value:summonRulesV1.specialAbilityDeployment",
  activationRule: "derived_value:summonRulesV1.parentLinkedActivation",
  relationships: "derived_value:summonRulesV1.friendlyReserveScoreSupplyRelationships",
  event: "state_event:summon_rules_resolved",
  unitCard: "executor:authority.unit-card-supply-rules-v1@1.0.0",
  modelBase: "executor:authority.model-base-geometry-rules-v1@1.0.0",
  supplyPool: "executor:authority.supply-pool-rules-v1@1.0.0",
  activationExecutor: "executor:authority.round-phase-activation-rules-v1@1.0.0",
  reserve: "executor:authority.reserve-lifecycle-rules-v1@1.0.0",
  reserveDeploy: "executor:authority.reserve-deploy-v5@5.0.0",
  finalScore: "executor:authority.hold-position-end-game-check-v2@2.0.0",
  sourceTest: "judge_test:summon-v1-source",
  classificationTest: "judge_test:summon-v1-classification",
  supplyTest: "judge_test:summon-v1-supply",
  geometryTest: "judge_test:summon-v1-placement-geometry",
  activationTest: "judge_test:summon-v1-activation",
  relationshipsTest: "judge_test:summon-v1-relationships",
  authorityTest: "judge_test:summon-v1-authority-replay",
  graphTest: "judge_test:summon-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) { return { nodeId, kind, label, provenance: "ticket-11-slice-100" }; }
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_SUMMON_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialSummonRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("SUMMON_RELEASE_INVALID");
  }
  const previous = createOfficialHiddenBurrowedRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_SUMMON_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_SUMMON_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.mission, ID.mode, ID.round,
    ID.phase, ID.active, ID.players, ID.pieces, ID.models, ID.supply, ID.location,
    ID.reserves, ID.summoned, ID.activation, ID.board, ID.pending, ID.history,
    ID.last, ID.log];
  const writes = [ID.pieces, ID.models, ID.location, ID.reserves, ID.summoned,
    ID.activation, ID.pending, ID.history, ID.last, ID.log];
  const frozenConsumers = [ID.unitCard, ID.modelBase, ID.supplyPool,
    ID.activationExecutor, ID.reserve, ID.reserveDeploy, ID.finalScore];
  const tests = [ID.sourceTest, ID.classificationTest, ID.supplyTest,
    ID.geometryTest, ID.activationTest, ID.relationshipsTest, ID.authorityTest,
    ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target, "summon:state_contract")),
    edge(executor, "exposes", ID.choose, "summon:rules_owned_confirmation"),
    edge(ID.data, "derives", ID.classification, "summon:three_current_profiles"),
    edge(ID.unitCard, "consumed_by", ID.classification, "summon:frozen_unit_card_contract"),
    edge(ID.classification, "gates", ID.reserveDeploy, "summon:no_regular_deployment"),
    edge(ID.pieces, "derives", ID.supplyCheck, "summon:complete_on_table_denominator"),
    edge(ID.supply, "derives", ID.supplyCheck, "summon:current_model_count_supply"),
    edge(ID.supplyPool, "consumed_by", ID.supplyCheck, "summon:frozen_supply_contract"),
    edge(ID.models, "derives", ID.geometry, "summon:exact_base_geometry"),
    edge(ID.board, "derives", ID.geometry, "summon:battlefield_and_blockers"),
    edge(ID.modelBase, "consumed_by", ID.geometry, "summon:frozen_geometry_contract"),
    edge(ID.geometry, "derives", ID.parentContact, "summon:leading_model_b2b"),
    edge(ID.geometry, "derives", ID.coherency, "summon:remaining_models_coherent"),
    edge(ID.geometry, "derives", ID.separation, "summon:enemy_engagement_exclusion"),
    edge(ID.mission, "derives", ID.influence, "summon:opponent_entry_edge"),
    edge(ID.geometry, "derives", ID.influence, "summon:whole_base_zone_check"),
    ...[ID.classification, ID.supplyCheck, ID.parentContact, ID.coherency,
      ID.separation, ID.influence].map((source) => edge(source, "gates", ID.deploy,
      "summon:special_ability_transition")),
    edge(ID.log, "derives", ID.deploy, "summon:hash_bound_special_ability_event"),
    edge(ID.deploy, "derives", ID.activationRule, "summon:activation_marker_and_parent_link"),
    edge(ID.log, "derives", ID.activationRule, "summon:parent_activation_end_event"),
    edge(ID.activationRule, "gates", ID.activationExecutor,
      "summon:frozen_activation_consumer"),
    edge(ID.classification, "derives", ID.relationships, "summon:summoned_identity"),
    edge(ID.location, "derives", ID.relationships, "summon:on_field_relationships"),
    edge(ID.supply, "derives", ID.relationships, "summon:total_current_supply"),
    edge(ID.relationships, "gates", ID.reserve, "summon:not_reserve"),
    edge(ID.relationships, "gates", ID.finalScore, "summon:final_score_exclusion"),
    edge(ID.choose, "derives", ID.event, "summon:confirmed_transition"),
    ...[ID.classification, ID.supplyCheck, ID.geometry, ID.parentContact, ID.coherency,
      ID.separation, ID.influence, ID.deploy, ID.activationRule, ID.relationships]
      .map((source) => edge(source, "derives", ID.event, "summon:procedure_result")),
    ...writes.map((target) => edge(ID.event, "writes", target, "summon:transition_commit")),
    edge(ID.data, "verified_by", ID.sourceTest, "summon:source_judge"),
    edge(ID.classification, "verified_by", ID.classificationTest,
      "summon:classification_judge"),
    edge(ID.supplyCheck, "verified_by", ID.supplyTest, "summon:supply_judge"),
    edge(ID.geometry, "verified_by", ID.geometryTest, "summon:geometry_judge"),
    edge(ID.activationRule, "verified_by", ID.activationTest, "summon:activation_judge"),
    edge(ID.relationships, "verified_by", ID.relationshipsTest,
      "summon:relationships_judge"),
    edge(executor, "verified_by", ID.authorityTest, "summon:authority"),
    edge(executor, "verified_by", ID.graphTest, "summon:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose, "summon:stale")),
  ];
  const derived = [ID.classification, ID.supplyCheck, ID.geometry, ID.parentContact,
    ID.coherency, ID.separation, ID.influence, ID.deploy, ID.activationRule,
    ID.relationships];
  const additions = [
    node(ID.data, "state_field", "Official Summon source bundle"),
    node(ID.summoned, "state_field", "Per-Unit Summon lifecycle"),
    node(ID.pending, "state_field", "Summon pending"),
    node(ID.history, "state_field", "Summon history"),
    node(ID.last, "state_field", "Last Summon resolution"),
    node(ID.choose, "action_variant", "Confirm Rules-owned Summon transition"),
    ...derived.map((id) => node(id, "derived_value", id.replace(/^derived_value:/u, ""))),
    node(ID.event, "state_event", "Summon rules resolved"),
    ...tests.map((id) => node(id, "judge_test", id.replace(/^judge_test:/u, ""))),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes,
    ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
  edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_SUMMON_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_SUMMON_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:summon_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_SUMMON_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_SUMMON_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_SUMMON_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.choose,
      ...derived, ...frozenConsumers, ID.event, ...tests])], requiredEdges: edges,
    requiredPaths: [
      { from: ID.data, to: ID.reserveDeploy,
        relationships: ["derives", "gates"], maxDepth: 4 },
      { from: ID.models, to: ID.deploy,
        relationships: ["derives", "gates"], maxDepth: 4 },
      { from: ID.log, to: ID.activationExecutor,
        relationships: ["derives", "gates"], maxDepth: 4 },
      { from: ID.supply, to: ID.finalScore,
        relationships: ["derives", "gates"], maxDepth: 4 },
    ], forbiddenPaths: [{ from: ID.classification, to: ID.pieces,
      relationships: ["writes"], maxDepth: 1 }], evidenceTestNodeIds: tests,
  }] };
}
