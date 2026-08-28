import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialCleanupCardBundleV1 } from "../source-data/official-cleanup-card-bundle-v1.mjs";
import { verifyOfficialMissionSetupBindingV1 } from "../source-data/official-mission-setup-binding-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE as V1_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_DEPENDENCY_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_NEW_ATOM_IDS,
} from "./official-end-of-round-effects-executor-v1.mjs";
import { OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE } from "./official-hold-position-end-game-executor-v1.mjs";
import { OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE } from "./official-mission-marker-control-executor-v2.mjs";
import { OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE } from "./official-victory-point-scoring-executor-v1.mjs";

export const OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE = V1_ACTION_TYPE;
export const OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID =
  "authority.end-of-round-effects-v2";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS =
  OFFICIAL_END_OF_ROUND_EFFECTS_NEW_ATOM_IDS;
export { OFFICIAL_END_OF_ROUND_EFFECTS_DEPENDENCY_ATOM_IDS };

const PROGRESS_SCHEMA = "starcraft_tmg_scoring_cleanup_progress_v1";
const PROOF_SCHEMA = "starcraft_tmg_official_end_of_round_effect_queue_proof_v2";
const HISTORY_SCHEMA = "starcraft_tmg_official_end_of_round_effect_history_entry_v2";
const NEXT_STEP = "cleanup_and_refresh";
const SUPPORTED_UNIT_RECORD_KEY = "army_units:marine";
const SUPPORTED_UNIT_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const SUPPORTED_MISSION_RECORD_KEY = "faction_cards:mission_hold_position";
const SUPPORTED_MISSION_SOURCE_RECORD_HASH =
  "70c391e589555f7b124a381572ad4b1272cb22b6fbcc6c140171e68ea1f18cfa";
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

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey) || !state?.players?.[sideKey]) {
    fail("END_OF_ROUND_EFFECTS_FIRST_PLAYER_REQUIRED");
  }
  return sideKey;
}

function verifyProgress(state) {
  const progress = state?.scoringCleanupProgress;
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
    fail("END_OF_ROUND_EFFECTS_PROGRESS_INVALID");
  }
  return progress;
}

function supportedCardSources(state, cleanupCardBundle) {
  verifyOfficialCleanupCardBundleV1(cleanupCardBundle);
  const profileByKey = new Map(cleanupCardBundle.profiles.map((profile) => [
    profile.recordKey,
    profile,
  ]));
  if (!object(state.cardResources)
    || !SIDE_KEYS.every((sideKey) => Array.isArray(state.cardResources[sideKey]))) {
    fail("END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED");
  }
  const material = [];
  const globalIds = new Set();
  for (const sideKey of SIDE_KEYS) {
    const seenRecordKeys = new Set();
    for (const card of state.cardResources[sideKey]) {
      const id = String(card?.id || "").trim();
      const profile = profileByKey.get(card?.officialCardRecordKey);
      const expectedFace = card?.readiness === "ready" ? "up"
        : card?.readiness === "exhausted" ? "down" : "";
      if (!object(card)
        || !id
        || globalIds.has(id)
        || !profile
        || seenRecordKeys.has(profile.recordKey)
        || card.sideKey !== sideKey
        || card.cardKind !== profile.cardKind
        || card.sourceRecordHash !== profile.sourceRecordHash
        || card.face !== expectedFace
        || !Array.isArray(card.activeEffects)
        || card.activeEffects.length !== 0
        || !Array.isArray(profile.endOfRoundEffects)
        || profile.endOfRoundEffects.length !== 0) {
        fail("END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED", id || sideKey);
      }
      globalIds.add(id);
      seenRecordKeys.add(profile.recordKey);
      material.push({
        id,
        sideKey,
        cardKind: card.cardKind,
        officialCardRecordKey: profile.recordKey,
        sourceRecordHash: profile.sourceRecordHash,
        readiness: card.readiness,
        face: card.face,
        activeEffects: [],
        endOfRoundEffects: [],
      });
    }
  }
  return material.sort((left, right) => left.id.localeCompare(right.id));
}

function supportedOfficialSources(state, gameplayDataBundle) {
  const profileBundle = gameplayDataBundle.combatProfileBundle;
  const profiles = profileBundle?.profiles;
  const mission = gameplayDataBundle.missionScoringProfile;
  if (!Array.isArray(profiles)
    || profiles.length !== 1
    || profiles[0]?.recordKey !== SUPPORTED_UNIT_RECORD_KEY
    || profiles[0]?.sourceRecordHash !== SUPPORTED_UNIT_SOURCE_RECORD_HASH
    || profiles[0]?.unitId !== "marine"
    || mission?.recordKey !== SUPPORTED_MISSION_RECORD_KEY
    || mission?.sourceRecordHash !== SUPPORTED_MISSION_SOURCE_RECORD_HASH
    || !object(gameplayDataBundle.cleanupCardBundle)) {
    fail("END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED");
  }
  if (!object(state.board)
    || !Array.isArray(state.board.effectMarkers)
    || state.board.effectMarkers.length !== 0) {
    fail("END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED");
  }
  const pieceMaterial = [];
  for (const piece of state.pieces) {
    if (!object(piece)
      || !SIDE_KEYS.includes(piece.sideKey)
      || piece.officialUnitRecordKey !== SUPPORTED_UNIT_RECORD_KEY
      || !Array.isArray(piece.selectedUpgradeNames)
      || piece.selectedUpgradeNames.length !== 0
      || !Array.isArray(piece.statuses)
      || piece.statuses.length !== 0
      || !Array.isArray(piece.combatEffects)
      || piece.combatEffects.length !== 0) {
      fail("END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED", String(piece?.id || "piece"));
    }
    pieceMaterial.push({
      pieceId: String(piece.id || ""),
      sideKey: piece.sideKey,
      officialUnitRecordKey: piece.officialUnitRecordKey,
      selectedUpgradeNames: [],
      statuses: [],
      combatEffects: [],
    });
  }
  if (pieceMaterial.length === 0
    || new Set(pieceMaterial.map((row) => row.pieceId)).size !== pieceMaterial.length
    || pieceMaterial.some((row) => !row.pieceId)) {
    fail("END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED");
  }
  return {
    pieceMaterial: pieceMaterial.sort((left, right) => left.pieceId.localeCompare(right.pieceId)),
    cardMaterial: supportedCardSources(state, gameplayDataBundle.cleanupCardBundle),
  };
}

function effectQueueProof(state, context) {
  const sourceMaterial = supportedOfficialSources(state, context.gameplayDataBundle);
  const cardProfiles = context.gameplayDataBundle.cleanupCardBundle.profiles;
  const body = {
    schema: PROOF_SCHEMA,
    round: context.round,
    gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
    missionScoringProfileHash:
      context.gameplayDataBundle.missionScoringProfile.missionScoringProfileHash,
    cleanupCardBundleHash:
      context.gameplayDataBundle.cleanupCardBundle.cleanupCardBundleHash,
    missionSetupBindingHash: state.officialMissionSetupBinding.missionSetupBindingHash,
    sourceRecords: [
      {
        recordKey: SUPPORTED_UNIT_RECORD_KEY,
        sourceRecordHash: SUPPORTED_UNIT_SOURCE_RECORD_HASH,
        activeSourceScope: "base_profile_with_no_selected_upgrades",
      },
      {
        recordKey: SUPPORTED_MISSION_RECORD_KEY,
        sourceRecordHash: SUPPORTED_MISSION_SOURCE_RECORD_HASH,
        activeSourceScope: "mission_text",
      },
      ...cardProfiles.map((profile) => ({
        recordKey: profile.recordKey,
        sourceRecordHash: profile.sourceRecordHash,
        activeSourceScope: "exact_card_profile_with_no_end_of_round_trigger",
      })),
    ],
    cardSourceMaterial: clone(sourceMaterial.cardMaterial),
    stateSourceMaterialHash: hashStarcraftTmgContract({
      pieces: sourceMaterial.pieceMaterial,
      cardResources: sourceMaterial.cardMaterial,
      effectMarkers: [],
    }),
    sourceCoverage: {
      unitBaseProfilesComplete: true,
      selectedUpgradeSourcesComplete: true,
      cardSourcesComplete: true,
      statusAndCombatEffectSourcesComplete: true,
      effectMarkerSourcesComplete: true,
    },
    queueComplete: true,
    entries: [],
    effectCount: 0,
    emptyReason: "supported_official_sources_have_no_active_end_of_round_effects",
    excludedRuleAtomIds: ["rule-atom:end-of-round-effect-resolution-order"],
    rulesTruth:
      "official_current_hold_position_unupgraded_marine_exact_cleanup_cards_empty_eor_queue_only",
    trainingTruth: false,
  };
  return {
    ...body,
    effectQueueProofHash: hashStarcraftTmgContract(body),
  };
}

function validateState(state, options) {
  if (!object(state)
    || !object(state.players)
    || !object(state.scores)
    || !Array.isArray(state.pieces)) {
    fail("END_OF_ROUND_EFFECTS_STATE_INVALID");
  }
  if (state.phase !== "cleanup") fail("END_OF_ROUND_EFFECTS_WRONG_PHASE");
  if (state.gameOver === true
    || state.terminal === true
    || String(state.winner || "")
    || String(state.terminalReason || "")) {
    fail("END_OF_ROUND_EFFECTS_TERMINAL_STATE");
  }
  const round = Number(state.round);
  if (!Number.isSafeInteger(round) || round < 2 || round > 4) {
    fail("END_OF_ROUND_EFFECTS_ROUND_UNSUPPORTED");
  }
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  verifyOfficialMissionSetupBindingV1(
    state.officialMissionSetupBinding,
    gameplayDataBundle,
  );
  if (!object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== options.matchBinding.dataSnapshotHash) {
    fail("END_OF_ROUND_EFFECTS_DATA_SNAPSHOT_MISMATCH");
  }
  const firstPlayer = firstPlayerSideKey(state);
  const progress = verifyProgress(state);
  const context = { round, firstPlayer, gameplayDataBundle, progress };
  return { ...context, effectQueueProof: effectQueueProof(state, context) };
}

function action(context) {
  return {
    actionType: OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
    sideKey: context.firstPlayer,
    phase: "cleanup",
    effectQueueProofHash: context.effectQueueProof.effectQueueProofHash,
    effectQueueProof: clone(context.effectQueueProof),
    ruleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS],
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION,
    details: {
      sourceRule: "official_core_8_9_4_and_12_6",
      effectCount: 0,
      queueComplete: true,
      exactCardCount: context.effectQueueProof.cardSourceMaterial.length,
      nextStep: NEXT_STEP,
      rulesTruth: context.effectQueueProof.rulesTruth,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, error) {
  return {
    actionType: OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "cleanup",
    effectQueueProofHash: null,
    ruleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS],
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_end_of_round_effects_v2_fail_closed",
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialEndOfRoundEffectsActionsV2(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  let context;
  try {
    context = validateState(state, options);
    if (sideKey !== context.firstPlayer) fail("END_OF_ROUND_EFFECTS_FIRST_PLAYER_ONLY");
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

export function applyOfficialEndOfRoundEffectsV2(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION) {
    fail("END_OF_ROUND_EFFECTS_ACTION_INVALID");
  }
  const context = validateState(stateInput, options);
  if (String(actionInput.sideKey || "") !== context.firstPlayer) {
    fail("END_OF_ROUND_EFFECTS_FIRST_PLAYER_ONLY");
  }
  if (actionInput.effectQueueProofHash !== context.effectQueueProof.effectQueueProofHash
    || !isDeepStrictEqual(actionInput.effectQueueProof, context.effectQueueProof)) {
    fail("END_OF_ROUND_EFFECTS_PROOF_STALE");
  }
  const resolvedAction = action(context);
  const state = clone(stateInput);
  const historyEntry = {
    schema: HISTORY_SCHEMA,
    round: context.round,
    effectQueueProofHash: context.effectQueueProof.effectQueueProofHash,
    effectCount: 0,
    exactCardCount: context.effectQueueProof.cardSourceMaterial.length,
    queueComplete: true,
    trainingTruth: false,
  };
  state.endOfRoundEffectHistory = Array.isArray(state.endOfRoundEffectHistory)
    ? state.endOfRoundEffectHistory
    : [];
  state.endOfRoundEffectHistory.push(historyEntry);
  state.scoringCleanupProgress = {
    ...clone(context.progress),
    completedSteps: [
      OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
      OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
      OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
      OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
    ],
    currentStep: NEXT_STEP,
    effectQueueProofHash: context.effectQueueProof.effectQueueProofHash,
    trainingTruth: false,
  };
  const events = [{
    type: "end_of_round_effect_window_resolved",
    round: context.round,
    initiatingSideKey: context.firstPlayer,
    effectQueueProofHash: context.effectQueueProof.effectQueueProofHash,
    effectCount: 0,
    exactCardCount: context.effectQueueProof.cardSourceMaterial.length,
    queueComplete: true,
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
    schemaVersion: "starcraft_tmg_official_end_of_round_effects_transition_v2",
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: resolvedAction,
    effectQueueProof: context.effectQueueProof,
    rulesTruth: context.effectQueueProof.rulesTruth,
    trainingTruth: false,
  };
}
