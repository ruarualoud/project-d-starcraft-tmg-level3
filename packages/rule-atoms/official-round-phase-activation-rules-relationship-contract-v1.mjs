import {
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID,
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_VERSION,
} from "./official-round-phase-activation-rules-executor-v1.mjs";
import { createOfficialUnitCardSupplyRulesRelationshipExtensionV1 } from
  "./official-unit-card-supply-rules-relationship-contract-v1.mjs";

export const OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-94-round-phase-activation-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialRoundPhaseActivationDataBundle",
  mode: "state_field:rulesProcedureMode", round: "state_field:round",
  phase: "state_field:phase", active: "state_field:activeSideKey",
  first: "state_field:firstPlayerSideKey", players: "state_field:players",
  pieces: "state_field:pieces",
  pending: "state_field:pendingAction.roundPhaseActivationRules",
  history: "state_field:roundPhaseActivationRulesHistory",
  result: "state_field:lastRoundPhaseActivationRulesResolution",
  log: "state_field:log",
  choose: "action_variant:roundPhaseActivationRulesV1.chooseCertifiedPlan",
  sequence: "derived_value:roundPhaseActivationV1.strictRoundPhaseSequence",
  limit: "derived_value:roundPhaseActivationV1.maximumRound",
  menu: "derived_value:roundPhaseActivationV1.phaseActionMenu",
  actionCount: "derived_value:roundPhaseActivationV1.onePhaseAction",
  nextTurn: "derived_value:roundPhaseActivationV1.nextActivationTurn",
  event: "state_event:round_phase_activation_rules_resolved",
  movementHold: "executor:authority.movement-hold-v1@1.0.0",
  assaultHold: "executor:authority.assault-hold-v2@2.0.0",
  activationPass: "executor:authority.activation-pass-v1@1.0.0",
  phaseInitiative: "executor:authority.phase-initiative-v1@1.0.0",
  reserveDeploy: "executor:authority.reserve-deploy-v5@5.0.0",
  standardMove: "executor:authority.standard-move-v5@5.0.0",
  disengage: "executor:authority.disengage-v5@5.0.0",
  ranged: "executor:authority.ranged-attack-v6@6.0.0",
  combatPass: "executor:authority.combat-pass-v3@3.0.0",
  sourceTest: "judge_test:round-phase-activation-v1-source",
  sequenceTest: "judge_test:round-phase-activation-v1-sequence",
  menuTest: "judge_test:round-phase-activation-v1-menu",
  alternationTest: "judge_test:round-phase-activation-v1-alternation",
  authorityTest: "judge_test:round-phase-activation-v1-authority-replay",
  graphTest: "judge_test:round-phase-activation-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-94" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialRoundPhaseActivationRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("ROUND_PHASE_ACTIVATION_RELEASE_INVALID");
  }
  const previous = createOfficialUnitCardSupplyRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash });
  const executor = `executor:${OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.mode, ID.round, ID.phase,
    ID.active, ID.first, ID.players, ID.pieces, ID.pending, ID.history, ID.result];
  const consumers = [ID.movementHold, ID.assaultHold, ID.activationPass,
    ID.phaseInitiative, ID.reserveDeploy, ID.standardMove, ID.disengage,
    ID.ranged, ID.combatPass];
  const tests = [ID.sourceTest, ID.sequenceTest, ID.menuTest, ID.alternationTest,
    ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "round_phase_activation:state_contract")),
    edge(executor, "exposes", ID.choose,
      "round_phase_activation:certified_choices"),
    edge(ID.data, "derives", ID.sequence,
      "round_phase_activation:strict_four_phase_order"),
    edge(ID.data, "derives", ID.limit,
      "round_phase_activation:maximum_five_rounds"),
    edge(ID.sequence, "derives", ID.menu,
      "round_phase_activation:phase_action_classes"),
    edge(ID.phase, "derives", ID.menu,
      "round_phase_activation:current_phase_class"),
    edge(ID.pieces, "derives", ID.actionCount,
      "round_phase_activation:one_unit_one_action_receipt"),
    edge(ID.menu, "derives", ID.actionCount,
      "round_phase_activation:action_must_belong_to_phase"),
    edge(ID.active, "derives", ID.nextTurn,
      "round_phase_activation:active_side"),
    edge(ID.players, "derives", ID.nextTurn,
      "round_phase_activation:pass_state"),
    edge(ID.actionCount, "derives", ID.nextTurn,
      "round_phase_activation:completed_activation"),
    ...consumers.map((target) => edge(ID.sequence, "consumed_by", target,
      "round_phase_activation:frozen_atomic_consumer")),
    ...consumers.map((target) => edge(ID.nextTurn, "consumed_by", target,
      "round_phase_activation:frozen_alternation_consumer")),
    edge(ID.choose, "derives", ID.event,
      "round_phase_activation:confirmed_choice"),
    edge(ID.sequence, "derives", ID.event,
      "round_phase_activation:sequence_certificate"),
    edge(ID.menu, "derives", ID.event,
      "round_phase_activation:menu_certificate"),
    edge(ID.nextTurn, "derives", ID.event,
      "round_phase_activation:turn_certificate"),
    edge(ID.event, "writes", ID.pending,
      "round_phase_activation:clear_pending"),
    edge(ID.event, "writes", ID.history,
      "round_phase_activation:history"),
    edge(ID.event, "writes", ID.result,
      "round_phase_activation:last_resolution"),
    edge(ID.event, "writes", ID.log,
      "round_phase_activation:log"),
    edge(ID.data, "verified_by", ID.sourceTest,
      "round_phase_activation:source_judge"),
    edge(ID.sequence, "verified_by", ID.sequenceTest,
      "round_phase_activation:sequence_judge"),
    edge(ID.menu, "verified_by", ID.menuTest,
      "round_phase_activation:menu_judge"),
    edge(ID.nextTurn, "verified_by", ID.alternationTest,
      "round_phase_activation:alternation_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "round_phase_activation:authority"),
    edge(executor, "verified_by", ID.graphTest,
      "round_phase_activation:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "round_phase_activation:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official round, phase and activation source bundle"),
    node(ID.pending, "state_field", "Round phase activation pending"),
    node(ID.history, "state_field", "Round phase activation history"),
    node(ID.result, "state_field", "Last round phase activation resolution"),
    node(ID.choose, "action_variant", "Choose certified round phase activation plan"),
    node(ID.sequence, "derived_value", "Strict four-phase sequence"),
    node(ID.limit, "derived_value", "Maximum fifth round"),
    node(ID.menu, "derived_value", "Rules-owned phase action menu"),
    node(ID.actionCount, "derived_value", "Exactly one phase action per activation"),
    node(ID.nextTurn, "derived_value", "Next alternating activation turn"),
    node(ID.event, "state_event", "Round phase activation rules resolved"),
    node(ID.sourceTest, "judge_test", "Pinned game-sequence source Judge"),
    node(ID.sequenceTest, "judge_test", "Round and phase sequence Judge"),
    node(ID.menuTest, "judge_test", "Phase action menu Judge"),
    node(ID.alternationTest, "judge_test", "Alternating activation Judge"),
    node(ID.authorityTest, "judge_test", "Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes,
    ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
  edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:round_phase_activation_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ID.log, ID.choose,
      ID.sequence, ID.limit, ID.menu, ID.actionCount, ID.nextTurn, ...consumers,
      ID.event, ...tests])],
    requiredEdges: edges,
    requiredPaths: [
      { from: ID.data, to: ID.event, relationships: ["derives"], maxDepth: 5 },
      { from: ID.phase, to: ID.event, relationships: ["derives"], maxDepth: 5 },
      { from: ID.pieces, to: ID.nextTurn, relationships: ["derives"], maxDepth: 4 },
      ...consumers.map((target) => ({ from: ID.data, to: target,
        relationships: ["derives", "consumed_by"], maxDepth: 5 })),
    ],
    forbiddenPaths: [{ from: ID.menu, to: ID.pieces,
      relationships: ["writes"], maxDepth: 4 }],
    evidenceTestNodeIds: tests,
  }] };
}
