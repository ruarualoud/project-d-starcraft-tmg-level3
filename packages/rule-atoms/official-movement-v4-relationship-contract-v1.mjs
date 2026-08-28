import {
  createOfficialMovementV3RelationshipExtensionV1,
  OFFICIAL_MOVEMENT_V3_RELATIONSHIP_NODE_IDS_V1,
  OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS,
} from "./official-movement-v3-relationship-contract-v1.mjs";
import {
  OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION,
} from "./official-disengage-executor-v3.mjs";
import {
  OFFICIAL_DISENGAGE_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION,
} from "./official-disengage-executor-v4.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_VERSION,
} from "./official-reserve-deploy-executor-v3.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_VERSION,
} from "./official-reserve-deploy-executor-v4.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_VERSION,
} from "./official-standard-move-executor-v3.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION,
} from "./official-standard-move-executor-v4.mjs";
import {
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION,
} from "./official-start-of-round-executor-v3.mjs";
import {
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION,
} from "./official-start-of-round-executor-v4.mjs";

const PREVIOUS_CATALOGUE_HASH =
  "f19484a581bf48ad3aa574aea7ae17f636d37af9a8eecbce6d2485d7bbb62d25";
const PREVIOUS_RUNTIME_HASH =
  "b08c2b39dddf12f849ceb731107ed785cde813224dd539053317bccb869a3043";

const v3 = OFFICIAL_MOVEMENT_V3_RELATIONSHIP_NODE_IDS_V1;
const selectedUpgradeNames = "state_field:pieces[].selectedUpgradeNames";

export const OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS = Object.freeze({
  startOfRound: "ticket-11-current-movement-start-of-round-v4",
  reserveDeploy: "ticket-11-current-movement-reserve-deploy-v4",
  standardMove: "ticket-11-current-movement-standard-move-v4",
  disengage: "ticket-11-current-movement-disengage-v4",
});

export const OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  ...v3,
  selectedUpgradeNames,
  currentAuthorityLineage:
    "semantic_projection:movementV4.currentAuthorityAndSelectedLoadoutLineage",
  currentSupplyLossLineage:
    "semantic_projection:movementV4.currentSupplyLossLineage",
  currentMovementMaterial:
    "semantic_projection:movementV4.currentSourceUnitGeometryLoadoutAndCasualtyMaterial",
  startDomain: "parameter_domain:startOfRound.exactCurrentDomainV4",
  startAction: "action_variant:startOfRound.exactCurrentActionV4",
  startEvent: "state_event:start_of_round_resolved_v4",
  reserveDomain: "parameter_domain:reserveDeploy.exactCurrentDomainV4",
  reserveAction: "action_variant:reserveDeploy.exactCurrentActionV4",
  reserveEvent: "state_event:reserve_deployed_v4",
  standardDomain: "parameter_domain:standardMove.exactCurrentDomainV4",
  standardAction: "action_variant:standardMove.exactCurrentActionV4",
  standardEvent: "state_event:unit_standard_moved_v4",
  disengageDomain: "parameter_domain:disengage.exactCurrentDomainV4",
  disengageAction: "action_variant:disengage.exactCurrentActionV4",
  disengageEvent: "state_event:unit_disengaged_or_failed_v4",
  publicTest: "judge_test:movement-v4-public-contracts-v1",
  supplyLineageTest: "judge_test:movement-v4-supply-lineage-v1",
  authorityTest: "judge_test:movement-v4-authority-confirm-apply-v1",
  replayTest: "judge_test:movement-v4-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:movement-v3-runtime-and-display-freeze-v1",
  relationshipTest: "judge_test:movement-v4-relationship-negative-gap-v1",
  historicalStartV3Executor:
    `executor:${OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION}`,
  historicalReserveV3Executor:
    `executor:${OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_VERSION}`,
  historicalStandardV3Executor:
    `executor:${OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_VERSION}`,
  historicalDisengageV3Executor:
    `executor:${OFFICIAL_DISENGAGE_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION}`,
  currentStartV4Executor:
    `executor:${OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID}`
    + `@${OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION}`,
  currentReserveV4Executor:
    `executor:${OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID}`
    + `@${OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_VERSION}`,
  currentStandardV4Executor:
    `executor:${OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID}`
    + `@${OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION}`,
  currentDisengageV4Executor:
    `executor:${OFFICIAL_DISENGAGE_V4_EXECUTOR_ID}`
    + `@${OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION}`,
  previousSliceRelease: v3.currentSliceRelease,
  currentSliceRelease: "slice_release:slice-65-current-movement-v4-and-stimpack-v2",
  previousCatalogueRelease: v3.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-65-current",
  previousRuntimeRelease: v3.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-65-current",
});

const v4 = OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1;
const RETIRED_EXECUTORS = new Set([
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
]);
const EXECUTOR_MAP = new Map([
  [OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID, OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID],
  [OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ID, OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID],
  [OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ID, OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID],
  [OFFICIAL_DISENGAGE_V3_EXECUTOR_ID, OFFICIAL_DISENGAGE_V4_EXECUTOR_ID],
]);
const SCOPE_MAP = new Map([
  [OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS.startOfRound,
    OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS.startOfRound],
  [OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS.reserveDeploy,
    OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS.reserveDeploy],
  [OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS.standardMove,
    OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS.standardMove],
  [OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS.disengage,
    OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS.disengage],
]);
const NODE_MAP = new Map([
  [v3.currentAuthorityLineage, v4.currentAuthorityLineage],
  [v3.currentSupplyLossLineage, v4.currentSupplyLossLineage],
  [v3.currentMovementMaterial, v4.currentMovementMaterial],
  [v3.startDomain, v4.startDomain],
  [v3.startAction, v4.startAction],
  [v3.startEvent, v4.startEvent],
  [v3.reserveDomain, v4.reserveDomain],
  [v3.reserveAction, v4.reserveAction],
  [v3.reserveEvent, v4.reserveEvent],
  [v3.standardDomain, v4.standardDomain],
  [v3.standardAction, v4.standardAction],
  [v3.standardEvent, v4.standardEvent],
  [v3.disengageDomain, v4.disengageDomain],
  [v3.disengageAction, v4.disengageAction],
  [v3.disengageEvent, v4.disengageEvent],
  [v3.publicTest, v4.publicTest],
  [v3.supplyLineageTest, v4.supplyLineageTest],
  [v3.authorityTest, v4.authorityTest],
  [v3.replayTest, v4.replayTest],
  [v3.historicalTest, v4.historicalTest],
  [v3.relationshipTest, v4.relationshipTest],
  [v3.historicalStartV2Executor, v4.historicalStartV3Executor],
  [v3.historicalReserveV2Executor, v4.historicalReserveV3Executor],
  [v3.historicalStandardV2Executor, v4.historicalStandardV3Executor],
  [v3.historicalDisengageV2Executor, v4.historicalDisengageV3Executor],
  [v3.currentStartV3Executor, v4.currentStartV4Executor],
  [v3.currentReserveV3Executor, v4.currentReserveV4Executor],
  [v3.currentStandardV3Executor, v4.currentStandardV4Executor],
  [v3.currentDisengageV3Executor, v4.currentDisengageV4Executor],
  [v3.currentSliceRelease, v4.currentSliceRelease],
  [v3.currentCatalogueRelease, v4.currentCatalogueRelease],
  [v3.currentRuntimeRelease, v4.currentRuntimeRelease],
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function mapString(value) {
  if (NODE_MAP.has(value)) return NODE_MAP.get(value);
  if (SCOPE_MAP.has(value)) return SCOPE_MAP.get(value);
  if (EXECUTOR_MAP.has(value)) return EXECUTOR_MAP.get(value);
  return value.replaceAll("movement_v3", "movement_v4")
    .replaceAll("start_of_round_v3", "start_of_round_v4")
    .replaceAll("reserve_deploy_v3", "reserve_deploy_v4")
    .replaceAll("standard_move_v3", "standard_move_v4")
    .replaceAll("disengage_v3", "disengage_v4");
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

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: "ticket-11-movement-v4-selected-loadout-coordination",
  };
}

function edge(scopeId, from, relationship, to, provenance) {
  return { scopeId, from, relationship, to, provenance };
}

function upgradeScope(scope) {
  const mapped = mapContract(scope);
  const executorNode = mapped.requiredNodeIds.find((nodeId) => (
    nodeId.startsWith(`executor:${mapped.executorId}@`)
  ));
  const domainNode = mapped.requiredNodeIds.find((nodeId) => (
    nodeId.startsWith("parameter_domain:")
  ));
  const eventNode = mapped.requiredNodeIds.find((nodeId) => (
    nodeId.startsWith("state_event:")
  ));
  if (!executorNode || !domainNode || !eventNode) {
    fail("MOVEMENT_V4_RELATIONSHIP_SCOPE_SHAPE_INVALID", mapped.scopeId);
  }
  const loadoutEdges = [
    edge(mapped.scopeId, executorNode, "reads", selectedUpgradeNames,
      "movement_v4_selected_loadout_state_contract_v1"),
    edge(mapped.scopeId, selectedUpgradeNames, "projects_to", v4.currentAuthorityLineage,
      "movement_v4_selected_loadout_projection_v1"),
    edge(mapped.scopeId, selectedUpgradeNames, "invalidates", domainNode,
      "movement_v4_selected_loadout_invalidation_v1"),
  ];
  return {
    ...mapped,
    requiredNodeIds: [...new Set([...mapped.requiredNodeIds, selectedUpgradeNames])],
    requiredEdges: [...mapped.requiredEdges, ...loadoutEdges],
    requiredPaths: [
      ...mapped.requiredPaths,
      {
        from: selectedUpgradeNames,
        to: v4.publicTest,
        relationships: ["projects_to", "derives", "verified_by"],
        maxDepth: 5,
      },
    ],
    forbiddenPaths: [
      ...mapped.forbiddenPaths,
      {
        from: eventNode,
        to: selectedUpgradeNames,
        relationships: ["writes"],
        maxDepth: 2,
      },
    ],
  };
}

export function createOfficialMovementV4RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("MOVEMENT_V4_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialMovementV3RelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const v3Scopes = previous.coverageScopes.filter((scope) => (
    RETIRED_EXECUTORS.has(scope.executorId)
  ));
  if (v3Scopes.length !== 4) fail("MOVEMENT_V4_RELATIONSHIP_V3_SCOPE_COUNT_INVALID");
  const v4Scopes = v3Scopes.map(upgradeScope);
  const v4Edges = v4Scopes.flatMap((scope) => scope.requiredEdges);
  const mappedNodes = previous.nodes
    .filter((entry) => NODE_MAP.has(entry.nodeId))
    .map((entry) => ({
      ...mapContract(entry),
      label: String(entry.label || "").replaceAll("v3", "v4"),
      provenance: "ticket-11-movement-v4-selected-loadout-coordination",
    }));
  const tests = [v4.publicTest, v4.supplyLineageTest, v4.authorityTest,
    v4.replayTest, v4.historicalTest, v4.relationshipTest];
  const addedNodes = [
    ...mappedNodes,
    node(selectedUpgradeNames, "state_field", "Exact selected upgrade names by Unit"),
    node(v4.currentAuthorityLineage, "semantic_projection",
      "Start v4 loadout, phase initiative and ordered current Supply lineage"),
    node(v4.currentSupplyLossLineage, "semantic_projection",
      "Current v4 SupplyLossLedger action and causal-event lineage"),
    node(v4.currentMovementMaterial, "semantic_projection",
      "Current official unit, movement geometry, loadout and casualty material"),
    ...tests.map((testId) => node(testId, "judge_test", testId.replace(/^judge_test:/u, ""))),
    node(v4.historicalStartV3Executor, "executor", "Frozen historical Start-of-Round v3"),
    node(v4.historicalReserveV3Executor, "executor", "Frozen historical Reserve Deploy v3"),
    node(v4.historicalStandardV3Executor, "executor", "Frozen historical Standard Move v3"),
    node(v4.historicalDisengageV3Executor, "executor", "Frozen historical Disengage v3"),
    node(v4.currentSliceRelease, "slice_release", "Slice 65 movement v4 and Stimpack v2"),
    node(v4.currentCatalogueRelease, "catalogue_release", `Slice 65 catalogue ${catalogueHash}`),
    node(v4.currentRuntimeRelease, "runtime_release", `Slice 65 runtime ${runtimeHash}`),
  ];
  const existingNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const uniqueAddedNodes = [];
  const addedNodeIds = new Set();
  for (const added of addedNodes) {
    if (existingNodeIds.has(added.nodeId) || addedNodeIds.has(added.nodeId)) continue;
    addedNodeIds.add(added.nodeId);
    uniqueAddedNodes.push(added);
  }
  const releaseEdges = [
    edge("ticket-11-movement-v4-release", v4.previousSliceRelease, "superseded_by",
      v4.currentSliceRelease, "movement_v4_slice_ancestry_v1"),
    edge("ticket-11-movement-v4-release", v4.previousCatalogueRelease, "retained_by",
      v4.currentCatalogueRelease, "movement_v4_catalogue_ancestry_v1"),
    edge("ticket-11-movement-v4-release", v4.previousRuntimeRelease, "retained_by",
      v4.currentRuntimeRelease, "movement_v4_runtime_ancestry_v1"),
  ];
  return {
    nodes: [...previous.nodes, ...uniqueAddedNodes],
    edges: [...previous.edges, ...v4Edges, ...releaseEdges],
    executorLineages: [
      ...previous.executorLineages,
      {
        executorId: OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:start_of_round_v4",
      },
      {
        executorId: OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:reserve_deploy_v4",
      },
      {
        executorId: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:standard_move_v4",
      },
      {
        executorId: OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_DISENGAGE_V4_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:disengage_v4",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds.filter((executorId) => (
        !RETIRED_EXECUTORS.has(executorId)
      )),
      OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
      OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID,
      OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
      OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes.filter((scope) => !RETIRED_EXECUTORS.has(scope.executorId)),
      ...v4Scopes,
    ],
  };
}
