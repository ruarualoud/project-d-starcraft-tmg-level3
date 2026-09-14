import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { projectOfficialContextualSupplyValueV1 } from
  "../rule-atoms/official-contextual-supply-projection-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";

export const OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_ID =
  "official-terran-unique-family-adapter-v1";
export const OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_TERRAN_UNIQUE_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_terran_unique_family_source_bundle_v1";
export const OFFICIAL_TERRAN_UNIQUE_FAMILY_PARAMETER_KIND =
  "official_terran_unique_family_plan_v1";

const ACTIVE_EFFECTS = new Set(["mission_supply_bonus_active"]);
const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  commander_supply_bonus: 1,
  mission_supply_bonus_active: 1,
  mission_supply_floor: 1,
  supply_pool_zero: 1,
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
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && piece?.isStructure !== true && Number(piece?.currentModels || 0) > 0;
}
function routeBase(definition, spec) {
  return {
    schema: "starcraft_tmg_official_contextual_supply_route_v1",
    semanticVersion: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_VERSION,
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
  if (name === "Advanced Medic Facilities"
    && /Supply Value counts as 0 when calculating the Supply Pool/iu.test(text)) {
    spec = { effectKind: "supply_pool_zero",
      contexts: ["supply_pool_calculation"], replacementSupply: 0 };
  } else if (name === "Commander" && definition.recordKey === "army_units:jim_raynor"
    && /increased by 1 for Controlling and Contesting Mission Markers.+completing objectives.+Disengage checks/isu.test(text)) {
    spec = { effectKind: "commander_supply_bonus",
      contexts: ["disengage_check", "mission_marker_control", "objective_completion"],
      modifier: 1 };
  } else if (name === "Freedom Fighters"
    && /all Friendly Units Within 8.+cannot be reduced below 1.+Contesting Mission Markers.+completing objectives/isu.test(text)) {
    spec = { effectKind: "mission_supply_floor",
      contexts: ["mission_marker_control", "objective_completion"],
      rangeMilliInches: 8000, minimumSupply: 1 };
  } else if (name === "Additional Supply Depots"
    && /active Unit.+Supply Value is improved by 1.+Controlling and Contesting Mission Markers.+completing objectives/isu.test(text)) {
    spec = { effectKind: "mission_supply_bonus_active",
      contexts: ["mission_marker_control", "objective_completion"],
      modifier: 1, effectExpiresAt: "round_end", oncePerRound: true };
  }
  if (!spec) fail("TERRAN_UNIQUE_DEFINITION_COMPILER_UNRECOGNIZED",
    `${definition.recordKey}:${name}`);
  return seal(routeBase(definition, spec), "routeHash");
}

export function createOfficialTerranUniqueFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("TERRAN_UNIQUE_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pending = new Set(denominator.gapDefinitionIds);
  const definitions = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 240 && pending.has(entry.definitionId)))
    .map((entry) => catalogue.definitions.find((candidate) => (
      candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 4 || definitions.some((entry) => !entry)) {
    fail("TERRAN_UNIQUE_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(compileRoute).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_TERRAN_UNIQUE_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    routeCount: routes.length, archetypeCounts, routes,
    definitionIds: routes.map((entry) => entry.definitionId),
    coveredSourceFeatureHashes: routes.map((entry) => entry.sourceFeatureHash).sort(),
    compilerDenominatorComplete: true, exactSourcePatternsRequired: true,
    contextSpecificSupplyNeverMutatesCurrentSupply: true,
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_terran_unique_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialTerranUniqueFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialTerranUniqueFamilySourceBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_TERRAN_UNIQUE_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 4 || bundle.routes?.length !== 4
    || new Set(bundle.definitionIds || []).size !== 4
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 4
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 4
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.contextSpecificSupplyNeverMutatesCurrentSupply !== true
    || bundle.compilerDenominatorComplete !== true
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("TERRAN_UNIQUE_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialTerranUniqueFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialTerranUniqueFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_VERSION,
    capability: ACTIVE_EFFECTS.has(route.effectKind)
      ? "authoritative_action" : "automatic_consumer",
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function used(state, route, pieceId) {
  return (state.terranUniqueUseHistory || []).some((entry) => (
    Number(entry.round) === Number(state.round) && entry.definitionId === route.definitionId
      && entry.pieceId === pieceId));
}
function actionRoute(bundle) {
  return bundle.routes.find((entry) => entry.effectKind === "mission_supply_bonus_active");
}
function enumerate(bundle, state, options = {}) {
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  const route = actionRoute(bundle);
  const cards = (state.cardResources?.[sideKey] || []).filter((card) => (
    card.officialCardRecordKey === route.recordKey && card.readiness === "ready"));
  const window = state.selectedRosterActivationWindow;
  const actors = (state.pieces || []).filter((piece) => piece.sideKey === sideKey
    && activePiece(piece) && state.phase === "movement" && state.activeSideKey === sideKey
    && state.players?.[sideKey]?.passedPhases?.movement !== true
    && piece.activatedPhases?.movement !== true
    && (!window || (window.sideKey === sideKey && window.pieceId === piece.id
      && window.phase === "movement")) && !used(state, route, piece.id));
  const domains = cards.flatMap((card) => actors.map((piece) => seal({
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_TERRAN_UNIQUE_FAMILY_PARAMETER_KIND,
    actionType: "resolve_terran_unique_ability", sideKey, phase: "movement",
    pieceId: piece.id, sourceInstanceId: card.cardInstanceId,
    definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    abilityName: route.abilityName, effectKind: route.effectKind,
    parameterSchema: { type: "object", required: ["activeUnitId"],
      activeUnitId: { const: piece.id } },
    constraints: { sourceRouteHash: route.routeHash,
      contexts: clone(route.contexts), modifier: route.modifier,
      expiresAt: route.effectExpiresAt, oncePerRoundPerUnitAndName: true },
    executorId: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_VERSION,
    confirmationClass: "rules_owned_direct_action",
    rulesTruth: "official_current_product_terran_unique_parameter_domain",
    trainingTruth: false,
  }, "domainId")));
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_terran_unique_legal_space_v1",
    runtimeId: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_VERSION,
    candidates: [], parameterDomains: domains.sort((left, right) => (
      left.domainId.localeCompare(right.domainId))), diagnostics: [],
    automaticConsumerDefinitionIds: bundle.routes.filter((entry) => (
      !ACTIVE_EFFECTS.has(entry.effectKind))).map((entry) => entry.definitionId).sort(),
    rulesAuthority: true, trainingTruth: false,
  });
}
function instantiate(bundle, state, domain, parameters = {}) {
  const current = enumerate(bundle, state, { sideKey: domain?.sideKey })
    .parameterDomains.find((entry) => entry.domainId === domain?.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) fail("TERRAN_UNIQUE_DOMAIN_STALE");
  if (!object(parameters) || parameters.activeUnitId !== domain.pieceId
    || Object.keys(parameters).some((key) => key !== "activeUnitId")) {
    fail("TERRAN_UNIQUE_PARAMETERS_INVALID");
  }
  const canonicalParameters = { activeUnitId: domain.pieceId };
  const plan = seal({ schema: "starcraft_tmg_official_terran_unique_plan_v1",
    semanticVersion: "1.0.0", domainId: domain.domainId,
    definitionId: domain.definitionId, sourceFeatureHash: domain.sourceFeatureHash,
    sourceInstanceId: domain.sourceInstanceId, sideKey: domain.sideKey,
    pieceId: domain.pieceId, effectKind: domain.effectKind,
    canonicalParameters, sourceRouteHash: domain.constraints.sourceRouteHash,
    rulesTruth: "official_current_product_terran_unique_plan",
    trainingTruth: false }, "planHash");
  const action = freezeDeep({ actionType: domain.actionType, sideKey: domain.sideKey,
    phase: state.phase, pieceId: domain.pieceId, definitionId: domain.definitionId,
    abilityName: domain.abilityName, effectKind: domain.effectKind,
    terranUniquePlan: plan, executorId: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_current_product_terran_unique_instantiation",
    trainingTruth: false });
}
function preview(bundle, state, request = {}) {
  const result = instantiate(bundle, state, request.domain, request.parameters || {});
  return seal({ schema: "starcraft_tmg_official_terran_unique_preview_v1",
    semanticVersion: "1.0.0", action: result.action,
    actionHash: hashStarcraftTmgContract(result.action), mutationApplied: false,
    rulesAuthority: true, trainingTruth: false }, "previewHash");
}
function apply(bundle, stateInput, request = {}) {
  const action = request.action;
  const domain = enumerate(bundle, stateInput, { sideKey: action?.sideKey })
    .parameterDomains.find((entry) => entry.domainId === action?.terranUniquePlan?.domainId);
  if (!domain) fail("TERRAN_UNIQUE_DOMAIN_STALE");
  const expected = instantiate(bundle, stateInput, domain,
    action.terranUniquePlan.canonicalParameters);
  if (!isDeepStrictEqual(expected.action, action)) fail("TERRAN_UNIQUE_ACTION_STALE");
  const state = clone(stateInput);
  const route = actionRoute(bundle);
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  const card = state.cardResources[action.sideKey].find((entry) => (
    entry.cardInstanceId === action.terranUniquePlan.sourceInstanceId));
  if (!card || card.readiness !== "ready") fail("TERRAN_UNIQUE_SOURCE_CARD_NOT_READY");
  card.readiness = "exhausted";
  const effect = seal({ schema: "starcraft_tmg_official_contextual_supply_effect_v1",
    effectKind: "contextual_supply_bonus", sourceDefinitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash, sourceCardInstanceId: card.cardInstanceId,
    targetPieceId: piece.id, contexts: clone(route.contexts), modifier: route.modifier,
    roundApplied: Number(state.round), expiresAt: route.effectExpiresAt,
    trainingTruth: false }, "effectHash");
  piece.officialAbilityEffects = piece.officialAbilityEffects || [];
  piece.officialAbilityEffects.push(effect);
  state.terranUniqueUseHistory = state.terranUniqueUseHistory || [];
  state.terranUniqueUseHistory.push({ round: Number(state.round), phase: state.phase,
    sideKey: action.sideKey, pieceId: piece.id, definitionId: route.definitionId,
    sourceInstanceId: card.cardInstanceId, effectHash: effect.effectHash,
    planHash: action.terranUniquePlan.planHash, trainingTruth: false });
  const events = [{ type: "contextual_supply_bonus_applied", pieceId: piece.id,
    sourceCardInstanceId: card.cardInstanceId, contexts: clone(route.contexts),
    modifier: route.modifier, expiresAt: route.effectExpiresAt, trainingTruth: false }];
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(action), events: clone(events) });
  return freezeDeep({ ok: true, schema: "starcraft_tmg_official_terran_unique_transition_v1",
    runtimeId: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_VERSION,
    postRevision: Number(request.options?.postRevision || 0), state,
    action: clone(action), events, rulesTruth: "official_current_product_terran_unique_transition",
    trainingTruth: false });
}
function query(bundle, state, request = {}) {
  const queryKind = String(request.queryKind || request.kind || "");
  let result;
  if (queryKind === "definition_routes") {
    result = { routes: clone(bundle.routes), routeCount: bundle.routeCount };
  } else if (queryKind === "contextual_supply_projection") {
    result = projectOfficialContextualSupplyValueV1({ state,
      pieceId: request.pieceId, context: request.context });
  } else if (queryKind === "instantiate_parameterized_action") {
    const domain = enumerate(bundle, state, { sideKey: request.sideKey || state.activeSideKey })
      .parameterDomains.find((entry) => entry.domainId === request.domainId);
    if (!domain) fail("TERRAN_UNIQUE_QUERY_DOMAIN_STALE");
    const value = preview(bundle, state, { domain, parameters: request.parameters || {} });
    result = { preview: value, action: value.action };
  } else fail("TERRAN_UNIQUE_QUERY_KIND_UNSUPPORTED", queryKind);
  return seal({ schema: "starcraft_tmg_official_terran_unique_query_v1",
    semanticVersion: "1.0.0", queryKind, precision: "exact", result,
    source: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialTerranUniqueFamilyAdapterV1(bundle) {
  verifyOfficialTerranUniqueFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_TERRAN_UNIQUE_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime", coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query"],
    archetypeCounts: { ...bundle.archetypeCounts }, sourceBundleHash: bundle.bundleHash,
    contextSpecificSupplyNeverMutatesCurrentSupply: true,
    legalSpacePreviewApplyReplaySequencePreserved: true,
    rulesAuthority: true, trainingTruth: false,
  });
  return freezeDeep({ descriptor,
    legalSpace: (state, options = {}) => enumerate(bundle, state, options),
    preview: (state, request = {}) => preview(bundle, state, request),
    apply: (state, request = {}) => apply(bundle, state, request),
    query: (state, request = {}) => query(bundle, state, request),
  });
}
