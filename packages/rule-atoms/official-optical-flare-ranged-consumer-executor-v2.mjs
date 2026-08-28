import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialOpticalFlareRangedConsumerV1,
  enumerateOfficialOpticalFlareRangedConsumerV1,
  OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_ATOM_IDS,
  OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_TYPE,
  OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID,
  OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_VERSION,
  OFFICIAL_OPTICAL_FLARE_RANGED_NEW_ATOM_IDS,
  OFFICIAL_OPTICAL_FLARE_RANGED_TRANSITION_SCHEMA,
} from "./official-optical-flare-ranged-consumer-executor-v1.mjs";
import {
  createOfficialCurrentAcademyMedicFrozenViewV2,
  restoreOfficialCurrentAcademyMedicViewV2,
} from "./official-current-academy-medic-data-adapter-v2.mjs";

export const OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID =
  "authority.optical-flare-ranged-consumer-v2";
export const OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_OPTICAL_FLARE_RANGED_V2_TRANSITION_SCHEMA =
  OFFICIAL_OPTICAL_FLARE_RANGED_TRANSITION_SCHEMA;
export const OFFICIAL_OPTICAL_FLARE_RANGED_V2_ACTION_TYPE =
  OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_TYPE;
export const OFFICIAL_OPTICAL_FLARE_RANGED_V2_NEW_ATOM_IDS =
  OFFICIAL_OPTICAL_FLARE_RANGED_NEW_ATOM_IDS;
export const OFFICIAL_OPTICAL_FLARE_RANGED_V2_ACTION_ATOM_IDS =
  OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_ATOM_IDS;
export const OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_OPTICAL_FLARE_RANGED_V2_ACTION_ATOM_IDS;

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
    executorId: OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_VERSION,
    dataAdapterReceiptHash: adapterReceiptHash,
  };
}

function frozenAction(action) {
  const result = clone(action);
  delete result.dataAdapterReceiptHash;
  result.executorId = OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_VERSION;
  return result;
}

function frozenCombatState(state) {
  const frozenState = clone(state);
  for (const piece of frozenState.pieces || []) {
    piece.statuses = (piece.statuses || []).filter((status) => status !== "stationary");
  }
  return frozenState;
}

function restoreCurrentStationaryStatuses(stateBefore, stateAfter) {
  const restored = clone(stateAfter);
  for (const piece of restored.pieces || []) {
    const before = stateBefore.pieces?.find((entry) => entry.id === piece.id);
    if (!before) fail("OPTICAL_FLARE_RANGED_V2_PIECE_SET_CHANGED");
    const stationary = (before.statuses || []).filter((status) => status === "stationary");
    piece.statuses = [...stationary, ...(piece.statuses || []).filter((status) => (
      status !== "stationary"
    ))];
  }
  return restored;
}

export function enumerateOfficialOpticalFlareRangedConsumerV2(state, options = {}) {
  let adapted;
  try {
    adapted = createOfficialCurrentAcademyMedicFrozenViewV2(state, options);
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
  return enumerateOfficialOpticalFlareRangedConsumerV1(
    frozenCombatState(adapted.frozenState), {
    ...options,
    matchBinding: adapted.frozenMatchBinding,
  }).map((candidate) => ({
    ...currentAction(candidate, adapted.receipt.adapterReceiptHash),
    details: {
      ...clone(candidate.details || {}),
      dataAdapterReceiptHash: adapted.receipt.adapterReceiptHash,
      frozenSemanticKernel:
        `${OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID}@${OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_VERSION}`,
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  }));
}

export function applyOfficialOpticalFlareRangedConsumerV2(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_OPTICAL_FLARE_RANGED_V2_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_VERSION) {
    fail("OPTICAL_FLARE_RANGED_V2_ACTION_INVALID");
  }
  const expected = enumerateOfficialOpticalFlareRangedConsumerV2(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
    throwOnError: true,
  }).map(executableAction).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("OPTICAL_FLARE_RANGED_V2_ACTION_STALE");
  const adapted = createOfficialCurrentAcademyMedicFrozenViewV2(stateInput, options);
  const frozen = applyOfficialOpticalFlareRangedConsumerV1(
    frozenCombatState(adapted.frozenState),
    frozenAction(actionInput),
    {
      ...options,
      matchBinding: adapted.frozenMatchBinding,
    },
  );
  const dataRestoredState = restoreOfficialCurrentAcademyMedicViewV2(
    stateInput,
    frozen.state,
    adapted.receipt,
  );
  const state = restoreCurrentStationaryStatuses(stateInput, dataRestoredState);
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  return {
    ...frozen,
    schemaVersion: "starcraft_tmg_official_optical_flare_ranged_transition_v2",
    executorId: OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_VERSION,
    state,
    action: clone(actionInput),
    dataAdapterReceipt: clone(adapted.receipt),
    rulesTruth: "official_current_optical_flare_ranged_consumer_exact_subset_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
