import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialCleanupCardBundleV1 } from
  "../source-data/official-cleanup-card-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialHealResolutionKernelV1 } from
  "./official-heal-resolution-kernel-v1.mjs";
import { OFFICIAL_MOVEMENT_HOLD_ATOM_IDS } from
  "./official-movement-hold-executor-v1.mjs";

export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID =
  "authority.medic-medpack-active-v1";
export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_TYPE = "use_ability";

export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:ability-target-range-and-line-of-sight",
  "rule-atom:active-ability-action-window",
  "rule-atom:active-ability-activation-and-window",
  "rule-atom:active-ability-reserve-prohibition",
  "rule-atom:faction-card-resource-field",
  "rule-atom:model-within-definition",
  "rule-atom:named-active-ability-per-unit-round-limit",
  "rule-atom:named-active-frequency-with-repeatable-exception",
  "rule-atom:shielded-status-heal-restoration-forbidden",
  "rule-atom:singleton:core-10-1-cost-and-instruction-fields:fdc72da56183",
  "rule-atom:singleton:core-10-1-cost-and-on-battlefield-requirement:62c536600f95",
  "rule-atom:singleton:core-10-1-special-ability-universal-structure:5a816d600530",
  "rule-atom:singleton:core-10-2-active-ability-definition:f2579f39a272",
  "rule-atom:singleton:core-10-2-active-requires-activation:dbe149746c16",
  "rule-atom:singleton:core-10-2-during-action-prohibition:01b69cee5275",
  "rule-atom:singleton:core-10-5-1-faction-resource-map:a6cb07022a95",
  "rule-atom:singleton:core-10-5-1-full-cost-or-no-activation:b61d22c0bde3",
  "rule-atom:singleton:core-10-5-1-matching-resource-exhaustion:25253ce10d5c",
  "rule-atom:singleton:core-10-5-1-resources-from-exhaustion:e5bb4b1fa3be",
  "rule-atom:singleton:core-11-friendly-controller-ownership:d4e872bf593b",
  "rule-atom:singleton:core-11-heal-damage-reduction:727c6a4fc5a5",
  "rule-atom:singleton:core-11-heal-destroyed-model-prohibition:8a2f490006f4",
  "rule-atom:singleton:core-11-heal-respawn-cross-reference:958f9f7a1976",
  "rule-atom:singleton:core-11-within-allows-partial-overlap:92ab25461ca3",
  "rule-atom:singleton:core-2-2-friendly-unit-definition:436b11e26d64",
  "rule-atom:singleton:core-2-5-friendly-enemy-definition:f883a8c7154f",
  "rule-atom:singleton:core-2-7-1-active-no-mid-action:8b277fd58970",
  "rule-atom:singleton:core-4-2-unit-within:d21239907d90",
  "rule-atom:unit-within-at-least-one-model-definition",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_DEPENDENCY_ATOM_IDS = Object.freeze([
  ...OFFICIAL_MOVEMENT_HOLD_ATOM_IDS,
  "rule-atom:exhausted-card-lockout-until-refresh",
  "rule-atom:singleton:core-10-5-1-exhausted-card-state:9dbfd7af218d",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MEDIC_MEDPACK_ACTIVE_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_MEDIC_MEDPACK_ACTIVE_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ATOM_IDS =
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_ATOM_IDS;

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const ABILITY_WINDOWS = Object.freeze(["after_action", "before_action"]);
const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b";
const MEDIC_RECORD_KEY = "army_units:medic";
const MEDIC_SOURCE_RECORD_HASH =
  "1a673c3081628d422bf7d38ad3db7c92a7e43f0e305e1f8eb610ec9c748dc203";
const MEDIC_PAYLOAD_HASH =
  "5ef39b4365da4f36cb5b939aea1290f645f368f730a149693ad3afa4e4b678ba";
const MARINE_RECORD_KEY = "army_units:marine";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const RESOURCE_RECORD_KEY = "tactical_cards:terran_armed_forces";
const RESOURCE_SOURCE_RECORD_HASH =
  "44aa8b4d52a065dbbc5e93a9bfc203957647393efe4c123e1a0b2b909dbf63c5";
const BASE_DIAMETER_MILLI_INCHES = Math.round((32 / 25.4) * 1000);
const RANGE_MILLI_INCHES = 4000;
const MEDPACK_SOURCE = Object.freeze({
  abilityId: "medpack",
  abilityName: "Medpack",
  activation: "<Active>\n(1 Command Point)",
  phase: "Movement Phase",
  resourceType: "CP",
  resourceCost: 1,
  description:
    "Select another Friendly Biological Unit Within 4\". Resolve the HEAL (X) effect for the targeted Unit, where X is the number of models in this Unit that are Within 4\" of the target Unit.",
});
const MEDPACK_SOURCE_TEXT_HASH = hashStarcraftTmgContract(MEDPACK_SOURCE);
const HEAL_KERNEL = createOfficialHealResolutionKernelV1();

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
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}

function milli(value, code, detail = "") {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(code, detail);
  const result = Math.round(number * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("MEDPACK_STATE_INVALID");
  }
}

function verifyBindings(state, matchBinding) {
  const gameplayBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayBundle);
  const combatBundle = gameplayBundle.combatProfileBundle;
  const cleanupCardBundle = gameplayBundle.cleanupCardBundle;
  verifyOfficialCleanupCardBundleV1(cleanupCardBundle);
  const keys = combatBundle.profiles.map((profile) => profile.recordKey)
    .sort((left, right) => left.localeCompare(right));
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayBundle) !== matchBinding.dataSnapshotHash
    || gameplayBundle.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || gameplayBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || !isDeepStrictEqual(gameplayBundle.dataVersions, {
      cardsVersion: "69",
      rulesVersion: "48",
      unitsVersion: "71",
    })
    || gameplayBundle.repositoryFallbackAllowed !== false
    || !isDeepStrictEqual(keys, [MARINE_RECORD_KEY, MEDIC_RECORD_KEY])) {
    fail("MEDPACK_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const medic = getOfficialCombatProfileV1(combatBundle, MEDIC_RECORD_KEY);
  const marine = getOfficialCombatProfileV1(combatBundle, MARINE_RECORD_KEY);
  if (medic.sourceRecordHash !== MEDIC_SOURCE_RECORD_HASH
    || medic.payloadHash !== MEDIC_PAYLOAD_HASH
    || medic.unitName !== "Medic"
    || !isDeepStrictEqual(medic.combatTags, ["biological", "ground", "light"])
    || medic.hitPoints !== 2
    || medic.shield !== 0
    || marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || marine.unitName !== "Marine"
    || !isDeepStrictEqual(marine.combatTags, ["biological", "ground", "light"])
    || marine.hitPoints !== 2
    || marine.shield !== 0) {
    fail("MEDPACK_OFFICIAL_PROFILE_DRIFT");
  }
  const resourceProfile = cleanupCardBundle.profiles.find((profile) => (
    profile.recordKey === RESOURCE_RECORD_KEY
  ));
  if (!resourceProfile
    || resourceProfile.sourceRecordHash !== RESOURCE_SOURCE_RECORD_HASH
    || resourceProfile.cardKind !== "faction"
    || resourceProfile.resource !== 1) {
    fail("MEDPACK_RESOURCE_PROFILE_DRIFT");
  }
  return { gameplayBundle, combatBundle, cleanupCardBundle, medic, marine, resourceProfile };
}

function exactModels(piece, expectedRecordKey, expectedSourceHash, expectedPayloadHash, role) {
  const models = activeModels(piece);
  const currentModels = Number(piece.currentModels);
  const maxModels = Number(piece.maxModels);
  if (piece.officialUnitRecordKey !== expectedRecordKey
    || piece.sourceRecordHash !== expectedSourceHash
    || piece.officialPayloadHash !== expectedPayloadHash
    || !Number.isSafeInteger(currentModels)
    || currentModels < 1
    || !Number.isSafeInteger(maxModels)
    || maxModels < currentModels
    || models.length !== currentModels
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || piece.combatTag !== "ground"
    || !Array.isArray(piece.destroyedModelIds)
    || piece.destroyedModelIds.length !== maxModels - currentModels) {
    fail("MEDPACK_UNIT_SCOPE_UNSUPPORTED", role);
  }
  for (const model of models) {
    if (model.baseShape !== "round"
      || milli(model.baseWidthInches, "MEDPACK_BASE_SCOPE_UNSUPPORTED", model.id)
        !== BASE_DIAMETER_MILLI_INCHES
      || milli(model.baseDepthInches, "MEDPACK_BASE_SCOPE_UNSUPPORTED", model.id)
        !== BASE_DIAMETER_MILLI_INCHES
      || !isDeepStrictEqual(model.supportTerrainIds || [], [])
      || !isDeepStrictEqual(model.adjacentAccessPointIds || [], [])
      || String(model.elevation || "ground") !== "ground") {
      fail("MEDPACK_BASE_SCOPE_UNSUPPORTED", model.id);
    }
    milli(model.xInches, "MEDPACK_MODEL_GEOMETRY_INVALID", model.id);
    milli(model.yInches, "MEDPACK_MODEL_GEOMETRY_INVALID", model.id);
  }
  return models;
}

function baseGapMilliInches(left, right) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "MEDPACK_MODEL_GEOMETRY_INVALID", right.id)
      - milli(left.xInches, "MEDPACK_MODEL_GEOMETRY_INVALID", left.id),
    milli(right.yInches, "MEDPACK_MODEL_GEOMETRY_INVALID", right.id)
      - milli(left.yInches, "MEDPACK_MODEL_GEOMETRY_INVALID", left.id),
  ) - BASE_DIAMETER_MILLI_INCHES));
}

function withinReceipt(sourceModels, targetModels) {
  const pairs = sourceModels.flatMap((source) => targetModels.map((target) => ({
    sourceModelId: source.id,
    targetModelId: target.id,
    baseGapMilliInches: baseGapMilliInches(source, target),
  }))).sort((left, right) => (
    left.sourceModelId.localeCompare(right.sourceModelId)
      || left.targetModelId.localeCompare(right.targetModelId)
  ));
  const contributingModelIds = sourceModels.filter((source) => pairs.some((pair) => (
    pair.sourceModelId === source.id && pair.baseGapMilliInches <= RANGE_MILLI_INCHES
  ))).map((model) => model.id).sort((left, right) => left.localeCompare(right));
  const nearestBaseGapMilliInches = Math.min(...pairs.map((pair) => pair.baseGapMilliInches));
  const body = {
    schema: "starcraft_tmg_official_medpack_within_receipt_v1",
    rangeMilliInches: RANGE_MILLI_INCHES,
    relation: "any_source_model_base_within_target_unit_by_any_target_model_base",
    pairs,
    nearestBaseGapMilliInches,
    targetUnitWithin: nearestBaseGapMilliInches <= RANGE_MILLI_INCHES,
    contributingModelIds,
    healValue: contributingModelIds.length,
    partialBaseOverlapCountsAsWithin: true,
    trainingTruth: false,
  };
  return {
    ...body,
    withinReceiptHash: hashStarcraftTmgContract(body),
  };
}

function paymentCard(state, sideKey, resourceProfile) {
  if (state.players?.[sideKey]?.faction !== "Terran"
    || !Array.isArray(state.cardResources?.[sideKey])) {
    fail("MEDPACK_RESOURCE_STATE_INVALID");
  }
  const card = state.cardResources[sideKey].find((row) => (
    row?.officialCardRecordKey === RESOURCE_RECORD_KEY
  ));
  if (!object(card)
    || card.sideKey !== sideKey
    || card.cardKind !== "faction"
    || card.sourceRecordHash !== resourceProfile.sourceRecordHash
    || Number(card.resource) !== 1
    || card.resourceType !== "CP") {
    fail("MEDPACK_MATCHING_RESOURCE_REQUIRED");
  }
  if (card.readiness !== "ready" || card.face !== "up") {
    fail("MEDPACK_FULL_COST_UNAVAILABLE");
  }
  return card;
}

function usedThisRound(state, pieceId) {
  const history = state.activeAbilityUseHistory || [];
  if (!Array.isArray(history)) fail("MEDPACK_ABILITY_HISTORY_INVALID");
  return history.some((entry) => (
    entry?.pieceId === pieceId
      && entry?.abilityId === MEDPACK_SOURCE.abilityId
      && Number(entry?.round) === Number(state.round)
  ));
}

function contextFor(state, sideKey, piece, target, window, bindings) {
  if (state.phase !== "movement") fail("MEDPACK_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("MEDPACK_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.movement === true) fail("MEDPACK_SIDE_PASSED");
  if (!ABILITY_WINDOWS.includes(window)) fail("MEDPACK_ACTION_WINDOW_INVALID");
  if (!activePiece(piece) || piece.sideKey !== sideKey) fail("MEDPACK_SOURCE_UNAVAILABLE");
  if (!activePiece(target) || target.sideKey !== sideKey || target.id === piece.id) {
    fail("MEDPACK_TARGET_NOT_ANOTHER_FRIENDLY_UNIT");
  }
  if (piece.activatedPhases?.movement === true) fail("MEDPACK_ALREADY_ACTIVATED");
  if (piece.isInReserves === true || piece.isOnField !== true) fail("MEDPACK_RESERVE_PROHIBITED");
  if (state.pendingAction !== undefined && state.pendingAction !== null) {
    fail("MEDPACK_MID_ACTION_PROHIBITED");
  }
  if ((state.board.terrain || []).length !== 0
    || (state.board.accessPoints || []).length !== 0
    || (state.board.effectMarkers || []).length !== 0) {
    fail("MEDPACK_LINE_OF_SIGHT_SCOPE_UNSUPPORTED");
  }
  if (usedThisRound(state, piece.id)) fail("MEDPACK_NAMED_ABILITY_ALREADY_USED_THIS_ROUND");
  const sourceModels = exactModels(
    piece,
    MEDIC_RECORD_KEY,
    MEDIC_SOURCE_RECORD_HASH,
    MEDIC_PAYLOAD_HASH,
    "source",
  );
  const targetModels = exactModels(
    target,
    MARINE_RECORD_KEY,
    MARINE_SOURCE_RECORD_HASH,
    MARINE_PAYLOAD_HASH,
    "target",
  );
  if (!isDeepStrictEqual(piece.selectedUpgradeNames || [], ["Medpack"])
    || !isDeepStrictEqual(target.selectedUpgradeNames || [], [])
    || !isDeepStrictEqual(piece.statuses || [], [])
    || !isDeepStrictEqual(target.statuses || [], [])
    || Number(target.damageMarker || 0) < 0
    || Number(target.damageMarker || 0) >= bindings.marine.hitPoints) {
    fail("MEDPACK_UNIT_STATE_UNSUPPORTED");
  }
  const within = withinReceipt(sourceModels, targetModels);
  if (!within.targetUnitWithin || within.healValue < 1) fail("MEDPACK_TARGET_OUT_OF_RANGE");
  const card = paymentCard(state, sideKey, bindings.resourceProfile);
  const lineOfSightBody = {
    schema: "starcraft_tmg_official_medpack_unobstructed_line_of_sight_receipt_v1",
    sourceUnitId: piece.id,
    targetUnitId: target.id,
    terrainCount: 0,
    sameElevation: true,
    visible: true,
    trainingTruth: false,
  };
  const lineOfSightReceipt = {
    ...lineOfSightBody,
    lineOfSightReceiptHash: hashStarcraftTmgContract(lineOfSightBody),
  };
  const planBody = {
    schema: "starcraft_tmg_official_medic_medpack_plan_v1",
    round: Number(state.round),
    phase: "movement",
    sideKey,
    pieceId: piece.id,
    targetId: target.id,
    cardResourceId: card.id,
    abilityWindow: window,
    abilitySourceTextHash: MEDPACK_SOURCE_TEXT_HASH,
    withinReceiptHash: within.withinReceiptHash,
    lineOfSightReceiptHash: lineOfSightReceipt.lineOfSightReceiptHash,
    contributingModelIds: [...within.contributingModelIds],
    healValue: within.healValue,
    resourceType: "CP",
    resourceCost: 1,
    underlyingAction: "hold",
    trainingTruth: false,
  };
  return {
    sourceModels,
    targetModels,
    within,
    card,
    lineOfSightReceipt,
    plan: {
      ...planBody,
      medpackPlanHash: hashStarcraftTmgContract(planBody),
    },
  };
}

function canonicalAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_TYPE,
    sideKey,
    phase: "movement",
    pieceId: piece.id,
    targetId: target.id,
    cardResourceId: context.card.id,
    abilityId: MEDPACK_SOURCE.abilityId,
    abilityName: MEDPACK_SOURCE.abilityName,
    abilityWindow: context.plan.abilityWindow,
    resourceType: context.plan.resourceType,
    resourceCost: context.plan.resourceCost,
    amount: context.plan.healValue,
    contributingModelIds: [...context.plan.contributingModelIds],
    lineOfSightStatus: "unobstructed",
    targetRangeMilliInches: RANGE_MILLI_INCHES,
    targetDistanceMilliInches: context.within.nearestBaseGapMilliInches,
    abilityPlanHash: context.plan.medpackPlanHash,
    ruleAtomIds: [...OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialMedicMedpackActiveV1(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("MEDPACK_SIDE_REQUIRED");
  let bindings;
  try {
    bindings = verifyBindings(state, options.matchBinding);
  } catch {
    return [];
  }
  const rows = [];
  const sources = state.pieces.filter((piece) => (
    piece.sideKey === sideKey && piece.officialUnitRecordKey === MEDIC_RECORD_KEY
  ));
  const targets = state.pieces.filter((piece) => (
    piece.sideKey === sideKey && piece.officialUnitRecordKey === MARINE_RECORD_KEY
  ));
  for (const piece of sources) {
    for (const target of targets) {
      for (const window of ABILITY_WINDOWS) {
        let context;
        try {
          context = contextFor(state, sideKey, piece, target, window, bindings);
        } catch {
          continue;
        }
        rows.push({
          ...canonicalAction(sideKey, piece, target, context),
          isEnabled: true,
          disabledReason: "",
          score: 160 + context.plan.healValue,
          details: {
            sourceRule: "official_core_4_2_5_4_10_1_10_2_10_5_1_11_and_current_medic",
            medpackSourceTextHash: MEDPACK_SOURCE_TEXT_HASH,
            healResolutionKernelHash: HEAL_KERNEL.descriptor.kernelHash,
            withinReceiptHash: context.within.withinReceiptHash,
            lineOfSightReceiptHash: context.lineOfSightReceipt.lineOfSightReceiptHash,
            rulesTruth: "official_current_medic_medpack_exact_subset",
            trainingTruth: false,
          },
        });
      }
    }
  }
  return rows.sort((left, right) => (
    left.pieceId.localeCompare(right.pieceId)
      || left.targetId.localeCompare(right.targetId)
      || left.abilityWindow.localeCompare(right.abilityWindow)
  ));
}

function actionFromCandidate(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = candidate;
  return action;
}

export function applyOfficialMedicMedpackActiveV1(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_VERSION) {
    fail("MEDPACK_ACTION_INVALID");
  }
  const candidates = enumerateOfficialMedicMedpackActiveV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  });
  const expectedCandidate = candidates.find((candidate) => (
    candidate.pieceId === actionInput.pieceId
      && candidate.targetId === actionInput.targetId
      && candidate.abilityWindow === actionInput.abilityWindow
      && candidate.cardResourceId === actionInput.cardResourceId
  ));
  if (!expectedCandidate) fail("MEDPACK_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) fail("MEDPACK_ACTION_MISMATCH");
  const bindings = verifyBindings(stateInput, options.matchBinding);
  const pieceBefore = stateInput.pieces.find((piece) => piece.id === actionInput.pieceId);
  const targetBefore = stateInput.pieces.find((piece) => piece.id === actionInput.targetId);
  const context = contextFor(
    stateInput,
    actionInput.sideKey,
    pieceBefore,
    targetBefore,
    actionInput.abilityWindow,
    bindings,
  );
  const heal = HEAL_KERNEL.resolveHeal({
    currentModels: targetBefore.currentModels,
    maxModels: targetBefore.maxModels,
    destroyedModelIds: targetBefore.destroyedModelIds,
    damageMarker: targetBefore.damageMarker || 0,
    healValue: context.plan.healValue,
    statuses: targetBefore.statuses || [],
    shieldValue: bindings.marine.shield,
  });
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const card = state.cardResources[actionInput.sideKey].find((entry) => (
    entry.id === actionInput.cardResourceId
  ));
  card.readiness = "exhausted";
  card.face = "down";
  target.damageMarker = heal.damageMarkerAfter;
  target.statuses = [...heal.statusesAfter];
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    movement: true,
  };
  const historyBody = {
    schema: "starcraft_tmg_official_active_ability_use_history_entry_v1",
    round: Number(state.round),
    phase: "movement",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    abilityId: MEDPACK_SOURCE.abilityId,
    abilityName: MEDPACK_SOURCE.abilityName,
    abilityWindow: actionInput.abilityWindow,
    cardResourceId: card.id,
    medpackPlanHash: context.plan.medpackPlanHash,
    healResolutionHash: heal.healResolutionHash,
    trainingTruth: false,
  };
  const historyEntry = {
    ...historyBody,
    abilityUseHash: hashStarcraftTmgContract(historyBody),
  };
  state.activeAbilityUseHistory = Array.isArray(state.activeAbilityUseHistory)
    ? state.activeAbilityUseHistory
    : [];
  state.activeAbilityUseHistory.push(historyEntry);
  const abilityEvent = {
    type: OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_TYPE,
    subtype: "medic_medpack",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    abilityId: MEDPACK_SOURCE.abilityId,
    abilityName: MEDPACK_SOURCE.abilityName,
    abilityWindow: actionInput.abilityWindow,
    underlyingAction: "hold",
    abilitySourceTextHash: MEDPACK_SOURCE_TEXT_HASH,
    medpackPlanHash: context.plan.medpackPlanHash,
    withinReceiptHash: context.within.withinReceiptHash,
    lineOfSightReceiptHash: context.lineOfSightReceipt.lineOfSightReceiptHash,
    resourcePayment: {
      resourceType: "CP",
      cost: 1,
      cardResourceId: card.id,
      officialCardRecordKey: card.officialCardRecordKey,
      readinessBefore: "ready",
      readinessAfter: card.readiness,
      faceBefore: "up",
      faceAfter: card.face,
      excessResourceLost: 0,
      generatedResourceRetained: 0,
    },
    heal: clone(heal),
    abilityUseHash: historyEntry.abilityUseHash,
    trainingTruth: false,
  };
  const holdEvent = { type: "hold", pieceId: piece.id, phase: "movement" };
  const events = actionInput.abilityWindow === "before_action"
    ? [abilityEvent, holdEvent]
    : [holdEvent, abilityEvent];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "movement",
    action: clone(expectedAction),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_medic_medpack_active_transition_v1",
    executorId: OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    healResolution: heal,
    rulesTruth: "official_current_medic_medpack_exact_subset",
    trainingTruth: false,
  };
}

export const OFFICIAL_MEDIC_MEDPACK_SOURCE_V1 = MEDPACK_SOURCE;
export const OFFICIAL_MEDIC_MEDPACK_SOURCE_TEXT_HASH_V1 = MEDPACK_SOURCE_TEXT_HASH;
