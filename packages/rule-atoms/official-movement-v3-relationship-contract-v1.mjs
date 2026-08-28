import {
  OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
} from "./official-disengage-casualty-executor-v1.mjs";
import {
  OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION,
} from "./official-disengage-executor-v3.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_VERSION,
} from "./official-reserve-deploy-executor-v2.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_VERSION,
} from "./official-reserve-deploy-executor-v3.mjs";
import {
  createOfficialStandardMoveRelationshipExtensionV1,
  OFFICIAL_STANDARD_MOVE_RELATIONSHIP_NODE_IDS_V1,
} from "./official-standard-move-relationship-contract-v1.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION,
} from "./official-standard-move-executor-v2.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_VERSION,
} from "./official-standard-move-executor-v3.mjs";
import {
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION,
} from "./official-start-of-round-executor-v2.mjs";
import {
  OFFICIAL_START_OF_ROUND_V3_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION,
} from "./official-start-of-round-executor-v3.mjs";

const PREVIOUS_CATALOGUE_HASH =
  "c437d7ef4f9776cbea688f9a082d7d64110d817b763c0092fcdcb25114ed9733";
const PREVIOUS_RUNTIME_HASH =
  "9df3c61f7b271067ad41b8dabdb228c98341e23fe999c17052eb974d06d61a33";
const EXPECTED_CATALOGUE_HASH =
  "f19484a581bf48ad3aa574aea7ae17f636d37af9a8eecbce6d2485d7bbb62d25";
const EXPECTED_RUNTIME_HASH =
  "b08c2b39dddf12f849ceb731107ed785cde813224dd539053317bccb869a3043";

const baseIds = OFFICIAL_STANDARD_MOVE_RELATIONSHIP_NODE_IDS_V1;
const SUPPLY_LOSS_LEDGER = "state_field:supplyLossLedger";
const retiredCurrentExecutorIds = new Set([
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
]);

export const OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS = Object.freeze({
  startOfRound: "ticket-11-current-movement-start-of-round-v3",
  reserveDeploy: "ticket-11-current-movement-reserve-deploy-v3",
  standardMove: "ticket-11-current-movement-standard-move-v3",
  disengage: "ticket-11-current-movement-disengage-v3",
});

export const OFFICIAL_MOVEMENT_V3_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  ...baseIds,
  supplyLossLedger: SUPPLY_LOSS_LEDGER,
  currentAuthorityLineage:
    "semantic_projection:movementV3.currentAuthorityLineage",
  currentSupplyLossLineage:
    "semantic_projection:movementV3.currentSupplyLossLineage",
  currentMovementMaterial:
    "semantic_projection:movementV3.currentSourceUnitGeometryAndCasualtyMaterial",
  startDomain: "parameter_domain:startOfRound.exactCurrentDomainV3",
  startAction: "action_variant:startOfRound.exactCurrentActionV3",
  startEvent: "state_event:start_of_round_resolved_v3",
  reserveDomain: "parameter_domain:reserveDeploy.exactCurrentDomainV3",
  reserveAction: "action_variant:reserveDeploy.exactCurrentActionV3",
  reserveEvent: "state_event:reserve_deployed_v3",
  standardDomain: "parameter_domain:standardMove.exactCurrentDomainV3",
  standardAction: "action_variant:standardMove.exactCurrentActionV3",
  standardEvent: "state_event:unit_standard_moved_v3",
  disengageDomain: "parameter_domain:disengage.exactCurrentDomainV3",
  disengageAction: "action_variant:disengage.exactCurrentActionV3",
  disengageEvent: "state_event:unit_disengaged_or_failed_v3",
  publicTest: "judge_test:movement-v3-public-contracts-v1",
  supplyLineageTest: "judge_test:movement-v3-supply-lineage-v1",
  authorityTest: "judge_test:movement-v3-authority-confirm-apply-v1",
  replayTest: "judge_test:movement-v3-ed25519-replay-hmac-rotation-v1",
  historicalTest: "judge_test:movement-v2-runtime-and-display-freeze-v1",
  relationshipTest: "judge_test:movement-v3-relationship-negative-gap-v1",
  historicalStartV2Executor:
    `executor:${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION}`,
  historicalReserveV2Executor:
    `executor:${OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_VERSION}`,
  historicalStandardV2Executor:
    `executor:${OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION}`,
  historicalDisengageV2Executor:
    `executor:${OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID}`
    + `@${OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION}`,
  currentStartV3Executor:
    `executor:${OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION}`,
  currentReserveV3Executor:
    `executor:${OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_VERSION}`,
  currentStandardV3Executor:
    `executor:${OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_VERSION}`,
  currentDisengageV3Executor:
    `executor:${OFFICIAL_DISENGAGE_V3_EXECUTOR_ID}`
    + `@${OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION}`,
  startActionType: `action_type:${OFFICIAL_START_OF_ROUND_V3_ACTION_TYPE}`,
  reserveActionType: "action_type:deploy",
  standardActionType: "action_type:move",
  disengageActionType: "action_type:disengage",
  previousSliceRelease: baseIds.currentSliceRelease,
  currentSliceRelease: "slice_release:slice-64-current-movement-v3-contract-closure-v1",
  previousCatalogueRelease: baseIds.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-64-current",
  previousRuntimeRelease: baseIds.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-64-current",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-movement-v3-version-coordination" };
}

function relation(scopeId, from, relationship, to, provenance) {
  return { from, relationship, to, scopeId, provenance };
}

function contract(config, ids) {
  const readFields = config.readFields;
  const protectedFields = config.protectedFields;
  const tests = [
    ids.publicTest,
    ids.supplyLineageTest,
    ids.authorityTest,
    ids.replayTest,
    ids.historicalTest,
    ids.relationshipTest,
  ];
  const edge = (from, relationship, to, provenance) => (
    relation(config.scopeId, from, relationship, to, provenance)
  );
  const edges = [
    ...readFields.map((to) => edge(config.currentExecutor, "reads", to,
      `${config.slug}_state_contract_v1`)),
    edge(config.currentExecutor, "reads", ids.currentAuthorityLineage,
      `${config.slug}_state_contract_v1`),
    edge(ids.startOfRoundHistory, "projects_to", ids.currentAuthorityLineage,
      `${config.slug}_authority_projection_v1`),
    edge(ids.phaseFirstActorByRound, "projects_to", ids.currentAuthorityLineage,
      `${config.slug}_authority_projection_v1`),
    edge(ids.officialRoundSupplyState, "projects_to", ids.currentAuthorityLineage,
      `${config.slug}_authority_projection_v1`),
    edge(ids.log, "projects_to", ids.currentAuthorityLineage,
      `${config.slug}_authority_projection_v1`),
    edge(ids.supplyLossLedger, "projects_to", ids.currentSupplyLossLineage,
      `${config.slug}_supply_loss_projection_v1`),
    edge(ids.log, "projects_to", ids.currentSupplyLossLineage,
      `${config.slug}_supply_loss_projection_v1`),
    edge(ids.officialGameplayDataBundle, "projects_to", ids.currentMovementMaterial,
      `${config.slug}_movement_material_projection_v1`),
    edge(ids.pieces, "projects_to", ids.currentMovementMaterial,
      `${config.slug}_movement_material_projection_v1`),
    edge(ids.board, "projects_to", ids.currentMovementMaterial,
      `${config.slug}_movement_material_projection_v1`),
    ...[
      ids.currentAuthorityLineage,
      ids.currentSupplyLossLineage,
      ids.currentMovementMaterial,
    ].map((from) => edge(from, "derives", config.domain,
      `${config.slug}_domain_derivation_v1`)),
    edge(config.currentExecutor, "exposes", config.domain,
      `${config.slug}_exact_action_v1`),
    edge(config.domain, "derives", config.action,
      `${config.slug}_exact_action_v1`),
    edge(config.action, "includes", config.actionType,
      `${config.slug}_exact_action_v1`),
    ...readFields.map((from) => edge(from, "invalidates", config.domain,
      `${config.slug}_state_invalidation_v1`)),
    edge(config.action, "derives", config.event,
      `${config.slug}_apply_v1`),
    ...config.writeFields.map((to) => edge(config.event, "writes", to,
      `${config.slug}_apply_v1`)),
    edge(config.domain, "verified_by", ids.publicTest, `${config.slug}_judge_v1`),
    edge(ids.currentSupplyLossLineage, "verified_by", ids.supplyLineageTest,
      `${config.slug}_judge_v1`),
    edge(config.event, "verified_by", ids.authorityTest, `${config.slug}_judge_v1`),
    edge(config.event, "verified_by", ids.replayTest, `${config.slug}_judge_v1`),
    edge(config.historicalExecutor, "verified_by", ids.historicalTest,
      `${config.slug}_judge_v1`),
    edge(ids.currentSliceRelease, "verified_by", ids.relationshipTest,
      `${config.slug}_judge_v1`),
    edge(config.historicalExecutor, "superseded_by", config.currentExecutor,
      `${config.slug}_executor_ancestry_v1`),
  ];
  return {
    edges,
    scope: {
      scopeId: config.scopeId,
      executorId: config.executorId,
      requiredNodeIds: [...new Set([
        ...readFields,
        ...config.writeFields,
        ...protectedFields,
        ids.currentAuthorityLineage,
        ids.currentSupplyLossLineage,
        ids.currentMovementMaterial,
        config.domain,
        config.action,
        config.actionType,
        config.event,
        config.historicalExecutor,
        config.currentExecutor,
        ...tests,
      ])],
      requiredEdges: edges,
      requiredPaths: [
        {
          from: ids.startOfRoundHistory,
          to: ids.publicTest,
          relationships: ["projects_to", "derives", "verified_by"],
          maxDepth: 4,
        },
        {
          from: ids.supplyLossLedger,
          to: ids.supplyLineageTest,
          relationships: ["projects_to", "verified_by"],
          maxDepth: 3,
        },
        {
          from: config.action,
          to: ids.replayTest,
          relationships: ["derives", "verified_by"],
          maxDepth: 3,
        },
      ],
      forbiddenPaths: protectedFields.map((to) => ({
        from: config.event,
        to,
        relationships: ["writes"],
        maxDepth: 2,
      })),
      evidenceTestNodeIds: tests,
    },
  };
}

export function createOfficialMovementV3RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("MOVEMENT_V3_RELATIONSHIP_CURRENT_RELEASE_INVALID",
      `${catalogueHash}:${runtimeHash}`);
  }
  const previous = createOfficialStandardMoveRelationshipExtensionV1({
    catalogueHash: PREVIOUS_CATALOGUE_HASH,
    runtimeHash: PREVIOUS_RUNTIME_HASH,
  });
  const id = OFFICIAL_MOVEMENT_V3_RELATIONSHIP_NODE_IDS_V1;
  const commonReads = [
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
    id.terminal,
    id.gameOver,
  ];
  const protectedFields = [
    id.firstPlayerSideKey,
    id.combatEffects,
    id.damageMarker,
    id.missionMarkers,
    id.effectMarkers,
    id.tokens,
    id.markers,
    id.scores,
    id.cardResources,
    id.officialGameplayDataBundle,
    id.officialMissionSetupBinding,
    id.cleanupRefreshHistory,
    id.determineInitiativeHistory,
    id.terminal,
    id.gameOver,
    id.winner,
    id.terminalReason,
  ];
  const configs = [
    {
      scopeId: OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS.startOfRound,
      slug: "start_of_round_v3",
      executorId: OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
      currentExecutor: id.currentStartV3Executor,
      historicalExecutor: id.historicalStartV2Executor,
      domain: id.startDomain,
      action: id.startAction,
      actionType: id.startActionType,
      event: id.startEvent,
      readFields: commonReads,
      writeFields: [
        id.phase,
        id.activeSideKey,
        id.pieces,
        id.cardResources,
        id.officialRoundSupplyState,
        id.supplyLossLedger,
        id.startOfRoundHistory,
        id.log,
      ],
      protectedFields: protectedFields.filter((field) => ![
        id.cardResources,
      ].includes(field)),
    },
    {
      scopeId: OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS.reserveDeploy,
      slug: "reserve_deploy_v3",
      executorId: OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ID,
      currentExecutor: id.currentReserveV3Executor,
      historicalExecutor: id.historicalReserveV2Executor,
      domain: id.reserveDomain,
      action: id.reserveAction,
      actionType: id.reserveActionType,
      event: id.reserveEvent,
      readFields: commonReads,
      writeFields: [id.phase, id.activeSideKey, id.players, id.pieces,
        id.officialRoundSupplyState, id.log],
      protectedFields,
    },
    {
      scopeId: OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS.standardMove,
      slug: "standard_move_v3",
      executorId: OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ID,
      currentExecutor: id.currentStandardV3Executor,
      historicalExecutor: id.historicalStandardV2Executor,
      domain: id.standardDomain,
      action: id.standardAction,
      actionType: id.standardActionType,
      event: id.standardEvent,
      readFields: commonReads,
      writeFields: [id.phase, id.activeSideKey, id.players, id.pieces,
        id.officialRoundSupplyState, id.log],
      protectedFields,
    },
    {
      scopeId: OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS.disengage,
      slug: "disengage_v3",
      executorId: OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
      currentExecutor: id.currentDisengageV3Executor,
      historicalExecutor: id.historicalDisengageV2Executor,
      domain: id.disengageDomain,
      action: id.disengageAction,
      actionType: id.disengageActionType,
      event: id.disengageEvent,
      readFields: commonReads,
      writeFields: [id.phase, id.activeSideKey, id.players, id.pieces,
        id.officialRoundSupplyState, id.supplyLossLedger, id.log],
      protectedFields,
    },
  ];
  const contracts = configs.map((config) => contract(config, id));
  const tests = [id.publicTest, id.supplyLineageTest, id.authorityTest,
    id.replayTest, id.historicalTest, id.relationshipTest];
  const nodes = [
    node(id.currentAuthorityLineage, "semantic_projection",
      "Start v3, phase initiative and ordered current Supply mutation lineage"),
    node(id.currentSupplyLossLineage, "semantic_projection",
      "Hash-bound SupplyLossLedger action and causal-event lineage"),
    node(id.currentMovementMaterial, "semantic_projection",
      "Current official unit, movement geometry and casualty source material"),
    node(id.startDomain, "parameter_domain", "Exact current Start-of-Round v3 domain"),
    node(id.startAction, "action_variant", "Exact current Start-of-Round v3 action"),
    node(id.startEvent, "state_event", "Start-of-Round v3 resolved"),
    node(id.reserveDomain, "parameter_domain", "Exact current Reserve Deploy v3 domain"),
    node(id.reserveAction, "action_variant", "Exact current Reserve Deploy v3 action"),
    node(id.reserveEvent, "state_event", "Reserve deployed under v3 lineage"),
    node(id.standardDomain, "parameter_domain", "Exact current Standard Move v3 domain"),
    node(id.standardAction, "action_variant", "Exact current Standard Move v3 action"),
    node(id.standardEvent, "state_event", "Standard Move resolved under v3 lineage"),
    node(id.disengageDomain, "parameter_domain", "Exact current Disengage v3 domain"),
    node(id.disengageAction, "action_variant", "Exact current Disengage v3 action"),
    node(id.disengageEvent, "state_event", "Disengage placed, casualty or failure v3"),
    ...tests.map((testId) => node(testId, "judge_test", testId.replace(/^judge_test:/u, ""))),
    node(id.historicalStartV2Executor, "executor", "Frozen historical Start-of-Round v2"),
    node(id.historicalReserveV2Executor, "executor", "Frozen historical Reserve Deploy v2"),
    node(id.historicalStandardV2Executor, "executor", "Frozen historical Standard Move v2"),
    node(id.historicalDisengageV2Executor, "executor", "Frozen historical Disengage v2"),
    node(id.currentSliceRelease, "slice_release", "Slice 64 current movement v3 closure"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 64 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 64 runtime ${runtimeHash}`),
  ];
  const releaseEdges = [
    relation("ticket-11-movement-v3-release", id.previousSliceRelease, "superseded_by",
      id.currentSliceRelease, "movement_v3_slice_ancestry_v1"),
    relation("ticket-11-movement-v3-release", id.previousCatalogueRelease, "retained_by",
      id.currentCatalogueRelease, "movement_v3_catalogue_ancestry_v1"),
    relation("ticket-11-movement-v3-release", id.previousRuntimeRelease, "retained_by",
      id.currentRuntimeRelease, "movement_v3_runtime_ancestry_v1"),
  ];
  return {
    nodes: [...previous.nodes, ...nodes],
    edges: [...previous.edges, ...contracts.flatMap((entry) => entry.edges), ...releaseEdges],
    executorLineages: [...previous.executorLineages],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds.filter((executorId) => (
        !retiredCurrentExecutorIds.has(executorId)
      )),
      ...configs.map((config) => config.executorId),
    ],
    coverageScopes: [
      ...previous.coverageScopes.filter((scope) => (
        !retiredCurrentExecutorIds.has(scope.executorId)
      )),
      ...contracts.map((entry) => entry.scope),
    ],
  };
}
