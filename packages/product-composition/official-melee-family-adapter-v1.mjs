import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { verifyOfficialAttackProfileCatalogueV2 } from
  "../source-data/official-attack-profile-catalogue-v2.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";
import {
  applyOfficialSelectedRosterMeleeActionV1,
  enumerateOfficialSelectedRosterMeleeActionsV1,
  previewOfficialSelectedRosterMeleeActionV1,
  queryOfficialSelectedRosterMeleeActionV1,
} from "./official-selected-roster-melee-action-runtime-v1.mjs";
import { projectOfficialMeleeFamilyModifiersV1 } from
  "./official-melee-family-projection-v1.mjs";

export const OFFICIAL_MELEE_FAMILY_ADAPTER_ID =
  "official-melee-family-adapter-v1";
export const OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_MELEE_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_melee_family_source_bundle_v1";
export const OFFICIAL_MELEE_FAMILY_PARAMETER_KIND =
  "official_melee_family_parameter_v1";

const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  devastating_charge: 11,
  impact_model_bonus: 1,
  weapon: 28,
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
function baseRoute(definition, spec) {
  return seal({
    schema: "starcraft_tmg_official_melee_family_definition_route_v1",
    semanticVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
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
  }, "routeHash");
}
function compileRoute(definition, attackCatalogue) {
  const name = definition.definitionName;
  const text = definition.sourceText;
  if (definition.activationKind === "weapon") {
    const profileKey = `${definition.recordKey}::${definition.phase}::${name}`;
    const profile = attackCatalogue.profilesByProfileKey?.[profileKey];
    if (!profile || profile.phase !== "combat" || profile.range.kind !== "engagement"
      || profile.sourceTextHash !== hashStarcraftTmgContract(text)) {
      fail("MELEE_FAMILY_WEAPON_SOURCE_PROFILE_MISMATCH", profileKey);
    }
    return baseRoute(definition, { effectKind: "weapon",
      actionKind: "authoritative_action", profileKey,
      sourceProfileHash: profile.profileHash,
      weaponEffects: clone(profile.effects) });
  }
  const impact = text.match(/resolve the IMPACT \((\d+)\) (\d)\+ effect\./iu);
  if (name === "Devastating Charge" && impact) {
    return baseRoute(definition, { effectKind: "devastating_charge",
      actionKind: "system_lifecycle",
      trigger: "after_successful_charge",
      impactDicePerEligibleModel: Number(impact[1]),
      hitThreshold: Number(impact[2]), damage: 1, surge: null });
  }
  if (name === "My Life for Aiur"
    && /each eligible model generates 1 additional IMPACT die/iu.test(text)) {
    return baseRoute(definition, { effectKind: "impact_model_bonus",
      actionKind: "automatic_consumer",
      additionalImpactDicePerEligibleModel: 1 });
  }
  fail("MELEE_FAMILY_SOURCE_PATTERN_UNKNOWN", `${definition.recordKey}:${name}`);
}

export function createOfficialMeleeFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator, attackProfileCatalogueV2 } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  verifyOfficialAttackProfileCatalogueV2(attackProfileCatalogueV2);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("MELEE_FAMILY_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pending = new Set(denominator.gapDefinitionIds);
  const owned = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 235 && pending.has(entry.definitionId)));
  const definitions = owned.map((entry) => catalogue.definitions.find((candidate) => (
    candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 40 || definitions.some((entry) => !entry)) {
    fail("MELEE_FAMILY_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map((definition) => compileRoute(
    definition, attackProfileCatalogueV2)).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_MELEE_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    attackProfileCatalogueHash: attackProfileCatalogueV2.catalogueHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    routeCount: routes.length,
    archetypeCounts,
    routes,
    definitionIds: routes.map((entry) => entry.definitionId),
    coveredSourceFeatureHashes: routes.map((entry) => entry.sourceFeatureHash).sort(),
    weaponProfileCount: routes.filter((entry) => entry.effectKind === "weapon").length,
    compilerDenominatorComplete: true,
    exactSourcePatternsRequired: true,
    arbitraryProseExecutionClaimed: false,
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_melee_family_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialMeleeFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialMeleeFamilySourceBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_MELEE_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 40 || bundle.routes?.length !== 40
    || bundle.weaponProfileCount !== 28
    || new Set(bundle.definitionIds || []).size !== 40
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 40
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 40
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.compilerDenominatorComplete !== true
    || bundle.exactSourcePatternsRequired !== true
    || bundle.arbitraryProseExecutionClaimed !== false
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("MELEE_FAMILY_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialMeleeFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialMeleeFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_MELEE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
    capability: route.actionKind === "authoritative_action"
      ? "authoritative_action" : route.runtimeRole,
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function sourceRoute(bundle, state, inner) {
  if (inner.actionType === "fight") {
    return bundle.routes.find((entry) => entry.profileKey === inner.profileKey) || null;
  }
  if (inner.actionType === "resolve_impact") {
    return bundle.routes.find((entry) => entry.definitionId
      === state.pendingAction?.sourceDefinitionId) || null;
  }
  return null;
}
function outerDomain(bundle, state, inner) {
  const route = sourceRoute(bundle, state, inner);
  if (inner.actionType === "fight" && !route) {
    fail("MELEE_FAMILY_DOMAIN_SOURCE_ROUTE_MISSING", inner.profileKey);
  }
  return seal({
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
    parameterKind: OFFICIAL_MELEE_FAMILY_PARAMETER_KIND,
    actionType: inner.actionType,
    sideKey: inner.sideKey, phase: inner.phase, pieceId: inner.pieceId,
    profileKey: inner.profileKey || null,
    weaponName: inner.weaponName || null,
    definitionId: route?.definitionId || state.pendingAction?.sourceDefinitionId || null,
    sourceFeatureHash: route?.sourceFeatureHash
      || state.pendingAction?.sourceFeatureHash || null,
    sourceRouteHash: route?.routeHash || null,
    sourceBindingKind: route ? "owner_235_exact_definition"
      : inner.actionType === "resolve_impact" ? "prior_exact_definition"
        : "core_action",
    executorId: OFFICIAL_MELEE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
    parameterSchema: clone(inner.parameterSchema),
    constraints: { delegateDomain: clone(inner),
      delegateDomainId: inner.domainId, sourceBundleHash: bundle.bundleHash },
    confirmationClass: inner.confirmationClass,
    rulesTruth: "official_current_product_melee_family_parameter_domain",
    trainingTruth: false,
  }, "domainId");
}
function enumerate(bundle, state, options = {}) {
  const inner = enumerateOfficialSelectedRosterMeleeActionsV1(state, options);
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_melee_family_legal_space_v1",
    runtimeId: OFFICIAL_MELEE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
    candidates: inner.candidates.map((entry) => ({ ...clone(entry),
      executorId: OFFICIAL_MELEE_FAMILY_ADAPTER_ID,
      executorVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION })),
    parameterDomains: inner.parameterDomains.map((entry) => outerDomain(bundle, state, entry)),
    currentProductMeleeDefinitionDenominatorComplete: true,
    coreChargeActionsExposedWithoutPretendingTheyAreCardDefinitions: true,
    searchAndStrategyExcludedFromAuthority: true,
    trainingTruth: false,
  });
}
function currentDomain(bundle, state, domain) {
  const current = enumerate(bundle, state, { sideKey: domain?.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => entry.domainId === domain?.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("MELEE_FAMILY_PARAMETER_DOMAIN_STALE");
  }
  return current;
}
function canonicalParametersFor(action) {
  if (action.chargePlan) return {
    leadingModelId: action.chargePlan.leadingModelId,
    targets: clone(action.chargePlan.targets),
  };
  if (action.chargeResolutionPlan) {
    return clone(action.chargeResolutionPlan.canonicalParameters);
  }
  if (action.actionType === "resolve_impact") {
    return { allocations: clone(action.modelAllocations) };
  }
  return clone(action.meleePlan.canonicalParameters);
}
function preview(bundle, state, request = {}) {
  const domain = currentDomain(bundle, state, request.domain);
  const delegated = previewOfficialSelectedRosterMeleeActionV1(
    state, domain.constraints.delegateDomain, request.parameters || {});
  const canonicalParameters = canonicalParametersFor(delegated.action);
  const action = freezeDeep({
    actionType: delegated.action.actionType,
    sideKey: delegated.action.sideKey, phase: delegated.action.phase,
    pieceId: delegated.action.pieceId,
    weaponName: delegated.action.weaponName || null,
    definitionId: domain.definitionId,
    meleeFamilyPlan: seal({
      schema: "starcraft_tmg_official_melee_family_plan_v1",
      semanticVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
      domainId: domain.domainId,
      sourceBundleHash: bundle.bundleHash,
      sourceRouteHash: domain.sourceRouteHash,
      sourceFeatureHash: domain.sourceFeatureHash,
      delegateDomainId: domain.constraints.delegateDomainId,
      delegateAction: clone(delegated.action),
      canonicalParameters,
      rulesTruth: "official_current_product_melee_family_plan",
      trainingTruth: false,
    }, "planHash"),
    executorId: OFFICIAL_MELEE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
  });
  return seal({
    schema: "starcraft_tmg_official_melee_family_preview_v1",
    semanticVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
    action, actionHash: hashStarcraftTmgContract(action),
    chance: clone(delegated.chance), mutationApplied: false,
    rulesAuthority: true, trainingTruth: false,
  }, "previewHash");
}
function apply(bundle, stateInput, request = {}) {
  const action = request.action;
  if (!object(action) || action.executorId !== OFFICIAL_MELEE_FAMILY_ADAPTER_ID
    || action.executorVersion !== OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION
    || action.meleeFamilyPlan?.sourceBundleHash !== bundle.bundleHash) {
    fail("MELEE_FAMILY_ACTION_INVALID");
  }
  const domain = enumerate(bundle, stateInput, { sideKey: action.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => (
    entry.domainId === action.meleeFamilyPlan.domainId));
  if (!domain) fail("MELEE_FAMILY_PARAMETER_DOMAIN_STALE");
  const current = preview(bundle, stateInput, { domain,
    parameters: action.meleeFamilyPlan.canonicalParameters });
  if (!isDeepStrictEqual(current.action, action)) fail("MELEE_FAMILY_ACTION_STALE");
  const inner = applyOfficialSelectedRosterMeleeActionV1(
    stateInput, action.meleeFamilyPlan.delegateAction, request.options || {});
  const state = clone(inner.state);
  if (state.log?.length > 0) state.log[state.log.length - 1].action = clone(action);
  return freezeDeep({ ...clone(inner),
    schemaVersion: "starcraft_tmg_official_melee_family_transition_v1",
    runtimeId: OFFICIAL_MELEE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
    state: freezeDeep(state), action: clone(action),
    rulesTruth: "official_current_product_melee_family_transition",
    trainingTruth: false });
}
function query(bundle, state, request = {}) {
  const queryKind = String(request.queryKind || request.kind || "");
  if (queryKind === "definition_routes") return seal({
    schema: "starcraft_tmg_official_melee_family_query_v1",
    semanticVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
    queryKind, precision: "exact",
    result: { routes: clone(bundle.routes), routeCount: bundle.routeCount },
    source: OFFICIAL_MELEE_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false,
  }, "queryReceiptHash");
  if (queryKind === "melee_family_projection") return seal({
    schema: "starcraft_tmg_official_melee_family_query_v1",
    semanticVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
    queryKind, precision: "exact",
    result: projectOfficialMeleeFamilyModifiersV1(bundle, state, request),
    source: OFFICIAL_MELEE_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false,
  }, "queryReceiptHash");
  const domain = enumerate(bundle, state, { sideKey: request.sideKey
    || state.activeSideKey, includeDisabled: true }).parameterDomains.find((entry) => (
    entry.domainId === request.domainId));
  if (!domain) fail("MELEE_FAMILY_QUERY_DOMAIN_STALE");
  if (queryKind === "instantiate_parameterized_action") {
    const result = preview(bundle, state, { domain, parameters: request.parameters || {} });
    return seal({ schema: "starcraft_tmg_official_melee_family_query_v1",
      semanticVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
      queryKind, precision: "exact", result: { preview: result, action: result.action },
      source: OFFICIAL_MELEE_FAMILY_ADAPTER_ID,
      rulesAuthority: true, mutationAuthority: false,
      sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
  }
  const delegated = queryOfficialSelectedRosterMeleeActionV1({ state, request: {
    ...clone(request), domainId: domain.constraints.delegateDomainId,
  } });
  return seal({ schema: "starcraft_tmg_official_melee_family_query_v1",
    semanticVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
    queryKind, precision: "exact", result: delegated.result,
    source: OFFICIAL_MELEE_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialMeleeFamilyAdapterV1(bundle) {
  verifyOfficialMeleeFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_MELEE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_MELEE_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime",
    coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "replay"],
    archetypeCounts: { ...bundle.archetypeCounts },
    sourceBundleHash: bundle.bundleHash,
    allCurrentProductMeleeProfilesBound: true,
    perModelImpactGenerationAndAllocationExact: true,
    sharedConsumerProjectionSeam: true,
    legalSpacePreviewApplyReplaySequencePreserved: true,
    rulesAuthority: true,
    trainingTruth: false,
  });
  return freezeDeep({ descriptor,
    legalSpace: (state, options = {}) => enumerate(bundle, state, options),
    preview: (state, request = {}) => preview(bundle, state, request),
    apply: (state, request = {}) => apply(bundle, state, request),
    query: (state, request = {}) => query(bundle, state, request),
  });
}
