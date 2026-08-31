import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";

export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_player_control_relationship_data_bundle_v1";
export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_RECORDS = Object.freeze([
  Object.freeze({
    recordKey: "rules_sections:QX7B9DFpviRo84fVCBIj",
    title: "PART 2: CORE CONCEPTS",
    sourceRecordHash: "f7fce5a24ed1962598abb556f43a7cfffcfb541404c6bb705d119379b4094964",
    payloadHash: "615c599d401b8457266c56d1033a4259c0d1f353ba686becab05876a3af66acb",
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

export function createOfficialPlayerControlRelationshipDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false
    || !object(dataset.recordsByKey)) {
    fail("PLAYER_CONTROL_RELATIONSHIP_DATASET_INVALID");
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
      fail("PLAYER_CONTROL_RELATIONSHIP_RULE_RECORD_DRIFT", expected.recordKey);
    }
    return { ...expected,
      authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions?.rulesVersion };
  });
  const body = {
    schema: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48",
    ruleSectionRecords,
    sourceLocators: [
      { section: "2.2", printedPages: [28], scope: "army_unit_and_friendly_enemy" },
      { section: "2.5", printedPages: [29], scope: "player_roles_control_and_teams" },
      { section: "2.6.2", printedPages: [29], scope: "specific_over_general" },
      { section: "11/ACTIVE PLAYER", printedPages: [82], scope: "active_player" },
      { section: "11/CONTROLLING PLAYER", printedPages: [83], scope: "control_authority" },
      { section: "11/ENEMY", printedPages: [84], scope: "enemy_relationship" },
      { section: "11/FRIENDLY", printedPages: [85], scope: "friendly_relationship" },
    ],
    objectKinds: ["card", "model", "player", "token", "unit"],
    specificRuleSourceKinds: ["mission_card", "special_ability", "unit_card"],
    sourcePolicy: {
      captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false,
      commandCenterRole: "current_official_rule_prose_cross_check",
      pdfRole: "primary_normative_core_rules_source",
    },
    productionRoomEligible: false,
    rulesTruth: "official_core_player_control_relationship_and_precedence_source",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialPlayerControlRelationshipDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialPlayerControlRelationshipDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48"
    || !Array.isArray(bundle.ruleSectionRecords)
    || bundle.ruleSectionRecords.length !== RULE_RECORDS.length
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false
    || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("PLAYER_CONTROL_RELATIONSHIP_DATA_BUNDLE_INVALID");
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
      fail("PLAYER_CONTROL_RELATIONSHIP_RULE_RECORD_INVALID", expected.recordKey);
    }
  }
  return true;
}
