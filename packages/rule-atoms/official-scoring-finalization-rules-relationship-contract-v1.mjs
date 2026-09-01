import {
  OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
  OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_VERSION,
} from "./official-scoring-finalization-rules-executor-v1.mjs";
import { createOfficialBattlefieldTokenMarkerRulesRelationshipExtensionV1 } from
  "./official-battlefield-token-marker-rules-relationship-contract-v1.mjs";

export const OFFICIAL_SCORING_FINALIZATION_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-110-scoring-finalization-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialScoringFinalizationRulesDataBundle",
  reserveData: "state_field:officialReserveLifecycleDataBundle",
  unitSupplyData: "state_field:officialUnitCardSupplyDataBundle",
  tokenData: "state_field:officialBattlefieldTokenMarkerRulesDataBundle",
  setup: "state_field:officialBattlefieldSetup",
  registry: "state_field:officialBattlefieldTokenMarkerRegistry",
  markerViews: "state_field:officialBattlefieldMarkerViewsAtSetup",
  firstPlayer: "state_field:firstPlayerSideKey",
  activeSide: "state_field:activeSideKey",
  players: "state_field:players",
  pieces: "state_field:pieces",
  board: "state_field:board.missionMarkers",
  setupBinding: "state_field:officialMissionSetupBinding",
  supplyLedger: "state_field:supplyLossLedger",
  reserveLedger: "state_field:finalReserveDestructionLedger",
  scores: "state_field:scores",
  progress: "state_field:scoringCleanupProgress",
  history: "state_field:scoringFinalizationRulesHistory",
  result: "state_field:lastScoringFinalizationRulesResolution",
  log: "state_field:log",
  action: "action_variant:scoringFinalizationV1.resolveProcedure",
  rolloff: "derived_value:scoringFinalizationV1.initial2d6RollOff",
  assignment: "derived_value:scoringFinalizationV1.winnerAssignsEitherSide",
  control: "derived_value:scoringFinalizationV1.consumedAtomicMarkerControl",
  elimination: "derived_value:scoringFinalizationV1.fieldAndReserveElimination",
  award: "derived_value:scoringFinalizationV1.survivorTenVp",
  finalScore: "derived_value:scoringFinalizationV1.totalObjectiveVp",
  outcome: "derived_value:scoringFinalizationV1.highestVpOrTiebreakDraw",
  projection: "semantic_projection:scoringFinalizationV1.worldInchesNotPixels",
  controlConsumer: "executor:authority.mission-marker-control-v3@3.0.0",
  reserveConsumer: "executor:authority.reserve-lifecycle-rules-v1@1.0.0",
  markerConsumer: "executor:authority.battlefield-token-marker-rules-v1@1.0.0",
  event: "state_event:scoring_finalization_rules_resolved",
  sourceTest: "judge_test:scoring-finalization-v1-source-route",
  rolloffTest: "judge_test:scoring-finalization-v1-rolloff-assignment",
  controlTest: "judge_test:scoring-finalization-v1-control-consumption",
  terminalTest: "judge_test:scoring-finalization-v1-elimination-round-limit",
  scoreTest: "judge_test:scoring-finalization-v1-final-score-draw",
  scaleTest: "judge_test:scoring-finalization-v1-world-scale-invariant",
  authorityTest: "judge_test:scoring-finalization-v1-authority-replay",
  graphTest: "judge_test:scoring-finalization-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-110" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_SCORING_FINALIZATION_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialScoringFinalizationRulesRelationshipExtensionV1(
  input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("SCORING_FINALIZATION_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialBattlefieldTokenMarkerRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash });
  const executor = `executor:${OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.reserveData, ID.unitSupplyData,
    ID.tokenData, ID.setup, ID.registry, ID.firstPlayer, ID.players, ID.pieces,
    ID.board, ID.setupBinding, ID.supplyLedger, ID.reserveLedger, ID.scores,
    ID.progress];
  const writes = [ID.setup, ID.markerViews, ID.firstPlayer, ID.activeSide,
    ID.pieces, ID.reserveLedger, ID.scores, ID.progress, ID.history, ID.result, ID.log];
  const tests = [ID.sourceTest, ID.rolloffTest, ID.controlTest, ID.terminalTest,
    ID.scoreTest, ID.scaleTest, ID.authorityTest, ID.graphTest];
  const derived = [ID.rolloff, ID.assignment, ID.control, ID.elimination,
    ID.award, ID.finalScore, ID.outcome, ID.projection];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "scoring_finalization:state_contract")),
    edge(executor, "exposes", ID.action,
      "scoring_finalization:finite_rules_owned_procedures"),
    edge(ID.data, "derives", ID.rolloff, "scoring_finalization:2d6_each"),
    edge(ID.action, "derives", ID.rolloff, "scoring_finalization:chance_reveal"),
    edge(ID.rolloff, "derives", ID.assignment,
      "scoring_finalization:winner_assignment_domain"),
    edge(ID.firstPlayer, "consumed_by", ID.markerConsumer,
      "scoring_finalization:derived_marker_view"),
    edge(ID.controlConsumer, "derives", ID.control,
      "scoring_finalization:frozen_atomic_control_output"),
    edge(ID.board, "derives", ID.control,
      "scoring_finalization:control_hash_bound_markers"),
    edge(ID.control, "derives", ID.finalScore,
      "scoring_finalization:controlled_marker_objective_vp"),
    edge(ID.reserveConsumer, "derives", ID.finalScore,
      "scoring_finalization:final_reserve_supply_vp"),
    edge(ID.pieces, "derives", ID.elimination,
      "scoring_finalization:field_and_reserve_denominator"),
    edge(ID.elimination, "derives", ID.award,
      "scoring_finalization:surviving_player_ten_vp"),
    edge(ID.supplyLedger, "derives", ID.finalScore,
      "scoring_finalization:destroyed_enemy_supply_vp"),
    edge(ID.scores, "derives", ID.finalScore,
      "scoring_finalization:all_objective_vp_total"),
    edge(ID.finalScore, "derives", ID.outcome,
      "scoring_finalization:highest_vp_or_draw"),
    edge(ID.registry, "derives", ID.projection,
      "scoring_finalization:inch_world_geometry"),
    edge(ID.projection, "consumed_by", ID.controlConsumer,
      "scoring_finalization:screen_pixels_never_rules_input"),
    ...derived.filter((id) => id !== ID.projection).map((source) => (
      edge(source, "derives", ID.event, "scoring_finalization:apply"))),
    edge(ID.action, "derives", ID.event, "scoring_finalization:authority_apply"),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "scoring_finalization:state_mutation")),
    edge(ID.data, "verified_by", ID.sourceTest, "scoring_finalization:source_judge"),
    ...[ID.rolloff, ID.assignment].map((source) => edge(source,
      "verified_by", ID.rolloffTest, "scoring_finalization:rolloff_judge")),
    edge(ID.control, "verified_by", ID.controlTest,
      "scoring_finalization:control_judge"),
    ...[ID.elimination, ID.award].map((source) => edge(source,
      "verified_by", ID.terminalTest, "scoring_finalization:terminal_judge")),
    ...[ID.finalScore, ID.outcome].map((source) => edge(source,
      "verified_by", ID.scoreTest, "scoring_finalization:score_judge")),
    edge(ID.projection, "verified_by", ID.scaleTest,
      "scoring_finalization:scale_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "scoring_finalization:authority_judge"),
    edge(executor, "verified_by", ID.graphTest,
      "scoring_finalization:graph_judge"),
    ...reads.map((source) => edge(source, "invalidates", ID.action,
      "scoring_finalization:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official scoring-finalization data bundle"),
    node(ID.reserveLedger, "state_field", "Final reserve destruction ledger"),
    node(ID.history, "state_field", "Scoring-finalization history"),
    node(ID.result, "state_field", "Last scoring-finalization resolution"),
    node(ID.action, "action_variant", "Resolve scoring-finalization procedure"),
    node(ID.rolloff, "derived_value", "Initial hidden 2D6-per-player Roll-Off"),
    node(ID.assignment, "derived_value", "Winner assigns First Player Marker"),
    node(ID.control, "derived_value", "Consumed atomic Mission Marker control"),
    node(ID.elimination, "derived_value", "No-field/no-reserve elimination verdict"),
    node(ID.award, "derived_value", "Surviving player ten-VP award"),
    node(ID.finalScore, "derived_value", "All objective VP mission score"),
    node(ID.outcome, "derived_value", "Highest VP or tiebreak/draw outcome"),
    node(ID.projection, "semantic_projection", "World-inch scale invariant"),
    node(ID.event, "state_event", "Scoring-finalization rules resolved"),
    node(ID.sourceTest, "judge_test", "Scoring-finalization source/route Judge"),
    node(ID.rolloffTest, "judge_test", "Initial Roll-Off/assignment Judge"),
    node(ID.controlTest, "judge_test", "Atomic control-consumption Judge"),
    node(ID.terminalTest, "judge_test", "Elimination/round-limit Judge"),
    node(ID.scoreTest, "judge_test", "Final score/tie fallback Judge"),
    node(ID.scaleTest, "judge_test", "Map/model/UI scaling-invariant Judge"),
    node(ID.authorityTest, "judge_test", "Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes, ...additions.filter((entry) => (
    !previousIds.has(entry.nodeId)))], edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:scoring_finalization_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_SCORING_FINALIZATION_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.action,
      ...derived, ID.event, ID.controlConsumer, ID.reserveConsumer,
      ID.markerConsumer, ...tests])], requiredEdges: edges,
    requiredPaths: [
      { from: ID.data, to: ID.event, relationships: ["derives"], maxDepth: 6 },
      { from: ID.rolloff, to: ID.event, relationships: ["derives"], maxDepth: 3 },
      { from: ID.controlConsumer, to: ID.finalScore,
        relationships: ["derives"], maxDepth: 3 },
      { from: ID.pieces, to: ID.event, relationships: ["derives"], maxDepth: 5 },
    ], forbiddenPaths: [{ from: ID.projection, to: ID.board,
      relationships: ["derives", "writes"], maxDepth: 4 },
    { from: ID.markerViews, to: ID.firstPlayer,
      relationships: ["derives", "writes"], maxDepth: 3 }],
    evidenceTestNodeIds: tests,
  }] };
}
