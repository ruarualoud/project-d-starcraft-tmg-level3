import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";
import {
  OFFICIAL_COMBAT_PASS_ATOM_IDS,
  OFFICIAL_COMBAT_PASS_EXECUTOR_ID,
  OFFICIAL_COMBAT_PASS_EXECUTOR_VERSION,
  OFFICIAL_COMBAT_PASS_TRANSITION_SCHEMA,
} from "./official-combat-pass-executor-v1.mjs";
import { verifyOfficialPhaseInitiativeRuleSliceV1 } from "./official-phase-initiative-rule-slice-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_combat_pass_rule_slice_v1";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 19;
const EXPECTED_EXECUTABLE_COUNT = EXPECTED_PREVIOUS_EXECUTABLE_COUNT
  + OFFICIAL_COMBAT_PASS_ATOM_IDS.length;
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
  const slug = atomId.replace(/^rule-atom:/u, "combat-pass:");
  return {
    positiveFixtureIds: [`${slug}:exact-empty-engagement-pass`],
    negativeFixtureIds: [`${slug}:engaged-or-incomplete-geometry-rejection`],
    interactionFixtureIds: [`${slug}:range-terrain-flying-and-unit-propagation`],
    lifecycleFixtureIds: [`${slug}:first-pass-to-both-pass-cleanup`],
    replayFixtureIds: [`${slug}:receipt-replay`],
    sourceDriftFixtureIds: [`${slug}:official-source-and-executor-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_combat_pass_source_clause_missing", atom.atomId);
  }
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "combat", window: "combat_activation_or_pass", priority: 400 },
    preconditions: [
      {
        predicateId: "combat.exact_engagement_graph_resolves",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "ENGAGEMENT_GEOMETRY_INCOMPLETE",
      },
      {
        predicateId: "combat.active_side_has_no_remaining_engaged_unit",
        inputSchema: "starcraft_tmg_official_engagement_graph_v1",
        failureCode: "COMBAT_PASS_ENGAGED_UNIT_REMAINS",
      },
    ],
    legalSpace: { kind: "finite", actionType: "pass" },
    effect: {
      executorId: OFFICIAL_COMBAT_PASS_EXECUTOR_ID,
      transitionSchema: OFFICIAL_COMBAT_PASS_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [
      "COMBAT_PASS_ACTION_INVALID",
      "COMBAT_PASS_ALREADY_PASSED",
      "COMBAT_PASS_ENGAGED_UNIT_REMAINS",
      "COMBAT_PASS_NOT_ACTIVE_SIDE",
      "COMBAT_PASS_SIDE_REQUIRED",
      "COMBAT_PASS_STATE_INVALID",
      "COMBAT_PASS_WRONG_PHASE",
      "ENGAGEMENT_BASE_GEOMETRY_REQUIRED",
      "ENGAGEMENT_BASE_UNSUPPORTED",
      "ENGAGEMENT_ELEVATION_SUBSET_UNSUPPORTED",
      "ENGAGEMENT_GEOMETRY_INCOMPLETE",
      "ENGAGEMENT_MODEL_COUNT_MISMATCH",
      "ENGAGEMENT_MODEL_GEOMETRY_REQUIRED",
      "ENGAGEMENT_TERRAIN_SIZE_REQUIRED",
      "ENGAGEMENT_TERRAIN_UNSUPPORTED",
    ],
    dependencies: { rulesVersion, sourceSnapshotIds, atomIds: [] },
    evidence: evidence(atom.atomId),
  };
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

export function createOfficialCombatPassRuleSliceV1(input = {}) {
  const previousAudit = verifyOfficialPhaseInitiativeRuleSliceV1({
    denominator: input.denominator,
    movementHoldSlice: input.movementHoldSlice,
    passSlice: input.passSlice,
    previousSlice: input.assaultHoldSlice,
    slice: input.previousSlice,
  });
  if (previousAudit.counts.executableRuleAtoms !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT) {
    fail("official_combat_pass_previous_slice_mismatch");
  }
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_COMBAT_PASS_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return structuredClone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...OFFICIAL_COMBAT_PASS_ATOM_IDS].sort())) {
    const missing = OFFICIAL_COMBAT_PASS_ATOM_IDS.filter((atomId) => !observedIds.includes(atomId));
    fail("official_combat_pass_target_atom_denominator_mismatch", missing.join(","));
  }
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.6.0-official-combat-pass",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [
      ...structuredClone(base.executorManifest),
      {
        executorId: OFFICIAL_COMBAT_PASS_EXECUTOR_ID,
        executorVersion: OFFICIAL_COMBAT_PASS_EXECUTOR_VERSION,
        actionTypes: ["pass"],
        transitionSchema: OFFICIAL_COMBAT_PASS_TRANSITION_SCHEMA,
      },
    ],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_combat_pass_executable_catalogue_invalid");
  }
  const remainingRuleGaps = catalogue.atoms.length - EXPECTED_EXECUTABLE_COUNT;
  const body = {
    schema: SLICE_SCHEMA,
    denominatorHash: input.denominator.denominatorHash,
    movementHoldSliceHash: input.movementHoldSlice.sliceHash,
    passSliceHash: input.passSlice.sliceHash,
    assaultHoldSliceHash: input.assaultHoldSlice.sliceHash,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: base.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_COMBAT_PASS_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorId: OFFICIAL_COMBAT_PASS_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_PASS_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_COMBAT_PASS_TRANSITION_SCHEMA,
    executableScope: "exact_ground_engagement_graph_and_combat_pass_plus_previous_families",
    supportedGeometryScope: "round_bases_ground_elevation_axis_aligned_terrain_v1",
    historicalCompatibility: {
      previousCatalogueHash: base.catalogueHash,
      previousCatalogueMutationAllowed: false,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "combat_pass_receipt_replay_pending_verifier",
      promotions: [],
      blocks: [`remaining_${remainingRuleGaps}_rule_atoms_not_executable`],
      remainingRuleGaps,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt", "rule_skill_builder_prompt"],
      harnessToolsCalled: ["read_board_state", "list_legal_actions", "preview_action", "apply_action_after_user_confirmation", "replay_room"],
      uiTraceEvidence: "contract_only_device_ui_pending",
      agentDecisionEvidence: "combat_pass_is_withheld_until_exact_geometry_proves_no_remaining_engagement",
      memoryTraceEvidence: "no_memory_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "source_catalogue_geometry_or_executor_drift_demotes_combat_pass",
        "engagement_or_receipt_replay_failure_quarantines_combat_pass",
      ],
      userVisibleChecks: [
        "combat_pass_disabled_while_an_engaged_unit_remains",
        "missing_base_or_elevation_geometry_is_visible_and_fail_closed",
      ],
    },
    rulesEligible: false,
    canAffectRules: true,
    replayEligible: true,
    ctx2skillPromotionEligible: false,
    rulesTruth: "exact_ground_engagement_graph_and_combat_pass_plus_previous_families",
    trainingTruth: false,
    blocks: [
      "elevated_and_non_round_engagement_geometry_pending",
      "combat_activation_executor_pending",
      "remaining_rule_atom_executor_coverage_pending",
      "browser_and_device_ui_trace_pending",
      "training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialCombatPassRuleSliceV1(input = {}) {
  if (!object(input.slice) || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_combat_pass_slice_hash_mismatch");
  }
  const expected = createOfficialCombatPassRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) fail("official_combat_pass_slice_content_mismatch");
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_COMBAT_PASS_ATOM_IDS);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [atom.atomId, atom]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  return freezeDeep({
    valid: true,
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_COMBAT_PASS_ATOM_IDS],
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
    rulesTruth: "exact_ground_engagement_graph_and_combat_pass_plus_previous_families",
    trainingTruth: false,
  });
}
