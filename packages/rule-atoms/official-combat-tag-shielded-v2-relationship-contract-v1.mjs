import {
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_VERSION,
} from "./official-combat-tag-shielded-ranged-executor-v2.mjs";
import { createOfficialGoliathScatterV2RelationshipExtensionV1 } from
  "./official-goliath-scatter-v2-relationship-contract-v1.mjs";
import { OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1 } from
  "./official-ranged-attack-v6-relationship-contract-v1.mjs";

export const OFFICIAL_COMBAT_TAG_SHIELDED_V2_RELATIONSHIP_SCOPE_ID =
  "ticket-11-current-combat-tag-shielded-ranged-v2";

const base = OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1;
const id = Object.freeze({
  executor:
    `executor:${OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID}`
      + `@${OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_VERSION}`,
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
  adapter: "semantic_projection:combatTagShieldedV2.currentToFrozenDataAdapter",
  source: "semantic_projection:combatTagShieldedV2.currentOfficialProfilesAndTags",
  targeting: "semantic_projection:combatTagShieldedV2.targetTagAuthorization",
  defense: "semantic_projection:combatTagShieldedV2.shieldDamageLifecycle",
  action: "action_variant:combatTagShielded.exactCurrentRangedV2",
  event: "state_event:combat_tag_shielded_ranged_resolved_v2",
  tests: Object.freeze({
    publicContract: "judge_test:combat-tag-shielded-v2-current-public-contract-v1",
    legalSpace: "judge_test:combat-tag-shielded-v2-five-candidate-legal-space-v1",
    exactAction: "judge_test:combat-tag-shielded-v2-exact-action-stale-rejection-v1",
    protectedState: "judge_test:combat-tag-shielded-v2-protected-state-v1",
    authority: "judge_test:combat-tag-shielded-v2-preview-confirm-apply-v1",
    replay: "judge_test:combat-tag-shielded-v2-ed25519-replay-hmac-rotation-v1",
    historical: "judge_test:combat-tag-shielded-v1-runtime-display-freeze-v1",
    relationship: "judge_test:combat-tag-shielded-v2-relationship-negative-gap-v1",
  }),
});

const READS = Object.freeze([
  id.round, id.phase, id.activeSideKey, id.firstPlayerSideKey,
  id.phaseFirstActorByRound, id.players, id.pieces, id.board,
  id.selectedUpgradeNames, id.currentModels, id.currentSupply,
  id.modelPositions, id.modelPresence, id.piecePresence,
  id.damageMarker, id.statuses, id.combatEffects, id.assaultEffects,
  id.assaultActivation, id.engagementGeometry, id.officialGameplayDataBundle,
  id.officialMissionSetupBinding, id.officialRoundSupplyState,
  id.supplyLossLedger, id.log,
]);
const WRITES = Object.freeze([
  id.activeSideKey, id.pieces, id.currentModels, id.currentSupply,
  id.modelPresence, id.piecePresence, id.damageMarker, id.statuses,
  id.assaultActivation, id.log,
]);
const PROTECTED = Object.freeze([
  id.firstPlayerSideKey, id.scores, id.missionMarkers, id.selectedUpgradeNames,
  id.destroyedModelIds, id.combatEffects, id.assaultEffects,
  id.officialGameplayDataBundle, id.officialMissionSetupBinding,
  id.officialRoundSupplyState, id.supplyLossLedger, id.terminal, id.gameOver,
  id.winner, id.terminalReason,
]);

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-71" };
}

function edge(from, relationship, to, provenance) {
  return {
    scopeId: OFFICIAL_COMBAT_TAG_SHIELDED_V2_RELATIONSHIP_SCOPE_ID,
    from,
    relationship,
    to,
    provenance,
  };
}

export function createOfficialCombatTagShieldedV2RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("COMBAT_TAG_SHIELDED_V2_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialGoliathScatterV2RelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const tests = Object.values(id.tests);
  const relations = [
    ...READS.map((to) => edge(id.executor, "reads", to,
      "combat_tag_shielded_v2_state_contract_v1")),
    edge(id.officialGameplayDataBundle, "projects_to", id.adapter,
      "combat_tag_shielded_v2_explicit_data_adapter_v1"),
    edge(id.officialGameplayDataBundle, "projects_to", id.source,
      "combat_tag_shielded_v2_current_source_projection_v1"),
    edge(id.source, "derives", id.targeting,
      "combat_tag_shielded_v2_target_authorization_v1"),
    edge(id.statuses, "projects_to", id.defense,
      "combat_tag_shielded_v2_defense_projection_v1"),
    edge(id.damageMarker, "projects_to", id.defense,
      "combat_tag_shielded_v2_defense_projection_v1"),
    edge(id.adapter, "derives", id.action,
      "combat_tag_shielded_v2_exact_action_v1"),
    edge(id.targeting, "derives", id.action,
      "combat_tag_shielded_v2_exact_action_v1"),
    edge(id.defense, "derives", id.action,
      "combat_tag_shielded_v2_exact_action_v1"),
    ...READS.map((from) => edge(from, "invalidates", id.action,
      "combat_tag_shielded_v2_state_invalidation_v1")),
    edge(id.executor, "exposes", id.action,
      "combat_tag_shielded_v2_action_v1"),
    edge(id.action, "derives", id.event,
      "combat_tag_shielded_v2_atomic_apply_v1"),
    ...WRITES.map((to) => edge(id.event, "writes", to,
      "combat_tag_shielded_v2_atomic_apply_v1")),
    ...tests.map((testId, index) => edge(
      index < 3 ? id.action : index < 6 ? id.event : id.executor,
      "verified_by",
      testId,
      "combat_tag_shielded_v2_judge_v1",
    )),
  ];
  const additions = [
    node(id.adapter, "semantic_projection", "Explicit current Shielded adapter"),
    node(id.source, "semantic_projection", "Current official profile and tag data"),
    node(id.targeting, "semantic_projection", "Combat-tag target authorization"),
    node(id.defense, "semantic_projection", "Shielded damage lifecycle"),
    node(id.action, "action_variant", "Exact current Shielded ranged action"),
    node(id.event, "state_event", "Shielded ranged attack resolved"),
    ...tests.map((testId) => node(testId, "judge_test", testId.slice(11))),
  ];
  const previousNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const scope = {
    scopeId: OFFICIAL_COMBAT_TAG_SHIELDED_V2_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID,
    requiredNodeIds: [...new Set([
      id.executor, ...READS, ...WRITES, ...PROTECTED, id.adapter, id.source,
      id.targeting, id.defense, id.action, id.event, ...tests,
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
        from: id.statuses,
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
        entry.executorId !== "authority.combat-tag-shielded-ranged-v1"
      )),
      {
        executorId: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:combat_tag_shielded_ranged_v2",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds.filter((executorId) => (
        executorId !== "authority.combat-tag-shielded-ranged-v1"
      )),
      OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes.filter((entry) => (
        entry.executorId !== "authority.combat-tag-shielded-ranged-v1"
      )),
      scope,
    ],
  };
}
