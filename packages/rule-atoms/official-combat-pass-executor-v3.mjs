import { isDeepStrictEqual } from "node:util";

import {
  applyOfficialCombatPassV2,
  enumerateOfficialCombatPassV2Actions,
  OFFICIAL_COMBAT_PASS_V2_ATOM_IDS,
  OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
  OFFICIAL_COMBAT_PASS_V2_EXECUTOR_VERSION,
  officialCombatPassV2AtomIdsForState,
} from "./official-combat-pass-executor-v2.mjs";

export const OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID = "authority.combat-pass-v3";
export const OFFICIAL_COMBAT_PASS_V3_EXECUTOR_VERSION = "3.0.0";
export const OFFICIAL_COMBAT_PASS_V3_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_COMBAT_PASS_V3_ATOM_IDS = OFFICIAL_COMBAT_PASS_V2_ATOM_IDS;

export function officialCombatPassV3AtomIdsForState(state, sideKey) {
  return officialCombatPassV2AtomIdsForState(state, sideKey);
}

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function phaseFirstActorChoice(state) {
  if (!object(state.phaseFirstActorByRound)) {
    return { choice: null, disabledReason: "COMBAT_PASS_V3_PHASE_FIRST_ACTOR_INVALID" };
  }
  const key = `${Number(state.round || 1)}:combat`;
  const choice = state.phaseFirstActorByRound[key];
  if (!choice) {
    return { choice: null, disabledReason: "COMBAT_PASS_V3_PHASE_FIRST_ACTOR_REQUIRED" };
  }
  if (!object(choice)
    || Number(choice.round) !== Number(state.round || 1)
    || choice.phase !== "combat"
    || choice.markerHolderSideKey !== state.firstPlayerSideKey
    || !["player1", "player2"].includes(choice.chosenFirstActorSideKey)) {
    return { choice: null, disabledReason: "COMBAT_PASS_V3_PHASE_FIRST_ACTOR_INVALID" };
  }
  return { choice: clone(choice), disabledReason: "" };
}

function rewriteCandidate(candidate, state) {
  const phaseChoice = phaseFirstActorChoice(state);
  const disabledReason = candidate.disabledReason || phaseChoice.disabledReason;
  return {
    ...clone(candidate),
    executorId: OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_PASS_V3_EXECUTOR_VERSION,
    isEnabled: !disabledReason,
    disabledReason,
    score: disabledReason ? 0 : candidate.score,
    details: {
      ...clone(candidate.details),
      exactPublicApplyContract: true,
      phaseFirstActorChoice: phaseChoice.choice,
      historicalTransitionExecutor:
        `${OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID}@${OFFICIAL_COMBAT_PASS_V2_EXECUTOR_VERSION}`,
      rulesTruth: "combat_pass_v3_exact_public_action_contract",
      trainingTruth: false,
    },
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

export function enumerateOfficialCombatPassV3Actions(state, options = {}) {
  const candidates = enumerateOfficialCombatPassV2Actions(state, {
    ...options,
    includeDisabled: true,
  }).map((candidate) => rewriteCandidate(candidate, state));
  return options.includeDisabled === true
    ? candidates
    : candidates.filter((candidate) => candidate.isEnabled);
}

export function applyOfficialCombatPassV3(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "pass"
    || actionInput.executorId !== OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_COMBAT_PASS_V3_EXECUTOR_VERSION) {
    fail("COMBAT_PASS_V3_ACTION_INVALID");
  }
  const candidate = enumerateOfficialCombatPassV3Actions(stateInput, {
    sideKey: actionInput.sideKey,
  })[0];
  if (!candidate) fail("COMBAT_PASS_V3_ACTION_STALE");
  const expectedAction = executableAction(candidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) {
    fail("COMBAT_PASS_V3_ACTION_MISMATCH");
  }
  const historicalAction = {
    ...clone(expectedAction),
    executorId: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_VERSION,
  };
  const applied = applyOfficialCombatPassV2(stateInput, historicalAction, options);
  const lastLog = applied.state.log?.at(-1);
  if (lastLog) lastLog.action = clone(expectedAction);
  return {
    ...applied,
    schemaVersion: "starcraft_tmg_official_combat_pass_transition_v3",
    executorId: OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_PASS_V3_EXECUTOR_VERSION,
    action: expectedAction,
    rulesTruth: "combat_pass_v3_exact_public_action_contract",
    trainingTruth: false,
  };
}
