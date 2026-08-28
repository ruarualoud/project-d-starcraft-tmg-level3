import {
  createOfficialMovementV5MedpackV2RelationshipExtensionV1,
  OFFICIAL_MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_NODE_IDS_V1,
} from "./official-movement-v5-medpack-v2-relationship-contract-v1.mjs";
import {
  OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION,
} from "./official-ranged-attack-executor-v6.mjs";

export const OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_SCOPE_ID =
  "ticket-11-current-ranged-attack-v6";

const base = OFFICIAL_MOVEMENT_V5_MEDPACK_V2_RELATIONSHIP_NODE_IDS_V1;
export const OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  ...base,
  currentExecutor:
    `executor:${OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID}`
    + `@${OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION}`,
  action: "action_variant:rangedAttack.exactCurrentActionV6",
  event: "state_event:ranged_attack_resolved_v6",
  sourceMaterial:
    "semantic_projection:rangedAttackV6.currentOfficialProfileLoadoutAndCombatMaterial",
  geometryMaterial:
    "semantic_projection:rangedAttackV6.modelBaseLineOfSightRangeAndEngagementMaterial",
  currentModels: "state_field:pieces[].currentModels",
  currentSupply: "state_field:pieces[].currentSupply",
  destroyedModelIds: "state_field:pieces[].destroyedModelIds",
  modelPositions: "state_field:pieces[].models[].position",
  modelPresence: "state_field:pieces[].models[].presenceAndDestroyedState",
  piecePresence: "state_field:pieces[].presenceAndDestroyedState",
  assaultActivation: "state_field:pieces[].activatedPhases.assault",
  assaultEffects: "state_field:pieces[].assaultEffects",
  engagementGeometry: "state_field:board.engagementGeometry",
  tests: Object.freeze({
    publicContract: "judge_test:ranged-attack-v6-current-public-contract-v1",
    exactAction: "judge_test:ranged-attack-v6-exact-action-and-stale-rejection-v1",
    protectedState: "judge_test:ranged-attack-v6-protected-state-v1",
    authority: "judge_test:ranged-attack-v6-preview-confirm-apply-v1",
    replay: "judge_test:ranged-attack-v6-ed25519-replay-hmac-rotation-v1",
    historical: "judge_test:ranged-attack-v1-v6-runtime-and-display-freeze-v1",
    relationship: "judge_test:ranged-attack-v6-relationship-negative-gap-v1",
  }),
  previousSliceRelease: base.currentSliceRelease,
  currentSliceRelease: "slice_release:slice-67-current-ranged-attack-v6-contract",
  previousCatalogueRelease: base.currentCatalogueRelease,
  currentCatalogueRelease: "catalogue_release:slice-67-current",
  previousRuntimeRelease: base.currentRuntimeRelease,
  currentRuntimeRelease: "runtime_release:slice-67-current",
});

const id = OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1;

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-67" };
}

function edge(from, relationship, to, provenance) {
  return {
    scopeId: OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_SCOPE_ID,
    from,
    relationship,
    to,
    provenance,
  };
}

export function createOfficialRangedAttackV6RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("RANGED_ATTACK_V6_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialMovementV5MedpackV2RelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
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
    id.selectedUpgradeNames,
    id.currentModels,
    id.currentSupply,
    id.modelPositions,
    id.modelPresence,
    id.piecePresence,
    id.assaultActivation,
    id.statuses,
    id.combatEffects,
    id.assaultEffects,
    id.damageMarker,
    id.engagementGeometry,
  ];
  const writes = [
    id.pieces,
    id.activeSideKey,
    id.currentModels,
    id.currentSupply,
    id.modelPresence,
    id.piecePresence,
    id.damageMarker,
    id.assaultActivation,
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
  const tests = Object.values(id.tests);
  const relations = [
    ...reads.map((to) => edge(
      id.currentExecutor,
      "reads",
      to,
      "ranged_attack_v6_state_contract_v1",
    )),
    edge(id.officialGameplayDataBundle, "projects_to", id.sourceMaterial,
      "ranged_attack_v6_current_official_source_projection_v1"),
    edge(id.selectedUpgradeNames, "projects_to", id.sourceMaterial,
      "ranged_attack_v6_current_loadout_projection_v1"),
    edge(id.pieces, "projects_to", id.geometryMaterial,
      "ranged_attack_v6_model_geometry_projection_v1"),
    edge(id.board, "projects_to", id.geometryMaterial,
      "ranged_attack_v6_board_geometry_projection_v1"),
    edge(id.engagementGeometry, "projects_to", id.geometryMaterial,
      "ranged_attack_v6_engagement_projection_v1"),
    edge(id.sourceMaterial, "derives", id.action,
      "ranged_attack_v6_exact_action_derivation_v1"),
    edge(id.geometryMaterial, "derives", id.action,
      "ranged_attack_v6_exact_action_derivation_v1"),
    ...reads.map((from) => edge(
      from,
      "invalidates",
      id.action,
      "ranged_attack_v6_state_invalidation_v1",
    )),
    edge(id.currentExecutor, "exposes", id.action,
      "ranged_attack_v6_exact_action_v1"),
    edge(id.action, "includes", id.actionType,
      "ranged_attack_v6_exact_action_v1"),
    edge(id.action, "derives", id.event,
      "ranged_attack_v6_atomic_apply_v1"),
    ...writes.map((to) => edge(
      id.event,
      "writes",
      to,
      "ranged_attack_v6_atomic_apply_v1",
    )),
    edge(id.action, "verified_by", id.tests.publicContract,
      "ranged_attack_v6_judge_v1"),
    edge(id.action, "verified_by", id.tests.exactAction,
      "ranged_attack_v6_judge_v1"),
    edge(id.event, "verified_by", id.tests.protectedState,
      "ranged_attack_v6_judge_v1"),
    edge(id.event, "verified_by", id.tests.authority,
      "ranged_attack_v6_judge_v1"),
    edge(id.event, "verified_by", id.tests.replay,
      "ranged_attack_v6_judge_v1"),
    edge(id.currentExecutor, "verified_by", id.tests.historical,
      "ranged_attack_v6_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.tests.relationship,
      "ranged_attack_v6_judge_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "ranged_attack_v6_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "retained_by", id.currentCatalogueRelease,
      "ranged_attack_v6_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "retained_by", id.currentRuntimeRelease,
      "ranged_attack_v6_runtime_ancestry_v1"),
  ];
  const newNodes = [
    node(id.action, "action_variant", "Exact current Ranged Attack v6 action"),
    node(id.event, "state_event", "Ranged Attack v6 resolved atomically"),
    node(id.sourceMaterial, "semantic_projection",
      "Current official attack profile, loadout, effects, and combat material"),
    node(id.geometryMaterial, "semantic_projection",
      "Model bases, line of sight, range, and engagement material"),
    node(id.modelPresence, "state_field", "Model on-field and destroyed state"),
    node(id.piecePresence, "state_field", "Unit on-field and destroyed state"),
    node(id.assaultActivation, "state_field", "Assault phase activation state"),
    node(id.assaultEffects, "state_field", "Assault effects on units"),
    node(id.engagementGeometry, "state_field", "Board engagement geometry evidence"),
    ...tests.map((testId) => node(testId, "judge_test", testId.slice("judge_test:".length))),
    node(id.currentSliceRelease, "slice_release", "Slice 67 Ranged Attack v6 contract"),
    node(id.currentCatalogueRelease, "catalogue_release",
      `Slice 67 retained catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release",
      `Slice 67 retained runtime ${runtimeHash}`),
  ];
  const previousNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const uniqueNodes = newNodes.filter((entry) => !previousNodeIds.has(entry.nodeId));
  const scope = {
    scopeId: OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
    requiredNodeIds: [...new Set([
      ...reads,
      ...writes,
      ...protectedFields,
      id.currentExecutor,
      id.sourceMaterial,
      id.geometryMaterial,
      id.action,
      id.event,
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
        from: id.officialGameplayDataBundle,
        to: id.tests.publicContract,
        relationships: ["projects_to", "derives", "verified_by"],
        maxDepth: 4,
      },
      {
        from: id.geometryMaterial,
        to: id.tests.replay,
        relationships: ["derives", "verified_by"],
        maxDepth: 4,
      },
    ],
    forbiddenPaths: protectedFields.map((to) => ({
      from: id.event,
      to,
      relationships: ["writes"],
      maxDepth: 2,
    })),
    evidenceTestNodeIds: tests,
  };
  return {
    nodes: [...previous.nodes, ...uniqueNodes],
    edges: [...previous.edges, ...relations],
    executorLineages: previous.executorLineages,
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, scope],
  };
}
