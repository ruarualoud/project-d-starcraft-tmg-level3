import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialCombatProfileV1,
  verifyOfficialCombatProfileBundleV1,
} from "../source-data/official-combat-profile-bundle-v1.mjs";
import { resolveOfficialCoherencyPlacementV1 } from "./official-coherency-placement-kernel-v1.mjs";
import {
  applyOfficialCloseRanksCombatV1,
  enumerateOfficialCloseRanksCombatV1,
  OFFICIAL_CLOSE_RANKS_MAX_DISTANCE_MILLI_INCHES,
  OFFICIAL_CLOSE_RANKS_PARAMETER_KIND,
} from "./official-close-ranks-combat-executor-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from "./official-engagement-graph-v2.mjs";
import {
  applyOfficialMultiModelCloseRanksV1,
  enumerateOfficialMultiModelCloseRanksV1,
  instantiateOfficialMultiModelCloseRanksV1,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ATOM_IDS,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND,
  OFFICIAL_MULTI_MODEL_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS,
} from "./official-multi-model-close-ranks-combat-executor-v1.mjs";

export const OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID =
  "authority.close-combat-attack-v4";
export const OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_VERSION = "4.0.0";
export const OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_PARAMETER_KIND =
  "official_close_ranks_coherency_fallback_formation_v1";

export const OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:immediate-current-supply-casualty-update",
  "rule-atom:singleton:core-4-4-closest-legal-coherency:a9516d4ec333",
  "rule-atom:singleton:core-4-4-coherency-lifecycle:2d29cf6d4a67",
  "rule-atom:singleton:core-4-4-no-link-casualty:30b7d0cecef2",
  "rule-atom:singleton:core-4-4-out-of-coherency:0a82e4b97fdc",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS,
]);
export const OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS,
]);
export const OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS =
  Object.freeze([...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS]);
export const OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS,
    ...OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const SNAPSHOT_SCHEMA = "starcraft_tmg_combat_phase_start_engagement_snapshot_v1";
const PATH_SCHEMA = "starcraft_tmg_close_ranks_path_v1";
const PLAN_SCHEMA = "starcraft_tmg_out_of_coherency_close_ranks_plan_v1";
const COHERENCY_STATUS_SCHEMA = "starcraft_tmg_unit_coherency_status_v1";
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

function basesTouch(left, right) {
  return Math.abs(distance(point(left), point(right)) - roundRadius(left) - roundRadius(right))
    <= CONTACT_TOLERANCE_MILLI_INCHES;
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
  const units = (state.pieces || []).filter(activePiece).map((piece) => ({
    unitId: piece.id,
    enemyUnitIds: enemyUnitIdsFor(graph, piece.id),
    models: activeModels(piece).map((model) => ({
      modelId: model.id,
      enemyUnitIds: modelEnemyUnitIdsFor(graph, piece.id, model.id),
    })).sort((left, right) => left.modelId.localeCompare(right.modelId)),
  })).sort((left, right) => left.unitId.localeCompare(right.unitId));
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
        if (pointToSegmentDistance(point(otherModel), start, end)
          < radius + roundRadius(otherModel) - CONTACT_TOLERANCE_MILLI_INCHES) {
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

function whollyWithinLeading(modelPoint, modelRadius, leadingPoint, leadingRadius) {
  return distance(modelPoint, leadingPoint) + modelRadius
    <= COHERENCY_RANGE_MILLI_INCHES + leadingRadius + CONTACT_TOLERANCE_MILLI_INCHES;
}

function withinEngagement(model, targetModel) {
  return distance(point(model), point(targetModel)) - roundRadius(model) - roundRadius(targetModel)
    <= ENGAGEMENT_RANGE_MILLI_INCHES + CONTACT_TOLERANCE_MILLI_INCHES;
}

function supplyAt(profile, modelCount) {
  if (modelCount === 0) return 0;
  const tier = profile.squadProfile.find((entry) => (
    entry.minimumModels !== null
      && modelCount >= entry.minimumModels
      && modelCount <= entry.maximumModels
  ));
  if (!tier) fail("CLOSE_RANKS_SUPPLY_TIER_UNRESOLVED", `${profile.recordKey}:${modelCount}`);
  return tier.supply;
}

function verifyProfileBinding(state, matchBinding) {
  const bundle = state.officialCombatProfileBundle;
  verifyOfficialCombatProfileBundleV1(bundle);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(bundle) !== matchBinding.dataSnapshotHash) {
    fail("CLOSE_RANKS_DATA_SNAPSHOT_MISMATCH");
  }
  return bundle;
}

function customScope(state, action, graph, snapshot) {
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
  for (const currentPiece of livePieces) {
    if (String(currentPiece.combatTag || "").toLowerCase() !== "ground") {
      fail("CLOSE_RANKS_GEOMETRY_SCOPE_UNSUPPORTED", currentPiece.id);
    }
    for (const currentModel of activeModels(currentPiece)) roundRadius(currentModel);
  }
  if (!isDeepStrictEqual(enemyUnitIdsFor(graph, piece.id), [target.id])) {
    fail("CLOSE_RANKS_SINGLE_ENEMY_ATTACK_SCOPE_REQUIRED");
  }
  const phaseStartEnemyUnitIds = unitSnapshot(snapshot, piece.id).enemyUnitIds;
  if (!phaseStartEnemyUnitIds.includes(target.id)) {
    fail("CLOSE_RANKS_TARGET_NOT_ENGAGED_AT_PHASE_START");
  }
  const allModels = livePieces.flatMap((currentPiece) => activeModels(currentPiece).map((model) => ({
    piece: currentPiece,
    model,
  })));
  const pinnedModelIds = models.filter((currentModel) => allModels.some((entry) => (
    !(entry.piece.id === piece.id && entry.model.id === currentModel.id)
      && basesTouch(currentModel, entry.model)
  ))).map((entry) => entry.id).sort((left, right) => left.localeCompare(right));
  if (pinnedModelIds.length > 0) fail("CLOSE_RANKS_COHERENCY_FALLBACK_PINNED_SCOPE_UNSUPPORTED");
  return {
    piece,
    target,
    models,
    targetModel: targetModels[0],
    pinnedModelIds,
    eligibleLeadingModelIds: models.map((entry) => entry.id)
      .sort((left, right) => left.localeCompare(right)),
    currentEnemyUnitIds: enemyUnitIdsFor(graph, piece.id),
    phaseStartEnemyUnitIds,
    linkBlockingUnitIds: livePieces.map((entry) => entry.id)
      .filter((unitId) => unitId !== piece.id && !phaseStartEnemyUnitIds.includes(unitId))
      .sort((left, right) => left.localeCompare(right)),
  };
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

function domainBody(domain) {
  const { domainId: _domainId, ...body } = clone(domain);
  return body;
}

function actionAtomIds(action) {
  if (action.closeRanksMode !== "move") {
    return OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS;
  }
  if (action.closeRanksPlan?.schemaVersion === PLAN_SCHEMA) {
    return OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS;
  }
  if (Array.isArray(action.closeRanksPlan?.placementSequence)) {
    return OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS;
  }
  return OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS;
}

function rewriteAction(action) {
  const result = clone(action);
  result.executorId = OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_VERSION;
  result.ruleAtomIds = [...actionAtomIds(result)];
  return result;
}

function toPreviousAction(action) {
  const result = clone(action);
  result.executorId = OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION;
  if (result.closeRanksMode !== "move") {
    result.ruleAtomIds = [...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS];
  } else if (Array.isArray(result.closeRanksPlan?.placementSequence)) {
    result.ruleAtomIds = [...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS];
  } else {
    result.ruleAtomIds = [...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS];
  }
  return result;
}

function rewritePreviousDomain(domain) {
  const body = domainBody(domain);
  body.executorId = OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID;
  body.executorVersion = OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_VERSION;
  body.ruleAtomIds = domain.parameterKind === OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND
    ? [...OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS]
    : [...OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS];
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function toPreviousDomain(domain) {
  const body = domainBody(domain);
  body.executorId = OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_ID;
  body.executorVersion = OFFICIAL_MULTI_MODEL_CLOSE_RANKS_EXECUTOR_VERSION;
  body.ruleAtomIds = domain.parameterKind === OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND
    ? [...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS]
    : [...OFFICIAL_MULTI_MODEL_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS];
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function customDomainFor(state, action, graph, snapshot, matchBinding) {
  const scope = customScope(state, action, graph, snapshot);
  const core = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_PARAMETER_KIND,
    matchBindingHash: String(matchBinding?.bindingHash || ""),
    round: Number(state.round || 1),
    phase: "combat",
    sideKey: action.sideKey,
    actionType: "fight",
    pieceId: action.pieceId,
    targetId: action.targetId,
    weaponName: action.weaponName,
    executorId: OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID,
    executorVersion: OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["leadingModelId", "path", "placements"],
      pathUnit: "milli-inch",
      placementUnit: "milli-inch",
      placementOutcome: ["placed", "casualty"],
      placementOrderSemantics:
        "official_one_at_a_time_within_three_else_closest_linked_then_enemy_friendly_priority",
      maxCanonicalPathPoints: MAX_CANONICAL_PATH_POINTS,
      maxFormationModels: MAX_FORMATION_MODELS,
    },
    constraints: {
      eligibleLeadingModelIds: scope.eligibleLeadingModelIds,
      pinnedModelIds: scope.pinnedModelIds,
      activeModelIds: scope.models.map((entry) => entry.id)
        .sort((left, right) => left.localeCompare(right)),
      targetModelId: scope.targetModel.id,
      linkBlockingUnitIds: scope.linkBlockingUnitIds,
      phaseStartEngagedEnemyUnitIds: scope.phaseStartEnemyUnitIds,
      maxDistanceMilliInches: OFFICIAL_CLOSE_RANKS_MAX_DISTANCE_MILLI_INCHES,
      phaseStartEngagementSnapshotHash: snapshot.snapshotHash,
      preMoveEngagementGraphHash: graph.graphHash,
      geometryScope: "multi_model_round_base_ground_multi_unit_no_terrain_bounded_exact_lattice_v1",
      exactFallbackGridPointLimit: 2_000_000,
    },
    confirmationClass: "explicit_human",
    rulesTruth: "official_close_ranks_coherency_fallback_and_casualty_domain",
    trainingTruth: false,
  };
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

function actionKey(row) {
  return `${row.pieceId}:${row.targetId}:${row.weaponName}`;
}

export function enumerateOfficialOutOfCoherencyCloseRanksV1(state, options = {}) {
  const previous = enumerateOfficialMultiModelCloseRanksV1(state, {
    ...options,
    includeDisabled: true,
  });
  let graph;
  let snapshot;
  try {
    graph = deriveOfficialEngagementGraphV2(state);
    snapshot = phaseStartSnapshotFor(state, graph);
  } catch {
    return {
      candidates: previous.candidates.map(rewriteAction),
      parameterDomains: previous.parameterDomains.map(rewritePreviousDomain),
    };
  }
  const customDomains = [];
  const customKeys = new Set();
  for (const row of previous.candidates.filter((entry) => (
    entry.isEnabled === true && entry.closeRanksMode === "decline"
  ))) {
    try {
      const domain = customDomainFor(state, row, graph, snapshot, options.matchBinding);
      customDomains.push(domain);
      customKeys.add(actionKey(row));
    } catch {
      // Unsupported scopes retain the exact previous parameter domain, if any.
    }
  }
  const previousDomains = previous.parameterDomains.filter((entry) => !(
    entry.parameterKind === OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND
      && customKeys.has(actionKey(entry))
  )).map(rewritePreviousDomain);
  const candidates = previous.candidates.filter((row) => !(
    row.isEnabled === false
      && String(row.disabledReason || "").includes("CLOSE_RANKS_MULTI_MODEL_PLACEMENT_PENDING")
      && customKeys.has(actionKey(row))
  )).map(rewriteAction);
  return { candidates, parameterDomains: [...previousDomains, ...customDomains] };
}

function canonicalPlacements(parameters, requiredIds) {
  if (!Array.isArray(parameters?.placements)
    || parameters.placements.length !== requiredIds.length) {
    fail("CLOSE_RANKS_PLACEMENT_DENOMINATOR_MISMATCH");
  }
  const seen = new Set();
  const result = parameters.placements.map((entry) => {
    const modelId = String(entry?.modelId || "").trim();
    const outcome = String(entry?.outcome || "").trim();
    if (!requiredIds.includes(modelId) || seen.has(modelId)
      || !["placed", "casualty"].includes(outcome)) {
      fail("CLOSE_RANKS_PLACEMENT_DENOMINATOR_MISMATCH", modelId);
    }
    seen.add(modelId);
    if (outcome === "casualty") return { modelId, outcome };
    return { modelId, outcome, ...canonicalPoint(entry) };
  });
  if (seen.size !== requiredIds.length) fail("CLOSE_RANKS_PLACEMENT_DENOMINATOR_MISMATCH");
  return result;
}

function validateCustomPlan(state, domain, parameters, options) {
  const graph = deriveOfficialEngagementGraphV2(state);
  const snapshot = phaseStartSnapshotFor(state, graph);
  if (snapshot.snapshotHash !== domain.constraints.phaseStartEngagementSnapshotHash
    || graph.graphHash !== domain.constraints.preMoveEngagementGraphHash) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_STALE");
  }
  const scope = customScope(state, domain, graph, snapshot);
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
  const requiredPlacementIds = scope.models.map((entry) => entry.id)
    .filter((modelId) => modelId !== leadingModelId);
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
  const bundle = verifyProfileBinding(state, options.matchBinding);
  const profile = getOfficialCombatProfileV1(bundle, movedPiece.officialUnitRecordKey);
  if (Number(movedPiece.currentSupply) !== supplyAt(profile, Number(movedPiece.currentModels))) {
    fail("CLOSE_RANKS_SUPPLY_STATE_MISMATCH", movedPiece.id);
  }
  const placementSequence = [];
  const casualtyModelIds = [];
  for (const placement of placements) {
    const movingModel = movedPiece.models.find((entry) => entry.id === placement.modelId);
    const movedTarget = movedState.pieces.find((entry) => entry.id === scope.target.id);
    const enemyContactModelIds = activeModels(movedTarget).map((entry) => entry.id);
    const friendlyFightingModelIds = activeModels(movedPiece).filter((candidate) => (
      candidate.id !== movingModel.id && withinEngagement(candidate, scope.targetModel)
    )).map((entry) => entry.id);
    const resolution = resolveOfficialCoherencyPlacementV1({
      state: movedState,
      unitId: movedPiece.id,
      movingModelId: movingModel.id,
      leadingModelId,
      phaseStartEngagedEnemyUnitIds: scope.phaseStartEnemyUnitIds,
      enemyContactModelIds,
      friendlyFightingModelIds,
      proposal: placement,
    });
    if (resolution.outcome === "casualty") {
      movingModel.isDestroyed = true;
      movingModel.isOnField = false;
      movedPiece.currentModels -= 1;
      movedPiece.currentSupply = supplyAt(profile, movedPiece.currentModels);
      casualtyModelIds.push(movingModel.id);
    } else {
      movingModel.xInches = inches(resolution.endpoint.xMilliInches);
      movingModel.yInches = inches(resolution.endpoint.yMilliInches);
      movingModel.isOnField = true;
    }
    placementSequence.push({
      order: placementSequence.length + 1,
      modelId: movingModel.id,
      outcome: resolution.outcome,
      endpoint: resolution.endpoint,
      prioritySatisfied: resolution.prioritySatisfied,
      withinThree: resolution.withinThree,
      outOfCoherency: resolution.outOfCoherency,
      linkGraphHash: resolution.linkGraph.linkGraphHash,
      searchReceiptHash: resolution.search.searchReceiptHash,
      linkedPlacementExists: resolution.search.linkedPlacementExists,
      withinThreeLinkedPlacementExists: resolution.search.withinThreeLinkedPlacementExists,
      minimumCenterDistanceMilliInches: resolution.search.minimumCenterDistanceMilliInches,
    });
  }
  const activeAfterPlacement = activeModels(movedPiece);
  const beyondThreeModelIds = activeAfterPlacement.filter((model) => !whollyWithinLeading(
    point(model),
    roundRadius(model),
    point(movedLeading),
    roundRadius(movedLeading),
  )).map((entry) => entry.id).sort((left, right) => left.localeCompare(right));
  const outOfCoherency = beyondThreeModelIds.length > 0;
  movedPiece.coherencyStatus = {
    schemaVersion: COHERENCY_STATUS_SCHEMA,
    status: outOfCoherency ? "out_of_coherency" : "in_coherency",
    isOutOfCoherency: outOfCoherency,
    determinedAt: {
      round: Number(state.round || 1),
      phase: "combat",
      repositionAction: "close_ranks",
    },
    leadingModelId,
    beyondThreeModelIds,
    casualtyModelIds: [...casualtyModelIds],
    trainingTruth: false,
  };
  const postMoveGraph = deriveOfficialEngagementGraphV2(movedState);
  const postEnemyUnitIds = enemyUnitIdsFor(postMoveGraph, movedPiece.id);
  const newEnemyUnitIds = postEnemyUnitIds.filter((unitId) => (
    !scope.phaseStartEnemyUnitIds.includes(unitId)
  ));
  if (newEnemyUnitIds.length > 0) fail("CLOSE_RANKS_NEW_ENGAGEMENT", newEnemyUnitIds.join(","));
  const disengagedEnemyUnitIds = scope.currentEnemyUnitIds.filter((unitId) => (
    !postEnemyUnitIds.includes(unitId)
  ));
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
    path,
    placements,
    placementSequence,
    casualtyModelIds,
    beyondThreeModelIds,
    outOfCoherency,
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

export function instantiateOfficialOutOfCoherencyCloseRanksV1(
  state,
  domain,
  parameters,
  options = {},
) {
  if (!object(domain)
    || domain.executorId !== OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_VERSION) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialOutOfCoherencyCloseRanksV1(state, options);
  const expectedDomain = current.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expectedDomain || !isDeepStrictEqual(domain, expectedDomain)) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_STALE");
  }
  if ([OFFICIAL_CLOSE_RANKS_PARAMETER_KIND, OFFICIAL_MULTI_MODEL_CLOSE_RANKS_PARAMETER_KIND]
    .includes(domain.parameterKind)) {
    const previous = instantiateOfficialMultiModelCloseRanksV1(
      state,
      toPreviousDomain(domain),
      parameters,
      options,
    );
    return { ...previous, action: rewriteAction(previous.action) };
  }
  if (domain.parameterKind !== OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_PARAMETER_KIND) {
    fail("CLOSE_RANKS_PARAMETER_DOMAIN_INVALID");
  }
  const validated = validateCustomPlan(state, domain, parameters, options);
  const previousDecline = enabledPreviousDecline(validated.movedState, domain, options);
  if (!previousDecline) fail("CLOSE_RANKS_POST_MOVE_ATTACK_UNAVAILABLE");
  const placementCounts = {
    enemyBaseContact: validated.placementSequence.filter((entry) => (
      entry.prioritySatisfied === "enemy_base_contact"
    )).length,
    friendlyFightingRankContact: validated.placementSequence.filter((entry) => (
      entry.prioritySatisfied === "friendly_fighting_rank_contact"
    )).length,
    coherencyOnlyWithinThree: validated.placementSequence.filter((entry) => (
      entry.prioritySatisfied === "coherency_only_within_three"
    )).length,
    closestLinkedOutOfCoherency: validated.placementSequence.filter((entry) => (
      entry.prioritySatisfied === "closest_linked_out_of_coherency"
    )).length,
    outsideThree: validated.placementSequence.filter((entry) => entry.outOfCoherency).length,
    casualty: validated.casualtyModelIds.length,
    pinned: 0,
  };
  const plan = {
    schemaVersion: PLAN_SCHEMA,
    leadingModelId: validated.leadingModelId,
    pinnedModelIds: [],
    phaseStartEngagementSnapshotHash: validated.snapshot.snapshotHash,
    preMoveEngagementGraphHash: validated.graph.graphHash,
    postMoveEngagementGraphHash: validated.postMoveGraph.graphHash,
    preMoveNearestEnemyEdgeDistanceMilliInches: Number(validated.beforeDistance.toFixed(3)),
    postMoveNearestEnemyEdgeDistanceMilliInches: Number(validated.afterDistance.toFixed(3)),
    canonicalPath: validated.path,
    placementSequence: validated.placementSequence,
    placementCounts,
    casualtyModelIds: validated.casualtyModelIds,
    beyondThreeModelIds: validated.beyondThreeModelIds,
    outOfCoherency: validated.outOfCoherency,
    postPlacementCurrentModels: validated.movedPiece.currentModels,
    postPlacementCurrentSupply: validated.movedPiece.currentSupply,
    supportedScope: "multi_model_round_base_ground_multi_unit_no_terrain_bounded_exact_lattice_v1",
  };
  const action = rewriteAction({
    ...actionCore(previousDecline),
    closeRanksMode: "move",
    combatPhaseStartEngagementSnapshotHash: validated.snapshot.snapshotHash,
    closeRanksPlan: plan,
  });
  const coherencyCasualtyEvent = validated.casualtyModelIds.length > 0 ? {
    type: "coherency_casualty",
    sideKey: domain.sideKey,
    pieceId: domain.pieceId,
    casualtyModelIds: validated.casualtyModelIds,
    postCurrentModels: validated.movedPiece.currentModels,
    postCurrentSupply: validated.movedPiece.currentSupply,
    reason: "no_legal_position_maintaining_coherency_link",
    trainingTruth: false,
  } : null;
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
      pinnedModelIds: [],
      phaseStartEngagementSnapshotHash: validated.snapshot.snapshotHash,
      preMoveEngagementGraphHash: validated.graph.graphHash,
      postMoveEngagementGraphHash: validated.postMoveGraph.graphHash,
      canonicalPath: clone(validated.path),
      placementSequence: clone(validated.placementSequence),
      placementCounts,
      postMoveInCoherency: !validated.outOfCoherency,
      outOfCoherency: validated.outOfCoherency,
      beyondThreeModelIds: validated.beyondThreeModelIds,
      casualtyModelIds: validated.casualtyModelIds,
      trainingTruth: false,
    },
    coherencyCasualtyEvent,
    rulesTruth: "official_close_ranks_closest_linked_fallback_out_of_coherency_and_casualty",
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
    schemaVersion: "starcraft_tmg_official_out_of_coherency_close_ranks_transition_v1",
    executorId: OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID,
    executorVersion: OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_VERSION,
    state,
    events,
    action: clone(resolvedAction),
    rulesTruth: "official_close_ranks_coherency_fallback_and_profile_bound_close_combat_subset",
    trainingTruth: false,
  };
}

export function applyOfficialOutOfCoherencyCloseRanksV1(state, action, options = {}) {
  if (!object(action)
    || action.actionType !== "fight"
    || action.executorId !== OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID
    || action.executorVersion !== OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_VERSION) {
    fail("CLOSE_RANKS_COMBAT_ACTION_INVALID");
  }
  if (action.closeRanksMode !== "move"
    || action.closeRanksPlan?.schemaVersion !== PLAN_SCHEMA) {
    const previousResult = applyOfficialMultiModelCloseRanksV1(
      state,
      toPreviousAction(action),
      options,
    );
    return finalizeResult(previousResult, action, clone(previousResult.events));
  }
  const enumeration = enumerateOfficialOutOfCoherencyCloseRanksV1(state, {
    sideKey: action.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_PARAMETER_KIND
      && entry.pieceId === action.pieceId
      && entry.targetId === action.targetId
      && entry.weaponName === action.weaponName
  ));
  if (!domain) fail("CLOSE_RANKS_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialOutOfCoherencyCloseRanksV1(state, domain, {
    leadingModelId: action.closeRanksPlan.leadingModelId,
    path: action.closeRanksPlan.canonicalPath?.points?.slice(1),
    placements: action.closeRanksPlan.placementSequence?.map((entry) => (
      entry.outcome === "casualty"
        ? { modelId: entry.modelId, outcome: "casualty" }
        : { modelId: entry.modelId, outcome: "placed", ...entry.endpoint }
    )),
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
  const events = [clone(instantiated.closeRanksEvent)];
  if (instantiated.coherencyCasualtyEvent) events.push(clone(instantiated.coherencyCasualtyEvent));
  events.push(...clone(attackResult.events));
  return finalizeResult(attackResult, action, events);
}
