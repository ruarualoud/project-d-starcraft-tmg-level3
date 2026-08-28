import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialCloseCombatAttackV1,
  enumerateOfficialCloseCombatAttackActionsV1,
  OFFICIAL_CLOSE_COMBAT_ATTACK_ACTION_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_ID,
  OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_VERSION,
  OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS,
} from "./official-close-combat-attack-executor-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from "./official-engagement-graph-v2.mjs";

export const OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ID = "authority.close-combat-attack-v2";
export const OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_CLOSE_RANKS_COMBAT_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_CLOSE_RANKS_PARAMETER_KIND =
  "official_close_ranks_single_model_path_v1";
export const OFFICIAL_CLOSE_RANKS_MAX_DISTANCE_MILLI_INCHES = 3000;

export const OFFICIAL_CLOSE_RANKS_COMBAT_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:movement-leading-model-endpoint-overlap-prohibition",
  "rule-atom:singleton:core-12-7-close-ranks-step:e2005f374783",
  "rule-atom:singleton:core-4-3-leading-model-first:18d4566d2107",
  "rule-atom:singleton:core-4-3-leading-model-nomination:650263a6d526",
  "rule-atom:singleton:core-4-4-coherency-check-trigger:ceb8cf652a11",
  "rule-atom:singleton:core-4-4-in-coherency:9dad4aa80ecf",
  "rule-atom:singleton:core-8-5-3-actual-path-measurement:2bc171b429c1",
  "rule-atom:singleton:core-8-5-3-end-position-on-battlefield:7f286534ba28",
  "rule-atom:singleton:core-8-5-3-leading-model-standard-move:a827da118f03",
  "rule-atom:singleton:core-8-5-3-other-model-path-blocking:3c7794dee282",
  "rule-atom:singleton:core-8-8-1-close-ranks-coherency:c431d134f89d",
  "rule-atom:singleton:core-8-8-1-close-ranks-leading-move:d88aca04a84f",
  "rule-atom:singleton:core-8-8-1-no-close-ranks-disengage:2a4c79a84ebe",
  "rule-atom:singleton:core-8-8-1-no-new-close-ranks-engagement:5b2fd048e038",
  "rule-atom:singleton:core-8-8-1-pinned-contact-models:33f5a1d7ec66",
].sort());

export const OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_NEW_ATOM_IDS,
    ...OFFICIAL_CLOSE_RANKS_COMBAT_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_CLOSE_COMBAT_ATTACK_ACTION_ATOM_IDS,
]);

export const OFFICIAL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_CLOSE_COMBAT_ATTACK_ACTION_ATOM_IDS,
    ...OFFICIAL_CLOSE_RANKS_COMBAT_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const SNAPSHOT_SCHEMA = "starcraft_tmg_combat_phase_start_engagement_snapshot_v1";
const PATH_SCHEMA = "starcraft_tmg_close_ranks_path_v1";
const PLAN_SCHEMA = "starcraft_tmg_close_ranks_plan_v1";
const MAX_RAW_PATH_POINTS = 4096;
const MAX_CANONICAL_PATH_POINTS = 1024;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function activePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}

function milli(value, code = "CLOSE_RANKS_MODEL_GEOMETRY_INVALID") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function inches(value) {
  return Number((Number(value) / 1000).toFixed(3));
}

function roundRadius(model) {
  const shape = String(model?.baseShape || "").toLowerCase();
  const width = milli(model?.baseWidthInches);
  const depth = milli(model?.baseDepthInches);
  if (shape !== "round" || width <= 0 || Math.abs(width - depth) > 1) {
    fail("CLOSE_RANKS_GEOMETRY_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
  return Math.round(width / 2);
}

function point(model) {
  return { xMilliInches: milli(model.xInches), yMilliInches: milli(model.yInches) };
}

function pointEquals(left, right) {
  return left.xMilliInches === right.xMilliInches
    && left.yMilliInches === right.yMilliInches;
}

function collinear(a, b, c) {
  return (BigInt(b.xMilliInches - a.xMilliInches) * BigInt(c.yMilliInches - b.yMilliInches))
    === (BigInt(b.yMilliInches - a.yMilliInches) * BigInt(c.xMilliInches - b.xMilliInches));
}

function canonicalPath(start, input = {}) {
  const raw = input.path || input.points;
  if (!Array.isArray(raw) || raw.length === 0) fail("CLOSE_RANKS_PATH_REQUIRED");
  if (raw.length > MAX_RAW_PATH_POINTS) fail("CLOSE_RANKS_PATH_TOO_COMPLEX");
  const normalized = [start];
  for (const [index, entry] of raw.entries()) {
    if (!object(entry)
      || !Number.isSafeInteger(Number(entry.xMilliInches))
      || !Number.isSafeInteger(Number(entry.yMilliInches))) {
      fail("CLOSE_RANKS_PATH_POINT_INVALID", String(index));
    }
    const next = {
      xMilliInches: Number(entry.xMilliInches),
      yMilliInches: Number(entry.yMilliInches),
    };
    if (!pointEquals(normalized.at(-1), next)) normalized.push(next);
  }
  if (normalized.length < 2) fail("CLOSE_RANKS_PATH_MUST_MOVE");
  const points = [];
  for (const entry of normalized) {
    while (points.length >= 2 && collinear(points.at(-2), points.at(-1), entry)) points.pop();
    points.push(entry);
  }
  if (points.length > MAX_CANONICAL_PATH_POINTS) fail("CLOSE_RANKS_PATH_TOO_COMPLEX");
  let distanceMilliInches = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceMilliInches += Math.round(Math.hypot(
      points[index].xMilliInches - points[index - 1].xMilliInches,
      points[index].yMilliInches - points[index - 1].yMilliInches,
    ));
  }
  if (distanceMilliInches > OFFICIAL_CLOSE_RANKS_MAX_DISTANCE_MILLI_INCHES) {
    fail("CLOSE_RANKS_PATH_TOO_LONG", "Close Ranks path exceeds 3 inches");
  }
  return {
    schemaVersion: PATH_SCHEMA,
    unit: "milli-inch",
    points,
    distanceMilliInches,
  };
}

function pointToSegmentDistance(target, start, end) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  const lengthSquared = (dx * dx) + (dy * dy);
  if (lengthSquared === 0) return Math.hypot(
    target.xMilliInches - start.xMilliInches,
    target.yMilliInches - start.yMilliInches,
  );
  const ratio = Math.max(0, Math.min(1, (
    ((target.xMilliInches - start.xMilliInches) * dx)
      + ((target.yMilliInches - start.yMilliInches) * dy)
  ) / lengthSquared));
  return Math.hypot(
    target.xMilliInches - (start.xMilliInches + (ratio * dx)),
    target.yMilliInches - (start.yMilliInches + (ratio * dy)),
  );
}

function modelEdgesFor(graph, unitId, modelId) {
  return graph.modelEdges.filter((edge) => (
    (edge.leftUnitId === unitId && edge.leftModelId === modelId)
      || (edge.rightUnitId === unitId && edge.rightModelId === modelId)
  ));
}

function enemyUnitIdsFor(graph, unitId) {
  return [...new Set(graph.modelEdges.flatMap((edge) => {
    if (edge.leftUnitId === unitId) return [edge.rightUnitId];
    if (edge.rightUnitId === unitId) return [edge.leftUnitId];
    return [];
  }))].sort((left, right) => left.localeCompare(right));
}

function modelEnemyUnitIdsFor(graph, unitId, modelId) {
  return [...new Set(modelEdgesFor(graph, unitId, modelId).map((edge) => (
    edge.leftUnitId === unitId ? edge.rightUnitId : edge.leftUnitId
  )))].sort((left, right) => left.localeCompare(right));
}

function snapshotBody(snapshot) {
  const { snapshotHash: _snapshotHash, ...body } = snapshot;
  return body;
}

function createPhaseStartSnapshot(state, graph) {
  const units = (state.pieces || []).filter(activePiece)
    .map((piece) => ({
      unitId: piece.id,
      enemyUnitIds: enemyUnitIdsFor(graph, piece.id),
      models: activeModels(piece).map((model) => ({
        modelId: model.id,
        enemyUnitIds: modelEnemyUnitIdsFor(graph, piece.id, model.id),
      })).sort((left, right) => left.modelId.localeCompare(right.modelId)),
    }))
    .sort((left, right) => left.unitId.localeCompare(right.unitId));
  const body = {
    schemaVersion: SNAPSHOT_SCHEMA,
    round: Number(state.round || 1),
    phase: "combat",
    engagementGraphHash: graph.graphHash,
    units,
    rulesSourceSnapshotId: graph.rulesSourceSnapshotId,
    rulesSourceContentHash: graph.rulesSourceContentHash,
    trainingTruth: false,
  };
  return { ...body, snapshotHash: hashStarcraftTmgContract(body) };
}

function verifyPhaseStartSnapshot(state, snapshot) {
  if (!object(snapshot)
    || snapshot.schemaVersion !== SNAPSHOT_SCHEMA
    || snapshot.phase !== "combat"
    || snapshot.round !== Number(state.round || 1)
    || hashStarcraftTmgContract(snapshotBody(snapshot)) !== snapshot.snapshotHash) {
    fail("CLOSE_RANKS_PHASE_START_SNAPSHOT_INVALID");
  }
  return snapshot;
}

function phaseStartSnapshotFor(state, graph) {
  if (state.combatPhaseStartEngagementSnapshot) {
    return verifyPhaseStartSnapshot(state, state.combatPhaseStartEngagementSnapshot);
  }
  if ((state.pieces || []).some((piece) => piece.activatedPhases?.combat === true)) {
    fail("CLOSE_RANKS_PHASE_START_SNAPSHOT_REQUIRED");
  }
  return createPhaseStartSnapshot(state, graph);
}

function unitSnapshot(snapshot, unitId) {
  const row = snapshot.units.find((entry) => entry.unitId === unitId);
  if (!row) fail("CLOSE_RANKS_PHASE_START_UNIT_MISSING", unitId);
  return row;
}

function basesTouch(left, right) {
  const distance = Math.hypot(
    milli(right.xInches) - milli(left.xInches),
    milli(right.yInches) - milli(left.yInches),
  );
  return Math.abs(distance - roundRadius(left) - roundRadius(right)) <= 1;
}

function rewriteBaseAction(baseAction, snapshotHash, mode = "decline", plan = undefined) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = clone(baseAction);
  return {
    ...action,
    closeRanksMode: mode,
    combatPhaseStartEngagementSnapshotHash: snapshotHash,
    ...(plan ? { closeRanksPlan: clone(plan) } : {}),
    ruleAtomIds: mode === "move"
      ? [...OFFICIAL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS]
      : [...OFFICIAL_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_VERSION,
  };
}

function baseV1Action(action) {
  const {
    closeRanksPlan: _closeRanksPlan,
    combatPhaseStartEngagementSnapshotHash: _snapshotHash,
    ...base
  } = clone(action);
  base.closeRanksMode = "decline";
  base.ruleAtomIds = [...OFFICIAL_CLOSE_COMBAT_ATTACK_ACTION_ATOM_IDS];
  base.executorId = OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_ID;
  base.executorVersion = OFFICIAL_CLOSE_COMBAT_ATTACK_EXECUTOR_VERSION;
  return base;
}

function closeRanksScope(state, action, graph, snapshot) {
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  const target = state.pieces.find((entry) => entry.id === action.targetId);
  if (!activePiece(piece) || !activePiece(target)) fail("CLOSE_RANKS_UNIT_UNAVAILABLE");
  const models = activeModels(piece);
  if (models.length !== 1) fail("CLOSE_RANKS_MULTI_MODEL_PLACEMENT_PENDING");
  const targetModels = activeModels(target);
  if (targetModels.length !== 1) fail("CLOSE_RANKS_TARGET_MODEL_SCOPE_UNSUPPORTED");
  if ((state.board?.terrain || []).some((entry) => !entry.isRemoved && !entry.isDestroyed)
    || (state.board?.effectMarkers || []).length > 0
    || (state.board?.accessPoints || []).length > 0) {
    fail("CLOSE_RANKS_GEOMETRY_SCOPE_UNSUPPORTED");
  }
  const leading = models[0];
  roundRadius(leading);
  for (const otherPiece of state.pieces.filter(activePiece)) {
    for (const otherModel of activeModels(otherPiece)) roundRadius(otherModel);
  }
  const currentEnemyUnitIds = enemyUnitIdsFor(graph, piece.id);
  if (!isDeepStrictEqual(currentEnemyUnitIds, [target.id])) {
    fail("CLOSE_RANKS_SINGLE_ENEMY_ATTACK_SCOPE_REQUIRED");
  }
  if (modelEdgesFor(graph, piece.id, leading.id).some((edge) => {
    const enemyUnitId = edge.leftUnitId === piece.id ? edge.rightUnitId : edge.leftUnitId;
    const enemyModelId = edge.leftUnitId === piece.id ? edge.rightModelId : edge.leftModelId;
    const enemy = state.pieces.find((entry) => entry.id === enemyUnitId);
    return basesTouch(leading, activeModels(enemy).find((model) => model.id === enemyModelId));
  })) {
    fail("CLOSE_RANKS_PINNED_MODEL");
  }
  const startUnit = unitSnapshot(snapshot, piece.id);
  if (!startUnit.enemyUnitIds.includes(target.id)) {
    fail("CLOSE_RANKS_TARGET_NOT_ENGAGED_AT_PHASE_START");
  }
  return { piece, target, leading, targetModel: targetModels[0], currentEnemyUnitIds };
}

function diagnosticAction(baseAction, snapshotHash, reason) {
  return {
    ...rewriteBaseAction(baseAction, snapshotHash, "move"),
    isEnabled: false,
    disabledReason: reason,
    score: 0,
    details: {
      closeRanksParameterDomainAvailable: false,
      rulesTruth: "official_close_ranks_fail_closed",
      trainingTruth: false,
    },
  };
}

function domainFor(state, action, graph, snapshot, matchBinding) {
  const scope = closeRanksScope(state, action, graph, snapshot);
  const start = point(scope.leading);
  const core = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_CLOSE_RANKS_PARAMETER_KIND,
    matchBindingHash: String(matchBinding?.bindingHash || ""),
    round: Number(state.round || 1),
    phase: "combat",
    sideKey: action.sideKey,
    actionType: "fight",
    pieceId: action.pieceId,
    targetId: action.targetId,
    weaponName: action.weaponName,
    executorId: OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["path"],
      pathUnit: "milli-inch",
      coordinateType: "safe_integer",
      maxCanonicalPoints: MAX_CANONICAL_PATH_POINTS,
    },
    constraints: {
      leadingModelId: scope.leading.id,
      start,
      maxDistanceMilliInches: OFFICIAL_CLOSE_RANKS_MAX_DISTANCE_MILLI_INCHES,
      phaseStartEngagementSnapshotHash: snapshot.snapshotHash,
      preMoveEngagementGraphHash: graph.graphHash,
      geometryScope: "single_model_round_base_ground_no_terrain_v1",
    },
    confirmationClass: "explicit_human",
    rulesTruth: "official_single_model_close_ranks_parameter_domain",
    trainingTruth: false,
  };
  return {
    ...core,
    domainId: `sc-domain-${hashStarcraftTmgContract(core)}`,
  };
}

export function enumerateOfficialCloseRanksCombatV1(state, options = {}) {
  const baseRows = enumerateOfficialCloseCombatAttackActionsV1(state, {
    ...options,
    includeDisabled: true,
  });
  let graph;
  let snapshot;
  try {
    graph = deriveOfficialEngagementGraphV2(state);
    snapshot = phaseStartSnapshotFor(state, graph);
  } catch (error) {
    return {
      candidates: baseRows.map((row) => ({
        ...rewriteBaseAction(row, "", "decline"),
        isEnabled: false,
        disabledReason: String(error?.message || error),
      })),
      parameterDomains: [],
    };
  }
  const candidates = baseRows.map((row) => ({
    ...rewriteBaseAction(row, snapshot.snapshotHash, "decline"),
    isEnabled: row.isEnabled,
    disabledReason: row.disabledReason,
    score: row.score,
    details: {
      ...(row.details || {}),
      combatPhaseStartEngagementSnapshotHash: snapshot.snapshotHash,
      closeRanksParameterDomainMayBeAvailable: row.isEnabled,
    },
  }));
  const parameterDomains = [];
  for (const row of candidates.filter((entry) => entry.isEnabled)) {
    try {
      parameterDomains.push(domainFor(state, row, graph, snapshot, options.matchBinding));
    } catch (error) {
      candidates.push(diagnosticAction(row, snapshot.snapshotHash, String(error?.message || error)));
    }
  }
  return { candidates, parameterDomains };
}

function nearestEdgeDistance(model, targetPiece) {
  return Math.min(...activeModels(targetPiece).map((targetModel) => (
    Math.hypot(
      milli(targetModel.xInches) - milli(model.xInches),
      milli(targetModel.yInches) - milli(model.yInches),
    ) - roundRadius(model) - roundRadius(targetModel)
  )));
}

function validateSweptPath(state, movingPiece, movingModel, path) {
  const movingRadius = roundRadius(movingModel);
  const maxX = milli(state.board?.widthInches);
  const maxY = milli(state.board?.heightInches);
  for (const [index, entry] of path.points.entries()) {
    if (entry.xMilliInches < movingRadius
      || entry.xMilliInches > maxX - movingRadius
      || entry.yMilliInches < movingRadius
      || entry.yMilliInches > maxY - movingRadius) {
      fail("CLOSE_RANKS_ENDPOINT_OUTSIDE_BATTLEFIELD", String(index));
    }
  }
  for (let index = 1; index < path.points.length; index += 1) {
    const start = path.points[index - 1];
    const end = path.points[index];
    for (const otherPiece of state.pieces.filter(activePiece)) {
      for (const otherModel of activeModels(otherPiece)) {
        if (otherPiece.id === movingPiece.id && otherModel.id === movingModel.id) continue;
        const clearance = movingRadius + roundRadius(otherModel);
        if (pointToSegmentDistance(point(otherModel), start, end) < clearance - 1) {
          fail("CLOSE_RANKS_PATH_COLLISION", `Close Ranks path collides with ${otherModel.id}`);
        }
      }
    }
  }
}

function validateCloseRanksPath(state, domain, parameters) {
  const graph = deriveOfficialEngagementGraphV2(state);
  const snapshot = phaseStartSnapshotFor(state, graph);
  if (snapshot.snapshotHash !== domain.constraints.phaseStartEngagementSnapshotHash
    || graph.graphHash !== domain.constraints.preMoveEngagementGraphHash) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_STALE");
  }
  const scope = closeRanksScope(state, domain, graph, snapshot);
  if (scope.leading.id !== domain.constraints.leadingModelId
    || !pointEquals(point(scope.leading), domain.constraints.start)) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_STALE");
  }
  const path = canonicalPath(point(scope.leading), parameters);
  validateSweptPath(state, scope.piece, scope.leading, path);
  const movedState = clone(state);
  movedState.combatPhaseStartEngagementSnapshot = clone(snapshot);
  const movedPiece = movedState.pieces.find((entry) => entry.id === scope.piece.id);
  const movedModel = activeModels(movedPiece).find((entry) => entry.id === scope.leading.id);
  const endpoint = path.points.at(-1);
  const beforeDistance = nearestEdgeDistance(scope.leading, scope.target);
  movedModel.xInches = inches(endpoint.xMilliInches);
  movedModel.yInches = inches(endpoint.yMilliInches);
  const movedTarget = movedState.pieces.find((entry) => entry.id === scope.target.id);
  const afterDistance = nearestEdgeDistance(movedModel, movedTarget);
  if (!(afterDistance < beforeDistance - 0.5)) {
    fail("CLOSE_RANKS_NOT_CLOSER", "Leading Model must end closer to the engaged Enemy Unit");
  }
  const postMoveGraph = deriveOfficialEngagementGraphV2(movedState);
  const postEnemyUnitIds = enemyUnitIdsFor(postMoveGraph, movedPiece.id);
  const phaseStartEnemyUnitIds = unitSnapshot(snapshot, movedPiece.id).enemyUnitIds;
  const newEnemyUnitIds = postEnemyUnitIds.filter((unitId) => !phaseStartEnemyUnitIds.includes(unitId));
  if (newEnemyUnitIds.length > 0) {
    fail("CLOSE_RANKS_NEW_ENGAGEMENT", `Close Ranks cannot engage a new Enemy Unit: ${newEnemyUnitIds.join(",")}`);
  }
  const disengagedEnemyUnitIds = scope.currentEnemyUnitIds.filter((unitId) => !postEnemyUnitIds.includes(unitId));
  if (disengagedEnemyUnitIds.length > 0) {
    fail("CLOSE_RANKS_DISENGAGE_FORBIDDEN", `Close Ranks cannot Disengage from ${disengagedEnemyUnitIds.join(",")}`);
  }
  return {
    snapshot,
    path,
    movedState,
    postMoveGraph,
    scope,
    beforeDistance,
    afterDistance,
  };
}

export function instantiateOfficialCloseRanksCombatV1(state, domain, parameters, options = {}) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_CLOSE_RANKS_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_VERSION) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialCloseRanksCombatV1(state, options);
  const expectedDomain = current.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expectedDomain || !isDeepStrictEqual(domain, expectedDomain)) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_STALE");
  }
  const validated = validateCloseRanksPath(state, domain, parameters);
  const baseRow = enumerateOfficialCloseCombatAttackActionsV1(validated.movedState, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  }).find((entry) => (
    entry.isEnabled
      && entry.pieceId === domain.pieceId
      && entry.targetId === domain.targetId
      && entry.weaponName === domain.weaponName
  ));
  if (!baseRow) fail("CLOSE_RANKS_POST_MOVE_ATTACK_UNAVAILABLE");
  const plan = {
    schemaVersion: PLAN_SCHEMA,
    leadingModelId: validated.scope.leading.id,
    phaseStartEngagementSnapshotHash: validated.snapshot.snapshotHash,
    preMoveEngagementGraphHash: domain.constraints.preMoveEngagementGraphHash,
    postMoveEngagementGraphHash: validated.postMoveGraph.graphHash,
    preMoveNearestEnemyEdgeDistanceMilliInches: Number(validated.beforeDistance.toFixed(3)),
    postMoveNearestEnemyEdgeDistanceMilliInches: Number(validated.afterDistance.toFixed(3)),
    canonicalPath: validated.path,
    supportedScope: "single_model_round_base_ground_no_terrain_v1",
  };
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: { path: clone(validated.path.points) },
    action: rewriteBaseAction(baseRow, validated.snapshot.snapshotHash, "move", plan),
    postMoveState: validated.movedState,
    closeRanksEvent: {
      type: "close_ranks",
      sideKey: domain.sideKey,
      pieceId: domain.pieceId,
      leadingModelId: validated.scope.leading.id,
      phaseStartEngagementSnapshotHash: validated.snapshot.snapshotHash,
      preMoveEngagementGraphHash: domain.constraints.preMoveEngagementGraphHash,
      postMoveEngagementGraphHash: validated.postMoveGraph.graphHash,
      canonicalPath: clone(validated.path),
      preMoveNearestEnemyEdgeDistanceMilliInches: plan.preMoveNearestEnemyEdgeDistanceMilliInches,
      postMoveNearestEnemyEdgeDistanceMilliInches: plan.postMoveNearestEnemyEdgeDistanceMilliInches,
      postMoveInCoherency: true,
      trainingTruth: false,
    },
    rulesTruth: "official_single_model_close_ranks_parameter_instantiation",
    trainingTruth: false,
  };
}

function canonicalDeclineFor(state, action, options) {
  const row = enumerateOfficialCloseRanksCombatV1(state, {
    sideKey: action.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  }).candidates.find((entry) => (
    entry.isEnabled
      && entry.closeRanksMode === "decline"
      && entry.pieceId === action.pieceId
      && entry.targetId === action.targetId
      && entry.weaponName === action.weaponName
  ));
  if (!row) fail("CLOSE_RANKS_DECLINED_ATTACK_UNAVAILABLE");
  const { isEnabled: _isEnabled, disabledReason: _disabledReason, score: _score, details: _details, ...canonical } = row;
  return canonical;
}

function finalizeV2Result(baseResult, resolvedAction, snapshot, events) {
  const state = baseResult.state;
  state.combatPhaseStartEngagementSnapshot = clone(snapshot);
  const attackEvent = events.find((event) => event.type === "close_combat_attack");
  if (attackEvent) {
    attackEvent.closeRanksMode = resolvedAction.closeRanksMode;
    attackEvent.combatPhaseStartEngagementSnapshotHash = snapshot.snapshotHash;
  }
  const lastLog = state.log?.at(-1);
  if (lastLog) {
    lastLog.action = clone(resolvedAction);
    lastLog.events = clone(events);
  }
  return {
    ...baseResult,
    schemaVersion: "starcraft_tmg_official_close_ranks_combat_transition_v1",
    executorId: OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_VERSION,
    state,
    events,
    action: clone(resolvedAction),
    rulesTruth: "official_close_ranks_and_profile_bound_close_combat_subset",
    trainingTruth: false,
  };
}

export function applyOfficialCloseRanksCombatV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "fight"
    || actionInput.executorId !== OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_VERSION) {
    fail("CLOSE_RANKS_COMBAT_ACTION_INVALID");
  }
  const initialGraph = deriveOfficialEngagementGraphV2(stateInput);
  const snapshot = phaseStartSnapshotFor(stateInput, initialGraph);
  if (actionInput.combatPhaseStartEngagementSnapshotHash !== snapshot.snapshotHash) {
    fail("CLOSE_RANKS_PHASE_START_SNAPSHOT_MISMATCH");
  }
  if (actionInput.closeRanksMode === "decline") {
    const expected = canonicalDeclineFor(stateInput, actionInput, options);
    if (!isDeepStrictEqual(actionInput, expected)) fail("CLOSE_RANKS_DECLINED_ACTION_MISMATCH");
    const state = clone(stateInput);
    state.combatPhaseStartEngagementSnapshot = clone(snapshot);
    const baseResult = applyOfficialCloseCombatAttackV1(state, baseV1Action(actionInput), options);
    return finalizeV2Result(baseResult, actionInput, snapshot, clone(baseResult.events));
  }
  if (actionInput.closeRanksMode !== "move" || !object(actionInput.closeRanksPlan)) {
    fail("CLOSE_RANKS_MODE_INVALID");
  }
  const enumeration = enumerateOfficialCloseRanksCombatV1(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.pieceId === actionInput.pieceId
      && entry.targetId === actionInput.targetId
      && entry.weaponName === actionInput.weaponName
  ));
  if (!domain) fail("CLOSE_RANKS_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialCloseRanksCombatV1(
    stateInput,
    domain,
    { path: actionInput.closeRanksPlan.canonicalPath?.points?.slice(1) },
    options,
  );
  if (!isDeepStrictEqual(actionInput, instantiated.action)) {
    fail("CLOSE_RANKS_COMBAT_ACTION_MISMATCH");
  }
  const baseResult = applyOfficialCloseCombatAttackV1(
    instantiated.postMoveState,
    baseV1Action(actionInput),
    options,
  );
  const events = [clone(instantiated.closeRanksEvent), ...clone(baseResult.events)];
  return finalizeV2Result(baseResult, actionInput, snapshot, events);
}
