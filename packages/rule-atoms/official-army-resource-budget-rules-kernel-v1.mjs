import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCardBuildPaymentProfileV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import {
  getOfficialTacticalBudgetProfileV1,
  getOfficialUnitCompositionBudgetProfileV1,
  getOfficialUpgradeBudgetProfileV1,
  verifyOfficialArmyResourceBudgetDataBundleV1,
} from "../source-data/official-army-resource-budget-data-bundle-v1.mjs";
import { getOfficialEngagementScaleV1 } from
  "../source-data/official-faction-army-eligibility-data-bundle-v1.mjs";
import { resolveOfficialTacticalCardPurchaseV1 } from
  "./official-card-build-payment-rules-kernel-v1.mjs";
import { resolveOfficialArmySlotAuditV1 } from
  "./official-faction-army-eligibility-rules-kernel-v1.mjs";

const PROCEDURE_KINDS = new Set([
  "army_card_open_information", "army_resource_budget", "team_mineral_budget",
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function nonNegativeInteger(value, code, detail = "") {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) fail(code, detail);
  return number;
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function result(body) {
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function verifyResult(value, schema, code) {
  if (!object(value) || value.schema !== schema
    || value.resultHash !== hashStarcraftTmgContract(without(value, ["resultHash"]))) {
    fail(code);
  }
  return value;
}
function verifyProfile(raw, profile, profileHashField, code) {
  if (raw?.sourceRecordHash !== profile.sourceRecordHash
    || raw?.payloadHash !== profile.payloadHash
    || raw?.[profileHashField] !== profile.budgetProfileHash) {
    fail(code, profile.budgetProfileId || profile.recordKey);
  }
}
function validateScaleBudget(scale, mineralBudget) {
  if (scale.mineralLimit.kind === "maximum"
    && mineralBudget > scale.mineralLimit.maximumInclusive) {
    fail("ARMY_MINERAL_BUDGET_EXCEEDS_SCALE", scale.scaleId);
  }
  if (scale.mineralLimit.kind === "minimum_open"
    && mineralBudget < scale.mineralLimit.minimumInclusive) {
    fail("ARMY_MINERAL_BUDGET_BELOW_SCALE", scale.scaleId);
  }
}

function resolveArmyResourceBudget(input = {}, options = {}) {
  const bundle = input.armyResourceBudgetDataBundle;
  verifyOfficialArmyResourceBudgetDataBundleV1(bundle);
  if (input.procedureKind !== "army_resource_budget"
    || input.armyPurchaseSetComplete !== true
    || input.rulesOwnedResourceArithmeticRequested !== true
    || input.unspentResourceDisposition !== "lost"
    || input.resourceConversionRequested !== false
    || input.clientSuppliedCosts !== undefined
    || input.clientSuppliedTotals !== undefined
    || !object(input.factionCard)
    || !Array.isArray(input.tacticalCardInstances)
    || !Array.isArray(input.unitInstances)
    || !Array.isArray(input.upgradeInstances)
    || input.tacticalCardInstances.length + input.unitInstances.length
      + input.upgradeInstances.length > 1024) {
    fail("ARMY_RESOURCE_BUDGET_REQUEST_INVALID");
  }
  const sideKey = nonEmpty(input.sideKey, "ARMY_RESOURCE_BUDGET_SIDE_REQUIRED");
  const mineralBudget = nonNegativeInteger(input.mineralBudget,
    "ARMY_MINERAL_BUDGET_INVALID");
  const scale = getOfficialEngagementScaleV1(
    bundle.factionArmyEligibilityDataBundle, nonEmpty(input.scaleId,
      "ARMY_RESOURCE_BUDGET_SCALE_REQUIRED"));
  if (options.teamAllocationMode !== true) validateScaleBudget(scale, mineralBudget);

  const tacticalIds = new Set(); const tacticalCopyCounts = new Map();
  const tacticalRows = [...input.tacticalCardInstances]
    .sort((left, right) => String(left?.cardInstanceId || "")
      .localeCompare(String(right?.cardInstanceId || "")))
    .map((raw) => {
      const cardInstanceId = nonEmpty(raw?.cardInstanceId,
        "ARMY_TACTICAL_CARD_INSTANCE_INVALID");
      if (tacticalIds.has(cardInstanceId)) {
        fail("ARMY_TACTICAL_CARD_INSTANCE_DUPLICATE", cardInstanceId);
      }
      tacticalIds.add(cardInstanceId);
      const profile = getOfficialTacticalBudgetProfileV1(bundle,
        nonEmpty(raw?.recordKey, "ARMY_TACTICAL_BUDGET_PROFILE_INVALID"));
      verifyProfile(raw, profile, "budgetProfileHash",
        "ARMY_TACTICAL_BUDGET_PROFILE_INVALID");
      const existingCopyCount = tacticalCopyCounts.get(profile.cardId) || 0;
      const purchase = resolveOfficialTacticalCardPurchaseV1({
        cardDataBundle: bundle.factionArmyEligibilityDataBundle.cardDataBundle,
        recordKey: profile.recordKey, existingCopyCount,
        paymentResource: "vespene_gas",
        rulesOwnedCostAndSlotsRequested: true,
      });
      tacticalCopyCounts.set(profile.cardId, existingCopyCount + 1);
      return { cardInstanceId, recordKey: profile.recordKey, cardId: profile.cardId,
        cardName: profile.cardName, sourceRecordHash: profile.sourceRecordHash,
        payloadHash: profile.payloadHash, budgetProfileHash: profile.budgetProfileHash,
        sourceCardProfileHash: profile.sourceCardProfileHash,
        vespeneGasCost: purchase.vespeneGasCost,
        armySlotsAdded: clone(purchase.armySlotsAdded),
        tacticalPurchaseResultHash: purchase.resultHash };
    });

  const unitIds = new Set(); const unitById = new Map();
  const unitRows = [...input.unitInstances]
    .sort((left, right) => String(left?.unitInstanceId || "")
      .localeCompare(String(right?.unitInstanceId || "")))
    .map((raw) => {
      const unitInstanceId = nonEmpty(raw?.unitInstanceId,
        "ARMY_UNIT_INSTANCE_INVALID");
      if (unitIds.has(unitInstanceId)) fail("ARMY_UNIT_INSTANCE_DUPLICATE", unitInstanceId);
      unitIds.add(unitInstanceId);
      const budgetProfileId = nonEmpty(raw?.budgetProfileId,
        "ARMY_UNIT_BUDGET_PROFILE_INVALID");
      const profile = getOfficialUnitCompositionBudgetProfileV1(bundle, budgetProfileId);
      verifyProfile(raw, profile, "budgetProfileHash",
        "ARMY_UNIT_BUDGET_PROFILE_INVALID");
      if (raw.recordKey !== profile.recordKey
        || raw.compositionKind !== profile.compositionKind) {
        fail("ARMY_UNIT_BUDGET_PROFILE_INVALID", budgetProfileId);
      }
      const row = { unitInstanceId, budgetProfileId, recordKey: profile.recordKey,
        unitId: profile.unitId, unitName: profile.unitName,
        compositionKind: profile.compositionKind,
        startingModels: profile.startingModels, startingSupply: profile.startingSupply,
        mineralCost: profile.mineralCost, sourceRecordHash: profile.sourceRecordHash,
        payloadHash: profile.payloadHash,
        sourceUnitProfileHash: profile.sourceUnitProfileHash,
        budgetProfileHash: profile.budgetProfileHash,
        candidateProfileHash: nonEmpty(raw.candidateProfileHash,
          "ARMY_UNIT_CANDIDATE_PROFILE_INVALID") };
      unitById.set(unitInstanceId, row);
      return row;
    });

  const upgradeIds = new Set(); const upgradePerUnit = new Set();
  const upgradeRows = [...input.upgradeInstances]
    .sort((left, right) => String(left?.upgradeInstanceId || "")
      .localeCompare(String(right?.upgradeInstanceId || "")))
    .map((raw) => {
      const upgradeInstanceId = nonEmpty(raw?.upgradeInstanceId,
        "ARMY_UPGRADE_INSTANCE_INVALID");
      if (upgradeIds.has(upgradeInstanceId)) {
        fail("ARMY_UPGRADE_INSTANCE_DUPLICATE", upgradeInstanceId);
      }
      upgradeIds.add(upgradeInstanceId);
      const unitInstanceId = nonEmpty(raw?.unitInstanceId,
        "ARMY_UPGRADE_UNIT_INSTANCE_REQUIRED");
      const unit = unitById.get(unitInstanceId);
      if (!unit) fail("ARMY_UPGRADE_UNIT_NOT_SELECTED", unitInstanceId);
      const profile = getOfficialUpgradeBudgetProfileV1(bundle,
        nonEmpty(raw?.budgetProfileId, "ARMY_UPGRADE_BUDGET_PROFILE_INVALID"));
      verifyProfile(raw, profile, "budgetProfileHash",
        "ARMY_UPGRADE_BUDGET_PROFILE_INVALID");
      if (profile.recordKey !== unit.recordKey) {
        fail("ARMY_UPGRADE_UNIT_PROFILE_MISMATCH", upgradeInstanceId);
      }
      const duplicateKey = `${unitInstanceId}:${profile.budgetProfileId}`;
      if (upgradePerUnit.has(duplicateKey)) {
        fail("ARMY_UPGRADE_BUDGET_LINE_DUPLICATE", duplicateKey);
      }
      upgradePerUnit.add(duplicateKey);
      return { upgradeInstanceId, unitInstanceId,
        budgetProfileId: profile.budgetProfileId, recordKey: profile.recordKey,
        upgradeIndex: profile.upgradeIndex, upgradeName: profile.upgradeName,
        phase: profile.phase,
        mineralCost: profile.mineralCostByComposition[unit.compositionKind],
        sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
        definitionHash: profile.definitionHash,
        budgetProfileHash: profile.budgetProfileHash };
    });

  const slotAudit = resolveOfficialArmySlotAuditV1({
    procedureKind: "army_slot_audit",
    factionArmyEligibilityDataBundle: bundle.factionArmyEligibilityDataBundle,
    factionCard: input.factionCard,
    tacticalCardInstances: tacticalRows.map((entry) => {
      const candidate = bundle.factionArmyEligibilityDataBundle.armyCandidateProfiles
        .find((profile) => profile.recordKey === entry.recordKey);
      return { cardInstanceId: entry.cardInstanceId, recordKey: entry.recordKey,
        sourceRecordHash: entry.sourceRecordHash, payloadHash: entry.payloadHash,
        candidateProfileHash: candidate?.profileHash };
    }),
    unitInstances: unitRows.map((entry) => ({
      unitInstanceId: entry.unitInstanceId, recordKey: entry.recordKey,
      sourceRecordHash: entry.sourceRecordHash, payloadHash: entry.payloadHash,
      candidateProfileHash: entry.candidateProfileHash,
      compositionKind: entry.compositionKind,
    })),
    armyInstanceSetComplete: true, unusedSlotDisposition: "lost",
    rulesOwnedSlotTotalsRequested: true,
  });
  const mineralSpent = unitRows.reduce((sum, entry) => sum + entry.mineralCost, 0)
    + upgradeRows.reduce((sum, entry) => sum + entry.mineralCost, 0);
  if (mineralSpent > mineralBudget) fail("ARMY_MINERAL_BUDGET_EXCEEDED");
  const vespeneSpent = tacticalRows.reduce((sum, entry) => sum + entry.vespeneGasCost, 0);
  const { numerator, denominator } = scale.vespeneRatio;
  if (vespeneSpent * denominator > mineralBudget * numerator) {
    fail("ARMY_VESPENE_BUDGET_EXCEEDED");
  }
  const vespeneLimitNumerator = mineralBudget * numerator;
  const vespeneUnspentNumerator = vespeneLimitNumerator - vespeneSpent * denominator;
  return result({ schema: "starcraft_tmg_official_army_resource_budget_resolution_v1",
    procedureKind: "army_resource_budget", sideKey, scale: clone(scale), mineralBudget,
    teamAllocationMode: options.teamAllocationMode === true,
    unitRows, upgradeRows, tacticalCardRows: tacticalRows,
    mineralSpent, mineralUnspent: mineralBudget - mineralSpent,
    mineralUnspentDisposition: "lost", mineralRetained: 0,
    vespeneLimit: { numerator: vespeneLimitNumerator, denominator },
    vespeneSpent, vespeneUnspent: { numerator: vespeneUnspentNumerator, denominator },
    vespeneUnspentDisposition: "lost", vespeneRetained: 0,
    resourceConversionAllowed: false, resourceConversionApplied: false,
    exactRationalVespeneComparison: true,
    armySlotAuditResultHash: slotAudit.resultHash,
    factionCard: clone(slotAudit.factionCard),
    fullFactionTagSlotAndUniqueLegalityValidated: true,
    fullResourceArithmeticValidated: true,
    fullCompositionUpgradeAndFieldingLegalityValidated: false,
    fullCompositionUpgradeAndFieldingLegalityDeferredToSlice: 104,
    rulesOwnedCostsAndTotals: true, clientSuppliedCostsOrTotalsAccepted: false,
    trainingTruth: false });
}

export function resolveOfficialArmyResourceBudgetV1(input = {}) {
  return resolveArmyResourceBudget(input, { teamAllocationMode: false });
}

export function resolveOfficialTeamMineralBudgetV1(input = {}) {
  const bundle = input.armyResourceBudgetDataBundle;
  verifyOfficialArmyResourceBudgetDataBundleV1(bundle);
  const playerIds = Object.keys(input.state?.players || {}).sort();
  if (input.procedureKind !== "team_mineral_budget"
    || input.teamSetComplete !== true || input.playerPartitionComplete !== true
    || input.rulesOwnedTeamArithmeticRequested !== true
    || !Array.isArray(input.teams) || input.teams.length === 0
    || playerIds.length < 2 || input.clientSuppliedTeamTotals !== undefined) {
    fail("TEAM_MINERAL_BUDGET_REQUEST_INVALID");
  }
  const seenPlayers = new Set(); const teamIds = new Set();
  const teams = [...input.teams].sort((left, right) => String(left?.teamId || "")
    .localeCompare(String(right?.teamId || ""))).map((raw) => {
    const teamId = nonEmpty(raw?.teamId, "TEAM_MINERAL_BUDGET_TEAM_INVALID");
    if (teamIds.has(teamId)) fail("TEAM_MINERAL_BUDGET_TEAM_DUPLICATE", teamId);
    teamIds.add(teamId);
    const agreedMineralBudget = nonNegativeInteger(raw?.agreedMineralBudget,
      "TEAM_MINERAL_BUDGET_TOTAL_INVALID", teamId);
    if (raw.agreed !== true || !Array.isArray(raw.playerArmyBudgets)
      || raw.playerArmyBudgets.length === 0) {
      fail("TEAM_MINERAL_BUDGET_AGREEMENT_REQUIRED", teamId);
    }
    const playerRows = [...raw.playerArmyBudgets]
      .sort((left, right) => String(left?.playerId || "")
        .localeCompare(String(right?.playerId || ""))).map((entry) => {
        const playerId = nonEmpty(entry?.playerId, "TEAM_MINERAL_BUDGET_PLAYER_INVALID");
        if (!playerIds.includes(playerId) || seenPlayers.has(playerId)) {
          fail("TEAM_MINERAL_BUDGET_PLAYER_PARTITION_INVALID", playerId);
        }
        seenPlayers.add(playerId);
        const budget = resolveArmyResourceBudget({
          ...entry.armyResourceBudgetInput, procedureKind: "army_resource_budget",
          sideKey: playerId, armyResourceBudgetDataBundle: bundle,
        }, { teamAllocationMode: true });
        return { playerId, mineralAllocation: budget.mineralBudget,
          scaleId: budget.scale.scaleId,
          armyResourceBudgetResultHash: budget.resultHash,
          independentlyChoosesArmyFactionAndTacticalCards: true };
      });
    const allocatedMinerals = playerRows.reduce((sum, entry) => (
      sum + entry.mineralAllocation), 0);
    if (allocatedMinerals > agreedMineralBudget) {
      fail("TEAM_MINERAL_BUDGET_EXCEEDED", teamId);
    }
    const scaleIds = [...new Set(playerRows.map((entry) => entry.scaleId))];
    if (scaleIds.length !== 1) fail("TEAM_MINERAL_BUDGET_SCALE_MISMATCH", teamId);
    return { teamId, agreed: true, scaleId: scaleIds[0], agreedMineralBudget, playerRows,
      allocatedMinerals, unallocatedMineralsLost: agreedMineralBudget - allocatedMinerals,
      unallocatedMineralsRetained: 0 };
  });
  if (!isDeepStrictEqual([...seenPlayers].sort(), playerIds)) {
    fail("TEAM_MINERAL_BUDGET_PLAYER_PARTITION_INVALID");
  }
  const agreedTotals = [...new Set(teams.map((entry) => entry.agreedMineralBudget))];
  const scaleIds = [...new Set(teams.map((entry) => entry.scaleId))];
  if (agreedTotals.length !== 1) fail("TEAM_MINERAL_BUDGET_TOTAL_MISMATCH");
  if (scaleIds.length !== 1) fail("TEAM_MINERAL_BUDGET_SCALE_MISMATCH");
  const scale = getOfficialEngagementScaleV1(
    bundle.factionArmyEligibilityDataBundle, scaleIds[0]);
  validateScaleBudget(scale, agreedTotals[0]);
  return result({ schema: "starcraft_tmg_official_team_mineral_budget_resolution_v1",
    procedureKind: "team_mineral_budget", playerIds, scale: clone(scale),
    agreedMineralBudgetPerTeam: agreedTotals[0], teams,
    teamSetComplete: true, playerPartitionComplete: true,
    everyTeamBudgetAgreed: true, eachPlayerBuildsOwnArmyFactionAndTacticalCards: true,
    unallocatedTeamMineralsLost: true,
    rulesOwnedTeamArithmetic: true, clientSuppliedTeamTotalsAccepted: false,
    trainingTruth: false });
}

export function resolveOfficialArmyCardOpenInformationV1(input = {}) {
  const bundle = input.armyResourceBudgetDataBundle;
  verifyOfficialArmyResourceBudgetDataBundleV1(bundle);
  if (input.procedureKind !== "army_card_open_information"
    || input.preGameDisclosureRequested !== true
    || input.publicCardSetComplete !== true
    || input.rulesOwnedPublicProjectionRequested !== true
    || input.clientSuppliedVisibility !== undefined || !object(input.armyResourceBudgetInput)) {
    fail("ARMY_CARD_OPEN_INFORMATION_REQUEST_INVALID");
  }
  const budget = resolveOfficialArmyResourceBudgetV1({
    ...input.armyResourceBudgetInput, procedureKind: "army_resource_budget",
    armyResourceBudgetDataBundle: bundle,
  });
  const factionSource = getOfficialCardBuildPaymentProfileV1(
    bundle.factionArmyEligibilityDataBundle.cardDataBundle,
    budget.factionCard.recordKey);
  const publicCards = [{ cardInstanceId: input.armyResourceBudgetInput.factionCard.cardInstanceId,
    recordKey: factionSource.recordKey, cardId: factionSource.cardId,
    cardName: factionSource.cardName, cardKind: "faction",
    sourceCardProfileHash: factionSource.profileHash, faceUp: true, public: true },
  ...budget.tacticalCardRows.map((entry) => ({ cardInstanceId: entry.cardInstanceId,
    recordKey: entry.recordKey, cardId: entry.cardId, cardName: entry.cardName,
    cardKind: "tactical", sourceCardProfileHash: entry.sourceCardProfileHash,
    faceUp: true, public: true }))]
    .sort((left, right) => left.cardInstanceId.localeCompare(right.cardInstanceId));
  return result({ schema: "starcraft_tmg_official_army_card_open_information_resolution_v1",
    procedureKind: "army_card_open_information", sideKey: budget.sideKey,
    armyResourceBudgetResultHash: budget.resultHash, publicCards,
    publicCardSetComplete: true, allFactionAndTacticalCardsFaceUpBeforeGame: true,
    hiddenFactionOrTacticalCardsPermitted: false,
    unitEquipmentAndRosterDisclosureIncluded: false,
    unitEquipmentAndRosterDisclosureDeferredToSlice: 105,
    clientSuppliedVisibilityAccepted: false, trainingTruth: false });
}

export function certifyOfficialArmyResourceBudgetPlanV1(input = {}) {
  const bundle = input.armyResourceBudgetDataBundle;
  const procedureKind = String(input.procedureKind || ""); const plan = input.plan;
  verifyOfficialArmyResourceBudgetDataBundleV1(bundle);
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult === true) fail("ARMY_RESOURCE_BUDGET_PLAN_INVALID");
  const planId = nonEmpty(plan.planId, "ARMY_RESOURCE_BUDGET_PLAN_INVALID");
  const shared = { ...plan.input, procedureKind,
    armyResourceBudgetDataBundle: bundle };
  const resolution = procedureKind === "army_resource_budget"
    ? resolveOfficialArmyResourceBudgetV1(shared)
    : procedureKind === "team_mineral_budget"
      ? resolveOfficialTeamMineralBudgetV1(shared)
      : resolveOfficialArmyCardOpenInformationV1(shared);
  const sideKey = String(plan.sideKey || "");
  if (procedureKind !== "team_mineral_budget" && resolution.sideKey !== sideKey) {
    fail("ARMY_RESOURCE_BUDGET_PLAN_SIDE_MISMATCH");
  }
  const body = { schema: "starcraft_tmg_official_army_resource_budget_plan_certificate_v1",
    planId, procedureKind, sideKey,
    dataBundleHash: bundle.bundleHash, result: resolution,
    rulesOwnedInputsComplete: true, clientSuppliedResultAccepted: false,
    trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialArmyResourceBudgetPlanCertificateV1(input = {}) {
  const rebuilt = certifyOfficialArmyResourceBudgetPlanV1(input);
  if (!isDeepStrictEqual(rebuilt, input.certificate)) {
    fail("ARMY_RESOURCE_BUDGET_PLAN_CERTIFICATE_DRIFT");
  }
  return true;
}

export function verifyOfficialArmyResourceBudgetResultV1(value) {
  return verifyResult(value,
    "starcraft_tmg_official_army_resource_budget_resolution_v1",
    "ARMY_RESOURCE_BUDGET_RESULT_INVALID");
}

export function officialArmyResourceBudgetProcedureKindsV1() {
  return [...PROCEDURE_KINDS].sort();
}
