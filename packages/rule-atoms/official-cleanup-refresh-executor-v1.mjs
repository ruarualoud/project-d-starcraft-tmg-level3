import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialCleanupCardBundleV1 } from "../source-data/official-cleanup-card-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialMissionSetupBindingV1 } from "../source-data/official-mission-setup-binding-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS,
} from "./official-end-of-round-effects-executor-v2.mjs";
import { OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE } from "./official-hold-position-end-game-executor-v1.mjs";
import { OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE } from "./official-mission-marker-control-executor-v2.mjs";
import { OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE } from "./official-victory-point-scoring-executor-v1.mjs";

export const OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE = "cleanup_and_refresh";
export const OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID = "authority.cleanup-refresh-v1";
export const OFFICIAL_CLEANUP_REFRESH_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_CLEANUP_REFRESH_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_CLEANUP_REFRESH_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:cleanup-refresh-exhausted-cards",
  "rule-atom:cleanup-refreshes-exhausted-cards",
  "rule-atom:singleton:core-12-6-cleanup-step:97e990f55b19",
  "rule-atom:singleton:core-8-9-5-cleanup-marker-exceptions:5dab6773955b",
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS =
  OFFICIAL_CLEANUP_REFRESH_NEW_ATOM_IDS;
export const OFFICIAL_CLEANUP_REFRESH_DEPENDENCY_ATOM_IDS =
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS;

const PROGRESS_SCHEMA = "starcraft_tmg_scoring_cleanup_progress_v1";
const RESOLUTION_SCHEMA = "starcraft_tmg_official_cleanup_refresh_resolution_v1";
const HISTORY_SCHEMA = "starcraft_tmg_official_cleanup_refresh_history_entry_v1";
const NEXT_STEP = "determine_initiative";
const SUPPORTED_UNIT_RECORD_KEY = "army_units:marine";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const PHASE_KEYS = Object.freeze(["assault", "combat", "movement"]);
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

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey) || !state?.players?.[sideKey]) {
    fail("CLEANUP_REFRESH_FIRST_PLAYER_REQUIRED");
  }
  return sideKey;
}

function verifyProgress(state) {
  const progress = state?.scoringCleanupProgress;
  if (!object(progress)
    || progress.schemaVersion !== PROGRESS_SCHEMA
    || progress.round !== Number(state.round)
    || progress.currentStep !== OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE
    || !isDeepStrictEqual(progress.completedSteps, [
      OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
      OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
      OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
      OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
    ])
    || !HASH_PATTERN.test(String(progress.controlResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.scoringResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.endGameResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.effectQueueProofHash || ""))) {
    fail("CLEANUP_REFRESH_PROGRESS_INVALID");
  }
  const history = state?.endOfRoundEffectHistory;
  const last = Array.isArray(history) ? history.at(-1) : null;
  if (!object(last)
    || last.schema !== "starcraft_tmg_official_end_of_round_effect_history_entry_v2"
    || last.round !== Number(state.round)
    || last.effectQueueProofHash !== progress.effectQueueProofHash
    || last.effectCount !== 0
    || last.queueComplete !== true
    || last.trainingTruth !== false) {
    fail("CLEANUP_REFRESH_PROGRESS_INVALID");
  }
  return progress;
}

function exactPhaseBooleanMap(value, code, detail) {
  if (!object(value)
    || !isDeepStrictEqual(Object.keys(value).sort(), [...PHASE_KEYS])
    || PHASE_KEYS.some((phase) => typeof value[phase] !== "boolean")) {
    fail(code, detail);
  }
  return {
    movement: value.movement,
    assault: value.assault,
    combat: value.combat,
  };
}

function exactPassMap(value, detail) {
  if (!object(value)
    || Object.keys(value).some((phase) => !PHASE_KEYS.includes(phase))
    || Object.values(value).some((passed) => typeof passed !== "boolean")) {
    fail("CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED", detail);
  }
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => (
    left.localeCompare(right)
  )));
}

function exactFirstPassMap(value) {
  if (!object(value)
    || Object.keys(value).some((phase) => !PHASE_KEYS.includes(phase))
    || Object.values(value).some((sideKey) => !SIDE_KEYS.includes(sideKey))) {
    fail("CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED", "firstPassSideByPhase");
  }
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => (
    left.localeCompare(right)
  )));
}

function cardMaterial(state, cleanupCardBundle) {
  verifyOfficialCleanupCardBundleV1(cleanupCardBundle);
  const profileByKey = new Map(cleanupCardBundle.profiles.map((profile) => [
    profile.recordKey,
    profile,
  ]));
  if (!object(state.cardResources)
    || !SIDE_KEYS.every((sideKey) => Array.isArray(state.cardResources[sideKey]))) {
    fail("CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED");
  }
  const rows = [];
  const ids = new Set();
  for (const sideKey of SIDE_KEYS) {
    const seenRecordKeys = new Set();
    for (const card of state.cardResources[sideKey]) {
      const id = String(card?.id || "").trim();
      const profile = profileByKey.get(card?.officialCardRecordKey);
      const expectedFace = card?.readiness === "ready" ? "up"
        : card?.readiness === "exhausted" ? "down" : "";
      if (!object(card)
        || !id
        || ids.has(id)
        || !profile
        || seenRecordKeys.has(profile.recordKey)
        || card.sideKey !== sideKey
        || card.cardKind !== profile.cardKind
        || card.sourceRecordHash !== profile.sourceRecordHash
        || card.face !== expectedFace
        || !Array.isArray(card.activeEffects)
        || card.activeEffects.length !== 0) {
        fail("CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED", id || sideKey);
      }
      ids.add(id);
      seenRecordKeys.add(profile.recordKey);
      rows.push({
        id,
        sideKey,
        cardKind: card.cardKind,
        officialCardRecordKey: profile.recordKey,
        sourceRecordHash: profile.sourceRecordHash,
        beforeReadiness: card.readiness,
        beforeFace: card.face,
        afterReadiness: "ready",
        afterFace: "up",
      });
    }
  }
  return rows.sort((left, right) => left.id.localeCompare(right.id));
}

function materialDenominator(state, gameplayDataBundle) {
  const profile = gameplayDataBundle.combatProfileBundle?.profiles?.[0];
  if (gameplayDataBundle.combatProfileBundle?.profiles?.length !== 1
    || profile?.recordKey !== SUPPORTED_UNIT_RECORD_KEY
    || !object(gameplayDataBundle.cleanupCardBundle)
    || !object(state.board)
    || !Array.isArray(state.board.missionMarkers)
    || !Array.isArray(state.board.effectMarkers)
    || state.board.effectMarkers.length !== 0
    || !Array.isArray(state.board.tokens)
    || state.board.tokens.length !== 0
    || !Array.isArray(state.board.markers)
    || state.board.markers.length !== 0
    || state.activeSideKey !== null) {
    fail("CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED");
  }
  const pieceRows = [];
  const pieceIds = new Set();
  for (const piece of state.pieces) {
    const id = String(piece?.id || "").trim();
    if (!object(piece)
      || !id
      || pieceIds.has(id)
      || !SIDE_KEYS.includes(piece.sideKey)
      || piece.officialUnitRecordKey !== SUPPORTED_UNIT_RECORD_KEY
      || !Array.isArray(piece.selectedUpgradeNames)
      || piece.selectedUpgradeNames.length !== 0
      || !Array.isArray(piece.statuses)
      || piece.statuses.length !== 0
      || !Array.isArray(piece.combatEffects)
      || piece.combatEffects.length !== 0
      || !Number.isSafeInteger(Number(piece.damageMarker))
      || Number(piece.damageMarker) < 0) {
      fail("CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED", id || "piece");
    }
    pieceIds.add(id);
    pieceRows.push({
      pieceId: id,
      sideKey: piece.sideKey,
      activatedPhases: exactPhaseBooleanMap(
        piece.activatedPhases,
        "CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED",
        id,
      ),
      damageMarker: Number(piece.damageMarker),
    });
  }
  if (pieceRows.length === 0) fail("CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED");
  const playerPasses = Object.fromEntries(SIDE_KEYS.map((sideKey) => {
    if (!object(state.players?.[sideKey]) || state.players[sideKey].sideKey !== sideKey) {
      fail("CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED", sideKey);
    }
    return [sideKey, exactPassMap(state.players[sideKey].passedPhases, sideKey)];
  }));
  const firstPassSideByPhase = exactFirstPassMap(state.firstPassSideByPhase || {});
  return {
    pieces: pieceRows.sort((left, right) => left.pieceId.localeCompare(right.pieceId)),
    cards: cardMaterial(state, gameplayDataBundle.cleanupCardBundle),
    playerPasses,
    firstPassSideByPhase,
    missionMarkers: clone(state.board.missionMarkers),
  };
}

function cleanupResolution(state, context) {
  const material = materialDenominator(state, context.gameplayDataBundle);
  const retainedMaterial = {
    scores: clone(state.scores),
    missionMarkers: material.missionMarkers,
    pieceState: state.pieces.map((piece) => ({
      id: piece.id,
      sideKey: piece.sideKey,
      currentModels: piece.currentModels,
      currentSupply: piece.currentSupply,
      damageMarker: piece.damageMarker,
      models: clone(piece.models || []),
    })).sort((left, right) => left.id.localeCompare(right.id)),
    phaseFirstActorByRound: clone(state.phaseFirstActorByRound || {}),
  };
  const body = {
    schema: RESOLUTION_SCHEMA,
    round: context.round,
    gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
    cleanupCardBundleHash:
      context.gameplayDataBundle.cleanupCardBundle.cleanupCardBundleHash,
    missionSetupBindingHash: state.officialMissionSetupBinding.missionSetupBindingHash,
    effectQueueProofHash: context.progress.effectQueueProofHash,
    preCleanupMaterialHash: hashStarcraftTmgContract(material),
    retainedMaterialHash: hashStarcraftTmgContract(retainedMaterial),
    removalDenominator: {
      activationMarkerPieceIds: material.pieces.map((piece) => piece.pieceId),
      playerPassSideKeys: [...SIDE_KEYS],
      genericTokenCount: 0,
      genericMarkerCount: 0,
      effectMarkerCount: 0,
      activeStatusCount: 0,
      activeCombatEffectCount: 0,
      denominatorComplete: true,
    },
    cardRefreshes: material.cards,
    retainedExceptions: {
      damageMarkers: true,
      missionMarkers: true,
      controlFactionIndicators: true,
      phaseFirstActorHistory: true,
    },
    nextStep: NEXT_STEP,
    rulesTruth: "official_cleanup_refresh_exact_supported_material_subset",
    trainingTruth: false,
  };
  return {
    ...body,
    cleanupResolutionHash: hashStarcraftTmgContract(body),
  };
}

function validateState(state, options) {
  if (!object(state)
    || !object(state.players)
    || !object(state.scores)
    || !Array.isArray(state.pieces)) {
    fail("CLEANUP_REFRESH_STATE_INVALID");
  }
  if (state.phase !== "cleanup") fail("CLEANUP_REFRESH_WRONG_PHASE");
  if (state.gameOver === true
    || state.terminal === true
    || String(state.winner || "")
    || String(state.terminalReason || "")) {
    fail("CLEANUP_REFRESH_TERMINAL_STATE");
  }
  const round = Number(state.round);
  if (!Number.isSafeInteger(round) || round < 2 || round > 4) {
    fail("CLEANUP_REFRESH_ROUND_UNSUPPORTED");
  }
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  verifyOfficialMissionSetupBindingV1(
    state.officialMissionSetupBinding,
    gameplayDataBundle,
  );
  if (!object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== options.matchBinding.dataSnapshotHash) {
    fail("CLEANUP_REFRESH_DATA_SNAPSHOT_MISMATCH");
  }
  const firstPlayer = firstPlayerSideKey(state);
  const progress = verifyProgress(state);
  const context = { round, firstPlayer, gameplayDataBundle, progress };
  return { ...context, cleanupResolution: cleanupResolution(state, context) };
}

function action(context) {
  return {
    actionType: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    sideKey: context.firstPlayer,
    phase: "cleanup",
    cleanupResolutionHash: context.cleanupResolution.cleanupResolutionHash,
    cleanupResolution: clone(context.cleanupResolution),
    ruleAtomIds: [...OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_VERSION,
    details: {
      sourceRule: "official_core_8_9_5_and_12_6",
      refreshedCardCount: context.cleanupResolution.cardRefreshes.filter((card) => (
        card.beforeReadiness === "exhausted"
      )).length,
      resetActivationPieceCount:
        context.cleanupResolution.removalDenominator.activationMarkerPieceIds.length,
      nextStep: NEXT_STEP,
      rulesTruth: context.cleanupResolution.rulesTruth,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, error) {
  return {
    actionType: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "cleanup",
    cleanupResolutionHash: null,
    ruleAtomIds: [...OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_cleanup_refresh_fail_closed",
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialCleanupRefreshActionsV1(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  let context;
  try {
    context = validateState(state, options);
    if (sideKey !== context.firstPlayer) fail("CLEANUP_REFRESH_FIRST_PLAYER_ONLY");
  } catch (error) {
    return options.includeDisabled === true ? [disabledAction(state, sideKey, error)] : [];
  }
  return [{
    ...action(context),
    isEnabled: true,
    disabledReason: "",
    score: 100,
  }];
}

export function applyOfficialCleanupRefreshV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_CLEANUP_REFRESH_EXECUTOR_VERSION) {
    fail("CLEANUP_REFRESH_ACTION_INVALID");
  }
  const context = validateState(stateInput, options);
  if (String(actionInput.sideKey || "") !== context.firstPlayer) {
    fail("CLEANUP_REFRESH_FIRST_PLAYER_ONLY");
  }
  if (actionInput.cleanupResolutionHash !== context.cleanupResolution.cleanupResolutionHash
    || !isDeepStrictEqual(actionInput.cleanupResolution, context.cleanupResolution)) {
    fail("CLEANUP_REFRESH_RESOLUTION_STALE");
  }
  const resolvedAction = action(context);
  const state = clone(stateInput);
  for (const piece of state.pieces) {
    piece.activatedPhases = { movement: false, assault: false, combat: false };
  }
  for (const sideKey of SIDE_KEYS) {
    state.players[sideKey].passedPhases = {};
    for (const card of state.cardResources[sideKey]) {
      card.readiness = "ready";
      card.face = "up";
    }
  }
  state.firstPassSideByPhase = {};
  state.activeSideKey = null;
  const historyEntry = {
    schema: HISTORY_SCHEMA,
    round: context.round,
    cleanupResolutionHash: context.cleanupResolution.cleanupResolutionHash,
    preCleanupMaterialHash: context.cleanupResolution.preCleanupMaterialHash,
    retainedMaterialHash: context.cleanupResolution.retainedMaterialHash,
    refreshedCardCount: context.cleanupResolution.cardRefreshes.filter((card) => (
      card.beforeReadiness === "exhausted"
    )).length,
    resetActivationPieceCount:
      context.cleanupResolution.removalDenominator.activationMarkerPieceIds.length,
    trainingTruth: false,
  };
  state.cleanupRefreshHistory = Array.isArray(state.cleanupRefreshHistory)
    ? state.cleanupRefreshHistory
    : [];
  state.cleanupRefreshHistory.push(historyEntry);
  state.scoringCleanupProgress = {
    ...clone(context.progress),
    completedSteps: [
      OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
      OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
      OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
      OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
      OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    ],
    currentStep: NEXT_STEP,
    cleanupResolutionHash: context.cleanupResolution.cleanupResolutionHash,
    trainingTruth: false,
  };
  const events = [{
    type: "cleanup_refresh_completed",
    round: context.round,
    initiatingSideKey: context.firstPlayer,
    cleanupResolutionHash: context.cleanupResolution.cleanupResolutionHash,
    refreshedCardCount: historyEntry.refreshedCardCount,
    resetActivationPieceCount: historyEntry.resetActivationPieceCount,
    retainedMaterialHash: historyEntry.retainedMaterialHash,
    nextStep: NEXT_STEP,
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
    schemaVersion: "starcraft_tmg_official_cleanup_refresh_transition_v1",
    executorId: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: resolvedAction,
    cleanupResolution: context.cleanupResolution,
    rulesTruth: context.cleanupResolution.rulesTruth,
    trainingTruth: false,
  };
}
