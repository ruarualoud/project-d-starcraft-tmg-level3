import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialUnitCardSupplyProfileV1,
  verifyOfficialUnitCardSupplyDataBundleV1,
} from "../source-data/official-unit-card-supply-data-bundle-v1.mjs";

const PROCEDURE_KINDS = new Set([
  "current_supply_value", "null_speed_mobility", "starting_supply_slots",
  "unit_card_layout",
]);
const MOBILITY_OPERATIONS = new Set([
  "charge", "close_ranks", "disengage", "involuntary_movement", "move", "place", "run",
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function nonEmpty(value, code) {
  const result = String(value || "").trim();
  if (!result) fail(code);
  return result;
}
function result(body) {
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function profileFor(input) {
  const bundle = input.unitCardSupplyDataBundle;
  verifyOfficialUnitCardSupplyDataBundleV1(bundle);
  const profile = getOfficialUnitCardSupplyProfileV1(bundle,
    nonEmpty(input.recordKey, "UNIT_CARD_SUPPLY_RECORD_REQUIRED"));
  if (input.sourceRecordHash !== undefined
    && input.sourceRecordHash !== profile.sourceRecordHash) {
    fail("UNIT_CARD_SUPPLY_SOURCE_RECORD_MISMATCH", profile.recordKey);
  }
  if (input.payloadHash !== undefined && input.payloadHash !== profile.payloadHash) {
    fail("UNIT_CARD_SUPPLY_PAYLOAD_MISMATCH", profile.recordKey);
  }
  if (input.profileHash !== undefined && input.profileHash !== profile.profileHash) {
    fail("UNIT_CARD_SUPPLY_PROFILE_HASH_MISMATCH", profile.recordKey);
  }
  return { bundle, profile };
}

export function resolveOfficialUnitCardLayoutV1(input = {}) {
  const { profile } = profileFor(input);
  if (input.rulesOwnedLayoutRequested !== true || input.clientSuppliedLayout !== undefined) {
    fail("UNIT_CARD_LAYOUT_REQUEST_INVALID");
  }
  return result({ schema: "starcraft_tmg_official_unit_card_layout_resolution_v1",
    recordKey: profile.recordKey, sourceRecordHash: profile.sourceRecordHash,
    payloadHash: profile.payloadHash, profileHash: profile.profileHash,
    unitId: profile.unitId, unitName: profile.unitName,
    factionTag: profile.factionTag, armySlotType: profile.armySlotType,
    sourceUnitType: profile.sourceUnitType,
    fieldableDuringArmyBuilding: profile.fieldableDuringArmyBuilding,
    phaseBoxes: structuredClone(profile.phaseBoxes), speed: structuredClone(profile.speed),
    supplyProfile: structuredClone(profile.supplyProfile),
    base: structuredClone(profile.base), combatRange: structuredClone(profile.combatRange),
    upgradeSide: structuredClone(profile.upgradeSide),
    rulesOwnedLayout: true, clientSuppliedLayoutAccepted: false, trainingTruth: false });
}

export function resolveOfficialCurrentSupplyValueV1(input = {}) {
  const { bundle, profile } = profileFor(input);
  if (input.rulesOwnedCurrentModelCountRequested !== true
    || input.clientSuppliedSupplyValue !== undefined) {
    fail("CURRENT_SUPPLY_VALUE_REQUEST_INVALID");
  }
  const currentModels = Number(input.currentModels);
  if (!Number.isSafeInteger(currentModels) || currentModels < 0) {
    fail("CURRENT_SUPPLY_MODEL_COUNT_INVALID");
  }
  if (currentModels === 0) {
    if (input.isDestroyed !== true) fail("CURRENT_SUPPLY_ZERO_MODELS_REQUIRES_DESTROYED");
    return result({ schema: "starcraft_tmg_official_current_supply_value_resolution_v1",
      recordKey: profile.recordKey, profileHash: profile.profileHash,
      currentModels: 0, isDestroyed: true, selectedTier: null, currentSupplyValue: 0,
      supplyUses: [...bundle.supplyUses], selectedByCurrentModelCount: true,
      updatedImmediatelyAfterCasualty: true, clientSuppliedSupplyValueAccepted: false,
      trainingTruth: false });
  }
  if (input.isDestroyed === true) fail("CURRENT_SUPPLY_DESTROYED_WITH_MODELS_INVALID");
  const matches = profile.supplyProfile.filter((row) => row.applicable
    && currentModels >= row.minimumModels && currentModels <= row.maximumModels);
  if (matches.length !== 1) fail("CURRENT_SUPPLY_MODEL_COUNT_UNMAPPED", profile.recordKey);
  const tier = matches[0];
  return result({ schema: "starcraft_tmg_official_current_supply_value_resolution_v1",
    recordKey: profile.recordKey, profileHash: profile.profileHash,
    currentModels, isDestroyed: false, selectedTier: tier.tier,
    selectedModelCountRange: { minimumModels: tier.minimumModels,
      maximumModels: tier.maximumModels },
    currentSupplyValue: tier.supply, supplyUses: [...bundle.supplyUses],
    selectedByCurrentModelCount: true, updatedImmediatelyAfterCasualty: true,
    clientSuppliedSupplyValueAccepted: false, trainingTruth: false });
}

export function resolveOfficialStartingSupplySlotsV1(input = {}) {
  const { profile } = profileFor(input);
  const compositionKind = nonEmpty(input.compositionKind,
    "STARTING_SUPPLY_COMPOSITION_REQUIRED");
  if (input.rulesOwnedCompositionRequested !== true
    || input.clientSuppliedStartingSupply !== undefined
    || input.clientSuppliedArmySlots !== undefined) {
    fail("STARTING_SUPPLY_SLOTS_REQUEST_INVALID");
  }
  const composition = profile.compositions.find((row) => row.kind === compositionKind);
  if (!composition) fail("STARTING_SUPPLY_COMPOSITION_UNAVAILABLE", compositionKind);
  const slotRequirement = profile.fieldableDuringArmyBuilding
    ? { type: profile.armySlotType, count: composition.startingSupply }
    : { type: null, count: 0 };
  return result({ schema: "starcraft_tmg_official_starting_supply_slots_resolution_v1",
    recordKey: profile.recordKey, profileHash: profile.profileHash,
    composition: structuredClone(composition),
    startingSupplyValue: composition.startingSupply,
    armySlotRequirement: slotRequirement,
    slotCountEqualsStartingSupply: profile.fieldableDuringArmyBuilding,
    fieldableDuringArmyBuilding: profile.fieldableDuringArmyBuilding,
    fullArmyEligibilityValidated: false, fullArmyEligibilityDeferredToSlice: 102,
    clientSuppliedStartingSupplyOrSlotsAccepted: false, trainingTruth: false });
}

export function resolveOfficialNullSpeedMobilityV1(input = {}) {
  const { profile } = profileFor(input);
  const operationKind = nonEmpty(input.operationKind, "UNIT_MOBILITY_OPERATION_REQUIRED");
  if (!MOBILITY_OPERATIONS.has(operationKind)
    || input.rulesOwnedMobilityCharacteristicRequested !== true
    || input.clientSuppliedMobilityPermission !== undefined) {
    fail("UNIT_MOBILITY_REQUEST_INVALID");
  }
  if (profile.speed.kind === "null") {
    fail("UNIT_CARD_NULL_SPEED_FORBIDS_MOVE_OR_REPOSITION", operationKind);
  }
  return result({ schema: "starcraft_tmg_official_unit_mobility_characteristic_resolution_v1",
    recordKey: profile.recordKey, profileHash: profile.profileHash, operationKind,
    speed: structuredClone(profile.speed), blockedByNullSpeed: false,
    operationOtherwiseLegal: null,
    additionalOperationRulesStillRequired: true,
    clientSuppliedMobilityPermissionAccepted: false, trainingTruth: false });
}

export function certifyOfficialUnitCardSupplyPlanV1(input = {}) {
  const bundle = input.unitCardSupplyDataBundle; const plan = input.plan;
  const procedureKind = String(input.procedureKind || "");
  verifyOfficialUnitCardSupplyDataBundleV1(bundle);
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult === true) fail("UNIT_CARD_SUPPLY_PLAN_INVALID");
  const planId = nonEmpty(plan.planId, "UNIT_CARD_SUPPLY_PLAN_INVALID");
  const shared = { ...plan.input, unitCardSupplyDataBundle: bundle };
  let resolution;
  if (procedureKind === "unit_card_layout") resolution = resolveOfficialUnitCardLayoutV1(shared);
  else if (procedureKind === "current_supply_value") {
    resolution = resolveOfficialCurrentSupplyValueV1(shared);
  } else if (procedureKind === "starting_supply_slots") {
    resolution = resolveOfficialStartingSupplySlotsV1(shared);
  } else resolution = resolveOfficialNullSpeedMobilityV1(shared);
  const body = { schema: "starcraft_tmg_official_unit_card_supply_plan_certificate_v1",
    planId, procedureKind, sideKey: String(plan.sideKey || ""),
    unitCardSupplyDataBundleHash: bundle.bundleHash, result: resolution,
    rulesOwnedInputsComplete: true, clientSuppliedResultAccepted: false,
    trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialUnitCardSupplyPlanCertificateV1(input = {}) {
  const rebuilt = certifyOfficialUnitCardSupplyPlanV1(input);
  if (!isDeepStrictEqual(rebuilt, input.certificate)) {
    fail("UNIT_CARD_SUPPLY_PLAN_CERTIFICATE_DRIFT");
  }
  return true;
}

export function officialUnitCardSupplyProcedureKindsV1() {
  return [...PROCEDURE_KINDS].sort();
}
