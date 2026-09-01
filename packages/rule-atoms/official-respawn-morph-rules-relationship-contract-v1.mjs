import {
  OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID,
  OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_VERSION,
} from "./official-respawn-morph-rules-executor-v1.mjs";
import { createOfficialSummonRulesRelationshipExtensionV1 } from
  "./official-summon-rules-relationship-contract-v1.mjs";

export const OFFICIAL_RESPAWN_MORPH_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-101-respawn-morph-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialRespawnMorphDataBundle",
  mode: "state_field:rulesProcedureMode", round: "state_field:round",
  phase: "state_field:phase", active: "state_field:activeSideKey",
  players: "state_field:players", pieces: "state_field:pieces",
  models: "state_field:pieces[].models", supply: "state_field:pieces[].currentSupply",
  keywords: "state_field:pieces[].derivedKeywords", board: "state_field:board",
  pending: "state_field:pendingAction.respawnMorphRules",
  history: "state_field:respawnMorphRulesHistory",
  last: "state_field:lastRespawnMorphRulesResolution", log: "state_field:log",
  choose: "action_variant:respawnMorphRulesV1.confirmRulesOwnedTransition",
  carrier: "derived_value:respawnMorphRulesV1.currentCarrierRegistry",
  effect: "derived_value:respawnMorphRulesV1.effectReceipt",
  limit: "derived_value:respawnMorphRulesV1.respawnLimit",
  supplyBracket: "derived_value:respawnMorphRulesV1.supplyBracket",
  geometry: "derived_value:respawnMorphRulesV1.placementGeometry",
  contact: "derived_value:respawnMorphRulesV1.existingModelBaseContact",
  separation: "derived_value:respawnMorphRulesV1.enemyEngagementSeparation",
  mutation: "derived_value:respawnMorphRulesV1.returnedModelMutation",
  morph: "derived_value:respawnMorphRulesV1.morphAvailability",
  destroyedBoundary: "derived_value:respawnMorphRulesV1.destroyedUnitReturnBoundary",
  event: "state_event:respawn_morph_rules_resolved",
  unitCard: "executor:authority.unit-card-supply-rules-v1@1.0.0",
  modelBase: "executor:authority.model-base-geometry-rules-v1@1.0.0",
  status: "executor:authority.status-stay-in-play-rules-v1@1.0.0",
  destruction: "executor:authority.unit-destruction-lifecycle-rules-v1@1.0.0",
  activation: "executor:authority.round-phase-activation-rules-v1@1.0.0",
  sourceTest: "judge_test:respawn-morph-v1-source",
  respawnTest: "judge_test:respawn-morph-v1-respawn",
  supplyTest: "judge_test:respawn-morph-v1-supply",
  geometryTest: "judge_test:respawn-morph-v1-geometry",
  morphTest: "judge_test:respawn-morph-v1-zero-carrier",
  lifecycleTest: "judge_test:respawn-morph-v1-lifecycle",
  authorityTest: "judge_test:respawn-morph-v1-authority-replay",
  graphTest: "judge_test:respawn-morph-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-101" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_RESPAWN_MORPH_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialRespawnMorphRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("RESPAWN_MORPH_RELEASE_INVALID");
  }
  const previous = createOfficialSummonRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.mode, ID.round, ID.phase,
    ID.active, ID.players, ID.pieces, ID.models, ID.supply, ID.keywords, ID.board,
    ID.pending, ID.history, ID.last, ID.log];
  const writes = [ID.pieces, ID.models, ID.supply, ID.pending, ID.history, ID.last, ID.log];
  const consumers = [ID.unitCard, ID.modelBase, ID.status, ID.destruction, ID.activation];
  const derived = [ID.carrier, ID.effect, ID.limit, ID.supplyBracket, ID.geometry,
    ID.contact, ID.separation, ID.mutation, ID.morph, ID.destroyedBoundary];
  const tests = [ID.sourceTest, ID.respawnTest, ID.supplyTest, ID.geometryTest,
    ID.morphTest, ID.lifecycleTest, ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "respawn_morph:state_contract")),
    edge(executor, "exposes", ID.choose, "respawn_morph:rules_owned_confirmation"),
    edge(ID.data, "derives", ID.carrier, "respawn_morph:fixed_current_registry"),
    edge(ID.log, "derives", ID.effect, "respawn_morph:hash_bound_effect_receipt"),
    edge(ID.carrier, "gates", ID.effect, "respawn_morph:exact_carrier_only"),
    edge(ID.keywords, "derives", ID.limit, "respawn_morph:on_creep_two_or_three"),
    edge(ID.effect, "derives", ID.limit, "respawn_morph:printed_values"),
    edge(ID.supply, "derives", ID.supplyBracket, "respawn_morph:before_after_profile"),
    edge(ID.unitCard, "consumed_by", ID.supplyBracket,
      "respawn_morph:frozen_unit_card_supply"),
    edge(ID.models, "derives", ID.geometry, "respawn_morph:complete_model_denominator"),
    edge(ID.board, "derives", ID.geometry, "respawn_morph:board_blockers"),
    edge(ID.modelBase, "consumed_by", ID.geometry,
      "respawn_morph:frozen_exact_base_geometry"),
    edge(ID.geometry, "derives", ID.contact, "respawn_morph:existing_model_contact"),
    edge(ID.geometry, "derives", ID.separation, "respawn_morph:enemy_range_exclusion"),
    ...[ID.effect, ID.limit, ID.supplyBracket, ID.contact, ID.separation]
      .map((source) => edge(source, "gates", ID.mutation,
        "respawn_morph:returned_model_transition")),
    edge(ID.data, "derives", ID.morph, "respawn_morph:zero_current_morph_carriers"),
    edge(ID.destruction, "consumed_by", ID.destroyedBoundary,
      "respawn_morph:frozen_destroyed_unit_default"),
    edge(ID.mutation, "derives", ID.destroyedBoundary,
      "respawn_morph:model_return_not_unit_return"),
    edge(ID.destroyedBoundary, "gates", ID.destruction,
      "respawn_morph:destroyed_unit_default_remains_closed"),
    edge(ID.limit, "consumed_by", ID.status, "respawn_morph:frozen_on_creep_consumer"),
    edge(ID.morph, "gates", ID.activation, "respawn_morph:future_round_activation_lock"),
    edge(ID.choose, "derives", ID.event, "respawn_morph:confirmed_transition"),
    ...derived.map((source) => edge(source, "derives", ID.event,
      "respawn_morph:procedure_result")),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "respawn_morph:transition_commit")),
    edge(ID.data, "verified_by", ID.sourceTest, "respawn_morph:source_judge"),
    edge(ID.mutation, "verified_by", ID.respawnTest, "respawn_morph:respawn_judge"),
    edge(ID.supplyBracket, "verified_by", ID.supplyTest, "respawn_morph:supply_judge"),
    edge(ID.geometry, "verified_by", ID.geometryTest, "respawn_morph:geometry_judge"),
    edge(ID.morph, "verified_by", ID.morphTest, "respawn_morph:morph_judge"),
    edge(ID.destroyedBoundary, "verified_by", ID.lifecycleTest,
      "respawn_morph:lifecycle_judge"),
    edge(executor, "verified_by", ID.authorityTest, "respawn_morph:authority"),
    edge(executor, "verified_by", ID.graphTest, "respawn_morph:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "respawn_morph:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official Respawn/Morph source bundle"),
    node(ID.keywords, "state_field", "Derived Unit keywords"),
    node(ID.pending, "state_field", "Respawn/Morph pending"),
    node(ID.history, "state_field", "Respawn/Morph history"),
    node(ID.last, "state_field", "Last Respawn/Morph resolution"),
    node(ID.choose, "action_variant", "Confirm Rules-owned Respawn/Morph transition"),
    ...derived.map((id) => node(id, "derived_value", id.replace(/^derived_value:/u, ""))),
    node(ID.event, "state_event", "Respawn/Morph rules resolved"),
    ...tests.map((id) => node(id, "judge_test", id.replace(/^judge_test:/u, ""))),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes,
    ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
  edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:respawn_morph_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_RESPAWN_MORPH_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.choose,
      ...derived, ...consumers, ID.event, ...tests])], requiredEdges: edges,
    requiredPaths: [
      { from: ID.data, to: ID.mutation,
        relationships: ["derives", "gates"], maxDepth: 5 },
      { from: ID.supply, to: ID.mutation,
        relationships: ["derives", "gates"], maxDepth: 4 },
      { from: ID.models, to: ID.mutation,
        relationships: ["derives", "gates"], maxDepth: 5 },
      { from: ID.destruction, to: ID.destroyedBoundary,
        relationships: ["consumed_by"], maxDepth: 2 },
    ], forbiddenPaths: [{ from: ID.morph, to: ID.pieces,
      relationships: ["writes"], maxDepth: 1 }], evidenceTestNodeIds: tests,
  }] };
}
