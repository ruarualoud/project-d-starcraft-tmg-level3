import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import {
  createOfficialCharacteristicStatusKernelV2,
  OFFICIAL_CHARACTERISTIC_STATUS_V2_NEW_ATOM_IDS,
} from "./official-characteristic-status-kernel-v2.mjs";
import {
  enumerateOfficialMarineStimpackActiveV1,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS,
} from "./official-marine-stimpack-active-executor-v1.mjs";
import {
  createOfficialMarineStimpackKernelV1,
  OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MARINE_STIMPACK_SOURCE_V1,
} from "./official-marine-stimpack-kernel-v1.mjs";
import {
  createOfficialRoundSupplyStateV1,
  verifyOfficialRoundSupplyStateV1,
} from "./official-round-supply-state-v1.mjs";
import {
  OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS,
} from "./official-standard-move-executor-v1.mjs";

export const OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID =
  "authority.stimpack-move-consumer-v1";
export const OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_STIMPACK_MOVE_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_STIMPACK_MOVE_PARAMETER_KIND =
  "official_stimpack_move_path_v1";
export const OFFICIAL_STIMPACK_MOVE_NEW_ATOM_IDS = Object.freeze([
  ...OFFICIAL_CHARACTERISTIC_STATUS_V2_NEW_ATOM_IDS,
]);
export const OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS,
    ...OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS,
    ...OFFICIAL_STIMPACK_MOVE_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_STIMPACK_MOVE_EXECUTOR_ATOM_IDS =
  OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS;

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const MARINE_RECORD_KEY = "army_units:marine";
const BASE_DIAMETER_MILLI_INCHES = Math.round((32 / 25.4) * 1000);
const BASE_RADIUS_MILLI_INCHES = Math.round(BASE_DIAMETER_MILLI_INCHES / 2);
const MAX_RAW_PATH_POINTS = 64;
const MAX_CANONICAL_PATH_POINTS = 32;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const PATH_SCHEMA = "starcraft_tmg_official_stimpack_move_path_v1";
const PLAN_SCHEMA = "starcraft_tmg_official_stimpack_move_plan_v1";
const STIMPACK_KERNEL = createOfficialMarineStimpackKernelV1();
const CHARACTERISTIC_KERNEL = createOfficialCharacteristicStatusKernelV2();

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function actionFromCandidate(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("STIMPACK_MOVE_RUNTIME_BINDING_REQUIRED");
  return value;
}

function milli(value, code = "STIMPACK_MOVE_GEOMETRY_INVALID") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function inches(value) {
  return Number((Number(value) / 1000).toFixed(3));
}

function point(model) {
  return {
    xMilliInches: milli(model?.xInches),
    yMilliInches: milli(model?.yInches),
  };
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
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}

function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("STIMPACK_MOVE_SIDE_REQUIRED");
}

function beforeMoveAbility(state, sideKey, matchBinding) {
  const actions = enumerateOfficialMarineStimpackActiveV1(state, {
    sideKey,
    matchBinding,
    throwOnError: true,
  });
  const candidate = actions.find((row) => row.abilityWindow === "before_action");
  if (!candidate) fail("STIMPACK_MOVE_BEFORE_ACTION_UNAVAILABLE");
  return actionFromCandidate(candidate);
}

function verifyMovementInitiative(state, sideKey) {
  const choice = state.phaseFirstActorByRound?.[`${Number(state.round)}:movement`];
  if (!object(choice)
    || choice.round !== Number(state.round)
    || choice.phase !== "movement"
    || !SIDE_KEYS.includes(choice.chosenFirstActorSideKey)
    || state.activeSideKey !== sideKey) {
    fail("STIMPACK_MOVE_MOVEMENT_INITIATIVE_UNRESOLVED");
  }
}

function contextFor(state, sideKey, matchBinding) {
  if (!object(state) || !SIDE_KEYS.includes(sideKey)) fail("STIMPACK_MOVE_STATE_INVALID");
  verifyMovementInitiative(state, sideKey);
  const abilityAction = beforeMoveAbility(state, sideKey, matchBinding);
  const piece = state.pieces.find((row) => row.id === abilityAction.pieceId);
  const models = activeModels(piece);
  if (models.length !== 1) fail("STIMPACK_MOVE_SINGLE_MODEL_SCOPE_REQUIRED");
  if (Number(state.board?.widthInches) !== 54
    || Number(state.board?.heightInches) !== 36) {
    fail("STIMPACK_MOVE_BATTLEFIELD_DRIFT");
  }
  const boundRuntimeHash = runtimeHash(matchBinding);
  verifyOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: state.officialGameplayDataBundle,
    rulesRuntimeHash: boundRuntimeHash,
    roundSupplyState: state.officialRoundSupplyState,
  });
  const statusPair = STIMPACK_KERNEL.createStatus({
    round: Number(state.round),
    sourceSideKey: sideKey,
    sourcePieceId: piece.id,
    abilityResolutionHash: abilityAction.abilityPlanHash,
  });
  const buffResolution = CHARACTERISTIC_KERNEL.applyValueBuff({
    status: statusPair.status,
    characteristic: "speed",
    printedValue: 7,
  });
  if (buffResolution.effectiveValue !== 10) fail("STIMPACK_MOVE_EFFECTIVE_SPEED_DRIFT");
  const enemy = state.pieces.find((row) => row.sideKey === otherSide(sideKey));
  const enemyModels = activeModels(enemy);
  if (enemyModels.length !== 1) fail("STIMPACK_MOVE_EXACT_OPPONENT_SCOPE_REQUIRED");
  return {
    abilityAction,
    piece,
    model: models[0],
    enemyModel: enemyModels[0],
    boundRuntimeHash,
    statusPair,
    buffResolution,
  };
}

function domainFor(state, context, matchBinding) {
  const start = point(context.model);
  const core = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_STIMPACK_MOVE_PARAMETER_KIND,
    matchBindingHash: String(matchBinding?.bindingHash || ""),
    round: Number(state.round),
    phase: "movement",
    sideKey: context.piece.sideKey,
    actionType: "move",
    pieceId: context.piece.id,
    executorId: OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["leadingModelId", "path", "placements"],
      pathUnit: "milli-inch",
      coordinateType: "safe_integer",
      maxCanonicalPathPoints: MAX_CANONICAL_PATH_POINTS,
      exactRemainingPlacementCount: 0,
    },
    constraints: {
      modelIds: [context.model.id],
      modelStartPoints: { [context.model.id]: start },
      enemyModelPoint: point(context.enemyModel),
      baseDiameterMilliInches: BASE_DIAMETER_MILLI_INCHES,
      battlefieldWidthMilliInches: 54000,
      battlefieldHeightMilliInches: 36000,
      printedSpeedMilliInches: 7000,
      buffModifierMilliInches: 3000,
      maxDistanceMilliInches: 10000,
      valueBuffResolutionHash: context.buffResolution.valueBuffResolutionHash,
      predictedStatusEffectHash: context.statusPair.status.statusEffectHash,
      predictedMarkerHash: context.statusPair.marker.markerHash,
      abilityActionHash: hashStarcraftTmgContract(context.abilityAction),
      roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
      gameplayDataBundleHash:
        state.officialGameplayDataBundle.gameplayDataBundleHash,
      printedSpeedSource: {
        sourceRecordHash:
          "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
        sourceValue: "4/7",
        selectedSingleModelValue: 7,
      },
      baseDiameterSource: {
        sourceContentHash:
          "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
        reviewedValue: "32mm",
      },
      geometryScope:
        "current_single_model_marine_empty_terrain_round_base_stimpack_before_move_v1",
    },
    confirmationClass: "direct_gesture_plus_resource_payment",
    rulesTruth: "official_stimpack_speed_buff_standard_move_parameter_domain_exact_subset",
    trainingTruth: false,
  };
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

function diagnostic(state, sideKey, error) {
  return {
    actionType: "move",
    sideKey,
    phase: "movement",
    pieceId: "",
    abilityId: "stimpack",
    ruleAtomIds: [...OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_stimpack_move_fail_closed",
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialStimpackMoveV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("STIMPACK_MOVE_SIDE_REQUIRED");
  try {
    const context = contextFor(state, sideKey, options.matchBinding);
    return {
      candidates: [],
      parameterDomains: [domainFor(state, context, options.matchBinding)],
    };
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return {
      candidates: options.includeDisabled === true
        ? [diagnostic(state, sideKey, error)]
        : [],
      parameterDomains: [],
    };
  }
}

function canonicalPath(start, raw) {
  if (!Array.isArray(raw) || raw.length === 0) fail("STIMPACK_MOVE_PATH_REQUIRED");
  if (raw.length > MAX_RAW_PATH_POINTS) fail("STIMPACK_MOVE_PATH_TOO_COMPLEX");
  const normalized = [start];
  for (const [index, value] of raw.entries()) {
    const next = safePoint(value, "STIMPACK_MOVE_PATH_POINT_INVALID", String(index));
    if (!pointEquals(normalized.at(-1), next)) normalized.push(next);
  }
  if (normalized.length < 2) fail("STIMPACK_MOVE_PATH_MUST_CHANGE_POSITION");
  const points = [];
  for (const value of normalized) {
    while (points.length >= 2 && collinear(points.at(-2), points.at(-1), value)) points.pop();
    points.push(value);
  }
  if (points.length > MAX_CANONICAL_PATH_POINTS) fail("STIMPACK_MOVE_PATH_TOO_COMPLEX");
  let distanceMilliInches = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceMilliInches += Math.round(distance(points[index - 1], points[index]));
  }
  return { schemaVersion: PATH_SCHEMA, unit: "milli-inch", points, distanceMilliInches };
}

function validatePath(domain, path) {
  if (path.distanceMilliInches > domain.constraints.maxDistanceMilliInches) {
    fail("STIMPACK_MOVE_PATH_EXCEEDS_BUFFED_SPEED");
  }
  const radius = Math.round(domain.constraints.baseDiameterMilliInches / 2);
  for (const endpoint of path.points.slice(1)) {
    if (endpoint.xMilliInches < radius
      || endpoint.xMilliInches > domain.constraints.battlefieldWidthMilliInches - radius
      || endpoint.yMilliInches < radius
      || endpoint.yMilliInches > domain.constraints.battlefieldHeightMilliInches - radius) {
      fail("STIMPACK_MOVE_PATH_OUTSIDE_BATTLEFIELD");
    }
  }
  const blocker = domain.constraints.enemyModelPoint;
  for (let index = 1; index < path.points.length; index += 1) {
    if (pointToSegmentDistance(blocker, path.points[index - 1], path.points[index])
      < BASE_DIAMETER_MILLI_INCHES - 1) {
      fail("STIMPACK_MOVE_PATH_COLLISION");
    }
  }
  const endpoint = path.points.at(-1);
  const edgeDistance = distance(endpoint, blocker) - (BASE_RADIUS_MILLI_INCHES * 2);
  if (edgeDistance <= 1000) fail("STIMPACK_MOVE_ENEMY_ENGAGEMENT_RANGE");
}

function canonicalAction(domain, plan) {
  return {
    actionType: "move",
    sideKey: domain.sideKey,
    phase: "movement",
    pieceId: domain.pieceId,
    abilityId: OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityId,
    abilityName: OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityName,
    abilityWindow: "before_action",
    underlyingAction: "move",
    cardResourceId: plan.cardResourceId,
    resourceType: "CP",
    resourceCost: 1,
    nonLethalDamage: 2,
    speedBuff: 3,
    precision: 3,
    abilityPlanHash: plan.abilityPlanHash,
    movePlan: clone(plan),
    ruleAtomIds: [...OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION,
  };
}

export function instantiateOfficialStimpackMoveV1(
  state,
  domain,
  parameters,
  options = {},
) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_STIMPACK_MOVE_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION) {
    fail("STIMPACK_MOVE_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialStimpackMoveV1(state, {
    sideKey: domain.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  });
  const expected = current.parameterDomains.find((row) => row.domainId === domain.domainId);
  if (!expected || !isDeepStrictEqual(expected, domain)) {
    fail("STIMPACK_MOVE_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters)
    || Object.keys(parameters).some((key) => ![
      "leadingModelId", "path", "placements",
    ].includes(key))
    || !Array.isArray(parameters.placements)
    || parameters.placements.length !== 0) {
    fail("STIMPACK_MOVE_PARAMETERS_INVALID");
  }
  const leadingModelId = String(parameters.leadingModelId || "").trim();
  if (!domain.constraints.modelIds.includes(leadingModelId)) {
    fail("STIMPACK_MOVE_LEADING_MODEL_INVALID");
  }
  const path = canonicalPath(
    domain.constraints.modelStartPoints[leadingModelId],
    parameters.path,
  );
  validatePath(domain, path);
  const context = contextFor(state, domain.sideKey, options.matchBinding);
  const planBody = {
    schemaVersion: PLAN_SCHEMA,
    pieceId: domain.pieceId,
    leadingModelId,
    canonicalPath: path,
    placementSequence: [],
    finalModelPositions: [{
      modelId: leadingModelId,
      xMilliInches: path.points.at(-1).xMilliInches,
      yMilliInches: path.points.at(-1).yMilliInches,
    }],
    distanceTravelledInches: path.distanceMilliInches / 1000,
    printedSpeedInches: 7,
    speedBuff: 3,
    speedAllowanceInches: 10,
    characteristicStatusKernelHash: CHARACTERISTIC_KERNEL.descriptor.kernelHash,
    valueBuffResolution: clone(context.buffResolution),
    predictedStatusEffectHash: context.statusPair.status.statusEffectHash,
    predictedMarkerHash: context.statusPair.marker.markerHash,
    abilityPlanHash: context.abilityAction.abilityPlanHash,
    cardResourceId: context.abilityAction.cardResourceId,
    roundSupplyStateHashBefore: domain.constraints.roundSupplyStateHash,
    geometryScope: domain.constraints.geometryScope,
    trainingTruth: false,
  };
  const plan = { ...planBody, movePlanHash: hashStarcraftTmgContract(planBody) };
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: {
      leadingModelId,
      path: clone(path.points.slice(1)),
      placements: [],
    },
    action: canonicalAction(domain, plan),
    rulesTruth: "official_stimpack_before_move_buffed_speed_parameter_instantiation",
    trainingTruth: false,
  };
}

function historyEntry(state, action, nonLethal, statusPair) {
  const body = {
    schema: "starcraft_tmg_official_active_ability_use_history_entry_v1",
    round: Number(state.round),
    phase: "movement",
    sideKey: action.sideKey,
    pieceId: action.pieceId,
    targetId: action.pieceId,
    abilityId: action.abilityId,
    abilityName: action.abilityName,
    abilityWindow: "before_action",
    cardResourceId: action.cardResourceId,
    stimpackPlanHash: action.abilityPlanHash,
    nonLethalResolutionHash: nonLethal.nonLethalResolutionHash,
    statusEffectHash: statusPair.status.statusEffectHash,
    markerHash: statusPair.marker.markerHash,
    trainingTruth: false,
  };
  return { ...body, abilityUseHash: hashStarcraftTmgContract(body) };
}

export function applyOfficialStimpackMoveV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "move"
    || actionInput.executorId !== OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION
    || !object(actionInput.movePlan)) {
    fail("STIMPACK_MOVE_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialStimpackMoveV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  });
  const domain = enumeration.parameterDomains.find((row) => row.pieceId === actionInput.pieceId);
  if (!domain) fail("STIMPACK_MOVE_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialStimpackMoveV1(stateInput, domain, {
    leadingModelId: actionInput.movePlan.leadingModelId,
    path: actionInput.movePlan.canonicalPath?.points?.slice(1),
    placements: [],
  }, options);
  if (!isDeepStrictEqual(actionInput, instantiated.action)) fail("STIMPACK_MOVE_ACTION_STALE");
  const context = contextFor(stateInput, actionInput.sideKey, options.matchBinding);
  const marine = getOfficialCombatProfileV1(
    stateInput.officialGameplayDataBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  const nonLethal = STIMPACK_KERNEL.resolveNonLethalDamage({
    targetPieceId: context.piece.id,
    targetModelId: context.model.id,
    abilityResolutionHash: actionInput.abilityPlanHash,
    priorDamageMarker: 0,
    amount: 2,
    targetHitPoints: marine.hitPoints,
  });
  const state = clone(stateInput);
  const piece = state.pieces.find((row) => row.id === actionInput.pieceId);
  const model = activeModels(piece)[0];
  const endpoint = actionInput.movePlan.finalModelPositions[0];
  const card = state.cardResources[actionInput.sideKey].find((row) => (
    row.id === actionInput.cardResourceId
  ));
  if (!card || card.readiness !== "ready" || card.face !== "up") {
    fail("STIMPACK_MOVE_PAYMENT_CARD_STALE");
  }
  card.readiness = "exhausted";
  card.face = "down";
  piece.damageMarker = nonLethal.postDamageMarker;
  piece.statuses = [clone(context.statusPair.status)];
  state.board.effectMarkers = [clone(context.statusPair.marker)];
  model.xInches = inches(endpoint.xMilliInches);
  model.yInches = inches(endpoint.yMilliInches);
  piece.xInches = model.xInches;
  piece.yInches = model.yInches;
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    movement: true,
  };
  piece.inCoherency = true;
  piece.lastLeadingModelId = model.id;
  piece.lastMovePlanHash = actionInput.movePlan.movePlanHash;
  const history = historyEntry(state, actionInput, nonLethal, context.statusPair);
  state.activeAbilityUseHistory = Array.isArray(state.activeAbilityUseHistory)
    ? state.activeAbilityUseHistory
    : [];
  state.activeAbilityUseHistory.push(history);
  const previousSupplyHash = state.officialRoundSupplyState.roundSupplyStateHash;
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: state.officialGameplayDataBundle,
    rulesRuntimeHash: context.boundRuntimeHash,
  });
  if (state.officialRoundSupplyState.roundSupplyStateHash !== previousSupplyHash) {
    fail("STIMPACK_MOVE_SUPPLY_STATE_CHANGED");
  }
  const abilityEvent = {
    type: "use_ability",
    subtype: "marine_stimpack_before_move",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: piece.id,
    abilityId: actionInput.abilityId,
    abilityName: actionInput.abilityName,
    abilityWindow: "before_action",
    underlyingAction: "move",
    abilitySourceTextHash: OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
    stimpackPlanHash: actionInput.abilityPlanHash,
    resourcePayment: {
      resourceType: "CP",
      cost: 1,
      cardResourceId: card.id,
      officialCardRecordKey: card.officialCardRecordKey,
      readinessBefore: "ready",
      readinessAfter: "exhausted",
      faceBefore: "up",
      faceAfter: "down",
      excessResourceLost: 0,
      generatedResourceRetained: 0,
    },
    nonLethalDamage: clone(nonLethal),
    status: clone(context.statusPair.status),
    marker: clone(context.statusPair.marker),
    valueBuffResolution: clone(actionInput.movePlan.valueBuffResolution),
    speedMoveConsumerExecutable: true,
    remainingSpeedConsumerCoverageComplete: false,
    abilityUseHash: history.abilityUseHash,
    trainingTruth: false,
  };
  const moveEvent = {
    type: "unit_standard_moved",
    subtype: "stimpack_speed_consumer",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    leadingModelId: model.id,
    movePlanHash: actionInput.movePlan.movePlanHash,
    distanceTravelledInches: actionInput.movePlan.distanceTravelledInches,
    printedSpeedInches: 7,
    speedBuff: 3,
    speedAllowanceInches: 10,
    valueBuffResolutionHash:
      actionInput.movePlan.valueBuffResolution.valueBuffResolutionHash,
    roundSupplyStateHash: previousSupplyHash,
    movementActivated: true,
    inCoherency: true,
    trainingTruth: false,
  };
  const events = [abilityEvent, moveEvent];
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
    schemaVersion: "starcraft_tmg_official_stimpack_move_transition_v1",
    executorId: OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: clone(actionInput),
    nonLethalDamageResolution: nonLethal,
    stimpackStatus: clone(context.statusPair.status),
    stimpackMarker: clone(context.statusPair.marker),
    valueBuffResolution: clone(context.buffResolution),
    rulesTruth: "official_current_stimpack_before_move_speed_buff_exact_subset",
    trainingTruth: false,
  };
}
