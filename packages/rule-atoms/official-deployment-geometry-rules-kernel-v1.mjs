import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialDeploymentGeometryProfileV1,
  verifyOfficialDeploymentGeometryDataBundleV1,
} from "../source-data/official-deployment-geometry-data-bundle-v1.mjs";
import { verifyOfficialMissionDeploymentDraftDataBundleV1 } from
  "../source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import { verifyOfficialMissionDeploymentDraftStateV1 } from
  "./official-mission-deployment-draft-rules-kernel-v1.mjs";

export const OFFICIAL_DEPLOYMENT_GEOMETRY_BINDING_SCHEMA =
  "starcraft_tmg_official_deployment_geometry_binding_v1";
export const OFFICIAL_TERRAIN_HEIGHT_TIER_LEDGER_SCHEMA =
  "starcraft_tmg_official_terrain_height_tier_ledger_v1";
export const OFFICIAL_MISSION_MARKER_PLACEMENT_SCHEMA =
  "starcraft_tmg_official_mission_marker_placement_v1";
export const OFFICIAL_BATTLEFIELD_VIEWPORT_PROJECTION_SCHEMA =
  "starcraft_tmg_official_battlefield_viewport_projection_v1";

const HEIGHT_TIERS = new Set(["ground_level", "mid_ground", "high_ground"]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) { return { ...body, [field]: hashStarcraftTmgContract(body) }; }

export function createOfficialDeploymentGeometryBindingV1(input = {}) {
  const geometryBundle = input.deploymentGeometryDataBundle;
  const draftBundle = input.missionDeploymentDraftDataBundle;
  const draftState = input.missionDeploymentDraftState;
  verifyOfficialDeploymentGeometryDataBundleV1(geometryBundle);
  verifyOfficialMissionDeploymentDraftDataBundleV1(draftBundle);
  verifyOfficialMissionDeploymentDraftStateV1(draftState, draftBundle);
  if (draftState.stage !== "complete" || !object(draftState.draftBinding)
    || geometryBundle.missionDeploymentDraftDataBundleHash !== draftBundle.bundleHash
    || draftState.draftBinding.dataBundleHash !== draftBundle.bundleHash) {
    fail("DEPLOYMENT_GEOMETRY_DRAFT_BINDING_INVALID");
  }
  const draftBinding = draftState.draftBinding;
  const profile = getOfficialDeploymentGeometryProfileV1(geometryBundle,
    draftBinding.deploymentRecordKey);
  if (profile.deploymentProfileHash !== draftBinding.deploymentProfileHash
    || profile.engagementScale !== draftBinding.engagementScale) {
    fail("DEPLOYMENT_GEOMETRY_SELECTED_PROFILE_MISMATCH");
  }
  const playerByColour = Object.fromEntries(Object.entries(draftBinding.colourByPlayer)
    .map(([playerId, colour]) => [colour, playerId]));
  if (!playerByColour.red || !playerByColour.blue) {
    fail("DEPLOYMENT_GEOMETRY_PLAYER_COLOUR_INVALID");
  }
  const markerTargets = profile.missionMarkers.map((marker) => ({ ...clone(marker),
    affinityPlayerId: marker.affinityColour === "neutral"
      ? null : playerByColour[marker.affinityColour],
    placementStatus: "coordinate_reserved_awaiting_terrain" }));
  const body = { schema: OFFICIAL_DEPLOYMENT_GEOMETRY_BINDING_SCHEMA,
    engagementScale: profile.engagementScale,
    deploymentRecordKey: profile.recordKey,
    deploymentProfileHash: profile.deploymentProfileHash,
    deploymentGeometryProfileHash: profile.geometryHash,
    draftBindingHash: draftBinding.bindingHash,
    participantIds: clone(draftBinding.participantIds),
    colourByPlayer: clone(draftBinding.colourByPlayer),
    battlefield: clone(profile.battlefield),
    coordinateSystem: clone(profile.coordinateSystem),
    entryEdgesByPlayer: { [playerByColour.red]: clone(profile.entryEdgesByColour.red),
      [playerByColour.blue]: clone(profile.entryEdgesByColour.blue) },
    markerTargets,
    viewportProjectionContract: clone(geometryBundle.viewportProjectionContract),
    setupSequence: profile.setupOrder.map((step, index) => ({ ordinal: index + 1,
      step, status: index < 3 ? "complete"
        : index === 3 ? "pending_ticket_11_slice_108" : "pending_terrain" })),
    geometryExecutionReady: true,
    entryEdgesAssigned: true,
    zoneOfInfluenceCornerMarkersMaterialized: true,
    missionMarkerCoordinatesReserved: true,
    missionMarkerPhysicalPlacementComplete: false,
    terrainHeightTierTiming: "game_start",
    terrainPlacementExecutionOwner: "ticket_11_slice_108",
    commandCenterRuleProseUsedForSetupOrder: false,
    sourceLockHash: geometryBundle.sourceLockHash,
    sourceSnapshotHash: geometryBundle.sourceSnapshotHash,
    normalizedDatasetHash: geometryBundle.normalizedDatasetHash,
    deploymentGeometryDataBundleHash: geometryBundle.bundleHash,
    productionRoomBindingEligible: false,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    rulesTruth: "official_selected_deployment_geometry_materialized",
    trainingTruth: false };
  return seal(body, "bindingHash");
}

export function verifyOfficialDeploymentGeometryBindingV1(binding,
  geometryBundle = null) {
  if (!object(binding) || binding.schema !== OFFICIAL_DEPLOYMENT_GEOMETRY_BINDING_SCHEMA
    || binding.bindingHash !== hashStarcraftTmgContract(without(binding, ["bindingHash"]))
    || binding.geometryExecutionReady !== true || binding.entryEdgesAssigned !== true
    || binding.zoneOfInfluenceCornerMarkersMaterialized !== true
    || binding.missionMarkerCoordinatesReserved !== true
    || binding.missionMarkerPhysicalPlacementComplete !== false
    || ![3, 5].includes(binding.markerTargets?.length)
    || binding.setupSequence?.length !== 5
    || binding.setupSequence.map((entry) => entry.step).join("|")
      !== "confirm_table_dimensions|assign_entry_edges|set_zone_of_influence_corner_markers|set_terrain|place_mission_markers"
    || binding.terrainHeightTierTiming !== "game_start"
    || binding.viewportProjectionContract?.uniformAxesRequired !== true
    || binding.viewportProjectionContract?.millimetresPerInch !== 25.4
    || binding.viewportProjectionContract?.devicePixelRatioAffectsRulesGeometry !== false
    || binding.productionRoomBindingEligible !== false
    || binding.sourceRefreshPerformed !== false
    || binding.repositoryFallbackUsed !== false || binding.trainingTruth !== false) {
    fail("DEPLOYMENT_GEOMETRY_BINDING_INVALID");
  }
  if (geometryBundle) {
    verifyOfficialDeploymentGeometryDataBundleV1(geometryBundle);
    const profile = getOfficialDeploymentGeometryProfileV1(geometryBundle,
      binding.deploymentRecordKey);
    if (binding.deploymentGeometryDataBundleHash !== geometryBundle.bundleHash
      || binding.deploymentGeometryProfileHash !== profile.geometryHash) {
      fail("DEPLOYMENT_GEOMETRY_BINDING_DATA_MISMATCH");
    }
  }
  return true;
}

function finitePositive(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) fail(code, String(value));
  return number;
}

export function createOfficialBattlefieldViewportProjectionV1(input = {}) {
  const binding = input.deploymentGeometryBinding;
  verifyOfficialDeploymentGeometryBindingV1(binding);
  const cssWidth = finitePositive(input.cssWidth,
    "DEPLOYMENT_GEOMETRY_VIEWPORT_WIDTH_INVALID");
  const cssHeight = finitePositive(input.cssHeight,
    "DEPLOYMENT_GEOMETRY_VIEWPORT_HEIGHT_INVALID");
  const devicePixelRatio = finitePositive(input.devicePixelRatio ?? 1,
    "DEPLOYMENT_GEOMETRY_VIEWPORT_DPR_INVALID");
  const zoom = finitePositive(input.zoom ?? 1,
    "DEPLOYMENT_GEOMETRY_VIEWPORT_ZOOM_INVALID");
  const panCssX = Number(input.panCssX ?? 0);
  const panCssY = Number(input.panCssY ?? 0);
  if (!Number.isFinite(panCssX) || !Number.isFinite(panCssY)) {
    fail("DEPLOYMENT_GEOMETRY_VIEWPORT_PAN_INVALID");
  }
  const fitCssPixelsPerInch = Math.min(
    cssWidth / binding.battlefield.widthInches,
    cssHeight / binding.battlefield.heightInches,
  );
  const cssPixelsPerInch = fitCssPixelsPerInch * zoom;
  const renderedWidthCss = binding.battlefield.widthInches * cssPixelsPerInch;
  const renderedHeightCss = binding.battlefield.heightInches * cssPixelsPerInch;
  const body = { schema: OFFICIAL_BATTLEFIELD_VIEWPORT_PROJECTION_SCHEMA,
    deploymentGeometryBindingHash: binding.bindingHash,
    viewport: { cssWidth, cssHeight, devicePixelRatio,
      backingWidth: cssWidth * devicePixelRatio,
      backingHeight: cssHeight * devicePixelRatio },
    camera: { zoom, panCssX, panCssY },
    fitCssPixelsPerInch, cssPixelsPerInch,
    xCssPixelsPerInch: cssPixelsPerInch,
    yCssPixelsPerInch: cssPixelsPerInch,
    renderedWidthCss, renderedHeightCss,
    offsetCssX: (cssWidth - renderedWidthCss) / 2 + panCssX,
    offsetCssY: (cssHeight - renderedHeightCss) / 2 + panCssY,
    worldOrigin: "bottom_left", viewportOrigin: "top_left", yAxisFlipped: true,
    physicalRulesGeometryInvariant: true,
    devicePixelRatioAffectsRulesGeometry: false,
    touchTargetAffectsRulesCollision: false,
    roundingApplied: false, trainingTruth: false };
  return seal(body, "projectionHash");
}

export function verifyOfficialBattlefieldViewportProjectionV1(projection,
  binding) {
  verifyOfficialDeploymentGeometryBindingV1(binding);
  if (!object(projection)
    || projection.schema !== OFFICIAL_BATTLEFIELD_VIEWPORT_PROJECTION_SCHEMA
    || projection.projectionHash !== hashStarcraftTmgContract(without(projection,
      ["projectionHash"]))
    || projection.deploymentGeometryBindingHash !== binding.bindingHash
    || projection.xCssPixelsPerInch !== projection.yCssPixelsPerInch
    || projection.cssPixelsPerInch <= 0 || projection.yAxisFlipped !== true
    || projection.physicalRulesGeometryInvariant !== true
    || projection.devicePixelRatioAffectsRulesGeometry !== false
    || projection.touchTargetAffectsRulesCollision !== false
    || projection.roundingApplied !== false || projection.trainingTruth !== false) {
    fail("DEPLOYMENT_GEOMETRY_VIEWPORT_PROJECTION_INVALID");
  }
  return true;
}

export function projectOfficialWorldCircleToViewportV1(input = {}) {
  const binding = input.deploymentGeometryBinding;
  const projection = input.viewportProjection;
  verifyOfficialBattlefieldViewportProjectionV1(projection, binding);
  const x = Number(input.x); const y = Number(input.y);
  const diameterMm = finitePositive(input.diameterMm,
    "DEPLOYMENT_GEOMETRY_TOKEN_DIAMETER_INVALID");
  if (!Number.isFinite(x) || !Number.isFinite(y)
    || x < 0 || y < 0 || x > binding.battlefield.widthInches
    || y > binding.battlefield.heightInches) {
    fail("DEPLOYMENT_GEOMETRY_WORLD_COORDINATE_INVALID");
  }
  const diameterInches = diameterMm / 25.4;
  return { xCss: projection.offsetCssX + x * projection.cssPixelsPerInch,
    yCss: projection.offsetCssY
      + (binding.battlefield.heightInches - y) * projection.cssPixelsPerInch,
    diameterCss: diameterInches * projection.cssPixelsPerInch,
    diameterInches, physicalDiameterMm: diameterMm,
    touchTargetDiameterCss: Math.max(diameterInches * projection.cssPixelsPerInch,
      Number(input.minimumTouchTargetCss ?? 0)),
    touchTargetAffectsRulesCollision: false, roundingApplied: false };
}

export function unprojectOfficialViewportPointV1(input = {}) {
  const binding = input.deploymentGeometryBinding;
  const projection = input.viewportProjection;
  verifyOfficialBattlefieldViewportProjectionV1(projection, binding);
  const xCss = Number(input.xCss); const yCss = Number(input.yCss);
  if (!Number.isFinite(xCss) || !Number.isFinite(yCss)) {
    fail("DEPLOYMENT_GEOMETRY_VIEWPORT_COORDINATE_INVALID");
  }
  return { x: (xCss - projection.offsetCssX) / projection.cssPixelsPerInch,
    y: binding.battlefield.heightInches
      - (yCss - projection.offsetCssY) / projection.cssPixelsPerInch,
    unit: "inch", roundingApplied: false };
}

function terrainPiece(value, battlefield) {
  const terrainPieceId = String(value?.terrainPieceId || "").trim();
  const heightTier = String(value?.heightTier || "").trim();
  const footprint = value?.footprint;
  if (!terrainPieceId || !HEIGHT_TIERS.has(heightTier) || !object(footprint)
    || ![footprint.xMin, footprint.xMax, footprint.yMin, footprint.yMax]
      .every(Number.isFinite)
    || footprint.xMin < 0 || footprint.yMin < 0
    || footprint.xMax <= footprint.xMin || footprint.yMax <= footprint.yMin
    || footprint.xMax > battlefield.widthInches
    || footprint.yMax > battlefield.heightInches
    || typeof value?.impassable !== "boolean") {
    fail("DEPLOYMENT_GEOMETRY_TERRAIN_PIECE_INVALID", terrainPieceId);
  }
  return { terrainPieceId, heightTier, footprint: clone(footprint),
    impassable: value.impassable, heightTierAssignedAt: "game_start" };
}

export function createOfficialTerrainHeightTierLedgerV1(input = {}) {
  const geometryBinding = input.deploymentGeometryBinding;
  verifyOfficialDeploymentGeometryBindingV1(geometryBinding);
  if (!Array.isArray(input.terrainPieces)) {
    fail("DEPLOYMENT_GEOMETRY_TERRAIN_PIECES_REQUIRED");
  }
  const pieces = input.terrainPieces.map((entry) => terrainPiece(entry,
    geometryBinding.battlefield)).sort((left, right) => (
    left.terrainPieceId.localeCompare(right.terrainPieceId)));
  if (new Set(pieces.map((entry) => entry.terrainPieceId)).size !== pieces.length) {
    fail("DEPLOYMENT_GEOMETRY_TERRAIN_PIECE_DUPLICATE");
  }
  const body = { schema: OFFICIAL_TERRAIN_HEIGHT_TIER_LEDGER_SCHEMA,
    deploymentGeometryBindingHash: geometryBinding.bindingHash,
    assignmentTiming: "game_start", everyTerrainPieceAssigned: true,
    terrainPieces: pieces, sourceRefreshPerformed: false,
    rulesTruth: "official_game_start_terrain_height_tiers", trainingTruth: false };
  return seal(body, "ledgerHash");
}

export function verifyOfficialTerrainHeightTierLedgerV1(ledger,
  geometryBinding) {
  verifyOfficialDeploymentGeometryBindingV1(geometryBinding);
  if (!object(ledger) || ledger.schema !== OFFICIAL_TERRAIN_HEIGHT_TIER_LEDGER_SCHEMA
    || ledger.ledgerHash !== hashStarcraftTmgContract(without(ledger, ["ledgerHash"]))
    || ledger.deploymentGeometryBindingHash !== geometryBinding.bindingHash
    || ledger.assignmentTiming !== "game_start"
    || ledger.everyTerrainPieceAssigned !== true
    || !Array.isArray(ledger.terrainPieces)
    || ledger.terrainPieces.some((entry) => (
      terrainPiece(entry, geometryBinding.battlefield).heightTierAssignedAt
        !== entry.heightTierAssignedAt))
    || ledger.sourceRefreshPerformed !== false || ledger.trainingTruth !== false) {
    fail("DEPLOYMENT_GEOMETRY_TERRAIN_LEDGER_INVALID");
  }
  return true;
}

function contains(footprint, coordinate) {
  return coordinate.x >= footprint.xMin && coordinate.x <= footprint.xMax
    && coordinate.y >= footprint.yMin && coordinate.y <= footprint.yMax;
}

export function finalizeOfficialMissionMarkerPlacementV1(input = {}) {
  const binding = input.deploymentGeometryBinding;
  const ledger = input.terrainHeightTierLedger;
  verifyOfficialDeploymentGeometryBindingV1(binding);
  verifyOfficialTerrainHeightTierLedgerV1(ledger, binding);
  const missionMarkers = binding.markerTargets.map((marker) => {
    const supports = ledger.terrainPieces.filter((piece) => (
      contains(piece.footprint, marker.coordinate)));
    if (supports.some((piece) => piece.impassable)) {
      fail("DEPLOYMENT_GEOMETRY_MISSION_MARKER_IMPASSABLE_OVERLAP",
        String(marker.number));
    }
    if (supports.length > 1) {
      fail("DEPLOYMENT_GEOMETRY_MISSION_MARKER_SUPPORT_AMBIGUOUS",
        String(marker.number));
    }
    const support = supports[0] || null;
    return { ...clone(marker), placementStatus: "placed",
      elevation: support?.heightTier || "ground_level",
      supportTerrainPieceId: support?.terrainPieceId || null,
      impassableOverlap: false };
  });
  const body = { schema: OFFICIAL_MISSION_MARKER_PLACEMENT_SCHEMA,
    deploymentGeometryBindingHash: binding.bindingHash,
    terrainHeightTierLedgerHash: ledger.ledgerHash,
    missionMarkers, setupOrderSatisfied: true,
    allowedElevations: ["ground_level", "mid_ground", "high_ground"],
    impassableOverlapAllowed: false,
    rulesTruth: "official_mission_markers_placed_after_terrain", trainingTruth: false };
  return seal(body, "placementHash");
}

export function verifyOfficialMissionMarkerPlacementV1(placement, binding,
  ledger) {
  if (!object(placement) || placement.schema !== OFFICIAL_MISSION_MARKER_PLACEMENT_SCHEMA
    || placement.placementHash !== hashStarcraftTmgContract(without(placement,
      ["placementHash"]))
    || placement.deploymentGeometryBindingHash !== binding?.bindingHash
    || placement.terrainHeightTierLedgerHash !== ledger?.ledgerHash
    || placement.setupOrderSatisfied !== true
    || placement.missionMarkers?.some((entry) => entry.placementStatus !== "placed"
      || !HEIGHT_TIERS.has(entry.elevation) || entry.impassableOverlap !== false)
    || placement.trainingTruth !== false) {
    fail("DEPLOYMENT_GEOMETRY_MISSION_MARKER_PLACEMENT_INVALID");
  }
  return true;
}
