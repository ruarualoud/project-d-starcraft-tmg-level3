import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialAcademyMedicAbilityV1,
  enumerateOfficialAcademyMedicAbilityV1,
  isOfficialAcademyMedicAbilityPendingV1,
  OFFICIAL_ACADEMY_ADVANCED_TRAINING_SOURCE_TEXT_HASH_V1,
  OFFICIAL_ACADEMY_ADVANCED_TRAINING_SOURCE_V1,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_ACTION_ATOM_IDS,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_DEPENDENCY_ATOM_IDS,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_VERSION,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_NEW_ATOM_IDS,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_TRANSITION_SCHEMA,
  OFFICIAL_DECLARE_ABILITY_ACTION_TYPE,
  OFFICIAL_PASS_ABILITY_REACTION_ACTION_TYPE,
  OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE,
  OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE,
} from "./official-academy-medic-ability-executor-v1.mjs";
import {
  createOfficialCurrentAcademyMedicFrozenViewV2,
  restoreOfficialCurrentAcademyMedicViewV2,
} from "./official-current-academy-medic-data-adapter-v2.mjs";
import { verifyOfficialCurrentMovementAuthorityLineageV3 } from
  "./official-current-movement-authority-lineage-v3.mjs";

export const OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ID =
  "authority.academy-medic-ability-v2";
export const OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_TRANSITION_SCHEMA =
  OFFICIAL_ACADEMY_MEDIC_ABILITY_TRANSITION_SCHEMA;
export const OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_NEW_ATOM_IDS =
  OFFICIAL_ACADEMY_MEDIC_ABILITY_NEW_ATOM_IDS;
export const OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_DEPENDENCY_ATOM_IDS =
  OFFICIAL_ACADEMY_MEDIC_ABILITY_DEPENDENCY_ATOM_IDS;
export const OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_ACTION_ATOM_IDS =
  OFFICIAL_ACADEMY_MEDIC_ABILITY_ACTION_ATOM_IDS;
export const OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_ACTION_ATOM_IDS;
export {
  OFFICIAL_ACADEMY_ADVANCED_TRAINING_SOURCE_TEXT_HASH_V1 as
    OFFICIAL_ACADEMY_ADVANCED_TRAINING_SOURCE_TEXT_HASH_V2,
  OFFICIAL_ACADEMY_ADVANCED_TRAINING_SOURCE_V1 as
    OFFICIAL_ACADEMY_ADVANCED_TRAINING_SOURCE_V2,
  OFFICIAL_DECLARE_ABILITY_ACTION_TYPE,
  OFFICIAL_PASS_ABILITY_REACTION_ACTION_TYPE,
  OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE,
  OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE,
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
    executorId: OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_VERSION,
    authorityLineageHash: lineageHash,
    dataAdapterReceiptHash: adapterReceiptHash,
  };
}

function frozenAction(action) {
  const result = clone(action);
  delete result.authorityLineageHash;
  delete result.dataAdapterReceiptHash;
  result.executorId = OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_VERSION;
  return result;
}

function context(state, options) {
  const authorityLineage = verifyOfficialCurrentMovementAuthorityLineageV3(state, {
    errorPrefix: "ACADEMY_MEDIC_V2",
  });
  const adapted = createOfficialCurrentAcademyMedicFrozenViewV2(state, options);
  return { authorityLineage, adapted };
}

export function isOfficialAcademyMedicAbilityPendingV2(state) {
  return isOfficialAcademyMedicAbilityPendingV1(state);
}

export function enumerateOfficialAcademyMedicAbilityV2(state, options = {}) {
  let resolved;
  try {
    resolved = context(state, options);
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
  return enumerateOfficialAcademyMedicAbilityV1(resolved.adapted.frozenState, {
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
      officialCapabilityExpansion:
        "current_zero_cost_medic_medpack_and_optical_flare_from_official_profile",
      frozenSemanticKernel:
        `${OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID}@${OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_VERSION}`,
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  }));
}

export function applyOfficialAcademyMedicAbilityV2(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.executorId !== OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_VERSION) {
    fail("ACADEMY_MEDIC_V2_ACTION_INVALID");
  }
  const expected = enumerateOfficialAcademyMedicAbilityV2(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
    throwOnError: true,
  }).map(executableAction).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("ACADEMY_MEDIC_V2_ACTION_STALE");
  const resolved = context(stateInput, options);
  const frozen = applyOfficialAcademyMedicAbilityV1(
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
    schemaVersion: "starcraft_tmg_official_academy_medic_ability_transition_v2",
    executorId: OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_VERSION,
    state,
    action: clone(actionInput),
    authorityLineageHash: resolved.authorityLineage.lineageHash,
    dataAdapterReceipt: clone(resolved.adapted.receipt),
    rulesTruth: "official_current_academy_medic_ability_exact_subset_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
