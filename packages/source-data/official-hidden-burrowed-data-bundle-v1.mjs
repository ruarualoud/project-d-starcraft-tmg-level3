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

export const OFFICIAL_HIDDEN_BURROWED_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_hidden_burrowed_data_bundle_v1";
export const OFFICIAL_HIDDEN_BURROWED_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_SECTION = Object.freeze({
  recordKey: "rules_sections:FuahgilWtc8nccVSp2Vv",
  title: "PART 11: KEYWORD GLOSSARY AND DEFINITIONS",
  sourceRecordHash: "985e79f70c48caf1b1085e620e92be23f5b4468ffe07fdc5f84cb01a28fa59b7",
  payloadHash: "4a6aa9e55e3b4197666b0f4fed633269dc42327af16f5b5a5422b7533d7d8973",
});

function clause(atomId, clauseId, sourceTextHashes, candidateSequenceHash) {
  return Object.freeze({ atomId, clauseIds: Object.freeze([clauseId]), section: "11",
    sourceTextHashes: Object.freeze(sourceTextHashes),
    candidateSequenceHashes: Object.freeze([candidateSequenceHash]) });
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:burrowed-evade-per-targeting-attack", "core:11:burrowed-evade",
    ["944d8ca094ec818199f0dd1e948657382420013fc1af31fb0c3e284a249c7764"],
    "97773876ec97421a267bd7094e26c0f655b14f87aa62bfb763f6dfc92a3e146c"),
  clause("rule-atom:burrowed-start-round-hidden-grant",
    "core:11:burrowed-start-round-hidden",
    ["f06682ef9b765a7edfc3362c6bf38498015906c58def17cc002877461f50305a"],
    "7ccaa3d277ba4fca799189f296c160652f3007736a8d5fcc2be9b153b183d132"),
  clause("rule-atom:hidden-evade-per-targeting-attack", "core:11:hidden-evade",
    ["edeff378fe8710e684624196cd2726baf992e063a6308279cd8b5a2d4df576ed"],
    "46284a6098c5ce9d200d47cd8e2f6efd959dd469e1ab8ac3bd976e980bf89751"),
  clause("rule-atom:singleton:core-11-burrowed-action-removes-status:a60280e0467d",
    "core:11:burrowed-action-removes-status",
    ["6b369c41dd3e168f9b97f3dcfb3e144c218892c26802f30b11cf2df616db9862"],
    "ffb5af5e09be89a0e1eefd489fa0ae0fc1223ae09f6b311ec527366a733b5bd6"),
  clause("rule-atom:singleton:core-11-burrowed-action-whitelist:106ab3096fb0",
    "core:11:burrowed-action-whitelist",
    ["fe72c91e27c4610c8d80b13fc6ee6bf5f6ebaf48fd383056193b55a01d433dcf"],
    "9e5a2a358eb8ff6b8763e0c5d683b568695678ed924b0985e5e2e77309e24df5"),
  clause("rule-atom:singleton:core-11-burrowed-disengage-supply-zero:f0139d240c94",
    "core:11:burrowed-disengage-supply-zero",
    ["67448d1ab51d96b045949f83a136b909fdfc53d2b8cf06b51a122297f5f28cba"],
    "2b23ebdf0353920a1e2af6cc807c5436446d0dd883c7ac69357d7fd24ce2f4d6"),
  clause("rule-atom:singleton:core-11-burrowed-enemy-attacks:17c4becf42f8",
    "core:11:burrowed-enemy-attacks",
    ["ff0fdcf9ebfa1fbf8f96b058cd77dae6584e3f7e06517a39870f9616f584ab31"],
    "8d898fa188e6434cb92d4a8d686fa16a9d426e51344ab9d1a03ce7b41804e55c"),
  clause("rule-atom:singleton:core-11-burrowed-engaged-combat-sequence:8807e30b2918",
    "core:11:burrowed-engaged-combat-sequence",
    ["5112e8908e62e18553c078d58429343d4faf5da43ac18c732b908ca5f23eacec",
      "9f43f8e4498de5a6420375bce56fa8241848957d07bb17708a6c191e2f25d6a4",
      "7cde094126478aff0411312e73579dfc4e2187c9bd9b332508d013048826a229",
      "5a22419a058e9a1e67bc84bd04ba8da2848e8876ef40852e766973677d58a2b4"],
    "71b4c435b1d65f97242821124ad47437f1082453dc471c1a4a62c1394dc5db1a"),
  clause("rule-atom:singleton:core-11-burrowed-gains-hidden:352b7e370acb",
    "core:11:burrowed-gains-hidden",
    ["3a6833aa732fec242e193b3bee1665124fadee5e83bb963f94e9d273be7f9cff"],
    "975e78dd8e71c3e88b55772e4a95bdac465feda0d7ff2a64b53f1771eeb15707"),
  clause("rule-atom:singleton:core-11-burrowed-model-pass-through:25c368516295",
    "core:11:burrowed-model-pass-through",
    ["7949caac758f6ae887a3f3faabf652ce84f7e8afecdfaf8db7e1098d478b774c"],
    "1112372b494d722ec4bd60dcd7486b8e872ac683142b7bfc89578c377fdf8fdb"),
  clause("rule-atom:singleton:core-11-burrowed-removal-loses-hidden:638dfd9f9987",
    "core:11:burrowed-removal-loses-hidden",
    ["e1ad87ec0007c726a6a4a345241d3041dac04af3d4554e0f67c92a45fdc86d71"],
    "216eef1bcd0166ffc8afad18a02528862e57a6e2ee51e13b4a05098daf1a1729"),
  clause("rule-atom:singleton:core-11-burrowed-size-zero:08f6946cccf5",
    "core:11:burrowed-size-zero",
    ["f19fe4145580353c8741c3dbed25f725abc8505384ebb6157e9462d80374da4b"],
    "25bd7443677e3894343504b05a92c220a5484044726bec7fe7b950cfd9876552"),
  clause("rule-atom:singleton:core-11-burrowed-special-abilities:1368534de3cc",
    "core:11:burrowed-special-abilities",
    ["9072b094af6826cad46b1184c39d494b859425d55ebc6b0a2beee8093bb1cbf9"],
    "5585df7344d26afeaa9e06e365a71b089319c5440386d1b05cd234f43d046360"),
  clause("rule-atom:singleton:core-11-burrowed-status-classification:1db02bc52a19",
    "core:11:burrowed-status-classification",
    ["2bbf3a494d4f4c47e1b9a905ded10fbb2db45d4ffe22b54933493282e788886f"],
    "bbb36d63cbdd7f549150fe97a0dbcb3f73ae83fd01450a1ed2091971714e3f2d"),
  clause("rule-atom:singleton:core-11-hidden-impact-immunity:6ee45ab3f111",
    "core:11:hidden-impact-immunity",
    ["37c51a4539c7e5755d53d2feec63aad80222f4079495bed9abc7b8b225bd74f1"],
    "8fb52aab6f423cffbde2eea2031606df9346e96e23e17da3593919cc505c80e3"),
  clause("rule-atom:singleton:core-11-hidden-status-classification:d980f58a9c10",
    "core:11:hidden-status-classification",
    ["906c047b6ebf1cd75f74d117b22ecaa6af7bc74acb4bc5abff75a629512d2b48"],
    "3c7f324ea7e0dce871aba2864e28688407b24fc0d0e0e88993c5e0275dbc21a0"),
  clause("rule-atom:singleton:core-11-hidden-targeting-distance:e3f20ddd0ba8",
    "core:11:hidden-targeting-distance",
    ["fdeb8df27b3596d13c4a191f6e496735ee45045c04e879739c5ab4fbfdbc33d5"],
    "69be7606dd280e57fddf142e15acc4cd51855486a8a086e97b97a6edfb004d25"),
  clause("rule-atom:singleton:core-11-visible-hidden-distance-override:36b7d634f39d",
    "core:11:visible-hidden-distance-override",
    ["ea5f6bdffdb93b25223ccf7efd3d0df534fd9d00ddfb820a5d9cf238d766c76d"],
    "4cb510892201c5f3120ffd31c8a35fa6368d0375f63106f489102800beea0bd6"),
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
function compileKeywordDefinitions(dataset, pattern) {
  const rows = [];
  for (const entry of dataset.recordIndex) {
    if (entry.authorityDisposition !== "official_current_product_candidate") continue;
    const record = getOfficialCurrentProductRecord(dataset, entry.recordKey);
    for (const definition of definitions(record.payload)) {
      if (!pattern.test(String(definition.description || ""))) continue;
      rows.push({ recordKey: record.recordKey, unitName: record.payload.name || null,
        sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
        definitionName: definition.name, description: definition.description,
        definitionHash: hashStarcraftTmgContract(definition) });
    }
  }
  return rows.sort((left, right) => (
    `${left.recordKey}:${left.definitionName}`.localeCompare(
      `${right.recordKey}:${right.definitionName}`,
    )
  ));
}

export function createOfficialHiddenBurrowedDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false
    || !Array.isArray(dataset.recordIndex) || !object(dataset.recordsByKey)) {
    fail("HIDDEN_BURROWED_DATASET_INVALID");
  }
  const ruleRecord = dataset.recordsByKey[RULE_SECTION.recordKey];
  const ruleIndex = dataset.recordIndex.find((entry) => entry.recordKey === RULE_SECTION.recordKey);
  if (!object(ruleRecord) || !object(ruleIndex)
    || ruleIndex.authorityDisposition !== "official_rule_prose_review_required"
    || ruleRecord.sourceRecordHash !== RULE_SECTION.sourceRecordHash
    || ruleRecord.payloadHash !== RULE_SECTION.payloadHash) {
    fail("HIDDEN_BURROWED_RULE_SOURCE_DRIFT");
  }
  const hiddenDefinitions = compileKeywordDefinitions(dataset, /\bHIDDEN\b/u);
  const burrowedDefinitions = compileKeywordDefinitions(dataset, /\bBURROWED\b/u);
  const pathOfShadows = hiddenDefinitions.find((entry) => (
    entry.recordKey === "army_units:stalker" && entry.definitionName === "Path of Shadows"
  ));
  if (!pathOfShadows
    || pathOfShadows.description
      !== "This Unit gains HIDDEN Status until it performs another action."
    || burrowedDefinitions.length !== 0) {
    fail("HIDDEN_BURROWED_CURRENT_CARRIER_DRIFT");
  }
  const modelBaseGeometryDataBundle = createOfficialModelBaseGeometryDataBundleV1({ dataset });
  const body = {
    schema: OFFICIAL_HIDDEN_BURROWED_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_HIDDEN_BURROWED_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48",
    ruleSectionRecord: { ...RULE_SECTION,
      authorityDisposition: ruleIndex.authorityDisposition,
      recordType: ruleIndex.recordType },
    ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    modelBaseGeometryDataBundle,
    hiddenDefinitionIndex: hiddenDefinitions,
    hiddenDefinitionIndexHash: hashStarcraftTmgContract(hiddenDefinitions),
    pathOfShadows,
    burrowedCarrierRegistry: {
      entries: burrowedDefinitions,
      policy: "generic_rules_harness_only_no_current_official_carrier",
    },
    ruleConstants: {
      hiddenMaximumTargetingDistanceMilliInches: 4000,
      burrowedEngagementRangeMilliInches: 1000,
      burrowedEffectiveSize: 0,
      burrowedDisengageCurrentSupply: 0,
      burrowedActionWhitelist: ["close_ranks", "deploy", "disengage", "hold", "move", "run"],
      burrowedStatusRemovingActions: ["close_ranks", "deploy", "disengage", "move", "run"],
    },
    sourceReconciliation: {
      corePdfContainsStartOfRoundHiddenGrant: true,
      commandCenterPart11ContainsStartOfRoundHiddenGrant: false,
      resolution: "core_pdf_is_primary_normative_rule_source",
      silentSourceMergeAllowed: false,
    },
    sourcePolicy: {
      captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false,
      corePdfRole: "primary_normative_hidden_and_burrowed_source",
      commandCenterRole: "current_product_carrier_and_detection_index",
      p2pRole: "current_official_model_base_geometry",
    },
    existingConsumersFrozen: true,
    productionRoomEligible: false,
    rulesTruth: "official_hidden_burrowed_source_and_current_carrier_index",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialHiddenBurrowedDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialHiddenBurrowedDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_HIDDEN_BURROWED_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_HIDDEN_BURROWED_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48"
    || bundle.ruleSectionRecord?.recordKey !== RULE_SECTION.recordKey
    || bundle.ruleSectionRecord?.sourceRecordHash !== RULE_SECTION.sourceRecordHash
    || bundle.ruleSectionRecord?.payloadHash !== RULE_SECTION.payloadHash
    || bundle.ruleClauses?.length !== 18
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(RULE_CLAUSES)
    || !Array.isArray(bundle.hiddenDefinitionIndex)
    || bundle.hiddenDefinitionIndexHash !== hashStarcraftTmgContract(bundle.hiddenDefinitionIndex)
    || bundle.pathOfShadows?.recordKey !== "army_units:stalker"
    || bundle.pathOfShadows?.definitionName !== "Path of Shadows"
    || bundle.burrowedCarrierRegistry?.entries?.length !== 0
    || bundle.ruleConstants?.hiddenMaximumTargetingDistanceMilliInches !== 4000
    || bundle.ruleConstants?.burrowedEngagementRangeMilliInches !== 1000
    || bundle.ruleConstants?.burrowedEffectiveSize !== 0
    || bundle.ruleConstants?.burrowedDisengageCurrentSupply !== 0
    || bundle.sourceReconciliation?.corePdfContainsStartOfRoundHiddenGrant !== true
    || bundle.sourceReconciliation?.commandCenterPart11ContainsStartOfRoundHiddenGrant !== false
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.existingConsumersFrozen !== true
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("HIDDEN_BURROWED_DATA_BUNDLE_INVALID");
  }
  verifyOfficialModelBaseGeometryDataBundleV1(bundle.modelBaseGeometryDataBundle);
  const atomIds = bundle.ruleClauses.map((entry) => entry.atomId);
  if (new Set(atomIds).size !== 18
    || bundle.ruleClauses.some((entry) => entry.clauseIds.length !== 1
      || entry.sourceTextHashes.length < 1
      || entry.sourceTextHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(hash))
      || entry.candidateSequenceHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(hash)))) {
    fail("HIDDEN_BURROWED_RULE_CLAUSE_DENOMINATOR_INVALID");
  }
  return true;
}
