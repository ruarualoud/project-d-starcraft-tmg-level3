import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { clone, fail, freeze, seal } from "../skill-production/common.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialMissionSetupBindingV1 } from
  "../source-data/official-mission-setup-binding-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import { createOfficialFaqRuleRouterV2 } from "./official-faq-rule-router-v2.mjs";
import {
  applyOfficialActivationPassV1,
  enumerateOfficialActivationPassActionsV1,
  settleOfficialAlternatingPhaseAfterActivationV1,
} from "./official-activation-pass-executor-v1.mjs";
import {
  applyOfficialCombatPassV3,
  enumerateOfficialCombatPassV3Actions,
} from "./official-combat-pass-executor-v3.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS,
} from "./official-cleanup-refresh-executor-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V5_ACTION_TYPE,
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_VERSION,
} from "./official-cleanup-refresh-executor-v5.mjs";
import {
  OFFICIAL_DETERMINE_INITIATIVE_V2_ACTION_TYPE,
  OFFICIAL_DETERMINE_INITIATIVE_V2_DETERMINISTIC_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION,
  OFFICIAL_DETERMINE_INITIATIVE_V2_ROLL_OFF_ATOM_IDS,
} from "./official-determine-initiative-executor-v2.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS,
} from "./official-end-of-round-effects-executor-v2.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION,
} from "./official-end-of-round-effects-executor-v5.mjs";
import {
  applyOfficialHoldPositionEndGameV2,
  enumerateOfficialHoldPositionEndGameActionsV2,
} from "./official-hold-position-end-game-executor-v2.mjs";
import {
  applyOfficialMissionMarkerControlV3,
  enumerateOfficialMissionMarkerControlActionsV3,
} from "./official-mission-marker-control-executor-v3.mjs";
import {
  OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_ATOM_IDS,
  OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_TYPE,
  OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
  OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_VERSION,
} from "./official-scoring-finalization-rules-executor-v1.mjs";
import {
  applyOfficialMovementHoldV1,
  enumerateOfficialMovementHoldActionsV1,
} from "./official-movement-hold-executor-v1.mjs";
import {
  applyOfficialPhaseInitiativeV1,
  enumerateOfficialPhaseInitiativeActionsV1,
  isOfficialPhaseInitiativePendingV1,
} from "./official-phase-initiative-executor-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from
  "./official-round-supply-state-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_V5_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V5_EXECUTOR_VERSION,
} from "./official-start-of-round-executor-v5.mjs";
import { createOfficialSupplyLossLedgerV1 } from
  "./official-supply-loss-ledger-v1.mjs";
import {
  applyOfficialVictoryPointScoringV2,
  enumerateOfficialVictoryPointScoringActionsV2,
  OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE,
  OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS,
  OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
  OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION,
} from "./official-victory-point-scoring-executor-v2.mjs";

export const OFFICIAL_TICKET18_COMPLETE_MATCH_RUNTIME_VERSION =
  "official_ticket18_complete_match_runtime_v1";

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const PHASE_KEYS = Object.freeze(["movement", "assault", "combat"]);
const ADAPTER = "ticket18_current_frozen_terran_zerg_complete_match_v1";
const CUSTOM_EXECUTORS = new Set([
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
  OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID,
  OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !keys.includes(key)));
}

function executable(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function assertSide(state, sideKey) {
  if (!SIDE_KEYS.includes(sideKey) || !object(state?.players?.[sideKey])) {
    fail("TICKET18_COMPLETE_MATCH_SIDE_INVALID", { sideKey });
  }
}

function assertCurrentBinding(state, options, descriptor, sourceBinding,
  factionBindings) {
  verifyOfficialGameplayDataBundleV1(state?.officialGameplayDataBundle);
  verifyOfficialMissionSetupBindingV1(
    state?.officialMissionSetupBinding,
    state.officialGameplayDataBundle,
  );
  if (state.officialGameplayDataBundle.normalizedDatasetHash !== sourceBinding.dataset
    || options.matchBinding?.dataSnapshotHash
      !== hashStarcraftTmgContract(state.officialGameplayDataBundle)
    || options.matchBinding?.rulesRuntimeBinding?.runtimeHash !== descriptor.runtimeHash
    || hashStarcraftTmgContract(state.officialFactionBindingsBySide)
      !== hashStarcraftTmgContract(factionBindings)) {
    fail("TICKET18_COMPLETE_MATCH_BINDING_DRIFT");
  }
}

function profileSupply(profile, currentModels, pieceId) {
  if (!Number.isSafeInteger(currentModels) || currentModels < 1) {
    fail("TICKET18_COMPLETE_MATCH_UNIT_STATE_INVALID", { pieceId });
  }
  const tier = profile.squadProfile.find((row) => row.minimumModels !== null
    && currentModels >= row.minimumModels && currentModels <= row.maximumModels);
  if (!tier) fail("TICKET18_COMPLETE_MATCH_UNIT_STATE_INVALID", { pieceId });
  return tier.supply;
}

function assertSupportedPieces(state) {
  const profiles = state.officialGameplayDataBundle.combatProfileBundle.profiles;
  const byKey = new Map(profiles.map((profile) => [profile.recordKey, profile]));
  if (profiles.length < 2 || !profiles.some((profile) => profile.recordKey === "army_units:marine")
    || !profiles.some((profile) => profile.recordKey === "army_units:zergling")) {
    fail("TICKET18_COMPLETE_MATCH_PROFILE_SCOPE_INVALID");
  }
  for (const piece of state.pieces || []) {
    const profile = byKey.get(piece.officialUnitRecordKey);
    const live = piece.isDestroyed !== true && Number(piece.currentModels) > 0;
    if (!profile || !SIDE_KEYS.includes(piece.sideKey)
      || piece.sourceRecordHash !== profile.sourceRecordHash
      || piece.officialPayloadHash !== profile.payloadHash
      || !Array.isArray(piece.statuses) || !Array.isArray(piece.combatEffects)
      || !Array.isArray(piece.selectedUpgradeNames)
      || !object(piece.activatedPhases)
      || PHASE_KEYS.some((phase) => typeof piece.activatedPhases[phase] !== "boolean")) {
      fail("TICKET18_COMPLETE_MATCH_UNIT_STATE_INVALID", { pieceId: piece?.id });
    }
    const expectedSupply = live
      ? profileSupply(profile, Number(piece.currentModels), piece.id) : 0;
    if (Number(piece.currentSupply) !== expectedSupply) {
      fail("TICKET18_COMPLETE_MATCH_SUPPLY_INVALID", { pieceId: piece.id });
    }
  }
}

function candidate(action, score, rulesTruth) {
  return {
    ...action,
    isEnabled: true,
    disabledReason: "",
    score,
    details: {
      adapter: ADAPTER,
      rulesTruth,
      scope: "current_frozen_marine_zergling_hold_position_evaluation_only",
      productionRoomEligible: false,
      trainingTruth: false,
    },
  };
}

function appendLog(state, action, events, phase) {
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round),
    phase,
    action: clone(action),
    events: clone(events),
  });
}

function completeSteps(state) {
  return clone(state.scoringCleanupProgress?.completedSteps || []);
}

function endOfRoundAction(state) {
  const proofBody = {
    schema: "starcraft_tmg_ticket18_complete_match_effect_queue_v1",
    round: Number(state.round),
    effectCount: 0,
    queueComplete: true,
    supportedStatuses: ["stationary"],
    gameplayDataBundleHash: state.officialGameplayDataBundle.gameplayDataBundleHash,
    trainingTruth: false,
  };
  const effectQueueProof = {
    ...proofBody,
    effectQueueProofHash: hashStarcraftTmgContract(proofBody),
  };
  return {
    actionType: OFFICIAL_END_OF_ROUND_EFFECTS_V5_ACTION_TYPE,
    sideKey: state.firstPlayerSideKey,
    phase: "cleanup",
    effectQueueProofHash: effectQueueProof.effectQueueProofHash,
    effectQueueProof,
    ruleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS],
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION,
  };
}

function cleanupAction(state) {
  const resolutionBody = {
    schema: "starcraft_tmg_ticket18_complete_match_cleanup_resolution_v1",
    round: Number(state.round),
    effectQueueProofHash: state.scoringCleanupProgress.effectQueueProofHash,
    resetPieceIds: state.pieces.map((piece) => piece.id).sort(),
    readyCardIds: Object.values(state.cardResources || {}).flat()
      .map((card) => card.id).sort(),
    removableStatuses: ["stationary"],
    trainingTruth: false,
  };
  const cleanupResolution = {
    ...resolutionBody,
    cleanupResolutionHash: hashStarcraftTmgContract(resolutionBody),
  };
  return {
    actionType: OFFICIAL_CLEANUP_REFRESH_V5_ACTION_TYPE,
    sideKey: state.firstPlayerSideKey,
    phase: "cleanup",
    cleanupResolutionHash: cleanupResolution.cleanupResolutionHash,
    cleanupResolution,
    ruleAtomIds: [...OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_VERSION,
  };
}

function initiativeAction(state) {
  const tied = Number(state.scores.player1) === Number(state.scores.player2);
  const resolutionBody = {
    schema: "starcraft_tmg_ticket18_complete_match_initiative_resolution_v1",
    round: Number(state.round),
    nextRound: Number(state.round) + 1,
    scores: clone(state.scores),
    mode: tied ? "tied_vp_roll_off" : "trailing_player",
    deterministicFirstPlayerSideKey: tied ? null
      : Number(state.scores.player1) < Number(state.scores.player2)
        ? "player1" : "player2",
    trainingTruth: false,
  };
  const initiativeResolution = {
    ...resolutionBody,
    initiativeResolutionHash: hashStarcraftTmgContract(resolutionBody),
  };
  return {
    actionType: OFFICIAL_DETERMINE_INITIATIVE_V2_ACTION_TYPE,
    sideKey: state.firstPlayerSideKey,
    phase: "cleanup",
    initiativeResolutionHash: initiativeResolution.initiativeResolutionHash,
    initiativeResolution,
    ruleAtomIds: tied
      ? [...new Set([
          ...OFFICIAL_DETERMINE_INITIATIVE_V2_DETERMINISTIC_ATOM_IDS,
          ...OFFICIAL_DETERMINE_INITIATIVE_V2_ROLL_OFF_ATOM_IDS,
        ])].sort()
      : [...OFFICIAL_DETERMINE_INITIATIVE_V2_DETERMINISTIC_ATOM_IDS],
    executorId: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION,
    ...(tied ? {
      chance: {
        kind: "fixed_roll_sequence",
        faces: 6,
        count: 4,
        layout: { initiativePlayer1: 2, initiativePlayer2: 2 },
      },
    } : {}),
  };
}

function startOfRoundAction(state, descriptor) {
  const roundSupplyState = createOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: state.officialGameplayDataBundle,
    rulesRuntimeHash: descriptor.runtimeHash,
  });
  const supplyLossLedger = createOfficialSupplyLossLedgerV1({
    round: Number(state.round),
    rulesRuntimeHash: descriptor.runtimeHash,
  });
  const resolutionBody = {
    schema: "starcraft_tmg_ticket18_complete_match_start_of_round_resolution_v1",
    round: Number(state.round),
    firstPlayerSideKey: state.firstPlayerSideKey,
    roundSupplyState,
    supplyLossLedger,
    stationaryPieceIds: state.pieces.filter((piece) => piece.isOnField
      && !piece.isDestroyed && Number(piece.currentModels) > 0)
      .map((piece) => piece.id).sort(),
    readyCardIds: Object.values(state.cardResources || {}).flat()
      .map((card) => card.id).sort(),
    gameplayDataBundleHash: state.officialGameplayDataBundle.gameplayDataBundleHash,
    trainingTruth: false,
  };
  const startOfRoundResolution = {
    ...resolutionBody,
    startOfRoundResolutionHash: hashStarcraftTmgContract(resolutionBody),
  };
  return {
    actionType: OFFICIAL_START_OF_ROUND_V5_ACTION_TYPE,
    sideKey: state.firstPlayerSideKey,
    phase: "start_of_round",
    startOfRoundResolutionHash: startOfRoundResolution.startOfRoundResolutionHash,
    startOfRoundResolution,
    ruleAtomIds: [...OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_VERSION,
  };
}

function markerVpBreakdown(state, sideKey) {
  const mission = state.officialGameplayDataBundle.missionScoringProfile;
  const affinity = state.officialMissionSetupBinding.markerAffinityByNumber;
  const controlledMarkerVp = state.board.missionMarkers
    .filter((marker) => marker.controlSideKey === sideKey)
    .map((marker) => ({
      markerId: marker.id,
      markerNumber: Number(marker.number),
      affinitySideKey: affinity[marker.number],
      vp: affinity[marker.number] === null || affinity[marker.number] === sideKey
        ? mission.neutralOrOwnAffinityMarkerVp
        : mission.opponentAffinityMarkerVp,
    }));
  const markerVp = controlledMarkerVp.reduce((sum, marker) => sum + marker.vp, 0);
  return { destroyedEnemySupplyVp: 0, markerVp, roundVp: markerVp,
    controlledMarkerVp };
}

function finalRoundScoringAction(state) {
  const resolutionBody = {
    schema: "starcraft_tmg_ticket18_complete_match_final_scoring_resolution_v1",
    round: 5,
    missionRecordKey: state.officialGameplayDataBundle.missionScoringProfile.recordKey,
    missionScoringProfileHash:
      state.officialGameplayDataBundle.missionScoringProfile.missionScoringProfileHash,
    missionSetupBindingHash: state.officialMissionSetupBinding.missionSetupBindingHash,
    supplyLossLedgerHash: state.supplyLossLedger.ledgerHash,
    controlResolutionHash: state.scoringCleanupProgress.controlResolutionHash,
    simultaneousBeforeScores: clone(state.scores),
    breakdowns: {
      player1: markerVpBreakdown(state, "player1"),
      player2: markerVpBreakdown(state, "player2"),
    },
    faq16DeactivatedMarkerFaceIgnoredForControl: true,
    trainingTruth: false,
  };
  const scoringResolution = { ...resolutionBody,
    scoringResolutionHash: hashStarcraftTmgContract(resolutionBody) };
  return {
    actionType: OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE,
    sideKey: state.firstPlayerSideKey,
    phase: "cleanup",
    scoringResolutionHash: scoringResolution.scoringResolutionHash,
    scoringResolution,
    ruleAtomIds: [...OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS],
    executorId: OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION,
  };
}

function finalRoundTerminalAction(state) {
  const difference = Number(state.scores.player1) - Number(state.scores.player2);
  const winnerSideKey = difference === 0 ? null
    : difference > 0 ? "player1" : "player2";
  const planBody = {
    schema: "starcraft_tmg_ticket18_complete_match_finalization_plan_v1",
    procedureKind: "round_limit_terminal_after_vp_scoring",
    round: 5,
    finalScores: clone(state.scores),
    highestVpWins: true,
    missionTiebreaker:
      state.officialGameplayDataBundle.missionScoringProfile.finalTiebreaker,
    tiebreakerApplied: false,
    outcome: winnerSideKey ? "winner" : "draw",
    winnerSideKey,
    terminalReason: "round_limit_final_score",
    trainingTruth: false,
  };
  const scoringFinalizationPlan = {
    ...planBody,
    planHash: hashStarcraftTmgContract(planBody),
  };
  return {
    actionType: OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_TYPE,
    sideKey: state.firstPlayerSideKey,
    phase: "cleanup",
    pieceId: "",
    scoringFinalizationPlan,
    ruleAtomIds: [...OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_VERSION,
  };
}

function replacementFor(state, sideKey, descriptor) {
  assertSide(state, sideKey);
  if (sideKey !== state.firstPlayerSideKey) return null;
  const step = state.scoringCleanupProgress?.currentStep;
  if (state.phase === "cleanup" && Number(state.round) === 1) {
    return candidate(initiativeAction(state), 120,
      "official_round_one_non_marker_scoring_handoff_and_tied_roll_off");
  }
  if (state.phase === "cleanup" && Number(state.round) === 5
    && step === OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE) {
    return candidate(finalRoundScoringAction(state), 120,
      "official_hold_position_final_round_simultaneous_scoring");
  }
  if (state.phase === "cleanup" && Number(state.round) === 5
    && step === "check_end_game_conditions") {
    return candidate(finalRoundTerminalAction(state), 120,
      "official_round_limit_highest_vp_or_mission_tiebreaker_or_draw");
  }
  if (state.phase === "cleanup" && step === OFFICIAL_END_OF_ROUND_EFFECTS_V5_ACTION_TYPE) {
    return candidate(endOfRoundAction(state), 120,
      "official_empty_end_of_round_queue_for_bound_terran_zerg_profiles");
  }
  if (state.phase === "cleanup" && step === OFFICIAL_CLEANUP_REFRESH_V5_ACTION_TYPE) {
    return candidate(cleanupAction(state), 120,
      "official_cleanup_reset_for_bound_terran_zerg_profiles");
  }
  if (state.phase === "cleanup" && step === OFFICIAL_DETERMINE_INITIATIVE_V2_ACTION_TYPE) {
    return candidate(initiativeAction(state), 120,
      "official_lower_vp_or_tied_roll_off_next_round_handoff");
  }
  if (state.phase === "start_of_round") {
    return candidate(startOfRoundAction(state, descriptor), 120,
      "official_supply_stationary_ready_and_movement_window_for_bound_profiles");
  }
  return null;
}

function assertExactCustomAction(state, action, descriptor) {
  const expected = replacementFor(state, action.sideKey, descriptor);
  if (!expected || !isDeepStrictEqual(action, executable(expected))) {
    fail("TICKET18_COMPLETE_MATCH_ACTION_STALE");
  }
}

function applyEndOfRound(stateInput, action, postRevision) {
  const state = clone(stateInput);
  const proof = action.effectQueueProof;
  const progress = state.scoringCleanupProgress;
  state.endOfRoundEffectHistory = Array.isArray(state.endOfRoundEffectHistory)
    ? state.endOfRoundEffectHistory : [];
  state.endOfRoundEffectHistory.push({
    schema: "starcraft_tmg_ticket18_complete_match_end_of_round_history_v1",
    round: Number(state.round),
    effectQueueProofHash: proof.effectQueueProofHash,
    effectCount: 0,
    queueComplete: true,
    trainingTruth: false,
  });
  state.scoringCleanupProgress = {
    ...clone(progress),
    completedSteps: [...completeSteps(state), OFFICIAL_END_OF_ROUND_EFFECTS_V5_ACTION_TYPE],
    currentStep: OFFICIAL_CLEANUP_REFRESH_V5_ACTION_TYPE,
    effectQueueProofHash: proof.effectQueueProofHash,
    trainingTruth: false,
  };
  const events = [{
    type: "end_of_round_effect_window_resolved",
    round: Number(state.round),
    effectCount: 0,
    effectQueueProofHash: proof.effectQueueProofHash,
    runtimeAdapter: ADAPTER,
    trainingTruth: false,
  }];
  appendLog(state, action, events, "cleanup");
  return { ok: true, state, events, action: clone(action), postRevision,
    rulesTruth: "official_empty_end_of_round_queue_for_bound_terran_zerg_profiles",
    trainingTruth: false };
}

function applyCleanup(stateInput, action, postRevision) {
  const state = clone(stateInput);
  for (const piece of state.pieces) {
    if (piece.statuses.some((status) => status !== "stationary")) {
      fail("TICKET18_COMPLETE_MATCH_UNSUPPORTED_STATUS", { pieceId: piece.id });
    }
    piece.statuses = [];
    piece.activatedPhases = { movement: false, assault: false, combat: false };
  }
  for (const cards of Object.values(state.cardResources || {})) {
    for (const card of cards) {
      card.readiness = "ready";
      card.face = "up";
    }
  }
  for (const sideKey of SIDE_KEYS) state.players[sideKey].passedPhases = {};
  state.firstPassSideByPhase = {};
  delete state.reactionUsage;
  delete state.academyReactionUsage;
  const resolution = action.cleanupResolution;
  state.cleanupRefreshHistory = Array.isArray(state.cleanupRefreshHistory)
    ? state.cleanupRefreshHistory : [];
  state.cleanupRefreshHistory.push({
    schema: "starcraft_tmg_ticket18_complete_match_cleanup_history_v1",
    round: Number(state.round),
    cleanupResolutionHash: resolution.cleanupResolutionHash,
    resetPieceIds: clone(resolution.resetPieceIds),
    readyCardIds: clone(resolution.readyCardIds),
    trainingTruth: false,
  });
  state.scoringCleanupProgress = {
    ...clone(state.scoringCleanupProgress),
    completedSteps: [...completeSteps(state), OFFICIAL_CLEANUP_REFRESH_V5_ACTION_TYPE],
    currentStep: OFFICIAL_DETERMINE_INITIATIVE_V2_ACTION_TYPE,
    cleanupResolutionHash: resolution.cleanupResolutionHash,
    trainingTruth: false,
  };
  const events = [{ type: "cleanup_refresh_resolved", round: Number(state.round),
    cleanupResolutionHash: resolution.cleanupResolutionHash,
    runtimeAdapter: ADAPTER, trainingTruth: false }];
  appendLog(state, action, events, "cleanup");
  return { ok: true, state, events, action: clone(action), postRevision,
    rulesTruth: "official_cleanup_reset_for_bound_terran_zerg_profiles",
    trainingTruth: false };
}

function chanceWinner(chanceReveals) {
  if (!Array.isArray(chanceReveals) || chanceReveals.length !== 4) {
    fail("TICKET18_COMPLETE_MATCH_CHANCE_REVEALS_REQUIRED");
  }
  const values = chanceReveals.map((reveal, index) => {
    const outcome = Number(reveal?.outcome);
    if (reveal?.counter !== index || reveal?.faces !== 6
      || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("TICKET18_COMPLETE_MATCH_CHANCE_REVEAL_INVALID");
    }
    return outcome;
  });
  const player1 = values[0] + values[1];
  const player2 = values[2] + values[3];
  return { values, player1, player2, winner: player1 === player2 ? null
    : player1 > player2 ? "player1" : "player2" };
}

function applyInitiative(stateInput, action, options) {
  const state = clone(stateInput);
  const completedRound = Number(state.round);
  const resolution = action.initiativeResolution;
  const rollOff = resolution.mode === "tied_vp_roll_off"
    ? chanceWinner(options.chanceReveals) : null;
  state.initiativeRollOffHistory = Array.isArray(state.initiativeRollOffHistory)
    ? state.initiativeRollOffHistory : [];
  if (rollOff && !rollOff.winner) {
    state.initiativeRollOffHistory.push({ round: Number(state.round),
      player1Rolls: rollOff.values.slice(0, 2), player2Rolls: rollOff.values.slice(2),
      result: "tie", runtimeAdapter: ADAPTER, trainingTruth: false });
    const events = [{ type: "initiative_roll_off_tied", round: Number(state.round),
      runtimeAdapter: ADAPTER, trainingTruth: false }];
    appendLog(state, action, events, "cleanup");
    return { ok: true, state, events, action: clone(action),
      postRevision: Number(options.postRevision || 0),
      rulesTruth: "official_tied_vp_requires_new_roll_off", trainingTruth: false };
  }
  const nextFirstPlayer = rollOff?.winner || resolution.deterministicFirstPlayerSideKey;
  assertSide(state, nextFirstPlayer);
  if (rollOff) state.initiativeRollOffHistory.push({ round: Number(state.round),
    player1Rolls: rollOff.values.slice(0, 2), player2Rolls: rollOff.values.slice(2),
    result: "winner", winnerSideKey: nextFirstPlayer,
    runtimeAdapter: ADAPTER, trainingTruth: false });
  state.determineInitiativeHistory = Array.isArray(state.determineInitiativeHistory)
    ? state.determineInitiativeHistory : [];
  state.determineInitiativeHistory.push({
    schema: "starcraft_tmg_ticket18_complete_match_initiative_history_v1",
    round: Number(state.round),
    nextRound: Number(state.round) + 1,
    nextFirstPlayerSideKey: nextFirstPlayer,
    initiativeResolutionHash: resolution.initiativeResolutionHash,
    runtimeAdapter: ADAPTER,
    trainingTruth: false,
  });
  if (completedRound === 1) {
    for (const piece of state.pieces) {
      piece.activatedPhases = { movement: false, assault: false, combat: false };
    }
    for (const sideKey of SIDE_KEYS) state.players[sideKey].passedPhases = {};
    state.firstPassSideByPhase = {};
  }
  state.round = Number(state.round) + 1;
  state.phase = "start_of_round";
  state.firstPlayerSideKey = nextFirstPlayer;
  state.activeSideKey = nextFirstPlayer;
  delete state.scoringCleanupProgress;
  delete state.officialRoundSupplyState;
  delete state.supplyLossLedger;
  const events = [{ type: "initiative_determined", nextRound: Number(state.round),
    nextFirstPlayerSideKey: nextFirstPlayer, runtimeAdapter: ADAPTER,
    trainingTruth: false }];
  appendLog(state, action, events, "cleanup");
  return { ok: true, state, events, action: clone(action),
    postRevision: Number(options.postRevision || 0),
    rulesTruth: rollOff ? "official_tied_vp_roll_off_next_round_handoff"
      : "official_lower_vp_next_round_handoff", trainingTruth: false };
}

function applyStartOfRound(stateInput, action, postRevision) {
  const state = clone(stateInput);
  const resolution = action.startOfRoundResolution;
  for (const piece of state.pieces) {
    if (resolution.stationaryPieceIds.includes(piece.id)) piece.statuses = ["stationary"];
  }
  for (const cards of Object.values(state.cardResources || {})) {
    for (const card of cards) {
      card.readiness = "ready";
      card.face = "up";
    }
  }
  state.officialRoundSupplyState = clone(resolution.roundSupplyState);
  state.supplyLossLedger = clone(resolution.supplyLossLedger);
  state.phase = "movement";
  state.activeSideKey = state.firstPlayerSideKey;
  state.startOfRoundHistory = Array.isArray(state.startOfRoundHistory)
    ? state.startOfRoundHistory : [];
  state.startOfRoundHistory.push({
    schema: "starcraft_tmg_ticket18_complete_match_start_of_round_history_v1",
    round: Number(state.round),
    firstPlayerSideKey: state.firstPlayerSideKey,
    startOfRoundResolutionHash: resolution.startOfRoundResolutionHash,
    roundSupplyStateHash: resolution.roundSupplyState.roundSupplyStateHash,
    supplyLossLedgerHash: resolution.supplyLossLedger.ledgerHash,
    stationaryPieceIds: clone(resolution.stationaryPieceIds),
    readyCardIds: clone(resolution.readyCardIds),
    trainingTruth: false,
  });
  const events = [{ type: "start_of_round_resolved", round: Number(state.round),
    nextPhase: "movement", nextActiveSideKey: state.firstPlayerSideKey,
    runtimeAdapter: ADAPTER, trainingTruth: false }];
  appendLog(state, action, events, "start_of_round");
  return { ok: true, state, events, action: clone(action), postRevision,
    rulesTruth: "official_supply_stationary_ready_and_movement_window_for_bound_profiles",
    trainingTruth: false };
}

function applyFinalRoundScoring(stateInput, action, faq, postRevision) {
  const state = clone(stateInput);
  const resolution = action.scoringResolution;
  for (const sideKey of SIDE_KEYS) {
    state.scores[sideKey] = resolution.simultaneousBeforeScores[sideKey]
      + resolution.breakdowns[sideKey].roundVp;
  }
  state.victoryPointScoringHistory = Array.isArray(state.victoryPointScoringHistory)
    ? state.victoryPointScoringHistory : [];
  state.victoryPointScoringHistory.push({
    round: 5,
    scoringResolutionHash: resolution.scoringResolutionHash,
    breakdowns: clone(resolution.breakdowns),
    resultingScores: clone(state.scores),
    finalRound: true,
    trainingTruth: false,
  });
  state.scoringCleanupProgress = {
    ...clone(state.scoringCleanupProgress),
    completedSteps: ["determine_mission_marker_control", "score_victory_points"],
    currentStep: "check_end_game_conditions",
    scoringResolutionHash: resolution.scoringResolutionHash,
    trainingTruth: false,
  };
  const audits = state.board.missionMarkers.map((marker) => faq.evaluate("faq-v1:16", {
    markerOnBattlefield: true,
    markerFace: marker.isActivated === false ? "deactivated" : "activated",
    normalControlEligible: true,
  }));
  const events = [{
    type: "victory_points_scored",
    round: 5,
    scoringResolutionHash: resolution.scoringResolutionHash,
    breakdowns: clone(resolution.breakdowns),
    resultingScores: clone(state.scores),
    finalRound: true,
    trainingTruth: false,
  }, {
    type: "official_faq_applicability_audit",
    entryId: "faq-v1:16",
    routerHash: faq.manifest.hash,
    decisionHashes: audits.map((audit) => audit.hash),
    deactivatedMarkerFaceIgnoredForScoringControl: true,
    trainingTruth: false,
  }];
  appendLog(state, action, events, "cleanup");
  return { ok: true, state, events, action: clone(action), postRevision,
    rulesTruth: "official_hold_position_final_round_simultaneous_scoring",
    trainingTruth: false };
}

function applyFinalRoundTerminal(stateInput, action, postRevision) {
  const state = clone(stateInput);
  const plan = action.scoringFinalizationPlan;
  if (plan.missionTiebreaker !== null) {
    fail("TICKET18_COMPLETE_MATCH_MISSION_TIEBREAKER_UNSUPPORTED");
  }
  const resolutionBody = {
    schema: "starcraft_tmg_ticket18_complete_match_end_game_resolution_v1",
    round: 5,
    finalScores: clone(plan.finalScores),
    highestVpWins: true,
    missionTiebreaker: null,
    tiebreakerApplied: false,
    outcome: plan.outcome,
    winnerSideKey: plan.winnerSideKey,
    terminalReason: plan.terminalReason,
    runtimeAdapter: ADAPTER,
    trainingTruth: false,
  };
  const resolution = {
    ...resolutionBody,
    endGameResolutionHash: hashStarcraftTmgContract(resolutionBody),
  };
  state.gameOver = true;
  state.terminal = true;
  state.winner = plan.winnerSideKey || "";
  state.terminalReason = plan.terminalReason;
  state.activeSideKey = null;
  state.endGameResolutionHistory = Array.isArray(state.endGameResolutionHistory)
    ? state.endGameResolutionHistory : [];
  state.endGameResolutionHistory.push(resolution);
  state.scoringCleanupProgress = {
    ...clone(state.scoringCleanupProgress),
    completedSteps: [...new Set([
      ...completeSteps(state),
      "check_end_game_conditions",
    ])],
    currentStep: "terminal",
    endGameResolutionHash: resolution.endGameResolutionHash,
    trainingTruth: false,
  };
  const events = [{
    type: "round_limit_final_score_game_end",
    outcome: resolution.outcome,
    winnerSideKey: resolution.winnerSideKey,
    finalScore: clone(resolution.finalScores),
    missionTiebreaker: null,
    runtimeAdapter: ADAPTER,
    trainingTruth: false,
  }];
  appendLog(state, action, events, "cleanup");
  return { ok: true, state, events, action: clone(action), postRevision,
    rulesTruth: "official_round_limit_highest_vp_or_mission_tiebreaker_or_draw",
    trainingTruth: false };
}

function appendFaq16Audit(result, faq) {
  const state = clone(result.state);
  const audits = state.board.missionMarkers.map((marker) => faq.evaluate("faq-v1:16", {
    markerOnBattlefield: true,
    markerFace: marker.isActivated === false ? "deactivated" : "activated",
    normalControlEligible: true,
  }));
  const event = {
    type: "official_faq_applicability_audit",
    entryId: "faq-v1:16",
    routerHash: faq.manifest.hash,
    decisionHashes: audits.map((audit) => audit.hash),
    deactivatedMarkersRemainControlEligible: audits.every((audit) => audit.legal),
    trainingTruth: false,
  };
  const events = [...(result.events || []), event];
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.events = clone(events);
  return { ...result, state, events };
}

function faq16ScoringProjection(state, faq) {
  const projected = clone(state);
  const audits = projected.board.missionMarkers.map((marker) => faq.evaluate("faq-v1:16", {
    markerOnBattlefield: true,
    markerFace: marker.isActivated === false ? "deactivated" : "activated",
    normalControlEligible: true,
  }));
  for (const marker of projected.board.missionMarkers) marker.isActivated = true;
  return { projected, audits };
}

function scopedEnumeration(state, options, descriptor, faq) {
  const sideKey = String(options.sideKey || "");
  const replacement = replacementFor(state, sideKey, descriptor);
  if (replacement) return { candidates: [replacement], parameterDomains: [] };
  if (state.gameOver === true || state.terminal === true) {
    return { candidates: [], parameterDomains: [], terminal: {
      gameOver: true,
      winner: String(state.winner || ""),
      reason: String(state.terminalReason || ""),
      endGameResolutionHash:
        state.endGameResolutionHistory?.at(-1)?.endGameResolutionHash || null,
    } };
  }
  if (PHASE_KEYS.includes(state.phase) && isOfficialPhaseInitiativePendingV1(state)) {
    return { candidates: enumerateOfficialPhaseInitiativeActionsV1(state, options),
      parameterDomains: [] };
  }
  if (state.phase === "movement") {
    return { candidates: [
      ...enumerateOfficialMovementHoldActionsV1(state, options),
      ...enumerateOfficialActivationPassActionsV1(state, options),
    ], parameterDomains: [] };
  }
  if (state.phase === "assault") {
    return { candidates: enumerateOfficialActivationPassActionsV1(state, options),
      parameterDomains: [] };
  }
  if (state.phase === "combat") {
    return { candidates: enumerateOfficialCombatPassV3Actions(state, options),
      parameterDomains: [] };
  }
  if (state.phase === "cleanup" && !state.scoringCleanupProgress) {
    return { candidates: enumerateOfficialMissionMarkerControlActionsV3(state, options),
      parameterDomains: [] };
  }
  if (state.phase === "cleanup"
    && state.scoringCleanupProgress?.currentStep === "score_victory_points") {
    const projection = faq16ScoringProjection(state, faq);
    return { candidates: enumerateOfficialVictoryPointScoringActionsV2(
      projection.projected,
      options,
    ),
      parameterDomains: [] };
  }
  if (state.phase === "cleanup"
    && state.scoringCleanupProgress?.currentStep === "check_end_game_conditions") {
    return { candidates: enumerateOfficialHoldPositionEndGameActionsV2(state, options),
      parameterDomains: [] };
  }
  return { candidates: [], parameterDomains: [] };
}

function applyScopedHold(state, action, options) {
  const held = applyOfficialMovementHoldV1(state, action, options);
  const settled = settleOfficialAlternatingPhaseAfterActivationV1(held.state, {
    phase: "movement",
    actingSideKey: action.sideKey,
  });
  const events = [...held.events, ...settled.events];
  const lastLog = settled.state.log?.at(-1);
  if (lastLog) events.length > 0 && (lastLog.events = clone(events));
  return { ...held, state: settled.state, events, action: clone(action),
    rulesTruth: "official_movement_hold_with_alternating_phase_settlement",
    trainingTruth: false };
}

export function createOfficialTicket18CompleteMatchRuntimeV1(input = {}) {
  const base = createOfficialExecutableRuleRuntimeV1({ catalogue: input.catalogue });
  const faq = createOfficialFaqRuleRouterV2({
    sourceBinding: input.sourceBinding,
    sources: input.sources,
  });
  const factionBindings = freeze(Object.fromEntries((input.factionRecords || [])
    .map((record) => [record.payload?.faction === "Zerg" ? "player2" : "player1", {
      factionRecordKey: record.recordKey,
      sourceRecordHash: record.sourceRecordHash,
      payloadHash: record.payloadHash,
      factionName: record.payload?.name,
      rulesAuthority: "official_current_command_center_record",
      trainingTruth: false,
    }])));
  if (factionBindings.player1?.factionRecordKey !== "tactical_cards:terran_armed_forces"
    || factionBindings.player2?.factionRecordKey !== "tactical_cards:zerg_swarm") {
    fail("TICKET18_COMPLETE_MATCH_FACTION_BINDING_INVALID");
  }
  const composition = seal({
    schema: OFFICIAL_TICKET18_COMPLETE_MATCH_RUNTIME_VERSION,
    baseRuntimeHash: base.descriptor.runtimeHash,
    baseCatalogueHash: base.descriptor.catalogueHash,
    sourceBinding: input.sourceBinding,
    faqRouterHash: faq.manifest.hash,
    supportedProfiles: ["army_units:marine", "army_units:zergling"],
    factionBindings,
    supportedMission: "faction_cards:mission_hold_position",
    adapterScope: ["round_one_handoff", "empty_end_of_round", "cleanup",
      "initiative", "start_of_round", "round_limit_terminal"],
    unsupportedActionFamiliesFailClosed: true,
    productionRoomEligible: false,
    fullRulesCoverageClaimed: false,
    trainingTruth: false,
  });
  const { runtimeHash: _runtimeHash, ...baseBody } = base.descriptor;
  const descriptorBody = {
    ...baseBody,
    runtimeId: OFFICIAL_TICKET18_COMPLETE_MATCH_RUNTIME_VERSION,
    runtimeVersion: "1.0.0",
    rulesVersion: "official-faq-v1-ticket18-complete-match-evaluation-2026-09-11",
    composition,
    faqRouterHash: faq.manifest.hash,
    productionRoomEligible: false,
    rulesTruth: "current_official_catalogue_plus_bounded_terran_zerg_match_adapter",
    trainingTruth: false,
  };
  const descriptor = freeze({
    ...descriptorBody,
    runtimeHash: hashStarcraftTmgContract(descriptorBody),
  });

  function enumerate(state, options = {}) {
    assertCurrentBinding(state, options, descriptor, input.sourceBinding,
      factionBindings);
    assertSupportedPieces(state);
    const scoped = scopedEnumeration(state, options, descriptor, faq);
    return freeze({
      schemaVersion: "starcraft_tmg_official_executable_legal_enumeration_v1",
      rulesRuntimeHash: descriptor.runtimeHash,
      stateSummary: {
        round: Number(state.round),
        phase: String(state.phase || ""),
        activeSideKey: state.activeSideKey ?? null,
        firstPlayerSideKey: state.firstPlayerSideKey ?? null,
      },
      terminal: scoped.terminal || null,
      candidates: scoped.candidates,
      parameterDomains: scoped.parameterDomains,
      legalSpaceComplete: false,
      developmentSubset: true,
      trainingTruth: false,
    });
  }

  function instantiate(state, domain, parameters, options = {}) {
    assertCurrentBinding(state, options, descriptor, input.sourceBinding,
      factionBindings);
    fail("TICKET18_COMPLETE_MATCH_PARAMETER_DOMAIN_UNSUPPORTED", {
      domainId: domain?.domainId,
      parameterCount: Object.keys(parameters || {}).length,
    });
  }

  function apply(state, action, options = {}) {
    assertCurrentBinding(state, options, descriptor, input.sourceBinding,
      factionBindings);
    assertSupportedPieces(state);
    if (CUSTOM_EXECUTORS.has(action.executorId)
      && replacementFor(state, action.sideKey, descriptor)) {
      assertExactCustomAction(state, action, descriptor);
      if (action.executorId === OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID) {
        return applyEndOfRound(state, action, Number(options.postRevision || 0));
      }
      if (action.executorId === OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID) {
        return applyCleanup(state, action, Number(options.postRevision || 0));
      }
      if (action.executorId === OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID) {
        return applyInitiative(state, action, options);
      }
      if (action.executorId === OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID) {
        return applyStartOfRound(state, action, Number(options.postRevision || 0));
      }
      if (action.executorId === OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID) {
        return applyFinalRoundScoring(
          state,
          action,
          faq,
          Number(options.postRevision || 0),
        );
      }
      if (action.executorId === OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID) {
        return applyFinalRoundTerminal(
          state,
          action,
          Number(options.postRevision || 0),
        );
      }
      fail("TICKET18_COMPLETE_MATCH_EXECUTOR_INVALID");
    }
    const legal = scopedEnumeration(state, {
      ...options,
      sideKey: action.sideKey,
      includeDisabled: false,
    }, descriptor, faq);
    if (!legal.candidates.some((entry) => isDeepStrictEqual(action, executable(entry)))) {
      fail("TICKET18_COMPLETE_MATCH_ACTION_STALE");
    }
    let applied;
    if (action.actionType === "choose_first_actor") {
      applied = applyOfficialPhaseInitiativeV1(state, action, options);
    } else if (action.actionType === "hold") {
      applied = applyScopedHold(state, action, options);
    } else if (action.actionType === "pass" && ["movement", "assault"].includes(state.phase)) {
      applied = applyOfficialActivationPassV1(state, action, options);
    } else if (action.actionType === "pass" && state.phase === "combat") {
      applied = applyOfficialCombatPassV3(state, action, options);
    } else if (action.actionType === "determine_mission_marker_control") {
      applied = applyOfficialMissionMarkerControlV3(state, action, options);
    } else if (action.actionType === "score_victory_points") {
      const projection = faq16ScoringProjection(state, faq);
      applied = applyOfficialVictoryPointScoringV2(
        projection.projected,
        action,
        options,
      );
      const restored = clone(applied);
      restored.state.board.missionMarkers.forEach((marker, index) => {
        marker.isActivated = state.board.missionMarkers[index].isActivated;
      });
      const auditEvent = {
        type: "official_faq_applicability_audit",
        entryId: "faq-v1:16",
        routerHash: faq.manifest.hash,
        decisionHashes: projection.audits.map((audit) => audit.hash),
        deactivatedMarkerFaceIgnoredForScoringControl: true,
        trainingTruth: false,
      };
      restored.events.push(auditEvent);
      const lastLog = restored.state.log?.at(-1);
      if (lastLog) lastLog.events = clone(restored.events);
      applied = restored;
    } else if (action.actionType === "check_end_game_conditions") {
      applied = applyOfficialHoldPositionEndGameV2(state, action, options);
    } else {
      fail("TICKET18_COMPLETE_MATCH_ACTION_UNSUPPORTED", {
        actionType: action.actionType,
      });
    }
    return action.actionType === "determine_mission_marker_control"
      ? appendFaq16Audit(applied, faq) : applied;
  }

  return freeze({ descriptor, composition, faq, enumerate, instantiate, apply });
}
