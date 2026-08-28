import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialCleanupCardBundleV1 } from
  "../source-data/official-cleanup-card-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialCurrentMovementAuthorityLineageV3 } from
  "./official-current-movement-authority-lineage-v3.mjs";
import { createOfficialHealResolutionKernelV1 } from
  "./official-heal-resolution-kernel-v1.mjs";
import {
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_ATOM_IDS,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_DEPENDENCY_ATOM_IDS,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_NEW_ATOM_IDS,
  OFFICIAL_MEDIC_MEDPACK_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MEDIC_MEDPACK_SOURCE_V1,
} from "./official-medic-medpack-active-executor-v1.mjs";

export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID =
  "authority.medic-medpack-active-v2";
export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_ACTION_TYPE = "use_ability";
export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_NEW_ATOM_IDS =
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_NEW_ATOM_IDS;
export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_DEPENDENCY_ATOM_IDS =
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_DEPENDENCY_ATOM_IDS;
export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_ACTION_ATOM_IDS =
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_ATOM_IDS;
export const OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_ACTION_ATOM_IDS;

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const CURRENT_DATASET_HASH =
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459";
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
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const ABILITY_WINDOWS = Object.freeze(["after_action", "before_action"]);
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

function verifyBindings(state, matchBinding) {
  const gameplayBundle = state?.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayBundle);
  verifyOfficialCleanupCardBundleV1(gameplayBundle.cleanupCardBundle);
  const keys = gameplayBundle.combatProfileBundle.profiles.map((profile) => (
    profile.recordKey
  )).sort((left, right) => left.localeCompare(right));
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
    fail("MEDPACK_V2_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const medic = getOfficialCombatProfileV1(
    gameplayBundle.combatProfileBundle,
    MEDIC_RECORD_KEY,
  );
  const marine = getOfficialCombatProfileV1(
    gameplayBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
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
    fail("MEDPACK_V2_OFFICIAL_PROFILE_DRIFT");
  }
  const resourceProfile = gameplayBundle.cleanupCardBundle.profiles.find((profile) => (
    profile.recordKey === RESOURCE_RECORD_KEY
  ));
  if (!resourceProfile
    || resourceProfile.sourceRecordHash !== RESOURCE_SOURCE_RECORD_HASH
    || resourceProfile.cardKind !== "faction"
    || resourceProfile.resource !== 1) {
    fail("MEDPACK_V2_RESOURCE_PROFILE_DRIFT");
  }
  return { medic, marine, resourceProfile };
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
    fail("MEDPACK_V2_UNIT_SCOPE_UNSUPPORTED", role);
  }
  for (const model of models) {
    if (model.baseShape !== "round"
      || milli(model.baseWidthInches, "MEDPACK_V2_BASE_SCOPE_UNSUPPORTED", model.id)
        !== BASE_DIAMETER_MILLI_INCHES
      || milli(model.baseDepthInches, "MEDPACK_V2_BASE_SCOPE_UNSUPPORTED", model.id)
        !== BASE_DIAMETER_MILLI_INCHES
      || !isDeepStrictEqual(model.supportTerrainIds || [], [])
      || !isDeepStrictEqual(model.adjacentAccessPointIds || [], [])
      || String(model.elevation || "ground") !== "ground") {
      fail("MEDPACK_V2_BASE_SCOPE_UNSUPPORTED", model.id);
    }
    milli(model.xInches, "MEDPACK_V2_MODEL_GEOMETRY_INVALID", model.id);
    milli(model.yInches, "MEDPACK_V2_MODEL_GEOMETRY_INVALID", model.id);
  }
  return models;
}

function baseGapMilliInches(left, right) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "MEDPACK_V2_MODEL_GEOMETRY_INVALID", right.id)
      - milli(left.xInches, "MEDPACK_V2_MODEL_GEOMETRY_INVALID", left.id),
    milli(right.yInches, "MEDPACK_V2_MODEL_GEOMETRY_INVALID", right.id)
      - milli(left.yInches, "MEDPACK_V2_MODEL_GEOMETRY_INVALID", left.id),
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
    schema: "starcraft_tmg_official_medpack_within_receipt_v2",
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
  return { ...body, withinReceiptHash: hashStarcraftTmgContract(body) };
}

function paymentCard(state, sideKey, resourceProfile) {
  const card = state.cardResources?.[sideKey]?.find((row) => (
    row?.officialCardRecordKey === RESOURCE_RECORD_KEY
  ));
  if (state.players?.[sideKey]?.faction !== "Terran"
    || !object(card)
    || card.sideKey !== sideKey
    || card.cardKind !== "faction"
    || card.sourceRecordHash !== resourceProfile.sourceRecordHash
    || Number(card.resource) !== 1
    || card.resourceType !== "CP") {
    fail("MEDPACK_V2_MATCHING_RESOURCE_REQUIRED");
  }
  if (card.readiness !== "ready" || card.face !== "up") {
    fail("MEDPACK_V2_FULL_COST_UNAVAILABLE");
  }
  return card;
}

function usedThisRound(state, pieceId) {
  const history = state.activeAbilityUseHistory || [];
  if (!Array.isArray(history)) fail("MEDPACK_V2_ABILITY_HISTORY_INVALID");
  return history.some((entry) => (
    entry?.pieceId === pieceId
      && entry?.abilityId === OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.abilityId
      && Number(entry?.round) === Number(state.round)
  ));
}

function contextFor(state, sideKey, piece, target, window, bindings) {
  const authorityLineage = verifyOfficialCurrentMovementAuthorityLineageV3(state, {
    errorPrefix: "MEDPACK_V2",
  });
  if (state.phase !== "movement") fail("MEDPACK_V2_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("MEDPACK_V2_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.movement === true) {
    fail("MEDPACK_V2_SIDE_PASSED");
  }
  if (!ABILITY_WINDOWS.includes(window)) fail("MEDPACK_V2_ACTION_WINDOW_INVALID");
  if (!activePiece(piece) || piece.sideKey !== sideKey) fail("MEDPACK_V2_SOURCE_UNAVAILABLE");
  if (!activePiece(target) || target.sideKey !== sideKey || target.id === piece.id) {
    fail("MEDPACK_V2_TARGET_NOT_ANOTHER_FRIENDLY_UNIT");
  }
  if (piece.activatedPhases?.movement === true) fail("MEDPACK_V2_ALREADY_ACTIVATED");
  if (piece.isInReserves === true || piece.isOnField !== true) {
    fail("MEDPACK_V2_RESERVE_PROHIBITED");
  }
  if (state.pendingAction !== undefined && state.pendingAction !== null) {
    fail("MEDPACK_V2_MID_ACTION_PROHIBITED");
  }
  if ((state.board?.terrain || []).length !== 0
    || (state.board?.accessPoints || []).length !== 0
    || (state.board?.effectMarkers || []).length !== 0) {
    fail("MEDPACK_V2_LINE_OF_SIGHT_SCOPE_UNSUPPORTED");
  }
  if (usedThisRound(state, piece.id)) {
    fail("MEDPACK_V2_NAMED_ABILITY_ALREADY_USED_THIS_ROUND");
  }
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
    || !isDeepStrictEqual(piece.statuses || [], ["stationary"])
    || !isDeepStrictEqual(target.statuses || [], ["stationary"])
    || Number(target.damageMarker || 0) < 1
    || Number(target.damageMarker || 0) >= bindings.marine.hitPoints) {
    fail("MEDPACK_V2_UNIT_STATE_UNSUPPORTED");
  }
  const within = withinReceipt(sourceModels, targetModels);
  if (!within.targetUnitWithin || within.healValue < 1) {
    fail("MEDPACK_V2_TARGET_OUT_OF_RANGE");
  }
  const card = paymentCard(state, sideKey, bindings.resourceProfile);
  const lineOfSightBody = {
    schema: "starcraft_tmg_official_medpack_unobstructed_line_of_sight_receipt_v2",
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
    schema: "starcraft_tmg_official_medic_medpack_plan_v2",
    round: Number(state.round),
    phase: "movement",
    sideKey,
    pieceId: piece.id,
    targetId: target.id,
    cardResourceId: card.id,
    abilityWindow: window,
    abilitySourceTextHash: OFFICIAL_MEDIC_MEDPACK_SOURCE_TEXT_HASH_V1,
    withinReceiptHash: within.withinReceiptHash,
    lineOfSightReceiptHash: lineOfSightReceipt.lineOfSightReceiptHash,
    authorityLineageHash: authorityLineage.lineageHash,
    contributingModelIds: [...within.contributingModelIds],
    healValue: within.healValue,
    resourceType: "CP",
    resourceCost: 1,
    underlyingAction: "hold",
    trainingTruth: false,
  };
  return {
    authorityLineage,
    within,
    card,
    lineOfSightReceipt,
    plan: { ...planBody, medpackPlanHash: hashStarcraftTmgContract(planBody) },
  };
}

function canonicalAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_ACTION_TYPE,
    sideKey,
    phase: "movement",
    pieceId: piece.id,
    targetId: target.id,
    cardResourceId: context.card.id,
    abilityId: OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.abilityId,
    abilityName: OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.abilityName,
    abilityWindow: context.plan.abilityWindow,
    resourceType: "CP",
    resourceCost: 1,
    amount: context.plan.healValue,
    contributingModelIds: [...context.plan.contributingModelIds],
    lineOfSightStatus: "unobstructed",
    targetRangeMilliInches: RANGE_MILLI_INCHES,
    targetDistanceMilliInches: context.within.nearestBaseGapMilliInches,
    authorityLineageHash: context.authorityLineage.lineageHash,
    abilityPlanHash: context.plan.medpackPlanHash,
    ruleAtomIds: [...OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialMedicMedpackActiveV2(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("MEDPACK_V2_SIDE_REQUIRED");
  let bindings;
  try {
    bindings = verifyBindings(state, options.matchBinding);
  } catch (error) {
    return options.includeDisabled === true ? [{
      actionType: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_ACTION_TYPE,
      sideKey,
      executorId: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID,
      executorVersion: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_ACTION_ATOM_IDS],
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0,
      details: { rulesTruth: "official_medic_medpack_v2_fail_closed", trainingTruth: false },
    }] : [];
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
        try {
          const context = contextFor(state, sideKey, piece, target, window, bindings);
          rows.push({
            ...canonicalAction(sideKey, piece, target, context),
            isEnabled: true,
            disabledReason: "",
            score: 160 + context.plan.healValue,
            details: {
              rulesTruth: "official_current_medic_medpack_v2_exact_subset",
              silentCompatibilityUsed: false,
              trainingTruth: false,
            },
          });
        } catch {
          // Another target/window may still be valid; public disabled diagnostics stay aggregate.
        }
      }
    }
  }
  return rows.sort((left, right) => (
    left.pieceId.localeCompare(right.pieceId)
      || left.targetId.localeCompare(right.targetId)
      || left.abilityWindow.localeCompare(right.abilityWindow)
  ));
}

function executableAction(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

export function applyOfficialMedicMedpackActiveV2(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_VERSION) {
    fail("MEDPACK_V2_ACTION_INVALID");
  }
  const candidates = enumerateOfficialMedicMedpackActiveV2(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: false,
    matchBinding: options.matchBinding,
  });
  const expected = candidates.find((candidate) => (
    candidate.pieceId === actionInput.pieceId
      && candidate.targetId === actionInput.targetId
      && candidate.abilityWindow === actionInput.abilityWindow
      && candidate.cardResourceId === actionInput.cardResourceId
  ));
  if (!expected) fail("MEDPACK_V2_ACTION_STALE");
  const expectedAction = executableAction(expected);
  if (!isDeepStrictEqual(actionInput, expectedAction)) fail("MEDPACK_V2_ACTION_MISMATCH");
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
    damageMarker: targetBefore.damageMarker,
    healValue: context.plan.healValue,
    statuses: targetBefore.statuses.filter((status) => status !== "stationary"),
    shieldValue: bindings.marine.shield,
  });
  const protectedSupply = hashStarcraftTmgContract({
    officialRoundSupplyState: stateInput.officialRoundSupplyState,
    supplyLossLedger: stateInput.supplyLossLedger,
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
  target.statuses = [
    ...targetBefore.statuses.filter((status) => status === "stationary"),
    ...heal.statusesAfter,
  ];
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    movement: true,
  };
  const historyBody = {
    schema: "starcraft_tmg_official_active_ability_use_history_entry_v2",
    round: Number(state.round),
    phase: "movement",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    abilityId: OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.abilityId,
    abilityName: OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.abilityName,
    abilityWindow: actionInput.abilityWindow,
    cardResourceId: card.id,
    authorityLineageHash: context.authorityLineage.lineageHash,
    medpackPlanHash: context.plan.medpackPlanHash,
    healResolutionHash: heal.healResolutionHash,
    trainingTruth: false,
  };
  const historyEntry = {
    ...historyBody,
    abilityUseHash: hashStarcraftTmgContract(historyBody),
  };
  state.activeAbilityUseHistory.push(historyEntry);
  const abilityEvent = {
    type: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_ACTION_TYPE,
    subtype: "medic_medpack",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    abilityId: OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.abilityId,
    abilityName: OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.abilityName,
    abilityWindow: actionInput.abilityWindow,
    underlyingAction: "hold",
    abilitySourceTextHash: OFFICIAL_MEDIC_MEDPACK_SOURCE_TEXT_HASH_V1,
    authorityLineageHash: context.authorityLineage.lineageHash,
    medpackPlanHash: context.plan.medpackPlanHash,
    withinReceiptHash: context.within.withinReceiptHash,
    lineOfSightReceiptHash: context.lineOfSightReceipt.lineOfSightReceiptHash,
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
    heal: clone(heal),
    abilityUseHash: historyEntry.abilityUseHash,
    trainingTruth: false,
  };
  const holdEvent = { type: "hold", pieceId: piece.id, phase: "movement" };
  const events = actionInput.abilityWindow === "before_action"
    ? [abilityEvent, holdEvent]
    : [holdEvent, abilityEvent];
  if (protectedSupply !== hashStarcraftTmgContract({
    officialRoundSupplyState: state.officialRoundSupplyState,
    supplyLossLedger: state.supplyLossLedger,
  })) {
    fail("MEDPACK_V2_SUPPLY_PROTECTED_WRITE_VIOLATION");
  }
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round),
    phase: "movement",
    action: clone(expectedAction),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_medic_medpack_active_transition_v2",
    executorId: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    healResolution: heal,
    rulesTruth: "official_current_medic_medpack_v2_exact_subset",
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
