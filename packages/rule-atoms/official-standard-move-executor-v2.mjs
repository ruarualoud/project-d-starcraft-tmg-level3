import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_PHASE_INITIATIVE_ATOM_IDS,
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION,
} from "./official-phase-initiative-executor-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_VERSION,
} from "./official-reserve-deploy-executor-v2.mjs";
import {
  applyOfficialStandardMoveV1,
  enumerateOfficialStandardMoveV1,
  instantiateOfficialStandardMoveV1,
  OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
  OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS,
} from "./official-standard-move-executor-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION,
} from "./official-start-of-round-executor-v2.mjs";

export const OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID = "authority.standard-move-v2";
export const OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_STANDARD_MOVE_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_STANDARD_MOVE_V2_PARAMETER_KIND =
  "official_standard_move_path_v2";
export const OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ATOM_IDS = Object.freeze([
  ...OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS,
]);
export const OFFICIAL_STANDARD_MOVE_V2_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS,
]);

const START_HISTORY_SCHEMA = "starcraft_tmg_official_start_of_round_history_entry_v1";
const ROUND_SUPPLY_SCHEMA = "starcraft_tmg_official_round_supply_state_v1";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const CURRENT_SUPPLY_MUTATION_EXECUTORS = Object.freeze(new Map([
  ["reserve_deployed", new Set([
    `${OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID}@${OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_VERSION}`,
  ])],
  ["unit_disengaged", new Set(["authority.disengage-v2@2.0.0"])],
  ["unit_disengage_failed", new Set(["authority.disengage-v2@2.0.0"])],
]));

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
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

function verifyStartOfRoundHandoff(state) {
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
    "stationaryPieceIds",
    "readyCardIds",
    "nextPhase",
    "trainingTruth",
  ])
    || history.schema !== START_HISTORY_SCHEMA
    || Number(history.round) !== Number(state?.round)
    || history.firstPlayerSideKey !== state?.firstPlayerSideKey
    || !SIDE_KEYS.includes(history.firstPlayerSideKey)
    || !HASH_PATTERN.test(String(history.startOfRoundResolutionHash || ""))
    || !HASH_PATTERN.test(String(history.effectQueueProofHash || ""))
    || !HASH_PATTERN.test(String(history.roundSupplyStateHash || ""))
    || !Array.isArray(history.stationaryPieceIds)
    || !Array.isArray(history.readyCardIds)
    || history.nextPhase !== "movement"
    || history.trainingTruth !== false) {
    fail("STANDARD_MOVE_V2_START_OF_ROUND_HANDOFF_INVALID");
  }
  const logs = Array.isArray(state?.log) ? state.log : [];
  const startIndexes = logs.flatMap((entry, index) => (
    Number(entry?.round) === Number(state.round)
      && entry?.phase === "start_of_round"
      && entry?.action?.executorId === OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID
      && entry?.action?.executorVersion === OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION
      ? [index]
      : []
  ));
  if (startIndexes.length !== 1) {
    fail("STANDARD_MOVE_V2_START_OF_ROUND_HANDOFF_INVALID", "current_v2_log");
  }
  const startIndex = startIndexes[0];
  const startLog = logs[startIndex];
  const action = startLog.action;
  const resolution = action?.startOfRoundResolution;
  const event = Array.isArray(startLog.events) && startLog.events.length === 1
    ? startLog.events[0]
    : null;
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
    || action.actionType !== OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE
    || action.sideKey !== history.firstPlayerSideKey
    || action.phase !== "start_of_round"
    || action.startOfRoundResolutionHash !== history.startOfRoundResolutionHash
    || !isDeepStrictEqual(action.ruleAtomIds, [...OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS])
    || !hashBound(resolution, "startOfRoundResolutionHash")
    || resolution.startOfRoundResolutionHash !== history.startOfRoundResolutionHash
    || resolution.effectQueueProofHash !== history.effectQueueProofHash
    || resolution.roundSupplyState?.schema !== ROUND_SUPPLY_SCHEMA
    || !hashBound(resolution.roundSupplyState, "roundSupplyStateHash")
    || resolution.roundSupplyState.roundSupplyStateHash !== history.roundSupplyStateHash
    || !isDeepStrictEqual(resolution.stationaryPieceIds, history.stationaryPieceIds)
    || !isDeepStrictEqual(
      resolution.readyCardTransitions?.map((entry) => entry.cardId),
      history.readyCardIds,
    )
    || resolution.nextPhase !== "movement"
    || resolution.nextActiveSideKey !== history.firstPlayerSideKey
    || !object(event)
    || event.type !== "start_of_round_resolved"
    || event.round !== Number(state.round)
    || event.initiatingSideKey !== history.firstPlayerSideKey
    || event.startOfRoundResolutionHash !== history.startOfRoundResolutionHash
    || event.effectQueueProofHash !== history.effectQueueProofHash
    || event.roundSupplyStateHash !== history.roundSupplyStateHash
    || event.nextPhase !== "movement"
    || event.trainingTruth !== false) {
    fail("STANDARD_MOVE_V2_START_OF_ROUND_HANDOFF_INVALID", "current_v2_material");
  }
  return { history, logs, startIndex };
}

function verifyPhaseHandoff(state, startHandoff) {
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
    fail("STANDARD_MOVE_V2_PHASE_HANDOFF_INVALID");
  }
  const matches = startHandoff.logs.slice(startHandoff.startIndex + 1).filter((entry) => (
    Number(entry?.round) === Number(state.round)
      && entry?.phase === "movement"
      && entry?.action?.executorId === OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID
      && entry?.action?.executorVersion === OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION
  ));
  if (matches.length !== 1) fail("STANDARD_MOVE_V2_PHASE_HANDOFF_INVALID", "current_log");
  const log = matches[0];
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
    || !object(event)
    || event.type !== "phase_first_actor_chosen"
    || event.round !== Number(state.round)
    || event.phase !== "movement"
    || event.markerHolderSideKey !== state.firstPlayerSideKey
    || event.chosenFirstActorSideKey !== choice.chosenFirstActorSideKey) {
    fail("STANDARD_MOVE_V2_PHASE_HANDOFF_INVALID", "current_material");
  }
}

function verifyRoundSupplyLineage(state, startHandoff) {
  const current = state?.officialRoundSupplyState;
  if (!hashBound(current, "roundSupplyStateHash")
    || current.schema !== ROUND_SUPPLY_SCHEMA
    || current.round !== Number(state.round)) {
    fail("STANDARD_MOVE_V2_SUPPLY_LINEAGE_INVALID", "current_state");
  }
  let expectedHash = startHandoff.history.roundSupplyStateHash;
  for (const log of startHandoff.logs.slice(startHandoff.startIndex + 1)) {
    for (const event of Array.isArray(log?.events) ? log.events : []) {
      const before = event?.roundSupplyStateHashBefore;
      const after = event?.roundSupplyStateHashAfter;
      if (before === undefined && after === undefined) continue;
      const allowed = CURRENT_SUPPLY_MUTATION_EXECUTORS.get(event.type);
      if (!allowed
        || !allowed.has(executableIdentity(log.action))
        || !HASH_PATTERN.test(String(before || ""))
        || !HASH_PATTERN.test(String(after || ""))
        || before !== expectedHash) {
        fail("STANDARD_MOVE_V2_SUPPLY_LINEAGE_INVALID", String(event?.type || "unknown"));
      }
      expectedHash = after;
    }
  }
  if (expectedHash !== current.roundSupplyStateHash) {
    fail("STANDARD_MOVE_V2_SUPPLY_LINEAGE_INVALID", "unwitnessed_change");
  }
}

function verifyCurrentHandoffs(state) {
  const startHandoff = verifyStartOfRoundHandoff(state);
  verifyPhaseHandoff(state, startHandoff);
  verifyRoundSupplyLineage(state, startHandoff);
}

function diagnosticAction(state, sideKey, pieceId, error) {
  return {
    actionType: "move",
    sideKey,
    phase: "movement",
    pieceId,
    ruleAtomIds: [...OFFICIAL_STANDARD_MOVE_V2_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_standard_move_v2_fail_closed",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

function currentDomain(frozenDomain) {
  const core = {
    ...clone(frozenDomain),
    parameterKind: OFFICIAL_STANDARD_MOVE_V2_PARAMETER_KIND,
    executorId: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION,
    constraints: {
      ...clone(frozenDomain.constraints),
      currentHandoffContract:
        "start-of-round-v2+phase-initiative-v1+contiguous-round-supply-lineage-v1",
    },
    rulesTruth: "official_current_standard_move_parameter_domain_v2",
    trainingTruth: false,
  };
  delete core.domainId;
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

function currentAction(frozenAction) {
  return {
    ...clone(frozenAction),
    executorId: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION,
  };
}

function frozenAction(current) {
  return {
    ...clone(current),
    executorId: OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialStandardMoveV2(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  try {
    verifyCurrentHandoffs(state);
  } catch (error) {
    const pieces = Array.isArray(state?.pieces)
      ? state.pieces.filter((piece) => (
        piece?.sideKey === sideKey
          && piece?.isOnField === true
          && piece?.isDestroyed !== true
          && Number(piece?.currentModels || 0) > 0
      ))
      : [];
    return {
      candidates: options.includeDisabled === true
        ? pieces.map((piece) => diagnosticAction(state, sideKey, String(piece.id || ""), error))
        : [],
      parameterDomains: [],
    };
  }
  const frozen = enumerateOfficialStandardMoveV1(state, options);
  return {
    candidates: frozen.candidates.map((candidate) => ({
      ...clone(candidate),
      executorId: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
      executorVersion: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION,
      details: { ...clone(candidate.details || {}), silentCompatibilityUsed: false },
    })),
    parameterDomains: frozen.parameterDomains.map(currentDomain),
  };
}

export function instantiateOfficialStandardMoveV2(state, domain, parameters, options = {}) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_STANDARD_MOVE_V2_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION) {
    fail("STANDARD_MOVE_V2_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialStandardMoveV2(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const expected = current.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expected || !isDeepStrictEqual(domain, expected)) {
    fail("STANDARD_MOVE_V2_PARAMETER_DOMAIN_STALE");
  }
  const frozen = enumerateOfficialStandardMoveV1(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const frozenDomain = frozen.parameterDomains.find((entry) => entry.pieceId === domain.pieceId);
  if (!frozenDomain) fail("STANDARD_MOVE_V2_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialStandardMoveV1(
    state,
    frozenDomain,
    parameters,
    options,
  );
  return {
    ...clone(instantiated),
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v2",
    action: currentAction(instantiated.action),
    rulesTruth: "official_current_standard_move_instantiation_v2",
    frozenSemanticKernel:
      `${OFFICIAL_STANDARD_MOVE_EXECUTOR_ID}@${OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}

export function applyOfficialStandardMoveV2(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "move"
    || actionInput.executorId !== OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION
    || !object(actionInput.movePlan)) {
    fail("STANDARD_MOVE_V2_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialStandardMoveV2(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.pieceId === actionInput.pieceId
  ));
  if (!domain) fail("STANDARD_MOVE_V2_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialStandardMoveV2(stateInput, domain, {
    leadingModelId: actionInput.movePlan.leadingModelId,
    path: actionInput.movePlan.canonicalPath?.points?.slice(1),
    placements: actionInput.movePlan.placementSequence,
  }, options);
  if (!isDeepStrictEqual(actionInput, instantiated.action)) {
    fail("STANDARD_MOVE_V2_ACTION_MISMATCH");
  }
  const frozen = applyOfficialStandardMoveV1(stateInput, frozenAction(actionInput), options);
  const state = clone(frozen.state);
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  return {
    ...frozen,
    schemaVersion: "starcraft_tmg_official_standard_move_transition_v2",
    executorId: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_VERSION,
    state,
    action: clone(actionInput),
    rulesTruth: "official_current_standard_move_exact_subset_v2",
    frozenSemanticKernel:
      `${OFFICIAL_STANDARD_MOVE_EXECUTOR_ID}@${OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
