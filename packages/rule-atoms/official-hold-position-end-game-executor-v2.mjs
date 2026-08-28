import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialHoldPositionEndGameV1,
  enumerateOfficialHoldPositionEndGameActionsV1,
  OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
  OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS,
  OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
  OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION,
} from "./official-hold-position-end-game-executor-v1.mjs";

export const OFFICIAL_HOLD_POSITION_END_GAME_V2_ACTION_TYPE =
  OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE;
export const OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID =
  "authority.hold-position-end-game-check-v2";
export const OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_HOLD_POSITION_END_GAME_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS =
  OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function currentAction(action) {
  return {
    ...clone(action),
    executorId: OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_VERSION,
    details: {
      ...clone(action.details || {}),
      exactPublicApplyContract: true,
      historicalTransitionExecutor:
        `${OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID}`
        + `@${OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION}`,
      rulesTruth: "hold_position_end_game_v2_exact_public_action_contract",
      trainingTruth: false,
    },
  };
}

function historicalAction(action) {
  return {
    ...clone(action),
    executorId: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
    executorVersion: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_VERSION,
  };
}

function executableAction(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = candidate;
  return action;
}

export function enumerateOfficialHoldPositionEndGameActionsV2(state, options = {}) {
  return enumerateOfficialHoldPositionEndGameActionsV1(state, options)
    .map((candidate) => currentAction(candidate));
}

export function applyOfficialHoldPositionEndGameV2(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_HOLD_POSITION_END_GAME_V2_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_VERSION) {
    fail("END_GAME_V2_ACTION_INVALID");
  }
  const candidate = enumerateOfficialHoldPositionEndGameActionsV2(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
  })[0];
  if (!candidate) fail("END_GAME_V2_ACTION_STALE");
  const expectedAction = executableAction(candidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) {
    fail("END_GAME_V2_ACTION_MISMATCH");
  }
  const previous = applyOfficialHoldPositionEndGameV1(
    stateInput,
    historicalAction(expectedAction),
    options,
  );
  const result = clone(previous);
  result.action = expectedAction;
  result.executorId = OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_VERSION;
  result.schemaVersion = "starcraft_tmg_official_hold_position_end_game_transition_v2";
  const lastLog = result.state.log?.at(-1);
  if (lastLog) lastLog.action = clone(expectedAction);
  result.rulesTruth = "hold_position_end_game_v2_exact_public_action_contract";
  result.trainingTruth = false;
  return result;
}
