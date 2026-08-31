import {
  OFFICIAL_FLYING_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_FLYING_RULES_EXECUTOR_ID,
  OFFICIAL_FLYING_RULES_EXECUTOR_VERSION,
} from "./official-flying-rules-executor-v1.mjs";
import { createOfficialGapPlaceGeometryRelationshipExtensionV1 } from
  "./official-gap-place-geometry-relationship-contract-v1.mjs";

export const OFFICIAL_FLYING_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-83-flying-rules";
const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  mode: "state_field:rulesProcedureMode",
  pieces: "state_field:pieces",
  terrain: "state_field:board.terrain",
  pending: "state_field:pendingAction.flyingRules",
  result: "state_field:lastFlyingRulesResolution",
  log: "state_field:log",
  choose: "action_variant:flyingRulesV1.chooseCertifiedPlan",
  resolve: "action_variant:flyingRulesV1.resolve",
  base: "derived_value:flyingRulesV1.flightStandBottomMeasurementBase",
  movement: "derived_value:flyingRulesV1.horizontalPointToPointMovement",
  endpoint: "derived_value:flyingRulesV1.enemyFlyingEndpointSeparation",
  coherency: "derived_value:flyingRulesV1.terrainAndModelBypassingCoherency",
  grass: "derived_value:flyingRulesV1.grassOverflightAndEndpointRemoval",
  cover: "derived_value:flyingRulesV1.coverEffectiveSizeAndElevation",
  restrictions: "derived_value:flyingRulesV1.engagementChargeCombatMissionRestrictions",
  event: "state_event:flying_rules_resolved",
  sourceTest: "judge_test:flying-rules-v1-source-lock-and-carrier-gap",
  movementTest: "judge_test:flying-rules-v1-movement-and-flight-stand",
  endpointTest: "judge_test:flying-rules-v1-endpoint-and-engagement",
  coherencyTest: "judge_test:flying-rules-v1-coherency",
  grassTest: "judge_test:flying-rules-v1-grass",
  coverTest: "judge_test:flying-rules-v1-cover-and-elevation",
  restrictionTest: "judge_test:flying-rules-v1-role-restrictions",
  authorityTest: "judge_test:flying-rules-v1-authority-replay",
  graphTest: "judge_test:flying-rules-v1-relationship-negative-gap",
});
function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-83" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_FLYING_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}
export function createOfficialFlyingRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("FLYING_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialGapPlaceGeometryRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_FLYING_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_FLYING_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.mode, ID.pieces, ID.terrain, ID.pending];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "flying:state_contract")),
    edge(executor, "exposes", ID.choose, "flying:certified_choices"),
    edge(ID.choose, "derives", ID.resolve, "flying:instantiate"),
    edge(ID.pieces, "derives", ID.base, "flying:measurement_base"),
    edge(ID.base, "derives", ID.movement, "flying:point_to_point"),
    edge(ID.terrain, "derives", ID.movement, "flying:transit_ignored"),
    edge(ID.pieces, "derives", ID.endpoint, "flying:enemy_flying_distance"),
    edge(ID.movement, "derives", ID.endpoint, "flying:legal_endpoint"),
    edge(ID.base, "derives", ID.coherency, "flying:wholly_within_three"),
    edge(ID.terrain, "derives", ID.coherency, "flying:link_bypass"),
    edge(ID.movement, "derives", ID.grass, "flying:path_and_endpoint"),
    edge(ID.terrain, "derives", ID.grass, "flying:grass_footprint"),
    edge(ID.base, "derives", ID.cover, "flying:effective_size"),
    edge(ID.terrain, "derives", ID.cover, "flying:cover_cases"),
    edge(ID.pieces, "derives", ID.restrictions, "flying:combat_tag"),
    edge(ID.endpoint, "derives", ID.resolve, "flying:movement_plan"),
    edge(ID.coherency, "derives", ID.resolve, "flying:formation_plan"),
    edge(ID.grass, "derives", ID.resolve, "flying:grass_result"),
    edge(ID.cover, "derives", ID.resolve, "flying:cover_result"),
    edge(ID.restrictions, "derives", ID.resolve, "flying:role_result"),
    edge(ID.resolve, "derives", ID.event, "flying:apply"),
    edge(ID.event, "writes", ID.result, "flying:result"),
    edge(ID.event, "writes", ID.pieces, "flying:model_positions"),
    edge(ID.event, "writes", ID.terrain, "flying:grass_endpoint_removal"),
    edge(ID.event, "writes", ID.pending, "flying:pending_clear"),
    edge(ID.event, "writes", ID.log, "flying:log"),
    edge(ID.source, "verified_by", ID.sourceTest, "flying:source_judge"),
    edge(ID.base, "verified_by", ID.movementTest, "flying:measurement_judge"),
    edge(ID.movement, "verified_by", ID.movementTest, "flying:movement_judge"),
    edge(ID.endpoint, "verified_by", ID.endpointTest, "flying:endpoint_judge"),
    edge(ID.coherency, "verified_by", ID.coherencyTest, "flying:coherency_judge"),
    edge(ID.grass, "verified_by", ID.grassTest, "flying:grass_judge"),
    edge(ID.cover, "verified_by", ID.coverTest, "flying:cover_judge"),
    edge(ID.restrictions, "verified_by", ID.restrictionTest,
      "flying:restriction_judge"),
    edge(executor, "verified_by", ID.authorityTest, "flying:authority"),
    edge(executor, "verified_by", ID.graphTest, "flying:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.resolve,
      "flying:stale")),
  ];
  const additions = [
    node(ID.pending, "state_field", "Flying rules pending"),
    node(ID.result, "state_field", "Last Flying rules resolution"),
    node(ID.choose, "action_variant", "Choose certified Flying rules plan"),
    node(ID.resolve, "action_variant", "Resolve Flying rules procedure"),
    node(ID.base, "derived_value", "Flight-stand-bottom measurement base"),
    node(ID.movement, "derived_value", "Horizontal point-to-point movement"),
    node(ID.endpoint, "derived_value", "Enemy-Flying endpoint separation"),
    node(ID.coherency, "derived_value", "Flying coherency links"),
    node(ID.grass, "derived_value", "Flying Grass interaction"),
    node(ID.cover, "derived_value", "Flying cover and effective size"),
    node(ID.restrictions, "derived_value", "Flying role restrictions"),
    node(ID.event, "state_event", "Flying rules resolved"),
    node(ID.sourceTest, "judge_test", "Flying official source/carrier Judge"),
    node(ID.movementTest, "judge_test", "Flying movement/flight-stand Judge"),
    node(ID.endpointTest, "judge_test", "Flying endpoint/engagement Judge"),
    node(ID.coherencyTest, "judge_test", "Flying coherency Judge"),
    node(ID.grassTest, "judge_test", "Flying Grass Judge"),
    node(ID.coverTest, "judge_test", "Flying cover/elevation Judge"),
    node(ID.restrictionTest, "judge_test", "Flying role restriction Judge"),
    node(ID.authorityTest, "judge_test", "Flying Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Flying relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_FLYING_RULES_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_FLYING_RULES_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:flying_rules_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_FLYING_RULES_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_FLYING_RULES_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_FLYING_RULES_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.result, ID.log, ID.choose,
        ID.resolve, ID.base, ID.movement, ID.endpoint, ID.coherency, ID.grass,
        ID.cover, ID.restrictions, ID.event, ID.sourceTest, ID.movementTest,
        ID.endpointTest, ID.coherencyTest, ID.grassTest, ID.coverTest,
        ID.restrictionTest, ID.authorityTest, ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [
        { from: ID.base, to: ID.event, relationships: ["derives"], maxDepth: 6 },
        { from: ID.terrain, to: ID.event, relationships: ["derives"], maxDepth: 6 },
        { from: ID.restrictions, to: ID.event, relationships: ["derives"], maxDepth: 3 },
      ],
      forbiddenPaths: [],
      evidenceTestNodeIds: [ID.sourceTest, ID.movementTest, ID.endpointTest,
        ID.coherencyTest, ID.grassTest, ID.coverTest, ID.restrictionTest,
        ID.authorityTest, ID.graphTest],
    }],
  };
}
