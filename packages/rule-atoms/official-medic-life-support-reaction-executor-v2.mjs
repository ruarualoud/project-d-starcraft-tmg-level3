import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialMedicLifeSupportV1,
  enumerateOfficialMedicLifeSupportV1,
  isOfficialMedicLifeSupportPendingV1,
  openOfficialMedicLifeSupportWindowV1,
  OFFICIAL_MEDIC_LIFE_SUPPORT_ACTION_ATOM_IDS,
  OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ATOM_IDS,
  OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID,
  OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_VERSION,
  OFFICIAL_MEDIC_LIFE_SUPPORT_NEW_ATOM_IDS,
  OFFICIAL_MEDIC_LIFE_SUPPORT_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MEDIC_LIFE_SUPPORT_SOURCE_V1,
  OFFICIAL_MEDIC_LIFE_SUPPORT_TRANSITION_SCHEMA,
  OFFICIAL_MEDIC_STABILIZER_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MEDIC_STABILIZER_SOURCE_V1,
  OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
  OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
} from "./official-medic-life-support-reaction-executor-v1.mjs";
import {
  createOfficialCurrentLifeSupportFrozenViewV2,
  restoreOfficialCurrentLifeSupportViewV2,
} from "./official-current-life-support-data-adapter-v2.mjs";

export const OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID =
  "authority.medic-life-support-reaction-v2";
export const OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_MEDIC_LIFE_SUPPORT_V2_TRANSITION_SCHEMA =
  OFFICIAL_MEDIC_LIFE_SUPPORT_TRANSITION_SCHEMA;
export const OFFICIAL_MEDIC_LIFE_SUPPORT_V2_NEW_ATOM_IDS =
  OFFICIAL_MEDIC_LIFE_SUPPORT_NEW_ATOM_IDS;
export const OFFICIAL_MEDIC_LIFE_SUPPORT_V2_ACTION_ATOM_IDS =
  OFFICIAL_MEDIC_LIFE_SUPPORT_ACTION_ATOM_IDS;
export const OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ATOM_IDS;
export {
  OFFICIAL_MEDIC_LIFE_SUPPORT_SOURCE_TEXT_HASH_V1 as
    OFFICIAL_MEDIC_LIFE_SUPPORT_SOURCE_TEXT_HASH_V2,
  OFFICIAL_MEDIC_LIFE_SUPPORT_SOURCE_V1 as OFFICIAL_MEDIC_LIFE_SUPPORT_SOURCE_V2,
  OFFICIAL_MEDIC_STABILIZER_SOURCE_TEXT_HASH_V1 as
    OFFICIAL_MEDIC_STABILIZER_SOURCE_TEXT_HASH_V2,
  OFFICIAL_MEDIC_STABILIZER_SOURCE_V1 as OFFICIAL_MEDIC_STABILIZER_SOURCE_V2,
  OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
  OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
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
    executorId: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_VERSION,
    dataAdapterReceiptHash: adapterReceiptHash,
  };
}

function frozenAction(action) {
  const result = clone(action);
  delete result.dataAdapterReceiptHash;
  result.executorId = OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_VERSION;
  return result;
}

export function isOfficialMedicLifeSupportPendingV2(state) {
  return isOfficialMedicLifeSupportPendingV1(state);
}

export function openOfficialMedicLifeSupportWindowV2(stateInput, input = {}) {
  const adapted = createOfficialCurrentLifeSupportFrozenViewV2(stateInput, {
    matchBinding: input.matchBinding,
  });
  const opened = openOfficialMedicLifeSupportWindowV1(adapted.frozenState, {
    ...input,
    matchBinding: adapted.frozenMatchBinding,
  });
  return {
    ...opened,
    state: restoreOfficialCurrentLifeSupportViewV2(
      stateInput,
      opened.state,
      adapted.receipt,
    ),
    dataAdapterReceiptHash: adapted.receipt.adapterReceiptHash,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}

export function enumerateOfficialMedicLifeSupportV2(state, options = {}) {
  let adapted;
  try {
    adapted = createOfficialCurrentLifeSupportFrozenViewV2(state, options);
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
  return enumerateOfficialMedicLifeSupportV1(adapted.frozenState, {
    ...options,
    matchBinding: adapted.frozenMatchBinding,
  }).map((candidate) => ({
    ...currentAction(candidate, adapted.receipt.adapterReceiptHash),
    details: {
      ...clone(candidate.details || {}),
      dataAdapterReceiptHash: adapted.receipt.adapterReceiptHash,
      currentOfficialCapability:
        "life_support_baseline_one_cp_with_explicit_optional_stabilizer_selection",
      frozenSemanticKernel:
        `${OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID}@${OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_VERSION}`,
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  }));
}

export function applyOfficialMedicLifeSupportV2(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || ![
      OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
      OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
    ].includes(actionInput.actionType)
    || actionInput.executorId !== OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_VERSION) {
    fail("LIFE_SUPPORT_V2_ACTION_INVALID");
  }
  const expected = enumerateOfficialMedicLifeSupportV2(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
    throwOnError: true,
  }).map(executableAction).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("LIFE_SUPPORT_V2_ACTION_STALE");
  const adapted = createOfficialCurrentLifeSupportFrozenViewV2(stateInput, options);
  const frozen = applyOfficialMedicLifeSupportV1(
    adapted.frozenState,
    frozenAction(actionInput),
    {
      ...options,
      matchBinding: adapted.frozenMatchBinding,
    },
  );
  const state = restoreOfficialCurrentLifeSupportViewV2(
    stateInput,
    frozen.state,
    adapted.receipt,
  );
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  return {
    ...frozen,
    schemaVersion: "starcraft_tmg_official_medic_life_support_transition_v2",
    executorId: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_VERSION,
    state,
    action: clone(actionInput),
    dataAdapterReceipt: clone(adapted.receipt),
    rulesTruth: "official_current_medic_life_support_exact_subset_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
