import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";
import { verifyOfficialAssaultHoldRuleSliceV1 } from "./official-assault-hold-rule-slice-v1.mjs";
import {
  OFFICIAL_PHASE_INITIATIVE_ATOM_IDS,
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION,
  OFFICIAL_PHASE_INITIATIVE_TRANSITION_SCHEMA,
} from "./official-phase-initiative-executor-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_phase_initiative_rule_slice_v1";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 17;
const PREVIOUSLY_EXECUTABLE_ATOM_IDS = Object.freeze([
  "rule-atom:general-first-player-phase-priority",
]);
const NEWLY_EXECUTABLE_ATOM_IDS = Object.freeze(OFFICIAL_PHASE_INITIATIVE_ATOM_IDS.filter((atomId) => (
  !PREVIOUSLY_EXECUTABLE_ATOM_IDS.includes(atomId)
)));
const TARGET_CANONICAL_IDS = Object.freeze([
  "canonical:combat-first-player-priority",
  "canonical:general-first-player-phase-priority",
  "canonical:singleton:core-11-first-player-phase-activation-choice:3919d6d8e24b",
]);
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "phase-initiative:");
  return {
    positiveFixtureIds: [`${slug}:marker-holder-selects-either-seat`],
    negativeFixtureIds: [`${slug}:non-holder-stale-phase-and-repeat-rejection`],
    interactionFixtureIds: [`${slug}:movement-assault-combat-phase-handoff`],
    lifecycleFixtureIds: [`${slug}:pending-choice-to-active-seat`],
    replayFixtureIds: [`${slug}:receipt-replay`],
    sourceDriftFixtureIds: [`${slug}:source-and-executor-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_phase_initiative_source_clause_missing", atom.atomId);
  }
  const priorityByCanonical = {
    "canonical:general-first-player-phase-priority": 300,
    "canonical:singleton:core-11-first-player-phase-activation-choice:3919d6d8e24b": 310,
    "canonical:combat-first-player-priority": 320,
  };
  return {
    atomId: atom.atomId,
    atomVersion: PREVIOUSLY_EXECUTABLE_ATOM_IDS.includes(atom.atomId) ? "2.0.0" : "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "first_player_marker_holder" },
    timing: {
      phase: "movement_assault_or_combat",
      window: "phase_first_activation_choice",
      priority: priorityByCanonical[atom.canonicalClauseId],
    },
    preconditions: [
      {
        predicateId: "phase.supports_alternating_activation",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "PHASE_INITIATIVE_WRONG_PHASE",
      },
      {
        predicateId: "first_player.marker_holder_controls_choice",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "PHASE_INITIATIVE_NOT_MARKER_HOLDER",
      },
      {
        predicateId: "phase.first_actor_choice_pending",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "PHASE_INITIATIVE_ALREADY_CHOSEN",
      },
    ],
    legalSpace: { kind: "finite", actionType: "choose_first_actor" },
    effect: {
      executorId: OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
      transitionSchema: OFFICIAL_PHASE_INITIATIVE_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [
      "PHASE_INITIATIVE_ACTION_INVALID",
      "PHASE_INITIATIVE_ALREADY_CHOSEN",
      "PHASE_INITIATIVE_MARKER_HOLDER_INVALID",
      "PHASE_INITIATIVE_NOT_MARKER_HOLDER",
      "PHASE_INITIATIVE_SIDE_REQUIRED",
      "PHASE_INITIATIVE_STATE_INVALID",
      "PHASE_INITIATIVE_TARGET_INVALID",
      "PHASE_INITIATIVE_WRONG_PHASE",
    ],
    dependencies: { rulesVersion, sourceSnapshotIds, atomIds: [] },
    evidence: evidence(atom.atomId),
  };
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

export function createOfficialPhaseInitiativeRuleSliceV1(input = {}) {
  const previousAudit = verifyOfficialAssaultHoldRuleSliceV1({
    denominator: input.denominator,
    movementHoldSlice: input.movementHoldSlice,
    previousSlice: input.passSlice,
    slice: input.previousSlice,
  });
  if (previousAudit.counts.executableRuleAtoms !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT) {
    fail("official_phase_initiative_previous_slice_mismatch");
  }
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetAtomIds = new Set(OFFICIAL_PHASE_INITIATIVE_ATOM_IDS);
  const observedCanonicalIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetAtomIds.has(atom.atomId)) return structuredClone(atom);
    observedCanonicalIds.push(atom.canonicalClauseId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedCanonicalIds.sort(), [...TARGET_CANONICAL_IDS].sort())) {
    fail("official_phase_initiative_target_atom_denominator_mismatch");
  }
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.5.0-official-phase-initiative",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [
      ...structuredClone(base.executorManifest),
      {
        executorId: OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
        executorVersion: OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION,
        actionTypes: ["choose_first_actor"],
        transitionSchema: OFFICIAL_PHASE_INITIATIVE_TRANSITION_SCHEMA,
      },
    ],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== 19
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_phase_initiative_executable_catalogue_invalid");
  }
  const body = {
    schema: SLICE_SCHEMA,
    denominatorHash: input.denominator.denominatorHash,
    movementHoldSliceHash: input.movementHoldSlice.sliceHash,
    passSliceHash: input.passSlice.sliceHash,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: base.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...NEWLY_EXECUTABLE_ATOM_IDS],
    reassignedExecutableRuleAtomIds: [...PREVIOUSLY_EXECUTABLE_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorId: OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_PHASE_INITIATIVE_TRANSITION_SCHEMA,
    executableScope: "phase_first_actor_choice_plus_previous_hold_and_pass",
    historicalCompatibility: {
      previousCatalogueHash: base.catalogueHash,
      previousCatalogueMutationAllowed: false,
      reassignmentReason: "general_priority_was_not_a_pass_effect",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "phase_initiative_receipt_replay_passed",
      promotions: [],
      blocks: ["remaining_1007_rule_atoms_not_executable"],
      remainingRuleGaps: 1007,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "rule_skill_builder_prompt"],
      harnessToolsCalled: ["list_legal_actions", "preview_action", "apply_action", "replay_room"],
      uiTraceEvidence: "contract_only_device_ui_pending",
      agentDecisionEvidence: "marker_holder_choice_is_legal_space_not_runtime_default",
      memoryTraceEvidence: "no_memory_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "source_catalogue_or_executor_drift_demotes_phase_initiative",
        "receipt_replay_or_phase_handoff_failure_quarantines_phase_initiative",
      ],
      userVisibleChecks: [
        "marker_holder_can_choose_either_seat",
        "unit_actions_are_hidden_until_phase_choice_is_applied",
      ],
    },
    rulesEligible: false,
    canAffectRules: true,
    replayEligible: true,
    ctx2skillPromotionEligible: false,
    rulesTruth: "phase_first_actor_choice_plus_previous_hold_and_pass",
    trainingTruth: false,
    blocks: [
      "remaining_rule_atom_executor_coverage_pending",
      "browser_and_device_ui_trace_pending",
      "training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialPhaseInitiativeRuleSliceV1(input = {}) {
  if (!object(input.slice) || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_phase_initiative_slice_hash_mismatch");
  }
  const expected = createOfficialPhaseInitiativeRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_phase_initiative_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_PHASE_INITIATIVE_ATOM_IDS);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [atom.atomId, atom]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  return freezeDeep({
    valid: true,
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    newlyExecutableRuleAtomIds: [...NEWLY_EXECUTABLE_ATOM_IDS],
    reassignedExecutableRuleAtomIds: [...PREVIOUSLY_EXECUTABLE_ATOM_IDS],
    executableRuleAtomIds: input.slice.catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "phase_first_actor_choice_plus_previous_hold_and_pass",
    trainingTruth: false,
  });
}
