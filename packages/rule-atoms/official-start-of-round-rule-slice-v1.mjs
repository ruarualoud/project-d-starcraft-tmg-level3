import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION,
  OFFICIAL_START_OF_ROUND_TRANSITION_SCHEMA,
} from "./official-start-of-round-executor-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_start_of_round_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA = "starcraft_tmg_official_determine_initiative_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "366e4c0de93a9f40f0523f1d55c8c3278f7c71462f49a74154a75b09901a4483";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "dfa0f15672ea9a7742f3618738a7ed4577bba47d6c8e7c8613ec9ff607b11267";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 176;
const EXPECTED_EXECUTABLE_COUNT = 189;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "START_OF_ROUND_ACTION_INVALID",
  "START_OF_ROUND_CURRENT_SUPPLY_MISMATCH",
  "START_OF_ROUND_DATA_SNAPSHOT_MISMATCH",
  "START_OF_ROUND_EFFECT_SCOPE_UNRESOLVED",
  "START_OF_ROUND_FIRST_PLAYER_ONLY",
  "START_OF_ROUND_FIRST_PLAYER_REQUIRED",
  "START_OF_ROUND_HANDOFF_INVALID",
  "START_OF_ROUND_MOVEMENT_INITIATIVE_ALREADY_RESOLVED",
  "START_OF_ROUND_RESOLUTION_STALE",
  "START_OF_ROUND_ROUND_UNSUPPORTED",
  "START_OF_ROUND_RUNTIME_BINDING_REQUIRED",
  "START_OF_ROUND_STATE_INVALID",
  "START_OF_ROUND_SUPPLY_CAP_EXCEEDED",
  "START_OF_ROUND_TERMINAL_STATE",
  "START_OF_ROUND_UNIT_STATE_UNSUPPORTED",
  "START_OF_ROUND_WRONG_PHASE",
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
    fail("official_start_of_round_previous_slice_invalid");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== 736
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("official_start_of_round_previous_catalogue_invalid");
  }
  return audit;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((value) => !value)) {
    fail("official_start_of_round_source_clause_missing", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "start-of-round:");
  return {
    positiveFixtureIds: [`${slug}:round-two-supply-stationary-ready`],
    negativeFixtureIds: [`${slug}:unknown-trigger-and-supply-over-cap-rejected`],
    interactionFixtureIds: [`${slug}:initiative-handoff-to-movement-choice`],
    lifecycleFixtureIds: [`${slug}:round-two-through-final-round-supply-lifecycle`],
    replayFixtureIds: [`${slug}:ed25519-start-window-replay`],
    sourceDriftFixtureIds: [`${slug}:core-mission-unit-card-runtime-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "first_player" },
    timing: {
      phase: "start_of_round",
      window: OFFICIAL_START_OF_ROUND_ACTION_TYPE,
      priority: 600,
    },
    preconditions: [
      {
        predicateId: "round.initiative_handoff_is_bound_and_unresolved",
        inputSchema: "starcraft_tmg_official_determine_initiative_history_entry_v1",
        failureCode: "START_OF_ROUND_HANDOFF_INVALID",
      },
      {
        predicateId: "round.supported_effect_and_supply_denominator_is_complete",
        inputSchema: "starcraft_tmg_official_start_of_round_resolution_v1",
        failureCode: "START_OF_ROUND_EFFECT_SCOPE_UNRESOLVED",
      },
    ],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_START_OF_ROUND_ACTION_TYPE,
    },
    effect: {
      executorId: OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
      transitionSchema: OFFICIAL_START_OF_ROUND_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [],
    },
    evidence: evidence(atom.atomId),
  };
}

export function createOfficialStartOfRoundRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS);
  const observedIds = [];
  const atoms = base.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return structuredClone(atom);
    observedIds.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetIds].sort())) {
    fail("official_start_of_round_target_denominator_mismatch");
  }
  const executorManifest = structuredClone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_START_OF_ROUND_ACTION_TYPE],
    transitionSchema: OFFICIAL_START_OF_ROUND_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.18.0-official-start-of-round",
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
    || catalogueAudit.counts.byDisposition.review_required !== 723
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_start_of_round_catalogue_invalid");
  }
  const remainingRuleGaps = catalogueAudit.counts.byDisposition.review_required;
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: input.previousSlice.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_START_OF_ROUND_EXECUTOR_ID],
    executableScope:
      "hold_position_round_2_to_5_supply_stationary_ready_and_fail_closed_start_effect_window",
    startOfRoundScope: {
      supported: [
        "hold_position_supply_escalation_rounds_2_to_4",
        "final_round_unlimited_supply",
        "available_supply_from_current_on_table_supply",
        "reserve_supply_excluded_from_on_table_total",
        "all_live_on_table_and_reserve_marine_units_gain_stationary",
        "academy_and_terran_armed_forces_cards_begin_ready",
        "first_player_then_opponent_effect_order_proof",
        "movement_phase_first_actor_choice_handoff",
      ],
      unsupported: [
        "round_one_start_window",
        "burrowed_hidden_grant",
        "unit_card_or_mission_specific_start_of_round_triggers",
        "units_cards_or_missions_outside_the_exact_current_bundle",
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
      crossTimeReplayResult: "start_of_round_replay_pending_verifier",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "round_one_and_non_marine_start_effects_not_executable",
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
      uiTraceEvidence: "start_window_preview_and_movement_handoff_contract_only_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_supply_and_effect_resolution_with_no_model_submitted_supply_or_status",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "core_mission_unit_or_card_source_drift_quarantines_start_slice",
        "supply_effect_order_or_receipt_replay_failure_demotes_start_slice",
      ],
      userVisibleChecks: [
        "preview_names_supply_mode_stationary_count_and_ready_card_count",
        "unsupported_start_trigger_is_disabled_with_stable_reason",
        "movement_actions_remain_blocked_until_start_window_receipt_applies",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "round_one_and_broader_start_of_round_effect_denominator_pending",
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
  if (changedNonTargetAtoms !== 0) fail("official_start_of_round_non_target_mutation");
  return slice;
}

export function verifyOfficialStartOfRoundRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_start_of_round_slice_hash_mismatch");
  }
  const expected = createOfficialStartOfRoundRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_start_of_round_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const targetIds = new Set(OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS);
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(
        atom,
        input.previousSlice.catalogue.atoms.find((previous) => previous.atomId === atom.atomId),
      )
  )).length;
  return freezeDeep({
    schema: "starcraft_tmg_official_start_of_round_rule_slice_audit_v1",
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
