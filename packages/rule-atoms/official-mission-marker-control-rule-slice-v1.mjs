import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS,
  OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
  OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_VERSION,
  OFFICIAL_MISSION_MARKER_CONTROL_TRANSITION_SCHEMA,
} from "./official-mission-marker-control-executor-v1.mjs";
import { verifyOfficialOutOfCoherencyCloseRanksRuleSliceV1 } from "./official-out-of-coherency-close-ranks-rule-slice-v1.mjs";
import { OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_NEW_ATOM_IDS } from "./official-out-of-coherency-close-ranks-combat-executor-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_mission_marker_control_rule_slice_v1";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 128;
const EXPECTED_EXECUTABLE_COUNT = EXPECTED_PREVIOUS_EXECUTABLE_COUNT
  + OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS.length;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "MISSION_MARKER_BOARD_INVALID",
  "MISSION_MARKER_COHERENCY_STATUS_INVALID",
  "MISSION_MARKER_COHERENCY_STATUS_REQUIRED",
  "MISSION_MARKER_CONTROL_ACTION_INVALID",
  "MISSION_MARKER_CONTROL_ALREADY_DETERMINED",
  "MISSION_MARKER_CONTROL_FIRST_PLAYER_ONLY",
  "MISSION_MARKER_CONTROL_STATE_INVALID",
  "MISSION_MARKER_CONTROL_RESOLUTION_STALE",
  "MISSION_MARKER_CONTROL_RESULT_MISSING",
  "MISSION_MARKER_CONTROL_WRONG_PHASE",
  "MISSION_MARKER_COORDINATE_INVALID",
  "MISSION_MARKER_DATA_SNAPSHOT_MISMATCH",
  "MISSION_MARKER_DENOMINATOR_INVALID",
  "MISSION_MARKER_ELEVATION_INVALID",
  "MISSION_MARKER_ELEVATION_SCOPE_UNSUPPORTED",
  "MISSION_MARKER_FIRST_PLAYER_REQUIRED",
  "MISSION_MARKER_GEOMETRY_INCOMPLETE",
  "MISSION_MARKER_IDENTITY_INVALID",
  "MISSION_MARKER_LINE_OF_SIGHT_TERRAIN_SCOPE_UNSUPPORTED",
  "MISSION_MARKER_MODEL_BASE_INVALID",
  "MISSION_MARKER_MODEL_BASE_SCOPE_UNSUPPORTED",
  "MISSION_MARKER_MODEL_COORDINATE_INVALID",
  "MISSION_MARKER_MODEL_COUNT_INVALID",
  "MISSION_MARKER_MODEL_COUNT_MISMATCH",
  "MISSION_MARKER_MODEL_ELEVATION_INVALID",
  "MISSION_MARKER_MODEL_ELEVATION_SCOPE_UNSUPPORTED",
  "MISSION_MARKER_MODEL_ID_INVALID",
  "MISSION_MARKER_MODEL_OUTSIDE_BATTLEFIELD",
  "MISSION_MARKER_MODEL_SUPPORT_SCOPE_UNSUPPORTED",
  "MISSION_MARKER_OUTSIDE_BATTLEFIELD",
  "MISSION_MARKER_PHYSICAL_STATE_INVALID",
  "MISSION_MARKER_SCORING_PROGRESS_INVALID",
  "MISSION_MARKER_SUPPLY_STATE_MISMATCH",
  "MISSION_MARKER_SUPPLY_TIER_UNRESOLVED",
  "MISSION_MARKER_UNIT_IDENTITY_INVALID",
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
  const slug = atomId.replace(/^rule-atom:/u, "mission-marker-control:");
  return {
    positiveFixtureIds: [`${slug}:five-marker-current-supply-control`],
    negativeFixtureIds: [`${slug}:wrong-seat-state-supply-geometry-and-los-rejections`],
    interactionFixtureIds: [`${slug}:coherency-flying-burrowed-zero-supply-and-sticky-control`],
    lifecycleFixtureIds: [`${slug}:cleanup-step-one-to-score-step-two`],
    replayFixtureIds: [`${slug}:ed25519-receipt-and-rotated-hmac-replay`],
    sourceDriftFixtureIds: [`${slug}:official-core-command-center-catalogue-and-runtime-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_mission_marker_control_source_clause_missing", atom.atomId);
  }
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "first_player" },
    timing: { phase: "cleanup", window: "determine_mission_marker_control", priority: 500 },
    preconditions: [
      {
        predicateId: "scoring.first_player_initiates_first_cleanup_step",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "MISSION_MARKER_CONTROL_FIRST_PLAYER_ONLY",
      },
      {
        predicateId: "mission_marker.complete_geometry_and_terrain_free_los",
        inputSchema: "starcraft_tmg_mission_marker_control_geometry_v1",
        failureCode: "MISSION_MARKER_LINE_OF_SIGHT_TERRAIN_SCOPE_UNSUPPORTED",
      },
      {
        predicateId: "unit.current_supply_matches_frozen_official_profile",
        inputSchema: "starcraft_tmg_official_combat_profile_bundle_v1",
        failureCode: "MISSION_MARKER_SUPPLY_STATE_MISMATCH",
      },
      {
        predicateId: "unit.contest_eligibility_is_rules_derived",
        inputSchema: "starcraft_tmg_official_mission_marker_control_kernel_v1",
        failureCode: "MISSION_MARKER_CONTROL_STATE_INVALID",
      },
    ],
    legalSpace: {
      kind: "finite",
      actionType: "determine_mission_marker_control",
    },
    effect: {
      executorId: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
      transitionSchema: OFFICIAL_MISSION_MARKER_CONTROL_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds,
      atomIds: [...OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_NEW_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

function verifyPrevious(input) {
  return verifyOfficialOutOfCoherencyCloseRanksRuleSliceV1({
    denominator: input.denominator,
    movementHoldSlice: input.movementHoldSlice,
    passSlice: input.passSlice,
    assaultHoldSlice: input.assaultHoldSlice,
    phaseInitiativeSlice: input.phaseInitiativeSlice,
    combatPassSlice: input.combatPassSlice,
    elevatedSlice: input.elevatedSlice,
    closeCombatSlice: input.closeCombatSlice,
    closeRanksSlice: input.closeRanksSlice,
    previousSlice: input.multiModelSlice,
    slice: input.previousSlice,
  });
}

export function createOfficialMissionMarkerControlRuleSliceV1(input = {}) {
  const previousAudit = verifyPrevious(input);
  if (previousAudit.counts.executableRuleAtoms !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT) {
    fail("official_mission_marker_control_previous_slice_mismatch");
  }
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS);
  const observedTargetIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return structuredClone(atom);
    observedTargetIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedTargetIds.sort(), [...targetIds].sort())) {
    fail("official_mission_marker_control_target_denominator_mismatch");
  }
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.12.0-official-mission-marker-control",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [
      ...structuredClone(base.executorManifest),
      {
        executorId: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
        executorVersion: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_VERSION,
        actionTypes: ["determine_mission_marker_control"],
        transitionSchema: OFFICIAL_MISSION_MARKER_CONTROL_TRANSITION_SCHEMA,
      },
    ],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_mission_marker_control_catalogue_invalid");
  }
  const remainingRuleGaps = catalogue.atoms.length - EXPECTED_EXECUTABLE_COUNT;
  const body = {
    schema: SLICE_SCHEMA,
    denominatorHash: input.denominator.denominatorHash,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: base.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS],
    versionReassignedRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorId: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_MISSION_MARKER_CONTROL_TRANSITION_SCHEMA,
    executableScope:
      "official_profile_round_base_ground_no_active_terrain_exact_mission_marker_control_step",
    officialDataPolicy: {
      source: "current_official_command_center_firestore_plus_frozen_official_core_pdf",
      repositoryFallbackAllowed: false,
      frozenDataSnapshotRequired: true,
    },
    historicalCompatibility: {
      previousCatalogueHash: base.catalogueHash,
      previousCatalogueMutationAllowed: false,
      previousV4ExecutorFrozen: true,
      explicitVersionReassignment: false,
      silentCompatibilityAllowed: false,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "mission_control_coherency_supply_sticky_and_replay_pending_verifier",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        `remaining_${remainingRuleGaps}_rule_atoms_not_executable`,
      ],
      remainingRuleGaps,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt", "rule_skill_builder_prompt"],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "write_episode_trace",
      ],
      uiTraceEvidence: "mission_control_finite_action_contract_only_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_control_resolution_excludes_ineligible_units_and_preserves_sticky_control",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_core_or_command_center_drift_quarantines_marker_control_slice",
        "supply_coherency_geometry_control_receipt_or_replay_failure_demotes_marker_control_slice",
      ],
      userVisibleChecks: [
        "legal_space_exposes_first_player_marker_control_step_only",
        "preview_explains_each_units_eligibility_supply_total_and_control_result",
        "accepted_receipt_replays_faction_indicator_and_sticky_control_atomically",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "terrain_line_of_sight_elevated_support_flying_and_burrowed_positive_geometry_variants_pending",
      "mission_vp_scoring_end_game_effect_cleanup_and_initiative_steps_pending",
      "browser_device_ui_and_training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialMissionMarkerControlRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_mission_marker_control_slice_hash_mismatch");
  }
  const expected = createOfficialMissionMarkerControlRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_mission_marker_control_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [atom.atomId, atom]));
  const targetIds = new Set(OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  if (changedNonTargetAtoms !== 0) fail("official_mission_marker_control_non_target_mutation");
  return freezeDeep({
    schema: "starcraft_tmg_official_mission_marker_control_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: OFFICIAL_MISSION_MARKER_CONTROL_ATOM_IDS.length,
      versionReassignedRuleAtoms: 0,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "current_supply_coherency_eligibility_and_sticky_marker_control_subset",
    trainingTruth: false,
  });
}
