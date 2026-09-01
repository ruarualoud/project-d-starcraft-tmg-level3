import {
  OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID,
  OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_VERSION,
} from "./official-hidden-burrowed-rules-executor-v1.mjs";
import { createOfficialStatusStayInPlayRulesRelationshipExtensionV1 } from
  "./official-status-stay-in-play-rules-relationship-contract-v1.mjs";

export const OFFICIAL_HIDDEN_BURROWED_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-99-hidden-burrowed-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialHiddenBurrowedDataBundle",
  mode: "state_field:rulesProcedureMode",
  round: "state_field:round", phase: "state_field:phase",
  active: "state_field:activeSideKey", players: "state_field:players",
  pieces: "state_field:pieces", models: "state_field:pieces[].models",
  statuses: "state_field:pieces[].statuses",
  supply: "state_field:pieces[].currentSupply",
  board: "state_field:board", pending: "state_field:pendingAction.hiddenBurrowedRules",
  history: "state_field:hiddenBurrowedHistory",
  result: "state_field:lastHiddenBurrowedResolution", log: "state_field:log",
  choose: "action_variant:hiddenBurrowedRulesV1.confirmRulesOwnedTransition",
  lifecycle: "derived_value:hiddenBurrowedRulesV1.statusLifecycle",
  targeting: "derived_value:hiddenBurrowedRulesV1.targetingDistance",
  visibility: "derived_value:hiddenBurrowedRulesV1.visibilityOverride",
  defense: "derived_value:hiddenBurrowedRulesV1.perAttackDefense",
  impact: "derived_value:hiddenBurrowedRulesV1.impactImmunity",
  evade: "derived_value:hiddenBurrowedRulesV1.evadeOpportunity",
  movement: "derived_value:hiddenBurrowedRulesV1.movementPassThrough",
  endpoint: "derived_value:hiddenBurrowedRulesV1.endpointEngagementRestriction",
  combat: "derived_value:hiddenBurrowedRulesV1.combatActivationSequence",
  permissions: "derived_value:hiddenBurrowedRulesV1.characteristicAndActionPermissions",
  event: "state_event:hidden_burrowed_procedure_resolved",
  startRound: "executor:authority.start-of-round-v5@5.0.0",
  move: "executor:authority.standard-move-v5@5.0.0",
  disengage: "executor:authority.disengage-v5@5.0.0",
  run: "executor:authority.assault-run-v1@1.0.0",
  ranged: "executor:authority.ranged-attack-v6@6.0.0",
  closeCombat: "executor:authority.close-combat-attack-v8@8.0.0",
  impactExecutor: "executor:authority.impact-v1@1.0.0",
  terrainLos: "executor:authority.terrain-los-rules-v1@1.0.0",
  mission: "executor:authority.mission-marker-control-v3@3.0.0",
  sourceTest: "judge_test:hidden-burrowed-v1-source",
  lifecycleTest: "judge_test:hidden-burrowed-v1-lifecycle",
  targetingTest: "judge_test:hidden-burrowed-v1-targeting-visibility",
  defenseTest: "judge_test:hidden-burrowed-v1-attack-defense",
  movementTest: "judge_test:hidden-burrowed-v1-movement",
  combatTest: "judge_test:hidden-burrowed-v1-combat",
  authorityTest: "judge_test:hidden-burrowed-v1-authority-replay",
  graphTest: "judge_test:hidden-burrowed-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-99" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_HIDDEN_BURROWED_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialHiddenBurrowedRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("HIDDEN_BURROWED_RELEASE_INVALID");
  }
  const previous = createOfficialStatusStayInPlayRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.mode, ID.round, ID.phase,
    ID.active, ID.players, ID.pieces, ID.models, ID.statuses, ID.supply,
    ID.board, ID.pending, ID.history, ID.result, ID.log];
  const writes = [ID.pieces, ID.statuses, ID.pending, ID.history, ID.result, ID.log];
  const frozenConsumers = [ID.startRound, ID.move, ID.disengage, ID.run, ID.ranged,
    ID.closeCombat, ID.impactExecutor, ID.terrainLos, ID.mission];
  const tests = [ID.sourceTest, ID.lifecycleTest, ID.targetingTest, ID.defenseTest,
    ID.movementTest, ID.combatTest, ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "hidden_burrowed:state_contract")),
    edge(executor, "exposes", ID.choose, "hidden_burrowed:rules_owned_confirmation"),
    edge(ID.statuses, "derives", ID.lifecycle, "hidden_burrowed:status_classification"),
    edge(ID.log, "derives", ID.lifecycle, "hidden_burrowed:hash_bound_trigger"),
    edge(ID.startRound, "consumed_by", ID.lifecycle,
      "hidden_burrowed:frozen_start_round_producer"),
    edge(ID.models, "derives", ID.targeting, "hidden_burrowed:base_edge_distance"),
    edge(ID.statuses, "derives", ID.targeting, "hidden_burrowed:hidden_gate"),
    edge(ID.targeting, "derives", ID.visibility,
      "hidden_burrowed:four_inch_visibility_override"),
    edge(ID.terrainLos, "consumed_by", ID.visibility,
      "hidden_burrowed:frozen_los_consumer"),
    edge(ID.log, "derives", ID.defense, "hidden_burrowed:per_attack_event_hash"),
    edge(ID.statuses, "derives", ID.defense, "hidden_burrowed:hidden_or_burrowed"),
    edge(ID.defense, "derives", ID.impact, "hidden_burrowed:impact_suppression"),
    edge(ID.defense, "derives", ID.evade, "hidden_burrowed:single_evade_opportunity"),
    edge(ID.impact, "gates", ID.impactExecutor,
      "hidden_burrowed:frozen_impact_consumer"),
    edge(ID.evade, "gates", ID.ranged, "hidden_burrowed:frozen_ranged_consumer"),
    edge(ID.evade, "gates", ID.closeCombat,
      "hidden_burrowed:frozen_close_combat_consumer"),
    edge(ID.models, "derives", ID.movement, "hidden_burrowed:path_geometry"),
    edge(ID.statuses, "derives", ID.movement, "hidden_burrowed:pass_through_gate"),
    edge(ID.movement, "derives", ID.endpoint,
      "hidden_burrowed:engagement_range_endpoint"),
    edge(ID.endpoint, "gates", ID.move, "hidden_burrowed:frozen_move_consumer"),
    edge(ID.log, "derives", ID.combat, "hidden_burrowed:combat_start_snapshot"),
    edge(ID.lifecycle, "derives", ID.combat,
      "hidden_burrowed:close_ranks_removes_status"),
    edge(ID.combat, "gates", ID.closeCombat,
      "hidden_burrowed:frozen_combat_consumer"),
    edge(ID.statuses, "derives", ID.permissions,
      "hidden_burrowed:size_supply_action_special_ability"),
    ...[ID.move, ID.disengage, ID.run, ID.closeCombat]
      .map((consumer) => edge(ID.permissions, "gates", consumer,
        "hidden_burrowed:frozen_action_consumer")),
    edge(ID.permissions, "gates", ID.mission,
      "hidden_burrowed:existing_mission_prohibition_consumer"),
    edge(ID.choose, "derives", ID.event, "hidden_burrowed:confirmed_transition"),
    ...[ID.lifecycle, ID.targeting, ID.visibility, ID.defense, ID.impact, ID.evade,
      ID.movement, ID.endpoint, ID.combat, ID.permissions]
      .map((source) => edge(source, "derives", ID.event,
        "hidden_burrowed:procedure_result")),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "hidden_burrowed:transition_commit")),
    edge(ID.data, "verified_by", ID.sourceTest, "hidden_burrowed:source_judge"),
    edge(ID.lifecycle, "verified_by", ID.lifecycleTest,
      "hidden_burrowed:lifecycle_judge"),
    edge(ID.visibility, "verified_by", ID.targetingTest,
      "hidden_burrowed:targeting_judge"),
    edge(ID.defense, "verified_by", ID.defenseTest,
      "hidden_burrowed:defense_judge"),
    edge(ID.endpoint, "verified_by", ID.movementTest,
      "hidden_burrowed:movement_judge"),
    edge(ID.combat, "verified_by", ID.combatTest, "hidden_burrowed:combat_judge"),
    edge(executor, "verified_by", ID.authorityTest, "hidden_burrowed:authority"),
    edge(executor, "verified_by", ID.graphTest, "hidden_burrowed:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "hidden_burrowed:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official Hidden and Burrowed source bundle"),
    node(ID.supply, "state_field", "Per-Unit current Supply"),
    node(ID.board, "state_field", "Battlefield geometry"),
    node(ID.pending, "state_field", "Hidden and Burrowed pending"),
    node(ID.history, "state_field", "Hidden and Burrowed history"),
    node(ID.result, "state_field", "Last Hidden and Burrowed resolution"),
    node(ID.choose, "action_variant", "Confirm Rules-owned Hidden/Burrowed transition"),
    node(ID.lifecycle, "derived_value", "Burrowed and Hidden lifecycle"),
    node(ID.targeting, "derived_value", "Hidden targeting distance"),
    node(ID.visibility, "derived_value", "Hidden visibility override"),
    node(ID.defense, "derived_value", "Per-attack Hidden/Burrowed defense"),
    node(ID.impact, "derived_value", "Hidden IMPACT immunity"),
    node(ID.evade, "derived_value", "One Evade opportunity per targeting attack"),
    node(ID.movement, "derived_value", "Movement through Burrowed models"),
    node(ID.endpoint, "derived_value", "Burrowed endpoint Engagement restriction"),
    node(ID.combat, "derived_value", "Burrowed Combat activation sequence"),
    node(ID.permissions, "derived_value", "Burrowed characteristic/action permissions"),
    node(ID.event, "state_event", "Hidden/Burrowed procedure resolved"),
    ...tests.map((id) => node(id, "judge_test", id.replace(/^judge_test:/u, ""))),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes,
      ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:hidden_burrowed_rules_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_HIDDEN_BURROWED_RULES_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.choose,
        ID.lifecycle, ID.targeting, ID.visibility, ID.defense, ID.impact, ID.evade,
        ID.movement, ID.endpoint, ID.combat, ID.permissions, ...frozenConsumers,
        ID.event, ...tests])],
      requiredEdges: edges,
      requiredPaths: [
        { from: ID.startRound, to: ID.event,
          relationships: ["consumed_by", "derives"], maxDepth: 4 },
        { from: ID.models, to: ID.visibility,
          relationships: ["derives"], maxDepth: 3 },
        { from: ID.log, to: ID.evade,
          relationships: ["derives"], maxDepth: 3 },
        { from: ID.models, to: ID.move,
          relationships: ["derives", "gates"], maxDepth: 4 },
        { from: ID.statuses, to: ID.closeCombat,
          relationships: ["derives", "gates"], maxDepth: 4 },
      ],
      forbiddenPaths: [{ from: ID.targeting, to: ID.statuses,
        relationships: ["writes"], maxDepth: 1 }],
      evidenceTestNodeIds: tests,
    }],
  };
}
