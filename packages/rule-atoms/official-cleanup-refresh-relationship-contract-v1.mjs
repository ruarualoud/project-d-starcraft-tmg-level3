import {
  createOfficialEndOfRoundEffectsRelationshipExtensionV1,
  OFFICIAL_END_OF_ROUND_EFFECTS_RELATIONSHIP_NODE_IDS_V1,
} from "./official-end-of-round-effects-relationship-contract-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
} from "./official-cleanup-refresh-executor-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION,
} from "./official-cleanup-refresh-executor-v2.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION,
} from "./official-optical-flare-lifecycle-executors-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_VERSION,
} from "./official-stimpack-lifecycle-executors-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_VERSION,
} from "./official-cleanup-refresh-executor-v5.mjs";

export const OFFICIAL_CLEANUP_REFRESH_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-cleanup-refresh-v2-v3-v5";

const PREVIOUS_CATALOGUE_HASH =
  "47f128f34764e9c6a15193dfe1a99906290ea5073da8033d1a7296e8e8d67dd9";
const PREVIOUS_RUNTIME_HASH =
  "ec37637bc787d6d5870db5c02fa84f53b077d54f177542bd8282b710f42eb089";
const EXPECTED_CATALOGUE_HASH =
  "edda61ad6599cf032caa13476412c1a63897c63babb66000f028019f31cb75e6";
const EXPECTED_RUNTIME_HASH =
  "8698853a5f4804ede9da31b8ee1ebf5e51173c5797b10b6ef730874c524aa79d";

const previousIds = OFFICIAL_END_OF_ROUND_EFFECTS_RELATIONSHIP_NODE_IDS_V1;

export const OFFICIAL_CLEANUP_REFRESH_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  round: previousIds.round,
  phase: previousIds.phase,
  activeSideKey: "state_field:activeSideKey",
  firstPlayerSideKey: previousIds.firstPlayerSideKey,
  players: previousIds.players,
  firstPassSideByPhase: "state_field:firstPassSideByPhase",
  phaseFirstActorByRound: "state_field:phaseFirstActorByRound",
  pieces: previousIds.pieces,
  statuses: previousIds.statuses,
  combatEffects: previousIds.combatEffects,
  activatedPhases: "state_field:pieces[].activatedPhases",
  damageMarker: previousIds.damageMarker,
  board: previousIds.board,
  missionMarkers: "state_field:board.missionMarkers",
  effectMarkers: previousIds.effectMarkers,
  tokens: "state_field:board.tokens",
  markers: "state_field:board.markers",
  scores: previousIds.scores,
  cardResources: previousIds.cardResources,
  reactionUsage: "state_field:reactionUsage",
  academyReactionUsage: "state_field:academyReactionUsage",
  officialGameplayDataBundle: previousIds.officialGameplayDataBundle,
  officialMissionSetupBinding: previousIds.officialMissionSetupBinding,
  scoringCleanupProgress: previousIds.scoringCleanupProgress,
  endOfRoundEffectHistory: previousIds.endOfRoundEffectHistory,
  cleanupRefreshHistory: "state_field:cleanupRefreshHistory",
  terminal: previousIds.terminal,
  gameOver: previousIds.gameOver,
  winner: previousIds.winner,
  terminalReason: previousIds.terminalReason,
  log: previousIds.log,
  matchBinding: "semantic_projection:cleanupRefresh.matchBindingV5",
  sourceMaterial: "semantic_projection:cleanupRefresh.officialSourceMaterialV5",
  preCleanupMaterial: "semantic_projection:cleanupRefresh.preCleanupMaterialV5",
  retainedMaterial: "semantic_projection:cleanupRefresh.retainedMaterialV5",
  statusCleanup: "derived_value:cleanupRefresh.statusCleanupV5",
  cleanupResolution: "derived_value:cleanupRefresh.cleanupResolutionV5",
  emptyBranch: "action_variant:cleanupRefresh.emptyV2",
  opticalFlareBranch: "action_variant:cleanupRefresh.opticalFlareV3",
  stimpackBranch: "action_variant:cleanupRefresh.stimpackV5",
  exactAction: "action_variant:cleanupRefresh.exactPublicActionV5",
  actionType: `action_type:${OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE}`,
  resolvedEvent: "state_event:cleanup_refresh_completed_v5",
  exactActionTest: "judge_test:cleanup-refresh-v5-exact-public-action-v1",
  forgedActionTest: "judge_test:cleanup-refresh-v5-forged-action-rejected-v1",
  emptyBranchTest: "judge_test:cleanup-refresh-v2-empty-branch-v1",
  opticalFlareTest: "judge_test:cleanup-refresh-v3-optical-flare-removal-v1",
  stimpackTest: "judge_test:cleanup-refresh-v5-stimpack-removal-v1",
  damageRetentionTest: "judge_test:cleanup-refresh-v5-damage-retained-v1",
  cardRefreshTest: "judge_test:cleanup-refresh-v5-card-refresh-v1",
  resetTest: "judge_test:cleanup-refresh-v5-activation-pass-ledger-reset-v1",
  firstPlayerTest: "judge_test:cleanup-refresh-v5-first-player-only-v1",
  staleProofTest: "judge_test:cleanup-refresh-v5-source-progress-status-drift-v1",
  protectedStateTest: "judge_test:cleanup-refresh-v5-protected-state-v1",
  authorityTest: "judge_test:cleanup-refresh-v5-authority-confirm-apply-v1",
  replayTest: "judge_test:cleanup-refresh-v5-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:cleanup-refresh-v2-v3-v4-history-display-v1",
  relationshipTest: "judge_test:cleanup-refresh-v5-relationship-negative-gap-v1",
  v2Executor:
    `executor:${OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION}`,
  v3Executor:
    `executor:${OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION}`,
  historicalV4Executor:
    `executor:${OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID}`
    + `@${OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_VERSION}`,
  v5Executor:
    `executor:${OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID}`
    + `@${OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_VERSION}`,
  previousSliceRelease: previousIds.currentSliceRelease,
  currentSliceRelease: "slice_release:slice-59-existing-cleanup-refresh-contract-closure-v1",
  previousCatalogueRelease: previousIds.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-59-current",
  previousRuntimeRelease: previousIds.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-59-current",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: OFFICIAL_CLEANUP_REFRESH_RELATIONSHIP_SCOPE_ID };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_CLEANUP_REFRESH_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

function executorScope({ executorId, executorNodeId, branchNodeId, branchTestNodeId }, common) {
  const executorEdges = common.relations.filter((relation) => (
    relation.from === executorNodeId
      || relation.to === executorNodeId
      || relation.from === branchNodeId
      || relation.to === branchNodeId
  ));
  return {
    scopeId: `${OFFICIAL_CLEANUP_REFRESH_RELATIONSHIP_SCOPE_ID}:${executorId}`,
    executorId,
    requiredNodeIds: [...new Set([
      ...common.readFields,
      ...common.protectedFields,
      ...common.writableFields,
      executorNodeId,
      branchNodeId,
      branchTestNodeId,
      common.id.matchBinding,
      common.id.sourceMaterial,
      common.id.preCleanupMaterial,
      common.id.retainedMaterial,
      common.id.statusCleanup,
      common.id.cleanupResolution,
      common.id.exactAction,
      common.id.actionType,
      common.id.resolvedEvent,
      common.id.previousSliceRelease,
      common.id.currentSliceRelease,
      common.id.previousCatalogueRelease,
      common.id.currentCatalogueRelease,
      common.id.previousRuntimeRelease,
      common.id.currentRuntimeRelease,
      ...common.tests,
    ])],
    requiredEdges: [...common.requiredEdges, ...executorEdges],
    requiredPaths: [
      {
        from: common.id.officialGameplayDataBundle,
        to: common.id.staleProofTest,
        relationships: ["projects_to", "derives", "verified_by"],
        maxDepth: 5,
      },
      {
        from: common.id.pieces,
        to: branchTestNodeId,
        relationships: ["projects_to", "derives", "includes", "verified_by"],
        maxDepth: 6,
      },
      {
        from: common.id.exactAction,
        to: common.id.replayTest,
        relationships: ["derives", "verified_by"],
        maxDepth: 3,
      },
    ],
    forbiddenPaths: common.protectedFields.map((to) => ({
      from: common.id.resolvedEvent,
      to,
      relationships: ["writes"],
      maxDepth: 2,
    })),
    evidenceTestNodeIds: common.tests,
  };
}

export function createOfficialCleanupRefreshRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("CLEANUP_REFRESH_RELATIONSHIP_CURRENT_RELEASE_INVALID",
      `${catalogueHash}:${runtimeHash}`);
  }
  const previous = createOfficialEndOfRoundEffectsRelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const id = OFFICIAL_CLEANUP_REFRESH_RELATIONSHIP_NODE_IDS_V1;
  const tests = [
    id.exactActionTest,
    id.forgedActionTest,
    id.emptyBranchTest,
    id.opticalFlareTest,
    id.stimpackTest,
    id.damageRetentionTest,
    id.cardRefreshTest,
    id.resetTest,
    id.firstPlayerTest,
    id.staleProofTest,
    id.protectedStateTest,
    id.authorityTest,
    id.replayTest,
    id.historicalTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.activatedPhases, "state_field", "Per-Unit phase activation flags"),
    node(id.missionMarkers, "state_field", "Persistent mission marker state"),
    node(id.tokens, "state_field", "Generic board tokens must be empty in scope"),
    node(id.markers, "state_field", "Generic board markers must be empty in scope"),
    node(id.reactionUsage, "state_field", "Per-activation reaction ledger"),
    node(id.academyReactionUsage, "state_field", "Per-round Academy reaction ledger"),
    node(id.cleanupRefreshHistory, "state_field", "Append-only Cleanup history"),
    node(id.matchBinding, "semantic_projection", "Current data and runtime MatchBinding"),
    node(id.sourceMaterial, "semantic_projection",
      "Exact official Marine, mission and cleanup-card source material"),
    node(id.preCleanupMaterial, "semantic_projection",
      "Exact cards, activations, passes, ledgers, statuses and markers before Cleanup"),
    node(id.retainedMaterial, "semantic_projection",
      "Scores, damage, mission material and actor history retained through Cleanup"),
    node(id.statusCleanup, "derived_value", "Branch-exact status and marker removal receipt"),
    node(id.cleanupResolution, "derived_value", "State-bound Cleanup v5 resolution"),
    node(id.emptyBranch, "action_variant", "Empty-status current Cleanup using v2 atoms"),
    node(id.opticalFlareBranch, "action_variant", "Optical Flare removal using v3 atoms"),
    node(id.stimpackBranch, "action_variant", "Stimpack removal using current v5 atoms"),
    node(id.exactAction, "action_variant", "Exact current v5 public Cleanup action"),
    node(id.resolvedEvent, "state_event", "Cleanup and Refresh completed"),
    ...tests.map((testId) => node(testId, "judge_test", testId.replace(/^judge_test:/u, ""))),
    node(id.historicalV4Executor, "executor", "Frozen historical Cleanup v4"),
    node(id.currentSliceRelease, "slice_release", "Slice 59 Cleanup contract closure"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 59 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 59 runtime ${runtimeHash}`),
  ];
  const readFields = [
    id.round,
    id.phase,
    id.activeSideKey,
    id.firstPlayerSideKey,
    id.players,
    id.firstPassSideByPhase,
    id.phaseFirstActorByRound,
    id.pieces,
    id.statuses,
    id.combatEffects,
    id.activatedPhases,
    id.damageMarker,
    id.board,
    id.missionMarkers,
    id.effectMarkers,
    id.tokens,
    id.markers,
    id.scores,
    id.cardResources,
    id.reactionUsage,
    id.academyReactionUsage,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.scoringCleanupProgress,
    id.endOfRoundEffectHistory,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const protectedFields = [
    id.round,
    id.phase,
    id.firstPlayerSideKey,
    id.phaseFirstActorByRound,
    id.damageMarker,
    id.missionMarkers,
    id.tokens,
    id.markers,
    id.scores,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.endOfRoundEffectHistory,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const writableFields = [
    id.activeSideKey,
    id.players,
    id.firstPassSideByPhase,
    id.pieces,
    id.statuses,
    id.activatedPhases,
    id.effectMarkers,
    id.cardResources,
    id.reactionUsage,
    id.academyReactionUsage,
    id.cleanupRefreshHistory,
    id.scoringCleanupProgress,
    id.log,
  ];
  const executors = [
    { nodeId: id.v2Executor, branch: id.emptyBranch },
    { nodeId: id.v3Executor, branch: id.opticalFlareBranch },
    { nodeId: id.v5Executor, branch: id.stimpackBranch },
  ];
  const relations = [
    ...executors.flatMap(({ nodeId, branch }) => [
      ...readFields.map((to) => edge(nodeId, "reads", to,
        "cleanup_refresh_state_contract_v1")),
      edge(nodeId, "reads", id.matchBinding, "cleanup_refresh_state_contract_v1"),
      edge(nodeId, "exposes", branch, "cleanup_refresh_branch_domain_v1"),
    ]),
    ...[
      id.officialGameplayDataBundle,
      id.officialMissionSetupBinding,
      id.pieces,
      id.cardResources,
    ].map((from) => edge(from, "projects_to", id.sourceMaterial,
      "cleanup_refresh_source_projection_v1")),
    ...[
      id.pieces,
      id.statuses,
      id.activatedPhases,
      id.damageMarker,
      id.effectMarkers,
      id.cardResources,
      id.players,
      id.firstPassSideByPhase,
      id.reactionUsage,
      id.academyReactionUsage,
    ].map((from) => edge(from, "projects_to", id.preCleanupMaterial,
      "cleanup_refresh_material_projection_v1")),
    ...protectedFields.map((from) => edge(from, "projects_to", id.retainedMaterial,
      "cleanup_refresh_retained_projection_v1")),
    edge(id.preCleanupMaterial, "derives", id.statusCleanup,
      "cleanup_refresh_resolution_derivation_v1"),
    edge(id.sourceMaterial, "derives", id.cleanupResolution,
      "cleanup_refresh_resolution_derivation_v1"),
    edge(id.preCleanupMaterial, "derives", id.cleanupResolution,
      "cleanup_refresh_resolution_derivation_v1"),
    edge(id.retainedMaterial, "derives", id.cleanupResolution,
      "cleanup_refresh_resolution_derivation_v1"),
    edge(id.statusCleanup, "derives", id.cleanupResolution,
      "cleanup_refresh_resolution_derivation_v1"),
    edge(id.matchBinding, "derives", id.cleanupResolution,
      "cleanup_refresh_resolution_derivation_v1"),
    edge(id.scoringCleanupProgress, "derives", id.cleanupResolution,
      "cleanup_refresh_resolution_derivation_v1"),
    edge(id.cleanupResolution, "includes", id.emptyBranch,
      "cleanup_refresh_branch_domain_v1"),
    edge(id.cleanupResolution, "includes", id.opticalFlareBranch,
      "cleanup_refresh_branch_domain_v1"),
    edge(id.cleanupResolution, "includes", id.stimpackBranch,
      "cleanup_refresh_branch_domain_v1"),
    edge(id.emptyBranch, "includes", id.exactAction, "cleanup_refresh_exact_action_v1"),
    edge(id.opticalFlareBranch, "includes", id.exactAction,
      "cleanup_refresh_exact_action_v1"),
    edge(id.stimpackBranch, "includes", id.exactAction,
      "cleanup_refresh_exact_action_v1"),
    edge(id.exactAction, "includes", id.actionType, "cleanup_refresh_exact_action_v1"),
    ...readFields.map((from) => edge(from, "invalidates", id.exactAction,
      "cleanup_refresh_state_invalidation_v1")),
    edge(id.matchBinding, "invalidates", id.exactAction,
      "cleanup_refresh_state_invalidation_v1"),
    edge(id.exactAction, "derives", id.resolvedEvent, "cleanup_refresh_apply_v1"),
    ...writableFields.map((to) => edge(id.resolvedEvent, "writes", to,
      "cleanup_refresh_apply_v1")),
    edge(id.exactAction, "verified_by", id.exactActionTest, "cleanup_refresh_judge_v1"),
    edge(id.exactAction, "verified_by", id.forgedActionTest, "cleanup_refresh_judge_v1"),
    edge(id.emptyBranch, "verified_by", id.emptyBranchTest, "cleanup_refresh_judge_v1"),
    edge(id.opticalFlareBranch, "verified_by", id.opticalFlareTest,
      "cleanup_refresh_judge_v1"),
    edge(id.stimpackBranch, "verified_by", id.stimpackTest, "cleanup_refresh_judge_v1"),
    edge(id.retainedMaterial, "verified_by", id.damageRetentionTest,
      "cleanup_refresh_judge_v1"),
    edge(id.cleanupResolution, "verified_by", id.cardRefreshTest,
      "cleanup_refresh_judge_v1"),
    edge(id.preCleanupMaterial, "verified_by", id.resetTest, "cleanup_refresh_judge_v1"),
    edge(id.firstPlayerSideKey, "verified_by", id.firstPlayerTest,
      "cleanup_refresh_judge_v1"),
    edge(id.cleanupResolution, "verified_by", id.staleProofTest,
      "cleanup_refresh_judge_v1"),
    edge(id.retainedMaterial, "verified_by", id.protectedStateTest,
      "cleanup_refresh_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.authorityTest, "cleanup_refresh_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.replayTest, "cleanup_refresh_judge_v1"),
    edge(id.historicalV4Executor, "verified_by", id.historicalTest,
      "cleanup_refresh_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "cleanup_refresh_judge_v1"),
    edge(id.v2Executor, "retained_by", id.v5Executor, "cleanup_refresh_executor_ancestry_v1"),
    edge(id.v3Executor, "retained_by", id.v5Executor, "cleanup_refresh_executor_ancestry_v1"),
    edge(id.historicalV4Executor, "superseded_by", id.v5Executor,
      "cleanup_refresh_executor_ancestry_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "cleanup_refresh_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "superseded_by", id.currentCatalogueRelease,
      "cleanup_refresh_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "superseded_by", id.currentRuntimeRelease,
      "cleanup_refresh_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "cleanup_refresh_source_projection_v1",
    "cleanup_refresh_material_projection_v1",
    "cleanup_refresh_retained_projection_v1",
    "cleanup_refresh_resolution_derivation_v1",
    "cleanup_refresh_exact_action_v1",
    "cleanup_refresh_state_invalidation_v1",
    "cleanup_refresh_apply_v1",
    "cleanup_refresh_judge_v1",
    "cleanup_refresh_executor_ancestry_v1",
    "cleanup_refresh_slice_ancestry_v1",
    "cleanup_refresh_catalogue_ancestry_v1",
    "cleanup_refresh_runtime_ancestry_v1",
  ]);
  const requiredEdges = relations.filter((relation) => (
    requiredProvenance.has(relation.provenance)
  ));
  const common = {
    id,
    tests,
    readFields,
    protectedFields,
    writableFields,
    relations,
    requiredEdges,
  };
  return {
    nodes: [...previous.nodes, ...nodes],
    edges: [...previous.edges, ...relations],
    executorLineages: [
      ...previous.executorLineages.filter((lineage) => (
        lineage.executorId !== OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID
      )),
      {
        executorId: OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:cleanup_refresh_v5",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
      OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
      OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      executorScope({
        executorId: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
        executorNodeId: id.v2Executor,
        branchNodeId: id.emptyBranch,
        branchTestNodeId: id.emptyBranchTest,
      }, common),
      executorScope({
        executorId: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
        executorNodeId: id.v3Executor,
        branchNodeId: id.opticalFlareBranch,
        branchTestNodeId: id.opticalFlareTest,
      }, common),
      executorScope({
        executorId: OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
        executorNodeId: id.v5Executor,
        branchNodeId: id.stimpackBranch,
        branchTestNodeId: id.stimpackTest,
      }, common),
    ],
  };
}
