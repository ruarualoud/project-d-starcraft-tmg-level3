import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_FLYING_RULES_KERNEL_SCHEMA =
  "starcraft_tmg_official_flying_rules_kernel_v1";
export const OFFICIAL_FLYING_RULES_KERNEL_VERSION = "1.0.0";

const TOLERANCE = 1;
const INCH = 1000;
const COHERENCY_RANGE = 3000;
const MOVEMENT_TYPES = Object.freeze(["deploy", "involuntary", "move", "run"]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function milli(value, code = "FLYING_GEOMETRY_INVALID", detail = "") {
  const parsed = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(parsed)) fail(code, detail);
  return parsed;
}
function point(value, code = "FLYING_POINT_INVALID", detail = "") {
  if (!object(value)
    || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) fail(code, detail);
  return { xMilliInches: Number(value.xMilliInches),
    yMilliInches: Number(value.yMilliInches) };
}
function distance(left, right) {
  return Math.hypot(right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches);
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
function isFlying(piece) {
  return String(piece?.combatTag || "").toLowerCase() === "flying"
    || (piece?.combatTags || []).some((tag) => String(tag).toLowerCase() === "flying");
}
function measurementBase(model) {
  const kind = String(model?.measurementBaseKind || "model_base");
  if (!new Set(["model_base", "flight_stand_bottom"]).has(kind)) {
    fail("FLYING_MEASUREMENT_BASE_KIND_INVALID", String(model?.id || ""));
  }
  if (model?.usesFlightStand === true && kind !== "flight_stand_bottom") {
    fail("FLYING_FLIGHT_STAND_BOTTOM_REQUIRED", String(model?.id || ""));
  }
  const shape = String(model?.baseShape || "round").toLowerCase();
  const width = milli(model?.baseWidthInches,
    "FLYING_MEASUREMENT_BASE_UNSUPPORTED", String(model?.id || ""));
  const depth = milli(model?.baseDepthInches ?? model?.baseWidthInches,
    "FLYING_MEASUREMENT_BASE_UNSUPPORTED", String(model?.id || ""));
  if (shape !== "round" || width <= 0 || Math.abs(width - depth) > TOLERANCE) {
    fail("FLYING_MEASUREMENT_BASE_UNSUPPORTED", String(model?.id || ""));
  }
  return {
    modelId: String(model.id), kind, shape: "round", radiusMilliInches: Math.round(width / 2),
    center: { xMilliInches: milli(model?.xInches), yMilliInches: milli(model?.yInches) },
    overhangIgnored: true,
  };
}
function terrainFootprint(terrain) {
  const terrainId = String(terrain?.id || "").trim();
  const source = terrain?.footprint || terrain;
  const shape = String(source?.shape || terrain?.shape || "").toLowerCase();
  if (!terrainId || !["round", "axis_aligned_rectangle"].includes(shape)) {
    fail("FLYING_TERRAIN_FOOTPRINT_INVALID", terrainId);
  }
  const common = {
    terrainId,
    terrainKind: String(terrain?.terrainKind || terrain?.kind || "terrain").toLowerCase(),
    effectiveSize: Number(terrain?.effectiveSize ?? terrain?.size ?? 0),
    landingAllowed: terrain?.landingAllowed === true,
    isRemoved: terrain?.isRemoved === true,
  };
  if (shape === "round") {
    const radius = source.radiusMilliInches === undefined
      ? Math.round(milli(source.diameterInches) / 2)
      : Number(source.radiusMilliInches);
    const center = source.center
      ? point(source.center, "FLYING_TERRAIN_FOOTPRINT_INVALID", terrainId)
      : { xMilliInches: milli(terrain.xInches), yMilliInches: milli(terrain.yInches) };
    if (!Number.isSafeInteger(radius) || radius <= 0) {
      fail("FLYING_TERRAIN_FOOTPRINT_INVALID", terrainId);
    }
    return { ...common, shape, center, radius };
  }
  const minX = Number(source.minXMilliInches); const maxX = Number(source.maxXMilliInches);
  const minY = Number(source.minYMilliInches); const maxY = Number(source.maxYMilliInches);
  if (![minX, maxX, minY, maxY].every(Number.isSafeInteger)
    || minX >= maxX || minY >= maxY) {
    fail("FLYING_TERRAIN_FOOTPRINT_INVALID", terrainId);
  }
  return { ...common, shape, minX, maxX, minY, maxY };
}
function circleOverlaps(center, radius, footprint) {
  if (footprint.shape === "round") {
    return distance(center, footprint.center) < radius + footprint.radius - TOLERANCE;
  }
  const x = Math.max(footprint.minX, Math.min(center.xMilliInches, footprint.maxX));
  const y = Math.max(footprint.minY, Math.min(center.yMilliInches, footprint.maxY));
  return Math.hypot(center.xMilliInches - x, center.yMilliInches - y)
    < radius - TOLERANCE;
}
function pointSegmentDistance(p, a, b) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  if (dx === 0 && dy === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.xMilliInches - a.xMilliInches) * dx
    + (p.yMilliInches - a.yMilliInches) * dy) / ((dx * dx) + (dy * dy))));
  return Math.hypot(p.xMilliInches - (a.xMilliInches + (t * dx)),
    p.yMilliInches - (a.yMilliInches + (t * dy)));
}
function segmentIntersects(a, b, footprint) {
  if (footprint.shape === "round") {
    return pointSegmentDistance(footprint.center, a, b) <= footprint.radius + TOLERANCE;
  }
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  let minimumT = 0;
  let maximumT = 1;
  for (const [direction, offset] of [
    [-dx, a.xMilliInches - (footprint.minX - TOLERANCE)],
    [dx, (footprint.maxX + TOLERANCE) - a.xMilliInches],
    [-dy, a.yMilliInches - (footprint.minY - TOLERANCE)],
    [dy, (footprint.maxY + TOLERANCE) - a.yMilliInches],
  ]) {
    if (direction === 0) {
      if (offset < 0) return false;
      continue;
    }
    const ratio = offset / direction;
    if (direction < 0) minimumT = Math.max(minimumT, ratio);
    else maximumT = Math.min(maximumT, ratio);
    if (minimumT > maximumT) return false;
  }
  return true;
}
function withinBoard(state, center, radius) {
  const width = milli(state.board?.widthInches);
  const height = milli(state.board?.heightInches);
  return center.xMilliInches >= radius && center.xMilliInches <= width - radius
    && center.yMilliInches >= radius && center.yMilliInches <= height - radius;
}
function canonicalPlacements(state, actor, raw) {
  const models = activeModels(actor);
  const remaining = new Set(models.map((model) => model.id));
  if (!Array.isArray(raw) || raw.length !== models.length) {
    fail("FLYING_PLACEMENT_DENOMINATOR_INVALID");
  }
  const rows = raw.map((entry) => {
    const modelId = String(entry?.modelId || "");
    const model = models.find((candidate) => candidate.id === modelId);
    if (!model || !remaining.delete(modelId)) fail("FLYING_PLACEMENT_MODEL_INVALID", modelId);
    const base = measurementBase(model);
    return { modelId, xMilliInches: Number(entry.xMilliInches),
      yMilliInches: Number(entry.yMilliInches), radiusMilliInches: base.radiusMilliInches,
      measurementBaseKind: base.kind, start: base.center };
  });
  if (remaining.size > 0 || rows.some((entry) => (
    !Number.isSafeInteger(entry.xMilliInches) || !Number.isSafeInteger(entry.yMilliInches)
  ))) fail("FLYING_PLACEMENT_DENOMINATOR_INVALID");
  return rows.sort((left, right) => left.modelId.localeCompare(right.modelId));
}
function allModelFootprints(state, actorId) {
  return (state.pieces || []).filter(activePiece).flatMap((piece) => (
    activeModels(piece).map((model) => ({
      ...measurementBase(model), unitId: piece.id, sideKey: piece.sideKey,
      flying: isFlying(piece), ignoredAsActor: piece.id === actorId,
    }))
  ));
}

export function officialFlyingParticipationVerdictV1(piece, requestedRole) {
  if (!isFlying(piece)) return Object.freeze({ flying: false, allowed: true,
    requestedRole: String(requestedRole || ""), reason: "not_flying" });
  const role = String(requestedRole || "");
  const forbidden = new Set([
    "charge_actor", "charge_target", "combat_activation", "close_ranks_actor",
    "close_combat_attacker", "close_combat_target", "mission_contestor",
    "mission_controller", "engagement_source", "engagement_target",
  ]);
  return Object.freeze({ flying: true, allowed: !forbidden.has(role), requestedRole: role,
    reason: forbidden.has(role) ? `flying_${role}_forbidden` : "flying_role_allowed" });
}

export function evaluateOfficialFlyingCoverV1(input = {}) {
  const attacker = input.attacker; const target = input.target;
  if (!activePiece(attacker) || !activePiece(target)) fail("FLYING_COVER_PARTICIPANT_INVALID");
  const attackerFlying = isFlying(attacker); const targetFlying = isFlying(target);
  if (!attackerFlying && !targetFlying) fail("FLYING_COVER_PARTICIPANT_REQUIRED");
  if (input.traceEvidenceComplete !== true || !Array.isArray(input.terrainChecks)) {
    fail("FLYING_COVER_TRACE_CERTIFICATE_REQUIRED");
  }
  const checks = input.terrainChecks.map((raw) => {
    const terrainId = String(raw?.terrainId || "");
    const terrainEffectiveSize = Number(raw?.terrainEffectiveSize);
    const attackerEffectiveSize = attackerFlying
      ? "higher_than_every_terrain" : Number(raw?.attackerEffectiveSize);
    const targetEffectiveSize = targetFlying
      ? "higher_than_every_terrain" : Number(raw?.targetEffectiveSize);
    if (!terrainId || !Number.isFinite(terrainEffectiveSize)
      || (!attackerFlying && !Number.isFinite(attackerEffectiveSize))
      || (!targetFlying && !Number.isFinite(targetEffectiveSize))) {
      fail("FLYING_COVER_SIZE_EVIDENCE_INVALID", terrainId);
    }
    const traceIntersects = raw.traceIntersects === true;
    const closeQuarters = raw.closeQuarters === true;
    const attackerDirect = traceIntersects && !closeQuarters && !attackerFlying
      && raw.attackerWithinOneInch === true
      && terrainEffectiveSize >= attackerEffectiveSize;
    const targetDirect = traceIntersects && !closeQuarters && !targetFlying
      && raw.targetWithinOneInch === true
      && terrainEffectiveSize >= targetEffectiveSize;
    const elevationDeadZone = traceIntersects && !closeQuarters
      && raw.elevationDeadZoneAppliesToNonFlyingModel === true;
    return { terrainId, traceIntersects, terrainEffectiveSize,
      attackerEffectiveSize, targetEffectiveSize,
      fullCoverIgnored: true,
      attackerDirectCoverBlocks: attackerDirect,
      targetDirectCoverBlocks: targetDirect,
      elevationDeadZoneBlocks: elevationDeadZone,
      blocked: attackerDirect || targetDirect || elevationDeadZone,
      flyingTerrainSizeContribution: 0,
      closeQuarters };
  }).sort((left, right) => left.terrainId.localeCompare(right.terrainId));
  const result = {
    schema: "starcraft_tmg_official_flying_cover_result_v1",
    attackerUnitId: attacker.id, targetUnitId: target.id,
    attackerFlying, targetFlying,
    fullCoverIgnoredToOrFromFlying: true,
    terrainCanDirectCoverFlyingModel: false,
    directCoverForNonFlyingModelRetained: true,
    elevationDeadZoneForNonFlyingModelRetained: true,
    flyingEffectiveSize: "higher_than_every_terrain",
    flyingTerrainSizeContribution: 0,
    flyingHighGroundCoverEligible: false,
    flyingAttackOriginatesFromLowerElevation: false,
    terrainChecks: checks,
    lineOfSightBlocked: checks.some((entry) => entry.blocked),
    productionQuarantined: true,
    trainingTruth: false,
  };
  return Object.freeze({ ...result, resultHash: hashStarcraftTmgContract(result) });
}

export function certifyOfficialFlyingRulePlanV1(input = {}) {
  const state = input.state; const actor = input.actor; const plan = input.plan;
  const procedureKind = String(input.procedureKind || "");
  if (!activePiece(actor) || !isFlying(actor) || !object(plan)) {
    fail("FLYING_PLAN_ACTOR_INVALID");
  }
  const planId = String(plan.planId || "").trim();
  if (!planId) fail("FLYING_PLAN_ID_REQUIRED");
  if (procedureKind === "cover_check") {
    const target = state.pieces?.find((piece) => piece.id === plan.targetUnitId);
    const coverResult = evaluateOfficialFlyingCoverV1({ attacker: actor, target,
      traceEvidenceComplete: plan.traceEvidenceComplete,
      terrainChecks: plan.terrainChecks });
    const body = { planId, procedureKind, actorUnitId: actor.id,
      targetUnitId: target.id, coverResult,
      restrictions: { neverEngaged: true, canCharge: false, canBeCharged: false,
        combatPhaseParticipation: false, missionControlOrContest: false },
      productionQuarantined: true, trainingTruth: false };
    return Object.freeze({ ...body, planHash: hashStarcraftTmgContract(body) });
  }
  if (procedureKind !== "move") fail("FLYING_PROCEDURE_KIND_INVALID", procedureKind);
  const movementType = String(plan.movementType || "");
  if (!MOVEMENT_TYPES.includes(movementType)) {
    fail(movementType === "charge" ? "FLYING_CHARGE_FORBIDDEN" : "FLYING_MOVEMENT_TYPE_INVALID");
  }
  const maxDistanceMilliInches = Number(plan.maxDistanceMilliInches);
  if (!Number.isSafeInteger(maxDistanceMilliInches) || maxDistanceMilliInches < 0) {
    fail("FLYING_MOVEMENT_DISTANCE_INVALID");
  }
  const rows = canonicalPlacements(state, actor, plan.placements);
  const leadingModelId = String(plan.leadingModelId || "");
  const leading = rows.find((entry) => entry.modelId === leadingModelId);
  if (!leading) fail("FLYING_LEADING_MODEL_INVALID");
  const endpoint = { xMilliInches: leading.xMilliInches, yMilliInches: leading.yMilliInches };
  const horizontalPointToPointDistance = Math.round(distance(leading.start, endpoint));
  if (horizontalPointToPointDistance > maxDistanceMilliInches + TOLERANCE) {
    fail("FLYING_MOVEMENT_DISTANCE_EXCEEDED");
  }
  const terrain = (state.board?.terrain || []).filter((entry) => entry?.isRemoved !== true)
    .map(terrainFootprint);
  const models = allModelFootprints(state, actor.id).filter((entry) => !entry.ignoredAsActor);
  const grassOverflown = new Set(); const grassRemoved = new Set();
  for (const row of rows) {
    const center = { xMilliInches: row.xMilliInches, yMilliInches: row.yMilliInches };
    if (!withinBoard(state, center, row.radiusMilliInches)) {
      fail("FLYING_ENDPOINT_OUTSIDE_BATTLEFIELD", row.modelId);
    }
    for (const other of models) {
      const edgeDistance = distance(center, other.center)
        - row.radiusMilliInches - other.radiusMilliInches;
      if (edgeDistance < -TOLERANCE) fail("FLYING_ENDPOINT_MODEL_OVERLAP",
        `${row.modelId}/${other.modelId}`);
      if (other.sideKey !== actor.sideKey && other.flying && edgeDistance < INCH - TOLERANCE) {
        fail("FLYING_ENEMY_FLYING_ENDPOINT_SEPARATION_REQUIRED",
          `${row.modelId}/${other.modelId}`);
      }
    }
    for (const surface of terrain) {
      if (!circleOverlaps(center, row.radiusMilliInches, surface)) continue;
      if (surface.terrainKind === "grass") grassRemoved.add(surface.terrainId);
      else if (!surface.landingAllowed) fail("FLYING_ENDPOINT_TERRAIN_OVERLAP",
        `${row.modelId}/${surface.terrainId}`);
    }
  }
  for (let left = 0; left < rows.length; left += 1) {
    for (let right = left + 1; right < rows.length; right += 1) {
      const leftCenter = { xMilliInches: rows[left].xMilliInches,
        yMilliInches: rows[left].yMilliInches };
      const rightCenter = { xMilliInches: rows[right].xMilliInches,
        yMilliInches: rows[right].yMilliInches };
      if (distance(leftCenter, rightCenter)
        < rows[left].radiusMilliInches + rows[right].radiusMilliInches - TOLERANCE) {
        fail("FLYING_ENDPOINT_MODEL_OVERLAP",
          `${rows[left].modelId}/${rows[right].modelId}`);
      }
    }
  }
  for (const surface of terrain.filter((entry) => entry.terrainKind === "grass")) {
    if (segmentIntersects(leading.start, endpoint, surface)
      && !grassRemoved.has(surface.terrainId)) grassOverflown.add(surface.terrainId);
  }
  for (const row of rows) {
    if (row.modelId === leadingModelId) continue;
    const center = { xMilliInches: row.xMilliInches, yMilliInches: row.yMilliInches };
    if (distance(endpoint, center) + row.radiusMilliInches
      > leading.radiusMilliInches + COHERENCY_RANGE + TOLERANCE) {
      fail("FLYING_COHERENCY_RANGE_INVALID", row.modelId);
    }
  }
  const links = rows.filter((entry) => entry.modelId !== leadingModelId).map((entry) => ({
    fromModelId: entry.modelId, toModelId: leadingModelId,
    terrainIgnored: true, otherUnitModelsIgnored: true,
  }));
  const body = {
    planId, procedureKind, actorUnitId: actor.id, leadingModelId, movementType,
    maxDistanceMilliInches, horizontalPointToPointDistance,
    measurementBases: rows.map((entry) => ({ modelId: entry.modelId,
      measurementBaseKind: entry.measurementBaseKind,
      radiusMilliInches: entry.radiusMilliInches, overhangIgnored: true })),
    placements: rows.map(({ start: _start, ...entry }) => entry),
    coherencyLinks: links,
    transit: { terrainIgnored: true, modelBasesIgnored: true,
      elevationIgnored: true, accessPointsRequired: false },
    endpoint: { modelOverlapForbidden: true, enemyFlyingMinimumEdgeDistanceMilliInches: INCH,
      groundBaseContactAllowedWithoutEngagement: true },
    grass: { overflownTerrainIds: [...grassOverflown].sort(),
      removedAtEndpointTerrainIds: [...grassRemoved].sort(),
      overflightRemovalForbidden: true },
    restrictions: { neverEngaged: true, canCharge: false, canBeCharged: false,
      combatPhaseParticipation: false, closeRanks: false, closeCombatTarget: false,
      missionControlOrContest: false },
    currentOfficialMovableFlyingCarrierAvailable: false,
    productionQuarantined: true,
    trainingTruth: false,
  };
  return Object.freeze({ ...body, planHash: hashStarcraftTmgContract(body) });
}
