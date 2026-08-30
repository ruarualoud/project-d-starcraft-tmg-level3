import { createOfficialStimpackCurrentV2RelationshipExtensionV1 } from
  "./official-stimpack-current-v2-relationship-contract-v1.mjs";
import {
  OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
  OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION,
} from "./official-marine-charge-executor-v2.mjs";

export const OFFICIAL_MARINE_CHARGE_V2_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-75-marine-charge-v2";

const IDS = Object.freeze({
  sourceLock: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  roundSupply: "state_field:officialRoundSupplyState",
  round: "state_field:round",
  phase: "state_field:phase",
  active: "state_field:activeSideKey",
  initiative: "state_field:phaseFirstActorByRound",
  players: "state_field:players[].passedPhases.assault",
  pieces: "state_field:pieces",
  positions: "state_field:pieces[].models[].position",
  activated: "state_field:pieces[].activatedPhases.assault",
  board: "state_field:board",
  pending: "state_field:pendingAction.marineChargeV2",
  log: "state_field:log",
  scores: "state_field:scores",
  resources: "state_field:cardResources",
  adapter: "semantic_projection:marineChargeV2.currentSourceLockToFrozenGeometryAdapter",
  declaration: "action_variant:marineChargeV2.declareTargetsThenRoll",
  resolution: "action_variant:marineChargeV2.resolveSuccessOrFailure",
  opened: "state_event:marine_charge_v2_declared_and_rolled",
  success: "state_event:marine_charge_succeeded",
  failure: "state_event:marine_charge_failed",
  publicTest: "judge_test:marine-charge-v2-current-public-contract-v1",
  authorityTest: "judge_test:marine-charge-v2-preview-confirm-apply-v1",
  replayTest: "judge_test:marine-charge-v2-ed25519-replay-hmac-rotation-v1",
  relationshipTest: "judge_test:marine-charge-v2-relationship-negative-gap-v1",
  frozenV1Test: "judge_test:marine-charge-v1-byte-freeze-v1",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-75" };
}
function edge(from, relationship, to, provenance) {
  return {
    scopeId: OFFICIAL_MARINE_CHARGE_V2_RELATIONSHIP_SCOPE_ID,
    from,
    relationship,
    to,
    provenance,
  };
}

export function createOfficialMarineChargeV2RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("MARINE_CHARGE_V2_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialStimpackCurrentV2RelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const executor = `executor:${OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID}@${OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION}`;
  const reads = [
    IDS.sourceLock,
    IDS.gameplay,
    IDS.roundSupply,
    IDS.round,
    IDS.phase,
    IDS.active,
    IDS.initiative,
    IDS.players,
    IDS.pieces,
    IDS.positions,
    IDS.activated,
    IDS.board,
    IDS.pending,
  ];
  const tests = [
    IDS.publicTest,
    IDS.authorityTest,
    IDS.replayTest,
    IDS.relationshipTest,
    IDS.frozenV1Test,
  ];
  const relations = [
    ...reads.map((target) => edge(executor, "reads", target, "charge_v2:state_contract")),
    edge(IDS.sourceLock, "projects_to", IDS.adapter, "charge_v2:explicit_source_adapter"),
    edge(IDS.gameplay, "projects_to", IDS.adapter, "charge_v2:official_data_projection"),
    edge(IDS.adapter, "derives", IDS.declaration, "charge_v2:exact_declaration"),
    edge(IDS.adapter, "derives", IDS.resolution, "charge_v2:exact_resolution"),
    ...reads.flatMap((source) => [
      edge(source, "invalidates", IDS.declaration, "charge_v2:stale_declaration"),
      edge(source, "invalidates", IDS.resolution, "charge_v2:stale_resolution"),
    ]),
    edge(executor, "exposes", IDS.declaration, "charge_v2:legal_space"),
    edge(executor, "exposes", IDS.resolution, "charge_v2:legal_space"),
    edge(IDS.declaration, "derives", IDS.opened, "charge_v2:apply"),
    edge(IDS.resolution, "derives", IDS.success, "charge_v2:success_apply"),
    edge(IDS.resolution, "derives", IDS.failure, "charge_v2:failure_apply"),
    edge(IDS.opened, "writes", IDS.pending, "charge_v2:pending_open"),
    edge(IDS.opened, "writes", IDS.log, "charge_v2:declaration_log"),
    edge(IDS.success, "writes", IDS.positions, "charge_v2:movement_apply"),
    edge(IDS.success, "writes", IDS.activated, "charge_v2:activation_end"),
    edge(IDS.success, "writes", IDS.pending, "charge_v2:pending_clear"),
    edge(IDS.success, "writes", IDS.active, "charge_v2:alternating_settlement"),
    edge(IDS.success, "writes", IDS.log, "charge_v2:resolution_log"),
    edge(IDS.failure, "writes", IDS.activated, "charge_v2:activation_end"),
    edge(IDS.failure, "writes", IDS.pending, "charge_v2:pending_clear"),
    edge(IDS.failure, "writes", IDS.active, "charge_v2:alternating_settlement"),
    edge(IDS.failure, "writes", IDS.log, "charge_v2:resolution_log"),
    edge(IDS.declaration, "verified_by", IDS.publicTest, "charge_v2:judge"),
    edge(IDS.resolution, "verified_by", IDS.authorityTest, "charge_v2:judge"),
    edge(executor, "verified_by", IDS.replayTest, "charge_v2:judge"),
    edge(executor, "verified_by", IDS.relationshipTest, "charge_v2:judge"),
    edge(IDS.adapter, "verified_by", IDS.frozenV1Test, "charge_v2:frozen_history"),
  ];
  const additions = [
    node(IDS.sourceLock, "state_field", "Pinned official development-tranche source lock audit"),
    node(IDS.roundSupply, "state_field", "Official round supply state"),
    node(IDS.round, "state_field", "Round"),
    node(IDS.initiative, "state_field", "Resolved first actor by round and phase"),
    node(IDS.players, "state_field", "Assault pass state by player"),
    node(IDS.positions, "state_field", "Current model positions"),
    node(IDS.activated, "state_field", "Assault activation marker"),
    node(IDS.pending, "state_field", "Marine Charge v2 pending action"),
    node(IDS.scores, "state_field", "Scores protected from Charge"),
    node(IDS.resources, "state_field", "Card resources protected from Charge"),
    node(IDS.adapter, "semantic_projection", "Charge v2 current-source explicit adapter"),
    node(IDS.declaration, "action_variant", "Declare every Charge target before chance"),
    node(IDS.resolution, "action_variant", "Resolve Charge success or proven failure"),
    node(IDS.opened, "state_event", "Charge declared and hidden D6 revealed"),
    node(IDS.success, "state_event", "Charge succeeded and models moved"),
    node(IDS.failure, "state_event", "Charge failed and activation ended"),
    ...tests.map((testId) => node(testId, "judge_test", testId.slice(11))),
  ];
  const previousNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const scope = {
    scopeId: OFFICIAL_MARINE_CHARGE_V2_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
    requiredNodeIds: [...new Set([
      executor,
      ...reads,
      IDS.log,
      IDS.scores,
      IDS.resources,
      IDS.adapter,
      IDS.declaration,
      IDS.resolution,
      IDS.opened,
      IDS.success,
      IDS.failure,
      ...tests,
    ])],
    requiredEdges: relations,
    requiredPaths: [
      {
        from: IDS.sourceLock,
        to: IDS.publicTest,
        relationships: ["projects_to", "derives", "verified_by"],
        maxDepth: 4,
      },
      {
        from: IDS.resolution,
        to: IDS.positions,
        relationships: ["derives", "writes"],
        maxDepth: 2,
      },
    ],
    forbiddenPaths: [
      { from: IDS.success, to: IDS.scores, relationships: ["writes"], maxDepth: 2 },
      { from: IDS.failure, to: IDS.resources, relationships: ["writes"], maxDepth: 2 },
    ],
    evidenceTestNodeIds: tests,
  };
  return {
    nodes: [
      ...previous.nodes,
      ...additions.filter((entry) => !previousNodeIds.has(entry.nodeId)),
    ],
    edges: [...previous.edges, ...relations],
    executorLineages: [
      ...previous.executorLineages,
      {
        executorId: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:marine_charge_v2",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, scope],
  };
}
