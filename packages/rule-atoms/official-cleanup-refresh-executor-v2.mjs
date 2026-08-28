import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialMissionSetupBindingV1 } from
  "../source-data/official-mission-setup-binding-v1.mjs";
import {
  applyOfficialCleanupRefreshV1,
  enumerateOfficialCleanupRefreshActionsV1,
  OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_VERSION,
} from "./official-cleanup-refresh-executor-v1.mjs";
import { OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH } from
  "./official-dodge-resolution-kernel-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS,
} from "./official-end-of-round-effects-executor-v2.mjs";
import { OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE } from
  "./official-hold-position-end-game-executor-v1.mjs";
import { OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE } from
  "./official-mission-marker-control-executor-v2.mjs";
import { OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE } from
  "./official-victory-point-scoring-executor-v1.mjs";

export const OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID =
  "authority.cleanup-refresh-v2";
export const OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_CLEANUP_REFRESH_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_CLEANUP_REFRESH_V2_ATOM_IDS =
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS;
export const OFFICIAL_CLEANUP_REFRESH_V2_DEPENDENCY_ATOM_IDS =
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS;

const PROGRESS_SCHEMA = "starcraft_tmg_scoring_cleanup_progress_v1";
const RESOLUTION_SCHEMA = "starcraft_tmg_official_cleanup_refresh_resolution_v2";
const HISTORY_SCHEMA = "starcraft_tmg_official_cleanup_refresh_history_entry_v2";
const REACTION_LEDGER_SCHEMA = "starcraft_tmg_reaction_usage_ledger_v1";
const NEXT_STEP = "determine_initiative";
const POWER_FIELD_RECORD_KEY = "tactical_cards:power_field";
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const SUPPORTED_UNIT_RECORD_KEYS = Object.freeze([
  "army_units:kerrigan",
  "army_units:marine",
]);
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

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function actionFromCandidate(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function containsPowerField(state) {
  return SIDE_KEYS.some((sideKey) => (state?.cardResources?.[sideKey] || []).some((card) => (
    card?.officialCardRecordKey === POWER_FIELD_RECORD_KEY
  )));
}

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey) || !state?.players?.[sideKey]) {
    fail("CLEANUP_REFRESH_V2_FIRST_PLAYER_REQUIRED");
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
    fail("CLEANUP_REFRESH_V2_PROGRESS_INVALID");
  }
  const last = Array.isArray(state.endOfRoundEffectHistory)
    ? state.endOfRoundEffectHistory.at(-1)
    : null;
  if (!object(last)
    || last.schema !== "starcraft_tmg_official_end_of_round_effect_history_entry_v2"
    || last.round !== Number(state.round)
    || last.effectQueueProofHash !== progress.effectQueueProofHash
    || last.effectCount !== 0
    || last.queueComplete !== true
    || last.trainingTruth !== false) {
    fail("CLEANUP_REFRESH_V2_PROGRESS_INVALID");
  }
  return progress;
}

function phaseBooleanMap(value, detail) {
  if (!object(value)
    || !isDeepStrictEqual(Object.keys(value).sort(), [...PHASE_KEYS])
    || PHASE_KEYS.some((phase) => typeof value[phase] !== "boolean")) {
    fail("CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED", detail);
  }
  return {
    movement: value.movement,
    assault: value.assault,
    combat: value.combat,
  };
}

function passMap(value, detail) {
  if (!object(value)
    || Object.keys(value).some((phase) => !PHASE_KEYS.includes(phase))
    || Object.values(value).some((passed) => typeof passed !== "boolean")) {
    fail("CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED", detail);
  }
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => (
    left.localeCompare(right)
  )));
}

function firstPassMap(value) {
  if (!object(value)
    || Object.keys(value).some((phase) => !PHASE_KEYS.includes(phase))
    || Object.values(value).some((sideKey) => !SIDE_KEYS.includes(sideKey))) {
    fail("CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED", "firstPassSideByPhase");
  }
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => (
    left.localeCompare(right)
  )));
}

function reactionUsageMaterial(state) {
  if (state.reactionUsage === undefined) return { present: false, entryCount: 0 };
  const ledger = state.reactionUsage;
  if (!object(ledger)
    || ledger.schema !== REACTION_LEDGER_SCHEMA
    || ledger.round !== Number(state.round)
    || !Array.isArray(ledger.entries)
    || ledger.trainingTruth !== false
    || ledger.ledgerHash !== hashStarcraftTmgContract(without(ledger, ["ledgerHash"]))) {
    fail("CLEANUP_REFRESH_V2_REACTION_LEDGER_INVALID");
  }
  return {
    present: true,
    entryCount: ledger.entries.length,
    ledgerHash: ledger.ledgerHash,
  };
}

function exactPowerFieldMaterial(state) {
  if (!object(state.cardResources)
    || !SIDE_KEYS.every((sideKey) => Array.isArray(state.cardResources[sideKey]))) {
    fail("CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED", "cardResources");
  }
  const cards = SIDE_KEYS.flatMap((sideKey) => state.cardResources[sideKey]);
  if (cards.length !== 1) {
    fail("CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED", "powerFieldDenominator");
  }
  const card = cards[0];
  const expectedFace = card?.readiness === "ready" ? "up"
    : card?.readiness === "exhausted" ? "down" : "";
  if (!object(card)
    || !String(card.id || "")
    || !SIDE_KEYS.includes(card.sideKey)
    || !state.cardResources[card.sideKey].includes(card)
    || card.cardKind !== "tactical"
    || card.officialCardRecordKey !== POWER_FIELD_RECORD_KEY
    || card.sourceRecordHash !== OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH
    || card.face !== expectedFace
    || !Array.isArray(card.activeEffects)
    || card.activeEffects.length !== 0) {
    fail("CLEANUP_REFRESH_V2_POWER_FIELD_STATE_INVALID");
  }
  return {
    id: card.id,
    sideKey: card.sideKey,
    cardKind: "tactical",
    officialCardRecordKey: POWER_FIELD_RECORD_KEY,
    sourceRecordHash: OFFICIAL_POWER_FIELD_SOURCE_RECORD_HASH,
    beforeReadiness: card.readiness,
    beforeFace: card.face,
    afterReadiness: "ready",
    afterFace: "up",
  };
}

function exactPieceMaterial(state, gameplayDataBundle) {
  const profiles = gameplayDataBundle.combatProfileBundle?.profiles || [];
  const profileKeys = profiles.map((profile) => profile.recordKey)
    .sort((left, right) => left.localeCompare(right));
  if (!isDeepStrictEqual(profileKeys, [...SUPPORTED_UNIT_RECORD_KEYS])) {
    fail("CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED", "combatProfiles");
  }
  const profileByKey = gameplayDataBundle.combatProfileBundle.profilesByRecordKey;
  if (state.pieces.length !== 2) {
    fail("CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED", "pieceDenominator");
  }
  const ids = new Set();
  const recordKeys = [];
  const rows = state.pieces.map((piece) => {
    const id = String(piece?.id || "").trim();
    const profile = profileByKey?.[piece?.officialUnitRecordKey];
    if (!object(piece)
      || !id
      || ids.has(id)
      || !SIDE_KEYS.includes(piece.sideKey)
      || !profile
      || piece.sourceRecordHash !== profile.sourceRecordHash
      || !Array.isArray(piece.selectedUpgradeNames)
      || piece.selectedUpgradeNames.length !== 0
      || !Array.isArray(piece.statuses)
      || piece.statuses.length !== 0
      || !Array.isArray(piece.combatEffects)
      || piece.combatEffects.length !== 0
      || !Array.isArray(piece.assaultEffects)
      || piece.assaultEffects.length !== 0
      || !Number.isSafeInteger(Number(piece.damageMarker))
      || Number(piece.damageMarker) < 0) {
      fail("CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED", id || "piece");
    }
    ids.add(id);
    recordKeys.push(piece.officialUnitRecordKey);
    return {
      pieceId: id,
      sideKey: piece.sideKey,
      officialUnitRecordKey: piece.officialUnitRecordKey,
      sourceRecordHash: piece.sourceRecordHash,
      activatedPhases: phaseBooleanMap(piece.activatedPhases, id),
      damageMarker: Number(piece.damageMarker),
      currentModels: Number(piece.currentModels),
      currentSupply: Number(piece.currentSupply),
      isDestroyed: piece.isDestroyed === true,
      isOnField: piece.isOnField === true,
    };
  });
  if (!isDeepStrictEqual(
    recordKeys.sort((left, right) => left.localeCompare(right)),
    [...SUPPORTED_UNIT_RECORD_KEYS],
  )) {
    fail("CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED", "pieceRecordKeys");
  }
  return rows.sort((left, right) => left.pieceId.localeCompare(right.pieceId));
}

function materialDenominator(state, gameplayDataBundle) {
  if (!object(state.board)
    || !Array.isArray(state.board.missionMarkers)
    || !Array.isArray(state.board.effectMarkers)
    || state.board.effectMarkers.length !== 0
    || !Array.isArray(state.board.tokens)
    || state.board.tokens.length !== 0
    || !Array.isArray(state.board.markers)
    || state.board.markers.length !== 0
    || state.activeSideKey !== null
    || state.pendingAttack !== undefined) {
    fail("CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED", "boardOrPendingAttack");
  }
  const playerPasses = Object.fromEntries(SIDE_KEYS.map((sideKey) => {
    if (!object(state.players?.[sideKey]) || state.players[sideKey].sideKey !== sideKey) {
      fail("CLEANUP_REFRESH_V2_SOURCE_SCOPE_UNRESOLVED", sideKey);
    }
    return [sideKey, passMap(state.players[sideKey].passedPhases, sideKey)];
  }));
  return {
    pieces: exactPieceMaterial(state, gameplayDataBundle),
    cards: [exactPowerFieldMaterial(state)],
    reactionUsage: reactionUsageMaterial(state),
    playerPasses,
    firstPassSideByPhase: firstPassMap(state.firstPassSideByPhase || {}),
    missionMarkers: clone(state.board.missionMarkers),
  };
}

function cleanupResolution(state, context) {
  const material = materialDenominator(state, context.gameplayDataBundle);
  const retainedMaterial = {
    scores: clone(state.scores),
    missionMarkers: material.missionMarkers,
    pieceState: material.pieces.map((piece) => ({
      pieceId: piece.pieceId,
      sideKey: piece.sideKey,
      currentModels: piece.currentModels,
      currentSupply: piece.currentSupply,
      damageMarker: piece.damageMarker,
      isDestroyed: piece.isDestroyed,
      isOnField: piece.isOnField,
    })),
    phaseFirstActorByRound: clone(state.phaseFirstActorByRound || {}),
  };
  const body = {
    schema: RESOLUTION_SCHEMA,
    round: context.round,
    gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
    sourceSnapshotHash: context.gameplayDataBundle.sourceSnapshotHash,
    normalizedDatasetHash: context.gameplayDataBundle.normalizedDatasetHash,
    missionSetupBindingHash: state.officialMissionSetupBinding.missionSetupBindingHash,
    effectQueueProofHash: context.progress.effectQueueProofHash,
    preCleanupMaterialHash: hashStarcraftTmgContract(material),
    retainedMaterialHash: hashStarcraftTmgContract(retainedMaterial),
    removalDenominator: {
      activationMarkerPieceIds: material.pieces.map((piece) => piece.pieceId),
      playerPassSideKeys: [...SIDE_KEYS],
      reactionUsageEntryCount: material.reactionUsage.entryCount,
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
    rulesTruth: "official_cleanup_refresh_power_field_guardian_shell_lifecycle_subset",
    trainingTruth: false,
  };
  return { ...body, cleanupResolutionHash: hashStarcraftTmgContract(body) };
}

function validateCurrentState(state, options) {
  if (!object(state)
    || !object(state.players)
    || !object(state.scores)
    || !Array.isArray(state.pieces)) {
    fail("CLEANUP_REFRESH_V2_STATE_INVALID");
  }
  if (state.phase !== "cleanup") fail("CLEANUP_REFRESH_V2_WRONG_PHASE");
  if (state.gameOver === true
    || state.terminal === true
    || String(state.winner || "")
    || String(state.terminalReason || "")) {
    fail("CLEANUP_REFRESH_V2_TERMINAL_STATE");
  }
  const round = Number(state.round);
  if (!Number.isSafeInteger(round) || round < 2 || round > 4) {
    fail("CLEANUP_REFRESH_V2_ROUND_UNSUPPORTED");
  }
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (gameplayDataBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayDataBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH) {
    fail("CLEANUP_REFRESH_V2_LATEST_DATA_REQUIRED");
  }
  verifyOfficialMissionSetupBindingV1(
    state.officialMissionSetupBinding,
    gameplayDataBundle,
  );
  if (!object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== options.matchBinding.dataSnapshotHash) {
    fail("CLEANUP_REFRESH_V2_DATA_SNAPSHOT_MISMATCH");
  }
  const firstPlayer = firstPlayerSideKey(state);
  const progress = verifyProgress(state);
  const context = { round, firstPlayer, gameplayDataBundle, progress };
  return { ...context, cleanupResolution: cleanupResolution(state, context) };
}

function currentAction(context) {
  return {
    actionType: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    sideKey: context.firstPlayer,
    phase: "cleanup",
    cleanupResolutionHash: context.cleanupResolution.cleanupResolutionHash,
    cleanupResolution: clone(context.cleanupResolution),
    ruleAtomIds: [...OFFICIAL_CLEANUP_REFRESH_V2_ATOM_IDS],
    executorId: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION,
    details: {
      sourceRule: "official_core_8_9_5_and_12_6_power_field_lifecycle",
      refreshedCardCount: context.cleanupResolution.cardRefreshes.filter((card) => (
        card.beforeReadiness === "exhausted"
      )).length,
      resetActivationPieceCount:
        context.cleanupResolution.removalDenominator.activationMarkerPieceIds.length,
      clearedReactionUsageEntryCount:
        context.cleanupResolution.removalDenominator.reactionUsageEntryCount,
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
    ruleAtomIds: [...OFFICIAL_CLEANUP_REFRESH_V2_ATOM_IDS],
    executorId: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_cleanup_refresh_v2_fail_closed",
      trainingTruth: false,
    },
  };
}

function toV2DelegatedCandidate(candidate) {
  return {
    ...clone(candidate),
    executorId: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION,
    details: {
      ...(candidate.details || {}),
      executorPath: "historical_cleanup_v1_delegate",
      delegatedExecutorId: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
      delegatedExecutorVersion: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_VERSION,
      trainingTruth: false,
    },
  };
}

function toV1Action(action) {
  return {
    ...clone(action),
    executorId: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialCleanupRefreshActionsV2(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  if (!containsPowerField(state)) {
    return enumerateOfficialCleanupRefreshActionsV1(state, options)
      .map(toV2DelegatedCandidate);
  }
  let context;
  try {
    context = validateCurrentState(state, options);
    if (sideKey !== context.firstPlayer) fail("CLEANUP_REFRESH_V2_FIRST_PLAYER_ONLY");
  } catch (error) {
    return options.includeDisabled === true ? [disabledAction(state, sideKey, error)] : [];
  }
  return [{
    ...currentAction(context),
    isEnabled: true,
    disabledReason: "",
    score: 110,
  }];
}

function applyCurrent(stateInput, actionInput, options) {
  const context = validateCurrentState(stateInput, options);
  if (String(actionInput.sideKey || "") !== context.firstPlayer) {
    fail("CLEANUP_REFRESH_V2_FIRST_PLAYER_ONLY");
  }
  const expected = actionFromCandidate(currentAction(context));
  if (!isDeepStrictEqual(actionInput, expected)) {
    fail("CLEANUP_REFRESH_V2_RESOLUTION_STALE");
  }
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
  delete state.reactionUsage;
  const refreshedCardCount = context.cleanupResolution.cardRefreshes.filter((card) => (
    card.beforeReadiness === "exhausted"
  )).length;
  const historyEntry = {
    schema: HISTORY_SCHEMA,
    round: context.round,
    cleanupResolutionHash: context.cleanupResolution.cleanupResolutionHash,
    preCleanupMaterialHash: context.cleanupResolution.preCleanupMaterialHash,
    retainedMaterialHash: context.cleanupResolution.retainedMaterialHash,
    refreshedCardCount,
    resetActivationPieceCount:
      context.cleanupResolution.removalDenominator.activationMarkerPieceIds.length,
    clearedReactionUsageEntryCount:
      context.cleanupResolution.removalDenominator.reactionUsageEntryCount,
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
    refreshedCardCount,
    resetActivationPieceCount: historyEntry.resetActivationPieceCount,
    clearedReactionUsageEntryCount: historyEntry.clearedReactionUsageEntryCount,
    retainedMaterialHash: historyEntry.retainedMaterialHash,
    nextStep: NEXT_STEP,
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: context.round,
    phase: "cleanup",
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_cleanup_refresh_transition_v2",
    executorId: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    cleanupResolution: context.cleanupResolution,
    rulesTruth: context.cleanupResolution.rulesTruth,
    trainingTruth: false,
  };
}

function applyDelegated(stateInput, actionInput, options) {
  const applied = applyOfficialCleanupRefreshV1(
    stateInput,
    toV1Action(actionInput),
    options,
  );
  const result = clone(applied);
  result.schemaVersion = "starcraft_tmg_official_cleanup_refresh_transition_v2";
  result.executorId = OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION;
  result.action = clone(actionInput);
  result.delegatedExecutor = {
    executorId: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_EXECUTOR_VERSION,
  };
  const lastLog = result.state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  result.rulesTruth = "official_cleanup_refresh_v1_delegated_by_v2";
  result.trainingTruth = false;
  return result;
}

export function applyOfficialCleanupRefreshV2(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION) {
    fail("CLEANUP_REFRESH_V2_ACTION_INVALID");
  }
  if (actionInput.cleanupResolution?.schema === RESOLUTION_SCHEMA) {
    return applyCurrent(stateInput, actionInput, options);
  }
  return applyDelegated(stateInput, actionInput, options);
}
