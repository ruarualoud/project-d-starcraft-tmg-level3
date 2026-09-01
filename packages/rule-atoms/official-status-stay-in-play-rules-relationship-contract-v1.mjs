import {
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID,
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_VERSION,
} from "./official-status-stay-in-play-rules-executor-v1.mjs";
import { createOfficialUnitDestructionLifecycleRulesRelationshipExtensionV1 } from
  "./official-unit-destruction-lifecycle-rules-relationship-contract-v1.mjs";

export const OFFICIAL_STATUS_STAY_IN_PLAY_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-98-status-stay-in-play-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialStatusStayInPlayDataBundle",
  mode: "state_field:rulesProcedureMode",
  round: "state_field:round", phase: "state_field:phase",
  active: "state_field:activeSideKey", players: "state_field:players",
  pieces: "state_field:pieces", models: "state_field:pieces[].models",
  onField: "state_field:pieces[].isOnField",
  reserves: "state_field:pieces[].isInReserves",
  destroyed: "state_field:pieces[].isDestroyed",
  unitRecord: "state_field:pieces[].officialUnitRecordKey",
  statuses: "state_field:pieces[].statuses",
  keywords: "state_field:pieces[].derivedKeywords",
  abilityEffects: "state_field:pieces[].abilityEffects",
  combatEffects: "state_field:pieces[].combatEffects",
  assaultEffects: "state_field:pieces[].assaultEffects",
  timedEffects: "state_field:pieces[].timedEffects",
  siegeProfiles: "state_field:pieces[].siegeModeProfileSet",
  tokens: "state_field:board.tokens",
  markers: "state_field:board.effectMarkers",
  pending: "state_field:pendingAction.statusStayInPlayRules",
  history: "state_field:statusStayInPlayHistory",
  result: "state_field:lastStatusStayInPlayResolution",
  log: "state_field:log",
  choose: "action_variant:statusStayInPlayRulesV1.confirmRulesOwnedTransition",
  cleanup: "derived_value:statusStayInPlayRulesV1.cleanupPersistence",
  stay: "derived_value:statusStayInPlayRulesV1.stayInPlayClassification",
  shieldLoss: "derived_value:statusStayInPlayRulesV1.shieldLossWitness",
  shieldEnd: "derived_value:statusStayInPlayRulesV1.shieldDependentEffectsEnd",
  shieldKeep: "derived_value:statusStayInPlayRulesV1.nonDependentEffectsPreserved",
  siege: "derived_value:statusStayInPlayRulesV1.siegeModeConstraints",
  siegeReserve: "derived_value:statusStayInPlayRulesV1.siegeReserveRemoval",
  creepGeometry: "derived_value:statusStayInPlayRulesV1.onCreepGeometry",
  creepKeyword: "derived_value:statusStayInPlayRulesV1.onCreepKeyword",
  tumorGap: "derived_value:statusStayInPlayRulesV1.creepTumorGeometryGap",
  event: "state_event:status_stay_in_play_procedure_resolved",
  cleanupV5: "executor:authority.cleanup-refresh-v5@5.0.0",
  shieldedV2: "executor:authority.combat-tag-shielded-ranged-v2@2.0.0",
  reserveV1: "executor:authority.reserve-lifecycle-rules-v1@1.0.0",
  moveV5: "executor:authority.standard-move-v5@5.0.0",
  disengageV5: "executor:authority.disengage-v5@5.0.0",
  runV1: "executor:authority.assault-run-v1@1.0.0",
  chargeV2: "executor:authority.marine-charge-v2@2.0.0",
  closeRanksV8: "executor:authority.close-combat-attack-v8@8.0.0",
  sourceTest: "judge_test:status-stay-in-play-v1-source",
  cleanupTest: "judge_test:status-stay-in-play-v1-cleanup",
  shieldTest: "judge_test:status-stay-in-play-v1-shielded-dependency",
  siegeTest: "judge_test:status-stay-in-play-v1-siege",
  creepTest: "judge_test:status-stay-in-play-v1-on-creep",
  authorityTest: "judge_test:status-stay-in-play-v1-authority-replay",
  graphTest: "judge_test:status-stay-in-play-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-98" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialStatusStayInPlayRulesRelationshipExtensionV1(
  input = {},
) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("STATUS_STAY_IN_PLAY_RELEASE_INVALID");
  }
  const previous = createOfficialUnitDestructionLifecycleRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.mode, ID.round, ID.phase,
    ID.active, ID.players, ID.pieces, ID.models, ID.onField, ID.reserves,
    ID.destroyed, ID.unitRecord, ID.statuses, ID.keywords, ID.abilityEffects,
    ID.combatEffects, ID.assaultEffects, ID.timedEffects, ID.siegeProfiles,
    ID.tokens, ID.markers, ID.pending, ID.history, ID.result, ID.log];
  const writes = [ID.pieces, ID.statuses, ID.keywords, ID.abilityEffects,
    ID.combatEffects, ID.assaultEffects, ID.timedEffects, ID.tokens, ID.markers,
    ID.pending, ID.history, ID.result, ID.log];
  const frozenConsumers = [ID.cleanupV5, ID.shieldedV2, ID.reserveV1,
    ID.moveV5, ID.disengageV5, ID.runV1, ID.chargeV2, ID.closeRanksV8];
  const tests = [ID.sourceTest, ID.cleanupTest, ID.shieldTest, ID.siegeTest,
    ID.creepTest, ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "status_stay_in_play:state_contract")),
    edge(executor, "exposes", ID.choose,
      "status_stay_in_play:rules_owned_confirmation"),
    edge(ID.statuses, "derives", ID.cleanup,
      "status_stay_in_play:default_cleanup_persistence"),
    edge(ID.abilityEffects, "derives", ID.stay,
      "status_stay_in_play:ability_effect_classification"),
    edge(ID.tokens, "derives", ID.stay,
      "status_stay_in_play:token_classification"),
    edge(ID.markers, "derives", ID.stay,
      "status_stay_in_play:status_marker_classification"),
    edge(ID.stay, "derives", ID.cleanup,
      "status_stay_in_play:specific_removal_condition_only"),
    edge(ID.cleanupV5, "consumed_by", ID.cleanup,
      "status_stay_in_play:frozen_cleanup_consumer"),
    edge(ID.shieldedV2, "consumed_by", ID.shieldLoss,
      "status_stay_in_play:frozen_shield_loss_producer"),
    edge(ID.log, "derives", ID.shieldLoss,
      "status_stay_in_play:hash_bound_shield_loss_event"),
    edge(ID.shieldLoss, "derives", ID.shieldEnd,
      "status_stay_in_play:required_status_ended"),
    edge(ID.abilityEffects, "derives", ID.shieldEnd,
      "status_stay_in_play:shielded_dependency_filter"),
    edge(ID.combatEffects, "derives", ID.shieldEnd,
      "status_stay_in_play:shielded_dependency_filter"),
    edge(ID.assaultEffects, "derives", ID.shieldEnd,
      "status_stay_in_play:shielded_dependency_filter"),
    edge(ID.timedEffects, "derives", ID.shieldEnd,
      "status_stay_in_play:shielded_dependency_filter"),
    edge(ID.shieldEnd, "derives", ID.shieldKeep,
      "status_stay_in_play:nondependent_effects_preserved"),
    edge(ID.statuses, "derives", ID.siege,
      "status_stay_in_play:siege_status_gate"),
    edge(ID.siegeProfiles, "derives", ID.siege,
      "status_stay_in_play:siege_weapon_exclusivity"),
    ...[ID.moveV5, ID.disengageV5, ID.runV1, ID.chargeV2, ID.closeRanksV8]
      .map((consumer) => edge(ID.siege, "gates", consumer,
        "status_stay_in_play:frozen_action_consumer")),
    edge(ID.reserveV1, "consumed_by", ID.siegeReserve,
      "status_stay_in_play:frozen_reserve_producer"),
    edge(ID.reserves, "derives", ID.siegeReserve,
      "status_stay_in_play:reserve_status_removal"),
    edge(ID.statuses, "derives", ID.siegeReserve,
      "status_stay_in_play:siege_status_removal"),
    edge(ID.models, "derives", ID.creepGeometry,
      "status_stay_in_play:nearest_base_geometry"),
    edge(ID.unitRecord, "derives", ID.creepGeometry,
      "status_stay_in_play:ground_zerg_and_source_identity"),
    edge(ID.tokens, "derives", ID.tumorGap,
      "status_stay_in_play:creep_tumor_geometry_unavailable"),
    edge(ID.tumorGap, "gates", ID.creepGeometry,
      "status_stay_in_play:fail_closed_without_token_geometry"),
    edge(ID.creepGeometry, "derives", ID.creepKeyword,
      "status_stay_in_play:within_six_inch_condition"),
    edge(ID.creepKeyword, "writes", ID.keywords,
      "status_stay_in_play:dynamic_keyword_projection"),
    edge(ID.choose, "derives", ID.event,
      "status_stay_in_play:confirmed_transition"),
    ...[ID.cleanup, ID.shieldEnd, ID.siege, ID.siegeReserve, ID.creepKeyword]
      .map((source) => edge(source, "derives", ID.event,
        "status_stay_in_play:procedure_result")),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "status_stay_in_play:transition_commit")),
    edge(ID.data, "verified_by", ID.sourceTest,
      "status_stay_in_play:source_judge"),
    edge(ID.cleanup, "verified_by", ID.cleanupTest,
      "status_stay_in_play:cleanup_judge"),
    edge(ID.shieldEnd, "verified_by", ID.shieldTest,
      "status_stay_in_play:shielded_judge"),
    edge(ID.siege, "verified_by", ID.siegeTest,
      "status_stay_in_play:siege_judge"),
    edge(ID.creepKeyword, "verified_by", ID.creepTest,
      "status_stay_in_play:on_creep_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "status_stay_in_play:authority"),
    edge(executor, "verified_by", ID.graphTest,
      "status_stay_in_play:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "status_stay_in_play:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official Status and STAY IN PLAY source bundle"),
    node(ID.unitRecord, "state_field", "Per-Unit official record identity"),
    node(ID.keywords, "state_field", "Per-Unit dynamically derived keywords"),
    node(ID.abilityEffects, "state_field", "Per-Unit ability effects"),
    node(ID.siegeProfiles, "state_field", "Rules-owned Siege profile set"),
    node(ID.pending, "state_field", "Status and STAY IN PLAY pending"),
    node(ID.history, "state_field", "Status and STAY IN PLAY history"),
    node(ID.result, "state_field", "Last Status and STAY IN PLAY resolution"),
    node(ID.choose, "action_variant", "Confirm Rules-owned Status transition"),
    node(ID.cleanup, "derived_value", "Default Status cleanup persistence"),
    node(ID.stay, "derived_value", "STAY IN PLAY Token Marker or Ability Effect"),
    node(ID.shieldLoss, "derived_value", "Hash-bound Shielded loss witness"),
    node(ID.shieldEnd, "derived_value", "Shielded-dependent effects end"),
    node(ID.shieldKeep, "derived_value", "Non-dependent effects preserved"),
    node(ID.siege, "derived_value", "Siege action and weapon constraints"),
    node(ID.siegeReserve, "derived_value", "Siege status removed in Reserves"),
    node(ID.creepGeometry, "derived_value", "On Creep nearest-base geometry"),
    node(ID.creepKeyword, "derived_value", "Dynamic ON CREEP keyword"),
    node(ID.tumorGap, "derived_value", "Creep Tumor physical geometry gap"),
    node(ID.event, "state_event", "Status and STAY IN PLAY procedure resolved"),
    ...tests.map((id) => node(id, "judge_test", id.replace(/^judge_test:/u, ""))),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes,
      ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:status_stay_in_play_rules_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.choose,
        ID.cleanup, ID.stay, ID.shieldLoss, ID.shieldEnd, ID.shieldKeep,
        ID.siege, ID.siegeReserve, ID.creepGeometry, ID.creepKeyword,
        ID.tumorGap, ...frozenConsumers, ID.event, ...tests])],
      requiredEdges: edges,
      requiredPaths: [
        { from: ID.statuses, to: ID.event,
          relationships: ["derives"], maxDepth: 5 },
        { from: ID.shieldedV2, to: ID.event,
          relationships: ["consumed_by", "derives"], maxDepth: 5 },
        { from: ID.reserveV1, to: ID.event,
          relationships: ["consumed_by", "derives"], maxDepth: 5 },
        { from: ID.models, to: ID.keywords,
          relationships: ["derives", "writes"], maxDepth: 5 },
        { from: ID.siege, to: ID.moveV5,
          relationships: ["gates"], maxDepth: 1 },
      ],
      forbiddenPaths: [{ from: ID.shieldKeep, to: ID.abilityEffects,
        relationships: ["writes"], maxDepth: 1 }],
      evidenceTestNodeIds: tests,
    }],
  };
}
