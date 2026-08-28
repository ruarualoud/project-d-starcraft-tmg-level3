import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  applyOfficialStartOfRoundV4,
  enumerateOfficialStartOfRoundActionsV4,
  OFFICIAL_START_OF_ROUND_V4_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION,
  OFFICIAL_START_OF_ROUND_V4_TRANSITION_SCHEMA,
} from "./official-start-of-round-executor-v4.mjs";

export const OFFICIAL_START_OF_ROUND_V5_ACTION_TYPE =
  OFFICIAL_START_OF_ROUND_V4_ACTION_TYPE;
export const OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID =
  "authority.start-of-round-v5";
export const OFFICIAL_START_OF_ROUND_V5_EXECUTOR_VERSION = "5.0.0";
export const OFFICIAL_START_OF_ROUND_V5_TRANSITION_SCHEMA =
  OFFICIAL_START_OF_ROUND_V4_TRANSITION_SCHEMA;
export const OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ATOM_IDS =
  OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ATOM_IDS;
export const OFFICIAL_START_OF_ROUND_V5_RESOLUTION_SCHEMA =
  "starcraft_tmg_official_start_of_round_resolution_v4";
export const OFFICIAL_START_OF_ROUND_V5_HISTORY_SCHEMA =
  "starcraft_tmg_official_start_of_round_history_entry_v4";
export const OFFICIAL_SELECTED_UPGRADE_LOADOUT_BINDING_V2_SCHEMA =
  "starcraft_tmg_selected_upgrade_loadout_binding_v2";

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const CURRENT_DATASET_HASH =
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const MARINE_RECORD_KEY = "army_units:marine";
const MEDIC_RECORD_KEY = "army_units:medic";
const SIDE_KEYS = Object.freeze(["player1", "player2"]);

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

function executableAction(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function hashBound(value, hashKey) {
  const body = without(value, [hashKey]);
  return hashStarcraftTmgContract(body) === value[hashKey];
}

function profileSupply(profile, currentModels, pieceId) {
  if (!Number.isSafeInteger(currentModels) || currentModels < 1) {
    fail("START_OF_ROUND_V5_UNIT_STATE_UNSUPPORTED", pieceId);
  }
  const tier = profile.squadProfile.find((row) => (
    row.minimumModels !== null
      && currentModels >= row.minimumModels
      && currentModels <= row.maximumModels
  ));
  if (!tier) fail("START_OF_ROUND_V5_UNIT_STATE_UNSUPPORTED", pieceId);
  return tier.supply;
}

function currentContext(state, options) {
  const bundle = state?.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(bundle);
  if (bundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || bundle.repositoryFallbackAllowed !== false
    || !object(options.matchBinding)
    || hashStarcraftTmgContract(bundle) !== options.matchBinding.dataSnapshotHash) {
    fail("START_OF_ROUND_V5_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const profiles = bundle.combatProfileBundle?.profiles;
  if (!Array.isArray(profiles)
    || !isDeepStrictEqual(
      profiles.map((profile) => profile.recordKey).sort(),
      [MARINE_RECORD_KEY, MEDIC_RECORD_KEY],
    )) {
    fail("START_OF_ROUND_V5_UNIT_PROFILE_SCOPE_UNSUPPORTED");
  }
  const profileByKey = new Map(profiles.map((profile) => [profile.recordKey, profile]));
  const rows = [];
  let marineCount = 0;
  for (const piece of state.pieces || []) {
    const profile = profileByKey.get(piece?.officialUnitRecordKey);
    const names = piece?.selectedUpgradeNames;
    const live = piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
    if (!profile
      || !SIDE_KEYS.includes(piece?.sideKey)
      || piece.sourceRecordHash !== profile.sourceRecordHash
      || piece.officialPayloadHash !== profile.payloadHash
      || typeof piece.isOnField !== "boolean"
      || typeof piece.isDestroyed !== "boolean"
      || !Array.isArray(piece.statuses)
      || piece.statuses.length !== 0
      || !Array.isArray(names)
      || new Set(names).size !== names.length
      || names.some((name) => typeof name !== "string" || !name.trim())
      || (piece.startOfRoundEffects !== undefined
        && (!Array.isArray(piece.startOfRoundEffects)
          || piece.startOfRoundEffects.length !== 0))) {
      fail("START_OF_ROUND_V5_UNIT_STATE_UNSUPPORTED", String(piece?.id || "piece"));
    }
    if (piece.officialUnitRecordKey === MEDIC_RECORD_KEY) {
      if (!isDeepStrictEqual([...names].sort(), ["Medpack"])) {
        fail("START_OF_ROUND_V5_LOADOUT_SCOPE_INVALID", piece.id);
      }
    } else {
      marineCount += 1;
      if (names.length > 0 && !isDeepStrictEqual([...names].sort(), ["Stimpack"])) {
        fail("START_OF_ROUND_V5_LOADOUT_SCOPE_INVALID", piece.id);
      }
    }
    const currentModels = Number(piece.currentModels);
    const expectedSupply = live ? profileSupply(profile, currentModels, piece.id) : 0;
    if (Number(piece.currentSupply) !== expectedSupply
      || (!live && (!piece.isDestroyed || currentModels !== 0))) {
      fail("START_OF_ROUND_V5_CURRENT_SUPPLY_MISMATCH", piece.id);
    }
    rows.push({
      pieceId: String(piece.id || ""),
      officialUnitRecordKey: piece.officialUnitRecordKey,
      selectedUpgradeNames: [...names].sort(),
    });
  }
  if (marineCount < 1 || rows.some((row) => !row.pieceId)) {
    fail("START_OF_ROUND_V5_UNIT_PROFILE_SCOPE_UNSUPPORTED");
  }
  rows.sort((left, right) => left.pieceId.localeCompare(right.pieceId));
  return { bundle, profileByKey, loadouts: rows };
}

function filteredMarineCombatBundle(bundle) {
  const result = clone(bundle.combatProfileBundle);
  result.profiles = result.profiles.filter((profile) => (
    profile.recordKey === MARINE_RECORD_KEY
  ));
  result.profilesByRecordKey = Object.fromEntries(result.profiles.map((profile) => (
    [profile.recordKey, profile]
  )));
  result.bundleHash = hashStarcraftTmgContract(without(
    result,
    ["bundleHash", "profilesByRecordKey"],
  ));
  return result;
}

function semanticInput(state, matchBinding) {
  const semanticState = clone(state);
  semanticState.pieces = semanticState.pieces.filter((piece) => (
    piece.officialUnitRecordKey === MARINE_RECORD_KEY
  ));
  semanticState.officialGameplayDataBundle.combatProfileBundle =
    filteredMarineCombatBundle(state.officialGameplayDataBundle);
  semanticState.officialGameplayDataBundle.gameplayDataBundleHash =
    hashStarcraftTmgContract(without(
      semanticState.officialGameplayDataBundle,
      ["gameplayDataBundleHash"],
    ));
  const setup = semanticState.officialMissionSetupBinding;
  setup.gameplayDataBundleHash =
    semanticState.officialGameplayDataBundle.gameplayDataBundleHash;
  setup.missionSetupBindingHash = hashStarcraftTmgContract(without(
    setup,
    ["missionSetupBindingHash"],
  ));
  const semanticMatchBinding = clone(matchBinding);
  semanticMatchBinding.dataSnapshotHash = hashStarcraftTmgContract(
    semanticState.officialGameplayDataBundle,
  );
  return { semanticState, semanticMatchBinding };
}

function actualSupplyState(state, context, v4Resolution) {
  const mission = context.bundle.missionScoringProfile;
  const finalRound = Number(state.round) === mission.gameLengthRounds;
  const finitePool = finalRound
    ? null
    : mission.startingSupply + mission.extraSupplyPerRound * (Number(state.round) - 1);
  const onTableSupplyBySide = Object.fromEntries(SIDE_KEYS.map((sideKey) => [
    sideKey,
    state.pieces.filter((piece) => (
      piece.sideKey === sideKey && piece.isOnField && !piece.isDestroyed
    )).reduce((total, piece) => total + Number(piece.currentSupply), 0),
  ]));
  const reserveSupplyBySide = Object.fromEntries(SIDE_KEYS.map((sideKey) => [
    sideKey,
    state.pieces.filter((piece) => (
      piece.sideKey === sideKey && !piece.isOnField && !piece.isDestroyed
    )).reduce((total, piece) => total + Number(piece.currentSupply), 0),
  ]));
  if (!finalRound && SIDE_KEYS.some((sideKey) => onTableSupplyBySide[sideKey] > finitePool)) {
    fail("START_OF_ROUND_V5_SUPPLY_CAP_EXCEEDED");
  }
  const body = {
    ...without(clone(v4Resolution.roundSupplyState), ["roundSupplyStateHash"]),
    supplyPoolBySide: finalRound
      ? { player1: null, player2: null }
      : { player1: finitePool, player2: finitePool },
    onTableSupplyBySide,
    reserveSupplyBySide,
    availableSupplyBySide: finalRound
      ? { player1: null, player2: null }
      : Object.fromEntries(SIDE_KEYS.map((sideKey) => [
          sideKey,
          finitePool - onTableSupplyBySide[sideKey],
        ])),
    gameplayDataBundleHash: context.bundle.gameplayDataBundleHash,
  };
  return { ...body, roundSupplyStateHash: hashStarcraftTmgContract(body) };
}

function actualEffectQueue(state) {
  const firstPlayer = state.firstPlayerSideKey;
  const opponent = SIDE_KEYS.find((sideKey) => sideKey !== firstPlayer);
  const effects = [firstPlayer, opponent].flatMap((sideKey) => (
    state.pieces.filter((piece) => (
      piece.sideKey === sideKey
        && piece.isDestroyed !== true
        && Number(piece.currentModels || 0) > 0
    )).sort((left, right) => left.id.localeCompare(right.id)).map((piece) => ({
      ownerSideKey: sideKey,
      effectType: "grant_stationary",
      targetPieceId: piece.id,
      mandatory: true,
    }))
  ));
  const body = {
    round: Number(state.round),
    firstPlayerSideKey: firstPlayer,
    playerOrder: [firstPlayer, opponent],
    effects,
    unsupportedOptionalEffectCount: 0,
    queueComplete: true,
    trainingTruth: false,
  };
  return { body, hash: hashStarcraftTmgContract(body) };
}

function currentResolution(state, context, v4Resolution) {
  const loadoutHash = hashStarcraftTmgContract({
    schema: OFFICIAL_SELECTED_UPGRADE_LOADOUT_BINDING_V2_SCHEMA,
    rows: context.loadouts,
  });
  const queue = actualEffectQueue(state);
  const roundSupplyState = actualSupplyState(state, context, v4Resolution);
  const body = {
    ...without(clone(v4Resolution), ["schema", "startOfRoundResolutionHash"]),
    schema: OFFICIAL_START_OF_ROUND_V5_RESOLUTION_SCHEMA,
    gameplayDataBundleHash: context.bundle.gameplayDataBundleHash,
    roundSupplyState,
    effectQueue: queue.body,
    effectQueueProofHash: queue.hash,
    stationaryPieceIds: queue.body.effects.map((effect) => effect.targetPieceId),
    selectedUpgradeLoadouts: clone(context.loadouts),
    selectedUpgradeLoadoutHash: loadoutHash,
    rulesTruth: "official_start_of_round_marine_medic_medpack_exact_subset_v5",
  };
  return { ...body, startOfRoundResolutionHash: hashStarcraftTmgContract(body) };
}

function currentCandidate(v4Candidate, resolution) {
  return {
    ...clone(v4Candidate),
    startOfRoundResolutionHash: resolution.startOfRoundResolutionHash,
    startOfRoundResolution: resolution,
    executorId: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_VERSION,
    details: {
      ...clone(v4Candidate.details || {}),
      selectedUpgradeLoadoutHash: resolution.selectedUpgradeLoadoutHash,
      frozenSemanticKernel:
        `${OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID}@${OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION}`,
      validatedAdapter:
        "strict_current_start_v5_medic_projection_to_frozen_v4_marine_semantics",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

function disabledAction(state, sideKey, error) {
  return {
    actionType: OFFICIAL_START_OF_ROUND_V5_ACTION_TYPE,
    sideKey: sideKey || String(state?.firstPlayerSideKey || ""),
    phase: "start_of_round",
    startOfRoundResolutionHash: null,
    ruleAtomIds: [...OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ATOM_IDS],
    executorId: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_start_of_round_v5_fail_closed",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

export function enumerateOfficialStartOfRoundActionsV5(state, options = {}) {
  const sideKey = String(options.sideKey || "").trim();
  try {
    const context = currentContext(state, options);
    const semantic = semanticInput(state, options.matchBinding);
    const v4 = enumerateOfficialStartOfRoundActionsV4(semantic.semanticState, {
      ...options,
      matchBinding: semantic.semanticMatchBinding,
      includeDisabled: true,
      sideKey,
    });
    if (v4.length !== 1 || v4[0].isEnabled !== true) {
      fail(v4[0]?.disabledReason || "START_OF_ROUND_V5_FROZEN_SEMANTICS_REJECTED");
    }
    return [currentCandidate(
      v4[0],
      currentResolution(state, context, v4[0].startOfRoundResolution),
    )];
  } catch (error) {
    return options.includeDisabled === true
      ? [disabledAction(state, sideKey, error)]
      : [];
  }
}

export function applyOfficialStartOfRoundV5(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_START_OF_ROUND_V5_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_START_OF_ROUND_V5_EXECUTOR_VERSION) {
    fail("START_OF_ROUND_V5_ACTION_INVALID");
  }
  const candidates = enumerateOfficialStartOfRoundActionsV5(stateInput, {
    ...options,
    includeDisabled: false,
    sideKey: String(actionInput.sideKey || ""),
  });
  if (candidates.length !== 1
    || !isDeepStrictEqual(actionInput, executableAction(candidates[0]))) {
    fail("START_OF_ROUND_V5_ACTION_MISMATCH");
  }
  const semantic = semanticInput(stateInput, options.matchBinding);
  const v4Candidates = enumerateOfficialStartOfRoundActionsV4(semantic.semanticState, {
    ...options,
    matchBinding: semantic.semanticMatchBinding,
    includeDisabled: false,
    sideKey: String(actionInput.sideKey || ""),
  });
  if (v4Candidates.length !== 1) fail("START_OF_ROUND_V5_FROZEN_SEMANTICS_REJECTED");
  const frozen = applyOfficialStartOfRoundV4(
    semantic.semanticState,
    executableAction(v4Candidates[0]),
    { ...options, matchBinding: semantic.semanticMatchBinding },
  );
  if (frozen.state.phase !== "movement"
    || frozen.state.activeSideKey !== stateInput.firstPlayerSideKey) {
    fail("START_OF_ROUND_V5_FROZEN_TRANSITION_INVALID");
  }
  const resolution = actionInput.startOfRoundResolution;
  if (!hashBound(resolution, "startOfRoundResolutionHash")) {
    fail("START_OF_ROUND_V5_RESOLUTION_INVALID");
  }
  const state = clone(stateInput);
  for (const pieceId of resolution.stationaryPieceIds) {
    const piece = state.pieces.find((candidate) => candidate.id === pieceId);
    if (!piece) fail("START_OF_ROUND_V5_STATIONARY_PIECE_MISSING", pieceId);
    piece.statuses = ["stationary"];
  }
  for (const transition of resolution.readyCardTransitions) {
    const card = state.cardResources[transition.sideKey]
      .find((candidate) => candidate.id === transition.cardId);
    if (!card) fail("START_OF_ROUND_V5_READY_CARD_MISSING", transition.cardId);
    card.readiness = "ready";
    card.face = "up";
  }
  state.officialRoundSupplyState = clone(resolution.roundSupplyState);
  state.supplyLossLedger = clone(resolution.supplyLossLedger);
  state.phase = "movement";
  state.activeSideKey = state.firstPlayerSideKey;
  const history = {
    schema: OFFICIAL_START_OF_ROUND_V5_HISTORY_SCHEMA,
    round: Number(state.round),
    firstPlayerSideKey: state.firstPlayerSideKey,
    startOfRoundResolutionHash: resolution.startOfRoundResolutionHash,
    effectQueueProofHash: resolution.effectQueueProofHash,
    roundSupplyStateHash: resolution.roundSupplyState.roundSupplyStateHash,
    supplyLossLedgerHash: resolution.supplyLossLedgerHash,
    selectedUpgradeLoadoutHash: resolution.selectedUpgradeLoadoutHash,
    stationaryPieceIds: clone(resolution.stationaryPieceIds),
    readyCardIds: resolution.readyCardTransitions.map((row) => row.cardId),
    nextPhase: "movement",
    trainingTruth: false,
  };
  state.startOfRoundHistory = Array.isArray(state.startOfRoundHistory)
    ? state.startOfRoundHistory
    : [];
  state.startOfRoundHistory.push(history);
  const event = {
    type: "start_of_round_resolved",
    round: Number(state.round),
    initiatingSideKey: state.firstPlayerSideKey,
    startOfRoundResolutionHash: resolution.startOfRoundResolutionHash,
    effectQueueProofHash: resolution.effectQueueProofHash,
    roundSupplyStateHash: resolution.roundSupplyState.roundSupplyStateHash,
    supplyLossLedgerHash: resolution.supplyLossLedgerHash,
    selectedUpgradeLoadoutHash: resolution.selectedUpgradeLoadoutHash,
    supplyMode: resolution.roundSupplyState.mode,
    stationaryUnitCount: resolution.stationaryPieceIds.length,
    readyCardCount: resolution.readyCardTransitions.length,
    nextPhase: "movement",
    nextActiveSideKey: state.firstPlayerSideKey,
    phaseFirstActorChoicePending: true,
    trainingTruth: false,
  };
  const events = [event];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round),
    phase: "start_of_round",
    action: clone(actionInput),
    events: clone(events),
  });
  return {
    ...frozen,
    schemaVersion: "starcraft_tmg_official_start_of_round_transition_v5",
    executorId: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V5_EXECUTOR_VERSION,
    state,
    events,
    action: clone(actionInput),
    startOfRoundResolution: clone(resolution),
    rulesTruth: "official_current_start_of_round_marine_medic_medpack_v5",
    frozenSemanticKernel:
      `${OFFICIAL_START_OF_ROUND_V4_EXECUTOR_ID}@${OFFICIAL_START_OF_ROUND_V4_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
