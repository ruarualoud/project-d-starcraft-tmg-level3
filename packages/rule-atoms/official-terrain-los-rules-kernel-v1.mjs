import { normalizeOfficialRectangleUnionFootprintCellsV1 } from
  "./official-footprint-rectangle-union-geometry-v1.mjs";
import { hashStarcraftTmgContract, canonicalStarcraftTmgJson,
  STARCRAFT_TMG_HASH_ALGORITHM } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { types, isDeepStrictEqual } from "node:util";
import { verifyOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";
import {
  createOfficialPhysicalFootprintV1,
  createOfficialModelBaseFootprintV1,
  readOfficialCrossArmDimensionsV1,
  isOfficialProfileBoundOutlineV1,
  evaluateOfficialPhysicalFootprintRelationV1,
} from "./official-model-base-geometry-rules-kernel-v1.mjs";
import { resolveConvexFootprintRectangleTraceV1 } from
  "./convex-footprint-rectangle-trace-v1.mjs";
import { createNativeAssessmentPrefixDigestV1 } from
  "./native-assessment-prefix-digest-v1.mjs";
import { verifyOfficialBattlefieldTokenV1 } from './official-battlefield-token-marker-rules-kernel-v1.mjs';
import { createOfficialDisplacementTokenFootprintV1 } from './official-token-displacement-geometry-v1.mjs';

export const OFFICIAL_TERRAIN_LOS_RULES_KERNEL_SCHEMA =
  "starcraft_tmg_official_terrain_los_rules_kernel_v1";
export const OFFICIAL_TERRAIN_LOS_RULES_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_TERRAIN_PIECE_SCHEMA =
  "starcraft_tmg_official_terrain_piece_v1";

const TOLERANCE = 1;
const INCH = 1000;
const CLOSE_QUARTERS_RANGE = 3000;
// Exact canonical text of ONLY this module's own frozen assessment records.
// This is serialization reuse, never externally supplied visibility authority.
const NATIVE_ASSESSMENT_JSON = new WeakMap();
const NATIVE_ASSESSMENT_ARRAY_JSON = new WeakMap();

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

// Internal cross-module seam for the grass adapter. Foreign/dynamic arrays or
// records retain the normal canonical serializer. A filtered subset can borrow
// text only for actual native immutable entries, and is not cached itself.
export function canonicalNativeTerrainLineOfSightAssessmentsV1(assessments) {
  const native = NATIVE_ASSESSMENT_ARRAY_JSON.get(assessments);
  if (native !== undefined) return native;
  if (!Array.isArray(assessments) || types.isProxy(assessments)
    || Object.getPrototypeOf(assessments) !== Array.prototype
    || Reflect.ownKeys(assessments).length !== assessments.length + 1) {
    return canonicalStarcraftTmgJson(assessments);
  }
  const parts = [];
  for (let index = 0; index < assessments.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(assessments, String(index));
    const text = descriptor && "value" in descriptor
      ? NATIVE_ASSESSMENT_JSON.get(descriptor.value) : undefined;
    if (text === undefined) return canonicalStarcraftTmgJson(assessments);
    parts.push(text);
  }
  return `[${parts.join(",")}]`;
}

function canonicalNativeTerrainAssessment(assessment, context) {
  // Only this evaluator's own complete records reach here. Reuse an exact
  // property layout, never a guessed whitelist/schema subset. A future extra,
  // missing or reordered field rebuilds the layout; published bytes still use
  // the original lexical key order. The context is private to verified terrain.
  const keys = Object.keys(assessment);
  let layout = context.nativeAssessmentFieldLayout;
  if (!layout || keys.length !== layout.keys.length
    || keys.some((key, index) => key !== layout.keys[index])) {
    layout = context.nativeAssessmentFieldLayout = {
      keys, orderedKeys: [...keys].sort(),
    };
  }
  const ordered = {};
  for (const key of layout.orderedKeys) {
    const value = assessment[key];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry !== "string") return canonicalStarcraftTmgJson(assessment);
      }
    } else if (value !== null && typeof value !== "string"
      && typeof value !== "boolean"
      && !(typeof value === "number" && Number.isFinite(value))) {
      // Non-flat/exceptional fields retain the complete original normalizer,
      // including exact diagnostic paths. No public record populates this seam.
      return canonicalStarcraftTmgJson(assessment);
    }
    ordered[key] = value;
  }
  return JSON.stringify(ordered);
}

function sealNativeTerrainLineOfSightResult(body, context) {
  // Only the evaluator's actual immutable records can reuse their exact bytes.
  // No external hash/frozen flag can populate this private native text cache.
  const assessmentTexts = body.assessments.map(entry => {
    const prior = NATIVE_ASSESSMENT_JSON.get(entry);
    if (prior !== undefined) return prior;
    const text = canonicalNativeTerrainAssessment(entry, context);
    freezeDeep(entry);
    NATIVE_ASSESSMENT_JSON.set(entry, text);
    return text;
  });
  // All current assessments remain present. Reuse only exact prefix bytes in
  // the same privately prepared terrain context, never a visibility verdict.
  const prefix = (context.nativeAssessmentPrefixDigest ||=
    createNativeAssessmentPrefixDigestV1(STARCRAFT_TMG_HASH_ALGORITHM))
    .digest(assessmentTexts);
  const assessmentText = prefix.text;
  const digest = prefix.digest;
  let separator = ",";
  // Native result roots have fixed named non-index keys. These are the exact
  // canonical root bytes; no change to generic hashing or result contracts.
  for (const key of Object.keys(body).sort()) {
    if (body[key] === undefined || key === "assessments") continue;
    digest.update(`${separator}${JSON.stringify(key)}:`)
      .update(canonicalStarcraftTmgJson(body[key]));
    separator = ",";
  }
  digest.update("}");
  const result = freezeDeep({ ...body, resultHash: digest.digest("hex") });
  NATIVE_ASSESSMENT_ARRAY_JSON.set(result.assessments, assessmentText);
  return result;
}
function point(value, code = "TERRAIN_LOS_POINT_INVALID", detail = "") {
  const xMilliInches = Number(value?.xMilliInches);
  const yMilliInches = Number(value?.yMilliInches);
  if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches)) {
    fail(code, detail);
  }
  return { xMilliInches, yMilliInches };
}
function milli(value, code = "TERRAIN_LOS_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}
function distance(left, right) {
  return Math.hypot(right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches);
}
function elevationBand(value) {
  const normalized = String(value || "ground").trim().toLowerCase();
  if (["ground", "ground_level"].includes(normalized)) return "ground";
  if (["mid", "middle", "mid_ground"].includes(normalized)) return "mid";
  if (["high", "high_ground"].includes(normalized)) return "high";
  return normalized;
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function activeModel(model) {
  return model?.isOnField !== false && model?.isDestroyed !== true;
}
function rectangle(value, code, detail) {
  const minX = Number(value?.minXMilliInches);
  const maxX = Number(value?.maxXMilliInches);
  const minY = Number(value?.minYMilliInches);
  const maxY = Number(value?.maxYMilliInches);
  if (![minX, maxX, minY, maxY].every(Number.isSafeInteger)
    || minX >= maxX || minY >= maxY) fail(code, detail);
  return { shape: "axis_aligned_rectangle", minXMilliInches: minX,
    maxXMilliInches: maxX, minYMilliInches: minY, maxYMilliInches: maxY };
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
function agreementBody(agreement) {
  return { schema: agreement.schema,
    footprintAgreed: agreement.footprintAgreed,
    footprintHash: agreement.footprintHash,
    ...(agreement.footprintCellsHash ? { footprintCellsHash: agreement.footprintCellsHash } : {}),
    openingDenominatorComplete: agreement.openingDenominatorComplete,
    openings: agreement.openings,
    agreedDuringBattlefieldSetup: agreement.agreedDuringBattlefieldSetup,
    trainingTruth: agreement.trainingTruth };
}
function verifyOpening(raw, terrainId, footprint) {
  const openingId = String(raw?.openingId || "").trim();
  if (!openingId) fail("TERRAIN_LOS_OPENING_ID_REQUIRED", terrainId);
  const opening = rectangle(raw?.footprint,
    "TERRAIN_LOS_OPENING_FOOTPRINT_INVALID", openingId);
  if (opening.minXMilliInches < footprint.minXMilliInches
    || opening.maxXMilliInches > footprint.maxXMilliInches
    || opening.minYMilliInches < footprint.minYMilliInches
    || opening.maxYMilliInches > footprint.maxYMilliInches) {
    fail("TERRAIN_LOS_OPENING_OUTSIDE_FOOTPRINT", openingId);
  }
  return { openingId, footprint: opening,
    movementPassableAgreed: raw.movementPassableAgreed === true,
    lineOfSightOpenAgreed: raw.lineOfSightOpenAgreed === true };
}
function verifyTerrain(raw) {
  const terrainId = String(raw?.id || "").trim();
  const terrainKind = String(raw?.terrainKind || "ordinary").toLowerCase();
  const size = Number(raw?.size);
  if (!terrainId || raw?.schema !== OFFICIAL_TERRAIN_PIECE_SCHEMA
    || !Number.isSafeInteger(size) || size < 0 || size > 9
    || !object(raw.setupAgreement)
    || raw.setupAgreement.schema !== "starcraft_tmg_terrain_setup_agreement_v1"
    || raw.setupAgreement.footprintAgreed !== true
    || raw.setupAgreement.openingDenominatorComplete !== true
    || raw.setupAgreement.trainingTruth !== false
    || raw.setupAgreement.agreementHash
      !== hashStarcraftTmgContract(agreementBody(raw.setupAgreement))
    || raw.rulesTruth !== "official_core_terrain_setup_agreement"
    || raw.trainingTruth !== false
    || raw.terrainHash !== hashStarcraftTmgContract(terrainBody(raw))) {
    fail("TERRAIN_LOS_TERRAIN_INVALID", terrainId);
  }
  const footprint = rectangle(raw.footprint,
    "TERRAIN_LOS_TERRAIN_FOOTPRINT_INVALID", terrainId);
  const footprintCells = raw.footprintCells === undefined ? undefined
    : normalizeOfficialRectangleUnionFootprintCellsV1(raw.footprintCells, footprint);
  if (footprintCells && (terrainKind !== "ramp"
    || JSON.stringify(footprintCells) !== JSON.stringify(raw.footprintCells)
    || raw.setupAgreement.footprintCellsHash !== hashStarcraftTmgContract(footprintCells))
    || !footprintCells && raw.setupAgreement.footprintCellsHash !== undefined) {
    fail("TERRAIN_LOS_UNION_PROFILE_INVALID", terrainId);
  }
  if (raw.setupAgreement.footprintHash !== hashStarcraftTmgContract(footprint)
    || !Array.isArray(raw.setupAgreement.openings)) {
    fail("TERRAIN_LOS_SETUP_AGREEMENT_INVALID", terrainId);
  }
  const openings = raw.setupAgreement.openings.map((entry) => (
    verifyOpening(entry, terrainId, footprint)
  )).sort((left, right) => left.openingId.localeCompare(right.openingId));
  if (new Set(openings.map((entry) => entry.openingId)).size !== openings.length) {
    fail("TERRAIN_LOS_OPENING_ID_DUPLICATE", terrainId);
  }
  return { terrainId, terrainKind, size, footprint, openings,
    ...(footprintCells ? { footprintCells } : {}),
    standableHorizontalSurface: raw.standableHorizontalSurface === true,
    terrainHash: raw.terrainHash };
}

export function readOfficialCompoundRampSightV1(raw) {
  if (raw?.rangedSightProjection !== "signed_compound_ramp_v1") return null;
  const terrain = verifyTerrain(raw);
  if (terrain.terrainKind !== "ramp" || !terrain.footprintCells?.length
    || terrain.size !== 1 || !terrain.standableHorizontalSurface) {
    fail("TERRAIN_LOS_RAMP_PROFILE_INVALID", terrain.terrainId);
  }
  return terrain;
}

export function createOfficialTerrainPieceV1(input = {}) {
  const footprint = rectangle(input.footprint,
    "TERRAIN_LOS_TERRAIN_FOOTPRINT_INVALID", String(input.id || ""));
  const footprintCells = input.footprintCells === undefined ? undefined
    : normalizeOfficialRectangleUnionFootprintCellsV1(input.footprintCells, footprint);
  const openings = (input.openings || []).map((entry) => ({
    openingId: String(entry.openingId || "").trim(),
    footprint: rectangle(entry.footprint,
      "TERRAIN_LOS_OPENING_FOOTPRINT_INVALID", String(entry.openingId || "")),
    movementPassableAgreed: entry.movementPassableAgreed === true,
    lineOfSightOpenAgreed: entry.lineOfSightOpenAgreed === true,
  })).sort((left, right) => left.openingId.localeCompare(right.openingId));
  const agreementBodyValue = {
    schema: "starcraft_tmg_terrain_setup_agreement_v1",
    footprintAgreed: true, footprintHash: hashStarcraftTmgContract(footprint),
    ...(footprintCells ? { footprintCellsHash: hashStarcraftTmgContract(footprintCells) } : {}),
    openingDenominatorComplete: true, openings,
    agreedDuringBattlefieldSetup: true, trainingTruth: false,
  };
  const setupAgreement = { ...agreementBodyValue,
    agreementHash: hashStarcraftTmgContract(agreementBodyValue) };
  const body = {
    schema: OFFICIAL_TERRAIN_PIECE_SCHEMA,
    id: String(input.id || "").trim(),
    terrainKind: String(input.terrainKind || "ordinary").toLowerCase(),
    size: Number(input.size), footprint,
    ...(footprintCells ? { footprintCells } : {}),
    standableHorizontalSurface: input.standableHorizontalSurface === true,
    setupAgreement, rulesTruth: "official_core_terrain_setup_agreement",
    trainingTruth: false,
  };
  const result = freezeDeep({ ...body, terrainHash: hashStarcraftTmgContract(body) });
  verifyTerrain(result);
  return result;
}

function officialProfile(piece, dataBundle, measuredContour) {
  verifyOfficialTerrainLosDataBundleV1(dataBundle);
  const profile = dataBundle.profiles.find((entry) => (
    entry.recordKey === piece?.officialUnitRecordKey
  ));
  if (!profile || piece.sourceRecordHash !== profile.sourceRecordHash
    || piece.officialPayloadHash !== profile.payloadHash
    || (profile.printedSize === null && !(measuredContour && profile.combatTags.includes("flying")))) {
    fail("TERRAIN_LOS_OFFICIAL_UNIT_PROFILE_INVALID", String(piece?.id || ""));
  }
  return profile;
}
function physicalModel(piece, modelId, dataBundle, state) {
  if (!activePiece(piece)) fail("TERRAIN_LOS_UNIT_INVALID", String(piece?.id || ""));
  const model = (piece.models || []).find((entry) => entry.id === modelId && activeModel(entry));
  const shape = String(model?.baseShape || "round").toLowerCase();
  const measuredContour = shape === "measured_contour";
  const profile = officialProfile(piece, dataBundle, measuredContour);
  const width = milli(model?.baseWidthInches, "TERRAIN_LOS_MODEL_BASE_INVALID", modelId);
  const depth = milli(model?.baseDepthInches ?? model?.baseWidthInches,
    "TERRAIN_LOS_MODEL_BASE_INVALID", modelId);
  if (!model || !(["round", "rectangle"].includes(shape) || isOfficialProfileBoundOutlineV1(shape))
    || width <= 0 || depth <= 0 || (shape === "round" && Math.abs(width - depth) > TOLERANCE)) {
    fail("TERRAIN_LOS_MODEL_BASE_INVALID", modelId);
  }
  const supportTerrainIds = [...new Set((model.supportTerrainIds || []).map(String))].sort();
  const center = { xMilliInches: milli(model.xInches),
    yMilliInches: milli(model.yInches) };
  const footprint = measuredContour ? createOfficialModelBaseFootprintV1({
    piece, model, dataBundle: state?.officialModelBaseGeometryDataBundle, position: center,
  }) : createOfficialPhysicalFootprintV1({
    objectId: model.id,
    kind: "model_base",
    shape,
    center,
    widthMilliInches: width,
    depthMilliInches: depth,
    ...(shape === "orthogonal_cross" ? readOfficialCrossArmDimensionsV1(model) : {}),
    rotationDegrees: model.baseRotationDegrees || 0,
  });
  const sweepRadiusMilliInches = measuredContour
    ? Math.ceil(Math.max(...footprint.localVerticesMilliInches.map(vertex =>
      Math.hypot(vertex.xMilliInches, vertex.yMilliInches))))
    : shape === "round" ? Math.round(width / 2) : Math.ceil(Math.hypot(width / 2, depth / 2));
  return { unitId: piece.id, modelId: model.id, sideKey: piece.sideKey,
    center, footprint, baseShape: shape,
    sweepRadiusMilliInches,
    printedSize: profile.printedSize,
    elevation: String(model.elevation || "ground").toLowerCase(), supportTerrainIds,
    officialRecordKey: profile.recordKey };
}
function pointRectangleDistance(value, footprint) {
  const x = Math.max(footprint.minXMilliInches,
    Math.min(value.xMilliInches, footprint.maxXMilliInches));
  const y = Math.max(footprint.minYMilliInches,
    Math.min(value.yMilliInches, footprint.maxYMilliInches));
  return Math.hypot(value.xMilliInches - x, value.yMilliInches - y);
}
function terrainPhysicalFootprint(terrain) {
  const footprint = terrain.footprint;
  return createOfficialPhysicalFootprintV1({
    objectId: terrain.terrainId,
    kind: "terrain_piece",
    shape: "rectangle",
    center: {
      xMilliInches: Math.round((footprint.minXMilliInches
        + footprint.maxXMilliInches) / 2),
      yMilliInches: Math.round((footprint.minYMilliInches
        + footprint.maxYMilliInches) / 2),
    },
    widthMilliInches: footprint.maxXMilliInches - footprint.minXMilliInches,
    depthMilliInches: footprint.maxYMilliInches - footprint.minYMilliInches,
    rotationDegrees: 0,
  });
}
function baseEdgeToTerrain(model, terrain) {
  if (terrain.footprintCells) return Math.min(...terrain.footprintCells.map(footprint =>
    baseEdgeToTerrain(model, { terrainId: terrain.terrainId, footprint })));
  return evaluateOfficialPhysicalFootprintRelationV1({
    left: model.footprint,
    right: terrainPhysicalFootprint(terrain),
  }).minimumSeparationMilliInches;
}
function modelEdgeDistance(left, right) {
  return evaluateOfficialPhysicalFootprintRelationV1({
    left: left.footprint,
    right: right.footprint,
  }).minimumSeparationMilliInches;
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
function orientation(a, b, c) {
  return (BigInt(b.xMilliInches - a.xMilliInches)
      * BigInt(c.yMilliInches - a.yMilliInches))
    - (BigInt(b.yMilliInches - a.yMilliInches)
      * BigInt(c.xMilliInches - a.xMilliInches));
}
function between(value, left, right) {
  return value >= Math.min(left, right) && value <= Math.max(left, right);
}
function onSegment(a, b, p) {
  return orientation(a, b, p) === 0n
    && between(p.xMilliInches, a.xMilliInches, b.xMilliInches)
    && between(p.yMilliInches, a.yMilliInches, b.yMilliInches);
}
function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c); const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a); const o4 = orientation(c, d, b);
  if (((o1 > 0n && o2 < 0n) || (o1 < 0n && o2 > 0n))
    && ((o3 > 0n && o4 < 0n) || (o3 < 0n && o4 > 0n))) return true;
  return (o1 === 0n && onSegment(a, b, c)) || (o2 === 0n && onSegment(a, b, d))
    || (o3 === 0n && onSegment(c, d, a)) || (o4 === 0n && onSegment(c, d, b));
}
function pointSegmentDistance(value, a, b) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  if (dx === 0 && dy === 0) return distance(value, a);
  const t = Math.max(0, Math.min(1, ((value.xMilliInches - a.xMilliInches) * dx
    + (value.yMilliInches - a.yMilliInches) * dy) / ((dx * dx) + (dy * dy))));
  return Math.hypot(value.xMilliInches - (a.xMilliInches + (t * dx)),
    value.yMilliInches - (a.yMilliInches + (t * dy)));
}
function segmentRectangleDistance(a, b, rect) {
  if (segmentIntersectsRectangle(a, b, rect)) return 0;
  const corners = [
    { xMilliInches: rect.minXMilliInches, yMilliInches: rect.minYMilliInches },
    { xMilliInches: rect.maxXMilliInches, yMilliInches: rect.minYMilliInches },
    { xMilliInches: rect.maxXMilliInches, yMilliInches: rect.maxYMilliInches },
    { xMilliInches: rect.minXMilliInches, yMilliInches: rect.maxYMilliInches },
  ];
  let minimum = Math.min(pointRectangleDistance(a, rect), pointRectangleDistance(b, rect));
  for (let index = 0; index < corners.length; index += 1) {
    const left = corners[index]; const right = corners[(index + 1) % corners.length];
    if (segmentsIntersect(a, b, left, right)) return 0;
    minimum = Math.min(minimum, pointSegmentDistance(left, a, b),
      pointSegmentDistance(a, left, right), pointSegmentDistance(b, left, right));
  }
  return minimum;
}
function baseOverlapsTerrain(model, terrain) {
  return evaluateOfficialPhysicalFootprintRelationV1({
    left: model.footprint,
    right: terrainPhysicalFootprint(terrain),
  }).overlappingInteriors;
}
function pathSweepsTerrain(points, radius, terrain) {
  for (let index = 1; index < points.length; index += 1) {
    if (segmentRectangleDistance(points[index - 1], points[index], terrain.footprint)
      < radius - TOLERANCE) return true;
  }
  return false;
}
function valueAt(start, end, ratio) { return start + ((end - start) * ratio); }
function segmentAxisWindow(a, b, minimum, maximum, axis) {
  const start = a[axis]; const end = b[axis]; const delta = end - start;
  if (Math.abs(delta) <= TOLERANCE) {
    return start >= minimum - TOLERANCE && start <= maximum + TOLERANCE
      ? [0, 1] : null;
  }
  const left = (minimum - start) / delta;
  const right = (maximum - start) / delta;
  const low = Math.max(0, Math.min(left, right));
  const high = Math.min(1, Math.max(left, right));
  return low <= high + Number.EPSILON ? [low, high] : null;
}
function segmentClearsMovementOpening(a, b, radius, opening, terrain) {
  if (!opening.movementPassableAgreed) return false;
  const hole = opening.footprint; const rect = terrain.footprint;
  const fullWidth = hole.minXMilliInches <= rect.minXMilliInches + TOLERANCE
    && hole.maxXMilliInches >= rect.maxXMilliInches - TOLERANCE;
  if (fullWidth) {
    const window = segmentAxisWindow(a, b, rect.minXMilliInches - radius,
      rect.maxXMilliInches + radius, "xMilliInches");
    const minimum = hole.minYMilliInches + radius;
    const maximum = hole.maxYMilliInches - radius;
    if (window && minimum <= maximum + TOLERANCE) {
      const start = valueAt(a.yMilliInches, b.yMilliInches, window[0]);
      const end = valueAt(a.yMilliInches, b.yMilliInches, window[1]);
      if (Math.min(start, end) >= minimum - TOLERANCE
        && Math.max(start, end) <= maximum + TOLERANCE) return true;
    }
  }
  const fullHeight = hole.minYMilliInches <= rect.minYMilliInches + TOLERANCE
    && hole.maxYMilliInches >= rect.maxYMilliInches - TOLERANCE;
  if (fullHeight) {
    const window = segmentAxisWindow(a, b, rect.minYMilliInches - radius,
      rect.maxYMilliInches + radius, "yMilliInches");
    const minimum = hole.minXMilliInches + radius;
    const maximum = hole.maxXMilliInches - radius;
    if (window && minimum <= maximum + TOLERANCE) {
      const start = valueAt(a.xMilliInches, b.xMilliInches, window[0]);
      const end = valueAt(a.xMilliInches, b.xMilliInches, window[1]);
      if (Math.min(start, end) >= minimum - TOLERANCE
        && Math.max(start, end) <= maximum + TOLERANCE) return true;
    }
  }
  return false;
}
function movementOpeningsClearingPath(points, radius, terrain) {
  const used = new Set();
  for (let index = 1; index < points.length; index += 1) {
    if (segmentRectangleDistance(points[index - 1], points[index], terrain.footprint)
      >= radius - TOLERANCE) continue;
    const opening = terrain.openings.find((entry) => (
      segmentClearsMovementOpening(points[index - 1], points[index], radius, entry, terrain)
    ));
    if (!opening) return [];
    used.add(opening.openingId);
  }
  return [...used].sort();
}
function completeBarrier(left, right, terrain) {
  const rect = terrain.footprint;
  const leftBounds = footprintBounds(left.footprint);
  const rightBounds = footprintBounds(right.footprint);
  const vertical = (
    leftBounds.maxX <= rect.minXMilliInches
      && rightBounds.minX >= rect.maxXMilliInches
  ) || (
    rightBounds.maxX <= rect.minXMilliInches
      && leftBounds.minX >= rect.maxXMilliInches
  );
  if (vertical
    && rect.minYMilliInches <= leftBounds.minY
    && rect.maxYMilliInches >= leftBounds.maxY
    && rect.minYMilliInches <= rightBounds.minY
    && rect.maxYMilliInches >= rightBounds.maxY) {
    return "vertical_rectangle_separates_complete_physical_base_footprints";
  }
  const horizontal = (
    leftBounds.maxY <= rect.minYMilliInches
      && rightBounds.minY >= rect.maxYMilliInches
  ) || (
    rightBounds.maxY <= rect.minYMilliInches
      && leftBounds.minY >= rect.maxYMilliInches
  );
  if (horizontal
    && rect.minXMilliInches <= leftBounds.minX
    && rect.maxXMilliInches >= leftBounds.maxX
    && rect.minXMilliInches <= rightBounds.minX
    && rect.maxXMilliInches >= rightBounds.maxX) {
    return "horizontal_rectangle_separates_complete_physical_base_footprints";
  }
  return null;
}
function footprintBounds(footprint) {
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
function visibilityPoints(model) {
  const footprint = model.footprint;
  if (footprint.shape === "round") {
    const radius = footprint.radiusMilliInches;
    return [model.center,
      { xMilliInches: model.center.xMilliInches, yMilliInches: model.center.yMilliInches + radius },
      { xMilliInches: model.center.xMilliInches, yMilliInches: model.center.yMilliInches - radius },
      { xMilliInches: model.center.xMilliInches - radius, yMilliInches: model.center.yMilliInches },
      { xMilliInches: model.center.xMilliInches + radius, yMilliInches: model.center.yMilliInches }];
  }
  return [model.center, ...footprint.vertices,
    ...footprint.vertices.map((entry, index) => {
      const next = footprint.vertices[(index + 1) % footprint.vertices.length];
      return { xMilliInches: (entry.xMilliInches + next.xMilliInches) / 2,
        yMilliInches: (entry.yMilliInches + next.yMilliInches) / 2 };
    })];
}
function directVisibilityWitness(left, right, terrain) {
  const candidates = visibilityPoints(left).flatMap((start, leftIndex) => (
    visibilityPoints(right).map((end, rightIndex) => (
      [start, end, leftIndex === 0 && rightIndex === 0
        ? "center_to_center_clear"
        : `physical_base_points_clear_${leftIndex}_${rightIndex}`]
    ))
  ));
  return candidates.find(([start, end]) => (
    !segmentIntersectsRectangle(start, end, terrain.footprint)
  ))?.[2] || null;
}
function intervalsOverlap(...intervals) {
  return Math.max(...intervals.map((entry) => entry[0]))
    <= Math.min(...intervals.map((entry) => entry[1])) + TOLERANCE;
}
function agreedOpeningClearsBarrier(opening, proof, left, right, terrain) {
  if (!opening.lineOfSightOpenAgreed) return false;
  const hole = opening.footprint; const rect = terrain.footprint;
  const leftBounds = footprintBounds(left.footprint);
  const rightBounds = footprintBounds(right.footprint);
  if (proof.startsWith("vertical")) {
    return hole.minXMilliInches <= rect.minXMilliInches + TOLERANCE
      && hole.maxXMilliInches >= rect.maxXMilliInches - TOLERANCE
      && intervalsOverlap(
        [leftBounds.minY, leftBounds.maxY],
        [rightBounds.minY, rightBounds.maxY],
        [hole.minYMilliInches, hole.maxYMilliInches],
      );
  }
  return hole.minYMilliInches <= rect.minYMilliInches + TOLERANCE
    && hole.maxYMilliInches >= rect.maxYMilliInches - TOLERANCE
    && intervalsOverlap(
      [leftBounds.minX, leftBounds.maxX],
      [rightBounds.minX, rightBounds.maxX],
      [hole.minXMilliInches, hole.maxXMilliInches],
    );
}

export function evaluateOfficialLeadingModelTerrainV1(input = {}) {
  const state = input.state; const piece = input.actor;
  const model = physicalModel(piece, input.leadingModelId, input.dataBundle, input.state);
  const points = (input.path || []).map((entry) => point(entry));
  if (points.length < 2 || points.length > 64
    || distance(points[0], model.center) > TOLERANCE) {
    fail("TERRAIN_LOS_MOVEMENT_PATH_INVALID", model.modelId);
  }
  const terrain = (state.board?.terrain || []).filter((entry) => entry?.isRemoved !== true)
    .map(verifyTerrain);
  if (terrain.some((entry) => ["grass", "impassable", "ramp"].includes(entry.terrainKind))) {
    fail("TERRAIN_LOS_DEFERRED_TERRAIN_KIND", terrain.find((entry) => (
      ["grass", "impassable", "ramp"].includes(entry.terrainKind)
    )).terrainId);
  }
  const endpoint = points.at(-1);
  const interactions = terrain.map((entry) => {
    const pathIntersects = pathSweepsTerrain(points, model.sweepRadiusMilliInches, entry);
    const movementOpeningIdsUsed = pathIntersects
      ? movementOpeningsClearingPath(points, model.sweepRadiusMilliInches, entry) : [];
    const pathBlocked = pathIntersects && entry.size >= 2
      && movementOpeningIdsUsed.length === 0;
    const endpointFootprint = createOfficialPhysicalFootprintV1({
      objectId: model.modelId,
      kind: "model_base",
      shape: model.footprint.shape,
      center: endpoint,
      widthMilliInches: model.footprint.widthMilliInches,
      depthMilliInches: model.footprint.depthMilliInches,
      ...(model.baseShape === "orthogonal_cross" ? {
        horizontalArmDepthMilliInches: model.footprint.horizontalArmDepthMilliInches,
        verticalArmWidthMilliInches: model.footprint.verticalArmWidthMilliInches,
      } : {}),
      ...(model.baseShape === "measured_contour" ? {
        localVerticesMilliInches: model.footprint.localVerticesMilliInches,
      } : {}),
      rotationDegrees: model.footprint.rotationDegrees,
    });
    const endpointOverlaps = evaluateOfficialPhysicalFootprintRelationV1({
      left: endpointFootprint,
      right: terrainPhysicalFootprint(entry),
    }).overlappingInteriors;
    if (endpointOverlaps) fail("TERRAIN_LOS_MOVEMENT_ENDPOINT_OVERLAP", entry.terrainId);
    if (pathBlocked) {
      fail("TERRAIN_LOS_LARGE_TERRAIN_MOVEMENT_BLOCKED", entry.terrainId);
    }
    return { terrainId: entry.terrainId, terrainSize: entry.size,
      blockingForLineOfSight: entry.size >= 1,
      movementPassableBySize: entry.size <= 1,
      blockingClassificationControlsMovement: false,
      pathIntersects, pathBlocked, movementOpeningIdsUsed, endpointOverlaps: false,
      movementOpenings: entry.openings.filter((opening) => opening.movementPassableAgreed)
        .map((opening) => opening.openingId),
      lineOfSightOpenings: entry.openings.filter((opening) => opening.lineOfSightOpenAgreed)
        .map((opening) => opening.openingId) };
  });
  const body = { schema: "starcraft_tmg_official_leading_model_terrain_result_v1",
    actorUnitId: piece.id, leadingModelId: model.modelId,
    path: points, endpoint, interactions,
    sizeZeroAndOnePassable: true, sizeTwoAndLargerImpassable: true,
    endpointTerrainOverlapForbidden: true,
    rectangularBasePathSweepUsesConservativeCircumscribedRadius:
      model.baseShape === "rectangle",
    openingMovementAndSightPermissionsIndependent: true,
    gapClearanceDelegatedToSlice82: true, deferredTerrainKinds: ["grass", "impassable", "ramp"],
    productionQuarantined: true, trainingTruth: false };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

function missionMarkerTarget(state, markerInput) {
  const markerId = String(markerInput?.id || "").trim();
  const marker = state?.board?.missionMarkers?.find((entry) => entry.id === markerId);
  const diameterMillimeters = Number(marker?.diameterMillimeters);
  const elevation = elevationBand(marker?.elevation);
  const supportTerrainId = String(marker?.supportTerrainPieceId || "").trim();
  if (!marker || marker !== markerInput
    || diameterMillimeters !== 32
    || !["ground", "mid", "high"].includes(elevation)
    || !Number.isFinite(Number(marker.xInches))
    || !Number.isFinite(Number(marker.yInches))) {
    fail("TERRAIN_LOS_MISSION_MARKER_INVALID", markerId);
  }
  return {
    unitId: markerId,
    modelId: markerId,
    sideKey: null,
    center: {
      xMilliInches: milli(marker.xInches),
      yMilliInches: milli(marker.yInches),
    },
    radiusMilliInches: Math.round((diameterMillimeters / 2 / 25.4) * 1000),
    printedSize: 0,
    effectiveSize: 0,
    elevation,
    supportTerrainIds: supportTerrainId ? [supportTerrainId] : [],
    officialRecordKey: null,
    footprint: createOfficialPhysicalFootprintV1({
      objectId: markerId,
      kind: "mission_marker",
      shape: "round",
      center: { xMilliInches: milli(marker.xInches), yMilliInches: milli(marker.yInches) },
      widthMilliInches: Math.round((diameterMillimeters / 25.4) * 1000),
      depthMilliInches: Math.round((diameterMillimeters / 25.4) * 1000),
    }),
  };
}

function prepareTerrainLineOfSight(state, options = {}) {
  const excludedTerrainIds = new Set(options.excludedTerrainIds || []);
  const terrain = (state.board?.terrain || []).filter((entry) => (
    entry?.isRemoved !== true && !excludedTerrainIds.has(entry.id)
  ))
    .map(raw => {
      const ramp = readOfficialCompoundRampSightV1(raw);
      return ramp ? { ...ramp, terrainKind: "ordinary" } : verifyTerrain(raw);
    });
  if (terrain.some((entry) => ["grass", "impassable", "ramp"].includes(entry.terrainKind))) {
    fail("TERRAIN_LOS_DEFERRED_TERRAIN_KIND", terrain.find((entry) => (
      ["grass", "impassable", "ramp"].includes(entry.terrainKind)
    )).terrainId);
  }
  return { excludedTerrainIds, terrain, proximityByModel: new WeakMap(),
    distantAssessmentByTerrain: new WeakMap() };
}

function withinOneInchOfTerrain(model, bounds, terrain) {
  const rect = terrain.footprint;
  const dx = Math.max(0, rect.minXMilliInches - bounds.maxX,
    bounds.minX - rect.maxXMilliInches);
  const dy = Math.max(0, rect.minYMilliInches - bounds.maxY,
    bounds.minY - rect.maxYMilliInches);
  // Bounding boxes enclose complete bases. A gap beyond the threshold is
  // an exact negative proof; near cases still use the original base kernel.
  return Math.hypot(dx, dy) <= INCH + TOLERANCE
    && baseEdgeToTerrain(model, terrain) <= INCH + TOLERANCE;
}

function preparedTerrainProximity(model, bounds, terrain, context) {
  // This context belongs to one synchronous LOS batch. Model and terrain
  // objects are privately prepared for that batch, never reused across states.
  const cache = context.proximityByModel;
  let entries = cache.get(model);
  if (!entries) {
    entries = new Map();
    cache.set(model, entries);
  }
  if (entries.has(terrain)) return entries.get(terrain);
  const near = withinOneInchOfTerrain(model, bounds, terrain);
  entries.set(terrain, near);
  return near;
}

function rectangleSightEvidence(entry, attacker, target, pairBounds, topDownSurfaceExcluded) {
  const outsideAllBaseConnectingSegments = entry.footprint.minXMilliInches
    > pairBounds.maxX + TOLERANCE
    || entry.footprint.maxXMilliInches < pairBounds.minX - TOLERANCE
    || entry.footprint.minYMilliInches > pairBounds.maxY + TOLERANCE
    || entry.footprint.maxYMilliInches < pairBounds.minY - TOLERANCE;
  let rawBarrierProof = topDownSurfaceExcluded
    || outsideAllBaseConnectingSegments ? null
    : completeBarrier(attacker, target, entry);
  let visibilityWitness = topDownSurfaceExcluded
    ? "supported_horizontal_surface_excluded"
    : outsideAllBaseConnectingSegments ? "center_to_center_clear"
    : rawBarrierProof ? null : directVisibilityWitness(attacker, target, entry);
  if (entry.size >= 1 && !rawBarrierProof && !visibilityWitness
    && !entry.openings.some((opening) => opening.lineOfSightOpenAgreed)) {
    // Preserve all previously certified proofs/witnesses and their receipt
    // hashes. Only replace the old unsupported closed-rectangle branch;
    // agreed apertures still require their own existing opening proof.
    const trace = resolveConvexFootprintRectangleTraceV1(
      attacker.footprint, target.footprint, entry.footprint);
    if (trace.kind === "blocked") {
      rawBarrierProof = "convex_rectangle_separates_complete_physical_base_footprints";
    } else if (trace.kind === "clear") {
      visibilityWitness = "convex_separating_line_physical_base_witness";
    }
  }
  if (entry.size >= 1 && !rawBarrierProof && !visibilityWitness) {
    fail("TERRAIN_LOS_UNSUPPORTED_RECTANGULAR_TRACE", entry.terrainId);
  }
  const openSightOpeningIds = rawBarrierProof ? entry.openings.filter((opening) => (
    agreedOpeningClearsBarrier(opening, rawBarrierProof, attacker, target, entry)
  )).map((opening) => opening.openingId).sort() : [];
  const barrierProof = openSightOpeningIds.length > 0 ? null : rawBarrierProof;
  return { rawBarrierProof, visibilityWitness, openSightOpeningIds, barrierProof };
}

function terrainSightEvidence(entry, attacker, target, pairBounds, excluded) {
  if (!entry.footprintCells) return rectangleSightEvidence(entry, attacker, target, pairBounds, excluded);
  // Apply the existing special-terrain sight-cell rule to each agreed section.
  // The combat/elevation assessment still belongs to the single terrain piece.
  const cellTraces = entry.footprintCells.map(footprint =>
    rectangleSightEvidence({ ...entry, footprint }, attacker, target, pairBounds, excluded));
  const blocking = cellTraces.find(trace => trace.barrierProof);
  const cleared = cellTraces.find(trace => trace.rawBarrierProof);
  return {
    rawBarrierProof: blocking?.rawBarrierProof ?? cleared?.rawBarrierProof ?? null,
    barrierProof: blocking?.barrierProof ?? null,
    visibilityWitness: blocking ? null : "agreed_ramp_sight_cells_clear",
    openSightOpeningIds: [...new Set(cellTraces.flatMap(trace => trace.openSightOpeningIds))].sort(),
    cellTraces,
  };
}

function evaluateTerrainLineOfSight(state, attacker, target, options = {},
  preparedContext = null) {
  const context = preparedContext || prepareTerrainLineOfSight(state, options);
  const { excludedTerrainIds, terrain } = context;
  const modelDistance = modelEdgeDistance(attacker, target);
  const attackerBounds = footprintBounds(attacker.footprint);
  const targetBounds = footprintBounds(target.footprint);
  const pairBounds = {
    minX: Math.min(attackerBounds.minX, targetBounds.minX),
    maxX: Math.max(attackerBounds.maxX, targetBounds.maxX),
    minY: Math.min(attackerBounds.minY, targetBounds.minY),
    maxY: Math.max(attackerBounds.maxY, targetBounds.maxY),
  };
  const assessments = terrain.map((entry) => {
    // A separating coordinate outside the COMPLETE pair-base bounds expanded
    // by one inch proves both proximity tests false and every connecting base
    // segment clear. No declared support may be hidden by this proof. Preserve
    // every assessment row; reuse only the immutable native record for the same
    // verified terrain in this private context, never omit a distant terrain.
    const margin = INCH + TOLERANCE;
    const distant = !attacker.supportTerrainIds.includes(entry.terrainId)
      && !target.supportTerrainIds.includes(entry.terrainId)
      && (entry.footprint.minXMilliInches > pairBounds.maxX + margin
        || entry.footprint.maxXMilliInches < pairBounds.minX - margin
        || entry.footprint.minYMilliInches > pairBounds.maxY + margin
        || entry.footprint.maxYMilliInches < pairBounds.minY - margin);
    if (distant && context.distantAssessmentByTerrain.has(entry)) {
      return context.distantAssessmentByTerrain.get(entry);
    }
    const attackerNear = preparedTerrainProximity(attacker, attackerBounds, entry,
      context);
    const targetNear = preparedTerrainProximity(target, targetBounds, entry,
      context);
    const closeQuarters = attackerNear && targetNear
      && modelDistance <= CLOSE_QUARTERS_RANGE + TOLERANCE;
    const attackerSupported = attacker.supportTerrainIds.includes(entry.terrainId);
    const targetSupported = target.supportTerrainIds.includes(entry.terrainId);
    const highToGround = (attackerSupported && entry.size >= 3
      && target.elevation === "ground" && target.supportTerrainIds.length === 0 && targetNear)
      || (targetSupported && entry.size >= 3
        && attacker.elevation === "ground" && attacker.supportTerrainIds.length === 0
        && attackerNear);
    const elevationDeadZoneBlocks = highToGround && !closeQuarters;
    const topDownSurfaceExcluded = entry.standableHorizontalSurface
      && (attackerSupported || targetSupported);
    const { rawBarrierProof, visibilityWitness, openSightOpeningIds, barrierProof, cellTraces }
      = terrainSightEvidence(entry, attacker, target, pairBounds, topDownSurfaceExcluded);
    const blockingTerrainTrace = entry.size >= 1 && Boolean(barrierProof);
    if (blockingTerrainTrace
      && (attacker.supportTerrainIds.length > 0 || target.supportTerrainIds.length > 0)) {
      fail("TERRAIN_LOS_ELEVATION_EFFECTIVE_SIZE_DELEGATION_REQUIRED", entry.terrainId);
    }
    const attackerSize = Number.isSafeInteger(attacker.effectiveSize)
      ? attacker.effectiveSize : attacker.printedSize;
    const targetSize = Number.isSafeInteger(target.effectiveSize)
      ? target.effectiveSize : target.printedSize;
    const fullCoverBlocks = blockingTerrainTrace && attackerSize !== null && targetSize !== null
      && entry.size >= attackerSize && entry.size >= targetSize;
    const attackerDirectCover = blockingTerrainTrace && attackerNear && attackerSize !== null
      && entry.size >= attackerSize;
    const targetDirectCover = blockingTerrainTrace && targetNear && targetSize !== null
      && entry.size >= targetSize;
    const directCoverBlocks = !closeQuarters
      && (attackerDirectCover || targetDirectCover);
    const assessment = { terrainId: entry.terrainId, terrainSize: entry.size,
      blockingTerrain: entry.size >= 1, rawBarrierProof, visibilityWitness,
      ...(cellTraces ? { cellTraces } : {}),
      topDownSurfaceExcluded, openSightOpeningIds,
      defaultAperturesBlockLineOfSight: entry.openings.some((opening) => (
        !opening.lineOfSightOpenAgreed
      )),
      movementAndSightOpeningPermissionsIndependent: true,
      blockingTerrainTrace, attackerWithinOneInch: attackerNear,
      targetWithinOneInch: targetNear, closeQuarters,
      fullCoverBlocks, attackerDirectCover, targetDirectCover,
      directCoverBlocks, elevationDeadZoneBlocks,
      blocksLineOfSight: fullCoverBlocks || directCoverBlocks || elevationDeadZoneBlocks };
    if (distant) context.distantAssessmentByTerrain.set(entry, freezeDeep(assessment));
    return assessment;
  });
  const blockers = assessments.filter((entry) => entry.blocksLineOfSight)
    .map((entry) => entry.terrainId);
  const body = { schema: "starcraft_tmg_official_terrain_line_of_sight_result_v1",
    attackerUnitId: attacker.unitId, attackerModelId: attacker.modelId,
    targetUnitId: target.unitId, targetModelId: target.modelId,
    modelEdgeDistanceMilliInches: Math.round(modelDistance),
    assessments, terrainPiecesAssessedIndependently: true,
    terrainEffectiveSizesNeverCombine: true,
    lineOfSightMutual: true, visible: blockers.length === 0,
    blockingTerrainIds: blockers,
    ...(excludedTerrainIds.size > 0
      ? { supportedSurfaceExcludedTerrainIds: [...excludedTerrainIds].sort() }
      : {}),
    lineOfSightStatus: blockers.length === 0 ? "visible" : "blocked_by_one_qualifying_terrain",
    deferredTerrainKinds: ["grass", "impassable", "ramp"],
    productionQuarantined: true, trainingTruth: false };
  return sealNativeTerrainLineOfSightResult(body, context);
}

// The elevated adapter owns support/Size validation. This endpoint preserves
// the same trace algorithm while giving the virtual Target Point its exact
// zero footprint; no synthetic unit is inserted in state.
export function evaluateOfficialTerrainLineOfSightToTargetPointV1(input = {}) {
  const attacker = physicalModel(input.attacker, input.attackerModelId, input.dataBundle, input.state);
  const footprint = input.targetPointFootprint;
  const { footprintHash, ...body } = footprint || {};
  if (body.kind !== 'template_target_point' || body.radiusMilliInches !== 0
    || footprintHash !== hashStarcraftTmgContract(body)) fail('TERRAIN_LOS_TARGET_POINT_INVALID');
  const target = { unitId: footprint.objectId, modelId: footprint.objectId, sideKey: null,
    center: footprint.center, footprint, printedSize: 0, effectiveSize: 0,
    elevation: 'ground', supportTerrainIds: [] };
  return evaluateTerrainLineOfSight(input.state, attacker, target);
}

export function evaluateOfficialTerrainLineOfSightV1(input = {}) {
  const state = input.state;
  const attacker = physicalModel(input.attacker, input.attackerModelId, input.dataBundle, state);
  const target = physicalModel(input.target, input.targetModelId, input.dataBundle, state);
  return evaluateTerrainLineOfSight(state, attacker, target);
}

// The elevated Token consumer supplies the support/effective-size assessment.
// This entry shares the same complete physical-base trace as model targets.
export function evaluateOfficialTerrainLineOfSightToTokenV1(input = {}) {
  const attacker = physicalModel(input.attacker, input.attackerModelId, input.dataBundle, input.state);
  const token = input.token;
  verifyOfficialBattlefieldTokenV1(token, input.registry);
  const footprint = createOfficialDisplacementTokenFootprintV1(token);
  const target = { unitId: token.tokenId, modelId: token.tokenId, sideKey: null,
    center: footprint.center, footprint, baseShape: footprint.shape,
    printedSize: token.terrainSize, effectiveSize: token.terrainSize,
    elevation: 'ground', supportTerrainIds: [] };
  return evaluateTerrainLineOfSight(input.state, attacker, target);
}

// The prepared terrain never escapes this synchronous batch. It is not
// cached across states/revisions, and every pair retains every assessment.
function prepareTerrainLineOfSightBatch(input, preparedContext = null) {
  if (!Array.isArray(input.queries) || input.queries.length === 0) {
    fail("TERRAIN_LOS_BATCH_INVALID");
  }
  const context = preparedContext || prepareTerrainLineOfSight(input.state);
  const modelsByPiece = new WeakMap();
  const modelFor = (piece, modelId) => {
    if (!object(piece)) return physicalModel(piece, modelId, input.dataBundle, input.state);
    // Key by the actual piece object, not its public id: distinct/corrupt input
    // objects must still be checked even when they claim the same identity.
    let models = modelsByPiece.get(piece);
    if (!models) {
      models = new Map();
      modelsByPiece.set(piece, models);
    }
    if (models.has(modelId)) return models.get(modelId);
    const model = physicalModel(piece, modelId, input.dataBundle, input.state);
    models.set(modelId, model);
    return model;
  };
  return { context, modelFor };
}

function createTerrainLineOfSightBatchEvaluator(input, isolatePairFailures,
  preparedContext = null) {
  const { context, modelFor } = prepareTerrainLineOfSightBatch(input, preparedContext);
  const evaluate = (query) => {
    const attacker = modelFor(query.attacker, query.attackerModelId);
    const target = modelFor(query.target, query.targetModelId);
    return evaluateTerrainLineOfSight(input.state, attacker, target, {}, context);
  };
  return query => {
    if (!isolatePairFailures) return evaluate(query);
    try {
      return Object.freeze({ result: evaluate(query), failure: null });
    } catch (error) {
      // Context validation above remains fatal. A pair-specific geometry
      // limitation is unknown for that pair, not invalidity of its siblings.
      return Object.freeze({ result: null,
        failure: String(error?.message || error).split(":")[0] });
    }
  };
}

function evaluateTerrainLineOfSightBatch(input, isolatePairFailures,
  preparedContext = null) {
  const evaluate = createTerrainLineOfSightBatchEvaluator(input, isolatePairFailures,
    preparedContext);
  return Object.freeze(input.queries.map(evaluate));
}

// Internal native streaming boundary: same verified context, same model cache,
// same complete per-pair result/failure, without retaining every assessment tree.
export function visitNativeOfficialTerrainLosOutcomesV1(input, visit) {
  const evaluate = createTerrainLineOfSightBatchEvaluator(input, true);
  for (const [index, query] of input.queries.entries()) visit(evaluate(query), index);
}

// Input validation only. This produces NO visibility or cover verdict and
// cannot certify an attack. It shares the evaluator's original preparation.
function verifyTerrainLineOfSightBatchInputs(input, preparedContext = null) {
  const { modelFor } = prepareTerrainLineOfSightBatch(input, preparedContext);
  for (const query of input.queries) {
    const attacker = modelFor(query.attacker, query.attackerModelId);
    const target = modelFor(query.target, query.targetModelId);
    modelEdgeDistance(attacker, target);
    footprintBounds(attacker.footprint);
    footprintBounds(target.footprint);
  }
  return Object.freeze({ inputsValidated: true, queryCount: input.queries.length });
}

export function verifyOfficialTerrainLineOfSightBatchInputsV1(input = {}) {
  return verifyTerrainLineOfSightBatchInputs(input);
}

export function evaluateOfficialTerrainLineOfSightBatchV1(input = {}) {
  return evaluateTerrainLineOfSightBatch(input, false);
}

export function evaluateOfficialTerrainLineOfSightBatchOutcomesV1(input = {}) {
  return evaluateTerrainLineOfSightBatch(input, true);
}

// Own the complete source/map, not an externally supplied "already verified"
// flag. Only this immutable snapshot can reuse its terrain preparation. Incoming
// queries still get fresh copies and all model/base checks on every operation.
export function createOfficialTerrainLineOfSightBatchV1(input = {}) {
  const snapshot = freezeDeep(structuredClone({ state: input.state,
    dataBundle: input.dataBundle }));
  let context = null;
  const prepare = queries => {
    if (!Array.isArray(queries) || queries.length === 0) {
      fail("TERRAIN_LOS_BATCH_INVALID");
    }
    const request = { ...snapshot, queries: structuredClone(queries) };
    context ||= prepareTerrainLineOfSight(snapshot.state);
    return request;
  };
  return Object.freeze({
    verifyInputs(queries) {
      const request = prepare(queries);
      return verifyTerrainLineOfSightBatchInputs(request, context);
    },
    evaluate(queries) {
      const request = prepare(queries);
      return evaluateTerrainLineOfSightBatch(request, false, context);
    },
    // Keep the copied queries and model cache private. The elevated consumer
    // can finish one complete native result before allocating the next tree.
    prepareEvaluation(queries) {
      const request = prepare(queries);
      const evaluate = createTerrainLineOfSightBatchEvaluator(request, false, context);
      return Object.freeze({
        evaluateAt(index) {
          if (!Number.isSafeInteger(index) || index < 0 || index >= request.queries.length) {
            fail("TERRAIN_LOS_BATCH_INDEX_INVALID");
          }
          return evaluate(request.queries[index]);
        },
      });
    },
  });
}

export function evaluateOfficialTerrainLineOfSightToMissionMarkerV1(input = {}) {
  const state = input.state;
  const attacker = physicalModel(input.attacker, input.attackerModelId, input.dataBundle, input.state);
  const attackerEffectiveSize = Number(input.attackerEffectiveSize);
  if (!Number.isSafeInteger(attackerEffectiveSize)
    || attackerEffectiveSize < attacker.printedSize) {
    fail("TERRAIN_LOS_ATTACKER_EFFECTIVE_SIZE_INVALID", String(input.attackerModelId || ""));
  }
  attacker.effectiveSize = attackerEffectiveSize;
  const target = missionMarkerTarget(state, input.marker);
  const excludedTerrainIds = [...new Set((input.excludedTerrainIds || []).map(String))];
  const availableTerrainIds = new Set((state.board?.terrain || []).map((entry) => entry.id));
  if (excludedTerrainIds.some((terrainId) => !availableTerrainIds.has(terrainId))) {
    fail("TERRAIN_LOS_EXCLUDED_TERRAIN_INVALID");
  }
  return evaluateTerrainLineOfSight(state, attacker, target, {
    excludedTerrainIds,
  });
}

// One synchronous marker-control calculation owns all prepared objects. Different
// support exclusions keep independent contexts: a row excluded by the scalar
// must not be newly validated, while another query may still need that row.
function evaluateTerrainLineOfSightToMissionMarkerBatch(input, projectResult, owned = null) {
  if (!Array.isArray(input.queries) || input.queries.length === 0) {
    fail("TERRAIN_LOS_BATCH_INVALID");
  }
  const state = input.state;
  const modelsByPiece = new WeakMap();
  const targetsByMarker = owned?.targetsByMarker || new WeakMap();
  const contextsByExclusions = owned?.contextsByExclusions || new Map();
  const availableTerrainIds = owned?.availableTerrainIds
    || new Set((state.board?.terrain || []).map(entry => entry.id));
  const modelFor = (piece, modelId, effectiveSize) => {
    let models = object(piece) ? modelsByPiece.get(piece) : null;
    if (!models) {
      models = new Map();
      if (object(piece)) modelsByPiece.set(piece, models);
    }
    let entry = models.get(modelId);
    if (!entry) {
      entry = { physical: physicalModel(piece, modelId, input.dataBundle, state), sizes: new Map() };
      models.set(modelId, entry);
    }
    const size = Number(effectiveSize);
    if (!Number.isSafeInteger(size) || size < entry.physical.printedSize) {
      fail("TERRAIN_LOS_ATTACKER_EFFECTIVE_SIZE_INVALID", String(modelId || ""));
    }
    if (!entry.sizes.has(size)) entry.sizes.set(size, { ...entry.physical, effectiveSize: size });
    return entry.sizes.get(size);
  };
  return Object.freeze(input.queries.map(query => {
    const attacker = modelFor(query.attacker, query.attackerModelId,
      query.attackerEffectiveSize);
    let target = object(query.marker) ? targetsByMarker.get(query.marker) : null;
    if (!target) {
      target = missionMarkerTarget(state, query.marker);
      targetsByMarker.set(query.marker, target);
    }
    const excludedTerrainIds = [...new Set((query.excludedTerrainIds || []).map(String))];
    if (excludedTerrainIds.some(id => !availableTerrainIds.has(id))) {
      fail("TERRAIN_LOS_EXCLUDED_TERRAIN_INVALID");
    }
    const key = JSON.stringify([...excludedTerrainIds].sort());
    let context = contextsByExclusions.get(key);
    if (!context) {
      context = prepareTerrainLineOfSight(state, { excludedTerrainIds });
      contextsByExclusions.set(key, context);
    }
    // Model, profile, size, marker and exclusions above are still verified for
    // every incoming query. Only this private fixed-map owner may reuse the
    // projection of the exact complete derived physical inputs.
    const geometryKey = owned ? canonicalStarcraftTmgJson({ attacker, target,
      excludedTerrainIds: [...excludedTerrainIds].sort() }) : null;
    if (owned?.visibilityByGeometry.has(geometryKey)) {
      return owned.visibilityByGeometry.get(geometryKey);
    }
    const projection = projectResult(evaluateTerrainLineOfSight(state, attacker, target,
      { excludedTerrainIds }, context));
    if (owned) owned.visibilityByGeometry.set(geometryKey, projection);
    return projection;
  }));
}

export function evaluateOfficialTerrainLineOfSightToMissionMarkerBatchV1(input = {}) {
  return evaluateTerrainLineOfSightToMissionMarkerBatch(input, result => result);
}

// Control needs visibility plus the ORIGINAL full-result hash, not all terrain
// assessments alive at once. This folds the same complete evaluator, not a
// shortcut that omits blockers, cover, exclusions or source validation.
export function projectOfficialMissionMarkerVisibilityBatchV1(input = {}) {
  return evaluateTerrainLineOfSightToMissionMarkerBatch(input, result => Object.freeze({
    visible: result.visible, resultHash: result.resultHash,
  }));
}

// An operation owns its complete map/source, not an external prepared flag.
// Queries may change models; each one still passes the native physical checks.
// Marker input must match the COMPLETE owned marker, not just its public ID.
export function createOfficialMissionMarkerVisibilityBatchV1(input = {}) {
  const snapshot = freezeDeep(structuredClone({ state: input.state,
    dataBundle: input.dataBundle }));
  const owned = { targetsByMarker: new WeakMap(), contextsByExclusions: new Map(),
    availableTerrainIds: new Set((snapshot.state.board?.terrain || []).map(entry => entry.id)),
    visibilityByGeometry: new Map() };
  return Object.freeze({
    project(queries) {
      if (!Array.isArray(queries) || queries.length === 0) fail("TERRAIN_LOS_BATCH_INVALID");
      const copied = structuredClone(queries);
      for (const query of copied) {
        const marker = snapshot.state.board?.missionMarkers?.find(entry => entry.id === query.marker?.id);
        if (!marker || !isDeepStrictEqual(marker, query.marker)) {
          fail("TERRAIN_LOS_MISSION_MARKER_INVALID", String(query.marker?.id || ""));
        }
        query.marker = marker;
      }
      return evaluateTerrainLineOfSightToMissionMarkerBatch({ ...snapshot, queries: copied },
        result => Object.freeze({ visible: result.visible, resultHash: result.resultHash }), owned);
    },
  });
}

export function certifyOfficialTerrainLosPlanV1(input = {}) {
  const plan = input.plan; const procedureKind = String(input.procedureKind || "");
  const actor = input.actor; const planId = String(plan?.planId || "").trim();
  if (!activePiece(actor) || !object(plan) || !planId) {
    fail("TERRAIN_LOS_PLAN_INVALID");
  }
  let result;
  if (procedureKind === "leading_model_terrain_check") {
    result = evaluateOfficialLeadingModelTerrainV1({ state: input.state, actor,
      leadingModelId: plan.leadingModelId, path: plan.path, dataBundle: input.dataBundle });
  } else if (procedureKind === "line_of_sight_check") {
    const target = input.state.pieces?.find((piece) => piece.id === plan.targetUnitId);
    if (!activePiece(target)) fail("TERRAIN_LOS_TARGET_INVALID", String(plan.targetUnitId || ""));
    result = evaluateOfficialTerrainLineOfSightV1({ state: input.state,
      attacker: actor, attackerModelId: plan.attackerModelId,
      target, targetModelId: plan.targetModelId, dataBundle: input.dataBundle });
  } else fail("TERRAIN_LOS_PROCEDURE_KIND_INVALID", procedureKind);
  const body = { planId, procedureKind, actorUnitId: actor.id, result,
    productionQuarantined: true, trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}
