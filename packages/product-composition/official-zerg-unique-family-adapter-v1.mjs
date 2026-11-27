import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { resolveOfficialAbilityResourcePaymentV1 } from
  "../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs";
import { evaluateOfficialBaseMeasurementV1 } from
  "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { projectOfficialContextualSupplyValueV1 } from
  "../rule-atoms/official-contextual-supply-projection-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { getOfficialCardBuildPaymentProfileV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";
import { resolveOfficialMatchLifecycleAbilityResourceCostV1, quoteOfficialSelectedUnitPsionicLinkV1 } from
  "./official-match-lifecycle-family-adapter-v1.mjs";
import { allowsOfficialAbilityUnitRecipientV13 } from
  "../rule-atoms/official-structure-targeting-policy-v13.mjs";

export const OFFICIAL_DOMINEERING_PRESENCE_DEFINITION_ID = 'unit:queen/domineering-presence-movement-phase@1';
const domineeringSourceText = "Select another Friendly Unit Within 6\" (Line of Sight is not required). That Unit’s Supply characteristic is increased by 1 for Controlling and Contesting Mission Markers and completing objectives.";
const selectedDomineeringSchema = 'starcraft_tmg_official_zerg_unique_domineering_source_bundle_v2';

export const OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_ID =
  "official-zerg-unique-family-adapter-v1";
export const OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_ZERG_UNIQUE_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_zerg_unique_family_source_bundle_v1";
export const OFFICIAL_ZERG_UNIQUE_FAMILY_PARAMETER_KIND =
  "official_zerg_unique_family_plan_v1";

const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  close_combat_instant_active: 1,
  mission_supply_bonus_target: 1,
});
const ACTIVE_PHASES = new Set(["movement", "assault", "combat"]);

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
    schema: "starcraft_tmg_official_zerg_unique_route_v1",
    semanticVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
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
  if (name === "Domineering Presence" && definition.recordKey === "army_units:queen"
    && /Select another Friendly Unit Within 6.+Line of Sight is not required.+Supply characteristic is increased by 1.+Controlling and Contesting Mission Markers.+completing objectives/isu.test(text)) {
    spec = { effectKind: "mission_supply_bonus_target",
      allowedPhases: ["movement"], resourceType: "BM", printedResourceCost: 1,
      targetKind: "another_friendly_within", rangeMilliInches: 6000,
      lineOfSightRequired: false,
      contexts: ["mission_marker_control", "objective_completion"],
      modifier: 1, effectExpiresAt: "round_end", oncePerRound: true };
  } else if (name === "Predation" && definition.recordKey === "tactical_cards:lair"
    && /Predation <Active> <Any Phase>.+active Unit.+Close Combat Weapons gain INSTANT/isu.test(text)) {
    spec = { effectKind: "close_combat_instant_active",
      allowedPhases: [...ACTIVE_PHASES], resourceType: null, printedResourceCost: 0,
      targetKind: "active_unit", closeCombatWeaponsGainInstant: true,
      effectExpiresAt: "round_end", oncePerRound: true };
  }
  if (!spec) fail("ZERG_UNIQUE_DEFINITION_COMPILER_UNRECOGNIZED",
    `${definition.recordKey}:${name}`);
  return seal(routeBase(definition, spec), "routeHash");
}

export function createOfficialZergUniqueFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("ZERG_UNIQUE_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pending = new Set(denominator.gapDefinitionIds);
  const definitions = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 241 && pending.has(entry.definitionId)))
    .map((entry) => catalogue.definitions.find((candidate) => (
      candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 2 || definitions.some((entry) => !entry)) {
    fail("ZERG_UNIQUE_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(compileRoute).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_ZERG_UNIQUE_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    routeCount: routes.length, archetypeCounts, routes,
    definitionIds: routes.map((entry) => entry.definitionId),
    coveredSourceFeatureHashes: routes.map((entry) => entry.sourceFeatureHash).sort(),
    compilerDenominatorComplete: true, exactSourcePatternsRequired: true,
    arbitraryProseExecutionClaimed: false, sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_zerg_unique_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialZergUniqueFamilySourceBundleV1(bundle);
  return bundle;
}

export function createOfficialDomineeringPresenceSourceBundleV2(catalogue) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const selected = catalogue.definitions.find(row => row.definitionId === OFFICIAL_DOMINEERING_PRESENCE_DEFINITION_ID);
  if (selected?.recordKey !== 'army_units:queen' || selected.activationKind !== 'active'
    || selected.phase !== 'movement' || selected.activationText !== '<Active>\n(1 Biomass)'
    || selected.sourceText !== domineeringSourceText) fail('DOMINEERING_PRESENCE_SOURCE_UNSUPPORTED');
  const route = compileRoute(selected);
  return seal({ schema: selectedDomineeringSchema, semanticVersion: '2.0.0',
    sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash, dataVersions: clone(catalogue.dataVersions),
    routeCount: 1, routes: [route], definitionIds: [route.definitionId],
    coveredSourceFeatureHashes: [route.sourceFeatureHash], archetypeCounts: { mission_supply_bonus_target: 1 },
    sourceRefreshPerformed: false, trainingTruth: false }, 'bundleHash');
}

export const OFFICIAL_LAIR_PREDATION_ID = 'card:lair/predation-any@1';
const selectedPredationSchema = 'starcraft_tmg_official_zerg_unique_predation_source_bundle_v1';
const predationSourceText = "Predation <Active> <Any Phase>: The active Unit’s Close Combat Weapons gain INSTANT.";

function assertPredationSource(row) {
  if (row?.definitionId !== OFFICIAL_LAIR_PREDATION_ID || row.recordKey !== 'tactical_cards:lair'
    || row.definitionName !== 'Predation' || row.activationKind !== 'active' || row.phase !== 'any'
    || row.sourceKind !== 'card_feature' || row.sourceText !== predationSourceText) fail('PREDATION_SOURCE_UNSUPPORTED');
}

export function createOfficialLairPredationSourceBundleV1(catalogue, { includeQueen = false } = {}) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const source = catalogue.definitions.find(r => r.definitionId === OFFICIAL_LAIR_PREDATION_ID);
  assertPredationSource(source);
  const routes = [compileRoute(source)];
  if (includeQueen) routes.push(...createOfficialDomineeringPresenceSourceBundleV2(catalogue).routes);
  return seal({ schema: selectedPredationSchema, semanticVersion: '1.0.0', sourceCatalogueHash: catalogue.catalogueHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash, normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: clone(catalogue.dataVersions), routeCount: routes.length, routes,
    definitionIds: routes.map(row => row.definitionId), coveredSourceFeatureHashes: routes.map(row => row.sourceFeatureHash).sort(),
    archetypeCounts: Object.fromEntries(routes.map(row => [row.effectKind, 1])), sourceRefreshPerformed: false, trainingTruth: false }, 'bundleHash');
}

function verifySelectedPredation(bundle) {
  const routes = bundle.routes;
  if (bundle.semanticVersion !== '1.0.0' || !Array.isArray(routes) || ![1,2].includes(routes.length)
    || bundle.routeCount !== routes.length || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || !isDeepStrictEqual(bundle.definitionIds, routes.map(r => r.definitionId))
    || !isDeepStrictEqual(bundle.coveredSourceFeatureHashes, routes.map(r => r.sourceFeatureHash).sort())
    || !isDeepStrictEqual(bundle.archetypeCounts, Object.fromEntries(routes.map(r => [r.effectKind, 1])))
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) fail('PREDATION_BUNDLE_INVALID');
  for (const [index, route] of routes.entries()) {
    const source = { ...route, definitionName: route.abilityName };
    if (index === 0) assertPredationSource(source);
    else if (route.definitionId !== OFFICIAL_DOMINEERING_PRESENCE_DEFINITION_ID || route.recordKey !== 'army_units:queen'
      || route.abilityName !== 'Domineering Presence' || route.sourceText !== domineeringSourceText
      || route.activationKind !== 'active' || route.phase !== 'movement' || route.sourceKind !== 'unit_feature'
      || route.activationText !== '<Active>\n(1 Biomass)') fail('DOMINEERING_PRESENCE_SOURCE_UNSUPPORTED');
    if (!isDeepStrictEqual(route, compileRoute(source))) fail('PREDATION_ROUTE_INVALID');
  }
  return true;
}

function verifySelectedDomineeringPresenceSource(bundle) {
  const route = bundle.routes?.[0];
  if (bundle.semanticVersion !== '2.0.0' || bundle.routeCount !== 1 || bundle.routes?.length !== 1
    || route?.definitionId !== OFFICIAL_DOMINEERING_PRESENCE_DEFINITION_ID || route.sourceText !== domineeringSourceText
    || route.recordKey !== 'army_units:queen' || route.effectKind !== 'mission_supply_bonus_target'
    || route.rangeMilliInches !== 6000 || route.lineOfSightRequired !== false || route.modifier !== 1
    || route.resourceType !== 'BM' || route.printedResourceCost !== 1
    || !isDeepStrictEqual(route.contexts, ['mission_marker_control', 'objective_completion'])
    || !isDeepStrictEqual(bundle.definitionIds, [route.definitionId])
    || !isDeepStrictEqual(bundle.coveredSourceFeatureHashes, [route.sourceFeatureHash])
    || route.routeHash !== hashStarcraftTmgContract(without(route, ['routeHash']))
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) {
    fail('DOMINEERING_PRESENCE_SOURCE_BUNDLE_INVALID');
  }
  return true;
}

export function verifyOfficialZergUniqueFamilySourceBundleV1(bundle) {
  if (bundle?.schema === selectedPredationSchema) return verifySelectedPredation(bundle);
  if (bundle?.schema === selectedDomineeringSchema) return verifySelectedDomineeringPresenceSource(bundle);
  if (!object(bundle) || bundle.schema !== OFFICIAL_ZERG_UNIQUE_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 2 || bundle.routes?.length !== 2
    || new Set(bundle.definitionIds || []).size !== 2
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 2
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 2
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.compilerDenominatorComplete !== true
    || bundle.exactSourcePatternsRequired !== true
    || bundle.arbitraryProseExecutionClaimed !== false
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("ZERG_UNIQUE_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialZergUniqueFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialZergUniqueFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
    capability: "authoritative_action",
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function used(state, route, pieceId) {
  return (state.zergUniqueUseHistory || []).some((entry) => (
    Number(entry.round) === Number(state.round) && entry.definitionId === route.definitionId
      && entry.pieceId === pieceId));
}
function within(state, source, target, rangeMilliInches) {
  if (!activePiece(source) || !activePiece(target)) return false;
  return activeModels(source).some((sourceModel) => activeModels(target).some((targetModel) => (
    evaluateOfficialBaseMeasurementV1({ state,
      dataBundle: state.officialModelBaseGeometryDataBundle,
      source: { kind: "model", unitId: source.id, modelId: sourceModel.id },
      target: { kind: "model", unitId: target.id, modelId: targetModel.id },
    }).distanceMilliInches <= Number(rangeMilliInches))));
}
function activeTimingAvailable(state, route, sideKey, actor) {
  if (!ACTIVE_PHASES.has(state.phase) || !route.allowedPhases.includes(state.phase)
    || state.activeSideKey !== sideKey
    || state.players?.[sideKey]?.passedPhases?.[state.phase] === true
    || !activePiece(actor) || actor.sideKey !== sideKey) return false;
  const window = state.selectedRosterActivationWindow;
  if (actor.activatedPhases?.[state.phase] === true && window?.stage !== "after_action") {
    return false;
  }
  if (window && (window.sideKey !== sideKey || window.pieceId !== actor.id
    || window.phase !== state.phase)) return false;
  return !used(state, route, actor.id);
}
function cardById(state, sideKey, id) {
  return (state.cardResources?.[sideKey] || []).find((entry) => entry.cardInstanceId === id);
}
function paymentRef(state, card) {
  const profile = getOfficialCardBuildPaymentProfileV1(
    state.officialCardBuildPaymentDataBundle, card.officialCardRecordKey);
  return { cardInstanceId: card.cardInstanceId,
    recordKey: card.officialCardRecordKey, sourceRecordHash: card.sourceRecordHash,
    payloadHash: card.officialPayloadHash, profileHash: profile.profileHash,
    isReady: card.readiness === "ready" };
}
function effectiveCost(state, route, actor, consume = false, planHash = null, usePsionicLink = false) {
  if (usePsionicLink) {
    const quote = quoteOfficialSelectedUnitPsionicLinkV1(state, { sideKey: actor.sideKey,
      pieceId: actor.id, resourceType: route.resourceType, printedResourceCost: route.printedResourceCost, planHash },
    { consume });
    if (!quote) fail('ZERG_UNIQUE_PSIONIC_LINK_PAYMENT_UNAVAILABLE');
    return quote;
  }
  if (!route.resourceType) return { effectiveResourceCost: 0,
    resourceCostReduction: 0, discountSourcePieceId: null };
  return state.officialMatchLifecycleFamilySourceBundle
    ? resolveOfficialMatchLifecycleAbilityResourceCostV1(
      state.officialMatchLifecycleFamilySourceBundle, state,
      { sideKey: actor.sideKey, pieceId: actor.id, resourceType: route.resourceType,
        printedResourceCost: route.printedResourceCost, planHash }, { consume })
    : { effectiveResourceCost: route.printedResourceCost,
      resourceCostReduction: 0, discountSourcePieceId: null };
}
function paymentSelections(state, route, actor, cost) {
  if (cost === 0) return [[]];
  if (cost !== 1) fail("ZERG_UNIQUE_PAYMENT_COST_UNSUPPORTED", String(cost));
  return (state.cardResources?.[actor.sideKey] || []).filter((card) => (
    card.readiness === "ready")).flatMap((card) => {
    try {
      resolveOfficialAbilityResourcePaymentV1({
        cardDataBundle: state.officialCardBuildPaymentDataBundle,
        resourceType: route.resourceType, resourceCost: cost,
        selectedCardInstanceSetComplete: true,
        selectedCardInstances: [paymentRef(state, card)],
      });
      return [[card.cardInstanceId]];
    } catch { return []; }
  }).sort((left, right) => left[0].localeCompare(right[0]));
}
function domainsForRoute(state, route) {
  if (route.effectKind === "mission_supply_bonus_target") {
    const actors = (state.pieces || []).filter((piece) => (
      piece.officialUnitRecordKey === route.recordKey && fieldedFeature(piece, route)
        && activeTimingAvailable(state, route, piece.sideKey, piece)));
    return actors.flatMap((actor) => {
      const targets = state.pieces.filter((target) => target.id !== actor.id
        && target.sideKey === actor.sideKey && activePiece(target)
        && allowsOfficialAbilityUnitRecipientV13(state, target)
        && within(state, actor, target, route.rangeMilliInches))
        .map((target) => target.id).sort();
      if (!targets.length) return [];
      const cost = effectiveCost(state, route, actor);
      const discounted = state.officialQueenPsionicLinkSource && cost.effectiveResourceCost === route.printedResourceCost
        ? quoteOfficialSelectedUnitPsionicLinkV1(state, { sideKey: actor.sideKey, pieceId: actor.id,
          resourceType: route.resourceType, printedResourceCost: route.printedResourceCost })
        : null;
      return [cost, ...(discounted ? [discounted] : [])].flatMap(choice => {
        const payments = paymentSelections(state, route, actor, choice.effectiveResourceCost);
        return payments.length ? [domainFor(state, route, actor.sideKey, actor, actor.id, targets, payments, choice)] : [];
      });
    });
  }
  const domains = [];
  for (const [sideKey, cards] of Object.entries(state.cardResources || {})) {
    for (const card of cards || []) {
      if (card.officialCardRecordKey !== route.recordKey || card.readiness !== "ready") {
        continue;
      }
      for (const actor of state.pieces || []) {
        if (actor.sideKey !== sideKey || actor.isStructure === true
          || !activeTimingAvailable(state, route, sideKey, actor)) continue;
        domains.push(domainFor(state, route, sideKey, actor, card.cardInstanceId,
          [], [[]]));
      }
    }
  }
  return domains;
}
function domainFor(state, route, sideKey, actor, sourceInstanceId, targetIds, payments,
  cost = effectiveCost(state, route, actor)) {
  const required = ["activeUnitId", "paymentCardInstanceIds"];
  if (targetIds.length > 0) required.push("targetUnitId");
  const resourceCost = freezeDeep({
    resourceType: route.resourceType || null,
    printedResourceCost: route.resourceType ? route.printedResourceCost : 0,
    resourceCostReduction: Number(cost.resourceCostReduction || 0),
    effectiveResourceCost: route.resourceType
      ? Number(cost.effectiveResourceCost || 0) : 0,
    discountSourcePieceId: cost.discountSourcePieceId || null,
    ...(cost.psionicLinkDefinitionId ? { psionicLinkDefinitionId: cost.psionicLinkDefinitionId } : {}),
    trainingTruth: false,
  });
  return seal({
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
    parameterKind: OFFICIAL_ZERG_UNIQUE_FAMILY_PARAMETER_KIND,
    actionType: "resolve_zerg_unique_ability", sideKey, phase: state.phase,
    pieceId: actor.id, sourceInstanceId,
    definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    abilityName: route.abilityName, effectKind: route.effectKind,
    parameterSchema: { type: "object", required,
      activeUnitId: { const: actor.id },
      paymentCardInstanceIds: { enum: clone(payments) },
      ...(targetIds.length > 0 ? { targetUnitId: { enum: clone(targetIds) } } : {}) },
    constraints: { sourceRouteHash: route.routeHash,
      allowedPhases: clone(route.allowedPhases), targetIds: clone(targetIds),
      resourceType: route.resourceType,
      printedResourceCost: route.printedResourceCost,
      effectiveResourceCost: resourceCost.effectiveResourceCost,
      resourceCostsByChoice: { default: resourceCost },
      effectExpiresAt: route.effectExpiresAt },
    executorId: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
    confirmationClass: "rules_owned_direct_action",
    rulesTruth: "official_current_product_zerg_unique_parameter_domain",
    trainingTruth: false,
  }, "domainId");
}
function enumerate(bundle, state, options = {}) {
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  const domains = bundle.routes.flatMap((route) => domainsForRoute(state, route))
    .filter((entry) => !sideKey || entry.sideKey === sideKey)
    .sort((left, right) => left.domainId.localeCompare(right.domainId));
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_zerg_unique_legal_space_v1",
    runtimeId: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
    candidates: [], parameterDomains: domains, diagnostics: [],
    rulesAuthority: true, trainingTruth: false,
  });
}
function instantiate(bundle, state, domain, parameters = {}) {
  const current = enumerate(bundle, state, { sideKey: domain?.sideKey })
    .parameterDomains.find((entry) => entry.domainId === domain?.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) fail("ZERG_UNIQUE_DOMAIN_STALE");
  const allowed = new Set(["activeUnitId", "targetUnitId", "paymentCardInstanceIds"]);
  const payments = [...new Set((parameters.paymentCardInstanceIds || []).map(String))].sort();
  const targetUnitId = String(parameters.targetUnitId || "") || null;
  if (!object(parameters) || Object.keys(parameters).some((key) => !allowed.has(key))
    || parameters.activeUnitId !== domain.pieceId
    || !domain.parameterSchema.paymentCardInstanceIds.enum.some((entry) => (
      isDeepStrictEqual(entry, payments)))
    || (domain.parameterSchema.targetUnitId
      ? !domain.parameterSchema.targetUnitId.enum.includes(targetUnitId)
      : targetUnitId !== null)) fail("ZERG_UNIQUE_PARAMETERS_INVALID");
  const canonicalParameters = { activeUnitId: domain.pieceId,
    targetUnitId, paymentCardInstanceIds: payments };
  const plan = seal({ schema: "starcraft_tmg_official_zerg_unique_plan_v1",
    semanticVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
    domainId: domain.domainId, definitionId: domain.definitionId,
    sourceFeatureHash: domain.sourceFeatureHash,
    sourceInstanceId: domain.sourceInstanceId, sideKey: domain.sideKey,
    pieceId: domain.pieceId, effectKind: domain.effectKind,
    canonicalParameters, sourceRouteHash: domain.constraints.sourceRouteHash,
    ...(domain.constraints.resourceCostsByChoice.default.psionicLinkDefinitionId ? { usePsionicLink: true } : {}),
    rulesTruth: "official_current_product_zerg_unique_plan",
    trainingTruth: false }, "planHash");
  const action = freezeDeep({ actionType: domain.actionType, sideKey: domain.sideKey,
    phase: state.phase, pieceId: domain.pieceId, targetUnitId,
    definitionId: domain.definitionId, abilityName: domain.abilityName,
    effectKind: domain.effectKind, zergUniquePlan: plan,
    executorId: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_current_product_zerg_unique_instantiation",
    trainingTruth: false });
}
function preview(bundle, state, request = {}) {
  const result = instantiate(bundle, state, request.domain, request.parameters || {});
  return seal({ schema: "starcraft_tmg_official_zerg_unique_preview_v1",
    semanticVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
    action: result.action, actionHash: hashStarcraftTmgContract(result.action),
    mutationApplied: false, rulesAuthority: true, trainingTruth: false }, "previewHash");
}
function applyPayment(state, route, action, events) {
  if (!route.resourceType) return;
  const actor = state.pieces.find((entry) => entry.id === action.pieceId);
  const cost = effectiveCost(state, route, actor, true,
    action.zergUniquePlan.planHash, action.zergUniquePlan.usePsionicLink === true);
  const cards = action.zergUniquePlan.canonicalParameters.paymentCardInstanceIds
    .map((id) => cardById(state, action.sideKey, id));
  if (cards.some((entry) => !entry)) fail("ZERG_UNIQUE_PAYMENT_CARD_UNKNOWN");
  const payment = resolveOfficialAbilityResourcePaymentV1({
    cardDataBundle: state.officialCardBuildPaymentDataBundle,
    resourceType: route.resourceType, resourceCost: cost.effectiveResourceCost,
    selectedCardInstanceSetComplete: true,
    selectedCardInstances: cards.map((card) => paymentRef(state, card)),
  });
  for (const id of payment.selectedCardsExhaustOnCommit) {
    cardById(state, action.sideKey, id).readiness = "exhausted";
  }
  events.push({ type: "ability_resource_paid", resourceType: route.resourceType,
    printedResourceCost: route.printedResourceCost,
    resourceCost: cost.effectiveResourceCost,
    resourceCostReduction: cost.resourceCostReduction,
    discountSourcePieceId: cost.discountSourcePieceId,
    paymentResultHash: payment.resultHash,
    exhaustedCardInstanceIds: payment.selectedCardsExhaustOnCommit,
    trainingTruth: false });
}
function apply(bundle, stateInput, request = {}) {
  const action = request.action;
  const domain = enumerate(bundle, stateInput, { sideKey: action?.sideKey })
    .parameterDomains.find((entry) => entry.domainId === action?.zergUniquePlan?.domainId);
  if (!domain) fail("ZERG_UNIQUE_DOMAIN_STALE");
  const expected = instantiate(bundle, stateInput, domain,
    action.zergUniquePlan.canonicalParameters);
  if (!isDeepStrictEqual(expected.action, action)) fail("ZERG_UNIQUE_ACTION_STALE");
  const state = clone(stateInput);
  const route = bundle.routes.find((entry) => entry.definitionId === action.definitionId);
  const actor = state.pieces.find((entry) => entry.id === action.pieceId);
  const target = action.targetUnitId
    ? state.pieces.find((entry) => entry.id === action.targetUnitId) : actor;
  const events = [];
  applyPayment(state, route, action, events);
  if (route.sourceKind === "card_feature") {
    const card = cardById(state, action.sideKey, action.zergUniquePlan.sourceInstanceId);
    if (!card || card.readiness !== "ready") fail("ZERG_UNIQUE_SOURCE_CARD_NOT_READY");
    card.readiness = "exhausted";
    events.push({ type: "tactical_card_exhausted",
      cardInstanceId: card.cardInstanceId, trainingTruth: false });
  }
  let effect;
  if (route.effectKind === "mission_supply_bonus_target") {
    effect = seal({ schema: "starcraft_tmg_official_contextual_supply_effect_v1",
      effectKind: "contextual_supply_bonus", sourceDefinitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash, sourceCardInstanceId: null,
      sourcePieceId: actor.id, targetPieceId: target.id,
      contexts: clone(route.contexts), modifier: route.modifier,
      roundApplied: Number(state.round), expiresAt: route.effectExpiresAt,
      trainingTruth: false }, "effectHash");
  } else {
    effect = seal({ schema: "starcraft_tmg_official_close_combat_instant_effect_v1",
      effectKind: "close_combat_instant", sourceDefinitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash,
      sourceCardInstanceId: action.zergUniquePlan.sourceInstanceId,
      targetPieceId: target.id, roundApplied: Number(state.round),
      expiresAt: route.effectExpiresAt, trainingTruth: false }, "effectHash");
  }
  target.officialAbilityEffects = target.officialAbilityEffects || [];
  target.officialAbilityEffects.push(effect);
  state.zergUniqueUseHistory = state.zergUniqueUseHistory || [];
  state.zergUniqueUseHistory.push({ round: Number(state.round), phase: state.phase,
    sideKey: action.sideKey, pieceId: actor.id, targetPieceId: target.id,
    definitionId: route.definitionId,
    sourceInstanceId: action.zergUniquePlan.sourceInstanceId,
    effectHash: effect.effectHash, planHash: action.zergUniquePlan.planHash,
    trainingTruth: false });
  if (bundle.schema === selectedDomineeringSchema || bundle.schema === selectedPredationSchema) {
    const prior = state.selectedRosterActivationWindow;
    state.selectedRosterActivationWindow = {
      schema: "starcraft_tmg_selected_roster_activation_window_v1",
      round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
      pieceId: actor.id, stage: prior?.stage || 'before_action', trainingTruth: false,
    };
  }
  events.push({ type: route.effectKind, sourcePieceId: actor.id,
    targetPieceId: target.id, effectHash: effect.effectHash,
    expiresAt: route.effectExpiresAt, trainingTruth: false });
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(action), events: clone(events) });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_zerg_unique_transition_v1",
    runtimeId: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
    postRevision: Number(request.options?.postRevision || 0), state,
    action: clone(action), events,
    rulesTruth: "official_current_product_zerg_unique_transition",
    trainingTruth: false });
}

export function projectOfficialZergUniqueFamilyModifiersV1(bundle, state, request = {}) {
  verifyOfficialZergUniqueFamilySourceBundleV1(bundle);
  const piece = state.pieces?.find((entry) => entry.id === request.pieceId);
  if (!piece) fail("ZERG_UNIQUE_PROJECTION_PIECE_UNKNOWN", String(request.pieceId || ""));
  const route = bundle.routes.find(entry => entry.effectKind === "close_combat_instant_active");
  const effects = (piece.officialAbilityEffects || []).filter((entry) => (
    entry.effectKind === "close_combat_instant"));
  if (effects.some((effect) => effect.schema
      !== "starcraft_tmg_official_close_combat_instant_effect_v1"
    || effect.sourceDefinitionId !== route?.definitionId
    || effect.sourceFeatureHash !== route?.sourceFeatureHash
    || effect.targetPieceId !== piece.id || effect.expiresAt !== "round_end"
    || effect.trainingTruth !== false
    || effect.effectHash !== hashStarcraftTmgContract(without(effect, ["effectHash"])))) {
    fail("ZERG_UNIQUE_PROJECTION_EFFECT_INVALID", piece.id);
  }
  const active = effects.filter((effect) => Number(effect.roundApplied) === Number(state.round));
  const closeCombatContext = request.attackKind === "close_combat"
    || request.weaponPhase === "combat";
  const body = { schema: "starcraft_tmg_official_zerg_unique_projection_v1",
    semanticVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
    pieceId: piece.id, attackKind: request.attackKind || null,
    weaponName: request.weaponName || null,
    closeCombatInstant: activePiece(piece) && closeCombatContext && active.length > 0,
    sourceDefinitionIds: active.map((entry) => entry.sourceDefinitionId).sort(),
    rulesTruth: "official_current_product_zerg_unique_projection",
    trainingTruth: false };
  return freezeDeep({ ...body, projectionHash: hashStarcraftTmgContract(body) });
}

function query(bundle, state, request = {}) {
  const queryKind = String(request.queryKind || request.kind || "");
  let result;
  if (queryKind === "definition_routes") {
    result = { routes: clone(bundle.routes), routeCount: bundle.routeCount };
  } else if (queryKind === "zerg_unique_projection") {
    result = projectOfficialZergUniqueFamilyModifiersV1(bundle, state, request);
  } else if (queryKind === "contextual_supply_projection") {
    result = projectOfficialContextualSupplyValueV1({ state,
      pieceId: request.pieceId, context: request.context });
  } else if (queryKind === "instantiate_parameterized_action") {
    const domain = enumerate(bundle, state, { sideKey: request.sideKey
      || state.activeSideKey }).parameterDomains.find((entry) => (
      entry.domainId === request.domainId));
    if (!domain) fail("ZERG_UNIQUE_QUERY_DOMAIN_STALE");
    const value = preview(bundle, state, { domain, parameters: request.parameters || {} });
    result = { preview: value, action: value.action };
  } else fail("ZERG_UNIQUE_QUERY_KIND_UNSUPPORTED", queryKind);
  return seal({ schema: "starcraft_tmg_official_zerg_unique_query_v1",
    semanticVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
    queryKind, precision: "exact", result,
    source: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialZergUniqueFamilyAdapterV1(bundle) {
  verifyOfficialZergUniqueFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_ZERG_UNIQUE_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime", coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "replay"],
    archetypeCounts: { ...bundle.archetypeCounts }, sourceBundleHash: bundle.bundleHash,
    psionicLinkPaymentSeamReused: true,
    closeCombatInstantConsumerProjectionBound: bundle.schema !== selectedDomineeringSchema,
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
