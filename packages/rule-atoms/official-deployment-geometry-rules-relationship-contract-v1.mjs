import {
  OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID,
  OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_VERSION,
} from "./official-deployment-geometry-rules-executor-v1.mjs";
import { createOfficialMissionDeploymentDraftRulesRelationshipExtensionV1 } from
  "./official-mission-deployment-draft-rules-relationship-contract-v1.mjs";

export const OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-107-deployment-geometry-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  draftData: "state_field:officialMissionDeploymentDraftDataBundle",
  data: "state_field:officialDeploymentGeometryDataBundle",
  mode: "state_field:rulesProcedureMode", phase: "state_field:phase",
  active: "state_field:activeSideKey", players: "state_field:players",
  draft: "state_field:officialMissionDeploymentDraft",
  draftBinding: "state_field:officialMissionDeploymentDraftBinding",
  binding: "state_field:officialDeploymentGeometryBinding",
  battlefield: "state_field:officialBattlefieldSetup",
  history: "state_field:deploymentGeometryHistory",
  last: "state_field:lastDeploymentGeometryResolution",
  log: "state_field:log",
  action: "action_variant:deploymentGeometryV1.materializeSelectedCard",
  profile: "derived_value:deploymentGeometryV1.selectedExactProfile",
  dimensions: "derived_value:deploymentGeometryV1.battlefieldDimensions",
  edges: "derived_value:deploymentGeometryV1.entryEdgesByPlayer",
  zones: "derived_value:deploymentGeometryV1.zoneOfInfluenceCornerMarkers",
  markers: "derived_value:deploymentGeometryV1.missionMarkerCoordinateTargets",
  height: "derived_value:deploymentGeometryV1.gameStartTerrainHeightTiers",
  placement: "derived_value:deploymentGeometryV1.postTerrainMarkerPlacement",
  viewport: "derived_value:deploymentGeometryV1.uniformWorldToViewportProjection",
  physicalSize: "derived_value:deploymentGeometryV1.mmToInchPhysicalTokenSize",
  order: "derived_value:deploymentGeometryV1.corePdfSetupOrder",
  conflict: "semantic_projection:rules.corePdfSetupOrderOverridesCommandCenterProse",
  next: "semantic_projection:rules.balancedTerrainOwnedBySlice108",
  event: "state_event:deployment_geometry_materialized",
  sourceTest: "judge_test:deployment-geometry-v1-source-precedence",
  profileTest: "judge_test:deployment-geometry-v1-ten-profile-transcription",
  markerTest: "judge_test:deployment-geometry-v1-marker-support",
  faqTest: "judge_test:deployment-geometry-v1-faq-constraints",
  authorityTest: "judge_test:deployment-geometry-v1-authority-replay",
  graphTest: "judge_test:deployment-geometry-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-107" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialDeploymentGeometryRulesRelationshipExtensionV1(
  input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("DEPLOYMENT_GEOMETRY_RELEASE_INVALID");
  }
  const previous = createOfficialMissionDeploymentDraftRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash });
  const executor = `executor:${OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.draftData, ID.data, ID.mode, ID.phase,
    ID.active, ID.players, ID.draft, ID.draftBinding, ID.binding, ID.battlefield,
    ID.history, ID.last, ID.log];
  const writes = [ID.binding, ID.battlefield, ID.history, ID.last, ID.log];
  const derived = [ID.profile, ID.dimensions, ID.edges, ID.zones, ID.markers,
    ID.height, ID.placement, ID.viewport, ID.physicalSize, ID.order];
  const tests = [ID.sourceTest, ID.profileTest, ID.markerTest, ID.faqTest,
    ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "deployment_geometry:state_contract")),
    edge(executor, "exposes", ID.action,
      "deployment_geometry:single_rules_owned_materialization"),
    edge(ID.draftBinding, "gates", ID.profile,
      "deployment_geometry:selected_record_and_profile_hash"),
    edge(ID.data, "derives", ID.profile,
      "deployment_geometry:ten_exact_p2p_profiles"),
    edge(ID.profile, "derives", ID.dimensions,
      "deployment_geometry:labelled_card_dimensions"),
    edge(ID.profile, "derives", ID.edges,
      "deployment_geometry:labelled_entry_segments"),
    edge(ID.edges, "derives", ID.zones,
      "deployment_geometry:six_inch_influence_depth_and_partial_corners"),
    edge(ID.profile, "derives", ID.markers,
      "deployment_geometry:labelled_marker_coordinates"),
    edge(ID.data, "derives", ID.height,
      "deployment_geometry:faq_9_46_each_piece_game_start"),
    edge(ID.height, "gates", ID.placement,
      "deployment_geometry:rules_derive_marker_support_elevation"),
    edge(ID.markers, "gates", ID.placement,
      "deployment_geometry:impassable_overlap_forbidden"),
    edge(ID.dimensions, "derives", ID.viewport,
      "deployment_geometry:uniform_fit_preserves_aspect_ratio"),
    edge(ID.markers, "derives", ID.physicalSize,
      "deployment_geometry:thirty_two_mm_divided_by_twenty_five_point_four"),
    edge(ID.physicalSize, "constrains", ID.viewport,
      "deployment_geometry:zoom_dpr_and_touch_targets_do_not_change_rules_size"),
    edge(ID.data, "derives", ID.order,
      "deployment_geometry:core_pdf_primary_sequence"),
    edge(ID.order, "constrains", ID.conflict,
      "deployment_geometry:command_center_prose_cannot_override_pdf"),
    edge(ID.order, "gates", ID.next,
      "deployment_geometry:terrain_before_physical_marker_placement"),
    edge(ID.action, "derives", ID.event,
      "deployment_geometry:materialize_exact_selected_profile"),
    ...derived.map((source) => edge(source, "derives", ID.event,
      "deployment_geometry:rules_owned_resolution")),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "deployment_geometry:commit")),
    edge(ID.data, "verified_by", ID.sourceTest,
      "deployment_geometry:source_precedence_judge"),
    edge(ID.profile, "verified_by", ID.profileTest,
      "deployment_geometry:profile_judge"),
    edge(ID.placement, "verified_by", ID.markerTest,
      "deployment_geometry:marker_judge"),
    edge(ID.height, "verified_by", ID.faqTest,
      "deployment_geometry:faq_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "deployment_geometry:authority"),
    edge(executor, "verified_by", ID.graphTest,
      "deployment_geometry:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.action,
      "deployment_geometry:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official Deployment geometry bundle"),
    node(ID.binding, "state_field", "Selected Deployment geometry binding"),
    node(ID.battlefield, "state_field", "Battlefield setup projection"),
    node(ID.history, "state_field", "Deployment geometry history"),
    node(ID.last, "state_field", "Last Deployment geometry resolution"),
    node(ID.action, "action_variant", "Materialize selected Deployment geometry"),
    ...derived.map((id) => node(id, "derived_value", id.replace(/^derived_value:/u, ""))),
    node(ID.conflict, "semantic_projection",
      "Core PDF setup order has authority over conflicting Command Center prose"),
    node(ID.next, "semantic_projection", "Balanced terrain remains Slice 108 authority"),
    node(ID.event, "state_event", "Deployment geometry materialized"),
    ...tests.map((id) => node(id, "judge_test", id.replace(/^judge_test:/u, ""))),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes,
    ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
  edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:deployment_geometry_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_DEPLOYMENT_GEOMETRY_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.action,
      ...derived, ID.conflict, ID.next, ID.event, ...tests])],
    requiredEdges: edges,
    requiredPaths: [
      { from: ID.draftBinding, to: ID.profile,
        relationships: ["gates"], maxDepth: 2 },
      { from: ID.profile, to: ID.zones,
        relationships: ["derives"], maxDepth: 3 },
      { from: ID.markers, to: ID.placement,
        relationships: ["gates"], maxDepth: 2 },
      { from: ID.height, to: ID.placement,
        relationships: ["gates"], maxDepth: 2 },
      { from: ID.physicalSize, to: ID.viewport,
        relationships: ["constrains"], maxDepth: 2 },
      { from: ID.order, to: ID.next,
        relationships: ["gates"], maxDepth: 2 },
      { from: ID.action, to: ID.binding,
        relationships: ["derives", "writes"], maxDepth: 3 },
    ],
    forbiddenPaths: [{ from: ID.next, to: ID.binding,
      relationships: ["derives", "writes"], maxDepth: 3 }],
    evidenceTestNodeIds: tests,
  }] };
}
