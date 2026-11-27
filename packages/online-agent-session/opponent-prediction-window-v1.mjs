// Window evaluation is Host-owned. Model prose never decides expiry or a hit.
export const OPPONENT_PREDICTION_CALIBRATION_POLICY = 'declared_window_v2';

export function isCurrentOpponentPredictionCalibrationV1(value) {
  return value?.calibrationPolicyVersion === OPPONENT_PREDICTION_CALIBRATION_POLICY
    || (!value?.calibrationPolicyVersion
      && (value?.prediction?.horizon?.kind || 'next_opponent_action') === 'next_opponent_action');
}

function publicAction(entry) {
  const action = entry?.action?.sourceAction || entry?.action;
  if (!action || typeof action !== 'object') return null;
  return { logId: entry.id || null, round: Number(entry.round) || null,
    phase: entry.phase || null, sideKey: action.sideKey || null,
    actionClass: action.actionType || action.resolutionStage || null,
    actorUnitId: action.pieceId || action.actorUnitId || null,
    targetUnitId: action.targetId || action.targetUnitId || null };
}

function classification(prediction, actual) {
  const checks = [actual.actionClass === prediction.actionClass,
    !prediction.likelyActorUnitId || actual.actorUnitId === prediction.likelyActorUnitId,
    !prediction.likelyTargetUnitId || actual.targetUnitId === prediction.likelyTargetUnitId];
  if (checks.every(Boolean)) return 'hit';
  // Unspecified actor/target are wildcards, not affirmative partial evidence.
  return checks[0]
    || (prediction.likelyActorUnitId && checks[1])
    || (prediction.likelyTargetUnitId && checks[2]) ? 'partial' : 'miss';
}

export function evaluateOpponentPredictionWindowV1({ prediction, intent, authority, publicLog, seatKey }) {
  const horizon = prediction.horizon || {kind:'next_opponent_action',count:1};
  const entries = publicLog.slice(Number(intent.authority?.publicLogCursor || 0));
  const bounded = horizon.kind === 'bounded_public_transitions'
    ? entries.slice(0, Number(horizon.count || 1)) : entries;
  const actions = bounded.map(publicAction).filter(a => a?.sideKey && a.sideKey !== seatKey
    && (horizon.kind !== 'current_round' && horizon.kind !== 'current_phase'
      || a.round === intent.authority.round)
    && (horizon.kind !== 'current_phase' || a.phase === intent.authority.phase));
  if (horizon.kind === 'next_opponent_action') {
    if (!actions.length) return null;
    return {classification:classification(prediction,actions[0]),actual:actions[0],
      observationWindow:{kind:horizon.kind,closed:true,observedOpponentActions:1}};
  }
  const hit = actions.find(a=>classification(prediction,a)==='hit');
  const closed = horizon.kind === 'current_phase'
    ? intent.authority.round !== authority.round || intent.authority.phase !== authority.phase
    : horizon.kind === 'current_round' ? intent.authority.round !== authority.round
      : entries.length >= Number(horizon.count || 1);
  if (!hit && !closed) return null;
  const actual = hit || actions.find(a=>classification(prediction,a)==='partial') || actions[0] || null;
  return {classification:actual?classification(prediction,actual):'expired',actual,
    observationWindow:{kind:horizon.kind,closed,observedOpponentActions:actions.length}};
}
