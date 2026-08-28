import {
  createOfficialMarineMultiEnemyStimpackCasualtyRelationshipExtensionV5,
} from
  "./official-marine-multi-enemy-stimpack-casualty-relationship-contract-v5.mjs";
import {
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION,
} from "./official-phase-initiative-executor-v1.mjs";

export const OFFICIAL_PHASE_INITIATIVE_RELATIONSHIP_SCOPE_ID =
  "ticket-11-existing-executor-contract-phase-initiative-v1";

export const OFFICIAL_PHASE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  round: "state_field:round",
  phase: "state_field:phase",
  players: "state_field:players",
  firstPlayerSideKey: "state_field:firstPlayerSideKey",
  phaseFirstActorByRound: "state_field:phaseFirstActorByRound",
  activeSideKey: "state_field:activeSideKey",
  log: "state_field:log",
  phaseKey: "derived_value:phaseInitiative.roundPhaseKeyV1",
  choiceSet: "derived_value:phaseInitiative.exactChoiceSetV1",
  selfChoice: "action_variant:phaseInitiative.chooseMarkerHolderV1",
  opponentChoice: "action_variant:phaseInitiative.chooseOpponentV1",
  actionType: "action_type:choose_first_actor",
  chosenEvent: "state_event:phase_first_actor_chosen",
  markerHolderTest: "judge_test:phase-initiative-marker-holder-only-two-choices-v1",
  applyTest: "judge_test:phase-initiative-choice-writes-active-seat-v1",
  freshChoiceTest: "judge_test:phase-initiative-phase-handoff-invalidates-old-choice-v1",
  replayTest: "judge_test:phase-initiative-ed25519-replay-hmac-rotation-v1",
  relationshipTest: "judge_test:phase-initiative-relationship-negative-gap-v1",
  previousSliceRelease:
    "slice_release:slice-49-marine-multi-enemy-stimpack-casualty-v5",
  currentSliceRelease:
    "slice_release:slice-50-existing-executor-contract-closure-v1",
  previousCatalogueRelease:
    "catalogue_release:slice-49@cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e",
  currentCatalogueRelease:
    "catalogue_release:slice-50@cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e",
  previousRuntimeRelease:
    "runtime_release:slice-49@3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a",
  currentRuntimeRelease:
    "runtime_release:slice-50@3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a",
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
    provenance: OFFICIAL_PHASE_INITIATIVE_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_PHASE_INITIATIVE_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialPhaseInitiativeRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("PHASE_INITIATIVE_RELATIONSHIP_FROZEN_RELEASE_MISMATCH");
  }
  const previous =
    createOfficialMarineMultiEnemyStimpackCasualtyRelationshipExtensionV5({
      catalogueHash,
      runtimeHash,
    });
  const id = OFFICIAL_PHASE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1;
  const executor = `executor:${OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID}`
    + `@${OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION}`;
  const tests = [
    id.markerHolderTest,
    id.applyTest,
    id.freshChoiceTest,
    id.replayTest,
    id.relationshipTest,
  ];
  const nodes = [
    node(id.round, "state_field", "Current game round"),
    node(id.phase, "state_field", "Current rules phase"),
    node(id.players, "state_field", "Two authoritative player seat records"),
    node(id.firstPlayerSideKey, "state_field", "Current First Player Marker holder"),
    node(id.phaseFirstActorByRound, "state_field", "Round-and-phase first actor choices"),
    node(id.log, "state_field", "Expert-readable deterministic action log"),
    node(id.phaseKey, "derived_value", "Canonical round and phase choice key"),
    node(id.choiceSet, "derived_value", "Exactly two first-actor choices"),
    node(id.selfChoice, "action_variant", "Marker holder chooses itself"),
    node(id.opponentChoice, "action_variant", "Marker holder chooses the opponent"),
    node(id.chosenEvent, "state_event", "First actor choice accepted"),
    node(id.markerHolderTest, "judge_test", "Only marker holder sees exactly two choices"),
    node(id.applyTest, "judge_test", "Chosen seat becomes active without moving marker"),
    node(id.freshChoiceTest, "judge_test", "Each phase handoff requires a fresh choice"),
    node(id.replayTest, "judge_test", "Ed25519 replay survives HMAC rotation"),
    node(id.relationshipTest, "judge_test", "Missing state or Judge edge blocks contract"),
    node(id.currentSliceRelease, "slice_release", "Existing executor contract closure v1"),
    node(id.currentCatalogueRelease, "catalogue_release",
      `Retained Slice 49 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release",
      `Retained Slice 49 runtime ${runtimeHash}`),
  ];
  const relations = [
    edge(executor, "reads", id.round, "phase_initiative_state_contract_v1"),
    edge(executor, "reads", id.phase, "phase_initiative_state_contract_v1"),
    edge(executor, "reads", id.players, "phase_initiative_state_contract_v1"),
    edge(executor, "reads", id.firstPlayerSideKey,
      "phase_initiative_state_contract_v1"),
    edge(executor, "reads", id.phaseFirstActorByRound,
      "phase_initiative_state_contract_v1"),
    edge(executor, "exposes", id.choiceSet, "phase_initiative_exact_domain_v1"),
    edge(id.round, "derives", id.phaseKey, "phase_choice_key_v1"),
    edge(id.phase, "derives", id.phaseKey, "phase_choice_key_v1"),
    edge(id.phaseKey, "parameterized_by", id.choiceSet, "phase_choice_key_v1"),
    edge(id.firstPlayerSideKey, "gates", id.choiceSet, "marker_holder_gate_v1"),
    edge(id.round, "invalidates", id.choiceSet,
      "phase_choice_state_invalidation_v1"),
    edge(id.phase, "invalidates", id.choiceSet,
      "phase_choice_state_invalidation_v1"),
    edge(id.firstPlayerSideKey, "invalidates", id.choiceSet,
      "phase_choice_state_invalidation_v1"),
    edge(id.phaseFirstActorByRound, "invalidates", id.choiceSet,
      "phase_choice_state_invalidation_v1"),
    edge(id.choiceSet, "includes", id.selfChoice, "phase_choice_denominator_v1"),
    edge(id.choiceSet, "includes", id.opponentChoice, "phase_choice_denominator_v1"),
    edge(id.choiceSet, "includes", id.actionType, "phase_choice_denominator_v1"),
    edge(id.selfChoice, "writes", id.phaseFirstActorByRound,
      "phase_initiative_apply_v1"),
    edge(id.selfChoice, "writes", id.activeSideKey, "phase_initiative_apply_v1"),
    edge(id.opponentChoice, "writes", id.phaseFirstActorByRound,
      "phase_initiative_apply_v1"),
    edge(id.opponentChoice, "writes", id.activeSideKey, "phase_initiative_apply_v1"),
    edge(id.selfChoice, "derives", id.chosenEvent, "phase_initiative_event_v1"),
    edge(id.opponentChoice, "derives", id.chosenEvent, "phase_initiative_event_v1"),
    edge(id.chosenEvent, "writes", id.log, "phase_initiative_event_v1"),
    edge(id.choiceSet, "verified_by", id.markerHolderTest,
      "phase_initiative_judge_v1"),
    edge(id.activeSideKey, "verified_by", id.applyTest,
      "phase_initiative_judge_v1"),
    edge(id.choiceSet, "verified_by", id.freshChoiceTest,
      "phase_initiative_judge_v1"),
    edge(id.chosenEvent, "verified_by", id.replayTest,
      "phase_initiative_judge_v1"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipTest,
      "phase_initiative_judge_v1"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "phase_contract_slice_ancestry_v1"),
    edge(id.previousCatalogueRelease, "retained_by", id.currentCatalogueRelease,
      "phase_contract_catalogue_ancestry_v1"),
    edge(id.previousRuntimeRelease, "retained_by", id.currentRuntimeRelease,
      "phase_contract_runtime_ancestry_v1"),
  ];
  const requiredProvenance = new Set([
    "phase_initiative_state_contract_v1",
    "phase_initiative_exact_domain_v1",
    "phase_choice_key_v1",
    "marker_holder_gate_v1",
    "phase_choice_state_invalidation_v1",
    "phase_choice_denominator_v1",
    "phase_initiative_apply_v1",
    "phase_initiative_event_v1",
    "phase_initiative_judge_v1",
    "phase_contract_slice_ancestry_v1",
    "phase_contract_catalogue_ancestry_v1",
    "phase_contract_runtime_ancestry_v1",
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
      OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: OFFICIAL_PHASE_INITIATIVE_RELATIONSHIP_SCOPE_ID,
        executorId: OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
        requiredNodeIds: [
          id.round,
          id.phase,
          id.players,
          id.firstPlayerSideKey,
          id.phaseFirstActorByRound,
          id.activeSideKey,
          id.phaseKey,
          id.choiceSet,
          id.selfChoice,
          id.opponentChoice,
          id.actionType,
          id.chosenEvent,
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
            from: id.firstPlayerSideKey,
            to: id.markerHolderTest,
            relationships: ["gates", "verified_by"],
            maxDepth: 2,
          },
          {
            from: id.firstPlayerSideKey,
            to: id.applyTest,
            relationships: ["gates", "includes", "writes", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.phaseFirstActorByRound,
            to: id.freshChoiceTest,
            relationships: ["invalidates", "verified_by"],
            maxDepth: 2,
          },
          {
            from: id.opponentChoice,
            to: id.replayTest,
            relationships: ["derives", "verified_by"],
            maxDepth: 2,
          },
        ],
        forbiddenPaths: [
          {
            from: id.activeSideKey,
            to: id.choiceSet,
            relationships: ["gates", "invalidates", "parameterized_by"],
            maxDepth: 4,
          },
          {
            from: id.selfChoice,
            to: id.firstPlayerSideKey,
            relationships: ["writes"],
            maxDepth: 2,
          },
          {
            from: id.opponentChoice,
            to: id.firstPlayerSideKey,
            relationships: ["writes"],
            maxDepth: 2,
          },
        ],
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
