import {
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ATOM_IDS,
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID,
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_VERSION,
} from "./official-direct-movement-displacement-executor-v1.mjs";
import { createOfficialCloseCombatLifecycleRelationshipExtensionV1 } from
  "./official-close-combat-lifecycle-relationship-contract-v1.mjs";

export const OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-81-direct-movement-displacement";
const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  mode: "state_field:rulesProcedureMode",
  pieces: "state_field:pieces",
  board: "state_field:board",
  pending: "state_field:pendingAction.directMovementDisplacement",
  result: "state_field:lastDirectMovementDisplacementResolution",
  log: "state_field:log",
  choose: "action_variant:directMovementDisplacementV1.chooseCertifiedOutcome",
  resolve: "action_variant:directMovementDisplacementV1.resolve",
  leaders: "derived_value:directMovementDisplacementV1.leadingAndReferenceModels",
  routes: "derived_value:directMovementDisplacementV1.shortestBypassRoutes",
  endpoint: "derived_value:directMovementDisplacementV1.endpointAndEdgeStop",
  placements: "derived_value:directMovementDisplacementV1.coherentParetoPlacements",
  displacement: "derived_value:directMovementDisplacementV1.contactOrNearestPlacement",
  event: "state_event:direct_movement_displacement_resolved",
  sourceTest: "judge_test:direct-movement-displacement-v1-source-lock",
  geometryTest: "judge_test:direct-movement-displacement-v1-route-endpoint",
  placementTest: "judge_test:direct-movement-displacement-v1-multi-model-placement",
  displacementTest: "judge_test:direct-movement-displacement-v1-contact-nearest",
  authorityTest: "judge_test:direct-movement-displacement-v1-authority-replay",
  graphTest: "judge_test:direct-movement-displacement-v1-relationship-negative-gap",
});
function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-81" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}
export function createOfficialDirectMovementDisplacementRelationshipExtensionV1(
  input = {},
) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("DIRECT_MOVEMENT_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialCloseCombatLifecycleRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID}`
    + `@${OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.mode, ID.pieces, ID.board, ID.pending];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "direct_movement:state_contract")),
    edge(executor, "exposes", ID.choose, "direct_movement:certified_choices"),
    edge(ID.choose, "derives", ID.resolve, "direct_movement:instantiate"),
    edge(ID.pieces, "derives", ID.leaders, "direct_movement:physical_distance"),
    edge(ID.leaders, "derives", ID.routes, "direct_movement:vector_and_shortest_bypass"),
    edge(ID.board, "derives", ID.routes, "direct_movement:geometry_certificate"),
    edge(ID.routes, "derives", ID.endpoint, "direct_movement:endpoint_relation_and_edge"),
    edge(ID.endpoint, "derives", ID.placements, "direct_movement:remaining_models"),
    edge(ID.placements, "derives", ID.displacement,
      "direct_movement:leading_overlap_contact_priority"),
    edge(ID.resolve, "derives", ID.event, "direct_movement:apply"),
    edge(ID.event, "writes", ID.result, "direct_movement:result"),
    edge(ID.event, "writes", ID.pieces, "direct_movement:model_and_unit_state"),
    edge(ID.event, "writes", ID.board, "direct_movement:token_displacement"),
    edge(ID.event, "writes", ID.pending, "direct_movement:pending_clear"),
    edge(ID.event, "writes", ID.log, "direct_movement:log"),
    edge(ID.source, "verified_by", ID.sourceTest, "direct_movement:source_judge"),
    edge(ID.routes, "verified_by", ID.geometryTest, "direct_movement:geometry_judge"),
    edge(ID.placements, "verified_by", ID.placementTest,
      "direct_movement:placement_judge"),
    edge(ID.displacement, "verified_by", ID.displacementTest,
      "direct_movement:displacement_judge"),
    edge(executor, "verified_by", ID.authorityTest, "direct_movement:authority"),
    edge(executor, "verified_by", ID.graphTest, "direct_movement:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.resolve,
      "direct_movement:stale")),
  ];
  const additions = [
    node(ID.pending, "state_field", "Direct movement and displacement pending"),
    node(ID.result, "state_field", "Last direct movement and displacement resolution"),
    node(ID.choose, "action_variant", "Choose certified direct movement outcome"),
    node(ID.resolve, "action_variant", "Resolve direct movement and displacement"),
    node(ID.leaders, "derived_value", "Leading and target-reference model choices"),
    node(ID.routes, "derived_value", "Shortest certified direct-movement routes"),
    node(ID.endpoint, "derived_value", "Towards/away endpoint and battlefield edge stop"),
    node(ID.placements, "derived_value", "Coherent Pareto-optimal remaining placements"),
    node(ID.displacement, "derived_value", "Displacement contact or nearest placement"),
    node(ID.event, "state_event", "Direct movement and displacement resolved"),
    node(ID.sourceTest, "judge_test", "Direct movement source-lock Judge"),
    node(ID.geometryTest, "judge_test", "Direct vector, bypass and endpoint Judge"),
    node(ID.placementTest, "judge_test", "Multi-model placement priority Judge"),
    node(ID.displacementTest, "judge_test", "Displacement contact priority Judge"),
    node(ID.authorityTest, "judge_test", "Direct movement Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Direct movement relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:direct_movement_displacement_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.result, ID.log, ID.choose,
        ID.resolve, ID.leaders, ID.routes, ID.endpoint, ID.placements, ID.displacement,
        ID.event, ID.sourceTest, ID.geometryTest, ID.placementTest, ID.displacementTest,
        ID.authorityTest, ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [{ from: ID.leaders, to: ID.displacement,
        relationships: ["derives"], maxDepth: 4 }],
      forbiddenPaths: [],
      evidenceTestNodeIds: [ID.sourceTest, ID.geometryTest, ID.placementTest,
        ID.displacementTest, ID.authorityTest, ID.graphTest],
    }],
  };
}
