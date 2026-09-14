import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { resolveOfficialAbilityResourcePaymentV1 } from
  "../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs";
import { getOfficialCardBuildPaymentProfileV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";
import { resolveOfficialMatchLifecycleAbilityResourceCostV1 } from
  "./official-match-lifecycle-family-adapter-v1.mjs";

export const OFFICIAL_REACTION_FAMILY_ADAPTER_ID =
  "official-reaction-family-adapter-v1";
export const OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_REACTION_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_reaction_family_source_bundle_v1";
export const OFFICIAL_REACTION_FAMILY_PARAMETER_KIND =
  "official_reaction_family_choice_v1";
export const OFFICIAL_REACTION_FAMILY_WINDOW_SCHEMA =
  "starcraft_tmg_official_reaction_family_window_v1";

const SIDE_KEYS = new Set(["player1", "player2"]);
const TRIGGER_KINDS = new Set([
  "ability_cost_payment",
  "after_charge_roll",
  "after_place",
  "after_ranged_attack_resolved",
  "after_successful_charge",
  "before_armour_roll",
  "before_evade_roll",
  "charge_declared",
  "damage_received",
  "debuff_received",
  "ranged_attack_declared",
  "reserve_entered_non_entry",
]);
const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  armour_dodge: 1,
  armour_tough: 4,
  charge_distance_add: 1,
  charge_roll_advantage: 1,
  charge_speed_debuff: 1,
  damage_reduce_by_nearby_models: 1,
  damage_reduce_fixed: 2,
  damage_reduce_mark_activated: 1,
  evade_eligibility: 1,
  evade_roll_modifier: 1,
  followup_move_towards_attacker: 1,
  followup_second_charge: 1,
  post_place_heal: 1,
  ranged_attack_hit_debuff: 1,
  ranged_attack_redirect: 1,
  remove_debuffs: 3,
  reserve_entry_hits: 1,
  resource_cost_discount: 1,
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
  fail("REACTION_FAMILY_SIDE_INVALID", sideKey);
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
function modelRadius(model) {
  const width = Number(model?.baseWidthInches || 0);
  const depth = Number(model?.baseDepthInches || width);
  return Math.max(width, depth) / 2;
}
function modelGap(left, right) {
  return Math.max(0, Math.hypot(Number(left.xInches) - Number(right.xInches),
    Number(left.yInches) - Number(right.yInches))
    - modelRadius(left) - modelRadius(right));
}
function unitWithin(left, right, rangeInches) {
  const distances = liveModels(left).flatMap((leftModel) => liveModels(right).map(
    (rightModel) => modelGap(leftModel, rightModel)));
  return distances.length > 0 && Math.min(...distances) <= Number(rangeInches) + 0.001;
}
function engaged(state, piece) {
  return (state.pieces || []).some((enemy) => enemy.sideKey !== piece.sideKey
    && activePiece(enemy) && unitWithin(piece, enemy, 0));
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
function resourceSpec(definition) {
  const match = String(definition.activationText || "").match(
    /\((\d+)\s+(Command Point|Biomass|Psionic Energy)\)/iu);
  if (!match) return { resourceType: null, resourceCost: 0 };
  const name = normalized(match[2]);
  return { resourceType: name === "command point" ? "CP"
    : name === "biomass" ? "BM" : "PE", resourceCost: Number(match[1]) };
}
function routeBase(definition, spec) {
  return {
    schema: "starcraft_tmg_official_reaction_definition_route_v1",
    semanticVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
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
    ...resourceSpec(definition),
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
  if (["Ground Armor", "Infantry Armor", "Vehicle Plating", "Carapace"].includes(name)
    && /before a Friendly (?:[A-Za-z]+ )?Unit makes an Armour Roll.+TOUGH \(1\)/iu
      .test(text)) {
    const requiredTargetTag = name === "Ground Armor" ? "ground"
      : name === "Infantry Armor" ? "biological"
        : name === "Vehicle Plating" ? "mechanical" : null;
    spec = { effectKind: "armour_tough", triggerKind: "before_armour_roll",
      requiredTargetTag, tough: 1, effectDuration: "this_roll" };
  } else if (name === "Guardian Shell"
    && /Friendly Ground Unit makes an Armour Roll.+DODGE \(2\)/iu.test(text)) {
    spec = { effectKind: "armour_dodge", triggerKind: "before_armour_roll",
      requiredTargetTag: "ground", dodge: 2, effectDuration: "this_roll" };
  } else if (name === "Hierarch’s Stand"
    && /another Friendly Unit Within 8.+redirect the attack/iu.test(text)) {
    spec = { effectKind: "ranged_attack_redirect",
      triggerKind: "ranged_attack_declared", rangeInches: 8,
      requiresAnotherFriendlyTarget: true, requiresValidRedirectTarget: true,
      redirectedTargetEvadeEligible: true, effectDuration: "activation_end" };
  } else if (name === "Lightning Dash"
    && /successful Charge action.+second Charge action.+different Enemy Unit/iu.test(text)) {
    spec = { effectKind: "followup_second_charge",
      triggerKind: "after_successful_charge", differentEnemyRequired: true,
      ignoresEngagedChargeRestriction: true,
      devastatingChargeSecondTriggerAllowed: false, effectDuration: "followup_action" };
  } else if (name === "Restoration"
    && /Friendly Unit Within 4.+Remove all DEBUFFS/iu.test(text)) {
    spec = { effectKind: "remove_debuffs", triggerKind: "debuff_received",
      rangeInches: 4, removesAllDebuffs: true, effectDuration: "immediate" };
  } else if (name === "Veil of Shadows"
    && /after a Friendly Unit resolves a PLACE effect.+HEAL \(2\)/iu.test(text)) {
    spec = { effectKind: "post_place_heal", triggerKind: "after_place",
      heal: 2, effectDuration: "immediate" };
  } else if (name === "Life Support"
    && /another Friendly Biological Unit suffers Damage Within 4/iu.test(text)) {
    spec = { effectKind: "damage_reduce_by_nearby_models",
      triggerKind: "damage_received", rangeInches: 4,
      requiresAnotherFriendlyTarget: true, requiredTargetTag: "biological",
      reductionPerInRangeModel: 1, minimumDamage: 0,
      effectDuration: "this_damage_allocation" };
  } else if (name === "Advanced Training"
    && /Friendly Support Unit activates a Special Ability that costs CP/iu.test(text)) {
    spec = { effectKind: "resource_cost_discount",
      triggerKind: "ability_cost_payment", requiredTargetTag: "support",
      discountedResourceType: "CP", resourceCostReduction: 1,
      minimumResourceCost: 0, oncePerRound: true,
      exhaustSourceCard: false, effectDuration: "this_payment" };
  } else if (name === "Dae’Uhl"
    && /Friendly Unit receives Damage.+reduce the Total Damage by 2.+minimum of 1/iu.test(text)) {
    spec = { effectKind: "damage_reduce_fixed", triggerKind: "damage_received",
      damageReduction: 2, minimumDamage: 1,
      effectDuration: "this_damage_allocation" };
  } else if (name === "Transfusion"
    && /another Friendly Biological Unit.+suffers Damage Within 4.+by 2/iu.test(text)) {
    spec = { effectKind: "damage_reduce_fixed", triggerKind: "damage_received",
      rangeInches: 4, requiresAnotherFriendlyTarget: true,
      requiredTargetTag: "biological", structuresAllowed: true,
      damageReduction: 2, minimumDamage: 0,
      effectDuration: "this_damage_allocation" };
  } else if (name === "Photon Overcharge"
    && /Enemy Unit enters the battlefield from Reserves.+other than its own Entry Edge.+HITS 3 \(1\)/iu.test(text)) {
    spec = { effectKind: "reserve_entry_hits",
      triggerKind: "reserve_entered_non_entry", automaticHits: 3,
      damagePerHit: 1, effectDuration: "immediate" };
  } else if (name === "Zealous Round"
    && /not Activated and receives Damage.+count this Unit as Activated.+reduce.+by 2/iu.test(text)) {
    spec = { effectKind: "damage_reduce_mark_activated",
      triggerKind: "damage_received", damageReduction: 2, minimumDamage: 0,
      sourceMustEqualTarget: true, requiresNotActivated: true,
      effectDuration: "this_damage_allocation" };
  } else if (name === "Brood Instinct"
    && /before a Friendly Unit makes an Evade Roll.+\+1 Modifier/iu.test(text)) {
    spec = { effectKind: "evade_roll_modifier", triggerKind: "before_evade_roll",
      evadeModifier: 1, effectDuration: "this_roll" };
  } else if (name === "Lunge"
    && /another Friendly Unit Within 10.+target of a Ranged Attack.+after the attack.+Move action Directly Towards/iu.test(text)) {
    spec = { effectKind: "followup_move_towards_attacker",
      triggerKind: "after_ranged_attack_resolved", rangeInches: 10,
      requiresAnotherFriendlyTarget: true, requiresUnengagedSource: true,
      destinationConstraint: "directly_towards_attacker",
      movementDistanceSource: "current_speed", effectDuration: "followup_action" };
  } else if (name === "Pneumatized Carapace"
    && /after a Friendly Unit rolls a D6 for Charge Distance.+additional D6.+higher result/iu.test(text)) {
    spec = { effectKind: "charge_roll_advantage", triggerKind: "after_charge_roll",
      additionalDice: 1, keepHighest: 1, effectDuration: "this_charge_roll" };
  } else if (name === "Gravitic Boosters"
    && /after a Friendly Unit rolls a D6 for Charge Distance.+Add 1/iu.test(text)) {
    spec = { effectKind: "charge_distance_add", triggerKind: "after_charge_roll",
      chargeDistanceModifier: 1, effectDuration: "this_charge_roll" };
  } else if (name === "Concussive Shells"
    && /Enemy declares a Charge against a Friendly Unit Within 8.+DEBUFF Speed \(2\)/iu.test(text)) {
    spec = { effectKind: "charge_speed_debuff", triggerKind: "charge_declared",
      rangeInches: 8, speedModifier: -2, effectDuration: "cleanup_and_refresh" };
  } else if (name === "Debilitating Saliva"
    && /Enemy Unit Within 8.+declares a Ranged Attack.+DEBUFF Hit \(1\)/iu.test(text)) {
    spec = { effectKind: "ranged_attack_hit_debuff",
      triggerKind: "ranged_attack_declared", rangeInches: 8,
      hitModifier: -1, effectDuration: "cleanup_and_refresh" };
  } else if (name === "Hallucination"
    && /Enemy Unit declares a Ranged Attack against a Friendly Unit Within 4.+eligible.+Evade Roll/iu.test(text)) {
    spec = { effectKind: "evade_eligibility",
      triggerKind: "ranged_attack_declared", rangeInches: 4,
      evadeEligible: true, effectDuration: "this_attack" };
  }
  if (!spec) fail("REACTION_DEFINITION_COMPILER_UNRECOGNIZED",
    `${definition.recordKey}:${name}`);
  return seal(routeBase(definition, spec), "routeHash");
}

export function createOfficialReactionFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("REACTION_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pendingIds = new Set(denominator.gapDefinitionIds);
  const owned = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 236 && pendingIds.has(entry.definitionId)));
  const definitions = owned.map((entry) => catalogue.definitions.find((candidate) => (
    candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 24 || definitions.some((entry) => !entry)) {
    fail("REACTION_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(compileRoute).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_REACTION_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    routeCount: routes.length,
    archetypeCounts,
    triggerKinds: [...new Set(routes.map((entry) => entry.triggerKind))].sort(),
    routes,
    definitionIds: routes.map((entry) => entry.definitionId),
    coveredSourceFeatureHashes: routes.map((entry) => entry.sourceFeatureHash).sort(),
    compilerDenominatorComplete: true,
    activePlayerReactionPriorityFirst: true,
    oneReactionPerPlayerPerActivation: true,
    sameNamedReactionPerSourceUnitPerRound: true,
    exactSourcePatternsRequired: true,
    arbitraryProseExecutionClaimed: false,
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_reaction_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialReactionFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialReactionFamilySourceBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_REACTION_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 24 || bundle.routes?.length !== 24
    || new Set(bundle.definitionIds || []).size !== 24
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 24
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 24
    || bundle.routes.some((entry) => !TRIGGER_KINDS.has(entry.triggerKind)
      || entry.activationKind !== "reaction" || entry.runtimeRole !== "reaction"
      || entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.compilerDenominatorComplete !== true
    || bundle.activePlayerReactionPriorityFirst !== true
    || bundle.oneReactionPerPlayerPerActivation !== true
    || bundle.sameNamedReactionPerSourceUnitPerRound !== true
    || bundle.exactSourcePatternsRequired !== true
    || bundle.arbitraryProseExecutionClaimed !== false
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("REACTION_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialReactionFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialReactionFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    capability: "authoritative_reaction",
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function routeInstances(state, route) {
  if (route.sourceKind === "unit_feature") {
    return (state.pieces || []).filter((piece) => piece.officialUnitRecordKey === route.recordKey
      && activePiece(piece) && fieldedFeature(piece, route)).map((piece) => ({
      sourceInstanceId: piece.id, sideKey: piece.sideKey, sourcePiece: piece,
    }));
  }
  return Object.entries(state.cardResources || {}).flatMap(([sideKey, cards]) => (
    (cards || []).filter((card) => card.officialCardRecordKey === route.recordKey
      && card.readiness === "ready").map((card) => ({
      sourceInstanceId: card.cardInstanceId, sideKey, sourceCard: card,
    }))
  ));
}
function piece(state, id) {
  return (state.pieces || []).find((entry) => entry.id === id) || null;
}
function sourceUsedThisRound(state, route, instance) {
  return (state.officialReactionHistory || []).some((entry) => (
    Number(entry.round) === Number(state.round)
      && entry.sourceInstanceId === instance.sourceInstanceId
      && entry.abilityName === route.abilityName));
}
function sideUsedThisActivation(state, sideKey, activationId) {
  return (state.officialReactionHistory || []).some((entry) => (
    entry.sideKey === sideKey && entry.activationId === activationId));
}
function targetFor(window, state) {
  return piece(state, window.context.targetPieceId || window.context.affectedPieceId
    || window.context.placedPieceId);
}
function attackerFor(window, state) {
  return piece(state, window.context.attackerPieceId
    || window.context.chargingPieceId || window.context.actorPieceId);
}
function routeEligible(state, window, route, instance) {
  if (route.triggerKind !== window.triggerKind
    || (route.phase !== "any" && route.phase !== window.phase)
    || instance.sideKey !== window.prioritySideKeys[window.priorityIndex]
    || sourceUsedThisRound(state, route, instance)
    || sideUsedThisActivation(state, instance.sideKey, window.activationId)) return false;
  if (window.context.enemyReactionAllowed === false
    && instance.sideKey !== window.activeSideKey) return false;
  const target = targetFor(window, state);
  const attacker = attackerFor(window, state);
  const source = instance.sourcePiece;
  if (route.requiredTargetTag && (!target || !tags(target).has(route.requiredTargetTag))) {
    return false;
  }
  if (target && target.sideKey !== instance.sideKey
    && !["charge_speed_debuff", "ranged_attack_hit_debuff", "reserve_entry_hits"]
      .includes(route.effectKind)) return false;
  if (route.requiresAnotherFriendlyTarget && (!source || !target
    || source.id === target.id || source.sideKey !== target.sideKey)) return false;
  if (route.sourceMustEqualTarget && source?.id !== target?.id) return false;
  if (route.requiresNotActivated && target?.activatedPhases?.[window.phase] === true) {
    return false;
  }
  const rangedEnemy = route.effectKind === "ranged_attack_hit_debuff"
    ? attacker : target;
  if (route.rangeInches && (!source || !rangedEnemy || !unitWithin(source, rangedEnemy,
    route.rangeInches))) return false;
  if (route.requiresUnengagedSource && engaged(state, source)) return false;
  if (route.effectKind === "ranged_attack_redirect") {
    return Boolean(source && target && attacker && source.id !== target.id
      && (window.context.validTargetUnitIds || []).includes(source.id));
  }
  if (route.effectKind === "followup_second_charge") {
    return source?.id === window.context.chargingPieceId
      && (window.context.alternateEnemyUnitIds || []).length > 0;
  }
  if (route.effectKind === "remove_debuffs") {
    return Boolean(target && (target.statuses || []).some((entry) => normalized(
      typeof entry === "string" ? entry : entry.statusKind || entry.statusName)
      .includes("debuff")));
  }
  if (route.effectKind === "resource_cost_discount") {
    return Boolean(target && tags(target).has("support")
      && window.context.resourceType === "CP"
      && Number(window.context.resourceCost || 0) > 0);
  }
  if (route.effectKind === "reserve_entry_hits") {
    return Boolean(target && target.sideKey !== instance.sideKey
      && window.context.enteredFromReserves === true
      && window.context.enteredViaOwnEntryEdge === false);
  }
  if (["charge_speed_debuff", "ranged_attack_hit_debuff"].includes(route.effectKind)) {
    return Boolean(source && attacker && attacker.sideKey !== source.sideKey
      && target?.sideKey === source.sideKey);
  }
  if (route.effectKind === "evade_eligibility") {
    return Boolean(source && attacker && attacker.sideKey !== source.sideKey
      && target?.sideKey === source.sideKey);
  }
  return Boolean(target || route.effectKind === "followup_second_charge");
}
function cardById(state, sideKey, id) {
  return (state.cardResources?.[sideKey] || []).find((entry) => entry.cardInstanceId === id);
}
function paymentRef(state, card) {
  const profile = getOfficialCardBuildPaymentProfileV1(
    state.officialCardBuildPaymentDataBundle, card.officialCardRecordKey);
  return { cardInstanceId: card.cardInstanceId,
    recordKey: card.officialCardRecordKey,
    sourceRecordHash: card.sourceRecordHash,
    payloadHash: card.officialPayloadHash,
    profileHash: profile.profileHash,
    isReady: card.readiness === "ready" };
}
function paymentSelections(state, route, sideKey, sourceInstanceId) {
  if (!route.resourceType || route.resourceCost === 0) return [[]];
  const effectiveCost = state.officialMatchLifecycleFamilySourceBundle
    ? resolveOfficialMatchLifecycleAbilityResourceCostV1(
      state.officialMatchLifecycleFamilySourceBundle, state,
      { sideKey, pieceId: sourceInstanceId, resourceType: route.resourceType,
        printedResourceCost: route.resourceCost },
    ).effectiveResourceCost : route.resourceCost;
  const cards = (state.cardResources?.[sideKey] || []).filter((entry) => (
    entry.readiness === "ready"));
  const rows = [];
  for (let mask = 0; mask < (1 << cards.length); mask += 1) {
    const selected = cards.filter((_, index) => (mask & (1 << index)) !== 0);
    try {
      resolveOfficialAbilityResourcePaymentV1({
        cardDataBundle: state.officialCardBuildPaymentDataBundle,
        resourceType: route.resourceType, resourceCost: effectiveCost,
        selectedCardInstanceSetComplete: true,
        selectedCardInstances: selected.map((card) => paymentRef(state, card)),
      });
      rows.push(selected.map((entry) => entry.cardInstanceId).sort());
    } catch { /* Invalid resource subsets are absent from LegalSpace. */ }
  }
  return rows.sort((left, right) => left.join("|").localeCompare(right.join("|")));
}
function currentWindow(state) {
  const window = state.pendingOfficialReactionWindow;
  if (!window) return null;
  if (!object(window) || window.schema !== OFFICIAL_REACTION_FAMILY_WINDOW_SCHEMA
    || window.windowHash !== hashStarcraftTmgContract(without(window, ["windowHash"]))) {
    fail("REACTION_WINDOW_INVALID");
  }
  return window;
}
function domainFor(state, window, route, instance, paymentCardInstanceIds) {
  const followupTargets = route.effectKind === "followup_second_charge"
    ? [...window.context.alternateEnemyUnitIds].sort() : [];
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_REACTION_FAMILY_PARAMETER_KIND,
    actionType: "resolve_reaction_family_ability",
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: instance.sourceInstanceId,
    sourceKind: route.sourceKind,
    sideKey: instance.sideKey,
    phase: state.phase,
    abilityName: route.abilityName,
    effectKind: route.effectKind,
    windowHash: window.windowHash,
    parameterSchema: { type: "object",
      required: ["paymentCardInstanceIds", ...(followupTargets.length > 0
        ? ["followupTargetUnitId"] : [])],
      paymentCardInstanceIds: { const: clone(paymentCardInstanceIds) },
      followupTargetUnitId: followupTargets.length > 0
        ? { enum: followupTargets } : null },
    constraints: { triggerKind: window.triggerKind,
      activationId: window.activationId,
      activePlayerResolvesFirst: true,
      oneReactionPerPlayerPerActivation: true,
      sameNamedReactionPerSourceUnitPerRound: true,
      sourceRouteHash: route.routeHash },
    executorId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    confirmationClass: "rules_owned_reaction_choice",
    rulesTruth: "official_current_product_reaction_parameter_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function passDomain(state, window) {
  return seal({ schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0", parameterKind: OFFICIAL_REACTION_FAMILY_PARAMETER_KIND,
    actionType: "pass_reaction_family_window", sideKey: window.prioritySideKeys[
      window.priorityIndex], phase: state.phase, windowHash: window.windowHash,
    parameterSchema: { type: "object", required: [] },
    constraints: { triggerKind: window.triggerKind,
      activationId: window.activationId, voluntaryPass: true },
    executorId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    confirmationClass: "rules_owned_reaction_pass",
    rulesTruth: "official_current_product_reaction_pass_domain",
    trainingTruth: false }, "domainId");
}
function enumerate(bundle, state, options = {}) {
  const window = currentWindow(state);
  const parameterDomains = [];
  if (!window) return freezeDeep({
    schemaVersion: "starcraft_tmg_official_reaction_legal_space_v1",
    runtimeId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    candidates: [], parameterDomains: [], window: null,
    currentProductReactionDenominatorComplete: true,
    searchAndStrategyExcludedFromAuthority: true, trainingTruth: false });
  const sideKey = String(options.sideKey || window.prioritySideKeys[window.priorityIndex]);
  if (!SIDE_KEYS.has(sideKey)) fail("REACTION_FAMILY_SIDE_INVALID", sideKey);
  if (sideKey === window.prioritySideKeys[window.priorityIndex]) {
    parameterDomains.push(passDomain(state, window));
    for (const route of bundle.routes) {
      for (const instance of routeInstances(state, route)) {
        if (!routeEligible(state, window, route, instance)) continue;
        for (const payment of paymentSelections(state, route, instance.sideKey,
          instance.sourceInstanceId)) {
          parameterDomains.push(domainFor(state, window, route, instance, payment));
        }
      }
    }
  }
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_reaction_legal_space_v1",
    runtimeId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    candidates: [], parameterDomains: parameterDomains.sort((left, right) => (
      left.domainId.localeCompare(right.domainId))),
    window: clone(window),
    prioritySideKey: window.prioritySideKeys[window.priorityIndex],
    currentProductReactionDenominatorComplete: true,
    searchAndStrategyExcludedFromAuthority: true,
    trainingTruth: false,
  });
}
function instantiate(bundle, state, domain, parameters = {}) {
  const current = enumerate(bundle, state, { sideKey: domain?.sideKey })
    .parameterDomains.find((entry) => entry.domainId === domain?.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("REACTION_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters)) fail("REACTION_ACTION_INPUT_INVALID");
  const pass = domain.actionType === "pass_reaction_family_window";
  const route = pass ? null : bundle.routes.find((entry) => (
    entry.definitionId === domain.definitionId));
  const paymentCardInstanceIds = pass ? []
    : [...new Set((parameters.paymentCardInstanceIds || []).map(String))].sort();
  if (!pass && !isDeepStrictEqual(paymentCardInstanceIds,
    domain.parameterSchema.paymentCardInstanceIds.const)) {
    fail("REACTION_PAYMENT_SELECTION_INVALID");
  }
  const followupTargetUnitId = pass ? null
    : parameters.followupTargetUnitId === undefined ? null
      : String(parameters.followupTargetUnitId);
  if (!pass && domain.parameterSchema.followupTargetUnitId
    && !domain.parameterSchema.followupTargetUnitId.enum.includes(followupTargetUnitId)) {
    fail("REACTION_FOLLOWUP_TARGET_INVALID", followupTargetUnitId);
  }
  const canonicalParameters = pass ? {} : { paymentCardInstanceIds,
    ...(followupTargetUnitId ? { followupTargetUnitId } : {}) };
  const plan = seal({ schema: "starcraft_tmg_official_reaction_family_plan_v1",
    semanticVersion: "1.0.0", domainId: domain.domainId,
    windowHash: domain.windowHash, sideKey: domain.sideKey,
    actionType: domain.actionType,
    definitionId: route?.definitionId || null,
    sourceFeatureHash: route?.sourceFeatureHash || null,
    sourceInstanceId: domain.sourceInstanceId || null,
    abilityName: route?.abilityName || null,
    effectKind: route?.effectKind || "pass",
    canonicalParameters,
    sourceRouteHash: route?.routeHash || null,
    rulesTruth: "official_current_product_reaction_plan",
    trainingTruth: false }, "planHash");
  const action = freezeDeep({ actionType: domain.actionType,
    sideKey: domain.sideKey, phase: state.phase,
    definitionId: route?.definitionId || null,
    abilityName: route?.abilityName || null,
    reactionPlan: plan,
    executorId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_current_product_reaction_instantiation",
    trainingTruth: false });
}
function preview(bundle, state, request = {}) {
  const instantiated = instantiate(bundle, state, request.domain,
    request.parameters || {});
  return seal({ schema: "starcraft_tmg_official_reaction_preview_v1",
    semanticVersion: "1.0.0", action: instantiated.action,
    actionHash: hashStarcraftTmgContract(instantiated.action),
    triggerContext: clone(currentWindow(state).context),
    confirmationClass: request.domain.confirmationClass,
    mutationApplied: false, rulesAuthority: true,
    rulesTruth: "official_current_product_reaction_preview",
    trainingTruth: false }, "previewHash");
}
function pay(state, route, action, events) {
  const ids = action.reactionPlan.canonicalParameters.paymentCardInstanceIds || [];
  if (route.resourceType) {
    const cost = state.officialMatchLifecycleFamilySourceBundle
      ? resolveOfficialMatchLifecycleAbilityResourceCostV1(
        state.officialMatchLifecycleFamilySourceBundle, state,
        { sideKey: action.sideKey, pieceId: action.reactionPlan.sourceInstanceId,
          resourceType: route.resourceType, printedResourceCost: route.resourceCost,
          planHash: action.reactionPlan.planHash }, { consume: true })
      : { effectiveResourceCost: route.resourceCost,
        resourceCostReduction: 0, discountSourcePieceId: null };
    const cards = ids.map((id) => cardById(state, action.sideKey, id));
    if (cards.some((entry) => !entry)) fail("REACTION_PAYMENT_CARD_UNKNOWN");
    const payment = resolveOfficialAbilityResourcePaymentV1({
      cardDataBundle: state.officialCardBuildPaymentDataBundle,
      resourceType: route.resourceType, resourceCost: cost.effectiveResourceCost,
      selectedCardInstanceSetComplete: true,
      selectedCardInstances: cards.map((card) => paymentRef(state, card)),
    });
    for (const id of payment.selectedCardsExhaustOnCommit) {
      cardById(state, action.sideKey, id).readiness = "exhausted";
    }
    events.push({ type: "reaction_resource_paid", resourceType: route.resourceType,
      resourceCost: cost.effectiveResourceCost,
      printedResourceCost: route.resourceCost,
      resourceCostReduction: cost.resourceCostReduction,
      discountSourcePieceId: cost.discountSourcePieceId,
      paymentResultHash: payment.resultHash,
      exhaustedCardInstanceIds: payment.selectedCardsExhaustOnCommit,
      trainingTruth: false });
  } else if (route.sourceKind === "card_feature"
    && route.exhaustSourceCard !== false) {
    const card = cardById(state, action.sideKey, action.reactionPlan.sourceInstanceId);
    if (!card || card.readiness !== "ready") fail("REACTION_SOURCE_CARD_NOT_READY");
    card.readiness = "exhausted";
    events.push({ type: "reaction_source_card_exhausted",
      cardInstanceId: card.cardInstanceId, trainingTruth: false });
  }
}
function isDebuff(entry) {
  const value = normalized(typeof entry === "string" ? entry
    : `${entry.statusKind || ""} ${entry.statusName || entry.name || ""}`);
  return value.includes("debuff");
}
function healPiece(target, value) {
  const before = Number(target.damageMarker || 0);
  const after = Math.max(0, before - Number(value));
  const healed = before - after;
  target.damageMarker = after;
  const first = liveModels(target)[0];
  if (first) {
    first.damage = after;
    if (Number.isFinite(Number(first.remainingWounds))) {
      first.remainingWounds = Number(first.remainingWounds) + healed;
    }
  }
  return healed;
}
function reactionEffect(route, state, window, action) {
  const target = targetFor(window, state);
  const source = piece(state, action.reactionPlan.sourceInstanceId);
  const attacker = attackerFor(window, state);
  const effect = { schema: "starcraft_tmg_official_reaction_effect_v1",
    definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: action.reactionPlan.sourceInstanceId,
    sideKey: action.sideKey, abilityName: route.abilityName,
    effectKind: route.effectKind, triggerKind: route.triggerKind,
    targetPieceId: target?.id || null, sourcePieceId: source?.id || null,
    attackerPieceId: attacker?.id || null,
    effectDuration: route.effectDuration,
    trainingTruth: false };
  if (route.effectKind === "armour_tough") effect.tough = route.tough;
  else if (route.effectKind === "armour_dodge") effect.dodge = route.dodge;
  else if (route.effectKind === "ranged_attack_redirect") {
    effect.redirectTargetPieceId = source.id;
    effect.redirectedTargetEvadeEligible = true;
  } else if (route.effectKind === "followup_second_charge") {
    effect.followup = { actionType: "charge",
      actorPieceId: source.id,
      targetPieceId: action.reactionPlan.canonicalParameters.followupTargetUnitId,
      ignoresEngagedChargeRestriction: true,
      devastatingChargeSecondTriggerAllowed: false };
  } else if (route.effectKind === "remove_debuffs") {
    const removed = (target.statuses || []).filter(isDebuff);
    target.statuses = (target.statuses || []).filter((entry) => !isDebuff(entry));
    effect.removedStatusCount = removed.length;
    effect.removedStatusHashes = removed.map((entry) => hashStarcraftTmgContract(entry));
  } else if (route.effectKind === "post_place_heal") {
    effect.healRequested = route.heal;
    effect.healApplied = healPiece(target, route.heal);
  } else if (route.effectKind === "damage_reduce_by_nearby_models") {
    effect.damageReduction = liveModels(source).filter((model) => liveModels(target)
      .some((targetModel) => modelGap(model, targetModel) <= route.rangeInches + 0.001)).length
      * route.reductionPerInRangeModel;
    effect.minimumDamage = route.minimumDamage;
  } else if (route.effectKind === "damage_reduce_fixed") {
    effect.damageReduction = route.damageReduction;
    effect.minimumDamage = route.minimumDamage;
  } else if (route.effectKind === "damage_reduce_mark_activated") {
    effect.damageReduction = route.damageReduction;
    effect.minimumDamage = route.minimumDamage;
    target.activatedPhases = { movement: false, assault: false, combat: false,
      ...(target.activatedPhases || {}), [window.phase]: true };
    effect.targetMarkedActivated = true;
  } else if (route.effectKind === "resource_cost_discount") {
    effect.resourceType = route.discountedResourceType;
    effect.resourceCostReduction = route.resourceCostReduction;
    effect.minimumResourceCost = route.minimumResourceCost;
  } else if (route.effectKind === "reserve_entry_hits") {
    effect.automaticHits = route.automaticHits;
    effect.damagePerHit = route.damagePerHit;
  } else if (route.effectKind === "evade_roll_modifier") {
    effect.evadeModifier = route.evadeModifier;
  } else if (route.effectKind === "followup_move_towards_attacker") {
    effect.followup = { actionType: "move", actorPieceId: source.id,
      targetPieceId: attacker.id,
      destinationConstraint: route.destinationConstraint,
      movementDistanceSource: route.movementDistanceSource };
  } else if (route.effectKind === "charge_roll_advantage") {
    effect.additionalDice = route.additionalDice;
    effect.keepHighest = route.keepHighest;
  } else if (route.effectKind === "charge_distance_add") {
    effect.chargeDistanceModifier = route.chargeDistanceModifier;
  } else if (route.effectKind === "charge_speed_debuff") {
    effect.speedModifier = route.speedModifier;
  } else if (route.effectKind === "ranged_attack_hit_debuff") {
    effect.hitModifier = route.hitModifier;
  } else if (route.effectKind === "evade_eligibility") {
    effect.evadeEligible = true;
  }
  return seal(effect, "effectHash");
}
function closeOrAdvanceWindow(state, window, events) {
  const nextIndex = window.priorityIndex + 1;
  if (nextIndex < window.prioritySideKeys.length) {
    const next = seal({ ...without(window, ["windowHash"]), priorityIndex: nextIndex,
      stage: "awaiting_reaction" }, "windowHash");
    state.pendingOfficialReactionWindow = clone(next);
    events.push({ type: "reaction_priority_advanced",
      prioritySideKey: next.prioritySideKeys[next.priorityIndex],
      windowHash: next.windowHash, trainingTruth: false });
    return;
  }
  const resolution = seal({ schema: "starcraft_tmg_official_reaction_resolution_v1",
    semanticVersion: "1.0.0", triggerHash: window.triggerHash,
    sourceActionHash: window.sourceActionHash,
    resumeActionHash: window.resumeActionHash,
    activationId: window.activationId,
    triggerKind: window.triggerKind,
    round: Number(state.round), phase: state.phase,
    activeSideKey: window.activeSideKey,
    resolvedChoices: clone(window.resolvedChoices),
    effects: clone(window.effects),
    activePlayerReactionResolvedFirst: true,
    oneReactionPerPlayerPerActivationEnforced: true,
    consumedByHost: false,
    rulesTruth: "official_current_product_reaction_window_resolution",
    trainingTruth: false }, "resolutionHash");
  state.officialReactionResolutionHistory = state.officialReactionResolutionHistory || [];
  state.officialReactionResolutionHistory.push(clone(resolution));
  delete state.pendingOfficialReactionWindow;
  events.push({ type: "reaction_window_closed", triggerHash: window.triggerHash,
    resolutionHash: resolution.resolutionHash, effectCount: resolution.effects.length,
    resumeActionHash: resolution.resumeActionHash, trainingTruth: false });
}
function apply(bundle, stateInput, request = {}) {
  const action = request.action;
  const domainId = action?.reactionPlan?.domainId;
  const domain = enumerate(bundle, stateInput, { sideKey: action?.sideKey })
    .parameterDomains.find((entry) => entry.domainId === domainId);
  if (!domain) fail("REACTION_PARAMETER_DOMAIN_STALE");
  const expected = instantiate(bundle, stateInput, domain,
    action.reactionPlan.canonicalParameters);
  if (!isDeepStrictEqual(expected.action, action)) fail("REACTION_ACTION_STALE");
  const state = clone(stateInput);
  const window = currentWindow(state);
  const events = [];
  if (action.actionType === "pass_reaction_family_window") {
    window.resolvedChoices.push({ sideKey: action.sideKey, choice: "pass",
      planHash: action.reactionPlan.planHash, trainingTruth: false });
    events.push({ type: "reaction_priority_passed", sideKey: action.sideKey,
      triggerHash: window.triggerHash, trainingTruth: false });
  } else {
    const route = bundle.routes.find((entry) => entry.definitionId === action.definitionId);
    const instance = routeInstances(state, route).find((entry) => (
      entry.sourceInstanceId === action.reactionPlan.sourceInstanceId));
    if (!route || !instance || !routeEligible(state, window, route, instance)) {
      fail("REACTION_ROUTE_STALE", String(action.definitionId || ""));
    }
    pay(state, route, action, events);
    const effect = reactionEffect(route, state, window, action);
    window.effects.push(clone(effect));
    window.resolvedChoices.push({ sideKey: action.sideKey, choice: "reaction",
      definitionId: route.definitionId, sourceInstanceId: instance.sourceInstanceId,
      abilityName: route.abilityName, planHash: action.reactionPlan.planHash,
      effectHash: effect.effectHash, trainingTruth: false });
    state.officialReactionHistory = state.officialReactionHistory || [];
    state.officialReactionHistory.push({ round: Number(state.round), phase: state.phase,
      activationId: window.activationId, triggerHash: window.triggerHash,
      sideKey: action.sideKey, definitionId: route.definitionId,
      sourceInstanceId: instance.sourceInstanceId, abilityName: route.abilityName,
      effectKind: route.effectKind, planHash: action.reactionPlan.planHash,
      effectHash: effect.effectHash, trainingTruth: false });
    events.push({ type: "reaction_ability_resolved", sideKey: action.sideKey,
      definitionId: route.definitionId, sourceInstanceId: instance.sourceInstanceId,
      effectKind: route.effectKind, effectHash: effect.effectHash,
      triggerHash: window.triggerHash, trainingTruth: false });
  }
  closeOrAdvanceWindow(state, window, events);
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(action), events: clone(events) });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_reaction_transition_v1",
    runtimeId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    postRevision: Number(request.options?.postRevision || 0),
    state: freezeDeep(state), action: clone(action), events,
    settlementRequired: false,
    rulesTruth: "official_current_product_reaction_transition",
    trainingTruth: false });
}

export function openOfficialReactionFamilyWindowV1(bundle, stateInput, input = {}) {
  verifyOfficialReactionFamilySourceBundleV1(bundle);
  if (currentWindow(stateInput)) fail("REACTION_WINDOW_ALREADY_OPEN");
  const triggerKind = String(input.triggerKind || "");
  const activeSideKey = String(input.activeSideKey || stateInput.activeSideKey || "");
  const phase = String(input.phase || stateInput.phase || "");
  const activationId = String(input.activationId || "");
  const sourceActionHash = String(input.sourceActionHash || "");
  const resumeActionHash = String(input.resumeActionHash || sourceActionHash);
  if (!TRIGGER_KINDS.has(triggerKind) || !SIDE_KEYS.has(activeSideKey)
    || !phase || !activationId || !/^[a-f0-9]{64}$/u.test(sourceActionHash)
    || !/^[a-f0-9]{64}$/u.test(resumeActionHash) || !object(input.context)) {
    fail("REACTION_WINDOW_INPUT_INVALID", triggerKind);
  }
  const context = { ...clone(input.context), enemyReactionAllowed:
    input.context.enemyReactionAllowed !== false };
  const triggerHash = hashStarcraftTmgContract({ triggerKind, activationId,
    sourceActionHash, context });
  const state = clone(stateInput);
  const window = seal({ schema: OFFICIAL_REACTION_FAMILY_WINDOW_SCHEMA,
    semanticVersion: "1.0.0", triggerKind, triggerHash,
    sourceActionHash, resumeActionHash, activationId,
    round: Number(state.round), phase, activeSideKey,
    prioritySideKeys: [activeSideKey, otherSide(activeSideKey)],
    priorityIndex: 0, stage: "awaiting_reaction", context,
    resolvedChoices: [], effects: [],
    activePlayerReactionPriorityFirst: true,
    oneReactionPerPlayerPerActivation: true,
    rulesTruth: "official_current_product_reaction_window",
    trainingTruth: false }, "windowHash");
  state.pendingOfficialReactionWindow = clone(window);
  const event = { type: "reaction_window_opened", triggerKind, triggerHash,
    windowHash: window.windowHash, activationId,
    prioritySideKey: activeSideKey, sourceActionHash, resumeActionHash,
    trainingTruth: false };
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase, action: { actionType: "open_reaction_window", triggerKind,
      sourceActionHash }, events: [clone(event)] });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_reaction_window_open_transition_v1",
    runtimeId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    state: freezeDeep(state), events: [event],
    rulesTruth: "official_current_product_reaction_window_opened",
    trainingTruth: false });
}

export function projectOfficialReactionFamilyResolutionV1(state, triggerHash) {
  const resolution = (state.officialReactionResolutionHistory || []).find((entry) => (
    entry.triggerHash === triggerHash && entry.consumedByHost !== true));
  if (!resolution) return null;
  const effects = clone(resolution.effects);
  const damage = effects.filter((entry) => Number(entry.damageReduction || 0) > 0);
  return freezeDeep({ schema: "starcraft_tmg_official_reaction_projection_v1",
    triggerHash, resolutionHash: resolution.resolutionHash,
    redirectTargetPieceId: effects.find((entry) => entry.redirectTargetPieceId)
      ?.redirectTargetPieceId || null,
    tough: Math.max(0, ...effects.map((entry) => Number(entry.tough || 0))),
    dodge: Math.max(0, ...effects.map((entry) => Number(entry.dodge || 0))),
    evadeModifier: Math.max(0, ...effects.map((entry) => Number(entry.evadeModifier || 0))),
    evadeEligible: effects.some((entry) => entry.evadeEligible === true),
    hitModifier: effects.reduce((sum, entry) => sum + Number(entry.hitModifier || 0), 0),
    speedModifier: effects.reduce((sum, entry) => sum + Number(entry.speedModifier || 0), 0),
    chargeDistanceModifier: effects.reduce((sum, entry) => (
      sum + Number(entry.chargeDistanceModifier || 0)), 0),
    chargeAdditionalDice: effects.reduce((sum, entry) => (
      sum + Number(entry.additionalDice || 0)), 0),
    resourceCostReduction: effects.reduce((sum, entry) => (
      sum + Number(entry.resourceCostReduction || 0)), 0),
    damageReduction: damage.reduce((sum, entry) => sum + entry.damageReduction, 0),
    minimumDamage: Math.max(0, ...damage.map((entry) => Number(entry.minimumDamage || 0))),
    automaticHits: effects.reduce((sum, entry) => sum + Number(entry.automaticHits || 0), 0),
    followups: effects.flatMap((entry) => entry.followup ? [entry.followup] : []),
    effects, rulesAuthority: true, mutationAuthority: false,
    trainingTruth: false });
}

export function consumeOfficialReactionFamilyResolutionV1(stateInput, triggerHash) {
  const state = clone(stateInput);
  const index = (state.officialReactionResolutionHistory || []).findIndex((entry) => (
    entry.triggerHash === triggerHash && entry.consumedByHost !== true));
  if (index < 0) fail("REACTION_RESOLUTION_NOT_AVAILABLE", String(triggerHash || ""));
  const projection = projectOfficialReactionFamilyResolutionV1(state, triggerHash);
  const existing = state.officialReactionResolutionHistory[index];
  state.officialReactionResolutionHistory[index] = seal({
    ...without(existing, ["resolutionHash"]), consumedByHost: true,
    consumedAtRound: Number(state.round), consumedAtPhase: state.phase,
  }, "resolutionHash");
  return freezeDeep({ state: freezeDeep(state), projection,
    rulesTruth: "official_current_product_reaction_resolution_consumed",
    trainingTruth: false });
}

function query(state, request = {}) {
  const queryKind = String(request.queryKind || "reaction_window");
  if (!new Set(["reaction_window", "reaction_resolution"]).has(queryKind)) {
    fail("REACTION_QUERY_KIND_UNSUPPORTED", queryKind);
  }
  const result = queryKind === "reaction_window" ? clone(currentWindow(state))
    : projectOfficialReactionFamilyResolutionV1(state, request.triggerHash);
  return seal({ schema: "starcraft_tmg_official_reaction_query_v1",
    semanticVersion: "1.0.0", queryKind, precision: "exact", result,
    source: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}
function lifecycle(stateInput, request = {}) {
  const eventKind = String(request.eventKind || "");
  if (!new Set(["activation_end", "round_end", "cleanup_and_refresh"])
    .has(eventKind)) return null;
  const state = clone(stateInput);
  if (eventKind === "cleanup_and_refresh") {
    state.officialReactionResolutionHistory = (
      state.officialReactionResolutionHistory || []).filter((entry) => (
      Number(entry.round) >= Number(state.round)));
  }
  return state;
}

export function createOfficialReactionFamilyAdapterV1(bundle) {
  verifyOfficialReactionFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime",
    coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "lifecycle",
      "open_reaction_window", "consume_reaction_window"],
    archetypeCounts: { ...bundle.archetypeCounts },
    sourceBundleHash: bundle.bundleHash,
    triggerWindowConsumerSeamExplicit: true,
    activePlayerReactionPriorityExact: true,
    oneReactionPerPlayerPerActivationExact: true,
    sameNamedReactionPerSourceUnitPerRoundExact: true,
    resourceAndCardPaymentExact: true,
    legalSpacePreviewApplyReplaySequencePreserved: true,
    rulesAuthority: true,
    trainingTruth: false,
  });
  return freezeDeep({ descriptor,
    legalSpace: (state, options = {}) => enumerate(bundle, state, options),
    preview: (state, request = {}) => preview(bundle, state, request),
    apply: (state, request = {}) => apply(bundle, state, request),
    query: (state, request = {}) => query(state, request),
    lifecycle: (state, request = {}) => lifecycle(state, request),
    openReactionWindow: (state, request = {}) => (
      openOfficialReactionFamilyWindowV1(bundle, state, request)),
    consumeReactionWindow: (state, request = {}) => (
      consumeOfficialReactionFamilyResolutionV1(state, request.triggerHash)),
  });
}
