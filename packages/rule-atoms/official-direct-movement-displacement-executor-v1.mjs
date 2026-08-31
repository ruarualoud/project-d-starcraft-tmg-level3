import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";

export const OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID =
  "authority.direct-movement-displacement-v1";
export const OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_TYPE =
  "resolve_direct_movement_displacement_procedure";
export const OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_PARAMETER_KIND =
  "official_direct_movement_displacement_choice_v1";
export const OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_PENDING_SCHEMA =
  "starcraft_tmg_official_direct_movement_displacement_pending_v1";

export const OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-displacement-contact-resolution:1c3c3c9e27d3",
  "rule-atom:singleton:core-11-displacement-overlap-permission:85a23337e437",
  "rule-atom:singleton:core-4-5-battlefield-edge-stop:c2f112c42a23",
  "rule-atom:singleton:core-4-5-blocked-direct-movement:8fc49ab3a64b",
  "rule-atom:singleton:core-4-5-direct-movement-endpoints:b14ff7361c01",
  "rule-atom:singleton:core-4-5-direct-movement-vector:db58894d82f0",
  "rule-atom:singleton:core-4-5-multi-model-away:2e49516c78ea",
  "rule-atom:singleton:core-4-5-multi-model-target-reference:15bf744fdd6a",
  "rule-atom:singleton:core-4-5-multi-model-towards:8b08f1c613eb",
].sort());
export const OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_ATOM_IDS =
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_NEW_ATOM_IDS;
export const OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ATOM_IDS =
  OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_NEW_ATOM_IDS;

const CONTACT_TOLERANCE = 1;
const MAX_ROUTE_OPTIONS = 64;
const MAX_PLACEMENT_PLANS = 256;
const MOVEMENT_TYPES = Object.freeze([
  "move", "deploy", "run", "charge", "disengage", "close_ranks", "special_ability",
]);

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
function hashBody(value, field) { return hashStarcraftTmgContract(without(value, [field])); }
function milli(value, code = "DIRECT_MOVEMENT_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}
function inches(value) { return Number((Number(value) / 1000).toFixed(3)); }
function point(value, code = "DIRECT_MOVEMENT_POINT_INVALID", detail = "") {
  if (!object(value)
    || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) fail(code, detail);
  return { xMilliInches: Number(value.xMilliInches),
    yMilliInches: Number(value.yMilliInches) };
}
function modelPoint(model) {
  return { xMilliInches: milli(model?.xInches), yMilliInches: milli(model?.yInches) };
}
function distance(left, right) {
  return Math.hypot(right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches);
}
function edgeDistance(left, leftRadius, right, rightRadius) {
  return distance(left, right) - leftRadius - rightRadius;
}
function samePoint(left, right) {
  return left.xMilliInches === right.xMilliInches
    && left.yMilliInches === right.yMilliInches;
}
function radius(model, code = "DIRECT_MOVEMENT_BASE_SCOPE_UNSUPPORTED") {
  const width = milli(model?.baseWidthInches, code, String(model?.id || ""));
  const depth = milli(model?.baseDepthInches ?? model?.baseWidthInches,
    code, String(model?.id || ""));
  if (String(model?.baseShape || "round").toLowerCase() !== "round"
    || width <= 0 || Math.abs(width - depth) > CONTACT_TOLERANCE) {
    fail(code, String(model?.id || ""));
  }
  return Math.round(width / 2);
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}
function verifySourceLock(state) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const bundle = state?.officialGameplayDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || bundle?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle?.repositoryFallbackAllowed !== false || bundle?.trainingTruth !== false) {
    fail("DIRECT_MOVEMENT_SOURCE_LOCK_BINDING_INVALID");
  }
}
function withinBoard(state, endpoint, baseRadius) {
  const maxX = milli(state.board?.widthInches);
  const maxY = milli(state.board?.heightInches);
  return endpoint.xMilliInches >= baseRadius
    && endpoint.xMilliInches <= maxX - baseRadius
    && endpoint.yMilliInches >= baseRadius
    && endpoint.yMilliInches <= maxY - baseRadius;
}
function allModelRows(state) {
  return (state.pieces || []).filter(activePiece).flatMap((piece) => (
    activeModels(piece).map((model) => ({ kind: "model", objectId: model.id,
      unitId: piece.id, sideKey: piece.sideKey, model, point: modelPoint(model),
      radius: radius(model), displacement: model.displacement === true
        || piece.displacement === true }))
  ));
}
function allTokenRows(state) {
  return (state.board?.tokens || []).filter((token) => (
    token?.isRemoved !== true && token?.isDestroyed !== true
  )).map((token) => ({ kind: "token", objectId: String(token.id || ""), token,
    point: { xMilliInches: milli(token.xInches), yMilliInches: milli(token.yInches) },
    radius: radius(token), displacement: token.displacement === true }));
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase, activeSideKey: state.activeSideKey,
    pieces: (state.pieces || []).map((piece) => without(piece, [
      "usedActiveAbilities", "usedReactions", "selectedUpgrades", "abilities",
    ])),
    board: without(state.board || {}, ["centerMarkers"]),
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}
function routeLength(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.round(distance(points[index - 1], points[index]));
  }
  return total;
}
function directionVector(start, reference, direction) {
  const multiplier = direction === "directly_towards" ? 1 : -1;
  const dx = reference.xMilliInches - start.xMilliInches;
  const dy = reference.yMilliInches - start.yMilliInches;
  if (dx === 0 && dy === 0) fail("DIRECT_MOVEMENT_REFERENCE_COINCIDENT");
  return { dx: dx * multiplier, dy: dy * multiplier };
}
function collinearForward(start, endpoint, vector) {
  const dx = endpoint.xMilliInches - start.xMilliInches;
  const dy = endpoint.yMilliInches - start.yMilliInches;
  return (BigInt(dx) * BigInt(vector.dy)) === (BigInt(dy) * BigInt(vector.dx))
    && (dx * vector.dx) + (dy * vector.dy) >= 0;
}
function segmentParallelForward(start, end, vector) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  return (BigInt(dx) * BigInt(vector.dy)) === (BigInt(dy) * BigInt(vector.dx))
    && (dx * vector.dx) + (dy * vector.dy) > 0;
}
function distanceToTargetUnit(endpoint, movingRadius, targetModels) {
  return Math.min(...targetModels.map((model) => edgeDistance(
    endpoint, movingRadius, modelPoint(model), radius(model),
  )));
}
function eligibleLeadingModelIds(actor, target) {
  const targetModels = activeModels(target);
  const rows = activeModels(actor).map((model) => ({ id: model.id,
    distance: distanceToTargetUnit(modelPoint(model), radius(model), targetModels) }));
  const minimum = Math.min(...rows.map((entry) => entry.distance));
  return rows.filter((entry) => Math.abs(entry.distance - minimum) <= CONTACT_TOLERANCE)
    .map((entry) => entry.id).sort();
}
function eligibleReferenceModelIds(leadingModel, target, direction) {
  const start = modelPoint(leadingModel);
  const movingRadius = radius(leadingModel);
  const rows = activeModels(target).map((model) => ({ id: model.id,
    distance: edgeDistance(start, movingRadius, modelPoint(model), radius(model)) }));
  const selected = direction === "directly_towards"
    ? Math.min(...rows.map((entry) => entry.distance))
    : Math.max(...rows.map((entry) => entry.distance));
  return rows.filter((entry) => Math.abs(entry.distance - selected) <= CONTACT_TOLERANCE)
    .map((entry) => entry.id).sort();
}
function canonicalRoute(state, actor, target, input, profile) {
  const routeId = String(input?.routeId || "").trim();
  const leadingModel = activeModels(actor).find((model) => model.id === input?.leadingModelId);
  const referenceModel = activeModels(target).find((model) => (
    model.id === input?.targetReferenceModelId
  ));
  if (!routeId || !leadingModel || !referenceModel
    || !profile.eligibleLeadingModelIds.includes(leadingModel.id)
    || !eligibleReferenceModelIds(leadingModel, target, profile.direction)
      .includes(referenceModel.id)) fail("DIRECT_MOVEMENT_ROUTE_REFERENCE_INVALID", routeId);
  const points = (input?.points || []).map((entry, index) => (
    point(entry, "DIRECT_MOVEMENT_ROUTE_POINT_INVALID", `${routeId}/${index}`)
  ));
  if (points.length < 2 || points.length > 64
    || !samePoint(points[0], modelPoint(leadingModel))) {
    fail("DIRECT_MOVEMENT_ROUTE_PATH_INVALID", routeId);
  }
  const endpoint = points.at(-1);
  const movingRadius = radius(leadingModel);
  if (!withinBoard(state, endpoint, movingRadius)) {
    fail("DIRECT_MOVEMENT_ROUTE_OUTSIDE_BATTLEFIELD", routeId);
  }
  const vector = directionVector(points[0], modelPoint(referenceModel), profile.direction);
  const blockedByIds = [...new Set((input.blockedByIds || []).map(String))].sort();
  if (blockedByIds.length === 0) {
    if (points.length !== 2 || !collinearForward(points[0], endpoint, vector)) {
      fail("DIRECT_MOVEMENT_VECTOR_INVALID", routeId);
    }
  } else if (input.pathGeometryCertified !== true
    || input.continuesOriginalDirectionAfterBypass !== true
    || points.length < 3
    || !segmentParallelForward(points[0], points[1], vector)
    || !segmentParallelForward(points.at(-2), points.at(-1), vector)) {
    fail("DIRECT_MOVEMENT_BYPASS_CERTIFICATE_INVALID", routeId);
  }
  const movementDistanceMilliInches = routeLength(points);
  if (movementDistanceMilliInches > profile.maxDistanceMilliInches) {
    fail("DIRECT_MOVEMENT_DISTANCE_EXCEEDED", routeId);
  }
  const startDistance = edgeDistance(points[0], movingRadius,
    modelPoint(referenceModel), radius(referenceModel));
  const endDistance = edgeDistance(endpoint, movingRadius,
    modelPoint(referenceModel), radius(referenceModel));
  if ((profile.direction === "directly_towards"
      && endDistance > startDistance + CONTACT_TOLERANCE)
    || (profile.direction === "directly_away"
      && endDistance < startDistance - CONTACT_TOLERANCE)) {
    fail("DIRECT_MOVEMENT_ENDPOINT_RELATION_INVALID", routeId);
  }
  const edgeStop = input.edgeStop === true;
  if (edgeStop) {
    const maxX = milli(state.board.widthInches) - movingRadius;
    const maxY = milli(state.board.heightInches) - movingRadius;
    if (endpoint.xMilliInches !== movingRadius && endpoint.xMilliInches !== maxX
      && endpoint.yMilliInches !== movingRadius && endpoint.yMilliInches !== maxY) {
      fail("DIRECT_MOVEMENT_EDGE_CONTACT_REQUIRED", routeId);
    }
  }
  const overlappedObjectIds = [...new Set((input.overlappedObjectIds || []).map(String))]
    .sort();
  if (overlappedObjectIds.length > 1) {
    fail("DIRECT_MOVEMENT_MULTI_DISPLACEMENT_SCOPE_UNSUPPORTED", routeId);
  }
  return { routeId, leadingModelId: leadingModel.id,
    targetReferenceModelId: referenceModel.id, points, endpoint,
    movementDistanceMilliInches, blockedByIds, edgeStop,
    overlappedObjectIds, routeHash: "" };
}
function placementRows(state, actor, target, route, planInput, direction) {
  const placementPlanId = String(planInput?.placementPlanId || "").trim();
  const remaining = new Set(activeModels(actor).map((model) => model.id)
    .filter((id) => id !== route.leadingModelId));
  if (!placementPlanId || !Array.isArray(planInput?.placements)
    || planInput.placements.length !== remaining.size) {
    fail("DIRECT_MOVEMENT_PLACEMENT_DENOMINATOR_INVALID", placementPlanId);
  }
  const records = allModelRows(state).filter((row) => row.unitId !== actor.id);
  const tokenRows = allTokenRows(state);
  const leading = activeModels(actor).find((model) => model.id === route.leadingModelId);
  const deployed = [{ modelId: leading.id, point: route.endpoint,
    radius: radius(leading), distanceToTarget: distanceToTargetUnit(
      route.endpoint, radius(leading), activeModels(target)) }];
  for (const raw of planInput.placements) {
    const modelId = String(raw?.modelId || "").trim();
    const model = activeModels(actor).find((entry) => entry.id === modelId);
    if (!model || !remaining.delete(modelId)) {
      fail("DIRECT_MOVEMENT_PLACEMENT_MODEL_INVALID", modelId);
    }
    const endpoint = point(raw, "DIRECT_MOVEMENT_PLACEMENT_POINT_INVALID", modelId);
    const modelRadius = radius(model);
    if (!withinBoard(state, endpoint, modelRadius)) {
      fail("DIRECT_MOVEMENT_PLACEMENT_OUTSIDE_BATTLEFIELD", modelId);
    }
    deployed.push({ modelId, point: endpoint, radius: modelRadius,
      distanceToTarget: distanceToTargetUnit(endpoint, modelRadius, activeModels(target)) });
  }
  const allBlockers = [...records, ...tokenRows];
  for (let left = 0; left < deployed.length; left += 1) {
    for (let right = left + 1; right < deployed.length; right += 1) {
      if (edgeDistance(deployed[left].point, deployed[left].radius,
        deployed[right].point, deployed[right].radius) < -CONTACT_TOLERANCE) {
        fail("DIRECT_MOVEMENT_PLACEMENT_OVERLAP", placementPlanId);
      }
    }
    for (const blocker of allBlockers) {
      if (deployed[left].modelId === route.leadingModelId
        && route.overlappedObjectIds.includes(blocker.objectId)) continue;
      if (edgeDistance(deployed[left].point, deployed[left].radius,
        blocker.point, blocker.radius) < -CONTACT_TOLERANCE) {
        fail("DIRECT_MOVEMENT_PLACEMENT_OVERLAP", `${placementPlanId}/${blocker.objectId}`);
      }
    }
  }
  const leadingRow = deployed[0];
  if (deployed.slice(1).some((entry) => edgeDistance(
    entry.point, entry.radius, leadingRow.point, leadingRow.radius,
  ) > 3000 + CONTACT_TOLERANCE)) {
    fail("DIRECT_MOVEMENT_COHERENCY_REQUIRED", placementPlanId);
  }
  const priorityVector = deployed.slice(1).map((entry) => (
    Number(entry.distanceToTarget.toFixed(3))
  )).sort((left, right) => direction === "directly_towards" ? left - right : right - left);
  return { placementPlanId, placements: deployed.slice(1).map((entry) => ({
    modelId: entry.modelId, ...entry.point,
  })).sort((left, right) => left.modelId.localeCompare(right.modelId)),
  priorityVector, planHash: "" };
}
function dominates(left, right, direction) {
  let strict = false;
  for (let index = 0; index < left.priorityVector.length; index += 1) {
    const l = left.priorityVector[index];
    const r = right.priorityVector[index];
    if (direction === "directly_towards" ? l > r + CONTACT_TOLERANCE
      : l < r - CONTACT_TOLERANCE) return false;
    if (direction === "directly_towards" ? l < r - CONTACT_TOLERANCE
      : l > r + CONTACT_TOLERANCE) strict = true;
  }
  return strict;
}
function displacementRow(state, objectId) {
  return [...allModelRows(state), ...allTokenRows(state)]
    .find((entry) => entry.objectId === objectId);
}
function canonicalContactOptions(state, route, input = []) {
  if (route.overlappedObjectIds.length === 0) return [{ contactOptionId: "none",
    objectId: null, endpoint: null, baseContact: false, separation: null }];
  const objectId = route.overlappedObjectIds[0];
  const row = displacementRow(state, objectId);
  if (!row || row.displacement !== true) {
    fail("DIRECT_MOVEMENT_DISPLACEMENT_OBJECT_INVALID", objectId);
  }
  const leading = allModelRows(state).find((entry) => entry.objectId === route.leadingModelId);
  if (edgeDistance(route.endpoint, leading.radius, row.point, row.radius)
    >= -CONTACT_TOLERANCE) fail("DIRECT_MOVEMENT_DISPLACEMENT_OVERLAP_REQUIRED", objectId);
  if (!Array.isArray(input) || input.length === 0 || input.length > 128) {
    fail("DIRECT_MOVEMENT_DISPLACEMENT_CONTACT_OPTIONS_INVALID", objectId);
  }
  const options = input.map((raw) => {
    const contactOptionId = String(raw?.contactOptionId || "").trim();
    const endpoint = point(raw, "DIRECT_MOVEMENT_DISPLACEMENT_CONTACT_POINT_INVALID",
      contactOptionId);
    if (!contactOptionId || !withinBoard(state, endpoint, row.radius)) {
      fail("DIRECT_MOVEMENT_DISPLACEMENT_CONTACT_POINT_INVALID", contactOptionId);
    }
    const separation = edgeDistance(endpoint, row.radius, route.endpoint, leading.radius);
    const baseContact = Math.abs(separation) <= CONTACT_TOLERANCE;
    if (separation < -CONTACT_TOLERANCE) {
      fail("DIRECT_MOVEMENT_DISPLACEMENT_CONTACT_OVERLAP", contactOptionId);
    }
    return { contactOptionId, objectId, endpoint,
      baseContact, separation: Number(separation.toFixed(3)) };
  });
  const contacts = options.filter((entry) => entry.baseContact);
  if (contacts.length > 0) return contacts.sort((a, b) => a.contactOptionId.localeCompare(b.contactOptionId));
  const minimum = Math.min(...options.map((entry) => entry.separation));
  return options.filter((entry) => Math.abs(entry.separation - minimum) <= CONTACT_TOLERANCE)
    .sort((a, b) => a.contactOptionId.localeCompare(b.contactOptionId));
}

export function openOfficialDirectMovementDisplacementPendingV1(stateInput, procedure = {}) {
  const state = clone(stateInput);
  verifySourceLock(state);
  if (state.rulesProcedureMode !== true || state.pendingAction
    || procedure.involuntaryMovement !== true
    || !MOVEMENT_TYPES.includes(procedure.movementType)
    || !["directly_towards", "directly_away"].includes(procedure.direction)
    || procedure.candidateRoutesComplete !== true
    || procedure.candidatePlacementPlansComplete !== true
    || procedure.displacementContactOptionsComplete !== true) {
    fail("DIRECT_MOVEMENT_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const actor = state.pieces?.find((piece) => piece.id === procedure.actorUnitId);
  const target = state.pieces?.find((piece) => piece.id === procedure.targetUnitId);
  if (!activePiece(actor) || !activePiece(target) || actor.id === target.id
    || actor.sideKey !== String(procedure.sideKey || state.activeSideKey)) {
    fail("DIRECT_MOVEMENT_ACTOR_OR_TARGET_INVALID");
  }
  const maxDistanceMilliInches = Number(procedure.maxDistanceMilliInches);
  if (!Number.isSafeInteger(maxDistanceMilliInches) || maxDistanceMilliInches <= 0) {
    fail("DIRECT_MOVEMENT_DISTANCE_INVALID");
  }
  const profile = { direction: procedure.direction, maxDistanceMilliInches,
    eligibleLeadingModelIds: eligibleLeadingModelIds(actor, target) };
  if (!Array.isArray(procedure.routeOptions) || procedure.routeOptions.length === 0
    || procedure.routeOptions.length > MAX_ROUTE_OPTIONS) {
    fail("DIRECT_MOVEMENT_ROUTE_OPTIONS_INVALID");
  }
  const routes = procedure.routeOptions.map((entry) => canonicalRoute(
    state, actor, target, entry, profile,
  ));
  if (new Set(routes.map((entry) => entry.routeId)).size !== routes.length) {
    fail("DIRECT_MOVEMENT_ROUTE_OPTIONS_INVALID");
  }
  for (const route of routes) route.routeHash = hashStarcraftTmgContract(without(route,
    ["routeHash"]));
  const shortestRoutes = routes.filter((route) => {
    const peers = routes.filter((entry) => entry.leadingModelId === route.leadingModelId
      && entry.targetReferenceModelId === route.targetReferenceModelId
      && samePoint(entry.endpoint, route.endpoint));
    const shortest = Math.min(...peers.map((entry) => entry.movementDistanceMilliInches));
    return route.movementDistanceMilliInches === shortest;
  });
  if (!Array.isArray(procedure.placementPlans) || procedure.placementPlans.length === 0
    || procedure.placementPlans.length > MAX_PLACEMENT_PLANS) {
    fail("DIRECT_MOVEMENT_PLACEMENT_PLANS_INVALID");
  }
  const plansByRoute = new Map();
  for (const route of shortestRoutes) {
    const plans = procedure.placementPlans.filter((entry) => entry.routeId === route.routeId)
      .map((entry) => placementRows(state, actor, target, route, entry, profile.direction));
    if (plans.length === 0 || new Set(plans.map((entry) => entry.placementPlanId)).size
      !== plans.length) fail("DIRECT_MOVEMENT_PLACEMENT_PLANS_INVALID", route.routeId);
    for (const plan of plans) plan.planHash = hashStarcraftTmgContract(without(plan,
      ["planHash"]));
    plansByRoute.set(route.routeId, plans.filter((candidate) => !plans.some((other) => (
      other !== candidate && dominates(other, candidate, profile.direction)
    ))));
  }
  const choices = [];
  for (const route of shortestRoutes) {
    const contactOptions = canonicalContactOptions(state, route,
      (procedure.displacementContactOptions || []).filter((entry) => (
        route.overlappedObjectIds.includes(entry.objectId)
      )));
    for (const plan of plansByRoute.get(route.routeId)) {
      for (const contact of contactOptions) {
        const body = { route, placementPlan: plan, displacementContact: contact };
        choices.push({ choiceId: `direct-${hashStarcraftTmgContract(body)}`,
          ...clone(body) });
      }
    }
  }
  if (choices.length === 0) fail("DIRECT_MOVEMENT_NO_LEGAL_CHOICE");
  const body = {
    schema: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_PENDING_SCHEMA,
    stage: "choose_shortest_route_placement_and_displacement_contact",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    actorUnitId: actor.id, targetUnitId: target.id,
    direction: profile.direction, movementType: procedure.movementType,
    maxDistanceMilliInches, eligibleLeadingModelIds: profile.eligibleLeadingModelIds,
    choices: choices.sort((a, b) => a.choiceId.localeCompare(b.choiceId)),
    geometryCertificate: { candidateRoutesComplete: true,
      candidatePlacementPlansComplete: true, displacementContactOptionsComplete: true,
      continuousGeometryAuthority: "content_bound_external_geometry_certificate",
      productionQuarantined: true },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    stateProjectionHash: "", productionQuarantined: true, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state) {
  verifySourceLock(state);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.geometryCertificate?.candidateRoutesComplete !== true
    || pending.geometryCertificate?.candidatePlacementPlansComplete !== true
    || pending.geometryCertificate?.displacementContactOptionsComplete !== true
    || pending.productionQuarantined !== true || pending.trainingTruth !== false) {
    fail("DIRECT_MOVEMENT_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state);
  const choiceIds = pending.choices.map((entry) => entry.choiceId);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_TYPE,
    pieceId: pending.actorUnitId,
    executorId: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID,
    executorVersion: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: choiceIds }, selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      direction: pending.direction, movementType: pending.movementType,
      maxDistanceMilliInches: pending.maxDistanceMilliInches,
      eligibleLeadingModelIds: pending.eligibleLeadingModelIds,
      choices: clone(pending.choices), productionQuarantined: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_direct_movement_displacement_procedure_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}
export function enumerateOfficialDirectMovementDisplacementV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try { parameterDomains.push(domainFor(state, options)); } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_TYPE,
      executorId: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID,
      executorVersion: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}
export function instantiateOfficialDirectMovementDisplacementV1(
  state, domain, parameters, options = {},
) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("DIRECT_MOVEMENT_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string") fail("DIRECT_MOVEMENT_CHOICE_INVALID");
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  if (!choice) fail("DIRECT_MOVEMENT_CHOICE_INVALID");
  const movePlan = { schema: "starcraft_tmg_official_direct_movement_plan_v1",
    choiceId: choice.choiceId, routeHash: choice.route.routeHash,
    placementPlanHash: choice.placementPlan.planHash,
    displacementContactOptionId: choice.displacementContact.contactOptionId,
    pendingHash: state.pendingAction.pendingHash };
  return { action: {
    actionType: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: expected.pieceId,
    to: { xInches: inches(choice.route.endpoint.xMilliInches),
      yInches: inches(choice.route.endpoint.yMilliInches) },
    movePlan, domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_ATOM_IDS],
    executorId: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID,
    executorVersion: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { productionQuarantined: true, trainingTruth: false },
  }, canonicalParameters: { choiceId: choice.choiceId } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
function moveDisplacementObject(state, contact) {
  if (!contact.objectId) return null;
  const token = (state.board?.tokens || []).find((entry) => entry.id === contact.objectId);
  if (token) {
    token.xInches = inches(contact.endpoint.xMilliInches);
    token.yInches = inches(contact.endpoint.yMilliInches);
    return { kind: "token", objectId: token.id };
  }
  for (const piece of state.pieces || []) {
    const model = (piece.models || []).find((entry) => entry.id === contact.objectId);
    if (!model) continue;
    model.xInches = inches(contact.endpoint.xMilliInches);
    model.yInches = inches(contact.endpoint.yMilliInches);
    return { kind: "model", objectId: model.id, unitId: piece.id };
  }
  fail("DIRECT_MOVEMENT_DISPLACEMENT_OBJECT_INVALID", contact.objectId);
}
export function applyOfficialDirectMovementDisplacementV1(
  stateInput, actionInput, options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_ACTION_ATOM_IDS])) {
    fail("DIRECT_MOVEMENT_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.movePlan?.choiceId;
  const expected = instantiateOfficialDirectMovementDisplacementV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("DIRECT_MOVEMENT_ACTION_STALE");
  }
  const pending = verifyPending(stateInput);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput);
  state.pendingAction = null;
  const actor = state.pieces.find((piece) => piece.id === pending.actorUnitId);
  const leading = activeModels(actor).find((model) => model.id === choice.route.leadingModelId);
  leading.xInches = inches(choice.route.endpoint.xMilliInches);
  leading.yInches = inches(choice.route.endpoint.yMilliInches);
  for (const placement of choice.placementPlan.placements) {
    const model = activeModels(actor).find((entry) => entry.id === placement.modelId);
    model.xInches = inches(placement.xMilliInches);
    model.yInches = inches(placement.yMilliInches);
  }
  const displaced = moveDisplacementObject(state, choice.displacementContact);
  const result = {
    schema: "starcraft_tmg_official_direct_movement_displacement_resolution_v1",
    actorUnitId: actor.id, targetUnitId: pending.targetUnitId,
    direction: pending.direction, movementType: pending.movementType,
    leadingModelId: choice.route.leadingModelId,
    targetReferenceModelId: choice.route.targetReferenceModelId,
    routeId: choice.route.routeId, routeHash: choice.route.routeHash,
    blockedByIds: choice.route.blockedByIds,
    movementDistanceMilliInches: choice.route.movementDistanceMilliInches,
    endpoint: choice.route.endpoint, edgeStop: choice.route.edgeStop,
    placementPlanId: choice.placementPlan.placementPlanId,
    placementPriorityVector: choice.placementPlan.priorityVector,
    displaced, displacementContactOptionId: choice.displacementContact.contactOptionId,
    displacementBaseContact: choice.displacementContact.baseContact,
    displacementNearestSeparationMilliInches: choice.displacementContact.separation,
    productionQuarantined: true, trainingTruth: false,
  };
  state.lastDirectMovementDisplacementResolution = result;
  const event = { type: "direct_movement_displacement_resolved",
    sideKey: actor.sideKey, actorUnitId: actor.id, result: clone(result),
    trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "direct_movement_displacement_resolution",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_direct_movement_displacement_transition_v1",
    executorId: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_ID,
    executorVersion: OFFICIAL_DIRECT_MOVEMENT_DISPLACEMENT_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_direct_movement_displacement_procedure_resolved",
    trainingTruth: false };
}
