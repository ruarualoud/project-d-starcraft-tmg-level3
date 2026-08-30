import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialMarineStimpackActiveV1,
  enumerateOfficialMarineStimpackActiveV1,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_VERSION,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_TRANSITION_SCHEMA,
} from "./official-marine-stimpack-active-executor-v1.mjs";
import {
  createOfficialCurrentStimpackFrozenViewV2,
  restoreOfficialCurrentStimpackViewV2,
} from "./official-current-stimpack-data-adapter-v2.mjs";

export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ID =
  "authority.marine-stimpack-active-v3";
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_VERSION = "3.0.0";
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_TRANSITION_SCHEMA =
  OFFICIAL_MARINE_STIMPACK_ACTIVE_TRANSITION_SCHEMA;
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_OWNED_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-non-lethal-damage-accumulation:70938eb8369b",
  "rule-atom:singleton:core-11-non-lethal-no-casualty-removal:cb98ebd1c290",
]);
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_ACTION_ATOM_IDS =
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS;
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ATOM_IDS =
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS;
export { OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE };

function fail(code) { throw new Error(code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function executable(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function currentAction(action, receiptHash) {
  return { ...clone(action), executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_VERSION,
    dataAdapterReceiptHash: receiptHash };
}
function frozenAction(action) {
  const result = clone(action);
  delete result.dataAdapterReceiptHash;
  result.executorId = OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_VERSION;
  return result;
}

export function enumerateOfficialMarineStimpackActiveV3(state, options = {}) {
  let adapted;
  try { adapted = createOfficialCurrentStimpackFrozenViewV2(state, options); }
  catch (error) { if (options.throwOnError === true) throw error; return []; }
  return enumerateOfficialMarineStimpackActiveV1(adapted.frozenState, {
    ...options, matchBinding: adapted.frozenMatchBinding,
  }).map((candidate) => ({
    ...currentAction(candidate, adapted.receipt.adapterReceiptHash),
    details: { ...clone(candidate.details || {}),
      currentOfficialCapability: "single_model_stimpack_active_non_lethal_damage",
      dataAdapterReceiptHash: adapted.receipt.adapterReceiptHash,
      silentCompatibilityUsed: false, trainingTruth: false },
  }));
}

export function applyOfficialMarineStimpackActiveV3(state, action, options = {}) {
  if (!object(action)
    || action.actionType !== OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE
    || action.executorId !== OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ID
    || action.executorVersion !== OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_VERSION) {
    fail("STIMPACK_ACTIVE_V3_ACTION_INVALID");
  }
  const expected = enumerateOfficialMarineStimpackActiveV3(state, {
    ...options, sideKey: action.sideKey, throwOnError: true,
  }).map(executable).find((entry) => isDeepStrictEqual(entry, action));
  if (!expected) fail("STIMPACK_ACTIVE_V3_ACTION_STALE");
  const adapted = createOfficialCurrentStimpackFrozenViewV2(state, options);
  const applied = applyOfficialMarineStimpackActiveV1(
    adapted.frozenState,
    frozenAction(action),
    { ...options, matchBinding: adapted.frozenMatchBinding },
  );
  const restored = restoreOfficialCurrentStimpackViewV2(state, applied.state, adapted.receipt);
  const lastLog = restored.log?.at(-1);
  if (lastLog) lastLog.action = clone(action);
  return { ...applied,
    schemaVersion: "starcraft_tmg_official_marine_stimpack_active_transition_v3",
    executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_VERSION,
    state: restored, action: clone(action), dataAdapterReceipt: clone(adapted.receipt),
    rulesTruth: "official_current_single_model_stimpack_active_v3",
    silentCompatibilityUsed: false, trainingTruth: false };
}
