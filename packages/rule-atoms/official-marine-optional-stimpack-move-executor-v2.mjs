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
  createOfficialCharacteristicStatusKernelV2,
} from "./official-characteristic-status-kernel-v2.mjs";
import {
  createOfficialMarineStimpackKernelV1,
  OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MARINE_STIMPACK_SOURCE_V1,
} from "./official-marine-stimpack-kernel-v1.mjs";
import {
  createOfficialMarineMoveGeometryKernelV2,
  instantiateOfficialMarineMoveGeometryV2,
} from "./official-marine-move-geometry-kernel-v2.mjs";
import {
  createOfficialRoundSupplyStateV1,
  verifyOfficialRoundSupplyStateV1,
} from "./official-round-supply-state-v1.mjs";
import {
  OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS,
} from "./official-standard-move-executor-v1.mjs";
import {
  OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS,
} from "./official-stimpack-move-consumer-executor-v1.mjs";

export const OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID =
  "authority.marine-optional-stimpack-move-v2";
export const OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_PARAMETER_KIND =
  "official_marine_optional_stimpack_move_path_v2";
export const OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_NEW_ATOM_IDS =
  Object.freeze([]);
export const OFFICIAL_MARINE_OPTIONAL_STIMPACK_BASE_MOVE_V2_ACTION_ATOM_IDS =
  Object.freeze([...OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS]);
export const OFFICIAL_MARINE_OPTIONAL_STIMPACK_USE_MOVE_V2_ACTION_ATOM_IDS =
  Object.freeze([...OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS]);
export const OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ATOM_IDS =
  Object.freeze([...new Set([
    ...OFFICIAL_MARINE_OPTIONAL_STIMPACK_BASE_MOVE_V2_ACTION_ATOM_IDS,
    ...OFFICIAL_MARINE_OPTIONAL_STIMPACK_USE_MOVE_V2_ACTION_ATOM_IDS,
  ])].sort((left, right) => left.localeCompare(right)));

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const CURRENT_COMPREHENSIVE_GAMEPLAY_BUNDLE_HASH =
  "0bfdd8678995b4aaa439fba2fbb75d96f26e067af2cdf86ca96eecc25ef93098";
const CURRENT_RESERVE_DATA_BUNDLE_HASH =
  "c2429e65cc76146b9a7100c3d710a1d2a147eca527339a65f0665134fb177c54";
const MARINE_RECORD_KEY = "army_units:marine";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const RESOURCE_RECORD_KEY = "tactical_cards:terran_armed_forces";
const RESOURCE_SOURCE_RECORD_HASH =
  "44aa8b4d52a065dbbc5e93a9bfc203957647393efe4c123e1a0b2b909dbf63c5";
const CORE_RULES_SOURCE_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const TERRAN_P2P_SOURCE_HASH =
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c";
const BASE_DIAMETER_MILLI_INCHES = Math.round((32 / 25.4) * 1000);
const BASE_RADIUS_MILLI_INCHES = Math.round(BASE_DIAMETER_MILLI_INCHES / 2);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const MOVE_MODES = Object.freeze(["base", "stimpack"]);
const PLAN_SCHEMA = "starcraft_tmg_official_marine_optional_stimpack_move_plan_v2";
const STIMPACK_KERNEL = createOfficialMarineStimpackKernelV1();
const CHARACTERISTIC_KERNEL = createOfficialCharacteristicStatusKernelV2();
const GEOMETRY_KERNEL = createOfficialMarineMoveGeometryKernelV2();

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function milli(value, code = "OPTIONAL_STIMPACK_MOVE_GEOMETRY_INVALID", detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}

function inches(value) {
  return Number((Number(value) / 1000).toFixed(3));
}

function point(model) {
  return {
    xMilliInches: milli(model?.xInches, "OPTIONAL_STIMPACK_MOVE_MODEL_GEOMETRY_INVALID"),
    yMilliInches: milli(model?.yInches, "OPTIONAL_STIMPACK_MOVE_MODEL_GEOMETRY_INVALID"),
  };
}

function distance(left, right) {
  return Math.hypot(
    right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches,
  );
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("OPTIONAL_STIMPACK_MOVE_RUNTIME_BINDING_REQUIRED");
  return value;
}

function live(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}

function currentSupply(profile, currentModels, pieceId) {
  const tier = profile.squadProfile.find((row) => (
    row.minimumModels !== null
      && currentModels >= row.minimumModels
      && currentModels <= row.maximumModels
  ));
  if (!tier) fail("OPTIONAL_STIMPACK_MOVE_UNIT_STATE_UNSUPPORTED", pieceId);
  return tier.supply;
}

function verifyBindings(state, matchBinding) {
  if (!object(state)
    || !object(state.players)
    || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("OPTIONAL_STIMPACK_MOVE_STATE_INVALID");
  }
  const gameplayBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayBundle);
  verifyOfficialCleanupCardBundleV1(gameplayBundle.cleanupCardBundle);
  verifyOfficialReserveDeployDataBundleV1(gameplayBundle.reserveDeployDataBundle);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayBundle) !== matchBinding.dataSnapshotHash
    || gameplayBundle.gameplayDataBundleHash !== CURRENT_COMPREHENSIVE_GAMEPLAY_BUNDLE_HASH
    || gameplayBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || gameplayBundle.reserveDeployDataBundle.reserveDeployDataBundleHash
      !== CURRENT_RESERVE_DATA_BUNDLE_HASH
    || gameplayBundle.reserveDeployDataBundle.rulesSource?.sourceContentHash
      !== CORE_RULES_SOURCE_HASH
    || gameplayBundle.reserveDeployDataBundle.unitMovementProfile?.baseDiameterSource
      ?.sourceContentHash !== TERRAN_P2P_SOURCE_HASH
    || !isDeepStrictEqual(gameplayBundle.dataVersions, {
      cardsVersion: "69",
      rulesVersion: "48",
      unitsVersion: "71",
    })
    || gameplayBundle.repositoryFallbackAllowed !== false) {
    fail("OPTIONAL_STIMPACK_MOVE_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const movement = gameplayBundle.reserveDeployDataBundle.unitMovementProfile;
  if (movement.recordKey !== MARINE_RECORD_KEY
    || movement.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || movement.payloadHash !== MARINE_PAYLOAD_HASH
    || movement.sourceValue !== "4/7"
    || movement.multiModelSpeedInches !== 4
    || movement.singleModelSpeedInches !== 7
    || movement.baseShape !== "round"
    || movement.baseDiameterMm !== 32) {
    fail("OPTIONAL_STIMPACK_MOVE_SPEED_PROFILE_DRIFT");
  }
  const marine = getOfficialCombatProfileV1(
    gameplayBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  if (marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || marine.unitName !== "Marine"
    || marine.hitPoints !== 2
    || !isDeepStrictEqual(marine.combatTags, ["biological", "ground", "light"])) {
    fail("OPTIONAL_STIMPACK_MOVE_MARINE_PROFILE_DRIFT");
  }
  const resourceProfile = gameplayBundle.cleanupCardBundle.profiles.find((profile) => (
    profile.recordKey === RESOURCE_RECORD_KEY
  ));
  if (!resourceProfile
    || resourceProfile.sourceRecordHash !== RESOURCE_SOURCE_RECORD_HASH
    || resourceProfile.cardKind !== "faction"
    || resourceProfile.resource !== 1) {
    fail("OPTIONAL_STIMPACK_MOVE_RESOURCE_PROFILE_DRIFT");
  }
  return { gameplayBundle, movement, marine, resourceProfile };
}

function verifyRoundBase(model, pieceId) {
  if (!object(model)
    || !String(model.id || "").trim()
    || model.isDestroyed === true
    || model.isOnField === false
    || String(model.baseShape || "").toLowerCase() !== "round"
    || milli(model.baseWidthInches, "OPTIONAL_STIMPACK_MOVE_BASE_SCOPE_UNSUPPORTED")
      !== BASE_DIAMETER_MILLI_INCHES
    || milli(model.baseDepthInches, "OPTIONAL_STIMPACK_MOVE_BASE_SCOPE_UNSUPPORTED")
      !== BASE_DIAMETER_MILLI_INCHES
    || model.elevation !== "ground"
    || !isDeepStrictEqual(model.supportTerrainIds || [], [])
    || !isDeepStrictEqual(model.adjacentAccessPointIds || [], [])) {
    fail("OPTIONAL_STIMPACK_MOVE_BASE_SCOPE_UNSUPPORTED", pieceId);
  }
  point(model);
}

function verifyPiece(piece, sideKey, selectedUpgrades, bindings, role) {
  const currentModels = Number(piece?.currentModels);
  const maxModels = Number(piece?.maxModels);
  const models = activeModels(piece);
  const destroyedModelIds = piece?.destroyedModelIds || [];
  if (!live(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.officialPayloadHash !== MARINE_PAYLOAD_HASH
    || !Number.isSafeInteger(currentModels)
    || currentModels < 1
    || currentModels > 9
    || !Number.isSafeInteger(maxModels)
    || maxModels < currentModels
    || maxModels > 9
    || !Array.isArray(piece.models)
    || piece.models.length !== currentModels
    || models.length !== currentModels
    || !Array.isArray(destroyedModelIds)
    || destroyedModelIds.length !== maxModels - currentModels
    || new Set(destroyedModelIds).size !== destroyedModelIds.length
    || Number(piece.currentSupply) !== currentSupply(bindings.marine, currentModels, piece.id)
    || piece.isInReserves === true
    || piece.combatTag !== "ground"
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || !isDeepStrictEqual(piece.selectedUpgradeNames || [], selectedUpgrades)
    || !Array.isArray(piece.statuses)
    || piece.statuses.some((status) => status !== "stationary")
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || Number(piece.damageMarker || 0) !== 0) {
    fail("OPTIONAL_STIMPACK_MOVE_MARINE_SCOPE_UNSUPPORTED", role);
  }
  const modelIds = new Set();
  for (const model of models) {
    if (modelIds.has(model.id) || destroyedModelIds.includes(model.id)) {
      fail("OPTIONAL_STIMPACK_MOVE_MODEL_ID_INVALID", String(model.id || ""));
    }
    modelIds.add(model.id);
    verifyRoundBase(model, piece.id);
  }
  return {
    piece,
    models,
    currentModels,
    maxModels,
    startedSingleModel: maxModels === 1,
  };
}

function verifyBoard(state, bindings) {
  const battlefield = bindings.gameplayBundle.reserveDeployDataBundle
    .deploymentProfile.geometry.battlefield;
  if (Number(state.board.widthInches) !== battlefield.widthInches
    || Number(state.board.heightInches) !== battlefield.heightInches
    || !Array.isArray(state.board.terrain)
    || state.board.terrain.some((entry) => !entry?.isRemoved && !entry?.isDestroyed)
    || !Array.isArray(state.board.accessPoints)
    || state.board.accessPoints.length !== 0
    || !Array.isArray(state.board.tokens)
    || state.board.tokens.length !== 0
    || !Array.isArray(state.board.effectMarkers)
    || state.board.effectMarkers.length !== 0) {
    fail("OPTIONAL_STIMPACK_MOVE_GEOMETRY_SCOPE_UNSUPPORTED");
  }
}

function verifyMovementWindow(state, sideKey) {
  if (state.phase !== "movement") fail("OPTIONAL_STIMPACK_MOVE_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("OPTIONAL_STIMPACK_MOVE_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.movement === true) {
    fail("OPTIONAL_STIMPACK_MOVE_SIDE_PASSED");
  }
  const choice = state.phaseFirstActorByRound?.[`${Number(state.round)}:movement`];
  if (!object(choice)
    || choice.round !== Number(state.round)
    || choice.phase !== "movement"
    || !SIDE_KEYS.includes(choice.chosenFirstActorSideKey)) {
    fail("OPTIONAL_STIMPACK_MOVE_MOVEMENT_INITIATIVE_UNRESOLVED");
  }
  if (state.pendingAction !== undefined && state.pendingAction !== null) {
    fail("OPTIONAL_STIMPACK_MOVE_MID_ACTION_PROHIBITED");
  }
}

function allActiveRows(state) {
  return state.pieces.flatMap((piece) => activeModels(piece).map((model) => ({
    pieceId: piece.id,
    sideKey: piece.sideKey,
    modelId: model.id,
    point: point(model),
  })));
}

function pieceEngaged(state, piece) {
  const enemies = allActiveRows(state).filter((row) => row.sideKey !== piece.sideKey);
  return activeModels(piece).some((model) => enemies.some((enemy) => (
    distance(point(model), enemy.point) - (BASE_RADIUS_MILLI_INCHES * 2) <= 1000
  )));
}

function paymentCard(state, sideKey, resourceProfile) {
  if (state.players?.[sideKey]?.faction !== "Terran"
    || !Array.isArray(state.cardResources?.[sideKey])) {
    fail("OPTIONAL_STIMPACK_MOVE_RESOURCE_STATE_INVALID");
  }
  const cards = state.cardResources[sideKey].filter((row) => (
    row?.officialCardRecordKey === RESOURCE_RECORD_KEY
  ));
  if (cards.length !== 1) fail("OPTIONAL_STIMPACK_MOVE_EXACT_RESOURCE_CARD_REQUIRED");
  const card = cards[0];
  if (!object(card)
    || card.sideKey !== sideKey
    || card.cardKind !== "faction"
    || card.sourceRecordHash !== resourceProfile.sourceRecordHash
    || Number(card.resource) !== 1
    || card.resourceType !== "CP") {
    fail("OPTIONAL_STIMPACK_MOVE_MATCHING_RESOURCE_REQUIRED");
  }
  return card;
}

function usedThisRound(state, pieceId) {
  const history = state.activeAbilityUseHistory || [];
  if (!Array.isArray(history)) fail("OPTIONAL_STIMPACK_MOVE_ABILITY_HISTORY_INVALID");
  return history.some((entry) => (
    entry?.pieceId === pieceId
      && entry?.abilityId === OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityId
      && Number(entry?.round) === Number(state.round)
  ));
}

function baseContext(state, sideKey, matchBinding) {
  if (!SIDE_KEYS.includes(sideKey)) fail("OPTIONAL_STIMPACK_MOVE_SIDE_REQUIRED");
  verifyMovementWindow(state, sideKey);
  const bindings = verifyBindings(state, matchBinding);
  verifyBoard(state, bindings);
  if (state.pieces.length !== 2
    || state.pieces.some((piece) => piece.officialUnitRecordKey !== MARINE_RECORD_KEY)) {
    fail("OPTIONAL_STIMPACK_MOVE_UNIT_DENOMINATOR_UNSUPPORTED");
  }
  const piece = state.pieces.find((entry) => (
    entry.sideKey === sideKey
      && (entry.selectedUpgradeNames || []).includes("Stimpack")
  ));
  if (!piece) fail("OPTIONAL_STIMPACK_MOVE_SOURCE_UNAVAILABLE");
  const otherSideKey = sideKey === "player1" ? "player2" : "player1";
  const other = state.pieces.find((entry) => entry.id !== piece.id);
  const source = verifyPiece(piece, sideKey, ["Stimpack"], bindings, "source");
  verifyPiece(other, otherSideKey, [], bindings, "opponent");
  const allIds = state.pieces.flatMap((entry) => activeModels(entry).map((model) => model.id));
  if (new Set(allIds).size !== allIds.length) {
    fail("OPTIONAL_STIMPACK_MOVE_MODEL_ID_INVALID");
  }
  if (piece.activatedPhases?.movement === true) {
    fail("OPTIONAL_STIMPACK_MOVE_ALREADY_ACTIVATED");
  }
  if (pieceEngaged(state, piece)) fail("OPTIONAL_STIMPACK_MOVE_UNIT_ENGAGED");
  const boundRuntimeHash = runtimeHash(matchBinding);
  verifyOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: bindings.gameplayBundle,
    rulesRuntimeHash: boundRuntimeHash,
    roundSupplyState: state.officialRoundSupplyState,
  });
  const lastStart = state.startOfRoundHistory?.at(-1);
  if (!object(lastStart)
    || lastStart.round !== Number(state.round)
    || !HASH_PATTERN.test(String(lastStart.roundSupplyStateHash || ""))) {
    fail("OPTIONAL_STIMPACK_MOVE_START_OF_ROUND_HANDOFF_INVALID");
  }
  const printedSpeed = source.currentModels === 1
    ? bindings.movement.singleModelSpeedInches
    : bindings.movement.multiModelSpeedInches;
  const card = paymentCard(state, sideKey, bindings.resourceProfile);
  return {
    ...source,
    sideKey,
    otherSideKey,
    bindings,
    card,
    boundRuntimeHash,
    printedSpeed,
  };
}

function stimpackContext(state, context) {
  if (context.card.readiness !== "ready" || context.card.face !== "up") {
    fail("OPTIONAL_STIMPACK_MOVE_FULL_COST_UNAVAILABLE");
  }
  if (usedThisRound(state, context.piece.id)) {
    fail("OPTIONAL_STIMPACK_MOVE_NAMED_ABILITY_ALREADY_USED_THIS_ROUND");
  }
  const damageTargetModelId = context.models[0].id;
  const planBody = {
    schema: "starcraft_tmg_official_marine_stimpack_before_move_plan_v2",
    round: Number(state.round),
    phase: "movement",
    sideKey: context.sideKey,
    pieceId: context.piece.id,
    damageTargetModelId,
    currentModelCount: context.currentModels,
    maxModelCount: context.maxModels,
    startedSingleModel: context.startedSingleModel,
    printedSpeedInches: context.printedSpeed,
    speedBuff: 3,
    effectiveSpeedInches: context.printedSpeed + 3,
    cardResourceId: context.card.id,
    abilityWindow: "before_action",
    abilitySourceTextHash: OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
    priorDamageMarker: 0,
    nonLethalDamage: 2,
    precision: 3,
    resourceType: "CP",
    resourceCost: 1,
    underlyingAction: "move",
    trainingTruth: false,
  };
  const abilityPlan = {
    ...planBody,
    stimpackPlanHash: hashStarcraftTmgContract(planBody),
  };
  const statusPair = STIMPACK_KERNEL.createStatus({
    round: Number(state.round),
    sourceSideKey: context.sideKey,
    sourcePieceId: context.piece.id,
    abilityResolutionHash: abilityPlan.stimpackPlanHash,
  });
  const buffResolution = CHARACTERISTIC_KERNEL.applyValueBuff({
    status: statusPair.status,
    characteristic: "speed",
    printedValue: context.printedSpeed,
  });
  if (buffResolution.effectiveValue !== context.printedSpeed + 3) {
    fail("OPTIONAL_STIMPACK_MOVE_EFFECTIVE_SPEED_DRIFT");
  }
  return { abilityPlan, statusPair, buffResolution, damageTargetModelId };
}

export function officialMarineOptionalStimpackMoveActionAtomIdsV2(moveMode) {
  if (moveMode === "base") {
    return OFFICIAL_MARINE_OPTIONAL_STIMPACK_BASE_MOVE_V2_ACTION_ATOM_IDS;
  }
  if (moveMode === "stimpack") {
    return OFFICIAL_MARINE_OPTIONAL_STIMPACK_USE_MOVE_V2_ACTION_ATOM_IDS;
  }
  fail("OPTIONAL_STIMPACK_MOVE_MODE_INVALID");
}

function domainFor(state, context, matchBinding, moveMode, stimpack = null) {
  const modelIds = context.models.map((model) => model.id)
    .sort((left, right) => left.localeCompare(right));
  const speedBuff = moveMode === "stimpack" ? 3 : 0;
  const ruleAtomIds = officialMarineOptionalStimpackMoveActionAtomIdsV2(moveMode);
  const modelStartPoints = Object.fromEntries(context.models.map((model) => [
    model.id,
    point(model),
  ]));
  const core = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_PARAMETER_KIND,
    matchBindingHash: String(matchBinding?.bindingHash || ""),
    round: Number(state.round),
    phase: "movement",
    sideKey: context.sideKey,
    actionType: "move",
    pieceId: context.piece.id,
    moveMode,
    abilityChoice: moveMode === "stimpack" ? "use_before_move" : "decline",
    executorId: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
    ruleAtomIds: [...ruleAtomIds],
    parameterSchema: {
      type: "object",
      required: ["leadingModelId", "path", "placements"],
      pathUnit: "milli-inch",
      coordinateType: "safe_integer",
      maxCanonicalPathPoints: 32,
      exactRemainingPlacementCount: modelIds.length - 1,
    },
    constraints: {
      modelIds,
      modelStartPoints,
      currentModelCount: context.currentModels,
      maxModelCount: context.maxModels,
      startedSingleModel: context.startedSingleModel,
      splitSpeedSourceValue: context.bindings.movement.sourceValue,
      splitSpeedSelection: context.currentModels === 1 ? "second" : "first",
      printedSpeedMilliInches: context.printedSpeed * 1000,
      buffModifierMilliInches: speedBuff * 1000,
      maxDistanceMilliInches: (context.printedSpeed + speedBuff) * 1000,
      resourceCost: moveMode === "stimpack" ? 1 : 0,
      nonLethalDamage: moveMode === "stimpack" ? 2 : 0,
      baseDiameterMilliInches: BASE_DIAMETER_MILLI_INCHES,
      battlefieldWidthMilliInches: 54000,
      battlefieldHeightMilliInches: 36000,
      roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
      gameplayDataBundleHash: context.bindings.gameplayBundle.gameplayDataBundleHash,
      reserveDeployDataBundleHash:
        context.bindings.gameplayBundle.reserveDeployDataBundle.reserveDeployDataBundleHash,
      marineSourceRecordHash: MARINE_SOURCE_RECORD_HASH,
      marinePayloadHash: MARINE_PAYLOAD_HASH,
      coreRulesSourceHash: CORE_RULES_SOURCE_HASH,
      terranP2pSourceHash: TERRAN_P2P_SOURCE_HASH,
      geometryKernelHash: GEOMETRY_KERNEL.kernelHash,
      ...(stimpack ? {
        cardResourceId: context.card.id,
        abilityPlanHash: stimpack.abilityPlan.stimpackPlanHash,
        valueBuffResolutionHash: stimpack.buffResolution.valueBuffResolutionHash,
        predictedStatusEffectHash: stimpack.statusPair.status.statusEffectHash,
        predictedMarkerHash: stimpack.statusPair.marker.markerHash,
      } : {}),
      geometryScope:
        "current_marine_one_to_nine_models_empty_terrain_round_base_optional_stimpack_move_v2",
    },
    confirmationClass: moveMode === "stimpack"
      ? "direct_gesture_plus_resource_payment"
      : "direct_gesture",
    rulesTruth: moveMode === "stimpack"
      ? "official_current_marine_split_speed_plus_stimpack_buff_move_domain"
      : "official_current_marine_split_speed_base_move_while_stimpack_declined",
    trainingTruth: false,
  };
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

function diagnostic(state, sideKey, moveMode, error) {
  return {
    actionType: "move",
    sideKey,
    phase: "movement",
    pieceId: "",
    moveMode,
    abilityChoice: moveMode === "stimpack" ? "use_before_move" : "decline",
    ruleAtomIds: [...officialMarineOptionalStimpackMoveActionAtomIdsV2(moveMode)],
    executorId: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_optional_stimpack_move_fail_closed",
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialMarineOptionalStimpackMoveV2(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  const candidates = [];
  const parameterDomains = [];
  let context;
  try {
    context = baseContext(state, sideKey, options.matchBinding);
    parameterDomains.push(domainFor(state, context, options.matchBinding, "base"));
  } catch (error) {
    if (options.throwOnError === true) throw error;
    if (options.includeDisabled === true) {
      candidates.push(diagnostic(state, sideKey, "base", error));
    }
    return { candidates, parameterDomains };
  }
  try {
    const stimpack = stimpackContext(state, context);
    parameterDomains.push(domainFor(
      state,
      context,
      options.matchBinding,
      "stimpack",
      stimpack,
    ));
  } catch (error) {
    if (options.includeDisabled === true) {
      candidates.push(diagnostic(state, sideKey, "stimpack", error));
    }
  }
  return { candidates, parameterDomains };
}

function canonicalAction(domain, plan) {
  const stimpack = domain.moveMode === "stimpack";
  return {
    actionType: "move",
    sideKey: domain.sideKey,
    phase: "movement",
    pieceId: domain.pieceId,
    moveMode: domain.moveMode,
    abilityChoice: domain.abilityChoice,
    ...(stimpack ? {
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
    } : {
      resourceCost: 0,
      nonLethalDamage: 0,
      speedBuff: 0,
      precision: 0,
    }),
    movePlan: clone(plan),
    ruleAtomIds: [...officialMarineOptionalStimpackMoveActionAtomIdsV2(domain.moveMode)],
    executorId: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
  };
}

export function instantiateOfficialMarineOptionalStimpackMoveV2(
  state,
  domain,
  parameters,
  options = {},
) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION
    || !MOVE_MODES.includes(domain.moveMode)) {
    fail("OPTIONAL_STIMPACK_MOVE_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialMarineOptionalStimpackMoveV2(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
    throwOnError: true,
  });
  const expected = current.parameterDomains.find((row) => row.domainId === domain.domainId);
  if (!expected || !isDeepStrictEqual(expected, domain)) {
    fail("OPTIONAL_STIMPACK_MOVE_PARAMETER_DOMAIN_STALE");
  }
  const geometry = instantiateOfficialMarineMoveGeometryV2({
    state,
    domain,
    parameters,
  });
  const context = baseContext(state, domain.sideKey, options.matchBinding);
  const stimpack = domain.moveMode === "stimpack" ? stimpackContext(state, context) : null;
  const planBody = {
    schemaVersion: PLAN_SCHEMA,
    pieceId: domain.pieceId,
    moveMode: domain.moveMode,
    abilityChoice: domain.abilityChoice,
    leadingModelId: geometry.leadingModelId,
    canonicalPath: clone(geometry.canonicalPath),
    placementSequence: clone(geometry.placementSequence),
    finalModelPositions: clone(geometry.finalModelPositions),
    distanceTravelledInches: geometry.distanceTravelledInches,
    currentModelCount: context.currentModels,
    maxModelCount: context.maxModels,
    startedSingleModel: context.startedSingleModel,
    splitSpeedSelection: context.currentModels === 1 ? "second" : "first",
    printedSpeedInches: context.printedSpeed,
    speedBuff: domain.moveMode === "stimpack" ? 3 : 0,
    speedAllowanceInches: domain.constraints.maxDistanceMilliInches / 1000,
    resourceCost: domain.moveMode === "stimpack" ? 1 : 0,
    nonLethalDamage: domain.moveMode === "stimpack" ? 2 : 0,
    geometryKernelHash: GEOMETRY_KERNEL.kernelHash,
    roundSupplyStateHashBefore: domain.constraints.roundSupplyStateHash,
    ...(stimpack ? {
      characteristicStatusKernelHash: CHARACTERISTIC_KERNEL.descriptor.kernelHash,
      valueBuffResolution: clone(stimpack.buffResolution),
      predictedStatusEffectHash: stimpack.statusPair.status.statusEffectHash,
      predictedMarkerHash: stimpack.statusPair.marker.markerHash,
      abilityPlanHash: stimpack.abilityPlan.stimpackPlanHash,
      cardResourceId: context.card.id,
      damageTargetModelId: stimpack.damageTargetModelId,
    } : {}),
    geometryScope: domain.constraints.geometryScope,
    trainingTruth: false,
  };
  const plan = { ...planBody, movePlanHash: hashStarcraftTmgContract(planBody) };
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: clone(geometry.canonicalParameters),
    action: canonicalAction(domain, plan),
    rulesTruth: domain.moveMode === "stimpack"
      ? "official_marine_multi_or_single_model_stimpack_move_instantiation_v2"
      : "official_marine_multi_or_single_model_base_move_with_stimpack_declined_v2",
    trainingTruth: false,
  };
}

function abilityHistoryEntry(state, action, nonLethal, statusPair) {
  const body = {
    schema: "starcraft_tmg_official_active_ability_use_history_entry_v2",
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
    currentModelCountAtUse: action.movePlan.currentModelCount,
    printedSpeedInches: action.movePlan.printedSpeedInches,
    effectiveSpeedInches: action.movePlan.speedAllowanceInches,
    trainingTruth: false,
  };
  return { ...body, abilityUseHash: hashStarcraftTmgContract(body) };
}

export function applyOfficialMarineOptionalStimpackMoveV2(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== "move"
    || actionInput.executorId !== OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION
    || !MOVE_MODES.includes(actionInput.moveMode)
    || !object(actionInput.movePlan)) {
    fail("OPTIONAL_STIMPACK_MOVE_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialMarineOptionalStimpackMoveV2(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
    throwOnError: true,
  });
  const domain = enumeration.parameterDomains.find((row) => (
    row.pieceId === actionInput.pieceId && row.moveMode === actionInput.moveMode
  ));
  if (!domain) fail("OPTIONAL_STIMPACK_MOVE_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialMarineOptionalStimpackMoveV2(
    stateInput,
    domain,
    {
      leadingModelId: actionInput.movePlan.leadingModelId,
      path: actionInput.movePlan.canonicalPath?.points?.slice(1),
      placements: actionInput.movePlan.placementSequence,
    },
    options,
  );
  if (!isDeepStrictEqual(actionInput, instantiated.action)) {
    fail("OPTIONAL_STIMPACK_MOVE_ACTION_STALE");
  }
  const context = baseContext(stateInput, actionInput.sideKey, options.matchBinding);
  const stimpack = actionInput.moveMode === "stimpack"
    ? stimpackContext(stateInput, context)
    : null;
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const stationaryRemoved = piece.statuses.includes("stationary");
  let nonLethal = null;
  let history = null;
  let card = null;
  if (stimpack) {
    nonLethal = STIMPACK_KERNEL.resolveNonLethalDamage({
      targetPieceId: piece.id,
      targetModelId: stimpack.damageTargetModelId,
      abilityResolutionHash: actionInput.abilityPlanHash,
      priorDamageMarker: 0,
      amount: 2,
      targetHitPoints: context.bindings.marine.hitPoints,
    });
    card = state.cardResources[actionInput.sideKey].find((entry) => (
      entry.id === actionInput.cardResourceId
    ));
    if (!card || card.readiness !== "ready" || card.face !== "up") {
      fail("OPTIONAL_STIMPACK_MOVE_PAYMENT_CARD_STALE");
    }
    card.readiness = "exhausted";
    card.face = "down";
    piece.damageMarker = nonLethal.postDamageMarker;
    piece.statuses = [clone(stimpack.statusPair.status)];
    state.board.effectMarkers = [clone(stimpack.statusPair.marker)];
    history = abilityHistoryEntry(state, actionInput, nonLethal, stimpack.statusPair);
    state.activeAbilityUseHistory = Array.isArray(state.activeAbilityUseHistory)
      ? state.activeAbilityUseHistory
      : [];
    state.activeAbilityUseHistory.push(history);
  } else {
    piece.statuses = piece.statuses.filter((status) => status !== "stationary");
  }
  const positions = new Map(actionInput.movePlan.finalModelPositions.map((row) => [
    row.modelId,
    row,
  ]));
  for (const model of piece.models) {
    const position = positions.get(model.id);
    if (!position) fail("OPTIONAL_STIMPACK_MOVE_FINAL_POSITION_MISSING", model.id);
    model.xInches = inches(position.xMilliInches);
    model.yInches = inches(position.yMilliInches);
  }
  const leading = positions.get(actionInput.movePlan.leadingModelId);
  piece.xInches = inches(leading.xMilliInches);
  piece.yInches = inches(leading.yMilliInches);
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    movement: true,
  };
  piece.inCoherency = true;
  piece.lastLeadingModelId = actionInput.movePlan.leadingModelId;
  piece.lastMovePlanHash = actionInput.movePlan.movePlanHash;
  const previousSupplyHash = state.officialRoundSupplyState.roundSupplyStateHash;
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: state.officialGameplayDataBundle,
    rulesRuntimeHash: context.boundRuntimeHash,
  });
  if (state.officialRoundSupplyState.roundSupplyStateHash !== previousSupplyHash) {
    fail("OPTIONAL_STIMPACK_MOVE_SUPPLY_STATE_CHANGED");
  }
  const events = [];
  if (stimpack) {
    events.push({
      type: "use_ability",
      subtype: "marine_stimpack_before_move_v2",
      sideKey: actionInput.sideKey,
      pieceId: piece.id,
      targetId: piece.id,
      abilityId: actionInput.abilityId,
      abilityName: actionInput.abilityName,
      abilityWindow: "before_action",
      underlyingAction: "move",
      abilitySourceTextHash: OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
      stimpackPlanHash: actionInput.abilityPlanHash,
      currentModelCount: actionInput.movePlan.currentModelCount,
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
      status: clone(stimpack.statusPair.status),
      marker: clone(stimpack.statusPair.marker),
      valueBuffResolution: clone(stimpack.buffResolution),
      abilityUseHash: history.abilityUseHash,
      trainingTruth: false,
    });
  }
  events.push({
    type: "unit_standard_moved",
    subtype: stimpack ? "optional_stimpack_speed_consumer_v2" : "stimpack_declined_base_move_v2",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    moveMode: actionInput.moveMode,
    abilityChoice: actionInput.abilityChoice,
    leadingModelId: actionInput.movePlan.leadingModelId,
    movePlanHash: actionInput.movePlan.movePlanHash,
    distanceTravelledInches: actionInput.movePlan.distanceTravelledInches,
    currentModelCount: actionInput.movePlan.currentModelCount,
    maxModelCount: actionInput.movePlan.maxModelCount,
    splitSpeedSelection: actionInput.movePlan.splitSpeedSelection,
    printedSpeedInches: actionInput.movePlan.printedSpeedInches,
    speedBuff: actionInput.movePlan.speedBuff,
    speedAllowanceInches: actionInput.movePlan.speedAllowanceInches,
    resourceCost: actionInput.movePlan.resourceCost,
    nonLethalDamage: actionInput.movePlan.nonLethalDamage,
    roundSupplyStateHash: previousSupplyHash,
    stationaryRemoved,
    movementActivated: true,
    inCoherency: true,
    trainingTruth: false,
  });
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
    schemaVersion: "starcraft_tmg_official_marine_optional_stimpack_move_transition_v2",
    executorId: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: clone(actionInput),
    ...(stimpack ? {
      nonLethalDamageResolution: nonLethal,
      stimpackStatus: clone(stimpack.statusPair.status),
      stimpackMarker: clone(stimpack.statusPair.marker),
      valueBuffResolution: clone(stimpack.buffResolution),
    } : {}),
    rulesTruth: stimpack
      ? "official_current_multi_or_single_marine_stimpack_move_v2"
      : "official_current_multi_or_single_marine_base_move_with_stimpack_declined_v2",
    trainingTruth: false,
  };
}
