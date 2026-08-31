import {
  OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ATOM_IDS,
  OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID,
  OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_VERSION,
} from "./official-gap-place-geometry-executor-v1.mjs";
import { createOfficialDirectMovementDisplacementRelationshipExtensionV1 } from
  "./official-direct-movement-displacement-relationship-contract-v1.mjs";

export const OFFICIAL_GAP_PLACE_GEOMETRY_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-82-gap-place-geometry";
const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  mode: "state_field:rulesProcedureMode",
  pieces: "state_field:pieces",
  board: "state_field:board",
  pending: "state_field:pendingAction.gapPlaceGeometry",
  result: "state_field:lastGapPlaceGeometryResolution",
  log: "state_field:log",
  choose: "action_variant:gapPlaceGeometryV1.chooseCertifiedPlan",
  resolve: "action_variant:gapPlaceGeometryV1.resolve",
  footprints: "derived_value:gapPlaceGeometryV1.physicalFootprints",
  gap: "derived_value:gapPlaceGeometryV1.gapWidthAndThreshold",
  endpoint: "derived_value:gapPlaceGeometryV1.legalEndpointFit",
  place: "derived_value:gapPlaceGeometryV1.placeRangeAndCoherency",
  event: "state_event:gap_place_geometry_resolved",
  sourceTest: "judge_test:gap-place-geometry-v1-source-lock",
  gapTest: "judge_test:gap-place-geometry-v1-clearance-opening-flying",
  endpointTest: "judge_test:gap-place-geometry-v1-endpoint-fit",
  placeTest: "judge_test:gap-place-geometry-v1-place-semantics",
  authorityTest: "judge_test:gap-place-geometry-v1-authority-replay",
  graphTest: "judge_test:gap-place-geometry-v1-relationship-negative-gap",
});
function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-82" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_GAP_PLACE_GEOMETRY_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}
export function createOfficialGapPlaceGeometryRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("GAP_PLACE_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialDirectMovementDisplacementRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID}`
    + `@${OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.mode, ID.pieces, ID.board, ID.pending];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "gap_place:state_contract")),
    edge(executor, "exposes", ID.choose, "gap_place:certified_choices"),
    edge(ID.choose, "derives", ID.resolve, "gap_place:instantiate"),
    edge(ID.pieces, "derives", ID.footprints, "gap_place:model_bases_and_size"),
    edge(ID.board, "derives", ID.footprints, "gap_place:terrain_and_token_footprints"),
    edge(ID.footprints, "derives", ID.gap, "gap_place:physical_width"),
    edge(ID.footprints, "derives", ID.endpoint, "gap_place:base_fit"),
    edge(ID.gap, "derives", ID.place, "gap_place:place_ignores_transit_gap"),
    edge(ID.endpoint, "derives", ID.place, "gap_place:legal_place_endpoint"),
    edge(ID.place, "derives", ID.resolve, "gap_place:complete_plan"),
    edge(ID.resolve, "derives", ID.event, "gap_place:apply"),
    edge(ID.event, "writes", ID.result, "gap_place:result"),
    edge(ID.event, "writes", ID.pieces, "gap_place:model_positions"),
    edge(ID.event, "writes", ID.pending, "gap_place:pending_clear"),
    edge(ID.event, "writes", ID.log, "gap_place:log"),
    edge(ID.source, "verified_by", ID.sourceTest, "gap_place:source_judge"),
    edge(ID.gap, "verified_by", ID.gapTest, "gap_place:gap_judge"),
    edge(ID.endpoint, "verified_by", ID.endpointTest, "gap_place:endpoint_judge"),
    edge(ID.place, "verified_by", ID.placeTest, "gap_place:place_judge"),
    edge(executor, "verified_by", ID.authorityTest, "gap_place:authority"),
    edge(executor, "verified_by", ID.graphTest, "gap_place:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.resolve,
      "gap_place:stale")),
  ];
  const additions = [
    node(ID.pending, "state_field", "Gap or Place geometry pending"),
    node(ID.result, "state_field", "Last Gap or Place geometry resolution"),
    node(ID.choose, "action_variant", "Choose certified Gap or Place plan"),
    node(ID.resolve, "action_variant", "Resolve Gap or Place geometry"),
    node(ID.footprints, "derived_value", "Physical model, token and terrain footprints"),
    node(ID.gap, "derived_value", "Gap width, Size threshold and opening agreement"),
    node(ID.endpoint, "derived_value", "Physically fitting legal endpoint"),
    node(ID.place, "derived_value", "Place range, nonmovement and coherency result"),
    node(ID.event, "state_event", "Gap or Place geometry resolved"),
    node(ID.sourceTest, "judge_test", "Gap and Place source-lock Judge"),
    node(ID.gapTest, "judge_test", "Gap Size, opening and Flying Judge"),
    node(ID.endpointTest, "judge_test", "Endpoint base-fit Judge"),
    node(ID.placeTest, "judge_test", "Place semantics and coherency Judge"),
    node(ID.authorityTest, "judge_test", "Gap and Place Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Gap and Place relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:gap_place_geometry_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_GAP_PLACE_GEOMETRY_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.result, ID.log, ID.choose,
        ID.resolve, ID.footprints, ID.gap, ID.endpoint, ID.place, ID.event,
        ID.sourceTest, ID.gapTest, ID.endpointTest, ID.placeTest,
        ID.authorityTest, ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [{ from: ID.footprints, to: ID.event,
        relationships: ["derives"], maxDepth: 5 }],
      forbiddenPaths: [],
      evidenceTestNodeIds: [ID.sourceTest, ID.gapTest, ID.endpointTest,
        ID.placeTest, ID.authorityTest, ID.graphTest],
    }],
  };
}
