import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_DEPENDENCY_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_VERSION,
  OFFICIAL_END_OF_ROUND_EFFECTS_NEW_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_TRANSITION_SCHEMA,
} from "./official-end-of-round-effects-executor-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_end_of_round_effects_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_hold_position_end_game_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "fa488e3cf26cd88fa8a7c47402141868feb5429833f93848a2f9cc367b88f51a";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "b6d22dc9a2bb0f8f8c377ba3368744760c0e686a73f0103f5dd3270694439c3c";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 164;
const EXPECTED_EXECUTABLE_COUNT = EXPECTED_PREVIOUS_EXECUTABLE_COUNT
  + OFFICIAL_END_OF_ROUND_EFFECTS_NEW_ATOM_IDS.length;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
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
    fail("official_end_of_round_effects_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 748
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_end_of_round_effects_previous_catalogue_invalid");
  }
  return audit;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "end-of-round-effects:");
  return {
    positiveFixtureIds: [`${slug}:complete-supported-empty-queue`],
    negativeFixtureIds: [`${slug}:unknown-effect-source-and-nonempty-queue-rejected`],
    interactionFixtureIds: [`${slug}:nonterminal-end-game-check-hands-off-to-eor-window`],
    lifecycleFixtureIds: [`${slug}:empty-window-advances-to-cleanup-refresh-without-mutation`],
    replayFixtureIds: [`${slug}:ed25519-four-step-cleanup-prefix-replay`],
    sourceDriftFixtureIds: [`${slug}:official-unit-mission-catalogue-runtime-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_end_of_round_effects_source_clause_missing", atom.atomId);
  }
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
        predicateId: "effects.active_source_denominator_is_complete_and_queue_is_empty",
        inputSchema: "starcraft_tmg_official_end_of_round_effect_queue_proof_v1",
        failureCode: "END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED",
      },
    ],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
    },
    effect: {
      executorId: OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_ID,
      transitionSchema: OFFICIAL_END_OF_ROUND_EFFECTS_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds,
      atomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_DEPENDENCY_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialEndOfRoundEffectsRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_END_OF_ROUND_EFFECTS_NEW_ATOM_IDS);
  const observedTargetIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return structuredClone(atom);
    observedTargetIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedTargetIds.sort(), [...targetIds].sort())) {
    fail("official_end_of_round_effects_target_denominator_mismatch");
  }
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.15.0-official-end-of-round-effects",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [
      ...structuredClone(base.executorManifest),
      {
        executorId: OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_ID,
        executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_VERSION,
        actionTypes: [OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE],
        transitionSchema: OFFICIAL_END_OF_ROUND_EFFECTS_TRANSITION_SCHEMA,
      },
    ],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== 746
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_end_of_round_effects_catalogue_invalid");
  }
  const remainingRuleGaps = catalogueAudit.counts.byDisposition.review_required;
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_NEW_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_ID],
    executableScope:
      "hold_position_unupgraded_marine_complete_empty_end_of_round_effect_queue",
    effectQueueScope: {
      supported: [
        "current_official_marine_base_profile_with_no_selected_upgrades",
        "current_official_hold_position_mission",
        "empty_card_resources_statuses_combat_effects_and_effect_markers",
        "complete_empty_queue_advances_to_cleanup_and_refresh",
      ],
      unsupported: [
        "nonempty_end_of_round_effect_queue",
        "first_player_then_player_selected_multi_effect_order",
        "selected_upgrades_cards_statuses_combat_effects_or_effect_markers",
        "other_units_or_missions",
      ],
      unsupportedFailsClosed: true,
    },
    officialDataPolicy: {
      source: "current_official_command_center_marine_hold_position_plus_frozen_core_pdf",
      supportedUnitSourceRecordHash:
        "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
      supportedMissionSourceRecordHash:
        "70c391e589555f7b124a381572ad4b1272cb22b6fbcc6c140171e68ea1f18cfa",
      repositoryFallbackAllowed: false,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "four_step_cleanup_prefix_and_historical_end_game_runtime_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "nonempty_effect_queue_and_effect_order_not_executable",
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
      uiTraceEvidence: "effect_queue_proof_and_cleanup_handoff_contract_only_device_ui_pending",
      agentDecisionEvidence: "rules_owned_empty_queue_only_with_complete_supported_source_proof",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_marine_mission_or_core_source_drift_quarantines_eor_slice",
        "unknown_effect_source_receipt_or_replay_failure_demotes_eor_slice",
      ],
      userVisibleChecks: [
        "preview_explains_zero_effects_complete_queue_and_next_cleanup_step",
        "unknown_or_nonempty_sources_show_fail_closed_diagnostic",
        "opponent_can_preview_but_cannot_confirm_or_apply",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "nonempty_end_of_round_effects_and_order_pending",
      "cleanup_refresh_and_initiative_pending",
      "army_elimination_final_score_other_missions_device_ui_and_training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialEndOfRoundEffectsRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_end_of_round_effects_slice_hash_mismatch");
  }
  const expected = createOfficialEndOfRoundEffectsRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_end_of_round_effects_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_END_OF_ROUND_EFFECTS_NEW_ATOM_IDS);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  if (changedNonTargetAtoms !== 0) {
    fail("official_end_of_round_effects_non_target_mutation");
  }
  if (!isDeepStrictEqual(
    OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_ATOM_IDS,
    OFFICIAL_END_OF_ROUND_EFFECTS_NEW_ATOM_IDS,
  )) {
    fail("official_end_of_round_effects_executor_atom_scope_invalid");
  }
  return freezeDeep({
    schema: "starcraft_tmg_official_end_of_round_effects_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: OFFICIAL_END_OF_ROUND_EFFECTS_NEW_ATOM_IDS.length,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "official_supported_empty_end_of_round_effect_queue_subset",
    trainingTruth: false,
  });
}
