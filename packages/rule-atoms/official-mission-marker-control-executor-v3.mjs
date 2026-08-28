import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialMissionMarkerControlV2,
  enumerateOfficialMissionMarkerControlActionsV2,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ATOM_IDS,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION,
} from "./official-mission-marker-control-executor-v2.mjs";

export const OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE =
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE;
export const OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID =
  "authority.mission-marker-control-v3";
export const OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_VERSION = "3.0.0";
export const OFFICIAL_MISSION_MARKER_CONTROL_V3_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MISSION_MARKER_CONTROL_V3_ATOM_IDS =
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ATOM_IDS;

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
    executorId: OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_VERSION,
    details: {
      ...clone(action.details || {}),
      exactPublicApplyContract: true,
      historicalTransitionExecutor:
        `${OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID}`
        + `@${OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION}`,
      rulesTruth: "mission_marker_control_v3_exact_public_action_contract",
      trainingTruth: false,
    },
  };
}

function historicalAction(action) {
  return {
    ...clone(action),
    executorId: OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MISSION_MARKER_CONTROL_V2_EXECUTOR_VERSION,
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

export function enumerateOfficialMissionMarkerControlActionsV3(state, options = {}) {
  return enumerateOfficialMissionMarkerControlActionsV2(state, options)
    .map((candidate) => currentAction(candidate));
}

export function applyOfficialMissionMarkerControlV3(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_VERSION) {
    fail("MISSION_MARKER_V3_ACTION_INVALID");
  }
  const candidate = enumerateOfficialMissionMarkerControlActionsV3(stateInput, {
    ...options,
    sideKey: actionInput.sideKey,
  })[0];
  if (!candidate) fail("MISSION_MARKER_V3_ACTION_STALE");
  const expectedAction = executableAction(candidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) {
    fail("MISSION_MARKER_V3_ACTION_MISMATCH");
  }
  const previous = applyOfficialMissionMarkerControlV2(
    stateInput,
    historicalAction(expectedAction),
    options,
  );
  const result = clone(previous);
  result.action = expectedAction;
  result.executorId = OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_MISSION_MARKER_CONTROL_V3_EXECUTOR_VERSION;
  result.schemaVersion = "starcraft_tmg_official_mission_marker_control_transition_v3";
  const lastLog = result.state.log?.at(-1);
  if (lastLog) lastLog.action = clone(expectedAction);
  result.rulesTruth = "mission_marker_control_v3_exact_public_action_contract";
  result.trainingTruth = false;
  return result;
}
