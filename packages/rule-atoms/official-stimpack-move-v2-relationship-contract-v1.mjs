import {
  createOfficialMovementV4RelationshipExtensionV1,
  OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1,
} from "./official-movement-v4-relationship-contract-v1.mjs";
import {
  OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
  OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION,
} from "./official-stimpack-move-consumer-executor-v1.mjs";
import {
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
  OFFICIAL_STIMPACK_MOVE_V2_PARAMETER_KIND,
} from "./official-stimpack-move-consumer-executor-v2.mjs";

export const OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_SCOPE_ID =
  "ticket-11-current-stimpack-move-v2";

export const OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  ...OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1,
  cardReadiness: "state_field:cardResources[].readiness",
  cardFace: "state_field:cardResources[].face",
  abilityHistory: "state_field:activeAbilityUseHistory",
  movementActivation: "state_field:pieces[].activatedPhases.movement",
  modelPositions: "state_field:pieces[].models[].position",
  inCoherency: "state_field:pieces[].inCoherency",
  movePlanHash: "state_field:pieces[].lastMovePlanHash",
  stimpackDomain: `parameter_domain:${OFFICIAL_STIMPACK_MOVE_V2_PARAMETER_KIND}`,
  stimpackAction: "action_variant:stimpackMove.exactCurrentActionV2",
  stimpackEvent: "state_event:stimpack_move_resolved_v2",
  publicTest: "judge_test:stimpack-move-v2-public-contract-v1",
  exactActionTest: "judge_test:stimpack-move-v2-exact-action-v1",
  protectedStateTest: "judge_test:stimpack-move-v2-protected-state-v1",
  replayTest: "judge_test:stimpack-move-v2-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:stimpack-move-v1-runtime-and-display-freeze-v1",
  relationshipTest: "judge_test:stimpack-move-v2-relationship-negative-gap-v1",
  historicalExecutor:
    `executor:${OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID}`
    + `@${OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION}`,
  currentExecutor:
    `executor:${OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION}`,
  previousSliceRelease:
    OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1.previousSliceRelease,
  currentSliceRelease:
    OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1.currentSliceRelease,
  previousCatalogueRelease:
    OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1.previousCatalogueRelease,
  currentCatalogueRelease:
    OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1.currentCatalogueRelease,
  previousRuntimeRelease:
    OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1.previousRuntimeRelease,
  currentRuntimeRelease:
    OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1.currentRuntimeRelease,
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_SCOPE_ID };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialStimpackMoveV2RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("STIMPACK_MOVE_V2_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialMovementV4RelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const id = OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_NODE_IDS_V1;
  const reads = [
    id.round,
    id.phase,
    id.activeSideKey,
    id.firstPlayerSideKey,
    id.players,
    id.pieces,
    id.board,
    id.phaseFirstActorByRound,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.officialRoundSupplyState,
    id.supplyLossLedger,
    id.startOfRoundHistory,
    id.log,
    id.cardResources,
    id.cardReadiness,
    id.cardFace,
    id.abilityHistory,
  ];
  const writes = [
    id.pieces,
    id.cardResources,
    id.cardReadiness,
    id.cardFace,
    id.damageMarker,
    id.statuses,
    id.effectMarkers,
    id.abilityHistory,
    id.movementActivation,
    id.modelPositions,
    id.inCoherency,
    id.movePlanHash,
    id.log,
  ];
  const protectedFields = [
    id.firstPlayerSideKey,
    id.scores,
    id.missionMarkers,
    id.tokens,
    id.markers,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.cleanupRefreshHistory,
    id.determineInitiativeHistory,
    id.startOfRoundHistory,
    id.officialRoundSupplyState,
    id.supplyLossLedger,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const tests = [id.publicTest, id.exactActionTest, id.protectedStateTest,
    id.replayTest, id.historicalTest, id.relationshipTest];
  const relations = [
    ...reads.map((to) => edge(id.currentExecutor, "reads", to,
      "stimpack_move_v2_state_contract_v1")),
    edge(id.currentExecutor, "reads", id.currentAuthorityLineage,
      "stimpack_move_v2_state_contract_v1"),
    edge(id.currentExecutor, "reads", id.currentSupplyLossLineage,
      "stimpack_move_v2_state_contract_v1"),
    edge(id.currentExecutor, "reads", id.currentMovementMaterial,
      "stimpack_move_v2_state_contract_v1"),
    edge(id.currentAuthorityLineage, "derives", id.stimpackDomain,
      "stimpack_move_v2_domain_derivation_v1"),
    edge(id.currentSupplyLossLineage, "derives", id.stimpackDomain,
      "stimpack_move_v2_domain_derivation_v1"),
    edge(id.currentMovementMaterial, "derives", id.stimpackDomain,
      "stimpack_move_v2_domain_derivation_v1"),
    edge(id.cardReadiness, "gates", id.stimpackDomain,
      "stimpack_move_v2_payment_gate_v1"),
    edge(id.cardFace, "gates", id.stimpackDomain,
      "stimpack_move_v2_payment_gate_v1"),
    ...reads.map((from) => edge(from, "invalidates", id.stimpackDomain,
      "stimpack_move_v2_state_invalidation_v1")),
    edge(id.currentExecutor, "exposes", id.stimpackDomain,
      "stimpack_move_v2_exact_action_v1"),
    edge(id.stimpackDomain, "derives", id.stimpackAction,
      "stimpack_move_v2_exact_action_v1"),
    edge(id.stimpackAction, "includes", id.actionType,
      "stimpack_move_v2_exact_action_v1"),
    edge(id.stimpackAction, "derives", id.stimpackEvent,
      "stimpack_move_v2_apply_v1"),
    ...writes.map((to) => edge(id.stimpackEvent, "writes", to,
      "stimpack_move_v2_apply_v1")),
    edge(id.stimpackDomain, "verified_by", id.publicTest,
      "stimpack_move_v2_judge_v1"),
    edge(id.stimpackAction, "verified_by", id.exactActionTest,
      "stimpack_move_v2_judge_v1"),
    edge(id.stimpackEvent, "verified_by", id.protectedStateTest,
      "stimpack_move_v2_judge_v1"),
    edge(id.stimpackEvent, "verified_by", id.replayTest,
      "stimpack_move_v2_judge_v1"),
    edge(id.historicalExecutor, "verified_by", id.historicalTest,
      "stimpack_move_v2_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "stimpack_move_v2_judge_v1"),
    edge(id.historicalExecutor, "superseded_by", id.currentExecutor,
      "stimpack_move_v2_executor_ancestry_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "stimpack_move_v2_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "retained_by", id.currentCatalogueRelease,
      "stimpack_move_v2_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "retained_by", id.currentRuntimeRelease,
      "stimpack_move_v2_runtime_ancestry_v1"),
  ];
  const nodes = [
    node(id.cardReadiness, "state_field", "Faction card readiness"),
    node(id.cardFace, "state_field", "Faction card face"),
    node(id.abilityHistory, "state_field", "Active ability use history"),
    node(id.movementActivation, "state_field", "Movement activation marker"),
    node(id.modelPositions, "state_field", "Current model positions"),
    node(id.inCoherency, "state_field", "Unit coherency state"),
    node(id.movePlanHash, "state_field", "Last accepted Move plan hash"),
    node(id.stimpackAction, "action_variant", "Exact current Stimpack Move v2 action"),
    node(id.stimpackEvent, "state_event", "Stimpack and Move resolved atomically"),
    ...tests.map((testId) => node(testId, "judge_test", testId.replace(/^judge_test:/u, ""))),
    node(id.historicalExecutor, "executor", "Frozen historical Stimpack Move v1"),
    node(id.currentSliceRelease, "slice_release", "Slice 65 current Stimpack Move v2"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 65 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 65 runtime ${runtimeHash}`),
  ];
  const previousNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...nodes.filter((entry) => !previousNodeIds.has(entry.nodeId))],
    edges: [...previous.edges, ...relations],
    executorLineages: [
      ...previous.executorLineages,
      {
        executorId: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:stimpack_move_v2",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
        requiredNodeIds: [...new Set([
          ...reads,
          ...writes,
          ...protectedFields,
          id.currentAuthorityLineage,
          id.currentSupplyLossLineage,
          id.currentMovementMaterial,
          id.stimpackDomain,
          id.stimpackAction,
          id.stimpackEvent,
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
        requiredEdges: relations,
        requiredPaths: [
          {
            from: id.startOfRoundHistory,
            to: id.publicTest,
            relationships: ["projects_to", "derives", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.supplyLossLedger,
            to: id.publicTest,
            relationships: ["projects_to", "derives", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.stimpackAction,
            to: id.replayTest,
            relationships: ["derives", "verified_by"],
            maxDepth: 3,
          },
        ],
        forbiddenPaths: protectedFields.map((to) => ({
          from: id.stimpackEvent,
          to,
          relationships: ["writes"],
          maxDepth: 2,
        })),
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
