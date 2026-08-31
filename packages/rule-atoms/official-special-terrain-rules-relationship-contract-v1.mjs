import {
  OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID,
  OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_VERSION,
} from "./official-special-terrain-rules-executor-v1.mjs";
import { createOfficialElevationEffectiveSizeRulesRelationshipExtensionV1 } from
  "./official-elevation-effective-size-rules-relationship-contract-v1.mjs";

export const OFFICIAL_SPECIAL_TERRAIN_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-86-special-terrain-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  terrainData: "state_field:officialTerrainLosDataBundle",
  mode: "state_field:rulesProcedureMode",
  pieces: "state_field:pieces",
  terrain: "state_field:board.terrain",
  agreement: "state_field:board.specialTerrainAgreement",
  pending: "state_field:pendingAction.specialTerrainRules",
  result: "state_field:lastSpecialTerrainRulesResolution",
  log: "state_field:log",
  choose: "action_variant:specialTerrainRulesV1.chooseCertifiedPlan",
  resolve: "action_variant:specialTerrainRulesV1.resolve",
  access: "derived_value:specialTerrainRulesV1.accessPointGraph",
  elevation: "derived_value:specialTerrainRulesV1.elevationTransition",
  impassable: "derived_value:specialTerrainRulesV1.impassableDerivation",
  ramp: "derived_value:specialTerrainRulesV1.rampTransit",
  grass: "derived_value:specialTerrainRulesV1.grassInteraction",
  grassLifecycle: "derived_value:specialTerrainRulesV1.grassRemovalLifecycle",
  gap: "derived_value:specialTerrainRulesV1.slice82GapAdapter",
  terrainAdapter: "derived_value:specialTerrainRulesV1.slice84TerrainAdapter",
  flying: "derived_value:specialTerrainRulesV1.slice83FlyingAdapter",
  coherency: "derived_value:specialTerrainRulesV1.accessPointCoherencyGraph",
  movement: "derived_value:specialTerrainRulesV1.leadingModelMovement",
  visibility: "derived_value:specialTerrainRulesV1.grassVisibility",
  event: "state_event:special_terrain_rules_resolved",
  sourceTest: "judge_test:special-terrain-v1-source-lock",
  agreementTest: "judge_test:special-terrain-v1-setup-agreement",
  accessTest: "judge_test:special-terrain-v1-access-and-ramp",
  grassTest: "judge_test:special-terrain-v1-grass-lifecycle-and-los",
  impassableTest: "judge_test:special-terrain-v1-impassable-and-small-terrain",
  gapTest: "judge_test:special-terrain-v1-leading-model-gap-adapter",
  flyingTest: "judge_test:special-terrain-v1-flying-grass-adapter",
  authorityTest: "judge_test:special-terrain-v1-authority-replay",
  graphTest: "judge_test:special-terrain-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-86" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_SPECIAL_TERRAIN_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialSpecialTerrainRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("SPECIAL_TERRAIN_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialElevationEffectiveSizeRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.terrainData, ID.mode, ID.pieces,
    ID.terrain, ID.agreement, ID.pending];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "special_terrain:state_contract")),
    edge(executor, "exposes", ID.choose, "special_terrain:certified_choices"),
    edge(ID.choose, "derives", ID.resolve, "special_terrain:instantiate"),
    edge(ID.terrain, "derives", ID.access, "special_terrain:physical_footprints"),
    edge(ID.agreement, "derives", ID.access, "special_terrain:complete_access_points"),
    edge(ID.access, "derives", ID.elevation, "special_terrain:connected_levels"),
    edge(ID.access, "derives", ID.impassable, "special_terrain:missing_access_point"),
    edge(ID.access, "derives", ID.ramp, "special_terrain:base_and_top_access"),
    edge(ID.terrain, "derives", ID.ramp, "special_terrain:size_one_mid_surface"),
    edge(ID.terrain, "derives", ID.grass, "special_terrain:size_two_grass"),
    edge(ID.pieces, "derives", ID.grass, "special_terrain:path_or_endpoint"),
    edge(ID.grass, "derives", ID.grassLifecycle,
      "special_terrain:permanent_battle_removal"),
    edge(ID.pieces, "derives", ID.gap, "special_terrain:leading_model_path"),
    edge(ID.terrain, "derives", ID.gap, "special_terrain:physical_gap_boundaries"),
    edge(ID.terrain, "derives", ID.terrainAdapter, "special_terrain:size_zero_one"),
    edge(ID.terrainData, "derives", ID.terrainAdapter,
      "special_terrain:official_printed_sizes"),
    edge(ID.pieces, "derives", ID.flying, "special_terrain:flying_profile"),
    edge(ID.grass, "derives", ID.flying, "special_terrain:overflight_endpoint_split"),
    edge(ID.access, "derives", ID.coherency, "special_terrain:link_apertures"),
    edge(ID.pieces, "derives", ID.coherency, "special_terrain:model_graph"),
    edge(ID.elevation, "derives", ID.movement, "special_terrain:elevation_path"),
    edge(ID.impassable, "derives", ID.movement, "special_terrain:transit_forbidden"),
    edge(ID.ramp, "derives", ID.movement, "special_terrain:ramp_path"),
    edge(ID.grass, "derives", ID.movement, "special_terrain:grass_passable"),
    edge(ID.gap, "derives", ID.movement, "special_terrain:gap_clearance"),
    edge(ID.terrainAdapter, "derives", ID.movement,
      "special_terrain:ordinary_terrain_reuse"),
    edge(ID.flying, "derives", ID.movement, "special_terrain:flying_reuse"),
    edge(ID.coherency, "derives", ID.movement, "special_terrain:formation_valid"),
    edge(ID.grass, "derives", ID.visibility, "special_terrain:standard_cover"),
    edge(ID.terrainAdapter, "derives", ID.visibility,
      "special_terrain:slice84_los_geometry"),
    edge(ID.movement, "derives", ID.resolve, "special_terrain:movement_plan"),
    edge(ID.visibility, "derives", ID.resolve, "special_terrain:los_plan"),
    edge(ID.resolve, "derives", ID.event, "special_terrain:apply"),
    edge(ID.event, "writes", ID.pieces, "special_terrain:model_positions"),
    edge(ID.event, "writes", ID.terrain, "special_terrain:grass_removed"),
    edge(ID.event, "writes", ID.result, "special_terrain:result"),
    edge(ID.event, "writes", ID.pending, "special_terrain:pending_clear"),
    edge(ID.event, "writes", ID.log, "special_terrain:log"),
    edge(ID.source, "verified_by", ID.sourceTest, "special_terrain:source_judge"),
    edge(ID.agreement, "verified_by", ID.agreementTest,
      "special_terrain:agreement_judge"),
    edge(ID.access, "verified_by", ID.accessTest, "special_terrain:access_judge"),
    edge(ID.ramp, "verified_by", ID.accessTest, "special_terrain:ramp_judge"),
    edge(ID.grassLifecycle, "verified_by", ID.grassTest,
      "special_terrain:grass_lifecycle_judge"),
    edge(ID.visibility, "verified_by", ID.grassTest, "special_terrain:grass_los_judge"),
    edge(ID.impassable, "verified_by", ID.impassableTest,
      "special_terrain:impassable_judge"),
    edge(ID.gap, "verified_by", ID.gapTest, "special_terrain:gap_adapter_judge"),
    edge(ID.flying, "verified_by", ID.flyingTest, "special_terrain:flying_judge"),
    edge(executor, "verified_by", ID.authorityTest, "special_terrain:authority"),
    edge(executor, "verified_by", ID.graphTest, "special_terrain:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.resolve,
      "special_terrain:stale")),
  ];
  const additions = [
    node(ID.agreement, "state_field", "Complete special-terrain setup agreement"),
    node(ID.pending, "state_field", "Special-terrain procedure pending"),
    node(ID.result, "state_field", "Last special-terrain resolution"),
    node(ID.choose, "action_variant", "Choose certified special-terrain plan"),
    node(ID.resolve, "action_variant", "Resolve special-terrain procedure"),
    node(ID.access, "derived_value", "Access Point connection graph"),
    node(ID.elevation, "derived_value", "Access Point elevation transition"),
    node(ID.impassable, "derived_value", "Impassable terrain derivation"),
    node(ID.ramp, "derived_value", "Ramp Access Point transit"),
    node(ID.grass, "derived_value", "Grass movement and LoS interaction"),
    node(ID.grassLifecycle, "derived_value", "Permanent Grass removal lifecycle"),
    node(ID.gap, "derived_value", "Frozen Slice 82 gap adapter"),
    node(ID.terrainAdapter, "derived_value", "Frozen Slice 84 terrain adapter"),
    node(ID.flying, "derived_value", "Frozen Slice 83 Flying adapter"),
    node(ID.coherency, "derived_value", "Access Point coherency graph"),
    node(ID.movement, "derived_value", "Leading Model special-terrain movement"),
    node(ID.visibility, "derived_value", "Grass visibility under Cover rules"),
    node(ID.event, "state_event", "Special-terrain rules resolved"),
    node(ID.sourceTest, "judge_test", "Special-terrain pinned-source Judge"),
    node(ID.agreementTest, "judge_test", "Special-terrain agreement Judge"),
    node(ID.accessTest, "judge_test", "Access Point and Ramp Judge"),
    node(ID.grassTest, "judge_test", "Grass lifecycle and LoS Judge"),
    node(ID.impassableTest, "judge_test", "Impassable and small-terrain Judge"),
    node(ID.gapTest, "judge_test", "Leading Model gap adapter Judge"),
    node(ID.flyingTest, "judge_test", "Flying Grass adapter Judge"),
    node(ID.authorityTest, "judge_test", "Special-terrain Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Special-terrain relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:special_terrain_rules_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_SPECIAL_TERRAIN_RULES_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.result, ID.log, ID.choose,
        ID.resolve, ID.access, ID.elevation, ID.impassable, ID.ramp, ID.grass,
        ID.grassLifecycle, ID.gap, ID.terrainAdapter, ID.flying, ID.coherency,
        ID.movement, ID.visibility, ID.event, ID.sourceTest, ID.agreementTest,
        ID.accessTest, ID.grassTest, ID.impassableTest, ID.gapTest,
        ID.flyingTest, ID.authorityTest, ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [
        { from: ID.agreement, to: ID.event, relationships: ["derives"], maxDepth: 10 },
        { from: ID.terrain, to: ID.event, relationships: ["derives"], maxDepth: 10 },
        { from: ID.pieces, to: ID.event, relationships: ["derives"], maxDepth: 10 },
      ],
      forbiddenPaths: [],
      evidenceTestNodeIds: [ID.sourceTest, ID.agreementTest, ID.accessTest,
        ID.grassTest, ID.impassableTest, ID.gapTest, ID.flyingTest,
        ID.authorityTest, ID.graphTest],
    }],
  };
}
