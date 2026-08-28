import {
  createOfficialHoldPositionEndGameRelationshipExtensionV1,
  OFFICIAL_HOLD_POSITION_END_GAME_RELATIONSHIP_NODE_IDS_V1,
} from "./official-hold-position-end-game-relationship-contract-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION,
} from "./official-end-of-round-effects-executor-v2.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION,
} from "./official-optical-flare-lifecycle-executors-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION,
} from "./official-stimpack-lifecycle-executors-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION,
} from "./official-end-of-round-effects-executor-v5.mjs";

export const OFFICIAL_END_OF_ROUND_EFFECTS_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-end-of-round-effects-v2-v3-v5";

const PREVIOUS_CATALOGUE_HASH =
  "87cd066376e8ab637ee5083711e11e3dfc8e491d47745baf9706cc4f9771b181";
const PREVIOUS_RUNTIME_HASH =
  "ecb2e9001d8a8f42cf45adb695bfc977dc79889fa8a6aacda258951b90d9cf64";
const EXPECTED_CATALOGUE_HASH =
  "47f128f34764e9c6a15193dfe1a99906290ea5073da8033d1a7296e8e8d67dd9";
const EXPECTED_RUNTIME_HASH =
  "ec37637bc787d6d5870db5c02fa84f53b077d54f177542bd8282b710f42eb089";

const previousIds = OFFICIAL_HOLD_POSITION_END_GAME_RELATIONSHIP_NODE_IDS_V1;

export const OFFICIAL_END_OF_ROUND_EFFECTS_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  round: previousIds.round,
  phase: previousIds.phase,
  firstPlayerSideKey: previousIds.firstPlayerSideKey,
  players: previousIds.players,
  pieces: previousIds.pieces,
  statuses: "state_field:pieces[].statuses",
  combatEffects: "state_field:pieces[].combatEffects",
  damageMarker: "state_field:pieces[].damageMarker",
  board: previousIds.board,
  effectMarkers: "state_field:board.effectMarkers",
  scores: previousIds.scores,
  cardResources: previousIds.cardResources,
  officialGameplayDataBundle: previousIds.officialGameplayDataBundle,
  officialMissionSetupBinding: previousIds.officialMissionSetupBinding,
  scoringCleanupProgress: previousIds.scoringCleanupProgress,
  terminal: previousIds.terminal,
  gameOver: previousIds.gameOver,
  winner: previousIds.winner,
  terminalReason: previousIds.terminalReason,
  endOfRoundEffectHistory: "state_field:endOfRoundEffectHistory",
  log: previousIds.log,
  matchBinding: "semantic_projection:endOfRoundEffects.matchBindingV5",
  sourceMaterial: "semantic_projection:endOfRoundEffects.officialSourceMaterialV5",
  effectQueueProof: "derived_value:endOfRoundEffects.effectQueueProofV5",
  protectedState: "semantic_projection:endOfRoundEffects.protectedStateV5",
  baseBranch: "action_variant:endOfRoundEffects.emptyQueueV2",
  opticalFlareBranch: "action_variant:endOfRoundEffects.opticalFlarePersistenceV3",
  stimpackBranch: "action_variant:endOfRoundEffects.stimpackPersistenceV5",
  exactAction: "action_variant:endOfRoundEffects.exactPublicActionV5",
  actionType: `action_type:${OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE}`,
  resolvedEvent: "state_event:end_of_round_effect_window_resolved",
  exactActionTest: "judge_test:end-of-round-effects-v5-exact-public-action-v1",
  forgedActionTest: "judge_test:end-of-round-effects-v5-forged-action-rejected-v1",
  emptyQueueTest: "judge_test:end-of-round-effects-v2-empty-queue-v1",
  opticalFlareTest: "judge_test:end-of-round-effects-v3-optical-flare-persists-v1",
  stimpackTest: "judge_test:end-of-round-effects-v5-stimpack-persists-v1",
  damageRetentionTest: "judge_test:end-of-round-effects-v5-damage-retained-v1",
  firstPlayerTest: "judge_test:end-of-round-effects-first-player-only-v1",
  staleProofTest: "judge_test:end-of-round-effects-source-progress-and-status-drift-v1",
  protectedStateTest: "judge_test:end-of-round-effects-protected-state-v1",
  authorityTest: "judge_test:end-of-round-effects-authority-confirm-apply-v1",
  replayTest: "judge_test:end-of-round-effects-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:end-of-round-effects-v2-v3-v4-history-display-v1",
  relationshipTest: "judge_test:end-of-round-effects-relationship-negative-gap-v1",
  v2Executor:
    `executor:${OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION}`,
  v3Executor:
    `executor:${OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION}`,
  historicalV4Executor:
    `executor:${OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID}`
    + `@${OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION}`,
  v5Executor:
    `executor:${OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID}`
    + `@${OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION}`,
  previousSliceRelease: previousIds.currentSliceRelease,
  currentSliceRelease:
    "slice_release:slice-58-existing-end-of-round-effects-contract-closure-v1",
  previousCatalogueRelease: previousIds.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-58-current",
  previousRuntimeRelease: previousIds.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-58-current",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_END_OF_ROUND_EFFECTS_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_END_OF_ROUND_EFFECTS_RELATIONSHIP_SCOPE_ID,
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
    scopeId: `${OFFICIAL_END_OF_ROUND_EFFECTS_RELATIONSHIP_SCOPE_ID}:${executorId}`,
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
      common.id.effectQueueProof,
      common.id.protectedState,
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

export function createOfficialEndOfRoundEffectsRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("END_OF_ROUND_RELATIONSHIP_CURRENT_RELEASE_INVALID", `${catalogueHash}:${runtimeHash}`);
  }
  const previous = createOfficialHoldPositionEndGameRelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const id = OFFICIAL_END_OF_ROUND_EFFECTS_RELATIONSHIP_NODE_IDS_V1;
  const tests = [
    id.exactActionTest,
    id.forgedActionTest,
    id.emptyQueueTest,
    id.opticalFlareTest,
    id.stimpackTest,
    id.damageRetentionTest,
    id.firstPlayerTest,
    id.staleProofTest,
    id.protectedStateTest,
    id.authorityTest,
    id.replayTest,
    id.historicalTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.combatEffects, "state_field", "Typed combat effects on each Unit"),
    node(id.endOfRoundEffectHistory, "state_field", "Append-only end-of-round history"),
    node(id.matchBinding, "semantic_projection", "Current source and runtime MatchBinding"),
    node(id.sourceMaterial, "semantic_projection",
      "Exact Unit, mission, card, status, marker and damage source material"),
    node(id.effectQueueProof, "derived_value", "State-bound complete end-of-round queue proof"),
    node(id.protectedState, "semantic_projection",
      "Pieces, statuses, markers, damage, resources, score and terminal state preserved"),
    node(id.baseBranch, "action_variant", "No active end-of-round effects"),
    node(id.opticalFlareBranch, "action_variant",
      "Optical Flare persists until Cleanup and Refresh"),
    node(id.stimpackBranch, "action_variant",
      "Stimpack buffs persist while Non-Lethal damage is retained"),
    node(id.exactAction, "action_variant", "Exact current v5 public action"),
    node(id.resolvedEvent, "state_event", "End-of-round effect window resolved"),
    ...tests.map((testId) => node(testId, "judge_test", testId.replace(/^judge_test:/u, ""))),
    node(id.historicalV4Executor, "executor", "Frozen historical End-of-Round v4"),
    node(id.currentSliceRelease, "slice_release", "Slice 58 End-of-Round contract closure"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 58 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 58 runtime ${runtimeHash}`),
  ];
  const readFields = [
    id.round,
    id.phase,
    id.firstPlayerSideKey,
    id.players,
    id.pieces,
    id.statuses,
    id.combatEffects,
    id.damageMarker,
    id.effectMarkers,
    id.scores,
    id.cardResources,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.scoringCleanupProgress,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const protectedFields = [
    id.round,
    id.phase,
    id.firstPlayerSideKey,
    id.players,
    id.pieces,
    id.statuses,
    id.combatEffects,
    id.damageMarker,
    id.board,
    id.effectMarkers,
    id.scores,
    id.cardResources,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const writableFields = [id.endOfRoundEffectHistory, id.scoringCleanupProgress, id.log];
  const executors = [
    { nodeId: id.v2Executor, branch: id.baseBranch },
    { nodeId: id.v3Executor, branch: id.opticalFlareBranch },
    { nodeId: id.v5Executor, branch: id.stimpackBranch },
  ];
  const relations = [
    ...executors.flatMap(({ nodeId, branch }) => [
      ...readFields.map((to) => edge(nodeId, "reads", to,
        "end_of_round_effects_state_contract_v1")),
      edge(nodeId, "reads", id.matchBinding, "end_of_round_effects_state_contract_v1"),
      edge(nodeId, "exposes", branch, "end_of_round_effects_branch_domain_v1"),
    ]),
    ...[id.officialGameplayDataBundle, id.officialMissionSetupBinding, id.pieces,
      id.statuses, id.combatEffects, id.damageMarker, id.effectMarkers,
      id.cardResources].map((from) => edge(from, "projects_to", id.sourceMaterial,
      "end_of_round_effects_source_projection_v1")),
    ...protectedFields.map((from) => edge(from, "projects_to", id.protectedState,
      "end_of_round_effects_protected_projection_v1")),
    edge(id.sourceMaterial, "derives", id.effectQueueProof,
      "end_of_round_effects_queue_derivation_v1"),
    edge(id.scoringCleanupProgress, "derives", id.effectQueueProof,
      "end_of_round_effects_queue_derivation_v1"),
    edge(id.matchBinding, "derives", id.effectQueueProof,
      "end_of_round_effects_queue_derivation_v1"),
    edge(id.effectQueueProof, "includes", id.baseBranch,
      "end_of_round_effects_branch_domain_v1"),
    edge(id.effectQueueProof, "includes", id.opticalFlareBranch,
      "end_of_round_effects_branch_domain_v1"),
    edge(id.effectQueueProof, "includes", id.stimpackBranch,
      "end_of_round_effects_branch_domain_v1"),
    edge(id.baseBranch, "includes", id.exactAction,
      "end_of_round_effects_exact_action_v1"),
    edge(id.opticalFlareBranch, "includes", id.exactAction,
      "end_of_round_effects_exact_action_v1"),
    edge(id.stimpackBranch, "includes", id.exactAction,
      "end_of_round_effects_exact_action_v1"),
    edge(id.exactAction, "includes", id.actionType,
      "end_of_round_effects_exact_action_v1"),
    ...readFields.map((from) => edge(from, "invalidates", id.exactAction,
      "end_of_round_effects_state_invalidation_v1")),
    edge(id.matchBinding, "invalidates", id.exactAction,
      "end_of_round_effects_state_invalidation_v1"),
    edge(id.exactAction, "derives", id.resolvedEvent, "end_of_round_effects_apply_v1"),
    ...writableFields.map((to) => edge(id.resolvedEvent, "writes", to,
      "end_of_round_effects_apply_v1")),
    edge(id.exactAction, "verified_by", id.exactActionTest,
      "end_of_round_effects_judge_v1"),
    edge(id.exactAction, "verified_by", id.forgedActionTest,
      "end_of_round_effects_judge_v1"),
    edge(id.baseBranch, "verified_by", id.emptyQueueTest,
      "end_of_round_effects_judge_v1"),
    edge(id.opticalFlareBranch, "verified_by", id.opticalFlareTest,
      "end_of_round_effects_judge_v1"),
    edge(id.stimpackBranch, "verified_by", id.stimpackTest,
      "end_of_round_effects_judge_v1"),
    edge(id.protectedState, "verified_by", id.damageRetentionTest,
      "end_of_round_effects_judge_v1"),
    edge(id.firstPlayerSideKey, "verified_by", id.firstPlayerTest,
      "end_of_round_effects_judge_v1"),
    edge(id.effectQueueProof, "verified_by", id.staleProofTest,
      "end_of_round_effects_judge_v1"),
    edge(id.protectedState, "verified_by", id.protectedStateTest,
      "end_of_round_effects_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.authorityTest,
      "end_of_round_effects_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.replayTest,
      "end_of_round_effects_judge_v1"),
    edge(id.historicalV4Executor, "verified_by", id.historicalTest,
      "end_of_round_effects_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "end_of_round_effects_judge_v1"),
    edge(id.v2Executor, "retained_by", id.v5Executor,
      "end_of_round_effects_executor_ancestry_v1"),
    edge(id.v3Executor, "retained_by", id.v5Executor,
      "end_of_round_effects_executor_ancestry_v1"),
    edge(id.historicalV4Executor, "superseded_by", id.v5Executor,
      "end_of_round_effects_executor_ancestry_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "end_of_round_effects_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "superseded_by", id.currentCatalogueRelease,
      "end_of_round_effects_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "superseded_by", id.currentRuntimeRelease,
      "end_of_round_effects_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "end_of_round_effects_source_projection_v1",
    "end_of_round_effects_protected_projection_v1",
    "end_of_round_effects_queue_derivation_v1",
    "end_of_round_effects_exact_action_v1",
    "end_of_round_effects_state_invalidation_v1",
    "end_of_round_effects_apply_v1",
    "end_of_round_effects_judge_v1",
    "end_of_round_effects_executor_ancestry_v1",
    "end_of_round_effects_slice_ancestry_v1",
    "end_of_round_effects_catalogue_ancestry_v1",
    "end_of_round_effects_runtime_ancestry_v1",
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
        lineage.executorId !== OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID
      )),
      {
        executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:end_of_round_effects_v5",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
      OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
      OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      executorScope({
        executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
        executorNodeId: id.v2Executor,
        branchNodeId: id.baseBranch,
        branchTestNodeId: id.emptyQueueTest,
      }, common),
      executorScope({
        executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
        executorNodeId: id.v3Executor,
        branchNodeId: id.opticalFlareBranch,
        branchTestNodeId: id.opticalFlareTest,
      }, common),
      executorScope({
        executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
        executorNodeId: id.v5Executor,
        branchNodeId: id.stimpackBranch,
        branchTestNodeId: id.stimpackTest,
      }, common),
    ],
  };
}
