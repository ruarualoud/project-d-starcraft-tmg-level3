import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
} from "./official-mission-marker-control-executor-v1.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ATOM_IDS,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_TRANSITION_SCHEMA,
} from "./official-mission-marker-control-executor-v2.mjs";
import {
  verifyOfficialMissionMarkerControlRuleSliceV1,
} from "./official-mission-marker-control-rule-slice-v1.mjs";
import {
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID,
} from "./official-out-of-coherency-close-ranks-combat-executor-v1.mjs";
import {
  OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS,
  OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
  OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION,
  OFFICIAL_SUPPLY_LOSS_COMBAT_TRANSITION_SCHEMA,
} from "./official-supply-loss-combat-executor-v1.mjs";
import {
  OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
  OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS,
  OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
  OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION,
  OFFICIAL_VICTORY_POINT_SCORING_TRANSITION_SCHEMA,
} from "./official-victory-point-scoring-executor-v1.mjs";

const SLICE_SCHEMA = "starcraft_tmg_official_victory_point_scoring_rule_slice_v1";
const EXPECTED_PREVIOUS_EXECUTABLE_COUNT = 150;
const EXPECTED_EXECUTABLE_COUNT = EXPECTED_PREVIOUS_EXECUTABLE_COUNT
  + OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS.length;
const EXPECTED_REASSIGNED_COUNT = OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS.length
  + OFFICIAL_MISSION_MARKER_CONTROL_V2_ATOM_IDS.length;
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const REJECTION_CODES = Object.freeze([
  "VP_SCORING_ACTION_INVALID",
  "VP_SCORING_ATTRIBUTION_UNRESOLVED",
  "VP_SCORING_DATA_SNAPSHOT_MISMATCH",
  "VP_SCORING_FIRST_PLAYER_ONLY",
  "VP_SCORING_FIRST_PLAYER_REQUIRED",
  "VP_SCORING_MARKER_DENOMINATOR_INVALID",
  "VP_SCORING_MARKER_STATE_INVALID",
  "VP_SCORING_PROGRESS_INVALID",
  "VP_SCORING_RESOLUTION_STALE",
  "VP_SCORING_ROUND_UNSUPPORTED",
  "VP_SCORING_RUNTIME_BINDING_REQUIRED",
  "VP_SCORING_SCORE_INVALID",
  "VP_SCORING_STATE_INVALID",
  "VP_SCORING_WRONG_PHASE",
  "SUPPLY_LOSS_LEDGER_AGGREGATE_MISMATCH",
  "SUPPLY_LOSS_LEDGER_ENTRY_INVALID",
  "SUPPLY_LOSS_LEDGER_HASH_MISMATCH",
  "SUPPLY_LOSS_LEDGER_ROUND_MISMATCH",
  "SUPPLY_LOSS_LEDGER_RUNTIME_MISMATCH",
]);
const SUPPLY_REJECTION_CODES = Object.freeze([
  "SUPPLY_LOSS_COMBAT_ACTION_INVALID",
  "SUPPLY_LOSS_COMBAT_DATA_SNAPSHOT_MISMATCH",
  "SUPPLY_LOSS_COMBAT_PARAMETER_DOMAIN_INVALID",
  "SUPPLY_LOSS_COMBAT_SUPPLY_INCREASE_UNSUPPORTED",
  "SUPPLY_LOSS_LEDGER_AGGREGATE_MISMATCH",
  "SUPPLY_LOSS_LEDGER_ENTRY_INVALID",
  "SUPPLY_LOSS_LEDGER_HASH_MISMATCH",
  "SUPPLY_LOSS_LEDGER_ROUND_MISMATCH",
  "SUPPLY_LOSS_LEDGER_RUNTIME_MISMATCH",
  "SUPPLY_LOSS_RUNTIME_BINDING_REQUIRED",
  "SUPPLY_LOSS_POST_PIECE_DENOMINATOR_MISMATCH",
]);
const MARKER_V2_REJECTION_CODES = Object.freeze([
  "MISSION_MARKER_V2_ACTION_INVALID",
  "MISSION_MARKER_V2_DATA_SNAPSHOT_MISMATCH",
  "MISSION_MARKER_V2_DENOMINATOR_INVALID",
  "MISSION_MARKER_V2_RUNTIME_BINDING_REQUIRED",
  "SUPPLY_LOSS_LEDGER_HASH_MISMATCH",
  "SUPPLY_LOSS_LEDGER_ROUND_MISMATCH",
  "SUPPLY_LOSS_LEDGER_RUNTIME_MISMATCH",
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
  const slug = atomId.replace(/^rule-atom:/u, "victory-point-scoring:");
  return {
    positiveFixtureIds: [`${slug}:hold-position-standard-round-two-zero-supply-delta`],
    negativeFixtureIds: [`${slug}:tamper-round-mission-seat-and-nonzero-supply-rejections`],
    interactionFixtureIds: [`${slug}:marker-control-affinity-and-simultaneous-both-player-score`],
    lifecycleFixtureIds: [`${slug}:control-step-to-score-step-to-end-game-check`],
    replayFixtureIds: [`${slug}:ed25519-two-step-cleanup-prefix-replay`],
    sourceDriftFixtureIds: [`${slug}:official-core-command-center-mission-catalogue-runtime-drift`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const sourceSnapshotIds = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (sourceSnapshotIds.some((value) => !value)) {
    fail("official_victory_point_scoring_source_clause_missing", atom.atomId);
  }
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "first_player" },
    timing: { phase: "cleanup", window: "score_victory_points", priority: 510 },
    preconditions: [
      {
        predicateId: "scoring.marker_control_step_is_frozen_for_current_round",
        inputSchema: "starcraft_tmg_scoring_cleanup_progress_v1",
        failureCode: "VP_SCORING_PROGRESS_INVALID",
      },
      {
        predicateId: "mission.hold_position_standard_round_two_to_four",
        inputSchema: "starcraft_tmg_official_mission_scoring_profile_v1",
        failureCode: "VP_SCORING_ROUND_UNSUPPORTED",
      },
      {
        predicateId: "mission.marker_affinity_is_bound_to_both_draft_receipts",
        inputSchema: "starcraft_tmg_official_mission_setup_binding_v1",
        failureCode: "VP_SCORING_MARKER_STATE_INVALID",
      },
      {
        predicateId: "scoring.round_supply_delta_witness_is_zero",
        inputSchema: "starcraft_tmg_official_supply_loss_ledger_v1",
        failureCode: "VP_SCORING_ATTRIBUTION_UNRESOLVED",
      },
    ],
    legalSpace: {
      kind: "finite",
      actionType: OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
    },
    effect: {
      executorId: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
      transitionSchema: OFFICIAL_VICTORY_POINT_SCORING_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds,
      atomIds: [
        ...OFFICIAL_MISSION_MARKER_CONTROL_V2_ATOM_IDS,
        ...OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS,
      ],
    },
    evidence: evidence(atom.atomId),
  };
}

function reassignAtom(atom, executorId, executorVersion, transitionSchema, rejectionCodes) {
  return {
    ...structuredClone(atom),
    atomVersion: executorVersion,
    effect: {
      ...structuredClone(atom.effect),
      executorId,
      transitionSchema,
    },
    rejectionCodes: [...new Set([...(atom.rejectionCodes || []), ...rejectionCodes])]
      .sort((left, right) => left.localeCompare(right)),
  };
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

function verifyPrevious(input) {
  return verifyOfficialMissionMarkerControlRuleSliceV1({
    denominator: input.denominator,
    movementHoldSlice: input.movementHoldSlice,
    passSlice: input.passSlice,
    assaultHoldSlice: input.assaultHoldSlice,
    phaseInitiativeSlice: input.phaseInitiativeSlice,
    combatPassSlice: input.combatPassSlice,
    elevatedSlice: input.elevatedSlice,
    closeCombatSlice: input.closeCombatSlice,
    closeRanksSlice: input.closeRanksSlice,
    multiModelSlice: input.multiModelSlice,
    previousSlice: input.outOfCoherencySlice,
    slice: input.previousSlice,
  });
}

export function createOfficialVictoryPointScoringRuleSliceV1(input = {}) {
  const previousAudit = verifyPrevious(input);
  if (previousAudit.counts.executableRuleAtoms !== EXPECTED_PREVIOUS_EXECUTABLE_COUNT) {
    fail("official_victory_point_scoring_previous_slice_mismatch");
  }
  const base = input.previousSlice.catalogue;
  const clauseById = new Map(base.sourceClauses.map((row) => [row.clauseId, row]));
  const targetIds = new Set(OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS);
  const fightIds = new Set(OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS);
  const markerIds = new Set(OFFICIAL_MISSION_MARKER_CONTROL_V2_ATOM_IDS);
  const observedTargetIds = [];
  const observedFightIds = [];
  const observedMarkerIds = [];
  const atoms = base.atoms.map((atom) => {
    if (targetIds.has(atom.atomId)) {
      observedTargetIds.push(atom.atomId);
      return executableAtom(atom, clauseById, base.rulesVersion);
    }
    if (fightIds.has(atom.atomId)) {
      observedFightIds.push(atom.atomId);
      return reassignAtom(
        atom,
        OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
        OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION,
        OFFICIAL_SUPPLY_LOSS_COMBAT_TRANSITION_SCHEMA,
        SUPPLY_REJECTION_CODES,
      );
    }
    if (markerIds.has(atom.atomId)) {
      observedMarkerIds.push(atom.atomId);
      return reassignAtom(
        atom,
        OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
        OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION,
        OFFICIAL_MISSION_MARKER_CONTROL_V2_TRANSITION_SCHEMA,
        MARKER_V2_REJECTION_CODES,
      );
    }
    return structuredClone(atom);
  });
  if (!isDeepStrictEqual(observedTargetIds.sort(), [...targetIds].sort())) {
    fail("official_victory_point_scoring_target_denominator_mismatch");
  }
  if (!isDeepStrictEqual(observedFightIds.sort(), [...fightIds].sort())
    || !isDeepStrictEqual(observedMarkerIds.sort(), [...markerIds].sort())) {
    fail("official_victory_point_scoring_reassignment_denominator_mismatch");
  }
  const previousManifest = base.executorManifest.filter((entry) => ![
    OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID,
    OFFICIAL_MISSION_MARKER_CONTROL_EXECUTOR_ID,
  ].includes(entry.executorId));
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.13.0-official-victory-point-scoring",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: structuredClone(base.sourceSnapshots),
    sourceClauses: structuredClone(base.sourceClauses),
    atoms,
    executorManifest: [
      ...structuredClone(previousManifest),
      {
        executorId: OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
        executorVersion: OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION,
        actionTypes: ["fight"],
        transitionSchema: OFFICIAL_SUPPLY_LOSS_COMBAT_TRANSITION_SCHEMA,
      },
      {
        executorId: OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
        executorVersion: OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION,
        actionTypes: [OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE],
        transitionSchema: OFFICIAL_MISSION_MARKER_CONTROL_V2_TRANSITION_SCHEMA,
      },
      {
        executorId: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
        executorVersion: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION,
        actionTypes: [OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE],
        transitionSchema: OFFICIAL_VICTORY_POINT_SCORING_TRANSITION_SCHEMA,
      },
    ],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("official_victory_point_scoring_catalogue_invalid");
  }
  const remainingActionableRuleGaps = catalogueAudit.counts.byDisposition.review_required;
  const body = {
    schema: SLICE_SCHEMA,
    denominatorHash: input.denominator.denominatorHash,
    previousSliceHash: input.previousSlice.sliceHash,
    previousCatalogueHash: base.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS],
    versionReassignedRuleAtomIds: [
      ...OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS,
      ...OFFICIAL_MISSION_MARKER_CONTROL_V2_ATOM_IDS,
    ].sort((left, right) => left.localeCompare(right)),
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [
      OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
      OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
      OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
    ],
    executableScope:
      "hold_position_standard_rounds_two_to_four_zero_supply_delta_simultaneous_vp_after_exact_marker_control",
    officialDataPolicy: {
      source: "current_official_command_center_hold_position_plus_frozen_official_core_pdf",
      repositoryFallbackAllowed: false,
      frozenCompositeGameplayDataRequired: true,
      frozenMissionAndDeploymentDraftReceiptsRequired: true,
    },
    supplyAttributionPolicy: {
      ledgerRequired: true,
      supportedScoringDelta: 0,
      opponentAttackAttributionPlanned: true,
      outOfCoherencyAttribution: "unresolved_fail_closed",
      silentOpponentCreditAllowed: false,
    },
    historicalCompatibility: {
      previousCatalogueHash: base.catalogueHash,
      previousCatalogueMutationAllowed: false,
      previousFightV4ExecutorFrozen: true,
      previousMarkerV1ExecutorFrozen: true,
      explicitVersionReassignment: true,
      silentCompatibilityAllowed: false,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: "two_step_scoring_prefix_and_historical_runtime_pending_verifier",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "nonzero_supply_attribution_not_officially_resolved",
        `remaining_${remainingActionableRuleGaps}_actionable_rule_atoms_not_executable`,
      ],
      remainingRuleGaps: remainingActionableRuleGaps,
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
        "write_episode_trace",
      ],
      uiTraceEvidence: "simultaneous_vp_breakdown_contract_only_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_zero_delta_witness_and_affinity_bound_both_player_breakdown",
      memoryTraceEvidence: "no_memory_or_skill_promotion_attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_core_command_center_mission_or_draft_drift_quarantines_scoring_slice",
        "ledger_marker_score_receipt_or_replay_failure_demotes_scoring_slice",
      ],
      userVisibleChecks: [
        "preview_explains_each_controlled_marker_affinity_and_vp_for_both_players",
        "nonzero_or_tampered_supply_ledger_is_explicitly_rejected",
        "accepted_receipt_atomically_updates_both_scores_and_replays",
      ],
    },
    rulesEligible: false,
    trainingTruth: false,
    blocks: [
      "special_win_end_game_cleanup_effects_and_initiative_steps_pending",
      "nonzero_supply_attribution_and_final_scoring_pending",
      "other_missions_skirmish_browser_device_ui_and_training_promotion_pending",
    ],
  };
  return freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialVictoryPointScoringRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("official_victory_point_scoring_slice_hash_mismatch");
  }
  const expected = createOfficialVictoryPointScoringRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("official_victory_point_scoring_slice_content_mismatch");
  }
  const audit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const changedIds = new Set([
    ...OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS,
    ...OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_MISSION_MARKER_CONTROL_V2_ATOM_IDS,
  ]);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const changedNonTargetAtoms = input.slice.catalogue.atoms.filter((atom) => (
    !changedIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  const versionReassignedRuleAtoms = input.slice.catalogue.atoms.filter((atom) => (
    (OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS.includes(atom.atomId)
      && atom.effect?.executorId === OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID)
      || (OFFICIAL_MISSION_MARKER_CONTROL_V2_ATOM_IDS.includes(atom.atomId)
        && atom.effect?.executorId === OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID)
  )).length;
  if (changedNonTargetAtoms !== 0 || versionReassignedRuleAtoms !== EXPECTED_REASSIGNED_COUNT) {
    fail("official_victory_point_scoring_non_target_mutation");
  }
  return freezeDeep({
    schema: "starcraft_tmg_official_victory_point_scoring_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    counts: {
      sourceClauses: audit.counts.sourceClauses,
      ruleAtoms: audit.counts.atoms,
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS.length,
      versionReassignedRuleAtoms,
      changedNonTargetAtoms,
      executableContractGaps: audit.executableContractGaps.length,
      evidenceGaps: audit.evidenceGaps.length,
    },
    rulesTruth: "hold_position_standard_round_two_to_four_zero_supply_delta_scoring_subset",
    trainingTruth: false,
  });
}
