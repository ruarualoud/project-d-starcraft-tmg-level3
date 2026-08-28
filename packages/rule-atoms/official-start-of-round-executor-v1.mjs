import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialMissionSetupBindingV1 } from "../source-data/official-mission-setup-binding-v1.mjs";

export const OFFICIAL_START_OF_ROUND_ACTION_TYPE = "resolve_start_of_round";
export const OFFICIAL_START_OF_ROUND_EXECUTOR_ID = "authority.start-of-round-v1";
export const OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_START_OF_ROUND_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS = Object.freeze([
  "rule-atom:available-supply-formula",
  "rule-atom:available-supply-remaining-capacity-definition",
  "rule-atom:final-round-unlimited-supply",
  "rule-atom:on-table-supply-hard-cap",
  "rule-atom:reserve-unit-battlefield-supply-exclusion",
  "rule-atom:singleton:core-11-available-supply-casualty-final-round:77fc80354b5c",
  "rule-atom:singleton:core-11-ready-round-start:9498636dfb1d",
  "rule-atom:singleton:core-5-5-mission-supply-curve:b240218460d4",
  "rule-atom:singleton:core-8-3-1-later-round-escalation:48fc354d4152",
  "rule-atom:start-of-round-effect-resolution-order",
  "rule-atom:start-of-round-effect-window",
  "rule-atom:stationary-start-round-grant",
  "rule-atom:supply-pool-and-escalation-definition",
].sort((left, right) => left.localeCompare(right)));

const RESOLUTION_SCHEMA = "starcraft_tmg_official_start_of_round_resolution_v1";
const HISTORY_SCHEMA = "starcraft_tmg_official_start_of_round_history_entry_v1";
const ROUND_SUPPLY_SCHEMA = "starcraft_tmg_official_round_supply_state_v1";
const SUPPORTED_UNIT_RECORD_KEY = "army_units:marine";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

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
  if (!HASH_PATTERN.test(value)) fail("START_OF_ROUND_RUNTIME_BINDING_REQUIRED");
  return value;
}

function firstPlayerSideKey(state) {
  const sideKey = String(state?.firstPlayerSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey) || !object(state?.players?.[sideKey])) {
    fail("START_OF_ROUND_FIRST_PLAYER_REQUIRED");
  }
  return sideKey;
}

function exactCurrentSupply(profile, currentModels, pieceId) {
  if (!Number.isSafeInteger(currentModels) || currentModels < 1) {
    fail("START_OF_ROUND_UNIT_STATE_UNSUPPORTED", pieceId);
  }
  const tier = profile.squadProfile.find((row) => (
    row.minimumModels !== null
      && currentModels >= row.minimumModels
      && currentModels <= row.maximumModels
  ));
  if (!tier) fail("START_OF_ROUND_UNIT_STATE_UNSUPPORTED", pieceId);
  return tier.supply;
}

function cardRows(state, gameplayDataBundle) {
  const bundle = gameplayDataBundle.cleanupCardBundle;
  if (!object(bundle)
    || !Array.isArray(bundle.profiles)
    || !object(state.cardResources)
    || !SIDE_KEYS.every((sideKey) => Array.isArray(state.cardResources[sideKey]))) {
    fail("START_OF_ROUND_EFFECT_SCOPE_UNRESOLVED", "cards");
  }
  const profileByKey = new Map(bundle.profiles.map((profile) => [profile.recordKey, profile]));
  const ids = new Set();
  const rows = [];
  for (const sideKey of SIDE_KEYS) {
    const recordKeys = new Set();
    for (const card of state.cardResources[sideKey]) {
      const id = String(card?.id || "").trim();
      const profile = profileByKey.get(card?.officialCardRecordKey);
      const expectedFace = card?.readiness === "ready" ? "up"
        : card?.readiness === "exhausted" ? "down" : "";
      if (!object(card)
        || !id
        || ids.has(id)
        || !profile
        || recordKeys.has(profile.recordKey)
        || card.sideKey !== sideKey
        || card.cardKind !== profile.cardKind
        || card.sourceRecordHash !== profile.sourceRecordHash
        || card.face !== expectedFace
        || !Array.isArray(card.activeEffects)
        || card.activeEffects.length !== 0
        || (card.startOfRoundEffects !== undefined
          && (!Array.isArray(card.startOfRoundEffects)
            || card.startOfRoundEffects.length !== 0))) {
        fail("START_OF_ROUND_EFFECT_SCOPE_UNRESOLVED", id || sideKey);
      }
      ids.add(id);
      recordKeys.add(profile.recordKey);
      rows.push({
        cardId: id,
        sideKey,
        officialCardRecordKey: profile.recordKey,
        sourceRecordHash: profile.sourceRecordHash,
        beforeReadiness: card.readiness,
        beforeFace: card.face,
        afterReadiness: "ready",
        afterFace: "up",
      });
    }
  }
  return rows.sort((left, right) => left.cardId.localeCompare(right.cardId));
}

function unitRows(state, gameplayDataBundle, firstPlayer) {
  const profiles = gameplayDataBundle.combatProfileBundle?.profiles;
  const profile = profiles?.[0];
  if (!Array.isArray(profiles)
    || profiles.length !== 1
    || profile?.recordKey !== SUPPORTED_UNIT_RECORD_KEY) {
    fail("START_OF_ROUND_EFFECT_SCOPE_UNRESOLVED", "units");
  }
  const ids = new Set();
  const rows = [];
  for (const piece of state.pieces) {
    const id = String(piece?.id || "").trim();
    if (!object(piece)
      || !id
      || ids.has(id)
      || !SIDE_KEYS.includes(piece.sideKey)
      || piece.officialUnitRecordKey !== SUPPORTED_UNIT_RECORD_KEY
      || piece.sourceRecordHash !== profile.sourceRecordHash
      || typeof piece.isOnField !== "boolean"
      || typeof piece.isDestroyed !== "boolean"
      || !Array.isArray(piece.statuses)
      || piece.statuses.length !== 0
      || !Array.isArray(piece.selectedUpgradeNames)
      || piece.selectedUpgradeNames.length !== 0
      || (piece.startOfRoundEffects !== undefined
        && (!Array.isArray(piece.startOfRoundEffects)
          || piece.startOfRoundEffects.length !== 0))) {
      fail("START_OF_ROUND_EFFECT_SCOPE_UNRESOLVED", id || "unit");
    }
    ids.add(id);
    const currentModels = Number(piece.currentModels);
    const live = !piece.isDestroyed && currentModels > 0;
    if (!live) {
      if (!piece.isDestroyed || currentModels !== 0 || Number(piece.currentSupply) !== 0) {
        fail("START_OF_ROUND_UNIT_STATE_UNSUPPORTED", id);
      }
      rows.push({
        pieceId: id,
        sideKey: piece.sideKey,
        isOnField: piece.isOnField,
        isDestroyed: true,
        currentModels: 0,
        currentSupply: 0,
        gainsStationary: false,
      });
      continue;
    }
    const derivedSupply = exactCurrentSupply(profile, currentModels, id);
    if (Number(piece.currentSupply) !== derivedSupply) {
      fail("START_OF_ROUND_CURRENT_SUPPLY_MISMATCH", id);
    }
    rows.push({
      pieceId: id,
      sideKey: piece.sideKey,
      isOnField: piece.isOnField,
      isDestroyed: false,
      currentModels,
      currentSupply: derivedSupply,
      gainsStationary: true,
    });
  }
  if (rows.filter((row) => !row.isDestroyed).length === 0) {
    fail("START_OF_ROUND_EFFECT_SCOPE_UNRESOLVED", "units");
  }
  const sideOrder = [firstPlayer, SIDE_KEYS.find((sideKey) => sideKey !== firstPlayer)];
  return rows.sort((left, right) => {
    const side = sideOrder.indexOf(left.sideKey) - sideOrder.indexOf(right.sideKey);
    return side || left.pieceId.localeCompare(right.pieceId);
  });
}

function verifyRoundHandoff(state) {
  const last = Array.isArray(state.determineInitiativeHistory)
    ? state.determineInitiativeHistory.at(-1)
    : null;
  if (!object(last)
    || last.schema !== "starcraft_tmg_official_determine_initiative_history_entry_v1"
    || last.nextRound !== Number(state.round)
    || last.nextFirstPlayerSideKey !== state.firstPlayerSideKey
    || last.trainingTruth !== false) {
    fail("START_OF_ROUND_HANDOFF_INVALID");
  }
  const phaseKey = `${state.round}:movement`;
  if (state.phaseFirstActorByRound?.[phaseKey] !== undefined) {
    fail("START_OF_ROUND_MOVEMENT_INITIATIVE_ALREADY_RESOLVED");
  }
  return last;
}

function supplyState(state, context, units) {
  const mission = context.gameplayDataBundle.missionScoringProfile;
  const finalRound = context.round === mission.gameLengthRounds;
  const finitePool = finalRound
    ? null
    : mission.startingSupply + mission.extraSupplyPerRound * (context.round - 1);
  const onTableSupplyBySide = Object.fromEntries(SIDE_KEYS.map((sideKey) => [
    sideKey,
    units.filter((unit) => (
      unit.sideKey === sideKey && unit.isOnField && !unit.isDestroyed
    )).reduce((total, unit) => total + unit.currentSupply, 0),
  ]));
  const reserveSupplyBySide = Object.fromEntries(SIDE_KEYS.map((sideKey) => [
    sideKey,
    units.filter((unit) => (
      unit.sideKey === sideKey && !unit.isOnField && !unit.isDestroyed
    )).reduce((total, unit) => total + unit.currentSupply, 0),
  ]));
  if (!finalRound && SIDE_KEYS.some((sideKey) => onTableSupplyBySide[sideKey] > finitePool)) {
    fail("START_OF_ROUND_SUPPLY_CAP_EXCEEDED");
  }
  const availableSupplyBySide = finalRound
    ? { player1: null, player2: null }
    : Object.fromEntries(SIDE_KEYS.map((sideKey) => [
        sideKey,
        finitePool - onTableSupplyBySide[sideKey],
      ]));
  const body = {
    schema: ROUND_SUPPLY_SCHEMA,
    round: context.round,
    mode: finalRound ? "unlimited" : "finite",
    supplyPoolBySide: finalRound
      ? { player1: null, player2: null }
      : { player1: finitePool, player2: finitePool },
    onTableSupplyBySide,
    reserveSupplyBySide,
    availableSupplyBySide,
    reserveExcludedFromOnTableSupply: true,
    supplyCapVerified: true,
    gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
    missionScoringProfileHash: mission.missionScoringProfileHash,
    rulesRuntimeHash: context.boundRuntimeHash,
    rulesTruth: finalRound
      ? "official_final_round_unlimited_supply"
      : "official_mission_supply_escalation_and_available_supply",
    trainingTruth: false,
  };
  return { ...body, roundSupplyStateHash: hashStarcraftTmgContract(body) };
}

function startOfRoundResolution(state, context) {
  const units = unitRows(state, context.gameplayDataBundle, context.firstPlayer);
  const cards = cardRows(state, context.gameplayDataBundle);
  const roundSupplyState = supplyState(state, context, units);
  const opponent = SIDE_KEYS.find((sideKey) => sideKey !== context.firstPlayer);
  const effectQueue = [context.firstPlayer, opponent].flatMap((sideKey) => (
    units.filter((unit) => unit.sideKey === sideKey && unit.gainsStationary)
      .map((unit) => ({
        ownerSideKey: sideKey,
        effectType: "grant_stationary",
        targetPieceId: unit.pieceId,
        mandatory: true,
      }))
  ));
  const effectQueueBody = {
    round: context.round,
    firstPlayerSideKey: context.firstPlayer,
    playerOrder: [context.firstPlayer, opponent],
    effects: effectQueue,
    unsupportedOptionalEffectCount: 0,
    queueComplete: true,
    trainingTruth: false,
  };
  const effectQueueProofHash = hashStarcraftTmgContract(effectQueueBody);
  const body = {
    schema: RESOLUTION_SCHEMA,
    round: context.round,
    firstPlayerSideKey: context.firstPlayer,
    gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
    missionScoringProfileHash:
      context.gameplayDataBundle.missionScoringProfile.missionScoringProfileHash,
    initiativeResolutionHash: context.handoff.initiativeResolutionHash,
    roundSupplyState,
    effectQueue: effectQueueBody,
    effectQueueProofHash,
    stationaryPieceIds: effectQueue.map((effect) => effect.targetPieceId),
    readyCardTransitions: cards,
    nextPhase: "movement",
    nextActiveSideKey: context.firstPlayer,
    phaseFirstActorChoicePending: true,
    rulesTruth: "official_start_of_round_exact_hold_position_marine_card_subset",
    trainingTruth: false,
  };
  return { ...body, startOfRoundResolutionHash: hashStarcraftTmgContract(body) };
}

function validateState(state, options = {}) {
  if (!object(state)
    || !object(state.players)
    || !Array.isArray(state.pieces)
    || state.phase !== "start_of_round"
    || state.activeSideKey !== null) {
    fail(state?.phase === "start_of_round"
      ? "START_OF_ROUND_STATE_INVALID"
      : "START_OF_ROUND_WRONG_PHASE");
  }
  if (state.gameOver === true
    || state.terminal === true
    || String(state.winner || "")
    || String(state.terminalReason || "")) {
    fail("START_OF_ROUND_TERMINAL_STATE");
  }
  const round = Number(state.round);
  if (!Number.isSafeInteger(round) || round < 2 || round > 5) {
    fail("START_OF_ROUND_ROUND_UNSUPPORTED");
  }
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  verifyOfficialMissionSetupBindingV1(state.officialMissionSetupBinding, gameplayDataBundle);
  if (!object(options.matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== options.matchBinding.dataSnapshotHash) {
    fail("START_OF_ROUND_DATA_SNAPSHOT_MISMATCH");
  }
  const boundRuntimeHash = runtimeHash(options.matchBinding);
  const firstPlayer = firstPlayerSideKey(state);
  const handoff = verifyRoundHandoff(state);
  const context = { round, gameplayDataBundle, boundRuntimeHash, firstPlayer, handoff };
  return { ...context, resolution: startOfRoundResolution(state, context) };
}

function action(context) {
  return {
    actionType: OFFICIAL_START_OF_ROUND_ACTION_TYPE,
    sideKey: context.firstPlayer,
    phase: "start_of_round",
    startOfRoundResolutionHash: context.resolution.startOfRoundResolutionHash,
    startOfRoundResolution: clone(context.resolution),
    ruleAtomIds: [...OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION,
    details: {
      sourceRule: "official_core_5_5_6_2_8_3_1_8_4_and_glossary",
      supplyMode: context.resolution.roundSupplyState.mode,
      stationaryUnitCount: context.resolution.stationaryPieceIds.length,
      readyCardCount: context.resolution.readyCardTransitions.length,
      nextPhase: context.resolution.nextPhase,
      rulesTruth: context.resolution.rulesTruth,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, error) {
  return {
    actionType: OFFICIAL_START_OF_ROUND_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "start_of_round",
    startOfRoundResolutionHash: null,
    ruleAtomIds: [...OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_start_of_round_fail_closed",
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialStartOfRoundActionsV1(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  let context;
  try {
    context = validateState(state, options);
    if (sideKey !== context.firstPlayer) fail("START_OF_ROUND_FIRST_PLAYER_ONLY");
  } catch (error) {
    return options.includeDisabled === true ? [disabledAction(state, sideKey, error)] : [];
  }
  return [{ ...action(context), isEnabled: true, disabledReason: "", score: 100 }];
}

export function applyOfficialStartOfRoundV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_START_OF_ROUND_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_START_OF_ROUND_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION) {
    fail("START_OF_ROUND_ACTION_INVALID");
  }
  const context = validateState(stateInput, options);
  if (String(actionInput.sideKey || "") !== context.firstPlayer) {
    fail("START_OF_ROUND_FIRST_PLAYER_ONLY");
  }
  const described = action(context);
  const { details: _details, ...resolvedAction } = described;
  if (!isDeepStrictEqual(actionInput, resolvedAction)) {
    fail("START_OF_ROUND_RESOLUTION_STALE");
  }
  const state = clone(stateInput);
  for (const pieceId of context.resolution.stationaryPieceIds) {
    const piece = state.pieces.find((candidate) => candidate.id === pieceId);
    piece.statuses = ["stationary"];
  }
  for (const transition of context.resolution.readyCardTransitions) {
    const card = state.cardResources[transition.sideKey]
      .find((candidate) => candidate.id === transition.cardId);
    card.readiness = "ready";
    card.face = "up";
  }
  state.officialRoundSupplyState = clone(context.resolution.roundSupplyState);
  state.phase = "movement";
  state.activeSideKey = context.firstPlayer;
  const historyEntry = {
    schema: HISTORY_SCHEMA,
    round: context.round,
    firstPlayerSideKey: context.firstPlayer,
    startOfRoundResolutionHash: context.resolution.startOfRoundResolutionHash,
    effectQueueProofHash: context.resolution.effectQueueProofHash,
    roundSupplyStateHash: context.resolution.roundSupplyState.roundSupplyStateHash,
    stationaryPieceIds: clone(context.resolution.stationaryPieceIds),
    readyCardIds: context.resolution.readyCardTransitions.map((row) => row.cardId),
    nextPhase: state.phase,
    trainingTruth: false,
  };
  state.startOfRoundHistory = Array.isArray(state.startOfRoundHistory)
    ? state.startOfRoundHistory
    : [];
  state.startOfRoundHistory.push(historyEntry);
  const events = [{
    type: "start_of_round_resolved",
    round: context.round,
    initiatingSideKey: context.firstPlayer,
    startOfRoundResolutionHash: context.resolution.startOfRoundResolutionHash,
    effectQueueProofHash: context.resolution.effectQueueProofHash,
    roundSupplyStateHash: context.resolution.roundSupplyState.roundSupplyStateHash,
    supplyMode: context.resolution.roundSupplyState.mode,
    stationaryUnitCount: context.resolution.stationaryPieceIds.length,
    readyCardCount: context.resolution.readyCardTransitions.length,
    nextPhase: state.phase,
    nextActiveSideKey: state.activeSideKey,
    phaseFirstActorChoicePending: true,
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: context.round,
    phase: "start_of_round",
    action: clone(resolvedAction),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_start_of_round_transition_v1",
    executorId: OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: resolvedAction,
    startOfRoundResolution: context.resolution,
    rulesTruth: context.resolution.rulesTruth,
    trainingTruth: false,
  };
}
