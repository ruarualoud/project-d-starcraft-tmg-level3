import {
  createOfficialCombatPassRelationshipExtensionV1,
  OFFICIAL_COMBAT_PASS_RELATIONSHIP_NODE_IDS_V1,
} from "./official-combat-pass-relationship-contract-v1.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION,
} from "./official-mission-marker-control-executor-v2.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID,
  OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_VERSION,
} from "./official-mission-marker-control-executor-v3.mjs";

export const OFFICIAL_MISSION_MARKER_CONTROL_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-mission-marker-control-v3";

const previousIds = OFFICIAL_COMBAT_PASS_RELATIONSHIP_NODE_IDS_V1;
const PREVIOUS_CATALOGUE_HASH =
  "eea6d9c0395db9e442f9606b3a9c97196aa949b7a0e29c69590c5717b246922d";
const PREVIOUS_RUNTIME_HASH =
  "1d6b06dd12b6eae1c0471d9a5a38073c316a4835018f0c8fc47112344226e26c";
const EXPECTED_CATALOGUE_HASH =
  "d7ebb1f60f861544a31711362077927dde00271faf91e44350b5000ed06ff908";
const EXPECTED_RUNTIME_HASH =
  "7ba03eba7f2ea2f357c5264bcc2f261453a0f3b3c0fc9310db3c281a2eac8f55";

export const OFFICIAL_MISSION_MARKER_CONTROL_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
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
  officialGameplayDataBundle: "state_field:officialGameplayDataBundle",
  officialMissionSetupBinding: "state_field:officialMissionSetupBinding",
  supplyLossLedger: "state_field:supplyLossLedger",
  scoringCleanupProgress: "state_field:scoringCleanupProgress",
  matchBinding: "semantic_projection:missionMarkerControl.matchBindingV3",
  markerGeometry: "semantic_projection:missionMarkerControl.markerGeometryV3",
  pieceControlState: "semantic_projection:missionMarkerControl.pieceControlStateV3",
  protectedState: "semantic_projection:missionMarkerControl.protectedStateV3",
  officialBinding: "derived_value:missionMarkerControl.officialBindingV3",
  currentSupplyByUnit: "derived_value:missionMarkerControl.currentSupplyByUnitV3",
  contestingSupplyByMarker: "derived_value:missionMarkerControl.contestingSupplyByMarkerV3",
  exactControlSet: "derived_value:missionMarkerControl.exactFiveMarkerControlSetV3",
  markerControlState: "state_field:board.missionMarkers.controlState",
  controlAction: "action_variant:missionMarkerControl.exactResolutionV3",
  actionType: "action_type:determine_mission_marker_control",
  controlEvent: "state_event:mission_marker_control_determined",
  exactActionTest: "judge_test:mission-marker-control-v3-exact-public-action-v1",
  forgedActionTest: "judge_test:mission-marker-control-v3-forged-action-rejected-v1",
  seatAndLifecycleTest: "judge_test:mission-marker-control-v3-seat-and-lifecycle-gates-v1",
  sourceBindingTest: "judge_test:mission-marker-control-v3-official-source-binding-v1",
  supplyAndGeometryTest: "judge_test:mission-marker-control-v3-supply-and-geometry-v1",
  controlSemanticsTest: "judge_test:mission-marker-control-v3-sticky-tie-higher-supply-v1",
  protectedStateTest: "judge_test:mission-marker-control-v3-protected-state-v1",
  replayTest: "judge_test:mission-marker-control-v3-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:mission-marker-control-v2-frozen-runtime-and-display-v1",
  relationshipTest: "judge_test:mission-marker-control-v3-relationship-negative-gap-v1",
  historicalExecutor:
    `executor:${OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION}`,
  currentExecutor:
    `executor:${OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_VERSION}`,
  previousSliceRelease: previousIds.currentSliceRelease,
  currentSliceRelease:
    "slice_release:slice-55-existing-mission-marker-control-contract-closure-v1",
  previousCatalogueRelease: previousIds.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-55-current",
  previousRuntimeRelease: previousIds.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-55-current",
});

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_MISSION_MARKER_CONTROL_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_MISSION_MARKER_CONTROL_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialMissionMarkerControlRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("MISSION_MARKER_CONTROL_RELATIONSHIP_CURRENT_RELEASE_INVALID");
  }
  const previous = createOfficialCombatPassRelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const id = OFFICIAL_MISSION_MARKER_CONTROL_RELATIONSHIP_NODE_IDS_V1;
  const tests = [
    id.exactActionTest,
    id.forgedActionTest,
    id.seatAndLifecycleTest,
    id.sourceBindingTest,
    id.supplyAndGeometryTest,
    id.controlSemanticsTest,
    id.protectedStateTest,
    id.replayTest,
    id.historicalTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.officialGameplayDataBundle, "state_field", "Frozen official gameplay data bundle"),
    node(id.officialMissionSetupBinding, "state_field", "Frozen mission and seat-colour setup binding"),
    node(id.supplyLossLedger, "state_field", "Runtime-bound current Supply loss ledger"),
    node(id.scoringCleanupProgress, "state_field", "Ordered Cleanup scoring progress"),
    node(id.matchBinding, "semantic_projection", "Data snapshot and Rules runtime match binding"),
    node(id.markerGeometry, "semantic_projection", "Five exact marker positions and sight geometry"),
    node(id.pieceControlState, "semantic_projection",
      "Live on-field coherent non-Flying non-Burrowed contesting Units"),
    node(id.protectedState, "semantic_projection",
      "Phase, initiative, pieces, score, resources, source and geometry state preserved"),
    node(id.officialBinding, "derived_value",
      "Command Center data, mission setup, marker affinity and runtime binding"),
    node(id.currentSupplyByUnit, "derived_value", "Current Supply after witnessed losses"),
    node(id.contestingSupplyByMarker, "derived_value",
      "Eligible current Supply summed by marker and seat"),
    node(id.exactControlSet, "derived_value",
      "Exact sticky, tied, uncontested and higher-Supply outcomes for five markers"),
    node(id.markerControlState, "state_field", "Mission marker controller and faction indicator state"),
    node(id.controlAction, "action_variant", "Exact Mission Marker Control v3 action"),
    node(id.controlEvent, "state_event", "Mission marker control determined"),
    node(id.exactActionTest, "judge_test", "Enumerate and Apply share one exact action"),
    node(id.forgedActionTest, "judge_test", "Forged lineage, result or extra field fails closed"),
    node(id.seatAndLifecycleTest, "judge_test",
      "Cleanup, First Player and one-resolution-only gates hold"),
    node(id.sourceBindingTest, "judge_test",
      "Latest official data and frozen mission setup/runtime binding hold"),
    node(id.supplyAndGeometryTest, "judge_test",
      "Current Supply and exact marker geometry determine contestants"),
    node(id.controlSemanticsTest, "judge_test",
      "Higher Supply, ties, zero contest and sticky control resolve exactly"),
    node(id.protectedStateTest, "judge_test", "Control writes only marker state, progress and log"),
    node(id.replayTest, "judge_test", "Ed25519 replay survives HMAC seal rotation"),
    node(id.historicalTest, "judge_test", "Frozen v2 runtime and rules display remain available"),
    node(id.relationshipTest, "judge_test", "Missing invalidation or Judge edge blocks contract"),
    node(id.historicalExecutor, "executor", "Frozen historical Mission Marker Control v2 executor"),
    node(id.currentSliceRelease, "slice_release", "Existing Mission Marker Control v3 contract closure"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 55 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 55 runtime ${runtimeHash}`),
  ];
  const readFields = [
    id.round,
    id.phase,
    id.firstPlayerSideKey,
    id.players,
    id.pieces,
    id.board,
    id.log,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.supplyLossLedger,
    id.scoringCleanupProgress,
  ];
  const protectedFields = [
    id.round,
    id.phase,
    id.activeSideKey,
    id.players,
    id.pieces,
    id.scores,
    id.cardResources,
    id.firstPlayerSideKey,
    id.phaseFirstActorByRound,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.supplyLossLedger,
  ];
  const relations = [
    ...readFields.map((to) => edge(id.currentExecutor, "reads", to,
      "mission_marker_control_state_contract_v1")),
    edge(id.currentExecutor, "reads", id.matchBinding,
      "mission_marker_control_state_contract_v1"),
    edge(id.currentExecutor, "exposes", id.exactControlSet,
      "mission_marker_control_exact_domain_v1"),
    edge(id.board, "projects_to", id.markerGeometry,
      "mission_marker_control_geometry_projection_v1"),
    edge(id.pieces, "projects_to", id.pieceControlState,
      "mission_marker_control_piece_projection_v1"),
    edge(id.board, "projects_to", id.protectedState,
      "mission_marker_control_protected_projection_v1"),
    ...protectedFields.filter((field) => field !== id.board).map((from) => (
      edge(from, "projects_to", id.protectedState,
        "mission_marker_control_protected_projection_v1")
    )),
    edge(id.officialGameplayDataBundle, "projects_to", id.officialBinding,
      "mission_marker_control_official_binding_v1"),
    edge(id.officialMissionSetupBinding, "projects_to", id.officialBinding,
      "mission_marker_control_official_binding_v1"),
    edge(id.supplyLossLedger, "projects_to", id.officialBinding,
      "mission_marker_control_official_binding_v1"),
    edge(id.matchBinding, "projects_to", id.officialBinding,
      "mission_marker_control_official_binding_v1"),
    edge(id.pieceControlState, "derives", id.currentSupplyByUnit,
      "mission_marker_control_supply_projection_v1"),
    edge(id.supplyLossLedger, "derives", id.currentSupplyByUnit,
      "mission_marker_control_supply_projection_v1"),
    edge(id.markerGeometry, "derives", id.contestingSupplyByMarker,
      "mission_marker_control_contest_projection_v1"),
    edge(id.pieceControlState, "derives", id.contestingSupplyByMarker,
      "mission_marker_control_contest_projection_v1"),
    edge(id.currentSupplyByUnit, "derives", id.contestingSupplyByMarker,
      "mission_marker_control_contest_projection_v1"),
    edge(id.contestingSupplyByMarker, "derives", id.exactControlSet,
      "mission_marker_control_resolution_v1"),
    edge(id.markerControlState, "derives", id.exactControlSet,
      "mission_marker_control_sticky_resolution_v1"),
    edge(id.officialBinding, "gates", id.exactControlSet,
      "mission_marker_control_gate_v1"),
    edge(id.phase, "gates", id.exactControlSet, "mission_marker_control_gate_v1"),
    edge(id.firstPlayerSideKey, "gates", id.exactControlSet,
      "mission_marker_control_gate_v1"),
    edge(id.scoringCleanupProgress, "gates", id.exactControlSet,
      "mission_marker_control_gate_v1"),
    edge(id.exactControlSet, "includes", id.controlAction,
      "mission_marker_control_exact_domain_v1"),
    edge(id.controlAction, "includes", id.actionType,
      "mission_marker_control_exact_domain_v1"),
    ...readFields.map((from) => edge(from, "invalidates", id.controlAction,
      "mission_marker_control_state_invalidation_v1")),
    edge(id.matchBinding, "invalidates", id.controlAction,
      "mission_marker_control_state_invalidation_v1"),
    edge(id.controlAction, "derives", id.controlEvent,
      "mission_marker_control_apply_v1"),
    edge(id.controlEvent, "writes", id.markerControlState,
      "mission_marker_control_apply_v1"),
    edge(id.controlEvent, "writes", id.scoringCleanupProgress,
      "mission_marker_control_apply_v1"),
    edge(id.controlEvent, "writes", id.log, "mission_marker_control_apply_v1"),
    edge(id.exactControlSet, "verified_by", id.exactActionTest,
      "mission_marker_control_judge_v1"),
    edge(id.controlAction, "verified_by", id.forgedActionTest,
      "mission_marker_control_judge_v1"),
    edge(id.firstPlayerSideKey, "verified_by", id.seatAndLifecycleTest,
      "mission_marker_control_judge_v1"),
    edge(id.scoringCleanupProgress, "verified_by", id.seatAndLifecycleTest,
      "mission_marker_control_judge_v1"),
    edge(id.officialBinding, "verified_by", id.sourceBindingTest,
      "mission_marker_control_judge_v1"),
    edge(id.contestingSupplyByMarker, "verified_by", id.supplyAndGeometryTest,
      "mission_marker_control_judge_v1"),
    edge(id.markerControlState, "verified_by", id.controlSemanticsTest,
      "mission_marker_control_judge_v1"),
    edge(id.protectedState, "verified_by", id.protectedStateTest,
      "mission_marker_control_judge_v1"),
    edge(id.controlEvent, "verified_by", id.replayTest,
      "mission_marker_control_judge_v1"),
    edge(id.historicalExecutor, "verified_by", id.historicalTest,
      "mission_marker_control_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "mission_marker_control_judge_v1"),
    edge(id.historicalExecutor, "superseded_by", id.currentExecutor,
      "mission_marker_control_executor_ancestry_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "mission_marker_control_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "superseded_by", id.currentCatalogueRelease,
      "mission_marker_control_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "superseded_by", id.currentRuntimeRelease,
      "mission_marker_control_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "mission_marker_control_state_contract_v1",
    "mission_marker_control_exact_domain_v1",
    "mission_marker_control_geometry_projection_v1",
    "mission_marker_control_piece_projection_v1",
    "mission_marker_control_protected_projection_v1",
    "mission_marker_control_official_binding_v1",
    "mission_marker_control_supply_projection_v1",
    "mission_marker_control_contest_projection_v1",
    "mission_marker_control_resolution_v1",
    "mission_marker_control_sticky_resolution_v1",
    "mission_marker_control_gate_v1",
    "mission_marker_control_state_invalidation_v1",
    "mission_marker_control_apply_v1",
    "mission_marker_control_judge_v1",
    "mission_marker_control_executor_ancestry_v1",
    "mission_marker_control_slice_ancestry_v1",
    "mission_marker_control_catalogue_ancestry_v1",
    "mission_marker_control_runtime_ancestry_v1",
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
      OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_MISSION_MARKER_CONTROL_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID,
        requiredNodeIds: [...new Set([
          ...readFields,
          ...protectedFields,
          id.matchBinding,
          id.markerGeometry,
          id.pieceControlState,
          id.protectedState,
          id.officialBinding,
          id.currentSupplyByUnit,
          id.contestingSupplyByMarker,
          id.exactControlSet,
          id.markerControlState,
          id.controlAction,
          id.actionType,
          id.controlEvent,
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
            from: id.pieces,
            to: id.supplyAndGeometryTest,
            relationships: ["projects_to", "derives", "verified_by"],
            maxDepth: 6,
          },
          {
            from: id.controlAction,
            to: id.controlSemanticsTest,
            relationships: ["derives", "writes", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.controlAction,
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
          from: id.controlEvent,
          to,
          relationships: ["writes"],
          maxDepth: 2,
        })),
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
