import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialScoringFinalizationRulesDataBundleV1 } from
  "../source-data/official-scoring-finalization-rules-data-bundle-v1.mjs";
import { officialMarkerAffinitySideKeyV1 } from
  "../source-data/official-mission-setup-binding-v1.mjs";

const SIDE_KEYS = Object.freeze(["player1", "player2"]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function seal(body, field) { return { ...body, [field]: hashStarcraftTmgContract(body) }; }
function score(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) fail(code, String(value));
  return number;
}
function participants(input) {
  const ids = [...(input || [])].map(String).sort();
  if (ids.length !== 2 || new Set(ids).size !== 2) {
    fail("SCORING_FINALIZATION_PARTICIPANTS_INVALID");
  }
  return ids;
}

export function resolveOfficialInitialFirstPlayerRollOffV1(input = {}) {
  const bundle = input.scoringFinalizationRulesDataBundle;
  verifyOfficialScoringFinalizationRulesDataBundleV1(bundle);
  const participantIds = participants(input.participantIds);
  const attempt = Number(input.attempt);
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    fail("INITIAL_FIRST_PLAYER_ROLL_OFF_ATTEMPT_INVALID");
  }
  const reveals = input.chanceReveals;
  if (!Array.isArray(reveals) || reveals.length !== 4) {
    fail("INITIAL_FIRST_PLAYER_ROLL_OFF_REVEALS_REQUIRED");
  }
  const rolls = reveals.map((reveal, counter) => {
    const outcome = Number(reveal?.outcome);
    if (reveal?.counter !== counter || reveal?.faces !== 6
      || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("INITIAL_FIRST_PLAYER_ROLL_OFF_REVEAL_INVALID", String(counter));
    }
    return outcome;
  });
  const rollsBySide = { [participantIds[0]]: rolls.slice(0, 2),
    [participantIds[1]]: rolls.slice(2, 4) };
  const totalsBySide = Object.fromEntries(participantIds.map((sideKey) => [sideKey,
    rollsBySide[sideKey].reduce((sum, value) => sum + value, 0)]));
  const tied = totalsBySide[participantIds[0]] === totalsBySide[participantIds[1]];
  const winnerSideKey = tied ? null
    : totalsBySide[participantIds[0]] > totalsBySide[participantIds[1]]
      ? participantIds[0] : participantIds[1];
  return seal({ schema: "starcraft_tmg_official_initial_first_player_roll_off_v1",
    attempt, participantIds, rollsBySide, totalsBySide,
    outcome: tied ? "tie" : "winner", winnerSideKey,
    nextProcedure: tied ? "initial_first_player_roll_off"
      : "assign_initial_first_player_marker",
    tiePolicy: bundle.firstPlayerContract.tiePolicy,
    authorityChanceOnly: true, trainingTruth: false }, "rollOffHash");
}

export function createOfficialInitialFirstPlayerAssignmentChoicesV1(input = {}) {
  const bundle = input.scoringFinalizationRulesDataBundle;
  verifyOfficialScoringFinalizationRulesDataBundleV1(bundle);
  const participantIds = participants(input.participantIds);
  const winnerSideKey = String(input.rollOffWinnerSideKey || "");
  if (!participantIds.includes(winnerSideKey)
    || bundle.firstPlayerContract.winnerMayAssignMarkerToEitherParticipant !== true) {
    fail("INITIAL_FIRST_PLAYER_ASSIGNMENT_WINNER_INVALID");
  }
  return participantIds.map((assignedFirstPlayerSideKey) => seal({
    schema: "starcraft_tmg_official_initial_first_player_assignment_choice_v1",
    winnerSideKey, assignedFirstPlayerSideKey,
    markerAuthority: "state.firstPlayerSideKey",
    selectionOwner: winnerSideKey, trainingTruth: false,
  }, "choiceHash"));
}

function liveModels(piece) {
  if (!Array.isArray(piece?.models)) return [];
  return piece.models.filter((model) => model?.isDestroyed !== true);
}

export function resolveOfficialArmyEliminationV1(input = {}) {
  const bundle = input.scoringFinalizationRulesDataBundle;
  const state = input.state;
  verifyOfficialScoringFinalizationRulesDataBundleV1(bundle);
  if (!object(state) || !object(state.players) || !Array.isArray(state.pieces)
    || !object(state.scores) || Object.keys(state.players).length !== 2) {
    fail("ARMY_ELIMINATION_STATE_INVALID");
  }
  const sideKeys = Object.keys(state.players).sort();
  const armyStatusBySide = {};
  for (const sideKey of sideKeys) {
    const units = state.pieces.filter((piece) => piece?.sideKey === sideKey
      && piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0);
    for (const unit of units) {
      if (unit.isOnField !== true && unit.isInReserves !== true) {
        fail("ARMY_ELIMINATION_UNIT_LOCATION_UNRESOLVED", String(unit.id || ""));
      }
      if (liveModels(unit).length !== Number(unit.currentModels)) {
        fail("ARMY_ELIMINATION_MODEL_DENOMINATOR_INVALID", String(unit.id || ""));
      }
    }
    const fieldUnitIds = units.filter((piece) => piece.isOnField === true)
      .map((piece) => String(piece.id)).sort();
    const reserveUnitIds = units.filter((piece) => piece.isInReserves === true)
      .map((piece) => String(piece.id)).sort();
    armyStatusBySide[sideKey] = { sideKey, fieldUnitIds, reserveUnitIds,
      hasModelsOnField: fieldUnitIds.length > 0,
      hasUnitsInReserve: reserveUnitIds.length > 0,
      eliminated: fieldUnitIds.length === 0 && reserveUnitIds.length === 0 };
  }
  const eliminatedSideKeys = sideKeys.filter((sideKey) => (
    armyStatusBySide[sideKey].eliminated));
  if (eliminatedSideKeys.length > 1) {
    fail("ARMY_ELIMINATION_SIMULTANEOUS_OUTCOME_UNRESOLVED");
  }
  const survivingSideKey = eliminatedSideKeys.length === 1
    ? sideKeys.find((sideKey) => sideKey !== eliminatedSideKeys[0]) : null;
  const beforeScores = Object.fromEntries(sideKeys.map((sideKey) => [sideKey,
    score(state.scores[sideKey], "ARMY_ELIMINATION_SCORE_INVALID")]));
  const resultingScores = clone(beforeScores);
  if (survivingSideKey) {
    resultingScores[survivingSideKey] += bundle.terminalContract.survivingPlayerVpAward;
  }
  return seal({ schema: "starcraft_tmg_official_army_elimination_resolution_v1",
    round: Number(state.round), phase: state.phase, armyStatusBySide,
    eliminatedSideKeys, survivingSideKey,
    terminal: Boolean(survivingSideKey),
    survivorVpAward: survivingSideKey
      ? bundle.terminalContract.survivingPlayerVpAward : 0,
    beforeScores, resultingScores,
    terminalReason: survivingSideKey ? "army_elimination" : null,
    noFieldModelsAndNoReserveUnitsRequired: true,
    trainingTruth: false }, "eliminationResolutionHash");
}

function markerBreakdown(state, sideKey, mission, controlResolutionHash) {
  const markers = state?.board?.missionMarkers;
  if (!Array.isArray(markers) || markers.length !== 5) {
    fail("FINAL_SCORE_MARKER_DENOMINATOR_INVALID");
  }
  const setup = state.officialMissionSetupBinding;
  const controlledMarkerVp = [...markers]
    .sort((left, right) => Number(left.number) - Number(right.number))
    .filter((marker) => {
      if (marker.controlDeterminedAt?.round !== Number(state.round)
        || marker.controlDeterminedAt?.controlResolutionHash !== controlResolutionHash
        || marker.factionIndicatorSideKey !== marker.controlSideKey) {
        fail("FINAL_SCORE_CONTROL_RESOLUTION_STALE", String(marker.id || ""));
      }
      return marker.controlSideKey === sideKey;
    }).map((marker) => {
      const affinitySideKey = officialMarkerAffinitySideKeyV1(setup, marker.number);
      return { markerId: marker.id, markerNumber: Number(marker.number), affinitySideKey,
        vp: affinitySideKey === null || affinitySideKey === sideKey
          ? mission.neutralOrOwnAffinityMarkerVp : mission.opponentAffinityMarkerVp };
    });
  return { controlledMarkerVp,
    markerVp: controlledMarkerVp.reduce((sum, entry) => sum + entry.vp, 0) };
}

export function resolveOfficialRoundLimitFinalScoreV1(input = {}) {
  const bundle = input.scoringFinalizationRulesDataBundle;
  const state = input.state;
  verifyOfficialScoringFinalizationRulesDataBundleV1(bundle);
  const mission = state?.officialGameplayDataBundle?.missionScoringProfile;
  const progress = state?.scoringCleanupProgress;
  if (!object(state) || state.phase !== "cleanup"
    || Number(state.round) !== bundle.terminalContract.roundLimit
    || mission?.missionScoringProfileHash === undefined
    || mission.gameLengthRounds !== bundle.terminalContract.roundLimit
    || !object(progress) || progress.currentStep !== "score_victory_points"
    || typeof progress.controlResolutionHash !== "string"
    || state.gameOver === true || state.terminal === true) {
    fail("ROUND_LIMIT_FINAL_SCORE_WINDOW_INVALID");
  }
  const sideKeys = Object.keys(state.players || {}).sort();
  if (sideKeys.length !== 2) fail("ROUND_LIMIT_FINAL_SCORE_PLAYERS_INVALID");
  const supply = state.supplyLossLedger?.scoreableLossCreditedToSide;
  if (!object(supply)) fail("ROUND_LIMIT_FINAL_SCORE_SUPPLY_LEDGER_INVALID");
  const reserveVpBySide = input.finalReserveVpBySide;
  if (!object(reserveVpBySide)) fail("ROUND_LIMIT_FINAL_RESERVE_VP_REQUIRED");
  const beforeScores = {}; const breakdowns = {}; const resultingScores = {};
  for (const sideKey of sideKeys) {
    beforeScores[sideKey] = score(state.scores?.[sideKey], "FINAL_SCORE_INVALID");
    const marker = markerBreakdown(state, sideKey, mission,
      progress.controlResolutionHash);
    const destroyedEnemySupplyVp = score(supply[sideKey],
      "FINAL_SCORE_SUPPLY_VP_INVALID");
    const finalReserveVp = score(reserveVpBySide[sideKey],
      "FINAL_SCORE_RESERVE_VP_INVALID");
    breakdowns[sideKey] = { destroyedEnemySupplyVp, finalReserveVp,
      markerVp: marker.markerVp, controlledMarkerVp: marker.controlledMarkerVp,
      roundVp: destroyedEnemySupplyVp + finalReserveVp + marker.markerVp };
    resultingScores[sideKey] = beforeScores[sideKey] + breakdowns[sideKey].roundVp;
  }
  const difference = resultingScores[sideKeys[0]] - resultingScores[sideKeys[1]];
  let winnerSideKey = difference === 0 ? null
    : difference > 0 ? sideKeys[0] : sideKeys[1];
  let outcome = winnerSideKey ? "winner" : "draw";
  let tiebreakerApplied = false;
  if (!winnerSideKey && mission.finalTiebreaker !== null) {
    fail("ROUND_LIMIT_MISSION_TIEBREAKER_EXECUTOR_REQUIRED");
  }
  if (!winnerSideKey) {
    tiebreakerApplied = false;
    outcome = "draw";
  }
  return seal({ schema: "starcraft_tmg_official_round_limit_final_score_v1",
    round: Number(state.round), missionRecordKey: mission.recordKey,
    missionScoringProfileHash: mission.missionScoringProfileHash,
    controlResolutionHash: progress.controlResolutionHash,
    beforeScores, breakdowns, resultingScores,
    missionScoreEqualsAllObjectiveVp: true, highestVpWins: true,
    tiebreaker: mission.finalTiebreaker, tiebreakerApplied,
    outcome, winnerSideKey, terminal: true,
    terminalReason: "round_limit_final_score",
    finalReserveDestructionConsumed: true,
    clientPixelOrVisualScaleAccepted: false,
    trainingTruth: false }, "finalScoreResolutionHash");
}
