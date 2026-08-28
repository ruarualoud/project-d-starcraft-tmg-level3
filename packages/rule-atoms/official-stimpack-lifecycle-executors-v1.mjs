import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialCleanupCardBundleV1 } from
  "../source-data/official-cleanup-card-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialMissionSetupBindingV1 } from
  "../source-data/official-mission-setup-binding-v1.mjs";
import { OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE } from
  "./official-cleanup-refresh-executor-v1.mjs";
import {
  applyOfficialEndOfRoundEffectsV3,
  applyOfficialCleanupRefreshV3,
  enumerateOfficialCleanupRefreshActionsV3,
  enumerateOfficialEndOfRoundEffectsActionsV3,
  officialCleanupRefreshV3AtomIdsForStateV1,
  officialEndOfRoundEffectsV3AtomIdsForStateV1,
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION,
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION,
} from "./official-optical-flare-lifecycle-executors-v1.mjs";
import { OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE } from
  "./official-end-of-round-effects-executor-v2.mjs";
import { OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE } from
  "./official-hold-position-end-game-executor-v1.mjs";
import {
  createOfficialMarineStimpackKernelV1,
  OFFICIAL_STIMPACK_MARKER_SCHEMA,
  OFFICIAL_STIMPACK_STATUS_SCHEMA,
  verifyOfficialStimpackMarkerV1,
  verifyOfficialStimpackStatusV1,
} from "./official-marine-stimpack-kernel-v1.mjs";
import { OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE } from
  "./official-mission-marker-control-executor-v2.mjs";
import { OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE } from
  "./official-victory-point-scoring-executor-v1.mjs";

export const OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID =
  "authority.end-of-round-effects-v4";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION = "4.0.0";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V4_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS,
    "rule-atom:active-ability-default-end-round-expiry",
    "rule-atom:singleton:core-11-buff-duration:48199913097a",
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID =
  "authority.cleanup-refresh-v4";
export const OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_VERSION = "4.0.0";
export const OFFICIAL_CLEANUP_REFRESH_V4_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS,
    "rule-atom:active-ability-default-end-round-expiry",
    "rule-atom:singleton:core-11-buff-duration:48199913097a",
  ]),
].sort((left, right) => left.localeCompare(right)));

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const EOR_PROOF_SCHEMA = "starcraft_tmg_official_end_of_round_effect_queue_proof_v4";
const EOR_HISTORY_SCHEMA =
  "starcraft_tmg_official_end_of_round_effect_history_entry_v4";
const CLEANUP_RESOLUTION_SCHEMA =
  "starcraft_tmg_official_stimpack_cleanup_resolution_v4";
const CLEANUP_HISTORY_SCHEMA =
  "starcraft_tmg_official_cleanup_refresh_history_entry_v4";
const PROGRESS_SCHEMA = "starcraft_tmg_scoring_cleanup_progress_v1";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const PHASE_KEYS = Object.freeze(["assault", "combat", "movement"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const KERNEL = createOfficialMarineStimpackKernelV1();

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

function hasStimpackStatus(state) {
  return (state?.pieces || []).some((piece) => (piece.statuses || []).some((status) => (
    status?.schema === OFFICIAL_STIMPACK_STATUS_SCHEMA
  )));
}

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey) || !state?.players?.[sideKey]) {
    fail("STIMPACK_LIFECYCLE_FIRST_PLAYER_REQUIRED");
  }
  return sideKey;
}

function exactStatusMaterial(state) {
  if (!object(state.board) || !Array.isArray(state.board.effectMarkers)) {
    fail("STIMPACK_LIFECYCLE_MATERIAL_INVALID");
  }
  const rows = [];
  for (const piece of state.pieces) {
    if (!Array.isArray(piece.statuses)) fail("STIMPACK_LIFECYCLE_MATERIAL_INVALID");
    for (const status of piece.statuses) {
      if (status?.schema !== OFFICIAL_STIMPACK_STATUS_SCHEMA) {
        fail("STIMPACK_LIFECYCLE_UNKNOWN_STATUS");
      }
      verifyOfficialStimpackStatusV1(status);
      if (status.targetPieceId !== piece.id || status.roundApplied !== Number(state.round)) {
        fail("STIMPACK_LIFECYCLE_STATUS_BINDING_INVALID");
      }
      const marker = state.board.effectMarkers.find((entry) => (
        entry?.statusEffectHash === status.statusEffectHash
      ));
      verifyOfficialStimpackMarkerV1(marker, status);
      rows.push({ piece, status, marker });
    }
  }
  if (rows.length !== 1
    || state.board.effectMarkers.length !== 1
    || state.board.effectMarkers[0]?.schema !== OFFICIAL_STIMPACK_MARKER_SCHEMA) {
    fail("STIMPACK_LIFECYCLE_EXACT_STATUS_REQUIRED");
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
    fail("STIMPACK_LIFECYCLE_STATE_INVALID");
  }
  const round = Number(state.round);
  if (!Number.isSafeInteger(round) || round < 2 || round > 4) {
    fail("STIMPACK_LIFECYCLE_ROUND_UNSUPPORTED");
  }
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  verifyOfficialCleanupCardBundleV1(gameplayDataBundle.cleanupCardBundle);
  verifyOfficialMissionSetupBindingV1(
    state.officialMissionSetupBinding,
    gameplayDataBundle,
  );
  if (gameplayDataBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayDataBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || gameplayDataBundle.repositoryFallbackAllowed !== false
    || !object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle)
      !== options.matchBinding.dataSnapshotHash) {
    fail("STIMPACK_LIFECYCLE_LATEST_OFFICIAL_DATA_REQUIRED");
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
    fail("STIMPACK_END_OF_ROUND_PROGRESS_INVALID");
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
    persistenceRules: [
      "buff_speed_duration_until_end_of_round_removed_during_cleanup",
      "active_ability_default_duration_applies_to_precision_removed_during_cleanup",
    ],
    damageMarkerBeforeCleanup: Number(context.material.piece.damageMarker || 0),
    damageMarkerRemovalProhibited: true,
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
    ruleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION,
  };
}

function toV4Candidate(candidate, executorId, executorVersion, path) {
  return {
    ...clone(candidate),
    executorId,
    executorVersion,
    details: {
      ...(candidate.details || {}),
      executorPath: path,
      trainingTruth: false,
    },
  };
}

function toV3Action(action, executorId, executorVersion) {
  return { ...clone(action), executorId, executorVersion };
}

export function officialEndOfRoundEffectsV4AtomIdsForStateV1(state) {
  return hasStimpackStatus(state)
    ? OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ATOM_IDS
    : officialEndOfRoundEffectsV3AtomIdsForStateV1(state);
}

export function enumerateOfficialEndOfRoundEffectsActionsV4(state, options = {}) {
  if (!hasStimpackStatus(state)) {
    return enumerateOfficialEndOfRoundEffectsActionsV3(state, options).map((candidate) => (
      toV4Candidate(
        candidate,
        OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
        OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION,
        "historical_end_of_round_v3_delegate",
      )
    ));
  }
  const sideKey = String(options.sideKey || "").trim();
  try {
    const context = verifyCommon(state, options);
    verifyEorProgress(state);
    if (sideKey !== context.firstPlayer) fail("STIMPACK_END_OF_ROUND_FIRST_PLAYER_ONLY");
    return [{
      ...eorAction(state, context),
      isEnabled: true,
      disabledReason: "",
      score: 116,
      details: {
        persistentStatusCount: 1,
        removalDeferredToCleanup: true,
        damageMarkerRetained: true,
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
      ruleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ATOM_IDS],
      executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
      executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION,
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0,
      details: { trainingTruth: false },
    }];
  }
}

export function applyOfficialEndOfRoundEffectsV4(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION) {
    fail("STIMPACK_END_OF_ROUND_ACTION_INVALID");
  }
  if (!hasStimpackStatus(stateInput)) {
    const delegated = applyOfficialEndOfRoundEffectsV3(
      stateInput,
      toV3Action(
        actionInput,
        OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
        OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_VERSION,
      ),
      options,
    );
    const result = clone(delegated);
    result.schemaVersion = "starcraft_tmg_official_end_of_round_effects_transition_v4";
    result.executorId = OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID;
    result.executorVersion = OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION;
    result.action = clone(actionInput);
    const lastLog = result.state.log?.at(-1);
    if (lastLog) lastLog.action = clone(actionInput);
    return result;
  }
  const context = verifyCommon(stateInput, options);
  const progress = verifyEorProgress(stateInput);
  const expected = eorAction(stateInput, context);
  if (!isDeepStrictEqual(actionInput, expected)) fail("STIMPACK_END_OF_ROUND_PROOF_STALE");
  const state = clone(stateInput);
  const proof = expected.effectQueueProof;
  const historyEntry = {
    schema: EOR_HISTORY_SCHEMA,
    round: context.round,
    effectQueueProofHash: proof.effectQueueProofHash,
    effectCount: 0,
    persistentStatusCount: 1,
    persistentStatusEffectHashes: [...proof.persistentStatusEffectHashes],
    damageMarkerRetained: Number(context.material.piece.damageMarker || 0),
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
    damageMarkerRetained: historyEntry.damageMarkerRetained,
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
    schemaVersion: "starcraft_tmg_official_end_of_round_effects_transition_v4",
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    effectQueueProof: proof,
    rulesTruth: "official_stimpack_status_persists_until_cleanup",
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
    fail("STIMPACK_CLEANUP_PROGRESS_INVALID");
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
    fail("STIMPACK_CLEANUP_MATERIAL_INVALID");
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
        fail("STIMPACK_CLEANUP_CARD_INVALID");
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
    validatePhaseMap(piece.activatedPhases, "STIMPACK_CLEANUP_PIECE_INVALID");
  }
  const cleanup = KERNEL.removeAtCleanup({
    statuses: context.material.piece.statuses,
    markers: state.board.effectMarkers,
  });
  if (cleanup.receipt.removedStatusEffectHashes.length !== 1
    || cleanup.receipt.removedMarkerHashes.length !== 1) {
    fail("STIMPACK_CLEANUP_DENOMINATOR_INVALID");
  }
  return { cards: cards.sort((left, right) => left.id.localeCompare(right.id)), cleanup };
}

function cleanupResolution(state, context, progress) {
  const material = cleanupMaterial(state, context);
  const damageMarker = Number(context.material.piece.damageMarker || 0);
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
    stimpackPieceId: context.material.piece.id,
    damageMarkerBeforeCleanup: damageMarker,
    damageMarkerAfterCleanup: damageMarker,
    nonLethalDamageMarkerRetained: true,
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
    ruleAtomIds: [...OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_VERSION,
  };
}

export function officialCleanupRefreshV4AtomIdsForStateV1(state) {
  return hasStimpackStatus(state)
    ? OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ATOM_IDS
    : officialCleanupRefreshV3AtomIdsForStateV1(state);
}

export function enumerateOfficialCleanupRefreshActionsV4(state, options = {}) {
  if (!hasStimpackStatus(state)) {
    return enumerateOfficialCleanupRefreshActionsV3(state, options).map((candidate) => (
      toV4Candidate(
        candidate,
        OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
        OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_VERSION,
        "historical_cleanup_v3_delegate",
      )
    ));
  }
  const sideKey = String(options.sideKey || "").trim();
  try {
    const context = verifyCommon(state, options);
    const progress = verifyCleanupProgress(state);
    if (sideKey !== context.firstPlayer) fail("STIMPACK_CLEANUP_FIRST_PLAYER_ONLY");
    return [{
      ...cleanupAction(state, context, progress),
      isEnabled: true,
      disabledReason: "",
      score: 121,
      details: {
        removedStimpackStatusCount: 1,
        retainedDamageMarker: Number(context.material.piece.damageMarker || 0),
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
      ruleAtomIds: [...OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ATOM_IDS],
      executorId: OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
      executorVersion: OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_VERSION,
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0,
      details: { trainingTruth: false },
    }];
  }
}

export function applyOfficialCleanupRefreshV4(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_VERSION) {
    fail("STIMPACK_CLEANUP_ACTION_INVALID");
  }
  if (!hasStimpackStatus(stateInput)) {
    const delegated = applyOfficialCleanupRefreshV3(
      stateInput,
      toV3Action(
        actionInput,
        OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
        OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_VERSION,
      ),
      options,
    );
    const result = clone(delegated);
    result.schemaVersion = "starcraft_tmg_official_cleanup_refresh_transition_v4";
    result.executorId = OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID;
    result.executorVersion = OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_VERSION;
    result.action = clone(actionInput);
    const lastLog = result.state.log?.at(-1);
    if (lastLog) lastLog.action = clone(actionInput);
    return result;
  }
  const context = verifyCommon(stateInput, options);
  const progress = verifyCleanupProgress(stateInput);
  const expected = cleanupAction(stateInput, context, progress);
  if (!isDeepStrictEqual(actionInput, expected)) fail("STIMPACK_CLEANUP_STALE");
  const state = clone(stateInput);
  const target = state.pieces.find((piece) => piece.id === context.material.piece.id);
  const damageMarkerBefore = Number(target.damageMarker || 0);
  const cleanup = KERNEL.removeAtCleanup({
    statuses: target.statuses,
    markers: state.board.effectMarkers,
  });
  target.statuses = cleanup.statuses;
  state.board.effectMarkers = cleanup.markers;
  if (Number(target.damageMarker || 0) !== damageMarkerBefore) {
    fail("STIMPACK_CLEANUP_DAMAGE_MARKER_MUTATED");
  }
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
    damageMarkerRetained: damageMarkerBefore,
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
    retainedDamageMarker: damageMarkerBefore,
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
    schemaVersion: "starcraft_tmg_official_cleanup_refresh_transition_v4",
    executorId: OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    cleanupResolution: resolution,
    rulesTruth: "official_stimpack_status_removed_and_damage_marker_retained_during_cleanup",
    trainingTruth: false,
  };
}
