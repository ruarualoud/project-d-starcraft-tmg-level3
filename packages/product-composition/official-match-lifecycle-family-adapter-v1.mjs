import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { evaluateOfficialBaseMeasurementV1 } from
  "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";

export const OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_ID =
  "official-match-lifecycle-family-adapter-v1";
export const OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_MATCH_LIFECYCLE_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_match_lifecycle_family_source_bundle_v1";

const QUEEN_RECORD_KEY = "army_units:queen";
const STALKER_RECORD_KEY = "army_units:stalker";
const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  activated_target_particle_disruptors_instant: 1,
  queen_psionic_link_biomass_discount: 1,
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
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
function normalized(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function activeModels(piece) {
  return (piece?.models || []).filter((model) => model?.isOnField !== false
    && model?.isDestroyed !== true);
}
function fieldedFeature(piece, route) {
  const selected = new Set((piece?.selectedUpgradeNames || []).map(normalized));
  const equipment = new Set((piece?.equipment || []).map((entry) => normalized(
    entry.equipmentName || entry.name)).filter(Boolean));
  const cost = piece?.compositionKind === "large"
    ? Number(route.costByComposition?.large || 0)
    : Number(route.costByComposition?.small || 0);
  return cost === 0 || selected.has(normalized(route.abilityName))
    || equipment.has(normalized(route.abilityName));
}
function routeBase(definition, spec) {
  return {
    schema: "starcraft_tmg_official_match_lifecycle_definition_route_v1",
    semanticVersion: OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    definitionId: definition.definitionId,
    sourceFeatureHash: definition.sourceFeatureHash,
    recordKey: definition.recordKey,
    sourceKind: definition.sourceKind,
    sourceProductKind: definition.sourceProductKind,
    sourceName: definition.sourceName,
    abilityName: definition.definitionName,
    activationKind: definition.activationKind,
    runtimeRole: definition.runtimeRole,
    phase: definition.phase,
    timingHooks: [...definition.timingHooks],
    activationText: definition.activationText,
    costByComposition: definition.costByComposition
      ? { ...definition.costByComposition } : null,
    sourceText: definition.sourceText,
    ...spec,
    exactSourcePatternCompiled: true,
    arbitraryProseExecutionClaimed: false,
    trainingTruth: false,
  };
}
function compileRoute(definition) {
  const name = definition.definitionName;
  const text = definition.sourceText;
  let spec = null;
  if (name === "Fury of the Nerazim" && definition.recordKey === STALKER_RECORD_KEY
    && /Enemy Unit that has already been Activated during this Phase.+Particle Disruptors gain INSTANT/isu
      .test(text)) {
    spec = { effectKind: "activated_target_particle_disruptors_instant",
      weaponName: "Particle Disruptors", requiredTargetActivatedThisPhase: true,
      grantsKeyword: "INSTANT", effectDuration: "this_attack" };
  } else if (name === "Psionic Link" && definition.recordKey === QUEEN_RECORD_KEY
    && /at least 7 Friendly models Within 6.+BM cost reduced by 1/isu.test(text)) {
    spec = { effectKind: "queen_psionic_link_biomass_discount",
      rangeMilliInches: 6000, requiredFriendlyModelCount: 7,
      resourceTypeAffected: "BM", resourceCostReduction: 1,
      minimumResourceCost: 0, oncePerRound: true,
      appliesToSourceUnitSpecialAbilitiesOnly: true };
  }
  if (!spec) {
    fail("MATCH_LIFECYCLE_DEFINITION_COMPILER_UNRECOGNIZED",
      `${definition.recordKey}:${name}`);
  }
  return seal(routeBase(definition, spec), "routeHash");
}

export function createOfficialMatchLifecycleFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("MATCH_LIFECYCLE_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pending = new Set(denominator.gapDefinitionIds);
  const owned = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 239 && pending.has(entry.definitionId)));
  const definitions = owned.map((entry) => catalogue.definitions.find((candidate) => (
    candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 2 || definitions.some((entry) => !entry)) {
    fail("MATCH_LIFECYCLE_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(compileRoute).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_MATCH_LIFECYCLE_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    routeCount: routes.length,
    archetypeCounts,
    routes,
    definitionIds: routes.map((entry) => entry.definitionId),
    coveredSourceFeatureHashes: routes.map((entry) => entry.sourceFeatureHash).sort(),
    compilerDenominatorComplete: true,
    exactSourcePatternsRequired: true,
    lowerKernelContractsReused: ["model_base_geometry", "card_build_payment"],
    matchPhaseStateReadFromAuthority: true,
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_match_lifecycle_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialMatchLifecycleFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialMatchLifecycleFamilySourceBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_MATCH_LIFECYCLE_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 2 || bundle.routes?.length !== 2
    || new Set(bundle.definitionIds || []).size !== 2
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 2
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 2
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.lowerKernelContractsReused?.length !== 2
    || bundle.matchPhaseStateReadFromAuthority !== true
    || bundle.compilerDenominatorComplete !== true
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("MATCH_LIFECYCLE_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialMatchLifecycleFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialMatchLifecycleFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    capability: "automatic_consumer",
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function routeFor(bundle, effectKind) {
  const route = bundle.routes.find((entry) => entry.effectKind === effectKind);
  if (!route) fail("MATCH_LIFECYCLE_ROUTE_MISSING", effectKind);
  return route;
}
function friendlyModelsWithin(state, sourcePiece, rangeMilliInches) {
  const sourceModels = activeModels(sourcePiece);
  const rows = (state.pieces || []).filter((piece) => (
    piece.sideKey === sourcePiece.sideKey && activePiece(piece))).flatMap((piece) => (
    activeModels(piece).map((model) => {
      const minimumDistanceMilliInches = Math.min(...sourceModels.map((sourceModel) => (
        evaluateOfficialBaseMeasurementV1({ state,
          dataBundle: state.officialModelBaseGeometryDataBundle,
          source: { kind: "model", unitId: sourcePiece.id, modelId: sourceModel.id },
          target: { kind: "model", unitId: piece.id, modelId: model.id },
        }).distanceMilliInches)));
      return { pieceId: piece.id, modelId: model.id, minimumDistanceMilliInches,
        within: minimumDistanceMilliInches <= rangeMilliInches };
    })
  ));
  return rows.sort((left, right) => left.pieceId.localeCompare(right.pieceId)
    || left.modelId.localeCompare(right.modelId));
}
function psionicLinkUsed(state, route, pieceId) {
  return (state.matchLifecycleUseHistory || []).some((entry) => (
    Number(entry.round) === Number(state.round) && entry.definitionId === route.definitionId
      && entry.sourcePieceId === pieceId));
}

export function projectOfficialMatchLifecycleFamilyModifiersV1(
  bundle, state, request = {}, options = {},
) {
  verifyOfficialMatchLifecycleFamilySourceBundleV1(bundle);
  const piece = (state.pieces || []).find((entry) => entry.id === request.pieceId);
  const target = (state.pieces || []).find((entry) => entry.id === request.targetPieceId);
  const fury = routeFor(bundle, "activated_target_particle_disruptors_instant");
  const psionic = routeFor(bundle, "queen_psionic_link_biomass_discount");
  const weaponName = normalized(request.weaponName);
  const furyApplies = activePiece(piece) && piece.officialUnitRecordKey === fury.recordKey
    && fieldedFeature(piece, fury)
    && activePiece(target) && target.sideKey !== piece.sideKey
    && state.phase === "assault" && target.activatedPhases?.[state.phase] === true
    && weaponName === normalized(fury.weaponName);
  const printedResourceCost = Math.max(0, Number(request.printedResourceCost || 0));
  const resourceType = String(request.resourceType || "").toUpperCase();
  const nearbyModels = activePiece(piece) && piece.officialUnitRecordKey === psionic.recordKey
    ? friendlyModelsWithin(state, piece, psionic.rangeMilliInches) : [];
  const nearbyFriendlyModelCount = nearbyModels.filter((entry) => entry.within).length;
  const psionicApplies = activePiece(piece) && piece.officialUnitRecordKey === psionic.recordKey
    && resourceType === psionic.resourceTypeAffected && printedResourceCost > 0
    && nearbyFriendlyModelCount >= psionic.requiredFriendlyModelCount
    && !psionicLinkUsed(state, psionic, piece.id);
  const resourceCostReduction = psionicApplies ? psionic.resourceCostReduction : 0;
  const result = freezeDeep({
    schema: "starcraft_tmg_official_match_lifecycle_projection_v1",
    pieceId: piece?.id || null,
    targetPieceId: target?.id || null,
    weaponName: request.weaponName || null,
    instant: furyApplies,
    instantSourceDefinitionId: furyApplies ? fury.definitionId : null,
    targetActivatedThisPhase: Boolean(target?.activatedPhases?.[state.phase]),
    resourceType,
    printedResourceCost,
    resourceCostReduction,
    effectiveResourceCost: Math.max(psionic.minimumResourceCost,
      printedResourceCost - resourceCostReduction),
    discountSourceDefinitionId: psionicApplies ? psionic.definitionId : null,
    discountSourcePieceId: psionicApplies ? piece.id : null,
    nearbyFriendlyModelCount,
    requiredFriendlyModelCount: psionic.requiredFriendlyModelCount,
    nearbyFriendlyModels: nearbyModels.filter((entry) => entry.within),
    psionicLinkAvailable: psionicApplies,
    rulesTruth: "official_current_product_match_lifecycle_projection",
    trainingTruth: false,
  });
  if (psionicApplies && options.consume === true) {
    state.matchLifecycleUseHistory = state.matchLifecycleUseHistory || [];
    state.matchLifecycleUseHistory.push({ round: Number(state.round), phase: state.phase,
      sideKey: piece.sideKey, sourcePieceId: piece.id,
      definitionId: psionic.definitionId, effectKind: psionic.effectKind,
      resourceType, printedResourceCost,
      effectiveResourceCost: result.effectiveResourceCost,
      planHash: request.planHash || null, trainingTruth: false });
  }
  return result;
}

export function resolveOfficialMatchLifecycleAbilityResourceCostV1(
  bundle, state, request = {}, options = {},
) {
  return projectOfficialMatchLifecycleFamilyModifiersV1(
    bundle, state, request, options,
  );
}

function legalSpace(bundle) {
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_match_lifecycle_legal_space_v1",
    runtimeId: OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    candidates: [], parameterDomains: [], diagnostics: [],
    automaticConsumerDefinitionIds: bundle.definitionIds,
    automaticConsumersDoNotCreatePlayerActions: true,
    rulesAuthority: true, trainingTruth: false,
  });
}
function query(bundle, state, request = {}) {
  const queryKind = String(request.queryKind || request.kind || "");
  let result;
  if (queryKind === "definition_routes") {
    result = { routes: clone(bundle.routes), routeCount: bundle.routeCount };
  } else if (queryKind === "match_lifecycle_projection") {
    result = projectOfficialMatchLifecycleFamilyModifiersV1(bundle, state, request);
  } else {
    fail("MATCH_LIFECYCLE_QUERY_KIND_UNSUPPORTED", queryKind);
  }
  return seal({ schema: "starcraft_tmg_official_match_lifecycle_query_v1",
    semanticVersion: "1.0.0", queryKind, precision: "exact", result,
    source: OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialMatchLifecycleFamilyAdapterV1(bundle) {
  verifyOfficialMatchLifecycleFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_MATCH_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime", coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "query"],
    archetypeCounts: { ...bundle.archetypeCounts }, sourceBundleHash: bundle.bundleHash,
    phaseActivationAndFullBaseGeometryOwnedByRules: true,
    automaticConsumersDoNotCreatePlayerActions: true,
    rulesAuthority: true, trainingTruth: false,
  });
  return freezeDeep({ descriptor,
    legalSpace: () => legalSpace(bundle),
    query: (state, request = {}) => query(bundle, state, request),
  });
}
