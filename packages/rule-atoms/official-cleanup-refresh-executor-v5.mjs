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
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS,
} from "./official-cleanup-refresh-executor-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
} from "./official-end-of-round-effects-executor-v2.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS,
} from "./official-end-of-round-effects-executor-v5.mjs";
import { OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE } from
  "./official-hold-position-end-game-executor-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS,
} from "./official-optical-flare-lifecycle-executors-v1.mjs";
import {
  createOfficialMarineStimpackKernelV1,
  OFFICIAL_STIMPACK_MARKER_SCHEMA,
  OFFICIAL_STIMPACK_STATUS_SCHEMA,
  verifyOfficialStimpackMarkerV1,
  verifyOfficialStimpackStatusV1,
} from "./official-marine-stimpack-kernel-v1.mjs";
import { OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE } from
  "./official-mission-marker-control-executor-v2.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ATOM_IDS,
} from "./official-stimpack-lifecycle-executors-v1.mjs";
import { OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE } from
  "./official-victory-point-scoring-executor-v1.mjs";

export const OFFICIAL_CLEANUP_REFRESH_V5_ACTION_TYPE =
  OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE;
export const OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID =
  "authority.cleanup-refresh-v5";
export const OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_VERSION = "5.0.0";
export const OFFICIAL_CLEANUP_REFRESH_V5_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ATOM_IDS =
  OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ATOM_IDS;
export const OFFICIAL_CLEANUP_REFRESH_V5_DEPENDENCY_ATOM_IDS =
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS;

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const CURRENT_DATASET_HASH =
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const PROGRESS_SCHEMA = "starcraft_tmg_scoring_cleanup_progress_v1";
const EOR_V2_HISTORY_SCHEMA =
  "starcraft_tmg_official_end_of_round_effect_history_entry_v2";
const EOR_V5_HISTORY_SCHEMA =
  "starcraft_tmg_official_end_of_round_effect_history_entry_v5";
const RESOLUTION_SCHEMA = "starcraft_tmg_official_cleanup_refresh_resolution_v5";
const HISTORY_SCHEMA = "starcraft_tmg_official_cleanup_refresh_history_entry_v5";
const STATUS_CLEANUP_SCHEMA = "starcraft_tmg_official_status_cleanup_receipt_v5";
const REACTION_LEDGER_SCHEMA = "starcraft_tmg_reaction_usage_ledger_v1";
const ACADEMY_LEDGER_SCHEMA = "starcraft_tmg_academy_reaction_usage_ledger_v1";
const SUPPORTED_UNIT_RECORD_KEY = "army_units:marine";
const SUPPORTED_MISSION_RECORD_KEY = "faction_cards:mission_hold_position";
const SUPPORTED_CLEANUP_CARD_KEYS = Object.freeze([
  "tactical_cards:academy",
  "tactical_cards:terran_armed_forces",
]);
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const PHASE_KEYS = Object.freeze(["assault", "combat", "movement"]);
const COMPLETED_BEFORE_CLEANUP = Object.freeze([
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
  OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
  OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
]);
const NEXT_STEP = "determine_initiative";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const OPTICAL_KERNEL = createOfficialCharacteristicStatusKernelV1();
const STIMPACK_KERNEL = createOfficialMarineStimpackKernelV1();

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

function executableAction(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function statusBranch(state) {
  const schemas = (state?.pieces || []).flatMap((piece) => (
    (piece?.statuses || []).map((status) => status?.schema)
  ));
  if (schemas.length === 0) return "empty";
  if (schemas.length === 1 && schemas[0] === OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA) {
    return "optical_flare";
  }
  if (schemas.length === 1 && schemas[0] === OFFICIAL_STIMPACK_STATUS_SCHEMA) {
    return "stimpack";
  }
  return "unknown";
}

function atomIdsForBranch(branch) {
  if (branch === "stimpack") return OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ATOM_IDS;
  if (branch === "optical_flare") return OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS;
  return OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ATOM_IDS;
}

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey) || !state?.players?.[sideKey]) {
    fail("CLEANUP_REFRESH_V5_FIRST_PLAYER_REQUIRED");
  }
  return sideKey;
}

function exactPhaseMap(value, detail) {
  if (!object(value)
    || !isDeepStrictEqual(Object.keys(value).sort(), [...PHASE_KEYS])
    || PHASE_KEYS.some((phase) => typeof value[phase] !== "boolean")) {
    fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", detail);
  }
  return clone(value);
}

function exactPassMap(value, detail) {
  if (!object(value)
    || Object.keys(value).some((phase) => !PHASE_KEYS.includes(phase))
    || Object.values(value).some((passed) => typeof passed !== "boolean")) {
    fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", detail);
  }
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => (
    left.localeCompare(right)
  )));
}

function exactFirstPassMap(value) {
  if (!object(value)
    || Object.keys(value).some((phase) => !PHASE_KEYS.includes(phase))
    || Object.values(value).some((sideKey) => !SIDE_KEYS.includes(sideKey))) {
    fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", "firstPassSideByPhase");
  }
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => (
    left.localeCompare(right)
  )));
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
    fail("CLEANUP_REFRESH_V5_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  return bundle;
}

function verifyProgress(state, branch) {
  const progress = state.scoringCleanupProgress;
  if (!object(progress)
    || progress.schemaVersion !== PROGRESS_SCHEMA
    || progress.round !== Number(state.round)
    || progress.currentStep !== OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE
    || !isDeepStrictEqual(progress.completedSteps, COMPLETED_BEFORE_CLEANUP)
    || !HASH_PATTERN.test(String(progress.controlResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.scoringResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.endGameResolutionHash || ""))
    || !HASH_PATTERN.test(String(progress.effectQueueProofHash || ""))) {
    fail("CLEANUP_REFRESH_V5_PROGRESS_INVALID");
  }
  const history = state.endOfRoundEffectHistory?.at(-1);
  const expectedSchema = branch === "empty" ? EOR_V2_HISTORY_SCHEMA : EOR_V5_HISTORY_SCHEMA;
  if (!object(history)
    || history.schema !== expectedSchema
    || history.round !== Number(state.round)
    || history.effectQueueProofHash !== progress.effectQueueProofHash
    || history.effectCount !== 0
    || history.queueComplete !== true
    || history.trainingTruth !== false) {
    fail("CLEANUP_REFRESH_V5_PROGRESS_INVALID");
  }
  if (branch === "empty" && history.persistentStatusCount !== undefined) {
    fail("CLEANUP_REFRESH_V5_PROGRESS_INVALID");
  }
  if (branch !== "empty" && (
    history.branch !== branch
      || history.persistentStatusCount !== 1
      || !Array.isArray(history.persistentStatusEffectHashes)
      || history.persistentStatusEffectHashes.length !== 1
      || !Array.isArray(history.persistentMarkerHashes)
      || history.persistentMarkerHashes.length !== 1
  )) {
    fail("CLEANUP_REFRESH_V5_PROGRESS_INVALID");
  }
  return progress;
}

function exactStatusMaterial(state, branch) {
  if (!object(state.board)
    || !Array.isArray(state.board.effectMarkers)
    || !Array.isArray(state.board.missionMarkers)
    || !Array.isArray(state.board.tokens)
    || state.board.tokens.length !== 0
    || !Array.isArray(state.board.markers)
    || state.board.markers.length !== 0) {
    fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", "board");
  }
  if (branch === "empty") {
    if (state.board.effectMarkers.length !== 0) {
      fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", "orphan_effect_marker");
    }
    return null;
  }
  const piece = state.pieces.find((entry) => entry.statuses.length === 1);
  const status = piece?.statuses?.[0];
  const marker = state.board.effectMarkers[0];
  if (!piece || state.board.effectMarkers.length !== 1) {
    fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", "status_denominator");
  }
  if (branch === "optical_flare") {
    verifyOfficialOpticalFlareStatusV1(status);
    verifyOfficialOpticalFlareMarkerV1(marker, status);
    if (marker.schema !== OFFICIAL_OPTICAL_FLARE_MARKER_SCHEMA) {
      fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", "optical_marker");
    }
  } else {
    verifyOfficialStimpackStatusV1(status);
    verifyOfficialStimpackMarkerV1(marker, status);
    if (marker.schema !== OFFICIAL_STIMPACK_MARKER_SCHEMA) {
      fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", "stimpack_marker");
    }
  }
  if (status.targetPieceId !== piece.id || status.roundApplied !== Number(state.round)) {
    fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", "status_binding");
  }
  return { pieceId: piece.id, status: clone(status), marker: clone(marker) };
}

function exactCardMaterial(state, bundle) {
  if (!object(state.cardResources)
    || !SIDE_KEYS.every((sideKey) => Array.isArray(state.cardResources[sideKey]))) {
    fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", "cardResources");
  }
  const profileByKey = new Map(bundle.cleanupCardBundle.profiles.map((profile) => [
    profile.recordKey,
    profile,
  ]));
  const ids = new Set();
  const rows = [];
  for (const sideKey of SIDE_KEYS) {
    const recordKeys = new Set();
    for (const card of state.cardResources[sideKey]) {
      const profile = profileByKey.get(card?.officialCardRecordKey);
      const id = String(card?.id || "").trim();
      const expectedFace = card?.readiness === "ready" ? "up"
        : card?.readiness === "exhausted" ? "down" : "";
      if (!object(card)
        || !id
        || ids.has(id)
        || !profile
        || recordKeys.has(profile.recordKey)
        || card.sideKey !== sideKey
        || card.cardKind !== profile.cardKind
        || card.sourceRecordHash !== profile.sourceRecordHash
        || Number(card.resource) !== profile.resource
        || card.face !== expectedFace
        || !isDeepStrictEqual(card.activeEffects || [], [])) {
        fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", id || sideKey);
      }
      ids.add(id);
      recordKeys.add(profile.recordKey);
      rows.push({
        id,
        sideKey,
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

function exactLedger(value, schema, round, detail) {
  if (value === undefined) return { present: false, entryCount: 0 };
  if (!object(value)
    || value.schema !== schema
    || value.round !== round
    || !Array.isArray(value.entries)
    || value.trainingTruth !== false
    || value.ledgerHash !== hashStarcraftTmgContract(without(value, ["ledgerHash"]))) {
    fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", detail);
  }
  return {
    present: true,
    entryCount: value.entries.length,
    ledgerHash: value.ledgerHash,
  };
}

function exactPieceMaterial(state) {
  if (!Array.isArray(state.pieces) || state.pieces.length === 0) {
    fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", "pieces");
  }
  const ids = new Set();
  return state.pieces.map((piece) => {
    const id = String(piece?.id || "").trim();
    if (!object(piece)
      || !id
      || ids.has(id)
      || !SIDE_KEYS.includes(piece.sideKey)
      || piece.officialUnitRecordKey !== SUPPORTED_UNIT_RECORD_KEY
      || !Array.isArray(piece.selectedUpgradeNames)
      || piece.selectedUpgradeNames.length !== 0
      || !Array.isArray(piece.statuses)
      || !Array.isArray(piece.combatEffects)
      || piece.combatEffects.length !== 0
      || !Number.isSafeInteger(Number(piece.damageMarker))
      || Number(piece.damageMarker) < 0) {
      fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", id || "piece");
    }
    ids.add(id);
    return {
      pieceId: id,
      sideKey: piece.sideKey,
      officialUnitRecordKey: piece.officialUnitRecordKey,
      activatedPhases: exactPhaseMap(piece.activatedPhases, id),
      statuses: clone(piece.statuses),
      damageMarker: Number(piece.damageMarker),
      currentModels: Number(piece.currentModels),
      currentSupply: Number(piece.currentSupply),
      isDestroyed: piece.isDestroyed === true,
      isOnField: piece.isOnField === true,
      models: clone(piece.models || []),
    };
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
}

function materialDenominator(state, context) {
  if (state.activeSideKey !== null || state.pendingAttack !== undefined) {
    fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", "active_or_pending");
  }
  const playerPasses = Object.fromEntries(SIDE_KEYS.map((sideKey) => {
    if (!object(state.players?.[sideKey]) || state.players[sideKey].sideKey !== sideKey) {
      fail("CLEANUP_REFRESH_V5_MATERIAL_INVALID", sideKey);
    }
    return [sideKey, exactPassMap(state.players[sideKey].passedPhases, sideKey)];
  }));
  return {
    pieces: exactPieceMaterial(state),
    cards: exactCardMaterial(state, context.gameplayDataBundle),
    status: exactStatusMaterial(state, context.branch),
    reactionUsage: exactLedger(
      state.reactionUsage,
      REACTION_LEDGER_SCHEMA,
      context.round,
      "reactionUsage",
    ),
    academyReactionUsage: exactLedger(
      state.academyReactionUsage,
      ACADEMY_LEDGER_SCHEMA,
      context.round,
      "academyReactionUsage",
    ),
    playerPasses,
    firstPassSideByPhase: exactFirstPassMap(state.firstPassSideByPhase || {}),
    missionMarkers: clone(state.board.missionMarkers),
    tokens: clone(state.board.tokens),
    markers: clone(state.board.markers),
  };
}

function statusCleanupReceipt(state, context, material) {
  let kernelReceipt = null;
  if (context.branch === "optical_flare") {
    kernelReceipt = OPTICAL_KERNEL.removeAtCleanup({
      statuses: material.status ? [material.status.status] : [],
      markers: state.board.effectMarkers,
    }).receipt;
  } else if (context.branch === "stimpack") {
    kernelReceipt = STIMPACK_KERNEL.removeAtCleanup({
      statuses: material.status ? [material.status.status] : [],
      markers: state.board.effectMarkers,
    }).receipt;
  }
  const body = {
    schema: STATUS_CLEANUP_SCHEMA,
    branch: context.branch,
    removedStatusEffectHashes: kernelReceipt?.removedStatusEffectHashes || [],
    removedMarkerHashes: kernelReceipt?.removedMarkerHashes || [],
    kernelCleanupHash: kernelReceipt?.cleanupHash || null,
    retainedStatusCount: 0,
    retainedMarkerCount: 0,
    damageMarkerPolicy: "retain_non_lethal_and_other_damage_markers",
    cleanupStep: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    trainingTruth: false,
  };
  return { ...body, statusCleanupHash: hashStarcraftTmgContract(body) };
}

function cleanupResolution(state, context, material) {
  const statusCleanup = statusCleanupReceipt(state, context, material);
  const retainedMaterial = {
    scores: clone(state.scores),
    missionMarkers: clone(state.board.missionMarkers),
    tokens: clone(state.board.tokens),
    markers: clone(state.board.markers),
    pieceState: material.pieces.map((piece) => ({
      pieceId: piece.pieceId,
      sideKey: piece.sideKey,
      currentModels: piece.currentModels,
      currentSupply: piece.currentSupply,
      damageMarker: piece.damageMarker,
      isDestroyed: piece.isDestroyed,
      isOnField: piece.isOnField,
      models: clone(piece.models),
    })),
    phaseFirstActorByRound: clone(state.phaseFirstActorByRound || {}),
  };
  const body = {
    schema: RESOLUTION_SCHEMA,
    branch: context.branch,
    round: context.round,
    gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
    sourceSnapshotHash: context.gameplayDataBundle.sourceSnapshotHash,
    normalizedDatasetHash: context.gameplayDataBundle.normalizedDatasetHash,
    cleanupCardBundleHash:
      context.gameplayDataBundle.cleanupCardBundle.cleanupCardBundleHash,
    missionSetupBindingHash: state.officialMissionSetupBinding.missionSetupBindingHash,
    effectQueueProofHash: context.progress.effectQueueProofHash,
    preCleanupMaterialHash: hashStarcraftTmgContract(material),
    retainedMaterialHash: hashStarcraftTmgContract(retainedMaterial),
    statusCleanup,
    removalDenominator: {
      activationMarkerPieceIds: material.pieces.map((piece) => piece.pieceId),
      playerPassSideKeys: [...SIDE_KEYS],
      reactionUsageEntryCount: material.reactionUsage.entryCount,
      academyReactionUsageEntryCount: material.academyReactionUsage.entryCount,
      statusCount: statusCleanup.removedStatusEffectHashes.length,
      effectMarkerCount: statusCleanup.removedMarkerHashes.length,
      genericTokenCount: 0,
      genericMarkerCount: 0,
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
    rulesTruth: `official_cleanup_refresh_${context.branch}_v5`,
    trainingTruth: false,
  };
  return { ...body, cleanupResolutionHash: hashStarcraftTmgContract(body) };
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
    fail("CLEANUP_REFRESH_V5_STATE_INVALID");
  }
  const round = Number(state.round);
  if (!Number.isSafeInteger(round) || round < 2 || round > 4) {
    fail("CLEANUP_REFRESH_V5_ROUND_UNSUPPORTED");
  }
  const branch = statusBranch(state);
  if (!["empty", "optical_flare", "stimpack"].includes(branch)) {
    fail("CLEANUP_REFRESH_V5_STATUS_BRANCH_INVALID", branch);
  }
  const gameplayDataBundle = verifyCurrentOfficialSource(state, options);
  const progress = verifyProgress(state, branch);
  const context = {
    branch,
    round,
    firstPlayer: firstPlayerSideKey(state),
    gameplayDataBundle,
    progress,
  };
  const material = materialDenominator(state, context);
  return {
    ...context,
    material,
    cleanupResolution: cleanupResolution(state, context, material),
  };
}

function action(context) {
  return {
    actionType: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    sideKey: context.firstPlayer,
    phase: "cleanup",
    cleanupResolutionHash: context.cleanupResolution.cleanupResolutionHash,
    cleanupResolution: clone(context.cleanupResolution),
    ruleAtomIds: [...atomIdsForBranch(context.branch)],
    executorId: OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_VERSION,
  };
}

function disabledAction(state, sideKey, branch, error) {
  return {
    actionType: OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "cleanup",
    cleanupResolutionHash: null,
    ruleAtomIds: [...atomIdsForBranch(branch)],
    executorId: OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      exactPublicApplyContract: true,
      rulesTruth: "official_cleanup_refresh_v5_fail_closed",
      trainingTruth: false,
    },
  };
}

export function officialCleanupRefreshV5AtomIdsForStateV1(state) {
  return atomIdsForBranch(statusBranch(state));
}

export function enumerateOfficialCleanupRefreshActionsV5(state, options = {}) {
  const branch = statusBranch(state);
  const sideKey = String(options.sideKey || "").trim();
  try {
    const context = verifyCurrentState(state, options);
    if (sideKey !== context.firstPlayer) fail("CLEANUP_REFRESH_V5_FIRST_PLAYER_ONLY");
    return [{
      ...action(context),
      isEnabled: true,
      disabledReason: "",
      score: context.branch === "stimpack" ? 123
        : context.branch === "optical_flare" ? 122 : 121,
      details: {
        branch: context.branch,
        exactPublicApplyContract: true,
        refreshedCardCount: context.cleanupResolution.cardRefreshes.filter((card) => (
          card.beforeReadiness === "exhausted"
        )).length,
        removedStatusCount:
          context.cleanupResolution.statusCleanup.removedStatusEffectHashes.length,
        retainedDamageMarkers: true,
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

export function applyOfficialCleanupRefreshV5(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_VERSION) {
    fail("CLEANUP_REFRESH_V5_ACTION_INVALID");
  }
  const candidate = enumerateOfficialCleanupRefreshActionsV5(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
  })[0];
  if (!candidate) fail("CLEANUP_REFRESH_V5_ACTION_STALE");
  const expected = executableAction(candidate);
  if (!isDeepStrictEqual(actionInput, expected)) {
    fail("CLEANUP_REFRESH_V5_ACTION_MISMATCH");
  }
  const context = verifyCurrentState(stateInput, options);
  const state = clone(stateInput);
  const resolution = expected.cleanupResolution;
  if (context.branch !== "empty") {
    const target = state.pieces.find((piece) => piece.id === context.material.status.pieceId);
    const damageMarkerBefore = Number(target.damageMarker || 0);
    const kernel = context.branch === "stimpack" ? STIMPACK_KERNEL : OPTICAL_KERNEL;
    const cleanup = kernel.removeAtCleanup({
      statuses: target.statuses,
      markers: state.board.effectMarkers,
    });
    target.statuses = cleanup.statuses;
    state.board.effectMarkers = cleanup.markers;
    if (Number(target.damageMarker || 0) !== damageMarkerBefore) {
      fail("CLEANUP_REFRESH_V5_DAMAGE_MARKER_MUTATED");
    }
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
  delete state.reactionUsage;
  delete state.academyReactionUsage;
  const refreshedCardCount = resolution.cardRefreshes.filter((card) => (
    card.beforeReadiness === "exhausted"
  )).length;
  const historyEntry = {
    schema: HISTORY_SCHEMA,
    branch: context.branch,
    round: context.round,
    cleanupResolutionHash: resolution.cleanupResolutionHash,
    preCleanupMaterialHash: resolution.preCleanupMaterialHash,
    retainedMaterialHash: resolution.retainedMaterialHash,
    statusCleanupHash: resolution.statusCleanup.statusCleanupHash,
    removedStatusEffectHashes: [
      ...resolution.statusCleanup.removedStatusEffectHashes,
    ],
    removedMarkerHashes: [...resolution.statusCleanup.removedMarkerHashes],
    refreshedCardCount,
    resetActivationPieceCount:
      resolution.removalDenominator.activationMarkerPieceIds.length,
    clearedReactionUsageEntryCount:
      resolution.removalDenominator.reactionUsageEntryCount,
    clearedAcademyReactionUsageEntryCount:
      resolution.removalDenominator.academyReactionUsageEntryCount,
    damageMarkersRetained: true,
    trainingTruth: false,
  };
  state.cleanupRefreshHistory = Array.isArray(state.cleanupRefreshHistory)
    ? state.cleanupRefreshHistory
    : [];
  state.cleanupRefreshHistory.push(historyEntry);
  state.scoringCleanupProgress = {
    ...clone(context.progress),
    completedSteps: [...COMPLETED_BEFORE_CLEANUP, OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE],
    currentStep: NEXT_STEP,
    cleanupResolutionHash: resolution.cleanupResolutionHash,
    trainingTruth: false,
  };
  const events = [{
    type: "cleanup_refresh_completed",
    branch: context.branch,
    round: context.round,
    cleanupResolutionHash: resolution.cleanupResolutionHash,
    removedStatusEffectHashes: [...historyEntry.removedStatusEffectHashes],
    removedMarkerHashes: [...historyEntry.removedMarkerHashes],
    refreshedCardCount,
    resetActivationPieceCount: historyEntry.resetActivationPieceCount,
    damageMarkersRetained: true,
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
    schemaVersion: "starcraft_tmg_official_cleanup_refresh_transition_v5",
    executorId: OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    cleanupResolution: resolution,
    rulesTruth: `official_cleanup_refresh_${context.branch}_v5`,
    trainingTruth: false,
  };
}
