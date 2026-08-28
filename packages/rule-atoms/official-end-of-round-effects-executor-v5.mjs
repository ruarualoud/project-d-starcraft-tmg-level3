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
  applyOfficialEndOfRoundEffectsV2,
  enumerateOfficialEndOfRoundEffectsActionsV2,
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION,
} from "./official-end-of-round-effects-executor-v2.mjs";
import {
  OFFICIAL_OPTICAL_FLARE_MARKER_SCHEMA,
  OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA,
  verifyOfficialOpticalFlareMarkerV1,
  verifyOfficialOpticalFlareStatusV1,
} from "./official-characteristic-status-kernel-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS,
} from "./official-optical-flare-lifecycle-executors-v1.mjs";
import {
  OFFICIAL_STIMPACK_MARKER_SCHEMA,
  OFFICIAL_STIMPACK_STATUS_SCHEMA,
  verifyOfficialStimpackMarkerV1,
  verifyOfficialStimpackStatusV1,
} from "./official-marine-stimpack-kernel-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION,
} from "./official-stimpack-lifecycle-executors-v1.mjs";

export const OFFICIAL_END_OF_ROUND_EFFECTS_V5_ACTION_TYPE =
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE;
export const OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID =
  "authority.end-of-round-effects-v5";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION = "5.0.0";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V5_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS =
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ATOM_IDS;

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const CURRENT_DATASET_HASH =
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const PROGRESS_SCHEMA = "starcraft_tmg_scoring_cleanup_progress_v1";
const PROOF_SCHEMA = "starcraft_tmg_official_end_of_round_effect_queue_proof_v5";
const HISTORY_SCHEMA = "starcraft_tmg_official_end_of_round_effect_history_entry_v5";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const SUPPORTED_UNIT_RECORD_KEY = "army_units:marine";
const SUPPORTED_MISSION_RECORD_KEY = "faction_cards:mission_hold_position";
const SUPPORTED_CLEANUP_CARD_KEYS = Object.freeze([
  "tactical_cards:academy",
  "tactical_cards:terran_armed_forces",
]);
const COMPLETED_STEPS = Object.freeze([
  "determine_mission_marker_control",
  "score_victory_points",
  "check_end_game_conditions",
]);
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

function executableAction(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = candidate;
  return action;
}

function statusBranch(state) {
  const schemas = (state?.pieces || []).flatMap((piece) => (
    (piece?.statuses || []).map((status) => status?.schema)
  ));
  if (schemas.some((schema) => schema === OFFICIAL_STIMPACK_STATUS_SCHEMA)) {
    return "stimpack";
  }
  if (schemas.some((schema) => schema === OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA)) {
    return "optical_flare";
  }
  return schemas.length === 0 ? "empty" : "unknown";
}

function atomIdsForBranch(branch) {
  if (branch === "stimpack") return OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS;
  if (branch === "optical_flare") return OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS;
  return OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS;
}

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey) || !state?.players?.[sideKey]) {
    fail("END_OF_ROUND_V5_FIRST_PLAYER_REQUIRED");
  }
  return sideKey;
}

function verifyProgress(state) {
  const progress = state.scoringCleanupProgress;
  if (!object(progress)
    || progress.schemaVersion !== PROGRESS_SCHEMA
    || progress.round !== Number(state.round)
    || progress.currentStep !== OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE
    || !isDeepStrictEqual(progress.completedSteps, COMPLETED_STEPS)
    || !HASH_PATTERN.test(String(progress.controlResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.scoringResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.endGameResolutionHash || ""))) {
    fail("END_OF_ROUND_V5_PROGRESS_INVALID");
  }
  return progress;
}

function verifyCurrentOfficialSource(state, options) {
  const bundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(bundle);
  verifyOfficialCleanupCardBundleV1(bundle.cleanupCardBundle);
  verifyOfficialMissionSetupBindingV1(state.officialMissionSetupBinding, bundle);
  const unitKeys = (bundle.combatProfileBundle?.profiles || [])
    .map((profile) => profile.recordKey).sort();
  const cleanupKeys = bundle.cleanupCardBundle.profiles
    .map((profile) => profile.recordKey).sort();
  if (bundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || bundle.repositoryFallbackAllowed !== false
    || !isDeepStrictEqual(unitKeys, [SUPPORTED_UNIT_RECORD_KEY])
    || bundle.missionScoringProfile?.recordKey !== SUPPORTED_MISSION_RECORD_KEY
    || !isDeepStrictEqual(cleanupKeys, [...SUPPORTED_CLEANUP_CARD_KEYS].sort())
    || !object(options.matchBinding)
    || hashStarcraftTmgContract(bundle) !== options.matchBinding.dataSnapshotHash) {
    fail("END_OF_ROUND_V5_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  if (!Array.isArray(state.pieces)
    || state.pieces.length === 0
    || state.pieces.some((piece) => (
      piece?.officialUnitRecordKey !== SUPPORTED_UNIT_RECORD_KEY
        || !Array.isArray(piece.statuses)
        || !Array.isArray(piece.combatEffects)
    ))) {
    fail("END_OF_ROUND_V5_SOURCE_SCOPE_UNRESOLVED");
  }
  return bundle;
}

function exactPersistentMaterial(state, branch) {
  if (!object(state.board) || !Array.isArray(state.board.effectMarkers)) {
    fail("END_OF_ROUND_V5_STATUS_MATERIAL_INVALID");
  }
  const rows = [];
  for (const piece of state.pieces) {
    for (const status of piece.statuses) {
      if (branch === "optical_flare" && status?.schema === OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA) {
        verifyOfficialOpticalFlareStatusV1(status);
        if (status.targetPieceId !== piece.id || status.roundApplied !== Number(state.round)) {
          fail("END_OF_ROUND_V5_STATUS_BINDING_INVALID");
        }
        const marker = state.board.effectMarkers.find((entry) => (
          entry?.statusEffectHash === status.statusEffectHash
        ));
        verifyOfficialOpticalFlareMarkerV1(marker, status);
        rows.push({ piece, status, marker });
      } else if (branch === "stimpack" && status?.schema === OFFICIAL_STIMPACK_STATUS_SCHEMA) {
        verifyOfficialStimpackStatusV1(status);
        if (status.targetPieceId !== piece.id || status.roundApplied !== Number(state.round)) {
          fail("END_OF_ROUND_V5_STATUS_BINDING_INVALID");
        }
        const marker = state.board.effectMarkers.find((entry) => (
          entry?.statusEffectHash === status.statusEffectHash
        ));
        verifyOfficialStimpackMarkerV1(marker, status);
        rows.push({ piece, status, marker });
      } else {
        fail("END_OF_ROUND_V5_UNKNOWN_OR_MIXED_STATUS");
      }
    }
  }
  const expectedMarkerSchema = branch === "stimpack"
    ? OFFICIAL_STIMPACK_MARKER_SCHEMA
    : OFFICIAL_OPTICAL_FLARE_MARKER_SCHEMA;
  if (rows.length !== 1
    || state.board.effectMarkers.length !== 1
    || state.board.effectMarkers[0]?.schema !== expectedMarkerSchema) {
    fail("END_OF_ROUND_V5_EXACT_STATUS_REQUIRED");
  }
  return rows[0];
}

function verifyCurrentState(state, options) {
  if (!object(state)
    || !object(state.players)
    || !object(state.scores)
    || !Array.isArray(state.pieces)
    || state.phase !== "cleanup"
    || state.gameOver === true
    || state.terminal === true
    || String(state.winner || "")
    || String(state.terminalReason || "")) {
    fail("END_OF_ROUND_V5_STATE_INVALID");
  }
  const round = Number(state.round);
  if (!Number.isSafeInteger(round) || round < 2 || round > 4) {
    fail("END_OF_ROUND_V5_ROUND_UNSUPPORTED");
  }
  const branch = statusBranch(state);
  if (!["optical_flare", "stimpack"].includes(branch)) {
    fail("END_OF_ROUND_V5_STATUS_BRANCH_INVALID", branch);
  }
  const gameplayDataBundle = verifyCurrentOfficialSource(state, options);
  return {
    branch,
    round,
    firstPlayer: firstPlayerSideKey(state),
    progress: verifyProgress(state),
    gameplayDataBundle,
    material: exactPersistentMaterial(state, branch),
  };
}

function effectQueueProof(state, context) {
  const body = {
    schema: PROOF_SCHEMA,
    branch: context.branch,
    round: context.round,
    gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
    sourceSnapshotHash: context.gameplayDataBundle.sourceSnapshotHash,
    normalizedDatasetHash: context.gameplayDataBundle.normalizedDatasetHash,
    missionSetupBindingHash: state.officialMissionSetupBinding.missionSetupBindingHash,
    cleanupCardBundleHash: context.gameplayDataBundle.cleanupCardBundle.cleanupCardBundleHash,
    queueComplete: true,
    entries: [],
    effectCount: 0,
    persistentStatusCount: 1,
    persistentStatusEffectHashes: [context.material.status.statusEffectHash],
    persistentMarkerHashes: [context.material.marker.markerHash],
    persistenceRule: context.branch === "stimpack"
      ? "stimpack_buff_and_precision_persist_until_cleanup"
      : "optical_flare_debuff_persists_until_cleanup",
    damageMarkerBeforeCleanup: Number(context.material.piece.damageMarker || 0),
    damageMarkerRemovalProhibited: true,
    nextStep: "cleanup_and_refresh",
    trainingTruth: false,
  };
  return { ...body, effectQueueProofHash: hashStarcraftTmgContract(body) };
}

function currentStatusAction(state, context) {
  const proof = effectQueueProof(state, context);
  return {
    actionType: OFFICIAL_END_OF_ROUND_EFFECTS_V5_ACTION_TYPE,
    sideKey: context.firstPlayer,
    phase: "cleanup",
    effectQueueProofHash: proof.effectQueueProofHash,
    effectQueueProof: proof,
    ruleAtomIds: [...atomIdsForBranch(context.branch)],
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION,
  };
}

function currentCandidate(candidate) {
  return {
    ...clone(candidate),
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION,
    details: {
      ...clone(candidate.details || {}),
      exactPublicApplyContract: true,
      historicalTransitionExecutor:
        `${OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID}`
        + `@${OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_VERSION}`,
      currentOfficialSourceSnapshotHash: CURRENT_SOURCE_SNAPSHOT_HASH,
      currentOfficialDatasetHash: CURRENT_DATASET_HASH,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, branch, error) {
  return {
    actionType: OFFICIAL_END_OF_ROUND_EFFECTS_V5_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "cleanup",
    effectQueueProofHash: null,
    ruleAtomIds: [...atomIdsForBranch(branch)],
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      exactPublicApplyContract: true,
      rulesTruth: "official_end_of_round_effects_v5_fail_closed",
      trainingTruth: false,
    },
  };
}

function historicalV2Action(action) {
  return {
    ...clone(action),
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION,
  };
}

export function officialEndOfRoundEffectsV5AtomIdsForStateV1(state) {
  return atomIdsForBranch(statusBranch(state));
}

export function enumerateOfficialEndOfRoundEffectsActionsV5(state, options = {}) {
  const branch = statusBranch(state);
  if (branch === "empty") {
    return enumerateOfficialEndOfRoundEffectsActionsV2(state, options).map(currentCandidate);
  }
  const sideKey = String(options.sideKey || "").trim();
  try {
    const context = verifyCurrentState(state, options);
    if (sideKey !== context.firstPlayer) fail("END_OF_ROUND_V5_FIRST_PLAYER_ONLY");
    return [{
      ...currentStatusAction(state, context),
      isEnabled: true,
      disabledReason: "",
      score: context.branch === "stimpack" ? 118 : 117,
      details: {
        branch: context.branch,
        exactPublicApplyContract: true,
        persistentStatusCount: 1,
        removalDeferredToCleanup: true,
        damageMarkerRetained: true,
        currentOfficialSourceSnapshotHash: CURRENT_SOURCE_SNAPSHOT_HASH,
        currentOfficialDatasetHash: CURRENT_DATASET_HASH,
        trainingTruth: false,
      },
    }];
  } catch (error) {
    return options.includeDisabled === true
      ? [disabledAction(state, sideKey, branch, error)]
      : [];
  }
}

export function applyOfficialEndOfRoundEffectsV5(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_END_OF_ROUND_EFFECTS_V5_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION) {
    fail("END_OF_ROUND_V5_ACTION_INVALID");
  }
  const candidate = enumerateOfficialEndOfRoundEffectsActionsV5(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
  })[0];
  if (!candidate) fail("END_OF_ROUND_V5_ACTION_STALE");
  const expected = executableAction(candidate);
  if (!isDeepStrictEqual(actionInput, expected)) {
    fail("END_OF_ROUND_V5_ACTION_MISMATCH");
  }
  const branch = statusBranch(stateInput);
  if (branch === "empty") {
    const delegated = applyOfficialEndOfRoundEffectsV2(
      stateInput,
      historicalV2Action(expected),
      options,
    );
    const result = clone(delegated);
    result.schemaVersion = "starcraft_tmg_official_end_of_round_effects_transition_v5";
    result.executorId = OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID;
    result.executorVersion = OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION;
    result.action = expected;
    const lastLog = result.state.log?.at(-1);
    if (lastLog) lastLog.action = clone(expected);
    result.rulesTruth = "end_of_round_effects_v5_exact_empty_queue";
    result.trainingTruth = false;
    return result;
  }
  const context = verifyCurrentState(stateInput, options);
  const state = clone(stateInput);
  const proof = expected.effectQueueProof;
  const damageMarkerRetained = Number(context.material.piece.damageMarker || 0);
  state.endOfRoundEffectHistory = Array.isArray(state.endOfRoundEffectHistory)
    ? state.endOfRoundEffectHistory
    : [];
  state.endOfRoundEffectHistory.push({
    schema: HISTORY_SCHEMA,
    branch: context.branch,
    round: context.round,
    effectQueueProofHash: proof.effectQueueProofHash,
    effectCount: 0,
    persistentStatusCount: 1,
    persistentStatusEffectHashes: [...proof.persistentStatusEffectHashes],
    persistentMarkerHashes: [...proof.persistentMarkerHashes],
    damageMarkerRetained,
    queueComplete: true,
    trainingTruth: false,
  });
  state.scoringCleanupProgress = {
    ...clone(context.progress),
    completedSteps: [...COMPLETED_STEPS, OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE],
    currentStep: "cleanup_and_refresh",
    effectQueueProofHash: proof.effectQueueProofHash,
    trainingTruth: false,
  };
  const events = [{
    type: "end_of_round_effect_window_resolved",
    branch: context.branch,
    round: context.round,
    persistentStatusEffectHashes: [...proof.persistentStatusEffectHashes],
    persistentMarkerHashes: [...proof.persistentMarkerHashes],
    removalDeferredToCleanup: true,
    damageMarkerRetained,
    nextStep: "cleanup_and_refresh",
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
    schemaVersion: "starcraft_tmg_official_end_of_round_effects_transition_v5",
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    effectQueueProof: proof,
    rulesTruth:
      `official_${context.branch}_persists_through_end_of_round_until_cleanup_v5`,
    trainingTruth: false,
  };
}
