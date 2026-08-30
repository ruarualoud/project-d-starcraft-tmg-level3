import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialGoliathScatterRangedBatchV1,
  enumerateOfficialGoliathScatterRangedBatchV1,
  isOfficialGoliathScatterRangedSequencePendingV1,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_ATOM_IDS,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_TYPE,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ATOM_IDS,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_VERSION,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_KERNELS,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_NEW_ATOM_IDS,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_TRANSITION_SCHEMA,
} from "./official-goliath-scatter-ranged-batch-executor-v1.mjs";
import {
  createOfficialCurrentGoliathScatterFrozenViewV2,
  restoreOfficialCurrentGoliathScatterViewV2,
} from "./official-current-goliath-scatter-data-adapter-v2.mjs";

export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID =
  "authority.goliath-scatter-ranged-batch-v2";
export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_TRANSITION_SCHEMA =
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_TRANSITION_SCHEMA;
export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_NEW_ATOM_IDS =
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_NEW_ATOM_IDS;
export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_ACTION_ATOM_IDS =
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_ATOM_IDS;
export const OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ATOM_IDS;
export {
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_TYPE,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_KERNELS,
};

function fail(code) {
  throw new Error(code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function executableAction(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

function currentAction(action, adapterReceiptHash) {
  return {
    ...clone(action),
    executorId: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_VERSION,
    dataAdapterReceiptHash: adapterReceiptHash,
  };
}

function frozenAction(action) {
  const result = clone(action);
  delete result.dataAdapterReceiptHash;
  result.executorId = OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_VERSION;
  return result;
}

export function isOfficialGoliathScatterRangedSequencePendingV2(state) {
  return isOfficialGoliathScatterRangedSequencePendingV1(state);
}

export function enumerateOfficialGoliathScatterRangedBatchV2(state, options = {}) {
  let adapted;
  try {
    adapted = createOfficialCurrentGoliathScatterFrozenViewV2(state, options);
  } catch (error) {
    if (options.throwOnError === true
      || isOfficialGoliathScatterRangedSequencePendingV2(state)) throw error;
    return [];
  }
  return enumerateOfficialGoliathScatterRangedBatchV1(adapted.frozenState, {
    ...options,
    matchBinding: adapted.frozenMatchBinding,
  }).map((candidate) => ({
    ...currentAction(candidate, adapted.receipt.adapterReceiptHash),
    details: {
      ...clone(candidate.details || {}),
      dataAdapterReceiptHash: adapted.receipt.adapterReceiptHash,
      currentOfficialCapability:
        "goliath_scatter_indirect_fire_locked_in_full_cover_sequential_batch",
      frozenSemanticKernel:
        `${OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID}`
          + `@${OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_VERSION}`,
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  }));
}

export function applyOfficialGoliathScatterRangedBatchV2(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_TYPE
    || actionInput.executorId
      !== OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_VERSION) {
    fail("GOLIATH_SCATTER_V2_ACTION_INVALID");
  }
  const expected = enumerateOfficialGoliathScatterRangedBatchV2(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
    throwOnError: true,
  }).map(executableAction).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("GOLIATH_SCATTER_V2_ACTION_STALE");
  const adapted = createOfficialCurrentGoliathScatterFrozenViewV2(stateInput, options);
  const frozen = applyOfficialGoliathScatterRangedBatchV1(
    adapted.frozenState,
    frozenAction(actionInput),
    {
      ...options,
      matchBinding: adapted.frozenMatchBinding,
    },
  );
  const state = restoreOfficialCurrentGoliathScatterViewV2(
    stateInput,
    frozen.state,
    adapted.receipt,
  );
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  return {
    ...frozen,
    schemaVersion:
      "starcraft_tmg_official_goliath_scatter_ranged_batch_transition_v2",
    executorId: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_VERSION,
    state,
    action: clone(actionInput),
    dataAdapterReceipt: clone(adapted.receipt),
    rulesTruth: "official_current_goliath_scatter_sequential_batch_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
