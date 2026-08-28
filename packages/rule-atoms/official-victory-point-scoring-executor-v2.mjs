import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialVictoryPointScoringV1,
  enumerateOfficialVictoryPointScoringActionsV1,
  OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
  OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS,
  OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
  OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION,
} from "./official-victory-point-scoring-executor-v1.mjs";

export const OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE =
  OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE;
export const OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID =
  "authority.victory-point-scoring-v2";
export const OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_VICTORY_POINT_SCORING_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS =
  OFFICIAL_VICTORY_POINT_SCORING_ATOM_IDS;

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
    executorId: OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION,
    details: {
      ...clone(action.details || {}),
      exactPublicApplyContract: true,
      historicalTransitionExecutor:
        `${OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID}`
        + `@${OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION}`,
      rulesTruth: "victory_point_scoring_v2_exact_public_action_contract",
      trainingTruth: false,
    },
  };
}

function historicalAction(action) {
  return {
    ...clone(action),
    executorId: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
    executorVersion: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_VERSION,
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

export function enumerateOfficialVictoryPointScoringActionsV2(state, options = {}) {
  return enumerateOfficialVictoryPointScoringActionsV1(state, options)
    .map((candidate) => currentAction(candidate));
}

export function applyOfficialVictoryPointScoringV2(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION) {
    fail("VP_SCORING_V2_ACTION_INVALID");
  }
  const candidate = enumerateOfficialVictoryPointScoringActionsV2(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
  })[0];
  if (!candidate) fail("VP_SCORING_V2_ACTION_STALE");
  const expectedAction = executableAction(candidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) {
    fail("VP_SCORING_V2_ACTION_MISMATCH");
  }
  const previous = applyOfficialVictoryPointScoringV1(
    stateInput,
    historicalAction(expectedAction),
    options,
  );
  const result = clone(previous);
  result.action = expectedAction;
  result.executorId = OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION;
  result.schemaVersion = "starcraft_tmg_official_victory_point_scoring_transition_v2";
  const lastLog = result.state.log?.at(-1);
  if (lastLog) lastLog.action = clone(expectedAction);
  result.rulesTruth = "victory_point_scoring_v2_exact_public_action_contract";
  result.trainingTruth = false;
  return result;
}
