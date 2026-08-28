import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialCleanupCardBundleV1 } from
  "../source-data/official-cleanup-card-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialReserveDeployDataBundleV1 } from
  "../source-data/official-reserve-deploy-data-bundle-v1.mjs";
import {
  OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_V2_CONTRACT,
  verifyOfficialCurrentMovementAuthorityLineageV2,
} from "./official-current-movement-authority-lineage-v2.mjs";
import { createOfficialCharacteristicStatusKernelV2 } from
  "./official-characteristic-status-kernel-v2.mjs";
import {
  createOfficialMarineStimpackKernelV1,
  OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MARINE_STIMPACK_SOURCE_V1,
} from "./official-marine-stimpack-kernel-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from
  "./official-round-supply-state-v1.mjs";
import {
  OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_STIMPACK_MOVE_EXECUTOR_ATOM_IDS,
} from "./official-stimpack-move-consumer-executor-v1.mjs";

export const OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID =
  "authority.stimpack-move-consumer-v2";
export const OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_STIMPACK_MOVE_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_STIMPACK_MOVE_V2_PARAMETER_KIND =
  "official_stimpack_move_path_v2";
export const OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ATOM_IDS = Object.freeze([
  ...OFFICIAL_STIMPACK_MOVE_EXECUTOR_ATOM_IDS,
]);
export const OFFICIAL_STIMPACK_MOVE_V2_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS,
]);

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const CURRENT_DATASET_HASH =
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "1e620d2e44804653b2c5d37025c71c17f2daf670f4e76daefa196dc609430ca7";
const CURRENT_RESERVE_DATA_BUNDLE_HASH =
  "422a53f45573553785a514b8eb6d2321160bc95adc48ae0c99f26738f1307deb";
const CORE_RULES_SOURCE_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const TERRAN_P2P_SOURCE_HASH =
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c";
const MARINE_RECORD_KEY = "army_units:marine";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const RESOURCE_RECORD_KEY = "tactical_cards:terran_armed_forces";
const RESOURCE_SOURCE_RECORD_HASH =
  "44aa8b4d52a065dbbc5e93a9bfc203957647393efe4c123e1a0b2b909dbf63c5";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const BASE_DIAMETER_MILLI_INCHES = Math.round((32 / 25.4) * 1000);
const BASE_RADIUS_MILLI_INCHES = Math.round(BASE_DIAMETER_MILLI_INCHES / 2);
const MAX_RAW_PATH_POINTS = 64;
const MAX_CANONICAL_PATH_POINTS = 32;
const PATH_SCHEMA = "starcraft_tmg_official_stimpack_move_path_v2";
const PLAN_SCHEMA = "starcraft_tmg_official_stimpack_move_plan_v2";
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

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("STIMPACK_MOVE_V2_RUNTIME_BINDING_REQUIRED");
  return value;
}

function milli(value, code = "STIMPACK_MOVE_V2_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}

function inches(value) {
  return Number((Number(value) / 1000).toFixed(3));
}

function point(model) {
  return {
    xMilliInches: milli(model?.xInches, "STIMPACK_MOVE_V2_MODEL_GEOMETRY_INVALID"),
    yMilliInches: milli(model?.yInches, "STIMPACK_MOVE_V2_MODEL_GEOMETRY_INVALID"),
  };
}

function safePoint(value, index) {
  if (!object(value)
    || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) {
    fail("STIMPACK_MOVE_V2_PATH_POINT_INVALID", String(index));
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
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}

function verifyBindings(state, matchBinding) {
  const bundle = state?.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(bundle);
  verifyOfficialCleanupCardBundleV1(bundle.cleanupCardBundle);
  verifyOfficialReserveDeployDataBundleV1(bundle.reserveDeployDataBundle);
  const movement = bundle.reserveDeployDataBundle.unitMovementProfile;
  const marine = getOfficialCombatProfileV1(bundle.combatProfileBundle, MARINE_RECORD_KEY);
  const resource = bundle.cleanupCardBundle.profiles.find((entry) => (
    entry.recordKey === RESOURCE_RECORD_KEY
  ));
  if (!object(matchBinding)
    || hashStarcraftTmgContract(bundle) !== matchBinding.dataSnapshotHash
    || bundle.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || bundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || bundle.reserveDeployDataBundle.reserveDeployDataBundleHash
      !== CURRENT_RESERVE_DATA_BUNDLE_HASH
    || bundle.reserveDeployDataBundle.rulesSource?.sourceContentHash
      !== CORE_RULES_SOURCE_HASH
    || movement.baseDiameterSource?.sourceContentHash !== TERRAN_P2P_SOURCE_HASH
    || movement.recordKey !== MARINE_RECORD_KEY
    || movement.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || movement.payloadHash !== MARINE_PAYLOAD_HASH
    || movement.sourceValue !== "4/7"
    || movement.singleModelSpeedInches !== 7
    || movement.baseShape !== "round"
    || movement.baseDiameterMm !== 32
    || marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || marine.hitPoints !== 2
    || !resource
    || resource.sourceRecordHash !== RESOURCE_SOURCE_RECORD_HASH
    || resource.resource !== 1
    || !isDeepStrictEqual(bundle.dataVersions, {
      cardsVersion: "69",
      rulesVersion: "48",
      unitsVersion: "71",
    })
    || bundle.repositoryFallbackAllowed !== false) {
    fail("STIMPACK_MOVE_V2_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  return { bundle, movement, marine, resource, boundRuntimeHash: runtimeHash(matchBinding) };
}

function verifyModel(model, pieceId) {
  if (!object(model)
    || !String(model.id || "").trim()
    || model.isDestroyed === true
    || model.isOnField === false
    || String(model.baseShape || "").toLowerCase() !== "round"
    || milli(model.baseWidthInches) !== BASE_DIAMETER_MILLI_INCHES
    || milli(model.baseDepthInches) !== BASE_DIAMETER_MILLI_INCHES
    || model.elevation !== "ground"
    || !isDeepStrictEqual(model.supportTerrainIds || [], [])
    || !isDeepStrictEqual(model.adjacentAccessPointIds || [], [])) {
    fail("STIMPACK_MOVE_V2_MODEL_SCOPE_UNSUPPORTED", pieceId);
  }
  point(model);
}

function verifyPiece(piece, sideKey, selectedUpgrades, role) {
  const models = activeModels(piece);
  if (!object(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.officialPayloadHash !== MARINE_PAYLOAD_HASH
    || Number(piece.currentModels) !== 1
    || Number(piece.maxModels) !== 1
    || Number(piece.currentSupply) !== 0
    || piece.isOnField !== true
    || piece.isInReserves === true
    || piece.isDestroyed === true
    || !isDeepStrictEqual(piece.destroyedModelIds || [], [])
    || piece.combatTag !== "ground"
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || !isDeepStrictEqual(piece.selectedUpgradeNames || [], selectedUpgrades)
    || !Array.isArray(piece.statuses)
    || piece.statuses.some((status) => status !== "stationary")
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || Number(piece.damageMarker || 0) !== 0
    || models.length !== 1) {
    fail("STIMPACK_MOVE_V2_UNIT_SCOPE_UNSUPPORTED", role);
  }
  verifyModel(models[0], piece.id);
  return { piece, model: models[0] };
}

function contextFor(state, sideKey, matchBinding) {
  const lineage = verifyOfficialCurrentMovementAuthorityLineageV2(state, {
    errorPrefix: "STIMPACK_MOVE_V2",
  });
  const bindings = verifyBindings(state, matchBinding);
  if (!SIDE_KEYS.includes(sideKey)
    || state.phase !== "movement"
    || state.activeSideKey !== sideKey
    || state.players?.[sideKey]?.passedPhases?.movement === true
    || state.pendingAction != null
    || !Array.isArray(state.pieces)
    || state.pieces.length !== 2
    || Number(state.board?.widthInches) !== 54
    || Number(state.board?.heightInches) !== 36
    || !Array.isArray(state.board?.terrain)
    || state.board.terrain.some((entry) => !entry?.isRemoved && !entry?.isDestroyed)
    || !Array.isArray(state.board?.accessPoints)
    || state.board.accessPoints.length !== 0) {
    fail("STIMPACK_MOVE_V2_STATE_SCOPE_UNSUPPORTED");
  }
  const piece = state.pieces.find((entry) => (
    entry.sideKey === sideKey && (entry.selectedUpgradeNames || []).includes("Stimpack")
  ));
  if (!piece) fail("STIMPACK_MOVE_V2_SOURCE_UNAVAILABLE");
  const opponentSideKey = sideKey === "player1" ? "player2" : "player1";
  const opponent = state.pieces.find((entry) => entry.id !== piece.id);
  const source = verifyPiece(piece, sideKey, ["Stimpack"], "source");
  const target = verifyPiece(opponent, opponentSideKey, [], "opponent");
  if (piece.activatedPhases?.movement === true) {
    fail("STIMPACK_MOVE_V2_ALREADY_ACTIVATED");
  }
  const edgeDistance = distance(point(source.model), point(target.model))
    - (BASE_RADIUS_MILLI_INCHES * 2);
  if (edgeDistance <= 1000) fail("STIMPACK_MOVE_V2_UNIT_ENGAGED");
  const cards = state.cardResources?.[sideKey]?.filter((entry) => (
    entry?.officialCardRecordKey === RESOURCE_RECORD_KEY
  ));
  if (!Array.isArray(cards) || cards.length !== 1) {
    fail("STIMPACK_MOVE_V2_EXACT_RESOURCE_CARD_REQUIRED");
  }
  const card = cards[0];
  if (card.sideKey !== sideKey
    || card.cardKind !== "faction"
    || card.sourceRecordHash !== RESOURCE_SOURCE_RECORD_HASH
    || Number(card.resource) !== 1
    || card.resourceType !== "CP"
    || card.readiness !== "ready"
    || card.face !== "up") {
    fail("STIMPACK_MOVE_V2_FULL_COST_UNAVAILABLE");
  }
  if (!Array.isArray(state.activeAbilityUseHistory)
    || state.activeAbilityUseHistory.some((entry) => (
      entry?.pieceId === piece.id
        && entry?.abilityId === OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityId
        && Number(entry?.round) === Number(state.round)
    ))) {
    fail("STIMPACK_MOVE_V2_NAMED_ABILITY_ALREADY_USED_THIS_ROUND");
  }
  const abilityBody = {
    schema: "starcraft_tmg_official_marine_stimpack_before_move_plan_v3",
    round: Number(state.round),
    phase: "movement",
    sideKey,
    pieceId: piece.id,
    damageTargetModelId: source.model.id,
    printedSpeedInches: 7,
    speedBuff: 3,
    effectiveSpeedInches: 10,
    cardResourceId: card.id,
    abilityWindow: "before_action",
    abilitySourceTextHash: OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
    nonLethalDamage: 2,
    precision: 3,
    resourceType: "CP",
    resourceCost: 1,
    underlyingAction: "move",
    trainingTruth: false,
  };
  const abilityPlan = {
    ...abilityBody,
    stimpackPlanHash: hashStarcraftTmgContract(abilityBody),
  };
  const statusPair = STIMPACK_KERNEL.createStatus({
    round: Number(state.round),
    sourceSideKey: sideKey,
    sourcePieceId: piece.id,
    abilityResolutionHash: abilityPlan.stimpackPlanHash,
  });
  const buffResolution = CHARACTERISTIC_KERNEL.applyValueBuff({
    status: statusPair.status,
    characteristic: "speed",
    printedValue: 7,
  });
  if (buffResolution.effectiveValue !== 10) fail("STIMPACK_MOVE_V2_EFFECTIVE_SPEED_DRIFT");
  return {
    ...bindings,
    lineage,
    piece,
    model: source.model,
    enemyModel: target.model,
    card,
    abilityPlan,
    statusPair,
    buffResolution,
  };
}

function domainFor(state, context, matchBinding) {
  const core = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_STIMPACK_MOVE_V2_PARAMETER_KIND,
    matchBindingHash: String(matchBinding?.bindingHash || ""),
    round: Number(state.round),
    phase: "movement",
    sideKey: context.piece.sideKey,
    actionType: "move",
    pieceId: context.piece.id,
    executorId: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_STIMPACK_MOVE_V2_ACTION_ATOM_IDS],
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
      modelStartPoints: { [context.model.id]: point(context.model) },
      enemyModelPoint: point(context.enemyModel),
      baseDiameterMilliInches: BASE_DIAMETER_MILLI_INCHES,
      battlefieldWidthMilliInches: 54000,
      battlefieldHeightMilliInches: 36000,
      printedSpeedMilliInches: 7000,
      buffModifierMilliInches: 3000,
      maxDistanceMilliInches: 10000,
      cardResourceId: context.card.id,
      abilityPlanHash: context.abilityPlan.stimpackPlanHash,
      valueBuffResolutionHash: context.buffResolution.valueBuffResolutionHash,
      predictedStatusEffectHash: context.statusPair.status.statusEffectHash,
      predictedMarkerHash: context.statusPair.marker.markerHash,
      roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
      supplyLossLedgerHash: state.supplyLossLedger.ledgerHash,
      currentHandoffContract: OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_V2_CONTRACT,
      currentAuthorityLineageHash: context.lineage.lineageHash,
      gameplayDataBundleHash: context.bundle.gameplayDataBundleHash,
      reserveDeployDataBundleHash: context.bundle.reserveDeployDataBundle
        .reserveDeployDataBundleHash,
      marineSourceRecordHash: MARINE_SOURCE_RECORD_HASH,
      marinePayloadHash: MARINE_PAYLOAD_HASH,
      coreRulesSourceHash: CORE_RULES_SOURCE_HASH,
      terranP2pSourceHash: TERRAN_P2P_SOURCE_HASH,
      geometryScope:
        "current_single_model_marine_empty_terrain_round_base_stimpack_move_v2",
    },
    confirmationClass: "direct_gesture_plus_resource_payment",
    rulesTruth: "official_current_stimpack_move_parameter_domain_v2",
    trainingTruth: false,
  };
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

function diagnosticAction(sideKey, pieceId, error) {
  return {
    actionType: "move",
    sideKey,
    phase: "movement",
    pieceId,
    abilityId: "stimpack",
    ruleAtomIds: [...OFFICIAL_STIMPACK_MOVE_V2_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_stimpack_move_v2_fail_closed",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialStimpackMoveV2(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  try {
    const context = contextFor(state, sideKey, options.matchBinding);
    return { candidates: [], parameterDomains: [domainFor(state, context, options.matchBinding)] };
  } catch (error) {
    if (options.throwOnError === true) throw error;
    const pieceIds = Array.isArray(state?.pieces)
      ? state.pieces.filter((piece) => piece?.sideKey === sideKey)
        .map((piece) => String(piece.id || ""))
      : [""];
    return {
      candidates: options.includeDisabled === true
        ? pieceIds.map((pieceId) => diagnosticAction(sideKey, pieceId, error))
        : [],
      parameterDomains: [],
    };
  }
}

function canonicalPath(start, raw) {
  if (!Array.isArray(raw) || raw.length === 0) fail("STIMPACK_MOVE_V2_PATH_REQUIRED");
  if (raw.length > MAX_RAW_PATH_POINTS) fail("STIMPACK_MOVE_V2_PATH_TOO_COMPLEX");
  const normalized = [start];
  for (const [index, value] of raw.entries()) {
    const next = safePoint(value, index);
    if (!pointEquals(normalized.at(-1), next)) normalized.push(next);
  }
  if (normalized.length < 2) fail("STIMPACK_MOVE_V2_PATH_MUST_CHANGE_POSITION");
  const points = [];
  for (const value of normalized) {
    while (points.length >= 2 && collinear(points.at(-2), points.at(-1), value)) points.pop();
    points.push(value);
  }
  if (points.length > MAX_CANONICAL_PATH_POINTS) fail("STIMPACK_MOVE_V2_PATH_TOO_COMPLEX");
  let distanceMilliInches = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceMilliInches += Math.round(distance(points[index - 1], points[index]));
  }
  return { schemaVersion: PATH_SCHEMA, unit: "milli-inch", points, distanceMilliInches };
}

function validatePath(domain, path) {
  if (path.distanceMilliInches > domain.constraints.maxDistanceMilliInches) {
    fail("STIMPACK_MOVE_V2_PATH_EXCEEDS_BUFFED_SPEED");
  }
  const radius = Math.round(domain.constraints.baseDiameterMilliInches / 2);
  for (const endpoint of path.points.slice(1)) {
    if (endpoint.xMilliInches < radius
      || endpoint.xMilliInches > domain.constraints.battlefieldWidthMilliInches - radius
      || endpoint.yMilliInches < radius
      || endpoint.yMilliInches > domain.constraints.battlefieldHeightMilliInches - radius) {
      fail("STIMPACK_MOVE_V2_PATH_OUTSIDE_BATTLEFIELD");
    }
  }
  const blocker = domain.constraints.enemyModelPoint;
  for (let index = 1; index < path.points.length; index += 1) {
    if (pointToSegmentDistance(blocker, path.points[index - 1], path.points[index])
      < BASE_DIAMETER_MILLI_INCHES - 1) {
      fail("STIMPACK_MOVE_V2_PATH_COLLISION");
    }
  }
  const endpoint = path.points.at(-1);
  const edgeDistance = distance(endpoint, blocker) - (BASE_RADIUS_MILLI_INCHES * 2);
  if (edgeDistance <= 1000) fail("STIMPACK_MOVE_V2_ENEMY_ENGAGEMENT_RANGE");
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
    ruleAtomIds: [...OFFICIAL_STIMPACK_MOVE_V2_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
  };
}

export function instantiateOfficialStimpackMoveV2(
  state,
  domain,
  parameters,
  options = {},
) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_STIMPACK_MOVE_V2_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION) {
    fail("STIMPACK_MOVE_V2_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialStimpackMoveV2(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
    throwOnError: true,
  });
  const expected = current.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expected || !isDeepStrictEqual(domain, expected)) {
    fail("STIMPACK_MOVE_V2_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters)
    || Object.keys(parameters).some((key) => ![
      "leadingModelId", "path", "placements",
    ].includes(key))
    || !Array.isArray(parameters.placements)
    || parameters.placements.length !== 0) {
    fail("STIMPACK_MOVE_V2_PARAMETERS_INVALID");
  }
  const leadingModelId = String(parameters.leadingModelId || "").trim();
  if (!domain.constraints.modelIds.includes(leadingModelId)) {
    fail("STIMPACK_MOVE_V2_LEADING_MODEL_INVALID");
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
    abilityPlanHash: context.abilityPlan.stimpackPlanHash,
    cardResourceId: context.card.id,
    damageTargetModelId: context.model.id,
    roundSupplyStateHashBefore: domain.constraints.roundSupplyStateHash,
    supplyLossLedgerHashBefore: domain.constraints.supplyLossLedgerHash,
    currentAuthorityLineageHash: domain.constraints.currentAuthorityLineageHash,
    geometryScope: domain.constraints.geometryScope,
    trainingTruth: false,
  };
  const plan = { ...planBody, movePlanHash: hashStarcraftTmgContract(planBody) };
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v2",
    canonicalParameters: {
      leadingModelId,
      path: clone(path.points.slice(1)),
      placements: [],
    },
    action: canonicalAction(domain, plan),
    rulesTruth: "official_current_stimpack_move_instantiation_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}

function historyEntry(state, action, nonLethal, statusPair) {
  const body = {
    schema: "starcraft_tmg_official_active_ability_use_history_entry_v3",
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
    currentAuthorityLineageHash: action.movePlan.currentAuthorityLineageHash,
    trainingTruth: false,
  };
  return { ...body, abilityUseHash: hashStarcraftTmgContract(body) };
}

export function applyOfficialStimpackMoveV2(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "move"
    || actionInput.executorId !== OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION
    || !object(actionInput.movePlan)) {
    fail("STIMPACK_MOVE_V2_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialStimpackMoveV2(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
    throwOnError: true,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.pieceId === actionInput.pieceId
  ));
  if (!domain) fail("STIMPACK_MOVE_V2_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialStimpackMoveV2(stateInput, domain, {
    leadingModelId: actionInput.movePlan.leadingModelId,
    path: actionInput.movePlan.canonicalPath?.points?.slice(1),
    placements: actionInput.movePlan.placementSequence,
  }, options);
  if (!isDeepStrictEqual(actionInput, instantiated.action)) {
    fail("STIMPACK_MOVE_V2_ACTION_MISMATCH");
  }
  const context = contextFor(stateInput, actionInput.sideKey, options.matchBinding);
  const nonLethal = STIMPACK_KERNEL.resolveNonLethalDamage({
    targetPieceId: context.piece.id,
    targetModelId: context.model.id,
    abilityResolutionHash: actionInput.abilityPlanHash,
    priorDamageMarker: 0,
    amount: 2,
    targetHitPoints: context.marine.hitPoints,
  });
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const model = activeModels(piece)[0];
  const endpoint = actionInput.movePlan.finalModelPositions[0];
  const card = state.cardResources[actionInput.sideKey].find((entry) => (
    entry.id === actionInput.cardResourceId
  ));
  if (!card || card.readiness !== "ready" || card.face !== "up") {
    fail("STIMPACK_MOVE_V2_PAYMENT_CARD_STALE");
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
  state.activeAbilityUseHistory.push(history);
  const previousSupplyHash = state.officialRoundSupplyState.roundSupplyStateHash;
  const previousLedgerHash = state.supplyLossLedger.ledgerHash;
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: state.officialGameplayDataBundle,
    rulesRuntimeHash: context.boundRuntimeHash,
  });
  if (state.officialRoundSupplyState.roundSupplyStateHash !== previousSupplyHash
    || state.supplyLossLedger.ledgerHash !== previousLedgerHash) {
    fail("STIMPACK_MOVE_V2_SUPPLY_STATE_CHANGED");
  }
  const abilityEvent = {
    type: "use_ability",
    subtype: "marine_stimpack_before_move_v3",
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
    valueBuffResolution: clone(context.buffResolution),
    abilityUseHash: history.abilityUseHash,
    trainingTruth: false,
  };
  const moveEvent = {
    type: "unit_standard_moved",
    subtype: "current_stimpack_speed_consumer_v2",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    leadingModelId: model.id,
    movePlanHash: actionInput.movePlan.movePlanHash,
    distanceTravelledInches: actionInput.movePlan.distanceTravelledInches,
    printedSpeedInches: 7,
    speedBuff: 3,
    speedAllowanceInches: 10,
    roundSupplyStateHash: previousSupplyHash,
    supplyLossLedgerHash: previousLedgerHash,
    stationaryRemoved: true,
    movementActivated: true,
    inCoherency: true,
    trainingTruth: false,
  };
  const events = [abilityEvent, moveEvent];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round),
    phase: "movement",
    action: clone(actionInput),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_stimpack_move_transition_v2",
    executorId: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: clone(actionInput),
    nonLethalDamageResolution: nonLethal,
    stimpackStatus: clone(context.statusPair.status),
    stimpackMarker: clone(context.statusPair.marker),
    valueBuffResolution: clone(context.buffResolution),
    rulesTruth: "official_current_stimpack_before_move_speed_buff_exact_subset_v2",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
