import {
  createOfficialDetermineInitiativeRelationshipExtensionV1,
  OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1,
} from "./official-determine-initiative-relationship-contract-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION,
} from "./official-start-of-round-executor-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION,
} from "./official-start-of-round-executor-v2.mjs";

export const OFFICIAL_START_OF_ROUND_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-start-of-round-v2";

const PREVIOUS_CATALOGUE_HASH =
  "b380ab76587944fda653ff4ae088c9433a9c7ed3aaaca6182dace07a93eb8a38";
const PREVIOUS_RUNTIME_HASH =
  "e8b303a317e186721fbf5c5f9b4c53236aeeba95487f29b39ba076254f6fcfb7";
const EXPECTED_CATALOGUE_HASH =
  "70f8a9b7e69c45f788aa3d967417a04898dfeff2855e64760bd5ae397a318529";
const EXPECTED_RUNTIME_HASH =
  "b4a63b98baebc6fc74f43356d94b4e61f1456c3c561ef9c771083644a29c1a99";

const previousIds = OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1;

export const OFFICIAL_START_OF_ROUND_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
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
  cleanupRefreshHistory: previousIds.cleanupRefreshHistory,
  initiativeRollOffHistory: previousIds.initiativeRollOffHistory,
  determineInitiativeHistory: previousIds.determineInitiativeHistory,
  terminal: previousIds.terminal,
  gameOver: previousIds.gameOver,
  winner: previousIds.winner,
  terminalReason: previousIds.terminalReason,
  log: previousIds.log,
  officialRoundSupplyState: "state_field:officialRoundSupplyState",
  startOfRoundHistory: "state_field:startOfRoundHistory",
  matchBinding: "semantic_projection:startOfRound.matchBindingV2",
  sourceMaterial: "semantic_projection:startOfRound.officialSourceMaterialV2",
  handoffPrefix: "semantic_projection:startOfRound.currentInitiativeHandoffV2",
  unitMaterial: "semantic_projection:startOfRound.unitMaterialV2",
  cardMaterial: "semantic_projection:startOfRound.cardMaterialV2",
  supplyResolution: "derived_value:startOfRound.roundSupplyStateV2",
  effectQueue: "derived_value:startOfRound.effectQueueV2",
  exactAction: "action_variant:startOfRound.exactPublicActionV2",
  actionType: `action_type:${OFFICIAL_START_OF_ROUND_ACTION_TYPE}`,
  resolvedEvent: "state_event:start_of_round_resolved_v2",
  exactActionTest: "judge_test:start-of-round-v2-exact-public-action-v1",
  forgedHistoryTest: "judge_test:start-of-round-v2-forged-initiative-history-v1",
  officialSourceTest: "judge_test:start-of-round-v2-current-official-source-v1",
  firstPlayerTest: "judge_test:start-of-round-v2-first-player-only-v1",
  finiteSupplyTest: "judge_test:start-of-round-v2-finite-supply-v1",
  finalSupplyTest: "judge_test:start-of-round-v2-final-round-unlimited-supply-v1",
  reserveSupplyTest: "judge_test:start-of-round-v2-reserve-exclusion-v1",
  stationaryTest: "judge_test:start-of-round-v2-stationary-grant-v1",
  readyCardTest: "judge_test:start-of-round-v2-card-ready-v1",
  effectOrderTest: "judge_test:start-of-round-v2-effect-order-v1",
  protectedStateTest: "judge_test:start-of-round-v2-protected-state-v1",
  authorityTest: "judge_test:start-of-round-v2-authority-confirm-apply-v1",
  replayTest: "judge_test:start-of-round-v2-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:start-of-round-v1-runtime-display-freeze-v1",
  relationshipTest: "judge_test:start-of-round-v2-relationship-negative-gap-v1",
  historicalV1Executor:
    `executor:${OFFICIAL_START_OF_ROUND_EXECUTOR_ID}`
    + `@${OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION}`,
  currentV2Executor:
    `executor:${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION}`,
  previousSliceRelease: previousIds.currentSliceRelease,
  currentSliceRelease: "slice_release:slice-61-existing-start-of-round-contract-closure-v1",
  previousCatalogueRelease: previousIds.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-61-current",
  previousRuntimeRelease: previousIds.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-61-current",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: OFFICIAL_START_OF_ROUND_RELATIONSHIP_SCOPE_ID };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_START_OF_ROUND_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialStartOfRoundRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("START_OF_ROUND_RELATIONSHIP_CURRENT_RELEASE_INVALID",
      `${catalogueHash}:${runtimeHash}`);
  }
  const previous = createOfficialDetermineInitiativeRelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const id = OFFICIAL_START_OF_ROUND_RELATIONSHIP_NODE_IDS_V1;
  const tests = [
    id.exactActionTest,
    id.forgedHistoryTest,
    id.officialSourceTest,
    id.firstPlayerTest,
    id.finiteSupplyTest,
    id.finalSupplyTest,
    id.reserveSupplyTest,
    id.stationaryTest,
    id.readyCardTest,
    id.effectOrderTest,
    id.protectedStateTest,
    id.authorityTest,
    id.replayTest,
    id.historicalTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.officialRoundSupplyState, "state_field", "Current round Supply state"),
    node(id.startOfRoundHistory, "state_field", "Append-only Start-of-Round history"),
    node(id.matchBinding, "semantic_projection", "Current data and runtime MatchBinding"),
    node(id.sourceMaterial, "semantic_projection",
      "Current official Core, Hold Position, Marine and card material"),
    node(id.handoffPrefix, "semantic_projection",
      "Exact Cleanup v5 and Determine Initiative v2 handoff"),
    node(id.unitMaterial, "semantic_projection", "Exact live, reserve and destroyed Unit material"),
    node(id.cardMaterial, "semantic_projection", "Exact supported card readiness material"),
    node(id.supplyResolution, "derived_value", "Finite or final-round Supply resolution"),
    node(id.effectQueue, "derived_value", "First-Player-then-opponent mandatory effect queue"),
    node(id.exactAction, "action_variant", "Exact current v2 public Start-of-Round action"),
    node(id.resolvedEvent, "state_event", "Start-of-Round resolved into Movement"),
    ...tests.map((testId) => node(testId, "judge_test", testId.replace(/^judge_test:/u, ""))),
    node(id.historicalV1Executor, "executor", "Frozen historical Start-of-Round v1"),
    node(id.currentSliceRelease, "slice_release", "Slice 61 Start-of-Round closure"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 61 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 61 runtime ${runtimeHash}`),
  ];
  const readFields = [
    id.round,
    id.phase,
    id.activeSideKey,
    id.firstPlayerSideKey,
    id.players,
    id.pieces,
    id.statuses,
    id.scores,
    id.cardResources,
    id.phaseFirstActorByRound,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.cleanupRefreshHistory,
    id.initiativeRollOffHistory,
    id.determineInitiativeHistory,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const writableFields = [
    id.phase,
    id.activeSideKey,
    id.statuses,
    id.cardResources,
    id.officialRoundSupplyState,
    id.startOfRoundHistory,
    id.log,
  ];
  const protectedFields = [
    id.round,
    id.firstPlayerSideKey,
    id.players,
    id.pieces,
    id.combatEffects,
    id.damageMarker,
    id.board,
    id.missionMarkers,
    id.effectMarkers,
    id.tokens,
    id.markers,
    id.scores,
    id.phaseFirstActorByRound,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.cleanupRefreshHistory,
    id.initiativeRollOffHistory,
    id.determineInitiativeHistory,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const relations = [
    ...readFields.map((to) => edge(id.currentV2Executor, "reads", to,
      "start_of_round_state_contract_v1")),
    edge(id.currentV2Executor, "reads", id.matchBinding,
      "start_of_round_state_contract_v1"),
    edge(id.currentV2Executor, "exposes", id.exactAction,
      "start_of_round_exact_action_v1"),
    edge(id.officialGameplayDataBundle, "projects_to", id.sourceMaterial,
      "start_of_round_source_projection_v1"),
    edge(id.officialMissionSetupBinding, "projects_to", id.sourceMaterial,
      "start_of_round_source_projection_v1"),
    ...[
      id.cleanupRefreshHistory,
      id.determineInitiativeHistory,
      id.initiativeRollOffHistory,
      id.firstPlayerSideKey,
    ].map((from) => edge(from, "projects_to", id.handoffPrefix,
      "start_of_round_handoff_projection_v1")),
    edge(id.pieces, "projects_to", id.unitMaterial,
      "start_of_round_material_projection_v1"),
    edge(id.cardResources, "projects_to", id.cardMaterial,
      "start_of_round_material_projection_v1"),
    edge(id.sourceMaterial, "derives", id.supplyResolution,
      "start_of_round_supply_derivation_v1"),
    edge(id.unitMaterial, "derives", id.supplyResolution,
      "start_of_round_supply_derivation_v1"),
    edge(id.handoffPrefix, "derives", id.supplyResolution,
      "start_of_round_supply_derivation_v1"),
    edge(id.handoffPrefix, "derives", id.effectQueue,
      "start_of_round_effect_derivation_v1"),
    edge(id.unitMaterial, "derives", id.effectQueue,
      "start_of_round_effect_derivation_v1"),
    edge(id.cardMaterial, "derives", id.effectQueue,
      "start_of_round_effect_derivation_v1"),
    edge(id.supplyResolution, "includes", id.exactAction,
      "start_of_round_exact_action_v1"),
    edge(id.effectQueue, "includes", id.exactAction,
      "start_of_round_exact_action_v1"),
    edge(id.exactAction, "includes", id.actionType,
      "start_of_round_exact_action_v1"),
    ...readFields.map((from) => edge(from, "invalidates", id.exactAction,
      "start_of_round_state_invalidation_v1")),
    edge(id.matchBinding, "invalidates", id.exactAction,
      "start_of_round_state_invalidation_v1"),
    edge(id.exactAction, "derives", id.resolvedEvent,
      "start_of_round_apply_v1"),
    ...writableFields.map((to) => edge(id.resolvedEvent, "writes", to,
      "start_of_round_apply_v1")),
    edge(id.exactAction, "verified_by", id.exactActionTest,
      "start_of_round_judge_v1"),
    edge(id.handoffPrefix, "verified_by", id.forgedHistoryTest,
      "start_of_round_judge_v1"),
    edge(id.sourceMaterial, "verified_by", id.officialSourceTest,
      "start_of_round_judge_v1"),
    edge(id.firstPlayerSideKey, "verified_by", id.firstPlayerTest,
      "start_of_round_judge_v1"),
    edge(id.supplyResolution, "verified_by", id.finiteSupplyTest,
      "start_of_round_judge_v1"),
    edge(id.supplyResolution, "verified_by", id.finalSupplyTest,
      "start_of_round_judge_v1"),
    edge(id.supplyResolution, "verified_by", id.reserveSupplyTest,
      "start_of_round_judge_v1"),
    edge(id.effectQueue, "verified_by", id.stationaryTest,
      "start_of_round_judge_v1"),
    edge(id.cardMaterial, "verified_by", id.readyCardTest,
      "start_of_round_judge_v1"),
    edge(id.effectQueue, "verified_by", id.effectOrderTest,
      "start_of_round_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.protectedStateTest,
      "start_of_round_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.authorityTest,
      "start_of_round_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.replayTest,
      "start_of_round_judge_v1"),
    edge(id.historicalV1Executor, "verified_by", id.historicalTest,
      "start_of_round_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "start_of_round_judge_v1"),
    edge(id.historicalV1Executor, "superseded_by", id.currentV2Executor,
      "start_of_round_executor_ancestry_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "start_of_round_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "retained_by", id.currentCatalogueRelease,
      "start_of_round_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "retained_by", id.currentRuntimeRelease,
      "start_of_round_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "start_of_round_state_contract_v1",
    "start_of_round_exact_action_v1",
    "start_of_round_source_projection_v1",
    "start_of_round_handoff_projection_v1",
    "start_of_round_material_projection_v1",
    "start_of_round_supply_derivation_v1",
    "start_of_round_effect_derivation_v1",
    "start_of_round_state_invalidation_v1",
    "start_of_round_apply_v1",
    "start_of_round_judge_v1",
    "start_of_round_executor_ancestry_v1",
    "start_of_round_slice_ancestry_v1",
    "start_of_round_catalogue_ancestry_v1",
    "start_of_round_runtime_ancestry_v1",
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
      OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_START_OF_ROUND_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
        requiredNodeIds: [...new Set([
          ...readFields,
          ...writableFields,
          ...protectedFields,
          id.matchBinding,
          id.sourceMaterial,
          id.handoffPrefix,
          id.unitMaterial,
          id.cardMaterial,
          id.supplyResolution,
          id.effectQueue,
          id.exactAction,
          id.actionType,
          id.resolvedEvent,
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
            from: id.determineInitiativeHistory,
            to: id.forgedHistoryTest,
            relationships: ["projects_to", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.pieces,
            to: id.finiteSupplyTest,
            relationships: ["projects_to", "derives", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.cardResources,
            to: id.readyCardTest,
            relationships: ["projects_to", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.exactAction,
            to: id.replayTest,
            relationships: ["derives", "verified_by"],
            maxDepth: 3,
          },
        ],
        forbiddenPaths: protectedFields.map((to) => ({
          from: id.resolvedEvent,
          to,
          relationships: ["writes"],
          maxDepth: 2,
        })),
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
