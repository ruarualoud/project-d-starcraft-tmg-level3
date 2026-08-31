import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";

export const OFFICIAL_CARD_BUILD_PAYMENT_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_card_build_payment_data_bundle_v1";
export const OFFICIAL_CARD_BUILD_PAYMENT_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const SLOT_KEYS = Object.freeze(["Air", "Core", "Elite", "Hero", "Support"]);
const RACES = new Set(["Protoss", "Terran", "Zerg"]);
const RESOURCE_BY_RACE = Object.freeze({ Protoss: "PE", Terran: "CP", Zerg: "BM" });
const RULE_RECORDS = Object.freeze([
  Object.freeze({ recordKey: "rules_sections:u3zNStKpd5XegMjmJfMS",
    title: "PART 5: CARDS AND CHARACTERISTICS",
    sourceRecordHash: "026a4a9b0f3c0bae10a76ee28e48655cbf117cc01e304c57d7dfc2f5522f1175",
    payloadHash: "bd1eb44d676bac9a2a2643122f3af1fb90625c29e905aef56b9417f5733f86c5" }),
  Object.freeze({ recordKey: "rules_sections:Rj6sMyNODPQ8OHUc9Clp",
    title: "PART 9: PREPARING FOR BATTLE",
    sourceRecordHash: "8c91884a93418869ca6878fdf0f3868278008728f1d28995f3f6e3bf8e85e282",
    payloadHash: "3197f311085315cabe06dcda95a0e2ab3a744d7c97571c9df02d27a27186dc2a" }),
  Object.freeze({ recordKey: "rules_sections:H3Fn8YSvEvpJZpT57qw1",
    title: "PART 10: ADVANCED RULES",
    sourceRecordHash: "b2d1089659ae55440711a8c5315e70142c4777c4e1a94268abddb768ca8c1f13",
    payloadHash: "05da4c287b6e7fe8f9f3159269cf668ead93e74f10df49a666a1ee36c521f206" }),
]);
const RULE_CLAUSES = Object.freeze([
  Object.freeze({ clauseId: "core:10.5.1:excess-resources-lost", section: "10.5.1",
    printedPage: 83, sourceTextHash:
      "b95e6ea5e699a3cedafe6b49b57c4a5b30f1eb6f9dc59e9c30c86d05f8658819" }),
  Object.freeze({ clauseId: "core:10.5:card-name-field", section: "10.5",
    printedPage: 83, sourceTextHash:
      "12ec993dc0eb326cb24296ad3568590b6d175b5a2ead5c90a310d17cc021fd35" }),
  Object.freeze({ clauseId: "core:10.5:standard-card-layout", section: "10.5",
    printedPage: 83, sourceTextHash:
      "87ae35eba1c4690152e0d675f9fb0510e1048bb373d665773d534d5436cbc364" }),
  Object.freeze({ clauseId: "core:5.3:tactical-card-army-slots", section: "5.3",
    printedPage: 42, sourceTextHash:
      "f6a6245be25c925651c87f4e4b608d8e446535c9c932443e33dae5e159f49fd5" }),
  Object.freeze({ clauseId: "core:5.3:tactical-card-faction-tags", section: "5.3",
    printedPage: 42, sourceTextHash:
      "b275b5acc540a2abab421a6ab9bc233caf27a96a159b2d45f66354c24ec76efb" }),
  Object.freeze({ clauseId: "core:5.3:tactical-card-purchase", section: "5.3",
    printedPage: 42, sourceTextHash:
      "d900035ff62f532ed3ec3c88971805b67efeb16eaa27d25cac6b5bbeb4694a3e" }),
  Object.freeze({ clauseId: "core:10.5:unique-card-copy-limit", section: "10.5",
    printedPage: 83, sourceTextHash:
      "06c641d4cc36480c9a0f7c23c1d6949b00e7b438bbc9395b30e8a5138df64b94" }),
  Object.freeze({ clauseId: "core:5.3:tactical-card-unique", section: "5.3",
    printedPage: 42, sourceTextHash:
      "2e04e6fde4594ae1b1eb6333f50cd631767d07bb1d03e4f515a4ecf57b3b0384" }),
  Object.freeze({ clauseId: "core:9.1.5:unique-tactical-card-copy-limit", section: "9.1.5",
    printedPage: 76, sourceTextHash:
      "b43c3bc7d7e6faa3afdd3349e4a79a5a6ca13f83b006922bc9703f2738502116" }),
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
function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
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
      fail("CARD_BUILD_PAYMENT_RULE_RECORD_DRIFT", expected.recordKey);
    }
    return { ...expected, authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions?.rulesVersion };
  });
}

function compileCards(dataset) {
  const indexes = dataset.recordIndex.filter((entry) => (
    entry.authorityDisposition === "official_current_product_candidate"
      && entry.recordType === "tactical_card"
  ));
  if (indexes.length !== 37) fail("CARD_BUILD_PAYMENT_CARD_DENOMINATOR_DRIFT");
  const factionRecords = indexes.map((index) => dataset.recordsByKey[index.recordKey])
    .filter((record) => record?.payload?.isFactionCard === true);
  if (factionRecords.length !== 6) fail("CARD_BUILD_PAYMENT_FACTION_CARD_DENOMINATOR_DRIFT");
  const subFactionRace = new Map();
  for (const record of factionRecords) {
    const race = String(record.payload.faction || "");
    if (!RACES.has(race)) fail("CARD_BUILD_PAYMENT_FACTION_RACE_INVALID", record.recordKey);
    for (const tag of uniqueStrings(record.payload.factionTags || [])) {
      if (RACES.has(tag) && tag !== race) fail("CARD_BUILD_PAYMENT_FACTION_TAG_INVALID", tag);
      const existing = subFactionRace.get(tag);
      if (existing && existing !== race) fail("CARD_BUILD_PAYMENT_FACTION_TAG_AMBIGUOUS", tag);
      subFactionRace.set(tag, race);
    }
  }
  const sourceIndex = [];
  const profiles = indexes.map((index) => {
    const record = dataset.recordsByKey[index.recordKey];
    if (!object(record) || record.recordType !== "tactical_card"
      || record.sourceRecordHash !== index.sourceRecordHash
      || record.payloadHash !== index.payloadHash
      || !object(record.payload)) fail("CARD_BUILD_PAYMENT_CARD_RECORD_DRIFT", index.recordKey);
    const payload = record.payload;
    const sourceFactionValue = String(payload.faction || "").trim();
    const raceTag = RACES.has(sourceFactionValue)
      ? sourceFactionValue : subFactionRace.get(sourceFactionValue);
    if (!raceTag) fail("CARD_BUILD_PAYMENT_CARD_RACE_UNRESOLVED", index.recordKey);
    const rawFactionTags = uniqueStrings(payload.factionTags || []);
    const subFactionTags = uniqueStrings([
      ...(RACES.has(sourceFactionValue) ? [] : [sourceFactionValue]),
      ...rawFactionTags.filter((tag) => !RACES.has(tag)),
    ]);
    const slots = Object.fromEntries(SLOT_KEYS.map((key) => [key, Number(payload.slots?.[key])]));
    if (Object.keys(payload.slots || {}).sort().join("|") !== [...SLOT_KEYS].sort().join("|")
      || Object.values(slots).some((value) => !Number.isInteger(value) || value < 0)
      || !Array.isArray(payload.boosts) || !String(payload.id || "").trim()
      || !String(payload.name || "").trim() || !Number.isInteger(payload.resource)
      || payload.resource < 0 || !Number.isInteger(payload.cost) || payload.cost < 0
      || typeof payload.isUnique !== "boolean"
      || typeof payload.isFactionCard !== "boolean") {
      fail("CARD_BUILD_PAYMENT_CARD_PAYLOAD_INVALID", index.recordKey);
    }
    sourceIndex.push({ recordKey: record.recordKey,
      sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash });
    const body = {
      schema: "starcraft_tmg_official_card_build_payment_profile_v1",
      recordKey: record.recordKey, sourceRecordHash: record.sourceRecordHash,
      payloadHash: record.payloadHash, cardId: payload.id, cardName: payload.name,
      cardKind: payload.isFactionCard ? "faction" : "tactical",
      isFactionCard: payload.isFactionCard, isUnique: payload.isUnique,
      sourceFactionValue, sourceFactionTags: rawFactionTags,
      raceTag, subFactionTags, factionTags: uniqueStrings([raceTag, ...subFactionTags]),
      resourceType: RESOURCE_BY_RACE[raceTag], resourceValue: payload.resource,
      purchaseResourceType: payload.isFactionCard ? null : "vespene_gas",
      vespeneGasCost: payload.isFactionCard ? 0 : payload.cost,
      slots, abilityCount: payload.boosts.length,
      abilityDefinitionsHash: hashStarcraftTmgContract(payload.boosts),
      rulesOwnedLayoutFields: ["card_name", "card_type", "faction_tags", "army_slots",
        "exhaust_resource", "special_abilities"],
      trainingTruth: false,
    };
    return { ...body, profileHash: hashStarcraftTmgContract(body) };
  }).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  sourceIndex.sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  return { profiles, sourceIndex };
}

export function createOfficialCardBuildPaymentDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) fail("CARD_BUILD_PAYMENT_DATASET_INVALID");
  const compiled = compileCards(dataset);
  const audit = {
    cardCount: compiled.profiles.length,
    factionCardCount: compiled.profiles.filter((entry) => entry.isFactionCard).length,
    tacticalCardCount: compiled.profiles.filter((entry) => !entry.isFactionCard).length,
    uniqueCardCount: compiled.profiles.filter((entry) => entry.isUnique).length,
    nonUniqueCardCount: compiled.profiles.filter((entry) => !entry.isUnique).length,
    uniqueCardNameCount: new Set(compiled.profiles.map((entry) => entry.cardName)).size,
    resourceValueCounts: Object.fromEntries([0, 1, 2].map((value) => [value,
      compiled.profiles.filter((entry) => entry.resourceValue === value).length])),
  };
  if (JSON.stringify(audit) !== JSON.stringify({ cardCount: 37, factionCardCount: 6,
    tacticalCardCount: 31, uniqueCardCount: 26, nonUniqueCardCount: 11,
    uniqueCardNameCount: 37, resourceValueCounts: { 0: 2, 1: 32, 2: 3 } })) {
    fail("CARD_BUILD_PAYMENT_CARD_AUDIT_DRIFT");
  }
  const body = {
    schema: OFFICIAL_CARD_BUILD_PAYMENT_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_CARD_BUILD_PAYMENT_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48", officialTacticalCardsVersion: "69",
    ruleSectionRecords: exactRuleSectionRecords(dataset), ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    cardProfiles: compiled.profiles,
    cardProfileIndexHash: hashStarcraftTmgContract(compiled.profiles),
    cardSourceIndex: compiled.sourceIndex,
    cardSourceIndexHash: hashStarcraftTmgContract(compiled.sourceIndex),
    cardAudit: audit, slotKeys: SLOT_KEYS,
    resourceTypeByRace: RESOURCE_BY_RACE,
    sourcePolicy: { captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
      commandCenterRole: "current_official_card_identity_and_characteristics",
      pdfRole: "primary_normative_core_rules_source" },
    deferredRules: { fullFactionAndSubFactionEligibility: "slice_102",
      completeArmyVespeneBudgetAndOpenInformation: "slice_103" },
    productionRoomEligible: false,
    rulesTruth: "official_card_layout_purchase_uniqueness_and_payment_source_index",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialCardBuildPaymentDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialCardBuildPaymentDataBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_CARD_BUILD_PAYMENT_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_CARD_BUILD_PAYMENT_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48" || bundle.officialTacticalCardsVersion !== "69"
    || bundle.ruleSectionRecords?.length !== 3 || bundle.ruleClauses?.length !== 9
    || bundle.cardProfiles?.length !== 37 || bundle.cardAudit?.factionCardCount !== 6
    || bundle.cardAudit?.tacticalCardCount !== 31 || bundle.cardAudit?.uniqueCardCount !== 26
    || bundle.cardAudit?.nonUniqueCardCount !== 11
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(bundle.ruleClauses)
    || bundle.cardProfileIndexHash !== hashStarcraftTmgContract(bundle.cardProfiles)
    || bundle.cardSourceIndexHash !== hashStarcraftTmgContract(bundle.cardSourceIndex)
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("CARD_BUILD_PAYMENT_DATA_BUNDLE_INVALID");
  }
  const seenRecords = new Set(); const seenCards = new Set();
  for (const profile of bundle.cardProfiles) {
    if (!object(profile) || seenRecords.has(profile.recordKey) || seenCards.has(profile.cardId)
      || !RACES.has(profile.raceTag)
      || profile.resourceType !== RESOURCE_BY_RACE[profile.raceTag]
      || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]))) {
      fail("CARD_BUILD_PAYMENT_CARD_PROFILE_INVALID", String(profile?.recordKey || ""));
    }
    seenRecords.add(profile.recordKey); seenCards.add(profile.cardId);
  }
  for (const expected of RULE_RECORDS) {
    const record = bundle.ruleSectionRecords.find((entry) => entry.recordKey === expected.recordKey);
    if (!object(record) || record.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash
      || record.authorityDisposition !== "official_rule_prose_review_required"
      || record.sourceVersion !== "48") {
      fail("CARD_BUILD_PAYMENT_RULE_RECORD_INVALID", expected.recordKey);
    }
  }
  return true;
}

export function getOfficialCardBuildPaymentProfileV1(bundle, recordKey) {
  verifyOfficialCardBuildPaymentDataBundleV1(bundle);
  const profile = bundle.cardProfiles.find((entry) => entry.recordKey === recordKey);
  if (!profile) fail("CARD_BUILD_PAYMENT_PROFILE_REQUIRED", String(recordKey || ""));
  return profile;
}
