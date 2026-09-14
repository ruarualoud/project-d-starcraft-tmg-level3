import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialModelBaseFootprintV1,
  evaluateOfficialBaseMeasurementV1,
  evaluateOfficialCoherencyPlacementV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { projectOfficialContextualSupplyValueV1 } from
  "../rule-atoms/official-contextual-supply-projection-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { verifyOfficialModelBaseGeometryDataBundleV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";

export const OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID =
  "official-relocation-family-adapter-v1";
export const OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION = "1.1.0";
export const OFFICIAL_RELOCATION_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_relocation_family_source_bundle_v1";
export const OFFICIAL_RELOCATION_FAMILY_PARAMETER_KIND =
  "official_relocation_family_plan_v1";

const SIDE_KEYS = new Set(["player1", "player2"]);
const EDGE_SIDES = new Set(["top", "bottom", "left", "right"]);
const QUERY_EFFECTS = new Set([
  "burrow_movement_permission",
  "deployment_stimpack_discount",
  "displacement_permission",
  "raptor_terrain_permission",
]);
const PLACEMENT_EFFECTS = new Set([
  "direct_place",
  "entry_edge_place",
  "friendly_anchor_place",
  "non_entry_edge_deploy",
]);
const TOLERANCE = 1;
const MAX_PATH_POINTS = 64;
const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  burrow_movement_permission: 3,
  deployment_edge_lock: 1,
  deployment_stimpack_discount: 1,
  direct_place: 3,
  displacement_permission: 1,
  entry_edge_place: 7,
  extra_move: 5,
  friendly_anchor_place: 1,
  non_entry_edge_deploy: 2,
  raptor_terrain_permission: 1,
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
function milli(value, code = "RELOCATION_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}
function inches(value) { return Number((Number(value) / 1000).toFixed(3)); }
function point(value, code = "RELOCATION_POINT_INVALID", detail = "") {
  const xMilliInches = Number(value?.xMilliInches);
  const yMilliInches = Number(value?.yMilliInches);
  if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches)) {
    fail(code, detail);
  }
  return { xMilliInches, yMilliInches };
}
function distance(left, right) {
  return Math.hypot(right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches);
}
function normalized(value) { return String(value || "").trim().toLowerCase(); }
function statusName(value) {
  return normalized(typeof value === "string" ? value
    : value?.statusName || value?.name || value?.statusKind);
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && piece?.isStructure !== true && Number(piece?.currentModels || 0) > 0;
}
function livePiece(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}
function liveModels(piece) {
  return (piece?.models || []).filter((model) => model?.isDestroyed !== true
    && (piece.isOnField !== true || model?.isOnField !== false));
}
function modelPoint(model) {
  return { xMilliInches: milli(model?.xInches,
    "RELOCATION_MODEL_POSITION_INVALID", String(model?.id || "")),
  yMilliInches: milli(model?.yInches,
    "RELOCATION_MODEL_POSITION_INVALID", String(model?.id || "")) };
}
function canonicalRotation(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) fail("RELOCATION_ROTATION_INVALID");
  return Number((((parsed % 360) + 360) % 360).toFixed(6));
}
function elevation(value) {
  const result = normalized(value || "ground").replace("ground_level", "ground");
  if (!new Set(["ground", "mid", "high"]).has(result)) {
    fail("RELOCATION_ELEVATION_INVALID", result);
  }
  return result;
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

function compileRoute(definition) {
  const name = definition.definitionName;
  const text = definition.sourceText;
  let spec = null;
  if (name === "Burrow Ambush"
    && /PLACE \(18\).+Entry Edge.+Within 10/iu.test(text)) {
    spec = { effectKind: "entry_edge_place", actionKind: "deploy_from_reserves",
      maxDistanceMilliInches: 18000, minimumEnemyGapMilliInchesExclusive: 10000,
      activationEnds: true, reserveExplicit: true };
  } else if (name === "Tunneling Claws"
    && /Burrowed Status.+Move and Run.+without losing.+move through other Units/iu.test(text)) {
    spec = { effectKind: "burrow_movement_permission", actionKind: "query_modifier",
      reserveExplicit: false };
  } else if (name === "Raptor Strain"
    && /IMPASSABLE TERRAIN of Size 4 or less.+without using ACCESS POINTS/iu.test(text)) {
    spec = { effectKind: "raptor_terrain_permission", actionKind: "query_modifier",
      maximumImpassableTerrainSize: 4, reserveExplicit: false };
  } else if (name === "Gliding" && /has DISPLACEMENT/iu.test(text)) {
    spec = { effectKind: "displacement_permission", actionKind: "query_modifier",
      reserveExplicit: false };
  } else if (name === "Raiders Roll!" && /nominated to deploy.+Stimpack.+reduced by 1/iu.test(text)) {
    spec = { effectKind: "deployment_stimpack_discount", actionKind: "query_modifier",
      resourceCostReduction: 1, minimumResourceCost: 0, reserveExplicit: true };
  } else if (name === "Rapid Reinforcements"
    && /PLACE \(10\).+another Friendly Unit.+Within 8/iu.test(text)) {
    spec = { effectKind: "friendly_anchor_place", actionKind: "deploy_from_reserves",
      maxDistanceMilliInches: 10000, minimumEnemyGapMilliInchesExclusive: 8000,
      activationEnds: true, reserveExplicit: true };
  } else if (name === "Leg Enhancements"
    && /performs a 2.+Move action.+does not count towards its action limit/iu.test(text)) {
    spec = { effectKind: "extra_move", actionKind: "active_ability",
      maxDistanceMilliInches: 2000, actionLimitConsumed: false,
      opensAfterActionWindow: true, reserveExplicit: false };
  } else if (name === "Go! Go! Go!"
    && /active Biological Unit performs a 2.+Move action.+does not count/iu.test(text)) {
    spec = { effectKind: "extra_move", actionKind: "active_ability",
      maxDistanceMilliInches: 2000, actionLimitConsumed: false,
      requiredActorTag: "biological", opensAfterActionWindow: true,
      reserveExplicit: false };
  } else if (name === "Blink" && /PLACE \(6\)/iu.test(text)) {
    spec = { effectKind: "direct_place", actionKind: "active_ability",
      maxDistanceMilliInches: 6000, minimumEnemyGapMilliInchesExclusive: 1000,
      reserveExplicit: false };
  } else if (name === "Phase" && /PLACE \(3\)/iu.test(text)) {
    spec = { effectKind: "direct_place", actionKind: "active_ability",
      maxDistanceMilliInches: 3000, minimumEnemyGapMilliInchesExclusive: 1000,
      reserveExplicit: false };
  } else if (name === "Ready for Pickup?" && /Once per Game.+PLACE \(12\)/iu.test(text)) {
    spec = { effectKind: "direct_place", actionKind: "active_ability",
      maxDistanceMilliInches: 12000, minimumEnemyGapMilliInchesExclusive: 1000,
      oncePerGame: true, replacesStandardAction: true,
      opensAfterActionWindow: true, reserveExplicit: false };
  } else if (name === "Armed and Ready"
    && /active Biological Unit Deploys from any table edge.+not a player.s Entry Edge/iu.test(text)) {
    spec = { effectKind: "non_entry_edge_deploy", actionKind: "special_deploy",
      minimumEnemyGapMilliInchesExclusive: 10000, requiredActorTag: "biological",
      oneFriendlyBiologicalDeployPerRound: true, opensAfterActionWindow: true,
      reserveExplicit: true };
  } else if (name === "Timing Push"
    && /active Zergling Unit Deploys from any table edge.+not a Player.s Entry Edge/iu.test(text)) {
    spec = { effectKind: "non_entry_edge_deploy", actionKind: "special_deploy",
      minimumEnemyGapMilliInchesExclusive: 10000, requiredActorRecordKey: "army_units:zergling",
      opensAfterActionWindow: true, reserveExplicit: true };
  } else if (name === "ComSat Station"
    && /Select one table edge.+not a player.s Entry Edge.+cannot Deploy/iu.test(text)) {
    spec = { effectKind: "deployment_edge_lock", actionKind: "active_ability",
      expiresAt: "round_end", reserveExplicit: false };
  }
  if (!spec) fail("RELOCATION_DEFINITION_COMPILER_UNRECOGNIZED",
    `${definition.recordKey}:${name}`);
  const body = {
    schema: "starcraft_tmg_official_relocation_definition_route_v1",
    semanticVersion: OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION,
    definitionId: definition.definitionId,
    sourceFeatureHash: definition.sourceFeatureHash,
    recordKey: definition.recordKey,
    sourceKind: definition.sourceKind,
    sourceProductKind: definition.sourceProductKind,
    sourceName: definition.sourceName,
    abilityName: name,
    activationKind: definition.activationKind,
    runtimeRole: definition.runtimeRole,
    phase: definition.phase,
    timingHooks: [...definition.timingHooks],
    costByComposition: definition.costByComposition
      ? { ...definition.costByComposition } : null,
    sourceText: text,
    ...spec,
    exactSourcePatternCompiled: true,
    arbitraryProseExecutionClaimed: false,
    trainingTruth: false,
  };
  return seal(body, "routeHash");
}

export function createOfficialRelocationFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("RELOCATION_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pendingIds = new Set(denominator.gapDefinitionIds);
  const owned = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 232 && pendingIds.has(entry.definitionId)));
  const definitions = owned.map((entry) => catalogue.definitions.find((candidate) => (
    candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 25 || definitions.some((entry) => !entry)) {
    fail("RELOCATION_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(compileRoute).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_RELOCATION_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION,
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
    rulesTruth: "official_current_product_relocation_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialRelocationFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialRelocationFamilySourceBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_RELOCATION_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 25 || bundle.routes?.length !== 25
    || new Set(bundle.definitionIds || []).size !== 25
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 25
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 25
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || bundle.compilerDenominatorComplete !== true
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.exactSourcePatternsRequired !== true
    || bundle.arbitraryProseExecutionClaimed !== false
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("RELOCATION_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialRelocationFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialRelocationFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION,
    capability: QUERY_EFFECTS.has(route.effectKind)
      ? "automatic_consumer" : "authoritative_action",
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function routeInstances(state, route) {
  if (route.sourceKind === "unit_feature") {
    return (state.pieces || []).filter((piece) => piece.officialUnitRecordKey === route.recordKey
      && livePiece(piece) && fieldedFeature(piece, route)).map((piece) => ({
      sourceInstanceId: piece.id, sideKey: piece.sideKey, actor: piece,
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
function usedThisGame(state, route, pieceId) {
  return (state.activeAbilityUseHistory || []).some((entry) => (
    entry.pieceId === pieceId && entry.abilityName === route.abilityName));
}
function cardReady(instance) {
  if (instance.card && instance.card.readiness !== "ready") {
    fail("RELOCATION_SOURCE_CARD_NOT_READY", instance.card.cardInstanceId);
  }
}
function actorMatches(route, piece) {
  if (!livePiece(piece)) return false;
  if (route.requiredActorTag && !(piece.combatTags || []).map(normalized)
    .includes(route.requiredActorTag)) return false;
  if (route.requiredActorRecordKey
    && piece.officialUnitRecordKey !== route.requiredActorRecordKey) return false;
  return true;
}
function activeTimingAvailable(state, route, sideKey, actor) {
  if (!SIDE_KEYS.has(sideKey) || state.activeSideKey !== sideKey
    || (route.phase !== "any" && state.phase !== route.phase)
    || state.players?.[sideKey]?.passedPhases?.[state.phase] === true
    || !activePiece(actor) || actor.sideKey !== sideKey
    || (actor.activatedPhases?.[state.phase] === true
      && state.selectedRosterActivationWindow?.stage !== "after_action")) return false;
  const window = state.selectedRosterActivationWindow;
  if (window && (window.sideKey !== sideKey || window.pieceId !== actor.id
    || window.phase !== state.phase)) return false;
  if (usedThisRound(state, route, actor.id)) return false;
  if (route.oncePerGame === true && usedThisGame(state, route, actor.id)) return false;
  return true;
}
function deployTimingAvailable(state, route, sideKey, actor) {
  return SIDE_KEYS.has(sideKey) && state.activeSideKey === sideKey
    && state.phase === "movement"
    && state.players?.[sideKey]?.passedPhases?.movement !== true
    && livePiece(actor) && actor.sideKey === sideKey && actor.isInReserves === true
    && actor.isOnField !== true && actor.activatedPhases?.movement !== true
    && actorMatches(route, actor);
}
function supplyAvailable(state, sideKey) {
  const capacity = Number(state.players?.[sideKey]?.supply || 0);
  const committed = (state.pieces || []).filter((piece) => (
    piece.sideKey === sideKey && activePiece(piece))).reduce((sum, piece) => (
    sum + projectOfficialContextualSupplyValueV1({ state, pieceId: piece.id,
      context: "supply_pool_calculation" }).effectiveSupply), 0);
  return Math.max(0, capacity - committed);
}
function priorBiologicalDeploy(state, sideKey, actorId) {
  const standard = (state.spatialActionHistory || []).some((entry) => {
    if (Number(entry.round) !== Number(state.round) || entry.actionType !== "deploy") return false;
    const piece = state.pieces.find((candidate) => candidate.id === entry.pieceId);
    return piece?.sideKey === sideKey && piece.id !== actorId
      && (piece.combatTags || []).map(normalized).includes("biological");
  });
  const special = (state.relocationAbilityHistory || []).some((entry) => (
    Number(entry.round) === Number(state.round) && entry.sideKey === sideKey
      && entry.pieceId !== actorId && entry.deploymentResolved === true
      && entry.actorBiological === true));
  return standard || special;
}
function entrySegments(state, sideKey) {
  const rows = state.officialDeploymentGeometryBinding?.entryEdgesByPlayer?.[sideKey]
    ?.segments;
  if (!Array.isArray(rows) || rows.length < 1) {
    fail("RELOCATION_ENTRY_EDGE_UNAVAILABLE", sideKey);
  }
  return rows;
}
function nonEntrySides(state) {
  const entry = new Set(Object.values(state.officialDeploymentGeometryBinding
    ?.entryEdgesByPlayer || {}).flatMap((value) => (
    (value?.segments || []).map((segment) => segment.side))));
  return [...EDGE_SIDES].filter((side) => !entry.has(side)).sort();
}
function lockedEdges(state, sideKey) {
  return new Set((state.board?.deploymentEdgeLocks || []).filter((entry) => (
    entry.targetSideKey === sideKey && entry.expiresAt === "round_end"
      && Number(entry.roundApplied) === Number(state.round))).map((entry) => entry.edgeSide));
}
function movementProfile(state, piece) {
  const profile = state.officialActionRouteCatalogue?.units?.find((entry) => (
    entry.pieceId === piece.id && entry.recordKey === piece.officialUnitRecordKey));
  if (!profile) fail("RELOCATION_MOVEMENT_PROFILE_UNAVAILABLE", piece.id);
  return profile.movementProfile;
}
function actionActors(state, route, instance) {
  if (route.sourceKind === "unit_feature") return [instance.actor];
  const pieces = (state.pieces || []).filter((piece) => piece.sideKey === instance.sideKey);
  if (route.actionKind === "special_deploy") return pieces.filter((piece) => (
    deployTimingAvailable(state, route, instance.sideKey, piece)));
  return pieces.filter((piece) => actorMatches(route, piece)
    && activeTimingAvailable(state, route, instance.sideKey, piece));
}
function routeAvailable(state, route, instance, actor) {
  cardReady(instance);
  if (route.actionKind === "deploy_from_reserves"
    || route.actionKind === "special_deploy") {
    if (!deployTimingAvailable(state, route, instance.sideKey, actor)) return false;
    const requestedSupply = projectOfficialContextualSupplyValueV1({ state,
      pieceId: actor.id, context: "supply_pool_calculation" }).effectiveSupply;
    if (requestedSupply > supplyAvailable(state, instance.sideKey)) {
      return false;
    }
    if (route.oneFriendlyBiologicalDeployPerRound === true
      && priorBiologicalDeploy(state, instance.sideKey, actor.id)) return false;
    return true;
  }
  return activeTimingAvailable(state, route, instance.sideKey, actor);
}
function parameterSchema(state, route, actor) {
  if (route.effectKind === "deployment_edge_lock") return {
    type: "object", required: ["edgeSide"],
    edgeSide: { enum: nonEntrySides(state) },
  };
  const modelIds = liveModels(actor).map((entry) => entry.id).sort();
  const required = ["leadingModelId", "placements"];
  const schema = { type: "object", required,
    leadingModelId: { enum: modelIds }, placements: { exactModelIds: modelIds,
      coordinateUnit: "milli-inch", supportsRectangularBases: true } };
  if (route.effectKind === "extra_move") {
    required.push("path");
    schema.path = { coordinateUnit: "milli-inch", minPoints: 1,
      maxPoints: MAX_PATH_POINTS, maxDistanceMilliInches: route.maxDistanceMilliInches };
    schema.optional = ["elevationTransitions"];
  }
  if (route.effectKind === "entry_edge_place") {
    required.push("entrySegmentId");
    schema.entrySegmentId = { enum: entrySegments(state, actor.sideKey)
      .map((entry) => entry.segmentId).sort() };
  }
  if (route.effectKind === "friendly_anchor_place") {
    required.push("anchorPieceId", "anchorModelId");
    schema.anchorPieceId = { enum: (state.pieces || []).filter((piece) => (
      piece.sideKey === actor.sideKey && piece.id !== actor.id && activePiece(piece)))
      .map((piece) => piece.id).sort() };
  }
  if (route.effectKind === "non_entry_edge_deploy") {
    required.push("edgeSide");
    const locks = lockedEdges(state, actor.sideKey);
    schema.edgeSide = { enum: nonEntrySides(state).filter((side) => !locks.has(side)) };
  }
  return schema;
}
function domainFor(state, route, instance, actor) {
  const profile = route.effectKind === "non_entry_edge_deploy"
    ? movementProfile(state, actor) : null;
  const maxDistanceMilliInches = route.effectKind === "non_entry_edge_deploy"
    ? milli(profile.currentDeploySpeedInches) : route.maxDistanceMilliInches || null;
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_RELOCATION_FAMILY_PARAMETER_KIND,
    executorId: OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION,
    actionType: "resolve_relocation_ability",
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: instance.sourceInstanceId,
    sourceKind: route.sourceKind,
    sideKey: actor.sideKey,
    phase: state.phase,
    pieceId: actor.id,
    abilityName: route.abilityName,
    effectKind: route.effectKind,
    parameterSchema: parameterSchema(state, route, actor),
    constraints: {
      maxDistanceMilliInches,
      minimumEnemyGapMilliInchesExclusive:
        route.minimumEnemyGapMilliInchesExclusive || null,
      reserveExplicit: route.reserveExplicit === true,
      actionLimitConsumed: route.actionLimitConsumed ?? null,
      oncePerGame: route.oncePerGame === true,
      replacesStandardAction: route.replacesStandardAction === true,
      fullBaseBoundaryRequired: true,
      completeFormationCoherencyRequired: true,
      sourceRouteHash: route.routeHash,
    },
    confirmationClass: "rules_owned_direct_action",
    rulesTruth: "official_current_product_relocation_parameter_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}

function enumerate(bundle, state, options = {}) {
  verifyOfficialModelBaseGeometryDataBundleV1(state.officialModelBaseGeometryDataBundle);
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("RELOCATION_SIDE_INVALID", sideKey);
  const parameterDomains = [];
  const candidates = [];
  const catalogueScope = options.scope === "catalogue";
  for (const route of bundle.routes) {
    if (QUERY_EFFECTS.has(route.effectKind)) continue;
    for (const instance of routeInstances(state, route).filter((entry) => (
      catalogueScope || entry.sideKey === sideKey))) {
      const actors = actionActors(state, route, instance);
      for (const actor of actors) {
        try {
          if (!routeAvailable(state, route, instance, actor)) {
            fail("RELOCATION_ROUTE_UNAVAILABLE");
          }
          const domain = domainFor(state, route, instance, actor);
          if (Object.values(domain.parameterSchema).some((entry) => (
            object(entry) && Array.isArray(entry.enum) && entry.enum.length === 0))) {
            fail("RELOCATION_PARAMETER_CHOICE_EMPTY");
          }
          parameterDomains.push(domain);
        } catch (error) {
          if (options.includeDisabled === true) candidates.push({
            actionType: "resolve_relocation_ability",
            definitionId: route.definitionId,
            sourceInstanceId: instance.sourceInstanceId,
            pieceId: actor.id,
            sideKey: actor.sideKey,
            effectKind: route.effectKind,
            executorId: OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID,
            executorVersion: OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION,
            isEnabled: false,
            disabledReason: String(error?.message || error).split(":")[0],
            score: 0,
            details: { trainingTruth: false },
          });
        }
      }
    }
  }
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_relocation_legal_space_v1",
    runtimeId: OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION,
    candidates: candidates.sort((left, right) => (
      `${left.definitionId}:${left.sourceInstanceId}:${left.pieceId}`.localeCompare(
        `${right.definitionId}:${right.sourceInstanceId}:${right.pieceId}`))),
    parameterDomains: parameterDomains.sort((left, right) => (
      left.domainId.localeCompare(right.domainId))),
    queryOnlyDefinitionIds: bundle.routes.filter((entry) => QUERY_EFFECTS.has(
      entry.effectKind)).map((entry) => entry.definitionId).sort(),
    currentProductRelocationDenominatorComplete: true,
    searchAndStrategyExcludedFromAuthority: true,
    trainingTruth: false,
  });
}

function canonicalPlacements(actor, parameters) {
  const models = liveModels(actor);
  const remaining = new Set(models.map((entry) => entry.id));
  if (!Array.isArray(parameters.placements)
    || parameters.placements.length !== models.length) {
    fail("RELOCATION_PLACEMENT_DENOMINATOR_INVALID", actor.id);
  }
  const placements = parameters.placements.map((entry) => {
    const modelId = String(entry?.modelId || "");
    if (!remaining.delete(modelId)) fail("RELOCATION_PLACEMENT_MODEL_INVALID", modelId);
    return { modelId, ...point(entry, "RELOCATION_PLACEMENT_POINT_INVALID", modelId),
      rotationDegrees: canonicalRotation(entry.rotationDegrees),
      elevation: elevation(entry.elevation),
      supportTerrainIds: [...new Set((entry.supportTerrainIds || []).map(String))].sort() };
  }).sort((left, right) => left.modelId.localeCompare(right.modelId));
  if (remaining.size > 0) fail("RELOCATION_PLACEMENT_DENOMINATOR_INVALID", actor.id);
  const leadingModelId = String(parameters.leadingModelId || "");
  if (!placements.some((entry) => entry.modelId === leadingModelId)) {
    fail("RELOCATION_LEADING_MODEL_INVALID", leadingModelId);
  }
  return { leadingModelId, placements };
}
function footprintAt(state, piece, model, placement) {
  return createOfficialModelBaseFootprintV1({ piece, model,
    dataBundle: state.officialModelBaseGeometryDataBundle,
    position: { ...placement, rotationDegrees: placement.rotationDegrees || 0 } });
}
function rectangleVertices(raw) {
  if (raw.shape === "rectangle") return raw.vertices;
  const minX = Number(raw.minX ?? raw.minXMilliInches);
  const maxX = Number(raw.maxX ?? raw.maxXMilliInches);
  const minY = Number(raw.minY ?? raw.minYMilliInches);
  const maxY = Number(raw.maxY ?? raw.maxYMilliInches);
  return [
    { xMilliInches: minX, yMilliInches: minY },
    { xMilliInches: maxX, yMilliInches: minY },
    { xMilliInches: maxX, yMilliInches: maxY },
    { xMilliInches: minX, yMilliInches: maxY },
  ];
}
function pointSegmentDistance(value, start, end) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  if (dx === 0 && dy === 0) return distance(value, start);
  const ratio = Math.max(0, Math.min(1,
    (((value.xMilliInches - start.xMilliInches) * dx)
      + ((value.yMilliInches - start.yMilliInches) * dy)) / ((dx * dx) + (dy * dy))));
  return Math.hypot(value.xMilliInches - (start.xMilliInches + (ratio * dx)),
    value.yMilliInches - (start.yMilliInches + (ratio * dy)));
}
function orientation(a, b, c) {
  return ((b.xMilliInches - a.xMilliInches) * (c.yMilliInches - a.yMilliInches))
    - ((b.yMilliInches - a.yMilliInches) * (c.xMilliInches - a.xMilliInches));
}
function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c); const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a); const o4 = orientation(c, d, b);
  const toleranceSign = (value) => Math.abs(value) <= TOLERANCE ? 0 : Math.sign(value);
  return toleranceSign(o1) * toleranceSign(o2) <= 0
    && toleranceSign(o3) * toleranceSign(o4) <= 0
    && Math.max(Math.min(a.xMilliInches, b.xMilliInches), Math.min(c.xMilliInches,
      d.xMilliInches)) <= Math.min(Math.max(a.xMilliInches, b.xMilliInches),
      Math.max(c.xMilliInches, d.xMilliInches)) + TOLERANCE
    && Math.max(Math.min(a.yMilliInches, b.yMilliInches), Math.min(c.yMilliInches,
      d.yMilliInches)) <= Math.min(Math.max(a.yMilliInches, b.yMilliInches),
      Math.max(c.yMilliInches, d.yMilliInches)) + TOLERANCE;
}
function pointInPolygon(value, vertices) {
  let inside = false;
  for (let index = 0, previous = vertices.length - 1;
    index < vertices.length; previous = index, index += 1) {
    const a = vertices[index]; const b = vertices[previous];
    if (((a.yMilliInches > value.yMilliInches) !== (b.yMilliInches > value.yMilliInches))
      && value.xMilliInches < ((b.xMilliInches - a.xMilliInches)
        * (value.yMilliInches - a.yMilliInches)
        / (b.yMilliInches - a.yMilliInches)) + a.xMilliInches) inside = !inside;
  }
  return inside;
}
function segmentPolygonDistance(start, end, vertices) {
  if (pointInPolygon(start, vertices) || pointInPolygon(end, vertices)) return 0;
  let value = Number.POSITIVE_INFINITY;
  for (let index = 0; index < vertices.length; index += 1) {
    const a = vertices[index]; const b = vertices[(index + 1) % vertices.length];
    if (segmentsIntersect(start, end, a, b)) return 0;
    value = Math.min(value, pointSegmentDistance(start, a, b),
      pointSegmentDistance(end, a, b), pointSegmentDistance(a, start, end),
      pointSegmentDistance(b, start, end));
  }
  return value;
}
function terrainFootprint(terrain) {
  const raw = terrain.footprint || terrain;
  if (raw.shape !== "axis_aligned_rectangle") {
    fail("RELOCATION_TERRAIN_GEOMETRY_INVALID", String(terrain.id || ""));
  }
  const minX = Number(raw.minXMilliInches); const maxX = Number(raw.maxXMilliInches);
  const minY = Number(raw.minYMilliInches); const maxY = Number(raw.maxYMilliInches);
  if (![minX, maxX, minY, maxY].every(Number.isSafeInteger)) {
    fail("RELOCATION_TERRAIN_GEOMETRY_INVALID", String(terrain.id || ""));
  }
  return { shape: "axis_aligned_rectangle", minX, maxX, minY, maxY };
}
function footprintOverlap(left, right) {
  if (left.shape === "round" && right.shape === "round") {
    return distance(left.center, right.center)
      < left.radiusMilliInches + right.radiusMilliInches - TOLERANCE;
  }
  if (left.shape === "round") {
    return pointInPolygon(left.center, rectangleVertices(right))
      || segmentPolygonDistance(left.center, left.center, rectangleVertices(right))
        < left.radiusMilliInches - TOLERANCE;
  }
  if (right.shape === "round") return footprintOverlap(right, left);
  const a = rectangleVertices(left); const b = rectangleVertices(right);
  return pointInPolygon(a[0], b) || pointInPolygon(b[0], a)
    || a.some((entry, index) => b.some((other, otherIndex) => segmentsIntersect(
      entry, a[(index + 1) % a.length], other, b[(otherIndex + 1) % b.length])));
}
function footprintBounds(footprint) {
  if (footprint.shape === "round") return {
    minX: footprint.center.xMilliInches - footprint.radiusMilliInches,
    maxX: footprint.center.xMilliInches + footprint.radiusMilliInches,
    minY: footprint.center.yMilliInches - footprint.radiusMilliInches,
    maxY: footprint.center.yMilliInches + footprint.radiusMilliInches,
  };
  const vertices = rectangleVertices(footprint);
  return { minX: Math.min(...vertices.map((entry) => entry.xMilliInches)),
    maxX: Math.max(...vertices.map((entry) => entry.xMilliInches)),
    minY: Math.min(...vertices.map((entry) => entry.yMilliInches)),
    maxY: Math.max(...vertices.map((entry) => entry.yMilliInches)) };
}
function canonicalPath(state, actor, leadingModel, placement, raw, maxDistance,
  elevationTransitions = []) {
  if (leadingModel.baseShape !== "round"
    || leadingModel.baseWidthInches !== leadingModel.baseDepthInches) {
    fail("RELOCATION_MOVE_ROUND_LEADING_BASE_REQUIRED", leadingModel.id);
  }
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_PATH_POINTS) {
    fail("RELOCATION_PATH_DENOMINATOR_INVALID");
  }
  const points = [{ ...modelPoint(leadingModel),
    elevation: elevation(leadingModel.elevation),
    supportTerrainIds: [...new Set((leadingModel.supportTerrainIds || []).map(String))]
      .sort() }];
  for (const [index, entry] of raw.entries()) {
    const next = { ...point(entry, "RELOCATION_PATH_POINT_INVALID", String(index)),
      elevation: elevation(entry.elevation),
      supportTerrainIds: [...new Set((entry.supportTerrainIds || []).map(String))].sort() };
    if (distance(points.at(-1), next) > TOLERANCE
      || points.at(-1).elevation !== next.elevation) points.push(next);
  }
  if (points.length < 2 || distance(points.at(-1), placement) > TOLERANCE) {
    fail("RELOCATION_PATH_ENDPOINT_INVALID");
  }
  const distanceMilliInches = Math.round(points.slice(1).reduce((sum, entry, index) => (
    sum + distance(points[index], entry)), 0));
  if (distanceMilliInches > maxDistance + TOLERANCE) {
    fail("RELOCATION_PATH_EXCEEDS_DISTANCE");
  }
  const radius = milli(leadingModel.baseWidthInches) / 2;
  const width = milli(state.board.widthInches); const height = milli(state.board.heightInches);
  if (points.some((entry) => entry.xMilliInches < radius - TOLERANCE
    || entry.xMilliInches > width - radius + TOLERANCE
    || entry.yMilliInches < radius - TOLERANCE
    || entry.yMilliInches > height - radius + TOLERANCE)) {
    fail("RELOCATION_FULL_BASE_OUTSIDE_BATTLEFIELD");
  }
  const blockers = (state.pieces || []).filter((piece) => piece.id !== actor.id
    && activePiece(piece)).flatMap((piece) => liveModels(piece).map((model) => ({
    id: model.id, footprint: footprintAt(state, piece, model, {
      ...modelPoint(model), rotationDegrees: model.baseRotationDegrees || 0,
    }) })));
  const grassRemovedTerrainIds = new Set();
  const transitions = new Map();
  for (const entry of elevationTransitions || []) {
    const segmentIndex = Number(entry?.segmentIndex);
    const accessPointId = String(entry?.accessPointId || "");
    if (!Number.isSafeInteger(segmentIndex) || segmentIndex < 0
      || segmentIndex >= points.length - 1 || !accessPointId
      || transitions.has(segmentIndex)) {
      fail("RELOCATION_ELEVATION_TRANSITION_INVALID", String(segmentIndex));
    }
    transitions.set(segmentIndex, accessPointId);
  }
  const usedTransitions = new Set();
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]; const end = points[index];
    for (const blocker of blockers) {
      const blocked = blocker.footprint.shape === "round"
        ? pointSegmentDistance(blocker.footprint.center, start, end)
          < radius + blocker.footprint.radiusMilliInches - TOLERANCE
        : segmentPolygonDistance(start, end, blocker.footprint.vertices)
          < radius - TOLERANCE;
      if (blocked) fail("RELOCATION_PATH_MODEL_COLLISION", blocker.id);
    }
    for (const terrain of (state.board.terrain || []).filter((entry) => (
      entry.isRemoved !== true && entry.isDestroyed !== true))) {
      const footprint = terrainFootprint(terrain);
      const crossed = segmentPolygonDistance(start, end, rectangleVertices(footprint))
        < radius - TOLERANCE;
      const kind = normalized(terrain.terrainKind || "ordinary");
      if (kind === "grass" && crossed) grassRemovedTerrainIds.add(terrain.id);
      const declaredAccessPointId = transitions.get(index - 1);
      const access = state.board.specialTerrainAgreement?.terrainEntries
        ?.find((entry) => entry.terrainId === terrain.id)?.accessPoints
        ?.find((entry) => entry.accessPointId === declaredAccessPointId);
      const accessCrossed = access && segmentPolygonDistance(start, end,
        rectangleVertices(terrainFootprint({ id: access.accessPointId,
          footprint: access.footprint }))) <= TOLERANCE
        && new Set(access.connects || []).has(start.elevation)
        && new Set(access.connects || []).has(end.elevation);
      if (accessCrossed) usedTransitions.add(index - 1);
      const blocked = crossed && (kind === "impassable"
        || (kind === "ordinary" && Number(terrain.size) >= 2 && !accessCrossed));
      if (blocked) {
        fail("RELOCATION_TERRAIN_PATH_BLOCKED", terrain.id);
      }
    }
    if (start.elevation !== end.elevation && !usedTransitions.has(index - 1)) {
      fail("RELOCATION_ACCESS_POINT_REQUIRED", String(index - 1));
    }
  }
  if (usedTransitions.size !== transitions.size) {
    fail("RELOCATION_ELEVATION_TRANSITION_UNUSED");
  }
  return { points, distanceMilliInches,
    grassRemovedTerrainIds: [...grassRemovedTerrainIds].sort(),
    fullRoundBaseSweptPathChecked: true };
}
function supportAndGrass(state, actor, placements) {
  const grass = new Set();
  const supported = new Set();
  for (const placement of placements) {
    const model = liveModels(actor).find((entry) => entry.id === placement.modelId);
    const footprint = footprintAt(state, actor, model, placement);
    const actualSupports = [];
    for (const terrain of (state.board.terrain || []).filter((entry) => (
      entry.isRemoved !== true && entry.isDestroyed !== true))) {
      const terrainGeometry = terrainFootprint(terrain);
      const terrainShape = { shape: "rectangle", vertices: rectangleVertices(terrainGeometry) };
      if (!footprintOverlap(footprint, terrainShape)) continue;
      if (normalized(terrain.terrainKind) === "grass") grass.add(terrain.id);
      else if (terrain.standableHorizontalSurface === true) {
        const bounds = footprintBounds(footprint);
        if (bounds.minX >= terrainGeometry.minX - TOLERANCE
          && bounds.maxX <= terrainGeometry.maxX + TOLERANCE
          && bounds.minY >= terrainGeometry.minY - TOLERANCE
          && bounds.maxY <= terrainGeometry.maxY + TOLERANCE) actualSupports.push(terrain.id);
      }
    }
    actualSupports.sort();
    if (!isDeepStrictEqual(actualSupports, placement.supportTerrainIds)) {
      fail("RELOCATION_TERRAIN_SUPPORT_MISMATCH", placement.modelId);
    }
    const highest = actualSupports.reduce((value, id) => Math.max(value,
      Number(state.board.terrain.find((entry) => entry.id === id)?.size || 0)), 0);
    const expectedElevation = highest >= 3 ? "high" : highest >= 1 ? "mid" : "ground";
    if (placement.elevation !== expectedElevation) {
      fail("RELOCATION_TERRAIN_ELEVATION_MISMATCH", placement.modelId);
    }
    for (const id of actualSupports) supported.add(id);
  }
  return { supportedTerrainIds: [...supported].sort(),
    grassRemovedTerrainIds: [...grass].sort() };
}
function projectGeometry(state, actor, placements, ignoredTerrainIds) {
  const projected = clone(state);
  const piece = projected.pieces.find((entry) => entry.id === actor.id);
  piece.isOnField = true; piece.isInReserves = false;
  for (const model of piece.models) {
    const placement = placements.find((entry) => entry.modelId === model.id);
    if (!placement) continue;
    model.xInches = inches(placement.xMilliInches);
    model.yInches = inches(placement.yMilliInches);
    model.baseRotationDegrees = placement.rotationDegrees;
    model.elevation = placement.elevation;
    model.supportTerrainIds = [...placement.supportTerrainIds];
    model.isOnField = true;
  }
  const ignored = new Set(ignoredTerrainIds);
  projected.board.terrain = projected.board.terrain.filter((entry) => !ignored.has(entry.id));
  return { state: projected, actor: piece };
}
function enemyGapCheck(projected, actor, minimumExclusive) {
  if (!minimumExclusive) return;
  for (const model of liveModels(actor)) {
    for (const enemy of projected.pieces.filter((piece) => (
      piece.sideKey !== actor.sideKey && activePiece(piece)))) {
      for (const enemyModel of liveModels(enemy)) {
        const measurement = evaluateOfficialBaseMeasurementV1({
          state: projected,
          source: { kind: "model", unitId: actor.id, modelId: model.id },
          target: { kind: "model", unitId: enemy.id, modelId: enemyModel.id },
          dataBundle: projected.officialModelBaseGeometryDataBundle,
        });
        if (measurement.distanceMilliInches <= minimumExclusive + TOLERANCE) {
          fail("RELOCATION_ENEMY_GAP_REQUIRED", `${model.id}:${enemyModel.id}`);
        }
      }
    }
  }
}
function edgeConstraint(state, actor, leadingPlacement, leadingModel, side,
  maximumDistance, segment = null) {
  if (!EDGE_SIDES.has(side)) fail("RELOCATION_EDGE_INVALID", side);
  const footprint = footprintAt(state, actor, leadingModel, leadingPlacement);
  const bounds = footprintBounds(footprint);
  const width = milli(state.board.widthInches); const height = milli(state.board.heightInches);
  const extent = side === "top" ? height - bounds.minY
    : side === "bottom" ? bounds.maxY
      : side === "left" ? bounds.maxX : width - bounds.minX;
  if (extent > maximumDistance + TOLERANCE) fail("RELOCATION_EDGE_DISTANCE_EXCEEDED");
  if (segment) {
    const minimum = milli(segment.startInches); const maximum = milli(segment.endInches);
    const alongMin = new Set(["top", "bottom"]).has(side) ? bounds.minX : bounds.minY;
    const alongMax = new Set(["top", "bottom"]).has(side) ? bounds.maxX : bounds.maxY;
    if (alongMin < minimum - TOLERANCE || alongMax > maximum + TOLERANCE) {
      fail("RELOCATION_ENTRY_SEGMENT_EXCEEDED", segment.segmentId);
    }
  }
}
function pointToRectangleDistance(value, footprint) {
  const radians = -(footprint.rotationDegrees || 0) * Math.PI / 180;
  const dx = value.xMilliInches - footprint.center.xMilliInches;
  const dy = value.yMilliInches - footprint.center.yMilliInches;
  const x = (dx * Math.cos(radians)) - (dy * Math.sin(radians));
  const y = (dx * Math.sin(radians)) + (dy * Math.cos(radians));
  const outsideX = Math.max(Math.abs(x) - footprint.widthMilliInches / 2, 0);
  const outsideY = Math.max(Math.abs(y) - footprint.depthMilliInches / 2, 0);
  return Math.hypot(outsideX, outsideY);
}
function maximumTargetDistanceFromSource(source, target) {
  if (source.shape === "round" && target.shape === "round") {
    return Math.max(0, distance(source.center, target.center)
      + target.radiusMilliInches - source.radiusMilliInches);
  }
  if (target.shape === "rectangle") {
    return Math.max(...target.vertices.map((entry) => source.shape === "round"
      ? Math.max(0, distance(source.center, entry) - source.radiusMilliInches)
      : pointToRectangleDistance(entry, source)));
  }
  if (source.shape === "rectangle") {
    const centerDistance = pointToRectangleDistance(target.center, source);
    if (centerDistance > TOLERANCE) return centerDistance + target.radiusMilliInches;
    const radians = -(source.rotationDegrees || 0) * Math.PI / 180;
    const dx = target.center.xMilliInches - source.center.xMilliInches;
    const dy = target.center.yMilliInches - source.center.yMilliInches;
    const x = Math.abs((dx * Math.cos(radians)) - (dy * Math.sin(radians)));
    const y = Math.abs((dx * Math.sin(radians)) + (dy * Math.cos(radians)));
    const margin = Math.min(source.widthMilliInches / 2 - x,
      source.depthMilliInches / 2 - y);
    return Math.max(0, target.radiusMilliInches - margin);
  }
  fail("RELOCATION_FOOTPRINT_RELATION_UNSUPPORTED");
}
function anchorConstraint(state, actor, leadingPlacement, leadingModel, parameters,
  maximumDistance) {
  const anchorPiece = state.pieces.find((entry) => entry.id === parameters.anchorPieceId
    && entry.sideKey === actor.sideKey && entry.id !== actor.id && activePiece(entry));
  const anchorModel = liveModels(anchorPiece).find((entry) => (
    entry.id === parameters.anchorModelId));
  if (!anchorModel) fail("RELOCATION_FRIENDLY_ANCHOR_INVALID");
  const source = footprintAt(state, anchorPiece, anchorModel, {
    ...modelPoint(anchorModel), rotationDegrees: anchorModel.baseRotationDegrees || 0,
  });
  const target = footprintAt(state, actor, leadingModel, leadingPlacement);
  if (maximumTargetDistanceFromSource(source, target) > maximumDistance + TOLERANCE) {
    fail("RELOCATION_FRIENDLY_ANCHOR_DISTANCE_EXCEEDED");
  }
}
function enemyZoneCheck(state, actor, placements) {
  const zones = Object.entries(state.officialDeploymentGeometryBinding
    ?.entryEdgesByPlayer || {}).filter(([sideKey]) => sideKey !== actor.sideKey)
    .flatMap(([, value]) => (value?.segments || []).map((segment) => segment.zoneRectangle));
  for (const placement of placements) {
    const model = liveModels(actor).find((entry) => entry.id === placement.modelId);
    const footprint = footprintAt(state, actor, model, placement);
    if (zones.some((zone) => footprintOverlap(footprint, {
      shape: "rectangle", vertices: rectangleVertices({
        minX: milli(zone.xMin), maxX: milli(zone.xMax),
        minY: milli(zone.yMin), maxY: milli(zone.yMax),
      }),
    }))) fail("RELOCATION_ENEMY_ZONE_OF_INFLUENCE_PROHIBITED", model.id);
  }
}
function instantiate(bundle, state, domain, parameters = {}) {
  const current = enumerate(bundle, state, { sideKey: domain?.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => (
    entry.domainId === domain?.domainId));
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("RELOCATION_PARAMETER_DOMAIN_STALE");
  }
  const route = bundle.routes.find((entry) => entry.definitionId === domain.definitionId);
  const actor = state.pieces.find((entry) => entry.id === domain.pieceId);
  if (!route || !actor || !object(parameters)) fail("RELOCATION_ACTION_INPUT_INVALID");
  let canonicalParameters;
  let geometryPlan = null;
  if (route.effectKind === "deployment_edge_lock") {
    const edgeSide = String(parameters.edgeSide || "");
    if (!domain.parameterSchema.edgeSide.enum.includes(edgeSide)
      || Object.keys(parameters).some((key) => key !== "edgeSide")) {
      fail("RELOCATION_EDGE_LOCK_PARAMETERS_INVALID");
    }
    canonicalParameters = { edgeSide };
  } else {
    const { leadingModelId, placements } = canonicalPlacements(actor, parameters);
    const leadingPlacement = placements.find((entry) => entry.modelId === leadingModelId);
    const leadingModel = liveModels(actor).find((entry) => entry.id === leadingModelId);
    const terrain = supportAndGrass(state, actor, placements);
    const ignoredTerrainIds = [...new Set([
      ...terrain.supportedTerrainIds, ...terrain.grassRemovedTerrainIds,
    ])].sort();
    let pathResult = null;
    if (route.effectKind === "extra_move") {
      pathResult = canonicalPath(state, actor, leadingModel, leadingPlacement,
        parameters.path, domain.constraints.maxDistanceMilliInches,
        parameters.elevationTransitions || []);
    } else if (route.effectKind === "direct_place") {
      const start = modelPoint(leadingModel);
      if (distance(start, leadingPlacement)
        > domain.constraints.maxDistanceMilliInches + TOLERANCE) {
        fail("RELOCATION_PLACE_DISTANCE_EXCEEDED");
      }
    } else if (route.effectKind === "entry_edge_place") {
      const segmentId = String(parameters.entrySegmentId || "");
      const segment = entrySegments(state, actor.sideKey).find((entry) => (
        entry.segmentId === segmentId));
      if (!segment) fail("RELOCATION_ENTRY_SEGMENT_INVALID", segmentId);
      edgeConstraint(state, actor, leadingPlacement, leadingModel, segment.side,
        domain.constraints.maxDistanceMilliInches, segment);
    } else if (route.effectKind === "friendly_anchor_place") {
      anchorConstraint(state, actor, leadingPlacement, leadingModel, parameters,
        domain.constraints.maxDistanceMilliInches);
    } else if (route.effectKind === "non_entry_edge_deploy") {
      const edgeSide = String(parameters.edgeSide || "");
      if (!domain.parameterSchema.edgeSide.enum.includes(edgeSide)) {
        fail("RELOCATION_NON_ENTRY_EDGE_INVALID", edgeSide);
      }
      edgeConstraint(state, actor, leadingPlacement, leadingModel, edgeSide,
        domain.constraints.maxDistanceMilliInches);
      enemyZoneCheck(state, actor, placements);
    }
    const projected = projectGeometry(state, actor, placements, ignoredTerrainIds);
    const coherency = evaluateOfficialCoherencyPlacementV1({
      state: projected.state, actor: projected.actor,
      dataBundle: state.officialModelBaseGeometryDataBundle,
      coherencyRangeMilliInches: 3000,
      plan: { planId: `relocation-${domain.domainId.slice(-24)}`,
        leadingModelId, placements: placements.map((entry) => ({
          ...entry, outcome: "placed",
        })), currentlyEngagedEnemyUnitIds: [],
      closestLegalPlacementDenominatorComplete: false },
    });
    enemyGapCheck(projected.state, projected.actor,
      domain.constraints.minimumEnemyGapMilliInchesExclusive);
    canonicalParameters = { leadingModelId, placements,
      ...(pathResult ? { path: pathResult.points,
        elevationTransitions: clone(parameters.elevationTransitions || []) } : {}),
      ...(parameters.entrySegmentId
        ? { entrySegmentId: String(parameters.entrySegmentId) } : {}),
      ...(parameters.edgeSide ? { edgeSide: String(parameters.edgeSide) } : {}),
      ...(parameters.anchorPieceId ? { anchorPieceId: String(parameters.anchorPieceId),
        anchorModelId: String(parameters.anchorModelId) } : {}) };
    geometryPlan = seal({
      schema: "starcraft_tmg_official_relocation_geometry_plan_v1",
      semanticVersion: "1.0.0",
      definitionId: route.definitionId,
      effectKind: route.effectKind,
      pieceId: actor.id,
      leadingModelId,
      finalModelPositions: placements,
      distanceTravelledMilliInches: pathResult?.distanceMilliInches || null,
      maxDistanceMilliInches: domain.constraints.maxDistanceMilliInches,
      coherencyResultHash: coherency.resultHash,
      grassRemovedTerrainIds: [...new Set([
        ...terrain.grassRemovedTerrainIds,
        ...(pathResult?.grassRemovedTerrainIds || []),
      ])].sort(),
      fullBaseBoundaryChecked: true,
      fullRoundBaseSweptPathChecked:
        route.effectKind === "extra_move" ? true : null,
      rectangularEndpointBasesChecked: true,
      completeFormationCoherencyChecked: true,
      pathIgnoredForPlaceEffects: PLACEMENT_EFFECTS.has(route.effectKind),
      rulesTruth: "official_current_product_relocation_geometry",
      trainingTruth: false,
    }, "geometryPlanHash");
  }
  const plan = seal({
    schema: "starcraft_tmg_official_relocation_ability_plan_v1",
    semanticVersion: "1.0.0",
    domainId: domain.domainId,
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: domain.sourceInstanceId,
    sourceKind: route.sourceKind,
    sideKey: domain.sideKey,
    phase: domain.phase,
    pieceId: actor.id,
    abilityName: route.abilityName,
    effectKind: route.effectKind,
    canonicalParameters,
    geometryPlan,
    sourceRouteHash: route.routeHash,
    rulesTruth: "official_current_product_relocation_ability_plan",
    trainingTruth: false,
  }, "planHash");
  const action = freezeDeep({
    actionType: "resolve_relocation_ability",
    sideKey: domain.sideKey,
    phase: domain.phase,
    pieceId: actor.id,
    definitionId: route.definitionId,
    abilityName: route.abilityName,
    relocationPlan: plan,
    executorId: OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION,
  });
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters,
    action,
    rulesTruth: "official_current_product_relocation_instantiation",
    trainingTruth: false,
  });
}

function preview(bundle, state, request = {}) {
  const instantiated = instantiate(bundle, state, request.domain,
    request.parameters || {});
  return seal({
    schema: "starcraft_tmg_official_relocation_preview_v1",
    semanticVersion: "1.0.0",
    action: instantiated.action,
    actionHash: hashStarcraftTmgContract(instantiated.action),
    geometryPlanHash:
      instantiated.action.relocationPlan.geometryPlan?.geometryPlanHash || null,
    confirmationClass: request.domain.confirmationClass,
    mutationApplied: false,
    rulesAuthority: true,
    rulesTruth: "official_current_product_relocation_preview",
    trainingTruth: false,
  }, "previewHash");
}
function placeActor(state, actor, plan) {
  const positions = new Map(plan.geometryPlan.finalModelPositions.map((entry) => (
    [entry.modelId, entry])));
  for (const model of actor.models) {
    const placement = positions.get(model.id);
    if (!placement) continue;
    model.xInches = inches(placement.xMilliInches);
    model.yInches = inches(placement.yMilliInches);
    model.baseRotationDegrees = placement.rotationDegrees;
    model.elevation = placement.elevation;
    model.supportTerrainIds = [...placement.supportTerrainIds];
    model.isOnField = true;
  }
  const leading = positions.get(plan.geometryPlan.leadingModelId);
  actor.xInches = inches(leading.xMilliInches);
  actor.yInches = inches(leading.yMilliInches);
  actor.isOnField = true; actor.isInReserves = false;
  actor.statuses = (actor.statuses || []).filter((entry) => statusName(entry) !== "stationary");
  actor.inCoherency = true;
  actor.coherencyStatus = { schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
    status: "in_coherency", isOutOfCoherency: false,
    coherencyRangeMilliInches: 3000 };
  actor.lastLeadingModelId = plan.geometryPlan.leadingModelId;
  actor.lastRelocationAbilityPlanHash = plan.planHash;
  for (const terrainId of plan.geometryPlan.grassRemovedTerrainIds) {
    const terrain = state.board.terrain.find((entry) => entry.id === terrainId);
    if (terrain) terrain.isRemoved = true;
  }
}
function openAfterActionWindow(state, actor) {
  state.selectedRosterActivationWindow = {
    schema: "starcraft_tmg_selected_roster_activation_window_v1",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    pieceId: actor.id, stage: "after_action", trainingTruth: false,
  };
}
function alternateAfterEndedActivation(state, sideKey) {
  const phase = state.phase;
  const available = (candidateSide) => state.players?.[candidateSide]
    ?.passedPhases?.[phase] !== true && (state.pieces || []).some((piece) => (
    piece.sideKey === candidateSide && livePiece(piece)
      && piece.activatedPhases?.[phase] !== true));
  const opponent = sideKey === "player1" ? "player2" : "player1";
  if (available(opponent)) state.activeSideKey = opponent;
  else if (available(sideKey)) state.activeSideKey = sideKey;
}
function apply(bundle, stateInput, request = {}) {
  const action = request.action;
  if (!object(action) || action.executorId !== OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID
    || action.executorVersion !== OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION
    || action.actionType !== "resolve_relocation_ability") {
    fail("RELOCATION_ACTION_INVALID");
  }
  const domain = enumerate(bundle, stateInput, { sideKey: action.sideKey,
    includeDisabled: true }).parameterDomains.find((entry) => (
    entry.domainId === action.relocationPlan?.domainId));
  if (!domain) fail("RELOCATION_ACTION_DOMAIN_STALE");
  const expected = instantiate(bundle, stateInput, domain,
    action.relocationPlan.canonicalParameters);
  if (!isDeepStrictEqual(expected.action, action)) fail("RELOCATION_ACTION_STALE");
  const state = clone(stateInput);
  const route = bundle.routes.find((entry) => entry.definitionId === action.definitionId);
  const actor = state.pieces.find((entry) => entry.id === action.pieceId);
  const events = [];
  if (route.sourceKind === "card_feature") {
    const card = (state.cardResources?.[action.sideKey] || []).find((entry) => (
      entry.cardInstanceId === action.relocationPlan.sourceInstanceId));
    if (!card || card.readiness !== "ready") fail("RELOCATION_SOURCE_CARD_NOT_READY");
    card.readiness = "exhausted";
    events.push({ type: "ability_source_card_exhausted",
      cardInstanceId: card.cardInstanceId, trainingTruth: false });
  }
  if (route.effectKind === "deployment_edge_lock") {
    state.board.deploymentEdgeLocks = state.board.deploymentEdgeLocks || [];
    const edgeSide = action.relocationPlan.canonicalParameters.edgeSide;
    state.board.deploymentEdgeLocks.push({
      lockId: `edge-lock-${hashStarcraftTmgContract({ round: state.round,
        definitionId: route.definitionId, edgeSide }).slice(0, 20)}`,
      edgeSide, sourceSideKey: action.sideKey,
      targetSideKey: action.sideKey === "player1" ? "player2" : "player1",
      sourceDefinitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash,
      roundApplied: Number(state.round), expiresAt: "round_end",
      trainingTruth: false,
    });
    events.push({ type: "enemy_deployment_edge_locked", edgeSide,
      expiresAt: "round_end", trainingTruth: false });
  } else {
    placeActor(state, actor, action.relocationPlan);
    const deploymentResolved = ["deploy_from_reserves", "special_deploy"]
      .includes(route.actionKind);
    if (deploymentResolved) {
      actor.deploymentStatus = "deployed";
      const manifest = state.reserveManifestBySide?.[actor.sideKey]?.find((entry) => (
        entry.pieceId === actor.id));
      if (manifest) manifest.deploymentStatus = "deployed";
    }
    if (route.activationEnds === true) {
      actor.activatedPhases = { movement: false, assault: false, combat: false,
        ...(actor.activatedPhases || {}), movement: true };
      delete state.selectedRosterActivationWindow;
      alternateAfterEndedActivation(state, actor.sideKey);
    } else if (route.opensAfterActionWindow === true) {
      if (route.replacesStandardAction === true || route.actionKind === "special_deploy") {
        actor.activatedPhases = { movement: false, assault: false, combat: false,
          ...(actor.activatedPhases || {}), movement: true };
      }
      openAfterActionWindow(state, actor);
    }
    events.push({ type: "relocation_ability_resolved",
      definitionId: route.definitionId, abilityName: route.abilityName,
      effectKind: route.effectKind, pieceId: actor.id,
      leadingModelId: action.relocationPlan.geometryPlan.leadingModelId,
      geometryPlanHash: action.relocationPlan.geometryPlan.geometryPlanHash,
      deploymentResolved, actionLimitConsumed: route.actionLimitConsumed ?? null,
      trainingTruth: false });
  }
  if (route.activationKind === "active") {
    state.activeAbilityUseHistory = state.activeAbilityUseHistory || [];
    state.activeAbilityUseHistory.push({
      useKey: `${state.round}:${route.abilityName}:${actor.id}`,
      round: Number(state.round), phase: state.phase, sideKey: action.sideKey,
      pieceId: actor.id, routeId: route.definitionId,
      abilityName: route.abilityName, planHash: action.relocationPlan.planHash,
      trainingTruth: false,
    });
  }
  state.relocationAbilityHistory = state.relocationAbilityHistory || [];
  state.relocationAbilityHistory.push({
    round: Number(state.round), phase: state.phase, sideKey: action.sideKey,
    pieceId: actor.id, definitionId: route.definitionId,
    effectKind: route.effectKind,
    deploymentResolved: ["deploy_from_reserves", "special_deploy"]
      .includes(route.actionKind),
    actorBiological: (actor.combatTags || []).map(normalized).includes("biological"),
    planHash: action.relocationPlan.planHash, events: clone(events), trainingTruth: false,
  });
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(action), events: clone(events) });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_relocation_transition_v1",
    runtimeId: OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION,
    postRevision: Number(request.options?.postRevision || 0),
    state: freezeDeep(state), action: clone(action), events,
    rulesTruth: "official_current_product_relocation_transition",
    trainingTruth: false });
}

function query(bundle, state, request = {}) {
  const queryKind = String(request.queryKind || request.kind || "");
  if (queryKind === "instantiate_parameterized_action") {
    const domain = enumerate(bundle, state, { sideKey: request.sideKey
      || state.activeSideKey, includeDisabled: true }).parameterDomains.find((entry) => (
      entry.domainId === request.domainId));
    if (!domain) fail("RELOCATION_QUERY_DOMAIN_STALE");
    const result = preview(bundle, state, { domain, parameters: request.parameters || {} });
    return seal({ schema: "starcraft_tmg_official_relocation_query_v1",
      semanticVersion: "1.0.0", queryKind, precision: "exact",
      result: { preview: result, action: result.action },
      source: OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID,
      rulesAuthority: true, mutationAuthority: false,
      sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
  }
  if (queryKind !== "relocation_modifier_projection"
    && queryKind !== "definition_routes") {
    fail("RELOCATION_QUERY_KIND_UNSUPPORTED", queryKind);
  }
  if (queryKind === "definition_routes") {
    return seal({ schema: "starcraft_tmg_official_relocation_query_v1",
      semanticVersion: "1.0.0", queryKind, precision: "exact",
      result: { routes: clone(bundle.routes), routeCount: bundle.routeCount },
      source: OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID,
      rulesAuthority: true, mutationAuthority: false,
      sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
  }
  const piece = state.pieces.find((entry) => entry.id === request.pieceId);
  if (!piece) fail("RELOCATION_QUERY_PIECE_UNKNOWN", String(request.pieceId || ""));
  const routes = bundle.routes.filter((route) => QUERY_EFFECTS.has(route.effectKind)
    && route.recordKey === piece.officialUnitRecordKey && fieldedFeature(piece, route)
    && (activePiece(piece) || route.reserveExplicit === true));
  const burrowed = (piece.statuses || []).some((entry) => statusName(entry) === "burrowed");
  const result = {
    pieceId: piece.id,
    applicableDefinitionIds: routes.map((entry) => entry.definitionId).sort(),
    retainsBurrowedStatusOnMoveAndRun: burrowed && routes.some((entry) => (
      entry.effectKind === "burrow_movement_permission")),
    mayMoveThroughOtherUnitBases: burrowed && routes.some((entry) => (
      entry.effectKind === "burrow_movement_permission")),
    maximumImpassableTerrainSize: Math.max(0, ...routes.filter((entry) => (
      entry.effectKind === "raptor_terrain_permission"))
      .map((entry) => Number(entry.maximumImpassableTerrainSize || 0))),
    mayChangeElevationWithoutAccessPoints: routes.some((entry) => (
      entry.effectKind === "raptor_terrain_permission")),
    hasDisplacement: routes.some((entry) => (
      entry.effectKind === "displacement_permission")),
    deploymentStimpackCostReduction: Math.max(0, ...routes.filter((entry) => (
      entry.effectKind === "deployment_stimpack_discount"))
      .map((entry) => Number(entry.resourceCostReduction || 0))),
    minimumStimpackCost: routes.some((entry) => (
      entry.effectKind === "deployment_stimpack_discount")) ? 0 : null,
    consumerContract: "movement_and_deploy_runtimes_query_before_resolution",
    trainingTruth: false,
  };
  return seal({ schema: "starcraft_tmg_official_relocation_query_v1",
    semanticVersion: "1.0.0", queryKind, precision: "exact", result,
    source: OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

function lifecycle(stateInput, request = {}) {
  const eventKind = String(request.eventKind || "");
  if (!new Set(["round_end", "cleanup_and_refresh"]).has(eventKind)) return null;
  const state = clone(stateInput);
  const before = state.board?.deploymentEdgeLocks?.length || 0;
  state.board.deploymentEdgeLocks = (state.board?.deploymentEdgeLocks || []).filter((entry) => (
    eventKind === "round_end" ? entry.expiresAt !== "round_end" : false));
  const removed = before - state.board.deploymentEdgeLocks.length;
  if (removed === 0) return state;
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round || 0),
    phase: state.phase || null,
    action: { actionType: "relocation_lifecycle", eventKind },
    events: [{ type: "deployment_edge_locks_expired", eventKind, count: removed,
      trainingTruth: false }] });
  return state;
}

export function createOfficialRelocationFamilyAdapterV1(bundle) {
  verifyOfficialRelocationFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_RELOCATION_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_RELOCATION_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime",
    coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "lifecycle"],
    archetypeCounts: { ...bundle.archetypeCounts },
    sourceBundleHash: bundle.bundleHash,
    fullBaseBoundaryAndRectangularEndpointGeometry: true,
    fullRoundBaseSweptPathGeometry: true,
    legalSpacePreviewApplyReplaySequencePreserved: true,
    consumerQuerySeamExplicit: true,
    rulesAuthority: true,
    trainingTruth: false,
  });
  return freezeDeep({
    descriptor,
    legalSpace: (state, options = {}) => enumerate(bundle, state, options),
    preview: (state, request = {}) => preview(bundle, state, request),
    apply: (state, request = {}) => apply(bundle, state, request),
    query: (state, request = {}) => query(bundle, state, request),
    lifecycle: (state, request = {}) => lifecycle(state, request),
  });
}
