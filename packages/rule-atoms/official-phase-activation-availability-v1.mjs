import { isOfficialSourceBoundStructureV1 } from './official-structure-rules-v1.mjs';

export const OFFICIAL_PHASE_ACTIVATION_AVAILABILITY_VERSION = "1.0.0";

export const OFFICIAL_EXPLICIT_PHASE_PASS_HANDOFF_V1 = 'offer_turn_until_passed_v1';

const ACTIVATION_PHASES = new Set(["movement", "assault", "combat"]);

function livePiece(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}

export function isOfficialMorphActivationLockedV1(state, piece) {
  return Number(piece?.officialMorphActivationLock?.round) === Number(state?.round);
}

function phaseActivated(piece, phase) {
  return piece?.activatedPhases?.[phase] === true;
}

function phaseAllowsActivation(state, sideKey, phase) {
  return ACTIVATION_PHASES.has(phase) && state?.players?.[sideKey]?.passedPhases?.[phase] !== true;
}

function pieceCanActivate(state, piece, sideKey, phase) {
  if (piece?.sideKey !== sideKey || !livePiece(piece)
    || phaseActivated(piece, phase) || isOfficialMorphActivationLockedV1(state, piece)
    || isOfficialSourceBoundStructureV1(state, piece)) return false;
  return piece.isOnField === true || (phase === "movement" && piece.isInReserves === true);
}

export function hasOfficialPhaseActivationAvailableV1(
  state, sideKey, phase = state?.phase,
) {
  return phaseAllowsActivation(state, sideKey, phase)
    && (state?.pieces || []).some(piece => pieceCanActivate(state, piece, sideKey, phase));
}

export function listOfficialPhaseActivationUnitIdsV1(state, sideKey, phase = state?.phase) {
  return phaseAllowsActivation(state, sideKey, phase)
    ? (state.pieces || []).filter(piece => pieceCanActivate(state, piece, sideKey, phase)).map(piece => piece.id).sort()
    : [];
}

export function alternateOfficialPhaseActivationV1(
  state, actingSideKey, phase, legacyHasActivation = hasOfficialPhaseActivationAvailableV1,
) {
  // §8.2.1: eligibility determines whether the next side must Pass. Only its
  // recorded Pass removes that side from this phase's activation order.
  const canReceiveTurn = state.officialPhasePassHandoff === OFFICIAL_EXPLICIT_PHASE_PASS_HANDOFF_V1
    ? phaseAllowsActivation : legacyHasActivation;
  const opponentSideKey = actingSideKey === "player1" ? "player2" : "player1";
  for (const sideKey of [opponentSideKey, actingSideKey]) {
    if (canReceiveTurn(state, sideKey, phase)) {
      state.activeSideKey = sideKey;
      return sideKey;
    }
  }
  return null;
}
