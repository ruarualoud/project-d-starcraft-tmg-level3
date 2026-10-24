import { hashStarcraftTmgContract, canonicalStarcraftTmgJson,
  STARCRAFT_TMG_HASH_ALGORITHM } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { constants as bufferConstants } from "node:buffer";
import { createHash } from "node:crypto";
import { normalizeOfficialRectangleUnionFootprintCellsV1, officialRectangleUnionCoversBasesV1 } from
  "./official-footprint-rectangle-union-geometry-v1.mjs";
import { verifyOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";
import { certifyOfficialFlyingRulePlanV1 } from
  "./official-flying-rules-kernel-v1.mjs";
import { certifyOfficialGapPlaceGeometryPlanV1 } from
  "./official-gap-place-geometry-kernel-v1.mjs";
import {
  createOfficialTerrainPieceV1,
  evaluateOfficialLeadingModelTerrainV1,
  evaluateOfficialTerrainLineOfSightV1,
  evaluateOfficialTerrainLineOfSightBatchV1,
  evaluateOfficialTerrainLineOfSightBatchOutcomesV1,
  visitNativeOfficialTerrainLosOutcomesV1,
  canonicalNativeTerrainLineOfSightAssessmentsV1,
} from "./official-terrain-los-rules-kernel-v1.mjs";

export const OFFICIAL_SPECIAL_TERRAIN_RULES_KERNEL_SCHEMA =
  "starcraft_tmg_official_special_terrain_rules_kernel_v1";
export const OFFICIAL_SPECIAL_TERRAIN_RULES_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_SPECIAL_TERRAIN_AGREEMENT_SCHEMA =
  "starcraft_tmg_official_special_terrain_agreement_v1";

const TOLERANCE = 1;
// Only native, fully sealed and frozen JSON results can prove the aggregate's
// serialization size without normalizing/copying its whole assessment tree.
const NATIVE_GRASS_LOS_RESULTS = new WeakSet();
const NATIVE_GRASS_LOS_SERIALIZATIONS = new WeakMap();
const ELEVATIONS = Object.freeze(["ground", "mid", "high"]);
const MOVEMENT_TYPES = Object.freeze([
  "move", "run", "charge", "disengage", "close_ranks",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function milli(value, code, detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}
function point(value, code = "SPECIAL_TERRAIN_POINT_INVALID", detail = "") {
  const xMilliInches = Number(value?.xMilliInches);
  const yMilliInches = Number(value?.yMilliInches);
  if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches)) {
    fail(code, detail);
  }
  return { xMilliInches, yMilliInches };
}
function rectangle(value, code = "SPECIAL_TERRAIN_RECTANGLE_INVALID", detail = "") {
  const minXMilliInches = Number(value?.minXMilliInches);
  const maxXMilliInches = Number(value?.maxXMilliInches);
  const minYMilliInches = Number(value?.minYMilliInches);
  const maxYMilliInches = Number(value?.maxYMilliInches);
  if (value?.shape !== "axis_aligned_rectangle"
    || ![minXMilliInches, maxXMilliInches, minYMilliInches, maxYMilliInches]
      .every(Number.isSafeInteger)
    || minXMilliInches >= maxXMilliInches || minYMilliInches >= maxYMilliInches) {
    fail(code, detail);
  }
  return { shape: "axis_aligned_rectangle", minXMilliInches, maxXMilliInches,
    minYMilliInches, maxYMilliInches };
}
function distance(left, right) {
  return Math.hypot(right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches);
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}
function elevation(value) {
  const result = String(value || "ground").toLowerCase();
  if (result === "middle") return "mid";
  if (!ELEVATIONS.includes(result)) fail("SPECIAL_TERRAIN_ELEVATION_INVALID", result);
  return result;
}
function terrainBody(terrain) {
  return { schema: terrain.schema, id: terrain.id,
    terrainKind: terrain.terrainKind, size: terrain.size,
    footprint: terrain.footprint,
    ...(terrain.footprintCells ? { footprintCells: terrain.footprintCells } : {}),
    standableHorizontalSurface: terrain.standableHorizontalSurface,
    setupAgreement: terrain.setupAgreement,
    rulesTruth: terrain.rulesTruth, trainingTruth: terrain.trainingTruth };
}
function setupAgreementBody(agreement) {
  return { schema: agreement.schema,
    footprintAgreed: agreement.footprintAgreed,
    footprintHash: agreement.footprintHash,
    ...(agreement.footprintCellsHash ? { footprintCellsHash: agreement.footprintCellsHash } : {}),
    openingDenominatorComplete: agreement.openingDenominatorComplete,
    openings: agreement.openings,
    agreedDuringBattlefieldSetup: agreement.agreedDuringBattlefieldSetup,
    trainingTruth: agreement.trainingTruth };
}
function verifyTerrainPiece(raw) {
  const terrainId = String(raw?.id || "").trim();
  const terrainKind = String(raw?.terrainKind || "ordinary").toLowerCase();
  const size = Number(raw?.size);
  const footprint = rectangle(raw?.footprint,
    "SPECIAL_TERRAIN_FOOTPRINT_INVALID", terrainId);
  const footprintCells = raw?.footprintCells === undefined ? undefined
    : normalizeOfficialRectangleUnionFootprintCellsV1(raw.footprintCells, footprint);
  if (!terrainId || raw?.schema !== "starcraft_tmg_official_terrain_piece_v1"
    || !["ordinary", "grass", "impassable", "ramp"].includes(terrainKind)
    || !Number.isSafeInteger(size) || size < 0 || size > 9
    || !object(raw.setupAgreement)
    || raw.setupAgreement.schema !== "starcraft_tmg_terrain_setup_agreement_v1"
    || raw.setupAgreement.footprintAgreed !== true
    || raw.setupAgreement.footprintHash !== hashStarcraftTmgContract(footprint)
    || raw.setupAgreement.openingDenominatorComplete !== true
    || raw.setupAgreement.agreedDuringBattlefieldSetup !== true
    || raw.setupAgreement.trainingTruth !== false
    || raw.setupAgreement.agreementHash
      !== hashStarcraftTmgContract(setupAgreementBody(raw.setupAgreement))
    || raw.rulesTruth !== "official_core_terrain_setup_agreement"
    || raw.trainingTruth !== false
    || raw.terrainHash !== hashStarcraftTmgContract(terrainBody(raw))) {
    fail("SPECIAL_TERRAIN_PIECE_INVALID", terrainId);
  }
  return { terrainId, terrainKind, size, footprint,
    ...(footprintCells ? { footprintCells } : {}),
    standableHorizontalSurface: raw.standableHorizontalSurface === true,
    terrainHash: raw.terrainHash, raw };
}
function normalizedPair(value, detail) {
  if (!Array.isArray(value) || value.length !== 2) {
    fail("SPECIAL_TERRAIN_ELEVATION_PAIR_INVALID", detail);
  }
  const pair = value.map(elevation).sort((left, right) => (
    ELEVATIONS.indexOf(left) - ELEVATIONS.indexOf(right)
  ));
  if (pair[0] === pair[1]) fail("SPECIAL_TERRAIN_ELEVATION_PAIR_INVALID", detail);
  return pair;
}
function accessPointBody(entry) {
  return { accessPointId: entry.accessPointId, role: entry.role,
    footprint: entry.footprint, connects: entry.connects };
}
function normalizeAgreementEntry(raw) {
  const terrainId = String(raw?.terrainId || "").trim();
  const terrainKind = String(raw?.terrainKind || "ordinary").toLowerCase();
  if (!terrainId || !["ordinary", "grass", "impassable", "ramp"].includes(terrainKind)) {
    fail("SPECIAL_TERRAIN_AGREEMENT_ENTRY_INVALID", terrainId);
  }
  const adjacentElevationPairs = (raw.adjacentElevationPairs || []).map((pair) => (
    normalizedPair(pair, terrainId)
  )).sort((left, right) => left.join(":").localeCompare(right.join(":")));
  if (new Set(adjacentElevationPairs.map((pair) => pair.join(":"))).size
    !== adjacentElevationPairs.length) {
    fail("SPECIAL_TERRAIN_ADJACENCY_DUPLICATE", terrainId);
  }
  const accessPoints = (raw.accessPoints || []).map((entry) => ({
    accessPointId: String(entry?.accessPointId || "").trim(),
    role: String(entry?.role || "generic").toLowerCase(),
    footprint: rectangle(entry?.footprint,
      "SPECIAL_TERRAIN_ACCESS_POINT_FOOTPRINT_INVALID", terrainId),
    connects: normalizedPair(entry?.connects, terrainId),
  })).sort((left, right) => left.accessPointId.localeCompare(right.accessPointId));
  if (accessPoints.some((entry) => !entry.accessPointId)
    || new Set(accessPoints.map((entry) => entry.accessPointId)).size
      !== accessPoints.length) {
    fail("SPECIAL_TERRAIN_ACCESS_POINT_ID_INVALID", terrainId);
  }
  return { terrainId, terrainKind, adjacentElevationPairs,
    accessPoints: accessPoints.map((entry) => ({ ...accessPointBody(entry) })) };
}

export function createOfficialSpecialTerrainAgreementV1(input = {}) {
  const terrainEntries = (input.terrainEntries || []).map(normalizeAgreementEntry)
    .sort((left, right) => left.terrainId.localeCompare(right.terrainId));
  const accessPointIds = terrainEntries.flatMap((entry) => (
    entry.accessPoints.map((accessPoint) => accessPoint.accessPointId)
  ));
  if (terrainEntries.length === 0
    || new Set(terrainEntries.map((entry) => entry.terrainId)).size
      !== terrainEntries.length
    || new Set(accessPointIds).size !== accessPointIds.length) {
    fail("SPECIAL_TERRAIN_AGREEMENT_DENOMINATOR_INVALID");
  }
  const body = {
    schema: OFFICIAL_SPECIAL_TERRAIN_AGREEMENT_SCHEMA,
    terrainDenominatorComplete: true,
    terrainEntries,
    agreedDuringBattlefieldSetup: true,
    rulesTruth: "official_core_special_terrain_setup",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, agreementHash: hashStarcraftTmgContract(body) });
}

function rectanglesOverlap(left, right) {
  return left.minXMilliInches <= right.maxXMilliInches + TOLERANCE
    && left.maxXMilliInches >= right.minXMilliInches - TOLERANCE
    && left.minYMilliInches <= right.maxYMilliInches + TOLERANCE
    && left.maxYMilliInches >= right.minYMilliInches - TOLERANCE;
}
function pointInside(value, rect) {
  return value.xMilliInches >= rect.minXMilliInches - TOLERANCE
    && value.xMilliInches <= rect.maxXMilliInches + TOLERANCE
    && value.yMilliInches >= rect.minYMilliInches - TOLERANCE
    && value.yMilliInches <= rect.maxYMilliInches + TOLERANCE;
}
function pointRectangleDistance(value, rect) {
  const x = Math.max(rect.minXMilliInches,
    Math.min(value.xMilliInches, rect.maxXMilliInches));
  const y = Math.max(rect.minYMilliInches,
    Math.min(value.yMilliInches, rect.maxYMilliInches));
  return Math.hypot(value.xMilliInches - x, value.yMilliInches - y);
}
function segmentIntersectsRectangle(a, b, rect) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  let minimum = 0; let maximum = 1;
  for (const [direction, offset] of [
    [-dx, a.xMilliInches - rect.minXMilliInches],
    [dx, rect.maxXMilliInches - a.xMilliInches],
    [-dy, a.yMilliInches - rect.minYMilliInches],
    [dy, rect.maxYMilliInches - a.yMilliInches],
  ]) {
    if (direction === 0) {
      if (offset < 0) return false;
      continue;
    }
    const ratio = offset / direction;
    if (direction < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return maximum >= 0 && minimum <= 1;
}
function pointSegmentDistance(value, a, b) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  if (dx === 0 && dy === 0) return distance(value, a);
  const ratio = Math.max(0, Math.min(1,
    (((value.xMilliInches - a.xMilliInches) * dx)
      + ((value.yMilliInches - a.yMilliInches) * dy)) / ((dx * dx) + (dy * dy))));
  return Math.hypot(value.xMilliInches - (a.xMilliInches + (ratio * dx)),
    value.yMilliInches - (a.yMilliInches + (ratio * dy)));
}
function segmentRectangleDistance(a, b, rect) {
  if (segmentIntersectsRectangle(a, b, rect)) return 0;
  const corners = [
    { xMilliInches: rect.minXMilliInches, yMilliInches: rect.minYMilliInches },
    { xMilliInches: rect.maxXMilliInches, yMilliInches: rect.minYMilliInches },
    { xMilliInches: rect.maxXMilliInches, yMilliInches: rect.maxYMilliInches },
    { xMilliInches: rect.minXMilliInches, yMilliInches: rect.maxYMilliInches },
  ];
  return Math.min(pointRectangleDistance(a, rect), pointRectangleDistance(b, rect),
    ...corners.map((corner) => pointSegmentDistance(corner, a, b)));
}
function pathSweepsRectangle(path, radius, rect) {
  return path.slice(1).some((pointValue, index) => (
    segmentRectangleDistance(path[index], pointValue, rect) < radius - TOLERANCE
  ));
}
function pathIntersectsRectangle(path, rect) {
  return path.slice(1).some((pointValue, index) => (
    segmentIntersectsRectangle(path[index], pointValue, rect)
  ));
}
function pathLength(path) {
  return Math.round(path.slice(1).reduce((total, pointValue, index) => (
    total + distance(path[index], pointValue)
  ), 0));
}
function officialProfile(actor, dataBundle) {
  verifyOfficialTerrainLosDataBundleV1(dataBundle);
  const profile = dataBundle.profiles.find((entry) => (
    entry.recordKey === actor?.officialUnitRecordKey
  ));
  const flying = (profile?.combatTags || []).some((entry) => (
    String(entry).toLowerCase() === "flying"
  ));
  if (!profile || actor.sourceRecordHash !== profile.sourceRecordHash
    || actor.officialPayloadHash !== profile.payloadHash
    || (profile.printedSize === null && !flying)) {
    fail("SPECIAL_TERRAIN_OFFICIAL_PROFILE_INVALID", String(actor?.id || ""));
  }
  return profile;
}
function modelRadius(model) {
  const width = milli(model?.baseWidthInches,
    "SPECIAL_TERRAIN_BASE_UNSUPPORTED", String(model?.id || ""));
  const depth = milli(model?.baseDepthInches ?? model?.baseWidthInches,
    "SPECIAL_TERRAIN_BASE_UNSUPPORTED", String(model?.id || ""));
  if (String(model?.baseShape || "round").toLowerCase() !== "round"
    || width <= 0 || Math.abs(width - depth) > TOLERANCE) {
    fail("SPECIAL_TERRAIN_BASE_UNSUPPORTED", String(model?.id || ""));
  }
  return Math.round(width / 2);
}
function verifyContext(state) {
  const completeTerrain = (state?.board?.terrain || []).map(verifyTerrainPiece);
  const terrain = completeTerrain.filter((entry) => entry.raw?.isRemoved !== true);
  const agreement = state?.board?.specialTerrainAgreement;
  if (!object(agreement)
    || agreement.schema !== OFFICIAL_SPECIAL_TERRAIN_AGREEMENT_SCHEMA
    || agreement.terrainDenominatorComplete !== true
    || agreement.agreedDuringBattlefieldSetup !== true
    || agreement.rulesTruth !== "official_core_special_terrain_setup"
    || agreement.trainingTruth !== false
    || agreement.agreementHash
      !== hashStarcraftTmgContract(without(agreement, ["agreementHash"]))) {
    fail("SPECIAL_TERRAIN_AGREEMENT_INVALID");
  }
  const normalizedEntries = (agreement.terrainEntries || []).map(normalizeAgreementEntry)
    .sort((left, right) => left.terrainId.localeCompare(right.terrainId));
  if (JSON.stringify(normalizedEntries) !== JSON.stringify(agreement.terrainEntries)) {
    fail("SPECIAL_TERRAIN_AGREEMENT_NOT_CANONICAL");
  }
  const allAccessPointIds = normalizedEntries.flatMap((entry) => (
    entry.accessPoints.map((accessPoint) => accessPoint.accessPointId)
  ));
  if (new Set(allAccessPointIds).size !== allAccessPointIds.length) {
    fail("SPECIAL_TERRAIN_ACCESS_POINT_ID_DUPLICATE");
  }
  const byId = new Map(completeTerrain.map((entry) => [entry.terrainId, entry]));
  const agreementById = new Map(normalizedEntries.map((entry) => [entry.terrainId, entry]));
  if (byId.size !== completeTerrain.length
    || agreementById.size !== normalizedEntries.length
    || byId.size !== agreementById.size
    || [...byId.keys()].some((terrainId) => !agreementById.has(terrainId))) {
    fail("SPECIAL_TERRAIN_AGREEMENT_DENOMINATOR_INVALID");
  }
  for (const [terrainId, terrainPiece] of byId) {
    const entry = agreementById.get(terrainId);
    if (entry.terrainKind !== terrainPiece.terrainKind
      || entry.accessPoints.some((accessPoint) => (
        !(terrainPiece.footprintCells || [terrainPiece.footprint]).some(cell => rectanglesOverlap(accessPoint.footprint, cell))
        || !entry.adjacentElevationPairs.some((pair) => (
          pair.join(":") === accessPoint.connects.join(":")
        ))
      ))) fail("SPECIAL_TERRAIN_ENTRY_MISMATCH", terrainId);
    // A setup-agreed flat obstacle has no standable upper level to connect.
    // Do not require the compiler to invent an elevation pair for that case.
    // Elevated surfaces still need the existing adjacency/access derivation;
    // neither an access connection nor Size 0/1 may be labelled impassable.
    const agreedFlatObstacle = terrainPiece.terrainKind === "impassable"
      && !terrainPiece.standableHorizontalSurface;
    const derivedImpassable = entry.accessPoints.length === 0
      && (entry.adjacentElevationPairs.length > 0 || agreedFlatObstacle);
    if ((terrainPiece.terrainKind === "impassable") !== derivedImpassable) {
      fail("SPECIAL_TERRAIN_IMPASSABLE_DERIVATION_INVALID", terrainId);
    }
    if (terrainPiece.terrainKind === "impassable" && terrainPiece.size < 2) {
      fail("SPECIAL_TERRAIN_IMPASSABLE_SIZE_INVALID", terrainId);
    }
    if (terrainPiece.terrainKind === "grass"
      && (terrainPiece.size !== 2 || entry.accessPoints.length !== 0
        || entry.adjacentElevationPairs.length !== 0)) {
      fail("SPECIAL_TERRAIN_GRASS_PROFILE_INVALID", terrainId);
    }
    if (terrainPiece.terrainKind === "ramp") {
      const roles = entry.accessPoints.map((accessPoint) => accessPoint.role).sort();
      const roleConnections = Object.fromEntries(entry.accessPoints.map((accessPoint) => (
        [accessPoint.role, accessPoint.connects.join(":")]
      )));
      if (terrainPiece.size !== 1 || terrainPiece.standableHorizontalSurface !== true
        || entry.accessPoints.length !== 2
        || JSON.stringify(roles) !== JSON.stringify(["base", "top"])
        || roleConnections.base !== "ground:mid"
        || roleConnections.top !== "mid:high") {
        fail("SPECIAL_TERRAIN_RAMP_PROFILE_INVALID", terrainId);
      }
    }
  }
  return { terrain, byId, agreement, agreementById };
}
function completePlacements(actor, plan) {
  const models = activeModels(actor);
  const remaining = new Set(models.map((model) => model.id));
  if (!Array.isArray(plan.placements) || plan.placements.length !== remaining.size) {
    fail("SPECIAL_TERRAIN_PLACEMENT_DENOMINATOR_INVALID");
  }
  const rows = plan.placements.map((entry) => {
    const modelId = String(entry?.modelId || "");
    const model = models.find((candidate) => candidate.id === modelId);
    if (!model || !remaining.delete(modelId)) {
      fail("SPECIAL_TERRAIN_PLACEMENT_MODEL_INVALID", modelId);
    }
    return { modelId, point: point(entry, "SPECIAL_TERRAIN_PLACEMENT_INVALID", modelId),
      elevation: elevation(entry.elevation),
      supportTerrainIds: [...new Set((entry.supportTerrainIds || []).map(String))].sort(),
      radiusMilliInches: modelRadius(model),
      start: { xMilliInches: milli(model.xInches), yMilliInches: milli(model.yInches) },
      startElevation: elevation(model.elevation), model };
  }).sort((left, right) => left.modelId.localeCompare(right.modelId));
  if (remaining.size > 0) fail("SPECIAL_TERRAIN_PLACEMENT_DENOMINATOR_INVALID");
  return rows;
}
function adaptedOrdinaryTerrainState(state, context) {
  const clone = structuredClone(state);
  clone.board.terrain = context.terrain
    .filter((terrain) => terrain.terrainKind === "ordinary"
      && context.agreementById.get(terrain.terrainId).accessPoints.length === 0)
    .map((terrain) => structuredClone(terrain.raw));
  return clone;
}
function adaptedGapState(state, context) {
  const clone = structuredClone(state);
  clone.board.terrain = context.terrain
    .filter((terrain) => !["grass", "ramp"].includes(terrain.terrainKind)
      && context.agreementById.get(terrain.terrainId).accessPoints.length === 0)
    .map((terrain) => structuredClone(terrain.raw));
  return clone;
}
function adaptedLineOfSightState(state, context) {
  const clone = structuredClone(state);
  clone.board.terrain = context.terrain.flatMap((terrain) => (
    terrain.footprintCells ? terrain.footprintCells.map((footprint, index) =>
      createOfficialTerrainPieceV1({ id: `${terrain.terrainId}:sight-cell-${index + 1}`, terrainKind: "ordinary",
        size: terrain.size, footprint, standableHorizontalSurface: terrain.standableHorizontalSurface, openings: [] })) :
    terrain.terrainKind === "ordinary" ? structuredClone(terrain.raw)
      : createOfficialTerrainPieceV1({ id: terrain.terrainId, terrainKind: "ordinary",
        size: terrain.size, footprint: terrain.footprint,
        standableHorizontalSurface: terrain.standableHorizontalSurface,
        openings: terrain.raw.setupAgreement.openings })
  ));
  return clone;
}
function accessPointsUsedBySegment(entry, a, b) {
  return entry.accessPoints.filter((accessPoint) => (
    segmentIntersectsRectangle(a, b, accessPoint.footprint)
  )).map((accessPoint) => accessPoint.accessPointId).sort();
}
function evaluateMovement(input, context, profile) {
  const { state, actor, plan, dataBundle } = input;
  const planId = String(plan.planId || "").trim();
  const movementType = String(plan.movementType || "").toLowerCase();
  const leadingModelId = String(plan.leadingModelId || "");
  const maxDistanceMilliInches = Number(plan.maxDistanceMilliInches);
  const placements = completePlacements(actor, plan);
  const leading = placements.find((entry) => entry.modelId === leadingModelId);
  const path = (plan.path || []).map((entry, index) => ({
    ...point(entry, "SPECIAL_TERRAIN_PATH_INVALID", `${planId}/${index}`),
    elevation: elevation(entry.elevation),
  }));
  if (!planId || !MOVEMENT_TYPES.includes(movementType) || !leading
    || !Number.isSafeInteger(maxDistanceMilliInches) || maxDistanceMilliInches < 0
    || path.length < 2 || path.length > 64
    || distance(path[0], leading.start) > TOLERANCE
    || path[0].elevation !== leading.startElevation
    || distance(path.at(-1), leading.point) > TOLERANCE
    || path.at(-1).elevation !== leading.elevation
    || pathLength(path) > maxDistanceMilliInches + TOLERANCE) {
    fail("SPECIAL_TERRAIN_MOVEMENT_PLAN_INVALID", planId);
  }
  const flying = (profile.combatTags || []).some((entry) => (
    String(entry).toLowerCase() === "flying"
  ));
  const geometryOnlyPrintedSizeSubstitution = profile.printedSize === null ? 0 : null;
  const actorForGeometry = { ...actor, combatTags: [...profile.combatTags],
    sizeCharacteristic: profile.printedSize ?? geometryOnlyPrintedSizeSubstitution };
  const gapPlan = certifyOfficialGapPlaceGeometryPlanV1({
    state: adaptedGapState(state, context), actor: actorForGeometry,
    plan: { ...plan, path: path.map(({ elevation: _elevation, ...entry }) => entry) },
    procedureKind: "gap_traversal", movementType,
  });
  const ordinaryTerrainResult = flying ? null
    : evaluateOfficialLeadingModelTerrainV1({
      state: adaptedOrdinaryTerrainState(state, context), actor,
      leadingModelId, path, dataBundle,
    });
  const transitionBySegment = new Map();
  for (const transition of plan.elevationTransitions || []) {
    const segmentIndex = Number(transition?.segmentIndex);
    const accessPointId = String(transition?.accessPointId || "");
    if (!Number.isSafeInteger(segmentIndex) || segmentIndex < 0
      || segmentIndex >= path.length - 1 || !accessPointId
      || transitionBySegment.has(segmentIndex)) {
      fail("SPECIAL_TERRAIN_TRANSITION_DENOMINATOR_INVALID", String(segmentIndex));
    }
    transitionBySegment.set(segmentIndex, accessPointId);
  }
  const accessPointUses = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const from = path[index]; const to = path[index + 1];
    const declaredId = transitionBySegment.get(index);
    if (flying) {
      if (declaredId) fail("SPECIAL_TERRAIN_REDUNDANT_TRANSITION", String(index));
      continue;
    }
    if (from.elevation === to.elevation) {
      if (declaredId) fail("SPECIAL_TERRAIN_REDUNDANT_TRANSITION", String(index));
      continue;
    }
    if (!declaredId) fail("SPECIAL_TERRAIN_ACCESS_POINT_REQUIRED", String(index));
    const matches = [...context.agreementById.values()].flatMap((entry) => (
      entry.accessPoints.filter((accessPoint) => (
        accessPoint.accessPointId === declaredId
        && accessPoint.connects.includes(from.elevation)
        && accessPoint.connects.includes(to.elevation)
        && segmentIntersectsRectangle(from, to, accessPoint.footprint)
      )).map((accessPoint) => ({ terrainId: entry.terrainId, accessPoint }))
    ));
    if (matches.length !== 1) fail("SPECIAL_TERRAIN_ACCESS_POINT_INVALID", declaredId);
    accessPointUses.push({ segmentIndex: index, terrainId: matches[0].terrainId,
      accessPointId: declaredId, fromElevation: from.elevation,
      toElevation: to.elevation });
  }
  if (transitionBySegment.size !== accessPointUses.length) {
    fail("SPECIAL_TERRAIN_TRANSITION_DENOMINATOR_INVALID");
  }
  const grassRemoved = new Set();
  const terrainInteractions = [];
  for (const terrain of context.terrain) {
    const agreementEntry = context.agreementById.get(terrain.terrainId);
    const actualCells = terrain.footprintCells || [terrain.footprint];
    const pathIntersects = actualCells.some(cell => pathSweepsRectangle(path, leading.radiusMilliInches, cell));
    const endpointModelIds = placements.filter((entry) => (
      actualCells.some(cell => pointRectangleDistance(entry.point, cell)
        < entry.radiusMilliInches - TOLERANCE)
    )).map((entry) => entry.modelId);
    if (terrain.terrainKind === "impassable"
      && ((!flying && pathIntersects) || endpointModelIds.length > 0)) {
      fail("SPECIAL_TERRAIN_IMPASSABLE_MOVEMENT_FORBIDDEN", terrain.terrainId);
    }
    if (terrain.terrainKind === "grass"
      && ((!flying && pathIntersects) || endpointModelIds.length > 0)) {
      grassRemoved.add(terrain.terrainId);
    }
    let accessPointIdsUsedForTransit = [];
    if (agreementEntry.accessPoints.length > 0 && pathIntersects && !flying) {
      const used = new Set();
      for (let index = 0; index < path.length - 1; index += 1) {
        for (const accessPointId of accessPointsUsedBySegment(
          agreementEntry, path[index], path[index + 1],
        )) used.add(accessPointId);
      }
      accessPointIdsUsedForTransit = [...used].sort();
      const startInside = actualCells.some(cell => pointInside(path[0], cell));
      const endInside = actualCells.some(cell => pointInside(path.at(-1), cell));
      const insidePathPoints = path.filter((entry) => (
        actualCells.some(cell => pointInside(entry, cell))
      ));
      const requiredAccessPointCount = terrain.terrainKind === "ramp"
        ? startInside && endInside ? 0 : startInside || endInside ? 1 : 2
        : 1;
      if (accessPointIdsUsedForTransit.length < requiredAccessPointCount
        || (terrain.terrainKind === "ramp" && requiredAccessPointCount > 0
          && insidePathPoints.length === 0)
        || (terrain.terrainKind === "ramp"
          && insidePathPoints.some((entry) => entry.elevation !== "mid"))) {
        fail(terrain.terrainKind === "ramp"
          ? "SPECIAL_TERRAIN_RAMP_ACCESS_REQUIRED"
          : "SPECIAL_TERRAIN_ACCESS_POINT_REQUIRED", terrain.terrainId);
      }
    }
    if (terrain.terrainKind === "ramp") {
      for (const modelId of endpointModelIds) {
        const placement = placements.find((entry) => entry.modelId === modelId);
        if (placement.elevation !== "mid"
          || !placement.supportTerrainIds.includes(terrain.terrainId)
          || terrain.footprintCells && !officialRectangleUnionCoversBasesV1(terrain.footprintCells, [{
            shape: "round", center: placement.point, radiusMilliInches: placement.radiusMilliInches,
          }])) {
          fail("SPECIAL_TERRAIN_RAMP_ENDPOINT_INVALID", modelId);
        }
      }
    } else if (terrain.terrainKind !== "grass" && endpointModelIds.length > 0) {
      fail("SPECIAL_TERRAIN_ENDPOINT_OVERLAP_FORBIDDEN", terrain.terrainId);
    }
    terrainInteractions.push({ terrainId: terrain.terrainId,
      terrainKind: terrain.terrainKind, size: terrain.size, pathIntersects,
      endpointModelIds: endpointModelIds.sort(), accessPointIdsUsedForTransit,
      grassRemoved: grassRemoved.has(terrain.terrainId),
      impassableDerivedFromMissingAccessPoint:
        terrain.terrainKind === "impassable",
      sizeZeroOrOnePassable: terrain.terrainKind === "ordinary" && terrain.size <= 1 });
  }
  const coherencyAccessPointUses = [];
  const placementById = new Map(placements.map((entry) => [entry.modelId, entry]));
  const modelIds = [...placementById.keys()].sort();
  const adjacency = new Map(modelIds.map((modelId) => [modelId, []]));
  for (let left = 0; left < modelIds.length; left += 1) {
    for (let right = left + 1; right < modelIds.length; right += 1) {
      const from = placementById.get(modelIds[left]);
      const to = placementById.get(modelIds[right]);
      let blocked = false;
      const pairUses = [];
      if (!flying) {
        for (const terrain of context.terrain) {
          const entry = context.agreementById.get(terrain.terrainId);
          if (entry.accessPoints.length === 0) continue;
          if (!pathIntersectsRectangle([from.point, to.point], terrain.footprint)) continue;
          const accessPointIds = accessPointsUsedBySegment(entry, from.point, to.point);
          const fromInside = pointInside(from.point, terrain.footprint);
          const toInside = pointInside(to.point, terrain.footprint);
          const requiredAccessPointCount = terrain.terrainKind === "ramp"
            ? fromInside && toInside ? 0 : fromInside || toInside ? 1 : 2
            : 1;
          if (accessPointIds.length < requiredAccessPointCount) {
            blocked = true;
            continue;
          }
          pairUses.push({ fromModelId: from.modelId, toModelId: to.modelId,
            terrainId: entry.terrainId, accessPointIds });
        }
      }
      if (!blocked) {
        adjacency.get(from.modelId).push(to.modelId);
        adjacency.get(to.modelId).push(from.modelId);
        coherencyAccessPointUses.push(...pairUses);
      }
    }
  }
  const connected = new Set([leading.modelId]); const queue = [leading.modelId];
  while (queue.length > 0) {
    for (const modelId of adjacency.get(queue.shift()) || []) {
      if (!connected.has(modelId)) { connected.add(modelId); queue.push(modelId); }
    }
  }
  if (connected.size !== placements.length) {
    fail("SPECIAL_TERRAIN_COHERENCY_ACCESS_POINT_REQUIRED");
  }
  let flyingPlan = null;
  if (flying) {
    flyingPlan = certifyOfficialFlyingRulePlanV1({ state, actor,
      procedureKind: "move", plan: { ...plan,
        placements: placements.map((entry) => ({ modelId: entry.modelId,
          xMilliInches: entry.point.xMilliInches,
          yMilliInches: entry.point.yMilliInches })) } });
    if (JSON.stringify(flyingPlan.grass.removedAtEndpointTerrainIds)
      !== JSON.stringify([...grassRemoved].sort())) {
      fail("SPECIAL_TERRAIN_FLYING_GRASS_ADAPTER_MISMATCH");
    }
  }
  const body = {
    schema: "starcraft_tmg_official_special_terrain_movement_result_v1",
    planId, actorUnitId: actor.id, leadingModelId, movementType,
    printedSize: profile.printedSize, flying, maxDistanceMilliInches,
    pathLengthMilliInches: pathLength(path), path,
    placements: placements.map((entry) => ({ modelId: entry.modelId,
      xMilliInches: entry.point.xMilliInches, yMilliInches: entry.point.yMilliInches,
      elevation: entry.elevation, supportTerrainIds: entry.supportTerrainIds })),
    accessPointUses, coherencyAccessPointUses,
    terrainInteractions: terrainInteractions.sort((left, right) => (
      left.terrainId.localeCompare(right.terrainId)
    )),
    grassRemovedTerrainIds: [...grassRemoved].sort(),
    ordinaryTerrainResultHash: ordinaryTerrainResult?.resultHash || null,
    ordinaryTerrainTransitIgnoredByFrozenFlyingSlice83: flying,
    geometryOnlyPrintedSizeSubstitution,
    gapPlanHash: gapPlan.planHash,
    flyingPlanHash: flyingPlan?.planHash || null,
    leadingModelOwnsGapAndTerrainInteraction: true,
    accessPointsPermitElevationChangeAndCoherency: true,
    rampsAreSizeOneMidGround: true,
    productionQuarantinedUntilSlice87ArbitraryGeometry: true,
    rulesTruth: "official_special_terrain_movement_conformance",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function sealGrassResultWithScalarIdentity(body, scalarPlanId) {
  // Only this privately assembled grass-result body enters here. Its root
  // fields are fixed, named non-index keys; each value uses the SAME canonical
  // serializer and both identities use the SAME SHA-256 algorithm. Stream the
  // exact canonical root bytes. Hash the common prefix once and fork the native
  // digest only at planId, where the two identities first differ.
  const primaryHash = createHash(STARCRAFT_TMG_HASH_ALGORITHM);
  let scalarHash = null;
  primaryHash.update("{");
  let canonicalBodyLength = 2;
  let separator = "";
  for (const key of Object.keys(body).sort()) {
    if (body[key] === undefined) continue;
    const prefix = `${separator}${JSON.stringify(key)}:`;
    const value = key === "assessments" || key === "grassAssessments"
      ? canonicalNativeTerrainLineOfSightAssessmentsV1(body[key])
      : canonicalStarcraftTmgJson(body[key]);
    if (key === "planId" && scalarPlanId) scalarHash = primaryHash.copy();
    primaryHash.update(prefix).update(value);
    scalarHash?.update(prefix).update(key === "planId"
      ? JSON.stringify(scalarPlanId) : value);
    canonicalBodyLength += prefix.length + value.length;
    separator = ",";
  }
  primaryHash.update("}");
  scalarHash?.update("}");
  const primary = freezeDeep({ ...body, resultHash: primaryHash.digest("hex") });
  if (!scalarHash) return primary;
  const scalar = freezeDeep({ ...body, planId: scalarPlanId,
    resultHash: scalarHash.digest("hex") });
  // Adding the one resultHash property changes length independently of key
  // order. These native-only lengths can prove capacity without serializing
  // hundreds of MB again. No caller can supply a trusted length or result.
  NATIVE_GRASS_LOS_SERIALIZATIONS.set(primary, {
    scalarEquivalentResult: scalar,
    nativeBodySerializationCount: 1,
    nativeResultJsonCharacterLength: canonicalBodyLength
      + 1 + JSON.stringify("resultHash").length + 1
      + JSON.stringify(primary.resultHash).length,
  });
  return primary;
}

function evaluateGrassLineOfSight(input, context, adaptedState = null,
  preparedResult = null) {
  const { state, actor, plan, dataBundle } = input;
  const target = state.pieces?.find((piece) => piece.id === plan.targetUnitId);
  if (!activePiece(target)) fail("SPECIAL_TERRAIN_LOS_TARGET_INVALID");
  const result = preparedResult || evaluateOfficialTerrainLineOfSightV1({
    state: adaptedState || adaptedLineOfSightState(state, context),
    attacker: actor, attackerModelId: plan.attackerModelId,
    target, targetModelId: plan.targetModelId, dataBundle,
  });
  const grassIds = new Set(context.terrain.filter((entry) => entry.terrainKind === "grass")
    .map((entry) => entry.terrainId));
  const grassAssessments = result.assessments.filter((entry) => (
    grassIds.has(entry.terrainId)
  ));
  const body = {
    schema: "starcraft_tmg_official_grass_line_of_sight_result_v1",
    planId: String(plan.planId || ""), actorUnitId: actor.id,
    attackerModelId: plan.attackerModelId,
    targetUnitId: target.id, targetModelId: plan.targetModelId,
    modelEdgeDistanceMilliInches: result.modelEdgeDistanceMilliInches,
    assessments: result.assessments,
    terrainLineOfSightResultHash: result.resultHash,
    grassAssessments, grassSize: 2,
    grassBlocksLineOfSightUnderStandardCoverRules: true,
    visible: result.visible, blockingTerrainIds: result.blockingTerrainIds,
    adapter: "special_terrain_to_frozen_slice84_ordinary_geometry",
    productionQuarantinedUntilSlice87ArbitraryGeometry: true,
    rulesTruth: "official_grass_line_of_sight_conformance",
    trainingTruth: false,
  };
  // This adapter also resolves deferred impassable/ramp terrain. After
  // movement removes the last grass piece, an empty grass subset is a
  // valid ordinary-terrain LOS result, not an invalid plan.
  if (!body.planId) {
    fail("SPECIAL_TERRAIN_GRASS_LOS_PLAN_INVALID");
  }
  const scalarPlanId = String(input.scalarFallbackPlanId || "");
  const sealed = sealGrassResultWithScalarIdentity(body, scalarPlanId);
  NATIVE_GRASS_LOS_RESULTS.add(sealed);
  return sealed;
}

function rejectProvablyOversizedNativeLosAggregate(results, input) {
  if (!results.every(entry => entry.result === null
    || NATIVE_GRASS_LOS_RESULTS.has(entry.result))) return;
  // The native results are plain JSON values already accepted by canonical
  // hashing. Sorting object keys cannot change their JSON character count.
  // Count one bounded entry at a time, not one giant duplicate object/string.
  // The results ARRAY ALONE is a lower bound for the complete batch body.
  let lowerBoundChars = 2 + Math.max(0, results.length - 1);
  for (const entry of results) {
    const length = NATIVE_GRASS_LOS_SERIALIZATIONS.get(entry.result)
      ?.nativeResultJsonCharacterLength;
    lowerBoundChars += length === undefined ? JSON.stringify(entry).length
      : JSON.stringify({ ...entry, result: null }).length - 4 + length;
    // A partial sum already above the actual runtime cap is sufficient proof.
    // All physical pairs have completed before this capacity check starts.
    if (lowerBoundChars > bufferConstants.MAX_STRING_LENGTH) break;
  }
  if (lowerBoundChars <= bufferConstants.MAX_STRING_LENGTH) return;
  try { input.observeCapacityDiagnostic?.({
    aggregateSealSkippedForProvenCapacity: true,
    aggregateLowerBoundChars: lowerBoundChars,
    maximumStringLength: bufferConstants.MAX_STRING_LENGTH,
  }); } catch { /* diagnostics never change the capacity outcome */ }
  // Same actual JS capacity failure as the normal aggregate seal; all native
  // pairs have ALREADY completed. No data/search limit or alternate hash.
  throw new RangeError("Invalid string length");
}

function prepareNativeLineOfSightBatch(input) {
  const state = input.state;
  const queries = input.queries;
  const isolatePairFailures = input.isolatePairFailures === true;
  const cachedResults = input.cachedResults instanceof Map
    ? input.cachedResults : null;
  if (!object(state) || !Array.isArray(queries) || queries.length < 1) {
    fail("SPECIAL_TERRAIN_LOS_BATCH_INVALID");
  }
  const context = verifyContext(state);
  const adaptedState = adaptedLineOfSightState(state, context);
  const verifiedActorIds = new Set();
  const seenQueryIds = new Set();
  const checkedQueries = queries.map((query) => {
    const queryId = String(query?.queryId || "").trim();
    const actor = state.pieces?.find((piece) => piece.id === query.actorUnitId);
    const plan = {
      planId: String(query?.planId || queryId),
      attackerModelId: String(query?.attackerModelId || ""),
      targetUnitId: String(query?.targetUnitId || ""),
      targetModelId: String(query?.targetModelId || ""),
    };
    if (!queryId || seenQueryIds.has(queryId) || !activePiece(actor)
      || !plan.planId || !plan.attackerModelId || !plan.targetUnitId
      || !plan.targetModelId) fail("SPECIAL_TERRAIN_LOS_BATCH_QUERY_INVALID", queryId);
    seenQueryIds.add(queryId);
    if (!verifiedActorIds.has(actor.id)) {
      officialProfile(actor, input.dataBundle);
      verifiedActorIds.add(actor.id);
    }
    const cached = cachedResults?.get(queryId);
    const samePhysicalPair = cached?.actorUnitId === query.actorUnitId
      && cached?.attackerModelId === plan.attackerModelId
      && cached?.targetUnitId === plan.targetUnitId
      && cached?.targetModelId === plan.targetModelId
      && (isolatePairFailures || !cached?.failure);
    return { queryId, actor, plan, cached, samePhysicalPair,
      scalarFallbackPlanId: String(query.scalarFallbackPlanId || "") };
  });
  const pending = checkedQueries.filter((query) => !query.samePhysicalPair);
  return { state, context, adaptedState, checkedQueries, pending,
    isolatePairFailures, cachedResults };
}

// Internal CPU boundary: validate the COMPLETE request before partitioning it.
// Duplicate IDs and global source/actor/target failures must not become valid
// merely because they were sent to different workers.
export function validateNativeSpecialTerrainLosBatchV1(input = {}) {
  const prepared = prepareNativeLineOfSightBatch(input);
  for (const { plan } of prepared.pending) {
    const target = prepared.state.pieces?.find(piece => piece.id === plan.targetUnitId);
    if (!activePiece(target)) fail("SPECIAL_TERRAIN_LOS_TARGET_INVALID");
  }
}

// Same native evaluations, but no aggregate seal. Workers retain these FULL
// sealed pair results; compact tactical rows are projections, not Rules truth.
export function evaluateNativeSpecialTerrainLosEntriesV1(input = {}) {
  const { state, context, adaptedState, checkedQueries, pending,
    isolatePairFailures, cachedResults } = prepareNativeLineOfSightBatch(input);
  const evaluateOrdinaryBatch = isolatePairFailures
    ? evaluateOfficialTerrainLineOfSightBatchOutcomesV1
    : evaluateOfficialTerrainLineOfSightBatchV1;
  const ordinaryResults = pending.length === 0 ? []
    : evaluateOrdinaryBatch({ state: adaptedState,
      dataBundle: input.dataBundle,
      queries: pending.map(({ actor, plan }) => {
        const target = state.pieces?.find((piece) => piece.id === plan.targetUnitId);
        if (!activePiece(target)) fail("SPECIAL_TERRAIN_LOS_TARGET_INVALID");
        return { attacker: actor, attackerModelId: plan.attackerModelId,
          target, targetModelId: plan.targetModelId };
      }),
    });
  let ordinaryIndex = 0;
  const results = checkedQueries.map(({ queryId, actor, plan, cached,
    samePhysicalPair, scalarFallbackPlanId }) => {
    let result = samePhysicalPair ? cached.result : null;
    let failure = samePhysicalPair ? cached.failure || null : null;
    if (!samePhysicalPair) {
      const ordinary = ordinaryResults[ordinaryIndex++];
      failure = isolatePairFailures ? ordinary.failure : null;
      if (!failure) {
        result = evaluateGrassLineOfSight({
          state, actor, plan, dataBundle: input.dataBundle, scalarFallbackPlanId,
        }, context, adaptedState, isolatePairFailures ? ordinary.result : ordinary);
      }
    }
    if (!samePhysicalPair && cachedResults && cachedResults.size < 8192) {
      cachedResults.set(queryId, {
        actorUnitId: actor.id,
        attackerModelId: plan.attackerModelId,
        targetUnitId: plan.targetUnitId,
        targetModelId: plan.targetModelId,
        result,
        ...(failure ? { failure } : {}),
      });
    }
    const completed = { queryId, result, ...(failure ? { failure } : {}) };
    // Report only actually completed native work, before the aggregate seal.
    // A capacity failure while serializing that seal must not force consumers
    // to recalculate these same physical pairs. This observer supplies no
    // prepared state/results to the kernel and cannot change a rules outcome.
    try { input.observeCompletedPair?.(Object.freeze({ ...completed,
      ...(NATIVE_GRASS_LOS_SERIALIZATIONS.get(result) || {}),
    })); }
    catch { /* observation must not reject completed rules work */ }
    return completed;
  });
  return results;
}

export function visitNativeSpecialTerrainLosEntriesV1(input = {}) {
  // Existing reusable/external cache semantics stay in the original batch.
  if (input.cachedResults instanceof Map) {
    evaluateNativeSpecialTerrainLosEntriesV1(input);
    return;
  }
  const { state, context, adaptedState, checkedQueries } = prepareNativeLineOfSightBatch(input);
  const ordinaryQueries = checkedQueries.map(({ actor, plan }) => {
    const target = state.pieces?.find(piece => piece.id === plan.targetUnitId);
    if (!activePiece(target)) fail("SPECIAL_TERRAIN_LOS_TARGET_INVALID");
    return { attacker: actor, attackerModelId: plan.attackerModelId,
      target, targetModelId: plan.targetModelId };
  });
  visitNativeOfficialTerrainLosOutcomesV1({ state: adaptedState,
    dataBundle: input.dataBundle, queries: ordinaryQueries }, (ordinary, index) => {
    const { queryId, actor, plan, scalarFallbackPlanId } = checkedQueries[index];
    const result = ordinary.failure ? null : evaluateGrassLineOfSight({
      state, actor, plan, dataBundle: input.dataBundle, scalarFallbackPlanId,
    }, context, adaptedState, ordinary.result);
    const completed = { queryId, result,
      ...(ordinary.failure ? { failure: ordinary.failure } : {}) };
    try { input.observeCompletedPair?.(Object.freeze({ ...completed,
      ...(NATIVE_GRASS_LOS_SERIALIZATIONS.get(result) || {}),
    })); } catch { /* observations never alter native pair facts */ }
    // No full ordinaryResults/results array survives this iteration. Native
    // result/assessment WeakMaps do not retain unreferenced pair trees either.
  });
}

// Internal worker text transport uses the native frozen assessments' existing
// canonical bytes. Foreign values retain the ordinary canonical serializer.
export function canonicalNativeSpecialTerrainLosEntryV1(entry) {
  if (!NATIVE_GRASS_LOS_RESULTS.has(entry?.result)) {
    return canonicalStarcraftTmgJson(entry);
  }
  const result = entry.result;
  const resultText = "{" + Object.keys(result).sort()
    .filter(key => result[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${key === "assessments" || key === "grassAssessments"
      ? canonicalNativeTerrainLineOfSightAssessmentsV1(result[key])
      : canonicalStarcraftTmgJson(result[key])}`).join(",") + "}";
  return "{" + Object.keys(entry).sort()
    .filter(key => entry[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${key === "result"
      ? resultText : canonicalStarcraftTmgJson(entry[key])}`).join(",") + "}";
}

export function evaluateOfficialSpecialTerrainLineOfSightBatchV1(input = {}) {
  const results = evaluateNativeSpecialTerrainLosEntriesV1(input);
  const body = {
    schema: "starcraft_tmg_official_special_terrain_los_batch_v1",
    queryCount: results.length,
    queryIds: results.map((entry) => entry.queryId),
    results,
    contextVerifiedOnce: true,
    adaptedStateBuiltOnce: true,
    ...(results.some((entry) => entry.failure) ? {
      isolatedPairFailureCount: results.filter((entry) => entry.failure).length,
      failedPairsRemainUnknown: true,
    } : {}),
    everyModelPairStillEvaluatedByOfficialTerrainLos: true,
    rulesTruth: "official_grass_line_of_sight_batch_conformance",
    trainingTruth: false,
  };
  rejectProvablyOversizedNativeLosAggregate(results, input);
  return freezeDeep({ ...body, batchHash: hashStarcraftTmgContract(body) });
}

export function certifyOfficialSpecialTerrainPlanV1(input = {}) {
  const state = input.state; const actor = input.actor; const plan = input.plan;
  const procedureKind = String(input.procedureKind || "");
  if (!object(state) || !activePiece(actor) || !object(plan)) {
    fail("SPECIAL_TERRAIN_PLAN_INVALID");
  }
  const context = verifyContext(state);
  const profile = officialProfile(actor, input.dataBundle);
  let result;
  if (procedureKind === "special_terrain_movement_check") {
    result = evaluateMovement({ ...input, state, actor, plan,
      dataBundle: input.dataBundle }, context, profile);
  } else if (procedureKind === "grass_line_of_sight_check") {
    result = evaluateGrassLineOfSight({ ...input, state, actor, plan,
      dataBundle: input.dataBundle }, context);
  } else fail("SPECIAL_TERRAIN_PROCEDURE_KIND_INVALID", procedureKind);
  const body = { planId: String(plan.planId || ""), procedureKind,
    actorUnitId: actor.id, result,
    specialTerrainAgreementHash: context.agreement.agreementHash,
    productionQuarantinedUntilSlice87ArbitraryGeometry: true,
    trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}
