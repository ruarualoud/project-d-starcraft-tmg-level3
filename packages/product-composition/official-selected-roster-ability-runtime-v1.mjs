import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { resolveOfficialAbilityResourcePaymentV1 } from
  "../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs";
import { createOfficialMarineStimpackKernelV1 } from
  "../rule-atoms/official-marine-stimpack-kernel-v1.mjs";
import { getOfficialCardBuildPaymentProfileV1,
  verifyOfficialCardBuildPaymentDataBundleV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../source-data/official-command-center-adapter-v1.mjs";
import { getOfficialModelBaseGeometryProfileV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";

export const OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID =
  "starcraft-tmg-official-selected-roster-ability-runtime-v1";
export const OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION = "1.2.0";
export const OFFICIAL_SELECTED_ROSTER_ABILITY_PARAMETER_KIND =
  "official_selected_roster_active_ability_v1";
export const OFFICIAL_SELECTED_ROSTER_FINISH_ACTIVATION_PARAMETER_KIND =
  "official_selected_roster_finish_activation_v1";

const STIMPACK = createOfficialMarineStimpackKernelV1();
const SIDE_KEYS = new Set(["player1", "player2"]);
const ORIGINAL_RECORD_KEYS = new Set([
  "army_units:marine",
  "army_units:kerrigan",
  "army_units:kerrigan_swarm_raptor__zergling_",
]);
const CARD_RECORD_KEYS = new Set([
  "tactical_cards:terran_armed_forces",
  "tactical_cards:kerrigan_s_swarm",
  "tactical_cards:accelerating_creep",
]);
const OMEGA_WORM_RECORD_KEY = "army_units:omega_worm";
const ACTIVE_SPECS = new Map([
  ["army_units:marine:Stimpack", {
    effectKind: "stimpack", phase: "movement", resourceType: "CP", resourceCost: 1,
    targetKind: "self", expiresAt: "cleanup_and_refresh",
  }],
  ["army_units:marine:Combat Shield", {
    effectKind: "combat_shield", phase: "movement", resourceType: "CP", resourceCost: 1,
    targetKind: "self", expiresAt: "cleanup_and_refresh",
  }],
  ["army_units:kerrigan:Crushing Grip", {
    effectKind: "crushing_grip", phase: "movement", resourceType: "BM", resourceCost: 1,
    targetKind: "enemy_within", rangeInches: 12, expiresAt: "phase_end",
  }],
  ["army_units:kerrigan:Mutating Carapace", {
    effectKind: "mutating_carapace", phase: "movement", resourceType: "BM",
    resourceCost: 1, targetKind: "enemy_within", rangeInches: 18,
    expiresAt: "cleanup_and_refresh",
  }],
  ["army_units:kerrigan:Leaping Strike", {
    effectKind: "leaping_strike", phase: "assault", resourceType: "BM", resourceCost: 1,
    targetKind: "self_place", rangeInches: 6, expiresAt: "immediate",
  }],
  ["army_units:kerrigan_swarm_raptor__zergling_:Leap", {
    effectKind: "leap", phase: "assault", resourceType: "BM", resourceCost: 1,
    targetKind: "self", expiresAt: "activation_end",
  }],
  ["army_units:kerrigan_swarm_raptor__zergling_:Adrenal Overload", {
    effectKind: "adrenal_overload", phase: "assault", resourceType: "BM",
    resourceCost: 1, targetKind: "self", expiresAt: "activation_end",
  }],
  ["tactical_cards:terran_armed_forces:Tactical Retreat", {
    effectKind: "tactical_retreat", phase: "movement", resourceType: null,
    resourceCost: 0, targetKind: "active_friendly", expiresAt: "cleanup_and_refresh",
  }],
  ["tactical_cards:terran_armed_forces:Terran Tenacity", {
    effectKind: "terran_tenacity", phase: "movement", resourceType: null,
    resourceCost: 0, targetKind: "active_friendly", expiresAt: "game_end",
    oncePerGame: true,
  }],
  ["tactical_cards:kerrigan_s_swarm:Omega Network", {
    effectKind: "omega_network", phase: "movement", resourceType: null,
    resourceCost: 0, targetKind: "ground_place", rangeInches: null,
    expiresAt: "immediate",
  }],
  ["tactical_cards:kerrigan_s_swarm:Wild Mutation", {
    effectKind: "wild_mutation", phase: "any", resourceType: null,
    resourceCost: 0, targetKind: "active_friendly_on_creep",
    expiresAt: "cleanup_and_refresh",
  }],
]);
const PASSIVE_SPECS = new Map([
  ["army_units:kerrigan:Commander", "commander"],
  ["army_units:kerrigan:Devastating Charge", "devastating_charge"],
  ["army_units:kerrigan_swarm_raptor__zergling_:Squadron", "squadron"],
  ["army_units:kerrigan_swarm_raptor__zergling_:Raptor Strain", "raptor_strain"],
  ["army_units:kerrigan_swarm_raptor__zergling_:Devastating Charge",
    "devastating_charge"],
  ["tactical_cards:kerrigan_s_swarm:Zerg Creep", "zerg_creep"],
  ["tactical_cards:accelerating_creep:Speed on Creep", "speed_on_creep"],
  ["tactical_cards:accelerating_creep:Living Glob of Tissue",
    "living_glob_of_tissue"],
  ["tactical_cards:accelerating_creep:Creep Removal", "creep_removal"],
]);

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
function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model.isOnField !== false && model.isDestroyed !== true
  ));
}
function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("SELECTED_ABILITY_SIDE_INVALID", sideKey);
}
function modelRadius(model) {
  const width = Number(model?.baseWidthInches);
  const depth = Number(model?.baseDepthInches);
  if (!Number.isFinite(width) || width <= 0 || width !== depth
    || String(model?.baseShape || "").toLowerCase() !== "round") {
    fail("SELECTED_ABILITY_ROUND_BASE_REQUIRED", String(model?.id || ""));
  }
  return width / 2;
}
function gap(left, right) {
  return Math.max(0, Math.hypot(Number(left.xInches) - Number(right.xInches),
    Number(left.yInches) - Number(right.yInches)) - modelRadius(left) - modelRadius(right));
}
function unitGap(left, right) {
  const values = activeModels(left).flatMap((leftModel) => activeModels(right).map(
    (rightModel) => gap(leftModel, rightModel)));
  return values.length > 0 ? Math.min(...values) : Number.POSITIVE_INFINITY;
}
function circleTouchesTerrain(state, xMilliInches, yMilliInches, radiusMilliInches) {
  return (state.board?.terrain || []).filter((entry) => entry.isRemoved !== true)
    .some((entry) => {
      const footprint = entry.footprint || {};
      const minX = Number(footprint.minXMilliInches);
      const maxX = Number(footprint.maxXMilliInches);
      const minY = Number(footprint.minYMilliInches);
      const maxY = Number(footprint.maxYMilliInches);
      if (![minX, maxX, minY, maxY].every(Number.isFinite)) return false;
      const nearestX = Math.max(minX, Math.min(xMilliInches, maxX));
      const nearestY = Math.max(minY, Math.min(yMilliInches, maxY));
      return Math.hypot(xMilliInches - nearestX, yMilliInches - nearestY)
        <= radiusMilliInches + 1;
    });
}
function useKey(state, route, pieceId) {
  return `${state.round}:${route.routeId}:${pieceId}`;
}
function usedThisRound(state, route, pieceId) {
  return (state.activeAbilityUseHistory || []).some((entry) => (
    entry.useKey === useKey(state, route, pieceId)
  ));
}
function usedThisGame(state, route) {
  return (state.activeAbilityUseHistory || []).some((entry) => (
    entry.routeId === route.routeId
  ));
}
function phaseReady(state, sideKey, route, piece) {
  const window = state.selectedRosterActivationWindow;
  if (!SIDE_KEYS.has(sideKey) || state.activeSideKey !== sideKey
    || (route.phase !== "any" && state.phase !== route.phase)
    || state.players?.[sideKey]?.passedPhases?.[state.phase] === true
    || !activePiece(piece) || piece.sideKey !== sideKey
    || (piece.activatedPhases?.[state.phase] === true
      && window?.stage !== "after_action")) {
    fail("SELECTED_ABILITY_TIMING_UNAVAILABLE", route.routeId);
  }
  if (window && (window.sideKey !== sideKey || window.pieceId !== piece.id
    || window.phase !== state.phase)) {
    fail("SELECTED_ABILITY_ACTIVATION_WINDOW_LOCKED", route.routeId);
  }
  if (usedThisRound(state, route, piece.id)) {
    fail("SELECTED_ABILITY_ALREADY_USED_THIS_ROUND", route.routeId);
  }
  if (route.oncePerGame === true && usedThisGame(state, route)) {
    fail("SELECTED_ABILITY_ALREADY_USED_THIS_GAME", route.routeId);
  }
}
function sourceFeature(record, feature, index) {
  return {
    sourceFeatureHash: hashStarcraftTmgContract({ recordKey: record.recordKey,
      sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      index, feature }),
    sourceRecordHash: record.sourceRecordHash,
    payloadHash: record.payloadHash,
    sourceTextHash: hashStarcraftTmgContract(feature),
  };
}
function compileUnitRoutes(dataset, state) {
  const routes = [];
  const passives = [];
  for (const piece of state.pieces.filter((entry) => ORIGINAL_RECORD_KEYS.has(
    entry.officialUnitRecordKey))) {
    const record = getOfficialCurrentProductRecord(dataset, piece.officialUnitRecordKey);
    const fielded = state.officialActionRouteCatalogue.units.find((entry) => (
      entry.pieceId === piece.id));
    for (const [index, feature] of (record.payload.upgrades || []).entries()) {
      const route = fielded?.routes.find((entry) => entry.featureName === feature.name);
      if (!route) continue;
      const key = `${record.recordKey}:${feature.name}`;
      const spec = ACTIVE_SPECS.get(key);
      if (spec && route.activationKind === "active") routes.push({
        routeId: `${piece.id}:ability:${feature.name.toLowerCase().replaceAll(" ", "-")}`,
        sourceKind: "unit_feature", pieceId: piece.id, sideKey: piece.sideKey,
        recordKey: record.recordKey, abilityName: feature.name,
        activationText: feature.activation, sourceDescription: feature.description,
        ...sourceFeature(record, feature, index), ...spec,
        routeStatus: "executable_exact", trainingTruth: false,
      });
      const passive = PASSIVE_SPECS.get(key);
      if (passive && route.activationKind === "passive") passives.push({
        bindingId: `${piece.id}:passive:${passive}`, sourceKind: "unit_feature",
        pieceId: piece.id, sideKey: piece.sideKey, recordKey: record.recordKey,
        abilityName: feature.name, effectKind: passive,
        sourceDescription: feature.description,
        ...sourceFeature(record, feature, index), trainingTruth: false,
      });
    }
  }
  return { routes, passives };
}
function compileCardRoutes(dataset, state) {
  const routes = [];
  const passives = [];
  for (const [sideKey, cards] of Object.entries(state.cardResources || {})) {
    for (const card of cards.filter((entry) => CARD_RECORD_KEYS.has(
      entry.officialCardRecordKey))) {
      const record = getOfficialCurrentProductRecord(dataset, card.officialCardRecordKey);
      for (const [index, feature] of (record.payload.boosts || []).entries()) {
        const key = `${record.recordKey}:${feature.name}`;
        const spec = ACTIVE_SPECS.get(key);
        if (spec) routes.push({
          routeId: `${card.cardInstanceId}:ability:${feature.name.toLowerCase()
            .replaceAll(" ", "-")}`,
          sourceKind: "card_feature", sourceCardInstanceId: card.cardInstanceId,
          sideKey, recordKey: record.recordKey, abilityName: feature.name,
          activationText: feature.description, sourceDescription: feature.description,
          ...sourceFeature(record, feature, index), ...spec,
          routeStatus: "executable_exact", trainingTruth: false,
        });
        const passive = PASSIVE_SPECS.get(key);
        if (passive) passives.push({
          bindingId: `${card.cardInstanceId}:passive:${passive}`,
          sourceKind: "card_feature", sourceCardInstanceId: card.cardInstanceId,
          sideKey, recordKey: record.recordKey, abilityName: feature.name,
          effectKind: passive, sourceDescription: feature.description,
          ...sourceFeature(record, feature, index), trainingTruth: false,
        });
      }
    }
  }
  return { routes, passives };
}
function createOmegaWormTemplate(dataset, state) {
  const record = getOfficialCurrentProductRecord(dataset, OMEGA_WORM_RECORD_KEY);
  const geometry = getOfficialModelBaseGeometryProfileV1(
    state.officialModelBaseGeometryDataBundle, OMEGA_WORM_RECORD_KEY);
  const armour = Number(String(record.payload.stats?.armor || "").match(/\d+/u)?.[0]);
  const hitPoints = Number(record.payload.stats?.hp);
  const sizeCharacteristic = Number(record.payload.stats?.size);
  if (![armour, hitPoints, sizeCharacteristic].every(Number.isSafeInteger)) {
    fail("SELECTED_ABILITY_OMEGA_PROFILE_INVALID");
  }
  return seal({ schema: "starcraft_tmg_official_omega_worm_template_v1",
    recordKey: record.recordKey, sourceRecordHash: record.sourceRecordHash,
    payloadHash: record.payloadHash, unitId: record.payload.id,
    unitName: record.payload.name, baseShape: geometry.baseShape,
    baseWidthInches: geometry.baseWidthMilliInches / 1000,
    baseDepthInches: geometry.baseDepthMilliInches / 1000,
    hitPoints, armourThreshold: armour, evadeThreshold: null, shield: 0,
    combatTags: String(record.payload.tags || "").split(",")
      .map((entry) => entry.trim().toLowerCase()).filter(Boolean).sort(),
    sizeCharacteristic,
    trainingTruth: false }, "templateHash");
}

export function getOfficialSelectedRosterCombatProfileV1(state, recordKey) {
  if (recordKey !== OMEGA_WORM_RECORD_KEY) {
    return getOfficialCombatProfileV1(state.officialCombatProfileBundle, recordKey);
  }
  const template = state.officialSelectedRosterAbilitySourceBundle?.omegaWormTemplate;
  if (!object(template) || template.recordKey !== OMEGA_WORM_RECORD_KEY) {
    fail("SELECTED_ABILITY_OMEGA_TEMPLATE_REQUIRED");
  }
  return freezeDeep({ schema: "starcraft_tmg_official_structure_combat_profile_v1",
    recordKey: template.recordKey, profileHash: template.templateHash,
    hitPoints: template.hitPoints, armourThreshold: template.armourThreshold,
    evadeThreshold: template.evadeThreshold, shield: template.shield,
    sizeCharacteristic: template.sizeCharacteristic,
    combatTags: clone(template.combatTags),
    squadProfile: [{ minimumModels: 1, maximumModels: 1, supply: 0 }],
    structureTargetOnly: true, trainingTruth: false });
}

export function createOfficialSelectedRosterAbilitySourceBundleV1(input = {}) {
  const { dataset, state } = input;
  if (!object(dataset) || !object(state)) fail("SELECTED_ABILITY_SOURCE_INPUT_REQUIRED");
  verifyOfficialCardBuildPaymentDataBundleV1(state.officialCardBuildPaymentDataBundle);
  const units = compileUnitRoutes(dataset, state);
  const cards = compileCardRoutes(dataset, state);
  const routes = [...units.routes, ...cards.routes]
    .sort((left, right) => left.routeId.localeCompare(right.routeId));
  const passiveBindings = [...units.passives, ...cards.passives]
    .sort((left, right) => left.bindingId.localeCompare(right.bindingId));
  const body = {
    schema: "starcraft_tmg_official_selected_roster_ability_source_bundle_v1",
    semanticVersion: "1.0.0", sourceSnapshotHash: dataset.sourceSnapshotHash,
    normalizedDatasetHash: dataset.datasetHash, selectedActiveRouteCount: routes.length,
    selectedPassiveBindingCount: passiveBindings.length,
    unsupportedSelectedAbilityCount: 0, routes, passiveBindings,
    omegaWormTemplate: createOmegaWormTemplate(dataset, state),
    routeDenominatorComplete: true, sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_ability_source_binding",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialSelectedRosterAbilitySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialSelectedRosterAbilitySourceBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== "starcraft_tmg_official_selected_roster_ability_source_bundle_v1"
    || bundle.semanticVersion !== "1.0.0"
    || !Number.isSafeInteger(bundle.selectedActiveRouteCount)
    || bundle.selectedActiveRouteCount < 0
    || !Number.isSafeInteger(bundle.selectedPassiveBindingCount)
    || bundle.selectedPassiveBindingCount < 0
    || bundle.unsupportedSelectedAbilityCount !== 0
    || bundle.routes?.length !== bundle.selectedActiveRouteCount
    || bundle.passiveBindings?.length !== bundle.selectedPassiveBindingCount
    || new Set(bundle.routes.map((entry) => entry.routeId)).size
      !== bundle.selectedActiveRouteCount
    || new Set(bundle.passiveBindings.map((entry) => entry.bindingId)).size
      !== bundle.selectedPassiveBindingCount
    || bundle.routeDenominatorComplete !== true
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("SELECTED_ABILITY_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

function cardById(state, sideKey, id) {
  return (state.cardResources?.[sideKey] || []).find((entry) => (
    entry.cardInstanceId === id));
}
function paymentRef(state, card) {
  const profile = getOfficialCardBuildPaymentProfileV1(
    state.officialCardBuildPaymentDataBundle, card.officialCardRecordKey);
  return { cardInstanceId: card.cardInstanceId, recordKey: card.officialCardRecordKey,
    sourceRecordHash: card.sourceRecordHash, payloadHash: card.officialPayloadHash,
    profileHash: profile.profileHash, isReady: card.readiness === "ready" };
}
function paymentSelections(state, route) {
  if (!route.resourceType || route.resourceCost === 0) return [[]];
  const cards = (state.cardResources?.[route.sideKey] || []).filter((entry) => (
    entry.readiness === "ready"));
  const rows = [];
  for (let mask = 0; mask < (1 << cards.length); mask += 1) {
    const selected = cards.filter((_, index) => (mask & (1 << index)) !== 0);
    try {
      resolveOfficialAbilityResourcePaymentV1({
        cardDataBundle: state.officialCardBuildPaymentDataBundle,
        resourceType: route.resourceType, resourceCost: route.resourceCost,
        selectedCardInstanceSetComplete: true,
        selectedCardInstances: selected.map((card) => paymentRef(state, card)),
      });
      rows.push(selected.map((entry) => entry.cardInstanceId).sort());
    } catch { /* illegal subset is not part of LegalSpace */ }
  }
  return rows.sort((left, right) => left.join("|").localeCompare(right.join("|")));
}
function targetUnitIds(state, route, actor) {
  if (route.targetKind === "enemy_within") return state.pieces.filter((entry) => (
    entry.sideKey === otherSide(route.sideKey) && activePiece(entry)
      && entry.isStructure !== true
      && unitGap(actor, entry) <= route.rangeInches + 0.001
  )).map((entry) => entry.id).sort();
  return [];
}
function activeFriendlyUnits(state, sideKey) {
  return state.pieces.filter((entry) => entry.sideKey === sideKey && activePiece(entry));
}
function actorIds(state, route) {
  if (route.sourceKind === "unit_feature") return [route.pieceId];
  return activeFriendlyUnits(state, route.sideKey).map((entry) => entry.id).sort();
}
function wormForSide(state, sideKey) {
  return state.pieces.find((entry) => entry.isStructure === true
    && entry.officialUnitRecordKey === OMEGA_WORM_RECORD_KEY
    && entry.sideKey === sideKey && entry.isDestroyed !== true);
}
export function isOfficialSelectedRosterUnitOnCreepV1(state, piece) {
  if (!activePiece(piece) || !piece.combatTags?.includes("ground")) return false;
  const worm = wormForSide(state, piece.sideKey);
  return Boolean(worm) && unitGap(piece, worm) <= 6.001;
}
function routeAvailable(state, route, actor) {
  phaseReady(state, route.sideKey, route, actor);
  if (route.sourceKind === "card_feature") {
    const card = cardById(state, route.sideKey, route.sourceCardInstanceId);
    if (!card || card.readiness !== "ready") fail("SELECTED_ABILITY_CARD_NOT_READY");
  }
  if (route.effectKind === "omega_network" && wormForSide(state, route.sideKey)) {
    fail("SELECTED_ABILITY_OMEGA_WORM_ALREADY_PRESENT");
  }
  if (route.effectKind === "wild_mutation"
    && !isOfficialSelectedRosterUnitOnCreepV1(state, actor)) {
    fail("SELECTED_ABILITY_REQUIRES_ON_CREEP", actor.id);
  }
  if (route.effectKind === "leaping_strike" && state.pieces.some((entry) => (
    entry.sideKey !== actor.sideKey && activePiece(entry)
      && unitGap(actor, entry) <= 1.001))) {
    fail("SELECTED_ABILITY_LEAPING_STRIKE_REQUIRES_UNENGAGED", actor.id);
  }
  const targets = targetUnitIds(state, route, actor);
  if (route.targetKind === "enemy_within" && targets.length === 0) {
    fail("SELECTED_ABILITY_NO_TARGET_IN_RANGE", route.routeId);
  }
  return { targets, payments: paymentSelections(state, route) };
}
function domainFor(state, route, actor, available) {
  const required = ["activeUnitId", "paymentCardInstanceIds"];
  if (route.targetKind === "enemy_within") required.push("targetUnitId");
  if (route.targetKind === "self_place") required.push("placements");
  if (route.targetKind === "ground_place") required.push(
    "xMilliInches", "yMilliInches");
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0", parameterKind: OFFICIAL_SELECTED_ROSTER_ABILITY_PARAMETER_KIND,
    executorId: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION,
    actionType: "use_active_ability", sideKey: route.sideKey, phase: state.phase,
    routeId: route.routeId, abilityName: route.abilityName,
    pieceId: actor.id, effectKind: route.effectKind,
    parameterSchema: { type: "object", required,
      activeUnitId: { const: actor.id },
      paymentCardInstanceIds: { enum: clone(available.payments) },
      targetUnitId: route.targetKind === "enemy_within"
        ? { enum: clone(available.targets) } : null,
      placements: route.targetKind === "self_place"
        ? { modelIds: activeModels(actor).map((entry) => entry.id).sort(),
          maxDistanceMilliInches: 6000 } : null,
      groundPoint: route.targetKind === "ground_place"
        ? { unit: "milli-inch",
          baseWidthMilliInches: Math.round(state
            .officialSelectedRosterAbilitySourceBundle.omegaWormTemplate
            .baseWidthInches * 1000),
          baseDepthMilliInches: Math.round(state
            .officialSelectedRosterAbilitySourceBundle.omegaWormTemplate
            .baseDepthInches * 1000),
          minimumEnemyGapMilliInchesExclusive: 10000 } : null,
    },
    constraints: { useTiming: ["before_action", "after_action"],
      oncePerRoundPerUnitAndName: true, oncePerGame: route.oncePerGame === true,
      sourceCardInstanceId: route.sourceCardInstanceId || null,
      resourceType: route.resourceType, resourceCost: route.resourceCost,
      rangeInches: route.rangeInches || null },
    confirmationClass: "rules_owned_direct_action",
    rulesTruth: "official_selected_roster_active_ability_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function finishDomain(state) {
  const window = state.selectedRosterActivationWindow;
  if (!object(window) || window.sideKey !== state.activeSideKey
    || window.phase !== state.phase) return null;
  return seal({ schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_FINISH_ACTIVATION_PARAMETER_KIND,
    executorId: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION,
    actionType: "finish_activation", sideKey: window.sideKey, phase: window.phase,
    pieceId: window.pieceId, parameterSchema: { type: "object", required: [] },
    constraints: { windowStage: window.stage, beforeActionFinishCountsAsHold: true },
    confirmationClass: "rules_owned_direct_action",
    rulesTruth: "official_selected_roster_finish_activation_domain",
    trainingTruth: false }, "domainId");
}

export function enumerateOfficialSelectedRosterAbilityActionsV1(state, options = {}) {
  verifyOfficialSelectedRosterAbilitySourceBundleV1(
    state.officialSelectedRosterAbilitySourceBundle);
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("SELECTED_ABILITY_SIDE_INVALID", sideKey);
  const candidates = [];
  const parameterDomains = [];
  for (const route of state.officialSelectedRosterAbilitySourceBundle.routes.filter(
    (entry) => entry.sideKey === sideKey)) {
    for (const pieceId of actorIds(state, route)) {
      const actor = state.pieces.find((entry) => entry.id === pieceId);
      try {
        const available = routeAvailable(state, route, actor);
        if (available.payments.length === 0) fail("SELECTED_ABILITY_PAYMENT_UNAVAILABLE");
        parameterDomains.push(domainFor(state, route, actor, available));
      } catch (error) {
        if (options.includeDisabled === true) candidates.push({
          actionType: "use_active_ability", sideKey, phase: state.phase,
          pieceId, routeId: route.routeId, abilityName: route.abilityName,
          isEnabled: false,
          disabledReason: String(error?.message || error).split(":")[0],
          executorId: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
          trainingTruth: false,
        });
      }
    }
  }
  const finish = finishDomain(state);
  if (finish) parameterDomains.push(finish);
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_executable_legal_enumeration_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION,
    candidates, parameterDomains: parameterDomains.sort((left, right) => (
      left.domainId.localeCompare(right.domainId))),
    selectedAbilityRouteDenominatorComplete: true,
    legalSpaceIncludesPaymentTimingTargetsAndPlacement: true,
    searchAndStrategyExcludedFromAuthority: true, trainingTruth: false,
  });
}

function canonicalPlacement(state, actor, route, parameters) {
  if (route.targetKind === "ground_place") {
    const x = Number(parameters.placement?.xMilliInches ?? parameters.xMilliInches);
    const y = Number(parameters.placement?.yMilliInches ?? parameters.yMilliInches);
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
      fail("SELECTED_ABILITY_OMEGA_POINT_INVALID");
    }
    const template = state.officialSelectedRosterAbilitySourceBundle.omegaWormTemplate;
    const radius = Math.round(template.baseWidthInches * 500);
    if (x < radius || x > (Number(state.board.widthInches) * 1000) - radius
      || y < radius || y > (Number(state.board.heightInches) * 1000) - radius) {
      fail("SELECTED_ABILITY_OMEGA_BASE_OUTSIDE_BOARD");
    }
    const pointModel = { id: "omega-candidate", xInches: x / 1000, yInches: y / 1000,
      baseShape: template.baseShape, baseWidthInches: template.baseWidthInches,
      baseDepthInches: template.baseDepthInches };
    if (state.pieces.filter((entry) => entry.sideKey !== route.sideKey && activePiece(entry))
      .some((enemy) => activeModels(enemy).some((model) => gap(pointModel, model) <= 10))) {
      fail("SELECTED_ABILITY_OMEGA_ENEMY_DISTANCE_INVALID");
    }
    if (state.pieces.filter((entry) => entry.isOnField === true
      && entry.isDestroyed !== true).some((entry) => activeModels(entry)
      .some((model) => gap(pointModel, model) <= 0.001))) {
      fail("SELECTED_ABILITY_OMEGA_BASE_OVERLAP");
    }
    if (circleTouchesTerrain(state, x, y, radius)) {
      fail("SELECTED_ABILITY_OMEGA_TERRAIN_OVERLAP");
    }
    return { xMilliInches: x, yMilliInches: y };
  }
  if (route.targetKind !== "self_place") return null;
  const requestedPlacements = parameters.placement || parameters.placements;
  if (!Array.isArray(requestedPlacements)
    || requestedPlacements.length !== activeModels(actor).length) {
    fail("SELECTED_ABILITY_PLACE_MODEL_DENOMINATOR_INVALID");
  }
  const starts = new Map(activeModels(actor).map((model) => [model.id, model]));
  const seen = new Set();
  const placements = requestedPlacements.map((entry) => {
    const model = starts.get(String(entry?.modelId || ""));
    const x = Number(entry?.xMilliInches); const y = Number(entry?.yMilliInches);
    if (!model || seen.has(model.id) || !Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
      fail("SELECTED_ABILITY_PLACE_MODEL_INVALID");
    }
    seen.add(model.id);
    const start = { xInches: model.xInches, yInches: model.yInches };
    const distance = Math.hypot((x / 1000) - start.xInches, (y / 1000) - start.yInches);
    const radius = modelRadius(model);
    if (distance > 6.001 || (x / 1000) < radius
      || (x / 1000) > Number(state.board.widthInches) - radius
      || (y / 1000) < radius
      || (y / 1000) > Number(state.board.heightInches) - radius) {
      fail("SELECTED_ABILITY_PLACE_GEOMETRY_INVALID", model.id);
    }
    if (circleTouchesTerrain(state, x, y, Math.round(radius * 1000))) {
      fail("SELECTED_ABILITY_PLACE_TERRAIN_OVERLAP", model.id);
    }
    return { modelId: model.id, xMilliInches: x, yMilliInches: y };
  }).sort((left, right) => left.modelId.localeCompare(right.modelId));
  for (let index = 0; index < placements.length; index += 1) {
    const left = { ...starts.get(placements[index].modelId),
      xInches: placements[index].xMilliInches / 1000,
      yInches: placements[index].yMilliInches / 1000 };
    for (const entry of state.pieces.flatMap((piece) => activeModels(piece))) {
      if (!starts.has(entry.id) && gap(left, entry) <= 0.001) {
        fail("SELECTED_ABILITY_PLACE_BASE_OVERLAP", left.id);
      }
    }
  }
  return placements;
}

export function instantiateOfficialSelectedRosterAbilityActionV1(
  state, domain, parameters = {},
) {
  const current = enumerateOfficialSelectedRosterAbilityActionsV1(state, {
    sideKey: domain?.sideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === domain?.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("SELECTED_ABILITY_PARAMETER_DOMAIN_STALE");
  }
  if (domain.parameterKind === OFFICIAL_SELECTED_ROSTER_FINISH_ACTIVATION_PARAMETER_KIND) {
    if (!object(parameters) || Object.keys(parameters).length !== 0) {
      fail("SELECTED_ABILITY_FINISH_PARAMETERS_INVALID");
    }
    return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
      canonicalParameters: {}, action: { actionType: "finish_activation",
        sideKey: domain.sideKey, phase: domain.phase, pieceId: domain.pieceId,
        domainId: domain.domainId,
        executorId: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
        executorVersion: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION },
      trainingTruth: false });
  }
  const route = state.officialSelectedRosterAbilitySourceBundle.routes.find((entry) => (
    entry.routeId === domain.routeId));
  const actor = state.pieces.find((entry) => entry.id === domain.pieceId);
  const activeUnitId = String(parameters.activeUnitId || "");
  const payments = [...new Set((parameters.paymentCardInstanceIds || []).map(String))].sort();
  if (activeUnitId !== actor.id || !domain.parameterSchema.paymentCardInstanceIds.enum
    .some((entry) => isDeepStrictEqual(entry, payments))) {
    fail("SELECTED_ABILITY_PARAMETERS_INVALID");
  }
  const targetUnitId = route.targetKind === "enemy_within"
    ? String(parameters.targetUnitId || "") : null;
  if (route.targetKind === "enemy_within"
    && !domain.parameterSchema.targetUnitId.enum.includes(targetUnitId)) {
    fail("SELECTED_ABILITY_TARGET_INVALID", targetUnitId);
  }
  const placement = canonicalPlacement(state, actor, route, parameters);
  const canonicalParameters = { activeUnitId, paymentCardInstanceIds: payments,
    targetUnitId, placement };
  const plan = seal({ schema: "starcraft_tmg_official_selected_roster_ability_plan_v1",
    semanticVersion: "1.0.0", sideKey: domain.sideKey, phase: domain.phase,
    pieceId: actor.id, routeId: route.routeId, abilityName: route.abilityName,
    effectKind: route.effectKind, sourceFeatureHash: route.sourceFeatureHash,
    sourceCardInstanceId: route.sourceCardInstanceId || null,
    canonicalParameters, domainId: domain.domainId,
    rulesTruth: "official_selected_roster_active_ability_plan",
    trainingTruth: false }, "planHash");
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action: { actionType: "use_active_ability",
      sideKey: domain.sideKey, phase: domain.phase, pieceId: actor.id,
      abilityName: route.abilityName, abilityPlan: plan,
      executorId: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
      executorVersion: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION },
    trainingTruth: false });
}

export function previewOfficialSelectedRosterAbilityActionV1(state, domain, parameters) {
  const instantiated = instantiateOfficialSelectedRosterAbilityActionV1(
    state, domain, parameters);
  return seal({ schema: "starcraft_tmg_official_selected_roster_ability_preview_v1",
    semanticVersion: "1.0.0", action: instantiated.action,
    actionHash: hashStarcraftTmgContract(instantiated.action), mutationApplied: false,
    rulesAuthority: true, rulesTruth: "official_selected_roster_ability_preview",
    trainingTruth: false }, "previewHash");
}

export function queryOfficialSelectedRosterAbilityV1(input = {}) {
  const { state, request = {} } = input;
  const queryKind = String(request.queryKind || request.kind || "");
  if (queryKind === "ability_modifier_projection" || queryKind === "on_creep_status") {
    const piece = state.pieces.find((entry) => entry.id === request.pieceId);
    if (!piece) fail("SELECTED_ABILITY_QUERY_PIECE_UNKNOWN", String(request.pieceId || ""));
    const result = queryKind === "on_creep_status"
      ? { pieceId: piece.id, onCreep: isOfficialSelectedRosterUnitOnCreepV1(state, piece) }
      : resolveOfficialSelectedRosterAbilityModifiersV1(state, piece,
        request.context || {});
    return seal({ schema: "starcraft_tmg_official_selected_roster_ability_query_v1",
      semanticVersion: "1.0.0", queryKind, precision: "exact", result,
      source: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
      rulesAuthority: true, mutationAuthority: false,
      sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
  }
  if (queryKind !== "instantiate_parameterized_action") {
    fail("SELECTED_ABILITY_QUERY_KIND_UNSUPPORTED", queryKind);
  }
  const domain = enumerateOfficialSelectedRosterAbilityActionsV1(state, {
    sideKey: request.sideKey || state.activeSideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === request.domainId);
  if (!domain) fail("SELECTED_ABILITY_QUERY_DOMAIN_STALE");
  const preview = previewOfficialSelectedRosterAbilityActionV1(
    state, domain, request.parameters || {});
  return seal({ schema: "starcraft_tmg_official_selected_roster_ability_query_v1",
    semanticVersion: "1.0.0", queryKind, precision: "exact",
    result: { preview, action: preview.action },
    source: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

function effect(route, action, extra = {}) {
  const body = { schema: "starcraft_tmg_official_selected_ability_effect_v1",
    effectId: hashStarcraftTmgContract({ planHash: action.abilityPlan.planHash,
      effectKind: route.effectKind }).slice(0, 24),
    effectKind: route.effectKind, abilityName: route.abilityName,
    sourceSideKey: route.sideKey, sourcePieceId: action.pieceId,
    sourceFeatureHash: route.sourceFeatureHash, roundApplied: null,
    phaseApplied: action.phase, expiresAt: route.expiresAt, ...extra,
    trainingTruth: false };
  return seal(body, "effectHash");
}
function appendPieceEffect(piece, value) {
  piece.officialAbilityEffects = Array.isArray(piece.officialAbilityEffects)
    ? piece.officialAbilityEffects : [];
  piece.officialAbilityEffects.push(value);
}
function applyStimpack(state, route, action, events) {
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  const abilityResolutionHash = hashStarcraftTmgContract({
    planHash: action.abilityPlan.planHash, revision: state.log?.length || 0 });
  const status = STIMPACK.createStatus({ round: Number(state.round),
    sourceSideKey: route.sideKey, sourcePieceId: piece.id, abilityResolutionHash });
  const combat = getOfficialCombatProfileV1(
    state.officialCombatProfileBundle, piece.officialUnitRecordKey);
  const targetModel = activeModels(piece)[0];
  const damage = STIMPACK.resolveNonLethalDamage({ targetPieceId: piece.id,
    targetModelId: targetModel.id, abilityResolutionHash,
    priorDamageMarker: Number(piece.damageMarker || 0), amount: 2,
    targetHitPoints: combat.hitPoints });
  piece.damageMarker = damage.postDamageMarker;
  const value = effect(route, action, { roundApplied: Number(state.round),
    targetPieceId: piece.id, speedBuff: 3, precision: 3,
    rangedWeaponNames: ["C-14 rifle"], closeCombatWeaponScope: "all",
    statusEffectHash: status.status.statusEffectHash });
  appendPieceEffect(piece, value);
  piece.statuses = [...(piece.statuses || []), clone(status.status)];
  state.board.effectMarkers.push(clone(status.marker));
  events.push({ type: "active_ability_effect_applied", abilityName: route.abilityName,
    pieceId: piece.id, effectHash: value.effectHash,
    nonLethalResolutionHash: damage.nonLethalResolutionHash, trainingTruth: false });
}
function createOmegaWorm(state, route, action, events) {
  const template = state.officialSelectedRosterAbilitySourceBundle.omegaWormTemplate;
  const point = action.abilityPlan.canonicalParameters.placement;
  const pieceId = `${route.sideKey}-omega-worm`;
  const piece = {
    id: pieceId, unitInstanceId: pieceId, name: template.unitName,
    unitName: template.unitName, unitId: template.unitId, sideKey: route.sideKey,
    officialUnitRecordKey: template.recordKey,
    sourceRecordHash: template.sourceRecordHash,
    officialPayloadHash: template.payloadHash,
    formationSize: "small", compositionKind: "small", armySlotType: "Structure",
    currentModels: 1, maxModels: 1, currentSupply: 0,
    destroyedModelIds: [], isOnField: true, isInReserves: false,
    isDestroyed: false, isStructure: true, combatTag: "ground",
    combatTags: clone(template.combatTags), statuses: [], selectedUpgradeNames: [],
    selectedUpgrades: [], equipment: [], weaponChoices: [], assignedUpgradeByModelId: {},
    combatEffects: [], assaultEffects: [], officialAbilityEffects: [], damageMarker: 0,
    activatedPhases: { movement: true, assault: true, combat: true },
    deploymentStatus: "summoned_on_battlefield", xInches: point.xMilliInches / 1000,
    yInches: point.yMilliInches / 1000,
    models: [{ id: `${pieceId}-model-1`, baseShape: template.baseShape,
      baseWidthInches: template.baseWidthInches,
      baseDepthInches: template.baseDepthInches, baseRotationDegrees: 0,
      elevation: "ground", supportTerrainIds: [], adjacentAccessPointIds: [],
      xInches: point.xMilliInches / 1000, yInches: point.yMilliInches / 1000,
      damage: 0, remainingWounds: template.hitPoints,
      isOnField: true, isDestroyed: false }],
    structureRules: { cannotActivateOrPerformActions: true,
      cannotControlOrContest: true, sourceOfCreepRangeInches: 6,
      specialAbilitiesDisabledThroughRound: Number(state.round) },
    trainingTruth: false,
  };
  state.pieces.push(piece);
  events.push({ type: "omega_worm_set_on_battlefield", sideKey: route.sideKey,
    pieceId, xMilliInches: point.xMilliInches, yMilliInches: point.yMilliInches,
    sourceFeatureHash: route.sourceFeatureHash, trainingTruth: false });
}
function applyEffect(state, route, action, events) {
  const actor = state.pieces.find((entry) => entry.id === action.pieceId);
  const targetId = action.abilityPlan.canonicalParameters.targetUnitId;
  const target = targetId ? state.pieces.find((entry) => entry.id === targetId) : actor;
  if (route.effectKind === "stimpack") return applyStimpack(state, route, action, events);
  if (route.effectKind === "omega_network") {
    return createOmegaWorm(state, route, action, events);
  }
  if (route.effectKind === "crushing_grip") {
    target.activatedPhases = { movement: false, assault: false, combat: false,
      ...(target.activatedPhases || {}), [state.phase]: true };
    state.board.effectMarkers.push({ id: `activation-${target.id}-${state.round}-${state.phase}`,
      markerType: "activation", targetPieceId: target.id,
      expiresAt: "phase_end", trainingTruth: false });
  } else if (route.effectKind === "leaping_strike") {
    const byId = new Map(action.abilityPlan.canonicalParameters.placement.map((entry) => (
      [entry.modelId, entry])));
    for (const model of activeModels(actor)) {
      const point = byId.get(model.id);
      model.xInches = point.xMilliInches / 1000;
      model.yInches = point.yMilliInches / 1000;
    }
    actor.xInches = activeModels(actor)[0].xInches;
    actor.yInches = activeModels(actor)[0].yInches;
  } else if (route.effectKind === "terran_tenacity") {
    state.firstPlayerSideKey = route.sideKey;
    state.firstPlayerClaimLock = { round: Number(state.round), phase: state.phase,
      sideKey: route.sideKey, sourceFeatureHash: route.sourceFeatureHash };
  } else {
    const details = route.effectKind === "combat_shield"
      ? { evadeAgainstCloseCombatAndEnemySpecialAbility: true }
      : route.effectKind === "mutating_carapace"
        ? { selectedEnemyPieceId: target.id, evadeEligible: true, evadeModifier: 2 }
        : route.effectKind === "leap" ? { chargeDistanceModifier: 2 }
          : route.effectKind === "adrenal_overload" ? { impactHitModifier: 1 }
            : route.effectKind === "tactical_retreat"
              ? { ignoreDisengagePenalty: true }
              : route.effectKind === "wild_mutation"
                ? { speedBuff: 1, precision: 1, firstWeaponOnly: true,
                  firstWeaponConsumed: false, onCreepAtUse: true }
                : {};
    appendPieceEffect(actor, effect(route, action, { roundApplied: Number(state.round),
      targetPieceId: actor.id, ...details }));
  }
  events.push({ type: "active_ability_effect_applied", abilityName: route.abilityName,
    pieceId: actor.id, targetPieceId: target.id,
    effectKind: route.effectKind, trainingTruth: false });
}
function alternate(state, sideKey, phase) {
  const available = (candidateSide) => state.players?.[candidateSide]
    ?.passedPhases?.[phase] !== true && state.pieces.some((piece) => (
      piece.sideKey === candidateSide && activePiece(piece)
        && piece.activatedPhases?.[phase] !== true));
  const opponent = otherSide(sideKey);
  if (available(opponent)) state.activeSideKey = opponent;
  else if (available(sideKey)) state.activeSideKey = sideKey;
}

export function applyOfficialSelectedRosterAbilityActionV1(
  stateInput, actionInput, options = {},
) {
  const domainId = actionInput?.domainId || actionInput?.abilityPlan?.domainId;
  const domain = enumerateOfficialSelectedRosterAbilityActionsV1(stateInput, {
    sideKey: actionInput?.sideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === domainId);
  if (!domain) fail("SELECTED_ABILITY_PARAMETER_DOMAIN_STALE");
  const parameters = actionInput.actionType === "finish_activation" ? {}
    : actionInput.abilityPlan.canonicalParameters;
  const expected = instantiateOfficialSelectedRosterAbilityActionV1(
    stateInput, domain, parameters);
  if (!isDeepStrictEqual(expected.action, actionInput)) {
    fail("SELECTED_ABILITY_ACTION_STALE");
  }
  const state = clone(stateInput);
  const events = [];
  if (actionInput.actionType === "finish_activation") {
    const window = state.selectedRosterActivationWindow;
    const piece = state.pieces.find((entry) => entry.id === window.pieceId);
    if (window.stage === "before_action") {
      piece.activatedPhases = { movement: false, assault: false, combat: false,
        ...(piece.activatedPhases || {}), [window.phase]: true };
    }
    delete state.selectedRosterActivationWindow;
    piece.officialAbilityEffects = (piece.officialAbilityEffects || []).filter((entry) => (
      entry.expiresAt !== "activation_end"));
    alternate(state, actionInput.sideKey, actionInput.phase);
    events.push({ type: "unit_activation_finished", sideKey: actionInput.sideKey,
      pieceId: actionInput.pieceId, phase: actionInput.phase,
      beforeActionFinishCountedAsHold: window.stage === "before_action",
      trainingTruth: false });
  } else {
    const route = state.officialSelectedRosterAbilitySourceBundle.routes.find((entry) => (
      entry.routeId === actionInput.abilityPlan.routeId));
    if (route.resourceType) {
      const cards = actionInput.abilityPlan.canonicalParameters.paymentCardInstanceIds
        .map((id) => cardById(state, route.sideKey, id));
      const payment = resolveOfficialAbilityResourcePaymentV1({
        cardDataBundle: state.officialCardBuildPaymentDataBundle,
        resourceType: route.resourceType, resourceCost: route.resourceCost,
        selectedCardInstanceSetComplete: true,
        selectedCardInstances: cards.map((card) => paymentRef(state, card)),
      });
      for (const id of payment.selectedCardsExhaustOnCommit) {
        const card = cardById(state, route.sideKey, id);
        card.readiness = "exhausted";
      }
      events.push({ type: "ability_resource_paid", resourceType: route.resourceType,
        resourceCost: route.resourceCost, paymentResultHash: payment.resultHash,
        exhaustedCardInstanceIds: payment.selectedCardsExhaustOnCommit,
        trainingTruth: false });
    } else if (route.sourceKind === "card_feature") {
      cardById(state, route.sideKey, route.sourceCardInstanceId).readiness = "exhausted";
    }
    applyEffect(state, route, actionInput, events);
    state.activeAbilityUseHistory.push({ useKey: useKey(state, route, actionInput.pieceId),
      round: Number(state.round), phase: state.phase, sideKey: route.sideKey,
      pieceId: actionInput.pieceId, routeId: route.routeId,
      abilityName: route.abilityName, planHash: actionInput.abilityPlan.planHash,
      trainingTruth: false });
    const old = state.selectedRosterActivationWindow;
    state.selectedRosterActivationWindow = {
      schema: "starcraft_tmg_selected_roster_activation_window_v1",
      round: Number(state.round), phase: state.phase, sideKey: route.sideKey,
      pieceId: actionInput.pieceId, stage: old?.stage || "before_action",
      trainingTruth: false,
    };
  }
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(actionInput), events: clone(events) });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_selected_roster_ability_transition_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION,
    postRevision: Number(options.postRevision || 0), state,
    action: clone(actionInput), events,
    rulesTruth: "official_selected_roster_ability_transition",
    trainingTruth: false });
}

export function resolveOfficialSelectedRosterAbilityModifiersV1(
  state, piece, context = {},
) {
  const active = (piece?.officialAbilityEffects || []).filter((entry) => (
    entry.roundApplied === Number(state.round)));
  const speedBuff = Math.max(0, ...active.map((entry) => Number(entry.speedBuff || 0)));
  const onCreepSpeed = isOfficialSelectedRosterUnitOnCreepV1(state, piece)
    && state.officialSelectedRosterAbilitySourceBundle?.passiveBindings.some((entry) => (
      entry.sideKey === piece.sideKey && entry.effectKind === "speed_on_creep")) ? 1 : 0;
  const mutation = active.find((entry) => entry.effectKind === "mutating_carapace"
    && entry.selectedEnemyPieceId === context.attackerPieceId);
  const shield = active.some((entry) => entry.effectKind === "combat_shield")
    && ["close_combat", "enemy_special_ability"].includes(context.damageKind);
  const precision = Math.max(0, ...active.filter((entry) => (
    Number(entry.precision || 0) > 0
      && (!entry.firstWeaponOnly || entry.firstWeaponConsumed !== true)
      && (!entry.rangedWeaponNames
        || entry.rangedWeaponNames.map((name) => name.toLowerCase())
          .includes(String(context.weaponName || "").toLowerCase()))
  )).map((entry) => Number(entry.precision)));
  return freezeDeep({
    speedModifier: speedBuff + onCreepSpeed,
    speedBuff, onCreepSpeed,
    chargeDistanceModifier: active.reduce((sum, entry) => (
      sum + Number(entry.chargeDistanceModifier || 0)), 0),
    impactHitModifier: active.reduce((sum, entry) => (
      sum + Number(entry.impactHitModifier || 0)), 0),
    ignoreDisengagePenalty: active.some((entry) => entry.ignoreDisengagePenalty === true),
    evadeEligible: Boolean(mutation) || shield,
    evadeModifier: mutation ? Number(mutation.evadeModifier || 0) : 0,
    precision, onCreep: isOfficialSelectedRosterUnitOnCreepV1(state, piece),
    sourceEffectHashes: active.map((entry) => entry.effectHash).sort(),
    trainingTruth: false,
  });
}

export function assertOfficialSelectedRosterCoreActionWindowV1(
  state, sideKey, pieceId, phase,
) {
  const window = state.selectedRosterActivationWindow;
  if (!window) return true;
  if (window.stage !== "before_action" || window.sideKey !== sideKey
    || window.pieceId !== pieceId || window.phase !== phase) {
    fail("SELECTED_ABILITY_CORE_ACTION_WINDOW_INVALID", pieceId);
  }
  return true;
}

export function openOfficialSelectedRosterAfterActionWindowV1(
  state, sideKey, pieceId, phase,
) {
  if (!state.officialSelectedRosterAbilityRuntimeDescriptor) return false;
  state.selectedRosterActivationWindow = {
    schema: "starcraft_tmg_selected_roster_activation_window_v1",
    round: Number(state.round), phase, sideKey, pieceId,
    stage: "after_action", trainingTruth: false,
  };
  return true;
}

export function consumeOfficialSelectedRosterFirstWeaponModifierV1(state, pieceId) {
  const piece = state.pieces.find((entry) => entry.id === pieceId);
  if (!piece) return;
  piece.officialAbilityEffects = (piece.officialAbilityEffects || []).map((entry) => {
    if (entry.firstWeaponOnly !== true || entry.firstWeaponConsumed === true) return entry;
    return seal({ ...without(entry, ["effectHash"]), firstWeaponConsumed: true },
      "effectHash");
  });
}

export function cleanupOfficialSelectedRosterAbilityEffectsV1(stateInput) {
  const state = clone(stateInput);
  for (const piece of state.pieces) {
    piece.officialAbilityEffects = (piece.officialAbilityEffects || []).filter((entry) => (
      !["cleanup_and_refresh", "activation_end", "phase_end"].includes(entry.expiresAt)));
    piece.statuses = (piece.statuses || []).filter((entry) => (
      typeof entry === "string" || entry.removalStep !== "cleanup_and_refresh"));
  }
  state.board.effectMarkers = (state.board.effectMarkers || []).filter((entry) => (
    entry.expiresAt !== "cleanup_and_refresh" && entry.expiresAt !== "phase_end"));
  for (const cards of Object.values(state.cardResources || {})) {
    for (const card of cards) card.readiness = "ready";
  }
  delete state.selectedRosterActivationWindow;
  delete state.firstPlayerClaimLock;
  return freezeDeep(state);
}

export function createOfficialSelectedRosterAbilityRuntimeV1(state) {
  verifyOfficialSelectedRosterAbilitySourceBundleV1(
    state.officialSelectedRosterAbilitySourceBundle);
  const source = state.officialSelectedRosterAbilitySourceBundle;
  const descriptor = seal({
    schema: "starcraft_tmg_official_selected_roster_ability_runtime_descriptor_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION,
    selectedActiveRouteCount: source.selectedActiveRouteCount,
    selectedPassiveBindingCount: source.selectedPassiveBindingCount,
    unsupportedSelectedAbilityCount: 0,
    effectKinds: [...new Set(source.routes.map((entry) => entry.effectKind))].sort(),
    sourceBundleHash: source.bundleHash,
    legalSpacePreviewApplyShareInstantiation: true,
    activationWindowLifecycleExact: true, cardPaymentAndExhaustionExact: true,
    cleanupRefreshEntryPointExposed: true,
    arbitraryRosterClosureClaimed: false, productionRoomEligible: false,
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_ability_runtime",
    trainingTruth: false,
  }, "runtimeHash");
  return freezeDeep({ descriptor,
    enumerate: enumerateOfficialSelectedRosterAbilityActionsV1,
    instantiate: instantiateOfficialSelectedRosterAbilityActionV1,
    preview: previewOfficialSelectedRosterAbilityActionV1,
    apply: applyOfficialSelectedRosterAbilityActionV1,
    query: queryOfficialSelectedRosterAbilityV1,
    modifiers: resolveOfficialSelectedRosterAbilityModifiersV1,
    cleanup: cleanupOfficialSelectedRosterAbilityEffectsV1 });
}

export function verifyOfficialSelectedRosterAbilityRuntimeDescriptorV1(descriptor) {
  if (!object(descriptor)
    || descriptor.runtimeId !== OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_ID
    || descriptor.runtimeVersion !== OFFICIAL_SELECTED_ROSTER_ABILITY_RUNTIME_VERSION
    || !Number.isSafeInteger(descriptor.selectedActiveRouteCount)
    || descriptor.selectedActiveRouteCount < 0
    || !Number.isSafeInteger(descriptor.selectedPassiveBindingCount)
    || descriptor.selectedPassiveBindingCount < 0
    || descriptor.unsupportedSelectedAbilityCount !== 0
    || descriptor.legalSpacePreviewApplyShareInstantiation !== true
    || descriptor.activationWindowLifecycleExact !== true
    || descriptor.cardPaymentAndExhaustionExact !== true
    || descriptor.sourceRefreshPerformed !== false
    || descriptor.trainingTruth !== false
    || descriptor.runtimeHash !== hashStarcraftTmgContract(without(descriptor,
      ["runtimeHash"]))) {
    fail("SELECTED_ABILITY_RUNTIME_DESCRIPTOR_INVALID");
  }
  return true;
}
