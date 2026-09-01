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
import {
  createOfficialUnitCardSupplyDataBundleV1,
  getOfficialUnitCardSupplyProfileV1,
  verifyOfficialUnitCardSupplyDataBundleV1,
} from "./official-unit-card-supply-data-bundle-v1.mjs";

export const OFFICIAL_SUMMON_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_summon_data_bundle_v1";
export const OFFICIAL_SUMMON_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_RECORDS = Object.freeze([
  Object.freeze({ recordKey: "rules_sections:Rj6sMyNODPQ8OHUc9Clp",
    title: "PART 9: PREPARING FOR BATTLE",
    sourceRecordHash: "8c91884a93418869ca6878fdf0f3868278008728f1d28995f3f6e3bf8e85e282",
    payloadHash: "3197f311085315cabe06dcda95a0e2ab3a744d7c97571c9df02d27a27186dc2a" }),
  Object.freeze({ recordKey: "rules_sections:FuahgilWtc8nccVSp2Vv",
    title: "PART 11: KEYWORD GLOSSARY AND DEFINITIONS",
    sourceRecordHash: "985e79f70c48caf1b1085e620e92be23f5b4468ffe07fdc5f84cb01a28fa59b7",
    payloadHash: "4a6aa9e55e3b4197666b0f4fed633269dc42327af16f5b5a5422b7533d7d8973" }),
]);

function clause(atomId, clauseId, section, sourceTextHashes, candidateSequenceHash) {
  return Object.freeze({ atomId, clauseIds: Object.freeze([clauseId]), section,
    sourceTextHashes: Object.freeze(sourceTextHashes),
    candidateSequenceHashes: Object.freeze([candidateSequenceHash]) });
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:singleton:core-11-summon-initial-phase-activation-lock:cc62b705a3f1",
    "core:11:summon-initial-phase-activation-lock", "11",
    ["91e7a5012c91e1da3dfb60f74a7535da9090ff64750eb81804f2584341a7a173"],
    "0bbdb9aebd5c6475f548ee5f4916bbf2168846fe7554bcc529a138f14240b6eb"),
  clause("rule-atom:singleton:core-11-summon-parent-absent-activation:3516f00593a0",
    "core:11:summon-parent-absent-activation", "11",
    ["f87ffdeed7e06ecf875b798c2e6812299846229a0d07ac6ea7d5c5453d078b59"],
    "9b42e2211ca61c86617cfd561390aeac89679ed0ae41cb84f95ca4a4b01b6254"),
  clause("rule-atom:singleton:core-11-summon-parent-linked-activation:f0a0b42b20d5",
    "core:11:summon-parent-linked-activation", "11",
    ["aa8033b30c9ab7af63306eba1941ad4daa19d4d3efa4643be6c12056713a6373"],
    "09d49cdb48818e9aaa2ef35e4a8d8cde92ddd44c4b87f326fb866fb020c4d59e"),
  clause("rule-atom:singleton:core-11-summon-placement-and-coherency:ecad8dae6ba7",
    "core:11:summon-placement-and-coherency", "11",
    ["112751c7540344e2e383795bf32917df01e4516480ca38ab3e1e1066f3382a0b",
      "b3e14eed8032d7e837a987965d2293758e70a86e8e414b3d00bc7c04a421409e"],
    "4067c7554ba3fbd38e07d746f3eeb0ad04cd1066147007b9bf8487b2d512ffbd"),
  clause("rule-atom:singleton:core-11-summon-supply-limit:329009f4fbba",
    "core:11:summon-supply-limit", "11",
    ["ca28932179d8208f19a7d8f6545ae1f4361329c4e9cc72d9db8153b5b5d5e065",
      "a1504991447426b97a37ab70520bc2ebf2a0bc5ea711ff999cc62ae4905c94bb"],
    "cea70f8e103d70c456cc7125d086a163bc9837b13595c71702dcc4948be6880d"),
  clause("rule-atom:singleton:core-11-summon-zone-of-influence:7d429718696c",
    "core:11:summon-zone-of-influence", "11",
    ["1508d171c9f9a38d2799823b73b690a540e8d50652b36d5213d394d26824127e"],
    "3a0bd0073e354253b670a7ad84fe1debe7af6346d25986bad76181557ecab9e0"),
  clause("rule-atom:singleton:core-9-1-9-summoned-ability-only-deployment:1599708bbd02",
    "core:9.1.9:summoned-ability-only-deployment", "9.1.9",
    ["b93ff23fc82b1c9daf9472fc098ca05f8dac35301ee4f32d72584504f69d4e59",
      "71c3ea7e887057847ff9343708673c1339ff026acb9a84abb0cfc13c7a8626dd"],
    "6f99e7d40e8885a592ba5177f6fa1e91281f1cda1fd8b75a56faad9b1d20b471"),
  clause("rule-atom:singleton:core-9-1-9-summoned-army-list-exclusion:730545c3e4c0",
    "core:9.1.9:summoned-army-list-exclusion", "9.1.9",
    ["6d703803759f65b6204cb4f11ef41491b884ba58e473090b185c8db37c76c206",
      "74b5277c3b26fbab15f8791e6c52174ab745602fbec5c29298b66103356c3412"],
    "43fbc76ece9b74e773d1b693f8c919d49406e0d15ab4c70bf56d649e5f1841a8"),
  clause("rule-atom:singleton:core-9-1-9-summoned-current-supply:df7fa2baae79",
    "core:9.1.9:summoned-current-supply", "9.1.9",
    ["4c3411469dcb3041987b9d9c9f63f98db81cabb15b2de2d0dc6ae76e31445d37"],
    "be98260997894191c48e85ff8475ebbb5afcd8bc0367e201d8817916545bb06d"),
  clause("rule-atom:singleton:core-9-1-9-summoned-final-score-exclusion:17fa8b611480",
    "core:9.1.9:summoned-final-score-exclusion", "9.1.9",
    ["07b4839bae460637e91867ae729659129f8dd5bb9e6130f9add6b385f6e09f62"],
    "c9cb9f684cf4ab6a9e8da67d7ab39d56124b5049d8949a9da1c3e78fe1ba5ce8"),
  clause("rule-atom:singleton:core-9-1-9-summoned-friendly-status:6caff4460881",
    "core:9.1.9:summoned-friendly-status", "9.1.9",
    ["df53d826971725439a11334767c888fd69d50787231c1531735805112e1ff050"],
    "988924ce24eceb3b74c4a90939d89f14a1292022995c79fa82c3f4e461148e26"),
  clause("rule-atom:singleton:core-9-1-9-summoned-not-reserve:88525958409a",
    "core:9.1.9:summoned-not-reserve", "9.1.9",
    ["345ba3c1d4b4dc82de397754a9327de92b83a5cad73a2111c7070d31ed77f66c"],
    "ed4fcfd6ca33e0ae38037f09f758577b7f51c21ef3a4f23955cd4d7a8202c9bf"),
  clause("rule-atom:summon-enemy-separation", "core:11:summon-enemy-separation", "11",
    ["387412930f6d63f623008bad726ed97c68ad433b4e11de54651672b417cb9061"],
    "3713e9d1b10485c7418362d21279eb0cfba8e682c0fec146533d2103f2268994"),
]);

const SUMMONED_KEYS = Object.freeze([
  "army_units:point_defense_drone", "army_units:pylon", "army_units:roachling",
]);
const EXPECTED_UNIT_NAMES = Object.freeze({
  "army_units:point_defense_drone": "Point Defense Drone",
  "army_units:pylon": "Pylon",
  "army_units:roachling": "Roachling",
});

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
function definitions(payload) { return [...(payload.upgrades || []), ...(payload.boosts || [])]; }
function exactRuleRecords(dataset) {
  return RULE_RECORDS.map((expected) => {
    const record = dataset.recordsByKey[expected.recordKey];
    const index = dataset.recordIndex.find((entry) => entry.recordKey === expected.recordKey);
    if (!object(record) || index?.authorityDisposition !== "official_rule_prose_review_required"
      || record.payload?.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash) fail("SUMMON_RULE_RECORD_DRIFT", expected.recordKey);
    return { ...expected, authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions?.rulesVersion };
  });
}
function exactDefinition(dataset, recordKey, name, description, deploymentKind) {
  const record = getOfficialCurrentProductRecord(dataset, recordKey);
  const definition = definitions(record.payload).find((entry) => entry.name === name);
  if (!definition || definition.description !== description) {
    fail("SUMMON_CURRENT_DEPLOYMENT_DEFINITION_DRIFT", `${recordKey}:${name}`);
  }
  return { recordKey, productName: record.payload.name,
    sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
    definitionName: name, description, definitionHash: hashStarcraftTmgContract(definition),
    deploymentKind };
}

export function createOfficialSummonDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) fail("SUMMON_DATASET_INVALID");
  const modelBaseGeometryDataBundle = createOfficialModelBaseGeometryDataBundleV1({ dataset });
  const unitCardSupplyDataBundle = createOfficialUnitCardSupplyDataBundleV1({ dataset });
  const summonedUnitProfiles = SUMMONED_KEYS.map((recordKey) => {
    const record = getOfficialCurrentProductRecord(dataset, recordKey);
    const profile = getOfficialUnitCardSupplyProfileV1(unitCardSupplyDataBundle, recordKey);
    if (record.payload.name !== EXPECTED_UNIT_NAMES[recordKey]
      || record.payload.unitType !== "Other" || profile.fieldableDuringArmyBuilding !== false
      || profile.armySlotType !== null
      || profile.compositions.some((entry) => entry.pointsCost !== 0)
      || profile.supplyProfile.filter((entry) => entry.applicable)
        .some((entry) => entry.supply !== 0)) fail("SUMMONED_UNIT_PROFILE_DRIFT", recordKey);
    return { recordKey, unitName: record.payload.name,
      sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      unitCardSupplyProfileHash: profile.profileHash,
      printedMineralCost: 0, sourceUnitType: profile.sourceUnitType,
      fieldableDuringArmyBuilding: false, armySlotCount: 0,
      currentSupplyTiers: profile.supplyProfile };
  }).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  const currentDeploymentDefinitions = [
    exactDefinition(dataset, "army_units:corpser__roach_", "Roachling Infestation",
      "Once per Game. Resolve the SUMMON (Roachling) effect.", "summon_keyword_parent_linked"),
    exactDefinition(dataset, "tactical_cards:khalai", "Pylon Warp-In",
      "Pylon Warp-In <Active> <Movement Phase>: If there is no Friendly Pylon on the battlefield, set a Friendly Pylon Unit anywhere on the GROUND LEVEL of the battlefield more than 10\" away from any Enemy model. This Round, the Pylon is not eligible to use its Special Abilities (excluding Structure).",
      "special_ability_distinct_geometry"),
    exactDefinition(dataset, "tactical_cards:raynor_s_raiders", "Rapid Ingress",
      "Rapid Ingress <Active> <Movement Phase>: Set a Friendly Point Defence Drone Unit anywhere on the battlefield, more than 1\" away from any Enemy model. Remove this Unit at the End of the Round.",
      "special_ability_distinct_geometry"),
  ].sort((left, right) => `${left.recordKey}:${left.definitionName}`.localeCompare(
    `${right.recordKey}:${right.definitionName}`));
  const body = {
    schema: OFFICIAL_SUMMON_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_SUMMON_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48", officialUnitsVersion: "71", officialCardsVersion: "69",
    ruleSectionRecords: exactRuleRecords(dataset), ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    summonedUnitProfiles,
    summonedUnitProfileIndexHash: hashStarcraftTmgContract(summonedUnitProfiles),
    currentDeploymentDefinitions,
    currentDeploymentDefinitionIndexHash: hashStarcraftTmgContract(currentDeploymentDefinitions),
    summonKeywordDefinition: currentDeploymentDefinitions.find((entry) => (
      entry.deploymentKind === "summon_keyword_parent_linked")),
    modelBaseGeometryDataBundle, unitCardSupplyDataBundle,
    ruleConstants: { engagementRangeMilliInches: 1000,
      coherencyRangeMilliInches: 3000, zoneOfInfluenceDepthMilliInches: 6000 },
    sourceReconciliation: {
      summonedUnitCount: 3, summonKeywordCarrierCount: 1,
      distinctSpecialAbilityDeploymentCount: 2,
      pylonAndPointDefenseDroneUseGenericSummonGeometry: false,
      silentRuleSubstitutionAllowed: false,
    },
    sourcePolicy: { captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
      corePdfRole: "primary_normative_summon_and_summoned_unit_source",
      commandCenterRole: "current_unit_and_special_ability_carrier_index",
      p2pRole: "current_official_model_base_geometry" },
    existingConsumersFrozen: true, productionRoomEligible: false,
    rulesTruth: "official_summon_source_and_current_product_carrier_index",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialSummonDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialSummonDataBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_SUMMON_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_SUMMON_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48" || bundle.officialUnitsVersion !== "71"
    || bundle.officialCardsVersion !== "69" || bundle.ruleSectionRecords?.length !== 2
    || bundle.ruleClauses?.length !== 13
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(RULE_CLAUSES)
    || bundle.summonedUnitProfiles?.length !== 3
    || bundle.summonedUnitProfileIndexHash !== hashStarcraftTmgContract(bundle.summonedUnitProfiles)
    || bundle.currentDeploymentDefinitions?.length !== 3
    || bundle.currentDeploymentDefinitionIndexHash
      !== hashStarcraftTmgContract(bundle.currentDeploymentDefinitions)
    || bundle.summonKeywordDefinition?.recordKey !== "army_units:corpser__roach_"
    || bundle.summonKeywordDefinition?.definitionName !== "Roachling Infestation"
    || bundle.sourceReconciliation?.summonedUnitCount !== 3
    || bundle.sourceReconciliation?.summonKeywordCarrierCount !== 1
    || bundle.sourceReconciliation?.pylonAndPointDefenseDroneUseGenericSummonGeometry !== false
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.existingConsumersFrozen !== true || bundle.productionRoomEligible !== false
    || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("SUMMON_DATA_BUNDLE_INVALID");
  }
  verifyOfficialModelBaseGeometryDataBundleV1(bundle.modelBaseGeometryDataBundle);
  verifyOfficialUnitCardSupplyDataBundleV1(bundle.unitCardSupplyDataBundle);
  const atomIds = bundle.ruleClauses.map((entry) => entry.atomId);
  if (new Set(atomIds).size !== 13 || bundle.ruleClauses.some((entry) => (
    entry.clauseIds.length !== 1 || entry.sourceTextHashes.length < 1
      || entry.sourceTextHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(hash))
      || entry.candidateSequenceHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(hash))
  ))) fail("SUMMON_RULE_CLAUSE_DENOMINATOR_INVALID");
  return true;
}

export function getOfficialSummonedUnitProfileV1(bundle, recordKey) {
  verifyOfficialSummonDataBundleV1(bundle);
  const profile = bundle.summonedUnitProfiles.find((entry) => entry.recordKey === recordKey);
  if (!profile) fail("SUMMONED_UNIT_PROFILE_REQUIRED", String(recordKey || ""));
  return profile;
}
