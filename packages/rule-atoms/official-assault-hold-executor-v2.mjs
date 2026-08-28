import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialAssaultHoldV1,
  enumerateOfficialAssaultHoldActionsV1,
  OFFICIAL_ASSAULT_HOLD_ATOM_IDS,
  OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID,
  OFFICIAL_ASSAULT_HOLD_EXECUTOR_VERSION,
} from "./official-assault-hold-executor-v1.mjs";

export const OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID = "authority.assault-hold-v2";
export const OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_ASSAULT_HOLD_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_ASSAULT_HOLD_V2_ATOM_IDS = OFFICIAL_ASSAULT_HOLD_ATOM_IDS;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function verifyRestriction(state, piece) {
  const restriction = piece?.disengageAssaultRestriction;
  if (restriction === undefined || restriction === null) return null;
  if (!object(restriction)) fail("ASSAULT_HOLD_POST_DISENGAGE_RESTRICTION_INVALID");
  const { restrictionHash, ...body } = restriction;
  if (restriction.schema !== "starcraft_tmg_official_post_disengage_assault_restriction_v1"
    || restriction.appliesToPhase !== "assault"
    || Number(restriction.declaredRound) !== Number(state.round)
    || restriction.trainingTruth !== false
    || hashStarcraftTmgContract(body) !== restrictionHash
    || restriction.rangedAttackProhibited !== !restriction.tacticalMass
    || restriction.chargeProhibited !== !restriction.tacticalMass) {
    fail("ASSAULT_HOLD_POST_DISENGAGE_RESTRICTION_INVALID");
  }
  return restriction;
}

function rewriteAction(action) {
  return {
    ...clone(action),
    ruleAtomIds: [...OFFICIAL_ASSAULT_HOLD_V2_ATOM_IDS].sort(),
    executorId: OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_VERSION,
  };
}

function actionFromCandidate(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = candidate;
  return action;
}

export function enumerateOfficialAssaultHoldActionsV2(state, options = {}) {
  const previous = enumerateOfficialAssaultHoldActionsV1(state, {
    ...options,
    includeDisabled: true,
  });
  const rows = previous.map((candidate) => {
    const piece = state.pieces.find((entry) => entry.id === candidate.pieceId);
    let disabledReason = candidate.disabledReason;
    if (!disabledReason) {
      try {
        verifyRestriction(state, piece);
      } catch (error) {
        disabledReason = String(error?.message || error).split(":")[0];
      }
    }
    return {
      ...rewriteAction(candidate),
      isEnabled: !disabledReason,
      disabledReason,
      score: disabledReason ? 0 : candidate.score,
      details: {
        ...candidate.details,
        postDisengageRestrictionLifecycle: "consume_on_following_assault_hold",
        trainingTruth: false,
      },
    };
  });
  return rows.filter((row) => options.includeDisabled === true || row.isEnabled);
}

function consumeRestriction(piece, state, action) {
  const restriction = verifyRestriction(state, piece);
  if (!restriction) return null;
  const historyEntry = {
    schema: "starcraft_tmg_official_post_disengage_assault_restriction_consumption_v1",
    restrictionHash: restriction.restrictionHash,
    declaredRound: restriction.declaredRound,
    consumedRound: Number(state.round),
    consumedPhase: "assault",
    consumedByActionType: "hold",
    consumedByActionHash: hashStarcraftTmgContract(action),
    tacticalMass: restriction.tacticalMass,
    rangedAttackWasProhibited: restriction.rangedAttackProhibited,
    trainingTruth: false,
  };
  piece.disengageAssaultRestrictionHistory = Array.isArray(
    piece.disengageAssaultRestrictionHistory,
  ) ? piece.disengageAssaultRestrictionHistory : [];
  piece.disengageAssaultRestrictionHistory.push(historyEntry);
  delete piece.disengageAssaultRestriction;
  return {
    type: "post_disengage_assault_restriction_consumed",
    pieceId: piece.id,
    restrictionHash: historyEntry.restrictionHash,
    consumedByActionType: historyEntry.consumedByActionType,
    consumedByActionHash: historyEntry.consumedByActionHash,
    tacticalMass: historyEntry.tacticalMass,
    trainingTruth: false,
  };
}

export function applyOfficialAssaultHoldV2(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "hold"
    || actionInput.executorId !== OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_VERSION) {
    fail("ASSAULT_HOLD_V2_ACTION_INVALID");
  }
  const candidate = enumerateOfficialAssaultHoldActionsV2(stateInput, {
    sideKey: actionInput.sideKey,
  }).find((entry) => entry.pieceId === actionInput.pieceId);
  if (!candidate) fail("ASSAULT_HOLD_V2_ACTION_STALE");
  const expectedAction = actionFromCandidate(candidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) fail("ASSAULT_HOLD_V2_ACTION_MISMATCH");
  const historicalAction = {
    ...clone(expectedAction),
    executorId: OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID,
    executorVersion: OFFICIAL_ASSAULT_HOLD_EXECUTOR_VERSION,
  };
  const applied = applyOfficialAssaultHoldV1(stateInput, historicalAction, options);
  const piece = applied.state.pieces.find((entry) => entry.id === expectedAction.pieceId);
  const restrictionEvent = consumeRestriction(piece, applied.state, expectedAction);
  const events = restrictionEvent
    ? [...applied.events, restrictionEvent]
    : [...applied.events];
  const lastLog = applied.state.log?.at(-1);
  if (lastLog) {
    lastLog.action = clone(expectedAction);
    lastLog.events = clone(events);
  }
  return {
    ...applied,
    schemaVersion: "starcraft_tmg_official_assault_hold_transition_v2",
    executorId: OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_VERSION,
    events,
    action: expectedAction,
    rulesTruth: "assault_hold_with_post_disengage_restriction_lifecycle",
    trainingTruth: false,
  };
}
