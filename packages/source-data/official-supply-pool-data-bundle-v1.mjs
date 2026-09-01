import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "./official-gameplay-data-bundle-v1.mjs";

export const OFFICIAL_SUPPLY_POOL_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_supply_pool_data_bundle_v1";
export const OFFICIAL_SUPPLY_POOL_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const PART_8 = Object.freeze({
  recordKey: "rules_sections:iuUyObNTQ2M8xK4IUqzC",
  title: "PART 8: THE GAME SEQUENCE",
  sourceRecordHash: "730f49b30de4cbe1c956a3da65b8c59d238b5715c8822b74063e535524d81fba",
  payloadHash: "1544376c9e3da46537ea0bb475fcfc16f1044e2e9bdc27c182df4e66f49d2276",
});
const MISSION = Object.freeze({
  recordKey: "faction_cards:mission_hold_position",
  name: "Hold Position",
  sourceRecordHash: "70c391e589555f7b124a381572ad4b1272cb22b6fbcc6c140171e68ea1f18cfa",
  payloadHash: "617f8dbaa4337670c2d700ee05c21608facc318875f01f15379481310679a85d",
});
const DEPLOYMENT = Object.freeze({
  recordKey: "faction_cards:2NdngLtIeZAprsWr25hM",
  name: "GAUNTLET",
  sourceRecordHash: "c6fd3d817a42fb58bdce7d23c3595061f159c3287febbe2221fcd884b6550aa0",
  payloadHash: "8ab7a56a4ae7026eef62ec46fc32d7ec62599f68c2b88cd4a2ad5408e5a4033a",
});

const RULE_CLAUSES = Object.freeze([
  Object.freeze({
    atomId: "rule-atom:supply-pool-capacity-definition",
    clauseId: "core:8.3.1:supply-pool-definition",
    section: "8.3.1", printedPage: 57,
    sourceTextHash: "8aec32bdc1b6ccba0d3a265afed235b79e9de4486a06bbd3b136d76c3776e6b2",
  }),
  Object.freeze({
    atomId: "rule-atom:singleton:core-8-3-1-round-one-supply:f897849a6c55",
    clauseId: "core:8.3.1:round-one-supply",
    section: "8.3.1", printedPage: 57,
    sourceTextHash: "e17c30212ce6720dad5c25f06f44b0d425b573a6917da089ac35182e546a1bf9",
  }),
  Object.freeze({
    atomId: "rule-atom:singleton:core-8-3-2-casualties-free-supply:57d92ec7fddd",
    clauseId: "core:8.3.2:casualties-free-supply",
    section: "8.3.2", printedPage: 57,
    sourceTextHash: "99adc49a5be16a63bf479f55a8ab60126f1e5d288348672da4f313ae24a4ac1f",
  }),
  Object.freeze({
    atomId: "rule-atom:singleton:core-8-3-3-deployment-card-cross-reference:f06e7aa2baa1",
    clauseId: "core:8.3.3:deployment-card-cross-reference",
    section: "8.3.3", printedPage: 57,
    sourceTextHash: "b5ab41798025d8ccf382edb5098c4836c0f5a87f50bc3e9583d4d0d031426be5",
  }),
  Object.freeze({
    atomId: "rule-atom:singleton:core-8-4-available-supply-verification:d2772be00ae6",
    clauseId: "core:8.4:available-supply-verification",
    section: "8.4", printedPage: 58,
    sourceTextHash: "14fc590ce2322d7985a7f3629002aa5d8eec0987009dd1e3c096db5af035108b",
  }),
]);

const DEPENDENCY_CLAUSES = Object.freeze([
  Object.freeze({
    atomId: "rule-atom:available-supply-formula",
    clauseId: "core:8.3.2:available-supply-formula",
    section: "8.3.2", printedPage: 57,
    sourceTextHash: "e6fd293e24ba20e28773c755f5298ee484d00741b5dfbb3abb6cd518eb2c3134",
    role: "already_executable_formula_dependency",
  }),
  Object.freeze({
    atomId: "rule-atom:reserve-deployment-available-supply-check",
    clauseId: "core:8.3.2:fielding-supply-eligibility",
    section: "8.3.2", printedPage: 57,
    sourceTextHash: "c613fdd4f4e09a78a8405b3196911a0b35acb99a280c225cf0de784e48989a40",
    role: "already_executable_deployment_dependency",
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
function exactRecord(dataset, expected, disposition, type) {
  const record = dataset.recordsByKey[expected.recordKey];
  const index = dataset.recordIndex.find((entry) => entry.recordKey === expected.recordKey);
  if (!object(record) || !object(index)
    || index.authorityDisposition !== disposition
    || index.recordType !== type
    || record.sourceRecordHash !== expected.sourceRecordHash
    || record.payloadHash !== expected.payloadHash) {
    fail("SUPPLY_POOL_SOURCE_RECORD_DRIFT", expected.recordKey);
  }
  return {
    ...expected,
    authorityDisposition: index.authorityDisposition,
    recordType: index.recordType,
  };
}

export function createOfficialSupplyPoolDataBundleV1(input = {}) {
  const dataset = input.dataset;
  const gameplay = input.gameplayDataBundle;
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false
    || !Array.isArray(dataset.recordIndex) || !object(dataset.recordsByKey)) {
    fail("SUPPLY_POOL_DATASET_INVALID");
  }
  verifyOfficialGameplayDataBundleV1(gameplay);
  const part8 = exactRecord(dataset, PART_8,
    "official_rule_prose_review_required", "rules_section");
  const mission = exactRecord(dataset, MISSION,
    "official_current_product_candidate", "mission");
  const deployment = exactRecord(dataset, DEPLOYMENT,
    "official_current_product_candidate", "deployment");
  const missionProfile = gameplay.missionScoringProfile;
  const deploymentProfile = gameplay.reserveDeployDataBundle?.deploymentProfile;
  if (missionProfile?.recordKey !== MISSION.recordKey
    || missionProfile.sourceRecordHash !== MISSION.sourceRecordHash
    || missionProfile.payloadHash !== MISSION.payloadHash
    || missionProfile.startingSupply !== 6
    || deploymentProfile?.recordKey !== DEPLOYMENT.recordKey
    || deploymentProfile.sourceRecordHash !== DEPLOYMENT.sourceRecordHash
    || deploymentProfile.payloadHash !== DEPLOYMENT.payloadHash
    || deploymentProfile.geometry?.zoneOfInfluenceDepthInches !== 6) {
    fail("SUPPLY_POOL_GAMEPLAY_PROFILE_DRIFT");
  }
  const body = {
    schema: OFFICIAL_SUPPLY_POOL_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_SUPPLY_POOL_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48",
    ruleSectionRecord: { ...part8, sourceVersion: "48" },
    missionRecord: mission,
    deploymentRecord: deployment,
    ruleClauses: RULE_CLAUSES,
    dependencyClauses: DEPENDENCY_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    dependencyClauseIndexHash: hashStarcraftTmgContract(DEPENDENCY_CLAUSES),
    mission: {
      missionId: missionProfile.missionId,
      missionName: missionProfile.missionName,
      startingSupply: missionProfile.startingSupply,
      missionScoringProfileHash: missionProfile.missionScoringProfileHash,
    },
    deployment: {
      name: deploymentProfile.name,
      engagementScale: deploymentProfile.engagementScale,
      zoneOfInfluenceDepthInches:
        deploymentProfile.geometry.zoneOfInfluenceDepthInches,
      entryEdgesByColor: structuredClone(
        deploymentProfile.geometry.entryEdgesByColor,
      ),
      geometryHash: hashStarcraftTmgContract(deploymentProfile.geometry),
      reserveDeployDataBundleHash:
        gameplay.reserveDeployDataBundle.reserveDeployDataBundleHash,
    },
    sourcePolicy: {
      captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false,
      pdfRole: "primary_normative_core_rules_source",
      commandCenterRole: "current_mission_and_deployment_product_identity",
    },
    productionRoomEligible: false,
    rulesTruth: "official_supply_pool_source_index",
    trainingTruth: false,
  };
  const bundle = freezeDeep({
    ...body,
    bundleHash: hashStarcraftTmgContract(body),
  });
  verifyOfficialSupplyPoolDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialSupplyPoolDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_SUPPLY_POOL_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_SUPPLY_POOL_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48"
    || bundle.ruleSectionRecord?.recordKey !== PART_8.recordKey
    || bundle.ruleSectionRecord?.sourceRecordHash !== PART_8.sourceRecordHash
    || bundle.ruleSectionRecord?.payloadHash !== PART_8.payloadHash
    || bundle.ruleSectionRecord?.authorityDisposition
      !== "official_rule_prose_review_required"
    || bundle.missionRecord?.recordKey !== MISSION.recordKey
    || bundle.missionRecord?.sourceRecordHash !== MISSION.sourceRecordHash
    || bundle.missionRecord?.payloadHash !== MISSION.payloadHash
    || bundle.deploymentRecord?.recordKey !== DEPLOYMENT.recordKey
    || bundle.deploymentRecord?.sourceRecordHash !== DEPLOYMENT.sourceRecordHash
    || bundle.deploymentRecord?.payloadHash !== DEPLOYMENT.payloadHash
    || bundle.ruleClauses?.length !== 5
    || bundle.dependencyClauses?.length !== 2
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(bundle.ruleClauses)
    || bundle.dependencyClauseIndexHash
      !== hashStarcraftTmgContract(bundle.dependencyClauses)
    || bundle.mission?.startingSupply !== 6
    || bundle.deployment?.name !== "GAUNTLET"
    || bundle.deployment?.zoneOfInfluenceDepthInches !== 6
    || !/^[a-f0-9]{64}$/u.test(String(bundle.deployment?.geometryHash || ""))
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false
    || bundle.trainingTruth !== false
    || bundle.bundleHash
      !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("SUPPLY_POOL_DATA_BUNDLE_INVALID");
  }
  if (new Set(bundle.ruleClauses.map((entry) => entry.atomId)).size !== 5
    || new Set(bundle.ruleClauses.map((entry) => entry.sourceTextHash)).size !== 5) {
    fail("SUPPLY_POOL_RULE_CLAUSE_DENOMINATOR_INVALID");
  }
  return true;
}
