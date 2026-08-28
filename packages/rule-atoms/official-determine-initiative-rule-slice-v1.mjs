import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE,
  OFFICIAL_DETERMINE_INITIATIVE_DETERMINISTIC_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION,
  OFFICIAL_DETERMINE_INITIATIVE_ROLL_OFF_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_TRANSITION_SCHEMA,
} from "./official-determine-initiative-executor-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_determine_initiative_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_cleanup_refresh_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "4a77ae00c60365baa348bd6bad88087ffa999de60a094750bd212f644a6f76a0";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "99c331381cbfbaf75730f93670485ad23f873b9a643d8f6146282d84b726e4be";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 170;
const EXPECTED_EXECUTABLE_COUNT = 176;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "DETERMINE_INITIATIVE_ACTION_INVALID",
  "DETERMINE_INITIATIVE_CHANCE_REVEALS_REQUIRED",
  "DETERMINE_INITIATIVE_CHANCE_REVEAL_INVALID",
  "DETERMINE_INITIATIVE_DATA_SNAPSHOT_MISMATCH",
  "DETERMINE_INITIATIVE_FIRST_PLAYER_ONLY",
  "DETERMINE_INITIATIVE_FIRST_PLAYER_REQUIRED",
  "DETERMINE_INITIATIVE_NEXT_ROUND_UNSUPPORTED",
  "DETERMINE_INITIATIVE_PROGRESS_INVALID",
  "DETERMINE_INITIATIVE_RESOLUTION_STALE",
  "DETERMINE_INITIATIVE_ROUND_UNSUPPORTED",
  "DETERMINE_INITIATIVE_RUNTIME_BINDING_REQUIRED",
  "DETERMINE_INITIATIVE_SCORE_INVALID",
  "DETERMINE_INITIATIVE_STATE_INVALID",
  "DETERMINE_INITIATIVE_TERMINAL_STATE",
  "DETERMINE_INITIATIVE_WRONG_PHASE",
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
    fail("official_determine_initiative_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 742
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_determine_initiative_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_determine_initiative_source_clause_missing", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "determine-initiative:");
  return {
    positiveFixtureIds: [`${slug}:lower-vp-player-receives-marker`],
    negativeFixtureIds: [`${slug}:tie-stale-progress-and-non-first-player-rejected`],
    interactionFixtureIds: [`${slug}:cleanup-to-movement-phase-choice-handoff`],
    lifecycleFixtureIds: [`${slug}:round-ledgers-reset-and-history-retained`],
    replayFixtureIds: [`${slug}:ed25519-round-boundary-replay`],
    sourceDriftFixtureIds: [`${slug}:core-mission-catalogue-runtime-drift`],
  };
}

function initiativeAtom(atom, clauseById, rulesVersion) {
  const chanceAtom = OFFICIAL_DETERMINE_INITIATIVE_ROLL_OFF_ATOM_IDS
    .includes(atom.atomId);
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
      window: OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE,
      priority: 550,
    },
    preconditions: [
      {
        predicateId: "cleanup.refresh_completed_nonterminal",
        inputSchema: "starcraft_tmg_scoring_cleanup_progress_v1",
        failureCode: "DETERMINE_INITIATIVE_PROGRESS_INVALID",
      },
      {
        predicateId: chanceAtom
          ? "initiative.tied_victory_points_require_two_d6_per_player"
          : "initiative.score_or_roll_off_result_selects_marker_holder",
        inputSchema: "starcraft_tmg_official_determine_initiative_resolution_v1",
        failureCode: chanceAtom
          ? "DETERMINE_INITIATIVE_CHANCE_REVEALS_REQUIRED"
          : "DETERMINE_INITIATIVE_PROGRESS_INVALID",
      },
    ],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE,
    },
    effect: {
      executorId: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
      transitionSchema: OFFICIAL_DETERMINE_INITIATIVE_TRANSITION_SCHEMA,
    },
    chance: chanceAtom
      ? { kind: "chance_ticket", ticketSchema: "starcraft_tmg_chance_bundle_v1" }
      : { kind: "none" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: chanceAtom
        ? ["rule-atom:singleton:core-8-9-6-begin-next-round:59794c52142e"]
        : [],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialDetermineInitiativeRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return structuredClone(atom);
    observedIds.push(atom.atomId);
    return initiativeAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("official_determine_initiative_target_denominator_mismatch");
  }
  const executorManifest = structuredClone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE],
    transitionSchema: OFFICIAL_DETERMINE_INITIATIVE_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.17.0-official-determine-initiative",
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
    || catalogueAudit.counts.byDisposition.review_required !== 736
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_determine_initiative_catalogue_invalid");
  }
  const remainingRuleGaps = catalogueAudit.counts.byDisposition.review_required;
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID],
    executableScope:
      "hold_position_round_2_to_4_lower_vp_or_tied_two_d6_initiative_and_fail_closed_next_round_start_window",
    initiativeScope: {
      supported: [
        "lower_vp_player_receives_first_player_marker",
        "round_advances_once_to_next_start_of_round_window",
        "movement_is_not_exposed_before_start_of_round_effects_resolve",
        "round_scoped_supply_and_scoring_ledgers_reset",
        "tied_victory_points_roll_two_d6_per_player_with_hidden_chance_tickets",
        "tied_roll_off_result_requires_a_new_committed_attempt",
      ],
      unsupported: [
        "first_round_roll_off_or_draft_roll_off",
        "start_of_round_effects",
      ],
      unsupportedFailsClosed: true,
    },
    officialDataPolicy: {
      source: "current_official_command_center_plus_live_verified_core_pdf",
      corePdfHash:
        "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
      repositoryFallbackAllowed: false,
    },
    historicalCompatibility: {
      previousSliceHash: input.previousSlice.sliceHash,
      previousCatalogueHash: input.previousSlice.catalogueHash,
      previousCatalogueMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "round_boundary_replay_pending_verifier",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "first_round_roll_off_and_start_of_round_effects_not_executable",
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
      uiTraceEvidence: "initiative_preview_and_round_handoff_contract_only_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_lower_score_comparison_with_no_model_submitted_marker_or_round",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "core_or_mission_source_drift_quarantines_initiative_slice",
        "receipt_replay_or_round_handoff_failure_demotes_initiative_slice",
      ],
      userVisibleChecks: [
        "preview_names_lower_score_marker_recipient_and_next_round",
        "tied_score_shows_hidden_roll_off_tickets_and_explicit_retry_after_tie",
        "start_of_round_window_blocks_movement_until_the_next_rule_slice",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "start_of_round_effects_and_first_round_initiative_pending",
      "complete_rules_device_ui_production_postgresql_and_training_promotion_pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        input.previousSlice.catalogue.atoms.find((previous) => previous.atomId === atom.atomId),
      )
  )).length;
  if (changedNonTargetAtoms !== 0) fail("official_determine_initiative_non_target_mutation");
  return slice;
}

export function verifyOfficialDetermineInitiativeRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_determine_initiative_slice_hash_mismatch");
  }
  const expected = createOfficialDetermineInitiativeRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_determine_initiative_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        input.previousSlice.catalogue.atoms.find((previous) => previous.atomId === atom.atomId),
      )
  )).length;
  return freezeDeep({
    schema: "starcraft_tmg_official_determine_initiative_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    counts: {
      executableRuleAtoms: audit.counts.byDisposition.executable,
      newlyExecutableRuleAtoms: input.slice.newlyExecutableRuleAtomIds.length,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedNonTargetAtoms,
    },
    executableContractGaps: audit.executableContractGaps,
    evidenceGaps: audit.evidenceGaps,
    rulesEligible: false,
    trainingTruth: false,
  });
}
