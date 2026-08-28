import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from "../source-data/official-combat-profile-bundle-v1.mjs";
import {
  applyOfficialDisengageV1,
  enumerateOfficialDisengageV1,
  instantiateOfficialDisengageV1,
  OFFICIAL_DISENGAGE_ACTION_ATOM_IDS,
  OFFICIAL_DISENGAGE_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_EXECUTOR_VERSION,
  OFFICIAL_DISENGAGE_NEW_ATOM_IDS,
} from "./official-disengage-executor-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from "./official-round-supply-state-v1.mjs";
import {
  recordOfficialSupplyLossesV1,
  verifyOfficialSupplyLossLedgerV1,
} from "./official-supply-loss-ledger-v1.mjs";

export const OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID = "authority.disengage-v2";
export const OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_DISENGAGE_CASUALTY_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND = "official_disengage_path_v2";

const PLAN_SCHEMA = "starcraft_tmg_official_disengage_plan_v2";
const FEASIBILITY_SCHEMA = "starcraft_tmg_disengage_endpoint_feasibility_receipt_v1";
const CONTACT_TOLERANCE_MILLI_INCHES = 1;
const COHERENCY_RANGE_MILLI_INCHES = 3000;
const ENGAGEMENT_RANGE_MILLI_INCHES = 1000;
const MAX_FEASIBILITY_COLUMNS = 10_001;

export const OFFICIAL_DISENGAGE_CASUALTY_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-8-5-4-failed-models-destroyed:aa3f5e852977",
  "rule-atom:singleton:core-8-5-4-leading-model-disengage-failure:1818a24e7039",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_DISENGAGE_NEW_ATOM_IDS,
    ...OFFICIAL_DISENGAGE_CASUALTY_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_DISENGAGE_CASUALTY_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_DISENGAGE_ACTION_ATOM_IDS,
    ...OFFICIAL_DISENGAGE_CASUALTY_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

function clone(value) {
  return structuredClone(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function rewriteDomain(domain) {
  const core = {
    ...without(clone(domain), ["domainId"]),
    parameterKind: OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND,
    executorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_DISENGAGE_CASUALTY_ACTION_ATOM_IDS],
    parameterSchema: {
      ...clone(domain.parameterSchema),
      required: ["leadingModelId", "leadingOutcome", "path", "placements"],
      leadingOutcome: ["placed", "casualty"],
      placementOutcome: ["placed", "casualty"],
      placementOrderSemantics:
        "placed-models-resolve-in-submitted-order-casualty-requires-rules-owned-proof",
      exactRemainingPlacementCount: "zero-on-leading-casualty-otherwise-model-count-minus-one",
    },
    constraints: {
      ...clone(domain.constraints),
      geometryScope:
        "gauntlet_round_base_ground_no_terrain_disengage_with_conservative_exact_casualty_proof_v2",
      casualtyProofMode: "complete_bounded_milli_inch_interval_union_superset_v1",
      casualtyScoringAttribution: "unresolved_official_source_not_scoreable",
    },
    rulesTruth: "official_gauntlet_marine_disengage_casualty_parameter_domain",
    trainingTruth: false,
  };
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

function rewriteCandidate(candidate) {
  return {
    ...clone(candidate),
    executorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_DISENGAGE_CASUALTY_ACTION_ATOM_IDS],
    details: {
      ...(candidate.details || {}),
      rulesTruth: "official_disengage_casualty_fail_closed",
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialDisengageCasualtyV1(state, options = {}) {
  const previous = enumerateOfficialDisengageV1(state, options);
  return {
    candidates: previous.candidates.map(rewriteCandidate),
    parameterDomains: previous.parameterDomains.map(rewriteDomain),
  };
}

export function toHistoricalDisengageDomainV1(state, domain, options = {}) {
  const previous = enumerateOfficialDisengageV1(state, {
    ...options,
    sideKey: domain?.sideKey,
    includeDisabled: true,
  });
  return previous.parameterDomains.find((entry) => (
    entry.pieceId === domain?.pieceId
      && entry.executorId === OFFICIAL_DISENGAGE_EXECUTOR_ID
      && entry.executorVersion === OFFICIAL_DISENGAGE_EXECUTOR_VERSION
  ));
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function safePoint(value, code = "DISENGAGE_PLACEMENT_POINT_INVALID", detail = "") {
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

function milli(value, code = "DISENGAGE_MODEL_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}

function inches(value) {
  return Number((Number(value) / 1000).toFixed(3));
}

function point(model) {
  return {
    xMilliInches: milli(model?.xInches, "DISENGAGE_MODEL_GEOMETRY_INVALID", model?.id),
    yMilliInches: milli(model?.yInches, "DISENGAGE_MODEL_GEOMETRY_INVALID", model?.id),
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

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}

function modelRows(state) {
  return (state.pieces || []).filter((piece) => (
    piece?.isOnField === true
      && piece?.isDestroyed !== true
      && Number(piece?.currentModels || 0) > 0
  )).flatMap((piece) => activeModels(piece).map((model) => ({
    sideKey: piece.sideKey,
    pieceId: piece.id,
    modelId: model.id,
    point: point(model),
    radius: Math.round(milli(model.baseWidthInches) / 2),
  })));
}

function canonicalPath(start, raw) {
  if (!Array.isArray(raw) || raw.length === 0) fail("DISENGAGE_PATH_REQUIRED");
  if (raw.length > 64) fail("DISENGAGE_PATH_TOO_COMPLEX");
  const normalized = [start];
  for (const [index, value] of raw.entries()) {
    const next = safePoint(value, "DISENGAGE_PATH_POINT_INVALID", String(index));
    if (!pointEquals(normalized.at(-1), next)) normalized.push(next);
  }
  if (normalized.length < 2) fail("DISENGAGE_PATH_MUST_CHANGE_POSITION");
  const points = [];
  for (const value of normalized) {
    while (points.length >= 2 && collinear(points.at(-2), points.at(-1), value)) points.pop();
    points.push(value);
  }
  if (points.length > 32) fail("DISENGAGE_PATH_TOO_COMPLEX");
  let distanceMilliInches = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceMilliInches += Math.round(distance(points[index - 1], points[index]));
  }
  return {
    schemaVersion: "starcraft_tmg_official_disengage_path_v1",
    unit: "milli-inch",
    points,
    distanceMilliInches,
  };
}

function battlefieldPoint(pointValue, domain, code) {
  const radius = Math.round(domain.constraints.baseDiameterMilliInches / 2);
  if (pointValue.xMilliInches < radius
    || pointValue.xMilliInches > domain.constraints.battlefieldWidthMilliInches - radius
    || pointValue.yMilliInches < radius
    || pointValue.yMilliInches > domain.constraints.battlefieldHeightMilliInches - radius) {
    fail(code);
  }
}

function validateLeadingPath(state, domain, path) {
  if (path.distanceMilliInches > domain.constraints.maxDistanceMilliInches) {
    fail("DISENGAGE_PATH_EXCEEDS_SPEED");
  }
  for (const pointValue of path.points.slice(1)) {
    battlefieldPoint(pointValue, domain, "DISENGAGE_PATH_OUTSIDE_BATTLEFIELD");
  }
  const movingRadius = Math.round(domain.constraints.baseDiameterMilliInches / 2);
  const blockers = modelRows(state).filter((row) => row.pieceId !== domain.pieceId);
  for (let index = 1; index < path.points.length; index += 1) {
    for (const blocker of blockers) {
      if (pointToSegmentDistance(blocker.point, path.points[index - 1], path.points[index])
        < movingRadius + blocker.radius - CONTACT_TOLERANCE_MILLI_INCHES) {
        fail("DISENGAGE_PATH_COLLISION", blocker.modelId);
      }
    }
  }
}

function forbiddenInterval(center, x, threshold, inclusive) {
  const dx = x - center.xMilliInches;
  const remaining = (threshold * threshold) - (dx * dx);
  if (inclusive ? remaining < 0 : remaining <= 0) return null;
  const extent = inclusive
    ? Math.floor(Math.sqrt(remaining))
    : Math.ceil(Math.sqrt(remaining)) - 1;
  if (extent < 0) return null;
  return [center.yMilliInches - extent, center.yMilliInches + extent];
}

function firstUncoveredInteger(minimum, maximum, intervals) {
  let cursor = minimum;
  for (const [rawStart, rawEnd] of intervals
    .map(([start, end]) => [Math.max(minimum, start), Math.min(maximum, end)])
    .filter(([start, end]) => start <= end)
    .sort((left, right) => left[0] - right[0] || left[1] - right[1])) {
    if (rawStart > cursor) return cursor;
    cursor = Math.max(cursor, rawEnd + 1);
    if (cursor > maximum) return null;
  }
  return cursor <= maximum ? cursor : null;
}

function endpointFeasibility(state, domain, input) {
  const center = safePoint(input.center, "DISENGAGE_CASUALTY_PROOF_SCOPE_UNSUPPORTED");
  const regionRadius = Number(input.regionRadiusMilliInches);
  const movingRadius = Math.round(domain.constraints.baseDiameterMilliInches / 2);
  if (!Number.isSafeInteger(regionRadius) || regionRadius < 0) {
    fail("DISENGAGE_CASUALTY_PROOF_SCOPE_UNSUPPORTED");
  }
  const boardMinX = movingRadius;
  const boardMaxX = domain.constraints.battlefieldWidthMilliInches - movingRadius;
  const boardMinY = movingRadius;
  const boardMaxY = domain.constraints.battlefieldHeightMilliInches - movingRadius;
  const minX = Math.max(boardMinX, center.xMilliInches - regionRadius);
  const maxX = Math.min(boardMaxX, center.xMilliInches + regionRadius);
  const xColumnCount = maxX - minX + 1;
  if (!Number.isSafeInteger(xColumnCount)
    || xColumnCount <= 0
    || xColumnCount > MAX_FEASIBILITY_COLUMNS) {
    fail("DISENGAGE_CASUALTY_PROOF_SCOPE_UNSUPPORTED", String(xColumnCount));
  }
  const blockers = modelRows(state).filter((row) => row.modelId !== input.movingModelId);
  let firstCandidate = null;
  let visitedColumns = 0;
  let forbiddenIntervalCount = 0;
  for (let x = minX; x <= maxX; x += 1) {
    visitedColumns += 1;
    const dx = x - center.xMilliInches;
    const regionRemaining = (regionRadius * regionRadius) - (dx * dx);
    if (regionRemaining < 0) continue;
    const yExtent = Math.floor(Math.sqrt(regionRemaining));
    const minY = Math.max(boardMinY, center.yMilliInches - yExtent);
    const maxY = Math.min(boardMaxY, center.yMilliInches + yExtent);
    if (minY > maxY) continue;
    const intervals = [];
    for (const blocker of blockers) {
      const enemy = blocker.sideKey !== domain.sideKey;
      const threshold = movingRadius + blocker.radius + (
        enemy ? ENGAGEMENT_RANGE_MILLI_INCHES : -CONTACT_TOLERANCE_MILLI_INCHES
      );
      const interval = forbiddenInterval(blocker.point, x, threshold, enemy);
      if (interval) intervals.push(interval);
    }
    forbiddenIntervalCount += intervals.length;
    const y = firstUncoveredInteger(minY, maxY, intervals);
    if (y !== null) {
      firstCandidate = { xMilliInches: x, yMilliInches: y };
      break;
    }
  }
  const body = {
    schema: FEASIBILITY_SCHEMA,
    proofMode: "complete_bounded_milli_inch_interval_union_superset_v1",
    proofKind: String(input.proofKind || ""),
    coordinateUnit: "milli-inch",
    center,
    regionRadiusMilliInches: regionRadius,
    movingModelId: String(input.movingModelId || ""),
    baseRadiusMilliInches: movingRadius,
    engagementRangeMilliInches: ENGAGEMENT_RANGE_MILLI_INCHES,
    xColumnCount,
    visitedColumns,
    forbiddenIntervalCount,
    blockerSnapshotHash: hashStarcraftTmgContract(blockers),
    physicalEndpointExists: firstCandidate !== null,
    firstPhysicalEndpoint: firstCandidate,
    proofScope:
      "board-and-within-region-endpoints-minus-base-overlap-and-enemy-engagement-only",
    trainingTruth: false,
  };
  return { ...body, receiptHash: hashStarcraftTmgContract(body) };
}

function validatePlacedModel(state, domain, piece, model, endpoint, connectedIds) {
  battlefieldPoint(endpoint, domain, "DISENGAGE_PLACEMENT_OUTSIDE_BATTLEFIELD");
  const movingRadius = Math.round(domain.constraints.baseDiameterMilliInches / 2);
  const rows = modelRows(state).filter((row) => row.modelId !== model.id);
  for (const blocker of rows) {
    const centerDistance = distance(endpoint, blocker.point);
    if (centerDistance < movingRadius + blocker.radius - CONTACT_TOLERANCE_MILLI_INCHES) {
      fail("DISENGAGE_BASE_OVERLAP", `${model.id}/${blocker.modelId}`);
    }
    if (blocker.sideKey !== domain.sideKey
      && centerDistance <= movingRadius + blocker.radius + ENGAGEMENT_RANGE_MILLI_INCHES) {
      fail("DISENGAGE_ENEMY_ENGAGEMENT_RANGE", `${model.id}/${blocker.modelId}`);
    }
  }
  const leading = activeModels(piece).find((entry) => entry.id === piece.lastLeadingModelId);
  if (!leading || distance(endpoint, point(leading)) > COHERENCY_RANGE_MILLI_INCHES) {
    fail("DISENGAGE_OUT_OF_COHERENCY", model.id);
  }
  const otherUnitBlockers = rows.filter((row) => row.pieceId !== piece.id);
  const connected = activeModels(piece).filter((entry) => connectedIds.has(entry.id));
  const linkExists = connected.some((anchor) => otherUnitBlockers.every((blocker) => (
    pointToSegmentDistance(blocker.point, endpoint, point(anchor))
      >= blocker.radius - CONTACT_TOLERANCE_MILLI_INCHES
  )));
  if (!linkExists) fail("DISENGAGE_COHERENCY_LINK_BLOCKED", model.id);
}

function supplyAt(profile, currentModels) {
  if (currentModels === 0) return 0;
  const tier = profile.squadProfile.find((row) => (
    row.minimumModels !== null
      && currentModels >= row.minimumModels
      && currentModels <= row.maximumModels
  ));
  if (!tier) fail("DISENGAGE_UNIT_STATE_UNSUPPORTED", String(currentModels));
  return tier.supply;
}

function restrictionFrom(domain) {
  const body = {
    schema: "starcraft_tmg_official_post_disengage_assault_restriction_v1",
    declaredRound: domain.round,
    appliesToPhase: "assault",
    engagedEnemyUnitIds: [...domain.constraints.engagedEnemyUnitIds],
    enemySupplyByUnit: clone(domain.constraints.enemySupplyByUnit),
    ownCurrentSupply: domain.constraints.ownCurrentSupply,
    combinedEngagedEnemySupply: domain.constraints.combinedEngagedEnemySupply,
    tacticalMass: domain.constraints.tacticalMass,
    rangedAttackProhibited: domain.constraints.followingAssaultRangedAttackProhibited,
    chargeProhibited: domain.constraints.followingAssaultChargeProhibited,
    evaluatedAtDeclaration: true,
    trainingTruth: false,
  };
  return { ...body, restrictionHash: hashStarcraftTmgContract(body) };
}

function casualtyInstantiation(state, domain, parameters) {
  const leadingModelId = String(parameters.leadingModelId || "").trim();
  if (!domain.constraints.modelIds.includes(leadingModelId)) {
    fail("DISENGAGE_LEADING_MODEL_INVALID", leadingModelId);
  }
  const path = canonicalPath(domain.constraints.modelStartPoints[leadingModelId], parameters.path);
  validateLeadingPath(state, domain, path);
  const requiredIds = domain.constraints.modelIds.filter((modelId) => modelId !== leadingModelId);
  if (parameters.placements.length !== requiredIds.length) {
    fail("DISENGAGE_PLACEMENT_DENOMINATOR_INVALID");
  }
  const seen = new Set();
  const normalized = parameters.placements.map((entry) => {
    const modelId = String(entry?.modelId || "").trim();
    const outcome = String(entry?.outcome || "").trim();
    if (!requiredIds.includes(modelId) || seen.has(modelId)) {
      fail("DISENGAGE_PLACEMENT_MODEL_INVALID", modelId);
    }
    seen.add(modelId);
    if (outcome === "casualty") return { modelId, outcome };
    if (outcome !== "placed") fail("DISENGAGE_PLACEMENT_OUTCOME_INVALID", modelId);
    return { modelId, outcome, ...safePoint(entry, "DISENGAGE_PLACEMENT_POINT_INVALID", modelId) };
  });
  if (seen.size !== requiredIds.length) fail("DISENGAGE_PLACEMENT_DENOMINATOR_INVALID");
  const working = clone(state);
  const piece = working.pieces.find((entry) => entry.id === domain.pieceId);
  const leading = piece.models.find((entry) => entry.id === leadingModelId);
  const endpoint = path.points.at(-1);
  for (const model of piece.models) {
    if (model.id !== leadingModelId) model.isOnField = false;
  }
  leading.xInches = inches(endpoint.xMilliInches);
  leading.yInches = inches(endpoint.yMilliInches);
  piece.lastLeadingModelId = leadingModelId;
  const connectedIds = new Set([leadingModelId]);
  const placementSequence = [];
  const casualtyModelIds = [];
  const endpointFeasibilityReceipts = [];
  for (const placement of normalized) {
    const model = piece.models.find((entry) => entry.id === placement.modelId);
    if (placement.outcome === "casualty") {
      const proof = endpointFeasibility(working, domain, {
        proofKind: "ordinary_model_disengage_placement",
        center: endpoint,
        regionRadiusMilliInches: COHERENCY_RANGE_MILLI_INCHES,
        movingModelId: model.id,
      });
      if (proof.physicalEndpointExists) {
        fail("DISENGAGE_CASUALTY_NOT_REQUIRED", model.id);
      }
      model.isDestroyed = true;
      model.isOnField = false;
      casualtyModelIds.push(model.id);
      endpointFeasibilityReceipts.push(proof);
      placementSequence.push({
        order: placementSequence.length + 1,
        modelId: model.id,
        outcome: "casualty",
        endpoint: null,
        endpointFeasibilityReceiptHash: proof.receiptHash,
      });
      continue;
    }
    const placedPoint = {
      xMilliInches: placement.xMilliInches,
      yMilliInches: placement.yMilliInches,
    };
    validatePlacedModel(working, domain, piece, model, placedPoint, connectedIds);
    model.xInches = inches(placedPoint.xMilliInches);
    model.yInches = inches(placedPoint.yMilliInches);
    model.isOnField = true;
    connectedIds.add(model.id);
    placementSequence.push({
      order: placementSequence.length + 1,
      modelId: model.id,
      outcome: "placed",
      endpoint: placedPoint,
      endpointFeasibilityReceiptHash: null,
    });
  }
  if (casualtyModelIds.length === 0) fail("DISENGAGE_CASUALTY_NOT_REQUIRED");
  const currentModelsBefore = Number(piece.currentModels);
  const currentSupplyBefore = Number(piece.currentSupply);
  piece.currentModels = currentModelsBefore - casualtyModelIds.length;
  const profile = getOfficialCombatProfileV1(
    state.officialGameplayDataBundle.combatProfileBundle,
    piece.officialUnitRecordKey,
  );
  piece.currentSupply = supplyAt(profile, piece.currentModels);
  const restriction = restrictionFrom(domain);
  const finalModelPositions = activeModels(piece).map((model) => ({
    modelId: model.id,
    xMilliInches: point(model).xMilliInches,
    yMilliInches: point(model).yMilliInches,
  })).sort((left, right) => left.modelId.localeCompare(right.modelId));
  const planBody = {
    schemaVersion: PLAN_SCHEMA,
    outcome: "ordinary_model_casualties",
    pieceId: domain.pieceId,
    leadingModelId,
    leadingOutcome: "placed",
    canonicalPath: path,
    placementSequence,
    finalModelPositions,
    casualtyModelIds: [...casualtyModelIds],
    endpointFeasibilityReceipts,
    distanceTravelledInches: path.distanceMilliInches / 1000,
    speedAllowanceInches: domain.constraints.maxDistanceMilliInches / 1000,
    currentModelsBefore,
    currentModelsAfter: piece.currentModels,
    currentSupplyBefore,
    currentSupplyAfter: piece.currentSupply,
    supplyDelta: currentSupplyBefore - piece.currentSupply,
    casualtySupplyWitnessRequired: currentSupplyBefore !== piece.currentSupply,
    roundSupplyStateHashBefore: domain.constraints.roundSupplyStateHash,
    postDisengageAssaultRestriction: restriction,
    geometryScope: domain.constraints.geometryScope,
    trainingTruth: false,
  };
  const plan = { ...planBody, disengagePlanHash: hashStarcraftTmgContract(planBody) };
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: {
      leadingModelId,
      leadingOutcome: "placed",
      path: clone(path.points.slice(1)),
      placements: clone(normalized),
    },
    action: {
      actionType: "disengage",
      sideKey: domain.sideKey,
      phase: "movement",
      pieceId: domain.pieceId,
      disengagePlan: plan,
      ruleAtomIds: [...OFFICIAL_DISENGAGE_CASUALTY_ACTION_ATOM_IDS],
      executorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
      executorVersion: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
    },
    rulesTruth: "official_gauntlet_marine_disengage_ordinary_model_casualty_subset",
    trainingTruth: false,
  };
}

function leadingFailureInstantiation(state, domain, parameters) {
  const leadingModelId = String(parameters.leadingModelId || "").trim();
  if (!domain.constraints.modelIds.includes(leadingModelId)) {
    fail("DISENGAGE_LEADING_MODEL_INVALID", leadingModelId);
  }
  if (parameters.path.length !== 0 || parameters.placements.length !== 0) {
    fail("DISENGAGE_PARAMETERS_INVALID");
  }
  const start = domain.constraints.modelStartPoints[leadingModelId];
  const proof = endpointFeasibility(state, domain, {
    proofKind: "leading_model_disengage_reachable_endpoint_superset",
    center: start,
    regionRadiusMilliInches: domain.constraints.maxDistanceMilliInches,
    movingModelId: leadingModelId,
  });
  if (proof.physicalEndpointExists) {
    fail("DISENGAGE_LEADING_FAILURE_NOT_PROVED", leadingModelId);
  }
  const piece = state.pieces.find((entry) => entry.id === domain.pieceId);
  const currentModelsBefore = Number(piece.currentModels);
  const currentSupplyBefore = Number(piece.currentSupply);
  const currentModelsAfter = currentModelsBefore - 1;
  const profile = getOfficialCombatProfileV1(
    state.officialGameplayDataBundle.combatProfileBundle,
    piece.officialUnitRecordKey,
  );
  const currentSupplyAfter = supplyAt(profile, currentModelsAfter);
  const restriction = restrictionFrom(domain);
  const finalModelPositions = activeModels(piece).filter((model) => (
    model.id !== leadingModelId
  )).map((model) => ({
    modelId: model.id,
    xMilliInches: point(model).xMilliInches,
    yMilliInches: point(model).yMilliInches,
  })).sort((left, right) => left.modelId.localeCompare(right.modelId));
  const canonicalFailurePath = {
    schemaVersion: "starcraft_tmg_official_disengage_path_v1",
    unit: "milli-inch",
    points: [clone(start)],
    distanceMilliInches: 0,
  };
  const planBody = {
    schemaVersion: PLAN_SCHEMA,
    outcome: "leading_model_failure",
    pieceId: domain.pieceId,
    leadingModelId,
    leadingOutcome: "casualty",
    unitMoved: false,
    canonicalPath: canonicalFailurePath,
    placementSequence: [],
    finalModelPositions,
    casualtyModelIds: [leadingModelId],
    endpointFeasibilityReceipts: [proof],
    distanceTravelledInches: 0,
    speedAllowanceInches: domain.constraints.maxDistanceMilliInches / 1000,
    currentModelsBefore,
    currentModelsAfter,
    currentSupplyBefore,
    currentSupplyAfter,
    supplyDelta: currentSupplyBefore - currentSupplyAfter,
    casualtySupplyWitnessRequired: currentSupplyBefore !== currentSupplyAfter,
    roundSupplyStateHashBefore: domain.constraints.roundSupplyStateHash,
    postDisengageAssaultRestriction: restriction,
    geometryScope: domain.constraints.geometryScope,
    trainingTruth: false,
  };
  const plan = { ...planBody, disengagePlanHash: hashStarcraftTmgContract(planBody) };
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: {
      leadingModelId,
      leadingOutcome: "casualty",
      path: [],
      placements: [],
    },
    action: {
      actionType: "disengage",
      sideKey: domain.sideKey,
      phase: "movement",
      pieceId: domain.pieceId,
      disengagePlan: plan,
      ruleAtomIds: [...OFFICIAL_DISENGAGE_CASUALTY_ACTION_ATOM_IDS],
      executorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
      executorVersion: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
    },
    rulesTruth: "official_gauntlet_marine_disengage_leading_model_failure_subset",
    trainingTruth: false,
  };
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(value)) fail("DISENGAGE_RUNTIME_BINDING_REQUIRED");
  return value;
}

function parametersFromPlan(plan) {
  return {
    leadingModelId: plan.leadingModelId,
    leadingOutcome: plan.leadingOutcome,
    path: plan.leadingOutcome === "casualty"
      ? []
      : clone(plan.canonicalPath?.points?.slice(1) || []),
    placements: plan.leadingOutcome === "casualty"
      ? []
      : (plan.placementSequence || []).map((entry) => (
        entry.outcome === "casualty"
          ? { modelId: entry.modelId, outcome: "casualty" }
          : {
              modelId: entry.modelId,
              outcome: "placed",
              xMilliInches: entry.endpoint?.xMilliInches ?? entry.xMilliInches,
              yMilliInches: entry.endpoint?.yMilliInches ?? entry.yMilliInches,
            }
      )),
  };
}

function applyAllPlaced(stateInput, actionInput, domain, options) {
  const historicalDomain = toHistoricalDisengageDomainV1(stateInput, domain, options);
  if (!historicalDomain) fail("DISENGAGE_PARAMETER_DOMAIN_STALE");
  const parameters = parametersFromPlan(actionInput.disengagePlan);
  const previous = instantiateOfficialDisengageV1(stateInput, historicalDomain, {
    leadingModelId: parameters.leadingModelId,
    path: parameters.path,
    placements: parameters.placements.map((entry) => without(entry, ["outcome"])),
  }, options);
  const applied = applyOfficialDisengageV1(stateInput, previous.action, options);
  const result = clone(applied);
  result.action = clone(actionInput);
  result.executorId = OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION;
  result.schemaVersion = "starcraft_tmg_official_disengage_casualty_transition_v1";
  const lastLog = result.state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  result.rulesTruth = "official_gauntlet_marine_disengage_v2_all_models_placed";
  result.trainingTruth = false;
  return result;
}

function applyCasualty(stateInput, actionInput, options) {
  const plan = actionInput.disengagePlan;
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  if (!piece) fail("DISENGAGE_UNIT_NOT_FOUND", actionInput.pieceId);
  const casualtyIds = new Set(plan.casualtyModelIds || []);
  if (casualtyIds.size === 0
    || casualtyIds.size !== (plan.casualtyModelIds || []).length
    || [...casualtyIds].some((modelId) => !piece.models.some((model) => model.id === modelId))) {
    fail("DISENGAGE_ACTION_INVALID");
  }
  const positions = new Map((plan.finalModelPositions || []).map((row) => [row.modelId, row]));
  for (const model of piece.models.filter((entry) => !casualtyIds.has(entry.id))) {
    const finalPosition = positions.get(model.id);
    if (!finalPosition) fail("DISENGAGE_ACTION_INVALID", model.id);
    model.xInches = inches(finalPosition.xMilliInches);
    model.yInches = inches(finalPosition.yMilliInches);
    model.isOnField = true;
    model.isDestroyed = false;
  }
  piece.models = piece.models.filter((model) => !casualtyIds.has(model.id));
  piece.currentModels = Number(plan.currentModelsAfter);
  piece.currentSupply = Number(plan.currentSupplyAfter);
  if (piece.models.length !== piece.currentModels) fail("DISENGAGE_ACTION_INVALID");
  if (piece.currentModels === 0) {
    piece.isDestroyed = true;
    piece.isOnField = false;
  }
  const stationaryRemoved = piece.statuses.includes("stationary");
  piece.statuses = piece.statuses.filter((status) => status !== "stationary");
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    movement: true,
  };
  if (plan.outcome === "ordinary_model_casualties") piece.inCoherency = true;
  piece.lastLeadingModelId = plan.leadingModelId;
  piece.lastDisengagePlanHash = plan.disengagePlanHash;
  piece.disengageAssaultRestriction = clone(plan.postDisengageAssaultRestriction);
  piece.disengageHistory = Array.isArray(piece.disengageHistory) ? piece.disengageHistory : [];
  piece.disengageHistory.push({
    round: Number(state.round),
    phase: "movement",
    outcome: plan.outcome,
    planHash: plan.disengagePlanHash,
    casualtyModelIds: [...plan.casualtyModelIds],
    restrictionHash: piece.disengageAssaultRestriction.restrictionHash,
    tacticalMass: piece.disengageAssaultRestriction.tacticalMass,
    trainingTruth: false,
  });
  const boundRuntimeHash = runtimeHash(options.matchBinding);
  verifyOfficialSupplyLossLedgerV1(stateInput.supplyLossLedger, {
    round: Number(stateInput.round),
    rulesRuntimeHash: boundRuntimeHash,
  });
  if (stateInput.officialRoundSupplyState?.roundSupplyStateHash
    !== plan.roundSupplyStateHashBefore) {
    fail("DISENGAGE_SUPPLY_STATE_STALE");
  }
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: state.officialGameplayDataBundle,
    rulesRuntimeHash: boundRuntimeHash,
  });
  const casualtyEvent = {
    type: "disengage_casualty",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    outcome: plan.outcome,
    leadingModelId: plan.leadingModelId,
    casualtyModelIds: [...plan.casualtyModelIds],
    currentModelsBefore: plan.currentModelsBefore,
    currentModelsAfter: plan.currentModelsAfter,
    currentSupplyBefore: plan.currentSupplyBefore,
    currentSupplyAfter: plan.currentSupplyAfter,
    supplyDelta: plan.supplyDelta,
    unitMoved: plan.outcome !== "leading_model_failure",
    endpointFeasibilityReceiptHashes: plan.endpointFeasibilityReceipts.map((entry) => (
      entry.receiptHash
    )),
    disengagePlanHash: plan.disengagePlanHash,
    restrictionHash: piece.disengageAssaultRestriction.restrictionHash,
    trainingTruth: false,
  };
  const resolutionEvent = {
    type: plan.outcome === "leading_model_failure"
      ? "unit_disengage_failed"
      : "unit_disengaged",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    outcome: plan.outcome,
    casualtyModelIds: [...plan.casualtyModelIds],
    movementActivated: true,
    stationaryRemoved,
    roundSupplyStateHashBefore: plan.roundSupplyStateHashBefore,
    roundSupplyStateHashAfter: state.officialRoundSupplyState.roundSupplyStateHash,
    trainingTruth: false,
  };
  const baseEvents = [casualtyEvent, resolutionEvent];
  const recorded = recordOfficialSupplyLossesV1({
    stateBefore: stateInput,
    stateAfter: state,
    action: actionInput,
    events: baseEvents,
    rulesRuntimeHash: boundRuntimeHash,
  });
  state.supplyLossLedger = clone(recorded.ledger);
  const events = [...baseEvents, ...clone(recorded.supplyLossEvents)];
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
    schemaVersion: "starcraft_tmg_official_disengage_casualty_transition_v1",
    executorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: clone(actionInput),
    rulesTruth: "official_gauntlet_marine_disengage_casualty_exact_subset",
    trainingTruth: false,
  };
}

export function applyOfficialDisengageCasualtyV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "disengage"
    || actionInput.executorId !== OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION
    || !object(actionInput.disengagePlan)) {
    fail("DISENGAGE_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialDisengageCasualtyV1(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => entry.pieceId === actionInput.pieceId);
  if (!domain) fail("DISENGAGE_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialDisengageCasualtyV1(
    stateInput,
    domain,
    parametersFromPlan(actionInput.disengagePlan),
    options,
  );
  if (!isDeepStrictEqual(actionInput, instantiated.action)) fail("DISENGAGE_ACTION_STALE");
  if (actionInput.disengagePlan.casualtyModelIds.length === 0) {
    return applyAllPlaced(stateInput, actionInput, domain, options);
  }
  return applyCasualty(stateInput, actionInput, options);
}

function currentDomain(state, domain, options) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION) {
    fail("DISENGAGE_PARAMETER_DOMAIN_INVALID");
  }
  const enumeration = enumerateOfficialDisengageCasualtyV1(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const expected = enumeration.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expected || !isDeepStrictEqual(domain, expected)) fail("DISENGAGE_PARAMETER_DOMAIN_STALE");
  return expected;
}

function validateParameterShape(parameters) {
  if (!object(parameters)
    || Object.keys(parameters).some((key) => ![
      "leadingModelId",
      "leadingOutcome",
      "path",
      "placements",
    ].includes(key))
    || !Array.isArray(parameters.path)
    || !Array.isArray(parameters.placements)) {
    fail("DISENGAGE_PARAMETERS_INVALID");
  }
  const leadingOutcome = String(parameters.leadingOutcome || "").trim();
  if (!["placed", "casualty"].includes(leadingOutcome)) {
    fail("DISENGAGE_LEADING_OUTCOME_INVALID");
  }
  return leadingOutcome;
}

function allPlacedInstantiation(state, domain, parameters, options) {
  const normalizedPlacements = parameters.placements.map((entry) => {
    if (entry?.outcome !== "placed") {
      fail("DISENGAGE_PLACEMENT_OUTCOME_INVALID", String(entry?.modelId || ""));
    }
    return without(clone(entry), ["outcome"]);
  });
  const historicalDomain = toHistoricalDisengageDomainV1(state, domain, options);
  if (!historicalDomain) fail("DISENGAGE_PARAMETER_DOMAIN_STALE");
  const previous = instantiateOfficialDisengageV1(state, historicalDomain, {
    leadingModelId: parameters.leadingModelId,
    path: parameters.path,
    placements: normalizedPlacements,
  }, options);
  const previousPlan = previous.action.disengagePlan;
  const planBody = {
    ...without(clone(previousPlan), ["disengagePlanHash", "schemaVersion", "placementSequence"]),
    schemaVersion: PLAN_SCHEMA,
    leadingOutcome: "placed",
    placementSequence: previousPlan.placementSequence.map((entry) => ({
      ...clone(entry),
      outcome: "placed",
    })),
    casualtyModelIds: [],
    endpointFeasibilityReceipts: [],
    casualtySupplyWitnessRequired: false,
    geometryScope: domain.constraints.geometryScope,
    trainingTruth: false,
  };
  const plan = { ...planBody, disengagePlanHash: hashStarcraftTmgContract(planBody) };
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: {
      leadingModelId: String(parameters.leadingModelId || ""),
      leadingOutcome: "placed",
      path: clone(previous.canonicalParameters.path),
      placements: plan.placementSequence.map((entry) => clone(entry)),
    },
    action: {
      ...without(clone(previous.action), ["disengagePlan", "ruleAtomIds", "executorId", "executorVersion"]),
      disengagePlan: plan,
      ruleAtomIds: [...OFFICIAL_DISENGAGE_CASUALTY_ACTION_ATOM_IDS],
      executorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
      executorVersion: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
    },
    rulesTruth: "official_gauntlet_marine_disengage_v2_all_models_placed",
    trainingTruth: false,
  };
}

export function instantiateOfficialDisengageCasualtyV1(
  state,
  domain,
  parameters,
  options = {},
) {
  currentDomain(state, domain, options);
  const leadingOutcome = validateParameterShape(parameters);
  if (leadingOutcome === "casualty") {
    return leadingFailureInstantiation(state, domain, parameters);
  }
  if (parameters.placements.some((entry) => entry?.outcome === "casualty")) {
    return casualtyInstantiation(state, domain, parameters);
  }
  return allPlacedInstantiation(state, domain, parameters, options);
}
