import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { verifyOfficialAttackProfileCatalogueV1 } from
  "../source-data/official-attack-profile-catalogue-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";
import {
  OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE,
  applyOfficialSelectedRosterRangedActionV1,
  enumerateOfficialSelectedRosterRangedActionsV1,
  finishOfficialSelectedRosterRangedSequenceV1,
  previewOfficialSelectedRosterRangedActionV1,
} from "./official-selected-roster-ranged-action-runtime-v1.mjs";
import { projectOfficialRangedFamilyModifiersV1 } from
  "./official-ranged-family-projection-v1.mjs";

export const OFFICIAL_RANGED_FAMILY_ADAPTER_ID =
  "official-ranged-family-adapter-v1";
export const OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_RANGED_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_ranged_family_source_bundle_v1";
export const OFFICIAL_RANGED_FAMILY_PARAMETER_KIND =
  "official_ranged_family_target_v1";

const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  grenades_frag: 2,
  long_range_override: 2,
  medpack_model_bonus: 1,
  optical_flare_range: 1,
  point_defense_laser: 1,
  weapon: 23,
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
  const body = {
    schema: "starcraft_tmg_official_ranged_family_definition_route_v1",
    semanticVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
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
  return seal(body, "routeHash");
}
function compileRoute(definition, attackCatalogue) {
  const name = definition.definitionName;
  const text = definition.sourceText;
  if (definition.activationKind === "weapon") {
    const profileKey = `${definition.recordKey}::${definition.phase}::${name}`;
    const profile = attackCatalogue.profilesByProfileKey?.[profileKey];
    if (!profile || profile.sourceTextHash !== hashStarcraftTmgContract(text)) {
      fail("RANGED_FAMILY_WEAPON_SOURCE_PROFILE_MISMATCH", profileKey);
    }
    return baseRoute(definition, {
      effectKind: "weapon", actionKind: "authoritative_action",
      profileKey, sourceProfileHash: profile.profileHash,
      weaponEffects: clone(profile.effects),
    });
  }
  if (name === "A-13 Flash Grenade Launcher"
    && /Optical Flare special ability's Range to 16/iu.test(text)) {
    return baseRoute(definition, { effectKind: "optical_flare_range",
      actionKind: "automatic_consumer", abilityScope: "Optical Flare",
      rangeMilliInches: 16000 });
  }
  if (name === "Grenades - Frag"
    && /C-14 Rifle.+Within 8.+S Dice is replaced by D6/iu.test(text)) {
    return baseRoute(definition, { effectKind: "grenades_frag",
      actionKind: "system_lifecycle", weaponScope: "C-14 rifle",
      maximumDistanceInches: 8, surgeDiceOverride: "D6" });
  }
  if (["Grooved Spines", "Laser Targeting Systems"].includes(name)
    && /gains LONG RANGE \((16)"\)/iu.test(text)) {
    return baseRoute(definition, { effectKind: "long_range_override",
      actionKind: "automatic_consumer",
      weaponScope: name === "Grooved Spines" ? "Needle Spines" : "Quad K12",
      maximumRangeInches: 16 });
  }
  if (name === "Point Defense Laser"
    && /another Friendly Unit Within 4.+without the INSTANT keyword.+remove up to 2 dice/iu
      .test(text)) {
    return baseRoute(definition, { effectKind: "point_defense_laser",
      actionKind: "defender_choice_consumer", rangeMilliInches: 4000,
      attackPoolDiceRemoved: 2, instantWeaponsExcluded: true,
      removeSourceAfterResolution: true });
  }
  if (name === "Stabilizer Medpacks"
    && /Life Support or Medpack.+1 additional model Within Range/iu.test(text)) {
    return baseRoute(definition, { effectKind: "medpack_model_bonus",
      actionKind: "system_lifecycle", abilityScopes: ["Life Support", "Medpack"],
      additionalModelsWithinRange: 1 });
  }
  fail("RANGED_FAMILY_SOURCE_PATTERN_UNKNOWN", `${definition.recordKey}:${name}`);
}

export function createOfficialRangedFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator, attackProfileCatalogue } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  verifyOfficialAttackProfileCatalogueV1(attackProfileCatalogue);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("RANGED_FAMILY_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pending = new Set(denominator.gapDefinitionIds);
  const owned = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 234 && pending.has(entry.definitionId)));
  const definitions = owned.map((entry) => catalogue.definitions.find((candidate) => (
    candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 30 || definitions.some((entry) => !entry)) {
    fail("RANGED_FAMILY_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map((definition) => compileRoute(
    definition, attackProfileCatalogue)).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_RANGED_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    attackProfileCatalogueHash: attackProfileCatalogue.catalogueHash,
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
    rulesTruth: "official_current_product_ranged_family_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialRangedFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialRangedFamilySourceBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_RANGED_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 30 || bundle.routes?.length !== 30
    || bundle.weaponProfileCount !== 23
    || new Set(bundle.definitionIds || []).size !== 30
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 30
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 30
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.compilerDenominatorComplete !== true
    || bundle.exactSourcePatternsRequired !== true
    || bundle.arbitraryProseExecutionClaimed !== false
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("RANGED_FAMILY_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialRangedFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialRangedFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
    capability: route.actionKind === "authoritative_action"
      ? "authoritative_action" : route.runtimeRole,
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function outerDomain(bundle, inner) {
  const route = bundle.routes.find((entry) => entry.profileKey === inner.profileKey);
  if (!route) fail("RANGED_FAMILY_DOMAIN_SOURCE_ROUTE_MISSING", inner.profileKey);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
    parameterKind: OFFICIAL_RANGED_FAMILY_PARAMETER_KIND,
    actionType: inner.actionType,
    sideKey: inner.sideKey,
    phase: inner.phase,
    pieceId: inner.pieceId,
    profileKey: inner.profileKey,
    weaponName: inner.weaponName,
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceRouteHash: route.routeHash,
    executorId: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
    parameterSchema: clone(inner.parameterSchema),
    constraints: { delegateDomain: clone(inner),
      delegateDomainId: inner.domainId, sourceBundleHash: bundle.bundleHash },
    confirmationClass: inner.confirmationClass,
    rulesTruth: "official_current_product_ranged_family_parameter_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function enumerate(bundle, state, options = {}) {
  const inner = enumerateOfficialSelectedRosterRangedActionsV1(state, options);
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_ranged_family_legal_space_v1",
    runtimeId: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
    candidates: inner.candidates.map((entry) => entry.actionType
      === OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE
      ? { ...clone(entry), delegateAction: clone(entry),
        executorId: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
        executorVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION }
      : { ...clone(entry), executorId: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
        executorVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION }),
    parameterDomains: inner.parameterDomains.map((entry) => outerDomain(bundle, entry)),
    queryOnlyDefinitionIds: bundle.routes.filter((entry) => entry.effectKind !== "weapon")
      .map((entry) => entry.definitionId).sort(),
    currentProductRangedDenominatorComplete: true,
    searchAndStrategyExcludedFromAuthority: true,
    trainingTruth: false,
  });
}
function currentDomain(bundle, state, domain) {
  const current = enumerate(bundle, state, { sideKey: domain?.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => entry.domainId === domain?.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("RANGED_FAMILY_PARAMETER_DOMAIN_STALE");
  }
  return current;
}
function preview(bundle, state, request = {}) {
  const domain = currentDomain(bundle, state, request.domain);
  const delegated = previewOfficialSelectedRosterRangedActionV1(
    state, domain.constraints.delegateDomain, request.parameters || {});
  const action = freezeDeep({
    actionType: delegated.action.actionType,
    sideKey: delegated.action.sideKey,
    phase: delegated.action.phase,
    pieceId: delegated.action.pieceId,
    targetId: delegated.action.targetId,
    weaponName: delegated.action.weaponName,
    definitionId: domain.definitionId,
    rangedFamilyPlan: seal({
      schema: "starcraft_tmg_official_ranged_family_plan_v1",
      semanticVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
      domainId: domain.domainId,
      sourceBundleHash: bundle.bundleHash,
      sourceRouteHash: domain.sourceRouteHash,
      sourceFeatureHash: domain.sourceFeatureHash,
      delegateDomainId: domain.constraints.delegateDomainId,
      delegateAction: clone(delegated.action),
      canonicalParameters: clone(delegated.action.rangedPlan.canonicalParameters),
      rulesTruth: "official_current_product_ranged_family_plan",
      trainingTruth: false,
    }, "planHash"),
    executorId: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
  });
  return seal({
    schema: "starcraft_tmg_official_ranged_family_preview_v1",
    semanticVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
    action,
    actionHash: hashStarcraftTmgContract(action),
    chance: clone(delegated.chance),
    eligibleAttackerModelIds: clone(delegated.eligibleAttackerModelIds),
    visibleTargetModelIds: clone(delegated.visibleTargetModelIds),
    mutationApplied: false,
    rulesAuthority: true,
    trainingTruth: false,
  }, "previewHash");
}
function apply(bundle, stateInput, request = {}) {
  const action = request.action;
  if (object(action)
    && action.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE) {
    if (action.executorId !== OFFICIAL_RANGED_FAMILY_ADAPTER_ID
      || action.executorVersion !== OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION
      || !object(action.delegateAction)) {
      fail("RANGED_FAMILY_FINISH_ACTION_INVALID");
    }
    const current = enumerate(bundle, stateInput, { sideKey: action.sideKey,
      includeDisabled: true }).candidates.find((entry) => (
      entry.isEnabled === true
        && entry.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE));
    if (!current || !isDeepStrictEqual(current, action)) {
      fail("RANGED_FAMILY_FINISH_ACTION_STALE");
    }
    const inner = finishOfficialSelectedRosterRangedSequenceV1(
      stateInput, action.delegateAction, request.options || {});
    const state = clone(inner.state);
    if (state.log?.length > 0) state.log[state.log.length - 1].action = clone(action);
    return freezeDeep({ ...clone(inner),
      schemaVersion: "starcraft_tmg_official_ranged_family_finish_transition_v1",
      runtimeId: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
      runtimeVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
      state: freezeDeep(state), action: clone(action),
      rulesTruth: "official_current_product_ranged_family_sequence_finish",
      trainingTruth: false });
  }
  if (!object(action) || action.executorId !== OFFICIAL_RANGED_FAMILY_ADAPTER_ID
    || action.executorVersion !== OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION
    || action.rangedFamilyPlan?.sourceBundleHash !== bundle.bundleHash) {
    fail("RANGED_FAMILY_ACTION_INVALID");
  }
  const domain = enumerate(bundle, stateInput, { sideKey: action.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => (
    entry.domainId === action.rangedFamilyPlan.domainId));
  if (!domain) fail("RANGED_FAMILY_PARAMETER_DOMAIN_STALE");
  const current = preview(bundle, stateInput, { domain,
    parameters: action.rangedFamilyPlan.canonicalParameters });
  if (!isDeepStrictEqual(current.action, action)) fail("RANGED_FAMILY_ACTION_STALE");
  const inner = applyOfficialSelectedRosterRangedActionV1(
    stateInput, action.rangedFamilyPlan.delegateAction, request.options || {});
  const state = clone(inner.state);
  if (state.log?.length > 0) state.log[state.log.length - 1].action = clone(action);
  return freezeDeep({ ...clone(inner),
    schemaVersion: "starcraft_tmg_official_ranged_family_transition_v1",
    runtimeId: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
    state: freezeDeep(state), action: clone(action),
    rulesTruth: "official_current_product_ranged_family_transition",
    trainingTruth: false });
}
function query(bundle, state, request = {}) {
  const queryKind = String(request.queryKind || request.kind || "");
  if (queryKind === "definition_routes") return seal({
    schema: "starcraft_tmg_official_ranged_family_query_v1",
    semanticVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
    queryKind, precision: "exact",
    result: { routes: clone(bundle.routes), routeCount: bundle.routeCount },
    source: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false,
  }, "queryReceiptHash");
  if (queryKind === "ranged_family_projection") return seal({
    schema: "starcraft_tmg_official_ranged_family_query_v1",
    semanticVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
    queryKind, precision: "exact",
    result: projectOfficialRangedFamilyModifiersV1(bundle, state, request),
    source: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false,
  }, "queryReceiptHash");
  if (queryKind !== "instantiate_parameterized_action") {
    fail("RANGED_FAMILY_QUERY_KIND_UNSUPPORTED", queryKind);
  }
  const domain = enumerate(bundle, state, { sideKey: request.sideKey
    || state.activeSideKey, includeDisabled: true }).parameterDomains.find((entry) => (
    entry.domainId === request.domainId));
  if (!domain) fail("RANGED_FAMILY_QUERY_DOMAIN_STALE");
  const result = preview(bundle, state, { domain, parameters: request.parameters || {} });
  return seal({ schema: "starcraft_tmg_official_ranged_family_query_v1",
    semanticVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
    queryKind, precision: "exact", result: { preview: result, action: result.action },
    source: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialRangedFamilyAdapterV1(bundle) {
  verifyOfficialRangedFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_RANGED_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_RANGED_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime",
    coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "replay"],
    archetypeCounts: { ...bundle.archetypeCounts },
    sourceBundleHash: bundle.bundleHash,
    allCurrentProductRangedProfilesBound: true,
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
