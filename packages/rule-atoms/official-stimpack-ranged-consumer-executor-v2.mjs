import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialStimpackRangedConsumerV1,
  enumerateOfficialStimpackRangedConsumerV1,
  OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
  OFFICIAL_STIMPACK_PRECISION_PENDING_SCHEMA,
  OFFICIAL_STIMPACK_RANGED_ACTION_ATOM_IDS,
  OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE,
  OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
  OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION,
  OFFICIAL_STIMPACK_RANGED_TRANSITION_SCHEMA,
} from "./official-stimpack-ranged-consumer-executor-v1.mjs";
import {
  createOfficialCurrentStimpackFrozenViewV2,
  restoreOfficialCurrentStimpackViewV2,
} from "./official-current-stimpack-data-adapter-v2.mjs";

export const OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID =
  "authority.stimpack-ranged-consumer-v2";
export const OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_STIMPACK_RANGED_V2_TRANSITION_SCHEMA =
  OFFICIAL_STIMPACK_RANGED_TRANSITION_SCHEMA;
export const OFFICIAL_STIMPACK_RANGED_V2_OWNED_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-non-lethal-standard-damage-trigger:79458dcf31db",
  "rule-atom:singleton:core-11-precision-failed-dice-conversion:b540b4f0a7c2",
]);
export const OFFICIAL_STIMPACK_RANGED_V2_ACTION_ATOM_IDS =
  OFFICIAL_STIMPACK_RANGED_ACTION_ATOM_IDS;
export const OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_STIMPACK_RANGED_ACTION_ATOM_IDS;
export {
  OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
  OFFICIAL_STIMPACK_PRECISION_PENDING_SCHEMA,
  OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE,
};

function fail(code) { throw new Error(code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function executable(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function currentAction(action, receiptHash) {
  return { ...clone(action), executorId: OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_VERSION,
    dataAdapterReceiptHash: receiptHash };
}
function frozenAction(action) {
  const result = clone(action);
  delete result.dataAdapterReceiptHash;
  result.executorId = OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION;
  return result;
}

export function enumerateOfficialStimpackRangedConsumerV2(state, options = {}) {
  let adapted;
  try { adapted = createOfficialCurrentStimpackFrozenViewV2(state, options); }
  catch (error) { if (options.throwOnError === true) throw error; return []; }
  return enumerateOfficialStimpackRangedConsumerV1(adapted.frozenState, {
    ...options, matchBinding: adapted.frozenMatchBinding,
  }).map((candidate) => ({
    ...currentAction(candidate, adapted.receipt.adapterReceiptHash),
    details: { ...clone(candidate.details || {}),
      currentOfficialCapability: "stimpack_precision_and_later_standard_damage",
      dataAdapterReceiptHash: adapted.receipt.adapterReceiptHash,
      silentCompatibilityUsed: false, trainingTruth: false },
  }));
}

export function applyOfficialStimpackRangedConsumerV2(state, action, options = {}) {
  if (!object(action)
    || ![
      OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE,
      OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
    ].includes(action.actionType)
    || action.executorId !== OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID
    || action.executorVersion !== OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_VERSION) {
    fail("STIMPACK_RANGED_V2_ACTION_INVALID");
  }
  const expected = enumerateOfficialStimpackRangedConsumerV2(state, {
    ...options, sideKey: action.sideKey, throwOnError: true,
  }).map(executable).find((entry) => isDeepStrictEqual(entry, action));
  if (!expected) fail("STIMPACK_RANGED_V2_ACTION_STALE");
  const adapted = createOfficialCurrentStimpackFrozenViewV2(state, options);
  const applied = applyOfficialStimpackRangedConsumerV1(
    adapted.frozenState,
    frozenAction(action),
    { ...options, matchBinding: adapted.frozenMatchBinding },
  );
  const restored = restoreOfficialCurrentStimpackViewV2(state, applied.state, adapted.receipt);
  const lastLog = restored.log?.at(-1);
  if (lastLog) lastLog.action = clone(action);
  return { ...applied,
    schemaVersion: "starcraft_tmg_official_stimpack_ranged_transition_v2",
    executorId: OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_VERSION,
    state: restored, action: clone(action), dataAdapterReceipt: clone(adapted.receipt),
    rulesTruth: "official_current_stimpack_ranged_consumer_v2",
    silentCompatibilityUsed: false, trainingTruth: false };
}
