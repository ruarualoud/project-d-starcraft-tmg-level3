import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { verifyOfficialAbilityEffectRuntimeDescriptorV1 } from
  "./official-ability-effect-runtime-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";

export const OFFICIAL_CURRENT_PRODUCT_ABILITY_COVERAGE_RELEASE_SCHEMA =
  "starcraft_tmg_official_current_product_ability_coverage_release_v1";
export const OFFICIAL_CURRENT_PRODUCT_ABILITY_COVERAGE_RELEASE_VERSION = "1.0.0";

const EXPECTED_DELIVERY_COUNTS = Object.freeze({
  "official-battlefield-asset-family-adapter-v1": 30,
  "official-characteristic-status-family-adapter-v1": 60,
  "official-match-lifecycle-family-adapter-v1": 2,
  "official-melee-family-adapter-v1": 40,
  "official-protoss-unique-family-adapter-v1": 4,
  "official-ranged-family-adapter-v1": 30,
  "official-reaction-family-adapter-v1": 24,
  "official-relocation-family-adapter-v1": 25,
  "official-terran-unique-family-adapter-v1": 4,
  "official-unit-lifecycle-family-adapter-v1": 11,
  "official-zerg-unique-family-adapter-v1": 2,
  "starcraft-tmg-official-selected-roster-ability-runtime-v1": 20,
});
const EXPECTED_OWNER_COUNTS = Object.freeze({
  232: 28, 233: 65, 234: 30, 235: 42, 236: 24, 237: 37,
  238: 12, 239: 2, 240: 5, 241: 3, 242: 4,
});
const EXPECTED_ROLE_COUNTS = Object.freeze({
  action: 138, automatic_consumer: 51, reaction: 24, system_lifecycle: 39,
});
const PENDING_ADAPTER_ID = "official-ability-pending-family-adapter-v1";

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
function counts(rows, selector) {
  const result = {};
  for (const row of rows) {
    const key = String(selector(row));
    result[key] = Number(result[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => (
    left.localeCompare(right, "en", { numeric: true }))));
}
function coverageRows(definitions, selector, deliveryKind) {
  const groups = new Map();
  for (const definition of definitions) {
    const key = String(selector(definition));
    const rows = groups.get(key) || [];
    rows.push(definition);
    groups.set(key, rows);
  }
  return [...groups.entries()].map(([key, rows]) => freezeDeep({
    key, definitionCount: rows.length,
    definitionIds: rows.map((entry) => entry.definitionId).sort(),
    sourceFeatureHashes: rows.map((entry) => entry.sourceFeatureHash).sort(),
    exactCount: rows.filter((entry) => entry.implementationStatus
      === "executable_exact").length,
    deliveryKind, trainingTruth: false,
  })).sort((left, right) => left.key.localeCompare(
    right.key, "en", { numeric: true }));
}

export function createOfficialCurrentProductAbilityCoverageReleaseV1(input = {}) {
  const { catalogue, denominator, runtimeDescriptor } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  verifyOfficialAbilityEffectRuntimeDescriptorV1(runtimeDescriptor);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash
    || runtimeDescriptor.catalogueHash !== catalogue.catalogueHash) {
    fail("CURRENT_PRODUCT_ABILITY_RELEASE_CATALOGUE_DRIFT");
  }
  const definitions = denominator.definitions;
  const deliveryCounts = counts(definitions, (entry) => entry.runtimeAdapterId);
  const ownerCounts = counts(definitions, (entry) => entry.plannedOwnerSlice);
  const roleCounts = counts(definitions, (entry) => entry.runtimeRole);
  const exactAdapterIds = runtimeDescriptor.adapterIds.filter((entry) => (
    entry !== PENDING_ADAPTER_ID)).sort();
  if (!isDeepStrictEqual(deliveryCounts, EXPECTED_DELIVERY_COUNTS)
    || !isDeepStrictEqual(ownerCounts, EXPECTED_OWNER_COUNTS)
    || !isDeepStrictEqual(roleCounts, EXPECTED_ROLE_COUNTS)
    || !isDeepStrictEqual(exactAdapterIds, Object.keys(EXPECTED_DELIVERY_COUNTS).sort())
    || definitions.some((entry) => entry.implementationStatus !== "executable_exact"
      || !entry.runtimeAdapterId || !entry.runtimeAdapterVersion
      || !entry.deliveredBySlice || entry.deliveryRequiredFromSlice !== null)
    || new Set(definitions.map((entry) => entry.definitionId)).size !== 252
    || new Set(definitions.map((entry) => entry.sourceFeatureHash)).size !== 252) {
    fail("CURRENT_PRODUCT_ABILITY_RELEASE_COVERAGE_INVALID");
  }
  const adapterCoverage = coverageRows(
    definitions, (entry) => entry.runtimeAdapterId, "runtime_adapter");
  const ownerCoverage = coverageRows(
    definitions, (entry) => entry.plannedOwnerSlice, "planned_owner_slice");
  const roleCoverage = coverageRows(
    definitions, (entry) => entry.runtimeRole, "execution_role");
  const body = {
    schema: OFFICIAL_CURRENT_PRODUCT_ABILITY_COVERAGE_RELEASE_SCHEMA,
    semanticVersion: OFFICIAL_CURRENT_PRODUCT_ABILITY_COVERAGE_RELEASE_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    sourceRuntimeHash: runtimeDescriptor.runtimeHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    definitionCount: 252, recognizedDefinitionCount: 252,
    executableExactDefinitionCount: 252,
    pendingFamilyDefinitionCount: 0, unsupportedDefinitionCount: 0,
    unclassifiedDefinitionCount: 0, silentOmissionCount: 0,
    exactAdapterCount: exactAdapterIds.length,
    exactAdapterIds, adapterCoverage, ownerCoverage, roleCoverage,
    deliveryCounts, ownerCounts, roleCounts,
    executionRoleSetComplete: true,
    singlePrimaryOwnerPerDefinition: true,
    singleDeliveryAdapterPerDefinition: true,
    pendingAdapterRetainedAsEmptyDiagnosticLane: true,
    productionRoomEligibleByAbilityCoverage: true,
    finalAcceptanceScale: freezeDeep({ scale: "Standard",
      mineralBudgetPerSide: 2000, maximumVespenePerSide: 200,
      battlefieldWidthInches: 54, battlefieldHeightInches: 36 }),
    referenceFixtureIsNotFinalAcceptance: true,
    sourceRefreshPerformed: false, harnessLoopUsed: true,
    rulesTruth: "official_current_product_ability_coverage_release",
    trainingTruth: false,
  };
  const release = freezeDeep({ ...body,
    releaseHash: hashStarcraftTmgContract(body) });
  verifyOfficialCurrentProductAbilityCoverageReleaseV1(release);
  return release;
}

export function verifyOfficialCurrentProductAbilityCoverageReleaseV1(release) {
  if (!object(release)
    || release.schema !== OFFICIAL_CURRENT_PRODUCT_ABILITY_COVERAGE_RELEASE_SCHEMA
    || release.semanticVersion
      !== OFFICIAL_CURRENT_PRODUCT_ABILITY_COVERAGE_RELEASE_VERSION
    || release.definitionCount !== 252 || release.recognizedDefinitionCount !== 252
    || release.executableExactDefinitionCount !== 252
    || release.pendingFamilyDefinitionCount !== 0
    || release.unsupportedDefinitionCount !== 0
    || release.unclassifiedDefinitionCount !== 0 || release.silentOmissionCount !== 0
    || release.exactAdapterCount !== 12 || release.exactAdapterIds?.length !== 12
    || release.adapterCoverage?.length !== 12 || release.ownerCoverage?.length !== 11
    || release.roleCoverage?.length !== 4
    || !isDeepStrictEqual(release.deliveryCounts, EXPECTED_DELIVERY_COUNTS)
    || !isDeepStrictEqual(release.ownerCounts, EXPECTED_OWNER_COUNTS)
    || !isDeepStrictEqual(release.roleCounts, EXPECTED_ROLE_COUNTS)
    || release.executionRoleSetComplete !== true
    || release.singlePrimaryOwnerPerDefinition !== true
    || release.singleDeliveryAdapterPerDefinition !== true
    || release.pendingAdapterRetainedAsEmptyDiagnosticLane !== true
    || release.productionRoomEligibleByAbilityCoverage !== true
    || !isDeepStrictEqual(release.finalAcceptanceScale, {
      scale: "Standard", mineralBudgetPerSide: 2000, maximumVespenePerSide: 200,
      battlefieldWidthInches: 54, battlefieldHeightInches: 36 })
    || release.referenceFixtureIsNotFinalAcceptance !== true
    || release.sourceRefreshPerformed !== false || release.harnessLoopUsed !== true
    || release.trainingTruth !== false
    || release.releaseHash !== hashStarcraftTmgContract(without(release,
      ["releaseHash"]))) {
    fail("CURRENT_PRODUCT_ABILITY_COVERAGE_RELEASE_INVALID");
  }
  return true;
}
