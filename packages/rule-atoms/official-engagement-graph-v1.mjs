import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_ENGAGEMENT_GRAPH_SCHEMA = "starcraft_tmg_official_engagement_graph_v1";
export const OFFICIAL_ENGAGEMENT_GEOMETRY_INPUT_SCHEMA =
  "starcraft_tmg_engagement_geometry_input_v1";
export const OFFICIAL_ENGAGEMENT_RANGE_MILLI_INCHES = 1000;

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const COMPLETENESS_FLAGS = Object.freeze([
  "modelCoordinatesComplete",
  "baseFootprintsComplete",
  "terrainFootprintsComplete",
  "elevationAssignmentsComplete",
  "accessPointAdjacencyComplete",
]);

export class OfficialEngagementGraphError extends Error {
  constructor(code, detail = "") {
    super(detail ? `${code}:${detail}` : code);
    this.name = "OfficialEngagementGraphError";
    this.code = code;
    this.detail = detail;
  }
}

function fail(code, detail = "") {
  throw new OfficialEngagementGraphError(code, detail);
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

function activePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function segmentPointDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
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
      if (!terrainId || seen.has(terrainId)) fail("ENGAGEMENT_TERRAIN_INVALID", terrainId || "missing_id");
      seen.add(terrainId);
      const size = Number(terrain.size);
      if (!Number.isSafeInteger(size) || size < 0) fail("ENGAGEMENT_TERRAIN_SIZE_REQUIRED", terrainId);
      if (size < 2) return { terrainId, size, blocksEngagement: false };
      const footprint = String(terrain.footprint || "").trim().toLowerCase();
      const rotation = ((Number(terrain.rotationDegrees || 0) % 360) + 360) % 360;
      if (!["circle", "rect"].includes(footprint)
        || (footprint === "rect" && ![0, 180].includes(rotation))) {
        fail("ENGAGEMENT_TERRAIN_UNSUPPORTED", terrainId);
      }
      const x = milli(terrain.xInches, "ENGAGEMENT_TERRAIN_INVALID", terrainId);
      const y = milli(terrain.yInches, "ENGAGEMENT_TERRAIN_INVALID", terrainId);
      const width = milli(terrain.widthInches, "ENGAGEMENT_TERRAIN_INVALID", terrainId);
      const height = milli(terrain.heightInches, "ENGAGEMENT_TERRAIN_INVALID", terrainId);
      if (width <= 0 || height <= 0) fail("ENGAGEMENT_TERRAIN_INVALID", terrainId);
      return {
        terrainId,
        size,
        blocksEngagement: true,
        footprint,
        rotationDegrees: rotation,
        x,
        y,
        width,
        height,
      };
    })
    .sort((left, right) => left.terrainId.localeCompare(right.terrainId));
}

function normalizeModels(state, boardWidth, boardHeight) {
  const modelIds = new Set();
  const models = [];
  for (const piece of state.pieces.filter(activePiece)) {
    const unitId = String(piece.id || "").trim();
    const sideKey = String(piece.sideKey || "").trim();
    const combatTag = String(piece.combatTag || "").trim().toLowerCase();
    if (!unitId || !SIDE_KEYS.includes(sideKey) || !["ground", "flying"].includes(combatTag)) {
      fail("ENGAGEMENT_UNIT_INVALID", unitId || "missing_id");
    }
    if (!Array.isArray(piece.models)) fail("ENGAGEMENT_MODEL_GEOMETRY_REQUIRED", unitId);
    const activeModels = piece.models.filter((model) => (
      model?.isDestroyed !== true && model?.isOnField !== false
    ));
    if (activeModels.length !== Number(piece.currentModels)) {
      fail("ENGAGEMENT_MODEL_COUNT_MISMATCH", unitId);
    }
    for (const model of activeModels) {
      const modelId = String(model?.id || "").trim();
      if (!modelId || modelIds.has(modelId)) fail("ENGAGEMENT_MODEL_ID_INVALID", modelId || "missing_id");
      modelIds.add(modelId);
      const baseShape = String(model.baseShape || "").trim().toLowerCase();
      const baseWidth = milli(model.baseWidthInches, "ENGAGEMENT_BASE_GEOMETRY_REQUIRED", modelId);
      const baseDepth = milli(model.baseDepthInches, "ENGAGEMENT_BASE_GEOMETRY_REQUIRED", modelId);
      if (baseShape !== "round" || baseWidth <= 0 || Math.abs(baseWidth - baseDepth) > 1) {
        fail("ENGAGEMENT_BASE_UNSUPPORTED", modelId);
      }
      const x = milli(model.xInches, "ENGAGEMENT_MODEL_POSITION_REQUIRED", modelId);
      const y = milli(model.yInches, "ENGAGEMENT_MODEL_POSITION_REQUIRED", modelId);
      const radius = Math.round(baseWidth / 2);
      if (x < radius || x > boardWidth - radius || y < radius || y > boardHeight - radius) {
        fail("ENGAGEMENT_MODEL_OUTSIDE_BOARD", modelId);
      }
      const elevation = String(model.elevation || "").trim().toLowerCase();
      if (elevation !== "ground") fail("ENGAGEMENT_ELEVATION_SUBSET_UNSUPPORTED", modelId);
      if (!Array.isArray(model.adjacentAccessPointIds)) {
        fail("ENGAGEMENT_ACCESS_POINT_ADJACENCY_REQUIRED", modelId);
      }
      models.push({
        modelId,
        unitId,
        sideKey,
        combatTag,
        x,
        y,
        radius,
        elevation,
        adjacentAccessPointIds: [...model.adjacentAccessPointIds]
          .map((value) => String(value).trim())
          .filter(Boolean)
          .sort(),
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
    x: right.x - (ux * right.radius),
    y: right.y - (uy * right.radius),
  }];
}

function blockingTerrainIds(terrain, a, b) {
  return terrain.filter((entry) => {
    if (!entry.blocksEngagement) return false;
    if (entry.footprint === "circle") {
      return segmentPointDistance({ x: entry.x, y: entry.y }, a, b) <= Math.max(entry.width, entry.height) / 2;
    }
    return segmentIntersectsRect(a, b, entry);
  }).map((entry) => entry.terrainId);
}

export function deriveOfficialEngagementGraphV1(state) {
  if (!object(state) || !Array.isArray(state.pieces) || !object(state.board)) {
    fail("ENGAGEMENT_STATE_INVALID");
  }
  const completeness = state.board.engagementGeometry;
  if (!object(completeness)
    || completeness.schemaVersion !== OFFICIAL_ENGAGEMENT_GEOMETRY_INPUT_SCHEMA
    || COMPLETENESS_FLAGS.some((flag) => completeness[flag] !== true)) {
    fail("ENGAGEMENT_GEOMETRY_INCOMPLETE");
  }
  if (!Array.isArray(state.board.terrain) || !Array.isArray(state.board.accessPoints)) {
    fail("ENGAGEMENT_GEOMETRY_INCOMPLETE");
  }
  if (state.board.accessPoints.length > 0) {
    fail("ENGAGEMENT_ELEVATION_SUBSET_UNSUPPORTED", "access_points_present");
  }
  const boardWidth = milli(state.board.widthInches, "ENGAGEMENT_BOARD_INVALID", "width");
  const boardHeight = milli(state.board.heightInches, "ENGAGEMENT_BOARD_INVALID", "height");
  if (boardWidth <= 0 || boardHeight <= 0) fail("ENGAGEMENT_BOARD_INVALID");
  const terrain = normalizeTerrain(state.board);
  const models = normalizeModels(state, boardWidth, boardHeight);
  const modelEdges = [];
  for (let leftIndex = 0; leftIndex < models.length; leftIndex += 1) {
    const left = models[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < models.length; rightIndex += 1) {
      const right = models[rightIndex];
      if (left.sideKey === right.sideKey || left.combatTag !== "ground" || right.combatTag !== "ground") continue;
      const centerDistance = Math.hypot(right.x - left.x, right.y - left.y);
      const baseGap = Math.max(0, Math.round(centerDistance - left.radius - right.radius));
      if (baseGap > OFFICIAL_ENGAGEMENT_RANGE_MILLI_INCHES) continue;
      const [from, to] = edgeSegment(left, right, centerDistance);
      const blockedTerrainIds = blockingTerrainIds(terrain, from, to);
      if (blockedTerrainIds.length > 0) continue;
      modelEdges.push({
        leftModelId: left.modelId,
        leftUnitId: left.unitId,
        rightModelId: right.modelId,
        rightUnitId: right.unitId,
        horizontalBaseGapMilliInches: baseGap,
        blockedTerrainIds,
      });
    }
  }
  modelEdges.sort((left, right) => (
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
  };
  const body = {
    schema: OFFICIAL_ENGAGEMENT_GRAPH_SCHEMA,
    rulesSourceSnapshotId: "core-rules-en@27639c562e6d",
    rulesSourceContentHash: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
    geometryInputHash: hashStarcraftTmgContract(geometryInput),
    engagementRangeMilliInches: OFFICIAL_ENGAGEMENT_RANGE_MILLI_INCHES,
    supportedGeometryScope: "round_bases_ground_elevation_axis_aligned_terrain_v1",
    modelEdges,
    engagedUnitIds,
    engagedUnitIdsBySide,
    rulesTruth: "official_ground_engagement_subset",
    trainingTruth: false,
  };
  return Object.freeze({ ...body, graphHash: hashStarcraftTmgContract(body) });
}
