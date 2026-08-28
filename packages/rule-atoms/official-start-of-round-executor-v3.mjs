import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialSupplyLossLedgerV1 } from
  "./official-supply-loss-ledger-v1.mjs";
import {
  applyOfficialStartOfRoundV2,
  enumerateOfficialStartOfRoundActionsV2,
  OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION,
  OFFICIAL_START_OF_ROUND_V2_TRANSITION_SCHEMA,
} from "./official-start-of-round-executor-v2.mjs";

export const OFFICIAL_START_OF_ROUND_V3_ACTION_TYPE =
  OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE;
export const OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID =
  "authority.start-of-round-v3";
export const OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION = "3.0.0";
export const OFFICIAL_START_OF_ROUND_V3_TRANSITION_SCHEMA =
  OFFICIAL_START_OF_ROUND_V2_TRANSITION_SCHEMA;
export const OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ATOM_IDS =
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS;
export const OFFICIAL_START_OF_ROUND_V3_RESOLUTION_SCHEMA =
  "starcraft_tmg_official_start_of_round_resolution_v2";
export const OFFICIAL_START_OF_ROUND_V3_HISTORY_SCHEMA =
  "starcraft_tmg_official_start_of_round_history_entry_v2";

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

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(value)) fail("START_OF_ROUND_V3_RUNTIME_BINDING_REQUIRED");
  return value;
}

function currentResolution(v2Resolution, ledger) {
  const body = {
    ...without(clone(v2Resolution), ["schema", "startOfRoundResolutionHash"]),
    schema: OFFICIAL_START_OF_ROUND_V3_RESOLUTION_SCHEMA,
    supplyLossLedger: clone(ledger),
    supplyLossLedgerHash: ledger.ledgerHash,
  };
  return { ...body, startOfRoundResolutionHash: hashStarcraftTmgContract(body) };
}

function currentCandidate(v2Candidate, ledger) {
  const resolution = currentResolution(v2Candidate.startOfRoundResolution, ledger);
  return {
    ...clone(v2Candidate),
    startOfRoundResolutionHash: resolution.startOfRoundResolutionHash,
    startOfRoundResolution: resolution,
    executorId: OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION,
    details: {
      ...clone(v2Candidate.details || {}),
      supplyLossLedgerHash: ledger.ledgerHash,
      frozenSemanticKernel:
        `${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID}@${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION}`,
      validatedAdapter: "strict_current_start_v3_ledger_binding_to_frozen_v2_semantics",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, error) {
  return {
    actionType: OFFICIAL_START_OF_ROUND_V3_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "start_of_round",
    startOfRoundResolutionHash: null,
    ruleAtomIds: [...OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_start_of_round_v3_fail_closed",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialStartOfRoundActionsV3(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  try {
    const v2 = enumerateOfficialStartOfRoundActionsV2(state, {
      ...options,
      includeDisabled: true,
      sideKey,
    });
    if (v2.length !== 1 || v2[0].isEnabled !== true) {
      fail(v2[0]?.disabledReason || "START_OF_ROUND_V3_FROZEN_SEMANTICS_REJECTED");
    }
    const ledger = createOfficialSupplyLossLedgerV1({
      round: Number(state.round),
      rulesRuntimeHash: runtimeHash(options.matchBinding),
    });
    return [currentCandidate(v2[0], ledger)];
  } catch (error) {
    return options.includeDisabled === true
      ? [disabledAction(state, sideKey, error)]
      : [];
  }
}

export function applyOfficialStartOfRoundV3(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_START_OF_ROUND_V3_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION) {
    fail("START_OF_ROUND_V3_ACTION_INVALID");
  }
  const candidates = enumerateOfficialStartOfRoundActionsV3(stateInput, {
    ...options,
    includeDisabled: false,
    sideKey: String(actionInput.sideKey || ""),
  });
  if (candidates.length !== 1
    || !isDeepStrictEqual(actionInput, executableAction(candidates[0]))) {
    fail("START_OF_ROUND_V3_ACTION_MISMATCH");
  }
  const v2Candidates = enumerateOfficialStartOfRoundActionsV2(stateInput, {
    ...options,
    includeDisabled: false,
    sideKey: String(actionInput.sideKey || ""),
  });
  if (v2Candidates.length !== 1) fail("START_OF_ROUND_V3_FROZEN_SEMANTICS_REJECTED");
  const frozen = applyOfficialStartOfRoundV2(
    stateInput,
    executableAction(v2Candidates[0]),
    options,
  );
  const state = clone(frozen.state);
  const resolution = actionInput.startOfRoundResolution;
  state.supplyLossLedger = clone(resolution.supplyLossLedger);
  const historical = state.startOfRoundHistory?.at(-1);
  if (!historical) fail("START_OF_ROUND_V3_HISTORY_MISSING");
  const history = {
    ...clone(historical),
    schema: OFFICIAL_START_OF_ROUND_V3_HISTORY_SCHEMA,
    startOfRoundResolutionHash: resolution.startOfRoundResolutionHash,
    supplyLossLedgerHash: resolution.supplyLossLedgerHash,
  };
  state.startOfRoundHistory[state.startOfRoundHistory.length - 1] = history;
  const frozenEvent = frozen.events?.[0];
  if (!object(frozenEvent)) fail("START_OF_ROUND_V3_EVENT_MISSING");
  const event = {
    ...clone(frozenEvent),
    startOfRoundResolutionHash: resolution.startOfRoundResolutionHash,
    supplyLossLedgerHash: resolution.supplyLossLedgerHash,
  };
  const events = [event];
  const lastLog = state.log?.at(-1);
  if (lastLog) {
    lastLog.action = clone(actionInput);
    lastLog.events = clone(events);
  }
  return {
    ...frozen,
    schemaVersion: "starcraft_tmg_official_start_of_round_transition_v3",
    executorId: OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION,
    state,
    events,
    action: clone(actionInput),
    rulesTruth: "official_current_start_of_round_supply_ledger_exact_subset_v3",
    frozenSemanticKernel:
      `${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID}@${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
