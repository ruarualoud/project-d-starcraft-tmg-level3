import { createOfficialCombatTagShieldedV2RelationshipExtensionV1 } from
  "./official-combat-tag-shielded-v2-relationship-contract-v1.mjs";
import { OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1 } from
  "./official-ranged-attack-v6-relationship-contract-v1.mjs";
import {
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_VERSION,
} from "./official-sidearm-pinpoint-ranged-batch-executor-v2.mjs";

export const OFFICIAL_SIDEARM_PINPOINT_V2_RELATIONSHIP_SCOPE_ID =
  "ticket-11-current-sidearm-pinpoint-ranged-batch-v2";

const base = OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1;
const id = Object.freeze({
  executor:
    `executor:${OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID}`
      + `@${OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_VERSION}`,
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
  adapter: "semantic_projection:sidearmPinpointV2.currentToFrozenDataAdapter",
  source: "semantic_projection:sidearmPinpointV2.currentOfficialProfiles",
  loadout: "semantic_projection:sidearmPinpointV2.haywireReplacementLoadout",
  targeting: "semantic_projection:sidearmPinpointV2.pinpointEngagedTarget",
  sequence: "semantic_projection:sidearmPinpointV2.independentBatchSequence",
  action: "action_variant:sidearmPinpoint.exactCurrentBatchV2",
  event: "state_event:sidearm_pinpoint_ranged_batch_resolved_v2",
  tests: Object.freeze({
    publicContract: "judge_test:sidearm-pinpoint-v2-current-public-contract-v1",
    legalSpace: "judge_test:sidearm-pinpoint-v2-20-candidate-legal-space-v1",
    exactAction: "judge_test:sidearm-pinpoint-v2-exact-action-stale-rejection-v1",
    protectedState: "judge_test:sidearm-pinpoint-v2-protected-state-v1",
    authority: "judge_test:sidearm-pinpoint-v2-preview-confirm-apply-v1",
    replay: "judge_test:sidearm-pinpoint-v2-ed25519-replay-hmac-rotation-v1",
    historical: "judge_test:sidearm-pinpoint-v1-runtime-display-freeze-v1",
    relationship: "judge_test:sidearm-pinpoint-v2-relationship-negative-gap-v1",
  }),
});

const READS = Object.freeze([
  id.round, id.phase, id.activeSideKey, id.firstPlayerSideKey,
  id.phaseFirstActorByRound, id.players, id.pieces, id.board,
  id.selectedUpgradeNames, id.currentModels, id.currentSupply,
  id.modelPositions, id.modelPresence, id.piecePresence,
  id.damageMarker, id.statuses, id.combatEffects, id.assaultEffects,
  id.assaultActivation, id.engagementGeometry, id.pendingSequence,
  id.officialGameplayDataBundle, id.officialMissionSetupBinding,
  id.officialRoundSupplyState, id.supplyLossLedger, id.log,
]);
const WRITES = Object.freeze([
  id.activeSideKey, id.pieces, id.currentModels, id.currentSupply,
  id.modelPresence, id.piecePresence, id.damageMarker,
  id.assaultActivation, id.pendingSequence, id.log,
]);
const PROTECTED = Object.freeze([
  id.firstPlayerSideKey, id.scores, id.missionMarkers, id.selectedUpgradeNames,
  id.destroyedModelIds, id.statuses, id.combatEffects, id.assaultEffects,
  id.officialGameplayDataBundle, id.officialMissionSetupBinding,
  id.officialRoundSupplyState, id.supplyLossLedger, id.terminal, id.gameOver,
  id.winner, id.terminalReason,
]);

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-72" };
}

function edge(from, relationship, to, provenance) {
  return {
    scopeId: OFFICIAL_SIDEARM_PINPOINT_V2_RELATIONSHIP_SCOPE_ID,
    from,
    relationship,
    to,
    provenance,
  };
}

export function createOfficialSidearmPinpointV2RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("SIDEARM_PINPOINT_V2_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialCombatTagShieldedV2RelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const tests = Object.values(id.tests);
  const relations = [
    ...READS.map((to) => edge(id.executor, "reads", to,
      "sidearm_pinpoint_v2_state_contract_v1")),
    edge(id.officialGameplayDataBundle, "projects_to", id.adapter,
      "sidearm_pinpoint_v2_explicit_data_adapter_v1"),
    edge(id.officialGameplayDataBundle, "projects_to", id.source,
      "sidearm_pinpoint_v2_current_source_projection_v1"),
    edge(id.selectedUpgradeNames, "projects_to", id.loadout,
      "sidearm_pinpoint_v2_loadout_projection_v1"),
    edge(id.engagementGeometry, "projects_to", id.targeting,
      "sidearm_pinpoint_v2_target_projection_v1"),
    edge(id.pieces, "projects_to", id.targeting,
      "sidearm_pinpoint_v2_target_projection_v1"),
    edge(id.pendingSequence, "projects_to", id.sequence,
      "sidearm_pinpoint_v2_sequence_projection_v1"),
    edge(id.loadout, "derives", id.sequence,
      "sidearm_pinpoint_v2_sequence_derivation_v1"),
    edge(id.adapter, "derives", id.action,
      "sidearm_pinpoint_v2_exact_action_v1"),
    edge(id.source, "derives", id.action,
      "sidearm_pinpoint_v2_exact_action_v1"),
    edge(id.targeting, "derives", id.action,
      "sidearm_pinpoint_v2_exact_action_v1"),
    edge(id.sequence, "derives", id.action,
      "sidearm_pinpoint_v2_exact_action_v1"),
    ...READS.map((from) => edge(from, "invalidates", id.action,
      "sidearm_pinpoint_v2_state_invalidation_v1")),
    edge(id.executor, "exposes", id.action, "sidearm_pinpoint_v2_action_v1"),
    edge(id.action, "derives", id.event, "sidearm_pinpoint_v2_atomic_apply_v1"),
    ...WRITES.map((to) => edge(id.event, "writes", to,
      "sidearm_pinpoint_v2_atomic_apply_v1")),
    ...tests.map((testId, index) => edge(
      index < 3 ? id.action : index < 6 ? id.event : id.executor,
      "verified_by",
      testId,
      "sidearm_pinpoint_v2_judge_v1",
    )),
  ];
  const additions = [
    node(id.pendingSequence, "state_field", "Pending ranged attack sequence"),
    node(id.adapter, "semantic_projection", "Explicit current Sidearm adapter"),
    node(id.source, "semantic_projection", "Current official Goliath profiles"),
    node(id.loadout, "semantic_projection", "Haywire replacement loadout"),
    node(id.targeting, "semantic_projection", "Pinpoint engaged target"),
    node(id.sequence, "semantic_projection", "Independent Sidearm batch sequence"),
    node(id.action, "action_variant", "Exact current Sidearm batch"),
    node(id.event, "state_event", "Sidearm batch resolved"),
    ...tests.map((testId) => node(testId, "judge_test", testId.slice(11))),
  ];
  const previousNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const scope = {
    scopeId: OFFICIAL_SIDEARM_PINPOINT_V2_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID,
    requiredNodeIds: [...new Set([
      id.executor, ...READS, ...WRITES, ...PROTECTED, id.adapter, id.source,
      id.loadout, id.targeting, id.sequence, id.action, id.event, ...tests,
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
        entry.executorId !== "authority.sidearm-pinpoint-ranged-batch-v1"
      )),
      {
        executorId: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:sidearm_pinpoint_ranged_batch_v2",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds.filter((executorId) => (
        executorId !== "authority.sidearm-pinpoint-ranged-batch-v1"
      )),
      OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes.filter((entry) => (
        entry.executorId !== "authority.sidearm-pinpoint-ranged-batch-v1"
      )),
      scope,
    ],
  };
}
