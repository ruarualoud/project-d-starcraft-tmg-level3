import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from "../source-data/official-gameplay-data-bundle-v1.mjs";
import { OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE } from "./official-cleanup-refresh-executor-v1.mjs";
import { OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE } from "./official-end-of-round-effects-executor-v2.mjs";
import { OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE } from "./official-hold-position-end-game-executor-v1.mjs";
import { OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE } from "./official-mission-marker-control-executor-v2.mjs";
import {
  createOfficialSupplyLossLedgerV1,
  verifyOfficialSupplyLossLedgerV1,
} from "./official-supply-loss-ledger-v1.mjs";
import { OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE } from "./official-victory-point-scoring-executor-v1.mjs";

export const OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE = "determine_initiative";
export const OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID =
  "authority.determine-initiative-v1";
export const OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_DETERMINE_INITIATIVE_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_DETERMINE_INITIATIVE_DETERMINISTIC_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-8-9-6-begin-next-round:59794c52142e",
  "rule-atom:singleton:core-8-9-6-trailing-player-initiative:9c7f7d7ce798",
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_DETERMINE_INITIATIVE_ROLL_OFF_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-tied-vp-marker-roll-off:78bbdf0a226c",
  "rule-atom:singleton:core-12-6-initiative-step:67defac71d74",
  "rule-atom:singleton:core-3-2-roll-off:3ba162798538",
  "rule-atom:tied-victory-point-first-player-rolloff",
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_DETERMINE_INITIATIVE_DETERMINISTIC_ATOM_IDS,
    ...OFFICIAL_DETERMINE_INITIATIVE_ROLL_OFF_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const PROGRESS_SCHEMA = "starcraft_tmg_scoring_cleanup_progress_v1";
const RESOLUTION_SCHEMA = "starcraft_tmg_official_determine_initiative_resolution_v1";
const HISTORY_SCHEMA = "starcraft_tmg_official_determine_initiative_history_entry_v1";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const REQUIRED_COMPLETED_STEPS = Object.freeze([
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
  OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
  OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function score(value, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) fail(code, String(value));
  return parsed;
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("DETERMINE_INITIATIVE_RUNTIME_BINDING_REQUIRED");
  return value;
}

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey) || !object(state?.players?.[sideKey])) {
    fail("DETERMINE_INITIATIVE_FIRST_PLAYER_REQUIRED");
  }
  return sideKey;
}

function verifyProgress(state) {
  const progress = state?.scoringCleanupProgress;
  if (!object(progress)
    || progress.schemaVersion !== PROGRESS_SCHEMA
    || progress.round !== Number(state.round)
    || progress.currentStep !== OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE
    || !isDeepStrictEqual(progress.completedSteps, REQUIRED_COMPLETED_STEPS)
    || !HASH_PATTERN.test(String(progress.controlResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.scoringResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.endGameResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.effectQueueProofHash || ""))
    || !HASH_PATTERN.test(String(progress.cleanupResolutionHash || ""))
    || progress.trainingTruth !== false) {
    fail("DETERMINE_INITIATIVE_PROGRESS_INVALID");
  }
  const cleanupHistory = Array.isArray(state.cleanupRefreshHistory)
    ? state.cleanupRefreshHistory.at(-1)
    : null;
  if (!object(cleanupHistory)
    || cleanupHistory.schema !== "starcraft_tmg_official_cleanup_refresh_history_entry_v1"
    || cleanupHistory.round !== Number(state.round)
    || cleanupHistory.cleanupResolutionHash !== progress.cleanupResolutionHash
    || cleanupHistory.trainingTruth !== false) {
    fail("DETERMINE_INITIATIVE_PROGRESS_INVALID");
  }
  return progress;
}

function initiativeResolution(state, context) {
  const scores = {
    player1: score(state.scores.player1, "DETERMINE_INITIATIVE_SCORE_INVALID"),
    player2: score(state.scores.player2, "DETERMINE_INITIATIVE_SCORE_INVALID"),
  };
  const tied = scores.player1 === scores.player2;
  const nextFirstPlayerSideKey = tied
    ? null
    : scores.player1 < scores.player2 ? "player1" : "player2";
  const rollOffAttempt = tied
    ? Number(context.progress.initiativeRollOffAttempt || 0) + 1
    : null;
  if (tied && (!Number.isSafeInteger(rollOffAttempt) || rollOffAttempt < 1)) {
    fail("DETERMINE_INITIATIVE_PROGRESS_INVALID");
  }
  const body = {
    schema: RESOLUTION_SCHEMA,
    round: context.round,
    nextRound: context.round + 1,
    previousFirstPlayerSideKey: context.firstPlayer,
    nextFirstPlayerSideKey,
    scores,
    initiativeMode: tied ? "tied_vp_roll_off" : "trailing_player",
    rollOffAttempt,
    rollOffDice: tied ? {
      faces: 6,
      player1Dice: 2,
      player2Dice: 2,
      tiePolicy: "repeat_new_roll_off_attempt_until_winner",
    } : null,
    cleanupResolutionHash: context.progress.cleanupResolutionHash,
    gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
    missionScoringProfileHash:
      context.gameplayDataBundle.missionScoringProfile.missionScoringProfileHash,
    nextPhase: "start_of_round",
    rulesTruth: tied
      ? "official_tied_vp_roll_off_and_next_round_start_window"
      : "official_lower_vp_initiative_and_next_round_start_window",
    trainingTruth: false,
  };
  return {
    ...body,
    initiativeResolutionHash: hashStarcraftTmgContract(body),
  };
}

function validateState(state, options = {}) {
  if (!object(state)
    || !object(state.players)
    || !object(state.scores)
    || !Array.isArray(state.pieces)) {
    fail("DETERMINE_INITIATIVE_STATE_INVALID");
  }
  if (state.phase !== "cleanup") fail("DETERMINE_INITIATIVE_WRONG_PHASE");
  if (state.activeSideKey !== null) fail("DETERMINE_INITIATIVE_STATE_INVALID");
  if (state.gameOver === true
    || state.terminal === true
    || String(state.winner || "")
    || String(state.terminalReason || "")) {
    fail("DETERMINE_INITIATIVE_TERMINAL_STATE");
  }
  const round = Number(state.round);
  if (!Number.isSafeInteger(round) || round < 2 || round > 4) {
    fail("DETERMINE_INITIATIVE_ROUND_UNSUPPORTED");
  }
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (!object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== options.matchBinding.dataSnapshotHash) {
    fail("DETERMINE_INITIATIVE_DATA_SNAPSHOT_MISMATCH");
  }
  if (gameplayDataBundle.missionScoringProfile.gameLengthRounds !== 5
    || round + 1 > gameplayDataBundle.missionScoringProfile.gameLengthRounds) {
    fail("DETERMINE_INITIATIVE_NEXT_ROUND_UNSUPPORTED");
  }
  const boundRuntimeHash = runtimeHash(options.matchBinding);
  verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, {
    round,
    rulesRuntimeHash: boundRuntimeHash,
  });
  const firstPlayer = firstPlayerSideKey(state);
  const progress = verifyProgress(state);
  const context = {
    round,
    firstPlayer,
    progress,
    gameplayDataBundle,
    boundRuntimeHash,
  };
  return {
    ...context,
    resolution: initiativeResolution(state, context),
  };
}

function action(context) {
  const tied = context.resolution.initiativeMode === "tied_vp_roll_off";
  const ruleAtomIds = tied
    ? [...new Set([
        "rule-atom:singleton:core-8-9-6-begin-next-round:59794c52142e",
        ...OFFICIAL_DETERMINE_INITIATIVE_ROLL_OFF_ATOM_IDS,
      ])].sort((left, right) => left.localeCompare(right))
    : [...OFFICIAL_DETERMINE_INITIATIVE_DETERMINISTIC_ATOM_IDS];
  return {
    actionType: OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE,
    sideKey: context.firstPlayer,
    phase: "cleanup",
    initiativeResolutionHash: context.resolution.initiativeResolutionHash,
    initiativeResolution: clone(context.resolution),
    ruleAtomIds,
    executorId: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION,
    ...(tied ? {
      chance: {
        kind: "fixed_roll_sequence",
        faces: 6,
        count: 4,
        layout: { initiativePlayer1: 2, initiativePlayer2: 2 },
      },
    } : {}),
    details: {
      sourceRule: "official_core_8_9_6",
      initiativeMode: context.resolution.initiativeMode,
      nextFirstPlayerSideKey: context.resolution.nextFirstPlayerSideKey,
      rollOffAttempt: context.resolution.rollOffAttempt,
      nextRound: context.resolution.nextRound,
      nextPhase: context.resolution.nextPhase,
      rulesTruth: context.resolution.rulesTruth,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, error) {
  return {
    actionType: OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "cleanup",
    initiativeResolutionHash: null,
    ruleAtomIds: [...OFFICIAL_DETERMINE_INITIATIVE_DETERMINISTIC_ATOM_IDS],
    executorId: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_determine_initiative_fail_closed",
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialDetermineInitiativeActionsV1(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  let context;
  try {
    context = validateState(state, options);
    if (sideKey !== context.firstPlayer) fail("DETERMINE_INITIATIVE_FIRST_PLAYER_ONLY");
  } catch (error) {
    return options.includeDisabled === true
      ? [disabledAction(state, sideKey, error)]
      : [];
  }
  return [{
    ...action(context),
    isEnabled: true,
    disabledReason: "",
    score: 100,
  }];
}

export function officialDetermineInitiativeAtomIdsForStateV1(state) {
  const player1 = score(state?.scores?.player1, "DETERMINE_INITIATIVE_SCORE_INVALID");
  const player2 = score(state?.scores?.player2, "DETERMINE_INITIATIVE_SCORE_INVALID");
  if (player1 !== player2) {
    return [...OFFICIAL_DETERMINE_INITIATIVE_DETERMINISTIC_ATOM_IDS];
  }
  return [...new Set([
    "rule-atom:singleton:core-8-9-6-begin-next-round:59794c52142e",
    ...OFFICIAL_DETERMINE_INITIATIVE_ROLL_OFF_ATOM_IDS,
  ])].sort((left, right) => left.localeCompare(right));
}

function validateRollOffChanceReveals(chanceReveals) {
  if (!Array.isArray(chanceReveals) || chanceReveals.length !== 4) {
    fail("DETERMINE_INITIATIVE_CHANCE_REVEALS_REQUIRED");
  }
  return chanceReveals.map((reveal, counter) => {
    const outcome = Number(reveal?.outcome);
    if (reveal?.counter !== counter
      || reveal?.faces !== 6
      || !Number.isSafeInteger(outcome)
      || outcome < 1
      || outcome > 6) {
      fail("DETERMINE_INITIATIVE_CHANCE_REVEAL_INVALID", String(counter));
    }
    return outcome;
  });
}

export function applyOfficialDetermineInitiativeV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION) {
    fail("DETERMINE_INITIATIVE_ACTION_INVALID");
  }
  const context = validateState(stateInput, options);
  if (String(actionInput.sideKey || "") !== context.firstPlayer) {
    fail("DETERMINE_INITIATIVE_FIRST_PLAYER_ONLY");
  }
  const describedAction = action(context);
  const { details: _details, ...resolvedAction } = describedAction;
  if (!isDeepStrictEqual(actionInput, resolvedAction)) {
    fail("DETERMINE_INITIATIVE_RESOLUTION_STALE");
  }
  const state = clone(stateInput);
  const tiedMode = context.resolution.initiativeMode === "tied_vp_roll_off";
  const rolls = tiedMode
    ? validateRollOffChanceReveals(options.chanceReveals)
    : [];
  const rollOff = tiedMode ? {
    attempt: context.resolution.rollOffAttempt,
    player1Rolls: rolls.slice(0, 2),
    player2Rolls: rolls.slice(2, 4),
  } : null;
  if (rollOff) {
    rollOff.player1Total = rollOff.player1Rolls.reduce((total, roll) => total + roll, 0);
    rollOff.player2Total = rollOff.player2Rolls.reduce((total, roll) => total + roll, 0);
    rollOff.result = rollOff.player1Total === rollOff.player2Total
      ? "tie"
      : "winner";
    rollOff.winnerSideKey = rollOff.result === "tie"
      ? null
      : rollOff.player1Total > rollOff.player2Total ? "player1" : "player2";
    rollOff.trainingTruth = false;
    state.initiativeRollOffHistory = Array.isArray(state.initiativeRollOffHistory)
      ? state.initiativeRollOffHistory
      : [];
    state.initiativeRollOffHistory.push(clone(rollOff));
    if (rollOff.result === "tie") {
      state.scoringCleanupProgress = {
        ...clone(context.progress),
        initiativeRollOffAttempt: rollOff.attempt,
        trainingTruth: false,
      };
      const events = [{
        type: "initiative_roll_off_tied",
        round: context.round,
        initiatingSideKey: context.firstPlayer,
        rollOff: clone(rollOff),
        nextStep: OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE,
        trainingTruth: false,
      }];
      state.log = Array.isArray(state.log) ? state.log : [];
      state.log.push({
        id: `log-${state.log.length + 1}`,
        round: context.round,
        phase: "cleanup",
        action: clone(resolvedAction),
        events: clone(events),
      });
      return {
        ok: true,
        schemaVersion: "starcraft_tmg_official_determine_initiative_transition_v1",
        executorId: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
        executorVersion: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION,
        postRevision: Number(options.postRevision || 0),
        state,
        events,
        action: resolvedAction,
        initiativeResolution: context.resolution,
        initiativeOutcome: clone(rollOff),
        rulesTruth: "official_tied_vp_roll_off_requires_new_attempt_after_tie",
        trainingTruth: false,
      };
    }
  }
  const nextFirstPlayerSideKey = rollOff?.winnerSideKey
    || context.resolution.nextFirstPlayerSideKey;
  const historyEntry = {
    schema: HISTORY_SCHEMA,
    round: context.round,
    nextRound: context.resolution.nextRound,
    previousFirstPlayerSideKey: context.firstPlayer,
    nextFirstPlayerSideKey,
    scores: clone(context.resolution.scores),
    initiativeMode: context.resolution.initiativeMode,
    rollOff: clone(rollOff),
    initiativeResolutionHash: context.resolution.initiativeResolutionHash,
    trainingTruth: false,
  };
  state.determineInitiativeHistory = Array.isArray(state.determineInitiativeHistory)
    ? state.determineInitiativeHistory
    : [];
  state.determineInitiativeHistory.push(historyEntry);
  state.firstPlayerSideKey = nextFirstPlayerSideKey;
  state.round = context.resolution.nextRound;
  state.phase = "start_of_round";
  state.activeSideKey = null;
  delete state.scoringCleanupProgress;
  state.supplyLossLedger = clone(createOfficialSupplyLossLedgerV1({
    round: state.round,
    rulesRuntimeHash: context.boundRuntimeHash,
  }));
  state.supplyDestroyedThisRound = { player1: 0, player2: 0 };
  state.scoringResolvedThisPhase = { player1: false, player2: false };
  const events = [{
    type: "initiative_determined",
    round: context.round,
    nextRound: state.round,
    initiatingSideKey: context.firstPlayer,
    previousFirstPlayerSideKey: context.firstPlayer,
    nextFirstPlayerSideKey: state.firstPlayerSideKey,
    scores: clone(context.resolution.scores),
    initiativeMode: context.resolution.initiativeMode,
    rollOff: clone(rollOff),
    initiativeResolutionHash: context.resolution.initiativeResolutionHash,
    nextPhase: state.phase,
    startOfRoundEffectsPending: true,
    phaseFirstActorChoicePending: false,
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: state.round,
    phase: state.phase,
    action: clone(resolvedAction),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_determine_initiative_transition_v1",
    executorId: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: resolvedAction,
    initiativeResolution: context.resolution,
    initiativeOutcome: clone(rollOff),
    rulesTruth: context.resolution.rulesTruth,
    trainingTruth: false,
  };
}
