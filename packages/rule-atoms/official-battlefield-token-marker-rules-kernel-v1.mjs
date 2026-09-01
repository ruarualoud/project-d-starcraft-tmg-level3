import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialBattlefieldTokenMarkerRulesDataBundleV1 } from
  "../source-data/official-battlefield-token-marker-rules-data-bundle-v1.mjs";
import {
  projectOfficialWorldCircleToViewportV1,
  verifyOfficialBattlefieldViewportProjectionV1,
  verifyOfficialDeploymentGeometryBindingV1,
} from "./official-deployment-geometry-rules-kernel-v1.mjs";

export const OFFICIAL_BATTLEFIELD_TOKEN_MARKER_REGISTRY_SCHEMA =
  "starcraft_tmg_official_battlefield_token_marker_registry_v1";
export const OFFICIAL_BATTLEFIELD_TOKEN_SCHEMA =
  "starcraft_tmg_official_battlefield_token_v1";
export const OFFICIAL_BATTLEFIELD_MARKER_SCHEMA =
  "starcraft_tmg_official_battlefield_marker_v1";

const MARKER_KINDS = new Set([
  "activation", "faction_indicator", "first_player", "mode", "zone_of_influence",
]);
const SIDE_KEYS = new Set(["player1", "player2"]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) { return { ...body, [field]: hashStarcraftTmgContract(body) }; }
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function finite(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(code, String(value));
  return number;
}
function positive(value, code) {
  const number = finite(value, code);
  if (number <= 0) fail(code, String(value));
  return number;
}
function coordinate(value, battlefield, code, radiusInches = 0) {
  if (!object(value)) fail(code);
  const x = finite(value.x, code); const y = finite(value.y, code);
  if (x - radiusInches < 0 || y - radiusInches < 0
    || x + radiusInches > battlefield.widthInches
    || y + radiusInches > battlefield.heightInches) fail(code, `${x}:${y}`);
  return { x, y };
}
function verifyInputs(dataBundle, geometryBinding) {
  verifyOfficialBattlefieldTokenMarkerRulesDataBundleV1(dataBundle);
  verifyOfficialDeploymentGeometryBindingV1(geometryBinding);
  if (dataBundle.deploymentGeometryDataBundleHash
    !== geometryBinding.deploymentGeometryDataBundleHash) {
    fail("BATTLEFIELD_TOKEN_MARKER_GEOMETRY_BINDING_MISMATCH");
  }
}

function zoneMarkers(geometryBinding) {
  return Object.entries(geometryBinding.entryEdgesByPlayer)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([sideKey, entry]) => entry.zoneOfInfluenceCornerMarkers.map((point, index) => ({
      markerId: `zone-of-influence:${sideKey}:${index + 1}`,
      markerKind: "zone_of_influence", sideKey,
      coordinate: clone(point), shape: "l_corner",
      source: "selected_deployment_card_exact_geometry",
      physicalPresence: false, rulesFootprint: null,
      blocksLineOfSight: false, blocksMovement: false,
      cleanupDisposition: "remove", trainingTruth: false,
    })));
}

export function createOfficialBattlefieldTokenMarkerRegistryV1(input = {}) {
  const dataBundle = input.battlefieldTokenMarkerRulesDataBundle;
  const geometryBinding = input.deploymentGeometryBinding;
  verifyInputs(dataBundle, geometryBinding);
  const zones = zoneMarkers(geometryBinding);
  const body = { schema: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_REGISTRY_SCHEMA,
    dataBundleHash: dataBundle.bundleHash,
    deploymentGeometryBindingHash: geometryBinding.bindingHash,
    battlefield: clone(geometryBinding.battlefield),
    worldGeometry: { unit: "inch", millimetresPerInch: 25.4,
      uniformAxesRequired: true, roundingApplied: false },
    tokenContract: clone(dataBundle.tokenContract),
    markerContract: clone(dataBundle.markerContract),
    markerKinds: clone(dataBundle.markerKinds),
    cleanupContract: clone(dataBundle.cleanupContract),
    zoneOfInfluenceMarkers: zones,
    partialEntryEdgeMarkerCount: zones.length,
    fullEntryEdgesCreateNoCornerMarkers: true,
    firstPlayerMarkerAuthority: "state.firstPlayerSideKey",
    activationMarkerAuthority: "piece.activatedPhases",
    factionControlAuthority: "board.missionMarkers.controlSideKey",
    modeMarkerAuthority: "piece.statuses",
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    rulesTruth: "official_token_marker_registry_not_ui_geometry",
    trainingTruth: false };
  return seal(body, "registryHash");
}

export function verifyOfficialBattlefieldTokenMarkerRegistryV1(registry,
  dataBundle, geometryBinding) {
  verifyInputs(dataBundle, geometryBinding);
  const rebuilt = createOfficialBattlefieldTokenMarkerRegistryV1({
    battlefieldTokenMarkerRulesDataBundle: dataBundle,
    deploymentGeometryBinding: geometryBinding,
  });
  if (!object(registry)
    || registry.schema !== OFFICIAL_BATTLEFIELD_TOKEN_MARKER_REGISTRY_SCHEMA
    || registry.registryHash !== hashStarcraftTmgContract(without(registry,
      ["registryHash"]))
    || JSON.stringify(registry) !== JSON.stringify(rebuilt)) {
    fail("BATTLEFIELD_TOKEN_MARKER_REGISTRY_INVALID");
  }
  return true;
}

export function createOfficialBattlefieldTokenV1(input = {}) {
  const registry = input.registry;
  if (!object(registry)
    || registry.schema !== OFFICIAL_BATTLEFIELD_TOKEN_MARKER_REGISTRY_SCHEMA) {
    fail("BATTLEFIELD_TOKEN_REGISTRY_REQUIRED");
  }
  const baseDiameterMm = positive(input.baseDiameterMm,
    "BATTLEFIELD_TOKEN_BASE_DIAMETER_INVALID");
  const baseDiameterInches = baseDiameterMm / registry.worldGeometry.millimetresPerInch;
  const centre = coordinate(input.coordinate, registry.battlefield,
    "BATTLEFIELD_TOKEN_COORDINATE_INVALID", baseDiameterInches / 2);
  const tokenId = nonEmpty(input.tokenId, "BATTLEFIELD_TOKEN_ID_REQUIRED");
  const tokenKind = nonEmpty(input.tokenKind, "BATTLEFIELD_TOKEN_KIND_REQUIRED");
  const stayInPlay = input.stayInPlay === true;
  const body = { schema: OFFICIAL_BATTLEFIELD_TOKEN_SCHEMA,
    tokenId, tokenKind, coordinate: centre,
    baseDiameterMm, baseDiameterInches,
    terrainSize: 0, tangibleBattlefieldAsset: true, ownBase: true,
    modelsMayMoveThrough: true,
    modelsMayEndOverlappingByDefault: false,
    measurement: "closest_base_edge", stayInPlay,
    cleanupDisposition: stayInPlay ? "retain" : "remove",
    createdByPieceId: input.createdByPieceId
      ? nonEmpty(input.createdByPieceId, "BATTLEFIELD_TOKEN_CREATOR_INVALID") : null,
    createdRound: input.createdRound !== null && input.createdRound !== undefined
      && Number.isSafeInteger(Number(input.createdRound))
      ? Number(input.createdRound) : null,
    rulesFootprint: { shape: "circle", centre, diameterInches: baseDiameterInches },
    trainingTruth: false };
  return seal(body, "tokenHash");
}

export function verifyOfficialBattlefieldTokenV1(token, registry) {
  const rebuilt = createOfficialBattlefieldTokenV1({ registry,
    tokenId: token?.tokenId, tokenKind: token?.tokenKind,
    coordinate: token?.coordinate, baseDiameterMm: token?.baseDiameterMm,
    stayInPlay: token?.stayInPlay, createdByPieceId: token?.createdByPieceId,
    createdRound: token?.createdRound });
  if (!object(token) || token.tokenHash !== hashStarcraftTmgContract(without(token,
    ["tokenHash"])) || JSON.stringify(token) !== JSON.stringify(rebuilt)) {
    fail("BATTLEFIELD_TOKEN_INVALID", String(token?.tokenId || ""));
  }
  return true;
}

export function resolveOfficialTokenMovementOverlapV1(input = {}) {
  const registry = input.registry; const token = input.token;
  verifyOfficialBattlefieldTokenV1(token, registry);
  const modelDiameterMm = positive(input.modelBaseDiameterMm,
    "BATTLEFIELD_TOKEN_MODEL_BASE_DIAMETER_INVALID");
  const modelRadius = modelDiameterMm / registry.worldGeometry.millimetresPerInch / 2;
  const destination = coordinate(input.destination, registry.battlefield,
    "BATTLEFIELD_TOKEN_MODEL_DESTINATION_INVALID", modelRadius);
  const tokenRadius = token.baseDiameterInches / 2;
  const centreDistance = Math.hypot(destination.x - token.coordinate.x,
    destination.y - token.coordinate.y);
  const overlaps = centreDistance < modelRadius + tokenRadius;
  const explicitEndOverlapPermission = input.explicitEndOverlapPermission === true;
  return { schema: "starcraft_tmg_official_token_movement_overlap_resolution_v1",
    tokenId: token.tokenId, mayTraverseThroughToken: true,
    destinationOverlapsToken: overlaps,
    explicitEndOverlapPermission,
    mayEndAtDestination: !overlaps || explicitEndOverlapPermission,
    modelBaseDiameterMm: modelDiameterMm,
    tokenBaseDiameterMm: token.baseDiameterMm,
    centreDistanceInches: centreDistance,
    requiredNonOverlapDistanceInches: modelRadius + tokenRadius,
    rulesGeometryUnit: "inch", clientCollisionAccepted: false,
    trainingTruth: false };
}

export function measureOfficialClosestTokenBaseEdgeV1(input = {}) {
  const registry = input.registry; const token = input.token;
  verifyOfficialBattlefieldTokenV1(token, registry);
  const originBaseDiameterMm = positive(input.originBaseDiameterMm,
    "BATTLEFIELD_TOKEN_MEASUREMENT_ORIGIN_DIAMETER_INVALID");
  const originRadius = originBaseDiameterMm
    / registry.worldGeometry.millimetresPerInch / 2;
  const origin = coordinate(input.originCoordinate, registry.battlefield,
    "BATTLEFIELD_TOKEN_MEASUREMENT_ORIGIN_INVALID", originRadius);
  const centreDistance = Math.hypot(origin.x - token.coordinate.x,
    origin.y - token.coordinate.y);
  return { schema: "starcraft_tmg_official_token_edge_measurement_v1",
    tokenId: token.tokenId, measurement: "closest_base_edge",
    distanceInches: Math.max(0, centreDistance - originRadius
      - token.baseDiameterInches / 2),
    centreDistanceInches: centreDistance,
    originBaseDiameterMm, tokenBaseDiameterMm: token.baseDiameterMm,
    negativeDistancesClampedToZero: true, trainingTruth: false };
}

export function createOfficialBattlefieldMarkerV1(input = {}) {
  const registry = input.registry;
  if (!object(registry)
    || registry.schema !== OFFICIAL_BATTLEFIELD_TOKEN_MARKER_REGISTRY_SCHEMA) {
    fail("BATTLEFIELD_MARKER_REGISTRY_REQUIRED");
  }
  const markerKind = nonEmpty(input.markerKind, "BATTLEFIELD_MARKER_KIND_REQUIRED");
  if (!MARKER_KINDS.has(markerKind)) fail("BATTLEFIELD_MARKER_KIND_INVALID", markerKind);
  const coordinateValue = input.coordinate === undefined ? null
    : coordinate(input.coordinate, registry.battlefield,
      "BATTLEFIELD_MARKER_COORDINATE_INVALID");
  const markerRole = input.markerRole ? String(input.markerRole) : null;
  const stayInPlay = markerKind === "mode" || input.stayInPlay === true;
  const retainAtCleanup = stayInPlay
    || (markerKind === "faction_indicator" && markerRole === "mission_marker_control");
  const body = { schema: OFFICIAL_BATTLEFIELD_MARKER_SCHEMA,
    markerId: nonEmpty(input.markerId, "BATTLEFIELD_MARKER_ID_REQUIRED"),
    markerKind, markerRole, coordinate: coordinateValue,
    anchorId: input.anchorId ? String(input.anchorId) : null,
    face: input.face ? String(input.face) : null,
    sideKey: input.sideKey ? String(input.sideKey) : null,
    stayInPlay, physicalPresence: false, rulesFootprint: null,
    blocksLineOfSight: false, blocksMovement: false,
    cleanupDisposition: retainAtCleanup ? "retain" : "remove",
    visualIconMayHaveCssSize: true,
    visualSizeAffectsRulesGeometry: false, trainingTruth: false };
  return seal(body, "markerHash");
}

export function verifyOfficialBattlefieldMarkerV1(marker, registry) {
  const rebuilt = createOfficialBattlefieldMarkerV1({ registry,
    markerId: marker?.markerId, markerKind: marker?.markerKind,
    markerRole: marker?.markerRole, coordinate: marker?.coordinate ?? undefined,
    anchorId: marker?.anchorId, face: marker?.face, sideKey: marker?.sideKey,
    stayInPlay: marker?.stayInPlay });
  if (!object(marker) || marker.markerHash !== hashStarcraftTmgContract(without(marker,
    ["markerHash"])) || JSON.stringify(marker) !== JSON.stringify(rebuilt)) {
    fail("BATTLEFIELD_MARKER_INVALID", String(marker?.markerId || ""));
  }
  return true;
}

export function deriveOfficialBattlefieldMarkerViewsV1(input = {}) {
  const registry = input.registry;
  if (!object(registry)
    || registry.schema !== OFFICIAL_BATTLEFIELD_TOKEN_MARKER_REGISTRY_SCHEMA) {
    fail("BATTLEFIELD_MARKER_REGISTRY_REQUIRED");
  }
  const pieces = Array.isArray(input.pieces) ? input.pieces : [];
  const missionMarkers = Array.isArray(input.missionMarkers) ? input.missionMarkers : [];
  const firstPlayerSideKey = String(input.firstPlayerSideKey || "");
  if (!SIDE_KEYS.has(firstPlayerSideKey)) fail("FIRST_PLAYER_MARKER_HOLDER_INVALID");
  const activation = pieces.flatMap((piece) => {
    const phases = piece?.activatedPhases || {};
    const phase = phases.assault === true ? "assault"
      : phases.movement === true ? "movement" : null;
    if (!phase) return [];
    return [createOfficialBattlefieldMarkerV1({ registry,
      markerId: `activation:${piece.id}`, markerKind: "activation",
      markerRole: phase, anchorId: String(piece.id), sideKey: String(piece.sideKey || ""),
      face: phase === "movement" ? "arrow_up" : "reverse" })];
  });
  const factionIndicators = missionMarkers.flatMap((marker) => {
    if (!SIDE_KEYS.has(marker?.controlSideKey)) return [];
    return [createOfficialBattlefieldMarkerV1({ registry,
      markerId: `faction-control:mission-marker-${marker.number}`,
      markerKind: "faction_indicator", markerRole: "mission_marker_control",
      anchorId: `mission-marker-${marker.number}`,
      coordinate: marker.coordinate, sideKey: marker.controlSideKey })];
  });
  const modes = pieces.flatMap((piece) => (piece?.statuses || []).flatMap((status) => {
    const mode = String(status?.mode || status?.statusName || "").trim().toLowerCase();
    if (!["burrowed", "siege mode", "siege_mode"].includes(mode)) return [];
    return [createOfficialBattlefieldMarkerV1({ registry,
      markerId: `mode:${piece.id}:${mode.replaceAll(" ", "_")}`,
      markerKind: "mode", markerRole: mode.replaceAll(" ", "_"),
      anchorId: String(piece.id), sideKey: String(piece.sideKey || ""), stayInPlay: true })];
  }));
  const firstPlayer = createOfficialBattlefieldMarkerV1({ registry,
    markerId: "first-player", markerKind: "first_player",
    markerRole: "initiative_holder", sideKey: firstPlayerSideKey,
    anchorId: firstPlayerSideKey });
  const body = { schema: "starcraft_tmg_official_battlefield_marker_views_v1",
    registryHash: registry.registryHash,
    activationMarkers: activation,
    factionIndicators, modeMarkers: modes,
    zoneOfInfluenceMarkers: clone(registry.zoneOfInfluenceMarkers),
    firstPlayerMarker: firstPlayer,
    physicalRulesGeometryDerivedFromVisuals: false,
    rulesTruth: "marker_views_derived_from_authoritative_state",
    trainingTruth: false };
  return seal(body, "viewHash");
}

export function resolveOfficialTokenMarkerCleanupV1(input = {}) {
  const registry = input.registry;
  const tokens = Array.isArray(input.tokens) ? input.tokens : [];
  const markers = Array.isArray(input.markers) ? input.markers : [];
  tokens.forEach((entry) => verifyOfficialBattlefieldTokenV1(entry, registry));
  markers.forEach((entry) => verifyOfficialBattlefieldMarkerV1(entry, registry));
  const retainedTokens = tokens.filter((entry) => entry.cleanupDisposition === "retain");
  const retainedMarkers = markers.filter((entry) => entry.cleanupDisposition === "retain");
  const body = { schema: "starcraft_tmg_official_token_marker_cleanup_resolution_v1",
    registryHash: registry.registryHash,
    removedTokenIds: tokens.filter((entry) => entry.cleanupDisposition === "remove")
      .map((entry) => entry.tokenId).sort(),
    retainedTokenIds: retainedTokens.map((entry) => entry.tokenId).sort(),
    removedMarkerIds: markers.filter((entry) => entry.cleanupDisposition === "remove")
      .map((entry) => entry.markerId).sort(),
    retainedMarkerIds: retainedMarkers.map((entry) => entry.markerId).sort(),
    tokens: clone(retainedTokens), markers: clone(retainedMarkers),
    exceptions: clone(registry.cleanupContract.retained),
    clientCleanupClassificationAccepted: false, trainingTruth: false };
  return seal(body, "cleanupHash");
}

export function projectOfficialBattlefieldTokenV1(input = {}) {
  verifyOfficialBattlefieldTokenV1(input.token, input.registry);
  const projected = projectOfficialWorldCircleToViewportV1({
    deploymentGeometryBinding: input.deploymentGeometryBinding,
    viewportProjection: input.viewportProjection,
    x: input.token.coordinate.x, y: input.token.coordinate.y,
    diameterMm: input.token.baseDiameterMm,
    minimumTouchTargetCss: input.minimumTouchTargetCss ?? 0,
  });
  return { schema: "starcraft_tmg_official_battlefield_token_projection_v1",
    tokenId: input.token.tokenId, ...projected,
    worldGeometryHash: input.token.tokenHash,
    zoomPanAffectRulesGeometry: false,
    devicePixelRatioAffectsRulesGeometry: false, trainingTruth: false };
}

export function projectOfficialIntangibleMarkerV1(input = {}) {
  verifyOfficialBattlefieldMarkerV1(input.marker, input.registry);
  if (!input.marker.coordinate) fail("BATTLEFIELD_MARKER_COORDINATE_REQUIRED");
  verifyOfficialBattlefieldViewportProjectionV1(input.viewportProjection,
    input.deploymentGeometryBinding);
  const p = input.viewportProjection; const b = input.deploymentGeometryBinding;
  const visualIconDiameterCss = positive(input.visualIconDiameterCss,
    "BATTLEFIELD_MARKER_VISUAL_DIAMETER_INVALID");
  return { schema: "starcraft_tmg_official_intangible_marker_projection_v1",
    markerId: input.marker.markerId,
    xCss: p.offsetCssX + input.marker.coordinate.x * p.cssPixelsPerInch,
    yCss: p.offsetCssY + (b.battlefield.heightInches - input.marker.coordinate.y)
      * p.cssPixelsPerInch,
    visualIconDiameterCss, touchTargetDiameterCss: Math.max(visualIconDiameterCss,
      Number(input.minimumTouchTargetCss ?? 0)),
    rulesDiameterInches: 0, rulesFootprint: null,
    physicalPresence: false, blocksLineOfSight: false, blocksMovement: false,
    visualSizeAffectsRulesGeometry: false,
    devicePixelRatioAffectsRulesGeometry: false,
    zoomPanAffectRulesGeometry: false, trainingTruth: false };
}
