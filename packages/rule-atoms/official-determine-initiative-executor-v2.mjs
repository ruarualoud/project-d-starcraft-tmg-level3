import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  applyOfficialDetermineInitiativeV1,
  enumerateOfficialDetermineInitiativeActionsV1,
  officialDetermineInitiativeAtomIdsForStateV1,
  OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE,
  OFFICIAL_DETERMINE_INITIATIVE_DETERMINISTIC_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION,
  OFFICIAL_DETERMINE_INITIATIVE_ROLL_OFF_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_TRANSITION_SCHEMA,
} from "./official-determine-initiative-executor-v1.mjs";

export const OFFICIAL_DETERMINE_INITIATIVE_V2_ACTION_TYPE =
  OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE;
export const OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID =
  "authority.determine-initiative-v2";
export const OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_DETERMINE_INITIATIVE_V2_TRANSITION_SCHEMA =
  OFFICIAL_DETERMINE_INITIATIVE_TRANSITION_SCHEMA;
export const OFFICIAL_DETERMINE_INITIATIVE_V2_DETERMINISTIC_ATOM_IDS =
  OFFICIAL_DETERMINE_INITIATIVE_DETERMINISTIC_ATOM_IDS;
export const OFFICIAL_DETERMINE_INITIATIVE_V2_ROLL_OFF_ATOM_IDS =
  OFFICIAL_DETERMINE_INITIATIVE_ROLL_OFF_ATOM_IDS;
export const OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ATOM_IDS;

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const CURRENT_DATASET_HASH =
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const CURRENT_CLEANUP_HISTORY_SCHEMA =
  "starcraft_tmg_official_cleanup_refresh_history_entry_v5";
const LEGACY_CLEANUP_HISTORY_SCHEMA =
  "starcraft_tmg_official_cleanup_refresh_history_entry_v1";
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

function nonNegativeInteger(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) >= 0;
}

function verifyCurrentOfficialBinding(state, options) {
  const bundle = state?.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(bundle);
  if (bundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || bundle.repositoryFallbackAllowed !== false
    || !object(options.matchBinding)
    || hashStarcraftTmgContract(bundle) !== options.matchBinding.dataSnapshotHash) {
    fail("DETERMINE_INITIATIVE_V2_LATEST_OFFICIAL_DATA_REQUIRED");
  }
}

function verifyCurrentCleanupHistory(state) {
  const progress = state?.scoringCleanupProgress;
  const history = Array.isArray(state?.cleanupRefreshHistory)
    ? state.cleanupRefreshHistory.at(-1)
    : null;
  if (!object(progress)
    || !object(history)
    || history.schema !== CURRENT_CLEANUP_HISTORY_SCHEMA
    || !["empty", "optical_flare", "stimpack"].includes(history.branch)
    || history.round !== Number(state.round)
    || history.cleanupResolutionHash !== progress.cleanupResolutionHash
    || !HASH_PATTERN.test(String(history.cleanupResolutionHash || ""))
    || !HASH_PATTERN.test(String(history.preCleanupMaterialHash || ""))
    || !HASH_PATTERN.test(String(history.retainedMaterialHash || ""))
    || !HASH_PATTERN.test(String(history.statusCleanupHash || ""))
    || !Array.isArray(history.removedStatusEffectHashes)
    || !Array.isArray(history.removedMarkerHashes)
    || history.removedStatusEffectHashes.some((hash) => !HASH_PATTERN.test(String(hash)))
    || history.removedMarkerHashes.some((hash) => !HASH_PATTERN.test(String(hash)))
    || !nonNegativeInteger(history.refreshedCardCount)
    || !nonNegativeInteger(history.resetActivationPieceCount)
    || !nonNegativeInteger(history.clearedReactionUsageEntryCount)
    || !nonNegativeInteger(history.clearedAcademyReactionUsageEntryCount)
    || history.damageMarkersRetained !== true
    || history.trainingTruth !== false) {
    fail("DETERMINE_INITIATIVE_V2_CLEANUP_HISTORY_INVALID");
  }
  return history;
}

function projectCurrentStateToFrozenV1(state, options) {
  verifyCurrentOfficialBinding(state, options);
  verifyCurrentCleanupHistory(state);
  const projected = clone(state);
  projected.cleanupRefreshHistory = clone(state.cleanupRefreshHistory);
  projected.cleanupRefreshHistory.at(-1).schema = LEGACY_CLEANUP_HISTORY_SCHEMA;
  return projected;
}

function currentCandidate(legacyCandidate) {
  return {
    ...clone(legacyCandidate),
    executorId: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION,
    details: {
      ...clone(legacyCandidate.details || {}),
      currentCleanupHistorySchema: CURRENT_CLEANUP_HISTORY_SCHEMA,
      frozenSemanticKernel: `${OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID}`
        + `@${OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION}`,
      validatedAdapter: "strict_current_cleanup_v5_to_frozen_v1_semantics",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, error) {
  return {
    actionType: OFFICIAL_DETERMINE_INITIATIVE_V2_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "cleanup",
    initiativeResolutionHash: null,
    ruleAtomIds: [...OFFICIAL_DETERMINE_INITIATIVE_V2_DETERMINISTIC_ATOM_IDS],
    executorId: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_determine_initiative_v2_fail_closed",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialDetermineInitiativeActionsV2(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  try {
    const projected = projectCurrentStateToFrozenV1(state, options);
    const candidates = enumerateOfficialDetermineInitiativeActionsV1(projected, {
      ...options,
      includeDisabled: false,
      sideKey,
    });
    if (candidates.length !== 1) {
      fail("DETERMINE_INITIATIVE_V2_LEGACY_SEMANTICS_REJECTED");
    }
    return [currentCandidate(candidates[0])];
  } catch (error) {
    return options.includeDisabled === true
      ? [disabledAction(state, sideKey, error)]
      : [];
  }
}

export function officialDetermineInitiativeV2AtomIdsForState(state) {
  return officialDetermineInitiativeAtomIdsForStateV1(state);
}

export function applyOfficialDetermineInitiativeV2(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_DETERMINE_INITIATIVE_V2_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION) {
    fail("DETERMINE_INITIATIVE_V2_ACTION_INVALID");
  }
  const candidates = enumerateOfficialDetermineInitiativeActionsV2(stateInput, {
    ...options,
    includeDisabled: false,
    sideKey: String(actionInput.sideKey || ""),
  });
  if (candidates.length !== 1
    || !isDeepStrictEqual(actionInput, executableAction(candidates[0]))) {
    fail("DETERMINE_INITIATIVE_V2_ACTION_MISMATCH");
  }
  const projected = projectCurrentStateToFrozenV1(stateInput, options);
  const legacyAction = {
    ...clone(actionInput),
    executorId: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_VERSION,
  };
  const legacy = applyOfficialDetermineInitiativeV1(projected, legacyAction, options);
  const state = clone(legacy.state);
  state.cleanupRefreshHistory = clone(stateInput.cleanupRefreshHistory);
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  return {
    ...legacy,
    schemaVersion: "starcraft_tmg_official_determine_initiative_transition_v2",
    executorId: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION,
    state,
    action: clone(actionInput),
    rulesTruth: legacy.initiativeOutcome?.result === "tie"
      ? "official_current_cleanup_v5_tied_vp_new_roll_off_attempt_v2"
      : "official_current_cleanup_v5_initiative_and_next_round_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
