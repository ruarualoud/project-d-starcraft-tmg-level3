import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

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
const ACCESS_ELEVATION_PAIRS = new Set(["ground:mid", "high:mid"]);

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

function activePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function normalizeFootprint(input, code, detail) {
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

function pointToRectDistance(point, rect) {
  const dx = Math.max(Math.abs(point.x - rect.x) - (rect.width / 2), 0);
  const dy = Math.max(Math.abs(point.y - rect.y) - (rect.height / 2), 0);
  return Math.hypot(dx, dy);
}

function roundBaseTouchesFootprint(model, footprint) {
  if (footprint.footprint === "circle") {
    return Math.hypot(model.x - footprint.x, model.y - footprint.y)
      <= model.radius + (footprint.width / 2);
  }
  return pointToRectDistance(model, footprint) <= model.radius;
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
      const accessPointId = String(accessPoint?.id || "").trim();
      if (!accessPointId || seen.has(accessPointId)) {
        fail("ENGAGEMENT_V2_ACCESS_POINT_INVALID", accessPointId || "missing_id");
      }
      seen.add(accessPointId);
      const terrainId = String(accessPoint.terrainId || "").trim();
      if (!terrainById.has(terrainId)) {
        fail("ENGAGEMENT_V2_ACCESS_POINT_TERRAIN_REQUIRED", accessPointId);
      }
      const connectsElevations = uniqueSortedStrings(
        accessPoint.connectsElevations,
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
      if (baseShape !== "round" || baseWidth <= 0 || Math.abs(baseWidth - baseDepth) > 1) {
        fail("ENGAGEMENT_V2_BASE_UNSUPPORTED", modelId);
      }
      const x = milli(model.xInches, "ENGAGEMENT_V2_MODEL_POSITION_REQUIRED", modelId);
      const y = milli(model.yInches, "ENGAGEMENT_V2_MODEL_POSITION_REQUIRED", modelId);
      const radius = Math.round(baseWidth / 2);
      if (x < radius || x > boardWidth - radius || y < radius || y > boardHeight - radius) {
        fail("ENGAGEMENT_V2_MODEL_OUTSIDE_BOARD", modelId);
      }
      const preliminary = { x, y, radius };
      const derivedSupportTerrainIds = terrain
        .filter((entry) => entry.elevationSurface && roundBaseTouchesFootprint(preliminary, entry))
        .map((entry) => entry.terrainId)
        .sort((left, right) => left.localeCompare(right));
      const declaredSupportTerrainIds = uniqueSortedStrings(
        model.supportTerrainIds,
        "ENGAGEMENT_V2_ELEVATION_SUPPORTS_REQUIRED",
        modelId,
      );
      if (!isDeepStrictEqual(declaredSupportTerrainIds, derivedSupportTerrainIds)) {
        fail("ENGAGEMENT_V2_ELEVATION_SUPPORT_MISMATCH", modelId);
      }
      const derivedElevation = elevationForSupportTerrainIds(derivedSupportTerrainIds, terrainById);
      const declaredElevation = String(model.elevation || "").trim().toLowerCase();
      if (combatTag === "ground"
        && (!ELEVATIONS.includes(declaredElevation) || declaredElevation !== derivedElevation)) {
        fail("ENGAGEMENT_V2_ELEVATION_DECLARATION_MISMATCH", modelId);
      }
      const derivedAdjacentAccessPointIds = combatTag === "flying" ? [] : accessPoints
        .filter((entry) => (
          entry.connectsElevations.includes(derivedElevation)
            && roundBaseTouchesFootprint(preliminary, entry)
        ))
        .map((entry) => entry.accessPointId)
        .sort((left, right) => left.localeCompare(right));
      const declaredAdjacentAccessPointIds = uniqueSortedStrings(
        model.adjacentAccessPointIds,
        "ENGAGEMENT_V2_ACCESS_POINT_ADJACENCY_REQUIRED",
        modelId,
      );
      if (declaredAdjacentAccessPointIds.some((value) => !accessPointById.has(value))
        || !isDeepStrictEqual(declaredAdjacentAccessPointIds, derivedAdjacentAccessPointIds)) {
        fail("ENGAGEMENT_V2_ACCESS_POINT_ADJACENCY_MISMATCH", modelId);
      }
      models.push({
        modelId,
        unitId,
        sideKey,
        combatTag,
        x,
        y,
        radius,
        elevation: combatTag === "flying" ? "ignored" : derivedElevation,
        supportTerrainIds: derivedSupportTerrainIds,
        adjacentAccessPointIds: derivedAdjacentAccessPointIds,
      });
    }
  }
  return models.sort((left, right) => left.modelId.localeCompare(right.modelId));
}

function edgeSegment(left, right, centerDistance) {
  if (centerDistance === 0) return [{ x: left.x, y: left.y }, { x: right.x, y: right.y }];
  const ux = (right.x - left.x) / centerDistance;
  const uy = (right.y - left.y) / centerDistance;
  return [{ x: left.x + (ux * left.radius), y: left.y + (uy * left.radius) }, {
    x: right.x - (ux * right.radius), y: right.y - (uy * right.radius),
  }];
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
  const modelEdges = [];
  const elevationRejections = [];
  for (let leftIndex = 0; leftIndex < models.length; leftIndex += 1) {
    const left = models[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < models.length; rightIndex += 1) {
      const right = models[rightIndex];
      if (left.sideKey === right.sideKey || left.combatTag !== "ground" || right.combatTag !== "ground") continue;
      const centerDistance = Math.hypot(right.x - left.x, right.y - left.y);
      const baseGap = Math.max(0, Math.round(centerDistance - left.radius - right.radius));
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
      const [from, to] = edgeSegment(left, right, centerDistance);
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
    engagementRangeMilliInches: OFFICIAL_ENGAGEMENT_RANGE_V2_MILLI_INCHES,
    supportedGeometryScope: "round_bases_all_elevations_derived_supports_access_points_axis_aligned_terrain_v2",
    modelEdges,
    elevationRejections,
    engagedUnitIds,
    engagedUnitIdsBySide,
    rulesTruth: "official_engagement_with_derived_elevation_and_access_points",
    trainingTruth: false,
  };
  return Object.freeze({ ...body, graphHash: hashStarcraftTmgContract(body) });
}
