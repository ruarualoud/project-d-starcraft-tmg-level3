import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_DATA_BUNDLE_SCHEMA,
  OFFICIAL_RESERVE_DEPLOY_UNIT_RECORD_KEY,
  verifyOfficialReserveDeployDataBundleV1,
} from "../source-data/official-reserve-deploy-data-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialMissionSetupBindingV1 } from
  "../source-data/official-mission-setup-binding-v1.mjs";
import { verifyOfficialRoundSupplyStateV1 } from "./official-round-supply-state-v1.mjs";

export const OFFICIAL_MARINE_CHARGE_EXECUTOR_ID = "authority.marine-charge-v1";
export const OFFICIAL_MARINE_CHARGE_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_MARINE_CHARGE_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MARINE_CHARGE_DECLARATION_PARAMETER_KIND =
  "official_marine_charge_declaration_v1";
export const OFFICIAL_MARINE_CHARGE_RESOLUTION_PARAMETER_KIND =
  "official_marine_charge_resolution_v1";
export const OFFICIAL_MARINE_CHARGE_ACTION_TYPE = "charge";
export const OFFICIAL_RESOLVE_MARINE_CHARGE_ACTION_TYPE = "resolve_charge";
export const OFFICIAL_MARINE_CHARGE_PENDING_SCHEMA =
  "starcraft_tmg_official_marine_charge_pending_v1";

export const OFFICIAL_MARINE_CHARGE_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:charge-endpoint-overlap-prohibition",
  "rule-atom:ground-only-charge-targets-and-flying-prohibition",
  "rule-atom:singleton:core-8-7-7-all-target-engagement-success:8d82d4c406ae",
  "rule-atom:singleton:core-8-7-7-charge-contact-position:3d74cc620710",
  "rule-atom:singleton:core-8-7-7-charge-definition:0fc44ce68b86",
  "rule-atom:singleton:core-8-7-7-charge-distance-success:33a633e8e7dc",
  "rule-atom:singleton:core-8-7-7-charge-leader-and-target-models:08ca6f69ad1f",
  "rule-atom:singleton:core-8-7-7-charge-no-line-of-sight:72322636aaba",
  "rule-atom:singleton:core-8-7-7-charge-path-measurement:a3b22b6e0565",
  "rule-atom:singleton:core-8-7-7-charge-placement-priority:e370e5fdd8d0",
  "rule-atom:singleton:core-8-7-7-charge-roll-distance:80bc9724427d",
  "rule-atom:singleton:core-8-7-7-charge-unit-coherency:ff266a65dcca",
  "rule-atom:singleton:core-8-7-7-declare-all-charge-targets:3d1774ef90fa",
  "rule-atom:singleton:core-8-7-7-execute-charge-leader-move:6e884814692b",
  "rule-atom:singleton:core-8-7-7-failed-charge-outcome:d2f12274baa8",
  "rule-atom:singleton:core-8-7-7-no-undeclared-end-engagement:1e9f813f4e99",
  "rule-atom:singleton:core-8-7-7-undeclared-enemy-success:3cbb8f80bb34",
].sort((left, right) => left.localeCompare(right)));

const SHARED_ATOM_IDS = Object.freeze([
  "rule-atom:assault-action-activation-marker",
  "rule-atom:engagement-range-horizontal-distance",
  "rule-atom:singleton:core-11-leading-model-nomination:869f0be0ca95",
  "rule-atom:singleton:core-11-unengaged-ground-condition:2e9dd1ba7f00",
  "rule-atom:singleton:core-2-3-no-base-overlap:dd57d4bf866c",
  "rule-atom:singleton:core-4-4-coherency-link-path:3992d3a92cb6",
  "rule-atom:singleton:core-4-4-in-coherency:9dad4aa80ecf",
  "rule-atom:singleton:core-5-1-speed-split-value:d4978879073e",
  "rule-atom:singleton:core-5-1-speed:66515460b1ff",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_MARINE_CHARGE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([...OFFICIAL_MARINE_CHARGE_NEW_ATOM_IDS, ...SHARED_ATOM_IDS]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_MARINE_CHARGE_EXECUTOR_ATOM_IDS =
  OFFICIAL_MARINE_CHARGE_ACTION_ATOM_IDS;

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const BASE_DIAMETER_MILLI_INCHES = Math.round((32 / 25.4) * 1000);
const BASE_RADIUS_MILLI_INCHES = Math.round(BASE_DIAMETER_MILLI_INCHES / 2);
const MAX_RAW_PATH_POINTS = 64;
const MAX_CANONICAL_PATH_POINTS = 32;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function active(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function activeModels(piece) {
  return (piece?.models || []).filter((entry) => (
    entry?.isOnField !== false && entry?.isDestroyed !== true
  ));
}

function milli(value, code = "CHARGE_MODEL_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}

function point(model) {
  return {
    xMilliInches: milli(model?.xInches, "CHARGE_MODEL_GEOMETRY_INVALID", model?.id),
    yMilliInches: milli(model?.yInches, "CHARGE_MODEL_GEOMETRY_INVALID", model?.id),
  };
}

function distance(left, right) {
  return Math.hypot(
    right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches,
  );
}

function safePoint(value, code, detail = "") {
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
  return (BigInt(b.xMilliInches - a.xMilliInches)
    * BigInt(c.yMilliInches - b.yMilliInches))
    === (BigInt(b.yMilliInches - a.yMilliInches)
      * BigInt(c.xMilliInches - b.xMilliInches));
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

function canonicalPath(start, raw) {
  if (!Array.isArray(raw) || raw.length === 0) fail("CHARGE_PATH_REQUIRED");
  if (raw.length > MAX_RAW_PATH_POINTS) fail("CHARGE_PATH_TOO_COMPLEX");
  const normalized = [start];
  for (const [index, entry] of raw.entries()) {
    const next = safePoint(entry, "CHARGE_PATH_POINT_INVALID", String(index));
    if (!pointEquals(normalized.at(-1), next)) normalized.push(next);
  }
  if (normalized.length < 2) fail("CHARGE_PATH_MUST_CHANGE_POSITION");
  const points = [];
  for (const entry of normalized) {
    while (points.length >= 2 && collinear(points.at(-2), points.at(-1), entry)) {
      points.pop();
    }
    points.push(entry);
  }
  if (points.length > MAX_CANONICAL_PATH_POINTS) fail("CHARGE_PATH_TOO_COMPLEX");
  let distanceMilliInches = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceMilliInches += Math.round(distance(points[index - 1], points[index]));
  }
  return {
    schemaVersion: "starcraft_tmg_official_marine_charge_path_v1",
    unit: "milli-inch",
    points,
    distanceMilliInches,
  };
}

function engaged(state, piece) {
  const enemies = state.pieces.filter((entry) => active(entry) && entry.sideKey !== piece.sideKey);
  return activeModels(piece).some((own) => enemies.some((enemy) => (
    activeModels(enemy).some((opponent) => (
      distance(point(own), point(opponent)) - BASE_DIAMETER_MILLI_INCHES <= 1000
    ))
  )));
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("CHARGE_RUNTIME_BINDING_REQUIRED");
  return value;
}

function verifyBoard(state) {
  if (!object(state.board)
    || Number(state.board.widthInches) !== 54
    || Number(state.board.heightInches) !== 36
    || !Array.isArray(state.board.terrain)
    || state.board.terrain.some((entry) => !entry?.isRemoved && !entry?.isDestroyed)
    || !Array.isArray(state.board.accessPoints)
    || state.board.accessPoints.length !== 0
    || !Array.isArray(state.board.tokens)
    || state.board.tokens.length !== 0
    || !Array.isArray(state.board.effectMarkers)
    || state.board.effectMarkers.length !== 0) {
    fail("CHARGE_GEOMETRY_SCOPE_UNSUPPORTED");
  }
}

function verifyPiece(piece, profile) {
  if (!object(piece)
    || !active(piece)
    || piece.officialUnitRecordKey !== OFFICIAL_RESERVE_DEPLOY_UNIT_RECORD_KEY
    || piece.sourceRecordHash !== profile.sourceRecordHash
    || !Array.isArray(piece.combatTags)
    || !piece.combatTags.includes("ground")
    || piece.combatTags.includes("flying")
    || !Array.isArray(piece.selectedUpgradeNames)
    || piece.selectedUpgradeNames.length !== 0
    || !Array.isArray(piece.statuses)
    || piece.statuses.some((status) => status !== "stationary")
    || activeModels(piece).length !== Number(piece.currentModels)
    || activeModels(piece).some((entry) => (
      entry.baseShape !== "round"
        || milli(entry.baseWidthInches) !== BASE_DIAMETER_MILLI_INCHES
        || milli(entry.baseDepthInches) !== BASE_DIAMETER_MILLI_INCHES
        || entry.elevation !== "ground"
    ))) {
    fail("CHARGE_UNIT_DENOMINATOR_UNSUPPORTED", String(piece?.id || ""));
  }
}

function phaseReady(state, sideKey) {
  if (state.phase !== "assault") fail("CHARGE_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("CHARGE_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.assault === true) fail("CHARGE_SIDE_PASSED");
  const choice = state.phaseFirstActorByRound?.[`${state.round}:assault`];
  if (!object(choice)
    || choice.round !== Number(state.round)
    || choice.phase !== "assault"
    || !["player1", "player2"].includes(choice.chosenFirstActorSideKey)) {
    fail("CHARGE_ASSAULT_INITIATIVE_UNRESOLVED");
  }
}

function context(state, sideKey, pieceId, options = {}) {
  if (!object(state) || !Array.isArray(state.pieces) || !object(state.players)) {
    fail("CHARGE_STATE_INVALID");
  }
  phaseReady(state, sideKey);
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  verifyOfficialMissionSetupBindingV1(state.officialMissionSetupBinding, gameplayDataBundle);
  const data = gameplayDataBundle.reserveDeployDataBundle;
  if (data?.schema !== OFFICIAL_RESERVE_DEPLOY_DATA_BUNDLE_SCHEMA) {
    fail("CHARGE_DATA_BUNDLE_REQUIRED");
  }
  verifyOfficialReserveDeployDataBundleV1(data);
  if (!object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== options.matchBinding.dataSnapshotHash) {
    fail("CHARGE_DATA_SNAPSHOT_MISMATCH");
  }
  const boundRuntimeHash = runtimeHash(options.matchBinding);
  verifyBoard(state);
  for (const entry of state.pieces.filter(active)) verifyPiece(entry, data.unitMovementProfile);
  verifyOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle,
    rulesRuntimeHash: boundRuntimeHash,
    roundSupplyState: state.officialRoundSupplyState,
  });
  const piece = state.pieces.find((entry) => entry.id === pieceId && entry.sideKey === sideKey);
  if (!piece) fail("CHARGE_UNIT_NOT_FOUND", pieceId);
  if (piece.activatedPhases?.assault === true) fail("CHARGE_ALREADY_ACTIVATED", pieceId);
  if (engaged(state, piece)) fail("CHARGE_UNIT_ENGAGED", pieceId);
  if (piece.disengageAssaultRestriction !== undefined) {
    fail("CHARGE_DISENGAGE_RESTRICTION_SCOPE_UNSUPPORTED", pieceId);
  }
  const targetPieces = state.pieces.filter((entry) => (
    active(entry) && entry.sideKey !== sideKey
  ));
  if (targetPieces.length === 0) fail("CHARGE_NO_GROUND_TARGETS");
  const speedInches = Number(piece.currentModels) === 1
    ? data.unitMovementProfile.singleModelSpeedInches
    : data.unitMovementProfile.multiModelSpeedInches;
  return { piece, targetPieces, speedInches, gameplayDataBundle, data };
}

function domainFor(state, sideKey, value, matchBinding) {
  const targetModelIdsByUnitId = Object.fromEntries(value.targetPieces.map((piece) => [
    piece.id,
    activeModels(piece).map((entry) => entry.id).sort(),
  ]));
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_MARINE_CHARGE_DECLARATION_PARAMETER_KIND,
    matchBindingHash: String(matchBinding?.bindingHash || ""),
    round: Number(state.round),
    phase: "assault",
    sideKey,
    actionType: OFFICIAL_MARINE_CHARGE_ACTION_TYPE,
    pieceId: value.piece.id,
    executorId: OFFICIAL_MARINE_CHARGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_CHARGE_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_MARINE_CHARGE_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["leadingModelId", "targets"],
      targetUnitCount: { minimum: 1, maximum: null },
      exactlyOneTargetModelPerUnit: true,
    },
    constraints: {
      modelIds: activeModels(value.piece).map((entry) => entry.id).sort(),
      speedInches: value.speedInches,
      eligibleTargetUnitIds: value.targetPieces.map((entry) => entry.id).sort(),
      targetModelIdsByUnitId,
      chargeDie: { count: 1, faces: 6 },
      lineOfSightRequired: false,
      groundOnly: true,
      targetCountMaximum: null,
      geometryScope: "gauntlet_round_base_ground_no_terrain_charge_v1",
      gameplayDataBundleHash: value.gameplayDataBundle.gameplayDataBundleHash,
      roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
    },
    confirmationClass: "direct_gesture",
    rulesTruth: "official_current_marine_charge_declaration_domain",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function pendingContext(state, options = {}) {
  const pending = state?.pendingAction;
  if (!object(pending)
    || pending.schema !== OFFICIAL_MARINE_CHARGE_PENDING_SCHEMA
    || pending.stage !== "select_charge_move_after_roll"
    || hashStarcraftTmgContract(without(pending, ["pendingHash"])) !== pending.pendingHash
    || pending.round !== Number(state.round)
    || pending.phase !== "assault"
    || pending.sideKey !== state.activeSideKey
    || !Number.isSafeInteger(pending.roll)
    || pending.roll < 1
    || pending.roll > 6
    || pending.chargeRollDistanceInches !== pending.speedInches + pending.roll
    || pending.trainingTruth !== false) {
    fail("CHARGE_PENDING_INVALID");
  }
  const value = context(state, pending.sideKey, pending.pieceId, options);
  const declarationDomain = domainFor(
    state,
    pending.sideKey,
    value,
    options.matchBinding,
  );
  if (declarationDomain.domainId !== pending.declarationDomainId
    || pending.speedInches !== value.speedInches) {
    fail("CHARGE_PENDING_STALE");
  }
  const targets = canonicalTargets((pending.chargePlan?.targets || []).map((entry) => ({
    unitId: entry.unitId,
    modelId: entry.modelId,
  })), declarationDomain);
  const plan = declarationPlan(
    state,
    declarationDomain,
    pending.chargePlan?.leadingModelId,
    targets,
  );
  if (!isDeepStrictEqual(plan, pending.chargePlan)
    || plan.chargePlanHash !== pending.chargePlanHash) {
    fail("CHARGE_PENDING_STALE");
  }
  return { pending, value, declarationDomain, targets, plan };
}

function resolutionDomainFor(state, current, matchBinding) {
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_MARINE_CHARGE_RESOLUTION_PARAMETER_KIND,
    matchBindingHash: String(matchBinding?.bindingHash || ""),
    round: Number(state.round),
    phase: "assault",
    sideKey: current.pending.sideKey,
    actionType: OFFICIAL_RESOLVE_MARINE_CHARGE_ACTION_TYPE,
    pieceId: current.pending.pieceId,
    executorId: OFFICIAL_MARINE_CHARGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_CHARGE_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_MARINE_CHARGE_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["path", "placements"],
      pathUnit: "milli-inch",
      coordinateType: "safe_integer",
      maxCanonicalPathPoints: 32,
      exactRemainingPlacementCount:
        current.declarationDomain.constraints.modelIds.length - 1,
    },
    constraints: {
      pendingHash: current.pending.pendingHash,
      chargePlanHash: current.pending.chargePlanHash,
      leadingModelId: current.plan.leadingModelId,
      modelIds: [...current.declarationDomain.constraints.modelIds],
      modelStartPoints: clone(current.plan.attackerModelStartPoints),
      targets: clone(current.plan.targets),
      declaredTargetUnitIds: current.targets.map((entry) => entry.unitId),
      declaredTargetModelIds: current.targets.map((entry) => entry.modelId),
      speedInches: current.pending.speedInches,
      chargeRoll: current.pending.roll,
      chargeRollDistanceInches: current.pending.chargeRollDistanceInches,
      maxDistanceMilliInches: current.pending.chargeRollDistanceInches * 1000,
      baseDiameterMilliInches: BASE_DIAMETER_MILLI_INCHES,
      battlefieldWidthMilliInches: 54_000,
      battlefieldHeightMilliInches: 36_000,
      lineOfSightRequired: false,
      allDeclaredTargetsMustBeEngaged: true,
      undeclaredEnemyEngagementProhibited: true,
      remainingModelPlacementPriority: ["base_to_base", "engagement", "coherency"],
      geometryScope: current.declarationDomain.constraints.geometryScope,
      gameplayDataBundleHash: current.value.gameplayDataBundle.gameplayDataBundleHash,
      roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
    },
    confirmationClass: "direct_gesture",
    rulesTruth: "official_current_marine_charge_post_roll_resolution_domain",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function battlefieldPoint(value, domain, code) {
  const radius = Math.round(domain.constraints.baseDiameterMilliInches / 2);
  if (value.xMilliInches < radius
    || value.xMilliInches > domain.constraints.battlefieldWidthMilliInches - radius
    || value.yMilliInches < radius
    || value.yMilliInches > domain.constraints.battlefieldHeightMilliInches - radius) {
    fail(code);
  }
}

function otherModelRows(state, ownPieceId) {
  return state.pieces.filter(active).flatMap((piece) => (
    piece.id === ownPieceId
      ? []
      : activeModels(piece).map((entry) => ({
          pieceId: piece.id,
          sideKey: piece.sideKey,
          modelId: entry.id,
          point: point(entry),
        }))
  ));
}

function validateChargePath(state, domain, pathValue) {
  const start = domain.constraints.modelStartPoints[domain.constraints.leadingModelId];
  const path = canonicalPath(start, pathValue);
  if (path.distanceMilliInches > domain.constraints.maxDistanceMilliInches) {
    fail("CHARGE_PATH_EXCEEDS_ROLL_DISTANCE");
  }
  for (const entry of path.points.slice(1)) {
    battlefieldPoint(entry, domain, "CHARGE_PATH_OUTSIDE_BATTLEFIELD");
  }
  const blockers = otherModelRows(state, domain.pieceId);
  for (let index = 1; index < path.points.length; index += 1) {
    for (const blocker of blockers) {
      if (pointToSegmentDistance(
        blocker.point,
        path.points[index - 1],
        path.points[index],
      ) < BASE_DIAMETER_MILLI_INCHES - 1) {
        fail("CHARGE_PATH_COLLISION", blocker.modelId);
      }
    }
  }
  return path;
}

function canonicalPlacements(domain, input) {
  const remaining = new Set(domain.constraints.modelIds.filter((entry) => (
    entry !== domain.constraints.leadingModelId
  )));
  if (!Array.isArray(input) || input.length !== remaining.size) {
    fail("CHARGE_PLACEMENT_DENOMINATOR_INVALID");
  }
  const rows = input.map((entry, index) => {
    const modelId = String(entry?.modelId || "").trim();
    if (!remaining.delete(modelId)) {
      fail("CHARGE_PLACEMENT_MODEL_INVALID", modelId || String(index));
    }
    const placed = safePoint(entry, "CHARGE_PLACEMENT_POINT_INVALID", modelId);
    battlefieldPoint(placed, domain, "CHARGE_PLACEMENT_OUTSIDE_BATTLEFIELD");
    return { modelId, ...placed };
  });
  if (remaining.size !== 0) fail("CHARGE_PLACEMENT_DENOMINATOR_INVALID");
  return rows;
}

function targetRows(state, domain) {
  const byUnit = new Map(state.pieces.map((entry) => [entry.id, entry]));
  return domain.constraints.targets.map((target) => {
    const piece = byUnit.get(target.unitId);
    const model = activeModels(piece).find((entry) => entry.id === target.modelId);
    if (!piece || !model) fail("CHARGE_TARGET_STALE", target.modelId);
    const observed = point(model);
    if (!pointEquals(observed, target.startPoint)) fail("CHARGE_TARGET_STALE", target.modelId);
    return { ...target, sideKey: piece.sideKey, point: observed };
  });
}

function edgeGap(left, right) {
  return distance(left, right) - BASE_DIAMETER_MILLI_INCHES;
}

function assertNoBaseOverlap(deployed, blockers) {
  for (let left = 0; left < deployed.length; left += 1) {
    for (let right = left + 1; right < deployed.length; right += 1) {
      if (distance(deployed[left].point, deployed[right].point)
        < BASE_DIAMETER_MILLI_INCHES - 1) {
        fail("CHARGE_BASE_OVERLAP", `${deployed[left].modelId}/${deployed[right].modelId}`);
      }
    }
  }
  for (const own of deployed) {
    for (const blocker of blockers) {
      if (edgeGap(own.point, blocker.point) < -1) {
        fail("CHARGE_BASE_OVERLAP", `${own.modelId}/${blocker.modelId}`);
      }
    }
  }
}

function validateLeadingContact(path, leading, targets) {
  const gaps = targets.map((target) => edgeGap(leading.point, target.point));
  if (gaps.some((gap) => gap < -1 || gap > 1001)) {
    fail("CHARGE_ALL_DECLARED_TARGETS_NOT_ENGAGED");
  }
  const allBaseToBase = gaps.every((gap) => Math.abs(gap) <= 2);
  if (!allBaseToBase
    && Math.abs(path.distanceMilliInches - path.maxDistanceMilliInches) > 1) {
    fail("CHARGE_CONTACT_POSITION_NOT_CLOSEST");
  }
  return { gaps, allBaseToBase };
}

function validateUndeclaredEnemyEngagement(deployed, blockers, targetModelIds, sideKey) {
  const undeclared = blockers.filter((entry) => (
    entry.sideKey !== sideKey && !targetModelIds.has(entry.modelId)
  ));
  for (const own of deployed) {
    for (const enemy of undeclared) {
      if (edgeGap(own.point, enemy.point) <= 1000) {
        fail("CHARGE_UNDECLARED_ENEMY_ENGAGEMENT", `${own.modelId}/${enemy.modelId}`);
      }
    }
  }
}

function validateRemainingPlacementPriority(deployed, leadingModelId, targets) {
  for (const own of deployed.filter((entry) => entry.modelId !== leadingModelId)) {
    if (!targets.some((target) => Math.abs(edgeGap(own.point, target.point)) <= 2)) {
      fail("CHARGE_PLACEMENT_PRIORITY_UNSUPPORTED", own.modelId);
    }
  }
}

function validateCoherency(deployed, leadingModelId, blockers, declaredTargetIds) {
  const leading = deployed.find((entry) => entry.modelId === leadingModelId);
  for (const own of deployed.filter((entry) => entry.modelId !== leadingModelId)) {
    if (distance(leading.point, own.point) > 3000) {
      fail("CHARGE_OUT_OF_COHERENCY", own.modelId);
    }
  }
  const linkBlockers = blockers.filter((entry) => !declaredTargetIds.has(entry.modelId));
  const linked = new Set([leadingModelId]);
  while (linked.size < deployed.length) {
    const next = deployed.find((candidate) => !linked.has(candidate.modelId)
      && deployed.some((source) => linked.has(source.modelId)
        && linkBlockers.every((blocker) => (
          pointToSegmentDistance(blocker.point, source.point, candidate.point)
            >= BASE_RADIUS_MILLI_INCHES - 1
        ))));
    if (!next) fail("CHARGE_COHERENCY_LINK_BLOCKED");
    linked.add(next.modelId);
  }
}

function instantiateChargeResolution(state, domain, parameters, options) {
  if (!object(parameters)
    || Object.keys(parameters).some((key) => !["path", "placements"].includes(key))) {
    fail("CHARGE_RESOLUTION_PARAMETERS_INVALID");
  }
  const current = pendingContext(state, options);
  const expectedDomain = resolutionDomainFor(state, current, options.matchBinding);
  if (!isDeepStrictEqual(domain, expectedDomain)) fail("CHARGE_RESOLUTION_DOMAIN_STALE");
  const path = validateChargePath(state, domain, parameters.path);
  path.maxDistanceMilliInches = domain.constraints.maxDistanceMilliInches;
  const placements = canonicalPlacements(domain, parameters.placements);
  const leadingPoint = path.points.at(-1);
  const deployed = [
    { modelId: domain.constraints.leadingModelId, point: leadingPoint },
    ...placements.map((entry) => ({
      modelId: entry.modelId,
      point: {
        xMilliInches: entry.xMilliInches,
        yMilliInches: entry.yMilliInches,
      },
    })),
  ];
  const targets = targetRows(state, domain);
  const blockers = otherModelRows(state, domain.pieceId);
  assertNoBaseOverlap(deployed, blockers);
  const leadingContact = validateLeadingContact(path, deployed[0], targets);
  const targetModelIds = new Set(targets.map((entry) => entry.modelId));
  validateUndeclaredEnemyEngagement(
    deployed,
    blockers,
    targetModelIds,
    domain.sideKey,
  );
  validateRemainingPlacementPriority(
    deployed,
    domain.constraints.leadingModelId,
    targets,
  );
  validateCoherency(
    deployed,
    domain.constraints.leadingModelId,
    blockers,
    targetModelIds,
  );
  const planBody = {
    schemaVersion: "starcraft_tmg_official_marine_charge_resolution_plan_v1",
    pendingHash: current.pending.pendingHash,
    declarationChargePlanHash: current.pending.chargePlanHash,
    sideKey: domain.sideKey,
    pieceId: domain.pieceId,
    leadingModelId: domain.constraints.leadingModelId,
    declaredTargetUnitIds: [...domain.constraints.declaredTargetUnitIds],
    declaredTargetModelIds: [...domain.constraints.declaredTargetModelIds],
    speedInches: domain.constraints.speedInches,
    chargeRoll: domain.constraints.chargeRoll,
    chargeRollDistanceInches: domain.constraints.chargeRollDistanceInches,
    canonicalPath: without(path, ["maxDistanceMilliInches"]),
    placementSequence: clone(placements),
    finalModelPositions: deployed.map((entry) => ({
      modelId: entry.modelId,
      xMilliInches: entry.point.xMilliInches,
      yMilliInches: entry.point.yMilliInches,
    })),
    allDeclaredTargetsEngaged: true,
    leadingBaseToBaseWithAllDeclaredTargets: leadingContact.allBaseToBase,
    undeclaredEnemyUnitsEngaged: 0,
    remainingPlacementPriority: "base_to_base_where_physically_possible",
    inCoherency: true,
    lineOfSightUsed: false,
    trainingTruth: false,
  };
  const chargePlan = {
    ...planBody,
    chargePlanHash: hashStarcraftTmgContract(planBody),
  };
  return {
    action: {
      actionType: OFFICIAL_RESOLVE_MARINE_CHARGE_ACTION_TYPE,
      sideKey: domain.sideKey,
      phase: "assault",
      pieceId: domain.pieceId,
      ruleAtomIds: [...OFFICIAL_MARINE_CHARGE_ACTION_ATOM_IDS],
      executorId: OFFICIAL_MARINE_CHARGE_EXECUTOR_ID,
      executorVersion: OFFICIAL_MARINE_CHARGE_EXECUTOR_VERSION,
      chance: null,
      chargePlan,
      chargePlanHash: chargePlan.chargePlanHash,
      pendingHash: current.pending.pendingHash,
      domainId: domain.domainId,
      isEnabled: true,
      disabledReason: "",
      score: 1,
      details: { rulesTruth: "official_marine_charge_resolution", trainingTruth: false },
    },
    canonicalParameters: {
      path: clone(path.points.slice(1)),
      placements: clone(placements),
    },
  };
}

function diagnostic(sideKey, pieceId, error) {
  return {
    actionType: OFFICIAL_MARINE_CHARGE_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId,
    ruleAtomIds: [...OFFICIAL_MARINE_CHARGE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MARINE_CHARGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_CHARGE_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: { rulesTruth: "official_marine_charge_fail_closed", trainingTruth: false },
  };
}

export function enumerateOfficialMarineChargeV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  const candidates = [];
  const parameterDomains = [];
  if (isOfficialMarineChargePendingV1(state)) {
    if (state.pendingAction.sideKey !== sideKey) return { candidates, parameterDomains };
    try {
      const current = pendingContext(state, options);
      parameterDomains.push(resolutionDomainFor(state, current, options.matchBinding));
    } catch (error) {
      if (options.includeDisabled === true) {
        candidates.push(diagnostic(sideKey, state.pendingAction.pieceId, error));
      }
    }
    return { candidates, parameterDomains };
  }
  for (const piece of (state?.pieces || []).filter((entry) => (
    entry?.sideKey === sideKey && active(entry)
  ))) {
    try {
      const value = context(state, sideKey, piece.id, options);
      parameterDomains.push(domainFor(state, sideKey, value, options.matchBinding));
    } catch (error) {
      if (options.includeDisabled === true) candidates.push(diagnostic(sideKey, piece.id, error));
    }
  }
  return { candidates, parameterDomains };
}

function canonicalTargets(value, domain) {
  if (!Array.isArray(value) || value.length === 0) {
    fail("CHARGE_TARGETS_REQUIRED");
  }
  const eligibleUnits = new Set(domain.constraints.eligibleTargetUnitIds);
  const observedUnits = new Set();
  const targets = value.map((entry, index) => {
    if (!object(entry) || Object.keys(entry).some((key) => !["unitId", "modelId"].includes(key))) {
      fail("CHARGE_TARGET_INVALID", String(index));
    }
    const unitId = String(entry.unitId || "").trim();
    const modelId = String(entry.modelId || "").trim();
    if (!eligibleUnits.has(unitId) || observedUnits.has(unitId)) {
      fail("CHARGE_TARGET_UNIT_INVALID", unitId || String(index));
    }
    if (!domain.constraints.targetModelIdsByUnitId?.[unitId]?.includes(modelId)) {
      fail("CHARGE_TARGET_MODEL_INVALID", modelId || String(index));
    }
    observedUnits.add(unitId);
    return { unitId, modelId };
  });
  return targets.sort((left, right) => (
    left.unitId.localeCompare(right.unitId) || left.modelId.localeCompare(right.modelId)
  ));
}

function declarationPlan(state, domain, leadingModelId, targets) {
  const piece = state.pieces.find((entry) => entry.id === domain.pieceId);
  const targetById = new Map(state.pieces.map((entry) => [entry.id, entry]));
  const body = {
    schemaVersion: "starcraft_tmg_official_marine_charge_declaration_plan_v1",
    round: Number(state.round),
    phase: "assault",
    sideKey: domain.sideKey,
    pieceId: domain.pieceId,
    leadingModelId,
    speedInches: domain.constraints.speedInches,
    lineOfSightRequired: false,
    groundOnly: true,
    targets: targets.map((target) => ({
      ...target,
      startPoint: point(
        activeModels(targetById.get(target.unitId)).find((entry) => entry.id === target.modelId),
      ),
    })),
    attackerModelStartPoints: Object.fromEntries(activeModels(piece).map((entry) => [
      entry.id,
      point(entry),
    ])),
    declaredBeforeChance: true,
    chargeRoll: { count: 1, faces: 6, addedTo: "current_unit_speed" },
    roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
    gameplayDataBundleHash: domain.constraints.gameplayDataBundleHash,
    geometryScope: domain.constraints.geometryScope,
  };
  return { ...body, chargePlanHash: hashStarcraftTmgContract(body) };
}

export function instantiateOfficialMarineChargeV1(state, domain, parameters, options = {}) {
  if (domain?.parameterKind === OFFICIAL_MARINE_CHARGE_RESOLUTION_PARAMETER_KIND) {
    return instantiateChargeResolution(state, domain, parameters, options);
  }
  if (!object(state)
    || !object(domain)
    || domain.parameterKind !== OFFICIAL_MARINE_CHARGE_DECLARATION_PARAMETER_KIND
    || !object(parameters)
    || Object.keys(parameters).some((key) => !["leadingModelId", "targets"].includes(key))) {
    fail("CHARGE_DECLARATION_PARAMETERS_INVALID");
  }
  const value = context(state, domain.sideKey, domain.pieceId, options);
  const expectedDomain = domainFor(state, domain.sideKey, value, options.matchBinding);
  if (!isDeepStrictEqual(domain, expectedDomain)) fail("CHARGE_PARAMETER_DOMAIN_STALE");
  const leadingModelId = String(parameters.leadingModelId || "").trim();
  if (!domain.constraints.modelIds.includes(leadingModelId)) {
    fail("CHARGE_LEADING_MODEL_INVALID", leadingModelId);
  }
  const targets = canonicalTargets(parameters.targets, domain);
  const chargePlan = declarationPlan(state, domain, leadingModelId, targets);
  const canonicalParameters = { leadingModelId, targets };
  return {
    action: {
      actionType: OFFICIAL_MARINE_CHARGE_ACTION_TYPE,
      sideKey: domain.sideKey,
      phase: "assault",
      pieceId: domain.pieceId,
      ruleAtomIds: [...OFFICIAL_MARINE_CHARGE_ACTION_ATOM_IDS],
      executorId: OFFICIAL_MARINE_CHARGE_EXECUTOR_ID,
      executorVersion: OFFICIAL_MARINE_CHARGE_EXECUTOR_VERSION,
      chance: {
        kind: "fixed_roll_sequence",
        faces: 6,
        count: 1,
        layout: { charge: 1 },
      },
      chargePlan,
      chargePlanHash: chargePlan.chargePlanHash,
      domainId: domain.domainId,
      isEnabled: true,
      disabledReason: "",
      score: 1,
      details: {
        rulesTruth: "official_marine_charge_declaration",
        trainingTruth: false,
      },
    },
    canonicalParameters,
  };
}

function chargeReveal(reveals) {
  if (!Array.isArray(reveals) || reveals.length !== 1) {
    fail("CHARGE_REVEAL_REQUIRED");
  }
  const reveal = reveals[0];
  const faces = object(reveal) ? Number(reveal.faces) : 6;
  const outcome = object(reveal) ? Number(reveal.outcome) : Number(reveal);
  if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
    fail("CHARGE_REVEAL_INVALID");
  }
  return outcome;
}

function actionPlanStillCurrent(state, action, options) {
  const value = context(state, action.sideKey, action.pieceId, options);
  const domain = domainFor(state, action.sideKey, value, options.matchBinding);
  if (action.domainId !== domain.domainId || !object(action.chargePlan)) {
    fail("CHARGE_ACTION_STALE");
  }
  const leadingModelId = String(action.chargePlan.leadingModelId || "");
  if (!domain.constraints.modelIds.includes(leadingModelId)) fail("CHARGE_ACTION_STALE");
  const targets = canonicalTargets((action.chargePlan.targets || []).map((entry) => ({
    unitId: entry.unitId,
    modelId: entry.modelId,
  })), domain);
  const expectedPlan = declarationPlan(state, domain, leadingModelId, targets);
  if (!isDeepStrictEqual(action.chargePlan, expectedPlan)
    || action.chargePlanHash !== expectedPlan.chargePlanHash) {
    fail("CHARGE_ACTION_STALE");
  }
  return { value, domain, targets, plan: expectedPlan };
}

function openChargePending(stateInput, action, current, roll, options) {
  const state = clone(stateInput);
  const body = {
    schema: OFFICIAL_MARINE_CHARGE_PENDING_SCHEMA,
    stage: "select_charge_move_after_roll",
    round: Number(state.round),
    phase: "assault",
    sideKey: action.sideKey,
    pieceId: action.pieceId,
    chargePlan: clone(current.plan),
    chargePlanHash: current.plan.chargePlanHash,
    roll,
    speedInches: current.value.speedInches,
    chargeRollDistanceInches: current.value.speedInches + roll,
    declarationDomainId: current.domain.domainId,
    openedAtRevision: Number(options.postRevision || 0),
    trainingTruth: false,
  };
  state.pendingAction = {
    ...body,
    pendingHash: hashStarcraftTmgContract(body),
  };
  const event = {
    type: "marine_charge_declared_and_rolled",
    sideKey: action.sideKey,
    pieceId: action.pieceId,
    leadingModelId: current.plan.leadingModelId,
    targetUnitIds: current.targets.map((entry) => entry.unitId),
    targetModelIds: current.targets.map((entry) => entry.modelId),
    chargeRoll: roll,
    speedInches: current.value.speedInches,
    chargeRollDistanceInches: current.value.speedInches + roll,
    pendingHash: state.pendingAction.pendingHash,
    trainingTruth: false,
  };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    type: "charge_declaration",
    round: Number(state.round),
    phase: "assault",
    sideKey: action.sideKey,
    pieceId: action.pieceId,
    action: clone(action),
    events: [clone(event)],
    trainingTruth: false,
  });
  return { state, event };
}

export function applyOfficialMarineChargeV1(stateInput, actionInput, options = {}) {
  if (!object(stateInput)
    || !object(actionInput)
    || actionInput.actionType !== OFFICIAL_MARINE_CHARGE_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_MARINE_CHARGE_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MARINE_CHARGE_EXECUTOR_VERSION
    || !isDeepStrictEqual(
      [...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_MARINE_CHARGE_ACTION_ATOM_IDS],
    )) {
    fail("CHARGE_ACTION_INVALID");
  }
  if (stateInput.pendingAction !== undefined && stateInput.pendingAction !== null) {
    fail("CHARGE_PENDING_ACTION_CONFLICT");
  }
  const current = actionPlanStillCurrent(stateInput, actionInput, options);
  const roll = chargeReveal(options.chanceReveals);
  const opened = openChargePending(stateInput, actionInput, current, roll, options);
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_marine_charge_transition_v1",
    executorId: OFFICIAL_MARINE_CHARGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_CHARGE_EXECUTOR_VERSION,
    state: opened.state,
    events: [opened.event],
    action: clone(actionInput),
    settlementRequired: false,
    rulesTruth: "official_marine_charge_declared_targets_then_hidden_roll",
    trainingTruth: false,
  };
}

export function isOfficialMarineChargePendingV1(state) {
  return state?.pendingAction?.schema === OFFICIAL_MARINE_CHARGE_PENDING_SCHEMA;
}
