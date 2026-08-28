import {
  createOfficialPhaseInitiativeRelationshipExtensionV1,
  OFFICIAL_PHASE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1,
} from "./official-phase-initiative-relationship-contract-v1.mjs";
import {
  OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
  OFFICIAL_ACTIVATION_PASS_EXECUTOR_VERSION,
} from "./official-activation-pass-executor-v1.mjs";

export const OFFICIAL_ACTIVATION_PASS_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-activation-pass-v1";

const phaseIds = OFFICIAL_PHASE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1;

export const OFFICIAL_ACTIVATION_PASS_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  round: "state_field:round",
  phase: "state_field:phase",
  activeSideKey: "state_field:activeSideKey",
  players: "state_field:players",
  pieces: "state_field:pieces",
  firstPassSideByPhase: "state_field:firstPassSideByPhase",
  firstPlayerSideKey: "state_field:firstPlayerSideKey",
  phaseFirstActorByRound: "state_field:phaseFirstActorByRound",
  log: "state_field:log",
  supportedPhase: "derived_value:activationPass.supportedPhaseV1",
  activationAvailability: "derived_value:activationPass.sideHasAvailableActivationV1",
  passKind: "derived_value:activationPass.passKindV1",
  otherSide: "derived_value:activationPass.otherSideV1",
  nextPhase: "derived_value:activationPass.nextPhaseV1",
  optionalPass: "action_variant:activationPass.optionalV1",
  mandatoryPass: "action_variant:activationPass.mandatoryV1",
  passAction: "action_variant:activationPass.passV1",
  actionType: "action_type:pass",
  passEvent: "state_event:pass",
  markerCompletionEvent: "state_event:phase_activation_markers_completed",
  phaseAdvancedEvent: "state_event:phase_advanced",
  optionalMandatoryTest: "judge_test:activation-pass-optional-and-mandatory-remain-legal-v1",
  firstPassMarkerTest: "judge_test:activation-pass-first-passer-becomes-marker-holder-v1",
  phaseCompletionTest: "judge_test:activation-pass-second-pass-advances-phase-v1",
  phaseChoiceGateTest: "judge_test:activation-pass-requires-fresh-phase-first-actor-v1",
  replayTest: "judge_test:activation-pass-ed25519-replay-hmac-rotation-v1",
  relationshipTest: "judge_test:activation-pass-relationship-negative-gap-v1",
  previousSliceRelease: phaseIds.currentSliceRelease,
  currentSliceRelease:
    "slice_release:slice-51-existing-activation-pass-contract-closure-v1",
  previousCatalogueRelease: phaseIds.currentCatalogueRelease,
  currentCatalogueRelease:
    "catalogue_release:slice-51@cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e",
  previousRuntimeRelease: phaseIds.currentRuntimeRelease,
  currentRuntimeRelease:
    "runtime_release:slice-51@3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a",
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
    provenance: OFFICIAL_ACTIVATION_PASS_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_ACTIVATION_PASS_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialActivationPassRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("ACTIVATION_PASS_RELATIONSHIP_FROZEN_RELEASE_MISMATCH");
  }
  const previous = createOfficialPhaseInitiativeRelationshipExtensionV1({
    catalogueHash,
    runtimeHash,
  });
  const id = OFFICIAL_ACTIVATION_PASS_RELATIONSHIP_NODE_IDS_V1;
  const executor = `executor:${OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID}`
    + `@${OFFICIAL_ACTIVATION_PASS_EXECUTOR_VERSION}`;
  const tests = [
    id.optionalMandatoryTest,
    id.firstPassMarkerTest,
    id.phaseCompletionTest,
    id.phaseChoiceGateTest,
    id.replayTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.pieces, "state_field", "On-table pieces and per-phase activation markers"),
    node(id.firstPassSideByPhase, "state_field", "First passer recorded for each phase"),
    node(id.supportedPhase, "derived_value", "Movement or assault pass phase"),
    node(id.activationAvailability, "derived_value", "Active side has an eligible activation"),
    node(id.passKind, "derived_value", "Optional or mandatory pass classification"),
    node(id.otherSide, "derived_value", "Opposing seat for alternation"),
    node(id.nextPhase, "derived_value", "Phase following a completed pass pair"),
    node(id.optionalPass, "action_variant", "Optional pass with activation available"),
    node(id.mandatoryPass, "action_variant", "Mandatory pass with no activation available"),
    node(id.passAction, "action_variant", "Authoritative activation pass action"),
    node(id.passEvent, "state_event", "Pass accepted"),
    node(id.markerCompletionEvent, "state_event", "Remaining activation markers completed"),
    node(id.phaseAdvancedEvent, "state_event", "Alternating phase advanced"),
    node(id.optionalMandatoryTest, "judge_test", "Optional and mandatory classifications both expose Pass"),
    node(id.firstPassMarkerTest, "judge_test", "First passer receives the First Player Marker"),
    node(id.phaseCompletionTest, "judge_test", "Second pass completes and advances the phase"),
    node(id.phaseChoiceGateTest, "judge_test", "Fresh phase initiative choice gates Pass"),
    node(id.replayTest, "judge_test", "Ed25519 pass replay survives HMAC rotation"),
    node(id.relationshipTest, "judge_test", "Missing pass invalidation or Judge edge blocks contract"),
    node(id.currentSliceRelease, "slice_release", "Existing activation-pass contract closure v1"),
    node(id.currentCatalogueRelease, "catalogue_release",
      `Retained Slice 50 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release",
      `Retained Slice 50 runtime ${runtimeHash}`),
  ];
  const relations = [
    edge(executor, "reads", id.phase, "activation_pass_state_contract_v1"),
    edge(executor, "reads", id.activeSideKey, "activation_pass_state_contract_v1"),
    edge(executor, "reads", id.players, "activation_pass_state_contract_v1"),
    edge(executor, "reads", id.pieces, "activation_pass_state_contract_v1"),
    edge(executor, "reads", id.firstPassSideByPhase, "activation_pass_state_contract_v1"),
    edge(executor, "reads", id.firstPlayerSideKey, "activation_pass_state_contract_v1"),
    edge(executor, "exposes", id.passAction, "activation_pass_exact_domain_v1"),
    edge(id.passAction, "includes", id.actionType, "activation_pass_exact_domain_v1"),
    edge(id.phase, "derives", id.supportedPhase, "activation_pass_phase_v1"),
    edge(id.pieces, "derives", id.activationAvailability, "activation_pass_availability_v1"),
    edge(id.players, "derives", id.activationAvailability, "activation_pass_availability_v1"),
    edge(id.activeSideKey, "derives", id.activationAvailability, "activation_pass_availability_v1"),
    edge(id.activationAvailability, "derives", id.passKind, "activation_pass_classification_v1"),
    edge(id.passKind, "includes", id.optionalPass, "activation_pass_classification_v1"),
    edge(id.passKind, "includes", id.mandatoryPass, "activation_pass_classification_v1"),
    edge(id.optionalPass, "includes", id.passAction, "activation_pass_legal_denominator_v1"),
    edge(id.mandatoryPass, "includes", id.passAction, "activation_pass_legal_denominator_v1"),
    edge(id.phase, "gates", id.passAction, "activation_pass_gate_v1"),
    edge(id.activeSideKey, "gates", id.passAction, "activation_pass_gate_v1"),
    edge(id.phaseFirstActorByRound, "gates", id.passAction, "activation_pass_gate_v1"),
    edge(id.phase, "invalidates", id.passAction, "activation_pass_state_invalidation_v1"),
    edge(id.activeSideKey, "invalidates", id.passAction, "activation_pass_state_invalidation_v1"),
    edge(id.players, "invalidates", id.passAction, "activation_pass_state_invalidation_v1"),
    edge(id.pieces, "invalidates", id.passAction, "activation_pass_state_invalidation_v1"),
    edge(id.firstPassSideByPhase, "invalidates", id.passAction, "activation_pass_state_invalidation_v1"),
    edge(id.firstPlayerSideKey, "invalidates", id.passAction, "activation_pass_state_invalidation_v1"),
    edge(id.phaseFirstActorByRound, "invalidates", id.passAction, "activation_pass_state_invalidation_v1"),
    edge(id.activeSideKey, "derives", id.otherSide, "activation_pass_alternation_v1"),
    edge(id.phase, "derives", id.nextPhase, "activation_pass_phase_handoff_v1"),
    edge(id.passAction, "derives", id.passEvent, "activation_pass_apply_v1"),
    edge(id.passEvent, "writes", id.players, "activation_pass_apply_v1"),
    edge(id.passEvent, "writes", id.firstPassSideByPhase, "activation_pass_apply_v1"),
    edge(id.passEvent, "writes", id.firstPlayerSideKey, "activation_pass_apply_v1"),
    edge(id.passEvent, "writes", id.pieces, "activation_pass_apply_v1"),
    edge(id.passEvent, "writes", id.activeSideKey, "activation_pass_apply_v1"),
    edge(id.passEvent, "writes", id.log, "activation_pass_apply_v1"),
    edge(id.passEvent, "derives", id.markerCompletionEvent, "activation_pass_phase_handoff_v1"),
    edge(id.passEvent, "derives", id.phaseAdvancedEvent, "activation_pass_phase_handoff_v1"),
    edge(id.markerCompletionEvent, "writes", id.pieces, "activation_pass_phase_handoff_v1"),
    edge(id.phaseAdvancedEvent, "writes", id.phase, "activation_pass_phase_handoff_v1"),
    edge(id.phaseAdvancedEvent, "writes", id.activeSideKey, "activation_pass_phase_handoff_v1"),
    edge(id.optionalPass, "verified_by", id.optionalMandatoryTest, "activation_pass_judge_v1"),
    edge(id.mandatoryPass, "verified_by", id.optionalMandatoryTest, "activation_pass_judge_v1"),
    edge(id.firstPlayerSideKey, "verified_by", id.firstPassMarkerTest, "activation_pass_judge_v1"),
    edge(id.phaseAdvancedEvent, "verified_by", id.phaseCompletionTest, "activation_pass_judge_v1"),
    edge(id.passAction, "verified_by", id.phaseChoiceGateTest, "activation_pass_judge_v1"),
    edge(id.passEvent, "verified_by", id.replayTest, "activation_pass_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest, "activation_pass_judge_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "activation_pass_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "retained_by", id.currentCatalogueRelease,
      "activation_pass_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "retained_by", id.currentRuntimeRelease,
      "activation_pass_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "activation_pass_state_contract_v1",
    "activation_pass_exact_domain_v1",
    "activation_pass_phase_v1",
    "activation_pass_availability_v1",
    "activation_pass_classification_v1",
    "activation_pass_legal_denominator_v1",
    "activation_pass_gate_v1",
    "activation_pass_state_invalidation_v1",
    "activation_pass_alternation_v1",
    "activation_pass_phase_handoff_v1",
    "activation_pass_apply_v1",
    "activation_pass_judge_v1",
    "activation_pass_slice_ancestry_v1",
    "activation_pass_catalogue_ancestry_v1",
    "activation_pass_runtime_ancestry_v1",
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
      OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_ACTIVATION_PASS_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
        requiredNodeIds: [
          id.round,
          id.phase,
          id.activeSideKey,
          id.players,
          id.pieces,
          id.firstPassSideByPhase,
          id.firstPlayerSideKey,
          id.phaseFirstActorByRound,
          id.log,
          id.supportedPhase,
          id.activationAvailability,
          id.passKind,
          id.otherSide,
          id.nextPhase,
          id.optionalPass,
          id.mandatoryPass,
          id.passAction,
          id.actionType,
          id.passEvent,
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
            to: id.optionalMandatoryTest,
            relationships: ["derives", "includes", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.phaseFirstActorByRound,
            to: id.phaseChoiceGateTest,
            relationships: ["gates", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.passAction,
            to: id.phaseCompletionTest,
            relationships: ["derives", "writes", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.passAction,
            to: id.replayTest,
            relationships: ["derives", "verified_by"],
            maxDepth: 3,
          },
          {
            from: id.firstPassSideByPhase,
            to: id.firstPassMarkerTest,
            relationships: ["invalidates", "derives", "writes", "verified_by"],
            maxDepth: 6,
          },
        ],
        forbiddenPaths: [
          {
            from: id.activationAvailability,
            to: id.passAction,
            relationships: ["gates"],
            maxDepth: 3,
          },
          {
            from: id.passAction,
            to: id.phaseFirstActorByRound,
            relationships: ["writes"],
            maxDepth: 3,
          },
        ],
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
