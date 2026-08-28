import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";
import {
  OFFICIAL_MOVEMENT_HOLD_ATOM_IDS,
  OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID,
  OFFICIAL_MOVEMENT_HOLD_EXECUTOR_VERSION,
  OFFICIAL_MOVEMENT_HOLD_TRANSITION_SCHEMA,
} from "./official-movement-hold-executor-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_movement_hold_rule_slice_v1";
const DENOMINATOR_SCHEMA = "starcraft_tmg_official_canonical_rule_atom_denominator_v1";
const EXPECTED_DENOMINATOR_HASH = "e46363ab812559782900c9acc0ab21ce20866250acf096b13b533733c94d10f1";
const TARGET_CANONICAL_IDS = Object.freeze([
  "canonical:movement-hold-activation-state",
  "canonical:movement-hold-no-action",
  "canonical:movement-phase-hold-action",
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

function verifyDenominator(denominator) {
  if (!object(denominator) || denominator.schema !== DENOMINATOR_SCHEMA
    || hashStarcraftTmgContract(without(denominator, ["denominatorHash"]))
      !== denominator.denominatorHash
    || denominator.denominatorHash !== EXPECTED_DENOMINATOR_HASH
    || denominator.ruleAtomMappingComplete !== true
    || denominator.executableRuleAtomCount !== 0
    || denominator.rulesEligible !== false
    || denominator.trainingTruth !== false) {
    fail("official_movement_hold_denominator_dependency_mismatch");
  }
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "movement-hold:");
  return {
    positiveFixtureIds: [`${slug}:positive-legal-and-apply`],
    negativeFixtureIds: [`${slug}:negative-preconditions`],
    interactionFixtureIds: [`${slug}:burrowed-no-op-interaction`],
    lifecycleFixtureIds: [`${slug}:activation-marker-lifecycle`],
    replayFixtureIds: [`${slug}:receipt-replay`],
    sourceDriftFixtureIds: [`${slug}:source-and-executor-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_movement_hold_source_clause_missing", atom.atomId);
  }
  const priorityByCanonical = {
    "canonical:movement-phase-hold-action": 100,
    "canonical:movement-hold-no-action": 200,
    "canonical:movement-hold-activation-state": 300,
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
      phase: "movement",
      window: "unit_activation",
      priority: priorityByCanonical[atom.canonicalClauseId],
    },
    preconditions: [
      {
        predicateId: "movement.phase_is_active",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "HOLD_WRONG_PHASE",
      },
      {
        predicateId: "movement.seat_is_active",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "HOLD_NOT_ACTIVE_SIDE",
      },
      {
        predicateId: "unit.is_unactivated_on_battlefield",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "HOLD_UNIT_NOT_ON_BATTLEFIELD",
      },
    ],
    legalSpace: { kind: "finite", actionType: "hold" },
    effect: {
      executorId: OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID,
      transitionSchema: OFFICIAL_MOVEMENT_HOLD_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [
      "HOLD_ACTION_INVALID",
      "HOLD_ALREADY_ACTIVATED",
      "HOLD_NOT_ACTIVE_SIDE",
      "HOLD_SIDE_PASSED",
      "HOLD_UNIT_NOT_FOUND",
      "HOLD_UNIT_NOT_ON_BATTLEFIELD",
      "HOLD_WRONG_PHASE",
    ],
    dependencies: { rulesVersion, sourceSnapshotIds, atomIds: [] },
    evidence: evidence(atom.atomId),
  };
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

export function createOfficialMovementHoldRuleSliceV1(input = {}) {
  verifyDenominator(input.denominator);
  const base = input.denominator.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetAtomIds = new Set(OFFICIAL_MOVEMENT_HOLD_ATOM_IDS);
  const observedCanonicalIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetAtomIds.has(atom.atomId)) return structuredClone(atom);
    observedCanonicalIds.push(atom.canonicalClauseId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedCanonicalIds.sort(), [...TARGET_CANONICAL_IDS].sort())) {
    fail("official_movement_hold_target_atom_denominator_mismatch");
  }
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.2.0-official-movement-hold",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [{
      executorId: OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID,
      executorVersion: OFFICIAL_MOVEMENT_HOLD_EXECUTOR_VERSION,
      actionTypes: ["hold"],
      transitionSchema: OFFICIAL_MOVEMENT_HOLD_TRANSITION_SCHEMA,
    }],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== 3
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_movement_hold_executable_catalogue_invalid");
  }
  const body = {
    schema: SLICE_SCHEMA,
    denominatorHash: input.denominator.denominatorHash,
    previousCatalogueHash: base.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    executableRuleAtomIds: [...OFFICIAL_MOVEMENT_HOLD_ATOM_IDS].sort(),
    executorId: OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID,
    executorVersion: OFFICIAL_MOVEMENT_HOLD_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_MOVEMENT_HOLD_TRANSITION_SCHEMA,
    executableScope: "movement_phase_hold_only",
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "movement_hold_receipt_replay_passed",
      promotions: [],
      blocks: ["remaining_1023_rule_atoms_not_executable"],
      remainingRuleGaps: 1023,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "rule_skill_builder_prompt"],
      harnessToolsCalled: ["list_legal_actions", "preview_action", "apply_action", "replay_room"],
      uiTraceEvidence: "contract_only_device_ui_pending",
      agentDecisionEvidence: "legal_space_lineage_verified_no_model_decision_run",
      memoryTraceEvidence: "no_memory_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "source_catalogue_or_executor_drift_demotes_all_three_hold_atoms",
        "receipt_replay_failure_quarantines_movement_hold",
      ],
      userVisibleChecks: ["legal_space_preview_and_receipt_expose_rule_atom_and_executor_lineage"],
    },
    rulesEligible: false,
    canAffectRules: true,
    replayEligible: true,
    ctx2skillPromotionEligible: false,
    rulesTruth: "movement_hold_only",
    trainingTruth: false,
    blocks: [
      "remaining_rule_atom_executor_coverage_pending",
      "browser_and_device_ui_trace_pending",
      "training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialMovementHoldRuleSliceV1(input = {}) {
  if (!object(input.slice) || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_movement_hold_slice_hash_mismatch");
  }
  const expected = createOfficialMovementHoldRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) fail("official_movement_hold_slice_content_mismatch");
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_MOVEMENT_HOLD_ATOM_IDS);
  const previousById = new Map(input.denominator.catalogue.atoms.map((atom) => [atom.atomId, atom]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  return freezeDeep({
    valid: true,
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
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
    rulesTruth: "movement_hold_only",
    trainingTruth: false,
  });
}
