import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";
import {
  OFFICIAL_ACTIVATION_PASS_ATOM_IDS,
  OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
  OFFICIAL_ACTIVATION_PASS_EXECUTOR_VERSION,
  OFFICIAL_ACTIVATION_PASS_TRANSITION_SCHEMA,
} from "./official-activation-pass-executor-v1.mjs";
import {
  verifyOfficialMovementHoldRuleSliceV1,
} from "./official-movement-hold-rule-slice-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_activation_pass_rule_slice_v1";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 3;
const TARGET_CANONICAL_IDS = Object.freeze([
  "canonical:combat-first-pass-priority",
  "canonical:first-passer-next-phase-marker",
  "canonical:first-passer-phase-three-marker",
  "canonical:first-passer-phase-two-marker",
  "canonical:general-first-player-phase-priority",
  "canonical:movement-first-pass-priority",
  "canonical:singleton:core-8-2-1-mandatory-pass:c3f3099c0aee",
  "canonical:singleton:core-8-2-1-optional-pass:ce1210ada5c9",
  "canonical:singleton:core-8-2-1-pass-lockout-and-completion:5000debbc056",
  "canonical:singleton:core-8-4-2-unactivated-unit-markers:d4d57b8ee9fb",
  "canonical:singleton:core-8-6-2-unactivated-assault-markers:3af601495352",
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

function phaseForCanonical(canonicalClauseId) {
  if ([
    "canonical:movement-first-pass-priority",
    "canonical:first-passer-phase-two-marker",
    "canonical:singleton:core-8-4-2-unactivated-unit-markers:d4d57b8ee9fb",
  ].includes(canonicalClauseId)) return "movement";
  if ([
    "canonical:combat-first-pass-priority",
    "canonical:first-passer-phase-three-marker",
    "canonical:singleton:core-8-6-2-unactivated-assault-markers:3af601495352",
  ].includes(canonicalClauseId)) return "assault";
  return "movement_or_assault";
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "activation-pass:");
  return {
    positiveFixtureIds: [`${slug}:optional-and-mandatory-pass`],
    negativeFixtureIds: [`${slug}:wrong-phase-seat-and-repeat-rejection`],
    interactionFixtureIds: [`${slug}:passed-opponent-consecutive-activation`],
    lifecycleFixtureIds: [`${slug}:marker-lockout-and-phase-handoff`],
    replayFixtureIds: [`${slug}:receipt-replay`],
    sourceDriftFixtureIds: [`${slug}:source-and-executor-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion, priority) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_activation_pass_source_clause_missing", atom.atomId);
  }
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_seat" },
    timing: {
      phase: phaseForCanonical(atom.canonicalClauseId),
      window: "activation_turn_or_phase_completion",
      priority,
    },
    preconditions: [
      {
        predicateId: "activation.phase_supports_general_pass",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "PASS_WRONG_PHASE",
      },
      {
        predicateId: "activation.seat_is_active",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "PASS_NOT_ACTIVE_SIDE",
      },
      {
        predicateId: "activation.seat_has_not_passed",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "PASS_ALREADY_PASSED",
      },
    ],
    legalSpace: { kind: "finite", actionType: "pass" },
    effect: {
      executorId: OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
      transitionSchema: OFFICIAL_ACTIVATION_PASS_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [
      "PASS_ACTION_INVALID",
      "PASS_ALREADY_PASSED",
      "PASS_NOT_ACTIVE_SIDE",
      "PASS_PHASE_STALE",
      "PASS_SIDE_REQUIRED",
      "PASS_STATE_INVALID",
      "PASS_WRONG_PHASE",
    ],
    dependencies: { rulesVersion, sourceSnapshotIds, atomIds: [] },
    evidence: evidence(atom.atomId),
  };
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

export function createOfficialActivationPassRuleSliceV1(input = {}) {
  const previousAudit = verifyOfficialMovementHoldRuleSliceV1({
    denominator: input.denominator,
    slice: input.previousSlice,
  });
  if (previousAudit.counts.executableRuleAtoms !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT) {
    fail("official_activation_pass_previous_slice_mismatch");
  }
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetAtomIds = new Set(OFFICIAL_ACTIVATION_PASS_ATOM_IDS);
  const observedCanonicalIds = [];
  let priority = 400;
  const atoms = base.atoms.map((atom) => {
    if (!targetAtomIds.has(atom.atomId)) return structuredClone(atom);
    observedCanonicalIds.push(atom.canonicalClauseId);
    priority += 10;
    return executableAtom(atom, clauseById, base.rulesVersion, priority);
  });
  if (!isDeepStrictEqual(observedCanonicalIds.sort(), [...TARGET_CANONICAL_IDS].sort())) {
    fail("official_activation_pass_target_atom_denominator_mismatch");
  }
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.3.0-official-activation-pass",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [
      ...structuredClone(base.executorManifest),
      {
        executorId: OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
        executorVersion: OFFICIAL_ACTIVATION_PASS_EXECUTOR_VERSION,
        actionTypes: ["pass"],
        transitionSchema: OFFICIAL_ACTIVATION_PASS_TRANSITION_SCHEMA,
      },
    ],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== 14
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_activation_pass_executable_catalogue_invalid");
  }
  const body = {
    schema: SLICE_SCHEMA,
    denominatorHash: input.denominator.denominatorHash,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: base.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_ACTIVATION_PASS_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorId: OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
    executorVersion: OFFICIAL_ACTIVATION_PASS_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_ACTIVATION_PASS_TRANSITION_SCHEMA,
    executableScope: "movement_hold_plus_movement_and_assault_pass",
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "movement_assault_pass_receipt_replay_passed",
      promotions: [],
      blocks: ["remaining_1012_rule_atoms_not_executable"],
      remainingRuleGaps: 1012,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "rule_skill_builder_prompt"],
      harnessToolsCalled: ["list_legal_actions", "preview_action", "apply_action", "replay_room"],
      uiTraceEvidence: "contract_only_device_ui_pending",
      agentDecisionEvidence: "pass_kind_and_phase_handoff_are_rules_owned_not_model_inferred",
      memoryTraceEvidence: "no_memory_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "source_catalogue_or_executor_drift_demotes_all_pass_atoms",
        "receipt_replay_or_phase_handoff_failure_quarantines_activation_pass",
      ],
      userVisibleChecks: [
        "legal_space_marks_pass_optional_or_mandatory",
        "preview_and_receipt_expose_phase_specific_rule_atom_lineage",
        "client_advance_phase_is_absent_from_movement_and_assault_legal_space",
      ],
    },
    rulesEligible: false,
    canAffectRules: true,
    replayEligible: true,
    ctx2skillPromotionEligible: false,
    rulesTruth: "movement_hold_and_movement_assault_pass",
    trainingTruth: false,
    blocks: [
      "remaining_rule_atom_executor_coverage_pending",
      "browser_and_device_ui_trace_pending",
      "training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialActivationPassRuleSliceV1(input = {}) {
  if (!object(input.slice) || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_activation_pass_slice_hash_mismatch");
  }
  const expected = createOfficialActivationPassRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) fail("official_activation_pass_slice_content_mismatch");
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_ACTIVATION_PASS_ATOM_IDS);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [atom.atomId, atom]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  return freezeDeep({
    valid: true,
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_ACTIVATION_PASS_ATOM_IDS],
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
    rulesTruth: "movement_hold_and_movement_assault_pass",
    trainingTruth: false,
  });
}
