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
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING,
} from "./official-marine-multi-model-close-combat-denominator-v1.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE,
} from "./official-marine-stimpack-active-executor-v1.mjs";
import { OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_ACTION_ATOM_IDS } from
  "./official-marine-stimpack-active-executor-v2.mjs";
import {
  createOfficialMarineStimpackKernelV1,
  OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MARINE_STIMPACK_SOURCE_V1,
} from "./official-marine-stimpack-kernel-v1.mjs";

export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID =
  "authority.marine-multi-model-stimpack-active-v3";
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_VERSION =
  "3.0.0";
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_NEW_ATOM_IDS =
  Object.freeze([]);
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_ACTION_ATOM_IDS =
  Object.freeze([
    ...new Set([
      ...OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_ATOM_IDS,
      ...OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_ACTION_ATOM_IDS,
    ]),
  ].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ATOM_IDS =
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_ACTION_ATOM_IDS;

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
const ABILITY_WINDOWS = Object.freeze(["after_action", "before_action"]);
const SUPPORTED_SOURCE_LOADOUTS = Object.freeze([
  Object.freeze(["Stimpack"]),
  Object.freeze(["Bayonet", "Stimpack"]),
]);
const MODEL_WEAPON_OVERRIDE_FIELDS = Object.freeze([
  "closeCombatWeaponName",
  "closeCombatWeaponNames",
  "combatWeaponName",
  "combatWeaponNames",
]);
const PIECE_WEAPON_OVERRIDE_FIELDS = Object.freeze([
  "closeCombatWeaponAssignments",
  "combatWeaponAssignments",
]);
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

function milli(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) fail(code);
  const result = Math.round(parsed * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function uniqueSortedStrings(values, code) {
  if (!Array.isArray(values)) fail(code);
  const result = values.map((value) => String(value || "").trim());
  if (result.some((value) => !value) || new Set(result).size !== result.length) fail(code);
  return result.sort((left, right) => left.localeCompare(right));
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}

function supplyAt(count) {
  if (count <= 0 || count > 9 || !Number.isSafeInteger(count)) {
    fail("MARINE_MULTI_MODEL_STIMPACK_MODEL_COUNT_INVALID");
  }
  if (count <= 3) return 0;
  if (count <= 6) return 1;
  return 2;
}

function verifyBindings(state, matchBinding) {
  if (!object(state)
    || !object(state.players)
    || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("MARINE_MULTI_MODEL_STIMPACK_STATE_INVALID");
  }
  const gameplay = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplay);
  verifyOfficialCleanupCardBundleV1(gameplay.cleanupCardBundle);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplay) !== matchBinding.dataSnapshotHash
    || gameplay.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || gameplay.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplay.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || gameplay.repositoryFallbackAllowed !== false
    || !isDeepStrictEqual(
      gameplay.dataVersions,
      OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.dataVersions,
    )) {
    fail("MARINE_MULTI_MODEL_STIMPACK_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const marine = getOfficialCombatProfileV1(
    gameplay.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  if (marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || marine.unitName !== "Marine"
    || marine.hitPoints !== 2
    || !isDeepStrictEqual(marine.squadProfile, [
      { tier: 1, minimumModels: 1, maximumModels: 3, supply: 0 },
      { tier: 2, minimumModels: 4, maximumModels: 6, supply: 1 },
      { tier: 3, minimumModels: 7, maximumModels: 9, supply: 2 },
    ])) {
    fail("MARINE_MULTI_MODEL_STIMPACK_PROFILE_DRIFT");
  }
  const resourceProfile = gameplay.cleanupCardBundle.profiles.find((profile) => (
    profile.recordKey === RESOURCE_RECORD_KEY
  ));
  if (!resourceProfile
    || resourceProfile.sourceRecordHash !== RESOURCE_SOURCE_RECORD_HASH
    || resourceProfile.cardKind !== "faction"
    || resourceProfile.resource !== 1) {
    fail("MARINE_MULTI_MODEL_STIMPACK_RESOURCE_PROFILE_DRIFT");
  }
  return { gameplay, marine, resourceProfile };
}

function modelLedger(piece, sideKey, role, { source = false } = {}) {
  if (!object(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.officialPayloadHash !== MARINE_PAYLOAD_HASH
    || ![6, 9].includes(Number(piece.maxModels))
    || !Number.isSafeInteger(Number(piece.currentModels))
    || Number(piece.currentModels) < 1
    || Number(piece.currentModels) > Number(piece.maxModels)
    || Number(piece.currentSupply) !== supplyAt(Number(piece.currentModels))
    || piece.isOnField !== true
    || piece.isDestroyed === true
    || piece.isInReserves === true
    || piece.combatTag !== "ground"
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || !Array.isArray(piece.models)
    || piece.models.length !== Number(piece.maxModels)
    || !isDeepStrictEqual(piece.statuses || [], [])
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || Number(piece.damageMarker || 0) !== 0
    || piece.specialistLoadout !== undefined
    || piece.specialistLoadoutHash !== undefined
    || PIECE_WEAPON_OVERRIDE_FIELDS.some((field) => piece[field] !== undefined)
    || piece.models.some((model) => (
      MODEL_WEAPON_OVERRIDE_FIELDS.some((field) => model?.[field] !== undefined)
    ))) {
    fail("MARINE_MULTI_MODEL_STIMPACK_UNIT_SCOPE_UNSUPPORTED", role);
  }
  const selectedUpgradeNames = uniqueSortedStrings(
    piece.selectedUpgradeNames || [],
    "MARINE_MULTI_MODEL_STIMPACK_SELECTED_UPGRADES_INVALID",
  );
  if (source) {
    if (!SUPPORTED_SOURCE_LOADOUTS.some((loadout) => (
      isDeepStrictEqual(loadout, selectedUpgradeNames)
    ))) {
      fail("MARINE_MULTI_MODEL_STIMPACK_SOURCE_LOADOUT_UNSUPPORTED");
    }
  } else if (!isDeepStrictEqual(selectedUpgradeNames, [])) {
    fail("MARINE_MULTI_MODEL_STIMPACK_OPPONENT_LOADOUT_UNSUPPORTED");
  }
  const rosterModelIds = uniqueSortedStrings(
    piece.models.map((model) => model?.id),
    "MARINE_MULTI_MODEL_STIMPACK_MODEL_LEDGER_INVALID",
  );
  const activeModelIds = uniqueSortedStrings(
    activeModels(piece).map((model) => model.id),
    "MARINE_MULTI_MODEL_STIMPACK_ACTIVE_LEDGER_INVALID",
  );
  const destroyedModelIds = uniqueSortedStrings(
    piece.destroyedModelIds || [],
    "MARINE_MULTI_MODEL_STIMPACK_DESTROYED_LEDGER_INVALID",
  );
  const derivedDestroyedModelIds = piece.models.filter((model) => (
    model?.isDestroyed === true && model?.isOnField === false
  )).map((model) => model.id).sort((left, right) => left.localeCompare(right));
  if (activeModelIds.length !== Number(piece.currentModels)
    || destroyedModelIds.length !== Number(piece.maxModels) - Number(piece.currentModels)
    || !isDeepStrictEqual(destroyedModelIds, derivedDestroyedModelIds)
    || piece.models.some((model) => {
      const active = activeModelIds.includes(model.id);
      const destroyed = destroyedModelIds.includes(model.id);
      return active === destroyed
        || model.baseShape !== "round"
        || milli(model.baseWidthInches, "MARINE_MULTI_MODEL_STIMPACK_BASE_INVALID")
          !== MARINE_BASE_MILLI_INCHES
        || milli(model.baseDepthInches, "MARINE_MULTI_MODEL_STIMPACK_BASE_INVALID")
          !== MARINE_BASE_MILLI_INCHES
        || model.elevation !== "ground"
        || !isDeepStrictEqual(model.supportTerrainIds || [], [])
        || !isDeepStrictEqual(model.adjacentAccessPointIds || [], []);
    })) {
    fail("MARINE_MULTI_MODEL_STIMPACK_MODEL_LEDGER_INVALID", role);
  }
  for (const model of activeModels(piece)) {
    milli(model.xInches, "MARINE_MULTI_MODEL_STIMPACK_GEOMETRY_INVALID");
    milli(model.yInches, "MARINE_MULTI_MODEL_STIMPACK_GEOMETRY_INVALID");
  }
  const body = {
    schema: "starcraft_tmg_official_marine_model_ledger_v1",
    pieceId: piece.id,
    maxModels: Number(piece.maxModels),
    currentModels: Number(piece.currentModels),
    currentSupply: Number(piece.currentSupply),
    rosterModelIds,
    activeModelIds,
    destroyedModelIds,
  };
  return {
    selectedUpgradeNames,
    ledger: { ...body, modelLedgerHash: hashStarcraftTmgContract(body) },
  };
}

function paymentCard(state, sideKey, resourceProfile) {
  if (state.players?.[sideKey]?.faction !== "Terran"
    || !Array.isArray(state.cardResources?.[sideKey])) {
    fail("MARINE_MULTI_MODEL_STIMPACK_RESOURCE_STATE_INVALID");
  }
  const cards = state.cardResources[sideKey].filter((row) => (
    row?.officialCardRecordKey === RESOURCE_RECORD_KEY
  ));
  if (cards.length !== 1) {
    fail("MARINE_MULTI_MODEL_STIMPACK_EXACT_RESOURCE_CARD_REQUIRED");
  }
  const card = cards[0];
  if (!object(card)
    || card.sideKey !== sideKey
    || card.cardKind !== "faction"
    || card.sourceRecordHash !== resourceProfile.sourceRecordHash
    || Number(card.resource) !== 1
    || card.resourceType !== "CP"
    || card.readiness !== "ready"
    || card.face !== "up") {
    fail("MARINE_MULTI_MODEL_STIMPACK_FULL_COST_UNAVAILABLE");
  }
  return card;
}

function usedThisRound(state, pieceId) {
  const history = state.activeAbilityUseHistory || [];
  if (!Array.isArray(history)) fail("MARINE_MULTI_MODEL_STIMPACK_HISTORY_INVALID");
  return history.some((entry) => (
    entry?.pieceId === pieceId
      && entry?.abilityId === OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityId
      && Number(entry?.round) === Number(state.round)
  ));
}

function contextFor(state, sideKey, piece, window, bindings) {
  if (state.phase !== "movement") fail("MARINE_MULTI_MODEL_STIMPACK_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("MARINE_MULTI_MODEL_STIMPACK_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.movement === true) {
    fail("MARINE_MULTI_MODEL_STIMPACK_SIDE_PASSED");
  }
  if (!ABILITY_WINDOWS.includes(window)) {
    fail("MARINE_MULTI_MODEL_STIMPACK_ACTION_WINDOW_INVALID");
  }
  if (!piece || piece.activatedPhases?.movement === true) {
    fail("MARINE_MULTI_MODEL_STIMPACK_SOURCE_UNAVAILABLE");
  }
  if (state.pendingAction !== undefined && state.pendingAction !== null) {
    fail("MARINE_MULTI_MODEL_STIMPACK_MID_ACTION_PROHIBITED");
  }
  if ((state.board.terrain || []).length !== 0
    || (state.board.accessPoints || []).length !== 0
    || (state.board.effectMarkers || []).length !== 0
    || state.pieces.length !== 2) {
    fail("MARINE_MULTI_MODEL_STIMPACK_BOARD_SCOPE_UNSUPPORTED");
  }
  if (usedThisRound(state, piece.id)) {
    fail("MARINE_MULTI_MODEL_STIMPACK_ALREADY_USED_THIS_ROUND");
  }
  const source = modelLedger(piece, sideKey, "source", { source: true });
  const otherSideKey = sideKey === "player1" ? "player2" : "player1";
  const opponentPiece = state.pieces.find((entry) => entry.id !== piece.id);
  modelLedger(opponentPiece, otherSideKey, "opponent");
  const card = paymentCard(state, sideKey, bindings.resourceProfile);
  const bayonetSelected = source.selectedUpgradeNames.includes("Bayonet");
  const loadoutBody = {
    schema: "starcraft_tmg_official_marine_unit_wide_close_combat_loadout_v1",
    pieceId: piece.id,
    selectedUpgradeNames: [...source.selectedUpgradeNames],
    weaponName: bayonetSelected ? "Bayonet" : "Strike",
    replacedWeaponName: bayonetSelected ? "Strike" : null,
    appliesToRosterModelIds: [...source.ledger.rosterModelIds],
    activeCarrierModelIds: [...source.ledger.activeModelIds],
    perModelCarrierSelectionAllowed: false,
    specialistSemanticsAppliedToBayonet: false,
    part9DocumentHash:
      OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part9DocumentHash,
  };
  const unitWideLoadout = {
    ...loadoutBody,
    unitWideLoadoutHash: hashStarcraftTmgContract(loadoutBody),
  };
  const planBody = {
    schema: "starcraft_tmg_official_marine_multi_model_stimpack_active_plan_v3",
    round: Number(state.round),
    phase: "movement",
    sideKey,
    pieceId: piece.id,
    anchorModelId: source.ledger.activeModelIds[0],
    modelLedger: source.ledger,
    unitWideLoadout,
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
    speedValueConsumerExecutable: true,
    rangedPrecisionConsumerExecutable: true,
    closeCombatPrecisionConsumerExecutable: true,
    multiModelCloseCombatConsumerExecutable: true,
    trainingTruth: false,
  };
  return {
    card,
    source,
    unitWideLoadout,
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
    selectedUpgradeNames: [...context.source.selectedUpgradeNames],
    combatWeaponLoadoutHash: context.unitWideLoadout.unitWideLoadoutHash,
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
    ruleAtomIds: [...OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialMarineMultiModelStimpackActiveV3(
  state,
  options = {},
) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  if (!["player1", "player2"].includes(sideKey)) {
    fail("MARINE_MULTI_MODEL_STIMPACK_SIDE_REQUIRED");
  }
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
          score: context.source.selectedUpgradeNames.includes("Bayonet") ? 190 : 185,
          details: {
            modelLedgerHash: context.source.ledger.modelLedgerHash,
            maxModels: context.source.ledger.maxModels,
            currentModels: context.source.ledger.currentModels,
            currentSupply: context.source.ledger.currentSupply,
            selectedUpgradeNames: [...context.source.selectedUpgradeNames],
            weaponName: context.unitWideLoadout.weaponName,
            replacedWeaponName: context.unitWideLoadout.replacedWeaponName,
            unitWideLoadoutHash: context.unitWideLoadout.unitWideLoadoutHash,
            closeCombatPrecisionConsumerExecutable: true,
            multiModelCloseCombatConsumerExecutable: true,
            rulesTruth:
              "official_current_marine_multi_model_stimpack_active_exact_subset",
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

export function applyOfficialMarineMultiModelStimpackActiveV3(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_VERSION) {
    fail("MARINE_MULTI_MODEL_STIMPACK_ACTION_INVALID");
  }
  const expected = enumerateOfficialMarineMultiModelStimpackActiveV3(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  }).map(actionFromCandidate).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("MARINE_MULTI_MODEL_STIMPACK_ACTION_STALE");
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
    targetModelId: context.plan.anchorModelId,
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
    modelLedgerHash: context.source.ledger.modelLedgerHash,
    unitWideLoadoutHash: context.unitWideLoadout.unitWideLoadoutHash,
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
    subtype: "marine_multi_model_stimpack",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: piece.id,
    abilityId: OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityId,
    abilityName: OFFICIAL_MARINE_STIMPACK_SOURCE_V1.abilityName,
    abilityWindow: actionInput.abilityWindow,
    underlyingAction: "hold",
    abilitySourceTextHash: OFFICIAL_MARINE_STIMPACK_SOURCE_TEXT_HASH_V1,
    stimpackPlanHash: context.plan.stimpackPlanHash,
    modelLedgerHash: context.source.ledger.modelLedgerHash,
    unitWideLoadoutHash: context.unitWideLoadout.unitWideLoadoutHash,
    selectedUpgradeNames: [...context.source.selectedUpgradeNames],
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
    speedValueConsumerExecutable: true,
    rangedPrecisionConsumerExecutable: true,
    closeCombatPrecisionConsumerExecutable: true,
    multiModelCloseCombatConsumerExecutable: true,
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
    schemaVersion:
      "starcraft_tmg_official_marine_multi_model_stimpack_active_transition_v3",
    executorId: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    modelLedger: clone(context.source.ledger),
    unitWideLoadout: clone(context.unitWideLoadout),
    nonLethalDamageResolution: nonLethal,
    stimpackStatus: statusPair.status,
    stimpackMarker: statusPair.marker,
    rulesTruth:
      "official_current_marine_multi_model_stimpack_active_exact_subset",
    trainingTruth: false,
  };
}
