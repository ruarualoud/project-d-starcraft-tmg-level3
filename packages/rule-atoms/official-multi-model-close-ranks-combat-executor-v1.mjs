import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialCloseRanksCombatV1,
  enumerateOfficialCloseRanksCombatV1,
  instantiateOfficialCloseRanksCombatV1,
  OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ID,
  OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_VERSION,
  OFFICIAL_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS,
  OFFICIAL_CLOSE_RANKS_MAX_DISTANCE_MILLI_INCHES,
  OFFICIAL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_CLOSE_RANKS_PARAMETER_KIND,
} from "./official-close-ranks-combat-executor-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from "./official-engagement-graph-v2.mjs";

export const OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID = "authority.close-combat-attack-v3";
export const OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION = "3.0.0";
export const OFFICIAL_MULTI_MODEL_CLOSE_RANKS_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND =
  "official_close_ranks_multi_model_formation_v1";

export const OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:enemy-base-contact-combat-placement-priority",
  "rule-atom:singleton:core-11-leading-model-movement-coherency:9df4fe4e088d",
  "rule-atom:singleton:core-4-4-coherency-link-path:3992d3a92cb6",
  "rule-atom:singleton:core-4-4-coherency-placement-sequence:4e3b224d5c25",
  "rule-atom:singleton:core-7-1-base-to-base-trace:3ff8c35709df",
  "rule-atom:singleton:core-8-5-3-other-model-coherency-placement:85e1a0c35142",
  "rule-atom:singleton:core-8-8-1-friendly-contact-fallback:6d5875ea5419",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_MULTI_MODEL_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS,
]);
export const OFFICIAL_MULTI_MODEL_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS,
]);
export const OFFICIAL_MULTI_MODEL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS,
    ...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const SNAPSHOT_SCHEMA = "starcraft_tmg_combat_phase_start_engagement_snapshot_v1";
const PATH_SCHEMA = "starcraft_tmg_close_ranks_path_v1";
const PLAN_SCHEMA = "starcraft_tmg_multi_model_close_ranks_plan_v1";
const MAX_RAW_PATH_POINTS = 4096;
const MAX_CANONICAL_PATH_POINTS = 1024;
const MAX_FORMATION_MODELS = 64;
const CONTACT_TOLERANCE_MILLI_INCHES = 1;
const ENGAGEMENT_RANGE_MILLI_INCHES = 1000;
const COHERENCY_RANGE_MILLI_INCHES = 3000;

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

function canonicalPoint(value, code = "CLOSE_RANKS_PLACEMENT_POINT_INVALID") {
  if (!object(value)
    || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) {
    fail(code);
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

function distance(left, right) {
  return Math.hypot(
    right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches,
  );
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
    const next = canonicalPoint(entry, `CLOSE_RANKS_PATH_POINT_INVALID:${index}`);
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
    distanceMilliInches += Math.round(distance(points[index - 1], points[index]));
  }
  if (distanceMilliInches > OFFICIAL_CLOSE_RANKS_MAX_DISTANCE_MILLI_INCHES) {
    fail("CLOSE_RANKS_PATH_TOO_LONG", "Close Ranks path exceeds 3 inches");
  }
  return { schemaVersion: PATH_SCHEMA, unit: "milli-inch", points, distanceMilliInches };
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

function basesTouchAt(leftPoint, leftRadius, rightPoint, rightRadius) {
  return Math.abs(distance(leftPoint, rightPoint) - leftRadius - rightRadius)
    <= CONTACT_TOLERANCE_MILLI_INCHES;
}

function basesTouch(left, right) {
  return basesTouchAt(point(left), roundRadius(left), point(right), roundRadius(right));
}

function basesOverlapAt(leftPoint, leftRadius, rightPoint, rightRadius) {
  return distance(leftPoint, rightPoint)
    < leftRadius + rightRadius - CONTACT_TOLERANCE_MILLI_INCHES;
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

function enabledAction(action) {
  return action?.isEnabled === true;
}

function actionCore(action) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...core
  } = clone(action);
  return core;
}

function actionAtomIds(mode, plan) {
  if (mode !== "move") return OFFICIAL_MULTI_MODEL_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS;
  return plan?.schemaVersion === PLAN_SCHEMA
    ? OFFICIAL_MULTI_MODEL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS
    : OFFICIAL_MULTI_MODEL_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS;
}

function rewriteAction(action, plan = action?.closeRanksPlan) {
  const result = clone(action);
  result.executorId = OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION;
  result.ruleAtomIds = [...actionAtomIds(result.closeRanksMode, plan)];
  return result;
}

function toPreviousAction(action) {
  const result = clone(action);
  result.executorId = OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_VERSION;
  result.ruleAtomIds = result.closeRanksMode === "move"
    ? [...OFFICIAL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS]
    : [...OFFICIAL_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS];
  return result;
}

function domainBody(domain) {
  const { domainId: _domainId, ...body } = clone(domain);
  return body;
}

function rewriteSingleDomain(domain) {
  const body = domainBody(domain);
  body.executorId = OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID;
  body.executorVersion = OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION;
  body.ruleAtomIds = [...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS];
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function toPreviousDomain(domain) {
  const body = domainBody(domain);
  body.executorId = OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_ID;
  body.executorVersion = OFFICIAL_CLOSE_RANKS_COMBAT_EXECUTOR_VERSION;
  body.ruleAtomIds = [...OFFICIAL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS];
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function multiModelScope(state, action, graph, snapshot) {
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  const target = state.pieces.find((entry) => entry.id === action.targetId);
  if (!activePiece(piece) || !activePiece(target)) fail("CLOSE_RANKS_UNIT_UNAVAILABLE");
  const models = activeModels(piece);
  const targetModels = activeModels(target);
  if (models.length < 2 || models.length > MAX_FORMATION_MODELS) {
    fail("CLOSE_RANKS_MULTI_MODEL_COUNT_UNSUPPORTED");
  }
  if (targetModels.length !== 1) fail("CLOSE_RANKS_TARGET_MODEL_SCOPE_UNSUPPORTED");
  if ((state.board?.terrain || []).some((entry) => !entry.isRemoved && !entry.isDestroyed)
    || (state.board?.effectMarkers || []).length > 0
    || (state.board?.accessPoints || []).length > 0) {
    fail("CLOSE_RANKS_GEOMETRY_SCOPE_UNSUPPORTED");
  }
  const livePieces = state.pieces.filter(activePiece);
  if (livePieces.length !== 2
    || !livePieces.some((entry) => entry.id === piece.id)
    || !livePieces.some((entry) => entry.id === target.id)) {
    fail("CLOSE_RANKS_MULTI_MODEL_TWO_UNIT_SCOPE_REQUIRED");
  }
  for (const currentPiece of livePieces) {
    if (String(currentPiece.combatTag || "").toLowerCase() !== "ground") {
      fail("CLOSE_RANKS_GEOMETRY_SCOPE_UNSUPPORTED", currentPiece.id);
    }
    for (const currentModel of activeModels(currentPiece)) roundRadius(currentModel);
  }
  if (!isDeepStrictEqual(enemyUnitIdsFor(graph, piece.id), [target.id])) {
    fail("CLOSE_RANKS_SINGLE_ENEMY_ATTACK_SCOPE_REQUIRED");
  }
  if (!unitSnapshot(snapshot, piece.id).enemyUnitIds.includes(target.id)) {
    fail("CLOSE_RANKS_TARGET_NOT_ENGAGED_AT_PHASE_START");
  }
  const allModels = livePieces.flatMap((currentPiece) => activeModels(currentPiece).map((currentModel) => ({
    piece: currentPiece,
    model: currentModel,
  })));
  const pinnedModelIds = models.filter((currentModel) => allModels.some((entry) => (
    !(entry.piece.id === piece.id && entry.model.id === currentModel.id)
      && basesTouch(currentModel, entry.model)
  ))).map((entry) => entry.id).sort((left, right) => left.localeCompare(right));
  const pinned = new Set(pinnedModelIds);
  const eligibleLeadingModelIds = models.map((entry) => entry.id)
    .filter((modelId) => !pinned.has(modelId))
    .sort((left, right) => left.localeCompare(right));
  if (eligibleLeadingModelIds.length === 0) fail("CLOSE_RANKS_ALL_MODELS_PINNED");
  return {
    piece,
    target,
    models,
    targetModel: targetModels[0],
    pinnedModelIds,
    eligibleLeadingModelIds,
    currentEnemyUnitIds: enemyUnitIdsFor(graph, piece.id),
  };
}

function multiDomainFor(state, action, graph, snapshot, matchBinding) {
  const scope = multiModelScope(state, action, graph, snapshot);
  const core = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND,
    matchBindingHash: String(matchBinding?.bindingHash || ""),
    round: Number(state.round || 1),
    phase: "combat",
    sideKey: action.sideKey,
    actionType: "fight",
    pieceId: action.pieceId,
    targetId: action.targetId,
    weaponName: action.weaponName,
    executorId: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID,
    executorVersion: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["leadingModelId", "path", "placements"],
      pathUnit: "milli-inch",
      placementUnit: "milli-inch",
      placementOrderSemantics: "official_one_at_a_time_enemy_then_friendly_contact_priority",
      maxCanonicalPathPoints: MAX_CANONICAL_PATH_POINTS,
      maxFormationModels: MAX_FORMATION_MODELS,
    },
    constraints: {
      eligibleLeadingModelIds: scope.eligibleLeadingModelIds,
      pinnedModelIds: scope.pinnedModelIds,
      activeModelIds: scope.models.map((entry) => entry.id).sort((left, right) => left.localeCompare(right)),
      targetModelId: scope.targetModel.id,
      maxDistanceMilliInches: OFFICIAL_CLOSE_RANKS_MAX_DISTANCE_MILLI_INCHES,
      phaseStartEngagementSnapshotHash: snapshot.snapshotHash,
      preMoveEngagementGraphHash: graph.graphHash,
      geometryScope: "multi_model_round_base_ground_two_unit_no_terrain_v1",
    },
    confirmationClass: "explicit_human",
    rulesTruth: "official_multi_model_close_ranks_sequential_contact_priority_domain",
    trainingTruth: false,
  };
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

export function enumerateOfficialMultiModelCloseRanksV1(state, options = {}) {
  const previous = enumerateOfficialCloseRanksCombatV1(state, {
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
      candidates: previous.candidates.map(rewriteAction),
      parameterDomains: previous.parameterDomains.map(rewriteSingleDomain),
    };
  }
  const multiDomains = [];
  const supportedActionKeys = new Set();
  for (const row of previous.candidates.filter((entry) => (
    enabledAction(entry) && entry.closeRanksMode === "decline"
  ))) {
    try {
      const domain = multiDomainFor(state, row, graph, snapshot, options.matchBinding);
      multiDomains.push(domain);
      supportedActionKeys.add(`${row.pieceId}:${row.targetId}:${row.weaponName}`);
    } catch {
      // The previous executor's disabled diagnostic remains visible for unsupported scopes.
    }
  }
  const candidates = previous.candidates.filter((row) => !(
    row.isEnabled === false
      && String(row.disabledReason || "").includes("CLOSE_RANKS_MULTI_MODEL_PLACEMENT_PENDING")
      && supportedActionKeys.has(`${row.pieceId}:${row.targetId}:${row.weaponName}`)
  )).map(rewriteAction);
  return {
    candidates,
    parameterDomains: [
      ...previous.parameterDomains.map(rewriteSingleDomain),
      ...multiDomains,
    ],
  };
}

function endpointInsideBoard(state, endpoint, radius) {
  const maxX = milli(state.board?.widthInches);
  const maxY = milli(state.board?.heightInches);
  return endpoint.xMilliInches >= radius
    && endpoint.xMilliInches <= maxX - radius
    && endpoint.yMilliInches >= radius
    && endpoint.yMilliInches <= maxY - radius;
}

function validateLeadingPath(state, scope, leading, path) {
  const radius = roundRadius(leading);
  for (const [index, entry] of path.points.entries()) {
    if (!endpointInsideBoard(state, entry, radius)) {
      fail("CLOSE_RANKS_ENDPOINT_OUTSIDE_BATTLEFIELD", String(index));
    }
  }
  for (let index = 1; index < path.points.length; index += 1) {
    const start = path.points[index - 1];
    const end = path.points[index];
    for (const otherPiece of state.pieces.filter(activePiece)) {
      if (otherPiece.id === scope.piece.id) continue;
      for (const otherModel of activeModels(otherPiece)) {
        const clearance = radius + roundRadius(otherModel);
        if (pointToSegmentDistance(point(otherModel), start, end) < clearance - 1) {
          fail("CLOSE_RANKS_PATH_COLLISION", `Close Ranks path collides with ${otherModel.id}`);
        }
      }
    }
  }
  const endpoint = path.points.at(-1);
  for (const otherPiece of state.pieces.filter(activePiece)) {
    for (const otherModel of activeModels(otherPiece)) {
      if (otherPiece.id === scope.piece.id && otherModel.id === leading.id) continue;
      if (basesOverlapAt(endpoint, radius, point(otherModel), roundRadius(otherModel))) {
        fail("CLOSE_RANKS_ENDPOINT_OVERLAP", otherModel.id);
      }
    }
  }
}

function nearestEdgeDistance(modelPoint, modelRadius, targetPiece) {
  return Math.min(...activeModels(targetPiece).map((targetModel) => (
    distance(modelPoint, point(targetModel)) - modelRadius - roundRadius(targetModel)
  )));
}

function modelRecords(state) {
  return state.pieces.filter(activePiece).flatMap((piece) => activeModels(piece).map((model) => ({
    piece,
    model,
    point: point(model),
    radius: roundRadius(model),
  })));
}

function whollyWithinLeading(endpoint, movingRadius, leadingPoint, leadingRadius) {
  return distance(endpoint, leadingPoint) + movingRadius
    <= COHERENCY_RANGE_MILLI_INCHES + leadingRadius + CONTACT_TOLERANCE_MILLI_INCHES;
}

function legalFollowerEndpoint(state, scope, movingModel, endpoint, leadingModel) {
  const movingRadius = roundRadius(movingModel);
  if (!endpointInsideBoard(state, endpoint, movingRadius)) return false;
  if (!whollyWithinLeading(endpoint, movingRadius, point(leadingModel), roundRadius(leadingModel))) {
    return false;
  }
  return modelRecords(state).every((entry) => !basesOverlapAt(
    endpoint,
    movingRadius,
    entry.point,
    entry.radius,
  ));
}

function forEachContactCandidate(anchorModel, movingModel, visit) {
  const anchor = point(anchorModel);
  const contactDistance = roundRadius(anchorModel) + roundRadius(movingModel);
  const inner = Math.max(0, contactDistance - CONTACT_TOLERANCE_MILLI_INCHES);
  const outer = contactDistance + CONTACT_TOLERANCE_MILLI_INCHES;
  const innerSquared = inner * inner;
  const outerSquared = outer * outer;
  for (let dx = -outer; dx <= outer; dx += 1) {
    const maxSquaredY = outerSquared - (dx * dx);
    if (maxSquaredY < 0) continue;
    const maxAbsY = Math.floor(Math.sqrt(maxSquaredY));
    const minSquaredY = Math.max(0, innerSquared - (dx * dx));
    const minAbsY = Math.ceil(Math.sqrt(minSquaredY));
    for (let absY = minAbsY; absY <= maxAbsY; absY += 1) {
      const positive = {
        xMilliInches: anchor.xMilliInches + dx,
        yMilliInches: anchor.yMilliInches + absY,
      };
      if (visit(positive) === true) return true;
      if (absY > 0) {
        const negative = {
          xMilliInches: anchor.xMilliInches + dx,
          yMilliInches: anchor.yMilliInches - absY,
        };
        if (visit(negative) === true) return true;
      }
    }
  }
  return false;
}

function contactPositionExists(state, scope, movingModel, anchors, leadingModel) {
  return anchors.some((anchorModel) => forEachContactCandidate(anchorModel, movingModel, (candidate) => (
    legalFollowerEndpoint(state, scope, movingModel, candidate, leadingModel)
  )));
}

function withinEngagement(model, targetModel) {
  return distance(point(model), point(targetModel)) - roundRadius(model) - roundRadius(targetModel)
    <= ENGAGEMENT_RANGE_MILLI_INCHES + CONTACT_TOLERANCE_MILLI_INCHES;
}

function touchesAny(model, candidates) {
  return candidates.some((candidate) => basesTouch(model, candidate));
}

function canonicalPlacements(parameters, requiredIds) {
  if (!Array.isArray(parameters?.placements)
    || parameters.placements.length !== requiredIds.length) {
    fail("CLOSE_RANKS_PLACEMENT_DENOMINATOR_MISMATCH");
  }
  const seen = new Set();
  const result = parameters.placements.map((entry) => {
    const modelId = String(entry?.modelId || "").trim();
    if (!requiredIds.includes(modelId) || seen.has(modelId)) {
      fail("CLOSE_RANKS_PLACEMENT_DENOMINATOR_MISMATCH", modelId);
    }
    seen.add(modelId);
    return { modelId, ...canonicalPoint(entry) };
  });
  if (seen.size !== requiredIds.length) fail("CLOSE_RANKS_PLACEMENT_DENOMINATOR_MISMATCH");
  return result;
}

function validateMultiModelPlan(state, domain, parameters) {
  const graph = deriveOfficialEngagementGraphV2(state);
  const snapshot = phaseStartSnapshotFor(state, graph);
  if (snapshot.snapshotHash !== domain.constraints.phaseStartEngagementSnapshotHash
    || graph.graphHash !== domain.constraints.preMoveEngagementGraphHash) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_STALE");
  }
  const scope = multiModelScope(state, domain, graph, snapshot);
  const leadingModelId = String(parameters?.leadingModelId || "").trim();
  if (!scope.eligibleLeadingModelIds.includes(leadingModelId)) {
    fail("CLOSE_RANKS_LEADING_MODEL_INVALID", leadingModelId);
  }
  const leading = scope.models.find((entry) => entry.id === leadingModelId);
  const path = canonicalPath(point(leading), parameters);
  validateLeadingPath(state, scope, leading, path);
  const endpoint = path.points.at(-1);
  const beforeDistance = nearestEdgeDistance(point(leading), roundRadius(leading), scope.target);
  const afterDistance = nearestEdgeDistance(endpoint, roundRadius(leading), scope.target);
  if (!(afterDistance < beforeDistance - 0.5)) {
    fail("CLOSE_RANKS_NOT_CLOSER", "Leading Model must end closer to the engaged Enemy Unit");
  }

  const pinned = new Set(scope.pinnedModelIds);
  const requiredPlacementIds = scope.models.map((entry) => entry.id)
    .filter((modelId) => modelId !== leadingModelId && !pinned.has(modelId));
  const placements = canonicalPlacements(parameters, requiredPlacementIds);
  const movedState = clone(state);
  movedState.combatPhaseStartEngagementSnapshot = clone(snapshot);
  const movedPiece = movedState.pieces.find((entry) => entry.id === scope.piece.id);
  const movedLeading = movedPiece.models.find((entry) => entry.id === leadingModelId);
  movedLeading.xInches = inches(endpoint.xMilliInches);
  movedLeading.yInches = inches(endpoint.yMilliInches);
  for (const model of movedPiece.models) {
    if (requiredPlacementIds.includes(model.id)) model.isOnField = false;
  }

  const placementSequence = [];
  for (const placement of placements) {
    const movingModel = movedPiece.models.find((entry) => entry.id === placement.modelId);
    const placementPoint = {
      xMilliInches: placement.xMilliInches,
      yMilliInches: placement.yMilliInches,
    };
    if (!legalFollowerEndpoint(movedState, scope, movingModel, placementPoint, movedLeading)) {
      fail("CLOSE_RANKS_PLACEMENT_ILLEGAL", placement.modelId);
    }
    const movedTarget = movedState.pieces.find((entry) => entry.id === scope.target.id);
    const targetModels = activeModels(movedTarget);
    const enemyContactPossible = contactPositionExists(
      movedState,
      scope,
      movingModel,
      targetModels,
      movedLeading,
    );
    movingModel.xInches = inches(placement.xMilliInches);
    movingModel.yInches = inches(placement.yMilliInches);
    movingModel.isOnField = true;
    const enemyContact = touchesAny(movingModel, targetModels);
    let prioritySatisfied;
    if (enemyContactPossible) {
      if (!enemyContact) fail("CLOSE_RANKS_ENEMY_CONTACT_REQUIRED", placement.modelId);
      prioritySatisfied = "enemy_base_contact";
    } else {
      const friendlyFightingModels = activeModels(movedPiece).filter((candidate) => (
        candidate.id !== movingModel.id && withinEngagement(candidate, scope.targetModel)
      ));
      movingModel.isOnField = false;
      const friendlyContactPossible = contactPositionExists(
        movedState,
        scope,
        movingModel,
        friendlyFightingModels,
        movedLeading,
      );
      movingModel.isOnField = true;
      const friendlyContact = touchesAny(movingModel, friendlyFightingModels);
      if (friendlyContactPossible && !friendlyContact) {
        fail("CLOSE_RANKS_FRIENDLY_CONTACT_REQUIRED", placement.modelId);
      }
      prioritySatisfied = friendlyContactPossible
        ? "friendly_fighting_rank_contact"
        : "coherency_only_no_contact_position";
    }
    placementSequence.push({
      order: placementSequence.length + 1,
      modelId: placement.modelId,
      endpoint: placementPoint,
      prioritySatisfied,
    });
  }

  for (const model of activeModels(movedPiece)) {
    if (!whollyWithinLeading(
      point(model),
      roundRadius(model),
      point(movedLeading),
      roundRadius(movedLeading),
    )) {
      fail("CLOSE_RANKS_FINAL_COHERENCY_REQUIRED", model.id);
    }
  }
  const postMoveGraph = deriveOfficialEngagementGraphV2(movedState);
  const postEnemyUnitIds = enemyUnitIdsFor(postMoveGraph, movedPiece.id);
  const phaseStartEnemyUnitIds = unitSnapshot(snapshot, movedPiece.id).enemyUnitIds;
  const newEnemyUnitIds = postEnemyUnitIds.filter((unitId) => !phaseStartEnemyUnitIds.includes(unitId));
  if (newEnemyUnitIds.length > 0) {
    fail("CLOSE_RANKS_NEW_ENGAGEMENT", newEnemyUnitIds.join(","));
  }
  const disengagedEnemyUnitIds = scope.currentEnemyUnitIds.filter((unitId) => !postEnemyUnitIds.includes(unitId));
  if (disengagedEnemyUnitIds.length > 0) {
    fail("CLOSE_RANKS_DISENGAGE_FORBIDDEN", disengagedEnemyUnitIds.join(","));
  }
  return {
    snapshot,
    graph,
    postMoveGraph,
    movedState,
    movedPiece,
    leadingModelId,
    pinnedModelIds: scope.pinnedModelIds,
    path,
    placements,
    placementSequence,
    beforeDistance,
    afterDistance,
  };
}

function enabledPreviousDecline(state, domain, options) {
  return enumerateOfficialCloseRanksCombatV1(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  }).candidates.find((entry) => (
    entry.isEnabled
      && entry.closeRanksMode === "decline"
      && entry.pieceId === domain.pieceId
      && entry.targetId === domain.targetId
      && entry.weaponName === domain.weaponName
  ));
}

export function instantiateOfficialMultiModelCloseRanksV1(state, domain, parameters, options = {}) {
  if (!object(domain)
    || domain.executorId !== OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialMultiModelCloseRanksV1(state, options);
  const expectedDomain = current.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expectedDomain || !isDeepStrictEqual(domain, expectedDomain)) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_STALE");
  }
  if (domain.parameterKind === OFFICIAL_CLOSE_RANKS_PARAMETER_KIND) {
    const previous = instantiateOfficialCloseRanksCombatV1(
      state,
      toPreviousDomain(domain),
      parameters,
      options,
    );
    return { ...previous, action: rewriteAction(previous.action) };
  }
  if (domain.parameterKind !== OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_INVALID");
  }
  const validated = validateMultiModelPlan(state, domain, parameters);
  const previousDecline = enabledPreviousDecline(validated.movedState, domain, options);
  if (!previousDecline) fail("CLOSE_RANKS_POST_MOVE_ATTACK_UNAVAILABLE");
  const placementCounts = {
    enemyBaseContact: validated.placementSequence.filter((entry) => (
      entry.prioritySatisfied === "enemy_base_contact"
    )).length,
    friendlyFightingRankContact: validated.placementSequence.filter((entry) => (
      entry.prioritySatisfied === "friendly_fighting_rank_contact"
    )).length,
    coherencyOnly: validated.placementSequence.filter((entry) => (
      entry.prioritySatisfied === "coherency_only_no_contact_position"
    )).length,
    pinned: validated.pinnedModelIds.length,
  };
  const plan = {
    schemaVersion: PLAN_SCHEMA,
    leadingModelId: validated.leadingModelId,
    pinnedModelIds: validated.pinnedModelIds,
    phaseStartEngagementSnapshotHash: validated.snapshot.snapshotHash,
    preMoveEngagementGraphHash: validated.graph.graphHash,
    postMoveEngagementGraphHash: validated.postMoveGraph.graphHash,
    preMoveNearestEnemyEdgeDistanceMilliInches: Number(validated.beforeDistance.toFixed(3)),
    postMoveNearestEnemyEdgeDistanceMilliInches: Number(validated.afterDistance.toFixed(3)),
    canonicalPath: validated.path,
    placementSequence: validated.placementSequence,
    placementCounts,
    supportedScope: "multi_model_round_base_ground_two_unit_no_terrain_v1",
  };
  const action = rewriteAction({
    ...actionCore(previousDecline),
    closeRanksMode: "move",
    combatPhaseStartEngagementSnapshotHash: validated.snapshot.snapshotHash,
    closeRanksPlan: plan,
  }, plan);
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: {
      leadingModelId: validated.leadingModelId,
      path: clone(validated.path.points),
      placements: clone(validated.placements),
    },
    action,
    postMoveState: validated.movedState,
    closeRanksEvent: {
      type: "close_ranks",
      sideKey: domain.sideKey,
      pieceId: domain.pieceId,
      leadingModelId: validated.leadingModelId,
      pinnedModelIds: validated.pinnedModelIds,
      phaseStartEngagementSnapshotHash: validated.snapshot.snapshotHash,
      preMoveEngagementGraphHash: validated.graph.graphHash,
      postMoveEngagementGraphHash: validated.postMoveGraph.graphHash,
      canonicalPath: clone(validated.path),
      placementSequence: clone(validated.placementSequence),
      placementCounts,
      postMoveInCoherency: true,
      trainingTruth: false,
    },
    rulesTruth: "official_multi_model_close_ranks_sequential_contact_priority_instantiation",
    trainingTruth: false,
  };
}

function finalizeResult(baseResult, resolvedAction, events) {
  const state = baseResult.state;
  const attackEvent = events.find((event) => event.type === "close_combat_attack");
  if (attackEvent) {
    attackEvent.closeRanksMode = resolvedAction.closeRanksMode;
    attackEvent.combatPhaseStartEngagementSnapshotHash =
      resolvedAction.combatPhaseStartEngagementSnapshotHash;
  }
  const lastLog = state.log?.at(-1);
  if (lastLog) {
    lastLog.action = clone(resolvedAction);
    lastLog.events = clone(events);
  }
  return {
    ...baseResult,
    schemaVersion: "starcraft_tmg_official_multi_model_close_ranks_transition_v1",
    executorId: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID,
    executorVersion: OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION,
    state,
    events,
    action: clone(resolvedAction),
    rulesTruth: "official_multi_model_close_ranks_and_profile_bound_close_combat_subset",
    trainingTruth: false,
  };
}

export function applyOfficialMultiModelCloseRanksV1(state, action, options = {}) {
  if (!object(action)
    || action.actionType !== "fight"
    || action.executorId !== OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID
    || action.executorVersion !== OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION) {
    fail("CLOSE_RANKS_COMBAT_ACTION_INVALID");
  }
  if (action.closeRanksMode !== "move"
    || action.closeRanksPlan?.schemaVersion !== PLAN_SCHEMA) {
    const previousResult = applyOfficialCloseRanksCombatV1(
      state,
      toPreviousAction(action),
      options,
    );
    return finalizeResult(previousResult, action, clone(previousResult.events));
  }
  const enumeration = enumerateOfficialMultiModelCloseRanksV1(state, {
    sideKey: action.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND
      && entry.pieceId === action.pieceId
      && entry.targetId === action.targetId
      && entry.weaponName === action.weaponName
  ));
  if (!domain) fail("CLOSE_RANKS_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialMultiModelCloseRanksV1(state, domain, {
    leadingModelId: action.closeRanksPlan.leadingModelId,
    path: action.closeRanksPlan.canonicalPath?.points?.slice(1),
    placements: action.closeRanksPlan.placementSequence?.map((entry) => ({
      modelId: entry.modelId,
      ...entry.endpoint,
    })),
  }, options);
  if (!isDeepStrictEqual(action, instantiated.action)) {
    fail("CLOSE_RANKS_COMBAT_ACTION_MISMATCH");
  }
  const previousDecline = enabledPreviousDecline(instantiated.postMoveState, domain, options);
  if (!previousDecline) fail("CLOSE_RANKS_POST_MOVE_ATTACK_UNAVAILABLE");
  const attackResult = applyOfficialCloseRanksCombatV1(
    instantiated.postMoveState,
    actionCore(previousDecline),
    options,
  );
  return finalizeResult(
    attackResult,
    action,
    [clone(instantiated.closeRanksEvent), ...clone(attackResult.events)],
  );
}
