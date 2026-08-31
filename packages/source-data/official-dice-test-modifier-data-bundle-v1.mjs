import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";

export const OFFICIAL_DICE_TEST_MODIFIER_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_dice_test_modifier_data_bundle_v1";
export const OFFICIAL_DICE_TEST_MODIFIER_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_RECORDS = Object.freeze([
  Object.freeze({
    recordKey: "rules_sections:OszqexisUrSOKMW6TzA5",
    title: "PART 3: DICE AND ROLLING",
    sourceRecordHash: "68711c9e817e19cb867c50aaab02f380b1c22dc150d447542b30513d29538dac",
    payloadHash: "b353fcebf8fcf93a7b68f2094d6c9963be8ce7077ebd48fd82eccc746a2e9947",
  }),
  Object.freeze({
    recordKey: "rules_sections:FuahgilWtc8nccVSp2Vv",
    title: "PART 11: KEYWORD GLOSSARY AND DEFINITIONS",
    sourceRecordHash: "985e79f70c48caf1b1085e620e92be23f5b4468ffe07fdc5f84cb01a28fa59b7",
    payloadHash: "4a6aa9e55e3b4197666b0f4fed633269dc42327af16f5b5a5422b7533d7d8973",
  }),
]);

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

export function createOfficialDiceTestModifierDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false
    || !object(dataset.recordsByKey)) {
    fail("DICE_TEST_MODIFIER_DATASET_INVALID");
  }
  const ruleSectionRecords = RULE_RECORDS.map((expected) => {
    const record = dataset.recordsByKey[expected.recordKey];
    const index = dataset.recordIndex?.find((entry) => (
      entry.recordKey === expected.recordKey
    ));
    if (!object(record) || !object(index)
      || index.authorityDisposition !== "official_rule_prose_review_required"
      || record.payload?.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash) {
      fail("DICE_TEST_MODIFIER_RULE_RECORD_DRIFT", expected.recordKey);
    }
    return { ...expected,
      authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions?.rulesVersion };
  });
  const body = {
    schema: OFFICIAL_DICE_TEST_MODIFIER_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_DICE_TEST_MODIFIER_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48",
    ruleSectionRecords,
    sourceLocators: [
      { section: "3.3", printedPages: [31], scope: "reroll_scope_and_replacement" },
      { section: "3.4", printedPages: [31], scope: "target_number_modifiers_and_null" },
      { section: "3.5", printedPages: [31], scope: "fixed_addition_generated_value" },
      { section: "3.7", printedPages: [31, 32], scope: "tests_and_value_generation" },
      { section: "3.8", printedPages: [32], scope: "cocked_and_invalid_dice" },
      { section: "11/BUFF", printedPages: [82], scope: "target_number_buff" },
      { section: "11/DEBUFF", printedPages: [83], scope: "target_number_debuff" },
      { section: "11/MODIFIER", printedPages: [88], scope: "modifier_glossary" },
    ],
    sourcePolicy: {
      captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false,
      commandCenterRole: "current_official_rule_prose_cross_check",
      pdfRole: "primary_normative_core_rules_source",
    },
    digitalDicePolicy: {
      rngFaces: 6,
      cockedDicePossible: false,
      chanceAuthority: "referee_fixed_roll_sequence_hmac_commit_ed25519_receipt",
    },
    productionRoomEligible: false,
    rulesTruth: "official_core_dice_test_reroll_modifier_and_generated_value_source",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialDiceTestModifierDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialDiceTestModifierDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_DICE_TEST_MODIFIER_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_DICE_TEST_MODIFIER_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48"
    || !Array.isArray(bundle.ruleSectionRecords)
    || bundle.ruleSectionRecords.length !== RULE_RECORDS.length
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.digitalDicePolicy?.rngFaces !== 6
    || bundle.digitalDicePolicy?.cockedDicePossible !== false
    || bundle.productionRoomEligible !== false
    || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("DICE_TEST_MODIFIER_DATA_BUNDLE_INVALID");
  }
  for (const expected of RULE_RECORDS) {
    const record = bundle.ruleSectionRecords.find((entry) => (
      entry.recordKey === expected.recordKey
    ));
    if (!object(record) || record.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash
      || record.authorityDisposition !== "official_rule_prose_review_required"
      || record.sourceVersion !== "48") {
      fail("DICE_TEST_MODIFIER_RULE_RECORD_INVALID", expected.recordKey);
    }
  }
  return true;
}
