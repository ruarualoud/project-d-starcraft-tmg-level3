import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
  OFFICIAL_CLEANUP_REFRESH_DEPENDENCY_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_VERSION,
  OFFICIAL_CLEANUP_REFRESH_NEW_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_TRANSITION_SCHEMA,
} from "./official-cleanup-refresh-executor-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_DEPENDENCY_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_TRANSITION_SCHEMA,
} from "./official-end-of-round-effects-executor-v2.mjs";
import { OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_ID } from "./official-end-of-round-effects-executor-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_cleanup_refresh_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_end_of_round_effects_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "9e5609659d0f51d1dd696ce56f746b6ae27e5aaa4ab7cb01a12635f69b8d78de";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "0a697bcbc01cea1f3bd44ea1be06a33e8c4103f4c7a05e4d3ebf2b3d6da42e9c";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 166;
const EXPECTED_EXECUTABLE_COUNT = EXPECTED_PREVIOUS_EXECUTABLE_COUNT
  + OFFICIAL_CLEANUP_REFRESH_NEW_ATOM_IDS.length;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const EOR_REJECTION_CODES = Object.freeze([
  "END_OF_ROUND_EFFECTS_ACTION_INVALID",
  "END_OF_ROUND_EFFECTS_DATA_SNAPSHOT_MISMATCH",
  "END_OF_ROUND_EFFECTS_FIRST_PLAYER_ONLY",
  "END_OF_ROUND_EFFECTS_FIRST_PLAYER_REQUIRED",
  "END_OF_ROUND_EFFECTS_PROGRESS_INVALID",
  "END_OF_ROUND_EFFECTS_PROOF_STALE",
  "END_OF_ROUND_EFFECTS_ROUND_UNSUPPORTED",
  "END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED",
  "END_OF_ROUND_EFFECTS_STATE_INVALID",
  "END_OF_ROUND_EFFECTS_TERMINAL_STATE",
  "END_OF_ROUND_EFFECTS_WRONG_PHASE",
]);
const CLEANUP_REJECTION_CODES = Object.freeze([
  "CLEANUP_REFRESH_ACTION_INVALID",
  "CLEANUP_REFRESH_DATA_SNAPSHOT_MISMATCH",
  "CLEANUP_REFRESH_FIRST_PLAYER_ONLY",
  "CLEANUP_REFRESH_FIRST_PLAYER_REQUIRED",
  "CLEANUP_REFRESH_PROGRESS_INVALID",
  "CLEANUP_REFRESH_RESOLUTION_STALE",
  "CLEANUP_REFRESH_ROUND_UNSUPPORTED",
  "CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED",
  "CLEANUP_REFRESH_STATE_INVALID",
  "CLEANUP_REFRESH_TERMINAL_STATE",
  "CLEANUP_REFRESH_WRONG_PHASE",
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

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

function verifyPreviousSlice(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("official_cleanup_refresh_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 746
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_cleanup_refresh_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_cleanup_refresh_source_clause_missing", atom.atomId);
  }
  return ids;
}

function evidence(atomId, family) {
  const slug = atomId.replace(/^rule-atom:/u, `${family}:`);
  if (family === "end-of-round-effects-v2") {
    return {
      positiveFixtureIds: [`${slug}:exact-current-cards-complete-empty-queue`],
      negativeFixtureIds: [`${slug}:unknown-card-face-state-and-active-effect-rejected`],
      interactionFixtureIds: [`${slug}:card-source-proof-hands-off-to-cleanup-refresh`],
      lifecycleFixtureIds: [`${slug}:card-readiness-is-observed-without-eor-mutation`],
      replayFixtureIds: [`${slug}:ed25519-five-step-cleanup-prefix-replay`],
      sourceDriftFixtureIds: [`${slug}:official-card-source-record-drift`],
    };
  }
  return {
    positiveFixtureIds: [`${slug}:reset-activation-pass-and-refresh-exhausted-cards`],
    negativeFixtureIds: [`${slug}:unknown-token-marker-card-or-stale-resolution-rejected`],
    interactionFixtureIds: [`${slug}:eor-v2-hands-off-to-cleanup-then-determine-initiative`],
    lifecycleFixtureIds: [`${slug}:damage-mission-control-and-history-retained`],
    replayFixtureIds: [`${slug}:ed25519-five-step-cleanup-prefix-replay`],
    sourceDriftFixtureIds: [`${slug}:official-card-core-catalogue-runtime-drift`],
  };
}

function eorV2Atom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: "2.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "first_player" },
    timing: {
      phase: "cleanup",
      window: OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
      priority: 530,
    },
    preconditions: [
      {
        predicateId: "cleanup.end_game_check_completed_nonterminal",
        inputSchema: "starcraft_tmg_scoring_cleanup_progress_v1",
        failureCode: "END_OF_ROUND_EFFECTS_PROGRESS_INVALID",
      },
      {
        predicateId: "effects.exact_card_source_denominator_is_complete_and_queue_is_empty",
        inputSchema: "starcraft_tmg_official_end_of_round_effect_queue_proof_v2",
        failureCode: "END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED",
      },
    ],
    legalSpace: { kind: "finite", actionType: OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE },
    effect: {
      executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_END_OF_ROUND_EFFECTS_V2_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...EOR_REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId, "end-of-round-effects-v2"),
  };
}

function cleanupAtom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "first_player" },
    timing: {
      phase: "cleanup",
      window: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
      priority: 540,
    },
    preconditions: [
      {
        predicateId: "cleanup.end_of_round_effect_window_completed",
        inputSchema: "starcraft_tmg_scoring_cleanup_progress_v1",
        failureCode: "CLEANUP_REFRESH_PROGRESS_INVALID",
      },
      {
        predicateId: "cleanup.exact_material_denominator_complete",
        inputSchema: "starcraft_tmg_official_cleanup_refresh_resolution_v1",
        failureCode: "CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED",
      },
    ],
    legalSpace: { kind: "finite", actionType: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE },
    effect: {
      executorId: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
      transitionSchema: OFFICIAL_CLEANUP_REFRESH_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...CLEANUP_REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [...OFFICIAL_CLEANUP_REFRESH_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId, "cleanup-refresh"),
  };
}

export function createOfficialCleanupRefreshRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const eorIds = new Set(OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS);
  const cleanupIds = new Set(OFFICIAL_CLEANUP_REFRESH_NEW_ATOM_IDS);
  const changedTargetIds = new Set([...eorIds, ...cleanupIds]);
  const observedEorIds = [];
  const observedCleanupIds = [];
  const atoms = base.atoms.map((atom) => {
    if (eorIds.has(atom.atomId)) {
      observedEorIds.push(atom.atomId);
      return eorV2Atom(atom, clauseById, base.rulesVersion);
    }
    if (cleanupIds.has(atom.atomId)) {
      observedCleanupIds.push(atom.atomId);
      return cleanupAtom(atom, clauseById, base.rulesVersion);
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedEorIds.sort(), [...eorIds].sort())
    || !isDeepStrictEqual(observedCleanupIds.sort(), [...cleanupIds].sort())) {
    fail("official_cleanup_refresh_target_denominator_mismatch");
  }
  const executorManifest = base.executorManifest.filter((entry) => (
    entry.executorId !== OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_ID
  ));
  executorManifest.push(
    {
      executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
      executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION,
      actionTypes: [OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE],
      transitionSchema: OFFICIAL_END_OF_ROUND_EFFECTS_V2_TRANSITION_SCHEMA,
    },
    {
      executorId: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
      executorVersion: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_VERSION,
      actionTypes: [OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE],
      transitionSchema: OFFICIAL_CLEANUP_REFRESH_TRANSITION_SCHEMA,
    },
  );
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.16.0-official-cleanup-refresh",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest,
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== 742
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_cleanup_refresh_catalogue_invalid");
  }
  const remainingRuleGaps = catalogueAudit.counts.byDisposition.review_required;
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    versionReassignedRuleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS],
    newlyExecutableRuleAtomIds: [...OFFICIAL_CLEANUP_REFRESH_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [
      OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
      OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
    ],
    executableScope:
      "hold_position_round_2_to_4_exact_cards_empty_eor_then_cleanup_refresh",
    cleanupScope: {
      supported: [
        "current_official_marine_base_profile_with_no_selected_upgrades",
        "current_official_hold_position_mission",
        "current_official_academy_tactical_card",
        "current_official_terran_armed_forces_faction_card",
        "reset_all_three_activation_markers_and_per_round_pass_state",
        "refresh_exact_supported_exhausted_cards_to_ready_face_up",
        "retain_damage_mission_control_indicators_and_phase_actor_history",
        "advance_to_determine_initiative_without_starting_next_round",
      ],
      unsupported: [
        "generic_nonempty_tokens_markers_or_effect_markers",
        "statuses_combat_effects_selected_upgrades_or_unknown_cards",
        "nonempty_end_of_round_effect_queue_or_effect_order",
        "determine_initiative_roll_off_and_next_round_transition",
        "other_units_missions_or_card_records",
      ],
      unsupportedFailsClosed: true,
    },
    officialDataPolicy: {
      source: "current_official_command_center_plus_frozen_core_pdf",
      supportedCardSourceRecordHashes: {
        "tactical_cards:academy":
          "fa44c19baa21f3c6c9d983a11b61cd9e8e7ed5904e74fea2cbca7931109fc939",
        "tactical_cards:terran_armed_forces":
          "44aa8b4d52a065dbbc5e93a9bfc203957647393efe4c123e1a0b2b909dbf63c5",
      },
      repositoryFallbackAllowed: false,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      replacedExecutorId: OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
      historicalRuntimeStillSupported: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult:
        "five_step_cleanup_prefix_and_historical_slice14_runtime_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "generic_tokens_statuses_effect_order_and_initiative_not_executable",
        `remaining_${remainingRuleGaps}_actionable_rule_atoms_not_executable`,
      ],
      remainingRuleGaps,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt"],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
        "write_episode_trace",
      ],
      uiTraceEvidence: "cleanup_resolution_preview_contract_only_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_exact_cleanup_resolution_with_no_model_submitted_authority",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_card_or_core_source_drift_quarantines_cleanup_slice",
        "unknown_material_receipt_or_replay_failure_demotes_cleanup_slice",
      ],
      userVisibleChecks: [
        "preview_lists_card_refresh_activation_reset_retained_exceptions_and_next_step",
        "unknown_material_shows_fail_closed_diagnostic",
        "opponent_can_preview_but_cannot_confirm_or_apply",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "determine_initiative_roll_off_and_round_advance_pending",
      "generic_tokens_statuses_effects_and_other_cards_pending",
      "army_elimination_final_score_other_missions_device_ui_and_training_promotion_pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !changedTargetIds.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        input.previousSlice.catalogue.atoms.find((previous) => previous.atomId === atom.atomId),
      )
  )).length;
  if (changedNonTargetAtoms !== 0) fail("official_cleanup_refresh_non_target_mutation");
  return slice;
}

export function verifyOfficialCleanupRefreshRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_cleanup_refresh_slice_hash_mismatch");
  }
  const expected = createOfficialCleanupRefreshRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_cleanup_refresh_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set([
    ...OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS,
    ...OFFICIAL_CLEANUP_REFRESH_NEW_ATOM_IDS,
  ]);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  if (changedNonTargetAtoms !== 0) fail("official_cleanup_refresh_non_target_mutation");
  if (!isDeepStrictEqual(
    OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS,
    OFFICIAL_CLEANUP_REFRESH_NEW_ATOM_IDS,
  )) {
    fail("official_cleanup_refresh_executor_atom_scope_invalid");
  }
  return freezeDeep({
    schema: "starcraft_tmg_official_cleanup_refresh_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      versionReassignedRuleAtoms: OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS.length,
      newlyExecutableRuleAtoms: OFFICIAL_CLEANUP_REFRESH_NEW_ATOM_IDS.length,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "official_supported_cleanup_refresh_exact_current_cards_subset",
    trainingTruth: false,
  });
}
