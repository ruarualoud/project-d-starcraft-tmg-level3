import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialStartOfRoundV3,
  enumerateOfficialStartOfRoundActionsV3,
  OFFICIAL_START_OF_ROUND_V3_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION,
  OFFICIAL_START_OF_ROUND_V3_TRANSITION_SCHEMA,
} from "./official-start-of-round-executor-v3.mjs";

export const OFFICIAL_START_OF_ROUND_V4_ACTION_TYPE =
  OFFICIAL_START_OF_ROUND_V3_ACTION_TYPE;
export const OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID =
  "authority.start-of-round-v4";
export const OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION = "4.0.0";
export const OFFICIAL_START_OF_ROUND_V4_TRANSITION_SCHEMA =
  OFFICIAL_START_OF_ROUND_V3_TRANSITION_SCHEMA;
export const OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ATOM_IDS =
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ATOM_IDS;
export const OFFICIAL_START_OF_ROUND_V4_RESOLUTION_SCHEMA =
  "starcraft_tmg_official_start_of_round_resolution_v3";
export const OFFICIAL_START_OF_ROUND_V4_HISTORY_SCHEMA =
  "starcraft_tmg_official_start_of_round_history_entry_v3";

const MARINE_RECORD_KEY = "army_units:marine";

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

function selectedUpgradeLoadouts(state) {
  if (!Array.isArray(state?.pieces)) fail("START_OF_ROUND_V4_LOADOUT_SCOPE_INVALID");
  const rows = state.pieces.map((piece) => {
    const names = piece?.selectedUpgradeNames;
    if (!Array.isArray(names)
      || names.some((name) => typeof name !== "string" || !name.trim())
      || new Set(names).size !== names.length
      || (names.length > 0 && (
        piece.officialUnitRecordKey !== MARINE_RECORD_KEY
          || !isDeepStrictEqual([...names].sort(), ["Stimpack"])
      ))) {
      fail("START_OF_ROUND_V4_LOADOUT_SCOPE_INVALID", String(piece?.id || "piece"));
    }
    return {
      pieceId: String(piece.id || ""),
      officialUnitRecordKey: String(piece.officialUnitRecordKey || ""),
      selectedUpgradeNames: [...names].sort(),
    };
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
  if (rows.some((row) => !row.pieceId || !row.officialUnitRecordKey)) {
    fail("START_OF_ROUND_V4_LOADOUT_SCOPE_INVALID");
  }
  return rows;
}

function loadoutHash(rows) {
  return hashStarcraftTmgContract({
    schema: "starcraft_tmg_selected_upgrade_loadout_binding_v1",
    rows,
  });
}

function frozenState(state) {
  const result = clone(state);
  for (const piece of result.pieces || []) piece.selectedUpgradeNames = [];
  return result;
}

function currentResolution(v3Resolution, loadouts) {
  const body = {
    ...without(clone(v3Resolution), ["schema", "startOfRoundResolutionHash"]),
    schema: OFFICIAL_START_OF_ROUND_V4_RESOLUTION_SCHEMA,
    selectedUpgradeLoadouts: clone(loadouts),
    selectedUpgradeLoadoutHash: loadoutHash(loadouts),
  };
  return { ...body, startOfRoundResolutionHash: hashStarcraftTmgContract(body) };
}

function currentCandidate(v3Candidate, loadouts) {
  const resolution = currentResolution(v3Candidate.startOfRoundResolution, loadouts);
  return {
    ...clone(v3Candidate),
    startOfRoundResolutionHash: resolution.startOfRoundResolutionHash,
    startOfRoundResolution: resolution,
    executorId: OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION,
    details: {
      ...clone(v3Candidate.details || {}),
      selectedUpgradeLoadoutHash: resolution.selectedUpgradeLoadoutHash,
      frozenSemanticKernel:
        `${OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID}@${OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION}`,
      validatedAdapter:
        "strict_current_start_v4_selected_upgrade_binding_to_frozen_v3_semantics",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, error) {
  return {
    actionType: OFFICIAL_START_OF_ROUND_V4_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "start_of_round",
    startOfRoundResolutionHash: null,
    ruleAtomIds: [...OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_start_of_round_v4_fail_closed",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialStartOfRoundActionsV4(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  try {
    const loadouts = selectedUpgradeLoadouts(state);
    const v3 = enumerateOfficialStartOfRoundActionsV3(frozenState(state), {
      ...options,
      includeDisabled: true,
      sideKey,
    });
    if (v3.length !== 1 || v3[0].isEnabled !== true) {
      fail(v3[0]?.disabledReason || "START_OF_ROUND_V4_FROZEN_SEMANTICS_REJECTED");
    }
    return [currentCandidate(v3[0], loadouts)];
  } catch (error) {
    return options.includeDisabled === true
      ? [disabledAction(state, sideKey, error)]
      : [];
  }
}

export function applyOfficialStartOfRoundV4(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_START_OF_ROUND_V4_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION) {
    fail("START_OF_ROUND_V4_ACTION_INVALID");
  }
  const candidates = enumerateOfficialStartOfRoundActionsV4(stateInput, {
    ...options,
    includeDisabled: false,
    sideKey: String(actionInput.sideKey || ""),
  });
  if (candidates.length !== 1
    || !isDeepStrictEqual(actionInput, executableAction(candidates[0]))) {
    fail("START_OF_ROUND_V4_ACTION_MISMATCH");
  }
  const loadouts = selectedUpgradeLoadouts(stateInput);
  const semanticState = frozenState(stateInput);
  const v3Candidates = enumerateOfficialStartOfRoundActionsV3(semanticState, {
    ...options,
    includeDisabled: false,
    sideKey: String(actionInput.sideKey || ""),
  });
  if (v3Candidates.length !== 1) fail("START_OF_ROUND_V4_FROZEN_SEMANTICS_REJECTED");
  const frozen = applyOfficialStartOfRoundV3(
    semanticState,
    executableAction(v3Candidates[0]),
    options,
  );
  const state = clone(frozen.state);
  const loadoutsByPieceId = new Map(loadouts.map((row) => [row.pieceId, row]));
  for (const piece of state.pieces) {
    const row = loadoutsByPieceId.get(piece.id);
    if (!row) fail("START_OF_ROUND_V4_LOADOUT_RESTORE_INVALID", piece.id);
    piece.selectedUpgradeNames = [...row.selectedUpgradeNames];
  }
  const resolution = actionInput.startOfRoundResolution;
  state.supplyLossLedger = clone(resolution.supplyLossLedger);
  const historical = state.startOfRoundHistory?.at(-1);
  if (!historical) fail("START_OF_ROUND_V4_HISTORY_MISSING");
  const history = {
    ...clone(historical),
    schema: OFFICIAL_START_OF_ROUND_V4_HISTORY_SCHEMA,
    startOfRoundResolutionHash: resolution.startOfRoundResolutionHash,
    selectedUpgradeLoadoutHash: resolution.selectedUpgradeLoadoutHash,
  };
  state.startOfRoundHistory[state.startOfRoundHistory.length - 1] = history;
  const frozenEvent = frozen.events?.[0];
  if (!object(frozenEvent)) fail("START_OF_ROUND_V4_EVENT_MISSING");
  const event = {
    ...clone(frozenEvent),
    startOfRoundResolutionHash: resolution.startOfRoundResolutionHash,
    selectedUpgradeLoadoutHash: resolution.selectedUpgradeLoadoutHash,
  };
  const events = [event];
  const lastLog = state.log?.at(-1);
  if (lastLog) {
    lastLog.action = clone(actionInput);
    lastLog.events = clone(events);
  }
  return {
    ...frozen,
    schemaVersion: "starcraft_tmg_official_start_of_round_transition_v4",
    executorId: OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION,
    state,
    events,
    action: clone(actionInput),
    rulesTruth: "official_current_start_of_round_selected_upgrade_binding_v4",
    frozenSemanticKernel:
      `${OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID}@${OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
