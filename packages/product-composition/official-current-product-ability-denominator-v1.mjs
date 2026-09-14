import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";

export const OFFICIAL_CURRENT_PRODUCT_ABILITY_DENOMINATOR_SCHEMA =
  "starcraft_tmg_official_current_product_ability_denominator_v1";
export const OFFICIAL_CURRENT_PRODUCT_ABILITY_DENOMINATOR_VERSION = "1.9.0";

const DELIVERY_SLICE_BY_ADAPTER = Object.freeze({
  "starcraft-tmg-official-selected-roster-ability-runtime-v1": 229,
  "official-relocation-family-adapter-v1": 232,
  "official-characteristic-status-family-adapter-v1": 233,
  "official-ranged-family-adapter-v1": 234,
  "official-melee-family-adapter-v1": 235,
  "official-reaction-family-adapter-v1": 236,
  "official-battlefield-asset-family-adapter-v1": 237,
  "official-unit-lifecycle-family-adapter-v1": 238,
  "official-match-lifecycle-family-adapter-v1": 239,
  "official-terran-unique-family-adapter-v1": 240,
});

const OWNER_BY_SLICE = Object.freeze({
  232: Object.freeze({ ownerKind: "relocation_family",
    gate: "official-current-product-relocation-family-v1" }),
  233: Object.freeze({ ownerKind: "characteristic_status_family",
    gate: "official-current-product-characteristic-status-family-v1" }),
  234: Object.freeze({ ownerKind: "ranged_combat_family",
    gate: "official-current-product-ranged-family-v1" }),
  235: Object.freeze({ ownerKind: "melee_combat_family",
    gate: "official-current-product-melee-family-v1" }),
  236: Object.freeze({ ownerKind: "reaction_priority_family",
    gate: "official-current-product-reaction-family-v1" }),
  237: Object.freeze({ ownerKind: "battlefield_asset_family",
    gate: "official-current-product-battlefield-asset-family-v1" }),
  238: Object.freeze({ ownerKind: "unit_lifecycle_family",
    gate: "official-current-product-unit-lifecycle-family-v1" }),
  239: Object.freeze({ ownerKind: "match_lifecycle_family",
    gate: "official-current-product-match-lifecycle-family-v1" }),
  240: Object.freeze({ ownerKind: "terran_unique_gap",
    gate: "official-current-product-terran-gap-v1" }),
  241: Object.freeze({ ownerKind: "zerg_unique_gap",
    gate: "official-current-product-zerg-gap-v1" }),
  242: Object.freeze({ ownerKind: "protoss_unique_gap",
    gate: "official-current-product-protoss-gap-v1" }),
});
const EXPECTED_VERSIONS = Object.freeze({
  unitsVersion: "71", cardsVersion: "69", rulesVersion: "48",
});
const EXPECTED_ACTIVATION = Object.freeze({
  active: 87, passive: 90, reaction: 24, weapon: 51,
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) {
  return freezeDeep({ ...body, [field]: hashStarcraftTmgContract(body) });
}
function raceKind(value) {
  const faction = String(value || "").toLowerCase();
  if (faction.includes("terran")) return "terran";
  if (faction.includes("zerg") || faction.includes("kerrigan")) return "zerg";
  if (faction.includes("protoss")) return "protoss";
  fail("CURRENT_PRODUCT_ABILITY_FACTION_UNOWNED", String(value || ""));
}
function ownerSlice(definition) {
  const families = new Set(definition.effectFamilies);
  if (definition.runtimeRole === "reaction") return 236;
  if (definition.activationKind === "weapon") {
    return definition.phase === "combat" ? 235 : 234;
  }
  if (families.has("unit_lifecycle")) return 238;
  if (families.has("battlefield_asset")) return 237;
  if (definition.runtimeRole === "system_lifecycle"
    && families.has("match_lifecycle")) return 239;
  if (families.has("relocation")) return 232;
  if (families.has("characteristic_status")) return 233;
  if (families.has("ranged_combat")) return 234;
  if (families.has("melee_combat")) return 235;
  if (definition.runtimeRole === "system_lifecycle") return 239;
  return { terran: 240, zerg: 241, protoss: 242 }[raceKind(definition.faction)];
}
function primaryFamily(slice) {
  return {
    232: "relocation", 233: "characteristic_status", 234: "ranged_combat",
    235: "melee_combat", 236: "reaction_priority", 237: "battlefield_asset",
    238: "unit_lifecycle", 239: "match_lifecycle", 240: "terran_unique",
    241: "zerg_unique", 242: "protoss_unique",
  }[slice];
}
function deliverySlice(definition) {
  if (definition.execution.status !== "executable_exact") return null;
  const slice = DELIVERY_SLICE_BY_ADAPTER[definition.execution.adapterId];
  if (!Number.isSafeInteger(slice)) {
    fail("CURRENT_PRODUCT_ABILITY_DELIVERY_ADAPTER_UNOWNED",
      definition.execution.adapterId);
  }
  return slice;
}
function counts(rows, selector) {
  const result = {};
  for (const row of rows) {
    const key = String(selector(row));
    result[key] = Number(result[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => (
    left.localeCompare(right, "en", { numeric: true }))));
}
function records(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const list = byKey.get(row.recordKey) || [];
    list.push(row);
    byKey.set(row.recordKey, list);
  }
  return [...byKey.entries()].map(([recordKey, definitions]) => freezeDeep({
    recordKey,
    sourceProductKind: definitions[0].sourceProductKind,
    sourceName: definitions[0].sourceName,
    faction: definitions[0].faction,
    definitionCount: definitions.length,
    executableExact: definitions.filter((entry) => (
      entry.implementationStatus === "executable_exact")).length,
    pendingFamilyAdapter: definitions.filter((entry) => (
      entry.implementationStatus === "pending_family_adapter")).length,
    plannedOwnerSlices: [...new Set(definitions.map((entry) => (
      entry.plannedOwnerSlice)))].sort((left, right) => left - right),
    definitionIds: definitions.map((entry) => entry.definitionId).sort(),
  })).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
}

export function createOfficialCurrentProductAbilityDenominatorV1(input = {}) {
  const catalogue = input.catalogue;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const definitions = catalogue.definitions.map((definition) => {
    const plannedOwnerSlice = ownerSlice(definition);
    const owner = OWNER_BY_SLICE[plannedOwnerSlice];
    const exact = definition.execution.status === "executable_exact";
    const body = {
      schema: "starcraft_tmg_official_product_ability_obligation_v1",
      semanticVersion: OFFICIAL_CURRENT_PRODUCT_ABILITY_DENOMINATOR_VERSION,
      definitionId: definition.definitionId,
      definitionHash: definition.definitionHash,
      sourceFeatureHash: definition.sourceFeatureHash,
      recordKey: definition.recordKey,
      sourceProductKind: definition.sourceProductKind,
      sourceName: definition.sourceName,
      definitionName: definition.definitionName,
      faction: definition.faction,
      race: raceKind(definition.faction),
      activationKind: definition.activationKind,
      runtimeRole: definition.runtimeRole,
      phase: definition.phase,
      effectFamilies: [...definition.effectFamilies],
      costByComposition: definition.costByComposition
        ? { ...definition.costByComposition } : null,
      activationText: definition.activationText,
      sourceText: definition.sourceText,
      primaryEffectFamily: primaryFamily(plannedOwnerSlice),
      plannedOwnerSlice,
      plannedOwnerKind: owner.ownerKind,
      requiredGate: owner.gate,
      implementationStatus: definition.execution.status,
      runtimeAdapterId: definition.execution.adapterId,
      runtimeAdapterVersion: definition.execution.adapterVersion,
      deliveredBySlice: deliverySlice(definition),
      deliveryRequiredFromSlice: exact ? null : plannedOwnerSlice,
      mayBecomeExecutableOnlyThroughExactAdapter: true,
      trainingTruth: false,
    };
    return seal(body, "obligationHash");
  }).sort((left, right) => left.definitionId.localeCompare(right.definitionId));
  const sourceRecords = records(definitions);
  const gapDefinitions = definitions.filter((entry) => (
    entry.implementationStatus === "pending_family_adapter"));
  const exactDefinitions = definitions.filter((entry) => (
    entry.implementationStatus === "executable_exact"));
  const ownershipEdges = definitions.map((entry) => freezeDeep({
    edgeId: hashStarcraftTmgContract({ definitionId: entry.definitionId,
      plannedOwnerSlice: entry.plannedOwnerSlice }).slice(0, 24),
    from: entry.definitionId,
    relation: "planned_for",
    to: `ticket-23-slice-${entry.plannedOwnerSlice}`,
    implementationStatus: entry.implementationStatus,
  }));
  const summary = freezeDeep({
    sourceRecordCount: sourceRecords.length,
    unitRecordCount: sourceRecords.filter((entry) => (
      entry.sourceProductKind === "unit")).length,
    factionCardRecordCount: sourceRecords.filter((entry) => (
      entry.sourceProductKind === "faction_card")).length,
    tacticalCardRecordCount: sourceRecords.filter((entry) => (
      entry.sourceProductKind === "tactical_card")).length,
    totalDefinitions: definitions.length,
    recognizedDefinitions: definitions.length,
    executableExact: exactDefinitions.length,
    pendingFamilyAdapter: gapDefinitions.length,
    unsupportedExplicit: 0,
    byActivationKind: counts(definitions, (entry) => entry.activationKind),
    byRuntimeRole: counts(definitions, (entry) => entry.runtimeRole),
    bySourceProductKind: counts(definitions, (entry) => entry.sourceProductKind),
    byRace: counts(definitions, (entry) => entry.race),
    byFaction: counts(definitions, (entry) => entry.faction),
    byPlannedOwnerSlice: counts(definitions, (entry) => entry.plannedOwnerSlice),
    pendingByOwnerSlice: counts(gapDefinitions, (entry) => entry.plannedOwnerSlice),
  });
  const body = {
    schema: OFFICIAL_CURRENT_PRODUCT_ABILITY_DENOMINATOR_SCHEMA,
    semanticVersion: OFFICIAL_CURRENT_PRODUCT_ABILITY_DENOMINATOR_VERSION,
    sourceIrSemanticVersion: catalogue.semanticVersion,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    definitions,
    sourceRecords,
    gapDefinitionIds: gapDefinitions.map((entry) => entry.definitionId),
    exactDefinitionIds: exactDefinitions.map((entry) => entry.definitionId),
    ownershipGraph: freezeDeep({
      schema: "starcraft_tmg_official_product_ability_ownership_graph_v1",
      edgeCount: ownershipEdges.length,
      edges: ownershipEdges,
      singlePrimaryOwnerPerDefinition: true,
      trainingTruth: false,
    }),
    summary,
    closureContract: freezeDeep({
      finalClosureSlice: 243,
      requiredDefinitionCount: 252,
      requiredExecutableExact: 252,
      requiredPending: 0,
      requiredUnsupported: 0,
      allDefinitionsRequireAnExecutionRole: true,
      noSilentOmission: true,
    }),
    compatibilityAuthority: "semantic_versions_and_explicit_adapters",
    contentHashesAreLineageNotRuntimeCompatibilityGates: true,
    sourceRefreshPerformed: false,
    harnessLoopUsed: true,
    rulesTruth: "official_current_product_ability_delivery_denominator",
    trainingTruth: false,
  };
  const denominator = seal(body, "denominatorHash");
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  return denominator;
}

export function verifyOfficialCurrentProductAbilityDenominatorV1(denominator) {
  const summary = denominator?.summary;
  const rows = denominator?.definitions;
  const gaps = new Set(denominator?.gapDefinitionIds || []);
  const exact = new Set(denominator?.exactDefinitionIds || []);
  if (!object(denominator)
    || denominator.schema !== OFFICIAL_CURRENT_PRODUCT_ABILITY_DENOMINATOR_SCHEMA
    || denominator.semanticVersion
      !== OFFICIAL_CURRENT_PRODUCT_ABILITY_DENOMINATOR_VERSION
    || hashStarcraftTmgContract(denominator.dataVersions)
      !== hashStarcraftTmgContract(EXPECTED_VERSIONS)
    || !Array.isArray(rows) || rows.length !== 252
    || new Set(rows.map((entry) => entry.definitionId)).size !== 252
    || summary?.sourceRecordCount !== 63 || summary.unitRecordCount !== 26
    || summary.factionCardRecordCount !== 6 || summary.tacticalCardRecordCount !== 31
    || summary.totalDefinitions !== 252
    || summary.recognizedDefinitions !== 252 || summary.unsupportedExplicit !== 0
    || hashStarcraftTmgContract(summary.byActivationKind)
      !== hashStarcraftTmgContract(EXPECTED_ACTIVATION)
    || summary.executableExact + summary.pendingFamilyAdapter !== 252
    || gaps.size !== summary.pendingFamilyAdapter
    || exact.size !== summary.executableExact
    || [...gaps].some((id) => exact.has(id))
    || rows.some((entry) => entry.implementationStatus === "pending_family_adapter"
      ? !gaps.has(entry.definitionId) : !exact.has(entry.definitionId))
    || rows.some((entry) => !OWNER_BY_SLICE[entry.plannedOwnerSlice]
      || entry.deliveryRequiredFromSlice !== (
        entry.implementationStatus === "pending_family_adapter"
          ? entry.plannedOwnerSlice : null)
      || entry.deliveredBySlice !== (
        entry.implementationStatus === "executable_exact"
          ? DELIVERY_SLICE_BY_ADAPTER[entry.runtimeAdapterId] : null)
      || entry.mayBecomeExecutableOnlyThroughExactAdapter !== true
      || entry.obligationHash !== hashStarcraftTmgContract(without(entry,
        ["obligationHash"])) || entry.trainingTruth !== false)
    || denominator.sourceRecords?.length !== 63
    || denominator.sourceRecords.some((record) => record.definitionCount <= 0)
    || denominator.ownershipGraph?.edgeCount !== 252
    || denominator.ownershipGraph?.edges?.length !== 252
    || denominator.ownershipGraph?.singlePrimaryOwnerPerDefinition !== true
    || new Set(denominator.ownershipGraph?.edges?.map((entry) => (
      entry.from))).size !== 252
    || denominator.closureContract?.finalClosureSlice !== 243
    || denominator.closureContract?.requiredDefinitionCount !== 252
    || denominator.closureContract?.requiredExecutableExact !== 252
    || denominator.closureContract?.requiredPending !== 0
    || denominator.closureContract?.requiredUnsupported !== 0
    || denominator.contentHashesAreLineageNotRuntimeCompatibilityGates !== true
    || denominator.sourceRefreshPerformed !== false
    || denominator.harnessLoopUsed !== true || denominator.trainingTruth !== false
    || denominator.denominatorHash !== hashStarcraftTmgContract(without(denominator,
      ["denominatorHash"]))) {
    fail("CURRENT_PRODUCT_ABILITY_DENOMINATOR_INVALID");
  }
  return true;
}

export function listOfficialCurrentProductAbilityGapsV1(denominator, filter = {}) {
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  const gapIds = new Set(denominator.gapDefinitionIds);
  return denominator.definitions.filter((entry) => gapIds.has(entry.definitionId)
    && (!filter.faction || entry.faction === filter.faction)
    && (!filter.race || entry.race === filter.race)
    && (!filter.plannedOwnerSlice
      || entry.plannedOwnerSlice === Number(filter.plannedOwnerSlice))
    && (!filter.runtimeRole || entry.runtimeRole === filter.runtimeRole));
}
