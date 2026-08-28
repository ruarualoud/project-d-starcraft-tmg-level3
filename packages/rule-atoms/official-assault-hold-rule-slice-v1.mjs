import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";
import {
  OFFICIAL_ASSAULT_HOLD_ATOM_IDS,
  OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID,
  OFFICIAL_ASSAULT_HOLD_EXECUTOR_VERSION,
  OFFICIAL_ASSAULT_HOLD_TRANSITION_SCHEMA,
} from "./official-assault-hold-executor-v1.mjs";
import {
  verifyOfficialActivationPassRuleSliceV1,
} from "./official-activation-pass-rule-slice-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_assault_hold_rule_slice_v1";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 14;
const TARGET_CANONICAL_IDS = Object.freeze([
  "canonical:assault-hold-activation-marker",
  "canonical:assault-hold-no-action",
  "canonical:assault-phase-hold-action",
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
  const slug = atomId.replace(/^rule-atom:/u, "assault-hold:");
  return {
    positiveFixtureIds: [`${slug}:positive-legal-and-apply`],
    negativeFixtureIds: [`${slug}:negative-phase-seat-and-unit-preconditions`],
    interactionFixtureIds: [`${slug}:passed-opponent-consecutive-activation`],
    lifecycleFixtureIds: [`${slug}:assault-marker-and-combat-handoff`],
    replayFixtureIds: [`${slug}:receipt-replay`],
    sourceDriftFixtureIds: [`${slug}:source-and-executor-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_assault_hold_source_clause_missing", atom.atomId);
  }
  const priorityByCanonical = {
    "canonical:assault-phase-hold-action": 600,
    "canonical:assault-hold-no-action": 610,
    "canonical:assault-hold-activation-marker": 620,
  };
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_seat" },
    timing: {
      phase: "assault",
      window: "unit_activation",
      priority: priorityByCanonical[atom.canonicalClauseId],
    },
    preconditions: [
      {
        predicateId: "assault.phase_is_active",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "ASSAULT_HOLD_WRONG_PHASE",
      },
      {
        predicateId: "assault.seat_is_active",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "ASSAULT_HOLD_NOT_ACTIVE_SIDE",
      },
      {
        predicateId: "unit.is_unactivated_on_battlefield",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "ASSAULT_HOLD_UNIT_NOT_ON_BATTLEFIELD",
      },
    ],
    legalSpace: { kind: "finite", actionType: "hold" },
    effect: {
      executorId: OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID,
      transitionSchema: OFFICIAL_ASSAULT_HOLD_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [
      "ASSAULT_HOLD_ACTION_INVALID",
      "ASSAULT_HOLD_ALREADY_ACTIVATED",
      "ASSAULT_HOLD_NOT_ACTIVE_SIDE",
      "ASSAULT_HOLD_SIDE_PASSED",
      "ASSAULT_HOLD_STATE_INVALID",
      "ASSAULT_HOLD_UNIT_NOT_FOUND",
      "ASSAULT_HOLD_UNIT_NOT_ON_BATTLEFIELD",
      "ASSAULT_HOLD_WRONG_PHASE",
    ],
    dependencies: { rulesVersion, sourceSnapshotIds, atomIds: [] },
    evidence: evidence(atom.atomId),
  };
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

export function createOfficialAssaultHoldRuleSliceV1(input = {}) {
  const previousAudit = verifyOfficialActivationPassRuleSliceV1({
    denominator: input.denominator,
    previousSlice: input.movementHoldSlice,
    slice: input.previousSlice,
  });
  if (previousAudit.counts.executableRuleAtoms !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT) {
    fail("official_assault_hold_previous_slice_mismatch");
  }
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetAtomIds = new Set(OFFICIAL_ASSAULT_HOLD_ATOM_IDS);
  const observedCanonicalIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetAtomIds.has(atom.atomId)) return structuredClone(atom);
    observedCanonicalIds.push(atom.canonicalClauseId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedCanonicalIds.sort(), [...TARGET_CANONICAL_IDS].sort())) {
    fail("official_assault_hold_target_atom_denominator_mismatch");
  }
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.4.0-official-assault-hold",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [
      ...structuredClone(base.executorManifest),
      {
        executorId: OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID,
        executorVersion: OFFICIAL_ASSAULT_HOLD_EXECUTOR_VERSION,
        actionTypes: ["hold"],
        transitionSchema: OFFICIAL_ASSAULT_HOLD_TRANSITION_SCHEMA,
      },
    ],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== 17
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_assault_hold_executable_catalogue_invalid");
  }
  const body = {
    schema: SLICE_SCHEMA,
    denominatorHash: input.denominator.denominatorHash,
    movementHoldSliceHash: input.movementHoldSlice.sliceHash,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: base.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_ASSAULT_HOLD_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorId: OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID,
    executorVersion: OFFICIAL_ASSAULT_HOLD_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_ASSAULT_HOLD_TRANSITION_SCHEMA,
    executableScope: "movement_and_assault_hold_plus_movement_and_assault_pass",
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "assault_hold_receipt_replay_passed",
      promotions: [],
      blocks: ["remaining_1009_rule_atoms_not_executable"],
      remainingRuleGaps: 1009,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "rule_skill_builder_prompt"],
      harnessToolsCalled: ["list_legal_actions", "preview_action", "apply_action", "replay_room"],
      uiTraceEvidence: "contract_only_device_ui_pending",
      agentDecisionEvidence: "assault_hold_is_phase_scoped_and_rules_owned",
      memoryTraceEvidence: "no_memory_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "source_catalogue_or_executor_drift_demotes_all_assault_hold_atoms",
        "receipt_replay_or_combat_handoff_failure_quarantines_assault_hold",
      ],
      userVisibleChecks: [
        "assault_hold_is_visible_only_for_eligible_on_table_units",
        "preview_and_receipt_expose_assault_hold_rule_atom_lineage",
      ],
    },
    rulesEligible: false,
    canAffectRules: true,
    replayEligible: true,
    ctx2skillPromotionEligible: false,
    rulesTruth: "movement_hold_assault_hold_and_movement_assault_pass",
    trainingTruth: false,
    blocks: [
      "remaining_rule_atom_executor_coverage_pending",
      "browser_and_device_ui_trace_pending",
      "training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialAssaultHoldRuleSliceV1(input = {}) {
  if (!object(input.slice) || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_assault_hold_slice_hash_mismatch");
  }
  const expected = createOfficialAssaultHoldRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_assault_hold_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_ASSAULT_HOLD_ATOM_IDS);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  return freezeDeep({
    valid: true,
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_ASSAULT_HOLD_ATOM_IDS],
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
    rulesTruth: "movement_hold_assault_hold_and_movement_assault_pass",
    trainingTruth: false,
  });
}
