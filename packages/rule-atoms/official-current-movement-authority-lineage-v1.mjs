import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_PHASE_INITIATIVE_ATOM_IDS,
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION,
} from "./official-phase-initiative-executor-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_V3_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION,
  OFFICIAL_START_OF_ROUND_V3_HISTORY_SCHEMA,
  OFFICIAL_START_OF_ROUND_V3_RESOLUTION_SCHEMA,
} from "./official-start-of-round-executor-v3.mjs";
import { verifyOfficialSupplyLossLedgerV1 } from
  "./official-supply-loss-ledger-v1.mjs";

export const OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_SCHEMA =
  "starcraft_tmg_current_movement_authority_lineage_v1";
export const OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_CONTRACT =
  "start-of-round-v3+phase-initiative-v1+explicit-supply-mutation-lineage-v1";

const ROUND_SUPPLY_SCHEMA = "starcraft_tmg_official_round_supply_state_v1";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const SUPPLY_MUTATION_EXECUTORS = Object.freeze(new Map([
  ["reserve_deployed", new Set([
    "authority.reserve-deploy-v3@3.0.0",
  ])],
  ["unit_disengaged", new Set([
    "authority.disengage-v3@3.0.0",
  ])],
  ["unit_disengage_failed", new Set([
    "authority.disengage-v3@3.0.0",
  ])],
]));

function fail(prefix, suffix, detail = "") {
  const code = `${prefix}_${suffix}`;
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return object(value)
    && isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort());
}

function hashBound(value, hashKey) {
  if (!object(value) || !HASH_PATTERN.test(String(value[hashKey] || ""))) return false;
  const body = Object.fromEntries(Object.entries(value).filter(([key]) => key !== hashKey));
  return hashStarcraftTmgContract(body) === value[hashKey];
}

function executableIdentity(action) {
  return `${String(action?.executorId || "")}@${String(action?.executorVersion || "")}`;
}

function verifyStartOfRound(state, prefix) {
  const history = Array.isArray(state?.startOfRoundHistory)
    ? state.startOfRoundHistory.at(-1)
    : null;
  if (!exactKeys(history, [
    "schema",
    "round",
    "firstPlayerSideKey",
    "startOfRoundResolutionHash",
    "effectQueueProofHash",
    "roundSupplyStateHash",
    "supplyLossLedgerHash",
    "stationaryPieceIds",
    "readyCardIds",
    "nextPhase",
    "trainingTruth",
  ])
    || history.schema !== OFFICIAL_START_OF_ROUND_V3_HISTORY_SCHEMA
    || Number(history.round) !== Number(state?.round)
    || history.firstPlayerSideKey !== state?.firstPlayerSideKey
    || !SIDE_KEYS.includes(history.firstPlayerSideKey)
    || !HASH_PATTERN.test(String(history.startOfRoundResolutionHash || ""))
    || !HASH_PATTERN.test(String(history.effectQueueProofHash || ""))
    || !HASH_PATTERN.test(String(history.roundSupplyStateHash || ""))
    || !HASH_PATTERN.test(String(history.supplyLossLedgerHash || ""))
    || !Array.isArray(history.stationaryPieceIds)
    || !Array.isArray(history.readyCardIds)
    || history.nextPhase !== "movement"
    || history.trainingTruth !== false) {
    fail(prefix, "START_OF_ROUND_HANDOFF_INVALID");
  }
  const logs = Array.isArray(state?.log) ? state.log : [];
  const indexes = logs.flatMap((entry, index) => (
    Number(entry?.round) === Number(state.round)
      && entry?.phase === "start_of_round"
      && entry?.action?.executorId === OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID
      && entry?.action?.executorVersion === OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION
      ? [index]
      : []
  ));
  if (indexes.length !== 1) {
    fail(prefix, "START_OF_ROUND_HANDOFF_INVALID", "current_v3_log");
  }
  const startIndex = indexes[0];
  const log = logs[startIndex];
  const action = log.action;
  const resolution = action?.startOfRoundResolution;
  const event = Array.isArray(log.events) && log.events.length === 1 ? log.events[0] : null;
  if (!exactKeys(action, [
    "actionType",
    "sideKey",
    "phase",
    "startOfRoundResolutionHash",
    "startOfRoundResolution",
    "ruleAtomIds",
    "executorId",
    "executorVersion",
  ])
    || action.actionType !== OFFICIAL_START_OF_ROUND_V3_ACTION_TYPE
    || action.sideKey !== history.firstPlayerSideKey
    || action.phase !== "start_of_round"
    || action.startOfRoundResolutionHash !== history.startOfRoundResolutionHash
    || !isDeepStrictEqual(action.ruleAtomIds, [...OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ATOM_IDS])
    || !hashBound(resolution, "startOfRoundResolutionHash")
    || resolution.schema !== OFFICIAL_START_OF_ROUND_V3_RESOLUTION_SCHEMA
    || resolution.startOfRoundResolutionHash !== history.startOfRoundResolutionHash
    || resolution.effectQueueProofHash !== history.effectQueueProofHash
    || resolution.roundSupplyState?.schema !== ROUND_SUPPLY_SCHEMA
    || !hashBound(resolution.roundSupplyState, "roundSupplyStateHash")
    || resolution.roundSupplyState.roundSupplyStateHash !== history.roundSupplyStateHash
    || resolution.supplyLossLedgerHash !== history.supplyLossLedgerHash
    || resolution.supplyLossLedger?.ledgerHash !== history.supplyLossLedgerHash
    || !isDeepStrictEqual(resolution.stationaryPieceIds, history.stationaryPieceIds)
    || !isDeepStrictEqual(
      resolution.readyCardTransitions?.map((entry) => entry.cardId),
      history.readyCardIds,
    )
    || resolution.nextPhase !== "movement"
    || resolution.nextActiveSideKey !== history.firstPlayerSideKey
    || !exactKeys(event, [
      "type",
      "round",
      "initiatingSideKey",
      "startOfRoundResolutionHash",
      "effectQueueProofHash",
      "roundSupplyStateHash",
      "supplyLossLedgerHash",
      "supplyMode",
      "stationaryUnitCount",
      "readyCardCount",
      "nextPhase",
      "nextActiveSideKey",
      "phaseFirstActorChoicePending",
      "trainingTruth",
    ])
    || event.type !== "start_of_round_resolved"
    || event.round !== Number(state.round)
    || event.initiatingSideKey !== history.firstPlayerSideKey
    || event.startOfRoundResolutionHash !== history.startOfRoundResolutionHash
    || event.effectQueueProofHash !== history.effectQueueProofHash
    || event.roundSupplyStateHash !== history.roundSupplyStateHash
    || event.supplyLossLedgerHash !== history.supplyLossLedgerHash
    || event.supplyMode !== resolution.roundSupplyState.mode
    || event.stationaryUnitCount !== history.stationaryPieceIds.length
    || event.readyCardCount !== history.readyCardIds.length
    || event.nextPhase !== "movement"
    || event.nextActiveSideKey !== history.firstPlayerSideKey
    || event.phaseFirstActorChoicePending !== true
    || event.trainingTruth !== false) {
    fail(prefix, "START_OF_ROUND_HANDOFF_INVALID", "current_v3_material");
  }
  try {
    verifyOfficialSupplyLossLedgerV1(resolution.supplyLossLedger, {
      round: Number(state.round),
    });
    verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, {
      round: Number(state.round),
      rulesRuntimeHash: resolution.supplyLossLedger.rulesRuntimeHash,
    });
    if (resolution.supplyLossLedger.entries.length !== 0
      || resolution.supplyLossLedger.headEntryHash !== "0".repeat(64)) {
      fail(prefix, "START_OF_ROUND_HANDOFF_INVALID", "supply_loss_ledger_baseline");
    }
  } catch {
    fail(prefix, "START_OF_ROUND_HANDOFF_INVALID", "supply_loss_ledger");
  }
  return { history, logs, startIndex, startLogHash: hashStarcraftTmgContract(log) };
}

function verifyPhase(state, prefix, start) {
  const key = `${Number(state.round)}:movement`;
  const choice = state?.phaseFirstActorByRound?.[key];
  if (!exactKeys(choice, [
    "round",
    "phase",
    "markerHolderSideKey",
    "chosenFirstActorSideKey",
  ])
    || choice.round !== Number(state.round)
    || choice.phase !== "movement"
    || choice.markerHolderSideKey !== state.firstPlayerSideKey
    || !SIDE_KEYS.includes(choice.chosenFirstActorSideKey)) {
    fail(prefix, "PHASE_HANDOFF_INVALID");
  }
  const matches = start.logs.slice(start.startIndex + 1).flatMap((entry, offset) => (
    Number(entry?.round) === Number(state.round)
      && entry?.phase === "movement"
      && entry?.action?.executorId === OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID
      && entry?.action?.executorVersion === OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION
      ? [{ entry, index: start.startIndex + 1 + offset }]
      : []
  ));
  if (matches.length !== 1) fail(prefix, "PHASE_HANDOFF_INVALID", "current_log");
  const { entry: log, index } = matches[0];
  const action = log.action;
  const event = Array.isArray(log.events) && log.events.length === 1 ? log.events[0] : null;
  if (!exactKeys(action, [
    "actionType",
    "sideKey",
    "phase",
    "chosenFirstActorSideKey",
    "ruleAtomIds",
    "executorId",
    "executorVersion",
  ])
    || action.actionType !== "choose_first_actor"
    || action.sideKey !== state.firstPlayerSideKey
    || action.phase !== "movement"
    || action.chosenFirstActorSideKey !== choice.chosenFirstActorSideKey
    || !isDeepStrictEqual(action.ruleAtomIds, [...OFFICIAL_PHASE_INITIATIVE_ATOM_IDS].sort())
    || !exactKeys(event, [
      "type",
      "round",
      "phase",
      "markerHolderSideKey",
      "chosenFirstActorSideKey",
    ])
    || event.type !== "phase_first_actor_chosen"
    || event.round !== Number(state.round)
    || event.phase !== "movement"
    || event.markerHolderSideKey !== state.firstPlayerSideKey
    || event.chosenFirstActorSideKey !== choice.chosenFirstActorSideKey) {
    fail(prefix, "PHASE_HANDOFF_INVALID", "current_material");
  }
  return { choice, phaseIndex: index, phaseLogHash: hashStarcraftTmgContract(log) };
}

function verifySupply(state, prefix, start) {
  const current = state?.officialRoundSupplyState;
  if (!hashBound(current, "roundSupplyStateHash")
    || current.schema !== ROUND_SUPPLY_SCHEMA
    || current.round !== Number(state.round)) {
    fail(prefix, "SUPPLY_LINEAGE_INVALID", "current_state");
  }
  let expectedHash = start.history.roundSupplyStateHash;
  const mutations = [];
  const supplyLossEntryHashes = [];
  for (const [offset, log] of start.logs.slice(start.startIndex + 1).entries()) {
    const logEvents = Array.isArray(log?.events) ? log.events : [];
    const firstSupplyLossIndex = logEvents.findIndex((event) => (
      event?.type === "supply_loss_recorded"
    ));
    const causalEvents = firstSupplyLossIndex < 0
      ? logEvents
      : logEvents.slice(0, firstSupplyLossIndex);
    for (const [eventIndex, event] of logEvents.entries()) {
      if (event?.type === "supply_loss_recorded") {
        const entry = state.supplyLossLedger.entries.find((row) => (
          row.entryHash === event.entryHash
        ));
        if (!entry
          || entry.causalActionHash !== hashStarcraftTmgContract(log.action)
          || entry.causalEventsHash !== hashStarcraftTmgContract(causalEvents)) {
          fail(prefix, "SUPPLY_LINEAGE_INVALID", "supply_loss_entry");
        }
        supplyLossEntryHashes.push(event.entryHash);
      }
      const before = event?.roundSupplyStateHashBefore;
      const after = event?.roundSupplyStateHashAfter;
      if (before === undefined && after === undefined) continue;
      const identity = executableIdentity(log.action);
      const allowed = SUPPLY_MUTATION_EXECUTORS.get(event.type);
      if (!allowed
        || !allowed.has(identity)
        || !HASH_PATTERN.test(String(before || ""))
        || !HASH_PATTERN.test(String(after || ""))
        || before !== expectedHash) {
        fail(prefix, "SUPPLY_LINEAGE_INVALID", String(event?.type || "unknown"));
      }
      mutations.push({
        logIndex: start.startIndex + 1 + offset,
        eventIndex,
        eventType: event.type,
        executorIdentity: identity,
        roundSupplyStateHashBefore: before,
        roundSupplyStateHashAfter: after,
        eventHash: hashStarcraftTmgContract(event),
      });
      expectedHash = after;
    }
  }
  if (expectedHash !== current.roundSupplyStateHash) {
    fail(prefix, "SUPPLY_LINEAGE_INVALID", "unwitnessed_change");
  }
  if (!isDeepStrictEqual(
    supplyLossEntryHashes,
    state.supplyLossLedger.entries.map((entry) => entry.entryHash),
  )) {
    fail(prefix, "SUPPLY_LINEAGE_INVALID", "supply_loss_event_chain");
  }
  return { current, mutations, supplyLossLedgerHash: state.supplyLossLedger.ledgerHash };
}

export function verifyOfficialCurrentMovementAuthorityLineageV1(state, options = {}) {
  const errorPrefix = String(options.errorPrefix || "CURRENT_MOVEMENT").trim();
  if (!/^[A-Z][A-Z0-9_]*$/u.test(errorPrefix)) {
    throw new Error("CURRENT_MOVEMENT_ERROR_PREFIX_INVALID");
  }
  const start = verifyStartOfRound(state, errorPrefix);
  const phase = verifyPhase(state, errorPrefix, start);
  const supply = verifySupply(state, errorPrefix, start);
  const body = {
    schema: OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_SCHEMA,
    contract: OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_CONTRACT,
    round: Number(state.round),
    phase: "movement",
    firstPlayerSideKey: state.firstPlayerSideKey,
    chosenFirstActorSideKey: phase.choice.chosenFirstActorSideKey,
    startOfRoundResolutionHash: start.history.startOfRoundResolutionHash,
    startLogHash: start.startLogHash,
    phaseLogHash: phase.phaseLogHash,
    roundSupplyStateHash: supply.current.roundSupplyStateHash,
    supplyLossLedgerHash: supply.supplyLossLedgerHash,
    supplyMutations: supply.mutations,
    trainingTruth: false,
  };
  return { ...body, lineageHash: hashStarcraftTmgContract(body) };
}
