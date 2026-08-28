import {
  createOfficialMissionMarkerControlRelationshipExtensionV1,
  OFFICIAL_MISSION_MARKER_CONTROL_RELATIONSHIP_NODE_IDS_V1,
} from "./official-mission-marker-control-relationship-contract-v1.mjs";
import {
  OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
  OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION,
} from "./official-victory-point-scoring-executor-v1.mjs";
import {
  OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
  OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION,
} from "./official-victory-point-scoring-executor-v2.mjs";

export const OFFICIAL_VICTORY_POINT_SCORING_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-victory-point-scoring-v2";

const previousIds = OFFICIAL_MISSION_MARKER_CONTROL_RELATIONSHIP_NODE_IDS_V1;
const PREVIOUS_CATALOGUE_HASH =
  "d7ebb1f60f861544a31711362077927dde00271faf91e44350b5000ed06ff908";
const PREVIOUS_RUNTIME_HASH =
  "7ba03eba7f2ea2f357c5264bcc2f261453a0f3b3c0fc9310db3c281a2eac8f55";
const EXPECTED_CATALOGUE_HASH =
  "23512e7eccf02f31a11c418663a8b68aa13744c30561f3c3fb37b086c22b2a5a";
const EXPECTED_RUNTIME_HASH =
  "d29dc21552c919c9da004368ef79324c97d311d1f4321880dd7f5e2692f2bcfe";

export const OFFICIAL_VICTORY_POINT_SCORING_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
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
  victoryPointScoringHistory: "state_field:victoryPointScoringHistory",
  matchBinding: "semantic_projection:victoryPointScoring.matchBindingV2",
  markerControlSnapshot: "semantic_projection:victoryPointScoring.markerControlSnapshotV2",
  scoreSnapshot: "semantic_projection:victoryPointScoring.scoreSnapshotV2",
  protectedState: "semantic_projection:victoryPointScoring.protectedStateV2",
  officialScoringBinding: "derived_value:victoryPointScoring.officialScoringBindingV2",
  affinityBreakdowns: "derived_value:victoryPointScoring.affinityBreakdownsV2",
  simultaneousResolution: "derived_value:victoryPointScoring.simultaneousResolutionV2",
  scoringAction: "action_variant:victoryPointScoring.exactResolutionV2",
  actionType: "action_type:score_victory_points",
  scoringEvent: "state_event:victory_points_scored",
  exactActionTest: "judge_test:victory-point-scoring-v2-exact-public-action-v1",
  forgedActionTest: "judge_test:victory-point-scoring-v2-forged-action-rejected-v1",
  seatAndLifecycleTest: "judge_test:victory-point-scoring-v2-seat-and-lifecycle-gates-v1",
  sourceBindingTest: "judge_test:victory-point-scoring-v2-official-source-binding-v1",
  zeroSupplyTest: "judge_test:victory-point-scoring-v2-zero-supply-ledger-v1",
  affinityTest: "judge_test:victory-point-scoring-v2-marker-affinity-breakdown-v1",
  simultaneousTest: "judge_test:victory-point-scoring-v2-simultaneous-score-commit-v1",
  protectedStateTest: "judge_test:victory-point-scoring-v2-protected-state-v1",
  replayTest: "judge_test:victory-point-scoring-v2-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:victory-point-scoring-v1-frozen-runtime-and-display-v1",
  relationshipTest: "judge_test:victory-point-scoring-v2-relationship-negative-gap-v1",
  historicalExecutor:
    `executor:${OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID}`
    + `@${OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION}`,
  currentExecutor:
    `executor:${OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION}`,
  previousSliceRelease: previousIds.currentSliceRelease,
  currentSliceRelease:
    "slice_release:slice-56-existing-victory-point-scoring-contract-closure-v1",
  previousCatalogueRelease: previousIds.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-56-current",
  previousRuntimeRelease: previousIds.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-56-current",
});

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_VICTORY_POINT_SCORING_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_VICTORY_POINT_SCORING_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialVictoryPointScoringRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("VICTORY_POINT_SCORING_RELATIONSHIP_CURRENT_RELEASE_INVALID");
  }
  const previous = createOfficialMissionMarkerControlRelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const id = OFFICIAL_VICTORY_POINT_SCORING_RELATIONSHIP_NODE_IDS_V1;
  const tests = [
    id.exactActionTest,
    id.forgedActionTest,
    id.seatAndLifecycleTest,
    id.sourceBindingTest,
    id.zeroSupplyTest,
    id.affinityTest,
    id.simultaneousTest,
    id.protectedStateTest,
    id.replayTest,
    id.historicalTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.victoryPointScoringHistory, "state_field", "Append-only VP scoring history"),
    node(id.matchBinding, "semantic_projection", "Data and Rules runtime MatchBinding"),
    node(id.markerControlSnapshot, "semantic_projection",
      "Five current marker controllers and frozen control resolution"),
    node(id.scoreSnapshot, "semantic_projection", "Both players' one-before-state scores"),
    node(id.protectedState, "semantic_projection",
      "Board, pieces, resources, initiative, source and ledger preserved"),
    node(id.officialScoringBinding, "derived_value",
      "Official Hold Position scoring profile, setup, runtime and zero-loss ledger"),
    node(id.affinityBreakdowns, "derived_value",
      "Per-marker affinity and VP breakdown for both players"),
    node(id.simultaneousResolution, "derived_value",
      "Both score totals derived from one before-state and committed atomically"),
    node(id.scoringAction, "action_variant", "Exact Victory Point Scoring v2 action"),
    node(id.scoringEvent, "state_event", "Victory points scored simultaneously"),
    node(id.exactActionTest, "judge_test", "Enumerate and Apply share one exact action"),
    node(id.forgedActionTest, "judge_test",
      "Forged lineage, resolution, diagnostics or extra field fails closed"),
    node(id.seatAndLifecycleTest, "judge_test",
      "First Player, Cleanup order and one-resolution gates hold"),
    node(id.sourceBindingTest, "judge_test",
      "Latest official Hold Position and frozen setup/runtime binding hold"),
    node(id.zeroSupplyTest, "judge_test",
      "Only the exact zero-round-loss attribution witness is supported"),
    node(id.affinityTest, "judge_test", "Own, enemy and neutral marker VP are exact"),
    node(id.simultaneousTest, "judge_test", "Both scores commit from one before-state"),
    node(id.protectedStateTest, "judge_test", "Scoring writes only its declared state"),
    node(id.replayTest, "judge_test", "Ed25519 replay survives HMAC seal rotation"),
    node(id.historicalTest, "judge_test", "Frozen v1 runtime and rules display remain available"),
    node(id.relationshipTest, "judge_test", "Missing invalidation or Judge edge blocks contract"),
    node(id.historicalExecutor, "executor", "Frozen historical Victory Point Scoring v1"),
    node(id.currentSliceRelease, "slice_release", "Existing VP Scoring v2 contract closure"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 56 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 56 runtime ${runtimeHash}`),
  ];
  const readFields = [
    id.round,
    id.phase,
    id.firstPlayerSideKey,
    id.players,
    id.pieces,
    id.board,
    id.scores,
    id.log,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.supplyLossLedger,
    id.scoringCleanupProgress,
    id.victoryPointScoringHistory,
  ];
  const protectedFields = [
    id.round,
    id.phase,
    id.activeSideKey,
    id.players,
    id.pieces,
    id.board,
    id.cardResources,
    id.firstPlayerSideKey,
    id.phaseFirstActorByRound,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.supplyLossLedger,
  ];
  const relations = [
    ...readFields.map((to) => edge(id.currentExecutor, "reads", to,
      "victory_point_scoring_state_contract_v1")),
    edge(id.currentExecutor, "reads", id.matchBinding,
      "victory_point_scoring_state_contract_v1"),
    edge(id.currentExecutor, "exposes", id.simultaneousResolution,
      "victory_point_scoring_exact_domain_v1"),
    edge(id.board, "projects_to", id.markerControlSnapshot,
      "victory_point_scoring_marker_projection_v1"),
    edge(id.scoringCleanupProgress, "projects_to", id.markerControlSnapshot,
      "victory_point_scoring_marker_projection_v1"),
    edge(id.scores, "projects_to", id.scoreSnapshot,
      "victory_point_scoring_score_projection_v1"),
    ...protectedFields.map((from) => edge(from, "projects_to", id.protectedState,
      "victory_point_scoring_protected_projection_v1")),
    edge(id.officialGameplayDataBundle, "projects_to", id.officialScoringBinding,
      "victory_point_scoring_official_binding_v1"),
    edge(id.officialMissionSetupBinding, "projects_to", id.officialScoringBinding,
      "victory_point_scoring_official_binding_v1"),
    edge(id.supplyLossLedger, "projects_to", id.officialScoringBinding,
      "victory_point_scoring_official_binding_v1"),
    edge(id.matchBinding, "projects_to", id.officialScoringBinding,
      "victory_point_scoring_official_binding_v1"),
    edge(id.markerControlSnapshot, "derives", id.affinityBreakdowns,
      "victory_point_scoring_affinity_resolution_v1"),
    edge(id.officialScoringBinding, "derives", id.affinityBreakdowns,
      "victory_point_scoring_affinity_resolution_v1"),
    edge(id.scoreSnapshot, "derives", id.simultaneousResolution,
      "victory_point_scoring_simultaneous_resolution_v1"),
    edge(id.affinityBreakdowns, "derives", id.simultaneousResolution,
      "victory_point_scoring_simultaneous_resolution_v1"),
    edge(id.phase, "gates", id.simultaneousResolution,
      "victory_point_scoring_gate_v1"),
    edge(id.firstPlayerSideKey, "gates", id.simultaneousResolution,
      "victory_point_scoring_gate_v1"),
    edge(id.scoringCleanupProgress, "gates", id.simultaneousResolution,
      "victory_point_scoring_gate_v1"),
    edge(id.simultaneousResolution, "includes", id.scoringAction,
      "victory_point_scoring_exact_domain_v1"),
    edge(id.scoringAction, "includes", id.actionType,
      "victory_point_scoring_exact_domain_v1"),
    ...readFields.map((from) => edge(from, "invalidates", id.scoringAction,
      "victory_point_scoring_state_invalidation_v1")),
    edge(id.matchBinding, "invalidates", id.scoringAction,
      "victory_point_scoring_state_invalidation_v1"),
    edge(id.scoringAction, "derives", id.scoringEvent,
      "victory_point_scoring_apply_v1"),
    edge(id.scoringEvent, "writes", id.scores, "victory_point_scoring_apply_v1"),
    edge(id.scoringEvent, "writes", id.victoryPointScoringHistory,
      "victory_point_scoring_apply_v1"),
    edge(id.scoringEvent, "writes", id.scoringCleanupProgress,
      "victory_point_scoring_apply_v1"),
    edge(id.scoringEvent, "writes", id.log, "victory_point_scoring_apply_v1"),
    edge(id.simultaneousResolution, "verified_by", id.exactActionTest,
      "victory_point_scoring_judge_v1"),
    edge(id.scoringAction, "verified_by", id.forgedActionTest,
      "victory_point_scoring_judge_v1"),
    edge(id.firstPlayerSideKey, "verified_by", id.seatAndLifecycleTest,
      "victory_point_scoring_judge_v1"),
    edge(id.scoringCleanupProgress, "verified_by", id.seatAndLifecycleTest,
      "victory_point_scoring_judge_v1"),
    edge(id.officialScoringBinding, "verified_by", id.sourceBindingTest,
      "victory_point_scoring_judge_v1"),
    edge(id.supplyLossLedger, "verified_by", id.zeroSupplyTest,
      "victory_point_scoring_judge_v1"),
    edge(id.affinityBreakdowns, "verified_by", id.affinityTest,
      "victory_point_scoring_judge_v1"),
    edge(id.scores, "verified_by", id.simultaneousTest,
      "victory_point_scoring_judge_v1"),
    edge(id.protectedState, "verified_by", id.protectedStateTest,
      "victory_point_scoring_judge_v1"),
    edge(id.scoringEvent, "verified_by", id.replayTest,
      "victory_point_scoring_judge_v1"),
    edge(id.historicalExecutor, "verified_by", id.historicalTest,
      "victory_point_scoring_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "victory_point_scoring_judge_v1"),
    edge(id.historicalExecutor, "superseded_by", id.currentExecutor,
      "victory_point_scoring_executor_ancestry_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "victory_point_scoring_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "superseded_by", id.currentCatalogueRelease,
      "victory_point_scoring_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "superseded_by", id.currentRuntimeRelease,
      "victory_point_scoring_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "victory_point_scoring_state_contract_v1",
    "victory_point_scoring_exact_domain_v1",
    "victory_point_scoring_marker_projection_v1",
    "victory_point_scoring_score_projection_v1",
    "victory_point_scoring_protected_projection_v1",
    "victory_point_scoring_official_binding_v1",
    "victory_point_scoring_affinity_resolution_v1",
    "victory_point_scoring_simultaneous_resolution_v1",
    "victory_point_scoring_gate_v1",
    "victory_point_scoring_state_invalidation_v1",
    "victory_point_scoring_apply_v1",
    "victory_point_scoring_judge_v1",
    "victory_point_scoring_executor_ancestry_v1",
    "victory_point_scoring_slice_ancestry_v1",
    "victory_point_scoring_catalogue_ancestry_v1",
    "victory_point_scoring_runtime_ancestry_v1",
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
      OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_VICTORY_POINT_SCORING_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
        requiredNodeIds: [...new Set([
          ...readFields,
          ...protectedFields,
          id.matchBinding,
          id.markerControlSnapshot,
          id.scoreSnapshot,
          id.protectedState,
          id.officialScoringBinding,
          id.affinityBreakdowns,
          id.simultaneousResolution,
          id.scoringAction,
          id.actionType,
          id.scoringEvent,
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
            from: id.board,
            to: id.affinityTest,
            relationships: ["projects_to", "derives", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.scores,
            to: id.simultaneousTest,
            relationships: ["verified_by"],
            maxDepth: 2,
          },
          {
            from: id.scoringAction,
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
          from: id.scoringEvent,
          to,
          relationships: ["writes"],
          maxDepth: 2,
        })),
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
