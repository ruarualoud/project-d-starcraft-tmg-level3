import { normalizeOfficialElevationV1 } from "./official-elevation-contract-v1.mjs";
import { isOfficialDecoyUnitV1 } from './official-decoy-rules-v1.mjs';
import { isDeepStrictEqual } from "node:util";
import { verifyOfficialBattlefieldTokenV1 } from './official-battlefield-token-marker-rules-kernel-v1.mjs';
import { createOfficialDisplacementTokenFootprintV1 } from './official-token-displacement-geometry-v1.mjs';

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialModelBaseFootprintV1,
  createOfficialPhysicalFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1,
  isOfficialPhysicalFootprintInsideBoardV1,
  isOfficialProfileBoundOutlineV1,
} from "./official-model-base-geometry-rules-kernel-v1.mjs";

import { deriveOfficialFinalPlacementSurfaceSupportV13 } from './official-semantic-surface-support-v1.mjs';
import { usesWave3FaqClarifications } from './official-wave3-faq-clarifications-v1.mjs';

export const OFFICIAL_ENGAGEMENT_GRAPH_V2_SCHEMA = "starcraft_tmg_official_engagement_graph_v2";
export const OFFICIAL_ENGAGEMENT_GEOMETRY_INPUT_V2_SCHEMA =
  "starcraft_tmg_engagement_geometry_input_v2";
export const OFFICIAL_ENGAGEMENT_RANGE_V2_MILLI_INCHES = 1000;

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const ELEVATIONS = Object.freeze(["ground", "mid", "high"]);
const COMPLETENESS_FLAGS = Object.freeze([
  "modelCoordinatesComplete",
  "baseFootprintsComplete",
  "terrainFootprintsComplete",
  "elevationSupportsComplete",
  "accessPointAdjacencyComplete",
]);
const ACCESS_ELEVATION_PAIRS = new Set(["ground:high", "ground:mid", "high:mid"]);

export class OfficialEngagementGraphV2Error extends Error {
  constructor(code, detail = "") {
    super(detail ? `${code}:${detail}` : code);
    this.name = "OfficialEngagementGraphV2Error";
    this.code = code;
    this.detail = detail;
  }
}

function fail(code, detail = "") {
  throw new OfficialEngagementGraphV2Error(code, detail);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function milli(value, code, detail) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(code, detail);
  const result = Math.round(number * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}

function uniqueSortedStrings(values, code, detail) {
  if (!Array.isArray(values)) fail(code, detail);
  const normalized = values.map((value) => String(value || "").trim());
  if (normalized.some((value) => !value) || new Set(normalized).size !== normalized.length) {
    fail(code, detail);
  }
  return normalized.sort((left, right) => left.localeCompare(right));
}

function normalizeElevation(value) {
  return normalizeOfficialElevationV1(value);
}

function activePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function normalizeFootprint(input, code, detail) {
  if (object(input?.footprint)
    && input.footprint.shape === "axis_aligned_rectangle") {
    const minX = Number(input.footprint.minXMilliInches);
    const maxX = Number(input.footprint.maxXMilliInches);
    const minY = Number(input.footprint.minYMilliInches);
    const maxY = Number(input.footprint.maxYMilliInches);
    if (![minX, maxX, minY, maxY].every(Number.isSafeInteger)
      || minX >= maxX || minY >= maxY) fail(code, detail);
    return { footprint: "rect", rotationDegrees: 0,
      x: Math.round((minX + maxX) / 2),
      y: Math.round((minY + maxY) / 2),
      width: maxX - minX, height: maxY - minY };
  }
  const footprint = String(input?.footprint || "").trim().toLowerCase();
  const rotationDegrees = ((Number(input?.rotationDegrees || 0) % 360) + 360) % 360;
  if (!["circle", "rect"].includes(footprint)
    || (footprint === "rect" && ![0, 180].includes(rotationDegrees))) {
    fail(code, detail);
  }
  const x = milli(input.xInches, code, detail);
  const y = milli(input.yInches, code, detail);
  const width = milli(input.widthInches, code, detail);
  const height = milli(input.heightInches, code, detail);
  if (width <= 0 || height <= 0) fail(code, detail);
  if (footprint === "circle" && Math.abs(width - height) > 1) fail(code, detail);
  return { footprint, rotationDegrees, x, y, width, height };
}

function physicalFootprint(value, objectId, kind) {
  return createOfficialPhysicalFootprintV1({
    objectId,
    kind,
    shape: value.footprint === "circle" ? "round" : "rectangle",
    center: { xMilliInches: value.x, yMilliInches: value.y },
    widthMilliInches: value.width,
    depthMilliInches: value.height,
    rotationDegrees: value.rotationDegrees,
  });
}

function modelBaseTouchesFootprint(modelFootprint, value, objectId, kind) {
  // This function only returns contact, not separation or a signed receipt.
  // Keep exact geometry for nearby objects. Conservative bounds reject the
  // thousands of distant terrain cells without building/hashing their geometry.
  // A two-milli-inch margin preserves the exact kernel's rounding/contact rule.
  const validValue = value.footprint === "rect"
    && [0, 180].includes(value.rotationDegrees)
    || value.footprint === "circle" && value.width === value.height;
  if (validValue && String(objectId || "").trim() && String(kind || "").trim()) {
    const center = modelFootprint.center;
    const vertices = modelFootprint.vertices;
    const radius = modelFootprint.radiusMilliInches;
    const bounds = modelFootprint.shape === "round"
      ? [center.xMilliInches - radius, center.xMilliInches + radius,
        center.yMilliInches - radius, center.yMilliInches + radius]
      : [Math.min(...vertices.map(p => p.xMilliInches)),
        Math.max(...vertices.map(p => p.xMilliInches)),
        Math.min(...vertices.map(p => p.yMilliInches)),
        Math.max(...vertices.map(p => p.yMilliInches))];
    const halfWidth = Math.ceil(value.width / 2) + 1;
    const halfHeight = Math.ceil(value.height / 2) + 1;
    if (bounds[1] < value.x - halfWidth - 2
      || bounds[0] > value.x + halfWidth + 2
      || bounds[3] < value.y - halfHeight - 2
      || bounds[2] > value.y + halfHeight + 2) return false;
  }
  return evaluateOfficialPhysicalFootprintRelationV1({
    left: modelFootprint,
    right: physicalFootprint(value, objectId, kind),
  }).minimumSeparationMilliInches <= 1;
}

function segmentPointDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const ratio = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, ratio));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function segmentIntersectsRect(a, b, rect) {
  const minX = rect.x - (rect.width / 2);
  const maxX = rect.x + (rect.width / 2);
  const minY = rect.y - (rect.height / 2);
  const maxY = rect.y + (rect.height / 2);
  let from = 0;
  let to = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - minX],
    [dx, maxX - a.x],
    [-dy, a.y - minY],
    [dy, maxY - a.y],
  ]) {
    if (p === 0 && q < 0) return false;
    if (p !== 0) {
      const ratio = q / p;
      if (p < 0) from = Math.max(from, ratio);
      else to = Math.min(to, ratio);
      if (from > to) return false;
    }
  }
  return true;
}

function normalizeTerrain(board) {
  const seen = new Set();
  return (board.terrain || [])
    .filter((terrain) => terrain?.isRemoved !== true && terrain?.isDestroyed !== true)
    .map((terrain) => {
      const terrainId = String(terrain?.id || "").trim();
      if (!terrainId || seen.has(terrainId)) fail("ENGAGEMENT_V2_TERRAIN_INVALID", terrainId || "missing_id");
      seen.add(terrainId);
      const size = Number(terrain.size);
      if (!Number.isSafeInteger(size) || size < 0) {
        fail("ENGAGEMENT_V2_TERRAIN_SIZE_REQUIRED", terrainId);
      }
      if (typeof terrain.elevationSurface !== "boolean") {
        fail("ENGAGEMENT_V2_TERRAIN_ELEVATION_SURFACE_REQUIRED", terrainId);
      }
      return {
        terrainId,
        size,
        elevationSurface: terrain.elevationSurface,
        blocksEngagement: size >= 2,
        ...normalizeFootprint(terrain, "ENGAGEMENT_V2_TERRAIN_INVALID", terrainId),
      };
    })
    .sort((left, right) => left.terrainId.localeCompare(right.terrainId));
}

function normalizeAccessPoints(board, terrainById) {
  const seen = new Set();
  return (board.accessPoints || [])
    .filter((accessPoint) => accessPoint?.isRemoved !== true && accessPoint?.isDestroyed !== true)
    .map((accessPoint) => {
      const accessPointId = String(
        accessPoint?.id || accessPoint?.accessPointId || "",
      ).trim();
      if (!accessPointId || seen.has(accessPointId)) {
        fail("ENGAGEMENT_V2_ACCESS_POINT_INVALID", accessPointId || "missing_id");
      }
      seen.add(accessPointId);
      const terrainId = String(accessPoint.terrainId || "").trim();
      if (!terrainById.has(terrainId)) {
        fail("ENGAGEMENT_V2_ACCESS_POINT_TERRAIN_REQUIRED", accessPointId);
      }
      const connectsElevations = uniqueSortedStrings(
        accessPoint.connectsElevations || accessPoint.connects,
        "ENGAGEMENT_V2_ACCESS_POINT_ELEVATIONS_INVALID",
        accessPointId,
      );
      if (connectsElevations.length !== 2
        || connectsElevations.some((value) => !ELEVATIONS.includes(value))
        || !ACCESS_ELEVATION_PAIRS.has(connectsElevations.join(":"))) {
        fail("ENGAGEMENT_V2_ACCESS_POINT_ELEVATIONS_INVALID", accessPointId);
      }
      return {
        accessPointId,
        terrainId,
        connectsElevations,
        ...normalizeFootprint(accessPoint, "ENGAGEMENT_V2_ACCESS_POINT_INVALID", accessPointId),
      };
    })
    .sort((left, right) => left.accessPointId.localeCompare(right.accessPointId));
}

function elevationForSupportTerrainIds(supportTerrainIds, terrainById) {
  const highestSize = supportTerrainIds.reduce((value, terrainId) => (
    Math.max(value, terrainById.get(terrainId).size)
  ), 0);
  if (highestSize >= 3) return "high";
  if (highestSize >= 1) return "mid";
  return "ground";
}

export function deriveOfficialModelSurfacePlacementV2(state, request = {}) {
  const pieceId = String(request.pieceId || "").trim();
  const modelId = String(request.modelId || "").trim();
  const piece = (state?.pieces || []).find((entry) => entry.id === pieceId);
  const model = piece?.models?.find((entry) => entry.id === modelId);
  const combatTag = String(piece?.combatTag || "").trim().toLowerCase();
  if (!piece || !model || !["ground", "flying"].includes(combatTag)) {
    fail("ENGAGEMENT_V2_MODEL_POSITION_REQUIRED", modelId || pieceId || "missing_id");
  }
  const baseShape = String(model.baseShape || "").trim().toLowerCase();
  const baseWidth = milli(model.baseWidthInches,
    "ENGAGEMENT_V2_BASE_GEOMETRY_REQUIRED", modelId);
  const baseDepth = milli(model.baseDepthInches,
    "ENGAGEMENT_V2_BASE_GEOMETRY_REQUIRED", modelId);
  if (!(["round", "rectangle"].includes(baseShape) || isOfficialProfileBoundOutlineV1(baseShape))
    || baseWidth <= 0 || baseDepth <= 0
    || (baseShape === "round" && Math.abs(baseWidth - baseDepth) > 1)) {
    fail("ENGAGEMENT_V2_BASE_UNSUPPORTED", modelId);
  }
  const modelFootprint = isOfficialProfileBoundOutlineV1(baseShape)
      ? createOfficialModelBaseFootprintV1({ piece, model, dataBundle: state.officialModelBaseGeometryDataBundle })
      : createOfficialPhysicalFootprintV1({
    objectId: modelId,
    kind: "model_base",
    shape: baseShape,
    center: {
      xMilliInches: milli(model.xInches,
        "ENGAGEMENT_V2_MODEL_POSITION_REQUIRED", modelId),
      yMilliInches: milli(model.yInches,
        "ENGAGEMENT_V2_MODEL_POSITION_REQUIRED", modelId),
    },
    widthMilliInches: baseWidth,
    depthMilliInches: baseDepth,
    rotationDegrees: model.baseRotationDegrees ?? model.rotationDegrees ?? 0,
  });
  const surface = physicalSurfacePlacement(state, modelFootprint, combatTag, modelId);
  return Object.freeze({
    schemaVersion: `${OFFICIAL_ENGAGEMENT_GRAPH_V2_SCHEMA}.model-surface-placement`,
    pieceId, modelId,
    elevation: surface.elevation,
    supportTerrainIds: Object.freeze(surface.supportTerrainIds),
    adjacentAccessPointIds: Object.freeze(surface.adjacentAccessPointIds),
    rulesTruth: "official_derived_model_surface_placement", trainingTruth: false,
  });
}

function placementSupport(state, modelFootprint, terrain, terrainById) {
  // On art-bound maps the interior height lives in the signed terrain ledger.
  // The board obstacle rows alone contain only the rim and access points.
  if (modelFootprint.kind === "model_base"
    && state.officialCompetitiveMapRoomFreeze?.overlayReceipt?.overlayCompilerVersion === "local_ramp_corridor_v3_1"
    && usesWave3FaqClarifications(state)) {
    return deriveOfficialFinalPlacementSurfaceSupportV13(state, modelFootprint);
  }
  const supportTerrainIds = terrain
    .filter((entry) => entry.elevationSurface && modelBaseTouchesFootprint(
      modelFootprint, entry, entry.terrainId, "terrain",
    ))
    .map((entry) => entry.terrainId)
    .sort((left, right) => left.localeCompare(right));
  const elevation = elevationForSupportTerrainIds(supportTerrainIds, terrainById);
  return { supportTerrainIds, elevation };
}

function physicalSurfacePlacement(state, modelFootprint, combatTag, modelId) {
  const boardWidth = milli(state?.board?.widthInches,
    "ENGAGEMENT_V2_BOARD_INVALID", "width");
  const boardHeight = milli(state?.board?.heightInches,
    "ENGAGEMENT_V2_BOARD_INVALID", "height");
  if (!isOfficialPhysicalFootprintInsideBoardV1({
    footprint: modelFootprint,
    widthMilliInches: boardWidth,
    heightMilliInches: boardHeight,
  })) fail("ENGAGEMENT_V2_MODEL_OUTSIDE_BOARD", modelId);
  const terrain = normalizeTerrain(state.board);
  const terrainById = new Map(terrain.map((entry) => [entry.terrainId, entry]));
  const accessPoints = normalizeAccessPoints(state.board, terrainById);
  const { supportTerrainIds, elevation } = placementSupport(state, modelFootprint, terrain, terrainById);
  const adjacentAccessPointIds = combatTag === "flying" ? [] : accessPoints
    .filter((entry) => (
      entry.connectsElevations.includes(elevation)
        && modelBaseTouchesFootprint(
          modelFootprint, entry, entry.accessPointId, "access_point",
        )
    ))
    .map((entry) => entry.accessPointId)
    .sort((left, right) => left.localeCompare(right));
  return { elevation, supportTerrainIds, adjacentAccessPointIds };
}

export function deriveOfficialTargetPointSurfacePlacementV2(state, footprint) {
  const { footprintHash, ...body } = footprint || {};
  if (body.kind !== 'template_target_point' || body.radiusMilliInches !== 0
    || footprintHash !== hashStarcraftTmgContract(body)) fail('ENGAGEMENT_V2_TARGET_POINT_INVALID');
  const surface = physicalSurfacePlacement(state, footprint, 'ground', footprint.objectId);
  return Object.freeze({ targetPointId: footprint.objectId, footprintHash,
    elevation: surface.elevation, supportTerrainIds: Object.freeze(surface.supportTerrainIds),
    trainingTruth: false });
}

// Mission Markers are intangible. Their disc must fit on the board and
// avoid impassable terrain. The centre determines their support surface.
export function deriveOfficialMissionMarkerSurfacePlacementV2(state, footprint) {
  const { footprintHash, ...body } = footprint || {};
  if (body.kind !== "mission_marker" || body.shape !== "round"
    || footprintHash !== hashStarcraftTmgContract(body)) fail("MISSION_MARKER_DROP_FOOTPRINT_INVALID");
  const { xMilliInches: x, yMilliInches: y } = body.center;
  const width = milli(state?.board?.widthInches, "ENGAGEMENT_V2_BOARD_INVALID", "width");
  const height = milli(state?.board?.heightInches, "ENGAGEMENT_V2_BOARD_INVALID", "height");
  if (x < body.radiusMilliInches || x > width - body.radiusMilliInches
    || y < body.radiusMilliInches || y > height - body.radiusMilliInches) {
    fail("MISSION_MARKER_OUTSIDE_BATTLEFIELD", body.objectId);
  }
  const terrain = normalizeTerrain(state.board);
  const impassableIds = new Set(state.board.terrain
    .filter(row => row.impassable === true || row.terrainKind === "impassable").map(row => row.id));
  if (terrain.some(row => impassableIds.has(row.terrainId) && evaluateOfficialPhysicalFootprintRelationV1({
    left: footprint, right: physicalFootprint(row, row.terrainId, "terrain"),
  }).overlappingInteriors)) fail("MISSION_MARKER_IMPASSABLE_OVERLAP", body.objectId);
  const supports = terrain.filter(row => row.elevationSurface && Math.abs(x - row.x) <= row.width / 2
    && Math.abs(y - row.y) <= row.height / 2);
  if (supports.length > 1) fail("MISSION_MARKER_SUPPORT_AMBIGUOUS", body.objectId);
  const supportTerrainIds = supports.map(row => row.terrainId);
  const elevation = elevationForSupportTerrainIds(supportTerrainIds, new Map(terrain.map(row => [row.terrainId, row])));
  return Object.freeze({ markerId: body.objectId, footprintHash, elevation,
    supportTerrainIds: Object.freeze(supportTerrainIds), trainingTruth: false });
}

export function deriveOfficialTokenSurfacePlacementV2(state, token) {
  verifyOfficialBattlefieldTokenV1(token, state.officialBattlefieldTokenMarkerRegistry);
  const footprint = createOfficialDisplacementTokenFootprintV1(token);
  const surface = physicalSurfacePlacement(state, footprint, 'ground', token.tokenId);
  return Object.freeze({ schemaVersion: `${OFFICIAL_ENGAGEMENT_GRAPH_V2_SCHEMA}.token-surface-placement`,
    tokenId: token.tokenId, tokenHash: token.tokenHash, footprintHash: footprint.footprintHash,
    elevation: surface.elevation,
    supportTerrainIds: Object.freeze(surface.supportTerrainIds),
    adjacentAccessPointIds: Object.freeze(surface.adjacentAccessPointIds),
    rulesTruth: 'official_derived_token_surface_placement', trainingTruth: false });
}

function normalizeModels(state, boardWidth, boardHeight, terrain, accessPoints) {
  const terrainById = new Map(terrain.map((entry) => [entry.terrainId, entry]));
  const accessPointById = new Map(accessPoints.map((entry) => [entry.accessPointId, entry]));
  const modelIds = new Set();
  const models = [];
  for (const piece of state.pieces.filter(activePiece)) {
    const unitId = String(piece.id || "").trim();
    const sideKey = String(piece.sideKey || "").trim();
    const combatTag = String(piece.combatTag || "").trim().toLowerCase();
    if (!unitId || !SIDE_KEYS.includes(sideKey) || !["ground", "flying"].includes(combatTag)) {
      fail("ENGAGEMENT_V2_UNIT_INVALID", unitId || "missing_id");
    }
    if (!Array.isArray(piece.models)) fail("ENGAGEMENT_V2_MODEL_GEOMETRY_REQUIRED", unitId);
    const activeModels = piece.models.filter((model) => (
      model?.isDestroyed !== true && model?.isOnField !== false
    ));
    if (activeModels.length !== Number(piece.currentModels)) {
      fail("ENGAGEMENT_V2_MODEL_COUNT_MISMATCH", unitId);
    }
    for (const model of activeModels) {
      const modelId = String(model?.id || "").trim();
      if (!modelId || modelIds.has(modelId)) {
        fail("ENGAGEMENT_V2_MODEL_ID_INVALID", modelId || "missing_id");
      }
      modelIds.add(modelId);
      const baseShape = String(model.baseShape || "").trim().toLowerCase();
      const baseWidth = milli(model.baseWidthInches, "ENGAGEMENT_V2_BASE_GEOMETRY_REQUIRED", modelId);
      const baseDepth = milli(model.baseDepthInches, "ENGAGEMENT_V2_BASE_GEOMETRY_REQUIRED", modelId);
      if (!(["round", "rectangle"].includes(baseShape) || isOfficialProfileBoundOutlineV1(baseShape))
        || baseWidth <= 0 || baseDepth <= 0
        || (baseShape === "round" && Math.abs(baseWidth - baseDepth) > 1)) {
        fail("ENGAGEMENT_V2_BASE_UNSUPPORTED", modelId);
      }
      const x = milli(model.xInches, "ENGAGEMENT_V2_MODEL_POSITION_REQUIRED", modelId);
      const y = milli(model.yInches, "ENGAGEMENT_V2_MODEL_POSITION_REQUIRED", modelId);
      const modelFootprint = isOfficialProfileBoundOutlineV1(baseShape)
      ? createOfficialModelBaseFootprintV1({ piece, model, dataBundle: state.officialModelBaseGeometryDataBundle })
      : createOfficialPhysicalFootprintV1({
        objectId: modelId,
        kind: "model_base",
        shape: baseShape,
        center: { xMilliInches: x, yMilliInches: y },
        widthMilliInches: baseWidth,
        depthMilliInches: baseDepth,
        rotationDegrees: model.baseRotationDegrees ?? model.rotationDegrees ?? 0,
      });
      if (!isOfficialPhysicalFootprintInsideBoardV1({
        footprint: modelFootprint,
        widthMilliInches: boardWidth,
        heightMilliInches: boardHeight,
      })) {
        fail("ENGAGEMENT_V2_MODEL_OUTSIDE_BOARD", modelId);
      }
      const { supportTerrainIds: derivedSupportTerrainIds, elevation: derivedElevation } =
        placementSupport(state, modelFootprint, terrain, terrainById);
      const declaredSupportTerrainIds = uniqueSortedStrings(
        model.supportTerrainIds,
        "ENGAGEMENT_V2_ELEVATION_SUPPORTS_REQUIRED",
        modelId,
      );
      if (!isDeepStrictEqual(declaredSupportTerrainIds, derivedSupportTerrainIds)) {
        fail("ENGAGEMENT_V2_ELEVATION_SUPPORT_MISMATCH", modelId);
      }
      const declaredElevation = normalizeElevation(model.elevation);
      if (combatTag === "ground"
        && (!ELEVATIONS.includes(declaredElevation) || declaredElevation !== derivedElevation)) {
        fail("ENGAGEMENT_V2_ELEVATION_DECLARATION_MISMATCH", modelId);
      }
      const derivedAdjacentAccessPointIds = combatTag === "flying" ? [] : accessPoints
        .filter((entry) => (
          entry.connectsElevations.includes(derivedElevation)
            && modelBaseTouchesFootprint(
              modelFootprint, entry, entry.accessPointId, "access_point",
            )
        ))
        .map((entry) => entry.accessPointId)
        .sort((left, right) => left.localeCompare(right));
      const declaredAdjacentAccessPointIds = uniqueSortedStrings(
        model.adjacentAccessPointIds,
        "ENGAGEMENT_V2_ACCESS_POINT_ADJACENCY_REQUIRED",
        modelId,
      );
      // Adjacency is a position-derived cache, not a second authority. Older
      // spatial transitions could retain a ramp ID after a rotated base moved
      // away from it. Validate the cache's shape/IDs, but use only the exact
      // physical-footprint derivation for combat eligibility.
      if (declaredAdjacentAccessPointIds.some((value) => !accessPointById.has(value))) {
        fail("ENGAGEMENT_V2_ACCESS_POINT_ADJACENCY_MISMATCH", modelId);
      }
      models.push({
        modelId,
        unitId,
        sideKey,
        combatTag,
        x,
        y,
        footprint: modelFootprint,
        elevation: combatTag === "flying" ? "ignored" : derivedElevation,
        supportTerrainIds: derivedSupportTerrainIds,
        adjacentAccessPointIds: derivedAdjacentAccessPointIds,
      });
    }
  }
  return models.sort((left, right) => left.modelId.localeCompare(right.modelId));
}

function sharedAccessPointIds(left, right, accessPointById) {
  if (left.elevation === right.elevation) return [];
  if ([left.elevation, right.elevation].sort().join(":") === "ground:high") return [];
  const expectedPair = [left.elevation, right.elevation].sort();
  const rightIds = new Set(right.adjacentAccessPointIds);
  return left.adjacentAccessPointIds.filter((accessPointId) => (
    rightIds.has(accessPointId)
      && isDeepStrictEqual(accessPointById.get(accessPointId)?.connectsElevations, expectedPair)
  )).sort((a, b) => a.localeCompare(b));
}

function elevationEligibility(left, right, accessPointById) {
  if (left.elevation === right.elevation) return { eligible: true, sharedAccessPointIds: [] };
  const pair = [left.elevation, right.elevation].sort().join(":");
  if (pair === "ground:high") {
    return { eligible: false, reason: "HIGH_GROUND_GROUND_LEVEL_ENGAGEMENT_PROHIBITED", sharedAccessPointIds: [] };
  }
  const shared = sharedAccessPointIds(left, right, accessPointById);
  if (shared.length === 0) {
    return { eligible: false, reason: "CROSS_ELEVATION_SHARED_ACCESS_POINT_REQUIRED", sharedAccessPointIds: [] };
  }
  return { eligible: true, sharedAccessPointIds: shared };
}

function blockingTerrainIds(terrain, a, b, ignoredTerrainIds) {
  return terrain.filter((entry) => {
    if (!entry.blocksEngagement || ignoredTerrainIds.has(entry.terrainId)) return false;
    if (entry.footprint === "circle") {
      return segmentPointDistance({ x: entry.x, y: entry.y }, a, b) <= entry.width / 2;
    }
    return segmentIntersectsRect(a, b, entry);
  }).map((entry) => entry.terrainId);
}

export function deriveOfficialEngagementGraphV2(state) {
  if (!object(state) || !Array.isArray(state.pieces) || !object(state.board)) {
    fail("ENGAGEMENT_V2_STATE_INVALID");
  }
  const completeness = state.board.engagementGeometry;
  if (!object(completeness)
    || completeness.schemaVersion !== OFFICIAL_ENGAGEMENT_GEOMETRY_INPUT_V2_SCHEMA
    || COMPLETENESS_FLAGS.some((flag) => completeness[flag] !== true)
    || !Array.isArray(state.board.terrain)
    || !Array.isArray(state.board.accessPoints)) {
    fail("ENGAGEMENT_V2_GEOMETRY_INCOMPLETE");
  }
  const boardWidth = milli(state.board.widthInches, "ENGAGEMENT_V2_BOARD_INVALID", "width");
  const boardHeight = milli(state.board.heightInches, "ENGAGEMENT_V2_BOARD_INVALID", "height");
  if (boardWidth <= 0 || boardHeight <= 0) fail("ENGAGEMENT_V2_BOARD_INVALID");
  const terrain = normalizeTerrain(state.board);
  const terrainById = new Map(terrain.map((entry) => [entry.terrainId, entry]));
  const accessPoints = normalizeAccessPoints(state.board, terrainById);
  const accessPointById = new Map(accessPoints.map((entry) => [entry.accessPointId, entry]));
  const models = normalizeModels(state, boardWidth, boardHeight, terrain, accessPoints);
  const nonEngagingUnitIds = new Set(state.pieces.filter(piece => isOfficialDecoyUnitV1(state, piece)).map(piece => piece.id));
  const modelEdges = [];
  const elevationRejections = [];
  for (let leftIndex = 0; leftIndex < models.length; leftIndex += 1) {
    const left = models[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < models.length; rightIndex += 1) {
      const right = models[rightIndex];
      if (left.sideKey === right.sideKey || left.combatTag !== "ground" || right.combatTag !== "ground"
        || nonEngagingUnitIds.has(left.unitId) || nonEngagingUnitIds.has(right.unitId)) continue;
      const relation = evaluateOfficialPhysicalFootprintRelationV1({
        left: left.footprint,
        right: right.footprint,
      });
      const baseGap = relation.minimumSeparationMilliInches;
      if (baseGap > OFFICIAL_ENGAGEMENT_RANGE_V2_MILLI_INCHES) continue;
      const elevation = elevationEligibility(left, right, accessPointById);
      if (!elevation.eligible) {
        elevationRejections.push({
          leftModelId: left.modelId,
          rightModelId: right.modelId,
          leftElevation: left.elevation,
          rightElevation: right.elevation,
          horizontalBaseGapMilliInches: baseGap,
          reason: elevation.reason,
        });
        continue;
      }
      const from = {
        x: relation.nearestPointOnLeft.xMilliInches,
        y: relation.nearestPointOnLeft.yMilliInches,
      };
      const to = {
        x: relation.nearestPointOnRight.xMilliInches,
        y: relation.nearestPointOnRight.yMilliInches,
      };
      const ignoredTerrainIds = new Set(left.supportTerrainIds.filter((id) => right.supportTerrainIds.includes(id)));
      for (const accessPointId of elevation.sharedAccessPointIds) {
        ignoredTerrainIds.add(accessPointById.get(accessPointId).terrainId);
      }
      const blockedTerrainIds = blockingTerrainIds(terrain, from, to, ignoredTerrainIds);
      if (blockedTerrainIds.length > 0) continue;
      modelEdges.push({
        leftModelId: left.modelId,
        leftUnitId: left.unitId,
        leftElevation: left.elevation,
        rightModelId: right.modelId,
        rightUnitId: right.unitId,
        rightElevation: right.elevation,
        horizontalBaseGapMilliInches: baseGap,
        sharedAccessPointIds: elevation.sharedAccessPointIds,
        blockedTerrainIds,
      });
    }
  }
  modelEdges.sort((left, right) => (
    `${left.leftModelId}:${left.rightModelId}`.localeCompare(`${right.leftModelId}:${right.rightModelId}`)
  ));
  elevationRejections.sort((left, right) => (
    `${left.leftModelId}:${left.rightModelId}`.localeCompare(`${right.leftModelId}:${right.rightModelId}`)
  ));
  const engagedUnitIds = [...new Set(modelEdges.flatMap((edge) => [edge.leftUnitId, edge.rightUnitId]))].sort();
  const engagedUnitIdsBySide = Object.fromEntries(SIDE_KEYS.map((sideKey) => [
    sideKey,
    engagedUnitIds.filter((unitId) => state.pieces.find((piece) => piece.id === unitId)?.sideKey === sideKey),
  ]));
  const geometryInput = {
    board: { width: boardWidth, height: boardHeight },
    completeness,
    models,
    terrain,
    accessPoints,
  };
  const body = {
    schema: OFFICIAL_ENGAGEMENT_GRAPH_V2_SCHEMA,
    rulesSourceSnapshotId: "core-rules-en@27639c562e6d",
    rulesSourceContentHash: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
    geometryInputHash: hashStarcraftTmgContract(geometryInput),
    ...(state.officialDecoySourceBundle ? { decoySourceBundleHash: state.officialDecoySourceBundle.bundleHash,
      nonEngagingUnitIds: [...nonEngagingUnitIds].sort() } : {}),
    engagementRangeMilliInches: OFFICIAL_ENGAGEMENT_RANGE_V2_MILLI_INCHES,
    supportedGeometryScope:
      "round_and_rotated_rectangle_bases_all_elevations_derived_supports_access_points_axis_aligned_terrain_v2",
    modelEdges,
    elevationRejections,
    engagedUnitIds,
    engagedUnitIdsBySide,
    rulesTruth: "official_engagement_with_derived_elevation_and_access_points",
    trainingTruth: false,
  };
  return Object.freeze({ ...body, graphHash: hashStarcraftTmgContract(body) });
}

// Sufficient whole-cell exclusion for the flat round-base charge proof. This
// shares the graph's exact terrain normalization and intersection predicate;
// it never adds terrain, guesses passability, or supplies a finite-search veto.
export function createOfficialGroundEngagementShadowCoverV2(state, targetModelId) {
  const target = (state?.pieces || []).flatMap(p => p.models || [])
    .find(m => m.id === targetModelId);
  if (!target || target.baseShape !== "round" || target.elevation !== "ground"
    || (target.supportTerrainIds || []).length) return null;
  const x = Math.round(Number(target.xInches) * 1000);
  const y = Math.round(Number(target.yInches) * 1000);
  const width = Math.round(Number(target.baseWidthInches) * 1000);
  const depth = Math.round(Number(target.baseDepthInches ?? target.baseWidthInches) * 1000);
  if (![x, y, width, depth].every(Number.isSafeInteger) || width <= 0 || width !== depth) return null;
  const source = new Map((state.board?.terrain || []).map(t => [t.id, t]));
  let terrain;
  try { terrain = normalizeTerrain(state.board); } catch { return null; }
  const origin = { x, y };
  const rectangles = terrain.filter(t => {
    const raw = source.get(t.terrainId);
    if (!t.blocksEngagement || t.footprint !== "rect" || t.width <= 4 || t.height <= 4
      || raw?.terrainKind !== "ordinary" || raw.standableHorizontalSurface === true
      || raw.elevationSurface === true || (raw.openings || []).length
      || (raw.setupAgreement?.openings || []).length || (raw.accessPoints || []).length) return false;
    const separation = Math.hypot(Math.max(Math.abs(x - t.x) - t.width / 2, 0),
      Math.max(Math.abs(y - t.y) - t.height / 2, 0));
    // The target base must lie entirely outside the occluder. Shrinking every
    // edge by 2 also protects the graph's rounded nearest-base endpoints.
    return separation > Math.ceil(width / 2) + 2;
  }).map(t => ({ ...t, width: t.width - 4, height: t.height - 4 }));
  if (!rectangles.length) return null;
  return cell => {
    if (![cell.minX, cell.maxX, cell.minY, cell.maxY].every(Number.isSafeInteger)
      || cell.minX > cell.maxX || cell.minY > cell.maxY) return null;
    const corners = [cell.minX, cell.maxX].flatMap(cx =>
      [cell.minY, cell.maxY].map(cy => ({ x: cx, y: cy })));
    // The shadow cast by one convex rectangle from an external point is
    // convex. Covering all four corners covers this entire rectangle, including
    // every integer endpoint. An overlapping base is already illegal; otherwise
    // the obstructed centre line contains the same obstructed base-to-base gap.
    return rectangles.find(t => corners.every(corner =>
      segmentIntersectsRect(origin, corner, t)))?.terrainId ?? null;
  };
}
