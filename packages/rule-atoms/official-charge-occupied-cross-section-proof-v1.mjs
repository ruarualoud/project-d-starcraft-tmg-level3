// A sufficient (not exhaustive) post-roll Charge failure certificate. A
// round, ground leader must cross a horizontal line occupied by another round
// base before it can engage any model of the declared enemy Unit. This proves
// a path-length lower bound; a formation search returning no options does not.

import { evaluateOfficialChargeCompositeCrossSectionProofV1 } from
  "./official-charge-composite-cross-section-proof-v1.mjs";

export const OFFICIAL_CHARGE_OCCUPIED_CROSS_SECTION_PROOF_VERSION =
  "starcraft_tmg_charge_occupied_cross_section_proof_v1";

// One milli-inch protects the rounding in each individual geometry bound.
// The final strict comparison reserves two more for the rounded path length.
const SAFETY_MILLI_INCHES = 1;

function unknown(reason) {
  return { schemaVersion: OFFICIAL_CHARGE_OCCUPIED_CROSS_SECTION_PROOF_VERSION,
    allLegalChargePathsExcluded: false, reason, trainingTruth: false };
}

function milli(value) {
  const result = Math.round(Number(value) * 1000);
  return Number.isSafeInteger(result) ? result : null;
}

function active(piece) {
  return piece?.isOnField === true && piece.isDestroyed !== true;
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) =>
    model.isOnField !== false && model.isDestroyed !== true);
}

function roundGround(model) {
  const width = milli(model?.baseWidthInches);
  const depth = milli(model?.baseDepthInches);
  const x = milli(model?.xInches);
  const y = milli(model?.yInches);
  return model?.baseShape === "round" && model.elevation === "ground"
    && width > 0 && width === depth && x !== null && y !== null
    ? { id: model.id, x, y, radiusFloor: Math.floor(width / 2),
      radiusCeil: Math.ceil(width / 2) } : null;
}

function pointDistance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function crossedLineLowerBound(leader, target, blocker, engagementRadius) {
  // Shrinking the collision interval and enlarging the engagement disk can
  // only make this lower bound more generous to a putative legal path.
  const clearance = leader.radiusFloor + blocker.radiusFloor
    - SAFETY_MILLI_INCHES;
  if (clearance <= 0) return null;
  const left = blocker.x - clearance;
  const right = blocker.x + clearance;
  if (leader.y >= blocker.y || target.y - engagementRadius <= blocker.y
    || leader.x < left || leader.x > right
    || target.x < left || target.x > right) return null;
  // Every continuous path crosses y = blocker.y. At that crossing the leader
  // center must be outside [left,right]. On either outside ray both Euclidean
  // distances are monotone toward the nearer boundary, since the start and
  // target x coordinates lie inside the interval.
  const at = (x) => Math.hypot(x - leader.x, blocker.y - leader.y)
    + Math.max(0, Math.hypot(x - target.x, blocker.y - target.y)
      - engagementRadius);
  return { lowerBoundMilliInches: Math.floor(Math.min(at(left), at(right))
      - SAFETY_MILLI_INCHES),
    blockerModelId: blocker.id,
    cutYMilliInches: blocker.y,
    conservativeForbiddenXMilliInches: [left, right] };
}

function evaluateSingleBlockerProof(
  state, pending = state?.pendingAction) {
  if (pending?.stage !== "resolve_charge_after_roll"
    || pending.chargePlan?.targets?.length !== 1) {
    return unknown("unsupported_pending_or_target_count");
  }
  const actor = (state?.pieces || []).find((piece) =>
    piece.id === pending.pieceId);
  const targetRef = pending.chargePlan.targets[0];
  const enemy = (state?.pieces || []).find((piece) =>
    piece.id === targetRef.unitId);
  const leaderModels = activeModels(actor);
  const leader = roundGround(leaderModels[0]);
  const maximum = Number(pending.maxDistanceMilliInches);
  if (!active(actor) || !active(enemy) || actor.sideKey === enemy.sideKey
    || leaderModels.length !== 1
    || leaderModels[0]?.id !== pending.chargePlan.leadingModelId
    || !leader || !Number.isSafeInteger(maximum) || maximum <= 0
    || (actor.combatTags || []).some((tag) =>
      String(tag).toLowerCase() === "flying")) {
    return unknown("unsupported_leader_or_distance");
  }
  const targets = activeModels(enemy).map(roundGround);
  if (targets.length < 1 || targets.some((model) => !model)) {
    return unknown("unsupported_target_model_geometry");
  }
  const blockers = (state.pieces || []).filter((piece) =>
    piece.id !== actor.id && piece.id !== enemy.id && active(piece)
      && piece.sideKey === actor.sideKey)
    .flatMap(activeModels).map(roundGround).filter(Boolean);
  const targetCertificates = [];
  for (const target of targets) {
    // The graph accepts a base gap of 1000 milli-inches. Add room for its
    // rounding and the spatial path's one-milli-inch speed tolerance.
    const engagementRadius = leader.radiusCeil + target.radiusCeil
      + 1000 + SAFETY_MILLI_INCHES;
    const direct = Math.floor(pointDistance(leader, target)
      - engagementRadius - SAFETY_MILLI_INCHES);
    if (direct > maximum + 2) {
      targetCertificates.push({ targetModelId: target.id,
        proof: "direct_distance", lowerBoundMilliInches: direct });
      continue;
    }
    const cut = blockers.map((blocker) => crossedLineLowerBound(
      leader, target, blocker, engagementRadius)).filter(Boolean)
      .find((entry) => entry.lowerBoundMilliInches > maximum + 2);
    if (!cut) return unknown(`unresolved_target:${target.id}`);
    targetCertificates.push({ targetModelId: target.id,
      proof: "occupied_cross_section", ...cut });
  }
  return {
    schemaVersion: OFFICIAL_CHARGE_OCCUPIED_CROSS_SECTION_PROOF_VERSION,
    allLegalChargePathsExcluded: true,
    certificateKind: "occupied_cross_section_distance_shortfall",
    leadingModelId: leader.id,
    declaredTargetUnitId: enemy.id,
    declaredTargetModelId: targetRef.modelId,
    allActiveTargetModelsCovered: true,
    targetCertificates,
    maximumChargeDistanceMilliInches: maximum,
    omittedConstraintsCanOnlyEnlargeDomain: true,
    rulesTruth: "official_charge_path_length_and_model_base_collision",
    trainingTruth: false,
  };
}

export function evaluateOfficialChargeOccupiedCrossSectionShortfallProofV1(
  state, pending = state?.pendingAction) {
  // Preserve every existing sufficient certificate byte-for-byte. The fallback
  // repairs evaluator coverage of the SAME path-length/base-collision rules;
  // it does not alter rolls, movement rules or accepted historical actions.
  const original = evaluateSingleBlockerProof(state, pending);
  if (original.allLegalChargePathsExcluded) return original;
  const composite = evaluateOfficialChargeCompositeCrossSectionProofV1(state, pending);
  return composite.allLegalChargePathsExcluded
    ? { schemaVersion: OFFICIAL_CHARGE_OCCUPIED_CROSS_SECTION_PROOF_VERSION, ...composite }
    : original;
}
