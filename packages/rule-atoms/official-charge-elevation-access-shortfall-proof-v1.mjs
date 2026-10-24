// A conservative post-roll Charge failure certificate. It deliberately ignores
// obstacles, base clearance and formation: those can only lengthen a path.
// Every non-flying ground-to-high leading-model path must cross an authoritative
// access-point rectangle, so its path length is at least the centre distance
// from its start to that rectangle.

export const OFFICIAL_CHARGE_ELEVATION_ACCESS_SHORTFALL_PROOF_VERSION =
  "starcraft_tmg_charge_elevation_access_shortfall_proof_v1";

function unknown(reason) {
  return { schemaVersion:
      OFFICIAL_CHARGE_ELEVATION_ACCESS_SHORTFALL_PROOF_VERSION,
    allLegalChargePathsExcluded: false, reason, trainingTruth: false };
}

function milli(value) {
  const result = Math.round(Number(value) * 1000);
  return Number.isSafeInteger(result) ? result : null;
}

function rectangle(value) {
  const rows = ["minXMilliInches", "maxXMilliInches",
    "minYMilliInches", "maxYMilliInches"].map((key) => Number(value?.[key]));
  return rows.every(Number.isSafeInteger)
    && rows[0] < rows[1] && rows[2] < rows[3] ? rows : null;
}

function accessRows(state) {
  const agreement = state.board?.specialTerrainAgreement;
  const projected = state.board?.accessPoints;
  if (!Array.isArray(agreement?.terrainEntries)
    || !Array.isArray(projected)) return null;
  const rows = agreement.terrainEntries.flatMap((terrain) =>
    (terrain.accessPoints || []).map((access) => ({
      id: access.accessPointId,
      connects: access.connects,
      footprint: access.footprint,
    })));
  const agreementIds = rows.map((entry) => entry.id).sort();
  const projectedIds = projected.map((entry) => entry.id
    || entry.accessPointId).sort();
  if (agreementIds.length !== projectedIds.length
    || agreementIds.some((id, index) => !id
      || id !== projectedIds[index])
    || rows.some((entry) => !Array.isArray(entry.connects)
      || !rectangle(entry.footprint))) return null;
  return rows;
}

function supportedHighTarget(state, targetRef) {
  const target = state.pieces?.find((entry) =>
    entry.id === targetRef.unitId)?.models?.find((entry) =>
    entry.id === targetRef.modelId);
  if (target?.isDestroyed === true || target?.isOnField === false
    || target?.elevation !== "high"
    || !Array.isArray(target.supportTerrainIds)) return false;
  return target.supportTerrainIds.some((id) =>
    state.board.terrain?.some((terrain) => terrain.id === id
      && terrain.elevation === "high_ground"
      && terrain.standableHorizontalSurface === true));
}

export function evaluateOfficialChargeElevationAccessShortfallProofV1(
  state, pending = state?.pendingAction) {
  if (pending?.stage !== "resolve_charge_after_roll"
    || !Array.isArray(pending.chargePlan?.targets)
    || pending.chargePlan.targets.length < 1) {
    return unknown("unsupported_pending_charge");
  }
  const actor = state.pieces?.find((piece) => piece.id === pending.pieceId);
  const leader = actor?.models?.find((model) =>
    model.id === pending.chargePlan.leadingModelId);
  const startX = milli(leader?.xInches);
  const startY = milli(leader?.yInches);
  const maximum = Number(pending.maxDistanceMilliInches);
  if (!actor || actor.isOnField !== true || actor.isDestroyed === true
    || leader?.isOnField === false || leader?.isDestroyed === true
    || leader?.elevation !== "ground"
    || (actor.combatTags || []).some((tag) =>
      String(tag).toLowerCase() === "flying")
    || startX === null || startY === null
    || !Number.isSafeInteger(maximum) || maximum <= 0) {
    return unknown("unsupported_leader_or_distance");
  }
  const highTargets = pending.chargePlan.targets.filter((target) =>
    supportedHighTarget(state, target));
  if (highTargets.length < 1) return unknown("no_supported_high_target");
  const access = accessRows(state);
  if (!access) return unknown("access_projection_incomplete");
  const exits = access.filter((entry) =>
    entry.connects.includes("ground")
      && entry.connects.some((level) => level !== "ground"));
  const distances = exits.map((entry) => {
    const [minX, maxX, minY, maxY] = rectangle(entry.footprint);
    const dx = Math.max(minX - startX, startX - maxX, 0);
    const dy = Math.max(minY - startY, startY - maxY, 0);
    return { accessPointId: entry.id,
      squaredDistanceMilliInches: dx * dx + dy * dy,
      lowerBoundMilliInches: Math.floor(Math.hypot(dx, dy)) };
  }).sort((left, right) => left.squaredDistanceMilliInches
    - right.squaredDistanceMilliInches
    || left.accessPointId.localeCompare(right.accessPointId));
  // One extra milli-inch protects the same rounding tolerance used by the
  // movement kernel. A connector at or within this limit is inconclusive.
  const conservativeLimit = maximum + 1;
  if (distances.some((entry) => entry.squaredDistanceMilliInches
      <= conservativeLimit * conservativeLimit)) {
    return unknown("ground_exit_within_rolled_move");
  }
  return {
    schemaVersion: OFFICIAL_CHARGE_ELEVATION_ACCESS_SHORTFALL_PROOF_VERSION,
    allLegalChargePathsExcluded: true,
    reason: "all_ground_elevation_exits_beyond_rolled_move",
    certificateKind: "mandatory_elevation_access_shortfall",
    leadingModelId: leader.id,
    highTargetModelIds: highTargets.map((entry) => entry.modelId).sort(),
    maximumChargeDistanceMilliInches: maximum,
    conservativeLimitMilliInches: conservativeLimit,
    groundExitCount: exits.length,
    groundExitDistances: distances,
    allGroundExitsEnumeratedFromOfficialAgreement: true,
    noOtherGeometryOrFormationConstraintsNeeded: true,
    omittedConstraintsCanOnlyEnlargeDomain: true,
    rulesTruth: "official_ground_high_engagement_and_mandatory_access_point_path",
    trainingTruth: false,
  };
}
