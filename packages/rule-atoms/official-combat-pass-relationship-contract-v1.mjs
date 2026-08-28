import {
  createOfficialAssaultHoldRelationshipExtensionV1,
  OFFICIAL_ASSAULT_HOLD_RELATIONSHIP_NODE_IDS_V1,
} from "./official-assault-hold-relationship-contract-v1.mjs";
import {
  OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
  OFFICIAL_COMBAT_PASS_V2_EXECUTOR_VERSION,
} from "./official-combat-pass-executor-v2.mjs";
import {
  OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
  OFFICIAL_COMBAT_PASS_V3_EXECUTOR_VERSION,
} from "./official-combat-pass-executor-v3.mjs";

export const OFFICIAL_COMBAT_PASS_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-combat-pass-v3";

const previousIds = OFFICIAL_ASSAULT_HOLD_RELATIONSHIP_NODE_IDS_V1;
const PREVIOUS_CATALOGUE_HASH =
  "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e";
const PREVIOUS_RUNTIME_HASH =
  "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a";
const EXPECTED_CATALOGUE_HASH =
  "eea6d9c0395db9e442f9606b3a9c97196aa949b7a0e29c69590c5717b246922d";
const EXPECTED_RUNTIME_HASH =
  "1d6b06dd12b6eae1c0471d9a5a38073c316a4835018f0c8fc47112344226e26c";

export const OFFICIAL_COMBAT_PASS_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  round: previousIds.round,
  phase: previousIds.phase,
  activeSideKey: previousIds.activeSideKey,
  players: previousIds.players,
  pieces: previousIds.pieces,
  firstPlayerSideKey: previousIds.firstPlayerSideKey,
  phaseFirstActorByRound: previousIds.phaseFirstActorByRound,
  log: previousIds.log,
  board: previousIds.board,
  scores: previousIds.scores,
  cardResources: previousIds.cardResources,
  engagementGeometry: "semantic_projection:combatPass.engagementGeometryV2",
  pieceCombatState: "semantic_projection:combatPass.pieceCombatStateV3",
  protectedState: "semantic_projection:combatPass.protectedStateV3",
  engagementGraph: "derived_value:combatPass.exactEngagementGraphV2",
  remainingEngagedUnits:
    "derived_value:combatPass.remainingActiveUnactivatedEngagedUnitsV3",
  exactPassSet: "derived_value:combatPass.exactMandatoryPassSetV3",
  otherSide: "derived_value:combatPass.otherSideV3",
  nextPhase: "derived_value:combatPass.nextPhaseV3",
  passAction: "action_variant:combatPass.exactMandatoryPassV3",
  actionType: "action_type:pass",
  passEvent: "state_event:combat_pass",
  phaseAdvancedEvent: "state_event:phase_advanced",
  exactActionTest: "judge_test:combat-pass-v3-exact-public-action-v1",
  forgedActionTest: "judge_test:combat-pass-v3-forged-lineage-rejected-v1",
  choiceGateTest: "judge_test:combat-pass-v3-fresh-phase-choice-required-v1",
  engagementGateTest: "judge_test:combat-pass-v3-engaged-unit-blocks-pass-v1",
  handoffTest: "judge_test:combat-pass-v3-first-pass-hands-opponent-v1",
  cleanupTest: "judge_test:combat-pass-v3-second-pass-enters-cleanup-v1",
  protectedStateTest: "judge_test:combat-pass-v3-preserves-board-pieces-score-resources-v1",
  replayTest: "judge_test:combat-pass-v3-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:combat-pass-v2-frozen-runtime-and-display-v1",
  relationshipTest: "judge_test:combat-pass-v3-relationship-negative-gap-v1",
  historicalExecutor:
    `executor:${OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID}@${OFFICIAL_COMBAT_PASS_V2_EXECUTOR_VERSION}`,
  currentExecutor:
    `executor:${OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID}@${OFFICIAL_COMBAT_PASS_V3_EXECUTOR_VERSION}`,
  previousSliceRelease: previousIds.currentSliceRelease,
  currentSliceRelease:
    "slice_release:slice-54-existing-combat-pass-contract-closure-v1",
  previousCatalogueRelease: previousIds.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-54-current",
  previousRuntimeRelease: previousIds.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-54-current",
});

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_COMBAT_PASS_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_COMBAT_PASS_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialCombatPassRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("COMBAT_PASS_RELATIONSHIP_CURRENT_RELEASE_INVALID");
  }
  const previous = createOfficialAssaultHoldRelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const id = OFFICIAL_COMBAT_PASS_RELATIONSHIP_NODE_IDS_V1;
  const tests = [
    id.exactActionTest,
    id.forgedActionTest,
    id.choiceGateTest,
    id.engagementGateTest,
    id.handoffTest,
    id.cleanupTest,
    id.protectedStateTest,
    id.replayTest,
    id.historicalTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.engagementGeometry, "semantic_projection",
      "Exact board, terrain, Access Point, model coordinate, base and elevation input"),
    node(id.pieceCombatState, "semantic_projection",
      "Live on-field model count, combat tag and Combat activation state"),
    node(id.protectedState, "semantic_projection",
      "Board, pieces, scores, resources, marker and phase-choice state preserved by Pass"),
    node(id.engagementGraph, "derived_value", "Exact EngagementGraph v2 and graph hash"),
    node(id.remainingEngagedUnits, "derived_value",
      "Active seat's live unactivated Engaged Units"),
    node(id.exactPassSet, "derived_value",
      "Exactly one mandatory Combat Pass or the empty set"),
    node(id.otherSide, "derived_value", "Opposing seat after the first Combat Pass"),
    node(id.nextPhase, "derived_value", "Cleanup after the second Combat Pass"),
    node(id.passAction, "action_variant", "Exact Combat Pass v3 action"),
    node(id.passEvent, "state_event", "Combat Pass accepted with EngagementGraph hash"),
    node(id.exactActionTest, "judge_test", "Enumerate and Apply share one exact action"),
    node(id.forgedActionTest, "judge_test", "Forged version, lineage or fields fail closed"),
    node(id.choiceGateTest, "judge_test", "Fresh Combat first-actor choice gates Pass"),
    node(id.engagementGateTest, "judge_test", "Remaining Engaged Unit blocks Pass"),
    node(id.handoffTest, "judge_test", "First Pass hands the active seat to the opponent"),
    node(id.cleanupTest, "judge_test", "Second Pass advances Combat to Cleanup"),
    node(id.protectedStateTest, "judge_test",
      "Pass preserves board, pieces, scores, resources, marker and phase choice"),
    node(id.replayTest, "judge_test", "Ed25519 replay survives HMAC rotation"),
    node(id.historicalTest, "judge_test", "Frozen v2 runtime and rules display remain available"),
    node(id.relationshipTest, "judge_test", "Missing invalidation or Judge edge blocks contract"),
    node(id.historicalExecutor, "executor", "Frozen historical Combat Pass v2 executor"),
    node(id.currentSliceRelease, "slice_release", "Existing Combat Pass v3 contract closure"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 54 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 54 runtime ${runtimeHash}`),
  ];
  const relations = [
    edge(id.currentExecutor, "reads", id.round, "combat_pass_state_contract_v1"),
    edge(id.currentExecutor, "reads", id.phase, "combat_pass_state_contract_v1"),
    edge(id.currentExecutor, "reads", id.activeSideKey, "combat_pass_state_contract_v1"),
    edge(id.currentExecutor, "reads", id.players, "combat_pass_state_contract_v1"),
    edge(id.currentExecutor, "reads", id.pieces, "combat_pass_state_contract_v1"),
    edge(id.currentExecutor, "reads", id.board, "combat_pass_state_contract_v1"),
    edge(id.currentExecutor, "reads", id.firstPlayerSideKey,
      "combat_pass_state_contract_v1"),
    edge(id.currentExecutor, "reads", id.phaseFirstActorByRound,
      "combat_pass_state_contract_v1"),
    edge(id.currentExecutor, "reads", id.log, "combat_pass_state_contract_v1"),
    edge(id.currentExecutor, "exposes", id.exactPassSet, "combat_pass_exact_domain_v1"),
    edge(id.board, "projects_to", id.engagementGeometry,
      "combat_pass_engagement_projection_v1"),
    edge(id.pieces, "projects_to", id.engagementGeometry,
      "combat_pass_engagement_projection_v1"),
    edge(id.pieces, "projects_to", id.pieceCombatState,
      "combat_pass_piece_projection_v1"),
    edge(id.board, "projects_to", id.protectedState,
      "combat_pass_protected_projection_v1"),
    edge(id.pieces, "projects_to", id.protectedState,
      "combat_pass_protected_projection_v1"),
    edge(id.scores, "projects_to", id.protectedState,
      "combat_pass_protected_projection_v1"),
    edge(id.cardResources, "projects_to", id.protectedState,
      "combat_pass_protected_projection_v1"),
    edge(id.firstPlayerSideKey, "projects_to", id.protectedState,
      "combat_pass_protected_projection_v1"),
    edge(id.phaseFirstActorByRound, "projects_to", id.protectedState,
      "combat_pass_protected_projection_v1"),
    edge(id.engagementGeometry, "derives", id.engagementGraph,
      "combat_pass_engagement_graph_v2"),
    edge(id.pieceCombatState, "derives", id.engagementGraph,
      "combat_pass_engagement_graph_v2"),
    edge(id.engagementGraph, "derives", id.remainingEngagedUnits,
      "combat_pass_remaining_unit_denominator_v1"),
    edge(id.pieceCombatState, "derives", id.remainingEngagedUnits,
      "combat_pass_remaining_unit_denominator_v1"),
    edge(id.phase, "gates", id.exactPassSet, "combat_pass_gate_v1"),
    edge(id.activeSideKey, "gates", id.exactPassSet, "combat_pass_gate_v1"),
    edge(id.players, "gates", id.exactPassSet, "combat_pass_gate_v1"),
    edge(id.phaseFirstActorByRound, "gates", id.exactPassSet, "combat_pass_gate_v1"),
    edge(id.remainingEngagedUnits, "gates", id.exactPassSet, "combat_pass_gate_v1"),
    edge(id.exactPassSet, "includes", id.passAction, "combat_pass_exact_domain_v1"),
    edge(id.passAction, "includes", id.actionType, "combat_pass_exact_domain_v1"),
    ...[
      id.round,
      id.phase,
      id.activeSideKey,
      id.players,
      id.pieces,
      id.board,
      id.firstPlayerSideKey,
      id.phaseFirstActorByRound,
      id.log,
    ].map((from) => edge(from, "invalidates", id.passAction,
      "combat_pass_state_invalidation_v1")),
    edge(id.activeSideKey, "derives", id.otherSide, "combat_pass_handoff_v1"),
    edge(id.phase, "derives", id.nextPhase, "combat_pass_cleanup_v1"),
    edge(id.passAction, "derives", id.passEvent, "combat_pass_apply_v1"),
    edge(id.passEvent, "writes", id.players, "combat_pass_apply_v1"),
    edge(id.passEvent, "writes", id.activeSideKey, "combat_pass_apply_v1"),
    edge(id.passEvent, "writes", id.log, "combat_pass_apply_v1"),
    edge(id.passEvent, "derives", id.phaseAdvancedEvent, "combat_pass_cleanup_v1"),
    edge(id.phaseAdvancedEvent, "writes", id.phase, "combat_pass_cleanup_v1"),
    edge(id.phaseAdvancedEvent, "writes", id.activeSideKey, "combat_pass_cleanup_v1"),
    edge(id.exactPassSet, "verified_by", id.exactActionTest, "combat_pass_judge_v1"),
    edge(id.passAction, "verified_by", id.forgedActionTest, "combat_pass_judge_v1"),
    edge(id.phaseFirstActorByRound, "verified_by", id.choiceGateTest,
      "combat_pass_judge_v1"),
    edge(id.remainingEngagedUnits, "verified_by", id.engagementGateTest,
      "combat_pass_judge_v1"),
    edge(id.activeSideKey, "verified_by", id.handoffTest, "combat_pass_judge_v1"),
    edge(id.phaseAdvancedEvent, "verified_by", id.cleanupTest, "combat_pass_judge_v1"),
    edge(id.protectedState, "verified_by", id.protectedStateTest,
      "combat_pass_judge_v1"),
    edge(id.passEvent, "verified_by", id.replayTest, "combat_pass_judge_v1"),
    edge(id.historicalExecutor, "verified_by", id.historicalTest,
      "combat_pass_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "combat_pass_judge_v1"),
    edge(id.historicalExecutor, "superseded_by", id.currentExecutor,
      "combat_pass_executor_ancestry_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "combat_pass_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "superseded_by", id.currentCatalogueRelease,
      "combat_pass_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "superseded_by", id.currentRuntimeRelease,
      "combat_pass_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "combat_pass_state_contract_v1",
    "combat_pass_exact_domain_v1",
    "combat_pass_engagement_projection_v1",
    "combat_pass_piece_projection_v1",
    "combat_pass_protected_projection_v1",
    "combat_pass_engagement_graph_v2",
    "combat_pass_remaining_unit_denominator_v1",
    "combat_pass_gate_v1",
    "combat_pass_state_invalidation_v1",
    "combat_pass_handoff_v1",
    "combat_pass_cleanup_v1",
    "combat_pass_apply_v1",
    "combat_pass_judge_v1",
    "combat_pass_executor_ancestry_v1",
    "combat_pass_slice_ancestry_v1",
    "combat_pass_catalogue_ancestry_v1",
    "combat_pass_runtime_ancestry_v1",
  ]);
  const requiredEdges = relations.filter((relation) => (
    requiredProvenance.has(relation.provenance)
  ));
  return {
    nodes: [...previous.nodes, ...nodes],
    edges: [...previous.edges, ...relations],
    executorLineages: [...previous.executorLineages],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_COMBAT_PASS_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
        requiredNodeIds: [
          id.round,
          id.phase,
          id.activeSideKey,
          id.players,
          id.pieces,
          id.firstPlayerSideKey,
          id.phaseFirstActorByRound,
          id.log,
          id.board,
          id.scores,
          id.cardResources,
          id.engagementGeometry,
          id.pieceCombatState,
          id.protectedState,
          id.engagementGraph,
          id.remainingEngagedUnits,
          id.exactPassSet,
          id.otherSide,
          id.nextPhase,
          id.passAction,
          id.actionType,
          id.passEvent,
          id.phaseAdvancedEvent,
          id.historicalExecutor,
          id.currentExecutor,
          id.previousSliceRelease,
          id.currentSliceRelease,
          id.previousCatalogueRelease,
          id.currentCatalogueRelease,
          id.previousRuntimeRelease,
          id.currentRuntimeRelease,
          ...tests,
        ],
        requiredEdges,
        requiredPaths: [
          {
            from: id.board,
            to: id.engagementGateTest,
            relationships: ["projects_to", "derives", "verified_by"],
            maxDepth: 6,
          },
          {
            from: id.phaseFirstActorByRound,
            to: id.choiceGateTest,
            relationships: ["verified_by"],
            maxDepth: 2,
          },
          {
            from: id.passAction,
            to: id.handoffTest,
            relationships: ["derives", "writes", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.passAction,
            to: id.cleanupTest,
            relationships: ["derives", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.passAction,
            to: id.replayTest,
            relationships: ["derives", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.historicalExecutor,
            to: id.historicalTest,
            relationships: ["verified_by"],
            maxDepth: 2,
          },
        ],
        forbiddenPaths: [
          id.board,
          id.pieces,
          id.scores,
          id.cardResources,
          id.firstPlayerSideKey,
          id.phaseFirstActorByRound,
        ].map((to) => ({
          from: id.phaseAdvancedEvent,
          to,
          relationships: ["writes"],
          maxDepth: 2,
        })),
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
