import { isDeepStrictEqual } from "node:util";
import {remainingOfficialSelectedRosterSpatialModelIdsV1} from './official-selected-roster-spatial-parameter-contract-v1.mjs';

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { OFFICIAL_ASSAULT_RUN_ACTION_ATOM_IDS } from
  "../rule-atoms/official-assault-run-executor-v1.mjs";
import { OFFICIAL_DISENGAGE_CASUALTY_ACTION_ATOM_IDS } from
  "../rule-atoms/official-disengage-casualty-executor-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "../rule-atoms/official-engagement-graph-v2.mjs";
import {
  createOfficialModelBaseFootprintV1,
  createOfficialPhysicalFootprintV1,
  evaluateOfficialCoherencyPlacementV1,
  evaluateOfficialPhysicalFootprintRelationV1,
  evaluateOfficialSweptPhysicalFootprintCollisionV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { deriveOfficialSemanticSurfaceSupportV1 } from
  "../rule-atoms/official-semantic-surface-support-v1.mjs";
import { projectOfficialContextualSupplyValueV1 } from
  "../rule-atoms/official-contextual-supply-projection-v1.mjs";
import { OFFICIAL_RESERVE_DEPLOY_V5_ACTION_ATOM_IDS } from
  "../rule-atoms/official-reserve-deploy-executor-v5.mjs";
import { OFFICIAL_STANDARD_MOVE_V5_ACTION_ATOM_IDS } from
  "../rule-atoms/official-standard-move-executor-v5.mjs";
import { verifyOfficialModelBaseGeometryDataBundleV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { getOfficialSummonedUnitProfileV1 } from
  "../source-data/official-summon-data-bundle-v1.mjs";
import { verifyOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";
import { getOfficialUnitCardSupplyProfileV1 } from
  "../source-data/official-unit-card-supply-data-bundle-v1.mjs";
import { verifyOfficialStandardActionRouteCatalogueV1 } from
  "./official-standard-action-route-catalogue-v1.mjs";
import {
  assertOfficialSelectedRosterCoreActionWindowV1,
  openOfficialSelectedRosterAfterActionWindowV1,
  resolveOfficialSelectedRosterAbilityModifiersV1,
} from "./official-selected-roster-ability-runtime-v1.mjs";
import { projectOfficialBattlefieldAssetFamilyModifiersV1 } from
  "./official-battlefield-asset-family-adapter-v1.mjs";
import { resolveOfficialLogicalGrassRemovalV1 } from
  "./official-logical-terrain-groups-v1.mjs";
import { resolveOfficialLogicalTerrainSurfaceCoverageV1 } from
  "./official-logical-terrain-surface-geometry-v1.mjs";
import { officialRectangleUnionCoversBasesV1 } from
  "../rule-atoms/official-footprint-rectangle-union-geometry-v1.mjs";

export const OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID =
  "starcraft-tmg-official-selected-roster-spatial-action-runtime-v1";
export const OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION = "1.6.0";
export const OFFICIAL_SELECTED_ROSTER_SPATIAL_PARAMETER_KIND =
  "official_selected_roster_spatial_path_v1";
export const OFFICIAL_SELECTED_ROSTER_SPATIAL_PLAN_SCHEMA =
  "starcraft_tmg_official_selected_roster_spatial_plan_v1";

const ACTION_TYPES = Object.freeze(["deploy", "move", "run", "disengage"]);
const MOVEMENT_ACTION_TYPES = new Set([
  "move", "run", "disengage", "charge", "close_ranks",
]);
const SIDE_KEYS = new Set(["player1", "player2"]);
const TOLERANCE = 1;
const MAX_RAW_PATH_POINTS = 64;
const MAX_CANONICAL_PATH_POINTS = 32;

// Exact object identity only: never reuse domains across revisions, rooms or
// mutable caller state. Weak ownership does not retain completed Room graphs.
const immutableSpatialRecords = new WeakSet();
const spatialEnumerationByState = new WeakMap();
const verifiedSpatialStates = new WeakSet();
const terrainFootprintsByRecord = new WeakMap();
const physicalBoundsByFootprint = new WeakMap();
function deeplyImmutableSpatialRecord(value, visiting = new WeakSet()) {
  if (value === null || value === undefined) return true;
  if (typeof value !== "object") return ["string", "boolean"].includes(typeof value)
    || (typeof value === "number" && Number.isFinite(value));
  if (immutableSpatialRecords.has(value)) return true;
  if (!Object.isFrozen(value) || visiting.has(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value) ? prototype !== Array.prototype
    : prototype !== Object.prototype && prototype !== null) return false;
  visiting.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || !descriptor || !("value" in descriptor)
      || !deeplyImmutableSpatialRecord(descriptor.value, visiting)) {
      visiting.delete(value);
      return false;
    }
  }
  visiting.delete(value);
  immutableSpatialRecords.add(value);
  return true;
}
function spatialEnumerationKey(state, options) {
  if (!object(options) || ![Object.prototype, null].includes(
    Object.getPrototypeOf(options))) return null;
  for (const key of ["sideKey", "includeDisabled"]) {
    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (descriptor && !("value" in descriptor)) return null;
  }
  if (options.sideKey !== undefined && typeof options.sideKey !== "string") return null;
  if (options.includeDisabled !== undefined
    && typeof options.includeDisabled !== "boolean") return null;
  return `${String(options.sideKey || state.activeSideKey)}:${options.includeDisabled === true}`;
}

const ATOMS_BY_ACTION = Object.freeze({
  deploy: OFFICIAL_RESERVE_DEPLOY_V5_ACTION_ATOM_IDS,
  move: OFFICIAL_STANDARD_MOVE_V5_ACTION_ATOM_IDS,
  run: OFFICIAL_ASSAULT_RUN_ACTION_ATOM_IDS,
  disengage: OFFICIAL_DISENGAGE_CASUALTY_ACTION_ATOM_IDS,
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
function milli(value, code = "SELECTED_SPATIAL_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}
function inches(value) { return Number((Number(value) / 1000).toFixed(3)); }
function point(value, code = "SELECTED_SPATIAL_POINT_INVALID", detail = "") {
  const xMilliInches = Number(value?.xMilliInches);
  const yMilliInches = Number(value?.yMilliInches);
  if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches)) {
    fail(code, detail);
  }
  return { xMilliInches, yMilliInches };
}
function elevation(value) {
  const normalized = String(value || "ground").toLowerCase();
  if (normalized === "ground_level") return "ground";
  if (!new Set(["ground", "mid", "high"]).has(normalized)) {
    fail("SELECTED_SPATIAL_ELEVATION_INVALID", normalized);
  }
  return normalized;
}
function distance(left, right) {
  return Math.hypot(right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches);
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
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function livePiece(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}
function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}
function modelPoint(model) {
  return { xMilliInches: milli(model?.xInches,
    "SELECTED_SPATIAL_MODEL_POSITION_INVALID", String(model?.id || "")),
  yMilliInches: milli(model?.yInches,
    "SELECTED_SPATIAL_MODEL_POSITION_INVALID", String(model?.id || "")) };
}
function modelRadius(model) {
  const width = milli(model?.baseWidthInches,
    "SELECTED_SPATIAL_BASE_INVALID", String(model?.id || ""));
  const depth = milli(model?.baseDepthInches,
    "SELECTED_SPATIAL_BASE_INVALID", String(model?.id || ""));
  const shape = String(model?.baseShape || "").toLowerCase();
  if (width <= 0 || depth <= 0
    || !new Set(["round", "rectangle"]).has(shape)
    || (shape === "round" && Math.abs(width - depth) > TOLERANCE)) {
    fail("SELECTED_SPATIAL_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
  // Continuous segment/obstacle checks use the circumscribed radius for the
  // one official rectangular base. This is conservative (no false legal
  // path); endpoint placement/coherency remains exact polygon geometry in the
  // official model-base kernel below.
  return shape === "round"
    ? Math.round(width / 2)
    : Math.ceil(Math.hypot(width, depth) / 2);
}
function modelHalfExtents(model, rotationDegrees = 0) {
  const width = milli(model?.baseWidthInches,
    "SELECTED_SPATIAL_BASE_INVALID", String(model?.id || ""));
  const depth = milli(model?.baseDepthInches,
    "SELECTED_SPATIAL_BASE_INVALID", String(model?.id || ""));
  const shape = String(model?.baseShape || "").toLowerCase();
  if (shape === "round") {
    const radius = modelRadius(model);
    return { x: radius, y: radius };
  }
  if (shape !== "rectangle" || width <= 0 || depth <= 0) {
    fail("SELECTED_SPATIAL_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
  const angle = (canonicalRotation(rotationDegrees) * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(angle));
  const sine = Math.abs(Math.sin(angle));
  return {
    x: ((width / 2) * cosine) + ((depth / 2) * sine),
    y: ((width / 2) * sine) + ((depth / 2) * cosine),
  };
}
function verifyDeclaredBase(model) {
  const width = milli(model?.baseWidthInches,
    "SELECTED_SPATIAL_BASE_INVALID", String(model?.id || ""));
  const depth = milli(model?.baseDepthInches,
    "SELECTED_SPATIAL_BASE_INVALID", String(model?.id || ""));
  const shape = String(model?.baseShape || "").toLowerCase();
  if (width <= 0 || depth <= 0 || !["round", "rectangle"].includes(shape)
    || (shape === "round" && Math.abs(width - depth) > TOLERANCE)) {
    fail("SELECTED_SPATIAL_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
}
function canonicalRotation(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) fail("SELECTED_SPATIAL_ROTATION_INVALID");
  return Number((((parsed % 360) + 360) % 360).toFixed(6));
}
function terrainRectangle(terrain) {
  const raw = terrain?.footprint || terrain;
  const minX = Number(raw?.minXMilliInches);
  const maxX = Number(raw?.maxXMilliInches);
  const minY = Number(raw?.minYMilliInches);
  const maxY = Number(raw?.maxYMilliInches);
  if (raw?.shape !== "axis_aligned_rectangle"
    || ![minX, maxX, minY, maxY].every(Number.isSafeInteger)
    || minX >= maxX || minY >= maxY) {
    fail("SELECTED_SPATIAL_TERRAIN_GEOMETRY_INVALID", String(terrain?.id || ""));
  }
  return { minX, maxX, minY, maxY };
}
function terrainPhysicalFootprints(terrain) {
  const cached = terrainFootprintsByRecord.get(terrain);
  if (cached) return cached;
  const footprints = (terrain.footprintCells || [terrain.footprint]).map((footprint, index) =>
    terrainPhysicalFootprint({ ...terrain, id: `${terrain.id}:geometry-${index}`, footprint }));
  if (deeplyImmutableSpatialRecord(terrain)) {
    terrainFootprintsByRecord.set(terrain, Object.freeze(footprints));
  }
  return footprints;
}
function terrainPhysicalFootprint(terrain) {
  const rectangle = terrainRectangle(terrain);
  return createOfficialPhysicalFootprintV1({
    objectId: String(terrain.id || "terrain"),
    kind: "terrain",
    shape: "rectangle",
    center: {
      xMilliInches: Math.round((rectangle.minX + rectangle.maxX) / 2),
      yMilliInches: Math.round((rectangle.minY + rectangle.maxY) / 2),
    },
    widthMilliInches: rectangle.maxX - rectangle.minX,
    depthMilliInches: rectangle.maxY - rectangle.minY,
    rotationDegrees: 0,
  });
}
function modelFootprintAt(state, piece, model, value) {
  return createOfficialModelBaseFootprintV1({
    piece,
    model,
    dataBundle: state.officialModelBaseGeometryDataBundle,
    position: {
      xMilliInches: value.xMilliInches,
      yMilliInches: value.yMilliInches,
      rotationDegrees: value.rotationDegrees ?? model.baseRotationDegrees ?? 0,
    },
  });
}
// Private boolean broad phase only. Public exact Kernel results and their
// hashes are never approximated. Every argument here is a constructed physical
// footprint; malformed/unsupported or non-rigid inputs still reach the Kernel.
function physicalBounds(footprint) {
  const cached = physicalBoundsByFootprint.get(footprint);
  if (cached) return cached;
  let bounds;
  if (footprint.shape === "round") {
    const { xMilliInches: x, yMilliInches: y } = footprint.center;
    const r = footprint.radiusMilliInches;
    bounds = { minX: x - r, maxX: x + r, minY: y - r, maxY: y + r };
  } else if (footprint.shape === "rectangle" && footprint.vertices?.length === 4) {
    const xs = footprint.vertices.map(p => p.xMilliInches);
    const ys = footprint.vertices.map(p => p.yMilliInches);
    bounds = { minX: Math.min(...xs), maxX: Math.max(...xs),
      minY: Math.min(...ys), maxY: Math.max(...ys) };
  }
  if (!bounds || !Object.values(bounds).every(Number.isFinite)) return null;
  if (deeplyImmutableSpatialRecord(footprint)) physicalBoundsByFootprint.set(footprint, bounds);
  return bounds;
}
function boundsMayTouch(left, right) {
  return !left || !right || (left.minX <= right.maxX + TOLERANCE
    && left.maxX >= right.minX - TOLERANCE
    && left.minY <= right.maxY + TOLERANCE
    && left.maxY >= right.minY - TOLERANCE);
}
function sweptFootprintsCollide(input) {
  const { movingStart: start, movingEnd: end, blocker } = input;
  if (start.shape === end.shape && start.widthMilliInches === end.widthMilliInches
    && start.depthMilliInches === end.depthMilliInches
    && ["round", "rectangle"].includes(start.shape)) {
    const radius = start.shape === "round" ? start.radiusMilliInches
      : Math.ceil(Math.hypot(start.widthMilliInches, start.depthMilliInches) / 2);
    const sweepBounds = {
      minX: Math.min(start.center.xMilliInches, end.center.xMilliInches) - radius,
      maxX: Math.max(start.center.xMilliInches, end.center.xMilliInches) + radius,
      minY: Math.min(start.center.yMilliInches, end.center.yMilliInches) - radius,
      maxY: Math.max(start.center.yMilliInches, end.center.yMilliInches) + radius,
    };
    if (Object.values(sweepBounds).every(Number.isFinite)
      && !boundsMayTouch(sweepBounds, physicalBounds(blocker))) return false;
  }
  return evaluateOfficialSweptPhysicalFootprintCollisionV1(input).collides;
}
function physicalInteriorsOverlap(left, right) {
  return boundsMayTouch(physicalBounds(left), physicalBounds(right))
    && evaluateOfficialPhysicalFootprintRelationV1({ left, right }).overlappingInteriors;
}
function physicalSeparationWithinTolerance(left, right) {
  return boundsMayTouch(physicalBounds(left), physicalBounds(right))
    && evaluateOfficialPhysicalFootprintRelationV1({ left, right })
      .minimumSeparationMilliInches <= TOLERANCE;
}
function pathSweepsFootprint(state, piece, model, points, blocker) {
  return points.slice(1).some((entry, index) => (
    sweptFootprintsCollide({
      movingStart: modelFootprintAt(state, piece, model, points[index]),
      movingEnd: modelFootprintAt(state, piece, model, entry),
      blocker,
    })
  ));
}
function footprintWhollyInsideRectangle(footprint, rectangle) {
  if (footprint.shape === "round") {
    return footprint.center.xMilliInches - footprint.radiusMilliInches
        >= rectangle.minX - TOLERANCE
      && footprint.center.xMilliInches + footprint.radiusMilliInches
        <= rectangle.maxX + TOLERANCE
      && footprint.center.yMilliInches - footprint.radiusMilliInches
        >= rectangle.minY - TOLERANCE
      && footprint.center.yMilliInches + footprint.radiusMilliInches
        <= rectangle.maxY + TOLERANCE;
  }
  return footprint.vertices.every((entry) => (
    entry.xMilliInches >= rectangle.minX - TOLERANCE
      && entry.xMilliInches <= rectangle.maxX + TOLERANCE
      && entry.yMilliInches >= rectangle.minY - TOLERANCE
      && entry.yMilliInches <= rectangle.maxY + TOLERANCE
  ));
}
function segmentIntersectsRectangle(start, end, rectangle, expansion = 0) {
  const minX = rectangle.minX - expansion;
  const maxX = rectangle.maxX + expansion;
  const minY = rectangle.minY - expansion;
  const maxY = rectangle.maxY + expansion;
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  let from = 0;
  let to = 1;
  for (const [direction, offset] of [
    [-dx, start.xMilliInches - minX],
    [dx, maxX - start.xMilliInches],
    [-dy, start.yMilliInches - minY],
    [dy, maxY - start.yMilliInches],
  ]) {
    if (direction === 0) {
      if (offset < 0) return false;
      continue;
    }
    const ratio = offset / direction;
    if (direction < 0) from = Math.max(from, ratio);
    else to = Math.min(to, ratio);
    if (from > to) return false;
  }
  return to >= 0 && from <= 1;
}
function segmentBlockedByTerrain(start, end, terrain) {
  return (terrain.footprintCells || [terrain.footprint]).some(footprint =>
    segmentIntersectsRectangle(start, end, terrainRectangle({ ...terrain, footprint }), 0));
}
function pointRectangleDistance(value, rectangle) {
  const x = Math.max(rectangle.minX, Math.min(value.xMilliInches, rectangle.maxX));
  const y = Math.max(rectangle.minY, Math.min(value.yMilliInches, rectangle.maxY));
  return Math.hypot(value.xMilliInches - x, value.yMilliInches - y);
}
function baseWhollyInsideRectangle(value, radius, rectangle) {
  return value.xMilliInches - radius >= rectangle.minX - TOLERANCE
    && value.xMilliInches + radius <= rectangle.maxX + TOLERANCE
    && value.yMilliInches - radius >= rectangle.minY - TOLERANCE
    && value.yMilliInches + radius <= rectangle.maxY + TOLERANCE;
}
function adjacentAccessPointIdsFor(state, model, placement) {
  const radius = modelRadius(model);
  return (state.board.specialTerrainAgreement?.terrainEntries || []).flatMap((entry) => (
    (entry.accessPoints || []).filter((accessPoint) => (
      (accessPoint.connects || []).includes(placement.elevation)
        && pointRectangleDistance(placement,
          terrainRectangle({ id: accessPoint.accessPointId,
            footprint: accessPoint.footprint })) <= radius + TOLERANCE
    )).map((accessPoint) => accessPoint.accessPointId)
  )).sort();
}
function hasSharedAccessPoint(left, right) {
  if (elevation(left.elevation) === elevation(right.elevation)) return true;
  if ([elevation(left.elevation), elevation(right.elevation)].sort().join(":")
    === "ground:high") return false;
  const rightIds = new Set(right.adjacentAccessPointIds || []);
  return (left.adjacentAccessPointIds || []).some((id) => rightIds.has(id));
}
function engagementSnapshot(state, actor) {
  if (!activePiece(actor)) return { enemyUnitIds: [], modelEdges: [] };
  const graph = deriveOfficialEngagementGraphV2(state);
  const modelEdges = graph.modelEdges.filter((edge) => (
    edge.leftUnitId === actor.id || edge.rightUnitId === actor.id
  )).map((edge) => edge.leftUnitId === actor.id ? {
    ownModelId: edge.leftModelId,
    enemyModelId: edge.rightModelId,
    enemyUnitId: edge.rightUnitId,
    baseGapMilliInches: edge.horizontalBaseGapMilliInches,
  } : {
    ownModelId: edge.rightModelId,
    enemyModelId: edge.leftModelId,
    enemyUnitId: edge.leftUnitId,
    baseGapMilliInches: edge.horizontalBaseGapMilliInches,
  });
  const enemyUnitIds = [...new Set(modelEdges.map((edge) => edge.enemyUnitId))].sort();
  return freezeDeep({ enemyUnitIds,
    modelEdges: modelEdges.sort((left, right) => (
      `${left.ownModelId}:${left.enemyModelId}`
        .localeCompare(`${right.ownModelId}:${right.enemyModelId}`)
    )), engagementGraphHash: graph.graphHash,
    engagementHash: hashStarcraftTmgContract({ actorUnitId: actor.id,
      enemyUnitIds, modelEdges, engagementGraphHash: graph.graphHash }) });
}
function routeProfile(state, piece) {
  const unit = state.officialActionRouteCatalogue.units.find((entry) => (
    entry.pieceId === piece.id
  ));
  if (unit && unit.recordKey === piece.officialUnitRecordKey
    && unit.sourceRecordHash === piece.sourceRecordHash
    && unit.payloadHash === piece.officialPayloadHash) return unit;
  if (piece.isSummoned !== true
    || piece.includedInArmyListDuringArmyBuilding !== false) {
    fail("SELECTED_SPATIAL_ACTION_ROUTE_PROFILE_STALE", piece.id);
  }
  const summoned = getOfficialSummonedUnitProfileV1(
    state.officialSummonDataBundle, piece.officialUnitRecordKey);
  const card = getOfficialUnitCardSupplyProfileV1(
    state.officialUnitCardSupplyDataBundle, piece.officialUnitRecordKey);
  if (summoned.sourceRecordHash !== piece.sourceRecordHash
    || summoned.payloadHash !== piece.officialPayloadHash
    || summoned.unitCardSupplyProfileHash !== card.profileHash
    || card.speed.canMoveOrBeRepositioned !== true) {
    fail("SELECTED_SPATIAL_SUMMONED_ROUTE_PROFILE_STALE", piece.id);
  }
  return freezeDeep({
    pieceId: piece.id,
    sideKey: piece.sideKey,
    recordKey: piece.officialUnitRecordKey,
    unitName: summoned.unitName,
    sourceRecordHash: summoned.sourceRecordHash,
    payloadHash: summoned.payloadHash,
    modelCount: Number(piece.currentModels),
    movementProfile: {
      sourceValue: card.speed.printedValue,
      multiModelSpeedInches: card.speed.multiModelInches,
      singleModelSpeedInches: card.speed.singleModelInches,
      currentDeploySpeedInches: Number(piece.currentModels) > 1
        ? card.speed.multiModelInches : card.speed.singleModelInches,
      horizontalCoherencyInches:
        Number(state.officialSummonDataBundle.ruleConstants
          .coherencyRangeMilliInches) / 1000,
      horizontalCoherencySource: "official_summon_rule_constants",
    },
    routes: [],
    dynamicSummonedUnitProfile: true,
    trainingTruth: false,
  });
}
function exactSpeed(state, piece, profile, modelCount) {
  const printed = modelCount === 1
    ? profile.movementProfile.singleModelSpeedInches
    : profile.movementProfile.multiModelSpeedInches;
  const modifiers = resolveOfficialSelectedRosterAbilityModifiersV1(state, piece, {
    actionType: "movement",
  });
  const battlefield = state.officialBattlefieldAssetFamilySourceBundle
    ? projectOfficialBattlefieldAssetFamilyModifiersV1(
      state.officialBattlefieldAssetFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: "movement" } },
    ) : {};
  return printed + Math.max(Number(modifiers.speedModifier || 0),
    Number(battlefield.speedModifier || 0));
}
function modelProfiles(piece) {
  return activePiece(piece) ? activeModels(piece).map((model) => ({
    modelId: model.id, baseShape: model.baseShape,
    baseWidthMilliInches: milli(model.baseWidthInches),
    baseDepthMilliInches: milli(model.baseDepthInches),
    startPoint: modelPoint(model), startElevation: elevation(model.elevation),
    supportTerrainIds: [...new Set(model.supportTerrainIds || [])].sort(),
  })) : piece.models.filter((model) => model.isDestroyed !== true).map((model) => ({
    modelId: model.id, baseShape: model.baseShape,
    baseWidthMilliInches: milli(model.baseWidthInches),
    baseDepthMilliInches: milli(model.baseDepthInches),
    startPoint: null, startElevation: "ground", supportTerrainIds: [],
  }));
}
function verifyRuntimeState(state) {
  if (verifiedSpatialStates.has(state)) return;
  if (!object(state) || !Array.isArray(state.pieces) || !object(state.board)
    || !["Skirmish", "Standard"].includes(state.engagementScale)
    || !SIDE_KEYS.has(state.activeSideKey)
    || state.gameOver === true || state.terminal === true) {
    fail("SELECTED_SPATIAL_STATE_INVALID");
  }
  verifyOfficialStandardActionRouteCatalogueV1(state.officialActionRouteCatalogue);
  verifyOfficialModelBaseGeometryDataBundleV1(state.officialModelBaseGeometryDataBundle);
  verifyOfficialTerrainLosDataBundleV1(state.officialTerrainLosDataBundle);
  const live = state.pieces.filter(livePiece);
  if (live.length < 1) {
    fail("SELECTED_SPATIAL_ROSTER_SCOPE_INVALID");
  }
  for (const piece of live) {
    if (piece.isStructure !== true) routeProfile(state, piece);
    if (!Array.isArray(piece.models)
      || activeModels(piece).length !== (activePiece(piece) ? Number(piece.currentModels) : 0)) {
      fail("SELECTED_SPATIAL_MODEL_DENOMINATOR_INVALID", piece.id);
    }
    for (const model of piece.models.filter((entry) => entry.isDestroyed !== true)) {
      verifyDeclaredBase(model);
    }
  }
  const expectedBattlefield = state.engagementScale === "Standard"
    ? [54000, 36000] : [36000, 36000];
  if (milli(state.board.widthInches) !== expectedBattlefield[0]
    || milli(state.board.heightInches) !== expectedBattlefield[1]
    || !object(state.board.specialTerrainAgreement)) {
    fail("SELECTED_SPATIAL_BOARD_SCOPE_INVALID");
  }
  if (deeplyImmutableSpatialRecord(state)) verifiedSpatialStates.add(state);
}
function phaseReady(state, sideKey, actionType) {
  const phase = actionType === "run" ? "assault" : "movement";
  if (state.phase !== phase || state.activeSideKey !== sideKey
    || state.players?.[sideKey]?.passedPhases?.[phase] === true) {
    fail("SELECTED_SPATIAL_PHASE_UNAVAILABLE", `${sideKey}:${actionType}`);
  }
  const choice = state.phaseFirstActorByRound?.[`${state.round}:${phase}`];
  if (!object(choice) || choice.round !== Number(state.round)
    || choice.phase !== phase || !SIDE_KEYS.has(choice.chosenFirstActorSideKey)) {
    fail("SELECTED_SPATIAL_PHASE_INITIATIVE_UNRESOLVED", phase);
  }
}
function effectiveDisengageSupply(state, piece) {
  return projectOfficialContextualSupplyValueV1({ state, pieceId: piece.id,
    context: "disengage_check" }).effectiveSupply;
}
function supplyAvailable(state, sideKey) {
  const capacity = Number(
    state.officialRoundSupplyState?.supplyPoolBySide?.[sideKey]
      ?? state.players?.[sideKey]?.supply
      ?? 0,
  );
  const committed = state.pieces.filter((piece) => (
    piece.sideKey === sideKey && activePiece(piece)
  )).reduce((sum, piece) => sum + projectOfficialContextualSupplyValueV1({
    state, pieceId: piece.id, context: "supply_pool_calculation",
  }).effectiveSupply, 0);
  return { capacity, committed, available: Math.max(0, capacity - committed) };
}
// Read ports use the EXACT deployment validator calculation, even when the
// selected seat currently has no enabled deploy domain. No second calculator.
export {supplyAvailable as projectOfficialSelectedRosterDeploymentSupplyV1};
function actionContext(state, sideKey, piece, actionType) {
  phaseReady(state, sideKey, actionType);
  if (!piece || piece.sideKey !== sideKey || !livePiece(piece)) {
    fail("SELECTED_SPATIAL_UNIT_UNAVAILABLE", String(piece?.id || ""));
  }
  if (piece.isStructure === true) {
    fail("SELECTED_SPATIAL_STRUCTURE_CANNOT_PERFORM_ACTIONS", piece.id);
  }
  if (piece.activatedPhases?.[actionType === "run" ? "assault" : "movement"] === true) {
    fail("SELECTED_SPATIAL_UNIT_ALREADY_ACTIVATED", piece.id);
  }
  assertOfficialSelectedRosterCoreActionWindowV1(state, sideKey, piece.id,
    actionType === "run" ? "assault" : "movement");
  const engagement = engagementSnapshot(state, piece);
  if (actionType === "deploy") {
    if (piece.isOnField === true || piece.isInReserves !== true) {
      fail("SELECTED_SPATIAL_DEPLOY_REQUIRES_RESERVE", piece.id);
    }
    const supply = supplyAvailable(state, sideKey);
    const requestedSupply = projectOfficialContextualSupplyValueV1({ state,
      pieceId: piece.id, context: "supply_pool_calculation" }).effectiveSupply;
    if (requestedSupply > supply.available) {
      fail("SELECTED_SPATIAL_DEPLOY_SUPPLY_UNAVAILABLE", piece.id);
    }
  } else {
    if (!activePiece(piece)) fail("SELECTED_SPATIAL_ACTION_REQUIRES_BATTLEFIELD", piece.id);
    if (actionType === "disengage" && engagement.enemyUnitIds.length === 0) {
      fail("SELECTED_SPATIAL_DISENGAGE_REQUIRES_ENGAGEMENT", piece.id);
    }
    if (actionType !== "disengage" && engagement.enemyUnitIds.length > 0) {
      fail("SELECTED_SPATIAL_ENGAGED_ACTION_PROHIBITED", piece.id);
    }
    if (actionType === "run" && piece.activatedPhases?.movement !== true) {
      fail("SELECTED_SPATIAL_RUN_REQUIRES_MOVEMENT_ACTIVATION", piece.id);
    }
  }
  return { profile: routeProfile(state, piece), engagement };
}
function entrySegments(state, sideKey) {
  const segments = state.officialDeploymentGeometryBinding
    ?.entryEdgesByPlayer?.[sideKey]?.segments;
  if (!Array.isArray(segments) || segments.length < 1) {
    fail("SELECTED_SPATIAL_ENTRY_EDGE_UNAVAILABLE", sideKey);
  }
  return clone(segments);
}
function postDisengageRestriction(state, piece, engagement) {
  const enemySupplyByUnit = Object.fromEntries(engagement.enemyUnitIds.map((unitId) => {
    const enemy = state.pieces.find((entry) => entry.id === unitId);
    return [unitId, effectiveDisengageSupply(state, enemy)];
  }));
  const ownEffectiveSupply = effectiveDisengageSupply(state, piece);
  const combinedEnemyEffectiveSupply = Object.values(enemySupplyByUnit)
    .reduce((sum, value) => sum + value, 0);
  const tacticalMass = ownEffectiveSupply > combinedEnemyEffectiveSupply;
  const modifiers = resolveOfficialSelectedRosterAbilityModifiersV1(state, piece, {
    actionType: "disengage",
  });
  const ignoresPenalty = modifiers.ignoreDisengagePenalty;
  return seal({
    schema: "starcraft_tmg_official_post_disengage_assault_restriction_v2",
    semanticVersion: "2.0.0", declaredRound: Number(state.round),
    appliesToPhase: "assault", engagedEnemyUnitIds: engagement.enemyUnitIds,
    enemyEffectiveSupplyByUnit: enemySupplyByUnit, ownEffectiveSupply,
    combinedEnemyEffectiveSupply, commanderModifierIncluded: true,
    tacticalMass, rangedAttackProhibited: !tacticalMass && !ignoresPenalty,
    chargeProhibited: !tacticalMass && !ignoresPenalty,
    disengagePenaltyIgnoredByActiveAbility: ignoresPenalty,
    evaluatedAtDeclaration: true,
    rulesTruth: "official_selected_roster_disengage_tactical_mass",
    trainingTruth: false,
  }, "restrictionHash");
}
function domainFor(state, sideKey, piece, actionType, context) {
  const profiles = modelProfiles(piece);
  const speed = exactSpeed(state, piece, context.profile, Number(piece.currentModels));
  const supply = supplyAvailable(state, sideKey);
  const core = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_SPATIAL_PARAMETER_KIND,
    actionType, sideKey, phase: actionType === "run" ? "assault" : "movement",
    pieceId: piece.id,
    executorId: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION,
    ruleAtomIds: [...ATOMS_BY_ACTION[actionType]],
    parameterSchema: {
      type: "object",
      required: actionType === "deploy"
        ? ["leadingModelId", "entrySegmentId", "entryAlongEdgeMilliInches", "path", "placements"]
        : ["leadingModelId", "path", "placements"],
      coordinateUnit: "milli-inch", maxRawPathPoints: MAX_RAW_PATH_POINTS,
      maxCanonicalPathPoints: MAX_CANONICAL_PATH_POINTS,
      exactRemainingPlacementCount: profiles.length - 1,
      optional: ["elevationTransitions", "gapMouths", "coherencyGapMouths"],
    },
    unitRepositionProcedure: {
      leadingModelPhysicalPathOnly: true,
      leadingModelPathParameter: "path",
      remainingModelsResolution:
        "placed_after_leading_model_path_via_coherency_links",
      remainingModelTransitPathsRequired: false,
      remainingModelTransitPathsForbidden: true,
      everyRemainingLiveModelRequiresExplicitPlacement: true,
      exactRemainingPlacementCount: profiles.length - 1,
      automaticFormationPlacementAllowed: false,
      agentChoosesCompleteFinalFormation: true,
      finalGeometryValidatedForEveryModelBase: true,
      rulesSourceSemantics:
        "only_leading_model_follows_physical_path_remaining_models_are_placed",
    },
    constraints: {
      modelProfiles: profiles,
      battlefieldWidthMilliInches: milli(state.board.widthInches),
      battlefieldHeightMilliInches: milli(state.board.heightInches),
      maxDistanceMilliInches: milli(speed), speedAllowanceInches: speed,
      coherencyRangeMilliInches:
        milli(context.profile.movementProfile.horizontalCoherencyInches),
      coherencyConstraintMode:
        "each_remaining_model_base_wholly_within_leading_model_range",
      coherencyCasualtyRequiresNoLegalPositionCertificate: true,
      engagedEnemyUnitIds: context.engagement.enemyUnitIds,
      engagementHash: context.engagement.engagementHash || null,
      entrySegments: actionType === "deploy" ? entrySegments(state, sideKey) : [],
      supply: actionType === "deploy" ? supply : null,
      modelBaseGeometryDataBundleHash:
        state.officialModelBaseGeometryDataBundle.bundleHash,
      terrainLosDataBundleHash: state.officialTerrainLosDataBundle.bundleHash,
      specialTerrainAgreementHash: state.board.specialTerrainAgreement.agreementHash,
      actionRouteCatalogueHash: state.officialActionRouteCatalogue.catalogueHash,
      raptorStrainRouteObserved: piece.officialUnitRecordKey
        === "army_units:kerrigan_swarm_raptor__zergling_",
      raptorStrainAvailableInDomain: piece.officialUnitRecordKey
        === "army_units:kerrigan_swarm_raptor__zergling_",
      successfulPlacementPathExact: true,
      disengageNoLegalPlacementRequiresRulesOwnedCertificate:
        actionType === "disengage",
    },
    confirmationClass: "direct_gesture",
    currentSelectedRosterAndBoardExact: true,
    rulesTruth: "official_selected_roster_spatial_action_domain",
    trainingTruth: false,
  };
  return seal(core, "domainId");
}
function diagnostic(sideKey, pieceId, actionType, error) {
  return freezeDeep({ actionType, sideKey,
    phase: actionType === "run" ? "assault" : "movement", pieceId,
    executorId: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION,
    isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
    score: 0, details: { rulesTruth: "selected_roster_spatial_fail_closed",
      trainingTruth: false } });
}

export function enumerateOfficialSelectedRosterSpatialActionsV1(state, options = {}) {
  const retained = spatialEnumerationByState.get(state);
  if (retained) {
    const key = spatialEnumerationKey(state, options);
    const cached = key === null ? null : retained.get(key);
    if (cached) return cached;
  }
  verifyRuntimeState(state);
  const sideKey = String(options.sideKey || state.activeSideKey);
  if (!SIDE_KEYS.has(sideKey)) fail("SELECTED_SPATIAL_SIDE_INVALID", sideKey);
  const parameterDomains = [];
  const candidates = [];
  const actionTypes = state.phase === "movement"
    ? ["deploy", "move", "disengage"] : state.phase === "assault" ? ["run"] : [];
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey && livePiece(entry)
  ))) {
    for (const actionType of actionTypes) {
      try {
        const context = actionContext(state, sideKey, piece, actionType);
        parameterDomains.push(domainFor(state, sideKey, piece, actionType, context));
      } catch (error) {
        if (options.includeDisabled === true) {
          candidates.push(diagnostic(sideKey, piece.id, actionType, error));
        }
      }
    }
  }
  const result = freezeDeep({
    schemaVersion: "starcraft_tmg_official_executable_legal_enumeration_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION,
    candidates: candidates.sort((left, right) => (
      `${left.pieceId}:${left.actionType}`.localeCompare(`${right.pieceId}:${right.actionType}`)
    )),
    parameterDomains: parameterDomains.sort((left, right) => (
      `${left.pieceId}:${left.actionType}`.localeCompare(`${right.pieceId}:${right.actionType}`)
    )),
    selectedRosterSuccessfulSpatialPathLegalSpaceComplete: true,
    searchAndStrategyExcludedFromAuthority: true,
    trainingTruth: false,
  });
  const key = spatialEnumerationKey(state, options);
  if (key !== null && deeplyImmutableSpatialRecord(state)) {
    const byOptions = retained || new Map();
    byOptions.set(key, result);
    if (!retained) spatialEnumerationByState.set(state, byOptions);
  }
  return result;
}

function canonicalPath(start, raw, domain, actionType) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_RAW_PATH_POINTS) {
    fail("SELECTED_SPATIAL_PATH_DENOMINATOR_INVALID");
  }
  const normalized = [{ ...start, elevation: elevation(start.elevation),
    supportTerrainIds: [...new Set(start.supportTerrainIds || [])].sort(),
    rotationDegrees: canonicalRotation(start.rotationDegrees) }];
  for (const [index, entry] of raw.entries()) {
    const next = { ...point(entry, "SELECTED_SPATIAL_PATH_POINT_INVALID", String(index)),
      elevation: elevation(entry.elevation),
      supportTerrainIds: [...new Set((entry.supportTerrainIds || []).map(String))].sort(),
      rotationDegrees: canonicalRotation(entry.rotationDegrees) };
    const previous = normalized.at(-1);
    if (distance(previous, next) > TOLERANCE
      || previous.elevation !== next.elevation) normalized.push(next);
  }
  if (normalized.length < 2) fail("SELECTED_SPATIAL_PATH_MUST_CHANGE_POSITION");
  const points = [];
  for (const entry of normalized) {
    while (points.length >= 2
      && points.at(-2).elevation === points.at(-1).elevation
      && points.at(-1).elevation === entry.elevation
      && Math.abs(((points.at(-1).xMilliInches - points.at(-2).xMilliInches)
        * (entry.yMilliInches - points.at(-2).yMilliInches))
        - ((points.at(-1).yMilliInches - points.at(-2).yMilliInches)
          * (entry.xMilliInches - points.at(-2).xMilliInches))) <= TOLERANCE) {
      points.pop();
    }
    points.push(entry);
  }
  if (points.length > MAX_CANONICAL_PATH_POINTS) {
    fail("SELECTED_SPATIAL_PATH_TOO_COMPLEX");
  }
  const distanceMilliInches = Math.round(points.slice(1).reduce((sum, entry, index) => (
    sum + distance(points[index], entry)
  ), 0));
  if (distanceMilliInches > domain.constraints.maxDistanceMilliInches + TOLERANCE) {
    fail("SELECTED_SPATIAL_PATH_EXCEEDS_SPEED", actionType);
  }
  return freezeDeep({ schemaVersion: "starcraft_tmg_selected_spatial_path_v1",
    unit: "milli-inch", points, distanceMilliInches });
}
function fullBaseInsideBoard(value, model, domain) {
  const half = modelHalfExtents(model, value.rotationDegrees);
  return value.xMilliInches >= half.x - TOLERANCE
    && value.xMilliInches <= domain.constraints.battlefieldWidthMilliInches
      - half.x + TOLERANCE
    && value.yMilliInches >= half.y - TOLERANCE
    && value.yMilliInches <= domain.constraints.battlefieldHeightMilliInches
      - half.y + TOLERANCE;
}
function segmentById(domain, segmentId) {
  const segment = domain.constraints.entrySegments.find((entry) => (
    entry.segmentId === segmentId
  ));
  if (!segment || !new Set(["top", "bottom", "left", "right"]).has(segment.side)) {
    fail("SELECTED_SPATIAL_ENTRY_SEGMENT_INVALID", segmentId);
  }
  return segment;
}
function deployStart(domain, segment, along, modelProfile) {
  const halfWidth = Math.round(modelProfile.baseWidthMilliInches / 2);
  const halfDepth = Math.round(modelProfile.baseDepthMilliInches / 2);
  const minimum = milli(segment.startInches);
  const maximum = milli(segment.endInches);
  const edgeHalf = new Set(["top", "bottom"]).has(segment.side)
    ? halfWidth : halfDepth;
  if (!Number.isSafeInteger(along) || along < minimum + edgeHalf
    || along > maximum - edgeHalf) {
    fail("SELECTED_SPATIAL_ENTRY_POINT_INVALID", segment.segmentId);
  }
  if (segment.side === "top") return { xMilliInches: along,
    yMilliInches: domain.constraints.battlefieldHeightMilliInches + halfDepth,
    elevation: "ground" };
  if (segment.side === "bottom") return { xMilliInches: along,
    yMilliInches: -halfDepth, elevation: "ground" };
  if (segment.side === "left") return { xMilliInches: -halfWidth,
    yMilliInches: along, elevation: "ground" };
  return { xMilliInches: domain.constraints.battlefieldWidthMilliInches + halfWidth,
    yMilliInches: along, elevation: "ground" };
}
function verifyDeployInward(segment, path) {
  const start = path.points[0];
  const first = path.points[1];
  const inward = segment.side === "top" ? first.yMilliInches < start.yMilliInches
    : segment.side === "bottom" ? first.yMilliInches > start.yMilliInches
      : segment.side === "left" ? first.xMilliInches > start.xMilliInches
        : first.xMilliInches < start.xMilliInches;
  if (!inward) fail("SELECTED_SPATIAL_DEPLOY_PATH_NOT_INWARD");
}
function canonicalPlacements(domain, leadingModelId, raw, endpoint) {
  const remaining = remainingOfficialSelectedRosterSpatialModelIdsV1(domain, leadingModelId, raw);
  const rows = [{ modelId: leadingModelId,
    xMilliInches: endpoint.xMilliInches, yMilliInches: endpoint.yMilliInches,
    elevation: endpoint.elevation,
    supportTerrainIds: [...new Set(endpoint.supportTerrainIds || [])].sort(),
    rotationDegrees: canonicalRotation(endpoint.rotationDegrees) }];
  for (const [index, entry] of raw.entries()) {
    const modelId = String(entry?.modelId || "");
    if (!remaining.delete(modelId)) {
      fail("SELECTED_SPATIAL_PLACEMENT_MODEL_INVALID", modelId || String(index));
    }
    rows.push({ modelId, ...point(entry,
      "SELECTED_SPATIAL_PLACEMENT_POINT_INVALID", modelId),
    elevation: elevation(entry.elevation),
    supportTerrainIds: [...new Set((entry.supportTerrainIds || []).map(String))].sort(),
    rotationDegrees: canonicalRotation(entry.rotationDegrees) });
  }
  if (remaining.size > 0) fail("SELECTED_SPATIAL_PLACEMENT_DENOMINATOR_INVALID");
  return rows.sort((left, right) => left.modelId.localeCompare(right.modelId));
}
function assertPathBoardAndModels(state, piece, leadingModel, path, domain, actionType) {
  const pointsToCheck = actionType === "deploy" ? path.points.slice(1) : path.points;
  if (pointsToCheck.some((entry) => !fullBaseInsideBoard(entry, leadingModel, domain))) {
    fail("SELECTED_SPATIAL_FULL_BASE_OUTSIDE_BATTLEFIELD", leadingModel.id);
  }
  const rotatedSegments = path.points.slice(1).filter((entry, index) => (
    Math.abs(Number(entry.rotationDegrees || 0)
      - Number(path.points[index].rotationDegrees || 0)) > TOLERANCE
  ));
  if (rotatedSegments.length > 0) {
    const envelopeRadius = modelRadius(leadingModel);
    const rotationEnvelopeInside = pointsToCheck.every((entry) => (
      entry.xMilliInches >= envelopeRadius - TOLERANCE
        && entry.xMilliInches <= domain.constraints.battlefieldWidthMilliInches
          - envelopeRadius + TOLERANCE
        && entry.yMilliInches >= envelopeRadius - TOLERANCE
        && entry.yMilliInches <= domain.constraints.battlefieldHeightMilliInches
          - envelopeRadius + TOLERANCE
    ));
    if (!rotationEnvelopeInside) {
      fail("SELECTED_SPATIAL_ROTATING_BASE_OUTSIDE_BATTLEFIELD", leadingModel.id);
    }
  }
  const blockers = state.pieces.filter((entry) => (
    entry.id !== piece.id && activePiece(entry)
  )).flatMap((entry) => activeModels(entry).map((model) => ({
    pieceId: entry.id,
    modelId: model.id,
    footprint: createOfficialModelBaseFootprintV1({
      piece: entry,
      model,
      dataBundle: state.officialModelBaseGeometryDataBundle,
    }),
  })));
  for (let index = 1; index < path.points.length; index += 1) {
    for (const blocker of blockers) {
      const collision = sweptFootprintsCollide({
        movingStart: modelFootprintAt(
          state, piece, leadingModel, path.points[index - 1],
        ),
        movingEnd: modelFootprintAt(
          state, piece, leadingModel, path.points[index],
        ),
        blocker: blocker.footprint,
      });
      if (collision) {
        fail("SELECTED_SPATIAL_PATH_MODEL_COLLISION", blocker.modelId);
      }
    }
  }
}
function crossedForceFieldTokenIds(state, piece, leadingModel, path) {
  const bindings = new Map((state.officialBattlefieldAssetBindings || []).map((entry) => (
    [entry.assetId, entry])));
  const fields = (state.board?.tokens || []).filter((token) => {
    const id = String(token.tokenId || token.id || "");
    return token.isRemoved !== true && bindings.get(id)?.assetKind === "force_field"
      && bindings.get(id)?.consumed !== true;
  }).map((token) => ({
    id: String(token.tokenId || token.id),
    centre: { xMilliInches: milli(token.coordinate?.x ?? token.xInches),
      yMilliInches: milli(token.coordinate?.y ?? token.yInches) },
    radius: Math.round(milli(token.baseDiameterInches ?? token.baseWidthInches) / 2),
  })).map((field) => ({ ...field,
    footprint: createOfficialPhysicalFootprintV1({
      objectId: field.id,
      kind: "battlefield_token",
      shape: "round",
      center: field.centre,
      widthMilliInches: field.radius * 2,
      depthMilliInches: field.radius * 2,
      rotationDegrees: 0,
    }) }));
  if (fields.length === 0) return [];
  const crossed = fields.filter((field) => pathSweepsFootprint(
    state, piece, leadingModel, path.points, field.footprint,
  )).map((entry) => entry.id).sort();
  if (crossed.length > 0 && Number(piece.sizeCharacteristic || 0) <= 2) {
    fail("SELECTED_SPATIAL_FORCE_FIELD_BLOCKS_SIZE_TWO_OR_LOWER", crossed[0]);
  }
  return crossed;
}
function deployTerrainResult(state, piece, path) {
  const leadingModel = piece.models.find((entry) => (
    entry.id === path.leadingModelId
  ));
  const points = path.canonicalPath.points;
  // Reuse only within this evaluation. Prepare lazily to retain the original
  // terrain/segment failure order and avoid constructing unvisited segments.
  const pathFootprints = [];
  const pathFootprintAt = (index) => (
    pathFootprints[index] ??= modelFootprintAt(
      state, piece, leadingModel, points[index],
    )
  );
  const interactions = [];
  const grassRemovedTerrainIds = [];
  for (const terrain of (state.board?.terrain || []).filter((entry) => (
    entry.isRemoved !== true && entry.isDestroyed !== true
  ))) {
    const blockers = terrainPhysicalFootprints(terrain);
    const pathIntersects = blockers.some(blocker => points.slice(1).some((entry, index) => (
      sweptFootprintsCollide({
        movingStart: pathFootprintAt(index),
        movingEnd: pathFootprintAt(index + 1),
        blocker,
      })
    )));
    const kind = String(terrain.terrainKind || "ordinary").toLowerCase();
    if (pathIntersects && kind === "grass") grassRemovedTerrainIds.push(terrain.id);
    if (pathIntersects && (kind === "impassable"
      || (kind === "ordinary" && Number(terrain.size) >= 2))) {
      fail("SELECTED_SPATIAL_DEPLOY_TERRAIN_BLOCKED", terrain.id);
    }
    interactions.push({ terrainId: terrain.id, terrainKind: kind,
      size: Number(terrain.size), pathIntersects,
      grassRemoved: grassRemovedTerrainIds.includes(terrain.id) });
  }
  const removal = resolveOfficialLogicalGrassRemovalV1(state, grassRemovedTerrainIds);
  if (removal.logicalGrassRemoval) {
    const removed = new Set(removal.grassRemovedTerrainIds);
    interactions.forEach(row => { row.grassRemoved = removed.has(row.terrainId); });
  }
  return seal({ schema: "starcraft_tmg_selected_deploy_terrain_result_v1",
    pieceId: piece.id, interactions,
    ...removal,
    currentScenarioAccessPointTransitionRequired: false,
    fullLeadingBaseSwept: true,
    rulesTruth: "official_selected_roster_deploy_terrain_adapter",
    trainingTruth: false }, "resultHash");
}
function geometryProjection(state, piece, placements) {
  // The coherency kernel only reads cold context. Share it only after proving
  // deep immutability, while retaining a fully private actor and writable board.
  // Mutable callers keep the original independent full-copy behavior.
  const shareImmutable = deeplyImmutableSpatialRecord(state);
  const projected = shareImmutable
    ? { ...state, pieces: [...state.pieces], board: { ...state.board } }
    : clone(state);
  const actorIndex = projected.pieces.findIndex((entry) => entry.id === piece.id);
  if (shareImmutable && actorIndex >= 0) {
    projected.pieces[actorIndex] = clone(projected.pieces[actorIndex]);
  }
  const actor = projected.pieces[actorIndex];
  actor.isOnField = true;
  actor.isInReserves = false;
  for (const model of actor.models) {
    const placement = placements.find((entry) => entry.modelId === model.id);
    if (!placement) continue;
    model.xInches = inches(placement.xMilliInches);
    model.yInches = inches(placement.yMilliInches);
    model.baseRotationDegrees = placement.rotationDegrees;
    model.elevation = placement.elevation;
    model.supportTerrainIds = clone(placement.supportTerrainIds);
    model.isOnField = true;
  }
  const supportedTerrainIds = new Set(placements.flatMap((entry) => (
    entry.supportTerrainIds || []
  )));
  projected.board.terrain = projected.board.terrain.filter((terrain) => (
    String(terrain.terrainKind || "").toLowerCase() !== "grass"
      && !supportedTerrainIds.has(terrain.id)
  ));
  return { state: projected, actor };
}
function validateFinalGeometry(state, piece, domain, placements, leadingModelId,
  engagedEnemyUnitIds, options = {}) {
  const projected = geometryProjection(state, piece, placements);
  const geometryState = options.allowEnemyEngagement === true
    ? {
        ...projected.state,
        pieces: projected.state.pieces.filter((entry) => (
          entry.sideKey === piece.sideKey
        )),
      }
    : projected.state;
  return evaluateOfficialCoherencyPlacementV1({
    state: geometryState, actor: geometryState.pieces.find((entry) => (
      entry.id === piece.id
    )),
    dataBundle: state.officialModelBaseGeometryDataBundle,
    coherencyRangeMilliInches: domain.constraints.coherencyRangeMilliInches,
    plan: { planId: `selected-placement-${hashStarcraftTmgContract({
      pieceId: piece.id, leadingModelId, placements,
    }).slice(0, 24)}`, leadingModelId,
    placements: placements.map((entry) => ({ ...entry, outcome: "placed" })),
    currentlyEngagedEnemyUnitIds: engagedEnemyUnitIds,
    closestLegalPlacementDenominatorComplete: false },
  });
}
function specialTerrainResult(state, piece, actionType, domain, leadingModelId,
  path, placements, parameters) {
  if (!MOVEMENT_ACTION_TYPES.has(actionType)) return null;
  if ((parameters.gapMouths || []).length > 0
    || (parameters.coherencyGapMouths || []).length > 0) {
    fail("SELECTED_SPATIAL_DECLARED_GAP_NOT_PRESENT_ON_CERTIFIED_BOARD");
  }
  const raptorStrain = piece.officialUnitRecordKey
    === "army_units:kerrigan_swarm_raptor__zergling_";
  const transitionBySegment = new Map();
  for (const transition of parameters.elevationTransitions || []) {
    const segmentIndex = Number(transition?.segmentIndex);
    const accessPointId = String(transition?.accessPointId || "");
    if (!Number.isSafeInteger(segmentIndex) || segmentIndex < 0
      || segmentIndex >= path.points.length - 1 || transitionBySegment.has(segmentIndex)) {
      fail("SELECTED_SPATIAL_ELEVATION_TRANSITION_INVALID", String(segmentIndex));
    }
    transitionBySegment.set(segmentIndex, accessPointId);
  }
  const agreementEntries = state.board.specialTerrainAgreement.terrainEntries || [];
  const accessPointUses = [];
  for (let index = 0; index < path.points.length - 1; index += 1) {
    const from = path.points[index];
    const to = path.points[index + 1];
    const declared = transitionBySegment.get(index);
    if (from.elevation === to.elevation) {
      if (declared) fail("SELECTED_SPATIAL_REDUNDANT_ELEVATION_TRANSITION", String(index));
      continue;
    }
    if (raptorStrain && !declared) {
      accessPointUses.push({ segmentIndex: index, accessPointId: null,
        terrainId: null, sourceFeature: "Raptor Strain" });
      continue;
    }
    if (!declared) fail("SELECTED_SPATIAL_ACCESS_POINT_REQUIRED", String(index));
    const matches = agreementEntries.flatMap((entry) => (
      (entry.accessPoints || []).filter((accessPoint) => {
        const connects = new Set(accessPoint.connects || []);
        const rectangle = terrainRectangle({ id: accessPoint.accessPointId,
          footprint: accessPoint.footprint });
        return accessPoint.accessPointId === declared
          && connects.has(from.elevation) && connects.has(to.elevation)
          && segmentIntersectsRectangle(from, to, rectangle);
      }).map((accessPoint) => ({ terrainId: entry.terrainId,
        accessPointId: accessPoint.accessPointId }))
    ));
    if (matches.length !== 1) {
      fail("SELECTED_SPATIAL_ACCESS_POINT_INVALID", declared);
    }
    accessPointUses.push({ segmentIndex: index, ...matches[0], sourceFeature: null });
  }
  if (transitionBySegment.size !== accessPointUses.filter((entry) => (
    entry.accessPointId !== null
  )).length) {
    fail("SELECTED_SPATIAL_ELEVATION_TRANSITION_INVALID");
  }
  const grassRemoved = new Set();
  const interactions = [];
  const leadingModel = piece.models.find((entry) => entry.id === leadingModelId);
  const activeTerrain = (state.board.terrain || []).filter((entry) => (
    entry.isRemoved !== true && entry.isDestroyed !== true
  ));
  // These bases do not change while checking terrain. Reuse their exact
  // geometry within this evaluation; do not cache across room revisions.
  const pathFootprints = activeTerrain.length === 0 ? [] : path.points.map(
    (point) => modelFootprintAt(state, piece, leadingModel, point),
  );
  const endpointFootprints = activeTerrain.length === 0 ? [] : placements.map(
    (placement) => ({ placement, footprint: modelFootprintAt(state, piece,
      piece.models.find((entry) => entry.id === placement.modelId), placement) }),
  );
  const logicalSweep = pathFootprints.length === 0 ? null
    : resolveOfficialLogicalTerrainSurfaceCoverageV1(state, pathFootprints);
  const logicalEndpoints = new Map(endpointFootprints.map(({ placement, footprint }) => (
    [placement.modelId, resolveOfficialLogicalTerrainSurfaceCoverageV1(state, [footprint])]
  )));
  // Native top ports belong to the physical incline, not individual stripes
  // of the platform. Only its connected surface union can support this sweep.
  const nativeTopTraversals = new Map();
  if (logicalSweep) for (const use of accessPointUses.filter(use => use.accessPointId)) {
    const owner = state.board.terrain.find(row => row.id === use.terrainId);
    if (owner?.terrainKind !== "ramp" || !owner.footprintCells
      || owner.overlayRole !== "premade_profile_actual_cell") continue;
    const port = agreementEntries.find(entry => entry.terrainId === owner.id).accessPoints
      .find(entry => entry.accessPointId === use.accessPointId);
    if (port.role !== "top") continue;
    const portRect = terrainRectangle({ id: port.accessPointId, footprint: port.footprint });
    const connected = new Set(activeTerrain.filter(row => (
      row.overlayRole === "premade_profile_actual_cell" && row.standableHorizontalSurface === true
      && row.heightTier === "high_ground" && (row.footprintCells || [row.footprint]).some(cell => {
        const r = terrainRectangle({ id: row.id, footprint: cell });
        return r.minX <= portRect.maxX + TOLERANCE && r.maxX >= portRect.minX - TOLERANCE
          && r.minY <= portRect.maxY + TOLERANCE && r.maxY >= portRect.minY - TOLERANCE;
      })
    )).map(row => row.terrainGroupId));
    if (!connected.size) fail("SELECTED_SPATIAL_NATIVE_RAMP_TOP_SURFACE_REQUIRED", port.accessPointId);
    connected.add(owner.terrainGroupId);
    const cells = activeTerrain.filter(row => connected.has(row.terrainGroupId))
      .flatMap(row => row.footprintCells || [row.footprint]);
    const segmentBases = [pathFootprints[use.segmentIndex], pathFootprints[use.segmentIndex + 1]];
    if (!officialRectangleUnionCoversBasesV1(cells, segmentBases)) {
      fail("SELECTED_SPATIAL_NATIVE_RAMP_TOP_SWEEP_UNSUPPORTED", port.accessPointId);
    }
    nativeTopTraversals.set(use.segmentIndex, connected);
  }
  for (const terrain of activeTerrain) {
    const rectangle = terrainRectangle(terrain);
    const terrainFootprints = terrainPhysicalFootprints(terrain);
    const kind = String(terrain.terrainKind || "ordinary").toLowerCase();
    const pathIntersects = terrainFootprints.some(blocker => pathFootprints.slice(1).some((footprint, index) => (
      sweptFootprintsCollide({
        movingStart: pathFootprints[index], movingEnd: footprint,
        blocker,
      })
    )));
    const endpointModelIds = endpointFootprints.filter(({ footprint }) => (
      terrainFootprints.some(right => physicalInteriorsOverlap(footprint, right))
    )).map(({ placement }) => placement.modelId).sort();
    const supportedEndpointModelIds = endpointFootprints.filter(
      ({ placement, footprint }) => {
        const logicalSurface = logicalEndpoints.get(placement.modelId)?.groups.find(group => (
          group.covered && group.terrainGroupId === terrain.terrainGroupId
        ));
        if (logicalSurface) return placement.elevation === logicalSurface.elevation
          && terrainFootprints.some(right => physicalSeparationWithinTolerance(footprint, right))
          && placement.supportTerrainIds.includes(terrain.id);
        return footprintWhollyInsideRectangle(footprint, rectangle)
        && terrain.standableHorizontalSurface === true
        && placement.supportTerrainIds.includes(terrain.id);
      },
    ).map(({ placement }) => placement.modelId).sort();
    if (kind === "grass" && (pathIntersects || endpointModelIds.length > 0)) {
      grassRemoved.add(terrain.id);
    }
    const accessUsed = accessPointUses.some((entry) => entry.terrainId === terrain.id);
    const sameLogicalSurfaceSweep = logicalSweep?.groups.some(group => group.covered
      && group.terrainGroupId === terrain.terrainGroupId
      && path.points.every(value => value.elevation === group.elevation)) === true;
    const raptorElevationOverrideUsed = accessPointUses.some((entry) => (
      entry.sourceFeature === "Raptor Strain"
        && terrainFootprints.some(blocker => sweptFootprintsCollide({
          movingStart: pathFootprints[entry.segmentIndex],
          movingEnd: pathFootprints[entry.segmentIndex + 1],
          blocker,
        }))
    ));
    const nativeTopSurfaceSweep = nativeTopTraversals.size > 0
      && path.points.slice(1).every((to, index) => {
        const from = path.points[index];
        if (!terrainFootprints.some(blocker => sweptFootprintsCollide({
          movingStart: pathFootprints[index], movingEnd: pathFootprints[index + 1], blocker,
        }))) return true;
        if (nativeTopTraversals.get(index)?.has(terrain.terrainGroupId)) return true;
        return from.elevation === to.elevation && resolveOfficialLogicalTerrainSurfaceCoverageV1(state,
          [pathFootprints[index], pathFootprints[index + 1]])?.groups
          .some(group => group.covered && group.elevation === from.elevation && group.terrainGroupId === terrain.terrainGroupId);
      });
    const pathBlocked = (kind === "impassable" && pathIntersects
      && !(raptorStrain && Number(terrain.size) <= 4))
      || (kind === "ordinary" && Number(terrain.size) >= 2 && pathIntersects
        && !accessUsed && !raptorElevationOverrideUsed && !sameLogicalSurfaceSweep && !nativeTopSurfaceSweep);
    if (pathBlocked) fail("SELECTED_SPATIAL_TERRAIN_PATH_BLOCKED", terrain.id);
    if (endpointModelIds.some((modelId) => !supportedEndpointModelIds.includes(modelId))
      && kind !== "grass") {
      fail("SELECTED_SPATIAL_TERRAIN_ENDPOINT_UNSUPPORTED", terrain.id);
    }
    interactions.push({ terrainId: terrain.id, terrainKind: kind,
      size: Number(terrain.size), pathIntersects, pathBlocked,
      endpointModelIds, supportedEndpointModelIds, accessUsed,
      ...(logicalSweep ? { sameLogicalSurfaceSweep, nativeTopSurfaceSweep } : {}),
      raptorStrainUsed: raptorStrain
        && ((kind === "impassable" && pathIntersects)
          || raptorElevationOverrideUsed),
      grassRemoved: grassRemoved.has(terrain.id) });
  }
  const actualSupportByModel = new Map(placements.map((placement) => (
    [placement.modelId, interactions.filter((interaction) => (
      interaction.supportedEndpointModelIds.includes(placement.modelId)
    )).map((interaction) => interaction.terrainId).sort()]
  )));
  for (const placement of placements) {
    if (!isDeepStrictEqual(placement.supportTerrainIds,
      actualSupportByModel.get(placement.modelId))) {
      fail("SELECTED_SPATIAL_TERRAIN_SUPPORT_DECLARATION_MISMATCH", placement.modelId);
    }
    const model = piece.models.find((entry) => entry.id === placement.modelId);
    const semanticSurface = deriveOfficialSemanticSurfaceSupportV1(state,
      modelFootprintAt(state, piece, model, placement));
    if (semanticSurface && !isDeepStrictEqual(
      semanticSurface.supportTerrainIds, actualSupportByModel.get(placement.modelId))) {
      fail("SELECTED_SPATIAL_SEMANTIC_BOARD_SUPPORT_DRIFT", placement.modelId);
    }
    const highest = placement.supportTerrainIds.reduce((value, terrainId) => (
      Math.max(value, Number(state.board.terrain.find((entry) => (
        entry.id === terrainId
      ))?.size || 0))
    ), 0);
    const expectedElevation = semanticSurface?.elevation
      || (highest >= 3 ? "high" : highest >= 1 ? "mid" : "ground");
    if (placement.elevation !== expectedElevation) {
      fail("SELECTED_SPATIAL_TERRAIN_ELEVATION_MISMATCH", placement.modelId);
    }
  }
  const removal = resolveOfficialLogicalGrassRemovalV1(state, [...grassRemoved]);
  if (removal.logicalGrassRemoval) {
    const removed = new Set(removal.grassRemovedTerrainIds);
    interactions.forEach(row => { row.grassRemoved = removed.has(row.terrainId); });
  }
  const body = {
    schema: "starcraft_tmg_selected_roster_terrain_movement_result_v1",
    semanticVersion: "1.0.0", pieceId: piece.id, actionType, leadingModelId,
    pathHash: hashStarcraftTmgContract(path), interactions,
    accessPointUses, ...removal,
    ...(logicalSweep ? { logicalSurfaceSweep: logicalSweep,
      logicalSurfaceEndpoints: Object.fromEntries(logicalEndpoints) } : {}),
    coherencyRangeMilliInches: domain.constraints.coherencyRangeMilliInches,
    fullLeadingBaseSwept: true, allEndpointBasesChecked: true,
    raptorStrainObserved: raptorStrain,
    raptorStrainApplied: interactions.some((entry) => entry.raptorStrainUsed),
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_terrain_elevation_access_adapter",
    trainingTruth: false,
  };
  return seal({ schemaVersion: "starcraft_tmg_selected_roster_terrain_plan_v1",
    result: seal(body, "resultHash"), rulesTruth: body.rulesTruth,
    trainingTruth: false }, "planHash");
}
function parametersAllowed(actionType, parameters) {
  const allowed = new Set(["leadingModelId", "path", "placements",
    "elevationTransitions", "gapMouths", "coherencyGapMouths"]);
  if (actionType === "deploy") {
    allowed.add("entrySegmentId");
    allowed.add("entryAlongEdgeMilliInches");
  }
  return object(parameters) && Object.keys(parameters).every((key) => allowed.has(key));
}

export function validateOfficialSelectedRosterRelocationGeometryV1(input = {}) {
  const state = input.state;
  const piece = state?.pieces?.find((entry) => entry.id === input.pieceId);
  const actionType = String(input.actionType || "");
  const maxDistanceMilliInches = Number(input.maxDistanceMilliInches);
  const coherencyRangeMilliInches = Number(input.coherencyRangeMilliInches);
  const parameters = input.parameters;
  verifyRuntimeState(state);
  if (!activePiece(piece)
    || !new Set(["charge", "close_ranks"]).has(actionType)
    || !Number.isSafeInteger(maxDistanceMilliInches)
    || maxDistanceMilliInches <= 0
    || !Number.isSafeInteger(coherencyRangeMilliInches)
    || coherencyRangeMilliInches <= 0
    || !parametersAllowed(actionType, parameters)) {
    fail("SELECTED_SPATIAL_RELOCATION_INPUT_INVALID", String(input.pieceId || ""));
  }
  const profiles = modelProfiles(piece);
  const leadingModelId = String(parameters.leadingModelId || "");
  const leadingModel = activeModels(piece).find((entry) => entry.id === leadingModelId);
  const leadingProfile = profiles.find((entry) => entry.modelId === leadingModelId);
  if (!leadingModel || !leadingProfile) {
    fail("SELECTED_SPATIAL_LEADING_MODEL_INVALID", leadingModelId);
  }
  const domain = {
    constraints: {
      modelProfiles: profiles,
      battlefieldWidthMilliInches: milli(state.board.widthInches),
      battlefieldHeightMilliInches: milli(state.board.heightInches),
      maxDistanceMilliInches,
      coherencyRangeMilliInches,
    },
  };
  const start = {
    ...leadingProfile.startPoint,
    elevation: leadingProfile.startElevation,
    supportTerrainIds: leadingProfile.supportTerrainIds,
    rotationDegrees: leadingModel.baseRotationDegrees || 0,
  };
  const path = canonicalPath(start, parameters.path, domain, actionType);
  assertPathBoardAndModels(state, piece, leadingModel, path, domain, actionType);
  const placements = canonicalPlacements(
    domain,
    leadingModelId,
    parameters.placements,
    path.points.at(-1),
  );
  const geometryResult = validateFinalGeometry(
    state,
    piece,
    domain,
    placements,
    leadingModelId,
    [...new Set((input.currentlyEngagedEnemyUnitIds || []).map(String))].sort(),
    { allowEnemyEngagement: true },
  );
  const terrainPlan = specialTerrainResult(
    state,
    piece,
    actionType,
    domain,
    leadingModelId,
    path,
    placements,
    parameters,
  );
  const body = {
    schemaVersion: "starcraft_tmg_selected_roster_relocation_geometry_v1",
    semanticVersion: "1.0.0",
    actionType,
    pieceId: piece.id,
    leadingModelId,
    canonicalPath: path,
    finalModelPositions: placements,
    distanceTravelledMilliInches: path.distanceMilliInches,
    maxDistanceMilliInches,
    coherencyRangeMilliInches,
    coherencyPlacementResultHash: geometryResult.resultHash,
    specialTerrainPlanHash: terrainPlan.planHash,
    terrainResultHash: terrainPlan.result.resultHash,
    grassRemovedTerrainIds: terrainPlan.result.grassRemovedTerrainIds,
    ...(terrainPlan.result.logicalGrassRemoval
      ? { logicalGrassRemoval: terrainPlan.result.logicalGrassRemoval } : {}),
    fullBaseBoundaryAndSweptPathChecked: true,
    completeFormationPlacementChecked: true,
    terrainElevationAndAccessChecked: true,
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_relocation_geometry",
    trainingTruth: false,
  };
  return seal(body, "geometryHash");
}

export function instantiateOfficialSelectedRosterSpatialActionV1(
  state, domain, parameters, options = {},
) {
  verifyRuntimeState(state);
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_SELECTED_ROSTER_SPATIAL_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID
    || domain.executorVersion !== OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION
    || !ACTION_TYPES.includes(domain.actionType)) {
    fail("SELECTED_SPATIAL_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialSelectedRosterSpatialActionsV1(state, {
    sideKey: domain.sideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("SELECTED_SPATIAL_PARAMETER_DOMAIN_STALE");
  }
  if (!parametersAllowed(domain.actionType, parameters)) {
    fail("SELECTED_SPATIAL_PARAMETERS_INVALID");
  }
  const piece = state.pieces.find((entry) => entry.id === domain.pieceId);
  const leadingModelId = String(parameters.leadingModelId || "");
  const leadingModel = piece.models.find((entry) => (
    entry.id === leadingModelId && entry.isDestroyed !== true
  ));
  const leadingProfile = domain.constraints.modelProfiles.find((entry) => (
    entry.modelId === leadingModelId
  ));
  if (!leadingModel || !leadingProfile) {
    fail("SELECTED_SPATIAL_LEADING_MODEL_INVALID", leadingModelId);
  }
  let segment = null;
  let start;
  if (domain.actionType === "deploy") {
    segment = segmentById(domain, String(parameters.entrySegmentId || ""));
    start = deployStart(domain, segment,
      Number(parameters.entryAlongEdgeMilliInches), leadingProfile);
  } else {
    start = { ...leadingProfile.startPoint, elevation: leadingProfile.startElevation,
      supportTerrainIds: leadingProfile.supportTerrainIds,
      rotationDegrees: leadingModel.baseRotationDegrees || 0 };
  }
  const path = canonicalPath(start, parameters.path, domain, domain.actionType);
  if (segment) verifyDeployInward(segment, path);
  assertPathBoardAndModels(state, piece, leadingModel, path, domain, domain.actionType);
  const crossedForceFieldTokenIdsValue = crossedForceFieldTokenIds(
    state, piece, leadingModel, path);
  const endpoint = path.points.at(-1);
  const placements = canonicalPlacements(domain, leadingModelId,
    parameters.placements, endpoint);
  const geometryResult = validateFinalGeometry(state, piece, domain,
    placements, leadingModelId, domain.constraints.engagedEnemyUnitIds);
  const terrainResult = domain.actionType === "deploy"
    ? deployTerrainResult(state, piece, { leadingModelId, canonicalPath: path })
    : specialTerrainResult(state, piece, domain.actionType, domain, leadingModelId,
      path, placements, parameters);
  const restriction = domain.actionType === "disengage"
    ? postDisengageRestriction(state, piece,
      actionContext(state, domain.sideKey, piece, domain.actionType).engagement)
    : null;
  const canonicalParameters = {
    leadingModelId,
    ...(domain.actionType === "deploy" ? {
      entrySegmentId: segment.segmentId,
      entryAlongEdgeMilliInches: Number(parameters.entryAlongEdgeMilliInches),
    } : {}),
    path: clone(path.points.slice(1)),
    placements: placements.filter((entry) => entry.modelId !== leadingModelId)
      .map((entry) => clone(entry)),
    elevationTransitions: clone(parameters.elevationTransitions || []),
    gapMouths: clone(parameters.gapMouths || []),
    coherencyGapMouths: clone(parameters.coherencyGapMouths || []),
  };
  const planBody = {
    schemaVersion: OFFICIAL_SELECTED_ROSTER_SPATIAL_PLAN_SCHEMA,
    semanticVersion: "1.0.0", actionType: domain.actionType,
    sideKey: domain.sideKey, pieceId: piece.id, leadingModelId,
    domainId: domain.domainId, canonicalParameters,
    canonicalPath: path, finalModelPositions: placements,
    distanceTravelledInches: path.distanceMilliInches / 1000,
    speedAllowanceInches: domain.constraints.speedAllowanceInches,
    coherencyRangeMilliInches: domain.constraints.coherencyRangeMilliInches,
    coherencyPlacementResultHash: geometryResult.resultHash,
    specialTerrainPlanHash: domain.actionType === "deploy"
      ? null : terrainResult.planHash,
    terrainResultHash: domain.actionType === "deploy"
      ? terrainResult.resultHash : terrainResult.result.resultHash,
    grassRemovedTerrainIds: domain.actionType === "deploy"
      ? terrainResult.grassRemovedTerrainIds
      : terrainResult.result.grassRemovedTerrainIds,
    ...((domain.actionType === "deploy" ? terrainResult : terrainResult.result).logicalGrassRemoval
      ? { logicalGrassRemoval: (domain.actionType === "deploy"
        ? terrainResult : terrainResult.result).logicalGrassRemoval } : {}),
    crossedForceFieldTokenIds: crossedForceFieldTokenIdsValue,
    forceFieldsRemovedBySizeThreeOrHigher:
      crossedForceFieldTokenIdsValue.length > 0,
    entrySegmentId: segment?.segmentId || null,
    entryAlongEdgeMilliInches: segment
      ? Number(parameters.entryAlongEdgeMilliInches) : null,
    engagementHashBefore: domain.constraints.engagementHash,
    postDisengageAssaultRestriction: restriction,
    fullBaseBoundaryAndSweptPathChecked: true,
    completeFormationPlacementChecked: true,
    terrainElevationAndAccessChecked: true,
    raptorStrainOverrideUsed: domain.actionType !== "deploy"
      && terrainResult.result.raptorStrainApplied,
    currentScenarioRequiresRaptorStrainOverride: domain.actionType !== "deploy"
      && terrainResult.result.raptorStrainApplied,
    successfulPlacementPathExact: true,
    leadingModelPathAndCompleteFormationPlacementExact: true,
    noLegalDisengagePlacementBranchInvoked: false,
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_spatial_action_instantiation",
    trainingTruth: false,
  };
  const spatialPlan = seal(planBody, "spatialPlanHash");
  const action = freezeDeep({
    actionType: domain.actionType, sideKey: domain.sideKey,
    phase: domain.phase, pieceId: piece.id, spatialPlan,
    ruleAtomIds: [...ATOMS_BY_ACTION[domain.actionType]],
    executorId: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION,
  });
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_selected_roster_spatial_action_instantiation",
    trainingTruth: false,
  });
}

export function previewOfficialSelectedRosterSpatialActionV1(
  state, domain, parameters, options = {},
) {
  const instantiated = instantiateOfficialSelectedRosterSpatialActionV1(
    state, domain, parameters, options,
  );
  const piece = state.pieces.find((entry) => entry.id === domain.pieceId);
  const beforeById = new Map((piece.models || []).map((model) => [model.id, {
    xInches: model.xInches ?? null, yInches: model.yInches ?? null,
    elevation: model.elevation || "ground",
  }]));
  const deltas = instantiated.action.spatialPlan.finalModelPositions.map((entry) => ({
    modelId: entry.modelId, before: beforeById.get(entry.modelId),
    after: { xInches: inches(entry.xMilliInches), yInches: inches(entry.yMilliInches),
      elevation: entry.elevation },
  }));
  return seal({ schemaVersion: "starcraft_tmg_selected_spatial_preview_v1",
    semanticVersion: "1.0.0", action: instantiated.action,
    actionHash: hashStarcraftTmgContract(instantiated.action),
    modelPositionDeltas: deltas,
    grassRemovedTerrainIds: instantiated.action.spatialPlan.grassRemovedTerrainIds,
    confirmationClass: domain.confirmationClass,
    mutationApplied: false, rulesAuthority: true,
    rulesTruth: "official_selected_roster_spatial_preview",
    trainingTruth: false }, "previewHash");
}

export function applyOfficialSelectedRosterSpatialActionV1(
  stateInput, actionInput, options = {},
) {
  if (!object(actionInput)
    || actionInput.executorId !== OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID
    || actionInput.executorVersion !== OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION
    || !ACTION_TYPES.includes(actionInput.actionType)
    || actionInput.spatialPlan?.schemaVersion
      !== OFFICIAL_SELECTED_ROSTER_SPATIAL_PLAN_SCHEMA) {
    fail("SELECTED_SPATIAL_ACTION_INVALID");
  }
  const domain = enumerateOfficialSelectedRosterSpatialActionsV1(stateInput, {
    sideKey: actionInput.sideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === actionInput.spatialPlan.domainId);
  if (!domain) fail("SELECTED_SPATIAL_PARAMETER_DOMAIN_STALE");
  const current = instantiateOfficialSelectedRosterSpatialActionV1(
    stateInput, domain, actionInput.spatialPlan.canonicalParameters, options,
  );
  if (!isDeepStrictEqual(current.action, actionInput)) {
    fail("SELECTED_SPATIAL_ACTION_STALE");
  }
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const positions = new Map(actionInput.spatialPlan.finalModelPositions.map((entry) => (
    [entry.modelId, entry]
  )));
  for (const model of piece.models) {
    const position = positions.get(model.id);
    if (!position) continue;
    model.xInches = inches(position.xMilliInches);
    model.yInches = inches(position.yMilliInches);
    model.baseRotationDegrees = position.rotationDegrees;
    model.elevation = position.elevation;
    model.supportTerrainIds = clone(position.supportTerrainIds);
    model.adjacentAccessPointIds = adjacentAccessPointIdsFor(state, model, position);
    model.isOnField = true;
  }
  const leading = positions.get(actionInput.spatialPlan.leadingModelId);
  piece.xInches = inches(leading.xMilliInches);
  piece.yInches = inches(leading.yMilliInches);
  piece.isOnField = true;
  piece.isInReserves = false;
  if (actionInput.actionType === "deploy") piece.deploymentStatus = "deployed";
  piece.statuses = (piece.statuses || []).filter((status) => status !== "stationary");
  const activationPhase = actionInput.actionType === "run" ? "assault" : "movement";
  piece.activatedPhases = { movement: false, assault: false, combat: false,
    ...(piece.activatedPhases || {}), [activationPhase]: true };
  piece.inCoherency = true;
  piece.coherencyStatus = { schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
    status: "in_coherency", isOutOfCoherency: false,
    coherencyRangeMilliInches: actionInput.spatialPlan.coherencyRangeMilliInches };
  piece.lastLeadingModelId = actionInput.spatialPlan.leadingModelId;
  piece.lastSpatialPlanHash = actionInput.spatialPlan.spatialPlanHash;
  if (actionInput.actionType === "disengage") {
    piece.disengageAssaultRestriction = clone(
      actionInput.spatialPlan.postDisengageAssaultRestriction);
  }
  for (const terrainId of actionInput.spatialPlan.grassRemovedTerrainIds) {
    const terrain = state.board.terrain.find((entry) => entry.id === terrainId);
    if (terrain) {
      terrain.isRemoved = true;
      if (actionInput.spatialPlan.logicalGrassRemoval) terrain.removedBy = {
        rule: "official_grass_movement_or_endpoint", actorUnitId: piece.id,
        round: Number(state.round), phase: state.phase,
        logicalTerrainGroupId: terrain.terrainGroupId || null,
        policy: actionInput.spatialPlan.logicalGrassRemoval.policy,
      };
    }
  }
  const removedForceFieldTokenIds = actionInput.spatialPlan.crossedForceFieldTokenIds || [];
  if (removedForceFieldTokenIds.length > 0) {
    const removed = new Set(removedForceFieldTokenIds);
    state.board.tokens = (state.board.tokens || []).filter((token) => (
      !removed.has(String(token.tokenId || token.id || ""))));
    state.officialBattlefieldAssetBindings = (state.officialBattlefieldAssetBindings || [])
      .map((binding) => removed.has(binding.assetId) ? seal({
        ...without(binding, ["bindingHash"]), consumed: true,
      }, "bindingHash") : binding);
  }
  if (state.reserveManifestBySide?.[piece.sideKey]) {
    const row = state.reserveManifestBySide[piece.sideKey].find((entry) => (
      entry.pieceId === piece.id
    ));
    if (row && actionInput.actionType === "deploy") row.deploymentStatus = "deployed";
  }
  const event = {
    type: `unit_${actionInput.actionType}_resolved`,
    sideKey: piece.sideKey, pieceId: piece.id,
    leadingModelId: actionInput.spatialPlan.leadingModelId,
    spatialPlanHash: actionInput.spatialPlan.spatialPlanHash,
    distanceTravelledInches: actionInput.spatialPlan.distanceTravelledInches,
    speedAllowanceInches: actionInput.spatialPlan.speedAllowanceInches,
    modelPositionCount: positions.size,
    grassRemovedTerrainIds: clone(actionInput.spatialPlan.grassRemovedTerrainIds),
    ...(actionInput.spatialPlan.logicalGrassRemoval
      ? { logicalGrassRemoval: clone(actionInput.spatialPlan.logicalGrassRemoval) } : {}),
    removedForceFieldTokenIds: clone(removedForceFieldTokenIds),
    movementActivated: piece.activatedPhases.movement === true,
    assaultActivated: piece.activatedPhases.assault === true,
    rulesTruth: "official_selected_roster_spatial_transition",
    trainingTruth: false,
  };
  state.spatialActionHistory = Array.isArray(state.spatialActionHistory)
    ? state.spatialActionHistory : [];
  state.spatialActionHistory.push({ round: Number(state.round), phase: state.phase,
    actionType: actionInput.actionType, pieceId: piece.id,
    spatialPlanHash: actionInput.spatialPlan.spatialPlanHash,
    event: clone(event), trainingTruth: false });
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(actionInput), events: [clone(event)] });
  openOfficialSelectedRosterAfterActionWindowV1(
    state, piece.sideKey, piece.id, activationPhase);
  return freezeDeep({ ok: true,
    schemaVersion: "starcraft_tmg_selected_roster_spatial_transition_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION,
    postRevision: Number(options.postRevision || 0), state,
    action: clone(actionInput), events: [event],
    rulesTruth: "official_selected_roster_spatial_transition",
    trainingTruth: false });
}

export function queryOfficialSelectedRosterSpatialActionV1(input = {}) {
  const state = input.state;
  const request = input.request;
  const queryKind = String(request?.queryKind || request?.kind || "");
  if (!new Set(["instantiate_parameterized_action", "legal_full_path_movement",
    "coherency_after_candidate_placement"]).has(queryKind)) {
    fail("SELECTED_SPATIAL_QUERY_KIND_UNSUPPORTED", queryKind);
  }
  const domain = enumerateOfficialSelectedRosterSpatialActionsV1(state, {
    sideKey: request.sideKey || state.activeSideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === request.domainId);
  if (!domain) fail("SELECTED_SPATIAL_QUERY_DOMAIN_STALE");
  const preview = previewOfficialSelectedRosterSpatialActionV1(
    state, domain, request.parameters || {}, input.options || {},
  );
  return seal({ schemaVersion: "starcraft_tmg_selected_roster_spatial_query_v1",
    semanticVersion: "1.0.0", ok: true, precision: "exact",
    queryKind, domainId: domain.domainId,
    result: { preview, action: preview.action,
      coherencyPlacementResultHash:
        preview.action.spatialPlan.coherencyPlacementResultHash,
      terrainResultHash: preview.action.spatialPlan.terrainResultHash },
    source: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialSelectedRosterSpatialActionRuntimeV1(state) {
  verifyRuntimeState(state);
  const routes = state.pieces.flatMap((piece) => ACTION_TYPES.map((actionType) => ({
    routeId: `${piece.id}:core:${actionType}`,
    pieceId: piece.id, officialUnitRecordKey: piece.officialUnitRecordKey,
    actionType, phase: actionType === "run" ? "assault" : "movement",
    routeStatus: "executable_exact",
    executorId: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION,
    ruleAtomIds: [...ATOMS_BY_ACTION[actionType]],
  })));
  const descriptor = seal({
    schemaVersion: "starcraft_tmg_selected_roster_spatial_runtime_descriptor_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION,
    selectedUnitCount: state.pieces.length,
    selectedSpatialRouteCount: routes.length,
    unsupportedSelectedSpatialRouteCount: 0,
    routes,
    actions: [...ACTION_TYPES],
    geometryScope: "current_product_scale_bound_bases_certified_terrain_v1",
    arbitraryRosterClosureClaimed: false,
    successfulPlacementPathExact: true,
    unitRepositionProcedureExplicit: true,
    automaticFormationPlacementAllowed: false,
    remainingModelTransitPathsAreRulesFacts: false,
    noLegalDisengagePlacementCertificateInterfaceRequired: true,
    activeSpeedAndDisengageModifiersApplied: true,
    afterActionAbilityWindowIntegrated: true,
    legalSpacePreviewApplyAndQueryShareInstantiation: true,
    sourceRefreshPerformed: false,
    productionRoomEligible: false,
    rulesTruth: "official_selected_roster_spatial_runtime",
    trainingTruth: false,
  }, "runtimeHash");
  return freezeDeep({ descriptor,
    enumerate: enumerateOfficialSelectedRosterSpatialActionsV1,
    instantiate: instantiateOfficialSelectedRosterSpatialActionV1,
    preview: previewOfficialSelectedRosterSpatialActionV1,
    apply: applyOfficialSelectedRosterSpatialActionV1,
    query: queryOfficialSelectedRosterSpatialActionV1 });
}

export function verifyOfficialSelectedRosterSpatialRuntimeDescriptorV1(descriptor) {
  if (!object(descriptor)
    || descriptor.runtimeId !== OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID
    || descriptor.runtimeVersion !== OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION
    || descriptor.runtimeHash !== hashStarcraftTmgContract(
      without(descriptor, ["runtimeHash"]))
    || !Number.isSafeInteger(descriptor.selectedUnitCount)
    || descriptor.selectedUnitCount < 1
    || descriptor.selectedSpatialRouteCount !== descriptor.selectedUnitCount * 4
    || descriptor.unsupportedSelectedSpatialRouteCount !== 0
    || descriptor.unitRepositionProcedureExplicit !== true
    || descriptor.automaticFormationPlacementAllowed !== false
    || descriptor.remainingModelTransitPathsAreRulesFacts !== false
    || descriptor.routes?.length !== descriptor.selectedSpatialRouteCount
    || descriptor.legalSpacePreviewApplyAndQueryShareInstantiation !== true
    || descriptor.sourceRefreshPerformed !== false
    || descriptor.trainingTruth !== false) {
    fail("SELECTED_SPATIAL_RUNTIME_DESCRIPTOR_INVALID");
  }
  return true;
}
