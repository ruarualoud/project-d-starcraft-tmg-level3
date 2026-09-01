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
  createOfficialArmyResourceBudgetDataBundleV1,
  verifyOfficialArmyResourceBudgetDataBundleV1,
} from "./official-army-resource-budget-data-bundle-v1.mjs";

export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_unit_composition_upgrade_data_bundle_v1";
export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_RECORDS = Object.freeze([
  Object.freeze({ recordKey: "rules_sections:QX7B9DFpviRo84fVCBIj",
    title: "PART 2: CORE CONCEPTS",
    sourceRecordHash: "f7fce5a24ed1962598abb556f43a7cfffcfb541404c6bb705d119379b4094964",
    payloadHash: "615c599d401b8457266c56d1033a4259c0d1f353ba686becab05876a3af66acb" }),
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
  clause("rule-atom:singleton:core-12-10-composition-option-effects:2ff8639c4d1d",
    "core:12.10:composition-option-effects",
    "175c931114755f4861810c3cf37876e99d5314f06ba9999065d7b39fecc03a40"),
  clause("rule-atom:singleton:core-12-10-select-one-composition-option:69ee83be80eb",
    "core:12.10:select-one-composition-option",
    "ccb2955fef824f32f74ea10be8105bd2f6ecb5fba160cb6404b02727b92ca2d1"),
  clause("rule-atom:singleton:core-12-10-upgrade-cost-listing:a43c9551b89c",
    "core:12.10:upgrade-cost-listing",
    "952af0468fdba4cd31e484facd468a7ee9c7ea159bc4c09a5d17c2c3f297ac65"),
  clause("rule-atom:singleton:core-12-10-upgrade-unit-wide-default:4d82cdad8e53",
    "core:12.10:upgrade-unit-wide-default",
    "53b7372877dbc5d2d3c2f26b400290094962f890c4b820f3621a2557d1754494"),
  clause("rule-atom:singleton:core-2-2-composition-card-count:9d8508d77bd4",
    "core:2.2:composition-card-count",
    "b5a83f2afae9fbdeb0d18434bb485834463925c15fd907d684a73964ea521f37"),
  clause("rule-atom:singleton:core-9-1-6-composition-cost-cross-reference:a2f03ae6d09b",
    "core:9.1.6:composition-cost-cross-reference",
    "2b4631b30a53b8411f1ef1e66fe7ead7327b67b0cda7d9031589802899b277e3"),
  clause("rule-atom:singleton:core-9-1-6-composition-option-cost-model-count:0955034b0cd8",
    "core:9.1.6:composition-option-cost-model-count",
    "ed5f80d85ada0da31724424af250b30f87ec2445d216a95232cc9942e9421378"),
  clause("rule-atom:singleton:core-9-1-6-composition-option-selection:5dbd74dac335",
    "core:9.1.6:composition-option-selection",
    "57a483663c3846f2624a092a0a569b217fc038633769f79ebaf785c9ab5a77b7"),
  clause("rule-atom:singleton:core-9-1-6-composition-options-cross-reference:70ef929290b3",
    "core:9.1.6:composition-options-cross-reference",
    "e96dae4b056eada79403c55f6e09ff4c45ffd479f997772d1611ee7a165cf2f5"),
  clause("rule-atom:singleton:core-9-1-6-eligible-unit-slot-fill:cc0a84fa8c36",
    "core:9.1.6:eligible-unit-slot-fill",
    "9ea5d1fac753faaa44d4743a6cf243ad3a8e1743cafd38fd08ce372841ff550c"),
  clause("rule-atom:singleton:core-9-1-6-mineral-cost-payment:e6d68b526a77",
    "core:9.1.6:mineral-cost-payment",
    "a108a77f3bfa94194b2fc5b6b7610c826bba0b12764da7e91262ac208e8174c7"),
  clause("rule-atom:starting-supply-slot-cost",
    "core:9.1.6:starting-supply-slot-cost",
    "edfa82f8f707f09ed1bd94db9097f79d20e8eddbb8165012b6fb85d2a9eec63b"),
  clause("rule-atom:singleton:core-9-1-6-unlisted-model-count-forbidden:5a9ecd7d1c49",
    "core:9.1.6:unlisted-model-count-forbidden",
    "90593a6ae90ef525af02877768bbdd9d598d6782794cb458d2778ac9959e897b"),
  clause("rule-atom:singleton:core-9-1-7-distinct-upgrade-entry-limit:b0770ffd1c23",
    "core:9.1.7:distinct-upgrade-entry-limit",
    "9aba77220b0f4dd450ab2b7bce8a1c82a040983b7c7f236f1c10a1f92af12549"),
  clause("rule-atom:singleton:core-9-1-7-upgrade-list-source:f78665cffca8",
    "core:9.1.7:upgrade-list-source",
    "39fab8834f589ff8326d92c1803e64394829de6bf42414af02bfd07aaa3b93aa"),
  clause("rule-atom:singleton:core-9-1-7-upgrade-purchase-and-cost:d799dafd888c",
    "core:9.1.7:upgrade-purchase-and-cost",
    "35c0154de9f22367022ddc1ed0cc290908243ff4d65691768538c183088efca6"),
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
function integer(value, code, detail = "") {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) fail(code, detail);
  return number;
}
function decodeHtml(value) {
  return String(value || "").replace(/<br\s*\/?\s*>/giu, " ")
    .replace(/<[^>]+>/gu, " ").replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&").replace(/&#39;/gu, "'")
    .replace(/&quot;/gu, "\"").replace(/\s+/gu, " ").trim();
}
function normalizedName(value) {
  return decodeHtml(value).normalize("NFKC").replace(/[’‘]/gu, "'")
    .replace(/[\p{Z}\p{Cf}]+/gu, " ").replace(/\s+([)\]])/gu, "$1")
    .replace(/\s+/gu, " ").trim().toLocaleLowerCase("en-US");
}
function tableRows(html) {
  return [...String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)].map((row) => (
    [...row[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/giu)]
      .map((cell) => decodeHtml(cell[1]))
  ));
}
function tables(html, recordKey) {
  const values = [...String(html).matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/giu)]
    .map((entry) => tableRows(entry[0]));
  if (values.length < 1 || values.length > 2) {
    fail("UNIT_COMPOSITION_UPGRADE_REFERENCE_TABLE_INVALID", recordKey);
  }
  return values;
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
      fail("UNIT_COMPOSITION_UPGRADE_RULE_RECORD_DRIFT", expected.recordKey);
    }
    return { ...expected, authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions?.rulesVersion };
  });
}
function profile(body, hashField = "profileHash") {
  return { ...body, [hashField]: hashStarcraftTmgContract(body) };
}
function parseReference(dataset, budgetBundle) {
  const record = dataset.recordsByKey[RULE_RECORDS[2].recordKey];
  const reference = record.payload.items.find((entry) => (
    String(entry?.title || "").startsWith("12.10 ")));
  if (!object(reference) || reference.title !== "12.10 Units and upgrade points."
    || reference.subItems?.length !== 3) {
    fail("UNIT_COMPOSITION_UPGRADE_REFERENCE_SECTION_DRIFT");
  }
  const units = [...new Map(budgetBundle.unitCompositionBudgetProfiles.map((entry) => [
    entry.recordKey, budgetBundle.factionArmyEligibilityDataBundle.unitDataBundle
      .unitProfiles.find((profileValue) => profileValue.recordKey === entry.recordKey),
  ]))].map(([, entry]) => entry);
  const byName = new Map();
  for (const unit of units) {
    const key = normalizedName(unit.unitName);
    if (byName.has(key)) fail("UNIT_COMPOSITION_UPGRADE_UNIT_NAME_AMBIGUOUS", key);
    byName.set(key, unit);
  }
  const seenUnits = new Set(); const unitCompositionProfiles = [];
  const purchasableUpgradeProfiles = [];
  for (const raceEntry of reference.subItems) {
    const factionTag = String(raceEntry?.title || "");
    if (!Array.isArray(raceEntry?.subSubItems)) {
      fail("UNIT_COMPOSITION_UPGRADE_REFERENCE_RACE_INVALID", factionTag);
    }
    for (const sourceEntry of raceEntry.subSubItems) {
      const sourceTitle = String(sourceEntry?.title || "").normalize("NFC");
      const unit = byName.get(normalizedName(sourceTitle));
      if (!unit || unit.factionTag !== factionTag || seenUnits.has(unit.recordKey)
        || sourceEntry.content?.length !== 1
        || sourceEntry.content[0]?.type !== "text") {
        fail("UNIT_COMPOSITION_UPGRADE_REFERENCE_UNIT_INVALID", sourceTitle);
      }
      seenUnits.add(unit.recordKey);
      const html = String(sourceEntry.content[0].value || "");
      const parsedTables = tables(html, unit.recordKey);
      const compositionRows = parsedTables[0];
      if (compositionRows[0]?.join("|") !== "Models|Mineral Cost|Supply Value"
        || compositionRows.length !== unit.compositions.length + 1) {
        fail("UNIT_COMPOSITION_UPGRADE_COMPOSITION_TABLE_INVALID", unit.recordKey);
      }
      const compositionOptions = compositionRows.slice(1).map((row) => {
        if (row.length !== 3) {
          fail("UNIT_COMPOSITION_UPGRADE_COMPOSITION_ROW_INVALID", unit.recordKey);
        }
        const startingModels = integer(row[0],
          "UNIT_COMPOSITION_UPGRADE_MODEL_COUNT_INVALID", unit.recordKey);
        const mineralCost = integer(row[1],
          "UNIT_COMPOSITION_UPGRADE_MINERAL_COST_INVALID", unit.recordKey);
        const startingSupply = integer(row[2],
          "UNIT_COMPOSITION_UPGRADE_STARTING_SUPPLY_INVALID", unit.recordKey);
        const sourceUnitComposition = unit.compositions.find((entry) => (
          entry.startingModels === startingModels));
        const budgetProfile = budgetBundle.unitCompositionBudgetProfiles.find((entry) => (
          entry.recordKey === unit.recordKey
            && entry.compositionKind === sourceUnitComposition?.kind));
        if (!sourceUnitComposition || !budgetProfile
          || sourceUnitComposition.startingSupply !== startingSupply
          || budgetProfile.startingModels !== startingModels
          || budgetProfile.startingSupply !== startingSupply
          || budgetProfile.mineralCost !== sourceUnitComposition.pointsCost) {
          fail("UNIT_COMPOSITION_UPGRADE_COMPOSITION_CROSS_REFERENCE_INVALID",
            `${unit.recordKey}:${startingModels}`);
        }
        return profile({ schema:
          "starcraft_tmg_official_unit_composition_option_profile_v1",
        compositionProfileId: budgetProfile.budgetProfileId,
        recordKey: unit.recordKey, unitId: unit.unitId, unitName: unit.unitName,
        compositionKind: sourceUnitComposition.kind, startingModels,
        startingSupply, occupiedArmySlots: startingSupply,
        mineralCost: budgetProfile.mineralCost,
        armyReferenceMineralCost: mineralCost,
        mineralCostReconciliation: budgetProfile.mineralCost === mineralCost
          ? "part_12_and_current_product_agree"
          : "current_product_record_wins_part_12_value_preserved",
        sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
        sourceUnitProfileHash: unit.profileHash,
        sourceBudgetProfileHash: budgetProfile.budgetProfileHash,
        armyReferenceEntryTitle: sourceTitle,
        armyReferenceEntryHash: hashStarcraftTmgContract(sourceEntry),
        modelCountAuthority: "current_unit_card_and_part_12_10_cross_reference",
        startingSupplyAuthority: "current_unit_card_supply_profile_and_part_12_10",
        mineralCostAuthority: budgetProfile.mineralCost === mineralCost
          ? "current_unit_record_and_part_12_10"
          : "current_official_unit_record_with_part_12_conflict_preserved",
        trainingTruth: false });
      });

      const recordValue = getOfficialCurrentProductRecord(dataset, unit.recordKey);
      const definitions = recordValue.payload?.upgrades;
      if (!Array.isArray(definitions)
        || hashStarcraftTmgContract(definitions) !== unit.upgradeSide.definitionsHash) {
        fail("UNIT_COMPOSITION_UPGRADE_DEFINITION_SOURCE_DRIFT", unit.recordKey);
      }
      const upgradeRows = parsedTables[1]?.slice(1) || [];
      if (parsedTables[1] && (!parsedTables[1][0]?.[0]?.startsWith("Upgrade")
        || parsedTables[1][0]?.[1] !== "Type" || parsedTables[1][0]?.length !== 4)) {
        fail("UNIT_COMPOSITION_UPGRADE_UPGRADE_TABLE_INVALID", unit.recordKey);
      }
      const unitUpgradeProfiles = upgradeRows.map((row, armyReferenceUpgradeIndex) => {
        if (row.length !== 4) {
          fail("UNIT_COMPOSITION_UPGRADE_UPGRADE_ROW_INVALID", unit.recordKey);
        }
        const upgradeName = String(row[0] || "").normalize("NFC").trim();
        const matches = definitions.map((entry, upgradeIndex) => ({ entry, upgradeIndex }))
          .filter(({ entry }) => normalizedName(entry?.name) === normalizedName(upgradeName));
        if (matches.length !== 1) {
          fail("UNIT_COMPOSITION_UPGRADE_PURCHASABLE_DEFINITION_INVALID",
            `${unit.recordKey}:${upgradeName}`);
        }
        const { entry: definition, upgradeIndex } = matches[0];
        const budgetProfile = budgetBundle.upgradeBudgetProfiles.find((entry) => (
          entry.recordKey === unit.recordKey && entry.upgradeIndex === upgradeIndex));
        if (!budgetProfile || budgetProfile.definitionHash
          !== hashStarcraftTmgContract(definition)) {
          fail("UNIT_COMPOSITION_UPGRADE_BUDGET_PROFILE_INVALID",
            `${unit.recordKey}:${upgradeName}`);
        }
        const costByComposition = {};
        for (const [index, option] of compositionOptions.entries()) {
          const printed = String(row[index + 2] || "").trim();
          if (!/^\d+$/u.test(printed)) {
            fail("UNIT_COMPOSITION_UPGRADE_LISTED_COST_REQUIRED",
              `${unit.recordKey}:${upgradeName}:${option.compositionKind}`);
          }
          const value = integer(printed, "UNIT_COMPOSITION_UPGRADE_LISTED_COST_INVALID",
            `${unit.recordKey}:${upgradeName}`);
          if (budgetProfile.mineralCostByComposition[option.compositionKind] !== value) {
            fail("UNIT_COMPOSITION_UPGRADE_COST_CROSS_REFERENCE_INVALID",
              `${unit.recordKey}:${upgradeName}:${option.compositionKind}`);
          }
          costByComposition[option.compositionKind] = value;
        }
        const printedType = String(row[1] || "").normalize("NFC").trim();
        const specialist = /\bSPECIALIST\b/u.test(printedType);
        if (specialist !== /\bSPECIALIST\b/u.test(String(definition.description || ""))) {
          fail("UNIT_COMPOSITION_UPGRADE_SPECIALIST_CROSS_REFERENCE_INVALID",
            `${unit.recordKey}:${upgradeName}`);
        }
        const linkedTo = String(definition.linkedTo || "").normalize("NFC").trim();
        const replacementTargetName = linkedTo && linkedTo !== "-" ? linkedTo : null;
        const printedReplacementTarget = printedType.includes("↑")
          ? printedType.split("↑")[1].replace(/^\s*FOR\s+/u, "").trim()
          : (!specialist && printedType !== "-" ? printedType : null);
        if (printedReplacementTarget && normalizedName(printedReplacementTarget)
          !== normalizedName(replacementTargetName)) {
          fail("UNIT_COMPOSITION_UPGRADE_REPLACEMENT_CROSS_REFERENCE_INVALID",
            `${unit.recordKey}:${upgradeName}`);
        }
        return profile({ schema:
          "starcraft_tmg_official_purchasable_upgrade_profile_v1",
        purchasableUpgradeProfileId:
          `${unit.recordKey}:purchasable:${armyReferenceUpgradeIndex}`,
        recordKey: unit.recordKey, unitId: unit.unitId, unitName: unit.unitName,
        upgradeIndex, upgradeName: String(definition.name || "").normalize("NFC"),
        phase: String(definition.phase || ""), activation: String(definition.activation || ""),
        description: String(definition.description || ""),
        applicationKind: specialist ? "specialist_one_model" : "unit_wide",
        specialistAssignmentRequired: specialist,
        sameEntryPurchaseLimit: 1,
        differentEntriesMayBeCombined: true,
        replacementTargetName, printedArmyReferenceType: printedType,
        armyReferenceReplacementDeclared: Boolean(printedReplacementTarget),
        replacementReconciliation: replacementTargetName && !printedReplacementTarget
          ? "current_product_link_only" : "part_12_and_current_product_agree",
        mineralCostByComposition: costByComposition,
        sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
        sourceUnitProfileHash: unit.profileHash,
        sourceDefinitionHash: hashStarcraftTmgContract(definition),
        sourceBudgetProfileId: budgetProfile.budgetProfileId,
        sourceBudgetProfileHash: budgetProfile.budgetProfileHash,
        armyReferenceEntryTitle: sourceTitle,
        armyReferenceEntryHash: hashStarcraftTmgContract(sourceEntry),
        armyReferenceUpgradeIndex, trainingTruth: false });
      });
      purchasableUpgradeProfiles.push(...unitUpgradeProfiles);
      unitCompositionProfiles.push(profile({ schema:
        "starcraft_tmg_official_unit_composition_reference_profile_v1",
      recordKey: unit.recordKey, unitId: unit.unitId, unitName: unit.unitName,
      factionTag, sourceRecordHash: unit.sourceRecordHash,
      payloadHash: unit.payloadHash, sourceUnitProfileHash: unit.profileHash,
      armySlotType: unit.armySlotType, armyReferenceEntryTitle: sourceTitle,
      armyReferenceEntryHash: hashStarcraftTmgContract(sourceEntry),
      compositionOptions, compositionOptionCount: compositionOptions.length,
      purchasableUpgradeProfileIds: unitUpgradeProfiles
        .map((entry) => entry.purchasableUpgradeProfileId),
      purchasableUpgradeCount: unitUpgradeProfiles.length,
      exactlyOneCompositionRequired: true, unlistedModelCountForbidden: true,
      startingSupplyEqualsOccupiedArmySlots: true, trainingTruth: false }));
    }
  }
  if (seenUnits.size !== units.length) {
    fail("UNIT_COMPOSITION_UPGRADE_REFERENCE_DENOMINATOR_DRIFT");
  }
  unitCompositionProfiles.sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  purchasableUpgradeProfiles.sort((left, right) => (
    left.purchasableUpgradeProfileId.localeCompare(right.purchasableUpgradeProfileId)));
  return { reference, unitCompositionProfiles, purchasableUpgradeProfiles };
}

export function createOfficialUnitCompositionUpgradeDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) fail("UNIT_COMPOSITION_UPGRADE_DATASET_INVALID");
  const armyResourceBudgetDataBundle =
    createOfficialArmyResourceBudgetDataBundleV1({ dataset });
  const compiled = parseReference(dataset, armyResourceBudgetDataBundle);
  const audit = { unitReferenceCount: compiled.unitCompositionProfiles.length,
    compositionOptionCount: compiled.unitCompositionProfiles.reduce((sum, entry) => (
      sum + entry.compositionOptionCount), 0),
    purchasableUpgradeCount: compiled.purchasableUpgradeProfiles.length,
    specialistUpgradeCount: compiled.purchasableUpgradeProfiles.filter((entry) => (
      entry.specialistAssignmentRequired)).length,
    unitWideUpgradeCount: compiled.purchasableUpgradeProfiles.filter((entry) => (
      entry.applicationKind === "unit_wide")).length,
    currentProductReplacementCount: compiled.purchasableUpgradeProfiles.filter((entry) => (
      entry.replacementTargetName)).length,
    armyReferenceReplacementCount: compiled.purchasableUpgradeProfiles.filter((entry) => (
      entry.armyReferenceReplacementDeclared)).length,
    currentProductLinkOnlyReplacementCount: compiled.purchasableUpgradeProfiles.filter((entry) => (
      entry.replacementReconciliation === "current_product_link_only")).length,
    compositionCostConflictCount: compiled.unitCompositionProfiles.flatMap((entry) => (
      entry.compositionOptions)).filter((entry) => entry.mineralCostReconciliation
        === "current_product_record_wins_part_12_value_preserved").length,
    compositionCostConflictRecordKeys: compiled.unitCompositionProfiles.flatMap((entry) => (
      entry.compositionOptions)).filter((entry) => entry.mineralCostReconciliation
        === "current_product_record_wins_part_12_value_preserved")
      .map((entry) => entry.recordKey).sort(),
    zeroCostPurchasableUpgradeCount: compiled.purchasableUpgradeProfiles.filter((entry) => (
      Object.values(entry.mineralCostByComposition).every((value) => value === 0))).length };
  const expectedAudit = { unitReferenceCount: 22, compositionOptionCount: 28,
    purchasableUpgradeCount: 52, specialistUpgradeCount: 2,
    unitWideUpgradeCount: 50, currentProductReplacementCount: 8,
    armyReferenceReplacementCount: 7, currentProductLinkOnlyReplacementCount: 1,
    compositionCostConflictCount: 2,
    compositionCostConflictRecordKeys: ["army_units:corpser__roach_", "army_units:jim_raynor"],
    zeroCostPurchasableUpgradeCount: 1 };
  if (hashStarcraftTmgContract(audit) !== hashStarcraftTmgContract(expectedAudit)) {
    fail("UNIT_COMPOSITION_UPGRADE_PROFILE_AUDIT_DRIFT");
  }
  const body = { schema: OFFICIAL_UNIT_COMPOSITION_UPGRADE_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_UNIT_COMPOSITION_UPGRADE_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48", officialUnitsVersion: "71", officialCardsVersion: "69",
    ruleSectionRecords: exactRuleSectionRecords(dataset), ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    armyReferenceSection: { title: compiled.reference.title,
      sectionHash: hashStarcraftTmgContract(compiled.reference),
      sourceRecordKey: RULE_RECORDS[2].recordKey,
      sourceRecordHash: RULE_RECORDS[2].sourceRecordHash,
      payloadHash: RULE_RECORDS[2].payloadHash },
    unitCompositionProfiles: compiled.unitCompositionProfiles,
    unitCompositionProfileIndexHash:
      hashStarcraftTmgContract(compiled.unitCompositionProfiles),
    purchasableUpgradeProfiles: compiled.purchasableUpgradeProfiles,
    purchasableUpgradeProfileIndexHash:
      hashStarcraftTmgContract(compiled.purchasableUpgradeProfiles),
    armyResourceBudgetDataBundle, audit,
    exactSelectionPolicy: { exactlyOneCompositionPerUnit: true,
      unlistedModelCountAllowed: false, startingSupplyIsOccupiedArmySlots: true,
      purchaseOnlyPart12ListedUpgrades: true, sameUpgradeEntryRepeatAllowed: false,
      differentUpgradeEntriesMayBeCombined: true,
      unitWideDefaultExceptSpecialist: true,
      specialistNominatedModelRequired: true,
      differentSpecialistsRequireDifferentModels: true,
      clientSuppliedCountsSupplyCostsOrApplicationAccepted: false },
    sourceReconciliation: {
      part12ReferenceRole: "purchasable_upgrade_and_composition_denominator",
      currentUnitRecordRole: "definition_identity_linkage_and_cost_cross_reference",
      allCurrentUpgradeDefinitionsArePurchasable: false,
      currentUpgradeDefinitionCount: 171, purchasableUpgradeCount: 52,
      compositionCostConflictCount: 2,
      compositionCostConflictDisposition:
        "current_official_unit_record_wins_part_12_value_remains_displayable",
      currentProductLinkWithoutPart12ReplacementMarkerCount: 1,
      currentProductLinkWithoutPart12ReplacementMarkerDisposition:
        "preserved_as_source_bound_reconciliation_metadata" },
    sourcePolicy: { captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
      commandCenterRole: "current_unit_composition_upgrade_definition_and_price_identity",
      pdfRole: "primary_normative_composition_upgrade_and_specialist_source" },
    deferredRules: { unitEquipmentAndRosterDisclosure: "slice_105" },
    productionRoomEligible: false,
    rulesTruth: "official_unit_composition_upgrade_and_specialist_source_index",
    trainingTruth: false };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_UNIT_COMPOSITION_UPGRADE_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_UNIT_COMPOSITION_UPGRADE_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48" || bundle.officialUnitsVersion !== "71"
    || bundle.officialCardsVersion !== "69" || bundle.ruleSectionRecords?.length !== 3
    || bundle.ruleClauses?.length !== 16 || bundle.unitCompositionProfiles?.length !== 22
    || bundle.purchasableUpgradeProfiles?.length !== 52
    || bundle.audit?.compositionOptionCount !== 28
    || bundle.audit?.specialistUpgradeCount !== 2
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(bundle.ruleClauses)
    || bundle.unitCompositionProfileIndexHash
      !== hashStarcraftTmgContract(bundle.unitCompositionProfiles)
    || bundle.purchasableUpgradeProfileIndexHash
      !== hashStarcraftTmgContract(bundle.purchasableUpgradeProfiles)
    || bundle.exactSelectionPolicy?.exactlyOneCompositionPerUnit !== true
    || bundle.exactSelectionPolicy?.purchaseOnlyPart12ListedUpgrades !== true
    || bundle.exactSelectionPolicy?.clientSuppliedCountsSupplyCostsOrApplicationAccepted
      !== false
    || bundle.sourceReconciliation?.allCurrentUpgradeDefinitionsArePurchasable !== false
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("UNIT_COMPOSITION_UPGRADE_DATA_BUNDLE_INVALID");
  }
  verifyOfficialArmyResourceBudgetDataBundleV1(bundle.armyResourceBudgetDataBundle);
  const compositionIds = new Set();
  for (const unit of bundle.unitCompositionProfiles) {
    if (!object(unit) || unit.profileHash
      !== hashStarcraftTmgContract(without(unit, ["profileHash"]))) {
      fail("UNIT_COMPOSITION_UPGRADE_UNIT_PROFILE_INVALID", unit?.recordKey);
    }
    for (const option of unit.compositionOptions || []) {
      if (compositionIds.has(option.compositionProfileId)
        || option.profileHash !== hashStarcraftTmgContract(without(option, ["profileHash"]))) {
        fail("UNIT_COMPOSITION_UPGRADE_COMPOSITION_PROFILE_INVALID",
          option?.compositionProfileId);
      }
      compositionIds.add(option.compositionProfileId);
    }
  }
  const upgradeIds = new Set();
  for (const upgrade of bundle.purchasableUpgradeProfiles) {
    if (!object(upgrade) || upgradeIds.has(upgrade.purchasableUpgradeProfileId)
      || upgrade.profileHash
        !== hashStarcraftTmgContract(without(upgrade, ["profileHash"]))) {
      fail("UNIT_COMPOSITION_UPGRADE_PURCHASABLE_PROFILE_INVALID",
        upgrade?.purchasableUpgradeProfileId);
    }
    upgradeIds.add(upgrade.purchasableUpgradeProfileId);
  }
  if (compositionIds.size !== 28 || upgradeIds.size !== 52
    || new Set(bundle.ruleClauses.map((entry) => entry.atomId)).size !== 16
    || bundle.ruleClauses.some((entry) => !/^[a-f0-9]{64}$/u.test(
      entry.candidateSequenceHash))) {
    fail("UNIT_COMPOSITION_UPGRADE_DENOMINATOR_INVALID");
  }
  return true;
}

export function getOfficialUnitCompositionReferenceProfileV1(bundle, recordKey) {
  verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle);
  const value = bundle.unitCompositionProfiles.find((entry) => (
    entry.recordKey === String(recordKey || "")));
  if (!value) fail("UNIT_COMPOSITION_REFERENCE_PROFILE_REQUIRED", String(recordKey || ""));
  return value;
}

export function getOfficialUnitCompositionOptionProfileV1(bundle, profileId) {
  verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle);
  const value = bundle.unitCompositionProfiles.flatMap((entry) => entry.compositionOptions)
    .find((entry) => entry.compositionProfileId === String(profileId || ""));
  if (!value) fail("UNIT_COMPOSITION_OPTION_PROFILE_REQUIRED", String(profileId || ""));
  return value;
}

export function getOfficialPurchasableUpgradeProfileV1(bundle, profileId) {
  verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle);
  const value = bundle.purchasableUpgradeProfiles.find((entry) => (
    entry.purchasableUpgradeProfileId === String(profileId || "")));
  if (!value) fail("PURCHASABLE_UPGRADE_PROFILE_REQUIRED", String(profileId || ""));
  return value;
}
