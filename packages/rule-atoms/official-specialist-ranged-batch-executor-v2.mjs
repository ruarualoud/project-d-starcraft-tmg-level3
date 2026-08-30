import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialSpecialistRangedBatchV1,
  enumerateOfficialSpecialistRangedBatchV1,
  isOfficialSpecialistRangedSequencePendingV1,
  OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_ATOM_IDS,
  OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE,
  OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ATOM_IDS,
  OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID,
  OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_VERSION,
  OFFICIAL_SPECIALIST_RANGED_BATCH_NEW_ATOM_IDS,
  OFFICIAL_SPECIALIST_RANGED_BATCH_TRANSITION_SCHEMA,
} from "./official-specialist-ranged-batch-executor-v1.mjs";
import {
  createOfficialCurrentSpecialistFrozenViewV2,
  restoreOfficialCurrentSpecialistViewV2,
} from "./official-current-specialist-data-adapter-v2.mjs";

export const OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID =
  "authority.specialist-ranged-batch-v2";
export const OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_SPECIALIST_RANGED_BATCH_V2_TRANSITION_SCHEMA =
  OFFICIAL_SPECIALIST_RANGED_BATCH_TRANSITION_SCHEMA;
export const OFFICIAL_SPECIALIST_RANGED_BATCH_V2_NEW_ATOM_IDS =
  OFFICIAL_SPECIALIST_RANGED_BATCH_NEW_ATOM_IDS;
export const OFFICIAL_SPECIALIST_RANGED_BATCH_V2_ACTION_ATOM_IDS =
  OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_ATOM_IDS;
export const OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ATOM_IDS;
export { OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE };

function fail(code) { throw new Error(code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function executable(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function currentAction(action, receiptHash) {
  return {
    ...clone(action),
    executorId: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_VERSION,
    dataAdapterReceiptHash: receiptHash,
  };
}
function frozenAction(action) {
  const result = clone(action);
  delete result.dataAdapterReceiptHash;
  result.executorId = OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_VERSION;
  return result;
}

export function isOfficialSpecialistRangedSequencePendingV2(state) {
  return isOfficialSpecialistRangedSequencePendingV1(state);
}

export function enumerateOfficialSpecialistRangedBatchV2(state, options = {}) {
  let adapted;
  try { adapted = createOfficialCurrentSpecialistFrozenViewV2(state, options); }
  catch (error) {
    if (options.throwOnError === true || isOfficialSpecialistRangedSequencePendingV2(state)) {
      throw error;
    }
    return [];
  }
  return enumerateOfficialSpecialistRangedBatchV1(adapted.frozenState, {
    ...options, matchBinding: adapted.frozenMatchBinding,
  }).map((candidate) => ({
    ...currentAction(candidate, adapted.receipt.adapterReceiptHash),
    details: {
      ...clone(candidate.details || {}),
      dataAdapterReceiptHash: adapted.receipt.adapterReceiptHash,
      currentOfficialCapability: "specialist_loadout_and_sequential_profile_batches",
      frozenSemanticKernel:
        `${OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID}`
          + `@${OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_VERSION}`,
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  }));
}

export function applyOfficialSpecialistRangedBatchV2(state, action, options = {}) {
  if (!object(action)
    || action.actionType !== OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE
    || action.executorId !== OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID
    || action.executorVersion !== OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_VERSION) {
    fail("SPECIALIST_RANGED_BATCH_V2_ACTION_INVALID");
  }
  const expected = enumerateOfficialSpecialistRangedBatchV2(state, {
    ...options, sideKey: action.sideKey, throwOnError: true,
  }).map(executable).find((entry) => isDeepStrictEqual(entry, action));
  if (!expected) fail("SPECIALIST_RANGED_BATCH_V2_ACTION_STALE");
  const adapted = createOfficialCurrentSpecialistFrozenViewV2(state, options);
  const applied = applyOfficialSpecialistRangedBatchV1(
    adapted.frozenState,
    frozenAction(action),
    { ...options, matchBinding: adapted.frozenMatchBinding },
  );
  const restored = restoreOfficialCurrentSpecialistViewV2(
    state, applied.state, adapted.receipt,
  );
  const lastLog = restored.log?.at(-1);
  if (lastLog) lastLog.action = clone(action);
  return {
    ...applied,
    schemaVersion: "starcraft_tmg_official_specialist_ranged_batch_transition_v2",
    executorId: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_VERSION,
    state: restored,
    action: clone(action),
    dataAdapterReceipt: clone(adapted.receipt),
    rulesTruth: "official_current_specialist_sequential_batch_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
