import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialModelBaseFootprintV1,
  evaluateOfficialCoherencyPlacementV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V5_ACTION_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_VERSION,
} from "../rule-atoms/official-reserve-deploy-executor-v5.mjs";
import {
  createOfficialRoundSupplyStateV1,
  verifyOfficialRoundSupplyStateV1,
} from "../rule-atoms/official-round-supply-state-v1.mjs";
import { verifyOfficialDeploymentGeometryBindingV1 } from
  "../rule-atoms/official-deployment-geometry-rules-kernel-v1.mjs";
import { verifyOfficialModelBaseGeometryDataBundleV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { verifyOfficialStandardActionRouteCatalogueV1 } from
  "./official-standard-action-route-catalogue-v1.mjs";

export const OFFICIAL_STANDARD_RESERVE_DEPLOY_ADAPTER_ID =
  "official-standard-reserve-deploy-adapter-v1";
export const OFFICIAL_STANDARD_RESERVE_DEPLOY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_STANDARD_RESERVE_DEPLOY_PARAMETER_KIND =
  "official_standard_reserve_deploy_path_v1";
export const OFFICIAL_STANDARD_RESERVE_DEPLOY_PLAN_SCHEMA =
  "starcraft_tmg_official_standard_reserve_deploy_plan_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SIDE_KEYS = new Set(["player1", "player2"]);
const TOLERANCE = 1;

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
function live(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}
function active(piece) { return live(piece) && piece?.isOnField === true; }
function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}
function point(value, code = "STANDARD_DEPLOY_POINT_INVALID") {
  const xMilliInches = Number(value?.xMilliInches);
  const yMilliInches = Number(value?.yMilliInches);
  if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches)) {
    fail(code);
  }
  return { xMilliInches, yMilliInches };
}
function milli(value, code = "STANDARD_DEPLOY_GEOMETRY_INVALID") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}
function inches(value) { return Number((Number(value) / 1000).toFixed(3)); }
function distanceToSegment(value, start, end) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  const lengthSquared = (dx * dx) + (dy * dy);
  if (lengthSquared === 0) return Math.hypot(
    value.xMilliInches - start.xMilliInches,
    value.yMilliInches - start.yMilliInches,
  );
  const ratio = Math.max(0, Math.min(1, (
    ((value.xMilliInches - start.xMilliInches) * dx)
      + ((value.yMilliInches - start.yMilliInches) * dy)
  ) / lengthSquared));
  return Math.hypot(
    value.xMilliInches - (start.xMilliInches + ratio * dx),
    value.yMilliInches - (start.yMilliInches + ratio * dy),
  );
}
function bounds(footprint) {
  if (footprint.shape === "round") {
    return {
      minX: footprint.center.xMilliInches - footprint.radiusMilliInches,
      maxX: footprint.center.xMilliInches + footprint.radiusMilliInches,
      minY: footprint.center.yMilliInches - footprint.radiusMilliInches,
      maxY: footprint.center.yMilliInches + footprint.radiusMilliInches,
    };
  }
  return {
    minX: Math.min(...footprint.vertices.map((entry) => entry.xMilliInches)),
    maxX: Math.max(...footprint.vertices.map((entry) => entry.xMilliInches)),
    minY: Math.min(...footprint.vertices.map((entry) => entry.yMilliInches)),
    maxY: Math.max(...footprint.vertices.map((entry) => entry.yMilliInches)),
  };
}
function boundsOverlap(left, right, tolerance = TOLERANCE) {
  return left.minX < right.maxX - tolerance
    && left.maxX > right.minX + tolerance
    && left.minY < right.maxY - tolerance
    && left.maxY > right.minY + tolerance;
}
function pointRectangleDistance(value, rectangle) {
  const dx = Math.max(rectangle.minX - value.xMilliInches, 0,
    value.xMilliInches - rectangle.maxX);
  const dy = Math.max(rectangle.minY - value.yMilliInches, 0,
    value.yMilliInches - rectangle.maxY);
  return Math.hypot(dx, dy);
}
function sweptCollision(start, end, blocker) {
  const startBounds = bounds(start);
  const endBounds = bounds(end);
  const sweep = {
    minX: Math.min(startBounds.minX, endBounds.minX),
    maxX: Math.max(startBounds.maxX, endBounds.maxX),
    minY: Math.min(startBounds.minY, endBounds.minY),
    maxY: Math.max(startBounds.maxY, endBounds.maxY),
  };
  if (!boundsOverlap(sweep, bounds(blocker))) return false;
  if (start.shape === "round" && blocker.shape === "round") {
    return distanceToSegment(blocker.center, start.center, end.center)
      < start.radiusMilliInches + blocker.radiusMilliInches - TOLERANCE;
  }
  if (start.shape === "round") {
    const expanded = bounds(blocker);
    expanded.minX -= start.radiusMilliInches;
    expanded.maxX += start.radiusMilliInches;
    expanded.minY -= start.radiusMilliInches;
    expanded.maxY += start.radiusMilliInches;
    return boundsOverlap({
      minX: Math.min(start.center.xMilliInches, end.center.xMilliInches),
      maxX: Math.max(start.center.xMilliInches, end.center.xMilliInches),
      minY: Math.min(start.center.yMilliInches, end.center.yMilliInches),
      maxY: Math.max(start.center.yMilliInches, end.center.yMilliInches),
    }, expanded, -TOLERANCE);
  }
  if (blocker.shape === "round") {
    return pointRectangleDistance(blocker.center, sweep)
      < blocker.radiusMilliInches - TOLERANCE;
  }
  return boundsOverlap(sweep, bounds(blocker));
}
function terrainBounds(entry) {
  const footprint = entry?.footprint || entry;
  const values = [footprint?.xMin, footprint?.xMax, footprint?.yMin, footprint?.yMax]
    .map((value) => milli(value));
  if (values.every(Number.isSafeInteger) && values[0] < values[1]
    && values[2] < values[3]) {
    return { minX: values[0], maxX: values[1], minY: values[2], maxY: values[3] };
  }
  fail("STANDARD_DEPLOY_TERRAIN_GEOMETRY_UNSUPPORTED", String(entry?.id || ""));
}
function movementProfile(state, piece) {
  const catalogue = state.officialActionRouteCatalogue;
  verifyOfficialStandardActionRouteCatalogueV1(catalogue);
  const unit = catalogue.units.find((entry) => entry.pieceId === piece.id);
  if (!unit || unit.recordKey !== piece.officialUnitRecordKey
    || unit.sourceRecordHash !== piece.sourceRecordHash
    || unit.payloadHash !== piece.officialPayloadHash) {
    fail("STANDARD_DEPLOY_ACTION_ROUTE_PROFILE_STALE", piece.id);
  }
  return unit.movementProfile;
}
function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "");
  if (!HASH_PATTERN.test(value)) fail("STANDARD_DEPLOY_RUNTIME_BINDING_REQUIRED");
  return value;
}
function context(state, sideKey, pieceId, options) {
  if (!object(state) || !object(state.players) || !Array.isArray(state.pieces)
    || !SIDE_KEYS.has(sideKey) || state.phase !== "movement"
    || state.activeSideKey !== sideKey || state.gameOver === true
    || state.players?.[sideKey]?.passedPhases?.movement === true) {
    fail("STANDARD_DEPLOY_PHASE_UNAVAILABLE");
  }
  const phaseChoice = state.phaseFirstActorByRound?.[`${state.round}:movement`];
  if (!object(phaseChoice) || phaseChoice.round !== Number(state.round)
    || phaseChoice.phase !== "movement") {
    fail("STANDARD_DEPLOY_MOVEMENT_INITIATIVE_UNRESOLVED");
  }
  const geometry = state.officialDeploymentGeometryBinding;
  const geometryBundle = state.officialModelBaseGeometryDataBundle;
  verifyOfficialDeploymentGeometryBindingV1(geometry);
  verifyOfficialModelBaseGeometryDataBundleV1(geometryBundle);
  if (!object(options.matchBinding)
    || hashStarcraftTmgContract(state.officialGameplayDataBundle)
      !== options.matchBinding.dataSnapshotHash) {
    fail("STANDARD_DEPLOY_DATA_SNAPSHOT_MISMATCH");
  }
  const boundRuntimeHash = runtimeHash(options.matchBinding);
  verifyOfficialRoundSupplyStateV1({ state,
    gameplayDataBundle: state.officialGameplayDataBundle,
    rulesRuntimeHash: boundRuntimeHash,
    roundSupplyState: state.officialRoundSupplyState });
  const piece = state.pieces.find((entry) => entry.id === pieceId
    && entry.sideKey === sideKey);
  if (!piece || !live(piece) || piece.isOnField === true
    || piece.activatedPhases?.movement === true
    || !Array.isArray(piece.models)
    || piece.models.length !== Number(piece.currentModels)) {
    fail("STANDARD_DEPLOY_UNIT_NOT_AVAILABLE", pieceId);
  }
  const supply = state.officialRoundSupplyState;
  if (supply.mode === "finite"
    && Number(piece.currentSupply) > Number(supply.availableSupplyBySide[sideKey])) {
    fail("STANDARD_DEPLOY_INSUFFICIENT_AVAILABLE_SUPPLY", piece.id);
  }
  const entry = geometry.entryEdgesByPlayer?.[sideKey];
  if (!entry || !Array.isArray(entry.segments) || entry.segments.length < 1) {
    fail("STANDARD_DEPLOY_ENTRY_EDGE_MISSING", sideKey);
  }
  return { state, sideKey, piece, geometry, geometryBundle,
    profile: movementProfile(state, piece), entry, supply, boundRuntimeHash };
}
function modelGeometry(piece, model) {
  const width = milli(model.baseWidthInches);
  const depth = milli(model.baseDepthInches);
  const shape = String(model.baseShape || "").toLowerCase();
  if (!model.id || !["round", "rectangle"].includes(shape)
    || width <= 0 || depth <= 0 || (shape === "round" && width !== depth)) {
    fail("STANDARD_DEPLOY_MODEL_GEOMETRY_INVALID", String(model?.id || ""));
  }
  return { modelId: model.id, shape, widthMilliInches: width,
    depthMilliInches: depth, rotationDegrees: 0 };
}
function domainFor(ctx) {
  const modelProfiles = ctx.piece.models.map((model) => modelGeometry(ctx.piece, model));
  const core = {
    actionType: "deploy", sideKey: ctx.sideKey, phase: "movement",
    pieceId: ctx.piece.id,
    parameterKind: OFFICIAL_STANDARD_RESERVE_DEPLOY_PARAMETER_KIND,
    executorId: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_RESERVE_DEPLOY_V5_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["leadingModelId", "entrySegmentId",
        "entryAlongEdgeMilliInches", "endpoint", "placements"],
      pathMode: "single_straight_inward_segment",
      coordinateUnit: "milli-inch",
      exactRemainingPlacementCount: modelProfiles.length - 1,
    },
    constraints: {
      modelProfiles, entrySegments: clone(ctx.entry.segments),
      battlefieldWidthMilliInches: milli(ctx.geometry.battlefield.widthInches),
      battlefieldHeightMilliInches: milli(ctx.geometry.battlefield.heightInches),
      maxDistanceMilliInches: milli(ctx.profile.currentDeploySpeedInches),
      coherencyRangeMilliInches: milli(ctx.profile.horizontalCoherencyInches),
      currentSupply: Number(ctx.piece.currentSupply),
      availableSupply: ctx.supply.availableSupplyBySide[ctx.sideKey],
      roundSupplyStateHash: ctx.supply.roundSupplyStateHash,
      actionRouteCatalogueHash: ctx.state.officialActionRouteCatalogue.catalogueHash,
      modelBaseGeometryDataBundleHash: ctx.geometryBundle.bundleHash,
      deploymentGeometryBindingHash: ctx.geometry.bindingHash,
      geometryScope: "official_standard_axis_aligned_straight_entry_current_bases_v1",
    },
    confirmationClass: "direct_gesture",
    rulesTruth: "official_standard_current_unit_reserve_deploy_adapter",
    trainingTruth: false,
  };
  return freezeDeep({ ...core,
    domainId: `sc-domain-${hashStarcraftTmgContract(core)}` });
}
function diagnostic(sideKey, pieceId, error) {
  return {
    actionType: "deploy", sideKey, phase: "movement", pieceId,
    ruleAtomIds: [...OFFICIAL_RESERVE_DEPLOY_V5_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: { adapterId: OFFICIAL_STANDARD_RESERVE_DEPLOY_ADAPTER_ID,
      rulesTruth: "official_standard_reserve_deploy_adapter_fail_closed",
      trainingTruth: false },
  };
}

export function enumerateOfficialStandardReserveDeployV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "");
  const pieces = Array.isArray(state?.pieces) ? state.pieces.filter((piece) => (
    piece?.sideKey === sideKey && piece?.isOnField !== true && live(piece)
  )) : [];
  const candidates = [];
  const parameterDomains = [];
  for (const piece of pieces) {
    try {
      parameterDomains.push(domainFor(context(state, sideKey, piece.id, options)));
    } catch (error) {
      if (options.includeDisabled === true) candidates.push(
        diagnostic(sideKey, String(piece?.id || ""), error));
    }
  }
  return freezeDeep({ candidates, parameterDomains });
}
function selectedSegment(domain, segmentId) {
  const segment = domain.constraints.entrySegments.find((entry) => (
    entry.segmentId === segmentId
  ));
  if (!segment || !["top", "bottom", "left", "right"].includes(segment.side)) {
    fail("STANDARD_DEPLOY_ENTRY_SEGMENT_INVALID", segmentId);
  }
  return segment;
}
function startPoint(segment, along, profile, domain) {
  const halfWidth = Math.round(profile.widthMilliInches / 2);
  const halfDepth = Math.round(profile.depthMilliInches / 2);
  const minimum = milli(segment.startInches);
  const maximum = milli(segment.endInches);
  const edgeHalf = ["top", "bottom"].includes(segment.side) ? halfWidth : halfDepth;
  if (!Number.isSafeInteger(along) || along < minimum + edgeHalf
    || along > maximum - edgeHalf) fail("STANDARD_DEPLOY_ENTRY_POINT_INVALID");
  if (segment.side === "top") return { xMilliInches: along,
    yMilliInches: domain.constraints.battlefieldHeightMilliInches + halfDepth };
  if (segment.side === "bottom") return { xMilliInches: along,
    yMilliInches: -halfDepth };
  if (segment.side === "left") return { xMilliInches: -halfWidth,
    yMilliInches: along };
  return { xMilliInches: domain.constraints.battlefieldWidthMilliInches + halfWidth,
    yMilliInches: along };
}
function validateStraightEndpoint(segment, along, start, endpoint, maxDistance) {
  const fixed = ["top", "bottom"].includes(segment.side)
    ? endpoint.xMilliInches : endpoint.yMilliInches;
  if (fixed !== along) fail("STANDARD_DEPLOY_PATH_MUST_BE_STRAIGHT_INWARD");
  const inward = segment.side === "top" ? endpoint.yMilliInches < start.yMilliInches
    : segment.side === "bottom" ? endpoint.yMilliInches > start.yMilliInches
      : segment.side === "left" ? endpoint.xMilliInches > start.xMilliInches
        : endpoint.xMilliInches < start.xMilliInches;
  const travelled = Math.round(Math.hypot(endpoint.xMilliInches - start.xMilliInches,
    endpoint.yMilliInches - start.yMilliInches));
  if (!inward || travelled <= 0 || travelled > maxDistance) {
    fail("STANDARD_DEPLOY_PATH_EXCEEDS_SPEED_OR_DIRECTION");
  }
  return travelled;
}
function canonicalPlacements(domain, leadingModelId, input) {
  if (!Array.isArray(input)
    || input.length !== domain.constraints.modelProfiles.length - 1) {
    fail("STANDARD_DEPLOY_PLACEMENT_DENOMINATOR_INVALID");
  }
  const remaining = new Set(domain.constraints.modelProfiles.map((entry) => entry.modelId)
    .filter((modelId) => modelId !== leadingModelId));
  const rows = input.map((entry) => {
    const modelId = String(entry?.modelId || "");
    if (!remaining.delete(modelId)) fail("STANDARD_DEPLOY_PLACEMENT_MODEL_INVALID", modelId);
    return { modelId, ...point(entry), rotationDegrees: Number(entry.rotationDegrees || 0) };
  });
  if (remaining.size > 0) fail("STANDARD_DEPLOY_PLACEMENT_DENOMINATOR_INVALID");
  return rows;
}
function placementProjection(state, pieceId, positions) {
  const projected = clone(state);
  const actor = projected.pieces.find((entry) => entry.id === pieceId);
  actor.isOnField = true; actor.isInReserves = false;
  for (const model of actor.models) {
    const position = positions.find((entry) => entry.modelId === model.id);
    model.xInches = inches(position.xMilliInches);
    model.yInches = inches(position.yMilliInches);
    model.baseRotationDegrees = Number(position.rotationDegrees || 0);
    model.isOnField = true;
  }
  return { state: projected, actor };
}
function assertOutsideOpponentZone(state, sideKey, result) {
  const opponentEntries = Object.entries(
    state.officialDeploymentGeometryBinding.entryEdgesByPlayer || {},
  ).filter(([key]) => key !== sideKey).flatMap(([, entry]) => entry.segments || []);
  for (const placement of result.placements) {
    const footprintBounds = bounds(placement.footprint);
    for (const segment of opponentEntries) {
      const rectangle = segment.zoneRectangle;
      const zone = { minX: milli(rectangle.xMin), maxX: milli(rectangle.xMax),
        minY: milli(rectangle.yMin), maxY: milli(rectangle.yMax) };
      if (boundsOverlap(footprintBounds, zone, -TOLERANCE)) {
        fail("STANDARD_DEPLOY_ENEMY_ZONE_OF_INFLUENCE", placement.modelId);
      }
    }
  }
}
function assertLeadingPathClear(state, piece, model, start, endpoint, geometryBundle) {
  const startFootprint = createOfficialModelBaseFootprintV1({ piece, model,
    dataBundle: geometryBundle, position: { ...start, rotationDegrees: 0 } });
  const endFootprint = createOfficialModelBaseFootprintV1({ piece, model,
    dataBundle: geometryBundle, position: { ...endpoint, rotationDegrees: 0 } });
  for (const otherPiece of state.pieces.filter((entry) => active(entry))) {
    for (const otherModel of activeModels(otherPiece)) {
      const blocker = createOfficialModelBaseFootprintV1({ piece: otherPiece,
        model: otherModel, dataBundle: geometryBundle });
      if (sweptCollision(startFootprint, endFootprint, blocker)) {
        fail("STANDARD_DEPLOY_PATH_COLLISION", otherModel.id);
      }
    }
  }
  const sweep = { minX: Math.min(bounds(startFootprint).minX, bounds(endFootprint).minX),
    maxX: Math.max(bounds(startFootprint).maxX, bounds(endFootprint).maxX),
    minY: Math.min(bounds(startFootprint).minY, bounds(endFootprint).minY),
    maxY: Math.max(bounds(startFootprint).maxY, bounds(endFootprint).maxY) };
  for (const terrain of (state.board?.terrain || []).filter((entry) => (
    entry.isRemoved !== true && entry.isDestroyed !== true
      && entry.impassable !== false && entry.blocksMovement !== false
  ))) {
    if (boundsOverlap(sweep, terrainBounds(terrain))) {
      fail("STANDARD_DEPLOY_PATH_TERRAIN_COLLISION", String(terrain.id || ""));
    }
  }
}

export function instantiateOfficialStandardReserveDeployV1(state, domain,
  parameters, options = {}) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_STANDARD_RESERVE_DEPLOY_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_VERSION) {
    fail("STANDARD_DEPLOY_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialStandardReserveDeployV1(state, {
    sideKey: domain.sideKey, includeDisabled: true, matchBinding: options.matchBinding,
  });
  const expected = current.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expected || !isDeepStrictEqual(domain, expected)) {
    fail("STANDARD_DEPLOY_PARAMETER_DOMAIN_STALE");
  }
  const allowed = ["leadingModelId", "entrySegmentId",
    "entryAlongEdgeMilliInches", "endpoint", "placements"];
  if (!object(parameters) || Object.keys(parameters).some((key) => !allowed.includes(key))) {
    fail("STANDARD_DEPLOY_PARAMETERS_INVALID");
  }
  const leadingModelId = String(parameters.leadingModelId || "");
  const modelProfile = domain.constraints.modelProfiles.find((entry) => (
    entry.modelId === leadingModelId
  ));
  const piece = state.pieces.find((entry) => entry.id === domain.pieceId);
  const leadingModel = piece?.models?.find((entry) => entry.id === leadingModelId);
  if (!modelProfile || !leadingModel) fail("STANDARD_DEPLOY_LEADING_MODEL_INVALID");
  const segment = selectedSegment(domain, String(parameters.entrySegmentId || ""));
  const along = Number(parameters.entryAlongEdgeMilliInches);
  const start = startPoint(segment, along, modelProfile, domain);
  const endpoint = point(parameters.endpoint);
  const travelled = validateStraightEndpoint(segment, along, start, endpoint,
    domain.constraints.maxDistanceMilliInches);
  const placements = canonicalPlacements(domain, leadingModelId, parameters.placements);
  const allPositions = [{ modelId: leadingModelId, ...endpoint, rotationDegrees: 0 },
    ...placements];
  assertLeadingPathClear(state, piece, leadingModel, start, endpoint,
    state.officialModelBaseGeometryDataBundle);
  const projected = placementProjection(state, piece.id, allPositions);
  const placementPlan = { planId: `standard-deploy-${hashStarcraftTmgContract({
    pieceId: piece.id, leadingModelId, allPositions,
  }).slice(0, 24)}`, leadingModelId, placements: allPositions,
  currentlyEngagedEnemyUnitIds: [], closestLegalPlacementDenominatorComplete: false };
  const placementResult = evaluateOfficialCoherencyPlacementV1({
    state: projected.state, actor: projected.actor, plan: placementPlan,
    dataBundle: state.officialModelBaseGeometryDataBundle,
    coherencyRangeMilliInches: domain.constraints.coherencyRangeMilliInches,
  });
  assertOutsideOpponentZone(state, domain.sideKey, placementResult);
  const planBody = {
    schemaVersion: OFFICIAL_STANDARD_RESERVE_DEPLOY_PLAN_SCHEMA,
    adapterId: OFFICIAL_STANDARD_RESERVE_DEPLOY_ADAPTER_ID,
    adapterVersion: OFFICIAL_STANDARD_RESERVE_DEPLOY_ADAPTER_VERSION,
    pieceId: piece.id, leadingModelId, entrySegmentId: segment.segmentId,
    entryAlongEdgeMilliInches: along,
    canonicalPath: { schemaVersion: "starcraft_tmg_axis_aligned_path_v1",
      unit: "milli-inch", points: [start, endpoint], distanceMilliInches: travelled },
    placementSequence: placements, finalModelPositions: allPositions,
    speedAllowanceInches: domain.constraints.maxDistanceMilliInches / 1000,
    currentSupply: domain.constraints.currentSupply,
    availableSupplyBefore: domain.constraints.availableSupply,
    roundSupplyStateHashBefore: domain.constraints.roundSupplyStateHash,
    coherencyPlacementResultHash: placementResult.resultHash,
    coherencyRangeMilliInches: placementResult.coherencyRangeMilliInches,
    geometryScope: domain.constraints.geometryScope,
    productionRoomEligible: false, trainingTruth: false,
  };
  const deployPlan = freezeDeep({ ...planBody,
    deployPlanHash: hashStarcraftTmgContract(planBody) });
  const action = freezeDeep({ actionType: "deploy", sideKey: domain.sideKey,
    phase: "movement", pieceId: domain.pieceId, deployPlan,
    ruleAtomIds: [...OFFICIAL_RESERVE_DEPLOY_V5_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_VERSION });
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: clone(parameters), action,
    rulesTruth: "official_standard_current_unit_reserve_deploy_instantiation",
    trainingTruth: false,
  });
}

export function applyOfficialStandardReserveDeployV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput) || actionInput.actionType !== "deploy"
    || actionInput.executorId !== OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_VERSION
    || actionInput.deployPlan?.schemaVersion
      !== OFFICIAL_STANDARD_RESERVE_DEPLOY_PLAN_SCHEMA) {
    fail("STANDARD_DEPLOY_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialStandardReserveDeployV1(stateInput, {
    sideKey: actionInput.sideKey, includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.pieceId === actionInput.pieceId
  ));
  if (!domain) fail("STANDARD_DEPLOY_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialStandardReserveDeployV1(stateInput, domain, {
    leadingModelId: actionInput.deployPlan.leadingModelId,
    entrySegmentId: actionInput.deployPlan.entrySegmentId,
    entryAlongEdgeMilliInches: actionInput.deployPlan.entryAlongEdgeMilliInches,
    endpoint: actionInput.deployPlan.canonicalPath.points.at(-1),
    placements: actionInput.deployPlan.placementSequence,
  }, options);
  if (!isDeepStrictEqual(actionInput, instantiated.action)) {
    fail("STANDARD_DEPLOY_ACTION_STALE");
  }
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const positions = new Map(actionInput.deployPlan.finalModelPositions.map((entry) => (
    [entry.modelId, entry]
  )));
  for (const model of piece.models) {
    const position = positions.get(model.id);
    model.xInches = inches(position.xMilliInches);
    model.yInches = inches(position.yMilliInches);
    model.baseRotationDegrees = Number(position.rotationDegrees || 0);
    model.isOnField = true;
  }
  piece.xInches = inches(positions.get(actionInput.deployPlan.leadingModelId).xMilliInches);
  piece.yInches = inches(positions.get(actionInput.deployPlan.leadingModelId).yMilliInches);
  piece.isOnField = true; piece.isInReserves = false;
  piece.deploymentStatus = "deployed";
  piece.statuses = (piece.statuses || []).filter((status) => status !== "stationary");
  piece.activatedPhases = { ...(piece.activatedPhases || {}), movement: true };
  piece.inCoherency = true;
  piece.coherencyStatus = { schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
    status: "in_coherency", isOutOfCoherency: false,
    coherencyRangeMilliInches: actionInput.deployPlan.coherencyRangeMilliInches };
  piece.lastLeadingModelId = actionInput.deployPlan.leadingModelId;
  piece.lastDeployPlanHash = actionInput.deployPlan.deployPlanHash;
  const before = state.officialRoundSupplyState.roundSupplyStateHash;
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    gameplayDataBundle: state.officialGameplayDataBundle,
    rulesRuntimeHash: runtimeHash(options.matchBinding) });
  if (state.reserveManifestBySide?.[piece.sideKey]) {
    const row = state.reserveManifestBySide[piece.sideKey].find((entry) => (
      entry.pieceId === piece.id
    ));
    if (row) row.deploymentStatus = "deployed";
  }
  const events = [{ type: "reserve_deployed", sideKey: piece.sideKey,
    pieceId: piece.id, leadingModelId: actionInput.deployPlan.leadingModelId,
    deployPlanHash: actionInput.deployPlan.deployPlanHash,
    roundSupplyStateHashBefore: before,
    roundSupplyStateHashAfter: state.officialRoundSupplyState.roundSupplyStateHash,
    currentSupply: piece.currentSupply, stationaryRemoved: true,
    movementActivated: true, inCoherency: true,
    adapterId: OFFICIAL_STANDARD_RESERVE_DEPLOY_ADAPTER_ID,
    trainingTruth: false }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: "movement", action: clone(actionInput), events: clone(events) });
  return freezeDeep({ ok: true,
    schemaVersion: "starcraft_tmg_official_standard_reserve_deploy_transition_v1",
    executorId: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_VERSION,
    adapterId: OFFICIAL_STANDARD_RESERVE_DEPLOY_ADAPTER_ID,
    postRevision: Number(options.postRevision || 0), state, events,
    action: clone(actionInput),
    rulesTruth: "official_standard_current_unit_reserve_deploy_exact_bounded_adapter",
    productionRoomEligible: false, trainingTruth: false });
}
