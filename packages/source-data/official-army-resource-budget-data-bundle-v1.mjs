import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "./official-command-center-adapter-v1.mjs";
import {
  createOfficialFactionArmyEligibilityDataBundleV1,
  verifyOfficialFactionArmyEligibilityDataBundleV1,
} from "./official-faction-army-eligibility-data-bundle-v1.mjs";

export const OFFICIAL_ARMY_RESOURCE_BUDGET_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_army_resource_budget_data_bundle_v1";
export const OFFICIAL_ARMY_RESOURCE_BUDGET_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_RECORDS = Object.freeze([
  Object.freeze({ recordKey: "rules_sections:Rj6sMyNODPQ8OHUc9Clp",
    title: "PART 9: PREPARING FOR BATTLE",
    sourceRecordHash: "8c91884a93418869ca6878fdf0f3868278008728f1d28995f3f6e3bf8e85e282",
    payloadHash: "3197f311085315cabe06dcda95a0e2ab3a744d7c97571c9df02d27a27186dc2a" }),
  Object.freeze({ recordKey: "rules_sections:gMXfLyHJfnGYKw2rmoPS",
    title: "PART 12: QUICK REFERENCE",
    sourceRecordHash: "572cb18a86731b32f12d81a26c777f99115a1da4bf57ef73b18215fadd18abc9",
    payloadHash: "faf1f3771196090c327ead1144f4015bf2d633b6d90ccc83dc62091c5a3e7b38" }),
]);

function clause(atomId, clauseId, sourceTextHash) {
  const body = { atomId, clauseIds: Object.freeze([clauseId]),
    sourceTextHashes: Object.freeze([sourceTextHash]) };
  return Object.freeze({ ...body,
    candidateSequenceHash: hashStarcraftTmgContract(body) });
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:purchased-tactical-and-faction-cards-face-up",
    "core:9.1.5:tactical-cards-face-up",
    "39e0a363890a152c78b4ccba72499887d31bd38f7036c8a32c9d3151b022b015"),
  clause("rule-atom:singleton:core-9-1-3-mineral-budget-cap:011229d13c89",
    "core:9.1.3:mineral-budget-cap",
    "d21ad7040630ac3ab0d4affa04fa32e6e51fcd7efb8a28e8f820a651cbc790b9"),
  clause("rule-atom:singleton:core-9-1-3-mineral-unit-purchases:3a43c0da5f8e",
    "core:9.1.3:mineral-unit-purchases",
    "a8696d9a15db6620dade98d82911aded23b85589b23cb40844697cc10d6c879b"),
  clause("rule-atom:singleton:core-9-1-3-unspent-minerals-lost:040ae0b82d09",
    "core:9.1.3:unspent-minerals-lost",
    "b7d0cb0290f41b41d11aa18e106da899fc5c35ae8b733bc04f3b220c40f1c652"),
  clause("rule-atom:singleton:core-9-1-4-no-resource-conversion:c418a19abfed",
    "core:9.1.4:no-resource-conversion",
    "cc378bbbc2dd2ce27a3ac2792275c4e78818b5d8c7090162b777337782821371"),
  clause("rule-atom:singleton:core-9-1-4-unspent-vespene-lost:0784938522c0",
    "core:9.1.4:unspent-vespene-lost",
    "a6a00ea855a429687e01647c21a44fb26d5a943aca0b079695c3e9da858895bc"),
  clause("rule-atom:singleton:core-9-1-4-vespene-tactical-purchases:ecd3bbfcc379",
    "core:9.1.4:vespene-tactical-purchases",
    "9a3d63e965f86ad1303bea814f9c100e79445aff09c85e25db3e81c1275d86c0"),
  clause("rule-atom:singleton:core-9-1-5-army-reference-cost-cross-reference:214b65d5bbc7",
    "core:9.1.5:army-reference-cost-cross-reference",
    "75d2a75f5b75db929f29b27337a2b45b7f54ad0f77fca8da3f2fc85f9e56dd79"),
  clause("rule-atom:singleton:core-9-1-5-tactical-card-slot-purchase:90a83fb46ad7",
    "core:9.1.5:tactical-card-slot-purchase",
    "a6b46e16e98f43a9e4b892dcde43cfc92175e557af9ce7a52a2674da337e431b"),
  clause("rule-atom:singleton:core-9-1-8-team-mineral-budget:a8f47de17209",
    "core:9.1.8:team-mineral-budget",
    "af1265abb78e7cdd793e187d2a52dcfddac8cf1acbbffd3a77d9cbf5cccdc21d"),
  clause("rule-atom:singleton:core-9-1-army-resource-overview:9e9cc1c4ef8a",
    "core:9.1:army-resource-overview",
    "ed627daf949eed99f085967f335dfb1b7b00ffb3ec8b547a8d0d902b822976c4"),
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function nonNegativeInteger(value, code, detail) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) fail(code, detail);
  return number;
}
function exactRuleSectionRecords(dataset) {
  return RULE_RECORDS.map((expected) => {
    const record = dataset.recordsByKey[expected.recordKey];
    const index = dataset.recordIndex.find((entry) => entry.recordKey === expected.recordKey);
    if (!object(record) || !object(index)
      || index.authorityDisposition !== "official_rule_prose_review_required"
      || record.payload?.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash) {
      fail("ARMY_RESOURCE_BUDGET_RULE_RECORD_DRIFT", expected.recordKey);
    }
    return { ...expected, authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions?.rulesVersion };
  });
}
function profile(body) {
  return { ...body, budgetProfileHash: hashStarcraftTmgContract(body) };
}
function compileProfiles(dataset, factionBundle) {
  const cardBundle = factionBundle.cardDataBundle;
  const unitBundle = factionBundle.unitDataBundle;
  const tacticalBudgetProfiles = cardBundle.cardProfiles.filter((entry) => (
    !entry.isFactionCard)).map((entry) => profile({
    schema: "starcraft_tmg_official_tactical_budget_profile_v1",
    recordKey: entry.recordKey, cardId: entry.cardId, cardName: entry.cardName,
    sourceRecordHash: entry.sourceRecordHash, payloadHash: entry.payloadHash,
    sourceCardProfileHash: entry.profileHash, raceTag: entry.raceTag,
    factionTags: [...entry.factionTags], isUnique: entry.isUnique,
    vespeneGasCost: entry.vespeneGasCost, armySlotsAdded: structuredClone(entry.slots),
    priceAuthority: "current_official_tactical_card_record",
    trainingTruth: false,
  })).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  const fieldableUnits = unitBundle.unitProfiles.filter((entry) => (
    entry.fieldableDuringArmyBuilding));
  const unitCompositionBudgetProfiles = fieldableUnits.flatMap((unit) => (
    unit.compositions.map((entry) => profile({
      schema: "starcraft_tmg_official_unit_composition_budget_profile_v1",
      budgetProfileId: `${unit.recordKey}:${entry.kind}`,
      recordKey: unit.recordKey, unitId: unit.unitId, unitName: unit.unitName,
      sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
      sourceUnitProfileHash: unit.profileHash, compositionKind: entry.kind,
      startingModels: entry.startingModels, startingSupply: entry.startingSupply,
      mineralCost: entry.pointsCost,
      priceAuthority: "current_official_unit_composition_record",
      fieldingLegalityDeferredToSlice: 104, trainingTruth: false,
    }))
  )).sort((left, right) => left.budgetProfileId.localeCompare(right.budgetProfileId));
  const upgradeBudgetProfiles = fieldableUnits.flatMap((unit) => {
    const record = getOfficialCurrentProductRecord(dataset, unit.recordKey);
    const upgrades = record.payload?.upgrades;
    if (!Array.isArray(upgrades)
      || upgrades.length !== unit.upgradeSide.definitionCount
      || hashStarcraftTmgContract(upgrades) !== unit.upgradeSide.definitionsHash) {
      fail("ARMY_RESOURCE_BUDGET_UPGRADE_SOURCE_DRIFT", unit.recordKey);
    }
    return upgrades.map((entry, upgradeIndex) => {
      const upgradeName = String(entry?.name || "").normalize("NFC").trim();
      const phase = String(entry?.phase || "").trim();
      if (!upgradeName || !phase) {
        fail("ARMY_RESOURCE_BUDGET_UPGRADE_PROFILE_INVALID", unit.recordKey);
      }
      const definitionHash = hashStarcraftTmgContract(entry);
      return profile({ schema: "starcraft_tmg_official_upgrade_budget_profile_v1",
        budgetProfileId: `${unit.recordKey}:upgrade:${upgradeIndex}:${definitionHash.slice(0, 12)}`,
        recordKey: unit.recordKey, unitId: unit.unitId, unitName: unit.unitName,
        sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
        sourceUnitProfileHash: unit.profileHash, upgradeIndex, upgradeName, phase,
        definitionHash, mineralCostByComposition: {
          small: nonNegativeInteger(entry.costS,
            "ARMY_RESOURCE_BUDGET_UPGRADE_COST_INVALID", unit.recordKey),
          large: nonNegativeInteger(entry.costL,
            "ARMY_RESOURCE_BUDGET_UPGRADE_COST_INVALID", unit.recordKey),
        }, priceAuthority: "current_official_unit_upgrade_record",
        purchaseAndApplicationLegalityDeferredToSlice: 104, trainingTruth: false });
    });
  }).sort((left, right) => left.budgetProfileId.localeCompare(right.budgetProfileId));
  return { tacticalBudgetProfiles, unitCompositionBudgetProfiles,
    upgradeBudgetProfiles };
}

export function createOfficialArmyResourceBudgetDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) fail("ARMY_RESOURCE_BUDGET_DATASET_INVALID");
  const factionArmyEligibilityDataBundle =
    createOfficialFactionArmyEligibilityDataBundleV1({ dataset });
  const compiled = compileProfiles(dataset, factionArmyEligibilityDataBundle);
  const audit = {
    factionCardCount: factionArmyEligibilityDataBundle.audit.factionCardCount,
    tacticalBudgetProfileCount: compiled.tacticalBudgetProfiles.length,
    fieldableUnitCount: factionArmyEligibilityDataBundle.audit.fieldableUnitCount,
    unitCompositionBudgetProfileCount: compiled.unitCompositionBudgetProfiles.length,
    upgradeBudgetProfileCount: compiled.upgradeBudgetProfiles.length,
    positiveUpgradeBudgetProfileCount: compiled.upgradeBudgetProfiles.filter((entry) => (
      entry.mineralCostByComposition.small > 0
        || entry.mineralCostByComposition.large > 0)).length,
    zeroUpgradeBudgetProfileCount: compiled.upgradeBudgetProfiles.filter((entry) => (
      entry.mineralCostByComposition.small === 0
        && entry.mineralCostByComposition.large === 0)).length,
    asymmetricUpgradeBudgetProfileCount: compiled.upgradeBudgetProfiles.filter((entry) => (
      entry.mineralCostByComposition.small
        !== entry.mineralCostByComposition.large)).length,
    zeroCostTacticalCardCount: compiled.tacticalBudgetProfiles.filter((entry) => (
      entry.vespeneGasCost === 0)).length,
    positiveCostTacticalCardCount: compiled.tacticalBudgetProfiles.filter((entry) => (
      entry.vespeneGasCost > 0)).length,
  };
  const expectedAudit = { factionCardCount: 6, tacticalBudgetProfileCount: 31,
    fieldableUnitCount: 22, unitCompositionBudgetProfileCount: 28,
    upgradeBudgetProfileCount: 171, positiveUpgradeBudgetProfileCount: 51,
    zeroUpgradeBudgetProfileCount: 120, asymmetricUpgradeBudgetProfileCount: 14,
    zeroCostTacticalCardCount: 1, positiveCostTacticalCardCount: 30 };
  if (hashStarcraftTmgContract(audit) !== hashStarcraftTmgContract(expectedAudit)) {
    fail("ARMY_RESOURCE_BUDGET_PROFILE_AUDIT_DRIFT");
  }
  const body = { schema: OFFICIAL_ARMY_RESOURCE_BUDGET_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_ARMY_RESOURCE_BUDGET_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48", officialUnitsVersion: "71", officialCardsVersion: "69",
    ruleSectionRecords: exactRuleSectionRecords(dataset), ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    engagementScales: factionArmyEligibilityDataBundle.engagementScales,
    engagementScaleIndexHash:
      factionArmyEligibilityDataBundle.engagementScaleIndexHash,
    tacticalBudgetProfiles: compiled.tacticalBudgetProfiles,
    tacticalBudgetProfileIndexHash:
      hashStarcraftTmgContract(compiled.tacticalBudgetProfiles),
    unitCompositionBudgetProfiles: compiled.unitCompositionBudgetProfiles,
    unitCompositionBudgetProfileIndexHash:
      hashStarcraftTmgContract(compiled.unitCompositionBudgetProfiles),
    upgradeBudgetProfiles: compiled.upgradeBudgetProfiles,
    upgradeBudgetProfileIndexHash: hashStarcraftTmgContract(compiled.upgradeBudgetProfiles),
    factionArmyEligibilityDataBundle, audit,
    exactBudgetPolicy: { mineralPurchaseKinds: ["unit_composition", "upgrade"],
      vespenePurchaseKinds: ["tactical_card"], resourceConversionAllowed: false,
      unspentMineralsRetained: false, unspentVespeneRetained: false,
      vespeneLimitRepresentation: "exact_rational_no_invented_rounding" },
    sourcePolicy: { captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
      commandCenterRole: "current_unit_upgrade_and_tactical_price_identity",
      pdfRole: "primary_normative_resource_budget_purchase_and_visibility_source" },
    deferredRules: { completeCompositionUpgradeAndFieldingLegality: "slice_104",
      unitEquipmentAndRosterDisclosure: "slice_105" },
    productionRoomEligible: false,
    rulesTruth: "official_army_resource_budget_price_and_open_card_source_index",
    trainingTruth: false };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialArmyResourceBudgetDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialArmyResourceBudgetDataBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_ARMY_RESOURCE_BUDGET_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_ARMY_RESOURCE_BUDGET_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48" || bundle.officialUnitsVersion !== "71"
    || bundle.officialCardsVersion !== "69" || bundle.ruleSectionRecords?.length !== 2
    || bundle.ruleClauses?.length !== 11 || bundle.tacticalBudgetProfiles?.length !== 31
    || bundle.unitCompositionBudgetProfiles?.length !== 28
    || bundle.upgradeBudgetProfiles?.length !== 171
    || bundle.audit?.positiveUpgradeBudgetProfileCount !== 51
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(bundle.ruleClauses)
    || bundle.tacticalBudgetProfileIndexHash
      !== hashStarcraftTmgContract(bundle.tacticalBudgetProfiles)
    || bundle.unitCompositionBudgetProfileIndexHash
      !== hashStarcraftTmgContract(bundle.unitCompositionBudgetProfiles)
    || bundle.upgradeBudgetProfileIndexHash
      !== hashStarcraftTmgContract(bundle.upgradeBudgetProfiles)
    || bundle.exactBudgetPolicy?.vespeneLimitRepresentation
      !== "exact_rational_no_invented_rounding"
    || bundle.exactBudgetPolicy?.resourceConversionAllowed !== false
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("ARMY_RESOURCE_BUDGET_DATA_BUNDLE_INVALID");
  }
  verifyOfficialFactionArmyEligibilityDataBundleV1(
    bundle.factionArmyEligibilityDataBundle);
  const ids = new Set();
  for (const collection of [bundle.tacticalBudgetProfiles,
    bundle.unitCompositionBudgetProfiles, bundle.upgradeBudgetProfiles]) {
    for (const entry of collection) {
      const id = entry.budgetProfileId || `${entry.schema}:${entry.recordKey}`;
      if (!object(entry) || ids.has(id)
        || entry.budgetProfileHash
          !== hashStarcraftTmgContract(without(entry, ["budgetProfileHash"]))) {
        fail("ARMY_RESOURCE_BUDGET_PROFILE_INVALID", String(id || ""));
      }
      ids.add(id);
    }
  }
  if (new Set(bundle.ruleClauses.map((entry) => entry.atomId)).size !== 11
    || bundle.ruleClauses.some((entry) => !/^[a-f0-9]{64}$/u.test(
      entry.candidateSequenceHash))) fail("ARMY_RESOURCE_BUDGET_DENOMINATOR_INVALID");
  return true;
}

function getProfile(bundle, key, value, code) {
  verifyOfficialArmyResourceBudgetDataBundleV1(bundle);
  const profileValue = String(value || "");
  const profileEntry = bundle[key].find((entry) => (
    (entry.budgetProfileId || entry.recordKey) === profileValue));
  if (!profileEntry) fail(code, profileValue);
  return profileEntry;
}

export function getOfficialTacticalBudgetProfileV1(bundle, recordKey) {
  return getProfile(bundle, "tacticalBudgetProfiles", recordKey,
    "TACTICAL_BUDGET_PROFILE_REQUIRED");
}
export function getOfficialUnitCompositionBudgetProfileV1(bundle, budgetProfileId) {
  return getProfile(bundle, "unitCompositionBudgetProfiles", budgetProfileId,
    "UNIT_COMPOSITION_BUDGET_PROFILE_REQUIRED");
}
export function getOfficialUpgradeBudgetProfileV1(bundle, budgetProfileId) {
  return getProfile(bundle, "upgradeBudgetProfiles", budgetProfileId,
    "UPGRADE_BUDGET_PROFILE_REQUIRED");
}
