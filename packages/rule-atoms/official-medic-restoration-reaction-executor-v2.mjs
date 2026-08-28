import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialMedicRestorationV1,
  enumerateOfficialMedicRestorationV1,
  isOfficialMedicRestorationPendingV1,
  openOfficialMedicRestorationWindowV1,
  OFFICIAL_MEDIC_RESTORATION_ACTION_ATOM_IDS,
  OFFICIAL_MEDIC_RESTORATION_DEPENDENCY_ATOM_IDS,
  OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID,
  OFFICIAL_MEDIC_RESTORATION_EXECUTOR_VERSION,
  OFFICIAL_MEDIC_RESTORATION_NEW_ATOM_IDS,
  OFFICIAL_MEDIC_RESTORATION_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MEDIC_RESTORATION_SOURCE_V1,
  OFFICIAL_MEDIC_RESTORATION_TRANSITION_SCHEMA,
  OFFICIAL_PASS_RESTORATION_REACTION_ACTION_TYPE,
  OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE,
} from "./official-medic-restoration-reaction-executor-v1.mjs";
import {
  createOfficialCurrentAcademyMedicFrozenViewV2,
  restoreOfficialCurrentAcademyMedicViewV2,
} from "./official-current-academy-medic-data-adapter-v2.mjs";
import { verifyOfficialCurrentMovementAuthorityLineageV3 } from
  "./official-current-movement-authority-lineage-v3.mjs";

export const OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ID =
  "authority.medic-restoration-reaction-v2";
export const OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_MEDIC_RESTORATION_V2_TRANSITION_SCHEMA =
  OFFICIAL_MEDIC_RESTORATION_TRANSITION_SCHEMA;
export const OFFICIAL_MEDIC_RESTORATION_V2_NEW_ATOM_IDS =
  OFFICIAL_MEDIC_RESTORATION_NEW_ATOM_IDS;
export const OFFICIAL_MEDIC_RESTORATION_V2_DEPENDENCY_ATOM_IDS =
  OFFICIAL_MEDIC_RESTORATION_DEPENDENCY_ATOM_IDS;
export const OFFICIAL_MEDIC_RESTORATION_V2_ACTION_ATOM_IDS =
  OFFICIAL_MEDIC_RESTORATION_ACTION_ATOM_IDS;
export const OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_MEDIC_RESTORATION_V2_ACTION_ATOM_IDS;
export {
  OFFICIAL_MEDIC_RESTORATION_SOURCE_TEXT_HASH_V1 as
    OFFICIAL_MEDIC_RESTORATION_SOURCE_TEXT_HASH_V2,
  OFFICIAL_MEDIC_RESTORATION_SOURCE_V1 as OFFICIAL_MEDIC_RESTORATION_SOURCE_V2,
  OFFICIAL_PASS_RESTORATION_REACTION_ACTION_TYPE,
  OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE,
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

function currentAction(action, lineageHash, adapterReceiptHash) {
  return {
    ...clone(action),
    executorId: OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_VERSION,
    authorityLineageHash: lineageHash,
    dataAdapterReceiptHash: adapterReceiptHash,
  };
}

function frozenAction(action) {
  const result = clone(action);
  delete result.authorityLineageHash;
  delete result.dataAdapterReceiptHash;
  result.executorId = OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_MEDIC_RESTORATION_EXECUTOR_VERSION;
  return result;
}

function context(state, options) {
  const authorityLineage = verifyOfficialCurrentMovementAuthorityLineageV3(state, {
    errorPrefix: "RESTORATION_V2",
  });
  const adapted = createOfficialCurrentAcademyMedicFrozenViewV2(state, options);
  return { authorityLineage, adapted };
}

export function isOfficialMedicRestorationPendingV2(state) {
  return isOfficialMedicRestorationPendingV1(state);
}

export function openOfficialMedicRestorationWindowV2(stateInput, input = {}) {
  const resolved = context(stateInput, { matchBinding: input.matchBinding });
  const opened = openOfficialMedicRestorationWindowV1(
    resolved.adapted.frozenState,
    {
      ...input,
      action: input.action ? frozenAction(input.action) : input.action,
      matchBinding: resolved.adapted.frozenMatchBinding,
    },
  );
  return {
    ...opened,
    state: restoreOfficialCurrentAcademyMedicViewV2(
      stateInput,
      opened.state,
      resolved.adapted.receipt,
    ),
    authorityLineageHash: resolved.authorityLineage.lineageHash,
    dataAdapterReceiptHash: resolved.adapted.receipt.adapterReceiptHash,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}

export function enumerateOfficialMedicRestorationV2(state, options = {}) {
  let resolved;
  try {
    resolved = context(state, options);
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
  return enumerateOfficialMedicRestorationV1(resolved.adapted.frozenState, {
    ...options,
    matchBinding: resolved.adapted.frozenMatchBinding,
  }).map((candidate) => ({
    ...currentAction(
      candidate,
      resolved.authorityLineage.lineageHash,
      resolved.adapted.receipt.adapterReceiptHash,
    ),
    details: {
      ...clone(candidate.details || {}),
      currentAuthorityLineageHash: resolved.authorityLineage.lineageHash,
      dataAdapterReceiptHash: resolved.adapted.receipt.adapterReceiptHash,
      frozenSemanticKernel:
        `${OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID}@${OFFICIAL_MEDIC_RESTORATION_EXECUTOR_VERSION}`,
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  }));
}

export function applyOfficialMedicRestorationV2(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.executorId !== OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_VERSION) {
    fail("RESTORATION_V2_ACTION_INVALID");
  }
  const expected = enumerateOfficialMedicRestorationV2(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
    throwOnError: true,
  }).map(executableAction).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("RESTORATION_V2_ACTION_STALE");
  const resolved = context(stateInput, options);
  const frozen = applyOfficialMedicRestorationV1(
    resolved.adapted.frozenState,
    frozenAction(actionInput),
    {
      ...options,
      matchBinding: resolved.adapted.frozenMatchBinding,
    },
  );
  const state = restoreOfficialCurrentAcademyMedicViewV2(
    stateInput,
    frozen.state,
    resolved.adapted.receipt,
  );
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  return {
    ...frozen,
    schemaVersion: "starcraft_tmg_official_medic_restoration_transition_v2",
    executorId: OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_VERSION,
    state,
    action: clone(actionInput),
    authorityLineageHash: resolved.authorityLineage.lineageHash,
    dataAdapterReceipt: clone(resolved.adapted.receipt),
    rulesTruth: "official_current_medic_restoration_exact_subset_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
