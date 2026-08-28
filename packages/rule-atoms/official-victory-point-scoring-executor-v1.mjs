import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  officialMarkerAffinitySideKeyV1,
  verifyOfficialMissionSetupBindingV1,
} from "../source-data/official-mission-setup-binding-v1.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
} from "./official-mission-marker-control-executor-v2.mjs";
import { verifyOfficialSupplyLossLedgerV1 } from "./official-supply-loss-ledger-v1.mjs";

export const OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE = "score_victory_points";
export const OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID =
  "authority.victory-point-scoring-v1";
export const OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_VICTORY_POINT_SCORING_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";

export const OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-current-supply-rule-uses:016deddb274f",
  "rule-atom:singleton:core-11-mission-marker-colour-map:741d90a7a726",
  "rule-atom:singleton:core-11-mission-marker-scoring-role:56a5263ca8c4",
  "rule-atom:singleton:core-12-6-score-victory-points-step:a7e217d2085f",
  "rule-atom:singleton:core-5-5-mission-scoring:5c73503fd656",
  "rule-atom:singleton:core-6-2-destroyed-supply-scoring:2ff9059f5259",
  "rule-atom:singleton:core-8-9-2-simultaneous-vp-tally:472021014f40",
  "rule-atom:singleton:core-8-9-scoring-cleanup-sequence:d213561861ad",
  "rule-atom:singleton:core-9-2-1-mission-card-contract:d003e374d0d9",
  "rule-atom:singleton:core-9-2-marker-affinity-assignment-window:c96023ebc911",
  "rule-atom:singleton:core-9-2-marker-affinity-map:dc67ff7c16a6",
  "rule-atom:singleton:core-9-2-marker-affinity-meaning:711d9bb528c9",
].sort((left, right) => left.localeCompare(right)));

const PROGRESS_SCHEMA = "starcraft_tmg_scoring_cleanup_progress_v1";
const RESOLUTION_SCHEMA = "starcraft_tmg_official_victory_point_scoring_resolution_v1";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey) || !state?.players?.[sideKey]) {
    fail("VP_SCORING_FIRST_PLAYER_REQUIRED");
  }
  return sideKey;
}

function score(value, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) fail(code, String(value));
  return parsed;
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(value)) fail("VP_SCORING_RUNTIME_BINDING_REQUIRED");
  return value;
}

function verifyProgress(state) {
  const progress = state?.scoringCleanupProgress;
  if (!object(progress)
    || progress.schemaVersion !== PROGRESS_SCHEMA
    || progress.round !== Number(state.round)
    || progress.currentStep !== OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE
    || !isDeepStrictEqual(
      progress.completedSteps,
      [OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE],
    )
    || typeof progress.controlResolutionHash !== "string") {
    fail("VP_SCORING_PROGRESS_INVALID");
  }
  return progress;
}

function verifyMarkers(state, setupBinding, progress) {
  const markers = state?.board?.missionMarkers;
  if (!Array.isArray(markers) || markers.length !== 5) {
    fail("VP_SCORING_MARKER_DENOMINATOR_INVALID");
  }
  const sorted = [...markers].sort((left, right) => Number(left.number) - Number(right.number));
  for (let index = 0; index < sorted.length; index += 1) {
    const marker = sorted[index];
    const number = Number(marker?.number);
    if (number !== index + 1
      || marker.id !== `mission-marker-${number}`
      || marker.isActivated !== true
      || ![null, ...SIDE_KEYS].includes(marker.controlSideKey ?? null)
      || marker.factionIndicatorSideKey !== marker.controlSideKey
      || marker.controlDeterminedAt?.round !== Number(state.round)
      || marker.controlDeterminedAt?.step !== OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE
      || marker.controlDeterminedAt?.controlResolutionHash !== progress.controlResolutionHash) {
      fail("VP_SCORING_MARKER_STATE_INVALID", String(marker?.id || number));
    }
    officialMarkerAffinitySideKeyV1(setupBinding, number);
  }
  return sorted;
}

function validateState(state, options) {
  if (!object(state)
    || !object(state.players)
    || !object(state.scores)
    || !Array.isArray(state.pieces)) {
    fail("VP_SCORING_STATE_INVALID");
  }
  if (state.phase !== "cleanup") fail("VP_SCORING_WRONG_PHASE");
  const round = Number(state.round);
  if (!Number.isSafeInteger(round) || round < 2 || round > 4) {
    fail("VP_SCORING_ROUND_UNSUPPORTED");
  }
  const firstPlayer = firstPlayerSideKey(state);
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (!object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== options.matchBinding.dataSnapshotHash) {
    fail("VP_SCORING_DATA_SNAPSHOT_MISMATCH");
  }
  const setupBinding = state.officialMissionSetupBinding;
  verifyOfficialMissionSetupBindingV1(setupBinding, gameplayDataBundle);
  const boundRuntimeHash = runtimeHash(options.matchBinding);
  verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, {
    round,
    rulesRuntimeHash: boundRuntimeHash,
  });
  if (state.supplyLossLedger.entries.length !== 0
    || state.supplyLossLedger.lossBySide.player1 !== 0
    || state.supplyLossLedger.lossBySide.player2 !== 0
    || state.supplyLossLedger.scoreableLossCreditedToSide.player1 !== 0
    || state.supplyLossLedger.scoreableLossCreditedToSide.player2 !== 0) {
    fail("VP_SCORING_ATTRIBUTION_UNRESOLVED");
  }
  const progress = verifyProgress(state);
  const markers = verifyMarkers(state, setupBinding, progress);
  for (const sideKey of SIDE_KEYS) score(state.scores[sideKey], "VP_SCORING_SCORE_INVALID");
  return {
    round,
    firstPlayer,
    gameplayDataBundle,
    setupBinding,
    boundRuntimeHash,
    progress,
    markers,
  };
}

function breakdownFor(sideKey, markers, setupBinding, missionProfile) {
  const controlledMarkerVp = markers.filter((marker) => marker.controlSideKey === sideKey)
    .map((marker) => {
      const affinitySideKey = officialMarkerAffinitySideKeyV1(setupBinding, marker.number);
      return {
        markerId: marker.id,
        markerNumber: Number(marker.number),
        affinitySideKey,
        vp: affinitySideKey === null || affinitySideKey === sideKey
          ? missionProfile.neutralOrOwnAffinityMarkerVp
          : missionProfile.opponentAffinityMarkerVp,
      };
    });
  const markerVp = controlledMarkerVp.reduce((total, marker) => total + marker.vp, 0);
  return {
    destroyedEnemySupplyVp: 0,
    markerVp,
    roundVp: markerVp,
    controlledMarkerVp,
  };
}

function scoringResolution(state, context) {
  const missionProfile = context.gameplayDataBundle.missionScoringProfile;
  const body = {
    schema: RESOLUTION_SCHEMA,
    round: context.round,
    missionRecordKey: missionProfile.recordKey,
    missionScoringProfileHash: missionProfile.missionScoringProfileHash,
    missionSetupBindingHash: context.setupBinding.missionSetupBindingHash,
    supplyLossLedgerHash: state.supplyLossLedger.ledgerHash,
    controlResolutionHash: context.progress.controlResolutionHash,
    simultaneousBeforeScores: {
      player1: score(state.scores.player1, "VP_SCORING_SCORE_INVALID"),
      player2: score(state.scores.player2, "VP_SCORING_SCORE_INVALID"),
    },
    breakdowns: {
      player1: breakdownFor("player1", context.markers, context.setupBinding, missionProfile),
      player2: breakdownFor("player2", context.markers, context.setupBinding, missionProfile),
    },
    supplyScoringScope: "zero_round_supply_delta_witness_only",
    scoringSemantics: "both_players_from_one_before_state_then_atomic_commit",
    rulesTruth: "official_hold_position_standard_round_two_to_four_zero_supply_delta",
    trainingTruth: false,
  };
  return {
    ...body,
    scoringResolutionHash: hashStarcraftTmgContract(body),
  };
}

function action(state, context, resolution) {
  return {
    actionType: OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
    sideKey: context.firstPlayer,
    phase: "cleanup",
    scoringResolutionHash: resolution.scoringResolutionHash,
    scoringResolution: clone(resolution),
    ruleAtomIds: [...OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS],
    executorId: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
    executorVersion: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION,
    details: {
      sourceRule: "official_core_5_5_6_2_8_9_2_9_2_1_11_12_6_and_hold_position_standard",
      missionRecordKey: resolution.missionRecordKey,
      missionScoringProfileHash: resolution.missionScoringProfileHash,
      missionSetupBindingHash: resolution.missionSetupBindingHash,
      supplyLossLedgerHash: resolution.supplyLossLedgerHash,
      scoringSemantics: resolution.scoringSemantics,
      rulesTruth: resolution.rulesTruth,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, error) {
  return {
    actionType: OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "cleanup",
    scoringResolutionHash: null,
    ruleAtomIds: [...OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS],
    executorId: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
    executorVersion: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_victory_point_scoring_fail_closed",
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialVictoryPointScoringActionsV1(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  let context;
  let resolution;
  try {
    context = validateState(state, options);
    if (sideKey !== context.firstPlayer) fail("VP_SCORING_FIRST_PLAYER_ONLY");
    resolution = scoringResolution(state, context);
  } catch (error) {
    return options.includeDisabled === true ? [disabledAction(state, sideKey, error)] : [];
  }
  return [{
    ...action(state, context, resolution),
    isEnabled: true,
    disabledReason: "",
    score: 100,
  }];
}

export function applyOfficialVictoryPointScoringV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION) {
    fail("VP_SCORING_ACTION_INVALID");
  }
  const context = validateState(stateInput, options);
  if (String(actionInput.sideKey || "") !== context.firstPlayer) {
    fail("VP_SCORING_FIRST_PLAYER_ONLY");
  }
  const resolution = scoringResolution(stateInput, context);
  const resolvedAction = action(stateInput, context, resolution);
  if (actionInput.scoringResolutionHash !== resolution.scoringResolutionHash) {
    fail(
      "VP_SCORING_RESOLUTION_STALE",
      `${String(actionInput.scoringResolutionHash || "missing")}:${resolution.scoringResolutionHash}`,
    );
  }
  const state = clone(stateInput);
  for (const sideKey of SIDE_KEYS) {
    state.scores[sideKey] = resolution.simultaneousBeforeScores[sideKey]
      + resolution.breakdowns[sideKey].roundVp;
  }
  state.victoryPointScoringHistory = Array.isArray(state.victoryPointScoringHistory)
    ? state.victoryPointScoringHistory
    : [];
  state.victoryPointScoringHistory.push({
    round: context.round,
    scoringResolutionHash: resolution.scoringResolutionHash,
    breakdowns: clone(resolution.breakdowns),
    resultingScores: clone(state.scores),
    trainingTruth: false,
  });
  state.scoringCleanupProgress = {
    ...clone(context.progress),
    completedSteps: [
      OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
      OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
    ],
    currentStep: "check_end_game_conditions",
    scoringResolutionHash: resolution.scoringResolutionHash,
    trainingTruth: false,
  };
  const events = [{
    type: "victory_points_scored",
    round: context.round,
    initiatingSideKey: context.firstPlayer,
    scoringResolutionHash: resolution.scoringResolutionHash,
    breakdowns: clone(resolution.breakdowns),
    beforeScores: clone(resolution.simultaneousBeforeScores),
    resultingScores: clone(state.scores),
    simultaneousCommit: true,
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
    schemaVersion: "starcraft_tmg_official_victory_point_scoring_transition_v1",
    executorId: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
    executorVersion: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: resolvedAction,
    scoringResolution: resolution,
    rulesTruth: resolution.rulesTruth,
    trainingTruth: false,
  };
}
