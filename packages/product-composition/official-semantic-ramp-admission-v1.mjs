// V3.1 pre-Room admission for authored semantic ramps. Candidate paths are
// untrusted: the frozen source, complete ramp denominator, full model base,
// printed Move budget and official Special Terrain kernel are recomputed here.
// This is a prerequisite to a signed Room move, never a substitute for one.
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { certifyOfficialSpecialTerrainPlanV1 } from
  "../rule-atoms/official-special-terrain-rules-kernel-v1.mjs";
import { deriveOfficialSemanticSurfaceSupportV1 } from
  "../rule-atoms/official-semantic-surface-support-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../source-data/official-command-center-adapter-v1.mjs";
import { createOfficialModelBaseGeometryDataBundleV1,
  getOfficialModelBaseGeometryProfileV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { createOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";

export const OFFICIAL_SEMANTIC_RAMP_ADMISSION_V1_SCHEMA =
  "starcraft_tmg_official_semantic_ramp_admission_v1";
const ROUTES_SCHEMA = "starcraft_tmg_semantic_ramp_candidate_routes_v1";
const V3_OVERLAY = "local_ramp_corridor_v3_1";
const MODEL_KEY = "army_units:marine";
const MODEL_ID = "semantic-ramp-admission-marine-model-1";
const ACTOR_ID = "semantic-ramp-admission-marine";
const TOLERANCE = 10;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function pointRectDistance(point, rect) {
  return Math.hypot(
    Math.max(rect.minXMilliInches - point.xMilliInches, 0,
      point.xMilliInches - rect.maxXMilliInches),
    Math.max(rect.minYMilliInches - point.yMilliInches, 0,
      point.yMilliInches - rect.maxYMilliInches));
}
function routeLength(path) {
  return Math.ceil(path.slice(1).reduce((sum, point, index) => (
    sum + Math.hypot(point.xMilliInches - path[index].xMilliInches,
      point.yMilliInches - path[index].yMilliInches)), 0));
}
function assertPoint(point, battlefield, radius) {
  if (!Number.isSafeInteger(point?.xMilliInches)
    || !Number.isSafeInteger(point?.yMilliInches)
    || !["ground", "high"].includes(point?.elevation)
    || point.xMilliInches < radius
    || point.yMilliInches < radius
    || point.xMilliInches > Math.round(battlefield.widthInches * 1000) - radius
    || point.yMilliInches > Math.round(battlefield.heightInches * 1000) - radius) {
    fail("SEMANTIC_RAMP_ADMISSION_POINT_INVALID");
  }
}

export function certifyOfficialSemanticRampAdmissionV1(input = {}) {
  const { binding, overlay, semanticTerrainCertificate, terrainHeightTierLedger,
    deploymentGeometryBinding, dataset, candidateRoutes } = input;
  if (!object(binding) || !object(overlay) || !object(dataset)
    || !object(semanticTerrainCertificate) || !object(terrainHeightTierLedger)
    || !object(deploymentGeometryBinding)
    || overlay.receipt?.overlayCompilerVersion !== V3_OVERLAY
    || candidateRoutes?.schema !== ROUTES_SCHEMA
    || candidateRoutes.bindingHash !== binding.bindingHash
    || candidateRoutes.overlayHash !== overlay.receipt.overlayHash
    || !Array.isArray(candidateRoutes.routes)
    || candidateRoutes.routes.length !== overlay.gateIndex.length
    || overlay.gateIndex.length === 0) {
    fail("SEMANTIC_RAMP_ADMISSION_INPUT_INVALID");
  }
  const expected = new Map(overlay.gateIndex.map((gate) => [gate.accessPointId, gate]));
  const supplied = new Map();
  for (const route of candidateRoutes.routes) {
    if (!expected.has(route?.accessPointId)
      || supplied.has(route.accessPointId)
      || !Array.isArray(route.path) || route.path.length < 2
      || route.path.length > 64
      || !Number.isSafeInteger(route.transitionIndex)
      || route.transitionIndex < 0
      || route.transitionIndex >= route.path.length - 1) {
      fail("SEMANTIC_RAMP_ADMISSION_DENOMINATOR_INVALID",
        String(route?.accessPointId || ""));
    }
    supplied.set(route.accessPointId, route);
  }
  const record = getOfficialCurrentProductRecord(dataset, MODEL_KEY);
  const modelBase = getOfficialModelBaseGeometryProfileV1(
    createOfficialModelBaseGeometryDataBundleV1({ dataset }), MODEL_KEY);
  if (modelBase.baseShape !== "round"
    || modelBase.baseWidthMilliInches !== modelBase.baseDepthMilliInches) {
    fail("SEMANTIC_RAMP_ADMISSION_MODEL_BASE_UNSUPPORTED");
  }
  const speed = /^(\d+)\/(\d+)$/u.exec(String(record.payload.stats?.speed || ""));
  if (!speed) fail("SEMANTIC_RAMP_ADMISSION_PRINTED_SPEED_MISSING");
  const singleModelMoveMilliInches = Number(speed[2]) * 1000;
  const radius = Math.round(modelBase.baseWidthMilliInches / 2);
  const terrainDataBundle = createOfficialTerrainLosDataBundleV1({ dataset });
  const surfaceState = {
    officialDeploymentGeometryBinding: deploymentGeometryBinding,
    officialTerrainHeightTierLedger: terrainHeightTierLedger,
    officialCompetitiveMapRoomFreeze: {
      overlayReceipt: overlay.receipt,
      terrainHeightTierLedgerHash: terrainHeightTierLedger.ledgerHash,
      semanticTerrainCertificateHash: semanticTerrainCertificate.certificateHash,
      semanticTerrainCertificate,
    },
    board: { terrain: overlay.rows },
  };
  const elevated = overlay.rows.filter((row) => (
    row.isRemoved !== true && row.elevationSurface === true
      && Number(row.size) >= 1));
  const groundClear = (point) => elevated.every((row) => (
    pointRectDistance(point, row.footprint) > radius + TOLERANCE));
  const highSupported = (point) => deriveOfficialSemanticSurfaceSupportV1(
    surfaceState, { shape: "round", center: point,
      radiusMilliInches: radius })?.elevation === "high";
  const receipts = [];
  for (const [accessPointId] of expected) {
    const route = supplied.get(accessPointId);
    const path = route.path;
    path.forEach((point) => assertPoint(point, binding.battlefield, radius));
    const transition = route.transitionIndex;
    if (path[0].elevation !== "ground"
      || path.at(-1).elevation !== "high"
      || path.some((point, index) => point.elevation !== (
        index <= transition ? "ground" : "high"))
      || !groundClear(path[0]) || !highSupported(path.at(-1))) {
      fail("SEMANTIC_RAMP_ADMISSION_SURFACE_INVALID", accessPointId);
    }
    const lengthMilliInches = routeLength(path);
    if (lengthMilliInches > singleModelMoveMilliInches) {
      fail("SEMANTIC_RAMP_ADMISSION_PRINTED_MOVE_EXCEEDED", accessPointId);
    }
    for (const direction of ["ground_to_high", "high_to_ground"]) {
      const reversed = direction === "high_to_ground";
      const actionPath = reversed ? [...path].reverse() : path;
      const segmentIndex = reversed ? path.length - 2 - transition : transition;
      const start = actionPath[0]; const end = actionPath.at(-1);
      const actor = { id: ACTOR_ID, sideKey: "player1",
        officialUnitRecordKey: MODEL_KEY,
        sourceRecordHash: record.sourceRecordHash,
        officialPayloadHash: record.payloadHash,
        currentModels: 1, isOnField: true, isDestroyed: false,
        models: [{ id: MODEL_ID, xInches: start.xMilliInches / 1000,
          yInches: start.yMilliInches / 1000, elevation: start.elevation,
          baseShape: "round",
          baseWidthInches: modelBase.baseWidthMilliInches / 1000,
          baseDepthInches: modelBase.baseDepthMilliInches / 1000,
          isOnField: true, isDestroyed: false }] };
      const state = { phase: "movement", activeSideKey: "player1",
        board: { widthInches: binding.battlefield.widthInches,
          heightInches: binding.battlefield.heightInches,
          terrain: overlay.rows,
          specialTerrainAgreement: overlay.agreement },
        pieces: [actor] };
      const plan = { planId: `${accessPointId}:${direction}`,
        movementType: "move", leadingModelId: MODEL_ID,
        maxDistanceMilliInches: singleModelMoveMilliInches,
        placements: [{ modelId: MODEL_ID, xMilliInches: end.xMilliInches,
          yMilliInches: end.yMilliInches, elevation: end.elevation,
          supportTerrainIds: [] }],
        path: actionPath, elevationTransitions: [{ segmentIndex,
          accessPointId }], gapMouths: [], coherencyGapMouths: [] };
      let certified;
      try {
        certified = certifyOfficialSpecialTerrainPlanV1({ state, actor,
          plan, procedureKind: "special_terrain_movement_check",
          dataBundle: terrainDataBundle });
      } catch (error) {
        fail("SEMANTIC_RAMP_ADMISSION_RULES_REJECTED",
          `${accessPointId}:${direction}:${String(error?.message || error)}`);
      }
      if (certified.result.accessPointUses.length !== 1
        || certified.result.accessPointUses[0].accessPointId !== accessPointId) {
        fail("SEMANTIC_RAMP_ADMISSION_ACCESS_MISMATCH", accessPointId);
      }
      receipts.push({ accessPointId, direction, routeHash:
        hashStarcraftTmgContract({ path: actionPath, segmentIndex }),
        lengthMilliInches, officialRulesPlanHash: certified.planHash });
    }
  }
  const body = {
    schema: OFFICIAL_SEMANTIC_RAMP_ADMISSION_V1_SCHEMA,
    version: "1.0.0", bindingHash: binding.bindingHash,
    overlayHash: overlay.receipt.overlayHash,
    semanticTerrainCertificateHash: semanticTerrainCertificate.certificateHash,
    terrainHeightTierLedgerHash: terrainHeightTierLedger.ledgerHash,
    deploymentGeometryBindingHash: deploymentGeometryBinding.bindingHash,
    officialDatasetHash: dataset.datasetHash,
    officialTerrainDataBundleHash: terrainDataBundle.bundleHash,
    officialUnitRecordKey: MODEL_KEY,
    officialUnitRecordHash: record.sourceRecordHash,
    baseWidthMilliInches: modelBase.baseWidthMilliInches,
    singleModelMoveMilliInches,
    gateCount: expected.size, directionCount: receipts.length,
    receipts, signedRoomActionProved: false, trainingTruth: false,
  };
  return Object.freeze({ ...body,
    admissionHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialSemanticRampAdmissionV1(admission, binding) {
  if (!object(admission)
    || admission.schema !== OFFICIAL_SEMANTIC_RAMP_ADMISSION_V1_SCHEMA
    || admission.version !== "1.0.0"
    || admission.bindingHash !== binding?.bindingHash
    || admission.directionCount !== admission.gateCount * 2
    || !Array.isArray(admission.receipts)
    || admission.receipts.length !== admission.directionCount
    || admission.signedRoomActionProved !== false
    || admission.trainingTruth !== false
    || admission.admissionHash !== hashStarcraftTmgContract(
      without(admission, ["admissionHash"]))) {
    fail("SEMANTIC_RAMP_ADMISSION_INVALID");
  }
  return true;
}
