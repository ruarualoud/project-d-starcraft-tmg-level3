import {
  createOfficialActivationPassRelationshipExtensionV1,
  OFFICIAL_ACTIVATION_PASS_RELATIONSHIP_NODE_IDS_V1,
} from "./official-activation-pass-relationship-contract-v1.mjs";
import {
  OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID,
  OFFICIAL_MOVEMENT_HOLD_EXECUTOR_VERSION,
} from "./official-movement-hold-executor-v1.mjs";

export const OFFICIAL_MOVEMENT_HOLD_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-movement-hold-v1";

const previousIds = OFFICIAL_ACTIVATION_PASS_RELATIONSHIP_NODE_IDS_V1;

export const OFFICIAL_MOVEMENT_HOLD_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  round: "state_field:round",
  phase: "state_field:phase",
  activeSideKey: "state_field:activeSideKey",
  players: "state_field:players",
  pieces: "state_field:pieces",
  firstPlayerSideKey: "state_field:firstPlayerSideKey",
  phaseFirstActorByRound: "state_field:phaseFirstActorByRound",
  log: "state_field:log",
  board: "state_field:board",
  scores: "state_field:scores",
  cardResources: "state_field:cardResources",
  pieceActivationState: "semantic_projection:movementHold.pieceActivationStateV1",
  protectedState: "semantic_projection:movementHold.nonHoldStateV1",
  exactHoldSet: "derived_value:movementHold.exactEligiblePieceSetV1",
  sideAvailability: "derived_value:movementHold.sideHasAvailableActivationV1",
  otherSide: "derived_value:movementHold.otherSideV1",
  phaseHandoffSeat: "derived_value:movementHold.phaseHandoffSeatV1",
  nextPhase: "derived_value:movementHold.nextPhaseV1",
  holdAction: "action_variant:movementHold.exactPieceHoldV1",
  actionType: "action_type:hold",
  holdEvent: "state_event:hold",
  markerCompletionEvent: "state_event:phase_activation_markers_completed",
  phaseAdvancedEvent: "state_event:phase_advanced",
  exactActionTest: "judge_test:movement-hold-exact-active-piece-denominator-v1",
  noOpTest: "judge_test:movement-hold-preserves-non-hold-state-v1",
  handoffTest: "judge_test:movement-hold-alternates-to-eligible-seat-v1",
  phaseCompletionTest: "judge_test:movement-hold-last-activation-completes-phase-v1",
  phaseChoiceGateTest: "judge_test:movement-hold-requires-fresh-phase-first-actor-v1",
  replayTest: "judge_test:movement-hold-ed25519-replay-hmac-rotation-v1",
  relationshipTest: "judge_test:movement-hold-relationship-negative-gap-v1",
  previousSliceRelease: previousIds.currentSliceRelease,
  currentSliceRelease:
    "slice_release:slice-52-existing-movement-hold-contract-closure-v1",
  previousCatalogueRelease: previousIds.currentCatalogueRelease,
  currentCatalogueRelease:
    "catalogue_release:slice-52@cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e",
  previousRuntimeRelease: previousIds.currentRuntimeRelease,
  currentRuntimeRelease:
    "runtime_release:slice-52@3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a",
});

const EXPECTED_CATALOGUE_HASH =
  "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e";
const EXPECTED_RUNTIME_HASH =
  "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a";

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_MOVEMENT_HOLD_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_MOVEMENT_HOLD_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialMovementHoldRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("MOVEMENT_HOLD_RELATIONSHIP_FROZEN_RELEASE_MISMATCH");
  }
  const previous = createOfficialActivationPassRelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const id = OFFICIAL_MOVEMENT_HOLD_RELATIONSHIP_NODE_IDS_V1;
  const executor = `executor:${OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID}`
    + `@${OFFICIAL_MOVEMENT_HOLD_EXECUTOR_VERSION}`;
  const tests = [
    id.exactActionTest,
    id.noOpTest,
    id.handoffTest,
    id.phaseCompletionTest,
    id.phaseChoiceGateTest,
    id.replayTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.board, "state_field", "Battlefield and terrain state preserved by Hold"),
    node(id.scores, "state_field", "Score state preserved by Hold"),
    node(id.cardResources, "state_field", "Card resources preserved by Hold"),
    node(id.pieceActivationState, "semantic_projection",
      "Per-piece battlefield and movement activation projection"),
    node(id.protectedState, "semantic_projection",
      "Board, score, resources, positions, statuses, and damage preserved by Hold"),
    node(id.exactHoldSet, "derived_value",
      "Every exact Hold action for the active eligible piece set"),
    node(id.sideAvailability, "derived_value",
      "Seat has an unactivated on-table movement activation"),
    node(id.otherSide, "derived_value", "Opposing seat for movement alternation"),
    node(id.phaseHandoffSeat, "derived_value",
      "First Player Marker holder receives the next phase"),
    node(id.nextPhase, "derived_value", "Assault after completed Movement"),
    node(id.holdAction, "action_variant", "Exact Hold for one eligible piece"),
    node(id.holdEvent, "state_event", "Movement Hold accepted"),
    node(id.exactActionTest, "judge_test",
      "Only active unactivated on-table pieces expose exact Hold"),
    node(id.noOpTest, "judge_test",
      "Hold changes activation and handoff but preserves unrelated state"),
    node(id.handoffTest, "judge_test",
      "Hold hands activation to the eligible opposing seat"),
    node(id.phaseCompletionTest, "judge_test",
      "Last Hold after opposing Pass completes Movement"),
    node(id.phaseChoiceGateTest, "judge_test",
      "Fresh phase-first-actor choice gates Hold"),
    node(id.replayTest, "judge_test",
      "Ed25519 Hold replay survives HMAC rotation"),
    node(id.relationshipTest, "judge_test",
      "Missing Hold invalidation or Judge edge blocks contract"),
    node(id.currentSliceRelease, "slice_release",
      "Existing Movement Hold contract closure v1"),
    node(id.currentCatalogueRelease, "catalogue_release",
      `Retained Slice 51 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release",
      `Retained Slice 51 runtime ${runtimeHash}`),
  ];
  const relations = [
    edge(executor, "reads", id.round, "movement_hold_state_contract_v1"),
    edge(executor, "reads", id.phase, "movement_hold_state_contract_v1"),
    edge(executor, "reads", id.activeSideKey, "movement_hold_state_contract_v1"),
    edge(executor, "reads", id.players, "movement_hold_state_contract_v1"),
    edge(executor, "reads", id.pieces, "movement_hold_state_contract_v1"),
    edge(executor, "reads", id.firstPlayerSideKey,
      "movement_hold_state_contract_v1"),
    edge(executor, "reads", id.phaseFirstActorByRound,
      "movement_hold_state_contract_v1"),
    edge(executor, "reads", id.log, "movement_hold_state_contract_v1"),
    edge(executor, "exposes", id.exactHoldSet, "movement_hold_exact_domain_v1"),
    edge(id.pieces, "projects_to", id.pieceActivationState,
      "movement_hold_piece_projection_v1"),
    edge(id.pieces, "projects_to", id.protectedState,
      "movement_hold_protected_projection_v1"),
    edge(id.board, "projects_to", id.protectedState,
      "movement_hold_protected_projection_v1"),
    edge(id.scores, "projects_to", id.protectedState,
      "movement_hold_protected_projection_v1"),
    edge(id.cardResources, "projects_to", id.protectedState,
      "movement_hold_protected_projection_v1"),
    edge(id.phase, "gates", id.exactHoldSet, "movement_hold_gate_v1"),
    edge(id.activeSideKey, "gates", id.exactHoldSet, "movement_hold_gate_v1"),
    edge(id.players, "gates", id.exactHoldSet, "movement_hold_gate_v1"),
    edge(id.phaseFirstActorByRound, "gates", id.exactHoldSet,
      "movement_hold_gate_v1"),
    edge(id.pieceActivationState, "derives", id.exactHoldSet,
      "movement_hold_eligibility_v1"),
    edge(id.exactHoldSet, "includes", id.holdAction,
      "movement_hold_exact_domain_v1"),
    edge(id.holdAction, "includes", id.actionType,
      "movement_hold_exact_domain_v1"),
    edge(id.phase, "invalidates", id.holdAction,
      "movement_hold_state_invalidation_v1"),
    edge(id.activeSideKey, "invalidates", id.holdAction,
      "movement_hold_state_invalidation_v1"),
    edge(id.players, "invalidates", id.holdAction,
      "movement_hold_state_invalidation_v1"),
    edge(id.pieces, "invalidates", id.holdAction,
      "movement_hold_state_invalidation_v1"),
    edge(id.firstPlayerSideKey, "invalidates", id.holdAction,
      "movement_hold_state_invalidation_v1"),
    edge(id.phaseFirstActorByRound, "invalidates", id.holdAction,
      "movement_hold_state_invalidation_v1"),
    edge(id.round, "invalidates", id.holdAction,
      "movement_hold_state_invalidation_v1"),
    edge(id.log, "invalidates", id.holdAction,
      "movement_hold_state_invalidation_v1"),
    edge(id.pieces, "derives", id.sideAvailability,
      "movement_hold_availability_v1"),
    edge(id.players, "derives", id.sideAvailability,
      "movement_hold_availability_v1"),
    edge(id.activeSideKey, "derives", id.otherSide,
      "movement_hold_alternation_v1"),
    edge(id.firstPlayerSideKey, "derives", id.phaseHandoffSeat,
      "movement_hold_phase_handoff_v1"),
    edge(id.phase, "derives", id.nextPhase, "movement_hold_phase_handoff_v1"),
    edge(id.holdAction, "derives", id.holdEvent, "movement_hold_apply_v1"),
    edge(id.holdEvent, "writes", id.pieces, "movement_hold_apply_v1"),
    edge(id.holdEvent, "writes", id.activeSideKey, "movement_hold_apply_v1"),
    edge(id.holdEvent, "writes", id.log, "movement_hold_apply_v1"),
    edge(id.holdEvent, "derives", id.markerCompletionEvent,
      "movement_hold_phase_handoff_v1"),
    edge(id.holdEvent, "derives", id.phaseAdvancedEvent,
      "movement_hold_phase_handoff_v1"),
    edge(id.phaseAdvancedEvent, "parameterized_by", id.nextPhase,
      "movement_hold_phase_handoff_v1"),
    edge(id.phaseAdvancedEvent, "parameterized_by", id.phaseHandoffSeat,
      "movement_hold_phase_handoff_v1"),
    edge(id.markerCompletionEvent, "writes", id.pieces,
      "movement_hold_phase_handoff_v1"),
    edge(id.phaseAdvancedEvent, "writes", id.phase,
      "movement_hold_phase_handoff_v1"),
    edge(id.phaseAdvancedEvent, "writes", id.players,
      "movement_hold_phase_handoff_v1"),
    edge(id.phaseAdvancedEvent, "writes", id.activeSideKey,
      "movement_hold_phase_handoff_v1"),
    edge(id.exactHoldSet, "verified_by", id.exactActionTest,
      "movement_hold_judge_v1"),
    edge(id.holdEvent, "verified_by", id.noOpTest, "movement_hold_judge_v1"),
    edge(id.activeSideKey, "verified_by", id.handoffTest,
      "movement_hold_judge_v1"),
    edge(id.phaseAdvancedEvent, "verified_by", id.phaseCompletionTest,
      "movement_hold_judge_v1"),
    edge(id.exactHoldSet, "verified_by", id.phaseChoiceGateTest,
      "movement_hold_judge_v1"),
    edge(id.holdEvent, "verified_by", id.replayTest, "movement_hold_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "movement_hold_judge_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "movement_hold_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "retained_by", id.currentCatalogueRelease,
      "movement_hold_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "retained_by", id.currentRuntimeRelease,
      "movement_hold_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "movement_hold_state_contract_v1",
    "movement_hold_exact_domain_v1",
    "movement_hold_piece_projection_v1",
    "movement_hold_protected_projection_v1",
    "movement_hold_gate_v1",
    "movement_hold_eligibility_v1",
    "movement_hold_state_invalidation_v1",
    "movement_hold_availability_v1",
    "movement_hold_alternation_v1",
    "movement_hold_phase_handoff_v1",
    "movement_hold_apply_v1",
    "movement_hold_judge_v1",
    "movement_hold_slice_ancestry_v1",
    "movement_hold_catalogue_ancestry_v1",
    "movement_hold_runtime_ancestry_v1",
  ]);
  const requiredEdges = relations.filter((relation) => (
    requiredProvenance.has(relation.provenance)
  ));
  return {
    nodes: [...previous.nodes, ...nodes],
    edges: [...previous.edges, ...relations],
    executorLineages: [...previous.executorLineages],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_MOVEMENT_HOLD_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID,
        requiredNodeIds: [
          id.round,
          id.phase,
          id.activeSideKey,
          id.players,
          id.pieces,
          id.firstPlayerSideKey,
          id.phaseFirstActorByRound,
          id.log,
          id.board,
          id.scores,
          id.cardResources,
          id.pieceActivationState,
          id.protectedState,
          id.exactHoldSet,
          id.sideAvailability,
          id.otherSide,
          id.phaseHandoffSeat,
          id.nextPhase,
          id.holdAction,
          id.actionType,
          id.holdEvent,
          id.markerCompletionEvent,
          id.phaseAdvancedEvent,
          id.previousSliceRelease,
          id.currentSliceRelease,
          id.previousCatalogueRelease,
          id.currentCatalogueRelease,
          id.previousRuntimeRelease,
          id.currentRuntimeRelease,
          ...tests,
        ],
        requiredEdges,
        requiredPaths: [
          {
            from: id.pieces,
            to: id.exactActionTest,
            relationships: ["projects_to", "derives", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.phaseFirstActorByRound,
            to: id.phaseChoiceGateTest,
            relationships: ["gates", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.holdAction,
            to: id.noOpTest,
            relationships: ["derives", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.holdAction,
            to: id.handoffTest,
            relationships: ["derives", "writes", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.holdAction,
            to: id.phaseCompletionTest,
            relationships: ["derives", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.holdAction,
            to: id.replayTest,
            relationships: ["derives", "verified_by"],
            maxDepth: 3,
          },
        ],
        forbiddenPaths: [
          {
            from: id.holdEvent,
            to: id.board,
            relationships: ["writes"],
            maxDepth: 3,
          },
          {
            from: id.holdEvent,
            to: id.scores,
            relationships: ["writes"],
            maxDepth: 3,
          },
          {
            from: id.holdEvent,
            to: id.cardResources,
            relationships: ["writes"],
            maxDepth: 3,
          },
          {
            from: id.holdEvent,
            to: id.firstPlayerSideKey,
            relationships: ["writes"],
            maxDepth: 3,
          },
        ],
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
