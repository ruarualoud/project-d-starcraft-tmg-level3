import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  applyOfficialStartOfRoundV1,
  enumerateOfficialStartOfRoundActionsV1,
  OFFICIAL_START_OF_ROUND_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION,
  OFFICIAL_START_OF_ROUND_TRANSITION_SCHEMA,
} from "./official-start-of-round-executor-v1.mjs";

export const OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE =
  OFFICIAL_START_OF_ROUND_ACTION_TYPE;
export const OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID =
  "authority.start-of-round-v2";
export const OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_START_OF_ROUND_V2_TRANSITION_SCHEMA =
  OFFICIAL_START_OF_ROUND_TRANSITION_SCHEMA;
export const OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS;

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const CURRENT_DATASET_HASH =
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const CURRENT_CLEANUP_HISTORY_SCHEMA =
  "starcraft_tmg_official_cleanup_refresh_history_entry_v5";
const INITIATIVE_HISTORY_SCHEMA =
  "starcraft_tmg_official_determine_initiative_history_entry_v1";
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

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function executableAction(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function safeInteger(value, minimum = 0) {
  return Number.isSafeInteger(Number(value)) && Number(value) >= minimum;
}

function validSideKey(value, state) {
  return SIDE_KEYS.includes(value) && object(state?.players?.[value]);
}

function verifyCurrentOfficialBinding(state, options) {
  const bundle = state?.officialGameplayDataBundle;
  try {
    verifyOfficialGameplayDataBundleV1(bundle);
  } catch {
    fail("START_OF_ROUND_V2_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  if (bundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || bundle.repositoryFallbackAllowed !== false
    || !object(options.matchBinding)
    || hashStarcraftTmgContract(bundle) !== options.matchBinding.dataSnapshotHash) {
    fail("START_OF_ROUND_V2_LATEST_OFFICIAL_DATA_REQUIRED");
  }
}

function verifyCurrentCleanupPrefix(state) {
  const history = Array.isArray(state?.cleanupRefreshHistory)
    ? state.cleanupRefreshHistory.at(-1)
    : null;
  if (!object(history)
    || history.schema !== CURRENT_CLEANUP_HISTORY_SCHEMA
    || history.round !== Number(state.round) - 1
    || !["empty", "optical_flare", "stimpack"].includes(history.branch)
    || !HASH_PATTERN.test(String(history.cleanupResolutionHash || ""))
    || !HASH_PATTERN.test(String(history.preCleanupMaterialHash || ""))
    || !HASH_PATTERN.test(String(history.retainedMaterialHash || ""))
    || !HASH_PATTERN.test(String(history.statusCleanupHash || ""))
    || !Array.isArray(history.removedStatusEffectHashes)
    || !Array.isArray(history.removedMarkerHashes)
    || history.removedStatusEffectHashes.some((hash) => !HASH_PATTERN.test(String(hash)))
    || history.removedMarkerHashes.some((hash) => !HASH_PATTERN.test(String(hash)))
    || !safeInteger(history.refreshedCardCount)
    || !safeInteger(history.resetActivationPieceCount)
    || !safeInteger(history.clearedReactionUsageEntryCount)
    || !safeInteger(history.clearedAcademyReactionUsageEntryCount)
    || history.damageMarkersRetained !== true
    || history.trainingTruth !== false) {
    fail("START_OF_ROUND_V2_CLEANUP_HISTORY_INVALID");
  }
  return history;
}

function validRolls(values) {
  return Array.isArray(values)
    && values.length === 2
    && values.every((value) => safeInteger(value, 1) && Number(value) <= 6);
}

function verifyRollOff(history, state) {
  const rollOff = history.rollOff;
  if (!object(rollOff)
    || !safeInteger(rollOff.attempt, 1)
    || !validRolls(rollOff.player1Rolls)
    || !validRolls(rollOff.player2Rolls)
    || rollOff.player1Total !== rollOff.player1Rolls.reduce((sum, roll) => sum + roll, 0)
    || rollOff.player2Total !== rollOff.player2Rolls.reduce((sum, roll) => sum + roll, 0)
    || rollOff.player1Total === rollOff.player2Total
    || rollOff.result !== "winner"
    || !validSideKey(rollOff.winnerSideKey, state)
    || rollOff.winnerSideKey !== history.nextFirstPlayerSideKey
    || rollOff.winnerSideKey !== (rollOff.player1Total > rollOff.player2Total
      ? "player1"
      : "player2")
    || rollOff.trainingTruth !== false) {
    fail("START_OF_ROUND_V2_INITIATIVE_HISTORY_INVALID");
  }
  const lastRollOff = Array.isArray(state.initiativeRollOffHistory)
    ? state.initiativeRollOffHistory.at(-1)
    : null;
  if (!isDeepStrictEqual(lastRollOff, rollOff)) {
    fail("START_OF_ROUND_V2_INITIATIVE_HISTORY_INVALID");
  }
}

function verifyCurrentInitiativeHistory(state) {
  const history = Array.isArray(state?.determineInitiativeHistory)
    ? state.determineInitiativeHistory.at(-1)
    : null;
  const scores = {
    player1: Number(state?.scores?.player1),
    player2: Number(state?.scores?.player2),
  };
  if (!object(history)
    || history.schema !== INITIATIVE_HISTORY_SCHEMA
    || history.round !== Number(state.round) - 1
    || history.nextRound !== Number(state.round)
    || !validSideKey(history.previousFirstPlayerSideKey, state)
    || !validSideKey(history.nextFirstPlayerSideKey, state)
    || history.nextFirstPlayerSideKey !== state.firstPlayerSideKey
    || !safeInteger(scores.player1)
    || !safeInteger(scores.player2)
    || !isDeepStrictEqual(history.scores, scores)
    || !["trailing_player", "tied_vp_roll_off"].includes(history.initiativeMode)
    || !HASH_PATTERN.test(String(history.initiativeResolutionHash || ""))
    || history.trainingTruth !== false) {
    fail("START_OF_ROUND_V2_INITIATIVE_HISTORY_INVALID");
  }
  if (history.initiativeMode === "trailing_player") {
    const lowerSideKey = scores.player1 < scores.player2 ? "player1"
      : scores.player2 < scores.player1 ? "player2" : null;
    if (!lowerSideKey
      || history.nextFirstPlayerSideKey !== lowerSideKey
      || history.rollOff !== null) {
      fail("START_OF_ROUND_V2_INITIATIVE_HISTORY_INVALID");
    }
  } else {
    if (scores.player1 !== scores.player2) {
      fail("START_OF_ROUND_V2_INITIATIVE_HISTORY_INVALID");
    }
    verifyRollOff(history, state);
  }
  return history;
}

function verifyCurrentPrefix(state, options) {
  verifyCurrentOfficialBinding(state, options);
  verifyCurrentCleanupPrefix(state);
  verifyCurrentInitiativeHistory(state);
}

function currentCandidate(legacyCandidate) {
  return {
    ...clone(legacyCandidate),
    executorId: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION,
    details: {
      ...clone(legacyCandidate.details || {}),
      currentCleanupHistorySchema: CURRENT_CLEANUP_HISTORY_SCHEMA,
      currentInitiativeHistorySchema: INITIATIVE_HISTORY_SCHEMA,
      frozenSemanticKernel:
        `${OFFICIAL_START_OF_ROUND_EXECUTOR_ID}@${OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION}`,
      validatedAdapter: "strict_current_initiative_v2_handoff_to_frozen_v1_semantics",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, error) {
  return {
    actionType: OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "start_of_round",
    startOfRoundResolutionHash: null,
    ruleAtomIds: [...OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_start_of_round_v2_fail_closed",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialStartOfRoundActionsV2(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  try {
    verifyCurrentPrefix(state, options);
    const candidates = enumerateOfficialStartOfRoundActionsV1(state, {
      ...options,
      includeDisabled: true,
      sideKey,
    });
    if (candidates.length !== 1) {
      fail("START_OF_ROUND_V2_FROZEN_SEMANTICS_REJECTED");
    }
    if (candidates[0].isEnabled !== true) {
      fail(candidates[0].disabledReason || "START_OF_ROUND_V2_FROZEN_SEMANTICS_REJECTED");
    }
    return [currentCandidate(candidates[0])];
  } catch (error) {
    return options.includeDisabled === true
      ? [disabledAction(state, sideKey, error)]
      : [];
  }
}

export function applyOfficialStartOfRoundV2(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION) {
    fail("START_OF_ROUND_V2_ACTION_INVALID");
  }
  const candidates = enumerateOfficialStartOfRoundActionsV2(stateInput, {
    ...options,
    includeDisabled: false,
    sideKey: String(actionInput.sideKey || ""),
  });
  if (candidates.length !== 1
    || !isDeepStrictEqual(actionInput, executableAction(candidates[0]))) {
    fail("START_OF_ROUND_V2_ACTION_MISMATCH");
  }
  verifyCurrentPrefix(stateInput, options);
  const legacyAction = {
    ...clone(actionInput),
    executorId: OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION,
  };
  const legacy = applyOfficialStartOfRoundV1(stateInput, legacyAction, options);
  const state = clone(legacy.state);
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  return {
    ...legacy,
    schemaVersion: "starcraft_tmg_official_start_of_round_transition_v2",
    executorId: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION,
    state,
    action: clone(actionInput),
    rulesTruth: "official_current_initiative_v2_start_of_round_exact_subset_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
