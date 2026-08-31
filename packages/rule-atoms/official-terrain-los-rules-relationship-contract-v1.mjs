import {
  OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID,
  OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_VERSION,
} from "./official-terrain-los-rules-executor-v1.mjs";
import { createOfficialFlyingRulesRelationshipExtensionV1 } from
  "./official-flying-rules-relationship-contract-v1.mjs";

export const OFFICIAL_TERRAIN_LOS_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-84-terrain-los-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  terrainData: "state_field:officialTerrainLosDataBundle",
  mode: "state_field:rulesProcedureMode",
  pieces: "state_field:pieces",
  terrain: "state_field:board.terrain",
  pending: "state_field:pendingAction.terrainLosRules",
  result: "state_field:lastTerrainLosRulesResolution",
  log: "state_field:log",
  choose: "action_variant:terrainLosRulesV1.chooseCertifiedPlan",
  resolve: "action_variant:terrainLosRulesV1.resolve",
  footprint: "derived_value:terrainLosRulesV1.setupFootprint",
  openings: "derived_value:terrainLosRulesV1.independentOpenings",
  blocking: "derived_value:terrainLosRulesV1.blockingClassification",
  movement: "derived_value:terrainLosRulesV1.leadingModelTransit",
  full: "derived_value:terrainLosRulesV1.fullCover",
  direct: "derived_value:terrainLosRulesV1.directCover",
  independent: "derived_value:terrainLosRulesV1.independentCoverAssessment",
  deadzone: "derived_value:terrainLosRulesV1.elevationDeadZone",
  surface: "derived_value:terrainLosRulesV1.topDownSurfaceExclusion",
  visibility: "derived_value:terrainLosRulesV1.visibility",
  event: "state_event:terrain_los_rules_resolved",
  sourceTest: "judge_test:terrain-los-rules-v1-source-lock-and-profiles",
  movementTest: "judge_test:terrain-los-rules-v1-footprint-and-movement",
  coverTest: "judge_test:terrain-los-rules-v1-full-direct-independent-cover",
  apertureTest: "judge_test:terrain-los-rules-v1-apertures",
  deadzoneTest: "judge_test:terrain-los-rules-v1-dead-zone-and-close-quarters",
  surfaceTest: "judge_test:terrain-los-rules-v1-top-down-surface",
  visibilityTest: "judge_test:terrain-los-rules-v1-visibility",
  authorityTest: "judge_test:terrain-los-rules-v1-authority-replay",
  graphTest: "judge_test:terrain-los-rules-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-84" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_TERRAIN_LOS_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialTerrainLosRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("TERRAIN_LOS_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialFlyingRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.terrainData, ID.mode, ID.pieces,
    ID.terrain, ID.pending];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "terrain_los:state_contract")),
    edge(executor, "exposes", ID.choose, "terrain_los:certified_choices"),
    edge(ID.choose, "derives", ID.resolve, "terrain_los:instantiate"),
    edge(ID.terrain, "derives", ID.footprint, "terrain_los:setup_agreement"),
    edge(ID.footprint, "derives", ID.openings, "terrain_los:independent_apertures"),
    edge(ID.terrainData, "derives", ID.blocking, "terrain_los:official_size"),
    edge(ID.terrain, "derives", ID.blocking, "terrain_los:effective_size"),
    edge(ID.footprint, "derives", ID.movement, "terrain_los:swept_base"),
    edge(ID.openings, "derives", ID.movement, "terrain_los:movement_only"),
    edge(ID.blocking, "derives", ID.movement, "terrain_los:leading_model_size"),
    edge(ID.pieces, "derives", ID.full, "terrain_los:model_sizes"),
    edge(ID.blocking, "derives", ID.full, "terrain_los:both_models"),
    edge(ID.pieces, "derives", ID.direct, "terrain_los:within_one"),
    edge(ID.blocking, "derives", ID.direct, "terrain_los:covered_model_size"),
    edge(ID.full, "derives", ID.independent, "terrain_los:no_combination"),
    edge(ID.direct, "derives", ID.independent, "terrain_los:no_combination"),
    edge(ID.pieces, "derives", ID.deadzone, "terrain_los:ground_and_high"),
    edge(ID.terrain, "derives", ID.deadzone, "terrain_los:size_three_within_one"),
    edge(ID.surface, "derives", ID.deadzone, "terrain_los:standing_surface_excluded"),
    edge(ID.footprint, "derives", ID.surface, "terrain_los:top_down_surface"),
    edge(ID.openings, "derives", ID.visibility, "terrain_los:los_aperture"),
    edge(ID.independent, "derives", ID.visibility, "terrain_los:cover_gate"),
    edge(ID.deadzone, "derives", ID.visibility, "terrain_los:close_quarters_exception"),
    edge(ID.surface, "derives", ID.visibility, "terrain_los:surface_exclusion"),
    edge(ID.movement, "derives", ID.resolve, "terrain_los:leading_model_plan"),
    edge(ID.visibility, "derives", ID.resolve, "terrain_los:line_of_sight_plan"),
    edge(ID.resolve, "derives", ID.event, "terrain_los:apply"),
    edge(ID.event, "writes", ID.result, "terrain_los:result"),
    edge(ID.event, "writes", ID.pending, "terrain_los:pending_clear"),
    edge(ID.event, "writes", ID.log, "terrain_los:log"),
    edge(ID.source, "verified_by", ID.sourceTest, "terrain_los:source_judge"),
    edge(ID.terrainData, "verified_by", ID.sourceTest, "terrain_los:profile_judge"),
    edge(ID.footprint, "verified_by", ID.movementTest, "terrain_los:footprint_judge"),
    edge(ID.movement, "verified_by", ID.movementTest, "terrain_los:movement_judge"),
    edge(ID.full, "verified_by", ID.coverTest, "terrain_los:full_cover_judge"),
    edge(ID.direct, "verified_by", ID.coverTest, "terrain_los:direct_cover_judge"),
    edge(ID.independent, "verified_by", ID.coverTest,
      "terrain_los:independent_cover_judge"),
    edge(ID.openings, "verified_by", ID.apertureTest, "terrain_los:aperture_judge"),
    edge(ID.deadzone, "verified_by", ID.deadzoneTest, "terrain_los:dead_zone_judge"),
    edge(ID.surface, "verified_by", ID.surfaceTest, "terrain_los:surface_judge"),
    edge(ID.visibility, "verified_by", ID.visibilityTest, "terrain_los:visibility_judge"),
    edge(executor, "verified_by", ID.authorityTest, "terrain_los:authority"),
    edge(executor, "verified_by", ID.graphTest, "terrain_los:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.resolve,
      "terrain_los:stale")),
  ];
  const additions = [
    node(ID.terrainData, "state_field", "Official terrain and LoS data bundle"),
    node(ID.pending, "state_field", "Terrain and LoS rules pending"),
    node(ID.result, "state_field", "Last terrain and LoS rules resolution"),
    node(ID.choose, "action_variant", "Choose certified terrain or LoS plan"),
    node(ID.resolve, "action_variant", "Resolve terrain or LoS procedure"),
    node(ID.footprint, "derived_value", "Agreed terrain footprint"),
    node(ID.openings, "derived_value", "Independent movement and LoS openings"),
    node(ID.blocking, "derived_value", "Blocking terrain classification"),
    node(ID.movement, "derived_value", "Leading-model terrain transit"),
    node(ID.full, "derived_value", "Full cover"),
    node(ID.direct, "derived_value", "Direct cover"),
    node(ID.independent, "derived_value", "Independent terrain cover assessment"),
    node(ID.deadzone, "derived_value", "Elevation dead zone and close quarters"),
    node(ID.surface, "derived_value", "Top-down terrain surface exclusion"),
    node(ID.visibility, "derived_value", "Model visibility"),
    node(ID.event, "state_event", "Terrain or LoS rules resolved"),
    node(ID.sourceTest, "judge_test", "Terrain/LoS source and profiles Judge"),
    node(ID.movementTest, "judge_test", "Terrain footprint and movement Judge"),
    node(ID.coverTest, "judge_test", "Full/direct/independent cover Judge"),
    node(ID.apertureTest, "judge_test", "Terrain aperture Judge"),
    node(ID.deadzoneTest, "judge_test", "Dead zone and close quarters Judge"),
    node(ID.surfaceTest, "judge_test", "Top-down terrain surface Judge"),
    node(ID.visibilityTest, "judge_test", "Visibility Judge"),
    node(ID.authorityTest, "judge_test", "Terrain/LoS Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Terrain/LoS relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:terrain_los_rules_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_TERRAIN_LOS_RULES_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.result, ID.log, ID.choose,
        ID.resolve, ID.footprint, ID.openings, ID.blocking, ID.movement, ID.full,
        ID.direct, ID.independent, ID.deadzone, ID.surface, ID.visibility, ID.event,
        ID.sourceTest, ID.movementTest, ID.coverTest, ID.apertureTest,
        ID.deadzoneTest, ID.surfaceTest, ID.visibilityTest, ID.authorityTest,
        ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [
        { from: ID.terrain, to: ID.event, relationships: ["derives"], maxDepth: 8 },
        { from: ID.terrainData, to: ID.event,
          relationships: ["derives"], maxDepth: 8 },
        { from: ID.pieces, to: ID.event, relationships: ["derives"], maxDepth: 8 },
      ],
      forbiddenPaths: [],
      evidenceTestNodeIds: [ID.sourceTest, ID.movementTest, ID.coverTest,
        ID.apertureTest, ID.deadzoneTest, ID.surfaceTest, ID.visibilityTest,
        ID.authorityTest, ID.graphTest],
    }],
  };
}
