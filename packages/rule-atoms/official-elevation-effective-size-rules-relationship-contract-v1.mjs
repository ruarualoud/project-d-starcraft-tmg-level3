import {
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID,
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_VERSION,
} from "./official-elevation-effective-size-rules-executor-v1.mjs";
import { createOfficialTerrainLosRulesRelationshipExtensionV1 } from
  "./official-terrain-los-rules-relationship-contract-v1.mjs";

export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-85-elevation-effective-size-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  terrainData: "state_field:officialTerrainLosDataBundle",
  mode: "state_field:rulesProcedureMode",
  pieces: "state_field:pieces",
  terrain: "state_field:board.terrain",
  elevation: "state_field:board.terrainElevationAgreement",
  pending: "state_field:pendingAction.elevationEffectiveSizeRules",
  result: "state_field:lastElevationEffectiveSizeRulesResolution",
  log: "state_field:log",
  choose: "action_variant:elevationEffectiveSizeRulesV1.chooseCertifiedPlan",
  resolve: "action_variant:elevationEffectiveSizeRulesV1.resolve",
  stack: "derived_value:elevationEffectiveSizeRulesV1.terrainSupportGraph",
  terrainSize: "derived_value:elevationEffectiveSizeRulesV1.terrainEffectiveSize",
  modelSize: "derived_value:elevationEffectiveSizeRulesV1.modelEffectiveSize",
  band: "derived_value:elevationEffectiveSizeRulesV1.elevationBand",
  distance: "derived_value:elevationEffectiveSizeRulesV1.horizontalDistance",
  geometry: "derived_value:elevationEffectiveSizeRulesV1.slice84GeometryAdapter",
  full: "derived_value:elevationEffectiveSizeRulesV1.fullCover",
  direct: "derived_value:elevationEffectiveSizeRulesV1.directCover",
  deadzone: "derived_value:elevationEffectiveSizeRulesV1.elevationDeadZone",
  origin: "derived_value:elevationEffectiveSizeRulesV1.lowerElevationOrigin",
  evade: "derived_value:elevationEffectiveSizeRulesV1.highGroundEvade",
  flying: "derived_value:elevationEffectiveSizeRulesV1.flyingCoverAdapter",
  visibility: "derived_value:elevationEffectiveSizeRulesV1.visibility",
  event: "state_event:elevation_effective_size_rules_resolved",
  sourceTest: "judge_test:elevation-effective-size-v1-source-lock",
  stackTest: "judge_test:elevation-effective-size-v1-stacking",
  modelTest: "judge_test:elevation-effective-size-v1-model-size",
  distanceTest: "judge_test:elevation-effective-size-v1-horizontal-distance",
  coverTest: "judge_test:elevation-effective-size-v1-cover",
  evadeTest: "judge_test:elevation-effective-size-v1-high-ground-evade",
  flyingTest: "judge_test:elevation-effective-size-v1-flying-cover",
  authorityTest: "judge_test:elevation-effective-size-v1-authority-replay",
  graphTest: "judge_test:elevation-effective-size-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-85" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialElevationEffectiveSizeRulesRelationshipExtensionV1(
  input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("ELEVATION_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialTerrainLosRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.terrainData, ID.mode, ID.pieces,
    ID.terrain, ID.elevation, ID.pending];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "elevation:state_contract")),
    edge(executor, "exposes", ID.choose, "elevation:certified_choices"),
    edge(ID.choose, "derives", ID.resolve, "elevation:instantiate"),
    edge(ID.elevation, "derives", ID.stack, "elevation:complete_support_graph"),
    edge(ID.terrain, "derives", ID.stack, "elevation:physical_support"),
    edge(ID.stack, "derives", ID.terrainSize, "elevation:recursive_sum"),
    edge(ID.terrainData, "derives", ID.modelSize, "elevation:printed_size"),
    edge(ID.pieces, "derives", ID.modelSize, "elevation:model_support"),
    edge(ID.terrainSize, "derives", ID.modelSize, "elevation:support_addition"),
    edge(ID.terrainSize, "derives", ID.band, "elevation:ground_mid_high"),
    edge(ID.pieces, "derives", ID.distance, "elevation:top_down_base_edges"),
    edge(ID.terrain, "derives", ID.geometry, "elevation:slice84_geometry"),
    edge(ID.modelSize, "derives", ID.full, "elevation:both_model_sizes"),
    edge(ID.terrainSize, "derives", ID.full, "elevation:terrain_threshold"),
    edge(ID.modelSize, "derives", ID.direct, "elevation:near_model_size"),
    edge(ID.terrainSize, "derives", ID.direct, "elevation:terrain_threshold"),
    edge(ID.band, "derives", ID.deadzone, "elevation:high_to_ground"),
    edge(ID.geometry, "derives", ID.deadzone, "elevation:proximity_and_trace"),
    edge(ID.band, "derives", ID.origin, "elevation:any_attacker_lower"),
    edge(ID.origin, "derives", ID.evade, "elevation:ranged_attack_origin"),
    edge(ID.band, "derives", ID.evade, "elevation:all_target_models_high"),
    edge(ID.modelSize, "derives", ID.flying, "elevation:flying_size_sentinel"),
    edge(ID.full, "derives", ID.flying, "elevation:full_cover_ignored"),
    edge(ID.direct, "derives", ID.flying, "elevation:nonflying_direct_retained"),
    edge(ID.deadzone, "derives", ID.flying, "elevation:nonflying_deadzone_retained"),
    edge(ID.geometry, "derives", ID.visibility, "elevation:trace"),
    edge(ID.full, "derives", ID.visibility, "elevation:full_cover"),
    edge(ID.direct, "derives", ID.visibility, "elevation:direct_cover"),
    edge(ID.deadzone, "derives", ID.visibility, "elevation:dead_zone"),
    edge(ID.flying, "derives", ID.visibility, "elevation:flying_cover"),
    edge(ID.distance, "derives", ID.resolve, "elevation:distance_plan"),
    edge(ID.modelSize, "derives", ID.resolve, "elevation:size_plan"),
    edge(ID.visibility, "derives", ID.resolve, "elevation:los_plan"),
    edge(ID.resolve, "derives", ID.event, "elevation:apply"),
    edge(ID.event, "writes", ID.result, "elevation:result"),
    edge(ID.event, "writes", ID.pending, "elevation:pending_clear"),
    edge(ID.event, "writes", ID.log, "elevation:log"),
    edge(ID.source, "verified_by", ID.sourceTest, "elevation:source_judge"),
    edge(ID.stack, "verified_by", ID.stackTest, "elevation:stack_judge"),
    edge(ID.modelSize, "verified_by", ID.modelTest, "elevation:model_judge"),
    edge(ID.distance, "verified_by", ID.distanceTest, "elevation:distance_judge"),
    edge(ID.visibility, "verified_by", ID.coverTest, "elevation:cover_judge"),
    edge(ID.evade, "verified_by", ID.evadeTest, "elevation:evade_judge"),
    edge(ID.flying, "verified_by", ID.flyingTest, "elevation:flying_judge"),
    edge(executor, "verified_by", ID.authorityTest, "elevation:authority"),
    edge(executor, "verified_by", ID.graphTest, "elevation:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.resolve,
      "elevation:stale")),
  ];
  const additions = [
    node(ID.elevation, "state_field", "Complete terrain elevation agreement"),
    node(ID.pending, "state_field", "Elevation and effective-size pending"),
    node(ID.result, "state_field", "Last elevation/effective-size resolution"),
    node(ID.choose, "action_variant", "Choose certified elevation plan"),
    node(ID.resolve, "action_variant", "Resolve elevation procedure"),
    node(ID.stack, "derived_value", "Terrain support graph"),
    node(ID.terrainSize, "derived_value", "Terrain effective Size"),
    node(ID.modelSize, "derived_value", "Model effective Size"),
    node(ID.band, "derived_value", "Ground, mid, or high elevation band"),
    node(ID.distance, "derived_value", "Horizontal elevation distance"),
    node(ID.geometry, "derived_value", "Frozen Slice 84 geometry adapter"),
    node(ID.full, "derived_value", "Effective-size Full Cover"),
    node(ID.direct, "derived_value", "Effective-size Direct Cover"),
    node(ID.deadzone, "derived_value", "Effective-size elevation dead zone"),
    node(ID.origin, "derived_value", "Lower-elevation attack origin"),
    node(ID.evade, "derived_value", "High-ground Evade eligibility"),
    node(ID.flying, "derived_value", "Frozen Slice 83 Flying cover adapter"),
    node(ID.visibility, "derived_value", "Elevated model visibility"),
    node(ID.event, "state_event", "Elevation/effective-size rules resolved"),
    node(ID.sourceTest, "judge_test", "Elevation pinned-source Judge"),
    node(ID.stackTest, "judge_test", "Terrain stacking Judge"),
    node(ID.modelTest, "judge_test", "Model effective-size Judge"),
    node(ID.distanceTest, "judge_test", "Horizontal distance Judge"),
    node(ID.coverTest, "judge_test", "Elevated cover Judge"),
    node(ID.evadeTest, "judge_test", "High-ground Evade Judge"),
    node(ID.flyingTest, "judge_test", "Flying cover adapter Judge"),
    node(ID.authorityTest, "judge_test", "Elevation Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Elevation relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:elevation_effective_size_rules_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.result, ID.log, ID.choose,
        ID.resolve, ID.stack, ID.terrainSize, ID.modelSize, ID.band, ID.distance,
        ID.geometry, ID.full, ID.direct, ID.deadzone, ID.origin, ID.evade, ID.flying,
        ID.visibility, ID.event, ID.sourceTest, ID.stackTest, ID.modelTest,
        ID.distanceTest, ID.coverTest, ID.evadeTest, ID.flyingTest,
        ID.authorityTest, ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [
        { from: ID.elevation, to: ID.event, relationships: ["derives"], maxDepth: 10 },
        { from: ID.terrainData, to: ID.event,
          relationships: ["derives"], maxDepth: 10 },
        { from: ID.pieces, to: ID.event, relationships: ["derives"], maxDepth: 10 },
      ],
      forbiddenPaths: [],
      evidenceTestNodeIds: [ID.sourceTest, ID.stackTest, ID.modelTest,
        ID.distanceTest, ID.coverTest, ID.evadeTest, ID.flyingTest,
        ID.authorityTest, ID.graphTest],
    }],
  };
}
