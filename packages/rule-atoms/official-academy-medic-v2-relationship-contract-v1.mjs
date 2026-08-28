import {
  OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ID,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_VERSION,
} from "./official-academy-medic-ability-executor-v2.mjs";
import {
  OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ID,
  OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_VERSION,
} from "./official-medic-restoration-reaction-executor-v2.mjs";
import {
  OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID,
  OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_VERSION,
} from "./official-optical-flare-ranged-consumer-executor-v2.mjs";
import {
  createOfficialRangedAttackV6RelationshipExtensionV1,
  OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1,
} from "./official-ranged-attack-v6-relationship-contract-v1.mjs";

export const OFFICIAL_ACADEMY_MEDIC_V2_RELATIONSHIP_SCOPE_IDS = Object.freeze({
  academy: "ticket-11-current-academy-medic-ability-v2",
  restoration: "ticket-11-current-medic-restoration-v2",
  opticalRanged: "ticket-11-current-optical-flare-ranged-v2",
});

const base = OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1;
const common = Object.freeze({
  round: base.round,
  phase: base.phase,
  activeSideKey: base.activeSideKey,
  firstPlayerSideKey: base.firstPlayerSideKey,
  players: base.players,
  pieces: base.pieces,
  board: base.board,
  cardResources: "state_field:cardResources",
  statuses: base.statuses,
  effectMarkers: "state_field:board.effectMarkers",
  activeAbilityUseHistory: "state_field:activeAbilityUseHistory",
  academyReactionUsage: "state_field:academyReactionUsage",
  restorationReactionUsage: "state_field:restorationReactionUsage",
  pendingAbility: "state_field:pendingAbility",
  pendingRestorationReaction: "state_field:pendingRestorationReaction",
  movementActivation: "state_field:pieces[].activatedPhases.movement",
  assaultActivation: base.assaultActivation,
  currentModels: base.currentModels,
  currentSupply: base.currentSupply,
  destroyedModelIds: base.destroyedModelIds,
  modelPresence: base.modelPresence,
  piecePresence: base.piecePresence,
  damageMarker: base.damageMarker,
  log: base.log,
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
  selectedUpgradeNames: base.selectedUpgradeNames,
  adapter:
    "semantic_projection:academyMedicV2.latestUnifiedDataAndZeroCostCapabilityAdapter",
  currentSource:
    "semantic_projection:academyMedicV2.currentOfficialMedicAcademyAndTerranData",
});

const SPECS = Object.freeze([
  Object.freeze({
    key: "academy",
    scopeId: OFFICIAL_ACADEMY_MEDIC_V2_RELATIONSHIP_SCOPE_IDS.academy,
    executorId: OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_VERSION,
    atomIds: OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ATOM_IDS,
    action: "action_variant:academyMedicAbility.exactCurrentActionV2",
    event: "state_event:academy_medic_ability_resolved_v2",
    reads: [common.round, common.phase, common.activeSideKey, common.players,
      common.pieces, common.board, common.cardResources, common.statuses,
      common.effectMarkers, common.activeAbilityUseHistory, common.academyReactionUsage,
      common.pendingAbility, common.selectedUpgradeNames,
      common.officialGameplayDataBundle, common.officialMissionSetupBinding,
      common.officialRoundSupplyState, common.supplyLossLedger, common.log],
    writes: [common.pieces, common.cardResources, common.statuses, common.effectMarkers,
      common.activeAbilityUseHistory, common.academyReactionUsage, common.pendingAbility,
      common.movementActivation, common.log],
  }),
  Object.freeze({
    key: "restoration",
    scopeId: OFFICIAL_ACADEMY_MEDIC_V2_RELATIONSHIP_SCOPE_IDS.restoration,
    executorId: OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_VERSION,
    atomIds: OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ATOM_IDS,
    action: "action_variant:medicRestoration.exactCurrentReactionV2",
    event: "state_event:medic_restoration_resolved_v2",
    reads: [common.round, common.phase, common.activeSideKey, common.players,
      common.pieces, common.board, common.cardResources, common.statuses,
      common.effectMarkers, common.activeAbilityUseHistory,
      common.restorationReactionUsage, common.pendingRestorationReaction,
      common.selectedUpgradeNames, common.officialGameplayDataBundle,
      common.officialMissionSetupBinding, common.officialRoundSupplyState,
      common.supplyLossLedger, common.log],
    writes: [common.pieces, common.cardResources, common.statuses, common.effectMarkers,
      common.activeAbilityUseHistory, common.restorationReactionUsage,
      common.pendingRestorationReaction, common.log],
  }),
  Object.freeze({
    key: "opticalRanged",
    scopeId: OFFICIAL_ACADEMY_MEDIC_V2_RELATIONSHIP_SCOPE_IDS.opticalRanged,
    executorId: OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_VERSION,
    atomIds: OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ATOM_IDS,
    action: "action_variant:opticalFlareRanged.exactCurrentActionV2",
    event: "state_event:optical_flare_ranged_resolved_v2",
    reads: [common.round, common.phase, common.activeSideKey, common.players,
      common.pieces, common.board, common.statuses, common.effectMarkers,
      common.selectedUpgradeNames, common.officialGameplayDataBundle,
      common.officialMissionSetupBinding, common.officialRoundSupplyState,
      common.supplyLossLedger, common.log],
    writes: [common.pieces, common.currentModels, common.currentSupply,
      common.destroyedModelIds, common.modelPresence, common.piecePresence,
      common.damageMarker, common.assaultActivation, common.log],
  }),
]);

const RETIRED_EXECUTOR_IDS = new Set([
  "authority.academy-medic-ability-v1",
  "authority.medic-restoration-reaction-v1",
  "authority.optical-flare-ranged-consumer-v1",
]);
const PROTECTED = Object.freeze([
  common.firstPlayerSideKey,
  common.scores,
  common.missionMarkers,
  common.officialGameplayDataBundle,
  common.officialMissionSetupBinding,
  common.officialRoundSupplyState,
  common.supplyLossLedger,
  common.terminal,
  common.gameOver,
  common.winner,
  common.terminalReason,
]);

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-68" };
}

function edge(scopeId, from, relationship, to, provenance) {
  return { scopeId, from, relationship, to, provenance };
}

function tests(spec) {
  return [
    `judge_test:${spec.key}-v2-current-public-contract-v1`,
    `judge_test:${spec.key}-v2-exact-action-and-stale-rejection-v1`,
    `judge_test:${spec.key}-v2-protected-state-v1`,
    `judge_test:${spec.key}-v2-authority-preview-confirm-apply-v1`,
    `judge_test:${spec.key}-v2-ed25519-replay-hmac-rotation-v1`,
    `judge_test:${spec.key}-v1-history-and-rules-display-freeze-v1`,
    `judge_test:${spec.key}-v2-relationship-negative-gap-v1`,
  ];
}

function material(spec) {
  const executor = `executor:${spec.executorId}@${spec.executorVersion}`;
  const evidenceTests = tests(spec);
  const relations = [
    ...spec.reads.map((to) => edge(spec.scopeId, executor, "reads", to,
      `${spec.key}_v2_state_contract_v1`)),
    edge(spec.scopeId, common.officialGameplayDataBundle, "projects_to", common.currentSource,
      `${spec.key}_v2_current_source_projection_v1`),
    edge(spec.scopeId, common.selectedUpgradeNames, "projects_to", common.adapter,
      `${spec.key}_v2_explicit_capability_adapter_v1`),
    edge(spec.scopeId, common.currentSource, "derives", spec.action,
      `${spec.key}_v2_exact_action_derivation_v1`),
    edge(spec.scopeId, common.adapter, "derives", spec.action,
      `${spec.key}_v2_exact_action_derivation_v1`),
    ...spec.reads.map((from) => edge(spec.scopeId, from, "invalidates", spec.action,
      `${spec.key}_v2_state_invalidation_v1`)),
    edge(spec.scopeId, executor, "exposes", spec.action, `${spec.key}_v2_action_v1`),
    edge(spec.scopeId, spec.action, "derives", spec.event, `${spec.key}_v2_apply_v1`),
    ...spec.writes.map((to) => edge(spec.scopeId, spec.event, "writes", to,
      `${spec.key}_v2_apply_v1`)),
    ...evidenceTests.map((testId, index) => edge(
      spec.scopeId,
      index < 2 ? spec.action : index < 5 ? spec.event : executor,
      "verified_by",
      testId,
      `${spec.key}_v2_judge_v1`,
    )),
  ];
  const requiredNodeIds = [...new Set([
    executor,
    spec.action,
    spec.event,
    common.adapter,
    common.currentSource,
    ...spec.reads,
    ...spec.writes,
    ...PROTECTED,
    ...evidenceTests,
  ])];
  return {
    nodes: [
      node(spec.action, "action_variant", `${spec.key} exact current action`),
      node(spec.event, "state_event", `${spec.key} current transition`),
      ...evidenceTests.map((testId) => node(
        testId,
        "judge_test",
        testId.slice("judge_test:".length),
      )),
    ],
    relations,
    lineage: {
      executorId: spec.executorId,
      ruleAtomIds: [...spec.atomIds],
      provenance: `runtime_action_lineage:${spec.key}_v2`,
    },
    scope: {
      scopeId: spec.scopeId,
      executorId: spec.executorId,
      requiredNodeIds,
      requiredEdges: relations,
      requiredPaths: [
        {
          from: common.officialGameplayDataBundle,
          to: evidenceTests[0],
          relationships: ["projects_to", "derives", "verified_by"],
          maxDepth: 4,
        },
        {
          from: common.adapter,
          to: evidenceTests[4],
          relationships: ["derives", "verified_by"],
          maxDepth: 4,
        },
      ],
      forbiddenPaths: PROTECTED.map((to) => ({
        from: spec.event,
        to,
        relationships: ["writes"],
        maxDepth: 2,
      })),
      evidenceTestNodeIds: evidenceTests,
    },
  };
}

export function createOfficialAcademyMedicV2RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("ACADEMY_MEDIC_V2_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialRangedAttackV6RelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const additions = SPECS.map(material);
  const existingNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const sharedNodes = [
    node(common.cardResources, "state_field", "Card resources by side"),
    node(common.effectMarkers, "state_field", "Board effect markers"),
    node(common.activeAbilityUseHistory, "state_field", "Active ability use history"),
    node(common.academyReactionUsage, "state_field", "Academy reaction usage ledger"),
    node(common.restorationReactionUsage, "state_field", "Restoration usage ledger"),
    node(common.pendingAbility, "state_field", "Pending Academy Medic ability"),
    node(common.pendingRestorationReaction, "state_field", "Pending Restoration reaction"),
    node(common.movementActivation, "state_field", "Movement phase activation state"),
    node(common.adapter, "semantic_projection", "Explicit current-to-frozen data adapter"),
    node(common.currentSource, "semantic_projection", "Current official Medic and card data"),
  ];
  const nodes = [...sharedNodes, ...additions.flatMap((entry) => entry.nodes)]
    .filter((entry, index, all) => (
      !existingNodeIds.has(entry.nodeId)
        && all.findIndex((candidate) => candidate.nodeId === entry.nodeId) === index
    ));
  return {
    nodes: [...previous.nodes, ...nodes],
    edges: [...previous.edges, ...additions.flatMap((entry) => entry.relations)],
    executorLineages: [
      ...previous.executorLineages.filter((entry) => (
        !RETIRED_EXECUTOR_IDS.has(entry.executorId)
      )),
      ...additions.map((entry) => entry.lineage),
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds.filter((executorId) => (
        !RETIRED_EXECUTOR_IDS.has(executorId)
      )),
      ...SPECS.map((spec) => spec.executorId),
    ],
    coverageScopes: [
      ...previous.coverageScopes.filter((scope) => (
        !RETIRED_EXECUTOR_IDS.has(scope.executorId)
      )),
      ...additions.map((entry) => entry.scope),
    ],
  };
}
