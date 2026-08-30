import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialSidearmPinpointRangedBatchV1,
  enumerateOfficialSidearmPinpointRangedBatchV1,
  isOfficialSidearmRangedSequencePendingV1,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_ATOM_IDS,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ATOM_IDS,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_VERSION,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_NEW_ATOM_IDS,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_TRANSITION_SCHEMA,
} from "./official-sidearm-pinpoint-ranged-batch-executor-v1.mjs";
import {
  createOfficialCurrentSidearmPinpointFrozenViewV2,
  restoreOfficialCurrentSidearmPinpointViewV2,
} from "./official-current-sidearm-pinpoint-data-adapter-v2.mjs";

export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID =
  "authority.sidearm-pinpoint-ranged-batch-v2";
export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_TRANSITION_SCHEMA =
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_TRANSITION_SCHEMA;
export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_NEW_ATOM_IDS =
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_NEW_ATOM_IDS;
export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_ACTION_ATOM_IDS =
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_ATOM_IDS;
export const OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ATOM_IDS;
export { OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE };

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
    executorId: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_VERSION,
    dataAdapterReceiptHash: adapterReceiptHash,
  };
}

function frozenAction(action) {
  const result = clone(action);
  delete result.dataAdapterReceiptHash;
  result.executorId = OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_VERSION;
  return result;
}

export function isOfficialSidearmRangedSequencePendingV2(state) {
  return isOfficialSidearmRangedSequencePendingV1(state);
}

export function enumerateOfficialSidearmPinpointRangedBatchV2(state, options = {}) {
  let adapted;
  try {
    adapted = createOfficialCurrentSidearmPinpointFrozenViewV2(state, options);
  } catch (error) {
    if (options.throwOnError === true
      || isOfficialSidearmRangedSequencePendingV2(state)) throw error;
    return [];
  }
  return enumerateOfficialSidearmPinpointRangedBatchV1(adapted.frozenState, {
    ...options,
    matchBinding: adapted.frozenMatchBinding,
  }).map((candidate) => ({
    ...currentAction(candidate, adapted.receipt.adapterReceiptHash),
    details: {
      ...clone(candidate.details || {}),
      dataAdapterReceiptHash: adapted.receipt.adapterReceiptHash,
      currentOfficialCapability: "sidearm_independent_batches_and_pinpoint_targeting",
      frozenSemanticKernel:
        `${OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID}`
          + `@${OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_VERSION}`,
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  }));
}

export function applyOfficialSidearmPinpointRangedBatchV2(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE
    || actionInput.executorId
      !== OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_VERSION) {
    fail("SIDEARM_PINPOINT_V2_ACTION_INVALID");
  }
  const expected = enumerateOfficialSidearmPinpointRangedBatchV2(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
    throwOnError: true,
  }).map(executableAction).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("SIDEARM_PINPOINT_V2_ACTION_STALE");
  const adapted = createOfficialCurrentSidearmPinpointFrozenViewV2(stateInput, options);
  const frozen = applyOfficialSidearmPinpointRangedBatchV1(
    adapted.frozenState,
    frozenAction(actionInput),
    {
      ...options,
      matchBinding: adapted.frozenMatchBinding,
    },
  );
  const state = restoreOfficialCurrentSidearmPinpointViewV2(
    stateInput,
    frozen.state,
    adapted.receipt,
  );
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  return {
    ...frozen,
    schemaVersion: "starcraft_tmg_official_sidearm_pinpoint_ranged_batch_transition_v2",
    executorId: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_VERSION,
    state,
    action: clone(actionInput),
    dataAdapterReceipt: clone(adapted.receipt),
    rulesTruth: "official_current_sidearm_pinpoint_sequential_batch_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
