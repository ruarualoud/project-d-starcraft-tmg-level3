import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialCleanupCardBundleV1 } from
  "../source-data/official-cleanup-card-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialMissionSetupBindingV1 } from
  "../source-data/official-mission-setup-binding-v1.mjs";
import {
  createOfficialCharacteristicStatusKernelV1,
  OFFICIAL_OPTICAL_FLARE_MARKER_SCHEMA,
  OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA,
  verifyOfficialOpticalFlareMarkerV1,
  verifyOfficialOpticalFlareStatusV1,
} from "./official-characteristic-status-kernel-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
} from "./official-cleanup-refresh-executor-v1.mjs";
import {
  applyOfficialCleanupRefreshV2,
  enumerateOfficialCleanupRefreshActionsV2,
  OFFICIAL_CLEANUP_REFRESH_V2_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION,
} from "./official-cleanup-refresh-executor-v2.mjs";
import {
  applyOfficialEndOfRoundEffectsV2,
  enumerateOfficialEndOfRoundEffectsActionsV2,
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION,
} from "./official-end-of-round-effects-executor-v2.mjs";
import { OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE } from
  "./official-hold-position-end-game-executor-v1.mjs";
import { OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE } from
  "./official-mission-marker-control-executor-v2.mjs";
import { OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE } from
  "./official-victory-point-scoring-executor-v1.mjs";

export const OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID =
  "authority.end-of-round-effects-v3";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION = "3.0.0";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V3_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS = Object.freeze([
  ...OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS,
  "rule-atom:end-round-effect-cleanup-removal",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID =
  "authority.cleanup-refresh-v3";
export const OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION = "3.0.0";
export const OFFICIAL_CLEANUP_REFRESH_V3_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_CLEANUP_REFRESH_V3_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:end-round-effect-cleanup-removal",
]);
export const OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_CLEANUP_REFRESH_V2_ATOM_IDS,
    ...OFFICIAL_CLEANUP_REFRESH_V3_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const EOR_PROOF_SCHEMA = "starcraft_tmg_official_end_of_round_effect_queue_proof_v3";
const EOR_HISTORY_SCHEMA = "starcraft_tmg_official_end_of_round_effect_history_entry_v3";
const CLEANUP_RESOLUTION_SCHEMA =
  "starcraft_tmg_official_optical_flare_cleanup_resolution_v3";
const CLEANUP_HISTORY_SCHEMA =
  "starcraft_tmg_official_cleanup_refresh_history_entry_v3";
const PROGRESS_SCHEMA = "starcraft_tmg_scoring_cleanup_progress_v1";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const PHASE_KEYS = Object.freeze(["assault", "combat", "movement"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const KERNEL = createOfficialCharacteristicStatusKernelV1();

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

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey) || !state?.players?.[sideKey]) {
    fail("OPTICAL_FLARE_LIFECYCLE_FIRST_PLAYER_REQUIRED");
  }
  return sideKey;
}

function hasOpticalFlareStatus(state) {
  return (state?.pieces || []).some((piece) => (piece.statuses || []).some((status) => (
    status?.schema === OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA
  )));
}

function exactStatusMaterial(state) {
  if (!object(state.board) || !Array.isArray(state.board.effectMarkers)) {
    fail("OPTICAL_FLARE_LIFECYCLE_MATERIAL_INVALID");
  }
  const rows = [];
  for (const piece of state.pieces) {
    if (!Array.isArray(piece.statuses)) fail("OPTICAL_FLARE_LIFECYCLE_MATERIAL_INVALID");
    for (const status of piece.statuses) {
      if (status?.schema !== OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA) {
        fail("OPTICAL_FLARE_LIFECYCLE_UNKNOWN_STATUS");
      }
      verifyOfficialOpticalFlareStatusV1(status);
      if (status.targetPieceId !== piece.id || status.roundApplied !== Number(state.round)) {
        fail("OPTICAL_FLARE_LIFECYCLE_STATUS_BINDING_INVALID");
      }
      const marker = state.board.effectMarkers.find((entry) => (
        entry?.statusEffectHash === status.statusEffectHash
      ));
      verifyOfficialOpticalFlareMarkerV1(marker, status);
      rows.push({ piece, status, marker });
    }
  }
  if (rows.length !== 1
    || state.board.effectMarkers.length !== 1
    || state.board.effectMarkers[0]?.schema !== OFFICIAL_OPTICAL_FLARE_MARKER_SCHEMA) {
    fail("OPTICAL_FLARE_LIFECYCLE_EXACT_STATUS_REQUIRED");
  }
  return rows[0];
}

function verifyCommon(state, options) {
  if (!object(state)
    || !object(state.players)
    || !object(state.scores)
    || !Array.isArray(state.pieces)
    || state.phase !== "cleanup"
    || state.gameOver === true
    || state.terminal === true
    || String(state.winner || "")
    || String(state.terminalReason || "")) {
    fail("OPTICAL_FLARE_LIFECYCLE_STATE_INVALID");
  }
  const round = Number(state.round);
  if (!Number.isSafeInteger(round) || round < 2 || round > 4) {
    fail("OPTICAL_FLARE_LIFECYCLE_ROUND_UNSUPPORTED");
  }
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  verifyOfficialCleanupCardBundleV1(gameplayDataBundle.cleanupCardBundle);
  verifyOfficialMissionSetupBindingV1(state.officialMissionSetupBinding, gameplayDataBundle);
  if (gameplayDataBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayDataBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || gameplayDataBundle.repositoryFallbackAllowed !== false
    || !object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== options.matchBinding.dataSnapshotHash) {
    fail("OPTICAL_FLARE_LIFECYCLE_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  return {
    round,
    firstPlayer: firstPlayerSideKey(state),
    gameplayDataBundle,
    material: exactStatusMaterial(state),
  };
}

function verifyEorProgress(state) {
  const progress = state.scoringCleanupProgress;
  if (!object(progress)
    || progress.schemaVersion !== PROGRESS_SCHEMA
    || progress.round !== Number(state.round)
    || progress.currentStep !== OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE
    || !isDeepStrictEqual(progress.completedSteps, [
      OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
      OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
      OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
    ])
    || !HASH_PATTERN.test(String(progress.controlResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.scoringResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.endGameResolutionHash || ""))) {
    fail("OPTICAL_FLARE_END_OF_ROUND_PROGRESS_INVALID");
  }
  return progress;
}

function eorProof(state, context) {
  const body = {
    schema: EOR_PROOF_SCHEMA,
    round: context.round,
    gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
    missionSetupBindingHash: state.officialMissionSetupBinding.missionSetupBindingHash,
    queueComplete: true,
    entries: [],
    effectCount: 0,
    persistentStatusCount: 1,
    persistentStatusEffectHashes: [context.material.status.statusEffectHash],
    persistentMarkerHashes: [context.material.marker.markerHash],
    persistenceRule:
      "until_end_of_round_effect_persists_through_resolution_and_is_removed_during_cleanup",
    nextStep: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    trainingTruth: false,
  };
  return { ...body, effectQueueProofHash: hashStarcraftTmgContract(body) };
}

function eorAction(state, context) {
  const proof = eorProof(state, context);
  return {
    actionType: OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
    sideKey: context.firstPlayer,
    phase: "cleanup",
    effectQueueProofHash: proof.effectQueueProofHash,
    effectQueueProof: proof,
    ruleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION,
  };
}

function toV3EorCandidate(candidate) {
  return {
    ...clone(candidate),
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION,
    details: {
      ...(candidate.details || {}),
      executorPath: "historical_end_of_round_v2_delegate",
      trainingTruth: false,
    },
  };
}

function toV2EorAction(action) {
  return {
    ...clone(action),
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION,
  };
}

export function officialEndOfRoundEffectsV3AtomIdsForStateV1(state) {
  return hasOpticalFlareStatus(state)
    ? OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS
    : OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS;
}

export function enumerateOfficialEndOfRoundEffectsActionsV3(state, options = {}) {
  if (!hasOpticalFlareStatus(state)) {
    return enumerateOfficialEndOfRoundEffectsActionsV2(state, options).map(toV3EorCandidate);
  }
  const sideKey = String(options.sideKey || "").trim();
  try {
    const context = verifyCommon(state, options);
    verifyEorProgress(state);
    if (sideKey !== context.firstPlayer) fail("OPTICAL_FLARE_END_OF_ROUND_FIRST_PLAYER_ONLY");
    return [{
      ...eorAction(state, context),
      isEnabled: true,
      disabledReason: "",
      score: 115,
      details: {
        persistentStatusCount: 1,
        removalDeferredToCleanup: true,
        trainingTruth: false,
      },
    }];
  } catch (error) {
    if (options.includeDisabled !== true) return [];
    return [{
      actionType: OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
      sideKey,
      phase: "cleanup",
      effectQueueProofHash: null,
      ruleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS],
      executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
      executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION,
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0,
      details: { trainingTruth: false },
    }];
  }
}

export function applyOfficialEndOfRoundEffectsV3(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION) {
    fail("OPTICAL_FLARE_END_OF_ROUND_ACTION_INVALID");
  }
  if (!hasOpticalFlareStatus(stateInput)) {
    const delegated = applyOfficialEndOfRoundEffectsV2(
      stateInput,
      toV2EorAction(actionInput),
      options,
    );
    const result = clone(delegated);
    result.schemaVersion = "starcraft_tmg_official_end_of_round_effects_transition_v3";
    result.executorId = OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID;
    result.executorVersion = OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION;
    result.action = clone(actionInput);
    const lastLog = result.state.log?.at(-1);
    if (lastLog) lastLog.action = clone(actionInput);
    return result;
  }
  const context = verifyCommon(stateInput, options);
  const progress = verifyEorProgress(stateInput);
  const expected = eorAction(stateInput, context);
  if (!isDeepStrictEqual(actionInput, expected)) fail("OPTICAL_FLARE_END_OF_ROUND_PROOF_STALE");
  const state = clone(stateInput);
  const proof = expected.effectQueueProof;
  const historyEntry = {
    schema: EOR_HISTORY_SCHEMA,
    round: context.round,
    effectQueueProofHash: proof.effectQueueProofHash,
    effectCount: 0,
    persistentStatusCount: 1,
    persistentStatusEffectHashes: [...proof.persistentStatusEffectHashes],
    queueComplete: true,
    trainingTruth: false,
  };
  state.endOfRoundEffectHistory = Array.isArray(state.endOfRoundEffectHistory)
    ? state.endOfRoundEffectHistory
    : [];
  state.endOfRoundEffectHistory.push(historyEntry);
  state.scoringCleanupProgress = {
    ...clone(progress),
    completedSteps: [
      OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
      OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
      OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
      OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
    ],
    currentStep: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    effectQueueProofHash: proof.effectQueueProofHash,
    trainingTruth: false,
  };
  const events = [{
    type: "end_of_round_effect_window_resolved",
    round: context.round,
    persistentStatusEffectHashes: [...proof.persistentStatusEffectHashes],
    removalDeferredToCleanup: true,
    nextStep: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
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
    schemaVersion: "starcraft_tmg_official_end_of_round_effects_transition_v3",
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    effectQueueProof: proof,
    rulesTruth: "official_optical_flare_persists_through_end_of_round_resolution",
    trainingTruth: false,
  };
}

function verifyCleanupProgress(state) {
  const progress = state.scoringCleanupProgress;
  const history = state.endOfRoundEffectHistory?.at(-1);
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
    || !HASH_PATTERN.test(String(progress.effectQueueProofHash || ""))
    || !object(history)
    || history.schema !== EOR_HISTORY_SCHEMA
    || history.round !== Number(state.round)
    || history.effectQueueProofHash !== progress.effectQueueProofHash
    || history.persistentStatusCount !== 1
    || history.queueComplete !== true
    || history.trainingTruth !== false) {
    fail("OPTICAL_FLARE_CLEANUP_PROGRESS_INVALID");
  }
  return progress;
}

function validatePhaseMap(value, code) {
  if (!object(value)
    || !isDeepStrictEqual(Object.keys(value).sort(), [...PHASE_KEYS])
    || PHASE_KEYS.some((phase) => typeof value[phase] !== "boolean")) {
    fail(code);
  }
}

function cleanupMaterial(state, context) {
  if (state.activeSideKey !== null
    || !object(state.cardResources)
    || !SIDE_KEYS.every((sideKey) => Array.isArray(state.cardResources[sideKey]))) {
    fail("OPTICAL_FLARE_CLEANUP_MATERIAL_INVALID");
  }
  const profileByKey = new Map(
    context.gameplayDataBundle.cleanupCardBundle.profiles.map((profile) => [
      profile.recordKey,
      profile,
    ]),
  );
  const cards = [];
  for (const sideKey of SIDE_KEYS) {
    for (const card of state.cardResources[sideKey]) {
      const profile = profileByKey.get(card?.officialCardRecordKey);
      if (!profile
        || card.sideKey !== sideKey
        || card.cardKind !== profile.cardKind
        || card.sourceRecordHash !== profile.sourceRecordHash
        || Number(card.resource) !== profile.resource
        || !["ready", "exhausted"].includes(card.readiness)
        || card.face !== (card.readiness === "ready" ? "up" : "down")) {
        fail("OPTICAL_FLARE_CLEANUP_CARD_INVALID");
      }
      cards.push({
        id: card.id,
        sideKey,
        beforeReadiness: card.readiness,
        beforeFace: card.face,
        afterReadiness: "ready",
        afterFace: "up",
      });
    }
  }
  for (const piece of state.pieces) {
    validatePhaseMap(piece.activatedPhases, "OPTICAL_FLARE_CLEANUP_PIECE_INVALID");
  }
  const cleanup = KERNEL.removeAtCleanup({
    statuses: context.material.piece.statuses,
    markers: state.board.effectMarkers,
  });
  if (cleanup.receipt.removedStatusEffectHashes.length !== 1
    || cleanup.receipt.removedMarkerHashes.length !== 1) {
    fail("OPTICAL_FLARE_CLEANUP_DENOMINATOR_INVALID");
  }
  return {
    cards: cards.sort((left, right) => left.id.localeCompare(right.id)),
    cleanup,
  };
}

function cleanupResolution(state, context, progress) {
  const material = cleanupMaterial(state, context);
  const body = {
    schema: CLEANUP_RESOLUTION_SCHEMA,
    round: context.round,
    gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
    effectQueueProofHash: progress.effectQueueProofHash,
    statusCleanupReceipt: clone(material.cleanup.receipt),
    cardRefreshes: material.cards,
    resetActivationPieceIds: state.pieces.map((piece) => piece.id).sort(),
    clearedAcademyReactionUsageEntries:
      Number(state.academyReactionUsage?.entries?.length || 0),
    nextStep: "determine_initiative",
    trainingTruth: false,
  };
  return { ...body, cleanupResolutionHash: hashStarcraftTmgContract(body) };
}

function cleanupAction(state, context, progress) {
  const resolution = cleanupResolution(state, context, progress);
  return {
    actionType: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    sideKey: context.firstPlayer,
    phase: "cleanup",
    cleanupResolutionHash: resolution.cleanupResolutionHash,
    cleanupResolution: resolution,
    ruleAtomIds: [...OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION,
  };
}

function toV3CleanupCandidate(candidate) {
  return {
    ...clone(candidate),
    executorId: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION,
    details: {
      ...(candidate.details || {}),
      executorPath: "historical_cleanup_v2_delegate",
      trainingTruth: false,
    },
  };
}

function toV2CleanupAction(action) {
  return {
    ...clone(action),
    executorId: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V2_EXECUTOR_VERSION,
  };
}

export function officialCleanupRefreshV3AtomIdsForStateV1(state) {
  return hasOpticalFlareStatus(state)
    ? OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS
    : OFFICIAL_CLEANUP_REFRESH_V2_ATOM_IDS;
}

export function enumerateOfficialCleanupRefreshActionsV3(state, options = {}) {
  if (!hasOpticalFlareStatus(state)) {
    return enumerateOfficialCleanupRefreshActionsV2(state, options).map(toV3CleanupCandidate);
  }
  const sideKey = String(options.sideKey || "").trim();
  try {
    const context = verifyCommon(state, options);
    const progress = verifyCleanupProgress(state);
    if (sideKey !== context.firstPlayer) fail("OPTICAL_FLARE_CLEANUP_FIRST_PLAYER_ONLY");
    return [{
      ...cleanupAction(state, context, progress),
      isEnabled: true,
      disabledReason: "",
      score: 120,
      details: {
        removedOpticalFlareStatusCount: 1,
        refreshedCardCount: SIDE_KEYS.flatMap((key) => state.cardResources[key])
          .filter((card) => card.readiness === "exhausted").length,
        trainingTruth: false,
      },
    }];
  } catch (error) {
    if (options.includeDisabled !== true) return [];
    return [{
      actionType: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
      sideKey,
      phase: "cleanup",
      cleanupResolutionHash: null,
      ruleAtomIds: [...OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS],
      executorId: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
      executorVersion: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION,
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0,
      details: { trainingTruth: false },
    }];
  }
}

export function applyOfficialCleanupRefreshV3(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION) {
    fail("OPTICAL_FLARE_CLEANUP_ACTION_INVALID");
  }
  if (!hasOpticalFlareStatus(stateInput)) {
    const delegated = applyOfficialCleanupRefreshV2(
      stateInput,
      toV2CleanupAction(actionInput),
      options,
    );
    const result = clone(delegated);
    result.schemaVersion = "starcraft_tmg_official_cleanup_refresh_transition_v3";
    result.executorId = OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID;
    result.executorVersion = OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION;
    result.action = clone(actionInput);
    const lastLog = result.state.log?.at(-1);
    if (lastLog) lastLog.action = clone(actionInput);
    return result;
  }
  const context = verifyCommon(stateInput, options);
  const progress = verifyCleanupProgress(stateInput);
  const expected = cleanupAction(stateInput, context, progress);
  if (!isDeepStrictEqual(actionInput, expected)) fail("OPTICAL_FLARE_CLEANUP_STALE");
  const state = clone(stateInput);
  const target = state.pieces.find((piece) => piece.id === context.material.piece.id);
  const cleanup = KERNEL.removeAtCleanup({
    statuses: target.statuses,
    markers: state.board.effectMarkers,
  });
  target.statuses = cleanup.statuses;
  state.board.effectMarkers = cleanup.markers;
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
  delete state.academyReactionUsage;
  const resolution = expected.cleanupResolution;
  const historyEntry = {
    schema: CLEANUP_HISTORY_SCHEMA,
    round: context.round,
    cleanupResolutionHash: resolution.cleanupResolutionHash,
    statusCleanupHash: cleanup.receipt.cleanupHash,
    removedStatusEffectHashes: [...cleanup.receipt.removedStatusEffectHashes],
    refreshedCardCount: resolution.cardRefreshes.filter((card) => (
      card.beforeReadiness === "exhausted"
    )).length,
    trainingTruth: false,
  };
  state.cleanupRefreshHistory = Array.isArray(state.cleanupRefreshHistory)
    ? state.cleanupRefreshHistory
    : [];
  state.cleanupRefreshHistory.push(historyEntry);
  state.scoringCleanupProgress = {
    ...clone(progress),
    completedSteps: [
      OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
      OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
      OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
      OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
      OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    ],
    currentStep: "determine_initiative",
    cleanupResolutionHash: resolution.cleanupResolutionHash,
    trainingTruth: false,
  };
  const events = [{
    type: "cleanup_refresh_completed",
    round: context.round,
    cleanupResolutionHash: resolution.cleanupResolutionHash,
    removedStatusEffectHashes: [...cleanup.receipt.removedStatusEffectHashes],
    removedMarkerHashes: [...cleanup.receipt.removedMarkerHashes],
    refreshedCardCount: historyEntry.refreshedCardCount,
    nextStep: "determine_initiative",
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
    schemaVersion: "starcraft_tmg_official_cleanup_refresh_transition_v3",
    executorId: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    cleanupResolution: resolution,
    rulesTruth: "official_optical_flare_removed_during_cleanup",
    trainingTruth: false,
  };
}
