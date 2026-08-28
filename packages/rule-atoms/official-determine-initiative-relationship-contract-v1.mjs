import {
  createOfficialCleanupRefreshRelationshipExtensionV1,
  OFFICIAL_CLEANUP_REFRESH_RELATIONSHIP_NODE_IDS_V1,
} from "./official-cleanup-refresh-relationship-contract-v1.mjs";
import {
  OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE,
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION,
} from "./official-determine-initiative-executor-v1.mjs";
import {
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION,
} from "./official-determine-initiative-executor-v2.mjs";

export const OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-determine-initiative-v2";

const PREVIOUS_CATALOGUE_HASH =
  "edda61ad6599cf032caa13476412c1a63897c63babb66000f028019f31cb75e6";
const PREVIOUS_RUNTIME_HASH =
  "8698853a5f4804ede9da31b8ee1ebf5e51173c5797b10b6ef730874c524aa79d";
const EXPECTED_CATALOGUE_HASH =
  "b380ab76587944fda653ff4ae088c9433a9c7ed3aaaca6182dace07a93eb8a38";
const EXPECTED_RUNTIME_HASH =
  "e8b303a317e186721fbf5c5f9b4c53236aeeba95487f29b39ba076254f6fcfb7";

const previousIds = OFFICIAL_CLEANUP_REFRESH_RELATIONSHIP_NODE_IDS_V1;

export const OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  round: previousIds.round,
  phase: previousIds.phase,
  activeSideKey: previousIds.activeSideKey,
  firstPlayerSideKey: previousIds.firstPlayerSideKey,
  players: previousIds.players,
  pieces: previousIds.pieces,
  statuses: previousIds.statuses,
  combatEffects: previousIds.combatEffects,
  damageMarker: previousIds.damageMarker,
  board: previousIds.board,
  missionMarkers: previousIds.missionMarkers,
  effectMarkers: previousIds.effectMarkers,
  tokens: previousIds.tokens,
  markers: previousIds.markers,
  scores: previousIds.scores,
  cardResources: previousIds.cardResources,
  phaseFirstActorByRound: previousIds.phaseFirstActorByRound,
  officialGameplayDataBundle: previousIds.officialGameplayDataBundle,
  officialMissionSetupBinding: previousIds.officialMissionSetupBinding,
  scoringCleanupProgress: previousIds.scoringCleanupProgress,
  cleanupRefreshHistory: previousIds.cleanupRefreshHistory,
  endOfRoundEffectHistory: previousIds.endOfRoundEffectHistory,
  terminal: previousIds.terminal,
  gameOver: previousIds.gameOver,
  winner: previousIds.winner,
  terminalReason: previousIds.terminalReason,
  log: previousIds.log,
  supplyLossLedger: "state_field:supplyLossLedger",
  supplyDestroyedThisRound: "state_field:supplyDestroyedThisRound",
  scoringResolvedThisPhase: "state_field:scoringResolvedThisPhase",
  initiativeRollOffHistory: "state_field:initiativeRollOffHistory",
  determineInitiativeHistory: "state_field:determineInitiativeHistory",
  matchBinding: "semantic_projection:determineInitiative.matchBindingV2",
  sourceMaterial: "semantic_projection:determineInitiative.officialSourceMaterialV2",
  cleanupPrefix: "semantic_projection:determineInitiative.completedCleanupPrefixV2",
  initiativeResolution: "derived_value:determineInitiative.resolutionV2",
  chanceSpecification: "derived_value:determineInitiative.hidden2d6ChanceSpecificationV2",
  lowerScoreBranch: "action_variant:determineInitiative.lowerScoreV2",
  tiedRollOffBranch: "action_variant:determineInitiative.tiedRollOffV2",
  exactAction: "action_variant:determineInitiative.exactPublicActionV2",
  actionType: `action_type:${OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE}`,
  rollOffTiedEvent: "state_event:initiative_roll_off_tied_v2",
  initiativeDeterminedEvent: "state_event:initiative_determined_v2",
  exactActionTest: "judge_test:determine-initiative-v2-exact-public-action-v1",
  forgedActionTest: "judge_test:determine-initiative-v2-forged-action-rejected-v1",
  lowerScoreTest: "judge_test:determine-initiative-v2-lower-vp-marker-v1",
  hiddenChanceTest: "judge_test:determine-initiative-v2-hidden-two-d6-v1",
  repeatTieTest: "judge_test:determine-initiative-v2-fresh-ticket-after-tie-v1",
  firstPlayerTest: "judge_test:determine-initiative-v2-first-player-only-v1",
  staleStateTest: "judge_test:determine-initiative-v2-state-drift-rejected-v1",
  protectedStateTest: "judge_test:determine-initiative-v2-protected-state-v1",
  startWindowTest: "judge_test:determine-initiative-v2-start-window-remains-closed-v1",
  authorityTest: "judge_test:determine-initiative-v2-authority-confirm-apply-v1",
  replayTest: "judge_test:determine-initiative-v2-ed25519-chance-replay-v1",
  historicalTest: "judge_test:determine-initiative-v1-source-runtime-display-freeze-v1",
  officialSourceTest: "judge_test:determine-initiative-v2-current-official-source-v1",
  relationshipTest: "judge_test:determine-initiative-v2-relationship-negative-gap-v1",
  historicalV1Executor:
    `executor:${OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID}`
    + `@${OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION}`,
  currentV2Executor:
    `executor:${OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION}`,
  previousSliceRelease: previousIds.currentSliceRelease,
  currentSliceRelease: "slice_release:slice-60-existing-determine-initiative-contract-closure-v1",
  previousCatalogueRelease: previousIds.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-60-current",
  previousRuntimeRelease: previousIds.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-60-current",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialDetermineInitiativeRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("DETERMINE_INITIATIVE_RELATIONSHIP_CURRENT_RELEASE_INVALID",
      `${catalogueHash}:${runtimeHash}`);
  }
  const previous = createOfficialCleanupRefreshRelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const id = OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1;
  const tests = [
    id.exactActionTest,
    id.forgedActionTest,
    id.lowerScoreTest,
    id.hiddenChanceTest,
    id.repeatTieTest,
    id.firstPlayerTest,
    id.staleStateTest,
    id.protectedStateTest,
    id.startWindowTest,
    id.authorityTest,
    id.replayTest,
    id.historicalTest,
    id.officialSourceTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.supplyDestroyedThisRound, "state_field", "Per-seat destroyed Supply summary"),
    node(id.scoringResolvedThisPhase, "state_field", "Per-seat scoring resolution flags"),
    node(id.initiativeRollOffHistory, "state_field", "Append-only initiative Roll-Off history"),
    node(id.determineInitiativeHistory, "state_field", "Append-only initiative result history"),
    node(id.matchBinding, "semantic_projection", "Current data and runtime MatchBinding"),
    node(id.sourceMaterial, "semantic_projection",
      "Current official Core and Hold Position initiative material"),
    node(id.cleanupPrefix, "semantic_projection",
      "Completed marker, scoring, end-game, effect and Cleanup prefix"),
    node(id.initiativeResolution, "derived_value",
      "State-bound lower-score or tied Roll-Off initiative resolution"),
    node(id.chanceSpecification, "derived_value",
      "Four hidden D6 outcomes arranged as two dice per seat"),
    node(id.lowerScoreBranch, "action_variant", "Lower-VP seat receives next marker"),
    node(id.tiedRollOffBranch, "action_variant", "Tied VP uses repeatable hidden 2D6 Roll-Off"),
    node(id.exactAction, "action_variant", "Exact current v2 public Determine Initiative action"),
    node(id.rollOffTiedEvent, "state_event", "Initiative Roll-Off tied and requires a new attempt"),
    node(id.initiativeDeterminedEvent, "state_event",
      "First Player Marker assigned and next round opened"),
    ...tests.map((testId) => node(testId, "judge_test", testId.replace(/^judge_test:/u, ""))),
    node(id.historicalV1Executor, "executor", "Frozen historical Determine Initiative v1"),
    node(id.currentSliceRelease, "slice_release", "Slice 60 Determine Initiative contract closure"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 60 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 60 runtime ${runtimeHash}`),
  ];
  const readFields = [
    id.round,
    id.phase,
    id.activeSideKey,
    id.firstPlayerSideKey,
    id.players,
    id.pieces,
    id.scores,
    id.officialGameplayDataBundle,
    id.scoringCleanupProgress,
    id.cleanupRefreshHistory,
    id.supplyLossLedger,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const protectedFields = [
    id.players,
    id.pieces,
    id.statuses,
    id.combatEffects,
    id.damageMarker,
    id.board,
    id.missionMarkers,
    id.effectMarkers,
    id.tokens,
    id.markers,
    id.scores,
    id.cardResources,
    id.phaseFirstActorByRound,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.cleanupRefreshHistory,
    id.endOfRoundEffectHistory,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const tieWrites = [
    id.scoringCleanupProgress,
    id.initiativeRollOffHistory,
    id.log,
  ];
  const winnerWrites = [
    id.round,
    id.phase,
    id.activeSideKey,
    id.firstPlayerSideKey,
    id.scoringCleanupProgress,
    id.supplyLossLedger,
    id.supplyDestroyedThisRound,
    id.scoringResolvedThisPhase,
    id.initiativeRollOffHistory,
    id.determineInitiativeHistory,
    id.log,
  ];
  const relations = [
    ...readFields.map((to) => edge(id.currentV2Executor, "reads", to,
      "determine_initiative_state_contract_v1")),
    edge(id.currentV2Executor, "reads", id.matchBinding,
      "determine_initiative_state_contract_v1"),
    edge(id.currentV2Executor, "exposes", id.exactAction,
      "determine_initiative_exact_action_v1"),
    edge(id.officialGameplayDataBundle, "projects_to", id.sourceMaterial,
      "determine_initiative_source_projection_v1"),
    ...[
      id.scoringCleanupProgress,
      id.cleanupRefreshHistory,
      id.supplyLossLedger,
    ].map((from) => edge(from, "projects_to", id.cleanupPrefix,
      "determine_initiative_cleanup_projection_v1")),
    edge(id.sourceMaterial, "derives", id.initiativeResolution,
      "determine_initiative_resolution_derivation_v1"),
    edge(id.cleanupPrefix, "derives", id.initiativeResolution,
      "determine_initiative_resolution_derivation_v1"),
    edge(id.scores, "derives", id.initiativeResolution,
      "determine_initiative_resolution_derivation_v1"),
    edge(id.firstPlayerSideKey, "derives", id.initiativeResolution,
      "determine_initiative_resolution_derivation_v1"),
    edge(id.matchBinding, "derives", id.initiativeResolution,
      "determine_initiative_resolution_derivation_v1"),
    edge(id.initiativeResolution, "includes", id.lowerScoreBranch,
      "determine_initiative_branch_domain_v1"),
    edge(id.initiativeResolution, "includes", id.tiedRollOffBranch,
      "determine_initiative_branch_domain_v1"),
    edge(id.tiedRollOffBranch, "includes", id.chanceSpecification,
      "determine_initiative_chance_domain_v1"),
    edge(id.lowerScoreBranch, "includes", id.exactAction,
      "determine_initiative_exact_action_v1"),
    edge(id.tiedRollOffBranch, "includes", id.exactAction,
      "determine_initiative_exact_action_v1"),
    edge(id.exactAction, "includes", id.actionType,
      "determine_initiative_exact_action_v1"),
    ...readFields.map((from) => edge(from, "invalidates", id.exactAction,
      "determine_initiative_state_invalidation_v1")),
    edge(id.matchBinding, "invalidates", id.exactAction,
      "determine_initiative_state_invalidation_v1"),
    edge(id.exactAction, "derives", id.rollOffTiedEvent,
      "determine_initiative_apply_v1"),
    edge(id.exactAction, "derives", id.initiativeDeterminedEvent,
      "determine_initiative_apply_v1"),
    ...tieWrites.map((to) => edge(id.rollOffTiedEvent, "writes", to,
      "determine_initiative_apply_v1")),
    ...winnerWrites.map((to) => edge(id.initiativeDeterminedEvent, "writes", to,
      "determine_initiative_apply_v1")),
    edge(id.exactAction, "verified_by", id.exactActionTest,
      "determine_initiative_judge_v1"),
    edge(id.exactAction, "verified_by", id.forgedActionTest,
      "determine_initiative_judge_v1"),
    edge(id.lowerScoreBranch, "verified_by", id.lowerScoreTest,
      "determine_initiative_judge_v1"),
    edge(id.chanceSpecification, "verified_by", id.hiddenChanceTest,
      "determine_initiative_judge_v1"),
    edge(id.rollOffTiedEvent, "verified_by", id.repeatTieTest,
      "determine_initiative_judge_v1"),
    edge(id.firstPlayerSideKey, "verified_by", id.firstPlayerTest,
      "determine_initiative_judge_v1"),
    edge(id.initiativeResolution, "verified_by", id.staleStateTest,
      "determine_initiative_judge_v1"),
    edge(id.initiativeDeterminedEvent, "verified_by", id.protectedStateTest,
      "determine_initiative_judge_v1"),
    edge(id.initiativeDeterminedEvent, "verified_by", id.startWindowTest,
      "determine_initiative_judge_v1"),
    edge(id.initiativeDeterminedEvent, "verified_by", id.authorityTest,
      "determine_initiative_judge_v1"),
    edge(id.rollOffTiedEvent, "verified_by", id.replayTest,
      "determine_initiative_judge_v1"),
    edge(id.initiativeDeterminedEvent, "verified_by", id.replayTest,
      "determine_initiative_judge_v1"),
    edge(id.historicalV1Executor, "verified_by", id.historicalTest,
      "determine_initiative_judge_v1"),
    edge(id.sourceMaterial, "verified_by", id.officialSourceTest,
      "determine_initiative_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "determine_initiative_judge_v1"),
    edge(id.historicalV1Executor, "superseded_by", id.currentV2Executor,
      "determine_initiative_executor_ancestry_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "determine_initiative_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "retained_by", id.currentCatalogueRelease,
      "determine_initiative_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "retained_by", id.currentRuntimeRelease,
      "determine_initiative_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "determine_initiative_state_contract_v1",
    "determine_initiative_exact_action_v1",
    "determine_initiative_source_projection_v1",
    "determine_initiative_cleanup_projection_v1",
    "determine_initiative_resolution_derivation_v1",
    "determine_initiative_branch_domain_v1",
    "determine_initiative_chance_domain_v1",
    "determine_initiative_state_invalidation_v1",
    "determine_initiative_apply_v1",
    "determine_initiative_judge_v1",
    "determine_initiative_executor_ancestry_v1",
    "determine_initiative_slice_ancestry_v1",
    "determine_initiative_catalogue_ancestry_v1",
    "determine_initiative_runtime_ancestry_v1",
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
      OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
        requiredNodeIds: [...new Set([
          ...readFields,
          ...protectedFields,
          ...tieWrites,
          ...winnerWrites,
          id.matchBinding,
          id.sourceMaterial,
          id.cleanupPrefix,
          id.initiativeResolution,
          id.chanceSpecification,
          id.lowerScoreBranch,
          id.tiedRollOffBranch,
          id.exactAction,
          id.actionType,
          id.rollOffTiedEvent,
          id.initiativeDeterminedEvent,
          id.historicalV1Executor,
          id.currentV2Executor,
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
            to: id.officialSourceTest,
            relationships: ["projects_to", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.scores,
            to: id.lowerScoreTest,
            relationships: ["derives", "includes", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.scores,
            to: id.hiddenChanceTest,
            relationships: ["derives", "includes", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.scoringCleanupProgress,
            to: id.staleStateTest,
            relationships: ["projects_to", "derives", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.exactAction,
            to: id.replayTest,
            relationships: ["derives", "verified_by"],
            maxDepth: 3,
          },
        ],
        forbiddenPaths: protectedFields.map((to) => ({
          from: id.initiativeDeterminedEvent,
          to,
          relationships: ["writes"],
          maxDepth: 2,
        })),
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
