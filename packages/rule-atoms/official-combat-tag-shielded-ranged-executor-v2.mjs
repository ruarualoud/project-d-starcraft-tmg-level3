import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialCombatTagShieldedRangedV1,
  enumerateOfficialCombatTagShieldedRangedV1,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_ATOM_IDS,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ATOM_IDS,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_VERSION,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_NEW_ATOM_IDS,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_TRANSITION_SCHEMA,
} from "./official-combat-tag-shielded-ranged-executor-v1.mjs";
import {
  createOfficialCurrentCombatTagShieldedFrozenViewV2,
  restoreOfficialCurrentCombatTagShieldedViewV2,
} from "./official-current-combat-tag-shielded-data-adapter-v2.mjs";

export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID =
  "authority.combat-tag-shielded-ranged-v2";
export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_TRANSITION_SCHEMA =
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_TRANSITION_SCHEMA;
export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_NEW_ATOM_IDS =
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_NEW_ATOM_IDS;
export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_ACTION_ATOM_IDS =
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_ATOM_IDS;
export const OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ATOM_IDS;
export { OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE };

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
    executorId: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_VERSION,
    dataAdapterReceiptHash: adapterReceiptHash,
  };
}

function frozenAction(action) {
  const result = clone(action);
  delete result.dataAdapterReceiptHash;
  result.executorId = OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_VERSION;
  return result;
}

export function enumerateOfficialCombatTagShieldedRangedV2(state, options = {}) {
  let adapted;
  try {
    adapted = createOfficialCurrentCombatTagShieldedFrozenViewV2(state, options);
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
  return enumerateOfficialCombatTagShieldedRangedV1(adapted.frozenState, {
    ...options,
    matchBinding: adapted.frozenMatchBinding,
  }).map((candidate) => ({
    ...currentAction(candidate, adapted.receipt.adapterReceiptHash),
    details: {
      ...clone(candidate.details || {}),
      dataAdapterReceiptHash: adapted.receipt.adapterReceiptHash,
      currentOfficialCapability: "combat_tag_targeting_and_shielded_damage",
      frozenSemanticKernel:
        `${OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID}`
          + `@${OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_VERSION}`,
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  }));
}

export function applyOfficialCombatTagShieldedRangedV2(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_VERSION) {
    fail("COMBAT_TAG_SHIELDED_V2_ACTION_INVALID");
  }
  const expected = enumerateOfficialCombatTagShieldedRangedV2(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
    throwOnError: true,
  }).map(executableAction).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("COMBAT_TAG_SHIELDED_V2_ACTION_STALE");
  const adapted = createOfficialCurrentCombatTagShieldedFrozenViewV2(stateInput, options);
  const frozen = applyOfficialCombatTagShieldedRangedV1(
    adapted.frozenState,
    frozenAction(actionInput),
    {
      ...options,
      matchBinding: adapted.frozenMatchBinding,
    },
  );
  const state = restoreOfficialCurrentCombatTagShieldedViewV2(
    stateInput,
    frozen.state,
    adapted.receipt,
  );
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  return {
    ...frozen,
    schemaVersion: "starcraft_tmg_official_combat_tag_shielded_ranged_transition_v2",
    executorId: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_VERSION,
    state,
    action: clone(actionInput),
    dataAdapterReceipt: clone(adapted.receipt),
    rulesTruth: "official_current_combat_tag_and_shielded_exact_subset_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
