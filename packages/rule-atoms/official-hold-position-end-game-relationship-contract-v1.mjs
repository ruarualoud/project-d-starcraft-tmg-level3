import {
  createOfficialVictoryPointScoringRelationshipExtensionV1,
  OFFICIAL_VICTORY_POINT_SCORING_RELATIONSHIP_NODE_IDS_V1,
} from "./official-victory-point-scoring-relationship-contract-v1.mjs";
import {
  OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
  OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION,
} from "./official-hold-position-end-game-executor-v1.mjs";
import {
  OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID,
  OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_VERSION,
} from "./official-hold-position-end-game-executor-v2.mjs";

export const OFFICIAL_HOLD_POSITION_END_GAME_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-hold-position-end-game-v2";

const previousIds = OFFICIAL_VICTORY_POINT_SCORING_RELATIONSHIP_NODE_IDS_V1;
const PREVIOUS_CATALOGUE_HASH =
  "23512e7eccf02f31a11c418663a8b68aa13744c30561f3c3fb37b086c22b2a5a";
const PREVIOUS_RUNTIME_HASH =
  "d29dc21552c919c9da004368ef79324c97d311d1f4321880dd7f5e2692f2bcfe";
const EXPECTED_CATALOGUE_HASH =
  "87cd066376e8ab637ee5083711e11e3dfc8e491d47745baf9706cc4f9771b181";
const EXPECTED_RUNTIME_HASH =
  "ecb2e9001d8a8f42cf45adb695bfc977dc79889fa8a6aacda258951b90d9cf64";

export const OFFICIAL_HOLD_POSITION_END_GAME_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
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
  officialGameplayDataBundle: previousIds.officialGameplayDataBundle,
  officialMissionSetupBinding: previousIds.officialMissionSetupBinding,
  supplyLossLedger: previousIds.supplyLossLedger,
  scoringCleanupProgress: previousIds.scoringCleanupProgress,
  victoryPointScoringHistory: previousIds.victoryPointScoringHistory,
  gameOver: "state_field:gameOver",
  terminal: "state_field:terminal",
  winner: "state_field:winner",
  terminalReason: "state_field:terminalReason",
  endGameResolutionHistory: "state_field:endGameResolutionHistory",
  matchBinding: "semantic_projection:holdPositionEndGame.matchBindingV2",
  scoreSnapshot: "semantic_projection:holdPositionEndGame.scoreSnapshotV2",
  liveArmyWitnesses: "semantic_projection:holdPositionEndGame.liveArmyWitnessesV2",
  protectedState: "semantic_projection:holdPositionEndGame.protectedStateV2",
  specialLeadBinding: "derived_value:holdPositionEndGame.specialLeadBindingV2",
  terminalResolution: "derived_value:holdPositionEndGame.terminalResolutionV2",
  endGameAction: "action_variant:holdPositionEndGame.exactResolutionV2",
  actionType: "action_type:check_end_game_conditions",
  checkedEvent: "state_event:end_game_condition_checked",
  gameEndEvent: "state_event:game_end",
  exactActionTest: "judge_test:hold-position-end-game-v2-exact-public-action-v1",
  forgedActionTest: "judge_test:hold-position-end-game-v2-forged-action-rejected-v1",
  thresholdTest: "judge_test:hold-position-end-game-v2-threshold-boundaries-v1",
  bothWinnersTest: "judge_test:hold-position-end-game-v2-either-seat-terminal-v1",
  nonTerminalTest: "judge_test:hold-position-end-game-v2-nonterminal-handoff-v1",
  armyWitnessTest: "judge_test:hold-position-end-game-v2-live-army-exclusion-v1",
  lifecycleTest: "judge_test:hold-position-end-game-v2-scoring-prefix-lifecycle-v1",
  sourceBindingTest: "judge_test:hold-position-end-game-v2-official-source-binding-v1",
  protectedStateTest: "judge_test:hold-position-end-game-v2-protected-state-v1",
  replayTest: "judge_test:hold-position-end-game-v2-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:hold-position-end-game-v1-frozen-runtime-and-display-v1",
  relationshipTest: "judge_test:hold-position-end-game-v2-relationship-negative-gap-v1",
  historicalExecutor:
    `executor:${OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID}`
    + `@${OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION}`,
  currentExecutor:
    `executor:${OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_VERSION}`,
  previousSliceRelease: previousIds.currentSliceRelease,
  currentSliceRelease:
    "slice_release:slice-57-existing-hold-position-end-game-contract-closure-v1",
  previousCatalogueRelease: previousIds.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-57-current",
  previousRuntimeRelease: previousIds.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-57-current",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_HOLD_POSITION_END_GAME_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_HOLD_POSITION_END_GAME_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialHoldPositionEndGameRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("END_GAME_RELATIONSHIP_CURRENT_RELEASE_INVALID", `${catalogueHash}:${runtimeHash}`);
  }
  const previous = createOfficialVictoryPointScoringRelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const id = OFFICIAL_HOLD_POSITION_END_GAME_RELATIONSHIP_NODE_IDS_V1;
  const tests = [
    id.exactActionTest,
    id.forgedActionTest,
    id.thresholdTest,
    id.bothWinnersTest,
    id.nonTerminalTest,
    id.armyWitnessTest,
    id.lifecycleTest,
    id.sourceBindingTest,
    id.protectedStateTest,
    id.replayTest,
    id.historicalTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.gameOver, "state_field", "Terminal game-over flag"),
    node(id.terminal, "state_field", "Terminal lifecycle flag"),
    node(id.winner, "state_field", "Winning side key"),
    node(id.terminalReason, "state_field", "Content-bound terminal reason"),
    node(id.endGameResolutionHistory, "state_field", "Append-only end-game check history"),
    node(id.matchBinding, "semantic_projection", "Current data and runtime MatchBinding"),
    node(id.scoreSnapshot, "semantic_projection", "Both scores after simultaneous VP commit"),
    node(id.liveArmyWitnesses, "semantic_projection",
      "One exact live battlefield model witness for each seat"),
    node(id.protectedState, "semantic_projection",
      "Board, pieces, scores, source, setup, ledgers and VP history preserved"),
    node(id.specialLeadBinding, "derived_value",
      "Official Hold Position Standard ten-point special-win threshold"),
    node(id.terminalResolution, "derived_value",
      "Continue or immediate terminal outcome from one score snapshot"),
    node(id.endGameAction, "action_variant", "Exact Hold Position end-game v2 action"),
    node(id.checkedEvent, "state_event", "End-game condition checked"),
    node(id.gameEndEvent, "state_event", "Immediate special-win terminal event"),
    node(id.exactActionTest, "judge_test", "Enumerate and Apply share one exact action"),
    node(id.forgedActionTest, "judge_test",
      "Forged lineage, diagnostics or extra fields fail closed"),
    node(id.thresholdTest, "judge_test", "Lead nine continues and lead ten terminates"),
    node(id.bothWinnersTest, "judge_test", "Either seat can satisfy the special-win threshold"),
    node(id.nonTerminalTest, "judge_test", "Nonterminal check hands off to End-of-Round effects"),
    node(id.armyWitnessTest, "judge_test",
      "Incomplete or absent live-army witnesses keep elimination interactions unresolved"),
    node(id.lifecycleTest, "judge_test",
      "Current marker-control and scoring prefix gates one end-game check"),
    node(id.sourceBindingTest, "judge_test",
      "Latest Core, Hold Position and MatchBinding identities are exact"),
    node(id.protectedStateTest, "judge_test", "End-game Apply writes only declared state"),
    node(id.replayTest, "judge_test", "Ed25519 replay survives HMAC seal rotation"),
    node(id.historicalTest, "judge_test", "Frozen v1 runtime and old-rules display remain exact"),
    node(id.relationshipTest, "judge_test", "Missing invalidation or Judge edge blocks release"),
    node(id.historicalExecutor, "executor", "Frozen historical Hold Position end-game v1"),
    node(id.currentSliceRelease, "slice_release", "Existing end-game v2 contract closure"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 57 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 57 runtime ${runtimeHash}`),
  ];
  const readFields = [
    id.round,
    id.phase,
    id.firstPlayerSideKey,
    id.players,
    id.pieces,
    id.scores,
    id.log,
    id.officialGameplayDataBundle,
    id.scoringCleanupProgress,
    id.victoryPointScoringHistory,
    id.gameOver,
    id.terminal,
    id.winner,
    id.terminalReason,
    id.endGameResolutionHistory,
  ];
  const protectedFields = [
    id.round,
    id.phase,
    id.players,
    id.pieces,
    id.board,
    id.scores,
    id.cardResources,
    id.firstPlayerSideKey,
    id.phaseFirstActorByRound,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.supplyLossLedger,
    id.victoryPointScoringHistory,
  ];
  const writableFields = [
    id.activeSideKey,
    id.gameOver,
    id.terminal,
    id.winner,
    id.terminalReason,
    id.endGameResolutionHistory,
    id.scoringCleanupProgress,
    id.log,
  ];
  const relations = [
    ...readFields.map((to) => edge(id.currentExecutor, "reads", to,
      "hold_position_end_game_state_contract_v1")),
    edge(id.currentExecutor, "reads", id.matchBinding,
      "hold_position_end_game_state_contract_v1"),
    edge(id.scores, "projects_to", id.scoreSnapshot,
      "hold_position_end_game_score_projection_v1"),
    edge(id.pieces, "projects_to", id.liveArmyWitnesses,
      "hold_position_end_game_army_projection_v1"),
    ...protectedFields.map((from) => edge(from, "projects_to", id.protectedState,
      "hold_position_end_game_protected_projection_v1")),
    edge(id.officialGameplayDataBundle, "projects_to", id.specialLeadBinding,
      "hold_position_end_game_official_binding_v1"),
    edge(id.matchBinding, "projects_to", id.specialLeadBinding,
      "hold_position_end_game_official_binding_v1"),
    edge(id.scoreSnapshot, "derives", id.terminalResolution,
      "hold_position_end_game_resolution_v1"),
    edge(id.liveArmyWitnesses, "derives", id.terminalResolution,
      "hold_position_end_game_resolution_v1"),
    edge(id.specialLeadBinding, "derives", id.terminalResolution,
      "hold_position_end_game_resolution_v1"),
    edge(id.phase, "gates", id.terminalResolution, "hold_position_end_game_gate_v1"),
    edge(id.firstPlayerSideKey, "gates", id.terminalResolution,
      "hold_position_end_game_gate_v1"),
    edge(id.scoringCleanupProgress, "gates", id.terminalResolution,
      "hold_position_end_game_gate_v1"),
    edge(id.victoryPointScoringHistory, "gates", id.terminalResolution,
      "hold_position_end_game_gate_v1"),
    edge(id.terminalResolution, "includes", id.endGameAction,
      "hold_position_end_game_exact_domain_v1"),
    edge(id.endGameAction, "includes", id.actionType,
      "hold_position_end_game_exact_domain_v1"),
    ...readFields.map((from) => edge(from, "invalidates", id.endGameAction,
      "hold_position_end_game_state_invalidation_v1")),
    edge(id.matchBinding, "invalidates", id.endGameAction,
      "hold_position_end_game_state_invalidation_v1"),
    edge(id.endGameAction, "derives", id.checkedEvent, "hold_position_end_game_apply_v1"),
    edge(id.terminalResolution, "derives", id.gameEndEvent,
      "hold_position_end_game_apply_v1"),
    ...writableFields.map((to) => edge(id.checkedEvent, "writes", to,
      "hold_position_end_game_apply_v1")),
    edge(id.gameEndEvent, "writes", id.activeSideKey, "hold_position_end_game_apply_v1"),
    edge(id.gameEndEvent, "writes", id.gameOver, "hold_position_end_game_apply_v1"),
    edge(id.gameEndEvent, "writes", id.terminal, "hold_position_end_game_apply_v1"),
    edge(id.gameEndEvent, "writes", id.winner, "hold_position_end_game_apply_v1"),
    edge(id.gameEndEvent, "writes", id.terminalReason, "hold_position_end_game_apply_v1"),
    edge(id.endGameAction, "verified_by", id.exactActionTest,
      "hold_position_end_game_judge_v1"),
    edge(id.endGameAction, "verified_by", id.forgedActionTest,
      "hold_position_end_game_judge_v1"),
    edge(id.terminalResolution, "verified_by", id.thresholdTest,
      "hold_position_end_game_judge_v1"),
    edge(id.terminalResolution, "verified_by", id.bothWinnersTest,
      "hold_position_end_game_judge_v1"),
    edge(id.checkedEvent, "verified_by", id.nonTerminalTest,
      "hold_position_end_game_judge_v1"),
    edge(id.liveArmyWitnesses, "verified_by", id.armyWitnessTest,
      "hold_position_end_game_judge_v1"),
    edge(id.scoringCleanupProgress, "verified_by", id.lifecycleTest,
      "hold_position_end_game_judge_v1"),
    edge(id.specialLeadBinding, "verified_by", id.sourceBindingTest,
      "hold_position_end_game_judge_v1"),
    edge(id.protectedState, "verified_by", id.protectedStateTest,
      "hold_position_end_game_judge_v1"),
    edge(id.checkedEvent, "verified_by", id.replayTest,
      "hold_position_end_game_judge_v1"),
    edge(id.historicalExecutor, "verified_by", id.historicalTest,
      "hold_position_end_game_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "hold_position_end_game_judge_v1"),
    edge(id.historicalExecutor, "superseded_by", id.currentExecutor,
      "hold_position_end_game_executor_ancestry_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "hold_position_end_game_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "superseded_by", id.currentCatalogueRelease,
      "hold_position_end_game_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "superseded_by", id.currentRuntimeRelease,
      "hold_position_end_game_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "hold_position_end_game_state_contract_v1",
    "hold_position_end_game_score_projection_v1",
    "hold_position_end_game_army_projection_v1",
    "hold_position_end_game_protected_projection_v1",
    "hold_position_end_game_official_binding_v1",
    "hold_position_end_game_resolution_v1",
    "hold_position_end_game_gate_v1",
    "hold_position_end_game_exact_domain_v1",
    "hold_position_end_game_state_invalidation_v1",
    "hold_position_end_game_apply_v1",
    "hold_position_end_game_judge_v1",
    "hold_position_end_game_executor_ancestry_v1",
    "hold_position_end_game_slice_ancestry_v1",
    "hold_position_end_game_catalogue_ancestry_v1",
    "hold_position_end_game_runtime_ancestry_v1",
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
      OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_HOLD_POSITION_END_GAME_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID,
        requiredNodeIds: [...new Set([
          ...readFields,
          ...protectedFields,
          ...writableFields,
          id.matchBinding,
          id.scoreSnapshot,
          id.liveArmyWitnesses,
          id.protectedState,
          id.specialLeadBinding,
          id.terminalResolution,
          id.endGameAction,
          id.actionType,
          id.checkedEvent,
          id.gameEndEvent,
          id.historicalExecutor,
          id.currentExecutor,
          id.previousSliceRelease,
          id.currentSliceRelease,
          id.previousCatalogueRelease,
          id.currentCatalogueRelease,
          id.previousRuntimeRelease,
          id.currentRuntimeRelease,
          ...tests,
        ])],
        requiredEdges,
        requiredPaths: [
          {
            from: id.officialGameplayDataBundle,
            to: id.sourceBindingTest,
            relationships: ["projects_to", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.scores,
            to: id.thresholdTest,
            relationships: ["projects_to", "derives", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.pieces,
            to: id.armyWitnessTest,
            relationships: ["projects_to", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.endGameAction,
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
        forbiddenPaths: protectedFields.map((to) => ({
          from: id.checkedEvent,
          to,
          relationships: ["writes"],
          maxDepth: 2,
        })),
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
