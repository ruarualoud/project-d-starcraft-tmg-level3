export const OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID = "authority.assault-hold-v1";
export const OFFICIAL_ASSAULT_HOLD_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_ASSAULT_HOLD_TRANSITION_SCHEMA = "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_ASSAULT_HOLD_ATOM_IDS = Object.freeze([
  "rule-atom:assault-hold-activation-marker",
  "rule-atom:assault-hold-no-action",
  "rule-atom:assault-phase-hold-action",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function activeOnTablePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function assaultActivated(piece) {
  return piece?.activatedPhases?.assault === true;
}

function sidePassed(state, sideKey) {
  return state?.players?.[sideKey]?.passedPhases?.assault === true;
}

function enrichedAction(action) {
  return {
    actionType: "hold",
    sideKey: action.sideKey,
    phase: "assault",
    pieceId: action.pieceId,
    ruleAtomIds: [...OFFICIAL_ASSAULT_HOLD_ATOM_IDS].sort(),
    executorId: OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID,
    executorVersion: OFFICIAL_ASSAULT_HOLD_EXECUTOR_VERSION,
  };
}

function rejectionCode(state, sideKey, piece) {
  if (state.phase !== "assault") return "ASSAULT_HOLD_WRONG_PHASE";
  if (sideKey !== state.activeSideKey) return "ASSAULT_HOLD_NOT_ACTIVE_SIDE";
  if (sidePassed(state, sideKey)) return "ASSAULT_HOLD_SIDE_PASSED";
  if (!activeOnTablePiece(piece)) return "ASSAULT_HOLD_UNIT_NOT_ON_BATTLEFIELD";
  if (assaultActivated(piece)) return "ASSAULT_HOLD_ALREADY_ACTIVATED";
  return null;
}

function defaultSideHasAvailableActivation(state, sideKey) {
  if (sidePassed(state, sideKey)) return false;
  return (state.pieces || []).some((piece) => (
    piece.sideKey === sideKey && activeOnTablePiece(piece) && !assaultActivated(piece)
  ));
}

export function enumerateOfficialAssaultHoldActionsV1(state, options = {}) {
  if (!object(state) || !Array.isArray(state.pieces)) fail("ASSAULT_HOLD_STATE_INVALID");
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!sideKey) fail("ASSAULT_HOLD_SIDE_REQUIRED");
  const includeDisabled = options.includeDisabled === true;
  return state.pieces
    .filter((piece) => piece.sideKey === sideKey && activeOnTablePiece(piece))
    .map((piece) => {
      const disabledReason = rejectionCode(state, sideKey, piece);
      return {
        ...enrichedAction({ sideKey, pieceId: piece.id }),
        isEnabled: disabledReason === null,
        disabledReason: disabledReason || "",
        score: 1,
        details: {
          sourceRule: "official_core_8_7_2_and_quick_reference_12_4",
          rulesTruth: "assault_hold_only",
          trainingTruth: false,
        },
      };
    })
    .filter((row) => includeDisabled || row.isEnabled)
    .sort((left, right) => left.pieceId.localeCompare(right.pieceId));
}

export function applyOfficialAssaultHoldV1(stateInput, actionInput, options = {}) {
  if (!object(stateInput) || !Array.isArray(stateInput.pieces)) {
    fail("ASSAULT_HOLD_STATE_INVALID");
  }
  if (!object(actionInput) || actionInput.actionType !== "hold") {
    fail("ASSAULT_HOLD_ACTION_INVALID");
  }
  const state = clone(stateInput);
  const action = enrichedAction({
    sideKey: String(actionInput.sideKey || "").trim(),
    pieceId: String(actionInput.pieceId || "").trim(),
  });
  if (!action.sideKey || !action.pieceId || actionInput.phase !== "assault") {
    fail("ASSAULT_HOLD_ACTION_INVALID");
  }
  const piece = state.pieces.find((row) => (
    row.id === action.pieceId && row.sideKey === action.sideKey
  ));
  if (!piece) fail("ASSAULT_HOLD_UNIT_NOT_FOUND", action.pieceId);
  const rejected = rejectionCode(state, action.sideKey, piece);
  if (rejected) fail(rejected, action.pieceId);

  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    assault: true,
  };
  const sideHasAvailableActivation = typeof options.sideHasAvailableActivation === "function"
    ? options.sideHasAvailableActivation
    : (sideKey) => defaultSideHasAvailableActivation(state, sideKey);
  const otherSideKey = action.sideKey === "player1" ? "player2" : "player1";
  if (sideHasAvailableActivation(otherSideKey, state, "assault")) {
    state.activeSideKey = otherSideKey;
  } else if (sideHasAvailableActivation(action.sideKey, state, "assault")) {
    state.activeSideKey = action.sideKey;
  }

  const events = [{ type: "hold", pieceId: piece.id, phase: "assault" }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "assault",
    action: clone(action),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_assault_hold_transition_v1",
    executorId: OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID,
    executorVersion: OFFICIAL_ASSAULT_HOLD_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action,
    rulesTruth: "assault_hold_only",
    trainingTruth: false,
  };
}
