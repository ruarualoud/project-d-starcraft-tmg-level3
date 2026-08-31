import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";

export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_keyword_special_ability_data_bundle_v1";
export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_RECORDS = Object.freeze([
  Object.freeze({
    recordKey: "rules_sections:QX7B9DFpviRo84fVCBIj",
    title: "PART 2: CORE CONCEPTS",
    sourceRecordHash: "f7fce5a24ed1962598abb556f43a7cfffcfb541404c6bb705d119379b4094964",
    payloadHash: "615c599d401b8457266c56d1033a4259c0d1f353ba686becab05876a3af66acb",
  }),
  Object.freeze({
    recordKey: "rules_sections:H3Fn8YSvEvpJZpT57qw1",
    title: "PART 10: ADVANCED RULES",
    sourceRecordHash: "b2d1089659ae55440711a8c5315e70142c4777c4e1a94268abddb768ca8c1f13",
    payloadHash: "05da4c287b6e7fe8f9f3159269cf668ead93e74f10df49a666a1ee36c521f206",
  }),
  Object.freeze({
    recordKey: "rules_sections:FuahgilWtc8nccVSp2Vv",
    title: "PART 11: KEYWORD GLOSSARY AND DEFINITIONS",
    sourceRecordHash: "985e79f70c48caf1b1085e620e92be23f5b4468ffe07fdc5f84cb01a28fa59b7",
    payloadHash: "4a6aa9e55e3b4197666b0f4fed633269dc42327af16f5b5a5422b7533d7d8973",
  }),
]);

const CATEGORY_PATTERN = /<(Active|Passive|Reaction)>/giu;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function normalizedName(value) {
  return String(value || "").trim().toLocaleUpperCase("en-US");
}
function categoriesIn(value) {
  return [...String(value || "").matchAll(CATEGORY_PATTERN)]
    .map((match) => match[1].toLocaleLowerCase("en-US"));
}

function exactRuleSectionRecords(dataset) {
  return RULE_RECORDS.map((expected) => {
    const record = dataset.recordsByKey[expected.recordKey];
    const index = dataset.recordIndex.find((entry) => (
      entry.recordKey === expected.recordKey
    ));
    if (!object(record) || !object(index)
      || index.authorityDisposition !== "official_rule_prose_review_required"
      || record.payload?.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash) {
      fail("KEYWORD_SPECIAL_ABILITY_RULE_RECORD_DRIFT", expected.recordKey);
    }
    return { ...expected,
      authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions?.rulesVersion };
  });
}

function compileKeywordDefinitions(dataset) {
  const record = dataset.recordsByKey[RULE_RECORDS[2].recordKey];
  const entries = (record.payload?.items || []).flatMap((item) => item.subItems || []);
  if (entries.length !== 76) fail("KEYWORD_GLOSSARY_DENOMINATOR_DRIFT");
  const seen = new Set();
  return entries.map((entry, sourceOrdinal) => {
    const title = String(entry?.title || "").trim();
    const canonicalTitle = normalizedName(title);
    if (!title || seen.has(canonicalTitle)) {
      fail("KEYWORD_GLOSSARY_ENTRY_INVALID", title);
    }
    seen.add(canonicalTitle);
    return {
      keywordId: `official-keyword:${canonicalTitle}`,
      title,
      canonicalTitle,
      sourceOrdinal,
      parameterized: /[[(](?:X|Y|TAG|CHARACTERISTIC|NAME|UNIT NAME)[\])]/iu.test(title)
        || /\bX(?:\s|$)/u.test(canonicalTitle),
      numericParameter: /\(X\)|\bX(?:\s|$)/u.test(canonicalTitle),
      meaningHash: hashStarcraftTmgContract(entry),
      sourceRecordKey: record.recordKey,
      sourceRecordHash: record.sourceRecordHash,
      payloadHash: record.payloadHash,
    };
  }).sort((left, right) => left.canonicalTitle.localeCompare(right.canonicalTitle));
}

function compileSpecialAbilities(dataset) {
  const abilities = [];
  let ignoredNonAbilityUnitUpgradeCount = 0;
  const currentProductRecords = dataset.recordIndex.filter((entry) => (
    entry.authorityDisposition === "official_current_product_candidate"
      && ["unit", "tactical_card"].includes(entry.recordType)
  ));
  for (const index of currentProductRecords) {
    const record = dataset.recordsByKey[index.recordKey];
    if (!object(record)
      || record.sourceRecordHash !== index.sourceRecordHash
      || record.payloadHash !== index.payloadHash) {
      fail("SPECIAL_ABILITY_PRODUCT_RECORD_DRIFT", index.recordKey);
    }
    const unit = index.recordType === "unit";
    const sourceKind = unit ? "unit"
      : record.payload.isFactionCard === true ? "faction_card" : "tactical_card";
    const items = unit ? record.payload.upgrades : record.payload.boosts;
    if (!Array.isArray(items)) fail("SPECIAL_ABILITY_SOURCE_ITEMS_INVALID", index.recordKey);
    items.forEach((item, sourceOrdinal) => {
      const markerText = unit ? item?.activation : item?.description;
      const categories = categoriesIn(markerText);
      if (unit && categories.length === 0) {
        ignoredNonAbilityUnitUpgradeCount += 1;
        return;
      }
      const name = String(item?.name || "").trim();
      if (!name || categories.length !== 1) {
        fail("SPECIAL_ABILITY_CATEGORY_AMBIGUOUS",
          `${index.recordKey}:${sourceOrdinal}`);
      }
      const definitionHash = hashStarcraftTmgContract(item);
      const completeSourceText = `${String(item.activation || "")}\n`
        + String(item.description || "");
      abilities.push({
        abilityId: `${index.recordKey}#${unit ? "upgrades" : "boosts"}[${sourceOrdinal}]`,
        name,
        canonicalName: normalizedName(name),
        category: categories[0],
        sourceKind,
        sourceOrdinal,
        phase: String(item.phase || "").trim(),
        repeatableKeywordPresent: /\bREPEATABLE\b/iu.test(completeSourceText),
        definitionHash,
        sourceTextHash: hashStarcraftTmgContract({
          activation: String(item.activation || ""),
          description: String(item.description || ""),
        }),
        sourceRecordKey: record.recordKey,
        sourceRecordHash: record.sourceRecordHash,
        payloadHash: record.payloadHash,
      });
    });
  }
  abilities.sort((left, right) => left.abilityId.localeCompare(right.abilityId));
  if (currentProductRecords.filter((entry) => entry.recordType === "unit").length !== 26
    || currentProductRecords.filter((entry) => entry.recordType === "tactical_card").length
      !== 37
    || abilities.length !== 201
    || ignoredNonAbilityUnitUpgradeCount !== 51) {
    fail("SPECIAL_ABILITY_DENOMINATOR_DRIFT");
  }
  return { abilities, ignoredNonAbilityUnitUpgradeCount };
}

function duplicateNameAudit(abilities) {
  const groups = new Map();
  for (const ability of abilities) {
    if (!groups.has(ability.canonicalName)) groups.set(ability.canonicalName, []);
    groups.get(ability.canonicalName).push(ability);
  }
  const duplicates = [...groups.entries()].filter(([, entries]) => entries.length > 1)
    .map(([canonicalName, entries]) => ({
      canonicalName,
      instanceCount: entries.length,
      categories: [...new Set(entries.map((entry) => entry.category))].sort(),
      definitionHashes: [...new Set(entries.map((entry) => entry.definitionHash))].sort(),
      abilityIds: entries.map((entry) => entry.abilityId).sort(),
    })).sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
  return {
    uniqueNameCount: groups.size,
    duplicateNameCount: duplicates.length,
    categoryConflictNameCount: duplicates.filter((entry) => entry.categories.length > 1).length,
    differentDefinitionNameCount:
      duplicates.filter((entry) => entry.definitionHashes.length > 1).length,
    duplicates,
  };
}

export function createOfficialKeywordSpecialAbilityDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false
    || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) {
    fail("KEYWORD_SPECIAL_ABILITY_DATASET_INVALID");
  }
  const ruleSectionRecords = exactRuleSectionRecords(dataset);
  const keywordDefinitions = compileKeywordDefinitions(dataset);
  const compiledAbilities = compileSpecialAbilities(dataset);
  const duplicateAudit = duplicateNameAudit(compiledAbilities.abilities);
  if (duplicateAudit.uniqueNameCount !== 139
    || duplicateAudit.duplicateNameCount !== 30
    || duplicateAudit.categoryConflictNameCount !== 2
    || duplicateAudit.differentDefinitionNameCount !== 9) {
    fail("SPECIAL_ABILITY_DUPLICATE_AUDIT_DRIFT");
  }
  const body = {
    schema: OFFICIAL_KEYWORD_SPECIAL_ABILITY_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_KEYWORD_SPECIAL_ABILITY_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48",
    officialUnitsVersion: String(dataset.dataVersions?.unitsVersion || ""),
    officialTacticalCardsVersion: String(dataset.dataVersions?.cardsVersion || ""),
    ruleSectionRecords,
    keywordDefinitions,
    keywordDefinitionIndexHash: hashStarcraftTmgContract(keywordDefinitions),
    specialAbilities: compiledAbilities.abilities,
    specialAbilityIndexHash: hashStarcraftTmgContract(compiledAbilities.abilities),
    specialAbilityAudit: {
      officialUnitRecordCount: 26,
      officialTacticalAndFactionCardRecordCount: 37,
      ignoredNonAbilityUnitUpgradeCount: compiledAbilities.ignoredNonAbilityUnitUpgradeCount,
      specialAbilityCount: compiledAbilities.abilities.length,
      unitAbilityCount: compiledAbilities.abilities.filter((entry) => (
        entry.sourceKind === "unit"
      )).length,
      tacticalCardAbilityCount: compiledAbilities.abilities.filter((entry) => (
        entry.sourceKind === "tactical_card"
      )).length,
      factionCardAbilityCount: compiledAbilities.abilities.filter((entry) => (
        entry.sourceKind === "faction_card"
      )).length,
      activeCount: compiledAbilities.abilities.filter((entry) => (
        entry.category === "active"
      )).length,
      passiveCount: compiledAbilities.abilities.filter((entry) => (
        entry.category === "passive"
      )).length,
      reactionCount: compiledAbilities.abilities.filter((entry) => (
        entry.category === "reaction"
      )).length,
      repeatableAbilityCount: compiledAbilities.abilities.filter((entry) => (
        entry.repeatableKeywordPresent
      )).length,
      ...duplicateAudit,
    },
    sourceLocators: [
      { section: "2.6.1", printedPages: [29], scope: "keyword_format_meaning_and_nonstack" },
      { section: "2.7", printedPages: [29], scope: "special_ability_category_summary" },
      { section: "10.1", printedPages: [79], scope: "ability_structure_targeting_and_nonstack" },
      { section: "10.2", printedPages: [79], scope: "active_and_repeatable_frequency" },
      { section: "11/INTRO", printedPages: [81], scope: "keyword_nonstack_and_numeric_highest" },
      { section: "11/REPEATABLE", printedPages: [90], scope: "repeatable_permission" },
      { section: "11/SPECIAL ABILITY", printedPages: [91], scope: "definition_categories_and_nonstack" },
    ],
    sourcePolicy: {
      captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false,
      commandCenterRole: "current_official_product_and_rule_prose_cross_check",
      pdfRole: "primary_normative_core_rules_source",
    },
    productionRoomEligible: false,
    rulesTruth: "official_keyword_and_special_ability_primitive_source_index",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialKeywordSpecialAbilityDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialKeywordSpecialAbilityDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_KEYWORD_SPECIAL_ABILITY_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_KEYWORD_SPECIAL_ABILITY_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48"
    || bundle.officialUnitsVersion !== "71"
    || bundle.officialTacticalCardsVersion !== "69"
    || !Array.isArray(bundle.keywordDefinitions)
    || bundle.keywordDefinitions.length !== 76
    || !Array.isArray(bundle.specialAbilities)
    || bundle.specialAbilities.length !== 201
    || bundle.keywordDefinitionIndexHash
      !== hashStarcraftTmgContract(bundle.keywordDefinitions)
    || bundle.specialAbilityIndexHash !== hashStarcraftTmgContract(bundle.specialAbilities)
    || bundle.specialAbilityAudit?.uniqueNameCount !== 139
    || bundle.specialAbilityAudit?.duplicateNameCount !== 30
    || bundle.specialAbilityAudit?.categoryConflictNameCount !== 2
    || bundle.specialAbilityAudit?.differentDefinitionNameCount !== 9
    || bundle.specialAbilityAudit?.unitAbilityCount !== 132
    || bundle.specialAbilityAudit?.tacticalCardAbilityCount !== 55
    || bundle.specialAbilityAudit?.factionCardAbilityCount !== 14
    || bundle.specialAbilityAudit?.activeCount !== 87
    || bundle.specialAbilityAudit?.passiveCount !== 90
    || bundle.specialAbilityAudit?.reactionCount !== 24
    || bundle.specialAbilityAudit?.repeatableAbilityCount !== 1
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false
    || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("KEYWORD_SPECIAL_ABILITY_DATA_BUNDLE_INVALID");
  }
  for (const expected of RULE_RECORDS) {
    const record = bundle.ruleSectionRecords?.find((entry) => (
      entry.recordKey === expected.recordKey
    ));
    if (!object(record) || record.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash
      || record.authorityDisposition !== "official_rule_prose_review_required"
      || record.sourceVersion !== "48") {
      fail("KEYWORD_SPECIAL_ABILITY_RULE_RECORD_INVALID", expected.recordKey);
    }
  }
  return true;
}
