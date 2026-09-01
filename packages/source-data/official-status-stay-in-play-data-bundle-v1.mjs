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
  createOfficialModelBaseGeometryDataBundleV1,
  verifyOfficialModelBaseGeometryDataBundleV1,
} from "./official-model-base-geometry-data-bundle-v1.mjs";

export const OFFICIAL_STATUS_STAY_IN_PLAY_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_status_stay_in_play_data_bundle_v1";
export const OFFICIAL_STATUS_STAY_IN_PLAY_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_SECTION = Object.freeze({
  recordKey: "rules_sections:FuahgilWtc8nccVSp2Vv",
  title: "PART 11: KEYWORD GLOSSARY AND DEFINITIONS",
  sourceRecordHash: "985e79f70c48caf1b1085e620e92be23f5b4468ffe07fdc5f84cb01a28fa59b7",
  payloadHash: "4a6aa9e55e3b4197666b0f4fed633269dc42327af16f5b5a5422b7533d7d8973",
});

function clause(atomId, clauseIds, sourceTextHashes, candidateSequenceHashes) {
  return Object.freeze({ atomId, clauseIds: Object.freeze(clauseIds), section: "11",
    sourceTextHashes: Object.freeze(sourceTextHashes),
    candidateSequenceHashes: Object.freeze(candidateSequenceHashes) });
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:singleton:core-11-on-creep-condition:71f40e4e561b",
    ["core:11:on-creep-condition"],
    ["dad9ff369e69b7051f375e28c2e5d1b6dff56af534c815e4f919d6b0f95259ed"],
    ["5762f09c3b58086df04a8e10610938249391f3e3b759c34f62d561af8fd61d7e"]),
  clause("rule-atom:singleton:core-11-on-creep-keyword:3462776dbb82",
    ["core:11:on-creep-keyword"],
    ["39b793aa16efe70957880b295cfb74cbfc7a70be3c2aaf0f612cbb9f81509842"],
    ["f9688d05094c7eec3cde43181b9d0dab22afb4ffeaf3246b8df4fef8dff214ec"]),
  clause("rule-atom:singleton:core-11-on-creep-rule-uses:173b9839db96",
    ["core:11:on-creep-rule-uses"],
    ["1185e022a9da3050dc51203b89f0604b3609a693d635f1b85d27d4b9d717e3cd"],
    ["e6d1579f6be0e2fb58ca1251bc9d17034bfd74a1ed4eb18b612917596bac43b7"]),
  clause("rule-atom:singleton:core-11-shielded-dependent-abilities:03c5e18dd1a9",
    ["core:11:shielded-dependent-abilities"],
    ["41e84e4a3ee6a35fa1e9fdc76a7a2a062f67fa5d244ef039cbd5723ba26dea71"],
    ["41fa0b37c5f3c2d46ef40d81c23bbf82ec546430b7db154753d0f90a7d2df150"]),
  clause("rule-atom:singleton:core-11-siege-mode-action-restrictions:0a3f79a5ceee",
    ["core:11:siege-mode-action-restrictions"],
    ["26a00c33ee056b9533e8ecb18d2de425477f3adbff8891cbbfd63217fb84dac9"],
    ["42ac43992650cf10f4e116e06d13453e1c6f57c1800e742d044be1806b7ef638"]),
  clause("rule-atom:singleton:core-11-siege-mode-other-weapons:b5e99bc22166",
    ["core:11:siege-mode-other-weapons"],
    ["334a1ff9899874761eab62ea167bf86a9124661d6aa91defe7b0adc86f1d2b05"],
    ["54a6cc932b6b858baf52e814f319f36aca466dfe596eedb4c1efb1e57b1d7f8a"]),
  clause("rule-atom:singleton:core-11-siege-mode-profile-eligibility:492d22e13d51",
    ["core:11:siege-mode-profile-eligibility"],
    ["c9ec1d866e7b6402a47e87a7dd3c73b2c743f9a9be2e7f7908aa8f7beb81f744"],
    ["7938b2f0ab374c72e632a5f08d0aeb1373484686ad9ffc2c945e57887e5e343c"]),
  clause("rule-atom:singleton:core-11-siege-mode-reserve-removal:11a2452c6254",
    ["core:11:siege-mode-reserve-removal"],
    ["42d3763877777c00c342fee8f9522dd10478f0cf4ced1f203c617b8102cbbf69"],
    ["403aa6f72a91b461099f81ad28abca586beb26454319c45d43df7ac5f269ab50"]),
  clause("rule-atom:singleton:core-11-status-cleanup-persistence:06224d287247",
    ["core:11:status-cleanup-persistence"],
    ["99e3de87bb57fe0ed7772f07f257812566f48e65ab6556d7f5525c78356d356b"],
    ["6d5664baabdec5547363fbffe5ee8036ecea18ad8fbe883cf01bd0b9473eb7d1"]),
  clause("rule-atom:singleton:core-11-status-mode-markers:da984bafdab9",
    ["core:11:status-mode-markers"],
    ["39a48db925414a524d80bcfb9cc9a05b3f4321a82e0eae548a1480269bbfb952",
      "0ca85397023bedfdb0c42c49a110f5831be72bce527cba15edffd8bf9e247ad2"],
    ["86fa48a2cfba1fc80e6571cfb3b43267c79e8693a66cc99ffd9a35363d5b916c"]),
  clause("rule-atom:singleton:core-11-stay-in-play-persistence:3fe0d315070d",
    ["core:11:stay-in-play-persistence"],
    ["d8e6111540000b5cd86c5a006507fa54aac9e09ac244e9dafba2ce68a1d06d52",
      "6dccaad02f28743f2c78e65ac5374df8a72de19d82e2db9cb58a29e8055b594f"],
    ["167c1208879cbb596b2ecf2fd315130b7eeea63422c0d1bdeb28394dd10cf448"]),
  clause("rule-atom:status-marker-stay-in-play",
    ["core:11:status-effect-stay-in-play", "core:11:status-mode-stay-in-play"],
    ["218f7048995bfb2144a9f214f028938f854bc289833c777d8a94f4e26900eaf3"],
    ["5685884fed8c69880579185d834a25670fc89330ce8c9d10c14c95887835ce03",
      "7b7cf0856821803c2a77034dbb63c7436723166fb1c1aa86c121bcdb6b352c0a"]),
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
function definitions(payload) {
  return [...(payload.upgrades || []), ...(payload.boosts || [])];
}
function sourceRecord(dataset, recordKey) {
  const record = getOfficialCurrentProductRecord(dataset, recordKey);
  return { recordKey, sourceRecordHash: record.sourceRecordHash,
    payloadHash: record.payloadHash, unitName: record.payload.name || null };
}
function compileZergGroundProfiles(dataset) {
  return dataset.recordIndex.filter((entry) => (
    entry.recordType === "unit"
      && entry.authorityDisposition === "official_current_product_candidate"
  )).map((entry) => getOfficialCurrentProductRecord(dataset, entry.recordKey))
    .filter((record) => record.payload.faction === "Zerg"
      && String(record.payload.tags || "").split(/\s*,\s*/u).includes("Ground"))
    .map((record) => ({ recordKey: record.recordKey,
      sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      unitName: record.payload.name,
      combatTags: String(record.payload.tags || "").split(/\s*,\s*/u)
        .map((tag) => tag.toLowerCase()).sort() }))
    .sort((left, right) => left.recordKey.localeCompare(right.recordKey));
}
function compileOnCreepDependencies(dataset) {
  const result = [];
  for (const entry of dataset.recordIndex) {
    if (entry.authorityDisposition !== "official_current_product_candidate") continue;
    const record = getOfficialCurrentProductRecord(dataset, entry.recordKey);
    for (const definition of definitions(record.payload)) {
      if (!/\bON CREEP\b/u.test(String(definition.description || ""))) continue;
      result.push({ recordKey: record.recordKey,
        sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
        definitionName: definition.name,
        definitionHash: hashStarcraftTmgContract(definition) });
    }
  }
  return result.sort((left, right) => (
    `${left.recordKey}:${left.definitionName}`.localeCompare(
      `${right.recordKey}:${right.definitionName}`,
    )
  ));
}

export function createOfficialStatusStayInPlayDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false
    || !Array.isArray(dataset.recordIndex) || !object(dataset.recordsByKey)) {
    fail("STATUS_STAY_IN_PLAY_DATASET_INVALID");
  }
  const ruleRecord = dataset.recordsByKey[RULE_SECTION.recordKey];
  const ruleIndex = dataset.recordIndex.find((entry) => (
    entry.recordKey === RULE_SECTION.recordKey
  ));
  if (!object(ruleRecord) || !object(ruleIndex)
    || ruleIndex.authorityDisposition !== "official_rule_prose_review_required"
    || ruleRecord.sourceRecordHash !== RULE_SECTION.sourceRecordHash
    || ruleRecord.payloadHash !== RULE_SECTION.payloadHash) {
    fail("STATUS_STAY_IN_PLAY_RULE_SOURCE_DRIFT");
  }
  const omegaRecord = getOfficialCurrentProductRecord(dataset, "army_units:omega_worm");
  const sourceOfCreep = definitions(omegaRecord.payload).find((entry) => (
    entry.name === "Source of Creep"
  ));
  if (!sourceOfCreep
    || sourceOfCreep.description
      !== "A Friendly or Enemy Ground Zerg Unit Within 6\" of this Unit, counts as being ON CREEP.") {
    fail("STATUS_STAY_IN_PLAY_OMEGA_SOURCE_DRIFT");
  }
  const modelBaseGeometryDataBundle = createOfficialModelBaseGeometryDataBundleV1({ dataset });
  const zergGroundUnitProfiles = compileZergGroundProfiles(dataset);
  const onCreepDependencyIndex = compileOnCreepDependencies(dataset);
  const body = {
    schema: OFFICIAL_STATUS_STAY_IN_PLAY_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_STATUS_STAY_IN_PLAY_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48",
    ruleSectionRecord: { ...RULE_SECTION,
      authorityDisposition: ruleIndex.authorityDisposition,
      recordType: ruleIndex.recordType },
    ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    modelBaseGeometryDataBundle,
    omegaWormSourceOfCreep: {
      ...sourceRecord(dataset, "army_units:omega_worm"),
      definitionName: sourceOfCreep.name,
      definitionHash: hashStarcraftTmgContract(sourceOfCreep),
      rangeMilliInches: 6000,
    },
    zergGroundUnitProfiles,
    zergGroundUnitProfileIndexHash: hashStarcraftTmgContract(zergGroundUnitProfiles),
    onCreepDependencyIndex,
    onCreepDependencyIndexHash: hashStarcraftTmgContract(onCreepDependencyIndex),
    creepTumorGeometryRegistry: {
      entries: [],
      policy: "fail_closed_until_official_physical_token_geometry_is_bound",
    },
    siegeModeCarrierRegistry: {
      entries: [],
      policy: "generic_rules_harness_only_no_current_official_carrier",
    },
    shieldedDependentAbilityRegistry: {
      entries: [],
      policy: "generic_requires_status_effect_contract_only_no_current_named_carrier",
    },
    sourcePolicy: {
      captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false,
      corePdfRole: "primary_normative_status_and_keyword_source",
      commandCenterRole: "current_unit_and_ability_identity",
      p2pRole: "current_official_model_base_geometry",
    },
    existingConsumersFrozen: true,
    productionRoomEligible: false,
    rulesTruth: "official_status_stay_in_play_siege_shielded_on_creep_source_index",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialStatusStayInPlayDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialStatusStayInPlayDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_STATUS_STAY_IN_PLAY_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_STATUS_STAY_IN_PLAY_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48"
    || bundle.ruleSectionRecord?.recordKey !== RULE_SECTION.recordKey
    || bundle.ruleSectionRecord?.sourceRecordHash !== RULE_SECTION.sourceRecordHash
    || bundle.ruleSectionRecord?.payloadHash !== RULE_SECTION.payloadHash
    || bundle.ruleClauses?.length !== 12
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(RULE_CLAUSES)
    || bundle.omegaWormSourceOfCreep?.recordKey !== "army_units:omega_worm"
    || bundle.omegaWormSourceOfCreep?.rangeMilliInches !== 6000
    || !Array.isArray(bundle.zergGroundUnitProfiles)
    || bundle.zergGroundUnitProfiles.length !== 12
    || bundle.zergGroundUnitProfileIndexHash
      !== hashStarcraftTmgContract(bundle.zergGroundUnitProfiles)
    || bundle.onCreepDependencyIndexHash
      !== hashStarcraftTmgContract(bundle.onCreepDependencyIndex)
    || bundle.creepTumorGeometryRegistry?.entries?.length !== 0
    || bundle.siegeModeCarrierRegistry?.entries?.length !== 0
    || bundle.shieldedDependentAbilityRegistry?.entries?.length !== 0
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.existingConsumersFrozen !== true
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("STATUS_STAY_IN_PLAY_DATA_BUNDLE_INVALID");
  }
  verifyOfficialModelBaseGeometryDataBundleV1(bundle.modelBaseGeometryDataBundle);
  const atomIds = bundle.ruleClauses.map((entry) => entry.atomId);
  if (new Set(atomIds).size !== 12
    || bundle.ruleClauses.some((entry) => !Array.isArray(entry.clauseIds)
      || entry.clauseIds.length < 1
      || entry.sourceTextHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(hash))
      || entry.candidateSequenceHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(hash)))) {
    fail("STATUS_STAY_IN_PLAY_RULE_CLAUSE_DENOMINATOR_INVALID");
  }
  return true;
}
