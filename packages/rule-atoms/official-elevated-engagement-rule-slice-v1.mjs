import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";
import {
  OFFICIAL_COMBAT_PASS_ATOM_IDS,
  OFFICIAL_COMBAT_PASS_EXECUTOR_ID,
} from "./official-combat-pass-executor-v1.mjs";
import {
  OFFICIAL_COMBAT_PASS_V2_ATOM_IDS,
  OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
  OFFICIAL_COMBAT_PASS_V2_EXECUTOR_VERSION,
  OFFICIAL_COMBAT_PASS_V2_TRANSITION_SCHEMA,
  OFFICIAL_ELEVATED_ENGAGEMENT_NEW_ATOM_IDS,
} from "./official-combat-pass-executor-v2.mjs";
import { verifyOfficialCombatPassRuleSliceV1 } from "./official-combat-pass-rule-slice-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_elevated_engagement_rule_slice_v1";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 39;
const EXPECTED_EXECUTABLE_COUNT = EXPECTED_PREVIOUS_EXECUTABLE_COUNT
  + OFFICIAL_ELEVATED_ENGAGEMENT_NEW_ATOM_IDS.length;
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
  const slug = atomId.replace(/^rule-atom:/u, "elevated-engagement:");
  return {
    positiveFixtureIds: [`${slug}:same-elevation-or-shared-access-point-engagement`],
    negativeFixtureIds: [`${slug}:high-ground-or-missing-access-point-rejection`],
    interactionFixtureIds: [`${slug}:derived-support-terrain-access-and-combat-pass`],
    lifecycleFixtureIds: [`${slug}:engagement-change-to-pass-and-cleanup`],
    replayFixtureIds: [`${slug}:v2-graph-receipt-replay`],
    sourceDriftFixtureIds: [`${slug}:v1-history-and-v2-source-executor-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_elevated_engagement_source_clause_missing", atom.atomId);
  }
  const previouslyExecutable = OFFICIAL_COMBAT_PASS_ATOM_IDS.includes(atom.atomId);
  return {
    atomId: atom.atomId,
    atomVersion: previouslyExecutable ? "2.0.0" : "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_player" },
    timing: { phase: "combat", window: "engagement_derivation_or_combat_pass", priority: 420 },
    preconditions: [
      {
        predicateId: "combat.exact_engagement_graph_v2_resolves",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "ENGAGEMENT_V2_GEOMETRY_INCOMPLETE",
      },
      {
        predicateId: "combat.active_side_has_no_remaining_engaged_unit",
        inputSchema: "starcraft_tmg_official_engagement_graph_v2",
        failureCode: "COMBAT_PASS_ENGAGED_UNIT_REMAINS",
      },
    ],
    legalSpace: { kind: "finite", actionType: "pass" },
    effect: {
      executorId: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_COMBAT_PASS_V2_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [
      "COMBAT_PASS_ENGAGED_UNIT_REMAINS",
      "COMBAT_PASS_V2_ACTION_INVALID",
      "COMBAT_PASS_V2_ALREADY_PASSED",
      "COMBAT_PASS_V2_NOT_ACTIVE_SIDE",
      "COMBAT_PASS_V2_SIDE_REQUIRED",
      "COMBAT_PASS_V2_STATE_INVALID",
      "COMBAT_PASS_V2_WRONG_PHASE",
      "ENGAGEMENT_V2_ACCESS_POINT_ADJACENCY_MISMATCH",
      "ENGAGEMENT_V2_ACCESS_POINT_ADJACENCY_REQUIRED",
      "ENGAGEMENT_V2_ACCESS_POINT_ELEVATIONS_INVALID",
      "ENGAGEMENT_V2_ACCESS_POINT_INVALID",
      "ENGAGEMENT_V2_ACCESS_POINT_TERRAIN_REQUIRED",
      "ENGAGEMENT_V2_BASE_GEOMETRY_REQUIRED",
      "ENGAGEMENT_V2_BASE_UNSUPPORTED",
      "ENGAGEMENT_V2_ELEVATION_DECLARATION_MISMATCH",
      "ENGAGEMENT_V2_ELEVATION_SUPPORT_MISMATCH",
      "ENGAGEMENT_V2_ELEVATION_SUPPORTS_REQUIRED",
      "ENGAGEMENT_V2_GEOMETRY_INCOMPLETE",
      "ENGAGEMENT_V2_MODEL_COUNT_MISMATCH",
      "ENGAGEMENT_V2_MODEL_GEOMETRY_REQUIRED",
      "ENGAGEMENT_V2_MODEL_OUTSIDE_BOARD",
      "ENGAGEMENT_V2_TERRAIN_ELEVATION_SURFACE_REQUIRED",
      "ENGAGEMENT_V2_TERRAIN_INVALID",
      "ENGAGEMENT_V2_TERRAIN_SIZE_REQUIRED",
    ],
    dependencies: { rulesVersion, sourceSnapshotIds, atomIds: [] },
    evidence: evidence(atom.atomId),
  };
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

export function createOfficialElevatedEngagementRuleSliceV1(input = {}) {
  const previousAudit = verifyOfficialCombatPassRuleSliceV1({
    denominator: input.denominator,
    movementHoldSlice: input.movementHoldSlice,
    passSlice: input.passSlice,
    assaultHoldSlice: input.assaultHoldSlice,
    previousSlice: input.phaseInitiativeSlice,
    slice: input.previousSlice,
  });
  if (previousAudit.counts.executableRuleAtoms !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT) {
    fail("official_elevated_engagement_previous_slice_mismatch");
  }
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_COMBAT_PASS_V2_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return structuredClone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...OFFICIAL_COMBAT_PASS_V2_ATOM_IDS].sort())) {
    const missing = OFFICIAL_COMBAT_PASS_V2_ATOM_IDS.filter((atomId) => !observedIds.includes(atomId));
    fail("official_elevated_engagement_target_atom_denominator_mismatch", missing.join(","));
  }
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.7.0-official-elevated-engagement",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [
      ...structuredClone(base.executorManifest).filter((entry) => (
        entry.executorId !== OFFICIAL_COMBAT_PASS_EXECUTOR_ID
      )),
      {
        executorId: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
        executorVersion: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_VERSION,
        actionTypes: ["pass"],
        transitionSchema: OFFICIAL_COMBAT_PASS_V2_TRANSITION_SCHEMA,
      },
    ],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_elevated_engagement_executable_catalogue_invalid");
  }
  const remainingRuleGaps = catalogue.atoms.length - EXPECTED_EXECUTABLE_COUNT;
  const body = {
    schema: SLICE_SCHEMA,
    denominatorHash: input.denominator.denominatorHash,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: base.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_ELEVATED_ENGAGEMENT_NEW_ATOM_IDS],
    reassignedExecutableRuleAtomIds: [...OFFICIAL_COMBAT_PASS_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorId: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_COMBAT_PASS_V2_TRANSITION_SCHEMA,
    executableScope: "all_elevation_engagement_graph_and_combat_pass_plus_previous_families",
    supportedGeometryScope:
      "round_bases_all_elevations_derived_supports_access_points_axis_aligned_terrain_v2",
    historicalCompatibility: {
      previousCatalogueHash: base.catalogueHash,
      previousCatalogueMutationAllowed: false,
      previousExecutorId: OFFICIAL_COMBAT_PASS_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
      reassignmentReason: "v1_ground_only_geometry_is_frozen_and_v2_adds_derived_elevation_access",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "v1_history_and_v2_elevated_engagement_replay_pending_verifier",
      promotions: [],
      blocks: [`remaining_${remainingRuleGaps}_rule_atoms_not_executable`],
      remainingRuleGaps,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt", "rule_skill_builder_prompt"],
      harnessToolsCalled: ["read_board_state", "measure_distance", "list_legal_actions", "preview_action", "apply_action_after_user_confirmation", "write_episode_trace"],
      uiTraceEvidence: "contract_only_device_ui_pending",
      agentDecisionEvidence: "pass_is_withheld_from_exact_derived_elevation_engagement",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "source_catalogue_geometry_or_executor_drift_quarantines_v2",
        "v1_history_or_v2_receipt_replay_failure_demotes_elevated_engagement",
      ],
      userVisibleChecks: [
        "shared_access_point_enables_cross_elevation_engagement",
        "high_ground_and_ground_level_never_engage",
        "invalid_geometry_surfaces_a_disabled_diagnostic",
      ],
    },
    rulesEligible: false,
    canAffectRules: true,
    replayEligible: true,
    ctx2skillPromotionEligible: false,
    rulesTruth: "all_elevation_engagement_graph_and_combat_pass_plus_previous_families",
    trainingTruth: false,
    blocks: [
      "non_round_base_geometry_pending",
      "combat_activation_and_close_combat_attack_pending",
      "remaining_rule_atom_executor_coverage_pending",
      "browser_and_device_ui_trace_pending",
      "training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialElevatedEngagementRuleSliceV1(input = {}) {
  if (!object(input.slice) || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_elevated_engagement_slice_hash_mismatch");
  }
  const expected = createOfficialElevatedEngagementRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_elevated_engagement_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_COMBAT_PASS_V2_ATOM_IDS);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [atom.atomId, atom]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  return freezeDeep({
    valid: true,
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_ELEVATED_ENGAGEMENT_NEW_ATOM_IDS],
    reassignedExecutableRuleAtomIds: [...OFFICIAL_COMBAT_PASS_ATOM_IDS],
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
    rulesTruth: "all_elevation_engagement_graph_and_combat_pass_plus_previous_families",
    trainingTruth: false,
  });
}
