import {
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_VERSION,
} from "./official-goliath-scatter-ranged-batch-executor-v2.mjs";
import { createOfficialLifeSupportV2RelationshipExtensionV1 } from
  "./official-life-support-v2-relationship-contract-v1.mjs";
import { OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1 } from
  "./official-ranged-attack-v6-relationship-contract-v1.mjs";

export const OFFICIAL_GOLIATH_SCATTER_V2_RELATIONSHIP_SCOPE_ID =
  "ticket-11-current-goliath-scatter-ranged-batch-v2";

const base = OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1;
const id = Object.freeze({
  executor:
    `executor:${OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID}`
      + `@${OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_VERSION}`,
  round: base.round,
  phase: base.phase,
  activeSideKey: base.activeSideKey,
  firstPlayerSideKey: base.firstPlayerSideKey,
  phaseFirstActorByRound: base.phaseFirstActorByRound,
  players: base.players,
  pieces: base.pieces,
  board: base.board,
  selectedUpgradeNames: base.selectedUpgradeNames,
  currentModels: base.currentModels,
  currentSupply: base.currentSupply,
  destroyedModelIds: base.destroyedModelIds,
  modelPositions: base.modelPositions,
  modelPresence: base.modelPresence,
  piecePresence: base.piecePresence,
  damageMarker: base.damageMarker,
  statuses: base.statuses,
  combatEffects: base.combatEffects,
  assaultEffects: base.assaultEffects,
  assaultActivation: base.assaultActivation,
  engagementGeometry: base.engagementGeometry,
  terrain: "state_field:board.terrain",
  effectMarkers: "state_field:board.effectMarkers",
  pendingSequence: "state_field:pendingRangedAttackSequence",
  officialGameplayDataBundle: base.officialGameplayDataBundle,
  officialMissionSetupBinding: base.officialMissionSetupBinding,
  officialRoundSupplyState: base.officialRoundSupplyState,
  supplyLossLedger: base.supplyLossLedger,
  scores: base.scores,
  missionMarkers: base.missionMarkers,
  terminal: base.terminal,
  gameOver: base.gameOver,
  winner: base.winner,
  terminalReason: base.terminalReason,
  log: base.log,
  adapter: "semantic_projection:goliathScatterV2.currentToFrozenDataAdapter",
  source: "semantic_projection:goliathScatterV2.currentOfficialGoliathMarineProfiles",
  loadout: "semantic_projection:goliathScatterV2.scatterReplacementWeaponLoadout",
  geometry: "semantic_projection:goliathScatterV2.baseGapFullCoverLineOfSight",
  plan: "semantic_projection:goliathScatterV2.indirectLockedAttackPlan",
  sequence: "semantic_projection:goliathScatterV2.exactSequentialBatch",
  action: "action_variant:goliathScatter.exactCurrentBatchV2",
  event: "state_event:goliath_scatter_ranged_batch_resolved_v2",
  tests: Object.freeze({
    publicContract: "judge_test:goliath-scatter-v2-current-public-contract-v1",
    legalSpace: "judge_test:goliath-scatter-v2-32-candidate-legal-space-v1",
    exactAction: "judge_test:goliath-scatter-v2-exact-action-stale-rejection-v1",
    protectedState: "judge_test:goliath-scatter-v2-protected-state-v1",
    authority: "judge_test:goliath-scatter-v2-preview-confirm-apply-v1",
    replay: "judge_test:goliath-scatter-v2-ed25519-replay-hmac-rotation-v1",
    historical: "judge_test:goliath-scatter-v1-runtime-display-freeze-v1",
    relationship: "judge_test:goliath-scatter-v2-relationship-negative-gap-v1",
  }),
});

const READS = Object.freeze([
  id.round, id.phase, id.activeSideKey, id.firstPlayerSideKey,
  id.phaseFirstActorByRound, id.players, id.pieces, id.board,
  id.selectedUpgradeNames, id.currentModels, id.currentSupply,
  id.modelPositions, id.modelPresence, id.piecePresence,
  id.damageMarker, id.statuses, id.combatEffects, id.assaultEffects,
  id.assaultActivation, id.engagementGeometry, id.terrain, id.effectMarkers,
  id.pendingSequence, id.officialGameplayDataBundle,
  id.officialMissionSetupBinding, id.officialRoundSupplyState,
  id.supplyLossLedger, id.log,
]);
const WRITES = Object.freeze([
  id.activeSideKey, id.pieces, id.currentModels, id.currentSupply,
  id.modelPresence, id.piecePresence, id.damageMarker,
  id.assaultActivation, id.pendingSequence, id.log,
]);
const PROTECTED = Object.freeze([
  id.firstPlayerSideKey, id.scores, id.missionMarkers, id.selectedUpgradeNames,
  id.destroyedModelIds,
  id.statuses, id.combatEffects, id.assaultEffects, id.effectMarkers,
  id.officialGameplayDataBundle, id.officialMissionSetupBinding,
  id.officialRoundSupplyState, id.supplyLossLedger, id.terminal, id.gameOver,
  id.winner, id.terminalReason,
]);

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-70" };
}

function edge(from, relationship, to, provenance) {
  return {
    scopeId: OFFICIAL_GOLIATH_SCATTER_V2_RELATIONSHIP_SCOPE_ID,
    from,
    relationship,
    to,
    provenance,
  };
}

export function createOfficialGoliathScatterV2RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("GOLIATH_SCATTER_V2_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialLifeSupportV2RelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const tests = Object.values(id.tests);
  const relations = [
    ...READS.map((to) => edge(id.executor, "reads", to,
      "goliath_scatter_v2_state_contract_v1")),
    edge(id.officialGameplayDataBundle, "projects_to", id.source,
      "goliath_scatter_v2_current_source_projection_v1"),
    edge(id.officialGameplayDataBundle, "projects_to", id.adapter,
      "goliath_scatter_v2_explicit_data_adapter_v1"),
    edge(id.selectedUpgradeNames, "projects_to", id.loadout,
      "goliath_scatter_v2_loadout_projection_v1"),
    edge(id.pieces, "projects_to", id.geometry,
      "goliath_scatter_v2_geometry_projection_v1"),
    edge(id.terrain, "projects_to", id.geometry,
      "goliath_scatter_v2_geometry_projection_v1"),
    edge(id.source, "derives", id.plan,
      "goliath_scatter_v2_attack_plan_v1"),
    edge(id.geometry, "derives", id.plan,
      "goliath_scatter_v2_attack_plan_v1"),
    edge(id.loadout, "derives", id.sequence,
      "goliath_scatter_v2_sequence_derivation_v1"),
    edge(id.pendingSequence, "projects_to", id.sequence,
      "goliath_scatter_v2_sequence_derivation_v1"),
    edge(id.adapter, "derives", id.action,
      "goliath_scatter_v2_exact_action_v1"),
    edge(id.plan, "derives", id.action,
      "goliath_scatter_v2_exact_action_v1"),
    edge(id.sequence, "derives", id.action,
      "goliath_scatter_v2_exact_action_v1"),
    ...READS.map((from) => edge(from, "invalidates", id.action,
      "goliath_scatter_v2_state_invalidation_v1")),
    edge(id.executor, "exposes", id.action, "goliath_scatter_v2_action_v1"),
    edge(id.action, "derives", id.event, "goliath_scatter_v2_atomic_apply_v1"),
    ...WRITES.map((to) => edge(id.event, "writes", to,
      "goliath_scatter_v2_atomic_apply_v1")),
    ...tests.map((testId, index) => edge(
      index < 3 ? id.action : index < 6 ? id.event : id.executor,
      "verified_by",
      testId,
      "goliath_scatter_v2_judge_v1",
    )),
  ];
  const additions = [
    node(id.terrain, "state_field", "Axis-aligned full-cover terrain"),
    node(id.effectMarkers, "state_field", "Board effect markers"),
    node(id.pendingSequence, "state_field", "Pending ranged attack sequence"),
    node(id.adapter, "semantic_projection", "Explicit current Goliath adapter"),
    node(id.source, "semantic_projection", "Current Goliath and Marine source data"),
    node(id.loadout, "semantic_projection", "Scatter replacement loadout"),
    node(id.geometry, "semantic_projection", "Full-cover line-of-sight geometry"),
    node(id.plan, "semantic_projection", "Indirect Fire and Locked In plan"),
    node(id.sequence, "semantic_projection", "Sequential batch authorization"),
    node(id.action, "action_variant", "Exact current Goliath Scatter batch"),
    node(id.event, "state_event", "Goliath Scatter batch resolved"),
    ...tests.map((testId) => node(testId, "judge_test", testId.slice(11))),
  ];
  const previousNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const scope = {
    scopeId: OFFICIAL_GOLIATH_SCATTER_V2_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID,
    requiredNodeIds: [...new Set([
      id.executor, ...READS, ...WRITES, ...PROTECTED, id.adapter, id.source,
      id.loadout, id.geometry, id.plan, id.sequence, id.action, id.event, ...tests,
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
        from: id.pendingSequence,
        to: id.tests.replay,
        relationships: ["projects_to", "derives", "verified_by"],
        maxDepth: 5,
      },
    ],
    forbiddenPaths: PROTECTED.map((to) => ({
      from: id.event,
      to,
      relationships: ["writes"],
      maxDepth: 2,
    })),
    evidenceTestNodeIds: tests,
  };
  return {
    nodes: [
      ...previous.nodes,
      ...additions.filter((entry) => !previousNodeIds.has(entry.nodeId)),
    ],
    edges: [...previous.edges, ...relations],
    executorLineages: [
      ...previous.executorLineages.filter((entry) => (
        entry.executorId !== "authority.goliath-scatter-ranged-batch-v1"
      )),
      {
        executorId: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:goliath_scatter_ranged_batch_v2",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds.filter((executorId) => (
        executorId !== "authority.goliath-scatter-ranged-batch-v1"
      )),
      OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes.filter((entry) => (
        entry.executorId !== "authority.goliath-scatter-ranged-batch-v1"
      )),
      scope,
    ],
  };
}
