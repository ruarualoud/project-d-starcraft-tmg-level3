import {
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION,
} from "./official-phase-initiative-executor-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION,
} from "./official-reserve-deploy-executor-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_VERSION,
} from "./official-reserve-deploy-executor-v2.mjs";
import {
  createOfficialStartOfRoundRelationshipExtensionV1,
  OFFICIAL_START_OF_ROUND_RELATIONSHIP_NODE_IDS_V1,
} from "./official-start-of-round-relationship-contract-v1.mjs";

export const OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-reserve-deploy-v2";

const PREVIOUS_CATALOGUE_HASH =
  "70f8a9b7e69c45f788aa3d967417a04898dfeff2855e64760bd5ae397a318529";
const PREVIOUS_RUNTIME_HASH =
  "b4a63b98baebc6fc74f43356d94b4e61f1456c3c561ef9c771083644a29c1a99";
const EXPECTED_CATALOGUE_HASH =
  "702434b35a0f0af64acd03b706993f02153e1c6c1e4533fa6b65be6f3da7d4e1";
const EXPECTED_RUNTIME_HASH =
  "f8cae053d340153b166c12c69e25f719e2b79b6abce78ba05a59f978248bb27c";

const previousIds = OFFICIAL_START_OF_ROUND_RELATIONSHIP_NODE_IDS_V1;

export const OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
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
  matchBinding: "semantic_projection:reserveDeploy.matchBindingV2",
  sourceMaterial: "semantic_projection:reserveDeploy.officialSourceMaterialV2",
  startHandoff: "semantic_projection:reserveDeploy.startOfRoundV2Handoff",
  phaseHandoff: "semantic_projection:reserveDeploy.phaseInitiativeV1Handoff",
  supplyLineage: "semantic_projection:reserveDeploy.roundSupplyLineageV2",
  unitMaterial: "semantic_projection:reserveDeploy.reserveUnitMaterialV2",
  geometryMaterial: "semantic_projection:reserveDeploy.geometryMaterialV2",
  exactDomain: "parameter_domain:reserveDeploy.exactParameterDomainV2",
  exactAction: "action_variant:reserveDeploy.exactPublicActionV2",
  actionType: "action_type:deploy",
  resolvedEvent: "state_event:reserve_deployed_v2",
  publicContractTest: "judge_test:reserve-deploy-v2-public-contract-v1",
  forgedStartTest: "judge_test:reserve-deploy-v2-forged-start-handoff-v1",
  forgedPhaseTest: "judge_test:reserve-deploy-v2-forged-phase-handoff-v1",
  supplyLineageTest: "judge_test:reserve-deploy-v2-supply-lineage-v1",
  geometryTest: "judge_test:reserve-deploy-v2-geometry-and-coherency-v1",
  exactActionTest: "judge_test:reserve-deploy-v2-exact-action-v1",
  supplyTest: "judge_test:reserve-deploy-v2-available-supply-v1",
  protectedStateTest: "judge_test:reserve-deploy-v2-protected-state-v1",
  authorityTest: "judge_test:reserve-deploy-v2-authority-confirm-apply-v1",
  replayTest: "judge_test:reserve-deploy-v2-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:reserve-deploy-v1-runtime-display-freeze-v1",
  relationshipTest: "judge_test:reserve-deploy-v2-relationship-negative-gap-v1",
  historicalV1Executor:
    `executor:${OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID}`
    + `@${OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION}`,
  startV2Executor: previousIds.currentV2Executor,
  phaseV1Executor:
    `executor:${OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID}`
    + `@${OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION}`,
  currentV2Executor:
    `executor:${OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_VERSION}`,
  previousSliceRelease: previousIds.currentSliceRelease,
  currentSliceRelease: "slice_release:slice-62-existing-reserve-deploy-contract-closure-v1",
  previousCatalogueRelease: previousIds.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-62-current",
  previousRuntimeRelease: previousIds.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-62-current",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_SCOPE_ID };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialReserveDeployRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("RESERVE_DEPLOY_RELATIONSHIP_CURRENT_RELEASE_INVALID",
      `${catalogueHash}:${runtimeHash}`);
  }
  const previous = createOfficialStartOfRoundRelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const id = OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_NODE_IDS_V1;
  const tests = [
    id.publicContractTest,
    id.forgedStartTest,
    id.forgedPhaseTest,
    id.supplyLineageTest,
    id.geometryTest,
    id.exactActionTest,
    id.supplyTest,
    id.protectedStateTest,
    id.authorityTest,
    id.replayTest,
    id.historicalTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.matchBinding, "semantic_projection", "Current data and runtime MatchBinding"),
    node(id.sourceMaterial, "semantic_projection",
      "Current official GAUNTLET, Marine, Core and Terran P2P material"),
    node(id.startHandoff, "semantic_projection",
      "Hash-bound Start-of-Round v2 handoff and log"),
    node(id.phaseHandoff, "semantic_projection",
      "Exact Movement Phase Initiative v1 handoff and log"),
    node(id.supplyLineage, "semantic_projection",
      "Start Supply through witnessed Movement Supply mutations"),
    node(id.unitMaterial, "semantic_projection",
      "Reserve Unit, model denominator, status and activation material"),
    node(id.geometryMaterial, "semantic_projection",
      "Entry edge, path, board, base, overlap, engagement, zone and coherency geometry"),
    node(id.exactDomain, "parameter_domain", "Exact current v2 Reserve Deploy parameter domain"),
    node(id.exactAction, "action_variant", "Exact current v2 Reserve Deploy public action"),
    node(id.resolvedEvent, "state_event", "Reserve deployed and Supply recomputed"),
    ...tests.map((testId) => node(testId, "judge_test", testId.replace(/^judge_test:/u, ""))),
    node(id.historicalV1Executor, "executor", "Frozen historical Reserve Deploy v1"),
    node(id.currentSliceRelease, "slice_release", "Slice 62 Reserve Deploy closure"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 62 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 62 runtime ${runtimeHash}`),
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
    id.scores,
    id.cardResources,
    id.phaseFirstActorByRound,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.officialRoundSupplyState,
    id.startOfRoundHistory,
    id.log,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const writableFields = [
    id.activeSideKey,
    id.pieces,
    id.statuses,
    id.officialRoundSupplyState,
    id.log,
  ];
  const protectedFields = [
    id.round,
    id.firstPlayerSideKey,
    id.players,
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
      "reserve_deploy_state_contract_v1")),
    edge(id.currentV2Executor, "reads", id.matchBinding,
      "reserve_deploy_state_contract_v1"),
    edge(id.officialGameplayDataBundle, "projects_to", id.sourceMaterial,
      "reserve_deploy_source_projection_v1"),
    edge(id.officialMissionSetupBinding, "projects_to", id.sourceMaterial,
      "reserve_deploy_source_projection_v1"),
    edge(id.startOfRoundHistory, "projects_to", id.startHandoff,
      "reserve_deploy_handoff_projection_v1"),
    edge(id.log, "projects_to", id.startHandoff,
      "reserve_deploy_handoff_projection_v1"),
    edge(id.startV2Executor, "derives", id.startHandoff,
      "reserve_deploy_handoff_projection_v1"),
    edge(id.phaseFirstActorByRound, "projects_to", id.phaseHandoff,
      "reserve_deploy_handoff_projection_v1"),
    edge(id.log, "projects_to", id.phaseHandoff,
      "reserve_deploy_handoff_projection_v1"),
    edge(id.phaseV1Executor, "derives", id.phaseHandoff,
      "reserve_deploy_handoff_projection_v1"),
    edge(id.startHandoff, "derives", id.supplyLineage,
      "reserve_deploy_supply_lineage_v1"),
    edge(id.officialRoundSupplyState, "projects_to", id.supplyLineage,
      "reserve_deploy_supply_lineage_v1"),
    edge(id.log, "projects_to", id.supplyLineage,
      "reserve_deploy_supply_lineage_v1"),
    edge(id.pieces, "projects_to", id.unitMaterial,
      "reserve_deploy_unit_projection_v1"),
    edge(id.statuses, "projects_to", id.unitMaterial,
      "reserve_deploy_unit_projection_v1"),
    edge(id.board, "projects_to", id.geometryMaterial,
      "reserve_deploy_geometry_projection_v1"),
    edge(id.sourceMaterial, "projects_to", id.geometryMaterial,
      "reserve_deploy_geometry_projection_v1"),
    ...[
      id.sourceMaterial,
      id.startHandoff,
      id.phaseHandoff,
      id.supplyLineage,
      id.unitMaterial,
      id.geometryMaterial,
    ].map((from) => edge(from, "derives", id.exactDomain,
      "reserve_deploy_domain_derivation_v1")),
    edge(id.currentV2Executor, "exposes", id.exactDomain,
      "reserve_deploy_exact_action_v1"),
    edge(id.exactDomain, "derives", id.exactAction,
      "reserve_deploy_exact_action_v1"),
    edge(id.exactAction, "includes", id.actionType,
      "reserve_deploy_exact_action_v1"),
    ...readFields.map((from) => edge(from, "invalidates", id.exactDomain,
      "reserve_deploy_state_invalidation_v1")),
    edge(id.matchBinding, "invalidates", id.exactDomain,
      "reserve_deploy_state_invalidation_v1"),
    edge(id.exactAction, "derives", id.resolvedEvent,
      "reserve_deploy_apply_v1"),
    ...writableFields.map((to) => edge(id.resolvedEvent, "writes", to,
      "reserve_deploy_apply_v1")),
    edge(id.exactDomain, "verified_by", id.publicContractTest,
      "reserve_deploy_judge_v1"),
    edge(id.startHandoff, "verified_by", id.forgedStartTest,
      "reserve_deploy_judge_v1"),
    edge(id.phaseHandoff, "verified_by", id.forgedPhaseTest,
      "reserve_deploy_judge_v1"),
    edge(id.supplyLineage, "verified_by", id.supplyLineageTest,
      "reserve_deploy_judge_v1"),
    edge(id.geometryMaterial, "verified_by", id.geometryTest,
      "reserve_deploy_judge_v1"),
    edge(id.exactAction, "verified_by", id.exactActionTest,
      "reserve_deploy_judge_v1"),
    edge(id.supplyLineage, "verified_by", id.supplyTest,
      "reserve_deploy_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.protectedStateTest,
      "reserve_deploy_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.authorityTest,
      "reserve_deploy_judge_v1"),
    edge(id.resolvedEvent, "verified_by", id.replayTest,
      "reserve_deploy_judge_v1"),
    edge(id.historicalV1Executor, "verified_by", id.historicalTest,
      "reserve_deploy_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "reserve_deploy_judge_v1"),
    edge(id.historicalV1Executor, "superseded_by", id.currentV2Executor,
      "reserve_deploy_executor_ancestry_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "reserve_deploy_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "retained_by", id.currentCatalogueRelease,
      "reserve_deploy_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "retained_by", id.currentRuntimeRelease,
      "reserve_deploy_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "reserve_deploy_state_contract_v1",
    "reserve_deploy_source_projection_v1",
    "reserve_deploy_handoff_projection_v1",
    "reserve_deploy_supply_lineage_v1",
    "reserve_deploy_unit_projection_v1",
    "reserve_deploy_geometry_projection_v1",
    "reserve_deploy_domain_derivation_v1",
    "reserve_deploy_exact_action_v1",
    "reserve_deploy_state_invalidation_v1",
    "reserve_deploy_apply_v1",
    "reserve_deploy_judge_v1",
    "reserve_deploy_executor_ancestry_v1",
    "reserve_deploy_slice_ancestry_v1",
    "reserve_deploy_catalogue_ancestry_v1",
    "reserve_deploy_runtime_ancestry_v1",
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
      OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
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
