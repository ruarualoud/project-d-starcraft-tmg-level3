import {
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION,
} from "./official-phase-initiative-executor-v1.mjs";
import {
  createOfficialReserveDeployRelationshipExtensionV1,
  OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_NODE_IDS_V1,
} from "./official-reserve-deploy-relationship-contract-v1.mjs";
import {
  OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
} from "./official-standard-move-executor-v1.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION,
} from "./official-standard-move-executor-v2.mjs";
import {
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION,
} from "./official-start-of-round-executor-v2.mjs";

export const OFFICIAL_STANDARD_MOVE_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-standard-move-v2";

const PREVIOUS_CATALOGUE_HASH =
  "702434b35a0f0af64acd03b706993f02153e1c6c1e4533fa6b65be6f3da7d4e1";
const PREVIOUS_RUNTIME_HASH =
  "f8cae053d340153b166c12c69e25f719e2b79b6abce78ba05a59f978248bb27c";
const EXPECTED_CATALOGUE_HASH =
  "c437d7ef4f9776cbea688f9a082d7d64110d817b763c0092fcdcb25114ed9733";
const EXPECTED_RUNTIME_HASH =
  "9df3c61f7b271067ad41b8dabdb228c98341e23fe999c17052eb974d06d61a33";

const previousIds = OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_NODE_IDS_V1;

export const OFFICIAL_STANDARD_MOVE_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
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
  determineInitiativeHistory: previousIds.determineInitiativeHistory,
  officialRoundSupplyState: previousIds.officialRoundSupplyState,
  startOfRoundHistory: previousIds.startOfRoundHistory,
  terminal: previousIds.terminal,
  gameOver: previousIds.gameOver,
  winner: previousIds.winner,
  terminalReason: previousIds.terminalReason,
  log: previousIds.log,
  matchBinding: "semantic_projection:standardMove.matchBindingV2",
  sourceMaterial: "semantic_projection:standardMove.officialSourceMaterialV2",
  startHandoff: "semantic_projection:standardMove.startOfRoundV2Handoff",
  phaseHandoff: "semantic_projection:standardMove.phaseInitiativeV1Handoff",
  supplyLineage: "semantic_projection:standardMove.roundSupplyLineageV2",
  unitMaterial: "semantic_projection:standardMove.unitAndActivationMaterialV2",
  geometryMaterial: "semantic_projection:standardMove.pathAndPlacementGeometryV2",
  exactDomain: "parameter_domain:standardMove.exactParameterDomainV2",
  exactAction: "action_variant:standardMove.exactPublicActionV2",
  actionType: "action_type:move",
  resolvedEvent: "state_event:unit_standard_moved_v2",
  publicContractTest: "judge_test:standard-move-v2-public-contract-v1",
  forgedStartTest: "judge_test:standard-move-v2-forged-start-handoff-v1",
  forgedPhaseTest: "judge_test:standard-move-v2-forged-phase-handoff-v1",
  supplyLineageTest: "judge_test:standard-move-v2-supply-lineage-v1",
  unitScaleTest: "judge_test:standard-move-v2-single-multi-speed-v1",
  geometryTest: "judge_test:standard-move-v2-path-placement-geometry-v1",
  exactActionTest: "judge_test:standard-move-v2-exact-action-v1",
  protectedStateTest: "judge_test:standard-move-v2-protected-state-v1",
  authorityTest: "judge_test:standard-move-v2-authority-confirm-apply-v1",
  replayTest: "judge_test:standard-move-v2-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:standard-move-v1-runtime-display-freeze-v1",
  relationshipTest: "judge_test:standard-move-v2-relationship-negative-gap-v1",
  historicalV1Executor:
    `executor:${OFFICIAL_STANDARD_MOVE_EXECUTOR_ID}`
    + `@${OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION}`,
  startV2Executor:
    `executor:${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION}`,
  phaseV1Executor:
    `executor:${OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID}`
    + `@${OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION}`,
  currentV2Executor:
    `executor:${OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION}`,
  previousSliceRelease: previousIds.currentSliceRelease,
  currentSliceRelease: "slice_release:slice-63-existing-standard-move-contract-closure-v1",
  previousCatalogueRelease: previousIds.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-63-current",
  previousRuntimeRelease: previousIds.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-63-current",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: OFFICIAL_STANDARD_MOVE_RELATIONSHIP_SCOPE_ID };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_STANDARD_MOVE_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialStandardMoveRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("STANDARD_MOVE_RELATIONSHIP_CURRENT_RELEASE_INVALID",
      `${catalogueHash}:${runtimeHash}`);
  }
  const previous = createOfficialReserveDeployRelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const id = OFFICIAL_STANDARD_MOVE_RELATIONSHIP_NODE_IDS_V1;
  const tests = [
    id.publicContractTest,
    id.forgedStartTest,
    id.forgedPhaseTest,
    id.supplyLineageTest,
    id.unitScaleTest,
    id.geometryTest,
    id.exactActionTest,
    id.protectedStateTest,
    id.authorityTest,
    id.replayTest,
    id.historicalTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.matchBinding, "semantic_projection", "Current data and runtime MatchBinding"),
    node(id.sourceMaterial, "semantic_projection",
      "Current official GAUNTLET, Marine, Core and Terran P2P movement material"),
    node(id.startHandoff, "semantic_projection", "Hash-bound Start-of-Round v2 handoff"),
    node(id.phaseHandoff, "semantic_projection", "Exact Movement Initiative v1 handoff"),
    node(id.supplyLineage, "semantic_projection", "Contiguous current-round Supply lineage"),
    node(id.unitMaterial, "semantic_projection",
      "Current unit size, speed split, activation, status and engagement material"),
    node(id.geometryMaterial, "semantic_projection",
      "Path, battlefield, collision, endpoint, placement and coherency geometry"),
    node(id.exactDomain, "parameter_domain", "Exact current v2 Standard Move domain"),
    node(id.exactAction, "action_variant", "Exact current v2 Standard Move action"),
    node(id.resolvedEvent, "state_event", "Unit Standard Moved and activation settled"),
    ...tests.map((testId) => node(testId, "judge_test", testId.replace(/^judge_test:/u, ""))),
    node(id.historicalV1Executor, "executor", "Frozen historical Standard Move v1"),
    node(id.currentSliceRelease, "slice_release", "Slice 63 Standard Move closure"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 63 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 63 runtime ${runtimeHash}`),
  ];
  const readFields = [
    id.round,
    id.phase,
    id.activeSideKey,
    id.firstPlayerSideKey,
    id.players,
    id.pieces,
    id.statuses,
    id.board,
    id.missionMarkers,
    id.effectMarkers,
    id.tokens,
    id.markers,
    id.phaseFirstActorByRound,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.officialRoundSupplyState,
    id.startOfRoundHistory,
    id.log,
    id.terminal,
    id.gameOver,
  ];
  const writableFields = [
    id.phase,
    id.activeSideKey,
    id.players,
    id.pieces,
    id.statuses,
    id.officialRoundSupplyState,
    id.log,
  ];
  const protectedFields = [
    id.round,
    id.firstPlayerSideKey,
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
    id.startOfRoundHistory,
    id.cleanupRefreshHistory,
    id.determineInitiativeHistory,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const relations = [
    ...readFields.map((to) => edge(id.currentV2Executor, "reads", to,
      "standard_move_state_contract_v1")),
    edge(id.currentV2Executor, "reads", id.matchBinding,
      "standard_move_state_contract_v1"),
    edge(id.officialGameplayDataBundle, "projects_to", id.sourceMaterial,
      "standard_move_source_projection_v1"),
    edge(id.officialMissionSetupBinding, "projects_to", id.sourceMaterial,
      "standard_move_source_projection_v1"),
    edge(id.startOfRoundHistory, "projects_to", id.startHandoff,
      "standard_move_handoff_projection_v1"),
    edge(id.log, "projects_to", id.startHandoff,
      "standard_move_handoff_projection_v1"),
    edge(id.startV2Executor, "derives", id.startHandoff,
      "standard_move_handoff_projection_v1"),
    edge(id.phaseFirstActorByRound, "projects_to", id.phaseHandoff,
      "standard_move_handoff_projection_v1"),
    edge(id.log, "projects_to", id.phaseHandoff,
      "standard_move_handoff_projection_v1"),
    edge(id.phaseV1Executor, "derives", id.phaseHandoff,
      "standard_move_handoff_projection_v1"),
    edge(id.startHandoff, "derives", id.supplyLineage,
      "standard_move_supply_lineage_v1"),
    edge(id.officialRoundSupplyState, "projects_to", id.supplyLineage,
      "standard_move_supply_lineage_v1"),
    edge(id.log, "projects_to", id.supplyLineage,
      "standard_move_supply_lineage_v1"),
    edge(id.pieces, "projects_to", id.unitMaterial,
      "standard_move_unit_projection_v1"),
    edge(id.statuses, "projects_to", id.unitMaterial,
      "standard_move_unit_projection_v1"),
    edge(id.board, "projects_to", id.geometryMaterial,
      "standard_move_geometry_projection_v1"),
    edge(id.sourceMaterial, "projects_to", id.geometryMaterial,
      "standard_move_geometry_projection_v1"),
    ...[
      id.sourceMaterial,
      id.startHandoff,
      id.phaseHandoff,
      id.supplyLineage,
      id.unitMaterial,
      id.geometryMaterial,
    ].map((from) => edge(from, "derives", id.exactDomain,
      "standard_move_domain_derivation_v1")),
    edge(id.currentV2Executor, "exposes", id.exactDomain,
      "standard_move_exact_action_v1"),
    edge(id.exactDomain, "derives", id.exactAction,
      "standard_move_exact_action_v1"),
    edge(id.exactAction, "includes", id.actionType,
      "standard_move_exact_action_v1"),
    ...readFields.map((from) => edge(from, "invalidates", id.exactDomain,
      "standard_move_state_invalidation_v1")),
    edge(id.matchBinding, "invalidates", id.exactDomain,
      "standard_move_state_invalidation_v1"),
    edge(id.exactAction, "derives", id.resolvedEvent,
      "standard_move_apply_v1"),
    ...writableFields.map((to) => edge(id.resolvedEvent, "writes", to,
      "standard_move_apply_v1")),
    edge(id.exactDomain, "verified_by", id.publicContractTest,
      "standard_move_judge_v1"),
    edge(id.startHandoff, "verified_by", id.forgedStartTest,
      "standard_move_judge_v1"),
    edge(id.phaseHandoff, "verified_by", id.forgedPhaseTest,
      "standard_move_judge_v1"),
    edge(id.supplyLineage, "verified_by", id.supplyLineageTest,
      "standard_move_judge_v1"),
    edge(id.unitMaterial, "verified_by", id.unitScaleTest,
      "standard_move_judge_v1"),
    edge(id.geometryMaterial, "verified_by", id.geometryTest,
      "standard_move_judge_v1"),
    edge(id.exactAction, "verified_by", id.exactActionTest,
      "standard_move_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.protectedStateTest,
      "standard_move_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.authorityTest,
      "standard_move_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.replayTest,
      "standard_move_judge_v1"),
    edge(id.historicalV1Executor, "verified_by", id.historicalTest,
      "standard_move_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "standard_move_judge_v1"),
    edge(id.historicalV1Executor, "superseded_by", id.currentV2Executor,
      "standard_move_executor_ancestry_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "standard_move_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "retained_by", id.currentCatalogueRelease,
      "standard_move_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "retained_by", id.currentRuntimeRelease,
      "standard_move_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "standard_move_state_contract_v1",
    "standard_move_source_projection_v1",
    "standard_move_handoff_projection_v1",
    "standard_move_supply_lineage_v1",
    "standard_move_unit_projection_v1",
    "standard_move_geometry_projection_v1",
    "standard_move_domain_derivation_v1",
    "standard_move_exact_action_v1",
    "standard_move_state_invalidation_v1",
    "standard_move_apply_v1",
    "standard_move_judge_v1",
    "standard_move_executor_ancestry_v1",
    "standard_move_slice_ancestry_v1",
    "standard_move_catalogue_ancestry_v1",
    "standard_move_runtime_ancestry_v1",
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
      OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_STANDARD_MOVE_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
        requiredNodeIds: [...new Set([
          ...readFields,
          ...writableFields,
          ...protectedFields,
          id.matchBinding,
          id.sourceMaterial,
          id.startHandoff,
          id.phaseHandoff,
          id.supplyLineage,
          id.unitMaterial,
          id.geometryMaterial,
          id.exactDomain,
          id.exactAction,
          id.actionType,
          id.resolvedEvent,
          id.historicalV1Executor,
          id.startV2Executor,
          id.phaseV1Executor,
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
            from: id.startOfRoundHistory,
            to: id.forgedStartTest,
            relationships: ["projects_to", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.phaseFirstActorByRound,
            to: id.forgedPhaseTest,
            relationships: ["projects_to", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.officialRoundSupplyState,
            to: id.supplyLineageTest,
            relationships: ["projects_to", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.pieces,
            to: id.unitScaleTest,
            relationships: ["projects_to", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.board,
            to: id.geometryTest,
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
