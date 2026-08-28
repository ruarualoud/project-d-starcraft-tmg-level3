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

export const OFFICIAL_STANDARD_MOVE_EXECUTOR_ID = "authority.standard-move-v1";
export const OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_STANDARD_MOVE_TRANSITION_SCHEMA = "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_STANDARD_MOVE_PARAMETER_KIND = "official_standard_move_path_v1";

export const OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:other-model-movement-legal-endpoint",
  "rule-atom:singleton:core-11-engaged-movement-restriction:70d579b9c6bf",
  "rule-atom:singleton:core-11-unengaged-move-requirement:6a23f693d71b",
  "rule-atom:singleton:core-12-3-move-summary:038e81b9f9bf",
  "rule-atom:singleton:core-4-1-movement-distance-routing:196678038e4e",
  "rule-atom:singleton:core-7-2-model-engaged:a526c82072e4",
  "rule-atom:singleton:core-7-2-movement-engagement-restriction:2d4db3bbb088",
  "rule-atom:singleton:core-8-5-2-move-action-definition:84ae6ed66cd4",
  "rule-atom:singleton:core-8-5-3-other-models-set-not-moved:2052753221d5",
  "rule-atom:singleton:core-8-5-3-pass-same-unit-models:5c652508feff",
].sort((left, right) => left.localeCompare(right)));

const SHARED_ATOM_IDS = Object.freeze([
  "rule-atom:model-wholly-within-definition",
  "rule-atom:movement-action-activation-marker",
  "rule-atom:movement-leading-model-endpoint-overlap-prohibition",
  "rule-atom:singleton:core-11-leading-model-nomination:869f0be0ca95",
  "rule-atom:singleton:core-11-stationary-movement-loss:2c62fc0668d0",
  "rule-atom:singleton:core-2-3-no-base-overlap:dd57d4bf866c",
  "rule-atom:singleton:core-4-3-leading-model-first:18d4566d2107",
  "rule-atom:singleton:core-4-3-leading-model-nomination:650263a6d526",
  "rule-atom:singleton:core-4-3-remaining-model-placement:7346d1071c54",
  "rule-atom:singleton:core-4-4-coherency-check-trigger:ceb8cf652a11",
  "rule-atom:singleton:core-4-4-coherency-link-path:3992d3a92cb6",
  "rule-atom:singleton:core-4-4-coherency-placement-sequence:4e3b224d5c25",
  "rule-atom:singleton:core-4-4-in-coherency:9dad4aa80ecf",
  "rule-atom:singleton:core-5-1-speed-split-value:d4978879073e",
  "rule-atom:singleton:core-5-1-speed:66515460b1ff",
  "rule-atom:singleton:core-5-6-battlefield-dimensions:de445cb44848",
  "rule-atom:singleton:core-8-5-3-actual-path-measurement:2bc171b429c1",
  "rule-atom:singleton:core-8-5-3-end-position-engagement:f3eb887db8e5",
  "rule-atom:singleton:core-8-5-3-end-position-on-battlefield:7f286534ba28",
  "rule-atom:singleton:core-8-5-3-leading-model-standard-move:a827da118f03",
  "rule-atom:singleton:core-8-5-3-other-model-path-blocking:3c7794dee282",
  "rule-atom:singleton:core-8-5-3-per-base-speed-cap:b24f8ff95582",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([...OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS, ...SHARED_ATOM_IDS]),
].sort((left, right) => left.localeCompare(right)));

const PATH_SCHEMA = "starcraft_tmg_official_standard_move_path_v1";
const PLAN_SCHEMA = "starcraft_tmg_official_standard_move_plan_v1";
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

function milli(value, code = "MOVE_MODEL_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}

function inches(value) {
  return Number((Number(value) / 1000).toFixed(3));
}

function safePoint(value, code, detail) {
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

function modelPoint(model, code = "MOVE_MODEL_GEOMETRY_INVALID") {
  return {
    xMilliInches: milli(model?.xInches, code, String(model?.id || "")),
    yMilliInches: milli(model?.yInches, code, String(model?.id || "")),
  };
}

function distance(left, right) {
  return Math.hypot(
    right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches,
  );
}

function pointEquals(left, right) {
  return left.xMilliInches === right.xMilliInches
    && left.yMilliInches === right.yMilliInches;
}

function collinear(a, b, c) {
  return (BigInt(b.xMilliInches - a.xMilliInches) * BigInt(c.yMilliInches - b.yMilliInches))
    === (BigInt(b.yMilliInches - a.yMilliInches) * BigInt(c.xMilliInches - b.xMilliInches));
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

function verifyRoundBase(model, onField) {
  if (!object(model)
    || !String(model.id || "").trim()
    || String(model.baseShape || "").toLowerCase() !== "round"
    || milli(model.baseWidthInches, "MOVE_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""))
      !== BASE_DIAMETER_MILLI_INCHES
    || milli(model.baseDepthInches, "MOVE_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""))
      !== BASE_DIAMETER_MILLI_INCHES
    || model.isDestroyed === true
    || (onField ? model.isOnField === false : model.isOnField === true)) {
    fail("MOVE_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
  if (onField) modelPoint(model);
}

function currentSupply(profile, currentModels, pieceId) {
  const tier = profile.squadProfile.find((row) => (
    row.minimumModels !== null
      && currentModels >= row.minimumModels
      && currentModels <= row.maximumModels
  ));
  if (!tier) fail("MOVE_UNIT_STATE_UNSUPPORTED", pieceId);
  return tier.supply;
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("MOVE_RUNTIME_BINDING_REQUIRED");
  return value;
}

function verifyBoard(state, data) {
  const expected = data.deploymentProfile.geometry.battlefield;
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
    fail("MOVE_GEOMETRY_SCOPE_UNSUPPORTED");
  }
}

function verifyPieceDenominator(state, data) {
  const profile = data.unitMovementProfile;
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
      || !Number.isSafeInteger(Number(piece.currentModels))
      || Number(piece.currentModels) < 1
      || !Array.isArray(piece.models)
      || piece.models.length !== Number(piece.currentModels)
      || !Array.isArray(piece.selectedUpgradeNames)
      || piece.selectedUpgradeNames.length !== 0
      || !Array.isArray(piece.statuses)
      || piece.statuses.some((status) => status !== "stationary")) {
      fail("MOVE_UNIT_DENOMINATOR_UNSUPPORTED", pieceId);
    }
    pieceIds.add(pieceId);
    for (const model of piece.models) {
      const modelId = String(model?.id || "").trim();
      if (!modelId || modelIds.has(modelId)) fail("MOVE_MODEL_ID_INVALID", modelId);
      modelIds.add(modelId);
      verifyRoundBase(model, piece.isOnField === true);
    }
  }
}

function phaseReady(state, sideKey) {
  if (state.phase !== "movement") fail("MOVE_WRONG_PHASE");
  if (sideKey !== state.activeSideKey) fail("MOVE_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.movement === true) fail("MOVE_SIDE_PASSED");
  const choice = state.phaseFirstActorByRound?.[`${state.round}:movement`];
  if (!object(choice)
    || choice.round !== Number(state.round)
    || choice.phase !== "movement"
    || !SIDE_KEYS.includes(choice.chosenFirstActorSideKey)) {
    fail("MOVE_MOVEMENT_INITIATIVE_UNRESOLVED");
  }
}

function activeRows(state) {
  return state.pieces.filter(active).flatMap((piece) => activeModels(piece).map((model) => ({
    sideKey: piece.sideKey,
    pieceId: piece.id,
    modelId: model.id,
    point: modelPoint(model),
    radius: BASE_RADIUS_MILLI_INCHES,
  })));
}

function pieceEngaged(state, piece) {
  const enemies = activeRows(state).filter((row) => row.sideKey !== piece.sideKey);
  return activeModels(piece).some((model) => {
    const point = modelPoint(model);
    return enemies.some((enemy) => (
      distance(point, enemy.point) - BASE_RADIUS_MILLI_INCHES - enemy.radius <= 1000
    ));
  });
}

function moveContext(state, sideKey, pieceId, options = {}) {
  if (!object(state)
    || !object(state.players)
    || !Array.isArray(state.pieces)
    || state.gameOver === true
    || state.terminal === true) {
    fail("MOVE_STATE_INVALID");
  }
  phaseReady(state, sideKey);
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  verifyOfficialMissionSetupBindingV1(state.officialMissionSetupBinding, gameplayDataBundle);
  const data = gameplayDataBundle.reserveDeployDataBundle;
  if (data?.schema !== OFFICIAL_RESERVE_DEPLOY_DATA_BUNDLE_SCHEMA) {
    fail("MOVE_DATA_BUNDLE_REQUIRED");
  }
  verifyOfficialReserveDeployDataBundleV1(data);
  if (!object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== options.matchBinding.dataSnapshotHash) {
    fail("MOVE_DATA_SNAPSHOT_MISMATCH");
  }
  const boundRuntimeHash = runtimeHash(options.matchBinding);
  verifyBoard(state, data);
  verifyPieceDenominator(state, data);
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
    fail("MOVE_START_OF_ROUND_HANDOFF_INVALID");
  }
  const piece = state.pieces.find((entry) => entry.id === pieceId && entry.sideKey === sideKey);
  if (!piece) fail("MOVE_UNIT_NOT_FOUND", pieceId);
  if (!live(piece) || piece.isOnField !== true) fail("MOVE_UNIT_NOT_ON_BATTLEFIELD", pieceId);
  if (piece.activatedPhases?.movement === true) fail("MOVE_ALREADY_ACTIVATED", pieceId);
  if (pieceEngaged(state, piece)) fail("MOVE_UNIT_ENGAGED", pieceId);
  const combatProfile = getOfficialCombatProfileV1(
    gameplayDataBundle.combatProfileBundle,
    OFFICIAL_RESERVE_DEPLOY_UNIT_RECORD_KEY,
  );
  const expectedSupply = currentSupply(combatProfile, Number(piece.currentModels), piece.id);
  if (Number(piece.currentSupply) !== expectedSupply) fail("MOVE_CURRENT_SUPPLY_MISMATCH", piece.id);
  return { sideKey, piece, gameplayDataBundle, data, boundRuntimeHash };
}

function diagnosticAction(state, sideKey, pieceId, error) {
  return {
    actionType: "move",
    sideKey,
    phase: "movement",
    pieceId,
    ruleAtomIds: [...OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: { rulesTruth: "official_standard_move_fail_closed", trainingTruth: false },
  };
}

function domainFor(state, context, matchBinding) {
  const modelIds = context.piece.models.map((model) => model.id).sort((a, b) => a.localeCompare(b));
  const maxSpeed = modelIds.length === 1
    ? context.data.unitMovementProfile.singleModelSpeedInches
    : context.data.unitMovementProfile.multiModelSpeedInches;
  const modelStartPoints = Object.fromEntries(context.piece.models.map((model) => [
    model.id,
    modelPoint(model),
  ]));
  const core = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_STANDARD_MOVE_PARAMETER_KIND,
    matchBindingHash: String(matchBinding?.bindingHash || ""),
    round: Number(state.round),
    phase: "movement",
    sideKey: context.sideKey,
    actionType: "move",
    pieceId: context.piece.id,
    executorId: OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["leadingModelId", "path", "placements"],
      pathUnit: "milli-inch",
      coordinateType: "safe_integer",
      maxCanonicalPathPoints: MAX_CANONICAL_PATH_POINTS,
      exactRemainingPlacementCount: modelIds.length - 1,
    },
    constraints: {
      modelIds,
      modelStartPoints,
      baseDiameterMilliInches: BASE_DIAMETER_MILLI_INCHES,
      battlefieldWidthMilliInches: 54000,
      battlefieldHeightMilliInches: 36000,
      maxDistanceMilliInches: maxSpeed * 1000,
      roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
      gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
      reserveDeployDataBundleHash: context.data.reserveDeployDataBundleHash,
      geometryScope: "gauntlet_round_base_ground_no_terrain_exact_standard_move_v1",
    },
    confirmationClass: "direct_gesture",
    rulesTruth: "official_gauntlet_marine_standard_move_parameter_domain",
    trainingTruth: false,
  };
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

export function enumerateOfficialStandardMoveV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  const pieces = Array.isArray(state?.pieces)
    ? state.pieces.filter((piece) => piece?.sideKey === sideKey && active(piece))
    : [];
  const parameterDomains = [];
  const candidates = [];
  for (const piece of pieces) {
    try {
      const context = moveContext(state, sideKey, piece.id, options);
      parameterDomains.push(domainFor(state, context, options.matchBinding));
    } catch (error) {
      if (options.includeDisabled === true) {
        candidates.push(diagnosticAction(state, sideKey, String(piece?.id || ""), error));
      }
    }
  }
  return { candidates, parameterDomains };
}

function canonicalPath(start, raw) {
  if (!Array.isArray(raw) || raw.length === 0) fail("MOVE_PATH_REQUIRED");
  if (raw.length > MAX_RAW_PATH_POINTS) fail("MOVE_PATH_TOO_COMPLEX");
  const normalized = [start];
  for (const [index, value] of raw.entries()) {
    const next = safePoint(value, "MOVE_PATH_POINT_INVALID", String(index));
    if (!pointEquals(normalized.at(-1), next)) normalized.push(next);
  }
  if (normalized.length < 2) fail("MOVE_PATH_MUST_CHANGE_POSITION");
  const points = [];
  for (const value of normalized) {
    while (points.length >= 2 && collinear(points.at(-2), points.at(-1), value)) points.pop();
    points.push(value);
  }
  if (points.length > MAX_CANONICAL_PATH_POINTS) fail("MOVE_PATH_TOO_COMPLEX");
  let distanceMilliInches = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceMilliInches += Math.round(distance(points[index - 1], points[index]));
  }
  return { schemaVersion: PATH_SCHEMA, unit: "milli-inch", points, distanceMilliInches };
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

function validateLeadingPath(state, domain, path) {
  if (path.distanceMilliInches > domain.constraints.maxDistanceMilliInches) {
    fail("MOVE_PATH_EXCEEDS_SPEED");
  }
  for (const point of path.points.slice(1)) battlefieldPoint(point, domain, "MOVE_PATH_OUTSIDE_BATTLEFIELD");
  const blockers = activeRows(state).filter((row) => row.pieceId !== domain.pieceId);
  for (let index = 1; index < path.points.length; index += 1) {
    for (const blocker of blockers) {
      if (pointToSegmentDistance(blocker.point, path.points[index - 1], path.points[index])
        < BASE_RADIUS_MILLI_INCHES + blocker.radius - 1) {
        fail("MOVE_PATH_COLLISION", blocker.modelId);
      }
    }
  }
}

function canonicalPlacements(domain, leadingModelId, input) {
  if (!Array.isArray(input) || input.length !== domain.constraints.modelIds.length - 1) {
    fail("MOVE_PLACEMENT_DENOMINATOR_INVALID");
  }
  const remaining = new Set(domain.constraints.modelIds.filter((id) => id !== leadingModelId));
  const rows = input.map((value, index) => {
    const modelId = String(value?.modelId || "").trim();
    if (!remaining.delete(modelId)) fail("MOVE_PLACEMENT_MODEL_INVALID", modelId || String(index));
    const point = safePoint(value, "MOVE_PLACEMENT_POINT_INVALID", modelId);
    battlefieldPoint(point, domain, "MOVE_PLACEMENT_OUTSIDE_BATTLEFIELD");
    return { modelId, ...point };
  });
  if (remaining.size !== 0) fail("MOVE_PLACEMENT_DENOMINATOR_INVALID");
  return rows;
}

function linkClear(start, end, blockers) {
  return blockers.every((blocker) => (
    pointToSegmentDistance(blocker.point, start, end) >= blocker.radius - 1
  ));
}

function validateCoherency(deployed, leadingModelId, blockers) {
  const leading = deployed.find((row) => row.modelId === leadingModelId);
  for (const model of deployed.filter((row) => row.modelId !== leadingModelId)) {
    if (distance(leading.point, model.point) > 3000) fail("MOVE_OUT_OF_COHERENCY", model.modelId);
  }
  const linked = new Set([leadingModelId]);
  while (linked.size < deployed.length) {
    const next = deployed.find((candidate) => !linked.has(candidate.modelId)
      && deployed.some((linkedModel) => linked.has(linkedModel.modelId)
        && linkClear(candidate.point, linkedModel.point, blockers)));
    if (!next) fail("MOVE_COHERENCY_LINK_BLOCKED");
    linked.add(next.modelId);
  }
}

function validateFinalPlacement(state, domain, leadingModelId, path, placements) {
  const endpoint = path.points.at(-1);
  const deployed = [
    { modelId: leadingModelId, point: endpoint },
    ...placements.map((row) => ({
      modelId: row.modelId,
      point: { xMilliInches: row.xMilliInches, yMilliInches: row.yMilliInches },
    })),
  ];
  for (let left = 0; left < deployed.length; left += 1) {
    for (let right = left + 1; right < deployed.length; right += 1) {
      if (distance(deployed[left].point, deployed[right].point)
        < domain.constraints.baseDiameterMilliInches - 1) {
        fail("MOVE_BASE_OVERLAP", `${deployed[left].modelId}/${deployed[right].modelId}`);
      }
    }
  }
  const blockers = activeRows(state).filter((row) => row.pieceId !== domain.pieceId);
  for (const model of deployed) {
    for (const blocker of blockers) {
      const edgeDistance = distance(model.point, blocker.point)
        - BASE_RADIUS_MILLI_INCHES - blocker.radius;
      if (edgeDistance < -1) fail("MOVE_BASE_OVERLAP", `${model.modelId}/${blocker.modelId}`);
      if (blocker.sideKey !== domain.sideKey && edgeDistance <= 1000) {
        fail("MOVE_ENEMY_ENGAGEMENT_RANGE", `${model.modelId}/${blocker.modelId}`);
      }
    }
  }
  validateCoherency(deployed, leadingModelId, blockers);
  return deployed;
}

function canonicalAction(domain, plan) {
  return {
    actionType: "move",
    sideKey: domain.sideKey,
    phase: "movement",
    pieceId: domain.pieceId,
    movePlan: clone(plan),
    ruleAtomIds: [...OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
  };
}

export function instantiateOfficialStandardMoveV1(state, domain, parameters, options = {}) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_STANDARD_MOVE_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_STANDARD_MOVE_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION) {
    fail("MOVE_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialStandardMoveV1(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const expected = current.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expected || !isDeepStrictEqual(domain, expected)) fail("MOVE_PARAMETER_DOMAIN_STALE");
  if (!object(parameters)
    || Object.keys(parameters).some((key) => !["leadingModelId", "path", "placements"].includes(key))) {
    fail("MOVE_PARAMETERS_INVALID");
  }
  const leadingModelId = String(parameters.leadingModelId || "").trim();
  if (!domain.constraints.modelIds.includes(leadingModelId)) fail("MOVE_LEADING_MODEL_INVALID");
  const path = canonicalPath(domain.constraints.modelStartPoints[leadingModelId], parameters.path);
  validateLeadingPath(state, domain, path);
  const placements = canonicalPlacements(domain, leadingModelId, parameters.placements);
  const deployed = validateFinalPlacement(state, domain, leadingModelId, path, placements);
  const planBody = {
    schemaVersion: PLAN_SCHEMA,
    pieceId: domain.pieceId,
    leadingModelId,
    canonicalPath: path,
    placementSequence: placements,
    finalModelPositions: deployed.map((row) => ({
      modelId: row.modelId,
      xMilliInches: row.point.xMilliInches,
      yMilliInches: row.point.yMilliInches,
    })),
    distanceTravelledInches: path.distanceMilliInches / 1000,
    speedAllowanceInches: domain.constraints.maxDistanceMilliInches / 1000,
    roundSupplyStateHashBefore: domain.constraints.roundSupplyStateHash,
    geometryScope: domain.constraints.geometryScope,
    trainingTruth: false,
  };
  const plan = { ...planBody, movePlanHash: hashStarcraftTmgContract(planBody) };
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: {
      leadingModelId,
      path: clone(path.points.slice(1)),
      placements: clone(placements),
    },
    action: canonicalAction(domain, plan),
    rulesTruth: "official_gauntlet_marine_standard_move_parameter_instantiation",
    trainingTruth: false,
  };
}

export function applyOfficialStandardMoveV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "move"
    || actionInput.executorId !== OFFICIAL_STANDARD_MOVE_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION
    || !object(actionInput.movePlan)) {
    fail("MOVE_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialStandardMoveV1(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => entry.pieceId === actionInput.pieceId);
  if (!domain) fail("MOVE_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialStandardMoveV1(stateInput, domain, {
    leadingModelId: actionInput.movePlan.leadingModelId,
    path: actionInput.movePlan.canonicalPath?.points?.slice(1),
    placements: actionInput.movePlan.placementSequence,
  }, options);
  if (!isDeepStrictEqual(actionInput, instantiated.action)) fail("MOVE_ACTION_STALE");
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const positions = new Map(actionInput.movePlan.finalModelPositions.map((row) => [row.modelId, row]));
  for (const model of piece.models) {
    const position = positions.get(model.id);
    model.xInches = inches(position.xMilliInches);
    model.yInches = inches(position.yMilliInches);
  }
  const leading = positions.get(actionInput.movePlan.leadingModelId);
  piece.xInches = inches(leading.xMilliInches);
  piece.yInches = inches(leading.yMilliInches);
  const stationaryRemoved = piece.statuses.includes("stationary");
  piece.statuses = piece.statuses.filter((status) => status !== "stationary");
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    movement: true,
  };
  piece.inCoherency = true;
  piece.lastLeadingModelId = actionInput.movePlan.leadingModelId;
  piece.lastMovePlanHash = actionInput.movePlan.movePlanHash;
  const previousSupplyHash = state.officialRoundSupplyState.roundSupplyStateHash;
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: state.officialGameplayDataBundle,
    rulesRuntimeHash: runtimeHash(options.matchBinding),
  });
  if (state.officialRoundSupplyState.roundSupplyStateHash !== previousSupplyHash) {
    fail("MOVE_SUPPLY_STATE_CHANGED");
  }
  const events = [{
    type: "unit_standard_moved",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    leadingModelId: actionInput.movePlan.leadingModelId,
    movePlanHash: actionInput.movePlan.movePlanHash,
    distanceTravelledInches: actionInput.movePlan.distanceTravelledInches,
    roundSupplyStateHash: previousSupplyHash,
    stationaryRemoved,
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
    schemaVersion: "starcraft_tmg_official_standard_move_transition_v1",
    executorId: OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: clone(actionInput),
    rulesTruth: "official_gauntlet_marine_standard_move_exact_subset",
    trainingTruth: false,
  };
}
