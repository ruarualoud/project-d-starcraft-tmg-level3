import { assertOfficialReleaseSourceV2 } from "./official-release-context-v2.mjs";
import { createOfficialAbilityEffectIrCatalogueV1 } from "./official-ability-effect-ir-v1.mjs";
import { getOfficialReleaseModelBaseGeometryBundleV2 } from "./official-model-base-geometry-data-bundle-v1.mjs";
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
  getOfficialReleaseUnitCardSupplyDataBundleV2,
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
  const { dataset, snapshot, releaseContext } = input;
  const legacy = dataset?.datasetHash === OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    && dataset?.sourceSnapshotHash === OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH;
  const manifest = !legacy && releaseContext
    ? assertOfficialReleaseSourceV2(releaseContext, { dataset, snapshot }) : null;
  if (!object(dataset) || (!legacy && !manifest) || dataset.repositoryFallbackAllowed !== false
    || !Array.isArray(dataset.recordIndex) || !object(dataset.recordsByKey)) {
    fail("RESPAWN_MORPH_DATASET_INVALID");
  }
  if (manifest && manifest.source.references?.core?.byteHash !== OFFICIAL_RESPAWN_MORPH_CORE_RULEBOOK_HASH) {
    fail("RESPAWN_MORPH_RELEASE_CORE_MISMATCH");
  }
  const rules = dataset.recordsByKey[RULE_SECTION.recordKey];
  const rulesIndex = dataset.recordIndex.find((entry) => entry.recordKey === RULE_SECTION.recordKey);
  if (!object(rules) || rules.payload?.title !== RULE_SECTION.title
    || rules.sourceRecordHash !== RULE_SECTION.sourceRecordHash
    || rules.payloadHash !== RULE_SECTION.payloadHash
    || rulesIndex?.authorityDisposition !== "official_rule_prose_review_required") {
    fail("RESPAWN_MORPH_RULE_RECORD_DRIFT");
  }
  const modelBaseGeometryDataBundle = manifest ? getOfficialReleaseModelBaseGeometryBundleV2(releaseContext)
    : createOfficialModelBaseGeometryDataBundleV1({ dataset });
  const unitCardSupplyDataBundle = manifest ? getOfficialReleaseUnitCardSupplyDataBundleV2(releaseContext)
    : createOfficialUnitCardSupplyDataBundleV1({ dataset });
  const allRespawnCarriers = scanEffectCarriers(dataset, "RESPAWN");
  const allMorphCarriers = scanEffectCarriers(dataset, "MORPH");
  const compatibleRespawn = row => row.recordKey === RESPAWN_RECORD_KEY
    && row.definitionName === RESPAWN_DEFINITION.name;
  const respawnCarrierScan = manifest ? allRespawnCarriers.filter(compatibleRespawn)
    : allRespawnCarriers;
  const morphCarrierScan = manifest ? [] : allMorphCarriers;
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
    sourceLockHash: manifest?.source.sourceRevisionHash ?? OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: dataset.sourceSnapshotHash, normalizedDatasetHash: dataset.datasetHash,
    ...(manifest ? { releaseBinding: {
      releaseId: manifest.releaseId, manifestHash: manifest.manifestHash,
      sourceRevisionHash: manifest.source.sourceRevisionHash,
      sourceSnapshotHash: dataset.sourceSnapshotHash, normalizedDatasetHash: dataset.datasetHash,
    } } : {}),
    coreRulebookHash: OFFICIAL_RESPAWN_MORPH_CORE_RULEBOOK_HASH,
    officialRulesVersion: manifest ? dataset.dataVersions.rulesVersion : "48",
    officialUnitsVersion: manifest ? dataset.dataVersions.unitsVersion : "71",
    officialCardsVersion: manifest ? dataset.dataVersions.cardsVersion : "69",
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
    ...(manifest ? { carriersRequiringSeparateRuntimeBinding: {
      respawn: allRespawnCarriers.filter(row => !compatibleRespawn(row)),
      morph: allMorphCarriers,
    } } : {}),
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
    sourcePolicy: { captureMode: manifest ? "release_manifest_frozen_source" : "slice_75_single_official_capture_lock",
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
  if (bundle?.schema === "starcraft_tmg_official_respawn_morph_data_bundle_v2") {
    return verifyOfficialRespawnMorphDataBundleV2(bundle);
  }
  const binding = bundle?.releaseBinding;
  const sourceInvalid = binding
    ? !binding.releaseId || !/^[a-f0-9]{64}$/u.test(binding.manifestHash)
      || !/^[a-f0-9]{64}$/u.test(binding.sourceRevisionHash)
      || binding.sourceRevisionHash !== bundle.sourceLockHash
      || binding.sourceSnapshotHash !== bundle.sourceSnapshotHash
      || binding.normalizedDatasetHash !== bundle.normalizedDatasetHash
      || [bundle.modelBaseGeometryDataBundle, bundle.unitCardSupplyDataBundle].some(data =>
        data?.sourceLockHash !== bundle.sourceLockHash
        || data?.sourceSnapshotHash !== bundle.sourceSnapshotHash
        || data?.normalizedDatasetHash !== bundle.normalizedDatasetHash)
    : bundle?.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
      || bundle?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
      || bundle?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH;
  if (!object(bundle) || bundle.schema !== OFFICIAL_RESPAWN_MORPH_DATA_BUNDLE_SCHEMA
    || sourceInvalid
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

export function getOfficialRespawnCarrierV1(bundle, recordKey, definitionId) {
  verifyOfficialRespawnMorphDataBundleV1(bundle);
  if (bundle.schema === "starcraft_tmg_official_respawn_morph_data_bundle_v2") {
    const carrier = bundle.currentRespawnCarriers.find(entry => entry.definitionId === definitionId);
    const targetUnitProfile = bundle.eligibleUnitProfiles.find(entry => entry.recordKey === recordKey);
    if (!carrier || !targetUnitProfile
      || (carrier.recordKey.startsWith('army_units:') && carrier.recordKey !== recordKey)) {
      fail("RESPAWN_CURRENT_CARRIER_REQUIRED", String(recordKey || ""));
    }
    return { ...carrier, targetUnitProfile };
  }
  const carrier = bundle.currentRespawnCarriers.find((entry) => entry.recordKey === recordKey);
  if (!carrier) fail("RESPAWN_CURRENT_CARRIER_REQUIRED", String(recordKey || ""));
  return carrier;
}

export const OFFICIAL_COCOON_RESPAWN_DEFINITION_ID = "card:cocoon/spawn-larva-any@1";
export const OFFICIAL_COCOON_MORPH_DEFINITION_ID = "card:cocoon/ravager-morph-any@1";
const COCOON_RESPAWN_ID = OFFICIAL_COCOON_RESPAWN_DEFINITION_ID;
const COCOON_RESPAWN_TEXT = "Spawn Larva <Active> <Movement Phase>: The active Friendly non-Unique Biological Unit with a Size Characteristic of 1 resolves the RESPAWN (2) effect.";
export const OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID = 'unit:vileling__zergling_/zergling-reconstitution-movement-phase@1';
export const OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID = 'unit:swarmling__zergling_/zergling-reconstitution-movement-phase@1';
const UNIT_RESPAWN_TEXT = 'Resolve the RESPAWN (2) effect, or RESPAWN (3) if the Unit is ON CREEP.';
const unitRespawnSources = [
  { definitionId: OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID, recordKey: 'army_units:vileling__zergling_',
    compilerScope: 'current_release_vileling_reconstitution_subset', version: '2.2.0' },
  { definitionId: OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID, recordKey: 'army_units:swarmling__zergling_',
    compilerScope: 'current_release_swarmling_reconstitution_subset', version: '2.3.0' },
];

export const OFFICIAL_COMBINED_UNIT_RECONSTITUTION_SCOPE = 'current_release_combined_unit_reconstitution_subset';
export const OFFICIAL_COCOON_SHARED_RESPAWN_SCOPE = 'current_release_cocoon_shared_respawn_subset';

export function isOfficialUnitReconstitutionSourceV1(row) {
  const unit = unitRespawnSources.find(source => source.definitionId === row?.definitionId);
  return Boolean(unit && row.recordKey === unit.recordKey && row.sourceKind === 'unit_feature'
    && row.phase === 'movement' && row.activationKind === 'active' && row.activationText === '<Active>\n(1 Biomass)'
    && row.sourceText === UNIT_RESPAWN_TEXT);
}

export function isOfficialSwarmlingReconstitutionSourceV1(row) {
  return row?.definitionId === OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID
    && isOfficialUnitReconstitutionSourceV1(row);
}

// Current-release data is separate from the frozen Wave1 carrier denominator.
export function createOfficialRespawnMorphDataBundleV2({ context, includeMorph = false,
  respawnDefinitionId = COCOON_RESPAWN_ID, respawnDefinitionIds } = {}) {
  assertOfficialReleaseSourceV2(context, context || {});
  const combined = respawnDefinitionIds !== undefined;
  const cocoonShared = combined && includeMorph;
  const unitRespawn = unitRespawnSources.find(row => row.definitionId === respawnDefinitionId);
  if (combined ? !Array.isArray(respawnDefinitionIds) || !respawnDefinitionIds.length
    || respawnDefinitionId !== COCOON_RESPAWN_ID
    || new Set(respawnDefinitionIds).size !== respawnDefinitionIds.length
    || respawnDefinitionIds.some(id => !unitRespawnSources.some(row => row.definitionId === id))
    : (!unitRespawn && respawnDefinitionId !== COCOON_RESPAWN_ID) || (unitRespawn && includeMorph)) {
    fail('RESPAWN_CURRENT_SOURCE_UNSUPPORTED');
  }
  const definitionIds = combined
    ? [...(cocoonShared ? [COCOON_RESPAWN_ID] : []), ...respawnDefinitionIds].sort()
    : [respawnDefinitionId];
  const dataset = context.dataset;
  const rules = dataset.recordsByKey[RULE_SECTION.recordKey];
  if (rules?.sourceRecordHash !== RULE_SECTION.sourceRecordHash
    || rules.payloadHash !== RULE_SECTION.payloadHash) fail("RESPAWN_MORPH_RULE_RECORD_DRIFT");
  const catalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset,
    identityCatalogue: context.resources.abilityIdentities });
  const carriers = definitionIds.map(id => {
    const definition = catalogue.definitions.find(entry => entry.definitionId === id);
    const unit = unitRespawnSources.find(row => row.definitionId === id);
    if (definition?.recordKey !== (unit?.recordKey ?? 'tactical_cards:cocoon')
      || (combined || id === OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID)
        && unit && !isOfficialUnitReconstitutionSourceV1(definition)
      || definition.definitionName !== (unit ? 'Zergling Reconstitution' : 'Spawn Larva')
      || definition.sourceText !== (unit ? UNIT_RESPAWN_TEXT : COCOON_RESPAWN_TEXT)
      || definition.phase !== 'movement' || definition.activationKind !== 'active') fail('RESPAWN_CURRENT_SOURCE_UNSUPPORTED');
    return { recordKey: definition.recordKey, definitionId: definition.definitionId,
      definitionName: definition.definitionName, sourceFeatureHash: definition.sourceFeatureHash,
      sourceRecordHash: definition.sourceRecordHash, payloadHash: definition.payloadHash,
      definitionHash: definition.sourceFeatureHash, description: definition.sourceText,
      baseRespawnValue: 2, onCreepRespawnValue: unit ? 3 : 2 };
  });
  const eligibleUnitProfiles = Object.entries(dataset.recordsByKey).flatMap(([recordKey, record]) => {
    if (!recordKey.startsWith("army_units:")) return [];
    const tags = String(record.payload.tags || "").split(",").map(tag => tag.trim().toLowerCase()).sort();
    if (Number(record.payload.stats?.size) !== 1 || !tags.includes("biological") || tags.includes("unique")) return [];
    return [{ recordKey, sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      sizeCharacteristic: 1, combatTags: tags, hitPoints: Number(record.payload.stats.hp),
      maximumModels: Math.max(Number(record.payload.small?.models || 0), Number(record.payload.large?.models || 0)) }];
  }).sort((a, b) => a.recordKey.localeCompare(b.recordKey));
  const body = { schema: "starcraft_tmg_official_respawn_morph_data_bundle_v2",
    version: combined ? '2.4.0' : unitRespawn?.version ?? '2.0.0',
    sourceBinding: structuredClone(context.resources.unitCharacteristics.sourceBinding),
    sourceSnapshotHash: dataset.sourceSnapshotHash, normalizedDatasetHash: dataset.datasetHash,
    ruleSectionRecord: RULE_SECTION, ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    currentRespawnCarriers: carriers, currentRespawnCarrierIndexHash: hashStarcraftTmgContract(carriers),
    currentMorphCarriers: [], eligibleUnitProfiles,
    eligibleUnitProfileIndexHash: hashStarcraftTmgContract(eligibleUnitProfiles),
    modelBaseGeometryDataBundle: getOfficialReleaseModelBaseGeometryBundleV2(context),
    unitCardSupplyDataBundle: context.resources.unitCharacteristics,
    compilerScope: combined ? OFFICIAL_COMBINED_UNIT_RECONSTITUTION_SCOPE
      : unitRespawn?.compilerScope ?? 'current_release_cocoon_spawn_larva_subset',
    productionRoomEligible: false, sourceRefreshPerformed: false, trainingTruth: false };
  if (includeMorph) {
    const morph = catalogue.definitions.find(row => row.definitionId === OFFICIAL_COCOON_MORPH_DEFINITION_ID);
    if (morph?.recordKey !== "tactical_cards:cocoon" || morph.phase !== "movement" || morph.activationKind !== "active"
      || morph.sourceText !== "Ravager Morph <Active> <Movement Phase>: Once per Game. The active Friendly Roach Unit performs MORPH (Ravager) 1.") fail("MORPH_COCOON_SOURCE_UNSUPPORTED");
    const unitFacts = (recordKey, record) => ({ recordKey, unitName: record.payload.name,
      sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      sizeCharacteristic: Number(record.payload.stats.size), hitPoints: Number(record.payload.stats.hp) });
    const sourceUnitProfiles = Object.entries(dataset.recordsByKey).filter(([key, record]) => key.startsWith("army_units:")
      && (record.payload.name === "Roach" || /\(Roach\)$/u.test(record.payload.name))).map(([key, record]) => unitFacts(key, record))
      .sort((a, b) => a.recordKey.localeCompare(b.recordKey));
    const createdUnitProfile = unitFacts("army_units:ravager", dataset.recordsByKey["army_units:ravager"]);
    const morphCarriers = [{ recordKey: morph.recordKey, definitionId: morph.definitionId, definitionName: morph.definitionName,
      sourceFeatureHash: morph.sourceFeatureHash, sourceRecordHash: morph.sourceRecordHash, payloadHash: morph.payloadHash,
      description: morph.sourceText, sourceUnitProfiles, createdUnitProfile, createdModels: 1,
      enemySeparationMilliInches: 1000, oncePerGame: true, activationLockedForRemainderOfRound: true }];
    Object.assign(body, { version: cocoonShared ? "2.5.0" : "2.1.0",
      compilerScope: cocoonShared ? OFFICIAL_COCOON_SHARED_RESPAWN_SCOPE : "current_release_cocoon_morph_subset",
      currentMorphCarriers: morphCarriers, currentMorphCarrierIndexHash: hashStarcraftTmgContract(morphCarriers) });
  }
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialRespawnMorphDataBundleV2(bundle);
  return bundle;
}
function verifyCurrentRespawnCarrier(carrier, unit) {
  return Boolean(carrier
    && carrier.recordKey === (unit?.recordKey ?? 'tactical_cards:cocoon')
    && carrier.definitionId === (unit?.definitionId ?? COCOON_RESPAWN_ID)
    && carrier.definitionName === (unit ? 'Zergling Reconstitution' : 'Spawn Larva')
    && carrier.description === (unit ? UNIT_RESPAWN_TEXT : COCOON_RESPAWN_TEXT)
    && [carrier.sourceFeatureHash, carrier.sourceRecordHash, carrier.payloadHash]
      .every(value => /^[a-f0-9]{64}$/u.test(value))
    && carrier.definitionHash === carrier.sourceFeatureHash
    && carrier.baseRespawnValue === 2 && carrier.onCreepRespawnValue === (unit ? 3 : 2));
}

export function verifyOfficialRespawnMorphDataBundleV2(bundle) {
  const carriers = bundle?.currentRespawnCarriers;
  const cocoonShared = bundle?.compilerScope === OFFICIAL_COCOON_SHARED_RESPAWN_SCOPE;
  const withMorph = cocoonShared || bundle?.compilerScope === "current_release_cocoon_morph_subset";
  const combined = cocoonShared || bundle?.compilerScope === OFFICIAL_COMBINED_UNIT_RECONSTITUTION_SCOPE;
  const unitRespawn = unitRespawnSources.find(row => row.compilerScope === bundle?.compilerScope);
  const validCarriers = Array.isArray(carriers) && (combined
    ? carriers.length >= (cocoonShared ? 2 : 1)
      && carriers.length <= unitRespawnSources.length + Number(cocoonShared)
      && (!cocoonShared || carriers.some(carrier => carrier?.definitionId === COCOON_RESPAWN_ID))
      && carriers.every((carrier, index) => {
        const unit = unitRespawnSources.find(row => row.definitionId === carrier?.definitionId);
        return (unit || cocoonShared && carrier?.definitionId === COCOON_RESPAWN_ID)
          && verifyCurrentRespawnCarrier(carrier, unit)
          && (index === 0 || carriers[index - 1].definitionId < carrier.definitionId);
      })
    : carriers.length === 1 && verifyCurrentRespawnCarrier(carriers[0], unitRespawn));
  if (!object(bundle) || bundle.schema !== "starcraft_tmg_official_respawn_morph_data_bundle_v2"
    || bundle.version !== (cocoonShared ? '2.5.0' : combined ? '2.4.0' : unitRespawn?.version ?? (withMorph ? '2.1.0' : '2.0.0')) || !bundle.sourceBinding?.releaseId
    || bundle.sourceBinding.sourceSnapshotHash !== bundle.sourceSnapshotHash
    || bundle.sourceBinding.normalizedDatasetHash !== bundle.normalizedDatasetHash
    || bundle.sourceBinding.releaseId !== bundle.unitCardSupplyDataBundle?.sourceBinding?.releaseId
    || bundle.unitCardSupplyDataBundle?.sourceSnapshotHash !== bundle.sourceSnapshotHash
    || bundle.unitCardSupplyDataBundle?.normalizedDatasetHash !== bundle.normalizedDatasetHash
    || bundle.modelBaseGeometryDataBundle?.sourceSnapshotHash !== bundle.sourceSnapshotHash
    || bundle.modelBaseGeometryDataBundle?.normalizedDatasetHash !== bundle.normalizedDatasetHash
    || bundle.ruleSectionRecord?.sourceRecordHash !== RULE_SECTION.sourceRecordHash
    || bundle.ruleSectionRecord?.payloadHash !== RULE_SECTION.payloadHash
    || hashStarcraftTmgContract(bundle.ruleClauses) !== hashStarcraftTmgContract(RULE_CLAUSES)
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(RULE_CLAUSES)
    || !validCarriers || bundle.currentMorphCarriers?.length !== (withMorph ? 1 : 0)
    || bundle.currentRespawnCarrierIndexHash !== hashStarcraftTmgContract(bundle.currentRespawnCarriers)
    || !Array.isArray(bundle.eligibleUnitProfiles) || !bundle.eligibleUnitProfiles.length
    || new Set(bundle.eligibleUnitProfiles.map(row => row.recordKey)).size !== bundle.eligibleUnitProfiles.length
    || bundle.eligibleUnitProfiles.some(row => !row.recordKey.startsWith("army_units:")
      || row.sizeCharacteristic !== 1 || !row.combatTags?.includes("biological") || row.combatTags.includes("unique")
      || !Number.isSafeInteger(row.hitPoints) || row.hitPoints < 1
      || !Number.isSafeInteger(row.maximumModels) || row.maximumModels < 1
      || !/^[a-f0-9]{64}$/u.test(row.sourceRecordHash) || !/^[a-f0-9]{64}$/u.test(row.payloadHash))
    || bundle.eligibleUnitProfileIndexHash !== hashStarcraftTmgContract(bundle.eligibleUnitProfiles)
    || !['current_release_cocoon_spawn_larva_subset', 'current_release_cocoon_morph_subset',
      OFFICIAL_COMBINED_UNIT_RECONSTITUTION_SCOPE, OFFICIAL_COCOON_SHARED_RESPAWN_SCOPE,
      ...unitRespawnSources.map(row => row.compilerScope)].includes(bundle.compilerScope)
    || bundle.productionRoomEligible !== false || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("RESPAWN_MORPH_DATA_BUNDLE_INVALID");
  }
  if (withMorph) {
    const morph = bundle.currentMorphCarriers[0];
    if (morph.recordKey !== "tactical_cards:cocoon" || morph.definitionId !== "card:cocoon/ravager-morph-any@1"
      || morph.definitionName !== "Ravager Morph" || morph.createdModels !== 1
      || morph.enemySeparationMilliInches !== 1000 || morph.oncePerGame !== true
      || morph.activationLockedForRemainderOfRound !== true
      || morph.createdUnitProfile?.recordKey !== "army_units:ravager"
      || !Array.isArray(morph.sourceUnitProfiles) || !morph.sourceUnitProfiles.length
      || morph.sourceUnitProfiles.some(row => row.unitName !== "Roach" && !/\(Roach\)$/u.test(row.unitName))
      || ![morph, morph.createdUnitProfile, ...morph.sourceUnitProfiles].every(row =>
        /^[a-f0-9]{64}$/u.test(row.sourceRecordHash) && /^[a-f0-9]{64}$/u.test(row.payloadHash))
      || bundle.currentMorphCarrierIndexHash !== hashStarcraftTmgContract(bundle.currentMorphCarriers)) fail("MORPH_CURRENT_SOURCE_INVALID");
  }
  verifyOfficialModelBaseGeometryDataBundleV1(bundle.modelBaseGeometryDataBundle);
  verifyOfficialUnitCardSupplyDataBundleV1(bundle.unitCardSupplyDataBundle);
  return true;
}
