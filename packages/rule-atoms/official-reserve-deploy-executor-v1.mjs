import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialMissionSetupBindingV1 } from "../source-data/official-mission-setup-binding-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_DATA_BUNDLE_SCHEMA,
  OFFICIAL_RESERVE_DEPLOY_UNIT_RECORD_KEY,
  verifyOfficialReserveDeployDataBundleV1,
} from "../source-data/official-reserve-deploy-data-bundle-v1.mjs";
import {
  createOfficialRoundSupplyStateV1,
  verifyOfficialRoundSupplyStateV1,
} from "./official-round-supply-state-v1.mjs";

export const OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID = "authority.reserve-deploy-v1";
export const OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_RESERVE_DEPLOY_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_RESERVE_DEPLOY_PARAMETER_KIND = "official_reserve_deploy_path_v1";

export const OFFICIAL_RESERVE_DEPLOY_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:current-supply-value-definition",
  "rule-atom:deploy-action-coherency-requirement",
  "rule-atom:model-wholly-within-definition",
  "rule-atom:movement-action-activation-marker",
  "rule-atom:reserve-arrival-zone-of-influence-prohibition",
  "rule-atom:reserve-deployment-and-available-supply-formula",
  "rule-atom:reserve-deployment-available-supply-check",
  "rule-atom:singleton:core-11-entry-edge-definition:e1939f42d652",
  "rule-atom:singleton:core-11-entry-edge-reserve-deployment:4fcc890f1383",
  "rule-atom:singleton:core-11-leading-model-nomination:869f0be0ca95",
  "rule-atom:singleton:core-11-reserves-deploy-exit:c81fa9dfcb46",
  "rule-atom:singleton:core-11-stationary-movement-loss:2c62fc0668d0",
  "rule-atom:singleton:core-11-zone-of-influence-definition:207c972a4baf",
  "rule-atom:singleton:core-12-3-deploy-summary:b720cd643e53",
  "rule-atom:singleton:core-2-3-no-base-overlap:dd57d4bf866c",
  "rule-atom:singleton:core-4-3-remaining-model-placement:7346d1071c54",
  "rule-atom:singleton:core-5-1-speed-split-value:d4978879073e",
  "rule-atom:singleton:core-5-1-speed:66515460b1ff",
  "rule-atom:singleton:core-5-6-battlefield-dimensions:de445cb44848",
  "rule-atom:singleton:core-5-6-entry-edges:70393439beb3",
  "rule-atom:singleton:core-5-6-zone-of-influence:265f5a62e966",
  "rule-atom:singleton:core-8-3-supply-limited-deployment:22058e2a5bb2",
  "rule-atom:singleton:core-8-4-1-reserve-deploy-choice:58d55b9edd4a",
  "rule-atom:singleton:core-8-5-3-end-position-engagement:f3eb887db8e5",
  "rule-atom:singleton:core-8-5-3-per-base-speed-cap:b24f8ff95582",
  "rule-atom:singleton:core-8-5-5-deploy-definition:3a2e76760879",
  "rule-atom:singleton:core-8-5-5-deploy-supply-check:ff71223a89f5",
  "rule-atom:singleton:core-8-5-5-enemy-influence-endpoint:c57942fd8a0e",
  "rule-atom:singleton:core-8-5-5-entry-edge-movement:d165dd997a39",
  "rule-atom:singleton:core-8-5-5-leading-first-and-coherency:41dca8fd79b6",
].sort((left, right) => left.localeCompare(right)));

const SHARED_MOVEMENT_ATOM_IDS = Object.freeze([
  "rule-atom:movement-leading-model-endpoint-overlap-prohibition",
  "rule-atom:singleton:core-4-3-leading-model-first:18d4566d2107",
  "rule-atom:singleton:core-4-3-leading-model-nomination:650263a6d526",
  "rule-atom:singleton:core-4-4-coherency-check-trigger:ceb8cf652a11",
  "rule-atom:singleton:core-4-4-coherency-link-path:3992d3a92cb6",
  "rule-atom:singleton:core-4-4-coherency-placement-sequence:4e3b224d5c25",
  "rule-atom:singleton:core-4-4-in-coherency:9dad4aa80ecf",
  "rule-atom:singleton:core-8-5-3-actual-path-measurement:2bc171b429c1",
  "rule-atom:singleton:core-8-5-3-end-position-on-battlefield:7f286534ba28",
  "rule-atom:singleton:core-8-5-3-leading-model-standard-move:a827da118f03",
  "rule-atom:singleton:core-8-5-3-other-model-path-blocking:3c7794dee282",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_RESERVE_DEPLOY_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([...OFFICIAL_RESERVE_DEPLOY_NEW_ATOM_IDS, ...SHARED_MOVEMENT_ATOM_IDS]),
].sort((left, right) => left.localeCompare(right)));

const DEPLOY_PATH_SCHEMA = "starcraft_tmg_official_reserve_deploy_path_v1";
const DEPLOY_PLAN_SCHEMA = "starcraft_tmg_official_reserve_deploy_plan_v1";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const BASE_DIAMETER_MILLI_INCHES = Math.round((32 / 25.4) * 1000);
const BASE_RADIUS_MILLI_INCHES = Math.round(BASE_DIAMETER_MILLI_INCHES / 2);
const MAX_RAW_PATH_POINTS = 64;
const MAX_CANONICAL_PATH_POINTS = 32;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function live(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}

function active(piece) {
  return live(piece) && piece?.isOnField === true;
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}

function milli(value, code = "DEPLOY_MODEL_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}

function inches(value) {
  return Number((Number(value) / 1000).toFixed(3));
}

function safeMilliPoint(value, code, detail) {
  if (!object(value)
    || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) {
    fail(code, detail);
  }
  return {
    xMilliInches: Number(value.xMilliInches),
    yMilliInches: Number(value.yMilliInches),
  };
}

function pointEquals(left, right) {
  return left.xMilliInches === right.xMilliInches
    && left.yMilliInches === right.yMilliInches;
}

function collinear(a, b, c) {
  return (BigInt(b.xMilliInches - a.xMilliInches) * BigInt(c.yMilliInches - b.yMilliInches))
    === (BigInt(b.yMilliInches - a.yMilliInches) * BigInt(c.xMilliInches - b.xMilliInches));
}

function distance(left, right) {
  return Math.hypot(
    right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches,
  );
}

function pointToSegmentDistance(target, start, end) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  const lengthSquared = (dx * dx) + (dy * dy);
  if (lengthSquared === 0) return distance(target, start);
  const ratio = Math.max(0, Math.min(1, (
    ((target.xMilliInches - start.xMilliInches) * dx)
      + ((target.yMilliInches - start.yMilliInches) * dy)
  ) / lengthSquared));
  return Math.hypot(
    target.xMilliInches - (start.xMilliInches + (ratio * dx)),
    target.yMilliInches - (start.yMilliInches + (ratio * dy)),
  );
}

function modelPoint(model, code = "DEPLOY_MODEL_GEOMETRY_INVALID") {
  return {
    xMilliInches: milli(model?.xInches, code, String(model?.id || "")),
    yMilliInches: milli(model?.yInches, code, String(model?.id || "")),
  };
}

function verifyRoundBase(model, { reserve = false } = {}) {
  if (!object(model)
    || !String(model.id || "").trim()
    || String(model.baseShape || "").toLowerCase() !== "round"
    || milli(model.baseWidthInches, "DEPLOY_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""))
      !== BASE_DIAMETER_MILLI_INCHES
    || milli(model.baseDepthInches, "DEPLOY_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""))
      !== BASE_DIAMETER_MILLI_INCHES
    || model.isDestroyed === true
    || (reserve ? model.isOnField === true : model.isOnField === false)) {
    fail("DEPLOY_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
  if (!reserve) modelPoint(model);
}

function currentSupply(profile, currentModels, pieceId) {
  if (!Number.isSafeInteger(currentModels) || currentModels < 1) {
    fail("DEPLOY_UNIT_STATE_UNSUPPORTED", pieceId);
  }
  const tier = profile.squadProfile.find((row) => (
    row.minimumModels !== null
      && currentModels >= row.minimumModels
      && currentModels <= row.maximumModels
  ));
  if (!tier) fail("DEPLOY_UNIT_STATE_UNSUPPORTED", pieceId);
  return tier.supply;
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("DEPLOY_RUNTIME_BINDING_REQUIRED");
  return value;
}

function verifyBoard(state, reserveData) {
  const expected = reserveData.deploymentProfile.geometry.battlefield;
  if (!object(state.board)
    || Number(state.board.widthInches) !== expected.widthInches
    || Number(state.board.heightInches) !== expected.heightInches
    || !Array.isArray(state.board.terrain)
    || state.board.terrain.some((entry) => !entry?.isRemoved && !entry?.isDestroyed)
    || !Array.isArray(state.board.accessPoints)
    || state.board.accessPoints.length !== 0
    || !Array.isArray(state.board.tokens)
    || state.board.tokens.length !== 0
    || !Array.isArray(state.board.effectMarkers)
    || state.board.effectMarkers.length !== 0) {
    fail("DEPLOY_GEOMETRY_SCOPE_UNSUPPORTED");
  }
}

function verifyPieceDenominator(state, reserveData) {
  const profile = reserveData.unitMovementProfile;
  const pieceIds = new Set();
  const modelIds = new Set();
  for (const piece of state.pieces) {
    const pieceId = String(piece?.id || "").trim();
    if (!object(piece)
      || !pieceId
      || pieceIds.has(pieceId)
      || !SIDE_KEYS.includes(piece.sideKey)
      || piece.officialUnitRecordKey !== profile.recordKey
      || piece.sourceRecordHash !== profile.sourceRecordHash
      || !Array.isArray(piece.models)
      || piece.models.length !== Number(piece.currentModels || 0)
      || !Array.isArray(piece.selectedUpgradeNames)
      || piece.selectedUpgradeNames.length !== 0) {
      fail("DEPLOY_UNIT_DENOMINATOR_UNSUPPORTED", pieceId);
    }
    pieceIds.add(pieceId);
    for (const model of piece.models) {
      const modelId = String(model?.id || "").trim();
      if (!modelId || modelIds.has(modelId)) fail("DEPLOY_MODEL_ID_INVALID", modelId);
      modelIds.add(modelId);
      verifyRoundBase(model, { reserve: piece.isOnField !== true });
    }
  }
}

function phaseReady(state, sideKey) {
  if (state.phase !== "movement") fail("DEPLOY_WRONG_PHASE");
  if (sideKey !== state.activeSideKey) fail("DEPLOY_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.movement === true) fail("DEPLOY_SIDE_PASSED");
  const phaseChoice = state.phaseFirstActorByRound?.[`${state.round}:movement`];
  if (!object(phaseChoice)
    || phaseChoice.round !== Number(state.round)
    || phaseChoice.phase !== "movement"
    || !SIDE_KEYS.includes(phaseChoice.chosenFirstActorSideKey)) {
    fail("DEPLOY_MOVEMENT_INITIATIVE_UNRESOLVED");
  }
}

function deployContext(state, sideKey, pieceId, options = {}) {
  if (!object(state)
    || !object(state.players)
    || !Array.isArray(state.pieces)
    || state.gameOver === true
    || state.terminal === true) {
    fail("DEPLOY_STATE_INVALID");
  }
  phaseReady(state, sideKey);
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  verifyOfficialMissionSetupBindingV1(state.officialMissionSetupBinding, gameplayDataBundle);
  const reserveData = gameplayDataBundle.reserveDeployDataBundle;
  if (reserveData?.schema !== OFFICIAL_RESERVE_DEPLOY_DATA_BUNDLE_SCHEMA) {
    fail("DEPLOY_DATA_BUNDLE_REQUIRED");
  }
  verifyOfficialReserveDeployDataBundleV1(reserveData);
  if (!object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== options.matchBinding.dataSnapshotHash) {
    fail("DEPLOY_DATA_SNAPSHOT_MISMATCH");
  }
  const boundRuntimeHash = runtimeHash(options.matchBinding);
  verifyBoard(state, reserveData);
  verifyPieceDenominator(state, reserveData);
  verifyOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle,
    rulesRuntimeHash: boundRuntimeHash,
    roundSupplyState: state.officialRoundSupplyState,
  });
  const lastStart = state.startOfRoundHistory?.at(-1);
  if (!object(lastStart)
    || lastStart.round !== Number(state.round)
    || !HASH_PATTERN.test(String(lastStart.roundSupplyStateHash || ""))) {
    fail("DEPLOY_START_OF_ROUND_HANDOFF_INVALID");
  }
  const piece = state.pieces.find((entry) => entry.id === pieceId && entry.sideKey === sideKey);
  if (!piece) fail("DEPLOY_UNIT_NOT_FOUND", pieceId);
  if (!live(piece) || piece.isOnField === true) fail("DEPLOY_UNIT_NOT_IN_RESERVES", pieceId);
  if (piece.activatedPhases?.movement === true) fail("DEPLOY_ALREADY_ACTIVATED", pieceId);
  if (!isDeepStrictEqual(piece.statuses, ["stationary"])) {
    fail("DEPLOY_STATUS_SCOPE_UNSUPPORTED", pieceId);
  }
  const combatProfile = getOfficialCombatProfileV1(
    gameplayDataBundle.combatProfileBundle,
    OFFICIAL_RESERVE_DEPLOY_UNIT_RECORD_KEY,
  );
  const expectedSupply = currentSupply(combatProfile, Number(piece.currentModels), piece.id);
  if (Number(piece.currentSupply) !== expectedSupply) fail("DEPLOY_CURRENT_SUPPLY_MISMATCH", piece.id);
  const supply = state.officialRoundSupplyState;
  const available = supply.availableSupplyBySide[sideKey];
  if (supply.mode === "finite" && expectedSupply > available) {
    fail("DEPLOY_INSUFFICIENT_AVAILABLE_SUPPLY", piece.id);
  }
  const color = state.officialMissionSetupBinding.seatColorAssignment?.[sideKey];
  const entryEdge = reserveData.deploymentProfile.geometry.entryEdgesByColor?.[color];
  if (!entryEdge) fail("DEPLOY_ENTRY_EDGE_UNRESOLVED", sideKey);
  return {
    sideKey,
    piece,
    gameplayDataBundle,
    reserveData,
    boundRuntimeHash,
    color,
    entryEdge,
    expectedSupply,
  };
}

function diagnosticAction(state, sideKey, pieceId, error) {
  return {
    actionType: "deploy",
    sideKey,
    phase: "movement",
    pieceId,
    ruleAtomIds: [...OFFICIAL_RESERVE_DEPLOY_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_reserve_deploy_fail_closed",
      trainingTruth: false,
    },
  };
}

function domainFor(state, context, matchBinding) {
  const modelIds = context.piece.models.map((model) => model.id).sort((a, b) => a.localeCompare(b));
  const maxSpeed = modelIds.length === 1
    ? context.reserveData.unitMovementProfile.singleModelSpeedInches
    : context.reserveData.unitMovementProfile.multiModelSpeedInches;
  const core = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_RESERVE_DEPLOY_PARAMETER_KIND,
    matchBindingHash: String(matchBinding?.bindingHash || ""),
    round: Number(state.round),
    phase: "movement",
    sideKey: context.sideKey,
    actionType: "deploy",
    pieceId: context.piece.id,
    executorId: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_RESERVE_DEPLOY_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["leadingModelId", "entryAlongEdgeMilliInches", "path", "placements"],
      pathUnit: "milli-inch",
      coordinateType: "safe_integer",
      maxCanonicalPathPoints: MAX_CANONICAL_PATH_POINTS,
      exactRemainingPlacementCount: modelIds.length - 1,
    },
    constraints: {
      modelIds,
      baseDiameterMilliInches: BASE_DIAMETER_MILLI_INCHES,
      entryColor: context.color,
      entryEdge: clone(context.entryEdge),
      battlefieldWidthMilliInches: 54000,
      battlefieldHeightMilliInches: 36000,
      maxDistanceMilliInches: maxSpeed * 1000,
      availableSupply: state.officialRoundSupplyState.availableSupplyBySide[context.sideKey],
      currentSupply: context.expectedSupply,
      roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
      gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
      reserveDeployDataBundleHash:
        context.reserveData.reserveDeployDataBundleHash,
      geometryScope: "gauntlet_round_base_ground_no_terrain_exact_multi_model_deploy_v1",
    },
    confirmationClass: "explicit_human",
    rulesTruth: "official_gauntlet_marine_reserve_deploy_parameter_domain",
    trainingTruth: false,
  };
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

export function enumerateOfficialReserveDeployV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  const reservePieces = Array.isArray(state?.pieces)
    ? state.pieces.filter((piece) => piece?.sideKey === sideKey && piece?.isOnField !== true && live(piece))
    : [];
  const parameterDomains = [];
  const candidates = [];
  for (const piece of reservePieces) {
    try {
      const context = deployContext(state, sideKey, piece.id, options);
      parameterDomains.push(domainFor(state, context, options.matchBinding));
    } catch (error) {
      if (options.includeDisabled === true) {
        candidates.push(diagnosticAction(state, sideKey, String(piece?.id || ""), error));
      }
    }
  }
  return { candidates, parameterDomains };
}

function entryStart(domain, along) {
  const radius = Math.round(domain.constraints.baseDiameterMilliInches / 2);
  const edge = domain.constraints.entryEdge;
  if (!Number.isSafeInteger(along)
    || along < edge.minimumAlongEdgeMilliInches + radius
    || along > edge.maximumAlongEdgeMilliInches - radius) {
    fail("DEPLOY_ENTRY_POINT_INVALID");
  }
  if (edge.edge === "north" && edge.inwardAxis === "positive_y") {
    return { xMilliInches: along, yMilliInches: -radius };
  }
  if (edge.edge === "south" && edge.inwardAxis === "negative_y") {
    return {
      xMilliInches: along,
      yMilliInches: domain.constraints.battlefieldHeightMilliInches + radius,
    };
  }
  fail("DEPLOY_ENTRY_EDGE_SCOPE_UNSUPPORTED");
}

function canonicalPath(start, raw) {
  if (!Array.isArray(raw) || raw.length === 0) fail("DEPLOY_PATH_REQUIRED");
  if (raw.length > MAX_RAW_PATH_POINTS) fail("DEPLOY_PATH_TOO_COMPLEX");
  const normalized = [start];
  for (const [index, value] of raw.entries()) {
    const next = safeMilliPoint(value, "DEPLOY_PATH_POINT_INVALID", String(index));
    if (!pointEquals(normalized.at(-1), next)) normalized.push(next);
  }
  if (normalized.length < 2) fail("DEPLOY_PATH_MUST_MOVE");
  const points = [];
  for (const value of normalized) {
    while (points.length >= 2 && collinear(points.at(-2), points.at(-1), value)) points.pop();
    points.push(value);
  }
  if (points.length > MAX_CANONICAL_PATH_POINTS) fail("DEPLOY_PATH_TOO_COMPLEX");
  let distanceMilliInches = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceMilliInches += Math.round(distance(points[index - 1], points[index]));
  }
  return {
    schemaVersion: DEPLOY_PATH_SCHEMA,
    unit: "milli-inch",
    points,
    distanceMilliInches,
  };
}

function battlefieldPoint(point, domain, code) {
  const radius = Math.round(domain.constraints.baseDiameterMilliInches / 2);
  if (point.xMilliInches < radius
    || point.xMilliInches > domain.constraints.battlefieldWidthMilliInches - radius
    || point.yMilliInches < radius
    || point.yMilliInches > domain.constraints.battlefieldHeightMilliInches - radius) {
    fail(code);
  }
}

function activeModelRows(state) {
  return state.pieces.filter(active).flatMap((piece) => activeModels(piece).map((model) => ({
    sideKey: piece.sideKey,
    pieceId: piece.id,
    modelId: model.id,
    point: modelPoint(model),
    radius: BASE_RADIUS_MILLI_INCHES,
  })));
}

function validateLeadingPath(state, domain, path) {
  if (path.distanceMilliInches > domain.constraints.maxDistanceMilliInches) {
    fail("DEPLOY_PATH_EXCEEDS_SPEED");
  }
  for (const point of path.points.slice(1)) battlefieldPoint(point, domain, "DEPLOY_PATH_OUTSIDE_BATTLEFIELD");
  const others = activeModelRows(state);
  for (let index = 1; index < path.points.length; index += 1) {
    for (const other of others) {
      if (pointToSegmentDistance(other.point, path.points[index - 1], path.points[index])
        < BASE_RADIUS_MILLI_INCHES + other.radius - 1) {
        fail("DEPLOY_PATH_COLLISION", other.modelId);
      }
    }
  }
}

function canonicalPlacements(domain, leadingModelId, input) {
  if (!Array.isArray(input)
    || input.length !== domain.constraints.modelIds.length - 1) {
    fail("DEPLOY_PLACEMENT_DENOMINATOR_INVALID");
  }
  const remaining = new Set(domain.constraints.modelIds.filter((id) => id !== leadingModelId));
  const rows = input.map((value, index) => {
    const modelId = String(value?.modelId || "").trim();
    if (!remaining.delete(modelId)) fail("DEPLOY_PLACEMENT_MODEL_INVALID", modelId || String(index));
    const point = safeMilliPoint(value, "DEPLOY_PLACEMENT_POINT_INVALID", modelId);
    battlefieldPoint(point, domain, "DEPLOY_PLACEMENT_OUTSIDE_BATTLEFIELD");
    return { modelId, ...point };
  });
  if (remaining.size !== 0) fail("DEPLOY_PLACEMENT_DENOMINATOR_INVALID");
  return rows;
}

function opponentZoneViolation(domain, point) {
  const radius = Math.round(domain.constraints.baseDiameterMilliInches / 2);
  const depth = 6000;
  if (domain.constraints.entryColor === "red") {
    return point.yMilliInches + radius >= domain.constraints.battlefieldHeightMilliInches - depth;
  }
  if (domain.constraints.entryColor === "blue") return point.yMilliInches - radius <= depth;
  fail("DEPLOY_ENTRY_COLOR_UNSUPPORTED");
}

function validateFinalPlacement(state, domain, leadingModelId, path, placements) {
  const endpoint = path.points.at(-1);
  battlefieldPoint(endpoint, domain, "DEPLOY_ENDPOINT_OUTSIDE_BATTLEFIELD");
  const deployed = [
    { modelId: leadingModelId, point: endpoint },
    ...placements.map((row) => ({
      modelId: row.modelId,
      point: { xMilliInches: row.xMilliInches, yMilliInches: row.yMilliInches },
    })),
  ];
  for (let left = 0; left < deployed.length; left += 1) {
    if (opponentZoneViolation(domain, deployed[left].point)) {
      fail("DEPLOY_ENEMY_ZONE_OF_INFLUENCE", deployed[left].modelId);
    }
    for (let right = left + 1; right < deployed.length; right += 1) {
      if (distance(deployed[left].point, deployed[right].point)
        < domain.constraints.baseDiameterMilliInches - 1) {
        fail("DEPLOY_BASE_OVERLAP", `${deployed[left].modelId}/${deployed[right].modelId}`);
      }
    }
  }
  const activeRows = activeModelRows(state);
  for (const model of deployed) {
    for (const other of activeRows) {
      const edgeDistance = distance(model.point, other.point)
        - BASE_RADIUS_MILLI_INCHES - other.radius;
      if (edgeDistance < -1) fail("DEPLOY_BASE_OVERLAP", `${model.modelId}/${other.modelId}`);
      if (other.sideKey !== domain.sideKey && edgeDistance <= 1000) {
        fail("DEPLOY_ENEMY_ENGAGEMENT_RANGE", `${model.modelId}/${other.modelId}`);
      }
    }
  }
  for (const model of deployed.filter((row) => row.modelId !== leadingModelId)) {
    if (distance(endpoint, model.point) > 3000) {
      fail("DEPLOY_OUT_OF_COHERENCY", model.modelId);
    }
    for (const other of activeRows) {
      if (pointToSegmentDistance(other.point, endpoint, model.point) < other.radius - 1) {
        fail("DEPLOY_COHERENCY_LINK_BLOCKED", `${model.modelId}/${other.modelId}`);
      }
    }
  }
  return deployed;
}

function canonicalAction(domain, plan) {
  return {
    actionType: "deploy",
    sideKey: domain.sideKey,
    phase: "movement",
    pieceId: domain.pieceId,
    deployPlan: clone(plan),
    ruleAtomIds: [...OFFICIAL_RESERVE_DEPLOY_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION,
  };
}

export function instantiateOfficialReserveDeployV1(state, domain, parameters, options = {}) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_RESERVE_DEPLOY_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION) {
    fail("DEPLOY_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialReserveDeployV1(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const expected = current.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expected || !isDeepStrictEqual(domain, expected)) fail("DEPLOY_PARAMETER_DOMAIN_STALE");
  if (!object(parameters)
    || Object.keys(parameters).some((key) => ![
      "leadingModelId", "entryAlongEdgeMilliInches", "path", "placements",
    ].includes(key))) {
    fail("DEPLOY_PARAMETERS_INVALID");
  }
  const leadingModelId = String(parameters.leadingModelId || "").trim();
  if (!domain.constraints.modelIds.includes(leadingModelId)) fail("DEPLOY_LEADING_MODEL_INVALID");
  const along = Number(parameters.entryAlongEdgeMilliInches);
  const start = entryStart(domain, along);
  const path = canonicalPath(start, parameters.path);
  validateLeadingPath(state, domain, path);
  const placements = canonicalPlacements(domain, leadingModelId, parameters.placements);
  const deployed = validateFinalPlacement(state, domain, leadingModelId, path, placements);
  const planBody = {
    schemaVersion: DEPLOY_PLAN_SCHEMA,
    pieceId: domain.pieceId,
    leadingModelId,
    entryColor: domain.constraints.entryColor,
    entryEdge: clone(domain.constraints.entryEdge),
    entryAlongEdgeMilliInches: along,
    canonicalPath: path,
    placementSequence: placements,
    finalModelPositions: deployed.map((row) => ({
      modelId: row.modelId,
      xMilliInches: row.point.xMilliInches,
      yMilliInches: row.point.yMilliInches,
    })),
    distanceTravelledInches: path.distanceMilliInches / 1000,
    speedAllowanceInches: domain.constraints.maxDistanceMilliInches / 1000,
    currentSupply: domain.constraints.currentSupply,
    availableSupplyBefore: domain.constraints.availableSupply,
    roundSupplyStateHashBefore: domain.constraints.roundSupplyStateHash,
    geometryScope: domain.constraints.geometryScope,
    trainingTruth: false,
  };
  const plan = { ...planBody, deployPlanHash: hashStarcraftTmgContract(planBody) };
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: {
      leadingModelId,
      entryAlongEdgeMilliInches: along,
      path: clone(path.points.slice(1)),
      placements: clone(placements),
    },
    action: canonicalAction(domain, plan),
    rulesTruth: "official_gauntlet_marine_reserve_deploy_parameter_instantiation",
    trainingTruth: false,
  };
}

export function applyOfficialReserveDeployV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "deploy"
    || actionInput.executorId !== OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION
    || !object(actionInput.deployPlan)) {
    fail("DEPLOY_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialReserveDeployV1(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => entry.pieceId === actionInput.pieceId);
  if (!domain) fail("DEPLOY_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialReserveDeployV1(stateInput, domain, {
    leadingModelId: actionInput.deployPlan.leadingModelId,
    entryAlongEdgeMilliInches: actionInput.deployPlan.entryAlongEdgeMilliInches,
    path: actionInput.deployPlan.canonicalPath?.points?.slice(1),
    placements: actionInput.deployPlan.placementSequence,
  }, options);
  if (!isDeepStrictEqual(actionInput, instantiated.action)) fail("DEPLOY_ACTION_STALE");
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const positions = new Map(actionInput.deployPlan.finalModelPositions.map((row) => [row.modelId, row]));
  for (const model of piece.models) {
    const position = positions.get(model.id);
    model.xInches = inches(position.xMilliInches);
    model.yInches = inches(position.yMilliInches);
    model.isOnField = true;
  }
  const leading = positions.get(actionInput.deployPlan.leadingModelId);
  piece.xInches = inches(leading.xMilliInches);
  piece.yInches = inches(leading.yMilliInches);
  piece.isOnField = true;
  piece.statuses = piece.statuses.filter((status) => status !== "stationary");
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    movement: true,
  };
  piece.inCoherency = true;
  piece.lastLeadingModelId = actionInput.deployPlan.leadingModelId;
  piece.lastDeployPlanHash = actionInput.deployPlan.deployPlanHash;
  const previousSupplyHash = state.officialRoundSupplyState.roundSupplyStateHash;
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: state.officialGameplayDataBundle,
    rulesRuntimeHash: runtimeHash(options.matchBinding),
  });
  const events = [{
    type: "reserve_deployed",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    leadingModelId: actionInput.deployPlan.leadingModelId,
    deployPlanHash: actionInput.deployPlan.deployPlanHash,
    roundSupplyStateHashBefore: previousSupplyHash,
    roundSupplyStateHashAfter: state.officialRoundSupplyState.roundSupplyStateHash,
    currentSupply: piece.currentSupply,
    stationaryRemoved: true,
    movementActivated: true,
    inCoherency: true,
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round),
    phase: "movement",
    action: clone(actionInput),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_reserve_deploy_transition_v1",
    executorId: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: clone(actionInput),
    rulesTruth: "official_gauntlet_marine_reserve_deploy_exact_subset",
    trainingTruth: false,
  };
}
