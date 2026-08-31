import {
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID,
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_VERSION,
} from "./official-model-base-geometry-rules-executor-v1.mjs";
import { createOfficialSpecialTerrainRulesRelationshipExtensionV1 } from
  "./official-special-terrain-rules-relationship-contract-v1.mjs";

export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-87-model-base-geometry-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  baseData: "state_field:officialModelBaseGeometryDataBundle",
  mode: "state_field:rulesProcedureMode",
  players: "state_field:players",
  pieces: "state_field:pieces",
  board: "state_field:board",
  terrain: "state_field:board.terrain",
  markers: "state_field:board.missionMarkers",
  tokens: "state_field:board.tokens",
  access: "state_field:board.specialTerrainAgreement",
  pending: "state_field:pendingAction.modelBaseGeometryRules",
  result: "state_field:lastModelBaseGeometryRulesResolution",
  log: "state_field:log",
  choose: "action_variant:modelBaseGeometryRulesV1.chooseCertifiedPlan",
  resolve: "action_variant:modelBaseGeometryRulesV1.resolve",
  profile: "derived_value:modelBaseGeometryV1.officialBaseProfile",
  footprint: "derived_value:modelBaseGeometryV1.baseFootprint",
  distance: "derived_value:modelBaseGeometryV1.nearestEdgeDistance",
  within: "derived_value:modelBaseGeometryV1.within",
  wholly: "derived_value:modelBaseGeometryV1.whollyWithin",
  unitRelation: "derived_value:modelBaseGeometryV1.unitRangeRelation",
  placement: "derived_value:modelBaseGeometryV1.legalPlacement",
  link: "derived_value:modelBaseGeometryV1.coherencyLinkGraph",
  casualty: "derived_value:modelBaseGeometryV1.noLegalLinkCasualty",
  coherency: "derived_value:modelBaseGeometryV1.coherencyStatus",
  mission: "derived_value:modelBaseGeometryV1.missionCapability",
  wobbly: "derived_value:modelBaseGeometryV1.wobblyAgreement",
  nomination: "derived_value:modelBaseGeometryV1.leadingNominationLifetime",
  event: "state_event:model_base_geometry_rules_resolved",
  sourceTest: "judge_test:model-base-geometry-v1-source-lock",
  profileTest: "judge_test:model-base-geometry-v1-profile-denominator",
  shapeTest: "judge_test:model-base-geometry-v1-round-rectangle",
  measurementTest: "judge_test:model-base-geometry-v1-measurement",
  withinTest: "judge_test:model-base-geometry-v1-within-wholly",
  coherencyTest: "judge_test:model-base-geometry-v1-coherency-casualty",
  authorityTest: "judge_test:model-base-geometry-v1-authority-replay",
  graphTest: "judge_test:model-base-geometry-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-87" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialModelBaseGeometryRulesRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("MODEL_BASE_GEOMETRY_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialSpecialTerrainRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.baseData, ID.mode, ID.players,
    ID.pieces, ID.board, ID.terrain, ID.markers, ID.tokens, ID.access, ID.pending];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "model_base_geometry:state_contract")),
    edge(executor, "exposes", ID.choose, "model_base_geometry:certified_choices"),
    edge(ID.choose, "derives", ID.resolve, "model_base_geometry:instantiate"),
    edge(ID.baseData, "derives", ID.profile, "model_base_geometry:official_p2p_profile"),
    edge(ID.pieces, "derives", ID.profile, "model_base_geometry:unit_identity_binding"),
    edge(ID.profile, "derives", ID.footprint, "model_base_geometry:correct_base_shape_size"),
    edge(ID.pieces, "derives", ID.footprint, "model_base_geometry:position_rotation"),
    edge(ID.markers, "derives", ID.distance, "model_base_geometry:physical_marker_edge"),
    edge(ID.tokens, "derives", ID.distance, "model_base_geometry:physical_token_edge"),
    edge(ID.footprint, "derives", ID.distance, "model_base_geometry:nearest_base_edges"),
    edge(ID.distance, "derives", ID.within, "model_base_geometry:any_base_part"),
    edge(ID.footprint, "derives", ID.wholly, "model_base_geometry:complete_base_containment"),
    edge(ID.within, "derives", ID.unitRelation, "model_base_geometry:any_model"),
    edge(ID.wholly, "derives", ID.unitRelation, "model_base_geometry:every_model"),
    edge(ID.footprint, "derives", ID.placement, "model_base_geometry:board_overlap"),
    edge(ID.terrain, "derives", ID.placement, "model_base_geometry:terrain_overlap"),
    edge(ID.placement, "derives", ID.link, "model_base_geometry:placed_models"),
    edge(ID.terrain, "derives", ID.link, "model_base_geometry:terrain_blockers"),
    edge(ID.access, "derives", ID.link, "model_base_geometry:access_exceptions"),
    edge(ID.link, "derives", ID.casualty, "model_base_geometry:no_legal_link"),
    edge(ID.wholly, "derives", ID.coherency, "model_base_geometry:three_inches"),
    edge(ID.link, "derives", ID.coherency, "model_base_geometry:connected_graph"),
    edge(ID.casualty, "derives", ID.coherency, "model_base_geometry:removed_model"),
    edge(ID.coherency, "derives", ID.mission, "model_base_geometry:control_contest"),
    edge(ID.players, "derives", ID.wobbly, "model_base_geometry:mutual_agreement"),
    edge(ID.placement, "derives", ID.nomination, "model_base_geometry:temporary_leader"),
    edge(ID.distance, "derives", ID.resolve, "model_base_geometry:measurement_plan"),
    edge(ID.unitRelation, "derives", ID.resolve, "model_base_geometry:range_plan"),
    edge(ID.coherency, "derives", ID.resolve, "model_base_geometry:coherency_plan"),
    edge(ID.wobbly, "derives", ID.resolve, "model_base_geometry:wobbly_plan"),
    edge(ID.resolve, "derives", ID.event, "model_base_geometry:apply"),
    edge(ID.event, "writes", ID.pieces, "model_base_geometry:positions_casualties_status"),
    edge(ID.event, "writes", ID.result, "model_base_geometry:result"),
    edge(ID.event, "writes", ID.pending, "model_base_geometry:pending_clear"),
    edge(ID.event, "writes", ID.log, "model_base_geometry:log"),
    edge(ID.source, "verified_by", ID.sourceTest, "model_base_geometry:source_judge"),
    edge(ID.profile, "verified_by", ID.profileTest, "model_base_geometry:profile_judge"),
    edge(ID.footprint, "verified_by", ID.shapeTest, "model_base_geometry:shape_judge"),
    edge(ID.distance, "verified_by", ID.measurementTest, "model_base_geometry:distance_judge"),
    edge(ID.unitRelation, "verified_by", ID.withinTest, "model_base_geometry:range_judge"),
    edge(ID.coherency, "verified_by", ID.coherencyTest, "model_base_geometry:coherency_judge"),
    edge(executor, "verified_by", ID.authorityTest, "model_base_geometry:authority"),
    edge(executor, "verified_by", ID.graphTest, "model_base_geometry:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.resolve,
      "model_base_geometry:stale")),
  ];
  const additions = [
    node(ID.baseData, "state_field", "Official model base geometry data bundle"),
    node(ID.pending, "state_field", "Model/base geometry procedure pending"),
    node(ID.result, "state_field", "Last model/base geometry resolution"),
    node(ID.choose, "action_variant", "Choose certified model/base geometry plan"),
    node(ID.resolve, "action_variant", "Resolve model/base geometry procedure"),
    node(ID.profile, "derived_value", "Official P2P base profile"),
    node(ID.footprint, "derived_value", "Rules-visible base footprint"),
    node(ID.distance, "derived_value", "Nearest physical-edge distance"),
    node(ID.within, "derived_value", "Within relation"),
    node(ID.wholly, "derived_value", "Wholly Within relation"),
    node(ID.unitRelation, "derived_value", "Unit range relation"),
    node(ID.placement, "derived_value", "Legal model placement"),
    node(ID.link, "derived_value", "Coherency link graph"),
    node(ID.casualty, "derived_value", "No-legal-link casualty"),
    node(ID.coherency, "derived_value", "Unit coherency status"),
    node(ID.mission, "derived_value", "Mission control/contest capability"),
    node(ID.wobbly, "derived_value", "Wobbly model position agreement"),
    node(ID.nomination, "derived_value", "Leading Model nomination lifetime"),
    node(ID.event, "state_event", "Model/base geometry rules resolved"),
    node(ID.sourceTest, "judge_test", "Pinned-source Judge"),
    node(ID.profileTest, "judge_test", "26-profile denominator Judge"),
    node(ID.shapeTest, "judge_test", "Round and rectangle geometry Judge"),
    node(ID.measurementTest, "judge_test", "Nearest-edge measurement Judge"),
    node(ID.withinTest, "judge_test", "Within/Wholly Within Judge"),
    node(ID.coherencyTest, "judge_test", "Coherency and casualty Judge"),
    node(ID.authorityTest, "judge_test", "Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:model_base_geometry_rules_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.result, ID.log,
        ID.choose, ID.resolve, ID.profile, ID.footprint, ID.distance, ID.within,
        ID.wholly, ID.unitRelation, ID.placement, ID.link, ID.casualty,
        ID.coherency, ID.mission, ID.wobbly, ID.nomination, ID.event,
        ID.sourceTest, ID.profileTest, ID.shapeTest, ID.measurementTest,
        ID.withinTest, ID.coherencyTest, ID.authorityTest, ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [
        { from: ID.baseData, to: ID.event, relationships: ["derives"], maxDepth: 10 },
        { from: ID.pieces, to: ID.event, relationships: ["derives"], maxDepth: 10 },
        { from: ID.terrain, to: ID.event, relationships: ["derives"], maxDepth: 10 },
      ],
      forbiddenPaths: [],
      evidenceTestNodeIds: [ID.sourceTest, ID.profileTest, ID.shapeTest,
        ID.measurementTest, ID.withinTest, ID.coherencyTest, ID.authorityTest,
        ID.graphTest],
    }],
  };
}
