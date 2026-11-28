import {supportsOfficialDisengageRemovalV1,instantiateOfficialDisengageRemovalV1,applyOfficialDisengageRemovalV1} from './official-disengage-removal-v1.mjs';
import { officialSpatialRuleErrorV1 } from '../rule-atoms/official-spatial-proposal-error-v1.mjs';
import { OFFICIAL_BURROWED_ENGAGEMENT_RANGE_MILLI_INCHES_V1 } from "../source-data/official-hidden-burrowed-data-bundle-v1.mjs";
import { normalizeOfficialElevationV1 } from "../rule-atoms/official-elevation-contract-v1.mjs";
import {unitEntryPerimeters,unitEntryReceipt,assertUnitEntryElevation} from "./official-unit-entry-perimeters-v1.mjs";
import { isOfficialFlyingUnitV1 } from "../rule-atoms/official-flying-rules-kernel-v1.mjs";
import { OFFICIAL_RAVEN_CONTOUR_GEOMETRY_BUNDLE_VERSION } from "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { consumeOfficialForceWallCrossingsV1, readOfficialActiveForceWallFootprintsV1 } from './official-force-wall-v1.mjs';
import {projectOfficialDeploymentSupplyV1 as supplyAvailable} from '../rule-atoms/official-deployment-supply-projection-v1.mjs';
import { isDeepStrictEqual } from "node:util";
import { OFFICIAL_OMEGA_WORM_NETWORK_DEFINITION_ID,
  OFFICIAL_PYLON_WARP_IN_DEFINITION_ID } from './official-unit-lifecycle-family-adapter-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../rule-atoms/official-round-supply-state-v1.mjs';
import { hasOfficialTunnelingClawsMovementV1 } from "./official-relocation-family-adapter-v1.mjs";
import { projectOfficialCharacteristicStatusFamilyModifiersV1, hasOfficialCharacteristicConsumerPolicyV1,
  projectOfficialHorizontalCoherencyV1, resolveOfficialMovementSpeedV1,
  resolveOfficialRavenReserveEntryRouteV1, consumeOfficialCharacteristicActivationStartV1,
  consumeOfficialCharacteristicBurrowedMovementV1, isOfficialBurrowedCoreActorV1,
  applyOfficialAfterActionCharacteristicPassivesV1 } from './official-characteristic-status-family-adapter-v1.mjs';
import { consumeOfficialActionPerformedStatusesV1 } from '../rule-atoms/official-action-status-lifecycle-policy-v1.mjs';
import { canonicalOfficialGapInputsV1, officialGapInputContractV1, remainingOfficialSelectedRosterSpatialModelIdsV1 }
  from './official-selected-roster-spatial-parameter-contract-v1.mjs';
import { OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID } from './official-reaction-family-adapter-v1.mjs';
import { measureOfficialSingleRoundBlockerPathsV1 } from '../rule-atoms/official-charge-round-path-infeasibility-proof-v1.mjs';
import { measureOfficialRoundObstacleForwardPathBoundV1, measureOfficialRoundObstacleUnionPathBoundV1,
  measureOfficialRoundObstacleUnionForwardPathBoundV1, realizeOfficialRoundObstacleGeodesicsV1 }
  from '../rule-atoms/official-round-obstacle-path-bound-v1.mjs';
import { convexHullOfficialPathPointsV1, createOfficialConvexObstaclePathSearchV1 }
  from '../rule-atoms/official-convex-obstacle-path-candidates-v1.mjs';

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { OFFICIAL_ASSAULT_RUN_ACTION_ATOM_IDS } from
  "../rule-atoms/official-assault-run-executor-v1.mjs";
import { OFFICIAL_DISENGAGE_CASUALTY_ACTION_ATOM_IDS } from
  "../rule-atoms/official-disengage-casualty-executor-v1.mjs";
import { deriveOfficialEngagementGraphV2, OFFICIAL_ENGAGEMENT_RANGE_V2_MILLI_INCHES } from
  "../rule-atoms/official-engagement-graph-v2.mjs";
import {
  createOfficialModelBaseFootprintV1,
  createOfficialPhysicalFootprintV1,
  readOfficialCrossArmDimensionsV1,
  readOfficialModelBaseOutlineV1,
  isOfficialProfileBoundOutlineV1,
  evaluateOfficialCoherencyPlacementV1,
  evaluateOfficialPhysicalFootprintRelationV1,
  isOfficialPhysicalFootprintWhollyWithinRangeV1,
  OFFICIAL_PHYSICAL_GEOMETRY_TOLERANCE_MILLI_INCHES_V1,
  evaluateOfficialSweptPhysicalFootprintCollisionV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { deriveOfficialSemanticSurfaceSupportV1, deriveOfficialFinalPlacementSurfaceSupportV13 } from
  "../rule-atoms/official-semantic-surface-support-v1.mjs";
import { hasOfficialHighGroundFinalPlacementPolicyV13 } from
  "../rule-atoms/official-high-ground-final-placement-policy-v13.mjs";
import { deriveOfficialRoundModelGapMouthsV1 } from
  "../rule-atoms/official-gap-place-geometry-kernel-v1.mjs";
import { hasOfficialModelGapTransitPolicyV13, allowsOfficialModelGapSweepV13,
  usesOfficialGroundSizeClearanceV13, createOfficialGroundSizeClearanceFootprintV13,
  getOfficialGroundSizeClearanceDiameterV13, OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 } from
  "../rule-atoms/official-model-gap-transit-policy-v13.mjs";
import { projectOfficialContextualSupplyValueV1 } from
  "../rule-atoms/official-contextual-supply-projection-v1.mjs";
import { isOfficialGroundTerrainTraversalBlockedV13, projectOfficialRaptorStrainTerrainPermissionV13, hasOfficialLargeTerrainRemovalPolicyV1,
  inspectOfficialLargeMovementSourceV1 } from
  "../rule-atoms/official-movement-clearance-contract-v13.mjs";
import { assertOfficialSiegeModeActionAllowedV1 } from
  "../rule-atoms/official-status-stay-in-play-rules-kernel-v1.mjs";
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
  finishOfficialSelectedRosterActivationV1,
  openOfficialSelectedRosterAfterActionWindowV1,
  resolveOfficialSelectedRosterAbilityModifiersV1,
} from "./official-selected-roster-ability-runtime-v1.mjs";
import { OFFICIAL_PYLON_WARP_CONDUIT_DEFINITION_ID, projectOfficialBattlefieldAssetFamilyModifiersV1 } from
  "./official-battlefield-asset-family-adapter-v1.mjs";
import { resolveOfficialLogicalGrassRemovalV1, resolveOfficialLogicalLargeTerrainRemovalV1 } from
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
const MAX_LUNGE_UNION_BLOCKERS = 8;
const MAX_LUNGE_SEARCH_OBSTACLES = 16;
const LUNGE_RAY_SAMPLES_MILLI_INCHES = [125, 250, 500, 1000];
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
  throw officialSpatialRuleErrorV1(code, detail);
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
  const normalized = normalizeOfficialElevationV1(value || "ground");
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
function contourRelease(state) {
  return state.officialModelBaseGeometryDataBundle?.version === OFFICIAL_RAVEN_CONTOUR_GEOMETRY_BUNDLE_VERSION;
}
function usesFlyingMovement(state, piece) {
  return contourRelease(state) && isOfficialFlyingUnitV1(piece);
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
  if (shape === "measured_contour") {
    return Math.ceil(Math.max(...model.baseLocalVerticesMilliInches.map(vertex =>
      Math.hypot(vertex.xMilliInches, vertex.yMilliInches))));
  }
  if (shape === "orthogonal_cross") {
    const { horizontalArmDepthMilliInches: horizontal, verticalArmWidthMilliInches: vertical } = readOfficialCrossArmDimensionsV1(model);
    return Math.ceil(Math.max(Math.hypot(width, horizontal), Math.hypot(vertical, depth)) / 2);
  }
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
  if (shape === "measured_contour") {
    const bounds = contourLocalBounds(width, depth, model.baseLocalVerticesMilliInches, rotationDegrees);
    return { x: Math.max(-bounds.minX, bounds.maxX), y: Math.max(-bounds.minY, bounds.maxY) };
  }
  if (!["rectangle", "orthogonal_cross"].includes(shape) || width <= 0 || depth <= 0) {
    fail("SELECTED_SPATIAL_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
  const angle = (canonicalRotation(rotationDegrees) * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(angle));
  const sine = Math.abs(Math.sin(angle));
  if (shape === "orthogonal_cross") {
    const { horizontalArmDepthMilliInches: horizontal, verticalArmWidthMilliInches: vertical } = readOfficialCrossArmDimensionsV1(model);
    return {
      x: Math.max(width * cosine + horizontal * sine, vertical * cosine + depth * sine) / 2,
      y: Math.max(width * sine + horizontal * cosine, vertical * sine + depth * cosine) / 2,
    };
  }
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
  } else if (footprint.shape === "rectangle" && footprint.vertices?.length === 4
    || footprint.shape === "orthogonal_cross" && footprint.vertices?.length === 12
    || footprint.shape === "measured_contour" && footprint.vertices?.length >= 3) {
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
  // The saved policy selects current consumers while preserving older Room bindings.
  const characteristic = state.officialCharacteristicStatusFamilySourceBundle
    && hasOfficialCharacteristicConsumerPolicyV1(state)
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: 'movement' } }) : {};
  return resolveOfficialMovementSpeedV1(printed, [modifiers, characteristic, battlefield]);
}
function modelProfiles(piece) {
  return activePiece(piece) ? activeModels(piece).map((model) => ({
    modelId: model.id, baseShape: model.baseShape,
    baseWidthMilliInches: milli(model.baseWidthInches),
    baseDepthMilliInches: milli(model.baseDepthInches),
    ...readOfficialModelBaseOutlineV1(model),
    startPoint: modelPoint(model), startElevation: elevation(model.elevation),
    supportTerrainIds: [...new Set(model.supportTerrainIds || [])].sort(),
  })) : piece.models.filter((model) => model.isDestroyed !== true).map((model) => ({
    modelId: model.id, baseShape: model.baseShape,
    baseWidthMilliInches: milli(model.baseWidthInches),
    baseDepthMilliInches: milli(model.baseDepthInches),
    ...readOfficialModelBaseOutlineV1(model),
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
      if (isOfficialProfileBoundOutlineV1(model.baseShape)) {
        createOfficialModelBaseFootprintV1({ piece, model, dataBundle: state.officialModelBaseGeometryDataBundle,
          position: { xMilliInches: 0, yMilliInches: 0 } });
      } else verifyDeclaredBase(model);
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
// Read ports use the EXACT deployment validator calculation, even when the
// selected seat currently has no enabled deploy domain. No second calculator.
export {supplyAvailable as projectOfficialSelectedRosterDeploymentSupplyV1};
function actionContext(state, sideKey, piece, actionType) {
  phaseReady(state, sideKey, actionType);
  if (!piece || piece.sideKey !== sideKey || !livePiece(piece)) {
    fail("SELECTED_SPATIAL_UNIT_UNAVAILABLE", String(piece?.id || ""));
  }
  assertOfficialSiegeModeActionAllowedV1(state, piece, actionType);
  if (piece.isStructure === true) {
    fail("SELECTED_SPATIAL_STRUCTURE_CANNOT_PERFORM_ACTIONS", piece.id);
  }
  const profile = routeProfile(state, piece);
  if (profile.coreMovementProhibitedByNullSpeed === true) {
    fail('SELECTED_SPATIAL_NULL_SPEED_ACTION_PROHIBITED', piece.id);
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
    const supply = supplyAvailable(state, sideKey, piece.id);
    if (!supply.poolRequirementSatisfied) {
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
  return { profile, engagement };
}
export function projectOfficialRavenReserveEntrySegmentsV1(state, piece) {
  const route = resolveOfficialRavenReserveEntryRouteV1(state, piece);
  if (!route) return [];
  const binding = state.officialDeploymentGeometryBinding;
  const assigned = ['player1', 'player2'].map(side => binding?.entryEdgesByPlayer?.[side]?.segments);
  const directions = ['top', 'bottom', 'left', 'right'];
  const { widthInches, heightInches } = binding?.battlefield || {};
  if (assigned.some(segments => !Array.isArray(segments) || !segments.length
    || segments.some(segment => !directions.includes(segment.side)))
    || !Number.isFinite(widthInches) || widthInches <= 0
    || !Number.isFinite(heightInches) || heightInches <= 0
    || widthInches !== state.board.widthInches || heightInches !== state.board.heightInches) {
    fail('RAVEN_RESERVE_ENTRY_BATTLEFIELD_BINDING_REQUIRED', piece.id);
  }
  const assignedSides = new Set(assigned.flat().map(segment => segment.side));
  return directions.filter(side => !assignedSides.has(side)).map(side => ({
    kind: 'raven_neutral_table_edge', segmentId: 'raven-neutral-entry:' + side,
    side, startInches: 0, endInches: side === 'top' || side === 'bottom' ? widthInches : heightInches,
    fullTableEdge: true, generatesZoneOfInfluence: false,
    sourcePieceId: piece.id, definitionId: route.definitionId, sourceRouteHash: route.routeHash,
    enemyExclusionRangeMilliInches: route.enemyExclusionRangeMilliInches,
  }));
}

function entrySegments(state, sideKey, piece, supply) {
  const segments = state.officialDeploymentGeometryBinding
    ?.entryEdgesByPlayer?.[sideKey]?.segments;
  if (!Array.isArray(segments) || segments.length < 1) {
    fail("SELECTED_SPATIAL_ENTRY_EDGE_UNAVAILABLE", sideKey);
  }
  const alternate = unitEntryPerimeters(state,sideKey,piece,supply);
  return [...clone(segments), ...alternate, ...projectOfficialRavenReserveEntrySegmentsV1(state, piece)];
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
  const assets = state.officialBattlefieldAssetFamilySourceBundle;
  const ignoresPenalty = modifiers.ignoreDisengagePenalty
    || (state.officialRosterDisclosureDataBundle?.sourceBinding && assets?.routes.some(row => row.effectKind === 'orders')
      && projectOfficialBattlefieldAssetFamilyModifiersV1(assets, state, { pieceId: piece.id }).ignoreDisengagePenalty)
    || false;
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
  const supply = actionType === "deploy"
    ? supplyAvailable(state, sideKey, piece.id) : null;
  const raptorStrain = projectOfficialRaptorStrainTerrainPermissionV13(state, piece);
  const rosterReleased = state.officialRosterDisclosureDataBundle?.sourceBinding;
  const characteristic = state.officialCharacteristicStatusFamilySourceBundle;
  const coherencyRange = rosterReleased && characteristic
    ? projectOfficialHorizontalCoherencyV1(characteristic, state, {
      pieceId: piece.id, assumeDeployed: actionType === 'deploy',
    }).horizontalCoherencyMilliInches
    : milli(context.profile.movementProfile.horizontalCoherencyInches);
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
      ...(actionType==="disengage"&&supportsOfficialDisengageRemovalV1(state,piece)?{leadingOutcome:["placed","casualty"],placementOutcome:["placed","casualty"],
        casualtyRequiresNativeEndpointAbsenceProof:true}:{}),
      coordinateUnit: "milli-inch", maxRawPathPoints: MAX_RAW_PATH_POINTS,
      maxCanonicalPathPoints: MAX_CANONICAL_PATH_POINTS,
      exactRemainingPlacementCount: profiles.length - 1,
      ...officialGapInputContractV1(state),
      optional: state.officialModelGapTransitPolicy?.version === "2.0.0"
        ? ["elevationTransitions"] : ["elevationTransitions", "gapMouths", "coherencyGapMouths"],
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
      ...(usesFlyingMovement(state, piece) ? { flyingPointToPoint: true } : {}),
      battlefieldWidthMilliInches: milli(state.board.widthInches),
      battlefieldHeightMilliInches: milli(state.board.heightInches),
      maxDistanceMilliInches: milli(speed), speedAllowanceInches: speed,
      coherencyRangeMilliInches: coherencyRange,
      coherencyConstraintMode:
        "each_remaining_model_base_wholly_within_leading_model_range",
      coherencyCasualtyRequiresNoLegalPositionCertificate: true,
      engagedEnemyUnitIds: context.engagement.enemyUnitIds,
      engagementHash: context.engagement.engagementHash || null,
      entrySegments: actionType === "deploy" ? entrySegments(state, sideKey, piece, supply) : [],
      supply: actionType === "deploy" ? supply : null,
      modelBaseGeometryDataBundleHash:
        state.officialModelBaseGeometryDataBundle.bundleHash,
      terrainLosDataBundleHash: state.officialTerrainLosDataBundle.bundleHash,
      specialTerrainAgreementHash: state.board.specialTerrainAgreement.agreementHash,
      actionRouteCatalogueHash: state.officialActionRouteCatalogue.catalogueHash,
      raptorStrainRouteObserved: Boolean(raptorStrain),
      raptorStrainAvailableInDomain: Boolean(raptorStrain),
      ...(raptorStrain?.sourceDefinitionId ? { raptorStrainSourceDefinitionId: raptorStrain.sourceDefinitionId } : {}),
      successfulPlacementPathExact: true,
      ...(state.officialModelGapTransitPolicy?.version === "2.0.0" ? {
        groundMovementClearance: { diameterMilliInches: getOfficialGroundSizeClearanceDiameterV13(piece),
          sourceSection: "core:4.6", scope: "ground_level_path_only", finalPositionUsesActualBase: true,
          suppliedByRules: true },
      } : {}),
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

function canonicalPath(start, raw, domain, actionType, preserveWaypoints = false) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_RAW_PATH_POINTS) {
    fail("SELECTED_SPATIAL_PATH_DENOMINATOR_INVALID");
  }
  const flying = domain.constraints.flyingPointToPoint === true;
  const normalized = [{ ...start, elevation: flying ? "ground" : elevation(start.elevation),
    supportTerrainIds: flying ? [] : [...new Set(start.supportTerrainIds || [])].sort(),
    rotationDegrees: canonicalRotation(start.rotationDegrees) }];
  for (const [index, entry] of raw.entries()) {
    const next = { ...point(entry, "SELECTED_SPATIAL_PATH_POINT_INVALID", String(index)),
      elevation: flying ? "ground" : elevation(entry.elevation),
      supportTerrainIds: flying ? [] : [...new Set((entry.supportTerrainIds || []).map(String))].sort(),
      rotationDegrees: canonicalRotation(entry.rotationDegrees) };
    const previous = normalized.at(-1);
    if (distance(previous, next) > TOLERANCE
      || previous.elevation !== next.elevation) normalized.push(next);
  }
  if (flying && normalized.length > 2) normalized.splice(1, normalized.length - 2);
  if (normalized.length < 2) fail("SELECTED_SPATIAL_PATH_MUST_CHANGE_POSITION");
  if (flying && distance(normalized[0], normalized[1]) <= TOLERANCE) {
    fail("SELECTED_SPATIAL_PATH_MUST_CHANGE_POSITION");
  }
  const points = [];
  for (const entry of normalized) {
    // A reversal is collinear too, but consumes movement and can cross terrain.
    while (!preserveWaypoints && points.length >= 2
      && (points.at(-1).xMilliInches - points.at(-2).xMilliInches) * (entry.xMilliInches - points.at(-1).xMilliInches)
        + (points.at(-1).yMilliInches - points.at(-2).yMilliInches) * (entry.yMilliInches - points.at(-1).yMilliInches) >= 0
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
function contourLocalBounds(widthMilliInches, depthMilliInches, localVerticesMilliInches, rotationDegrees) {
  return physicalBounds(createOfficialPhysicalFootprintV1({ objectId: "boundary-contour", kind: "model_base",
    shape: "measured_contour", center: { xMilliInches: 0, yMilliInches: 0 },
    widthMilliInches, depthMilliInches, localVerticesMilliInches, rotationDegrees }));
}
function fullBaseInsideBoard(value, model, domain) {
  if (model.baseShape === "measured_contour") {
    const bounds = contourLocalBounds(milli(model.baseWidthInches), milli(model.baseDepthInches),
      model.baseLocalVerticesMilliInches, value.rotationDegrees);
    return value.xMilliInches + bounds.minX >= -TOLERANCE
      && value.xMilliInches + bounds.maxX <= domain.constraints.battlefieldWidthMilliInches + TOLERANCE
      && value.yMilliInches + bounds.minY >= -TOLERANCE
      && value.yMilliInches + bounds.maxY <= domain.constraints.battlefieldHeightMilliInches + TOLERANCE;
  }
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
  if (!segment || segment.kind !== 'unit_base_perimeter'
    && !new Set(["top", "bottom", "left", "right"]).has(segment.side)) {
    fail("SELECTED_SPATIAL_ENTRY_SEGMENT_INVALID", segmentId);
  }
  return segment;
}
export function resolveOfficialSelectedRosterDeployStartV1(domain, segment, along, modelProfile) {
  const halfWidth = Math.round(modelProfile.baseWidthMilliInches / 2);
  const halfDepth = Math.round(modelProfile.baseDepthMilliInches / 2);
  if (segment.kind === 'unit_base_perimeter') {
    if (!Number.isSafeInteger(along) || along < 0 || along > segment.maximumAlongEdgeMilliInches) {
      fail("SELECTED_SPATIAL_ENTRY_POINT_INVALID", segment.segmentId);
    }
    const angle = along / segment.radiusMilliInches;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    if (modelProfile.baseShape === "measured_contour") {
      const inwardVertex = modelProfile.localVerticesMilliInches.reduce((best, vertex) =>
        x * vertex.xMilliInches + y * vertex.yMilliInches < x * best.xMilliInches + y * best.yMilliInches
          ? vertex : best);
      return {
        xMilliInches: Math.round(segment.center.xMilliInches + x * segment.radiusMilliInches - inwardVertex.xMilliInches),
        yMilliInches: Math.round(segment.center.yMilliInches + y * segment.radiusMilliInches - inwardVertex.yMilliInches),
        elevation: segment.sourceElevation, supportTerrainIds: segment.supportTerrainIds,
      };
    }
    // Offset the entering model's support point onto the source circumference.
    const supportX = modelProfile.baseShape === 'round' ? x * halfWidth
      : Math.abs(x) < 1e-12 ? 0 : Math.sign(x) * halfWidth;
    const supportY = modelProfile.baseShape === 'round' ? y * halfDepth
      : Math.abs(y) < 1e-12 ? 0 : Math.sign(y) * halfDepth;
    return {
      xMilliInches: Math.round(segment.center.xMilliInches + x * segment.radiusMilliInches + supportX),
      yMilliInches: Math.round(segment.center.yMilliInches + y * segment.radiusMilliInches + supportY),
      elevation: segment.sourceElevation, supportTerrainIds: segment.supportTerrainIds,
    };
  }
  const minimum = milli(segment.startInches);
  const maximum = milli(segment.endInches);
  const horizontalEdge = segment.side === "top" || segment.side === "bottom";
  const bounds = modelProfile.baseShape === "measured_contour"
    ? contourLocalBounds(modelProfile.baseWidthMilliInches, modelProfile.baseDepthMilliInches,
      modelProfile.localVerticesMilliInches, 0)
    : { minX: -halfWidth, maxX: halfWidth, minY: -halfDepth, maxY: halfDepth };
  const edgeMin = horizontalEdge ? bounds.minX : bounds.minY;
  const edgeMax = horizontalEdge ? bounds.maxX : bounds.maxY;
  if (!Number.isSafeInteger(along) || along < minimum - edgeMin
    || along > maximum - edgeMax) {
    fail("SELECTED_SPATIAL_ENTRY_POINT_INVALID", segment.segmentId);
  }
  if (segment.side === "top") return { xMilliInches: along,
    yMilliInches: domain.constraints.battlefieldHeightMilliInches - bounds.minY,
    elevation: "ground" };
  if (segment.side === "bottom") return { xMilliInches: along,
    yMilliInches: -bounds.maxY, elevation: "ground" };
  if (segment.side === "left") return { xMilliInches: -bounds.maxX,
    yMilliInches: along, elevation: "ground" };
  return { xMilliInches: domain.constraints.battlefieldWidthMilliInches - bounds.minX,
    yMilliInches: along, elevation: "ground" };
}
function verifyDeployInward(segment, path) {
  if (segment.kind === 'unit_base_perimeter') return;
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
function burrowedTransitTargets(state, actor, actionType) {
  if (!ACTION_TYPES.includes(actionType) || state.officialCharacteristicConsumerPolicy?.burrowedBaseTransit !== true) return [];
  return state.pieces.filter(piece => piece.id !== actor.id && activePiece(piece)
    && isOfficialBurrowedCoreActorV1(state, piece));
}

function assertPathBoardAndModels(state, piece, leadingModel, path, domain, actionType, segment) {
  const gapPolicy = hasOfficialModelGapTransitPolicyV13(state);
  const newRelease = contourRelease(state);
  const flying = newRelease && isOfficialFlyingUnitV1(piece);
  const sizeClearance = !flying && usesOfficialGroundSizeClearanceV13(state, path);
  const localEntry = segment?.kind === 'unit_base_perimeter';
  const pointsToCheck = actionType === "deploy" && !localEntry ? path.points.slice(1) : path.points;
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
  // Tunneling changes transit only. Final geometry still checks every base.
  if (isOfficialBurrowedCoreActorV1(state, piece)
    && hasOfficialTunnelingClawsMovementV1(state, piece, actionType)) return [];
  if (flying && !localEntry) return [];
  const transit = new Set(burrowedTransitTargets(state, piece, actionType).map(target => target.id));
  const blockers = state.pieces.filter((entry) => (
    entry.id !== piece.id && activePiece(entry)
  )).flatMap(entry => activeModels(entry).filter(model => (
    localEntry && model.id === segment.sourceModelId
      || !flying && (!newRelease || !isOfficialFlyingUnitV1(entry)) && !transit.has(entry.id)
  )).map(model => ({
    pieceId: entry.id,
    modelId: model.id,
    footprint: createOfficialModelBaseFootprintV1({
      piece: entry,
      model,
      dataBundle: state.officialModelBaseGeometryDataBundle,
    }),
  })));
  const collisions = [];
  const actualPathFootprints = sizeClearance
    ? path.points.map(point => modelFootprintAt(state, piece, leadingModel, point)) : null;
  const clearanceFootprints = actualPathFootprints?.map(footprint => (
    createOfficialGroundSizeClearanceFootprintV13(piece, footprint)));
  for (let index = 1; index < path.points.length; index += 1) {
    for (const blocker of blockers) {
      const collision = sweptFootprintsCollide({
        movingStart: actualPathFootprints?.[index - 1] || modelFootprintAt(
          state, piece, leadingModel, path.points[index - 1],
        ),
        movingEnd: actualPathFootprints?.[index] || modelFootprintAt(
          state, piece, leadingModel, path.points[index],
        ),
        blocker: blocker.footprint,
      });
      const isEntrySource = localEntry && blocker.modelId === segment.sourceModelId;
      if (isEntrySource && index === 1 && !physicalSeparationWithinTolerance(
        modelFootprintAt(state, piece, leadingModel, path.points[0]), blocker.footprint)) {
        fail("SELECTED_SPATIAL_ENTRY_POINT_NOT_IN_BASE_CONTACT", segment.segmentId);
      }
      if (sizeClearance && !isEntrySource && sweptFootprintsCollide({ movingStart: clearanceFootprints[index - 1],
        movingEnd: clearanceFootprints[index], blocker: blocker.footprint })) {
        fail("SELECTED_SPATIAL_PATH_MODEL_CLEARANCE_INSUFFICIENT", blocker.modelId);
      }
      if (collision) {
        if (!gapPolicy || isEntrySource) fail("SELECTED_SPATIAL_PATH_MODEL_COLLISION", blocker.modelId);
        collisions.push({ index, blocker });
      }
    }
  }
  if (!collisions.length) return [];
  if (sizeClearance) {
    const body = { schema: "starcraft_tmg_host_ground_clearance_model_sweep_v1",
      actorUnitId: piece.id, actorSizeCharacteristic: Number(piece.sizeCharacteristic),
      clearanceDiameterMilliInches: getOfficialGroundSizeClearanceDiameterV13(piece),
      scope: "ground_level_transit", finalPositionUsesActualBase: true,
      pathHash: hashStarcraftTmgContract(path),
      boundaryFootprintHashes: [...new Set(collisions.map(row => row.blocker.footprint.footprintHash))].sort() };
    return [{ ...body, certificateHash: hashStarcraftTmgContract(body) }];
  }
  const gaps = deriveOfficialRoundModelGapMouthsV1({ state, actor: piece, path: path.points,
    boundaryModelIds: [...new Set(collisions.filter(row => row.blocker.footprint.shape === "round")
      .map(row => row.blocker.modelId))] });
  for (const { index, blocker } of collisions) {
    if (!allowsOfficialModelGapSweepV13({
      movingStart: modelFootprintAt(state, piece, leadingModel, path.points[index - 1]),
      movingEnd: modelFootprintAt(state, piece, leadingModel, path.points[index]),
      blocker: blocker.footprint, gaps,
    })) fail("SELECTED_SPATIAL_PATH_MODEL_COLLISION", blocker.modelId);
  }
  return gaps;
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

function assertForceWallTraversal(state, piece, leadingModel, path, placements) {
  const walls = readOfficialActiveForceWallFootprintsV1(state);
  if (!walls.length) return [];
  const crossed = walls.filter(wall => pathSweepsFootprint(
    state, piece, leadingModel, path.points, wall.footprint,
  ));
  const size = piece.sizeCharacteristic;
  const minimumSize = state.officialForceWallTraversalPolicy.minimumCrossingSize;
  if (crossed.length && (!Number.isSafeInteger(size) || size < minimumSize)) {
    fail("SELECTED_SPATIAL_FORCE_WALL_BLOCKS_SIZE_TWO_OR_LOWER", crossed[0].token.tokenId);
  }
  const remaining = walls.filter(wall => !crossed.includes(wall));
  if (remaining.length) {
    for (const position of placements) {
      const model = piece.models.find(entry => entry.id === position.modelId);
      const base = modelFootprintAt(state, piece, model, position);
      const occupied = remaining.find(wall => physicalInteriorsOverlap(base, wall.footprint));
      if (occupied) fail("SELECTED_SPATIAL_FORCE_WALL_ENDPOINT_OCCUPIED", occupied.token.tokenId);
    }
  }
  return crossed.map(wall => wall.token.tokenId).sort();
}
function prepareLargeTerrainRemoval(state, piece, leadingModel, path, placements) {
  if (!hasOfficialLargeTerrainRemovalPolicyV1(state) || !piece.officialLargeMovementTrait) {
    return { state, removal: null };
  }
  inspectOfficialLargeMovementSourceV1(state, piece);
  const pathBases = path.points.map(value => modelFootprintAt(state, piece, leadingModel, value));
  const finalBases = placements.map(value => modelFootprintAt(state, piece,
    piece.models.find(model => model.id === value.modelId), value));
  const tokenIds = new Set((state.board.tokens || []).map(token => token.tokenId || token.id));
  const contacts = (state.board.terrain || []).filter(terrain => terrain.isRemoved !== true
    && terrain.isDestroyed !== true && terrain.terrainKind === 'impassable'
    && [0, 1].includes(terrain.size) && !tokenIds.has(terrain.id)).filter(terrain => {
      const blockers = terrainPhysicalFootprints(terrain);
      return blockers.some(blocker => pathBases.slice(1).some((end, index) =>
        sweptFootprintsCollide({ movingStart: pathBases[index], movingEnd: end, blocker }))
        || finalBases.some(base => physicalInteriorsOverlap(base, blocker)));
    }).map(terrain => terrain.id);
  if (!contacts.length) return { state, removal: null };
  const expanded = resolveOfficialLogicalLargeTerrainRemovalV1(state, contacts);
  const removed = new Set(expanded.largeRemovedTerrainIds);
  const removal = { ...expanded, actorUnitId: piece.id,
    sourceFeatureHash: piece.officialLargeMovementTrait.sourceFeatureHash,
    tokenRemovalAllowed: false, leadingPathAndAllFinalBasesChecked: true };
  return { state: { ...state, board: { ...state.board,
    terrain: state.board.terrain.map(terrain => removed.has(terrain.id) ? { ...terrain, isRemoved: true } : terrain),
    accessPoints: (state.board.accessPoints || []).map(access => removed.has(access.terrainId)
      ? { ...access, isRemoved: true } : access) } }, removal };
}

export function assertOfficialRavenReserveEntryClearanceV1(state, piece, placements, segment) {
  if (segment?.kind !== 'raven_neutral_table_edge') return;
  const enemies = state.pieces.filter(enemy => enemy.sideKey !== piece.sideKey && activePiece(enemy))
    .flatMap(enemy => activeModels(enemy).map(model =>
      modelFootprintAt(state, enemy, model, modelPoint(model))));
  for (const position of placements) {
    const model = piece.models.find(entry => entry.id === position.modelId);
    const footprint = modelFootprintAt(state, piece, model, position);
    const limit = segment.enemyExclusionRangeMilliInches + TOLERANCE;
    if (enemies.some(enemy => evaluateOfficialPhysicalFootprintRelationV1({ left: footprint, right: enemy })
      .minimumSeparationMilliInches <= limit)) {
      fail('RAVEN_RESERVE_ENTRY_WITHIN_EIGHT_OF_ENEMY_MODEL', model.id);
    }
  }
}

function assertOutsideEnemyDeploymentZone(state, piece, placements) {
  const enemySide = piece.sideKey === 'player1' ? 'player2' : 'player1';
  const zones = state.officialDeploymentGeometryBinding.entryEdgesByPlayer[enemySide].segments.map(edge => {
    const { xMin, xMax, yMin, yMax } = edge.zoneRectangle;
    return createOfficialPhysicalFootprintV1({ objectId: edge.segmentId, kind: 'terrain', shape: 'rectangle',
      center: { xMilliInches: milli((xMin + xMax) / 2), yMilliInches: milli((yMin + yMax) / 2) },
      widthMilliInches: milli(xMax - xMin), depthMilliInches: milli(yMax - yMin), rotationDegrees: 0 });
  });
  for (const position of placements) {
    const model = piece.models.find(entry => entry.id === position.modelId);
    const footprint = modelFootprintAt(state, piece, model, position);
    if (zones.some(zone => physicalInteriorsOverlap(footprint, zone))) {
      fail('SELECTED_SPATIAL_DEPLOY_ENEMY_ZONE_OF_INFLUENCE', model.id);
    }
  }
}

export function applyOfficialLargeTerrainRemovalV1(state, piece, removal) {
  if (!removal) return;
  if (!hasOfficialLargeTerrainRemovalPolicyV1(state) || removal.actorUnitId !== piece.id
    || removal.sourceFeatureHash !== piece.officialLargeMovementTrait?.sourceFeatureHash) {
    fail('SELECTED_SPATIAL_LARGE_TERRAIN_REMOVAL_INVALID');
  }
  const removed = new Set(removal.largeRemovedTerrainIds);
  for (const terrain of state.board.terrain) if (removed.has(terrain.id)) {
    terrain.isRemoved = true;
    terrain.removedBy = { rule: 'official_large_movement', actorUnitId: piece.id,
      sourceFeatureHash: removal.sourceFeatureHash, round: Number(state.round), phase: state.phase };
  }
  for (const access of state.board.accessPoints || []) {
    if (removed.has(access.terrainId)) access.isRemoved = true;
  }
}

function deployTerrainResult(state, piece, path, placements) {
  const leadingModel = piece.models.find((entry) => (
    entry.id === path.leadingModelId
  ));
  const points = path.canonicalPath.points;
  const flying = usesFlyingMovement(state, piece);
  const sizeClearance = !flying && usesOfficialGroundSizeClearanceV13(state, path.canonicalPath);
  // Reuse only within this evaluation. Prepare lazily to retain the original
  // terrain/segment failure order and avoid constructing unvisited segments.
  const pathFootprints = [];
  const pathFootprintAt = (index) => (
    pathFootprints[index] ??= modelFootprintAt(
      state, piece, leadingModel, points[index],
    )
  );
  const clearanceFootprints = [];
  const ruleFootprintAt = index => sizeClearance
    ? (clearanceFootprints[index] ??= createOfficialGroundSizeClearanceFootprintV13(piece, pathFootprintAt(index)))
    : pathFootprintAt(index);
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
    const rulePathIntersects = sizeClearance ? blockers.some(blocker => points.slice(1).some((point, index) => (
      sweptFootprintsCollide({ movingStart: ruleFootprintAt(index), movingEnd: ruleFootprintAt(index + 1), blocker })
    ))) : pathIntersects;
    const endpointOverlap = flying && placements.some(position => {
      const model = piece.models.find(entry => entry.id === position.modelId);
      const footprint = modelFootprintAt(state, piece, model, position);
      return blockers.some(blocker => physicalInteriorsOverlap(footprint, blocker));
    });
    if ((flying ? endpointOverlap : pathIntersects) && kind === "grass") grassRemovedTerrainIds.push(terrain.id);
    if (flying && endpointOverlap && kind !== "grass") fail("SELECTED_SPATIAL_TERRAIN_ENDPOINT_UNSUPPORTED", terrain.id);
    if (!flying && rulePathIntersects && (kind === "impassable"
      || (kind === "ordinary" && Number(terrain.size) >= 2))) {
      fail("SELECTED_SPATIAL_DEPLOY_TERRAIN_BLOCKED", terrain.id);
    }
    interactions.push({ terrainId: terrain.id, terrainKind: kind,
      size: Number(terrain.size), pathIntersects,
      ...(sizeClearance ? { rulePathIntersects, sizeClearanceDiameterMilliInches: getOfficialGroundSizeClearanceDiameterV13(piece) } : {}),
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
function assertBurrowedEndpointClearance(state, piece, placements, actionType) {
  const targets = burrowedTransitTargets(state, piece, actionType);
  if (!targets.length) return;
  const footprints = targets.flatMap(target => activeModels(target).map(model => ({
    modelId: model.id, footprint: createOfficialModelBaseFootprintV1({
      piece: target, model, dataBundle: state.officialModelBaseGeometryDataBundle,
    }),
  })));
  for (const placement of placements) {
    const model = piece.models.find(entry => entry.id === placement.modelId);
    const landed = modelFootprintAt(state, piece, model, placement);
    for (const { modelId, footprint } of footprints) {
      const { minimumSeparationMilliInches } = evaluateOfficialPhysicalFootprintRelationV1({ left: landed, right: footprint });
      if (minimumSeparationMilliInches <= OFFICIAL_BURROWED_ENGAGEMENT_RANGE_MILLI_INCHES_V1) {
        fail("SELECTED_SPATIAL_ENDPOINT_WITHIN_BURROWED_ENGAGEMENT_RANGE", `${placement.modelId}:${modelId}`);
      }
    }
  }
}

function validateFinalGeometry(state, piece, domain, placements, leadingModelId,
  engagedEnemyUnitIds, options = {}) {
  assertBurrowedEndpointClearance(state, piece, placements, domain.actionType);
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
  path, placements, parameters, modelGaps = []) {
  if (!MOVEMENT_ACTION_TYPES.has(actionType)) return null;
  const finalPlacementPolicy = hasOfficialHighGroundFinalPlacementPolicyV13(state);
  const flying = usesFlyingMovement(state, piece);
  const sizeClearance = !flying && usesOfficialGroundSizeClearanceV13(state, path);
  if ((parameters.gapMouths || []).length > 0
    || (parameters.coherencyGapMouths || []).length > 0) {
    fail("SELECTED_SPATIAL_DECLARED_GAP_NOT_PRESENT_ON_CERTIFIED_BOARD");
  }
  const raptorStrain = projectOfficialRaptorStrainTerrainPermissionV13(state, piece);
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
    if (raptorStrain?.mayChangeElevationWithoutAccessPoints && !declared) {
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
  const finalSurfaceByModel = new Map(finalPlacementPolicy ? endpointFootprints.map(({ placement, footprint }) => (
    [placement.modelId, deriveOfficialFinalPlacementSurfaceSupportV13(state, footprint)]
  )) : []);
  const clearanceFootprints = sizeClearance ? pathFootprints.map(footprint => (
    createOfficialGroundSizeClearanceFootprintV13(piece, footprint))) : null;
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
    const rulePathIntersects = sizeClearance ? terrainFootprints.some(blocker => clearanceFootprints.slice(1).some((footprint, index) => (
      sweptFootprintsCollide({ movingStart: clearanceFootprints[index], movingEnd: footprint, blocker })
    ))) : pathIntersects;
    const endpointModelIds = endpointFootprints.filter(({ footprint }) => (
      terrainFootprints.some(right => physicalInteriorsOverlap(footprint, right))
    )).map(({ placement }) => placement.modelId).sort();
    const supportedEndpointModelIds = endpointFootprints.filter(
      ({ placement, footprint }) => {
        if (finalPlacementPolicy) return finalSurfaceByModel.get(placement.modelId)
          .supportTerrainIds.includes(terrain.id);
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
    if (kind === "grass" && ((!flying && pathIntersects) || endpointModelIds.length > 0)) {
      grassRemoved.add(terrain.id);
    }
    const accessUsed = accessPointUses.some((entry) => entry.terrainId === terrain.id);
    const sameLogicalSurfaceSweep = logicalSweep?.groups.some(group => group.covered
      && group.terrainGroupId === terrain.terrainGroupId
      && path.points.every(value => value.elevation === group.elevation)) === true;
    // Convex/union containment proves this is movement on the existing top,
    // without admitting an ascent or applying the final-position exception to transit.
    const sameHighGroundSweep = finalPlacementPolicy && kind === "ordinary"
      && Number(terrain.size) >= 3 && terrain.standableHorizontalSurface === true
      && path.points.every(point => point.elevation === "high")
      && officialRectangleUnionCoversBasesV1(terrain.footprintCells || [terrain.footprint], pathFootprints);
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
    const ordinaryTraversalAllowed = kind === "ordinary" && (accessUsed
      || raptorElevationOverrideUsed || sameLogicalSurfaceSweep
      || nativeTopSurfaceSweep || sameHighGroundSweep);
    const pathBlocked = !flying && rulePathIntersects
      && isOfficialGroundTerrainTraversalBlockedV13(piece, terrain, raptorStrain)
      && !ordinaryTraversalAllowed;
    if (pathBlocked) fail("SELECTED_SPATIAL_TERRAIN_PATH_BLOCKED", terrain.id);
    if (endpointModelIds.some((modelId) => !supportedEndpointModelIds.includes(modelId))
      && kind !== "grass") {
      fail("SELECTED_SPATIAL_TERRAIN_ENDPOINT_UNSUPPORTED", terrain.id);
    }
    interactions.push({ terrainId: terrain.id, terrainKind: kind,
      size: Number(terrain.size), pathIntersects, pathBlocked,
      ...(sizeClearance ? { rulePathIntersects, sizeClearanceDiameterMilliInches: getOfficialGroundSizeClearanceDiameterV13(piece) } : {}),
      endpointModelIds, supportedEndpointModelIds, accessUsed,
      ...(logicalSweep ? { sameLogicalSurfaceSweep, nativeTopSurfaceSweep } : {}),
      raptorStrainUsed: Boolean(raptorStrain)
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
    const semanticSurface = finalPlacementPolicy ? finalSurfaceByModel.get(placement.modelId)
      : deriveOfficialSemanticSurfaceSupportV1(state, modelFootprintAt(state, piece, model, placement));
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
    raptorStrainObserved: Boolean(raptorStrain),
    raptorStrainApplied: interactions.some((entry) => entry.raptorStrainUsed),
    ...(hasOfficialModelGapTransitPolicyV13(state) ? { hostDerivedModelGapCertificates: modelGaps } : {}),
    sourceRefreshPerformed: false,
    ...(finalPlacementPolicy ? { finalPlacementPolicyVersion: state.officialHighGroundFinalPlacementPolicy.version,
      finalSurfaceSupportByModel: Object.fromEntries(finalSurfaceByModel) } : {}),
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
  if (state.officialHostDerivedGapInputs) canonicalOfficialGapInputsV1(state, parameters);
  assertOfficialSiegeModeActionAllowedV1(state, piece, actionType);
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
  const modelGaps = assertPathBoardAndModels(state, piece, leadingModel, path, domain, actionType);
  const placements = canonicalPlacements(
    domain,
    leadingModelId,
    parameters.placements,
    path.points.at(-1),
  );
  const crossedForceWallTokenIds = assertForceWallTraversal(state, piece, leadingModel, path, placements);
  const large = prepareLargeTerrainRemoval(state, piece, leadingModel, path, placements);
  const geometryResult = validateFinalGeometry(
    large.state,
    piece,
    domain,
    placements,
    leadingModelId,
    [...new Set((input.currentlyEngagedEnemyUnitIds || []).map(String))].sort(),
    { allowEnemyEngagement: true },
  );
  const terrainPlan = specialTerrainResult(
    large.state,
    piece,
    actionType,
    domain,
    leadingModelId,
    path,
    placements,
    parameters,
    modelGaps,
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
    ...(state.officialForceWallTraversalPolicy ? { crossedForceWallTokenIds } : {}),
    ...(large.removal ? { largeTerrainRemoval: large.removal } : {}),
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
  return instantiateSpatialGeometry(state, domain, parameters);
}

function instantiateSpatialGeometry(state, domain, parameters, preserveWaypoints = false, skipRemoval = false, declarationRestriction = null) {
  const removalActor=state.pieces.find(p=>p.id===domain.pieceId);
  if(!skipRemoval&&domain.actionType==="disengage"&&supportsOfficialDisengageRemovalV1(state,removalActor)){
    if(parameters?.leadingOutcome==="casualty"||parameters?.placements?.some(p=>p.outcome==="casualty")){
      const restriction=postDisengageRestriction(state,removalActor,actionContext(state,domain.sideKey,removalActor,domain.actionType).engagement);
      return instantiateOfficialDisengageRemovalV1({state,domain,parameters,restriction,
        instantiatePlaced:(view,subset,p)=>instantiateSpatialGeometry(view,subset,p,preserveWaypoints,true,restriction)});
    }
    if(parameters?.leadingOutcome==="placed"){parameters={...parameters};delete parameters.leadingOutcome;}
  }
  if (!parametersAllowed(domain.actionType, parameters)) {
    fail("SELECTED_SPATIAL_PARAMETERS_INVALID");
  }
  const gapInputs = canonicalOfficialGapInputsV1(state, parameters);
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
    start = resolveOfficialSelectedRosterDeployStartV1(domain, segment,
      Number(parameters.entryAlongEdgeMilliInches), leadingProfile);
  } else {
    start = { ...leadingProfile.startPoint, elevation: leadingProfile.startElevation,
      supportTerrainIds: leadingProfile.supportTerrainIds,
      rotationDegrees: leadingModel.baseRotationDegrees || 0 };
  }
  const path = canonicalPath(start, parameters.path, domain, domain.actionType, preserveWaypoints);
  if (segment) verifyDeployInward(segment, path);
  const localEntry = segment?.kind === 'unit_base_perimeter';
  const modelGaps = assertPathBoardAndModels(state, piece, leadingModel, path, domain, domain.actionType, segment);
  const crossedForceFieldTokenIdsValue = crossedForceFieldTokenIds(
    state, piece, leadingModel, path);
  const endpoint = path.points.at(-1);
  const placements = canonicalPlacements(domain, leadingModelId,
    parameters.placements, endpoint);
  const crossedForceWallTokenIds = assertForceWallTraversal(state, piece, leadingModel, path, placements);
  if (localEntry) {
    assertUnitEntryElevation(state,segment,placements);
    assertOutsideEnemyDeploymentZone(state, piece, placements);
  }
  assertOfficialRavenReserveEntryClearanceV1(state, piece, placements, segment);
  const large = prepareLargeTerrainRemoval(state, piece, leadingModel, path, placements);
  const geometryResult = validateFinalGeometry(large.state, piece, domain,
    placements, leadingModelId, domain.constraints.engagedEnemyUnitIds);
  const tableEntry = domain.actionType === "deploy" && !localEntry;
  const terrainResult = tableEntry
    ? deployTerrainResult(large.state, piece, { leadingModelId, canonicalPath: path }, placements)
    : specialTerrainResult(large.state, piece, localEntry ? 'move' : domain.actionType, domain, leadingModelId,
      path, placements, parameters, modelGaps);
  const terrainFacts = tableEntry ? terrainResult : terrainResult.result;
  const restriction = domain.actionType === "disengage"
    ? declarationRestriction || postDisengageRestriction(state, piece,
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
    ...gapInputs,
  };
  const planBody = {
    schemaVersion: OFFICIAL_SELECTED_ROSTER_SPATIAL_PLAN_SCHEMA,
    semanticVersion: "1.0.0", actionType: domain.actionType,
    sideKey: domain.sideKey, pieceId: piece.id, leadingModelId,
    ...(hasOfficialModelGapTransitPolicyV13(state) ? { hostDerivedModelGapCertificates: modelGaps } : {}),
    domainId: domain.domainId, canonicalParameters,
    canonicalPath: path, finalModelPositions: placements,
    distanceTravelledInches: path.distanceMilliInches / 1000,
    speedAllowanceInches: domain.constraints.speedAllowanceInches,
    coherencyRangeMilliInches: domain.constraints.coherencyRangeMilliInches,
    coherencyPlacementResultHash: geometryResult.resultHash,
    specialTerrainPlanHash: tableEntry ? null : terrainResult.planHash,
    terrainResultHash: terrainFacts.resultHash,
    grassRemovedTerrainIds: terrainFacts.grassRemovedTerrainIds,
    ...(terrainFacts.logicalGrassRemoval ? { logicalGrassRemoval: terrainFacts.logicalGrassRemoval } : {}),
    ...(large.removal ? { largeTerrainRemoval: large.removal } : {}),
    crossedForceFieldTokenIds: crossedForceFieldTokenIdsValue,
    ...(state.officialForceWallTraversalPolicy ? { crossedForceWallTokenIds } : {}),
    forceFieldsRemovedBySizeThreeOrHigher:
      crossedForceFieldTokenIdsValue.length > 0,
    entrySegmentId: segment?.segmentId || null,
    entryAlongEdgeMilliInches: segment
      ? Number(parameters.entryAlongEdgeMilliInches) : null,
    ...(segment?.kind === 'raven_neutral_table_edge' ? { entrySource: {
      definitionId: segment.definitionId, sourcePieceId: segment.sourcePieceId, sourceRouteHash: segment.sourceRouteHash,
      entrySegmentId: segment.segmentId, enemyExclusionRangeMilliInches: segment.enemyExclusionRangeMilliInches,
    } } : {}),
    ...(localEntry ? {entrySource:unitEntryReceipt(segment,domain.constraints.supply.requestedSupply)} : {}),
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

function lungeMovementContext(state, triggerHash) {
  verifyRuntimeState(state);
  const route = state.officialReactionFamilySourceBundle?.routes.find(row =>
    row.definitionId === OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID && row.requiresRangedTargetSnapshot);
  const resolution = state.officialReactionResolutionHistory?.at(-1);
  const effect = resolution?.effects?.find(row => row.definitionId === route?.definitionId);
  if (!route || !effect || resolution.triggerHash !== triggerHash
    || resolution.consumedByHost !== true || resolution.round !== Number(state.round)
    || resolution.phase !== route.phase || state.phase !== route.phase
    || resolution.triggerKind !== route.triggerKind || state.pendingOfficialReactionWindow
    || resolution.resolutionHash !== hashStarcraftTmgContract(without(resolution, ['resolutionHash']))
    || effect.effectHash !== hashStarcraftTmgContract(without(effect, ['effectHash']))
    || effect.sourceFeatureHash !== route.sourceFeatureHash) fail('LUNGE_MOVE_RESOLUTION_REQUIRED');

  const followup = effect.followup;
  const actor = state.pieces.find(row => row.id === followup?.actorPieceId);
  const target = state.pieces.find(row => row.id === followup?.targetPieceId);
  if (followup?.actionType !== 'move' || followup.destinationConstraint !== route.destinationConstraint
    || followup.movementDistanceSource !== route.movementDistanceSource || actor?.id !== effect.sourcePieceId
    || target?.id !== effect.attackerPieceId || actor?.sideKey !== effect.sideKey
    || target?.sideKey !== resolution.activeSideKey || actor?.sideKey === target?.sideKey
    || !actor || !target || !activePiece(actor) || !activePiece(target) || actor.isStructure === true) {
    fail('LUNGE_MOVE_ACTOR_OR_TARGET_INVALID');
  }
  assertOfficialSiegeModeActionAllowedV1(state, actor, 'move');
  const profile = routeProfile(state, actor);
  if (profile.coreMovementProhibitedByNullSpeed === true) fail('SELECTED_SPATIAL_NULL_SPEED_ACTION_PROHIBITED', actor.id);
  const engagement = engagementSnapshot(state, actor);
  if (engagement.enemyUnitIds.length) fail('SELECTED_SPATIAL_ENGAGED_ACTION_PROHIBITED', actor.id);
  return { actor, target, resolution, effect,
    domain: domainFor(state, actor.sideKey, actor, 'move', { profile, engagement }) };
}

function lungeRouteBound(state, actor, model, endpoint, speedMilliInches) {
  const moving = createOfficialModelBaseFootprintV1({ piece: actor, model,
    dataBundle: state.officialModelBaseGeometryDataBundle });
  const start = moving.center;
  const chord = distance(start, endpoint);
  const witnesses = [];
  const blockers = [];
  const usesTunneling = isOfficialBurrowedCoreActorV1(state, actor)
    && hasOfficialTunnelingClawsMovementV1(state, actor, 'move');
  if (!usesTunneling && ['rectangle', 'round'].includes(moving.shape)) {
    const transit = new Set(burrowedTransitTargets(state, actor, 'move').map(row => row.id));
    const radius = Math.min(moving.widthMilliInches, moving.depthMilliInches) / 2;
    const guaranteedRadius = hasOfficialModelGapTransitPolicyV13(state)
      ? Math.min(radius, OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13.smallClearanceDiameterMilliInches / 2)
      : radius;
    for (const piece of state.pieces.filter(row => row.id !== actor.id && activePiece(row) && !transit.has(row.id))) {
      for (const blockerModel of activeModels(piece).filter(row => row.baseShape === 'round')) {
        const footprint = createOfficialModelBaseFootprintV1({ piece, model: blockerModel,
          dataBundle: state.officialModelBaseGeometryDataBundle });
        if (footprint.shape !== 'round') continue;
        // An inscribed disc survives any rotation of the translating base.
        // Leave room for swept-boundary tolerance and quantized gap interpolation.
        const forbiddenRadiusMilliInches = guaranteedRadius + footprint.radiusMilliInches - 4 * TOLERANCE;
        if (forbiddenRadiusMilliInches <= 0) continue;
        const blocker = { id: blockerModel.id, center: footprint.center, forbiddenRadiusMilliInches };
        blockers.push(blocker);
        const routes = measureOfficialSingleRoundBlockerPathsV1(start, endpoint,
          blocker);
        if (!routes || routes.minimumLength <= chord) continue;
        witnesses.push({ blockerModelId: blockerModel.id, blockerFootprintHash: footprint.footprintHash,
          forbiddenRadiusMilliInches, minimumLengthMilliInches: routes.minimumLength,
          clockwiseLowerBoundMilliInches: routes.clockwise,
          counterclockwiseLowerBoundMilliInches: routes.counterclockwise });
      }
    }
  }
  const alone = Math.max(chord, ...witnesses.map(row => row.minimumLengthMilliInches));
  const clearance = blocker => pointSegmentDistance(blocker.center, start, endpoint) - blocker.forbiddenRadiusMilliInches;
  const nearby = blockers.sort((left, right) => clearance(left) - clearance(right)
    || left.id.localeCompare(right.id)).slice(0, MAX_LUNGE_UNION_BLOCKERS);
  const union = nearby.length > 1 && witnesses.length
    ? measureOfficialRoundObstacleUnionPathBoundV1(start, endpoint, nearby) : null;
  const optimisticLength = Math.max(alone, union?.minimumLengthMilliInches ?? 0);
  const minimumRoundedLength = Math.max(0, Math.round(optimisticLength - 0.01));
  return { start: clone(start), end: clone(endpoint), movingFootprintHash: moving.footprintHash,
    speedMilliInches, directDistanceMilliInches: Math.round(chord),
    routeLengthLowerBoundMilliInches: minimumRoundedLength,
    exceedsMoveBudget: minimumRoundedLength > speedMilliInches + TOLERANCE,
    obstacleWitnesses: witnesses.sort((left, right) => left.blockerModelId.localeCompare(right.blockerModelId)),
    ...(union ? { unionWitness: { ...union, blockerIds: nearby.map(blocker => blocker.id).sort(),
      singleBlockerLowerBoundMilliInches: Math.round(alone - 0.01) } } : {}),
    proofScope: 'fixed_endpoint_planar_relaxation', trainingTruth: false };
}

export function projectOfficialLungeMovePathLowerBoundV1(state, triggerHash, { leadingModelId, endpoint } = {}) {
  const { actor, domain, resolution } = lungeMovementContext(state, triggerHash);
  const model = activeModels(actor).find(row => row.id === leadingModelId);
  if (!model) fail('SELECTED_SPATIAL_LEADING_MODEL_INVALID', leadingModelId);
  return seal({ triggerHash, resolutionHash: resolution.resolutionHash, leadingModelId,
    ...lungeRouteBound(state, actor, model, point(endpoint), domain.constraints.maxDistanceMilliInches) }, 'boundHash');
}

function lungeTargetBases(state, target) {
  return activeModels(target).map(model => ({ modelId: model.id,
    footprint: createOfficialModelBaseFootprintV1({ piece: target, model,
      dataBundle: state.officialModelBaseGeometryDataBundle }) }));
}

function lungeDistancesToTarget(footprint, targetBases) {
  const rows = targetBases.map(reference => ({ ...reference,
    distance: evaluateOfficialPhysicalFootprintRelationV1({ left: footprint,
      right: reference.footprint }).minimumSeparationMilliInches }));
  const distanceToUnit = Math.min(...rows.map(reference => reference.distance));
  return { distanceToUnit, nearest: rows.filter(reference => reference.distance === distanceToUnit) };
}

function lungeSearchEnvelope(footprint, halfX, halfY, clearanceRadius) {
  const padding = 2 * TOLERANCE;
  const corners = (left, bottom, right, top) => [
    { xMilliInches: left, yMilliInches: bottom }, { xMilliInches: right, yMilliInches: bottom },
    { xMilliInches: right, yMilliInches: top }, { xMilliInches: left, yMilliInches: top },
  ];
  if (footprint.shape !== 'round') {
    const bounds = physicalBounds(footprint);
    return bounds ? corners(Math.floor(bounds.minX - halfX - padding), Math.floor(bounds.minY - halfY - padding),
      Math.ceil(bounds.maxX + halfX + padding), Math.ceil(bounds.maxY + halfY + padding)) : null;
  }
  const [x, y] = [footprint.center.xMilliInches, footprint.center.yMilliInches];
  // Minkowski sum of the moving base's fixed-heading rectangular envelope
  // and a circumscribed round blocker polygon. Snap the hull vertices outward.
  const count = 16;
  const radius = (footprint.radiusMilliInches + (clearanceRadius ?? 0) + padding) / Math.cos(Math.PI / count);
  return convexHullOfficialPathPointsV1(Array.from({ length: count }, (_, index) => {
    const theta = (index + 0.5) * 2 * Math.PI / count;
    const offsetX = radius * Math.cos(theta), offsetY = radius * Math.sin(theta);
    const vertexX = x + Math.sign(offsetX) * Math.ceil(Math.abs(offsetX));
    const vertexY = y + Math.sign(offsetY) * Math.ceil(Math.abs(offsetY));
    if (clearanceRadius !== undefined) return [{ xMilliInches: vertexX, yMilliInches: vertexY }];
    return corners(Math.floor(vertexX - halfX), Math.floor(vertexY - halfY),
      Math.ceil(vertexX + halfX), Math.ceil(vertexY + halfY));
  }).flat());
}

function lungeGroundSearchObstacles(state, actor, start, halfX, halfY, speed) {
  const relevant = { minX: start.xMilliInches - speed - halfX, maxX: start.xMilliInches + speed + halfX,
    minY: start.yMilliInches - speed - halfY, maxY: start.yMilliInches + speed + halfY };
  const transit = new Set(burrowedTransitTargets(state, actor, 'move').map(row => row.id));
  const movingThroughModels = isOfficialBurrowedCoreActorV1(state, actor)
    && hasOfficialTunnelingClawsMovementV1(state, actor, 'move');
  const models = movingThroughModels ? [] : state.pieces
    .filter(piece => activePiece(piece) && piece.id !== actor.id && !transit.has(piece.id))
    .flatMap(piece => activeModels(piece).map(model => createOfficialModelBaseFootprintV1({ piece, model,
      dataBundle: state.officialModelBaseGeometryDataBundle })));
  const raptorStrain = projectOfficialRaptorStrainTerrainPermissionV13(state, actor);
  const terrain = state.board.terrain.filter(entry => entry.isRemoved !== true && entry.isDestroyed !== true
    && isOfficialGroundTerrainTraversalBlockedV13(actor, entry, raptorStrain)
    && boundsMayTouch(relevant, terrainRectangle(entry))).flatMap(terrainPhysicalFootprints);
  return [...models, ...terrain].filter(footprint => boundsMayTouch(relevant, physicalBounds(footprint)));
}

function groundLungeRoundBlockers(state, actor, start, end, speed, clearance) {
  return lungeGroundSearchObstacles(state, actor, start, clearance, clearance, speed)
    .filter(footprint => footprint.kind === 'model_base' && footprint.shape === 'round')
    .map(footprint => ({ id: footprint.objectId, center: footprint.center,
      forbiddenRadiusMilliInches: clearance + footprint.radiusMilliInches - OFFICIAL_PHYSICAL_GEOMETRY_TOLERANCE_MILLI_INCHES_V1 }))
    .filter(blocker => blocker.forbiddenRadiusMilliInches > 0)
    .sort((left, right) =>
      pointSegmentDistance(left.center, start, end) - left.forbiddenRadiusMilliInches
      - pointSegmentDistance(right.center, start, end) + right.forbiddenRadiusMilliInches
      || left.id.localeCompare(right.id)).slice(0, MAX_LUNGE_UNION_BLOCKERS);
}

function groundLungeRoundClearance(state, actor, path, speed) {
  if (!usesOfficialGroundSizeClearanceV13(state, path)
    || projectOfficialRaptorStrainTerrainPermissionV13(state, actor)?.mayChangeElevationWithoutAccessPoints) return null;
  const start = path.points[0], end = path.points.at(-1);
  const reachableElevationPort = (state.board.specialTerrainAgreement.terrainEntries || []).some(entry =>
    (entry.accessPoints || []).some(port => (port.connects || []).includes('ground')
      && pointRectangleDistance(start, terrainRectangle({ id: port.accessPointId, footprint: port.footprint }))
        <= speed + TOLERANCE + 0.5));
  // An alternative that could reach a port may use a different sweep rule.
  if (reachableElevationPort) return null;
  const clearance = getOfficialGroundSizeClearanceDiameterV13(actor) / 2;
  const blockers = groundLungeRoundBlockers(state, actor, start, end, speed, clearance);
  return { groundClearanceRadiusMilliInches: clearance, blockers };
}

function groundLungeRoundLowerBound(state, actor, path, speed) {
  const clearance = groundLungeRoundClearance(state, actor, path, speed);
  if (!clearance) return null;
  const start = path.points[0], end = path.points.at(-1);
  const { blockers } = clearance;
  const relaxation = measureOfficialRoundObstacleUnionPathBoundV1(start, end, blockers);
  if (!relaxation || !relaxation.shortestPathGraph?.length) return null;
  return { ...clearance,
    routeLengthLowerBoundMilliInches: Math.round(relaxation.minimumLengthMilliInches - 0.0001),
    selectedDiscPathGraph: relaxation.shortestPathGraph };
}

function lungeGridAnchor(origin, direction, tangent) {
  const tangentLength = Math.hypot(tangent.x, tangent.y);
  if (tangentLength <= TOLERANCE) return null;
  let best = null;
  for (let x = -3; x <= 3; x += 1) {
    for (let y = -3; y <= 3; y += 1) {
      const length = Math.hypot(x, y);
      if (length <= TOLERANCE || x * direction.x + y * direction.y <= 0
        || Math.abs(x * direction.y - y * direction.x) > TOLERANCE) continue;
      const excess = length - (x * tangent.x + y * tangent.y) / tangentLength;
      if (!best || excess < best.excess) {
        best = { excess, anchor: { xMilliInches: origin.xMilliInches + x, yMilliInches: origin.yMilliInches + y } };
      }
    }
  }
  return best?.anchor ?? null;
}

function lungeRoundedDetourCandidates(start, end, direction, lower) {
  const { selectedDiscPathGraph, blockers } = lower;
  const departures = selectedDiscPathGraph.filter(edge => edge.fromIndex === 0).slice(0, 2);
  const arrivals = selectedDiscPathGraph.filter(edge => edge.toIndex === 1).slice(0, 2);
  const paths = [];
  for (const first of departures) {
    const departure = lungeGridAnchor(start, direction, {
      x: first.end.xMilliInches - first.start.xMilliInches, y: first.end.yMilliInches - first.start.yMilliInches,
    });
    if (!departure) continue;
    for (const last of arrivals) {
      const arrival = lungeGridAnchor(end, { x: -direction.x, y: -direction.y }, {
        x: last.start.xMilliInches - last.end.xMilliInches, y: last.start.yMilliInches - last.end.yMilliInches,
      });
      if (!arrival) continue;
      const geodesic = measureOfficialRoundObstacleUnionPathBoundV1(departure, arrival, blockers);
      if (!geodesic) continue;
      // Leave room for the original start and the forced departure/return segments.
      const minimum = distance(start, departure) + geodesic.minimumLengthMilliInches + distance(arrival, end);
      if (Math.round(minimum - 0.0001) > lower.routeLengthLowerBoundMilliInches) continue;
      const rounded = realizeOfficialRoundObstacleGeodesicsV1(geodesic, blockers, {
        maxPaths: 2, maxBendRadians: 0.043, radialPadding: 0.5, refineOnGrid: true,
        maxWaypoints: MAX_CANONICAL_PATH_POINTS - 3,
      });
      for (const trail of rounded) paths.push([departure, ...trail, end]);
    }
  }
  return paths;
}

export function searchOfficialLungeMoveGeometryV1(state, triggerHash, request) {
  const { actor, target, domain } = lungeMovementContext(state, triggerHash);
  const model = activeModels(actor).find(row => row.id === request.leadingModelId);
  if (!model) fail('SELECTED_SPATIAL_LEADING_MODEL_INVALID', request.leadingModelId);
  const moving = createOfficialModelBaseFootprintV1({ piece: actor, model,
    dataBundle: state.officialModelBaseGeometryDataBundle });
  const start = moving.center, end = point(request.endpoint);
  const speed = domain.constraints.maxDistanceMilliInches;
  const bounds = lungeRouteBound(state, actor, model, end, speed);
  const candidates = [];
  const rejected = new Set();
  const tried = new Set();
  const reply = status => ({ status, bounds, candidates: candidates.sort((left, right) =>
    left.spatialPlan.canonicalPath.distanceMilliInches - right.spatialPlan.canonicalPath.distanceMilliInches
      || left.geometryHash.localeCompare(right.geometryHash)), rejected: [...rejected].sort(),
  triedPaths: tried.size, completeSearch: false, trainingTruth: false });
  if (bounds.exceedsMoveBudget) return reply('fixed_endpoint_exceeds_speed');
  if (elevation(model.elevation) !== 'ground' || elevation(request.endpoint.elevation) !== 'ground') {
    return reply('ground_route_search_unavailable');
  }
  const rotationDegrees = model.baseRotationDegrees ?? 0;
  const waypoint = value => ({ ...value, elevation: 'ground', rotationDegrees });
  function check(path, reference) {
    const key = hashStarcraftTmgContract(path);
    if (tried.has(key)) return;
    tried.add(key);
    let geometry;
    try {
      geometry = inspectOfficialLungeMoveGeometryV1(state, triggerHash, { leadingModelId: model.id,
        path: path.map(waypoint), placements: request.placements });
    } catch (error) {
      if (typeof error?.message !== 'string'
        || !/^(SELECTED_SPATIAL_|MODEL_BASE_GEOMETRY_|SPECIAL_TERRAIN_|FORCE_WALL_|LUNGE_MOVE_)/u.test(error.message)) throw error;
      rejected.add(error.message.split(':')[0]);
      return;
    }
    if (reference ? geometry.bypassReferenceModelIds.includes(reference.modelId) : geometry.referencesOnRay.length) {
      candidates.push(geometry);
    }
  }
  check([end], null);
  if (candidates.length) return reply('candidate_geometry_found');

  const clearanceRadius = usesOfficialGroundSizeClearanceV13(state, { points: [waypoint(start), waypoint(end)] })
    ? getOfficialGroundSizeClearanceDiameterV13(actor) / 2 : undefined;
  const half = clearanceRadius === undefined ? modelHalfExtents(model, rotationDegrees) : { x: clearanceRadius, y: clearanceRadius };
  const roundBlockers = clearanceRadius === undefined ? []
    : groundLungeRoundBlockers(state, actor, start, end, speed, clearanceRadius);
  const roundLower = roundBlockers.length
    ? groundLungeRoundLowerBound(state, actor, { points: [waypoint(start), waypoint(end)] }, speed) : null;
  const footprints = lungeGroundSearchObstacles(state, actor, start, half.x, half.y, speed)
    .sort((left, right) => pointSegmentDistance(left.center, start, end) - pointSegmentDistance(right.center, start, end)
      || left.objectId.localeCompare(right.objectId)).slice(0, MAX_LUNGE_SEARCH_OBSTACLES);
  const pathSearch = createOfficialConvexObstaclePathSearchV1(footprints.map(footprint =>
    lungeSearchEnvelope(footprint, half.x, half.y, clearanceRadius)).filter(Boolean));
  const { nearest } = lungeDistancesToTarget(moving, lungeTargetBases(state, target));
  for (const reference of nearest) {
    const center = reference.footprint.center;
    const length = distance(start, center);
    if (length <= TOLERANCE) continue;
    const dx = (center.xMilliInches - start.xMilliInches) / length;
    const dy = (center.yMilliInches - start.yMilliInches) / length;
    if (roundLower && pointSegmentDistance(end, start, center) <= TOLERANCE) {
      for (const path of lungeRoundedDetourCandidates(start, end, { x: dx, y: dy }, roundLower)) check(path, reference);
    }
    const offset = (origin, travel) => ({ xMilliInches: Math.round(origin.xMilliInches + dx * travel),
      yMilliInches: Math.round(origin.yMilliInches + dy * travel) });
    if (roundBlockers.length) {
      for (const travel of [2, 8]) {
        const departure = offset(start, travel), arrival = offset(end, -travel);
        const relaxed = measureOfficialRoundObstacleUnionPathBoundV1(departure, arrival, roundBlockers);
        for (const radialPadding of [0, 0.35, 0.75]) {
          for (const vertices of realizeOfficialRoundObstacleGeodesicsV1(relaxed, roundBlockers, { radialPadding })) {
            check([departure, ...vertices, end], reference);
          }
        }
      }
    }
    for (const departure of LUNGE_RAY_SAMPLES_MILLI_INCHES.map(value => offset(start, value))) {
      if (!pathSearch.edgeClear(start, departure)) continue;
      for (const arrival of LUNGE_RAY_SAMPLES_MILLI_INCHES.map(value => offset(end, -value))) {
        if (!pathSearch.edgeClear(arrival, end)) continue;
        const around = pathSearch.shortestPath(departure, arrival);
        if (!around) continue;
        check([...around, end], reference);
      }
    }
  }
  return reply(candidates.length ? 'candidate_geometry_found' : 'no_candidate_in_search');
}

// The reaction owner still requires direction, leader, and formation proof
// before it may commit. This sub-step compares lower bounds to a Native path.
export function inspectOfficialLungeMoveGeometryV1(state, triggerHash, parameters) {
  return inspectLungeMoveGeometry(state, triggerHash, parameters, lungeMovementContext(state, triggerHash));
}

function inspectLungeMoveGeometry(state, triggerHash, parameters, { actor, target, domain, resolution, effect }) {
  const { canonicalParameters, action: { spatialPlan } } = instantiateSpatialGeometry(state, domain, parameters, true);
  const targetBases = lungeTargetBases(state, target);
  const modelDistances = activeModels(actor).map(model => {
    const start = createOfficialModelBaseFootprintV1({ piece: actor, model,
      dataBundle: state.officialModelBaseGeometryDataBundle });
    const end = modelFootprintAt(state, actor, model, spatialPlan.finalModelPositions.find(row => row.modelId === model.id));
    const { nearest, distanceToUnit: from } = lungeDistancesToTarget(start, targetBases);
    return { modelId: model.id, from, to: lungeDistancesToTarget(end, targetBases).distanceToUnit,
      closestReferenceModels: nearest.map(reference => ({
        modelId: reference.modelId, center: reference.footprint.center,
        straightLineLowerBoundMilliInches: distance(start.center, reference.footprint.center),
      })) };
  });
  const leader = modelDistances.find(row => row.modelId === spatialPlan.leadingModelId);
  if (leader.to > leader.from) fail('LUNGE_MOVE_ENDS_FURTHER_FROM_ATTACKER', leader.modelId);

  const [start, ...steps] = spatialPlan.canonicalPath.points;
  function movesInOriginalDirection(center, from, to) {
    const dx = center.xMilliInches - start.xMilliInches;
    const dy = center.yMilliInches - start.yMilliInches;
    const sx = to.xMilliInches - from.xMilliInches;
    const sy = to.yMilliInches - from.yMilliInches;
    return dx * sx + dy * sy > 0 && Math.abs(dx * sy - dy * sx) <= Math.hypot(dx, dy) * TOLERANCE;
  }
  function followsRay(center, path) {
    const dx = center.xMilliInches - start.xMilliInches;
    const dy = center.yMilliInches - start.yMilliInches;
    const length = Math.hypot(dx, dy);
    let previousProjection = 0;
    for (const step of path) {
      const ex = step.xMilliInches - start.xMilliInches;
      const ey = step.yMilliInches - start.yMilliInches;
      const dot = dx * ex + dy * ey;
      if (dot <= previousProjection || dot > length * (length + TOLERANCE)
        || Math.abs(dx * ey - dy * ex) > length * TOLERANCE) return false;
      previousProjection = dot;
    }
    return true;
  }
  const referencesOnRay = leader.closestReferenceModels.filter(reference =>
    followsRay(reference.center, steps)).map(reference => reference.modelId);
  const endpoint = steps.at(-1);
  const bypassReferenceModelIds = steps.length >= 3 ? leader.closestReferenceModels.filter(({ modelId, center }) =>
    !referencesOnRay.includes(modelId) && movesInOriginalDirection(center, start, steps[0])
      && movesInOriginalDirection(center, steps.at(-2), endpoint)).map(reference => reference.modelId) : [];
  const directDistance = Math.round(distance(start, endpoint));
  const leadingModel = activeModels(actor).find(model => model.id === spatialPlan.leadingModelId);
  const pathBounds = lungeRouteBound(state, actor, leadingModel, point(endpoint), domain.constraints.maxDistanceMilliInches);
  if (steps.length > 1 && spatialPlan.canonicalPath.distanceMilliInches > directDistance + TOLERANCE
    && !canonicalParameters.elevationTransitions.length
    && leader.closestReferenceModels.some(reference => followsRay(reference.center, [endpoint]))) {
    let direct;
    try {
      direct = instantiateSpatialGeometry(state, domain, { ...canonicalParameters, path: [endpoint] }, true);
    } catch (error) {
      if (typeof error?.message !== 'string'
        || !/^(SELECTED_SPATIAL_|MODEL_BASE_GEOMETRY_|SPECIAL_TERRAIN_|FORCE_WALL_)/u.test(error.message)) throw error;
    }
    if (direct) fail('LUNGE_MOVE_ROUTE_LONGER_THAN_LEGAL_DIRECT_PATH', leader.modelId);
  }
  return seal({ schemaVersion: 'starcraft_tmg_official_lunge_move_geometry_v1', triggerHash,
    resolutionHash: resolution.resolutionHash, effectHash: effect.effectHash, phase: state.phase,
    actorPieceId: actor.id, targetPieceId: target.id, canonicalParameters, spatialPlan,
    modelDistances, referencesOnRay, bypassReferenceModelIds, directDistanceLowerBoundMilliInches: directDistance,
    pathBounds: { ...pathBounds, acceptedLengthMilliInches: spatialPlan.canonicalPath.distanceMilliInches,
      shortestForFixedEndpointsProven: pathBounds.routeLengthLowerBoundMilliInches === spatialPlan.canonicalPath.distanceMilliInches },
    trainingTruth: false }, 'geometryHash');
}

export function projectOfficialLungeGroundDetourProofV1(state, triggerHash, parameters) {
  const geometry = inspectOfficialLungeMoveGeometryV1(state, triggerHash, parameters);
  const actor = state.pieces.find(piece => piece.id === geometry.actorPieceId);
  const { canonicalPath } = geometry.spatialPlan;
  const lower = groundLungeRoundLowerBound(state, actor, canonicalPath, geometry.pathBounds.speedMilliInches);
  const leader = geometry.modelDistances.find(model => model.modelId === geometry.spatialPlan.leadingModelId);
  const start = canonicalPath.points[0], end = canonicalPath.points.at(-1);
  const returnsToRay = leader.closestReferenceModels.some(reference =>
    geometry.bypassReferenceModelIds.includes(reference.modelId)
    && pointSegmentDistance(end, start, reference.center) <= TOLERANCE);
  const certifiedShortest = Boolean(lower && returnsToRay
    && lower.routeLengthLowerBoundMilliInches === canonicalPath.distanceMilliInches);
  return seal({ schemaVersion: 'starcraft_tmg_official_lunge_ground_detour_proof_v1',
    triggerHash, geometryHash: geometry.geometryHash,
    parameters: geometry.canonicalParameters, acceptedLengthMilliInches: canonicalPath.distanceMilliInches,
    originalRayRejoined: returnsToRay, lower, certifiedShortest, trainingTruth: false }, 'proofHash');
}

function lungeReferenceDirection(start, referenceCenter) {
  const length = distance(start, referenceCenter);
  if (length <= TOLERANCE) return null;
  return { x: (referenceCenter.xMilliInches - start.xMilliInches) / length,
    y: (referenceCenter.yMilliInches - start.yMilliInches) / length };
}

function strongestLungeForwardBound(start, direction, progress, blockers, certifiedJointObstacles = false) {
  const bounds = blockers.map(blocker => measureOfficialRoundObstacleForwardPathBoundV1(start, direction, progress, blocker))
    .filter(Boolean);
  // Ignoring the other obstacles in each calculation only relaxes the route.
  const single = bounds.sort((left, right) => right.minimumLengthMilliInches - left.minimumLengthMilliInches
    || left.blockerId.localeCompare(right.blockerId))[0] ?? null;
  if (!certifiedJointObstacles) return single;
  const joint = measureOfficialRoundObstacleUnionForwardPathBoundV1(start, direction, progress, blockers);
  return joint && (!single || joint.minimumLengthMilliInches > single.minimumLengthMilliInches + 0.0001)
    ? joint : single;
}

function lungeGroundForwardProof(state, geometry, certifiedJointObstacles = false) {
  const { canonicalPath, leadingModelId } = geometry.spatialPlan;
  const start = canonicalPath.points[0], end = canonicalPath.points.at(-1);
  const leader = geometry.modelDistances.find(model => model.modelId === leadingModelId);
  const actor = state.pieces.find(piece => piece.id === geometry.actorPieceId);
  const clearance = groundLungeRoundClearance(state, actor, canonicalPath, geometry.pathBounds.speedMilliInches);
  const references = [];
  if (clearance) {
    for (const reference of leader.closestReferenceModels) {
      if (!geometry.bypassReferenceModelIds.includes(reference.modelId)) continue;
      const direction = lungeReferenceDirection(start, reference.center);
      if (!direction) continue;
      const progress = (end.xMilliInches - start.xMilliInches) * direction.x
        + (end.yMilliInches - start.yMilliInches) * direction.y;
      const lower = strongestLungeForwardBound(start, direction, progress, clearance.blockers, certifiedJointObstacles);
      if (!lower) continue;
      const bound = Math.round(lower.minimumLengthMilliInches - 0.0001);
      references.push({ modelId: reference.modelId, lowerBoundMilliInches: bound, continuousBound: lower,
        certifiedShortest: bound === canonicalPath.distanceMilliInches });
    }
  }
  return seal({ schemaVersion: 'starcraft_tmg_official_lunge_ground_forward_proof_v1',
    geometryHash: geometry.geometryHash, acceptedLengthMilliInches: canonicalPath.distanceMilliInches,
    references, certifiedShortest: references.some(row => row.certifiedShortest), trainingTruth: false }, 'proofHash');
}

export function projectOfficialLungeGroundForwardProofV1(state, triggerHash, parameters, { certifiedJointObstacles = false } = {}) {
  return lungeGroundForwardProof(state, inspectOfficialLungeMoveGeometryV1(state, triggerHash, parameters), certifiedJointObstacles);
}

export function searchOfficialLungeGroundForwardPathsV1(state, triggerHash, request, { certifiedJointObstacles = false } = {}) {
  const { actor, target, domain } = lungeMovementContext(state, triggerHash);
  const model = activeModels(actor).find(row => row.id === request.leadingModelId);
  if (!model) fail('SELECTED_SPATIAL_LEADING_MODEL_INVALID', request.leadingModelId);
  const progress = request.forwardProgressMilliInches;
  if (!Number.isSafeInteger(progress) || progress <= 0 || progress > domain.constraints.maxDistanceMilliInches + TOLERANCE) {
    fail('LUNGE_MOVE_FORWARD_PROGRESS_INVALID');
  }
  const choices = [];
  const rejected = new Set();
  const reply = () => ({ status: choices.length ? 'candidate_geometry_found' : 'no_candidate_in_search',
    completeSearch: false, choices, rejected: [...rejected].sort(), trainingTruth: false });
  if (elevation(model.elevation) !== 'ground') return reply();
  const moving = createOfficialModelBaseFootprintV1({ piece: actor, model,
    dataBundle: state.officialModelBaseGeometryDataBundle });
  const start = moving.center;
  const waypoint = value => ({ ...value, elevation: 'ground', rotationDegrees: model.baseRotationDegrees ?? 0 });
  const tested = new Set();
  for (const reference of lungeDistancesToTarget(moving, lungeTargetBases(state, target)).nearest) {
    const direction = lungeReferenceDirection(start, reference.footprint.center);
    if (!direction) continue;
    const offset = (origin, amount) => ({ xMilliInches: Math.round(origin.xMilliInches + direction.x * amount),
      yMilliInches: Math.round(origin.yMilliInches + direction.y * amount) });
    const clearance = groundLungeRoundClearance(state, actor,
      { points: [waypoint(start), waypoint(offset(start, progress))] }, domain.constraints.maxDistanceMilliInches);
    if (!clearance) continue;
    const lower = strongestLungeForwardBound(start, direction, progress, clearance.blockers, certifiedJointObstacles);
    if (!lower) continue;
    for (const branch of lower.branches) {
      const departure = lungeGridAnchor(start, direction, { x: branch.initialTangent.xMilliInches - start.xMilliInches,
        y: branch.initialTangent.yMilliInches - start.yMilliInches });
      const end = offset(branch.endpoint, 0);
      const arrival = offset(end, -2);
      if (!departure || distance(end, arrival) <= TOLERANCE) continue;
      const graph = measureOfficialRoundObstacleUnionPathBoundV1(departure, arrival, clearance.blockers);
      for (const trail of realizeOfficialRoundObstacleGeodesicsV1(graph, clearance.blockers, {
        maxPaths: 2, maxBendRadians: 0.043, radialPadding: 0.5, refineOnGrid: true,
        maxWaypoints: MAX_CANONICAL_PATH_POINTS - 3,
      })) {
        const path = [departure, ...trail, end].map(waypoint);
        const key = hashStarcraftTmgContract(path);
        if (tested.has(key)) continue;
        tested.add(key);
        try {
          const geometry = inspectOfficialLungeMoveGeometryV1(state, triggerHash,
            { leadingModelId: model.id, path, placements: request.placements });
          if (!geometry.bypassReferenceModelIds.includes(reference.modelId)) continue;
          choices.push({ geometry, proof: lungeGroundForwardProof(state, geometry, certifiedJointObstacles) });
        } catch (error) {
          if (typeof error?.message !== 'string'
            || !/^(SELECTED_SPATIAL_|MODEL_BASE_GEOMETRY_|SPECIAL_TERRAIN_|FORCE_WALL_|LUNGE_MOVE_)/u.test(error.message)) throw error;
          rejected.add(error.message.split(':')[0]);
        }
      }
    }
  }
  choices.sort((left, right) => left.proof.acceptedLengthMilliInches - right.proof.acceptedLengthMilliInches
    || left.proof.proofHash.localeCompare(right.proof.proofHash));
  return reply();
}

// The full Move accepts the placements first. For round and rectangular models
// the lead footprint expanded by the coherency radius is convex, so the whole
// follower footprint is inside it. This gives a lower bound without sampling
// placements or excluding rotations the actual Rules allow.
export function projectOfficialLungeClosestFormationProofV1(state, triggerHash, parameters) {
  return lungeClosestFormationProof(state, inspectOfficialLungeMoveGeometryV1(state, triggerHash, parameters));
}

function lungeFollowerTargetSeparation(models, leadingDistance, coherencyRange) {
  const separation = OFFICIAL_ENGAGEMENT_RANGE_V2_MILLI_INCHES + 1;
  const addsCoherencyBound = models.every(model => ['round', 'rectangle'].includes(model.baseShape));
  const coherencyBound = addsCoherencyBound
    ? leadingDistance - coherencyRange - OFFICIAL_PHYSICAL_GEOMETRY_TOLERANCE_MILLI_INCHES_V1 : 0;
  return { separation, coherencyBound, lowerBound: Math.max(separation, coherencyBound) };
}

function lungeClosestFormationProof(state, geometry) {
  const { spatialPlan, modelDistances, triggerHash } = geometry;
  const actor = state.pieces.find(piece => piece.id === geometry.actorPieceId);
  const target = state.pieces.find(piece => piece.id === geometry.targetPieceId);
  const ground = piece => (piece.combatTags || []).some(tag => String(tag).toLowerCase() === 'ground');
  if (!ground(actor) || !ground(target)) fail('LUNGE_FORMATION_GROUND_SCOPE_REQUIRED');
  const leader = modelDistances.find(model => model.modelId === spatialPlan.leadingModelId);
  // Standard Move stops outside the inclusive engagement range. Use the same
  // rounded edge-distance boundary as the engagement graph, before certifying
  // a formation that the older placement tolerance alone would accept.
  const separation = OFFICIAL_ENGAGEMENT_RANGE_V2_MILLI_INCHES + 1;
  const enemies = state.pieces.filter(piece => piece.sideKey !== actor.sideKey && ground(piece) && activePiece(piece));
  const enemyBases = enemies.flatMap(enemy => lungeTargetBases(state, enemy));
  const finalPositions = new Map(spatialPlan.finalModelPositions.map(position => [position.modelId, position]));
  const models = activeModels(actor);
  for (const model of models) {
    const footprint = modelFootprintAt(state, actor, model, finalPositions.get(model.id));
    if (lungeDistancesToTarget(footprint, enemyBases).distanceToUnit < separation) {
      fail('LUNGE_FORMATION_ENDS_WITHIN_ENGAGEMENT_RANGE', model.id);
    }
  }
  const range = spatialPlan.coherencyRangeMilliInches;
  // For these shapes, Native's wholly-within predicate proves containment.
  // With any other shape only the independent non-engagement floor is used.
  const { coherencyBound, lowerBound } = lungeFollowerTargetSeparation(models, leader.to, range);
  const followers = modelDistances.filter(model => model.modelId !== leader.modelId)
    .map(model => ({ modelId: model.modelId, distanceToTargetMilliInches: model.to,
      optimalityGapMilliInches: model.to - lowerBound }));
  const allReachBound = followers.every(model => model.optimalityGapMilliInches === 0);
  return seal({ schemaVersion: 'starcraft_tmg_official_lunge_closest_formation_proof_v1',
    triggerHash, geometryHash: geometry.geometryHash, leadingModelId: leader.modelId,
    leadingDistanceToTargetMilliInches: leader.to, targetPieceId: geometry.targetPieceId,
    coherencyRangeMilliInches: range, nonEngagedLowerBoundMilliInches: separation,
    coherencyLowerBoundMilliInches: Math.max(coherencyBound, 0),
    followerDistanceLowerBoundMilliInches: lowerBound, followers,
    closestFormationProvenForThisLeaderEndpoint: allReachBound, trainingTruth: false }, 'proofHash');
}

// Even after rotating, the rectangle stays inside its circumcircle. To reach
// any round target, both integer center coordinates must enter its expanded
// bounding box. This also bounds paths with detours or multiple waypoints.
function lungeAxisTravelBound(footprint, outerRadius, targetBases, separation) {
  if (footprint.shape !== 'rectangle' || !targetBases?.length) return 0;
  let shortest = Infinity;
  for (const { footprint: target } of targetBases) {
    if (target.shape !== 'round') return 0;
    // The kernel rounds edge separation to an integer and rotated vertices
    // to six decimal places. Enlarge the box before rounding to the grid.
    const extent = Math.floor(outerRadius + target.radiusMilliInches + separation + 0.5 + 0.000002);
    const dx = Math.abs(footprint.center.xMilliInches - target.center.xMilliInches);
    const dy = Math.abs(footprint.center.yMilliInches - target.center.yMilliInches);
    shortest = Math.min(shortest, Math.max(0, dx - extent, dy - extent));
  }
  return shortest;
}

function lungeAlternativeLeaderBounds(state, geometry, targetSeparation, certifiedAxisLeaderBound) {
  const { spatialPlan, modelDistances } = geometry;
  const { leadingModelId } = spatialPlan;
  const actor = state.pieces.find(piece => piece.id === geometry.actorPieceId);
  const models = new Map(activeModels(actor).map(model => [model.id, model]));
  const targetBases = certifiedAxisLeaderBound
    ? lungeTargetBases(state, state.pieces.find(piece => piece.id === geometry.targetPieceId)) : null;
  return modelDistances.filter(model => model.modelId !== leadingModelId).map(row => {
    const footprint = createOfficialModelBaseFootprintV1({ piece: actor, model: models.get(row.modelId),
      dataBundle: state.officialModelBaseGeometryDataBundle });
    const { shape, radiusMilliInches: radius, widthMilliInches: width, depthMilliInches: depth } = footprint;
    if (shape !== 'round' && shape !== 'rectangle') {
      return { modelId: row.modelId, optimisticDistanceMilliInches: 0 };
    }
    const inner = shape === 'round' ? radius : Math.min(width, depth) / 2;
    const outer = shape === 'round' ? radius : Math.hypot(width, depth) / 2;
    // Two edge measurements can each round by half a milli-inch. Round the
    // lower bound down and leave one full unit for that combined tolerance.
    const optimisticDistanceMilliInches = Math.max(
      Math.floor(row.from - (outer - inner) - targetSeparation - 1),
      lungeAxisTravelBound(footprint, outer, targetBases, targetSeparation),
    );
    return { modelId: row.modelId, optimisticDistanceMilliInches };
  });
}

// Reaching the nearest legal separation gives a route witness. Compare it
// with a lower bound for every other possible leader, allowing even the most
// favorable rotation and ignoring route obstacles in the alternatives' favor.
function proveLungeLeaderAndFormation(state, geometry, detourProof, leaderWitness, certifiedAxisLeaderBound) {
  const formation = lungeClosestFormationProof(state, geometry);
  const { spatialPlan } = geometry;
  const targetSeparation = formation.nonEngagedLowerBoundMilliInches;
  const alternatives = lungeAlternativeLeaderBounds(state, geometry, targetSeparation, certifiedAxisLeaderBound);
  const routeLength = spatialPlan.canonicalPath.distanceMilliInches;
  const reachedTargetBoundary = formation.leadingDistanceToTargetMilliInches === targetSeparation;
  const exactDirectRoute = geometry.referencesOnRay.length > 0 && geometry.pathBounds.shortestForFixedEndpointsProven;
  const exactDetour = detourProof?.certifiedShortest === true;
  const comparisonLength = leaderWitness?.lengthMilliInches ?? routeLength;
  const shortestLeaderProven = ((reachedTargetBoundary && (exactDirectRoute || exactDetour)) || Boolean(leaderWitness))
    && alternatives.every(row => row.optimisticDistanceMilliInches >= comparisonLength);
  return seal({ schemaVersion: 'starcraft_tmg_official_lunge_leader_and_formation_proof_v1',
    geometryHash: geometry.geometryHash, formation, alternatives, routeLengthMilliInches: routeLength,
    ...(exactDetour ? { groundForwardProofHash: detourProof.proofHash } : {}),
    ...(leaderWitness ? { leaderWitness } : {}),
    reachedTargetBoundary, exactDirectRoute, shortestLeaderProven, trainingTruth: false }, 'proofHash');
}

function certifyLungeLeaderWitness(state, triggerHash, geometry, parameters, certifiedJointObstacles, certifiedAxisLeaderBound) {
  const leaderId = geometry.spatialPlan.leadingModelId;
  const leader = geometry.modelDistances.find(model => model.modelId === leaderId);
  const targetSeparation = OFFICIAL_ENGAGEMENT_RANGE_V2_MILLI_INCHES + 1;
  if (!object(parameters) || parameters.leadingModelId !== leaderId || leader.to <= targetSeparation) {
    fail('LUNGE_MOVE_LEADER_WITNESS_INVALID');
  }
  const context = lungeMovementContext(state, triggerHash);
  const comparisonLimit = Math.min(...lungeAlternativeLeaderBounds(state, geometry, targetSeparation, certifiedAxisLeaderBound)
    .map(row => row.optimisticDistanceMilliInches));
  if (!Number.isSafeInteger(comparisonLimit) || comparisonLimit <= 0) fail('LUNGE_MOVE_LEADER_WITNESS_UNPROVEN');
  // This geometry is only a comparison against other leaders. The committed
  // plan has already been checked against the actor's real Move allowance.
  const witnessDomain = { ...context.domain, constraints: { ...context.domain.constraints,
    maxDistanceMilliInches: comparisonLimit, speedAllowanceInches: inches(comparisonLimit) } };
  const witness = inspectLungeMoveGeometry(state, triggerHash, parameters, { ...context, domain: witnessDomain });
  const detour = witness.bypassReferenceModelIds.length ? lungeGroundForwardProof(state, witness, certifiedJointObstacles) : undefined;
  const ranking = proveLungeLeaderAndFormation(state, witness, detour, undefined, certifiedAxisLeaderBound);
  if (!ranking.reachedTargetBoundary || !ranking.shortestLeaderProven) fail('LUNGE_MOVE_LEADER_WITNESS_UNPROVEN');
  return { canonicalParameters: witness.canonicalParameters, summary: seal({
    geometryHash: witness.geometryHash, rankingProofHash: ranking.proofHash,
    lengthMilliInches: ranking.routeLengthMilliInches, comparisonLimitMilliInches: comparisonLimit,
    actualMoveLimitMilliInches: context.domain.constraints.maxDistanceMilliInches,
  }, 'witnessHash') };
}

// Extend only the final forward segment of an already validated proposal.
// The comparison route is private to the proof and never applied as movement.
export function searchOfficialLungeLeaderWitnessV1(state, triggerHash, parameters, { certifiedJointObstacles = false, certifiedAxisLeaderBound = false } = {}) {
  const context = lungeMovementContext(state, triggerHash);
  const geometry = inspectLungeMoveGeometry(state, triggerHash, parameters, context);
  const { actor, target } = context;
  const { canonicalPath, leadingModelId } = geometry.spatialPlan;
  const path = canonicalPath.points;
  const end = path.at(-1);
  const previous = path.at(-2);
  if (geometry.modelDistances.length < 2 || !previous
    || path.some(step => step.elevation !== 'ground')
    || geometry.canonicalParameters.elevationTransitions.length) return null;

  const separation = OFFICIAL_ENGAGEMENT_RANGE_V2_MILLI_INCHES + 1;
  const alternatives = lungeAlternativeLeaderBounds(state, geometry, separation, certifiedAxisLeaderBound);
  const remaining = Math.min(...alternatives.map(row => row.optimisticDistanceMilliInches))
    - canonicalPath.distanceMilliInches;
  if (remaining <= 0) return null;
  const moving = activeModels(actor).find(model => model.id === leadingModelId);
  const direction = lungeReferenceDirection(previous, end);
  if (!direction) return null;

  const references = lungeTargetBases(state, target);
  const pointAt = offset => ({ ...end,
    xMilliInches: Math.round(end.xMilliInches + direction.x * offset),
    yMilliInches: Math.round(end.yMilliInches + direction.y * offset) });
  for (const reference of references) {
    const center = reference.footprint.center;
    const forwardLimit = (center.xMilliInches - end.xMilliInches) * direction.x
      + (center.yMilliInches - end.yMilliInches) * direction.y;
    const limit = Math.min(remaining, Math.floor(forwardLimit));
    const measured = offset => lungeDistancesToTarget(
      modelFootprintAt(state, actor, moving, pointAt(offset)), [reference]).distanceToUnit;
    if (limit < 1 || measured(0) <= separation || measured(limit) > separation) continue;

    let low = 1;
    let high = limit;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (measured(middle) <= separation) high = middle;
      else low = middle + 1;
    }
    for (let offset = Math.max(1, low - 2); offset <= Math.min(limit, low + 2); offset++) {
      if (measured(offset) !== separation) continue;
      const witness = { ...geometry.canonicalParameters, path: [...path.slice(0, -1), pointAt(offset)] };
      try {
        return certifyLungeLeaderWitness(state, triggerHash, geometry, witness, certifiedJointObstacles, certifiedAxisLeaderBound).canonicalParameters;
      } catch (error) {
        if (!/^(?:SELECTED_SPATIAL_|MODEL_BASE_GEOMETRY_|SPECIAL_TERRAIN_|FORCE_WALL_|LUNGE_MOVE_)/u
          .test(error?.message || '')) throw error;
      }
    }
  }
  return null;
}

const LUNGE_FORMATION_RAY_COUNT = 24;
const LUNGE_FORMATION_MAX_POINTS_PER_FOLLOWER = 24;
const LUNGE_FORMATION_MAX_PACKING_STEPS = 1024;
const LUNGE_FORMATION_MAX_COMPLETE_PLANS = 24;

function lungeFollowerShellPoint(state, actor, model, rotationDegrees, target, direction, separation) {
  const { center } = target;
  const location = radius => ({
    xMilliInches: Math.round(center.xMilliInches + direction.x * radius),
    yMilliInches: Math.round(center.yMilliInches + direction.y * radius),
    rotationDegrees, elevation: 'ground', supportTerrainIds: [],
  });
  const footprintAt = radius => modelFootprintAt(state, actor, model, location(radius));
  // For these convex bases, the Minkowski sum contains the ray origin.
  // Along a ray, distance from that sum never decreases before rounding.
  const gap = radius => evaluateOfficialPhysicalFootprintRelationV1({
    left: footprintAt(radius), right: target,
  }).minimumSeparationMilliInches;
  let low = 1;
  let high = Math.ceil(Math.hypot(model.baseWidthInches, model.baseDepthInches) * 500
    + Math.hypot(target.widthMilliInches, target.depthMilliInches) / 2 + separation + 3);
  if (!Number.isSafeInteger(high) || gap(high) < separation) return null;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (gap(middle) < separation) low = middle + 1;
    else high = middle;
  }
  return gap(low) === separation ? location(low) : null;
}

// Advisor only. Native certifies the full path, every placement and the
// complete leader/formation proof before exposing a proposed action.
export function* searchOfficialLungeFormationCandidatesV1(state, triggerHash, move) {
  const { actor, target, domain } = lungeMovementContext(state, triggerHash);
  const models = activeModels(actor);
  const leader = models.find(model => model.id === move.leadingModelId);
  if (!leader) fail('SELECTED_SPATIAL_LEADING_MODEL_INVALID', move.leadingModelId);
  const path = canonicalPath(modelPoint(leader), move.path, domain, 'move');
  const end = path.points.at(-1);
  if (move.elevationTransitions?.length || path.points.some(step => step.elevation !== 'ground')
    || models.some(model => !['round', 'rectangle'].includes(model.baseShape)
      || elevation(model.elevation) !== 'ground')) return;
  const followers = models.filter(model => model.id !== leader.id);
  if (!followers.length) { yield []; return; }

  const leaderBase = modelFootprintAt(state, actor, leader, end);
  const targets = lungeTargetBases(state, target);
  if (targets.some(row => !['round', 'rectangle'].includes(row.footprint.shape))) return;
  const nearest = lungeDistancesToTarget(leaderBase, targets);
  const range = domain.constraints.coherencyRangeMilliInches;
  const { separation, lowerBound } = lungeFollowerTargetSeparation(models, nearest.distanceToUnit, range);
  const field = state.pieces.filter(piece => activePiece(piece) && piece.id !== actor.id);
  const modelBases = piece => activeModels(piece).filter(model => elevation(model.elevation) === 'ground')
    .map(model => createOfficialModelBaseFootprintV1({ piece, model,
      dataBundle: state.officialModelBaseGeometryDataBundle }));
  const blockers = field.flatMap(modelBases);
  const enemies = field.filter(piece => piece.sideKey !== actor.sideKey
    && piece.combatTags?.some(tag => String(tag).toLowerCase() === 'ground'))
    .flatMap(piece => lungeTargetBases(state, piece));
  const sortedTargets = [...targets].sort((a, b) => distance(a.footprint.center, end) - distance(b.footprint.center, end));

  const options = followers.map(model => {
    const rotations = model.baseShape === 'round' ? [model.baseRotationDegrees ?? 0]
      : [...new Set([model.baseRotationDegrees ?? 0, 0, 45, 90, 135])];
    const rows = new Map();
    for (const { footprint: targetBase } of sortedTargets) {
      const facing = Math.atan2(end.yMilliInches - targetBase.center.yMilliInches,
        end.xMilliInches - targetBase.center.xMilliInches);
      for (let index = 0; index < LUNGE_FORMATION_RAY_COUNT; index++) {
        const angle = facing + (index % 2 ? 1 : -1) * Math.ceil(index / 2) * 2 * Math.PI / LUNGE_FORMATION_RAY_COUNT;
        const direction = { x: Math.cos(angle), y: Math.sin(angle) };
        for (const rotation of rotations) {
          const candidate = lungeFollowerShellPoint(state, actor, model, rotation, targetBase, direction, lowerBound);
          if (!candidate) continue;
          const footprint = modelFootprintAt(state, actor, model, candidate);
          if (!isOfficialPhysicalFootprintWhollyWithinRangeV1({ source: leaderBase, target: footprint, rangeMilliInches: range })
            || physicalInteriorsOverlap(leaderBase, footprint)
            || blockers.some(base => physicalInteriorsOverlap(base, footprint))
            || lungeDistancesToTarget(footprint, targets).distanceToUnit !== lowerBound
            || lungeDistancesToTarget(footprint, enemies).distanceToUnit < separation) continue;
          const key = [candidate.xMilliInches, candidate.yMilliInches, rotation].join(',');
          rows.set(key, { placement: { modelId: model.id, ...candidate }, footprint });
          if (rows.size >= LUNGE_FORMATION_MAX_POINTS_PER_FOLLOWER) return [...rows.values()];
        }
      }
    }
    return [...rows.values()];
  }).sort((left, right) => left.length - right.length);

  let packingSteps = 0;
  let completePlans = 0;
  function* pack(index, selected) {
    if (index === options.length) {
      completePlans++;
      yield selected.map(row => row.placement);
      return;
    }
    for (const row of options[index]) {
      if (packingSteps++ >= LUNGE_FORMATION_MAX_PACKING_STEPS || completePlans >= LUNGE_FORMATION_MAX_COMPLETE_PLANS) return;
      if (!selected.some(other => physicalInteriorsOverlap(other.footprint, row.footprint))) {
        yield* pack(index + 1, [...selected, row]);
      }
    }
  }
  yield* pack(0, []);
}

export function projectOfficialLungeLeaderAndFormationProofV1(state, triggerHash, parameters, { certifiedMultiModelDetour = false, certifiedJointObstacles = false, certifiedAxisLeaderBound = false } = {}) {
  const geometry = inspectOfficialLungeMoveGeometryV1(state, triggerHash, parameters);
  const detour = certifiedMultiModelDetour && geometry.bypassReferenceModelIds.length
    ? lungeGroundForwardProof(state, geometry, certifiedJointObstacles) : undefined;
  return proveLungeLeaderAndFormation(state, geometry, detour, undefined, certifiedAxisLeaderBound);
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

export function instantiateOfficialLungeMoveActionV1(state, triggerHash, moveParameters, {
  certifiedMultiModel = false, certifiedForwardDetour = false, certifiedMultiModelDetour = false,
  certifiedLeaderWitness = false, certifiedJointObstacles = false, certifiedAxisLeaderBound = false,
} = {}) {
  const hasWitness = object(moveParameters) && Object.hasOwn(moveParameters, 'leaderRouteWitness');
  if (hasWitness && !certifiedLeaderWitness) fail('SELECTED_SPATIAL_PARAMETERS_INVALID');
  const { leaderRouteWitness, ...actualParameters } = hasWitness ? moveParameters : {};
  const geometry = inspectOfficialLungeMoveGeometryV1(state, triggerHash, hasWitness ? actualParameters : moveParameters);
  const actor = state.pieces.find(piece => piece.id === geometry.actorPieceId);
  const multiModel = geometry.modelDistances.length > 1;
  if (hasWitness && !multiModel) fail('LUNGE_MOVE_LEADER_WITNESS_INVALID');
  let detourProof;
  if (!geometry.referencesOnRay.length || !geometry.pathBounds.shortestForFixedEndpointsProven) {
    if (!certifiedForwardDetour || multiModel && !certifiedMultiModelDetour) fail('LUNGE_MOVE_GLOBAL_PROOF_REQUIRED');
    detourProof = lungeGroundForwardProof(state, geometry, certifiedJointObstacles);
    if (!detourProof.certifiedShortest) fail('LUNGE_MOVE_GLOBAL_PROOF_REQUIRED');
    if (!multiModel) lungeClosestFormationProof(state, geometry);
  }
  let formationProof;
  let routeWitness;
  if (multiModel) {
    if (!certifiedMultiModel) fail('LUNGE_MOVE_GLOBAL_PROOF_REQUIRED');
    if (hasWitness) routeWitness = certifyLungeLeaderWitness(state, triggerHash, geometry, leaderRouteWitness, certifiedJointObstacles, certifiedAxisLeaderBound);
    formationProof = proveLungeLeaderAndFormation(state, geometry, detourProof, routeWitness?.summary, certifiedAxisLeaderBound);
    if (!formationProof.shortestLeaderProven || !formationProof.formation.closestFormationProvenForThisLeaderEndpoint) {
      fail('LUNGE_MOVE_LEADER_OR_FORMATION_PROOF_REQUIRED');
    }
  }
  if (!state.log?.at(-1)?.events.some(event => event.type === 'reaction_window_closed'
    && event.triggerHash === triggerHash)) fail('LUNGE_MOVE_CONTINUATION_STALE');
  return freezeDeep({ actionType: 'move', sideKey: actor.sideKey, phase: state.phase, pieceId: actor.id,
    spatialPlan: geometry.spatialPlan, ruleAtomIds: [...ATOMS_BY_ACTION.move],
    ...(routeWitness ? { leaderRouteWitness: routeWitness.canonicalParameters } : {}),
    executorId: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION,
    lungeAuthorization: { triggerHash, effectHash: geometry.effectHash, resolutionHash: geometry.resolutionHash,
      geometryHash: geometry.geometryHash, targetPieceId: geometry.targetPieceId,
      ...(detourProof ? { groundForwardProofHash: detourProof.proofHash } : {}),
      ...(routeWitness ? { leaderRouteWitnessHash: routeWitness.summary.witnessHash } : {}),
      ...(formationProof ? { leaderAndFormationProofHash: formationProof.proofHash } : {}) } });
}

export function officialLungeMoveCanonicalParametersV1(action) {
  return action.leaderRouteWitness
    ? { ...action.spatialPlan.canonicalParameters, leaderRouteWitness: action.leaderRouteWitness }
    : action.spatialPlan.canonicalParameters;
}

export function applyOfficialLungeMoveActionV1(state, action, options = {}, proofOptions = {}) {
  if (action?.actionType !== 'move' || !action.lungeAuthorization || !action.spatialPlan?.canonicalParameters) {
    fail('LUNGE_MOVE_ACTION_INVALID');
  }
  if (state.spatialActionHistory?.some(row => row.event?.lungeAuthorization?.triggerHash
    === action.lungeAuthorization.triggerHash)) fail('LUNGE_MOVE_ALREADY_RESOLVED');
  const current = instantiateOfficialLungeMoveActionV1(state, action.lungeAuthorization.triggerHash,
    officialLungeMoveCanonicalParametersV1(action), proofOptions);
  if (!isDeepStrictEqual(current, action)) fail('LUNGE_MOVE_ACTION_STALE');
  return commitSpatialMovement(state, current, options, current.lungeAuthorization);
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
  return actionInput.spatialPlan.removal?.leadingFailure
    ?applyOfficialDisengageRemovalV1(stateInput,actionInput,options):commitSpatialMovement(stateInput, actionInput, options);
}

function commitSpatialMovement(stateInput, actionInput, options, lungeAuthorization = null) {
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const events = [];
  if (!lungeAuthorization) consumeOfficialCharacteristicActivationStartV1(state, piece, events);
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
  if (!lungeAuthorization) {
    piece.activatedPhases = { movement: false, assault: false, combat: false,
      ...(piece.activatedPhases || {}), [activationPhase]: true };
  }
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
  applyOfficialLargeTerrainRemovalV1(state, piece, actionInput.spatialPlan.largeTerrainRemoval);
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
  const removedForceWallTokenIds = actionInput.spatialPlan.crossedForceWallTokenIds || [];
  consumeOfficialForceWallCrossingsV1(state, removedForceWallTokenIds);
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
  const entryDefinitionId = actionInput.spatialPlan.entrySource?.definitionId;
  const pylonDeploy = entryDefinitionId === OFFICIAL_PYLON_WARP_CONDUIT_DEFINITION_ID;
  const refreshBoundDeploymentSupply = contourRelease(state) && actionInput.actionType === "deploy";
  if (state.officialRoundSupplyState && (refreshBoundDeploymentSupply || pylonDeploy
    || entryDefinitionId === OFFICIAL_OMEGA_WORM_NETWORK_DEFINITION_ID)) {
    state.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state });
  }
  if(actionInput.spatialPlan.removal)return applyOfficialDisengageRemovalV1(state,actionInput,options,{preparedEvents:events});
  const event = {
    type: `unit_${actionInput.actionType}_resolved`,
    sideKey: piece.sideKey, pieceId: piece.id,
    leadingModelId: actionInput.spatialPlan.leadingModelId,
    spatialPlanHash: actionInput.spatialPlan.spatialPlanHash,
    ...(actionInput.spatialPlan.entrySource ? { entrySource: clone(actionInput.spatialPlan.entrySource) } : {}),
    distanceTravelledInches: actionInput.spatialPlan.distanceTravelledInches,
    speedAllowanceInches: actionInput.spatialPlan.speedAllowanceInches,
    modelPositionCount: positions.size,
    grassRemovedTerrainIds: clone(actionInput.spatialPlan.grassRemovedTerrainIds),
    ...(actionInput.spatialPlan.logicalGrassRemoval
      ? { logicalGrassRemoval: clone(actionInput.spatialPlan.logicalGrassRemoval) } : {}),
    removedForceFieldTokenIds: clone(removedForceFieldTokenIds),
    ...(state.officialForceWallTraversalPolicy ? { removedForceWallTokenIds } : {}),
    ...(actionInput.spatialPlan.largeTerrainRemoval ? { largeTerrainRemoval: clone(actionInput.spatialPlan.largeTerrainRemoval) } : {}),
    movementActivated: piece.activatedPhases.movement === true,
    assaultActivated: piece.activatedPhases.assault === true,
    ...(lungeAuthorization ? { lungeAuthorization } : {}),
    rulesTruth: "official_selected_roster_spatial_transition",
    trainingTruth: false,
  };
  state.spatialActionHistory = Array.isArray(state.spatialActionHistory)
    ? state.spatialActionHistory : [];
  state.spatialActionHistory.push({ round: Number(state.round), phase: state.phase,
    actionType: actionInput.actionType, pieceId: piece.id,
    spatialPlanHash: actionInput.spatialPlan.spatialPlanHash,
    event: clone(event), trainingTruth: false });
  events.push(event);
  if (!hasOfficialTunnelingClawsMovementV1(state, piece, actionInput.actionType)) {
    consumeOfficialCharacteristicBurrowedMovementV1(state, piece, events);
  }
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(actionInput), events: clone(events) });
  if (lungeAuthorization) {
    consumeOfficialActionPerformedStatusesV1(state, piece.id, 'lunge_move_completed');
    applyOfficialAfterActionCharacteristicPassivesV1(state, piece.id);
  } else if (pylonDeploy) {
    if (state.officialUnitLifecycleFamilySourceBundle?.definitionIds.includes(OFFICIAL_PYLON_WARP_IN_DEFINITION_ID)) {
      openOfficialSelectedRosterAfterActionWindowV1(state, piece.sideKey, piece.id, activationPhase);
    }
    const ended = { ...finishOfficialSelectedRosterActivationV1(state, piece, activationPhase),
      reason: 'pylon_warp_conduit', entrySourcePieceId: actionInput.spatialPlan.entrySource.sourcePieceId };
    events.push(ended);
    state.log.at(-1).events.push(clone(ended));
  } else openOfficialSelectedRosterAfterActionWindowV1(state, piece.sideKey, piece.id, activationPhase);
  return freezeDeep({ ok: true,
    schemaVersion: "starcraft_tmg_selected_roster_spatial_transition_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_VERSION,
    postRevision: Number(options.postRevision || 0), state,
    action: clone(actionInput), events,
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

// Query precheck: the same leading-model entry/path predicates as instantiation.
// Passing is not a complete formation certificate; final Native checks still run.
export function checkOfficialSelectedRosterDeployLeaderPathV1(state, domain, parameters) {
  if (domain?.actionType !== "deploy"
    || domain.executorId !== OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID) {
    fail("SELECTED_SPATIAL_DEPLOY_PRECHECK_DOMAIN_INVALID");
  }
  const piece = state.pieces.find(entry => entry.id === domain.pieceId);
  const leadingModel = piece?.models.find(entry => entry.id === parameters.leadingModelId
    && entry.isDestroyed !== true);
  const profile = domain.constraints.modelProfiles.find(entry => entry.modelId === parameters.leadingModelId);
  if (!leadingModel || !profile) fail("SELECTED_SPATIAL_LEADING_MODEL_INVALID");
  const segment = segmentById(domain, String(parameters.entrySegmentId || ""));
  const start = resolveOfficialSelectedRosterDeployStartV1(domain, segment, Number(parameters.entryAlongEdgeMilliInches), profile);
  const path = canonicalPath(start, parameters.path, domain, "deploy");
  verifyDeployInward(segment, path);
  const modelGaps = assertPathBoardAndModels(state, piece, leadingModel, path, domain, "deploy", segment);
  crossedForceFieldTokenIds(state, piece, leadingModel, path);
  const placements = [{ modelId: leadingModel.id, ...path.points.at(-1) }];
  assertForceWallTraversal(state, piece, leadingModel, path, placements);
  const large = prepareLargeTerrainRemoval(state, piece, leadingModel, path, placements);
  assertOfficialRavenReserveEntryClearanceV1(state, piece, placements, segment);
  if (segment.kind === 'unit_base_perimeter') {
    assertUnitEntryElevation(state, segment, placements);
    assertOutsideEnemyDeploymentZone(state, piece, placements);
    specialTerrainResult(large.state, piece, 'move', domain, leadingModel.id, path, placements, parameters, modelGaps);
  } else {
    deployTerrainResult(large.state, piece, { leadingModelId: leadingModel.id, canonicalPath: path }, placements);
  }
  return true;
}
