import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialEngagementScaleV1,
} from "../source-data/official-faction-army-eligibility-data-bundle-v1.mjs";
import {
  verifyOfficialUnitCompositionUpgradeDataBundleV1,
} from "../source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import {
  resolveOfficialCompleteArmyCompositionUpgradeAuditV1,
  verifyOfficialUnitCompositionUpgradeResultV1,
} from "../rule-atoms/official-unit-composition-upgrade-rules-kernel-v1.mjs";

export const ARMY_BUILDER_QUERY_PORT_MODULE =
  "packages/roster-strategist/army-builder-query-port-v1.mjs";
export const ARMY_BUILDER_QUERY_PORT_VERSION = "1.0.0";
export const ARMY_BUILDER_QUERY_PORT_DESCRIPTOR_SCHEMA =
  "starcraft_tmg_army_builder_query_port_descriptor_v1";
export const ARMY_BUILDER_ROSTER_VERDICT_SCHEMA =
  "starcraft_tmg_army_builder_roster_verdict_v1";
export const ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA =
  "starcraft_tmg_army_builder_rejection_receipt_v1";
export const ARMY_BUILDER_SCALE_CATALOGUE_RECEIPT_SCHEMA =
  "starcraft_tmg_army_builder_scale_catalogue_receipt_v1";
export const ARMY_BUILDER_FACTION_CATALOGUE_RECEIPT_SCHEMA =
  "starcraft_tmg_army_builder_faction_catalogue_receipt_v1";
export const ARMY_BUILDER_CHOICE_ENUMERATION_RECEIPT_SCHEMA =
  "starcraft_tmg_army_builder_choice_enumeration_receipt_v1";

export const ARMY_BUILDER_LEGALITY_AUTHORITY = Object.freeze({
  completeArmyAudit:
    "official-unit-composition-upgrade-rules-kernel-v1:resolveOfficialCompleteArmyCompositionUpgradeAuditV1",
  compositionUpgradeKernel: "official-unit-composition-upgrade-rules-kernel-v1",
  armyResourceBudgetKernel: "official-army-resource-budget-rules-kernel-v1",
  factionArmyEligibilityKernel: "official-faction-army-eligibility-rules-kernel-v1",
  cardBuildPaymentKernel: "official-card-build-payment-rules-kernel-v1",
});

const COMPLETE_ARMY_AUDIT_RESULT_SCHEMA =
  "starcraft_tmg_official_complete_army_composition_upgrade_audit_v1";
const DEFAULT_MAXIMUM_CANDIDATES_PER_FAMILY = 256;
const ABSOLUTE_MAXIMUM_CANDIDATES_PER_FAMILY = 1024;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const RULES_ERROR_PATTERN = /^([A-Z][A-Z0-9_]*)(?::([\s\S]*))?$/u;

const REJECTION_CLASSIFICATIONS = Object.freeze([
  { pattern: /^FACTION_TAG_MISMATCH/u, rejectionKind: "faction_eligibility" },
  { pattern: /^EXACTLY_ONE_FACTION_CARD_REQUIRED/u, rejectionKind: "faction_card" },
  { pattern: /^SELECTED_FACTION_CARD_/u, rejectionKind: "faction_card" },
  { pattern: /^ARMY_SLOT_/u, rejectionKind: "army_slot_capacity" },
  { pattern: /^ARMY_MINERAL_BUDGET_/u, rejectionKind: "resource_budget" },
  { pattern: /^ARMY_VESPENE_BUDGET_/u, rejectionKind: "resource_budget" },
  { pattern: /^TEAM_MINERAL_BUDGET_/u, rejectionKind: "resource_budget" },
  { pattern: /^UNIT_SPECIALIST_/u, rejectionKind: "specialist_assignment" },
  { pattern: /^UNIT_COMPOSITION_/u, rejectionKind: "unit_composition" },
  { pattern: /^UNIT_UPGRADE_/u, rejectionKind: "unit_upgrade" },
  { pattern: /^UNIT_PURCHASABLE_/u, rejectionKind: "unit_upgrade" },
  { pattern: /^PURCHASABLE_UPGRADE_PROFILE_/u, rejectionKind: "unit_upgrade" },
  { pattern: /^COMPLETE_ARMY_UNIT_NOT_FIELDABLE/u, rejectionKind: "fieldability" },
  { pattern: /_REQUEST_INVALID$/u, rejectionKind: "request_shape" },
]);

export function classifyArmyBuilderRulesErrorV1(rulesErrorCode) {
  const code = String(rulesErrorCode || "");
  for (const entry of REJECTION_CLASSIFICATIONS) {
    if (entry.pattern.test(code)) {
      return Object.freeze({ status: "illegal", rejectionKind: entry.rejectionKind });
    }
  }
  return Object.freeze({ status: "unknown", rejectionKind: "unknown_rules_outcome" });
}

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function nonNegativeInteger(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) fail(code);
  return number;
}
function hashedReceipt(body, hashField) {
  return freezeDeep({ ...body, [hashField]: hashStarcraftTmgContract(body) });
}

class CandidateAddressingFault extends Error {
  constructor(code, detail = "") {
    super(detail ? `${code}:${detail}` : code);
    this.candidateFaultCode = code;
    this.candidateFaultDetail = detail;
  }
}
function candidateFail(code, detail = "") {
  throw new CandidateAddressingFault(code, detail);
}

function factionLayout(profile) {
  return { recordKey: profile.recordKey, cardId: profile.cardId,
    factionName: profile.factionName, raceTag: profile.raceTag,
    factionTags: [...profile.factionTags], subFactionTags: [...profile.subFactionTags],
    startingArmySlots: clone(profile.startingArmySlots),
    profileHash: profile.profileHash };
}

export function createOfficialArmyBuilderQueryPortV1(input = {}) {
  const bundle = input.unitCompositionUpgradeDataBundle;
  verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle);
  if (!Object.isFrozen(bundle)) {
    fail("ARMY_BUILDER_PORT_BUNDLE_NOT_FROZEN");
  }
  const portId = nonEmpty(input.portId || "official-army-builder-query-port-v1",
    "ARMY_BUILDER_PORT_INVALID");
  const armyBundle = bundle.armyResourceBudgetDataBundle;
  const factionBundle = armyBundle.factionArmyEligibilityDataBundle;
  const descriptorBody = {
    schema: ARMY_BUILDER_QUERY_PORT_DESCRIPTOR_SCHEMA,
    portId,
    version: ARMY_BUILDER_QUERY_PORT_VERSION,
    readOnly: true,
    mutatesRoomState: false,
    mutatesSourceData: false,
    reimplementsRules: false,
    silentRepairOrFallback: false,
    sourceRefreshPerformed: false,
    repositoryFallbackUsed: false,
    unknownStaysUnknown: true,
    legalityAuthority: { ...ARMY_BUILDER_LEGALITY_AUTHORITY },
    unitCompositionUpgradeDataBundleHash: bundle.bundleHash,
    armyResourceBudgetDataBundleHash: armyBundle.bundleHash,
    factionArmyEligibilityDataBundleHash: factionBundle.bundleHash,
    providerCalls: 0,
    trainingTruth: false,
  };
  const descriptor = freezeDeep({ ...descriptorBody,
    descriptorHash: hashStarcraftTmgContract(descriptorBody) });

  function sharedReceiptFields() {
    return { portId, portVersion: ARMY_BUILDER_QUERY_PORT_VERSION,
      unitCompositionUpgradeDataBundleHash: bundle.bundleHash,
      readOnly: true, providerCalls: 0, trainingTruth: false };
  }

  function findFactionProfile(recordKey, code) {
    const profile = factionBundle.factionProfiles.find((entry) => (
      entry.recordKey === recordKey));
    if (!profile) candidateFail(code, String(recordKey || ""));
    return profile;
  }

  function listEngagementScales() {
    const body = { schema: ARMY_BUILDER_SCALE_CATALOGUE_RECEIPT_SCHEMA,
      ...sharedReceiptFields(),
      scales: factionBundle.engagementScales.map((entry) => clone(entry)),
      scaleCount: factionBundle.engagementScales.length };
    return hashedReceipt(body, "receiptHash");
  }

  function listFactionChoices() {
    const factions = factionBundle.factionProfiles.map((entry) => factionLayout(entry))
      .sort((left, right) => left.recordKey.localeCompare(right.recordKey));
    const body = { schema: ARMY_BUILDER_FACTION_CATALOGUE_RECEIPT_SCHEMA,
      ...sharedReceiptFields(), factions, factionCount: factions.length };
    return hashedReceipt(body, "receiptHash");
  }

  function enumerateArmyBuildingChoices(query = {}) {
    if (!object(query)) fail("ARMY_BUILDER_ENUMERATION_REQUEST_INVALID");
    const scaleId = nonEmpty(query.scaleId, "ARMY_BUILDER_ENUMERATION_SCALE_REQUIRED");
    const scale = factionBundle.engagementScales.find((entry) => (
      entry.scaleId === scaleId));
    if (!scale) fail("ARMY_BUILDER_ENUMERATION_SCALE_UNKNOWN", scaleId);
    const faction = findFactionProfile(nonEmpty(query.factionRecordKey,
      "ARMY_BUILDER_ENUMERATION_FACTION_REQUIRED"),
      "ARMY_BUILDER_ENUMERATION_FACTION_UNKNOWN");
    const bound = query.maximumCandidatesPerFamily === undefined
      ? DEFAULT_MAXIMUM_CANDIDATES_PER_FAMILY
      : nonNegativeInteger(query.maximumCandidatesPerFamily,
        "ARMY_BUILDER_ENUMERATION_BOUND_INVALID");
    if (bound < 1 || bound > ABSOLUTE_MAXIMUM_CANDIDATES_PER_FAMILY) {
      fail("ARMY_BUILDER_ENUMERATION_BOUND_INVALID", String(bound));
    }
    let mineralBudget = null;
    if (query.mineralBudget !== undefined && query.mineralBudget !== null) {
      mineralBudget = nonNegativeInteger(query.mineralBudget,
        "ARMY_BUILDER_ENUMERATION_BUDGET_INVALID");
    }
    const eligibleRows = factionBundle.eligibilityMatrix.filter((entry) => (
      entry.factionRecordKey === faction.recordKey && entry.eligible));
    const tacticalCandidates = eligibleRows
      .filter((entry) => entry.candidateKind === "tactical")
      .map((row) => {
        const budgetProfile = armyBundle.tacticalBudgetProfiles.find((entry) => (
          entry.recordKey === row.candidateRecordKey));
        if (!budgetProfile) {
          fail("ARMY_BUILDER_ENUMERATION_SOURCE_INCOMPLETE", row.candidateRecordKey);
        }
        return { recordKey: row.candidateRecordKey, cardId: budgetProfile.cardId,
          cardName: budgetProfile.cardName, vespeneGasCost: budgetProfile.vespeneGasCost,
          armySlotsAdded: clone(budgetProfile.armySlotsAdded),
          sourceCardProfileHash: budgetProfile.sourceCardProfileHash,
          budgetProfileHash: budgetProfile.budgetProfileHash };
      }).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
    const unitCandidates = eligibleRows
      .filter((entry) => entry.candidateKind === "unit")
      .map((row) => {
        const unit = bundle.unitCompositionProfiles.find((entry) => (
          entry.recordKey === row.candidateRecordKey));
        if (!unit) {
          fail("ARMY_BUILDER_ENUMERATION_SOURCE_INCOMPLETE", row.candidateRecordKey);
        }
        const upgrades = bundle.purchasableUpgradeProfiles
          .filter((entry) => entry.recordKey === unit.recordKey)
          .map((entry) => ({
            purchasableUpgradeProfileId: entry.purchasableUpgradeProfileId,
            upgradeName: entry.upgradeName,
            applicationKind: entry.applicationKind,
            specialistAssignmentRequired: entry.specialistAssignmentRequired,
            replacementTargetName: entry.replacementTargetName,
            mineralCostByComposition: clone(entry.mineralCostByComposition),
            profileHash: entry.profileHash }));
        return { recordKey: unit.recordKey, unitId: unit.unitId,
          unitName: unit.unitName, factionTag: unit.factionTag,
          armySlotType: unit.armySlotType,
          unitCompositionReferenceProfileHash: unit.profileHash,
          compositionOptions: unit.compositionOptions.map((option) => ({
            compositionProfileId: option.compositionProfileId,
            compositionKind: option.compositionKind,
            startingModels: option.startingModels,
            startingSupply: option.startingSupply,
            occupiedArmySlots: option.occupiedArmySlots,
            mineralCost: option.mineralCost,
            mineralCostReconciliation: option.mineralCostReconciliation,
            profileHash: option.profileHash })),
          purchasableUpgrades: upgrades };
      }).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
    if (tacticalCandidates.length > bound || unitCandidates.length > bound) {
      fail("ARMY_BUILDER_ENUMERATION_BOUND_EXCEEDED", String(bound));
    }
    const compositionOptionCount = unitCandidates.reduce((sum, entry) => (
      sum + entry.compositionOptions.length), 0);
    const purchasableUpgradeCount = unitCandidates.reduce((sum, entry) => (
      sum + entry.purchasableUpgrades.length), 0);
    const body = { schema: ARMY_BUILDER_CHOICE_ENUMERATION_RECEIPT_SCHEMA,
      ...sharedReceiptFields(),
      faction: factionLayout(faction), scale: clone(scale),
      mineralBudget,
      vespeneLimitForBudget: mineralBudget === null ? null : {
        numerator: mineralBudget * scale.vespeneRatio.numerator,
        denominator: scale.vespeneRatio.denominator },
      tacticalCandidates, unitCandidates,
      denominators: { eligibleTacticalCount: tacticalCandidates.length,
        eligibleUnitCount: unitCandidates.length, compositionOptionCount,
        purchasableUpgradeCount,
        specialistUpgradeCount: unitCandidates.reduce((sum, entry) => sum
          + entry.purchasableUpgrades.filter((upgrade) => (
            upgrade.specialistAssignmentRequired)).length, 0) },
      bounds: { maximumCandidatesPerFamily: bound, truncated: false },
      legalityNote: "choices_are_eligibility_candidates_only_rules_kernels_remain_sole_legality_authority" };
    return hashedReceipt(body, "receiptHash");
  }

  function resolveCandidateKernelInput(candidate) {
    if (!object(candidate)) candidateFail("ARMY_BUILDER_CANDIDATE_INVALID");
    const sideKey = nonEmpty(candidate.sideKey, "ARMY_BUILDER_CANDIDATE_SIDE_REQUIRED");
    const scaleId = nonEmpty(candidate.scaleId, "ARMY_BUILDER_CANDIDATE_SCALE_REQUIRED");
    if (!factionBundle.engagementScales.some((entry) => entry.scaleId === scaleId)) {
      candidateFail("ARMY_BUILDER_CANDIDATE_SCALE_UNKNOWN", scaleId);
    }
    const mineralBudget = nonNegativeInteger(candidate.mineralBudget,
      "ARMY_BUILDER_CANDIDATE_BUDGET_INVALID");
    const faction = findFactionProfile(nonEmpty(candidate.factionRecordKey,
      "ARMY_BUILDER_CANDIDATE_FACTION_REQUIRED"),
      "ARMY_BUILDER_CANDIDATE_FACTION_UNKNOWN");
    const factionCard = { cardInstanceId: `${sideKey}-faction`,
      recordKey: faction.recordKey, sourceRecordHash: faction.sourceRecordHash,
      payloadHash: faction.payloadHash, profileHash: faction.profileHash };
    if (!Array.isArray(candidate.tacticalCardRecordKeys)) {
      candidateFail("ARMY_BUILDER_CANDIDATE_TACTICAL_LIST_INVALID");
    }
    const tacticalCardInstances = candidate.tacticalCardRecordKeys
      .map((rawKey, index) => {
        const recordKey = nonEmpty(rawKey,
          "ARMY_BUILDER_CANDIDATE_TACTICAL_CARD_UNKNOWN");
        const profile = armyBundle.tacticalBudgetProfiles.find((entry) => (
          entry.recordKey === recordKey));
        if (!profile) {
          candidateFail("ARMY_BUILDER_CANDIDATE_TACTICAL_CARD_UNKNOWN", recordKey);
        }
        return { cardInstanceId: `${sideKey}-tactical-${index + 1}`, recordKey,
          sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
          budgetProfileHash: profile.budgetProfileHash };
      });
    if (!Array.isArray(candidate.units) || candidate.units.length === 0
      || candidate.units.length > 256) {
      candidateFail("ARMY_BUILDER_CANDIDATE_UNIT_LIST_INVALID");
    }
    const allCompositionOptions = bundle.unitCompositionProfiles
      .flatMap((entry) => entry.compositionOptions);
    const unitSelections = candidate.units.map((rawUnit) => {
      if (!object(rawUnit)) candidateFail("ARMY_BUILDER_CANDIDATE_UNIT_INVALID");
      const unitInstanceId = nonEmpty(rawUnit.unitInstanceId,
        "ARMY_BUILDER_CANDIDATE_UNIT_INVALID");
      const recordKey = nonEmpty(rawUnit.recordKey,
        "ARMY_BUILDER_CANDIDATE_UNIT_UNKNOWN");
      const unit = bundle.unitCompositionProfiles.find((entry) => (
        entry.recordKey === recordKey));
      if (!unit) candidateFail("ARMY_BUILDER_CANDIDATE_UNIT_UNKNOWN", recordKey);
      let option;
      if (rawUnit.compositionProfileId !== undefined
        && rawUnit.compositionProfileId !== null) {
        option = allCompositionOptions.find((entry) => (
          entry.compositionProfileId === String(rawUnit.compositionProfileId)));
        if (!option) {
          candidateFail("ARMY_BUILDER_CANDIDATE_COMPOSITION_PROFILE_UNKNOWN",
            String(rawUnit.compositionProfileId));
        }
      } else {
        const compositionKind = nonEmpty(rawUnit.compositionKind,
          "ARMY_BUILDER_CANDIDATE_COMPOSITION_UNKNOWN");
        option = unit.compositionOptions.find((entry) => (
          entry.compositionKind === compositionKind));
        if (!option) {
          candidateFail("ARMY_BUILDER_CANDIDATE_COMPOSITION_UNKNOWN",
            `${recordKey}:${compositionKind}`);
        }
      }
      let startingModelIds;
      if (rawUnit.startingModelIds !== undefined) {
        if (!Array.isArray(rawUnit.startingModelIds)
          || rawUnit.startingModelIds.some((entry) => typeof entry !== "string"
            || !entry.trim())) {
          candidateFail("ARMY_BUILDER_CANDIDATE_MODEL_IDS_INVALID", unitInstanceId);
        }
        startingModelIds = [...rawUnit.startingModelIds];
      } else {
        startingModelIds = Array.from({ length: option.startingModels },
          (_unused, index) => `${unitInstanceId}-model-${index + 1}`);
      }
      if (!Array.isArray(rawUnit.upgrades)) {
        candidateFail("ARMY_BUILDER_CANDIDATE_UPGRADE_LIST_INVALID", unitInstanceId);
      }
      const assignedSpecialistModelIds = new Set();
      const selectedUpgrades = rawUnit.upgrades.map((rawUpgrade, index) => {
        if (!object(rawUpgrade)) {
          candidateFail("ARMY_BUILDER_CANDIDATE_UPGRADE_INVALID", unitInstanceId);
        }
        let profile = null;
        if (rawUpgrade.purchasableUpgradeProfileId !== undefined
          && rawUpgrade.purchasableUpgradeProfileId !== null) {
          profile = bundle.purchasableUpgradeProfiles.find((entry) => (
            entry.purchasableUpgradeProfileId
              === String(rawUpgrade.purchasableUpgradeProfileId))) || null;
        } else {
          const upgradeName = nonEmpty(rawUpgrade.upgradeName,
            "ARMY_BUILDER_CANDIDATE_UPGRADE_UNKNOWN");
          profile = bundle.purchasableUpgradeProfiles.find((entry) => (
            entry.recordKey === recordKey && entry.upgradeName === upgradeName)) || null;
          if (!profile) {
            candidateFail("ARMY_BUILDER_CANDIDATE_UPGRADE_UNKNOWN",
              `${recordKey}:${upgradeName}`);
          }
        }
        const entry = {
          upgradeInstanceId: rawUpgrade.upgradeInstanceId === undefined
            ? `${unitInstanceId}-upgrade-${index + 1}`
            : nonEmpty(rawUpgrade.upgradeInstanceId,
              "ARMY_BUILDER_CANDIDATE_UPGRADE_INVALID"),
          purchasableUpgradeProfileId: profile
            ? profile.purchasableUpgradeProfileId
            : String(rawUpgrade.purchasableUpgradeProfileId),
          profileHash: profile ? profile.profileHash : null,
          sourceDefinitionHash: profile ? profile.sourceDefinitionHash : null,
          sourceBudgetProfileHash: profile ? profile.sourceBudgetProfileHash : null,
        };
        if (Object.hasOwn(rawUpgrade, "nominatedModelId")) {
          entry.nominatedModelId = rawUpgrade.nominatedModelId;
        } else if (profile?.specialistAssignmentRequired) {
          const available = startingModelIds.filter((modelId) => (
            !assignedSpecialistModelIds.has(modelId)));
          if (available.length === 0) {
            candidateFail("ARMY_BUILDER_CANDIDATE_SPECIALIST_MODEL_UNAVAILABLE",
              unitInstanceId);
          }
          entry.nominatedModelId = available[0];
        }
        if (entry.nominatedModelId !== undefined && entry.nominatedModelId !== null) {
          assignedSpecialistModelIds.add(String(entry.nominatedModelId));
        }
        return entry;
      });
      return { unitCompositionInput: {
        unitInstanceId, recordKey,
        compositionProfileId: option.compositionProfileId, startingModelIds,
        sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
        sourceUnitProfileHash: unit.sourceUnitProfileHash,
        unitCompositionReferenceProfileHash: unit.profileHash,
        compositionProfileHash: option.profileHash,
        rulesOwnedCompositionRequested: true, exactlyOneCompositionSelected: true,
      }, selectedUpgrades, upgradeSelectionSetComplete: true };
    });
    return { procedureKind: "complete_army_composition_upgrade_audit",
      unitCompositionUpgradeDataBundle: bundle,
      compositionUpgradeUnitSetComplete: true,
      rulesOwnedCompleteArmyAuditRequested: true,
      unitSelections,
      armyResourceBudgetInput: {
        sideKey, scaleId, mineralBudget, factionCard, tacticalCardInstances,
        armyPurchaseSetComplete: true, rulesOwnedResourceArithmeticRequested: true,
        unspentResourceDisposition: "lost", resourceConversionRequested: false,
      } };
  }

  function rejectionReceipt(body) {
    return hashedReceipt({ schema: ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA,
      ...sharedReceiptFields(), silentRepairAttempted: false,
      fallbackApplied: false, sourceRefreshPerformed: false, ...body },
      "receiptHash");
  }

  function evaluateRosterCandidate(candidateInput = {}) {
    const candidateHash = hashStarcraftTmgContract(clone(candidateInput));
    let kernelInput;
    try {
      kernelInput = resolveCandidateKernelInput(candidateInput);
    } catch (error) {
      if (error instanceof CandidateAddressingFault) {
        return rejectionReceipt({ status: "invalid_candidate",
          rejectionKind: "candidate_addressing",
          portErrorCode: error.candidateFaultCode,
          portErrorDetail: error.candidateFaultDetail || "",
          rulesErrorCode: null, rulesErrorDetail: null,
          rulesAuthority: null, candidateHash });
      }
      throw error;
    }
    let audit;
    try {
      audit = resolveOfficialCompleteArmyCompositionUpgradeAuditV1(kernelInput);
    } catch (error) {
      const message = String(error?.message || error || "");
      const parsed = RULES_ERROR_PATTERN.exec(message);
      const rulesErrorCode = parsed ? parsed[1] : "UNSTRUCTURED_RULES_ERROR";
      const rulesErrorDetail = parsed?.[2] ?? null;
      const classification = classifyArmyBuilderRulesErrorV1(rulesErrorCode);
      return rejectionReceipt({ status: classification.status,
        rejectionKind: classification.rejectionKind,
        portErrorCode: null, portErrorDetail: null,
        rulesErrorCode, rulesErrorDetail,
        rawRulesErrorMessage: message,
        rulesAuthority: ARMY_BUILDER_LEGALITY_AUTHORITY.completeArmyAudit,
        candidateHash });
    }
    verifyOfficialUnitCompositionUpgradeResultV1(audit,
      COMPLETE_ARMY_AUDIT_RESULT_SCHEMA);
    const body = { schema: ARMY_BUILDER_ROSTER_VERDICT_SCHEMA,
      ...sharedReceiptFields(), status: "legal",
      candidateHash, auditResultHash: audit.resultHash, audit: clone(audit),
      summary: { sideKey: audit.sideKey, unitCount: audit.unitCount,
        startingModelCount: audit.startingModelCount,
        startingSupply: audit.startingSupply,
        selectedUpgradeCount: audit.selectedUpgradeCount,
        mineralBudget: audit.armyResourceBudgetResult.mineralBudget,
        mineralSpent: audit.armyResourceBudgetResult.mineralSpent,
        mineralUnspent: audit.armyResourceBudgetResult.mineralUnspent,
        vespeneSpent: audit.armyResourceBudgetResult.vespeneSpent,
        scaleId: audit.armyResourceBudgetResult.scale.scaleId },
      rulesAuthority: ARMY_BUILDER_LEGALITY_AUTHORITY.completeArmyAudit,
      portReimplementedRules: false, clientSuppliedLegalityAccepted: false };
    return hashedReceipt(body, "verdictHash");
  }

  return freezeDeep({
    portDescriptor: () => descriptor,
    listEngagementScales,
    listFactionChoices,
    enumerateArmyBuildingChoices,
    evaluateRosterCandidate,
  });
}

export function verifyOfficialArmyBuilderQueryPortDescriptorV1(descriptor) {
  if (!object(descriptor) || descriptor.schema !== ARMY_BUILDER_QUERY_PORT_DESCRIPTOR_SCHEMA
    || descriptor.descriptorHash !== hashStarcraftTmgContract(
      without(descriptor, ["descriptorHash"]))
    || descriptor.readOnly !== true || descriptor.mutatesRoomState !== false
    || descriptor.mutatesSourceData !== false || descriptor.reimplementsRules !== false
    || descriptor.silentRepairOrFallback !== false
    || descriptor.sourceRefreshPerformed !== false
    || descriptor.repositoryFallbackUsed !== false
    || descriptor.unknownStaysUnknown !== true
    || descriptor.providerCalls !== 0 || descriptor.trainingTruth !== false
    || !HASH_PATTERN.test(String(descriptor.unitCompositionUpgradeDataBundleHash))
    || !HASH_PATTERN.test(String(descriptor.armyResourceBudgetDataBundleHash))
    || !HASH_PATTERN.test(String(descriptor.factionArmyEligibilityDataBundleHash))) {
    fail("ARMY_BUILDER_PORT_DESCRIPTOR_INVALID");
  }
  return true;
}

export function verifyArmyBuilderRosterVerdictV1(verdict) {
  if (!object(verdict) || verdict.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA
    || verdict.status !== "legal"
    || verdict.verdictHash !== hashStarcraftTmgContract(
      without(verdict, ["verdictHash"]))
    || !HASH_PATTERN.test(String(verdict.auditResultHash))
    || verdict.portReimplementedRules !== false
    || verdict.clientSuppliedLegalityAccepted !== false
    || verdict.providerCalls !== 0 || verdict.trainingTruth !== false) {
    fail("ARMY_BUILDER_ROSTER_VERDICT_INVALID");
  }
  verifyOfficialUnitCompositionUpgradeResultV1(verdict.audit,
    COMPLETE_ARMY_AUDIT_RESULT_SCHEMA);
  if (verdict.audit.resultHash !== verdict.auditResultHash) {
    fail("ARMY_BUILDER_ROSTER_VERDICT_INVALID");
  }
  return true;
}

export function verifyArmyBuilderRejectionReceiptV1(receipt) {
  if (!object(receipt) || receipt.schema !== ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA
    || receipt.receiptHash !== hashStarcraftTmgContract(
      without(receipt, ["receiptHash"]))
    || !["illegal", "unknown", "invalid_candidate"].includes(receipt.status)
    || receipt.silentRepairAttempted !== false || receipt.fallbackApplied !== false
    || receipt.sourceRefreshPerformed !== false
    || receipt.providerCalls !== 0 || receipt.trainingTruth !== false) {
    fail("ARMY_BUILDER_REJECTION_RECEIPT_INVALID");
  }
  if (receipt.status === "invalid_candidate") {
    if (!receipt.portErrorCode || receipt.rulesErrorCode !== null) {
      fail("ARMY_BUILDER_REJECTION_RECEIPT_INVALID");
    }
  } else if (!receipt.rulesErrorCode || !receipt.rulesAuthority) {
    fail("ARMY_BUILDER_REJECTION_RECEIPT_INVALID");
  }
  return true;
}
