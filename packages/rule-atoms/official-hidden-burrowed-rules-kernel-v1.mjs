import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialHiddenBurrowedDataBundleV1 } from
  "../source-data/official-hidden-burrowed-data-bundle-v1.mjs";

const PROCEDURE_KINDS = Object.freeze([
  "derive_burrowed_permissions",
  "evaluate_burrowed_combat_activation",
  "evaluate_burrowed_movement_pass_through",
  "evaluate_hidden_burrowed_attack_defense",
  "evaluate_hidden_targeting_visibility",
  "reconcile_burrowed_hidden_lifecycle",
]);
const LIFECYCLE_TRIGGERS = new Map([
  ["gain_burrowed", "burrowed_gained"],
  ["start_round", "start_of_round_resolved"],
  ["remove_burrowed", "burrowed_removed"],
  ["action_performed", "unit_action_performed"],
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function result(body) {
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function normalized(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/gu, "_");
}
function statusName(value) {
  return normalized(object(value)
    ? value.statusName || value.name || value.keyword || value.status
    : value);
}
function hasStatus(piece, name) {
  return Array.isArray(piece?.statuses)
    && piece.statuses.some((entry) => statusName(entry) === name);
}
function activePiece(piece) {
  return object(piece) && piece.isOnField === true && piece.isDestroyed !== true
    && Number(piece.currentModels || 0) > 0;
}
function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}
function validate(input) {
  verifyOfficialHiddenBurrowedDataBundleV1(input.hiddenBurrowedDataBundle);
  const state = input.state;
  if (!object(state) || !Array.isArray(state.pieces) || !object(state.players)
    || !object(state.board) || input.rulesOwnedStateRequested !== true
    || input.clientSuppliedMutation !== undefined) {
    fail("HIDDEN_BURROWED_STATE_INVALID");
  }
  const ids = state.pieces.map((piece) => nonEmpty(piece?.id, "HIDDEN_BURROWED_PIECE_INVALID"));
  if (new Set(ids).size !== ids.length) fail("HIDDEN_BURROWED_PIECE_DUPLICATE");
  return { state, bundle: input.hiddenBurrowedDataBundle };
}
function pieceFor(state, pieceId, { active = true } = {}) {
  const id = nonEmpty(pieceId, "HIDDEN_BURROWED_PIECE_REQUIRED");
  const piece = state.pieces.find((entry) => entry?.id === id);
  if (!piece || (active && !activePiece(piece))) fail("HIDDEN_BURROWED_PIECE_NOT_FOUND", id);
  return piece;
}
function patch(piece, set) {
  return { pieceId: piece.id, expectedBeforePieceHash: hashStarcraftTmgContract(piece),
    set, deleteFields: [] };
}
function emptyMutation() {
  return { piecePatches: [], removeBoardTokenIds: [], removeEffectMarkerIds: [] };
}
function stateEvents(state) {
  return (state.log || []).flatMap((entry) => entry?.events || []);
}
function eventByHash(state, eventHash, code) {
  const hash = nonEmpty(eventHash, code);
  const event = stateEvents(state).find((entry) => hashStarcraftTmgContract(entry) === hash);
  if (!event) fail(code);
  return event;
}
function point(model, code = "HIDDEN_BURROWED_GEOMETRY_INVALID") {
  const x = Math.round(Number(model?.xInches) * 1000);
  const y = Math.round(Number(model?.yInches) * 1000);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) fail(code);
  return { xMilliInches: x, yMilliInches: y };
}
function routePoint(value) {
  const x = Number(value?.xMilliInches);
  const y = Number(value?.yMilliInches);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    fail("BURROWED_MOVEMENT_PATH_INVALID");
  }
  return { xMilliInches: x, yMilliInches: y };
}
function radius(model) {
  if (model?.baseShape !== "round") fail("HIDDEN_BURROWED_ROUND_BASE_REQUIRED");
  const width = Math.round(Number(model.baseWidthInches) * 1000);
  const depth = Math.round(Number(model.baseDepthInches) * 1000);
  if (!Number.isSafeInteger(width) || width <= 0 || width !== depth) {
    fail("HIDDEN_BURROWED_ROUND_BASE_REQUIRED");
  }
  return Math.round(width / 2);
}
function distance(left, right) {
  return Math.hypot(left.xMilliInches - right.xMilliInches,
    left.yMilliInches - right.yMilliInches);
}
function baseGap(leftModel, rightModel) {
  return Math.max(0, Math.round(distance(point(leftModel), point(rightModel))
    - radius(leftModel) - radius(rightModel)));
}
function pointSegmentDistance(p, a, b) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  if (dx === 0 && dy === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1,
    ((p.xMilliInches - a.xMilliInches) * dx
      + (p.yMilliInches - a.yMilliInches) * dy) / ((dx * dx) + (dy * dy))));
  return distance(p, { xMilliInches: a.xMilliInches + (t * dx),
    yMilliInches: a.yMilliInches + (t * dy) });
}
function addStatus(statuses, name, triggerEventHash) {
  if (statuses.some((entry) => statusName(entry) === name)) return statuses;
  return [...statuses, { name, statusClassification: true,
    source: "official_hidden_burrowed_rules_v1", triggerEventHash }];
}
function removeStatuses(statuses, names) {
  return statuses.filter((entry) => !names.includes(statusName(entry)));
}

export function resolveOfficialBurrowedHiddenLifecycleV1(input = {}) {
  const { state, bundle } = validate(input);
  const piece = pieceFor(state, input.pieceId);
  const triggerKind = normalized(input.triggerKind);
  const expectedEventType = LIFECYCLE_TRIGGERS.get(triggerKind);
  const event = eventByHash(state, input.triggerEventHash,
    "HIDDEN_BURROWED_LIFECYCLE_TRIGGER_INVALID");
  if (input.procedureKind !== "reconcile_burrowed_hidden_lifecycle"
    || !expectedEventType || event.type !== expectedEventType
    || (event.pieceId || event.targetPieceId) !== piece.id) {
    fail("HIDDEN_BURROWED_LIFECYCLE_TRIGGER_INVALID", piece.id);
  }
  let statuses = [...(piece.statuses || [])];
  let burrowedAdded = false; let hiddenAdded = false;
  let burrowedRemoved = false; let hiddenRemoved = false;
  if (triggerKind === "gain_burrowed") {
    const beforeBurrowed = hasStatus({ statuses }, "burrowed");
    const beforeHidden = hasStatus({ statuses }, "hidden");
    statuses = addStatus(statuses, "burrowed", input.triggerEventHash);
    statuses = addStatus(statuses, "hidden", input.triggerEventHash);
    burrowedAdded = !beforeBurrowed; hiddenAdded = !beforeHidden;
  } else if (triggerKind === "start_round") {
    if (state.phase !== "start_of_round" || !hasStatus(piece, "burrowed")) {
      fail("BURROWED_START_ROUND_TRIGGER_INVALID", piece.id);
    }
    const beforeHidden = hasStatus({ statuses }, "hidden");
    statuses = addStatus(statuses, "hidden", input.triggerEventHash);
    hiddenAdded = !beforeHidden;
  } else if (triggerKind === "remove_burrowed") {
    if (!hasStatus(piece, "burrowed")) fail("BURROWED_REMOVAL_TRIGGER_INVALID", piece.id);
    burrowedRemoved = true; hiddenRemoved = hasStatus(piece, "hidden");
    statuses = removeStatuses(statuses, ["burrowed", "hidden"]);
  } else {
    const actionType = normalized(event.actionType);
    if (!bundle.ruleConstants.burrowedActionWhitelist.includes(actionType)
      || !hasStatus(piece, "burrowed")) {
      fail("BURROWED_ACTION_NOT_PERMITTED", actionType);
    }
    if (actionType !== "hold") {
      burrowedRemoved = true; hiddenRemoved = hasStatus(piece, "hidden");
      statuses = removeStatuses(statuses, ["burrowed", "hidden"]);
    }
  }
  return result({
    schema: "starcraft_tmg_official_burrowed_hidden_lifecycle_resolution_v1",
    procedureKind: "reconcile_burrowed_hidden_lifecycle", pieceId: piece.id,
    triggerKind, triggerEventHash: input.triggerEventHash,
    burrowedAdded, hiddenAdded, burrowedRemoved, hiddenRemoved,
    statusClassification: { burrowed: "status", hidden: "status" },
    mutation: { ...emptyMutation(), piecePatches: [patch(piece, { statuses })] },
    hiddenBurrowedDataBundleHash: bundle.bundleHash,
    clientSuppliedMutationAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialHiddenTargetingVisibilityV1(input = {}) {
  const { state, bundle } = validate(input);
  const actingPiece = pieceFor(state, input.actingPieceId);
  const targetPiece = pieceFor(state, input.targetPieceId);
  const actingModel = activeModels(actingPiece).find((model) => model.id === input.actingModelId);
  const targetModels = activeModels(targetPiece);
  const selectionKind = normalized(input.selectionKind);
  if (input.procedureKind !== "evaluate_hidden_targeting_visibility"
    || !actingModel || targetModels.length === 0
    || !["los_special_ability", "ranged_attack", "visibility"].includes(selectionKind)
    || typeof input.requiresLineOfSight !== "boolean") {
    fail("HIDDEN_TARGETING_QUERY_INVALID");
  }
  const hidden = hasStatus(targetPiece, "hidden");
  const distances = targetModels.map((model) => ({ targetModelId: model.id,
    baseGapMilliInches: baseGap(actingModel, model) }));
  const distanceMilliInches = Math.min(...distances.map((entry) => entry.baseGapMilliInches));
  const restrictedKind = selectionKind === "ranged_attack"
    || (selectionKind === "los_special_ability" && input.requiresLineOfSight);
  const withinFour = distanceMilliInches
    <= bundle.ruleConstants.hiddenMaximumTargetingDistanceMilliInches;
  const distanceAllowsSelection = !hidden || !restrictedKind || withinFour;
  const visible = !hidden || withinFour;
  return result({
    schema: "starcraft_tmg_official_hidden_targeting_visibility_resolution_v1",
    procedureKind: "evaluate_hidden_targeting_visibility",
    actingPieceId: actingPiece.id, actingModelId: actingModel.id,
    targetPieceId: targetPiece.id, selectionKind, requiresLineOfSight: input.requiresLineOfSight,
    hidden, distanceAssessments: distances, distanceMilliInches,
    maximumDistanceMilliInches: bundle.ruleConstants.hiddenMaximumTargetingDistanceMilliInches,
    withinFourInches: withinFour, distanceAllowsSelection, visible,
    lineOfSightStillRequiredByExistingConsumer: input.requiresLineOfSight,
    hiddenOverridesPositiveLineOfSightBeyondFourInches: hidden && !withinFour,
    nonLineOfSightSpecialAbilityUnaffected: selectionKind === "los_special_ability"
      && !input.requiresLineOfSight,
    mutation: emptyMutation(), hiddenBurrowedDataBundleHash: bundle.bundleHash,
    clientSuppliedVisibilityAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialHiddenBurrowedAttackDefenseV1(input = {}) {
  const { state, bundle } = validate(input);
  const target = pieceFor(state, input.targetPieceId);
  const event = eventByHash(state, input.attackEventHash,
    "HIDDEN_BURROWED_ATTACK_EVENT_INVALID");
  const attackKind = normalized(input.attackKind);
  if (input.procedureKind !== "evaluate_hidden_burrowed_attack_defense"
    || !["impact", "targeting_attack"].includes(attackKind)
    || event.targetPieceId !== target.id
    || (attackKind === "impact" && event.type !== "impact_pending")
    || (attackKind === "targeting_attack" && event.type !== "attack_targeted")) {
    fail("HIDDEN_BURROWED_ATTACK_EVENT_INVALID", target.id);
  }
  if ((state.hiddenBurrowedHistory || []).some((entry) => (
    entry.result?.attackEventHash === input.attackEventHash
  ))) fail("HIDDEN_BURROWED_ATTACK_EVENT_ALREADY_RESOLVED");
  const hidden = hasStatus(target, "hidden");
  const burrowed = hasStatus(target, "burrowed");
  const impactImmune = attackKind === "impact" && hidden;
  const evadeEligible = attackKind === "targeting_attack" && (hidden || burrowed);
  return result({
    schema: "starcraft_tmg_official_hidden_burrowed_attack_defense_resolution_v1",
    procedureKind: "evaluate_hidden_burrowed_attack_defense",
    targetPieceId: target.id, attackEventHash: input.attackEventHash, attackKind,
    hidden, burrowed, impactImmune, evadeEligible,
    evadeOpportunityCount: evadeEligible ? 1 : 0,
    duplicateEvadeFromBothStatusesAllowed: false,
    everyTargetingAttackEvaluatedIndependently: true,
    damageResolutionDirective: impactImmune ? "suppress_all_impact_damage"
      : evadeEligible ? "roll_evade_after_armour_for_this_attack" : "ordinary_resolution",
    mutation: emptyMutation(), hiddenBurrowedDataBundleHash: bundle.bundleHash,
    clientSuppliedDefenseAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialBurrowedMovementPassThroughV1(input = {}) {
  const { state, bundle } = validate(input);
  const movingPiece = pieceFor(state, input.movingPieceId);
  const burrowedPiece = pieceFor(state, input.burrowedPieceId);
  const movingModel = activeModels(movingPiece).find((model) => model.id === input.movingModelId);
  const burrowedModels = activeModels(burrowedPiece);
  const points = (input.pathPoints || []).map(routePoint);
  if (input.procedureKind !== "evaluate_burrowed_movement_pass_through"
    || !movingModel || !hasStatus(burrowedPiece, "burrowed")
    || movingPiece.id === burrowedPiece.id || burrowedModels.length === 0
    || points.length < 2 || points.length > 1024
    || distance(points[0], point(movingModel)) > 1) {
    fail("BURROWED_MOVEMENT_QUERY_INVALID");
  }
  const movingRadius = radius(movingModel);
  const assessments = burrowedModels.map((model) => {
    const center = point(model); const blockerRadius = radius(model);
    const minimumPathCenterDistance = Math.min(...points.slice(1).map((endpoint, index) => (
      pointSegmentDistance(center, points[index], endpoint)
    )));
    const endpointGapMilliInches = Math.max(0, Math.round(
      distance(center, points.at(-1)) - movingRadius - blockerRadius,
    ));
    return { burrowedModelId: model.id,
      pathCrossesBase: minimumPathCenterDistance <= movingRadius + blockerRadius,
      minimumPathCenterDistanceMilliInches: Math.round(minimumPathCenterDistance),
      endpointGapMilliInches,
      endpointBeyondEngagementRange: endpointGapMilliInches
        >= bundle.ruleConstants.burrowedEngagementRangeMilliInches };
  });
  const endpointLegal = assessments.every((entry) => entry.endpointBeyondEngagementRange);
  return result({
    schema: "starcraft_tmg_official_burrowed_movement_pass_through_resolution_v1",
    procedureKind: "evaluate_burrowed_movement_pass_through",
    movingPieceId: movingPiece.id, movingModelId: movingModel.id,
    burrowedPieceId: burrowedPiece.id, pathPoints: points, assessments,
    burrowedModelsDoNotBlockPath: true, endpointLegal,
    engagementRangeMilliInches: bundle.ruleConstants.burrowedEngagementRangeMilliInches,
    otherMovementGeometryStillRequiredByExistingConsumer: true,
    mutation: emptyMutation(), hiddenBurrowedDataBundleHash: bundle.bundleHash,
    clientSuppliedCollisionResultAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialBurrowedCombatActivationV1(input = {}) {
  const { state, bundle } = validate(input);
  const piece = pieceFor(state, input.pieceId);
  const snapshot = eventByHash(state, input.combatStartEventHash,
    "BURROWED_COMBAT_START_EVENT_INVALID");
  const role = normalized(input.role);
  if (input.procedureKind !== "evaluate_burrowed_combat_activation"
    || state.phase !== "combat" || snapshot.type !== "combat_phase_start_engagement"
    || !Array.isArray(snapshot.engagedUnitIds) || !snapshot.engagedUnitIds.includes(piece.id)
    || !["burrowed_actor", "enemy_attacking_burrowed"].includes(role)) {
    fail("BURROWED_COMBAT_START_EVENT_INVALID", piece.id);
  }
  if (role === "enemy_attacking_burrowed") {
    if (!hasStatus(piece, "burrowed")) fail("BURROWED_COMBAT_TARGET_REQUIRED", piece.id);
    return result({ schema: "starcraft_tmg_official_burrowed_combat_activation_resolution_v1",
      procedureKind: "evaluate_burrowed_combat_activation", pieceId: piece.id, role,
      combatStartEventHash: input.combatStartEventHash, mustActivate: false,
      closeCombatAttackAllowed: true, enemyAttacksNormally: true,
      targetStillReceivesPerAttackEvadeEvaluation: true,
      mutation: emptyMutation(), hiddenBurrowedDataBundleHash: bundle.bundleHash,
      clientSuppliedAttackPermissionAccepted: false, trainingTruth: false });
  }
  const burrowed = hasStatus(piece, "burrowed");
  let closeRanksWitness = null;
  if (input.closeRanksEventHash) {
    closeRanksWitness = eventByHash(state, input.closeRanksEventHash,
      "BURROWED_CLOSE_RANKS_WITNESS_INVALID");
    if (closeRanksWitness.type !== "close_ranks_resolved"
      || closeRanksWitness.pieceId !== piece.id
      || closeRanksWitness.burrowedRemoved !== true) {
      fail("BURROWED_CLOSE_RANKS_WITNESS_INVALID", piece.id);
    }
  }
  const closeCombatAttackAllowed = Boolean(closeRanksWitness) && !burrowed;
  return result({
    schema: "starcraft_tmg_official_burrowed_combat_activation_resolution_v1",
    procedureKind: "evaluate_burrowed_combat_activation", pieceId: piece.id, role,
    combatStartEventHash: input.combatStartEventHash,
    closeRanksEventHash: input.closeRanksEventHash || null,
    mustActivate: true, burrowedAtResolution: burrowed,
    closeRanksRequiredBeforeAttack: true, closeCombatAttackAllowed,
    noAttackWhileStillBurrowed: burrowed,
    mutation: emptyMutation(), hiddenBurrowedDataBundleHash: bundle.bundleHash,
    clientSuppliedAttackPermissionAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialBurrowedPermissionsV1(input = {}) {
  const { state, bundle } = validate(input);
  const piece = pieceFor(state, input.pieceId);
  if (input.procedureKind !== "derive_burrowed_permissions" || !hasStatus(piece, "burrowed")) {
    fail("BURROWED_PERMISSION_QUERY_INVALID", piece.id);
  }
  return result({
    schema: "starcraft_tmg_official_burrowed_permissions_resolution_v1",
    procedureKind: "derive_burrowed_permissions", pieceId: piece.id,
    effectiveSize: bundle.ruleConstants.burrowedEffectiveSize,
    disengageCurrentSupply: bundle.ruleConstants.burrowedDisengageCurrentSupply,
    permittedActionTypes: [...bundle.ruleConstants.burrowedActionWhitelist],
    statusRemovingActionTypes: [...bundle.ruleConstants.burrowedStatusRemovingActions],
    holdPreservesBurrowed: true, specialAbilitiesAllowedByDefault: true,
    missionControlProhibitedByExistingExecutableAtom: true,
    mutation: emptyMutation(), hiddenBurrowedDataBundleHash: bundle.bundleHash,
    clientSuppliedPermissionAccepted: false, trainingTruth: false,
  });
}

export function resolveOfficialHiddenBurrowedProcedureV1(input = {}) {
  switch (input.procedureKind) {
    case "derive_burrowed_permissions": return resolveOfficialBurrowedPermissionsV1(input);
    case "evaluate_burrowed_combat_activation":
      return resolveOfficialBurrowedCombatActivationV1(input);
    case "evaluate_burrowed_movement_pass_through":
      return resolveOfficialBurrowedMovementPassThroughV1(input);
    case "evaluate_hidden_burrowed_attack_defense":
      return resolveOfficialHiddenBurrowedAttackDefenseV1(input);
    case "evaluate_hidden_targeting_visibility":
      return resolveOfficialHiddenTargetingVisibilityV1(input);
    case "reconcile_burrowed_hidden_lifecycle":
      return resolveOfficialBurrowedHiddenLifecycleV1(input);
    default: fail("HIDDEN_BURROWED_PROCEDURE_KIND_INVALID");
  }
}

export function officialHiddenBurrowedProcedureKindsV1() {
  return [...PROCEDURE_KINDS];
}
