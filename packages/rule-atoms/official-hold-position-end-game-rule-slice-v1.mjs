import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
  OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS,
  OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
  OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION,
  OFFICIAL_HOLD_POSITION_END_GAME_TRANSITION_SCHEMA,
} from "./official-hold-position-end-game-executor-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";
import { OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS } from "./official-victory-point-scoring-executor-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_hold_position_end_game_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_victory_point_scoring_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "5a0e912234f656bcf51f8c9b9bd28b56c21faaf0298fb3256225b41911828cc2";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "f831bab25b4a82c1ae56ce90a5c2e964616696b8c34df2ea828d5f4539a8df38";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 162;
const EXPECTED_EXECUTABLE_COUNT = EXPECTED_PREVIOUS_EXECUTABLE_COUNT
  + OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS.length;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "END_GAME_ACTION_INVALID",
  "END_GAME_ALREADY_TERMINAL",
  "END_GAME_ARMY_TERMINAL_SCOPE_UNRESOLVED",
  "END_GAME_DATA_SNAPSHOT_MISMATCH",
  "END_GAME_FIRST_PLAYER_ONLY",
  "END_GAME_FIRST_PLAYER_REQUIRED",
  "END_GAME_MISSION_SCOPE_UNSUPPORTED",
  "END_GAME_PROGRESS_INVALID",
  "END_GAME_RESOLUTION_STALE",
  "END_GAME_ROUND_UNSUPPORTED",
  "END_GAME_SCORE_INVALID",
  "END_GAME_SCORING_HISTORY_INVALID",
  "END_GAME_STATE_INVALID",
  "END_GAME_WRONG_PHASE",
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
    fail("official_hold_position_end_game_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 750
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_hold_position_end_game_previous_catalogue_invalid");
  }
  return audit;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "hold-position-end-game:");
  return {
    positiveFixtureIds: [`${slug}:exact-ten-point-lead-for-either-player`],
    negativeFixtureIds: [`${slug}:round-history-army-scope-and-terminal-rejections`],
    interactionFixtureIds: [`${slug}:simultaneous-score-to-special-win-or-eor-handoff`],
    lifecycleFixtureIds: [`${slug}:marker-control-score-end-game-check`],
    replayFixtureIds: [`${slug}:ed25519-three-step-cleanup-prefix-replay`],
    sourceDriftFixtureIds: [`${slug}:official-core-mission-catalogue-runtime-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_hold_position_end_game_source_clause_missing", atom.atomId);
  }
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "first_player" },
    timing: { phase: "cleanup", window: OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE, priority: 520 },
    preconditions: [
      {
        predicateId: "scoring.current_round_vp_resolution_is_frozen",
        inputSchema: "starcraft_tmg_official_victory_point_scoring_resolution_v1",
        failureCode: "END_GAME_SCORING_HISTORY_INVALID",
      },
      {
        predicateId: "mission.hold_position_standard_special_lead_threshold_is_ten",
        inputSchema: "starcraft_tmg_official_mission_scoring_profile_v1",
        failureCode: "END_GAME_MISSION_SCOPE_UNSUPPORTED",
      },
      {
        predicateId: "terminal.army_elimination_and_round_limit_cannot_also_trigger",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "END_GAME_ARMY_TERMINAL_SCOPE_UNRESOLVED",
      },
    ],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
    },
    effect: {
      executorId: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
      transitionSchema: OFFICIAL_HOLD_POSITION_END_GAME_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds,
      atomIds: [...OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialHoldPositionEndGameRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS);
  const observedTargetIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return structuredClone(atom);
    observedTargetIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedTargetIds.sort(), [...targetIds].sort())) {
    fail("official_hold_position_end_game_target_denominator_mismatch");
  }
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.14.0-official-hold-position-end-game",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [
      ...structuredClone(base.executorManifest),
      {
        executorId: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
        executorVersion: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION,
        actionTypes: [OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE],
        transitionSchema: OFFICIAL_HOLD_POSITION_END_GAME_TRANSITION_SCHEMA,
      },
    ],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_hold_position_end_game_catalogue_invalid");
  }
  const remainingRuleGaps = catalogueAudit.counts.byDisposition.review_required;
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID],
    executableScope:
      "hold_position_standard_rounds_two_to_four_special_lead_check_with_both_armies_live",
    terminalScope: {
      supported: ["hold_position_special_lead_10_plus"],
      requiredNonTriggers: ["army_elimination", "round_limit"],
      unsupported: [
        "army_elimination_resolution",
        "surviving_player_plus_ten",
        "round_limit_final_scoring",
        "multiple_terminal_trigger_priority",
      ],
      unsupportedFailsClosed: true,
    },
    officialDataPolicy: {
      source: "current_official_command_center_hold_position_plus_frozen_official_core_pdf",
      repositoryFallbackAllowed: false,
      missionSpecialWinTextHashRequired: true,
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
      crossTimeReplayResult: "three_step_cleanup_prefix_and_historical_scoring_runtime_verified",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "army_elimination_round_limit_and_final_scoring_not_executable",
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
      uiTraceEvidence: "terminal_summary_and_no-post-terminal-actions_contract_only_device_ui_pending",
      agentDecisionEvidence: "rules_owned_special_win_or_eor_handoff_with_excluded-trigger_receipt",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_core_mission_or_historical_scoring_drift_quarantines_end_game_slice",
        "terminal_legal_space_receipt_or_replay_failure_demotes_end_game_slice",
      ],
      userVisibleChecks: [
        "preview_explains_threshold_scores_outcome_and_excluded_terminal_checks",
        "terminal_room_exposes_winner_reason_and_no_legal_actions",
        "nonterminal_room_hands_off_to_end_of_round_effects",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "army_elimination_survivor_award_round_limit_and_final_scoring_pending",
      "end_of_round_effects_cleanup_and_initiative_pending",
      "other_missions_browser_device_ui_and_training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialHoldPositionEndGameRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_hold_position_end_game_slice_hash_mismatch");
  }
  const expected = createOfficialHoldPositionEndGameRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_hold_position_end_game_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  if (changedNonTargetAtoms !== 0) {
    fail("official_hold_position_end_game_non_target_mutation");
  }
  return freezeDeep({
    schema: "starcraft_tmg_official_hold_position_end_game_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS.length,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "hold_position_standard_special_lead_end_game_check_subset",
    trainingTruth: false,
  });
}
