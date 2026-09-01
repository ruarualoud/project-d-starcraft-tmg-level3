import {
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID,
  OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_VERSION,
} from "./official-battlefield-token-marker-rules-executor-v1.mjs";
import { createOfficialBalancedTerrainRulesRelationshipExtensionV1 } from
  "./official-balanced-terrain-rules-relationship-contract-v1.mjs";

export const OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-109-battlefield-token-marker-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  geometryData: "state_field:officialDeploymentGeometryDataBundle",
  geometry: "state_field:officialDeploymentGeometryBinding",
  terrainData: "state_field:officialBalancedTerrainRulesDataBundle",
  data: "state_field:officialBattlefieldTokenMarkerRulesDataBundle",
  setup: "state_field:officialBattlefieldSetup",
  certificate: "state_field:officialBalancedTerrainSetupCertificate",
  terrain: "state_field:board.terrain",
  agreement: "state_field:board.specialTerrainAgreement",
  height: "state_field:officialTerrainHeightTierLedger",
  missionPlacement: "state_field:officialMissionMarkerPlacement",
  pieces: "state_field:pieces",
  firstPlayer: "state_field:firstPlayerSideKey",
  boardTokens: "state_field:officialBattlefieldTokens",
  boardMarkers: "state_field:officialBattlefieldMarkers",
  registry: "state_field:officialBattlefieldTokenMarkerRegistry",
  setupViews: "state_field:officialBattlefieldMarkerViewsAtSetup",
  history: "state_field:battlefieldTokenMarkerRulesHistory",
  result: "state_field:lastBattlefieldTokenMarkerRulesResolution",
  cleanupHistory: "state_field:battlefieldTokenMarkerCleanupHistory",
  cleanupResult: "state_field:lastBattlefieldTokenMarkerCleanupResolution",
  cleanupRound: "state_field:lastBattlefieldTokenMarkerCleanupRound",
  log: "state_field:log",
  action: "action_variant:battlefieldTokenMarkerV1.materializeRegistry",
  cleanupAction: "action_variant:battlefieldTokenMarkerV1.cleanupRoundMaterial",
  token: "derived_value:battlefieldTokenMarkerV1.tangibleSizeZeroToken",
  movement: "derived_value:battlefieldTokenMarkerV1.passThroughNoEndOverlap",
  measurement: "derived_value:battlefieldTokenMarkerV1.closestBaseEdgeMeasurement",
  marker: "derived_value:battlefieldTokenMarkerV1.intangibleMarker",
  activation: "derived_value:battlefieldTokenMarkerV1.activationPhaseFace",
  faction: "derived_value:battlefieldTokenMarkerV1.factionIndicator",
  mode: "derived_value:battlefieldTokenMarkerV1.stayInPlayModeMarker",
  zone: "derived_value:battlefieldTokenMarkerV1.exactZoiCornerMarkers",
  initiative: "derived_value:battlefieldTokenMarkerV1.firstPlayerMarkerView",
  cleanup: "derived_value:battlefieldTokenMarkerV1.cleanupClassification",
  projection: "semantic_projection:battlefieldTokenMarkerV1.uniformWorldToCss",
  cleanupConsumer: "executor:authority.cleanup-refresh-v5@5.0.0",
  phaseConsumer: "executor:authority.phase-initiative-v1@1.0.0",
  activationConsumer: "executor:authority.round-phase-activation-rules-v1@1.0.0",
  missionConsumer: "executor:authority.mission-marker-control-v3@3.0.0",
  event: "state_event:battlefield_token_marker_registry_materialized",
  cleanupEvent: "state_event:battlefield_tokens_and_markers_cleaned",
  sourceTest: "judge_test:battlefield-token-marker-v1-source-route",
  tokenTest: "judge_test:battlefield-token-marker-v1-token-geometry",
  markerTest: "judge_test:battlefield-token-marker-v1-marker-semantics",
  lifecycleTest: "judge_test:battlefield-token-marker-v1-lifecycle-consumers",
  projectionTest: "judge_test:battlefield-token-marker-v1-viewport-invariant",
  authorityTest: "judge_test:battlefield-token-marker-v1-authority-replay",
  graphTest: "judge_test:battlefield-token-marker-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-109" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialBattlefieldTokenMarkerRulesRelationshipExtensionV1(
  input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("BATTLEFIELD_TOKEN_MARKER_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialBalancedTerrainRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.geometryData, ID.geometry, ID.terrainData,
    ID.data, ID.setup, ID.certificate, ID.terrain, ID.agreement, ID.height,
    ID.missionPlacement, ID.pieces, ID.firstPlayer];
  const writes = [ID.setup, ID.registry, ID.setupViews, ID.boardTokens,
    ID.boardMarkers, ID.history, ID.result, ID.log];
  const cleanupWrites = [ID.boardTokens, ID.boardMarkers, ID.cleanupHistory,
    ID.cleanupResult, ID.cleanupRound, ID.log];
  const tests = [ID.sourceTest, ID.tokenTest, ID.markerTest, ID.lifecycleTest,
    ID.projectionTest, ID.authorityTest, ID.graphTest];
  const derived = [ID.token, ID.movement, ID.measurement, ID.marker, ID.activation,
    ID.faction, ID.mode, ID.zone, ID.initiative, ID.cleanup, ID.projection];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "battlefield_token_marker:state_contract")),
    edge(executor, "exposes", ID.action,
      "battlefield_token_marker:deterministic_registry_action"),
    edge(executor, "exposes", ID.cleanupAction,
      "battlefield_token_marker:deterministic_cleanup_action"),
    edge(ID.data, "derives", ID.token, "battlefield_token_marker:token_contract"),
    edge(ID.token, "derives", ID.movement,
      "battlefield_token_marker:movement_overlap"),
    edge(ID.token, "derives", ID.measurement,
      "battlefield_token_marker:closest_edges"),
    edge(ID.data, "derives", ID.marker, "battlefield_token_marker:marker_contract"),
    edge(ID.pieces, "derives", ID.activation,
      "battlefield_token_marker:activated_phases"),
    edge(ID.missionPlacement, "derives", ID.faction,
      "battlefield_token_marker:mission_control"),
    edge(ID.pieces, "derives", ID.mode, "battlefield_token_marker:mode_status"),
    edge(ID.geometry, "derives", ID.zone,
      "battlefield_token_marker:partial_entry_edges"),
    edge(ID.firstPlayer, "derives", ID.initiative,
      "battlefield_token_marker:initiative_state"),
    edge(ID.token, "derives", ID.cleanup,
      "battlefield_token_marker:token_expiry"),
    edge(ID.marker, "derives", ID.cleanup,
      "battlefield_token_marker:marker_exceptions"),
    edge(ID.geometry, "derives", ID.projection,
      "battlefield_token_marker:uniform_world_scale"),
    edge(ID.token, "projects_to", ID.projection,
      "battlefield_token_marker:mm_to_inches_to_css"),
    edge(ID.marker, "projects_to", ID.projection,
      "battlefield_token_marker:visual_only_marker_size"),
    edge(ID.cleanup, "consumed_by", ID.cleanupConsumer,
      "battlefield_token_marker:frozen_cleanup_consumer"),
    edge(ID.activation, "consumed_by", ID.activationConsumer,
      "battlefield_token_marker:frozen_activation_consumer"),
    edge(ID.initiative, "consumed_by", ID.phaseConsumer,
      "battlefield_token_marker:frozen_phase_consumer"),
    edge(ID.faction, "consumed_by", ID.missionConsumer,
      "battlefield_token_marker:frozen_mission_consumer"),
    ...derived.map((source) => edge(source, "derives", ID.registry,
      "battlefield_token_marker:registry_contract")),
    edge(ID.action, "derives", ID.event, "battlefield_token_marker:apply"),
    edge(ID.registry, "derives", ID.event, "battlefield_token_marker:apply"),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "battlefield_token_marker:state_mutation")),
    edge(ID.cleanupAction, "derives", ID.cleanupEvent,
      "battlefield_token_marker:cleanup_apply"),
    edge(ID.cleanup, "derives", ID.cleanupEvent,
      "battlefield_token_marker:cleanup_apply"),
    ...cleanupWrites.map((target) => edge(ID.cleanupEvent, "writes", target,
      "battlefield_token_marker:cleanup_state_mutation")),
    edge(ID.data, "verified_by", ID.sourceTest,
      "battlefield_token_marker:source_judge"),
    ...[ID.token, ID.movement, ID.measurement].map((source) => edge(source,
      "verified_by", ID.tokenTest, "battlefield_token_marker:token_judge")),
    ...[ID.marker, ID.activation, ID.faction, ID.mode, ID.zone, ID.initiative]
      .map((source) => edge(source, "verified_by", ID.markerTest,
        "battlefield_token_marker:marker_judge")),
    edge(ID.cleanup, "verified_by", ID.lifecycleTest,
      "battlefield_token_marker:lifecycle_judge"),
    edge(ID.projection, "verified_by", ID.projectionTest,
      "battlefield_token_marker:projection_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "battlefield_token_marker:authority_judge"),
    edge(executor, "verified_by", ID.graphTest,
      "battlefield_token_marker:graph_judge"),
    ...reads.map((source) => edge(source, "invalidates", ID.action,
      "battlefield_token_marker:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official battlefield Token/Marker data bundle"),
    node(ID.boardTokens, "state_field", "Typed tangible battlefield Tokens"),
    node(ID.boardMarkers, "state_field", "Typed intangible battlefield Markers"),
    node(ID.registry, "state_field", "Official Token/Marker rule registry"),
    node(ID.setupViews, "state_field", "Setup-time derived Marker views"),
    node(ID.history, "state_field", "Token/Marker registry history"),
    node(ID.result, "state_field", "Last Token/Marker registry resolution"),
    node(ID.cleanupHistory, "state_field", "Token/Marker cleanup history"),
    node(ID.cleanupResult, "state_field", "Last Token/Marker cleanup resolution"),
    node(ID.cleanupRound, "state_field", "Last Token/Marker cleanup round"),
    node(ID.action, "action_variant", "Materialize Token/Marker registry"),
    node(ID.cleanupAction, "action_variant", "Clean round Token/Marker material"),
    node(ID.token, "derived_value", "Tangible Size-0 Token with own base"),
    node(ID.movement, "derived_value", "Pass-through and end-overlap verdict"),
    node(ID.measurement, "derived_value", "Closest Token base-edge distance"),
    node(ID.marker, "derived_value", "Intangible non-blocking Marker"),
    node(ID.activation, "derived_value", "Activation Marker phase face"),
    node(ID.faction, "derived_value", "Faction Indicator view"),
    node(ID.mode, "derived_value", "STAY IN PLAY Mode Marker"),
    node(ID.zone, "derived_value", "Exact partial-edge ZOI corner Markers"),
    node(ID.initiative, "derived_value", "First Player Marker state view"),
    node(ID.cleanup, "derived_value", "Token/Marker cleanup classification"),
    node(ID.projection, "semantic_projection", "Uniform world-to-CSS projection"),
    node(ID.event, "state_event", "Token/Marker registry materialized"),
    node(ID.cleanupEvent, "state_event", "Battlefield Tokens/Markers cleaned"),
    node(ID.sourceTest, "judge_test", "Token/Marker source and route Judge"),
    node(ID.tokenTest, "judge_test", "Token geometry Judge"),
    node(ID.markerTest, "judge_test", "Marker semantics Judge"),
    node(ID.lifecycleTest, "judge_test", "Marker lifecycle consumers Judge"),
    node(ID.projectionTest, "judge_test", "Token/Marker viewport Judge"),
    node(ID.authorityTest, "judge_test", "Token/Marker Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Token/Marker graph negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes, ...additions.filter((entry) => (
    !previousIds.has(entry.nodeId)))], edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:battlefield_token_marker_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ...writes, ...cleanupWrites,
      ID.action, ID.cleanupAction, ...derived, ID.event, ID.cleanupEvent,
      ID.cleanupConsumer, ID.phaseConsumer,
      ID.activationConsumer, ID.missionConsumer, ...tests])],
    requiredEdges: edges,
    requiredPaths: [
      { from: ID.data, to: ID.event, relationships: ["derives"], maxDepth: 6 },
      { from: ID.geometry, to: ID.zone, relationships: ["derives"], maxDepth: 2 },
      { from: ID.firstPlayer, to: ID.phaseConsumer,
        relationships: ["derives", "consumed_by"], maxDepth: 3 },
      { from: ID.token, to: ID.cleanupConsumer,
        relationships: ["derives", "consumed_by"], maxDepth: 3 },
    ],
    forbiddenPaths: [{ from: ID.projection, to: ID.geometry,
      relationships: ["derives", "writes", "projects_to"], maxDepth: 3 },
    { from: ID.setupViews, to: ID.firstPlayer,
      relationships: ["derives", "writes"], maxDepth: 3 }],
    evidenceTestNodeIds: tests,
  }] };
}
