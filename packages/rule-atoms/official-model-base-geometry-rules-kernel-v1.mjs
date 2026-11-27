import { officialSpatialRuleErrorV1 } from './official-spatial-proposal-error-v1.mjs';
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialModelBaseGeometryProfileV1,
  verifyOfficialModelBaseGeometryDataBundleV1,
  OFFICIAL_RAVEN_CONTOUR_GEOMETRY_BUNDLE_VERSION,
} from "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { isOfficialFlyingUnitV1 } from "./official-flying-rules-kernel-v1.mjs";
import { OFFICIAL_BATTLEFIELD_TOKEN_SCHEMA, verifyOfficialBattlefieldTokenV1,
  OFFICIAL_BATTLEFIELD_MARKER_SCHEMA, verifyOfficialBattlefieldMarkerV1 }
  from './official-battlefield-token-marker-rules-kernel-v1.mjs';
import { hasOfficialModelGapTransitPolicyV13, getOfficialGroundSizeClearanceDiameterV13,
  isOfficialGroundTerrainTraversalBlockedV13, projectOfficialRaptorStrainTerrainPermissionV13 }
  from './official-movement-clearance-contract-v13.mjs';
import { isTargetWhollyWithinOrthogonalCrossRangeV1 } from './orthogonal-cross-range-coverage-v1.mjs';
import { readMeasuredFootprintContourV1, isTargetWhollyWithinMeasuredContourRangeV1, centeredFootprintTrianglesV1 }
  from './measured-footprint-contour-v1.mjs';

export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_KERNEL_SCHEMA =
  "starcraft_tmg_official_model_base_geometry_rules_kernel_v1";
export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_NO_LEGAL_COHERENCY_POSITION_CERTIFICATE_SCHEMA =
  "starcraft_tmg_no_legal_coherency_position_certificate_v1";

const TOLERANCE = 1;
const OVAL_CONTOUR_ERROR_MILLI_INCHES = 0.5;
export const OFFICIAL_PHYSICAL_GEOMETRY_TOLERANCE_MILLI_INCHES_V1 = TOLERANCE;
const COHERENCY_RANGE_MILLI_INCHES = 3000;
const ENGAGEMENT_RANGE_MILLI_INCHES = 1000;

// Older frozen Rooms omitted this compiled field. Missing must inherit the
// terrain kind, not silently turn every grass/cover/high-ground area into a
// placement wall. Explicit setup choices always win.
export function officialTerrainBlocksModelPlacementV1(terrain = {}) {
  if (terrain.blocksPlacement === true) return true;
  if (terrain.blocksPlacement === false) return false;
  return String(terrain.terrainKind || "ordinary").toLowerCase()
    === "impassable";
}

// Admission constraint for a NON-ENGAGED placement, not a constraint on every
// possible battlefield snapshot (a combat snapshot can already be engaged).
export function officialNonEngagedBaseSeparationAllowedV1(left, right) {
  return minimumSeparation(left, right) >= ENGAGEMENT_RANGE_MILLI_INCHES - TOLERANCE;
}

function fail(code, detail = "") {
  throw officialSpatialRuleErrorV1(code, detail);
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
function milli(value, code = "MODEL_BASE_GEOMETRY_VALUE_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}
function point(value, code = "MODEL_BASE_GEOMETRY_POINT_INVALID", detail = "") {
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
function onSegment(a, b, p) {
  return Math.abs(orientation(a, b, p)) <= TOLERANCE
    && p.xMilliInches >= Math.min(a.xMilliInches, b.xMilliInches) - TOLERANCE
    && p.xMilliInches <= Math.max(a.xMilliInches, b.xMilliInches) + TOLERANCE
    && p.yMilliInches >= Math.min(a.yMilliInches, b.yMilliInches) - TOLERANCE
    && p.yMilliInches <= Math.max(a.yMilliInches, b.yMilliInches) + TOLERANCE;
}
function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c); const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a); const o4 = orientation(c, d, b);
  if (((o1 > TOLERANCE && o2 < -TOLERANCE) || (o1 < -TOLERANCE && o2 > TOLERANCE))
    && ((o3 > TOLERANCE && o4 < -TOLERANCE)
      || (o3 < -TOLERANCE && o4 > TOLERANCE))) return true;
  return onSegment(a, b, c) || onSegment(a, b, d)
    || onSegment(c, d, a) || onSegment(c, d, b);
}
function polygonEdges(vertices) {
  return vertices.map((vertex, index) => [vertex, vertices[(index + 1) % vertices.length]]);
}
function pointInPolygon(value, vertices) {
  let sign = 0;
  for (const [start, end] of polygonEdges(vertices)) {
    const cross = orientation(start, end, value);
    if (Math.abs(cross) <= TOLERANCE) continue;
    const current = Math.sign(cross);
    if (sign !== 0 && current !== sign) return false;
    sign = current;
  }
  return true;
}
function pointPolygonDistance(value, vertices) {
  if (pointInPolygon(value, vertices)) return 0;
  return Math.min(...polygonEdges(vertices).map(([start, end]) => (
    pointSegmentDistance(value, start, end)
  )));
}
function polygonsIntersect(left, right) {
  if (left.some((entry) => pointInPolygon(entry, right))
    || right.some((entry) => pointInPolygon(entry, left))) return true;
  return polygonEdges(left).some(([a, b]) => polygonEdges(right).some(([c, d]) => (
    segmentsIntersect(a, b, c, d)
  )));
}
function rectangleVertices(center, width, depth, rotationDegrees) {
  return orientVertices(center, rotationDegrees, [
    [-width / 2, -depth / 2], [width / 2, -depth / 2],
    [width / 2, depth / 2], [-width / 2, depth / 2],
  ]);
}
function orientVertices(center, rotationDegrees, localVertices) {
  const angle = (rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(angle); const sine = Math.sin(angle);
  return localVertices.map(([x, y]) => ({
    xMilliInches: Number((center.xMilliInches + (x * cosine) - (y * sine)).toFixed(6)),
    yMilliInches: Number((center.yMilliInches + (x * sine) + (y * cosine)).toFixed(6)),
  }));
}
function crossShapeBody(input, { objectId, kind, center, shape }) {
  const { widthMilliInches, depthMilliInches, horizontalArmDepthMilliInches,
    verticalArmWidthMilliInches } = input;
  if (![widthMilliInches, depthMilliInches, horizontalArmDepthMilliInches,
    verticalArmWidthMilliInches].every(value => Number.isSafeInteger(value) && value > 0)
    || horizontalArmDepthMilliInches >= depthMilliInches
    || verticalArmWidthMilliInches >= widthMilliInches) {
    fail("MODEL_BASE_GEOMETRY_CROSS_ARMS_INVALID", objectId);
  }
  const rotationDegrees = canonicalRotation(input.rotationDegrees);
  const x = widthMilliInches / 2; const y = depthMilliInches / 2;
  const armX = verticalArmWidthMilliInches / 2; const armY = horizontalArmDepthMilliInches / 2;
  return { schema: "starcraft_tmg_physical_footprint_v1", objectId, kind, shape, center,
    widthMilliInches, depthMilliInches, horizontalArmDepthMilliInches, verticalArmWidthMilliInches,
    rotationDegrees, radiusMilliInches: null, vertices: orientVertices(center, rotationDegrees, [
      [-armX, -y], [armX, -y], [armX, -armY], [x, -armY], [x, armY], [armX, armY],
      [armX, y], [-armX, y], [-armX, armY], [-x, armY], [-x, -armY], [-armX, -armY],
    ]) };
}
function measuredContourBody(input, { objectId, kind, center, shape }) {
  const { widthMilliInches, depthMilliInches } = input;
  const rotationDegrees = canonicalRotation(input.rotationDegrees);
  const localVerticesMilliInches = readMeasuredFootprintContourV1(
    input.localVerticesMilliInches, widthMilliInches, depthMilliInches,
  );
  return { schema: "starcraft_tmg_physical_footprint_v1", objectId, kind, shape, center,
    widthMilliInches, depthMilliInches, localVerticesMilliInches, rotationDegrees,
    radiusMilliInches: null, vertices: orientVertices(center, rotationDegrees,
      localVerticesMilliInches.map(({ xMilliInches, yMilliInches }) => [xMilliInches, yMilliInches])) };
}
function isConcaveFootprint(footprint) {
  return footprint.shape === "orthogonal_cross" || footprint.shape === "measured_contour";
}
function convexFootprintParts(footprint) {
  if (footprint.shape === "measured_contour") {
    return centeredFootprintTrianglesV1(footprint);
  }
  if (footprint.shape !== "orthogonal_cross") return [footprint];
  const { center, rotationDegrees, widthMilliInches, depthMilliInches,
    horizontalArmDepthMilliInches, verticalArmWidthMilliInches } = footprint;
  return [[widthMilliInches, horizontalArmDepthMilliInches],
    [verticalArmWidthMilliInches, depthMilliInches]].map(([width, depth]) => ({
    shape: "rectangle", center, vertices: rectangleVertices(center, width, depth, rotationDegrees),
  }));
}
function ovalVertices(center, width, depth, rotationDegrees) {
  const majorRadius = Math.max(width, depth) / 2;
  // An inscribed ellipse polygon shares the existing convex predicates. The
  // maximum chord error is bounded by the sagitta on the major-radius circle.
  const halfSector = Math.acos(1 - OVAL_CONTOUR_ERROR_MILLI_INCHES / (majorRadius + 1));
  const count = 4 * Math.ceil(Math.PI / (4 * halfSector));
  if (!Number.isSafeInteger(count) || count > 512) fail("MODEL_BASE_GEOMETRY_OVAL_RESOLUTION_UNSUPPORTED");
  const angle = rotationDegrees * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return Array.from({ length: count }, (_, index) => {
    const phase = index * (2 * Math.PI / count);
    const x = width / 2 * Math.cos(phase);
    const y = depth / 2 * Math.sin(phase);
    return {
      xMilliInches: Number((center.xMilliInches + x * cosine - y * sine).toFixed(6)),
      yMilliInches: Number((center.yMilliInches + x * sine + y * cosine).toFixed(6)),
    };
  });
}
function canonicalRotation(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) fail("MODEL_BASE_GEOMETRY_ROTATION_INVALID");
  return Number((((parsed % 360) + 360) % 360).toFixed(6));
}
function footprintBody(footprint) {
  return without(footprint, ["footprintHash"]);
}
function makeFootprint(input) {
  const objectId = String(input.objectId || "").trim();
  const kind = String(input.kind || "physical_object").trim();
  const shape = String(input.shape || "").toLowerCase();
  const center = point(input.center, "MODEL_BASE_GEOMETRY_CENTER_INVALID", objectId);
  if (!objectId || !kind) fail("MODEL_BASE_GEOMETRY_OBJECT_ID_REQUIRED");
  let body;
  if (shape === "round") {
    const diameterMilliInches = Number(input.widthMilliInches);
    if (!Number.isSafeInteger(diameterMilliInches) || diameterMilliInches <= 0
      || diameterMilliInches !== Number(input.depthMilliInches)) {
      fail("MODEL_BASE_GEOMETRY_ROUND_BASE_INVALID", objectId);
    }
    body = { schema: "starcraft_tmg_physical_footprint_v1", objectId, kind,
      shape, center, widthMilliInches: diameterMilliInches,
      depthMilliInches: diameterMilliInches,
      rotationDegrees: 0, radiusMilliInches: Math.round(diameterMilliInches / 2),
      vertices: [] };
  } else if (shape === "rectangle" || shape === "oval") {
    const widthMilliInches = Number(input.widthMilliInches);
    const depthMilliInches = Number(input.depthMilliInches);
    const rotationDegrees = canonicalRotation(input.rotationDegrees);
    if (!Number.isSafeInteger(widthMilliInches) || !Number.isSafeInteger(depthMilliInches)
      || widthMilliInches <= 0 || depthMilliInches <= 0) {
      fail(shape === "oval" ? "MODEL_BASE_GEOMETRY_OVAL_BASE_INVALID"
        : "MODEL_BASE_GEOMETRY_RECTANGLE_BASE_INVALID", objectId);
    }
    body = { schema: "starcraft_tmg_physical_footprint_v1", objectId, kind,
      shape, center, widthMilliInches, depthMilliInches, rotationDegrees,
      radiusMilliInches: null,
      vertices: shape === "oval" ? ovalVertices(center, widthMilliInches, depthMilliInches, rotationDegrees)
        : rectangleVertices(center, widthMilliInches, depthMilliInches, rotationDegrees),
      ...(shape === "oval" ? { contour: "inscribed_ellipse",
        maximumContourErrorMilliInches: OVAL_CONTOUR_ERROR_MILLI_INCHES } : {}) };
  } else if (shape === "orthogonal_cross") {
    body = crossShapeBody(input, { objectId, kind, center, shape });
  } else if (shape === "measured_contour") {
    body = measuredContourBody(input, { objectId, kind, center, shape });
  } else fail("MODEL_BASE_GEOMETRY_SHAPE_UNSUPPORTED", `${objectId}:${shape}`);
  return freezeDeep({ ...body, footprintHash: hashStarcraftTmgContract(body) });
}

export function readOfficialCrossArmDimensionsV1(model) {
  return {
    horizontalArmDepthMilliInches: milli(model?.baseHorizontalArmDepthInches, "MODEL_BASE_GEOMETRY_CROSS_ARMS_INVALID", model?.id),
    verticalArmWidthMilliInches: milli(model?.baseVerticalArmWidthInches, "MODEL_BASE_GEOMETRY_CROSS_ARMS_INVALID", model?.id),
  };
}
export function isOfficialProfileBoundOutlineV1(shape) {
  return shape === "orthogonal_cross" || shape === "measured_contour";
}

export function readOfficialModelBaseOutlineV1(model) {
  if (model.baseShape === "orthogonal_cross") return readOfficialCrossArmDimensionsV1(model);
  if (model.baseShape === "measured_contour") {
    return { localVerticesMilliInches: structuredClone(model.baseLocalVerticesMilliInches) };
  }
  return {};
}

export function createOfficialPhysicalFootprintV1(input = {}) {
  return makeFootprint(input);
}
// A template ability's Target Point has zero area. It is a measurement
// endpoint, never a model, token or stand-in base. Physical constructors keep
// their existing positive-size requirement.
export function createOfficialTargetPointFootprintV1(input = {}) {
  const objectId = String(input.objectId || '').trim();
  const center = point(input.center, 'MODEL_BASE_GEOMETRY_TARGET_POINT_INVALID', objectId);
  if (!objectId) fail('MODEL_BASE_GEOMETRY_OBJECT_ID_REQUIRED');
  const body = { schema: 'starcraft_tmg_physical_footprint_v1', objectId,
    kind: 'template_target_point', shape: 'round', center,
    widthMilliInches: 0, depthMilliInches: 0, rotationDegrees: 0,
    radiusMilliInches: 0, vertices: [] };
  return freezeDeep({ ...body, footprintHash: hashStarcraftTmgContract(body) });
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
function profileForPiece(piece, dataBundle) {
  const profile = getOfficialModelBaseGeometryProfileV1(
    dataBundle, piece?.officialUnitRecordKey,
  );
  if (piece?.sourceRecordHash !== profile.sourceRecordHash
    || piece?.officialPayloadHash !== profile.payloadHash) {
    fail("MODEL_BASE_GEOMETRY_OFFICIAL_PROFILE_INVALID", String(piece?.id || ""));
  }
  return profile;
}

export function createOfficialModelBaseFootprintV1(input = {}) {
  const piece = input.piece; const model = input.model;
  const profile = profileForPiece(piece, input.dataBundle);
  const modelId = String(model?.id || "").trim();
  const shape = String(model?.baseShape || "").toLowerCase();
  const width = milli(model?.baseWidthInches,
    "MODEL_BASE_GEOMETRY_DECLARED_BASE_INVALID", modelId);
  const depth = milli(model?.baseDepthInches,
    "MODEL_BASE_GEOMETRY_DECLARED_BASE_INVALID", modelId);
  if (!modelId || shape !== profile.baseShape
    || width !== profile.baseWidthMilliInches
    || depth !== profile.baseDepthMilliInches) {
    fail("MODEL_BASE_GEOMETRY_CORRECT_BASE_REQUIRED", modelId);
  }
  const cross = shape === 'orthogonal_cross' ? readOfficialCrossArmDimensionsV1(model) : null;
  if (cross && Object.keys(cross).some(field => cross[field] !== profile[field])) {
    fail('MODEL_BASE_GEOMETRY_CORRECT_BASE_REQUIRED', modelId);
  }
  const contour = shape === 'measured_contour' ? profile.localVerticesMilliInches : null;
  if (contour && !sameMeasuredContour(contour, model?.baseLocalVerticesMilliInches)) {
    fail('MODEL_BASE_GEOMETRY_CORRECT_BASE_REQUIRED', modelId);
  }
  const outline = contour ? { localVerticesMilliInches: contour } : cross;
  const position = input.position || {
    xMilliInches: milli(model.xInches), yMilliInches: milli(model.yInches),
    rotationDegrees: model.baseRotationDegrees || 0,
  };
  const footprint = makeFootprint({ objectId: modelId, kind: "model_base", shape,
    center: position, widthMilliInches: width, depthMilliInches: depth, ...outline,
    rotationDegrees: position.rotationDegrees ?? model.baseRotationDegrees ?? 0 });
  return freezeDeep({ ...footprint, unitId: piece.id,
    officialUnitRecordKey: piece.officialUnitRecordKey,
    officialBaseProfile: { baseShape: profile.baseShape,
      baseWidthMillimetres: profile.baseWidthMillimetres,
      baseDepthMillimetres: profile.baseDepthMillimetres,
      printedBase: profile.printedBase, ...(outline ? { ...outline, ravenOutlineSource: profile.ravenOutlineSource }
        : { p2pSource: profile.p2pSource }) },
    physicalMiniatureExcluded: true, scenicElementsExcluded: true,
    flightStandBottomUsed: (piece.combatTags || []).some((entry) => (
      String(entry).toLowerCase() === "flying"
    )), rulesInterface: "base_only" });
}

export function createOfficialBattlefieldTokenPhysicalFootprintV1(token, kind = "battlefield_token") {
  return makeFootprint({ objectId: token.tokenId, kind,
    shape: token.baseShape === 'square' ? 'rectangle' : token.baseShape ?? 'round',
    center: { xMilliInches: milli(token.coordinate.x), yMilliInches: milli(token.coordinate.y) },
    widthMilliInches: milli(token.baseWidthInches ?? token.baseDiameterInches),
    depthMilliInches: milli(token.baseDepthInches ?? token.baseDiameterInches),
    rotationDegrees: token.baseRotationDegrees || 0 });
}
function genericFootprint(value, kind) {
  if (value?.schema === OFFICIAL_BATTLEFIELD_TOKEN_SCHEMA) {
    return createOfficialBattlefieldTokenPhysicalFootprintV1(value, kind);
  }
  const objectId = String(value?.id || "").trim();
  const shape = String(value?.baseShape || value?.shape
    || (value?.diameterMillimeters ? "round" : "")).toLowerCase();
  const width = value?.baseWidthInches !== undefined
    ? milli(value.baseWidthInches)
    : value?.diameterMillimeters !== undefined
      ? Math.round((Number(value.diameterMillimeters) / 25.4) * 1000)
      : Number(value?.widthMilliInches);
  const depth = value?.baseDepthInches !== undefined
    ? milli(value.baseDepthInches)
    : shape === "round" ? width : Number(value?.depthMilliInches);
  const center = value?.xMilliInches !== undefined
    ? point(value) : { xMilliInches: milli(value?.xInches),
      yMilliInches: milli(value?.yInches) };
  return makeFootprint({ objectId, kind, shape, center,
    widthMilliInches: width, depthMilliInches: depth,
    rotationDegrees: value?.baseRotationDegrees || value?.rotationDegrees || 0 });
}
function pointToFootprintDistance(value, footprint) {
  if (footprint.shape === "round") {
    return Math.max(0, distance(value, footprint.center) - footprint.radiusMilliInches);
  }
  if (isConcaveFootprint(footprint)) {
    return Math.min(...convexFootprintParts(footprint).map(part => pointPolygonDistance(value, part.vertices)));
  }
  return pointPolygonDistance(value, footprint.vertices);
}
function minimumSeparation(left, right) {
  if (isConcaveFootprint(left) || isConcaveFootprint(right)) {
    const rightParts = convexFootprintParts(right);
    return Math.min(...convexFootprintParts(left).flatMap(a => (
      rightParts.map(b => minimumSeparation(a, b))
    )));
  }
  if (left.shape === "round" && right.shape === "round") {
    return Math.max(0, distance(left.center, right.center)
      - left.radiusMilliInches - right.radiusMilliInches);
  }
  if (left.shape === "round") {
    return Math.max(0, pointPolygonDistance(left.center, right.vertices)
      - left.radiusMilliInches);
  }
  if (right.shape === "round") return minimumSeparation(right, left);
  if (polygonsIntersect(left.vertices, right.vertices)) return 0;
  return Math.min(
    ...left.vertices.map((entry) => pointPolygonDistance(entry, right.vertices)),
    ...right.vertices.map((entry) => pointPolygonDistance(entry, left.vertices)),
  );
}
function closestPointOnSegment(value, start, end) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  if (dx === 0 && dy === 0) return { ...start };
  const ratio = Math.max(0, Math.min(1,
    (((value.xMilliInches - start.xMilliInches) * dx)
      + ((value.yMilliInches - start.yMilliInches) * dy)) / ((dx * dx) + (dy * dy))));
  return {
    xMilliInches: Number((start.xMilliInches + (ratio * dx)).toFixed(6)),
    yMilliInches: Number((start.yMilliInches + (ratio * dy)).toFixed(6)),
  };
}
function closestPointOnPolygon(value, vertices) {
  if (pointInPolygon(value, vertices)) return { ...value };
  return polygonEdges(vertices).map(([start, end]) => (
    closestPointOnSegment(value, start, end)
  )).sort((left, right) => distance(value, left) - distance(value, right))[0];
}
export function measureOfficialFootprintBoundaryToPointV1(footprint, referencePoint) {
  const target = point(referencePoint, 'MODEL_BASE_GEOMETRY_TARGET_POINT_INVALID');
  if (footprint.shape === 'round') {
    return Math.round(Math.abs(distance(target, footprint.center) - footprint.radiusMilliInches));
  }
  return Math.round(Math.min(...polygonEdges(footprint.vertices).map(([start, end]) =>
    distance(target, closestPointOnSegment(target, start, end)))));
}

function circleBoundaryToward(circle, target) {
  const centreDistance = distance(circle.center, target);
  if (centreDistance <= TOLERANCE) return { ...circle.center };
  const ratio = circle.radiusMilliInches / centreDistance;
  return {
    xMilliInches: Number((circle.center.xMilliInches
      + ((target.xMilliInches - circle.center.xMilliInches) * ratio)).toFixed(6)),
    yMilliInches: Number((circle.center.yMilliInches
      + ((target.yMilliInches - circle.center.yMilliInches) * ratio)).toFixed(6)),
  };
}
function polygonContactPoint(left, right) {
  const sharedVertex = left.find(vertex => pointInPolygon(vertex, right))
    ?? right.find(vertex => pointInPolygon(vertex, left));
  if (sharedVertex) return sharedVertex;
  for (const [a, b] of polygonEdges(left)) {
    for (const [c, d] of polygonEdges(right)) {
      if (!segmentsIntersect(a, b, c, d)) continue;
      const startSide = orientation(c, d, a); const endSide = orientation(c, d, b);
      if (Math.abs(startSide - endSide) <= TOLERANCE) continue;
      const ratio = startSide / (startSide - endSide);
      return { xMilliInches: Number((a.xMilliInches + ratio * (b.xMilliInches - a.xMilliInches)).toFixed(6)),
        yMilliInches: Number((a.yMilliInches + ratio * (b.yMilliInches - a.yMilliInches)).toFixed(6)) };
    }
  }
  fail("MODEL_BASE_GEOMETRY_CROSS_CONTACT_UNRESOLVED");
}
function nearestFootprintPoints(left, right, requirePhysicalContact = false) {
  if (isConcaveFootprint(left) || isConcaveFootprint(right)) {
    const rightParts = convexFootprintParts(right);
    const pairs = convexFootprintParts(left).flatMap(a => (
      rightParts.map(b => nearestFootprintPoints(a, b, true))
    ));
    return pairs.reduce((best, next) => distance(next[0], next[1]) < distance(best[0], best[1]) ? next : best);
  }
  if (left.shape === "round" && right.shape === "round") {
    const centreDistance = distance(left.center, right.center);
    if (centreDistance <= left.radiusMilliInches + right.radiusMilliInches + TOLERANCE) {
      const contact = circleBoundaryToward(left, right.center);
      return [contact, contact];
    }
    return [
      circleBoundaryToward(left, right.center),
      circleBoundaryToward(right, left.center),
    ];
  }
  if (left.shape === "round") {
    const onRight = closestPointOnPolygon(left.center, right.vertices);
    if (distance(left.center, onRight) <= left.radiusMilliInches + TOLERANCE) {
      return [onRight, onRight];
    }
    return [circleBoundaryToward(left, onRight), onRight];
  }
  if (right.shape === "round") {
    const [onRight, onLeft] = nearestFootprintPoints(right, left);
    return [onLeft, onRight];
  }
  if (polygonsIntersect(left.vertices, right.vertices)) {
    if (requirePhysicalContact) {
      const contact = polygonContactPoint(left.vertices, right.vertices);
      return [contact, contact];
    }
    const contact = {
      xMilliInches: Number(((left.center.xMilliInches
        + right.center.xMilliInches) / 2).toFixed(6)),
      yMilliInches: Number(((left.center.yMilliInches
        + right.center.yMilliInches) / 2).toFixed(6)),
    };
    return [contact, contact];
  }
  const candidates = [
    ...left.vertices.map((onLeft) => ({
      onLeft,
      onRight: closestPointOnPolygon(onLeft, right.vertices),
    })),
    ...right.vertices.map((onRight) => ({
      onLeft: closestPointOnPolygon(onRight, left.vertices),
      onRight,
    })),
  ].sort((a, b) => distance(a.onLeft, a.onRight)
    - distance(b.onLeft, b.onRight));
  return [candidates[0].onLeft, candidates[0].onRight];
}

export function evaluateOfficialPhysicalFootprintRelationV1(input = {}) {
  const left = input.left;
  const right = input.right;
  if (!object(left) || !object(right)
    || left.schema !== "starcraft_tmg_physical_footprint_v1"
    || right.schema !== "starcraft_tmg_physical_footprint_v1") {
    fail("MODEL_BASE_GEOMETRY_FOOTPRINT_RELATION_INVALID");
  }
  const [nearestPointOnLeft, nearestPointOnRight] = nearestFootprintPoints(left, right);
  const body = {
    schema: "starcraft_tmg_physical_footprint_relation_v1",
    leftFootprintHash: left.footprintHash,
    rightFootprintHash: right.footprintHash,
    minimumSeparationMilliInches: Math.round(minimumSeparation(left, right)),
    nearestPointOnLeft,
    nearestPointOnRight,
    overlappingInteriors: overlaps(left, right),
    nearestPhysicalEdgesUsed: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, relationHash: hashStarcraftTmgContract(body) });
}

function convexHull(points) {
  const ordered = [...new Map(points.map((entry) => [
    `${entry.xMilliInches}:${entry.yMilliInches}`,
    entry,
  ])).values()].sort((left, right) => (
    left.xMilliInches - right.xMilliInches
      || left.yMilliInches - right.yMilliInches
  ));
  if (ordered.length <= 2) return ordered;
  const cross = (origin, left, right) => (
    (left.xMilliInches - origin.xMilliInches)
      * (right.yMilliInches - origin.yMilliInches)
    - (left.yMilliInches - origin.yMilliInches)
      * (right.xMilliInches - origin.xMilliInches)
  );
  const half = (rows) => {
    const result = [];
    for (const entry of rows) {
      while (result.length >= 2
        && cross(result.at(-2), result.at(-1), entry) <= TOLERANCE) {
        result.pop();
      }
      result.push(entry);
    }
    return result;
  };
  return [...half(ordered).slice(0, -1),
    ...half([...ordered].reverse()).slice(0, -1)];
}

function segmentPolygonDistance(start, end, vertices) {
  if (pointInPolygon(start, vertices) || pointInPolygon(end, vertices)
    || polygonEdges(vertices).some(([left, right]) => (
      segmentsIntersect(start, end, left, right)
    ))) return 0;
  return Math.min(
    pointPolygonDistance(start, vertices),
    pointPolygonDistance(end, vertices),
    ...vertices.map((entry) => pointSegmentDistance(entry, start, end)),
  );
}

function circumscribedRadius(footprint) {
  if (footprint.shape === "round") return footprint.radiusMilliInches;
  return Math.max(...footprint.vertices.map((entry) => (
    distance(footprint.center, entry)
  )));
}

function sweepCircleAgainstFootprint(start, end, radius, blocker) {
  if (blocker.shape === "round") {
    return pointSegmentDistance(blocker.center, start, end)
      < radius + blocker.radiusMilliInches - TOLERANCE;
  }
  if (isConcaveFootprint(blocker)) {
    return convexFootprintParts(blocker).some(part => sweepCircleAgainstFootprint(start, end, radius, part));
  }
  return segmentPolygonDistance(start, end, blocker.vertices)
    < radius - TOLERANCE;
}

function exactConstantRotationSweepCollision(start, end, blocker) {
  if (isConcaveFootprint(start)) {
    const endParts = convexFootprintParts(end);
    return convexFootprintParts(start).some((part, index) => (
      exactConstantRotationSweepCollision(part, endParts[index], blocker)
    ));
  }
  if (start.shape === "round") {
    return sweepCircleAgainstFootprint(
      start.center, end.center, start.radiusMilliInches, blocker,
    );
  }
  if (isConcaveFootprint(blocker)) {
    return convexFootprintParts(blocker).some(part => exactConstantRotationSweepCollision(start, end, part));
  }
  const sweptVertices = convexHull([...start.vertices, ...end.vertices]);
  if (blocker.shape === "round") {
    return pointPolygonDistance(blocker.center, sweptVertices)
      < blocker.radiusMilliInches - TOLERANCE;
  }
  return overlaps({ shape: start.shape, vertices: sweptVertices }, blocker);
}

function sameMeasuredContour(start, end) {
  return Array.isArray(start) && Array.isArray(end) && start.length === end.length
    && start.every((point, index) => point?.xMilliInches === end[index]?.xMilliInches
      && point?.yMilliInches === end[index]?.yMilliInches);
}

export function evaluateOfficialSweptPhysicalFootprintCollisionV1(input = {}) {
  const movingStart = input.movingStart;
  const movingEnd = input.movingEnd;
  const blocker = input.blocker;
  for (const footprint of [movingStart, movingEnd, blocker]) {
    if (!object(footprint)
      || footprint.schema !== "starcraft_tmg_physical_footprint_v1") {
      fail("MODEL_BASE_GEOMETRY_SWEPT_FOOTPRINT_INVALID");
    }
  }
  if (movingStart.shape !== movingEnd.shape
    || movingStart.widthMilliInches !== movingEnd.widthMilliInches
    || movingStart.depthMilliInches !== movingEnd.depthMilliInches
    || movingStart.horizontalArmDepthMilliInches !== movingEnd.horizontalArmDepthMilliInches
    || movingStart.verticalArmWidthMilliInches !== movingEnd.verticalArmWidthMilliInches
    || (movingStart.shape === "measured_contour"
      && !sameMeasuredContour(movingStart.localVerticesMilliInches, movingEnd.localVerticesMilliInches))) {
    fail("MODEL_BASE_GEOMETRY_SWEPT_RIGID_BASE_MISMATCH");
  }
  const usesOval = movingStart.shape === "oval" || blocker.shape === "oval";
  const usesCross = movingStart.shape === "orthogonal_cross" || blocker.shape === "orthogonal_cross";
  const usesContour = movingStart.shape === "measured_contour" || blocker.shape === "measured_contour";
  const constantRotation = movingStart.shape === "round"
    || Math.abs(movingStart.rotationDegrees - movingEnd.rotationDegrees)
      <= (movingStart.shape === "oval" || isConcaveFootprint(movingStart) ? 0 : TOLERANCE);
  const precision = constantRotation
    ? usesOval ? "bounded_ellipse_contour_constant_rotation_sweep"
      : usesContour ? "exact_constant_rotation_contour_sweep"
        : usesCross ? "exact_constant_rotation_rectangle_union_sweep" : "exact_constant_rotation_convex_sweep"
    : "conservative_rotation_circumscribed_envelope";
  const collides = constantRotation
    ? exactConstantRotationSweepCollision(movingStart, movingEnd, blocker)
    : sweepCircleAgainstFootprint(
      movingStart.center,
      movingEnd.center,
      Math.max(circumscribedRadius(movingStart),
        circumscribedRadius(movingEnd)),
      blocker,
    );
  const body = {
    schema: "starcraft_tmg_official_swept_physical_footprint_collision_v1",
    movingStartFootprintHash: movingStart.footprintHash,
    movingEndFootprintHash: movingEnd.footprintHash,
    blockerFootprintHash: blocker.footprintHash,
    collides,
    precision,
    completePhysicalBaseSwept: true,
    modelCentreOnlyMeasurement: false,
    contactWithoutInteriorOverlapAllowed: true,
    rulesTruth: "official_complete_physical_base_swept_collision",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function overlaps(left, right) {
  if (isConcaveFootprint(left) || isConcaveFootprint(right)) {
    const rightParts = convexFootprintParts(right);
    return convexFootprintParts(left).some(a => rightParts.some(b => overlaps(a, b)));
  }
  if (left.shape === "round" && right.shape === "round") {
    return distance(left.center, right.center)
      < left.radiusMilliInches + right.radiusMilliInches - TOLERANCE;
  }
  if (left.shape === "round") {
    return pointPolygonDistance(left.center, right.vertices)
      < left.radiusMilliInches - TOLERANCE;
  }
  if (right.shape === "round") return overlaps(right, left);
  if (!polygonsIntersect(left.vertices, right.vertices)) return false;
  const usesOval = left.shape === "oval" || right.shape === "oval";
  const axes = [...polygonEdges(left.vertices), ...polygonEdges(right.vertices)]
    .map(([a, b]) => ({ x: -(b.yMilliInches - a.yMilliInches),
      y: b.xMilliInches - a.xMilliInches }));
  return axes.every((axis) => {
    const leftProjection = left.vertices.map((entry) => (
      (entry.xMilliInches * axis.x) + (entry.yMilliInches * axis.y)
    ));
    const rightProjection = right.vertices.map((entry) => (
      (entry.xMilliInches * axis.x) + (entry.yMilliInches * axis.y)
    ));
    return Math.min(Math.max(...leftProjection), Math.max(...rightProjection))
      - Math.max(Math.min(...leftProjection), Math.min(...rightProjection))
      > TOLERANCE * (usesOval ? Math.hypot(axis.x, axis.y) : 1);
  });
}
export function doOfficialPhysicalFootprintsOverlapV1(left, right) {
  if (left?.schema !== "starcraft_tmg_physical_footprint_v1"
    || right?.schema !== "starcraft_tmg_physical_footprint_v1") {
    fail("MODEL_BASE_GEOMETRY_FOOTPRINT_RELATION_INVALID");
  }
  return distance(left.center, right.center) <= circumscribedRadius(left) + circumscribedRadius(right)
    && overlaps(left, right);
}
function whollyWithinRange(source, target, range) {
  if (source.shape === "measured_contour") {
    const upper = range + TOLERANCE;
    const covered = isTargetWhollyWithinMeasuredContourRangeV1(source, target, upper);
    if (!covered || target.shape !== "oval") return covered;
    if (isTargetWhollyWithinMeasuredContourRangeV1(source, target,
      upper - target.maximumContourErrorMilliInches)) return true;
    fail("MODEL_BASE_GEOMETRY_WHOLE_WITHIN_CONTOUR_ELLIPSE_TOLERANCE_UNRESOLVED");
  }
  if (source.shape === "orthogonal_cross") {
    const upper = range + TOLERANCE;
    const covered = isTargetWhollyWithinOrthogonalCrossRangeV1(source, target, upper);
    if (!covered || target.shape !== "oval") return covered;
    // The ellipse contour is inscribed. Its distance error can only affect
    // decisions in the narrow band between these two coverage bounds.
    if (isTargetWhollyWithinOrthogonalCrossRangeV1(source, target,
      upper - target.maximumContourErrorMilliInches)) return true;
    fail("MODEL_BASE_GEOMETRY_WHOLE_WITHIN_CROSS_ELLIPSE_TOLERANCE_UNRESOLVED");
  }
  if (target.shape === "round") {
    return range >= target.radiusMilliInches
      && pointToFootprintDistance(target.center, source)
        <= range - target.radiusMilliInches + TOLERANCE;
  }
  return target.vertices.every((entry) => (
    pointToFootprintDistance(entry, source) <= range + TOLERANCE
  ));
}
// Share the exact Native predicate with read-only formation search.
// A center/radius proxy is not equivalent for rotated rectangular bases.
export function isOfficialPhysicalFootprintWhollyWithinRangeV1(input = {}) {
  const { source, target, rangeMilliInches } = input;
  if (source?.schema !== "starcraft_tmg_physical_footprint_v1"
    || target?.schema !== "starcraft_tmg_physical_footprint_v1"
    || !Number.isSafeInteger(rangeMilliInches) || rangeMilliInches < 0) {
    fail("MODEL_BASE_GEOMETRY_RANGE_INVALID");
  }
  return whollyWithinRange(source, target, rangeMilliInches);
}

function segmentBlockedByFootprint(start, end, footprint) {
  if (isConcaveFootprint(footprint)) {
    return convexFootprintParts(footprint).some(part => segmentBlockedByFootprint(start, end, part));
  }
  if (footprint.shape === "round") {
    return pointSegmentDistance(footprint.center, start, end)
      < footprint.radiusMilliInches - TOLERANCE;
  }
  if (pointInPolygon(start, footprint.vertices) || pointInPolygon(end, footprint.vertices)) {
    return true;
  }
  return polygonEdges(footprint.vertices).some(([left, right]) => (
    segmentsIntersect(start, end, left, right)
  ));
}
function footprintInsideBoard(footprint, width, height) {
  if (footprint.shape === "round") {
    return footprint.center.xMilliInches >= footprint.radiusMilliInches - TOLERANCE
      && footprint.center.xMilliInches <= width - footprint.radiusMilliInches + TOLERANCE
      && footprint.center.yMilliInches >= footprint.radiusMilliInches - TOLERANCE
      && footprint.center.yMilliInches <= height - footprint.radiusMilliInches + TOLERANCE;
  }
  if (footprint.shape === "oval") {
    const { center, widthMilliInches, depthMilliInches, rotationDegrees } = footprint;
    const theta = rotationDegrees * Math.PI / 180;
    const xRadius = Math.hypot(widthMilliInches / 2 * Math.cos(theta),
      depthMilliInches / 2 * Math.sin(theta));
    const yRadius = Math.hypot(widthMilliInches / 2 * Math.sin(theta),
      depthMilliInches / 2 * Math.cos(theta));
    return center.xMilliInches - xRadius >= -TOLERANCE && center.xMilliInches + xRadius <= width + TOLERANCE
      && center.yMilliInches - yRadius >= -TOLERANCE && center.yMilliInches + yRadius <= height + TOLERANCE;
  }
  return footprint.vertices.every((entry) => (
    entry.xMilliInches >= -TOLERANCE && entry.xMilliInches <= width + TOLERANCE
      && entry.yMilliInches >= -TOLERANCE && entry.yMilliInches <= height + TOLERANCE
  ));
}

export function isOfficialPhysicalFootprintInsideBoardV1(input = {}) {
  const widthMilliInches = Number(input.widthMilliInches);
  const heightMilliInches = Number(input.heightMilliInches);
  if (!object(input.footprint)
    || input.footprint.schema !== "starcraft_tmg_physical_footprint_v1"
    || !Number.isSafeInteger(widthMilliInches) || widthMilliInches <= 0
    || !Number.isSafeInteger(heightMilliInches) || heightMilliInches <= 0) {
    fail("MODEL_BASE_GEOMETRY_BOARD_CONTAINMENT_INVALID");
  }
  return footprintInsideBoard(input.footprint, widthMilliInches, heightMilliInches);
}
function resolveReference(state, reference, dataBundle) {
  const kind = String(reference?.kind || "model");
  if (kind === "model") {
    const piece = state.pieces?.find((entry) => entry.id === reference.unitId);
    const model = activeModels(piece).find((entry) => entry.id === reference.modelId);
    if (!activePiece(piece) || !model) fail("MODEL_BASE_GEOMETRY_REFERENCE_INVALID");
    return { kind, unitId: piece.id, modelId: model.id,
      footprint: createOfficialModelBaseFootprintV1({ piece, model, dataBundle }) };
  }
  if (kind === 'marker') {
    const marker = (state.board?.markers || []).find(entry => entry.markerId === reference.id
      && entry.schema === OFFICIAL_BATTLEFIELD_MARKER_SCHEMA);
    if (marker) {
      verifyOfficialBattlefieldMarkerV1(marker, state.officialBattlefieldTokenMarkerRegistry);
      if (!marker.coordinate) fail('MODEL_BASE_GEOMETRY_MARKER_COORDINATE_REQUIRED', marker.markerId);
      return { kind, objectId: marker.markerId, footprint: null,
        measurementPoint: { xMilliInches: milli(marker.coordinate.x), yMilliInches: milli(marker.coordinate.y) } };
    }
  }
  const collection = kind === "mission_marker"
    ? state.board?.missionMarkers : state.board?.tokens;
  const value = (collection || []).find((entry) => (entry.schema === OFFICIAL_BATTLEFIELD_TOKEN_SCHEMA
    ? entry.tokenId : entry.id) === reference.id
    && entry.isRemoved !== true && entry.isDestroyed !== true);
  if (!value || !["mission_marker", "token", "marker"].includes(kind)) {
    fail("MODEL_BASE_GEOMETRY_REFERENCE_INVALID", String(reference?.id || ""));
  }
  if (value.schema === OFFICIAL_BATTLEFIELD_TOKEN_SCHEMA) {
    verifyOfficialBattlefieldTokenV1(value, state.officialBattlefieldTokenMarkerRegistry);
  }
  const identifiedToken = value.schema === OFFICIAL_BATTLEFIELD_TOKEN_SCHEMA && value.baseShape === "oval";
  return { kind, objectId: identifiedToken ? value.tokenId : value.id, footprint: genericFootprint(value, kind) };
}

function referenceSeparation(left, right) {
  if (left.measurementPoint && right.measurementPoint) return distance(left.measurementPoint, right.measurementPoint);
  if (left.measurementPoint) return pointToFootprintDistance(left.measurementPoint, right.footprint);
  if (right.measurementPoint) return pointToFootprintDistance(right.measurementPoint, left.footprint);
  return minimumSeparation(left.footprint, right.footprint);
}

export function evaluateOfficialBaseMeasurementV1(input = {}) {
  verifyOfficialModelBaseGeometryDataBundleV1(input.dataBundle);
  const source = resolveReference(input.state, input.source, input.dataBundle);
  const target = resolveReference(input.state, input.target, input.dataBundle);
  const distanceMilliInches = Math.round(referenceSeparation(source, target));
  const body = {
    schema: "starcraft_tmg_official_base_measurement_result_v1",
    source, target, coordinateUnit: "milli-inch", displayUnit: "inch",
    distanceMilliInches, distanceInches: Number((distanceMilliInches / 1000).toFixed(3)),
    baseToBaseContact: !source.measurementPoint && !target.measurementPoint && distanceMilliInches <= TOLERANCE,
    nearestPhysicalEdgesUsed: true, miniatureOverhangIgnored: true,
    tokenAndMarkerNearestEdgeUsed: !source.measurementPoint && !target.measurementPoint
      && (source.kind !== "model" || target.kind !== "model"),
    ...(source.measurementPoint || target.measurementPoint ? { markerReferencePointUsed: true } : {}),
    unrestrictedPremeasurement: true,
    rulesTruth: "official_nearest_base_or_physical_edge_measurement",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function evaluateOfficialWithinWhollyWithinV1(input = {}) {
  verifyOfficialModelBaseGeometryDataBundleV1(input.dataBundle);
  const source = resolveReference(input.state, input.source, input.dataBundle);
  const targetPiece = input.state.pieces?.find((entry) => entry.id === input.targetUnitId);
  if (!activePiece(targetPiece)) fail("MODEL_BASE_GEOMETRY_TARGET_UNIT_INVALID");
  const rangeMilliInches = Number(input.rangeMilliInches);
  if (!Number.isSafeInteger(rangeMilliInches) || rangeMilliInches < 0) {
    fail("MODEL_BASE_GEOMETRY_RANGE_INVALID");
  }
  const assessments = activeModels(targetPiece).map((model) => {
    const footprint = createOfficialModelBaseFootprintV1({ piece: targetPiece,
      model, dataBundle: input.dataBundle });
    const minimumDistanceMilliInches = Math.round(referenceSeparation(source, { footprint }));
    const whollyWithin = source.measurementPoint
      ? (footprint.shape === 'round'
        ? distance(source.measurementPoint, footprint.center) + footprint.radiusMilliInches
        : Math.max(...footprint.vertices.map(vertex => distance(source.measurementPoint, vertex)))) <= rangeMilliInches + TOLERANCE
      : whollyWithinRange(source.footprint, footprint, rangeMilliInches);
    return { modelId: model.id, footprintHash: footprint.footprintHash,
      minimumDistanceMilliInches,
      within: minimumDistanceMilliInches <= rangeMilliInches + TOLERANCE,
      whollyWithin };
  }).sort((left, right) => left.modelId.localeCompare(right.modelId));
  const body = {
    schema: "starcraft_tmg_official_within_wholly_within_result_v1",
    source, targetUnitId: targetPiece.id, rangeMilliInches, assessments,
    unitWithin: assessments.some((entry) => entry.within),
    unitWhollyWithin: assessments.every((entry) => entry.whollyWithin),
    withinRequiresAnyBasePart: true, whollyWithinRequiresEveryCompleteBase: true,
    partialOverlapSatisfiesWithinOnly: true,
    rulesTruth: "official_within_and_wholly_within_base_geometry",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

function stateGeometryHash(state) {
  return hashStarcraftTmgContract({
    board: state.board,
    pieces: (state.pieces || []).map((piece) => ({ id: piece.id,
      sideKey: piece.sideKey, officialUnitRecordKey: piece.officialUnitRecordKey,
      sourceRecordHash: piece.sourceRecordHash,
      officialPayloadHash: piece.officialPayloadHash,
      currentModels: piece.currentModels, isOnField: piece.isOnField,
      isDestroyed: piece.isDestroyed, combatTags: piece.combatTags,
      models: piece.models })),
    trainingTruth: false,
  });
}

export function createOfficialNoLegalCoherencyPositionCertificateV1(input = {}) {
  const body = {
    schema: OFFICIAL_NO_LEGAL_COHERENCY_POSITION_CERTIFICATE_SCHEMA,
    modelId: String(input.modelId || ""),
    stateGeometryHash: String(input.stateGeometryHash || ""),
    leadingModelId: String(input.leadingModelId || ""),
    candidatePositionDenominatorComplete:
      input.candidatePositionDenominatorComplete === true,
    legalLinkedPositionCount: Number(input.legalLinkedPositionCount),
    proofArtifactHash: String(input.proofArtifactHash || ""),
    proofAuthority: "rules_owned_geometry_candidate_denominator",
    trainingTruth: false,
  };
  if (!body.modelId || !body.leadingModelId
    || !/^[a-f0-9]{64}$/u.test(body.stateGeometryHash)
    || body.candidatePositionDenominatorComplete !== true
    || body.legalLinkedPositionCount !== 0
    || !/^[a-f0-9]{64}$/u.test(body.proofArtifactHash)) {
    fail("MODEL_BASE_GEOMETRY_CASUALTY_PROOF_INVALID", body.modelId);
  }
  return freezeDeep({ ...body, certificateHash: hashStarcraftTmgContract(body) });
}
function verifyCasualtyCertificate(certificate, expected) {
  if (!object(certificate)
    || certificate.schema !== OFFICIAL_NO_LEGAL_COHERENCY_POSITION_CERTIFICATE_SCHEMA
    || certificate.modelId !== expected.modelId
    || certificate.leadingModelId !== expected.leadingModelId
    || certificate.stateGeometryHash !== expected.stateGeometryHash
    || certificate.candidatePositionDenominatorComplete !== true
    || certificate.legalLinkedPositionCount !== 0
    || !/^[a-f0-9]{64}$/u.test(String(certificate.proofArtifactHash || ""))
    || certificate.trainingTruth !== false
    || certificate.certificateHash
      !== hashStarcraftTmgContract(without(certificate, ["certificateHash"]))) {
    fail("MODEL_BASE_GEOMETRY_CASUALTY_PROOF_INVALID", expected.modelId);
  }
}
function terrainFootprint(terrain) {
  const shape = String(terrain?.footprint?.shape || terrain?.shape || "").toLowerCase();
  if (shape === "axis_aligned_rectangle") {
    const value = terrain.footprint || terrain;
    const minX = Number(value.minXMilliInches); const maxX = Number(value.maxXMilliInches);
    const minY = Number(value.minYMilliInches); const maxY = Number(value.maxYMilliInches);
    if (![minX, maxX, minY, maxY].every(Number.isSafeInteger)
      || minX >= maxX || minY >= maxY) fail("MODEL_BASE_GEOMETRY_TERRAIN_INVALID");
    return makeFootprint({ objectId: terrain.id, kind: "terrain", shape: "rectangle",
      center: { xMilliInches: Math.round((minX + maxX) / 2),
        yMilliInches: Math.round((minY + maxY) / 2) },
      widthMilliInches: maxX - minX, depthMilliInches: maxY - minY,
      rotationDegrees: 0 });
  }
  return genericFootprint({ ...terrain, shape: shape === "round" ? "round" : shape },
    "terrain");
}
export function createOfficialTerrainCellFootprintsV1(terrain) {
  if (terrain.footprintCells === undefined) return [terrainFootprint(terrain)];
  if (!Array.isArray(terrain.footprintCells) || terrain.footprintCells.length === 0) {
    fail("MODEL_BASE_GEOMETRY_TERRAIN_CELLS_INVALID", terrain.id);
  }
  return terrain.footprintCells.map((footprint, index) => (
    terrainFootprint({ ...terrain, id: `${terrain.id}:cell-${index}`, footprint })
  ));
}
function activeTerrainGeometry(state, actor) {
  // Cell-based placement/link changes belong to this ground-clearance boundary.
  // High/mixed surfaces retain their existing access/surface contract.
  const flying = (actor.combatTags || []).some(value => String(value).toLowerCase() === "flying");
  const actualCells = !flying && coherencyModelClearanceDiameter(state, actor) > 0;
  return (state.board?.terrain || []).filter(entry =>
    entry.isRemoved !== true && entry.isDestroyed !== true).flatMap(entry => {
    if (!actualCells || entry.footprintCells === undefined) {
      return [{ entry, footprint: terrainFootprint(entry) }];
    }
    return createOfficialTerrainCellFootprintsV1(entry).map(footprint => ({ entry, footprint }));
  });
}
function accessPointAllowsLink(state, terrainId, start, end) {
  const entry = state.board?.specialTerrainAgreement?.terrainEntries?.find((candidate) => (
    candidate.terrainId === terrainId
  ));
  return (entry?.accessPoints || []).some((accessPoint) => (
    segmentBlockedByFootprint(start, end, makeFootprint({
      objectId: accessPoint.accessPointId, kind: "access_point", shape: "rectangle",
      center: { xMilliInches: Math.round((accessPoint.footprint.minXMilliInches
          + accessPoint.footprint.maxXMilliInches) / 2),
        yMilliInches: Math.round((accessPoint.footprint.minYMilliInches
          + accessPoint.footprint.maxYMilliInches) / 2) },
      widthMilliInches: accessPoint.footprint.maxXMilliInches
        - accessPoint.footprint.minXMilliInches,
      depthMilliInches: accessPoint.footprint.maxYMilliInches
        - accessPoint.footprint.minYMilliInches, rotationDegrees: 0,
    }))
  ));
}

function terrainBlocksCoherencyLink(state, blocker, start, end, actor, clearanceDiameter, raptorStrain) {
  const { entry: terrain, footprint } = blocker;
  if (clearanceDiameter > 0) {
    return isOfficialGroundTerrainTraversalBlockedV13(actor, terrain, raptorStrain)
      && sweepCircleAgainstFootprint(start, end, clearanceDiameter / 2, footprint)
      && !accessPointAllowsLink(state, terrain.id, start, end);
  }
  if (raptorStrain?.sourceDefinitionId && terrain.terrainKind === 'impassable'
    && !isOfficialGroundTerrainTraversalBlockedV13(actor, terrain, raptorStrain)) return false;
  if (!segmentBlockedByFootprint(start, end, footprint)) return false;
  if (!officialTerrainBlocksModelPlacementV1(terrain)
    && terrain.standableHorizontalSurface !== true) return false;
  if (terrain.standableHorizontalSurface === true) {
    const inside = (pointValue) => footprint.shape === "round"
      ? distance(pointValue, footprint.center)
        <= footprint.radiusMilliInches + TOLERANCE
      : pointInPolygon(pointValue, footprint.vertices);
    if (inside(start) && inside(end)) return false;
  }
  return !accessPointAllowsLink(state, terrain.id, start, end);
}

function coherencyModelClearanceDiameter(state, actor) {
  if (!hasOfficialModelGapTransitPolicyV13(state)
    || state.officialModelGapTransitPolicy.version !== "2.0.0") return 0;
  const elevations = activeModels(actor).map(model => String(model.elevation || ""));
  if (elevations.some(value => !value)) fail("MODEL_BASE_GEOMETRY_COHERENCY_ELEVATION_REQUIRED");
  return elevations.every(value => value === "ground" || value === "ground_level")
    ? getOfficialGroundSizeClearanceDiameterV13(actor) : 0;
}

function coherencyLinkClear(state, otherModels, terrain, flying,
  engagedEnemyUnitIds, left, right, modelClearanceDiameter = 0, actor, raptorStrain) {
  const otherModelBlocked = !flying && otherModels.some((blocker) => (
    blocker.footprint.objectId !== left.objectId && blocker.footprint.objectId !== right.objectId
      && !engagedEnemyUnitIds.has(blocker.piece.id)
      && (modelClearanceDiameter > 0
        ? sweepCircleAgainstFootprint(left.center, right.center, modelClearanceDiameter / 2, blocker.footprint)
        : segmentBlockedByFootprint(left.center, right.center, blocker.footprint))
  ));
  const terrainBlocked = !flying && terrain.some((blocker) => (
    terrainBlocksCoherencyLink(state, blocker, left.center, right.center, actor, modelClearanceDiameter, raptorStrain)
  ));
  return !otherModelBlocked && !terrainBlocked;
}

// Search uses the execution predicate; this is not a second coherency rule.
// The caller still submits every final placement to the full Rules validator.
export function createOfficialCoherencyLinkEvaluatorV1(input = {}) {
  return createCoherencyLinkEvaluator(input, false);
}

// Snapshot search derives engagement from proposed base geometry. Neither the
// caller nor the model may supply a claim that waives physical overlap checks.
export function createOfficialHypotheticalCoherencyLinkEvaluatorV1(input = {}) {
  return createCoherencyLinkEvaluator(input, true);
}

function snapshotEngagedEnemies(actor, otherModels, footprints) {
  return new Set(otherModels.filter(blocker => blocker.piece.sideKey !== actor.sideKey
    && footprints.some(footprint => minimumSeparation(footprint, blocker.footprint)
      <= ENGAGEMENT_RANGE_MILLI_INCHES + TOLERANCE)).map(blocker => blocker.piece.id));
}

function createCoherencyLinkEvaluator(input, snapshot) {
  const { state, actor, dataBundle } = input;
  verifyOfficialModelBaseGeometryDataBundleV1(dataBundle);
  if (!activePiece(actor)) fail("MODEL_BASE_GEOMETRY_COHERENCY_INPUT_INVALID");
  const otherModels = (state.pieces || []).filter(piece =>
    activePiece(piece) && piece.id !== actor.id).flatMap(piece =>
    activeModels(piece).map(model => ({ piece, model,
      footprint: createOfficialModelBaseFootprintV1({ piece, model, dataBundle }) })));
  const terrain = activeTerrainGeometry(state, actor);
  const flying = (actor.combatTags || []).some(entry =>
    String(entry).toLowerCase() === "flying");
  const engagedEnemyUnitIds = new Set((input.currentlyEngagedEnemyUnitIds || [])
    .map(String));
  const modelClearanceDiameter = flying ? 0 : coherencyModelClearanceDiameter(state, actor);
  const raptorStrain = projectOfficialRaptorStrainTerrainPermissionV13(state, actor);
  return (left, right, selected = []) => coherencyLinkClear(state, otherModels, terrain,
    flying, snapshot ? snapshotEngagedEnemies(actor, otherModels,
      [...selected.map(row => row.footprint), left, right]) : engagedEnemyUnitIds, left, right, modelClearanceDiameter, actor, raptorStrain);
}

export function evaluateOfficialCoherencyPlacementV1(input = {}) {
  return evaluateCoherencyGeometry(input, false);
}

// The current-release Relocation compiler binds the actual PLACE source.
// Part 11 permits an Assault PLACE to end engaged unless its source forbids it.
export function evaluateOfficialAssaultPlaceCoherencyV1(input = {}) {
  const bundle = input.state?.officialRelocationFamilySourceBundle;
  const route = bundle?.routes?.find(row => row.definitionId === input.assaultPlaceSourceDefinitionId);
  if (input.state?.phase !== 'assault'
    || bundle?.schema !== 'starcraft_tmg_official_relocation_family_source_bundle_v2'
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))
    || !route || route.phase !== 'assault' || route.effectKind !== 'direct_place'
    || route.recordKey !== input.actor?.officialUnitRecordKey
    || route.activationKind !== 'active' || route.minimumEnemyGapMilliInchesExclusive
    || route.routeHash !== hashStarcraftTmgContract(without(route, ['routeHash']))) {
    fail('MODEL_BASE_GEOMETRY_ASSAULT_PLACE_SOURCE_REQUIRED');
  }
  return evaluateCoherencyGeometry(input, false, route.routeHash);
}

// Separate proof type; this cannot certify a move, charge, deployment or Place.
// It shares all physical/coherency predicates with the live validator while
// accepting already-engaged positions as a declared hypothetical premise.
export function evaluateOfficialHypotheticalCoherencySnapshotV1(input = {}) {
  return evaluateCoherencyGeometry(input, true);
}

export function evaluateOfficialPsionicTransferSetCoherencyV1(input) {
  const tokenId = input.externalLeadingFootprint?.objectId;
  const effect = input.state.pendingPsionicTransferEffects?.find(row => row.effectHash === input.shadeEffectHash);
  if (!effect || effect.definitionId !== 'unit:adept/psionic-transfer-movement-phase@1'
    || effect.sourcePieceId !== input.actor.id || effect.round !== input.state.round || effect.tokenId !== tokenId
    || effect.sourceBundleHash !== input.state.officialPsionicTransferSourceBundle?.bundleHash
    || effect.effectHash !== hashStarcraftTmgContract(without(effect,['effectHash']))) {
    fail('MODEL_BASE_GEOMETRY_PSIONIC_TRANSFER_SOURCE_REQUIRED');
  }
  return evaluateCoherencyGeometry(input,false,null,effect.effectHash);
}
function evaluateCoherencyGeometry(input, snapshot, assaultPlaceSourceRouteHash = null, shadeEffectHash = null) {
  const { state, actor, plan, dataBundle } = input;
  verifyOfficialModelBaseGeometryDataBundleV1(dataBundle);
  if (!activePiece(actor) || !object(plan)) fail("MODEL_BASE_GEOMETRY_COHERENCY_INPUT_INVALID");
  profileForPiece(actor, dataBundle);
  const models = activeModels(actor);
  const remaining = new Set(models.map((entry) => entry.id));
  if (!Array.isArray(plan.placements) || plan.placements.length !== models.length) {
    fail("MODEL_BASE_GEOMETRY_PLACEMENT_DENOMINATOR_INVALID");
  }
  const geometryHash = stateGeometryHash(state);
  const leadingModelId = String(plan.leadingModelId || "");
  const rows = plan.placements.map((placement) => {
    const modelId = String(placement?.modelId || "");
    const model = models.find((entry) => entry.id === modelId);
    if (!model || !remaining.delete(modelId)) {
      fail("MODEL_BASE_GEOMETRY_PLACEMENT_MODEL_INVALID", modelId);
    }
    const outcome = String(placement.outcome || "placed");
    if (outcome === "casualty") {
      if (snapshot) fail("MODEL_BASE_GEOMETRY_SNAPSHOT_CASUALTY_NOT_ALLOWED");
      if (modelId === leadingModelId) fail("MODEL_BASE_GEOMETRY_LEADING_CASUALTY_INVALID");
      verifyCasualtyCertificate(placement.noLegalPositionCertificate, {
        modelId, leadingModelId, stateGeometryHash: geometryHash,
      });
      return { modelId, model, outcome, footprint: null,
        noLegalPositionCertificate: placement.noLegalPositionCertificate };
    }
    if (outcome !== "placed") fail("MODEL_BASE_GEOMETRY_PLACEMENT_OUTCOME_INVALID", modelId);
    const placementPoint = point(placement, "MODEL_BASE_GEOMETRY_PLACEMENT_POINT_INVALID", modelId);
    const footprint = createOfficialModelBaseFootprintV1({ piece: actor, model, dataBundle,
      position: { ...placementPoint, rotationDegrees: placement.rotationDegrees || 0 } });
    return { modelId, model, outcome, footprint };
  }).sort((left, right) => left.modelId.localeCompare(right.modelId));
  if (remaining.size > 0) fail("MODEL_BASE_GEOMETRY_PLACEMENT_DENOMINATOR_INVALID");
  const leading = rows.find((entry) => entry.modelId === leadingModelId);
  if (!leading?.footprint) fail("MODEL_BASE_GEOMETRY_LEADING_MODEL_INVALID");
  const coherencyRangeMilliInches = Number(
    input.coherencyRangeMilliInches ?? COHERENCY_RANGE_MILLI_INCHES,
  );
  if (![3000, 4000].includes(coherencyRangeMilliInches)) {
    fail("MODEL_BASE_GEOMETRY_COHERENCY_RANGE_UNSUPPORTED");
  }
  const width = milli(state.board?.widthInches);
  const height = milli(state.board?.heightInches);
  const placed = rows.filter((entry) => entry.footprint);
  if (placed.some((entry) => !footprintInsideBoard(entry.footprint, width, height))) {
    fail("MODEL_BASE_GEOMETRY_PLACEMENT_OUTSIDE_BATTLEFIELD");
  }
  for (let left = 0; left < placed.length; left += 1) {
    for (let right = left + 1; right < placed.length; right += 1) {
      if (overlaps(placed[left].footprint, placed[right].footprint)) {
        fail("MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP",
          `${placed[left].modelId}/${placed[right].modelId}`);
      }
    }
  }
  const otherModels = (state.pieces || []).filter((piece) => (
    activePiece(piece) && piece.id !== actor.id
  )).flatMap((piece) => activeModels(piece).map((model) => ({ piece, model,
    footprint: createOfficialModelBaseFootprintV1({ piece, model, dataBundle }) })));
  const terrain = activeTerrainGeometry(state, actor);
  const contourRelease = dataBundle.version === OFFICIAL_RAVEN_CONTOUR_GEOMETRY_BUNDLE_VERSION;
  const actorFlying = contourRelease && isOfficialFlyingUnitV1(actor);
  for (const row of placed) {
    for (const blocker of otherModels) {
      if (overlaps(row.footprint, blocker.footprint)) {
        fail("MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP",
          `${row.modelId}/${blocker.model.id}`);
      }
      if (!snapshot && !assaultPlaceSourceRouteHash && !shadeEffectHash && blocker.piece.sideKey !== actor.sideKey
        && (!contourRelease || actorFlying === isOfficialFlyingUnitV1(blocker.piece))
        && !officialNonEngagedBaseSeparationAllowedV1(row.footprint, blocker.footprint)) {
        fail("MODEL_BASE_GEOMETRY_ENEMY_SEPARATION_REQUIRED", row.modelId);
      }
    }
    for (const blocker of terrain) {
      if (officialTerrainBlocksModelPlacementV1(blocker.entry)
        && overlaps(row.footprint, blocker.footprint)) {
        fail("MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP",
          `${row.modelId}/${blocker.entry.id}`);
      }
    }
  }
  // A Rules-owned token may be the temporary Leading Model (Psionic Transfer).
  // It is not an extra unit model and does not change the placement denominator.
  const externalLeader = input.externalLeadingFootprint
    ? makeFootprint(input.externalLeadingFootprint) : null;
  const anchor = externalLeader || leading.footprint;
  const assessments = placed.map((entry) => ({ modelId: entry.modelId,
    whollyWithinLeading: (!externalLeader && entry.modelId === leadingModelId)
      || whollyWithinRange(anchor, entry.footprint, coherencyRangeMilliInches) }));
  const flying = (actor.combatTags || []).some((entry) => (
    String(entry).toLowerCase() === "flying"
  ));
  const engagedEnemyUnitIds = snapshot || assaultPlaceSourceRouteHash || shadeEffectHash
    ? snapshotEngagedEnemies(actor, otherModels, placed.map(row => row.footprint))
    : new Set((plan.currentlyEngagedEnemyUnitIds || []).map(String));
  const modelClearanceDiameter = flying ? 0 : coherencyModelClearanceDiameter(state, actor);
  const raptorStrain = projectOfficialRaptorStrainTerrainPermissionV13(state, actor);
  const adjacency = new Map(placed.map((entry) => [entry.modelId, []]));
  const linkEdges = [];
  for (let left = 0; left < placed.length; left += 1) {
    for (let right = left + 1; right < placed.length; right += 1) {
      const a = placed[left]; const b = placed[right];
      if (coherencyLinkClear(state, otherModels, terrain, flying,
        engagedEnemyUnitIds, a.footprint, b.footprint, modelClearanceDiameter, actor, raptorStrain)) {
        adjacency.get(a.modelId).push(b.modelId);
        adjacency.get(b.modelId).push(a.modelId);
        linkEdges.push({ fromModelId: a.modelId, toModelId: b.modelId });
      }
    }
  }
  const roots = externalLeader ? placed.filter(entry => coherencyLinkClear(
    state, otherModels, terrain, flying, engagedEnemyUnitIds,
    externalLeader, entry.footprint, modelClearanceDiameter, actor, raptorStrain)).map(entry => entry.modelId) : [leadingModelId];
  const linked = new Set(roots); const queue = [...roots];
  while (queue.length > 0) {
    for (const modelId of adjacency.get(queue.shift()) || []) {
      if (!linked.has(modelId)) { linked.add(modelId); queue.push(modelId); }
    }
  }
  if (linked.size !== placed.length) fail("MODEL_BASE_GEOMETRY_COHERENCY_LINK_INVALID");
  const inCoherency = assessments.every((entry) => entry.whollyWithinLeading);
  if (!snapshot && !inCoherency && plan.closestLegalPlacementDenominatorComplete !== true) {
    fail("MODEL_BASE_GEOMETRY_WHOLLY_WITHIN_REQUIRED");
  }
  const casualtyModelIds = rows.filter((entry) => entry.outcome === "casualty")
    .map((entry) => entry.modelId).sort();
  const body = {
    schema: snapshot ? "starcraft_tmg_hypothetical_coherency_snapshot_result_v1"
      : "starcraft_tmg_official_coherency_placement_result_v1",
    planId: String(plan.planId || ""), actorUnitId: actor.id, leadingModelId,
    stateGeometryHash: geometryHash,
    ...(externalLeader ? { externalLeadingObjectId: externalLeader.objectId,
      externalLeadingFootprintHash: externalLeader.footprintHash } : {}),
    placements: placed.map((entry) => ({ modelId: entry.modelId,
      footprint: entry.footprint })),
    casualtyModelIds, assessments, linkEdges,
    coherencyRangeMilliInches,
    flyingLinkExceptionsApplied: flying,
    inCoherency, outOfCoherency: !inCoherency,
    canControlOrContestMissionMarkers: inCoherency,
    ...(assaultPlaceSourceRouteHash ? { placementMode: 'source_bound_assault_place', assaultPlaceSourceRouteHash,
      assaultPlaceEngagementPermitted: true, engagedEnemyUnitIds: [...engagedEnemyUnitIds].sort() } : {}),
    ...(shadeEffectHash ? { placementMode: 'source_bound_adept_set', shadeEffectHash,
      engagedEnemyUnitIds: [...engagedEnemyUnitIds].sort() } : {}),
    ...(snapshot ? { geometrySnapshotOnly: true, placementLegalityProven: false,
      arrivalOrMovementLegalityProven: false,
      engagedEnemyUnitIds: [...engagedEnemyUnitIds].sort() }
      : { leadingModelNominationEndsOnActionResolution: true,
        casualtyOnlyAfterNoLegalLinkedPositionCertificate: true }),
    currentOfficialRoundAndRectangularBasesExecutable: true,
    rulesTruth: snapshot ? "conditional_snapshot_physical_geometry_and_coherency_only"
      : "official_coherency_placement_and_mission_capability",
    trainingTruth: false,
  };
  if (!body.planId) fail("MODEL_BASE_GEOMETRY_PLAN_ID_REQUIRED");
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

function evaluateWobblyAgreement(input) {
  const { state, actor, plan, dataBundle } = input;
  const model = activeModels(actor).find((entry) => entry.id === plan.modelId);
  if (!model) fail("MODEL_BASE_GEOMETRY_WOBBLY_MODEL_INVALID");
  const footprint = createOfficialModelBaseFootprintV1({ piece: actor, model, dataBundle,
    position: { ...point(plan.agreedPosition),
      rotationDegrees: plan.agreedPosition?.rotationDegrees || 0 } });
  const playerKeys = Object.keys(state.players || {}).sort();
  const agreedPlayerKeys = [...new Set((plan.agreedPlayerKeys || []).map(String))].sort();
  if (playerKeys.length < 2
    || hashStarcraftTmgContract(playerKeys) !== hashStarcraftTmgContract(agreedPlayerKeys)
    || !String(plan.positionMarkerId || "").trim()) {
    fail("MODEL_BASE_GEOMETRY_WOBBLY_AGREEMENT_INCOMPLETE");
  }
  const body = {
    schema: "starcraft_tmg_official_wobbly_model_position_agreement_v1",
    planId: String(plan.planId || ""), actorUnitId: actor.id, modelId: model.id,
    agreedPosition: { ...footprint.center,
      rotationDegrees: footprint.rotationDegrees },
    physicalDisplayPosition: point(plan.physicalDisplayPosition),
    positionMarkerId: String(plan.positionMarkerId), agreedPlayerKeys,
    footprintHash: footprint.footprintHash,
    treatedAsAgreedPositionForAllRules: true,
    rulesTruth: "official_wobbly_model_agreed_position",
    trainingTruth: false,
  };
  if (!body.planId) fail("MODEL_BASE_GEOMETRY_PLAN_ID_REQUIRED");
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function certifyOfficialModelBaseGeometryPlanV1(input = {}) {
  const { state, actor, plan, dataBundle } = input;
  const procedureKind = String(input.procedureKind || "");
  if (!object(state) || !activePiece(actor) || !object(plan)) {
    fail("MODEL_BASE_GEOMETRY_PLAN_INVALID");
  }
  verifyOfficialModelBaseGeometryDataBundleV1(dataBundle);
  profileForPiece(actor, dataBundle);
  let result;
  if (procedureKind === "measurement_check") {
    result = evaluateOfficialBaseMeasurementV1({ state, source: plan.source,
      target: plan.target, dataBundle });
  } else if (procedureKind === "within_wholly_within_check") {
    result = evaluateOfficialWithinWhollyWithinV1({ state, source: plan.source,
      targetUnitId: plan.targetUnitId,
      rangeMilliInches: plan.rangeMilliInches, dataBundle });
  } else if (procedureKind === "coherency_placement_check") {
    result = evaluateOfficialCoherencyPlacementV1({ state, actor, plan, dataBundle });
  } else if (procedureKind === "wobbly_position_agreement") {
    result = evaluateWobblyAgreement({ state, actor, plan, dataBundle });
  } else fail("MODEL_BASE_GEOMETRY_PROCEDURE_KIND_INVALID", procedureKind);
  const planId = String(plan.planId || "");
  if (!planId) fail("MODEL_BASE_GEOMETRY_PLAN_ID_REQUIRED");
  const body = {
    schema: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_KERNEL_SCHEMA,
    kernelVersion: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_KERNEL_VERSION,
    planId, procedureKind, actorUnitId: actor.id, result,
    modelBaseGeometryDataBundleHash: dataBundle.bundleHash,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    currentOfficialBaseGeometryProductionQuarantineLifted: true,
    rulesTruth: "official_model_base_geometry_measurement_and_coherency_conformance",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}
