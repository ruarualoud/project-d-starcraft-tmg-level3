import {
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ATOM_IDS,
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID,
  OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_VERSION,
} from "./official-mission-deployment-draft-rules-executor-v1.mjs";
import { createOfficialRosterDisclosureRulesRelationshipExtensionV1 } from
  "./official-roster-disclosure-rules-relationship-contract-v1.mjs";

export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-106-mission-deployment-draft-rules";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  data: "state_field:officialMissionDeploymentDraftDataBundle",
  mode: "state_field:rulesProcedureMode", round: "state_field:round",
  phase: "state_field:phase", active: "state_field:activeSideKey",
  players: "state_field:players",
  scale: "state_field:armyBuildingEngagementScale",
  participants: "state_field:missionDeploymentDraftParticipantIds",
  draft: "state_field:officialMissionDeploymentDraft",
  binding: "state_field:officialMissionDeploymentDraftBinding",
  history: "state_field:missionDeploymentDraftHistory",
  last: "state_field:lastMissionDeploymentDraftResolution",
  log: "state_field:log",
  choose: "action_variant:missionDeploymentDraftV1.chooseExactDraftStep",
  denominator: "derived_value:missionDeploymentDraftV1.exactTwentyOneAtoms",
  profiles: "derived_value:missionDeploymentDraftV1.currentTenMissionTenDeploymentProfiles",
  scaleMatch: "derived_value:missionDeploymentDraftV1.engagementScaleMatch",
  faceUp: "derived_value:missionDeploymentDraftV1.faceUpTwoRows",
  duplicate: "derived_value:missionDeploymentDraftV1.ownSetNoDuplicateOpposingOverlap",
  rollOff: "derived_value:missionDeploymentDraftV1.authorityOpeningRollOff",
  colour: "derived_value:missionDeploymentDraftV1.gameLongColourChoice",
  control: "derived_value:missionDeploymentDraftV1.complementaryDraftControl",
  missionElimination: "derived_value:missionDeploymentDraftV1.missionEliminateTwo",
  missionSelection: "derived_value:missionDeploymentDraftV1.missionSelectOne",
  deploymentElimination: "derived_value:missionDeploymentDraftV1.deploymentEliminateTwo",
  deploymentSelection: "derived_value:missionDeploymentDraftV1.deploymentSelectOne",
  missionContract: "derived_value:missionDeploymentDraftV1.missionFieldContract",
  deploymentContract: "derived_value:missionDeploymentDraftV1.deploymentFieldContract",
  affinity: "derived_value:missionDeploymentDraftV1.markerAffinityAfterBothDrafts",
  geometryBoundary: "semantic_projection:rules.selectedDeploymentGeometryOwnedBySlice107",
  event: "state_event:mission_deployment_draft_step_resolved",
  rollOffExecutor: "executor:authority.determine-initiative-v2@2.0.0",
  scaleExecutor: "executor:authority.faction-army-eligibility-rules-v1@1.0.0",
  sourceTest: "judge_test:mission-deployment-draft-v1-source",
  inputTest: "judge_test:mission-deployment-draft-v1-input-sets",
  rollOffTest: "judge_test:mission-deployment-draft-v1-rolloff",
  controlTest: "judge_test:mission-deployment-draft-v1-control",
  selectionTest: "judge_test:mission-deployment-draft-v1-selection",
  boundaryTest: "judge_test:mission-deployment-draft-v1-geometry-boundary",
  authorityTest: "judge_test:mission-deployment-draft-v1-authority-replay",
  graphTest: "judge_test:mission-deployment-draft-v1-relationship-negative-gap",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-106" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialMissionDeploymentDraftRulesRelationshipExtensionV1(
  input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("MISSION_DEPLOYMENT_DRAFT_RELEASE_INVALID");
  }
  const previous = createOfficialRosterDisclosureRulesRelationshipExtensionV1({
    catalogueHash, runtimeHash });
  const executor = `executor:${OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID}`
    + `@${OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.data, ID.mode, ID.round, ID.phase,
    ID.active, ID.players, ID.scale, ID.participants, ID.draft, ID.binding,
    ID.history, ID.last, ID.log];
  const writes = [ID.draft, ID.binding, ID.history, ID.last, ID.log];
  const derived = [ID.denominator, ID.profiles, ID.scaleMatch, ID.faceUp,
    ID.duplicate, ID.rollOff, ID.colour, ID.control, ID.missionElimination,
    ID.missionSelection, ID.deploymentElimination, ID.deploymentSelection,
    ID.missionContract, ID.deploymentContract, ID.affinity];
  const tests = [ID.sourceTest, ID.inputTest, ID.rollOffTest, ID.controlTest,
    ID.selectionTest, ID.boundaryTest, ID.authorityTest, ID.graphTest];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "mission_deployment_draft:state_contract")),
    edge(executor, "exposes", ID.choose,
      "mission_deployment_draft:complete_finite_choice_domain"),
    edge(ID.data, "derives", ID.denominator,
      "mission_deployment_draft:five_exact_core_sections"),
    edge(ID.data, "derives", ID.profiles,
      "mission_deployment_draft:current_ten_plus_ten_cards"),
    edge(ID.scaleExecutor, "consumed_by", ID.scaleMatch,
      "mission_deployment_draft:frozen_slice102_scale_agreement"),
    edge(ID.profiles, "constrains", ID.scaleMatch,
      "mission_deployment_draft:card_scale_filter"),
    edge(ID.scaleMatch, "gates", ID.faceUp,
      "mission_deployment_draft:both_sets_match_scale"),
    edge(ID.duplicate, "gates", ID.faceUp,
      "mission_deployment_draft:own_set_distinct"),
    edge(ID.faceUp, "gates", ID.rollOff,
      "mission_deployment_draft:four_plus_four_face_up"),
    edge(ID.rollOffExecutor, "consumed_by", ID.rollOff,
      "mission_deployment_draft:frozen_core_rolloff_semantics"),
    edge(ID.rollOff, "gates", ID.colour,
      "mission_deployment_draft:winner_only_colour_choice"),
    edge(ID.colour, "gates", ID.control,
      "mission_deployment_draft:ordered_winner_choices"),
    edge(ID.control, "gates", ID.missionElimination,
      "mission_deployment_draft:noncontroller_removes_two"),
    edge(ID.missionElimination, "gates", ID.missionSelection,
      "mission_deployment_draft:controller_selects_of_two"),
    edge(ID.missionSelection, "gates", ID.deploymentElimination,
      "mission_deployment_draft:mission_before_deployment"),
    edge(ID.deploymentElimination, "gates", ID.deploymentSelection,
      "mission_deployment_draft:controller_selects_of_two"),
    edge(ID.missionSelection, "derives", ID.missionContract,
      "mission_deployment_draft:selected_mission_fields"),
    edge(ID.deploymentSelection, "derives", ID.deploymentContract,
      "mission_deployment_draft:selected_deployment_fields"),
    edge(ID.colour, "derives", ID.affinity,
      "mission_deployment_draft:red_blue_marker_map"),
    edge(ID.missionContract, "gates", ID.binding,
      "mission_deployment_draft:selected_mission_binding"),
    edge(ID.deploymentContract, "gates", ID.binding,
      "mission_deployment_draft:selected_deployment_binding"),
    edge(ID.affinity, "gates", ID.binding,
      "mission_deployment_draft:after_both_drafts"),
    edge(ID.deploymentContract, "constrains", ID.geometryBoundary,
      "mission_deployment_draft:field_presence_not_geometry_execution"),
    edge(ID.choose, "derives", ID.event,
      "mission_deployment_draft:confirmed_step"),
    ...derived.map((source) => edge(source, "derives", ID.event,
      "mission_deployment_draft:rules_owned_resolution")),
    ...writes.map((target) => edge(ID.event, "writes", target,
      "mission_deployment_draft:commit")),
    edge(ID.data, "verified_by", ID.sourceTest,
      "mission_deployment_draft:source_judge"),
    edge(ID.duplicate, "verified_by", ID.inputTest,
      "mission_deployment_draft:input_judge"),
    edge(ID.rollOff, "verified_by", ID.rollOffTest,
      "mission_deployment_draft:chance_judge"),
    edge(ID.control, "verified_by", ID.controlTest,
      "mission_deployment_draft:controller_judge"),
    edge(ID.deploymentSelection, "verified_by", ID.selectionTest,
      "mission_deployment_draft:selection_judge"),
    edge(ID.geometryBoundary, "verified_by", ID.boundaryTest,
      "mission_deployment_draft:no_overclaim_judge"),
    edge(executor, "verified_by", ID.authorityTest,
      "mission_deployment_draft:authority"),
    edge(executor, "verified_by", ID.graphTest,
      "mission_deployment_draft:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.choose,
      "mission_deployment_draft:stale")),
  ];
  const additions = [
    node(ID.data, "state_field", "Official Mission and Deployment draft bundle"),
    node(ID.scale, "state_field", "Agreed engagement scale"),
    node(ID.participants, "state_field", "Two draft participant or delegate IDs"),
    node(ID.draft, "state_field", "Authoritative Mission and Deployment draft state"),
    node(ID.binding, "state_field", "Selected Mission and Deployment binding"),
    node(ID.history, "state_field", "Mission and Deployment draft history"),
    node(ID.last, "state_field", "Last Mission and Deployment draft resolution"),
    node(ID.choose, "action_variant", "Choose exact Mission/Deployment draft step"),
    ...derived.map((id) => node(id, "derived_value", id.replace(/^derived_value:/u, ""))),
    node(ID.geometryBoundary, "semantic_projection",
      "Selected Deployment geometry remains Slice 107 authority"),
    node(ID.event, "state_event", "Mission and Deployment draft step resolved"),
    ...tests.map((id) => node(id, "judge_test", id.replace(/^judge_test:/u, ""))),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return { nodes: [...previous.nodes,
    ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
  edges: [...previous.edges, ...edges],
  executorLineages: [...previous.executorLineages, {
    executorId: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID,
    ruleAtomIds: [...OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ATOM_IDS],
    provenance: "runtime_action_lineage:mission_deployment_draft_rules_v1" }],
  declaredStateContractExecutorIds: [...previous.declaredStateContractExecutorIds,
    OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID],
  coverageScopes: [...previous.coverageScopes, {
    scopeId: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_RULES_EXECUTOR_ID,
    requiredNodeIds: [...new Set([executor, ...reads, ...writes, ID.choose,
      ...derived, ID.geometryBoundary, ID.rollOffExecutor, ID.scaleExecutor,
      ID.event, ...tests])], requiredEdges: edges,
    requiredPaths: [
      { from: ID.scaleExecutor, to: ID.faceUp,
        relationships: ["consumed_by", "gates"], maxDepth: 4 },
      { from: ID.rollOffExecutor, to: ID.colour,
        relationships: ["consumed_by", "gates"], maxDepth: 4 },
      { from: ID.faceUp, to: ID.rollOff,
        relationships: ["gates"], maxDepth: 2 },
      { from: ID.rollOff, to: ID.control,
        relationships: ["gates"], maxDepth: 3 },
      { from: ID.control, to: ID.missionSelection,
        relationships: ["gates"], maxDepth: 3 },
      { from: ID.missionSelection, to: ID.binding,
        relationships: ["derives", "gates"], maxDepth: 3 },
      { from: ID.deploymentSelection, to: ID.binding,
        relationships: ["derives", "gates"], maxDepth: 3 },
      { from: ID.deploymentContract, to: ID.geometryBoundary,
        relationships: ["constrains"], maxDepth: 2 },
    ], forbiddenPaths: [{ from: ID.geometryBoundary, to: ID.binding,
      relationships: ["derives", "writes"], maxDepth: 3 }],
    evidenceTestNodeIds: tests,
  }] };
}
