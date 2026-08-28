import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialCombatProfileV1,
  verifyOfficialCombatProfileBundleV1,
} from "../source-data/official-combat-profile-bundle-v1.mjs";

export const OFFICIAL_MISSION_MARKER_CONTROL_KERNEL_V1_SCHEMA =
  "starcraft_tmg_official_mission_marker_control_kernel_v1";
export const OFFICIAL_MISSION_MARKER_CONTROL_GEOMETRY_V1_SCHEMA =
  "starcraft_tmg_mission_marker_control_geometry_v1";

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const ELEVATIONS = new Set(["ground", "mid", "high"]);
const MARKER_DIAMETER_MILLIMETERS = 32;
const MARKER_RADIUS_MILLI_INCHES = Math.round((MARKER_DIAMETER_MILLIMETERS / 2 / 25.4) * 1000);
const CONTEST_RANGE_MILLI_INCHES = 3000;
const DISTANCE_TOLERANCE_MILLI_INCHES = 1;
const MAX_MISSION_MARKERS = 5;
const GEOMETRY_COMPLETENESS_FLAGS = Object.freeze([
  "markerCoordinatesComplete",
  "markerFootprintsComplete",
  "markerElevationsComplete",
  "lineOfSightTerrainComplete",
]);

export class OfficialMissionMarkerControlKernelV1Error extends Error {
  constructor(code, detail = "") {
    super(detail ? `${code}:${detail}` : code);
    this.name = "OfficialMissionMarkerControlKernelV1Error";
    this.code = code;
    this.detail = detail;
  }
}

function fail(code, detail = "") {
  throw new OfficialMissionMarkerControlKernelV1Error(code, detail);
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

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isDestroyed !== true && model?.isOnField === true
  ));
}

function point(value, code, detail) {
  return {
    xMilliInches: milli(value?.xInches, code, detail),
    yMilliInches: milli(value?.yInches, code, detail),
  };
}

function distance(left, right) {
  return Math.hypot(
    right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches,
  );
}

function roundRadius(model, detail) {
  const shape = String(model?.baseShape || "").trim().toLowerCase();
  const width = milli(model?.baseWidthInches, "MISSION_MARKER_MODEL_BASE_INVALID", detail);
  const depth = milli(model?.baseDepthInches, "MISSION_MARKER_MODEL_BASE_INVALID", detail);
  if (shape !== "round" || width <= 0 || Math.abs(width - depth) > 1) {
    fail("MISSION_MARKER_MODEL_BASE_SCOPE_UNSUPPORTED", detail);
  }
  return Math.round(width / 2);
}

function expectedSupply(profile, modelCount) {
  if (modelCount === 0) return 0;
  const tier = profile.squadProfile.find((entry) => (
    entry.minimumModels !== null
      && modelCount >= entry.minimumModels
      && modelCount <= entry.maximumModels
  ));
  if (!tier) fail("MISSION_MARKER_SUPPLY_TIER_UNRESOLVED", `${profile.recordKey}:${modelCount}`);
  return tier.supply;
}

function statusNames(piece) {
  return (piece?.statuses || []).map((entry) => String(
    typeof entry === "string" ? entry : entry?.status || entry?.name || entry?.id || "",
  ).trim().toLowerCase()).filter(Boolean);
}

function unitInCoherency(piece, models) {
  const status = piece?.coherencyStatus;
  if (!status) {
    if (models.length === 1) return true;
    fail("MISSION_MARKER_COHERENCY_STATUS_REQUIRED", piece.id);
  }
  if (status.schemaVersion !== "starcraft_tmg_unit_coherency_status_v1"
    || !["in_coherency", "out_of_coherency"].includes(status.status)
    || status.isOutOfCoherency !== (status.status === "out_of_coherency")) {
    fail("MISSION_MARKER_COHERENCY_STATUS_INVALID", piece.id);
  }
  return status.status === "in_coherency";
}

function verifyProfileBinding(state, matchBinding) {
  const bundle = state?.officialCombatProfileBundle;
  verifyOfficialCombatProfileBundleV1(bundle);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(bundle) !== matchBinding.dataSnapshotHash) {
    fail("MISSION_MARKER_DATA_SNAPSHOT_MISMATCH");
  }
  return bundle;
}

function validateGeometry(state) {
  const board = state?.board;
  const declaration = board?.missionMarkerControlGeometry;
  if (!object(board)
    || !object(declaration)
    || declaration.schemaVersion !== OFFICIAL_MISSION_MARKER_CONTROL_GEOMETRY_V1_SCHEMA
    || GEOMETRY_COMPLETENESS_FLAGS.some((flag) => declaration[flag] !== true)) {
    fail("MISSION_MARKER_GEOMETRY_INCOMPLETE");
  }
  const activeTerrain = (board.terrain || []).filter((entry) => (
    entry?.isRemoved !== true && entry?.isDestroyed !== true
  ));
  if (activeTerrain.length > 0) {
    fail("MISSION_MARKER_LINE_OF_SIGHT_TERRAIN_SCOPE_UNSUPPORTED");
  }
  const width = milli(board.widthInches, "MISSION_MARKER_BOARD_INVALID", "width");
  const height = milli(board.heightInches, "MISSION_MARKER_BOARD_INVALID", "height");
  if (width <= 0 || height <= 0) fail("MISSION_MARKER_BOARD_INVALID");
  if (!Array.isArray(board.missionMarkers)
    || board.missionMarkers.length === 0
    || board.missionMarkers.length > MAX_MISSION_MARKERS) {
    fail("MISSION_MARKER_DENOMINATOR_INVALID");
  }
  return { board, width, height };
}

function normalizeMarkers(board, width, height) {
  const ids = new Set();
  const numbers = new Set();
  return board.missionMarkers.map((marker) => {
    const id = String(marker?.id || "").trim();
    const number = Number(marker?.number);
    if (!id || ids.has(id) || !Number.isInteger(number) || number < 1 || number > 5
      || numbers.has(number)) {
      fail("MISSION_MARKER_IDENTITY_INVALID", id || String(number));
    }
    ids.add(id);
    numbers.add(number);
    if (Number(marker.diameterMillimeters) !== MARKER_DIAMETER_MILLIMETERS
      || typeof marker.isActivated !== "boolean") {
      fail("MISSION_MARKER_PHYSICAL_STATE_INVALID", id);
    }
    const elevation = String(marker.elevation || "").trim().toLowerCase();
    if (!ELEVATIONS.has(elevation)) fail("MISSION_MARKER_ELEVATION_INVALID", id);
    if (elevation !== "ground") fail("MISSION_MARKER_ELEVATION_SCOPE_UNSUPPORTED", id);
    const markerPoint = point(marker, "MISSION_MARKER_COORDINATE_INVALID", id);
    if (markerPoint.xMilliInches < MARKER_RADIUS_MILLI_INCHES
      || markerPoint.xMilliInches > width - MARKER_RADIUS_MILLI_INCHES
      || markerPoint.yMilliInches < MARKER_RADIUS_MILLI_INCHES
      || markerPoint.yMilliInches > height - MARKER_RADIUS_MILLI_INCHES) {
      fail("MISSION_MARKER_OUTSIDE_BATTLEFIELD", id);
    }
    const controlSideKey = marker.controlSideKey === null || marker.controlSideKey === undefined
      ? null
      : String(marker.controlSideKey);
    const factionIndicatorSideKey = marker.factionIndicatorSideKey === null
      || marker.factionIndicatorSideKey === undefined
      ? null
      : String(marker.factionIndicatorSideKey);
    if ((controlSideKey !== null && !SIDE_KEYS.includes(controlSideKey))
      || factionIndicatorSideKey !== controlSideKey) {
      fail("MISSION_MARKER_CONTROL_STATE_INVALID", id);
    }
    return {
      id,
      number,
      point: markerPoint,
      elevation,
      isActivated: marker.isActivated,
      previousControlSideKey: controlSideKey,
    };
  }).sort((left, right) => left.number - right.number || left.id.localeCompare(right.id));
}

function normalizeUnits(state, bundle, width, height) {
  const ids = new Set();
  const modelIds = new Set();
  return (state.pieces || []).map((piece) => {
    const id = String(piece?.id || "").trim();
    const sideKey = String(piece?.sideKey || "").trim();
    if (!id || ids.has(id) || !SIDE_KEYS.includes(sideKey)) {
      fail("MISSION_MARKER_UNIT_IDENTITY_INVALID", id);
    }
    ids.add(id);
    const modelCount = Number(piece.currentModels);
    if (!Number.isInteger(modelCount) || modelCount < 0) {
      fail("MISSION_MARKER_MODEL_COUNT_INVALID", id);
    }
    const profile = getOfficialCombatProfileV1(bundle, piece.officialUnitRecordKey);
    const officialSupply = expectedSupply(profile, modelCount);
    if (Number(piece.currentSupply) !== officialSupply) {
      fail("MISSION_MARKER_SUPPLY_STATE_MISMATCH", `${id}:${piece.currentSupply}:${officialSupply}`);
    }
    if (!activePiece(piece)) {
      return {
        id,
        sideKey,
        currentSupply: officialSupply,
        isOnBattlefield: false,
        inCoherency: false,
        prohibitedStatus: piece?.isDestroyed === true ? "destroyed" : "reserve",
        models: [],
      };
    }
    const models = activeModels(piece);
    if (models.length !== modelCount || models.length === 0) {
      fail("MISSION_MARKER_MODEL_COUNT_MISMATCH", id);
    }
    const combatTag = String(piece.combatTag || "").trim().toLowerCase();
    const prohibitedStatus = combatTag === "flying"
      ? "flying"
      : statusNames(piece).includes("burrowed")
        ? "burrowed"
        : null;
    const inCoherency = unitInCoherency(piece, models);
    return {
      id,
      sideKey,
      currentSupply: officialSupply,
      isOnBattlefield: true,
      inCoherency,
      prohibitedStatus,
      models: models.map((model) => {
        const modelId = String(model?.id || "").trim();
        if (!modelId || modelIds.has(modelId)) {
          fail("MISSION_MARKER_MODEL_ID_INVALID", modelId || id);
        }
        modelIds.add(modelId);
        const elevation = String(model.elevation || "").trim().toLowerCase();
        if (!ELEVATIONS.has(elevation)) fail("MISSION_MARKER_MODEL_ELEVATION_INVALID", modelId);
        if (elevation !== "ground") {
          fail("MISSION_MARKER_MODEL_ELEVATION_SCOPE_UNSUPPORTED", modelId);
        }
        if (!Array.isArray(model.supportTerrainIds) || model.supportTerrainIds.length !== 0) {
          fail("MISSION_MARKER_MODEL_SUPPORT_SCOPE_UNSUPPORTED", modelId);
        }
        const modelPoint = point(
          model,
          "MISSION_MARKER_MODEL_COORDINATE_INVALID",
          modelId,
        );
        const radiusMilliInches = roundRadius(model, modelId);
        if (modelPoint.xMilliInches < radiusMilliInches
          || modelPoint.xMilliInches > width - radiusMilliInches
          || modelPoint.yMilliInches < radiusMilliInches
          || modelPoint.yMilliInches > height - radiusMilliInches) {
          fail("MISSION_MARKER_MODEL_OUTSIDE_BATTLEFIELD", modelId);
        }
        return {
          id: modelId,
          point: modelPoint,
          radiusMilliInches,
          elevation,
        };
      }).sort((left, right) => left.id.localeCompare(right.id)),
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
}

function contestingEvidence(marker, unit) {
  if (!unit.isOnBattlefield) return { eligible: false, reason: "not_on_battlefield", modelIds: [] };
  if (!unit.inCoherency) return { eligible: false, reason: "out_of_coherency", modelIds: [] };
  if (unit.prohibitedStatus) return { eligible: false, reason: unit.prohibitedStatus, modelIds: [] };
  const modelIds = unit.models.filter((model) => (
    model.elevation === marker.elevation
      && distance(model.point, marker.point)
        - model.radiusMilliInches
        - MARKER_RADIUS_MILLI_INCHES
        <= CONTEST_RANGE_MILLI_INCHES + DISTANCE_TOLERANCE_MILLI_INCHES
  )).map((model) => model.id).sort((left, right) => left.localeCompare(right));
  return modelIds.length > 0
    ? { eligible: true, reason: null, modelIds }
    : { eligible: false, reason: "no_model_within_three_same_elevation_and_los", modelIds: [] };
}

function markerResolution(marker, units) {
  const contestingUnitsBySide = { player1: [], player2: [] };
  const ineligibleUnits = [];
  for (const unit of units) {
    const evidence = contestingEvidence(marker, unit);
    if (evidence.eligible) {
      contestingUnitsBySide[unit.sideKey].push({
        unitId: unit.id,
        currentSupply: unit.currentSupply,
        eligibleModelIds: evidence.modelIds,
      });
    } else {
      ineligibleUnits.push({ unitId: unit.id, sideKey: unit.sideKey, reason: evidence.reason });
    }
  }
  const supplyTotals = Object.fromEntries(SIDE_KEYS.map((sideKey) => [
    sideKey,
    contestingUnitsBySide[sideKey].reduce((total, entry) => total + entry.currentSupply, 0),
  ]));
  const sidesContesting = SIDE_KEYS.filter((sideKey) => contestingUnitsBySide[sideKey].length > 0);
  let nextControlSideKey = marker.previousControlSideKey;
  let result = "no_contest_sticky_control";
  if (sidesContesting.length === 1) {
    [nextControlSideKey] = sidesContesting;
    result = nextControlSideKey === marker.previousControlSideKey
      ? "sole_contestant_retains_control"
      : "sole_contestant_takes_control";
  } else if (sidesContesting.length === 2) {
    if (supplyTotals.player1 > supplyTotals.player2) nextControlSideKey = "player1";
    else if (supplyTotals.player2 > supplyTotals.player1) nextControlSideKey = "player2";
    else result = "tied_supply_no_transfer";
    if (supplyTotals.player1 !== supplyTotals.player2) {
      result = nextControlSideKey === marker.previousControlSideKey
        ? "higher_supply_retains_control"
        : "higher_supply_reclaims_control";
    }
  }
  return {
    markerId: marker.id,
    markerNumber: marker.number,
    isActivated: marker.isActivated,
    markerElevation: marker.elevation,
    markerLineOfSightEffectiveSize: 0,
    previousControlSideKey: marker.previousControlSideKey,
    nextControlSideKey,
    factionIndicatorSideKey: nextControlSideKey,
    controlChanged: nextControlSideKey !== marker.previousControlSideKey,
    result,
    supplyTotals,
    contestingUnitsBySide,
    ineligibleUnits,
  };
}

export function resolveOfficialMissionMarkerControlV1(input = {}) {
  const state = input.state;
  if (!object(state) || !Array.isArray(state.pieces) || state.phase !== "cleanup") {
    fail("MISSION_MARKER_CONTROL_STATE_INVALID");
  }
  const { board, width, height } = validateGeometry(state);
  const bundle = verifyProfileBinding(state, input.matchBinding);
  const markers = normalizeMarkers(board, width, height);
  const units = normalizeUnits(state, bundle, width, height);
  const markerResults = markers.map((marker) => markerResolution(marker, units));
  const body = {
    schemaVersion: OFFICIAL_MISSION_MARKER_CONTROL_KERNEL_V1_SCHEMA,
    round: Number(state.round || 1),
    phase: "cleanup",
    actingSideKey: String(state.firstPlayerSideKey || ""),
    officialDataSnapshotHash: input.matchBinding.dataSnapshotHash,
    geometryScope: "round_base_ground_no_active_terrain_exact_marker_control_v1",
    markerDiameterMillimeters: MARKER_DIAMETER_MILLIMETERS,
    markerRadiusMilliInches: MARKER_RADIUS_MILLI_INCHES,
    contestRangeMilliInches: CONTEST_RANGE_MILLI_INCHES,
    lineOfSightPolicy: "terrain_free_trace_is_visible_marker_effective_size_zero",
    markerResults,
    rulesTruth: "official_current_supply_coherency_eligibility_and_sticky_control_subset",
    trainingTruth: false,
  };
  return Object.freeze({
    ...body,
    controlResolutionHash: hashStarcraftTmgContract(body),
  });
}
