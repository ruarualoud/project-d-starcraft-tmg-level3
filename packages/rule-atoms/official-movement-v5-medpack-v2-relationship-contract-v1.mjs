import {
  createOfficialStimpackMoveV2RelationshipExtensionV1,
  OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_NODE_IDS_V1,
  OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_SCOPE_ID,
} from "./official-stimpack-move-v2-relationship-contract-v1.mjs";
import {
  OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1,
  OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS,
} from "./official-movement-v4-relationship-contract-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION,
} from "./official-start-of-round-executor-v4.mjs";
import {
  OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V5_EXECUTOR_VERSION,
} from "./official-start-of-round-executor-v5.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_VERSION,
} from "./official-reserve-deploy-executor-v4.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_VERSION,
} from "./official-reserve-deploy-executor-v5.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION,
} from "./official-standard-move-executor-v4.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_VERSION,
} from "./official-standard-move-executor-v5.mjs";
import {
  OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION,
} from "./official-disengage-executor-v4.mjs";
import {
  OFFICIAL_DISENGAGE_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_DISENGAGE_V5_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V5_EXECUTOR_VERSION,
} from "./official-disengage-executor-v5.mjs";
import {
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
} from "./official-stimpack-move-consumer-executor-v2.mjs";
import {
  OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_ID,
  OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_VERSION,
  OFFICIAL_STIMPACK_MOVE_V3_PARAMETER_KIND,
} from "./official-stimpack-move-consumer-executor-v3.mjs";
import {
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_VERSION,
} from "./official-medic-medpack-active-executor-v1.mjs";
import {
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_VERSION,
} from "./official-medic-medpack-active-executor-v2.mjs";

const PREVIOUS_CATALOGUE_HASH =
  "d378ecc5f91753d80251dbf37ecdee1c17cdf3a36c001f9855cbb896d588faa9";
const PREVIOUS_RUNTIME_HASH =
  "51f3d865c2dde8735a8b6f58248d91207d03370b9ac0f0f04a8786c5e7c31241";

const v4 = OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1;
const stimV2 = OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_NODE_IDS_V1;

export const OFFICIAL_MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_SCOPE_IDS = Object.freeze({
  startOfRound: "ticket-11-current-movement-start-of-round-v5",
  reserveDeploy: "ticket-11-current-movement-reserve-deploy-v5",
  standardMove: "ticket-11-current-movement-standard-move-v5",
  disengage: "ticket-11-current-movement-disengage-v5",
  stimpackMove: "ticket-11-current-stimpack-move-v3",
  medpack: "ticket-11-current-medic-medpack-v2",
});

export const OFFICIAL_MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  ...stimV2,
  currentAuthorityLineage:
    "semantic_projection:movementV5.currentAuthorityAndSelectedLoadoutLineage",
  currentSupplyLossLineage:
    "semantic_projection:movementV5.currentSupplyLossLineage",
  currentMovementMaterial:
    "semantic_projection:movementV5.currentSourceUnitGeometryLoadoutAndCasualtyMaterial",
  startDomain: "parameter_domain:startOfRound.exactCurrentDomainV5",
  startAction: "action_variant:startOfRound.exactCurrentActionV5",
  startEvent: "state_event:start_of_round_resolved_v5",
  reserveDomain: "parameter_domain:reserveDeploy.exactCurrentDomainV5",
  reserveAction: "action_variant:reserveDeploy.exactCurrentActionV5",
  reserveEvent: "state_event:reserve_deployed_v5",
  standardDomain: "parameter_domain:standardMove.exactCurrentDomainV5",
  standardAction: "action_variant:standardMove.exactCurrentActionV5",
  standardEvent: "state_event:unit_standard_moved_v5",
  disengageDomain: "parameter_domain:disengage.exactCurrentDomainV5",
  disengageAction: "action_variant:disengage.exactCurrentActionV5",
  disengageEvent: "state_event:unit_disengaged_or_failed_v5",
  movementPublicTest: "judge_test:movement-v5-public-contracts-v1",
  movementSupplyLineageTest: "judge_test:movement-v5-supply-lineage-v1",
  movementAuthorityTest: "judge_test:movement-v5-authority-confirm-apply-v1",
  movementReplayTest: "judge_test:movement-v5-ed25519-replay-hmac-rotation-v1",
  movementHistoricalTest: "judge_test:movement-v4-runtime-and-display-freeze-v1",
  movementRelationshipTest: "judge_test:movement-v5-relationship-negative-gap-v1",
  historicalStartV4Executor:
    `executor:${OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID}`
    + `@${OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION}`,
  historicalReserveV4Executor:
    `executor:${OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID}`
    + `@${OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_VERSION}`,
  historicalStandardV4Executor:
    `executor:${OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID}`
    + `@${OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION}`,
  historicalDisengageV4Executor:
    `executor:${OFFICIAL_DISENGAGE_V4_EXECUTOR_ID}`
    + `@${OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION}`,
  currentStartV5Executor:
    `executor:${OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID}`
    + `@${OFFICIAL_START_OF_ROUND_V5_EXECUTOR_VERSION}`,
  currentReserveV5Executor:
    `executor:${OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID}`
    + `@${OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_VERSION}`,
  currentStandardV5Executor:
    `executor:${OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ID}`
    + `@${OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_VERSION}`,
  currentDisengageV5Executor:
    `executor:${OFFICIAL_DISENGAGE_V5_EXECUTOR_ID}`
    + `@${OFFICIAL_DISENGAGE_V5_EXECUTOR_VERSION}`,
  stimpackDomain: `parameter_domain:${OFFICIAL_STIMPACK_MOVE_V3_PARAMETER_KIND}`,
  stimpackAction: "action_variant:stimpackMove.exactCurrentActionV3",
  stimpackEvent: "state_event:stimpack_move_resolved_v3",
  stimpackPublicTest: "judge_test:stimpack-move-v3-public-contract-v1",
  stimpackExactActionTest: "judge_test:stimpack-move-v3-exact-action-v1",
  stimpackProtectedStateTest: "judge_test:stimpack-move-v3-protected-state-v1",
  stimpackReplayTest: "judge_test:stimpack-move-v3-ed25519-replay-hmac-rotation-v1",
  stimpackHistoricalTest: "judge_test:stimpack-move-v2-runtime-and-display-freeze-v1",
  stimpackRelationshipTest: "judge_test:stimpack-move-v3-relationship-negative-gap-v1",
  historicalStimpackV2Executor:
    `executor:${OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION}`,
  historicalStimpackV2Domain: "parameter_domain:official_stimpack_move_path_v2",
  currentStimpackV3Executor:
    `executor:${OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_VERSION}`,
  medpackAction: "action_variant:medicMedpack.exactCurrentActionV2",
  medpackEvent: "state_event:medic_medpack_resolved_v2",
  medpackPublicTest: "judge_test:medic-medpack-v2-public-contract-v1",
  medpackExactActionTest: "judge_test:medic-medpack-v2-exact-action-v1",
  medpackProtectedStateTest: "judge_test:medic-medpack-v2-protected-state-v1",
  medpackReplayTest: "judge_test:medic-medpack-v2-ed25519-replay-hmac-rotation-v1",
  medpackHistoricalTest: "judge_test:medic-medpack-v1-runtime-and-display-freeze-v1",
  medpackRelationshipTest: "judge_test:medic-medpack-v2-relationship-negative-gap-v1",
  historicalMedpackV1Executor:
    `executor:${OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID}`
    + `@${OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_VERSION}`,
  currentMedpackV2Executor:
    `executor:${OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_VERSION}`,
  previousSliceRelease: v4.currentSliceRelease,
  currentSliceRelease: "slice_release:slice-66-current-movement-v5-and-medpack-v2",
  previousCatalogueRelease: v4.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-66-current",
  previousRuntimeRelease: v4.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-66-current",
});

const id = OFFICIAL_MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_NODE_IDS_V1;
const RETIRED_EXECUTORS = new Set([
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
]);
const EXECUTOR_MAP = new Map([
  [OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID, OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID],
  [OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID, OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID],
  [OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID, OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ID],
  [OFFICIAL_DISENGAGE_V4_EXECUTOR_ID, OFFICIAL_DISENGAGE_V5_EXECUTOR_ID],
  [OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID, OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_ID],
]);
const SCOPE_MAP = new Map([
  [OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS.startOfRound,
    OFFICIAL_MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_SCOPE_IDS.startOfRound],
  [OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS.reserveDeploy,
    OFFICIAL_MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_SCOPE_IDS.reserveDeploy],
  [OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS.standardMove,
    OFFICIAL_MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_SCOPE_IDS.standardMove],
  [OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS.disengage,
    OFFICIAL_MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_SCOPE_IDS.disengage],
  [OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_SCOPE_ID,
    OFFICIAL_MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_SCOPE_IDS.stimpackMove],
]);
const NODE_MAP = new Map([
  [v4.currentAuthorityLineage, id.currentAuthorityLineage],
  [v4.currentSupplyLossLineage, id.currentSupplyLossLineage],
  [v4.currentMovementMaterial, id.currentMovementMaterial],
  [v4.startDomain, id.startDomain],
  [v4.startAction, id.startAction],
  [v4.startEvent, id.startEvent],
  [v4.reserveDomain, id.reserveDomain],
  [v4.reserveAction, id.reserveAction],
  [v4.reserveEvent, id.reserveEvent],
  [v4.standardDomain, id.standardDomain],
  [v4.standardAction, id.standardAction],
  [v4.standardEvent, id.standardEvent],
  [v4.disengageDomain, id.disengageDomain],
  [v4.disengageAction, id.disengageAction],
  [v4.disengageEvent, id.disengageEvent],
  [v4.publicTest, id.movementPublicTest],
  [v4.supplyLineageTest, id.movementSupplyLineageTest],
  [v4.authorityTest, id.movementAuthorityTest],
  [v4.replayTest, id.movementReplayTest],
  [v4.historicalTest, id.movementHistoricalTest],
  [v4.relationshipTest, id.movementRelationshipTest],
  [v4.historicalStartV3Executor, id.historicalStartV4Executor],
  [v4.historicalReserveV3Executor, id.historicalReserveV4Executor],
  [v4.historicalStandardV3Executor, id.historicalStandardV4Executor],
  [v4.historicalDisengageV3Executor, id.historicalDisengageV4Executor],
  [v4.currentStartV4Executor, id.currentStartV5Executor],
  [v4.currentReserveV4Executor, id.currentReserveV5Executor],
  [v4.currentStandardV4Executor, id.currentStandardV5Executor],
  [v4.currentDisengageV4Executor, id.currentDisengageV5Executor],
  [stimV2.stimpackDomain, id.stimpackDomain],
  [stimV2.stimpackAction, id.stimpackAction],
  [stimV2.stimpackEvent, id.stimpackEvent],
  [stimV2.publicTest, id.stimpackPublicTest],
  [stimV2.exactActionTest, id.stimpackExactActionTest],
  [stimV2.protectedStateTest, id.stimpackProtectedStateTest],
  [stimV2.replayTest, id.stimpackReplayTest],
  [stimV2.historicalTest, id.stimpackHistoricalTest],
  [stimV2.relationshipTest, id.stimpackRelationshipTest],
  [stimV2.historicalExecutor, id.historicalStimpackV2Executor],
  [stimV2.currentExecutor, id.currentStimpackV3Executor],
  [v4.previousSliceRelease, id.previousSliceRelease],
  [v4.currentSliceRelease, id.currentSliceRelease],
  [v4.previousCatalogueRelease, id.previousCatalogueRelease],
  [v4.currentCatalogueRelease, id.currentCatalogueRelease],
  [v4.previousRuntimeRelease, id.previousRuntimeRelease],
  [v4.currentRuntimeRelease, id.currentRuntimeRelease],
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function mapString(value) {
  if (NODE_MAP.has(value)) return NODE_MAP.get(value);
  if (SCOPE_MAP.has(value)) return SCOPE_MAP.get(value);
  if (EXECUTOR_MAP.has(value)) return EXECUTOR_MAP.get(value);
  return value.replaceAll("movement_v4", "movement_v5")
    .replaceAll("start_of_round_v4", "start_of_round_v5")
    .replaceAll("reserve_deploy_v4", "reserve_deploy_v5")
    .replaceAll("standard_move_v4", "standard_move_v5")
    .replaceAll("disengage_v4", "disengage_v5")
    .replaceAll("stimpack_move_v2", "stimpack_move_v3");
}

function mapContract(value) {
  if (Array.isArray(value)) return value.map(mapContract);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => (
      [key, mapContract(child)]
    )));
  }
  return typeof value === "string" ? mapString(value) : value;
}

function node(nodeId, kind, label, provenance = "ticket-11-slice-66") {
  return { nodeId, kind, label, provenance };
}

function edge(scopeId, from, relationship, to, provenance) {
  return { scopeId, from, relationship, to, provenance };
}

function medpackScope() {
  const scopeId = OFFICIAL_MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_SCOPE_IDS.medpack;
  const reads = [
    id.round,
    id.phase,
    id.activeSideKey,
    id.firstPlayerSideKey,
    id.players,
    id.pieces,
    id.board,
    id.phaseFirstActorByRound,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.officialRoundSupplyState,
    id.supplyLossLedger,
    id.startOfRoundHistory,
    id.log,
    id.cardResources,
    id.cardReadiness,
    id.cardFace,
    id.abilityHistory,
    id.selectedUpgradeNames,
  ];
  const writes = [
    id.pieces,
    id.cardResources,
    id.cardReadiness,
    id.cardFace,
    id.damageMarker,
    id.statuses,
    id.abilityHistory,
    id.movementActivation,
    id.log,
  ];
  const protectedFields = [
    id.firstPlayerSideKey,
    id.scores,
    id.missionMarkers,
    id.tokens,
    id.markers,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.cleanupRefreshHistory,
    id.determineInitiativeHistory,
    id.startOfRoundHistory,
    id.officialRoundSupplyState,
    id.supplyLossLedger,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const tests = [id.medpackPublicTest, id.medpackExactActionTest,
    id.medpackProtectedStateTest, id.medpackReplayTest,
    id.medpackHistoricalTest, id.medpackRelationshipTest];
  const relations = [
    ...reads.map((to) => edge(scopeId, id.currentMedpackV2Executor, "reads", to,
      "medpack_v2_state_contract_v1")),
    edge(scopeId, id.currentMedpackV2Executor, "reads", id.currentAuthorityLineage,
      "medpack_v2_current_authority_lineage_v1"),
    edge(scopeId, id.currentAuthorityLineage, "derives", id.medpackAction,
      "medpack_v2_exact_action_derivation_v1"),
    edge(scopeId, id.cardReadiness, "gates", id.medpackAction,
      "medpack_v2_payment_gate_v1"),
    edge(scopeId, id.cardFace, "gates", id.medpackAction,
      "medpack_v2_payment_gate_v1"),
    ...reads.map((from) => edge(scopeId, from, "invalidates", id.medpackAction,
      "medpack_v2_state_invalidation_v1")),
    edge(scopeId, id.currentMedpackV2Executor, "exposes", id.medpackAction,
      "medpack_v2_exact_action_v1"),
    edge(scopeId, id.medpackAction, "includes", id.actionType,
      "medpack_v2_exact_action_v1"),
    edge(scopeId, id.medpackAction, "derives", id.medpackEvent,
      "medpack_v2_apply_v1"),
    ...writes.map((to) => edge(scopeId, id.medpackEvent, "writes", to,
      "medpack_v2_apply_v1")),
    edge(scopeId, id.medpackAction, "verified_by", id.medpackPublicTest,
      "medpack_v2_judge_v1"),
    edge(scopeId, id.medpackAction, "verified_by", id.medpackExactActionTest,
      "medpack_v2_judge_v1"),
    edge(scopeId, id.medpackEvent, "verified_by", id.medpackProtectedStateTest,
      "medpack_v2_judge_v1"),
    edge(scopeId, id.medpackEvent, "verified_by", id.medpackReplayTest,
      "medpack_v2_judge_v1"),
    edge(scopeId, id.historicalMedpackV1Executor, "verified_by", id.medpackHistoricalTest,
      "medpack_v2_judge_v1"),
    edge(scopeId, id.currentSliceRelease, "verified_by", id.medpackRelationshipTest,
      "medpack_v2_judge_v1"),
    edge(scopeId, id.historicalMedpackV1Executor, "superseded_by",
      id.currentMedpackV2Executor, "medpack_v2_executor_ancestry_v1"),
    edge(scopeId, id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "medpack_v2_slice_ancestry_v1"),
    edge(scopeId, id.previousCatalogueRelease, "retained_by", id.currentCatalogueRelease,
      "medpack_v2_catalogue_ancestry_v1"),
    edge(scopeId, id.previousRuntimeRelease, "retained_by", id.currentRuntimeRelease,
      "medpack_v2_runtime_ancestry_v1"),
  ];
  return {
    relations,
    tests,
    scope: {
      scopeId,
      executorId: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID,
      requiredNodeIds: [...new Set([
        ...reads,
        ...writes,
        ...protectedFields,
        id.currentAuthorityLineage,
        id.medpackAction,
        id.medpackEvent,
        id.historicalMedpackV1Executor,
        id.currentMedpackV2Executor,
        id.previousSliceRelease,
        id.currentSliceRelease,
        id.previousCatalogueRelease,
        id.currentCatalogueRelease,
        id.previousRuntimeRelease,
        id.currentRuntimeRelease,
        ...tests,
      ])],
      requiredEdges: relations,
      requiredPaths: [
        {
          from: id.startOfRoundHistory,
          to: id.medpackPublicTest,
          relationships: ["projects_to", "derives", "verified_by"],
          maxDepth: 5,
        },
        {
          from: id.medpackAction,
          to: id.medpackReplayTest,
          relationships: ["derives", "verified_by"],
          maxDepth: 3,
        },
      ],
      forbiddenPaths: protectedFields.map((to) => ({
        from: id.medpackEvent,
        to,
        relationships: ["writes"],
        maxDepth: 2,
      })),
      evidenceTestNodeIds: tests,
    },
  };
}

export function createOfficialMovementV5MedpackV2RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialStimpackMoveV2RelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const retiredScopes = previous.coverageScopes.filter((scope) => (
    RETIRED_EXECUTORS.has(scope.executorId)
  ));
  if (retiredScopes.length !== 5) {
    fail("MOVEMENT_V5_MEDPACK_V2_RETIRED_SCOPE_COUNT_INVALID", String(retiredScopes.length));
  }
  const mappedScopes = retiredScopes.map(mapContract);
  const mappedEdges = mappedScopes.flatMap((scope) => scope.requiredEdges);
  const mappedNodes = previous.nodes.flatMap((entry) => {
    const mapped = mapContract(entry);
    return mapped.nodeId === entry.nodeId ? [] : [{
      ...mapped,
      label: String(mapped.label || "").replaceAll("v4", "v5").replaceAll("v2", "v3"),
      provenance: "ticket-11-slice-66-current-lineage-migration",
    }];
  });
  const medpack = medpackScope();
  const addedNodes = [
    ...mappedNodes,
    node(id.historicalStartV4Executor, "executor", "Frozen historical Start-of-Round v4"),
    node(id.historicalReserveV4Executor, "executor", "Frozen historical Reserve Deploy v4"),
    node(id.historicalStandardV4Executor, "executor", "Frozen historical Standard Move v4"),
    node(id.historicalDisengageV4Executor, "executor", "Frozen historical Disengage v4"),
    node(id.historicalStimpackV2Executor, "executor", "Frozen historical Stimpack Move v2"),
    node(id.historicalStimpackV2Domain, "parameter_domain",
      "Frozen historical Stimpack Move v2 parameter domain"),
    node(id.historicalMedpackV1Executor, "executor", "Frozen historical Medic Medpack v1"),
    node(id.medpackAction, "action_variant", "Exact current Medic Medpack v2 action"),
    node(id.medpackEvent, "state_event", "Medic Medpack v2 resolved atomically"),
    ...medpack.tests.map((testId) => node(
      testId,
      "judge_test",
      testId.replace(/^judge_test:/u, ""),
    )),
    node(id.currentSliceRelease, "slice_release", "Slice 66 movement v5 and Medpack v2"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 66 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 66 runtime ${runtimeHash}`),
  ];
  const previousNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const uniqueAdded = [];
  const addedIds = new Set();
  for (const added of addedNodes) {
    if (previousNodeIds.has(added.nodeId) || addedIds.has(added.nodeId)) continue;
    addedIds.add(added.nodeId);
    uniqueAdded.push(added);
  }
  return {
    nodes: [...previous.nodes, ...uniqueAdded],
    edges: [...previous.edges, ...mappedEdges, ...medpack.relations],
    executorLineages: [
      ...previous.executorLineages.filter((entry) => !RETIRED_EXECUTORS.has(entry.executorId)),
      {
        executorId: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:start_of_round_v5",
      },
      {
        executorId: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:reserve_deploy_v5",
      },
      {
        executorId: OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:standard_move_v5",
      },
      {
        executorId: OFFICIAL_DISENGAGE_V5_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_DISENGAGE_V5_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:disengage_v5",
      },
      {
        executorId: OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:stimpack_move_v3",
      },
      {
        executorId: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:medic_medpack_v2",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds.filter((executorId) => (
        !RETIRED_EXECUTORS.has(executorId)
      )),
      OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID,
      OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID,
      OFFICIAL_STANDARD_MOVE_V5_EXECUTOR_ID,
      OFFICIAL_DISENGAGE_V5_EXECUTOR_ID,
      OFFICIAL_STIMPACK_MOVE_V3_EXECUTOR_ID,
      OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes.filter((scope) => !RETIRED_EXECUTORS.has(scope.executorId)),
      ...mappedScopes,
      medpack.scope,
    ],
  };
}
