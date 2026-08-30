import {
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID,
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_VERSION,
} from "./official-close-combat-lifecycle-executor-v1.mjs";
import { createOfficialAttackPoolEdgeRelationshipExtensionV1 } from
  "./official-attack-pool-edge-relationship-contract-v1.mjs";

export const OFFICIAL_CLOSE_COMBAT_LIFECYCLE_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-80-close-combat-lifecycle";
const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  mode: "state_field:rulesProcedureMode",
  pieces: "state_field:pieces",
  board: "state_field:board.engagementGeometry",
  pending: "state_field:pendingAction.closeCombatLifecycle",
  result: "state_field:lastCloseCombatLifecycleResolution",
  log: "state_field:log",
  choose: "action_variant:closeCombatLifecycleV1.chooseEngagedTarget",
  resolve: "action_variant:closeCombatLifecycleV1.resolve",
  ranks: "derived_value:closeCombatLifecycleV1.fightingAndSupportingRanksByTarget",
  pools: "derived_value:closeCombatLifecycleV1.surgeArmourAndConditionalEvade",
  status: "derived_value:closeCombatLifecycleV1.postCombatEngagementAndPass",
  marker: "derived_value:closeCombatLifecycleV1.activationMarkerRemoval",
  reaction: "derived_value:closeCombatLifecycleV1.freedReactionException",
  event: "state_event:close_combat_lifecycle_resolved",
  sourceTest: "judge_test:close-combat-lifecycle-v1-source-lock",
  targetTest: "judge_test:close-combat-lifecycle-v1-multi-target-ranks",
  lifecycleTest: "judge_test:close-combat-lifecycle-v1-freed-pass-reaction",
  authorityTest: "judge_test:close-combat-lifecycle-v1-authority-replay",
  graphTest: "judge_test:close-combat-lifecycle-v1-relationship-negative-gap",
});
function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-80" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}
export function createOfficialCloseCombatLifecycleRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("CLOSE_COMBAT_LIFECYCLE_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialAttackPoolEdgeRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID}`
    + `@${OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.mode, ID.pieces, ID.board, ID.pending];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target,
      "close_combat_lifecycle:state_contract")),
    edge(executor, "exposes", ID.choose, "close_combat_lifecycle:target_choice"),
    edge(ID.choose, "derives", ID.resolve, "close_combat_lifecycle:instantiate"),
    edge(ID.board, "derives", ID.ranks, "close_combat_lifecycle:engagement_and_ranks"),
    edge(ID.ranks, "derives", ID.pools, "close_combat_lifecycle:eligible_attackers"),
    edge(ID.pools, "derives", ID.status, "close_combat_lifecycle:casualty_regraph"),
    edge(ID.status, "derives", ID.marker, "close_combat_lifecycle:activation_complete"),
    edge(ID.status, "derives", ID.reaction, "close_combat_lifecycle:freed_exception"),
    edge(ID.resolve, "derives", ID.event, "close_combat_lifecycle:apply"),
    edge(ID.event, "writes", ID.result, "close_combat_lifecycle:result"),
    edge(ID.event, "writes", ID.pieces, "close_combat_lifecycle:piece_state"),
    edge(ID.event, "writes", ID.pending, "close_combat_lifecycle:pending_clear"),
    edge(ID.event, "writes", ID.log, "close_combat_lifecycle:log"),
    edge(ID.source, "verified_by", ID.sourceTest, "close_combat_lifecycle:source_judge"),
    edge(ID.ranks, "verified_by", ID.targetTest, "close_combat_lifecycle:target_judge"),
    edge(ID.status, "verified_by", ID.lifecycleTest, "close_combat_lifecycle:lifecycle_judge"),
    edge(executor, "verified_by", ID.authorityTest, "close_combat_lifecycle:authority"),
    edge(executor, "verified_by", ID.graphTest, "close_combat_lifecycle:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.resolve,
      "close_combat_lifecycle:stale")),
  ];
  const additions = [
    node(ID.pending, "state_field", "Close-combat lifecycle pending"),
    node(ID.result, "state_field", "Last close-combat lifecycle resolution"),
    node(ID.choose, "action_variant", "Choose one eligible engaged enemy Unit"),
    node(ID.resolve, "action_variant", "Resolve close-combat lifecycle"),
    node(ID.ranks, "derived_value", "Per-target Fighting and Supporting Ranks"),
    node(ID.pools, "derived_value", "Surge and explicitly granted close-combat Evade"),
    node(ID.status, "derived_value", "Post-combat Unengaged and effective Pass state"),
    node(ID.marker, "derived_value", "Combat Activation Marker removal"),
    node(ID.reaction, "derived_value", "Freed Unit Reaction exception"),
    node(ID.event, "state_event", "Close-combat lifecycle resolved"),
    node(ID.sourceTest, "judge_test", "Close-combat lifecycle source-lock Judge"),
    node(ID.targetTest, "judge_test", "Close-combat target and rank Judge"),
    node(ID.lifecycleTest, "judge_test", "Freed Unit lifecycle Judge"),
    node(ID.authorityTest, "judge_test", "Close-combat Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Close-combat relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:close_combat_lifecycle_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.result, ID.log, ID.choose,
        ID.resolve, ID.ranks, ID.pools, ID.status, ID.marker, ID.reaction, ID.event,
        ID.sourceTest, ID.targetTest, ID.lifecycleTest, ID.authorityTest, ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [{ from: ID.ranks, to: ID.reaction,
        relationships: ["derives"], maxDepth: 4 }],
      forbiddenPaths: [],
      evidenceTestNodeIds: [ID.sourceTest, ID.targetTest, ID.lifecycleTest,
        ID.authorityTest, ID.graphTest],
    }],
  };
}
