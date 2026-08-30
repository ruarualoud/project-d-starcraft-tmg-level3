import { createOfficialMarineChargeV2RelationshipExtensionV1 } from
  "./official-marine-charge-v2-relationship-contract-v1.mjs";
import {
  OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ATOM_IDS,
  OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
  OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION,
} from "./official-goliath-charge-executor-v1.mjs";
import {
  OFFICIAL_IMPACT_EXECUTOR_ATOM_IDS,
  OFFICIAL_IMPACT_EXECUTOR_ID,
  OFFICIAL_IMPACT_EXECUTOR_VERSION,
} from "./official-impact-executor-v1.mjs";

export const OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-76-goliath-charge-consumer";
export const OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-76-impact-after-charge";

const IDS = Object.freeze({
  sourceLock: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  impactProfile: "state_field:officialImpactProfile",
  roundSupply: "state_field:officialRoundSupplyState",
  round: "state_field:round",
  phase: "state_field:phase",
  active: "state_field:activeSideKey",
  initiative: "state_field:phaseFirstActorByRound",
  players: "state_field:players[].passedPhases.assault",
  pieces: "state_field:pieces",
  positions: "state_field:pieces[].models[].position",
  damage: "state_field:pieces[].damageMarker",
  activated: "state_field:pieces[].activatedPhases.assault",
  board: "state_field:board",
  chargePending: "state_field:pendingAction.goliathChargeV1",
  impactPending: "state_field:pendingAction.impactV1",
  log: "state_field:log",
  chargeDeclaration: "action_variant:goliathChargeV1.declareTargetsThenRoll",
  chargeResolution: "action_variant:goliathChargeV1.resolveSuccessOrFailure",
  impactAllocation: "action_variant:impactV1.allocateAndResolvePerTarget",
  chargeOpened: "state_event:goliath_charge_declared_and_rolled",
  chargeSuccess: "state_event:goliath_charge_succeeded",
  chargeFailure: "state_event:goliath_charge_failed",
  impactTriggered: "state_event:impact_triggered_after_successful_charge",
  impactResolved: "state_event:impact_resolved",
  sourceTest: "judge_test:impact-v1-pinned-official-goliath-profile-v1",
  chargeTest: "judge_test:goliath-charge-v1-reachable-impact-trigger-v1",
  impactTest: "judge_test:impact-v1-single-and-multiple-allocation-v1",
  authorityTest: "judge_test:impact-v1-authority-three-stage-replay-v1",
  graphTest: "judge_test:impact-v1-relationship-negative-gap-v1",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-76" };
}
function edge(scopeId, from, relationship, to, provenance) {
  return { scopeId, from, relationship, to, provenance };
}

export function createOfficialImpactAfterChargeRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("IMPACT_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialMarineChargeV2RelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const chargeExecutor =
    `executor:${OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID}@${OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION}`;
  const impactExecutor =
    `executor:${OFFICIAL_IMPACT_EXECUTOR_ID}@${OFFICIAL_IMPACT_EXECUTOR_VERSION}`;
  const chargeReads = [
    IDS.sourceLock, IDS.gameplay, IDS.impactProfile, IDS.roundSupply, IDS.round,
    IDS.phase, IDS.active, IDS.initiative, IDS.players, IDS.pieces, IDS.positions,
    IDS.activated, IDS.board, IDS.chargePending,
  ];
  const impactReads = [
    IDS.sourceLock, IDS.gameplay, IDS.impactProfile, IDS.round, IDS.phase,
    IDS.active, IDS.pieces, IDS.positions, IDS.damage, IDS.activated, IDS.impactPending,
  ];
  const chargeEdges = [
    ...chargeReads.map((target) => edge(
      OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID,
      chargeExecutor,
      "reads",
      target,
      "goliath_charge:state_contract",
    )),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.impactProfile, "derives", IDS.chargeDeclaration, "goliath_charge:official_profile"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, chargeExecutor, "exposes", IDS.chargeDeclaration, "goliath_charge:legal_space"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, chargeExecutor, "exposes", IDS.chargeResolution, "goliath_charge:legal_space"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeDeclaration, "derives", IDS.chargeOpened, "goliath_charge:apply"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeResolution, "derives", IDS.chargeSuccess, "goliath_charge:success"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeResolution, "derives", IDS.chargeFailure, "goliath_charge:failure"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeOpened, "writes", IDS.chargePending, "goliath_charge:pending_open"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeSuccess, "writes", IDS.positions, "goliath_charge:movement"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeSuccess, "derives", IDS.impactTriggered, "goliath_charge:mandatory_impact"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeFailure, "writes", IDS.activated, "goliath_charge:settlement"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeFailure, "writes", IDS.active, "goliath_charge:alternation"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeOpened, "writes", IDS.log, "goliath_charge:log"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeSuccess, "writes", IDS.log, "goliath_charge:log"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeFailure, "writes", IDS.log, "goliath_charge:log"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, IDS.chargeDeclaration, "verified_by", IDS.chargeTest, "goliath_charge:judge"),
    edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, chargeExecutor, "verified_by", IDS.authorityTest, "goliath_charge:authority"),
    ...chargeReads.flatMap((source) => [
      edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, source, "invalidates", IDS.chargeDeclaration, "goliath_charge:stale"),
      edge(OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID, source, "invalidates", IDS.chargeResolution, "goliath_charge:stale"),
    ]),
  ];
  const impactEdges = [
    ...impactReads.map((target) => edge(
      OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID,
      impactExecutor,
      "reads",
      target,
      "impact:state_contract",
    )),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, IDS.chargeSuccess, "derives", IDS.impactTriggered, "impact:trigger"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, IDS.impactTriggered, "writes", IDS.impactPending, "impact:pending_open"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, IDS.impactTriggered, "derives", IDS.impactAllocation, "impact:allocation_domain"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, impactExecutor, "exposes", IDS.impactAllocation, "impact:legal_space"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, IDS.impactAllocation, "derives", IDS.impactResolved, "impact:per_target_rolls"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, IDS.impactResolved, "writes", IDS.damage, "impact:damage_one"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, IDS.impactResolved, "writes", IDS.impactPending, "impact:pending_clear"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, IDS.impactResolved, "writes", IDS.active, "impact:alternating_settlement"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, IDS.impactResolved, "writes", IDS.log, "impact:log"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, IDS.impactProfile, "verified_by", IDS.sourceTest, "impact:source_judge"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, IDS.impactAllocation, "verified_by", IDS.impactTest, "impact:judge"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, impactExecutor, "verified_by", IDS.authorityTest, "impact:authority"),
    edge(OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID, impactExecutor, "verified_by", IDS.graphTest, "impact:relationship"),
    ...impactReads.map((source) => edge(
      OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID,
      source,
      "invalidates",
      IDS.impactAllocation,
      "impact:stale",
    )),
  ];
  const additions = [
    node(IDS.impactProfile, "state_field", "Pinned official Goliath Impact profile"),
    node(IDS.damage, "state_field", "Unit damage marker"),
    node(IDS.chargePending, "state_field", "Goliath Charge pending action"),
    node(IDS.impactPending, "state_field", "Mandatory Impact pending action"),
    node(IDS.chargeDeclaration, "action_variant", "Declare Goliath Charge targets before chance"),
    node(IDS.chargeResolution, "action_variant", "Resolve Goliath Charge success or failure"),
    node(IDS.impactAllocation, "action_variant", "Allocate and resolve Impact dice per target"),
    node(IDS.chargeOpened, "state_event", "Goliath Charge opened"),
    node(IDS.chargeSuccess, "state_event", "Goliath Charge succeeded"),
    node(IDS.chargeFailure, "state_event", "Goliath Charge failed"),
    node(IDS.impactTriggered, "state_event", "Successful Charge triggered mandatory Impact"),
    node(IDS.impactResolved, "state_event", "Impact resolved per target"),
    node(IDS.sourceTest, "judge_test", "Pinned official Goliath profile Judge"),
    node(IDS.chargeTest, "judge_test", "Goliath Charge reachability Judge"),
    node(IDS.impactTest, "judge_test", "Impact allocation and resolution Judge"),
    node(IDS.authorityTest, "judge_test", "Three-stage Authority replay Judge"),
    node(IDS.graphTest, "judge_test", "Impact relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const chargeScope = {
    scopeId: OFFICIAL_GOLIATH_CHARGE_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
    requiredNodeIds: [...new Set([
      chargeExecutor, ...chargeReads, IDS.log, IDS.chargeDeclaration,
      IDS.chargeResolution, IDS.chargeOpened, IDS.chargeSuccess, IDS.chargeFailure,
      IDS.impactTriggered, IDS.chargeTest, IDS.authorityTest,
    ])],
    requiredEdges: chargeEdges,
    requiredPaths: [{
      from: IDS.impactProfile,
      to: IDS.chargeTest,
      relationships: ["derives", "verified_by"],
      maxDepth: 2,
    }],
    forbiddenPaths: [],
    evidenceTestNodeIds: [IDS.chargeTest, IDS.authorityTest],
  };
  const impactScope = {
    scopeId: OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_IMPACT_EXECUTOR_ID,
    requiredNodeIds: [...new Set([
      impactExecutor, ...impactReads, IDS.log, IDS.chargeSuccess, IDS.impactTriggered,
      IDS.impactAllocation, IDS.impactResolved, IDS.sourceTest, IDS.impactTest,
      IDS.authorityTest, IDS.graphTest,
    ])],
    requiredEdges: impactEdges,
    requiredPaths: [{
      from: IDS.chargeSuccess,
      to: IDS.damage,
      relationships: ["derives", "writes"],
      maxDepth: 4,
    }],
    forbiddenPaths: [],
    evidenceTestNodeIds: [IDS.sourceTest, IDS.impactTest, IDS.authorityTest, IDS.graphTest],
  };
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...chargeEdges, ...impactEdges],
    executorLineages: [
      ...previous.executorLineages,
      {
        executorId: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:goliath_charge_v1",
      },
      {
        executorId: OFFICIAL_IMPACT_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_IMPACT_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:impact_v1",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
      OFFICIAL_IMPACT_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, chargeScope, impactScope],
  };
}
