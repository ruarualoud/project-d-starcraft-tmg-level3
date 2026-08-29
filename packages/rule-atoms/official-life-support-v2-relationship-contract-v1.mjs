import {
  OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
  OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_VERSION,
} from "./official-medic-life-support-reaction-executor-v2.mjs";
import { createOfficialAcademyMedicV2RelationshipExtensionV1 } from
  "./official-academy-medic-v2-relationship-contract-v1.mjs";
import { OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1 } from
  "./official-ranged-attack-v6-relationship-contract-v1.mjs";

export const OFFICIAL_LIFE_SUPPORT_V2_RELATIONSHIP_SCOPE_ID =
  "ticket-11-current-medic-life-support-v2";

const base = OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1;
const id = Object.freeze({
  executor:
    `executor:${OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_VERSION}`,
  round: base.round,
  phase: base.phase,
  activeSideKey: base.activeSideKey,
  firstPlayerSideKey: base.firstPlayerSideKey,
  players: base.players,
  pieces: base.pieces,
  board: base.board,
  cardResources: "state_field:cardResources",
  selectedUpgradeNames: base.selectedUpgradeNames,
  currentModels: base.currentModels,
  currentSupply: base.currentSupply,
  modelPositions: base.modelPositions,
  modelPresence: base.modelPresence,
  piecePresence: base.piecePresence,
  damageMarker: base.damageMarker,
  statuses: base.statuses,
  assaultActivation: base.assaultActivation,
  pendingReaction: "state_field:pendingLifeSupportReaction",
  namedUsage: "state_field:lifeSupportReactionUsage",
  activationUsage: "state_field:reactionActivationUsage",
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
  adapter: "semantic_projection:lifeSupportV2.currentToFrozenDataAndLoadoutAdapter",
  source: "semantic_projection:lifeSupportV2.currentOfficialMedicAbilityMaterial",
  geometry: "semantic_projection:lifeSupportV2.withinFourModelGeometry",
  damagePlan: "semantic_projection:lifeSupportV2.totalDamageBeforeAllocationPlan",
  action: "action_variant:medicLifeSupport.exactCurrentReactionV2",
  event: "state_event:medic_life_support_resolved_v2",
  tests: Object.freeze({
    publicContract: "judge_test:life-support-v2-current-public-contract-v1",
    stabilizer: "judge_test:life-support-v2-stabilizer-passive-contract-v1",
    exactAction: "judge_test:life-support-v2-exact-action-and-stale-rejection-v1",
    protectedState: "judge_test:life-support-v2-protected-state-v1",
    authority: "judge_test:life-support-v2-preview-confirm-apply-v1",
    replay: "judge_test:life-support-v2-ed25519-replay-hmac-rotation-v1",
    historical: "judge_test:life-support-v1-runtime-and-display-freeze-v1",
    relationship: "judge_test:life-support-v2-relationship-negative-gap-v1",
  }),
});

const READS = Object.freeze([
  id.round,
  id.phase,
  id.activeSideKey,
  id.players,
  id.pieces,
  id.board,
  id.cardResources,
  id.selectedUpgradeNames,
  id.currentModels,
  id.currentSupply,
  id.modelPositions,
  id.modelPresence,
  id.piecePresence,
  id.damageMarker,
  id.statuses,
  id.pendingReaction,
  id.namedUsage,
  id.activationUsage,
  id.officialGameplayDataBundle,
  id.officialMissionSetupBinding,
  id.officialRoundSupplyState,
  id.supplyLossLedger,
  id.log,
]);
const WRITES = Object.freeze([
  id.activeSideKey,
  id.pieces,
  id.cardResources,
  id.currentModels,
  id.currentSupply,
  id.modelPresence,
  id.piecePresence,
  id.damageMarker,
  id.assaultActivation,
  id.pendingReaction,
  id.namedUsage,
  id.activationUsage,
  id.log,
]);
const PROTECTED = Object.freeze([
  id.firstPlayerSideKey,
  id.scores,
  id.missionMarkers,
  id.statuses,
  id.officialGameplayDataBundle,
  id.officialMissionSetupBinding,
  id.officialRoundSupplyState,
  id.supplyLossLedger,
  id.terminal,
  id.gameOver,
  id.winner,
  id.terminalReason,
]);

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-69" };
}

function edge(from, relationship, to, provenance) {
  return {
    scopeId: OFFICIAL_LIFE_SUPPORT_V2_RELATIONSHIP_SCOPE_ID,
    from,
    relationship,
    to,
    provenance,
  };
}

export function createOfficialLifeSupportV2RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("LIFE_SUPPORT_V2_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialAcademyMedicV2RelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const tests = Object.values(id.tests);
  const relations = [
    ...READS.map((to) => edge(id.executor, "reads", to,
      "life_support_v2_state_contract_v1")),
    edge(id.officialGameplayDataBundle, "projects_to", id.source,
      "life_support_v2_current_source_projection_v1"),
    edge(id.selectedUpgradeNames, "projects_to", id.adapter,
      "life_support_v2_explicit_loadout_projection_v1"),
    edge(id.pieces, "projects_to", id.geometry,
      "life_support_v2_geometry_projection_v1"),
    edge(id.board, "projects_to", id.geometry,
      "life_support_v2_geometry_projection_v1"),
    edge(id.pendingReaction, "projects_to", id.damagePlan,
      "life_support_v2_damage_plan_projection_v1"),
    edge(id.source, "derives", id.action,
      "life_support_v2_exact_action_derivation_v1"),
    edge(id.adapter, "derives", id.action,
      "life_support_v2_exact_action_derivation_v1"),
    edge(id.geometry, "derives", id.action,
      "life_support_v2_exact_action_derivation_v1"),
    edge(id.damagePlan, "derives", id.action,
      "life_support_v2_exact_action_derivation_v1"),
    ...READS.map((from) => edge(from, "invalidates", id.action,
      "life_support_v2_state_invalidation_v1")),
    edge(id.executor, "exposes", id.action, "life_support_v2_exact_action_v1"),
    edge(id.action, "derives", id.event, "life_support_v2_atomic_apply_v1"),
    ...WRITES.map((to) => edge(id.event, "writes", to,
      "life_support_v2_atomic_apply_v1")),
    edge(id.action, "verified_by", id.tests.publicContract,
      "life_support_v2_judge_v1"),
    edge(id.action, "verified_by", id.tests.stabilizer,
      "life_support_v2_judge_v1"),
    edge(id.action, "verified_by", id.tests.exactAction,
      "life_support_v2_judge_v1"),
    edge(id.event, "verified_by", id.tests.protectedState,
      "life_support_v2_judge_v1"),
    edge(id.event, "verified_by", id.tests.authority,
      "life_support_v2_judge_v1"),
    edge(id.event, "verified_by", id.tests.replay,
      "life_support_v2_judge_v1"),
    edge(id.executor, "verified_by", id.tests.historical,
      "life_support_v2_judge_v1"),
    edge(id.executor, "verified_by", id.tests.relationship,
      "life_support_v2_judge_v1"),
  ];
  const newNodes = [
    node(id.pendingReaction, "state_field", "Pending Life Support reaction"),
    node(id.namedUsage, "state_field", "Life Support named round usage"),
    node(id.activationUsage, "state_field", "Reaction activation usage"),
    node(id.adapter, "semantic_projection", "Explicit current Life Support adapter"),
    node(id.source, "semantic_projection", "Current official Life Support material"),
    node(id.geometry, "semantic_projection", "Within-four model geometry"),
    node(id.damagePlan, "semantic_projection", "Total Damage reaction plan"),
    node(id.action, "action_variant", "Exact current Life Support reaction"),
    node(id.event, "state_event", "Current Life Support reaction resolved"),
    ...tests.map((testId) => node(testId, "judge_test", testId.slice(11))),
  ];
  const previousNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const uniqueNodes = newNodes.filter((entry) => !previousNodeIds.has(entry.nodeId));
  const scope = {
    scopeId: OFFICIAL_LIFE_SUPPORT_V2_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
    requiredNodeIds: [...new Set([
      id.executor,
      ...READS,
      ...WRITES,
      ...PROTECTED,
      id.adapter,
      id.source,
      id.geometry,
      id.damagePlan,
      id.action,
      id.event,
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
        from: id.pendingReaction,
        to: id.tests.replay,
        relationships: ["projects_to", "derives", "verified_by"],
        maxDepth: 4,
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
    nodes: [...previous.nodes, ...uniqueNodes],
    edges: [...previous.edges, ...relations],
    executorLineages: [
      ...previous.executorLineages.filter((entry) => (
        entry.executorId !== "authority.medic-life-support-reaction-v1"
      )),
      {
        executorId: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:medic_life_support_v2",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds.filter((executorId) => (
        executorId !== "authority.medic-life-support-reaction-v1"
      )),
      OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes.filter((entry) => (
        entry.executorId !== "authority.medic-life-support-reaction-v1"
      )),
      scope,
    ],
  };
}
