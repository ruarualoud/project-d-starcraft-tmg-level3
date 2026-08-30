import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialSpecialistLoadoutV1,
  enumerateOfficialSpecialistLoadoutV1,
  instantiateOfficialSpecialistLoadoutV1,
  OFFICIAL_SPECIALIST_LOADOUT_ACTION_ATOM_IDS,
  OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE,
  OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ATOM_IDS,
  OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID,
  OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_VERSION,
  OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS,
  OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND,
  OFFICIAL_SPECIALIST_LOADOUT_TRANSITION_SCHEMA,
} from "./official-specialist-loadout-executor-v1.mjs";
import {
  createOfficialCurrentSpecialistFrozenViewV2,
  restoreOfficialCurrentSpecialistViewV2,
} from "./official-current-specialist-data-adapter-v2.mjs";

export const OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID =
  "authority.specialist-loadout-v2";
export const OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_SPECIALIST_LOADOUT_V2_TRANSITION_SCHEMA =
  OFFICIAL_SPECIALIST_LOADOUT_TRANSITION_SCHEMA;
export const OFFICIAL_SPECIALIST_LOADOUT_V2_NEW_ATOM_IDS =
  OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS;
export const OFFICIAL_SPECIALIST_LOADOUT_V2_ACTION_ATOM_IDS =
  OFFICIAL_SPECIALIST_LOADOUT_ACTION_ATOM_IDS;
export const OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ATOM_IDS;
export { OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE, OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND };

function fail(code) { throw new Error(code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function currentPlan(plan, adapted) {
  const body = {
    ...clone(without(plan, ["specialistLoadoutHash"])),
    attackProfileCatalogueHash:
      adapted.receipt.currentAttackProfileCatalogueV2Hash,
    gameplayDataBundleHash: adapted.receipt.currentGameplayDataBundleHash,
  };
  return { ...body, specialistLoadoutHash: hashStarcraftTmgContract(body) };
}

function currentDomain(domain, adapted) {
  const core = {
    ...clone(without(domain, ["domainId"])),
    executorId: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION,
    constraints: {
      ...clone(domain.constraints),
      attackProfileCatalogueHash:
        adapted.receipt.currentAttackProfileCatalogueV2Hash,
      gameplayDataBundleHash: adapted.receipt.currentGameplayDataBundleHash,
      dataAdapterReceiptHash: adapted.receipt.adapterReceiptHash,
    },
  };
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

function currentAction(action, domain, adapted) {
  return {
    ...clone(action),
    domainId: domain.domainId,
    specialistLoadoutPlan: currentPlan(action.specialistLoadoutPlan, adapted),
    executorId: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION,
    dataAdapterReceiptHash: adapted.receipt.adapterReceiptHash,
  };
}

function assignmentsFromAction(action) {
  return {
    assignments: action.specialistLoadoutPlan.assignments.map((entry) => ({
      weaponName: entry.weaponName,
      modelId: entry.nominatedModelId,
    })),
  };
}

export function enumerateOfficialSpecialistLoadoutV2(state, options = {}) {
  let adapted;
  try { adapted = createOfficialCurrentSpecialistFrozenViewV2(state, options); }
  catch (error) {
    if (options.throwOnError === true) throw error;
    return { candidates: [], parameterDomains: [] };
  }
  const frozen = enumerateOfficialSpecialistLoadoutV1(adapted.frozenState, {
    ...options, matchBinding: adapted.frozenMatchBinding,
  });
  return {
    candidates: frozen.candidates.map((candidate) => ({
      ...candidate,
      executorId: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID,
      executorVersion: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION,
    })),
    parameterDomains: frozen.parameterDomains.map((domain) => currentDomain(domain, adapted)),
  };
}

export function instantiateOfficialSpecialistLoadoutV2(
  state,
  domain,
  parameters,
  options = {},
) {
  if (!object(domain)
    || domain.executorId !== OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION) {
    fail("SPECIALIST_LOADOUT_V2_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialSpecialistLoadoutV2(state, {
    ...options, sideKey: domain.sideKey, throwOnError: true,
  }).parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("SPECIALIST_LOADOUT_V2_PARAMETER_DOMAIN_STALE");
  }
  const adapted = createOfficialCurrentSpecialistFrozenViewV2(state, options);
  const frozenDomain = enumerateOfficialSpecialistLoadoutV1(adapted.frozenState, {
    ...options, sideKey: domain.sideKey, matchBinding: adapted.frozenMatchBinding,
  }).parameterDomains.find((entry) => entry.pieceId === domain.pieceId);
  const instantiated = instantiateOfficialSpecialistLoadoutV1(
    adapted.frozenState,
    frozenDomain,
    parameters,
    { ...options, matchBinding: adapted.frozenMatchBinding },
  );
  return {
    ...instantiated,
    action: currentAction(instantiated.action, domain, adapted),
    dataAdapterReceipt: clone(adapted.receipt),
  };
}

export function applyOfficialSpecialistLoadoutV2(state, action, options = {}) {
  if (!object(action)
    || action.actionType !== OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE
    || action.executorId !== OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID
    || action.executorVersion !== OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION) {
    fail("SPECIALIST_LOADOUT_V2_ACTION_INVALID");
  }
  const domain = enumerateOfficialSpecialistLoadoutV2(state, {
    ...options, sideKey: action.sideKey, throwOnError: true,
  }).parameterDomains.find((entry) => entry.domainId === action.domainId);
  if (!domain) fail("SPECIALIST_LOADOUT_V2_ACTION_STALE");
  const expected = instantiateOfficialSpecialistLoadoutV2(
    state, domain, assignmentsFromAction(action), options,
  ).action;
  if (!isDeepStrictEqual(expected, action)) fail("SPECIALIST_LOADOUT_V2_ACTION_MISMATCH");
  const adapted = createOfficialCurrentSpecialistFrozenViewV2(state, options);
  const frozenDomain = enumerateOfficialSpecialistLoadoutV1(adapted.frozenState, {
    ...options, sideKey: action.sideKey, matchBinding: adapted.frozenMatchBinding,
  }).parameterDomains.find((entry) => entry.pieceId === action.pieceId);
  const frozenAction = instantiateOfficialSpecialistLoadoutV1(
    adapted.frozenState,
    frozenDomain,
    assignmentsFromAction(action),
    { ...options, matchBinding: adapted.frozenMatchBinding },
  ).action;
  const applied = applyOfficialSpecialistLoadoutV1(
    adapted.frozenState,
    frozenAction,
    { ...options, matchBinding: adapted.frozenMatchBinding },
  );
  const restored = restoreOfficialCurrentSpecialistViewV2(
    state, applied.state, adapted.receipt,
  );
  const lastLog = restored.log?.at(-1);
  if (lastLog) lastLog.action = clone(action);
  return {
    ...applied,
    schemaVersion: "starcraft_tmg_official_specialist_loadout_transition_v2",
    executorId: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION,
    state: restored,
    action: clone(action),
    dataAdapterReceipt: clone(adapted.receipt),
    rulesTruth: "official_current_specialist_loadout_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
