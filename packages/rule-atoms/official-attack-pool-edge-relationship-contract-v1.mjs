import {
  OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ATOM_IDS,
  OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID,
  OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_VERSION,
} from "./official-attack-pool-edge-executor-v1.mjs";
import { createOfficialTemplateWeaponRelationshipExtensionV1 } from
  "./official-template-weapon-relationship-contract-v1.mjs";

export const OFFICIAL_ATTACK_POOL_EDGE_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-79-attack-pool-edges";
const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  mode: "state_field:rulesProcedureMode",
  pieces: "state_field:pieces",
  pending: "state_field:pendingAction.attackPoolEdge",
  result: "state_field:lastAttackPoolEdgeResolution",
  log: "state_field:log",
  choose: "action_variant:attackPoolEdgeV1.chooseReducedDice",
  resolve: "action_variant:attackPoolEdgeV1.resolveThreePools",
  groups: "derived_value:attackPoolEdgeV1.mixedModifierAndRangeGroups",
  bypass: "derived_value:attackPoolEdgeV1.surgeHitsXAndArmourBypass",
  armour: "derived_value:attackPoolEdgeV1.armourAndTough",
  casualties: "derived_value:attackPoolEdgeV1.visibleAndConcentratedCaps",
  event: "state_event:attack_pool_edge_procedure_resolved",
  sourceTest: "judge_test:attack-pool-edge-v1-source-lock",
  poolTest: "judge_test:attack-pool-edge-v1-three-pools",
  capTest: "judge_test:attack-pool-edge-v1-casualty-caps",
  authorityTest: "judge_test:attack-pool-edge-v1-authority-replay",
  graphTest: "judge_test:attack-pool-edge-v1-relationship-negative-gap",
});
function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-79" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_ATTACK_POOL_EDGE_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}
export function createOfficialAttackPoolEdgeRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("ATTACK_POOL_EDGE_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialTemplateWeaponRelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const executor = `executor:${OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID}`
    + `@${OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.mode, ID.pieces, ID.pending];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target, "attack_pool:state_contract")),
    edge(executor, "exposes", ID.choose, "attack_pool:reduced_dice_choice"),
    edge(ID.choose, "derives", ID.resolve, "attack_pool:instantiate"),
    edge(ID.pending, "derives", ID.groups, "attack_pool:mixed_ranges_modifiers"),
    edge(ID.groups, "derives", ID.bypass, "attack_pool:hit_surge_hits_x"),
    edge(ID.bypass, "derives", ID.armour, "attack_pool:armour_tough"),
    edge(ID.armour, "derives", ID.casualties, "attack_pool:damage_caps"),
    edge(ID.resolve, "derives", ID.event, "attack_pool:apply"),
    edge(ID.event, "writes", ID.result, "attack_pool:result"),
    edge(ID.event, "writes", ID.pending, "attack_pool:pending_clear"),
    edge(ID.event, "writes", ID.log, "attack_pool:log"),
    edge(ID.source, "verified_by", ID.sourceTest, "attack_pool:source_judge"),
    edge(ID.groups, "verified_by", ID.poolTest, "attack_pool:pool_judge"),
    edge(ID.casualties, "verified_by", ID.capTest, "attack_pool:cap_judge"),
    edge(executor, "verified_by", ID.authorityTest, "attack_pool:authority"),
    edge(executor, "verified_by", ID.graphTest, "attack_pool:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.resolve, "attack_pool:stale")),
  ];
  const additions = [
    node(ID.pending, "state_field", "Attack-pool edge pending"),
    node(ID.result, "state_field", "Last attack-pool edge resolution"),
    node(ID.choose, "action_variant", "Controller chooses reduced dice"),
    node(ID.resolve, "action_variant", "Resolve Attack, Armour, Damage pools"),
    node(ID.groups, "derived_value", "Mixed modifier and range-band roll groups"),
    node(ID.bypass, "derived_value", "Surge mismatch, Hits X and Armour bypass"),
    node(ID.armour, "derived_value", "Armour and Tough conversion"),
    node(ID.casualties, "derived_value", "Visible and Concentrated Fire caps"),
    node(ID.event, "state_event", "Attack-pool edge procedure resolved"),
    node(ID.sourceTest, "judge_test", "Attack-pool source-lock Judge"),
    node(ID.poolTest, "judge_test", "Attack-pool three-pool Judge"),
    node(ID.capTest, "judge_test", "Attack-pool casualty-cap Judge"),
    node(ID.authorityTest, "judge_test", "Attack-pool Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Attack-pool relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:attack_pool_edge_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds, OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_ATTACK_POOL_EDGE_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.result, ID.log, ID.choose,
        ID.resolve, ID.groups, ID.bypass, ID.armour, ID.casualties, ID.event,
        ID.sourceTest, ID.poolTest, ID.capTest, ID.authorityTest, ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [{ from: ID.groups, to: ID.casualties,
        relationships: ["derives"], maxDepth: 3 }],
      forbiddenPaths: [],
      evidenceTestNodeIds: [ID.sourceTest, ID.poolTest, ID.capTest,
        ID.authorityTest, ID.graphTest],
    }],
  };
}
