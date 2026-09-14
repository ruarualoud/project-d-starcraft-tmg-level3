import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { resolveOfficialAbilityResourcePaymentV1 } from
  "../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs";
import { evaluateOfficialWithinWhollyWithinV1 } from
  "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { getOfficialCardBuildPaymentProfileV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";

export const OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID =
  "official-characteristic-status-family-adapter-v1";
export const OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_characteristic_status_family_source_bundle_v1";
export const OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_PARAMETER_KIND =
  "official_characteristic_status_family_plan_v1";

const SIDE_KEYS = new Set(["player1", "player2"]);
const QUERY_EFFECTS = new Set([
  "cannot_gain_burrowed", "charge_roll_advantage", "coherency_projection",
  "detection_aura", "evade_eligibility", "first_armour_tough",
  "hit_points_modifier", "indomitable", "passive_weapon_keyword",
  "passive_weapon_surge", "slugthrower", "titan_killers", "we_stand_as_one",
]);
const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  burrow_toggle: 3,
  cannot_gain_burrowed: 1,
  charge_roll_advantage: 5,
  coherency_projection: 5,
  detection_aura: 1,
  evade_eligibility: 1,
  first_armour_tough: 2,
  first_weapon_keyword: 11,
  fixed_heal: 1,
  grant_burrowed: 2,
  guardian_shield: 1,
  hidden_until_action: 1,
  hit_points_modifier: 1,
  impact_hit_modifier: 2,
  indomitable: 1,
  lose_burrowed: 1,
  medpack: 1,
  optical_flare: 1,
  passive_weapon_keyword: 4,
  passive_weapon_surge: 3,
  regeneration: 3,
  slugthrower: 2,
  speed_buff: 1,
  stimpack: 2,
  target_lock: 1,
  titan_killers: 1,
  we_stand_as_one: 1,
  weapon_characteristic_buff: 1,
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
function statusName(value) {
  return normalized(typeof value === "string" ? value
    : value?.statusName || value?.name || value?.statusKind);
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function livePiece(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}
function liveModels(piece) {
  return (piece?.models || []).filter((model) => model?.isDestroyed !== true
    && model?.isOnField !== false);
}
function tags(piece) {
  return new Set((piece?.combatTags || []).map(normalized));
}
function hasStatus(piece, name) {
  return (piece?.statuses || []).some((entry) => statusName(entry) === normalized(name));
}
function otherSide(sideKey) {
  return sideKey === "player1" ? "player2" : "player1";
}
function raceForPiece(state, piece) {
  const value = normalized(state.players?.[piece.sideKey]?.faction || "");
  if (value.includes("zerg") || value.includes("kerrigan")) return "zerg";
  if (value.includes("protoss") || value.includes("daelaam")) return "protoss";
  if (value.includes("terran") || value.includes("raynor")) return "terran";
  return "unknown";
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
  if (definition.sourceKind === "card_feature") {
    return { resourceType: null, resourceCost: 0 };
  }
  const match = String(definition.activationText || "").match(
    /\((\d+)\s+(Command Point|Biomass|Psionic Energy)\)/iu);
  if (!match) return { resourceType: null, resourceCost: 0 };
  const resourceType = normalized(match[2]) === "command point" ? "CP"
    : normalized(match[2]) === "biomass" ? "BM" : "Energy";
  return { resourceType, resourceCost: Number(match[1]) };
}
function baseSpec(definition, spec) {
  return {
    schema: "starcraft_tmg_official_characteristic_status_definition_route_v1",
    semanticVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
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
function weaponKeyword(effectKind, weaponScope, keyword, value, extra = {}) {
  return { effectKind, actionKind: effectKind === "first_weapon_keyword"
    ? "active_ability" : "query_modifier", weaponScope, keyword, value, ...extra };
}

function compileRoute(definition) {
  const name = definition.definitionName;
  const text = definition.sourceText;
  let spec = null;
  if (["Adrenal Overload", "Extended Claws"].includes(name)
    && /\+1 Modifier to all IMPACT Hit Rolls/iu.test(text)) {
    spec = { effectKind: "impact_hit_modifier", actionKind: "active_ability",
      impactHitModifier: 1, expiresAt: "cleanup_and_refresh" };
  } else if (name === "Burrow" && /Unengaged.+gains or loses the Burrowed Status/iu.test(text)) {
    spec = { effectKind: "burrow_toggle", actionKind: "active_ability",
      requiresUnengaged: true, expiresAt: null };
  } else if (["Charge", "Metabolic Boost"].includes(name)
    && /Charge Distance.+roll 2D6 instead of D6.+higher result/iu.test(text)) {
    spec = { effectKind: "charge_roll_advantage",
      actionKind: "active_ability", diceCount: 2, keepHighest: 1,
      expiresAt: "cleanup_and_refresh" };
  } else if (["Feral Rage", "Quick Strikes"].includes(name)
    && /first Close Combat Weapon used gains PRECISION \(2\)/iu.test(text)) {
    spec = weaponKeyword("first_weapon_keyword", "close_combat", "precision", 2,
      { expiresAt: "cleanup_and_refresh", remainingUses: 1 });
  } else if (name === "Field Repair" && /Mechanical Unit resolves the HEAL \(2\)/iu.test(text)) {
    spec = { effectKind: "fixed_heal", actionKind: "active_ability",
      healValue: 2, requiredActorTag: "mechanical", expiresAt: "immediate" };
  } else if (["Ground Weapons", "Infantry Weapons", "Vehicle Weapons"].includes(name)
    && /first Ranged Weapon used gain(?:s)? CRITICAL HIT \(1\)/iu.test(text)) {
    spec = weaponKeyword("first_weapon_keyword", "ranged", "critical_hit", 1,
      { requiredActorTag: name === "Ground Weapons" ? "ground"
        : name === "Infantry Weapons" ? "biological" : "mechanical",
      expiresAt: "cleanup_and_refresh", remainingUses: 1 });
  } else if (name === "Let's Have a Blast!"
    && /first Ranged Weapon used gain ANTI-EVADE \(1\)/iu.test(text)) {
    spec = weaponKeyword("first_weapon_keyword", "ranged", "anti_evade", 1,
      { requiredActorTag: "biological", expiresAt: "cleanup_and_refresh",
        remainingUses: 1 });
  } else if (name === "Missile Attacks"
    && /first Ranged Weapon used gains PRECISION \(1\)/iu.test(text)) {
    spec = weaponKeyword("first_weapon_keyword", "ranged", "precision", 1,
      { expiresAt: "cleanup_and_refresh", remainingUses: 1 });
  } else if (name === "Guardian Shield"
    && /Ranged Attacks targeting a Friendly Unit Within 4.+1 fewer die/iu.test(text)) {
    spec = { effectKind: "guardian_shield", actionKind: "active_ability",
      rangeMilliInches: 4000, attackPoolModifier: -1,
      lineOfSightRequired: false, expiresAt: "cleanup_and_refresh" };
  } else if (name === "Lie in Wait" && /Unengaged Ground Unit gains the Burrowed Status/iu.test(text)) {
    spec = { effectKind: "grant_burrowed", actionKind: "active_ability",
      requiredActorTag: "ground", requiresUnengaged: true, expiresAt: null };
  } else if (name === "Medpack" && /another Friendly Biological Unit Within 4.+HEAL \(X\)/iu.test(text)) {
    spec = { effectKind: "medpack", actionKind: "active_ability",
      targetKind: "another_friendly_biological_within", rangeMilliInches: 4000,
      expiresAt: "immediate" };
  } else if (name === "Nasty Surprise" && /Ground Unit loses the Burrowed Status/iu.test(text)) {
    spec = { effectKind: "lose_burrowed", actionKind: "active_ability",
      requiredActorTag: "ground", requiresBurrowed: true, expiresAt: "immediate" };
  } else if (name === "Optical Flare"
    && /Enemy Unit Within 12.+DEBUFF Range \(4\).+cannot benefit from LONG RANGE/iu.test(text)) {
    spec = { effectKind: "optical_flare", actionKind: "active_ability",
      targetKind: "enemy_within", rangeMilliInches: 12000,
      characteristic: "range", modifier: -4, longRangeAllowed: false,
      expiresAt: "cleanup_and_refresh" };
  } else if (name === "Path of Shadows" && /gains HIDDEN Status until it performs another action/iu.test(text)) {
    spec = { effectKind: "hidden_until_action", actionKind: "active_ability",
      expiresAt: "action_performed" };
  } else if (name === "Rapid Burrowing"
    && /Friendly, Unengaged Ground Zerg Unit.+gains the Burrowed Status.+already been Activated/iu.test(text)) {
    spec = { effectKind: "grant_burrowed", actionKind: "active_ability",
      targetKind: "friendly_ground_zerg_any_activation", requiredActorTag: "ground",
      requiredActorRace: "zerg", requiresUnengaged: true,
      alreadyActivatedAllowed: true, expiresAt: null };
  } else if (name === "Resonating Glaives" && /Glaive Cannon gains BUFF RoA \(1\)/iu.test(text)) {
    spec = { effectKind: "weapon_characteristic_buff", actionKind: "active_ability",
      weaponScope: "glaive cannon", characteristic: "roa", modifier: 1,
      expiresAt: "cleanup_and_refresh" };
  } else if (name === "Stimpack"
    && /NON-LETHAL DAMAGE \(2\).+BUFF Speed \(3\).+PRECISION \((2|3)\)/iu.test(text)) {
    const precision = Number(text.match(/PRECISION \((2|3)\)/iu)[1]);
    spec = { effectKind: "stimpack", actionKind: "active_ability",
      nonLethalDamage: 2, speedModifier: 3, precision,
      rangedWeaponScope: /Quad K12/iu.test(text) ? "quad k12" : "c-14 rifle",
      closeCombatWeaponScope: "all", expiresAt: "cleanup_and_refresh" };
  } else if (name === "Target Lock"
    && /Enemy Unit Within 12.+Friendly Goliath.+Autocannon.+D3\+1/iu.test(text)) {
    spec = { effectKind: "target_lock", actionKind: "active_ability",
      targetKind: "enemy_within", rangeMilliInches: 12000,
      friendlyRecordKey: "army_units:goliath", weaponScope: "autocannon",
      surgeTypes: ["light", "armoured"], surgeDice: "D3+1",
      expiresAt: "cleanup_and_refresh" };
  } else if (name === "Weapons of the Firstborn"
    && /Ground Unit.s first Ranged Weapon used gains BUFF Range \(4\)/iu.test(text)) {
    spec = weaponKeyword("first_weapon_keyword", "ranged", "buff_range", 4,
      { requiredActorTag: "ground", expiresAt: "cleanup_and_refresh",
        remainingUses: 1 });
  } else if (name === "Zealous Charge" && /Unit gains BUFF Speed \(2\)/iu.test(text)) {
    spec = { effectKind: "speed_buff", actionKind: "active_ability",
      speedModifier: 2, expiresAt: "cleanup_and_refresh" };
  } else if (name === "Adrenal Glands"
    && /Claws and Shredding Claws weapons gain PRECISION \(2\)/iu.test(text)) {
    spec = weaponKeyword("passive_weapon_keyword", ["claws", "shredding claws"],
      "precision", 2);
  } else if (name === "Ancillary Carapace"
    && /TOUGH \(1\) on the first Armour Roll of each Activation/iu.test(text)) {
    spec = { effectKind: "first_armour_tough", actionKind: "query_modifier",
      tough: 1, resetScope: "activation" };
  } else if (name === "Ares-Class Targeting System"
    && /Autocannon and Underbelly Machine Gun weapons gain PRECISION \(1\)/iu.test(text)) {
    spec = weaponKeyword("passive_weapon_keyword",
      ["autocannon", "underbelly machine gun"], "precision", 1);
  } else if (name === "Detection"
    && /Enemy Units are Within 6.+lose HIDDEN Status/iu.test(text)) {
    spec = { effectKind: "detection_aura", actionKind: "query_modifier",
      rangeMilliInches: 6000, removesHidden: true };
  } else if (name === "Guidance"
    && /Glaive Cannon Ranged weapon gains ANTI-EVADE \(2\)/iu.test(text)) {
    spec = weaponKeyword("passive_weapon_keyword", ["glaive cannon"], "anti_evade", 2);
  } else if (name === "Hydriodic Bile"
    && /Acid Saliva weapon gains Surge Type: Light, and S Dice: D3\+1/iu.test(text)) {
    spec = { effectKind: "passive_weapon_surge", actionKind: "query_modifier",
      weaponScope: ["acid saliva"], surgeTypes: ["light"], surgeDice: "D3+1" };
  } else if (name === "Indomitable"
    && /While Engaged.+target and be targeted by Unengaged Enemy Units/iu.test(text)) {
    spec = { effectKind: "indomitable", actionKind: "query_modifier",
      crossEngagementTargetingAllowed: true, defenderEvadeEligible: true };
  } else if (name === "Kinetic Foam" && /Hit Points characteristic by 1/iu.test(text)) {
    spec = { effectKind: "hit_points_modifier", actionKind: "query_modifier",
      hitPointsModifier: 1 };
  } else if (name === "Precognition" && /eligible to make an Evade roll against all attacks/iu.test(text)) {
    spec = { effectKind: "evade_eligibility", actionKind: "query_modifier",
      allAttacks: true };
  } else if (name === "Regeneration"
    && /becomes Activated.+Burrowed Status.+HEAL \(2\)/iu.test(text)) {
    spec = { effectKind: "regeneration", actionKind: "system_lifecycle",
      eventKind: "activation_start", healValue: 2, requiresBurrowed: true };
  } else if (name === "Shield Overcharge"
    && /TOUGH \(2\) on the first Armour Roll each Round/iu.test(text)) {
    spec = { effectKind: "first_armour_tough", actionKind: "query_modifier",
      tough: 2, resetScope: "round" };
  } else if (name === "Slugthrower"
    && /Ranged Attack with a C-14 Rifle.+Within 8.+ANTI-EVADE \(1\)/iu.test(text)) {
    spec = { effectKind: "slugthrower", actionKind: "query_modifier",
      weaponScope: ["c-14 rifle"], rangeMilliInches: 8000,
      keyword: "anti_evade", value: 1 };
  } else if (name === "Squadron" && /Horizontal Coherency is 4/iu.test(text)) {
    spec = { effectKind: "coherency_projection", actionKind: "query_modifier",
      horizontalCoherencyMilliInches: 4000 };
  } else if (name === "Titan Killers"
    && /Close Combat Attack.+target is Size 3 or larger.+Damage characteristic is treated as 2/iu.test(text)) {
    spec = { effectKind: "titan_killers", actionKind: "query_modifier",
      minimumTargetSize: 3, damageSetTo: 2 };
  } else if (name === "Underdeveloped Claws" && /cannot gain Burrowed Status/iu.test(text)) {
    spec = { effectKind: "cannot_gain_burrowed", actionKind: "query_modifier" };
  } else if (name === "We Stand as One"
    && /Close Combat Attack.+target is Engaged with at least 1 other Friendly Unit.+PRECISION \(2\)/iu.test(text)) {
    spec = { effectKind: "we_stand_as_one", actionKind: "query_modifier",
      keyword: "precision", value: 2, requiresOtherFriendlyEngagement: true };
  }
  if (!spec) fail("CHARACTERISTIC_STATUS_DEFINITION_COMPILER_UNRECOGNIZED",
    `${definition.recordKey}:${name}`);
  return seal(baseSpec(definition, spec), "routeHash");
}

export function createOfficialCharacteristicStatusFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("CHARACTERISTIC_STATUS_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pendingIds = new Set(denominator.gapDefinitionIds);
  const owned = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 233 && pendingIds.has(entry.definitionId)));
  const definitions = owned.map((entry) => catalogue.definitions.find((candidate) => (
    candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 60 || definitions.some((entry) => !entry)) {
    fail("CHARACTERISTIC_STATUS_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(compileRoute).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
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
    arbitraryProseExecutionClaimed: false,
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_characteristic_status_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 60 || bundle.routes?.length !== 60
    || new Set(bundle.definitionIds || []).size !== 60
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 60
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 60
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.compilerDenominatorComplete !== true
    || bundle.exactSourcePatternsRequired !== true
    || bundle.arbitraryProseExecutionClaimed !== false
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("CHARACTERISTIC_STATUS_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialCharacteristicStatusFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    capability: route.actionKind === "active_ability"
      ? "authoritative_action" : route.runtimeRole,
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function unitWithin(state, sourcePiece, targetPiece, rangeMilliInches) {
  const assessments = liveModels(sourcePiece).map((model) => (
    evaluateOfficialWithinWhollyWithinV1({
      state,
      dataBundle: state.officialModelBaseGeometryDataBundle,
      source: { kind: "model", unitId: sourcePiece.id, modelId: model.id },
      targetUnitId: targetPiece.id,
      rangeMilliInches,
    })
  ));
  return { within: assessments.some((entry) => entry.unitWithin), assessments };
}
function engagedWithEnemy(state, piece) {
  return (state.pieces || []).some((enemy) => enemy.sideKey !== piece.sideKey
    && activePiece(enemy) && tags(enemy).has("ground")
    && unitWithin(state, piece, enemy, 1000).within);
}
function passiveRoutesForPiece(bundle, state, piece) {
  return bundle.routes.filter((route) => route.recordKey === piece.officialUnitRecordKey
    && route.actionKind !== "active_ability" && fieldedFeature(piece, route)
    && activePiece(piece));
}
function cannotGainBurrowed(bundle, state, piece) {
  return passiveRoutesForPiece(bundle, state, piece).some((route) => (
    route.effectKind === "cannot_gain_burrowed"));
}
function routeInstances(state, route) {
  if (route.sourceKind === "unit_feature") {
    return (state.pieces || []).filter((piece) => piece.officialUnitRecordKey === route.recordKey
      && livePiece(piece) && fieldedFeature(piece, route)).map((piece) => ({
      sourceInstanceId: piece.id, sideKey: piece.sideKey, sourcePiece: piece,
    }));
  }
  return Object.entries(state.cardResources || {}).flatMap(([sideKey, cards]) => (
    (cards || []).filter((card) => card.officialCardRecordKey === route.recordKey)
      .map((card) => ({ sourceInstanceId: card.cardInstanceId, sideKey, card }))
  ));
}
function usedThisRound(state, route, pieceId) {
  return (state.activeAbilityUseHistory || []).some((entry) => (
    Number(entry.round) === Number(state.round) && entry.pieceId === pieceId
      && entry.abilityName === route.abilityName));
}
function activeTimingAvailable(state, route, sideKey, actor) {
  if (!SIDE_KEYS.has(sideKey) || state.activeSideKey !== sideKey
    || (route.phase !== "any" && state.phase !== route.phase)
    || state.players?.[sideKey]?.passedPhases?.[state.phase] === true
    || !activePiece(actor) || actor.sideKey !== sideKey) return false;
  if (route.alreadyActivatedAllowed !== true
    && actor.activatedPhases?.[state.phase] === true
    && state.selectedRosterActivationWindow?.stage !== "after_action") return false;
  const window = state.selectedRosterActivationWindow;
  if (route.alreadyActivatedAllowed !== true && window
    && (window.sideKey !== sideKey || window.pieceId !== actor.id
      || window.phase !== state.phase)) return false;
  return !usedThisRound(state, route, actor.id);
}
function actorMatches(state, route, actor) {
  if (!activePiece(actor) || actor.isStructure === true) return false;
  if (route.requiredActorTag && !tags(actor).has(route.requiredActorTag)) return false;
  if (route.requiredActorRace && raceForPiece(state, actor) !== route.requiredActorRace) {
    return false;
  }
  if (route.requiresUnengaged === true && engagedWithEnemy(state, actor)) return false;
  if (route.requiresBurrowed === true && !hasStatus(actor, "burrowed")) return false;
  if (route.effectKind === "grant_burrowed" && cannotGainBurrowed(
    state.officialCharacteristicStatusFamilySourceBundle, state, actor)) return false;
  return true;
}
function actionActors(state, route, instance) {
  if (route.sourceKind === "unit_feature") return [instance.sourcePiece];
  return (state.pieces || []).filter((piece) => piece.sideKey === instance.sideKey
    && actorMatches(state, route, piece));
}
function cardById(state, sideKey, id) {
  return (state.cardResources?.[sideKey] || []).find((entry) => (
    entry.cardInstanceId === id));
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
function paymentSelections(state, route, sideKey) {
  if (!route.resourceType || route.resourceCost === 0) return [[]];
  const cards = (state.cardResources?.[sideKey] || []).filter((entry) => (
    entry.readiness === "ready"));
  const rows = [];
  for (let mask = 0; mask < (1 << cards.length); mask += 1) {
    const selected = cards.filter((_, index) => (mask & (1 << index)) !== 0);
    try {
      resolveOfficialAbilityResourcePaymentV1({
        cardDataBundle: state.officialCardBuildPaymentDataBundle,
        resourceType: route.resourceType,
        resourceCost: route.resourceCost,
        selectedCardInstanceSetComplete: true,
        selectedCardInstances: selected.map((card) => paymentRef(state, card)),
      });
      rows.push(selected.map((entry) => entry.cardInstanceId).sort());
    } catch { /* Invalid subsets are absent from LegalSpace. */ }
  }
  return rows.sort((left, right) => left.join("|").localeCompare(right.join("|")));
}
function targetIds(state, route, actor) {
  if (route.targetKind === "enemy_within") {
    return (state.pieces || []).filter((target) => target.sideKey === otherSide(actor.sideKey)
      && activePiece(target)
      && unitWithin(state, actor, target, route.rangeMilliInches).within)
      .map((entry) => entry.id).sort();
  }
  if (route.targetKind === "another_friendly_biological_within") {
    return (state.pieces || []).filter((target) => target.sideKey === actor.sideKey
      && target.id !== actor.id && activePiece(target) && tags(target).has("biological")
      && unitWithin(state, actor, target, route.rangeMilliInches).within)
      .map((entry) => entry.id).sort();
  }
  return [];
}
function routeAvailable(state, route, instance, actor) {
  if (instance.card?.readiness !== undefined && instance.card.readiness !== "ready") {
    fail("CHARACTERISTIC_STATUS_SOURCE_CARD_NOT_READY", instance.sourceInstanceId);
  }
  if (!activeTimingAvailable(state, route, instance.sideKey, actor)
    || !actorMatches(state, route, actor)) {
    fail("CHARACTERISTIC_STATUS_ROUTE_UNAVAILABLE", actor.id);
  }
  const targets = targetIds(state, route, actor);
  if (route.targetKind && route.targetKind !== "friendly_ground_zerg_any_activation"
    && targets.length === 0) fail("CHARACTERISTIC_STATUS_TARGET_UNAVAILABLE", route.abilityName);
  const payments = paymentSelections(state, route, instance.sideKey);
  if (payments.length === 0) fail("CHARACTERISTIC_STATUS_PAYMENT_UNAVAILABLE");
  return { targets, payments };
}
function domainFor(state, route, instance, actor, available) {
  const required = ["activeUnitId", "paymentCardInstanceIds"];
  if (available.targets.length > 0) required.push("targetUnitId");
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_PARAMETER_KIND,
    executorId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    actionType: "resolve_characteristic_status_ability",
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: instance.sourceInstanceId,
    sourceKind: route.sourceKind,
    sideKey: actor.sideKey,
    phase: state.phase,
    pieceId: actor.id,
    abilityName: route.abilityName,
    effectKind: route.effectKind,
    parameterSchema: { type: "object", required,
      activeUnitId: { const: actor.id },
      paymentCardInstanceIds: { enum: clone(available.payments) },
      targetUnitId: available.targets.length > 0
        ? { enum: clone(available.targets) } : null },
    constraints: { useTiming: ["before_action", "after_action"],
      oncePerRoundPerUnitAndName: true,
      alreadyActivatedAllowed: route.alreadyActivatedAllowed === true,
      sourceCardInstanceId: instance.card?.cardInstanceId || null,
      resourceType: route.resourceType, resourceCost: route.resourceCost,
      rangeMilliInches: route.rangeMilliInches || null,
      sourceRouteHash: route.routeHash },
    confirmationClass: "rules_owned_direct_action",
    rulesTruth: "official_current_product_characteristic_status_parameter_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function enumerate(bundle, state, options = {}) {
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("CHARACTERISTIC_STATUS_SIDE_INVALID", sideKey);
  const parameterDomains = [];
  const candidates = [];
  const catalogueScope = options.scope === "catalogue";
  for (const route of bundle.routes) {
    if (route.actionKind !== "active_ability") continue;
    for (const instance of routeInstances(state, route).filter((entry) => (
      catalogueScope || entry.sideKey === sideKey))) {
      for (const actor of actionActors(state, route, instance)) {
        try {
          const available = routeAvailable(state, route, instance, actor);
          parameterDomains.push(domainFor(state, route, instance, actor, available));
        } catch (error) {
          if (options.includeDisabled === true) candidates.push({
            actionType: "resolve_characteristic_status_ability",
            definitionId: route.definitionId,
            sourceInstanceId: instance.sourceInstanceId,
            pieceId: actor.id,
            sideKey: actor.sideKey,
            effectKind: route.effectKind,
            executorId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
            executorVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
            isEnabled: false,
            disabledReason: String(error?.message || error).split(":")[0],
            score: 0, details: { trainingTruth: false },
          });
        }
      }
    }
  }
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_characteristic_status_legal_space_v1",
    runtimeId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    candidates: candidates.sort((left, right) => (
      `${left.definitionId}:${left.sourceInstanceId}:${left.pieceId}`.localeCompare(
        `${right.definitionId}:${right.sourceInstanceId}:${right.pieceId}`))),
    parameterDomains: parameterDomains.sort((left, right) => (
      left.domainId.localeCompare(right.domainId))),
    queryOnlyDefinitionIds: bundle.routes.filter((entry) => (
      entry.actionKind !== "active_ability")).map((entry) => entry.definitionId).sort(),
    currentProductCharacteristicStatusDenominatorComplete: true,
    searchAndStrategyExcludedFromAuthority: true,
    trainingTruth: false,
  });
}

function instantiate(bundle, state, domain, parameters = {}) {
  const current = enumerate(bundle, state, { sideKey: domain?.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => entry.domainId === domain?.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("CHARACTERISTIC_STATUS_PARAMETER_DOMAIN_STALE");
  }
  const route = bundle.routes.find((entry) => entry.definitionId === domain.definitionId);
  const actor = state.pieces.find((entry) => entry.id === domain.pieceId);
  if (!route || !actor || !object(parameters)
    || parameters.activeUnitId !== actor.id) fail("CHARACTERISTIC_STATUS_ACTION_INPUT_INVALID");
  const paymentCardInstanceIds = [...new Set((parameters.paymentCardInstanceIds || [])
    .map(String))].sort();
  if (!domain.parameterSchema.paymentCardInstanceIds.enum.some((entry) => (
    isDeepStrictEqual(entry, paymentCardInstanceIds)))) {
    fail("CHARACTERISTIC_STATUS_PAYMENT_SELECTION_INVALID");
  }
  const targetUnitId = parameters.targetUnitId === undefined
    ? null : String(parameters.targetUnitId);
  if (domain.parameterSchema.targetUnitId
    && !domain.parameterSchema.targetUnitId.enum.includes(targetUnitId)) {
    fail("CHARACTERISTIC_STATUS_TARGET_SELECTION_INVALID", targetUnitId);
  }
  const canonicalParameters = { activeUnitId: actor.id,
    paymentCardInstanceIds, ...(targetUnitId ? { targetUnitId } : {}) };
  const plan = seal({
    schema: "starcraft_tmg_official_characteristic_status_ability_plan_v1",
    semanticVersion: "1.0.0",
    domainId: domain.domainId,
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: domain.sourceInstanceId,
    sourceKind: route.sourceKind,
    sideKey: actor.sideKey,
    phase: state.phase,
    pieceId: actor.id,
    abilityName: route.abilityName,
    effectKind: route.effectKind,
    canonicalParameters,
    sourceRouteHash: route.routeHash,
    rulesTruth: "official_current_product_characteristic_status_ability_plan",
    trainingTruth: false,
  }, "planHash");
  const action = freezeDeep({
    actionType: "resolve_characteristic_status_ability",
    sideKey: actor.sideKey,
    phase: state.phase,
    pieceId: actor.id,
    definitionId: route.definitionId,
    abilityName: route.abilityName,
    characteristicStatusPlan: plan,
    executorId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
  });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_current_product_characteristic_status_instantiation",
    trainingTruth: false });
}
function preview(bundle, state, request = {}) {
  const instantiated = instantiate(bundle, state, request.domain, request.parameters || {});
  return seal({
    schema: "starcraft_tmg_official_characteristic_status_preview_v1",
    semanticVersion: "1.0.0",
    action: instantiated.action,
    actionHash: hashStarcraftTmgContract(instantiated.action),
    confirmationClass: request.domain.confirmationClass,
    mutationApplied: false,
    rulesAuthority: true,
    rulesTruth: "official_current_product_characteristic_status_preview",
    trainingTruth: false,
  }, "previewHash");
}
function status(route, state, actor, target, properties = {}) {
  const body = {
    schema: "starcraft_tmg_official_characteristic_status_effect_v1",
    statusName: properties.statusName,
    statusKind: properties.statusKind || "status",
    characteristic: properties.characteristic || null,
    modifier: properties.modifier ?? null,
    sourceSideKey: actor.sideKey,
    sourcePieceId: actor.id,
    targetPieceId: target.id,
    sourceDefinitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceAdapterId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    roundApplied: Number(state.round),
    expiresAt: properties.expiresAt ?? route.expiresAt ?? null,
    ...properties,
    trainingTruth: false,
  };
  return seal(body, "statusEffectHash");
}
function effect(route, state, actor, target, properties = {}) {
  const body = {
    schema: "starcraft_tmg_official_characteristic_status_runtime_effect_v1",
    effectId: hashStarcraftTmgContract({ round: state.round, phase: state.phase,
      sourceDefinitionId: route.definitionId, actorId: actor.id,
      targetId: target.id, ordinal: state.log?.length || 0 }).slice(0, 24),
    effectKind: route.effectKind,
    abilityName: route.abilityName,
    sourceSideKey: actor.sideKey,
    sourcePieceId: actor.id,
    targetPieceId: target.id,
    sourceDefinitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    roundApplied: Number(state.round),
    phaseApplied: state.phase,
    expiresAt: route.expiresAt ?? null,
    ...properties,
    trainingTruth: false,
  };
  return seal(body, "effectHash");
}
function appendEffect(piece, value) {
  piece.officialAbilityEffects = piece.officialAbilityEffects || [];
  piece.officialAbilityEffects.push(value);
}
function addStatus(piece, value) {
  piece.statuses = piece.statuses || [];
  piece.statuses.push(value);
}
function removeStatus(piece, names) {
  const normalizedNames = new Set(names.map(normalized));
  piece.statuses = (piece.statuses || []).filter((entry) => (
    !normalizedNames.has(statusName(entry))));
}
function markerFor(value) {
  return seal({ schema: "starcraft_tmg_official_characteristic_status_marker_v1",
    id: `status-marker-${value.statusEffectHash.slice(0, 24)}`,
    markerType: value.statusKind,
    label: value.statusName,
    targetPieceId: value.targetPieceId,
    sourceDefinitionId: value.sourceDefinitionId,
    statusEffectHash: value.statusEffectHash,
    expiresAt: value.expiresAt,
    trainingTruth: false }, "markerHash");
}
function applyHeal(state, route, actor, target, healValue, events) {
  const before = Number(target.damageMarker || 0);
  const effectiveHeal = Math.min(before, Math.max(0, Number(healValue)));
  target.damageMarker = before - effectiveHeal;
  const resolution = seal({ schema: "starcraft_tmg_official_characteristic_status_heal_v1",
    sourceDefinitionId: route.definitionId, sourcePieceId: actor.id,
    targetPieceId: target.id, healValue: Number(healValue),
    damageMarkerBefore: before, effectiveHeal,
    discardedHeal: Number(healValue) - effectiveHeal,
    damageMarkerAfter: target.damageMarker,
    destroyedModelsReturned: 0, shieldedStatusRestored: false,
    rulesTruth: "official_heal_removes_accumulated_damage_only",
    trainingTruth: false }, "healResolutionHash");
  events.push({ type: "heal_resolved", targetPieceId: target.id,
    healResolutionHash: resolution.healResolutionHash,
    effectiveHeal, trainingTruth: false });
  return resolution;
}
function applyBurrow(state, route, actor, target, mode, events) {
  if (mode === "gain") {
    if (!hasStatus(target, "burrowed")) {
      const burrowed = status(route, state, actor, target,
        { statusName: "burrowed", statusKind: "status", expiresAt: null });
      const hidden = status(route, state, actor, target,
        { statusName: "hidden", statusKind: "status", expiresAt: null,
          dependentOnStatusName: "burrowed" });
      addStatus(target, burrowed); addStatus(target, hidden);
      state.board.effectMarkers.push(markerFor(burrowed), markerFor(hidden));
    }
  } else {
    const removedHashes = new Set((target.statuses || []).filter((entry) => (
      ["burrowed", "hidden"].includes(statusName(entry)))).map((entry) => (
      entry.statusEffectHash)).filter(Boolean));
    removeStatus(target, ["burrowed", "hidden"]);
    state.board.effectMarkers = (state.board.effectMarkers || []).filter((entry) => (
      !removedHashes.has(entry.statusEffectHash)));
  }
  events.push({ type: `burrowed_status_${mode === "gain" ? "gained" : "removed"}`,
    targetPieceId: target.id, sourceDefinitionId: route.definitionId,
    hiddenStatusFollowsBurrowed: true, trainingTruth: false });
}
function applyEffect(state, route, actor, action, events) {
  const targetId = action.characteristicStatusPlan.canonicalParameters.targetUnitId;
  const target = targetId ? state.pieces.find((entry) => entry.id === targetId) : actor;
  if (!target) fail("CHARACTERISTIC_STATUS_APPLY_TARGET_UNKNOWN", String(targetId || ""));
  if (route.effectKind === "fixed_heal") {
    applyHeal(state, route, actor, target, route.healValue, events);
  } else if (route.effectKind === "medpack") {
    const modelCount = liveModels(actor).filter((model) => (
      evaluateOfficialWithinWhollyWithinV1({ state,
        dataBundle: state.officialModelBaseGeometryDataBundle,
        source: { kind: "model", unitId: actor.id, modelId: model.id },
        targetUnitId: target.id, rangeMilliInches: route.rangeMilliInches }).unitWithin
    )).length;
    applyHeal(state, route, actor, target, modelCount, events);
  } else if (route.effectKind === "burrow_toggle") {
    applyBurrow(state, route, actor, target,
      hasStatus(target, "burrowed") ? "lose" : "gain", events);
  } else if (route.effectKind === "grant_burrowed") {
    applyBurrow(state, route, actor, target, "gain", events);
  } else if (route.effectKind === "lose_burrowed") {
    applyBurrow(state, route, actor, target, "lose", events);
  } else if (route.effectKind === "hidden_until_action") {
    const value = status(route, state, actor, actor,
      { statusName: "hidden", statusKind: "status", expiresAt: "action_performed" });
    addStatus(actor, value); state.board.effectMarkers.push(markerFor(value));
    events.push({ type: "hidden_status_gained", targetPieceId: actor.id,
      statusEffectHash: value.statusEffectHash, expiresAt: "action_performed",
      trainingTruth: false });
  } else if (route.effectKind === "optical_flare") {
    const value = status(route, state, actor, target,
      { statusName: "DEBUFF Range (4)", statusKind: "debuff",
        characteristic: "range", modifier: -4, minimumValue: 0,
        appliesTo: "ranged_weapons", longRangeAllowed: false,
        expiresAt: "cleanup_and_refresh" });
    addStatus(target, value); state.board.effectMarkers.push(markerFor(value));
    appendEffect(target, effect(route, state, actor, target,
      { characteristic: "range", modifier: -4, minimumValue: 0,
        longRangeAllowed: false }));
    events.push({ type: "range_debuff_applied", targetPieceId: target.id,
      statusEffectHash: value.statusEffectHash, trainingTruth: false });
  } else if (route.effectKind === "stimpack") {
    const profile = getOfficialCombatProfileV1(
      state.officialCombatProfileBundle, actor.officialUnitRecordKey);
    const before = Number(actor.damageMarker || 0);
    actor.damageMarker = Math.min(before + route.nonLethalDamage,
      Math.max(0, Number(profile.hitPoints) - 1));
    const value = status(route, state, actor, actor,
      { statusName: "BUFF Speed (3)", statusKind: "buff",
        characteristic: "speed", modifier: route.speedModifier,
        expiresAt: "cleanup_and_refresh" });
    addStatus(actor, value); state.board.effectMarkers.push(markerFor(value));
    appendEffect(actor, effect(route, state, actor, actor,
      { speedModifier: route.speedModifier, precision: route.precision,
        rangedWeaponScope: route.rangedWeaponScope,
        closeCombatWeaponScope: route.closeCombatWeaponScope,
        nonLethalDamageApplied: actor.damageMarker - before }));
    events.push({ type: "stimpack_resolved", targetPieceId: actor.id,
      damageMarkerBefore: before, damageMarkerAfter: actor.damageMarker,
      statusEffectHash: value.statusEffectHash, trainingTruth: false });
  } else {
    const value = effect(route, state, actor, target, {
      impactHitModifier: route.impactHitModifier ?? null,
      diceCount: route.diceCount ?? null,
      keepHighest: route.keepHighest ?? null,
      weaponScope: clone(route.weaponScope ?? null),
      keyword: route.keyword ?? null,
      value: route.value ?? null,
      remainingUses: route.remainingUses ?? null,
      characteristic: route.characteristic ?? null,
      modifier: route.modifier ?? null,
      speedModifier: route.speedModifier ?? null,
      rangeMilliInches: route.rangeMilliInches ?? null,
      attackPoolModifier: route.attackPoolModifier ?? null,
      lineOfSightRequired: route.lineOfSightRequired ?? null,
      surgeTypes: clone(route.surgeTypes ?? null),
      surgeDice: route.surgeDice ?? null,
      friendlyRecordKey: route.friendlyRecordKey ?? null,
    });
    appendEffect(target, value);
    if (route.effectKind === "speed_buff"
      || route.effectKind === "weapon_characteristic_buff") {
      const statusValue = status(route, state, actor, target,
        { statusName: route.effectKind === "speed_buff"
          ? `BUFF Speed (${route.speedModifier})` : `BUFF RoA (${route.modifier})`,
        statusKind: "buff", characteristic: route.effectKind === "speed_buff"
          ? "speed" : "roa", modifier: route.speedModifier ?? route.modifier,
        expiresAt: "cleanup_and_refresh" });
      addStatus(target, statusValue); state.board.effectMarkers.push(markerFor(statusValue));
    }
    events.push({ type: "characteristic_status_effect_applied",
      targetPieceId: target.id, effectKind: route.effectKind,
      effectHash: value.effectHash, trainingTruth: false });
  }
}
function pay(state, route, action, events) {
  const ids = action.characteristicStatusPlan.canonicalParameters.paymentCardInstanceIds;
  if (route.resourceType) {
    const cards = ids.map((id) => cardById(state, action.sideKey, id));
    if (cards.some((entry) => !entry)) fail("CHARACTERISTIC_STATUS_PAYMENT_CARD_UNKNOWN");
    const payment = resolveOfficialAbilityResourcePaymentV1({
      cardDataBundle: state.officialCardBuildPaymentDataBundle,
      resourceType: route.resourceType, resourceCost: route.resourceCost,
      selectedCardInstanceSetComplete: true,
      selectedCardInstances: cards.map((card) => paymentRef(state, card)),
    });
    for (const id of payment.selectedCardsExhaustOnCommit) {
      cardById(state, action.sideKey, id).readiness = "exhausted";
    }
    events.push({ type: "ability_resource_paid", resourceType: route.resourceType,
      resourceCost: route.resourceCost,
      paymentResultHash: payment.resultHash,
      exhaustedCardInstanceIds: payment.selectedCardsExhaustOnCommit,
      trainingTruth: false });
  } else if (route.sourceKind === "card_feature") {
    const card = cardById(state, action.sideKey,
      action.characteristicStatusPlan.sourceInstanceId);
    if (!card || card.readiness !== "ready") {
      fail("CHARACTERISTIC_STATUS_SOURCE_CARD_NOT_READY");
    }
    card.readiness = "exhausted";
    events.push({ type: "tactical_card_exhausted",
      cardInstanceId: card.cardInstanceId, trainingTruth: false });
  }
}
function apply(bundle, stateInput, request = {}) {
  const action = request.action;
  const domainId = action?.characteristicStatusPlan?.domainId;
  const domain = enumerate(bundle, stateInput, { sideKey: action?.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => entry.domainId === domainId);
  if (!domain) fail("CHARACTERISTIC_STATUS_PARAMETER_DOMAIN_STALE");
  const expected = instantiate(bundle, stateInput, domain,
    action.characteristicStatusPlan.canonicalParameters);
  if (!isDeepStrictEqual(expected.action, action)) fail("CHARACTERISTIC_STATUS_ACTION_STALE");
  const route = bundle.routes.find((entry) => entry.definitionId === action.definitionId);
  const state = clone(stateInput);
  const actor = state.pieces.find((entry) => entry.id === action.pieceId);
  const events = [];
  pay(state, route, action, events);
  applyEffect(state, route, actor, action, events);
  state.activeAbilityUseHistory = state.activeAbilityUseHistory || [];
  state.activeAbilityUseHistory.push({
    useKey: `${state.round}:${route.abilityName}:${actor.id}`,
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    pieceId: actor.id, routeId: route.definitionId,
    abilityName: route.abilityName,
    planHash: action.characteristicStatusPlan.planHash,
    trainingTruth: false,
  });
  state.characteristicStatusAbilityHistory = state.characteristicStatusAbilityHistory || [];
  state.characteristicStatusAbilityHistory.push({ round: Number(state.round),
    phase: state.phase, sideKey: actor.sideKey, pieceId: actor.id,
    definitionId: route.definitionId, effectKind: route.effectKind,
    planHash: action.characteristicStatusPlan.planHash,
    events: clone(events), trainingTruth: false });
  if (route.alreadyActivatedAllowed !== true) {
    const prior = state.selectedRosterActivationWindow;
    state.selectedRosterActivationWindow = {
      schema: "starcraft_tmg_selected_roster_activation_window_v1",
      round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
      pieceId: actor.id, stage: prior?.stage || "before_action", trainingTruth: false };
  }
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(action), events: clone(events) });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_characteristic_status_transition_v1",
    runtimeId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    postRevision: Number(request.options?.postRevision || 0),
    state: freezeDeep(state), action: clone(action), events,
    rulesTruth: "official_current_product_characteristic_status_transition",
    trainingTruth: false });
}

function weaponMatches(scope, weaponName) {
  if (scope === "all") return true;
  const values = Array.isArray(scope) ? scope : [scope];
  return values.map(normalized).includes(normalized(weaponName));
}
function activeEffects(piece) {
  return (piece?.officialAbilityEffects || []).filter((entry) => (
    entry?.effectHash && entry?.sourceDefinitionId));
}
function maximumKeyword(rows, keyword, weaponName) {
  return Math.max(0, ...rows.filter((entry) => entry.keyword === keyword
    && weaponMatches(entry.weaponScope, weaponName)).map((entry) => Number(entry.value || 0)));
}
function targetSize(state, targetPieceId) {
  const target = state.pieces.find((entry) => entry.id === targetPieceId);
  if (!target) return null;
  return Number(getOfficialCombatProfileV1(
    state.officialCombatProfileBundle, target.officialUnitRecordKey).sizeCharacteristic);
}
function targetEngagedWithOtherFriendly(state, actor, target) {
  return (state.pieces || []).some((piece) => piece.sideKey === actor.sideKey
    && piece.id !== actor.id && activePiece(piece)
    && unitWithin(state, piece, target, 1000).within);
}
function projection(bundle, state, request) {
  const piece = state.pieces.find((entry) => entry.id === request.pieceId);
  if (!piece) fail("CHARACTERISTIC_STATUS_QUERY_PIECE_UNKNOWN", String(request.pieceId || ""));
  const context = object(request.context) ? request.context : {};
  const weaponName = normalized(context.weaponName);
  const passives = passiveRoutesForPiece(bundle, state, piece);
  const effects = activeEffects(piece);
  const passiveWeapons = passives.filter((entry) => (
    entry.effectKind === "passive_weapon_keyword"));
  const firstWeapon = effects.filter((entry) => entry.effectKind === "first_weapon_keyword"
    && (!context.attackKind || normalized(entry.weaponScope) === normalized(context.attackKind)));
  const stimpack = effects.filter((entry) => entry.effectKind === "stimpack");
  const precision = Math.max(
    maximumKeyword(passiveWeapons, "precision", weaponName),
    ...firstWeapon.filter((entry) => entry.keyword === "precision")
      .map((entry) => Number(entry.value || 0)),
    ...stimpack.filter((entry) => weaponMatches(entry.rangedWeaponScope, weaponName)
      || (normalized(context.attackKind) === "close_combat"
        && entry.closeCombatWeaponScope === "all"))
      .map((entry) => Number(entry.precision || 0)),
  );
  let antiEvade = Math.max(maximumKeyword(passiveWeapons, "anti_evade", weaponName),
    ...firstWeapon.filter((entry) => entry.keyword === "anti_evade")
      .map((entry) => Number(entry.value || 0)));
  const slug = passives.find((entry) => entry.effectKind === "slugthrower"
    && weaponMatches(entry.weaponScope, weaponName));
  if (slug && context.targetPieceId) {
    const target = state.pieces.find((entry) => entry.id === context.targetPieceId);
    if (target && unitWithin(state, piece, target, slug.rangeMilliInches).within) {
      antiEvade = Math.max(antiEvade, slug.value);
    }
  }
  const targetPiece = state.pieces.find((entry) => entry.id === context.targetPieceId);
  const targetLocks = activeEffects(targetPiece).filter((entry) => entry.effectKind === "target_lock"
      && entry.sourceSideKey === piece.sideKey
      && entry.targetPieceId === context.targetPieceId
      && piece.officialUnitRecordKey === entry.friendlyRecordKey
      && normalized(weaponName) === normalized(entry.weaponScope));
  const guardianSources = targetPiece ? (state.pieces || []).filter((source) => (
    source.sideKey === targetPiece.sideKey && activePiece(source)
      && activeEffects(source).some((entry) => entry.effectKind === "guardian_shield")
      && unitWithin(state, source, targetPiece, 4000).within
  )) : [];
  const detectionSources = (state.pieces || []).filter((source) => source.sideKey !== piece.sideKey
    && activePiece(source)
    && passiveRoutesForPiece(bundle, state, source).some((entry) => (
      entry.effectKind === "detection_aura"))
    && unitWithin(state, source, piece, 6000).within);
  const tough = Math.max(0, ...passives.filter((entry) => entry.effectKind === "first_armour_tough"
    && (entry.resetScope === "activation"
      ? Number(context.armourRollOrdinalInActivation) === 1
      : Number(context.armourRollOrdinalInRound) === 1)).map((entry) => entry.tough));
  const surgeRoute = passives.find((entry) => entry.effectKind === "passive_weapon_surge"
    && weaponMatches(entry.weaponScope, weaponName));
  const titan = passives.find((entry) => entry.effectKind === "titan_killers"
    && normalized(context.attackKind) === "close_combat"
    && targetSize(state, context.targetPieceId) >= entry.minimumTargetSize);
  const target = targetPiece;
  const stand = passives.find((entry) => entry.effectKind === "we_stand_as_one"
    && normalized(context.attackKind) === "close_combat" && target
    && targetEngagedWithOtherFriendly(state, piece, target));
  const charge = effects.find((entry) => entry.effectKind === "charge_roll_advantage");
  const optical = (piece.statuses || []).filter((entry) => (
    entry.sourceAdapterId === OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID
      && entry.statusKind === "debuff" && entry.characteristic === "range"));
  return {
    pieceId: piece.id,
    applicableDefinitionIds: [...new Set([...passives.map((entry) => entry.definitionId),
      ...effects.map((entry) => entry.sourceDefinitionId)])].sort(),
    speedModifier: Math.max(0, ...effects.map((entry) => Number(entry.speedModifier || 0))),
    rangeModifier: Math.min(0, ...optical.map((entry) => Number(entry.modifier || 0)))
      + Math.max(0, ...firstWeapon.filter((entry) => entry.keyword === "buff_range")
        .map((entry) => Number(entry.value || 0))),
    rateOfAttackModifier: Math.max(0, ...effects.filter((entry) => (
      entry.effectKind === "weapon_characteristic_buff"
        && weaponMatches(entry.weaponScope, weaponName))).map((entry) => Number(entry.modifier || 0))),
    hitPointsModifier: Math.max(0, ...passives.filter((entry) => (
      entry.effectKind === "hit_points_modifier")).map((entry) => entry.hitPointsModifier)),
    impactHitModifier: Math.max(0, ...effects.map((entry) => Number(entry.impactHitModifier || 0))),
    precision: Math.max(precision, Number(stand?.value || 0)),
    antiEvade,
    criticalHit: Math.max(0, ...firstWeapon.filter((entry) => (
      entry.keyword === "critical_hit")).map((entry) => Number(entry.value || 0))),
    tough,
    horizontalCoherencyMilliInches: Math.max(3000, ...passives.filter((entry) => (
      entry.effectKind === "coherency_projection"))
      .map((entry) => entry.horizontalCoherencyMilliInches)),
    eligibleEvadeAgainstAllAttacks: passives.some((entry) => (
      entry.effectKind === "evade_eligibility")),
    crossEngagementTargetingAllowed: passives.some((entry) => (
      entry.effectKind === "indomitable")),
    crossEngagementDefenderEvadeEligible: passives.some((entry) => (
      entry.effectKind === "indomitable")),
    cannotGainBurrowed: passives.some((entry) => (
      entry.effectKind === "cannot_gain_burrowed")),
    hiddenSuppressedByDetection: detectionSources.length > 0,
    detectingSourcePieceIds: detectionSources.map((entry) => entry.id).sort(),
    chargeDistanceRoll: charge ? { diceCount: charge.diceCount,
      keepHighest: charge.keepHighest, addTo: "speed" } : null,
    attackPoolModifier: guardianSources.length > 0
      && normalized(context.attackKind) === "ranged" ? -1 : 0,
    guardianShieldSourcePieceIds: guardianSources.map((entry) => entry.id).sort(),
    surgeTypes: targetLocks.length > 0 ? ["light", "armoured"]
      : clone(surgeRoute?.surgeTypes || []),
    surgeDice: targetLocks.length > 0 ? "D3+1" : surgeRoute?.surgeDice || null,
    damageSetTo: titan?.damageSetTo || null,
    longRangeAllowed: optical.length > 0 ? false : null,
    firstWeaponEffectsRequireConsumerCommit: firstWeapon.map((entry) => ({
      effectHash: entry.effectHash, remainingUses: entry.remainingUses,
      weaponScope: clone(entry.weaponScope), keyword: entry.keyword, value: entry.value })),
    modifierStackingPolicy: "same_numeric_keyword_uses_highest_value",
    consumerContract:
      "movement_ranged_melee_armour_visibility_runtimes_query_before_resolution",
    trainingTruth: false,
  };
}
function query(bundle, state, request = {}) {
  const queryKind = String(request.queryKind || request.kind || "");
  if (queryKind === "instantiate_parameterized_action") {
    const domain = enumerate(bundle, state, { sideKey: request.sideKey
      || state.activeSideKey, includeDisabled: true }).parameterDomains.find((entry) => (
      entry.domainId === request.domainId));
    if (!domain) fail("CHARACTERISTIC_STATUS_QUERY_DOMAIN_STALE");
    const result = preview(bundle, state, { domain, parameters: request.parameters || {} });
    return seal({ schema: "starcraft_tmg_official_characteristic_status_query_v1",
      semanticVersion: "1.0.0", queryKind, precision: "exact",
      result: { preview: result, action: result.action },
      source: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
      rulesAuthority: true, mutationAuthority: false,
      sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
  }
  if (queryKind === "definition_routes") {
    return seal({ schema: "starcraft_tmg_official_characteristic_status_query_v1",
      semanticVersion: "1.0.0", queryKind, precision: "exact",
      result: { routes: clone(bundle.routes), routeCount: bundle.routeCount },
      source: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
      rulesAuthority: true, mutationAuthority: false,
      sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
  }
  if (queryKind !== "characteristic_status_projection") {
    fail("CHARACTERISTIC_STATUS_QUERY_KIND_UNSUPPORTED", queryKind);
  }
  return seal({ schema: "starcraft_tmg_official_characteristic_status_query_v1",
    semanticVersion: "1.0.0", queryKind, precision: "exact",
    result: projection(bundle, state, request),
    source: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

function lifecycle(bundle, stateInput, request = {}) {
  const eventKind = String(request.eventKind || "");
  if (!["activation_start", "action_performed", "activation_end", "round_end",
    "cleanup_and_refresh"].includes(eventKind)) return null;
  const state = clone(stateInput);
  const events = [];
  if (eventKind === "activation_start") {
    const piece = state.pieces.find((entry) => entry.id === request.pieceId);
    if (piece && state.phase === "assault" && hasStatus(piece, "burrowed")) {
      const route = bundle.routes.find((entry) => entry.effectKind === "regeneration"
        && entry.recordKey === piece.officialUnitRecordKey && fieldedFeature(piece, entry));
      const key = `${state.round}:${state.phase}:${eventKind}:${piece.id}`;
      const already = (state.characteristicStatusLifecycleHistory || []).some((entry) => (
        entry.lifecycleKey === key));
      if (route && !already) applyHeal(state, route, piece, piece, route.healValue, events);
    }
  }
  const expiringHashes = new Set();
  for (const piece of state.pieces || []) {
    piece.statuses = (piece.statuses || []).filter((entry) => {
      const targetedAction = eventKind === "action_performed"
        && request.pieceId && piece.id !== request.pieceId;
      const remove = entry.sourceAdapterId === OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID
        && entry.expiresAt === eventKind && !targetedAction;
      if (remove && entry.statusEffectHash) expiringHashes.add(entry.statusEffectHash);
      return !remove;
    });
  }
  state.board.effectMarkers = (state.board?.effectMarkers || []).filter((entry) => (
    !expiringHashes.has(entry.statusEffectHash)));
  if (events.length === 0 && expiringHashes.size === 0) return state;
  state.characteristicStatusLifecycleHistory =
    state.characteristicStatusLifecycleHistory || [];
  state.characteristicStatusLifecycleHistory.push({
    lifecycleKey: `${state.round}:${state.phase}:${eventKind}:${request.pieceId || "all"}`,
    round: Number(state.round), phase: state.phase, eventKind,
    pieceId: request.pieceId || null, removedStatusEffectHashes: [...expiringHashes].sort(),
    events: clone(events), trainingTruth: false });
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: { actionType: "characteristic_status_lifecycle",
      eventKind, pieceId: request.pieceId || null }, events: clone(events) });
  return state;
}

export function createOfficialCharacteristicStatusFamilyAdapterV1(bundle) {
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime",
    coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "lifecycle"],
    archetypeCounts: { ...bundle.archetypeCounts },
    sourceBundleHash: bundle.bundleHash,
    activeResourcePaymentExact: true,
    statusLifecycleExact: true,
    geometryRangeUsesCompleteBases: true,
    consumerQuerySeamExplicit: true,
    legalSpacePreviewApplyReplaySequencePreserved: true,
    rulesAuthority: true,
    trainingTruth: false,
  });
  return freezeDeep({
    descriptor,
    legalSpace: (state, options = {}) => enumerate(bundle, state, options),
    preview: (state, request = {}) => preview(bundle, state, request),
    apply: (state, request = {}) => apply(bundle, state, request),
    query: (state, request = {}) => query(bundle, state, request),
    lifecycle: (state, request = {}) => lifecycle(bundle, state, request),
  });
}
