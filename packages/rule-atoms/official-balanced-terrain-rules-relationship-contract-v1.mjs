import {
  OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID,
  OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_VERSION,
} from "./official-balanced-terrain-rules-executor-v1.mjs";
import { createOfficialDeploymentGeometryRulesRelationshipExtensionV1 } from
  "./official-deployment-geometry-rules-relationship-contract-v1.mjs";

export const OFFICIAL_BALANCED_TERRAIN_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-108-balanced-terrain-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  geometryData: "state_field:officialDeploymentGeometryDataBundle",
  geometry: "state_field:officialDeploymentGeometryBinding",
  terrainData: "state_field:officialBalancedTerrainRulesDataBundle",
  setup: "state_field:officialBattlefieldSetup",
  terrain: "state_field:board.terrain",
  agreement: "state_field:board.specialTerrainAgreement",
  height: "state_field:officialTerrainHeightTierLedger",
  markers: "state_field:officialMissionMarkerPlacement",
  certificate: "state_field:officialBalancedTerrainSetupCertificate",
  history: "state_field:balancedTerrainRulesHistory",
  result: "state_field:lastBalancedTerrainRulesResolution",
  log: "state_field:log",
  action: "action_variant:balancedTerrainV1.materializeCompleteSetup",
  envelope: "derived_value:balancedTerrainV1.proportionalGuidelineEnvelope",
  counts: "derived_value:balancedTerrainV1.independentCategoryCounts",
  relocation: "derived_value:balancedTerrainV1.nearestImpassableRelocation",
  separation: "derived_value:balancedTerrainV1.majorStructureSeparation",
  quadrants: "derived_value:balancedTerrainV1.quadrantDistribution",
  manoeuvre: "derived_value:balancedTerrainV1.currentBaseManoeuvreWitness",
  centre: "derived_value:balancedTerrainV1.centreSignificantTerrain",
  fireLanes: "derived_value:balancedTerrainV1.opposingClearFireLanes",
  access: "derived_value:balancedTerrainV1.largeGroundReachableAccess",
  effects: "derived_value:balancedTerrainV1.frozenTerrainEffectAdapters",
  viewport: "derived_value:balancedTerrainV1.sharedViewportProjection",
  event: "state_event:balanced_terrain_setup_materialized",
  sourceTest: "judge_test:balanced-terrain-v1-source-and-route",
  scaleTest: "judge_test:balanced-terrain-v1-standard-skirmish-scaling",
  countTest: "judge_test:balanced-terrain-v1-count-subset-semantics",
  distributionTest: "judge_test:balanced-terrain-v1-quadrant-centre-separation",
  laneTest: "judge_test:balanced-terrain-v1-fire-and-manoeuvre-lanes",
  accessTest: "judge_test:balanced-terrain-v1-access-and-relocation",
  projectionTest: "judge_test:balanced-terrain-v1-viewport-scale-invariant",
  authorityTest: "judge_test:balanced-terrain-v1-authority-replay",
  graphTest: "judge_test:balanced-terrain-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-108" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_BALANCED_TERRAIN_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialBalancedTerrainRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("BALANCED_TERRAIN_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialDeploymentGeometryRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.geometryData, ID.geometry,
    ID.terrainData, ID.setup];
  const writes = [ID.terrain, ID.agreement, ID.height, ID.markers,
    ID.certificate, ID.history, ID.result, ID.log];
  const tests = [ID.sourceTest, ID.scaleTest, ID.countTest, ID.distributionTest,
    ID.laneTest, ID.accessTest, ID.projectionTest, ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "balanced_terrain:state_contract")),
    edge(executor, "exposes", ID.action, "balanced_terrain:complete_plan_domain"),
    edge(ID.geometry, "derives", ID.envelope, "balanced_terrain:battlefield_area"),
    edge(ID.terrainData, "derives", ID.envelope,
      "balanced_terrain:standard_guidelines"),
    edge(ID.envelope, "derives", ID.counts, "balanced_terrain:integer_ranges"),
    edge(ID.action, "derives", ID.counts, "balanced_terrain:complete_pieces"),
    edge(ID.geometry, "derives", ID.relocation,
      "balanced_terrain:mission_marker_targets"),
    edge(ID.action, "derives", ID.relocation,
      "balanced_terrain:original_and_final_footprints"),
    edge(ID.action, "derives", ID.separation,
      "balanced_terrain:major_structure_footprints"),
    edge(ID.action, "derives", ID.quadrants,
      "balanced_terrain:piece_footprint_quarter_intersections"),
    edge(ID.quadrants, "derives", ID.manoeuvre,
      "balanced_terrain:per_quadrant_clearance"),
    edge(ID.geometry, "derives", ID.centre, "balanced_terrain:table_centre"),
    edge(ID.action, "derives", ID.centre, "balanced_terrain:significant_footprints"),
    edge(ID.geometry, "derives", ID.fireLanes,
      "balanced_terrain:opposing_entry_edges"),
    edge(ID.action, "derives", ID.fireLanes,
      "balanced_terrain:clear_corridor_geometry"),
    edge(ID.action, "derives", ID.access,
      "balanced_terrain:ground_approach_paths"),
    edge(ID.terrainData, "derives", ID.effects,
      "balanced_terrain:frozen_slice84_85_86_adapters"),
    edge(ID.geometry, "derives", ID.viewport,
      "balanced_terrain:slice107_uniform_projection"),
    edge(ID.action, "derives", ID.viewport,
      "balanced_terrain:terrain_world_rectangles"),
    ...[ID.counts, ID.relocation, ID.separation, ID.quadrants, ID.manoeuvre,
      ID.centre, ID.fireLanes, ID.access, ID.effects].map((source) => (
      edge(source, "derives", ID.certificate, "balanced_terrain:certificate"))),
    edge(ID.certificate, "derives", ID.event, "balanced_terrain:apply"),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "balanced_terrain:state_mutation")),
    edge(ID.source, "verified_by", ID.sourceTest, "balanced_terrain:source_judge"),
    edge(ID.envelope, "verified_by", ID.scaleTest, "balanced_terrain:scale_judge"),
    edge(ID.counts, "verified_by", ID.countTest, "balanced_terrain:count_judge"),
    edge(ID.quadrants, "verified_by", ID.distributionTest,
      "balanced_terrain:quadrant_judge"),
    edge(ID.centre, "verified_by", ID.distributionTest,
      "balanced_terrain:centre_judge"),
    edge(ID.separation, "verified_by", ID.distributionTest,
      "balanced_terrain:separation_judge"),
    edge(ID.fireLanes, "verified_by", ID.laneTest, "balanced_terrain:fire_lane_judge"),
    edge(ID.manoeuvre, "verified_by", ID.laneTest,
      "balanced_terrain:manoeuvre_judge"),
    edge(ID.access, "verified_by", ID.accessTest, "balanced_terrain:access_judge"),
    edge(ID.relocation, "verified_by", ID.accessTest,
      "balanced_terrain:relocation_judge"),
    edge(ID.viewport, "verified_by", ID.projectionTest,
      "balanced_terrain:projection_judge"),
    edge(executor, "verified_by", ID.authorityTest, "balanced_terrain:authority"),
    edge(executor, "verified_by", ID.graphTest, "balanced_terrain:graph"),
    ...reads.map((source) => edge(source, "invalidates", ID.action,
      "balanced_terrain:stale")),
  ];
  const additions = [
    node(ID.terrainData, "state_field", "Balanced-terrain official data bundle"),
    node(ID.setup, "state_field", "Official battlefield setup lifecycle"),
    node(ID.terrain, "state_field", "Complete battlefield terrain pieces"),
    node(ID.agreement, "state_field", "Complete special-terrain agreement"),
    node(ID.height, "state_field", "Game-start terrain-height ledger"),
    node(ID.markers, "state_field", "Post-terrain mission-marker placement"),
    node(ID.certificate, "state_field", "Balanced-terrain setup certificate"),
    node(ID.history, "state_field", "Balanced-terrain resolution history"),
    node(ID.result, "state_field", "Last balanced-terrain resolution"),
    node(ID.action, "action_variant", "Materialize complete balanced terrain setup"),
    node(ID.envelope, "derived_value", "Proportional terrain guideline envelope"),
    node(ID.counts, "derived_value", "Independent overlapping category counts"),
    node(ID.relocation, "derived_value", "Nearest impassable relocation"),
    node(ID.separation, "derived_value", "Major-structure separation"),
    node(ID.quadrants, "derived_value", "Four-quadrant distribution"),
    node(ID.manoeuvre, "derived_value", "Current-base manoeuvre witness"),
    node(ID.centre, "derived_value", "Centre significant terrain"),
    node(ID.fireLanes, "derived_value", "Opposing clear fire lanes"),
    node(ID.access, "derived_value", "Ground-reachable large-terrain access"),
    node(ID.effects, "derived_value", "Frozen terrain-effect adapters"),
    node(ID.viewport, "derived_value", "Shared terrain viewport projection"),
    node(ID.event, "state_event", "Balanced terrain setup materialized"),
    node(ID.sourceTest, "judge_test", "Balanced-terrain source and route Judge"),
    node(ID.scaleTest, "judge_test", "Standard/Skirmish scaling Judge"),
    node(ID.countTest, "judge_test", "Terrain count subset Judge"),
    node(ID.distributionTest, "judge_test", "Quadrant/centre/separation Judge"),
    node(ID.laneTest, "judge_test", "Fire/manoeuvre lane Judge"),
    node(ID.accessTest, "judge_test", "Access and relocation Judge"),
    node(ID.projectionTest, "judge_test", "Viewport scale-invariant Judge"),
    node(ID.authorityTest, "judge_test", "Balanced-terrain Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Balanced-terrain graph negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes, ...additions.filter((entry) => (
    !previousIds.has(entry.nodeId)))], edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:balanced_terrain_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_BALANCED_TERRAIN_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_BALANCED_TERRAIN_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.action,
      ID.envelope, ID.counts, ID.relocation, ID.separation, ID.quadrants,
      ID.manoeuvre, ID.centre, ID.fireLanes, ID.access, ID.effects, ID.viewport,
      ID.event, ...tests])], requiredEdges: edges,
    requiredPaths: [
      { from: ID.geometry, to: ID.event, relationships: ["derives"], maxDepth: 8 },
      { from: ID.terrainData, to: ID.event, relationships: ["derives"], maxDepth: 8 },
      { from: ID.action, to: ID.event, relationships: ["derives"], maxDepth: 8 },
      { from: ID.geometry, to: ID.viewport, relationships: ["derives"], maxDepth: 2 },
    ], forbiddenPaths: [{ from: ID.viewport, to: ID.geometry,
      relationships: ["derives", "writes"], maxDepth: 3 }],
    evidenceTestNodeIds: tests,
  }] };
}
