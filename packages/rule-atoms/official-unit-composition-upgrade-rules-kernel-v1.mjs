import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialPurchasableUpgradeProfileV1,
  getOfficialUnitCompositionOptionProfileV1,
  getOfficialUnitCompositionReferenceProfileV1,
  verifyOfficialUnitCompositionUpgradeDataBundleV1,
} from "../source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { resolveOfficialArmyResourceBudgetV1 } from
  "./official-army-resource-budget-rules-kernel-v1.mjs";

const PROCEDURE_KINDS = new Set([
  "unit_composition_selection",
  "unit_upgrade_selection",
  "complete_army_composition_upgrade_audit",
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function result(body) {
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function exactUniqueModelIds(value, count, code) {
  if (!Array.isArray(value) || value.length !== count || value.length > 64) fail(code);
  const ids = value.map((entry) => nonEmpty(entry, code));
  if (new Set(ids).size !== ids.length) fail(code);
  return ids.sort();
}

export function resolveOfficialUnitCompositionSelectionV1(input = {}) {
  const bundle = input.unitCompositionUpgradeDataBundle;
  verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle);
  if (input.procedureKind !== "unit_composition_selection"
    || input.rulesOwnedCompositionRequested !== true
    || input.exactlyOneCompositionSelected !== true
    || input.clientSuppliedModelCount !== undefined
    || input.clientSuppliedStartingSupply !== undefined
    || input.clientSuppliedOccupiedSlots !== undefined
    || input.clientSuppliedMineralCost !== undefined) {
    fail("UNIT_COMPOSITION_SELECTION_REQUEST_INVALID");
  }
  const unitInstanceId = nonEmpty(input.unitInstanceId,
    "UNIT_COMPOSITION_INSTANCE_REQUIRED");
  const recordKey = nonEmpty(input.recordKey, "UNIT_COMPOSITION_RECORD_REQUIRED");
  const unit = getOfficialUnitCompositionReferenceProfileV1(bundle, recordKey);
  const option = getOfficialUnitCompositionOptionProfileV1(bundle,
    nonEmpty(input.compositionProfileId, "UNIT_COMPOSITION_OPTION_REQUIRED"));
  if (option.recordKey !== recordKey
    || input.sourceRecordHash !== unit.sourceRecordHash
    || input.payloadHash !== unit.payloadHash
    || input.sourceUnitProfileHash !== unit.sourceUnitProfileHash
    || input.unitCompositionReferenceProfileHash !== unit.profileHash
    || input.compositionProfileHash !== option.profileHash) {
    fail("UNIT_COMPOSITION_SOURCE_PROFILE_INVALID", unitInstanceId);
  }
  const startingModelIds = exactUniqueModelIds(input.startingModelIds,
    option.startingModels, "UNIT_COMPOSITION_STARTING_MODEL_SET_INVALID");
  return result({ schema: "starcraft_tmg_official_unit_composition_selection_v1",
    procedureKind: "unit_composition_selection", unitInstanceId,
    recordKey: unit.recordKey, unitId: unit.unitId, unitName: unit.unitName,
    factionTag: unit.factionTag, armySlotType: unit.armySlotType,
    compositionProfileId: option.compositionProfileId,
    compositionKind: option.compositionKind,
    startingModelIds, startingModelCount: option.startingModels,
    startingSupply: option.startingSupply,
    occupiedArmySlots: option.occupiedArmySlots,
    mineralCost: option.mineralCost,
    armyReferenceMineralCost: option.armyReferenceMineralCost,
    mineralCostReconciliation: option.mineralCostReconciliation,
    sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
    sourceUnitProfileHash: unit.sourceUnitProfileHash,
    unitCompositionReferenceProfileHash: unit.profileHash,
    compositionProfileHash: option.profileHash,
    sourceBudgetProfileHash: option.sourceBudgetProfileHash,
    exactlyOneCompositionSelected: true,
    unlistedModelCountAccepted: false,
    startingSupplyEqualsOccupiedArmySlots:
      option.startingSupply === option.occupiedArmySlots,
    rulesOwnedModelCountSupplySlotsAndCost: true,
    clientSuppliedModelCountSupplySlotsOrCostAccepted: false,
    trainingTruth: false });
}

export function resolveOfficialUnitUpgradeSelectionV1(input = {}) {
  const bundle = input.unitCompositionUpgradeDataBundle;
  verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle);
  if (input.procedureKind !== "unit_upgrade_selection"
    || input.upgradeSelectionSetComplete !== true
    || input.rulesOwnedUpgradeApplicationRequested !== true
    || input.clientSuppliedUpgradeCost !== undefined
    || input.clientSuppliedApplication !== undefined
    || !object(input.unitCompositionInput)
    || !Array.isArray(input.selectedUpgrades)
    || input.selectedUpgrades.length > 64) {
    fail("UNIT_UPGRADE_SELECTION_REQUEST_INVALID");
  }
  const composition = resolveOfficialUnitCompositionSelectionV1({
    ...input.unitCompositionInput, procedureKind: "unit_composition_selection",
    unitCompositionUpgradeDataBundle: bundle,
  });
  const instanceIds = new Set(); const profileIds = new Set();
  const specialistModelIds = new Set();
  const selectedUpgrades = [...input.selectedUpgrades]
    .sort((left, right) => String(left?.upgradeInstanceId || "")
      .localeCompare(String(right?.upgradeInstanceId || "")))
    .map((raw) => {
      const upgradeInstanceId = nonEmpty(raw?.upgradeInstanceId,
        "UNIT_UPGRADE_INSTANCE_REQUIRED");
      if (instanceIds.has(upgradeInstanceId)) {
        fail("UNIT_UPGRADE_INSTANCE_DUPLICATE", upgradeInstanceId);
      }
      instanceIds.add(upgradeInstanceId);
      const profileValue = getOfficialPurchasableUpgradeProfileV1(bundle,
        nonEmpty(raw?.purchasableUpgradeProfileId,
          "UNIT_PURCHASABLE_UPGRADE_PROFILE_REQUIRED"));
      if (profileValue.recordKey !== composition.recordKey
        || raw.profileHash !== profileValue.profileHash
        || raw.sourceDefinitionHash !== profileValue.sourceDefinitionHash
        || raw.sourceBudgetProfileHash !== profileValue.sourceBudgetProfileHash) {
        fail("UNIT_PURCHASABLE_UPGRADE_SOURCE_PROFILE_INVALID", upgradeInstanceId);
      }
      if (profileIds.has(profileValue.purchasableUpgradeProfileId)) {
        fail("UNIT_UPGRADE_ENTRY_DUPLICATE", profileValue.purchasableUpgradeProfileId);
      }
      profileIds.add(profileValue.purchasableUpgradeProfileId);
      let nominatedModelId = null; let appliedModelIds;
      if (profileValue.specialistAssignmentRequired) {
        nominatedModelId = nonEmpty(raw.nominatedModelId,
          "UNIT_SPECIALIST_MODEL_REQUIRED");
        if (!composition.startingModelIds.includes(nominatedModelId)) {
          fail("UNIT_SPECIALIST_MODEL_NOT_IN_UNIT", nominatedModelId);
        }
        if (specialistModelIds.has(nominatedModelId)) {
          fail("UNIT_SPECIALIST_MODEL_REUSED", nominatedModelId);
        }
        specialistModelIds.add(nominatedModelId);
        appliedModelIds = [nominatedModelId];
      } else {
        if (raw.nominatedModelId !== undefined && raw.nominatedModelId !== null) {
          fail("UNIT_WIDE_UPGRADE_SPECIALIST_NOMINATION_FORBIDDEN", upgradeInstanceId);
        }
        appliedModelIds = [...composition.startingModelIds];
      }
      return { upgradeInstanceId,
        purchasableUpgradeProfileId: profileValue.purchasableUpgradeProfileId,
        upgradeName: profileValue.upgradeName, phase: profileValue.phase,
        applicationKind: profileValue.applicationKind,
        nominatedModelId, appliedModelIds,
        replacementTargetName: profileValue.replacementTargetName,
        mineralCost:
          profileValue.mineralCostByComposition[composition.compositionKind],
        profileHash: profileValue.profileHash,
        sourceDefinitionHash: profileValue.sourceDefinitionHash,
        sourceBudgetProfileId: profileValue.sourceBudgetProfileId,
        sourceBudgetProfileHash: profileValue.sourceBudgetProfileHash };
    });
  return result({ schema: "starcraft_tmg_official_unit_upgrade_selection_v1",
    procedureKind: "unit_upgrade_selection",
    unitInstanceId: composition.unitInstanceId,
    recordKey: composition.recordKey, unitId: composition.unitId,
    unitName: composition.unitName,
    unitCompositionResult: clone(composition),
    selectedUpgrades,
    selectedUpgradeCount: selectedUpgrades.length,
    specialistUpgradeCount: selectedUpgrades.filter((entry) => (
      entry.applicationKind === "specialist_one_model")).length,
    unitWideUpgradeCount: selectedUpgrades.filter((entry) => (
      entry.applicationKind === "unit_wide")).length,
    mineralCost: selectedUpgrades.reduce((sum, entry) => sum + entry.mineralCost, 0),
    upgradeSelectionSetComplete: true,
    onlyPart12ListedUpgradeEntriesPurchased: true,
    sameUpgradeEntryPurchasedMoreThanOnce: false,
    unitWideDefaultAppliedToEveryStartingModel: selectedUpgrades
      .filter((entry) => entry.applicationKind === "unit_wide")
      .every((entry) => entry.appliedModelIds.length === composition.startingModelCount),
    specialistAssignedToExactlyOneStartingModel: selectedUpgrades
      .filter((entry) => entry.applicationKind === "specialist_one_model")
      .every((entry) => entry.appliedModelIds.length === 1),
    differentSpecialistsAssignedToDifferentModels: true,
    rulesOwnedUpgradeCostsAndApplication: true,
    clientSuppliedUpgradeCostOrApplicationAccepted: false,
    trainingTruth: false });
}

export function resolveOfficialCompleteArmyCompositionUpgradeAuditV1(input = {}) {
  const bundle = input.unitCompositionUpgradeDataBundle;
  verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle);
  if (input.procedureKind !== "complete_army_composition_upgrade_audit"
    || input.compositionUpgradeUnitSetComplete !== true
    || input.rulesOwnedCompleteArmyAuditRequested !== true
    || !Array.isArray(input.unitSelections) || input.unitSelections.length === 0
    || input.unitSelections.length > 256
    || !object(input.armyResourceBudgetInput)
    || input.armyResourceBudgetInput.unitInstances !== undefined
    || input.armyResourceBudgetInput.upgradeInstances !== undefined
    || input.clientSuppliedCompositionUpgradeTotals !== undefined) {
    fail("COMPLETE_ARMY_COMPOSITION_UPGRADE_AUDIT_REQUEST_INVALID");
  }
  const unitInstanceIds = new Set();
  const units = [...input.unitSelections]
    .sort((left, right) => String(left?.unitCompositionInput?.unitInstanceId || "")
      .localeCompare(String(right?.unitCompositionInput?.unitInstanceId || "")))
    .map((raw) => {
      const resolved = resolveOfficialUnitUpgradeSelectionV1({
        procedureKind: "unit_upgrade_selection",
        unitCompositionUpgradeDataBundle: bundle,
        unitCompositionInput: raw?.unitCompositionInput,
        selectedUpgrades: raw?.selectedUpgrades,
        upgradeSelectionSetComplete: raw?.upgradeSelectionSetComplete,
        rulesOwnedUpgradeApplicationRequested: true,
      });
      if (unitInstanceIds.has(resolved.unitInstanceId)) {
        fail("COMPLETE_ARMY_UNIT_INSTANCE_DUPLICATE", resolved.unitInstanceId);
      }
      unitInstanceIds.add(resolved.unitInstanceId);
      return resolved;
    });
  const factionBundle = bundle.armyResourceBudgetDataBundle
    .factionArmyEligibilityDataBundle;
  const unitInstances = units.map((entry) => {
    const composition = entry.unitCompositionResult;
    const candidate = factionBundle.armyCandidateProfiles.find((profileValue) => (
      profileValue.recordKey === entry.recordKey));
    if (!candidate || !candidate.fieldableDuringArmyBuilding) {
      fail("COMPLETE_ARMY_UNIT_NOT_FIELDABLE", entry.recordKey);
    }
    return { unitInstanceId: entry.unitInstanceId, recordKey: entry.recordKey,
      compositionKind: composition.compositionKind,
      budgetProfileId: composition.compositionProfileId,
      sourceRecordHash: composition.sourceRecordHash,
      payloadHash: composition.payloadHash,
      budgetProfileHash: composition.sourceBudgetProfileHash,
      candidateProfileHash: candidate.profileHash };
  });
  const upgradeInstances = units.flatMap((entry) => entry.selectedUpgrades.map((upgrade) => ({
    upgradeInstanceId: upgrade.upgradeInstanceId,
    unitInstanceId: entry.unitInstanceId,
    budgetProfileId: upgrade.sourceBudgetProfileId,
    sourceRecordHash: entry.unitCompositionResult.sourceRecordHash,
    payloadHash: entry.unitCompositionResult.payloadHash,
    budgetProfileHash: upgrade.sourceBudgetProfileHash,
  })));
  const budget = resolveOfficialArmyResourceBudgetV1({
    ...input.armyResourceBudgetInput,
    procedureKind: "army_resource_budget",
    armyResourceBudgetDataBundle: bundle.armyResourceBudgetDataBundle,
    unitInstances, upgradeInstances,
  });
  return result({ schema:
    "starcraft_tmg_official_complete_army_composition_upgrade_audit_v1",
  procedureKind: "complete_army_composition_upgrade_audit",
  sideKey: budget.sideKey, units: units.map((entry) => clone(entry)),
  unitCount: units.length,
  startingModelCount: units.reduce((sum, entry) => (
    sum + entry.unitCompositionResult.startingModelCount), 0),
  startingSupply: units.reduce((sum, entry) => (
    sum + entry.unitCompositionResult.startingSupply), 0),
  selectedUpgradeCount: units.reduce((sum, entry) => (
    sum + entry.selectedUpgradeCount), 0),
  armyResourceBudgetResult: clone(budget),
  armyResourceBudgetResultHash: budget.resultHash,
  compositionUpgradeUnitSetComplete: true,
  fullFactionTagSlotAndUniqueLegalityValidated:
    budget.fullFactionTagSlotAndUniqueLegalityValidated,
  fullResourceArithmeticValidated: budget.fullResourceArithmeticValidated,
  fullCompositionUpgradeAndFieldingLegalityValidated: true,
  exactlyOneListedCompositionPerUnitValidated: true,
  unlistedModelCountsRejected: true,
  startingSupplySlotOccupancyValidated: true,
  onlyPart12ListedUpgradesPurchased: true,
  distinctUpgradeEntryAndSpecialistAssignmentValidated: true,
  rulesOwnedCountsSupplySlotsCostsAndUpgradeApplication: true,
  clientSuppliedCompositionUpgradeTotalsAccepted: false,
  unitEquipmentAndRosterDisclosureIncluded: false,
  unitEquipmentAndRosterDisclosureDeferredToSlice: 105,
  trainingTruth: false });
}

export function certifyOfficialUnitCompositionUpgradePlanV1(input = {}) {
  const bundle = input.unitCompositionUpgradeDataBundle;
  const procedureKind = String(input.procedureKind || "");
  const plan = input.plan;
  verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle);
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind
    || !nonEmpty(plan.planId, "UNIT_COMPOSITION_UPGRADE_PLAN_ID_REQUIRED")
    || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult !== false || !object(plan.input)) {
    fail("UNIT_COMPOSITION_UPGRADE_PLAN_INVALID");
  }
  let resolved;
  if (procedureKind === "unit_composition_selection") {
    resolved = resolveOfficialUnitCompositionSelectionV1({ ...plan.input,
      procedureKind, unitCompositionUpgradeDataBundle: bundle });
  } else if (procedureKind === "unit_upgrade_selection") {
    resolved = resolveOfficialUnitUpgradeSelectionV1({ ...plan.input,
      procedureKind, unitCompositionUpgradeDataBundle: bundle });
  } else {
    resolved = resolveOfficialCompleteArmyCompositionUpgradeAuditV1({ ...plan.input,
      procedureKind, unitCompositionUpgradeDataBundle: bundle });
  }
  const body = { schema:
    "starcraft_tmg_official_unit_composition_upgrade_plan_certificate_v1",
  planId: plan.planId, procedureKind, inputHash: hashStarcraftTmgContract(plan.input),
  result: clone(resolved), rulesOwnedInputsComplete: true,
  clientSuppliedResultAccepted: false, trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialUnitCompositionUpgradeResultV1(value, schema) {
  if (!object(value) || value.schema !== schema
    || value.resultHash !== hashStarcraftTmgContract(without(value, ["resultHash"]))) {
    fail("UNIT_COMPOSITION_UPGRADE_RESULT_INVALID");
  }
  return true;
}

export function officialUnitCompositionUpgradeProcedureKindsV1() {
  return [...PROCEDURE_KINDS].sort();
}
