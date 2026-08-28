import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from "../source-data/official-gameplay-data-bundle-v1.mjs";
import { OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE } from "./official-mission-marker-control-executor-v2.mjs";
import { OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE } from "./official-victory-point-scoring-executor-v1.mjs";

export const OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE = "check_end_game_conditions";
export const OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID =
  "authority.hold-position-end-game-check-v1";
export const OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_HOLD_POSITION_END_GAME_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";

export const OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-12-6-end-game-check-step:002c790d5ae6",
  "rule-atom:singleton:core-8-9-3-special-win-terminal:64431807aae0",
].sort((left, right) => left.localeCompare(right)));

const PROGRESS_SCHEMA = "starcraft_tmg_scoring_cleanup_progress_v1";
const RESOLUTION_SCHEMA = "starcraft_tmg_official_hold_position_end_game_resolution_v1";
const HISTORY_SCHEMA = "starcraft_tmg_official_end_game_resolution_history_entry_v1";
const TERMINAL_REASON = "mission_hold_position_special_lead_10_plus";
const NEXT_STEP = "resolve_end_of_round_effects";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function score(value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    fail("END_GAME_SCORE_INVALID", String(value));
  }
  return parsed;
}

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey) || !state?.players?.[sideKey]) {
    fail("END_GAME_FIRST_PLAYER_REQUIRED");
  }
  return sideKey;
}

function verifyProgress(state) {
  const progress = state?.scoringCleanupProgress;
  if (!object(progress)
    || progress.schemaVersion !== PROGRESS_SCHEMA
    || progress.round !== Number(state.round)
    || progress.currentStep !== OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE
    || !isDeepStrictEqual(progress.completedSteps, [
      OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
      OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
    ])
    || !HASH_PATTERN.test(String(progress.controlResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.scoringResolutionHash || ""))) {
    fail("END_GAME_PROGRESS_INVALID");
  }
  return progress;
}

function verifyScoringHistory(state, progress) {
  const history = state?.victoryPointScoringHistory;
  if (!Array.isArray(history) || history.length === 0) {
    fail("END_GAME_SCORING_HISTORY_INVALID");
  }
  const sameRound = history.filter((entry) => entry?.round === Number(state.round));
  const entry = history.at(-1);
  if (sameRound.length !== 1
    || entry !== sameRound[0]
    || !object(entry)
    || entry.scoringResolutionHash !== progress.scoringResolutionHash
    || !object(entry.breakdowns)
    || !object(entry.resultingScores)
    || !isDeepStrictEqual(entry.resultingScores, {
      player1: score(state.scores.player1),
      player2: score(state.scores.player2),
    })
    || entry.trainingTruth !== false) {
    fail("END_GAME_SCORING_HISTORY_INVALID");
  }
  for (const sideKey of SIDE_KEYS) {
    const breakdown = entry.breakdowns[sideKey];
    if (!object(breakdown)
      || !Number.isSafeInteger(breakdown.roundVp)
      || breakdown.roundVp < 0) {
      fail("END_GAME_SCORING_HISTORY_INVALID");
    }
  }
  return entry;
}

function activeModel(model) {
  return object(model) && model.isOnField === true && model.isDestroyed !== true;
}

function liveArmyWitness(state, sideKey) {
  for (const piece of state.pieces) {
    if (!object(piece)
      || piece.sideKey !== sideKey
      || piece.isOnField !== true
      || piece.isDestroyed === true
      || !Number.isSafeInteger(Number(piece.currentModels))
      || Number(piece.currentModels) <= 0
      || !Array.isArray(piece.models)) {
      continue;
    }
    const models = piece.models.filter(activeModel);
    if (models.length !== Number(piece.currentModels) || models.length === 0) continue;
    return {
      sideKey,
      unitId: String(piece.id || ""),
      modelId: String(models[0].id || ""),
      currentModels: Number(piece.currentModels),
      witnessKind: "live_battlefield_model",
    };
  }
  fail("END_GAME_ARMY_TERMINAL_SCOPE_UNRESOLVED", sideKey);
}

function validateState(state, options) {
  if (!object(state)
    || !object(state.players)
    || !object(state.scores)
    || !Array.isArray(state.pieces)) {
    fail("END_GAME_STATE_INVALID");
  }
  if (state.phase !== "cleanup") fail("END_GAME_WRONG_PHASE");
  if (state.gameOver === true
    || state.terminal === true
    || String(state.winner || "")
    || String(state.terminalReason || "")) {
    fail("END_GAME_ALREADY_TERMINAL");
  }
  const round = Number(state.round);
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  const missionProfile = gameplayDataBundle.missionScoringProfile;
  if (!Number.isSafeInteger(round)
    || round < missionProfile.markerScoringStartsRound
    || round >= missionProfile.gameLengthRounds) {
    fail("END_GAME_ROUND_UNSUPPORTED");
  }
  if (!object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== options.matchBinding.dataSnapshotHash) {
    fail("END_GAME_DATA_SNAPSHOT_MISMATCH");
  }
  if (missionProfile.missionId !== "mission_hold_position"
    || missionProfile.format !== "standard_engagement"
    || missionProfile.specialLeadWinThreshold !== 10) {
    fail("END_GAME_MISSION_SCOPE_UNSUPPORTED");
  }
  const firstPlayer = firstPlayerSideKey(state);
  const progress = verifyProgress(state);
  const scoringHistory = verifyScoringHistory(state, progress);
  const armyPresenceWitnesses = {
    player1: liveArmyWitness(state, "player1"),
    player2: liveArmyWitness(state, "player2"),
  };
  return {
    round,
    firstPlayer,
    gameplayDataBundle,
    missionProfile,
    progress,
    scoringHistory,
    armyPresenceWitnesses,
  };
}

function endGameResolution(state, context) {
  const beforeScores = {
    player1: score(state.scores.player1),
    player2: score(state.scores.player2),
  };
  const signedLead = beforeScores.player1 - beforeScores.player2;
  const lead = Math.abs(signedLead);
  const threshold = context.missionProfile.specialLeadWinThreshold;
  const winner = lead >= threshold
    ? signedLead > 0 ? "player1" : "player2"
    : null;
  const outcome = winner ? "terminal" : "continue";
  const body = {
    schema: RESOLUTION_SCHEMA,
    round: context.round,
    missionRecordKey: context.missionProfile.recordKey,
    missionScoringProfileHash: context.missionProfile.missionScoringProfileHash,
    scoringResolutionHash: context.progress.scoringResolutionHash,
    beforeScores,
    specialLeadWinThreshold: threshold,
    absoluteLead: lead,
    leadingSideKey: signedLead === 0 ? null : signedLead > 0 ? "player1" : "player2",
    armyPresenceWitnesses: clone(context.armyPresenceWitnesses),
    evaluatedTerminalChecks: ["mission_special_lead_threshold"],
    excludedTerminalChecks: [
      "army_elimination",
      "round_limit",
      "final_reserve_destruction",
      "final_score_tiebreaker",
    ],
    outcome,
    winnerSideKey: winner,
    terminalReason: winner ? TERMINAL_REASON : null,
    nextStep: winner ? "terminal" : NEXT_STEP,
    rulesTruth: "official_hold_position_standard_special_lead_check_only",
    trainingTruth: false,
  };
  return {
    ...body,
    endGameResolutionHash: hashStarcraftTmgContract(body),
  };
}

function action(context, resolution) {
  return {
    actionType: OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
    sideKey: context.firstPlayer,
    phase: "cleanup",
    endGameResolutionHash: resolution.endGameResolutionHash,
    endGameResolution: clone(resolution),
    ruleAtomIds: [...OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS],
    executorId: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
    executorVersion: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION,
    details: {
      sourceRule: "official_core_8_9_3_12_6_and_hold_position_standard",
      missionRecordKey: resolution.missionRecordKey,
      evaluatedTerminalChecks: clone(resolution.evaluatedTerminalChecks),
      excludedTerminalChecks: clone(resolution.excludedTerminalChecks),
      rulesTruth: resolution.rulesTruth,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, error) {
  return {
    actionType: OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "cleanup",
    endGameResolutionHash: null,
    ruleAtomIds: [...OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS],
    executorId: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
    executorVersion: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_hold_position_end_game_check_fail_closed",
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialHoldPositionEndGameActionsV1(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  let context;
  let resolution;
  try {
    context = validateState(state, options);
    if (sideKey !== context.firstPlayer) fail("END_GAME_FIRST_PLAYER_ONLY");
    resolution = endGameResolution(state, context);
  } catch (error) {
    return options.includeDisabled === true ? [disabledAction(state, sideKey, error)] : [];
  }
  return [{
    ...action(context, resolution),
    isEnabled: true,
    disabledReason: "",
    score: 100,
  }];
}

export function applyOfficialHoldPositionEndGameV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION) {
    fail("END_GAME_ACTION_INVALID");
  }
  const context = validateState(stateInput, options);
  if (String(actionInput.sideKey || "") !== context.firstPlayer) {
    fail("END_GAME_FIRST_PLAYER_ONLY");
  }
  const resolution = endGameResolution(stateInput, context);
  if (actionInput.endGameResolutionHash !== resolution.endGameResolutionHash
    || !isDeepStrictEqual(actionInput.endGameResolution, resolution)) {
    fail("END_GAME_RESOLUTION_STALE");
  }
  const resolvedAction = action(context, resolution);
  const state = clone(stateInput);
  const historyEntry = {
    schema: HISTORY_SCHEMA,
    round: context.round,
    endGameResolutionHash: resolution.endGameResolutionHash,
    outcome: resolution.outcome,
    winnerSideKey: resolution.winnerSideKey,
    terminalReason: resolution.terminalReason,
    trainingTruth: false,
  };
  state.endGameResolutionHistory = Array.isArray(state.endGameResolutionHistory)
    ? state.endGameResolutionHistory
    : [];
  state.endGameResolutionHistory.push(historyEntry);
  state.scoringCleanupProgress = {
    ...clone(context.progress),
    completedSteps: [
      OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
      OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
      OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
    ],
    currentStep: resolution.nextStep,
    endGameResolutionHash: resolution.endGameResolutionHash,
    trainingTruth: false,
  };
  state.gameOver = resolution.outcome === "terminal";
  state.terminal = resolution.outcome === "terminal";
  state.winner = resolution.winnerSideKey || "";
  state.terminalReason = resolution.terminalReason || "";
  if (resolution.outcome === "terminal") state.activeSideKey = null;
  const events = [{
    type: "end_game_condition_checked",
    round: context.round,
    initiatingSideKey: context.firstPlayer,
    endGameResolutionHash: resolution.endGameResolutionHash,
    outcome: resolution.outcome,
    winnerSideKey: resolution.winnerSideKey,
    nextStep: resolution.nextStep,
    evaluatedTerminalChecks: clone(resolution.evaluatedTerminalChecks),
    excludedTerminalChecks: clone(resolution.excludedTerminalChecks),
    trainingTruth: false,
  }];
  if (resolution.outcome === "terminal") {
    events.push({
      type: "game_end",
      winner: resolution.winnerSideKey,
      finalScore: clone(resolution.beforeScores),
      reason: resolution.terminalReason,
      endGameResolutionHash: resolution.endGameResolutionHash,
      trainingTruth: false,
    });
  }
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
    schemaVersion: "starcraft_tmg_official_hold_position_end_game_transition_v1",
    executorId: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
    executorVersion: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: resolvedAction,
    endGameResolution: resolution,
    rulesTruth: resolution.rulesTruth,
    trainingTruth: false,
  };
}
