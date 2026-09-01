import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";

export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_unit_destruction_lifecycle_data_bundle_v1";
export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_SECTION = Object.freeze({
  recordKey: "rules_sections:cB7X7UfOMHh3Wxn79ASF",
  title: "PART 7: THE BATTLEFIELD",
  sourceRecordHash: "13e9d29032e246f947f59948389d437dead1f14911a890b688ee88a61e6f0688",
  payloadHash: "56c942f90b76d67836accf996e9506a8cb318c631512960ffb83d7635fda96a6",
});

function clause(atomId, clauseId, sourceTextHash, candidateSequenceHash) {
  return Object.freeze({ atomId, clauseId, section: "7.4", pdfPage: 56,
    sourceTextHashes: Object.freeze([sourceTextHash]), candidateSequenceHash });
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:singleton:core-7-4-unit-destroyed:e866879bfd22",
    "core:7.4:unit-destroyed",
    "afd0d6efc320ba23e4b23e04637b64a7944ee0dffe51d78d535fab644a249ec3",
    "f8d0540446b25dbdef807cc415d02821f5da37853dad2cb31ac3795a73852888"),
  clause("rule-atom:singleton:core-7-4-destroyed-unit-effects-end:5df7daf83bcc",
    "core:7.4:destroyed-unit-effects-end",
    "3ed00c20e6ee32fb204f97b2537ddbc0d56ee880467a839f529dc9e23d8e0569",
    "f84dc8dcc425963eb261c785082232719b1552735f6014e273c7e41369ea96c1"),
  clause("rule-atom:singleton:core-7-4-destroyed-unit-tokens:4a40d486b4c8",
    "core:7.4:destroyed-unit-tokens",
    "9b4b91a2b5e70662b6cda13b5600508c3ad9bf48822324c168dcd66cada0e927",
    "a001479e0f6ea4a0721ee940e7dcdc9a352a5818984efee4d01a6ddbac9d724d"),
  clause("rule-atom:singleton:core-7-4-outward-effects-remain:e83a36561141",
    "core:7.4:outward-effects-remain",
    "af62ff1c1e48b35a618acce7b42f6446b7ea0cf54ae793b7f7d0aacce9a17810",
    "b01fee7d7ab1ef25b57ada630214b3a6d4663b43ffd2c034376d38ee4be99504"),
  clause("rule-atom:singleton:core-7-4-return-to-play:7ad8b444e6de",
    "core:7.4:return-to-play",
    "259bfa80a9c4749d38b59b9e77cbf9bbed08e3792f363e680ac21d9fe1bc178e",
    "27e2f8033a20a9350634f1577d7825a9d24485e552756e632de447d180312a99"),
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

export function createOfficialUnitDestructionLifecycleDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false
    || !Array.isArray(dataset.recordIndex) || !object(dataset.recordsByKey)) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_DATASET_INVALID");
  }
  const record = dataset.recordsByKey[RULE_SECTION.recordKey];
  const index = dataset.recordIndex.find((entry) => (
    entry.recordKey === RULE_SECTION.recordKey
  ));
  if (!object(record) || !object(index)
    || index.authorityDisposition !== "official_rule_prose_review_required"
    || index.recordType !== "rules_section"
    || record.sourceRecordHash !== RULE_SECTION.sourceRecordHash
    || record.payloadHash !== RULE_SECTION.payloadHash) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_SOURCE_RECORD_DRIFT");
  }
  const body = {
    schema: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48",
    ruleSectionRecord: { ...RULE_SECTION,
      authorityDisposition: index.authorityDisposition,
      recordType: index.recordType },
    ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    returnRuleRegistry: {
      registeredAtomIds: [],
      policy: "fail_closed_until_slice101_respawn_or_morph_rule_registration",
    },
    sourcePolicy: {
      captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false,
      corePdfRole: "primary_normative_unit_destruction_lifecycle_source",
    },
    existingCasualtyConsumersFrozen: true,
    productionRoomEligible: false,
    rulesTruth: "official_unit_destruction_lifecycle_source_index",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialUnitDestructionLifecycleDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialUnitDestructionLifecycleDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash
      !== OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48"
    || bundle.ruleSectionRecord?.recordKey !== RULE_SECTION.recordKey
    || bundle.ruleSectionRecord?.sourceRecordHash !== RULE_SECTION.sourceRecordHash
    || bundle.ruleSectionRecord?.payloadHash !== RULE_SECTION.payloadHash
    || bundle.ruleSectionRecord?.authorityDisposition
      !== "official_rule_prose_review_required"
    || bundle.ruleSectionRecord?.recordType !== "rules_section"
    || bundle.ruleClauses?.length !== 5
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(RULE_CLAUSES)
    || bundle.returnRuleRegistry?.registeredAtomIds?.length !== 0
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.existingCasualtyConsumersFrozen !== true
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_DATA_BUNDLE_INVALID");
  }
  if (new Set(bundle.ruleClauses.map((entry) => entry.atomId)).size !== 5
    || new Set(bundle.ruleClauses.map((entry) => entry.clauseId)).size !== 5
    || bundle.ruleClauses.some((entry) => (
      entry.sourceTextHashes?.length !== 1
      || !/^[a-f0-9]{64}$/u.test(entry.sourceTextHashes[0])
      || !/^[a-f0-9]{64}$/u.test(entry.candidateSequenceHash)
    ))) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_RULE_CLAUSE_DENOMINATOR_INVALID");
  }
  return true;
}
