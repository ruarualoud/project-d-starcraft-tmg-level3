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
  getOfficialModelBaseGeometryProfileV1,
} from "./official-model-base-geometry-data-bundle-v1.mjs";

export const OFFICIAL_UNIT_CARD_SUPPLY_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_unit_card_supply_data_bundle_v1";
export const OFFICIAL_UNIT_CARD_SUPPLY_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const ARMY_SLOT_TYPES = Object.freeze(["Air", "Core", "Elite", "Hero", "Support"]);
const FACTIONS = new Set(["Protoss", "Terran", "Zerg"]);
const PHASES = Object.freeze([
  "Any Phase", "Movement Phase", "Assault Phase", "Combat Phase",
]);
const RULE_RECORDS = Object.freeze([
  Object.freeze({ recordKey: "rules_sections:u3zNStKpd5XegMjmJfMS",
    title: "PART 5: CARDS AND CHARACTERISTICS",
    sourceRecordHash: "026a4a9b0f3c0bae10a76ee28e48655cbf117cc01e304c57d7dfc2f5522f1175",
    payloadHash: "bd1eb44d676bac9a2a2643122f3af1fb90625c29e905aef56b9417f5733f86c5" }),
  Object.freeze({ recordKey: "rules_sections:xLLTUyQm53B1KXj59oLs",
    title: "PART 6: THE SUPPLY SYSTEM",
    sourceRecordHash: "357eed9e3532c589c5e309959a5edda349debe1a4042bb5257b87fa0b75bcc3c",
    payloadHash: "cd86ffb67aa66cbba21d07f0c7a9a578d487a2770bac50f1d1c7d6122dbdff26" }),
  Object.freeze({ recordKey: "rules_sections:FuahgilWtc8nccVSp2Vv",
    title: "PART 11: KEYWORD GLOSSARY AND DEFINITIONS",
    sourceRecordHash: "985e79f70c48caf1b1085e620e92be23f5b4468ffe07fdc5f84cb01a28fa59b7",
    payloadHash: "4a6aa9e55e3b4197666b0f4fed633269dc42327af16f5b5a5422b7533d7d8973" }),
]);
const RULE_CLAUSES = Object.freeze([
  Object.freeze({ clauseId: "core:11:supply-value-current-model-count", section: "11",
    printedPage: 92, sourceTextHash:
      "1e6bb560d2d9aa22f163dc24952775f8bc5daf46e7be57f09c1f370cd84adffb" }),
  Object.freeze({ clauseId: "core:11:supply-value-rule-uses", section: "11",
    printedPage: 92, sourceTextHash:
      "9c0fca624301a1df0d910a8934fdb340541eb6c9bcf2d96064520acce91455d7" }),
  Object.freeze({ clauseId: "core:11:supply-value-starting-slots", section: "11",
    printedPage: 92, sourceTextHash:
      "8b66711f31d3ab05508ff68d5905ad9ce859239949f7168fe787f6bf87c40620" }),
  Object.freeze({ clauseId: "core:5.1:phase-boxes", section: "5.1",
    printedPage: 40, sourceTextHash:
      "27f5fa4774453447872477955e0b5c15890509a6844b152e28610050c2949c40" }),
  Object.freeze({ clauseId: "core:5.1:speed-null-value", section: "5.1",
    printedPage: 40, sourceTextHash:
      "b97636af6f920f8d204f1ab26113a35752a3527e414b5be9a961a4fd74563be2" }),
  Object.freeze({ clauseId: "core:5.1:supply-profile", section: "5.1",
    printedPage: 40, sourceTextHash:
      "30ff87d99c01cd6553073c5644f81a16871bdabd8f15dcd92a2fb408823890e1" }),
  Object.freeze({ clauseId: "core:5.2:base-diameter", section: "5.2",
    printedPage: 41, sourceTextHash:
      "af19286086357f2bf662c3fd105b924a3e01509534b95e88921f15e41c3390bd" }),
  Object.freeze({ clauseId: "core:5.2:combat-range", section: "5.2",
    printedPage: 41, sourceTextHash:
      "c81ea70872d621383cf7f1fc1b9ca415c9487cf432cdbafa2086353aadaa28f9" }),
  Object.freeze({ clauseId: "core:5.2:upgrade-side", section: "5.2",
    printedPage: 41, sourceTextHash:
      "4180cde50d504fee54c0e9400c5a3eaab95df1371dcd35d5316a09ac16a0eb6b" }),
  Object.freeze({ clauseId: "core:6.1:supply-profile", section: "6.1",
    printedPage: 46, sourceTextHash:
      "24b17513f1e9532e9b09fc602dd8a3ae868afb8b7b86d6f1a699bc59dc6667c5" }),
  Object.freeze({ clauseId: "core:5.2:army-slot", section: "5.2",
    printedPage: 41, sourceTextHash:
      "b350ba5f3054dd451120efb89eef6c893a49eb7a3db17e27693b634c33274934" }),
  Object.freeze({ clauseId: "core:5.1:faction-tag", section: "5.1",
    printedPage: 40, sourceTextHash:
      "dbf4b5d9217b7b88522339d82b3dba9409465e1a0b26eda85f107afce573912e" }),
]);

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
function positiveInteger(value, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) fail(code);
  return parsed;
}
function nonNegativeInteger(value, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) fail(code);
  return parsed;
}
function exactRuleSectionRecords(dataset) {
  return RULE_RECORDS.map((expected) => {
    const record = dataset.recordsByKey[expected.recordKey];
    const index = dataset.recordIndex.find((entry) => entry.recordKey === expected.recordKey);
    if (!object(record) || !object(index)
      || index.authorityDisposition !== "official_rule_prose_review_required"
      || record.payload?.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash) {
      fail("UNIT_CARD_SUPPLY_RULE_RECORD_DRIFT", expected.recordKey);
    }
    return { ...expected, authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions?.rulesVersion };
  });
}
function parseSpeed(value, recordKey) {
  const text = String(value || "").trim();
  if (text === "-") return { printedValue: "-", kind: "null", multiModelInches: null,
    singleModelInches: null, canMoveOrBeRepositioned: false };
  const match = text.match(/^(\d+)(?:\/(\d+))?$/u);
  if (!match) fail("UNIT_CARD_SUPPLY_SPEED_INVALID", recordKey);
  const first = positiveInteger(match[1], "UNIT_CARD_SUPPLY_SPEED_INVALID");
  const second = match[2]
    ? positiveInteger(match[2], "UNIT_CARD_SUPPLY_SPEED_INVALID") : first;
  return { printedValue: text, kind: match[2] ? "split" : "single",
    multiModelInches: first, singleModelInches: second,
    canMoveOrBeRepositioned: true };
}
function parseSupplyProfile(value, recordKey) {
  if (!Array.isArray(value) || value.length !== 3) {
    fail("UNIT_CARD_SUPPLY_PROFILE_INVALID", recordKey);
  }
  const tiers = value.map((row) => {
    const tier = positiveInteger(row?.tier, "UNIT_CARD_SUPPLY_TIER_INVALID");
    const printedModelCount = String(row?.modelCount || "").trim();
    const supply = nonNegativeInteger(row?.supply, "UNIT_CARD_SUPPLY_VALUE_INVALID");
    if (printedModelCount === "-") return { tier, printedModelCount, applicable: false,
      minimumModels: null, maximumModels: null, supply };
    const match = printedModelCount.match(/^(\d+)\s*-\s*(\d+)$/u);
    if (!match) fail("UNIT_CARD_SUPPLY_MODEL_RANGE_INVALID", recordKey);
    const minimumModels = positiveInteger(match[1], "UNIT_CARD_SUPPLY_MODEL_RANGE_INVALID");
    const maximumModels = positiveInteger(match[2], "UNIT_CARD_SUPPLY_MODEL_RANGE_INVALID");
    if (minimumModels > maximumModels) fail("UNIT_CARD_SUPPLY_MODEL_RANGE_INVALID", recordKey);
    return { tier, printedModelCount, applicable: true, minimumModels, maximumModels, supply };
  }).sort((left, right) => left.tier - right.tier);
  const active = tiers.filter((row) => row.applicable);
  for (const [index, row] of active.entries()) {
    const previous = active[index - 1];
    if (previous && row.minimumModels <= previous.maximumModels) {
      fail("UNIT_CARD_SUPPLY_PROFILE_OVERLAP", recordKey);
    }
  }
  return tiers;
}
function supplyFor(profile, currentModels, recordKey) {
  const row = profile.find((entry) => entry.applicable
    && currentModels >= entry.minimumModels && currentModels <= entry.maximumModels);
  if (!row) fail("UNIT_CARD_SUPPLY_COMPOSITION_UNMAPPED", recordKey);
  return row.supply;
}
function composition(value, kind, profile, recordKey) {
  if (!object(value)) fail("UNIT_CARD_SUPPLY_COMPOSITION_INVALID", recordKey);
  const models = nonNegativeInteger(value.models, "UNIT_CARD_SUPPLY_COMPOSITION_INVALID");
  const supply = nonNegativeInteger(value.supply, "UNIT_CARD_SUPPLY_COMPOSITION_INVALID");
  const cost = nonNegativeInteger(value.cost, "UNIT_CARD_SUPPLY_COMPOSITION_INVALID");
  if (models === 0) {
    if (supply !== 0 || cost !== 0) fail("UNIT_CARD_SUPPLY_COMPOSITION_INVALID", recordKey);
    return null;
  }
  if (supplyFor(profile, models, recordKey) !== supply) {
    fail("UNIT_CARD_SUPPLY_COMPOSITION_PROFILE_MISMATCH", recordKey);
  }
  return { kind, startingModels: models, startingSupply: supply, pointsCost: cost };
}
function phaseBoxes(upgrades, recordKey) {
  if (!Array.isArray(upgrades) || upgrades.length === 0) {
    fail("UNIT_CARD_SUPPLY_UPGRADES_INVALID", recordKey);
  }
  if (upgrades.some((entry) => !PHASES.includes(String(entry?.phase || "")))) {
    fail("UNIT_CARD_SUPPLY_PHASE_BOX_INVALID", recordKey);
  }
  return PHASES.map((phase) => {
    const definitions = upgrades.filter((entry) => entry.phase === phase);
    return { phase, definitionCount: definitions.length,
      definitionNames: definitions.map((entry) => String(entry.name || "").normalize("NFC")),
      definitionsHash: hashStarcraftTmgContract(definitions) };
  });
}
function compileProfiles(dataset, baseBundle) {
  const indexes = dataset.recordIndex.filter((entry) => (
    entry.recordType === "unit"
      && entry.authorityDisposition === "official_current_product_candidate"
  ));
  if (indexes.length !== 26) fail("UNIT_CARD_SUPPLY_UNIT_DENOMINATOR_DRIFT");
  const sourceIndex = [];
  const profiles = indexes.map((index) => {
    const record = getOfficialCurrentProductRecord(dataset, index.recordKey);
    const payload = record.payload;
    if (!object(payload) || record.sourceRecordHash !== index.sourceRecordHash
      || record.payloadHash !== index.payloadHash || !FACTIONS.has(payload.faction)) {
      fail("UNIT_CARD_SUPPLY_UNIT_RECORD_DRIFT", index.recordKey);
    }
    const supplyProfile = parseSupplyProfile(payload.squadProfile, index.recordKey);
    const unitType = String(payload.unitType || "");
    if (![...ARMY_SLOT_TYPES, "Other"].includes(unitType)) {
      fail("UNIT_CARD_SUPPLY_ARMY_SLOT_INVALID", index.recordKey);
    }
    const base = getOfficialModelBaseGeometryProfileV1(baseBundle, index.recordKey);
    const combatRangeText = String(payload.combatRange || "").trim();
    const combatRangeInches = combatRangeText === "-" ? null
      : positiveInteger(combatRangeText, "UNIT_CARD_SUPPLY_COMBAT_RANGE_INVALID");
    const compositions = [
      composition(payload.small, "small", supplyProfile, index.recordKey),
      composition(payload.large, "large", supplyProfile, index.recordKey),
    ].filter(Boolean);
    const body = {
      schema: "starcraft_tmg_official_unit_card_supply_profile_v1",
      recordKey: record.recordKey, sourceRecordHash: record.sourceRecordHash,
      payloadHash: record.payloadHash, unitId: String(payload.id || ""),
      unitName: String(payload.name || "").normalize("NFC"),
      factionTag: payload.faction, armySlotType: ARMY_SLOT_TYPES.includes(unitType)
        ? unitType : null, sourceUnitType: unitType,
      fieldableDuringArmyBuilding: ARMY_SLOT_TYPES.includes(unitType),
      speed: parseSpeed(payload.stats?.speed, index.recordKey),
      supplyProfile, compositions,
      phaseBoxes: phaseBoxes(payload.upgrades, index.recordKey),
      combatRange: { printedValue: combatRangeText, inches: combatRangeInches },
      base: { shape: base.baseShape,
        widthMillimetres: base.baseWidthMillimetres,
        depthMillimetres: base.baseDepthMillimetres,
        printedBase: base.printedBase,
        p2pSourceId: base.p2pSource.sourceId,
        p2pSourceContentHash: base.p2pSource.sourceContentHash },
      upgradeSide: { present: true, definitionCount: payload.upgrades.length,
        definitionsHash: hashStarcraftTmgContract(payload.upgrades) },
      rulesOwnedLayoutFields: ["faction_tag", "army_slot", "phase_boxes", "speed",
        "supply_profile", "base", "combat_range", "upgrade_side"],
      trainingTruth: false,
    };
    if (!body.unitId || !body.unitName || compositions.length === 0) {
      fail("UNIT_CARD_SUPPLY_UNIT_PROFILE_INVALID", index.recordKey);
    }
    sourceIndex.push({ recordKey: record.recordKey,
      sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash });
    return { ...body, profileHash: hashStarcraftTmgContract(body) };
  }).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  sourceIndex.sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  return { profiles, sourceIndex };
}

export function createOfficialUnitCardSupplyDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) fail("UNIT_CARD_SUPPLY_DATASET_INVALID");
  const baseBundle = createOfficialModelBaseGeometryDataBundleV1({ dataset });
  const compiled = compileProfiles(dataset, baseBundle);
  const audit = {
    unitCount: compiled.profiles.length,
    factionCounts: Object.fromEntries([...FACTIONS].map((faction) => [faction,
      compiled.profiles.filter((entry) => entry.factionTag === faction).length])),
    armySlotCounts: Object.fromEntries([...ARMY_SLOT_TYPES, "Other"].map((type) => [type,
      compiled.profiles.filter((entry) => entry.sourceUnitType === type).length])),
    nullSpeedCount: compiled.profiles.filter((entry) => entry.speed.kind === "null").length,
    splitSpeedCount: compiled.profiles.filter((entry) => entry.speed.kind === "split").length,
    singleSpeedCount: compiled.profiles.filter((entry) => entry.speed.kind === "single").length,
    nullCombatRangeCount: compiled.profiles.filter((entry) => (
      entry.combatRange.inches === null)).length,
    largeCompositionCount: compiled.profiles.filter((entry) => (
      entry.compositions.some((row) => row.kind === "large"))).length,
    upgradeDefinitionCount: compiled.profiles.reduce((sum, entry) => (
      sum + entry.upgradeSide.definitionCount), 0),
  };
  const expectedAudit = { unitCount: 26,
    factionCounts: { Protoss: 7, Terran: 7, Zerg: 12 },
    armySlotCounts: { Air: 0, Core: 10, Elite: 6, Hero: 3, Support: 3, Other: 4 },
    nullSpeedCount: 3, splitSpeedCount: 18, singleSpeedCount: 5,
    nullCombatRangeCount: 4, largeCompositionCount: 6, upgradeDefinitionCount: 183 };
  if (hashStarcraftTmgContract(audit) !== hashStarcraftTmgContract(expectedAudit)) {
    fail("UNIT_CARD_SUPPLY_AUDIT_DRIFT");
  }
  const body = {
    schema: OFFICIAL_UNIT_CARD_SUPPLY_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_UNIT_CARD_SUPPLY_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48", officialUnitsVersion: "71",
    ruleSectionRecords: exactRuleSectionRecords(dataset), ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    unitProfiles: compiled.profiles,
    unitProfileIndexHash: hashStarcraftTmgContract(compiled.profiles),
    unitSourceIndex: compiled.sourceIndex,
    unitSourceIndexHash: hashStarcraftTmgContract(compiled.sourceIndex),
    baseGeometryBundleHash: baseBundle.bundleHash,
    baseGeometryProfileIndexHash: hashStarcraftTmgContract(baseBundle.profiles),
    audit, armySlotTypes: ARMY_SLOT_TYPES, phaseBoxPhases: PHASES,
    supplyUses: ["deployment", "mission_marker_control", "scoring", "tactical_mass"],
    sourcePolicy: { captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
      commandCenterRole: "current_official_unit_characteristics_and_compositions",
      p2pRole: "current_official_base_shape_and_size_authority",
      pdfRole: "primary_normative_core_rules_source" },
    deferredRules: { fullArmyEligibility: "slice_102",
      migrationOfExistingSupplyConsumers: "future_versioned_executor_slices" },
    productionRoomEligible: false,
    rulesTruth: "official_unit_card_fields_and_current_model_count_supply_projection",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialUnitCardSupplyDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialUnitCardSupplyDataBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_UNIT_CARD_SUPPLY_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_UNIT_CARD_SUPPLY_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48" || bundle.officialUnitsVersion !== "71"
    || bundle.ruleSectionRecords?.length !== 3 || bundle.ruleClauses?.length !== 12
    || bundle.unitProfiles?.length !== 26 || bundle.audit?.nullSpeedCount !== 3
    || bundle.audit?.upgradeDefinitionCount !== 183
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(bundle.ruleClauses)
    || bundle.unitProfileIndexHash !== hashStarcraftTmgContract(bundle.unitProfiles)
    || bundle.unitSourceIndexHash !== hashStarcraftTmgContract(bundle.unitSourceIndex)
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("UNIT_CARD_SUPPLY_DATA_BUNDLE_INVALID");
  }
  const seen = new Set();
  for (const profile of bundle.unitProfiles) {
    if (!object(profile) || seen.has(profile.recordKey) || !FACTIONS.has(profile.factionTag)
      || ![...ARMY_SLOT_TYPES, null].includes(profile.armySlotType)
      || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]))) {
      fail("UNIT_CARD_SUPPLY_PROFILE_INVALID", String(profile?.recordKey || ""));
    }
    seen.add(profile.recordKey);
  }
  for (const expected of RULE_RECORDS) {
    const record = bundle.ruleSectionRecords.find((entry) => entry.recordKey === expected.recordKey);
    if (!object(record) || record.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash
      || record.authorityDisposition !== "official_rule_prose_review_required"
      || record.sourceVersion !== "48") {
      fail("UNIT_CARD_SUPPLY_RULE_RECORD_INVALID", expected.recordKey);
    }
  }
  return true;
}

export function getOfficialUnitCardSupplyProfileV1(bundle, recordKey) {
  verifyOfficialUnitCardSupplyDataBundleV1(bundle);
  const profile = bundle.unitProfiles.find((entry) => entry.recordKey === recordKey);
  if (!profile) fail("UNIT_CARD_SUPPLY_PROFILE_REQUIRED", String(recordKey || ""));
  return profile;
}
