import { createOfficialImpactAfterChargeRelationshipExtensionV1 } from
  "./official-impact-after-charge-relationship-contract-v1.mjs";
import {
  OFFICIAL_ASSAULT_RUN_EXECUTOR_ATOM_IDS,
  OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
  OFFICIAL_ASSAULT_RUN_EXECUTOR_VERSION,
} from "./official-assault-run-executor-v1.mjs";

export const OFFICIAL_ASSAULT_RUN_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-77-assault-run";

const ID = Object.freeze({
  sourceLock: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  mission: "state_field:officialMissionSetupBinding",
  supply: "state_field:officialRoundSupplyState",
  round: "state_field:round",
  phase: "state_field:phase",
  active: "state_field:activeSideKey",
  initiative: "state_field:phaseFirstActorByRound",
  players: "state_field:players[].passedPhases.assault",
  pieces: "state_field:pieces",
  models: "state_field:pieces[].models[].position",
  statuses: "state_field:pieces[].statuses",
  movementMarker: "state_field:pieces[].activatedPhases.movement",
  assaultMarker: "state_field:pieces[].activatedPhases.assault",
  board: "state_field:board",
  log: "state_field:log",
  choice: "action_variant:assaultV1.chooseRunHoldChargeOrRangedAttack",
  run: "action_variant:assaultRunV1.standardMove",
  hold: "action_variant:assaultChoiceV1.hold",
  charge: "action_variant:assaultChoiceV1.charge",
  ranged: "action_variant:assaultChoiceV1.rangedAttack",
  moved: "state_event:unit_assault_ran",
  settled: "state_event:assault_run_settled",
  sourceTest: "judge_test:assault-run-v1-source-lock-v1",
  runTest: "judge_test:assault-run-v1-standard-move-adapter-v1",
  choiceTest: "judge_test:assault-run-v1-four-action-choice-v1",
  authorityTest: "judge_test:assault-run-v1-authority-replay-v1",
  graphTest: "judge_test:assault-run-v1-relationship-negative-gap-v1",
});

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-77" };
}
function edge(from, relationship, to, provenance) {
  return {
    scopeId: OFFICIAL_ASSAULT_RUN_RELATIONSHIP_SCOPE_ID,
    from,
    relationship,
    to,
    provenance,
  };
}

export function createOfficialAssaultRunRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("ASSAULT_RUN_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialImpactAfterChargeRelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const executor =
    `executor:${OFFICIAL_ASSAULT_RUN_EXECUTOR_ID}@${OFFICIAL_ASSAULT_RUN_EXECUTOR_VERSION}`;
  const reads = [
    ID.sourceLock, ID.gameplay, ID.mission, ID.supply, ID.round, ID.phase,
    ID.active, ID.initiative, ID.players, ID.pieces, ID.models, ID.statuses,
    ID.movementMarker, ID.assaultMarker, ID.board,
  ];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target, "assault_run:state_contract")),
    edge(ID.phase, "derives", ID.choice, "assault_run:assault_choice"),
    edge(ID.choice, "derives", ID.run, "assault_run:choice_run"),
    edge(ID.choice, "derives", ID.hold, "assault_run:choice_hold"),
    edge(ID.choice, "derives", ID.charge, "assault_run:choice_charge"),
    edge(ID.choice, "derives", ID.ranged, "assault_run:choice_ranged"),
    edge(executor, "exposes", ID.run, "assault_run:legal_space"),
    edge(ID.run, "derives", ID.moved, "assault_run:apply"),
    edge(ID.moved, "writes", ID.models, "assault_run:standard_movement"),
    edge(ID.moved, "writes", ID.statuses, "assault_run:stationary_cleanup"),
    edge(ID.moved, "writes", ID.assaultMarker, "assault_run:activation"),
    edge(ID.moved, "derives", ID.settled, "assault_run:settlement"),
    edge(ID.settled, "writes", ID.active, "assault_run:alternation"),
    edge(ID.moved, "writes", ID.log, "assault_run:log"),
    edge(ID.sourceLock, "verified_by", ID.sourceTest, "assault_run:source_judge"),
    edge(ID.run, "verified_by", ID.runTest, "assault_run:procedure_judge"),
    edge(ID.choice, "verified_by", ID.choiceTest, "assault_run:choice_judge"),
    edge(executor, "verified_by", ID.authorityTest, "assault_run:authority"),
    edge(executor, "verified_by", ID.graphTest, "assault_run:relationship"),
    ...reads.map((source) => edge(
      source,
      "invalidates",
      ID.run,
      "assault_run:stale",
    )),
  ];
  const additions = [
    node(ID.mission, "state_field", "Official mission setup binding"),
    node(ID.supply, "state_field", "Official round supply state"),
    node(ID.models, "state_field", "Current model positions"),
    node(ID.statuses, "state_field", "Current unit statuses"),
    node(ID.movementMarker, "state_field", "Movement-side activation marker"),
    node(ID.assaultMarker, "state_field", "Assault-side activation marker"),
    node(ID.choice, "action_variant", "Choose Run, Hold, Charge, or Ranged Attack"),
    node(ID.run, "action_variant", "Run by standard movement"),
    node(ID.hold, "action_variant", "Assault Hold choice"),
    node(ID.charge, "action_variant", "Assault Charge choice"),
    node(ID.ranged, "action_variant", "Assault Ranged Attack choice"),
    node(ID.moved, "state_event", "Unit completed Assault Run"),
    node(ID.settled, "state_event", "Run activation settled"),
    node(ID.sourceTest, "judge_test", "Run source-lock Judge"),
    node(ID.runTest, "judge_test", "Run standard-move adapter Judge"),
    node(ID.choiceTest, "judge_test", "Assault four-action choice Judge"),
    node(ID.authorityTest, "judge_test", "Run Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Run relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const scope = {
    scopeId: OFFICIAL_ASSAULT_RUN_RELATIONSHIP_SCOPE_ID,
    executorId: OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
    requiredNodeIds: [...new Set([
      executor, ...reads, ID.log, ID.choice, ID.run, ID.hold, ID.charge,
      ID.ranged, ID.moved, ID.settled, ID.sourceTest, ID.runTest,
      ID.choiceTest, ID.authorityTest, ID.graphTest,
    ])],
    requiredEdges: edges,
    requiredPaths: [{
      from: ID.run,
      to: ID.assaultMarker,
      relationships: ["derives", "writes"],
      maxDepth: 2,
    }],
    forbiddenPaths: [],
    evidenceTestNodeIds: [
      ID.sourceTest, ID.runTest, ID.choiceTest, ID.authorityTest, ID.graphTest,
    ],
  };
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [
      ...previous.executorLineages,
      {
        executorId: OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_ASSAULT_RUN_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:assault_run_v1",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, scope],
  };
}
