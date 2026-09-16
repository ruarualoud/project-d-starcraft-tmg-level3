import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { resolveOfficialAbilityResourcePaymentV1 } from
  "../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs";
import {
  createOfficialBattlefieldMarkerV1,
  createOfficialBattlefieldTokenV1,
} from "../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs";
import {
  evaluateOfficialBaseMeasurementV1,
  evaluateOfficialCoherencyPlacementV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { resolveOfficialRespawnModelsV1 } from
  "../rule-atoms/official-respawn-morph-rules-kernel-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { getOfficialBattlefieldAssetComponentFootprintV1 } from
  "../source-data/official-battlefield-asset-component-profile-v1.mjs";
import { getOfficialCardBuildPaymentProfileV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import { getOfficialModelBaseGeometryProfileV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import {
  verifyOfficialRespawnMorphDataBundleV1,
} from "../source-data/official-respawn-morph-data-bundle-v1.mjs";
import {
  verifyOfficialSummonDataBundleV1,
} from "../source-data/official-summon-data-bundle-v1.mjs";
import {
  isOfficialCurrentProductUnitOnCreepV1,
} from "./official-battlefield-asset-family-adapter-v1.mjs";
import {
  projectOfficialCharacteristicStatusFamilyModifiersV1,
} from "./official-characteristic-status-family-adapter-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";
import { resolveOfficialMatchLifecycleAbilityResourceCostV1 } from
  "./official-match-lifecycle-family-adapter-v1.mjs";

export const OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID =
  "official-unit-lifecycle-family-adapter-v1";
export const OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_UNIT_LIFECYCLE_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_unit_lifecycle_family_source_bundle_v1";
export const OFFICIAL_UNIT_LIFECYCLE_FAMILY_PARAMETER_KIND =
  "official_unit_lifecycle_family_plan_v1";

const SIDE_KEYS = new Set(["player1", "player2"]);
const ACTIVE_EFFECTS = new Set([
  "mass_recall", "phase_prism_swap", "respawn_models",
  "return_active_ground_to_reserves", "set_special_unit",
  "spawn_creep_tumor", "summon_roachling",
]);
const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  mass_recall: 1,
  omega_network: 1,
  phase_prism_swap: 1,
  respawn_models: 1,
  return_active_ground_to_reserves: 3,
  set_special_unit: 2,
  spawn_creep_tumor: 1,
  summon_roachling: 1,
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
function reservePiece(piece) {
  return piece?.isOnField !== true && piece?.isInReserves === true
    && piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}
function liveModels(piece) {
  return (piece?.models || []).filter((model) => model?.isDestroyed !== true
    && (piece.isOnField !== true || model?.isOnField !== false));
}
function tags(piece) {
  return new Set([piece?.combatTag, ...(piece?.combatTags || [])]
    .map(normalized).filter(Boolean));
}
function fieldedFeature(piece, route) {
  const selected = new Set((piece.selectedUpgradeNames || []).map(normalized));
  const equipment = new Set((piece.equipment || []).map((entry) => normalized(
    entry.equipmentName || entry.name)).filter(Boolean));
  const cost = piece.compositionKind === "large"
    ? Number(route.costByComposition?.large || 0)
    : Number(route.costByComposition?.small || 0);
  return cost === 0 || selected.has(normalized(route.abilityName))
    || equipment.has(normalized(route.abilityName));
}
function routeBase(definition, spec) {
  const match = String(definition.activationText || "").match(
    /\((\d+)\s+(Command Point|Biomass|Psionic Energy)\)/iu);
  const resourceType = !match ? null
    : normalized(match[2]) === "command point" ? "CP"
      : normalized(match[2]) === "biomass" ? "BM" : "PE";
  return {
    schema: "starcraft_tmg_official_unit_lifecycle_definition_route_v1",
    semanticVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
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
    resourceType,
    resourceCost: Number(match?.[1] || 0),
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
  if (name === "Phase Prism"
    && /nominated to deploy from Reserves.+PLACE \(0\).+returned to Reserves/isu.test(text)) {
    spec = { effectKind: "phase_prism_swap", actionKind: "optional_deploy_replacement",
      placementDistanceMilliInches: 0, activationEnds: true };
  } else if (name === "Pylon Warp-In"
    && /no Friendly Pylon.+more than 10.+Special Abilities/isu.test(text)) {
    spec = { effectKind: "set_special_unit", actionKind: "active_ability",
      createdUnitRecordKey: "army_units:pylon", minimumEnemyGapMilliInchesExclusive: 10000,
      groundLevelRequired: true, suppressSpecialAbilitiesThisRound: true,
      removeAtRoundEnd: false };
  } else if (name === "Mass Recall"
    && /Once per Game.+Faction Indicator.+Within 6.+returned to Reserves/isu.test(text)) {
    spec = { effectKind: "mass_recall", actionKind: "active_ability",
      rangeMilliInches: 6000, requiredFaction: "Protoss", oncePerGame: true };
  } else if (name === "Roachling Infestation" && /SUMMON \(Roachling\)/iu.test(text)) {
    spec = { effectKind: "summon_roachling", actionKind: "active_ability",
      createdUnitRecordKey: "army_units:roachling", oncePerGame: true,
      parentBaseContactRequired: true, opponentZoneOfInfluenceExcluded: true };
  } else if (["Strap in!", "Strategic Recall"].includes(name)
    && /active,? Unengaged Ground Unit.+returned to Reserves instead of/iu.test(text)) {
    spec = { effectKind: "return_active_ground_to_reserves",
      actionKind: "active_ability", requiredActorTag: "ground",
      unengagedRequired: true, replacesAction: true };
  } else if (name === "Rapid Ingress"
    && /Point Defence Drone.+more than 1.+Remove this Unit at the End/isu.test(text)) {
    spec = { effectKind: "set_special_unit", actionKind: "active_ability",
      createdUnitRecordKey: "army_units:point_defense_drone",
      minimumEnemyGapMilliInchesExclusive: 1000, groundLevelRequired: false,
      suppressSpecialAbilitiesThisRound: false, removeAtRoundEnd: true };
  } else if (name === "Zergling Reconstitution"
    && /RESPAWN \(2\).+RESPAWN \(3\).+ON CREEP/isu.test(text)) {
    spec = { effectKind: "respawn_models", actionKind: "active_ability",
      baseRespawnValue: 2, onCreepRespawnValue: 3,
      existingModelBaseContactRequired: true };
  } else if (name === "Spawn Creep Tumor"
    && /Creep Tumor token in base-to-base contact/iu.test(text)) {
    spec = { effectKind: "spawn_creep_tumor", actionKind: "active_ability",
      tokenKind: "creep_tumor", parentBaseContactRequired: true };
  } else if (name === "Omega Network" && definition.sourceProductKind === "unit"
    && /base of the Omega Worm counts as an Entry Edge.+combined Supply cost of 2/isu.test(text)) {
    spec = { effectKind: "omega_network", actionKind: "optional_lifecycle_consumer",
      roundSupplyCap: 2, reserveUnitTag: "ground", sourceBaseIsEntryEdge: true,
      returnTriggerActions: ["move", "disengage", "run"] };
  }
  if (!spec) {
    fail("UNIT_LIFECYCLE_DEFINITION_COMPILER_UNRECOGNIZED",
      `${definition.recordKey}:${name}`);
  }
  return seal(routeBase(definition, spec), "routeHash");
}

export function createOfficialUnitLifecycleFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator, summonDataBundle, respawnMorphDataBundle } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  verifyOfficialSummonDataBundleV1(summonDataBundle);
  verifyOfficialRespawnMorphDataBundleV1(respawnMorphDataBundle);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("UNIT_LIFECYCLE_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pending = new Set(denominator.gapDefinitionIds);
  const owned = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 238 && pending.has(entry.definitionId)));
  const definitions = owned.map((entry) => catalogue.definitions.find((candidate) => (
    candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 11 || definitions.some((entry) => !entry)) {
    fail("UNIT_LIFECYCLE_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(compileRoute).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_UNIT_LIFECYCLE_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    summonDataBundleHash: summonDataBundle.bundleHash,
    respawnMorphDataBundleHash: respawnMorphDataBundle.bundleHash,
    summonedUnitRecordKeys: summonDataBundle.summonedUnitProfiles.map((entry) => (
      entry.recordKey)).sort(),
    routeCount: routes.length,
    archetypeCounts,
    routes,
    definitionIds: routes.map((entry) => entry.definitionId),
    coveredSourceFeatureHashes: routes.map((entry) => entry.sourceFeatureHash).sort(),
    compilerDenominatorComplete: true,
    exactSourcePatternsRequired: true,
    lowerKernelContractsReused: ["respawn_morph", "model_base_geometry",
      "card_build_payment", "battlefield_token_marker"],
    crossFamilyConsumers: ["shade_round_end", "reserve_indicator_round_end",
      "pylon_warp_conduit"],
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_unit_lifecycle_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialUnitLifecycleFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialUnitLifecycleFamilySourceBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_UNIT_LIFECYCLE_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 11 || bundle.routes?.length !== 11
    || new Set(bundle.definitionIds || []).size !== 11
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 11
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 11
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.summonedUnitRecordKeys?.length !== 3
    || bundle.lowerKernelContractsReused?.length !== 4
    || bundle.crossFamilyConsumers?.length !== 3
    || bundle.compilerDenominatorComplete !== true
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("UNIT_LIFECYCLE_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialUnitLifecycleFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialUnitLifecycleFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    capability: ACTIVE_EFFECTS.has(route.effectKind)
      ? "authoritative_action" : "automatic_consumer",
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function cardById(state, sideKey, id) {
  return (state.cardResources?.[sideKey] || []).find((entry) => entry.cardInstanceId === id);
}
function paymentRef(state, card) {
  const profile = getOfficialCardBuildPaymentProfileV1(
    state.officialCardBuildPaymentDataBundle, card.officialCardRecordKey);
  return { cardInstanceId: card.cardInstanceId, recordKey: card.officialCardRecordKey,
    sourceRecordHash: card.sourceRecordHash, payloadHash: card.officialPayloadHash,
    profileHash: profile.profileHash, isReady: card.readiness === "ready" };
}
function paymentSelections(state, sideKey, pieceId, resourceType, resourceCost) {
  if (!resourceType || resourceCost === 0) return [[]];
  const effectiveCost = state.officialMatchLifecycleFamilySourceBundle
    ? resolveOfficialMatchLifecycleAbilityResourceCostV1(
      state.officialMatchLifecycleFamilySourceBundle, state,
      { sideKey, pieceId, resourceType, printedResourceCost: resourceCost },
    ).effectiveResourceCost : resourceCost;
  const cards = (state.cardResources?.[sideKey] || []).filter((entry) => (
    entry.readiness === "ready"));
  const rows = [];
  for (let mask = 0; mask < (1 << cards.length); mask += 1) {
    const selected = cards.filter((_, index) => (mask & (1 << index)) !== 0);
    try {
      resolveOfficialAbilityResourcePaymentV1({
        cardDataBundle: state.officialCardBuildPaymentDataBundle,
        resourceType, resourceCost: effectiveCost, selectedCardInstanceSetComplete: true,
        selectedCardInstances: selected.map((card) => paymentRef(state, card)),
      });
      rows.push(selected.map((entry) => entry.cardInstanceId).sort());
    } catch { /* Invalid payments do not enter LegalSpace. */ }
  }
  return rows.sort((left, right) => left.join("|").localeCompare(right.join("|")));
}
function routeInstances(state, route) {
  if (route.sourceKind === "unit_feature") {
    return (state.pieces || []).filter((piece) => (
      piece.officialUnitRecordKey === route.recordKey
        && (route.effectKind === "phase_prism_swap" ? reservePiece(piece) : activePiece(piece))
        && fieldedFeature(piece, route))).map((piece) => ({
      sourceInstanceId: piece.id, sideKey: piece.sideKey, sourcePiece: piece,
    }));
  }
  return Object.entries(state.cardResources || {}).flatMap(([sideKey, cards]) => (
    (cards || []).filter((card) => card.officialCardRecordKey === route.recordKey)
      .map((card) => ({ sourceInstanceId: card.cardInstanceId, sideKey, card }))
  ));
}
function combatProfile(state, recordKey) {
  const profile = state.officialCombatProfileBundle?.profilesByRecordKey?.[recordKey]
    || state.officialGameplayDataBundle?.combatProfileBundle?.profilesByRecordKey?.[recordKey];
  if (!profile) fail("UNIT_LIFECYCLE_COMBAT_PROFILE_MISSING", recordKey);
  return profile;
}
function minimumUnitGap(state, left, right) {
  const values = liveModels(left).flatMap((leftModel) => liveModels(right).map((rightModel) => (
    evaluateOfficialBaseMeasurementV1({ state,
      source: { kind: "model", unitId: left.id, modelId: leftModel.id },
      target: { kind: "model", unitId: right.id, modelId: rightModel.id },
      dataBundle: state.officialModelBaseGeometryDataBundle }).distanceMilliInches
  )));
  return values.length > 0 ? Math.min(...values) : Infinity;
}
function engaged(state, piece) {
  return (state.pieces || []).some((enemy) => enemy.sideKey !== piece.sideKey
    && activePiece(enemy) && minimumUnitGap(state, piece, enemy) <= 1001);
}
function actionActors(state, route, instance) {
  if (route.effectKind === "phase_prism_swap") return [instance.sourcePiece];
  if (route.sourceKind === "unit_feature") return [instance.sourcePiece];
  return (state.pieces || []).filter((piece) => piece.sideKey === instance.sideKey
    && activePiece(piece) && piece.isStructure !== true
    && (route.effectKind !== "return_active_ground_to_reserves"
      || (tags(piece).has("ground") && !engaged(state, piece))));
}
function used(state, route, sourceInstanceId, scope) {
  return (state.unitLifecycleUseHistory || []).some((entry) => (
    entry.definitionId === route.definitionId
      && entry.sourceInstanceId === sourceInstanceId
      && (scope === "game" || Number(entry.round) === Number(state.round))));
}
function available(state, route, instance, actor) {
  if (!SIDE_KEYS.has(instance.sideKey) || state.activeSideKey !== instance.sideKey
    || (route.phase !== "any" && route.phase !== state.phase)) {
    fail("UNIT_LIFECYCLE_ROUTE_WINDOW_INVALID", route.definitionId);
  }
  if (instance.card && instance.card.readiness !== "ready") {
    fail("UNIT_LIFECYCLE_SOURCE_CARD_NOT_READY", instance.sourceInstanceId);
  }
  if (route.oncePerGame && used(state, route, instance.sourceInstanceId, "game")) {
    fail("UNIT_LIFECYCLE_ONCE_PER_GAME_USED", route.definitionId);
  }
  if (route.effectKind === "phase_prism_swap") {
    if (!reservePiece(actor)) fail("UNIT_LIFECYCLE_PHASE_PRISM_NOT_IN_RESERVES");
  } else if (!activePiece(actor) || actor.sideKey !== instance.sideKey
    || actor.isStructure === true) {
    fail("UNIT_LIFECYCLE_ACTIVE_UNIT_INVALID", actor?.id || "");
  }
  if (route.effectKind === "return_active_ground_to_reserves"
    && (!tags(actor).has("ground") || engaged(state, actor))) {
    fail("UNIT_LIFECYCLE_RECALL_TARGET_INVALID", actor.id);
  }
  if (route.effectKind === "set_special_unit" && (state.pieces || []).some((piece) => (
    piece.sideKey === instance.sideKey && activePiece(piece)
      && piece.officialUnitRecordKey === route.createdUnitRecordKey))) {
    fail("UNIT_LIFECYCLE_SPECIAL_UNIT_ALREADY_PRESENT", route.createdUnitRecordKey);
  }
  const targets = route.effectKind === "phase_prism_swap"
    ? (state.pieces || []).filter((piece) => piece.sideKey === actor.sideKey
      && activePiece(piece) && piece.id !== actor.id).map((entry) => entry.id).sort()
    : [];
  if (route.effectKind === "phase_prism_swap" && targets.length === 0) {
    fail("UNIT_LIFECYCLE_PHASE_PRISM_TARGET_UNAVAILABLE");
  }
  if (route.effectKind === "respawn_models"
    && !(actor.destroyedModelIds || []).length) fail("UNIT_LIFECYCLE_NO_MODELS_TO_RESPAWN");
  const payments = paymentSelections(state, instance.sideKey, actor.id,
    route.resourceType, route.resourceCost);
  if (payments.length === 0) fail("UNIT_LIFECYCLE_PAYMENT_UNAVAILABLE");
  return { targets, payments };
}
function requiredParameters(route) {
  const required = ["activeUnitId", "paymentCardInstanceIds"];
  if (["set_special_unit", "mass_recall", "spawn_creep_tumor"].includes(
    route.effectKind)) required.push("coordinate");
  if (["phase_prism_swap", "summon_roachling", "respawn_models"].includes(
    route.effectKind)) required.push("placementPlan");
  if (route.effectKind === "phase_prism_swap") {
    required.push("targetUnitId", "targetContactModelId");
  }
  return required;
}
function domainFor(state, route, instance, actor, context) {
  return seal({
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_UNIT_LIFECYCLE_FAMILY_PARAMETER_KIND,
    actionType: "resolve_unit_lifecycle_ability",
    executorId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: instance.sourceInstanceId,
    sourceKind: route.sourceKind,
    sideKey: actor.sideKey,
    phase: state.phase,
    pieceId: actor.id,
    abilityName: route.abilityName,
    effectKind: route.effectKind,
    parameterSchema: {
      type: "object",
      required: requiredParameters(route),
      activeUnitId: { const: actor.id },
      targetUnitId: context.targets.length > 0 ? { enum: context.targets } : null,
      paymentCardInstanceIds: { enum: clone(context.payments) },
      coordinate: ["set_special_unit", "mass_recall", "spawn_creep_tumor"].includes(
        route.effectKind) ? { type: "world_point_milli_inches" } : null,
      placementPlan: ["phase_prism_swap", "summon_roachling", "respawn_models"].includes(
        route.effectKind) ? { type: "complete_model_placement_plan" } : null,
    },
    constraints: {
      sourceRouteHash: route.routeHash,
      createdUnitRecordKey: route.createdUnitRecordKey || null,
      minimumEnemyGapMilliInchesExclusive:
        route.minimumEnemyGapMilliInchesExclusive || null,
      rangeMilliInches: route.rangeMilliInches || null,
      fullBaseGeometryRequired: true,
      continuousCoordinatesNotClientCertified: true,
    },
    confirmationClass: "rules_owned_direct_action",
    rulesTruth: "official_current_product_unit_lifecycle_parameter_domain",
    trainingTruth: false,
  }, "domainId");
}
function enumeratePrimary(bundle, state, options) {
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  const domains = [];
  const disabled = [];
  const catalogueScope = options.scope === "catalogue";
  for (const route of bundle.routes.filter((entry) => ACTIVE_EFFECTS.has(entry.effectKind))) {
    for (const instance of routeInstances(state, route).filter((entry) => (
      catalogueScope || entry.sideKey === sideKey))) {
      for (const actor of actionActors(state, route, instance)) {
        try {
          domains.push(domainFor(state, route, instance, actor,
            available(state, route, instance, actor)));
        } catch (error) {
          if (options.includeDisabled === true) disabled.push({
            actionType: "resolve_unit_lifecycle_ability",
            definitionId: route.definitionId,
            sourceInstanceId: instance.sourceInstanceId,
            pieceId: actor.id,
            sideKey: actor.sideKey,
            effectKind: route.effectKind,
            executorId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
            executorVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
            isEnabled: false,
            disabledReason: String(error?.message || error).split(":")[0],
            score: 0,
            details: { trainingTruth: false },
          });
        }
      }
    }
  }
  return { domains, disabled };
}
function omegaDomains(bundle, state, sideKey) {
  const route = bundle.routes.find((entry) => entry.effectKind === "omega_network");
  if (!route || state.activeSideKey !== sideKey) return [];
  const result = [];
  for (const omega of routeInstances(state, route).filter((entry) => (
    entry.sideKey === sideKey)).map((entry) => entry.sourcePiece)) {
    if (state.phase === "movement") {
      const spent = (state.unitLifecycleUseHistory || []).filter((entry) => (
        entry.effectKind === "omega_network_deploy" && entry.sourceInstanceId === omega.id
          && Number(entry.round) === Number(state.round)))
        .reduce((sum, entry) => sum + Number(entry.currentSupply || 0), 0);
      for (const target of (state.pieces || []).filter((piece) => piece.sideKey === sideKey
        && reservePiece(piece) && tags(piece).has("ground")
        && Number(piece.currentSupply) + spent <= route.roundSupplyCap)) {
        result.push(systemDomain(state, route, omega, target,
          "omega_network_deploy", { roundSupplyCap: route.roundSupplyCap,
            spentSupply: spent, placementPlanRequired: true }));
      }
    }
    for (const target of (state.pieces || []).filter((piece) => piece.sideKey === sideKey
      && activePiece(piece) && piece.id !== omega.id && minimumUnitGap(state, piece, omega) <= 1)) {
      const witness = [...(state.log || [])].reverse().flatMap((entry) => entry.events || [])
        .find((event) => event.pieceId === target.id
          && route.returnTriggerActions.includes(normalized(event.actionType || event.type)));
      if (witness) result.push(systemDomain(state, route, omega, target,
        "omega_network_return", { triggerEventHash: hashStarcraftTmgContract(witness) }));
    }
  }
  return result;
}
function systemDomain(state, route, source, target, effectKind, extra = {}) {
  return seal({
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_UNIT_LIFECYCLE_FAMILY_PARAMETER_KIND,
    actionType: "resolve_unit_lifecycle_consumer",
    executorId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: source.id,
    sideKey: target.sideKey,
    phase: state.phase,
    pieceId: target.id,
    abilityName: route.abilityName,
    effectKind,
    parameterSchema: { type: "object",
      required: ["activeUnitId", ...(extra.placementPlanRequired ? ["placementPlan"] : [])],
      activeUnitId: { const: target.id },
      placementPlan: extra.placementPlanRequired
        ? { type: "complete_model_placement_plan" } : null },
    constraints: { sourceRouteHash: route.routeHash, sourcePieceId: source.id,
      fullBaseGeometryRequired: true, ...extra },
    confirmationClass: "rules_owned_optional_lifecycle",
    rulesTruth: "official_current_product_unit_lifecycle_parameter_domain",
    trainingTruth: false,
  }, "domainId");
}
function crossFamilyDomains(state, sideKey) {
  const rows = [];
  for (const opportunity of state.pendingBattlefieldAssetOpportunities || []) {
    if (opportunity.sideKey !== sideKey) continue;
    const binding = (state.officialBattlefieldAssetBindings || []).find((entry) => (
      entry.assetId === opportunity.assetId));
    if (!binding) continue;
    const route = { definitionId: binding.sourceDefinitionId,
      sourceFeatureHash: binding.sourceFeatureHash, routeHash: binding.bindingHash,
      abilityName: opportunity.opportunityKind };
    const targets = opportunity.opportunityKind.startsWith("set_adept")
      ? (state.pieces || []).filter((piece) => piece.sideKey === sideKey && activePiece(piece)
        && piece.officialUnitRecordKey === "army_units:adept")
      : (state.pieces || []).filter((piece) => piece.sideKey === sideKey && reservePiece(piece)
        && tags(piece).has("ground"));
    for (const target of targets) rows.push(systemDomain(state, route,
      { id: opportunity.assetId }, target,
      opportunity.opportunityKind.startsWith("set_adept")
        ? "shade_round_end_place" : "reserve_indicator_deploy",
      { opportunityId: opportunity.opportunityId, assetId: opportunity.assetId,
        placementPlanRequired: true }));
  }
  const pylonRoute = state.officialBattlefieldAssetFamilySourceBundle?.routes?.find((entry) => (
    entry.effectKind === "pylon_reserve_deploy"));
  if (pylonRoute && state.phase === "movement") {
    for (const pylon of (state.pieces || []).filter((piece) => piece.sideKey === sideKey
      && activePiece(piece) && piece.officialUnitRecordKey === "army_units:pylon")) {
      const already = (state.unitLifecycleUseHistory || []).some((entry) => (
        entry.effectKind === "pylon_warp_conduit_deploy" && entry.sourceInstanceId === pylon.id
          && Number(entry.round) === Number(state.round)));
      if (already) continue;
      for (const target of (state.pieces || []).filter((piece) => piece.sideKey === sideKey
        && reservePiece(piece) && tags(piece).has("ground"))) {
        rows.push(systemDomain(state, pylonRoute, pylon, target,
          "pylon_warp_conduit_deploy", { placementPlanRequired: true }));
      }
    }
  }
  return rows;
}
function enumerate(bundle, state, options = {}) {
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("UNIT_LIFECYCLE_SIDE_INVALID", sideKey);
  const primary = enumeratePrimary(bundle, state, options);
  const parameterDomains = [...primary.domains, ...omegaDomains(bundle, state, sideKey),
    ...crossFamilyDomains(state, sideKey)].sort((left, right) => (
    left.domainId.localeCompare(right.domainId)));
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_unit_lifecycle_legal_space_v1",
    runtimeId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    candidates: primary.disabled,
    parameterDomains,
    automaticDefinitionIds: bundle.routes.filter((entry) => !ACTIVE_EFFECTS.has(
      entry.effectKind)).map((entry) => entry.definitionId).sort(),
    crossFamilyConsumerDomainCount: parameterDomains.filter((entry) => (
      ["shade_round_end_place", "reserve_indicator_deploy",
        "pylon_warp_conduit_deploy"].includes(entry.effectKind))).length,
    continuousCoordinatesRequireInstantiation: true,
    rulesTruth: "official_current_product_unit_lifecycle_legal_space",
    trainingTruth: false,
  });
}

function canonicalPoint(value) {
  if (!object(value) || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) {
    fail("UNIT_LIFECYCLE_COORDINATE_INVALID");
  }
  return { xMilliInches: Number(value.xMilliInches),
    yMilliInches: Number(value.yMilliInches) };
}
function canonicalPlacement(value) {
  if (!object(value) || !Array.isArray(value.placements)
    || !String(value.leadingModelId || "")) fail("UNIT_LIFECYCLE_PLACEMENT_PLAN_INVALID");
  const placements = value.placements.map((entry) => {
    if (!String(entry?.modelId || "")
      || !Number.isSafeInteger(Number(entry.xMilliInches))
      || !Number.isSafeInteger(Number(entry.yMilliInches))) {
      fail("UNIT_LIFECYCLE_PLACEMENT_PLAN_INVALID");
    }
    return { modelId: String(entry.modelId), outcome: "placed",
      xMilliInches: Number(entry.xMilliInches), yMilliInches: Number(entry.yMilliInches),
      rotationDegrees: Number(entry.rotationDegrees || 0),
      ...(entry.contactModelId ? { contactModelId: String(entry.contactModelId) } : {}) };
  }).sort((left, right) => left.modelId.localeCompare(right.modelId));
  return { leadingModelId: String(value.leadingModelId), placements };
}
function canonicalModelElevation(value) {
  const normalized = String(value || "ground").trim().toLowerCase();
  if (normalized === "ground_level") return "ground";
  if (normalized === "mid_ground") return "mid";
  if (normalized === "high_ground") return "high";
  return normalized;
}
function paymentAllowed(domain, ids) {
  return domain.parameterSchema.paymentCardInstanceIds?.enum?.some((entry) => (
    isDeepStrictEqual(entry, ids)));
}
function makeSpecialPiece(state, sideKey, recordKey, pieceId) {
  const profile = combatProfile(state, recordKey);
  const geometry = getOfficialModelBaseGeometryProfileV1(
    state.officialModelBaseGeometryDataBundle, recordKey);
  const tier = profile.squadProfile.find((entry) => entry.maximumModels !== null);
  if (!tier) fail("UNIT_LIFECYCLE_SPECIAL_UNIT_COMPOSITION_MISSING", recordKey);
  const modelIds = Array.from({ length: tier.maximumModels }, (_, index) => (
    `${pieceId}-model-${index + 1}`));
  const isStructure = ["army_units:pylon", "army_units:point_defense_drone",
    "army_units:omega_worm"].includes(recordKey);
  const sizeCharacteristic = ({
    "army_units:point_defense_drone": 0,
    "army_units:pylon": 3,
    "army_units:roachling": 1,
    "army_units:omega_worm": 3,
  })[recordKey];
  if (!Number.isSafeInteger(sizeCharacteristic)) {
    fail("UNIT_LIFECYCLE_SPECIAL_UNIT_SIZE_MISSING", recordKey);
  }
  return {
    id: pieceId, unitInstanceId: pieceId, name: profile.unitName, unitName: profile.unitName,
    unitId: profile.unitId, sideKey, officialUnitRecordKey: recordKey,
    sourceRecordHash: profile.sourceRecordHash, officialPayloadHash: profile.payloadHash,
    formationSize: "small", compositionKind: "small", armySlotType: null,
    currentModels: modelIds.length, maxModels: modelIds.length,
    currentSupply: tier.supply, sizeCharacteristic,
    destroyedModelIds: [], isOnField: false, isInReserves: false,
    isDestroyed: false, isStructure,
    combatTag: profile.combatTags.includes("flying") ? "flying" : "ground",
    combatTags: [...profile.combatTags],
    coherencyStatus: { schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
      status: "special_deployment", isOutOfCoherency: false },
    statuses: profile.shield > 0 ? ["Shielded"] : [],
    firstModelShieldCapacityApplied: profile.shield > 0,
    selectedUpgradeNames: [], selectedUpgrades: [], equipment: [], weaponChoices: [],
    assignedUpgradeByModelId: Object.fromEntries(modelIds.map((id) => [id, []])),
    combatEffects: [], assaultEffects: [], damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    deploymentStatus: "special_ability_pending_placement",
    models: modelIds.map((id) => ({ id, baseShape: geometry.baseShape,
      baseWidthInches: geometry.baseWidthMilliInches / 1000,
      baseDepthInches: geometry.baseDepthMilliInches / 1000,
      baseRotationDegrees: 0, elevation: "ground", supportTerrainIds: [],
      adjacentAccessPointIds: [], damage: 0, remainingWounds: profile.hitPoints,
      isOnField: false, isDestroyed: false })),
    includedInArmyListDuringArmyBuilding: false,
    includedInFinalScore: false, trainingTruth: false,
  };
}
function placementResolution(state, pieceInput, placementPlan, options = {}) {
  const piece = clone(pieceInput);
  piece.isOnField = true; piece.isInReserves = false;
  piece.models = piece.models.map((model) => ({ ...model,
    isOnField: model.isDestroyed !== true }));
  const projected = clone(state);
  projected.pieces = projected.pieces.filter((entry) => entry.id !== piece.id).concat(piece);
  const coherency = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, projected,
      { pieceId: piece.id }).horizontalCoherencyMilliInches
    : 3000;
  const geometry = evaluateOfficialCoherencyPlacementV1({ state: projected, actor: piece,
    plan: { planId: `lifecycle-placement:${piece.id}`,
      leadingModelId: placementPlan.leadingModelId,
      placements: placementPlan.placements,
      currentlyEngagedEnemyUnitIds: [] },
    coherencyRangeMilliInches: coherency,
    dataBundle: state.officialModelBaseGeometryDataBundle });
  if (geometry.casualtyModelIds.length !== 0 || geometry.inCoherency !== true) {
    fail("UNIT_LIFECYCLE_ALL_MODELS_MUST_BE_PLACED_IN_COHERENCY");
  }
  const positions = new Map(geometry.placements.map((entry) => [entry.modelId, entry]));
  for (const model of piece.models) {
    const row = positions.get(model.id);
    model.xInches = row.footprint.center.xMilliInches / 1000;
    model.yInches = row.footprint.center.yMilliInches / 1000;
    model.baseRotationDegrees = row.footprint.rotationDegrees;
    model.elevation = options.groundLevelRequired
      ? "ground" : canonicalModelElevation(model.elevation);
  }
  projected.pieces = projected.pieces.map((entry) => entry.id === piece.id ? piece : entry);
  if (Number(options.minimumEnemyGapMilliInchesExclusive || 0) > 0) {
    const enemyGap = Math.min(Infinity, ...(projected.pieces || []).filter((entry) => (
      entry.sideKey !== piece.sideKey && activePiece(entry))).map((enemy) => (
      minimumUnitGap(projected, piece, enemy))));
    if (enemyGap <= Number(options.minimumEnemyGapMilliInchesExclusive)) {
      fail("UNIT_LIFECYCLE_ENEMY_SEPARATION_REQUIRED", String(enemyGap));
    }
  }
  if (options.anchorPieceId) {
    const anchor = projected.pieces.find((entry) => entry.id === options.anchorPieceId);
    const source = { kind: "model", unitId: piece.id,
      modelId: placementPlan.leadingModelId };
    const target = { kind: "model", unitId: anchor.id,
      modelId: options.anchorContactModelId };
    const contact = evaluateOfficialBaseMeasurementV1({ state: projected, source, target,
      dataBundle: state.officialModelBaseGeometryDataBundle });
    if (contact.baseToBaseContact !== true) {
      fail("UNIT_LIFECYCLE_PARENT_BASE_CONTACT_REQUIRED");
    }
  }
  return { piece, geometryHash: geometry.resultHash };
}
function validatePointInBoard(state, point, radius) {
  const x = point.xMilliInches / 1000; const y = point.yMilliInches / 1000;
  if (x - radius < 0 || y - radius < 0
    || x + radius > Number(state.board.widthInches)
    || y + radius > Number(state.board.heightInches)) {
    fail("UNIT_LIFECYCLE_FULL_BASE_OUTSIDE_BATTLEFIELD");
  }
}
function tumorPlan(state, actor, point) {
  const profile = getOfficialBattlefieldAssetComponentFootprintV1(
    state.officialBattlefieldAssetComponentProfile, "creep_tumor");
  const radius = profile.baseDiameterMm / 25.4 / 2;
  validatePointInBoard(state, point, radius);
  const center = { xInches: point.xMilliInches / 1000,
    yInches: point.yMilliInches / 1000 };
  const contact = liveModels(actor).some((model) => {
    const modelRadius = Math.max(Number(model.baseWidthInches),
      Number(model.baseDepthInches)) / 2;
    return Math.abs(Math.hypot(Number(model.xInches) - center.xInches,
      Number(model.yInches) - center.yInches) - modelRadius - radius) <= 0.002;
  });
  if (!contact) fail("UNIT_LIFECYCLE_PARENT_BASE_CONTACT_REQUIRED");
  const overlapsModel = (state.pieces || []).filter(activePiece).flatMap(liveModels)
    .some((model) => {
      const modelRadius = Math.max(Number(model.baseWidthInches),
        Number(model.baseDepthInches)) / 2;
      return Math.hypot(Number(model.xInches) - center.xInches,
        Number(model.yInches) - center.yInches) < modelRadius + radius - 0.001;
    });
  if (overlapsModel) fail("UNIT_LIFECYCLE_TUMOR_OVERLAP");
  return { profile, coordinate: { x: center.xInches, y: center.yInches } };
}
function validateMassRecallPoint(state, point) {
  validatePointInBoard(state, point, 0);
  return { x: point.xMilliInches / 1000, y: point.yMilliInches / 1000 };
}
function canonicalize(bundle, state, domain, parameters) {
  if (!object(parameters) || parameters.activeUnitId !== domain.pieceId) {
    fail("UNIT_LIFECYCLE_ACTION_INPUT_INVALID");
  }
  const result = { activeUnitId: domain.pieceId };
  if (domain.parameterSchema.paymentCardInstanceIds) {
    const paymentIds = [...new Set((parameters.paymentCardInstanceIds || []).map(String))].sort();
    if (!paymentAllowed(domain, paymentIds)) fail("UNIT_LIFECYCLE_PAYMENT_INVALID");
    result.paymentCardInstanceIds = paymentIds;
  }
  if (domain.parameterSchema.coordinate) result.coordinate = canonicalPoint(parameters.coordinate);
  if (domain.parameterSchema.placementPlan) {
    result.placementPlan = canonicalPlacement(parameters.placementPlan);
  }
  if (domain.parameterSchema.targetUnitId) {
    const targetUnitId = String(parameters.targetUnitId || "");
    if (!domain.parameterSchema.targetUnitId.enum.includes(targetUnitId)) {
      fail("UNIT_LIFECYCLE_TARGET_INVALID", targetUnitId);
    }
    result.targetUnitId = targetUnitId;
    result.targetContactModelId = String(parameters.targetContactModelId || "");
    if (!result.targetContactModelId) fail("UNIT_LIFECYCLE_CONTACT_MODEL_REQUIRED");
  }
  const route = bundle.routes.find((entry) => entry.definitionId === domain.definitionId);
  const actor = state.pieces.find((entry) => entry.id === domain.pieceId);
  if (route?.effectKind === "set_special_unit") {
    const ordinal = (state.pieces || []).filter((entry) => entry.specialDeployment === true).length + 1;
    const piece = makeSpecialPiece(state, domain.sideKey, route.createdUnitRecordKey,
      `special:${state.round}:${route.createdUnitRecordKey.split(":").at(-1)}:${ordinal}`);
    const placement = canonicalPlacement({ leadingModelId: piece.models[0].id,
      placements: [{ modelId: piece.models[0].id,
        xMilliInches: result.coordinate.xMilliInches,
        yMilliInches: result.coordinate.yMilliInches, rotationDegrees: 0 }] });
    result.createdPieceId = piece.id;
    result.placementPlan = placement;
    placementResolution(state, piece, placement, route);
  }
  if (route?.effectKind === "mass_recall") validateMassRecallPoint(state, result.coordinate);
  if (route?.effectKind === "spawn_creep_tumor") tumorPlan(state, actor, result.coordinate);
  if (route?.effectKind === "phase_prism_swap") {
    const target = state.pieces.find((entry) => entry.id === result.targetUnitId);
    if (!target?.models?.some((entry) => entry.id === result.targetContactModelId
      && entry.isDestroyed !== true)) fail("UNIT_LIFECYCLE_CONTACT_MODEL_INVALID");
    placementResolution(state, actor, result.placementPlan, {
      anchorPieceId: target.id, anchorContactModelId: result.targetContactModelId });
  }
  if (route?.effectKind === "summon_roachling") {
    const ordinal = (state.pieces || []).filter((entry) => entry.isSummoned === true).length + 1;
    const piece = makeSpecialPiece(state, domain.sideKey, route.createdUnitRecordKey,
      `summoned:${state.round}:roachling:${ordinal}`);
    if (result.placementPlan.placements.map((entry) => entry.modelId).join("|")
      !== piece.models.map((entry) => entry.id).sort().join("|")) {
      fail("UNIT_LIFECYCLE_SUMMON_MODEL_DENOMINATOR_INVALID");
    }
    result.createdPieceId = piece.id;
    const parentContactModelId = String(parameters.parentContactModelId || "");
    if (!actor.models.some((entry) => entry.id === parentContactModelId
      && entry.isDestroyed !== true)) fail("UNIT_LIFECYCLE_CONTACT_MODEL_INVALID");
    result.parentContactModelId = parentContactModelId;
    placementResolution(state, piece, result.placementPlan, {
      anchorPieceId: actor.id, anchorContactModelId: parentContactModelId });
  }
  if (route?.effectKind === "respawn_models") {
    const returnedModelIds = result.placementPlan.placements.map((entry) => entry.modelId);
    const temp = clone(state);
    const tempActor = temp.pieces.find((entry) => entry.id === actor.id);
    tempActor.derivedKeywords = [...new Set([...(tempActor.derivedKeywords || []),
      ...(isOfficialCurrentProductUnitOnCreepV1(state, actor) ? ["on_creep"] : [])])];
    const carrier = state.officialRespawnMorphDataBundle.currentRespawnCarriers[0];
    const event = { type: "special_ability_resolved", sideKey: actor.sideKey,
      pieceId: actor.id, abilityName: route.abilityName,
      abilityDefinitionHash: carrier.definitionHash, effectKeyword: "RESPAWN",
      baseRespawnValue: route.baseRespawnValue,
      onCreepRespawnValue: route.onCreepRespawnValue, trainingTruth: false };
    temp.log = [...(temp.log || []), { id: `preview-trigger:${temp.log?.length || 0}`,
      events: [event] }];
    const triggerEventHash = hashStarcraftTmgContract(event);
    const resolution = resolveOfficialRespawnModelsV1({
      respawnMorphDataBundle: state.officialRespawnMorphDataBundle,
      state: temp, pieceId: actor.id, procedureKind: "respawn_models",
      triggerEventHash, rulesOwnedRespawnRequested: true,
      placementPlan: { returnedModelIds, placements: result.placementPlan.placements },
    });
    result.triggerEvent = event; result.triggerEventHash = triggerEventHash;
    result.respawnResolution = resolution;
  }
  if (domain.actionType === "resolve_unit_lifecycle_consumer"
    && domain.parameterSchema.placementPlan) {
    const target = state.pieces.find((entry) => entry.id === domain.pieceId);
    if (domain.effectKind === "shade_round_end_place") {
      const token = (state.board?.tokens || []).find((entry) => (
        String(entry.tokenId || entry.id) === domain.sourceInstanceId));
      if (!token) fail("UNIT_LIFECYCLE_SHADE_TOKEN_MISSING");
      const placed = placementResolution(state, target, result.placementPlan, {}).piece;
      const leading = placed.models.find((entry) => (
        entry.id === result.placementPlan.leadingModelId));
      const shadeRadius = Number(token.baseDiameterInches || token.baseWidthInches || 0) / 2;
      const leadingRadius = Math.max(Number(leading.baseWidthInches),
        Number(leading.baseDepthInches)) / 2;
      const gap = Math.max(0, Math.hypot(Number(leading.xInches) - Number(token.coordinate.x),
        Number(leading.yInches) - Number(token.coordinate.y)) - shadeRadius - leadingRadius);
      if (gap > 3.001) fail("UNIT_LIFECYCLE_SHADE_LEADER_COHERENCY_REQUIRED");
    } else if (domain.effectKind === "reserve_indicator_deploy") {
      const marker = (state.board?.markers || []).find((entry) => (
        String(entry.markerId || entry.id) === domain.sourceInstanceId));
      if (!marker) fail("UNIT_LIFECYCLE_RESERVE_INDICATOR_MISSING");
      const placed = placementResolution(state, target, result.placementPlan, {}).piece;
      const leading = placed.models.find((entry) => (
        entry.id === result.placementPlan.leadingModelId));
      if (Math.hypot(Number(leading.xInches) - Number(marker.coordinate.x),
        Number(leading.yInches) - Number(marker.coordinate.y)) > 0.001) {
        fail("UNIT_LIFECYCLE_RESERVE_INDICATOR_ENTRY_POINT_REQUIRED");
      }
    } else {
      const source = state.pieces.find((entry) => entry.id === domain.constraints.sourcePieceId);
      if (!source) fail("UNIT_LIFECYCLE_ENTRY_SOURCE_MISSING");
      placementResolution(state, target, result.placementPlan, {
        anchorPieceId: source.id,
        anchorContactModelId: String(parameters.sourceContactModelId || source.models?.[0]?.id),
      });
      result.sourceContactModelId = String(parameters.sourceContactModelId
        || source.models?.[0]?.id);
    }
  }
  return result;
}
function instantiate(bundle, state, domain, parameters) {
  if (!object(domain) || domain.executorId !== OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID) {
    fail("UNIT_LIFECYCLE_PARAMETER_DOMAIN_INVALID");
  }
  const fresh = enumerate(bundle, state, { sideKey: domain.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!fresh || !isDeepStrictEqual(fresh, domain)) fail("UNIT_LIFECYCLE_PARAMETER_DOMAIN_STALE");
  const canonicalParameters = canonicalize(bundle, state, domain, parameters);
  const route = bundle.routes.find((entry) => entry.definitionId === domain.definitionId);
  const plan = seal({
    schema: "starcraft_tmg_official_unit_lifecycle_plan_v1",
    semanticVersion: "1.0.0",
    domainId: domain.domainId,
    definitionId: domain.definitionId,
    sourceFeatureHash: domain.sourceFeatureHash,
    sourceInstanceId: domain.sourceInstanceId,
    sideKey: domain.sideKey,
    pieceId: domain.pieceId,
    effectKind: domain.effectKind,
    canonicalParameters,
    domainConstraints: clone(domain.constraints),
    sourceRouteHash: route?.routeHash || domain.constraints.sourceRouteHash,
    stateHashBefore: hashStarcraftTmgContract(state),
    rulesTruth: "official_current_product_unit_lifecycle_plan",
    trainingTruth: false,
  }, "planHash");
  const action = freezeDeep({
    actionType: domain.actionType,
    sideKey: domain.sideKey,
    phase: state.phase,
    pieceId: domain.pieceId,
    definitionId: domain.definitionId,
    sourceFeatureHash: domain.sourceFeatureHash,
    effectKind: domain.effectKind,
    unitLifecyclePlan: plan,
    executorId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
  });
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_current_product_unit_lifecycle_instantiation",
    trainingTruth: false,
  });
}
function preview(bundle, state, request = {}) {
  const result = instantiate(bundle, state, request.domain, request.parameters || {});
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_unit_lifecycle_preview_v1",
    runtimeId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    action: result.action,
    deltas: [{ kind: result.action.effectKind,
      pieceId: result.action.pieceId,
      createdPieceId: result.canonicalParameters.createdPieceId || null,
      reversibleBeforeApply: true }],
    rulesTruth: "official_current_product_unit_lifecycle_preview",
    trainingTruth: false });
}
function pay(state, route, plan, events) {
  const ids = plan.canonicalParameters.paymentCardInstanceIds || [];
  if (route?.resourceType) {
    const cost = state.officialMatchLifecycleFamilySourceBundle
      ? resolveOfficialMatchLifecycleAbilityResourceCostV1(
        state.officialMatchLifecycleFamilySourceBundle, state,
        { sideKey: plan.sideKey, pieceId: plan.pieceId,
          resourceType: route.resourceType, printedResourceCost: route.resourceCost,
          planHash: plan.planHash }, { consume: true })
      : { effectiveResourceCost: route.resourceCost,
        resourceCostReduction: 0, discountSourcePieceId: null };
    const cards = ids.map((id) => cardById(state, plan.sideKey, id));
    if (cards.some((entry) => !entry)) fail("UNIT_LIFECYCLE_PAYMENT_CARD_UNKNOWN");
    const payment = resolveOfficialAbilityResourcePaymentV1({
      cardDataBundle: state.officialCardBuildPaymentDataBundle,
      resourceType: route.resourceType, resourceCost: cost.effectiveResourceCost,
      selectedCardInstanceSetComplete: true,
      selectedCardInstances: cards.map((card) => paymentRef(state, card)),
    });
    for (const id of payment.selectedCardsExhaustOnCommit) {
      cardById(state, plan.sideKey, id).readiness = "exhausted";
    }
    events.push({ type: "ability_resource_paid", resourceType: route.resourceType,
      resourceCost: cost.effectiveResourceCost,
      printedResourceCost: route.resourceCost,
      resourceCostReduction: cost.resourceCostReduction,
      discountSourcePieceId: cost.discountSourcePieceId,
      paymentResultHash: payment.resultHash,
      exhaustedCardInstanceIds: payment.selectedCardsExhaustOnCommit,
      trainingTruth: false });
  } else if (route?.sourceKind === "card_feature") {
    const card = cardById(state, plan.sideKey, plan.sourceInstanceId);
    if (!card || card.readiness !== "ready") fail("UNIT_LIFECYCLE_SOURCE_CARD_NOT_READY");
    card.readiness = "exhausted";
    events.push({ type: "tactical_card_exhausted", cardInstanceId: card.cardInstanceId,
      trainingTruth: false });
  }
}
function returnToReserves(state, piece, reason, events) {
  piece.isOnField = false; piece.isInReserves = true; piece.deploymentStatus = "in_reserves";
  for (const model of piece.models || []) {
    if (model.isDestroyed !== true) model.isOnField = false;
    delete model.xInches; delete model.yInches;
  }
  const battlefieldAssets = [...(state.board.tokens || []), ...(state.board.markers || [])];
  const removedAssets = (state.officialBattlefieldAssetBindings || []).filter((entry) => {
    const asset = battlefieldAssets.find((candidate) => String(
      candidate.tokenId || candidate.markerId || candidate.id) === entry.assetId);
    return entry.sourcePieceId === piece.id && asset?.stayInPlay !== true;
  }).map((entry) => entry.assetId);
  state.board.tokens = (state.board.tokens || []).filter((entry) => !removedAssets.includes(
    String(entry.tokenId || entry.id)));
  state.board.markers = (state.board.markers || []).filter((entry) => !removedAssets.includes(
    String(entry.markerId || entry.id)));
  state.officialBattlefieldAssetBindings = (state.officialBattlefieldAssetBindings || [])
    .filter((entry) => !removedAssets.includes(entry.assetId));
  events.push({ type: "unit_returned_to_reserves", pieceId: piece.id,
    currentSupplyReleased: Number(piece.currentSupply), reason,
    equipmentDamageAndTimedEffectsRetained: true, removedAssetIds: removedAssets,
    trainingTruth: false });
}
function addPlacedPiece(state, pieceInput, placementPlan, options, events) {
  const placed = placementResolution(state, pieceInput, placementPlan, options).piece;
  placed.isOnField = true; placed.isInReserves = false;
  placed.deploymentStatus = "deployed_by_special_ability";
  state.pieces = state.pieces.filter((entry) => entry.id !== placed.id).concat(placed);
  events.push({ type: "special_unit_deployed", pieceId: placed.id,
    recordKey: placed.officialUnitRecordKey, modelIds: liveModels(placed).map((entry) => entry.id),
    trainingTruth: false });
  return placed;
}
function sideHasBattlefieldPassive(state, sideKey, effectKind) {
  const route = state.officialBattlefieldAssetFamilySourceBundle?.routes?.find((entry) => (
    entry.effectKind === effectKind));
  if (!route) return false;
  if (route.sourceKind === "card_feature") {
    return (state.cardResources?.[sideKey] || []).some((card) => (
      card.officialCardRecordKey === route.recordKey));
  }
  return (state.pieces || []).some((piece) => piece.sideKey === sideKey
    && piece.officialUnitRecordKey === route.recordKey && activePiece(piece)
    && fieldedFeature(piece, route));
}
function applyPrimary(state, route, action, events) {
  const plan = action.unitLifecyclePlan;
  const parameters = plan.canonicalParameters;
  const actor = state.pieces.find((entry) => entry.id === action.pieceId);
  if (route.effectKind === "set_special_unit") {
    const piece = makeSpecialPiece(state, action.sideKey, route.createdUnitRecordKey,
      parameters.createdPieceId);
    const placed = addPlacedPiece(state, piece, parameters.placementPlan, route, events);
    placed.specialDeployment = true;
    placed.specialDeploymentSourceDefinitionId = route.definitionId;
    placed.specialAbilitiesSuppressedUntilRoundEnd = route.suppressSpecialAbilitiesThisRound;
    placed.removeAtRoundEnd = route.removeAtRoundEnd;
  } else if (route.effectKind === "summon_roachling") {
    const piece = makeSpecialPiece(state, action.sideKey, route.createdUnitRecordKey,
      parameters.createdPieceId);
    const placed = addPlacedPiece(state, piece, parameters.placementPlan, {
      anchorPieceId: actor.id, anchorContactModelId: parameters.parentContactModelId,
    }, events);
    placed.isSummoned = true; placed.summonParentPieceId = actor.id;
    placed.summonedInRound = Number(state.round); placed.summonedInPhase = state.phase;
    placed.activatedPhases[state.phase] = true;
  } else if (route.effectKind === "respawn_models") {
    const patch = parameters.respawnResolution.mutation.piecePatches[0];
    if (hashStarcraftTmgContract(actor) !== patch.expectedBeforePieceHash) {
      const adjusted = clone(actor);
      adjusted.derivedKeywords = [...new Set([...(adjusted.derivedKeywords || []),
        ...(isOfficialCurrentProductUnitOnCreepV1(state, actor) ? ["on_creep"] : [])])];
      if (hashStarcraftTmgContract(adjusted) !== patch.expectedBeforePieceHash) {
        fail("UNIT_LIFECYCLE_RESPAWN_PRECONDITION_DRIFT");
      }
    }
    Object.assign(actor, clone(patch.set));
    events.push(parameters.triggerEvent, { type: "models_respawned", pieceId: actor.id,
      returnedModelIds: parameters.respawnResolution.returnedModelIds,
      onCreep: parameters.respawnResolution.onCreep,
      resolutionHash: parameters.respawnResolution.resultHash, trainingTruth: false });
  } else if (route.effectKind === "return_active_ground_to_reserves") {
    actor.activatedPhases[state.phase] = true;
    returnToReserves(state, actor, route.abilityName, events);
  } else if (route.effectKind === "phase_prism_swap") {
    const target = state.pieces.find((entry) => entry.id === parameters.targetUnitId);
    returnToReserves(state, target, "Phase Prism", events);
    const placed = addPlacedPiece(state, actor, parameters.placementPlan, {}, events);
    placed.activatedPhases[state.phase] = true;
  } else if (route.effectKind === "mass_recall") {
    const coordinate = validateMassRecallPoint(state, parameters.coordinate);
    const markerId = `marker:${state.round}:mass-recall:${state.board.markers.length + 1}`;
    const marker = createOfficialBattlefieldMarkerV1({
      registry: state.officialBattlefieldTokenMarkerRegistry,
      markerId, markerKind: "faction_indicator", markerRole: "mass_recall",
      coordinate, sideKey: action.sideKey, stayInPlay: false,
    });
    state.board.markers.push(marker);
    const returned = [];
    for (const piece of (state.pieces || []).filter((entry) => entry.sideKey === action.sideKey
      && activePiece(entry) && combatProfile(state, entry.officialUnitRecordKey).faction === "Protoss")) {
      const within = liveModels(piece).some((model) => {
        const radius = Math.max(Number(model.baseWidthInches),
          Number(model.baseDepthInches)) / 2;
        return Math.max(0, Math.hypot(Number(model.xInches) - coordinate.x,
          Number(model.yInches) - coordinate.y) - radius) <= route.rangeMilliInches / 1000;
      });
      if (within) { returnToReserves(state, piece, "Mass Recall", events); returned.push(piece.id); }
    }
    events.push({ type: "mass_recall_resolved", markerId,
      returnedPieceIds: returned.sort(), trainingTruth: false });
  } else if (route.effectKind === "spawn_creep_tumor") {
    const planValue = tumorPlan(state, actor, parameters.coordinate);
    const tokenId = `asset:${state.round}:creep-tumor:${state.board.tokens.length + 1}`;
    const stayInPlay = sideHasBattlefieldPassive(
      state, action.sideKey, "creep_stay_displacement");
    const token = createOfficialBattlefieldTokenV1({
      registry: state.officialBattlefieldTokenMarkerRegistry,
      tokenId, tokenKind: "creep_tumor", coordinate: planValue.coordinate,
      baseShape: "round", baseDiameterMm: planValue.profile.baseDiameterMm,
      stayInPlay, createdByPieceId: actor.id, createdRound: state.round,
    });
    state.board.tokens.push(token);
    const binding = seal({
      schema: "starcraft_tmg_official_battlefield_asset_binding_v1",
      assetId: tokenId, assetKind: "creep_tumor", assetSchema: token.schema,
      assetHash: token.tokenHash, sideKey: action.sideKey, sourcePieceId: actor.id,
      sourceInstanceId: plan.sourceInstanceId, sourceDefinitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash, effectKind: route.effectKind,
      createdRound: Number(state.round), displacement: stayInPlay, stayInPlay,
      lifecycleEvent: null, consumed: false, trainingTruth: false,
    }, "bindingHash");
    state.officialBattlefieldAssetBindings = state.officialBattlefieldAssetBindings || [];
    state.officialBattlefieldAssetBindings.push(binding);
    events.push({ type: "battlefield_asset_created", assetId: tokenId,
      assetKind: "creep_tumor", assetHash: token.tokenHash,
      bindingHash: binding.bindingHash, coordinate: planValue.coordinate,
      trainingTruth: false });
  }
}
function applyConsumer(state, action, events) {
  const plan = action.unitLifecyclePlan;
  const target = state.pieces.find((entry) => entry.id === action.pieceId);
  const source = state.pieces.find((entry) => entry.id === plan.sourceInstanceId);
  if (["omega_network_return"].includes(action.effectKind)) {
    returnToReserves(state, target, "Omega Network", events);
    return;
  }
  if (action.effectKind === "shade_round_end_place") {
    const placement = placementResolution(state, target,
      plan.canonicalParameters.placementPlan, {}).piece;
    state.pieces = state.pieces.map((entry) => entry.id === target.id ? placement : entry);
    state.pendingBattlefieldAssetOpportunities = (state.pendingBattlefieldAssetOpportunities || [])
      .filter((entry) => entry.opportunityId !== plan.domainConstraints?.opportunityId);
    events.push({ type: "shade_round_end_place_resolved", pieceId: target.id,
      assetId: plan.sourceInstanceId, trainingTruth: false });
    return;
  }
  let placed;
  if (action.effectKind === "reserve_indicator_deploy") {
    placed = placementResolution(state, target,
      plan.canonicalParameters.placementPlan, {}).piece;
    state.pendingBattlefieldAssetOpportunities = (state.pendingBattlefieldAssetOpportunities || [])
      .filter((entry) => entry.opportunityId !== plan.domainConstraints?.opportunityId);
  } else {
    if (!source) fail("UNIT_LIFECYCLE_ENTRY_SOURCE_MISSING");
    placed = placementResolution(state, target,
      plan.canonicalParameters.placementPlan, {
        anchorPieceId: source.id,
        anchorContactModelId: plan.canonicalParameters.sourceContactModelId,
      }).piece;
  }
  placed.isOnField = true; placed.isInReserves = false;
  placed.deploymentStatus = "deployed_by_lifecycle_consumer";
  placed.activatedPhases[state.phase] = true;
  state.pieces = state.pieces.map((entry) => entry.id === target.id ? placed : entry);
  events.push({ type: "reserve_deployed_via_special_entry", pieceId: target.id,
    sourcePieceId: source?.id || null, sourceAssetId: source ? null : plan.sourceInstanceId,
    effectKind: action.effectKind,
    currentSupply: Number(target.currentSupply), trainingTruth: false });
}
function apply(bundle, stateInput, request = {}) {
  const action = request.action;
  const domain = enumerate(bundle, stateInput, { sideKey: action?.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => (
    entry.domainId === action?.unitLifecyclePlan?.domainId));
  if (!domain) fail("UNIT_LIFECYCLE_PARAMETER_DOMAIN_STALE");
  const expected = instantiate(bundle, stateInput, domain,
    action.unitLifecyclePlan.canonicalParameters);
  if (!isDeepStrictEqual(expected.action, action)) fail("UNIT_LIFECYCLE_ACTION_STALE");
  const route = bundle.routes.find((entry) => entry.definitionId === action.definitionId);
  const state = clone(stateInput); const events = [];
  pay(state, route, action.unitLifecyclePlan, events);
  if (route && ACTIVE_EFFECTS.has(route.effectKind)) applyPrimary(state, route, action, events);
  else applyConsumer(state, action, events);
  state.unitLifecycleUseHistory = state.unitLifecycleUseHistory || [];
  state.unitLifecycleUseHistory.push({ round: Number(state.round), phase: state.phase,
    sideKey: action.sideKey, pieceId: action.pieceId,
    definitionId: action.definitionId,
    sourceInstanceId: action.unitLifecyclePlan.sourceInstanceId,
    effectKind: action.effectKind,
    currentSupply: Number(state.pieces.find((entry) => entry.id === action.pieceId)
      ?.currentSupply || 0),
    planHash: action.unitLifecyclePlan.planHash, trainingTruth: false });
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(action), events: clone(events) });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_unit_lifecycle_transition_v1",
    runtimeId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    postRevision: Number(request.options?.postRevision || 0),
    state: freezeDeep(state), action: clone(action), events,
    rulesTruth: "official_current_product_unit_lifecycle_transition",
    trainingTruth: false });
}
function lifecycle(bundle, stateInput, request = {}) {
  const eventKind = String(request.eventKind || "");
  if (!["round_end", "cleanup_and_refresh"].includes(eventKind)) return null;
  const state = clone(stateInput); const events = [];
  if (eventKind === "round_end") {
    for (const piece of state.pieces || []) {
      if (activePiece(piece) && piece.removeAtRoundEnd === true) {
        piece.isOnField = false; piece.isInReserves = false; piece.isDestroyed = true;
        piece.currentModels = 0; piece.currentSupply = 0;
        for (const model of piece.models || []) {
          model.isOnField = false; model.isDestroyed = true; model.remainingWounds = 0;
        }
        events.push({ type: "special_unit_removed_at_round_end", pieceId: piece.id,
          trainingTruth: false });
      }
      if (piece.specialAbilitiesSuppressedUntilRoundEnd === true) {
        piece.specialAbilitiesSuppressedUntilRoundEnd = false;
        events.push({ type: "special_unit_abilities_restored", pieceId: piece.id,
          structureAbilityRemainedActive: true, trainingTruth: false });
      }
    }
  }
  if (eventKind === "cleanup_and_refresh") {
    state.pendingBattlefieldAssetOpportunities = [];
  }
  if (events.length === 0) return state;
  state.unitLifecycleHistory = state.unitLifecycleHistory || [];
  state.unitLifecycleHistory.push({ round: Number(state.round), phase: state.phase,
    eventKind, events: clone(events), trainingTruth: false });
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: { actionType: "unit_lifecycle", eventKind },
    events: clone(events) });
  return state;
}
function query(bundle, state, request = {}) {
  const queryKind = String(request.queryKind || request.kind || "");
  let result;
  if (queryKind === "instantiate_parameterized_action") {
    const domain = enumerate(bundle, state, { sideKey: request.sideKey
      || state.activeSideKey, includeDisabled: true }).parameterDomains.find((entry) => (
      entry.domainId === request.domainId));
    if (!domain) fail("UNIT_LIFECYCLE_QUERY_DOMAIN_STALE");
    const value = preview(bundle, state, { domain, parameters: request.parameters || {} });
    result = { preview: value, action: value.action };
  } else if (queryKind === "definition_routes") {
    result = { routes: clone(bundle.routes), routeCount: bundle.routeCount };
  } else if (queryKind === "reserve_inventory") {
    result = { bySide: Object.fromEntries([...SIDE_KEYS].map((sideKey) => [sideKey,
      (state.pieces || []).filter((piece) => piece.sideKey === sideKey && reservePiece(piece))
        .map((piece) => ({ pieceId: piece.id, recordKey: piece.officialUnitRecordKey,
          currentModels: piece.currentModels, currentSupply: piece.currentSupply,
          retainedDamage: piece.damageMarker || 0 })).sort((left, right) => (
          left.pieceId.localeCompare(right.pieceId)))])),
      pendingOpportunities: clone(state.pendingBattlefieldAssetOpportunities || []) };
  } else fail("UNIT_LIFECYCLE_QUERY_KIND_UNSUPPORTED", queryKind);
  return seal({ schema: "starcraft_tmg_official_unit_lifecycle_query_v1",
    semanticVersion: "1.0.0", queryKind, precision: "exact", result,
    source: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialUnitLifecycleFamilyAdapterV1(bundle) {
  verifyOfficialUnitLifecycleFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_UNIT_LIFECYCLE_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime",
    coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "lifecycle"],
    archetypeCounts: { ...bundle.archetypeCounts },
    sourceBundleHash: bundle.bundleHash,
    completeModelDenominatorsRequired: true,
    fullBaseGeometryAndCoherencyOwnedByRules: true,
    reserveStateRetainsDamageLoadoutAndTimedEffects: true,
    optionalCrossFamilyLifecycleOpportunitiesExposed: true,
    legalSpacePreviewApplyReplaySequencePreserved: true,
    rulesAuthority: true, trainingTruth: false,
  });
  return freezeDeep({ descriptor,
    legalSpace: (state, options = {}) => enumerate(bundle, state, options),
    preview: (state, request = {}) => preview(bundle, state, request),
    apply: (state, request = {}) => apply(bundle, state, request),
    query: (state, request = {}) => query(bundle, state, request),
    lifecycle: (state, request = {}) => lifecycle(bundle, state, request),
  });
}
