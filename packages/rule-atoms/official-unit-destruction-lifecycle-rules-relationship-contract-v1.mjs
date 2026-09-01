import {
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID,
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_VERSION,
} from "./official-unit-destruction-lifecycle-rules-executor-v1.mjs";
import { createOfficialReserveLifecycleRulesRelationshipExtensionV1 } from
  "./official-reserve-lifecycle-rules-relationship-contract-v1.mjs";

export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-97-unit-destruction-lifecycle-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialUnitDestructionLifecycleDataBundle",
  mode: "state_field:rulesProcedureMode",
  round: "state_field:round", phase: "state_field:phase",
  active: "state_field:activeSideKey", players: "state_field:players",
  pieces: "state_field:pieces", models: "state_field:pieces[].models",
  currentModels: "state_field:pieces.currentModels",
  currentSupply: "state_field:pieces.currentSupply",
  destroyed: "state_field:pieces[].isDestroyed",
  onField: "state_field:pieces[].isOnField",
  inReserves: "state_field:pieces[].isInReserves",
  statuses: "state_field:pieces[].statuses",
  conditions: "state_field:pieces[].conditions",
  effects: "state_field:pieces[].timedEffects",
  abilitiesActive: "state_field:pieces[].abilitiesActive",
  tokens: "state_field:board.tokens",
  markers: "state_field:board.effectMarkers",
  pending: "state_field:pendingAction.unitDestructionLifecycleRules",
  history: "state_field:unitDestructionLifecycleHistory",
  result: "state_field:lastUnitDestructionLifecycleResolution",
  log: "state_field:log",
  choose: "action_variant:unitDestructionLifecycleRulesV1.confirmRulesOwnedTransition",
  condition: "derived_value:unitDestructionLifecycleRulesV1.lastModelFallen",
  localEnd: "derived_value:unitDestructionLifecycleRulesV1.localEffectsEnd",
  tokenCleanup: "derived_value:unitDestructionLifecycleRulesV1.createdTokenCleanup",
  outwardKeep: "derived_value:unitDestructionLifecycleRulesV1.outwardEffectsPreserved",
  explicitEnd: "derived_value:unitDestructionLifecycleRulesV1.explicitOutwardEnd",
  returnGate: "derived_value:unitDestructionLifecycleRulesV1.returnRestriction",
  event: "state_event:unit_destruction_lifecycle_settled",
  casualtyV3: "executor:authority.marine-multi-model-casualty-close-combat-v3@3.0.0",
  casualtyV4: "executor:authority.marine-multi-enemy-casualty-close-combat-v4@4.0.0",
  casualtyV5:
    "executor:authority.marine-multi-enemy-stimpack-casualty-close-combat-v5@5.0.0",
  disengage: "executor:authority.disengage-v2@2.0.0",
  reserve: "executor:authority.reserve-lifecycle-rules-v1@1.0.0",
  futureReturn: "derived_value:unitDestructionLifecycleRulesV1.slice101ReturnRegistry",
  sourceTest: "judge_test:unit-destruction-lifecycle-v1-source",
  conditionTest: "judge_test:unit-destruction-lifecycle-v1-condition",
  cleanupTest: "judge_test:unit-destruction-lifecycle-v1-cleanup",
  outwardTest: "judge_test:unit-destruction-lifecycle-v1-outward-effects",
  returnTest: "judge_test:unit-destruction-lifecycle-v1-return-gate",
  authorityTest: "judge_test:unit-destruction-lifecycle-v1-authority-replay",
  graphTest: "judge_test:unit-destruction-lifecycle-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-97" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialUnitDestructionLifecycleRulesRelationshipExtensionV1(
  input = {},
) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_RELEASE_INVALID");
  }
  const previous = createOfficialReserveLifecycleRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.mode, ID.round, ID.phase,
    ID.active, ID.players, ID.pieces, ID.models, ID.currentModels,
    ID.currentSupply, ID.destroyed, ID.onField, ID.inReserves, ID.statuses,
    ID.conditions, ID.effects, ID.abilitiesActive, ID.tokens, ID.markers,
    ID.pending, ID.history, ID.result, ID.log];
  const writes = [ID.pieces, ID.destroyed, ID.onField, ID.inReserves,
    ID.statuses, ID.conditions, ID.effects, ID.abilitiesActive, ID.tokens,
    ID.markers, ID.pending, ID.history, ID.result, ID.log];
  const consumers = [ID.casualtyV3, ID.casualtyV4, ID.casualtyV5,
    ID.disengage, ID.reserve];
  const tests = [ID.sourceTest, ID.conditionTest, ID.cleanupTest, ID.outwardTest,
    ID.returnTest, ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "unit_destruction_lifecycle:state_contract")),
    edge(executor, "exposes", ID.choose,
      "unit_destruction_lifecycle:rules_owned_confirmation"),
    ...consumers.map((source) => edge(source, "consumed_by", ID.condition,
      "unit_destruction_lifecycle:frozen_destruction_producer")),
    edge(ID.models, "derives", ID.condition,
      "unit_destruction_lifecycle:last_model_fallen"),
    edge(ID.currentModels, "derives", ID.condition,
      "unit_destruction_lifecycle:zero_current_models"),
    edge(ID.currentSupply, "derives", ID.condition,
      "unit_destruction_lifecycle:zero_current_supply"),
    edge(ID.condition, "writes", ID.destroyed,
      "unit_destruction_lifecycle:unit_destroyed"),
    edge(ID.statuses, "derives", ID.localEnd,
      "unit_destruction_lifecycle:local_statuses_end"),
    edge(ID.conditions, "derives", ID.localEnd,
      "unit_destruction_lifecycle:local_conditions_end"),
    edge(ID.effects, "derives", ID.localEnd,
      "unit_destruction_lifecycle:local_effects_end"),
    edge(ID.localEnd, "writes", ID.statuses,
      "unit_destruction_lifecycle:clear_local_statuses"),
    edge(ID.localEnd, "writes", ID.conditions,
      "unit_destruction_lifecycle:clear_local_conditions"),
    edge(ID.localEnd, "writes", ID.effects,
      "unit_destruction_lifecycle:clear_local_effects"),
    edge(ID.localEnd, "writes", ID.abilitiesActive,
      "unit_destruction_lifecycle:disable_destroyed_unit_abilities"),
    edge(ID.tokens, "derives", ID.tokenCleanup,
      "unit_destruction_lifecycle:created_by_destroyed_unit"),
    edge(ID.tokenCleanup, "writes", ID.tokens,
      "unit_destruction_lifecycle:remove_non_stay_in_play"),
    edge(ID.effects, "derives", ID.outwardKeep,
      "unit_destruction_lifecycle:source_applied_to_other_unit"),
    edge(ID.outwardKeep, "derives", ID.explicitEnd,
      "unit_destruction_lifecycle:explicit_source_destroyed_exception"),
    edge(ID.explicitEnd, "writes", ID.effects,
      "unit_destruction_lifecycle:remove_only_explicit_exception"),
    edge(ID.destroyed, "derives", ID.returnGate,
      "unit_destruction_lifecycle:destroyed_unit_default_prohibition"),
    edge(ID.futureReturn, "gates", ID.returnGate,
      "unit_destruction_lifecycle:slice101_versioned_specific_rule_only"),
    edge(ID.choose, "derives", ID.event,
      "unit_destruction_lifecycle:confirmed_transition"),
    edge(ID.condition, "derives", ID.event,
      "unit_destruction_lifecycle:condition_certificate"),
    edge(ID.localEnd, "derives", ID.event,
      "unit_destruction_lifecycle:cleanup_certificate"),
    edge(ID.tokenCleanup, "derives", ID.event,
      "unit_destruction_lifecycle:token_certificate"),
    edge(ID.outwardKeep, "derives", ID.event,
      "unit_destruction_lifecycle:outward_effect_certificate"),
    edge(ID.returnGate, "derives", ID.event,
      "unit_destruction_lifecycle:return_gate_certificate"),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "unit_destruction_lifecycle:transition_commit")),
    edge(ID.data, "verified_by", ID.sourceTest,
      "unit_destruction_lifecycle:source_judge"),
    edge(ID.condition, "verified_by", ID.conditionTest,
      "unit_destruction_lifecycle:condition_judge"),
    edge(ID.localEnd, "verified_by", ID.cleanupTest,
      "unit_destruction_lifecycle:cleanup_judge"),
    edge(ID.outwardKeep, "verified_by", ID.outwardTest,
      "unit_destruction_lifecycle:outward_judge"),
    edge(ID.returnGate, "verified_by", ID.returnTest,
      "unit_destruction_lifecycle:return_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "unit_destruction_lifecycle:authority"),
    edge(executor, "verified_by", ID.graphTest,
      "unit_destruction_lifecycle:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "unit_destruction_lifecycle:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official Unit destruction lifecycle source bundle"),
    node(ID.statuses, "state_field", "Per-Unit statuses"),
    node(ID.conditions, "state_field", "Per-Unit conditions"),
    node(ID.effects, "state_field", "Per-Unit timed effects"),
    node(ID.abilitiesActive, "state_field", "Per-Unit ability activity"),
    node(ID.pending, "state_field", "Unit destruction lifecycle pending"),
    node(ID.history, "state_field", "Unit destruction lifecycle history"),
    node(ID.result, "state_field", "Last Unit destruction lifecycle resolution"),
    node(ID.choose, "action_variant", "Confirm Rules-owned destruction transition"),
    node(ID.condition, "derived_value", "Last model fallen Unit destroyed condition"),
    node(ID.localEnd, "derived_value", "Destroyed Unit local effects end"),
    node(ID.tokenCleanup, "derived_value", "Destroyed Unit created Token cleanup"),
    node(ID.outwardKeep, "derived_value", "Destroyed Unit outward effects preserved"),
    node(ID.explicitEnd, "derived_value", "Explicit outward effect end exception"),
    node(ID.returnGate, "derived_value", "Destroyed Unit return restriction"),
    node(ID.futureReturn, "derived_value", "Slice 101 specific return-rule registry"),
    node(ID.event, "state_event", "Unit destruction lifecycle settled"),
    node(ID.sourceTest, "judge_test", "Pinned destruction source Judge"),
    node(ID.conditionTest, "judge_test", "Last-model condition Judge"),
    node(ID.cleanupTest, "judge_test", "Local cleanup Judge"),
    node(ID.outwardTest, "judge_test", "Outward-effect Judge"),
    node(ID.returnTest, "judge_test", "Return restriction Judge"),
    node(ID.authorityTest, "judge_test", "Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes,
      ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:unit_destruction_lifecycle_rules_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.choose,
        ID.condition, ID.localEnd, ID.tokenCleanup, ID.outwardKeep,
        ID.explicitEnd, ID.returnGate, ID.futureReturn, ...consumers,
        ID.event, ...tests])],
      requiredEdges: edges,
      requiredPaths: [
        { from: ID.models, to: ID.event,
          relationships: ["derives"], maxDepth: 5 },
        { from: ID.statuses, to: ID.event,
          relationships: ["derives"], maxDepth: 5 },
        { from: ID.tokens, to: ID.event,
          relationships: ["derives"], maxDepth: 5 },
        { from: ID.casualtyV3, to: ID.destroyed,
          relationships: ["consumed_by", "writes"], maxDepth: 5 },
        { from: ID.destroyed, to: ID.event,
          relationships: ["derives"], maxDepth: 5 },
      ],
      forbiddenPaths: [{ from: ID.outwardKeep, to: ID.effects,
        relationships: ["writes"], maxDepth: 1 }],
      evidenceTestNodeIds: tests,
    }],
  };
}
