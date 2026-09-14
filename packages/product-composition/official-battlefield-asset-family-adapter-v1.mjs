import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { resolveOfficialAbilityResourcePaymentV1 } from
  "../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs";
import {
  createOfficialBattlefieldMarkerV1,
  createOfficialBattlefieldTokenV1,
  resolveOfficialTokenMarkerCleanupV1,
} from "../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { getOfficialBattlefieldAssetComponentFootprintV1 } from
  "../source-data/official-battlefield-asset-component-profile-v1.mjs";
import { getOfficialCardBuildPaymentProfileV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";

export const OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID =
  "official-battlefield-asset-family-adapter-v1";
export const OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_BATTLEFIELD_ASSET_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_battlefield_asset_family_source_bundle_v1";
export const OFFICIAL_BATTLEFIELD_ASSET_FAMILY_PARAMETER_KIND =
  "official_battlefield_asset_family_plan_v1";

const SIDE_KEYS = new Set(["player1", "player2"]);
const ACTIVE_EFFECTS = new Set([
  "creep_token_place", "detection_indicator", "force_field_place",
  "on_creep_speed_active", "orders", "reserve_deploy_indicator", "shade_token_place",
]);
const COORDINATE_EFFECTS = new Set([
  "creep_token_place", "detection_indicator", "force_field_place",
  "reserve_deploy_indicator", "shade_token_place",
]);
const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  creep_removal: 1,
  creep_stay_displacement: 1,
  creep_token_place: 3,
  detection_indicator: 3,
  force_field_place: 2,
  marker_armour: 1,
  on_creep_impact: 1,
  on_creep_speed_active: 3,
  on_creep_speed_passive: 1,
  orders: 1,
  pylon_pe_discount: 1,
  pylon_reserve_deploy: 1,
  reserve_deploy_indicator: 3,
  shade_precision: 1,
  shade_token_place: 1,
  source_of_creep: 1,
  stationary_evade: 1,
  structure: 3,
  zerg_creep_build: 1,
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
function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("BATTLEFIELD_ASSET_SIDE_INVALID", sideKey);
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function liveModels(piece) {
  return (piece?.models || []).filter((model) => model?.isDestroyed !== true
    && model?.isOnField !== false);
}
function tags(piece) {
  return new Set([piece?.combatTag, ...(piece?.combatTags || [])]
    .map(normalized).filter(Boolean));
}
function statusNamed(piece, names) {
  const expected = new Set(names.map(normalized));
  return (piece?.statuses || []).some((entry) => expected.has(normalized(
    typeof entry === "string" ? entry : entry?.statusName || entry?.name || entry?.status,
  )));
}
function modelRadius(model) {
  return Math.max(Number(model?.baseWidthInches || 0),
    Number(model?.baseDepthInches || model?.baseWidthInches || 0)) / 2;
}
function pointForModel(model) {
  return { x: Number(model?.xInches), y: Number(model?.yInches) };
}
function distance(left, right) {
  return Math.hypot(Number(left.x) - Number(right.x), Number(left.y) - Number(right.y));
}
function baseGap(leftPoint, leftRadius, rightPoint, rightRadius) {
  return Math.max(0, distance(leftPoint, rightPoint) - leftRadius - rightRadius);
}
function roundFootprint(point, radius) {
  return { shape: "round", point, radius };
}
function rectangleFootprint(point, halfWidth, halfDepth) {
  return { shape: "axis_aligned_rectangle", point, halfWidth, halfDepth };
}
function footprintGap(left, right) {
  if (left.shape === "round" && right.shape === "round") {
    return baseGap(left.point, left.radius, right.point, right.radius);
  }
  if (left.shape === "axis_aligned_rectangle"
    && right.shape === "axis_aligned_rectangle") {
    const dx = Math.max(0, Math.abs(left.point.x - right.point.x)
      - left.halfWidth - right.halfWidth);
    const dy = Math.max(0, Math.abs(left.point.y - right.point.y)
      - left.halfDepth - right.halfDepth);
    return Math.hypot(dx, dy);
  }
  const circle = left.shape === "round" ? left : right;
  const rectangle = left.shape === "axis_aligned_rectangle" ? left : right;
  const dx = Math.max(0, Math.abs(circle.point.x - rectangle.point.x)
    - rectangle.halfWidth);
  const dy = Math.max(0, Math.abs(circle.point.y - rectangle.point.y)
    - rectangle.halfDepth);
  return Math.max(0, Math.hypot(dx, dy) - circle.radius);
}
function unitWithin(source, target, rangeInches) {
  const gaps = liveModels(source).flatMap((left) => liveModels(target).map((right) => (
    baseGap(pointForModel(left), modelRadius(left), pointForModel(right), modelRadius(right))
  )));
  return gaps.length > 0 && Math.min(...gaps) <= Number(rangeInches) + 0.001;
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
  const sourceKind = definition.sourceProductKind === "unit"
    ? "unit_feature" : "card_feature";
  const costMatch = String(definition.activationText || "").match(
    /\((\d+)\s+(Command Point|Biomass|Psionic Energy)\)/iu);
  const resourceType = !costMatch ? null
    : normalized(costMatch[2]) === "command point" ? "CP"
      : normalized(costMatch[2]) === "biomass" ? "BM" : "PE";
  return {
    schema: "starcraft_tmg_official_battlefield_asset_definition_route_v1",
    semanticVersion: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION,
    definitionId: definition.definitionId,
    sourceFeatureHash: definition.sourceFeatureHash,
    recordKey: definition.recordKey,
    sourceKind,
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
    resourceType, resourceCost: Number(costMatch?.[1] || 0),
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
  if (name === "Khalai Ingenuity" && /Within 4.+PE cost is reduced by 1/iu.test(text)) {
    spec = { effectKind: "pylon_pe_discount", actionKind: "query_modifier",
      rangeInches: 4, resourceTypeAffected: "PE", resourceCostReduction: 1,
      oncePerRound: true };
  } else if (["Oversight Mode", "Surveillance", "Scanner Sweep"].includes(name)
    && /Set a Faction Indicator anywhere.+Within 6.+lose HIDDEN/iu.test(text)) {
    spec = { effectKind: "detection_indicator", actionKind: "active_ability",
      markerRole: "detection_aura", rangeInches: 6, removesHidden: true };
  } else if (name === "Creep Spread" || name === "Excrete Creep") {
    if (!/Set a Creep Tumor token.+Within 6.+Friendly Entry Edge.+Creep Tumor/iu.test(text)) {
      fail("BATTLEFIELD_ASSET_CREEP_SPREAD_SOURCE_DRIFT", definition.recordKey);
    }
    spec = { effectKind: "creep_token_place", actionKind: "active_ability",
      tokenKind: "creep_tumor", rangeInches: 6, lineOfSightRequired: false };
  } else if (name === "Warp Conduit" && definition.sourceProductKind !== "unit") {
    spec = { effectKind: "reserve_deploy_indicator", actionKind: "active_ability",
      markerRole: "reserve_deploy_beacon", minimumEnemyGapInches: 10,
      lifecycleEvent: "round_end", reserveUnitTag: "ground" };
  } else if (["Ventral Sacs", "Ready For Dust-off"].includes(name)) {
    spec = { effectKind: "reserve_deploy_indicator", actionKind: "active_ability",
      markerRole: "reserve_deploy_beacon", minimumEnemyGapInches: 10,
      lifecycleEvent: "round_end", reserveUnitTag: "ground" };
  } else if (name === "Creep Removal") {
    spec = { effectKind: "creep_removal", actionKind: "automatic_consumer",
      triggerActions: ["move", "deploy", "run", "charge", "disengage"],
      rangeInches: 1, placeDoesNotTrigger: true };
  } else if (name === "Living Glob of Tissue") {
    spec = { effectKind: "creep_stay_displacement", actionKind: "automatic_consumer",
      stayInPlay: true, displacement: true };
  } else if (name === "Source of Creep") {
    spec = { effectKind: "source_of_creep", actionKind: "query_modifier",
      rangeInches: 6, targetTags: ["ground", "zerg"], friendlyOrEnemy: true };
  } else if (name === "Glial Reconstitution") {
    spec = { effectKind: "on_creep_speed_active", actionKind: "active_ability",
      speedModifierOffCreep: 1, speedModifierOnCreep: 2,
      expiresAt: "cleanup_and_refresh" };
  } else if (name === "Structure") {
    spec = { effectKind: "structure", actionKind: "automatic_consumer",
      cannotActivate: true, cannotPerformActions: true, currentSupplySetTo: 0,
      cannotControlOrContest: true, abilityTargetProhibitedUnlessExplicitlyAllowed: true };
  } else if (name === "Warp Conduit" && definition.sourceProductKind === "unit") {
    spec = { effectKind: "pylon_reserve_deploy", actionKind: "system_lifecycle",
      oncePerRound: true, reserveUnitTag: "ground", sourceBaseIsEntryEdge: true,
      endsDeployedUnitActivation: true };
  } else if (name === "Creep Speed") {
    spec = { effectKind: "on_creep_speed_passive", actionKind: "query_modifier",
      speedModifier: 2 };
  } else if (name === "Veteran of Tarsonis") {
    spec = { effectKind: "marker_armour", actionKind: "query_modifier",
      markerRangeInches: 3, armourModifier: 1 };
  } else if (name === "Psionic Transfer") {
    spec = { effectKind: "shade_token_place", actionKind: "active_ability",
      tokenKind: "shade", whollyWithinInches: 12, displacement: true,
      lifecycleEvent: "round_end" };
  } else if (name === "Lurking") {
    spec = { effectKind: "stationary_evade", actionKind: "query_modifier",
      requiresStatus: "stationary", firstRangedAttackPerRound: true,
      onCreepEvadeModifier: 1 };
  } else if (name === "Orders") {
    spec = { effectKind: "orders", actionKind: "active_ability", repeatable: true,
      rangeInches: 8, targetTag: "biological",
      choices: [
        { choice: "critical_hit_2", resourceType: "CP", resourceCost: 1,
          firstWeaponCriticalHit: 2 },
        { choice: "ignore_disengage_penalty", resourceType: "CP", resourceCost: 1,
          expiresAt: "round_end" },
        { choice: "remove_activation_marker", resourceType: "CP", resourceCost: 2 },
      ] };
  } else if (["Force Field", "Solid-Field Projectors"].includes(name)) {
    spec = { effectKind: "force_field_place", actionKind: "active_ability",
      tokenKind: "force_field", rangeInches: 8, unoccupiedSpaceRequired: true,
      maximumBlockedSize: 2, minimumCrossingRemovalSize: 3 };
  } else if (name === "Zerg Creep") {
    spec = { effectKind: "zerg_creep_build", actionKind: "system_lifecycle",
      armyBuildingOnly: true, exactCreepCardCount: 1, listedCostRequired: true };
  } else if (name === "Psionic Presence") {
    spec = { effectKind: "shade_precision", actionKind: "query_modifier",
      enemyShadeRangeInches: 4, precision: 1, allFriendlyWeapons: true };
  } else if (name === "Malevolent Matriarch") {
    spec = { effectKind: "on_creep_impact", actionKind: "query_modifier",
      requiredPhase: "assault", triggerAction: "charge", impactHitModifier: 1 };
  }
  if (!spec) fail("BATTLEFIELD_ASSET_DEFINITION_COMPILER_UNRECOGNIZED",
    `${definition.recordKey}:${name}`);
  return seal(routeBase(definition, spec), "routeHash");
}

export function createOfficialBattlefieldAssetFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("BATTLEFIELD_ASSET_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pending = new Set(denominator.gapDefinitionIds);
  const owned = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 237 && pending.has(entry.definitionId)));
  const definitions = owned.map((entry) => catalogue.definitions.find((candidate) => (
    candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 30 || definitions.some((entry) => !entry)) {
    fail("BATTLEFIELD_ASSET_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(compileRoute).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    routeCount: routes.length, archetypeCounts, routes,
    definitionIds: routes.map((entry) => entry.definitionId),
    coveredSourceFeatureHashes: routes.map((entry) => entry.sourceFeatureHash).sort(),
    physicalTokenProfileAuthority:
      "official_and_user_confirmed_component_profiles",
    missingPhysicalProfileFailsOnlyAffectedCoordinateDomain: true,
    compilerDenominatorComplete: true, exactSourcePatternsRequired: true,
    arbitraryProseExecutionClaimed: false, sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_battlefield_asset_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialBattlefieldAssetFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialBattlefieldAssetFamilySourceBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_BATTLEFIELD_ASSET_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 30 || bundle.routes?.length !== 30
    || new Set(bundle.definitionIds || []).size !== 30
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 30
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 30
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.missingPhysicalProfileFailsOnlyAffectedCoordinateDomain !== true
    || bundle.compilerDenominatorComplete !== true
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("BATTLEFIELD_ASSET_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialBattlefieldAssetFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialBattlefieldAssetFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION,
    capability: route.actionKind === "active_ability"
      ? "authoritative_action" : route.runtimeRole,
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
function paymentSelections(state, sideKey, resourceType, resourceCost) {
  if (!resourceType || resourceCost === 0) return [[]];
  const cards = (state.cardResources?.[sideKey] || []).filter((entry) => (
    entry.readiness === "ready"));
  const rows = [];
  for (let mask = 0; mask < (1 << cards.length); mask += 1) {
    const selected = cards.filter((_, index) => (mask & (1 << index)) !== 0);
    try {
      resolveOfficialAbilityResourcePaymentV1({
        cardDataBundle: state.officialCardBuildPaymentDataBundle,
        resourceType, resourceCost, selectedCardInstanceSetComplete: true,
        selectedCardInstances: selected.map((card) => paymentRef(state, card)),
      });
      rows.push(selected.map((entry) => entry.cardInstanceId).sort());
    } catch { /* Illegal selections are absent from LegalSpace. */ }
  }
  return rows.sort((left, right) => left.join("|").localeCompare(right.join("|")));
}
function routeInstances(state, route) {
  if (route.sourceKind === "unit_feature") {
    return (state.pieces || []).filter((piece) => piece.officialUnitRecordKey === route.recordKey
      && activePiece(piece) && fieldedFeature(piece, route)
      && (piece.specialAbilitiesSuppressedUntilRoundEnd !== true
        || route.effectKind === "structure")).map((piece) => ({
      sourceInstanceId: piece.id, sideKey: piece.sideKey, sourcePiece: piece,
    }));
  }
  return Object.entries(state.cardResources || {}).flatMap(([sideKey, cards]) => (
    (cards || []).filter((card) => card.officialCardRecordKey === route.recordKey)
      .map((card) => ({ sourceInstanceId: card.cardInstanceId, sideKey, card }))
  ));
}
function actionActors(state, route, instance) {
  if (route.sourceKind === "unit_feature") return [instance.sourcePiece];
  return (state.pieces || []).filter((piece) => piece.sideKey === instance.sideKey
    && activePiece(piece) && piece.isStructure !== true);
}
function tokenProfile(state, kind) {
  const component = getOfficialBattlefieldAssetComponentFootprintV1(
    state.officialBattlefieldAssetComponentProfile, kind);
  return { baseShape: component.baseShape,
    baseWidthMm: component.baseWidthMm, baseDepthMm: component.baseDepthMm,
    baseDiameterMm: component.baseDiameterMm,
    profileId: `${kind}:${component.authority}`,
    agreementHash: component.evidenceHash, sourceUrl: component.sourceUrl };
}
function usedThisRound(state, route, sourceInstanceId) {
  if (route.repeatable === true) return false;
  return (state.battlefieldAssetUseHistory || []).some((entry) => (
    Number(entry.round) === Number(state.round)
      && entry.definitionId === route.definitionId
      && entry.sourceInstanceId === sourceInstanceId));
}
export function resolveOfficialBattlefieldAssetAbilityResourceCostV1(
  bundle, state, request = {}, options = {},
) {
  verifyOfficialBattlefieldAssetFamilySourceBundleV1(bundle);
  const printedResourceCost = Math.max(0, Number(request.printedResourceCost || 0));
  const resourceType = String(request.resourceType || "").toUpperCase();
  const piece = state.pieces?.find((entry) => entry.id === request.pieceId);
  const pylonRoute = bundle.routes.find((entry) => entry.effectKind === "pylon_pe_discount");
  const pylon = resourceType === "PE" && printedResourceCost > 0 && piece
    ? routeInstances(state, pylonRoute).find((instance) => (
      instance.sideKey === request.sideKey
        && activePiece(instance.sourcePiece)
        && !usedThisRound(state, pylonRoute, instance.sourceInstanceId)
        && unitWithin(instance.sourcePiece, piece, pylonRoute.rangeInches)))
    : null;
  const reduction = pylon ? Number(pylonRoute.resourceCostReduction) : 0;
  const result = freezeDeep({ resourceType, printedResourceCost,
    resourceCostReduction: reduction,
    effectiveResourceCost: Math.max(0, printedResourceCost - reduction),
    sourcePieceId: pylon?.sourceInstanceId || null,
    sourceDefinitionId: pylon ? pylonRoute.definitionId : null,
    applied: Boolean(pylon), trainingTruth: false });
  if (pylon && options.consume === true) {
    state.battlefieldAssetUseHistory = state.battlefieldAssetUseHistory || [];
    state.battlefieldAssetUseHistory.push({ round: Number(state.round), phase: state.phase,
      sideKey: request.sideKey, pieceId: request.pieceId,
      definitionId: pylonRoute.definitionId,
      sourceInstanceId: pylon.sourceInstanceId,
      effectKind: pylonRoute.effectKind, assetId: null,
      planHash: request.planHash || null, trainingTruth: false });
  }
  return result;
}
function available(state, route, instance, actor) {
  if (!SIDE_KEYS.has(instance.sideKey) || state.activeSideKey !== instance.sideKey
    || (route.phase !== "any" && route.phase !== state.phase)
    || !activePiece(actor) || actor.sideKey !== instance.sideKey
    || actor.isStructure === true || usedThisRound(state, route, instance.sourceInstanceId)) {
    fail("BATTLEFIELD_ASSET_ROUTE_UNAVAILABLE", route.definitionId);
  }
  if (instance.card && instance.card.readiness !== "ready") {
    fail("BATTLEFIELD_ASSET_SOURCE_CARD_NOT_READY", instance.sourceInstanceId);
  }
  if (COORDINATE_EFFECTS.has(route.effectKind)) tokenProfileRequiredForRoute(state, route);
  let targets = [];
  if (route.effectKind === "orders") {
    targets = (state.pieces || []).filter((target) => target.sideKey === actor.sideKey
      && target.id !== actor.id && activePiece(target) && target.isStructure !== true
      && tags(target).has(route.targetTag)
      && unitWithin(actor, target, route.rangeInches)).map((entry) => entry.id).sort();
    if (targets.length === 0) fail("BATTLEFIELD_ASSET_TARGET_UNAVAILABLE", route.abilityName);
  }
  const choices = route.effectKind === "orders" ? route.choices : [{
    choice: "default", resourceType: route.resourceType, resourceCost: route.resourceCost,
  }];
  const costsByChoice = Object.fromEntries(choices.map((choice) => {
    const cost = resolveOfficialBattlefieldAssetAbilityResourceCostV1(
      state.officialBattlefieldAssetFamilySourceBundle, state,
      { sideKey: instance.sideKey, pieceId: actor.id,
        resourceType: choice.resourceType, printedResourceCost: choice.resourceCost });
    return [choice.choice, cost];
  }));
  const paymentsByChoice = Object.fromEntries(choices.map((choice) => [choice.choice,
    paymentSelections(state, instance.sideKey, choice.resourceType,
      costsByChoice[choice.choice].effectiveResourceCost)]));
  if (Object.values(paymentsByChoice).every((rows) => rows.length === 0)) {
    fail("BATTLEFIELD_ASSET_PAYMENT_UNAVAILABLE");
  }
  return { targets, choices: choices.map((entry) => entry.choice), paymentsByChoice,
    costsByChoice };
}
function tokenProfileRequiredForRoute(state, route) {
  if (["creep_token_place", "force_field_place", "shade_token_place"]
    .includes(route.effectKind)) return tokenProfile(state, route.tokenKind);
  return null;
}
function domainFor(state, route, instance, actor, context) {
  const required = ["activeUnitId", "paymentCardInstanceIds"];
  if (COORDINATE_EFFECTS.has(route.effectKind)) required.push("coordinate");
  if (route.effectKind === "orders") required.push("targetUnitId", "choice");
  return seal({
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_PARAMETER_KIND,
    actionType: "resolve_battlefield_asset_ability",
    executorId: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION,
    definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: instance.sourceInstanceId, sourceKind: route.sourceKind,
    sideKey: actor.sideKey, phase: state.phase, pieceId: actor.id,
    abilityName: route.abilityName, effectKind: route.effectKind,
    parameterSchema: { type: "object", required,
      activeUnitId: { const: actor.id },
      coordinate: COORDINATE_EFFECTS.has(route.effectKind)
        ? { type: "world_point_milli_inches", rulesOwnedGeometryValidation: true } : null,
      targetUnitId: context.targets.length > 0 ? { enum: context.targets } : null,
      choice: route.effectKind === "orders" ? { enum: context.choices } : null,
      paymentCardInstanceIdsByChoice: clone(context.paymentsByChoice) },
    constraints: { sourceRouteHash: route.routeHash,
      physicalTokenProfile: tokenProfileRequiredForRoute(state, route),
      resourceCostsByChoice: clone(context.costsByChoice),
      continuousCoordinatesNotClientCertified: true,
      geometry: { rangeInches: route.rangeInches || route.whollyWithinInches || null,
        minimumEnemyGapInches: route.minimumEnemyGapInches || null,
        lineOfSightRequired: route.lineOfSightRequired ?? null,
        entireTokenBaseInsideBattlefield: true,
        noEndOverlapWithTangibleAsset: true } },
    confirmationClass: "rules_owned_direct_action",
    rulesTruth: "official_current_product_battlefield_asset_parameter_domain",
    trainingTruth: false,
  }, "domainId");
}
function enumerate(bundle, state, options = {}) {
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("BATTLEFIELD_ASSET_SIDE_INVALID", sideKey);
  const parameterDomains = []; const candidates = [];
  const catalogueScope = options.scope === "catalogue";
  for (const route of bundle.routes.filter((entry) => ACTIVE_EFFECTS.has(entry.effectKind))) {
    for (const instance of routeInstances(state, route).filter((entry) => (
      catalogueScope || entry.sideKey === sideKey))) {
      for (const actor of actionActors(state, route, instance)) {
        try {
          parameterDomains.push(domainFor(state, route, instance, actor,
            available(state, route, instance, actor)));
        } catch (error) {
          if (options.includeDisabled === true) candidates.push({
            actionType: "resolve_battlefield_asset_ability",
            definitionId: route.definitionId, sourceInstanceId: instance.sourceInstanceId,
            pieceId: actor.id, sideKey: actor.sideKey, effectKind: route.effectKind,
            executorId: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID,
            executorVersion: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION,
            isEnabled: false,
            disabledReason: String(error?.message || error).split(":")[0],
            score: 0, details: { trainingTruth: false },
          });
        }
      }
    }
  }
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_battlefield_asset_legal_space_v1",
    runtimeId: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION,
    candidates: candidates.sort((left, right) => (
      `${left.definitionId}:${left.sourceInstanceId}:${left.pieceId}`.localeCompare(
        `${right.definitionId}:${right.sourceInstanceId}:${right.pieceId}`))),
    parameterDomains: parameterDomains.sort((left, right) => left.domainId.localeCompare(
      right.domainId)),
    automaticDefinitionIds: bundle.routes.filter((entry) => !ACTIVE_EFFECTS.has(
      entry.effectKind)).map((entry) => entry.definitionId).sort(),
    continuousCoordinatesRequireInstantiation: true,
    rulesTruth: "official_current_product_battlefield_asset_legal_space",
    trainingTruth: false,
  });
}

function canonicalPoint(value) {
  if (!object(value) || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) {
    fail("BATTLEFIELD_ASSET_COORDINATE_INVALID");
  }
  return { xMilliInches: Number(value.xMilliInches),
    yMilliInches: Number(value.yMilliInches) };
}
function pointInches(value) {
  return { x: value.xMilliInches / 1000, y: value.yMilliInches / 1000 };
}
function tokenBinding(state, tokenId) {
  return (state.officialBattlefieldAssetBindings || []).find((entry) => (
    entry.assetId === tokenId));
}
function existingTokenRows(state) {
  return (state.board?.tokens || []).filter((entry) => entry?.isRemoved !== true).map((token) => ({
    id: String(token.tokenId || token.id || ""),
    point: token.coordinate || { x: Number(token.xInches), y: Number(token.yInches) },
    radius: token.baseShape === "square" ? null
      : Number(token.baseDiameterInches || token.baseWidthInches || 0) / 2,
    footprint: token.baseShape === "square"
      ? rectangleFootprint(token.coordinate, Number(token.baseWidthInches) / 2,
        Number(token.baseDepthInches) / 2)
      : roundFootprint(token.coordinate || { x: Number(token.xInches),
        y: Number(token.yInches) },
      Number(token.baseDiameterInches || token.baseWidthInches || 0) / 2),
    binding: tokenBinding(state, String(token.tokenId || token.id || "")),
  }));
}
function footprintForProfile(point, profile) {
  return profile.baseShape === "square"
    ? rectangleFootprint(point, profile.baseWidthMm / 25.4 / 2,
      profile.baseDepthMm / 25.4 / 2)
    : roundFootprint(point, profile.baseDiameterMm / 25.4 / 2);
}
function assertBoard(state, footprint) {
  const halfWidth = footprint.shape === "round" ? footprint.radius : footprint.halfWidth;
  const halfDepth = footprint.shape === "round" ? footprint.radius : footprint.halfDepth;
  if (footprint.point.x - halfWidth < 0 || footprint.point.y - halfDepth < 0
    || footprint.point.x + halfWidth > Number(state.board.widthInches)
    || footprint.point.y + halfDepth > Number(state.board.heightInches)) {
    fail("BATTLEFIELD_ASSET_FULL_BASE_OUTSIDE_BATTLEFIELD");
  }
}
function rectangleGap(footprintValue, terrain) {
  const footprint = terrain.footprint || terrain;
  const minX = Number(footprint.xMin ?? footprint.minX ?? 0);
  const maxX = Number(footprint.xMax ?? footprint.maxX ?? 0);
  const minY = Number(footprint.yMin ?? footprint.minY ?? 0);
  const maxY = Number(footprint.yMax ?? footprint.maxY ?? 0);
  const terrainFootprint = rectangleFootprint(
    { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    (maxX - minX) / 2, (maxY - minY) / 2);
  return footprintGap(footprintValue, terrainFootprint);
}
function assertUnoccupied(state, footprint) {
  for (const piece of (state.pieces || []).filter(activePiece)) {
    for (const model of liveModels(piece)) {
      if (footprintGap(footprint,
        roundFootprint(pointForModel(model), modelRadius(model))) < 0.001) {
        fail("BATTLEFIELD_ASSET_TOKEN_OVERLAPS_MODEL", model.id);
      }
    }
  }
  for (const token of existingTokenRows(state)) {
    if (footprintGap(footprint, token.footprint) < 0.001) {
      fail("BATTLEFIELD_ASSET_TOKEN_OVERLAPS_TOKEN", token.id);
    }
  }
  for (const terrain of state.board?.terrain || []) {
    if (terrain.isRemoved === true || terrain.blocksPlacement === false) continue;
    if (rectangleGap(footprint, terrain) < 0.001) {
      fail("BATTLEFIELD_ASSET_TOKEN_OVERLAPS_TERRAIN", terrain.id);
    }
  }
}
function pointSegmentDistance(point, start, end) {
  const dx = Number(end.x) - Number(start.x); const dy = Number(end.y) - Number(start.y);
  if (dx === 0 && dy === 0) return distance(point, start);
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx
    + (point.y - start.y) * dy) / ((dx * dx) + (dy * dy))));
  return distance(point, { x: Number(start.x) + (ratio * dx),
    y: Number(start.y) + (ratio * dy) });
}
function assertCoordinateGeometry(state, route, actor, point, profile) {
  const footprint = profile ? footprintForProfile(point, profile) : roundFootprint(point, 0);
  assertBoard(state, footprint);
  if (["creep_token_place", "force_field_place", "shade_token_place"]
    .includes(route.effectKind)) assertUnoccupied(state, footprint);
  if (route.effectKind === "reserve_deploy_indicator") {
    for (const enemy of (state.pieces || []).filter((entry) => (
      entry.sideKey === otherSide(actor.sideKey) && activePiece(entry)))) {
      for (const model of liveModels(enemy)) {
        if (baseGap(point, 0, pointForModel(model), modelRadius(model))
          <= route.minimumEnemyGapInches + 0.001) {
          fail("BATTLEFIELD_ASSET_BEACON_ENEMY_GAP_REQUIRED", model.id);
        }
      }
    }
  }
  if (route.effectKind === "creep_token_place") {
    const entry = state.officialDeploymentGeometryBinding?.entryEdgesByPlayer
      ?.[actor.sideKey]?.segments || [];
    const extent = footprint.shape === "round" ? footprint.radius
      : Math.hypot(footprint.halfWidth, footprint.halfDepth);
    const entryWithin = entry.some((segment) => (
      Math.max(0, pointSegmentDistance(point, segment.startCoordinate,
        segment.endCoordinate) - extent) <= route.rangeInches + 0.001));
    const tumorWithin = existingTokenRows(state).some((token) => (
      token.binding?.sideKey === actor.sideKey && token.binding?.assetKind === "creep_tumor"
        && footprintGap(footprint, token.footprint) <= route.rangeInches + 0.001));
    if (!entryWithin && !tumorWithin) fail("BATTLEFIELD_ASSET_CREEP_SOURCE_RANGE_REQUIRED");
  }
  if (route.effectKind === "shade_token_place") {
    const wholly = liveModels(actor).some((model) => (
      distance(point, pointForModel(model)) - modelRadius(model) + footprint.radius
        <= route.whollyWithinInches + 0.001));
    if (!wholly) fail("BATTLEFIELD_ASSET_SHADE_WHOLE_BASE_RANGE_REQUIRED");
  }
  if (route.effectKind === "force_field_place") {
    const within = liveModels(actor).some((model) => (
      footprintGap(footprint, roundFootprint(pointForModel(model), modelRadius(model)))
        <= route.rangeInches + 0.001));
    if (!within) fail("BATTLEFIELD_ASSET_FORCE_FIELD_RANGE_REQUIRED");
  }
}
function canonicalParameters(state, route, domain, parameters) {
  if (!object(parameters)) fail("BATTLEFIELD_ASSET_PARAMETERS_INVALID");
  const allowed = new Set(["activeUnitId", "paymentCardInstanceIds"]);
  if (COORDINATE_EFFECTS.has(route.effectKind)) allowed.add("coordinate");
  if (route.effectKind === "orders") { allowed.add("targetUnitId"); allowed.add("choice"); }
  if (Object.keys(parameters).some((key) => !allowed.has(key))
    || String(parameters.activeUnitId || "") !== domain.pieceId
    || !Array.isArray(parameters.paymentCardInstanceIds)) {
    fail("BATTLEFIELD_ASSET_PARAMETERS_INVALID");
  }
  const result = { activeUnitId: domain.pieceId,
    paymentCardInstanceIds: [...new Set(parameters.paymentCardInstanceIds.map(String))].sort() };
  if (COORDINATE_EFFECTS.has(route.effectKind)) {
    result.coordinate = canonicalPoint(parameters.coordinate);
    const profile = tokenProfileRequiredForRoute(state, route);
    assertCoordinateGeometry(state, route,
      state.pieces.find((entry) => entry.id === domain.pieceId),
      pointInches(result.coordinate), profile);
  }
  if (route.effectKind === "orders") {
    result.targetUnitId = String(parameters.targetUnitId || "");
    result.choice = String(parameters.choice || "");
    if (!domain.parameterSchema.targetUnitId.enum.includes(result.targetUnitId)
      || !domain.parameterSchema.choice.enum.includes(result.choice)) {
      fail("BATTLEFIELD_ASSET_ORDER_CHOICE_INVALID");
    }
  }
  const choice = route.effectKind === "orders"
    ? route.choices.find((entry) => entry.choice === result.choice)
    : { resourceType: route.resourceType, resourceCost: route.resourceCost };
  const allowedPayments = domain.parameterSchema.paymentCardInstanceIdsByChoice[
    route.effectKind === "orders" ? result.choice : "default"] || [];
  if (!allowedPayments.some((entry) => isDeepStrictEqual(entry,
    result.paymentCardInstanceIds))) fail("BATTLEFIELD_ASSET_PAYMENT_SELECTION_INVALID");
  return { result, choice };
}
function instantiate(bundle, state, domain, parameters) {
  const current = enumerate(bundle, state, { sideKey: domain.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) fail("BATTLEFIELD_ASSET_DOMAIN_STALE");
  const route = bundle.routes.find((entry) => entry.definitionId === domain.definitionId);
  const canonical = canonicalParameters(state, route, domain, parameters);
  const priorOrdinals = [
    ...(state.officialBattlefieldAssetBindings || []).map((entry) => entry.assetId),
    ...(state.battlefieldAssetUseHistory || []).map((entry) => entry.assetId),
  ].map((id) => Number(String(id || "").split(":").at(-1)))
    .filter((value) => Number.isSafeInteger(value) && value > 0);
  const assetOrdinal = Math.max(0, ...priorOrdinals) + 1;
  const assetId = COORDINATE_EFFECTS.has(route.effectKind)
    ? `asset:${state.round}:${route.effectKind}:${assetOrdinal}` : null;
  const plan = seal({
    schema: "starcraft_tmg_official_battlefield_asset_plan_v1",
    semanticVersion: "1.0.0", domainId: domain.domainId,
    definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: domain.sourceInstanceId, sideKey: domain.sideKey,
    pieceId: domain.pieceId, effectKind: route.effectKind,
    canonicalParameters: canonical.result, assetId,
    selectedChoice: canonical.choice ? clone(canonical.choice) : null,
    sourceRouteHash: route.routeHash,
    stateHashBefore: hashStarcraftTmgContract(state),
    rulesTruth: "official_current_product_battlefield_asset_plan",
    trainingTruth: false,
  }, "planHash");
  const action = freezeDeep({ actionType: "resolve_battlefield_asset_ability",
    sideKey: domain.sideKey, phase: state.phase, pieceId: domain.pieceId,
    definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    effectKind: route.effectKind, battlefieldAssetPlan: plan,
    executorId: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: canonical.result, action,
    rulesTruth: "official_current_product_battlefield_asset_instantiation",
    trainingTruth: false });
}
function preview(bundle, state, request = {}) {
  const result = instantiate(bundle, state, request.domain, request.parameters || {});
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_battlefield_asset_preview_v1",
    runtimeId: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION,
    action: result.action,
    deltas: [{ kind: result.action.effectKind,
      assetId: result.action.battlefieldAssetPlan.assetId,
      coordinate: clone(result.canonicalParameters.coordinate || null),
      targetUnitId: result.canonicalParameters.targetUnitId || null,
      reversibleBeforeApply: true }],
    rulesTruth: "official_current_product_battlefield_asset_preview",
    trainingTruth: false });
}
function pay(state, route, action, events) {
  const plan = action.battlefieldAssetPlan;
  const choice = plan.selectedChoice;
  const resourceType = choice?.resourceType ?? route.resourceType;
  const printedResourceCost = Number(choice?.resourceCost ?? route.resourceCost ?? 0);
  const cost = resolveOfficialBattlefieldAssetAbilityResourceCostV1(
    state.officialBattlefieldAssetFamilySourceBundle, state,
    { sideKey: action.sideKey, pieceId: action.pieceId, resourceType,
      printedResourceCost, planHash: plan.planHash }, { consume: true });
  const resourceCost = cost.effectiveResourceCost;
  const ids = plan.canonicalParameters.paymentCardInstanceIds;
  if (resourceType) {
    const cards = ids.map((id) => cardById(state, action.sideKey, id));
    if (cards.some((entry) => !entry)) fail("BATTLEFIELD_ASSET_PAYMENT_CARD_UNKNOWN");
    const payment = resolveOfficialAbilityResourcePaymentV1({
      cardDataBundle: state.officialCardBuildPaymentDataBundle,
      resourceType, resourceCost, selectedCardInstanceSetComplete: true,
      selectedCardInstances: cards.map((card) => paymentRef(state, card)),
    });
    for (const id of payment.selectedCardsExhaustOnCommit) {
      cardById(state, action.sideKey, id).readiness = "exhausted";
    }
    events.push({ type: "ability_resource_paid", resourceType, resourceCost,
      printedResourceCost, resourceCostReduction: cost.resourceCostReduction,
      discountSourcePieceId: cost.sourcePieceId,
      paymentResultHash: payment.resultHash,
      exhaustedCardInstanceIds: payment.selectedCardsExhaustOnCommit,
      trainingTruth: false });
  } else if (route.sourceKind === "card_feature") {
    const card = cardById(state, action.sideKey, plan.sourceInstanceId);
    if (!card || card.readiness !== "ready") fail("BATTLEFIELD_ASSET_SOURCE_CARD_NOT_READY");
    card.readiness = "exhausted";
    events.push({ type: "tactical_card_exhausted", cardInstanceId: card.cardInstanceId,
      trainingTruth: false });
  }
}
function createAsset(state, route, action, actor, events) {
  const plan = action.battlefieldAssetPlan;
  const coordinate = pointInches(plan.canonicalParameters.coordinate);
  state.board.tokens = state.board.tokens || [];
  state.board.markers = state.board.markers || [];
  state.officialBattlefieldAssetBindings = state.officialBattlefieldAssetBindings || [];
  let asset;
  if (["creep_token_place", "force_field_place", "shade_token_place"]
    .includes(route.effectKind)) {
    const profile = tokenProfile(state, route.tokenKind);
    const stay = route.effectKind === "creep_token_place"
      && sideHasPassive(state, action.sideKey, "creep_stay_displacement");
    asset = createOfficialBattlefieldTokenV1({
      registry: state.officialBattlefieldTokenMarkerRegistry,
      tokenId: plan.assetId, tokenKind: route.tokenKind, coordinate,
      ...(profile.baseShape === "round"
        ? { baseShape: "round", baseDiameterMm: profile.baseDiameterMm }
        : { baseShape: "square", baseWidthMm: profile.baseWidthMm,
          baseDepthMm: profile.baseDepthMm }),
      stayInPlay: stay, createdByPieceId: actor.id, createdRound: state.round,
    });
    state.board.tokens.push(asset);
  } else {
    asset = createOfficialBattlefieldMarkerV1({
      registry: state.officialBattlefieldTokenMarkerRegistry,
      markerId: plan.assetId, markerKind: "faction_indicator",
      markerRole: route.markerRole, coordinate, sideKey: action.sideKey,
      stayInPlay: false,
    });
    state.board.markers.push(asset);
  }
  const binding = seal({
    schema: "starcraft_tmg_official_battlefield_asset_binding_v1",
    assetId: plan.assetId,
    assetKind: route.tokenKind || route.markerRole,
    assetSchema: asset.schema, assetHash: asset.tokenHash || asset.markerHash,
    sideKey: action.sideKey, sourcePieceId: actor.id,
    sourceInstanceId: plan.sourceInstanceId,
    sourceDefinitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    effectKind: route.effectKind, createdRound: Number(state.round),
    displacement: route.displacement === true
      || (route.effectKind === "creep_token_place"
        && sideHasPassive(state, action.sideKey, "creep_stay_displacement")),
    lifecycleEvent: route.lifecycleEvent || null,
    consumed: false, trainingTruth: false,
  }, "bindingHash");
  state.officialBattlefieldAssetBindings.push(binding);
  events.push({ type: "battlefield_asset_created", assetId: plan.assetId,
    assetKind: binding.assetKind, assetHash: binding.assetHash,
    bindingHash: binding.bindingHash, coordinate, trainingTruth: false });
}
function effectFor(route, action, details) {
  return seal({ schema: "starcraft_tmg_official_battlefield_asset_effect_v1",
    sourceAdapterId: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID,
    sourceAdapterVersion: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION,
    sourceDefinitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    sourcePieceId: action.pieceId, sourceSideKey: action.sideKey,
    effectKind: route.effectKind, createdRound: Number(details.round),
    expiresAt: details.expiresAt || null, ...details, trainingTruth: false }, "effectHash");
}
function applyEffect(state, route, action, actor, events) {
  if (COORDINATE_EFFECTS.has(route.effectKind)) {
    createAsset(state, route, action, actor, events);
    return;
  }
  const plan = action.battlefieldAssetPlan;
  if (route.effectKind === "on_creep_speed_active") {
    const onCreep = isOfficialCurrentProductUnitOnCreepV1(state, actor);
    const modifier = onCreep ? route.speedModifierOnCreep : route.speedModifierOffCreep;
    actor.officialAbilityEffects = actor.officialAbilityEffects || [];
    actor.officialAbilityEffects.push(effectFor(route, action, { round: state.round,
      speedModifier: modifier, onCreepAtUse: onCreep,
      expiresAt: route.expiresAt }));
    events.push({ type: "battlefield_asset_speed_buff_applied", pieceId: actor.id,
      speedModifier: modifier, onCreepAtUse: onCreep, trainingTruth: false });
    return;
  }
  if (route.effectKind === "orders") {
    const target = state.pieces.find((entry) => (
      entry.id === plan.canonicalParameters.targetUnitId));
    if (plan.selectedChoice.choice === "remove_activation_marker") {
      target.activatedPhases = { ...(target.activatedPhases || {}), [state.phase]: false };
    } else {
      target.officialAbilityEffects = target.officialAbilityEffects || [];
      target.officialAbilityEffects.push(effectFor(route, action, { round: state.round,
        targetPieceId: target.id, orderChoice: plan.selectedChoice.choice,
        criticalHit: plan.selectedChoice.firstWeaponCriticalHit || 0,
        firstWeaponOnly: plan.selectedChoice.choice === "critical_hit_2",
        ignoreDisengagePenalty:
          plan.selectedChoice.choice === "ignore_disengage_penalty",
        expiresAt: plan.selectedChoice.expiresAt || "first_weapon_consumed" }));
    }
    events.push({ type: "orders_applied", sourcePieceId: actor.id,
      targetPieceId: target.id, choice: plan.selectedChoice.choice, trainingTruth: false });
  }
}
function apply(bundle, stateInput, request = {}) {
  const action = request.action;
  const domain = enumerate(bundle, stateInput, { sideKey: action?.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => (
    entry.domainId === action?.battlefieldAssetPlan?.domainId));
  if (!domain) fail("BATTLEFIELD_ASSET_PARAMETER_DOMAIN_STALE");
  const expected = instantiate(bundle, stateInput, domain,
    action.battlefieldAssetPlan.canonicalParameters);
  if (!isDeepStrictEqual(expected.action, action)) fail("BATTLEFIELD_ASSET_ACTION_STALE");
  const route = bundle.routes.find((entry) => entry.definitionId === action.definitionId);
  const state = clone(stateInput);
  const actor = state.pieces.find((entry) => entry.id === action.pieceId);
  const events = [];
  pay(state, route, action, events);
  applyEffect(state, route, action, actor, events);
  state.battlefieldAssetUseHistory = state.battlefieldAssetUseHistory || [];
  state.battlefieldAssetUseHistory.push({ round: Number(state.round), phase: state.phase,
    sideKey: action.sideKey, pieceId: actor.id, definitionId: route.definitionId,
    sourceInstanceId: action.battlefieldAssetPlan.sourceInstanceId,
    effectKind: route.effectKind, assetId: action.battlefieldAssetPlan.assetId,
    planHash: action.battlefieldAssetPlan.planHash,
    trainingTruth: false });
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(action), events: clone(events) });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_battlefield_asset_transition_v1",
    runtimeId: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION,
    postRevision: Number(request.options?.postRevision || 0),
    state: freezeDeep(state), action: clone(action), events,
    rulesTruth: "official_current_product_battlefield_asset_transition",
    trainingTruth: false });
}

function sideHasPassive(state, sideKey, effectKind) {
  const bundle = state.officialBattlefieldAssetFamilySourceBundle;
  if (!bundle) return false;
  return bundle.routes.some((route) => route.effectKind === effectKind
    && routeInstances(state, route).some((instance) => instance.sideKey === sideKey));
}
function zergGround(state, piece) {
  const faction = normalized(state.players?.[piece.sideKey]?.faction || "");
  return tags(piece).has("ground") && (tags(piece).has("zerg")
    || faction.includes("zerg") || faction.includes("kerrigan"));
}
export function isOfficialCurrentProductUnitOnCreepV1(state, piece) {
  if (!activePiece(piece) || !zergGround(state, piece)) return false;
  const tumors = existingTokenRows(state).filter((entry) => (
    entry.binding?.assetKind === "creep_tumor"));
  const withinTumor = liveModels(piece).some((model) => tumors.some((token) => (
    footprintGap(roundFootprint(pointForModel(model), modelRadius(model)),
      token.footprint) <= 6.001)));
  const omega = (state.pieces || []).filter((entry) => activePiece(entry)
    && entry.officialUnitRecordKey === "army_units:omega_worm");
  return withinTumor || omega.some((source) => unitWithin(source, piece, 6));
}
function markerDistance(state, piece) {
  const values = liveModels(piece).flatMap((model) => (
    (state.board?.missionMarkers || []).map((marker) => baseGap(
      pointForModel(model), modelRadius(model),
      { x: Number(marker.xInches), y: Number(marker.yInches) },
      Number(marker.diameterInches || 0) / 2))
  ));
  return values.length > 0 ? Math.min(...values) : Infinity;
}
function detectionSources(state, piece) {
  return (state.board?.markers || []).filter((marker) => {
    const binding = tokenBinding(state, marker.markerId);
    return binding?.assetKind === "detection_aura" && binding.sideKey !== piece.sideKey
      && liveModels(piece).some((model) => baseGap(pointForModel(model), modelRadius(model),
        marker.coordinate, 0) <= 6.001);
  });
}
function shadeTokens(state, sideKey) {
  return existingTokenRows(state).filter((entry) => entry.binding?.assetKind === "shade"
    && entry.binding.sideKey === sideKey && entry.binding.consumed !== true);
}
export function projectOfficialBattlefieldAssetFamilyModifiersV1(
  bundle, state, request = {},
) {
  verifyOfficialBattlefieldAssetFamilySourceBundleV1(bundle);
  const piece = state.pieces.find((entry) => entry.id === request.pieceId);
  if (!piece) fail("BATTLEFIELD_ASSET_QUERY_PIECE_UNKNOWN", String(request.pieceId || ""));
  const context = object(request.context) ? request.context : {};
  const pieceRoutes = bundle.routes.filter((route) => route.recordKey
    === piece.officialUnitRecordKey && route.sourceKind === "unit_feature"
    && fieldedFeature(piece, route));
  const onCreep = isOfficialCurrentProductUnitOnCreepV1(state, piece);
  const activeEffects = (piece.officialAbilityEffects || []).filter((entry) => (
    entry.sourceAdapterId === OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID));
  const target = state.pieces.find((entry) => entry.id === context.targetPieceId);
  const shades = shadeTokens(state, piece.sideKey);
  const targetWithinShade = target && shades.some((shade) => liveModels(target).some((model) => (
    baseGap(pointForModel(model), modelRadius(model), shade.point, shade.radius) <= 4.001)));
  const stationary = pieceRoutes.find((entry) => entry.effectKind === "stationary_evade");
  const firstRanged = Number(context.rangedAttackOrdinalAgainstTargetInRound) === 1;
  const orders = activeEffects.filter((entry) => entry.effectKind === "orders");
  const speed = Math.max(0,
    ...activeEffects.map((entry) => Number(entry.speedModifier || 0)),
    ...pieceRoutes.filter((entry) => entry.effectKind === "on_creep_speed_passive" && onCreep)
      .map((entry) => Number(entry.speedModifier || 0)));
  const detection = detectionSources(state, piece);
  return freezeDeep({
    pieceId: piece.id, onCreep,
    applicableDefinitionIds: pieceRoutes.map((entry) => entry.definitionId).sort(),
    structure: pieceRoutes.some((entry) => entry.effectKind === "structure")
      || piece.isStructure === true,
    currentSupplySetTo: pieceRoutes.some((entry) => entry.effectKind === "structure") ? 0 : null,
    cannotActivateOrPerformActions:
      pieceRoutes.some((entry) => entry.effectKind === "structure") || piece.isStructure === true,
    cannotControlOrContest:
      pieceRoutes.some((entry) => entry.effectKind === "structure") || piece.isStructure === true,
    speedModifier: speed,
    armourModifier: pieceRoutes.some((entry) => entry.effectKind === "marker_armour")
      && markerDistance(state, piece) <= 3.001 ? 1 : 0,
    eligibleEvadeAgainstRanged: Boolean(stationary && statusNamed(piece, ["stationary"])
      && firstRanged),
    evadeModifier: stationary && statusNamed(piece, ["stationary"]) && firstRanged
      && onCreep ? Number(stationary.onCreepEvadeModifier) : 0,
    precision: targetWithinShade && bundle.routes.some((entry) => (
      entry.effectKind === "shade_precision"
        && entry.recordKey === "army_units:adept"
        && routeInstances(state, entry).some((instance) => instance.sideKey === piece.sideKey)))
      ? 1 : 0,
    impactHitModifier: state.phase === "assault" && normalized(context.actionType) === "charge"
      && onCreep && sideHasPassive(state, piece.sideKey, "on_creep_impact") ? 1 : 0,
    hiddenSuppressedByDetection: detection.length > 0,
    detectionMarkerIds: detection.map((entry) => entry.markerId).sort(),
    ignoreDisengagePenalty: orders.some((entry) => entry.ignoreDisengagePenalty === true),
    criticalHit: Math.max(0, ...orders.map((entry) => Number(entry.criticalHit || 0))),
    pylonPeCostReductionAvailable: bundle.routes.some((route) => (
      route.effectKind === "pylon_pe_discount"
        && routeInstances(state, route).some((instance) => instance.sideKey === piece.sideKey
          && activePiece(instance.sourcePiece)
          && !usedThisRound(state, route, instance.sourceInstanceId)
          && unitWithin(instance.sourcePiece, piece, route.rangeInches)))) ? 1 : 0,
    shadeTokenIds: shades.map((entry) => entry.id).sort(),
    creepSpeedEvaluationTiming: "action_start_snapshot",
    modifierStackingPolicy: "same_named_buff_uses_highest_value",
    rulesTruth: "official_current_product_battlefield_asset_projection",
    trainingTruth: false,
  });
}

export function consumeOfficialBattlefieldAssetFirstWeaponEffectsV1(state, pieceId) {
  const piece = state.pieces?.find((entry) => entry.id === pieceId);
  if (!piece) fail("BATTLEFIELD_ASSET_QUERY_PIECE_UNKNOWN", String(pieceId || ""));
  const before = piece.officialAbilityEffects || [];
  const consumed = before.filter((entry) => (
    entry.sourceAdapterId === OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID
      && entry.effectKind === "orders" && entry.firstWeaponOnly === true));
  piece.officialAbilityEffects = before.filter((entry) => !consumed.includes(entry));
  return freezeDeep({ pieceId, consumedEffectHashes: consumed.map((entry) => (
    entry.effectHash)).sort(), consumedCount: consumed.length, trainingTruth: false });
}

function removeAsset(state, assetId) {
  state.board.tokens = (state.board.tokens || []).filter((entry) => (
    String(entry.tokenId || entry.id) !== assetId));
  state.board.markers = (state.board.markers || []).filter((entry) => (
    String(entry.markerId || entry.id) !== assetId));
  state.officialBattlefieldAssetBindings = (state.officialBattlefieldAssetBindings || [])
    .map((entry) => entry.assetId === assetId ? seal({
      ...without(entry, ["bindingHash"]), consumed: true,
    }, "bindingHash") : entry);
}
function lifecycle(bundle, stateInput, request = {}) {
  const eventKind = String(request.eventKind || "");
  if (!["action_performed", "round_end", "cleanup_and_refresh"].includes(eventKind)) {
    return null;
  }
  const state = clone(stateInput); const events = [];
  if (eventKind === "action_performed") {
    const actionType = normalized(request.actionType || request.action?.actionType);
    const pieceId = String(request.pieceId || request.action?.pieceId || "");
    const moved = state.pieces.find((entry) => entry.id === pieceId);
    if (moved && ["move", "deploy", "run", "charge", "disengage"].includes(actionType)) {
      for (const token of existingTokenRows(state)) {
        if (token.binding?.assetKind !== "creep_tumor"
          || token.binding.sideKey === moved.sideKey
          || !sideHasPassive(state, token.binding.sideKey, "creep_removal")) continue;
        const near = liveModels(moved).some((model) => footprintGap(
          roundFootprint(pointForModel(model), modelRadius(model)),
          token.footprint) <= 1.001);
        if (near) {
          removeAsset(state, token.id);
          events.push({ type: "creep_tumor_removed", tokenId: token.id,
            triggeringActionType: actionType, movingPieceId: moved.id, trainingTruth: false });
        }
      }
    }
  }
  if (eventKind === "round_end") {
    state.pendingBattlefieldAssetOpportunities = [];
    for (const binding of (state.officialBattlefieldAssetBindings || []).filter((entry) => (
      entry.consumed !== true && entry.lifecycleEvent === "round_end"))) {
      state.pendingBattlefieldAssetOpportunities.push(seal({
        schema: "starcraft_tmg_official_battlefield_asset_opportunity_v1",
        opportunityId: `opportunity:${state.round}:${binding.assetId}`,
        sideKey: binding.sideKey, assetId: binding.assetId,
        sourceDefinitionId: binding.sourceDefinitionId,
        opportunityKind: binding.assetKind === "shade"
          ? "set_adept_unit_in_coherency_using_shade_as_leader"
          : "deploy_ground_reserve_unit_in_base_contact_with_indicator",
        optional: true, expiresAt: "cleanup_and_refresh",
        executorOwnerSlice: 238, trainingTruth: false,
      }, "opportunityHash"));
    }
    events.push({ type: "battlefield_asset_round_end_opportunities_opened",
      opportunityIds: state.pendingBattlefieldAssetOpportunities.map((entry) => (
        entry.opportunityId)).sort(), trainingTruth: false });
    for (const piece of state.pieces || []) {
      piece.officialAbilityEffects = (piece.officialAbilityEffects || []).filter((entry) => (
        entry.sourceAdapterId !== OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID
          || entry.expiresAt !== "round_end"));
    }
  }
  if (eventKind === "cleanup_and_refresh") {
    const cleanup = resolveOfficialTokenMarkerCleanupV1({
      registry: state.officialBattlefieldTokenMarkerRegistry,
      tokens: state.board.tokens || [], markers: state.board.markers || [],
    });
    state.board.tokens = clone(cleanup.tokens); state.board.markers = clone(cleanup.markers);
    const retained = new Set([...cleanup.retainedTokenIds, ...cleanup.retainedMarkerIds]);
    state.officialBattlefieldAssetBindings = (state.officialBattlefieldAssetBindings || [])
      .filter((entry) => retained.has(entry.assetId));
    state.pendingBattlefieldAssetOpportunities = [];
    for (const piece of state.pieces || []) {
      piece.officialAbilityEffects = (piece.officialAbilityEffects || []).filter((entry) => (
        entry.sourceAdapterId !== OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID
          || entry.expiresAt !== "cleanup_and_refresh"));
    }
    events.push({ type: "battlefield_asset_cleanup", cleanupHash: cleanup.cleanupHash,
      removedTokenIds: cleanup.removedTokenIds,
      removedMarkerIds: cleanup.removedMarkerIds, trainingTruth: false });
  }
  if (events.length === 0) return state;
  state.battlefieldAssetLifecycleHistory = state.battlefieldAssetLifecycleHistory || [];
  state.battlefieldAssetLifecycleHistory.push({ round: Number(state.round),
    phase: state.phase, eventKind, events: clone(events), trainingTruth: false });
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: { actionType: "battlefield_asset_lifecycle", eventKind },
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
    if (!domain) fail("BATTLEFIELD_ASSET_QUERY_DOMAIN_STALE");
    const value = preview(bundle, state, { domain, parameters: request.parameters || {} });
    result = { preview: value, action: value.action };
  } else if (queryKind === "definition_routes") {
    result = { routes: clone(bundle.routes), routeCount: bundle.routeCount };
  } else if (queryKind === "battlefield_asset_projection") {
    result = projectOfficialBattlefieldAssetFamilyModifiersV1(bundle, state, request);
  } else if (queryKind === "asset_inventory") {
    result = { tokens: clone(state.board?.tokens || []),
      markers: clone(state.board?.markers || []),
      bindings: clone(state.officialBattlefieldAssetBindings || []),
      opportunities: clone(state.pendingBattlefieldAssetOpportunities || []) };
  } else fail("BATTLEFIELD_ASSET_QUERY_KIND_UNSUPPORTED", queryKind);
  return seal({ schema: "starcraft_tmg_official_battlefield_asset_query_v1",
    semanticVersion: "1.0.0", queryKind, precision: "exact", result,
    source: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialBattlefieldAssetFamilyAdapterV1(bundle) {
  verifyOfficialBattlefieldAssetFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_BATTLEFIELD_ASSET_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime", coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "lifecycle"],
    archetypeCounts: { ...bundle.archetypeCounts }, sourceBundleHash: bundle.bundleHash,
    physicalTokenGeometryFailsClosedPerAffectedDomain: true,
    continuousCoordinateInstantiationExact: true,
    tokenMarkerPrimitivesReused: true,
    faqCreepStartSnapshotAndRemovalTimingBound: true,
    forceFieldSizeCrossingContractExposed: true,
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
