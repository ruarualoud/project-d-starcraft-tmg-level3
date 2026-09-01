import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "./official-gameplay-data-bundle-v1.mjs";

export const OFFICIAL_RESERVE_LIFECYCLE_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_reserve_lifecycle_data_bundle_v1";
export const OFFICIAL_RESERVE_LIFECYCLE_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_SECTIONS = Object.freeze([
  Object.freeze({
    recordKey: "rules_sections:iuUyObNTQ2M8xK4IUqzC",
    title: "PART 8: THE GAME SEQUENCE",
    sourceRecordHash: "730f49b30de4cbe1c956a3da65b8c59d238b5715c8822b74063e535524d81fba",
    payloadHash: "1544376c9e3da46537ea0bb475fcfc16f1044e2e9bdc27c182df4e66f49d2276",
  }),
  Object.freeze({
    recordKey: "rules_sections:FuahgilWtc8nccVSp2Vv",
    title: "PART 11: GLOSSARY",
    sourceRecordHash: "985e79f70c48caf1b1085e620e92be23f5b4468ffe07fdc5f84cb01a28fa59b7",
    payloadHash: "4a6aa9e55e3b4197666b0f4fed633269dc42327af16f5b5a5422b7533d7d8973",
  }),
]);

const MISSION = Object.freeze({
  recordKey: "faction_cards:mission_hold_position",
  name: "Hold Position",
  sourceRecordHash: "70c391e589555f7b124a381572ad4b1272cb22b6fbcc6c140171e68ea1f18cfa",
  payloadHash: "617f8dbaa4337670c2d700ee05c21608facc318875f01f15379481310679a85d",
});

function clause(atomId, clauseId, section, pdfPage, sourceTextHashes,
  candidateSequenceHash) {
  return Object.freeze({ atomId, clauseId, section, pdfPage,
    sourceTextHashes: Object.freeze(sourceTextHashes), candidateSequenceHash });
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:singleton:core-8-3-army-starts-in-reserves:769363d5e7ac",
    "core:8.3:army-starts-in-reserves", "8.3", 57,
    ["2712cafed7960dd3ab1c508cc41bcec4c628eadf5248509447478c1848086b93",
      "cf81780e0d1fbd8f0823caad598a403caab3b5825bfa1f7c5456dd8671f86716"],
    "88de7377b020a44c1dc8decd1946a884b812e95c58aef82565629e665bcfde79"),
  clause("rule-atom:singleton:core-8-5-5-return-to-reserves-definition:7c966e2f77f9",
    "core:8.5.5:return-to-reserves-definition", "8.5.5", 60,
    ["8e76df6242fcc5e058091dcf45a76ce14c31b0b7192dd759e76daef56f1ab102",
      "a4feee9ac71486f8ecd2bb8b8c185c76779190592cc7931ef0d2bab0781fd1ce"],
    "e21d2031099656279ea6d58508624ef84de489f744193153ff54b372229594dd"),
  clause("rule-atom:singleton:core-8-5-5-reserve-supply-release:7fae40b37bb5",
    "core:8.5.5:reserve-supply-release", "8.5.5", 60,
    ["203df074b5e4d1b4bfc6455a6594a11c3ff263e6998e40db2865689814b16df2"],
    "ca0ddd3bcd092580a99fa5c27202e2f901c6f2c07c1296e226c3586cb03c8f63"),
  clause("rule-atom:singleton:core-8-5-5-reserve-equipment-retained:d3d695aca513",
    "core:8.5.5:reserve-equipment-retained", "8.5.5", 60,
    ["8489f6a9a6444ce45bc3abebf651cf4ac6b46734ccb5d7c70b4c0878c97cfc67"],
    "c2254f7bdcd0789c20e54b6f432c5489ac7c064c57178a545575446a29181e95"),
  clause("rule-atom:singleton:core-8-5-5-reserve-damage-retained:6aed35c2189a",
    "core:8.5.5:reserve-damage-retained", "8.5.5", 60,
    ["b3aaecc23e7753a267c298c43bfe80b6e78e304df047e56fbba9e0699e19bce6",
      "df705ac1ed20afff125a252323d4ebecab064b219d7bcea6654f32f3cdab94df"],
    "ef70888b52f473a9072eb445b510aeba6fabc2e2469c2072046799b3f9e8a06c"),
  clause("rule-atom:singleton:core-8-5-5-reserve-timed-effects-continue:f1e841504ed2",
    "core:8.5.5:reserve-timed-effects-continue", "8.5.5", 60,
    ["913328fc36f1738e02349c118c9a3cef8148c9c22c9c620f45d4f265c0e218aa",
      "e10712828ba9be50782c6ad95b9331dadc1ac73c011e39befdb6cae675337901"],
    "5847c26b3bcc21cb159c5881528fe51ddb8cc78d8c204f8797c165f2387b957a"),
  clause("rule-atom:singleton:core-8-5-5-reserve-abilities-inactive:68e1286b3f4c",
    "core:8.5.5:reserve-abilities-inactive", "8.5.5", 60,
    ["c99850783a34a3b4055cb5001cf83a1ddeb21c6b5a11a8a6870b5c97627f3a9f",
      "265690e8bca5e5786388ec9a97c16c08206144c3dfa53afe344b7afbc677ad7b",
      "763731a8bd1d374977738c89810b70d0b50bfdffd48d5d785e68e01a5aa87921"],
    "100a61115ea1d2861c033f7c26b15df62ba27643cd6f5acae44540ea92f7a759"),
  clause("rule-atom:singleton:core-8-5-5-redeploy-abilities-resume:fc4316abdc36",
    "core:8.5.5:redeploy-abilities-resume", "8.5.5", 60,
    ["45b228df6213027764ba5c2ebb2384ca03b1fa06a37b9fba947daf25a5f29cc6"],
    "a2a91d4c553546e0994428a9d3fad9d687697f7cac6847a8ab380f706aef4e2c"),
  clause("rule-atom:singleton:core-8-5-5-left-token-removal:056f5f9896f8",
    "core:8.5.5:left-token-removal", "8.5.5", 60,
    ["0ed7d0bd67d76d58c56b970d3d1407fdef830a1b04e3f5ada02914ffe19bae5a"],
    "82e471bf3c7e07f862e198e53432a440bff1d43f42ae2054dc06dde737d6e3e3"),
  clause("rule-atom:singleton:core-8-5-5-reserve-activation-retained:bc4bfa3a14dd",
    "core:8.5.5:reserve-activation-retained", "8.5.5", 60,
    ["5fd0c97da311a805a2a03e06cd5e4ca7979116499b01212d60f58c6a57587a03"],
    "52d924ae2f6f5208ea170489289c92c248297c520e1aaa50fed0466546ac0bdb"),
  clause("rule-atom:singleton:core-8-10-final-reserve-destruction:c5770b3cff2e",
    "core:8.10:final-reserve-destruction", "8.10", 74,
    ["276c26e6673095a269cb6d5ee8f270b0e0e30d1b408529f808ccdfd2335d1c86",
      "2a899d8846abaee4451832386b133016872a9d2b8572b7acbdd7b25cc620e408"],
    "6f77d508901289b84127f7a2a61c744db40392b9362fc3ac71a5ce84635044ee"),
  clause("rule-atom:singleton:core-11-reserves-definition:def5ecfde71d",
    "core:11:reserves-definition", "11", 90,
    ["4b8d255d407f8cc279de6c42c74a359e552123bafbac0fbc4d5cd4e2ca3e246f"],
    "dce27e09d0f8c649270633bf5b7840abed31cb2f8e254851058dab5985ff0711"),
  clause("rule-atom:singleton:core-11-reserves-initial-state:56ccf0eeb9dc",
    "core:11:reserves-initial-state", "11", 90,
    ["44e93ac6ebe05ccd779da094d5b27344b517ed4686201d2f0be9588ea5cbc607"],
    "ecb1a4313539d2cd4f87995aedf764e99ef7a4c2f78ac899523a6821d64841c4"),
  clause("rule-atom:singleton:core-11-reserves-targeting-restriction:32c878cbc68b",
    "core:11:reserves-targeting-restriction", "11", 90,
    ["627e4f6081f09a73a8c8407bf15fca1b3966815a89e2eb43dc2350290c8bd816"],
    "c98105681da5f99cc95896d309c91e09b406a6a24043a027159ba5113035881d"),
  clause("rule-atom:singleton:core-11-reserves-loadout-retention:c4b9ac534d94",
    "core:11:reserves-loadout-retention", "11", 90,
    ["b2f4dd42c9dd34764807fd6493111deb7d4368c5bf3424661efd31a3be3bb6ea"],
    "ddb240f3875cbcc59337a33e30fda5d74a00d117395da2259ef65366c9d2e7fc"),
  clause("rule-atom:singleton:core-11-reserves-return-and-final-round:99a13b38d53a",
    "core:11:reserves-return-and-final-round", "11", 90,
    ["b00abf48adc2acfc012301b7cf6cf751dd64454a971f077425594a176296128d"],
    "abcb294254da5066d882284979438c9e84f83c005f17bb6ac408287c2bfb3240"),
  clause("rule-atom:singleton:core-11-zone-of-influence-post-arrival:ac58e480793b",
    "core:11:zone-of-influence-post-arrival", "11", 93,
    ["2e5c73c31bbecad40f9d4aa66d43db34f8b7e1ef128678c6d85292193ccb25fc",
      "748e34d2a5e2013956bf61bb35ffa23101b0a277d1957293d7b5a83c38a69ee6"],
    "59a938ea6d32d08d2e8ab629f8bf38b6ca1d12d12a49356f49f9a1af8a081568"),
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
function exactRecord(dataset, expected, disposition, type) {
  const record = dataset.recordsByKey[expected.recordKey];
  const index = dataset.recordIndex.find((entry) => entry.recordKey === expected.recordKey);
  if (!object(record) || !object(index)
    || index.authorityDisposition !== disposition || index.recordType !== type
    || record.sourceRecordHash !== expected.sourceRecordHash
    || record.payloadHash !== expected.payloadHash) {
    fail("RESERVE_LIFECYCLE_SOURCE_RECORD_DRIFT", expected.recordKey);
  }
  return { ...expected, authorityDisposition: index.authorityDisposition,
    recordType: index.recordType };
}

export function createOfficialReserveLifecycleDataBundleV1(input = {}) {
  const dataset = input.dataset;
  const gameplay = input.gameplayDataBundle;
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false
    || !Array.isArray(dataset.recordIndex) || !object(dataset.recordsByKey)) {
    fail("RESERVE_LIFECYCLE_DATASET_INVALID");
  }
  verifyOfficialGameplayDataBundleV1(gameplay);
  const ruleSectionRecords = RULE_SECTIONS.map((record) => exactRecord(dataset,
    record, "official_rule_prose_review_required", "rules_section"));
  const missionRecord = exactRecord(dataset, MISSION,
    "official_current_product_candidate", "mission");
  const mission = gameplay.missionScoringProfile;
  if (mission.recordKey !== MISSION.recordKey
    || mission.sourceRecordHash !== MISSION.sourceRecordHash
    || mission.payloadHash !== MISSION.payloadHash
    || mission.gameLengthRounds !== 5
    || mission.destroyedEnemySupplyVpPerSupply !== 1) {
    fail("RESERVE_LIFECYCLE_MISSION_PROFILE_DRIFT");
  }
  const body = {
    schema: OFFICIAL_RESERVE_LIFECYCLE_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_RESERVE_LIFECYCLE_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48",
    ruleSectionRecords,
    missionRecord,
    ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    mission: {
      missionId: mission.missionId,
      gameLengthRounds: mission.gameLengthRounds,
      destroyedEnemySupplyVpPerSupply: mission.destroyedEnemySupplyVpPerSupply,
      missionScoringProfileHash: mission.missionScoringProfileHash,
    },
    sourcePolicy: {
      captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false,
      corePdfRole: "primary_normative_reserve_lifecycle_source",
      commandCenterRole: "current_mission_scoring_identity",
    },
    existingConsumersFrozen: true,
    productionRoomEligible: false,
    rulesTruth: "official_reserve_lifecycle_source_index",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body,
    bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialReserveLifecycleDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialReserveLifecycleDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_RESERVE_LIFECYCLE_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_RESERVE_LIFECYCLE_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48"
    || bundle.ruleSectionRecords?.length !== 2
    || bundle.ruleClauses?.length !== 17
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(RULE_CLAUSES)
    || bundle.missionRecord?.recordKey !== MISSION.recordKey
    || bundle.missionRecord?.sourceRecordHash !== MISSION.sourceRecordHash
    || bundle.missionRecord?.payloadHash !== MISSION.payloadHash
    || bundle.missionRecord?.authorityDisposition
      !== "official_current_product_candidate"
    || bundle.mission?.missionId !== "mission_hold_position"
    || bundle.mission?.gameLengthRounds !== 5
    || bundle.mission?.destroyedEnemySupplyVpPerSupply !== 1
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.existingConsumersFrozen !== true
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("RESERVE_LIFECYCLE_DATA_BUNDLE_INVALID");
  }
  for (const expected of RULE_SECTIONS) {
    const observed = bundle.ruleSectionRecords.find((entry) => (
      entry.recordKey === expected.recordKey));
    if (!observed || observed.sourceRecordHash !== expected.sourceRecordHash
      || observed.payloadHash !== expected.payloadHash
      || observed.authorityDisposition !== "official_rule_prose_review_required") {
      fail("RESERVE_LIFECYCLE_RULE_SECTION_INVALID", expected.recordKey);
    }
  }
  if (new Set(bundle.ruleClauses.map((entry) => entry.atomId)).size !== 17
    || new Set(bundle.ruleClauses.map((entry) => entry.clauseId)).size !== 17
    || bundle.ruleClauses.some((entry) => (
      !Array.isArray(entry.sourceTextHashes) || entry.sourceTextHashes.length === 0
      || entry.sourceTextHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(hash))
      || !/^[a-f0-9]{64}$/u.test(entry.candidateSequenceHash)
    ))) {
    fail("RESERVE_LIFECYCLE_RULE_CLAUSE_DENOMINATOR_INVALID");
  }
  return true;
}
