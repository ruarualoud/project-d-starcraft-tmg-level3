import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialCleanupCardBundleV1 } from
  "../source-data/official-cleanup-card-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  createOfficialMarineStimpackKernelV1,
  OFFICIAL_MARINE_STIMPACK_KERNEL_NEW_ATOM_IDS,
  OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MARINE_STIMPACK_SOURCE_V1,
} from "./official-marine-stimpack-kernel-v1.mjs";
import { OFFICIAL_MOVEMENT_HOLD_ATOM_IDS } from
  "./official-movement-hold-executor-v1.mjs";

export const OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID =
  "authority.marine-stimpack-active-v1";
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE = "use_ability";

export const OFFICIAL_MARINE_STIMPACK_ACTIVE_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:active-ability-default-end-round-expiry",
  ...OFFICIAL_MARINE_STIMPACK_KERNEL_NEW_ATOM_IDS,
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_MARINE_STIMPACK_ACTIVE_DEPENDENCY_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MOVEMENT_HOLD_ATOM_IDS,
    "rule-atom:active-ability-action-window",
    "rule-atom:active-ability-activation-and-window",
    "rule-atom:active-ability-reserve-prohibition",
    "rule-atom:exhausted-card-lockout-until-refresh",
    "rule-atom:faction-card-resource-field",
    "rule-atom:named-active-ability-per-unit-round-limit",
    "rule-atom:named-active-frequency-with-repeatable-exception",
    "rule-atom:singleton:core-10-1-cost-and-instruction-fields:fdc72da56183",
    "rule-atom:singleton:core-10-1-cost-and-on-battlefield-requirement:62c536600f95",
    "rule-atom:singleton:core-10-1-special-ability-universal-structure:5a816d600530",
    "rule-atom:singleton:core-10-2-active-ability-definition:f2579f39a272",
    "rule-atom:singleton:core-10-2-active-requires-activation:dbe149746c16",
    "rule-atom:singleton:core-10-2-during-action-prohibition:01b69cee5275",
    "rule-atom:singleton:core-10-5-1-exhausted-card-state:9dbfd7af218d",
    "rule-atom:singleton:core-10-5-1-faction-resource-map:a6cb07022a95",
    "rule-atom:singleton:core-10-5-1-full-cost-or-no-activation:b61d22c0bde3",
    "rule-atom:singleton:core-10-5-1-matching-resource-exhaustion:25253ce10d5c",
    "rule-atom:singleton:core-10-5-1-resources-from-exhaustion:e5bb4b1fa3be",
    "rule-atom:singleton:core-11-status-definition:78de5e813bfb",
    "rule-atom:singleton:core-11-status-effect-markers:cd44cf1e9d23",
    "rule-atom:singleton:core-2-7-1-active-no-mid-action:8b277fd58970",
    "rule-atom:singleton:core-7-3-2-buff-debuff-marker:42d5602d6e12",
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_MARINE_STIMPACK_ACTIVE_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_MARINE_STIMPACK_ACTIVE_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ATOM_IDS =
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS;

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b";
const MARINE_RECORD_KEY = "army_units:marine";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const RESOURCE_RECORD_KEY = "tactical_cards:terran_armed_forces";
const RESOURCE_SOURCE_RECORD_HASH =
  "44aa8b4d52a065dbbc5e93a9bfc203957647393efe4c123e1a0b2b909dbf63c5";
const MARINE_BASE_MILLI_INCHES = 1260;
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const ABILITY_WINDOWS = Object.freeze(["after_action", "before_action"]);
const KERNEL = createOfficialMarineStimpackKernelV1();

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

function milli(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) fail(code);
  const result = Math.round(parsed * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function verifyBindings(state, matchBinding) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("STIMPACK_STATE_INVALID");
  }
  const gameplayBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayBundle);
  verifyOfficialCleanupCardBundleV1(gameplayBundle.cleanupCardBundle);
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
    || gameplayBundle.repositoryFallbackAllowed !== false) {
    fail("STIMPACK_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const marine = getOfficialCombatProfileV1(
    gameplayBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  if (marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || marine.unitName !== "Marine"
    || marine.hitPoints !== 2
    || marine.armourThreshold !== 5
    || marine.evadeThreshold !== 5
    || marine.shield !== 0
    || !isDeepStrictEqual(marine.combatTags, ["biological", "ground", "light"])) {
    fail("STIMPACK_MARINE_PROFILE_DRIFT");
  }
  const resourceProfile = gameplayBundle.cleanupCardBundle.profiles.find((profile) => (
    profile.recordKey === RESOURCE_RECORD_KEY
  ));
  if (!resourceProfile
    || resourceProfile.sourceRecordHash !== RESOURCE_SOURCE_RECORD_HASH
    || resourceProfile.cardKind !== "faction"
    || resourceProfile.resource !== 1) {
    fail("STIMPACK_RESOURCE_PROFILE_DRIFT");
  }
  return { gameplayBundle, marine, resourceProfile };
}

function exactMarine(piece, sideKey, role, selectedUpgrades) {
  const models = activeModels(piece);
  if (!activePiece(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.officialPayloadHash !== MARINE_PAYLOAD_HASH
    || Number(piece.currentModels) !== 1
    || Number(piece.maxModels) !== 1
    || Number(piece.currentSupply) !== 0
    || models.length !== 1
    || !isDeepStrictEqual(piece.destroyedModelIds || [], [])
    || piece.combatTag !== "ground"
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || !isDeepStrictEqual(piece.selectedUpgradeNames || [], selectedUpgrades)
    || !isDeepStrictEqual(piece.statuses || [], [])
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || Number(piece.damageMarker || 0) !== 0
    || models[0].baseShape !== "round"
    || milli(models[0].baseWidthInches, "STIMPACK_BASE_SCOPE_UNSUPPORTED")
      !== MARINE_BASE_MILLI_INCHES
    || milli(models[0].baseDepthInches, "STIMPACK_BASE_SCOPE_UNSUPPORTED")
      !== MARINE_BASE_MILLI_INCHES
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds || [], [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds || [], [])) {
    fail("STIMPACK_MARINE_SCOPE_UNSUPPORTED", role);
  }
  milli(models[0].xInches, "STIMPACK_MODEL_GEOMETRY_INVALID");
  milli(models[0].yInches, "STIMPACK_MODEL_GEOMETRY_INVALID");
  return models[0];
}

function paymentCard(state, sideKey, resourceProfile) {
  if (state.players?.[sideKey]?.faction !== "Terran"
    || !Array.isArray(state.cardResources?.[sideKey])) {
    fail("STIMPACK_RESOURCE_STATE_INVALID");
  }
  const cards = state.cardResources[sideKey].filter((row) => (
    row?.officialCardRecordKey === RESOURCE_RECORD_KEY
  ));
  if (cards.length !== 1) fail("STIMPACK_EXACT_RESOURCE_CARD_REQUIRED");
  const card = cards[0];
  if (!object(card)
    || card.sideKey !== sideKey
    || card.cardKind !== "faction"
    || card.sourceRecordHash !== resourceProfile.sourceRecordHash
    || Number(card.resource) !== 1
    || card.resourceType !== "CP") {
    fail("STIMPACK_MATCHING_RESOURCE_REQUIRED");
  }
  if (card.readiness !== "ready" || card.face !== "up") {
    fail("STIMPACK_FULL_COST_UNAVAILABLE");
  }
  return card;
}

function usedThisRound(state, pieceId) {
  const history = state.activeAbilityUseHistory || [];
  if (!Array.isArray(history)) fail("STIMPACK_ABILITY_HISTORY_INVALID");
  return history.some((entry) => (
    entry?.pieceId === pieceId
      && entry?.abilityId === OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityId
      && Number(entry?.round) === Number(state.round)
  ));
}

function contextFor(state, sideKey, piece, window, bindings) {
  if (state.phase !== "movement") fail("STIMPACK_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("STIMPACK_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.movement === true) {
    fail("STIMPACK_SIDE_PASSED");
  }
  if (!ABILITY_WINDOWS.includes(window)) fail("STIMPACK_ACTION_WINDOW_INVALID");
  if (!activePiece(piece) || piece.sideKey !== sideKey) {
    fail("STIMPACK_SOURCE_UNAVAILABLE");
  }
  if (piece.activatedPhases?.movement === true) fail("STIMPACK_ALREADY_ACTIVATED");
  if (piece.isInReserves === true || piece.isOnField !== true) {
    fail("STIMPACK_RESERVE_PROHIBITED");
  }
  if (state.pendingAction !== undefined && state.pendingAction !== null) {
    fail("STIMPACK_MID_ACTION_PROHIBITED");
  }
  if ((state.board.terrain || []).length !== 0
    || (state.board.accessPoints || []).length !== 0
    || (state.board.effectMarkers || []).length !== 0) {
    fail("STIMPACK_BOARD_SCOPE_UNSUPPORTED");
  }
  if (state.pieces.length !== 2
    || state.pieces.some((entry) => entry.officialUnitRecordKey !== MARINE_RECORD_KEY)) {
    fail("STIMPACK_UNHANDLED_REACTION_CARRIER_SCOPE");
  }
  if (usedThisRound(state, piece.id)) {
    fail("STIMPACK_NAMED_ABILITY_ALREADY_USED_THIS_ROUND");
  }
  const model = exactMarine(piece, sideKey, "source", ["Stimpack"]);
  const other = state.pieces.find((entry) => entry.id !== piece.id);
  const otherSideKey = sideKey === "player1" ? "player2" : "player1";
  exactMarine(other, otherSideKey, "opponent", []);
  const card = paymentCard(state, sideKey, bindings.resourceProfile);
  const planBody = {
    schema: "starcraft_tmg_official_marine_stimpack_plan_v1",
    round: Number(state.round),
    phase: "movement",
    sideKey,
    pieceId: piece.id,
    modelId: model.id,
    cardResourceId: card.id,
    abilityWindow: window,
    abilitySourceTextHash: OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
    priorDamageMarker: 0,
    nonLethalDamage: 2,
    speedBuff: 3,
    precision: 3,
    resourceType: "CP",
    resourceCost: 1,
    underlyingAction: "hold",
    speedValueConsumerExecutable: false,
    rangedPrecisionConsumerExecutable: true,
    closeCombatPrecisionConsumerExecutable: false,
    trainingTruth: false,
  };
  return {
    model,
    card,
    plan: {
      ...planBody,
      stimpackPlanHash: hashStarcraftTmgContract(planBody),
    },
  };
}

function canonicalAction(sideKey, piece, context) {
  return {
    actionType: OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE,
    sideKey,
    phase: "movement",
    pieceId: piece.id,
    targetId: piece.id,
    cardResourceId: context.card.id,
    abilityId: OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityId,
    abilityName: OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityName,
    abilityWindow: context.plan.abilityWindow,
    resourceType: "CP",
    resourceCost: 1,
    nonLethalDamage: 2,
    speedBuff: 3,
    precision: 3,
    abilityPlanHash: context.plan.stimpackPlanHash,
    ruleAtomIds: [...OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialMarineStimpackActiveV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("STIMPACK_SIDE_REQUIRED");
  let bindings;
  try {
    bindings = verifyBindings(state, options.matchBinding);
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
  const rows = [];
  const diagnostics = [];
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey
      && entry.officialUnitRecordKey === MARINE_RECORD_KEY
      && (entry.selectedUpgradeNames || []).includes("Stimpack")
  ))) {
    for (const window of ABILITY_WINDOWS) {
      try {
        const context = contextFor(state, sideKey, piece, window, bindings);
        rows.push({
          ...canonicalAction(sideKey, piece, context),
          isEnabled: true,
          disabledReason: "",
          score: 170,
          details: {
            sourceRule: "official_current_marine_stimpack_and_core_active_buff_non_lethal_precision",
            stimpackSourceTextHash: OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
            stimpackKernelHash: KERNEL.descriptor.kernelHash,
            speedValueConsumerExecutable: false,
            rangedPrecisionConsumerExecutable: true,
            closeCombatPrecisionConsumerExecutable: false,
            rulesTruth: "official_current_marine_stimpack_active_exact_subset",
            trainingTruth: false,
          },
        });
      } catch (error) {
        diagnostics.push(error);
      }
    }
  }
  if (rows.length === 0 && options.throwOnError === true && diagnostics.length > 0) {
    throw diagnostics[0];
  }
  return rows.sort((left, right) => left.abilityWindow.localeCompare(right.abilityWindow));
}

export function applyOfficialMarineStimpackActiveV1(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_VERSION) {
    fail("STIMPACK_ACTION_INVALID");
  }
  const expected = enumerateOfficialMarineStimpackActiveV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  }).map(actionFromCandidate).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("STIMPACK_ACTION_STALE");
  const bindings = verifyBindings(stateInput, options.matchBinding);
  const pieceBefore = stateInput.pieces.find((piece) => piece.id === actionInput.pieceId);
  const context = contextFor(
    stateInput,
    actionInput.sideKey,
    pieceBefore,
    actionInput.abilityWindow,
    bindings,
  );
  const nonLethal = KERNEL.resolveNonLethalDamage({
    targetPieceId: pieceBefore.id,
    targetModelId: context.model.id,
    abilityResolutionHash: context.plan.stimpackPlanHash,
    priorDamageMarker: context.plan.priorDamageMarker,
    amount: context.plan.nonLethalDamage,
    targetHitPoints: bindings.marine.hitPoints,
  });
  const statusPair = KERNEL.createStatus({
    round: Number(stateInput.round),
    sourceSideKey: actionInput.sideKey,
    sourcePieceId: pieceBefore.id,
    abilityResolutionHash: context.plan.stimpackPlanHash,
  });
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const card = state.cardResources[actionInput.sideKey].find((entry) => (
    entry.id === actionInput.cardResourceId
  ));
  card.readiness = "exhausted";
  card.face = "down";
  piece.damageMarker = nonLethal.postDamageMarker;
  piece.statuses = [clone(statusPair.status)];
  state.board.effectMarkers = [clone(statusPair.marker)];
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
    targetId: piece.id,
    abilityId: OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityId,
    abilityName: OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityName,
    abilityWindow: actionInput.abilityWindow,
    cardResourceId: card.id,
    stimpackPlanHash: context.plan.stimpackPlanHash,
    nonLethalResolutionHash: nonLethal.nonLethalResolutionHash,
    statusEffectHash: statusPair.status.statusEffectHash,
    markerHash: statusPair.marker.markerHash,
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
    type: OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE,
    subtype: "marine_stimpack",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: piece.id,
    abilityId: OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityId,
    abilityName: OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityName,
    abilityWindow: actionInput.abilityWindow,
    underlyingAction: "hold",
    abilitySourceTextHash: OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
    stimpackPlanHash: context.plan.stimpackPlanHash,
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
    nonLethalDamage: clone(nonLethal),
    status: clone(statusPair.status),
    marker: clone(statusPair.marker),
    speedValueConsumerExecutable: false,
    rangedPrecisionConsumerExecutable: true,
    closeCombatPrecisionConsumerExecutable: false,
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
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_marine_stimpack_active_transition_v1",
    executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    nonLethalDamageResolution: nonLethal,
    stimpackStatus: statusPair.status,
    stimpackMarker: statusPair.marker,
    rulesTruth: "official_current_marine_stimpack_active_exact_subset",
    trainingTruth: false,
  };
}
