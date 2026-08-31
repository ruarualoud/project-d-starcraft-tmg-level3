import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialModelBaseGeometryProfileV1,
  verifyOfficialModelBaseGeometryDataBundleV1,
} from "../source-data/official-model-base-geometry-data-bundle-v1.mjs";

export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_KERNEL_SCHEMA =
  "starcraft_tmg_official_model_base_geometry_rules_kernel_v1";
export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_NO_LEGAL_COHERENCY_POSITION_CERTIFICATE_SCHEMA =
  "starcraft_tmg_no_legal_coherency_position_certificate_v1";

const TOLERANCE = 1;
const COHERENCY_RANGE_MILLI_INCHES = 3000;
const ENGAGEMENT_RANGE_MILLI_INCHES = 1000;

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
  const angle = (rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(angle); const sine = Math.sin(angle);
  return [[-width / 2, -depth / 2], [width / 2, -depth / 2],
    [width / 2, depth / 2], [-width / 2, depth / 2]].map(([x, y]) => ({
    xMilliInches: Number((center.xMilliInches + (x * cosine) - (y * sine)).toFixed(6)),
    yMilliInches: Number((center.yMilliInches + (x * sine) + (y * cosine)).toFixed(6)),
  }));
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
  } else if (shape === "rectangle") {
    const widthMilliInches = Number(input.widthMilliInches);
    const depthMilliInches = Number(input.depthMilliInches);
    const rotationDegrees = canonicalRotation(input.rotationDegrees);
    if (!Number.isSafeInteger(widthMilliInches) || !Number.isSafeInteger(depthMilliInches)
      || widthMilliInches <= 0 || depthMilliInches <= 0) {
      fail("MODEL_BASE_GEOMETRY_RECTANGLE_BASE_INVALID", objectId);
    }
    body = { schema: "starcraft_tmg_physical_footprint_v1", objectId, kind,
      shape, center, widthMilliInches, depthMilliInches, rotationDegrees,
      radiusMilliInches: null,
      vertices: rectangleVertices(center, widthMilliInches, depthMilliInches,
        rotationDegrees) };
  } else fail("MODEL_BASE_GEOMETRY_SHAPE_UNSUPPORTED", `${objectId}:${shape}`);
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
  const position = input.position || {
    xMilliInches: milli(model.xInches), yMilliInches: milli(model.yInches),
    rotationDegrees: model.baseRotationDegrees || 0,
  };
  const footprint = makeFootprint({ objectId: modelId, kind: "model_base", shape,
    center: position, widthMilliInches: width, depthMilliInches: depth,
    rotationDegrees: position.rotationDegrees ?? model.baseRotationDegrees ?? 0 });
  return freezeDeep({ ...footprint, unitId: piece.id,
    officialUnitRecordKey: piece.officialUnitRecordKey,
    officialBaseProfile: { baseShape: profile.baseShape,
      baseWidthMillimetres: profile.baseWidthMillimetres,
      baseDepthMillimetres: profile.baseDepthMillimetres,
      printedBase: profile.printedBase, p2pSource: profile.p2pSource },
    physicalMiniatureExcluded: true, scenicElementsExcluded: true,
    flightStandBottomUsed: (piece.combatTags || []).some((entry) => (
      String(entry).toLowerCase() === "flying"
    )), rulesInterface: "base_only" });
}

function genericFootprint(value, kind) {
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
  return pointPolygonDistance(value, footprint.vertices);
}
function minimumSeparation(left, right) {
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
function overlaps(left, right) {
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
      - Math.max(Math.min(...leftProjection), Math.min(...rightProjection)) > TOLERANCE;
  });
}
function whollyWithinRange(source, target, range) {
  if (target.shape === "round") {
    return range >= target.radiusMilliInches
      && pointToFootprintDistance(target.center, source)
        <= range - target.radiusMilliInches + TOLERANCE;
  }
  return target.vertices.every((entry) => (
    pointToFootprintDistance(entry, source) <= range + TOLERANCE
  ));
}
function segmentBlockedByFootprint(start, end, footprint) {
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
  return footprint.vertices.every((entry) => (
    entry.xMilliInches >= -TOLERANCE && entry.xMilliInches <= width + TOLERANCE
      && entry.yMilliInches >= -TOLERANCE && entry.yMilliInches <= height + TOLERANCE
  ));
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
  const collection = kind === "mission_marker"
    ? state.board?.missionMarkers : state.board?.tokens;
  const value = (collection || []).find((entry) => entry.id === reference.id
    && entry.isRemoved !== true && entry.isDestroyed !== true);
  if (!value || !["mission_marker", "token", "marker"].includes(kind)) {
    fail("MODEL_BASE_GEOMETRY_REFERENCE_INVALID", String(reference?.id || ""));
  }
  return { kind, objectId: value.id, footprint: genericFootprint(value, kind) };
}

export function evaluateOfficialBaseMeasurementV1(input = {}) {
  verifyOfficialModelBaseGeometryDataBundleV1(input.dataBundle);
  const source = resolveReference(input.state, input.source, input.dataBundle);
  const target = resolveReference(input.state, input.target, input.dataBundle);
  const distanceMilliInches = Math.round(minimumSeparation(
    source.footprint, target.footprint,
  ));
  const body = {
    schema: "starcraft_tmg_official_base_measurement_result_v1",
    source, target, coordinateUnit: "milli-inch", displayUnit: "inch",
    distanceMilliInches, distanceInches: Number((distanceMilliInches / 1000).toFixed(3)),
    baseToBaseContact: distanceMilliInches <= TOLERANCE,
    nearestPhysicalEdgesUsed: true, miniatureOverhangIgnored: true,
    tokenAndMarkerNearestEdgeUsed:
      source.kind !== "model" || target.kind !== "model",
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
    const minimumDistanceMilliInches = Math.round(minimumSeparation(
      source.footprint, footprint,
    ));
    return { modelId: model.id, footprintHash: footprint.footprintHash,
      minimumDistanceMilliInches,
      within: minimumDistanceMilliInches <= rangeMilliInches + TOLERANCE,
      whollyWithin: whollyWithinRange(source.footprint, footprint, rangeMilliInches) };
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

export function evaluateOfficialCoherencyPlacementV1(input = {}) {
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
  const terrain = (state.board?.terrain || []).filter((entry) => (
    entry.isRemoved !== true && entry.isDestroyed !== true
  )).map((entry) => ({ entry, footprint: terrainFootprint(entry) }));
  for (const row of placed) {
    for (const blocker of otherModels) {
      if (overlaps(row.footprint, blocker.footprint)) {
        fail("MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP",
          `${row.modelId}/${blocker.model.id}`);
      }
      if (blocker.piece.sideKey !== actor.sideKey
        && minimumSeparation(row.footprint, blocker.footprint)
          < ENGAGEMENT_RANGE_MILLI_INCHES - TOLERANCE) {
        fail("MODEL_BASE_GEOMETRY_ENEMY_SEPARATION_REQUIRED", row.modelId);
      }
    }
    for (const blocker of terrain) {
      if (blocker.entry.blocksPlacement !== false
        && overlaps(row.footprint, blocker.footprint)) {
        fail("MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP",
          `${row.modelId}/${blocker.entry.id}`);
      }
    }
  }
  const assessments = placed.map((entry) => ({ modelId: entry.modelId,
    whollyWithinLeading: entry.modelId === leadingModelId
      || whollyWithinRange(leading.footprint, entry.footprint,
        COHERENCY_RANGE_MILLI_INCHES) }));
  const flying = (actor.combatTags || []).some((entry) => (
    String(entry).toLowerCase() === "flying"
  ));
  const engagedEnemyUnitIds = new Set((plan.currentlyEngagedEnemyUnitIds || []).map(String));
  const adjacency = new Map(placed.map((entry) => [entry.modelId, []]));
  const linkEdges = [];
  for (let left = 0; left < placed.length; left += 1) {
    for (let right = left + 1; right < placed.length; right += 1) {
      const a = placed[left]; const b = placed[right];
      const otherModelBlocked = !flying && otherModels.some((blocker) => (
        !engagedEnemyUnitIds.has(blocker.piece.id)
          && segmentBlockedByFootprint(a.footprint.center, b.footprint.center,
            blocker.footprint)
      ));
      const terrainBlocked = !flying && terrain.some((blocker) => (
        segmentBlockedByFootprint(a.footprint.center, b.footprint.center,
          blocker.footprint)
          && !accessPointAllowsLink(state, blocker.entry.id,
            a.footprint.center, b.footprint.center)
      ));
      if (!otherModelBlocked && !terrainBlocked) {
        adjacency.get(a.modelId).push(b.modelId);
        adjacency.get(b.modelId).push(a.modelId);
        linkEdges.push({ fromModelId: a.modelId, toModelId: b.modelId });
      }
    }
  }
  const linked = new Set([leadingModelId]); const queue = [leadingModelId];
  while (queue.length > 0) {
    for (const modelId of adjacency.get(queue.shift()) || []) {
      if (!linked.has(modelId)) { linked.add(modelId); queue.push(modelId); }
    }
  }
  if (linked.size !== placed.length) fail("MODEL_BASE_GEOMETRY_COHERENCY_LINK_INVALID");
  const inCoherency = assessments.every((entry) => entry.whollyWithinLeading);
  if (!inCoherency && plan.closestLegalPlacementDenominatorComplete !== true) {
    fail("MODEL_BASE_GEOMETRY_WHOLLY_WITHIN_REQUIRED");
  }
  const casualtyModelIds = rows.filter((entry) => entry.outcome === "casualty")
    .map((entry) => entry.modelId).sort();
  const body = {
    schema: "starcraft_tmg_official_coherency_placement_result_v1",
    planId: String(plan.planId || ""), actorUnitId: actor.id, leadingModelId,
    stateGeometryHash: geometryHash,
    placements: placed.map((entry) => ({ modelId: entry.modelId,
      footprint: entry.footprint })),
    casualtyModelIds, assessments, linkEdges,
    coherencyRangeMilliInches: COHERENCY_RANGE_MILLI_INCHES,
    flyingLinkExceptionsApplied: flying,
    inCoherency, outOfCoherency: !inCoherency,
    canControlOrContestMissionMarkers: inCoherency,
    leadingModelNominationEndsOnActionResolution: true,
    casualtyOnlyAfterNoLegalLinkedPositionCertificate: true,
    currentOfficialRoundAndRectangularBasesExecutable: true,
    rulesTruth: "official_coherency_placement_and_mission_capability",
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
