export const OFFICIAL_PHASE_ACTIVATION_AVAILABILITY_VERSION = "1.0.0";

const ACTIVATION_PHASES = new Set(["movement", "assault", "combat"]);

function livePiece(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}

function phaseActivated(piece, phase) {
  return piece?.activatedPhases?.[phase] === true;
}

export function hasOfficialPhaseActivationAvailableV1(
  state, sideKey, phase = state?.phase,
) {
  if (!ACTIVATION_PHASES.has(phase)
    || state?.players?.[sideKey]?.passedPhases?.[phase] === true) return false;
  return (state?.pieces || []).some((piece) => {
    if (piece?.sideKey !== sideKey || !livePiece(piece)
      || phaseActivated(piece, phase)) return false;
    if (piece.isOnField === true) return true;
    return phase === "movement" && piece.isInReserves === true;
  });
}

export function alternateOfficialPhaseActivationV1(state, actingSideKey, phase) {
  const opponentSideKey = actingSideKey === "player1" ? "player2" : "player1";
  if (hasOfficialPhaseActivationAvailableV1(state, opponentSideKey, phase)) {
    state.activeSideKey = opponentSideKey;
    return opponentSideKey;
  }
  if (hasOfficialPhaseActivationAvailableV1(state, actingSideKey, phase)) {
    state.activeSideKey = actingSideKey;
    return actingSideKey;
  }
  return null;
}
