export const OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID = "authority.movement-hold-v1";
export const OFFICIAL_MOVEMENT_HOLD_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_MOVEMENT_HOLD_TRANSITION_SCHEMA = "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MOVEMENT_HOLD_ATOM_IDS = Object.freeze([
  "rule-atom:movement-hold-activation-state",
  "rule-atom:movement-hold-no-action",
  "rule-atom:movement-phase-hold-action",
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

function movementActivated(piece) {
  return piece?.activatedPhases?.movement === true;
}

function sidePassed(state, sideKey) {
  return state?.players?.[sideKey]?.passedPhases?.movement === true;
}

function enrichedAction(action) {
  return {
    actionType: "hold",
    sideKey: action.sideKey,
    pieceId: action.pieceId,
    ruleAtomIds: [...OFFICIAL_MOVEMENT_HOLD_ATOM_IDS].sort(),
    executorId: OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID,
    executorVersion: OFFICIAL_MOVEMENT_HOLD_EXECUTOR_VERSION,
  };
}

function rejectionCode(state, sideKey, piece) {
  if (state.phase !== "movement") return "HOLD_WRONG_PHASE";
  if (sideKey !== state.activeSideKey) return "HOLD_NOT_ACTIVE_SIDE";
  if (sidePassed(state, sideKey)) return "HOLD_SIDE_PASSED";
  if (!activeOnTablePiece(piece)) return "HOLD_UNIT_NOT_ON_BATTLEFIELD";
  if (movementActivated(piece)) return "HOLD_ALREADY_ACTIVATED";
  return null;
}

function defaultSideHasAvailableActivation(state, sideKey) {
  if (sidePassed(state, sideKey)) return false;
  return (state.pieces || []).some((piece) => (
    piece.sideKey === sideKey && activeOnTablePiece(piece) && !movementActivated(piece)
  ));
}

export function enumerateOfficialMovementHoldActionsV1(state, options = {}) {
  if (!object(state) || !Array.isArray(state.pieces)) fail("HOLD_STATE_INVALID");
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!sideKey) fail("HOLD_SIDE_REQUIRED");
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
          sourceRule: "official_core_8_5_1_and_quick_reference_12_3",
          rulesTruth: "movement_hold_only",
          trainingTruth: false,
        },
      };
    })
    .filter((row) => includeDisabled || row.isEnabled)
    .sort((left, right) => left.pieceId.localeCompare(right.pieceId));
}

export function applyOfficialMovementHoldV1(stateInput, actionInput, options = {}) {
  if (!object(stateInput) || !Array.isArray(stateInput.pieces)) fail("HOLD_STATE_INVALID");
  if (!object(actionInput) || actionInput.actionType !== "hold") fail("HOLD_ACTION_INVALID");
  const state = clone(stateInput);
  const action = enrichedAction({
    sideKey: String(actionInput.sideKey || "").trim(),
    pieceId: String(actionInput.pieceId || "").trim(),
  });
  if (!action.sideKey || !action.pieceId) fail("HOLD_ACTION_INVALID");
  const piece = state.pieces.find((row) => row.id === action.pieceId && row.sideKey === action.sideKey);
  if (!piece) fail("HOLD_UNIT_NOT_FOUND", action.pieceId);
  const rejected = rejectionCode(state, action.sideKey, piece);
  if (rejected) fail(rejected, action.pieceId);

  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    movement: true,
  };
  const sideHasAvailableActivation = typeof options.sideHasAvailableActivation === "function"
    ? options.sideHasAvailableActivation
    : (sideKey) => defaultSideHasAvailableActivation(state, sideKey);
  const otherSideKey = action.sideKey === "player1" ? "player2" : "player1";
  if (sideHasAvailableActivation(otherSideKey, state)) state.activeSideKey = otherSideKey;
  else if (sideHasAvailableActivation(action.sideKey, state)) state.activeSideKey = action.sideKey;

  const events = [{ type: "hold", pieceId: piece.id, phase: "movement" }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "movement",
    action: clone(action),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_movement_hold_transition_v1",
    executorId: OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID,
    executorVersion: OFFICIAL_MOVEMENT_HOLD_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action,
    rulesTruth: "movement_hold_only",
    trainingTruth: false,
  };
}
