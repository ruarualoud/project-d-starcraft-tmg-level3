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

export const OFFICIAL_RESPAWN_MORPH_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_respawn_morph_data_bundle_v1";
export const OFFICIAL_RESPAWN_MORPH_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_SECTION = Object.freeze({
  recordKey: "rules_sections:FuahgilWtc8nccVSp2Vv",
  title: "PART 11: KEYWORD GLOSSARY AND DEFINITIONS",
  sourceRecordHash: "985e79f70c48caf1b1085e620e92be23f5b4468ffe07fdc5f84cb01a28fa59b7",
  payloadHash: "4a6aa9e55e3b4197666b0f4fed633269dc42327af16f5b5a5422b7533d7d8973",
});

function clause(atomId, clauseId, sourceTextHashes, candidateSequenceHash) {
  return Object.freeze({ atomId, clauseId, section: "11",
    sourceTextHashes: Object.freeze(sourceTextHashes), candidateSequenceHash });
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:morph-new-unit-enemy-separation",
    "core:11:morph-new-unit-placement",
    ["2c9ef973346ea1b3ee0b18a3bd29d4fdace601aa68c4577cccea2e63fcceb2d5"],
    "5dbc02870e56e567960a6d68c58eb969a38b1ea2479d498857bbebd897a1daef"),
  clause("rule-atom:respawn-enemy-separation",
    "core:11:respawn-enemy-separation",
    ["adaba16a440d19084f7a5e403858c7d3c85a2ad9a732e6b65921f74b839a55da"],
    "d3502efb4be3c4d3c2f5fdff13f0a117a237a3e9fa40013f55c6f353e11ea59e"),
  clause("rule-atom:singleton:core-11-morph-activation-lock:8a328b072f42",
    "core:11:morph-activation-lock",
    ["191aae95afd9884e22d84fc1c6a8dce187a7cf542e651246c44bbd85e7973ff1"],
    "3af611d05a93402412944dd9487d9bb67176b44cf76af280a7f3ef46e50dbee8"),
  clause("rule-atom:singleton:core-11-morph-available-supply:332943c395d8",
    "core:11:morph-available-supply",
    ["81fe978cbbac384d498a73e75f50b8fde4b2ae8c53976e56b1c66b03f3ad306c"],
    "8cde32d89dcd3927aa0ae072e617763126b1df09fdac36065be2e6fe43871970"),
  clause("rule-atom:singleton:core-11-morph-placement-and-removal:5c31bf9c3006",
    "core:11:morph-placement-and-removal",
    ["76f2ff42283a28166fec0c4643374e8bbfdfa6199882dc13d8618b863a7c7d50"],
    "62d86f785e94d6772003107fe081f82f839eb5540eec1956651b94c1a2e14b4b"),
  clause("rule-atom:singleton:core-11-respawn-base-contact:0cf66ae751af",
    "core:11:respawn-base-contact",
    ["6dc7c83e393521a374733767f2a79be45f2c2b4292dbd37f1a4ba19550bb2d7f"],
    "6b0a58d3bce9260dd65c9d7fd176a7ea0bc0b55bb2f770c393be2b88c8c82335"),
  clause("rule-atom:singleton:core-11-respawn-illegal-placement:a5467bf1bef4",
    "core:11:respawn-illegal-placement",
    ["9c6aef23a56f0256064082fbf8978b969ef1cc1dfcc4f860857b0ed90908e6e9"],
    "aba70dc87fbb66cf3409edddbd55e775318963c5dd6b99aa97e34b5a8141c2f1"),
  clause("rule-atom:singleton:core-11-respawn-return-destroyed-models:4a93c5e7e4fe",
    "core:11:respawn-return-destroyed-models",
    ["a8dda7a66f9b805798eb02c5f563645d3f576ad3bd1a91028dd6d2056046a0ff"],
    "3674fff1bbf8b09a91642b2ff09fe86fc9d351a7bdc8243e4b23bdd184057d11"),
  clause("rule-atom:singleton:core-11-respawn-supply-bracket-limit:50e4a224b9e1",
    "core:11:respawn-supply-bracket-limit",
    ["1c2ad9348126d131f26d5e5cb9e55ed048a2ce80f46f1fa19692d5fbb1863ea0",
      "d55d78a5756396f5d6f1483df8394b9711567026dc494bd1c3365758cb1edec4"],
    "843401bdf6110861ea7cc8ab368375ad84fd935758e5d869db7e1de550ce6d89"),
]);

const RESPAWN_RECORD_KEY = "army_units:swarmling__zergling_";
const RESPAWN_DEFINITION = Object.freeze({
  name: "Zergling Reconstitution",
  description: "Resolve the RESPAWN (2) effect, or RESPAWN (3) if the Unit is ON CREEP.",
  activation: "<Active>\n(1 Biomass)", phase: "Movement Phase",
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
function definitions(payload) {
  return [...(payload?.upgrades || []), ...(payload?.boosts || [])];
}
function scanEffectCarriers(dataset, keyword) {
  const pattern = new RegExp(`\\b${keyword}\\s*\\(`, "iu");
  return Object.entries(dataset.recordsByKey).flatMap(([recordKey, record]) => {
    if (!/^(army_units|tactical_cards|faction_cards):/u.test(recordKey)) return [];
    return definitions(record.payload).filter((entry) => (
      pattern.test(String(entry.description || ""))
    )).map((entry) => ({ recordKey, productName: record.payload.name,
      sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      definitionName: entry.name, definitionHash: hashStarcraftTmgContract(entry) }));
  }).sort((left, right) => (
    `${left.recordKey}:${left.definitionName}`.localeCompare(
      `${right.recordKey}:${right.definitionName}`,
    )
  ));
}

export function createOfficialRespawnMorphDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) fail("RESPAWN_MORPH_DATASET_INVALID");
  const rules = dataset.recordsByKey[RULE_SECTION.recordKey];
  const rulesIndex = dataset.recordIndex.find((entry) => entry.recordKey === RULE_SECTION.recordKey);
  if (!object(rules) || rules.payload?.title !== RULE_SECTION.title
    || rules.sourceRecordHash !== RULE_SECTION.sourceRecordHash
    || rules.payloadHash !== RULE_SECTION.payloadHash
    || rulesIndex?.authorityDisposition !== "official_rule_prose_review_required") {
    fail("RESPAWN_MORPH_RULE_RECORD_DRIFT");
  }
  const modelBaseGeometryDataBundle = createOfficialModelBaseGeometryDataBundleV1({ dataset });
  const unitCardSupplyDataBundle = createOfficialUnitCardSupplyDataBundleV1({ dataset });
  const respawnCarrierScan = scanEffectCarriers(dataset, "RESPAWN");
  const morphCarrierScan = scanEffectCarriers(dataset, "MORPH");
  if (respawnCarrierScan.length !== 1
    || respawnCarrierScan[0].recordKey !== RESPAWN_RECORD_KEY
    || respawnCarrierScan[0].definitionName !== RESPAWN_DEFINITION.name
    || morphCarrierScan.length !== 0) {
    fail("RESPAWN_MORPH_CURRENT_CARRIER_DENOMINATOR_DRIFT");
  }
  const record = getOfficialCurrentProductRecord(dataset, RESPAWN_RECORD_KEY);
  const definition = (record.payload.upgrades || []).find((entry) => (
    entry.name === RESPAWN_DEFINITION.name));
  if (record.payload.name !== "Swarmling (Zergling)"
    || definition?.description !== RESPAWN_DEFINITION.description
    || definition?.activation !== RESPAWN_DEFINITION.activation
    || definition?.phase !== RESPAWN_DEFINITION.phase) {
    fail("RESPAWN_CURRENT_CARRIER_DRIFT");
  }
  const supplyProfile = getOfficialUnitCardSupplyProfileV1(
    unitCardSupplyDataBundle, RESPAWN_RECORD_KEY,
  );
  const currentRespawnCarrier = {
    recordKey: RESPAWN_RECORD_KEY, unitName: record.payload.name,
    sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
    definitionName: definition.name, description: definition.description,
    activation: definition.activation, phase: definition.phase,
    definitionHash: hashStarcraftTmgContract(definition),
    baseRespawnValue: 2, onCreepRespawnValue: 3,
    unitCardSupplyProfileHash: supplyProfile.profileHash,
  };
  const body = {
    schema: OFFICIAL_RESPAWN_MORPH_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_RESPAWN_MORPH_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48", officialUnitsVersion: "71", officialCardsVersion: "69",
    ruleSectionRecord: { ...RULE_SECTION,
      authorityDisposition: rulesIndex.authorityDisposition },
    ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    currentRespawnCarriers: [currentRespawnCarrier],
    currentRespawnCarrierIndexHash: hashStarcraftTmgContract([currentRespawnCarrier]),
    currentMorphCarriers: [],
    currentMorphCarrierIndexHash: hashStarcraftTmgContract([]),
    currentCarrierScan: { scannedCollections: ["army_units", "tactical_cards",
      "faction_cards"], respawnCarrierScan, morphCarrierScan,
      scanHash: hashStarcraftTmgContract({ respawnCarrierScan, morphCarrierScan }) },
    returnRuleRegistry: {
      modelReturnAtomIds: [
        "rule-atom:singleton:core-11-respawn-return-destroyed-models:4a93c5e7e4fe",
      ],
      destroyedUnitReturnAtomIds: [],
      morphCreatesNewUnitInsteadOfReturningDestroyedUnit: true,
      respawnRequiresAtLeastOneExistingModel: true,
    },
    modelBaseGeometryDataBundle, unitCardSupplyDataBundle,
    sourceReconciliation: { currentRespawnCarrierCount: 1,
      currentMorphCarrierCount: 0, genericMorphRulesPresentInCore: true,
      missingCurrentMorphCarrierFailsClosed: true,
      slice97DestroyedUnitReturnRegistryRemainsFrozen: true },
    sourcePolicy: { captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
      corePdfRole: "primary_normative_respawn_and_morph_source",
      commandCenterRole: "current_effect_carrier_index" },
    productionRoomEligible: false,
    rulesTruth: "official_respawn_morph_source_index", trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialRespawnMorphDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialRespawnMorphDataBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_RESPAWN_MORPH_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_RESPAWN_MORPH_CORE_RULEBOOK_HASH
    || bundle.ruleSectionRecord?.recordKey !== RULE_SECTION.recordKey
    || bundle.ruleSectionRecord?.sourceRecordHash !== RULE_SECTION.sourceRecordHash
    || bundle.ruleSectionRecord?.payloadHash !== RULE_SECTION.payloadHash
    || bundle.ruleClauses?.length !== 9
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(RULE_CLAUSES)
    || bundle.currentRespawnCarriers?.length !== 1
    || bundle.currentRespawnCarriers[0]?.recordKey !== RESPAWN_RECORD_KEY
    || bundle.currentMorphCarriers?.length !== 0
    || bundle.currentCarrierScan?.respawnCarrierScan?.length !== 1
    || bundle.currentCarrierScan?.morphCarrierScan?.length !== 0
    || bundle.currentCarrierScan?.scanHash !== hashStarcraftTmgContract({
      respawnCarrierScan: bundle.currentCarrierScan.respawnCarrierScan,
      morphCarrierScan: bundle.currentCarrierScan.morphCarrierScan,
    })
    || bundle.returnRuleRegistry?.destroyedUnitReturnAtomIds?.length !== 0
    || bundle.returnRuleRegistry?.respawnRequiresAtLeastOneExistingModel !== true
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("RESPAWN_MORPH_DATA_BUNDLE_INVALID");
  }
  verifyOfficialModelBaseGeometryDataBundleV1(bundle.modelBaseGeometryDataBundle);
  verifyOfficialUnitCardSupplyDataBundleV1(bundle.unitCardSupplyDataBundle);
  if (new Set(bundle.ruleClauses.map((entry) => entry.atomId)).size !== 9
    || bundle.ruleClauses.some((entry) => !entry.sourceTextHashes?.length
      || entry.sourceTextHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(hash))
      || !/^[a-f0-9]{64}$/u.test(entry.candidateSequenceHash))) {
    fail("RESPAWN_MORPH_RULE_CLAUSE_DENOMINATOR_INVALID");
  }
  return true;
}

export function getOfficialRespawnCarrierV1(bundle, recordKey) {
  verifyOfficialRespawnMorphDataBundleV1(bundle);
  const carrier = bundle.currentRespawnCarriers.find((entry) => entry.recordKey === recordKey);
  if (!carrier) fail("RESPAWN_CURRENT_CARRIER_REQUIRED", String(recordKey || ""));
  return carrier;
}
